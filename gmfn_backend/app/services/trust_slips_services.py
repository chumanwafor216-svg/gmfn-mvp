from __future__ import annotations

import hashlib
import json
import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.db.models import ClanMembership, TrustSlip, User
from app.services.liquidity_engine_service import build_user_liquidity_profile
from app.services.loan_readiness_service import build_loan_readiness_plan
from app.services.trust_score_service import compute_trust_breakdown

try:
    from app.services.trust_graph_service import build_trust_graph  # type: ignore
except Exception:
    build_trust_graph = None  # type: ignore


SNAPSHOT_VERSION = "trustslip-snapshot/v2"


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now_utc().isoformat()


def _safe_str(value: Any, default: str = "") -> str:
    if value is None:
        return default
    s = str(value).strip()
    return s if s else default


def _safe_decimal_str(value: Any, default: str = "0.00") -> str:
    if value is None:
        return default
    if isinstance(value, Decimal):
        return str(value)
    try:
        return str(Decimal(str(value)))
    except Exception:
        return default


def _safe_decimal(value: Any, default: str = "0.00") -> Decimal:
    try:
        return Decimal(str(value))
    except Exception:
        return Decimal(default)


def _mask_email(email: Optional[str]) -> Optional[str]:
    if not email:
        return None
    e = email.strip()
    if "@" not in e:
        return None
    user, domain = e.split("@", 1)
    if len(user) <= 2:
        user_mask = user[0] + "*"
    else:
        user_mask = user[:2] + "*" * (len(user) - 2)
    return f"{user_mask}@{domain}"


def _ensure_user_gmfn_id_payload(user: Optional[User]) -> Optional[str]:
    if not user:
        return None
    raw = getattr(user, "gmfn_id", None)
    if raw is None:
        return None
    s = str(raw).strip()
    return s or None


def _saved_visibility_level(user: Optional[User]) -> str:
    if not user:
        return "standard"
    level = _safe_str(getattr(user, "merchant_visibility_level", "standard"), "standard").lower()
    if level not in {"minimal", "standard", "detailed"}:
        return "standard"
    return level


def _default_weekly_expiry() -> datetime:
    return _now_utc() + timedelta(days=7)


def _parse_expiry_or_default(raw_value: Any) -> datetime:
    if raw_value:
        try:
            dt = datetime.fromisoformat(str(raw_value).replace("Z", "+00:00"))
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except Exception:
            return _default_weekly_expiry()
    return _default_weekly_expiry()


def _effective_slip_status(slip: Optional[TrustSlip]) -> str:
    if not slip:
        return "active"

    raw_status = _safe_str(getattr(slip, "status", "active"), "active").lower()
    expires_at = getattr(slip, "expires_at", None)

    if expires_at is not None:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < _now_utc():
            return "expired"

    if raw_status in {"revoked", "frozen", "expired"}:
        return raw_status

    if raw_status in {"active", "issued"}:
        return "active"

    return raw_status or "active"


def _build_graph_data(db: Session, *, user_id: int) -> Dict[str, Any]:
    if build_trust_graph is None:
        return {
            "cci": {},
            "summary": {},
            "nodes": [],
            "edges": [],
            "root_user_id": int(user_id),
        }
    try:
        graph = build_trust_graph(db, user_id=int(user_id))
        return graph if isinstance(graph, dict) else {}
    except Exception:
        return {
            "cci": {},
            "summary": {},
            "nodes": [],
            "edges": [],
            "root_user_id": int(user_id),
        }


def _node_user_id(node_id: Any) -> int:
    raw = _safe_str(node_id)
    if not raw.startswith("user:"):
        return 0
    try:
        return int(raw.split(":", 1)[1])
    except Exception:
        return 0


def _node_lookup(graph: Dict[str, Any]) -> Dict[int, Dict[str, Any]]:
    out: Dict[int, Dict[str, Any]] = {}
    for n in (graph.get("nodes") or []):
        try:
            uid = int(n.get("user_id") or 0)
        except Exception:
            uid = 0
        if uid > 0:
            out[uid] = n
    return out


def _sponsor_rows_from_graph(graph: Dict[str, Any], *, max_items: int = 3) -> list[dict[str, Any]]:
    edges = graph.get("edges") or []
    nodes_by_user = _node_lookup(graph)

    rows: list[dict[str, Any]] = []
    root_user_id = int(graph.get("root_user_id") or 0)

    for edge in edges:
        edge_type = _safe_str(edge.get("edge_type")).lower()
        if edge_type not in {"invited_by", "successfully_onboarded", "guaranteed"}:
            continue

        source_user_id = _node_user_id(edge.get("source_node_id"))
        target_user_id = _node_user_id(edge.get("target_node_id"))
        if source_user_id <= 0 or target_user_id <= 0:
            continue
        if target_user_id != root_user_id:
            continue

        node = nodes_by_user.get(source_user_id, {})
        rows.append(
            {
                "user_id": int(source_user_id),
                "gmfn_id": node.get("gmfn_id"),
                "email": node.get("display_label") if "@" in _safe_str(node.get("display_label")) else node.get("email"),
                "phone_verified": bool(node.get("phone_verified")),
                "edge_type": edge_type,
                "weight": _safe_decimal_str(edge.get("weight"), "0.00"),
                "confidence": _safe_decimal_str(edge.get("confidence"), "0.00"),
            }
        )

    rows.sort(
        key=lambda item: (
            _safe_decimal(item.get("weight"), "0.00"),
            _safe_decimal(item.get("confidence"), "0.00"),
        ),
        reverse=True,
    )

    deduped: list[dict[str, Any]] = []
    seen: set[int] = set()
    for row in rows:
        uid = int(row["user_id"])
        if uid in seen:
            continue
        seen.add(uid)
        deduped.append(row)

    return deduped[:max_items]


def _internal_support_contacts(graph: Dict[str, Any]) -> list[dict[str, Any]]:
    sponsors = _sponsor_rows_from_graph(graph, max_items=3)
    out: list[dict[str, Any]] = []
    for sponsor in sponsors:
        out.append(
            {
                "role": "sponsor",
                "user_id": sponsor.get("user_id"),
                "gmfn_id": sponsor.get("gmfn_id"),
                "email": sponsor.get("email"),
                "phone_verified": sponsor.get("phone_verified"),
                "relationship": sponsor.get("edge_type"),
            }
        )
    return out


def _generate_unique_trustslip_code(db: Session) -> str:
    for _ in range(50):
        code = secrets.token_urlsafe(8).replace("-", "").replace("_", "").upper()[:12]
        exists = db.query(TrustSlip).filter(TrustSlip.code == code).first()
        if not exists:
            return code
    raise RuntimeError("Could not generate unique TrustSlip code")


def _find_latest_trust_slip(db: Session, *, user_id: int) -> Optional[TrustSlip]:
    return (
        db.query(TrustSlip)
        .filter(TrustSlip.holder_user_id == int(user_id))
        .order_by(TrustSlip.id.desc())
        .first()
    )


def _resolve_issue_clan_id(db: Session, *, user_id: int) -> int:
    latest = _find_latest_trust_slip(db, user_id=int(user_id))
    if latest and getattr(latest, "clan_id", None):
        return int(latest.clan_id)

    membership = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.user_id == int(user_id),
            ClanMembership.left_at.is_(None),
        )
        .order_by(ClanMembership.created_at.asc(), ClanMembership.id.asc())
        .first()
    )
    if membership and getattr(membership, "clan_id", None):
        return int(membership.clan_id)

    raise ValueError("No active clan membership found for TrustSlip issuance")


def get_current_trust_slip_for_user(db: Session, *, user_id: int) -> Optional[TrustSlip]:
    current = (
        db.query(TrustSlip)
        .filter(
            TrustSlip.holder_user_id == int(user_id),
            TrustSlip.is_current.is_(True),
        )
        .order_by(TrustSlip.id.desc())
        .first()
    )
    if current:
        return current
    return _find_latest_trust_slip(db, user_id=int(user_id))


def build_trust_slip_visibility_view(payload: Dict[str, Any], *, level: Optional[str]) -> Dict[str, Any]:
    safe_level = _safe_str(level or "standard", "standard").lower()
    if safe_level not in {"minimal", "standard", "detailed"}:
        safe_level = "standard"

    merchant_summary = dict(payload.get("merchant_summary") or {})
    sponsors = list(payload.get("sponsors") or [])
    internal_contacts = list(payload.get("internal_contacts") or [])

    base: Dict[str, Any] = {
        "visibility_level": safe_level,
        "verified": payload.get("verified", True),
        "active": payload.get("active", True),
        "status": payload.get("status"),
        "code": payload.get("code"),
        "gmfn_id": payload.get("gmfn_id"),
        "display_name": payload.get("display_name"),
        "community": payload.get("community"),
        "band": payload.get("band"),
        "trust_limit": payload.get("trust_limit") or payload.get("trust_slip_limit"),
        "currency": payload.get("currency"),
        "expires_at": payload.get("expires_at"),
        "expiry_policy": payload.get("expiry_policy", "weekly"),
        "phone_verified": payload.get("phone_verified", False),
        "merchant_summary": merchant_summary,
        "not_a_bank_guarantee": True,
        "no_auto_debit": True,
        "disclaimer": payload.get("disclaimer"),
    }

    if safe_level == "minimal":
        base["merchant_summary"] = {
            "gmfn_id": merchant_summary.get("gmfn_id"),
            "code": merchant_summary.get("code"),
            "trust_limit": merchant_summary.get("trust_limit"),
            "currency": merchant_summary.get("currency"),
            "expires_at": merchant_summary.get("expires_at"),
            "expiry_policy": merchant_summary.get("expiry_policy", "weekly"),
            "phone_verified": merchant_summary.get("phone_verified", False),
        }
        return base

    if safe_level == "standard":
        base["cci_score"] = payload.get("cci_score")
        base["cci_band"] = payload.get("cci_band")
        base["sponsor_count"] = payload.get("sponsor_count")
        base["merchant_summary"] = {
            "gmfn_id": merchant_summary.get("gmfn_id"),
            "code": merchant_summary.get("code"),
            "trust_limit": merchant_summary.get("trust_limit"),
            "currency": merchant_summary.get("currency"),
            "cci_score": merchant_summary.get("cci_score"),
            "cci_band": merchant_summary.get("cci_band"),
            "sponsor_count": merchant_summary.get("sponsor_count"),
            "display_name": merchant_summary.get("display_name"),
            "community": merchant_summary.get("community"),
            "band": merchant_summary.get("band"),
            "expires_at": merchant_summary.get("expires_at"),
            "expiry_policy": merchant_summary.get("expiry_policy", "weekly"),
            "phone_verified": merchant_summary.get("phone_verified", False),
        }
        base["sponsors"] = [
            {
                "gmfn_id": sponsor.get("gmfn_id"),
                "email_masked": _mask_email(sponsor.get("email")),
                "edge_type": sponsor.get("edge_type"),
            }
            for sponsor in sponsors
        ]
        return base

    base["owner"] = payload.get("owner")
    base["cci_score"] = payload.get("cci_score")
    base["cci_band"] = payload.get("cci_band")
    base["graph_score"] = payload.get("graph_score")
    base["active_clan_count"] = payload.get("active_clan_count")
    base["sponsor_count"] = payload.get("sponsor_count")
    base["unique_counterparties"] = payload.get("unique_counterparties")
    base["risk_flags"] = payload.get("risk_flags", [])
    base["last_full_repayment_at"] = payload.get("last_full_repayment_at")
    base["last_release_at"] = payload.get("last_release_at")
    base["evidence_summary"] = payload.get("evidence_summary", {})
    base["sponsors"] = [
        {
            "gmfn_id": sponsor.get("gmfn_id"),
            "email_masked": _mask_email(sponsor.get("email")),
            "phone_verified": sponsor.get("phone_verified"),
            "edge_type": sponsor.get("edge_type"),
            "weight": sponsor.get("weight"),
            "confidence": sponsor.get("confidence"),
        }
        for sponsor in sponsors
    ]
    base["internal_contacts"] = [
        {
            "role": contact.get("role"),
            "gmfn_id": contact.get("gmfn_id"),
            "email_masked": _mask_email(contact.get("email")),
            "phone_verified": contact.get("phone_verified"),
            "relationship": contact.get("relationship"),
        }
        for contact in internal_contacts
    ]
    return base


def _snapshot_checksum(payload: Dict[str, Any]) -> str:
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False, default=str).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def read_trust_slip_snapshot(slip: TrustSlip) -> Optional[Dict[str, Any]]:
    raw = getattr(slip, "snapshot_json", None)
    if not raw:
        return None
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def store_trust_slip_snapshot(
    db: Session,
    *,
    slip: TrustSlip,
    full_payload: Dict[str, Any],
    visibility_level: str,
) -> Dict[str, Any]:
    merchant_view = build_trust_slip_visibility_view(full_payload, level=visibility_level)

    snapshot = {
        "snapshot_version": SNAPSHOT_VERSION,
        "snapshot_issued_at": _now_iso(),
        "merchant_visibility_level": visibility_level,
        "merchant_view": merchant_view,
        "full_summary": full_payload,
        "trustslip_code": full_payload.get("code") or getattr(slip, "code", None),
        "gmfn_id": full_payload.get("gmfn_id"),
        "cci_score": full_payload.get("cci_score"),
        "cci_band": full_payload.get("cci_band"),
        "status": full_payload.get("status"),
        "expires_at": full_payload.get("expires_at"),
    }

    checksum = _snapshot_checksum(snapshot)

    slip.snapshot_json = json.dumps(snapshot, ensure_ascii=False)
    slip.snapshot_visibility_level = visibility_level
    slip.snapshot_version = SNAPSHOT_VERSION
    slip.snapshot_checksum = checksum

    db.add(slip)
    db.commit()
    db.refresh(slip)

    snapshot["snapshot_checksum"] = checksum
    return snapshot


def ensure_trust_slip_snapshot(
    db: Session,
    *,
    slip: TrustSlip,
    user: Optional[User],
    full_payload: Dict[str, Any],
) -> Dict[str, Any]:
    existing = read_trust_slip_snapshot(slip)
    if existing:
        if "snapshot_checksum" not in existing and getattr(slip, "snapshot_checksum", None):
            existing["snapshot_checksum"] = getattr(slip, "snapshot_checksum", None)
        if "snapshot_version" not in existing and getattr(slip, "snapshot_version", None):
            existing["snapshot_version"] = getattr(slip, "snapshot_version", None)
        return existing

    visibility_level = _saved_visibility_level(user)
    return store_trust_slip_snapshot(
        db,
        slip=slip,
        full_payload=full_payload,
        visibility_level=visibility_level,
    )


def get_trust_slip_payload(db: Session, *, user_id: int) -> Dict[str, Any]:
    uid = int(user_id)
    user = db.get(User, uid)
    summary = compute_trust_breakdown(db, user_id=uid)
    graph = _build_graph_data(db, user_id=uid)
    slip = get_current_trust_slip_for_user(db, user_id=uid)

    clan_id = _resolve_issue_clan_id(db, user_id=uid)

    trust_limit = _safe_decimal_str(summary.get("trust_slip_limit", Decimal("0.00")))
    standing_score = _safe_decimal_str(summary.get("standing_score", Decimal("0.00")))
    lifetime_trust = _safe_decimal_str(summary.get("lifetime_trust", Decimal("0.00")))

    slip_code = getattr(slip, "code", None) if slip else None
    slip_status = _effective_slip_status(slip)
    slip_currency = getattr(slip, "currency", "NGN") if slip else "NGN"
    slip_expires_at = getattr(slip, "expires_at", None) if slip else None
    slip_created_at = getattr(slip, "created_at", None) if slip else None
    slip_last_release_at = getattr(slip, "last_release_at", None) if slip else None
    slip_limit_value = getattr(slip, "trust_limit", None) if slip else None

    cci = graph.get("cci") or {}
    graph_summary = graph.get("summary") or {}

    sponsors = _sponsor_rows_from_graph(graph, max_items=3)
    internal_contacts = _internal_support_contacts(graph)

    owner = {
        "user_id": uid,
        "gmfn_id": _ensure_user_gmfn_id_payload(user),
        "email": getattr(user, "email", None) if user else None,
        "phone_e164": getattr(user, "phone_e164", None) if user else None,
        "phone_verified": bool(
            getattr(user, "phone_verified_at", None) and getattr(user, "phone_e164", None)
        )
        if user
        else False,
    }

    effective_expiry = slip_expires_at.isoformat() if slip_expires_at else _default_weekly_expiry().isoformat()
    saved_level = _saved_visibility_level(user)
    effective_limit = _safe_decimal_str(slip_limit_value, trust_limit)
    gmfn_id = _ensure_user_gmfn_id_payload(user)
    display_name = gmfn_id or _mask_email(getattr(user, "email", None)) or "Member"
    community = _safe_str(
        (summary.get("community_name") if isinstance(summary, dict) else None),
        default=f"Clan {clan_id}",
    )

    evidence_summary: Dict[str, Any] = {}
    try:
        liquidity = build_user_liquidity_profile(db, uid)
        evidence_summary["capacity_context"] = {
            "available_guarantee_capacity": liquidity.get("available_guarantee_capacity"),
            "current_locked_guarantees": liquidity.get("current_locked_guarantees"),
            "overexposure_ratio": liquidity.get("overexposure_ratio"),
            "risk_level": liquidity.get("risk_level"),
            "reasons": liquidity.get("reasons", []),
        }
    except Exception:
        evidence_summary["capacity_context"] = {}

    try:
        readiness = build_loan_readiness_plan(
            db,
            clan_id=int(clan_id),
            requested_amount=effective_limit,
            borrower_user_id=uid,
        )
        evidence_summary["readiness_context"] = {
            "recommendation": ((readiness.get("readiness") or {}).get("recommendation")),
            "readiness_score": ((readiness.get("readiness") or {}).get("readiness_score")),
            "reasons": ((readiness.get("readiness") or {}).get("reasons", [])),
            "estimated_guarantee_gap": ((readiness.get("coverage") or {}).get("estimated_guarantee_gap")),
            "capacity_ratio": ((readiness.get("coverage") or {}).get("capacity_ratio")),
            "coverable_now": ((readiness.get("coverage") or {}).get("coverable_now")),
        }
    except Exception:
        evidence_summary["readiness_context"] = {}

    payload: Dict[str, Any] = {
        "verified": True,
        "active": slip_status == "active",
        "user_id": uid,
        "clan_id": clan_id,
        "gmfn_id": gmfn_id,
        "display_name": display_name,
        "community": community,
        "owner": owner,
        "phone_e164": getattr(user, "phone_e164", None) if user else None,
        "phone_verified": bool(
            getattr(user, "phone_verified_at", None) and getattr(user, "phone_e164", None)
        )
        if user
        else False,
        "level": summary.get("band"),
        "band": summary.get("band"),
        "level_label": summary.get("level_label"),
        "lifetime_trust": lifetime_trust,
        "standing_score": standing_score,
        "trust_score": standing_score,
        "trust_slip_limit": trust_limit,
        "trust_limit": effective_limit,
        "currency": slip_currency,
        "status": slip_status,
        "code": slip_code,
        "created_at": slip_created_at.isoformat() if slip_created_at else None,
        "issued_at": slip_created_at.isoformat() if slip_created_at else None,
        "expires_at": effective_expiry,
        "expiry_policy": "weekly",
        "last_release_at": slip_last_release_at.isoformat() if slip_last_release_at else None,
        "last_full_repayment_at": summary.get("last_full_repayment_at"),
        "days_since_last_full_repayment": summary.get("days_since_last_full_repayment"),
        "cci_score": cci.get("cci_score"),
        "cci_band": cci.get("cci_band"),
        "graph_score": graph_summary.get("graph_score"),
        "active_clan_count": graph_summary.get("active_clan_count"),
        "sponsor_count": graph_summary.get("sponsor_count"),
        "unique_counterparties": graph_summary.get("unique_counterparties"),
        "risk_flags": cci.get("risk_flags", []),
        "sponsors": sponsors,
        "internal_contacts": internal_contacts,
        "evidence_summary": evidence_summary,
        "merchant_summary": {
            "gmfn_id": gmfn_id,
            "display_name": display_name,
            "community": community,
            "band": summary.get("band"),
            "code": slip_code,
            "trust_limit": effective_limit,
            "currency": slip_currency,
            "cci_score": cci.get("cci_score"),
            "cci_band": cci.get("cci_band"),
            "sponsor_count": graph_summary.get("sponsor_count"),
            "expiry_policy": "weekly",
            "expires_at": effective_expiry,
            "phone_verified": bool(
                getattr(user, "phone_verified_at", None) and getattr(user, "phone_e164", None)
            )
            if user
            else False,
        },
        "merchant_visibility_level": saved_level,
        "visibility_options": ["minimal", "standard", "detailed"],
        "is_current": bool(getattr(slip, "is_current", True)) if slip else True,
        "issued_reason": getattr(slip, "issued_reason", None) if slip else None,
        "supersedes_trust_slip_id": getattr(slip, "supersedes_trust_slip_id", None) if slip else None,
        "superseded_by_trust_slip_id": getattr(slip, "superseded_by_trust_slip_id", None) if slip else None,
        "not_a_bank_guarantee": True,
        "no_auto_debit": True,
        "disclaimer": (
            "Community-backed integrity limit. "
            "Not a bank guarantee. No auto-debit. "
            "TrustSlip is a portable summary derived from GMFN trust history."
        ),
        "generated_at": _now_iso(),
    }

    payload["merchant_view"] = build_trust_slip_visibility_view(payload, level=saved_level)
    return payload


def issue_trust_slip_for_user(db: Session, *, user_id: int) -> Dict[str, Any]:
    uid = int(user_id)
    user = db.get(User, uid)
    if not user:
        raise ValueError("User not found")

    if not getattr(user, "phone_verified_at", None) or not getattr(user, "phone_e164", None):
        raise ValueError("Verify your phone number before issuing TrustSlip")

    current = get_current_trust_slip_for_user(db, user_id=uid)
    if current and bool(getattr(current, "is_current", False)):
        current_payload = get_trust_slip_payload(db, user_id=uid)
        snapshot = ensure_trust_slip_snapshot(
            db,
            slip=current,
            user=user,
            full_payload=current_payload,
        )
        return {
            "ok": True,
            "issued": False,
            "reason": "current_slip_exists",
            "trust_slip_id": int(current.id),
            "code": current.code,
            "gmfn_id": getattr(user, "gmfn_id", None),
            "status": current.status,
            "is_current": bool(current.is_current),
            "snapshot_version": snapshot.get("snapshot_version") or getattr(current, "snapshot_version", None),
            "snapshot_checksum": snapshot.get("snapshot_checksum") or getattr(current, "snapshot_checksum", None),
            "expires_at": current.expires_at.isoformat() if current.expires_at else None,
        }

    pre_payload = get_trust_slip_payload(db, user_id=uid)
    trust_limit = _safe_decimal(
        pre_payload.get("trust_limit") or pre_payload.get("trust_slip_limit"),
        "0.00",
    )
    currency = _safe_str(pre_payload.get("currency"), "NGN")
    expires_at = _parse_expiry_or_default(pre_payload.get("expires_at"))
    clan_id = int(pre_payload.get("clan_id") or _resolve_issue_clan_id(db, user_id=uid))
    code = _generate_unique_trustslip_code(db)

    slip = TrustSlip(
        code=code,
        clan_id=clan_id,
        holder_user_id=uid,
        trust_limit=trust_limit,
        currency=currency,
        status="active",
        expires_at=expires_at,
        created_at=_now_utc(),
        is_current=True,
        issued_reason="initial_issue",
        supersedes_trust_slip_id=None,
        superseded_by_trust_slip_id=None,
    )
    db.add(slip)
    db.commit()
    db.refresh(slip)

    issued_payload = get_trust_slip_payload(db, user_id=uid)
    snapshot = store_trust_slip_snapshot(
        db,
        slip=slip,
        full_payload=issued_payload,
        visibility_level=_saved_visibility_level(user),
    )

    return {
        "ok": True,
        "issued": True,
        "reason": "issued",
        "trust_slip_id": int(slip.id),
        "code": slip.code,
        "gmfn_id": getattr(user, "gmfn_id", None),
        "status": slip.status,
        "is_current": bool(slip.is_current),
        "snapshot_version": snapshot.get("snapshot_version") or getattr(slip, "snapshot_version", None),
        "snapshot_checksum": snapshot.get("snapshot_checksum") or getattr(slip, "snapshot_checksum", None),
        "expires_at": slip.expires_at.isoformat() if slip.expires_at else None,
    }


def has_material_trustslip_change(
    db: Session,
    *,
    slip: TrustSlip,
    user: Optional[User],
) -> Dict[str, Any]:
    full_payload = get_trust_slip_payload(db, user_id=int(slip.holder_user_id))
    snapshot = ensure_trust_slip_snapshot(
        db,
        slip=slip,
        user=user,
        full_payload=full_payload,
    )

    merchant_view = snapshot.get("merchant_view") or {}
    merchant_summary = merchant_view.get("merchant_summary") or {}
    snapshot_level = _safe_str(snapshot.get("merchant_visibility_level"), "standard")
    current_level = _saved_visibility_level(user)

    current_limit = _safe_decimal(
        full_payload.get("trust_limit") or full_payload.get("trust_slip_limit"),
        "0.00",
    )
    old_limit = _safe_decimal(
        merchant_summary.get("trust_limit") or snapshot.get("trust_limit"),
        "0.00",
    )

    current_status = _safe_str(full_payload.get("status"), "active")
    old_status = _safe_str(snapshot.get("status") or merchant_view.get("status"), "active")

    current_expiry = _safe_str(full_payload.get("expires_at"))
    old_expiry = _safe_str(merchant_summary.get("expires_at") or snapshot.get("expires_at"))

    changes: Dict[str, Any] = {}

    if current_limit != old_limit:
        changes["trust_limit"] = {
            "old": str(old_limit),
            "new": str(current_limit),
        }

    if current_status != old_status:
        changes["status"] = {
            "old": old_status,
            "new": current_status,
        }

    if current_expiry != old_expiry:
        changes["expires_at"] = {
            "old": old_expiry,
            "new": current_expiry,
        }

    if current_level != snapshot_level:
        changes["merchant_visibility_level"] = {
            "old": snapshot_level,
            "new": current_level,
        }

    return {
        "material_change": bool(changes),
        "changes": changes,
        "current_payload": full_payload,
        "snapshot": snapshot,
    }


def reissue_trust_slip(
    db: Session,
    *,
    user_id: int,
    reason: str,
) -> Dict[str, Any]:
    uid = int(user_id)
    current_slip = get_current_trust_slip_for_user(db, user_id=uid)
    user = db.get(User, uid)
    if not user:
        raise ValueError("User not found")

    current_payload = get_trust_slip_payload(db, user_id=uid)

    if current_slip:
        current_status = _safe_str(getattr(current_slip, "status", "active"), "active").lower()
        if current_status in {"frozen", "revoked"}:
            raise ValueError(f"Cannot reissue from {current_status} TrustSlip")
        ensure_trust_slip_snapshot(
            db,
            slip=current_slip,
            user=user,
            full_payload=current_payload,
        )

    code = _generate_unique_trustslip_code(db)
    trust_limit = _safe_decimal(
        current_payload.get("trust_limit") or current_payload.get("trust_slip_limit"),
        "0.00",
    )
    currency = _safe_str(current_payload.get("currency"), "NGN")
    expires_at = _parse_expiry_or_default(current_payload.get("expires_at"))
    clan_id = int(current_payload.get("clan_id") or _resolve_issue_clan_id(db, user_id=uid))

    new_slip = TrustSlip(
        code=code,
        clan_id=clan_id,
        holder_user_id=uid,
        trust_limit=trust_limit,
        currency=currency,
        status="active",
        expires_at=expires_at,
        created_at=_now_utc(),
        is_current=True,
        issued_reason=_safe_str(reason, "manual_reissue"),
        supersedes_trust_slip_id=int(current_slip.id) if current_slip else None,
    )
    db.add(new_slip)
    db.commit()
    db.refresh(new_slip)

    if current_slip:
        current_slip.is_current = False
        current_slip.superseded_by_trust_slip_id = int(new_slip.id)
        db.add(current_slip)
        db.commit()
        db.refresh(current_slip)

    new_payload = get_trust_slip_payload(db, user_id=uid)
    store_trust_slip_snapshot(
        db,
        slip=new_slip,
        full_payload=new_payload,
        visibility_level=_saved_visibility_level(user),
    )

    return {
        "ok": True,
        "old_trust_slip_id": int(current_slip.id) if current_slip else None,
        "new_trust_slip_id": int(new_slip.id),
        "code": new_slip.code,
        "reason": new_slip.issued_reason,
        "expires_at": new_slip.expires_at.isoformat() if new_slip.expires_at else None,
    }


def backfill_missing_trustslip_snapshots(
    db: Session,
    *,
    only_current: bool = False,
    limit: int = 500,
) -> Dict[str, Any]:
    q = db.query(TrustSlip).filter(TrustSlip.snapshot_json.is_(None))
    if only_current:
        q = q.filter(TrustSlip.is_current.is_(True))
    slips = q.order_by(TrustSlip.id.asc()).limit(max(1, min(int(limit), 1000))).all()

    scanned = 0
    created = 0
    skipped = 0
    failed: list[dict[str, Any]] = []

    for slip in slips:
        scanned += 1
        try:
            if getattr(slip, "snapshot_json", None):
                skipped += 1
                continue

            user = db.get(User, int(slip.holder_user_id))
            if not user:
                failed.append({"trust_slip_id": int(slip.id), "reason": "holder_not_found"})
                continue

            payload = get_trust_slip_payload(db, user_id=int(user.id))
            store_trust_slip_snapshot(
                db,
                slip=slip,
                full_payload=payload,
                visibility_level=_saved_visibility_level(user),
            )
            created += 1
        except Exception as exc:
            db.rollback()
            failed.append(
                {
                    "trust_slip_id": int(getattr(slip, "id", 0)),
                    "reason": str(exc),
                }
            )

    return {
        "ok": True,
        "scanned": scanned,
        "created": created,
        "skipped": skipped,
        "failed": failed,
    }


def get_trust_slip_for_user(db: Session, *, user_id: int) -> Dict[str, Any]:
    return get_trust_slip_payload(db, user_id=int(user_id))