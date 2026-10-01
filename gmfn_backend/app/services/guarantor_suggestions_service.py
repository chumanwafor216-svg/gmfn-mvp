from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import ClanMembership, Loan, LoanGuarantor, User


def suggest_guarantors_for_loan(
    db: Session,
    *,
    loan_id: int,
    clan_id: int,
    borrower_user_id: int,
    limit: int = 10,
) -> dict[str, Any]:
    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    existing_guarantor_ids = {
        int(r[0])
        for r in db.query(LoanGuarantor.guarantor_user_id)
        .filter(LoanGuarantor.loan_id == loan_id)
        .all()
        if r and r[0] is not None
    }

    memberships = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == clan_id)
        .filter(ClanMembership.role.in_(["user", "admin"]))
        .order_by(ClanMembership.id.asc(), ClanMembership.created_at.asc())
        .all()
    )

    candidate_user_ids = []
    membership_order: dict[int, int] = {}
    for index, membership in enumerate(memberships):
        uid = int(membership.user_id)
        membership_order[uid] = index
        if uid == int(borrower_user_id):
            continue
        if uid in existing_guarantor_ids:
            continue
        candidate_user_ids.append(uid)

    if not candidate_user_ids:
        return {"loan_id": loan_id, "clan_id": clan_id, "items": []}

    users = db.query(User).filter(User.id.in_(candidate_user_ids)).all()

    items = []
    for user in users:
        uid = int(user.id)

        total = (
            db.query(LoanGuarantor)
            .filter(LoanGuarantor.clan_id == clan_id, LoanGuarantor.guarantor_user_id == uid)
            .count()
        )
        approved = (
            db.query(LoanGuarantor)
            .filter(
                LoanGuarantor.clan_id == clan_id,
                LoanGuarantor.guarantor_user_id == uid,
                LoanGuarantor.status == "approved",
            )
            .count()
        )
        declined = (
            db.query(LoanGuarantor)
            .filter(
                LoanGuarantor.clan_id == clan_id,
                LoanGuarantor.guarantor_user_id == uid,
                LoanGuarantor.status == "declined",
            )
            .count()
        )
        expired = (
            db.query(LoanGuarantor)
            .filter(
                LoanGuarantor.clan_id == clan_id,
                LoanGuarantor.guarantor_user_id == uid,
                LoanGuarantor.status == "expired",
            )
            .count()
        )

        reliability_score = int(approved * 2 - declined - expired)
        reason = (
            "Same-community support history: "
            f"{approved} accepted, {declined} declined, {expired} expired; "
            "general Trust score/band is not used for supporter ordering."
        )

        items.append(
            {
                "user_id": uid,
                "email": getattr(user, "email", None),
                "trust_score": None,
                "trust_band": None,
                "reliability_score": reliability_score,
                "total_requests": total,
                "approved": approved,
                "declined": declined,
                "expired": expired,
                "rank": reliability_score,
                "reason": reason,
            }
        )

    items.sort(
        key=lambda item: (
            -int(item["rank"]),
            membership_order.get(int(item["user_id"]), 999999),
            int(item["user_id"]),
        )
    )
    return {"loan_id": loan_id, "clan_id": clan_id, "items": items[:limit]}