from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.db.models import Loan, ClanMembership, LoanGuarantor, User
from app.services.trust_score_service import trust_band_for_score, compute_trust_score_explained


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

    # exclude existing guarantors for this loan
    existing_guarantor_ids = {
        int(r[0])
        for r in db.query(LoanGuarantor.guarantor_user_id)
        .filter(LoanGuarantor.loan_id == loan_id)
        .all()
        if r and r[0] is not None
    }

    # clan members (members + admins)
    memberships = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == clan_id)
        .filter(ClanMembership.role.in_(["user", "admin"]))
        .all()
    )

    candidate_user_ids = []
    for m in memberships:
        uid = int(m.user_id)
        if uid == int(borrower_user_id):
            continue
        if uid in existing_guarantor_ids:
            continue
        candidate_user_ids.append(uid)

    if not candidate_user_ids:
        return {"loan_id": loan_id, "clan_id": clan_id, "items": []}

    users = db.query(User).filter(User.id.in_(candidate_user_ids)).all()

    # simple reliability from loan_guarantors history in this clan
    # reliability_score = approved*2 - declined - expired
    items = []
    for u in users:
        uid = int(u.id)

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

        # trust score (stored + fallback compute)
        trust_score = getattr(u, "trust_score", None)
        trust_band = getattr(u, "trust_band", None)

        if trust_score is None:
            computed = compute_trust_score_explained(db, user_id=uid)
            trust_score = computed.get("score")
            trust_band = trust_band or trust_band_for_score(int(trust_score) if trust_score is not None else 50)[0]

        if trust_band is None and trust_score is not None:
            trust_band = trust_band_for_score(int(trust_score))[0]

        # ranking: trust_score primary, reliability secondary
        trust_score_num = int(trust_score) if trust_score is not None else 50
        rank = trust_score_num * 1.0 + reliability_score * 0.5

        reason = f"Trust {trust_score_num} (Band {trust_band or '—'}), reliability {reliability_score}, history {total} requests"

        items.append(
            {
                "user_id": uid,
                "email": getattr(u, "email", None),
                "trust_score": trust_score_num,
                "trust_band": trust_band,
                "reliability_score": reliability_score,
                "total_requests": total,
                "approved": approved,
                "declined": declined,
                "expired": expired,
                "rank": rank,
                "reason": reason,
            }
        )

    items.sort(key=lambda x: x["rank"], reverse=True)
    return {"loan_id": loan_id, "clan_id": clan_id, "items": items[:limit]}
