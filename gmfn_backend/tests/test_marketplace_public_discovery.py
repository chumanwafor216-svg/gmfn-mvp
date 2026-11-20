from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.db.database import SessionLocal
from app.db.models import (
    Clan,
    CommerceTaxonomyConcept,
    CommerceTaxonomyConceptVersion,
    CommerceTaxonomyRelease,
    MarketplaceProduct,
    MarketplaceProductCapability,
    MarketplacePublicDiscoveryPublication,
    MarketplacePublicDiscoverySearchEvent,
    MarketplaceShop,
    MarketplaceShopCapability,
    MarketplaceShopCapabilityAvailability,
    MarketplaceShopCapabilityCoverage,
    User,
    UserSettings,
)


DISCOVERY_FLAG = "GSN_PUBLIC_MERCHANT_DISCOVERY_V1_ENABLED"
PRIVACY_FLAG = "GSN_SHOP_PRIVACY_AUTHORITY_V1_ENABLED"


def _seed_discovery_case() -> None:
    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        owner = User(
            id=1,
            email="pytest@example.com",
            hashed_password="hashed",
            display_name="Discovery Owner",
            role="user",
            gmfn_id="GMFN-U-DISCOVERY",
        )
        community = Clan(id=1, name="Private Community", invite_code="DISCOVERY-COMMUNITY")
        db.add_all([owner, community])
        db.flush()
        db.add(
            UserSettings(
                user_id=1,
                show_shop_public=True,
                show_whatsapp_public=False,
                show_phone_public=False,
                show_telegram_public=False,
            )
        )
        shop = MarketplaceShop(
            id=1,
            clan_id=1,
            owner_user_id=1,
            name="Safe Repairs",
            description="General repair services",
            whatsapp_number="+441234567890",
            telegram_handle="private-handle",
            is_active=True,
        )
        db.add(shop)
        db.flush()
        products = [
            MarketplaceProduct(
                id=1,
                clan_id=1,
                shop_id=1,
                seller_user_id=1,
                name="Mobile phone repair",
                description="Screen and battery repair",
                price="25",
                currency="GBP",
                image_url="https://example.invalid/phone.jpg",
                visibility_mode="community_visible",
                is_active=True,
            ),
            MarketplaceProduct(
                id=2,
                clan_id=1,
                shop_id=1,
                seller_user_id=1,
                name="Legacy secret inventory",
                description="Must not be inferred",
                visibility_mode="community_visible",
                is_active=True,
            ),
            MarketplaceProduct(
                id=3,
                clan_id=1,
                shop_id=1,
                seller_user_id=1,
                name="Private vault item",
                description="Protected private offer",
                visibility_mode="vault_private",
                is_active=True,
            ),
            MarketplaceProduct(
                id=4,
                clan_id=1,
                shop_id=1,
                seller_user_id=1,
                name="Paused public item",
                visibility_mode="community_visible",
                is_active=True,
            ),
            MarketplaceProduct(
                id=5,
                clan_id=1,
                shop_id=1,
                seller_user_id=1,
                name="Expired public item",
                visibility_mode="community_visible",
                is_active=True,
            ),
        ]
        db.add_all(products)
        db.flush()
        db.add_all(
            [
                MarketplacePublicDiscoveryPublication(
                    public_id="pd_visible",
                    shop_id=1,
                    product_id=1,
                    owner_user_id=1,
                    state="published",
                    published_at=now,
                ),
                MarketplacePublicDiscoveryPublication(
                    public_id="pd_vault",
                    shop_id=1,
                    product_id=3,
                    owner_user_id=1,
                    state="published",
                    published_at=now,
                ),
                MarketplacePublicDiscoveryPublication(
                    public_id="pd_paused",
                    shop_id=1,
                    product_id=4,
                    owner_user_id=1,
                    state="paused",
                ),
                MarketplacePublicDiscoveryPublication(
                    public_id="pd_expired",
                    shop_id=1,
                    product_id=5,
                    owner_user_id=1,
                    state="published",
                    published_at=now - timedelta(days=2),
                    expires_at=now - timedelta(days=1),
                ),
            ]
        )

        release = CommerceTaxonomyRelease(
            id=1,
            public_id="taxonomy-release-v1",
            version_number=1,
            status="published",
            steward_user_id=1,
            published_by_user_id=1,
            published_at=now,
        )
        concept = CommerceTaxonomyConcept(
            id=1,
            public_id="taxonomy-phone-repair",
            created_by_user_id=1,
        )
        db.add_all([release, concept])
        db.flush()
        db.add(
            CommerceTaxonomyConceptVersion(
                release_id=1,
                concept_id=1,
                canonical_label="Phone repairs",
                concept_kind="service",
                sensitivity="standard",
                lifecycle_status="active",
                created_by_user_id=1,
            )
        )
        capability = MarketplaceShopCapability(
            id=1,
            public_id="capability-phone-repair",
            shop_id=1,
            concept_id=1,
            taxonomy_release_id=1,
            owner_description="Repairs phones and tablets",
            normalized_description="repairs phones and tablets",
            role_code="repairs",
            mapping_status="owner_selected",
            created_by_user_id=1,
        )
        db.add(capability)
        db.flush()
        db.add_all(
            [
                MarketplaceShopCapabilityAvailability(
                    capability_id=1,
                    availability_status="available",
                ),
                MarketplaceShopCapabilityCoverage(
                    capability_id=1,
                    scope_type="region",
                    country_code="GB",
                    region_name="Scotland",
                ),
                MarketplaceProductCapability(
                    product_id=1,
                    concept_id=1,
                    taxonomy_release_id=1,
                    mapping_status="owner_selected",
                    mapped_by_user_id=1,
                ),
            ]
        )
        db.commit()


def test_discovery_fails_closed_without_both_authorities(client, monkeypatch) -> None:
    monkeypatch.delenv(DISCOVERY_FLAG, raising=False)
    monkeypatch.setenv(PRIVACY_FLAG, "true")
    response = client.get("/marketplace/public-discovery")
    assert response.status_code == 503
    assert response.json()["code"] == "PUBLIC_DISCOVERY_NOT_READY"
    assert response.headers["cache-control"].startswith("private, no-store")

    monkeypatch.setenv(DISCOVERY_FLAG, "true")
    monkeypatch.delenv(PRIVACY_FLAG, raising=False)
    response = client.get("/marketplace/public-discovery")
    assert response.status_code == 503


def test_anonymous_search_only_projects_eligible_publications(client, monkeypatch) -> None:
    monkeypatch.setenv(DISCOVERY_FLAG, "true")
    monkeypatch.setenv(PRIVACY_FLAG, "true")
    _seed_discovery_case()

    response = client.get(
        "/marketplace/public-discovery",
        params={"q": "repair", "category": "phone", "area": "scotland"},
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["total"] == 1
    assert payload["count"] == 1
    assert payload["next_cursor"] is None
    assert payload["suggestions"] == ["Mobile phone repair", "Safe Repairs", "Phone repairs"]
    item = payload["items"][0]
    assert item["publication_id"] == "pd_visible"
    assert item["offer_name"] == "Mobile phone repair"
    assert item["categories"] == ["Phone repairs"]
    assert item["service_areas"] == ["Scotland, GB"]
    assert item["availability"] == "available"
    assert item["contact_available"] is False
    assert item["shop_path"] == "/shop/GMFN-U-DISCOVERY"
    serialized = response.text
    assert "+441234567890" not in serialized
    assert "private-handle" not in serialized
    assert "Private Community" not in serialized
    assert "Legacy secret inventory" not in serialized
    assert "Private vault item" not in serialized
    assert "Expired public item" not in serialized

    with SessionLocal() as db:
        event = db.query(MarketplacePublicDiscoverySearchEvent).one()
        assert event.query_hash
        assert event.result_count == 1
        assert event.excluded_unavailable_count == 2
        assert event.zero_result is False
        assert event.has_category_filter is True
        assert event.has_area_filter is True
        assert event.coverage_complete is True
        assert event.scan_limit_reached is False
        assert event.scanned_publication_count == 3


def test_counts_suggestions_and_zero_results_exclude_protected_inventory(
    client,
    monkeypatch,
) -> None:
    monkeypatch.setenv(DISCOVERY_FLAG, "true")
    monkeypatch.setenv(PRIVACY_FLAG, "true")
    _seed_discovery_case()

    response = client.get("/marketplace/public-discovery", params={"q": "secret"})
    assert response.status_code == 200
    assert response.json()["items"] == []
    assert response.json()["total"] == 0
    assert response.json()["suggestions"] == []

    with SessionLocal() as db:
        event = db.query(MarketplacePublicDiscoverySearchEvent).one()
        assert event.zero_result is True
        assert event.result_count == 0
        assert event.coverage_complete is True


def test_pagination_and_partial_coverage_are_truthful(
    client,
    monkeypatch,
) -> None:
    monkeypatch.setenv(DISCOVERY_FLAG, "true")
    monkeypatch.setenv(PRIVACY_FLAG, "true")
    _seed_discovery_case()
    monkeypatch.setattr(
        "app.api.routes.marketplace_public_discovery.PUBLIC_DISCOVERY_SCAN_LIMIT",
        1,
    )
    with SessionLocal() as db:
        visible = (
            db.query(MarketplacePublicDiscoveryPublication)
            .filter_by(public_id="pd_visible")
            .one()
        )
        visible.published_at = datetime.now(timezone.utc) + timedelta(seconds=1)
        db.commit()

    first = client.get(
        "/marketplace/public-discovery",
        params={"limit": 1},
    )
    assert first.status_code == 200, first.text
    payload = first.json()
    assert payload["count"] == 1
    assert payload["total"] == 1
    assert payload["next_cursor"] is None
    assert payload["scan_limit_reached"] is True
    assert payload["coverage_complete"] is False
    assert payload["total_is_complete"] is False
    assert payload["scanned_publication_count"] == 1
    assert payload["scan_limit"] == 1

    with SessionLocal() as db:
        event = db.query(MarketplacePublicDiscoverySearchEvent).one()
        assert event.result_count == 1
        assert event.zero_result is False
        assert event.coverage_complete is False
        assert event.scan_limit_reached is True
        assert event.scanned_publication_count == 1


def test_existing_cursor_pages_without_repeating_results(client, monkeypatch) -> None:
    monkeypatch.setenv(DISCOVERY_FLAG, "true")
    monkeypatch.setenv(PRIVACY_FLAG, "true")
    _seed_discovery_case()
    with SessionLocal() as db:
        first = db.query(MarketplacePublicDiscoveryPublication).filter_by(product_id=1).one()
        product = MarketplaceProduct(
            id=6,
            clan_id=1,
            shop_id=1,
            seller_user_id=1,
            name="Tablet repair",
            description="Tablet screen repair",
            visibility_mode="community_visible",
            is_active=True,
        )
        db.add(product)
        db.flush()
        db.add(
            MarketplacePublicDiscoveryPublication(
                public_id="pd_tablet",
                shop_id=1,
                product_id=6,
                owner_user_id=1,
                state="published",
                published_at=first.published_at - timedelta(seconds=1),
            )
        )
        db.commit()

    page_one = client.get("/marketplace/public-discovery", params={"q": "repair", "limit": 1})
    assert page_one.status_code == 200
    first_payload = page_one.json()
    assert first_payload["total"] == 2
    assert first_payload["count"] == 1
    assert first_payload["next_cursor"] == 1

    page_two = client.get(
        "/marketplace/public-discovery",
        params={"q": "repair", "limit": 1, "cursor": first_payload["next_cursor"]},
    )
    assert page_two.status_code == 200
    second_payload = page_two.json()
    assert second_payload["total"] == 2
    assert second_payload["count"] == 1
    assert second_payload["next_cursor"] is None
    assert first_payload["items"][0]["publication_id"] != second_payload["items"][0]["publication_id"]


def test_owner_controls_require_confirmation_and_preserve_direct_shop(
    client,
    monkeypatch,
    override_current_user_user,
) -> None:
    monkeypatch.setenv(DISCOVERY_FLAG, "true")
    monkeypatch.setenv(PRIVACY_FLAG, "true")
    _seed_discovery_case()

    preview = client.get("/marketplace/public-discovery/owner/preview")
    assert preview.status_code == 200, preview.text
    legacy = next(item for item in preview.json()["items"] if item["product_id"] == 2)
    assert legacy["effective_state"] == "legacy_unpublished"
    assert legacy["eligible_to_publish"] is True

    rejected = client.put(
        "/marketplace/public-discovery/owner/products/2",
        json={"state": "published", "confirm_publication": False},
    )
    assert rejected.status_code == 409

    published = client.put(
        "/marketplace/public-discovery/owner/products/2",
        json={"state": "published", "confirm_publication": True},
    )
    assert published.status_code == 200, published.text
    assert published.json()["publication"]["effective_state"] == "published"
    assert published.json()["direct_shop_link_changed"] is False
    assert published.json()["payment_changed"] is False
    assert published.json()["spotlight_changed"] is False

    hidden = client.put(
        "/marketplace/public-discovery/owner/products/2",
        json={"state": "hidden"},
    )
    assert hidden.status_code == 200
    assert hidden.json()["publication"]["effective_state"] == "hidden"

    direct_shop = client.get("/marketplace/public/shop/GMFN-U-DISCOVERY")
    assert direct_shop.status_code == 200, direct_shop.text
    assert {item["id"] for item in direct_shop.json()["products"]} >= {1, 2}

    search = client.get("/marketplace/public-discovery", params={"q": "legacy"})
    assert search.status_code == 200
    assert search.json()["total"] == 0
