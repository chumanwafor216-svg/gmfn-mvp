from app.services.notification_service import normalize_notification_action


def test_pool_deposit_notification_points_to_finance_file_even_when_historic_row_is_stale():
    action_url, action_label = normalize_notification_action(
        kind="pool.deposit_confirmed",
        title="Your deposit was confirmed",
        message="Your pool deposit of 100 NGN has been confirmed.",
        action_url="/app/loans",
        action_label="View Finances",
    )

    assert action_url == "/app/finance"
    assert action_label == "Open Finance File"


def test_old_support_notification_label_is_translated_to_loans_support():
    action_url, action_label = normalize_notification_action(
        kind="guarantor.request",
        title="A guarantee request needs your attention",
        message="Someone is asking for your support.",
        action_url="/app/loans",
        action_label="Open Finances",
    )

    assert action_url == "/app/loans"
    assert action_label == "Open Loans & Support"


def test_old_pool_deposit_label_is_translated_to_money_in():
    action_url, action_label = normalize_notification_action(
        kind="assistant.nudge",
        title="Build your future gradually",
        message="Would you like to put a little aside for your future?",
        action_url="/app/payment/pool?currency=NGN",
        action_label="Deposit to Pool",
    )

    assert action_url == "/app/payment/pool?currency=NGN"
    assert action_label == "Open Money In"
