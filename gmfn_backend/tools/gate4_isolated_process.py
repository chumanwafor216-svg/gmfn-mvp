from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool


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
    engine = create_engine(os.environ["DATABASE_URL"], poolclass=NullPool)
    try:
        with engine.connect() as connection:
            current_user, session_user, database_name = connection.execute(
                text("SELECT current_user, session_user, current_database()")
            ).one()
            if current_user != "gsn_runtime" or session_user != "gsn_runtime":
                raise RuntimeError(
                    "Gate 4 runtime identity mismatch: "
                    f"current={current_user} session={session_user}"
                )
            print(
                "GATE4_PROCESS_IDENTITY "
                f"current_user={current_user} session_user={session_user} "
                f"database={database_name}"
            )
    finally:
        engine.dispose()


def _expect(response: Any, status_code: int, label: str) -> Any:
    if response.status_code != status_code:
        raise RuntimeError(
            f"{label} expected {status_code}, got {response.status_code}: {response.text}"
        )
    if "application/json" in str(response.headers.get("content-type", "")):
        return response.json()
    return response.text


def _security_checks() -> None:
    _assert_runtime_identity()
    from fastapi.testclient import TestClient
    from app.main import app

    with TestClient(app) as client:
        login = _expect(
            client.post(
                "/auth/login",
                data={
                    "username": "gate4-member@example.test",
                    "password": "Gate4-member-pass-123",
                },
            ),
            200,
            "member login",
        )
        headers = {"Authorization": f"Bearer {login['access_token']}"}
        _expect(
            client.get("/clans/1/members", headers=headers),
            403,
            "non-member community denial",
        )
        _expect(
            client.patch(
                "/marketplace/shops/1",
                headers={**headers, "X-Clan-Id": "1"},
                json={"clan_id": 1, "description": "unauthorised overwrite"},
            ),
            403,
            "non-owner shop denial",
        )
        _expect(
            client.get("/commerce-taxonomy/admin/proposals", headers=headers),
            403,
            "platform-admin denial",
        )
    print(
        "GATE4_APPLICATION_AUTHORIZATION "
        "community_nonmember=denied shop_nonowner=denied platform_nonadmin=denied"
    )


def _background_checks() -> None:
    _assert_runtime_identity()
    from fastapi.testclient import TestClient
    from app.main import app, _compact_expired_spotlights_once, _reconcile_all_clans_once
    from app.maintenance.audit_trust_event_evidence_family_metadata import main as audit_main
    from app.maintenance.compact_expired_spotlights import main as compact_main
    from app.maintenance.recover_member_credit_awards import main as recovery_main
    from app.maintenance.scan_community_confirmation_review_sla import main as sla_main

    with TestClient(app) as client:
        _expect(client.get("/health"), 200, "startup health")
        if app.state.reconciliation_task is not None:
            raise RuntimeError("Reconciliation loop must remain disabled in Gate 4")
        if app.state.spotlight_retention_task is not None:
            raise RuntimeError("Spotlight retention loop must remain disabled in Gate 4")

    _reconcile_all_clans_once()
    _compact_expired_spotlights_once()
    if audit_main(["--limit", "10", "--sample-limit", "2"]) != 0:
        raise RuntimeError("Trust-event audit command failed")
    if compact_main(["--limit", "10"]) != 0:
        raise RuntimeError("Spotlight compaction command failed")
    if recovery_main(["--limit", "10"]) not in {0, 2}:
        raise RuntimeError("Member-credit recovery command returned an invalid status")
    if sla_main(["--actor-user-id", "1", "--limit", "10"]) != 0:
        raise RuntimeError("Confirmation SLA command failed")
    print(
        "GATE4_BACKGROUND_OPERATIONS "
        "startup_shutdown=passed reconciliation=passed retention=passed "
        "trust_audit=passed member_credit_recovery=passed confirmation_sla=passed"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("security", "background"))
    args = parser.parse_args()
    if args.mode == "security":
        _security_checks()
    else:
        _background_checks()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"GATE4_PROCESS_FAILURE {type(exc).__name__}: {exc}", file=sys.stderr)
        raise
