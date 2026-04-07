import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getMarketplaceBroadcasts,
  getMarketplaceProducts,
  getSelectedClanId,
} from "../lib/api";

type MarketplaceFeedItem = {
  id?: number;
  message?: string;
  created_at?: string;
  expires_at?: string | null;
  author_user_id?: number;
};

type MarketplaceProductItem = {
  id?: number;
  clan_id?: number;
  shop_id?: number;
  seller_user_id?: number;
  name?: string;
  description?: string | null;
  price?: string | null;
  currency?: string | null;
  image_url?: string | null;
  created_at?: string;
  origin_clan_id?: number;
  origin_shop_id?: number;
  origin_shop_name?: string | null;
  distribution_slots_total?: number;
  distribution_slots_reserved_for_origin_spotlight?: number;
  reposts_used?: number;
  distribution_slots_remaining?: number;
};

function card(): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

function btn(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    borderRadius: 14,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.10)",
    background: primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 1000,
    fontSize: 14,
    textDecoration: "none",
    cursor: "pointer",
  };
}

function tinyText(): React.CSSProperties {
  return {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 1.5,
  };
}

function formatWhen(value?: string | null): string {
  if (!value) return "Unknown time";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

type SpotlightItem =
  | {
      type: "product";
      key: string;
      product: MarketplaceProductItem;
    }
  | {
      type: "broadcast";
      key: string;
      feed: MarketplaceFeedItem;
    };

export default function CommunityMarketplaceSpotlight() {
  const [feed, setFeed] = useState<MarketplaceFeedItem[]>([]);
  const [products, setProducts] = useState<MarketplaceProductItem[]>([]);
  const [err, setErr] = useState("");
  const [spotlightIndex, setSpotlightIndex] = useState(0);

  const selectedClanId = getSelectedClanId();

  async function loadSpotlight() {
    setErr("");

    try {
      const clanId = getSelectedClanId() || undefined;

      const [feedRes, productRes] = await Promise.all([
        getMarketplaceBroadcasts({
          clan_id: clanId,
          active_only: true,
          limit: 10,
        }).catch(() => ({ items: [] })),
        getMarketplaceProducts({
          clan_id: clanId,
          include_reposted: true,
          only_active: true,
          limit: 10,
        }).catch(() => ({ items: [] })),
      ]);

      setFeed(Array.isArray(feedRes?.items) ? feedRes.items : []);
      setProducts(Array.isArray(productRes?.items) ? productRes.items : []);
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to load marketplace spotlight."));
    }
  }

  useEffect(() => {
    loadSpotlight();
  }, []);

  const spotlightItems = useMemo<SpotlightItem[]>(() => {
    const productItems: SpotlightItem[] = products.slice(0, 10).map((p, i) => ({
      type: "product",
      key: `product-${p.id ?? i}`,
      product: p,
    }));

    const broadcastItems: SpotlightItem[] = feed.slice(0, 10).map((f, i) => ({
      type: "broadcast",
      key: `broadcast-${f.id ?? i}`,
      feed: f,
    }));

    return [...productItems, ...broadcastItems].slice(0, 10);
  }, [products, feed]);

  const activeItem = useMemo(() => {
    if (spotlightItems.length === 0) return null;
    return spotlightItems[spotlightIndex % spotlightItems.length] || spotlightItems[0];
  }, [spotlightItems, spotlightIndex]);

  useEffect(() => {
    if (spotlightItems.length <= 1) return;

    const timer = window.setInterval(() => {
      setSpotlightIndex((prev) => (prev + 1) % spotlightItems.length);
    }, 45000);

    return () => window.clearInterval(timer);
  }, [spotlightItems.length]);

  const productCount = products.length;
  const broadcastCount = feed.length;

  return (
    <div style={{ marginTop: 18 }}>
      <div style={card()}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
              Community Marketplace Spotlight
            </div>
            <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
              Product spotlight takes priority here. Broadcast messages support it when product spotlight is quiet.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div
              style={{
                borderRadius: 999,
                background: "#EFF6FF",
                color: "#0B63D1",
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 1000,
              }}
            >
              Products: {productCount}
            </div>
            <div
              style={{
                borderRadius: 999,
                background: "#F8FAFC",
                color: "#475569",
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 1000,
              }}
            >
              Broadcasts: {broadcastCount}
            </div>
          </div>
        </div>

        {err ? (
          <div
            style={{
              marginTop: 14,
              borderRadius: 14,
              border: "1px solid #FECACA",
              background: "#FEF2F2",
              color: "#991B1B",
              padding: 12,
              fontWeight: 900,
            }}
          >
            {err}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 14,
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid rgba(11,31,51,0.08)",
            background: "#F8FAFC",
          }}
        >
          <div
            style={{
              minHeight: 300,
              background:
                activeItem?.type === "product"
                  ? "#E2E8F0"
                  : "linear-gradient(135deg,#DBEAFE,#E0F2FE)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {activeItem?.type === "product" && activeItem.product?.image_url ? (
              <img
                src={activeItem.product.image_url}
                alt={activeItem.product.name || "Spotlight product"}
                style={{
                  width: "100%",
                  height: 300,
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ) : (
              <div
                style={{
                  color: "#0B63D1",
                  fontWeight: 1000,
                  fontSize: 22,
                }}
              >
                Marketplace Spotlight
              </div>
            )}

            <div
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                background: "rgba(255,255,255,0.94)",
                color: "#0B1F33",
                borderRadius: 999,
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 1000,
              }}
            >
              {activeItem?.type === "product" ? "Product Spotlight" : "Broadcast Spotlight"}
            </div>

            {activeItem?.type === "product" ? (
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  background: "rgba(11,99,209,0.92)",
                  color: "#FFFFFF",
                  borderRadius: 999,
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: 1000,
                }}
              >
                Visual Priority
              </div>
            ) : null}
          </div>

          <div style={{ padding: 16 }}>
            {!activeItem ? (
              <div style={{ color: "#6B7A88", lineHeight: 1.7 }}>
                No spotlight activity yet for this community.
              </div>
            ) : activeItem.type === "product" ? (
              <>
                <div style={{ fontWeight: 1000, color: "#0B1F33", fontSize: 18 }}>
                  {activeItem.product?.name || "Spotlight Product"}
                </div>

                <div style={{ marginTop: 8, color: "#64748B", lineHeight: 1.7 }}>
                  {activeItem.product?.description || "No product description yet."}
                </div>

                <div style={{ marginTop: 10, color: "#0B63D1", fontWeight: 1000, fontSize: 16 }}>
                  {activeItem.product?.price || "—"} {activeItem.product?.currency || ""}
                </div>

                <div style={{ marginTop: 10, ...tinyText() }}>
                  Origin shop: {activeItem.product?.origin_shop_name || "Unknown shop"}
                </div>

                <div style={{ marginTop: 4, ...tinyText() }}>
                  Distribution slots remaining:{" "}
                  {activeItem.product?.distribution_slots_remaining ?? 0}
                </div>

                <div style={{ marginTop: 4, ...tinyText() }}>
                  Updated: {formatWhen(activeItem.product?.created_at)}
                </div>

                <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link to="/app/marketplace" style={btn(true)}>
                    Open Marketplace
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 1000, color: "#0B1F33", fontSize: 18 }}>
                  Spotlight Message
                </div>

                <div style={{ marginTop: 8, color: "#64748B", lineHeight: 1.7 }}>
                  {activeItem.feed?.message || "No spotlight message."}
                </div>

                <div style={{ marginTop: 10, ...tinyText() }}>
                  Posted: {formatWhen(activeItem.feed?.created_at)}
                </div>

                <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link to="/app/marketplace" style={btn(true)}>
                    Open Marketplace
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={tinyText()}>
            Community ID: {selectedClanId || "No active community selected"}
          </div>

          <button
            onClick={loadSpotlight}
            style={btn(false)}
            type="button"
          >
            Refresh Spotlight
          </button>
        </div>
      </div>
    </div>
  );
}