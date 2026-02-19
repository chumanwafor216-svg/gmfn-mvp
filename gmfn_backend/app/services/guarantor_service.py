# app/services/guarantor_service.py
from __future__ import annotations

from decimal import Decimal
from typing import Any, Optional

from sqlalchemy.orm import Session


ALLOWED_GUARANTOR_STATUSES = {"pending", "approved", "declined"}


def _d(x) -> Decimal:
    if isinstance(x, Decimal):
        return x
    return Decimal(str(x))


def update_loan_guarantor_status(
    db: Session,
    *,
    new_status: Optional[str] = None,
    clan_id: Optional[int] = None,
    loan_id: Optional[int] = None,
    guarantor_user_id: Optional[int] = None,
    **kwargs: Any,
):
    """
    Stable Public API target for wrappers/routes.

    IMPORTANT: This module must be import-safe (avoid circular imports),
    so LoanGuarantor is imported lazily inside the function.

    Supported call patterns:
    - update_loan_guarantor_status(db, loan_id=..., guarantor_user_id=..., new_status=...)
    - update_loan_guarantor_status(db, loan_guarantor_id=..., status=...)
    - update_loan_guarantor_status(db, guarantor=<LoanGuarantor>, status=...)
    - legacy aliases: status/decision, id, guarantor_id, loan_guarantor_row_id, etc.
    """
    # Lazy import to avoid circular import problems
    from app.db.models import LoanGuarantor  # noqa: WPS433

    # Status aliases
    if new_status is None:
        new_status = kwargs.get("status") or kwargs.get("decision")

    status = (new_status or "").strip().lower()
    if status not in ALLOWED_GUARANTOR_STATUSES:
        raise ValueError(f"Invalid guarantor status: {new_status}")

    # 1) Prefer direct LoanGuarantor row object if provided
    for k in ("loan_guarantor", "guarantor", "row", "invite", "guarantor_row", "lg"):
        v = kwargs.get(k)
        if isinstance(v, LoanGuarantor):
            row = v
            # optional clan isolation
            if clan_id is not None and int(getattr(row, "clan_id", -1)) != int(clan_id):
                raise LookupError("LoanGuarantor not found")
            # refresh from DB if possible
            try:
                row_db = db.get(LoanGuarantor, int(row.id))
                if row_db is not None:
                    row = row_db
            except Exception:
                pass
            break
    else:
        row = None

    # 2) If not provided as object, try row-id keys
    if row is None:
        loan_guarantor_id = (
            kwargs.get("loan_guarantor_id")
            or kwargs.get("loan_guarantor_row_id")
            or kwargs.get("id")
        )

        # legacy: guarantor_id sometimes means LoanGuarantor.id when loan_id isn't provided
        if loan_guarantor_id is None and kwargs.get("guarantor_id") is not None and loan_id is None:
            loan_guarantor_id = kwargs.get("guarantor_id")

        if loan_guarantor_id is not None:
            q = db.query(LoanGuarantor).filter(LoanGuarantor.id == int(loan_guarantor_id))
            if clan_id is not None:
                q = q.filter(LoanGuarantor.clan_id == int(clan_id))
            row = q.first()
            if row is None:
                raise LookupError("LoanGuarantor not found")

    # 3) Fall back to loan_id + guarantor_user_id
    if row is None:
        if loan_id is None:
            loan_id = kwargs.get("loan_id")

        if guarantor_user_id is None:
            guarantor_user_id = (
                kwargs.get("guarantor_user_id")
                or kwargs.get("guarantor_user")
                # NOTE: if loan_id exists, treat guarantor_id as user_id (common meaning)
                or (kwargs.get("guarantor_id") if loan_id is not None else None)
            )

        if loan_id is None or guarantor_user_id is None:
            raise TypeError("loan_id and guarantor_user_id are required")

        q = (
            db.query(LoanGuarantor)
            .filter(LoanGuarantor.loan_id == int(loan_id))
            .filter(LoanGuarantor.guarantor_user_id == int(guarantor_user_id))
        )
        if clan_id is not None:
            q = q.filter(LoanGuarantor.clan_id == int(clan_id))

        row = q.first()
        if row is None:
            raise LookupError("LoanGuarantor not found")

    # Hardening: cannot approve a zero-pledge
    if status == "approved":
        pledge = _d(getattr(row, "pledge_amount", None) or Decimal("0"))
        if pledge <= Decimal("0"):
            raise ValueError("pledge_amount must be > 0 to approve")

    row.status = status
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def approve_guarantor(
    db: Session,
    *,
    loan_id: int,
    guarantor_user_id: int,
    clan_id: Optional[int] = None,
):
    return update_loan_guarantor_status(
        db,
        loan_id=loan_id,
        guarantor_user_id=guarantor_user_id,
        new_status="approved",
        clan_id=clan_id,
    )


def decline_guarantor(
    db: Session,
    *,
    loan_id: int,
    guarantor_user_id: int,
    clan_id: Optional[int] = None,
):
    return update_loan_guarantor_status(
        db,
        loan_id=loan_id,
        guarantor_user_id=guarantor_user_id,
        new_status="declined",
        clan_id=clan_id,
    )