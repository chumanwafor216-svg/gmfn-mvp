from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.db.models import CommunityPayInAccount
from app.services.settlement_config_service import get_settlement_config


def _clean(value: object) -> str:
    return str(value or "").strip()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_sort_code(value: object) -> str:
    raw = "".join(ch for ch in _clean(value) if ch.isalnum()).upper()
    if not raw:
        return ""
    chunks = [raw[index : index + 2] for index in range(0, len(raw), 2)]
    return "-".join(chunks)[:16]


def get_community_pay_in_account(
    db: Session,
    *,
    clan_id: int,
) -> Optional[CommunityPayInAccount]:
    return (
        db.query(CommunityPayInAccount)
        .filter(CommunityPayInAccount.clan_id == int(clan_id))
        .first()
    )


def community_pay_in_to_settlement(row: CommunityPayInAccount) -> Dict[str, Any]:
    fallback = get_settlement_config()
    country = _clean(row.country).upper() or _clean(fallback.get("country")).upper()
    currency = _clean(row.currency).upper() or "NGN"

    return {
        "rail_name": "Community bank transfer",
        "bank_name": row.bank_name,
        "account_name": row.account_name,
        "account_number": row.account_number,
        "sort_code": row.sort_code or "",
        "routing_number": row.routing_number or "",
        "ach_routing_number": "",
        "wire_routing_number": "",
        "iban": row.iban or "",
        "swift_bic": row.swift_bic or "",
        "bank_code": "",
        "branch_code": "",
        "branch_name": "",
        "ifsc_code": "",
        "mobile_money_provider": "",
        "mobile_money_number": "",
        "country": country,
        "currency": currency,
        "region_code": fallback.get("region_code") or "",
        "payment_networks": fallback.get("payment_networks") or [],
        "missing_field_text": fallback.get("missing_field_text") or "",
        "support_note": "Use the generated reference exactly.",
        "configured": True,
        "source": "community_pay_in_account",
    }


def community_pay_in_payload(row: CommunityPayInAccount) -> Dict[str, Any]:
    return {
        "id": int(row.id),
        "clan_id": int(row.clan_id),
        "account_name": row.account_name,
        "bank_name": row.bank_name,
        "account_number": row.account_number,
        "sort_code": row.sort_code,
        "routing_number": row.routing_number,
        "iban": row.iban,
        "swift_bic": row.swift_bic,
        "country": row.country,
        "currency": row.currency,
        "status": row.status,
        "note": row.note,
        "updated_by_user_id": int(row.updated_by_user_id) if row.updated_by_user_id else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "settlement": community_pay_in_to_settlement(row),
        "configured": True,
    }


def get_community_pay_in_settlement(
    db: Session,
    *,
    clan_id: int,
) -> Dict[str, Any]:
    row = get_community_pay_in_account(db, clan_id=int(clan_id))
    if row:
        return community_pay_in_to_settlement(row)

    fallback = dict(get_settlement_config())
    fallback["configured"] = False
    fallback["source"] = "global_settlement_fallback"
    return fallback


def upsert_community_pay_in_account(
    db: Session,
    *,
    clan_id: int,
    updated_by_user_id: int,
    account_name: str,
    bank_name: str,
    account_number: str,
    sort_code: str = "",
    routing_number: str = "",
    iban: str = "",
    swift_bic: str = "",
    country: str = "",
    currency: str = "NGN",
    note: str = "",
) -> CommunityPayInAccount:
    row = get_community_pay_in_account(db, clan_id=int(clan_id))
    if not row:
        row = CommunityPayInAccount(clan_id=int(clan_id))

    row.updated_by_user_id = int(updated_by_user_id)
    row.account_name = _clean(account_name)
    row.bank_name = _clean(bank_name)
    row.account_number = _clean(account_number).replace(" ", "")
    row.sort_code = _normalize_sort_code(sort_code) or None
    row.routing_number = _clean(routing_number) or None
    row.iban = _clean(iban).replace(" ", "").upper() or None
    row.swift_bic = _clean(swift_bic).replace(" ", "").upper() or None
    row.country = _clean(country).upper() or None
    row.currency = _clean(currency).upper() or "NGN"
    row.status = "recorded"
    row.note = _clean(note) or None
    row.updated_at = _now()

    db.add(row)
    db.commit()
    db.refresh(row)
    return row
