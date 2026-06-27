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


def test_merchant_release_records_evidence_after_public_verify(client, monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "pytest-merchant-verify-secret")
    _seed_merchant_verify_user()

    token = create_access_token({"sub": "merchant-holder@example.com"})
    issued = client.get(
        "/trust-slips/me/merchant-link?ttl_hours=12&level=standard",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert issued.status_code == 200, issued.text

    path = issued.json()["path"]
    public = client.get(path)
    assert public.status_code == 200, public.text
    assert public.json()["used"] is True

    raw_token = path.rsplit("/", 1)[-1]
    release = client.post(
        "/merchant/releases",
        json={
            "token": raw_token,
            "goods_value": "140.00",
            "currency": "NGN",
            "merchant_note": "Goods released after reviewing the GSN evidence page.",
            "trade_context": "gsn_external",
            "item_title": "Solar phone charger",
            "counterparty_label": "Outside WhatsApp seller",
            "counterparty_whatsapp_label": "Seller WhatsApp label saved by buyer",
            "product_evidence_note": "Product photo/video remains in WhatsApp; final screenshot referenced by buyer.",
            "invoice_reference": "INV-140",
            "invoice_evidence_note": "Invoice screenshot captured from WhatsApp.",
            "agreement_evidence_note": "Final agreement screenshot says release to courier before scheduled payment.",
            "courier_name": "Pilot Courier",
            "courier_contact_label": "Courier WhatsApp label saved by buyer",
            "tracking_number": "TRK-001",
            "released_to_courier_at": "2026-06-27 10:00",
            "expected_delivery_date": "2026-06-30",
            "payment_schedule_note": "Buyer to pay in two parts after courier handoff evidence.",
            "receipt_status": "awaiting_delivery",
        },
    )
    assert release.status_code == 200, release.text
    release_payload = release.json()
    assert release_payload["ok"] is True
    assert release_payload["release_recorded"] is True
    assert release_payload["verification_link_id"] == issued.json()["verification_link_id"]
    assert release_payload["pack_id"] == issued.json()["pack_id"]
    assert release_payload["trade_packet_id"].startswith("MTP-")
    assert release_payload["trade_packet"]["trade_context"] == "gsn_external"
    assert release_payload["trade_packet"]["invoice_reference"] == "INV-140"
    assert release_payload["trade_packet"]["courier_name"] == "Pilot Courier"
    assert release_payload["trade_packet"]["receipt_status"] == "awaiting_delivery"
    assert release_payload["trade_packet"]["evidence_slots"]["invoice"] is True
    assert release_payload["trade_packet"]["evidence_slots"]["courier"] is True
    assert release_payload["trade_packet"]["conversation_system_of_record"] == "whatsapp_or_parties"
    assert release_payload["token_used"] is True
    assert release_payload["token_was_already_used"] is True
    assert "user_id" not in release_payload
    assert "uid" not in release_payload
    assert "not escrow" in release_payload["evidence_boundary"].lower()
    assert "bank confirmation" in release_payload["evidence_boundary"].lower()

    duplicate = client.post(
        "/merchant/releases",
        json={
            "token": raw_token,
            "goods_value": "140.00",
            "currency": "NGN",
            "merchant_note": "Duplicate attempt.",
        },
    )
    assert duplicate.status_code == 400, duplicate.text
    assert duplicate.json()["detail"] == "This merchant release has already been recorded."

    with SessionLocal() as db:
        used_events = (
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "merchant.verify_token_used")
            .all()
        )
        release_events = (
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "merchant.release_recorded")
            .all()
        )
    assert len(used_events) == 1
    assert len(release_events) == 1
    release_meta = json.loads(release_events[0].meta_json)
    assert release_meta["link_id"] == issued.json()["verification_link_id"]
    assert release_meta["pack_id"] == issued.json()["pack_id"]
    assert release_meta["goods_value"] == "140.00"
    assert release_meta["currency"] == "NGN"
    assert release_meta["trade_packet_id"].startswith("MTP-")
    assert release_meta["trade_packet"]["item_title"] == "Solar phone charger"
    assert release_meta["trade_packet"]["counterparty_label"] == "Outside WhatsApp seller"
    assert release_meta["trade_packet"]["invoice_reference"] == "INV-140"
    assert release_meta["trade_packet"]["tracking_number"] == "TRK-001"
    assert release_meta["trade_packet"]["payment_schedule_note"] == "Buyer to pay in two parts after courier handoff evidence."
    assert release_meta["trade_packet"]["external_counterparty_supported"] is True
    assert release_meta["trade_packet"]["evidence_slots"]["agreement"] is True
    assert release_meta["trust_delta"] == "0.00"
    assert release_meta["actor_context"] == "external_merchant_public_release_rail"
    assert release_meta["release_evidence_only"] is True
    assert release_meta["minimum_trade_packet"] is True
    assert release_meta["whatsapp_conversation_not_stored"] is True
    assert release_meta["courier_not_controlled_by_gsn"] is True
    assert release_meta["not_escrow"] is True
    assert release_meta["not_money_custody"] is True
    assert release_meta["not_payout"] is True
    assert release_meta["not_bank_confirmation"] is True
    assert release_meta["not_delivery_guarantee"] is True
    assert release_meta["not_release_authority"] is True


def test_merchant_release_first_marks_token_used_once(client, monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "pytest-merchant-verify-secret")
    _seed_merchant_verify_user()

    token = create_access_token({"sub": "merchant-holder@example.com"})
    issued = client.get(
        "/trust-slips/me/merchant-link?ttl_hours=12&level=standard",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert issued.status_code == 200, issued.text

    raw_token = issued.json()["path"].rsplit("/", 1)[-1]
    release = client.post(
        "/merchant/releases",
        json={
            "token": raw_token,
            "goods_value": "85.50",
            "currency": "NGN",
        },
    )
    assert release.status_code == 200, release.text
    release_payload = release.json()
    assert release_payload["token_used"] is True
    assert release_payload["token_was_already_used"] is False

    public = client.get(issued.json()["path"])
    assert public.status_code == 200, public.text
    assert public.json()["used"] is True

    with SessionLocal() as db:
        assert (
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "merchant.verify_token_used")
            .count()
        ) == 1
        assert (
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "merchant.release_recorded")
            .count()
        ) == 1
