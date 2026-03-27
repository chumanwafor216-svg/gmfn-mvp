from __future__ import annotations

from decimal import Decimal

from app.services.loan_hardening_service import (
    coverage_ok_for_loan,
    guarantee_gap_for_loan,
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