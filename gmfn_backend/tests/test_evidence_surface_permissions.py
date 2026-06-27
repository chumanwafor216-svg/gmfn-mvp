from __future__ import annotations

from io import BytesIO
import zipfile
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


def test_borrower_gets_redacted_analytics_loan_pdf_but_not_complete_copy(
    client,
    override_current_user_user,
    seed_clan_member_membership,
    seed_loan,
):
    response = client.get("/analytics/loans/1/evidence-pack.pdf")

    assert response.status_code == 200
    assert response.headers["content-disposition"] == 'attachment; filename="gsn-loan-1-evidence-pack.pdf"'

    response = client.get("/analytics/loans/1/evidence-pack.pdf?redact=false")

    assert response.status_code == 403


def test_loan_audit_share_links_route_stays_dormant_until_approved(
    client,
    override_current_user_user,
    seed_clan_member_membership,
    seed_loan,
):
    response = client.get("/share/loans/1/audit-links")

    assert response.status_code == 404


def test_governance_pack_marks_complete_private_admin_record(
    client,
    override_current_user,
    seed_clan_admin_membership,
):
    response = client.get("/reports/clans/1/governance-pack.zip")

    assert response.status_code == 200

    with zipfile.ZipFile(BytesIO(response.content)) as archive:
        names = set(archive.namelist())
        assert "README.txt" in names
        assert "manifest.json" in names

        readme = archive.read("README.txt").decode("utf-8")
        members_csv = archive.read("community-1-members.csv").decode("utf-8")
        manifest = archive.read("manifest.json").decode("utf-8")

    assert "Privacy: complete private admin record" in readme
    assert "Do not share outside authorized GSN/community governance review." in readme
    assert "membership_status" in members_csv
    assert "left_at" in members_csv
    assert '"privacy": "complete_admin_record"' in manifest
