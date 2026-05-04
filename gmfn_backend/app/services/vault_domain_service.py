from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.db.bank_models import BankEvent, ExpectedPayment
from app.db.models import (
    MarketplaceProduct,
    VaultAccessLink,
    VaultAccessLog,
    VaultBlock,
    VaultOrder,
    VaultPrivateOffer,
)
from app.services.feature_entitlements_service import get_active_entitlements
from app.services.trust_events_services import log_trust_event


MAX_VAULT_SLOTS = 6
VAULT_SLOT_DURATION_DAYS = 30
VAULT_PAYMENT_EXPIRY_DAYS = 7
VISIBILITY_VAULT = "vault_private"
FEATURE_VAULT_SLOT = "vault_slot"


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _to_aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _safe_str(value: Any, default: str = "") -> str:
    if value is None:
        return default
    text = str(value).strip()
    return text if text else default


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _d(value: Any) -> Decimal:
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def _slot_count(value: Any) -> int:
    count = _safe_int(value, 0)
    if count < 1 or count > MAX_VAULT_SLOTS:
        raise ValueError("Vault slot count must be between 1 and 6")
    return count


def _pricing_rule(slot_count: int) -> str:
    return "bundle_6_for_5" if int(slot_count) == MAX_VAULT_SLOTS else "unit"


def _offer_media_type(product: MarketplaceProduct) -> str:
    if _safe_str(getattr(product, "video_url", None)):
        return "video"
    if _safe_str(getattr(product, "image_url", None)):
        return "image"
    return ""


def _offer_media_url(product: MarketplaceProduct) -> Optional[str]:
    return _safe_str(getattr(product, "video_url", None)) or _safe_str(getattr(product, "image_url", None)) or None


def ensure_vault_blocks(db: Session, *, shop_id: int, commit: bool = False) -> List[VaultBlock]:
    rows = (
        db.query(VaultBlock)
        .filter(VaultBlock.shop_id == int(shop_id))
        .order_by(VaultBlock.slot_number.asc(), VaultBlock.id.asc())
        .all()
    )
    by_slot = {int(row.slot_number): row for row in rows}

    created = False
    for slot in range(1, MAX_VAULT_SLOTS + 1):
        if slot in by_slot:
            continue
        row = VaultBlock(
            shop_id=int(shop_id),
            slot_number=slot,
            state="inactive",
            current_order_id=None,
            product_id=None,
            activated_at=None,
            expires_at=None,
        )
        db.add(row)
        by_slot[slot] = row
        created = True

    if created:
        db.flush()
        if commit:
            db.commit()

    return [by_slot[slot] for slot in sorted(by_slot.keys()) if 1 <= slot <= MAX_VAULT_SLOTS]


def expire_vault_blocks(db: Session, *, shop_id: int, now: Optional[datetime] = None) -> int:
    current = _to_aware(now) or _now_utc()
    rows = (
        db.query(VaultBlock)
        .filter(VaultBlock.shop_id == int(shop_id))
        .filter(VaultBlock.state == "active")
        .all()
    )
    expired = 0
    for row in rows:
        expires_at = _to_aware(getattr(row, "expires_at", None))
        if expires_at is None or expires_at > current:
            continue
        row.state = "expired"
        expired += 1
        db.add(row)

        links = (
            db.query(VaultAccessLink)
            .filter(VaultAccessLink.block_id == int(row.id))
            .filter(VaultAccessLink.status == "active")
            .all()
        )
        for link in links:
            link.status = "expired"
            db.add(link)

    if expired:
        db.flush()
    return expired


def expire_vault_orders(db: Session, *, shop_id: Optional[int] = None, now: Optional[datetime] = None) -> int:
    current = _to_aware(now) or _now_utc()
    q = db.query(VaultOrder).filter(
        VaultOrder.status.in_(["draft", "instruction_generated", "awaiting_payment"])
    )
    if shop_id is not None:
        q = q.filter(VaultOrder.shop_id == int(shop_id))

    expired = 0
    for order in q.all():
        expires_at = _to_aware(getattr(order, "instruction_expires_at", None))
        if expires_at is None or expires_at > current:
            continue
        order.status = "expired"
        expired += 1
        db.add(order)

    if expired:
        db.flush()
    return expired


def sync_legacy_entitlements_to_blocks(db: Session, *, shop_id: int, owner_user_id: int) -> None:
    """
    Keeps already-paid pilot Vault entitlements usable after introducing real blocks.
    New confirmed payments should activate blocks through VaultOrder instead.
    """
    blocks = ensure_vault_blocks(db, shop_id=int(shop_id))
    active_count = sum(1 for block in blocks if _safe_str(block.state) == "active")
    if active_count > 0:
        return

    entitlements = get_active_entitlements(
        db,
        owner_user_id=int(owner_user_id),
        feature_code=FEATURE_VAULT_SLOT,
        shop_id=int(shop_id),
    )
    total = 0
    latest_expiry: Optional[datetime] = None
    for entitlement in entitlements:
        qty_total = _safe_int(getattr(entitlement, "quantity_total", None), 0)
        qty_used = _safe_int(getattr(entitlement, "quantity_used", None), 0)
        total += max(0, qty_total - qty_used)
        expires_at = _to_aware(getattr(entitlement, "expires_at", None))
        if expires_at and (latest_expiry is None or expires_at > latest_expiry):
            latest_expiry = expires_at

    slots_to_activate = min(MAX_VAULT_SLOTS, total)
    if slots_to_activate <= 0:
        return

    now = _now_utc()
    expiry = latest_expiry or (now + timedelta(days=VAULT_SLOT_DURATION_DAYS))
    for block in blocks[:slots_to_activate]:
        if _safe_str(block.state) == "active":
            continue
        block.state = "active"
        block.activated_at = block.activated_at or now
        block.expires_at = block.expires_at or expiry
        db.add(block)
    db.flush()


def create_vault_order_from_expected_payment(
    db: Session,
    *,
    expected_payment: ExpectedPayment,
    shop_id: int,
    owner_user_id: int,
    clan_id: Optional[int],
    slot_count: int,
    amount_due: Any,
    currency: str,
    payment_reference: str,
    instruction_expires_at: Optional[datetime],
) -> VaultOrder:
    existing = (
        db.query(VaultOrder)
        .filter(VaultOrder.expected_payment_id == int(expected_payment.id))
        .first()
    )
    if existing:
        return existing

    slots = _slot_count(slot_count)
    order = VaultOrder(
        shop_id=int(shop_id),
        owner_user_id=int(owner_user_id),
        clan_id=int(clan_id) if clan_id is not None else None,
        slot_count=slots,
        amount_due=_d(amount_due),
        currency=_safe_str(currency, "GBP").upper(),
        pricing_rule=_pricing_rule(slots),
        payment_method="bank_transfer",
        payment_reference=_safe_str(payment_reference),
        expected_payment_id=int(expected_payment.id),
        bank_event_id=None,
        status="instruction_generated",
        instruction_expires_at=_to_aware(instruction_expires_at),
    )
    db.add(order)
    db.flush()

    log_trust_event(
        db,
        event_type="vault_order_created",
        clan_id=int(clan_id or 0),
        actor_user_id=int(owner_user_id),
        subject_user_id=int(owner_user_id),
        meta={
            "reason": "vault_order_created",
            "vault_order_id": int(order.id),
            "expected_payment_id": int(expected_payment.id),
            "shop_id": int(shop_id),
            "slot_count": slots,
            "amount_due": str(_d(amount_due)),
            "currency": _safe_str(currency, "GBP").upper(),
            "payment_reference": _safe_str(payment_reference),
        },
        commit=False,
        refresh=False,
    )
    return order


def get_vault_order_for_expected_payment(
    db: Session,
    *,
    expected_payment_id: int,
) -> Optional[VaultOrder]:
    return (
        db.query(VaultOrder)
        .filter(VaultOrder.expected_payment_id == int(expected_payment_id))
        .first()
    )


def mark_vault_order_payment_detected(
    db: Session,
    *,
    expected_payment: ExpectedPayment,
    bank_event: BankEvent,
    reason: str,
) -> Optional[VaultOrder]:
    order = get_vault_order_for_expected_payment(db, expected_payment_id=int(expected_payment.id))
    if not order:
        return None
    order.status = "payment_detected"
    order.bank_event_id = int(bank_event.id)
    order.paid_at = _to_aware(getattr(bank_event, "posted_at", None)) or _to_aware(getattr(bank_event, "ingested_at", None)) or _now_utc()
    db.add(order)
    log_trust_event(
        db,
        event_type="vault_payment_detected",
        clan_id=int(order.clan_id or expected_payment.clan_id or 0),
        actor_user_id=int(order.owner_user_id),
        subject_user_id=int(order.owner_user_id),
        meta={
            "reason": reason,
            "vault_order_id": int(order.id),
            "expected_payment_id": int(expected_payment.id),
            "bank_event_id": int(bank_event.id),
            "shop_id": int(order.shop_id),
        },
        commit=False,
        refresh=False,
    )
    return order


def activate_vault_order_from_expected_payment(
    db: Session,
    *,
    expected_payment: ExpectedPayment,
    bank_event: BankEvent,
) -> Dict[str, Any]:
    order = get_vault_order_for_expected_payment(db, expected_payment_id=int(expected_payment.id))
    if not order:
        return {"ok": False, "reason": "vault_order_not_found", "activated": 0}

    if _safe_str(order.status) == "confirmed" and getattr(order, "activated_at", None):
        return {"ok": True, "reason": "already_activated", "activated": 0, "vault_order_id": int(order.id)}

    expire_vault_blocks(db, shop_id=int(order.shop_id))
    expire_vault_orders(db, shop_id=int(order.shop_id))

    payment_time = (
        _to_aware(getattr(bank_event, "posted_at", None))
        or _to_aware(getattr(bank_event, "value_at", None))
        or _to_aware(getattr(bank_event, "ingested_at", None))
        or _now_utc()
    )
    instruction_expires_at = _to_aware(getattr(order, "instruction_expires_at", None))
    if instruction_expires_at and payment_time > instruction_expires_at:
        mark_vault_order_payment_detected(
            db,
            expected_payment=expected_payment,
            bank_event=bank_event,
            reason="late_payment_after_instruction_expiry",
        )
        return {"ok": False, "reason": "late_payment_requires_admin_review", "activated": 0}

    blocks = ensure_vault_blocks(db, shop_id=int(order.shop_id))
    candidates = [
        block
        for block in blocks
        if _safe_str(block.state, "inactive") in {"inactive", "expired"}
    ]
    if len(candidates) < int(order.slot_count):
        order.status = "failed"
        order.bank_event_id = int(bank_event.id)
        db.add(order)
        return {"ok": False, "reason": "not_enough_inactive_vault_blocks", "activated": 0}

    now = _now_utc()
    expires_at = now + timedelta(days=VAULT_SLOT_DURATION_DAYS)
    activated = 0
    for block in candidates[: int(order.slot_count)]:
        block.state = "active"
        block.current_order_id = int(order.id)
        block.activated_at = now
        block.expires_at = expires_at
        db.add(block)
        activated += 1

    order.status = "confirmed"
    order.bank_event_id = int(bank_event.id)
    order.paid_at = payment_time
    order.confirmed_at = now
    order.activated_at = now
    db.add(order)

    log_trust_event(
        db,
        event_type="vault_payment_confirmed",
        clan_id=int(order.clan_id or expected_payment.clan_id or 0),
        actor_user_id=int(order.owner_user_id),
        subject_user_id=int(order.owner_user_id),
        meta={
            "reason": "vault_payment_confirmed",
            "vault_order_id": int(order.id),
            "expected_payment_id": int(expected_payment.id),
            "bank_event_id": int(bank_event.id),
            "shop_id": int(order.shop_id),
            "slot_count": int(order.slot_count),
        },
        commit=False,
        refresh=False,
    )
    log_trust_event(
        db,
        event_type="vault_slots_activated",
        clan_id=int(order.clan_id or expected_payment.clan_id or 0),
        actor_user_id=int(order.owner_user_id),
        subject_user_id=int(order.owner_user_id),
        meta={
            "reason": "vault_slots_activated",
            "vault_order_id": int(order.id),
            "shop_id": int(order.shop_id),
            "slot_count": int(order.slot_count),
            "expires_at": expires_at.isoformat(),
        },
        commit=False,
        refresh=False,
    )

    return {"ok": True, "reason": "vault_slots_activated", "activated": activated, "vault_order_id": int(order.id)}


def find_vault_block_for_product(db: Session, *, product_id: int) -> Optional[VaultBlock]:
    return (
        db.query(VaultBlock)
        .filter(VaultBlock.product_id == int(product_id))
        .first()
    )


def attach_product_to_vault_block(
    db: Session,
    *,
    shop_id: int,
    owner_user_id: int,
    product: MarketplaceProduct,
    slot_number: Optional[int] = None,
) -> VaultBlock:
    if _safe_str(getattr(product, "visibility_mode", None)) != VISIBILITY_VAULT:
        raise ValueError("Product is not a Vault private offer")

    sync_legacy_entitlements_to_blocks(db, shop_id=int(shop_id), owner_user_id=int(owner_user_id))
    expire_vault_blocks(db, shop_id=int(shop_id))
    blocks = ensure_vault_blocks(db, shop_id=int(shop_id))

    block = find_vault_block_for_product(db, product_id=int(product.id))
    if not block and slot_number is not None:
        requested_slot = _safe_int(slot_number, 0)
        block = next((b for b in blocks if int(b.slot_number) == requested_slot), None)
        if block and _safe_str(block.state) != "active":
            raise ValueError("Selected Vault block is not active")
        if block and getattr(block, "product_id", None) and int(block.product_id) != int(product.id):
            raise ValueError("Selected Vault block already has private content")

    if not block:
        block = next(
            (
                b
                for b in blocks
                if _safe_str(b.state) == "active" and getattr(b, "product_id", None) in {None, int(product.id)}
            ),
            None,
        )

    if not block:
        raise ValueError("No active empty Vault block is available")

    block.product_id = int(product.id)
    db.add(block)

    offer = (
        db.query(VaultPrivateOffer)
        .filter(VaultPrivateOffer.product_id == int(product.id))
        .first()
    )
    if not offer:
        offer = VaultPrivateOffer(
            block_id=int(block.id),
            shop_id=int(shop_id),
            product_id=int(product.id),
        )

    offer.block_id = int(block.id)
    offer.shop_id = int(shop_id)
    offer.product_id = int(product.id)
    offer.media_type = _offer_media_type(product) or None
    offer.media_url = _offer_media_url(product)
    offer.thumbnail_url = _safe_str(getattr(product, "image_url", None)) or None
    offer.caption = _safe_str(getattr(product, "description", None)) or None
    offer.status = "published" if bool(getattr(product, "is_active", True)) else "archived"
    db.add(offer)

    return block


def archive_vault_offer_for_product(
    db: Session,
    *,
    product_id: int,
) -> Optional[VaultBlock]:
    block = find_vault_block_for_product(db, product_id=int(product_id))
    if not block:
        return None
    block.product_id = None
    db.add(block)
    offers = (
        db.query(VaultPrivateOffer)
        .filter(VaultPrivateOffer.product_id == int(product_id))
        .all()
    )
    for offer in offers:
        offer.status = "archived"
        db.add(offer)
    links = (
        db.query(VaultAccessLink)
        .filter(VaultAccessLink.product_id == int(product_id))
        .filter(VaultAccessLink.status == "active")
        .all()
    )
    for link in links:
        link.status = "revoked"
        link.revoked_at = _now_utc()
        db.add(link)
    return block


def log_vault_access(
    db: Session,
    *,
    link: Optional[VaultAccessLink],
    token: str,
    result: str,
    user_agent: Optional[str] = None,
) -> None:
    token_hash = hashlib.sha256(_safe_str(token).encode("utf-8")).hexdigest() if _safe_str(token) else None
    row = VaultAccessLog(
        link_id=int(link.id) if link is not None else None,
        token_hash=token_hash,
        viewed_at=_now_utc(),
        user_agent=_safe_str(user_agent) or None,
        result=_safe_str(result, "missing"),
    )
    db.add(row)
    db.flush()


def vault_order_out(order: VaultOrder) -> Dict[str, Any]:
    return {
        "id": int(order.id),
        "shop_id": int(order.shop_id),
        "owner_user_id": int(order.owner_user_id),
        "clan_id": int(order.clan_id) if order.clan_id is not None else None,
        "slot_count": int(order.slot_count),
        "amount_due": str(order.amount_due),
        "currency": str(order.currency),
        "pricing_rule": str(order.pricing_rule),
        "payment_method": str(order.payment_method),
        "payment_reference": str(order.payment_reference),
        "expected_payment_id": int(order.expected_payment_id) if order.expected_payment_id is not None else None,
        "bank_event_id": int(order.bank_event_id) if order.bank_event_id is not None else None,
        "status": str(order.status),
        "instruction_expires_at": order.instruction_expires_at.isoformat() if order.instruction_expires_at else None,
        "paid_at": order.paid_at.isoformat() if order.paid_at else None,
        "confirmed_at": order.confirmed_at.isoformat() if order.confirmed_at else None,
        "activated_at": order.activated_at.isoformat() if order.activated_at else None,
        "cancelled_at": order.cancelled_at.isoformat() if order.cancelled_at else None,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
    }


def vault_block_out(db: Session, block: VaultBlock) -> Dict[str, Any]:
    product = db.get(MarketplaceProduct, int(block.product_id)) if getattr(block, "product_id", None) else None
    offer = (
        db.query(VaultPrivateOffer)
        .filter(VaultPrivateOffer.block_id == int(block.id))
        .order_by(VaultPrivateOffer.updated_at.desc(), VaultPrivateOffer.id.desc())
        .first()
    )
    product_out: Optional[Dict[str, Any]] = None
    if product is not None:
        product_out = {
            "id": int(product.id),
            "shop_id": int(product.shop_id),
            "clan_id": int(product.clan_id),
            "name": getattr(product, "name", None),
            "description": getattr(product, "description", None),
            "price": getattr(product, "price", None),
            "currency": getattr(product, "currency", None),
            "image_url": getattr(product, "image_url", None),
            "video_url": getattr(product, "video_url", None),
            "visibility_mode": getattr(product, "visibility_mode", None),
            "is_active": bool(getattr(product, "is_active", True)),
            "created_at": product.created_at.isoformat() if getattr(product, "created_at", None) else None,
        }
    return {
        "id": int(block.id),
        "shop_id": int(block.shop_id),
        "slot_number": int(block.slot_number),
        "state": str(block.state),
        "current_order_id": int(block.current_order_id) if block.current_order_id is not None else None,
        "product_id": int(block.product_id) if block.product_id is not None else None,
        "activated_at": block.activated_at.isoformat() if block.activated_at else None,
        "expires_at": block.expires_at.isoformat() if block.expires_at else None,
        "content_status": str(getattr(offer, "status", "")) if offer else ("published" if product_out else "empty"),
        "offer": {
            "id": int(offer.id),
            "media_type": offer.media_type,
            "media_url": offer.media_url,
            "thumbnail_url": offer.thumbnail_url,
            "caption": offer.caption,
            "status": offer.status,
        } if offer else None,
        "product": product_out,
        "created_at": block.created_at.isoformat() if block.created_at else None,
        "updated_at": block.updated_at.isoformat() if block.updated_at else None,
    }


def vault_status_for_shop(db: Session, *, shop_id: int, owner_user_id: int) -> Dict[str, Any]:
    expire_vault_orders(db, shop_id=int(shop_id))
    expire_vault_blocks(db, shop_id=int(shop_id))
    sync_legacy_entitlements_to_blocks(db, shop_id=int(shop_id), owner_user_id=int(owner_user_id))

    blocks = ensure_vault_blocks(db, shop_id=int(shop_id))
    orders = (
        db.query(VaultOrder)
        .filter(VaultOrder.shop_id == int(shop_id))
        .order_by(VaultOrder.created_at.desc(), VaultOrder.id.desc())
        .limit(20)
        .all()
    )
    links = (
        db.query(VaultAccessLink)
        .filter(VaultAccessLink.shop_id == int(shop_id))
        .all()
    )

    active_blocks = [b for b in blocks if _safe_str(b.state) == "active"]
    private_offers = [
        b
        for b in active_blocks
        if getattr(b, "product_id", None) is not None
    ]
    active_links = [l for l in links if _safe_str(l.status) == "active"]
    db.flush()

    return {
        "ok": True,
        "shop_id": int(shop_id),
        "max_slots": MAX_VAULT_SLOTS,
        "active_paid_slots": len(active_blocks),
        "private_offers_count": len(private_offers),
        "active_links_count": len(active_links),
        "blocks": [vault_block_out(db, block) for block in blocks],
        "orders": [vault_order_out(order) for order in orders],
    }
