from __future__ import annotations

import json
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any, Optional

from sqlalchemy import update
from sqlalchemy.orm import Session

from app.db.pipeline_credit_models import PipelineCreditAccount, PipelineCreditLedgerEntry

CREDIT_QUANT = Decimal("0.01")
PIPELINE_CREDIT_BOUNDARY = (
    "Pipeline credits are internal usage credits for GSN provider/API work. "
    "They are not customer funds, a wallet, cash-out balance, loan, credit approval, or regulated bank account."
)
CUSTOMER_SERVICE_CREDIT_BOUNDARY = (
    "GSN Pipeline Credits are non-cashable service-use rights. They are not money, savings, "
    "a bank account, lending, a cash-out balance, or transferable between ordinary users."
)
ACCOUNT_PURPOSE_PROVIDER = "provider_operations"
ACCOUNT_PURPOSE_CUSTOMER = "customer_service"


class PipelineCreditError(ValueError):
    pass


class InsufficientPipelineCreditError(PipelineCreditError):
    pass


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _clean(value: Any, default: str = "") -> str:
    text = str(value or "").strip()
    return text if text else default


def _money(value: Any) -> Decimal:
    try:
        amount = Decimal(str(value)).quantize(CREDIT_QUANT, rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError) as exc:
        raise PipelineCreditError("amount must be a decimal value") from exc
    if amount <= Decimal("0.00"):
        raise PipelineCreditError("amount must be greater than zero")
    return amount


def _signed_money(value: Any) -> Decimal:
    try:
        amount = Decimal(str(value)).quantize(CREDIT_QUANT, rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError) as exc:
        raise PipelineCreditError("amount must be a decimal value") from exc
    if amount == Decimal("0.00"):
        raise PipelineCreditError("amount must not be zero")
    return amount


def _currency(value: Any) -> str:
    text = _clean(value, "GBP").upper()
    if len(text) > 8:
        raise PipelineCreditError("currency is too long")
    return text or "GBP"


def account_key_for(
    *,
    owner_type: Optional[str] = None,
    owner_user_id: Optional[int] = None,
    clan_id: Optional[int] = None,
    sponsor_ref: Optional[str] = None,
    account_purpose: str = ACCOUNT_PURPOSE_PROVIDER,
) -> tuple[str, str]:
    purpose = _clean(account_purpose, ACCOUNT_PURPOSE_PROVIDER).lower()
    if purpose not in {ACCOUNT_PURPOSE_PROVIDER, ACCOUNT_PURPOSE_CUSTOMER}:
        raise PipelineCreditError("account_purpose must be provider_operations or customer_service")
    explicit_type = _clean(owner_type).lower()
    if explicit_type:
        normalized_owner_type = explicit_type
    elif clan_id is not None:
        normalized_owner_type = "community"
    elif owner_user_id is not None:
        normalized_owner_type = "user"
    elif _clean(sponsor_ref):
        normalized_owner_type = "sponsor"
    else:
        normalized_owner_type = "platform"

    if normalized_owner_type == "community":
        if clan_id is None:
            raise PipelineCreditError("clan_id is required for a community pipeline-credit account")
        base_key = f"community:{int(clan_id)}"
        return normalized_owner_type, base_key if purpose == ACCOUNT_PURPOSE_PROVIDER else f"{purpose}:{base_key}"
    if normalized_owner_type == "user":
        if owner_user_id is None:
            raise PipelineCreditError("owner_user_id is required for a user pipeline-credit account")
        base_key = f"user:{int(owner_user_id)}"
        return normalized_owner_type, base_key if purpose == ACCOUNT_PURPOSE_PROVIDER else f"{purpose}:{base_key}"
    if normalized_owner_type == "sponsor":
        sponsor = _clean(sponsor_ref)
        if not sponsor:
            raise PipelineCreditError("sponsor_ref is required for a sponsor pipeline-credit account")
        base_key = f"sponsor:{sponsor.lower()}"
        return normalized_owner_type, base_key if purpose == ACCOUNT_PURPOSE_PROVIDER else f"{purpose}:{base_key}"
    if normalized_owner_type == "platform":
        base_key = "platform:default"
        return normalized_owner_type, base_key if purpose == ACCOUNT_PURPOSE_PROVIDER else f"{purpose}:{base_key}"
    raise PipelineCreditError("owner_type must be community, user, sponsor, or platform")


def get_pipeline_credit_account(
    db: Session,
    *,
    account_id: Optional[int] = None,
    owner_type: Optional[str] = None,
    owner_user_id: Optional[int] = None,
    clan_id: Optional[int] = None,
    sponsor_ref: Optional[str] = None,
    account_purpose: str = ACCOUNT_PURPOSE_PROVIDER,
) -> Optional[PipelineCreditAccount]:
    if account_id is not None:
        return db.get(PipelineCreditAccount, int(account_id))
    _, key = account_key_for(
        owner_type=owner_type,
        owner_user_id=owner_user_id,
        clan_id=clan_id,
        sponsor_ref=sponsor_ref,
        account_purpose=account_purpose,
    )
    return db.query(PipelineCreditAccount).filter(PipelineCreditAccount.account_key == key).first()


def get_or_create_pipeline_credit_account(
    db: Session,
    *,
    owner_type: Optional[str] = None,
    owner_user_id: Optional[int] = None,
    clan_id: Optional[int] = None,
    sponsor_ref: Optional[str] = None,
    currency: str = "GBP",
    account_purpose: str = ACCOUNT_PURPOSE_PROVIDER,
    pricing_region: str = "global",
) -> PipelineCreditAccount:
    normalized_owner_type, key = account_key_for(
        owner_type=owner_type,
        owner_user_id=owner_user_id,
        clan_id=clan_id,
        sponsor_ref=sponsor_ref,
        account_purpose=account_purpose,
    )
    existing = db.query(PipelineCreditAccount).filter(PipelineCreditAccount.account_key == key).first()
    if existing:
        return existing

    row = PipelineCreditAccount(
        account_key=key,
        account_purpose=_clean(account_purpose, ACCOUNT_PURPOSE_PROVIDER).lower(),
        owner_type=normalized_owner_type,
        owner_user_id=int(owner_user_id) if owner_user_id is not None else None,
        clan_id=int(clan_id) if clan_id is not None else None,
        sponsor_ref=_clean(sponsor_ref) or None,
        currency=_currency(currency),
        pricing_region=_clean(pricing_region, "global").lower(),
        balance=Decimal("0.00"),
        version=0,
        status="active",
        created_at=_now(),
        updated_at=_now(),
    )
    db.add(row)
    db.flush()
    db.refresh(row)
    return row


def pipeline_credit_balance(db: Session, *, account_id: int) -> Decimal:
    account = db.get(PipelineCreditAccount, int(account_id))
    if account and _clean(getattr(account, "account_purpose", None), ACCOUNT_PURPOSE_PROVIDER) == ACCOUNT_PURPOSE_CUSTOMER:
        return Decimal(str(getattr(account, "balance", "0.00") or "0.00")).quantize(CREDIT_QUANT)
    row = (
        db.query(PipelineCreditLedgerEntry)
        .filter(PipelineCreditLedgerEntry.account_id == int(account_id))
        .order_by(PipelineCreditLedgerEntry.id.desc())
        .first()
    )
    if not row:
        return Decimal("0.00")
    return Decimal(str(row.balance_after)).quantize(CREDIT_QUANT)


def _json_meta(meta: Optional[dict[str, Any]]) -> Optional[str]:
    if not meta:
        return None
    return json.dumps(meta, sort_keys=True, separators=(",", ":"))


def _entry_by_idempotency(db: Session, key: str) -> Optional[PipelineCreditLedgerEntry]:
    idem = _clean(key)
    if not idem:
        raise PipelineCreditError("idempotency_key is required")
    return db.query(PipelineCreditLedgerEntry).filter(PipelineCreditLedgerEntry.idempotency_key == idem).first()


def record_pipeline_credit_entry(
    db: Session,
    *,
    account: PipelineCreditAccount,
    entry_type: str,
    signed_amount: Decimal,
    workflow_key: str,
    idempotency_key: str,
    provider_key: Optional[str] = None,
    reference_type: Optional[str] = None,
    reference_id: Optional[str] = None,
    note: Optional[str] = None,
    created_by_user_id: Optional[int] = None,
    clan_id: Optional[int] = None,
    user_id: Optional[int] = None,
    meta: Optional[dict[str, Any]] = None,
    commit: bool = True,
) -> PipelineCreditLedgerEntry:
    existing = _entry_by_idempotency(db, idempotency_key)
    if existing:
        return existing

    amount = _signed_money(signed_amount)
    is_customer_account = (
        _clean(getattr(account, "account_purpose", None), ACCOUNT_PURPOSE_PROVIDER)
        == ACCOUNT_PURPOSE_CUSTOMER
    )
    if is_customer_account:
        current_balance = Decimal(str(getattr(account, "balance", "0.00") or "0.00")).quantize(CREDIT_QUANT)
        expected_version = int(getattr(account, "version", 0) or 0)
        if current_balance + amount < Decimal("0.00"):
            raise InsufficientPipelineCreditError("insufficient Pipeline Credits")
        statement = (
            update(PipelineCreditAccount)
            .where(PipelineCreditAccount.id == int(account.id))
            .where(PipelineCreditAccount.version == expected_version)
        )
        if amount < Decimal("0.00"):
            statement = statement.where(PipelineCreditAccount.balance >= -amount)
        changed = db.execute(
            statement.values(
                balance=PipelineCreditAccount.balance + amount,
                version=PipelineCreditAccount.version + 1,
                updated_at=_now(),
            )
        )
        if int(changed.rowcount or 0) != 1:
            db.expire(account)
            latest_balance = Decimal(str(getattr(account, "balance", "0.00") or "0.00")).quantize(CREDIT_QUANT)
            if latest_balance + amount < Decimal("0.00"):
                raise InsufficientPipelineCreditError("insufficient Pipeline Credits")
            raise PipelineCreditError("Pipeline Credit balance changed; request a fresh quote")
        db.flush()
        db.refresh(account)
        new_balance = Decimal(str(account.balance)).quantize(CREDIT_QUANT)
    else:
        current_balance = pipeline_credit_balance(db, account_id=int(account.id))
        new_balance = (current_balance + amount).quantize(CREDIT_QUANT)
        if new_balance < Decimal("0.00"):
            raise InsufficientPipelineCreditError("insufficient pipeline credits")

    row = PipelineCreditLedgerEntry(
        account_id=int(account.id),
        clan_id=int(clan_id) if clan_id is not None else account.clan_id,
        user_id=int(user_id) if user_id is not None else account.owner_user_id,
        entry_type=_clean(entry_type),
        credit_amount=amount,
        balance_after=new_balance,
        workflow_key=_clean(workflow_key, "pipeline_credit.manual"),
        provider_key=_clean(provider_key) or None,
        reference_type=_clean(reference_type) or None,
        reference_id=_clean(reference_id) or None,
        idempotency_key=_clean(idempotency_key),
        note=_clean(note) or None,
        created_by_user_id=int(created_by_user_id) if created_by_user_id is not None else None,
        meta_json=_json_meta(meta),
        created_at=_now(),
    )
    account.updated_at = _now()
    db.add(account)
    db.add(row)
    if commit:
        db.commit()
        db.refresh(row)
        db.refresh(account)
    else:
        db.flush()
        db.refresh(row)
    return row


def allocate_pipeline_credits(
    db: Session,
    *,
    amount: Any,
    idempotency_key: str,
    owner_type: Optional[str] = None,
    owner_user_id: Optional[int] = None,
    clan_id: Optional[int] = None,
    sponsor_ref: Optional[str] = None,
    currency: str = "GBP",
    workflow_key: str = "pipeline_credit.allocation",
    reference_type: Optional[str] = None,
    reference_id: Optional[str] = None,
    note: Optional[str] = None,
    created_by_user_id: Optional[int] = None,
    meta: Optional[dict[str, Any]] = None,
    commit: bool = True,
    account_purpose: str = ACCOUNT_PURPOSE_PROVIDER,
    pricing_region: str = "global",
) -> PipelineCreditLedgerEntry:
    existing = _entry_by_idempotency(db, idempotency_key)
    if existing:
        return existing
    account = get_or_create_pipeline_credit_account(
        db,
        owner_type=owner_type,
        owner_user_id=owner_user_id,
        clan_id=clan_id,
        sponsor_ref=sponsor_ref,
        currency=currency,
        account_purpose=account_purpose,
        pricing_region=pricing_region,
    )
    return record_pipeline_credit_entry(
        db,
        account=account,
        entry_type="allocation",
        signed_amount=_money(amount),
        workflow_key=workflow_key,
        idempotency_key=idempotency_key,
        reference_type=reference_type,
        reference_id=reference_id,
        note=note,
        created_by_user_id=created_by_user_id,
        clan_id=clan_id,
        user_id=owner_user_id,
        meta=meta,
        commit=commit,
    )


def debit_pipeline_credits(
    db: Session,
    *,
    amount: Any,
    idempotency_key: str,
    workflow_key: str,
    account_id: Optional[int] = None,
    owner_type: Optional[str] = None,
    owner_user_id: Optional[int] = None,
    clan_id: Optional[int] = None,
    sponsor_ref: Optional[str] = None,
    provider_key: Optional[str] = None,
    reference_type: Optional[str] = None,
    reference_id: Optional[str] = None,
    note: Optional[str] = None,
    created_by_user_id: Optional[int] = None,
    meta: Optional[dict[str, Any]] = None,
    commit: bool = True,
    account_purpose: str = ACCOUNT_PURPOSE_PROVIDER,
) -> PipelineCreditLedgerEntry:
    existing = _entry_by_idempotency(db, idempotency_key)
    if existing:
        return existing
    account = get_pipeline_credit_account(
        db,
        account_id=account_id,
        owner_type=owner_type,
        owner_user_id=owner_user_id,
        clan_id=clan_id,
        sponsor_ref=sponsor_ref,
        account_purpose=account_purpose,
    )
    if not account:
        raise InsufficientPipelineCreditError("pipeline-credit account does not exist")
    return record_pipeline_credit_entry(
        db,
        account=account,
        entry_type="debit",
        signed_amount=-_money(amount),
        workflow_key=workflow_key,
        provider_key=provider_key,
        idempotency_key=idempotency_key,
        reference_type=reference_type,
        reference_id=reference_id,
        note=note,
        created_by_user_id=created_by_user_id,
        clan_id=clan_id,
        user_id=owner_user_id,
        meta=meta,
        commit=commit,
    )


def serialize_pipeline_credit_account(db: Session, account: PipelineCreditAccount) -> dict[str, Any]:
    purpose = _clean(getattr(account, "account_purpose", None), ACCOUNT_PURPOSE_PROVIDER)
    return {
        "id": int(account.id),
        "account_key": account.account_key,
        "account_purpose": purpose,
        "owner_type": account.owner_type,
        "owner_user_id": int(account.owner_user_id) if account.owner_user_id is not None else None,
        "clan_id": int(account.clan_id) if account.clan_id is not None else None,
        "sponsor_ref": account.sponsor_ref,
        "currency": account.currency,
        "pricing_region": _clean(getattr(account, "pricing_region", None), "global"),
        "status": account.status,
        "balance": f"{pipeline_credit_balance(db, account_id=int(account.id)):.2f}",
        "created_at": account.created_at.isoformat() if account.created_at else None,
        "updated_at": account.updated_at.isoformat() if account.updated_at else None,
        "boundary": CUSTOMER_SERVICE_CREDIT_BOUNDARY if purpose == ACCOUNT_PURPOSE_CUSTOMER else PIPELINE_CREDIT_BOUNDARY,
    }


def serialize_pipeline_credit_entry(entry: PipelineCreditLedgerEntry) -> dict[str, Any]:
    return {
        "id": int(entry.id),
        "account_id": int(entry.account_id),
        "clan_id": int(entry.clan_id) if entry.clan_id is not None else None,
        "user_id": int(entry.user_id) if entry.user_id is not None else None,
        "entry_type": entry.entry_type,
        "credit_amount": f"{Decimal(str(entry.credit_amount)).quantize(CREDIT_QUANT):.2f}",
        "balance_after": f"{Decimal(str(entry.balance_after)).quantize(CREDIT_QUANT):.2f}",
        "workflow_key": entry.workflow_key,
        "provider_key": entry.provider_key,
        "reference_type": entry.reference_type,
        "reference_id": entry.reference_id,
        "idempotency_key": entry.idempotency_key,
        "note": entry.note,
        "created_by_user_id": int(entry.created_by_user_id) if entry.created_by_user_id is not None else None,
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
    }
