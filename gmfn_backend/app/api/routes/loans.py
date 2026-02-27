from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter(prefix="/loans", tags=["loans"])


class ListOut(BaseModel):
    items: List[Dict[str, Any]] = Field(default_factory=list)
    total: int = 0


class LoanCreateIn(BaseModel):
    clan_id: int
    amount: str
    currency: str = "NGN"
    purpose: Optional[str] = None


class GuarantorCreateIn(BaseModel):
    guarantor_user_id: int
    pledge_amount: str
    note: Optional[str] = None


class GuarantorDecisionIn(BaseModel):
    status: str  # "approved" | "declined"
    reason: Optional[str] = None
    note: Optional[str] = None


@router.get("/health")
def loans_health():
    return {"ok": True, "service": "loans"}


# Compat endpoints to stop frontend 404s.
# NOTE: Auth will be re-attached after we confirm the correct dependency names in your project.

@router.get("", response_model=ListOut)
def list_my_loans():
    return ListOut(items=[], total=0)


@router.post("", response_model=Dict[str, Any])
def create_loan(payload: LoanCreateIn):
    return {
        "ok": False,
        "detail": "Loan creation not wired in this build yet (compat endpoint restored).",
        "payload": payload.model_dump(),
    }


@router.get("/{loan_id}", response_model=Dict[str, Any])
def get_loan(loan_id: int):
    raise HTTPException(status_code=404, detail="Loan not found (loan engine not wired yet).")


@router.get("/guarantors/inbox", response_model=ListOut)
def guarantor_inbox(
    status: str = Query("pending"),
    limit: int = Query(50, ge=1, le=200),
):
    return ListOut(items=[], total=0)


@router.get("/{loan_id}/guarantors", response_model=ListOut)
def list_loan_guarantors(loan_id: int):
    return ListOut(items=[], total=0)


@router.post("/{loan_id}/guarantors", response_model=Dict[str, Any])
def create_loan_guarantor(loan_id: int, payload: GuarantorCreateIn):
    return {
        "ok": False,
        "detail": "Guarantor request creation not wired in this build yet (compat endpoint restored).",
        "loan_id": loan_id,
        "payload": payload.model_dump(),
    }


@router.patch("/{loan_id}/guarantors/{guarantor_id}", response_model=Dict[str, Any])
def decide_loan_guarantor(loan_id: int, guarantor_id: int, payload: GuarantorDecisionIn):
    return {
        "ok": False,
        "detail": "Guarantor decision not wired in this build yet (compat endpoint restored).",
        "loan_id": loan_id,
        "guarantor_id": guarantor_id,
        "payload": payload.model_dump(),
    }