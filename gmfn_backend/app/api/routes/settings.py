from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import ClanMembership, User, UserSettings

router = APIRouter(prefix="/settings", tags=["settings"])


DEFAULT_SETTINGS = {
    "tonePreset": "professional-blue",
    "textSize": "standard",
    "contrast": "standard",
    "motion": "normal",
    "density": "comfortable",
    "preferredLanguage": "English",
    "preferredCurrency": "NGN",
    "trustShareLevel": "standard",
    "showPhonePublic": False,
    "showWhatsAppPublic": True,
    "showTelegramPublic": False,
    "showShopPublic": True,
    "preferredCommunityId": "",
    "preferredLandingTab": "guide",
    "notificationsMode": "summary",
    "quietNotifications": False,
    "soundEnabled": False,
    "unreadFirst": True,
    "openActionsDirectly": True,
}


class SettingsPatchIn(BaseModel):
    tonePreset: Optional[
        Literal["professional-blue", "cooperative-warm", "enterprise-green"]
    ] = None
    textSize: Optional[Literal["standard", "large"]] = None
    contrast: Optional[Literal["standard", "high"]] = None
    motion: Optional[Literal["normal", "reduced"]] = None
    density: Optional[Literal["comfortable", "compact"]] = None

    preferredLanguage: Optional[str] = None
    preferredCurrency: Optional[str] = None

    trustShareLevel: Optional[Literal["minimal", "standard", "detailed"]] = None

    showPhonePublic: Optional[bool] = None
    showWhatsAppPublic: Optional[bool] = None
    showTelegramPublic: Optional[bool] = None
    showShopPublic: Optional[bool] = None

    preferredCommunityId: Optional[str] = None
    preferredLandingTab: Optional[Literal["guide", "settings"]] = None

    notificationsMode: Optional[Literal["summary", "detailed"]] = None
    quietNotifications: Optional[bool] = None
    soundEnabled: Optional[bool] = None
    unreadFirst: Optional[bool] = None
    openActionsDirectly: Optional[bool] = None


def _get_or_create_settings(db: Session, user: User) -> UserSettings:
    row = db.query(UserSettings).filter(UserSettings.user_id == int(user.id)).first()
    if row:
        return row

    row = UserSettings(user_id=int(user.id))
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _validate_preferred_community(
    db: Session,
    user_id: int,
    value: Optional[str],
) -> Optional[int]:
    raw = str(value or "").strip()
    if not raw:
        return None

    if not raw.isdigit():
        raise HTTPException(status_code=400, detail="preferredCommunityId must be numeric")

    clan_id = int(raw)

    membership = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.user_id == int(user_id),
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=400,
            detail="preferredCommunityId must belong to one of your communities",
        )

    return clan_id


def _row_to_payload(row: UserSettings) -> dict:
    return {
        "tonePreset": row.tone_preset or DEFAULT_SETTINGS["tonePreset"],
        "textSize": row.text_size or DEFAULT_SETTINGS["textSize"],
        "contrast": row.contrast or DEFAULT_SETTINGS["contrast"],
        "motion": row.motion or DEFAULT_SETTINGS["motion"],
        "density": row.density or DEFAULT_SETTINGS["density"],
        "preferredLanguage": row.preferred_language or DEFAULT_SETTINGS["preferredLanguage"],
        "preferredCurrency": row.preferred_currency or DEFAULT_SETTINGS["preferredCurrency"],
        "trustShareLevel": row.trust_share_level or DEFAULT_SETTINGS["trustShareLevel"],
        "showPhonePublic": bool(row.show_phone_public),
        "showWhatsAppPublic": bool(row.show_whatsapp_public),
        "showTelegramPublic": bool(row.show_telegram_public),
        "showShopPublic": bool(row.show_shop_public),
        "preferredCommunityId": str(row.preferred_community_id) if row.preferred_community_id else "",
        "preferredLandingTab": row.preferred_landing_tab or DEFAULT_SETTINGS["preferredLandingTab"],
        "notificationsMode": row.notifications_mode or DEFAULT_SETTINGS["notificationsMode"],
        "quietNotifications": bool(row.quiet_notifications),
        "soundEnabled": bool(row.sound_enabled),
        "unreadFirst": bool(row.unread_first),
        "openActionsDirectly": bool(row.open_actions_directly),
    }


def _apply_defaults(row: UserSettings) -> UserSettings:
    row.tone_preset = "professional-blue"
    row.text_size = "standard"
    row.contrast = "standard"
    row.motion = "normal"
    row.density = "comfortable"
    row.preferred_language = "English"
    row.preferred_currency = "NGN"
    row.trust_share_level = "standard"
    row.show_phone_public = False
    row.show_whatsapp_public = True
    row.show_telegram_public = False
    row.show_shop_public = True
    row.preferred_community_id = None
    row.preferred_landing_tab = "guide"
    row.notifications_mode = "summary"
    row.quiet_notifications = False
    row.sound_enabled = False
    row.unread_first = True
    row.open_actions_directly = True
    return row


@router.get("/me")
def get_my_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = _get_or_create_settings(db, current_user)
    return _row_to_payload(row)


@router.patch("/me")
def update_my_settings(
    payload: SettingsPatchIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = _get_or_create_settings(db, current_user)
    data = payload.model_dump(exclude_unset=True)

    if "tonePreset" in data:
        row.tone_preset = data["tonePreset"]

    if "textSize" in data:
        row.text_size = data["textSize"]

    if "contrast" in data:
        row.contrast = data["contrast"]

    if "motion" in data:
        row.motion = data["motion"]

    if "density" in data:
        row.density = data["density"]

    if "preferredLanguage" in data:
        row.preferred_language = str(data["preferredLanguage"] or "").strip() or "English"

    if "preferredCurrency" in data:
        row.preferred_currency = str(data["preferredCurrency"] or "").strip() or "NGN"

    if "trustShareLevel" in data:
        row.trust_share_level = data["trustShareLevel"]

    if "showPhonePublic" in data:
        row.show_phone_public = bool(data["showPhonePublic"])

    if "showWhatsAppPublic" in data:
        row.show_whatsapp_public = bool(data["showWhatsAppPublic"])

    if "showTelegramPublic" in data:
        row.show_telegram_public = bool(data["showTelegramPublic"])

    if "showShopPublic" in data:
        row.show_shop_public = bool(data["showShopPublic"])

    if "preferredCommunityId" in data:
        row.preferred_community_id = _validate_preferred_community(
            db,
            int(current_user.id),
            data["preferredCommunityId"],
        )

    if "preferredLandingTab" in data:
        row.preferred_landing_tab = data["preferredLandingTab"]

    if "notificationsMode" in data:
        row.notifications_mode = data["notificationsMode"]

    if "quietNotifications" in data:
        row.quiet_notifications = bool(data["quietNotifications"])

    if "soundEnabled" in data:
        row.sound_enabled = bool(data["soundEnabled"])

    if "unreadFirst" in data:
        row.unread_first = bool(data["unreadFirst"])

    if "openActionsDirectly" in data:
        row.open_actions_directly = bool(data["openActionsDirectly"])

    db.add(row)
    db.commit()
    db.refresh(row)

    return _row_to_payload(row)


@router.post("/me/reset")
def reset_my_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = _get_or_create_settings(db, current_user)
    row = _apply_defaults(row)

    db.add(row)
    db.commit()
    db.refresh(row)

    return _row_to_payload(row)