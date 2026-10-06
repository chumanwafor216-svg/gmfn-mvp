from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.exc import IntegrityError, ProgrammingError
from sqlalchemy.orm import sessionmaker
from starlette.requests import Request

from app.main import app
from app.api.routes import trust_slips as trust_slips_route
from app.db.models import Clan, ClanMembership, Loan, TrustEvent, TrustSlip, User
from app.services import trust_slips_services
from app.services.financial_obligation_evidence_service import build_financial_obligation_evidence
from app.services.loan_readiness_service import build_loan_readiness_plan
from app.services.trust_slip_decision_packs import build_decision_pack_evidence_extract
from app.services.trust_slips_services import get_trust_slip_payload, reissue_trust_slip


POSTGRES_URL = (
    os.getenv("TRUSTSLIP_REPAIR_POSTGRES_URL")
    or os.getenv("TEST_POSTGRES_DATABASE_URL")
    or ""
).strip()

if not POSTGRES_URL:
    pytest.skip(
        "PostgreSQL acceptance blocked: set TRUSTSLIP_REPAIR_POSTGRES_URL to an explicit disposable non-production database.",
        allow_module_level=True,
    )


def _assert_explicit_disposable_url(url: str) -> None:
    lowered = url.lower()
    forbidden = ("render", "prod", "production", "neon.tech", "amazonaws.com", "azure.com")
    if any(token in lowered for token in forbidden):
        raise RuntimeError(
            "Refusing PostgreSQL TrustSlip regression tests against a production-like database URL."
        )
    if not any(token in lowered for token in ("test", "trustslip", "local", "ci")):
        raise RuntimeError(
            "TRUSTSLIP_REPAIR_POSTGRES_URL must visibly identify a disposable test/local/ci database."
        )


_assert_explicit_disposable_url(POSTGRES_URL)


@pytest.fixture(scope="module")
def pg_engine():
    engine = create_engine(POSTGRES_URL, future=True)
    backend_root = Path(__file__).resolve().parents[1]
    alembic_cfg = Config(str(backend_root / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(backend_root / "alembic"))

    with engine.connect() as connection:
        target = connection.execute(
            text(
                """
                SELECT version(), current_database(), current_user,
                       inet_server_addr()::text, inet_server_port()
                """
            )
        ).one()
        assert "PostgreSQL 18" in target[0]
        assert target[1] == "trustslip_accept_test_20261006"
        assert target[2] == "trustslip_test_user"

    with engine.begin() as connection:
        connection.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        connection.execute(text("CREATE SCHEMA public"))
        alembic_cfg.attributes["connection"] = connection
        command.upgrade(alembic_cfg, "head")

    yield engine

    with engine.begin() as connection:
        connection.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        connection.execute(text("CREATE SCHEMA public"))
    engine.dispose()


@pytest.fixture()
def pg_session(pg_engine):
    Session = sessionmaker(bind=pg_engine, future=True)
    session = Session()
    try:
        seed_trustslip_borrower_fixture(session)
        yield session
    finally:
        session.close()


def _fresh_session(pg_engine):
    return sessionmaker(bind=pg_engine, future=True)()


def _assert_disposable_postgres_session(session) -> None:
    target = session.execute(
        text(
            """
            SELECT version(), current_database(), current_user,
                   inet_server_addr()::text, inet_server_port()
            """
        )
    ).one()
    assert "PostgreSQL 18" in target[0]
    assert target[1] == "trustslip_accept_test_20261006"
    assert target[2] == "trustslip_test_user"


@pytest.fixture()
def pg_http_client(pg_engine):
    Session = sessionmaker(bind=pg_engine, future=True)
    connection_checks: list[tuple[str, str]] = []
    current_user = User(
        id=1,
        email="trustslip-pg-holder@example.test",
        hashed_password="hashed",
        display_name="Postgres Holder",
        role="user",
        gmfn_id="GSN-U-PG0001",
        phone_e164="+15550009999",
        phone_verified_at=datetime.now(timezone.utc),
    )

    def override_db():
        session = Session()
        try:
            _assert_disposable_postgres_session(session)
            connection_checks.append(
                (
                    session.get_bind().engine.url.get_backend_name(),
                    session.execute(text("SELECT current_database()")).scalar_one(),
                )
            )
            yield session
        finally:
            session.close()

    def override_current_user():
        return current_user

    previous_overrides = dict(app.dependency_overrides)
    app.dependency_overrides[trust_slips_route.get_db] = override_db
    app.dependency_overrides[trust_slips_route.get_current_user] = override_current_user
    try:
        with TestClient(app) as client:
            yield client, connection_checks
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)


def seed_trustslip_borrower_fixture(db) -> None:
    db.execute(
        text(
            """
            TRUNCATE TABLE
                trust_slip_decision_pack_access,
                trust_slip_decision_pack_consent_share,
                trust_slips,
                trust_events,
                loan_guarantors,
                loans,
                clan_memberships,
                clans,
                users
            RESTART IDENTITY CASCADE
            """
        )
    )
    db.commit()

    now = datetime.now(timezone.utc)
    db.add_all(
        [
            User(
                id=1,
                email="trustslip-pg-holder@example.test",
                hashed_password="hashed",
                display_name="Postgres Holder",
                role="user",
                gmfn_id="GSN-U-PG0001",
                phone_e164="+15550009999",
                phone_verified_at=now,
            ),
            User(
                id=2,
                email="trustslip-pg-other@example.test",
                hashed_password="hashed",
                display_name="Other Borrower",
                role="user",
                gmfn_id="GSN-U-PG0002",
                phone_e164="+15550009998",
                phone_verified_at=now,
            ),
            Clan(
                id=1,
                name="TrustSlip PG Clan",
                invite_code="trustslip-pg-clan",
                community_code="GSN-C-PG0001",
                status="active",
                invite_uses=0,
                created_at=now,
            ),
            Clan(
                id=2,
                name="Other PG Clan",
                invite_code="trustslip-pg-other-clan",
                community_code="GSN-C-PG0002",
                status="active",
                invite_uses=0,
                created_at=now,
            ),
            ClanMembership(
                id=1,
                clan_id=1,
                user_id=1,
                role="member",
                personal_pool_balance=Decimal("250.00"),
                created_at=now,
            ),
            ClanMembership(
                id=2,
                clan_id=1,
                user_id=2,
                role="member",
                personal_pool_balance=Decimal("250.00"),
                created_at=now,
            ),
        ]
    )
    db.add_all(
        [
            Loan(
                id=1,
                borrower_user_id="1",
                clan_id=1,
                amount=Decimal("100.00"),
                currency="NGN",
                status="repaid",
                paid_total=Decimal("100.00"),
                remaining_amount=Decimal("0.00"),
                repaid_at=now,
                created_at=now - timedelta(days=4),
            ),
            Loan(
                id=2,
                borrower_user_id="1",
                clan_id=1,
                amount=Decimal("150.00"),
                currency="NGN",
                status="pending",
                guarantee_gap=Decimal("150.00"),
                created_at=now - timedelta(days=3),
            ),
            Loan(
                id=3,
                borrower_user_id="2",
                clan_id=1,
                amount=Decimal("200.00"),
                currency="NGN",
                status="repaid",
                paid_total=Decimal("200.00"),
                remaining_amount=Decimal("0.00"),
                repaid_at=now,
                created_at=now - timedelta(days=2),
            ),
            Loan(
                id=4,
                borrower_user_id="1",
                clan_id=2,
                amount=Decimal("300.00"),
                currency="NGN",
                status="repaid",
                paid_total=Decimal("300.00"),
                remaining_amount=Decimal("0.00"),
                repaid_at=now,
                created_at=now - timedelta(days=1),
            ),
        ]
    )
    db.add(
        TrustSlip(
            id=1,
            code="PG-BORROWER-OLD",
            clan_id=1,
            holder_user_id=1,
            trust_limit=Decimal("100.00"),
            currency="NGN",
            status="active",
            expires_at=now + timedelta(days=7),
            created_at=now,
            is_current=True,
        )
    )
    db.commit()
    for table_name in ("users", "clans", "clan_memberships", "loans", "trust_slips"):
        db.execute(
            text(
                f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), "
                f"COALESCE((SELECT MAX(id) FROM {table_name}), 1))"
            )
        )
    db.commit()


def _public_request(query_string: bytes = b"") -> Request:
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/trust-slips/verify/PG-BORROWER-OLD",
            "query_string": query_string,
            "headers": [],
            "client": ("127.0.0.1", 12345),
            "server": ("testserver", 80),
            "scheme": "http",
        }
    )


def test_postgres_physical_borrower_user_id_is_varchar_and_original_predicate_fails(pg_session):
    column_type = pg_session.execute(
        text(
            """
            SELECT data_type
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'loans'
              AND column_name = 'borrower_user_id'
            """
        )
    ).scalar_one()

    assert column_type == "character varying"

    with pytest.raises(ProgrammingError) as exc_info:
        pg_session.query(Loan).filter(Loan.borrower_user_id == int(1)).all()
    assert "operator does not exist" in str(exc_info.value).lower()
    pg_session.rollback()


def test_postgres_repaired_borrower_match_returns_scoped_evidence_without_leakage(pg_session):
    clan_one_evidence = build_financial_obligation_evidence(pg_session, user_id=1, clan_id=1)
    assert clan_one_evidence["completed_repayment_obligations"] == 1
    assert clan_one_evidence["positive_signal_count"] == 1

    all_community_evidence = build_financial_obligation_evidence(pg_session, user_id=1)
    assert all_community_evidence["completed_repayment_obligations"] == 2

    other_user_evidence = build_financial_obligation_evidence(pg_session, user_id=2, clan_id=1)
    assert other_user_evidence["completed_repayment_obligations"] == 1

    readiness = build_loan_readiness_plan(
        pg_session,
        clan_id=1,
        requested_amount="100.00",
        borrower_user_id=1,
    )
    assert readiness["borrower_user_id"] == 1
    assert readiness["clan_id"] == 1


def test_postgres_holder_summary_and_public_verification_load_expected_evidence(pg_session, monkeypatch):
    monkeypatch.setattr(trust_slips_route, "_throttle_public", lambda *args, **kwargs: None)
    holder = pg_session.get(User, 1)

    holder_payload = trust_slips_route._ensure_my_trust_slip_payload(pg_session, current_user=holder)
    summary_payload = trust_slips_route.get_my_trust_slip_summary(db=pg_session, current_user=holder)
    public_payload = trust_slips_route.verify_trust_slip_public(
        "PG-BORROWER-OLD",
        request=_public_request(b"decision_pack=housing_decision"),
        level="standard",
        db=pg_session,
    )

    for payload in (holder_payload, summary_payload):
        assert payload["code"] == "PG-BORROWER-OLD"
        assert payload["evidence_summary"]["capacity_context"]["evidence_state"] == "loaded"
        assert payload["evidence_summary"]["readiness_context"]["evidence_state"] == "loaded"
        assert payload["evidence_summary"]["capacity_context"].get("source") != "liquidity_profile"

    assert public_payload["code"] == "PG-BORROWER-OLD"
    assert public_payload["decision_pack"] == "housing_decision"
    assert public_payload["share_access_record"]["status"] == "backend_access_recorded"
    assert public_payload["decision_pack_profile"]["decision_pack"] == "housing_decision"
    assert public_payload["decision_pack_profile"]["relevant_signals"]
    assert public_payload["decision_pack_profile"]["evidence_extract"]["record_pointers"]


def test_postgres_reissue_produces_code_preserves_snapshots_and_single_current(pg_session, pg_engine):
    result = reissue_trust_slip(
        pg_session,
        user_id=1,
        reason="postgres_borrower_reference_regression",
        include_payload=True,
        preferred_clan_id=1,
    )
    assert result["ok"] is True
    assert result["old_trust_slip_id"] == 1
    assert result["new_trust_slip_id"] != 1
    assert result["code"] != "PG-BORROWER-OLD"
    assert result["trust_slip_id"] != 1

    pg_session.close()
    fresh = _fresh_session(pg_engine)
    try:
        slips = fresh.query(TrustSlip).order_by(TrustSlip.id.asc()).all()
        assert len(slips) == 2
        old, new = slips
        assert old.code == "PG-BORROWER-OLD"
        assert old.is_current is False
        assert old.superseded_by_trust_slip_id == new.id
        assert old.snapshot_json
        assert new.code == result["code"]
        assert new.is_current is True
        assert new.supersedes_trust_slip_id == old.id
        assert new.snapshot_json
        assert fresh.query(TrustSlip).filter(TrustSlip.is_current.is_(True)).count() == 1
    finally:
        fresh.close()


def test_postgres_public_decision_pack_uses_text_borrower_match(pg_session):
    public_payload = trust_slips_route._payload_with_identity(
        pg_session,
        user_id=1,
        requested_level="standard",
    )
    slip = pg_session.query(TrustSlip).filter(TrustSlip.code == "PG-BORROWER-OLD").one()
    extract = build_decision_pack_evidence_extract(
        pg_session,
        slip=slip,
        context={"decision_pack_key": "housing_decision"},
    )

    assert public_payload["user_id"] == 1
    assert extract["source"] == "trust_events_redacted_extract"
    assert extract["record_pointers"]


def test_postgres_optional_evidence_statement_error_does_not_poison_following_reads_or_outer_write(pg_session, pg_engine, monkeypatch):
    pending_event = TrustEvent(
        event_type="trustslip.acceptance.synthetic_outer_write",
        clan_id=1,
        actor_user_id=1,
        subject_user_id=1,
        meta={"scope": "postgres_acceptance"},
        created_at=datetime.now(timezone.utc),
    )
    pg_session.add(pending_event)

    def broken_capacity_reader(db, user_id):
        db.execute(text("SELECT * FROM definitely_missing_trustslip_optional_table"))

    monkeypatch.setattr(trust_slips_services, "build_user_liquidity_profile", broken_capacity_reader)

    payload = get_trust_slip_payload(pg_session, user_id=1, preferred_clan_id=1)
    pg_session.commit()

    assert payload["evidence_summary"]["capacity_context"] == {
        "source": "liquidity_profile",
        "source_note": "Liquidity and guarantee-capacity evidence could not be read for this TrustSlip.",
        "plain_language": (
            "This TrustSlip could not load current support-capacity evidence. "
            "Ask for the fuller Trust Passport if the decision carries risk."
        ),
        "evidence_state": "unavailable",
        "available": False,
    }
    assert payload["evidence_summary"]["readiness_context"]["evidence_state"] == "loaded"
    assert payload["evidence_summary"]["community_participation"]["status_label"]

    fresh = _fresh_session(pg_engine)
    try:
        assert (
            fresh.query(TrustEvent)
            .filter(TrustEvent.event_type == "trustslip.acceptance.synthetic_outer_write")
            .count()
            == 1
        )
    finally:
        fresh.close()


def test_postgres_pre_savepoint_flush_failure_propagates_and_preserves_current_slip(pg_session, pg_engine):
    old_slip = pg_session.query(TrustSlip).filter(TrustSlip.code == "PG-BORROWER-OLD").one()
    reader_called = False
    nested_started = []
    cleanup_ran = False

    def record_after_begin(session, transaction, connection):
        if transaction.nested:
            nested_started.append(True)

    event.listen(pg_session, "after_begin", record_after_begin)

    def optional_reader():
        nonlocal reader_called
        reader_called = True
        return {"evidence_state": "loaded", "available": True}

    def owning_reissue_cleanup_boundary():
        nonlocal cleanup_ran
        old_slip.is_current = False
        pg_session.add(
            TrustSlip(
                code=None,
                clan_id=1,
                holder_user_id=1,
                trust_limit=Decimal("100.00"),
                currency="NGN",
                status="active",
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
                created_at=datetime.now(timezone.utc),
                is_current=True,
                issued_reason="synthetic_pre_savepoint_flush_failure",
                supersedes_trust_slip_id=int(old_slip.id),
            )
        )
        try:
            return trust_slips_services._read_optional_evidence_with_savepoint(
                pg_session,
                optional_reader,
                source="liquidity_profile",
                source_note="Liquidity and guarantee-capacity evidence could not be read for this TrustSlip.",
                plain_language=(
                    "This TrustSlip could not load current support-capacity evidence. "
                    "Ask for the fuller Trust Passport if the decision carries risk."
                ),
            )
        except Exception:
            cleanup_ran = True
            pg_session.rollback()
            raise

    try:
        with pytest.raises(IntegrityError) as exc_info:
            owning_reissue_cleanup_boundary()
    finally:
        event.remove(pg_session, "after_begin", record_after_begin)

    assert "null value in column" in str(exc_info.value).lower()
    assert "code" in str(exc_info.value).lower()
    assert reader_called is False
    assert nested_started == []
    assert cleanup_ran is True

    pg_session.close()
    fresh = _fresh_session(pg_engine)
    try:
        slips = fresh.query(TrustSlip).order_by(TrustSlip.id.asc()).all()
        assert len(slips) == 1
        assert slips[0].code == "PG-BORROWER-OLD"
        assert slips[0].is_current is True
        assert slips[0].superseded_by_trust_slip_id is None
        assert (
            fresh.query(TrustSlip)
            .filter(TrustSlip.issued_reason == "synthetic_pre_savepoint_flush_failure")
            .count()
            == 0
        )
    finally:
        fresh.close()


def test_postgres_http_reissue_holder_summary_and_public_verify_use_disposable_database(
    pg_session,
    pg_engine,
    pg_http_client,
):
    _assert_disposable_postgres_session(pg_session)
    client, connection_checks = pg_http_client

    reissue_response = client.post(
        "/trust-slips/me/reissue",
        json={
            "reason": "http_postgres_borrower_reference_regression",
            "force": True,
            "community_id": 1,
        },
    )
    assert reissue_response.status_code == 200, reissue_response.text
    reissue_payload = reissue_response.json()
    returned_code = reissue_payload["code"]
    assert reissue_payload["ok"] is True
    assert reissue_payload["reissued"] is True
    assert returned_code
    assert returned_code != "PG-BORROWER-OLD"

    me_response = client.get("/trust-slips/me")
    summary_response = client.get("/trust-slips/me/summary")
    verify_response = client.get(
        f"/trust-slips/verify/{returned_code}",
        params={"decision_pack": "housing_decision"},
    )

    assert me_response.status_code == 200, me_response.text
    assert summary_response.status_code == 200, summary_response.text
    assert verify_response.status_code == 200, verify_response.text

    me_payload = me_response.json()
    summary_payload = summary_response.json()
    verify_payload = verify_response.json()

    for payload in (me_payload, summary_payload):
        assert payload["code"] == returned_code
        assert payload["evidence_summary"]["capacity_context"]["evidence_state"] == "loaded"
        assert payload["evidence_summary"]["readiness_context"]["evidence_state"] == "loaded"
        assert payload["evidence_summary"]["capacity_context"].get("source") != "liquidity_profile"
        assert payload["evidence_summary"]["readiness_context"].get("source") != "loan_readiness_plan"

    assert verify_payload["code"] == returned_code
    assert verify_payload["decision_pack"] == "housing_decision"
    assert verify_payload["decision_pack_profile"]["decision_pack"] == "housing_decision"
    assert verify_payload["decision_pack_profile"]["relevant_signals"]
    assert verify_payload["decision_pack_profile"]["evidence_extract"]["record_pointers"]

    assert len(connection_checks) >= 4
    assert all(
        backend == "postgresql" and database == "trustslip_accept_test_20261006"
        for backend, database in connection_checks
    )

    pg_session.close()
    fresh = _fresh_session(pg_engine)
    try:
        current = (
            fresh.query(TrustSlip)
            .filter(
                TrustSlip.holder_user_id == 1,
                TrustSlip.is_current.is_(True),
            )
            .one()
        )
        assert current.code == returned_code
        assert current.snapshot_json
        assert fresh.query(TrustSlip).filter(TrustSlip.is_current.is_(True)).count() == 1
    finally:
        fresh.close()


def test_postgres_critical_snapshot_failure_leaves_previous_current_from_fresh_session(pg_session, pg_engine, monkeypatch):
    old_slip = pg_session.query(TrustSlip).filter(TrustSlip.code == "PG-BORROWER-OLD").one()
    old_slip.snapshot_json = json.dumps({"snapshot_version": "existing", "full_summary": {}, "merchant_view": {}})
    old_slip.snapshot_version = "existing"
    pg_session.commit()

    def broken_store(*args, **kwargs):
        raise RuntimeError("synthetic critical snapshot failure")

    monkeypatch.setattr(trust_slips_services, "store_trust_slip_snapshot", broken_store)

    with pytest.raises(RuntimeError, match="synthetic critical snapshot failure"):
        reissue_trust_slip(
            pg_session,
            user_id=1,
            reason="critical_snapshot_failure_regression",
            preferred_clan_id=1,
        )

    pg_session.close()
    fresh = _fresh_session(pg_engine)
    try:
        slips = fresh.query(TrustSlip).order_by(TrustSlip.id.asc()).all()
        assert len(slips) == 1
        assert slips[0].code == "PG-BORROWER-OLD"
        assert slips[0].is_current is True
        assert slips[0].superseded_by_trust_slip_id is None
    finally:
        fresh.close()
