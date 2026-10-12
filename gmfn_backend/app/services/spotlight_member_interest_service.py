from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Iterable

from sqlalchemy.orm import Session

from app.db.models import SpotlightCampaign, UserSettings

SPOTLIGHT_INTEREST_EMPLOYMENT = "employment"
SPOTLIGHT_INTEREST_BUSINESS_SERVICE = "business_service"
SPOTLIGHT_INTEREST_PRODUCT = "product"
SPOTLIGHT_INTEREST_PROPERTY = "property"
SPOTLIGHT_INTEREST_EDUCATION_TRAINING = "education_training"
SPOTLIGHT_INTEREST_PROFESSIONAL_SERVICE = "professional_service"
SPOTLIGHT_INTEREST_COMMUNITY_SUPPORT = "community_support"
SPOTLIGHT_INTEREST_EVENT = "event"
SPOTLIGHT_INTEREST_VOLUNTEERING = "volunteering"
SPOTLIGHT_INTEREST_BUY_SELL = "buy_sell"

SUPPORTED_SPOTLIGHT_INTERESTS = (
    SPOTLIGHT_INTEREST_EMPLOYMENT,
    SPOTLIGHT_INTEREST_BUSINESS_SERVICE,
    SPOTLIGHT_INTEREST_PRODUCT,
    SPOTLIGHT_INTEREST_PROPERTY,
    SPOTLIGHT_INTEREST_EDUCATION_TRAINING,
    SPOTLIGHT_INTEREST_PROFESSIONAL_SERVICE,
    SPOTLIGHT_INTEREST_COMMUNITY_SUPPORT,
    SPOTLIGHT_INTEREST_EVENT,
    SPOTLIGHT_INTEREST_VOLUNTEERING,
    SPOTLIGHT_INTEREST_BUY_SELL,
)
SUPPORTED_SPOTLIGHT_INTEREST_SET = set(SUPPORTED_SPOTLIGHT_INTERESTS)

REASON_EXPLICIT_INTEREST_CATEGORY_MATCH = "explicit_interest_category_match"


@dataclass(frozen=True)
class SpotlightInterestRelevanceResult:
    campaign_id: int
    relevant: bool
    campaign_category: str
    matched_interests: tuple[str, ...] = ()
    selected_interests: tuple[str, ...] = ()
    positive_reasons: tuple[str, ...] = ()
    privacy: str = "private_internal_preference_signal"

    def to_internal_dict(self) -> dict[str, Any]:
        return {
            "campaign_id": self.campaign_id,
            "relevant": self.relevant,
            "campaign_category": self.campaign_category,
            "matched_interests": list(self.matched_interests),
            "selected_interests": list(self.selected_interests),
            "positive_reasons": list(self.positive_reasons),
            "privacy": self.privacy,
        }


def normalize_spotlight_interests(values: Any) -> tuple[str, ...]:
    if values is None:
        return ()
    if not isinstance(values, list):
        raise ValueError("spotlightInterests must be a list")
    normalized: list[str] = []
    seen: set[str] = set()
    for value in values:
        text = str(value or "").strip().lower()
        if not text:
            continue
        if text not in SUPPORTED_SPOTLIGHT_INTEREST_SET:
            raise ValueError(f"Unsupported spotlight interest: {text}")
        if text in seen:
            continue
        seen.add(text)
        normalized.append(text)
    return tuple(normalized)


def serialize_spotlight_interests(values: Any) -> str:
    return json.dumps(list(normalize_spotlight_interests(values)), separators=(",", ":"), sort_keys=True)


def parse_spotlight_interests(raw: Any) -> tuple[str, ...]:
    if not raw:
        return ()
    try:
        parsed = json.loads(str(raw))
    except Exception:
        return ()
    try:
        return normalize_spotlight_interests(parsed)
    except ValueError:
        return ()


def get_spotlight_member_interests(db: Session, *, viewer_user_id: int) -> tuple[str, ...]:
    row = (
        db.query(UserSettings.spotlight_interests_json)
        .filter(UserSettings.user_id == int(viewer_user_id))
        .first()
    )
    if row is None:
        return ()
    return parse_spotlight_interests(row[0])


def evaluate_spotlight_interest_relevance(
    db: Session,
    *,
    viewer_user_id: int,
    campaign: SpotlightCampaign,
) -> SpotlightInterestRelevanceResult:
    selected_interests = get_spotlight_member_interests(db, viewer_user_id=int(viewer_user_id))
    return evaluate_spotlight_interest_relevance_for_interests(
        campaign=campaign,
        selected_interests=selected_interests,
    )


def evaluate_spotlight_interest_relevance_batch(
    db: Session,
    *,
    viewer_user_id: int,
    campaigns: Iterable[SpotlightCampaign],
) -> dict[int, SpotlightInterestRelevanceResult]:
    selected_interests = get_spotlight_member_interests(db, viewer_user_id=int(viewer_user_id))
    return {
        int(campaign.id): evaluate_spotlight_interest_relevance_for_interests(
            campaign=campaign,
            selected_interests=selected_interests,
        )
        for campaign in campaigns
    }


def evaluate_spotlight_interest_relevance_for_interests(
    *,
    campaign: SpotlightCampaign,
    selected_interests: Iterable[str],
) -> SpotlightInterestRelevanceResult:
    campaign_id = int(getattr(campaign, "id", 0) or 0)
    campaign_category = str(getattr(campaign, "opportunity_category", "") or "").strip().lower()
    interests = normalize_spotlight_interests(list(selected_interests))
    if campaign_category in interests:
        return SpotlightInterestRelevanceResult(
            campaign_id=campaign_id,
            relevant=True,
            campaign_category=campaign_category,
            matched_interests=(campaign_category,),
            selected_interests=interests,
            positive_reasons=(REASON_EXPLICIT_INTEREST_CATEGORY_MATCH,),
        )
    return SpotlightInterestRelevanceResult(
        campaign_id=campaign_id,
        relevant=False,
        campaign_category=campaign_category or "unspecified",
        matched_interests=(),
        selected_interests=interests,
        positive_reasons=(),
    )
