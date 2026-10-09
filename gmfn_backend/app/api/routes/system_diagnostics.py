# app/api/routes/system_diagnostics.py
from __future__ import annotations

import os
import re
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, inspect, text
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.constants import PROTOCOL_VERSION
from app.db.database import get_db
from app.db.models import MarketplaceProduct, MarketplaceShop, User

router = APIRouter(prefix="/system", tags=["system"])


def _is_admin(user: Any) -> bool:
    if user is None:
        return False
    if getattr(user, "is_admin", False) is True:
        return True
    role = str(getattr(user, "role", "") or "").lower()
    return role == "admin"


def _require_admin(user: Any) -> None:
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")


def _clean_identity(value: Any) -> str:
    return str(value or "").strip()


def _identity_candidates(identity_key: str) -> List[str]:
    raw = _clean_identity(identity_key)
    if not raw:
        return []

    candidates = [raw]
    upper_raw = raw.upper()
    if upper_raw.startswith("GSN-U-"):
        candidates.append(f"GMFN-U-{raw[6:]}")
    elif upper_raw.startswith("GMFN-U-"):
        candidates.append(f"GSN-U-{raw[7:]}")

    seen = set()
    normalized: List[str] = []
    for candidate in candidates:
        candidate_key = _clean_identity(candidate).upper()
        if not candidate_key or candidate_key in seen:
            continue
        seen.add(candidate_key)
        normalized.append(candidate_key)

    return normalized


def _identity_suffix(identity_key: str) -> str:
    raw = _clean_identity(identity_key).upper()
    if raw.startswith("GSN-U-"):
        return raw[6:]
    if raw.startswith("GMFN-U-"):
        return raw[7:]
    return ""


def _public_shop_visibility(value: Any) -> bool:
    return _clean_identity(value).lower() in {
        "community_visible",
        "community",
        "public",
    }


@router.get("/diagnostics")
def diagnostics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Admin-only: stability + runtime visibility.
    Never returns secrets, only presence.
    """
    _require_admin(current_user)

    def present(name: str) -> bool:
        return bool(os.getenv(name))

    return {
        "ok": True,
        "time_utc": datetime.now(timezone.utc).isoformat(),
        "protocol_version": PROTOCOL_VERSION,
        "python": {
            "version": sys.version.split()[0],
            "executable": sys.executable,
        },
        "env": {
            "GMFN_DEV_MODE": os.getenv("GMFN_DEV_MODE"),
            "GMFN_SECRET_KEY_present": present("GMFN_SECRET_KEY"),
            "SECRET_KEY_present": present("SECRET_KEY"),
        },
        "db": {
            "engine_url_present": present("DATABASE_URL"),
        },
    }


def _table_columns(db: Session, table_name: str) -> list[str]:
    try:
        inspector = inspect(db.get_bind())
        return sorted(str(column["name"]) for column in inspector.get_columns(table_name))
    except Exception:
        return []


def _safe_probe(db: Session, sql: str, params: dict[str, Any]) -> dict[str, Any]:
    try:
        value = db.execute(text(sql), params).scalar()
        return {"ok": True, "value": str(value)}
    except Exception as exc:
        try:
            db.rollback()
        except Exception:
            pass
        return {
            "ok": False,
            "error_type": type(exc).__name__,
            "error": str(exc)[:500],
        }


@router.get("/diagnostics/finance-readiness")
def finance_readiness_diagnostics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Admin-only: schema/probe visibility for finance route readiness.

    This avoids returning row-level finance data. It reports column presence and
    aggregate probe success so production 500s can be diagnosed without exposing
    secrets, tokens, or private transaction records.
    """
    _require_admin(current_user)

    user_id = int(current_user.id)
    tables = {
        "loans": _table_columns(db, "loans"),
        "loan_guarantors": _table_columns(db, "loan_guarantors"),
        "pool_events": _table_columns(db, "pool_events"),
        "clan_memberships": _table_columns(db, "clan_memberships"),
    }

    alembic_version = _safe_probe(
        db,
        "SELECT version_num FROM alembic_version LIMIT 1",
        {},
    )
    active_memberships = _safe_probe(
        db,
        """
        SELECT COUNT(*)
        FROM clan_memberships
        WHERE CAST(user_id AS TEXT) = :user_id
          AND left_at IS NULL
        """,
        {"user_id": str(user_id)},
    )
    loan_rows = _safe_probe(
        db,
        "SELECT COUNT(*) FROM loans WHERE CAST(borrower_user_id AS TEXT) = :user_id",
        {"user_id": str(user_id)},
    )
    pool_event_rows = _safe_probe(
        db,
        "SELECT COUNT(*) FROM pool_events WHERE CAST(user_id AS TEXT) = :user_id",
        {"user_id": str(user_id)},
    )
    reserved_pool_probe = _safe_probe(
        db,
        """
        SELECT COALESCE(SUM(pool_used), 0)
        FROM loans
        WHERE CAST(borrower_user_id AS TEXT) = :user_id
        """,
        {"user_id": str(user_id)},
    )
    locked_guarantee_probe = _safe_probe(
        db,
        """
        SELECT COALESCE(SUM(locked_amount - released_amount), 0)
        FROM loan_guarantors
        WHERE CAST(guarantor_user_id AS TEXT) = :user_id
          AND status = 'approved'
        """,
        {"user_id": str(user_id)},
    )

    required_columns = {
        "loans": [
            "pool_used",
            "guarantee_gap",
            "personal_pool_at_request",
            "paid_total",
            "remaining_amount",
        ],
        "loan_guarantors": ["locked_amount", "released_amount"],
        "clan_memberships": ["left_at"],
    }
    missing_columns = {
        table_name: [
            column
            for column in columns
            if column not in set(tables.get(table_name, []))
        ]
        for table_name, columns in required_columns.items()
    }

    return {
        "ok": True,
        "diagnostic_version": "finance-readiness-2026-07-12",
        "user_id": user_id,
        "gmfn_id": getattr(current_user, "gmfn_id", None),
        "alembic_version": alembic_version,
        "tables": tables,
        "missing_columns": missing_columns,
        "probes": {
            "active_memberships": active_memberships,
            "loan_rows": loan_rows,
            "pool_event_rows": pool_event_rows,
            "reserved_pool": reserved_pool_probe,
            "locked_guarantees": locked_guarantee_probe,
        },
    }



def _env_present(*names: str) -> bool:
    return any(bool(os.getenv(name)) for name in names)


def _env_value(name: str, default: str = "") -> str:
    return str(os.getenv(name) or default).strip()


def _env_mode(name: str, default: str = "") -> str:
    return _env_value(name, default).lower()


def _pipeline_credit_env_suffix(value: str) -> str:
    return re.sub(r"[^A-Z0-9]+", "_", str(value or "").upper()).strip("_")


def _pipeline_credit_meter_env_ready(*, provider_key: str, workflow_key: str) -> bool:
    provider_suffix = _pipeline_credit_env_suffix(provider_key)
    workflow_suffix = _pipeline_credit_env_suffix(workflow_key)
    account_ready = _env_present(
        f"GSN_PIPELINE_CREDIT_ACCOUNT_ID_{workflow_suffix}",
        f"GSN_PIPELINE_CREDIT_ACCOUNT_ID_{provider_suffix}",
        "GSN_PIPELINE_CREDIT_DEFAULT_ACCOUNT_ID",
    )
    cost_ready = _env_present(
        f"GSN_PIPELINE_CREDIT_COST_{workflow_suffix}",
        f"GSN_PIPELINE_CREDIT_COST_{provider_suffix}",
        "GSN_PIPELINE_CREDIT_DEFAULT_PROVIDER_COST",
    )
    return bool(account_ready and cost_ready)

def _readiness_item(
    *,
    key: str,
    label: str,
    category: str,
    status: str,
    configured: bool,
    live_ready: bool,
    paid_provider: bool,
    credit_meter_required: bool,
    env_signals: list[str],
    boundary: str,
    next_step: str,
) -> dict[str, Any]:
    return {
        "key": key,
        "label": label,
        "category": category,
        "status": status,
        "configured": bool(configured),
        "live_ready": bool(live_ready),
        "paid_provider": bool(paid_provider),
        "credit_meter_required": bool(credit_meter_required),
        "env_signals": env_signals,
        "boundary": boundary,
        "next_step": next_step,
    }


@router.get("/diagnostics/api-readiness")
def api_readiness_diagnostics(
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Admin-only: external API/provider readiness without exposing secrets.

    This is deliberately a readiness gate, not a provider activation endpoint.
    It reports configuration presence, pilot/live mode, and truth boundaries so
    paid APIs are opened intentionally and tied to pipeline-credit controls.
    """
    _require_admin(current_user)

    verification_mode = _env_mode("GMFN_VERIFICATION_MODE", "record-only")
    gb_bank_provider = _env_mode("GMFN_BANK_PROVIDER_GB")
    bank_live_mode = verification_mode in {"live", "provider", "providers", "external"}
    truelayer_token_present = _env_present("TRUELAYER_ACCESS_TOKEN")
    truelayer_selected = gb_bank_provider == "truelayer"
    truelayer_credit_meter_ready = _pipeline_credit_meter_env_ready(
        provider_key="bank.gb.truelayer",
        workflow_key="bank.gb.truelayer.account_holder_verification",
    )
    truelayer_provider_ready = bool(bank_live_mode and truelayer_selected and truelayer_token_present)
    truelayer_live_ready = bool(truelayer_provider_ready and truelayer_credit_meter_ready)
    if truelayer_live_ready:
        truelayer_status = "live_ready"
    elif truelayer_provider_ready:
        truelayer_status = "blocked_missing_pipeline_credit_meter"
    elif bank_live_mode and truelayer_selected:
        truelayer_status = "blocked_missing_token"
    elif truelayer_selected or truelayer_token_present:
        truelayer_status = "configured_record_only"
    else:
        truelayer_status = "record_only"

    webhook_secret_present = _env_present("GMFN_WEBHOOK_SECRET")
    web_push_ready = _env_present("GSN_WEB_PUSH_PUBLIC_KEY", "VAPID_PUBLIC_KEY") and _env_present(
        "GSN_WEB_PUSH_PRIVATE_KEY", "VAPID_PRIVATE_KEY"
    )
    r2_ready = all(
        _env_present(name)
        for name in [
            "R2_ACCOUNT_ID",
            "R2_ACCESS_KEY_ID",
            "R2_SECRET_ACCESS_KEY",
            "R2_BUCKET_NAME",
        ]
    )
    r2_credit_meter_ready = _pipeline_credit_meter_env_ready(
        provider_key="storage.cloudflare_r2",
        workflow_key="storage.cloudflare_r2.presigned_upload",
    )
    if r2_ready and r2_credit_meter_ready:
        r2_status = "community_admin_presign_route_ready_default_uploads_local"
    elif r2_ready:
        r2_status = "blocked_missing_pipeline_credit_meter"
    else:
        r2_status = "missing_r2_env"
    phone_delivery_mode = _env_mode("GMFN_ENTRY_PHONE_DELIVERY", "record-only")
    phone_live_requested = phone_delivery_mode in {"sms", "live", "provider", "pending-sms"}
    phone_credit_meter_ready = _pipeline_credit_meter_env_ready(
        provider_key="phone.sms_or_verify",
        workflow_key="phone.sms_or_verify.delivery",
    )
    if phone_live_requested and phone_credit_meter_ready:
        phone_status = "meter_ready_provider_not_wired_no_sms_sent"
    elif phone_live_requested:
        phone_status = "live_requested_without_provider"
    else:
        phone_status = "record_only_or_preview"
    callback_mode = _env_mode("GMFN_CONFIRMATION_CALLBACK_DELIVERY_MODE", "disabled")
    callback_url_present = _env_present("GMFN_CONFIRMATION_CALLBACK_WEBHOOK_URL")
    callback_secret_present = _env_present("GMFN_CONFIRMATION_CALLBACK_WEBHOOK_SECRET")
    callback_credit_meter_ready = _pipeline_credit_meter_env_ready(
        provider_key="community.callback_webhook",
        workflow_key="community.callback_webhook.delivery",
    )
    if callback_url_present and callback_secret_present and callback_credit_meter_ready:
        callback_status = "configured_signed_live_ready"
    elif callback_url_present and callback_secret_present:
        callback_status = "blocked_missing_pipeline_credit_meter"
    elif callback_url_present:
        callback_status = "configured_unsigned_blocked"
    else:
        callback_status = "disabled"
    email_ready = _env_present(
        "SMTP_HOST",
        "SENDGRID_API_KEY",
        "POSTMARK_SERVER_TOKEN",
        "MAILGUN_API_KEY",
    )
    ai_ready = _env_present("OPENAI_API_KEY")

    services = [
        _readiness_item(
            key="bank.gb.truelayer",
            label="GB bank account-holder verification",
            category="bank_verification",
            status=truelayer_status,
            configured=bool(truelayer_selected or truelayer_token_present),
            live_ready=truelayer_live_ready,
            paid_provider=True,
            credit_meter_required=True,
            env_signals=[
                "GMFN_VERIFICATION_MODE",
                "GMFN_BANK_PROVIDER_GB",
                "TRUELAYER_ACCESS_TOKEN_present",
                "TRUELAYER_API_BASE_URL_optional",
                "GSN_PIPELINE_CREDIT_ACCOUNT_ID_BANK_GB_TRUELAYER_ACCOUNT_HOLDER_VERIFICATION_or_fallback_present",
                "GSN_PIPELINE_CREDIT_COST_BANK_GB_TRUELAYER_ACCOUNT_HOLDER_VERIFICATION_or_fallback_present",
            ],
            boundary=(
                "TrueLayer can verify GB account-holder details only when live mode, provider selection, access token, and pipeline-credit meter config are present. "
                "Record-only mode remains reviewable evidence, not bank verification."
            ),
            next_step=(
                "Keep record-only until a paid pilot explicitly needs GB bank verification, then set live provider env vars, configure the pipeline-credit account/cost, and run provider-sandbox tests."
            ),
        ),
        _readiness_item(
            key="payment.webhooks",
            label="Payment/bank webhook reconciliation",
            category="payments",
            status="signature_ready" if webhook_secret_present else "parser_ready_missing_secret",
            configured=webhook_secret_present,
            live_ready=webhook_secret_present,
            paid_provider=False,
            credit_meter_required=False,
            env_signals=["GMFN_WEBHOOK_SECRET_present"],
            boundary=(
                "Webhook parsers exist for generic, Stripe, Paystack, Flutterwave, and Monnify-style success payloads, but this is inbound reconciliation only. "
                "Receiving a signed webhook is not checkout initiation, escrow, custody, provider spend, or proof before provider/bank success."
            ),
            next_step=(
                "Configure a webhook secret before accepting provider events; choose one payment provider before adding checkout initiation, and meter only outbound provider calls that create cost."
            ),
        ),
        _readiness_item(
            key="payment.checkout",
            label="Checkout/payment initiation",
            category="payments",
            status="planned_not_wired",
            configured=False,
            live_ready=False,
            paid_provider=True,
            credit_meter_required=True,
            env_signals=["No checkout client env detected by this readiness gate"],
            boundary=(
                "The backend can ingest successful provider events, but it does not yet create provider checkout sessions or hosted payment links."
            ),
            next_step="Start with one UK rail or one Nigeria rail; do not add every gateway at once.",
        ),
        _readiness_item(
            key="phone.sms_or_verify",
            label="Phone/SMS verification delivery",
            category="identity_verification",
            status=phone_status,
            configured=phone_live_requested,
            live_ready=False,
            paid_provider=True,
            credit_meter_required=True,
            env_signals=[
                "GMFN_ENTRY_PHONE_DELIVERY",
                "GSN_PIPELINE_CREDIT_ACCOUNT_ID_PHONE_SMS_OR_VERIFY_DELIVERY_or_fallback_present",
                "GSN_PIPELINE_CREDIT_COST_PHONE_SMS_OR_VERIFY_DELIVERY_or_fallback_present",
            ],
            boundary=(
                "The entry flow can record or preview phone verification, but no direct SMS/WhatsApp provider client is wired here. Even with Pipeline Credit meter config, this backend does not send SMS yet."
            ),
            next_step="Wire exactly one SMS or verification provider behind Pipeline Credits before promising live phone delivery; failed attempts and abuse can cost money.",
        ),
        _readiness_item(
            key="web_push.browser",
            label="Browser Web Push",
            category="notifications",
            status="configured" if web_push_ready else "missing_vapid_keys",
            configured=web_push_ready,
            live_ready=web_push_ready,
            paid_provider=False,
            credit_meter_required=False,
            env_signals=[
                "GSN_WEB_PUSH_PUBLIC_KEY_or_VAPID_PUBLIC_KEY_present",
                "GSN_WEB_PUSH_PRIVATE_KEY_or_VAPID_PRIVATE_KEY_present",
            ],
            boundary=(
                "Web Push has no normal per-message vendor fee, but delivery still depends on browser permission, subscriptions, device conditions, and VAPID keys."
            ),
            next_step="Configure VAPID keys and test on real phones before promising notifications.",
        ),
        _readiness_item(
            key="storage.cloudflare_r2",
            label="Cloudflare R2 media/evidence storage",
            category="storage",
            status=r2_status,
            configured=r2_ready,
            live_ready=False,
            paid_provider=True,
            credit_meter_required=True,
            env_signals=[
                "R2_ACCOUNT_ID_present",
                "R2_ACCESS_KEY_ID_present",
                "R2_SECRET_ACCESS_KEY_present",
                "R2_BUCKET_NAME_present",
                "GSN_PIPELINE_CREDIT_ACCOUNT_ID_STORAGE_CLOUDFLARE_R2_PRESIGNED_UPLOAD_or_fallback_present",
                "GSN_PIPELINE_CREDIT_COST_STORAGE_CLOUDFLARE_R2_PRESIGNED_UPLOAD_or_fallback_present",
            ],
            boundary=(
                "R2 can reduce media/evidence storage pressure only after dependency and production upload-path review. The R2 presigned-upload route is credit-metered for platform/admin and community-admin scopes, but default marketplace upload routes are still local until intentionally migrated and wider abuse controls are confirmed."
            ),
            next_step="Use the R2 presign route for controlled pilots only; move default upload routes after frontend migration tests pass and do not expose paid storage to unauthenticated abuse.",
        ),
        _readiness_item(
            key="community.callback_webhook",
            label="Community confirmation callback webhook",
            category="notifications",
            status=callback_status,
            configured=callback_url_present,
            live_ready=bool(callback_url_present and callback_secret_present and callback_credit_meter_ready),
            paid_provider=True,
            credit_meter_required=True,
            env_signals=[
                "GMFN_CONFIRMATION_CALLBACK_DELIVERY_MODE",
                "GMFN_CONFIRMATION_CALLBACK_WEBHOOK_URL_present",
                "GMFN_CONFIRMATION_CALLBACK_WEBHOOK_SECRET_present",
                "GSN_PIPELINE_CREDIT_ACCOUNT_ID_COMMUNITY_CALLBACK_WEBHOOK_DELIVERY_or_fallback_present",
                "GSN_PIPELINE_CREDIT_COST_COMMUNITY_CALLBACK_WEBHOOK_DELIVERY_or_fallback_present",
            ],
            boundary="Callback delivery is a governed bridge, not SMS, WhatsApp, or email delivery by itself; live webhook calls are blocked unless pipeline credits are configured.",
            next_step="Use signed, credit-metered callbacks only after the receiving system and consent/audit route are known.",
        ),
        _readiness_item(
            key="email.transactional",
            label="Transactional email provider",
            category="messaging",
            status="env_present_not_wired" if email_ready else "not_wired",
            configured=email_ready,
            live_ready=False,
            paid_provider=True,
            credit_meter_required=True,
            env_signals=["SMTP_HOST_or_SendGrid_or_Postmark_or_Mailgun_present"],
            boundary="No transactional email delivery client is confirmed live by this readiness gate.",
            next_step="Add email only for a narrow paid workflow such as receipts or verification notices.",
        ),
        _readiness_item(
            key="ai.openai",
            label="AI summaries/reports",
            category="ai",
            status="key_present_not_wired" if ai_ready else "not_wired",
            configured=ai_ready,
            live_ready=False,
            paid_provider=True,
            credit_meter_required=True,
            env_signals=["OPENAI_API_KEY_present"],
            boundary="No backend OpenAI client or credit-metered AI route is confirmed live by this readiness gate.",
            next_step="Open AI only behind a pipeline-credit debit for one workflow, such as meeting pack or evidence summary.",
        ),
    ]

    counts = {
        "total": len(services),
        "live_ready": sum(1 for item in services if item["live_ready"]),
        "configured": sum(1 for item in services if item["configured"]),
        "credit_meter_required": sum(1 for item in services if item["credit_meter_required"]),
    }

    return {
        "ok": True,
        "diagnostic_version": "api-readiness-2026-10-09",
        "mode": {
            "verification_mode": verification_mode,
            "gb_bank_provider": gb_bank_provider or None,
            "phone_delivery_mode": phone_delivery_mode,
            "callback_delivery_mode": callback_mode,
        },
        "counts": counts,
        "services": services,
        "recommended_activation_order": [
            "payment.webhooks",
            "bank.gb.truelayer",
            "web_push.browser",
            "storage.cloudflare_r2",
            "phone.sms_or_verify",
            "payment.checkout",
            "email.transactional",
            "ai.openai",
        ],
        "truth_boundary": (
            "This endpoint does not activate providers, expose secrets, prove provider accounts are approved, or confirm billing is safe. "
            "It only reports readiness signals so paid APIs can be opened deliberately and attached to pipeline-credit controls."
        ),
    }

@router.get("/public-shop-identity/{identity_key}")
def public_shop_identity_diagnostics(
    identity_key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Admin-only: diagnose why a public shop link does or does not resolve.

    This deliberately mirrors the public shop identity lookup without returning
    private product data or secrets.
    """
    _require_admin(current_user)

    candidates = _identity_candidates(identity_key)
    matched_user = None
    matched_identity = None
    for candidate in candidates:
        user = (
            db.query(User)
            .filter(func.upper(User.gmfn_id) == candidate)
            .first()
        )
        if user is not None:
            matched_user = user
            matched_identity = candidate
            break

    numeric_id = 0
    if matched_user is None:
        try:
            numeric_id = int(_clean_identity(identity_key))
        except (TypeError, ValueError):
            numeric_id = 0
        if numeric_id > 0:
            matched_user = db.query(User).filter(User.id == int(numeric_id)).first()
            if matched_user is not None:
                matched_identity = str(numeric_id)

    if matched_user is None:
        suffix = _identity_suffix(identity_key)
        suffix_matches = []
        if suffix:
            rows = (
                db.query(User)
                .filter(func.upper(User.gmfn_id).like(f"%{suffix}"))
                .limit(10)
                .all()
            )
            suffix_matches = [
                {
                    "user_id": int(row.id),
                    "gmfn_id": _clean_identity(getattr(row, "gmfn_id", None)) or None,
                    "role": _clean_identity(getattr(row, "role", None)) or None,
                    "display_name": _clean_identity(
                        getattr(row, "display_name", None)
                    )
                    or None,
                }
                for row in rows
            ]

        return {
            "ok": True,
            "identity_key": _clean_identity(identity_key),
            "candidates_checked": candidates,
            "numeric_id_checked": numeric_id if numeric_id > 0 else None,
            "user_found": False,
            "reason": "seller_identity_not_found",
            "suffix_matches": suffix_matches,
            "public_shop_status": "identity_missing",
            "next_action": (
                "This exact public shop owner identity does not exist in this "
                "database. The signed-in owner must copy a fresh public shop "
                "link from the canonical frontend, or production data must be "
                "repaired if this identity was expected to exist."
            ),
        }

    active_shops = (
        db.query(MarketplaceShop)
        .filter(
            MarketplaceShop.owner_user_id == int(matched_user.id),
            MarketplaceShop.is_active.is_(True),
        )
        .order_by(MarketplaceShop.created_at.asc(), MarketplaceShop.id.asc())
        .all()
    )
    shop_ids = [int(shop.id) for shop in active_shops]
    active_shop_details = [
        {
            "id": int(shop.id),
            "clan_id": int(getattr(shop, "clan_id", 0) or 0) or None,
            "name": _clean_identity(getattr(shop, "name", None)) or None,
            "is_active": bool(getattr(shop, "is_active", False)),
        }
        for shop in active_shops
    ]

    active_product_count = 0
    public_product_count = 0
    if shop_ids:
        product_rows = (
            db.query(MarketplaceProduct)
            .filter(
                MarketplaceProduct.shop_id.in_(shop_ids),
                MarketplaceProduct.seller_user_id == int(matched_user.id),
                MarketplaceProduct.is_active.is_(True),
            )
            .all()
        )
        active_product_count = len(product_rows)
        public_product_count = sum(
            1
            for product in product_rows
            if _public_shop_visibility(getattr(product, "visibility_mode", None))
        )

    if not active_shops:
        public_shop_status = "shop_missing"
        next_action = (
            "The owner identity exists, but there is no active marketplace shop "
            "for that owner. The signed-in owner must open Marketplace and use "
            "the public shop link action so the owner shop is created/refreshed."
        )
    elif public_product_count <= 0:
        public_shop_status = "products_empty"
        next_action = (
            "The owner has an active shop, but no active public/community-visible "
            "products are attached to it yet. Add or restore public shop blocks."
        )
    else:
        public_shop_status = "ready"
        next_action = (
            "The identity, active shop, and public products are connected. The "
            "public shop link should load the whole public shop domain."
        )

    return {
        "ok": True,
        "identity_key": _clean_identity(identity_key),
        "candidates_checked": candidates,
        "numeric_id_checked": numeric_id if numeric_id > 0 else None,
        "matched_identity": matched_identity,
        "user_found": True,
        "user": {
            "id": int(matched_user.id),
            "gmfn_id": _clean_identity(getattr(matched_user, "gmfn_id", None))
            or None,
            "display_name": _clean_identity(
                getattr(matched_user, "display_name", None)
            )
            or None,
            "role": _clean_identity(getattr(matched_user, "role", None)) or None,
        },
        "active_shop_count": len(active_shops),
        "active_shop_ids": shop_ids,
        "active_shop_details": active_shop_details,
        "active_product_count": active_product_count,
        "public_product_count": public_product_count,
        "public_shop_ready": bool(active_shops),
        "has_public_products": public_product_count > 0,
        "public_shop_status": public_shop_status,
        "next_action": next_action,
    }
