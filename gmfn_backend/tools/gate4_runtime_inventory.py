from __future__ import annotations

import argparse
from collections import Counter
import inspect
import json
from pathlib import Path
import sys
from typing import Any

from fastapi.dependencies.models import Dependant
from fastapi.routing import APIRoute


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def _walk_dependencies(root: Dependant) -> list[Dependant]:
    found: list[Dependant] = []
    pending = list(root.dependencies)
    seen: set[int] = set()
    while pending:
        dependency = pending.pop()
        marker = id(dependency)
        if marker in seen:
            continue
        seen.add(marker)
        found.append(dependency)
        pending.extend(dependency.dependencies)
    return found


def _callable_name(value: Any) -> str:
    module = str(getattr(value, "__module__", "") or "")
    name = str(
        getattr(value, "__qualname__", "")
        or getattr(value, "__name__", "")
        or type(value).__name__
    )
    return f"{module}.{name}" if module else name


def _source_location(value: Any) -> tuple[str | None, int | None]:
    try:
        source_file = inspect.getsourcefile(value)
        _, line_number = inspect.getsourcelines(value)
    except (OSError, TypeError):
        return None, None
    if source_file is None:
        return None, line_number
    try:
        source_file = str(Path(source_file).resolve().relative_to(Path.cwd().resolve()))
    except ValueError:
        source_file = str(Path(source_file).resolve())
    return source_file.replace("\\", "/"), line_number


def _route_id(route: APIRoute) -> str:
    methods = ",".join(sorted(route.methods or ()))
    return f"{methods} {route.path}"


def _domain(module: str) -> str:
    return module.rsplit(".", 1)[-1] if module else "unknown"


def build_inventory() -> dict[str, Any]:
    from app.db.database import get_db
    from app.db.engine import Base
    from app.main import app

    route_rows: list[dict[str, Any]] = []
    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        endpoint = route.endpoint
        module = str(getattr(endpoint, "__module__", "") or "")
        dependencies = _walk_dependencies(route.dependant)
        dependency_calls = [item.call for item in dependencies if item.call is not None]
        database_dependency_names = {
            _callable_name(get_db),
            "app.deps.get_db",
        }
        direct_db = _callable_name(route.dependant.call) in database_dependency_names
        database_dependent = direct_db or any(
            _callable_name(call) in database_dependency_names
            for call in dependency_calls
        )
        source_file, source_line = _source_location(endpoint)
        route_rows.append(
            {
                "route_id": _route_id(route),
                "path": route.path,
                "methods": sorted(route.methods or ()),
                "name": route.name,
                "endpoint": _callable_name(endpoint),
                "module": module,
                "domain": _domain(module),
                "source_file": source_file,
                "source_line": source_line,
                "database_dependent": database_dependent,
                "dependencies": sorted({_callable_name(call) for call in dependency_calls}),
            }
        )

    route_rows.sort(key=lambda row: (row["path"], row["methods"], row["endpoint"]))
    database_routes = [row for row in route_rows if row["database_dependent"]]
    table_rows = []
    for table in sorted(Base.metadata.tables.values(), key=lambda item: item.fullname):
        table_rows.append(
            {
                "schema": table.schema or "public",
                "table": table.name,
                "primary_key": [column.name for column in table.primary_key.columns],
                "columns": [column.name for column in table.columns],
            }
        )

    background_operations = [
        {
            "operation_id": "startup.reconciliation_loop",
            "entrypoint": "app.main._reconciliation_loop",
            "database_callable": "app.main._reconcile_all_clans_once",
            "classification": "runtime_optional_background",
            "enabled_by": "GMFN_ENABLE_RECONCILIATION_LOOP",
        },
        {
            "operation_id": "startup.spotlight_retention_loop",
            "entrypoint": "app.main._spotlight_retention_loop",
            "database_callable": "app.main._compact_expired_spotlights_once",
            "classification": "runtime_optional_background",
            "enabled_by": "GSN_ENABLE_SPOTLIGHT_RETENTION_LOOP",
        },
        {
            "operation_id": "maintenance.audit_trust_event_evidence_family_metadata",
            "entrypoint": "app.maintenance.audit_trust_event_evidence_family_metadata",
            "classification": "administrative_maintenance",
        },
        {
            "operation_id": "maintenance.compact_expired_spotlights",
            "entrypoint": "app.maintenance.compact_expired_spotlights",
            "classification": "administrative_maintenance",
        },
        {
            "operation_id": "maintenance.recover_member_credit_awards",
            "entrypoint": "app.maintenance.recover_member_credit_awards",
            "classification": "administrative_maintenance",
        },
        {
            "operation_id": "maintenance.scan_community_confirmation_review_sla",
            "entrypoint": "app.maintenance.scan_community_confirmation_review_sla",
            "classification": "administrative_maintenance",
        },
    ]

    return {
        "summary": {
            "total_routes": len(route_rows),
            "database_routes": len(database_routes),
            "non_database_routes": len(route_rows) - len(database_routes),
            "database_route_domains": dict(
                sorted(Counter(row["domain"] for row in database_routes).items())
            ),
            "metadata_tables": len(table_rows),
            "background_and_maintenance_operations": len(background_operations),
        },
        "routes": route_rows,
        "tables": table_rows,
        "background_operations": background_operations,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    output_path = Path(args.output).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    inventory = build_inventory()
    output_path.write_text(json.dumps(inventory, indent=2, sort_keys=True), encoding="utf-8")
    print(
        "GATE4_RUNTIME_INVENTORY "
        f"routes={inventory['summary']['total_routes']} "
        f"database_routes={inventory['summary']['database_routes']} "
        f"tables={inventory['summary']['metadata_tables']} "
        f"output={output_path}"
    )


if __name__ == "__main__":
    main()
