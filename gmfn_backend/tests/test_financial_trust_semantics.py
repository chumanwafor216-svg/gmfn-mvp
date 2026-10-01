from __future__ import annotations

from sqlalchemy import text

from app.db.database import engine


def test_legacy_guarantor_suggestions_do_not_rank_by_general_trust_score(
    client,
    override_clan_ctx_admin,
    seed_clan_admin_membership,
    seed_loan,
):
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO users (id, email, hashed_password, role, trust_score, trust_band)
                VALUES
                    (2, 'support-low-trust@example.com', 'hashed', 'user', 10, 'E'),
                    (3, 'support-high-trust@example.com', 'hashed', 'user', 99, 'A')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES
                    (2201, 1, 2, 'user', 0),
                    (2202, 1, 3, 'user', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO loans (id, borrower_user_id, amount, currency, status, clan_id, guarantors_required)
                VALUES
                    (2201, 1, 100, 'GBP', 'approved', 1, 1),
                    (2202, 1, 100, 'GBP', 'approved', 1, 1)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO loan_guarantors (
                    id, loan_id, clan_id, guarantor_user_id, pledge_amount, status
                )
                VALUES
                    (2201, 2201, 1, 2, 10.00, 'approved'),
                    (2202, 2202, 1, 2, 10.00, 'approved')
                """
            )
        )

    response = client.get('/loans/1/guarantors/suggestions?limit=2')

    assert response.status_code == 200, response.text
    items = response.json()['items']
    assert [item['user_id'] for item in items[:2]] == [2, 3]
    assert items[0]['reliability_score'] == 4
    assert items[0]['trust_score'] is None
    assert items[0]['trust_band'] is None
    assert 'general Trust score/band is not used' in items[0]['reason']


def test_readiness_plan_rejects_non_member_scope(client, override_current_user_user):
    response = client.get('/loans/readiness/plan?clan_id=1&requested_amount=100')

    assert response.status_code == 403, response.text
    assert 'readiness' in response.text.lower() or 'community' in response.text.lower()


def test_readiness_plan_rejects_non_admin_inspecting_another_borrower(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO users (id, email, hashed_password, role)
                VALUES (2, 'other-borrower@example.com', 'hashed', 'user')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES (2302, 1, 2, 'user', 0)
                """
            )
        )

    response = client.get(
        '/loans/readiness/plan?clan_id=1&requested_amount=100&borrower_user_id=2'
    )

    assert response.status_code == 403, response.text
    assert 'another borrower' in response.text


def test_readiness_plan_allows_self_member_and_labels_planning_semantics(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    response = client.get('/loans/readiness/plan?clan_id=1&requested_amount=100')

    assert response.status_code == 200, response.text
    body = response.json()
    assert body['borrower_user_id'] == 1
    assert body['semantics']['recommendation_label'] == 'planning_reading'
    assert body['semantics']['not_loan_approval'] is True
    assert body['semantics']['not_endorsement'] is True

def test_social_graph_breadth_does_not_increase_literal_available_capacity(
    seed_clan_admin_membership,
):
    from app.db.database import SessionLocal
    from app.services.liquidity_engine_service import build_user_liquidity_profile

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role, personal_pool_balance)
                VALUES (3001, 'capacity-social@example.com', 'hashed', 'user', 100.00)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES (3001, 1, 3001, 'user', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO trust_events (
                    event_type, clan_id, actor_user_id, subject_user_id, meta_json, dedupe_key
                )
                VALUES
                    ('invited_by', 1, 1, 3001, '{"source":"test-social"}', 'capacity-social-1'),
                    ('co_membership', 1, 1, 3001, '{"source":"test-social"}', 'capacity-social-2'),
                    ('successfully_onboarded', 1, 3001, 1, '{"source":"test-social"}', 'capacity-social-3')
                """
            )
        )

    db = SessionLocal()
    try:
        profile = build_user_liquidity_profile(db, 3001)
    finally:
        db.close()

    assert profile['personal_pool_balance'] == '100.00'
    assert profile['available_guarantee_capacity'] == '100.00'
    assert profile['current_gsn_backed_capacity'] == '100.00'
    assert profile['guarantee_capacity_multiplier'] == '1.00'


def test_locked_exposure_reduces_literal_available_capacity(seed_clan_admin_membership):
    from app.db.database import SessionLocal
    from app.services.liquidity_engine_service import build_user_liquidity_profile

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role, personal_pool_balance)
                VALUES (3002, 'capacity-locked@example.com', 'hashed', 'user', 100.00)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES (3002, 1, 3002, 'user', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO loans (id, borrower_user_id, amount, currency, status, clan_id, guarantors_required)
                VALUES (3002, 1, 100.00, 'GBP', 'approved', 1, 1)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO loan_guarantors (
                    id, loan_id, clan_id, guarantor_user_id, pledge_amount,
                    status, is_locked, locked_amount, released_amount
                )
                VALUES (3002, 3002, 1, 3002, 40.00, 'approved', 1, 40.00, 0.00)
                """
            )
        )

    db = SessionLocal()
    try:
        profile = build_user_liquidity_profile(db, 3002)
    finally:
        db.close()

    assert profile['current_locked_guarantees'] == '40.00'
    assert profile['available_guarantee_capacity'] == '60.00'
    assert profile['current_gsn_backed_capacity'] == '60.00'


def test_historical_guarantor_evidence_does_not_imply_current_willingness(
    seed_clan_admin_membership,
):
    from app.db.database import SessionLocal
    from app.services.guarantor_selection_service import build_loan_guarantor_suggestions

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role, personal_pool_balance)
                VALUES (3003, 'support-history@example.com', 'hashed', 'user', 100.00)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES (3003, 1, 3003, 'user', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO loans (id, borrower_user_id, amount, currency, status, clan_id, guarantors_required, guarantee_gap)
                VALUES
                    (3003, 1, 100.00, 'GBP', 'repaid', 1, 1, 0.00),
                    (3004, 1, 60.00, 'GBP', 'pending', 1, 1, 60.00)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO loan_guarantors (
                    id, loan_id, clan_id, guarantor_user_id, pledge_amount,
                    status, is_locked, locked_amount, released_amount
                )
                VALUES (3003, 3003, 1, 3003, 20.00, 'released', 0, 0.00, 20.00)
                """
            )
        )

    db = SessionLocal()
    try:
        suggestions = build_loan_guarantor_suggestions(db, 3004, limit=3)
    finally:
        db.close()

    assert suggestions['suggestions']
    candidate = suggestions['suggestions'][0]
    assert candidate['user_id'] == 3003
    assert candidate['historical_obligation_evidence']['support_follow_through_count'] == 1
    assert candidate['current_willingness'] == 'unknown_until_explicit_response'
    assert 'prove willingness' in suggestions['semantics']['boundary']
