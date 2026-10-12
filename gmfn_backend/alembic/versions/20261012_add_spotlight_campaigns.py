"""add spotlight campaign identity

Revision ID: 20261012_spotlight_campaigns
Revises: 20261009_pipeline_credit_ledger
Create Date: 2026-10-12
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
import hashlib
import json
from typing import Any

from alembic import op
import sqlalchemy as sa


revision = "20261012_spotlight_campaigns"
down_revision = "20261009_pipeline_credit_ledger"
branch_labels = None
depends_on = None

CAMPAIGNS = "spotlight_campaigns"
BROADCASTS = "marketplace_broadcasts"
ACTIVE_STATUS = "active"
EXPIRED_STATUS = "expired"
LEGACY_PRESERVED_STATUS = "legacy_preserved"
DIRECT_SOURCE = "direct_broadcast"
REPOST_SOURCE = "network_repost"
CONTENT_KIND_BROADCAST = "broadcast_snapshot"
CONTENT_KIND_PRODUCT = "marketplace_product"
OPPORTUNITY_INTENT_UNSPECIFIED = "unspecified"
OPPORTUNITY_CATEGORY_UNSPECIFIED = "unspecified"
OPPORTUNITY_GEO_SCOPE_UNSPECIFIED = "unspecified"
OPPORTUNITY_AVAILABILITY_UNSPECIFIED = "unspecified"
OPPORTUNITY_INTENTS = ("offer", "need", "unspecified")
OPPORTUNITY_CATEGORIES = (
    "employment",
    "business_service",
    "product",
    "property",
    "education_training",
    "professional_service",
    "community_support",
    "event",
    "volunteering",
    "buy_sell",
    "other",
    "unspecified",
)
OPPORTUNITY_GEO_SCOPES = (
    "community",
    "local",
    "regional",
    "national",
    "remote",
    "global",
    "unspecified",
)
OPPORTUNITY_AVAILABILITY_STATES = ("available", "unavailable", "unspecified")


def _has_table(bind, table_name: str) -> bool:
    return sa.inspect(bind).has_table(table_name)


def _has_column(bind, table_name: str, column_name: str) -> bool:
    if not _has_table(bind, table_name):
        return False
    return any(col.get("name") == column_name for col in sa.inspect(bind).get_columns(table_name))


def _has_index(bind, table_name: str, index_name: str) -> bool:
    if not _has_table(bind, table_name):
        return False
    return any(index.get("name") == index_name for index in sa.inspect(bind).get_indexes(table_name))


def _to_aware_utc(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        parsed = value
    else:
        raw = str(value).strip()
        if not raw:
            return None
        try:
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _dt_key(value: Any) -> str:
    parsed = _to_aware_utc(value)
    if parsed is None:
        return ""
    return parsed.isoformat()



def _safe_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _content_fingerprint(
    *,
    content_kind: str,
    shop_id: Any,
    origin_clan_id: Any,
    message: Any = None,
    image_url: Any = None,
    video_url: Any = None,
    source_product_id: Any = None,
) -> str:
    if content_kind == CONTENT_KIND_PRODUCT:
        canonical = {
            "content_kind": CONTENT_KIND_PRODUCT,
            "source_product_id": int(source_product_id or 0),
            "shop_id": int(shop_id or 0),
            "origin_clan_id": int(origin_clan_id or 0),
        }
    else:
        canonical = {
            "content_kind": CONTENT_KIND_BROADCAST,
            "shop_id": int(shop_id or 0),
            "origin_clan_id": int(origin_clan_id or 0),
            "message": _safe_text(message),
            "image_url": _safe_text(image_url),
            "video_url": _safe_text(video_url),
        }
    payload = json.dumps(canonical, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()

def _campaign_insert_table() -> sa.Table:
    return sa.Table(
        CAMPAIGNS,
        sa.MetaData(),
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("owner_user_id", sa.Integer()),
        sa.Column("shop_id", sa.Integer()),
        sa.Column("origin_clan_id", sa.Integer()),
        sa.Column("source_product_id", sa.Integer()),
        sa.Column("content_kind", sa.String()),
        sa.Column("content_fingerprint", sa.String()),
        sa.Column("status", sa.String()),
        sa.Column("source_kind", sa.String()),
        sa.Column("commercial_mode", sa.String()),
        sa.Column("distribution_scope", sa.String()),
        sa.Column("opportunity_intent", sa.String()),
        sa.Column("opportunity_category", sa.String()),
        sa.Column("opportunity_subcategory", sa.String()),
        sa.Column("opportunity_keywords_json", sa.Text()),
        sa.Column("opportunity_geo_scope", sa.String()),
        sa.Column("opportunity_country", sa.String()),
        sa.Column("opportunity_region", sa.String()),
        sa.Column("opportunity_locality", sa.String()),
        sa.Column("opportunity_remote_available", sa.Boolean()),
        sa.Column("opportunity_availability", sa.String()),
        sa.Column("opportunity_expires_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("activated_at", sa.DateTime(timezone=True)),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.Column("ended_at", sa.DateTime(timezone=True)),
    )


def _backfill_campaigns(bind) -> None:
    if not _has_table(bind, BROADCASTS) or not _has_table(bind, CAMPAIGNS):
        return
    if not _has_column(bind, BROADCASTS, "spotlight_campaign_id"):
        return

    existing = bind.execute(sa.text(f"SELECT COUNT(*) FROM {CAMPAIGNS}")).scalar()
    if int(existing or 0) > 0:
        return

    shop_rows = bind.execute(
        sa.text("SELECT id, clan_id FROM marketplace_shops")
    ).mappings().all() if _has_table(bind, "marketplace_shops") else []
    shop_origin_by_id = {
        int(row["id"]): int(row["clan_id"])
        for row in shop_rows
        if row.get("id") is not None and row.get("clan_id") is not None
    }

    rows = bind.execute(
        sa.text(
            """
            SELECT
                id,
                clan_id,
                author_user_id,
                shop_id,
                message,
                image_url,
                video_url,
                priority_mode,
                visibility_scope,
                expires_at,
                created_at
            FROM marketplace_broadcasts
            ORDER BY author_user_id ASC, created_at ASC, id ASC
            """
        )
    ).mappings().all()
    if not rows:
        return

    grouped: dict[tuple[Any, ...], list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        key = (
            row["author_user_id"],
            row.get("shop_id"),
            _dt_key(row.get("created_at")),
            row.get("message") or "",
            row.get("image_url") or "",
            row.get("video_url") or "",
            row.get("priority_mode") or "free",
            row.get("visibility_scope") or "direct_communities",
            _dt_key(row.get("expires_at")),
        )
        grouped[key].append(dict(row))

    now = datetime.now(timezone.utc)
    groups = []
    for items in grouped.values():
        first = items[0]
        created_at = _to_aware_utc(first.get("created_at")) or now
        expires_at = _to_aware_utc(first.get("expires_at"))
        is_live = expires_at is None or expires_at > now
        shop_id = int(first["shop_id"]) if first.get("shop_id") is not None else None
        origin_clan_id = (
            shop_origin_by_id.get(shop_id)
            if shop_id is not None
            else int(first["clan_id"])
        )
        content_kind = CONTENT_KIND_BROADCAST
        groups.append(
            {
                "items": items,
                "owner_user_id": int(first["author_user_id"]),
                "shop_id": shop_id,
                "origin_clan_id": origin_clan_id,
                "source_product_id": None,
                "content_kind": content_kind,
                "content_fingerprint": _content_fingerprint(
                    content_kind=content_kind,
                    shop_id=shop_id,
                    origin_clan_id=origin_clan_id,
                    message=first.get("message"),
                    image_url=first.get("image_url"),
                    video_url=first.get("video_url"),
                ),
                "source_kind": (
                    REPOST_SOURCE
                    if (first.get("visibility_scope") or "") == "marketplace_repost"
                    else DIRECT_SOURCE
                ),
                "commercial_mode": first.get("priority_mode") or "free",
                "distribution_scope": first.get("visibility_scope") or "direct_communities",
                "created_at": created_at,
                "expires_at": expires_at,
                "is_live": is_live,
            }
        )

    active_owner_seen: set[int] = set()
    campaign_table = _campaign_insert_table()
    for group in sorted(
        groups,
        key=lambda item: (item["owner_user_id"], item["created_at"], max(int(row["id"]) for row in item["items"])),
        reverse=True,
    ):
        owner_id = int(group["owner_user_id"])
        if group["is_live"] and owner_id not in active_owner_seen:
            status = ACTIVE_STATUS
            ended_at = None
            active_owner_seen.add(owner_id)
        elif group["is_live"]:
            status = LEGACY_PRESERVED_STATUS
            ended_at = None
        else:
            status = EXPIRED_STATUS
            ended_at = group["expires_at"]

        result = bind.execute(
            sa.insert(campaign_table).values(
                owner_user_id=owner_id,
                shop_id=group["shop_id"],
                origin_clan_id=group["origin_clan_id"],
                source_product_id=group["source_product_id"],
                content_kind=group["content_kind"],
                content_fingerprint=group["content_fingerprint"],
                status=status,
                source_kind=group["source_kind"],
                commercial_mode=group["commercial_mode"],
                distribution_scope=group["distribution_scope"],
                opportunity_intent=OPPORTUNITY_INTENT_UNSPECIFIED,
                opportunity_category=OPPORTUNITY_CATEGORY_UNSPECIFIED,
                opportunity_subcategory=None,
                opportunity_keywords_json=None,
                opportunity_geo_scope=OPPORTUNITY_GEO_SCOPE_UNSPECIFIED,
                opportunity_country=None,
                opportunity_region=None,
                opportunity_locality=None,
                opportunity_remote_available=None,
                opportunity_availability=OPPORTUNITY_AVAILABILITY_UNSPECIFIED,
                opportunity_expires_at=None,
                created_at=group["created_at"],
                activated_at=group["created_at"],
                expires_at=group["expires_at"],
                ended_at=ended_at,
            )
        )
        campaign_id = int(result.inserted_primary_key[0])
        for row in group["items"]:
            bind.execute(
                sa.text(
                    """
                    UPDATE marketplace_broadcasts
                    SET spotlight_campaign_id = :campaign_id
                    WHERE id = :broadcast_id
                    """
                ),
                {"campaign_id": campaign_id, "broadcast_id": int(row["id"])},
            )


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, CAMPAIGNS):
        op.create_table(
            CAMPAIGNS,
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("owner_user_id", sa.Integer(), nullable=False),
            sa.Column("shop_id", sa.Integer(), nullable=True),
            sa.Column("origin_clan_id", sa.Integer(), nullable=True),
            sa.Column("source_product_id", sa.Integer(), nullable=True),
            sa.Column("content_kind", sa.String(length=40), nullable=False, server_default=CONTENT_KIND_BROADCAST),
            sa.Column("content_fingerprint", sa.String(length=64), nullable=False, server_default=""),
            sa.Column("status", sa.String(length=32), nullable=False, server_default=ACTIVE_STATUS),
            sa.Column("source_kind", sa.String(length=40), nullable=False, server_default=DIRECT_SOURCE),
            sa.Column("commercial_mode", sa.String(length=20), nullable=False, server_default="free"),
            sa.Column("distribution_scope", sa.String(length=32), nullable=False, server_default="direct_communities"),
            sa.Column("opportunity_intent", sa.String(length=16), nullable=False, server_default=OPPORTUNITY_INTENT_UNSPECIFIED),
            sa.Column("opportunity_category", sa.String(length=40), nullable=False, server_default=OPPORTUNITY_CATEGORY_UNSPECIFIED),
            sa.Column("opportunity_subcategory", sa.String(length=80), nullable=True),
            sa.Column("opportunity_keywords_json", sa.Text(), nullable=True),
            sa.Column("opportunity_geo_scope", sa.String(length=24), nullable=False, server_default=OPPORTUNITY_GEO_SCOPE_UNSPECIFIED),
            sa.Column("opportunity_country", sa.String(length=80), nullable=True),
            sa.Column("opportunity_region", sa.String(length=120), nullable=True),
            sa.Column("opportunity_locality", sa.String(length=120), nullable=True),
            sa.Column("opportunity_remote_available", sa.Boolean(), nullable=True),
            sa.Column("opportunity_availability", sa.String(length=24), nullable=False, server_default=OPPORTUNITY_AVAILABILITY_UNSPECIFIED),
            sa.Column("opportunity_expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("activated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["origin_clan_id"], ["clans.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["shop_id"], ["marketplace_shops.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["source_product_id"], ["marketplace_products.id"], ondelete="SET NULL"),
            sa.CheckConstraint(
                "opportunity_intent IN ('offer', 'need', 'unspecified')",
                name="ck_spotlight_campaigns_opportunity_intent",
            ),
            sa.CheckConstraint(
                "opportunity_category IN ('employment', 'business_service', 'product', 'property', 'education_training', 'professional_service', 'community_support', 'event', 'volunteering', 'buy_sell', 'other', 'unspecified')",
                name="ck_spotlight_campaigns_opportunity_category",
            ),
            sa.CheckConstraint(
                "opportunity_geo_scope IN ('community', 'local', 'regional', 'national', 'remote', 'global', 'unspecified')",
                name="ck_spotlight_campaigns_opportunity_geo_scope",
            ),
            sa.CheckConstraint(
                "opportunity_availability IN ('available', 'unavailable', 'unspecified')",
                name="ck_spotlight_campaigns_opportunity_availability",
            ),
            sa.PrimaryKeyConstraint("id"),
        )

    campaign_metadata_columns = (
        ("opportunity_intent", sa.Column("opportunity_intent", sa.String(length=16), nullable=False, server_default=OPPORTUNITY_INTENT_UNSPECIFIED)),
        ("opportunity_category", sa.Column("opportunity_category", sa.String(length=40), nullable=False, server_default=OPPORTUNITY_CATEGORY_UNSPECIFIED)),
        ("opportunity_subcategory", sa.Column("opportunity_subcategory", sa.String(length=80), nullable=True)),
        ("opportunity_keywords_json", sa.Column("opportunity_keywords_json", sa.Text(), nullable=True)),
        ("opportunity_geo_scope", sa.Column("opportunity_geo_scope", sa.String(length=24), nullable=False, server_default=OPPORTUNITY_GEO_SCOPE_UNSPECIFIED)),
        ("opportunity_country", sa.Column("opportunity_country", sa.String(length=80), nullable=True)),
        ("opportunity_region", sa.Column("opportunity_region", sa.String(length=120), nullable=True)),
        ("opportunity_locality", sa.Column("opportunity_locality", sa.String(length=120), nullable=True)),
        ("opportunity_remote_available", sa.Column("opportunity_remote_available", sa.Boolean(), nullable=True)),
        ("opportunity_availability", sa.Column("opportunity_availability", sa.String(length=24), nullable=False, server_default=OPPORTUNITY_AVAILABILITY_UNSPECIFIED)),
        ("opportunity_expires_at", sa.Column("opportunity_expires_at", sa.DateTime(timezone=True), nullable=True)),
    )
    if _has_table(bind, CAMPAIGNS):
        for column_name, column in campaign_metadata_columns:
            if not _has_column(bind, CAMPAIGNS, column_name):
                op.add_column(CAMPAIGNS, column)

    if _has_table(bind, BROADCASTS) and not _has_column(bind, BROADCASTS, "spotlight_campaign_id"):
        op.add_column(
            BROADCASTS,
            sa.Column("spotlight_campaign_id", sa.Integer(), nullable=True),
        )
        if bind.dialect.name != "sqlite":
            op.create_foreign_key(
                "fk_marketplace_broadcasts_spotlight_campaign_id",
                BROADCASTS,
                CAMPAIGNS,
                ["spotlight_campaign_id"],
                ["id"],
                ondelete="SET NULL",
            )

    for name, table_name, columns in (
        ("ix_spotlight_campaigns_owner_status", CAMPAIGNS, ["owner_user_id", "status"]),
        ("ix_spotlight_campaigns_shop_status", CAMPAIGNS, ["shop_id", "status"]),
        ("ix_spotlight_campaigns_origin_status", CAMPAIGNS, ["origin_clan_id", "status"]),
        ("ix_spotlight_campaigns_content", CAMPAIGNS, ["content_kind", "content_fingerprint"]),
        ("ix_spotlight_campaigns_source_product", CAMPAIGNS, ["source_product_id"]),
        ("ix_spotlight_campaigns_opportunity_intent", CAMPAIGNS, ["opportunity_intent"]),
        ("ix_spotlight_campaigns_opportunity_category", CAMPAIGNS, ["opportunity_category"]),
        ("ix_spotlight_campaigns_opportunity_geo_scope", CAMPAIGNS, ["opportunity_geo_scope"]),
        ("ix_spotlight_campaigns_opportunity_availability", CAMPAIGNS, ["opportunity_availability"]),
        ("ix_spotlight_campaigns_expiry", CAMPAIGNS, ["expires_at"]),
        ("ix_marketplace_broadcasts_spotlight_campaign_id", BROADCASTS, ["spotlight_campaign_id"]),
    ):
        if _has_table(bind, table_name) and not _has_index(bind, table_name, name):
            op.create_index(name, table_name, columns)

    _backfill_campaigns(bind)

    if not _has_index(bind, CAMPAIGNS, "uq_spotlight_campaigns_one_active_owner"):
        op.create_index(
            "uq_spotlight_campaigns_one_active_owner",
            CAMPAIGNS,
            ["owner_user_id"],
            unique=True,
            sqlite_where=sa.text("status = 'active'"),
            postgresql_where=sa.text("status = 'active'"),
        )


def downgrade() -> None:
    bind = op.get_bind()

    if _has_table(bind, BROADCASTS) and _has_index(bind, BROADCASTS, "ix_marketplace_broadcasts_spotlight_campaign_id"):
        op.drop_index("ix_marketplace_broadcasts_spotlight_campaign_id", table_name=BROADCASTS)
    if _has_table(bind, BROADCASTS) and _has_column(bind, BROADCASTS, "spotlight_campaign_id"):
        if bind.dialect.name != "sqlite":
            op.drop_constraint(
                "fk_marketplace_broadcasts_spotlight_campaign_id",
                BROADCASTS,
                type_="foreignkey",
            )
        with op.batch_alter_table(BROADCASTS) as batch_op:
            batch_op.drop_column("spotlight_campaign_id")

    if _has_table(bind, CAMPAIGNS):
        for name in (
            "uq_spotlight_campaigns_one_active_owner",
            "ix_spotlight_campaigns_expiry",
            "ix_spotlight_campaigns_opportunity_availability",
            "ix_spotlight_campaigns_opportunity_geo_scope",
            "ix_spotlight_campaigns_opportunity_category",
            "ix_spotlight_campaigns_opportunity_intent",
            "ix_spotlight_campaigns_source_product",
            "ix_spotlight_campaigns_content",
            "ix_spotlight_campaigns_origin_status",
            "ix_spotlight_campaigns_shop_status",
            "ix_spotlight_campaigns_owner_status",
        ):
            if _has_index(bind, CAMPAIGNS, name):
                op.drop_index(name, table_name=CAMPAIGNS)
        op.drop_table(CAMPAIGNS)
