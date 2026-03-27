from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(Integer, primary_key=True, index=True)

    clan_id = Column(Integer, nullable=False)
    loan_id = Column(Integer, nullable=False)
    merchant_id = Column(Integer, nullable=True)

    opened_by_user_id = Column(Integer, nullable=False)

    reason = Column(Text, nullable=False)

    status = Column(String, nullable=False, default="opened")
    # opened | under_review | resolved_upheld | resolved_reversed

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))