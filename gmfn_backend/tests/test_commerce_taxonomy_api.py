from __future__ import annotations

from sqlalchemy import text

from app.db.database import engine
from app.services.commerce_taxonomy_service import (
    ADMIN_API_FLAG,
    OWNER_API_FLAG,
    PUBLICATION_FLAG,
)


def _seed_owner_shop(*, owner_id: int = 1) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role, gmfn_id)
                VALUES (:id, :email, 'hashed', :role, :gmfn_id)
                """
            ),
            {
                "id": owner_id,
                "email": f"taxonomy-api-{owner_id}@example.invalid",
                "role": "admin" if owner_id == 1 else "user",
                "gmfn_id": f"GMFN-U-TAXAPI{owner_id:03d}",
            },
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES (1, 'Taxonomy API Community', 'Taxonomy API Market', 'TAX-API')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 1, :owner_id, 'Taxonomy API Shop', 'Existing shop', 1
                )
                """
            ),
            {"owner_id": owner_id},
        )


def test_owner_routes_fail_closed_when_flag_disabled(
    client,
    monkeypatch,
    override_current_user_user,
) -> None:
    _seed_owner_shop(owner_id=1)
    monkeypatch.delenv(OWNER_API_FLAG, raising=False)

    response = client.get("/commerce-taxonomy/shops/1/capabilities")

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "commerce_taxonomy_owner_api_disabled"


def test_owner_can_create_and_read_multiple_capabilities(
    client,
    monkeypatch,
    override_current_user_user,
) -> None:
    _seed_owner_shop(owner_id=1)
    monkeypatch.setenv(OWNER_API_FLAG, "true")

    first = client.post(
        "/commerce-taxonomy/shops/1/capabilities",
        json={
            "owner_description": "I repair refrigerators",
            "role_code": "repairs",
            "availability_status": "on_request",
            "coverage": [
                {
                    "scope_type": "locality",
                    "country_code": "NG",
                    "region_name": "Enugu",
                    "locality_name": "Enugu North",
                }
            ],
        },
    )
    second = client.post(
        "/commerce-taxonomy/shops/1/capabilities",
        json={
            "owner_description": "I rent event chairs",
            "role_code": "rents",
            "availability_status": "unspecified",
            "coverage": [{"scope_type": "region", "country_code": "NG", "region_name": "Enugu"}],
        },
    )
    listed = client.get("/commerce-taxonomy/shops/1/capabilities")

    assert first.status_code == 201, first.text
    assert second.status_code == 201, second.text
    assert listed.status_code == 200, listed.text
    assert len(listed.json()["items"]) == 2
    assert {item["mapping_status"] for item in listed.json()["items"]} == {"unmapped"}
    assert all(item["claim_basis"] == "owner_declared" for item in listed.json()["items"])


def test_cross_owner_capability_management_is_forbidden(
    client,
    monkeypatch,
    override_current_user_user,
) -> None:
    _seed_owner_shop(owner_id=2)
    monkeypatch.setenv(OWNER_API_FLAG, "true")

    response = client.post(
        "/commerce-taxonomy/shops/1/capabilities",
        json={"owner_description": "Unauthorised claim", "role_code": "sells"},
    )

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "shop_owner_required"


def test_capability_api_rejects_exact_location_and_unknown_fields(
    client,
    monkeypatch,
    override_current_user_user,
) -> None:
    _seed_owner_shop(owner_id=1)
    monkeypatch.setenv(OWNER_API_FLAG, "true")

    response = client.post(
        "/commerce-taxonomy/shops/1/capabilities",
        json={
            "owner_description": "Local delivery",
            "role_code": "delivers",
            "coverage": [
                {
                    "scope_type": "locality",
                    "country_code": "NG",
                    "region_name": "Enugu",
                    "locality_name": "Enugu North",
                    "latitude": 6.4,
                    "longitude": 7.5,
                    "street_address": "Private address",
                }
            ],
        },
    )

    assert response.status_code == 422


def test_non_admin_cannot_access_taxonomy_administration(
    client,
    monkeypatch,
    override_current_user_user,
) -> None:
    _seed_owner_shop(owner_id=1)
    monkeypatch.setenv(ADMIN_API_FLAG, "true")

    response = client.post(
        "/commerce-taxonomy/admin/releases",
        json={
            "version_number": 1,
            "languages": ["en", "en-NG"],
            "backup_steward_name": "Backup Steward",
            "safety_reviewer_name": "Independent Reviewer",
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "platform_admin_required"


def test_admin_routes_are_disabled_by_default(
    client,
    monkeypatch,
    override_current_user,
) -> None:
    _seed_owner_shop(owner_id=1)
    monkeypatch.delenv(ADMIN_API_FLAG, raising=False)

    response = client.post(
        "/commerce-taxonomy/admin/releases",
        json={
            "version_number": 1,
            "languages": ["en", "en-NG"],
            "backup_steward_name": "Backup Steward",
            "safety_reviewer_name": "Independent Reviewer",
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "commerce_taxonomy_admin_api_disabled"


def test_admin_can_create_draft_but_cannot_publish_without_environment_authority(
    client,
    monkeypatch,
    override_current_user,
) -> None:
    _seed_owner_shop(owner_id=1)
    monkeypatch.setenv(ADMIN_API_FLAG, "true")
    monkeypatch.setenv(PUBLICATION_FLAG, "true")
    monkeypatch.delenv("GSN_ENV", raising=False)
    monkeypatch.delenv("APP_ENV", raising=False)
    monkeypatch.delenv("ENVIRONMENT", raising=False)

    draft = client.post(
        "/commerce-taxonomy/admin/releases",
        json={
            "version_number": 1,
            "languages": ["en", "en-NG"],
            "backup_steward_name": "Backup Steward",
            "safety_reviewer_name": "Independent Reviewer",
        },
    )
    publish = client.post(
        f"/commerce-taxonomy/admin/releases/{draft.json()['item']['public_id']}/publish"
    )

    assert draft.status_code == 201, draft.text
    assert draft.json()["item"]["status"] == "draft"
    assert publish.status_code == 403
    assert publish.json()["detail"]["code"] == "commerce_taxonomy_publication_environment_prohibited"


def test_publication_guard_rejects_production_and_conflicting_environment_values(
    client,
    monkeypatch,
    override_current_user,
) -> None:
    _seed_owner_shop(owner_id=1)
    monkeypatch.setenv(ADMIN_API_FLAG, "true")
    monkeypatch.setenv(PUBLICATION_FLAG, "true")
    monkeypatch.setenv("GSN_ENV", "test")
    monkeypatch.setenv("APP_ENV", "production")

    response = client.post("/commerce-taxonomy/admin/releases/does-not-matter/publish")

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "commerce_taxonomy_publication_environment_prohibited"


def test_owner_term_proposal_rejects_contact_data(
    client,
    monkeypatch,
    override_current_user_user,
) -> None:
    _seed_owner_shop(owner_id=1)
    monkeypatch.setenv(OWNER_API_FLAG, "true")

    response = client.post(
        "/commerce-taxonomy/shops/1/term-proposals",
        json={"locale": "en-NG", "term": "Phone +234 800 000 0000 for generator work"},
    )

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "taxonomy_proposal_contact_data_prohibited"
