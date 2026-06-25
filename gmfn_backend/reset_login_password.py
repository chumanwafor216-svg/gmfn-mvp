from __future__ import annotations

import argparse
import getpass
import sys


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Reset the login password for one existing GSN/GMFN user."
    )
    parser.add_argument(
        "identity",
        help=(
            "User GSN/GMFN identity. Accepts a full ID such as GMFN-U-63655DE6 "
            "or just the suffix such as 63655DE6."
        ),
    )
    return parser.parse_args()


def _identity_candidates(value: str) -> list[str]:
    raw = str(value or "").strip().upper()
    if not raw:
        return []

    if raw.startswith("GMFN-U-"):
        candidates = [raw, f"GSN-U-{raw[7:]}"]
    elif raw.startswith("GSN-U-"):
        candidates = [raw, f"GMFN-U-{raw[6:]}"]
    else:
        suffix = raw.removeprefix("U-")
        candidates = [f"GMFN-U-{suffix}", f"GSN-U-{suffix}"]

    seen: set[str] = set()
    out: list[str] = []
    for candidate in candidates:
        if candidate and candidate not in seen:
            seen.add(candidate)
            out.append(candidate)
    return out


def _read_password() -> str:
    password = getpass.getpass("New password: ")
    confirm = getpass.getpass("Confirm password: ")
    if password != confirm:
        raise ValueError("Passwords did not match.")
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters.")
    return password


def main() -> int:
    args = parse_args()
    candidates = _identity_candidates(args.identity)
    if not candidates:
        print("Provide a GSN/GMFN identity.", file=sys.stderr)
        return 2

    from sqlalchemy import func

    from app.core.security import get_password_hash
    from app.db.database import SessionLocal
    from app.db.models import User

    db = SessionLocal()
    try:
        user = (
            db.query(User)
            .filter(func.upper(User.gmfn_id).in_(candidates))
            .order_by(User.id.asc())
            .first()
        )
        if not user:
            print(
                f"User not found for identity candidates: {', '.join(candidates)}",
                file=sys.stderr,
            )
            return 1

        print(
            {
                "found": True,
                "user_id": int(user.id),
                "gmfn_id": getattr(user, "gmfn_id", None),
                "email": getattr(user, "email", None),
                "role": getattr(user, "role", None),
                "phone_e164": getattr(user, "phone_e164", None),
            }
        )

        user.hashed_password = get_password_hash(_read_password())
        db.add(user)
        db.commit()
        db.refresh(user)

        print(
            {
                "ok": True,
                "user_id": int(user.id),
                "gmfn_id": getattr(user, "gmfn_id", None),
                "role": getattr(user, "role", None),
                "phone_e164": getattr(user, "phone_e164", None),
                "message": "Password reset. Sign in with this GSN/GMFN ID and the new password.",
            }
        )
        return 0
    except ValueError as exc:
        db.rollback()
        print(str(exc), file=sys.stderr)
        return 2
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
