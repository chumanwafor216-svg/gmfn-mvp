from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.db.database import get_db
from app.db.models import Loan, LoanGuarantor
from app.schemas.loan_guarantors import LoanGuarantorCreate, LoanGuarantorOut
from app.core.auth import get_current_user
from app.core.clan_auth import require_clan_admin
from app.schemas.errors import ErrorOut

router = APIRouter()

@router.post(
    "/loans/{loan_id}/guarantors",
    response_model=LoanGuarantorOut,
    status_code=status.HTTP_201_CREATED,
    summary="Invite a guarantor to a loan",
    description=(
        "Admin-only. Invites a clan member to guarantee a specific loan. "
        "Returns the created loan guarantor record."
    ),
    responses={
        201: {
            "description": "Guarantor invited successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "loan_id": 1,
                        "clan_id": 1,
                        "guarantor_user_id": 2,
                        "pledge_amount": 0.0,
                        "status": "pending",
                        "responded_at": None,
                    }
                }
            },
        },
        400: {
            "model": ErrorOut,
            "description": "Bad request (e.g., guarantor is not a clan member)",
            "content": {"application/json": {"example": {"detail": "Guarantor must be a clan member"}}},
        },
        401: {
            "model": ErrorOut,
            "description": "Not authenticated",
            "content": {"application/json": {"example": {"detail": "Not authenticated"}}},
        },
        403: {
            "model": ErrorOut,
            "description": "Forbidden (not a clan admin)",
            "content": {"application/json": {"example": {"detail": "Clan admin privileges required"}}},
        },
        404: {
            "model": ErrorOut,
            "description": "Loan not found",
            "content": {"application/json": {"example": {"detail": "Loan not found"}}},
        },
        409: {
            "model": ErrorOut,
            "description": "Conflict (guarantor already invited)",
            "content": {"application/json": {"example": {"detail": "Guarantor already invited"}}},
        },
    },
)
