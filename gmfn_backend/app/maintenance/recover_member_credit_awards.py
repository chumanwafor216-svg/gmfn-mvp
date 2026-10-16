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
    if parsed < 1 or parsed > 1000:
        raise argparse.ArgumentTypeError("must be between 1 and 1000")
    return parsed


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Retry fully funded member-credit awards that remain pending. "
            "This command never verifies, links, or allocates provider payments."
        )
    )
    parser.add_argument("--limit", type=_bounded_limit, default=100)
    parser.add_argument("--pretty", action="store_true")
    args = parser.parse_args(argv)
    from app.db.database import SessionLocal
    from app.services.member_credit_service import recover_funded_purchase_awards

    with SessionLocal() as db:
        result = recover_funded_purchase_awards(db, limit=int(args.limit)).to_dict()
    print(json.dumps(result, indent=2 if args.pretty else None, sort_keys=True))
    return 2 if result["failures"] else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
