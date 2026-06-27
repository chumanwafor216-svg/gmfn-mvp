from __future__ import annotations

import base64
import json
from datetime import datetime, timezone

from app.core.security import create_access_token
from app.db.database import SessionLocal
from app.db.models import TrustEvent, User


def _b64url_decode(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _seed_merchant_verify_user() -> None:
    with SessionLocal() as db:
        db.add(
            User(
                id=1,
                email="merchant-holder@example.com",
                hashed_password="hashed",
                display_name="Merchant Holder",
                role="user",
                gmfn_id="GSN-U-MERCHANT01",
            )
        )
        db.add(
            TrustEvent(
                event_type="loan_fully_repaid",
                clan_id=1,
                loan_id=77,
                guarantor_id=None,
                actor_user_id=1,
                subject_user_id=1,
                created_at=datetime.now(timezone.utc),
                meta_json=json.dumps(
                    {
                        "reason": "loan_fully_repaid",
                        "payment_reference": "PAY-MERCHANT-ABC123",
                    }
                ),
            )
        )
        db.commit()


def test_merchant_verify_link_public_use_and_append_only_events(client, monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "pytest-merchant-verify-secret")
    _seed_merchant_verify_user()

    token = create_access_token({"sub": "merchant-holder@example.com"})
    headers = {"Authorization": f"Bearer {token}"}

    issued = client.get(
        "/trust-slips/me/merchant-link?ttl_hours=12&level=standard",
        headers=headers,
    )
    assert issued.status_code == 200, issued.text
    issued_payload = issued.json()
    assert issued_payload["ok"] is True
    assert issued_payload["ttl_hours"] == 12
    assert issued_payload["verification_link_id"].startswith("MV-")
    assert issued_payload["pack_id"] == "EP-" + datetime.now(timezone.utc).strftime("%Y%m%d") + "-ABC123"
    assert issued_payload["path"].startswith("/trust-slips/merchant/verify/")

    with SessionLocal() as db:
        created_events = (
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "merchant.verify_link_created")
            .all()
        )
    assert len(created_events) == 1
    created_meta = json.loads(created_events[0].meta_json)
    assert created_meta["link_id"] == issued_payload["verification_link_id"]
    assert created_meta["pack_id"] == issued_payload["pack_id"]

    public = client.get(issued_payload["path"])
    assert public.status_code == 200, public.text
    public_payload = public.json()
    assert public_payload["verified"] is True
    assert public_payload["used"] is True
    assert public_payload["verification_link_id"] == issued_payload["verification_link_id"]
    assert public_payload["pack_id"] == issued_payload["pack_id"]
    assert "uid" not in public_payload
    assert "user_id" not in public_payload
    assert "GSN-U-MERCHANT01" not in public.text
    assert "Not a bank guarantee" in public_payload["disclaimer"]

    second_public = client.get(issued_payload["path"])
    assert second_public.status_code == 200, second_public.text
    assert second_public.json()["used"] is True

    with SessionLocal() as db:
        used_events = (
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "merchant.verify_token_used")
            .all()
        )
    assert len(used_events) == 1
    used_meta = json.loads(used_events[0].meta_json)
    assert used_meta["link_id"] == issued_payload["verification_link_id"]
    assert used_meta["pack_id"] == issued_payload["pack_id"]


def test_merchant_verify_rejects_tampered_token_body(client, monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "pytest-merchant-verify-secret")
    _seed_merchant_verify_user()

    token = create_access_token({"sub": "merchant-holder@example.com"})
    issued = client.get(
        "/trust-slips/me/merchant-link?ttl_hours=12&level=standard",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert issued.status_code == 200, issued.text

    raw_token = issued.json()["path"].rsplit("/", 1)[-1]
    body_b64, sig_b64 = raw_token.split(".", 1)
    body = json.loads(_b64url_decode(body_b64).decode("utf-8"))
    body["uid"] = 999
    tampered_body = _b64url_encode(
        json.dumps(body, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    tampered_token = f"{tampered_body}.{sig_b64}"

    tampered = client.get(f"/trust-slips/merchant/verify/{tampered_token}")
    assert tampered.status_code == 400, tampered.text
    assert tampered.json()["detail"] == "Invalid or expired verification link."

    with SessionLocal() as db:
        assert (
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "merchant.verify_token_used")
            .count()
        ) == 0
