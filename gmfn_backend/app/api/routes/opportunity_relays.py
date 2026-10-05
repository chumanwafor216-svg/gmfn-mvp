from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.schemas.opportunity_relays import (
    OpportunityRelayDeclineIn,
    OpportunityRelayOfferListOut,
    OpportunityRelayOfferOut,
    OpportunityRelayRunOut,
    RelayCandidateSummaryOut,
)
from app.services.opportunity_relay_service import (
    RelayConflict,
    RelayForbidden,
    RelayNotFound,
    RelayUnavailable,
    accept_relay_offer,
    create_relay_run_for_demand,
    decline_relay_offer,
    discover_relay_target_candidates,
    list_my_relay_offers,
    relay_run_to_private_response,
)

router = APIRouter(tags=["opportunity-relays"])


def _raise_for_relay_error(exc: Exception) -> None:
    if isinstance(exc, RelayNotFound):
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if isinstance(exc, RelayForbidden):
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    if isinstance(exc, RelayUnavailable):
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if isinstance(exc, RelayConflict):
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    raise exc


@router.get(
    "/marketplace/requests/{request_id}/relay-candidates",
    response_model=RelayCandidateSummaryOut,
)
def get_marketplace_request_relay_candidates(
    request_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        candidates = discover_relay_target_candidates(
            db,
            request_id=int(request_id),
            current_user_id=int(current_user.id),
        )
    except Exception as exc:
        _raise_for_relay_error(exc)
        raise
    return RelayCandidateSummaryOut(
        request_id=int(request_id),
        has_relay_candidate=bool(candidates),
    )


@router.post(
    "/marketplace/requests/{request_id}/relay-runs",
    response_model=OpportunityRelayRunOut,
)
def create_marketplace_request_relay_run(
    request_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        run = create_relay_run_for_demand(
            db,
            request_id=int(request_id),
            current_user_id=int(current_user.id),
        )
    except Exception as exc:
        _raise_for_relay_error(exc)
        raise
    return OpportunityRelayRunOut(**relay_run_to_private_response(db, run))


@router.get("/opportunity-relays/me/offers", response_model=OpportunityRelayOfferListOut)
def get_my_opportunity_relay_offers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offers = [OpportunityRelayOfferOut(**item) for item in list_my_relay_offers(db, current_user_id=int(current_user.id))]
    return OpportunityRelayOfferListOut(count=len(offers), offers=offers)


@router.post(
    "/opportunity-relays/offers/{offer_id}/accept",
    response_model=OpportunityRelayRunOut,
)
def accept_my_opportunity_relay_offer(
    offer_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        run = accept_relay_offer(
            db,
            offer_id=int(offer_id),
            current_user_id=int(current_user.id),
        )
    except Exception as exc:
        _raise_for_relay_error(exc)
        raise
    return OpportunityRelayRunOut(**relay_run_to_private_response(db, run))


@router.post(
    "/opportunity-relays/offers/{offer_id}/decline",
    response_model=OpportunityRelayOfferOut,
)
def decline_my_opportunity_relay_offer(
    payload: OpportunityRelayDeclineIn,
    offer_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        offer = decline_relay_offer(
            db,
            offer_id=int(offer_id),
            current_user_id=int(current_user.id),
            decline_reason=payload.decline_reason,
        )
    except Exception as exc:
        _raise_for_relay_error(exc)
        raise
    from app.services.opportunity_relay_service import relay_offer_to_bridge_payload

    return OpportunityRelayOfferOut(**relay_offer_to_bridge_payload(db, offer))
