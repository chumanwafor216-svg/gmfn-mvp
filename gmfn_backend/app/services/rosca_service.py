from __future__ import annotations

import json
import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, Iterable, List, Optional

from sqlalchemy.orm import Session

from app.db.bank_models import ExpectedPayment
from app.db.models import ClanMembership, PoolEvent, TrustEvent, User
from app.db.notification_models import Notification
from app.services.expected_payments_service import create_expected_payment
from app.services.feature_entitlements_service import get_active_feature_quantity
from app.services.notification_service import create_notification
from app.services.payment_instruction_service import FEATURE_ROSCA_CYCLE
from app.services.trust_events_services import log_trust_event


ROSCA_ENGINE_VERSION = "rosca_cycle_engine_v1"
ROSCA_SOURCE = "rosca.cycle"
ROSCA_EVENT_STARTED = "rosca.cycle.started"
ROSCA_EVENT_PAYOUT_RECORDED = "rosca.round.payout_recorded"
ROSCA_ACTIVE_OBLIGATION_STATUSES = {"expected", "partial", "defaulted", "expired"}


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _d(value: Any) -> Decimal:
    if value is None:
        return Decimal("0.00")
    if isinstance(value, Decimal):
        return value.quantize(Decimal("0.01"))
    return Decimal(str(value)).quantize(Decimal("0.01"))


def _ccy(currency: Optional[str]) -> str:
    return (currency or "NGN").strip().upper() or "NGN"


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _safe_meta(raw: Optional[str]) -> Dict[str, Any]:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def _to_utc(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _cycle_token() -> str:
    return f"{_now_utc().strftime('%Y%m%d%H%M%S')}{secrets.token_hex(2).upper()}"


def _cycle_id(*, clan_id: int, token: str) -> str:
    return f"RSC-C{int(clan_id)}-{token}"


def _reference(
    *,
    clan_id: int,
    token: str,
    round_number: int,
    user_id: int,
) -> str:
    return f"GMFN-ROSCA-C{int(clan_id)}-{token}-R{int(round_number)}-U{int(user_id)}"


def _active_member_ids(db: Session, *, clan_id: int) -> List[int]:
    rows = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.left_at.is_(None),
        )
        .order_by(ClanMembership.id.asc())
        .all()
    )
    return [int(row.user_id) for row in rows]


def _admin_member_ids(db: Session, *, clan_id: int) -> List[int]:
    rows = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.left_at.is_(None),
        )
        .order_by(ClanMembership.id.asc())
        .all()
    )
    out: List[int] = []
    for row in rows:
        if str(getattr(row, "role", "") or "").lower() == "admin":
            out.append(int(row.user_id))
    return list(dict.fromkeys(out))


def _notify_once(
    db: Session,
    *,
    user_id: int,
    kind: str,
    title: str,
    message: str,
    action_url: Optional[str] = None,
    action_label: Optional[str] = None,
) -> bool:
    existing = (
        db.query(Notification)
        .filter(Notification.user_id == int(user_id))
        .filter(Notification.kind == str(kind))
        .filter(Notification.action_url == action_url)
        .first()
    )
    if existing:
        return False
    create_notification(
        db,
        user_id=int(user_id),
        kind=str(kind),
        title=title,
        message=message,
        action_url=action_url,
        action_label=action_label,
        commit=False,
        refresh=False,
    )
    return True


def _dashboard_focus_url(*, cycle_id: str, round_number: Optional[int] = None) -> str:
    suffix = f"&round={int(round_number)}" if round_number else ""
    return f"/app/dashboard?rosca_cycle={cycle_id}{suffix}#focus-commitments"


def _money_in_url(*, clan_id: int, expected_payment_id: Optional[int] = None) -> str:
    suffix = f"&expected_payment_id={int(expected_payment_id)}" if expected_payment_id else ""
    return f"/app/payment/pool?clan_id={int(clan_id)}{suffix}"


def _shop_control_url(*, clan_id: int, cycle_id: str, round_number: int) -> str:
    return (
        f"/app/shop-control?clan_id={int(clan_id)}"
        f"&rosca_cycle={cycle_id}&round={int(round_number)}"
        "#shop-control-community-packages"
    )


def _validate_member_set(
    db: Session,
    *,
    clan_id: int,
    member_user_ids: Optional[Iterable[int]],
) -> List[int]:
    active_ids = _active_member_ids(db, clan_id=int(clan_id))
    active_set = set(active_ids)

    requested = [
        int(user_id)
        for user_id in (member_user_ids or active_ids)
        if int(user_id) > 0
    ]
    deduped = list(dict.fromkeys(requested))

    if len(deduped) < 2:
        raise ValueError("A ROSCA cycle needs at least two active community members")

    missing = [user_id for user_id in deduped if user_id not in active_set]
    if missing:
        raise ValueError(
            "ROSCA cycle members must already belong to this community"
        )

    return deduped


def _validate_payout_order(
    *,
    member_user_ids: List[int],
    payout_order_user_ids: Optional[Iterable[int]],
) -> List[int]:
    if payout_order_user_ids is None:
        return list(member_user_ids)

    order = [
        int(user_id)
        for user_id in payout_order_user_ids
        if int(user_id) > 0
    ]
    order = list(dict.fromkeys(order))
    if set(order) != set(member_user_ids) or len(order) != len(member_user_ids):
        raise ValueError("Payout order must include each ROSCA member exactly once")
    return order


def _trust_score_for_user(user: Optional[User]) -> int:
    if user is None:
        return 50
    return _safe_int(getattr(user, "trust_score", None), 50)


def _trust_ranked_payout_order(
    db: Session,
    *,
    member_user_ids: List[int],
) -> tuple[List[int], Dict[str, Any]]:
    users = (
        db.query(User)
        .filter(User.id.in_([int(user_id) for user_id in member_user_ids]))
        .all()
    )
    user_by_id = {int(row.id): row for row in users}
    membership_index = {
        int(user_id): index for index, user_id in enumerate(member_user_ids)
    }
    trust_scores = {
        int(user_id): _trust_score_for_user(user_by_id.get(int(user_id)))
        for user_id in member_user_ids
    }
    ranked = sorted(
        [int(user_id) for user_id in member_user_ids],
        key=lambda user_id: (
            -trust_scores.get(int(user_id), 50),
            membership_index.get(int(user_id), 999999),
            int(user_id),
        ),
    )
    return ranked, {
        "payout_order_strategy": "trust_score_desc_membership_order_tiebreak",
        "trust_scores_by_user_id": {
            str(user_id): int(trust_scores.get(int(user_id), 50))
            for user_id in member_user_ids
        },
        "tie_breaker": "clan_membership_id_asc",
    }


def _expected_payment_out(row: ExpectedPayment) -> Dict[str, Any]:
    meta = _safe_meta(getattr(row, "meta_json", None))
    return {
        "id": int(row.id),
        "clan_id": int(row.clan_id),
        "user_id": int(row.user_id),
        "expected_type": str(row.expected_type),
        "amount": str(row.amount),
        "currency": str(row.currency),
        "paid_amount": str(row.paid_amount),
        "remaining_amount": str(row.remaining_amount),
        "due_at": _iso(row.due_at),
        "reference_display": str(row.reference_display),
        "reference_normalized": str(row.reference_normalized),
        "status": str(row.status),
        "status_reason": row.status_reason,
        "bank_event_id": row.bank_event_id,
        "trust_event_id": row.trust_event_id,
        "created_at": _iso(row.created_at),
        "meta": meta,
    }


def _rosca_expected_rows(
    db: Session,
    *,
    clan_id: int,
    cycle_id: Optional[str] = None,
    limit: int = 2000,
) -> List[ExpectedPayment]:
    rows = (
        db.query(ExpectedPayment)
        .filter(ExpectedPayment.clan_id == int(clan_id))
        .filter(ExpectedPayment.expected_type == "contribution")
        .order_by(ExpectedPayment.id.asc())
        .limit(max(1, min(int(limit or 2000), 5000)))
        .all()
    )
    out: List[ExpectedPayment] = []
    for row in rows:
        meta = _safe_meta(getattr(row, "meta_json", None))
        if meta.get("source") != ROSCA_SOURCE:
            continue
        if cycle_id and str(meta.get("rosca_cycle_id")) != str(cycle_id):
            continue
        out.append(row)
    return out


def _payout_events(
    db: Session,
    *,
    clan_id: int,
    cycle_id: Optional[str] = None,
) -> Dict[tuple[str, int], TrustEvent]:
    rows = (
        db.query(TrustEvent)
        .filter(TrustEvent.clan_id == int(clan_id))
        .filter(TrustEvent.event_type == ROSCA_EVENT_PAYOUT_RECORDED)
        .order_by(TrustEvent.id.asc())
        .all()
    )
    out: Dict[tuple[str, int], TrustEvent] = {}
    for row in rows:
        meta = _safe_meta(getattr(row, "meta_json", None))
        cid = str(meta.get("rosca_cycle_id") or "")
        if not cid:
            continue
        if cycle_id and cid != str(cycle_id):
            continue
        round_number = _safe_int(meta.get("round_number"), 0)
        if round_number <= 0:
            continue
        out[(cid, round_number)] = row
    return out


def _build_cycle_summary(
    *,
    cycle_id: str,
    rows: List[ExpectedPayment],
    payouts: Dict[tuple[str, int], TrustEvent],
) -> Dict[str, Any]:
    first_meta = _safe_meta(getattr(rows[0], "meta_json", None))
    rounds: List[Dict[str, Any]] = []
    by_round: Dict[int, List[ExpectedPayment]] = {}
    for row in rows:
        meta = _safe_meta(getattr(row, "meta_json", None))
        by_round.setdefault(_safe_int(meta.get("round_number"), 0), []).append(row)

    for round_number in sorted(k for k in by_round.keys() if k > 0):
        round_rows = by_round[round_number]
        meta = _safe_meta(getattr(round_rows[0], "meta_json", None))
        expected_count = len(round_rows)
        confirmed_count = sum(
            1 for row in round_rows if str(row.status).lower() == "confirmed"
        )
        payout_event = payouts.get((cycle_id, round_number))
        payout_recorded = payout_event is not None
        ready_for_payout = expected_count > 0 and confirmed_count == expected_count
        status = (
            "payout_recorded"
            if payout_recorded
            else "ready_for_payout"
            if ready_for_payout
            else "collecting"
        )
        rounds.append(
            {
                "round_number": round_number,
                "payout_user_id": _safe_int(meta.get("payout_user_id"), 0),
                "payout_amount": str(meta.get("payout_amount") or "0.00"),
                "due_at": meta.get("round_due_at"),
                "expected_count": expected_count,
                "confirmed_count": confirmed_count,
                "ready_for_payout": ready_for_payout,
                "payout_recorded": payout_recorded,
                "payout_recorded_at": _iso(getattr(payout_event, "created_at", None))
                if payout_event
                else None,
                "status": status,
                "contributions": [_expected_payment_out(row) for row in round_rows],
            }
        )

    total_expected = len(rows)
    total_confirmed = sum(1 for row in rows if str(row.status).lower() == "confirmed")
    total_payout_recorded = sum(1 for item in rounds if item["payout_recorded"])
    status = (
        "complete"
        if rounds and total_payout_recorded == len(rounds)
        else "payout_ready"
        if any(item["ready_for_payout"] and not item["payout_recorded"] for item in rounds)
        else "collecting"
    )

    return {
        "cycle_id": cycle_id,
        "title": first_meta.get("rosca_cycle_title") or "ROSCA cycle",
        "clan_id": _safe_int(first_meta.get("clan_id"), 0),
        "created_by_user_id": _safe_int(first_meta.get("created_by_user_id"), 0),
        "created_at": first_meta.get("created_at"),
        "currency": first_meta.get("currency") or "",
        "contribution_amount": str(first_meta.get("contribution_amount") or "0.00"),
        "member_user_ids": first_meta.get("member_user_ids") or [],
        "payout_order_user_ids": first_meta.get("payout_order_user_ids") or [],
        "interval_days": _safe_int(first_meta.get("interval_days"), 0),
        "total_rounds": len(rounds),
        "total_expected_contributions": total_expected,
        "total_confirmed_contributions": total_confirmed,
        "total_recorded_payouts": total_payout_recorded,
        "status": status,
        "engine_version": first_meta.get("engine_version") or ROSCA_ENGINE_VERSION,
        "rounds": rounds,
    }


def list_rosca_cycles(
    db: Session,
    *,
    clan_id: int,
    cycle_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    rows = _rosca_expected_rows(db, clan_id=int(clan_id), cycle_id=cycle_id)
    grouped: Dict[str, List[ExpectedPayment]] = {}
    for row in rows:
        meta = _safe_meta(getattr(row, "meta_json", None))
        cid = str(meta.get("rosca_cycle_id") or "")
        if cid:
            grouped.setdefault(cid, []).append(row)

    payouts = _payout_events(db, clan_id=int(clan_id), cycle_id=cycle_id)
    return [
        _build_cycle_summary(cycle_id=cid, rows=cycle_rows, payouts=payouts)
        for cid, cycle_rows in sorted(grouped.items())
    ]


def get_rosca_cycle(
    db: Session,
    *,
    clan_id: int,
    cycle_id: str,
) -> Optional[Dict[str, Any]]:
    cycles = list_rosca_cycles(db, clan_id=int(clan_id), cycle_id=str(cycle_id))
    return cycles[0] if cycles else None


def _obligation_status(row: ExpectedPayment) -> str:
    status = str(getattr(row, "status", "") or "").lower()
    due_at = _to_utc(getattr(row, "due_at", None))
    if status == "partial":
        return "partial"
    if due_at and due_at < _now_utc():
        return "behind"
    if due_at and due_at <= _now_utc() + timedelta(days=7):
        return "watch"
    return "on_track"


def _rosca_obligation_out(row: ExpectedPayment) -> Dict[str, Any]:
    meta = _safe_meta(getattr(row, "meta_json", None))
    status_group = _obligation_status(row)
    round_number = _safe_int(meta.get("round_number"), 0)
    cycle_id = str(meta.get("rosca_cycle_id") or "")
    title = str(meta.get("rosca_cycle_title") or "ROSCA cycle").strip()
    remaining = _d(getattr(row, "remaining_amount", None))
    amount = _d(getattr(row, "amount", None))
    due_at = _to_utc(getattr(row, "due_at", None))

    if status_group == "behind":
        simple_status = "This contribution is overdue and should be handled first."
    elif status_group == "partial":
        simple_status = "Part of this contribution has been matched; the balance is still due."
    elif status_group == "watch":
        simple_status = "This contribution is due soon."
    else:
        simple_status = "This contribution is scheduled and still open."

    return {
        "id": int(row.id),
        "kind": "rosca_contribution",
        "source": ROSCA_SOURCE,
        "clan_id": int(row.clan_id),
        "user_id": int(row.user_id),
        "cycle_id": cycle_id,
        "cycle_title": title,
        "round_number": round_number,
        "total_rounds": _safe_int(meta.get("total_rounds"), 0),
        "payout_user_id": _safe_int(meta.get("payout_user_id"), 0),
        "amount": str(amount),
        "currency": str(row.currency),
        "paid_amount": str(_d(getattr(row, "paid_amount", None))),
        "remaining_amount": str(remaining),
        "due_at": _iso(due_at),
        "reference_display": str(row.reference_display),
        "status": str(row.status),
        "status_group": status_group,
        "action_url": _money_in_url(
            clan_id=int(row.clan_id),
            expected_payment_id=int(row.id),
        ),
        "action_label": "Open Money In",
        "trust_event_source": "expected_payment",
        "writes_commitment_trust_event": False,
        "plain_language": simple_status,
    }


def list_my_rosca_obligations(
    db: Session,
    *,
    user_id: int,
    clan_id: Optional[int] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    query = (
        db.query(ExpectedPayment)
        .filter(ExpectedPayment.user_id == int(user_id))
        .filter(ExpectedPayment.expected_type == "contribution")
        .filter(ExpectedPayment.status.in_(sorted(ROSCA_ACTIVE_OBLIGATION_STATUSES)))
        .order_by(ExpectedPayment.due_at.asc(), ExpectedPayment.id.asc())
    )
    if clan_id:
        query = query.filter(ExpectedPayment.clan_id == int(clan_id))
    query = query.limit(max(1, min(int(limit or 50), 100)))

    obligations: List[Dict[str, Any]] = []
    for row in query.all():
        meta = _safe_meta(getattr(row, "meta_json", None))
        if meta.get("source") != ROSCA_SOURCE:
            continue
        obligations.append(_rosca_obligation_out(row))
    return obligations


def notify_rosca_contribution_confirmed(
    db: Session,
    *,
    exp: ExpectedPayment,
) -> Dict[str, Any]:
    meta = _safe_meta(getattr(exp, "meta_json", None))
    if meta.get("source") != ROSCA_SOURCE:
        return {"ok": True, "created": 0, "reason": "not_rosca"}

    cycle_id = str(meta.get("rosca_cycle_id") or "")
    round_number = _safe_int(meta.get("round_number"), 0)
    if not cycle_id or round_number <= 0:
        return {"ok": True, "created": 0, "reason": "missing_cycle_or_round"}

    created = 0
    title = str(meta.get("rosca_cycle_title") or "ROSCA cycle").strip()
    created += int(
        _notify_once(
            db,
            user_id=int(exp.user_id),
            kind="rosca.contribution_confirmed",
            title="ROSCA contribution confirmed",
            message=(
                f"Your {title} contribution for round {round_number} has been "
                "matched from Money In. Focus now treats this item as handled."
            ),
            action_url=_dashboard_focus_url(
                cycle_id=cycle_id,
                round_number=round_number,
            ),
            action_label="Open Focus",
        )
    )

    round_rows = _rosca_expected_rows(
        db,
        clan_id=int(exp.clan_id),
        cycle_id=cycle_id,
        limit=5000,
    )
    current_round_rows: List[ExpectedPayment] = []
    for row in round_rows:
        row_meta = _safe_meta(getattr(row, "meta_json", None))
        if _safe_int(row_meta.get("round_number"), 0) == round_number:
            current_round_rows.append(row)

    all_confirmed = bool(current_round_rows) and all(
        str(row.status).lower() == "confirmed" for row in current_round_rows
    )
    payout_recorded = (cycle_id, round_number) in _payout_events(
        db,
        clan_id=int(exp.clan_id),
        cycle_id=cycle_id,
    )
    if all_confirmed and not payout_recorded:
        payout_user_id = _safe_int(meta.get("payout_user_id"), 0)
        recipients = _admin_member_ids(db, clan_id=int(exp.clan_id))
        if payout_user_id > 0:
            recipients.append(payout_user_id)
        for recipient_user_id in dict.fromkeys(recipients):
            created += int(
                _notify_once(
                    db,
                    user_id=int(recipient_user_id),
                    kind="rosca.round_ready",
                    title="ROSCA payout ready",
                    message=(
                        f"All {title} contributions for round {round_number} are "
                        "confirmed. The community can now record the payout."
                    ),
                    action_url=_shop_control_url(
                        clan_id=int(exp.clan_id),
                        cycle_id=cycle_id,
                        round_number=round_number,
                    ),
                    action_label="Record payout",
                )
            )

    return {"ok": True, "created": created}


def create_rosca_cycle(
    db: Session,
    *,
    clan_id: int,
    created_by_user_id: int,
    contribution_amount: Any,
    currency: str,
    title: Optional[str] = None,
    member_user_ids: Optional[Iterable[int]] = None,
    payout_order_user_ids: Optional[Iterable[int]] = None,
    start_at: Optional[datetime] = None,
    interval_days: int = 30,
    note: Optional[str] = None,
) -> Dict[str, Any]:
    amount = _d(contribution_amount)
    if amount <= Decimal("0.00"):
        raise ValueError("contribution_amount must be > 0")

    days = max(1, int(interval_days or 30))
    members = _validate_member_set(
        db,
        clan_id=int(clan_id),
        member_user_ids=member_user_ids,
    )
    if payout_order_user_ids is None:
        payout_order, payout_order_policy = _trust_ranked_payout_order(
            db,
            member_user_ids=members,
        )
    else:
        payout_order = _validate_payout_order(
            member_user_ids=members,
            payout_order_user_ids=payout_order_user_ids,
        )
        payout_order_policy = {
            "payout_order_strategy": "explicit_admin_order",
            "trust_scores_by_user_id": {},
            "tie_breaker": None,
        }

    token = _cycle_token()
    cycle_id = _cycle_id(clan_id=int(clan_id), token=token)
    starts = start_at or _now_utc()
    if starts.tzinfo is None:
        starts = starts.replace(tzinfo=timezone.utc)
    ccy = _ccy(currency)
    payout_amount = amount * Decimal(len(members))
    cleaned_title = (title or "ROSCA cycle").strip()[:120] or "ROSCA cycle"

    active_service_quantity = get_active_feature_quantity(
        db,
        owner_user_id=int(created_by_user_id),
        feature_code=FEATURE_ROSCA_CYCLE,
        shop_id=None,
        clan_id=int(clan_id),
    )
    if int(active_service_quantity) <= 0:
        raise ValueError("No active ROSCA yearly service is available")

    expected_ids: List[int] = []
    pool_event_ids: List[int] = []

    for round_index, payout_user_id in enumerate(payout_order, start=1):
        due_at = starts + timedelta(days=days * (round_index - 1))
        for contributor_user_id in members:
            ref = _reference(
                clan_id=int(clan_id),
                token=token,
                round_number=round_index,
                user_id=int(contributor_user_id),
            )
            pool_event = PoolEvent(
                clan_id=int(clan_id),
                user_id=int(contributor_user_id),
                event_type="deposit.requested",
                amount=amount,
                currency=ccy,
                reference=ref,
                note=(
                    f"ROSCA contribution: {cleaned_title}; "
                    f"round {round_index}; payout user {int(payout_user_id)}"
                ),
                created_at=_now_utc(),
                confirmed_at=None,
                confirmed_by_user_id=None,
            )
            db.add(pool_event)
            db.flush()
            pool_event_ids.append(int(pool_event.id))

            expected = create_expected_payment(
                db,
                clan_id=int(clan_id),
                user_id=int(contributor_user_id),
                expected_type="contribution",
                amount=amount,
                currency=ccy,
                reference_display=ref,
                due_at=due_at,
                meta={
                    "source": ROSCA_SOURCE,
                    "engine_version": ROSCA_ENGINE_VERSION,
                    "rosca_cycle_id": cycle_id,
                    "rosca_cycle_title": cleaned_title,
                    "round_number": round_index,
                    "round_due_at": due_at.isoformat(),
                    "total_rounds": len(payout_order),
                    "clan_id": int(clan_id),
                    "created_by_user_id": int(created_by_user_id),
                    "created_at": starts.isoformat(),
                    "member_user_ids": members,
                    "payout_order_user_ids": payout_order,
                    "payout_order_policy": payout_order_policy,
                    "contributor_user_id": int(contributor_user_id),
                    "payout_user_id": int(payout_user_id),
                    "contribution_amount": str(amount),
                    "payout_amount": str(payout_amount),
                    "currency": ccy,
                    "interval_days": days,
                    "pool_event_id": int(pool_event.id),
                    "package_feature_code": FEATURE_ROSCA_CYCLE,
                    "package_pricing_model": "annual_service",
                    "service_access_active": True,
                    "service_units_consumed": 0,
                    "note": note,
                },
                commit=False,
                refresh=True,
            )
            expected_ids.append(int(expected.id))

    log_trust_event(
        db,
        event_type=ROSCA_EVENT_STARTED,
        clan_id=int(clan_id),
        actor_user_id=int(created_by_user_id),
        subject_user_id=int(created_by_user_id),
        meta={
            "reason": "rosca_cycle_started",
            "source": ROSCA_SOURCE,
            "engine_version": ROSCA_ENGINE_VERSION,
            "rosca_cycle_id": cycle_id,
            "title": cleaned_title,
            "member_user_ids": members,
            "payout_order_user_ids": payout_order,
            "payout_order_policy": payout_order_policy,
            "contribution_amount": str(amount),
            "payout_amount": str(payout_amount),
            "currency": ccy,
            "total_rounds": len(payout_order),
            "expected_payment_count": len(expected_ids),
            "pool_event_count": len(pool_event_ids),
            "package_feature_code": FEATURE_ROSCA_CYCLE,
            "package_pricing_model": "annual_service",
            "service_access_active": True,
            "service_units_consumed": 0,
            "active_service_quantity": int(active_service_quantity),
        },
        dedupe_key=f"rosca:start:{cycle_id}",
        commit=False,
        refresh=False,
    )

    for member_user_id in members:
        _notify_once(
            db,
            user_id=int(member_user_id),
            kind="rosca.cycle_started",
            title="ROSCA cycle started",
            message=(
                f"{cleaned_title} has started. Your {ccy} {amount} "
                "contribution references are now visible in Focus and Money In."
            ),
            action_url=_dashboard_focus_url(cycle_id=cycle_id),
            action_label="Open Focus",
        )

    db.commit()
    return get_rosca_cycle(db, clan_id=int(clan_id), cycle_id=cycle_id) or {
        "cycle_id": cycle_id,
        "status": "created",
    }


def record_rosca_payout(
    db: Session,
    *,
    clan_id: int,
    cycle_id: str,
    round_number: int,
    actor_user_id: int,
    note: Optional[str] = None,
) -> Dict[str, Any]:
    cycle = get_rosca_cycle(db, clan_id=int(clan_id), cycle_id=str(cycle_id))
    if not cycle:
        raise ValueError("ROSCA cycle not found")

    target_round = None
    for item in cycle.get("rounds") or []:
        if _safe_int(item.get("round_number"), 0) == int(round_number):
            target_round = item
            break

    if not target_round:
        raise ValueError("ROSCA round not found")

    if not bool(target_round.get("ready_for_payout")):
        raise ValueError("All round contributions must be confirmed before payout is recorded")

    if bool(target_round.get("payout_recorded")):
        return cycle

    payout_user_id = _safe_int(target_round.get("payout_user_id"), 0)
    if payout_user_id <= 0:
        raise ValueError("ROSCA round is missing a payout user")

    log_trust_event(
        db,
        event_type=ROSCA_EVENT_PAYOUT_RECORDED,
        clan_id=int(clan_id),
        actor_user_id=int(actor_user_id),
        subject_user_id=int(payout_user_id),
        meta={
            "reason": "rosca_round_payout_recorded",
            "source": ROSCA_SOURCE,
            "engine_version": ROSCA_ENGINE_VERSION,
            "rosca_cycle_id": str(cycle_id),
            "round_number": int(round_number),
            "payout_user_id": int(payout_user_id),
            "payout_amount": str(target_round.get("payout_amount") or "0.00"),
            "currency": str(cycle.get("currency") or ""),
            "expected_count": _safe_int(target_round.get("expected_count"), 0),
            "confirmed_count": _safe_int(target_round.get("confirmed_count"), 0),
            "note": note,
            "external_money_moved_by_gsn": False,
        },
        dedupe_key=f"rosca:payout:{cycle_id}:round:{int(round_number)}",
        commit=False,
        refresh=False,
    )

    _notify_once(
        db,
        user_id=int(payout_user_id),
        kind="rosca.payout_recorded",
        title="ROSCA payout recorded",
        message=(
            f"Round {int(round_number)} payout for {cycle.get('title') or 'ROSCA cycle'} "
            "has been recorded as completed. GSN recorded the evidence but did not move external money."
        ),
        action_url=_dashboard_focus_url(
            cycle_id=str(cycle_id),
            round_number=int(round_number),
        ),
        action_label="Open Focus",
    )

    db.commit()

    return get_rosca_cycle(db, clan_id=int(clan_id), cycle_id=str(cycle_id)) or cycle
