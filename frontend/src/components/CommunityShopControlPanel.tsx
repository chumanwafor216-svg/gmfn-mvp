import React, { useEffect, useMemo, useState } from "react";
import OriginLink from "./OriginLink";
import * as api from "../lib/api";

type NoticeTone = "success" | "error";

type ShopSummary = {
  id?: number;
  gmfnId: string;
  ownerName: string;
  shopName: string;
  description: string;
  communityName: string;
  trustBand: string;
  imageUrl: string;
  visibleBlocks: number;
  whatsapp: string;
  telegram: string;
};

const STORAGE_KEY = "gmfn.community.shopControlPanel.open.v1";
const PLACEHOLDER_TEXTS = new Set(["string", "null", "undefined", "n/a", "na"]);

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function cleanText(x: any): string {
  const text = safeStr(x);
  if (!text) return "";
  if (PLACEHOLDER_TEXTS.has(text.toLowerCase())) return "";
  return text;
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return "";
}

function positiveNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function rowsOf<T = any>(input: any): T[] {
  if (Array.isArray(input)) return input as T[];
  if (Array.isArray(input?.items)) return input.items as T[];
  if (Array.isArray(input?.data?.items)) return input.data.items as T[];
  if (Array.isArray(input?.results)) return input.results as T[];
  if (Array.isArray(input?.rows)) return input.rows as T[];
  return [];
}

function initialsOf(value: string): string {
  const parts = safeStr(value).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "S";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

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
      const url = new URL(base);
      return `${url.protocol}//${url.host}`;
    } catch {
      return "http://127.0.0.1:8012";
    }
  }

  return "http://127.0.0.1:8012";
}

function resolveImageSrc(raw: any): string {
  const value = safeStr(raw);
  if (!value) return "";

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("blob:") ||
    value.startsWith("data:")
  ) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${apiOrigin()}${value}`;
  }

  return `${apiOrigin()}/${value.replace(/^\/+/, "")}`;
}

function normalizeShop(raw: any, fallbackGmfnId: string, currentClan: any): ShopSummary | null {
  if (!raw) return null;

  const src = rowsOf<any>(raw)[0] || raw?.item || raw?.shop || raw?.data || raw;

  const gmfnId = firstTruthy(
    src?.owner_gmfn_id,
    src?.gmfn_id,
    src?.member_gmfn_id,
    fallbackGmfnId
  );

  const ownerName = firstTruthy(
    src?.owner_display_name,
    src?.owner_name,
    src?.display_name,
    src?.member_name,
    src?.name,
    gmfnId,
    "Shop owner"
  );

  const shopName = firstTruthy(
    src?.name,
    src?.shop_name,
    src?.display_name,
    src?.title,
    src?.business_name,
    gmfnId ? `${gmfnId} Shop` : "",
    "Shop"
  );

  const description = firstTruthy(
    src?.description,
    src?.bio,
    src?.shop_description,
    src?.detail
  );

  const communityName = firstTruthy(
    src?.marketplace_name,
    src?.clan_name,
    src?.community_name,
    currentClan?.marketplace_name,
    currentClan?.name,
    currentClan?.display_name
  );

  const imageUrl = resolveImageSrc(
    src?.image_url ||
      src?.profile_image_url ||
      src?.shop_image_url ||
      src?.cover_image_url ||
      src?.banner_url ||
      src?.logo_url ||
      src?.shop_logo_url
  );

  return {
    id: positiveNumber(src?.id) || undefined,
    gmfnId,
    ownerName,
    shopName,
    description,
    communityName,
    trustBand: firstTruthy(src?.trust_band, src?.owner_trust_band, "Visible seller"),
    imageUrl,
    visibleBlocks: 0,
    whatsapp: firstTruthy(src?.whatsapp_number, src?.whatsapp),
    telegram: firstTruthy(src?.telegram_handle, src?.telegram),
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 18,
    boxShadow:
      "0 14px 34px rgba(15,23,42,0.045), 0 2px 8px rgba(15,23,42,0.02)",
    overflow: "hidden",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 14,
  };
}

function statTile(bg = "#FFFFFF", border = "1px solid rgba(11,31,51,0.08)"): React.CSSProperties {
  return {
    borderRadius: 16,
    border,
    background: bg,
    padding: 14,
  };
}

function mediaBox(minHeight = 220): React.CSSProperties {
  return {
    width: "100%",
    minHeight,
    borderRadius: 20,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "linear-gradient(180deg, #E8F0FF 0%, #DDEBFF 100%)",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#5D7389",
    fontWeight: 900,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#5F7287",
    fontSize: 14,
    lineHeight: 1.75,
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    background: primary ? "rgba(11,99,209,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#0B63D1" : "#51657A",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  };
}

function actionBtn(
  kind: "primary" | "secondary" = "secondary",
  disabled = false
): React.CSSProperties {
  if (kind === "primary") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 42,
      padding: "10px 14px",
      borderRadius: 14,
      border: "none",
      background: disabled ? "#CBD5E1" : "#0B63D1",
      color: "#FFFFFF",
      fontWeight: 900,
      fontSize: 14,
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "nowrap",
      opacity: disabled ? 0.86 : 1,
    };
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 800,
    fontSize: 14,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
    opacity: disabled ? 0.86 : 1,
  };
}

function collapseToggle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: "#24415C",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

function noticeCard(tone: NoticeTone): React.CSSProperties {
  return {
    ...innerCard(tone === "success" ? "#F3FBF5" : "#FEF2F2"),
    color: tone === "success" ? "#166534" : "#991B1B",
    border:
      tone === "success"
        ? "1px solid rgba(34,197,94,0.16)"
        : "1px solid rgba(239,68,68,0.16)",
    fontWeight: 800,
    padding: 14,
  };
}

export default function CommunityShopControlPanel() {
  const selectedClanId = Number(api.getSelectedClanId?.() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [open, setOpen] = useState<boolean>(() => {
    try {
      if (typeof window === "undefined") return true;
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return true;
      return JSON.parse(raw) !== false;
    } catch {
      return true;
    }
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(
    null
  );
  const [shop, setShop] = useState<ShopSummary | null>(null);
  const [communityLabel, setCommunityLabel] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 980);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(open));
    } catch {
      // ignore
    }
  }, [open]);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const [meRes, clanRes] = await Promise.all([
          api.getMe().catch(() => null),
          api.getCurrentClan().catch(() => null),
        ]);

        const gmfnId = firstTruthy(meRes?.gmfn_id);

        let shopRes: any = null;

        if (gmfnId) {
          shopRes = await api
            .getMarketplaceShopByGmfnId(gmfnId, {
              clan_id: selectedClanId || undefined,
              header_clan_id: selectedClanId || undefined,
            })
            .catch(() => null);

          if (!shopRes) {
            shopRes = await api.getMarketplaceShopByGmfnId(gmfnId).catch(() => null);
          }
        }

        const normalizedShop = normalizeShop(shopRes, gmfnId, clanRes);

        let visibleBlocks = 0;

        if (normalizedShop?.id) {
          const productsRes = await api
            .getMarketplaceProducts({
              shop_id: normalizedShop.id,
              clan_id: selectedClanId || undefined,
              header_clan_id: selectedClanId || undefined,
              only_active: true,
              include_reposted: true,
              limit: 200,
            })
            .catch(() => null);

          visibleBlocks = rowsOf<any>(productsRes).length;
        }

        if (!alive) return;

        setCommunityLabel(
          firstTruthy(
            clanRes?.marketplace_name,
            clanRes?.name,
            clanRes?.display_name,
            selectedClanId ? `Community ${selectedClanId}` : "No community selected"
          )
        );

        setShop(
          normalizedShop
            ? {
                ...normalizedShop,
                visibleBlocks,
              }
            : null
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedClanId]);

  const publicShopTo = useMemo(() => {
    const gmfnId = safeStr(shop?.gmfnId);
    return gmfnId ? `/shop/${encodeURIComponent(gmfnId)}` : "";
  }, [shop]);

  const shopImageSrc = useMemo(() => {
    return safeStr(shop?.imageUrl);
  }, [shop]);

  const topLine = useMemo(() => {
    if (!shop) return "Shop control is ready inside Community Home.";
    return firstTruthy(
      shop.description,
      "Manage the owner surface here, then keep the public shop page clean for visitors."
    );
  }, [shop]);

  function copyShopLink() {
    if (!publicShopTo) {
      setNotice({ tone: "error", text: "Public shop link is not ready yet." });
      return;
    }

    const url =
      typeof window === "undefined"
        ? publicShopTo
        : `${window.location.origin}${publicShopTo}`;

    api.safeCopy(url);
    setNotice({ tone: "success", text: "Public shop link copied." });
  }

  return (
    <section style={pageCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)")}>
      {notice ? (
        <div style={{ marginBottom: 14, ...noticeCard(notice.tone) }}>{notice.text}</div>
      ) : null}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={sectionLabel()}>Shop control</div>
          <div style={{ marginTop: 8, ...helperText(), maxWidth: 820 }}>
            This is the owner-side shop control entry inside Community Home. Public Shop Gallery stays visitor-clean while the full working surface remains here.
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          style={collapseToggle()}
        >
          {open ? "Collapse" : "Open"}
        </button>
      </div>

      {open ? (
        loading ? (
          <div style={{ marginTop: 16, color: "#64748B", lineHeight: 1.8 }}>
            Loading shop control summary...
          </div>
        ) : (
          <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
            <div
              style={{
                ...softCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
                border: "1px solid rgba(11,99,209,0.10)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "240px minmax(0, 1fr)",
                  gap: 16,
                  alignItems: "stretch",
                }}
              >
                <div style={mediaBox(220)}>
                  {shopImageSrc ? (
                    <img
                      src={shopImageSrc}
                      alt={safeStr(shop?.shopName || "Shop")}
                      style={{
                        width: "100%",
                        height: "100%",
                        minHeight: 220,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        color: "#37506A",
                        fontWeight: 900,
                        fontSize: 28,
                        lineHeight: 1.25,
                        padding: 18,
                      }}
                    >
                      {initialsOf(safeStr(shop?.shopName || shop?.ownerName || "Shop"))}
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <span style={badge(true)}>Community Home</span>
                    <span style={badge(false)}>Owner-side surface</span>
                    <span style={badge(false)}>
                      Visible blocks: {positiveNumber(shop?.visibleBlocks)}
                    </span>
                  </div>

                  <div
                    style={{
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: isCompact ? 26 : 32,
                      lineHeight: 1.08,
                    }}
                  >
                    {safeStr(shop?.shopName || "Your shop control room")}
                  </div>

                  <div style={helperText()}>{topLine}</div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={badge(true)}>
                      GMFN ID: {safeStr(shop?.gmfnId || "Pending")}
                    </span>
                    <span style={badge(false)}>Community: {communityLabel}</span>
                    <span style={badge(false)}>
                      Trust: {safeStr(shop?.trustBand || "Visible seller")}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <OriginLink to="/app/shop-control" style={actionBtn("primary")}>
                      Open Shop Control
                    </OriginLink>

                    {publicShopTo ? (
                      <OriginLink to={publicShopTo} style={actionBtn("secondary")}>
                        Open Public Shop
                      </OriginLink>
                    ) : (
                      <button type="button" disabled style={actionBtn("secondary", true)}>
                        Open Public Shop
                      </button>
                    )}

                    <button type="button" onClick={copyShopLink} style={actionBtn("secondary")}>
                      Copy Shop Link
                    </button>

                    <OriginLink to="/app/marketplace" style={actionBtn("secondary")}>
                      Marketplace
                    </OriginLink>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr 1fr"
                  : "repeat(5, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <div style={statTile("#F8FBFF", "1px solid rgba(11,99,209,0.10)")}>
                <div style={sectionLabel()}>Owner</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    lineHeight: 1.35,
                  }}
                >
                  {safeStr(shop?.ownerName || "Shop owner")}
                </div>
              </div>

              <div style={statTile("#FFFFFF")}>
                <div style={sectionLabel()}>WhatsApp</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    lineHeight: 1.35,
                  }}
                >
                  {safeStr(shop?.whatsapp || "Not set")}
                </div>
              </div>

              <div style={statTile("#FFFFFF")}>
                <div style={sectionLabel()}>Telegram</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    lineHeight: 1.35,
                  }}
                >
                  {safeStr(shop?.telegram || "Not set")}
                </div>
              </div>

              <div style={statTile("#FFFFFF")}>
                <div style={sectionLabel()}>Public shop</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    lineHeight: 1.35,
                  }}
                >
                  {publicShopTo ? "Ready" : "Pending"}
                </div>
              </div>

              <div style={statTile("#FFFFFF")}>
                <div style={sectionLabel()}>Visible blocks</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 20,
                    lineHeight: 1.2,
                  }}
                >
                  {positiveNumber(shop?.visibleBlocks)}
                </div>
              </div>
            </div>

            <div
              style={{
                ...innerCard("#FFFFFF"),
                border: "1px solid rgba(11,99,209,0.10)",
              }}
            >
              <div style={sectionLabel()}>Why this stays here</div>
              <div
                style={{
                  marginTop: 10,
                  ...helperText(),
                  maxWidth: 900,
                }}
              >
                Shop Control belongs inside Community Home because this is the owner-side working context. The public shop route should only show the signpost, trusted identity, products, and outward share actions.
              </div>
            </div>
          </div>
        )
      ) : null}
    </section>
  );
}
