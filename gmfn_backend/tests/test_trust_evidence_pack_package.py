from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base as CoreBase
from app.db.models import TrustEvent
from app.services.trust_evidence_pack_service import _events_like, _latest_event


def _session():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    CoreBase.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    return engine, SessionLocal()


def test_trust_evidence_pack_shipment_events_redact_operational_fields():
    engine, db = _session()
    try:
        db.add(
            TrustEvent(
                event_type="merchant.dispatched",
                clan_id=3,
                loan_id=77,
                guarantor_id=44,
                actor_user_id=9,
                subject_user_id=10,
                meta={
                    "tracking_reference": "PRIVATE-SHIP-001",
                    "recipient_phone": "+2348000000000",
                },
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

        events = _events_like(db, user_id=10, prefix="merchant.")

        assert events
        event = events[0]
        assert event["event_type"] == "merchant.dispatched"
        assert event["reference_label"] == "Private delivery/support record"
        assert event["detail_boundary"] == "Private operational details redacted for evidence pack"
        assert "loan_id" not in event
        assert "clan_id" not in event
        assert "guarantor_id" not in event
        assert "actor_user_id" not in event
        assert "subject_user_id" not in event
        assert "meta" not in event
        assert "PRIVATE-SHIP-001" not in str(events)
        assert "+2348000000000" not in str(events)
    finally:
        db.close()
        engine.dispose()


def test_trust_evidence_pack_delivery_confirmation_redacts_operational_fields():
    engine, db = _session()
    try:
        db.add(
            TrustEvent(
                event_type="merchant.delivery_confirmed",
                clan_id=3,
                loan_id=78,
                guarantor_id=45,
                actor_user_id=9,
                subject_user_id=10,
                meta={"payment_reference": "PRIVATE-DELIVERY-REF"},
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

        event = _latest_event(db, user_id=10, event_type="merchant.delivery_confirmed")

        assert event
        assert event["reference_label"] == "Private delivery/support record"
        assert "payment_reference" not in str(event)
        assert "PRIVATE-DELIVERY-REF" not in str(event)
        assert "loan_id" not in event
        assert "actor_user_id" not in event
        assert "subject_user_id" not in event
        assert "meta" not in event
    finally:
        db.close()
        engine.dispose()
