from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class IdentityVerificationCheck(Base):
    __tablename__ = "identity_verification_checks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    entry_phone_verification_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("entry_phone_verifications.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    verification_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    region_code: Mapped[Optional[str]] = mapped_column(String(16), nullable=True, index=True)
    provider_key: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="pending",
        server_default="pending",
        index=True,
    )
    subject_reference: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    confidence_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    submitted_payload_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    normalized_identity_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    provider_response_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
