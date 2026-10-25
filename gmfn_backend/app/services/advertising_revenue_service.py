from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.db.advertising_revenue_models import (
    AdvertisingCampaignSettlement,
    AdvertisingCommunityEarning,
    AdvertisingCommunityPayout,
    CommunityAdvertisingPayoutMandate,
)
from app.db.bank_models import BankEvent, ExpectedPayment
from app.db.models import (
    Clan,
    FeatureEntitlement,
    SpotlightCampaign,
    SpotlightExposureEvent,
    User,
    UserPayoutDestination,
)
from app.services.expected_payments_service import create_expected_payment
from app.services.payment_operations_policy import require_payment_operations_enabled
from app.services.settlement_config_service import get_settlement_config


MONEY_QUANT = Decimal("0.01")
DEFAULT_COMMUNITY_SHARE_BPS = 500
ADVERTISING_SETTLEMENT_CLAN_ENV = "GSN_ADVERTISING_SETTLEMENT_CLAN_ID"
ADVERTISING_COMMUNITY_SHARE_BPS_ENV = "GSN_ADVERTISING_COMMUNITY_SHARE_BPS"
ACCOUNTING_BOUNDARY = (
    "Advertising earnings are accounting records, not a wallet or automatic bank transfer. "
    "A payout is released only after reconciled advertiser payment, finalized delivery evidence, "
    "a community-appointed beneficiary, and an externally completed transfer with its reference."
)


class AdvertisingRevenueError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _money(value: Any, *, field: str = "amount") -> Decimal:
    try:
        amount = Decimal(str(value if value is not None else 0)).quantize(
            MONEY_QUANT, rounding=ROUND_HALF_UP
        )
    except (InvalidOperation, ValueError, TypeError) as exc:
        raise AdvertisingRevenueError("invalid_amount", f"{field} must be a valid amount.") from exc
    if amount < Decimal("0.00"):
        raise AdvertisingRevenueError("negative_amount", f"{field} cannot be negative.")
    return amount


def _currency(value: Any) -> str:
    selected = str(value or "GBP").strip().upper()
    if len(selected) < 3 or len(selected) > 8 or not selected.isalnum():
        raise AdvertisingRevenueError("invalid_currency", "Use a valid currency code.")
    return selected


def community_share_bps() -> int:
    raw = str(os.getenv(ADVERTISING_COMMUNITY_SHARE_BPS_ENV, DEFAULT_COMMUNITY_SHARE_BPS)).strip()
    try:
        value = int(raw)
    except ValueError:
        value = DEFAULT_COMMUNITY_SHARE_BPS
    return min(10000, max(0, value))


def advertising_settlement_clan_id() -> Optional[int]:
    raw = str(os.getenv(ADVERTISING_SETTLEMENT_CLAN_ENV, "") or "").strip()
    try:
        value = int(raw)
    except ValueError:
        return None
    return value if value > 0 else None


def calculate_settlement_amounts(
    *,
    gross_amount: Any,
    tax_amount: Any = 0,
    refund_amount: Any = 0,
    chargeback_amount: Any = 0,
    processing_fee_amount: Any = 0,
    delivery_cost_amount: Any = 0,
    share_bps: Optional[int] = None,
) -> dict[str, Any]:
    gross = _money(gross_amount, field="gross amount")
    deductions = {
        "tax_amount": _money(tax_amount, field="tax amount"),
        "refund_amount": _money(refund_amount, field="refund amount"),
        "chargeback_amount": _money(chargeback_amount, field="chargeback amount"),
        "processing_fee_amount": _money(processing_fee_amount, field="processing fee"),
        "delivery_cost_amount": _money(delivery_cost_amount, field="campaign delivery cost"),
    }
    total_deductions = sum(deductions.values(), Decimal("0.00")).quantize(MONEY_QUANT)
    if total_deductions > gross:
        raise AdvertisingRevenueError(
            "deductions_exceed_gross",
            "Campaign-specific deductions cannot exceed the advertiser payment.",
        )
    bps = community_share_bps() if share_bps is None else int(share_bps)
    if bps < 0 or bps > 10000:
        raise AdvertisingRevenueError("invalid_share_rate", "Community share must be between 0% and 100%.")
    net = (gross - total_deductions).quantize(MONEY_QUANT)
    pool = (net * Decimal(bps) / Decimal(10000)).quantize(MONEY_QUANT, rounding=ROUND_HALF_UP)
    return {
        "gross_amount": gross,
        **deductions,
        "total_deductions": total_deductions,
        "distributable_net_amount": net,
        "community_pool_bps": bps,
        "community_pool_percent": f"{(Decimal(bps) / Decimal(100)):.2f}",
        "community_pool_amount": pool,
        "formula": (
            "gross received - tax - refunds - chargebacks - processing fees - "
            "campaign-specific delivery costs = distributable net; community pool = configured rate x net"
        ),
        "excluded_from_deductions": "General GSN salaries, rent, and unrelated overhead are not deducted.",
    }


def _require_house_campaign(db: Session, campaign_id: int) -> SpotlightCampaign:
    campaign = db.get(SpotlightCampaign, int(campaign_id))
    if campaign is None:
        raise AdvertisingRevenueError("campaign_not_found", "GSN campaign not found.")
    if str(getattr(campaign, "source_kind", "") or "").strip().lower() != "gsn_house":
        raise AdvertisingRevenueError(
            "campaign_not_central_advertising",
            "Community advertising revenue applies only to governed GSN house campaigns.",
        )
    return campaign


def save_settlement_draft(
    db: Session,
    *,
    campaign_id: int,
    actor_user_id: int,
    idempotency_key: str,
    currency: str,
    gross_amount: Any,
    tax_amount: Any = 0,
    refund_amount: Any = 0,
    chargeback_amount: Any = 0,
    processing_fee_amount: Any = 0,
    delivery_cost_amount: Any = 0,
) -> AdvertisingCampaignSettlement:
    _require_house_campaign(db, campaign_id)
    key = str(idempotency_key or "").strip()
    if len(key) < 8:
        raise AdvertisingRevenueError("idempotency_key_required", "A stable draft reference is required.")
    amounts = calculate_settlement_amounts(
        gross_amount=gross_amount,
        tax_amount=tax_amount,
        refund_amount=refund_amount,
        chargeback_amount=chargeback_amount,
        processing_fee_amount=processing_fee_amount,
        delivery_cost_amount=delivery_cost_amount,
    )
    row = (
        db.query(AdvertisingCampaignSettlement)
        .filter(AdvertisingCampaignSettlement.campaign_id == int(campaign_id))
        .one_or_none()
    )
    if row is not None and row.status not in {"draft", "awaiting_payment"}:
        raise AdvertisingRevenueError(
            "settlement_locked",
            "A confirmed or finalized campaign settlement cannot be edited.",
        )
    if row is None:
        row = AdvertisingCampaignSettlement(
            campaign_id=int(campaign_id),
            created_by_user_id=int(actor_user_id),
            idempotency_key=key,
            status="draft",
        )
    elif row.expected_payment_id is not None:
        raise AdvertisingRevenueError(
            "payment_instruction_already_created",
            "The campaign payment instruction already exists, so its amount cannot be changed.",
        )
    row.currency = _currency(currency)
    row.gross_received_amount = amounts["gross_amount"]
    row.tax_amount = amounts["tax_amount"]
    row.refund_amount = amounts["refund_amount"]
    row.chargeback_amount = amounts["chargeback_amount"]
    row.processing_fee_amount = amounts["processing_fee_amount"]
    row.delivery_cost_amount = amounts["delivery_cost_amount"]
    row.distributable_net_amount = amounts["distributable_net_amount"]
    row.community_pool_bps = amounts["community_pool_bps"]
    row.community_pool_amount = amounts["community_pool_amount"]
    row.updated_at = _now()
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def create_campaign_payment_instruction(
    db: Session,
    *,
    campaign_id: int,
    payer_user_id: int,
    actor_user_id: int,
    settlement_country: Optional[str] = None,
) -> tuple[AdvertisingCampaignSettlement, ExpectedPayment, dict[str, Any]]:
    require_payment_operations_enabled()
    campaign = _require_house_campaign(db, campaign_id)
    payer = db.get(User, int(payer_user_id))
    if payer is None:
        raise AdvertisingRevenueError("payer_not_found", "The selected GSN payer was not found.")
    row = (
        db.query(AdvertisingCampaignSettlement)
        .filter(AdvertisingCampaignSettlement.campaign_id == int(campaign_id))
        .one_or_none()
    )
    if row is None:
        raise AdvertisingRevenueError("settlement_draft_required", "Save the campaign financial draft first.")
    if _money(row.gross_received_amount) <= Decimal("0.00"):
        raise AdvertisingRevenueError("gross_amount_required", "Enter the advertiser payment amount first.")
    settlement_clan_id = advertising_settlement_clan_id()
    if settlement_clan_id is None or db.get(Clan, int(settlement_clan_id)) is None:
        raise AdvertisingRevenueError(
            "advertising_settlement_clan_not_configured",
            f"Configure {ADVERTISING_SETTLEMENT_CLAN_ENV} with the GSN settlement community ID.",
        )
    settlement = get_settlement_config(settlement_country)
    if not bool(settlement.get("configured")):
        raise AdvertisingRevenueError(
            "settlement_account_not_configured",
            "The GSN settlement account is not ready for the selected country.",
        )
    if row.expected_payment_id is not None:
        expected = db.get(ExpectedPayment, int(row.expected_payment_id))
        if expected is None:
            raise AdvertisingRevenueError("expected_payment_missing", "The recorded payment instruction is missing.")
        return row, expected, settlement
    reference = f"GSN-AD-C{int(campaign.id)}-P{int(payer.id)}"
    expected = create_expected_payment(
        db,
        clan_id=int(settlement_clan_id),
        user_id=int(payer.id),
        expected_type="advertising_campaign",
        amount=row.gross_received_amount,
        currency=row.currency,
        reference_display=reference,
        due_at=_now() + timedelta(days=7),
        meta={
            "payment_context": "advertising_campaign",
            "campaign_id": int(campaign.id),
            "advertising_settlement_id": int(row.id),
            "payer_user_id": int(payer.id),
            "created_by_user_id": int(actor_user_id),
            "community_pool_bps": int(row.community_pool_bps),
            "community_pool_amount": str(_money(row.community_pool_amount)),
            "financial_boundary": ACCOUNTING_BOUNDARY,
        },
        commit=False,
        refresh=False,
    )
    row.payer_user_id = int(payer.id)
    row.expected_payment_id = int(expected.id)
    row.payment_reference = reference
    row.status = "awaiting_payment"
    row.updated_at = _now()
    db.add(row)
    db.add(expected)
    db.commit()
    db.refresh(row)
    db.refresh(expected)
    return row, expected, settlement


def apply_confirmed_campaign_payment(
    db: Session,
    *,
    bank_event: BankEvent,
    expected_payment: ExpectedPayment,
) -> dict[str, Any]:
    if str(expected_payment.status or "").lower() != "confirmed":
        return {"ok": True, "applied": False, "reason": "expected_not_fully_confirmed"}
    if int(getattr(bank_event, "expected_payment_id", 0) or 0) != int(expected_payment.id):
        return {"ok": False, "applied": False, "reason": "bank_event_expected_payment_mismatch"}
    if not bool(getattr(bank_event, "canonical", False)) or str(
        getattr(bank_event, "direction", "") or ""
    ).strip().lower() != "credit":
        return {"ok": False, "applied": False, "reason": "canonical_credit_required"}
    if _money(getattr(expected_payment, "paid_amount", 0)) < _money(expected_payment.amount) or _money(
        getattr(expected_payment, "remaining_amount", 0)
    ) > Decimal("0.00"):
        return {"ok": False, "applied": False, "reason": "expected_payment_balance_incomplete"}
    row = (
        db.query(AdvertisingCampaignSettlement)
        .filter(AdvertisingCampaignSettlement.expected_payment_id == int(expected_payment.id))
        .one_or_none()
    )
    if row is None:
        return {"ok": False, "applied": False, "reason": "advertising_settlement_not_found"}
    if row.status in {"payment_confirmed", "delivery_finalized"}:
        return {
            "ok": True,
            "applied": False,
            "reason": "already_applied",
            "advertising_settlement_id": int(row.id),
        }
    if _currency(bank_event.currency) != _currency(row.currency):
        return {"ok": False, "applied": False, "reason": "settlement_currency_mismatch"}
    if _money(expected_payment.amount) != _money(row.gross_received_amount):
        return {"ok": False, "applied": False, "reason": "settlement_amount_mismatch"}
    row.bank_event_id = int(bank_event.id)
    row.status = "payment_confirmed"
    row.confirmed_at = _now()
    row.updated_at = _now()
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "ok": True,
        "applied": True,
        "kind": "advertising_campaign_payment",
        "advertising_settlement_id": int(row.id),
        "campaign_id": int(row.campaign_id),
        "community_pool_amount": str(_money(row.community_pool_amount)),
        "boundary": "Payment confirmed; community earnings still require finalized qualifying-impression evidence.",
    }


def _entitlement_covers_event(row: FeatureEntitlement, event_at: datetime) -> bool:
    event_time = _aware(event_at) or _now()
    starts_at = _aware(row.starts_at)
    expires_at = _aware(row.expires_at)
    revoked_at = _aware(row.revoked_at)
    if starts_at is not None and event_time < starts_at:
        return False
    if expires_at is not None and event_time >= expires_at:
        return False
    if revoked_at is not None and event_time >= revoked_at:
        return False
    return str(row.status or "active").strip().lower() == "active"


def _paid_impression_counts(db: Session, *, campaign_id: int) -> tuple[dict[int, int], dict[int, int]]:
    events = (
        db.query(SpotlightExposureEvent)
        .filter(SpotlightExposureEvent.campaign_id == int(campaign_id))
        .filter(SpotlightExposureEvent.event_type == "qualifying_impression")
        .filter(SpotlightExposureEvent.allocation_route_clan_id.isnot(None))
        .order_by(SpotlightExposureEvent.event_at.asc(), SpotlightExposureEvent.id.asc())
        .all()
    )
    all_counts: dict[int, int] = {}
    eligible_counts: dict[int, int] = {}
    entitlements_by_clan: dict[int, list[FeatureEntitlement]] = {}
    for event in events:
        clan_id = int(event.allocation_route_clan_id)
        all_counts[clan_id] = all_counts.get(clan_id, 0) + 1
        if clan_id not in entitlements_by_clan:
            entitlements_by_clan[clan_id] = (
                db.query(FeatureEntitlement)
                .filter(FeatureEntitlement.clan_id == clan_id)
                .filter(FeatureEntitlement.feature_code == "community_domain")
                .order_by(FeatureEntitlement.starts_at.asc(), FeatureEntitlement.id.asc())
                .all()
            )
        if any(_entitlement_covers_event(row, event.event_at) for row in entitlements_by_clan[clan_id]):
            eligible_counts[clan_id] = eligible_counts.get(clan_id, 0) + 1
    return all_counts, eligible_counts


def _allocate_pool_by_weight(
    pool: Decimal,
    counts: dict[int, int],
) -> dict[int, Decimal]:
    positive = {int(key): int(value) for key, value in counts.items() if int(value) > 0}
    total_weight = sum(positive.values())
    if total_weight <= 0:
        return {}
    pool_cents = int((_money(pool) * 100).to_integral_value(rounding=ROUND_HALF_UP))
    base_cents: dict[int, int] = {}
    remainders: list[tuple[int, int]] = []
    for clan_id, weight in positive.items():
        numerator = pool_cents * weight
        base_cents[clan_id] = numerator // total_weight
        remainders.append((numerator % total_weight, clan_id))
    cents_left = pool_cents - sum(base_cents.values())
    for _, clan_id in sorted(remainders, key=lambda item: (-item[0], item[1]))[:cents_left]:
        base_cents[clan_id] += 1
    return {
        clan_id: (Decimal(cents) / Decimal(100)).quantize(MONEY_QUANT)
        for clan_id, cents in base_cents.items()
    }


def _active_mandate(db: Session, clan_id: int) -> Optional[CommunityAdvertisingPayoutMandate]:
    return (
        db.query(CommunityAdvertisingPayoutMandate)
        .filter(CommunityAdvertisingPayoutMandate.clan_id == int(clan_id))
        .filter(CommunityAdvertisingPayoutMandate.status == "active")
        .order_by(CommunityAdvertisingPayoutMandate.accepted_at.desc(), CommunityAdvertisingPayoutMandate.id.desc())
        .first()
    )


def finalize_campaign_delivery(
    db: Session,
    *,
    campaign_id: int,
    actor_user_id: int,
) -> list[AdvertisingCommunityEarning]:
    campaign = _require_house_campaign(db, campaign_id)
    settlement = (
        db.query(AdvertisingCampaignSettlement)
        .filter(AdvertisingCampaignSettlement.campaign_id == int(campaign_id))
        .one_or_none()
    )
    if settlement is None or settlement.status != "payment_confirmed":
        raise AdvertisingRevenueError(
            "confirmed_payment_required",
            "Reconciled advertiser payment is required before delivery earnings can be finalized.",
        )
    expires_at = _aware(getattr(campaign, "authorized_expires_at", None) or getattr(campaign, "expires_at", None))
    live = str(getattr(campaign, "status", "") or "").lower() == "active"
    if live and (expires_at is None or expires_at > _now()):
        raise AdvertisingRevenueError(
            "campaign_still_serving",
            "Stop the campaign or wait for its expiry before finalizing community earnings.",
        )
    existing = (
        db.query(AdvertisingCommunityEarning)
        .filter(AdvertisingCommunityEarning.settlement_id == int(settlement.id))
        .count()
    )
    if existing:
        return (
            db.query(AdvertisingCommunityEarning)
            .filter(AdvertisingCommunityEarning.settlement_id == int(settlement.id))
            .order_by(AdvertisingCommunityEarning.clan_id.asc())
            .all()
        )
    all_counts, eligible_counts = _paid_impression_counts(db, campaign_id=int(campaign_id))
    eligible_total = sum(eligible_counts.values())
    pool = _money(settlement.community_pool_amount)
    amount_by_clan = _allocate_pool_by_weight(pool, eligible_counts)
    rows: list[AdvertisingCommunityEarning] = []
    for clan_id in sorted(all_counts):
        mandate = _active_mandate(db, clan_id)
        destination = (
            db.get(UserPayoutDestination, int(mandate.payout_destination_id))
            if mandate is not None and mandate.payout_destination_id is not None
            else None
        )
        paid_impressions = eligible_counts.get(clan_id, 0)
        is_paid_eligible = paid_impressions > 0
        amount = amount_by_clan.get(clan_id, Decimal("0.00"))
        if not is_paid_eligible:
            eligibility = "not_paid_when_impressions_occurred"
            status = "held"
        elif mandate is None:
            eligibility = "earned_but_no_active_beneficiary_mandate"
            status = "accrued"
        elif destination is None or int(destination.user_id) != int(mandate.beneficiary_user_id):
            eligibility = "earned_but_payout_destination_missing"
            status = "accrued"
        else:
            eligibility = "earned_payout_details_recorded_not_bank_verified"
            status = "accrued"
        row = AdvertisingCommunityEarning(
            settlement_id=int(settlement.id),
            campaign_id=int(campaign_id),
            clan_id=int(clan_id),
            qualifying_impressions=int(all_counts[clan_id]),
            eligible_impressions_total=int(eligible_total),
            amount=amount,
            currency=settlement.currency,
            eligibility_status=eligibility,
            status=status,
            mandate_id=int(mandate.id) if mandate is not None else None,
            beneficiary_user_id=int(mandate.beneficiary_user_id) if mandate is not None else None,
            payout_destination_id=int(destination.id) if destination is not None else None,
            calculation_json=json.dumps(
                {
                    "community_qualifying_impressions": int(all_counts[clan_id]),
                    "community_paid_eligible_impressions": int(paid_impressions),
                    "eligible_impressions_total": int(eligible_total),
                    "community_pool_amount": str(pool),
                    "share_bps": int(settlement.community_pool_bps),
                    "general_overhead_deducted": False,
                    "finalized_by_user_id": int(actor_user_id),
                },
                ensure_ascii=False,
                sort_keys=True,
            ),
        )
        db.add(row)
        rows.append(row)
    settlement.status = "delivery_finalized"
    settlement.delivery_finalized_at = _now()
    settlement.updated_at = _now()
    db.add(settlement)
    db.commit()
    for row in rows:
        db.refresh(row)
    return rows


def appoint_payout_beneficiary(
    db: Session,
    *,
    clan_id: int,
    beneficiary_user_id: int,
    appointed_by_user_id: int,
    authority_note: Optional[str],
) -> CommunityAdvertisingPayoutMandate:
    if db.get(Clan, int(clan_id)) is None:
        raise AdvertisingRevenueError("community_not_found", "Community not found.")
    if db.get(User, int(beneficiary_user_id)) is None:
        raise AdvertisingRevenueError("beneficiary_not_found", "The selected beneficiary was not found.")
    for existing in (
        db.query(CommunityAdvertisingPayoutMandate)
        .filter(CommunityAdvertisingPayoutMandate.clan_id == int(clan_id))
        .filter(CommunityAdvertisingPayoutMandate.status.in_(["pending_beneficiary", "active"]))
        .all()
    ):
        existing.status = "revoked"
        existing.revoked_at = _now()
        existing.revoked_by_user_id = int(appointed_by_user_id)
        db.add(existing)
    row = CommunityAdvertisingPayoutMandate(
        clan_id=int(clan_id),
        beneficiary_user_id=int(beneficiary_user_id),
        payout_destination_id=None,
        appointed_by_user_id=int(appointed_by_user_id),
        accepted_by_user_id=None,
        status="pending_beneficiary",
        authority_note=str(authority_note or "").strip() or None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def accept_payout_mandate(
    db: Session,
    *,
    mandate_id: int,
    beneficiary_user_id: int,
) -> CommunityAdvertisingPayoutMandate:
    row = db.get(CommunityAdvertisingPayoutMandate, int(mandate_id))
    if row is None:
        raise AdvertisingRevenueError("mandate_not_found", "Payout appointment not found.")
    if int(row.beneficiary_user_id) != int(beneficiary_user_id):
        raise AdvertisingRevenueError("beneficiary_only", "Only the appointed beneficiary can accept this role.")
    if row.status == "revoked":
        raise AdvertisingRevenueError("mandate_revoked", "This payout appointment has been revoked.")
    destination = (
        db.query(UserPayoutDestination)
        .filter(UserPayoutDestination.user_id == int(beneficiary_user_id))
        .one_or_none()
    )
    if destination is None:
        raise AdvertisingRevenueError(
            "payout_destination_required",
            "Add your payout account before accepting the community beneficiary role.",
        )
    active = _active_mandate(db, int(row.clan_id))
    if active is not None and int(active.id) != int(row.id):
        active.status = "revoked"
        active.revoked_at = _now()
        active.revoked_by_user_id = int(beneficiary_user_id)
        db.add(active)
    row.payout_destination_id = int(destination.id)
    row.accepted_by_user_id = int(beneficiary_user_id)
    row.accepted_at = _now()
    row.status = "active"
    row.updated_at = _now()
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def revoke_payout_mandate(
    db: Session,
    *,
    mandate_id: int,
    actor_user_id: int,
) -> CommunityAdvertisingPayoutMandate:
    row = db.get(CommunityAdvertisingPayoutMandate, int(mandate_id))
    if row is None:
        raise AdvertisingRevenueError("mandate_not_found", "Payout appointment not found.")
    if row.status != "revoked":
        row.status = "revoked"
        row.revoked_at = _now()
        row.revoked_by_user_id = int(actor_user_id)
        row.updated_at = _now()
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def _payout_destination_block_reason(
    destination: UserPayoutDestination,
    *,
    currency: str,
) -> Optional[str]:
    status = str(destination.verification_status or "").strip().lower()
    if not status.startswith("phone_verified_bank_recorded"):
        return "phone_verified_bank_details_required"
    bank_name = str(destination.bank_name or "").strip().lower()
    destination_name = str(destination.destination_name or "").strip().lower()
    account = "".join(character for character in str(destination.account_number or "") if character.isalnum())
    if (
        len(account) < 6
        or not account.strip("0")
        or not bank_name
        or bank_name.startswith("pending")
        or not destination_name
        or destination_name.startswith("pending")
    ):
        return "complete_non_placeholder_bank_details_required"
    destination_currency = _currency(destination.currency) if destination.currency else None
    if destination_currency != _currency(currency):
        return "payout_destination_currency_mismatch"
    return None


def _destination_snapshot(destination: UserPayoutDestination) -> dict[str, Any]:
    return {
        "destination_name": destination.destination_name,
        "bank_name": destination.bank_name,
        "account_number": destination.account_number,
        "country": destination.country,
        "currency": destination.currency,
        "verification_status": destination.verification_status,
        "verification_note": destination.verification_note,
        "provider_bank_account_verified": False,
    }


def prepare_community_payout(
    db: Session,
    *,
    clan_id: int,
    currency: str,
    actor_user_id: int,
    idempotency_key: str,
) -> AdvertisingCommunityPayout:
    key = str(idempotency_key or "").strip()
    if len(key) < 8:
        raise AdvertisingRevenueError("idempotency_key_required", "A stable payout preparation key is required.")
    existing = (
        db.query(AdvertisingCommunityPayout)
        .filter(AdvertisingCommunityPayout.idempotency_key == key)
        .one_or_none()
    )
    if existing is not None:
        return existing
    mandate = _active_mandate(db, int(clan_id))
    if mandate is None or mandate.payout_destination_id is None:
        raise AdvertisingRevenueError(
            "active_payout_mandate_required",
            "The community needs an accepted beneficiary and recorded payout account first.",
        )
    destination = db.get(UserPayoutDestination, int(mandate.payout_destination_id))
    if destination is None or int(destination.user_id) != int(mandate.beneficiary_user_id):
        raise AdvertisingRevenueError("payout_destination_mismatch", "The beneficiary payout account is no longer valid.")
    selected_currency = _currency(currency)
    destination_block = _payout_destination_block_reason(
        destination,
        currency=selected_currency,
    )
    if destination_block is not None:
        raise AdvertisingRevenueError(
            "payout_destination_not_ready",
            "Complete phone verification and non-placeholder bank details in the same payout currency before preparing payment.",
        )
    earnings = (
        db.query(AdvertisingCommunityEarning)
        .filter(AdvertisingCommunityEarning.clan_id == int(clan_id))
        .filter(AdvertisingCommunityEarning.currency == selected_currency)
        .filter(AdvertisingCommunityEarning.status == "accrued")
        .filter(AdvertisingCommunityEarning.payout_id.is_(None))
        .order_by(AdvertisingCommunityEarning.id.asc())
        .all()
    )
    earnings = [row for row in earnings if _money(row.amount) > Decimal("0.00")]
    if not earnings:
        raise AdvertisingRevenueError("no_accrued_earnings", "No finalized community advertising earnings are ready.")
    amount = sum((_money(row.amount) for row in earnings), Decimal("0.00")).quantize(MONEY_QUANT)
    reference = f"GSN-ADPAY-C{int(clan_id)}-{_now().strftime('%Y%m%d%H%M%S')}"
    payout = AdvertisingCommunityPayout(
        clan_id=int(clan_id),
        mandate_id=int(mandate.id),
        beneficiary_user_id=int(mandate.beneficiary_user_id),
        payout_destination_id=int(destination.id),
        currency=selected_currency,
        amount=amount,
        reference=reference,
        status="prepared",
        destination_snapshot_json=json.dumps(_destination_snapshot(destination), ensure_ascii=False, sort_keys=True),
        earning_count=len(earnings),
        idempotency_key=key,
        prepared_by_user_id=int(actor_user_id),
    )
    db.add(payout)
    db.flush()
    for earning in earnings:
        earning.mandate_id = int(mandate.id)
        earning.beneficiary_user_id = int(mandate.beneficiary_user_id)
        earning.payout_destination_id = int(destination.id)
        earning.payout_id = int(payout.id)
        earning.status = "payout_prepared"
        earning.updated_at = _now()
        db.add(earning)
    db.commit()
    db.refresh(payout)
    return payout


def record_community_payout_paid(
    db: Session,
    *,
    payout_id: int,
    actor_user_id: int,
    external_transaction_reference: str,
) -> AdvertisingCommunityPayout:
    payout = db.get(AdvertisingCommunityPayout, int(payout_id))
    if payout is None:
        raise AdvertisingRevenueError("payout_not_found", "Advertising payout instruction not found.")
    if payout.status == "paid_recorded":
        return payout
    if payout.status != "prepared":
        raise AdvertisingRevenueError("payout_not_prepared", "Only a prepared payout can be marked paid.")
    external_ref = str(external_transaction_reference or "").strip()
    if len(external_ref) < 4:
        raise AdvertisingRevenueError(
            "external_transaction_reference_required",
            "Record the real bank or provider transaction reference.",
        )
    payout.status = "paid_recorded"
    payout.external_transaction_reference = external_ref
    payout.paid_recorded_by_user_id = int(actor_user_id)
    payout.paid_recorded_at = _now()
    payout.updated_at = _now()
    db.add(payout)
    for earning in (
        db.query(AdvertisingCommunityEarning)
        .filter(AdvertisingCommunityEarning.payout_id == int(payout.id))
        .all()
    ):
        earning.status = "paid_recorded"
        earning.updated_at = _now()
        db.add(earning)
    db.commit()
    db.refresh(payout)
    return payout


def settlement_payload(row: AdvertisingCampaignSettlement) -> dict[str, Any]:
    return {
        "id": int(row.id),
        "campaign_id": int(row.campaign_id),
        "payer_user_id": int(row.payer_user_id) if row.payer_user_id is not None else None,
        "expected_payment_id": int(row.expected_payment_id) if row.expected_payment_id is not None else None,
        "bank_event_id": int(row.bank_event_id) if row.bank_event_id is not None else None,
        "currency": row.currency,
        "gross_received_amount": str(_money(row.gross_received_amount)),
        "tax_amount": str(_money(row.tax_amount)),
        "refund_amount": str(_money(row.refund_amount)),
        "chargeback_amount": str(_money(row.chargeback_amount)),
        "processing_fee_amount": str(_money(row.processing_fee_amount)),
        "delivery_cost_amount": str(_money(row.delivery_cost_amount)),
        "distributable_net_amount": str(_money(row.distributable_net_amount)),
        "community_pool_bps": int(row.community_pool_bps),
        "community_pool_percent": f"{(Decimal(int(row.community_pool_bps)) / Decimal(100)):.2f}",
        "community_pool_amount": str(_money(row.community_pool_amount)),
        "status": row.status,
        "payment_reference": row.payment_reference,
        "confirmed_at": row.confirmed_at.isoformat() if row.confirmed_at else None,
        "delivery_finalized_at": row.delivery_finalized_at.isoformat() if row.delivery_finalized_at else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "boundary": ACCOUNTING_BOUNDARY,
    }


def mandate_payload(row: Optional[CommunityAdvertisingPayoutMandate]) -> Optional[dict[str, Any]]:
    if row is None:
        return None
    return {
        "id": int(row.id),
        "clan_id": int(row.clan_id),
        "beneficiary_user_id": int(row.beneficiary_user_id),
        "payout_destination_id": int(row.payout_destination_id) if row.payout_destination_id is not None else None,
        "appointed_by_user_id": int(row.appointed_by_user_id),
        "accepted_by_user_id": int(row.accepted_by_user_id) if row.accepted_by_user_id is not None else None,
        "status": row.status,
        "authority_note": row.authority_note,
        "accepted_at": row.accepted_at.isoformat() if row.accepted_at else None,
        "revoked_at": row.revoked_at.isoformat() if row.revoked_at else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "boundary": (
            "This appoints a payout beneficiary only. It grants no founder, operator, ownership, "
            "subscription-payer, advertising-consent, or community-governance rights."
        ),
    }


def earning_payload(row: AdvertisingCommunityEarning) -> dict[str, Any]:
    return {
        "id": int(row.id),
        "settlement_id": int(row.settlement_id),
        "campaign_id": int(row.campaign_id),
        "clan_id": int(row.clan_id),
        "qualifying_impressions": int(row.qualifying_impressions),
        "eligible_impressions_total": int(row.eligible_impressions_total),
        "amount": str(_money(row.amount)),
        "currency": row.currency,
        "eligibility_status": row.eligibility_status,
        "status": row.status,
        "mandate_id": int(row.mandate_id) if row.mandate_id is not None else None,
        "beneficiary_user_id": int(row.beneficiary_user_id) if row.beneficiary_user_id is not None else None,
        "payout_destination_id": int(row.payout_destination_id) if row.payout_destination_id is not None else None,
        "payout_id": int(row.payout_id) if row.payout_id is not None else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def payout_payload(row: AdvertisingCommunityPayout, *, expose_destination: bool = False) -> dict[str, Any]:
    snapshot = json.loads(row.destination_snapshot_json or "{}")
    account_number = str(snapshot.get("account_number") or "")
    destination = None
    if expose_destination:
        destination = snapshot
    elif snapshot:
        destination = {
            "destination_name": snapshot.get("destination_name"),
            "bank_name": snapshot.get("bank_name"),
            "account_number_last4": account_number[-4:] if account_number else None,
            "country": snapshot.get("country"),
            "currency": snapshot.get("currency"),
            "provider_bank_account_verified": False,
        }
    return {
        "id": int(row.id),
        "clan_id": int(row.clan_id),
        "mandate_id": int(row.mandate_id),
        "beneficiary_user_id": int(row.beneficiary_user_id),
        "currency": row.currency,
        "amount": str(_money(row.amount)),
        "reference": row.reference,
        "status": row.status,
        "earning_count": int(row.earning_count),
        "destination": destination,
        "external_transaction_reference": row.external_transaction_reference,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "paid_recorded_at": row.paid_recorded_at.isoformat() if row.paid_recorded_at else None,
        "boundary": (
            "Prepared means ready for a controlled manual transfer; paid_recorded requires an "
            "external bank/provider transaction reference but is not provider-verified by GSN."
        ),
    }


def community_statement(db: Session, *, clan_id: int) -> dict[str, Any]:
    earnings = (
        db.query(AdvertisingCommunityEarning)
        .filter(AdvertisingCommunityEarning.clan_id == int(clan_id))
        .order_by(AdvertisingCommunityEarning.created_at.desc(), AdvertisingCommunityEarning.id.desc())
        .all()
    )
    payouts = (
        db.query(AdvertisingCommunityPayout)
        .filter(AdvertisingCommunityPayout.clan_id == int(clan_id))
        .order_by(AdvertisingCommunityPayout.created_at.desc(), AdvertisingCommunityPayout.id.desc())
        .all()
    )
    totals: dict[str, dict[str, Decimal]] = {}
    for row in earnings:
        bucket = totals.setdefault(
            row.currency,
            {"earned": Decimal("0.00"), "prepared": Decimal("0.00"), "paid_recorded": Decimal("0.00")},
        )
        amount = _money(row.amount)
        if row.status in {"accrued", "payout_prepared", "paid_recorded"}:
            bucket["earned"] += amount
        if row.status == "payout_prepared":
            bucket["prepared"] += amount
        if row.status == "paid_recorded":
            bucket["paid_recorded"] += amount
    return {
        "clan_id": int(clan_id),
        "policy": {
            "community_share_bps": community_share_bps(),
            "community_share_percent": f"{(Decimal(community_share_bps()) / Decimal(100)):.2f}",
            "basis": "distributable_net_advertising_revenue",
            "general_overhead_deducted": False,
        },
        "mandate": mandate_payload(_active_mandate(db, int(clan_id))),
        "totals": {
            currency: {name: str(value.quantize(MONEY_QUANT)) for name, value in values.items()}
            for currency, values in totals.items()
        },
        "earnings": [earning_payload(row) for row in earnings],
        "payouts": [payout_payload(row) for row in payouts],
        "boundary": ACCOUNTING_BOUNDARY,
    }
