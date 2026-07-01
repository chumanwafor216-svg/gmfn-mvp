import json

from app.db.database import SessionLocal
from app.db.models import TrustEvent, User
from app.db.verification_models import IdentityVerificationCheck


def _seed_identity_photo_check(*, status: str = "manual_review_required") -> int:
    with SessionLocal() as db:
        db.add(
            User(
                id=2,
                email="identity-review-boundary@example.com",
                hashed_password="hashed",
                role="user",
                display_name="Identity Boundary",
            )
        )
        db.flush()
        check = IdentityVerificationCheck(
            user_id=2,
            verification_type="identity_photo",
            provider_key="manual_founder_photo",
            status=status,
            confidence_score=25,
            explanation="Boundary test identity photo check.",
            provider_response_json=json.dumps(
                {
                    "evidence_url": "/uploads/entry/identity/boundary.png",
                    "provider_configured": False,
                    "provider_verified": False,
                    "manual_review": True,
                    "review_cycle": 1,
                    **({"review_decision": "verify"} if status == "matched" else {}),
                }
            ),
        )
        db.add(check)
        db.commit()
        db.refresh(check)
        return int(check.id)


def test_identity_photo_decision_rejects_non_text_payload_before_review_event(
    client,
    override_current_user,
):
    check_id = _seed_identity_photo_check()

    response = client.post(
        f"/admin/identity-verification-checks/{check_id}/decision",
        json={
            "decision": True,
            "reviewer_note": {"note": "not text"},
        },
    )

    assert response.status_code == 422, response.text
    assert "decision must be text" in response.text
    assert "reviewer_note must be text" in response.text

    with SessionLocal() as db:
        check = db.get(IdentityVerificationCheck, check_id)
        assert check is not None
        assert check.status == "manual_review_required"
        assert check.verified_at is None
        provider_response = json.loads(check.provider_response_json or "{}")
        assert provider_response.get("review_decision") is None
        assert db.query(TrustEvent).count() == 0


def test_identity_photo_correction_rejects_non_text_reason_before_reversal_event(
    client,
    override_current_user,
):
    check_id = _seed_identity_photo_check(status="matched")

    response = client.post(
        f"/admin/identity-verification-checks/{check_id}/correction",
        json={"reason": 12345},
    )

    assert response.status_code == 422, response.text
    assert "reason must be text" in response.text

    with SessionLocal() as db:
        check = db.get(IdentityVerificationCheck, check_id)
        assert check is not None
        assert check.status == "matched"
        provider_response = json.loads(check.provider_response_json or "{}")
        assert provider_response.get("review_decision") == "verify"
        assert provider_response.get("correction_required") is None
        assert db.query(TrustEvent).count() == 0
