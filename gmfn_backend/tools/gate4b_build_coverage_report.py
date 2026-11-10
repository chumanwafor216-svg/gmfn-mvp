from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


FULLY_VERIFIED = {"verified_success"}
PARTIALLY_VERIFIED = {
    "authorization_boundary_only",
    "conditional_business_path",
    "partial_not_found_after_sql",
}
INTENTIONALLY_BLOCKED = {
    "disabled_or_not_found_before_sql",
    "intentionally_inaccessible_non_dev",
}
SENSITIVE_PREFIXES = (
    "/admin/",
    "/advertising-revenue/",
    "/analytics/",
    "/bank/",
    "/exposure/",
    "/guarantor",
    "/identity-risk/",
    "/loans/",
    "/member-credits/",
    "/merchant/",
    "/payment-instructions/",
    "/pool/",
    "/protected-trades",
    "/revenue-allocation/",
    "/trust",
    "/vault/",
    "/withdrawal-",
)


def _coverage_state(classification: str) -> str:
    if classification in FULLY_VERIFIED:
        return "verified"
    if classification in PARTIALLY_VERIFIED:
        return "partial"
    if classification in INTENTIONALLY_BLOCKED:
        return "disabled"
    return "unverified"


def _is_sensitive(route_id: str) -> bool:
    path = route_id.split(" ", 1)[1]
    return path.startswith(SENSITIVE_PREFIXES)


def build_report(route_report: dict[str, Any]) -> dict[str, Any]:
    rows: list[dict[str, Any]] = []
    for source in route_report["routes"]:
        classification = str(source["classification"])
        state = _coverage_state(classification)
        rows.append(
            {
                "route_id": source["route_id"],
                "coverage_state": state,
                "classification": classification,
                "status_code": source.get("status_code"),
                "sensitive": _is_sensitive(source["route_id"]),
                "sql_operations": source.get("sql_operations", {}),
                "reason": source.get("reason")
                or source.get("error")
                or source.get("response_excerpt"),
            }
        )
    counts = {
        state: sum(1 for row in rows if row["coverage_state"] == state)
        for state in ("verified", "partial", "disabled", "unverified")
    }
    return {
        "runtime_role": route_report["runtime_role"],
        "feature_flags": route_report["feature_flags"],
        "route_count": len(rows),
        "coverage_counts": counts,
        "production_critical_unverified": [
            row["route_id"]
            for row in rows
            if row["sensitive"] and row["coverage_state"] == "unverified"
        ],
        "routes": rows,
    }


def _markdown(report: dict[str, Any]) -> str:
    lines = [
        "# Gate 4B Runtime Coverage Closure",
        "",
        f"- Runtime identity: `{report['runtime_role']}`",
        f"- Routes reconciled: {report['route_count']}",
        f"- Coverage: `{json.dumps(report['coverage_counts'], sort_keys=True)}`",
        f"- Production-critical unverified routes: {len(report['production_critical_unverified'])}",
        "",
        "| Route | State | Result | HTTP | SQL objects |",
        "|---|---|---|---:|---|",
    ]
    for row in report["routes"]:
        objects = ", ".join(
            f"{name}({','.join(operations)})"
            for name, operations in row["sql_operations"].items()
        )
        lines.append(
            "| `{route}` | {state} | `{classification}` | {status} | {objects} |".format(
                route=row["route_id"].replace("|", "\\|"),
                state=row["coverage_state"],
                classification=row["classification"],
                status=row["status_code"] if row["status_code"] is not None else "-",
                objects=objects.replace("|", "\\|"),
            )
        )
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--route-report", required=True)
    parser.add_argument("--json-output", required=True)
    parser.add_argument("--markdown-output", required=True)
    args = parser.parse_args()
    source = json.loads(Path(args.route_report).resolve().read_text(encoding="utf-8"))
    report = build_report(source)
    json_path = Path(args.json_output).resolve()
    markdown_path = Path(args.markdown_output).resolve()
    json_path.parent.mkdir(parents=True, exist_ok=True)
    markdown_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")
    markdown_path.write_text(_markdown(report), encoding="utf-8")
    print(
        "GATE4B_COVERAGE_REPORT "
        f"routes={report['route_count']} "
        f"counts={json.dumps(report['coverage_counts'], sort_keys=True)} "
        f"critical_unverified={len(report['production_critical_unverified'])} "
        f"json={json_path} markdown={markdown_path}"
    )


if __name__ == "__main__":
    main()
