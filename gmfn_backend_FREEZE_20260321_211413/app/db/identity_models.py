from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


class DeviceFingerprint(Base):
    __tablename__ = "device_fingerprints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    fingerprint_hash: Mapped[str] = mapped_column(String(128), nullable=False, index=True)

    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)

    __table_args__ = (
        Index("ix_device_fingerprint_hash_user_v1", "fingerprint_hash", "user_id"),
    )


class IdentityRiskSignal(Base):
    __tablename__ = "identity_risk_signals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    signal_type: Mapped[str] = mapped_column(String(64), nullable=False)
    severity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    description: Mapped[str] = mapped_column(Text, nullable=False)
    meta_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)


class IdentityCluster(Base):
    __tablename__ = "identity_clusters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    root_user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    linked_user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    reason: Mapped[str] = mapped_column(String(128), nullable=False)
    confidence: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)

    __table_args__ = (
        Index("ix_identity_cluster_root_linked_v1", "root_user_id", "linked_user_id"),
    )