import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as api from "../lib/api";
import { navigateWithOrigin } from "../lib/nav";
import { publicFrontendUrl } from "../lib/publicLinks";

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

type CommunityShopControlPanelProps = {
  forceOpenSignal?: number;
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
      return typeof window !== "undefined"
        ? String(window.location.origin || "").trim().replace(/\/+$/, "")
        : "";
    }
  }

  return typeof window !== "undefined"
    ? String(window.location.origin || "").trim().replace(/\/+$/, "")
    : "";
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
  const resolvedBg =
    bg === "#FFFFFF"
      ? "radial-gradient(circle at top left, rgba(11,99,209,0.12) 0%, rgba(11,99,209,0.00) 30%), radial-gradient(circle at 92% 12%, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.00) 28%), linear-gradient(180deg, #F8FBFF 0%, #EEF5FD 54%, #DCEBFA 100%)"
      : bg;

  return {
    borderRadius: "clamp(18px, 4vw, 24px)",
    border: "1px solid rgba(16,37,59,0.14)",
    background: resolvedBg,
    padding: "clamp(12px, 3.6vw, 18px)",
    boxShadow:
      "0 20px 44px rgba(10,24,49,0.08), inset 0 1px 0 rgba(255,255,255,0.72)",
    overflow: "hidden",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  const resolvedBg =
    bg === "#F8FBFF"
      ? "linear-gradient(180deg, #F8FBFF 0%, #EEF5FF 100%)"
      : bg;

  return {
    borderRadius: 18,
    border: "1px solid rgba(16,37,59,0.10)",
    background: resolvedBg,
    padding: 16,
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.86), 0 12px 26px rgba(10,24,49,0.05)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  const resolvedBg =
    bg === "#FFFFFF"
      ? "linear-gradient(180deg, #FFFFFF 0%, #F4F9FF 100%)"
      : bg === "#FCFEFF"
      ? "linear-gradient(180deg, #FCFEFF 0%, #F4F9FF 100%)"
      : bg === "#FFF9E7"
      ? "radial-gradient(circle at top left, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.00) 28%), linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 52%, #EEF5FD 100%)"
      : bg;

  return {
    borderRadius: 18,
    border: "1px solid rgba(16,37,59,0.12)",
    background: resolvedBg,
    padding: 14,
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.84), 0 14px 28px rgba(10,24,49,0.05)",
  };
}

function gearCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...innerCard(bg),
    display: "grid",
    gap: 10,
    alignContent: "space-between",
    minHeight: 168,
  };
}

function statTile(bg = "#FFFFFF", border = "1px solid rgba(11,31,51,0.08)"): React.CSSProperties {
  const resolvedBg =
    bg === "#FFFFFF"
      ? "linear-gradient(180deg, #FFFFFF 0%, #F4F9FF 100%)"
      : bg === "#F8FBFF"
      ? "linear-gradient(180deg, #F8FBFF 0%, #EEF5FF 100%)"
      : bg;

  return {
    borderRadius: 16,
    border,
    background: resolvedBg,
    padding: 14,
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.84), 0 10px 22px rgba(10,24,49,0.04)",
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

function sectionLabel(align: "left" | "center" = "left"): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#5D7389",
    fontWeight: 900,
    letterSpacing: 0.35,
    textTransform: "uppercase",
    textAlign: align,
    width: align === "center" ? "100%" : undefined,
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#5F7287",
    fontSize: "clamp(12.5px, 3.4vw, 14px)",
    lineHeight: 1.5,
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
    whiteSpace: "normal",
  };
}

function actionBtn(
  kind: "primary" | "secondary" = "secondary",
  disabled = false
): React.CSSProperties {
  if (kind === "primary") {
    return {
      position: "relative",
      zIndex: 1,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 0,
      maxWidth: "100%",
      boxSizing: "border-box",
      minHeight: 42,
      padding: "10px 14px",
      borderRadius: 14,
      border: disabled
        ? "1px solid rgba(148,163,184,0.45)"
        : "1px solid rgba(16,37,59,0.14)",
      background: disabled
        ? "#CBD5E1"
        : "linear-gradient(180deg, #1B4B78 0%, #2B6599 56%, #3B78AE 100%)",
      color: "#FFFFFF",
      fontWeight: 900,
      fontSize: 14,
      textAlign: "center",
      textDecoration: "none",
      alignContent: "center",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      overflowWrap: "anywhere",
      opacity: disabled ? 0.86 : 1,
      touchAction: "manipulation",
      WebkitTapHighlightColor: "transparent",
      userSelect: "none",
      boxShadow: disabled
        ? "none"
        : "0 5px 0 rgba(7,24,39,0.28), 0 16px 30px rgba(10,24,49,0.18), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -10px 18px rgba(7,24,39,0.10)",
      lineHeight: 1.18,
    };
  }

  return {
    position: "relative",
    zIndex: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
    minHeight: 42,
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(229,237,249,0.96) 100%)",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 800,
    fontSize: 14,
    textAlign: "center",
    textDecoration: "none",
    alignContent: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    opacity: disabled ? 0.86 : 1,
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    lineHeight: 1.18,
    boxShadow: disabled
      ? "none"
      : "0 4px 0 rgba(79,97,120,0.16), 0 12px 24px rgba(10,24,49,0.09), inset 0 1px 0 rgba(255,255,255,0.24), inset 0 -8px 14px rgba(15,59,116,0.08)",
  };
}

function collapseToggle(): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 5,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
    minHeight: 50,
    padding: "12px 16px",
    borderRadius: 16,
    border: "1px solid rgba(16,37,59,0.14)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(229,237,249,0.96) 100%)",
    color: "#0B1F33",
    fontWeight: 800,
    fontSize: 13,
    textAlign: "center",
    alignContent: "center",
    cursor: "pointer",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    flex: "0 0 auto",
    touchAction: "manipulation",
    lineHeight: 1.18,
    boxShadow:
      "0 5px 0 rgba(79,97,120,0.16), 0 13px 26px rgba(10,24,49,0.09), inset 0 1px 0 rgba(255,255,255,0.24), inset 0 -9px 16px rgba(15,59,116,0.08)",
    outline: "none",
    outlineOffset: 0,
    appearance: "none",
    WebkitAppearance: "none",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
  };
}

function collapseHeaderLayout(isCompact: boolean): React.CSSProperties {
  return {
    position: "relative",
    display: "grid",
    gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
    gap: isCompact ? 10 : 12,
    alignItems: "start",
  };
}

function collapseHeaderText(align: "left" | "center" = "left"): React.CSSProperties {
  return {
    minWidth: 0,
    textAlign: align,
    justifySelf: align === "center" ? "center" : undefined,
    width: "100%",
  };
}

function collapseHeaderButton(isCompact: boolean): React.CSSProperties {
  return {
    ...collapseToggle(),
    justifySelf: isCompact ? "stretch" : "end",
    alignSelf: "start",
    width: isCompact ? "100%" : undefined,
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

function stopPanelTap(event: React.SyntheticEvent) {
  event.stopPropagation();
}

export default function CommunityShopControlPanel({
  forceOpenSignal = 0,
}: CommunityShopControlPanelProps) {
  const navigate = useNavigate();
  const location = useLocation();
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
  const collapseToggleTimerRef = useRef<number | null>(null);
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
    return () => {
      if (collapseToggleTimerRef.current !== null) {
        window.clearTimeout(collapseToggleTimerRef.current);
        collapseToggleTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (forceOpenSignal <= 0) return;
    setOpen(true);
  }, [forceOpenSignal]);

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
      "Manage the owner page here, then keep the public shop page clean for visitors."
    );
  }, [shop]);

  function copyShopLink() {
    if (!publicShopTo) {
      setNotice({ tone: "error", text: "Public shop link is not ready yet." });
      return;
    }

    const url = publicFrontendUrl(publicShopTo);

    api.safeCopy(url);
    setNotice({ tone: "success", text: "Public shop link copied." });
  }

  function openPanelRoute(event: React.SyntheticEvent<HTMLElement>, to: string) {
    event.preventDefault();
    stopPanelTap(event);
    navigateWithOrigin(navigate, to, location);
  }

  function togglePanelFromButton(event: React.SyntheticEvent<HTMLElement>) {
    event.preventDefault();
    stopPanelTap(event);

    if (collapseToggleTimerRef.current !== null) {
      window.clearTimeout(collapseToggleTimerRef.current);
    }

    collapseToggleTimerRef.current = window.setTimeout(() => {
      collapseToggleTimerRef.current = null;
      setOpen((prev) => !prev);
    }, 90);
  }

  return (
    <section style={pageCard("#FFFFFF")}>
      {notice ? (
        <div style={{ marginBottom: 14, ...noticeCard(notice.tone) }}>{notice.text}</div>
      ) : null}

      <div
        style={collapseHeaderLayout(isCompact)}
      >
        <div style={collapseHeaderText("center")}>
          <div style={sectionLabel("center")}>Shop control</div>
          <div
            style={{
              marginTop: 8,
              ...helperText(),
              maxWidth: 820,
              marginLeft: "auto",
              marginRight: "auto",
              textAlign: "center",
            }}
          >
            Manage shop tools. Keep the public gallery clean.
          </div>
        </div>

        <button
          type="button"
          onPointerDown={stopPanelTap}
          onClick={togglePanelFromButton}
          style={collapseHeaderButton(isCompact)}
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
                    <span style={badge(false)}>Owner tools</span>
                    <span style={badge(false)}>
                      Visible items: {positiveNumber(shop?.visibleBlocks)}
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
                    {safeStr(shop?.shopName || "Your shop tools")}
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
                      GSN ID: {safeStr(shop?.gmfnId || "Pending")}
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
                    <button
                      type="button"
                      onClick={(event) =>
                        openPanelRoute(event, "/app/shop-control#shop-control-summary")
                      }
                      style={actionBtn("primary")}
                    >
                      Open Shop Tools
                    </button>

                    {publicShopTo ? (
                      <button
                        type="button"
                        onClick={(event) => openPanelRoute(event, publicShopTo)}
                        style={actionBtn("secondary")}
                      >
                        Open Public Shop
                      </button>
                    ) : (
                      <button type="button" disabled style={actionBtn("secondary", true)}>
                        Open Public Shop
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(event) => {
                        stopPanelTap(event);
                        copyShopLink();
                      }}
                      style={actionBtn("secondary")}
                    >
                      Copy Shop Link
                    </button>

                    <button
                      type="button"
                      onClick={(event) => openPanelRoute(event, "/app/marketplace")}
                      style={actionBtn("secondary")}
                    >
                      Marketplace
                    </button>
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
                <div style={sectionLabel()}>Visible items</div>
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
                ...innerCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
                border: "1px solid rgba(11,99,209,0.10)",
              }}
            >
              <div>
                <div style={sectionLabel()}>Shop control tools</div>
                <div style={{ marginTop: 8, ...helperText(), maxWidth: 760 }}>
                  Four shop areas sit here. Each area has its own heading and its own
                  tools, so public gallery, ordinary spotlight, paid spotlight, and Vault
                  do not get mixed together.
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                <div style={gearCard("#FFFFFF")}>
                  <div>
                    <div style={sectionLabel()}>1. Public shop gallery</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#0B1F33",
                        fontWeight: 900,
                        fontSize: 20,
                        lineHeight: 1.2,
                      }}
                    >
                      Picture and ordinary products
                    </div>
                    <div style={{ marginTop: 8, ...helperText() }}>
                      Use this for the normal public shop: shop picture, shop details,
                      and public products people are allowed to see.
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={badge(true)}>Visible items: {positiveNumber(shop?.visibleBlocks)}</span>
                      <span style={badge(false)}>{publicShopTo ? "Public link ready" : "Public link pending"}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={(event) =>
                        openPanelRoute(event, "/app/shop-control#shop-control-picture-gallery")
                      }
                      style={actionBtn("primary")}
                    >
                      Open Gallery Tools
                    </button>
                    <button
                      type="button"
                      onClick={(event) => openPanelRoute(event, "/app/shop-assets")}
                      style={actionBtn("secondary")}
                    >
                      Manage Products
                    </button>
                  </div>
                </div>

                <div style={gearCard("#FFFFFF")}>
                  <div>
                    <div style={sectionLabel()}>2. Ordinary spotlight</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#0B1F33",
                        fontWeight: 900,
                        fontSize: 20,
                        lineHeight: 1.2,
                      }}
                    >
                      Free shop visibility
                    </div>
                    <div style={{ marginTop: 8, ...helperText() }}>
                      Publish the normal spotlight with a picture, short video, or message.
                      This is separate from paid priority.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(event) =>
                      openPanelRoute(event, "/app/shop-control#shop-control-spotlight")
                    }
                    style={actionBtn("primary")}
                  >
                    Open Ordinary Spotlight
                  </button>
                </div>

                <div style={gearCard("#FFF9E7")}>
                  <div>
                    <div style={sectionLabel()}>3. Paid spotlight subscription</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#0B1F33",
                        fontWeight: 900,
                        fontSize: 20,
                        lineHeight: 1.2,
                      }}
                    >
                      Priority spotlight
                    </div>
                    <div style={{ marginTop: 8, ...helperText() }}>
                      Start or check the paid spotlight subscription here. After
                      confirmation, the spotlight publisher can use paid priority.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(event) =>
                      openPanelRoute(event, "/app/shop-control#shop-control-paid-spotlight")
                    }
                    style={actionBtn("primary")}
                  >
                    Open Paid Spotlight
                  </button>
                </div>

                <div style={gearCard("#FFF9E7")}>
                  <div>
                    <div style={sectionLabel()}>4. Vault and private gallery</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#0B1F33",
                        fontWeight: 900,
                        fontSize: 20,
                        lineHeight: 1.2,
                      }}
                    >
                      Private subscription access
                    </div>
                    <div style={{ marginTop: 8, ...helperText() }}>
                      Vault is for private offers and controlled access links. Keep its
                      subscription and private gallery tools inside this lane.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={(event) =>
                        openPanelRoute(
                          event,
                          "/app/shop-control#shop-control-vault-subscription"
                        )
                      }
                      style={actionBtn("primary")}
                    >
                      Open Vault Subscription
                    </button>
                    <button
                      type="button"
                      onClick={(event) =>
                        openPanelRoute(event, "/app/shop-control#shop-control-vault")
                      }
                      style={actionBtn("secondary")}
                    >
                      Open Vault Gallery
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                ...innerCard("#FFFFFF"),
                border: "1px solid rgba(11,99,209,0.10)",
              }}
            >
              <div style={sectionLabel()}>How your shop works</div>
              <div
                style={{
                  marginTop: 10,
                  ...helperText(),
                  maxWidth: 900,
                }}
              >
                Your GSN ID owns one shop. Manage that shop here, then open Marketplace
                when you want to work inside one selected community.
              </div>
            </div>
          </div>
        )
      ) : null}
    </section>
  );
}



