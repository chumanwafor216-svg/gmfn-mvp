from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.db.models import Loan, LoanGuarantor


TWOPLACES = Decimal("0.01")


def _q2(x: Any) -> Decimal:
    return Decimal(str(x or 0)).quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def _safe_amount(g: LoanGuarantor) -> Decimal:
    locked = _q2(getattr(g, "locked_amount", 0))
    if locked > Decimal("0.00"):
        return locked
    pledge = _q2(getattr(g, "pledge_amount", 0))
    if pledge > Decimal("0.00"):
        return pledge
    return Decimal("0.00")


def get_loan_revenue_allocation(db: Session, *, loan_id: int) -> Dict[str, Any]:
    loan = db.get(Loan, int(loan_id))
    if not loan:
        raise LookupError("Loan not found")

    service_fee = _q2(getattr(loan, "service_fee", 0))
    platform_revenue = _q2(getattr(loan, "platform_revenue", 0))

    guarantor_pool = _q2(service_fee - platform_revenue)
    if guarantor_pool < Decimal("0.00"):
        guarantor_pool = Decimal("0.00")

    approved = (
        db.query(LoanGuarantor)
        .filter(LoanGuarantor.loan_id == int(loan.id))
        .filter(LoanGuarantor.status == "approved")
        .order_by(LoanGuarantor.id.asc())
        .all()
    )

    weights: List[Decimal] = [_safe_amount(g) for g in approved]
    total_weight = sum(weights, Decimal("0.00"))

    items: List[Dict[str, Any]] = []

    if not approved:
        return {
            "loan_id": int(loan.id),
            "currency": str(getattr(loan, "currency", "NGN")),
            "service_fee": str(service_fee),
            "platform_revenue": str(platform_revenue),
            "guarantor_pool": str(guarantor_pool),
            "total_weight": "0.00",
            "items": [],
        }

    allocated_total = Decimal("0.00")

    for idx, g in enumerate(approved):
        weight = weights[idx]

        if total_weight <= Decimal("0.00"):
            share = Decimal("0.00")
        elif idx == len(approved) - 1:
            share = _q2(guarantor_pool - allocated_total)
        else:
            share = _q2((guarantor_pool * weight) / total_weight)

        allocated_total = _q2(allocated_total + share)

        items.append(
            {
                "loan_guarantor_id": int(g.id),
                "guarantor_user_id": int(getattr(g, "guarantor_user_id", 0) or 0),
                "weight_amount": str(weight),
                "share_amount": str(share),
                "status": str(getattr(g, "status", "")),
            }
        )

    return {
        "loan_id": int(loan.id),
        "currency": str(getattr(loan, "currency", "NGN")),
        "service_fee": str(service_fee),
        "platform_revenue": str(platform_revenue),
        "guarantor_pool": str(guarantor_pool),
        "total_weight": str(_q2(total_weight)),
        "items": items,
    }


def get_my_guarantor_earnings(db: Session, *, user_id: int, limit: int = 100) -> Dict[str, Any]:
    rows = (
        db.query(LoanGuarantor)
        .filter(LoanGuarantor.guarantor_user_id == int(user_id))
        .filter(LoanGuarantor.status == "approved")
        .order_by(LoanGuarantor.id.desc())
        .limit(int(max(1, min(limit, 500))))
        .all()
    )

    items: List[Dict[str, Any]] = []
    total_earned = Decimal("0.00")

    for g in rows:
        alloc = get_loan_revenue_allocation(db, loan_id=int(g.loan_id))
        mine = next((x for x in alloc["items"] if int(x["loan_guarantor_id"]) == int(g.id)), None)
        if not mine:
            continue

        share = _q2(mine["share_amount"])
        total_earned = _q2(total_earned + share)

        items.append(
            {
                "loan_id": int(g.loan_id),
                "loan_guarantor_id": int(g.id),
                "guarantor_user_id": int(getattr(g, "guarantor_user_id", 0) or 0),
                "currency": alloc["currency"],
                "weight_amount": mine["weight_amount"],
                "share_amount": mine["share_amount"],
            }
        )

    return {
        "user_id": int(user_id),
        "total_earned": str(total_earned),
        "items": items,
        "total": len(items),
    }