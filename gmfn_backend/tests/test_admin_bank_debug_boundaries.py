from __future__ import annotations

import shutil
from pathlib import Path

from fastapi.testclient import TestClient


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
