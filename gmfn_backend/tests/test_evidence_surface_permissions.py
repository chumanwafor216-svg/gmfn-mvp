from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import text

from app.db.database import SessionLocal


def _mark_membership_left(*, user_id: int, clan_id: int) -> None:
    with SessionLocal() as db:
        db.execute(
            text(
                """
                UPDATE clan_memberships
                SET left_at = :left_at
                WHERE user_id = :user_id AND clan_id = :clan_id
                """
            ),
            {
                "left_at": datetime.now(timezone.utc),
                "user_id": int(user_id),
                "clan_id": int(clan_id),
            },
        )
        db.commit()


def test_member_cannot_download_admin_analytics_evidence_surfaces(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    endpoints = [
        "/analytics/clans/1/invites",
        "/analytics/clans/1/invites/recent-joins",
        "/analytics/clans/1/trust-events",
        "/analytics/clans/1/invites/recent-joins.csv",
        "/analytics/clans/1/trust-events.csv",
        "/analytics/clans/1/evidence-pack.pdf",
    ]

    for endpoint in endpoints:
        response = client.get(endpoint)
        assert response.status_code == 403, endpoint


def test_inactive_admin_membership_cannot_download_report_artifacts(
    client,
    override_current_user_user,
    seed_clan_admin_membership,
):
    _mark_membership_left(user_id=1, clan_id=1)

    response = client.get("/reports/clans/1/exposure.csv")

    assert response.status_code == 403


def test_platform_admin_can_download_loan_report_without_membership(
    client,
    override_current_user,
    seed_loan,
):
    response = client.get("/reports/loans/1/trust-report.csv")

    assert response.status_code == 200
    assert response.headers["content-disposition"] == 'attachment; filename="gsn-loan-1-trust-report.csv"'


def test_borrower_gets_redacted_pdf_but_not_complete_loan_exports(
    client,
    override_current_user_user,
    seed_clan_member_membership,
    seed_loan,
):
    blocked_endpoints = [
        "/reports/loans/1/trust-report.csv",
        "/reports/loans/1/trust-report.pdf?redact=false",
        "/reports/loans/1/evidence-pack.zip",
    ]

    for endpoint in blocked_endpoints:
        response = client.get(endpoint)
        assert response.status_code == 403, endpoint

    response = client.get("/reports/loans/1/trust-report.pdf")

    assert response.status_code == 200
    assert response.headers["content-disposition"] == 'attachment; filename="gsn-loan-1-trust-report.pdf"'
