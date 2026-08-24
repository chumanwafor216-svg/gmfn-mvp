from __future__ import annotations

import ast
from dataclasses import dataclass
from pathlib import Path


ROUTES_ROOT = Path(__file__).resolve().parents[1] / "app" / "api" / "routes"
ROUTE_METHODS = {"get", "post", "put", "patch", "delete"}
AUTH_MARKERS = (
    "Depends(get_current_user)",
    "Depends(get_current_clan_membership)",
    "Depends(require_admin)",
    "Depends(_require_admin)",
)
ADMIN_GUARD_MARKERS = (
    "_require_platform_admin(",
    "_require_admin(",
    "require_admin(",
    "_admin_only(",
    "_require_clan_admin(",
    "_is_admin(",
    "_ensure_clan_admin_or_platform_admin(",
    "ensure_clan_admin(",
    "assert_admin(",
    "current_user.role",
    "user.role",
    "actor.role",
    "getattr(current_user, \"role\"",
    "getattr(user, \"role\"",
    "getattr(actor, \"role\"",
    "get_current_clan_membership",
    "membership.role",
)


@dataclass(frozen=True)
class AdminRoute:
    file: Path
    line: int
    method: str
    path: str
    function: str
    source: str


def _constant_string(node: ast.AST | None) -> str:
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    return ""


def _router_prefix(tree: ast.Module) -> str:
    for node in ast.walk(tree):
        if not isinstance(node, ast.Assign) or not isinstance(node.value, ast.Call):
            continue
        func = node.value.func
        func_name = ""
        if isinstance(func, ast.Name):
            func_name = func.id
        elif isinstance(func, ast.Attribute):
            func_name = func.attr
        if func_name != "APIRouter":
            continue
        for keyword in node.value.keywords:
            if keyword.arg == "prefix":
                return _constant_string(keyword.value)
    return ""


def _route_path(prefix: str, decorator: ast.Call) -> str:
    local_path = _constant_string(decorator.args[0]) if decorator.args else ""
    if not prefix and not local_path:
        return "/"
    if not prefix:
        return local_path or "/"
    if not local_path:
        return prefix
    return f"{prefix.rstrip('/')}/{local_path.lstrip('/')}"


def _route_decorators(node: ast.FunctionDef | ast.AsyncFunctionDef) -> list[tuple[str, ast.Call]]:
    decorators: list[tuple[str, ast.Call]] = []
    for decorator in node.decorator_list:
        if not isinstance(decorator, ast.Call) or not isinstance(decorator.func, ast.Attribute):
            continue
        if decorator.func.attr not in ROUTE_METHODS:
            continue
        decorators.append((decorator.func.attr.upper(), decorator))
    return decorators


def _is_admin_route(file: Path, function_name: str, full_path: str) -> bool:
    normalized = full_path if full_path.startswith("/") else f"/{full_path}"
    return (
        normalized == "/admin"
        or normalized.startswith("/admin/")
        or "/admin/" in normalized
        or function_name.startswith("admin_")
        or function_name.endswith("_admin")
        or file.stem.startswith("admin")
    )


def _discover_admin_routes() -> list[AdminRoute]:
    routes: list[AdminRoute] = []
    for file in sorted(ROUTES_ROOT.rglob("*.py")):
        if "__pycache__" in file.parts:
            continue
        source = file.read_text(encoding="utf-8-sig")
        tree = ast.parse(source, filename=str(file))
        prefix = _router_prefix(tree)
        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            for method, decorator in _route_decorators(node):
                full_path = _route_path(prefix, decorator)
                if not _is_admin_route(file, node.name, full_path):
                    continue
                segment = ast.get_source_segment(source, node) or ""
                routes.append(
                    AdminRoute(
                        file=file,
                        line=node.lineno,
                        method=method,
                        path=full_path,
                        function=node.name,
                        source=segment,
                    )
                )
    return routes


def _has_auth_dependency(route: AdminRoute) -> bool:
    return any(marker in route.source for marker in AUTH_MARKERS)


def _has_admin_guard(route: AdminRoute) -> bool:
    return any(marker in route.source for marker in ADMIN_GUARD_MARKERS)


def test_admin_routes_require_authenticated_admin_context():
    routes = _discover_admin_routes()
    failures = [route for route in routes if not (_has_auth_dependency(route) and _has_admin_guard(route))]

    assert len(routes) >= 50, f"Admin-route audit found only {len(routes)} routes; update the scanner if route shape changed."
    assert not failures, "Admin-like routes missing auth/admin guard:\n" + "\n".join(
        f"- {route.file.relative_to(ROUTES_ROOT.parents[2])}:{route.line} "
        f"{route.method} {route.path} -> {route.function} "
        f"(auth={_has_auth_dependency(route)}, admin_guard={_has_admin_guard(route)})"
        for route in failures
    )



