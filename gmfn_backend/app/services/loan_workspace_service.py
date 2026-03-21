from __future__ import annotations

from typing import Any, Dict

from sqlalchemy.orm import Session

from app.services.guarantor_selection_service import build_loan_guarantor_suggestions
from app.services.loan_decision_intelligence_service import build_loan_decision_intelligence


def build_loan_workspace(db: Session, loan_id: int) -> Dict[str, Any]:
    suggestions = build_loan_guarantor_suggestions(db, int(loan_id), limit=5)
    decision = build_loan_decision_intelligence(db, int(loan_id))

    recommendation = (
        str(decision.get("decision", {}).get("recommendation", "") or "").strip().lower()
    )

    workspace_status = "ready"
    if recommendation == "block":
        workspace_status = "blocked"
    elif recommendation == "caution":
        workspace_status = "review"
    elif recommendation == "proceed":
        workspace_status = "ready"

    return {
        "loan_id": int(loan_id),
        "workspace_status": workspace_status,
        "decision": decision,
        "suggestions": suggestions,
    }