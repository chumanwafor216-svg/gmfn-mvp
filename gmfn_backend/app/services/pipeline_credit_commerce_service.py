from __future__ import annotations

import hashlib
import json
import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.db.models import MarketplaceShop
from app.db.pipeline_credit_models import (
    PipelineCreditAcquisitionPackVersion,
    PipelineCreditCommercialControlVersion,
    PipelineCreditPricingPolicy,
    PipelineCreditServiceQuote,
    PipelineCreditServiceSpendOrder,
    PipelineCreditServiceVersion,
)
from app.services.community_domain_feature_policy import require_domain_vault_enabled
from app.services.pipeline_credit_service import (
    ACCOUNT_PURPOSE_CUSTOMER,
    CUSTOMER_SERVICE_CREDIT_BOUNDARY,
    InsufficientPipelineCreditError,
    PipelineCreditError,
    debit_pipeline_credits,
    get_pipeline_credit_account,
    get_or_create_pipeline_credit_account,
    pipeline_credit_balance,
    serialize_pipeline_credit_account,
)
from app.services.vault_domain_service import (
    activate_vault_order_from_pipeline_credit,
    ensure_vault_blocks,
    expire_vault_blocks,
)


CREDIT_QUANT = Decimal("0.01")
RATE_QUANT = Decimal("0.0001")
QUOTE_LIFETIME_MINUTES = 15
COMMERCIAL_LIFECYCLE_STATUSES = frozenset({"research", "draft", "shadow", "pilot", "enforced", "suspended"})
ACQUISITION_PACK_LIFECYCLE_STATUSES = COMMERCIAL_LIFECYCLE_STATUSES | {"retired"}

SERVICE_DEFINITIONS: dict[str, dict[str, Any]] = {
    "vault.slot": {
        "label": "Private Vault block",
        "unit_label": "block",
        "duration_days": 30,
        "max_quantity": 2,
        "connected": True,
    },
    "paid_spotlight.day": {
        "label": "Paid Spotlight",
        "unit_label": "day",
        "duration_days": 1,
        "max_quantity": 365,
        "connected": False,
    },
    "paid_repost.reach": {
        "label": "Paid Repost",
        "unit_label": "reach unit",
        "duration_days": 1,
        "max_quantity": 100,
        "connected": False,
    },
    "shop.extra_space": {
        "label": "Extra public shop space",
        "unit_label": "space",
        "duration_days": 365,
        "max_quantity": 4,
        "connected": False,
    },
    "merchant_verification.period": {
        "label": "Merchant Verification",
        "unit_label": "period",
        "duration_days": 365,
        "max_quantity": 1,
        "connected": False,
    },
    "community.member_capacity": {
        "label": "Extra community member capacity",
        "unit_label": "member place",
        "duration_days": 365,
        "max_quantity": 1000,
        "connected": False,
    },
    "community_domain.period": {
        "label": "Community Domain",
        "unit_label": "period",
        "duration_days": 30,
        "max_quantity": 12,
        "connected": False,
    },
    "community.rosca_service": {
        "label": "ROSCA service",
        "unit_label": "year",
        "duration_days": 365,
        "max_quantity": 1,
        "connected": False,
    },
    "community.meeting_pack": {
        "label": "Community Meeting Pack",
        "unit_label": "pack",
        "duration_days": 365,
        "max_quantity": 100,
        "connected": False,
    },
}


class PipelineCreditCommerceError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _clean(value: Any, default: str = "") -> str:
    text = str(value or "").strip()
    return text if text else default


def _decimal(value: Any, *, quant: Decimal = CREDIT_QUANT, field: str = "amount") -> Decimal:
    try:
        amount = Decimal(str(value)).quantize(quant, rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError) as exc:
        raise PipelineCreditCommerceError("invalid_amount", f"{field} must be a decimal value") from exc
    if amount <= Decimal("0"):
        raise PipelineCreditCommerceError("invalid_amount", f"{field} must be greater than zero")
    return amount


def _json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)


def _fingerprint(value: Any) -> str:
    return hashlib.sha256(_json(value).encode("utf-8")).hexdigest()


def _aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _lifecycle_status(value: Any, *, allowed: frozenset[str], field: str) -> str:
    resolved = _clean(value).lower()
    if resolved not in allowed:
        raise PipelineCreditCommerceError("invalid_lifecycle_status", f"{field} has an unsupported lifecycle status")
    return resolved


def serialize_commercial_control(
    row: Optional[PipelineCreditCommercialControlVersion],
) -> dict[str, Any]:
    if row is None:
        return {
            "id": None,
            "version": None,
            "lifecycle_status": "research",
            "decision_note": None,
            "quotes_enabled": False,
            "spends_enabled": False,
            "created_by_user_id": None,
            "created_at": None,
        }
    lifecycle_status = _clean(row.lifecycle_status, "research").lower()
    return {
        "id": int(row.id),
        "version": int(row.version),
        "lifecycle_status": lifecycle_status,
        "decision_note": row.decision_note,
        "quotes_enabled": lifecycle_status in {"shadow", "pilot", "enforced"},
        "spends_enabled": lifecycle_status == "enforced",
        "created_by_user_id": int(row.created_by_user_id),
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def current_commercial_control(
    db: Session,
) -> Optional[PipelineCreditCommercialControlVersion]:
    return (
        db.query(PipelineCreditCommercialControlVersion)
        .order_by(
            PipelineCreditCommercialControlVersion.version.desc(),
            PipelineCreditCommercialControlVersion.id.desc(),
        )
        .first()
    )


def set_commercial_control(
    db: Session,
    *,
    lifecycle_status: str,
    decision_note: Optional[str],
    actor_user_id: int,
) -> PipelineCreditCommercialControlVersion:
    status = _lifecycle_status(
        lifecycle_status,
        allowed=COMMERCIAL_LIFECYCLE_STATUSES,
        field="lifecycle_status",
    )
    note = _clean(decision_note) or None
    if status in {"enforced", "suspended"} and not note:
        raise PipelineCreditCommerceError(
            "decision_note_required",
            f"A decision note is required when commercial status is {status}",
        )
    if note and len(note) > 500:
        raise PipelineCreditCommerceError("invalid_decision_note", "decision_note must be 500 characters or fewer")
    current = current_commercial_control(db)
    row = PipelineCreditCommercialControlVersion(
        version=int(current.version) + 1 if current else 1,
        lifecycle_status=status,
        decision_note=note,
        created_by_user_id=int(actor_user_id),
        created_at=_now(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def acquisition_pack_out(row: PipelineCreditAcquisitionPackVersion) -> dict[str, Any]:
    try:
        country_codes = json.loads(row.country_codes_json or "[]")
    except (TypeError, ValueError):
        country_codes = []
    credit_quantity = Decimal(str(row.credit_quantity)).quantize(CREDIT_QUANT)
    cash_amount = Decimal(str(row.cash_amount)).quantize(CREDIT_QUANT)
    return {
        "id": int(row.id),
        "profile_code": row.profile_code,
        "profile_label": row.profile_label,
        "country_codes": country_codes,
        "currency": row.currency,
        "pack_code": row.pack_code,
        "version": int(row.version),
        "credit_quantity": f"{credit_quantity:.2f}",
        "cash_amount": f"{cash_amount:.2f}",
        "credits_per_currency_unit": f"{(credit_quantity / cash_amount).quantize(RATE_QUANT):.4f}",
        "lifecycle_status": row.lifecycle_status,
        "decision_note": row.decision_note,
        "created_by_user_id": int(row.created_by_user_id),
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def latest_acquisition_packs(db: Session) -> list[dict[str, Any]]:
    rows = (
        db.query(PipelineCreditAcquisitionPackVersion)
        .order_by(
            PipelineCreditAcquisitionPackVersion.profile_code.asc(),
            PipelineCreditAcquisitionPackVersion.pack_code.asc(),
            PipelineCreditAcquisitionPackVersion.version.desc(),
            PipelineCreditAcquisitionPackVersion.id.desc(),
        )
        .all()
    )
    latest: dict[tuple[str, str], PipelineCreditAcquisitionPackVersion] = {}
    for row in rows:
        latest.setdefault((row.profile_code, row.pack_code), row)
    return [acquisition_pack_out(row) for row in latest.values()]


def set_acquisition_pack(
    db: Session,
    *,
    profile_code: str,
    profile_label: str,
    country_codes: list[str],
    currency: str,
    pack_code: str,
    credit_quantity: Any,
    cash_amount: Any,
    lifecycle_status: str,
    decision_note: Optional[str],
    actor_user_id: int,
) -> PipelineCreditAcquisitionPackVersion:
    profile = _clean(profile_code).lower()
    pack = _clean(pack_code).lower()
    label = _clean(profile_label)
    if not profile:
        raise PipelineCreditCommerceError("invalid_profile_code", "profile_code is required")
    if not pack:
        raise PipelineCreditCommerceError("invalid_pack_code", "pack_code is required")
    if not label:
        raise PipelineCreditCommerceError("invalid_profile_label", "profile_label is required")
    normalized_countries: list[str] = []
    seen_countries: set[str] = set()
    for country_code in list(country_codes or []):
        normalized = _clean(country_code).upper()
        if not normalized:
            raise PipelineCreditCommerceError("invalid_country_codes", "country_codes cannot contain empty values")
        if normalized not in seen_countries:
            normalized_countries.append(normalized)
            seen_countries.add(normalized)
    if not normalized_countries or len(normalized_countries) > 80:
        raise PipelineCreditCommerceError("invalid_country_codes", "country_codes must contain 1 to 80 values")
    resolved_currency = _clean(currency).upper()
    if not resolved_currency:
        raise PipelineCreditCommerceError("invalid_currency", "currency is required")
    status = _lifecycle_status(
        lifecycle_status,
        allowed=ACQUISITION_PACK_LIFECYCLE_STATUSES,
        field="lifecycle_status",
    )
    note = _clean(decision_note) or None
    if note and len(note) > 500:
        raise PipelineCreditCommerceError("invalid_decision_note", "decision_note must be 500 characters or fewer")
    credit_value = _decimal(credit_quantity, field="credit_quantity")
    cash_value = _decimal(cash_amount, field="cash_amount")
    current = (
        db.query(PipelineCreditAcquisitionPackVersion)
        .filter(PipelineCreditAcquisitionPackVersion.profile_code == profile)
        .filter(PipelineCreditAcquisitionPackVersion.pack_code == pack)
        .order_by(
            PipelineCreditAcquisitionPackVersion.version.desc(),
            PipelineCreditAcquisitionPackVersion.id.desc(),
        )
        .first()
    )
    row = PipelineCreditAcquisitionPackVersion(
        profile_code=profile,
        profile_label=label,
        country_codes_json=_json(normalized_countries),
        currency=resolved_currency,
        pack_code=pack,
        version=int(current.version) + 1 if current else 1,
        credit_quantity=credit_value,
        cash_amount=cash_value,
        lifecycle_status=status,
        decision_note=note,
        created_by_user_id=int(actor_user_id),
        created_at=_now(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _pricing_policy_out(row: Optional[PipelineCreditPricingPolicy]) -> Optional[dict[str, Any]]:
    if row is None:
        return None
    return {
        "id": int(row.id),
        "region_code": row.region_code,
        "currency": row.currency,
        "version": int(row.version),
        "credits_per_currency_unit": f"{Decimal(str(row.credits_per_currency_unit)).quantize(RATE_QUANT):.4f}",
        "status": row.status,
        "created_by_user_id": int(row.created_by_user_id),
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def _service_out(row: Optional[PipelineCreditServiceVersion], definition: dict[str, Any], service_code: str) -> dict[str, Any]:
    return {
        "service_code": service_code,
        "service_label": definition["label"],
        "connected": bool(definition.get("connected")),
        "max_quantity": int(definition["max_quantity"]),
        "configured": row is not None,
        "version": int(row.version) if row else None,
        "region_code": row.region_code if row else "global",
        "pricing_mode": row.pricing_mode if row else None,
        "credit_cost": f"{Decimal(str(row.credit_cost)).quantize(CREDIT_QUANT):.2f}" if row else None,
        "cash_reference_amount": (
            f"{Decimal(str(row.cash_reference_amount)).quantize(CREDIT_QUANT):.2f}"
            if row and row.cash_reference_amount is not None
            else None
        ),
        "cash_reference_currency": row.cash_reference_currency if row else None,
        "duration_days": int(row.duration_days) if row else int(definition["duration_days"]),
        "unit_label": row.unit_label if row else definition["unit_label"],
        "status": row.status if row else "not_configured",
        "created_at": row.created_at.isoformat() if row and row.created_at else None,
    }


def active_pricing_policy(
    db: Session,
    *,
    region_code: str = "global",
    currency: str = "GBP",
) -> Optional[PipelineCreditPricingPolicy]:
    return (
        db.query(PipelineCreditPricingPolicy)
        .filter(PipelineCreditPricingPolicy.region_code == _clean(region_code, "global").lower())
        .filter(PipelineCreditPricingPolicy.currency == _clean(currency, "GBP").upper())
        .filter(PipelineCreditPricingPolicy.status == "active")
        .order_by(PipelineCreditPricingPolicy.version.desc(), PipelineCreditPricingPolicy.id.desc())
        .first()
    )


def active_service_version(
    db: Session,
    *,
    service_code: str,
    region_code: str = "global",
) -> Optional[PipelineCreditServiceVersion]:
    return (
        db.query(PipelineCreditServiceVersion)
        .filter(PipelineCreditServiceVersion.service_code == _clean(service_code).lower())
        .filter(PipelineCreditServiceVersion.region_code == _clean(region_code, "global").lower())
        .filter(PipelineCreditServiceVersion.status == "active")
        .order_by(PipelineCreditServiceVersion.version.desc(), PipelineCreditServiceVersion.id.desc())
        .first()
    )


def pricing_catalogue(
    db: Session,
    *,
    region_code: str = "global",
    currency: str = "GBP",
) -> dict[str, Any]:
    region = "global"
    resolved_currency = _clean(currency, "GBP").upper()
    policy = active_pricing_policy(db, region_code=region, currency=resolved_currency)
    services = [
        _service_out(
            active_service_version(db, service_code=service_code, region_code="global"),
            definition,
            service_code,
        )
        for service_code, definition in SERVICE_DEFINITIONS.items()
    ]
    return {
        "ok": True,
        "region_code": region,
        "currency": resolved_currency,
        "pricing_policy": _pricing_policy_out(policy),
        "services": services,
        "commercial_control": serialize_commercial_control(current_commercial_control(db)),
        "acquisition_packs": latest_acquisition_packs(db),
        "acquisition_checkout_connected": False,
        "service_region_code": "global",
        "boundary": CUSTOMER_SERVICE_CREDIT_BOUNDARY,
    }


def set_pricing_policy(
    db: Session,
    *,
    region_code: str,
    currency: str,
    credits_per_currency_unit: Any,
    actor_user_id: int,
) -> PipelineCreditPricingPolicy:
    region = "global"
    resolved_currency = _clean(currency, "GBP").upper()
    rate = _decimal(credits_per_currency_unit, quant=RATE_QUANT, field="credits_per_currency_unit")
    current = active_pricing_policy(db, region_code=region, currency=resolved_currency)
    next_version = int(current.version) + 1 if current else 1
    if current:
        current.status = "retired"
        db.add(current)

    row = PipelineCreditPricingPolicy(
        region_code=region,
        currency=resolved_currency,
        version=next_version,
        credits_per_currency_unit=rate,
        status="active",
        created_by_user_id=int(actor_user_id),
        created_at=_now(),
    )
    db.add(row)
    db.flush()

    conversion_rows = (
        db.query(PipelineCreditServiceVersion)
        .filter(PipelineCreditServiceVersion.region_code == region)
        .filter(PipelineCreditServiceVersion.status == "active")
        .filter(PipelineCreditServiceVersion.pricing_mode == "conversion")
        .filter(PipelineCreditServiceVersion.cash_reference_currency == resolved_currency)
        .all()
    )
    for service in conversion_rows:
        if service.cash_reference_amount is None:
            continue
        service.status = "retired"
        db.add(service)
        next_service_version = int(service.version) + 1
        db.add(
            PipelineCreditServiceVersion(
                service_code=service.service_code,
                service_label=service.service_label,
                region_code=service.region_code,
                version=next_service_version,
                pricing_mode="conversion",
                credit_cost=(Decimal(str(service.cash_reference_amount)) * rate).quantize(CREDIT_QUANT, rounding=ROUND_HALF_UP),
                cash_reference_amount=service.cash_reference_amount,
                cash_reference_currency=resolved_currency,
                duration_days=int(service.duration_days),
                unit_label=service.unit_label,
                status="active",
                terms_json=_json({"pricing_policy_version": int(row.version)}),
                created_by_user_id=int(actor_user_id),
                created_at=_now(),
            )
        )
    db.commit()
    db.refresh(row)
    return row


def set_service_price(
    db: Session,
    *,
    service_code: str,
    region_code: str,
    pricing_mode: str,
    credit_cost: Any = None,
    cash_reference_amount: Any = None,
    cash_reference_currency: str = "GBP",
    duration_days: Optional[int] = None,
    unit_label: Optional[str] = None,
    actor_user_id: int,
) -> PipelineCreditServiceVersion:
    code = _clean(service_code).lower()
    definition = SERVICE_DEFINITIONS.get(code)
    if not definition:
        raise PipelineCreditCommerceError("unknown_service", "Unknown Pipeline Credit service code")
    region = "global"
    mode = _clean(pricing_mode, "fixed_credits").lower()
    if mode not in {"fixed_credits", "conversion"}:
        raise PipelineCreditCommerceError("invalid_pricing_mode", "pricing_mode must be fixed_credits or conversion")

    cash_amount: Optional[Decimal] = None
    cash_currency: Optional[str] = None
    pricing_policy_version: Optional[int] = None
    if mode == "fixed_credits":
        resolved_credit_cost = _decimal(credit_cost, field="credit_cost")
    else:
        cash_amount = _decimal(cash_reference_amount, field="cash_reference_amount")
        cash_currency = _clean(cash_reference_currency, "GBP").upper()
        policy = active_pricing_policy(db, region_code="global", currency=cash_currency)
        if not policy:
            raise PipelineCreditCommerceError(
                "pricing_policy_not_configured",
                f"Set the global {cash_currency} Pipeline Credit conversion first",
            )
        resolved_credit_cost = (
            cash_amount * Decimal(str(policy.credits_per_currency_unit))
        ).quantize(CREDIT_QUANT, rounding=ROUND_HALF_UP)
        pricing_policy_version = int(policy.version)

    current = active_service_version(db, service_code=code, region_code="global")
    next_version = int(current.version) + 1 if current else 1
    if current:
        current.status = "retired"
        db.add(current)

    row = PipelineCreditServiceVersion(
        service_code=code,
        service_label=definition["label"],
        region_code="global",
        version=next_version,
        pricing_mode=mode,
        credit_cost=resolved_credit_cost,
        cash_reference_amount=cash_amount,
        cash_reference_currency=cash_currency,
        duration_days=max(1, int(duration_days or definition["duration_days"])),
        unit_label=_clean(unit_label, definition["unit_label"]),
        status="active",
        terms_json=_json(
            {
                "operator_configured": True,
                "pricing_policy_version": pricing_policy_version,
            }
        ),
        created_by_user_id=int(actor_user_id),
        created_at=_now(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def customer_credit_status(db: Session, *, user_id: int, region_code: str = "global") -> dict[str, Any]:
    region = "global"
    account = get_pipeline_credit_account(
        db,
        owner_type="user",
        owner_user_id=int(user_id),
        account_purpose=ACCOUNT_PURPOSE_CUSTOMER,
    )
    return {
        "ok": True,
        "configured": account is not None,
        "account": serialize_pipeline_credit_account(db, account)
        if account
        else {
            "id": None,
            "account_key": f"{ACCOUNT_PURPOSE_CUSTOMER}:user:{int(user_id)}",
            "account_purpose": ACCOUNT_PURPOSE_CUSTOMER,
            "owner_type": "user",
            "owner_user_id": int(user_id),
            "clan_id": None,
            "sponsor_ref": None,
            "currency": "PC",
            "pricing_region": region,
            "status": "not_opened",
            "balance": "0.00",
            "created_at": None,
            "updated_at": None,
            "boundary": CUSTOMER_SERVICE_CREDIT_BOUNDARY,
        },
        "boundary": CUSTOMER_SERVICE_CREDIT_BOUNDARY,
    }


def _validate_service_context(
    db: Session,
    *,
    actor_user_id: int,
    service_code: str,
    quantity: int,
    context: dict[str, Any],
) -> dict[str, Any]:
    definition = SERVICE_DEFINITIONS[service_code]
    if quantity < 1 or quantity > int(definition["max_quantity"]):
        raise PipelineCreditCommerceError(
            "invalid_quantity",
            f"Quantity must be between 1 and {int(definition['max_quantity'])}",
        )
    if service_code != "vault.slot":
        if not bool(definition.get("connected")):
            raise PipelineCreditCommerceError(
                "service_not_connected",
                f"{definition['label']} is catalogued but its credit-funded delivery is not connected yet",
            )
        return context

    shop_id = int(context.get("shop_id") or 0)
    if shop_id <= 0:
        raise PipelineCreditCommerceError("shop_required", "shop_id is required for a Vault quote")
    shop = db.get(MarketplaceShop, shop_id)
    if not shop or int(getattr(shop, "owner_user_id", 0) or 0) != int(actor_user_id):
        raise PipelineCreditCommerceError("shop_owner_required", "Only the shop owner can activate Vault blocks")
    clan_id = int(getattr(shop, "clan_id", 0) or 0)
    require_domain_vault_enabled(
        db,
        clan_id=clan_id,
        actor_user_id=int(actor_user_id),
    )
    expire_vault_blocks(db, shop_id=int(shop.id))
    blocks = ensure_vault_blocks(db, shop_id=int(shop.id))
    available_blocks = sum(
        1
        for block in blocks
        if _clean(getattr(block, "state", None), "inactive") in {"inactive", "expired"}
    )
    if quantity > available_blocks:
        raise PipelineCreditCommerceError(
            "vault_capacity_unavailable",
            f"Vault has {available_blocks} available block{'' if available_blocks == 1 else 's'} right now",
        )
    safe_context = {"shop_id": int(shop.id), "clan_id": clan_id}
    control_metadata = context.get("_pipeline_credit_control")
    if isinstance(control_metadata, dict):
        safe_context["_pipeline_credit_control"] = {
            "version": control_metadata.get("version"),
            "lifecycle_status": control_metadata.get("lifecycle_status"),
        }
    return safe_context


def issue_service_quote(
    db: Session,
    *,
    actor_user_id: int,
    service_code: str,
    quantity: int,
    region_code: str,
    context: Optional[dict[str, Any]],
    idempotency_key: str,
) -> PipelineCreditServiceQuote:
    code = _clean(service_code).lower()
    if code not in SERVICE_DEFINITIONS:
        raise PipelineCreditCommerceError("unknown_service", "Unknown Pipeline Credit service code")
    idem = _clean(idempotency_key)
    if len(idem) < 8:
        raise PipelineCreditCommerceError("idempotency_required", "idempotency_key must contain at least 8 characters")
    region = "global"
    control = serialize_commercial_control(current_commercial_control(db))
    if not control["quotes_enabled"]:
        raise PipelineCreditCommerceError(
            "commercial_quotes_disabled",
            f"Pipeline Credit commercial quotes are {control['lifecycle_status']}",
        )
    safe_quantity = int(quantity or 0)
    safe_context = dict(context or {})
    safe_context.pop("_pipeline_credit_control", None)
    safe_context["_pipeline_credit_control"] = {
        "version": control["version"],
        "lifecycle_status": control["lifecycle_status"],
    }
    safe_context = _validate_service_context(
        db,
        actor_user_id=int(actor_user_id),
        service_code=code,
        quantity=safe_quantity,
        context=safe_context,
    )
    request = {
        "actor_user_id": int(actor_user_id),
        "service_code": code,
        "quantity": safe_quantity,
        "region_code": region,
        "context": safe_context,
        "commercial_control": {
            "version": control["version"],
            "lifecycle_status": control["lifecycle_status"],
        },
    }
    fingerprint = _fingerprint(request)
    existing = (
        db.query(PipelineCreditServiceQuote)
        .filter(PipelineCreditServiceQuote.actor_user_id == int(actor_user_id))
        .filter(PipelineCreditServiceQuote.idempotency_key == idem)
        .first()
    )
    if existing:
        if existing.request_fingerprint != fingerprint:
            raise PipelineCreditCommerceError("idempotency_conflict", "This quote key was already used for different details")
        return existing

    service = active_service_version(db, service_code=code, region_code="global")
    if not service:
        raise PipelineCreditCommerceError(
            "service_price_not_configured",
            f"The GSN operator has not configured the Pipeline Credit price for {SERVICE_DEFINITIONS[code]['label']}",
        )
    account = get_or_create_pipeline_credit_account(
        db,
        owner_type="user",
        owner_user_id=int(actor_user_id),
        account_purpose=ACCOUNT_PURPOSE_CUSTOMER,
        pricing_region=region,
        currency="PC",
    )
    unit_cost = Decimal(str(service.credit_cost)).quantize(CREDIT_QUANT)
    total_cost = (unit_cost * safe_quantity).quantize(CREDIT_QUANT)
    row = PipelineCreditServiceQuote(
        quote_key=f"pcq_{secrets.token_urlsafe(24)}",
        actor_user_id=int(actor_user_id),
        account_id=int(account.id),
        service_version_id=int(service.id),
        service_code=code,
        region_code=region,
        quantity=safe_quantity,
        unit_credit_cost=unit_cost,
        total_credit_cost=total_cost,
        context_json=_json(safe_context),
        status="issued" if control["lifecycle_status"] == "enforced" else "shadow",
        expires_at=_now() + timedelta(minutes=QUOTE_LIFETIME_MINUTES),
        idempotency_key=idem,
        request_fingerprint=fingerprint,
        spent_order_id=None,
        created_at=_now(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def quote_out(db: Session, row: PipelineCreditServiceQuote) -> dict[str, Any]:
    balance = pipeline_credit_balance(db, account_id=int(row.account_id))
    total = Decimal(str(row.total_credit_cost)).quantize(CREDIT_QUANT)
    service = db.get(PipelineCreditServiceVersion, int(row.service_version_id))
    try:
        context = json.loads(row.context_json or "{}")
    except (TypeError, ValueError):
        context = {}
    control_metadata = context.get("_pipeline_credit_control") if isinstance(context, dict) else {}
    if not isinstance(control_metadata, dict):
        control_metadata = {}
    commercial_status = _clean(control_metadata.get("lifecycle_status"), "research").lower()
    commercial_version = control_metadata.get("version")
    try:
        commercial_version = int(commercial_version) if commercial_version is not None else None
    except (TypeError, ValueError):
        commercial_version = None
    return {
        "quote_key": row.quote_key,
        "service_code": row.service_code,
        "service_version_id": int(row.service_version_id),
        "service_version": int(service.version) if service else None,
        "region_code": row.region_code,
        "quantity": int(row.quantity),
        "unit_credit_cost": f"{Decimal(str(row.unit_credit_cost)).quantize(CREDIT_QUANT):.2f}",
        "total_credit_cost": f"{total:.2f}",
        "balance": f"{balance:.2f}",
        "resulting_balance": f"{max(Decimal('0.00'), balance - total):.2f}",
        "has_sufficient_balance": balance >= total,
        "status": row.status,
        "commercial_status": commercial_status,
        "commercial_control_version": commercial_version,
        "spendable": row.status == "issued" and commercial_status == "enforced",
        "expires_at": row.expires_at.isoformat() if row.expires_at else None,
        "boundary": CUSTOMER_SERVICE_CREDIT_BOUNDARY,
    }


def spend_service_quote(
    db: Session,
    *,
    actor_user_id: int,
    quote_key: str,
    idempotency_key: str,
) -> PipelineCreditServiceSpendOrder:
    quote_value = _clean(quote_key)
    idem = _clean(idempotency_key)
    if len(idem) < 8:
        raise PipelineCreditCommerceError("idempotency_required", "idempotency_key must contain at least 8 characters")
    request_fingerprint = _fingerprint(
        {"actor_user_id": int(actor_user_id), "quote_key": quote_value}
    )
    existing = (
        db.query(PipelineCreditServiceSpendOrder)
        .filter(PipelineCreditServiceSpendOrder.idempotency_key == idem)
        .first()
    )
    if existing:
        if existing.request_fingerprint != request_fingerprint:
            raise PipelineCreditCommerceError("idempotency_conflict", "This spend key was already used for another quote")
        return existing

    quote = (
        db.query(PipelineCreditServiceQuote)
        .filter(PipelineCreditServiceQuote.quote_key == quote_value)
        .with_for_update()
        .first()
    )
    if not quote or int(quote.actor_user_id) != int(actor_user_id):
        raise PipelineCreditCommerceError("quote_not_found", "Pipeline Credit quote not found")
    prior_order = (
        db.query(PipelineCreditServiceSpendOrder)
        .filter(PipelineCreditServiceSpendOrder.quote_id == int(quote.id))
        .first()
    )
    if prior_order:
        return prior_order
    current_control = serialize_commercial_control(current_commercial_control(db))
    if not current_control["spends_enabled"]:
        raise PipelineCreditCommerceError(
            "commercial_enforcement_disabled",
            "Pipeline Credit commercial enforcement is not enabled",
        )
    try:
        context = json.loads(quote.context_json or "{}")
    except (TypeError, ValueError):
        context = {}
    control_metadata = context.get("_pipeline_credit_control") if isinstance(context, dict) else {}
    if not isinstance(control_metadata, dict) or _clean(control_metadata.get("lifecycle_status")).lower() != "enforced":
        raise PipelineCreditCommerceError(
            "shadow_quote_not_spendable",
            "This quote was created in a non-enforced commercial mode and cannot be spent",
        )
    if quote.status != "issued":
        raise PipelineCreditCommerceError("quote_not_available", "This Pipeline Credit quote is no longer available")
    if _aware(quote.expires_at) <= _now():
        quote.status = "expired"
        db.add(quote)
        db.commit()
        raise PipelineCreditCommerceError("quote_expired", "This Pipeline Credit quote has expired; request a fresh quote")

    account = get_or_create_pipeline_credit_account(
        db,
        owner_type="user",
        owner_user_id=int(actor_user_id),
        account_purpose=ACCOUNT_PURPOSE_CUSTOMER,
        pricing_region="global",
        currency="PC",
    )
    if int(account.id) != int(quote.account_id):
        raise PipelineCreditCommerceError("account_mismatch", "The quote does not belong to this Pipeline Credit account")

    order = PipelineCreditServiceSpendOrder(
        actor_user_id=int(actor_user_id),
        account_id=int(account.id),
        quote_id=int(quote.id),
        service_version_id=int(quote.service_version_id),
        service_code=quote.service_code,
        quantity=int(quote.quantity),
        total_credit_cost=quote.total_credit_cost,
        status="pending",
        idempotency_key=idem,
        request_fingerprint=request_fingerprint,
        created_at=_now(),
    )
    db.add(order)
    db.flush()

    try:
        ledger = debit_pipeline_credits(
            db,
            account_id=int(account.id),
            account_purpose=ACCOUNT_PURPOSE_CUSTOMER,
            amount=quote.total_credit_cost,
            workflow_key=f"service.{quote.service_code}",
            idempotency_key=f"pipeline-credit-service-spend:{int(order.id)}",
            reference_type="service_spend_order",
            reference_id=str(int(order.id)),
            note=f"GSN service debit for {quote.service_code}",
            created_by_user_id=int(actor_user_id),
            meta={
                "quote_id": int(quote.id),
                "service_version_id": int(quote.service_version_id),
                "quantity": int(quote.quantity),
            },
            commit=False,
        )
    except InsufficientPipelineCreditError as exc:
        raise PipelineCreditCommerceError("insufficient_credits", "You do not have enough Pipeline Credits for this quote") from exc
    except PipelineCreditError as exc:
        raise PipelineCreditCommerceError("credit_debit_failed", str(exc)) from exc

    context = json.loads(quote.context_json or "{}")
    service = db.get(PipelineCreditServiceVersion, int(quote.service_version_id))
    if not service:
        raise PipelineCreditCommerceError("service_version_missing", "The quoted service version is unavailable")
    if quote.service_code != "vault.slot":
        raise PipelineCreditCommerceError("service_not_connected", "This service delivery is not connected yet")

    delivery = activate_vault_order_from_pipeline_credit(
        db,
        shop_id=int(context.get("shop_id") or 0),
        owner_user_id=int(actor_user_id),
        clan_id=int(context.get("clan_id") or 0) or None,
        slot_count=int(quote.quantity),
        total_credit_cost=quote.total_credit_cost,
        service_version=int(service.version),
        payment_reference=f"PC-SPEND-{int(order.id)}",
        duration_days=int(service.duration_days),
    )

    order.status = "completed"
    order.ledger_entry_id = int(ledger.id)
    order.delivery_reference_type = "vault_order"
    order.delivery_reference_id = str(delivery["vault_order_id"])
    order.result_json = _json(delivery)
    order.completed_at = _now()
    quote.status = "spent"
    quote.spent_order_id = int(order.id)
    db.add(order)
    db.add(quote)
    db.commit()
    db.refresh(order)
    return order


def spend_out(db: Session, row: PipelineCreditServiceSpendOrder) -> dict[str, Any]:
    result: dict[str, Any] = {}
    if row.result_json:
        try:
            parsed = json.loads(row.result_json)
            if isinstance(parsed, dict):
                result = parsed
        except Exception:
            result = {}
    balance = pipeline_credit_balance(db, account_id=int(row.account_id))
    return {
        "order_id": int(row.id),
        "service_code": row.service_code,
        "service_version_id": int(row.service_version_id),
        "quantity": int(row.quantity),
        "total_credit_cost": f"{Decimal(str(row.total_credit_cost)).quantize(CREDIT_QUANT):.2f}",
        "balance": f"{balance:.2f}",
        "status": row.status,
        "delivery_reference_type": row.delivery_reference_type,
        "delivery_reference_id": row.delivery_reference_id,
        "result": result,
        "completed_at": row.completed_at.isoformat() if row.completed_at else None,
        "boundary": CUSTOMER_SERVICE_CREDIT_BOUNDARY,
    }
