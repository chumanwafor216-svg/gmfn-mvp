from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy import event

from app.db.database import SessionLocal, engine
from app.db.models import (
    ClanMembership,
    CommunityMemberVerification,
    EvidenceLifecycleMarker,
    MarketplaceProduct,
    MarketplaceShop,
    ProtectedTradeRecord,
    TrustEvent,
    TrustSlip,
    User,
)
from app.services.trust_slip_v1_evidence import collect_trust_slip_v1_evidence


NOW = datetime(2026, 10, 31, 12, 0, tzinfo=timezone.utc)


def _create_slip(db, *, holder_user_id: int = 1, code: str = "V1-EVIDENCE") -> TrustSlip:
    slip = TrustSlip(
        code=code,
        clan_id=1,
        holder_user_id=holder_user_id,
        trust_limit=Decimal("0.00"),
        currency="NGN",
        status="active",
        expires_at=NOW + timedelta(days=7),
        created_at=NOW,
        is_current=True,
        snapshot_json=json.dumps({"snapshot_version": "trustslip-snapshot/v2", "immutable": True}),
        snapshot_version="trustslip-snapshot/v2",
        snapshot_checksum="legacy-test-checksum",
    )
    db.add(slip)
    db.flush()
    return slip


def _add_member(db, user_id: int) -> None:
    db.add(User(id=user_id, email=f"member{user_id}@example.com", hashed_password="hashed", role="user"))
    db.add(
        ClanMembership(
            clan_id=1,
            user_id=user_id,
            role="user",
            personal_pool_balance=Decimal("0.00"),
            created_at=NOW,
        )
    )
    db.flush()


def test_evidence_adapter_rejects_holder_mismatch_and_unsupported_purpose(seed_clan_admin_membership):
    db = SessionLocal()
    try:
        slip = _create_slip(db)

        with pytest.raises(ValueError, match="trust_slip_holder_mismatch"):
            collect_trust_slip_v1_evidence(
                db,
                slip=slip,
                holder_user_id=2,
                purpose="general",
                as_of=NOW,
            )

        with pytest.raises(ValueError, match="unsupported_trust_slip_v1_purpose"):
            collect_trust_slip_v1_evidence(
                db,
                slip=slip,
                holder_user_id=1,
                purpose="opportunity_review",
                as_of=NOW,
            )

        with pytest.raises(ValueError, match="identity_evidence_subject_unverified"):
            collect_trust_slip_v1_evidence(
                db,
                slip=slip,
                holder_user_id=1,
                purpose="general",
                identity_payload={"identity_context": {"official_id_recorded": True}},
                identity_subject_user_id=2,
                as_of=NOW,
            )
    finally:
        db.close()


def test_evidence_adapter_isolates_holder_activity_and_does_not_emit_private_fields(
    seed_clan_admin_membership,
    seed_user2_member_membership,
):
    db = SessionLocal()
    try:
        slip = _create_slip(db)
        for user_id in (3, 4, 5):
            _add_member(db, user_id)
            db.add(
                CommunityMemberVerification(
                    clan_id=1,
                    subject_user_id=2,
                    verifier_user_id=user_id,
                    status="active",
                    verification_year=2026,
                    verification_note=f"user-two-private-witness-{user_id}",
                    created_at=NOW,
                    updated_at=NOW,
                )
            )
        db.add_all(
            [
                TrustEvent(
                    event_type="community.joined",
                    clan_id=1,
                    actor_user_id=1,
                    subject_user_id=1,
                    meta_json=json.dumps({"private_note": "holder-one-private"}),
                    created_at=NOW,
                ),
                TrustEvent(
                    event_type="dispute.opened",
                    clan_id=1,
                    actor_user_id=2,
                    subject_user_id=2,
                    meta_json=json.dumps({"private_note": "holder-two-secret"}),
                    created_at=NOW,
                ),
                TrustEvent(
                    event_type="commitment.completed",
                    clan_id=1,
                    actor_user_id=2,
                    subject_user_id=2,
                    meta_json=json.dumps({"private_note": "user-two-commitment-secret"}),
                    created_at=NOW,
                ),
            ]
        )
        db.flush()

        bundle = collect_trust_slip_v1_evidence(
            db,
            slip=slip,
            holder_user_id=1,
            purpose="general",
            identity_payload={
                "member_name": "Private Holder Name",
                "gmfn_id": "GSN-U-PRIVATE",
                "identity_context": {
                    "official_id_recorded": True,
                    "official_id_verified": True,
                },
            },
            identity_subject_user_id=1,
            as_of=NOW,
        )

        encoded = json.dumps(bundle)
        family_keys = {row["family"] for row in bundle["activity"]["families"]}
        assert bundle["activity"]["sample_count"] == 1
        assert "focus_commitment" not in family_keys
        assert bundle["adverse_or_caution"]["adverse_event_present"] is False
        assert bundle["witnesses"]["public_count"]["exact_count"] is None
        assert bundle["witnesses"]["response_breakdown_suppressed"] is True
        assert bundle["identity"]["recorded"]["official_id"] is True
        assert bundle["identity"]["verification_records"]["official_id"] is True
        assert bundle["identity"]["independently_verified"] is False
        assert "holder-one-private" not in encoded
        assert "holder-two-secret" not in encoded
        assert "user-two-commitment-secret" not in encoded
        assert "user-two-private-witness" not in encoded
        assert "Private Holder Name" not in encoded
        assert "GSN-U-PRIVATE" not in encoded
    finally:
        db.close()


def test_witness_counts_and_breakdowns_are_suppressed_below_three(seed_clan_admin_membership):
    db = SessionLocal()
    try:
        slip = _create_slip(db)
        for user_id in (2, 3):
            _add_member(db, user_id)
            db.add(
                CommunityMemberVerification(
                    clan_id=1,
                    subject_user_id=1,
                    verifier_user_id=user_id,
                    status="active",
                    verification_year=2026,
                    verification_note=f"private witness note {user_id}",
                    created_at=NOW,
                    updated_at=NOW,
                )
            )
        db.flush()

        suppressed = collect_trust_slip_v1_evidence(
            db,
            slip=slip,
            holder_user_id=1,
            purpose="general",
            as_of=NOW,
        )

        assert suppressed["witnesses"]["public_count"] == {
            "exact_count": None,
            "count_band": "fewer_than_3",
            "suppressed": True,
        }
        assert suppressed["witnesses"]["response_presence"] == {
            "favourable": None,
            "caution": None,
            "adverse": None,
        }
        assert "private witness note" not in json.dumps(suppressed)

        _add_member(db, 4)
        db.add(
            CommunityMemberVerification(
                clan_id=1,
                subject_user_id=1,
                verifier_user_id=4,
                status="active",
                verification_year=2026,
                created_at=NOW,
                updated_at=NOW,
            )
        )
        db.flush()
        visible = collect_trust_slip_v1_evidence(
            db,
            slip=slip,
            holder_user_id=1,
            purpose="general",
            as_of=NOW,
        )

        assert visible["witnesses"]["public_count"]["exact_count"] == 3
        assert visible["witnesses"]["public_count"]["suppressed"] is False
    finally:
        db.close()


def test_truncation_cannot_hide_old_adverse_evidence_or_allow_favourable_conclusion(
    seed_clan_admin_membership,
    seed_user2_member_membership,
):
    db = SessionLocal()
    statements: list[str] = []

    def count_selects(_conn, _cursor, statement, _parameters, _context, _executemany):
        if statement.lstrip().upper().startswith("SELECT"):
            statements.append(statement)

    try:
        slip = _create_slip(db)
        db.add(
            TrustEvent(
                event_type="dispute.opened",
                clan_id=1,
                actor_user_id=1,
                subject_user_id=1,
                created_at=NOW - timedelta(days=400),
            )
        )
        db.add(
            TrustEvent(
                event_type="dispute.under_review",
                clan_id=1,
                actor_user_id=1,
                subject_user_id=1,
                created_at=NOW - timedelta(days=399),
            )
        )
        db.add(
            ProtectedTradeRecord(
                trade_code="OLD-UNRESOLVED-BEYOND-CAP",
                clan_id=1,
                creator_user_id=1,
                seller_user_id=1,
                buyer_user_id=2,
                status="disputed",
                payment_status="claimed",
                release_status="not_requested",
                receipt_status="not_confirmed",
                dispute_status="under_review",
                currency="NGN",
                created_at=NOW - timedelta(days=398),
                updated_at=NOW - timedelta(days=398),
            )
        )
        db.bulk_save_objects(
            [
                TrustEvent(
                    event_type="community.joined",
                    clan_id=1,
                    actor_user_id=1,
                    subject_user_id=1,
                    created_at=NOW - timedelta(minutes=index),
                )
                for index in range(201)
            ]
        )
        db.flush()
        snapshot_before = slip.snapshot_json
        event.listen(engine, "before_cursor_execute", count_selects)

        bundle = collect_trust_slip_v1_evidence(
            db,
            slip=slip,
            holder_user_id=1,
            purpose="general",
            as_of=NOW,
        )

        assert bundle["activity"]["sample_count"] == 200
        assert bundle["activity"]["sample_truncated"] is True
        assert bundle["adverse_or_caution"]["adverse_event_present"] is True
        assert bundle["adverse_or_caution"]["unresolved_trade_dispute_present"] is True
        assert bundle["projection_safety"] == {
            "favourable_conclusion_allowed": False,
            "sufficiency_evaluated": False,
            "sample_truncated": True,
            "adverse_or_caution_present": True,
        }
        assert bundle["limitations"] == ["activity_sample_truncated_no_favourable_conclusion"]
        assert bundle["historical_snapshot_reconstruction"] is False
        assert slip.snapshot_json == snapshot_before
        assert len(statements) == 8
    finally:
        event.remove(engine, "before_cursor_execute", count_selects)
        db.close()


def test_current_lifecycle_facts_remain_separate_from_historical_snapshot(seed_clan_admin_membership):
    db = SessionLocal()
    try:
        slip = _create_slip(db)
        slip.status = "revoked"
        slip.expires_at = NOW - timedelta(days=1)
        slip.is_current = False
        slip.superseded_by_trust_slip_id = 999
        db.add(
            EvidenceLifecycleMarker(
                source_type="trust_slip",
                source_id=str(slip.id),
                marker_type="dispute",
                state="disputed",
                actor_user_id=1,
                created_at=NOW,
            )
        )
        db.flush()
        snapshot_before = slip.snapshot_json

        bundle = collect_trust_slip_v1_evidence(
            db,
            slip=slip,
            holder_user_id=1,
            purpose="general",
            as_of=NOW,
        )

        assert bundle["current_trust_slip_lifecycle"] == {
            "status_recorded": "revoked",
            "expired": True,
            "revoked": True,
            "frozen": False,
            "superseded": True,
            "disputed": True,
        }
        assert slip.snapshot_json == snapshot_before
    finally:
        db.close()


def test_shop_review_uses_only_holder_shop_and_offer_records(
    seed_clan_admin_membership,
    seed_user2_member_membership,
):
    db = SessionLocal()
    statements: list[str] = []

    def count_selects(_conn, _cursor, statement, _parameters, _context, _executemany):
        if statement.lstrip().upper().startswith("SELECT"):
            statements.append(statement)

    try:
        slip = _create_slip(db)
        holder_shop = MarketplaceShop(
            clan_id=1,
            owner_user_id=1,
            name="Holder Shop",
            description="holder private description",
            whatsapp_number="+234111111111",
            is_active=True,
            created_at=NOW,
        )
        other_shop = MarketplaceShop(
            clan_id=1,
            owner_user_id=2,
            name="Other Holder Shop",
            description="private description",
            whatsapp_number="+234000000000",
            is_active=True,
            created_at=NOW,
        )
        db.add_all([holder_shop, other_shop])
        db.flush()
        _add_member(db, 3)
        db.add_all(
            [
                MarketplaceProduct(
                    clan_id=1,
                    shop_id=holder_shop.id,
                    seller_user_id=1,
                    name="Holder Product",
                    description="holder product detail",
                    is_active=True,
                    created_at=NOW,
                ),
                MarketplaceProduct(
                clan_id=1,
                shop_id=other_shop.id,
                seller_user_id=2,
                name="Other Holder Product",
                description="private product detail",
                is_active=True,
                created_at=NOW,
                ),
                ProtectedTradeRecord(
                    trade_code="HOLDER-TRADE-ONE",
                    clan_id=1,
                    creator_user_id=1,
                    seller_user_id=1,
                    buyer_user_id=2,
                    status="closed",
                    payment_status="claimed",
                    release_status="released",
                    receipt_status="received",
                    dispute_status="none",
                    currency="NGN",
                    created_at=NOW,
                    updated_at=NOW,
                ),
                ProtectedTradeRecord(
                    trade_code="OTHER-HOLDER-TRADE",
                    clan_id=1,
                    creator_user_id=2,
                    seller_user_id=2,
                    buyer_user_id=3,
                    status="disputed",
                    payment_status="claimed",
                    release_status="not_requested",
                    receipt_status="not_confirmed",
                    dispute_status="opened",
                    currency="NGN",
                    created_at=NOW,
                    updated_at=NOW,
                ),
            ]
        )
        db.flush()
        event.listen(engine, "before_cursor_execute", count_selects)

        bundle = collect_trust_slip_v1_evidence(
            db,
            slip=slip,
            holder_user_id=1,
            purpose="shop_review",
            as_of=NOW,
        )

        assert bundle["shop"]["active_shop_recorded"] is True
        assert bundle["shop"]["active_offer_count"] == 1
        assert bundle["shop"]["trade_record_count"] == 1
        assert bundle["shop"]["completed_trade_record_count"] == 1
        assert bundle["shop"]["unresolved_trade_dispute_count"] == 0
        assert bundle["shop"]["counterparties"] == {
            "exact_count": None,
            "count_band": "fewer_than_3",
            "suppressed": True,
        }
        assert len(statements) == 12
        encoded = json.dumps(bundle)
        assert "Holder Shop" not in encoded
        assert "Holder Product" not in encoded
        assert "+234111111111" not in encoded
        assert "Other Holder Shop" not in encoded
        assert "Other Holder Product" not in encoded
        assert "+234000000000" not in encoded
        assert "HOLDER-TRADE-ONE" not in encoded
        assert "OTHER-HOLDER-TRADE" not in encoded
    finally:
        event.remove(engine, "before_cursor_execute", count_selects)
        db.close()
