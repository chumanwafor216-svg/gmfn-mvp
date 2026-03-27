from __future__ import annotations

import csv
import io
import json
from datetime import datetime
from typing import Optional, Any

from sqlalchemy.orm import Session

from app.db.models import TrustEvent, User


def _loads_meta(meta_json: Optional[str]) -> dict[str, Any]:
    if not meta_json:
        return {}
    try:
        return json.loads(meta_json)
    except Exception:
        return {}


def _user_email_map(db: Session, user_ids: list[int]) -> dict[int, str]:
    if not user_ids:
        return {}
    rows = db.query(User.id, User.email).filter(User.id.in_(user_ids)).all()
    return {int(uid): str(email) for uid, email in rows if uid is not None and email is not None}


def get_invite_analytics(
    db: Session,
    *,
    clan_id: int,
    from_dt: Optional[datetime] = None,
    to_dt: Optional[datetime] = None,
    top_n: int = 10,
) -> dict:
    q = db.query(TrustEvent).filter(TrustEvent.clan_id == clan_id)

    if from_dt is not None:
        q = q.filter(TrustEvent.created_at >= from_dt)
    if to_dt is not None:
        q = q.filter(TrustEvent.created_at <= to_dt)

    events = q.order_by(TrustEvent.created_at.desc()).all()

    invites_created = 0
    invites_revoked = 0
    joins_via_invite = 0

    inviter_to_joins: dict[int, int] = {}
    invite_code_to_joins: dict[str, dict[str, Any]] = {}

    for ev in events:
        et = ev.event_type

        if et == "invite_created":
            invites_created += 1
            continue

        if et == "invite_revoked":
            invites_revoked += 1
            continue

        if et == "clan_join_via_invite":
            joins_via_invite += 1
            meta = _loads_meta(getattr(ev, "meta_json", None))

            code = meta.get("invite_code")
            inviter_id = meta.get("invited_by_user_id")

            if isinstance(code, str) and code:
                row = invite_code_to_joins.setdefault(code, {"joins": 0, "last_used_at": None})
                row["joins"] += 1
                if row["last_used_at"] is None:
                    row["last_used_at"] = ev.created_at  # newest-first

            if isinstance(inviter_id, int):
                inviter_to_joins[inviter_id] = inviter_to_joins.get(inviter_id, 0) + 1

    unique_invites_used = len(invite_code_to_joins)

    conversion_rate = 0.0
    if invites_created > 0:
        conversion_rate = joins_via_invite / float(invites_created)

    inviter_ids = list(inviter_to_joins.keys())
    inviter_email_map = _user_email_map(db, inviter_ids)

    top_inviters_pairs = sorted(inviter_to_joins.items(), key=lambda x: x[1], reverse=True)[:top_n]
    top_inviters = [
        {
            "invited_by_user_id": inviter_id,
            "invited_by_email": inviter_email_map.get(inviter_id),
            "joins": joins,
        }
        for inviter_id, joins in top_inviters_pairs
    ]

    top_invite_codes_pairs = sorted(
        invite_code_to_joins.items(),
        key=lambda x: x[1]["joins"],
        reverse=True,
    )[:top_n]

    top_invite_codes = [
        {"invite_code": code, "joins": data["joins"], "last_used_at": data["last_used_at"]}
        for code, data in top_invite_codes_pairs
    ]

    return {
        "summary": {
            "clan_id": clan_id,
            "from_dt": from_dt,
            "to_dt": to_dt,
            "invites_created": invites_created,
            "invites_revoked": invites_revoked,
            "joins_via_invite": joins_via_invite,
            "unique_invites_used": unique_invites_used,
            "conversion_rate": conversion_rate,
        },
        "top_inviters": top_inviters,
        "top_invite_codes": top_invite_codes,
    }


def get_recent_invite_joins(
    db: Session,
    *,
    clan_id: int,
    limit: int = 50,
) -> list[dict]:
    q = (
        db.query(TrustEvent)
        .filter(TrustEvent.clan_id == clan_id, TrustEvent.event_type == "clan_join_via_invite")
        .order_by(TrustEvent.created_at.desc())
        .limit(limit)
    )

    events = q.all()

    inviter_ids: list[int] = []
    joiner_ids: list[int] = []

    rows: list[dict] = []
    for ev in events:
        meta = _loads_meta(getattr(ev, "meta_json", None))
        inviter_id = meta.get("invited_by_user_id")
        code = meta.get("invite_code")

        if isinstance(inviter_id, int):
            inviter_ids.append(inviter_id)

        if isinstance(ev.actor_user_id, int):
            joiner_ids.append(int(ev.actor_user_id))

        rows.append(
            {
                "joined_at": ev.created_at,
                "invite_code": str(code) if code else "",
                "invited_by_user_id": inviter_id if isinstance(inviter_id, int) else None,
                "joined_user_id": int(ev.actor_user_id) if ev.actor_user_id is not None else 0,
            }
        )

    email_map = _user_email_map(db, list(set(inviter_ids + joiner_ids)))

    for r in rows:
        inv_id = r.get("invited_by_user_id")
        join_id = r.get("joined_user_id")
        r["invited_by_email"] = email_map.get(inv_id) if isinstance(inv_id, int) else None
        r["joined_user_email"] = email_map.get(join_id) if isinstance(join_id, int) else None

    # remove invalid join_user_id=0 (just in case)
    return [r for r in rows if r.get("joined_user_id")]


def get_trust_events_timeline(
    db: Session,
    *,
    clan_id: int,
    limit: int = 100,
    event_type: Optional[str] = None,
) -> list[dict]:
    q = db.query(TrustEvent).filter(TrustEvent.clan_id == clan_id)

    if event_type:
        q = q.filter(TrustEvent.event_type == event_type)

    events = q.order_by(TrustEvent.created_at.desc()).limit(limit).all()

    user_ids: list[int] = []
    for ev in events:
        if isinstance(ev.actor_user_id, int):
            user_ids.append(int(ev.actor_user_id))
        if isinstance(ev.subject_user_id, int):
            user_ids.append(int(ev.subject_user_id))

    email_map = _user_email_map(db, list(set(user_ids)))

    out: list[dict] = []
    for ev in events:
        out.append(
            {
                "created_at": ev.created_at,
                "event_type": ev.event_type,
                "actor_user_id": ev.actor_user_id,
                "actor_email": email_map.get(int(ev.actor_user_id)) if ev.actor_user_id is not None else None,
                "subject_user_id": ev.subject_user_id,
                "subject_email": email_map.get(int(ev.subject_user_id)) if ev.subject_user_id is not None else None,
                "clan_id": ev.clan_id,
                "loan_id": ev.loan_id,
                "guarantor_id": ev.guarantor_id,
                "meta": _loads_meta(getattr(ev, "meta_json", None)),
            }
        )
    return out


def csv_for_recent_invite_joins(rows: list[dict]) -> str:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["joined_at", "invite_code", "invited_by_user_id", "invited_by_email", "joined_user_id", "joined_user_email"])
    for r in rows:
        w.writerow([
            r.get("joined_at"),
            r.get("invite_code"),
            r.get("invited_by_user_id"),
            r.get("invited_by_email"),
            r.get("joined_user_id"),
            r.get("joined_user_email"),
        ])
    return buf.getvalue()


def csv_for_trust_events(rows: list[dict]) -> str:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["created_at", "event_type", "actor_user_id", "actor_email", "subject_user_id", "subject_email", "loan_id", "guarantor_id", "meta_json"])
    for r in rows:
        w.writerow([
            r.get("created_at"),
            r.get("event_type"),
            r.get("actor_user_id"),
            r.get("actor_email"),
            r.get("subject_user_id"),
            r.get("subject_email"),
            r.get("loan_id"),
            r.get("guarantor_id"),
            json.dumps(r.get("meta") or {}, ensure_ascii=False),
        ])
    return buf.getvalue()
