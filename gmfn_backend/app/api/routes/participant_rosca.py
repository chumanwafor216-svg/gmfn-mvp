from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.schemas.participant_rosca import (
    RoscaContributionRecordIn,
    RoscaObligationOut,
    RoscaParticipantAcceptIn,
    RoscaParticipantDeclineIn,
    RoscaParticipantInviteIn,
    RoscaParticipantOut,
    RoscaRunDraftIn,
    RoscaRunListOut,
    RoscaRunOut,
    RoscaRunTermsUpdateIn,
)
from app.services.participant_rosca_service import (
    ParticipantRoscaConflict,
    ParticipantRoscaForbidden,
    ParticipantRoscaNotFound,
    ParticipantRoscaValidation,
    accept_invitation,
    activate_run,
    create_draft_run,
    cancel_run,
    decline_invitation,
    get_visible_run,
    invite_participant,
    list_my_runs,
    obligation_to_response,
    participant_to_response,
    record_contribution,
    revoke_invitation,
    run_to_response,
    update_run_terms,
)

router = APIRouter(prefix="/rosca-runs", tags=["participant-rosca"])


def _raise_rosca_error(exc: Exception) -> None:
    if isinstance(exc, ParticipantRoscaNotFound):
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if isinstance(exc, ParticipantRoscaForbidden):
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    if isinstance(exc, ParticipantRoscaConflict):
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if isinstance(exc, ParticipantRoscaValidation):
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    raise exc


@router.post("/drafts", response_model=RoscaRunOut)
def create_participant_rosca_draft(
    payload: RoscaRunDraftIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        run = create_draft_run(db, current_user_id=int(current_user.id), payload=payload)
    except Exception as exc:
        _raise_rosca_error(exc)
        raise
    return RoscaRunOut(**run_to_response(db, run))


@router.get("/me", response_model=RoscaRunListOut)
def list_my_participant_rosca_runs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    runs = list_my_runs(db, current_user_id=int(current_user.id))
    return RoscaRunListOut(count=len(runs), runs=[RoscaRunOut(**run_to_response(db, run, include_obligations=False)) for run in runs])


@router.get("/{run_id}", response_model=RoscaRunOut)
def get_participant_rosca_run(
    run_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        run = get_visible_run(db, run_id=int(run_id), current_user_id=int(current_user.id))
    except Exception as exc:
        _raise_rosca_error(exc)
        raise
    return RoscaRunOut(**run_to_response(db, run))


@router.patch("/{run_id}/terms", response_model=RoscaRunOut)
def update_participant_rosca_terms(
    payload: RoscaRunTermsUpdateIn,
    run_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        run = update_run_terms(db, run_id=int(run_id), current_user_id=int(current_user.id), payload=payload)
    except Exception as exc:
        _raise_rosca_error(exc)
        raise
    return RoscaRunOut(**run_to_response(db, run))


@router.post("/{run_id}/invitations", response_model=RoscaParticipantOut)
def invite_participant_to_rosca(
    payload: RoscaParticipantInviteIn,
    run_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        participant = invite_participant(db, run_id=int(run_id), current_user_id=int(current_user.id), payload=payload)
    except Exception as exc:
        _raise_rosca_error(exc)
        raise
    return RoscaParticipantOut(**participant_to_response(participant))


@router.post("/{run_id}/participants/me/accept", response_model=RoscaParticipantOut)
def accept_participant_rosca_invitation(
    payload: RoscaParticipantAcceptIn,
    run_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        participant = accept_invitation(db, run_id=int(run_id), current_user_id=int(current_user.id), payload=payload)
    except Exception as exc:
        _raise_rosca_error(exc)
        raise
    return RoscaParticipantOut(**participant_to_response(participant))


@router.post("/{run_id}/participants/me/decline", response_model=RoscaParticipantOut)
def decline_participant_rosca_invitation(
    payload: RoscaParticipantDeclineIn,
    run_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        participant = decline_invitation(db, run_id=int(run_id), current_user_id=int(current_user.id), payload=payload)
    except Exception as exc:
        _raise_rosca_error(exc)
        raise
    return RoscaParticipantOut(**participant_to_response(participant))


@router.post("/{run_id}/participants/{participant_id}/revoke", response_model=RoscaParticipantOut)
def revoke_participant_rosca_invitation(
    run_id: int = Path(..., ge=1),
    participant_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        participant = revoke_invitation(
            db,
            run_id=int(run_id),
            participant_id=int(participant_id),
            current_user_id=int(current_user.id),
        )
    except Exception as exc:
        _raise_rosca_error(exc)
        raise
    return RoscaParticipantOut(**participant_to_response(participant))


@router.post("/{run_id}/cancel", response_model=RoscaRunOut)
def cancel_participant_rosca_run(
    run_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        run = cancel_run(db, run_id=int(run_id), current_user_id=int(current_user.id))
    except Exception as exc:
        _raise_rosca_error(exc)
        raise
    return RoscaRunOut(**run_to_response(db, run))

@router.post("/{run_id}/activate", response_model=RoscaRunOut)
def activate_participant_rosca_run(
    run_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        run = activate_run(db, run_id=int(run_id), current_user_id=int(current_user.id))
    except Exception as exc:
        _raise_rosca_error(exc)
        raise
    return RoscaRunOut(**run_to_response(db, run))


@router.post("/{run_id}/obligations/{obligation_id}/contribution-records", response_model=RoscaObligationOut)
def record_participant_rosca_contribution(
    payload: RoscaContributionRecordIn,
    run_id: int = Path(..., ge=1),
    obligation_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        obligation = record_contribution(
            db,
            run_id=int(run_id),
            obligation_id=int(obligation_id),
            current_user_id=int(current_user.id),
            payload=payload,
        )
    except Exception as exc:
        _raise_rosca_error(exc)
        raise
    return RoscaObligationOut(**obligation_to_response(obligation))
