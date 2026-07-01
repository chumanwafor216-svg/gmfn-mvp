from __future__ import annotations


def test_expected_loan_repayment_rejects_malformed_loan_id(
    client,
    override_clan_ctx_admin,
):
    base_payload = {
        "loan_id": 1,
        "amount": "25.00",
        "currency": "NGN",
    }

    for bad_value, expected_text in (
        (False, "loan_id must be an integer, not a boolean"),
        (True, "loan_id must be an integer, not a boolean"),
        (1.0, "loan_id must be an integer, not a float"),
    ):
        payload = dict(base_payload)
        payload["loan_id"] = bad_value
        response = client.post("/bank/expected/loan-repayment", json=payload)
        assert response.status_code == 422, response.text
        assert expected_text in response.text
