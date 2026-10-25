from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import (
    Clan,
    ClanInvite,
    ClanMembership,
    MarketplaceShop,
    NetworkGrowthAttribution,
    ProtectedTradeRecord,
    SpotlightCampaign,
    User,
)
from app.schemas.network_growth import NetworkGrowthClaimCreate
from app.services.global_identity_service import ensure_user_gmfn_id


FINANCIAL_BOUNDARY = (
    "This introduction record creates no reward, commission, payout, residual, "
    "employment, territory, payment, publishing authority, or advertiser authority."
)
ACTIVATION_BOUNDARY = (
    "These are existing GSN records, not reward eligibility, proof of payment, "
    "proof of sale, or proof that the claimant caused the later activity."
)
MINE_BOUNDARY = (
    "Only the participant can confirm or challenge an introduction. A confirmation "
    "records attribution only and has no financial effect."
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _person(db: Session, user_id: int) -> dict:
    user = db.get(User, int(user_id))
    if not user:
        return {"user_id": int(user_id), "gsn_id": None, "display_name": "GSN member"}
    return {
        "user_id": int(user.id),
        "gsn_id": str(user.gmfn_id or "").strip() or None,
        "display_name": str(user.display_name or "").strip() or "GSN member",
    }


def _authority(status: str) -> str:
    return {
        "accepted": "participant_confirmed",
        "challenged": "participant_challenged",
        "superseded": "superseded_by_participant_choice",
    }.get(status, "awaiting_participant")


def _milestone(count: int, first_at: datetime | None, source: str) -> dict:
    return {
        "recorded": count > 0,
        "count": int(count),
        "first_recorded_at": first_at,
        "evidence_source": source,
    }


def activation_evidence(db: Session, participant_user_id: int) -> dict:
    membership_count, membership_first = (
        db.query(func.count(ClanMembership.id), func.min(ClanMembership.created_at))
        .filter(ClanMembership.user_id == participant_user_id)
        .one()
    )
    shop_count, shop_first = (
        db.query(func.count(MarketplaceShop.id), func.min(MarketplaceShop.created_at))
        .filter(MarketplaceShop.owner_user_id == participant_user_id)
        .one()
    )
    campaign_count, campaign_first = (
        db.query(func.count(SpotlightCampaign.id), func.min(SpotlightCampaign.activated_at))
        .filter(
            SpotlightCampaign.owner_user_id == participant_user_id,
            SpotlightCampaign.source_kind != "gsn_house",
        )
        .one()
    )
    trade_count, trade_first = (
        db.query(func.count(ProtectedTradeRecord.id), func.min(ProtectedTradeRecord.created_at))
        .filter(
            or_(
                ProtectedTradeRecord.seller_user_id == participant_user_id,
                ProtectedTradeRecord.buyer_user_id == participant_user_id,
            )
        )
        .one()
    )
    return {
        "community_membership": _milestone(membership_count, membership_first, "clan_memberships"),
        "shop_created": _milestone(shop_count, shop_first, "marketplace_shops"),
        "spotlight_campaign_activated": _milestone(
            campaign_count, campaign_first, "spotlight_campaigns"
        ),
        "protected_trade_recorded": _milestone(
            trade_count, trade_first, "protected_trade_records"
        ),
        "boundary": ACTIVATION_BOUNDARY,
    }


def serialize_attribution(
    db: Session,
    row: NetworkGrowthAttribution,
    *,
    include_activation: bool,
) -> dict:
    return {
        "id": int(row.id),
        "status": row.status,
        "authority": _authority(row.status),
        "source_kind": row.source_kind,
        "participant_kind": row.participant_kind,
        "source_reference": row.source_reference,
        "evidence_note": row.evidence_note,
        "source_evidence_status": row.source_evidence_status,
        "clan_id": row.clan_id,
        "invite_id": row.invite_id,
        "participant": _person(db, int(row.participant_user_id)),
        "claimant": _person(db, int(row.claimant_user_id)),
        "created_at": row.created_at,
        "accepted_at": row.accepted_at,
        "challenged_at": row.challenged_at,
        "challenge_reason": row.challenge_reason,
        "activation_evidence": (
            activation_evidence(db, int(row.participant_user_id))
            if include_activation
            else None
        ),
        "financial_effect": "none",
        "financial_boundary": FINANCIAL_BOUNDARY,
    }


def _claim_fingerprint(
    *,
    participant_user_id: int,
    claimant_user_id: int,
    source_kind: str,
    source_reference: str | None,
    clan_id: int | None,
    invite_id: int | None,
) -> str:
    canonical = json.dumps(
        {
            "participant_user_id": participant_user_id,
            "claimant_user_id": claimant_user_id,
            "source_kind": source_kind,
            "source_reference": (source_reference or "").strip().lower(),
            "clan_id": clan_id,
            "invite_id": invite_id,
        },
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _validate_source(
    db: Session,
    *,
    actor: User,
    participant: User,
    payload: NetworkGrowthClaimCreate,
) -> tuple[int | None, str]:
    clan_id = payload.clan_id
    if payload.source_kind in {"community_invite", "community_qr"}:
        if payload.invite_id is None:
            raise HTTPException(status_code=422, detail="This source requires the exact invite record.")
        invite = db.get(ClanInvite, int(payload.invite_id))
        if not invite or int(invite.created_by_user_id) != int(actor.id):
            raise HTTPException(status_code=403, detail="This invite does not prove your introduction.")
        membership = (
            db.query(ClanMembership)
            .filter(
                ClanMembership.user_id == int(participant.id),
                ClanMembership.invite_id == int(invite.id),
            )
            .first()
        )
        if not membership:
            raise HTTPException(
                status_code=409,
                detail="GSN has no membership record linking this participant to that invite.",
            )
        if payload.source_kind == "community_qr" and not invite.qr_policy_key:
            raise HTTPException(status_code=409, detail="That invite is not recorded as a QR entry.")
        if clan_id is not None and int(clan_id) != int(invite.clan_id):
            raise HTTPException(status_code=409, detail="The community and invite do not match.")
        return int(invite.clan_id), "verified_invite_record"

    if payload.invite_id is not None:
        raise HTTPException(
            status_code=422,
            detail="An invite record can be attached only to an invite or QR source.",
        )
    if payload.source_kind == "social_campaign" and not payload.source_reference:
        raise HTTPException(status_code=422, detail="A social campaign reference is required.")
    if not payload.source_reference and not payload.evidence_note:
        raise HTTPException(
            status_code=422,
            detail="Add a source reference or a short explanation of the introduction.",
        )
    if clan_id is not None:
        clan = db.get(Clan, int(clan_id))
        if not clan:
            raise HTTPException(status_code=404, detail="Community not found.")
        is_member = (
            db.query(ClanMembership.id)
            .filter(
                ClanMembership.clan_id == int(clan_id),
                ClanMembership.user_id == int(actor.id),
                ClanMembership.left_at.is_(None),
            )
            .first()
        )
        if not is_member and str(actor.role or "").lower() not in {"admin", "superadmin"}:
            raise HTTPException(status_code=403, detail="You cannot claim this community context.")
    return clan_id, "claimant_statement"


def create_claim(
    db: Session,
    *,
    actor_user_id: int,
    payload: NetworkGrowthClaimCreate,
) -> NetworkGrowthAttribution:
    actor = db.get(User, int(actor_user_id))
    if not actor:
        raise HTTPException(status_code=401, detail="Authenticated GSN member not found.")
    actor = ensure_user_gmfn_id(db, actor)
    participant_gsn_id = payload.participant_gsn_id.strip().upper()
    participant = (
        db.query(User)
        .filter(func.upper(User.gmfn_id) == participant_gsn_id)
        .first()
    )
    if not participant:
        raise HTTPException(status_code=404, detail="No GSN member has that GSN ID.")
    if int(participant.id) == int(actor.id):
        raise HTTPException(status_code=409, detail="You cannot attribute your own entry to yourself.")

    clan_id, evidence_status = _validate_source(
        db,
        actor=actor,
        participant=participant,
        payload=payload,
    )
    fingerprint = _claim_fingerprint(
        participant_user_id=int(participant.id),
        claimant_user_id=int(actor.id),
        source_kind=payload.source_kind,
        source_reference=payload.source_reference,
        clan_id=clan_id,
        invite_id=payload.invite_id,
    )
    same = (
        db.query(NetworkGrowthAttribution)
        .filter(NetworkGrowthAttribution.claim_fingerprint == fingerprint)
        .first()
    )
    if same:
        return same
    accepted = (
        db.query(NetworkGrowthAttribution.id)
        .filter(
            NetworkGrowthAttribution.participant_user_id == int(participant.id),
            NetworkGrowthAttribution.status == "accepted",
        )
        .first()
    )
    if accepted:
        raise HTTPException(
            status_code=409,
            detail="This member has already confirmed who introduced them to GSN.",
        )
    pending_count = (
        db.query(func.count(NetworkGrowthAttribution.id))
        .filter(
            NetworkGrowthAttribution.claimant_user_id == int(actor.id),
            NetworkGrowthAttribution.status == "pending",
        )
        .scalar()
    )
    if int(pending_count or 0) >= 20:
        raise HTTPException(
            status_code=429,
            detail="Resolve or wait for decisions on existing introduction claims first.",
        )

    row = NetworkGrowthAttribution(
        claim_fingerprint=fingerprint,
        participant_user_id=int(participant.id),
        claimant_user_id=int(actor.id),
        source_kind=payload.source_kind,
        participant_kind=payload.participant_kind,
        source_reference=payload.source_reference,
        evidence_note=payload.evidence_note,
        source_evidence_status=evidence_status,
        clan_id=clan_id,
        invite_id=payload.invite_id,
        status="pending",
    )
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        same = (
            db.query(NetworkGrowthAttribution)
            .filter(NetworkGrowthAttribution.claim_fingerprint == fingerprint)
            .first()
        )
        if same:
            return same
        raise HTTPException(status_code=409, detail="This introduction claim conflicts with an existing record.")
    db.refresh(row)
    return row


def list_my_claims(db: Session, *, user_id: int) -> dict:
    incoming = (
        db.query(NetworkGrowthAttribution)
        .filter(NetworkGrowthAttribution.participant_user_id == int(user_id))
        .order_by(NetworkGrowthAttribution.created_at.desc(), NetworkGrowthAttribution.id.desc())
        .all()
    )
    outgoing = (
        db.query(NetworkGrowthAttribution)
        .filter(NetworkGrowthAttribution.claimant_user_id == int(user_id))
        .order_by(NetworkGrowthAttribution.created_at.desc(), NetworkGrowthAttribution.id.desc())
        .all()
    )
    return {
        "incoming": [serialize_attribution(db, row, include_activation=True) for row in incoming],
        "outgoing": [serialize_attribution(db, row, include_activation=False) for row in outgoing],
        "financial_effect": "none",
        "boundary": MINE_BOUNDARY,
    }


def accept_claim(
    db: Session,
    *,
    claim_id: int,
    participant_user_id: int,
) -> NetworkGrowthAttribution:
    row = db.get(NetworkGrowthAttribution, int(claim_id))
    if not row:
        raise HTTPException(status_code=404, detail="Introduction claim not found.")
    if int(row.participant_user_id) != int(participant_user_id):
        raise HTTPException(status_code=403, detail="Only the named participant can decide this claim.")
    if row.status == "accepted":
        return row
    if row.status != "pending":
        raise HTTPException(status_code=409, detail="This claim is no longer awaiting a decision.")

    already_accepted = (
        db.query(NetworkGrowthAttribution.id)
        .filter(
            NetworkGrowthAttribution.participant_user_id == int(participant_user_id),
            NetworkGrowthAttribution.status == "accepted",
            NetworkGrowthAttribution.id != int(row.id),
        )
        .first()
    )
    if already_accepted:
        raise HTTPException(status_code=409, detail="You have already confirmed another introduction.")

    now = _utcnow()
    db.query(NetworkGrowthAttribution).filter(
        NetworkGrowthAttribution.participant_user_id == int(participant_user_id),
        NetworkGrowthAttribution.status == "pending",
        NetworkGrowthAttribution.id != int(row.id),
    ).update(
        {"status": "superseded", "updated_at": now},
        synchronize_session=False,
    )
    row.status = "accepted"
    row.accepted_at = now
    row.updated_at = now
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Another introduction was confirmed at the same time.")
    db.refresh(row)
    return row


def challenge_claim(
    db: Session,
    *,
    claim_id: int,
    participant_user_id: int,
    reason: str,
) -> NetworkGrowthAttribution:
    row = db.get(NetworkGrowthAttribution, int(claim_id))
    if not row:
        raise HTTPException(status_code=404, detail="Introduction claim not found.")
    if int(row.participant_user_id) != int(participant_user_id):
        raise HTTPException(status_code=403, detail="Only the named participant can challenge this claim.")
    if row.status == "challenged":
        return row
    if row.status == "superseded":
        raise HTTPException(status_code=409, detail="This claim was already superseded by your confirmed choice.")
    now = _utcnow()
    row.status = "challenged"
    row.challenge_reason = reason.strip()
    row.challenged_at = now
    row.updated_at = now
    db.commit()
    db.refresh(row)
    return row
