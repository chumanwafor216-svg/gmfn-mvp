# app/services/trust_slips_services.py

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, Any

from sqlalchemy.orm import Session

from app.services.trust_score_service import compute_trust_breakdown


# -------------------------------------------------------------------
# CORE TRUST SLIP PAYLOAD
# -------------------------------------------------------------------

def get_trust_slip_payload(db: Session, *, user_id: int) -> Dict[str, Any]:
    """
    Canonical TrustSlip payload used everywhere.
    """

    summary = compute_trust_breakdown(db, user_id=int(user_id))

    return {
        "verified": True,
        "user_id": int(user_id),
        "level": summary.get("band"),
        "level_label": summary.get("level_label"),
        "lifetime_trust": str(summary.get("lifetime_trust", Decimal("0.00"))),
        "standing_score": str(summary.get("standing_score", Decimal("0.00"))),
        "trust_slip_limit": str(summary.get("trust_slip_limit", Decimal("0.00"))),
        "last_full_repayment_at": summary.get("last_full_repayment_at"),
        "days_since_last_full_repayment": summary.get("days_since_last_full_repayment"),
        "not_a_bank_guarantee": True,
        "no_auto_debit": True,
        "disclaimer": "Community-backed integrity limit. Not a bank guarantee. No auto-debit.",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# -------------------------------------------------------------------
# Backwards compatibility (routers still calling this)
# -------------------------------------------------------------------

def get_trust_slip_for_user(db: Session, *, user_id: int) -> Dict[str, Any]:
    """
    Wrapper kept for compatibility with older routes.
    """
    return get_trust_slip_payload(db, user_id=int(user_id))