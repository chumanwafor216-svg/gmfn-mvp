from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi.testclient import TestClient

from app.db.database import SessionLocal
from app.db.models import Clan, TrustSlip, User


def _seed_public_identity(*, with_trust_slip: bool, profile_enabled: bool) -> None:
    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        db.add(
            User(
                id=1,
                email="private-holder@example.com",
                hashed_password="hashed",
                role="user",
                display_name="Public Holder",
                gmfn_id="GMFN-U-PUBLIC-ID",
                phone_e164="+2348000000000",
                phone_verified_at=now,
                profile_image_url="/uploads/profile/public-holder.jpg",
                professional_headline="Community commerce adviser",
                professional_summary="Supports trusted local commerce.",
                public_professional_profile_enabled=profile_enabled,
            )
        )
        if with_trust_slip:
            db.add(
                Clan(
                    id=1,
                    name="Private Community",
                    invite_code="private-public-identity-test",
                    status="active",
                )
            )
            db.add(
                TrustSlip(
                    code="PUBLIC-ID-TRUSTSLIP",
                    clan_id=1,
                    holder_user_id=1,
                    trust_limit=Decimal("0.00"),
                    currency="NGN",
                    status="active",
                    created_at=now,
                    expires_at=now + timedelta(days=7),
                    is_current=True,
                )
            )
        db.commit()


def test_public_identity_remains_available_without_trustslip(client: TestClient):
    _seed_public_identity(with_trust_slip=False, profile_enabled=True)

    response = client.get("/trust-slips/public-identity/GMFN-U-PUBLIC-ID")

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["gmfn_id"] == "GMFN-U-PUBLIC-ID"
    assert data["holder_name"] == "Public Holder"
    assert data["code"] is None
    assert data["verification_status"] == "pending"
    assert data["public_professional_profile_enabled"] is True
    assert data["professional_headline"] == "Community commerce adviser"
    serialized = response.text.lower()
    assert "private-holder@example.com" not in serialized
    assert "+2348000000000" not in serialized
    assert "private community" not in serialized
    assert "phone_verified" not in serialized
    assert "active_community" not in serialized


def test_public_identity_keeps_profile_private_and_links_existing_trustslip(
    client: TestClient,
):
    _seed_public_identity(with_trust_slip=True, profile_enabled=False)

    response = client.get("/trust-slips/public-identity/GMFN-U-PUBLIC-ID")

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["code"] == "PUBLIC-ID-TRUSTSLIP"
    assert data["public_professional_profile_enabled"] is False
    assert data["professional_headline"] is None
    assert data["professional_summary"] is None
