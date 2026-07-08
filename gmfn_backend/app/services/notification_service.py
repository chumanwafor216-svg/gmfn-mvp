from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List
from urllib.parse import parse_qs, urlparse

from sqlalchemy.orm import Session

from app.core.auth import is_user_activation_pending
from app.db.models import Clan, ClanJoinRequest, ClanMembership, User
from app.db.notification_models import Notification
from app.services.web_push_service import dispatch_web_push_for_notification


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def create_notification(
    db: Session,
    *,
    user_id: int,
    kind: str,
    title: str,
    message: str,
    action_url: str | None = None,
    action_label: str | None = None,
    commit: bool = True,
    refresh: bool = True,
) -> Notification:
    normalized_action_url, normalized_action_label = normalize_notification_action(
        kind=kind,
        title=title,
        message=message,
        action_url=action_url,
        action_label=action_label,
    )
    row = Notification(
        user_id=int(user_id),
        kind=str(kind),
        title=str(title),
        message=str(message),
        action_url=normalized_action_url,
        action_label=normalized_action_label,
        is_read=False,
        created_at=_now_utc(),
        read_at=None,
    )
    db.add(row)

    if commit:
        db.commit()
        if refresh:
            db.refresh(row)
        try:
            dispatch_web_push_for_notification(db, row)
        except Exception:
            # Push delivery is best-effort; the GSN notification row is the truth.
            pass

    return row


def _community_code(clan_id: int) -> str:
    return f"GMFN-C-{int(clan_id):06d}"


def _safe_str(value: Any) -> str:
    return str(value or "").strip()


def _join_request_id_from_action_url(action_url: Any) -> int:
    raw = _safe_str(action_url)
    if not raw or "join-requests" not in raw:
        return 0

    parsed = urlparse(raw)
    request_values = parse_qs(parsed.query).get("request_id") or []
    for value in request_values:
        try:
            request_id = int(value)
        except (TypeError, ValueError):
            continue
        if request_id > 0:
            return request_id
    return 0


def _join_request_status_for_notification(
    db: Session,
    notification: Notification,
) -> Dict[str, Any]:
    request_id = _join_request_id_from_action_url(notification.action_url)
    if request_id <= 0:
        return {}

    join_request = db.get(ClanJoinRequest, int(request_id))
    if not join_request:
        return {
            "join_request_id": int(request_id),
            "join_request_status": "missing",
            "join_request_resolved": True,
        }

    status = _safe_str(getattr(join_request, "status", None)).lower() or "pending"
    return {
        "join_request_id": int(request_id),
        "join_request_status": status,
        "join_request_resolved": status != "pending",
    }


def _notification_text(
    *,
    kind: Any,
    title: Any,
    message: Any,
    action_url: Any,
    action_label: Any,
) -> str:
    return " ".join(
        [
            _safe_str(kind),
            _safe_str(title),
            _safe_str(message),
            _safe_str(action_url),
            _safe_str(action_label),
        ]
    ).lower()


def normalize_notification_action(
    *,
    kind: Any,
    title: Any,
    message: Any,
    action_url: str | None,
    action_label: str | None,
) -> tuple[str | None, str | None]:
    """Return the current route/label truth without mutating historic rows."""

    url = _safe_str(action_url) or None
    label = _safe_str(action_label) or None
    text = _notification_text(
        kind=kind,
        title=title,
        message=message,
        action_url=url,
        action_label=label,
    )
    lower_url = _safe_str(url).lower()
    lower_label = _safe_str(label).lower()

    if (
        _safe_str(kind).lower() == "pool.deposit_confirmed"
        or (
            "pool deposit" in text
            and (
                "confirmed" in text
                or "deposit was confirmed" in text
                or "deposit confirmed" in text
            )
        )
    ):
        return "/app/finance", "Open Finance File"

    if lower_url == "/app/loans" and lower_label in {
        "",
        "open finances",
        "view finances",
        "open finance",
        "view finance",
        "open support",
        "view support",
    }:
        return url, "Open Loans & Support"

    if lower_url == "/app/finance" and lower_label in {
        "",
        "open finances",
        "view finances",
        "open finance",
        "view finance",
    }:
        return url, "Open Finance File"

    if lower_url.startswith("/app/payment/pool") and lower_label in {
        "",
        "deposit to pool",
        "deposit",
        "open deposit",
        "make deposit",
        "open payment",
    }:
        return url, "Open Money In"

    if lower_url == "/app/withdrawal-instructions" and lower_label in {
        "",
        "withdraw",
        "open withdrawal",
        "view withdrawal",
        "open payment",
    }:
        return url, "Open Money Out"

    return url, label


def ensure_join_review_notifications(
    db: Session,
    *,
    reviewer_user: User,
) -> Dict[str, Any]:
    if reviewer_user is None or is_user_activation_pending(reviewer_user):
        return {"ok": True, "created": 0, "retired": 0}

    memberships = (
        db.query(ClanMembership, Clan)
        .join(Clan, Clan.id == ClanMembership.clan_id)
        .filter(
            ClanMembership.user_id == int(reviewer_user.id),
            ClanMembership.left_at.is_(None),
        )
        .order_by(ClanMembership.created_at.asc(), ClanMembership.id.asc())
        .all()
    )

    active_clan_ids = [int(membership.clan_id) for membership, _clan in memberships]
    clan_by_id = {int(clan.id): clan for membership, clan in memberships}

    retired = _retire_stale_join_review_notifications(
        db,
        reviewer_user_id=int(reviewer_user.id),
        active_clan_ids=active_clan_ids,
    )

    if not memberships:
        if retired:
            db.commit()
        return {"ok": True, "created": 0, "retired": int(retired)}

    pending_requests = (
        db.query(ClanJoinRequest)
        .filter(
            ClanJoinRequest.clan_id.in_(active_clan_ids),
            ClanJoinRequest.status == "pending",
        )
        .order_by(ClanJoinRequest.created_at.desc(), ClanJoinRequest.id.desc())
        .all()
    )

    created = 0

    for join_request in pending_requests:
        if int(join_request.applicant_user_id or 0) == int(reviewer_user.id):
            continue

        clan = clan_by_id.get(int(join_request.clan_id)) or db.get(
            Clan,
            int(join_request.clan_id),
        )
        if clan is None:
            continue

        action_url = (
            f"/app/community/{int(clan.id)}/join-requests"
            f"?request_id={int(join_request.id)}"
            f"&community_code={_community_code(int(clan.id))}"
        )

        existing = (
            db.query(Notification.id)
            .filter(
                Notification.user_id == int(reviewer_user.id),
                Notification.kind == "approval_request",
                Notification.action_url == action_url,
            )
            .first()
        )
        if existing:
            continue

        applicant = (
            db.get(User, int(join_request.applicant_user_id))
            if join_request.applicant_user_id is not None
            else None
        )
        applicant_label = (
            str(getattr(applicant, "gmfn_id", "") or "").strip()
            or str(getattr(applicant, "email", "") or "").strip()
            or "A pending applicant"
        )

        create_notification(
            db,
            user_id=int(reviewer_user.id),
            kind="approval_request",
            title="Pending join request",
            message=(
                f"{applicant_label} is waiting for community review in {clan.name} "
                f"({_community_code(int(clan.id))})."
            ),
            action_url=action_url,
            action_label="Review",
            commit=False,
            refresh=False,
        )
        created += 1

    if created or retired:
        db.commit()

    return {"ok": True, "created": int(created), "retired": int(retired)}


def _retire_stale_join_review_notifications(
    db: Session,
    *,
    reviewer_user_id: int,
    active_clan_ids: List[int],
) -> int:
    active_ids = {int(clan_id) for clan_id in active_clan_ids}
    rows = (
        db.query(Notification)
        .filter(
            Notification.user_id == int(reviewer_user_id),
            Notification.kind == "approval_request",
            Notification.is_read == False,  # noqa: E712
        )
        .all()
    )

    retired = 0
    now = _now_utc()

    for row in rows:
        request_id = _join_request_id_from_action_url(row.action_url)
        if request_id <= 0:
            continue

        join_request = db.get(ClanJoinRequest, int(request_id))
        status = _safe_str(getattr(join_request, "status", None)).lower()
        request_clan_id = int(getattr(join_request, "clan_id", 0) or 0)
        applicant_user_id = int(getattr(join_request, "applicant_user_id", 0) or 0)
        still_actionable = bool(
            join_request
            and status == "pending"
            and request_clan_id in active_ids
            and applicant_user_id != int(reviewer_user_id)
        )

        if still_actionable:
            continue

        row.is_read = True
        row.read_at = now
        db.add(row)
        retired += 1

    return int(retired)


def list_my_notifications(
    db: Session,
    *,
    user_id: int,
    limit: int = 50,
    unread_only: bool = False,
) -> Dict[str, Any]:
    q = (
        db.query(Notification)
        .filter(Notification.user_id == int(user_id))
        .order_by(Notification.id.desc())
    )

    if unread_only:
        q = q.filter(Notification.is_read == False)  # noqa: E712

    rows = q.limit(int(max(1, min(limit, 200)))).all()

    items: List[Dict[str, Any]] = []
    for r in rows:
        normalized_action_url, normalized_action_label = normalize_notification_action(
            kind=r.kind,
            title=r.title,
            message=r.message,
            action_url=r.action_url,
            action_label=r.action_label,
        )
        items.append(
            {
                "id": int(r.id),
                "kind": str(r.kind),
                "title": str(r.title),
                "message": str(r.message),
                "action_url": normalized_action_url,
                "action_label": normalized_action_label,
                "is_read": bool(r.is_read),
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "read_at": r.read_at.isoformat() if r.read_at else None,
                **(
                    _join_request_status_for_notification(db, r)
                    if str(r.kind) == "approval_request"
                    else {}
                ),
            }
        )

    return {
        "items": items,
        "total": len(rows),
    }


def get_unread_count(
    db: Session,
    *,
    user_id: int,
) -> Dict[str, Any]:
    count = (
        db.query(Notification)
        .filter(Notification.user_id == int(user_id))
        .filter(Notification.is_read == False)  # noqa: E712
        .count()
    )
    return {
        "user_id": int(user_id),
        "unread_count": int(count),
    }


def mark_notification_read(
    db: Session,
    *,
    user_id: int,
    notification_id: int,
) -> Notification:
    row = (
        db.query(Notification)
        .filter(Notification.user_id == int(user_id))
        .filter(Notification.id == int(notification_id))
        .first()
    )
    if not row:
        raise LookupError("Notification not found")

    if not row.is_read:
        row.is_read = True
        row.read_at = _now_utc()
        db.add(row)
        db.commit()
        db.refresh(row)

    return row


def seed_assistance_notifications(
    db: Session,
    *,
    user_id: int,
) -> Dict[str, Any]:
    created_ids: List[int] = []

    samples = [
        {
            "kind": "assistant.nudge",
            "title": "Build your future gradually",
            "message": "You did well showing up today. Would you like to put a little aside for your future?",
            "action_url": "/app/payment/pool?currency=NGN",
            "action_label": "Open Money In",
        },
        {
            "kind": "assistant.reminder",
            "title": "Check pending support actions",
            "message": "If you have a pending request, responding early helps your community move forward.",
            "action_url": "/app/loans",
            "action_label": "Open Loans & Support",
        },
        {
            "kind": "assistant.trust",
            "title": "Consistency strengthens trust",
            "message": "Regular contributions and timely responses can improve how your community sees your reliability.",
            "action_url": "/app/trust",
            "action_label": "View Trust",
        },
    ]

    for item in samples:
        row = create_notification(
            db,
            user_id=int(user_id),
            kind=item["kind"],
            title=item["title"],
            message=item["message"],
            action_url=item["action_url"],
            action_label=item["action_label"],
        )
        created_ids.append(int(row.id))

    return {"ok": True, "created_ids": created_ids}
