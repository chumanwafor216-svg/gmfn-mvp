from __future__ import annotations

import json
import shutil
from pathlib import Path

from sqlalchemy import text

from app.db.database import engine


TEST_UPLOAD_ROOT = Path(__file__).resolve().parents[1] / "test_uploads_payment_proofs"


def _payload() -> dict:
    return {
        "account_name": "Aberdeen Community Pool",
        "bank_name": "HSBC",
        "account_number": "52785706",
        "sort_code": "40-12-65",
        "country": "GB",
        "currency": "GBP",
        "note": "Community pool receiving account",
    }


def test_clan_admin_can_save_and_read_community_pay_in_account(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    res = client.put("/community-pay-in-accounts/1", json=_payload())
    assert res.status_code == 200
    body = res.json()
    assert body["configured"] is True
    assert body["account_name"] == "Aberdeen Community Pool"
    assert body["settlement"]["account_number"] == "52785706"
    assert body["settlement"]["sort_code"] == "40-12-65"
    assert body["settlement"]["source"] == "community_pay_in_account"

    read_res = client.get("/community-pay-in-accounts/1")
    assert read_res.status_code == 200
    read_body = read_res.json()
    assert read_body["settlement"]["bank_name"] == "HSBC"
    assert read_body["settlement"]["configured"] is True


def test_normal_member_cannot_save_community_pay_in_account(
    client,
    seed_clan_member_membership,
    override_current_user_user,
):
    res = client.put("/community-pay-in-accounts/1", json=_payload())
    assert res.status_code == 403


def test_owner_member_can_save_community_pay_in_account(
    client,
    seed_clan_member_membership,
    override_current_user_user,
):
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                UPDATE clan_memberships
                SET role = 'owner'
                WHERE clan_id = 1 AND user_id = 1
                """
            )
        )

    res = client.put("/community-pay-in-accounts/1", json=_payload())
    assert res.status_code == 200
    assert res.json()["settlement"]["source"] == "community_pay_in_account"


def test_community_pay_in_account_rejects_malformed_text_fields(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    for field_name in (
        "account_name",
        "bank_name",
        "account_number",
        "sort_code",
        "routing_number",
        "iban",
        "swift_bic",
        "country",
        "currency",
        "note",
    ):
        payload = _payload()
        payload[field_name] = False
        rejected_bool = client.put("/community-pay-in-accounts/1", json=payload)
        assert rejected_bool.status_code == 422, (field_name, rejected_bool.text)
        assert f"{field_name} must be text" in rejected_bool.text

        payload[field_name] = 1.5
        rejected_float = client.put("/community-pay-in-accounts/1", json=payload)
        assert rejected_float.status_code == 422, (field_name, rejected_float.text)
        assert f"{field_name} must be text" in rejected_float.text


def test_pool_instruction_uses_saved_community_pay_in_account(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    save_res = client.put("/community-pay-in-accounts/1", json=_payload())
    assert save_res.status_code == 200

    res = client.post(
        "/payment-instructions/pool",
        json={
            "clan_id": 1,
            "amount": "20.00",
            "currency": "GBP",
            "contribution_reason": "Yearly contribution",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["reference_display"].startswith("GMFN-POOL-CLAN-1-U1-")
    assert body["settlement"]["bank_name"] == "HSBC"
    assert body["settlement"]["account_name"] == "Aberdeen Community Pool"
    assert body["settlement"]["account_number"] == "52785706"
    assert body["settlement"]["configured"] is True


def test_pool_instruction_rejects_malformed_boundary_controls(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    base_payload = {
        "clan_id": 1,
        "amount": "20.00",
        "currency": "GBP",
        "contribution_reason": "Yearly contribution",
    }

    for field_name in ("currency", "contribution_reason"):
        payload = dict(base_payload)
        payload[field_name] = False
        rejected_bool = client.post("/payment-instructions/pool", json=payload)
        assert rejected_bool.status_code == 422, (field_name, rejected_bool.text)
        assert f"{field_name} must be text" in rejected_bool.text

        payload[field_name] = 1.5
        rejected_float = client.post("/payment-instructions/pool", json=payload)
        assert rejected_float.status_code == 422, (field_name, rejected_float.text)
        assert f"{field_name} must be text" in rejected_float.text

    payload = dict(base_payload)
    payload["clan_id"] = False
    rejected_bool_id = client.post("/payment-instructions/pool", json=payload)
    assert rejected_bool_id.status_code == 422
    assert "clan_id must be an integer, not a boolean" in rejected_bool_id.text

    payload["clan_id"] = 1.5
    rejected_float_id = client.post("/payment-instructions/pool", json=payload)
    assert rejected_float_id.status_code == 422
    assert "clan_id must be an integer, not a float" in rejected_float_id.text

    for bad_value in (False, 20):
        payload = dict(base_payload)
        payload["amount"] = bad_value
        rejected_amount = client.post("/payment-instructions/pool", json=payload)
        assert rejected_amount.status_code == 422, rejected_amount.text
        assert "amount must be a decimal string" in rejected_amount.text


def test_pool_payment_proof_upload_attaches_to_expected_payment(
    client,
    seed_clan_admin_membership,
    override_current_user,
    monkeypatch,
):
    shutil.rmtree(TEST_UPLOAD_ROOT, ignore_errors=True)
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(TEST_UPLOAD_ROOT))

    res = client.post(
        "/payment-instructions/pool",
        json={
            "clan_id": 1,
            "amount": "20.00",
            "currency": "GBP",
            "contribution_reason": "Yearly contribution",
        },
    )
    assert res.status_code == 200
    instruction = res.json()
    expected_payment_id = int(instruction["expected_payment_id"])

    upload_res = client.post(
        f"/payment-instructions/expected/{expected_payment_id}/proof",
        data={
            "clan_id": "1",
            "reference": instruction["reference_display"],
        },
        files={
            "file": ("proof.png", b"\x89PNG\r\n\x1a\nproof", "image/png"),
        },
    )
    assert upload_res.status_code == 200
    body = upload_res.json()
    assert body["status"] == "expected"
    assert body["proof"]["proof_status"] == "submitted"
    assert body["proof"]["url"].startswith("/uploads/payment-proofs/")
    assert body["meta"]["proof_status"] == "submitted"

    with engine.begin() as conn:
        row = conn.execute(
            text(
                """
                SELECT meta_json, status
                FROM expected_payments
                WHERE id = :id
                """
            ),
            {"id": expected_payment_id},
        ).mappings().one()

    meta = json.loads(row["meta_json"])
    assert row["status"] == "expected"
    assert meta["proof_status"] == "submitted"
    assert meta["payment_proofs"][0]["original_filename"] == "proof.png"
    shutil.rmtree(TEST_UPLOAD_ROOT, ignore_errors=True)


def test_pool_payment_proof_rejects_wrong_reference(
    client,
    seed_clan_admin_membership,
    override_current_user,
    monkeypatch,
):
    shutil.rmtree(TEST_UPLOAD_ROOT, ignore_errors=True)
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(TEST_UPLOAD_ROOT))

    res = client.post(
        "/payment-instructions/pool",
        json={
            "clan_id": 1,
            "amount": "20.00",
            "currency": "GBP",
            "contribution_reason": "Yearly contribution",
        },
    )
    assert res.status_code == 200
    instruction = res.json()

    upload_res = client.post(
        f"/payment-instructions/expected/{int(instruction['expected_payment_id'])}/proof",
        data={
            "clan_id": "1",
            "reference": "WRONG-REFERENCE",
        },
        files={
            "file": ("proof.png", b"\x89PNG\r\n\x1a\nproof", "image/png"),
        },
    )
    assert upload_res.status_code == 400
    shutil.rmtree(TEST_UPLOAD_ROOT, ignore_errors=True)
