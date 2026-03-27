from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class ClanMarketplace(Base):
    """
    One marketplace namespace per clan.
    """

    __tablename__ = "clan_marketplaces"

    __table_args__ = (
        UniqueConstraint("clan_id", name="uq_clan_marketplaces_clan_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    clan_id: Mapped[int] = mapped_column(
        ForeignKey("clans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_now,
        nullable=False,
    )


class MarketplaceShop(Base):
    """
    Individual shop owned by a clan member.
    """

    __tablename__ = "marketplace_shops"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    clan_id: Mapped[int] = mapped_column(
        ForeignKey("clans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    owner_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)

    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    whatsapp_number: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    telegram_handle: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default="1",
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_now,
        nullable=False,
        index=True,
    )


class MarketplaceProduct(Base):
    """
    Product listing inside a shop.
    """

    __tablename__ = "marketplace_products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    clan_id: Mapped[int] = mapped_column(
        ForeignKey("clans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    shop_id: Mapped[int] = mapped_column(
        ForeignKey("marketplace_shops.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    seller_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)

    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    price: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    currency: Mapped[Optional[str]] = mapped_column(
        String(8),
        nullable=True,
        default="NGN",
        server_default="NGN",
    )

    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default="1",
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_now,
        nullable=False,
        index=True,
    )


class MarketplaceFeed(Base):
    """
    Clan broadcast feed.
    Temporary posts like 'new goods arrived'.
    """

    __tablename__ = "marketplace_feed"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    clan_id: Mapped[int] = mapped_column(
        ForeignKey("clans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    author_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    message: Mapped[str] = mapped_column(Text, nullable=False)

    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_now,
        nullable=False,
        index=True,
    )