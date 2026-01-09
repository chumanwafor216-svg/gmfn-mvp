from decimal import Decimal
from sqlalchemy import (
    String,
    Integer,
    DateTime,
    Numeric,
    ForeignKey,
    UniqueConstraint,
    ForeignKeyConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.database import Base


class Loan(Base):
    __tablename__ = "loans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    borrower_user_id: Mapped[int] = mapped_column(Integer, index=True)
    clan_id: Mapped[int] = mapped_column(Integer, index=True)

    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="NGN")
    guarantors_required: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    status: Mapped[str] = mapped_column(String(32), default="pending")
    decision_by_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    decision_at: Mapped["DateTime | None"] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String)

    role: Mapped[str] = mapped_column(String(20), default="user", server_default="user")
    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Clan(Base):
    __tablename__ = "clans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)

    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ClanMembership(Base):
    __tablename__ = "clan_memberships"

    __table_args__ = (
        UniqueConstraint("clan_id", "user_id", name="uq_clan_membership"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    clan_id: Mapped[int] = mapped_column(
        ForeignKey("clans.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    role: Mapped[str] = mapped_column(String(20), default="user", server_default="user")

    personal_pool_balance: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=0,
        server_default="0",
        nullable=False,
    )

    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

class LoanGuarantor(Base):
    __tablename__ = "loan_guarantors"

    __table_args__ = (
        # One guarantor per loan
        UniqueConstraint("loan_id", "guarantor_user_id", name="uq_loan_guarantor"),
        # ✅ DB-enforced: guarantor must be a clan member
        ForeignKeyConstraint(
            ["clan_id", "guarantor_user_id"],
            ["clan_memberships.clan_id", "clan_memberships.user_id"],
            name="fk_guarantor_must_be_clan_member",
            ondelete="RESTRICT",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    loan_id: Mapped[int] = mapped_column(ForeignKey("loans.id", ondelete="CASCADE"), index=True, nullable=False)
    clan_id: Mapped[int] = mapped_column(ForeignKey("clans.id", ondelete="CASCADE"), index=True, nullable=False)
    guarantor_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)

    pledge_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, server_default="0", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", server_default="pending", nullable=False)

    responded_at: Mapped["DateTime | None"] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
