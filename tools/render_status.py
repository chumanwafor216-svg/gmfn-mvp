#!/usr/bin/env python3
"""Read-only Render deployment status reporter for GSN/GMFN.

This tool intentionally uses only GET requests against Render's API. It does not
trigger deploys, restart services, mutate environment variables, run migrations,
or call production application endpoints.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


RENDER_API_BASE = "https://api.render.com/v1"
DEFAULT_FRONTEND_SERVICE_ID = "srv-d7h4oe9f9bms739lhh9g"
DEFAULT_FRONTEND_SERVICE_NAME = "gmfn-frontend"
DEFAULT_API_SERVICE_NAME = "gmfn-api"


class RenderStatusError(RuntimeError):
    """Raised when the read-only Render status check cannot complete."""


@dataclass
class RenderClient:
    api_key: str

    def get(self, path: str, query: dict[str, str | int] | None = None) -> Any:
        url = f"{RENDER_API_BASE}{path}"
        if query:
            url = f"{url}?{urlencode(query)}"
        request = Request(
            url,
            method="GET",
            headers={
                "Accept": "application/json",
                "Authorization": f"Bearer {self.api_key}",
                "User-Agent": "gsn-render-status-readonly/1.0",
            },
        )
        try:
            with urlopen(request, timeout=30) as response:
                payload = response.read().decode("utf-8")
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RenderStatusError(
                f"Render GET {path} failed with HTTP {exc.code}: {detail}"
            ) from exc
        except URLError as exc:
            raise RenderStatusError(f"Render GET {path} failed: {exc.reason}") from exc

        if not payload:
            return None
        try:
            return json.loads(payload)
        except json.JSONDecodeError as exc:
            raise RenderStatusError(f"Render GET {path} returned invalid JSON") from exc


def unwrap(row: Any, key: str) -> Any:
    if isinstance(row, dict) and isinstance(row.get(key), dict):
        return row[key]
    return row


def pick(obj: Any, *paths: str) -> Any:
    for path in paths:
        current = obj
        found = True
        for part in path.split("."):
            if not isinstance(current, dict) or part not in current:
                found = False
                break
            current = current[part]
        if found and current not in (None, ""):
            return current
    return None


def as_text(value: Any) -> str:
    if value is None or value == "":
        return "unknown"
    if isinstance(value, (dict, list)):
        return json.dumps(value, sort_keys=True)
    return str(value)


def find_service_by_name(client: RenderClient, name: str) -> str | None:
    services = client.get("/services", {"name": name, "limit": 20})
    if not isinstance(services, list):
        return None
    for row in services:
        service = unwrap(row, "service")
        if isinstance(service, dict) and service.get("name") == name:
            return service.get("id")
    return None


def summarize_service(client: RenderClient, label: str, service_id: str | None) -> dict[str, Any]:
    if not service_id:
        return {
            "label": label,
            "service_id": None,
            "error": "service id not configured or discoverable",
        }

    service = client.get(f"/services/{service_id}")
    service_obj = unwrap(service, "service")
    deploy_rows = client.get(f"/services/{service_id}/deploys", {"limit": 20})
    if not isinstance(deploy_rows, list):
        deploy_rows = []

    deploys = [unwrap(row, "deploy") for row in deploy_rows if isinstance(unwrap(row, "deploy"), dict)]
    latest = deploys[0] if deploys else {}
    live = next((deploy for deploy in deploys if deploy.get("status") == "live"), None)

    return {
        "label": label,
        "service_id": service_id,
        "name": pick(service_obj, "name"),
        "type": pick(service_obj, "type"),
        "branch": pick(service_obj, "branch"),
        "auto_deploy": pick(service_obj, "autoDeploy", "autoDeployTrigger", "serviceDetails.autoDeploy"),
        "url": pick(service_obj, "serviceDetails.url", "url"),
        "latest_deploy": summarize_deploy(latest),
        "live_deploy": summarize_deploy(live or {}),
        "recent_deploys": [summarize_deploy(deploy) for deploy in deploys[:5]],
    }


def summarize_deploy(deploy: dict[str, Any]) -> dict[str, Any]:
    commit = pick(deploy, "commit", "gitCommit")
    commit_id = pick(
        deploy,
        "commit.id",
        "gitCommit.id",
        "commitId",
        "commit.sha",
        "gitCommit.sha",
    )
    commit_message = pick(
        deploy,
        "commit.message",
        "gitCommit.message",
        "commitMessage",
    )
    return {
        "id": pick(deploy, "id"),
        "status": pick(deploy, "status"),
        "trigger": pick(deploy, "trigger", "deployTrigger"),
        "created_at": pick(deploy, "createdAt", "created_at"),
        "updated_at": pick(deploy, "updatedAt", "updated_at"),
        "finished_at": pick(deploy, "finishedAt", "finished_at"),
        "commit_id": commit_id,
        "commit_message": commit_message,
        "commit": commit if isinstance(commit, str) else None,
    }


def print_text(report: dict[str, Any]) -> None:
    print("Render read-only status report")
    print("No deploy, restart, migration, backfill, or production app request was triggered.")
    print("")
    for service in report["services"]:
        print(f"{service['label']}:")
        if service.get("error"):
            print(f"  status: {service['error']}")
            print("")
            continue
        print(f"  service: {as_text(service.get('name'))} ({as_text(service.get('service_id'))})")
        print(f"  type: {as_text(service.get('type'))}")
        print(f"  branch: {as_text(service.get('branch'))}")
        print(f"  auto_deploy: {as_text(service.get('auto_deploy'))}")
        print(f"  url: {as_text(service.get('url'))}")
        print_deploy("latest_deploy", service.get("latest_deploy") or {})
        print_deploy("live_deploy", service.get("live_deploy") or {})
        print("")

    print("Migration evidence:")
    print("  Render deploy status alone does not prove the production Alembic revision.")
    print("  Acceptable proof still requires Render pre-deploy logs tied to gmfn-api or a read-only production migration-version check.")
    print("")
    print("Render skipped-deploy evidence:")
    print("  This script reports service/deploy status only. It does not independently read Render service Events.")


def print_deploy(label: str, deploy: dict[str, Any]) -> None:
    print(f"  {label}:")
    print(f"    id: {as_text(deploy.get('id'))}")
    print(f"    status: {as_text(deploy.get('status'))}")
    print(f"    trigger: {as_text(deploy.get('trigger'))}")
    print(f"    commit_id: {as_text(deploy.get('commit_id'))}")
    print(f"    commit_message: {as_text(deploy.get('commit_message'))}")
    print(f"    created_at: {as_text(deploy.get('created_at'))}")
    print(f"    updated_at: {as_text(deploy.get('updated_at'))}")
    print(f"    finished_at: {as_text(deploy.get('finished_at'))}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Read-only Render deploy status reporter.")
    parser.add_argument("--frontend-service-id", default=os.getenv("RENDER_FRONTEND_SERVICE_ID") or DEFAULT_FRONTEND_SERVICE_ID)
    parser.add_argument("--api-service-id", default=os.getenv("RENDER_API_SERVICE_ID") or "")
    parser.add_argument("--discover-api-service", action="store_true", help="Look up gmfn-api by name when RENDER_API_SERVICE_ID is absent.")
    parser.add_argument("--format", choices=("text", "json"), default="text")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    api_key = os.getenv("RENDER_API_KEY", "").strip()
    if not api_key:
        print("RENDER_API_KEY is required for read-only Render status checks.", file=sys.stderr)
        return 2

    client = RenderClient(api_key=api_key)
    api_service_id = args.api_service_id.strip()
    if not api_service_id and args.discover_api_service:
        api_service_id = find_service_by_name(client, DEFAULT_API_SERVICE_NAME) or ""

    report = {
        "readonly": True,
        "services": [
            summarize_service(client, DEFAULT_FRONTEND_SERVICE_NAME, args.frontend_service_id.strip()),
            summarize_service(client, DEFAULT_API_SERVICE_NAME, api_service_id),
        ],
    }

    if args.format == "json":
        print(json.dumps(report, indent=2, sort_keys=True))
    else:
        print_text(report)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RenderStatusError as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)
