from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.services.pipeline_credit_service import (
    InsufficientPipelineCreditError,
    PipelineCreditError,
    debit_pipeline_credits,
    get_pipeline_credit_account,
    pipeline_credit_balance,
    serialize_pipeline_credit_entry,
)



PIPELINE_PROVIDER_GATE_CATALOG: tuple[dict[str, Any], ...] = (
    {
        "provider_key": "bank.gb.truelayer",
        "workflow_key": "bank.gb.truelayer.account_holder_verification",
        "label": "TrueLayer GB account-holder verification",
        "integration_status": "wired",
    },
    {
        "provider_key": "community.callback_webhook",
        "workflow_key": "community.callback_webhook.delivery",
        "label": "Community confirmation callback webhook delivery",
        "integration_status": "wired",
    },
    {
        "provider_key": "storage.cloudflare_r2",
        "workflow_key": "storage.cloudflare_r2.presigned_upload",
        "label": "Cloudflare R2 presigned upload URL creation",
        "integration_status": "community_admin_route_wired_default_uploads_local",
    },
    {
        "provider_key": "phone.sms_or_verify",
        "workflow_key": "phone.sms_or_verify.delivery",
        "label": "SMS or phone verification provider delivery",
        "integration_status": "not_wired",
    },
    {
        "provider_key": "email.transactional",
        "workflow_key": "email.transactional.delivery",
        "label": "Transactional email provider delivery",
        "integration_status": "not_wired",
    },
    {
        "provider_key": "ai.openai",
        "workflow_key": "ai.openai.discovery_summary",
        "label": "OpenAI discovery or evidence summary",
        "integration_status": "not_wired",
    },
    {
        "provider_key": "payment.checkout",
        "workflow_key": "payment.checkout.session_create",
        "label": "Hosted checkout session creation",
        "integration_status": "not_wired",
    },
)
@dataclass(frozen=True)
class ProviderSpendGateResult:
    ok: bool
    status: str
    provider_key: str
    workflow_key: str
    explanation: str
    ledger_entry: Optional[dict[str, Any]] = None


def _env_suffix(value: str) -> str:
    return re.sub(r"[^A-Z0-9]+", "_", str(value or "").upper()).strip("_")


def _env_value(name: str) -> str:
    return str(os.getenv(name) or "").strip()


def _account_id_for(provider_key: str, workflow_key: str) -> Optional[int]:
    provider_suffix = _env_suffix(provider_key)
    workflow_suffix = _env_suffix(workflow_key)
    candidates = [
        f"GSN_PIPELINE_CREDIT_ACCOUNT_ID_{workflow_suffix}",
        f"GSN_PIPELINE_CREDIT_ACCOUNT_ID_{provider_suffix}",
        "GSN_PIPELINE_CREDIT_DEFAULT_ACCOUNT_ID",
    ]
    for name in candidates:
        raw = _env_value(name)
        if not raw:
            continue
        try:
            return int(raw)
        except ValueError:
            return None
    return None


def _cost_for(provider_key: str, workflow_key: str) -> Optional[str]:
    provider_suffix = _env_suffix(provider_key)
    workflow_suffix = _env_suffix(workflow_key)
    candidates = [
        f"GSN_PIPELINE_CREDIT_COST_{workflow_suffix}",
        f"GSN_PIPELINE_CREDIT_COST_{provider_suffix}",
        "GSN_PIPELINE_CREDIT_DEFAULT_PROVIDER_COST",
    ]
    for name in candidates:
        raw = _env_value(name)
        if raw:
            return raw
    return None


def debit_provider_spend(
    db: Session,
    *,
    provider_key: str,
    workflow_key: str,
    idempotency_key: str,
    reference_type: str,
    reference_id: str,
    note: str,
    clan_id: Optional[int] = None,
    user_id: Optional[int] = None,
    account_id: Optional[int] = None,
    owner_type: Optional[str] = None,
    owner_user_id: Optional[int] = None,
    sponsor_ref: Optional[str] = None,
    meta: Optional[dict[str, Any]] = None,
) -> ProviderSpendGateResult:
    provider = str(provider_key or "").strip()
    workflow = str(workflow_key or "").strip()
    if not provider or not workflow:
        return ProviderSpendGateResult(
            ok=False,
            status="blocked_missing_provider_context",
            provider_key=provider,
            workflow_key=workflow,
            explanation="Provider spend needs a provider key and workflow key before pipeline credits can be debited.",
        )

    scope_requested = any(
        value is not None for value in (account_id, owner_type, owner_user_id, sponsor_ref)
    )
    selected_account_id = int(account_id) if account_id is not None else None
    if selected_account_id is None and scope_requested:
        scoped_account = get_pipeline_credit_account(
            db,
            owner_type=owner_type,
            owner_user_id=owner_user_id,
            clan_id=clan_id,
            sponsor_ref=sponsor_ref,
        )
        selected_account_id = int(scoped_account.id) if scoped_account is not None else None
    if selected_account_id is None and not scope_requested:
        selected_account_id = _account_id_for(provider, workflow)

    cost = _cost_for(provider, workflow)
    if selected_account_id is None or not cost:
        return ProviderSpendGateResult(
            ok=False,
            status="blocked_missing_pipeline_credit_config",
            provider_key=provider,
            workflow_key=workflow,
            explanation=(
                "Live provider spend is blocked because no server-side pipeline-credit account and cost are configured for this workflow."
            ),
        )

    try:
        entry = debit_pipeline_credits(
            db,
            account_id=selected_account_id,
            amount=cost,
            workflow_key=workflow,
            provider_key=provider,
            idempotency_key=idempotency_key,
            reference_type=reference_type,
            reference_id=reference_id,
            note=note,
            clan_id=clan_id,
            owner_user_id=user_id,
            meta=meta,
        )
    except InsufficientPipelineCreditError as exc:
        return ProviderSpendGateResult(
            ok=False,
            status="blocked_insufficient_pipeline_credits",
            provider_key=provider,
            workflow_key=workflow,
            explanation=str(exc),
        )
    except PipelineCreditError as exc:
        return ProviderSpendGateResult(
            ok=False,
            status="blocked_pipeline_credit_error",
            provider_key=provider,
            workflow_key=workflow,
            explanation=str(exc),
        )

    return ProviderSpendGateResult(
        ok=True,
        status="debited",
        provider_key=provider,
        workflow_key=workflow,
        explanation="Pipeline credits were debited before live provider spend.",
        ledger_entry=serialize_pipeline_credit_entry(entry),
    )


def account_env_names_for(provider_key: str, workflow_key: str) -> list[str]:
    provider_suffix = _env_suffix(provider_key)
    workflow_suffix = _env_suffix(workflow_key)
    return [
        f"GSN_PIPELINE_CREDIT_ACCOUNT_ID_{workflow_suffix}",
        f"GSN_PIPELINE_CREDIT_ACCOUNT_ID_{provider_suffix}",
        "GSN_PIPELINE_CREDIT_DEFAULT_ACCOUNT_ID",
    ]


def cost_env_names_for(provider_key: str, workflow_key: str) -> list[str]:
    provider_suffix = _env_suffix(provider_key)
    workflow_suffix = _env_suffix(workflow_key)
    return [
        f"GSN_PIPELINE_CREDIT_COST_{workflow_suffix}",
        f"GSN_PIPELINE_CREDIT_COST_{provider_suffix}",
        "GSN_PIPELINE_CREDIT_DEFAULT_PROVIDER_COST",
    ]


def provider_spend_gate_status(
    db: Session,
    *,
    provider_key: str,
    workflow_key: str,
    label: str = "",
    integration_status: str = "unknown",
) -> dict[str, Any]:
    account_id = _account_id_for(provider_key, workflow_key)
    cost = _cost_for(provider_key, workflow_key)
    account = get_pipeline_credit_account(db, account_id=account_id) if account_id is not None else None
    balance = pipeline_credit_balance(db, account_id=int(account.id)) if account is not None else None

    if account_id is None or not cost:
        status = "blocked_missing_pipeline_credit_config"
    elif account is None:
        status = "blocked_configured_account_missing"
    elif balance is not None and balance <= 0:
        status = "blocked_no_pipeline_credit_balance"
    elif integration_status == "not_wired":
        status = "meter_configured_but_provider_not_wired"
    else:
        status = "meter_ready"

    return {
        "provider_key": provider_key,
        "workflow_key": workflow_key,
        "label": label,
        "integration_status": integration_status,
        "status": status,
        "account_configured": account_id is not None,
        "cost_configured": bool(cost),
        "account_id": account_id,
        "account_exists": account is not None,
        "currency": getattr(account, "currency", None) if account is not None else None,
        "balance": f"{balance:.2f}" if balance is not None else None,
        "cost_per_attempt": str(cost) if cost else None,
        "account_env_names": account_env_names_for(provider_key, workflow_key),
        "cost_env_names": cost_env_names_for(provider_key, workflow_key),
        "boundary": (
            "This reports whether the Pipeline Credit meter is configured. It does not activate a provider, prove a secret works, or perform a paid call."
        ),
    }


def provider_spend_gate_catalog(db: Session) -> list[dict[str, Any]]:
    return [
        provider_spend_gate_status(
            db,
            provider_key=item["provider_key"],
            workflow_key=item["workflow_key"],
            label=item.get("label", ""),
            integration_status=item.get("integration_status", "unknown"),
        )
        for item in PIPELINE_PROVIDER_GATE_CATALOG
    ]