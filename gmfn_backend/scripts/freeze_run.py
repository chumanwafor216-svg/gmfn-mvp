import os
import sys
import json
from typing import Any, Dict, Optional

import requests

BASE_URL = os.getenv("GMFN_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
TIMEOUT = 25

# ----------------------------
# ROUTES (from your Swagger)
# ----------------------------
EP_DEV_CREATE_USER = "/auth/dev/create-user"
EP_LOGIN = "/auth/login"
EP_ME = "/auth/me"

EP_CLAN_BOOTSTRAP = "/clans/dev/bootstrap"
EP_CLAN_SELECT = "/clans/{clan_id}/select"

EP_CREATE_INVITE = "/clans/{clan_id}/invite"
EP_JOIN_BY_INVITE = "/clans/join-by-invite"

EP_POOL_SET = "/clans/{clan_id}/members/pool/set"

EP_CREATE_LOAN = "/loans"
EP_ADD_GUARANTOR = "/loans/{loan_id}/guarantors"
EP_DECIDE_GUARANTOR = "/loans/{loan_id}/guarantors/{guarantor_id}"
EP_REPAY = "/loans/{loan_id}/repayments"

EP_TRUST_EVENTS = "/trust-events"


def die(msg: str) -> None:
    print(f"\n❌ {msg}")
    sys.exit(1)


def pretty(obj: Any) -> str:
    return json.dumps(obj, indent=2, ensure_ascii=False, default=str)


def req(method: str, path: str, token: Optional[str] = None, clan_id: Optional[int] = None, **kwargs) -> requests.Response:
    url = BASE_URL + path
    headers = kwargs.pop("headers", {}) or {}

    headers.setdefault("accept", "application/json")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if clan_id is not None:
        headers["X-Clan-Id"] = str(clan_id)

    kwargs["headers"] = headers
    return requests.request(method, url, timeout=TIMEOUT, **kwargs)


def expect_ok(res: requests.Response, what: str) -> Dict[str, Any]:
    try:
        data = res.json()
    except Exception:
        data = {"raw": res.text}

    if not (200 <= res.status_code < 300):
        print("\n--- REQUEST FAILED ---")
        print(f"{what}: HTTP {res.status_code}")
        print(pretty(data))
        die(f"{what} failed")
    return data


def create_user(email: str, password: str, role: str = "user") -> Dict[str, Any]:
    payload = {"email": email, "password": password, "role": role}
    res = req("POST", EP_DEV_CREATE_USER, json=payload)

    if res.status_code in (200, 201):
        return res.json()
    if res.status_code == 409:
        return {"email": email, "exists": True}
    return expect_ok(res, f"create_user({email})")


def login(email: str, password: str) -> str:
    data = {"username": email, "password": password}
    res = req(
        "POST",
        EP_LOGIN,
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    j = expect_ok(res, f"login({email})")
    token = j.get("access_token")
    if not token:
        die(f"login({email}) returned no access_token: {pretty(j)}")
    return token


def me(token: str) -> Dict[str, Any]:
    return expect_ok(req("GET", EP_ME, token=token), "auth_me")


def bootstrap_clan(admin_token: str) -> Dict[str, Any]:
    return expect_ok(req("POST", EP_CLAN_BOOTSTRAP, token=admin_token), "clan_bootstrap")


def select_clan(token: str, clan_id: int) -> Dict[str, Any]:
    path = EP_CLAN_SELECT.format(clan_id=clan_id)
    return expect_ok(req("POST", path, token=token), "clan_select")


def create_invite(admin_token: str, clan_id: int, days: int = 7, max_uses: int = 1) -> Dict[str, Any]:
    path = EP_CREATE_INVITE.format(clan_id=clan_id)
    # days & max_uses are query params on your route
    return expect_ok(
        req("POST", path, token=admin_token, clan_id=clan_id, params={"days": days, "max_uses": max_uses}),
        "create_invite",
    )


def join_by_invite(token: str, invite_code: str) -> Dict[str, Any]:
    payload = {"invite_code": invite_code}
    return expect_ok(req("POST", EP_JOIN_BY_INVITE, token=token, json=payload), "join_by_invite")


def set_pool(admin_token: str, clan_id: int, user_id: int, balance: str) -> Dict[str, Any]:
    path = EP_POOL_SET.format(clan_id=clan_id)
    payload = {"user_id": int(user_id), "balance": str(balance)}
    return expect_ok(req("POST", path, token=admin_token, clan_id=clan_id, json=payload), "set_pool")

def create_loan(token: str, clan_id: int, amount: str, currency: str = "NGN") -> Dict[str, Any]:
    payload = {"clan_id": int(clan_id), "amount": str(amount), "currency": currency}
    return expect_ok(req("POST", EP_CREATE_LOAN, token=token, clan_id=clan_id, json=payload), "create_loan")

def add_guarantor(token: str, clan_id: int, loan_id: int, guarantor_user_id: int, pledge_amount: str) -> Dict[str, Any]:
    path = EP_ADD_GUARANTOR.format(loan_id=loan_id)
    payload = {"guarantor_user_id": int(guarantor_user_id), "pledge_amount": str(pledge_amount)}
    return expect_ok(req("POST", path, token=token, clan_id=clan_id, json=payload), "add_guarantor")


def decide_guarantor(token: str, clan_id: int, loan_id: int, guarantor_row_id: int, status: str, reason: str, note: str) -> Dict[str, Any]:
    path = EP_DECIDE_GUARANTOR.format(loan_id=loan_id, guarantor_id=guarantor_row_id)
    payload = {"status": status, "reason": reason, "note": note}
    return expect_ok(req("PATCH", path, token=token, clan_id=clan_id, json=payload), "decide_guarantor")


def repay(token: str, clan_id: int, loan_id: int, amount: str) -> Dict[str, Any]:
    path = EP_REPAY.format(loan_id=loan_id)
    payload = {"amount": str(amount)}
    return expect_ok(req("POST", path, token=token, clan_id=clan_id, json=payload), "repay")


def trust_events(admin_token: str, clan_id: int, loan_id: int) -> Dict[str, Any]:
    return expect_ok(
        req("GET", EP_TRUST_EVENTS, token=admin_token, clan_id=clan_id, params={"clan_id": clan_id, "loan_id": loan_id}),
        "trust_events",
    )


def main() -> None:
    print(f"GMFN freeze run against {BASE_URL}")

    pw = os.getenv("GMFN_PW", "test7576")

    admin_email = os.getenv("GMFN_ADMIN_EMAIL", "admin.freeze@gmfn.dev")
    borrower_email = os.getenv("GMFN_BORROWER_EMAIL", "borrower.freeze@gmfn.dev")
    guarantor_email = os.getenv("GMFN_GUARANTOR_EMAIL", "guarantor.freeze@gmfn.dev")
    m2_email = os.getenv("GMFN_M2_EMAIL", "m2.freeze@gmfn.dev")
    m3_email = os.getenv("GMFN_M3_EMAIL", "m3.freeze@gmfn.dev")  # optional

    print("\n1) Ensuring users exist...")
    create_user(admin_email, pw, role="admin")     # ✅ important: admin role
    create_user(borrower_email, pw, role="user")
    create_user(guarantor_email, pw, role="user")
    create_user(m2_email, pw, role="user")
    create_user(m3_email, pw, role="user")

    print("\n2) Logging in...")
    admin_token = login(admin_email, pw)
    borrower_token = login(borrower_email, pw)
    guarantor_token = login(guarantor_email, pw)
    m2_token = login(m2_email, pw)
    m3_token = login(m3_email, pw)

    print("\n3) Bootstrapping clan (admin)...")
    boot = bootstrap_clan(admin_token)
    clan_id = int(boot.get("clan_id") or 1)
    print(f"   clan_id = {clan_id}")
    print(f"   bootstrap = {pretty(boot)}")

    # Make sure each user "selects" clan (helps your frontend pattern; also sanity)
    print("\n4) Selecting clan context for each user...")
    select_clan(admin_token, clan_id)
    select_clan(borrower_token, clan_id)
    select_clan(guarantor_token, clan_id)
    select_clan(m2_token, clan_id)
    select_clan(m3_token, clan_id)

    print("\n5) Creating invites & joining borrower/guarantor/m2...")
    inv_b = create_invite(admin_token, clan_id, days=7, max_uses=1)
    inv_g = create_invite(admin_token, clan_id, days=7, max_uses=1)
    inv_m2 = create_invite(admin_token, clan_id, days=7, max_uses=1)

    code_b = inv_b.get("code") or inv_b.get("invite_code")
    code_g = inv_g.get("code") or inv_g.get("invite_code")
    code_m2 = inv_m2.get("code") or inv_m2.get("invite_code")

    if not (code_b and code_g and code_m2):
        die(f"Invite codes missing:\n{pretty({'inv_b':inv_b,'inv_g':inv_g,'inv_m2':inv_m2})}")

    join_by_invite(borrower_token, str(code_b))
    join_by_invite(guarantor_token, str(code_g))
    join_by_invite(m2_token, str(code_m2))
    print(f"   Joined borrower/guarantor/m2 with codes: {code_b}, {code_g}, {code_m2}")

    # IDs
    borrower_id = int(me(borrower_token)["id"])
    guarantor_id = int(me(guarantor_token)["id"])
    m2_id = int(me(m2_token)["id"])

    print("\n6) Setting pools (admin)...")
    set_pool(admin_token, clan_id, borrower_id, "100.00")
    set_pool(admin_token, clan_id, guarantor_id, "200.00")
    set_pool(admin_token, clan_id, m2_id, "200.00")
    print("   Pools set.")

    print("\n7) Borrower creates BELOW-pool loan (30.00)...")
    loan1 = create_loan(borrower_token, clan_id, "30.00", currency="NGN")
    loan1_id = int(loan1["id"])
    print(f"   loan1_id={loan1_id} status={loan1.get('status')} guarantors_required={loan1.get('guarantors_required')}")
    # Optional: print guarantee fields if present
    for k in ("personal_pool_at_request", "pool_used", "guarantee_gap"):
        if k in loan1:
            print(f"   {k}={loan1.get(k)}")

    print("\n8) Borrower creates ABOVE-pool loan (150.00)...")
    loan2 = create_loan(borrower_token, clan_id, "150.00", currency="NGN")
    loan2_id = int(loan2["id"])
    print(f"   loan2_id={loan2_id} status={loan2.get('status')} guarantors_required={loan2.get('guarantors_required')}")
    for k in ("personal_pool_at_request", "pool_used", "guarantee_gap"):
        if k in loan2:
            print(f"   {k}={loan2.get(k)}")

    print("\n9) Borrower adds guarantors (pledge > 0)...")
    g1 = add_guarantor(borrower_token, clan_id, loan2_id, guarantor_id, "40.00")
    g2 = add_guarantor(borrower_token, clan_id, loan2_id, m2_id, "40.00")
    g1_id = int(g1["id"])
    g2_id = int(g2["id"])
    print(f"   guarantor rows: {g1_id}, {g2_id}")

    print("\n10) Guarantors approve...")
    decide_guarantor(guarantor_token, clan_id, loan2_id, g1_id, "approved", "freeze_test", "Backing borrower for stock purchase.")
    decide_guarantor(m2_token, clan_id, loan2_id, g2_id, "approved", "freeze_test", "Backing borrower for stock purchase.")
    print("   Approved guarantors.")

    print("\n11) Borrower makes repayment (50.00)...")
    repay(borrower_token, clan_id, loan2_id, "50.00")

    print("\n12) TrustEvents for loan2 (admin view)...")
    te = trust_events(admin_token, clan_id, loan2_id)
    print(pretty(te))

    print("\n✅ Freeze run completed.")
    print("Check that TrustEvents show: invite_created, clan_join_via_invite, pool_set (if logged), loan.created, guarantor events, loan.auto_approved, repayment.made.")


if __name__ == "__main__":
    main()