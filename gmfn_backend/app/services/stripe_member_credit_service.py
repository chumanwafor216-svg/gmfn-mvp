from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Mapping, Optional

from sqlalchemy.orm import Session

from app.services.member_credit_purchase_service import (
    CollectionSession,
    VerifiedTransfer,
    record_verified_collection_transfer,
)
from app.services.member_credit_service import MemberCreditError


STRIPE_PROVIDER_KEY = "stripe-checkout"
STRIPE_PURPOSE = "gsn_pipeline_credit_purchase"


def _required_env(name: str) -> str:
    value = str(os.getenv(name, "") or "").strip()
    if not value:
        raise MemberCreditError(f"{name.lower()}_required")
    return value


def _mode_from_env() -> str:
    mode = str(os.getenv("GSN_STRIPE_MODE", "test") or "test").strip().lower()
    if mode not in {"test", "live"}:
        raise MemberCreditError("gsn_stripe_mode_invalid")
    return mode


def _expected_livemode() -> bool:
    return _mode_from_env() == "live"


def _as_mapping(value: Any) -> Mapping[str, Any]:
    if isinstance(value, Mapping):
        return value
    to_dict = getattr(value, "to_dict", None)
    if callable(to_dict):
        converted = to_dict(recursive=True)
        return converted if isinstance(converted, Mapping) else {}
    try:
        return dict(value)
    except (TypeError, ValueError):
        return {}


def _object_id(value: Any) -> str:
    if isinstance(value, str):
        return value
    return str(_as_mapping(value).get("id") or "")


class StripeCheckoutCollectionAdapter:
    provider_key = STRIPE_PROVIDER_KEY

    def __init__(
        self, *, client: Any, merchant_key: str, mode: str,
        success_url: str, cancel_url: str,
    ) -> None:
        self.client = client
        self.merchant_key = str(merchant_key)
        self.mode = str(mode)
        self.success_url = str(success_url)
        self.cancel_url = str(cancel_url)

    @classmethod
    def from_environment(cls) -> "StripeCheckoutCollectionAdapter":
        import stripe

        api_key = _required_env("STRIPE_SECRET_KEY")
        mode = _mode_from_env()
        expected_prefix = "sk_live_" if mode == "live" else "sk_test_"
        restricted_prefix = "rk_live_" if mode == "live" else "rk_test_"
        if not api_key.startswith((expected_prefix, restricted_prefix)):
            raise MemberCreditError("stripe_secret_key_mode_mismatch")
        return cls(
            client=stripe.StripeClient(api_key),
            merchant_key=_required_env("GSN_STRIPE_MERCHANT_KEY"),
            mode=mode,
            success_url=_required_env("GSN_STRIPE_CHECKOUT_SUCCESS_URL"),
            cancel_url=_required_env("GSN_STRIPE_CHECKOUT_CANCEL_URL"),
        )

    def _verify_merchant_account(self) -> None:
        account = self.client.v1.accounts.retrieve_current()
        if _object_id(account) != self.merchant_key:
            raise MemberCreditError("stripe_merchant_account_mismatch")

    def create_session(
        self, *, idempotency_key: str, reference: str, amount_minor: int,
        currency: str, purchase_order_key: str, member_user_id: int,
    ) -> CollectionSession:
        self._verify_merchant_account()
        metadata = {
            "gsn_purpose": STRIPE_PURPOSE,
            "gsn_merchant_key": self.merchant_key,
            "gsn_collection_reference": str(reference),
            "gsn_purchase_order_key": str(purchase_order_key),
            "gsn_member_user_id": str(int(member_user_id)),
        }
        session = self.client.v1.checkout.sessions.create(
            {
                "mode": "payment",
                "client_reference_id": str(purchase_order_key),
                "success_url": self.success_url,
                "cancel_url": self.cancel_url,
                "line_items": [{
                    "quantity": 1,
                    "price_data": {
                        "currency": str(currency).lower(),
                        "unit_amount": int(amount_minor),
                        "product_data": {"name": "GSN Pipeline Credits"},
                    },
                }],
                "metadata": metadata,
                "payment_intent_data": {"metadata": metadata},
            },
            options={"idempotency_key": str(idempotency_key)},
        )
        data = _as_mapping(session)
        if bool(data.get("livemode")) != (self.mode == "live"):
            raise MemberCreditError("stripe_session_mode_mismatch")
        session_id = str(data.get("id") or "")
        checkout_url = str(data.get("url") or "")
        if not session_id or not checkout_url:
            raise MemberCreditError("stripe_checkout_session_incomplete")
        return CollectionSession(
            provider_session_id=session_id,
            collection_reference=str(reference),
            public_payload={
                "kind": "stripe_checkout",
                "checkout_url": checkout_url,
                "expires_at": data.get("expires_at"),
                "livemode": bool(data.get("livemode")),
            },
        )

    def check_session(self, *, provider_session_id: str) -> list[VerifiedTransfer]:
        self._verify_merchant_account()
        session = self.client.v1.checkout.sessions.retrieve(str(provider_session_id))
        transfer = _verified_transfer_from_session(
            session, merchant_key=self.merchant_key,
            expected_livemode=self.mode == "live",
        )
        return [] if transfer is None else [transfer]


def construct_verified_stripe_event(raw_body: bytes, signature: str) -> Mapping[str, Any]:
    import stripe

    secret = _required_env("STRIPE_WEBHOOK_SECRET")
    event = stripe.Webhook.construct_event(raw_body, str(signature or ""), secret)
    return _as_mapping(event)


def _verified_transfer_from_session(
    session: Any, *, merchant_key: str, expected_livemode: bool,
) -> Optional[VerifiedTransfer]:
    data = _as_mapping(session)
    if str(data.get("object") or "") != "checkout.session":
        raise MemberCreditError("stripe_object_not_checkout_session")
    if bool(data.get("livemode")) != bool(expected_livemode):
        raise MemberCreditError("stripe_event_mode_mismatch")
    metadata = _as_mapping(data.get("metadata"))
    if str(metadata.get("gsn_purpose") or "") != STRIPE_PURPOSE:
        return None
    if str(metadata.get("gsn_merchant_key") or "") != str(merchant_key):
        raise MemberCreditError("stripe_merchant_context_mismatch")
    if str(data.get("mode") or "") != "payment":
        raise MemberCreditError("stripe_checkout_mode_mismatch")
    if str(data.get("payment_status") or "") != "paid":
        return None
    amount = int(data.get("amount_total") or 0)
    currency = str(data.get("currency") or "").upper()
    payment_intent_id = _object_id(data.get("payment_intent"))
    session_id = str(data.get("id") or "")
    reference = str(metadata.get("gsn_collection_reference") or "")
    order_key = str(metadata.get("gsn_purchase_order_key") or "")
    member_user_id = int(metadata.get("gsn_member_user_id") or 0)
    client_reference_id = str(data.get("client_reference_id") or "")
    if (
        amount <= 0 or not currency or not payment_intent_id
        or not session_id or not reference or not order_key or member_user_id <= 0
    ):
        raise MemberCreditError("stripe_checkout_binding_incomplete")
    if client_reference_id != order_key:
        raise MemberCreditError("stripe_client_reference_mismatch")
    created = datetime.fromtimestamp(int(data.get("created") or 0), tz=timezone.utc)
    return VerifiedTransfer(
        provider_transaction_id=payment_intent_id,
        merchant_key=str(merchant_key),
        collection_reference=reference,
        amount_minor=amount,
        currency=currency,
        verified_at=created,
        provider_session_id=session_id,
        purchase_order_key=order_key,
        member_user_id=member_user_id,
    )


def process_stripe_member_credit_event(
    db: Session, *, event: Mapping[str, Any], now: Optional[datetime] = None,
) -> dict[str, object]:
    event_type = str(event.get("type") or "")
    data = _as_mapping(event.get("data"))
    session = _as_mapping(data.get("object"))
    metadata = _as_mapping(session.get("metadata"))
    if str(metadata.get("gsn_purpose") or "") != STRIPE_PURPOSE:
        return {"handled": False, "reason": "unrelated_stripe_event"}
    if event_type not in {
        "checkout.session.completed", "checkout.session.async_payment_succeeded",
    }:
        return {"handled": True, "awarded": False, "reason": "non_success_event"}
    merchant_key = _required_env("GSN_STRIPE_MERCHANT_KEY")
    expected_livemode = _expected_livemode()
    if bool(event.get("livemode")) != expected_livemode:
        raise MemberCreditError("stripe_event_mode_mismatch")
    event_account = str(event.get("account") or "")
    if event_account and event_account != merchant_key:
        raise MemberCreditError("stripe_event_account_mismatch")
    transfer = _verified_transfer_from_session(
        session, merchant_key=merchant_key, expected_livemode=expected_livemode,
    )
    if transfer is None:
        return {"handled": True, "awarded": False, "reason": "payment_not_paid"}
    status = record_verified_collection_transfer(
        db, provider_key=STRIPE_PROVIDER_KEY, merchant_key=merchant_key,
        provider_session_id=str(transfer.provider_session_id), transfer=transfer,
        verification_status="verified", policy_key="stripe_checkout_exact_purchase_link",
        now=now,
    )
    return {
        "handled": True,
        "awarded": status["status"] == "awarded",
        "order_key": status["order_key"],
        "status": status["status"],
    }
