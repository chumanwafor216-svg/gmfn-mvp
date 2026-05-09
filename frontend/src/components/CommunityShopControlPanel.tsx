import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as api from "../lib/api";
import { navigateWithOrigin } from "../lib/nav";
import { publicShopPath, publicShopUrl } from "../lib/publicLinks";
import {
  actionTapGuardProps,
  brandStableTapTarget,
} from "../styles/gmfnBrand";

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

function withClanQuery(path: string, clanId: number): string {
  const safeClanId = positiveNumber(clanId);
  if (!path || !safeClanId) return path;

  const [baseWithQuery, hash = ""] = path.split("#");
  const separator = baseWithQuery.includes("?") ? "&" : "?";
  const next = `${baseWithQuery}${separator}clan_id=${encodeURIComponent(
    String(safeClanId)
  )}`;
  return hash ? `${next}#${hash}` : next;
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
  const stableTapLayer: React.CSSProperties = {
    ...brandStableTapTarget(),
    position: "relative",
    zIndex: 20,
  };

  if (kind === "primary") {
    return {
      ...stableTapLayer,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 0,
      maxWidth: "100%",
      boxSizing: "border-box",
      minHeight: 48,
      padding: "12px 14px",
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
      boxShadow: disabled
        ? "none"
        : "0 5px 0 rgba(7,24,39,0.28), 0 16px 30px rgba(10,24,49,0.18), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -10px 18px rgba(7,24,39,0.10)",
      lineHeight: 1.18,
    };
  }

  return {
    ...stableTapLayer,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
      minHeight: 48,
      padding: "12px 14px",
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
    lineHeight: 1.18,
    boxShadow: disabled
      ? "none"
      : "0 4px 0 rgba(79,97,120,0.16), 0 12px 24px rgba(10,24,49,0.09), inset 0 1px 0 rgba(255,255,255,0.24), inset 0 -8px 14px rgba(15,59,116,0.08)",
  };
}

function collapseToggle(): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 30,
    isolation: "isolate",
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
    lineHeight: 1.18,
    boxShadow:
      "0 5px 0 rgba(79,97,120,0.16), 0 13px 26px rgba(10,24,49,0.09), inset 0 1px 0 rgba(255,255,255,0.24), inset 0 -9px 16px rgba(15,59,116,0.08)",
    outline: "none",
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

function collapseButtonRow(): React.CSSProperties {
  return {
    marginTop: 12,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    gap: 8,
    flexWrap: "wrap",
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

function panelButtonGuardProps(): Pick<
  React.HTMLAttributes<HTMLElement>,
  "onPointerDown" | "onMouseDown"
> {
  return actionTapGuardProps();
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

        if (!alive) return;

        setCommunityLabel(
          firstTruthy(
            clanRes?.marketplace_name,
            clanRes?.name,
            clanRes?.display_name,
            selectedClanId ? `Community ${selectedClanId}` : "No community selected"
          )
        );

        setShop(normalizedShop);
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
    return gmfnId ? publicShopPath(gmfnId) : "";
  }, [shop]);

  const publicShopLink = useMemo(() => {
    const gmfnId = safeStr(shop?.gmfnId);
    return gmfnId ? publicShopUrl(gmfnId) : "";
  }, [shop]);

  const shopImageSrc = useMemo(() => {
    return safeStr(shop?.imageUrl);
  }, [shop]);

  const topLine = useMemo(() => {
    if (!shop) return "Community Home can still launch the owner shop desk while the shop record is loading.";
    return firstTruthy(
      shop.description,
      "Use this owner desk to prepare the one shop here, then let Marketplace carry the live community-facing side."
    );
  }, [shop]);

  function copyShopLink() {
    if (!publicShopTo) {
      setNotice({ tone: "error", text: "Public shop link is not ready yet." });
      return;
    }

    api.safeCopy(publicShopLink);
    setNotice({ tone: "success", text: "Public shop link copied." });
  }

  function openPanelRoute(to: string) {
    navigateWithOrigin(navigate, to, location);
  }

  function togglePanelFromButton() {
    setOpen((prev) => !prev);
  }

  return (
    <section style={pageCard("#FFFFFF")}>
      {notice ? (
        <div style={{ marginBottom: 14, ...noticeCard(notice.tone) }}>{notice.text}</div>
      ) : null}

      <div>
        <div style={collapseHeaderText("center")}>
          <div style={sectionLabel("center")}>Owner shop control</div>
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
            Manage the one GSN shop from Community Home. Keep the public shop face clear for visitors.
          </div>
        </div>

        <div style={collapseButtonRow()}>
          <button
            type="button"
            {...panelButtonGuardProps()}
            onClick={() => togglePanelFromButton()}
            style={collapseHeaderButton(isCompact)}
          >
            {open ? "Collapse owner shop control" : "Open owner shop control"}
          </button>
        </div>
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
                    <span style={badge(true)}>Owner launcher</span>
                    <span style={badge(false)}>One-shop owner work</span>
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
                    <span style={badge(false)}>Selected community: {communityLabel}</span>
                    <span style={badge(false)}>
                      Shop trust: {safeStr(shop?.trustBand || "Visible seller")}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      borderRadius: 14,
                      border: "1px solid rgba(11,99,209,0.12)",
                      background:
                        "linear-gradient(180deg, rgba(248,251,255,0.98) 0%, rgba(239,246,255,0.96) 100%)",
                      color: "#0B1F33",
                      fontSize: 12,
                      fontWeight: 850,
                      lineHeight: 1.45,
                      padding: "10px 12px",
                      wordBreak: "break-word",
                      overflowWrap: "anywhere",
                      minHeight: 46,
                    }}
                  >
                    {publicShopLink || "Public shop link is not ready yet."}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gridAutoRows: "52px",
                      gap: 10,
                      alignItems: "stretch",
                      overflowAnchor: "none",
                    }}
                  >
                <button
                  type="button"
                  {...panelButtonGuardProps()}
                  onClick={() => openPanelRoute("/app/shop-control?section=summary")}
                  style={{ ...actionBtn("primary"), height: 52, maxHeight: 52, padding: "0 12px", transition: "none" }}
                >
                      Open Owner Shop Control
                    </button>

                    {publicShopTo ? (
                      <button
                        type="button"
                        {...panelButtonGuardProps()}
                        onClick={() => openPanelRoute(publicShopTo)}
                        style={{ ...actionBtn("secondary"), height: 52, maxHeight: 52, padding: "0 12px", transition: "none" }}
                      >
                        Open Public Shop Face
                      </button>
                    ) : (
                      <button
                        type="button"
                        {...panelButtonGuardProps()}
                        disabled
                        style={{ ...actionBtn("secondary", true), height: 52, maxHeight: 52, padding: "0 12px", transition: "none" }}
                      >
                        Open Public Shop Face
                      </button>
                    )}

                      <button
                        type="button"
                        {...panelButtonGuardProps()}
                        onClick={copyShopLink}
                        disabled={!publicShopTo}
                        style={{ ...actionBtn("secondary", !publicShopTo), height: 52, maxHeight: 52, padding: "0 12px", transition: "none" }}
                      >
                        Copy Public Shop Link
                    </button>

                    <button
                      type="button"
                      {...panelButtonGuardProps()}
                      onClick={() =>
                        openPanelRoute(
                          withClanQuery("/app/marketplace", selectedClanId)
                        )
                      }
                      style={{ ...actionBtn("secondary"), height: 52, maxHeight: 52, padding: "0 12px", transition: "none" }}
                    >
                      Open Community Marketplace
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div
              id="community-shop-control-owner-shortcuts"
              style={{
                ...innerCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
                border: "1px solid rgba(11,99,209,0.10)",
              }}
            >
              <div style={sectionLabel()}>Owner shortcuts</div>
              <div style={{ marginTop: 8, ...helperText(), maxWidth: 760 }}>
                Community Home launches one-shop owner work. Marketplace
                carries the live community-facing activity, member movement,
                and outward links.
              </div>
              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "repeat(4, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  {...panelButtonGuardProps()}
                  onClick={() => openPanelRoute("/app/shop-control?section=picture-gallery")}
                  style={actionBtn("secondary")}
                >
                  Pictures & Products
                </button>
                <button
                  type="button"
                  {...panelButtonGuardProps()}
                  onClick={() => openPanelRoute("/app/shop-control?section=spotlight")}
                  style={actionBtn("secondary")}
                >
                  Owner Spotlight
                </button>
                <button
                  type="button"
                  {...panelButtonGuardProps()}
                  onClick={() => openPanelRoute("/app/shop-control/subscription-spotlight")}
                  style={actionBtn("secondary")}
                >
                  Paid Spotlight
                </button>
                <button
                  type="button"
                  {...panelButtonGuardProps()}
                  onClick={() => openPanelRoute("/app/vault-control")}
                  style={actionBtn("secondary")}
                >
                  Private Vault Access
                </button>
              </div>
            </div>
          </div>
        )
      ) : null}
    </section>
  );
}



