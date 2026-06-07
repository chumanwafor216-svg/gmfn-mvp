from decimal import Decimal

import pytest

from app.services.expected_payments_service import (
    calc_spotlight_subscription_amount as calc_expected_spotlight_amount,
)
from app.services.payment_instruction_service import (
    COMMUNITY_PACKAGE_CATALOG,
    build_community_package_reference,
    calc_community_package_amount,
    calc_community_package_amount_for_code,
    calc_spotlight_subscription_amount as calc_instruction_spotlight_amount,
)


@pytest.mark.parametrize(
    ("quantity", "amount"),
    [
        (1, Decimal("1.00")),
        (5, Decimal("5.00")),
        (6, Decimal("5.00")),
        (7, Decimal("6.00")),
        (14, Decimal("12.00")),
        (30, Decimal("25.00")),
    ],
)
def test_spotlight_subscription_pricing_extends_credit_bundles(quantity, amount):
    assert calc_instruction_spotlight_amount(quantity) == amount
    assert calc_expected_spotlight_amount(quantity) == amount


@pytest.mark.parametrize("quantity", [0, -1])
def test_spotlight_subscription_pricing_requires_positive_quantity(quantity):
    with pytest.raises(ValueError):
        calc_instruction_spotlight_amount(quantity)
    with pytest.raises(ValueError):
        calc_expected_spotlight_amount(quantity)


@pytest.mark.parametrize(
    ("quantity", "amount"),
    [
        (1, Decimal("1.00")),
        (6, Decimal("5.00")),
        (12, Decimal("10.00")),
    ],
)
def test_community_package_pricing_uses_paid_spotlight_bundle_rail(quantity, amount):
    assert calc_community_package_amount(quantity) == amount


def test_rosca_package_pricing_is_annual_sixty_pounds():
    assert calc_community_package_amount_for_code("rosca_cycle", 1) == Decimal("60.00")
    with pytest.raises(ValueError):
        calc_community_package_amount_for_code("rosca_cycle", 2)


def test_other_community_packages_keep_bundle_rail():
    assert calc_community_package_amount_for_code("community_meeting_pack", 6) == Decimal("5.00")


def test_community_package_catalog_contains_owner_package_features():
    assert COMMUNITY_PACKAGE_CATALOG["extra_shop_blocks"]["feature_code"] == "extra_shop_block"
    assert COMMUNITY_PACKAGE_CATALOG["extra_members"]["feature_code"] == "community_member_capacity"
    assert COMMUNITY_PACKAGE_CATALOG["rosca_cycle"]["feature_code"] == "rosca_cycle"
    assert COMMUNITY_PACKAGE_CATALOG["rosca_cycle"]["pricing_model"] == "annual_service"
    assert COMMUNITY_PACKAGE_CATALOG["rosca_cycle"]["annual_amount_gbp"] == "60.00"
    assert COMMUNITY_PACKAGE_CATALOG["community_meeting_pack"]["feature_code"] == "community_meeting_pack"


def test_community_package_reference_names_package_and_context():
    reference = build_community_package_reference(
        owner_user_id=7,
        clan_id=8,
        shop_id=9,
        package_code="extra_shop_blocks",
        quantity_total=2,
    )

    assert reference.startswith("GMFN-PACK-EXTRA-SHOP-BLOCKS-U7-C8-S9-Q2-ANNUAL-")
