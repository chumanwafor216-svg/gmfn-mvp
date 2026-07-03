from __future__ import annotations

from datetime import datetime, timezone

from app.db.database import SessionLocal
from app.db.models import Clan, ClanMembership, TrustEvent, User
from app.services.trust_slips_services import get_trust_slip_payload


def _seed_member(
    *,
    display_name: str | None = None,
    with_join_evidence: bool = False,
    with_relationship_evidence: bool = False,
) -> None:
    with SessionLocal() as db:
        db.add(
            User(
                id=1,
                email="2348011112222@pending.gmfn.local",
                hashed_password="hashed",
                role="user",
                gmfn_id="GMFN-U-JOINRECOVER",
                phone_e164="+2348011112222",
                display_name=display_name,
            )
        )
        if with_relationship_evidence:
            db.add(
                User(
                    id=2,
                    email="inviter@example.com",
                    hashed_password="hashed",
                    role="user",
                    gmfn_id="GMFN-U-INVITER",
                    display_name="Invite Issuer",
                )
            )
        db.add(
            Clan(
                id=1,
                name="Recovered Join Community",
                marketplace_name="Recovered Join Marketplace",
                community_code="GMFN-C-RECOVER",
                invite_code="recover-join-code",
                status="active",
                invite_uses=0,
                created_at=datetime.now(timezone.utc),
            )
        )
        db.flush()
        db.add(
            ClanMembership(
                id=1,
                clan_id=1,
                user_id=1,
                role="member",
                personal_pool_balance=0,
            )
        )
        if with_join_evidence:
            event = TrustEvent(
                event_type="invite_accepted",
                clan_id=1,
                actor_user_id=1,
                subject_user_id=1,
                dedupe_key="recover-name-join-event",
            )
            event.meta = {
                "reason": "new_applicant_join_request_created",
                "applicant_profile": {
                    "first_name": "Ada",
                    "surname": "Ebony",
                    "phone_e164": "+2348011112222",
                },
            }
            db.add(event)
        if with_relationship_evidence:
            created = TrustEvent(
                event_type="invite_created",
                clan_id=1,
                actor_user_id=2,
                subject_user_id=2,
                dedupe_key="trustslip-relationship-invite-created",
            )
            created.meta = {
                "reason": "invite_created",
                "invite_code": "RELATIONSHIP-CODE",
                "relationship_evidence": {
                    "evidence_source": "first_circle",
                    "invitation_context": "trusted_community_invite",
                    "relationship_type": "marketplace_trade",
                    "known_duration": "over_5_years",
                    "confidence_level": "known_through_trade",
                    "relationship_context": "Private note that must not appear on TrustSlip.",
                    "first_circle_role": "trader",
                    "privacy_note": "Private context is not public.",
                },
            }
            accepted = TrustEvent(
                event_type="invite_accepted",
                clan_id=1,
                actor_user_id=1,
                subject_user_id=1,
                dedupe_key="trustslip-relationship-invite-accepted",
            )
            accepted.meta = {
                "reason": "invite_accepted",
                "invite_code": "RELATIONSHIP-CODE",
                "invite_id": 1,
            }
            db.add_all([created, accepted])
        db.commit()


def test_trust_slip_payload_recovers_holder_name_from_join_evidence():
    _seed_member(display_name="Member name not set", with_join_evidence=True)

    with SessionLocal() as db:
        payload = get_trust_slip_payload(db, user_id=1)

    assert payload["display_name"] == "Ada Ebony"
    assert payload["identity_context"]["display_name"] == "Ada Ebony"
    assert payload["merchant_summary"]["display_name"] == "Ada Ebony"
    assert "Member name not set" not in str(payload)


def test_trust_slip_payload_does_not_expose_missing_holder_name_placeholder():
    _seed_member(display_name="Member name not set", with_join_evidence=False)

    with SessionLocal() as db:
        payload = get_trust_slip_payload(db, user_id=1)

    assert payload["display_name"] == "GSN holder GMFN-U-JOINRECOVER"
    assert payload["identity_context"]["display_name"] == "GSN holder GMFN-U-JOINRECOVER"
    assert payload["merchant_summary"]["display_name"] == "GSN holder GMFN-U-JOINRECOVER"
    assert "Member name not set" not in str(payload)


def test_trust_slip_payload_summarizes_invite_relationship_evidence_without_raw_note():
    _seed_member(display_name="Ada Ebony", with_relationship_evidence=True)

    with SessionLocal() as db:
        payload = get_trust_slip_payload(db, user_id=1)

    summary = payload["relationship_evidence_summary"]
    assert summary["evidence_count"] == 1
    assert summary["summary_label"] == "Marketplace or trade - Over 5 years"
    assert summary["rows"][0]["relationship_label"] == "Marketplace or trade"
    assert summary["rows"][0]["known_duration_label"] == "Over 5 years"
    assert summary["rows"][0]["confidence_label"] == "Known through trade or service"
    assert "Raw inviter notes" in summary["privacy_boundary"]
    assert "Private note that must not appear" not in str(summary)
    assert payload["merchant_summary"]["relationship_evidence_summary"] == summary
