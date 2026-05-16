from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

os.environ.setdefault("GMFN_DEV_MODE", "1")

from app.core.security import get_password_hash
from app.db.database import SessionLocal
from app.db.bank_models import ExpectedPayment
from app.db.models import (
    Clan,
    ClanMembership,
    FeatureEntitlement,
    MarketplaceShop,
    TrustEvent,
    TrustSlip,
    User,
)
from app.services.trust_score_service import apply_trust_score
from app.services.trust_slips_services import get_trust_slip_payload, store_trust_slip_snapshot


WORKSHOP_EMAIL = "amara.demo@gsnworkshop.co.uk"
WORKSHOP_PASSWORD = "pass1234"
WORKSHOP_PHONE = "+447700900123"
WORKSHOP_GMFN_ID = "GSN-DEMO-AMARA"
WORKSHOP_SLIP_CODE = "GSNAMARA2026"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _meta(**values: Any) -> str:
    return json.dumps(values, sort_keys=True)


def _upsert_user(
    db,
    *,
    email: str,
    password: str,
    display_name: str,
    gmfn_id: str,
    phone_e164: str,
    role: str = "user",
) -> User:
    user = (
        db.query(User)
        .filter(
            (User.email == email)
            | (User.phone_e164 == phone_e164)
            | (User.gmfn_id == gmfn_id)
        )
        .first()
    )
    if user is None:
        user = User(
            email=email,
            hashed_password=get_password_hash(password),
            display_name=display_name,
            gmfn_id=gmfn_id,
            phone_e164=phone_e164,
            phone_verified_at=_now(),
            role=role,
            personal_pool_balance=Decimal("125000.00"),
            merchant_visibility_level="standard",
        )
        db.add(user)
    else:
        user.email = email
        user.hashed_password = get_password_hash(password)
        user.display_name = display_name
        user.gmfn_id = gmfn_id
        user.phone_e164 = phone_e164
        user.phone_verified_at = user.phone_verified_at or _now()
        user.role = role
        user.personal_pool_balance = Decimal("125000.00")
        user.merchant_visibility_level = "standard"
        db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _upsert_clan(
    db,
    *,
    name: str,
    code: str,
    marketplace_name: str,
    created_by_user_id: int,
    description: str,
) -> Clan:
    clan = db.query(Clan).filter(Clan.name == name).first()
    if clan is None:
        clan = Clan(
            name=name,
            description=description,
            marketplace_name=marketplace_name,
            marketplace_description=description,
            community_code=code,
            created_by_user_id=created_by_user_id,
            status="active",
            invite_code=f"{code}-INVITE",
            invite_created_at=_now(),
            invite_expires_at=_now() + timedelta(days=90),
            invite_max_uses=50,
            invite_uses=0,
        )
        db.add(clan)
    else:
        clan.description = description
        clan.marketplace_name = marketplace_name
        clan.marketplace_description = description
        clan.community_code = code
        clan.created_by_user_id = created_by_user_id
        clan.status = "active"
        clan.closed_at = None
        clan.closed_reason = None
        clan.invite_code = clan.invite_code or f"{code}-INVITE"
        clan.invite_created_at = clan.invite_created_at or _now()
        clan.invite_expires_at = clan.invite_expires_at or (_now() + timedelta(days=90))
        clan.invite_max_uses = clan.invite_max_uses or 50
        db.add(clan)
    db.commit()
    db.refresh(clan)
    return clan


def _ensure_membership(
    db,
    *,
    clan_id: int,
    user_id: int,
    role: str = "user",
    invited_by_user_id: int | None = None,
) -> ClanMembership:
    membership = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == clan_id, ClanMembership.user_id == user_id)
        .first()
    )
    if membership is None:
        membership = ClanMembership(
            clan_id=clan_id,
            user_id=user_id,
            role=role,
            invited_by_user_id=invited_by_user_id,
            personal_pool_balance=Decimal("45000.00"),
            left_at=None,
        )
        db.add(membership)
    else:
        membership.role = role
        membership.invited_by_user_id = invited_by_user_id
        membership.personal_pool_balance = Decimal("45000.00")
        membership.left_at = None
        db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership


def _ensure_event(
    db,
    *,
    dedupe_key: str,
    event_type: str,
    actor_user_id: int,
    subject_user_id: int,
    clan_id: int | None,
    meta: dict[str, Any],
    created_at: datetime,
) -> TrustEvent:
    event = db.query(TrustEvent).filter(TrustEvent.dedupe_key == dedupe_key).first()
    if event is None:
        event = TrustEvent(
            event_type=event_type,
            actor_user_id=actor_user_id,
            subject_user_id=subject_user_id,
            clan_id=clan_id,
            loan_id=0,
            guarantor_id=None,
            meta_json=_meta(**meta),
            dedupe_key=dedupe_key,
            created_at=created_at,
        )
        db.add(event)
    else:
        event.event_type = event_type
        event.actor_user_id = actor_user_id
        event.subject_user_id = subject_user_id
        event.clan_id = clan_id
        event.meta_json = _meta(**meta)
        event.created_at = created_at
        db.add(event)
    db.commit()
    db.refresh(event)
    return event


def _ensure_expected_payment(
    db,
    *,
    clan_id: int,
    user_id: int,
    expected_type: str,
    reference_display: str,
    amount: Decimal,
    paid_amount: Decimal,
    status: str,
    due_at: datetime,
    status_reason: str | None = None,
) -> ExpectedPayment:
    row = (
        db.query(ExpectedPayment)
        .filter(
            ExpectedPayment.clan_id == int(clan_id),
            ExpectedPayment.reference_display == reference_display,
        )
        .first()
    )
    remaining_amount = amount - paid_amount
    if remaining_amount < Decimal("0.00"):
        remaining_amount = Decimal("0.00")
    if row is None:
        row = ExpectedPayment(
            clan_id=int(clan_id),
            user_id=int(user_id),
            expected_type=expected_type,
            amount=amount,
            currency="NGN",
            paid_amount=paid_amount,
            remaining_amount=remaining_amount,
            due_at=due_at,
            reference_display=reference_display,
            reference_normalized=reference_display.upper(),
            status=status,
            status_reason=status_reason,
            bank_event_id=None,
            trust_event_id=None,
            meta_json=_meta(workshop_demo=True, source="seed_workshop_demo"),
        )
        db.add(row)
    else:
        row.user_id = int(user_id)
        row.expected_type = expected_type
        row.amount = amount
        row.currency = "NGN"
        row.paid_amount = paid_amount
        row.remaining_amount = remaining_amount
        row.due_at = due_at
        row.status = status
        row.status_reason = status_reason
        row.meta_json = _meta(workshop_demo=True, source="seed_workshop_demo")
        db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _ensure_entitlement(db, *, user_id: int, clan_id: int, shop_id: int | None) -> FeatureEntitlement:
    payment_reference = "WORKSHOP-MERCHANT-VERIFY-AMARA-2026"
    entitlement = (
        db.query(FeatureEntitlement)
        .filter(
            FeatureEntitlement.feature_code == "merchant_verify",
            FeatureEntitlement.payment_reference == payment_reference,
        )
        .first()
    )
    if entitlement is None:
        entitlement = FeatureEntitlement(
            owner_user_id=user_id,
            clan_id=clan_id,
            shop_id=shop_id,
            feature_code="merchant_verify",
            plan_code="merchant_verify_year",
            quantity_total=1,
            quantity_used=0,
            status="active",
            starts_at=_now() - timedelta(days=1),
            expires_at=_now() + timedelta(days=365),
            payment_reference=payment_reference,
        )
        db.add(entitlement)
    else:
        entitlement.owner_user_id = user_id
        entitlement.clan_id = clan_id
        entitlement.shop_id = shop_id
        entitlement.status = "active"
        entitlement.starts_at = _now() - timedelta(days=1)
        entitlement.expires_at = _now() + timedelta(days=365)
        db.add(entitlement)
    db.commit()
    db.refresh(entitlement)
    return entitlement


def _ensure_shop(db, *, user_id: int, clan_id: int) -> MarketplaceShop:
    shop = db.query(MarketplaceShop).filter(MarketplaceShop.owner_user_id == user_id).first()
    if shop is None:
        shop = MarketplaceShop(
            owner_user_id=user_id,
            clan_id=clan_id,
            name="Amara Fresh Foods",
            description=(
                "Workshop demo shop showing how community contribution, trade activity, "
                "and support history become part of a portable trust story."
            ),
            whatsapp_number=WORKSHOP_PHONE,
            telegram_handle="@amara_gsn_demo",
            is_active=True,
        )
        db.add(shop)
    else:
        shop.clan_id = clan_id
        shop.name = "Amara Fresh Foods"
        shop.description = (
            "Workshop demo shop showing how community contribution, trade activity, "
            "and support history become part of a portable trust story."
        )
        shop.whatsapp_number = WORKSHOP_PHONE
        shop.telegram_handle = "@amara_gsn_demo"
        shop.is_active = True
        db.add(shop)
    db.commit()
    db.refresh(shop)
    return shop


def _ensure_trust_slip(db, *, user_id: int, clan_id: int) -> TrustSlip:
    db.query(TrustSlip).filter(TrustSlip.holder_user_id == user_id).update(
        {TrustSlip.is_current: False},
        synchronize_session=False,
    )
    db.commit()

    slip = db.query(TrustSlip).filter(TrustSlip.code == WORKSHOP_SLIP_CODE).first()
    if slip is None:
        slip = TrustSlip(
            code=WORKSHOP_SLIP_CODE,
            clan_id=clan_id,
            holder_user_id=user_id,
            trust_limit=Decimal("25000.00"),
            currency="NGN",
            status="active",
            expires_at=_now() + timedelta(days=30),
            created_at=_now(),
            last_verified_at=_now(),
            last_release_at=_now() - timedelta(days=14),
            is_current=True,
            issued_reason="workshop_demo_seed",
        )
        db.add(slip)
    else:
        slip.clan_id = clan_id
        slip.holder_user_id = user_id
        slip.trust_limit = Decimal("25000.00")
        slip.currency = "NGN"
        slip.status = "active"
        slip.expires_at = _now() + timedelta(days=30)
        slip.last_verified_at = _now()
        slip.last_release_at = _now() - timedelta(days=14)
        slip.is_current = True
        slip.issued_reason = "workshop_demo_seed"
        db.add(slip)
    db.commit()
    db.refresh(slip)

    payload = get_trust_slip_payload(db, user_id=user_id)
    store_trust_slip_snapshot(db, slip=slip, full_payload=payload, visibility_level="standard")
    db.refresh(slip)
    return slip


def seed_workshop_demo() -> dict[str, Any]:
    db = SessionLocal()
    try:
        sponsor_lagos = _upsert_user(
            db,
            email="lagos.sponsor@gsnworkshop.co.uk",
            password=WORKSHOP_PASSWORD,
            display_name="Lagos Circle Sponsor",
            gmfn_id="GSN-DEMO-LAGOS-SPONSOR",
            phone_e164="+2348000000101",
            role="user",
        )
        sponsor_aberdeen = _upsert_user(
            db,
            email="aberdeen.sponsor@gsnworkshop.co.uk",
            password=WORKSHOP_PASSWORD,
            display_name="Aberdeen Society Sponsor",
            gmfn_id="GSN-DEMO-ABERDEEN-SPONSOR",
            phone_e164="+447700900124",
            role="user",
        )
        amara = _upsert_user(
            db,
            email=WORKSHOP_EMAIL,
            password=WORKSHOP_PASSWORD,
            display_name="Amara Okafor",
            gmfn_id=WORKSHOP_GMFN_ID,
            phone_e164=WORKSHOP_PHONE,
            role="user",
        )

        lagos = _upsert_clan(
            db,
            name="GSN Lagos Trusted Circle - Demo",
            code="GSN-LAGOS-DEMO",
            marketplace_name="Lagos Trusted Circle Market",
            created_by_user_id=int(sponsor_lagos.id),
            description="Demo origin community where Amara builds her community-backed trust record.",
        )
        aberdeen = _upsert_clan(
            db,
            name="RGU Aberdeen Nigerian Society - Demo",
            code="GSN-RGU-ABERDEEN-DEMO",
            marketplace_name="RGU Nigerian Society Support Market",
            created_by_user_id=int(sponsor_aberdeen.id),
            description="Demo destination community where Amara needs her trust story to travel.",
        )

        _ensure_membership(db, clan_id=int(lagos.id), user_id=int(sponsor_lagos.id), role="admin")
        _ensure_membership(db, clan_id=int(aberdeen.id), user_id=int(sponsor_aberdeen.id), role="admin")
        _ensure_membership(
            db,
            clan_id=int(lagos.id),
            user_id=int(amara.id),
            role="merchant",
            invited_by_user_id=int(sponsor_lagos.id),
        )
        _ensure_membership(
            db,
            clan_id=int(aberdeen.id),
            user_id=int(amara.id),
            role="user",
            invited_by_user_id=int(sponsor_aberdeen.id),
        )

        base_time = _now() - timedelta(days=45)
        identity_events = [
            ("identity.phone_verified", "phone verified"),
            ("identity.bank_destination_recorded", "bank destination recorded"),
            ("identity.drivers_licence_recorded", "drivers licence recorded"),
            ("identity.region_consistent", "region consistent"),
        ]
        for index, (event_type, reason) in enumerate(identity_events):
            _ensure_event(
                db,
                dedupe_key=f"workshop-amara-{event_type}",
                event_type=event_type,
                actor_user_id=int(amara.id),
                subject_user_id=int(amara.id),
                clan_id=int(lagos.id),
                created_at=base_time + timedelta(days=index),
                meta={
                    "policy": "trust_constitution_v1",
                    "reason": reason,
                    "workshop_demo": True,
                },
            )

        for sponsor, clan, label in [
            (sponsor_lagos, lagos, "lagos"),
            (sponsor_aberdeen, aberdeen, "aberdeen"),
        ]:
            _ensure_event(
                db,
                dedupe_key=f"workshop-amara-{label}-joined-via-invite",
                event_type="joined_via_invite",
                actor_user_id=int(sponsor.id),
                subject_user_id=int(amara.id),
                clan_id=int(clan.id),
                created_at=base_time + timedelta(days=5),
                meta={
                    "inviter_user_id": int(sponsor.id),
                    "joiner_user_id": int(amara.id),
                    "reason": "community-backed onboarding",
                    "workshop_demo": True,
                },
            )
            _ensure_event(
                db,
                dedupe_key=f"workshop-amara-{label}-guarantee-approved",
                event_type="guarantee_approved",
                actor_user_id=int(sponsor.id),
                subject_user_id=int(amara.id),
                clan_id=int(clan.id),
                created_at=base_time + timedelta(days=8),
                meta={
                    "guarantor_user_id": int(sponsor.id),
                    "borrower_user_id": int(amara.id),
                    "reason": "trusted member support",
                    "workshop_demo": True,
                },
            )
            _ensure_event(
                db,
                dedupe_key=f"workshop-amara-{label}-loan-repaid",
                event_type="loan.repaid",
                actor_user_id=int(amara.id),
                subject_user_id=int(amara.id),
                clan_id=int(clan.id),
                created_at=base_time + timedelta(days=15),
                meta={
                    "borrower_user_id": int(amara.id),
                    "guarantor_user_id": int(sponsor.id),
                    "payment_reference": f"WORKSHOP-{label.upper()}-REPAID",
                    "reason": "support repaid successfully",
                    "workshop_demo": True,
                },
            )

        for index in range(45):
            _ensure_event(
                db,
                dedupe_key=f"workshop-amara-full-repayment-{index + 1}",
                event_type="loan_fully_repaid",
                actor_user_id=int(amara.id),
                subject_user_id=int(amara.id),
                clan_id=int(lagos.id if index % 2 == 0 else aberdeen.id),
                created_at=base_time + timedelta(days=18, hours=index),
                meta={
                    "borrower_user_id": int(amara.id),
                    "payment_reference": f"WORKSHOP-AMARA-FULL-{index + 1:03d}",
                    "reason": "workshop demo repayment history",
                    "workshop_demo": True,
                },
            )

        commitment_events = [
            (
                "commitment.created",
                "workshop-amara-commitment-stock-created",
                "Created a personal stock-building commitment",
                0,
                Decimal("0.00"),
            ),
            (
                "commitment.checkin",
                "workshop-amara-commitment-stock-checkin",
                "Checked in on stock-building progress",
                7,
                Decimal("35000.00"),
            ),
            (
                "commitment.milestone",
                "workshop-amara-commitment-stock-milestone",
                "Reached a visible stock-building milestone",
                14,
                Decimal("70000.00"),
            ),
            (
                "commitment.completed",
                "workshop-amara-commitment-stock-completed",
                "Completed the personal stock-building commitment",
                21,
                Decimal("100000.00"),
            ),
        ]
        for event_type, dedupe_key, reason, day_offset, progress_value in commitment_events:
            _ensure_event(
                db,
                dedupe_key=dedupe_key,
                event_type=event_type,
                actor_user_id=int(amara.id),
                subject_user_id=int(amara.id),
                clan_id=int(lagos.id),
                created_at=base_time + timedelta(days=day_offset),
                meta={
                    "policy": "GMFN_PROTOCOL_v1",
                    "reason": reason,
                    "note": reason,
                    "trust_delta": "0.00",
                    "system": False,
                    "source": "dashboard_focus_commitment",
                    "local_commitment_id": "workshop-amara-stock-commitment",
                    "local_event_id": dedupe_key,
                    "title": "Build reliable shop stock before Aberdeen move",
                    "category": "business",
                    "target_value": "100000.00",
                    "current_value": str(progress_value),
                    "progress_value": str(progress_value),
                    "unit": "NGN",
                    "due_date": (base_time + timedelta(days=21)).date().isoformat(),
                    "cadence": "weekly",
                    "reader_note": (
                        "This is a personal commitment event recorded by the member. "
                        "It supports follow-through evidence, but it is not the same as a verified payment."
                    ),
                    "workshop_demo": True,
                },
            )

        _ensure_expected_payment(
            db,
            clan_id=int(lagos.id),
            user_id=int(amara.id),
            expected_type="contribution",
            reference_display="WORKSHOP-AMARA-CONTRIBUTION-001",
            amount=Decimal("15000.00"),
            paid_amount=Decimal("15000.00"),
            status="confirmed",
            due_at=base_time + timedelta(days=6),
            status_reason="workshop_demo_confirmed",
        )
        _ensure_expected_payment(
            db,
            clan_id=int(lagos.id),
            user_id=int(amara.id),
            expected_type="contribution",
            reference_display="WORKSHOP-AMARA-CONTRIBUTION-002",
            amount=Decimal("15000.00"),
            paid_amount=Decimal("15000.00"),
            status="confirmed",
            due_at=base_time + timedelta(days=13),
            status_reason="workshop_demo_confirmed",
        )
        _ensure_expected_payment(
            db,
            clan_id=int(lagos.id),
            user_id=int(amara.id),
            expected_type="repayment",
            reference_display="WORKSHOP-AMARA-REPAYMENT-001",
            amount=Decimal("25000.00"),
            paid_amount=Decimal("25000.00"),
            status="confirmed",
            due_at=base_time + timedelta(days=20),
            status_reason="workshop_demo_confirmed",
        )

        shop = _ensure_shop(db, user_id=int(amara.id), clan_id=int(lagos.id))
        _ensure_entitlement(db, user_id=int(amara.id), clan_id=int(lagos.id), shop_id=int(shop.id))
        apply_trust_score(db, user_id=int(amara.id))
        slip = _ensure_trust_slip(db, user_id=int(amara.id), clan_id=int(lagos.id))

        return {
            "ok": True,
            "email": WORKSHOP_EMAIL,
            "password": WORKSHOP_PASSWORD,
            "gmfn_id": WORKSHOP_GMFN_ID,
            "trust_slip_code": slip.code,
            "trust_limit": str(slip.trust_limit),
            "expires_at": slip.expires_at.isoformat() if slip.expires_at else None,
            "public_verify_path": f"/trust-slips/verify/{slip.code}/page",
            "merchant_link_endpoint": "/trust-slips/me/merchant-link",
        }
    finally:
        db.close()


if __name__ == "__main__":
    print(json.dumps(seed_workshop_demo(), indent=2, sort_keys=True))
