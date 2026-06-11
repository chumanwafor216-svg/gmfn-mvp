from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from fastapi.testclient import TestClient

from app.db.database import SessionLocal
from app.db.models import TrustEvent
from app.services.loan_hardening_service import (
    coverage_ok_for_loan,
    guarantee_gap_for_loan,
    trust_event_duplicate_exists,
    validate_gap_pledge,
)


def test_guarantee_gap_uses_personal_pool_correctly():
    result = guarantee_gap_for_loan(
        loan_amount=Decimal("1000"),
        personal_pool=Decimal("300"),
    )

    assert result["loan_amount"] == Decimal("1000")
    assert result["personal_pool"] == Decimal("300")
    assert result["pool_used"] == Decimal("300")
    assert result["guarantee_gap"] == Decimal("700")


def test_guarantee_gap_zero_when_within_pool():
    result = guarantee_gap_for_loan(
        loan_amount=Decimal("250"),
        personal_pool=Decimal("300"),
    )

    assert result["pool_used"] == Decimal("250")
    assert result["guarantee_gap"] == Decimal("0")


def test_positive_gap_requires_positive_pledge():
    result = validate_gap_pledge(
        guarantee_gap=Decimal("500"),
        pledge_amount=Decimal("0"),
    )

    assert result["pledge_required"] is True
    assert result["pledge_valid"] is False


def test_coverage_based_approval_requires_locked_total_to_cover_gap():
    result = coverage_ok_for_loan(
        loan_amount=Decimal("1000"),
        personal_pool=Decimal("300"),
        approved_locked_total=Decimal("700"),
        pledge_amount=Decimal("50"),
    )

    assert result["guarantee_gap"] == Decimal("700")
    assert result["coverage_ok"] is True
    assert result["pledge_valid"] is True


def test_coverage_based_approval_fails_when_locked_total_below_gap():
    result = coverage_ok_for_loan(
        loan_amount=Decimal("1000"),
        personal_pool=Decimal("300"),
        approved_locked_total=Decimal("650"),
        pledge_amount=Decimal("50"),
    )

    assert result["guarantee_gap"] == Decimal("700")
    assert result["coverage_ok"] is False


def test_trust_event_duplicate_check_uses_subject_and_real_context_fields(seed_clan_admin_membership):
    with SessionLocal() as db:
        db.add(
            TrustEvent(
                event_type="loan.repaid",
                clan_id=1,
                loan_id=9,
                guarantor_id=3,
                actor_user_id=1,
                subject_user_id=2,
                meta={
                    "reason": "loan_fully_repaid",
                    "loan_id": "wrong-meta-loan",
                    "guarantor_id": "wrong-meta-guarantor",
                },
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

        assert trust_event_duplicate_exists(
            db,
            user_id=2,
            event_type="loan.repaid",
            loan_id=9,
            guarantor_id=3,
            reason="loan_fully_repaid",
        ) is True
        assert trust_event_duplicate_exists(
            db,
            user_id=1,
            event_type="loan.repaid",
            loan_id=9,
            guarantor_id=3,
            reason="loan_fully_repaid",
        ) is False
        assert trust_event_duplicate_exists(
            db,
            user_id=2,
            event_type="loan.repaid",
            loan_id=99,
            guarantor_id=3,
            reason="loan_fully_repaid",
        ) is False


def test_trust_event_dedup_check_route_reports_duplicate_for_admin(
    client: TestClient,
    override_current_user,
    seed_clan_admin_membership,
):
    with SessionLocal() as db:
        db.add(
            TrustEvent(
                event_type="loan.repaid",
                clan_id=1,
                loan_id=12,
                actor_user_id=1,
                subject_user_id=1,
                meta={"reason": "route_duplicate_probe"},
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

    response = client.post(
        "/admin/trust-events/dedup-check",
        json={
            "user_id": 1,
            "event_type": "loan.repaid",
            "loan_id": 12,
            "reason": "route_duplicate_probe",
        },
    )

    assert response.status_code == 200, response.text
    assert response.json() == {
        "duplicate_found": True,
        "message": "Duplicate found",
    }


def test_trust_event_dedup_check_route_blocks_non_admin(
    client: TestClient,
    override_current_user_user,
    seed_clan_member_membership,
):
    response = client.post(
        "/admin/trust-events/dedup-check",
        json={
            "user_id": 1,
            "event_type": "loan.repaid",
            "loan_id": 12,
            "reason": "route_duplicate_probe",
        },
    )

    assert response.status_code == 200, response.text
    assert response.json() == {
        "duplicate_found": False,
        "message": "Admin access required",
    }
