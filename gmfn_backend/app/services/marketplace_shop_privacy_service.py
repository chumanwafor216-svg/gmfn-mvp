from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
import os
from typing import Any, Mapping, Optional

from sqlalchemy.orm import Session

from app.db.models import UserSettings


MARKETPLACE_SHOP_PRIVACY_AUTHORITY_ENV = "GSN_SHOP_PRIVACY_AUTHORITY_V1_ENABLED"


class ShopPrivacyScope(str, Enum):
    LEGACY = "legacy"
    OWNER_MANAGEMENT = "owner_management"
    AUTHORIZED_COMMUNITY = "authorized_community"
    UNAUTHENTICATED_PUBLIC = "unauthenticated_public"


@dataclass(frozen=True)
class ShopPublicPreferences:
    show_shop_public: bool
    show_whatsapp_public: bool
    show_phone_public: bool
    show_telegram_public: bool
    settings_recorded: bool


@dataclass(frozen=True)
class ShopPrivacyDecision:
    scope: ShopPrivacyScope
    shop_visible: bool
    show_whatsapp: bool
    show_phone: bool
    show_telegram: bool
    enforcement_enabled: bool
    settings_recorded: bool


_WHATSAPP_FIELDS = frozenset(
    {
        "whatsapp",
        "whatsapp_contact",
        "whatsapp_number",
        "whatsapp_phone",
        "source_shop_whatsapp_number",
    }
)
_PHONE_FIELDS = frozenset(
    {
        "contact_phone",
        "mobile",
        "mobile_number",
        "phone",
        "phone_e164",
        "phone_number",
        "public_phone",
        "telephone",
    }
)
_TELEGRAM_FIELDS = frozenset(
    {
        "telegram",
        "telegram_contact",
        "telegram_handle",
        "telegram_username",
    }
)


def marketplace_shop_privacy_authority_enabled() -> bool:
    return str(os.getenv(MARKETPLACE_SHOP_PRIVACY_AUTHORITY_ENV, "") or "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def load_shop_public_preferences(
    db: Session,
    *,
    owner_user_id: int,
) -> ShopPublicPreferences:
    settings = (
        db.query(UserSettings)
        .filter(UserSettings.user_id == int(owner_user_id))
        .first()
    )
    if settings is None:
        return ShopPublicPreferences(
            show_shop_public=False,
            show_whatsapp_public=False,
            show_phone_public=False,
            show_telegram_public=False,
            settings_recorded=False,
        )

    return ShopPublicPreferences(
        show_shop_public=bool(getattr(settings, "show_shop_public", False)),
        show_whatsapp_public=bool(getattr(settings, "show_whatsapp_public", False)),
        show_phone_public=bool(getattr(settings, "show_phone_public", False)),
        show_telegram_public=bool(getattr(settings, "show_telegram_public", False)),
        settings_recorded=True,
    )


def decide_shop_privacy(
    *,
    scope: ShopPrivacyScope,
    shop_active: bool,
    authorized: bool,
    preferences: Optional[ShopPublicPreferences] = None,
    enforcement_enabled: Optional[bool] = None,
) -> ShopPrivacyDecision:
    enabled = (
        marketplace_shop_privacy_authority_enabled()
        if enforcement_enabled is None
        else bool(enforcement_enabled)
    )
    if not enabled or scope == ShopPrivacyScope.LEGACY:
        return ShopPrivacyDecision(
            scope=scope,
            shop_visible=bool(authorized),
            show_whatsapp=True,
            show_phone=True,
            show_telegram=True,
            enforcement_enabled=False,
            settings_recorded=bool(preferences and preferences.settings_recorded),
        )

    if scope == ShopPrivacyScope.OWNER_MANAGEMENT:
        return ShopPrivacyDecision(
            scope=scope,
            shop_visible=bool(authorized),
            show_whatsapp=bool(authorized),
            show_phone=bool(authorized),
            show_telegram=bool(authorized),
            enforcement_enabled=True,
            settings_recorded=bool(preferences and preferences.settings_recorded),
        )

    if scope == ShopPrivacyScope.AUTHORIZED_COMMUNITY:
        visible = bool(authorized and shop_active)
        return ShopPrivacyDecision(
            scope=scope,
            shop_visible=visible,
            show_whatsapp=visible,
            show_phone=visible,
            show_telegram=visible,
            enforcement_enabled=True,
            settings_recorded=bool(preferences and preferences.settings_recorded),
        )

    public_preferences = preferences or ShopPublicPreferences(
        show_shop_public=False,
        show_whatsapp_public=False,
        show_phone_public=False,
        show_telegram_public=False,
        settings_recorded=False,
    )
    visible = bool(
        authorized
        and shop_active
        and public_preferences.show_shop_public
    )
    return ShopPrivacyDecision(
        scope=scope,
        shop_visible=visible,
        show_whatsapp=bool(visible and public_preferences.show_whatsapp_public),
        show_phone=bool(visible and public_preferences.show_phone_public),
        show_telegram=bool(visible and public_preferences.show_telegram_public),
        enforcement_enabled=True,
        settings_recorded=public_preferences.settings_recorded,
    )


def resolve_shop_privacy_decision(
    db: Session,
    *,
    owner_user_id: int,
    scope: ShopPrivacyScope,
    shop_active: bool,
    authorized: bool = True,
) -> ShopPrivacyDecision:
    enabled = marketplace_shop_privacy_authority_enabled()
    preferences = None
    if enabled and scope == ShopPrivacyScope.UNAUTHENTICATED_PUBLIC:
        preferences = load_shop_public_preferences(
            db,
            owner_user_id=int(owner_user_id),
        )
    return decide_shop_privacy(
        scope=scope,
        shop_active=shop_active,
        authorized=authorized,
        preferences=preferences,
        enforcement_enabled=enabled,
    )


def project_shop_contact_fields(
    payload: Mapping[str, Any],
    *,
    decision: ShopPrivacyDecision,
) -> dict[str, Any]:
    projected = dict(payload)
    for field in _WHATSAPP_FIELDS:
        if field in projected and not decision.show_whatsapp:
            projected[field] = None
    for field in _PHONE_FIELDS:
        if field in projected and not decision.show_phone:
            projected[field] = None
    for field in _TELEGRAM_FIELDS:
        if field in projected and not decision.show_telegram:
            projected[field] = None

    if "contact_ready" in projected:
        projected["contact_ready"] = contact_ready_from_payload(
            projected,
            decision=decision,
        )
    return projected


def project_spotlight_shop_contact_fields(
    payload: Mapping[str, Any],
    *,
    decision: ShopPrivacyDecision,
) -> dict[str, Any]:
    projected = dict(payload)
    if not decision.show_whatsapp:
        projected["source_shop_whatsapp_number"] = None
    if "spotlight_contact_available" in projected:
        projected["spotlight_contact_available"] = bool(
            str(projected.get("source_shop_whatsapp_number") or "").strip()
            or str(projected.get("advertiser_contact_phone") or "").strip()
        )
    return projected


def contact_ready_from_payload(
    payload: Mapping[str, Any],
    *,
    decision: ShopPrivacyDecision,
) -> bool:
    whatsapp_ready = decision.show_whatsapp and any(
        str(payload.get(field) or "").strip() for field in _WHATSAPP_FIELDS
    )
    phone_ready = decision.show_phone and any(
        str(payload.get(field) or "").strip() for field in _PHONE_FIELDS
    )
    telegram_ready = decision.show_telegram and any(
        str(payload.get(field) or "").strip() for field in _TELEGRAM_FIELDS
    )
    return bool(whatsapp_ready or phone_ready or telegram_ready)


def contact_ready_for_shop(
    shop: Any,
    *,
    decision: ShopPrivacyDecision,
) -> bool:
    return contact_ready_from_payload(
        {
            "whatsapp_number": getattr(shop, "whatsapp_number", None),
            "telegram_handle": getattr(shop, "telegram_handle", None),
        },
        decision=decision,
    )
