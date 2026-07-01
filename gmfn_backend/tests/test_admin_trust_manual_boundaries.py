from __future__ import annotations

from fastapi.testclient import TestClient

from app.db.database import SessionLocal
from app.db.models import TrustEvent


def _trust_event_count() -> int:
    with SessionLocal() as db:
        return db.query(TrustEvent).count()


def test_admin_manual_trust_event_rejects_non_positive_subject_before_write(
    client: TestClient,
    override_current_user,
):
    before = _trust_event_count()

    response = client.post(
        "/admin/trust-events/manual",
        params={"subject_user_id": 0, "event_type": "repayment.missed"},
    )

    assert response.status_code == 422, response.text
    assert "subject_user_id" in response.text
    assert _trust_event_count() == before


def test_admin_manual_trust_event_rejects_non_positive_related_ids_before_write(
    client: TestClient,
    override_current_user,
):
    before = _trust_event_count()

    response = client.post(
        "/admin/trust-events/manual",
        params={
            "subject_user_id": 1,
            "event_type": "repayment.missed",
            "clan_id": 0,
            "loan_id": 0,
            "guarantor_id": 0,
        },
    )

    assert response.status_code == 422, response.text
    assert "clan_id" in response.text
    assert "loan_id" in response.text
    assert "guarantor_id" in response.text
    assert _trust_event_count() == before
