from __future__ import annotations

import argparse
from collections import defaultdict
from contextvars import ContextVar
import functools
import inspect
import json
import os
from pathlib import Path
import re
import sys
from typing import Any, Callable

from fastapi.routing import APIRoute
from sqlalchemy import event


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

PRIVILEGED_ENV_MARKERS = (
    "ADMIN_URL",
    "MIGRATOR_URL",
    "AUTHORITY_URL",
    "OWNER_PASSWORD",
    "POSTGRES_PASSWORD",
)
DISABLED_FLAGS = (
    "GSN_SHOP_PRIVACY_AUTHORITY_V1_ENABLED",
    "GSN_COMMERCE_TAXONOMY_OWNER_API_ENABLED",
    "GSN_COMMERCE_TAXONOMY_ADMIN_API_ENABLED",
    "GSN_COMMERCE_TAXONOMY_PUBLICATION_ENABLED",
    "GSN_TRUSTSLIP_V1_SNAPSHOT_WRITES_ENABLED",
)
EXTERNAL_ROUTES = {
    "POST /bank/webhook": "signed external bank callback",
    "POST /entry/licence/verify": "external identity-verification provider",
}
NON_PRODUCTION_ONLY_ROUTES = {
    "POST /auth/dev/create-user",
    "POST /auth/dev/reset-password",
    "POST /auth/dev/verify-phone",
    "POST /clans/dev/bootstrap",
}

_ACTIVE_ROUTE: ContextVar[str | None] = ContextVar("gate4b_active_route", default=None)
_OPERATIONS: dict[str, dict[str, set[str]]] = defaultdict(lambda: defaultdict(set))
_STATEMENTS: dict[str, set[str]] = defaultdict(set)


def _assert_runtime_identity() -> None:
    leaked = sorted(
        key
        for key in os.environ
        if any(marker in key.upper() for marker in PRIVILEGED_ENV_MARKERS)
    )
    if leaked:
        raise RuntimeError(f"Privileged environment keys reached runtime process: {leaked}")
    if str(os.getenv("GMFN_AUTO_CREATE_SCHEMA", "") or "").strip().lower() != "false":
        raise RuntimeError("GMFN_AUTO_CREATE_SCHEMA must be explicitly false")
    for key in DISABLED_FLAGS:
        if str(os.getenv(key, "") or "").strip().lower() != "false":
            raise RuntimeError(f"{key} must remain explicitly disabled")

    from sqlalchemy import create_engine, text
    from sqlalchemy.pool import NullPool

    engine = create_engine(os.environ["DATABASE_URL"], poolclass=NullPool)
    try:
        with engine.connect() as connection:
            current_user, session_user, database_name = connection.execute(
                text("SELECT current_user, session_user, current_database()")
            ).one()
            if current_user != "gsn_runtime" or session_user != "gsn_runtime":
                raise RuntimeError(
                    "Gate 4B runtime identity mismatch: "
                    f"current={current_user} session={session_user}"
                )
            print(
                "GATE4B_PROCESS_IDENTITY "
                f"current_user={current_user} session_user={session_user} "
                f"database={database_name}"
            )
    finally:
        engine.dispose()


def _route_id(route: APIRoute) -> str:
    return f"{','.join(sorted(route.methods or ()))} {route.path}"


def _wrap_call(route_id: str, call: Callable[..., Any]) -> Callable[..., Any]:
    if inspect.iscoroutinefunction(call):
        @functools.wraps(call)
        async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
            token = _ACTIVE_ROUTE.set(route_id)
            try:
                return await call(*args, **kwargs)
            finally:
                _ACTIVE_ROUTE.reset(token)

        return async_wrapper

    @functools.wraps(call)
    def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
        token = _ACTIVE_ROUTE.set(route_id)
        try:
            return call(*args, **kwargs)
        finally:
            _ACTIVE_ROUTE.reset(token)

    return sync_wrapper


def _record_sql(
    _connection: Any,
    _cursor: Any,
    statement: str,
    _parameters: Any,
    _context: Any,
    _executemany: bool,
) -> None:
    route_id = _ACTIVE_ROUTE.get()
    if not route_id:
        return
    from tools.gate4_sql_trace_plugin import _statement_operations

    compact = re.sub(r"\s+", " ", str(statement or "")).strip()
    if compact:
        _STATEMENTS[route_id].add(compact[:2000])
    for operation, object_name in _statement_operations(statement):
        if object_name not in {"alembic_version", "sqlite_master"}:
            _OPERATIONS[route_id][object_name].add(operation)


def _resolve_schema(schema: dict[str, Any], components: dict[str, Any]) -> dict[str, Any]:
    current = schema
    seen: set[str] = set()
    while "$ref" in current:
        reference = str(current["$ref"])
        if reference in seen:
            break
        seen.add(reference)
        current = components.get(reference.rsplit("/", 1)[-1], {})
    return current


def _sample_value(
    schema: dict[str, Any],
    components: dict[str, Any],
    *,
    name: str = "value",
) -> Any:
    schema = _resolve_schema(schema, components)
    if "default" in schema:
        return schema["default"]
    if schema.get("enum"):
        return schema["enum"][0]
    for union_key in ("anyOf", "oneOf"):
        options = [
            item
            for item in schema.get(union_key, [])
            if _resolve_schema(item, components).get("type") != "null"
        ]
        if options:
            return _sample_value(options[0], components, name=name)
    schema_type = schema.get("type")
    lowered = name.lower()
    pattern = str(schema.get("pattern", "") or "")
    if "approve" in pattern:
        return "approve"
    if "fulfilled" in pattern:
        return "fulfilled"
    if "amount" in lowered or "price" in lowered or "balance" in lowered:
        return "10.00"
    if schema_type == "object" or schema.get("properties"):
        properties = schema.get("properties", {})
        required = set(schema.get("required", []))
        return {
            key: _sample_value(value, components, name=key)
            for key, value in properties.items()
            if key in required or "default" in _resolve_schema(value, components)
        }
    if schema_type == "array":
        return []
    if schema_type == "integer":
        return max(1, int(schema.get("minimum", 1)))
    if schema_type == "number":
        return max(1, schema.get("minimum", 1))
    if schema_type == "boolean":
        return bool(schema.get("default", False))
    if "email" in lowered or schema.get("format") == "email":
        return "gate4b-route@example.org"
    if "password" in lowered:
        return "Gate4B-route-pass-123"
    if "currency" in lowered:
        return "NGN"
    if "country" in lowered:
        return "NG"
    if "phone" in lowered or "whatsapp" in lowered:
        return "+2348000000001"
    if "url" in lowered:
        return "https://example.test/gate4b"
    if "idempotency" in lowered:
        return "gate4b-idempotency-0001"
    if schema.get("format") == "date-time":
        return "2026-11-02T12:00:00Z"
    if schema.get("format") == "date":
        return "2026-11-02"
    if "status" in lowered:
        return "open"
    if "decision" in lowered:
        return "approve"
    if "note" in lowered or "reason" in lowered or "description" in lowered:
        return "Synthetic Gate 4B disposable verification."
    minimum_length = int(schema.get("minLength", 0) or 0)
    return "Gate4B".ljust(minimum_length, "X")


def _path_value(name: str, route_id: str) -> str:
    lowered = name.lower()
    if name == "code":
        if route_id.startswith("GET /invites") or route_id.startswith("POST /invites"):
            return "GATE3INVITE"
        return "GATE3-TRUSTSLIP-001"
    if "release_public_id" in lowered:
        return "GSN-TAX-R-GATE3"
    if "capability_public_id" in lowered:
        return "GSN-TAX-CAP-MISSING"
    if "public_id" in lowered:
        return "GATE4B-MISSING"
    if "cycle_id" in lowered:
        return "GATE4B-CYCLE"
    return "1"


def _request_parts(
    route_id: str,
    operation: dict[str, Any],
    components: dict[str, Any],
) -> tuple[str, dict[str, Any], Any | None]:
    _, template = route_id.split(" ", 1)
    path = template
    query: dict[str, Any] = {}
    for parameter in operation.get("parameters", []):
        parameter = _resolve_schema(parameter, components)
        name = str(parameter.get("name", ""))
        location = str(parameter.get("in", ""))
        if location == "path":
            path = path.replace("{" + name + "}", _path_value(name, route_id))
        elif location == "query" and parameter.get("required"):
            query[name] = _sample_value(parameter.get("schema", {}), components, name=name)

    if "clan_id" in operation.get("parameters", []):
        query.setdefault("clan_id", 1)
    body: Any | None = None
    request_body = operation.get("requestBody") or {}
    content = request_body.get("content", {})
    json_schema = (content.get("application/json") or {}).get("schema")
    if json_schema:
        body = _sample_value(json_schema, components, name="payload")
    return path, query, body


def _classification(
    route_id: str,
    status_code: int | None,
    operations: dict[str, set[str]],
    error: str | None,
) -> str:
    if route_id in EXTERNAL_ROUTES:
        return "external_dependency_not_exercised"
    if route_id in NON_PRODUCTION_ONLY_ROUTES:
        return "intentionally_inaccessible_non_dev"
    if error:
        if "permission denied" in error.lower():
            return "database_privilege_blocked"
        return "application_exception"
    if status_code is None:
        return "not_exercised"
    if 200 <= status_code < 300:
        return "verified_success"
    if status_code == 422:
        return "validation_not_reached"
    if status_code in {401, 403}:
        return "authorization_boundary_only"
    if status_code == 404:
        if not operations:
            return "disabled_or_not_found_before_sql"
        return "partial_not_found_after_sql"
    if status_code in {400, 409, 410, 423}:
        return "conditional_business_path"
    if status_code >= 500:
        return "server_error"
    return "other_response"


def _serialize_operations(value: dict[str, set[str]]) -> dict[str, list[str]]:
    return {key: sorted(items) for key, items in sorted(value.items())}


def _probe() -> None:
    _assert_runtime_identity()
    contract_path = Path(os.environ["GSN_GATE4_CONTRACT_PATH"]).resolve()
    output_path = Path(os.environ["GSN_GATE4B_ROUTE_REPORT_PATH"]).resolve()
    contract = json.loads(contract_path.read_text(encoding="utf-8"))
    target_routes = set(contract["evidence_boundary"]["uncalled_database_routes"])

    from fastapi.testclient import TestClient
    from app.db.database import engine
    from app.main import app

    route_map = {
        _route_id(route): route
        for route in app.routes
        if isinstance(route, APIRoute)
    }
    missing = sorted(target_routes.difference(route_map))
    if missing:
        raise RuntimeError(f"Gate 4B routes disappeared from the app: {missing}")

    for route_id in sorted(target_routes):
        route = route_map[route_id]
        call = route.dependant.call
        if call is not None and not getattr(call, "__gate4b_wrapped__", False):
            wrapped = _wrap_call(route_id, call)
            setattr(wrapped, "__gate4b_wrapped__", True)
            route.dependant.call = wrapped
    event.listen(engine, "before_cursor_execute", _record_sql)

    openapi = app.openapi()
    components = openapi.get("components", {}).get("schemas", {})
    results: list[dict[str, Any]] = []
    with TestClient(app, raise_server_exceptions=True) as client:
        login = client.post(
            "/auth/login",
            data={"username": "gate3-owner@example.test", "password": "Gate3-pass-123"},
        )
        if login.status_code != 200:
            raise RuntimeError(f"Gate 4B login failed: {login.status_code} {login.text}")
        auth_headers = {
            "Authorization": f"Bearer {login.json()['access_token']}",
            "X-Clan-Id": "1",
        }

        method_order = {"GET": 0, "PATCH": 1, "PUT": 2, "POST": 3, "DELETE": 4}
        ordered = sorted(
            target_routes,
            key=lambda value: (method_order.get(value.split(" ", 1)[0], 9), value),
        )
        for route_id in ordered:
            method, template = route_id.split(" ", 1)
            if route_id in EXTERNAL_ROUTES:
                results.append(
                    {
                        "route_id": route_id,
                        "classification": "external_dependency_not_exercised",
                        "reason": EXTERNAL_ROUTES[route_id],
                        "status_code": None,
                        "sql_operations": {},
                        "sql_statements": [],
                    }
                )
                continue
            operation = openapi.get("paths", {}).get(template, {}).get(method.lower(), {})
            path, query, body = _request_parts(route_id, operation, components)
            headers = dict(auth_headers)
            if route_id.startswith("POST /auth/") or route_id.startswith("GET /entry/"):
                headers = {}
            error: str | None = None
            status_code: int | None = None
            response_excerpt: str | None = None
            try:
                request_kwargs: dict[str, Any] = {"headers": headers, "params": query}
                if route_id == "POST /support-cases/{case_id}/attachments":
                    request_kwargs["files"] = {
                        "file": ("gate4b.txt", b"synthetic Gate 4B evidence", "text/plain")
                    }
                elif body is not None:
                    request_kwargs["json"] = body
                response = client.request(method, path, **request_kwargs)
                status_code = int(response.status_code)
                response_excerpt = response.text[:500]
            except Exception as exc:
                error = f"{type(exc).__name__}: {exc}"
            operations = _OPERATIONS.get(route_id, {})
            results.append(
                {
                    "route_id": route_id,
                    "method": method,
                    "path_template": template,
                    "request_path": path,
                    "status_code": status_code,
                    "classification": _classification(
                        route_id, status_code, operations, error
                    ),
                    "error": error,
                    "response_excerpt": response_excerpt,
                    "sql_operations": _serialize_operations(operations),
                    "sql_statements": sorted(_STATEMENTS.get(route_id, set())),
                }
            )

    event.remove(engine, "before_cursor_execute", _record_sql)
    summary: dict[str, int] = defaultdict(int)
    for row in results:
        summary[str(row["classification"])] += 1
    payload = {
        "runtime_role": "gsn_runtime",
        "feature_flags": {key: os.getenv(key) for key in DISABLED_FLAGS},
        "target_route_count": len(target_routes),
        "summary": dict(sorted(summary.items())),
        "routes": sorted(results, key=lambda row: row["route_id"]),
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    print(
        "GATE4B_ROUTE_PROBE "
        f"routes={len(results)} summary={json.dumps(payload['summary'], sort_keys=True)} "
        f"output={output_path}"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("probe",))
    args = parser.parse_args()
    if args.mode == "probe":
        _probe()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"GATE4B_PROCESS_FAILURE {type(exc).__name__}: {exc}", file=sys.stderr)
        raise
