from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timezone
from decimal import Decimal
import json
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

from sqlalchemy import String, cast, false, or_
from sqlalchemy.orm import Session

from app.db.models import ClanMembership, Loan, LoanGuarantor, TrustEvent, User
from app.services.cci_service import compute_cci_from_summary


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _safe_str(value: Any, default: str = "") -> str:
    if value is None:
        return default
    s = str(value).strip()
    return s if s else default


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _safe_decimal(value: Any, default: str = "0") -> Decimal:
    try:
        if isinstance(value, Decimal):
            return value
        return Decimal(str(value))
    except Exception:
        return Decimal(default)


def _q2(value: Any) -> Decimal:
    return _safe_decimal(value).quantize(Decimal("0.01"))


def _aware_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _iso(dt: Optional[datetime]) -> Optional[str]:
    safe_dt = _aware_utc(dt)
    return safe_dt.isoformat() if safe_dt else None


def _user_id_text_match(column: Any, user_id: int):
    # Live pilot schemas have carried a few user-id references as text even
    # where the model declares int. Text-cast avoids Postgres varchar=int errors.
    return cast(column, String) == str(int(user_id))


def _user_id_text_in(column: Any, user_ids: Iterable[int]):
    ids = [str(int(user_id)) for user_id in user_ids]
    return cast(column, String).in_(ids) if ids else false()


def _parse_meta(event: TrustEvent) -> Dict[str, Any]:
    """
    Supports either:
    - event.meta as dict
    - event.meta as JSON string
    - event.meta_json as dict/string (legacy fallback)
    """
    raw = None

    if hasattr(event, "meta"):
        raw = getattr(event, "meta", None)

    if raw in (None, "") and hasattr(event, "meta_json"):
        raw = getattr(event, "meta_json", None)

    if raw is None:
        return {}

    if isinstance(raw, dict):
        return raw

    if isinstance(raw, str):
        try:
            data = json.loads(raw)
            return data if isinstance(data, dict) else {}
        except Exception:
            return {}

    return {}


def _user_node_id(user_id: int) -> str:
    return f"user:{int(user_id)}"


def _clan_node_id(clan_id: int) -> str:
    return f"clan:{int(clan_id)}"


EDGE_INVITED_BY = "invited_by"
EDGE_SUCCESSFULLY_ONBOARDED = "successfully_onboarded"
EDGE_GUARANTEED = "guaranteed"
EDGE_REPAID_WITH_SUPPORT = "repaid_with_support"
EDGE_REPAYMENT_DELAY = "repayment_delay"
EDGE_DEFAULT_AFFECTED = "default_affected"
EDGE_CO_MEMBERSHIP = "co_membership"

EDGE_WEIGHTS: Dict[str, Decimal] = {
    EDGE_INVITED_BY: Decimal("0.12"),
    EDGE_SUCCESSFULLY_ONBOARDED: Decimal("0.35"),
    EDGE_GUARANTEED: Decimal("0.75"),
    EDGE_REPAID_WITH_SUPPORT: Decimal("1.00"),
    EDGE_REPAYMENT_DELAY: Decimal("-0.35"),
    EDGE_DEFAULT_AFFECTED: Decimal("-0.90"),
    EDGE_CO_MEMBERSHIP: Decimal("0.05"),
}

EDGE_CONFIDENCE: Dict[str, Decimal] = {
    EDGE_INVITED_BY: Decimal("0.90"),
    EDGE_SUCCESSFULLY_ONBOARDED: Decimal("0.95"),
    EDGE_GUARANTEED: Decimal("1.00"),
    EDGE_REPAID_WITH_SUPPORT: Decimal("1.00"),
    EDGE_REPAYMENT_DELAY: Decimal("0.95"),
    EDGE_DEFAULT_AFFECTED: Decimal("1.00"),
    EDGE_CO_MEMBERSHIP: Decimal("0.90"),
}

EDGE_LABELS: Dict[str, str] = {
    EDGE_INVITED_BY: "Invited By",
    EDGE_SUCCESSFULLY_ONBOARDED: "Successfully Onboarded",
    EDGE_GUARANTEED: "Guaranteed",
    EDGE_REPAID_WITH_SUPPORT: "Repaid With Support",
    EDGE_REPAYMENT_DELAY: "Repayment Delay",
    EDGE_DEFAULT_AFFECTED: "Default Affected",
    EDGE_CO_MEMBERSHIP: "Co-Membership",
}


def _matches_any(event_type: str, patterns: Iterable[str]) -> bool:
    return any(p in event_type for p in patterns)


def _event_type_lower(event: TrustEvent) -> str:
    return _safe_str(getattr(event, "event_type", None)).lower()


def _extract_common_ids(event: TrustEvent, meta: Dict[str, Any]) -> Dict[str, int]:
    actor_user_id = _safe_int(getattr(event, "actor_user_id", None))
    subject_user_id = _safe_int(getattr(event, "subject_user_id", None))

    borrower_user_id = (
        _safe_int(meta.get("borrower_user_id"))
        or _safe_int(meta.get("owner_user_id"))
        or _safe_int(meta.get("member_user_id"))
        or 0
    )

    guarantor_user_id = (
        _safe_int(meta.get("guarantor_user_id"))
        or _safe_int(meta.get("sponsor_user_id"))
        or _safe_int(meta.get("affected_user_id"))
        or actor_user_id
    )

    affected_user_id = (
        _safe_int(meta.get("affected_user_id"))
        or _safe_int(meta.get("impacted_user_id"))
        or 0
    )

    inviter_user_id = (
        _safe_int(meta.get("inviter_user_id"))
        or _safe_int(meta.get("created_by_user_id"))
        or actor_user_id
    )

    joiner_user_id = (
        _safe_int(meta.get("joiner_user_id"))
        or _safe_int(meta.get("new_user_id"))
        or _safe_int(meta.get("member_user_id"))
        or subject_user_id
    )

    return {
        "actor_user_id": actor_user_id,
        "subject_user_id": subject_user_id,
        "borrower_user_id": borrower_user_id,
        "guarantor_user_id": guarantor_user_id,
        "affected_user_id": affected_user_id,
        "inviter_user_id": inviter_user_id,
        "joiner_user_id": joiner_user_id,
    }


def _is_invite_event(event_type: str) -> bool:
    return _matches_any(
        event_type,
        [
            "invite_sent",
            "invite_created",
            "clan_invite_created",
            "member_invited",
            "invite_link_created",
        ],
    )


def _is_successful_onboarding_event(event_type: str) -> bool:
    return _matches_any(
        event_type,
        [
            "join_accepted",
            "joined_via_invite",
            "successful_onboarding",
            "member_joined",
            "invite_join_completed",
            "joined_clan",
            "invite_accepted",
        ],
    )


def _is_guarantee_event(event_type: str) -> bool:
    if event_type == "guarantee_given":
        return True
    return _matches_any(
        event_type,
        [
            "guarantor_approved",
            "guarantee_approved",
            "guarantee_locked",
            "guarantee_provided",
            "loan_guaranteed",
            "incoming_guarantor_approved",
            "guarantor_request_approved",
        ],
    )


def _is_repayment_event(event_type: str) -> bool:
    if event_type == "loan_repaid":
        return True
    return event_type in {
        "repayment_confirmed",
        "full_repayment",
        "repayment_completed",
        "repayment_verified",
        "loan_repayment_confirmed",
        "full_repayment_confirmed",
        "loan.repaid",
    }


def _is_repayment_delay_event(event_type: str) -> bool:
    return _matches_any(
        event_type,
        [
            "repayment_late",
            "repayment_delayed",
            "missed_repayment",
            "overdue_repayment",
            "repayment_default_warning",
            "guarantor_expired",
        ],
    )


def _is_default_pressure_event(event_type: str) -> bool:
    if event_type == "loan_defaulted":
        return True
    return _matches_any(
        event_type,
        [
            "default_affected",
            "guarantor_impacted",
            "default_penalty",
            "borrower_default",
            "loan_written_off",
        ],
    )


def _make_user_node(user: User, active_clan_ids: List[int], is_root: bool = False) -> Dict[str, Any]:
    return {
        "node_type": "user",
        "node_id": _user_node_id(int(user.id)),
        "user_id": int(user.id),
        "gmfn_id": getattr(user, "gmfn_id", None),
        "display_label": _safe_str(getattr(user, "email", None), f"user:{int(user.id)}"),
        "phone_verified": bool(
            getattr(user, "phone_e164", None) and getattr(user, "phone_verified_at", None)
        ),
        "active_clan_ids": sorted({int(x) for x in active_clan_ids}),
        "created_at": _iso(getattr(user, "created_at", None)),
        "is_root": is_root,
    }


def _make_clan_node(clan_id: int) -> Dict[str, Any]:
    return {
        "node_type": "clan",
        "node_id": _clan_node_id(int(clan_id)),
        "clan_id": int(clan_id),
        "display_label": f"Community {int(clan_id)}",
        "created_at": None,
    }


def _build_edge(
    *,
    edge_type: str,
    source_node_id: str,
    target_node_id: str,
    clan_id: Optional[int],
    loan_id: Optional[int],
    event_id: Optional[int],
    created_at: Optional[datetime],
    directional: bool = True,
    meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    return {
        "edge_type": edge_type,
        "edge_label": EDGE_LABELS[edge_type],
        "source_node_id": source_node_id,
        "target_node_id": target_node_id,
        "clan_id": clan_id,
        "loan_id": loan_id,
        "event_id": event_id,
        "created_at": _aware_utc(created_at),
        "directional": directional,
        "weight": EDGE_WEIGHTS[edge_type],
        "confidence": EDGE_CONFIDENCE[edge_type],
        "meta": meta or {},
    }


def _loan_borrower_user_id(db: Session, loan_id: Optional[int]) -> int:
    if not loan_id:
        return 0
    loan = db.get(Loan, int(loan_id))
    if not loan:
        return 0
    return _safe_int(getattr(loan, "borrower_user_id", None), 0)


def _loan_guarantor_user_ids(db: Session, loan_id: Optional[int]) -> List[int]:
    if not loan_id:
        return []

    rows = (
        db.query(LoanGuarantor)
        .filter(LoanGuarantor.loan_id == int(loan_id))
        .filter(LoanGuarantor.status == "approved")
        .all()
    )

    out: List[int] = []
    seen: Set[int] = set()

    for row in rows:
        uid = _safe_int(getattr(row, "guarantor_user_id", None), 0)
        if uid > 0 and uid not in seen:
            seen.add(uid)
            out.append(uid)

    return out


def _resolve_borrower_user_id(
    db: Session,
    *,
    explicit_borrower_user_id: int,
    loan_id: Optional[int],
) -> int:
    loan_borrower_user_id = _loan_borrower_user_id(db, loan_id)

    if loan_borrower_user_id > 0:
        return loan_borrower_user_id

    if explicit_borrower_user_id > 0:
        return explicit_borrower_user_id

    return 0


def _resolve_guarantor_user_ids(
    db: Session,
    *,
    explicit_guarantor_user_id: int,
    loan_id: Optional[int],
) -> List[int]:
    if explicit_guarantor_user_id > 0:
        return [explicit_guarantor_user_id]
    return _loan_guarantor_user_ids(db, loan_id)


def _extract_edges_from_event(db: Session, event: TrustEvent) -> List[Dict[str, Any]]:
    event_type = _event_type_lower(event)
    clan_id = _safe_int(getattr(event, "clan_id", None), 0) or None

    raw_loan_id = _safe_int(getattr(event, "loan_id", None), 0)
    loan_id = raw_loan_id if raw_loan_id > 0 else None

    event_id = _safe_int(getattr(event, "id", None), 0) or None
    created_at = _aware_utc(getattr(event, "created_at", None))
    meta = _parse_meta(event)
    ids = _extract_common_ids(event, meta)

    edges: List[Dict[str, Any]] = []

    if _is_invite_event(event_type):
        inviter_id = ids["inviter_user_id"]
        joiner_id = ids["joiner_user_id"]
        if inviter_id > 0 and joiner_id > 0 and inviter_id != joiner_id:
            edges.append(
                _build_edge(
                    edge_type=EDGE_INVITED_BY,
                    source_node_id=_user_node_id(inviter_id),
                    target_node_id=_user_node_id(joiner_id),
                    clan_id=clan_id,
                    loan_id=loan_id,
                    event_id=event_id,
                    created_at=created_at,
                    meta={"reason": "invite_created"},
                )
            )

    if _is_successful_onboarding_event(event_type):
        inviter_id = ids["inviter_user_id"]
        joiner_id = ids["joiner_user_id"]
        if inviter_id > 0 and joiner_id > 0 and inviter_id != joiner_id:
            edges.append(
                _build_edge(
                    edge_type=EDGE_SUCCESSFULLY_ONBOARDED,
                    source_node_id=_user_node_id(inviter_id),
                    target_node_id=_user_node_id(joiner_id),
                    clan_id=clan_id,
                    loan_id=loan_id,
                    event_id=event_id,
                    created_at=created_at,
                    meta={"reason": "successful_onboarding"},
                )
            )
            edges.append(
                _build_edge(
                    edge_type=EDGE_SUCCESSFULLY_ONBOARDED,
                    source_node_id=_user_node_id(joiner_id),
                    target_node_id=_user_node_id(inviter_id),
                    clan_id=clan_id,
                    loan_id=loan_id,
                    event_id=event_id,
                    created_at=created_at,
                    meta={"reason": "onboarding_reciprocity"},
                )
            )

    if _is_guarantee_event(event_type):
        guarantor_ids = _resolve_guarantor_user_ids(
            db,
            explicit_guarantor_user_id=ids["guarantor_user_id"],
            loan_id=loan_id,
        )
        borrower_id = _resolve_borrower_user_id(
            db,
            explicit_borrower_user_id=ids["borrower_user_id"],
            loan_id=loan_id,
        )

        for guarantor_id in guarantor_ids:
            if guarantor_id > 0 and borrower_id > 0 and guarantor_id != borrower_id:
                edges.append(
                    _build_edge(
                        edge_type=EDGE_GUARANTEED,
                        source_node_id=_user_node_id(guarantor_id),
                        target_node_id=_user_node_id(borrower_id),
                        clan_id=clan_id,
                        loan_id=loan_id,
                        event_id=event_id,
                        created_at=created_at,
                        meta={"reason": "loan_guarantee"},
                    )
                )

    if _is_repayment_event(event_type):
        borrower_id = _resolve_borrower_user_id(
            db,
            explicit_borrower_user_id=ids["borrower_user_id"],
            loan_id=loan_id,
        )
        guarantor_ids = _resolve_guarantor_user_ids(
            db,
            explicit_guarantor_user_id=ids["guarantor_user_id"],
            loan_id=loan_id,
        )

        for guarantor_id in guarantor_ids:
            if borrower_id > 0 and guarantor_id > 0 and borrower_id != guarantor_id:
                edges.append(
                    _build_edge(
                        edge_type=EDGE_REPAID_WITH_SUPPORT,
                        source_node_id=_user_node_id(borrower_id),
                        target_node_id=_user_node_id(guarantor_id),
                        clan_id=clan_id,
                        loan_id=loan_id,
                        event_id=event_id,
                        created_at=created_at,
                        meta={"reason": "repaid_with_support"},
                    )
                )
                edges.append(
                    _build_edge(
                        edge_type=EDGE_REPAID_WITH_SUPPORT,
                        source_node_id=_user_node_id(guarantor_id),
                        target_node_id=_user_node_id(borrower_id),
                        clan_id=clan_id,
                        loan_id=loan_id,
                        event_id=event_id,
                        created_at=created_at,
                        meta={"reason": "guarantee_proved_good"},
                    )
                )

    if _is_repayment_delay_event(event_type):
        borrower_id = _resolve_borrower_user_id(
            db,
            explicit_borrower_user_id=ids["borrower_user_id"],
            loan_id=loan_id,
        )
        guarantor_ids = _resolve_guarantor_user_ids(
            db,
            explicit_guarantor_user_id=(ids["guarantor_user_id"] or ids["affected_user_id"]),
            loan_id=loan_id,
        )

        for guarantor_id in guarantor_ids:
            if borrower_id > 0 and guarantor_id > 0 and borrower_id != guarantor_id:
                edges.append(
                    _build_edge(
                        edge_type=EDGE_REPAYMENT_DELAY,
                        source_node_id=_user_node_id(borrower_id),
                        target_node_id=_user_node_id(guarantor_id),
                        clan_id=clan_id,
                        loan_id=loan_id,
                        event_id=event_id,
                        created_at=created_at,
                        meta={"reason": "repayment_delay"},
                    )
                )

    if _is_default_pressure_event(event_type):
        borrower_id = _resolve_borrower_user_id(
            db,
            explicit_borrower_user_id=ids["borrower_user_id"],
            loan_id=loan_id,
        )
        affected_ids = _resolve_guarantor_user_ids(
            db,
            explicit_guarantor_user_id=(ids["affected_user_id"] or ids["guarantor_user_id"]),
            loan_id=loan_id,
        )

        for affected_id in affected_ids:
            if borrower_id > 0 and affected_id > 0 and borrower_id != affected_id:
                edges.append(
                    _build_edge(
                        edge_type=EDGE_DEFAULT_AFFECTED,
                        source_node_id=_user_node_id(borrower_id),
                        target_node_id=_user_node_id(affected_id),
                        clan_id=clan_id,
                        loan_id=loan_id,
                        event_id=event_id,
                        created_at=created_at,
                        meta={"reason": "default_pressure"},
                    )
                )

    return edges


def _recency_bucket(last_seen_at: Optional[datetime]) -> str:
    safe_dt = _aware_utc(last_seen_at)
    if safe_dt is None:
        return "historical"

    age_days = (_now_utc() - safe_dt).days
    if age_days <= 30:
        return "recent"
    if age_days <= 180:
        return "active"
    return "historical"


def _aggregate_edges(raw_edges: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    grouped: Dict[Tuple[str, str, str, int, int], Dict[str, Any]] = {}

    for edge in raw_edges:
        edge_type = _safe_str(edge.get("edge_type"))
        source_node_id = _safe_str(edge.get("source_node_id"))
        target_node_id = _safe_str(edge.get("target_node_id"))
        clan_id = _safe_int(edge.get("clan_id"), 0)
        loan_id = _safe_int(edge.get("loan_id"), 0)

        key = (
            edge_type,
            source_node_id,
            target_node_id,
            clan_id,
            loan_id,
        )

        if key not in grouped:
            grouped[key] = {
                "edge_type": edge_type,
                "edge_label": EDGE_LABELS.get(edge_type, edge_type),
                "source_node_id": source_node_id,
                "target_node_id": target_node_id,
                "clan_id": clan_id,
                "loan_id": loan_id,
                "directional": bool(edge.get("directional", True)),
                "weight": _safe_decimal(edge.get("weight")),
                "confidence": _safe_decimal(edge.get("confidence"), "1"),
                "supporting_event_ids": [],
                "event_count": 0,
                "first_seen_at": edge.get("created_at"),
                "last_seen_at": edge.get("created_at"),
                "meta_reasons": set(),
            }

        row = grouped[key]
        row["event_count"] += 1

        event_id = _safe_int(edge.get("event_id"), 0)
        if event_id > 0 and event_id not in row["supporting_event_ids"]:
            row["supporting_event_ids"].append(event_id)

        created_at = _aware_utc(edge.get("created_at"))
        if created_at is not None:
            if row["first_seen_at"] is None or created_at < row["first_seen_at"]:
                row["first_seen_at"] = created_at
            if row["last_seen_at"] is None or created_at > row["last_seen_at"]:
                row["last_seen_at"] = created_at

        edge_meta = dict(edge.get("meta") or {})
        reason = _safe_str(edge_meta.get("reason"))
        if reason:
            row["meta_reasons"].add(reason)

    finalized: List[Dict[str, Any]] = []

    for row in grouped.values():
        edge_type = _safe_str(row["edge_type"])
        source_node_id = _safe_str(row["source_node_id"])
        target_node_id = _safe_str(row["target_node_id"])
        clan_id = row["clan_id"]
        loan_id = row["loan_id"]

        edge_id = (
            f"{edge_type}:"
            f"{source_node_id}:"
            f"{target_node_id}:"
            f"clan:{clan_id or 0}:"
            f"loan:{loan_id or 0}"
        )

        if edge_type in {EDGE_DEFAULT_AFFECTED, EDGE_REPAYMENT_DELAY}:
            status = "stressed"
        else:
            status = _recency_bucket(row["last_seen_at"])

        finalized.append(
            {
                "edge_id": edge_id,
                "edge_type": edge_type,
                "edge_label": row["edge_label"],
                "source_node_id": source_node_id,
                "target_node_id": target_node_id,
                "clan_id": clan_id or None,
                "loan_id": loan_id or None,
                "weight": str(_q2(row["weight"])),
                "confidence": str(_q2(row["confidence"])),
                "directional": bool(row["directional"]),
                "status": status,
                "event_count": int(row["event_count"]),
                "first_seen_at": _iso(row["first_seen_at"]),
                "last_seen_at": _iso(row["last_seen_at"]),
                "supporting_event_ids": sorted(row["supporting_event_ids"]),
                "meta": {
                    "reasons": sorted(row["meta_reasons"]),
                },
            }
        )

    finalized.sort(
        key=lambda x: (
            _safe_str(x.get("edge_type")),
            _safe_str(x.get("source_node_id")),
            _safe_str(x.get("target_node_id")),
            _safe_int(x.get("clan_id")),
            _safe_int(x.get("loan_id")),
        )
    )
    return finalized


def _build_summary(
    *,
    root_user_id: int,
    active_clan_ids: List[int],
    edges: List[Dict[str, Any]],
) -> Dict[str, Any]:
    root_node_id = _user_node_id(root_user_id)

    connected_users: Set[int] = set()
    sponsor_users: Set[int] = set()
    guarantor_users: Set[int] = set()

    support_given_count = 0
    guarantees_given_count = 0
    borrower_support_count = 0
    funds_mobilised_loans: Set[int] = set()

    successful_repayment_edges = 0
    repayment_delay_edges = 0
    default_pressure_edges = 0

    positive_sum = Decimal("0")
    negative_sum = Decimal("0")

    edge_type_counts = Counter()
    stressed_edges = 0
    recent_edges = 0
    historical_edges = 0

    cross_clan_positive_counterparties: Set[int] = set()

    for edge in edges:
        edge_type = _safe_str(edge.get("edge_type"))
        source_node_id = _safe_str(edge.get("source_node_id"))
        target_node_id = _safe_str(edge.get("target_node_id"))
        weight = _safe_decimal(edge.get("weight"))
        status = _safe_str(edge.get("status"))
        clan_id = _safe_int(edge.get("clan_id"), 0)
        loan_id = _safe_int(edge.get("loan_id"), 0)

        edge_type_counts[edge_type] += 1

        if status == "stressed":
            stressed_edges += 1
        elif status == "recent":
            recent_edges += 1
        elif status == "historical":
            historical_edges += 1

        if source_node_id.startswith("user:") and source_node_id != root_node_id:
            source_uid = _safe_int(source_node_id.split(":")[1])
            connected_users.add(source_uid)
            if weight > Decimal("0") and clan_id > 0:
                cross_clan_positive_counterparties.add(source_uid)

        if target_node_id.startswith("user:") and target_node_id != root_node_id:
            target_uid = _safe_int(target_node_id.split(":")[1])
            connected_users.add(target_uid)
            if weight > Decimal("0") and clan_id > 0:
                cross_clan_positive_counterparties.add(target_uid)

        if target_node_id == root_node_id and edge_type in {
            EDGE_INVITED_BY,
            EDGE_SUCCESSFULLY_ONBOARDED,
            EDGE_GUARANTEED,
        }:
            sponsor_users.add(_safe_int(source_node_id.split(":")[1]))

        if target_node_id == root_node_id and edge_type == EDGE_GUARANTEED:
            guarantor_users.add(_safe_int(source_node_id.split(":")[1]))

        if edge_type == EDGE_REPAID_WITH_SUPPORT and (
            source_node_id == root_node_id or target_node_id == root_node_id
        ):
            successful_repayment_edges += 1

        if edge_type == EDGE_REPAYMENT_DELAY and (
            source_node_id == root_node_id or target_node_id == root_node_id
        ):
            repayment_delay_edges += 1

        if edge_type == EDGE_DEFAULT_AFFECTED and (
            source_node_id == root_node_id or target_node_id == root_node_id
        ):
            default_pressure_edges += 1

        if weight >= Decimal("0"):
            positive_sum += weight
        else:
            negative_sum += abs(weight)

        if edge_type in {EDGE_GUARANTEED, EDGE_REPAID_WITH_SUPPORT} and source_node_id == root_node_id:
            support_given_count += 1

        if edge_type == EDGE_GUARANTEED and source_node_id == root_node_id:
            guarantees_given_count += 1
            if loan_id > 0:
                funds_mobilised_loans.add(loan_id)

        if edge_type == EDGE_GUARANTEED and target_node_id == root_node_id:
            borrower_support_count += 1

    graph_score = Decimal("50") + (positive_sum * Decimal("12")) - (negative_sum * Decimal("18"))
    graph_score = max(Decimal("0"), min(graph_score, Decimal("100")))

    total_signal = positive_sum + negative_sum
    if total_signal > Decimal("0"):
        trust_volatility = (negative_sum / total_signal) * Decimal("100")
    else:
        trust_volatility = Decimal("0")
    trust_volatility = min(trust_volatility, Decimal("100"))

    active_clan_count = len(set(active_clan_ids))
    unique_counterparties = len(connected_users)
    sponsor_count = len(sponsor_users)
    guarantor_count = len(guarantor_users)

    network_breadth = Decimal(active_clan_count * 10 + unique_counterparties * 12)
    network_breadth = min(network_breadth, Decimal("100"))

    network_quality = (
        Decimal("20")
        + Decimal(sponsor_count * 12)
        + Decimal(guarantor_count * 14)
        + Decimal(successful_repayment_edges * 6)
        - Decimal(repayment_delay_edges * 4)
        - Decimal(default_pressure_edges * 8)
    )
    network_quality = max(Decimal("0"), min(network_quality, Decimal("100")))

    guarantee_integrity = (
        Decimal("10")
        + Decimal(guarantor_count * 16)
        + Decimal(successful_repayment_edges * 10)
        - Decimal(default_pressure_edges * 12)
    )
    guarantee_integrity = max(Decimal("0"), min(guarantee_integrity, Decimal("100")))

    repayment_integrity = (
        Decimal("5")
        + Decimal(successful_repayment_edges * 18)
        - Decimal(repayment_delay_edges * 10)
        - Decimal(default_pressure_edges * 14)
    )
    repayment_integrity = max(Decimal("0"), min(repayment_integrity, Decimal("100")))

    default_pressure = Decimal(default_pressure_edges * 30 + repayment_delay_edges * 10)
    default_pressure = max(Decimal("0"), min(default_pressure, Decimal("100")))

    cross_clan_diversity_signal = Decimal(
        min(active_clan_count * 8 + len(cross_clan_positive_counterparties) * 10, 100)
    )

    risk_flags: List[str] = []
    if default_pressure_edges > 0:
        risk_flags.append("recent_default_pressure")
    if repayment_delay_edges > 0:
        risk_flags.append("repayment_delay_detected")
    if sponsor_count == 0:
        risk_flags.append("low_sponsor_support")
    if unique_counterparties <= 1:
        risk_flags.append("thin_network")

    positive_edge_total = len(
        [e for e in edges if _safe_decimal(e.get("weight")) >= Decimal("0")]
    )

    return {
        "active_clan_count": active_clan_count,
        "unique_counterparties": unique_counterparties,
        "sponsor_count": sponsor_count,
        "guarantor_count": guarantor_count,
        "support_given_count": support_given_count,
        "guarantees_given_count": guarantees_given_count,
        "borrower_support_count": borrower_support_count,
        "funds_mobilised_count": len(funds_mobilised_loans),
        "successful_repayment_edges": successful_repayment_edges,
        "repayment_delay_edges": repayment_delay_edges,
        "default_pressure_edges": default_pressure_edges,
        "graph_score": str(_q2(graph_score)),
        "trust_volatility": str(_q2(trust_volatility)),
        "network_breadth": str(_q2(network_breadth)),
        "network_quality": str(_q2(network_quality)),
        "guarantee_integrity": str(_q2(guarantee_integrity)),
        "repayment_integrity": str(_q2(repayment_integrity)),
        "default_pressure": str(_q2(default_pressure)),
        "cross_clan_diversity_signal": str(_q2(cross_clan_diversity_signal)),
        "risk_flags": risk_flags,
        "positive_edge_total": positive_edge_total,
        "stressed_edge_total": stressed_edges,
        "recent_edge_total": recent_edges,
        "historical_edge_total": historical_edges,
        "edge_type_counts": dict(edge_type_counts),
    }


def build_trust_graph(
    db: Session,
    user_id: int,
    *,
    include_clans: bool = True,
    limit_events: int = 500,
) -> Dict[str, Any]:
    root_user_id = int(user_id)
    root_user = db.get(User, root_user_id)
    if not root_user:
        raise ValueError("User not found")

    memberships = (
        db.query(ClanMembership)
        .filter(
            _user_id_text_match(ClanMembership.user_id, root_user_id),
            ClanMembership.left_at.is_(None),
        )
        .order_by(ClanMembership.created_at.asc(), ClanMembership.id.asc())
        .all()
    )
    active_clan_ids = [
        int(m.clan_id) for m in memberships if getattr(m, "clan_id", None) is not None
    ]

    borrower_loan_ids = [
        int(x[0])
        for x in (
            db.query(Loan.id)
            .filter(_user_id_text_match(Loan.borrower_user_id, root_user_id))
            .all()
        )
        if x and x[0] is not None
    ]

    guarantor_loan_ids = [
        int(x[0])
        for x in (
            db.query(LoanGuarantor.loan_id)
            .filter(
                _user_id_text_match(LoanGuarantor.guarantor_user_id, root_user_id)
            )
            .all()
        )
        if x and x[0] is not None
    ]

    related_loan_ids = sorted(set(borrower_loan_ids + guarantor_loan_ids))

    loan_clause = (
        TrustEvent.loan_id.in_(related_loan_ids)
        if related_loan_ids
        else false()
    )

    trust_events = (
        db.query(TrustEvent)
        .filter(
            or_(
                _user_id_text_match(TrustEvent.actor_user_id, root_user_id),
                _user_id_text_match(TrustEvent.subject_user_id, root_user_id),
                loan_clause,
            )
        )
        .order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .limit(max(1, min(int(limit_events), 2000)))
        .all()
    )

    user_ids: Set[int] = {root_user_id}
    for event in trust_events:
        meta = _parse_meta(event)
        ids = _extract_common_ids(event, meta)

        for key in [
            "actor_user_id",
            "subject_user_id",
            "borrower_user_id",
            "guarantor_user_id",
            "affected_user_id",
            "inviter_user_id",
            "joiner_user_id",
        ]:
            maybe_id = _safe_int(ids.get(key))
            if maybe_id > 0:
                user_ids.add(maybe_id)

        raw_loan_id = _safe_int(getattr(event, "loan_id", None), 0)
        loan_id = raw_loan_id if raw_loan_id > 0 else None
        if loan_id:
            borrower_id = _loan_borrower_user_id(db, loan_id)
            if borrower_id > 0:
                user_ids.add(borrower_id)

            for guarantor_id in _loan_guarantor_user_ids(db, loan_id):
                if guarantor_id > 0:
                    user_ids.add(guarantor_id)

    users = (
        db.query(User)
        .filter(User.id.in_(sorted(user_ids)))
        .all()
        if user_ids
        else []
    )

    memberships_by_user: Dict[int, List[int]] = defaultdict(list)
    if user_ids:
        related_memberships = (
            db.query(ClanMembership)
            .filter(
                _user_id_text_in(ClanMembership.user_id, sorted(user_ids)),
                ClanMembership.left_at.is_(None),
            )
            .all()
        )
        for membership in related_memberships:
            memberships_by_user[int(membership.user_id)].append(int(membership.clan_id))

    nodes: List[Dict[str, Any]] = []
    seen_node_ids: Set[str] = set()

    for user in users:
        node = _make_user_node(
            user,
            memberships_by_user.get(int(user.id), []),
            is_root=int(user.id) == root_user_id,
        )
        if node["node_id"] not in seen_node_ids:
            nodes.append(node)
            seen_node_ids.add(node["node_id"])

    if include_clans:
        for clan_id in sorted(set(active_clan_ids)):
            node = _make_clan_node(clan_id)
            if node["node_id"] not in seen_node_ids:
                nodes.append(node)
                seen_node_ids.add(node["node_id"])

    raw_edges: List[Dict[str, Any]] = []
    for event in trust_events:
        raw_edges.extend(_extract_edges_from_event(db, event))

    if include_clans:
        for clan_id in sorted(set(active_clan_ids)):
            raw_edges.append(
                _build_edge(
                    edge_type=EDGE_CO_MEMBERSHIP,
                    source_node_id=_user_node_id(root_user_id),
                    target_node_id=_clan_node_id(clan_id),
                    clan_id=clan_id,
                    loan_id=None,
                    event_id=None,
                    created_at=None,
                    directional=False,
                    meta={"reason": "active_membership"},
                )
            )

    edges = _aggregate_edges(raw_edges)
    summary = _build_summary(
        root_user_id=root_user_id,
        active_clan_ids=active_clan_ids,
        edges=edges,
    )
    cci = compute_cci_from_summary(summary)

    command_centre = {
        "root_user": {
            "user_id": root_user_id,
            "node_id": _user_node_id(root_user_id),
            "gmfn_id": getattr(root_user, "gmfn_id", None),
            "email": getattr(root_user, "email", None),
        },
        "stats": {
            "node_total": len(nodes),
            "user_node_total": len([n for n in nodes if n.get("node_type") == "user"]),
            "clan_node_total": len([n for n in nodes if n.get("node_type") == "clan"]),
            "edge_total": len(edges),
            "positive_edge_total": summary["positive_edge_total"],
            "stressed_edge_total": summary["stressed_edge_total"],
            "recent_edge_total": summary["recent_edge_total"],
            "historical_edge_total": summary["historical_edge_total"],
            "support_given_count": summary["support_given_count"],
            "guarantees_given_count": summary["guarantees_given_count"],
            "borrower_support_count": summary["borrower_support_count"],
            "funds_mobilised_count": summary["funds_mobilised_count"],
        },
        "edge_type_counts": summary["edge_type_counts"],
        "signals": {
            "strengths": cci.get("explain", {}).get("strengths", []),
            "pressures": cci.get("explain", {}).get("pressures", []),
        },
    }

    return {
        "root_user_id": root_user_id,
        "root_node_id": _user_node_id(root_user_id),
        "nodes": nodes,
        "edges": edges,
        "summary": summary,
        "cci": cci,
        "command_centre": command_centre,
    }
