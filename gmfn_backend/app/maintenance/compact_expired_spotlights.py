from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def _bounded_limit(value: str) -> int:
    parsed = int(value)
    if parsed < 1 or parsed > 500:
        raise argparse.ArgumentTypeError("must be between 1 and 500")
    return parsed


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Delete expired Spotlight delivery payload while preserving minimal "
            "campaign and exposure audit evidence."
        )
    )
    parser.add_argument("--limit", type=_bounded_limit, default=100)
    parser.add_argument("--pretty", action="store_true")
    args = parser.parse_args(argv)

    from app.db.database import SessionLocal
    from app.services.spotlight_retention_service import (
        compact_expired_spotlight_payloads,
    )
    from app.services.marketplace_media_cleanup_service import (
        process_marketplace_media_deletion_tasks,
    )

    with SessionLocal() as db:
        retried = process_marketplace_media_deletion_tasks(db, limit=int(args.limit))
        result = compact_expired_spotlight_payloads(db, limit=int(args.limit))
    result["retry_tasks_processed"] = len(retried)
    print(json.dumps(result, indent=2 if args.pretty else None, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
