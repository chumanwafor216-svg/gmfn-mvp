from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal

from app.services.trust_explainability_service import (
    build_trust_explainability,
)


@dataclass
class FakeTrustEvent:
    id: int
    user_id: int
    event_type: str
    delta: Decimal
    created_at: datetime
    meta: dict = field(default_factory=dict)


class FakeQuery:
    def __init__(self, rows):
        self.rows = list(rows)

    def filter(self, *args, **kwargs):
        return self

    def order_by(self, *args, **kwargs):
        return self

    def limit(self, n):
        return FakeQuery(self.rows[:n])

    def all(self):
        return list(self.rows)


class FakeSession:
    def __init__(self, rows):
        self.rows = rows
        self.call_count = 0

    def query(self, *args, **kwargs):
        self.call_count += 1
        if self.call_count == 1:
            ordered = sorted(self.rows, key=lambda x: (x.created_at, x.id), reverse=True)
            return FakeQuery(ordered)
        ordered = sorted(self.rows, key=lambda x: (x.created_at, x.id))
        return FakeQuery(ordered)


def test_build_trust_explainability_uses_recent_reason_and_note():
    rows = [
        FakeTrustEvent(
            id=1,
            user_id=7,
            event_type="loan.repaid",
            delta=Decimal("0.10"),
            created_at=datetime(2026, 3, 1, 10, 0, tzinfo=timezone.utc),
            meta={"reason": "Repayment confirmed", "note": "Paid fully"},
        ),
        FakeTrustEvent(
            id=2,
            user_id=7,
            event_type="invite.joined",
            delta=Decimal("0.03"),
            created_at=datetime(2026, 3, 2, 10, 0, tzinfo=timezone.utc),
            meta={"reason": "Invite completed", "note": "Joined successfully"},
        ),
    ]

    db = FakeSession(rows)
    result = build_trust_explainability(db, user_id=7, recent_limit=10)

    assert result["user_id"] == 7
    assert result["current_score"] == "0.13"
    assert result["latest_reason"] == "Invite completed"
    assert result["latest_note"] == "Joined successfully"
    assert result["latest_source"] == "invite.joined"
    assert len(result["recent_events"]) == 2