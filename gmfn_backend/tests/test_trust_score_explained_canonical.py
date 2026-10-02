from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from app.core.evidence_lifecycle import MARKER_REVERSAL, RESOLUTION_REVERSED, REVERSED, SOURCE_TRUST_EVENT
from app.db.database import SessionLocal
from app.db.models import Loan, TrustEvent
from app.services.evidence_lifecycle_service import create_lifecycle_marker
from app.services.trust_score_service import recompute_trust_for_user


def _loan(db, *, loan_id: int, status: str = "repaid") -> Loan:
    loan = Loan(
        id=loan_id,
        clan_id=1,
        borrower_user_id=1,
        amount=Decimal("100.00"),
        currency="NGN",
        status=status,
        paid_total=Decimal("100.00") if status == "repaid" else Decimal("0.00"),
        remaining_amount=Decimal("0.00") if status == "repaid" else Decimal("100.00"),
        repaid_at=datetime.now(timezone.utc) if status == "repaid" else None,
        guarantors_required=0,
    )
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return loan


def _event(db, *, event_type: str, loan: Loan | None = None, meta: dict | None = None) -> TrustEvent:
    event = TrustEvent(
        event_type=event_type,
        clan_id=1,
        loan_id=getattr(loan, "id", None),
        actor_user_id=1,
        subject_user_id=1,
        meta=meta or {},
        created_at=datetime.now(timezone.utc),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def _route_payload(client):
    response = client.get("/trust/score/explained-clan?limit=20", headers={"X-Clan-Id": "1"})
    assert response.status_code == 200, response.text
    return response.json()


def _assert_route_matches_canonical(client):
    with SessionLocal() as db:
        canonical = recompute_trust_for_user(db, user_id=1)
    payload = _route_payload(client)
    assert Decimal(str(payload["score"])) == Decimal(str(canonical["score"]))
    assert payload["band"] == canonical["trust_band"]
    assert payload["trust_score"] == payload["score"]
    assert payload["trust_band"] == payload["band"]
    assert Decimal(str(payload["positives"])) == Decimal(str(canonical["gains"]["total"]))
    assert Decimal(str(payload["negatives"])) == Decimal(str(canonical["penalties"]["total"]))
    assert payload["computed"]["score"] == canonical["score"]
    assert payload["scope"]["score_source"] == "canonical_lifecycle_aware_trust_score_service"
    assert payload["scope"]["event_listing_scope"] == "selected_clan"
    return payload, canonical


def test_explained_clan_matches_canonical_for_completed_repayment(
    client, override_current_user_user, seed_clan_member_membership
):
    with SessionLocal() as db:
        loan = _loan(db, loan_id=101)
        _event(db, event_type="loan.repaid", loan=loan, meta={"reason": "loan_fully_repaid"})

    payload, canonical = _assert_route_matches_canonical(client)

    assert canonical["counts"]["full_repayments"] == 1
    assert payload["counts"]["loan.repaid"] == 1
    assert payload["last_events"][-1]["event_type"] == "loan.repaid"


def test_explained_clan_matches_canonical_for_provenance_qualified_legacy_repayment(
    client, override_current_user_user, seed_clan_member_membership
):
    with SessionLocal() as db:
        loan = _loan(db, loan_id=102)
        _event(
            db,
            event_type="loan.repayment_confirmed",
            loan=loan,
            meta={"reason": "loan_fully_repaid"},
        )

    payload, canonical = _assert_route_matches_canonical(client)

    assert canonical["counts"]["full_repayments"] == 1
    assert canonical["counts"]["contextual_legacy_full_repayments_counted"] == 1
    assert payload["counts"]["loan.repayment_confirmed"] == 1


def test_explained_clan_matches_canonical_for_ambiguous_repayment_confirmed(
    client, override_current_user_user, seed_clan_member_membership
):
    with SessionLocal() as db:
        _event(
            db,
            event_type="loan.repayment_confirmed",
            meta={"role": "borrower", "reason": "Repayment confirmed"},
        )

    payload, canonical = _assert_route_matches_canonical(client)

    assert canonical["counts"]["full_repayments"] == 0
    assert canonical["counts"]["ambiguous_repayment_events_preserved"] == 1
    assert payload["counts"]["loan.repayment_confirmed"] == 1
    assert Decimal(str(payload["score"])) == Decimal("0.00")


def test_explained_clan_matches_canonical_for_duplicate_canonical_and_legacy_repayment(
    client, override_current_user_user, seed_clan_member_membership
):
    with SessionLocal() as db:
        loan = _loan(db, loan_id=103)
        _event(
            db,
            event_type="loan.repayment_confirmed",
            loan=loan,
            meta={"reason": "loan_fully_repaid"},
        )
        _event(db, event_type="loan.repaid", loan=loan, meta={"reason": "loan_fully_repaid"})

    payload, canonical = _assert_route_matches_canonical(client)

    assert canonical["counts"]["full_repayments"] == 1
    assert canonical["counts"]["duplicate_outcome_events_skipped"] == 1
    assert payload["counts"]["loan.repayment_confirmed"] == 1
    assert payload["counts"]["loan.repaid"] == 1
    assert Decimal(str(payload["score"])) == Decimal("0.10")


def test_explained_clan_matches_canonical_for_lifecycle_limited_repayment(
    client, override_current_user_user, seed_clan_member_membership
):
    with SessionLocal() as db:
        loan = _loan(db, loan_id=104)
        event = _event(db, event_type="loan.repaid", loan=loan, meta={"reason": "loan_fully_repaid"})
        create_lifecycle_marker(
            db,
            source_type=SOURCE_TRUST_EVENT,
            source_id=event.id,
            trust_event_id=event.id,
            marker_type=MARKER_REVERSAL,
            state=REVERSED,
            resolution=RESOLUTION_REVERSED,
            actor_user_id=1,
            authority_type="admin_review",
            reason="Repayment evidence reversed for route parity test.",
        )
        db.commit()

    payload, canonical = _assert_route_matches_canonical(client)

    assert canonical["counts"]["full_repayments"] == 0
    assert canonical["counts"]["lifecycle_limited_events_excluded"] == 1
    assert payload["counts"]["loan.repaid"] == 1
    assert Decimal(str(payload["score"])) == Decimal("0.00")


def test_explained_clan_matches_canonical_for_no_qualifying_evidence(
    client, override_current_user_user, seed_clan_member_membership
):
    payload, canonical = _assert_route_matches_canonical(client)

    assert canonical["score"] == "0.00"
    assert payload["counts"] == {}
    assert payload["canonical_counts"]["full_repayments"] == 0
    assert payload["last_events"] == []


def test_explained_clan_preserves_frontend_compatible_shape(
    client, override_current_user_user, seed_clan_member_membership
):
    with SessionLocal() as db:
        loan = _loan(db, loan_id=105)
        _event(db, event_type="loan.repaid", loan=loan, meta={"reason": "loan_fully_repaid"})

    payload = _route_payload(client)

    for key in [
        "scope",
        "user_id",
        "email",
        "score",
        "trust_score",
        "band",
        "trust_band",
        "positives",
        "negatives",
        "counts",
        "canonical_counts",
        "computed",
        "last_events",
        "notes",
    ]:
        assert key in payload
    assert payload["scope"]["clan_id"] == 1
    assert payload["user_id"] == 1
    assert isinstance(payload["last_events"], list)
    assert payload["counts"]["loan.repaid"] == 1
    assert payload["computed"]["counts"]["full_repayments"] == 1
