from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from typing import Optional


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Owner-confirm an existing user's phone after a manual identity "
            "reconciliation review."
        )
    )
    parser.add_argument(
        "--email",
        default=None,
        help="Email address of the existing user.",
    )
    parser.add_argument(
        "--gmfn-id",
        default=None,
        help="GSN/GMFN ID of the existing user.",
    )
    parser.add_argument(
        "--phone",
        default=None,
        help="Phone number to confirm or use for lookup.",
    )
    parser.add_argument(
        "--owner-confirmed",
        action="store_true",
        help="Required safety flag confirming the owner verified this record.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show the target user without changing records.",
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


def _clean_phone(value: Optional[str]) -> str:
    return str(value or "").strip()


def _lookup_user(db, *, email: str, gmfn_id: str, phone: str):
    from sqlalchemy import func

    from app.db.models import User

    query = db.query(User)
    if email:
        return query.filter(func.lower(User.email) == email.lower()).first(), f"email: {email}"
    if gmfn_id:
        candidates = _identity_candidates(gmfn_id)
        return (
            query.filter(func.upper(User.gmfn_id).in_(candidates)).first(),
            f"GSN/GMFN ID: {gmfn_id}",
        )
    return query.filter(User.phone_e164 == phone).first(), f"phone: {phone}"


def main() -> int:
    args = parse_args()
    email = str(args.email or "").strip()
    gmfn_id = str(args.gmfn_id or "").strip().upper()
    phone = _clean_phone(args.phone)

    identifiers = [bool(email), bool(gmfn_id), bool(phone)]
    if sum(identifiers) != 1:
        print("Provide exactly one of --email, --gmfn-id, or --phone.", file=sys.stderr)
        return 2

    if not args.owner_confirmed and not args.dry_run:
        print(
            "Refusing to change phone verification without --owner-confirmed.",
            file=sys.stderr,
        )
        return 2

    from app.db.database import SessionLocal
    from app.services.trust_events_services import build_trust_meta, log_trust_event

    db = SessionLocal()
    try:
        user, lookup = _lookup_user(db, email=email, gmfn_id=gmfn_id, phone=phone)
        if not user:
            print(f"User not found for {lookup}", file=sys.stderr)
            return 1

        current_phone = _clean_phone(getattr(user, "phone_e164", None))
        if not current_phone:
            if not phone:
                print(
                    "User has no phone_e164. Re-run with --phone after confirming the owner.",
                    file=sys.stderr,
                )
                return 2
            current_phone = phone

        before_verified = getattr(user, "phone_verified_at", None)
        snapshot = {
            "found": True,
            "user_id": int(user.id),
            "gmfn_id": getattr(user, "gmfn_id", None),
            "email": getattr(user, "email", None),
            "phone_e164": current_phone,
            "phone_verified_at": before_verified.isoformat()
            if before_verified
            else None,
            "role": getattr(user, "role", None),
        }
        print(snapshot)

        if args.dry_run:
            print({"ok": True, "dry_run": True, "message": "No records changed."})
            return 0

        verified_at = before_verified or datetime.now(timezone.utc)
        user.phone_e164 = current_phone
        user.phone_verified_at = verified_at
        db.add(user)

        meta = build_trust_meta(
            reason="owner_confirmed_identity_repair",
            note=(
                "Phone number was confirmed after owner-reviewed identity "
                "reconciliation repair."
            ),
            system=True,
            extra={
                "verification_source": "admin.owner_confirmed_identity_repair",
                "phone_e164": current_phone,
                "already_verified": bool(before_verified),
            },
        )
        event = log_trust_event(
            db,
            event_type="identity.phone_verified",
            clan_id=None,
            actor_user_id=int(user.id),
            subject_user_id=int(user.id),
            meta=meta,
            dedupe_key=f"owner-phone-confirmed:{int(user.id)}:{current_phone}",
            commit=False,
            refresh=False,
        )
        db.commit()
        db.refresh(user)

        print(
            {
                "ok": True,
                "user_id": int(user.id),
                "gmfn_id": getattr(user, "gmfn_id", None),
                "phone_e164": getattr(user, "phone_e164", None),
                "phone_verified_at": user.phone_verified_at.isoformat()
                if user.phone_verified_at
                else None,
                "trust_event_id": int(getattr(event, "id", 0) or 0) or None,
                "message": (
                    "Owner-confirmed phone repair recorded. TrustSlip can now "
                    "pass the phone verification gate on next refresh."
                ),
            }
        )
        return 0
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
