from datetime import datetime, timedelta, timezone
import asyncio

from fastapi import FastAPI
from sqlalchemy.orm import Session

from app.api.router import api_router
from app.db.database import Base, engine, SessionLocal

# IMPORTANT: ensure models are imported so SQLAlchemy sees them
import app.db.models  # noqa: F401

from app.db.models import Loan
from app.services.loans_service import cancel_loan


app = FastAPI(debug=True)
app.include_router(api_router)


# NOTE (MVP only):
# This creates tables automatically at startup.
# In production you should rely on Alembic migrations instead.
@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    # Start background auto-cancel task (MVP)
    asyncio.create_task(_auto_cancel_incomplete_loans())


async def _auto_cancel_incomplete_loans() -> None:
    """
    MVP auto-cancel policy (Chuma):
    - If a loan stays 'incomplete' for > 2 minutes, auto-cancel it.
    - Uses cancel_loan() so locks are released consistently.
    - decision_at is used as the 'incomplete_since' marker (per current loans_service.py).
    """
    while True:
        await asyncio.sleep(15)

        db: Session = SessionLocal()
        try:
            cutoff = datetime.now(timezone.utc) - timedelta(minutes=2)

            # Find overdue incomplete loans
            overdue = (
                db.query(Loan)
                .filter(Loan.status == "incomplete")
                .filter(Loan.decision_at.isnot(None))
                .filter(Loan.decision_at < cutoff)
                .all()
            )

            for loan in overdue:
                # system actor = borrower (MVP), consistent with earlier system-context choices
                cancel_loan(
                    db,
                    loan_id=int(loan.id),
                    clan_id=int(loan.clan_id),
                    actor_user_id=int(loan.borrower_user_id),
                )

        finally:
            db.close()