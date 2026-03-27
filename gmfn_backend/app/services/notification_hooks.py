from __future__ import annotations

from sqlalchemy.orm import Session

from app.services.notification_service import create_notification


def notify_guarantor_request(
    db: Session,
    *,
    guarantor_user_id: int,
    loan_id: int,
) -> None:
    create_notification(
        db,
        user_id=int(guarantor_user_id),
        kind="guarantor.request",
        title="A guarantee request needs your attention",
        message="Someone is asking for your support. Reviewing early helps your community move forward.",
        action_url="/app/loans",
        action_label="Open Finances",
    )


def notify_pool_deposit_confirmed(
    db: Session,
    *,
    user_id: int,
    amount: str,
    currency: str,
) -> None:
    create_notification(
        db,
        user_id=int(user_id),
        kind="pool.deposit_confirmed",
        title="Your deposit was confirmed",
        message=f"Your pool deposit of {amount} {currency} has been confirmed.",
        action_url="/app/loans",
        action_label="View Finances",
    )


def notify_loan_repaid(
    db: Session,
    *,
    borrower_user_id: int,
    loan_id: int,
) -> None:
    create_notification(
        db,
        user_id=int(borrower_user_id),
        kind="loan.repaid",
        title="Loan fully repaid",
        message="Well done. Your loan balance has reached zero and your record reflects this progress.",
        action_url="/app/trust",
        action_label="View Trust",
    )