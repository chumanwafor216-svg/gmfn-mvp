from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.db.database import SessionLocal
from app.db.models import Clan, ClanMembership, CommunityConfirmationDecision, CommunityConfirmationOutcome, CommunityConfirmationRequest, CommunityConfirmationResponse, CommunityConfirmationReviewCase, Loan, LoanGuarantor, MarketplaceProduct, MarketplaceShop, PoolEvent, ProtectedTradeRecord, Repayment, TrustEvent, TrustSlip, TrustSlipDecisionPackAccess, TrustSlipDecisionPackConsentShare, User


def _create_trust_slip(*, code: str, holder_user_id: int = 1) -> int:
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        slip = TrustSlip(
            code=code,
            clan_id=1,
            holder_user_id=holder_user_id,
            trust_limit=Decimal("0.00"),
            currency="NGN",
            status="active",
            expires_at=now + timedelta(days=7),
            created_at=now,
            is_current=True,
        )
        db.add(slip)
        db.commit()
        db.refresh(slip)
        return int(slip.id)
    finally:
        db.close()

def _add_active_membership(*, clan_id: int, user_id: int = 1, role: str = "member") -> None:
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        db.add(
            Clan(
                id=clan_id,
                name=f"Test Clan {clan_id}",
                invite_code=f"test-invite-{clan_id}",
                community_code=f"GMFN-C-{clan_id:06d}",
                status="active",
                invite_uses=0,
                created_at=now,
            )
        )
        db.add(
            ClanMembership(
                clan_id=clan_id,
                user_id=user_id,
                role=role,
                personal_pool_balance=Decimal("0.00"),
                created_at=now,
            )
        )
        db.commit()
    finally:
        db.close()


def _trust_event_count() -> int:
    db = SessionLocal()
    try:
        return db.query(TrustEvent).count()
    finally:
        db.close()


def _trust_slip_count() -> int:
    db = SessionLocal()
    try:
        return db.query(TrustSlip).count()
    finally:
        db.close()


def test_trust_slip_release_rejects_malformed_payload_before_evidence_write(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    slip_id = _create_trust_slip(code="RELEASE-BOUNDARY")

    response = client.post(
        "/trust-slips/RELEASE-BOUNDARY/release",
        json={
            "supplier_name": True,
            "supplier_phone": 12345,
            "amount_released": 15000,
            "note": {"bad": "x"},
        },
    )

    assert response.status_code == 422, response.text
    assert "supplier_name must be text" in response.text
    assert "supplier_phone must be text" in response.text
    assert "amount_released must be a decimal string" in response.text
    assert "note must be text" in response.text

    db = SessionLocal()
    try:
        slip = db.get(TrustSlip, slip_id)
        assert slip is not None
        assert slip.last_release_at is None
        assert db.query(TrustEvent).count() == 0
    finally:
        db.close()


def test_trust_slip_release_accepts_text_payload(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    slip_id = _create_trust_slip(code="RELEASE-VALID")

    response = client.post(
        "/trust-slips/RELEASE-VALID/release",
        json={
            "supplier_name": "Merchant name",
            "supplier_phone": "08000000000",
            "amount_released": "15000.00",
            "note": "Goods released",
        },
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["ok"] is True
    assert payload["event_type"] == "trust_slip.release_logged"

    db = SessionLocal()
    try:
        slip = db.get(TrustSlip, slip_id)
        assert slip is not None
        assert slip.last_release_at is not None
        assert (
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "trust_slip.release_logged")
            .count()
            == 1
        )
    finally:
        db.close()


def test_trust_slip_extend_rejects_malformed_days_before_mutation(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    slip_id = _create_trust_slip(code="EXTEND-BOUNDARY")

    db = SessionLocal()
    try:
        original_expires_at = db.get(TrustSlip, slip_id).expires_at
    finally:
        db.close()

    for bad_value, expected_text in (
        (True, "days must be an integer, not a boolean"),
        (1.5, "days must be an integer, not a float"),
    ):
        response = client.post(
            "/trust-slips/EXTEND-BOUNDARY/extend",
            json={"days": bad_value},
        )
        assert response.status_code == 422, response.text
        assert expected_text in response.text

    db = SessionLocal()
    try:
        slip = db.get(TrustSlip, slip_id)
        assert slip is not None
        assert slip.expires_at == original_expires_at
        assert db.query(TrustEvent).count() == 0
    finally:
        db.close()


def test_trust_slip_reissue_rejects_malformed_payload_before_new_slip_or_event(
    client,
    seed_clan_member_membership,
    override_current_user_user,
):
    _create_trust_slip(code="REISSUE-BOUNDARY")

    response = client.post(
        "/trust-slips/me/reissue",
        json={
            "reason": {"bad": "x"},
            "force": "yes",
        },
    )

    assert response.status_code == 422, response.text
    assert "reason must be text" in response.text
    assert "force must be boolean" in response.text
    assert _trust_slip_count() == 1
    assert _trust_event_count() == 0


def test_public_verify_records_decision_pack_access_without_trust_event(
    client,
    seed_clan_admin_membership,
):
    slip_id = _create_trust_slip(code="ACCESS-DP")

    response = client.get(
        "/trust-slips/verify/ACCESS-DP",
        params={"decision_pack": "referral_decision"},
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["decision_pack"] == "referral_decision"
    assert payload["access_purpose"] == "Referral Decision Pack"
    assert payload["access_note"] == "Can this person be referred without damaging my credibility?"
    assert payload["decision_pack_focus"].startswith("Who knows the person")
    assert payload["share_access_record"]["status"] == "backend_access_recorded"
    profile = payload["decision_pack_profile"]
    assert profile["decision_pack"] == "referral_decision"
    assert profile["access_purpose"] == "Referral Decision Pack"
    assert "relationship_evidence" in profile["evidence_filter"]
    assert "private Trust Passport" in profile["basis_note"]
    assert "does not score" in profile["boundary_note"]
    assert isinstance(profile["relevant_signals"], list)
    assert profile["relevant_signals"]
    assert "recipient_name" not in profile
    assert "trust_score" not in profile

    db = SessionLocal()
    try:
        rows = db.query(TrustSlipDecisionPackAccess).all()
        assert len(rows) == 1
        access = rows[0]
        assert access.trust_slip_id == slip_id
        assert access.code == "ACCESS-DP"
        assert access.holder_user_id == 1
        assert access.clan_id == 1
        assert access.decision_pack_key == "referral_decision"
        assert access.access_purpose == "Referral Decision Pack"
        assert access.access_scope == "public_decision_pack"
        assert access.source == "public_verify"
        assert db.query(TrustEvent).count() == 0
    finally:
        db.close()

def test_public_verify_decision_pack_short_label_canonicalizes_like_frontend(
    client,
    seed_clan_admin_membership,
):
    _create_trust_slip(code="ACCESS-SHORT-LABEL")

    response = client.get(
        "/trust-slips/verify/ACCESS-SHORT-LABEL",
        params={"decision_pack": "Employment"},
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["decision_pack"] == "employment_decision"
    assert payload["access_purpose"] == "Employment Decision Pack"
    assert payload["access_note"] == "Is there enough evidence to continue an employment conversation?"
    profile = payload["decision_pack_profile"]
    assert profile["decision_pack"] == "employment_decision"
    assert "community_activity" in profile["evidence_filter"]
    assert "Declared work role or skill" in profile["expected_evidence"][0]
    assert any(row["label"] == "Demand Box" for row in profile["gsn_sources"])
    assert "Completed work record with customer confirmation" in profile["missing_links"]
    assert "Right to work" in profile["refuses_to_claim"]
    assert any(row["key"] == "expected_evidence_1" for row in profile["relevant_signals"])
    assert any(row["key"] == "missing_link_1" for row in profile["gaps_to_check"])
    assert "Demand Box" in " ".join(profile["recommended_checks"])
    assert "Right to work" in profile["boundary_note"]
    prompt = profile["community_confirmation_prompt"]
    assert prompt["reason_type"] == "employment_role_check"
    assert "known for the work" in prompt["question"]
    assert "not licences" in prompt["boundary"]

    db = SessionLocal()
    try:
        access = db.query(TrustSlipDecisionPackAccess).one()
        assert access.decision_pack_key == "employment_decision"
        assert access.access_purpose == "Employment Decision Pack"
        assert access.recipient_question == "Is there enough evidence to continue an employment conversation?"
        assert db.query(TrustEvent).count() == 0
    finally:
        db.close()

def test_public_verify_decision_pack_matrix_answers_housing_and_trade_questions(
    client,
    seed_clan_admin_membership,
):
    _create_trust_slip(code="ACCESS-HOUSING-MATRIX")
    _create_trust_slip(code="ACCESS-TRADE-MATRIX")

    housing_response = client.get(
        "/trust-slips/verify/ACCESS-HOUSING-MATRIX",
        params={"decision_pack": "housing_decision"},
    )
    trade_response = client.get(
        "/trust-slips/verify/ACCESS-TRADE-MATRIX",
        params={"decision_pack": "trade_check"},
    )

    assert housing_response.status_code == 200, housing_response.text
    housing_profile = housing_response.json()["decision_pack_profile"]
    assert "Contribution, dues, ROSCA" in housing_profile["expected_evidence"][0]
    assert any(row["label"] == "Finance" for row in housing_profile["gsn_sources"])
    assert any(row["label"] == "ROSCA / Money Pool" for row in housing_profile["gsn_sources"])
    assert "Previous landlord or accommodation witness route" in housing_profile["missing_links"]
    assert "Right to rent" in housing_profile["refuses_to_claim"]
    assert "Right to rent" in housing_profile["boundary_note"]
    assert housing_profile["community_confirmation_prompt"]["reason_type"] == "housing_reference_check"
    assert "payment discipline" in housing_profile["community_confirmation_prompt"]["question"]

    assert trade_response.status_code == 200, trade_response.text
    trade_profile = trade_response.json()["decision_pack_profile"]
    assert "Declared trade/service category" in trade_profile["expected_evidence"][0]
    assert any(row["label"] == "Demand Box" for row in trade_profile["gsn_sources"])
    assert "Customer-confirmed completed-job record" in trade_profile["missing_links"]
    assert "Trade licence" in trade_profile["refuses_to_claim"]
    assert "Trade licence" in trade_profile["boundary_note"]
    assert trade_profile["community_confirmation_prompt"]["reason_type"] == "trade_skill_check"
    assert "known for this trade" in trade_profile["community_confirmation_prompt"]["question"]
    assert "trust_score" not in str(housing_profile)
    assert "recipient_name" not in str(trade_profile)


def test_public_verify_housing_pack_surfaces_financial_record_pointers_without_credit_overclaiming(
    client,
    seed_clan_admin_membership,
):
    _create_trust_slip(code="ACCESS-HOUSING-RECORDS")

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        loan = Loan(
            borrower_user_id=1,
            clan_id=1,
            amount=Decimal("500.00"),
            currency="GBP",
            status="repaid",
            paid_total=Decimal("500.00"),
            remaining_amount=Decimal("0.00"),
            repaid_at=now,
        )
        db.add(loan)
        db.flush()
        db.add(
            Repayment(
                loan_id=int(loan.id),
                payer_user_id=1,
                amount=Decimal("500.00"),
                created_at=now,
            )
        )
        db.add(
            LoanGuarantor(
                loan_id=int(loan.id),
                clan_id=1,
                guarantor_user_id=1,
                pledge_amount=Decimal("100.00"),
                status="approved",
                is_locked=False,
                locked_amount=Decimal("0.00"),
                released_amount=Decimal("100.00"),
                responded_at=now,
            )
        )
        db.add(
            PoolEvent(
                clan_id=1,
                user_id=1,
                event_type="contribution",
                amount=Decimal("25.00"),
                currency="GBP",
                reference="PRIVATE-POOL-REF",
                note="Private contribution note",
                confirmed_at=now,
            )
        )
        db.commit()
    finally:
        db.close()

    response = client.get(
        "/trust-slips/verify/ACCESS-HOUSING-RECORDS",
        params={"decision_pack": "housing_decision"},
    )

    assert response.status_code == 200, response.text
    profile = response.json()["decision_pack_profile"]
    extract = profile["evidence_extract"]
    pointers = {row["key"]: row for row in extract["record_pointers"]}
    assert pointers["loan_support_lifecycle"]["evidence_count"] == 1
    assert pointers["repayment_follow_through"]["evidence_count"] == 1
    assert pointers["guarantor_support_response"]["evidence_count"] == 1
    assert pointers["pool_contribution_activity"]["evidence_count"] == 1
    assert "do not prove creditworthiness" in extract["record_pointer_boundary_note"]
    assert any(signal["key"] == "connected_record_pointer" for signal in profile["relevant_signals"])
    profile_text = str(profile)
    assert "PRIVATE-POOL-REF" not in profile_text
    assert "Private contribution note" not in profile_text
    assert "500.00" not in profile_text
    assert "do not expose bank references, amounts, or create a credit score" in profile_text
    assert "not a credit score, tenancy approval, or guaranteed rent signal" in profile_text
    assert "trust_score" not in profile_text


def test_public_verify_guarantor_pack_surfaces_support_outcomes_without_bank_or_identity_overclaiming(
    client,
    seed_clan_admin_membership,
):
    _create_trust_slip(code="ACCESS-GUARANTEE-OUTCOMES")

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        db.add(
            User(
                id=2,
                email="supporter-private@example.com",
                hashed_password="hashed",
                role="user",
                gmfn_id="GSN-U-SUPPORTER-PRIVATE",
            )
        )
        db.add(
            User(
                id=3,
                email="borrower-private@example.com",
                hashed_password="hashed",
                role="user",
                gmfn_id="GSN-U-BORROWER-PRIVATE",
            )
        )
        db.add(
            ClanMembership(
                clan_id=1,
                user_id=2,
                role="member",
                personal_pool_balance=Decimal("0.00"),
                created_at=now,
            )
        )
        supported_loan = Loan(
            borrower_user_id=1,
            clan_id=1,
            amount=Decimal("900.00"),
            currency="GBP",
            guarantee_gap=Decimal("300.00"),
            guarantors_required=1,
            status="repaid",
            paid_total=Decimal("900.00"),
            remaining_amount=Decimal("0.00"),
            repaid_at=now,
            due_at=now,
        )
        other_loan = Loan(
            borrower_user_id=3,
            clan_id=1,
            amount=Decimal("700.00"),
            currency="GBP",
            guarantee_gap=Decimal("200.00"),
            guarantors_required=1,
            status="active",
            paid_total=Decimal("100.00"),
            remaining_amount=Decimal("600.00"),
            due_at=now + timedelta(days=14),
        )
        db.add(supported_loan)
        db.add(other_loan)
        db.flush()
        db.add(
            LoanGuarantor(
                loan_id=int(supported_loan.id),
                clan_id=1,
                guarantor_user_id=2,
                pledge_amount=Decimal("300.00"),
                status="approved",
                is_locked=False,
                locked_amount=Decimal("0.00"),
                released_amount=Decimal("100.00"),
                responded_at=now,
            )
        )
        db.add(
            LoanGuarantor(
                loan_id=int(other_loan.id),
                clan_id=1,
                guarantor_user_id=1,
                pledge_amount=Decimal("200.00"),
                status="approved",
                is_locked=True,
                locked_amount=Decimal("50.00"),
                released_amount=Decimal("0.00"),
                responded_at=now,
            )
        )
        db.commit()
    finally:
        db.close()

    response = client.get(
        "/trust-slips/verify/ACCESS-GUARANTEE-OUTCOMES",
        params={"decision_pack": "guarantor_decision"},
    )

    assert response.status_code == 200, response.text
    profile = response.json()["decision_pack_profile"]
    extract = profile["evidence_extract"]
    pointers = {row["key"]: row for row in extract["guarantee_outcome_pointers"]}
    stood_for_holder = pointers["people_who_stood_for_holder"]
    holder_stood = pointers["holder_support_given_outcome"]
    assert stood_for_holder["status"] == "available"
    assert stood_for_holder["evidence_count"] == 1
    assert "1 support/guarantor record found on holder loan/support requests" in stood_for_holder["value"]
    assert "1 accepted or approved" in stood_for_holder["value"]
    assert "1 linked to repaid, settled, or closed loan/support outcomes" in stood_for_holder["value"]
    assert holder_stood["status"] == "caution"
    assert holder_stood["evidence_count"] == 1
    assert "1 record where holder stood for others" in holder_stood["value"]
    assert "1 currently locked" in holder_stood["value"]
    assert "1 still need current-context review" in holder_stood["value"]
    assert "do not expose borrower or guarantor identities" in extract["guarantee_outcome_boundary_note"]
    assert "bank guarantees" in extract["guarantee_outcome_boundary_note"]
    assert any(signal["key"] == "guarantee_support_outcome_pointer" for signal in profile["relevant_signals"])
    profile_text = str(profile)
    assert "supporter-private@example.com" not in profile_text
    assert "borrower-private@example.com" not in profile_text
    assert "GSN-U-SUPPORTER-PRIVATE" not in profile_text
    assert "GSN-U-BORROWER-PRIVATE" not in profile_text
    assert "900.00" not in profile_text
    assert "700.00" not in profile_text
    assert "300.00" not in profile_text
    assert "200.00" not in profile_text
    assert "50.00" not in profile_text
    assert "borrower_user_id" not in profile_text
    assert "guarantor_user_id" not in profile_text
    assert "pledge_amount" not in profile_text
    assert "locked_amount" not in profile_text
    assert "released_amount" not in profile_text
    assert "trust_score" not in profile_text


def test_public_verify_decision_pack_surfaces_aggregate_community_witness_outcomes_without_private_responder_details(
    client,
    seed_clan_admin_membership,
):
    slip_id = _create_trust_slip(code="ACCESS-WITNESS-OUTCOME")

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        db.add(
            User(
                id=2,
                email="witness-private@example.com",
                hashed_password="hashed",
                role="user",
                gmfn_id="GSN-U-WITNESS",
            )
        )
        db.flush()
        request = CommunityConfirmationRequest(
            public_token="PUBLIC-WITNESS-OUTCOME",
            requester_user_id=None,
            requester_external_label="Private employer asking about plumbing",
            subject_user_id=1,
            community_id=1,
            trust_slip_id=slip_id,
            reason_type="trade_skill_check",
            risk_level="medium",
            mode="instant_pulse",
            status="closed",
            visible_outcome="limited",
            outcome_summary={"private_marker": "PRIVATE-SUMMARY"},
            created_at=now,
            expires_at=now + timedelta(hours=24),
        )
        db.add(request)
        db.flush()
        db.add(
            CommunityConfirmationResponse(
                request_id=int(request.id),
                responder_user_id=2,
                response_type="active_here",
                response_reason="known_for_trade",
                response_note="Private witness note naming a customer",
                counted_in_outcome=True,
                responded_at=now,
            )
        )
        db.add(
            CommunityConfirmationOutcome(
                request_id=int(request.id),
                positive_count=1,
                caution_count=0,
                objection_count=0,
                no_response_count=1,
                eligible_contact_count=2,
                confidence_level="limited",
                visible_summary="1 of 2 community witnesses responded positively.",
                closed_at=now,
            )
        )
        db.commit()
    finally:
        db.close()

    response = client.get(
        "/trust-slips/verify/ACCESS-WITNESS-OUTCOME",
        params={"decision_pack": "trade_check"},
    )

    assert response.status_code == 200, response.text
    profile = response.json()["decision_pack_profile"]
    extract = profile["evidence_extract"]
    pointers = {row["key"]: row for row in extract["confirmation_pointers"]}
    witness = pointers["community_witness_outcome"]
    assert witness["status"] == "available"
    assert witness["evidence_count"] == 1
    assert "1 counted witness response" in witness["value"]
    assert "Latest outcome: limited; positive 1, caution 0, objection 0" in witness["value"]
    assert "do not expose responders" in extract["confirmation_pointer_boundary_note"]
    assert any(signal["key"] == "community_witness_outcome" for signal in profile["relevant_signals"])
    profile_text = str(profile)
    assert "Private employer asking about plumbing" not in profile_text
    assert "witness-private@example.com" not in profile_text
    assert "Private witness note" not in profile_text
    assert "PRIVATE-SUMMARY" not in profile_text
    assert "responder_user_id" not in profile_text
    assert "requester_external_label" not in profile_text
    assert "trust_score" not in profile_text


def test_public_verify_decision_pack_surfaces_issue_resolution_pointers_without_private_dispute_detail(
    client,
    seed_clan_admin_membership,
):
    slip_id = _create_trust_slip(code="ACCESS-ISSUE-REVIEW")

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        db.add(
            User(
                id=2,
                email="reviewer-private@example.com",
                hashed_password="hashed",
                role="user",
                gmfn_id="GSN-U-REVIEWER",
            )
        )
        db.flush()
        request = CommunityConfirmationRequest(
            public_token="PUBLIC-ISSUE-REVIEW",
            requester_user_id=None,
            requester_external_label="Private landlord dispute check",
            subject_user_id=1,
            community_id=1,
            trust_slip_id=slip_id,
            reason_type="housing_reference_check",
            risk_level="medium",
            mode="review",
            status="closed",
            visible_outcome="caution",
            outcome_summary={"private_marker": "PRIVATE-SUMMARY"},
            created_at=now,
            expires_at=now + timedelta(hours=24),
        )
        db.add(request)
        db.flush()
        decision = CommunityConfirmationDecision(
            request_id=int(request.id),
            community_id=1,
            subject_user_id=1,
            actor_user_id=2,
            decision="review_required",
            issue_reported=True,
            settled=False,
            status="recorded",
            decision_note="Private allegation detail",
            confidence_snapshot={"private": "PRIVATE-SNAPSHOT"},
            created_at=now,
        )
        db.add(decision)
        db.flush()
        db.add(
            CommunityConfirmationReviewCase(
                request_id=int(request.id),
                decision_id=int(decision.id),
                community_id=1,
                subject_user_id=1,
                opened_by_user_id=2,
                status="open",
                review_reason="payment_issue",
                reviewer_note="Private reviewer note",
                resolution=None,
                resolution_note="Private resolution note",
                trust_impact="review_required",
                evidence_summary={"private": "PRIVATE-EVIDENCE"},
                created_at=now,
            )
        )
        db.commit()
    finally:
        db.close()

    response = client.get(
        "/trust-slips/verify/ACCESS-ISSUE-REVIEW",
        params={"decision_pack": "housing_decision"},
    )

    assert response.status_code == 200, response.text
    profile = response.json()["decision_pack_profile"]
    extract = profile["evidence_extract"]
    pointers = {row["key"]: row for row in extract["issue_resolution_pointers"]}
    issue_review = pointers["issue_resolution_review"]
    assert issue_review["status"] == "caution"
    assert issue_review["evidence_count"] == 2
    assert "2 decision-review or issue-resolution pointers found" in issue_review["value"]
    assert "1 decision marked issue reported" in issue_review["value"]
    assert "1 still need review" in issue_review["value"]
    assert "do not expose allegations" in extract["issue_resolution_boundary_note"]
    assert any(signal["key"] == "issue_resolution_pointer" for signal in profile["relevant_signals"])
    profile_text = str(profile)
    assert "Private landlord dispute check" not in profile_text
    assert "reviewer-private@example.com" not in profile_text
    assert "Private allegation detail" not in profile_text
    assert "Private reviewer note" not in profile_text
    assert "Private resolution note" not in profile_text
    assert "PRIVATE-SUMMARY" not in profile_text
    assert "PRIVATE-SNAPSHOT" not in profile_text
    assert "PRIVATE-EVIDENCE" not in profile_text
    assert "actor_user_id" not in profile_text
    assert "decision_note" not in profile_text
    assert "reviewer_note" not in profile_text
    assert "trust_score" not in profile_text


def test_public_verify_trade_pack_surfaces_declared_work_claims_without_overclaiming(
    client,
    seed_clan_admin_membership,
):
    _create_trust_slip(code="ACCESS-TRADE-CLAIMS")

    db = SessionLocal()
    try:
        shop = MarketplaceShop(
            clan_id=1,
            owner_user_id=1,
            name="Emeka Plumbing Services",
            description="Plumbing repairs, pipe fitting, and home leak service.",
            is_active=True,
        )
        db.add(shop)
        db.flush()
        db.add(
            MarketplaceProduct(
                clan_id=1,
                shop_id=int(shop.id),
                seller_user_id=1,
                name="Bathroom leak repair",
                description="Emergency plumbing visit.",
                price="manual quote",
                currency="GBP",
                is_active=True,
                visibility_mode="public",
            )
        )
        db.add(
            ProtectedTradeRecord(
                trade_code="GSN-TRADE-CLAIMS-1",
                clan_id=1,
                creator_user_id=1,
                seller_user_id=1,
                buyer_user_id=None,
                shop_id=int(shop.id),
                item_title="Kitchen pipe repair",
                terms_summary="Customer checks work before relying again.",
                status="released",
                payment_status="not_started",
                release_status="released",
                receipt_status="confirmed",
                dispute_status="none",
                currency="GBP",
            )
        )
        db.commit()
    finally:
        db.close()

    response = client.get(
        "/trust-slips/verify/ACCESS-TRADE-CLAIMS",
        params={"decision_pack": "trade_check"},
    )

    assert response.status_code == 200, response.text
    profile = response.json()["decision_pack_profile"]
    extract = profile["evidence_extract"]
    claims = extract["declared_claims"]
    assert any(claim["key"] == "shop_service_declaration" for claim in claims)
    assert any("Emeka Plumbing Services" in claim["value"] for claim in claims)
    assert any("Bathroom leak repair" in claim["value"] for claim in claims)
    assert any("Kitchen pipe repair" in claim["value"] for claim in claims)
    assert "do not prove licence" in extract["declaration_boundary_note"]
    assert any(signal["key"] == "declared_work_service_claim" for signal in profile["relevant_signals"])
    assert "workmanship guarantee" in str(claims)
    assert "trust_score" not in str(profile)


def test_public_verify_decision_pack_access_bounds_unknown_public_context(
    client,
    seed_clan_admin_membership,
):
    _create_trust_slip(code="ACCESS-UNKNOWN")
    long_focus = "x" * 800

    response = client.get(
        "/trust-slips/verify/ACCESS-UNKNOWN",
        params={
            "decision_pack": "future_pack",
            "purpose": "Future private-looking pack label",
            "decision_question": "Can this evidence help?",
            "focus": long_focus,
            "access_scope": "public_decision_pack",
        },
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["decision_pack"] == "future_pack"
    assert payload["access_purpose"] == "Future private-looking pack label"
    assert payload["access_note"] == "Can this evidence help?"
    assert len(payload["decision_pack_focus"]) == 360

    db = SessionLocal()
    try:
        access = db.query(TrustSlipDecisionPackAccess).one()
        assert access.decision_pack_key == "future_pack"
        assert access.access_purpose == "Future private-looking pack label"
        assert access.recipient_question == "Can this evidence help?"
        assert access.decision_focus == "x" * 360
        assert not hasattr(access, "recipient_name")
        assert not hasattr(access, "recipient_email")
        assert not hasattr(access, "recipient_phone")
        assert db.query(TrustEvent).count() == 0
    finally:
        db.close()

def test_public_verify_decision_pack_extracts_redacted_event_categories(
    client,
    seed_clan_admin_membership,
):
    _create_trust_slip(code="ACCESS-EVIDENCE")

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        db.add_all(
            [
                TrustEvent(
                    event_type="merchant.delivery_confirmed",
                    clan_id=1,
                    actor_user_id=1,
                    subject_user_id=1,
                    created_at=now,
                    meta={"private_note": "Delivered to private address"},
                ),
                TrustEvent(
                    event_type="loan_repaid",
                    clan_id=1,
                    actor_user_id=1,
                    subject_user_id=1,
                    created_at=now,
                    meta={"payment_reference": "SECRET-REF"},
                ),
            ]
        )
        db.commit()
    finally:
        db.close()

    response = client.get(
        "/trust-slips/verify/ACCESS-EVIDENCE",
        params={"decision_pack": "business_partnership"},
    )

    assert response.status_code == 200, response.text
    profile = response.json()["decision_pack_profile"]
    extract = profile["evidence_extract"]
    assert extract["source"] == "trust_events_redacted_extract"
    service = next(row for row in extract["categories"] if row["key"] == "service_trade")
    assert service["evidence_count"] == 1
    assert service["source"] == "redacted_trust_events"
    private_review = {row["key"]: row for row in extract["private_review_required"]}
    assert private_review["finance_repayment"]["status"] == "private_review_required"
    assert "evidence_count" not in private_review["finance_repayment"]
    profile_text = str(profile)
    assert "merchant.delivery_confirmed" not in profile_text
    assert "loan_repaid" not in profile_text
    assert "SECRET-REF" not in profile_text
    assert "private address" not in profile_text

def test_public_verify_decision_pack_extract_uses_holder_active_community_footprint(
    client,
    seed_clan_admin_membership,
):
    _create_trust_slip(code="ACCESS-WIDER-EVIDENCE")
    _add_active_membership(clan_id=2)

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        db.add(
            Clan(
                id=3,
                name="Outside Clan",
                invite_code="test-invite-3",
                community_code="GMFN-C-000003",
                status="active",
                invite_uses=0,
                created_at=now,
            )
        )
        db.add_all(
            [
                TrustEvent(
                    event_type="merchant.delivery_confirmed",
                    clan_id=1,
                    actor_user_id=1,
                    subject_user_id=1,
                    created_at=now,
                    meta={"status": "primary"},
                ),
                TrustEvent(
                    event_type="merchant.service_completed",
                    clan_id=2,
                    actor_user_id=1,
                    subject_user_id=1,
                    created_at=now,
                    meta={"status": "other-active"},
                ),
                TrustEvent(
                    event_type="merchant.delivery_confirmed",
                    clan_id=3,
                    actor_user_id=1,
                    subject_user_id=1,
                    created_at=now,
                    meta={"status": "outside-active-footprint"},
                ),
            ]
        )
        db.commit()
    finally:
        db.close()

    response = client.get(
        "/trust-slips/verify/ACCESS-WIDER-EVIDENCE",
        params={"decision_pack": "business_partnership"},
    )

    assert response.status_code == 200, response.text
    extract = response.json()["decision_pack_profile"]["evidence_extract"]
    assert extract["evidence_scope"]["reading_scope"] == "primary_plus_wider"
    assert extract["evidence_scope"]["included_active_community_count"] == 2
    service = next(row for row in extract["categories"] if row["key"] == "service_trade")
    assert service["evidence_count"] == 2
    assert "outside-active-footprint" not in str(extract)

def test_holder_can_read_recent_decision_pack_accesses_without_recipient_identity(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    _create_trust_slip(code="ACCESS-HOLDER")
    client.get(
        "/trust-slips/verify/ACCESS-HOLDER",
        params={"decision_pack": "housing_decision"},
    )

    response = client.get("/trust-slips/me/decision-pack-accesses")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["ok"] is True
    assert "recipient name" in payload["privacy_note"].lower()
    assert "not behaviour evidence" in payload["evidence_note"]
    assert len(payload["items"]) == 1
    item = payload["items"][0]
    assert item["code"] == "ACCESS-HOLDER"
    assert item["decision_pack"] == "housing_decision"
    assert item["access_purpose"] == "Housing Decision Pack"
    assert item["access_scope"] == "public_decision_pack"
    assert item["source"] == "public_verify"
    assert "recipient_name" not in item
    assert "recipient_email" not in item
    assert "recipient_phone" not in item
    assert "ip_address" not in item


def test_holder_decision_pack_accesses_are_holder_scoped(
    client,
    seed_clan_admin_membership,
    seed_user2_non_member,
    override_current_user,
):
    _create_trust_slip(code="ACCESS-USER2", holder_user_id=2)
    client.get(
        "/trust-slips/verify/ACCESS-USER2",
        params={"decision_pack": "supplier_decision"},
    )

    response = client.get("/trust-slips/me/decision-pack-accesses")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["ok"] is True
    assert payload["items"] == []

def test_holder_private_decision_pack_evidence_shows_redacted_event_refs(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    _create_trust_slip(code="PRIVATE-EVIDENCE")

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        db.add_all(
            [
                TrustEvent(
                    event_type="merchant.delivery_confirmed",
                    clan_id=1,
                    actor_user_id=1,
                    subject_user_id=1,
                    created_at=now,
                    meta={
                        "status": "confirmed",
                        "payment_reference": "SECRET-REF",
                        "private_note": "Delivered to private address",
                        "customer_phone": "08000000000",
                    },
                ),
                TrustEvent(
                    event_type="loan_repaid",
                    clan_id=1,
                    actor_user_id=1,
                    subject_user_id=1,
                    created_at=now,
                    meta={
                        "status": "settled",
                        "bank_account": "0123456789",
                        "note": "Private repayment note",
                    },
                ),
            ]
        )
        db.commit()
    finally:
        db.close()

    response = client.get(
        "/trust-slips/me/decision-pack-evidence",
        params={"decision_pack": "business_partnership"},
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["ok"] is True
    assert "private Decision Pack preview" in payload["privacy_note"]
    extract = payload["evidence_extract"]
    assert extract["source"] == "holder_private_decision_pack_extract"
    categories = {row["key"]: row for row in extract["categories"]}
    assert categories["service_trade"]["evidence_count"] == 1
    assert categories["finance_repayment"]["evidence_count"] == 1
    assert categories["service_trade"]["event_refs"][0]["label"] == "Merchant Delivery Confirmed"
    assert categories["finance_repayment"]["event_refs"][0]["label"] == "Loan Repaid"
    assert categories["service_trade"]["event_refs"][0]["safe_meta"] == {"status": "confirmed"}
    assert categories["finance_repayment"]["event_refs"][0]["safe_meta"] == {"status": "settled"}
    payload_text = str(payload)
    assert "SECRET-REF" not in payload_text
    assert "private address" not in payload_text
    assert "08000000000" not in payload_text
    assert "0123456789" not in payload_text
    assert "Private repayment note" not in payload_text
    assert "score" in extract["boundary_note"]
    assert "approval" in extract["boundary_note"]


def test_holder_private_decision_pack_evidence_marks_primary_and_other_active_community_refs(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    _create_trust_slip(code="PRIVATE-WIDER-EVIDENCE")
    _add_active_membership(clan_id=2)

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        db.add(
            Clan(
                id=3,
                name="Outside Private Clan",
                invite_code="test-invite-3-private",
                community_code="GMFN-C-000103",
                status="active",
                invite_uses=0,
                created_at=now,
            )
        )
        db.add_all(
            [
                TrustEvent(
                    event_type="merchant.delivery_confirmed",
                    clan_id=1,
                    actor_user_id=1,
                    subject_user_id=1,
                    created_at=now,
                    meta={"status": "primary", "private_note": "primary private note"},
                ),
                TrustEvent(
                    event_type="merchant.service_completed",
                    clan_id=2,
                    actor_user_id=1,
                    subject_user_id=1,
                    created_at=now,
                    meta={"status": "other-active", "private_note": "other active private note"},
                ),
                TrustEvent(
                    event_type="merchant.delivery_confirmed",
                    clan_id=3,
                    actor_user_id=1,
                    subject_user_id=1,
                    created_at=now,
                    meta={"status": "outside", "private_note": "outside private note"},
                ),
            ]
        )
        db.commit()
    finally:
        db.close()

    response = client.get(
        "/trust-slips/me/decision-pack-evidence",
        params={"decision_pack": "business_partnership"},
    )

    assert response.status_code == 200, response.text
    extract = response.json()["evidence_extract"]
    assert extract["evidence_scope"]["reading_scope"] == "primary_plus_wider"
    assert extract["evidence_scope"]["included_active_community_count"] == 2
    service = next(row for row in extract["categories"] if row["key"] == "service_trade")
    assert service["evidence_count"] == 2
    scopes = {row["safe_meta"]["status"]: row["scope"] for row in service["event_refs"]}
    assert scopes == {
        "primary": "primary_community",
        "other-active": "other_active_community",
    }
    payload_text = str(response.json())
    assert "outside private note" not in payload_text
    assert "primary private note" not in payload_text
    assert "other active private note" not in payload_text

def test_holder_private_decision_pack_evidence_is_holder_scoped(
    client,
    seed_clan_admin_membership,
    seed_user2_non_member,
    override_current_user,
):
    _create_trust_slip(code="PRIVATE-HOLDER-ONE", holder_user_id=1)
    _create_trust_slip(code="PRIVATE-HOLDER-TWO", holder_user_id=2)

    db = SessionLocal()
    try:
        db.add(
            TrustEvent(
                event_type="merchant.delivery_confirmed",
                clan_id=1,
                actor_user_id=2,
                subject_user_id=2,
                created_at=datetime.now(timezone.utc),
                meta={"status": "confirmed", "private_note": "belongs to user 2"},
            )
        )
        db.commit()
    finally:
        db.close()

    response = client.get(
        "/trust-slips/me/decision-pack-evidence",
        params={"decision_pack": "business_partnership"},
    )

    assert response.status_code == 200, response.text
    extract = response.json()["evidence_extract"]
    service = next(row for row in extract["categories"] if row["key"] == "service_trade")
    assert service["evidence_count"] == 0
    assert service["event_refs"] == []
    assert "belongs to user 2" not in str(response.json())


def test_holder_records_decision_pack_consent_share_without_trust_event_or_public_access(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    slip_id = _create_trust_slip(code="CONSENT-SHARE")

    response = client.post(
        "/trust-slips/me/decision-pack-consent-shares",
        json={
            "decision_pack": "business_partnership",
            "export_format": "json",
            "category_count": 2,
            "event_ref_count": 3,
        },
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["ok"] is True
    assert "recipient identity" in payload["privacy_note"]
    assert "not behaviour evidence" in payload["evidence_note"]
    item = payload["item"]
    assert item["trust_slip_id"] == slip_id
    assert item["code"] == "CONSENT-SHARE"
    assert item["decision_pack"] == "business_partnership"
    assert item["access_purpose"] == "Business Partnership Decision Pack"
    assert item["consent_scope"] == "holder_private_decision_pack"
    assert item["source"] == "holder_private_preview"
    assert item["export_format"] == "json"
    assert item["category_count"] == 2
    assert item["event_ref_count"] == 3
    assert "recipient_name" not in item
    assert "recipient_email" not in item
    assert "copied_text" not in item
    assert "raw_events" not in item

    db = SessionLocal()
    try:
        row = db.query(TrustSlipDecisionPackConsentShare).one()
        assert row.trust_slip_id == slip_id
        assert row.holder_user_id == 1
        assert row.clan_id == 1
        assert row.code == "CONSENT-SHARE"
        assert row.decision_pack_key == "business_partnership"
        assert row.export_format == "json"
        assert row.category_count == 2
        assert row.event_ref_count == 3
        assert not hasattr(row, "recipient_name")
        assert not hasattr(row, "recipient_email")
        assert not hasattr(row, "recipient_phone")
        assert not hasattr(row, "copied_text")
        assert db.query(TrustSlipDecisionPackAccess).count() == 0
        assert db.query(TrustEvent).count() == 0
    finally:
        db.close()


def test_holder_consent_share_unknown_export_format_falls_back_to_summary_without_extra_records(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    slip_id = _create_trust_slip(code="CONSENT-FORMAT")

    response = client.post(
        "/trust-slips/me/decision-pack-consent-shares",
        json={
            "decision_pack": "employment_decision",
            "export_format": "recipient_pdf",
            "category_count": 5,
            "event_ref_count": 6,
        },
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    item = payload["item"]
    assert item["trust_slip_id"] == slip_id
    assert item["export_format"] == "summary"
    assert "recipient_pdf" not in str(payload)
    assert "recipient identity" in payload["privacy_note"]
    assert "not behaviour evidence" in payload["evidence_note"]

    db = SessionLocal()
    try:
        row = db.query(TrustSlipDecisionPackConsentShare).one()
        assert row.export_format == "summary"
        assert row.category_count == 5
        assert row.event_ref_count == 6
        assert db.query(TrustSlipDecisionPackAccess).count() == 0
        assert db.query(TrustEvent).count() == 0
    finally:
        db.close()

def test_holder_reads_recent_decision_pack_consent_shares_without_recipient_or_copied_text(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    _create_trust_slip(code="CONSENT-LIST")

    first = client.post(
        "/trust-slips/me/decision-pack-consent-shares",
        json={
            "decision_pack": "employment_decision",
            "export_format": "summary",
            "category_count": 1,
            "event_ref_count": 2,
        },
    )
    second = client.post(
        "/trust-slips/me/decision-pack-consent-shares",
        json={
            "decision_pack": "business_partnership",
            "export_format": "json",
            "category_count": 3,
            "event_ref_count": 4,
        },
    )
    assert first.status_code == 200, first.text
    assert second.status_code == 200, second.text

    response = client.get("/trust-slips/me/decision-pack-consent-shares", params={"limit": 12})

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["ok"] is True
    assert "holder copy/export audit markers only" in payload["privacy_note"]
    assert "not behaviour evidence" in payload["evidence_note"]
    assert "recipient identity" in payload["privacy_note"]
    assert "copied text" in payload["privacy_note"]
    assert len(payload["items"]) == 2
    assert [item["export_format"] for item in payload["items"]] == ["json", "summary"]
    assert payload["items"][0]["decision_pack"] == "business_partnership"
    assert payload["items"][0]["access_purpose"] == "Business Partnership Decision Pack"
    assert payload["items"][0]["category_count"] == 3
    assert payload["items"][0]["event_ref_count"] == 4
    assert payload["items"][1]["decision_pack"] == "employment_decision"
    assert all("recipient_name" not in item for item in payload["items"])
    assert all("recipient_email" not in item for item in payload["items"])
    assert all("copied_text" not in item for item in payload["items"])
    assert all("raw_events" not in item for item in payload["items"])

    db = SessionLocal()
    try:
        assert db.query(TrustSlipDecisionPackConsentShare).count() == 2
        assert db.query(TrustSlipDecisionPackAccess).count() == 0
        assert db.query(TrustEvent).count() == 0
    finally:
        db.close()


def test_holder_decision_pack_consent_share_list_is_holder_scoped(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    db = SessionLocal()
    try:
        db.add(User(id=2, email="other-holder@example.com", hashed_password="hashed", role="user"))
        db.commit()
    finally:
        db.close()

    other_slip_id = _create_trust_slip(code="CONSENT-OTHER", holder_user_id=2)
    db = SessionLocal()
    try:
        db.add(
            TrustSlipDecisionPackConsentShare(
                trust_slip_id=other_slip_id,
                clan_id=1,
                holder_user_id=2,
                code="CONSENT-OTHER",
                decision_pack_key="supplier_decision",
                access_purpose="Supplier Decision Pack",
                recipient_question="belongs to another holder",
                decision_focus="other holder focus",
                consent_scope="holder_private_decision_pack",
                source="holder_private_preview",
                export_format="summary",
                category_count=1,
                event_ref_count=1,
                status="recorded",
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()
    finally:
        db.close()

    response = client.get("/trust-slips/me/decision-pack-consent-shares", params={"limit": 12})

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["items"] == []
    assert "belongs to another holder" not in str(payload)
    assert "CONSENT-OTHER" not in str(payload)
    assert _trust_event_count() == 0

def test_holder_decision_pack_consent_share_rejects_malformed_payload_before_write(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    _create_trust_slip(code="CONSENT-BAD")

    response = client.post(
        "/trust-slips/me/decision-pack-consent-shares",
        json={
            "decision_pack": {"bad": "x"},
            "export_format": ["json"],
            "category_count": True,
            "event_ref_count": 1.5,
        },
    )

    assert response.status_code == 422, response.text
    assert "decision_pack must be text" in response.text
    assert "export_format must be text" in response.text
    assert "category_count must be an integer, not a boolean" in response.text
    assert "event_ref_count must be an integer, not a float" in response.text

    db = SessionLocal()
    try:
        assert db.query(TrustSlipDecisionPackConsentShare).count() == 0
        assert db.query(TrustSlipDecisionPackAccess).count() == 0
        assert db.query(TrustEvent).count() == 0
    finally:
        db.close()