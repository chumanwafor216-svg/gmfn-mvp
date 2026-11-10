from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool


PRIVILEGED_ENV_MARKERS = (
    "ADMIN_URL",
    "MIGRATOR_URL",
    "AUTHORITY_URL",
    "OWNER_PASSWORD",
    "POSTGRES_PASSWORD",
)


def _assert_isolated_environment(expected_role: str) -> None:
    leaked = sorted(
        key
        for key in os.environ
        if any(marker in key.upper() for marker in PRIVILEGED_ENV_MARKERS)
    )
    if leaked:
        raise RuntimeError(f"Privileged environment keys reached isolated process: {leaked}")
    database_url = str(os.getenv("DATABASE_URL", "") or "").strip()
    if not database_url:
        raise RuntimeError("DATABASE_URL is required")
    engine = create_engine(database_url, poolclass=NullPool)
    try:
        with engine.connect() as connection:
            row = connection.execute(
                text("SELECT current_user, session_user, current_database()")
            ).one()
            if row.current_user != expected_role or row.session_user != expected_role:
                raise RuntimeError(
                    f"Expected {expected_role}, got current={row.current_user} session={row.session_user}"
                )
            print(
                "PROCESS_IDENTITY "
                f"mode={os.getenv('GSN_GATE3_PROCESS_MODE')} "
                f"current_user={row.current_user} session_user={row.session_user} "
                f"database={row.current_database}"
            )
    finally:
        engine.dispose()


def _migrate() -> None:
    _assert_isolated_environment("gsn_migrator")
    from alembic import command
    from alembic.config import Config

    backend_root = Path(__file__).resolve().parents[1]
    config = Config(str(backend_root / "alembic.ini"))
    config.set_main_option("script_location", str(backend_root / "alembic"))
    config.set_main_option("sqlalchemy.url", os.environ["DATABASE_URL"])
    command.upgrade(config, "head")
    print("MIGRATION_COMPLETE head=20261102_taxonomy_authority")


def _authority(release_public_id: str) -> None:
    _assert_isolated_environment("gsn_taxonomy_authority")
    engine = create_engine(os.environ["DATABASE_URL"], poolclass=NullPool)
    try:
        with engine.begin() as connection:
            published = connection.execute(
                text(
                    """
                    SELECT *
                    FROM gsn_taxonomy_authority.publish_release_v1(
                        :release_public_id, :actor_user_id
                    )
                    """
                ),
                {"release_public_id": release_public_id, "actor_user_id": 1},
            ).mappings().one()
            checksum = str(published["release_checksum"])
            if len(checksum) != 64:
                raise RuntimeError("Publication did not return a SHA-256 checksum")
            withdrawn = connection.execute(
                text(
                    """
                    SELECT *
                    FROM gsn_taxonomy_authority.withdraw_release_v1(
                        :release_public_id, :actor_user_id, :reason
                    )
                    """
                ),
                {
                    "release_public_id": release_public_id,
                    "actor_user_id": 1,
                    "reason": "Gate 3 disposable authority rehearsal",
                },
            ).mappings().one()
            if withdrawn["release_status"] != "withdrawn":
                raise RuntimeError("Authority withdrawal did not complete")
            if str(withdrawn["release_checksum"]) != checksum:
                raise RuntimeError("Withdrawal rewrote the publication checksum")
            print(
                "AUTHORITY_COMPLETE "
                f"release={release_public_id} checksum={checksum} status=withdrawn"
            )
    finally:
        engine.dispose()


def _expect(response, status_code: int, label: str) -> Any:
    if response.status_code != status_code:
        raise RuntimeError(
            f"{label} expected {status_code}, got {response.status_code}: {response.text}"
        )
    content_type = str(response.headers.get("content-type", ""))
    if "application/json" in content_type:
        return response.json()
    return response.text


def _runtime() -> None:
    _assert_isolated_environment("gsn_runtime")
    if str(os.getenv("GMFN_AUTO_CREATE_SCHEMA", "")).strip().lower() != "false":
        raise RuntimeError("Runtime rehearsal must explicitly disable schema creation")
    disabled_flags = (
        "GSN_SHOP_PRIVACY_AUTHORITY_V1_ENABLED",
        "GSN_COMMERCE_TAXONOMY_OWNER_API_ENABLED",
        "GSN_COMMERCE_TAXONOMY_ADMIN_API_ENABLED",
        "GSN_COMMERCE_TAXONOMY_PUBLICATION_ENABLED",
        "GSN_TRUSTSLIP_V1_SNAPSHOT_WRITES_ENABLED",
    )
    for key in disabled_flags:
        if str(os.getenv(key, "")).strip().lower() != "false":
            raise RuntimeError(f"{key} must remain explicitly disabled")

    backend_root = Path(__file__).resolve().parents[1]
    if str(backend_root) not in sys.path:
        sys.path.insert(0, str(backend_root))

    from fastapi.testclient import TestClient
    from app.main import app

    results: dict[str, Any] = {}
    with TestClient(app) as client:
        login = client.post(
            "/auth/login",
            data={"username": "gate3-owner@example.test", "password": "Gate3-pass-123"},
        )
        login_body = _expect(login, 200, "authentication")
        token = str(login_body["access_token"])
        headers = {"Authorization": f"Bearer {token}"}

        results["identity_read"] = _expect(
            client.get("/auth/me", headers=headers), 200, "identity read"
        )["gmfn_id"]
        results["identity_update"] = _expect(
            client.patch(
                "/auth/me/profile",
                headers=headers,
                json={"display_name": "Gate Three Owner"},
            ),
            200,
            "identity update",
        )["display_name"]
        results["community_members"] = len(
            _expect(
                client.get("/clans/1/members", headers=headers),
                200,
                "community membership",
            )
        )
        owner_shop = _expect(
            client.get("/marketplace/shops/me?clan_id=1", headers=headers),
            200,
            "owner shop read",
        )
        results["owner_shop_id"] = int(owner_shop["item"]["id"])
        updated_shop = _expect(
            client.patch(
                "/marketplace/shops/1",
                headers={**headers, "X-Clan-Id": "1"},
                json={
                    "clan_id": 1,
                    "description": "Gate 3 restricted-runtime rehearsal shop",
                },
            ),
            200,
            "owner shop update",
        )
        results["shop_updated"] = updated_shop["item"]["description"]
        results["public_shop"] = _expect(
            client.get("/marketplace/public/shop/GSN-U-GATE3?clan_id=1"),
            200,
            "public shop",
        )["item"]["id"]
        directory = _expect(
            client.get(
                "/marketplace/shops/directory",
                headers=headers,
                params={"clan_id": 1, "limit": 20},
            ),
            200,
            "marketplace directory",
        )
        results["directory_items"] = len(directory["items"])

        diary = _expect(
            client.post(
                "/shop-diaries",
                headers=headers,
                json={
                    "clan_id": 1,
                    "shop_id": 1,
                    "activity_type": "product_update",
                    "note": "Synthetic Gate 3 diary evidence.",
                    "evidence_class": "owner_update",
                    "is_public": True,
                },
            ),
            201,
            "shop diary write",
        )
        results["diary_id"] = int(diary["id"])
        results["diary_read"] = len(
            _expect(
                client.get("/shop-diaries/me?shop_id=1", headers=headers),
                200,
                "shop diary read",
            )["items"]
        )

        demand = _expect(
            client.post(
                "/marketplace/requests",
                headers=headers,
                json={
                    "clan_id": 1,
                    "title": "Synthetic refrigerator repair",
                    "description": "Gate 3 runtime request",
                    "category": "repairs",
                    "urgency": "medium",
                    "area": "Enugu",
                    "allow_trust_credit": False,
                    "allow_one_hop_relay": False,
                    "visibility_scope": "community_visible",
                },
            ),
            200,
            "DemandBox write",
        )
        results["demand_id"] = int(demand["id"])
        results["demand_read"] = len(
            _expect(
                client.get(
                    "/marketplace/requests",
                    headers=headers,
                    params={"clan_id": 1, "mine_only": True},
                ),
                200,
                "DemandBox read",
            )
        )

        spotlight = _expect(
            client.get("/marketplace/shops/1/spotlight-status", headers=headers),
            200,
            "Spotlight status",
        )
        results["spotlight_status"] = spotlight.get("status")
        broadcasts = _expect(
            client.get(
                "/marketplace/broadcasts",
                headers=headers,
                params={"clan_id": 1, "active_only": True, "limit": 5},
            ),
            200,
            "Spotlight feed",
        )
        broadcast_items = (
            broadcasts.get("items", broadcasts)
            if isinstance(broadcasts, dict)
            else broadcasts
        )
        results["spotlight_items"] = len(broadcast_items)

        trust = _expect(
            client.get("/trust-slips/me/feature-summary", headers=headers),
            200,
            "TrustSlip read",
        )
        results["trustslip_active"] = bool(trust["active"])

    print("RUNTIME_REHEARSAL_COMPLETE " + json.dumps(results, sort_keys=True))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("migrate", "authority", "runtime"))
    parser.add_argument("--release-public-id")
    args = parser.parse_args()
    os.environ["GSN_GATE3_PROCESS_MODE"] = args.mode
    if args.mode == "migrate":
        _migrate()
    elif args.mode == "authority":
        if not args.release_public_id:
            parser.error("--release-public-id is required for authority mode")
        _authority(args.release_public_id)
    else:
        _runtime()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"GATE3_PROCESS_FAILURE {type(exc).__name__}: {exc}", file=sys.stderr)
        raise
