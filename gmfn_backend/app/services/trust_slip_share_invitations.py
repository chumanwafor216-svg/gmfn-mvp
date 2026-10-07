from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timezone
from typing import Any, Mapping, Optional

from sqlalchemy.orm import Session

from app.db.models import Clan, ClanMembership, TrustSlip, TrustSlipShareInvitation
from app.services.trust_slip_decision_packs import normalize_decision_pack_context

TOKEN_BYTES = 18
TOKEN_MAX_LENGTH = 96
VALID_SCOPES = {"community_specific", "all_visible_communities", "all_visible", "public_decision_pack"}


def _clean(value: Any, *, limit: int = 500) -> str:
    text = str(value if value is not None else "").strip()
    if not text:
        return ""
    text = " ".join(text.split())
    return text[:limit]


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def generate_share_token() -> str:
    return secrets.token_urlsafe(TOKEN_BYTES).rstrip("=")


def hash_share_token(token: str) -> str:
    clean = _clean(token, limit=TOKEN_MAX_LENGTH)
    return hashlib.sha256(clean.encode("utf-8")).hexdigest()


def validate_share_token(token: str) -> str:
    clean = _clean(token, limit=TOKEN_MAX_LENGTH)
    if not clean or len(clean) > TOKEN_MAX_LENGTH:
        raise ValueError("invalid_share_token")
    allowed = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
    if any(char not in allowed for char in clean):
        raise ValueError("invalid_share_token")
    return clean


def canonical_scope(value: Any, *, default: str = "public_decision_pack") -> str:
    scope = _clean(value, limit=64)
    if scope == "all_visible":
        return "all_visible_communities"
    return scope if scope in VALID_SCOPES else default


def _community_label(clan: Optional[Clan]) -> str:
    if not clan:
        return ""
    return (
        _clean(getattr(clan, "marketplace_name", ""), limit=180)
        or _clean(getattr(clan, "name", ""), limit=180)
        or _clean(getattr(clan, "community_code", ""), limit=120)
        or f"Community {getattr(clan, 'id', '')}"
    )


def resolve_verification_community(
    db: Session,
    *,
    slip: TrustSlip,
    holder_user_id: int,
    verification_community_id: Any = None,
    verification_community_ref: Any = None,
    scope: str = "community_specific",
) -> Optional[Clan]:
    if scope not in {"community_specific", "all_visible_communities"}:
        return None

    clean_id = _clean(verification_community_id, limit=32)
    clean_ref = _clean(verification_community_ref, limit=120)
    clan: Optional[Clan] = None

    if clean_id:
        try:
            numeric_id = int(clean_id)
        except ValueError as exc:
            raise ValueError("invalid_verification_community") from exc
        if numeric_id <= 0:
            raise ValueError("invalid_verification_community")
        clan = db.get(Clan, numeric_id)
        if not clan:
            raise ValueError("invalid_verification_community")

    if clean_ref:
        by_ref = db.query(Clan).filter(Clan.community_code == clean_ref).first()
        if not by_ref:
            raise ValueError("invalid_verification_community")
        if clan and int(clan.id) != int(by_ref.id):
            raise ValueError("invalid_verification_community")
        clan = by_ref

    if not clan:
        clan = db.get(Clan, int(getattr(slip, "clan_id", 0) or 0))
    if not clan:
        raise ValueError("invalid_verification_community")

    if int(clan.id) == int(getattr(slip, "clan_id", 0) or 0):
        return clan

    membership = (
        db.query(ClanMembership.id)
        .filter(
            ClanMembership.clan_id == int(clan.id),
            ClanMembership.user_id == int(holder_user_id),
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    if not membership:
        raise ValueError("holder_not_member_of_verification_community")
    return clan


def scope_label(scope: str, clan: Optional[Clan]) -> str:
    label = _community_label(clan)
    if scope == "community_specific" and label:
        return f"This community: {label}"
    if scope == "all_visible_communities":
        return "All visible community context"
    return "Public Decision Pack"


def scope_boundary(scope: str, clan: Optional[Clan]) -> str:
    label = _community_label(clan)
    if scope == "community_specific" and label:
        return f"Live confirmation requests should be answered by {label}. Other communities are not treated as giving the same judgement."
    if scope == "all_visible_communities":
        if label:
            return f"All visible context can travel with the link, but this TrustSlip is still issued from {label}. It is not proof that every community gives the same judgement."
        return "All visible context can travel with the link, but it is not proof that every community gives the same judgement."
    return "The public link maps the decision question to possible GSN evidence sources; it does not expose private records or replace live confirmation."


def create_share_invitation(
    db: Session,
    *,
    slip: TrustSlip,
    context_params: Mapping[str, Any],
    verification_community_id: Any = None,
    verification_community_ref: Any = None,
    expires_at: Optional[datetime] = None,
) -> tuple[TrustSlipShareInvitation, str]:
    access_scope = canonical_scope(context_params.get("access_scope"), default="public_decision_pack")
    verification_scope = canonical_scope(
        context_params.get("verification_scope") or access_scope,
        default=access_scope,
    )
    context = normalize_decision_pack_context(
        {
            "decision_pack": context_params.get("decision_pack") or context_params.get("decision_pack_key"),
            "access_scope": access_scope,
        }
    )
    if not context:
        raise ValueError("invalid_decision_pack")

    clan = resolve_verification_community(
        db,
        slip=slip,
        holder_user_id=int(getattr(slip, "holder_user_id", 0) or 0),
        verification_community_id=verification_community_id,
        verification_community_ref=verification_community_ref,
        scope=verification_scope,
    )
    token = generate_share_token()
    row = TrustSlipShareInvitation(
        share_token_hash=hash_share_token(token),
        share_token_prefix=token[:8],
        trust_slip_id=int(slip.id),
        clan_id=int(getattr(slip, "clan_id", 0) or 0) or None,
        holder_user_id=int(getattr(slip, "holder_user_id", 0) or 0) or None,
        verification_community_id=int(clan.id) if clan else None,
        code_at_issue=str(slip.code),
        decision_pack_key=context["decision_pack_key"],
        access_purpose=context["access_purpose"],
        recipient_question=context["recipient_question"],
        decision_focus=context["decision_focus"],
        access_scope=access_scope,
        verification_scope=verification_scope,
        verification_scope_label=scope_label(verification_scope, clan),
        verification_scope_boundary=scope_boundary(verification_scope, clan),
        verification_community_label=_community_label(clan),
        verification_community_ref=_clean(getattr(clan, "community_code", ""), limit=120) if clan else None,
        status="active",
        expires_at=expires_at,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row, token


def resolve_share_invitation(db: Session, token: str) -> TrustSlipShareInvitation:
    clean = validate_share_token(token)
    row = (
        db.query(TrustSlipShareInvitation)
        .filter(TrustSlipShareInvitation.share_token_hash == hash_share_token(clean))
        .first()
    )
    if not row:
        raise ValueError("trustslip_share_invitation_not_found")
    return row


def decision_context_from_share(row: TrustSlipShareInvitation) -> dict[str, Any]:
    context = normalize_decision_pack_context(
        {
            "decision_pack": row.decision_pack_key,
            "access_scope": row.access_scope,
        }
    ) or {}
    context.update(
        {
            "decision_pack_key": row.decision_pack_key,
            "access_purpose": row.access_purpose,
            "recipient_question": row.recipient_question,
            "decision_focus": row.decision_focus,
            "access_scope": row.access_scope,
            "verification_scope": row.verification_scope,
            "verification_scope_label": row.verification_scope_label,
            "verification_scope_boundary": row.verification_scope_boundary,
            "verification_community_id": row.verification_community_id,
            "verification_community_label": row.verification_community_label,
            "verification_community_ref": row.verification_community_ref,
        }
    )
    return context


def share_invitation_public_payload(row: TrustSlipShareInvitation, *, token_path: str) -> dict[str, Any]:
    created_at = getattr(row, "created_at", None)
    expires_at = getattr(row, "expires_at", None)
    revoked_at = getattr(row, "revoked_at", None)
    return {
        "id": int(row.id),
        "path": token_path,
        "status": _clean(row.status, limit=32),
        "code": _clean(row.code_at_issue, limit=64),
        "decision_pack": _clean(row.decision_pack_key, limit=64),
        "access_purpose": _clean(row.access_purpose, limit=160),
        "recipient_question": _clean(row.recipient_question, limit=280),
        "decision_focus": _clean(row.decision_focus, limit=360),
        "access_scope": _clean(row.access_scope, limit=64),
        "verification_scope": _clean(row.verification_scope, limit=64),
        "verification_scope_label": _clean(row.verification_scope_label, limit=180),
        "verification_scope_boundary": _clean(row.verification_scope_boundary, limit=520),
        "verification_community_id": int(row.verification_community_id) if row.verification_community_id else None,
        "verification_community_label": _clean(row.verification_community_label, limit=180),
        "verification_community_ref": _clean(row.verification_community_ref, limit=120),
        "created_at": created_at.isoformat() if created_at else None,
        "expires_at": expires_at.isoformat() if expires_at else None,
        "revoked_at": revoked_at.isoformat() if revoked_at else None,
    }


def share_is_expired(row: TrustSlipShareInvitation) -> bool:
    expires_at = getattr(row, "expires_at", None)
    if not expires_at:
        return False
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at < _now_utc()
