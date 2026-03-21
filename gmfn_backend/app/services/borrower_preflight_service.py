from __future__ import annotations

from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.services.loan_readiness_service import build_loan_readiness_plan


def build_borrower_preflight(
    db: Session,
    *,
    clan_id: int,
    borrower_user_id: int,
    requested_amount: Any,
) -> Dict[str, Any]:
    readiness = build_loan_readiness_plan(
        db,
        clan_id=int(clan_id),
        requested_amount=requested_amount,
        borrower_user_id=int(borrower_user_id),
    )

    recommendation = (
        str(readiness.get("readiness", {}).get("recommendation", "") or "").strip().lower()
    )

    preflight_status = "ready"
    if recommendation == "block":
        preflight_status = "blocked"
    elif recommendation in {"caution", "reduce_amount"}:
        preflight_status = "review"

    return {
        "preflight_status": preflight_status,
        "borrower_user_id": int(borrower_user_id),
        "clan_id": int(clan_id),
        "requested_amount": readiness.get("requested_amount"),
        "readiness": readiness.get("readiness", {}),
        "coverage": readiness.get("coverage", {}),
        "clan_context": readiness.get("clan_context", {}),
        "top_candidates": readiness.get("top_candidates", []),
    }