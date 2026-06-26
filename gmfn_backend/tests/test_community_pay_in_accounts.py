from __future__ import annotations


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
