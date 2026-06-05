from decimal import Decimal

import pytest

from app.services.expected_payments_service import (
    calc_spotlight_subscription_amount as calc_expected_spotlight_amount,
)
from app.services.payment_instruction_service import (
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
