from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def _positive_int(value: str) -> int:
    parsed = int(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("must be a positive integer")
    return parsed


def _optional_positive_int(value: str | None) -> int | None:
    if value is None or str(value).strip() == "":
        return None
    return _positive_int(str(value))


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Record missing Community Confirmation review SLA TrustEvents and "
            "notify reviewers. Intended for cron/worker execution."
        )
    )
    parser.add_argument(
        "--actor-user-id",
        type=_positive_int,
        default=_optional_positive_int(os.getenv("GSN_MAINTENANCE_ACTOR_USER_ID")),
        help=(
            "Admin user id used as the maintenance actor. Can also be set with "
            "GSN_MAINTENANCE_ACTOR_USER_ID."
        ),
    )
    parser.add_argument(
        "--community-id",
        type=_optional_positive_int,
        default=None,
        help="Optional community id to scan. Omit for an admin-wide scan.",
    )
    parser.add_argument(
        "--limit",
        type=_positive_int,
        default=200,
        help="Maximum active review cases to inspect. Default: 200.",
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print JSON output.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)
    if not args.actor_user_id:
        parser.error(
            "--actor-user-id is required unless GSN_MAINTENANCE_ACTOR_USER_ID is set"
        )

    from app.db.database import SessionLocal
    from app.services.community_confirmation_service import (
        scan_confirmation_review_sla_events,
    )

    with SessionLocal() as db:
        result: dict[str, Any] = scan_confirmation_review_sla_events(
            db,
            actor_user_id=int(args.actor_user_id),
            actor_role="admin",
            community_id=args.community_id,
            limit=int(args.limit),
        )

    print(json.dumps(result, indent=2 if args.pretty else None, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
