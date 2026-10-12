from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.security import create_access_token, decode_token
from app.db.models import SpotlightCampaign
from app.services.spotlight_exposure_diversity_allocation_service import allocate_spotlight_opportunity_candidates
from app.services.spotlight_exposure_ledger_service import (
    SpotlightExposureRecordResult,
    record_spotlight_qualifying_impression,
)
from app.services.spotlight_frequency_control_service import apply_spotlight_frequency_control
from app.services.spotlight_opportunity_candidate_service import (
    SpotlightOpportunityCandidate,
    build_spotlight_opportunity_candidates,
)
from app.services.spotlight_pacing_state_service import (
    SpotlightPersistentPacingResult,
    schedule_persistent_spotlight_delivery_opportunities,
)

SPOTLIGHT_PRESENTATION_TOKEN_TYPE = "spotlight_presentation_v1"
SPOTLIGHT_PRESENTATION_SURFACE_PUBLIC_SHOP = "public_shop_spotlight_rail"
SPOTLIGHT_PRESENTATION_TOKEN_TTL_SECONDS = 10 * 60
SPOTLIGHT_PRESENTATION_ROTATION_MS = 2000
SPOTLIGHT_PRESENTATION_QUALIFYING_VISIBLE_MS = 1000
SPOTLIGHT_PRESENTATION_MIN_VISIBLE_RATIO = 0.6
SPOTLIGHT_PRESENTATION_INTERACTION_PAUSE_MS = 8000
SPOTLIGHT_PRESENTATION_REDUCED_MOTION_ROTATION_MS = 30000

PRESENTATION_REJECTION_NO_CANDIDATES = "no_canonical_candidates"
PRESENTATION_REJECTION_NO_DELIVERY_OPPORTUNITY = "no_delivery_opportunity"
PRESENTATION_REJECTION_DELIVERY_CONFLICT = "delivery_round_not_consumed"
PRESENTATION_REJECTION_INVALID_TOKEN = "invalid_presentation_token"
PRESENTATION_REJECTION_TOKEN_EXPIRED = "presentation_token_expired"
PRESENTATION_REJECTION_WRONG_VIEWER = "wrong_viewer"
PRESENTATION_REJECTION_WRONG_SURFACE = "wrong_surface"
PRESENTATION_REJECTION_OWNER_PREVIEW = "owner_preview_excluded"
PRESENTATION_REJECTION_STALE_CANDIDATE = "candidate_not_currently_presentable"
PRESENTATION_REJECTION_CAMPAIGN_NOT_ACTIVE = "campaign_not_active"


@dataclass(frozen=True)
class SpotlightPresentationPolicy:
    passive_rotation_ms: int = SPOTLIGHT_PRESENTATION_ROTATION_MS
    qualifying_visible_ms: int = SPOTLIGHT_PRESENTATION_QUALIFYING_VISIBLE_MS
    minimum_visible_ratio: float = SPOTLIGHT_PRESENTATION_MIN_VISIBLE_RATIO
    hidden_tab_pause_enabled: bool = True
    interaction_pause_enabled: bool = True
    interaction_pause_ms: int = SPOTLIGHT_PRESENTATION_INTERACTION_PAUSE_MS
    reduced_motion_handling_enabled: bool = True
    reduced_motion_rotation_ms: int = SPOTLIGHT_PRESENTATION_REDUCED_MOTION_ROTATION_MS

    def to_public_dict(self) -> dict[str, Any]:
        return {
            "passive_rotation_ms": int(self.passive_rotation_ms),
            "qualifying_visible_ms": int(self.qualifying_visible_ms),
            "minimum_visible_ratio": float(self.minimum_visible_ratio),
            "hidden_tab_pause_enabled": bool(self.hidden_tab_pause_enabled),
            "interaction_pause_enabled": bool(self.interaction_pause_enabled),
            "interaction_pause_ms": int(self.interaction_pause_ms),
            "reduced_motion_handling_enabled": bool(self.reduced_motion_handling_enabled),
            "reduced_motion_rotation_ms": int(self.reduced_motion_rotation_ms),
        }


@dataclass(frozen=True)
class SpotlightPresentationSelection:
    selected: bool
    candidate: Optional[SpotlightOpportunityCandidate] = None
    campaign: Optional[SpotlightCampaign] = None
    presentation_id: Optional[str] = None
    presentation_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    pacing_result: Optional[SpotlightPersistentPacingResult] = None
    rejection_code: Optional[str] = None
    policy: SpotlightPresentationPolicy = SpotlightPresentationPolicy()

    def to_internal_dict(self) -> dict[str, Any]:
        return {
            "selected": self.selected,
            "campaign_id": int(self.candidate.campaign_id) if self.candidate is not None else None,
            "presentation_id": self.presentation_id,
            "token_expires_at": self.token_expires_at.isoformat() if self.token_expires_at is not None else None,
            "rejection_code": self.rejection_code,
            "policy": self.policy.to_public_dict(),
            "pacing": self.pacing_result.to_internal_dict() if self.pacing_result is not None else None,
            "privacy": "private_internal_presentation_contract",
        }


@dataclass(frozen=True)
class SpotlightPresentationQualificationResult:
    accepted: bool
    recorded: bool = False
    deduped: bool = False
    event_id: Optional[int] = None
    campaign_id: Optional[int] = None
    presentation_id: Optional[str] = None
    rejection_code: Optional[str] = None
    exposure_result: Optional[SpotlightExposureRecordResult] = None
    policy: SpotlightPresentationPolicy = SpotlightPresentationPolicy()

    def to_public_dict(self) -> dict[str, Any]:
        event = self.exposure_result.event if self.exposure_result is not None else None
        return {
            "ok": bool(self.accepted),
            "recorded": bool(self.recorded),
            "deduped": bool(self.deduped),
            "event_id": int(event.id) if event is not None and event.id is not None else self.event_id,
            "campaign_id": int(self.campaign_id) if self.campaign_id is not None else None,
            "presentation_id": self.presentation_id,
            "rejection_code": self.rejection_code,
            "policy": self.policy.to_public_dict(),
            "boundary_note": "A delivery round is not a qualifying impression until the visible presentation contract is satisfied.",
        }


def presentation_policy() -> SpotlightPresentationPolicy:
    return SpotlightPresentationPolicy()


def select_spotlight_presentation(
    db: Session,
    *,
    viewer_user_id: int,
    requested_delivery_slots: int = 1,
    now: Optional[datetime] = None,
    surface: str = SPOTLIGHT_PRESENTATION_SURFACE_PUBLIC_SHOP,
) -> SpotlightPresentationSelection:
    current_time = _as_aware_utc(now) or _now_utc()
    viewer_id = int(viewer_user_id or 0)
    policy = presentation_policy()
    candidates = build_spotlight_opportunity_candidates(
        db,
        viewer_user_id=viewer_id,
        limit=50,
        now=current_time,
    )
    if not candidates:
        return SpotlightPresentationSelection(selected=False, rejection_code=PRESENTATION_REJECTION_NO_CANDIDATES, policy=policy)

    diversity = allocate_spotlight_opportunity_candidates(
        db,
        viewer_user_id=viewer_id,
        candidates=candidates,
    )
    frequency = apply_spotlight_frequency_control(
        db,
        viewer_user_id=viewer_id,
        diversity_result=diversity,
    )
    if not frequency.candidates:
        return SpotlightPresentationSelection(selected=False, rejection_code=PRESENTATION_REJECTION_STALE_CANDIDATE, policy=policy)

    pacing = schedule_persistent_spotlight_delivery_opportunities(
        db,
        viewer_user_id=viewer_id,
        frequency_result=frequency,
        requested_delivery_slots=max(int(requested_delivery_slots), 1),
        now=current_time,
    )
    consumed_ids = [int(result.campaign_id) for result in pacing.consumption_results if result.consumed]
    if not pacing.scheduled_campaign_ids:
        return SpotlightPresentationSelection(
            selected=False,
            pacing_result=pacing,
            rejection_code=PRESENTATION_REJECTION_NO_DELIVERY_OPPORTUNITY,
            policy=policy,
        )
    if not consumed_ids:
        return SpotlightPresentationSelection(
            selected=False,
            pacing_result=pacing,
            rejection_code=PRESENTATION_REJECTION_DELIVERY_CONFLICT,
            policy=policy,
        )

    selected_campaign_id = int(consumed_ids[0])
    candidate_by_id = {int(candidate.campaign_id): candidate for candidate in frequency.candidates}
    candidate = candidate_by_id.get(selected_campaign_id)
    if candidate is None:
        return SpotlightPresentationSelection(
            selected=False,
            pacing_result=pacing,
            rejection_code=PRESENTATION_REJECTION_STALE_CANDIDATE,
            policy=policy,
        )
    campaign = db.get(SpotlightCampaign, selected_campaign_id)
    if campaign is None or str(getattr(campaign, "status", "") or "") != "active":
        return SpotlightPresentationSelection(
            selected=False,
            pacing_result=pacing,
            rejection_code=PRESENTATION_REJECTION_CAMPAIGN_NOT_ACTIVE,
            policy=policy,
        )

    presentation_id = f"sp-{uuid4().hex}"
    token_expires_at = current_time + timedelta(seconds=SPOTLIGHT_PRESENTATION_TOKEN_TTL_SECONDS)
    token = create_access_token(
        {
            "typ": SPOTLIGHT_PRESENTATION_TOKEN_TYPE,
            "sid": presentation_id,
            "viewer_user_id": viewer_id,
            "campaign_id": selected_campaign_id,
            "surface": surface,
            "issued_at": current_time.isoformat(),
        },
        expires_delta=timedelta(seconds=SPOTLIGHT_PRESENTATION_TOKEN_TTL_SECONDS),
    )
    return SpotlightPresentationSelection(
        selected=True,
        candidate=candidate,
        campaign=campaign,
        presentation_id=presentation_id,
        presentation_token=token,
        token_expires_at=token_expires_at,
        pacing_result=pacing,
        policy=policy,
    )


def record_spotlight_presentation_qualification(
    db: Session,
    *,
    viewer_user_id: int,
    presentation_token: str,
    qualification_key: Optional[str] = None,
    event_at: Optional[datetime] = None,
    surface: str = SPOTLIGHT_PRESENTATION_SURFACE_PUBLIC_SHOP,
    visible_ms: Optional[int] = None,
    visible_ratio: Optional[float] = None,
    document_visible: Optional[bool] = None,
    owner_preview: bool = False,
) -> SpotlightPresentationQualificationResult:
    policy = presentation_policy()
    current_time = _as_aware_utc(event_at) or _now_utc()
    payload = _decode_presentation_token(presentation_token)
    if payload is None:
        return SpotlightPresentationQualificationResult(accepted=False, rejection_code=PRESENTATION_REJECTION_INVALID_TOKEN, policy=policy)
    if payload.get("expired") is True:
        return SpotlightPresentationQualificationResult(accepted=False, rejection_code=PRESENTATION_REJECTION_TOKEN_EXPIRED, policy=policy)
    if str(payload.get("typ") or "") != SPOTLIGHT_PRESENTATION_TOKEN_TYPE:
        return SpotlightPresentationQualificationResult(accepted=False, rejection_code=PRESENTATION_REJECTION_INVALID_TOKEN, policy=policy)

    token_viewer_id = int(payload.get("viewer_user_id") or 0)
    campaign_id = int(payload.get("campaign_id") or 0)
    presentation_id = str(payload.get("sid") or "").strip()
    token_surface = str(payload.get("surface") or "").strip()
    if token_viewer_id != int(viewer_user_id or 0):
        return SpotlightPresentationQualificationResult(accepted=False, campaign_id=campaign_id or None, presentation_id=presentation_id or None, rejection_code=PRESENTATION_REJECTION_WRONG_VIEWER, policy=policy)
    if token_surface != surface:
        return SpotlightPresentationQualificationResult(accepted=False, campaign_id=campaign_id or None, presentation_id=presentation_id or None, rejection_code=PRESENTATION_REJECTION_WRONG_SURFACE, policy=policy)
    if owner_preview:
        return SpotlightPresentationQualificationResult(accepted=False, campaign_id=campaign_id or None, presentation_id=presentation_id or None, rejection_code=PRESENTATION_REJECTION_OWNER_PREVIEW, policy=policy)

    candidate = _current_presentable_candidate(db, viewer_user_id=token_viewer_id, campaign_id=campaign_id, now=current_time)
    if candidate is None:
        return SpotlightPresentationQualificationResult(accepted=False, campaign_id=campaign_id or None, presentation_id=presentation_id or None, rejection_code=PRESENTATION_REJECTION_STALE_CANDIDATE, policy=policy)

    safe_key = str(qualification_key or "").strip()[:96]
    idempotency_key = f"{SPOTLIGHT_PRESENTATION_TOKEN_TYPE}:{presentation_id}"
    exposure = record_spotlight_qualifying_impression(
        db,
        viewer_user_id=token_viewer_id,
        candidate=candidate,
        idempotency_key=idempotency_key,
        event_at=current_time,
        presentation_surface=surface,
        presentation_context={
            "presentation_id": presentation_id,
            "qualification_key": safe_key or None,
            "visible_ms": int(visible_ms or 0),
            "visible_ratio": float(visible_ratio or 0),
            "document_visible": bool(document_visible),
            "policy": policy.to_public_dict(),
        },
        owner_preview=False,
    )
    event = exposure.event
    return SpotlightPresentationQualificationResult(
        accepted=bool(exposure.recorded or exposure.deduped),
        recorded=bool(exposure.recorded),
        deduped=bool(exposure.deduped),
        event_id=int(event.id) if event is not None and event.id is not None else None,
        campaign_id=campaign_id,
        presentation_id=presentation_id,
        rejection_code=exposure.rejection_code,
        exposure_result=exposure,
        policy=policy,
    )


def _current_presentable_candidate(
    db: Session,
    *,
    viewer_user_id: int,
    campaign_id: int,
    now: datetime,
) -> Optional[SpotlightOpportunityCandidate]:
    if int(campaign_id or 0) <= 0:
        return None
    candidates = build_spotlight_opportunity_candidates(
        db,
        viewer_user_id=int(viewer_user_id),
        campaign_ids=[int(campaign_id)],
        limit=1,
        now=now,
    )
    if not candidates:
        return None
    diversity = allocate_spotlight_opportunity_candidates(
        db,
        viewer_user_id=int(viewer_user_id),
        candidates=candidates,
    )
    frequency = apply_spotlight_frequency_control(
        db,
        viewer_user_id=int(viewer_user_id),
        diversity_result=diversity,
    )
    for candidate in frequency.candidates:
        if int(candidate.campaign_id) == int(campaign_id):
            return candidate
    return None


def _decode_presentation_token(token: str) -> Optional[dict[str, Any]]:
    value = str(token or "").strip()
    if not value:
        return None
    try:
        return decode_token(value)
    except Exception as exc:
        if exc.__class__.__name__.lower().endswith("expiredsignatureerror"):
            return {"expired": True}
        return None


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _as_aware_utc(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, str):
        normalized = value.strip()
        if not normalized:
            return None
        if normalized.endswith("Z"):
            normalized = f"{normalized[:-1]}+00:00"
        try:
            value = datetime.fromisoformat(normalized)
        except ValueError:
            return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)
