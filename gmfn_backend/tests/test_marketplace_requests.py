import pytest
from fastapi import HTTPException
from sqlalchemy import text

from app.api.routes import marketplace_requests, pool
from app.db.database import SessionLocal, engine
from app.schemas.marketplace_requests import MarketplaceRequestCreate


class Obj:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


def _fake_current_user():
    return Obj(id=1, email="pytest@example.com", role="admin", gmfn_id="GSN-U-TEST")


def _seed_primary_clan() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role, gmfn_id)
                VALUES (1, 'pytest@example.com', 'hashed', 'admin', 'GSN-U-TEST')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans
                    (
                        id,
                        name,
                        marketplace_name,
                        community_code,
                        status,
                        invite_code,
                        invite_uses,
                        created_at
                    )
                VALUES (
                    1,
                    'Test Clan',
                    'Test Marketplace',
                    'GMFN-C-000001',
                    'active',
                    'invite-test-1',
                    0,
                    CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships
                    (id, clan_id, user_id, role, personal_pool_balance)
                VALUES (1, 1, 1, 'admin', 0)
                """
            )
        )
        clan_count = conn.execute(text("SELECT COUNT(*) FROM clans WHERE id = 1")).scalar()
        membership_count = conn.execute(
            text(
                """
                SELECT COUNT(*) FROM clan_memberships
                WHERE clan_id = 1 AND user_id = 1 AND left_at IS NULL
                """
            )
        ).scalar()
        assert clan_count == 1
        assert membership_count == 1


def _add_second_clan_for_user() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO clans
                    (
                        id,
                        name,
                        marketplace_name,
                        community_code,
                        status,
                        invite_code,
                        invite_uses,
                        created_at
                    )
                VALUES (
                    2,
                    'Second Clan',
                    'Second Marketplace',
                    'GMFN-C-000002',
                    'active',
                    'invite-test-2',
                    0,
                    CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships
                    (clan_id, user_id, role, personal_pool_balance)
                VALUES (2, 1, 'member', 0)
                """
            )
        )


def test_marketplace_request_stores_selected_community():
    _seed_primary_clan()

    with SessionLocal() as db:
        response = marketplace_requests.create_marketplace_request(
            MarketplaceRequestCreate(
                clan_id=1,
                title="Need a plumber",
                description="Kitchen pipe needs help.",
            ),
            db=db,
            current_user=_fake_current_user(),
        )
        data = response.model_dump()

        rows = marketplace_requests.list_marketplace_requests(
            db=db,
            current_user=_fake_current_user(),
            status="open",
            category=None,
            urgency=None,
            area=None,
            mine_only=False,
            clan_id=1,
            limit=50,
        )

    assert data["clan_id"] == 1
    assert data["community_code"] == "GMFN-C-000001"
    assert data["clan_name"] == "Test Clan"
    assert len(rows) == 1
    assert rows[0].clan_id == 1


def test_marketplace_request_requires_community_when_user_has_many():
    _seed_primary_clan()
    _add_second_clan_for_user()

    with SessionLocal() as db:
        with pytest.raises(HTTPException) as exc:
            marketplace_requests.create_marketplace_request(
                MarketplaceRequestCreate(
                    title="Need a painter",
                    description="Small room painting.",
                ),
                db=db,
                current_user=_fake_current_user(),
            )

    assert exc.value.status_code == 400
    assert "Choose the community" in exc.value.detail


def test_pool_summary_combines_member_communities():
    _seed_primary_clan()
    _add_second_clan_for_user()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO pool_events
                    (clan_id, user_id, event_type, amount, currency, reference)
                VALUES
                    (1, 1, 'deposit.confirmed', 100, 'NGN', 'R1'),
                    (2, 1, 'deposit.confirmed', 50, 'NGN', 'R2')
                """
            )
        )

    with SessionLocal() as db:
        data = pool.pool_me_summary(
            currency="NGN",
            db=db,
            current_user=_fake_current_user(),
        )

    assert data["communities_count"] == 2
    assert data["totals"]["available_balance"] == "150.00"
    assert len(data["items"]) == 2
