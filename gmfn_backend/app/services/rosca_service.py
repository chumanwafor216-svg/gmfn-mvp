from __future__ import annotations

import json
import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, Iterable, List, Optional

from sqlalchemy.orm import Session

from app.db.bank_models import ExpectedPayment
from app.db.models import ClanMembership, PoolEvent, TrustEvent
from app.services.expected_payments_service import create_expected_payment
from app.services.feature_entitlements_service import consume_feature_units
from app.services.payment_instruction_service import FEATURE_ROSCA_CYCLE
from app.services.trust_events_services import log_trust_event


ROSCA_ENGINE_VERSION = "rosca_cycle_engine_v1"
ROSCA_SOURCE = "rosca.cycle"
ROSCA_EVENT_STARTED = "rosca.cycle.started"
ROSCA_EVENT_PAYOUT_RECORDED = "rosca.round.payout_recorded"


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
    payout_order = _validate_payout_order(
        member_user_ids=members,
        payout_order_user_ids=payout_order_user_ids,
    )

    token = _cycle_token()
    cycle_id = _cycle_id(clan_id=int(clan_id), token=token)
    starts = start_at or _now_utc()
    if starts.tzinfo is None:
        starts = starts.replace(tzinfo=timezone.utc)
    ccy = _ccy(currency)
    payout_amount = amount * Decimal(len(members))
    cleaned_title = (title or "ROSCA cycle").strip()[:120] or "ROSCA cycle"

    consume_result = consume_feature_units(
        db,
        owner_user_id=int(created_by_user_id),
        feature_code=FEATURE_ROSCA_CYCLE,
        units=1,
        clan_id=int(clan_id),
        reference_key=cycle_id,
        note=note or f"ROSCA cycle started: {cleaned_title}",
        commit=False,
    )
    if not bool(consume_result.get("ok")):
        db.rollback()
        raise ValueError("No active ROSCA package credit is available")

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
                    "contributor_user_id": int(contributor_user_id),
                    "payout_user_id": int(payout_user_id),
                    "contribution_amount": str(amount),
                    "payout_amount": str(payout_amount),
                    "currency": ccy,
                    "interval_days": days,
                    "pool_event_id": int(pool_event.id),
                    "package_feature_code": FEATURE_ROSCA_CYCLE,
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
            "contribution_amount": str(amount),
            "payout_amount": str(payout_amount),
            "currency": ccy,
            "total_rounds": len(payout_order),
            "expected_payment_count": len(expected_ids),
            "pool_event_count": len(pool_event_ids),
            "feature_consumed": consume_result,
        },
        dedupe_key=f"rosca:start:{cycle_id}",
        commit=False,
        refresh=False,
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
        commit=True,
        refresh=False,
    )

    return get_rosca_cycle(db, clan_id=int(clan_id), cycle_id=str(cycle_id)) or cycle
