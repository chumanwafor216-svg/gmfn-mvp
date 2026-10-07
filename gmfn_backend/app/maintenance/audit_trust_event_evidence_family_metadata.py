from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def _positive_int(value: str) -> int:
    parsed = int(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("must be a positive integer")
    return parsed


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Read-only audit of historical TrustEvent evidence-family metadata. "
            "Does not write or backfill rows."
        )
    )
    parser.add_argument(
        "--limit",
        type=_positive_int,
        default=1000,
        help="Maximum recent TrustEvents to inspect. Default: 1000. Hard capped at 10000.",
    )
    parser.add_argument(
        "--sample-limit",
        type=int,
        default=20,
        help="Maximum safe sample rows to include. Default: 20. Hard capped at 100.",
    )
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    from app.db.database import SessionLocal
    from app.services.trust_event_evidence_family_audit import (
        audit_trust_event_evidence_family_metadata,
    )

    with SessionLocal() as db:
        result = audit_trust_event_evidence_family_metadata(
            db,
            limit=int(args.limit),
            sample_limit=int(args.sample_limit),
        )

    print(json.dumps(result, indent=2 if args.pretty else None, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
