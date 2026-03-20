import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  getMarketplaceShopByGmfnId,
} from "../lib/api";

function apiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";
  return String(raw || "").trim().replace(/\/+$/, "");
}

function apiOrigin(): string {
  const base = apiBase();

  if (base.startsWith("http://") || base.startsWith("https://")) {
    try {
      const u = new URL(base);
      return `${u.protocol}//${u.host}`;
    } catch {
      return "http://127.0.0.1:8012";
    }
  }

  return "http://127.0.0.1:8012";
}

function mediaUrl(url?: string | null): string {
  const raw = String(url || "").trim();
  if (!raw) return "";

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("blob:")
  ) {
    return raw;
  }

  if (raw.startsWith("/")) {
    return `${apiOrigin()}${raw}`;
  }

  return `${apiOrigin()}/${raw.replace(/^\/+/, "")}`;
}

function shellCard(): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    boxShadow: "0 14px 40px rgba(15,23,42,0.05)",
    padding: 16,
  };
}

function softCard(): React.CSSProperties {
  return {
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#F8FAFC",
    padding: 12,
  };
}

function compactNotice(): React.CSSProperties {
  return {
    borderRadius: 12,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#F8FAFC",
    padding: 10,
  };
}

function btn(primary = false, disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "9px 13px",
    borderRadius: 12,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.10)",
    background: disabled ? "#CBD5E1" : primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 13,
    textDecoration: "none",
    opacity: disabled ? 0.85 : 1,
  };
}

function helperTextStyle(): React.CSSProperties {
  return {
    marginTop: 6,
    color: "#6B7A88",
    lineHeight: 1.65,
    fontSize: 13,
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

function normalizePhoneToWhatsApp(phone?: string | null): string | null {
  const raw = String(phone || "").trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (!cleaned) return null;
  if (cleaned.startsWith("+")) return cleaned.slice(1);
  return cleaned;
}

function buildWhatsAppLink(phone?: string | null, message?: string): string | null {
  const normalized = normalizePhoneToWhatsApp(phone);
  if (!normalized) return null;
  const msg = String(message || "").trim();
  return msg
    ? `https://wa.me/${normalized}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/${normalized}`;
}

type ShopItem = {
  id?: number;
  clan_id?: number | null;
  owner_user_id?: number;
  gmfn_id?: string | null;
  owner_display_name?: string | null;
  name?: string;
  description?: string | null;
  whatsapp_number?: string | null;
  telegram_handle?: string | null;
  is_active?: boolean;
  created_at?: string | null;
};

type ProductItem = {
  id?: number;
  clan_id?: number;
  shop_id?: number;
  seller_user_id?: number;
  seller_gmfn_id?: string | null;
  name?: string;
  description?: string | null;
  price?: string | null;
  currency?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  created_at?: string | null;
  origin_clan_id?: number;
  origin_shop_id?: number;
  origin_shop_name?: string | null;
  distribution_slots_total?: number;
  distribution_slots_reserved_for_origin_spotlight?: number;
  reposts_used?: number;
  distribution_slots_remaining?: number;
  shop_product_slots_total?: number;
};

export default function ShopPage() {
  const params = useParams();
  const gmfnId = String(params.gmfnId || params.gmfn_id || "").trim();

  const [shop, setShop] = useState<ShopItem | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);

  const pageTitle = useMemo(() => {
    return shop?.name || "Shop Page";
  }, [shop]);

  const pageSubtitle = useMemo(() => {
    return "Visitor-safe shop display";
  }, []);

  const productSlots = useMemo(() => {
    const firstTwelve = products.slice(0, 12);
    return Array.from({ length: 12 }, (_, i) => firstTwelve[i] || null);
  }, [products]);

  useEffect(() => {
    loadShop();
  }, [gmfnId]);

  async function loadShop() {
    setLoading(true);
    setErr("");
    setMsg("");

    try {
      const identityKey = String(gmfnId || "").trim();
      if (!identityKey) {
        throw new Error("Shop identity is missing.");
      }

      const res = await getMarketplaceShopByGmfnId(identityKey);

      setShop(res?.item || null);
      setProducts(Array.isArray(res?.products) ? res.products : []);

      if (!res?.item) {
        setMsg("Shop not found.");
      }
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to load shop page."));
      setShop(null);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  function renderProductCard(product: ProductItem, index: number) {
    const productRef = `P-${String(index + 1).padStart(3, "0")}`;
    const isExpanded = expandedProductId === Number(product.id || 0);
    const whatsappMessage = `Hello, I am interested in ${productRef} - ${product.name || "this product"} from ${shop?.name || "your shop"}.`;
    const whatsappLink = buildWhatsAppLink(shop?.whatsapp_number, whatsappMessage);

    return (
      <div
        key={product.id ?? index}
        style={{
          ...softCard(),
          padding: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: isExpanded ? 720 : 430,
          height: "auto",
          gridColumn: isExpanded ? "1 / -1" : undefined,
        }}
      >
        <div
          style={{
            height: isExpanded ? 420 : "58%",
            minHeight: isExpanded ? 420 : 238,
            background: "#E2E8F0",
            borderBottom: "1px solid rgba(11,31,51,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {product.image_url ? (
            <img
              src={mediaUrl(product.image_url)}
              alt={product.name || "Product"}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
              style={{
                width: "100%",
                height: "100%",
                objectFit: isExpanded ? "contain" : "cover",
                display: "block",
                background: "#E2E8F0",
              }}
            />
          ) : (
            <div style={{ color: "#64748B", fontWeight: 800, fontSize: 14 }}>
              Product Image
            </div>
          )}

          <div
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              background: "rgba(255,255,255,0.94)",
              color: "#0B1F33",
              borderRadius: 999,
              padding: "5px 10px",
              fontSize: 12,
              fontWeight: 1000,
            }}
          >
            {productRef}
          </div>
        </div>

        <div
          style={{
            height: "42%",
            padding: 10,
            display: "grid",
            gap: 4,
            alignContent: "start",
          }}
        >
          <div style={{ fontWeight: 1000, color: "#0B1F33", fontSize: 14 }}>
            {product.name || `Product ${index + 1}`}
          </div>

          <div
            style={{
              color: "#64748B",
              fontSize: 12,
              lineHeight: 1.4,
              minHeight: 28,
            }}
          >
            {product.description || "No product description yet."}
          </div>

          <div style={{ color: "#0B63D1", fontWeight: 1000, fontSize: 14 }}>
            {product.price || "—"} {product.currency || ""}
          </div>

          <div style={tinyText()}>
            Origin marketplace: {product.origin_shop_name || shop?.name || "Unknown shop"}
          </div>

          <div style={tinyText()}>
            Distribution slots remaining: {product.distribution_slots_remaining ?? "—"}
          </div>

          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginTop: 4,
            }}
          >
            <button
              type="button"
              onClick={() => {
                const productId = Number(product.id || 0);
                setExpandedProductId((prev) => (prev === productId ? null : productId));
              }}
              style={btn(false, false)}
            >
              {isExpanded ? "Collapse" : "View"}
            </button>

            <button type="button" style={btn(false, true)} disabled>
              Review Soon
            </button>

            {whatsappLink ? (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                style={btn(false, false)}
              >
                WhatsApp
              </a>
            ) : (
              <button type="button" style={btn(false, true)} disabled>
                WhatsApp
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderEmptySlot(index: number) {
    const productRef = `P-${String(index + 1).padStart(3, "0")}`;

    return (
      <div
        key={`empty-${index}`}
        style={{
          ...softCard(),
          padding: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: 430,
          height: 430,
          opacity: 0.92,
        }}
      >
        <div
          style={{
            height: "58%",
            minHeight: 238,
            background: "#E5E7EB",
            borderBottom: "1px solid rgba(11,31,51,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            color: "#64748B",
            fontWeight: 900,
            fontSize: 14,
          }}
        >
          Empty Product Slot

          <div
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              background: "rgba(255,255,255,0.94)",
              color: "#0B1F33",
              borderRadius: 999,
              padding: "5px 10px",
              fontSize: 12,
              fontWeight: 1000,
            }}
          >
            {productRef}
          </div>
        </div>

        <div
          style={{
            height: "42%",
            padding: 10,
            display: "grid",
            gap: 4,
            alignContent: "start",
          }}
        >
          <div style={{ fontWeight: 1000, color: "#0B1F33", fontSize: 14 }}>
            Slot Available
          </div>

          <div
            style={{
              color: "#64748B",
              fontSize: 12,
              lineHeight: 1.4,
              minHeight: 28,
            }}
          >
            This product space is currently empty.
          </div>

          <div style={{ color: "#94A3B8", fontWeight: 1000, fontSize: 14 }}>
            —
          </div>

          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginTop: 4,
            }}
          >
            <button type="button" style={btn(false, true)} disabled>
              View
            </button>
            <button type="button" style={btn(false, true)} disabled>
              Review Soon
            </button>
            <button type="button" style={btn(false, true)} disabled>
              WhatsApp
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1220, margin: "0 auto", paddingBottom: 32 }}>
      <PageTopNav title={pageTitle} subtitle={pageSubtitle} />

      {err ? (
        <div
          style={{
            ...compactNotice(),
            marginTop: 12,
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#991B1B",
            fontWeight: 900,
          }}
        >
          {err}
        </div>
      ) : null}

      {msg ? (
        <div
          style={{
            ...compactNotice(),
            marginTop: 12,
            background: "#ECFDF5",
            border: "1px solid #A7F3D0",
            color: "#065F46",
            fontWeight: 900,
          }}
        >
          {msg}
        </div>
      ) : null}

      {loading ? (
        <div
          style={{
            ...compactNotice(),
            marginTop: 12,
            color: "#475569",
            fontWeight: 800,
          }}
        >
          Loading shop page...
        </div>
      ) : null}

      {shop ? (
        <div style={{ ...shellCard(), marginTop: 18 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "260px 1fr",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={softCard()}>
              <div style={{ fontWeight: 1000, color: "#0B1F33", fontSize: 16 }}>
                Shop Identity
              </div>

              <div style={{ marginTop: 10, color: "#0B1F33", fontWeight: 900 }}>
                {shop.name || "Shop"}
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#64748B",
                  lineHeight: 1.7,
                  fontSize: 14,
                }}
              >
                {shop.description || "Trusted seller in this marketplace."}
              </div>

              <div style={{ marginTop: 12, ...tinyText() }}>
                Seller ID: {shop.gmfn_id || "Not available"}
              </div>

              <div style={{ marginTop: 8, ...tinyText() }}>
                Seller: {shop.owner_display_name || "Member"}
              </div>

              <div style={{ marginTop: 8, ...tinyText() }}>
                Trust Standing: Trusted Member
              </div>

              <div style={{ marginTop: 8, ...tinyText() }}>
                WhatsApp: {shop.whatsapp_number || "Not provided"}
              </div>

              <div style={{ marginTop: 8, ...tinyText() }}>
                Created: {formatWhen(shop.created_at)}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 1000, color: "#0B1F33", fontSize: 17 }}>
                Shop Products
              </div>
              <div style={helperTextStyle()}>
                Browse this seller’s available products below.
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 16,
                }}
              >
                {productSlots.map((product, index) =>
                  product ? renderProductCard(product, index) : renderEmptySlot(index)
                )}
              </div>
            </div>
          </div>
        </div>
      ) : !loading ? (
        <div style={{ ...shellCard(), marginTop: 18 }}>
          <div style={{ color: "#6B7A88" }}>
            No visible shop was found for this seller.
          </div>
        </div>
      ) : null}
    </div>
  );
}