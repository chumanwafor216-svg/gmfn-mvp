import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import OriginLink from "../components/OriginLink";
import SpotlightMediaFrame from "../components/SpotlightMediaFrame";
import {
  getCurrentClan,
  getMe,
  getPublicMarketplaceShopByGmfnId,
  isAuthenticated,
  safeCopy,
} from "../lib/api";
import { publicFrontendUrl } from "../lib/publicLinks";
import {
  SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS,
  SPOTLIGHT_PILOT_ROTATION_MS,
} from "../lib/spotlightPilot";
import { institutionalBlueRailShell } from "../lib/institutionalSurface";

type ShopProfile = {
  id?: number;
  clanId?: number;
  gmfnId: string;
  shopName: string;
  ownerName: string;
  description: string;
  communityName: string;
  trustBand: string;
  trustScore: string;
  imageUrl: string;
  whatsapp: string;
  telegram: string;
};

type ShopProduct = {
  id?: number;
  slotNumber: number;
  name: string;
  description: string;
  priceText: string;
  currency: string;
  imageUrl: string;
  videoUrl: string;
  visibilityMode: string;
  createdAt: string;
  originShopName: string;
  repostsUsed: number;
  distributionSlotsRemaining: number;
};

type ShopBroadcast = {
  id?: number;
  imageUrl: string;
  videoUrl: string;
  message: string;
  sourceShopName: string;
  sourceClanName: string;
  sourceClanId?: number;
  trustBand: string;
  trustScore: string;
  authorName: string;
  authorGmfnId: string;
  createdAt?: string;
};

type ViewerProfile = {
  gmfn_id?: string | null;
  gmfnId?: string | null;
  display_name?: string | null;
  displayName?: string | null;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
};

type NoticeTone = "success" | "error";

const GALLERY_SLOTS_TOTAL = 12;
const PLACEHOLDER_TEXTS = new Set([
  "string",
  "null",
  "undefined",
  "n/a",
  "na",
]);

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function cleanText(x: any): string {
  const text = safeStr(x);
  if (!text) return "";
  if (PLACEHOLDER_TEXTS.has(text.toLowerCase())) return "";
  return text;
}

function firstMeaningful(...values: any[]): string {
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

function moneyText(value: any, currency: any): string {
  const amount = cleanText(value);
  const unit = cleanText(currency || "NGN") || "NGN";

  if (!amount) return "Price on request";
  return `${amount} ${unit}`.trim();
}

function formatWhen(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return cleanText(value);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function daysSince(value?: string | null): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.floor((Date.now() - timestamp) / 86400000);
}

function productFreshnessLabel(value?: string | null): string {
  const days = daysSince(value);
  if (days === null || days < 0) return "";
  if (days <= 1) return "New today";
  if (days <= 7) return "Fresh this week";
  if (days <= 30) return "Recently added";
  return "";
}

function productVisibilityLabel(value: string): string {
  const mode = safeStr(value).toLowerCase();
  if (mode.includes("vault")) return "Vault viewing by trust link";
  return "Public offer";
}

function isCodeLikeProductName(value: string): boolean {
  const text = safeStr(value);
  return /^\d{1,6}$/.test(text) || /^slot\s*\d{1,3}$/i.test(text);
}

function productDisplayTitle(product: ShopProduct): string {
  const name = firstMeaningful(product.name);
  const description = firstMeaningful(product.description);

  if (description && (!name || isCodeLikeProductName(name))) {
    return description;
  }

  return firstMeaningful(name, description, `Product ${product.slotNumber}`);
}

function productBuyerCue(product: ShopProduct, shopName: string): string {
  const displayTitle = productDisplayTitle(product);
  const name = firstMeaningful(product.name);
  const description = firstMeaningful(product.description);

  if (description && description !== displayTitle) return description;
  if (name && name !== displayTitle && isCodeLikeProductName(name)) {
    return `Product code ${name}. Ask the shop for details.`;
  }
  if (product.priceText.toLowerCase() === "price on request") {
    return "Ask the shop for today's price and availability.";
  }
  if (shopName) return `Available from ${shopName}.`;
  return "Ask, share, or save this offer for later.";
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
    value.startsWith("blob:")
  ) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${apiOrigin()}${value}`;
  }

  return `${apiOrigin()}/${value.replace(/^\/+/, "")}`;
}

function normalizeShop(
  raw: any,
  fallbackGmfnId: string,
  currentClan: any
): ShopProfile | null {
  if (!raw) return null;

  const src =
    rowsOf<any>(raw)[0] ||
    raw?.item ||
    raw?.shop ||
    raw?.data ||
    raw;

  const ownerGmfnId = firstMeaningful(
    src?.owner_gmfn_id,
    src?.gmfn_id,
    src?.member_gmfn_id,
    fallbackGmfnId
  );

  const ownerName = firstMeaningful(
    src?.owner_display_name,
    src?.owner_name,
    src?.display_name,
    src?.member_name,
    src?.name,
    src?.user_name,
    ownerGmfnId,
    "Shop owner"
  );

  const shopName = firstMeaningful(
    src?.name,
    src?.shop_name,
    src?.display_name,
    src?.title,
    src?.business_name
  );

  const description = firstMeaningful(
    src?.description,
    src?.bio,
    src?.shop_description,
    src?.detail
  );

  const communityName = firstMeaningful(
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
      src?.photo_url ||
      src?.logo_url ||
      src?.shop_logo_url
  );

  return {
    id: positiveNumber(src?.id) || undefined,
    clanId: positiveNumber(src?.clan_id) || undefined,
    gmfnId: ownerGmfnId,
    ownerName: ownerName || "Shop owner",
    shopName: shopName || (ownerGmfnId ? `${ownerGmfnId} Shop` : "Shop"),
    description,
    communityName,
    trustBand: firstMeaningful(src?.trust_band, src?.owner_trust_band),
    trustScore: firstMeaningful(src?.trust_score, src?.owner_trust_score),
    imageUrl,
    whatsapp: firstMeaningful(
      src?.whatsapp_number,
      src?.whatsapp,
      src?.phone_whatsapp
    ),
    telegram: firstMeaningful(
      src?.telegram_handle,
      src?.telegram,
      src?.telegram_username
    ),
  };
}

function normalizeBroadcast(raw: any): ShopBroadcast | null {
  if (!raw) return null;

  const src = raw?.item || raw?.broadcast || raw?.data || raw;

  return {
    id: positiveNumber(src?.id) || undefined,
    imageUrl: resolveImageSrc(src?.image_url),
    videoUrl: resolveImageSrc(src?.video_url),
    message: firstMeaningful(src?.message),
    sourceShopName: firstMeaningful(src?.source_shop_name),
    sourceClanName: firstMeaningful(src?.source_clan_name),
    sourceClanId: positiveNumber(src?.source_clan_id || src?.clan_id) || undefined,
    trustBand: firstMeaningful(src?.trust_band),
    trustScore: firstMeaningful(src?.trust_score),
    authorName: firstMeaningful(src?.author_name),
    authorGmfnId: firstMeaningful(src?.author_gmfn_id),
    createdAt: firstMeaningful(src?.created_at),
  };
}

function spotlightBroadcastKey(item: ShopBroadcast | null): string {
  if (!item) return "";

  const numericId = positiveNumber(item.id);
  if (numericId > 0) return `broadcast-${numericId}`;

  return [
    firstMeaningful(item.authorGmfnId),
    firstMeaningful(item.createdAt),
    firstMeaningful(item.message),
    firstMeaningful(item.sourceShopName),
  ]
    .filter(Boolean)
    .join("|");
}

function spotlightBroadcastSortValue(item: ShopBroadcast | null): number {
  if (!item?.createdAt) return 0;
  const timestamp = new Date(item.createdAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function splitSpotlightMessage(raw: any): {
  summary: string;
  tagLabel: string;
} {
  const lines = safeStr(raw)
    .split(/\r?\n+/)
    .map((line) => firstMeaningful(line))
    .filter(Boolean);

  let tagLabel = "";
  const bodyLines: string[] = [];

  for (const line of lines) {
    if (!tagLabel && /\btag\s*:/i.test(line)) {
      tagLabel = line;
      continue;
    }
    bodyLines.push(line);
  }

  return {
    summary: firstMeaningful(bodyLines.join(" "), safeStr(raw)),
    tagLabel,
  };
}

function normalizeProduct(raw: any, slotNumber: number): ShopProduct | null {
  if (!raw) return null;

  const src = raw?.item || raw?.product || raw?.data || raw;

  const name = firstMeaningful(
    src?.name,
    src?.title,
    src?.product_name,
    `Product ${slotNumber.toString().padStart(2, "0")}`
  );

  const description = firstMeaningful(
    src?.description,
    src?.detail,
    src?.summary
  );

  const imageUrl = resolveImageSrc(
    src?.image_url ||
      src?.thumbnail_url ||
      src?.photo_url ||
      src?.cover_image_url
  );

  return {
    id: positiveNumber(src?.id) || undefined,
    slotNumber,
    name,
    description,
    priceText: moneyText(
      src?.price,
      src?.currency || src?.currency_code || "NGN"
    ),
    currency: firstMeaningful(src?.currency, src?.currency_code, "NGN") || "NGN",
    imageUrl,
    videoUrl: resolveImageSrc(src?.video_url),
    visibilityMode:
      firstMeaningful(src?.visibility_mode, "community_visible") ||
      "community_visible",
    createdAt: firstMeaningful(src?.created_at),
    originShopName: firstMeaningful(src?.origin_shop_name, src?.source_shop_name),
    repostsUsed: positiveNumber(src?.reposts_used),
    distributionSlotsRemaining: positiveNumber(
      src?.distribution_slots_remaining || src?.remaining_distribution_slots
    ),
  };
}

const SHOP_GALLERY_SURFACE =
  "radial-gradient(circle at 9% 0%, rgba(11,99,209,0.12) 0%, transparent 30%), radial-gradient(circle at 94% 5%, rgba(244,114,182,0.07) 0%, transparent 26%), radial-gradient(circle at 72% 94%, rgba(212,175,55,0.07) 0%, transparent 30%), linear-gradient(180deg, rgba(255,255,255,0.985) 0%, rgba(239,248,253,0.965) 100%)";

const SHOP_GALLERY_INNER_SURFACE =
  "radial-gradient(circle at 0% 0%, rgba(11,99,209,0.075) 0%, transparent 32%), radial-gradient(circle at 100% 0%, rgba(212,175,55,0.045) 0%, transparent 28%), linear-gradient(180deg, rgba(255,255,255,0.965) 0%, rgba(238,247,253,0.945) 100%)";

function calmSurface(bg: string): string {
  return bg === "#FFFFFF" ? SHOP_GALLERY_SURFACE : bg;
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 28,
    border: "1px solid rgba(13,95,168,0.16)",
    background: calmSurface(bg),
    padding: 20,
    boxShadow:
      "0 22px 52px rgba(8,38,67,0.09), inset 0 1px 0 rgba(255,255,255,0.78)",
    overflow: "hidden",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(13,95,168,0.12)",
    background: bg === "#FFFFFF" ? SHOP_GALLERY_INNER_SURFACE : bg,
    padding: 16,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
  };
}

function spotlightShowcaseCard(): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(246,196,83,0.42)",
    background:
      "radial-gradient(circle at 8% 0%, rgba(246,196,83,0.30) 0%, transparent 31%), radial-gradient(circle at 93% 10%, rgba(20,184,166,0.20) 0%, transparent 29%), radial-gradient(circle at 76% 90%, rgba(244,114,182,0.13) 0%, transparent 30%), linear-gradient(145deg, rgba(37,24,10,0.98) 0%, rgba(13,38,56,0.98) 48%, rgba(6,18,32,0.99) 100%)",
    padding: 9,
    boxShadow:
      "0 24px 48px rgba(7,24,39,0.20), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -18px 34px rgba(0,0,0,0.20)",
    overflow: "hidden",
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
    justifyContent: "center",
    minHeight: 30,
    padding: "6px 10px",
    borderRadius: 999,
    border: primary
      ? "1px solid rgba(29,78,216,0.12)"
      : "1px solid rgba(13,95,168,0.09)",
    background: primary
      ? "linear-gradient(180deg, rgba(235,244,255,0.98) 0%, rgba(218,233,249,0.88) 100%)"
      : "linear-gradient(180deg, rgba(248,251,254,0.96) 0%, rgba(232,239,247,0.86) 100%)",
    color: primary ? "#1D4ED8" : "#51657A",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.74)",
  };
}

const stableTapTarget: React.CSSProperties = {
  position: "relative",
  zIndex: 10,
  isolation: "isolate",
  WebkitTapHighlightColor: "transparent",
  touchAction: "manipulation",
  userSelect: "none",
  transform: "translateZ(0)",
  pointerEvents: "auto",
  appearance: "none",
  WebkitAppearance: "none",
  boxSizing: "border-box",
  outlineOffset: 4,
};

function guardButtonPress(event?: React.SyntheticEvent<HTMLElement>) {
  event?.stopPropagation();
}

function runGuardedButtonAction(
  _event: React.SyntheticEvent<HTMLElement>,
  action: () => void
) {
  action();
}

function buttonGuardProps(): Pick<
  React.HTMLAttributes<HTMLElement>,
  "onPointerDown" | "onTouchStart" | "onMouseDown"
> {
  return {
    onPointerDown: guardButtonPress,
    onTouchStart: guardButtonPress,
    onMouseDown: guardButtonPress,
  };
}

function navLinkButton(primary = false): React.CSSProperties {
  return {
    ...stableTapTarget,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    padding: "10px 13px",
    borderRadius: 999,
    border: primary
      ? "1px solid rgba(29,78,216,0.22)"
      : "1px solid rgba(13,95,168,0.14)",
    background: primary
      ? "linear-gradient(180deg, #1F5FB7 0%, #174C91 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(235,244,252,0.94) 100%)",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 900,
    fontSize: 13,
    lineHeight: 1.12,
    textAlign: "center",
    overflowWrap: "anywhere",
    textDecoration: "none",
    cursor: "pointer",
    boxShadow: primary
      ? "0 10px 22px rgba(14,73,138,0.18), inset 0 1px 0 rgba(255,255,255,0.24)"
      : "0 8px 18px rgba(8,38,67,0.08), inset 0 1px 0 rgba(255,255,255,0.82)",
  };
}

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    ...stableTapTarget,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    padding: "10px 14px",
    borderRadius: 14,
    border: disabled
      ? "1px solid rgba(148,163,184,0.28)"
      : "1px solid rgba(13,64,123,0.24)",
    background: disabled
      ? "linear-gradient(180deg, #E2E8F0 0%, #CBD5E1 100%)"
      : "linear-gradient(180deg, #1F5FB7 0%, #174C91 100%)",
    color: "#FFFFFF",
    fontWeight: 900,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.86 : 1,
    whiteSpace: "normal",
    textAlign: "center",
    overflowWrap: "anywhere",
    boxShadow: disabled
      ? "none"
      : "0 10px 20px rgba(14,73,138,0.18), inset 0 1px 0 rgba(255,255,255,0.26)",
  };
}

function secondaryBtn(disabled = false): React.CSSProperties {
  return {
    ...stableTapTarget,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    padding: "9px 12px",
    borderRadius: 14,
    border: "1px solid rgba(13,95,168,0.16)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(237,244,251,0.94) 100%)",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 800,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.86 : 1,
    whiteSpace: "normal",
    textAlign: "center",
    overflowWrap: "anywhere",
    boxShadow:
      "0 8px 18px rgba(8,38,67,0.08), inset 0 1px 0 rgba(255,255,255,0.82)",
  };
}

function noticeCard(tone: NoticeTone): React.CSSProperties {
  return {
    ...innerCard(tone === "success" ? "#F3FBF5" : "#FEF2F2"),
    border:
      tone === "success"
        ? "1px solid rgba(34,197,94,0.16)"
        : "1px solid rgba(239,68,68,0.16)",
    color: tone === "success" ? "#166534" : "#991B1B",
    fontWeight: 800,
    padding: 14,
  };
}

export default function ShopGalleryPage() {
  const { gmfnId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [broadcast, setBroadcast] = useState<ShopBroadcast | null>(null);
  const [communitySpotlights, setCommunitySpotlights] = useState<ShopBroadcast[]>([]);
  const [miniSpotlightIndex, setMiniSpotlightIndex] = useState(0);
  const communitySpotlightsRef = useRef<ShopBroadcast[]>([]);
  const miniSpotlightIndexRef = useRef(0);
  const galleryRevealFrameRef = useRef<number | null>(null);
  const galleryRevealTargetRef = useRef("");
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [openProductId, setOpenProductId] = useState<number | null>(null);
  const [brokenProductMediaUrls, setBrokenProductMediaUrls] = useState<
    Record<string, boolean>
  >({});
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(
    null
  );
  const [error, setError] = useState<string>("");
  const [viewer, setViewer] = useState<ViewerProfile | null>(null);

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
    let alive = true;

    if (!isAuthenticated()) {
      setViewer(null);
      return () => {
        alive = false;
      };
    }

    (async () => {
      try {
        const me = await getMe();
        if (!alive) return;
        const profile = (me?.user || me?.data?.user || me) as ViewerProfile;
        setViewer(profile || null);
      } catch {
        if (alive) setViewer(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError("");

      try {
        const cleanedGmfnId = safeStr(gmfnId || "");
        const clanRes = await getCurrentClan().catch(() => null);

        const publicShopRes = cleanedGmfnId
          ? await getPublicMarketplaceShopByGmfnId(cleanedGmfnId, {
              product_limit: 100,
              broadcast_limit: 24,
            }).catch(() => null)
          : null;

        const normalizedShop = normalizeShop(
          publicShopRes?.item || publicShopRes,
          cleanedGmfnId,
          {
            marketplace_name: firstMeaningful(
              publicShopRes?.community_name,
              clanRes?.marketplace_name,
              clanRes?.name
            ),
          }
        );

        const normalizedProducts = rowsOf<any>(publicShopRes?.products)
          .filter((row) => {
            const src = row?.item || row?.product || row?.data || row;
            return (
              firstMeaningful(src?.visibility_mode, "community_visible") ===
              "community_visible"
            );
          })
          .map((row, index) => normalizeProduct(row, index + 1))
          .filter(Boolean) as ShopProduct[];

        const relevantGmfnId = firstMeaningful(
          normalizedShop?.gmfnId,
          cleanedGmfnId
        );

        const publicBroadcasts = rowsOf<any>(publicShopRes?.broadcasts);

        const relevantBroadcast =
          (publicShopRes?.primary_broadcast
            ? normalizeBroadcast(publicShopRes?.primary_broadcast)
            : null) ||
          publicBroadcasts
            .map((row) => normalizeBroadcast(row))
            .filter(Boolean)
            .find((row) => {
              const authorGmfnId = safeStr(row?.authorGmfnId);
              return Boolean(
                relevantGmfnId &&
                  authorGmfnId &&
                  authorGmfnId.toUpperCase() === relevantGmfnId.toUpperCase()
              );
            }) || null;

        if (!alive) return;
        const normalizedBroadcasts = publicBroadcasts
          .map((row) => normalizeBroadcast(row))
          .filter(Boolean)
          .sort((a, b) => {
            const timeDelta =
              spotlightBroadcastSortValue(b) - spotlightBroadcastSortValue(a);
            if (timeDelta !== 0) return timeDelta;
            return spotlightBroadcastKey(a).localeCompare(spotlightBroadcastKey(b));
          }) as ShopBroadcast[];
        const currentSpotlight =
          communitySpotlightsRef.current[miniSpotlightIndexRef.current] ||
          communitySpotlightsRef.current[0] ||
          null;
        const currentKey = spotlightBroadcastKey(currentSpotlight);
        const matchedSpotlightIndex = currentKey
          ? normalizedBroadcasts.findIndex(
              (item) => spotlightBroadcastKey(item) === currentKey
            )
          : -1;

        setCurrentClan(clanRes || null);
        setShop(normalizedShop);
        setProducts(normalizedProducts);
        setBroadcast(relevantBroadcast);
        setCommunitySpotlights(normalizedBroadcasts);
        setMiniSpotlightIndex(
          normalizedBroadcasts.length <= 0
            ? 0
            : matchedSpotlightIndex >= 0
            ? matchedSpotlightIndex
            : 0
        );
      } catch (err: any) {
        if (!alive) return;
        setError(
          safeStr(err?.message) || "Shop gallery could not be loaded right now."
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [gmfnId]);

  useEffect(() => {
    setMiniSpotlightIndex(0);
  }, [gmfnId]);

  useEffect(() => {
    communitySpotlightsRef.current = communitySpotlights;
  }, [communitySpotlights]);

  const cancelPendingGalleryReveal = useCallback(() => {
    galleryRevealTargetRef.current = "";
    if (galleryRevealFrameRef.current !== null) {
      window.cancelAnimationFrame(galleryRevealFrameRef.current);
      galleryRevealFrameRef.current = null;
    }
  }, []);

  const revealGalleryTarget = useCallback(function revealGalleryTarget(
    targetId: string,
    attempt = 0
  ) {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const target = document.getElementById(targetId);
    if (target) {
      cancelPendingGalleryReveal();
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }

    if (attempt < 18) {
      galleryRevealTargetRef.current = targetId;
      galleryRevealFrameRef.current = window.requestAnimationFrame(() => {
        galleryRevealFrameRef.current = null;
        if (galleryRevealTargetRef.current !== targetId) return;
        revealGalleryTarget(targetId, attempt + 1);
      });
    }
  }, [cancelPendingGalleryReveal]);

  useEffect(() => {
    miniSpotlightIndexRef.current = miniSpotlightIndex;
  }, [miniSpotlightIndex]);

  useEffect(() => {
    if (communitySpotlights.length <= 1) return;

    const timer = window.setInterval(() => {
      setMiniSpotlightIndex((prev) => (prev + 1) % communitySpotlights.length);
    }, SPOTLIGHT_PILOT_ROTATION_MS);

    return () => window.clearInterval(timer);
  }, [communitySpotlights.length]);

  useEffect(() => {
    if (communitySpotlights.length <= 0 && miniSpotlightIndex !== 0) {
      setMiniSpotlightIndex(0);
      return;
    }

    if (communitySpotlights.length > 0 && miniSpotlightIndex >= communitySpotlights.length) {
      setMiniSpotlightIndex(0);
    }
  }, [communitySpotlights.length, miniSpotlightIndex]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!location.hash) return;
    if (products.length === 0) return;

    const id = location.hash.replace(/^#/, "");
    cancelPendingGalleryReveal();
    revealGalleryTarget(id);

    return () => {
      cancelPendingGalleryReveal();
    };
  }, [cancelPendingGalleryReveal, location.hash, products.length, revealGalleryTarget]);

  useEffect(() => {
    return () => {
      cancelPendingGalleryReveal();
    };
  }, [cancelPendingGalleryReveal]);

  const effectiveShop = useMemo<ShopProfile | null>(() => {
    if (!shop && !broadcast) return null;

    const effectiveGmfnId = firstMeaningful(
      shop?.gmfnId,
      broadcast?.authorGmfnId,
      gmfnId
    );

    const effectiveOwnerName = firstMeaningful(
      shop?.ownerName,
      broadcast?.authorName,
      effectiveGmfnId,
      "Shop owner"
    );

    const effectiveShopName = firstMeaningful(
      shop?.shopName,
      broadcast?.sourceShopName,
      effectiveOwnerName,
      effectiveGmfnId ? `${effectiveGmfnId} Shop` : "",
      "Shop"
    );

    const effectiveDescription = firstMeaningful(
      shop?.description,
      broadcast?.message
    );

    const effectiveCommunityName = firstMeaningful(
      shop?.communityName,
      broadcast?.sourceClanName,
      currentClan?.marketplace_name,
      currentClan?.name,
      currentClan?.display_name
    );

    return {
      id: shop?.id,
      gmfnId: effectiveGmfnId,
      shopName: effectiveShopName,
      ownerName: effectiveOwnerName,
      description: effectiveDescription,
      communityName: effectiveCommunityName,
      trustBand: firstMeaningful(shop?.trustBand, broadcast?.trustBand),
      trustScore: firstMeaningful(shop?.trustScore, broadcast?.trustScore),
      imageUrl: firstMeaningful(shop?.imageUrl),
      whatsapp: firstMeaningful(shop?.whatsapp),
      telegram: firstMeaningful(shop?.telegram),
    };
  }, [shop, broadcast, gmfnId, currentClan]);

  useEffect(() => {
    if (products.length <= GALLERY_SLOTS_TOTAL && showAllProducts) {
      setShowAllProducts(false);
    }
  }, [products.length, showAllProducts]);

  useEffect(() => {
    if (
      openProductId !== null &&
      !products.some((product) => (product.id ?? product.slotNumber) === openProductId)
    ) {
      setOpenProductId(null);
    }
  }, [openProductId, products]);

  const visibleProducts = useMemo(
    () => {
      const productsWithUsableMedia = products.filter((product) => {
        const imageUrl = safeStr(product.imageUrl);
        const videoUrl = safeStr(product.videoUrl);
        const imageBroken = Boolean(imageUrl && brokenProductMediaUrls[imageUrl]);
        const videoBroken = Boolean(videoUrl && brokenProductMediaUrls[videoUrl]);

        if (videoUrl && !videoBroken) return true;
        if (imageUrl && !imageBroken) return true;
        return false;
      });
      const displayableProducts =
        productsWithUsableMedia.length > 0
          ? productsWithUsableMedia
          : products.filter((product) => {
              const imageUrl = safeStr(product.imageUrl);
              const videoUrl = safeStr(product.videoUrl);
              const imageBroken = Boolean(imageUrl && brokenProductMediaUrls[imageUrl]);
              const videoBroken = Boolean(videoUrl && brokenProductMediaUrls[videoUrl]);

              if (videoUrl && videoBroken) return false;
              if (imageUrl && imageBroken) return false;
              return true;
            });

      return showAllProducts
        ? displayableProducts
        : displayableProducts.slice(0, GALLERY_SLOTS_TOTAL);
    },
    [brokenProductMediaUrls, products, showAllProducts]
  );
  const usableProductCount =
    products.filter((product) => {
      const imageUrl = safeStr(product.imageUrl);
      const videoUrl = safeStr(product.videoUrl);
      const imageBroken = Boolean(imageUrl && brokenProductMediaUrls[imageUrl]);
      const videoBroken = Boolean(videoUrl && brokenProductMediaUrls[videoUrl]);
      if (videoUrl && !videoBroken) return true;
      if (imageUrl && !imageBroken) return true;
      return false;
    }).length || visibleProducts.length;
  const brokenProductMediaCount = products.length - usableProductCount;
  const overflowProductCount = Math.max(0, usableProductCount - GALLERY_SLOTS_TOTAL);
  const hiddenProductCount = showAllProducts
    ? 0
    : Math.max(0, usableProductCount - visibleProducts.length);

  const heroImage = useMemo(() => {
    return effectiveShop?.imageUrl || "";
  }, [effectiveShop]);

  const miniSpotlight = useMemo(() => {
    if (communitySpotlights.length === 0) return null;
    return communitySpotlights[miniSpotlightIndex % communitySpotlights.length] || communitySpotlights[0];
  }, [communitySpotlights, miniSpotlightIndex]);

  const miniSpotlightView = useMemo(() => {
    const currentShopGmfnId = firstMeaningful(effectiveShop?.gmfnId).toUpperCase();
    const spotlightShopGmfnId = firstMeaningful(miniSpotlight?.authorGmfnId);
    const spotlightClanId = positiveNumber(miniSpotlight?.sourceClanId);
    const messageParts = splitSpotlightMessage(miniSpotlight?.message);
    const isCurrentShop =
      Boolean(currentShopGmfnId) &&
      Boolean(spotlightShopGmfnId) &&
      currentShopGmfnId === spotlightShopGmfnId.toUpperCase();
    const shopTo = spotlightShopGmfnId
      ? `/shop/${encodeURIComponent(spotlightShopGmfnId)}`
      : "";
    const communityTo = spotlightClanId
      ? `/community/${encodeURIComponent(String(spotlightClanId))}`
      : "";

    return {
      title: firstMeaningful(miniSpotlight?.sourceShopName, "Live Spotlight"),
      detail: firstMeaningful(
        messageParts.summary,
        "Live community promo from the current spotlight source."
      ),
      tagLabel: messageParts.tagLabel,
      communityName: firstMeaningful(miniSpotlight?.sourceClanName, effectiveShop?.communityName),
      trustBand: firstMeaningful(miniSpotlight?.trustBand, "Trusted visibility"),
      createdAt: firstMeaningful(miniSpotlight?.createdAt),
      createdLabel: miniSpotlight?.createdAt ? formatWhen(miniSpotlight.createdAt) : "",
      imageUrl: firstMeaningful(miniSpotlight?.imageUrl),
      videoUrl: firstMeaningful(miniSpotlight?.videoUrl),
      shopTo,
      communityTo,
      isCurrentShop,
      shopLabel: "Shop",
      communityLabel: "Community",
      helperLine: isCurrentShop
        ? "This live spotlight currently belongs to the shop you are already viewing."
        : shopTo
        ? "Open the shop behind the current live spotlight item."
        : "This live spotlight item does not currently expose a linked shop.",
    };
  }, [miniSpotlight, effectiveShop]);

  const absoluteShopLink = useMemo(() => {
    return publicFrontendUrl(location.pathname);
  }, [location.pathname]);

  const shopNameText = safeStr(effectiveShop?.shopName || "Shop");
  const shopDescriptionText = safeStr(
    effectiveShop?.description ||
      "Public shop face for trusted products. Private Vault offers open only through a trust link."
  );
  const shopGmfnText = safeStr(effectiveShop?.gmfnId);
  const shopOwnerText = safeStr(effectiveShop?.ownerName);
  const shopCommunityText = safeStr(effectiveShop?.communityName);
  const shopWhatsAppText = safeStr(effectiveShop?.whatsapp);
  const shopTelegramText = safeStr(effectiveShop?.telegram);
  const hasShopContact = Boolean(shopWhatsAppText || shopTelegramText);
  const showOwnerBadge =
    Boolean(shopOwnerText) &&
    shopOwnerText.toUpperCase() !== shopGmfnText.toUpperCase();
  const sellerContactText = firstMeaningful(
    shopWhatsAppText ? `WhatsApp ${shopWhatsAppText}` : "",
    shopTelegramText ? `Telegram ${shopTelegramText}` : "",
    hasShopContact ? "Contact available" : "",
    "Share by link"
  );
  const publicShelfText =
    visibleProducts.length === 1
      ? "1 public item live"
      : `${visibleProducts.length} public items live`;
  const buyerConfidenceText = shopCommunityText
    ? `This shop is visible through ${shopCommunityText}. Public shelf products are open to browse and share; private Vault offers stay hidden until the shop sends a trust link.`
    : "Public shelf products are open to browse and share. Private Vault offers stay hidden until the shop sends a trust link.";
  const confidenceSignals = [
    { label: "Public shelf", value: publicShelfText, primary: true },
    { label: "Private Vault", value: "Hidden until trust link", primary: false },
    { label: "Seller contact", value: sellerContactText, primary: false },
  ] satisfies Array<{
    label: string;
    value: string;
    primary: boolean;
  }>;
  const viewerGmfnText = firstMeaningful(
    viewer?.gmfn_id,
    viewer?.gmfnId
  ).toUpperCase();
  const viewerNameText = firstMeaningful(
    viewer?.display_name,
    viewer?.displayName,
    viewer?.full_name,
    viewer?.name,
    viewer?.email,
    viewerGmfnText
  );
  const isSignedInViewer = Boolean(viewerGmfnText);
  const isShopOwner =
    Boolean(viewerGmfnText && shopGmfnText) &&
    viewerGmfnText === shopGmfnText.toUpperCase();
  const protectedNavItems = [
    { label: "Dashboard", to: "/app/dashboard", primary: true },
    { label: "Community Home", to: "/app/community", primary: false },
    { label: "Community Marketplace", to: "/app/marketplace", primary: false },
    ...(viewerGmfnText
      ? [
          {
            label: isShopOwner ? "This public shop" : "My public shop",
            to: `/shop/${encodeURIComponent(viewerGmfnText)}`,
            primary: false,
          },
        ]
      : []),
    ...(isShopOwner
      ? [{ label: "Owner Shop Control", to: "/app/shop-control", primary: true }]
      : []),
  ];

  async function shareOrCopy(params: {
    title: string;
    text: string;
    url: string;
    successText: string;
  }) {
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share({
          title: params.title,
          text: params.text,
          url: params.url,
        });
        setNotice({ tone: "success", text: params.successText });
        return;
      }

      safeCopy(`${params.title}\n${params.text}\n${params.url}`);
      setNotice({ tone: "success", text: params.successText });
    } catch {
      setNotice({
        tone: "error",
        text: "The share action did not complete.",
      });
    }
  }

  function copyShopLink() {
    safeCopy(absoluteShopLink);
    setNotice({ tone: "success", text: "Public shop link copied." });
  }

  function shareShop() {
    const shopTitle = firstMeaningful(
      effectiveShop?.shopName,
      effectiveShop?.ownerName,
      "Shop"
    );

    const shopText = firstMeaningful(
      effectiveShop?.description,
      effectiveShop?.communityName
        ? `${effectiveShop?.communityName} shop`
        : "",
      "Visit this trusted shop."
    );

    void shareOrCopy({
      title: shopTitle,
      text: shopText,
      url: absoluteShopLink,
      successText: "Public shop share ready.",
    });
  }

  function shareProduct(product: ShopProduct) {
    const hash = product.id ? `#product-${product.id}` : "";
    const productUrl = publicFrontendUrl(`${location.pathname}${hash}`);
    const title = productDisplayTitle(product);
    const text = firstMeaningful(
      productBuyerCue(product, ""),
      product.description,
      "Shop product"
    );

    void shareOrCopy({
      title,
      text: `${text} - ${product.priceText}`,
      url: productUrl,
      successText: "Product share ready.",
    });
  }

  function askForVaultAccess() {
    const shopTitle = firstMeaningful(
      effectiveShop?.shopName,
      effectiveShop?.ownerName,
      "this shop"
    );

    const requestText = `Hello, I would like to request a private Vault access link for ${shopTitle}. Please share any selected offers you do not show on the public page.`;

    const whatsapp = safeStr(effectiveShop?.whatsapp).replace(/[^\d+]/g, "");
    if (whatsapp && typeof window !== "undefined") {
      window.open(
        `https://wa.me/${encodeURIComponent(whatsapp)}?text=${encodeURIComponent(requestText)}`,
        "_blank",
        "noopener,noreferrer"
      );
      return;
    }

    const telegram = safeStr(effectiveShop?.telegram).replace(/^@+/, "");
    if (telegram && typeof window !== "undefined") {
      window.open(
        `https://t.me/${encodeURIComponent(telegram)}`,
        "_blank",
        "noopener,noreferrer"
      );
      setNotice({
        tone: "success",
        text: "Telegram opened. Ask the owner for a private Vault access link there.",
      });
      return;
    }

    safeCopy(`${requestText}\n${absoluteShopLink}`);
    setNotice({
      tone: "success",
      text: "Vault access request copied. Send it to the shop owner.",
    });
  }

  function goBackSafely() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }

    navigate("/cover");
  }

  return (
    <div
      style={institutionalBlueRailShell(isCompact, {
        maxWidth: 1240,
        padding: isCompact ? "14px 10px 42px" : "20px 18px 46px",
        gap: 18,
      })}
    >
      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}
      {error ? <div style={noticeCard("error")}>{error}</div> : null}

      <section
        style={{
          ...pageCard(),
          padding: isCompact ? 12 : 16,
          border: "1px solid rgba(13,95,168,0.16)",
          background:
            "radial-gradient(circle at 8% 0%, rgba(11,99,209,0.15) 0%, transparent 32%), radial-gradient(circle at 94% 10%, rgba(212,175,55,0.12) 0%, transparent 26%), linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(238,247,253,0.96) 100%)",
          boxShadow:
            "0 18px 42px rgba(8,38,67,0.08), inset 0 1px 0 rgba(255,255,255,0.86)",
        }}
        aria-label="Shop navigation"
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <div style={sectionLabel()}>
              {isSignedInViewer ? "GSN member navigation" : "Public shop view"}
            </div>
            <div
              style={{
                color: "#526C84",
                fontSize: isCompact ? 13 : 14,
                lineHeight: 1.45,
                fontWeight: 700,
              }}
            >
              {isSignedInViewer
                ? `Signed in as ${viewerNameText}. This page remains the public shop face; these protected return paths take you back into GSN.`
                : "Visitors can view, share, or ask the seller from here. Protected GSN tools still require signing in with your own account."}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: isCompact ? "stretch" : "flex-end",
            }}
          >
            <button
              type="button"
              {...buttonGuardProps()}
              onClick={(event) => runGuardedButtonAction(event, goBackSafely)}
              style={{
                ...navLinkButton(false),
                flex: isCompact ? "1 1 120px" : "0 0 auto",
              }}
            >
              Back
            </button>

            {isSignedInViewer
              ? protectedNavItems.map((item) => (
                  <OriginLink
                    key={`${item.label}-${item.to}`}
                    to={item.to}
                    style={{
                      ...navLinkButton(item.primary),
                      flex: isCompact ? "1 1 132px" : "0 0 auto",
                    }}
                  >
                    {item.label}
                  </OriginLink>
                ))
              : (
                  <>
                    <OriginLink
                      to="/login"
                      style={{
                        ...navLinkButton(true),
                        flex: isCompact ? "1 1 132px" : "0 0 auto",
                      }}
                    >
                      Sign in
                    </OriginLink>
                    <OriginLink
                      to="/cover"
                      style={{
                        ...navLinkButton(false),
                        flex: isCompact ? "1 1 132px" : "0 0 auto",
                      }}
                    >
                      Open GSN
                    </OriginLink>
                  </>
                )}
          </div>
        </div>
      </section>

      <section
        style={{
          ...pageCard(),
          padding: isCompact ? 10 : 20,
        }}
      >
        <div
          style={{
            position: "relative",
            borderRadius: 28,
            overflow: "hidden",
            padding: isCompact ? 8 : 10,
            border: "1px solid rgba(212,175,55,0.18)",
            background:
              "radial-gradient(circle at 9% 2%, rgba(11,99,209,0.46) 0%, transparent 32%), radial-gradient(circle at 91% 5%, rgba(244,114,182,0.20) 0%, transparent 27%), radial-gradient(circle at 82% 92%, rgba(212,175,55,0.24) 0%, transparent 34%), linear-gradient(145deg, rgba(5,22,39,0.99) 0%, rgba(9,52,86,0.98) 48%, rgba(12,70,112,0.96) 100%)",
            boxShadow:
              "0 30px 66px rgba(2,12,27,0.27), inset 0 1px 0 rgba(255,255,255,0.10)",
            minHeight: isCompact ? 0 : 360,
          }}
        >
          {heroImage ? (
            <img
              src={heroImage}
              alt={safeStr(effectiveShop?.shopName || "Shop")}
              style={{
                position: "absolute",
                inset: 10,
                width: "100%",
                height: "calc(100% - 20px)",
                borderRadius: 22,
                border: "1px solid rgba(212,175,55,0.14)",
                objectFit: "cover",
                objectPosition: "center",
                display: "block",
                pointerEvents: "none",
              }}
            />
          ) : null}

          <div
            style={{
              position: "absolute",
              inset: 10,
              borderRadius: 22,
              background:
                "linear-gradient(145deg, rgba(6,24,43,0.20) 0%, rgba(8,36,64,0.12) 28%, rgba(7,25,46,0.70) 100%)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 1,
              padding: isCompact ? 10 : 24,
              minHeight: isCompact ? 0 : 360,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "minmax(0, 1.08fr) minmax(320px, 0.92fr)",
              gap: isCompact ? 10 : 18,
              alignItems: isCompact ? "start" : "end",
            }}
          >
            <div
              style={{
                display: "grid",
                justifyItems: "center",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  marginTop: 0,
                  color: "#FFFFFF",
                  fontWeight: 900,
                  fontSize: isCompact ? 24 : 44,
                  lineHeight: 1.05,
                  maxWidth: 900,
                  marginInline: "auto",
                  textShadow: "0 6px 18px rgba(0,0,0,0.22)",
                  display: "-webkit-box",
                  WebkitLineClamp: isCompact ? 3 : 4,
                  WebkitBoxOrient: "vertical" as any,
                  overflow: "hidden",
                }}
              >
                {shopNameText}
              </div>

              <div
                style={{
                  marginTop: isCompact ? 7 : 10,
                  color: "rgba(255,255,255,0.90)",
                  fontSize: isCompact ? 13 : 15,
                  lineHeight: isCompact ? 1.45 : 1.8,
                  maxWidth: 860,
                  marginInline: "auto",
                  display: "-webkit-box",
                  WebkitLineClamp: isCompact ? 2 : 4,
                  WebkitBoxOrient: "vertical" as any,
                  overflow: "hidden",
                }}
              >
                {shopDescriptionText}
              </div>

              <div
                style={{
                  marginTop: isCompact ? 9 : 14,
                  display: "flex",
                  gap: isCompact ? 6 : 8,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                {showOwnerBadge ? (
                  <span
                    style={{
                      ...badge(true),
                      background: "rgba(255,255,255,0.16)",
                      color: "#FFFFFF",
                      minHeight: isCompact ? 24 : 30,
                      padding: isCompact ? "4px 8px" : "6px 10px",
                      fontSize: isCompact ? 10.5 : 12,
                    }}
                  >
                    Owner: {shopOwnerText}
                  </span>
                ) : null}

                {shopGmfnText ? (
                  <span
                    style={{
                      ...badge(false),
                      background: "rgba(255,255,255,0.12)",
                      color: "#FFFFFF",
                      minHeight: isCompact ? 24 : 30,
                      padding: isCompact ? "4px 8px" : "6px 10px",
                      fontSize: isCompact ? 10.5 : 12,
                    }}
                  >
                    ID: {shopGmfnText}
                  </span>
                ) : null}

                {shopCommunityText ? (
                  <span
                    style={{
                      ...badge(false),
                      background: "rgba(255,255,255,0.12)",
                      color: "#FFFFFF",
                      minHeight: isCompact ? 24 : 30,
                      padding: isCompact ? "4px 8px" : "6px 10px",
                      fontSize: isCompact ? 10.5 : 12,
                    }}
                  >
                    {shopCommunityText}
                  </span>
                ) : null}
              </div>
            </div>

            <div
              style={{
                ...innerCard(
                  "radial-gradient(circle at 4% 0%, rgba(11,99,209,0.24) 0%, transparent 34%), radial-gradient(circle at 96% 4%, rgba(244,114,182,0.15) 0%, transparent 28%), radial-gradient(circle at 72% 92%, rgba(212,175,55,0.18) 0%, transparent 32%), linear-gradient(145deg, rgba(255,255,255,0.99) 0%, rgba(235,247,254,0.97) 48%, rgba(246,250,253,0.98) 100%)"
                ),
                position: "relative",
                border: "1px solid rgba(13,95,168,0.22)",
                backdropFilter: "blur(8px)",
                boxShadow:
                  "0 26px 56px rgba(8,38,67,0.17), inset 0 1px 0 rgba(255,255,255,0.92)",
                padding: isCompact ? 12 : 18,
                overflow: "hidden",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(90deg, rgba(11,31,51,0.055) 0%, transparent 18%, transparent 78%, rgba(11,99,209,0.10) 100%)",
                  pointerEvents: "none",
                }}
              />
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: -46,
                  right: -42,
                  width: 132,
                  height: 132,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(212,175,55,0.20) 0%, rgba(244,114,182,0.11) 44%, transparent 68%)",
                  pointerEvents: "none",
                }}
              />
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "repeating-linear-gradient(90deg, transparent 0 24px, rgba(13,95,168,0.035) 24px 25px), repeating-linear-gradient(0deg, transparent 0 28px, rgba(8,38,67,0.026) 28px 29px)",
                  maskImage:
                    "radial-gradient(circle at 50% 36%, rgba(0,0,0,0.72) 0%, transparent 64%)",
                  WebkitMaskImage:
                    "radial-gradient(circle at 50% 36%, rgba(0,0,0,0.72) 0%, transparent 64%)",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  justifyContent: isCompact ? "center" : "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    ...sectionLabel(),
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 30,
                    padding: "6px 12px",
                    borderRadius: 999,
                    color: "#FFFFFF",
                    background:
                      "linear-gradient(135deg, rgba(11,31,51,0.97) 0%, rgba(25,82,129,0.94) 100%)",
                    border: "1px solid rgba(212,175,55,0.30)",
                    boxShadow:
                      "0 12px 26px rgba(8,38,67,0.17), inset 0 1px 0 rgba(255,255,255,0.18)",
                    textAlign: "center",
                  }}
                >
                  Public shop front
                </div>
              </div>

              <div
                style={{
                  position: "relative",
                  marginTop: isCompact ? 10 : 14,
                  padding: isCompact ? "16px 13px" : "18px",
                  borderRadius: isCompact ? 26 : 28,
                  border: "1px solid rgba(212,175,55,0.24)",
                  background:
                    "radial-gradient(circle at 4% 0%, rgba(77,160,255,0.32) 0%, transparent 34%), radial-gradient(circle at 96% 10%, rgba(244,114,182,0.18) 0%, transparent 31%), radial-gradient(circle at 82% 104%, rgba(212,175,55,0.22) 0%, transparent 34%), linear-gradient(135deg, rgba(6,24,43,0.98) 0%, rgba(16,73,116,0.96) 52%, rgba(7,34,62,0.98) 100%)",
                  boxShadow:
                    "0 20px 42px rgba(8,38,67,0.22), inset 0 1px 0 rgba(255,255,255,0.18)",
                  overflow: "hidden",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 0,
                    height: 3,
                    background:
                      "linear-gradient(90deg, rgba(212,175,55,0.82) 0%, rgba(77,160,255,0.74) 48%, rgba(244,114,182,0.56) 100%)",
                  }}
                />
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    right: -36,
                    top: -36,
                    width: 146,
                    height: 146,
                    borderRadius: "50%",
                    border: "1px solid rgba(255,255,255,0.16)",
                    background:
                      "radial-gradient(circle, rgba(255,255,255,0.16) 0%, rgba(212,175,55,0.08) 38%, transparent 70%)",
                    pointerEvents: "none",
                  }}
                />
                <div
                  style={{
                    position: "relative",
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: isCompact ? 10 : 12,
                    alignItems: "center",
                    justifyItems: "center",
                    textAlign: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "#FFFFFF",
                        fontWeight: 950,
                        fontSize: isCompact ? 18 : 21,
                        lineHeight: 1.18,
                        display: "-webkit-box",
                        WebkitLineClamp: isCompact ? 2 : 2,
                        WebkitBoxOrient: "vertical" as any,
                        overflow: "hidden",
                        letterSpacing: 0.25,
                        textShadow: "0 2px 14px rgba(0,0,0,0.25)",
                      }}
                    >
                      Public shelf. Private Vault. One trusted contact.
                    </div>

                    <div
                      style={{
                        marginTop: isCompact ? 8 : 10,
                        color: "rgba(235,245,255,0.88)",
                        fontSize: isCompact ? 12 : 13,
                        lineHeight: isCompact ? 1.45 : 1.62,
                        maxWidth: isCompact ? 300 : 560,
                      }}
                    >
                      {buyerConfidenceText}
                    </div>

                    <div
                      style={{
                        marginTop: isCompact ? 11 : 14,
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        gap: 7,
                      }}
                    >
                      {["Browse openly", "Ask privately", "Share safely"].map((label) => (
                        <span
                          key={label}
                          style={{
                            minHeight: 28,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "6px 10px",
                            borderRadius: 999,
                            border: "1px solid rgba(255,255,255,0.18)",
                            background: "rgba(255,255,255,0.12)",
                            color: "rgba(255,255,255,0.92)",
                            fontSize: isCompact ? 10.5 : 11,
                            fontWeight: 900,
                            letterSpacing: 0.25,
                          }}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  position: "relative",
                  marginTop: isCompact ? 10 : 14,
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "repeat(2, minmax(0, 1fr))"
                    : `repeat(${confidenceSignals.length}, minmax(0, 1fr))`,
                  gap: isCompact ? 7 : 8,
                  padding: isCompact ? 8 : 10,
                  borderRadius: 24,
                  border: "1px solid rgba(13,95,168,0.15)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.76) 0%, rgba(235,246,253,0.70) 100%)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.74), 0 10px 22px rgba(8,38,67,0.055)",
                }}
              >
                {confidenceSignals.map((item) => (
                  <div
                    key={`${item.label}-${item.value}`}
                    style={{
                      minHeight: isCompact ? 54 : 60,
                      padding: isCompact ? "8px 9px" : "9px 10px",
                      borderRadius: 18,
                      border: item.primary
                        ? "1px solid rgba(29,78,216,0.16)"
                        : "1px solid rgba(13,95,168,0.11)",
                      background: item.primary
                        ? "linear-gradient(180deg, rgba(238,246,255,0.98) 0%, rgba(220,235,250,0.88) 100%)"
                        : "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(235,242,249,0.84) 100%)",
                      boxShadow:
                        "0 8px 18px rgba(8,38,67,0.055), inset 0 1px 0 rgba(255,255,255,0.84)",
                      display: "grid",
                      gap: 3,
                      alignContent: "center",
                      textAlign: "center",
                    }}
                  >
                    <span
                      style={{
                        color: item.primary ? "#1D4ED8" : "#5D7389",
                        fontSize: isCompact ? 9.5 : 10,
                        fontWeight: 950,
                        letterSpacing: 0.45,
                        textTransform: "uppercase",
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      style={{
                        color: "#0B1F33",
                        fontSize: isCompact ? 10.5 : 12,
                        fontWeight: 900,
                        lineHeight: 1.2,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: isCompact ? 2 : 2,
                        WebkitBoxOrient: "vertical" as any,
                      }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: isCompact ? 10 : 16,
                  display: "flex",
                  gap: isCompact ? 8 : 10,
                  flexWrap: "wrap",
                  justifyContent: isCompact ? "center" : "flex-start",
                }}
              >
                <button
                  type="button"
                  {...buttonGuardProps()}
                  onClick={(event) =>
                    runGuardedButtonAction(event, askForVaultAccess)
                  }
                  style={{
                    ...primaryBtn(false),
                    padding: isCompact ? "10px 12px" : "10px 14px",
                    flex: isCompact ? "1 1 132px" : "0 1 auto",
                  }}
                >
                  Ask seller privately
                </button>

                <button
                  type="button"
                  {...buttonGuardProps()}
                  onClick={(event) => runGuardedButtonAction(event, shareShop)}
                  style={{
                    ...secondaryBtn(false),
                    padding: isCompact ? "10px 12px" : "9px 12px",
                    flex: isCompact ? "1 1 132px" : "0 1 auto",
                  }}
                >
                  Share public shop
                </button>

                <button
                  type="button"
                  {...buttonGuardProps()}
                  onClick={(event) =>
                    runGuardedButtonAction(event, copyShopLink)
                  }
                  style={{
                    ...secondaryBtn(false),
                    padding: isCompact ? "10px 12px" : "9px 12px",
                    flex: isCompact ? "1 1 132px" : "0 1 auto",
                  }}
                >
                  Copy public link
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          ...pageCard(),
          position: "relative",
          border: "1px solid rgba(13,95,168,0.18)",
          background:
            "radial-gradient(circle at 6% 0%, rgba(11,99,209,0.16) 0%, transparent 32%), radial-gradient(circle at 92% 8%, rgba(244,114,182,0.08) 0%, transparent 28%), radial-gradient(circle at 84% 92%, rgba(212,175,55,0.08) 0%, transparent 30%), linear-gradient(180deg, rgba(255,255,255,0.985) 0%, rgba(235,247,253,0.96) 100%)",
          boxShadow:
            "0 26px 62px rgba(8,38,67,0.11), inset 0 1px 0 rgba(255,255,255,0.82)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.12fr) minmax(320px, 336px)",
            gap: 8,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              ...innerCard(
                "radial-gradient(circle at 0% 0%, rgba(77,160,255,0.24) 0%, transparent 34%), radial-gradient(circle at 100% 6%, rgba(244,114,182,0.13) 0%, transparent 28%), radial-gradient(circle at 80% 100%, rgba(212,175,55,0.17) 0%, transparent 32%), linear-gradient(145deg, rgba(6,24,43,0.98) 0%, rgba(16,73,116,0.96) 52%, rgba(7,34,62,0.98) 100%)"
              ),
              position: "relative",
              border: "1px solid rgba(212,175,55,0.26)",
              boxShadow:
                "0 22px 48px rgba(2,12,27,0.21), inset 0 1px 0 rgba(255,255,255,0.17)",
              padding: isCompact ? 14 : 16,
              display: "grid",
              alignContent: "center",
              overflow: "hidden",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "repeating-linear-gradient(90deg, transparent 0 26px, rgba(255,255,255,0.035) 26px 27px), repeating-linear-gradient(0deg, transparent 0 30px, rgba(255,255,255,0.026) 30px 31px)",
                maskImage:
                  "radial-gradient(circle at 36% 22%, rgba(0,0,0,0.68) 0%, transparent 66%)",
                WebkitMaskImage:
                  "radial-gradient(circle at 36% 22%, rgba(0,0,0,0.68) 0%, transparent 66%)",
                pointerEvents: "none",
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                right: -28,
                top: -28,
                width: 124,
                height: 124,
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.14)",
                background:
                  "radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(212,175,55,0.08) 42%, transparent 72%)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "fit-content",
                minHeight: 28,
                padding: "5px 11px",
                borderRadius: 999,
                border: "1px solid rgba(212,175,55,0.30)",
                background:
                  "linear-gradient(135deg, rgba(11,31,51,0.72) 0%, rgba(25,82,129,0.58) 100%)",
                color: "#F6D77A",
                fontSize: 11,
                fontWeight: 950,
                letterSpacing: 0.65,
                textTransform: "uppercase",
              }}
            >
              Vault
            </div>
            <div
              style={{
                position: "relative",
                marginTop: 6,
                color: "#FFFFFF",
                fontSize: isCompact ? 19 : 22,
                fontWeight: 950,
                lineHeight: 1.18,
                letterSpacing: 0.1,
                textShadow: "0 2px 14px rgba(0,0,0,0.24)",
              }}
            >
              Private viewing by trust link
            </div>
            <div
              style={{
                position: "relative",
                marginTop: 9,
                color: "rgba(235,245,255,0.88)",
                fontSize: isCompact ? 12.5 : 13.5,
                lineHeight: 1.56,
              }}
            >
              The public shop shows what everyone can see. Vault is where selected
              offers can be viewed privately after the owner approves the trust link.
            </div>
            <div
              style={{
                position: "relative",
                marginTop: 5,
                color: "rgba(235,245,255,0.78)",
                fontSize: isCompact ? 12.5 : 13.5,
                lineHeight: 1.56,
              }}
            >
              Ask for a Vault view when you want to see private stock, special
              offers, or items the shop does not put in the open gallery.
            </div>
            <div
              style={{
                position: "relative",
                marginTop: 11,
                display: "grid",
                gridTemplateColumns: isCompact ? "repeat(3, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
                gap: 6,
              }}
            >
              <span
                style={{
                  ...badge(true),
                  minHeight: 34,
                  padding: "5px 8px",
                  fontSize: 10.5,
                  border: "1px solid rgba(255,255,255,0.24)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(220,235,250,0.86) 100%)",
                }}
              >
                Vault
              </span>
              <span
                style={{
                  ...badge(false),
                  minHeight: 34,
                  padding: "5px 8px",
                  fontSize: 10.5,
                  border: "1px solid rgba(255,255,255,0.20)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(232,242,249,0.74) 100%)",
                }}
              >
                Trust link
              </span>
              <span
                style={{
                  ...badge(false),
                  minHeight: 34,
                  padding: "5px 8px",
                  fontSize: 10.5,
                  border: "1px solid rgba(255,255,255,0.20)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(232,242,249,0.74) 100%)",
                }}
              >
                Owner approval
              </span>
            </div>
            <div
              style={{
                position: "relative",
                marginTop: 12,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                {...buttonGuardProps()}
                onClick={(event) =>
                  runGuardedButtonAction(event, askForVaultAccess)
                }
                style={{
                  ...primaryBtn(false),
                  padding: "10px 12px",
                  fontSize: 12.5,
                  flex: isCompact ? "1 1 132px" : undefined,
                }}
              >
                Ask for Private Vault view
              </button>
              <button
                type="button"
                {...buttonGuardProps()}
                onClick={(event) =>
                  runGuardedButtonAction(event, copyShopLink)
                }
                style={{
                  ...secondaryBtn(false),
                  padding: "10px 12px",
                  fontSize: 12.5,
                  flex: isCompact ? "1 1 132px" : undefined,
                }}
              >
                Copy public shop link
              </button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 8,
            }}
          >
            <div
              style={{
                position: "relative",
                ...spotlightShowcaseCard(),
                display: "grid",
                gap: 6,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  background:
                    "linear-gradient(90deg, rgba(255,224,139,0.92) 0%, rgba(20,184,166,0.72) 52%, rgba(255,255,255,0.34) 100%)",
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 6,
                  alignItems: "center",
                  flexWrap: "nowrap",
                }}
              >
                <div
                  style={{
                    ...sectionLabel(),
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: "#F8E7AE",
                  }}
                >
                  Community Spotlight
                </div>
                <span
                  style={{
                    ...badge(true),
                    minHeight: 22,
                    padding: "2px 7px",
                    fontSize: 10,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    border: "1px solid rgba(255,236,178,0.36)",
                    background:
                      "linear-gradient(180deg, rgba(255,244,204,0.96) 0%, rgba(244,196,83,0.78) 100%)",
                    color: "#1C2C34",
                  }}
                >
                  Live community promo
                </span>
              </div>

              <div
                style={{
                  marginTop: 4,
                  minHeight: isCompact ? 284 : 310,
                  position: "relative",
                }}
              >
                {miniSpotlightView.imageUrl || miniSpotlightView.videoUrl ? (
                  <>
                    <SpotlightMediaFrame
                      imageUrl={miniSpotlightView.imageUrl}
                      videoUrl={miniSpotlightView.videoUrl}
                      videoPoster={miniSpotlightView.imageUrl}
                      alt={miniSpotlightView.title}
                      contentPadding={2}
                      frameStyle={{
                        minHeight: isCompact ? 284 : 310,
                        height: isCompact ? 284 : 310,
                        borderRadius: 16,
                        border: "1px solid rgba(255,226,160,0.32)",
                        background:
                          "radial-gradient(circle at 0% 0%, rgba(246,196,83,0.20) 0%, transparent 34%), linear-gradient(180deg, rgba(7,22,33,0.99) 0%, rgba(21,56,76,0.98) 100%)",
                        boxShadow:
                          "0 16px 34px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.12)",
                      }}
                      mediaStyle={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center center",
                      }}
                      showVideoControls={false}
                      autoPlayVideo={Boolean(miniSpotlightView.videoUrl)}
                      mutedVideo={Boolean(miniSpotlightView.videoUrl)}
                      loopVideo={Boolean(miniSpotlightView.videoUrl)}
                      maxVideoSeconds={SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS}
                    />

                    <div
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        display: "flex",
                        gap: 4,
                        alignItems: "center",
                        zIndex: 3,
                      }}
                    >
                      {miniSpotlightView.shopTo ? (
                        <OriginLink
                          to={miniSpotlightView.shopTo}
                          title={miniSpotlightView.helperLine}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: 30,
                            padding: "5px 9px",
                            borderRadius: 999,
                            border: "1px solid rgba(255,255,255,0.55)",
                            background: "rgba(203,213,225,0.68)",
                            color: "#12263A",
                            fontWeight: 800,
                            fontSize: 10.5,
                            lineHeight: 1,
                            textDecoration: "none",
                            whiteSpace: "nowrap",
                            backdropFilter: "blur(10px)",
                            boxShadow: "0 6px 14px rgba(15,23,42,0.16)",
                          }}
                        >
                          {miniSpotlightView.shopLabel}
                        </OriginLink>
                      ) : null}
                      {miniSpotlightView.communityTo ? (
                        <OriginLink
                          to={miniSpotlightView.communityTo}
                          title={miniSpotlightView.communityName || "Open linked community"}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: 30,
                            padding: "5px 9px",
                            borderRadius: 999,
                            border: "1px solid rgba(255,255,255,0.5)",
                            background: "rgba(226,232,240,0.54)",
                            color: "#203247",
                            fontWeight: 700,
                            fontSize: 10.5,
                            lineHeight: 1,
                            textDecoration: "none",
                            whiteSpace: "nowrap",
                            backdropFilter: "blur(10px)",
                            boxShadow: "0 6px 14px rgba(15,23,42,0.12)",
                          }}
                        >
                          {miniSpotlightView.communityLabel}
                        </OriginLink>
                      ) : null}
                    </div>

                    <div
                      style={{
                        position: "absolute",
                        left: 8,
                        right: 8,
                        bottom: 8,
                        display: "flex",
                        gap: 4,
                        flexWrap: "nowrap",
                        alignItems: "center",
                        pointerEvents: "none",
                      }}
                    >
                      <span
                        style={{
                          ...badge(true),
                          minHeight: 22,
                          padding: "2px 7px",
                          fontSize: 10,
                          background: "rgba(255,255,255,0.88)",
                          color: "#1D4ED8",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        Live community promo
                      </span>
                      {miniSpotlightView.videoUrl ? (
                        <span
                          style={{
                            ...badge(false),
                            minHeight: 22,
                            padding: "2px 7px",
                            fontSize: 10,
                            background: "rgba(255,255,255,0.82)",
                            color: "#24415C",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          Short video
                        </span>
                      ) : null}
                      <span
                        style={{
                          ...badge(false),
                          minHeight: 22,
                          padding: "2px 7px",
                          fontSize: 10,
                          background: "rgba(255,255,255,0.82)",
                          color: "#24415C",
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: "1 1 auto",
                        }}
                      >
                        {miniSpotlightView.communityName || "Current community"}
                      </span>
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      padding: 10,
                      textAlign: "center",
                      color: "#D7E3F1",
                      fontWeight: 800,
                      fontSize: 11,
                      lineHeight: 1.4,
                    }}
                  >
                    {miniSpotlight
                      ? "Live community promo is active here, but this current item has no image."
                      : "No live community spotlight is visible right now."}
                  </div>
                    )}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexWrap: isCompact ? "wrap" : "nowrap",
                  minWidth: 0,
                  color: "#5F7287",
                  fontSize: 10,
                  lineHeight: 1.15,
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: "#0B1F33",
                    fontSize: 11.8,
                    fontWeight: 900,
                    flex: "1 1 auto",
                  }}
                >
                  {miniSpotlightView.title}
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    flexShrink: 0,
                    justifyContent: "flex-end",
                    minWidth: 0,
                  }}
                >
                  {miniSpotlightView.tagLabel ? (
                    <span
                      style={{
                        flexShrink: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontWeight: 800,
                        maxWidth: isCompact ? 120 : 132,
                      }}
                    >
                      {miniSpotlightView.tagLabel}
                    </span>
                  ) : null}
                  {miniSpotlightView.createdLabel ? (
                    <span
                      style={{
                        flexShrink: 0,
                        color: "#94A3B8",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      |
                    </span>
                  ) : null}
                  {miniSpotlightView.createdLabel ? (
                    <span
                      style={{
                        flexShrink: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: isCompact ? "100%" : 86,
                      }}
                    >
                      {miniSpotlightView.createdLabel}
                    </span>
                  ) : null}
                </div>
              </div>
              {miniSpotlightView.detail ? (
                <div
                  style={{
                    marginTop: 1,
                    ...helperText(),
                    fontSize: 9.8,
                    lineHeight: 1.15,
                    display: "-webkit-box",
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: "vertical" as any,
                    overflow: "hidden",
                  }}
                  title={miniSpotlightView.detail}
                >
                  {miniSpotlightView.detail}
                </div>
              ) : miniSpotlightView.trustBand ? (
                <div
                  style={{
                    marginTop: 1,
                    color: "#6B7280",
                    fontSize: 9.6,
                    lineHeight: 1.1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {miniSpotlightView.trustBand}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          ...pageCard("#FFFFFF"),
          position: "relative",
          border: "1px solid rgba(13,95,168,0.18)",
          background:
            "radial-gradient(circle at 8% 0%, rgba(11,99,209,0.13) 0%, transparent 30%), radial-gradient(circle at 92% 6%, rgba(244,114,182,0.06) 0%, transparent 26%), radial-gradient(circle at 80% 94%, rgba(212,175,55,0.07) 0%, transparent 31%), linear-gradient(180deg, rgba(255,255,255,0.988) 0%, rgba(236,248,253,0.962) 100%)",
          boxShadow:
            "0 26px 62px rgba(8,38,67,0.105), inset 0 1px 0 rgba(255,255,255,0.84)",
        }}
      >
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
            <div
              style={{
                ...sectionLabel(),
                display: "inline-flex",
                minHeight: 30,
                alignItems: "center",
                justifyContent: "center",
                padding: "6px 12px",
                borderRadius: 999,
                color: "#FFFFFF",
                background:
                  "linear-gradient(135deg, rgba(11,31,51,0.96) 0%, rgba(25,82,129,0.94) 100%)",
                border: "1px solid rgba(212,175,55,0.26)",
                boxShadow:
                  "0 10px 22px rgba(8,38,67,0.15), inset 0 1px 0 rgba(255,255,255,0.17)",
              }}
            >
              Public product shelf
            </div>
            <div style={{ marginTop: 10, ...helperText(), maxWidth: 760 }}>
              Public products appear here. Vault offers stay separate, so selected items
              are not mixed into the public shop face.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(true)}>
              {showAllProducts && overflowProductCount > 0
                ? `All ${usableProductCount} photo-ready products showing`
                : hiddenProductCount > 0
                ? `${visibleProducts.length} of ${usableProductCount} photo-ready products showing`
                : `${visibleProducts.length} public products live`}
            </span>
            <span style={badge(false)}>
              {showAllProducts && overflowProductCount > 0
                ? "Full loaded shelf open"
                : hiddenProductCount > 0
                ? `${hiddenProductCount} loaded beyond the public shelf`
                : `Up to ${GALLERY_SLOTS_TOTAL} public slots`}
            </span>
            {brokenProductMediaCount > 0 ? (
              <span style={badge(false)}>
                {brokenProductMediaCount} old photo link moved aside
              </span>
            ) : null}
            {overflowProductCount > 0 ? (
              <button
                type="button"
                {...buttonGuardProps()}
                onClick={(event) =>
                  runGuardedButtonAction(event, () =>
                    setShowAllProducts((current) => !current)
                  )
                }
                style={{
                  ...secondaryBtn(false),
                  minHeight: 44,
                  padding: "6px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                }}
              >
                {showAllProducts ? "Return to 12-slot shelf" : "Show all loaded items"}
              </button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div style={{ marginTop: 18, color: "#64748B", lineHeight: 1.8 }}>
            Loading shop gallery...
          </div>
        ) : visibleProducts.length === 0 ? (
          <div
            style={{
              marginTop: 18,
              ...innerCard(
                "radial-gradient(circle at 0% 0%, rgba(11,99,209,0.12) 0%, transparent 34%), radial-gradient(circle at 100% 8%, rgba(212,175,55,0.08) 0%, transparent 30%), linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(238,247,253,0.96) 100%)"
              ),
              border: "1px solid rgba(13,95,168,0.16)",
              boxShadow:
                "0 18px 40px rgba(8,38,67,0.08), inset 0 1px 0 rgba(255,255,255,0.82)",
            }}
          >
            <div style={{ color: "#0B1F33", fontSize: 18, fontWeight: 900, lineHeight: 1.3 }}>
              No public products are showing yet.
            </div>
            <div style={{ marginTop: 10, ...helperText(), maxWidth: 760 }}>
              Check back later for public offers. If you want to see selected items, use the
              Private Vault card above to ask the owner for an access link.
            </div>
          </div>
        ) : (
          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "repeat(3, minmax(0, 1fr))",
              gap: isCompact ? 22 : 14,
            }}
          >
            {visibleProducts.map((product, index) => {
              const slotNumber = String(index + 1).padStart(2, "0");
              const rawProductImageUrl = safeStr(product.imageUrl);
              const productImageUrl = brokenProductMediaUrls[rawProductImageUrl]
                ? ""
                : rawProductImageUrl;
              const rawProductVideoUrl = safeStr(product.videoUrl);
              const productVideoUrl = brokenProductMediaUrls[rawProductVideoUrl]
                ? ""
                : rawProductVideoUrl;
              const hasVideoStory = Boolean(productVideoUrl);
              const sourceShopName = firstMeaningful(
                product.originShopName,
                effectiveShop?.shopName,
                effectiveShop?.ownerName
              );
              const freshnessLabel = productFreshnessLabel(product.createdAt);
              const primarySignal = productVisibilityLabel(product.visibilityMode);
              const secondarySignal = hasVideoStory
                ? "Video story"
                : firstMeaningful(freshnessLabel, "Community shop");
              const displayTitle = productDisplayTitle(product);
              const buyerCue = productBuyerCue(product, sourceShopName);
              const productOpenId = product.id ?? product.slotNumber;
              const isProductOpen = openProductId === productOpenId;
              const itemDetailText = firstMeaningful(
                product.description,
                buyerCue,
                hasVideoStory
                  ? "Open the product story, then share it with someone who may want this offer."
                  : "Open this public offer, then share it with someone who may want it."
              );
              const dockBadgeStyle: React.CSSProperties = isCompact
                ? {
                    ...badge(false),
                    minHeight: 22,
                    padding: "3px 8px",
                    border: "1px solid rgba(13,95,168,0.13)",
                    background:
                      "linear-gradient(180deg, rgba(249,252,255,0.92) 0%, rgba(231,241,249,0.84) 100%)",
                    color: "#315A7C",
                    fontSize: 10,
                    boxShadow:
                      "0 6px 14px rgba(8,38,67,0.08), inset 0 1px 0 rgba(255,255,255,0.78)",
                  }
                : badge(false);
              const dockPriceStyle: React.CSSProperties = isCompact
                ? {
                    ...badge(true),
                    minHeight: 32,
                    padding: "6px 11px",
                    border: "1px solid rgba(29,78,216,0.18)",
                    background:
                      "linear-gradient(180deg, rgba(239,247,255,0.98) 0%, rgba(214,231,249,0.92) 100%)",
                    color: "#1D4ED8",
                    fontSize: 12,
                    boxShadow:
                      "0 8px 18px rgba(11,99,209,0.13), inset 0 1px 0 rgba(255,255,255,0.86)",
                  }
                : badge(true);
              const dockShareButtonStyle: React.CSSProperties = isCompact
                ? {
                    ...secondaryBtn(false),
                    minHeight: 44,
                    padding: "10px 14px",
                    border: "1px solid rgba(13,64,123,0.25)",
                    background:
                      "linear-gradient(180deg, #1F5FB7 0%, #174C91 100%)",
                    color: "#FFFFFF",
                    boxShadow:
                      "0 10px 20px rgba(14,73,138,0.18), inset 0 1px 0 rgba(255,255,255,0.24)",
                  }
                : secondaryBtn(false);

              return (
                <div
                  key={`shop-product-${product.id || slotNumber}`}
                  id={product.id ? `product-${product.id}` : undefined}
                  style={{
                    ...innerCard(
                      "radial-gradient(circle at 12% 0%, rgba(11,99,209,0.075) 0%, transparent 30%), linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(239,247,253,0.94) 100%)"
                    ),
                    position: "relative",
                    padding: 0,
                    overflow: "hidden",
                    border: isCompact
                      ? "1px solid rgba(13,95,168,0.18)"
                      : "1px solid rgba(13,95,168,0.16)",
                    background: isCompact
                      ? "radial-gradient(circle at 0% 0%, rgba(11,99,209,0.13) 0%, transparent 34%), radial-gradient(circle at 92% 0%, rgba(212,175,55,0.11) 0%, transparent 28%), radial-gradient(circle at 86% 92%, rgba(244,114,182,0.035) 0%, transparent 28%), linear-gradient(180deg, rgba(250,253,255,0.98) 0%, rgba(225,240,250,0.95) 100%)"
                      : undefined,
                    boxShadow:
                      isCompact
                        ? "0 26px 56px rgba(8,38,67,0.13), 0 9px 20px rgba(8,38,67,0.07), inset 0 1px 0 rgba(255,255,255,0.82)"
                        : "0 26px 54px rgba(8,38,67,0.12), 0 8px 20px rgba(8,38,67,0.06), inset 0 1px 0 rgba(255,255,255,0.72)",
                    minHeight: isCompact
                      ? isProductOpen
                        ? "calc(100svh + 112px)"
                        : "calc(100svh - 18px)"
                      : 430,
                    display: "flex",
                    flexDirection: "column",
                    scrollSnapAlign: isCompact ? "start" : undefined,
                    scrollMarginTop: isCompact ? 12 : undefined,
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      height: isCompact
                        ? isProductOpen
                          ? "min(64svh, 560px)"
                          : "calc(100svh - 18px)"
                        : 360,
                      minHeight: isCompact
                        ? isProductOpen
                          ? "min(64svh, 560px)"
                          : "calc(100svh - 18px)"
                        : undefined,
                      background:
                        isCompact
                          ? "linear-gradient(180deg, rgba(236,248,253,0.98) 0%, rgba(218,236,248,0.96) 56%, rgba(205,227,244,0.96) 100%)"
                          : "linear-gradient(180deg, #14314C 0%, #21496C 52%, #2B5E88 100%)",
                      borderBottom: "1px solid rgba(11,31,51,0.08)",
                      overflow: "hidden",
                      padding: isCompact ? 8 : 10,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 22,
                        right: 22,
                        zIndex: 2,
                        display: "inline-flex",
                        alignItems: "center",
                        minHeight: 30,
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: isCompact
                          ? "rgba(248,252,255,0.88)"
                          : "rgba(7,16,28,0.72)",
                        border: isCompact
                          ? "1px solid rgba(212,175,55,0.20)"
                          : "1px solid rgba(212,175,55,0.22)",
                        color: isCompact ? "#315A7C" : "#F6D77A",
                        fontSize: 11,
                        fontWeight: 900,
                        letterSpacing: 0.24,
                        textTransform: "uppercase",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      {hasVideoStory ? "Product story" : "Product frame"}
                    </div>
                    {hasVideoStory ? (
                      <video
                        src={productVideoUrl}
                        poster={productImageUrl || undefined}
                        controls
                        playsInline
                        preload="metadata"
                        onError={() => {
                          if (!productVideoUrl) return;
                          setBrokenProductMediaUrls((current) => ({
                            ...current,
                            [productVideoUrl]: true,
                          }));
                        }}
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: 18,
                          border: isCompact
                            ? "1px solid rgba(13,95,168,0.16)"
                            : "1px solid rgba(212,175,55,0.14)",
                          boxShadow: isCompact
                            ? "0 16px 34px rgba(8,38,67,0.12)"
                            : undefined,
                          objectFit: "cover",
                          objectPosition: isCompact ? "center top" : "center",
                          display: "block",
                          background: "#0B1F33",
                        }}
                      />
                    ) : productImageUrl ? (
                      <img
                        src={productImageUrl}
                        alt={displayTitle}
                        onError={() => {
                          if (!productImageUrl) return;
                          setBrokenProductMediaUrls((current) => ({
                            ...current,
                            [productImageUrl]: true,
                          }));
                        }}
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: 18,
                          border: isCompact
                            ? "1px solid rgba(13,95,168,0.16)"
                            : "1px solid rgba(212,175,55,0.14)",
                          boxShadow: isCompact
                            ? "0 16px 34px rgba(8,38,67,0.12)"
                            : undefined,
                          objectFit: "cover",
                          objectPosition: isCompact ? "center top" : "center",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: isCompact ? "#375A76" : "#D7E3F1",
                          fontSize: 14,
                          fontWeight: 800,
                          textAlign: "center",
                          padding: 16,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              color: isCompact ? "#0B1F33" : "#F8FBFF",
                              fontSize: 18,
                              fontWeight: 900,
                            }}
                          >
                            Product image coming soon
                          </div>
                          <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.7 }}>
                            This public slot is live, but the executive product picture has not
                            been released yet.
                          </div>
                        </div>
                      </div>
                    )}

                    <div
                      style={{
                        position: "absolute",
                        top: 12,
                        left: 12,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          ...badge(true),
                          background: "rgba(255,255,255,0.86)",
                          color: "#1D4ED8",
                          backdropFilter: "blur(6px)",
                        }}
                      >
                        Slot {slotNumber}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      position: isCompact && !isProductOpen ? "absolute" : "relative",
                      left: isCompact ? 14 : undefined,
                      right: isCompact ? 14 : undefined,
                      bottom: isCompact && !isProductOpen ? 14 : undefined,
                      zIndex: isCompact ? 4 : undefined,
                      padding: isCompact ? "10px 10px 11px" : 14,
                      display: "grid",
                      gap: isCompact ? 6 : 10,
                      flex: isCompact ? undefined : 1,
                      background:
                        isCompact
                          ? "radial-gradient(circle at 0% 0%, rgba(11,99,209,0.08) 0%, transparent 36%), radial-gradient(circle at 100% 0%, rgba(212,175,55,0.06) 0%, transparent 32%), linear-gradient(180deg, rgba(252,254,255,0.97) 0%, rgba(232,244,251,0.95) 100%)"
                          : "radial-gradient(circle at 0% 0%, rgba(11,99,209,0.075) 0%, transparent 34%), radial-gradient(circle at 100% 0%, rgba(212,175,55,0.06) 0%, transparent 30%), radial-gradient(circle at 100% 100%, rgba(244,114,182,0.035) 0%, transparent 30%), linear-gradient(180deg, rgba(251,253,255,0.99) 0%, rgba(236,246,252,0.96) 100%)",
                      border: isCompact
                        ? "1px solid rgba(255,255,255,0.62)"
                        : undefined,
                      borderTop: isCompact
                        ? "1px solid rgba(255,255,255,0.78)"
                        : "1px solid rgba(13,95,168,0.12)",
                      borderRadius: isCompact ? 22 : undefined,
                      boxShadow:
                        isCompact
                          ? "0 16px 34px rgba(8,38,67,0.16), inset 0 1px 0 rgba(255,255,255,0.86)"
                          : "inset 0 1px 0 rgba(255,255,255,0.88), inset 0 12px 24px rgba(255,255,255,0.42)",
                      alignContent: undefined,
                    }}
                  >
                    <div
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 18,
                        right: 18,
                        height: 2,
                        borderRadius: 999,
                        background:
                          isCompact
                            ? "linear-gradient(90deg, transparent 0%, rgba(13,95,168,0.20) 18%, rgba(212,175,55,0.18) 52%, rgba(13,95,168,0.16) 84%, transparent 100%)"
                            : "linear-gradient(90deg, transparent 0%, rgba(13,95,168,0.22) 18%, rgba(212,175,55,0.18) 52%, rgba(13,95,168,0.16) 84%, transparent 100%)",
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        justifyContent: isCompact ? "space-between" : "center",
                        alignItems: "center",
                      }}
                    >
                      <span style={dockBadgeStyle}>{primarySignal}</span>
                      <span style={dockBadgeStyle}>{secondarySignal}</span>
                    </div>

                    <div
                      style={{
                        color: isCompact ? "#0B1F33" : "#0B1F33",
                        fontWeight: 900,
                        fontSize: isCompact ? 16.5 : 17,
                        lineHeight: 1.22,
                        display: "-webkit-box",
                        WebkitLineClamp: isProductOpen ? 2 : isCompact ? 1 : 2,
                        WebkitBoxOrient: "vertical" as any,
                        overflow: "hidden",
                        textAlign: "center",
                        letterSpacing: isCompact ? 0.35 : undefined,
                        textShadow: undefined,
                      }}
                    >
                      {displayTitle}
                    </div>

                    <div
                      style={{
                        color: isCompact ? "#42627E" : "#4B6178",
                        fontSize: isCompact ? 12.5 : 12.5,
                        lineHeight: isCompact ? 1.35 : 1.55,
                        minHeight: isCompact ? 0 : 42,
                        padding: isCompact ? "0 3px" : "10px 11px",
                        borderRadius: isCompact ? 0 : 16,
                        border: isCompact
                          ? "0"
                          : "1px solid rgba(13,95,168,0.10)",
                        background:
                          isCompact
                            ? "transparent"
                            : "linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(244,249,253,0.72) 100%)",
                        boxShadow:
                          isCompact
                            ? "none"
                            : "0 10px 22px rgba(8,38,67,0.055), inset 0 1px 0 rgba(255,255,255,0.88)",
                        display: "-webkit-box",
                        WebkitLineClamp: isProductOpen ? 3 : isCompact ? 1 : 2,
                        WebkitBoxOrient: "vertical" as any,
                        overflow: "hidden",
                        textAlign: "center",
                      }}
                    >
                      {safeStr(buyerCue)}
                    </div>

                    {isProductOpen ? (
                      <div
                        style={{
                          display: "grid",
                          gap: 8,
                          padding: isCompact ? "9px 10px" : "11px 12px",
                          borderRadius: 18,
                          border: "1px solid rgba(13,95,168,0.13)",
                          background:
                            "radial-gradient(circle at 0% 0%, rgba(11,99,209,0.075) 0%, transparent 34%), radial-gradient(circle at 100% 0%, rgba(212,175,55,0.065) 0%, transparent 30%), linear-gradient(180deg, rgba(255,255,255,0.93) 0%, rgba(242,248,253,0.84) 100%)",
                          boxShadow:
                            "0 10px 22px rgba(8,38,67,0.07), inset 0 1px 0 rgba(255,255,255,0.84)",
                          textAlign: "left",
                        }}
                      >
                        <div
                          style={{
                            ...sectionLabel(),
                            color: "#315A7C",
                            letterSpacing: 1.8,
                            fontSize: 10,
                          }}
                        >
                          Open item
                        </div>
                        <div
                          style={{
                            color: "#334E68",
                            fontSize: isCompact ? 12.5 : 13,
                            lineHeight: 1.55,
                          }}
                        >
                          {itemDetailText}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 7,
                            flexWrap: "wrap",
                            justifyContent: "flex-start",
                          }}
                        >
                          <span style={dockBadgeStyle}>{product.priceText}</span>
                          {sourceShopName ? (
                            <span style={dockBadgeStyle}>{sourceShopName}</span>
                          ) : null}
                          {freshnessLabel ? (
                            <span style={dockBadgeStyle}>{freshnessLabel}</span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    <div
                      style={{
                        display: isCompact ? "grid" : "flex",
                        gridTemplateColumns: isCompact ? "1fr 1fr" : undefined,
                        justifyContent: isCompact ? undefined : "center",
                        gap: isCompact ? 8 : 10,
                        alignItems: "center",
                        flexWrap: isCompact ? undefined : "wrap",
                        paddingTop: isCompact ? 2 : undefined,
                      }}
                    >
                      <span
                        style={{
                          ...dockPriceStyle,
                          gridColumn: isCompact ? "1 / -1" : undefined,
                        }}
                      >
                        {product.priceText}
                      </span>

                      <button
                        type="button"
                        {...buttonGuardProps()}
                        onClick={(event) =>
                          runGuardedButtonAction(event, () =>
                            setOpenProductId((current) =>
                              current === productOpenId ? null : productOpenId
                            )
                          )
                        }
                        aria-expanded={isProductOpen}
                        aria-controls={
                          product.id ? `product-${product.id}` : undefined
                        }
                        style={{
                          ...dockShareButtonStyle,
                          background: isProductOpen
                            ? "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(237,244,251,0.94) 100%)"
                            : dockShareButtonStyle.background,
                          color: isProductOpen ? "#0B1F33" : dockShareButtonStyle.color,
                        }}
                      >
                        {isProductOpen ? "Close" : "Open item"}
                      </button>

                      <button
                        type="button"
                        {...buttonGuardProps()}
                        onClick={(event) =>
                          runGuardedButtonAction(event, () => shareProduct(product))
                        }
                        aria-label={`Share ${displayTitle}`}
                        style={dockShareButtonStyle}
                      >
                        Share
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}




