from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from io import BytesIO
from typing import Any, Dict, Optional
from zipfile import ZIP_DEFLATED, ZipFile

from sqlalchemy.orm import Session

from app.db.models import User
from app.services.loan_readiness_service import build_loan_readiness_plan
from app.services.liquidity_engine_service import build_user_liquidity_profile
from app.services.trust_timeline_service import list_trust_timeline
from app.services.trust_slips_services import (
    build_trust_slip_visibility_view,
)

try:
    from app.services.trust_timeline_pdf_service import build_trust_timeline_pdf  # type: ignore
except Exception:
    build_trust_timeline_pdf = None  # type: ignore


PROTOCOL_VERSION = "gsn-evidence-pack/v4"
SURFACE_BRAND = "GSN"
SURFACE_BRAND_FULL = "Global Support Network"
DEFAULT_FOOTER = "GSN evidence export - controlled community trust record"
LIMITATION_STATEMENT = (
    "This GSN evidence pack is a system-generated community trust record. "
    "It is not a bank guarantee, not a credit approval, and not an automatic debit authority."
)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now_utc().isoformat()


def _safe_str(value: Any, default: str = "") -> str:
    if value is None:
        return default
    s = str(value).strip()
    return s if s else default


def _safe_visibility_level(user: Optional[User], requested_level: Optional[str] = None) -> str:
    raw = requested_level or getattr(user, "merchant_visibility_level", "standard") or "standard"
    level = str(raw).strip().lower()
    if level not in {"minimal", "standard", "detailed"}:
        return "standard"
    return level


def _json_bytes(payload: Any) -> bytes:
    return json.dumps(
        payload,
        indent=2,
        ensure_ascii=False,
        sort_keys=False,
        default=str,
    ).encode("utf-8")


def _sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _make_pack_id(user_id: int, visibility_level: str) -> str:
    ts = _now_utc().strftime("%Y%m%dT%H%M%SZ")
    return f"GSN-PACK-U{int(user_id)}-{visibility_level.upper()}-{ts}"


def _load_recent_events(db: Session, *, user_id: int, limit: int = 50) -> list[dict[str, Any]]:
    return list_trust_timeline(
        db,
        user_id=int(user_id),
        limit=max(1, min(int(limit), 200)),
        audience="user",
    )


def _build_evidence_summary(
    db: Session,
    *,
    current_user: User,
    trustslip_summary: Dict[str, Any],
) -> Dict[str, Any]:
    user_profile = {}
    try:
        user_profile = build_user_liquidity_profile(db, int(current_user.id))
    except Exception:
        user_profile = {}

    clan_id = trustslip_summary.get("clan_id")
    readiness = {}
    if clan_id is not None:
        trust_limit = trustslip_summary.get("trust_limit") or trustslip_summary.get("trust_slip_limit") or "0"
        try:
            readiness = build_loan_readiness_plan(
                db,
                clan_id=int(clan_id),
                requested_amount=trust_limit,
                borrower_user_id=int(current_user.id),
            )
        except Exception:
            readiness = {}

    return {
        "trust_context": {
            "trust_score": trustslip_summary.get("trust_score"),
            "cci_score": trustslip_summary.get("cci_score"),
            "cci_band": trustslip_summary.get("cci_band"),
            "graph_score": trustslip_summary.get("graph_score"),
            "risk_flags": trustslip_summary.get("risk_flags", []),
            "sponsor_count": trustslip_summary.get("sponsor_count"),
            "active_clan_count": trustslip_summary.get("active_clan_count"),
            "unique_counterparties": trustslip_summary.get("unique_counterparties"),
        },
        "capacity_context": {
            "available_guarantee_capacity": user_profile.get("available_guarantee_capacity"),
            "current_locked_guarantees": user_profile.get("current_locked_guarantees"),
            "overexposure_ratio": user_profile.get("overexposure_ratio"),
            "risk_level": user_profile.get("risk_level"),
            "reasons": user_profile.get("reasons", []),
        },
        "readiness_context": {
            "recommendation": ((readiness.get("readiness") or {}).get("recommendation") if readiness else None),
            "readiness_score": ((readiness.get("readiness") or {}).get("readiness_score") if readiness else None),
            "reasons": ((readiness.get("readiness") or {}).get("reasons") if readiness else []),
            "estimated_guarantee_gap": ((readiness.get("coverage") or {}).get("estimated_guarantee_gap") if readiness else None),
            "capacity_ratio": ((readiness.get("coverage") or {}).get("capacity_ratio") if readiness else None),
            "coverable_now": ((readiness.get("coverage") or {}).get("coverable_now") if readiness else None),
            "remaining_gap_after_top_candidates": ((readiness.get("coverage") or {}).get("remaining_gap_after_top_candidates") if readiness else None),
        },
    }


def _build_manifest(
    *,
    current_user: User,
    trustslip_summary: Dict[str, Any],
    merchant_view: Dict[str, Any],
    recent_events: list[dict[str, Any]],
    visibility_level: str,
    pack_id: str,
    evidence_summary: Dict[str, Any],
) -> Dict[str, Any]:
    return {
        "pack_id": pack_id,
        "title": "GSN Evidence Pack",
        "surface_brand": SURFACE_BRAND,
        "surface_brand_full": SURFACE_BRAND_FULL,
        "document_type": "portable_trust_evidence_package",
        "generated_at_utc": _now_iso(),
        "protocol_version": PROTOCOL_VERSION,
        "footer": DEFAULT_FOOTER,
        "authority_note": (
            "Generated by GSN from recorded TrustSlip, TrustEvent, support, and capacity context."
        ),
        "limitation_statement": LIMITATION_STATEMENT,
        "evidence_alignment": "trustslip_visibility_bound_plus_capacity_context",
        "merchant_visibility_level": visibility_level,
        "holder": {
            "gsn_id": getattr(current_user, "gmfn_id", None),
            "display_name": getattr(current_user, "display_name", None),
            "phone_verified": bool(
                getattr(current_user, "phone_verified_at", None)
                and getattr(current_user, "phone_e164", None)
            ),
            "private_contact_details": "redacted for portable evidence pack",
        },
        "trustslip": {
            "code": trustslip_summary.get("code"),
            "status": trustslip_summary.get("status"),
            "currency": trustslip_summary.get("currency"),
            "trust_limit": trustslip_summary.get("trust_limit") or trustslip_summary.get("trust_slip_limit"),
            "expires_at": trustslip_summary.get("expires_at"),
            "cci_score": trustslip_summary.get("cci_score"),
            "cci_band": trustslip_summary.get("cci_band"),
            "sponsor_count": trustslip_summary.get("sponsor_count"),
        },
        "merchant_view": merchant_view,
        "evidence_summary": evidence_summary,
        "event_counts": {
            "recent_events_included": len(recent_events),
        },
    }


def build_evidence_pack_meta(
    db: Session,
    *,
    current_user: User,
    level: Optional[str] = None,
) -> Dict[str, Any]:
    visibility_level = _safe_visibility_level(current_user, level)
    pack_id = _make_pack_id(int(current_user.id), visibility_level)

    return {
        "pack_id": pack_id,
        "title": "GSN Evidence Pack",
        "surface_brand": SURFACE_BRAND,
        "surface_brand_full": SURFACE_BRAND_FULL,
        "document_type": "portable_trust_evidence_package",
        "generated_at_utc": _now_iso(),
        "protocol_version": PROTOCOL_VERSION,
        "footer": DEFAULT_FOOTER,
        "authority_note": (
            "Generated by GSN from recorded TrustSlip, TrustEvent, support, and capacity context."
        ),
        "limitation_statement": LIMITATION_STATEMENT,
        "merchant_visibility_level": visibility_level,
        "evidence_alignment": "trustslip_visibility_bound_plus_capacity_context",
    }


def build_evidence_pack_zip(
    db: Session,
    *,
    current_user: User,
    trustslip_summary: Dict[str, Any],
    level: Optional[str] = None,
) -> bytes:
    visibility_level = _safe_visibility_level(current_user, level)

    summary = dict(trustslip_summary or {})
    summary["merchant_visibility_level"] = visibility_level

    merchant_view = build_trust_slip_visibility_view(
        summary,
        level=visibility_level,
    )

    recent_events = _load_recent_events(
        db,
        user_id=int(current_user.id),
        limit=50,
    )

    evidence_summary = _build_evidence_summary(
        db,
        current_user=current_user,
        trustslip_summary=summary,
    )

    pack_id = _make_pack_id(int(current_user.id), visibility_level)

    manifest = _build_manifest(
        current_user=current_user,
        trustslip_summary=summary,
        merchant_view=merchant_view,
        recent_events=recent_events,
        visibility_level=visibility_level,
        pack_id=pack_id,
        evidence_summary=evidence_summary,
    )

    trustslip_snapshot = {
        "pack_id": pack_id,
        "title": "GSN Evidence Pack Snapshot",
        "surface_brand": SURFACE_BRAND,
        "generated_at_utc": _now_iso(),
        "protocol_version": PROTOCOL_VERSION,
        "limitation_statement": LIMITATION_STATEMENT,
        "merchant_visibility_level": visibility_level,
        "merchant_view": merchant_view,
        "evidence_summary": evidence_summary,
        "recent_events": recent_events,
        "evidence_alignment": "trustslip_visibility_bound_plus_capacity_context",
        "private_summary_boundary": (
            "This portable pack uses the selected TrustSlip visibility level. "
            "Private contact fields and complete TrustSlip internals are not included."
        ),
    }

    files: dict[str, bytes] = {}

    manifest_bytes = _json_bytes(manifest)
    trustslip_snapshot_bytes = _json_bytes(trustslip_snapshot)

    files["manifest.json"] = manifest_bytes
    files["trustslip_snapshot.json"] = trustslip_snapshot_bytes

    readme_text = f"""GSN Evidence Pack
Pack ID: {pack_id}
Generated: {_now_iso()}
Protocol: {PROTOCOL_VERSION}
Visibility: {visibility_level}

This pack is aligned to:
- TrustSlip merchant visibility policy
- recent TrustEvent evidence
- current support/capacity context
- current readiness/explainability context

Files:
- manifest.json
- trustslip_snapshot.json
- trust_timeline.pdf (if PDF builder available)

Evidence note:
{LIMITATION_STATEMENT}

Privacy note:
This portable pack uses the selected TrustSlip visibility level. It does not
include private contact details, raw TrustEvent metadata, payment references, or
complete TrustSlip internals.
"""
    files["README.txt"] = readme_text.encode("utf-8")

    if build_trust_timeline_pdf is not None:
        try:
            pdf_bytes = build_trust_timeline_pdf(
                db,
                user_id=int(current_user.id),
                limit=50,
                audience="user",
                pack_id=pack_id,
                protocol_version=PROTOCOL_VERSION,
                footer=f"{DEFAULT_FOOTER} | Visibility: {visibility_level}",
                score=_safe_str(summary.get("trust_score") or summary.get("standing_score"), None),  # type: ignore[arg-type]
                last_change=None,
            )
            files[f"trust_timeline_{visibility_level}.pdf"] = pdf_bytes
        except Exception:
            pass

    checksums: dict[str, str] = {}
    for name, blob in files.items():
        checksums[name] = _sha256_hex(blob)

    checksums_bytes = _json_bytes(
        {
            "pack_id": pack_id,
            "generated_at_utc": _now_iso(),
            "checksums": checksums,
        }
    )
    files["checksums.json"] = checksums_bytes

    zip_buf = BytesIO()
    with ZipFile(zip_buf, mode="w", compression=ZIP_DEFLATED) as zf:
        for name, blob in files.items():
            zf.writestr(name, blob)

    return zip_buf.getvalue()
