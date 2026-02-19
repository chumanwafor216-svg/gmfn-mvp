# tests/test_trust_recompute_engine.py

import json
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db.database import engine


def _insert_trust_event(*, subject_user_id: int, actor_user_id: int, event_type: str, meta: dict):
    meta_json = json.dumps(meta, separators=(",", ":"), ensure_ascii=True)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO trust_events (
                    event_type,
                    clan_id,
                    loan_id,
                    guarantor_id,
                    actor_user_id,
                    subject_user_id,
                    meta_json,
                    created_at
                )
                VALUES (
                    :event_type,
                    NULL,
                    NULL,
                    NULL,
                    :actor_user_id,
                    :subject_user_id,
                    :meta_json,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "event_type": event_type,
                "actor_user_id": actor_user_id,
                "subject_user_id": subject_user_id,
                "meta_json": meta_json,
            },
        )


def _get_user_trust_fields(user_id: int) -> dict:
    with engine.begin() as conn:
        row = conn.execute(
            text(
                """
                SELECT trust_score, trust_band, trust_breakdown_json, trust_score_updated_at
                FROM users
                WHERE id = :uid
                """
            ),
            {"uid": user_id},
        ).fetchone()
        assert row is not None
        return {
            "trust_score": row[0],
            "trust_band": row[1],
            "trust_breakdown_json": row[2],
            "trust_score_updated_at": row[3],
        }


def test_trust_recompute_deterministic_and_apply_contract(
    client: TestClient,
    override_current_user,  # admin user id=1
    seed_clan_admin_membership,  # creates user 1 + clan 1 + membership
):
    # Create 3 repayment events for user 1 as borrower => 3 * 0.10 = 0.3000
    _insert_trust_event(
        subject_user_id=1,
        actor_user_id=1,
        event_type="loan.repayment_confirmed",
        meta={"role": "borrower", "reason": "Repayment confirmed", "note": "Test 1"},
    )
    _insert_trust_event(
        subject_user_id=1,
        actor_user_id=1,
        event_type="loan.repayment_confirmed",
        meta={"role": "borrower", "reason": "Repayment confirmed", "note": "Test 2"},
    )
    _insert_trust_event(
        subject_user_id=1,
        actor_user_id=1,
        event_type="loan.repayment_confirmed",
        meta={"role": "borrower", "reason": "Repayment confirmed", "note": "Test 3"},
    )

    # Determinism: same inputs -> same outputs
    r1 = client.get("/trust/recompute/me")
    assert r1.status_code == 200, r1.text
    r2 = client.get("/trust/recompute/me")
    assert r2.status_code == 200, r2.text
    assert r1.json() == r2.json()

    j = r1.json()
    assert j["user_id"] == 1
    assert j["score"] == "0.3000"
    assert isinstance(j["breakdown"], dict)

    before = _get_user_trust_fields(1)

    # Dry-run apply: must not write
    r3 = client.post("/admin/trust/recompute/1/apply?dry_run=1")
    assert r3.status_code == 200, r3.text
    j3 = r3.json()
    assert j3["applied"] is False
    after_dry = _get_user_trust_fields(1)
    assert after_dry == before

    # Real apply: must write trust_score + band + breakdown
    r4 = client.post("/admin/trust/recompute/1/apply")
    assert r4.status_code == 200, r4.text
    j4 = r4.json()
    assert j4["applied"] is True
    assert j4["computed"]["score"] == "0.3000"

    after_apply = _get_user_trust_fields(1)
    assert str(after_apply["trust_score"]) == "0.3" or str(after_apply["trust_score"]).startswith("0.3")
    assert after_apply["trust_band"] is not None
    assert after_apply["trust_breakdown_json"] is not None

    # Idempotency: second apply with no new events should be NO-OP
    r5 = client.post("/admin/trust/recompute/1/apply")
    assert r5.status_code == 200, r5.text
    j5 = r5.json()
    assert j5.get("noop") is True
    assert j5["applied"] is False


def test_admin_evidence_snapshot_and_trust_events_me(
    client: TestClient,
    override_current_user,
    seed_clan_admin_membership,
):
    # Ensure at least 1 event exists
    _insert_trust_event(
        subject_user_id=1,
        actor_user_id=1,
        event_type="loan.repayment_confirmed",
        meta={"role": "borrower", "reason": "Repayment confirmed", "note": "Evidence test"},
    )

    # Evidence endpoint (admin)
    r1 = client.get("/admin/trust/evidence/1")
    assert r1.status_code == 200, r1.text
    j = r1.json()
    assert j["user_id"] == 1
    assert "current" in j and "recomputed" in j and "diff" in j and "recent_events" in j

    # Explainability feed
    r2 = client.get("/trust-events/me")
    assert r2.status_code == 200, r2.text
    j2 = r2.json()
    assert isinstance(j2, dict)
    assert "items" in j2 and "total" in j2
    assert isinstance(j2["items"], list)