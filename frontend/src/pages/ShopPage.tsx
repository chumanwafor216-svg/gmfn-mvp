import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import { getMarketplaceShopByGmfnId } from "../lib/api";

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

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.10)",
    background: bg,
    boxShadow:
      "0 22px 54px rgba(15,23,42,0.07), 0 2px 8px rgba(15,23,42,0.03)",
    padding: 20,
    overflow: "hidden",
  };
}

function card(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 20,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
    padding: 16,
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 14,
  };
}

function btn(primary = false, disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 12,
    border: primary
      ? "1px solid rgba(11,99,209,0.22)"
      : "1px solid rgba(11,31,51,0.10)",
    background: disabled ? "#CBD5E1" : primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 13,
    textDecoration: "none",
    opacity: disabled ? 0.86 : 1,
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    padding: "6px 10px",
    background: primary ? "rgba(11,99,209,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#0B63D1" : "#475569",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  };
}

function compactNotice(success = false): React.CSSProperties {
  return {
    borderRadius: 14,
    border: success
      ? "1px solid #A7F3D0"
      : "1px solid rgba(11,31,51,0.08)",
    background: success ? "#ECFDF5" : "#F8FAFC",
    padding: 12,
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
    lineHeight: 1.55,
  };
}

function safeStr(value: any): string {
  return String(value ?? "").trim();
}

function formatWhen(value?: string | null): string {
  if (!value) return "Unknown time";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
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

function buildTelegramLink(handle?: string | null): string | null {
  const raw = safeStr(handle).replace(/^@+/, "");
  if (!raw) return null;
  return `https://t.me/${raw}`;
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
  const gmfnId = String(params.gmfn_id || params.gmfnId || "").trim();

  const [shop, setShop] = useState<ShopItem | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const pageTitle = useMemo(() => {
    return shop?.name || "Shop Gallery";
  }, [shop]);

  const pageSubtitle = useMemo(() => {
    return "Browse, share, and contact the seller";
  }, []);

  const productSlots = useMemo(() => {
    const firstTwelve = products.slice(0, 12);
    return Array.from({ length: 12 }, (_, i) => firstTwelve[i] || null);
  }, [products]);

  const currentUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.href;
  }, [gmfnId]);

  const guideUrl = useMemo(() => {
    if (typeof window === "undefined") return "/GSN_FINAL_WHITE.pdf";
    return `${window.location.origin}/GSN_FINAL_WHITE.pdf`;
  }, []);

  const shopWhatsappLink = useMemo(() => {
    const intro = `Hello, I am viewing ${shop?.name || "your shop"} and would like to ask a question.`;
    return buildWhatsAppLink(shop?.whatsapp_number, intro);
  }, [shop]);

  const telegramLink = useMemo(() => {
    return buildTelegramLink(shop?.telegram_handle);
  }, [shop]);

  const shareText = useMemo(() => {
    const seller = safeStr(shop?.owner_display_name || "the seller");
    const shopName = safeStr(shop?.name || "this shop");

    return `Take a look at ${shopName} by ${seller} on GMFN / GSN.\n\nShop link:\n${currentUrl}\n\nUnderstand GMFN / GSN first:\n${guideUrl}`;
  }, [currentUrl, guideUrl, shop]);

  const shareWhatsAppUrl = useMemo(() => {
    return `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  }, [shareText]);

  useEffect(() => {
    loadShop();
  }, [gmfnId]);

  async function loadShop() {
    setLoading(true);
    setErr("");
    setMsg("");
    setExpandedProductId(null);

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
      setErr(String(e?.message || e || "Unable to load shop gallery."));
      setShop(null);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  async function copyShopLink() {
    try {
      if (navigator?.clipboard?.writeText && currentUrl) {
        await navigator.clipboard.writeText(currentUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
        return;
      }
    } catch {}

    if (currentUrl) {
      window.prompt("Copy this shop link:", currentUrl);
    }
  }

  function renderProductCard(product: ProductItem, index: number) {
    const productRef = `P-${String(index + 1).padStart(3, "0")}`;
    const productId = Number(product.id || 0);
    const isExpanded = expandedProductId === productId;
    const whatsappMessage = `Hello, I am interested in ${productRef} - ${
      product.name || "this product"
    } from ${shop?.name || "your shop"}.`;
    const whatsappLink = buildWhatsAppLink(shop?.whatsapp_number, whatsappMessage);

    return (
      <div
        key={product.id ?? index}
        style={{
          ...card("#FFFFFF"),
          padding: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: isExpanded ? 720 : 430,
          gridColumn: isExpanded ? "1 / -1" : undefined,
        }}
      >
        <div
          style={{
            height: isExpanded ? 420 : 250,
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
              ...badge(false),
              background: "rgba(255,255,255,0.96)",
              color: "#0B1F33",
            }}
          >
            {productRef}
          </div>
        </div>

        <div
          style={{
            padding: 14,
            display: "grid",
            gap: 8,
            alignContent: "start",
            flex: 1,
          }}
        >
          <div
            style={{
              fontWeight: 1000,
              color: "#0B1F33",
              fontSize: 16,
              lineHeight: 1.35,
            }}
          >
            {product.name || `Product ${index + 1}`}
          </div>

          <div
            style={{
              color: "#64748B",
              fontSize: 13,
              lineHeight: 1.6,
              minHeight: 40,
            }}
          >
            {product.description || "No product description yet."}
          </div>

          <div
            style={{
              color: "#0B63D1",
              fontWeight: 1000,
              fontSize: 16,
            }}
          >
            {product.price || "—"} {product.currency || ""}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(false)}>
              Origin: {product.origin_shop_name || shop?.name || "Unknown shop"}
            </span>
            <span style={badge(false)}>
              Slots left: {product.distribution_slots_remaining ?? "—"}
            </span>
          </div>

          {isExpanded ? (
            <div style={softCard("#F8FBFF")}>
              <div style={{ fontWeight: 900, color: "#0B1F33", fontSize: 13 }}>
                Product and repost details
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={tinyText()}>
                  Created: {formatWhen(product.created_at)}
                </div>
                <div style={tinyText()}>
                  Seller ID: {product.seller_gmfn_id || shop?.gmfn_id || "Not available"}
                </div>
                <div style={tinyText()}>
                  Total distribution slots: {product.distribution_slots_total ?? "—"}
                </div>
                <div style={tinyText()}>
                  Reserved for origin spotlight:{" "}
                  {product.distribution_slots_reserved_for_origin_spotlight ?? "—"}
                </div>
                <div style={tinyText()}>
                  Reposts used: {product.reposts_used ?? "—"}
                </div>
                <div style={tinyText()}>
                  Repost visibility follows membership overlap, origin rules, and
                  slot availability.
                </div>
              </div>
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginTop: 4,
            }}
          >
            <button
              type="button"
              onClick={() =>
                setExpandedProductId((prev) => (prev === productId ? null : productId))
              }
              style={btn(false, false)}
            >
              {isExpanded ? "Collapse" : "View"}
            </button>

            {whatsappLink ? (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                style={btn(true, false)}
              >
                Contact seller
              </a>
            ) : (
              <button type="button" style={btn(true, true)} disabled>
                Contact unavailable
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
          ...card("#FFFFFF"),
          padding: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: 430,
          opacity: 0.94,
        }}
      >
        <div
          style={{
            height: 250,
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
              ...badge(false),
              background: "rgba(255,255,255,0.96)",
              color: "#0B1F33",
            }}
          >
            {productRef}
          </div>
        </div>

        <div
          style={{
            padding: 14,
            display: "grid",
            gap: 8,
            alignContent: "start",
            flex: 1,
          }}
        >
          <div style={{ fontWeight: 1000, color: "#0B1F33", fontSize: 16 }}>
            Slot Available
          </div>

          <div
            style={{
              color: "#64748B",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            This product space is currently empty.
          </div>

          <div style={{ color: "#94A3B8", fontWeight: 1000, fontSize: 16 }}>
            —
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginTop: 4,
            }}
          >
            <button type="button" style={btn(false, true)} disabled>
              View
            </button>
            <button type="button" style={btn(true, true)} disabled>
              Contact unavailable
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", paddingBottom: 36 }}>
      <PageTopNav title={pageTitle} subtitle={pageSubtitle} />

      {err ? (
        <div
          style={{
            ...compactNotice(false),
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
            ...compactNotice(true),
            marginTop: 12,
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
            ...compactNotice(false),
            marginTop: 12,
            color: "#475569",
            fontWeight: 800,
          }}
        >
          Loading shop gallery...
        </div>
      ) : null}

      {shop ? (
        <>
          <div
            style={{
              ...pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
              marginTop: 18,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(260px, 340px) minmax(0, 1fr)",
                gap: 18,
                alignItems: "start",
              }}
            >
              <div style={softCard("#FFFFFF")}>
                <div style={{ fontSize: 13, color: "#64748B", fontWeight: 900 }}>
                  Shop identity
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 24,
                    fontWeight: 1000,
                    color: "#0B1F33",
                    lineHeight: 1.2,
                  }}
                >
                  {shop.owner_display_name || "Member"}
                </div>

                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={badge(true)}>{shop.gmfn_id || "GMFN ID pending"}</span>
                  <span style={badge(false)}>
                    {shop.is_active === false ? "Inactive shop" : "Active shop"}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: 14,
                    color: "#475569",
                    lineHeight: 1.7,
                    fontSize: 14,
                  }}
                >
                  {shop.description ||
                    "This is the seller-facing identity summary for the visible shop gallery."}
                </div>

                <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
                  <div style={tinyText()}>
                    Created: {formatWhen(shop.created_at)}
                  </div>
                  <div style={tinyText()}>
                    WhatsApp: {shop.whatsapp_number || "Not provided"}
                  </div>
                  <div style={tinyText()}>
                    Telegram: {shop.telegram_handle || "Not provided"}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  {shopWhatsappLink ? (
                    <a
                      href={shopWhatsappLink}
                      target="_blank"
                      rel="noreferrer"
                      style={btn(true, false)}
                    >
                      Contact seller
                    </a>
                  ) : (
                    <button type="button" style={btn(true, true)} disabled>
                      Contact unavailable
                    </button>
                  )}

                  {telegramLink ? (
                    <a
                      href={telegramLink}
                      target="_blank"
                      rel="noreferrer"
                      style={btn(false, false)}
                    >
                      Telegram
                    </a>
                  ) : null}
                </div>
              </div>

              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    borderRadius: 999,
                    padding: "8px 12px",
                    border: "1px solid rgba(11,99,209,0.14)",
                    background: "rgba(11,99,209,0.06)",
                    color: "#0B63D1",
                    fontWeight: 900,
                    fontSize: 12,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                  }}
                >
                  Shop gallery
                </div>

                <h1
                  style={{
                    margin: "14px 0 10px",
                    fontSize: 30,
                    lineHeight: 1.15,
                    color: "#0B1F33",
                  }}
                >
                  {shop.name || "Shop"}
                </h1>

                <div
                  style={{
                    color: "#475569",
                    fontSize: 15,
                    lineHeight: 1.7,
                    maxWidth: 780,
                  }}
                >
                  This is the browse, share, and contact surface for this shop.
                  It stays separate from private controls, community money tools,
                  and management panels.
                </div>

                <div
                  style={{
                    marginTop: 16,
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                  <div style={card("#FFFFFF")}>
                    <div style={{ fontSize: 13, color: "#64748B", fontWeight: 800 }}>
                      Products shown
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 28,
                        fontWeight: 1000,
                        color: "#0B1F33",
                      }}
                    >
                      {products.length}
                    </div>
                  </div>

                  <div style={card("#FFFFFF")}>
                    <div style={{ fontSize: 13, color: "#64748B", fontWeight: 800 }}>
                      Identity
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 16,
                        fontWeight: 1000,
                        color: "#0B1F33",
                        lineHeight: 1.4,
                        wordBreak: "break-word",
                      }}
                    >
                      {shop.gmfn_id || gmfnId || "GMFN ID pending"}
                    </div>
                  </div>

                  <div style={card("#FFFFFF")}>
                    <div style={{ fontSize: 13, color: "#64748B", fontWeight: 800 }}>
                      Repost visibility
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 15,
                        fontWeight: 900,
                        color: "#0B1F33",
                        lineHeight: 1.45,
                      }}
                    >
                      Follows membership overlap and slot rules
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 16,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <a
                    href={shareWhatsAppUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={btn(true, false)}
                  >
                    Share shop
                  </a>

                  <button
                    type="button"
                    onClick={copyShopLink}
                    style={btn(false, false)}
                  >
                    {copied ? "Link copied" : "Copy link"}
                  </button>

                  <Link to="/app/my-gmfn-and-i" style={btn(false, false)}>
                    Open guide
                  </Link>

                  <Link to="/app/marketplace" style={btn(false, false)}>
                    Open marketplace
                  </Link>
                </div>

                <div style={{ marginTop: 12, ...softCard("#F8FBFF") }}>
                  <div style={{ fontWeight: 900, color: "#0B1F33", fontSize: 13 }}>
                    Share package
                  </div>

                  <div style={{ marginTop: 8, color: "#64748B", fontSize: 13, lineHeight: 1.65 }}>
                    Share this shop with a shop link and the GMFN / GSN guide.
                    Repost visibility still depends on community membership,
                    origin rules, and slot availability.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ ...pageCard("#FFFFFF"), marginTop: 18 }}>
            <div style={{ fontWeight: 1000, color: "#0B1F33", fontSize: 18 }}>
              Product gallery
            </div>
            <div style={helperTextStyle()}>
              Browse the visible products from this member’s single global shop.
              Up to 12 product slots are shown here.
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
        </>
      ) : !loading ? (
        <div style={{ ...pageCard("#FFFFFF"), marginTop: 18 }}>
          <div style={{ color: "#6B7A88", lineHeight: 1.7 }}>
            No visible shop was found for this identity.
          </div>
        </div>
      ) : null}
    </div>
  );
}