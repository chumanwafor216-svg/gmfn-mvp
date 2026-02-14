from __future__ import annotations

from enum import StrEnum


class TrustEventType(StrEnum):
    # =========================
    # GUARANTOR DECISIONS
    # =========================
    GUARANTOR_APPROVED = "GUARANTOR_APPROVED"
    GUARANTOR_DECLINED = "GUARANTOR_DECLINED"
    GUARANTOR_EXPIRED = "GUARANTOR_EXPIRED"

    # =========================
    # LOAN DECISIONS
    # =========================
    LOAN_AUTO_APPROVED = "LOAN_AUTO_APPROVED"
    LOAN_AUTO_APPROVED_BY_GUARANTORS = "LOAN_AUTO_APPROVED_BY_GUARANTORS"
    LOAN_AUTO_REJECTED = "LOAN_AUTO_REJECTED"

    # ✅ NEW: lifecycle states aligned with GMFN philosophy
    LOAN_INCOMPLETE = "LOAN_INCOMPLETE"      # quorum/coverage not yet complete
    LOAN_CANCELLED = "LOAN_CANCELLED"        # borrower/system cancelled incomplete loan

    LOAN_REPAID = "LOAN_REPAID"

    # =========================
    # REPAYMENTS
    # =========================
    REPAYMENT_MADE = "REPAYMENT_MADE"

    # =========================
    # GUARANTEE / EXPOSURE LOCKS
    # =========================
    GUARANTEE_LOCKS_RELEASED = "GUARANTEE_LOCKS_RELEASED"
    GUARANTOR_LOCK_RELEASED = "GUARANTOR_LOCK_RELEASED"

    # =========================
    # ADMIN ACTIONS
    # =========================
    ADMIN_POOL_TOPUP = "ADMIN_POOL_TOPUP"

    # =========================
    # ADMIN / BULK ACTIONS
    # =========================
    ADMIN_BULK_GUARANTOR_APPROVED = "ADMIN_BULK_GUARANTOR_APPROVED"
    ADMIN_BULK_GUARANTOR_DECLINED = "ADMIN_BULK_GUARANTOR_DECLINED"