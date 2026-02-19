# tests/test_guarantor_decision.py

def test_patch_loan_guarantor_status_ok_contract(
    client,
    override_current_user,
    override_clan_ctx_admin,
    seed_loan_guarantor,
):
    payload = {"status": "approved"}
    r = client.patch("/loans/1/guarantors/1", json=payload)
    assert r.status_code == 200, r.text

    data = r.json()
    assert data["loan_id"] == 1
    assert data["clan_id"] == 1
    assert data["guarantor_user_id"] == 1
    assert data["status"] == "approved"

    # Decimal-safe contract: money fields are strings
    assert "pledge_amount" in data
    assert isinstance(data["pledge_amount"], str)
    assert float(data["pledge_amount"]) > 0.0


def test_patch_loan_guarantor_status_invalid_value_contract(
    client,
    override_current_user,
    override_clan_ctx_admin,
    seed_loan_guarantor,
):
    payload = {"status": "INVALID_STATUS"}
    r = client.patch("/loans/1/guarantors/1", json=payload)
    assert r.status_code in (400, 422), r.text
    assert "detail" in r.json()


def test_patch_loan_guarantor_status_not_found_contract(
    client,
    override_current_user,
    override_clan_ctx_admin,
    seed_clan_admin_membership,
    seed_loan,
):
    payload = {"status": "approved"}
    r = client.patch("/loans/1/guarantors/999999", json=payload)
    assert r.status_code == 404, r.text
    assert "detail" in r.json()