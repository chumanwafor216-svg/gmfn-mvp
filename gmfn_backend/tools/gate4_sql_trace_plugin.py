from __future__ import annotations

from collections import defaultdict
from contextvars import ContextVar
import functools
import inspect
import json
import os
from pathlib import Path
import re
from typing import Any, Callable

from fastapi.routing import APIRoute
from sqlalchemy import event


_ACTIVE_ROUTE: ContextVar[str | None] = ContextVar("gate4_active_route", default=None)
_ACTIVE_TEST: ContextVar[str | None] = ContextVar("gate4_active_test", default=None)
_LISTENER_INSTALLED = False
_WRAPPERS_INSTALLED = False
_OPERATIONS: dict[str, dict[str, set[str]]] = defaultdict(lambda: defaultdict(set))
_ROUTE_CALLS: dict[str, set[str]] = defaultdict(set)
_UNSCOPED: dict[str, dict[str, set[str]]] = defaultdict(lambda: defaultdict(set))

_IDENTIFIER = r'(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_]*))'
_INSERT_RE = re.compile(rf"^\s*INSERT\s+INTO\s+(?:{_IDENTIFIER}\.)?{_IDENTIFIER}", re.I)
_UPDATE_RE = re.compile(rf"^\s*UPDATE\s+(?:{_IDENTIFIER}\.)?{_IDENTIFIER}", re.I)
_DELETE_RE = re.compile(rf"^\s*DELETE\s+FROM\s+(?:{_IDENTIFIER}\.)?{_IDENTIFIER}", re.I)
_SELECT_TABLE_RE = re.compile(rf"\b(?:FROM|JOIN)\s+(?:{_IDENTIFIER}\.)?{_IDENTIFIER}", re.I)
_FUNCTION_RE = re.compile(
    rf"\b(?:SELECT|FROM|JOIN)\s+{_IDENTIFIER}\.{_IDENTIFIER}\s*\(",
    re.I,
)


def _last_identifier(match: re.Match[str]) -> str:
    values = [value for value in match.groups() if value]
    return values[-1] if values else ""


def _statement_operations(statement: str) -> list[tuple[str, str]]:
    compact = str(statement or "").strip()
    if not compact:
        return []
    for operation, pattern in (
        ("INSERT", _INSERT_RE),
        ("UPDATE", _UPDATE_RE),
        ("DELETE", _DELETE_RE),
    ):
        match = pattern.search(compact)
        if match:
            table = _last_identifier(match)
            return [(operation, table)] if table else []
    if compact.upper().startswith(("SELECT", "WITH")):
        operations = {
            ("SELECT", _last_identifier(match))
            for match in _SELECT_TABLE_RE.finditer(compact)
            if _last_identifier(match)
        }
        operations.update(
            {
                ("EXECUTE", _last_identifier(match))
                for match in _FUNCTION_RE.finditer(compact)
                if _last_identifier(match)
            }
        )
        return sorted(operations)
    return []


def _record_sql(
    _connection: Any,
    _cursor: Any,
    statement: str,
    _parameters: Any,
    _context: Any,
    _executemany: bool,
) -> None:
    route_id = _ACTIVE_ROUTE.get()
    test_id = _ACTIVE_TEST.get()
    for operation, object_name in _statement_operations(statement):
        if object_name in {"sqlite_master", "alembic_version"}:
            continue
        if route_id:
            _OPERATIONS[route_id][object_name].add(operation)
            if test_id:
                _ROUTE_CALLS[route_id].add(test_id)
        elif test_id:
            _UNSCOPED[test_id][object_name].add(operation)


def _route_id(route: APIRoute) -> str:
    methods = ",".join(sorted(route.methods or ()))
    return f"{methods} {route.path}"


def _wrap_call(route_id: str, call: Callable[..., Any]) -> Callable[..., Any]:
    if inspect.iscoroutinefunction(call):
        @functools.wraps(call)
        async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
            test_id = _ACTIVE_TEST.get()
            if test_id:
                _ROUTE_CALLS[route_id].add(test_id)
            token = _ACTIVE_ROUTE.set(route_id)
            try:
                return await call(*args, **kwargs)
            finally:
                _ACTIVE_ROUTE.reset(token)

        return async_wrapper

    @functools.wraps(call)
    def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
        test_id = _ACTIVE_TEST.get()
        if test_id:
            _ROUTE_CALLS[route_id].add(test_id)
        token = _ACTIVE_ROUTE.set(route_id)
        try:
            return call(*args, **kwargs)
        finally:
            _ACTIVE_ROUTE.reset(token)

    return sync_wrapper


def pytest_collection_finish(session: Any) -> None:
    global _LISTENER_INSTALLED, _WRAPPERS_INSTALLED
    from app.db.database import engine
    from app.main import app

    if not _LISTENER_INSTALLED:
        event.listen(engine, "before_cursor_execute", _record_sql)
        _LISTENER_INSTALLED = True
    if not _WRAPPERS_INSTALLED:
        for route in app.routes:
            if not isinstance(route, APIRoute):
                continue
            call = route.dependant.call
            if call is None or getattr(call, "__gate4_wrapped__", False):
                continue
            wrapped = _wrap_call(_route_id(route), call)
            setattr(wrapped, "__gate4_wrapped__", True)
            route.dependant.call = wrapped
        _WRAPPERS_INSTALLED = True


def pytest_runtest_call(item: Any) -> Any:
    token = _ACTIVE_TEST.set(item.nodeid)
    try:
        yield
    finally:
        _ACTIVE_TEST.reset(token)


pytest_runtest_call.hookwrapper = True


def _serialize_operations(
    value: dict[str, dict[str, set[str]]],
) -> dict[str, dict[str, list[str]]]:
    return {
        outer_key: {
            object_name: sorted(operations)
            for object_name, operations in sorted(objects.items())
        }
        for outer_key, objects in sorted(value.items())
    }


def pytest_sessionfinish(session: Any, exitstatus: int) -> None:
    output = str(os.getenv("GSN_GATE4_SQL_TRACE_OUTPUT", "") or "").strip()
    if not output:
        return
    from app.main import app

    all_routes = sorted(
        _route_id(route) for route in app.routes if isinstance(route, APIRoute)
    )
    traced_routes = sorted(_OPERATIONS)
    called_routes = sorted(_ROUTE_CALLS)
    payload = {
        "exit_status": int(exitstatus),
        "all_routes": all_routes,
        "called_routes": called_routes,
        "uncalled_routes": sorted(set(all_routes).difference(called_routes)),
        "traced_routes": traced_routes,
        "untraced_routes": sorted(set(all_routes).difference(traced_routes)),
        "route_operations": _serialize_operations(_OPERATIONS),
        "route_tests": {
            route_id: sorted(test_ids)
            for route_id, test_ids in sorted(_ROUTE_CALLS.items())
        },
        "unscoped_test_operations": _serialize_operations(_UNSCOPED),
    }
    output_path = Path(output).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    print(
        "GATE4_SQL_TRACE "
        f"called_routes={len(called_routes)} sql_traced_routes={len(traced_routes)} "
        f"uncalled_routes={len(payload['uncalled_routes'])} "
        f"output={output_path}"
    )
