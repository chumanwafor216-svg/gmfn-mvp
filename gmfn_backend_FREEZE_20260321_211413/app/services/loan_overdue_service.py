from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.db.models import Loan
from app.services.loans_service import mark_loan_defaulted


FINAL_LOAN_STATUSES = {"repaid", "cancelled", "defaulted", "rejected"}
DEFAULT_GRACE_DAYS = 3


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _days_past_due(now: datetime, due_at: datetime) -> int:
    delta = now - due_at
    return max(0, delta.days)


@dataclass
class OverdueDecision:
    loan_id: int
    clan_id: int
    borrower_user_id: int
    due_at: Optional[str]
    status_before: str
    days_past_due: int
    should_default: bool
    reason: str


def inspect_overdue_loans(
    db: Session,
    *,
    clan_id: Optional[int] = None,
    grace_days: int = DEFAULT_GRACE_DAYS,
    limit: int = 200,
    now: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Dry-run style inspection.
    Does not mutate loans.
    """
    current_time = now or _now_utc()
    lim = max(1, min(int(limit or 200), 2000))
    grace = max(0, int(grace_days or 0))

    q = db.query(Loan).order_by(Loan.id.desc())

    if clan_id is not None:
        q = q.filter(Loan.clan_id == int(clan_id))

    rows = q.limit(lim).all()

    decisions: List[OverdueDecision] = []

    for loan in rows:
        status_before = (getattr(loan, "status", "") or "").lower()
        due_at = getattr(loan, "due_at", None)
        remaining_amount = getattr(loan, "remaining_amount", None)

        if status_before in FINAL_LOAN_STATUSES:
            decisions.append(
                OverdueDecision(
                    loan_id=int(loan.id),
                    clan_id=int(loan.clan_id),
                    borrower_user_id=int(loan.borrower_user_id),
                    due_at=due_at.isoformat() if due_at else None,
                    status_before=status_before,
                    days_past_due=0,
                    should_default=False,
                    reason="final_status",
                )
            )
            continue

        if due_at is None:
            decisions.append(
                OverdueDecision(
                    loan_id=int(loan.id),
                    clan_id=int(loan.clan_id),
                    borrower_user_id=int(loan.borrower_user_id),
                    due_at=None,
                    status_before=status_before,
                    days_past_due=0,
                    should_default=False,
                    reason="missing_due_at",
                )
            )
            continue

        if remaining_amount is None or str(remaining_amount) == "0":
            decisions.append(
                OverdueDecision(
                    loan_id=int(loan.id),
                    clan_id=int(loan.clan_id),
                    borrower_user_id=int(loan.borrower_user_id),
                    due_at=due_at.isoformat(),
                    status_before=status_before,
                    days_past_due=0,
                    should_default=False,
                    reason="no_remaining_amount",
                )
            )
            continue

        if current_time <= due_at:
            decisions.append(
                OverdueDecision(
                    loan_id=int(loan.id),
                    clan_id=int(loan.clan_id),
                    borrower_user_id=int(loan.borrower_user_id),
                    due_at=due_at.isoformat(),
                    status_before=status_before,
                    days_past_due=0,
                    should_default=False,
                    reason="not_due_yet",
                )
            )
            continue

        dpd = _days_past_due(current_time, due_at)
        should_default = dpd > grace

        decisions.append(
            OverdueDecision(
                loan_id=int(loan.id),
                clan_id=int(loan.clan_id),
                borrower_user_id=int(loan.borrower_user_id),
                due_at=due_at.isoformat(),
                status_before=status_before,
                days_past_due=dpd,
                should_default=should_default,
                reason="beyond_grace" if should_default else "within_grace",
            )
        )

    return {
        "clan_id": int(clan_id) if clan_id is not None else None,
        "grace_days": grace,
        "limit": lim,
        "scanned": len(decisions),
        "default_candidates": sum(1 for d in decisions if d.should_default),
        "items": [d.__dict__ for d in decisions],
    }


def run_overdue_default_scan(
    db: Session,
    *,
    actor_user_id: int,
    clan_id: Optional[int] = None,
    grace_days: int = DEFAULT_GRACE_DAYS,
    limit: int = 200,
    now: Optional[datetime] = None,
    dry_run: bool = False,
) -> Dict[str, Any]:
    """
    Deterministically scan loans and default overdue ones via the canonical path.
    """
    inspection = inspect_overdue_loans(
        db,
        clan_id=clan_id,
        grace_days=grace_days,
        limit=limit,
        now=now,
    )

    results: List[Dict[str, Any]] = []
    defaulted_count = 0

    for item in inspection["items"]:
        if not item["should_default"]:
            continue

        if dry_run:
            results.append(
                {
                    "loan_id": int(item["loan_id"]),
                    "status": "would_default",
                    "days_past_due": int(item["days_past_due"]),
                }
            )
            continue

        loan = mark_loan_defaulted(
            db,
            loan_id=int(item["loan_id"]),
            clan_id=int(item["clan_id"]),
            actor_user_id=int(actor_user_id),
            reason="overdue_grace_exceeded",
            note=f"Loan defaulted automatically after exceeding {int(grace_days)}-day grace window.",
            days_past_due=int(item["days_past_due"]),
            trigger_mode="overdue_detector",
        )

        defaulted_count += 1
        results.append(
            {
                "loan_id": int(loan.id),
                "status": loan.status,
                "days_past_due": int(item["days_past_due"]),
            }
        )

    return {
        "clan_id": inspection["clan_id"],
        "grace_days": inspection["grace_days"],
        "limit": inspection["limit"],
        "scanned": inspection["scanned"],
        "default_candidates": inspection["default_candidates"],
        "defaulted": defaulted_count,
        "dry_run": bool(dry_run),
        "items": results,
    }