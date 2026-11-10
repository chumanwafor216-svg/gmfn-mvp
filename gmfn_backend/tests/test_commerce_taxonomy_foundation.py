from __future__ import annotations

from datetime import timedelta

import pytest
from sqlalchemy import text

from app.db.database import SessionLocal, engine
from app.db.models import (
    CommerceTaxonomyProposal,
    MarketplaceProductCapability,
    MarketplaceShop,
    MarketplaceShopCapability,
)
from app.services.commerce_taxonomy_service import (
    ADMIN_API_FLAG,
    OWNER_API_FLAG,
    PUBLICATION_FLAG,
    CommerceTaxonomyError,
    add_concept_version,
    add_redirect,
    add_term,
    create_release,
    create_shop_capability,
    list_shop_capabilities,
    product_capability_count,
    publish_release,
    release_checksum,
    resolve_approved_term,
    serialize_capability,
    submit_taxonomy_proposal,
    update_shop_capability,
    utcnow,
    verify_release_integrity,
    withdraw_release,
)


def _seed_shop(*, owner_id: int = 1, shop_id: int = 1, with_product: bool = False) -> None:
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
                "email": f"taxonomy-{owner_id}@example.invalid",
                "role": "admin" if owner_id == 1 else "user",
                "gmfn_id": f"GMFN-U-TAX{owner_id:04d}",
            },
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES (1, 'Taxonomy Community', 'Taxonomy Marketplace', 'TAXONOMY-ONE')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    :shop_id, 1, :owner_id, 'Taxonomy Shop', 'Existing Shop record', 1
                )
                """
            ),
            {"shop_id": shop_id, "owner_id": owner_id},
        )
        if with_product:
            conn.execute(
                text(
                    """
                    INSERT INTO marketplace_products (
                        id, clan_id, shop_id, seller_user_id, title, description,
                        visibility_mode, is_active
                    ) VALUES (
                        1, 1, :shop_id, :owner_id, 'Existing offer', 'Not a capability',
                        'community_visible', 1
                    )
                    """
                ),
                {"shop_id": shop_id, "owner_id": owner_id},
            )


def _enable_admin(monkeypatch) -> None:
    monkeypatch.setenv(ADMIN_API_FLAG, "true")
    monkeypatch.setenv(PUBLICATION_FLAG, "true")
    monkeypatch.setenv("GSN_ENV", "test")
    monkeypatch.delenv("APP_ENV", raising=False)
    monkeypatch.delenv("ENVIRONMENT", raising=False)


def _published_release(
    db,
    monkeypatch,
    *,
    label: str = "Solar installation",
    sensitivity: str = "standard",
):
    _enable_admin(monkeypatch)
    release = create_release(
        db,
        version_number=1,
        languages=["en", "en-NG", "ig"],
        steward_user_id=1,
        backup_steward_name="Backup Steward",
        safety_reviewer_name="Independent Reviewer",
    )
    concept, _ = add_concept_version(
        db,
        release=release,
        actor_user_id=1,
        canonical_label=label,
        concept_kind="service",
        sensitivity=sensitivity,
        credential_notice=(
            "Owner declaration does not establish a licence or professional qualification."
            if sensitivity != "standard"
            else None
        ),
    )
    for locale, term in (
        ("en", label),
        ("en-NG", label),
        ("ig", "Ntinye ike anyanwụ"),
    ):
        add_term(
            db,
            release=release,
            concept_public_id=concept.public_id,
            locale=locale,
            term=term,
            term_kind="canonical" if locale != "ig" else "alias",
            actor_user_id=1,
            approved=True,
        )
    publish_release(db, release_public_id=release.public_id, actor_user_id=1)
    db.commit()
    return release, concept


def test_release_publication_is_atomic_integrity_checked_and_immutable(monkeypatch) -> None:
    _seed_shop()
    with SessionLocal() as db:
        release, concept = _published_release(db, monkeypatch)
        original_checksum = release.checksum

        assert original_checksum == release_checksum(db, release=release)
        assert verify_release_integrity(db, release=release) is True

        with pytest.raises(CommerceTaxonomyError) as exc_info:
            add_term(
                db,
                release=release,
                concept_public_id=concept.public_id,
                locale="en",
                term="Late mutation",
                term_kind="alias",
                actor_user_id=1,
                approved=True,
            )

        assert exc_info.value.code == "published_taxonomy_release_immutable"
        assert release.checksum == original_checksum


def test_checksum_detects_out_of_band_published_content_change(monkeypatch) -> None:
    _seed_shop()
    with SessionLocal() as db:
        release, _ = _published_release(db, monkeypatch)
        db.execute(
            text(
                """
                UPDATE commerce_taxonomy_concept_versions
                SET canonical_label = 'Tampered label'
                WHERE release_id = :release_id
                """
            ),
            {"release_id": release.id},
        )
        db.flush()
        assert verify_release_integrity(db, release=release) is False


def test_alias_resolution_and_withdrawal_preserve_historical_resolution(monkeypatch) -> None:
    _seed_shop()
    with SessionLocal() as db:
        release, concept = _published_release(db, monkeypatch)

        resolved = resolve_approved_term(db, term="  NTINYE  IKE ANYANWỤ ", locale="ig")
        assert resolved is not None
        assert resolved["concept_public_id"] == concept.public_id
        assert resolved["matched_locale"] == "ig"

        withdrawn = withdraw_release(
            db,
            release_public_id=release.public_id,
            actor_user_id=1,
            reason="Defective release withdrawn without rewriting history.",
        )
        db.commit()

        assert withdrawn.status == "withdrawn"
        assert verify_release_integrity(db, release=withdrawn) is True
        historical = resolve_approved_term(
            db,
            term="Solar installation",
            locale="en",
            release_public_id=release.public_id,
        )
        assert historical is not None
        assert historical["release_status"] == "withdrawn"
        assert resolve_approved_term(db, term="Solar installation", locale="en") is None


def test_redirect_resolution_is_deterministic(monkeypatch) -> None:
    _seed_shop()
    _enable_admin(monkeypatch)
    with SessionLocal() as db:
        release = create_release(
            db,
            version_number=1,
            languages=["en", "en-NG"],
            steward_user_id=1,
            backup_steward_name="Backup Steward",
            safety_reviewer_name="Independent Reviewer",
        )
        source, _ = add_concept_version(
            db,
            release=release,
            actor_user_id=1,
            canonical_label="Fridge maintenance",
            concept_kind="service",
            lifecycle_status="retired",
        )
        target, _ = add_concept_version(
            db,
            release=release,
            actor_user_id=1,
            canonical_label="Refrigeration repair",
            concept_kind="service",
        )
        for concept, label in ((source, "Fridge maintenance"), (target, "Refrigeration repair")):
            for locale in ("en", "en-NG"):
                add_term(
                    db,
                    release=release,
                    concept_public_id=concept.public_id,
                    locale=locale,
                    term=label,
                    term_kind="canonical",
                    actor_user_id=1,
                    approved=True,
                )
        add_redirect(
            db,
            release=release,
            source_public_id=source.public_id,
            target_public_id=target.public_id,
            redirect_kind="merged",
            actor_user_id=1,
        )
        publish_release(db, release_public_id=release.public_id, actor_user_id=1)
        db.commit()

        resolved = resolve_approved_term(db, term="Fridge maintenance", locale="en")
        assert resolved is not None
        assert resolved["original_concept_public_id"] == source.public_id
        assert resolved["concept_public_id"] == target.public_id
        assert resolved["redirected"] is True


def test_owner_can_record_multiple_unmapped_capabilities_without_changing_offers(monkeypatch) -> None:
    _seed_shop(with_product=True)
    monkeypatch.setenv(OWNER_API_FLAG, "true")
    with SessionLocal() as db:
        shop = db.get(MarketplaceShop, 1)
        first = create_shop_capability(
            db,
            shop=shop,
            actor_user_id=1,
            owner_description="I repair household refrigerators",
            role_code="repairs",
            availability_status="on_request",
            coverage=[
                {
                    "scope_type": "locality",
                    "country_code": "NG",
                    "region_name": "Enugu",
                    "locality_name": "Enugu North",
                }
            ],
        )
        second = create_shop_capability(
            db,
            shop=shop,
            actor_user_id=1,
            owner_description="I deliver appliances",
            role_code="delivers",
            availability_status="unspecified",
            coverage=[{"scope_type": "remote"}],
        )
        db.commit()

        items = list_shop_capabilities(db, shop_id=1)
        assert {item["public_id"] for item in items} == {first.public_id, second.public_id}
        assert items[0]["claim_basis"] == "owner_declared"
        assert {item["mapping_status"] for item in items} == {"unmapped"}
        assert any(item["availability"]["status"] == "on_request" for item in items)
        assert any(item["availability"]["status"] == "unspecified" for item in items)
        assert product_capability_count(db, product_id=1) == 0
        assert db.query(MarketplaceProductCapability).count() == 0


def test_duplicate_shop_capabilities_are_prevented(monkeypatch) -> None:
    _seed_shop()
    monkeypatch.setenv(OWNER_API_FLAG, "true")
    with SessionLocal() as db:
        shop = db.get(MarketplaceShop, 1)
        create_shop_capability(
            db,
            shop=shop,
            actor_user_id=1,
            owner_description="Fridge Repair",
            role_code="repairs",
        )
        with pytest.raises(CommerceTaxonomyError) as exc_info:
            create_shop_capability(
                db,
                shop=shop,
                actor_user_id=1,
                owner_description="  fridge   repair ",
                role_code="repairs",
            )
        assert exc_info.value.code == "duplicate_shop_capability"


def test_sensitive_capability_never_implies_credentials(monkeypatch) -> None:
    _seed_shop()
    monkeypatch.setenv(OWNER_API_FLAG, "true")
    with SessionLocal() as db:
        release, concept = _published_release(
            db,
            monkeypatch,
            label="Electrical installation",
            sensitivity="safety_critical",
        )
        monkeypatch.setenv(OWNER_API_FLAG, "true")
        capability = create_shop_capability(
            db,
            shop=db.get(MarketplaceShop, 1),
            actor_user_id=1,
            owner_description="I provide electrical installation",
            role_code="installs",
            concept_public_id=concept.public_id,
            release_public_id=release.public_id,
        )
        payload = serialize_capability(db, capability=capability)

        assert payload["claim_basis"] == "owner_declared"
        assert payload["concept"]["sensitivity"] == "safety_critical"
        assert payload["concept"]["credential_status"] == "not_assessed"
        assert "licence" in payload["concept"]["credential_notice"]


def test_owner_only_capability_permissions(monkeypatch) -> None:
    _seed_shop(owner_id=2)
    monkeypatch.setenv(OWNER_API_FLAG, "true")
    with SessionLocal() as db:
        with pytest.raises(CommerceTaxonomyError) as exc_info:
            create_shop_capability(
                db,
                shop=db.get(MarketplaceShop, 1),
                actor_user_id=1,
                owner_description="Attempted cross-owner capability",
                role_code="sells",
            )
        assert exc_info.value.code == "shop_owner_required"
        assert db.query(MarketplaceShopCapability).count() == 0


def test_disabled_owner_flag_preserves_existing_shop_behavior(monkeypatch) -> None:
    _seed_shop()
    monkeypatch.delenv(OWNER_API_FLAG, raising=False)
    with SessionLocal() as db:
        with pytest.raises(CommerceTaxonomyError) as exc_info:
            create_shop_capability(
                db,
                shop=db.get(MarketplaceShop, 1),
                actor_user_id=1,
                owner_description="Disabled capability",
                role_code="sells",
            )
        assert exc_info.value.code == "commerce_taxonomy_owner_api_disabled"
        shop = db.get(MarketplaceShop, 1)
        assert shop.name == "Taxonomy Shop"
        assert shop.is_active is True


def test_public_safe_coverage_rejects_location_fields_for_remote(monkeypatch) -> None:
    _seed_shop()
    monkeypatch.setenv(OWNER_API_FLAG, "true")
    with SessionLocal() as db:
        with pytest.raises(CommerceTaxonomyError) as exc_info:
            create_shop_capability(
                db,
                shop=db.get(MarketplaceShop, 1),
                actor_user_id=1,
                owner_description="Remote teaching",
                role_code="teaches_trains",
                coverage=[{"scope_type": "remote", "locality_name": "Private address"}],
            )
        assert exc_info.value.code == "remote_coverage_fields_prohibited"


def test_proposals_are_deduplicated_rate_limited_and_reject_contact_data(monkeypatch) -> None:
    _seed_shop()
    monkeypatch.setenv(OWNER_API_FLAG, "true")
    with SessionLocal() as db:
        shop = db.get(MarketplaceShop, 1)
        first = submit_taxonomy_proposal(
            db,
            shop=shop,
            actor_user_id=1,
            locale="en-NG",
            term="Generator rewinding",
        )
        assert first.retention_until >= utcnow() + timedelta(days=364)

        with pytest.raises(CommerceTaxonomyError) as duplicate_exc:
            submit_taxonomy_proposal(
                db,
                shop=shop,
                actor_user_id=1,
                locale="en-NG",
                term=" generator   rewinding ",
            )
        assert duplicate_exc.value.code == "taxonomy_proposal_duplicate"

        with pytest.raises(CommerceTaxonomyError) as pii_exc:
            submit_taxonomy_proposal(
                db,
                shop=shop,
                actor_user_id=1,
                locale="en",
                term="Call +234 800 000 0000 for repairs",
            )
        assert pii_exc.value.code == "taxonomy_proposal_contact_data_prohibited"

        assert db.query(CommerceTaxonomyProposal).count() == 1


def test_taxonomy_proposal_daily_rate_limit_is_enforced(monkeypatch) -> None:
    _seed_shop()
    monkeypatch.setenv(OWNER_API_FLAG, "true")
    with SessionLocal() as db:
        shop = db.get(MarketplaceShop, 1)
        for index in range(10):
            submit_taxonomy_proposal(
                db,
                shop=shop,
                actor_user_id=1,
                locale="en",
                term=f"Distinct local service {index}",
            )
        with pytest.raises(CommerceTaxonomyError) as exc_info:
            submit_taxonomy_proposal(
                db,
                shop=shop,
                actor_user_id=1,
                locale="en",
                term="One proposal too many",
            )
        assert exc_info.value.code == "taxonomy_proposal_rate_limited"


def test_owner_can_update_availability_and_coverage_without_remapping(monkeypatch) -> None:
    _seed_shop()
    monkeypatch.setenv(OWNER_API_FLAG, "true")
    with SessionLocal() as db:
        capability = create_shop_capability(
            db,
            shop=db.get(MarketplaceShop, 1),
            actor_user_id=1,
            owner_description="Appliance delivery",
            role_code="delivers",
        )
        update_shop_capability(
            db,
            capability=capability,
            actor_user_id=1,
            availability_status="available",
            replace_coverage=[
                {"scope_type": "country", "country_code": "NG"},
                {"scope_type": "remote"},
            ],
        )
        payload = serialize_capability(db, capability=capability)

        assert payload["mapping_status"] == "unmapped"
        assert payload["availability"]["status"] == "available"
        assert {item["scope_type"] for item in payload["coverage"]} == {"country", "remote"}
