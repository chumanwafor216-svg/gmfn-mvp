from __future__ import annotations

import argparse
import sys


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Promote an existing GMFN user to admin."
    )
    parser.add_argument(
        "--email",
        default=None,
        help="Email address of the existing user to promote.",
    )
    parser.add_argument(
        "--gmfn-id",
        default=None,
        help="GSN/GMFN ID of the existing user to promote.",
    )
    parser.add_argument(
        "--phone",
        default=None,
        help="E.164 phone number of the existing user to promote, for example +447...",
    )
    parser.add_argument(
        "--role",
        default="admin",
        choices=["admin", "user"],
        help="Role to assign. Defaults to admin.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    email = str(args.email or "").strip().lower()
    gmfn_id = str(args.gmfn_id or "").strip().upper()
    phone = str(args.phone or "").strip()
    role = str(args.role or "admin").strip().lower()

    identifiers = [bool(email), bool(gmfn_id), bool(phone)]
    if sum(identifiers) != 1:
        print(
            "Provide exactly one of --email, --gmfn-id, or --phone.",
            file=sys.stderr,
        )
        return 2

    from app.db.database import SessionLocal
    from app.db.models import User

    session = SessionLocal()
    try:
        query = session.query(User)
        if email:
            user = query.filter(User.email == email).first()
            lookup = f"email: {email}"
        elif gmfn_id:
            candidates = [gmfn_id]
            if gmfn_id.startswith("GMFN-"):
                candidates.append(f"GSN-{gmfn_id[5:]}")
            elif gmfn_id.startswith("GSN-"):
                candidates.append(f"GMFN-{gmfn_id[4:]}")
            user = query.filter(User.gmfn_id.in_(candidates)).first()
            lookup = f"GSN/GMFN ID: {gmfn_id}"
        else:
            user = query.filter(User.phone_e164 == phone).first()
            lookup = f"phone: {phone}"

        if not user:
            print(
                f"User not found for {lookup}",
                file=sys.stderr,
            )
            return 1

        user.role = role
        session.add(user)
        session.commit()
        session.refresh(user)

        print(
            {
                "ok": True,
                "user_id": int(user.id),
                "email": user.email,
                "gmfn_id": getattr(user, "gmfn_id", None),
                "phone_e164": getattr(user, "phone_e164", None),
                "role": user.role,
            }
        )
        return 0
    finally:
        session.close()


if __name__ == "__main__":
    raise SystemExit(main())
