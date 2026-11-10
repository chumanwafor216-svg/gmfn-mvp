from __future__ import annotations

import argparse
from collections import defaultdict
import json
from pathlib import Path
from typing import Any


TABLE_PRIVILEGES = {"SELECT", "INSERT", "UPDATE", "DELETE"}
BACKGROUND_PRIVILEGES = {
    "startup.reconciliation_loop": {
        "bank_events": {"SELECT", "UPDATE"},
        "bank_credits": {"SELECT", "INSERT", "UPDATE", "DELETE"},
        "expected_payments": {"SELECT", "UPDATE"},
    },
    "startup.spotlight_retention_loop": {
        "marketplace_attention_events": {"UPDATE"},
        "marketplace_broadcasts": {"SELECT", "DELETE"},
        "marketplace_media_deletion_tasks": {"SELECT", "INSERT", "UPDATE", "DELETE"},
        "marketplace_products": {"SELECT"},
        "marketplace_shops": {"SELECT"},
        "shop_diary_entries": {"SELECT"},
        "spotlight_campaign_pacing_states": {"SELECT", "DELETE"},
        "spotlight_campaigns": {"SELECT", "UPDATE"},
        "spotlight_content_versions": {"SELECT", "UPDATE"},
        "spotlight_exposure_events": {"SELECT", "UPDATE"},
        "spotlight_presentation_leases": {"SELECT", "DELETE"},
        "users": {"SELECT"},
        "vault_private_offers": {"SELECT"},
    },
    "maintenance.audit_trust_event_evidence_family_metadata": {
        "trust_events": {"SELECT"},
    },
    "maintenance.compact_expired_spotlights": {
        "marketplace_attention_events": {"UPDATE"},
        "marketplace_broadcasts": {"SELECT", "DELETE"},
        "marketplace_media_deletion_tasks": {"SELECT", "INSERT", "UPDATE", "DELETE"},
        "marketplace_products": {"SELECT"},
        "marketplace_shops": {"SELECT"},
        "shop_diary_entries": {"SELECT"},
        "spotlight_campaign_pacing_states": {"SELECT", "DELETE"},
        "spotlight_campaigns": {"SELECT", "UPDATE"},
        "spotlight_content_versions": {"SELECT", "UPDATE"},
        "spotlight_exposure_events": {"SELECT", "UPDATE"},
        "spotlight_presentation_leases": {"SELECT", "DELETE"},
        "users": {"SELECT"},
        "vault_private_offers": {"SELECT"},
    },
    "maintenance.recover_member_credit_awards": {
        "financial_notification_outbox": {"INSERT"},
        "member_credit_award_obligations": {"SELECT", "INSERT", "UPDATE"},
        "member_credit_payment_allocations": {"SELECT"},
        "member_credit_provider_payments": {"SELECT"},
        "member_credit_purchase_orders": {"SELECT", "UPDATE"},
        "member_service_credit_accounts": {"SELECT", "INSERT", "UPDATE"},
        "member_service_credit_ledger_entries": {"SELECT", "INSERT"},
    },
    "maintenance.scan_community_confirmation_review_sla": {
        "community_confirmation_policies": {"SELECT"},
        "community_confirmation_review_cases": {"SELECT"},
        "notifications": {"INSERT"},
        "trust_events": {"SELECT", "INSERT"},
    },
}
INTERNAL_SERVICE_PRIVILEGES = {
    "internal_service.advertising_revenue": {
        "advertising_campaign_settlements": {"SELECT", "INSERT", "UPDATE"},
        "advertising_community_earnings": {"SELECT", "INSERT", "UPDATE"},
        "advertising_community_payouts": {"SELECT", "INSERT", "UPDATE"},
        "community_advertising_payout_mandates": {"SELECT", "INSERT", "UPDATE"},
    },
    "internal_service.member_credit_spotlight": {
        "member_credit_service_spend_orders": {"SELECT", "INSERT", "UPDATE"},
    },
    "runtime_route.market_wisdom_lazy_seed_returning": {
        "market_wisdom_generation_runs": {"SELECT", "INSERT"},
    },
    "runtime_route.marketplace_request_status": {
        "marketplace_requests": {"SELECT", "UPDATE"},
    },
    "runtime_route.loan_repayment": {
        "repayments": {"SELECT", "INSERT"},
    },
}
TAXONOMY_MIGRATION_PRIVILEGES = {
    "commerce_taxonomy_releases": {"SELECT", "INSERT"},
    "commerce_taxonomy_concepts": {"SELECT", "INSERT", "UPDATE", "DELETE"},
    "commerce_taxonomy_concept_versions": {"SELECT", "INSERT", "UPDATE", "DELETE"},
    "commerce_taxonomy_terms": {"SELECT", "INSERT", "UPDATE", "DELETE"},
    "commerce_taxonomy_redirects": {"SELECT", "INSERT", "UPDATE", "DELETE"},
    "commerce_taxonomy_proposals": {"SELECT", "INSERT", "UPDATE", "DELETE"},
    "marketplace_shop_capabilities": {"SELECT", "INSERT", "UPDATE", "DELETE"},
    "marketplace_shop_capability_availability": {"SELECT", "INSERT", "UPDATE", "DELETE"},
    "marketplace_shop_capability_coverage": {"SELECT", "INSERT", "UPDATE", "DELETE"},
    "marketplace_product_capabilities": {"SELECT", "INSERT", "UPDATE", "DELETE"},
}


def _load(path: str) -> dict[str, Any]:
    return json.loads(Path(path).resolve().read_text(encoding="utf-8"))


def build_contract(inventory: dict[str, Any], trace: dict[str, Any]) -> dict[str, Any]:
    metadata_tables = {str(row["table"]) for row in inventory["tables"]}
    route_index = {str(row["route_id"]): row for row in inventory["routes"]}
    called_routes = set(map(str, trace.get("called_routes", [])))
    sql_traced_routes = set(map(str, trace.get("traced_routes", [])))

    table_operations: dict[str, set[str]] = defaultdict(set)
    table_routes: dict[str, set[str]] = defaultdict(set)
    table_background_operations: dict[str, set[str]] = defaultdict(set)
    table_internal_services: dict[str, set[str]] = defaultdict(set)
    table_migration_contracts: dict[str, set[str]] = defaultdict(set)
    function_operations: dict[str, set[str]] = defaultdict(set)
    unknown_objects: dict[str, set[str]] = defaultdict(set)
    for route_id, objects in trace.get("route_operations", {}).items():
        for object_name, operations in objects.items():
            normalized = {str(operation).upper() for operation in operations}
            table_values = normalized.intersection(TABLE_PRIVILEGES)
            if object_name in metadata_tables and table_values:
                table_operations[object_name].update(table_values)
                table_routes[object_name].add(str(route_id))
            elif "EXECUTE" in normalized and "." in object_name:
                function_operations[object_name].add("EXECUTE")
            elif normalized:
                unknown_objects[object_name].update(normalized)

    for operation_id, objects in BACKGROUND_PRIVILEGES.items():
        for object_name, privileges in objects.items():
            if object_name not in metadata_tables:
                raise RuntimeError(
                    f"Background privilege references unknown table: {object_name}"
                )
            table_operations[object_name].update(privileges)
            table_background_operations[object_name].add(operation_id)

    for operation_id, objects in INTERNAL_SERVICE_PRIVILEGES.items():
        for object_name, privileges in objects.items():
            if object_name not in metadata_tables:
                raise RuntimeError(
                    f"Internal-service privilege references unknown table: {object_name}"
                )
            table_operations[object_name].update(privileges)
            table_internal_services[object_name].add(operation_id)

    for object_name, privileges in TAXONOMY_MIGRATION_PRIVILEGES.items():
        if object_name not in metadata_tables:
            raise RuntimeError(
                f"Taxonomy migration privilege references unknown table: {object_name}"
            )
        table_operations[object_name].update(privileges)
        table_migration_contracts[object_name].add("20261102_taxonomy_authority")

    domain_rows: list[dict[str, Any]] = []
    domains = sorted(
        {
            str(row["domain"])
            for row in inventory["routes"]
            if row["database_dependent"]
        }
    )
    for domain in domains:
        domain_routes = {
            str(row["route_id"])
            for row in inventory["routes"]
            if row["database_dependent"] and row["domain"] == domain
        }
        called = domain_routes.intersection(called_routes)
        sql_traced = domain_routes.intersection(sql_traced_routes)
        domain_rows.append(
            {
                "domain": domain,
                "database_routes": len(domain_routes),
                "called_routes": len(called),
                "sql_traced_routes": len(sql_traced),
                "uncalled_routes": sorted(domain_routes.difference(called_routes)),
                "called_without_sql": sorted(called.difference(sql_traced)),
            }
        )

    runtime_tables = {
        table_name: {
            "privileges": sorted(privileges),
            "sequence_usage_required": "INSERT" in privileges,
            "observed_routes": sorted(table_routes[table_name]),
            "background_operations": sorted(table_background_operations[table_name]),
            "internal_services": sorted(table_internal_services[table_name]),
            "migration_contracts": sorted(table_migration_contracts[table_name]),
            "column_update_privileges": (
                [
                    "languages_json",
                    "backup_steward_name",
                    "safety_reviewer_name",
                    "updated_at",
                ]
                if table_name == "commerce_taxonomy_releases"
                else []
            ),
        }
        for table_name, privileges in sorted(table_operations.items())
    }
    database_routes = {
        str(row["route_id"])
        for row in inventory["routes"]
        if row["database_dependent"]
    }
    return {
        "contract_version": "gate4a-observed-v1",
        "evidence_boundary": {
            "meaning": (
                "Route privileges are derived from SQL emitted during the isolated "
                "regression suite. Background and internal-service privileges are "
                "explicit, source-bounded contracts exercised by dedicated regressions. "
                "Taxonomy privileges are owned by the authority migration. Uncalled "
                "routes remain explicitly unverified."
            ),
            "test_exit_status": trace.get("exit_status"),
            "total_routes": len(inventory["routes"]),
            "database_routes": len(database_routes),
            "called_database_routes": len(database_routes.intersection(called_routes)),
            "sql_traced_database_routes": len(database_routes.intersection(sql_traced_routes)),
            "uncalled_database_routes": sorted(database_routes.difference(called_routes)),
        },
        "runtime": {
            "schema_privileges": {"public": ["USAGE"]},
            "tables": runtime_tables,
            "functions": {
                function_name: sorted(privileges)
                for function_name, privileges in sorted(function_operations.items())
            },
            "prohibited": [
                "CREATE ON SCHEMA public",
                "CREATEROLE",
                "BYPASSRLS",
                "taxonomy authority function execution",
                "taxonomy object ownership",
                "migration role membership",
            ],
        },
        "migration_only_or_unverified_tables": sorted(metadata_tables.difference(runtime_tables)),
        "unknown_sql_objects": {
            name: sorted(operations)
            for name, operations in sorted(unknown_objects.items())
        },
        "domain_coverage": domain_rows,
        "background_operations": inventory["background_operations"],
        "route_index": {
            route_id: route_index[route_id]
            for route_id in sorted(database_routes)
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--inventory", required=True)
    parser.add_argument("--trace", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    contract = build_contract(_load(args.inventory), _load(args.trace))
    output_path = Path(args.output).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(contract, indent=2, sort_keys=True), encoding="utf-8")
    boundary = contract["evidence_boundary"]
    print(
        "GATE4_PRIVILEGE_CONTRACT "
        f"database_routes={boundary['database_routes']} "
        f"called={boundary['called_database_routes']} "
        f"sql_traced={boundary['sql_traced_database_routes']} "
        f"tables={len(contract['runtime']['tables'])} "
        f"output={output_path}"
    )


if __name__ == "__main__":
    main()
