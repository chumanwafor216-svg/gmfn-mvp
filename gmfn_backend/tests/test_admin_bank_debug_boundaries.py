from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

from fastapi.testclient import TestClient

from app.db.bank_models import ExpectedPayment
from app.db.database import SessionLocal
from app.db.models import Clan, CommunityDomain, User
from app.services.reconciliation_service import normalize_reference


TEST_UPLOAD_ROOT = Path("test_uploads") / "admin-bank-proof"


def test_admin_bank_debug_recent_events_rejects_limit_outside_route_bounds(
    client: TestClient,
    override_current_user,
):
    low_response = client.get(
        "/admin/bank/bank-events/recent",
        params={"clan_id": 1, "limit": 0},
    )
    high_response = client.get(
        "/admin/bank/bank-events/recent",
        params={"clan_id": 1, "limit": 201},
    )

    assert low_response.status_code == 422, low_response.text
    assert high_response.status_code == 422, high_response.text
    assert "limit" in low_response.text
    assert "limit" in high_response.text


def test_admin_bank_debug_expected_payments_rejects_limit_outside_route_bounds(
    client: TestClient,
    override_current_user,
):
    low_response = client.get(
        "/admin/bank/expected-payments/recent",
        params={"clan_id": 1, "limit": 0},
    )
    high_response = client.get(
        "/admin/bank/expected-payments/recent",
        params={"clan_id": 1, "limit": 201},
    )

    assert low_response.status_code == 422, low_response.text
    assert high_response.status_code == 422, high_response.text
    assert "limit" in low_response.text
    assert "limit" in high_response.text


def test_admin_bank_debug_expected_payments_exposes_submitted_proof_metadata(
    client: TestClient,
    override_current_user,
    seed_clan_admin_membership,
    monkeypatch,
):
    shutil.rmtree(TEST_UPLOAD_ROOT, ignore_errors=True)
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(TEST_UPLOAD_ROOT))

    instruction_response = client.post(
        "/payment-instructions/pool",
        json={
            "clan_id": 1,
            "amount": "100.00",
            "currency": "GBP",
            "contribution_reason": "Community Domain setup",
        },
    )
    assert instruction_response.status_code == 200, instruction_response.text
    instruction = instruction_response.json()

    proof_response = client.post(
        f"/payment-instructions/expected/{int(instruction['expected_payment_id'])}/proof",
        data={
            "clan_id": "1",
            "reference": instruction["reference_display"],
        },
        files={
            "file": (
                "committee-domain-proof.pdf",
                b"%PDF-1.4 proof",
                "application/pdf",
            ),
        },
    )
    assert proof_response.status_code == 200, proof_response.text

    admin_response = client.get(
        "/admin/bank/expected-payments/recent",
        params={"clan_id": 1, "limit": 5},
    )
    assert admin_response.status_code == 200, admin_response.text
    items = admin_response.json()["items"]
    assert len(items) == 1
    item = items[0]
    assert item["proof_status"] == "submitted"
    assert item["proof_status_text"] == "Submitted for finance review"
    assert item["proof_filename"] == "committee-domain-proof.pdf"
    assert item["proof_submitted_at"]
    assert (
        item["meta"]["latest_payment_proof"]["original_filename"]
        == "committee-domain-proof.pdf"
    )

    shutil.rmtree(TEST_UPLOAD_ROOT, ignore_errors=True)


def _seed_domain_expected_payment() -> tuple[int, int]:
    reference = "GMFN-CDOM-U1-C1-D1-ANNUAL-TEST"
    with SessionLocal() as db:
        owner = User(
            id=1,
            email="pytest@example.com",
            hashed_password="hashed",
            role="admin",
        )
        db.add(owner)
        clan = Clan(
            id=1,
            name="Admin Bank Debug Community",
            description="Community for admin bank debug tests.",
            created_by_user_id=1,
            invite_code="admin-bank-debug-invite",
            invite_created_at=datetime.now(timezone.utc),
            invite_expires_at=datetime.now(timezone.utc),
            invite_uses=0,
        )
        db.add(clan)
        db.flush()
        domain = CommunityDomain(
            domain_name="admin-bank-debug-domain",
            display_name="Admin Bank Debug Domain",
            domain_type="ngo_project_network",
            template_key="ngo_project_network",
            owner_user_id=1,
            clan_id=1,
            status="draft",
            verification_status="unverified",
        )
        db.add(domain)
        db.flush()
        expected = ExpectedPayment(
            clan_id=1,
            user_id=1,
            expected_type="community_domain_subscription",
            amount=Decimal("100.00"),
            currency="GBP",
            paid_amount=Decimal("0.00"),
            remaining_amount=Decimal("100.00"),
            reference_display=reference,
            reference_normalized=normalize_reference(reference),
            status="expected",
            status_reason=None,
            created_at=datetime.now(timezone.utc),
            meta_json=json.dumps(
                {
                    "feature_code": "community_domain",
                    "plan_code": "community_domain_starter_year",
                    "owner_user_id": 1,
                    "clan_id": 1,
                    "community_domain_id": 1,
                    "billing_cycle": "annual",
                    "quantity_total": 1,
                    "proof_status": "submitted",
                    "proof_status_text": "Submitted for finance review",
                    "proof_submitted_at": datetime.now(timezone.utc).isoformat(),
                    "latest_payment_proof": {
                        "original_filename": "pilot-proof.pdf",
                        "stored_filename": "stored-pilot-proof.pdf",
                        "submitted_at": datetime.now(timezone.utc).isoformat(),
                    },
                }
            ),
        )
        db.add(expected)
        db.commit()
        return int(expected.id), int(domain.id)


def test_admin_finance_review_approval_activates_community_domain_subscription(
    client: TestClient,
    override_current_user,
):
    expected_id, domain_id = _seed_domain_expected_payment()

    response = client.post(
        f"/admin/bank/expected-payments/{expected_id}/finance-review",
        json={
            "decision": "approve",
            "note": "Checked bank receipt manually in pilot.",
        },
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["ok"] is True
    assert payload["decision"] == "approved"
    assert payload["bank_event_id"] is None
    assert payload["entitlement_id"]
    assert "manual finance review" in payload["boundary"].lower()

    expected = payload["expected_payment"]
    assert expected["status"] == "confirmed"
    assert expected["proof_status"] == "approved"
    assert expected["finance_review_status"] == "approved"
    assert expected["meta"]["manual_finance_review"] is True
    assert expected["meta"]["community_domain_activation"]["community_domain_id"] == domain_id

    with SessionLocal() as db:
        row = db.get(CommunityDomain, domain_id)
        assert row is not None
        assert row.status == "active"


def test_admin_finance_review_rejection_does_not_activate_community_domain(
    client: TestClient,
    override_current_user,
):
    expected_id, domain_id = _seed_domain_expected_payment()

    response = client.post(
        f"/admin/bank/expected-payments/{expected_id}/finance-review",
        json={
            "decision": "reject",
            "note": "Receipt unreadable.",
        },
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["ok"] is True
    assert payload["decision"] == "rejected"
    assert "no community domain activation" in payload["boundary"].lower()
    expected = payload["expected_payment"]
    assert expected["status"] == "expected"
    assert expected["proof_status"] == "rejected"
    assert expected["finance_review_status"] == "rejected"

    with SessionLocal() as db:
        row = db.get(CommunityDomain, domain_id)
        assert row is not None
        assert row.status == "draft"
