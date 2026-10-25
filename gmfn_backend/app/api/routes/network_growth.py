from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.models import User
from app.deps import get_db
from app.schemas.network_growth import (
    NetworkGrowthAttributionOut,
    NetworkGrowthChallengeIn,
    NetworkGrowthClaimCreate,
    NetworkGrowthMineOut,
)
from app.services.network_growth_service import (
    accept_claim,
    challenge_claim,
    create_claim,
    list_my_claims,
    serialize_attribution,
)


router = APIRouter(prefix="/network-growth/attributions", tags=["network-growth"])


@router.post(
    "",
    response_model=NetworkGrowthAttributionOut,
    status_code=status.HTTP_201_CREATED,
    operation_id="network_growth_create_attribution_claim",
)
def create_attribution_claim(
    payload: NetworkGrowthClaimCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = create_claim(db, actor_user_id=int(user.id), payload=payload)
    return serialize_attribution(db, row, include_activation=False)


@router.get(
    "/mine",
    response_model=NetworkGrowthMineOut,
    operation_id="network_growth_list_my_attributions",
)
def get_my_attributions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return list_my_claims(db, user_id=int(user.id))


@router.post(
    "/{claim_id}/accept",
    response_model=NetworkGrowthAttributionOut,
    operation_id="network_growth_accept_attribution",
)
def accept_attribution(
    claim_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = accept_claim(db, claim_id=claim_id, participant_user_id=int(user.id))
    return serialize_attribution(db, row, include_activation=True)


@router.post(
    "/{claim_id}/challenge",
    response_model=NetworkGrowthAttributionOut,
    operation_id="network_growth_challenge_attribution",
)
def challenge_attribution(
    claim_id: int,
    payload: NetworkGrowthChallengeIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = challenge_claim(
        db,
        claim_id=claim_id,
        participant_user_id=int(user.id),
        reason=payload.reason,
    )
    return serialize_attribution(db, row, include_activation=True)
