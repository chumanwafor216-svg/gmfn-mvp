from __future__ import annotations

import argparse
import sys


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Promote an existing GMFN user to admin."
    )
    parser.add_argument(
        "--email",
        required=True,
        help="Email address of the existing user to promote.",
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
    role = str(args.role or "admin").strip().lower()

    from app.db.database import SessionLocal
    from app.db.models import User

    session = SessionLocal()
    try:
        user = session.query(User).filter(User.email == email).first()
        if not user:
            print(
                f"User not found for email: {email}",
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
                "role": user.role,
            }
        )
        return 0
    finally:
        session.close()


if __name__ == "__main__":
    raise SystemExit(main())
