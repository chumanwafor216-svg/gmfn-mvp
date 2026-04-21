import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import DomainIntroToggle from "../components/DomainIntroToggle";
import ExplainToggle from "../components/ExplainToggle";
import OriginLink from "../components/OriginLink";
import SpotlightMediaFrame from "../components/SpotlightMediaFrame";
import {
  getCurrentClan,
  getMarketplaceBroadcasts,
  getMarketplaceProducts,
  getMarketplaceShopByGmfnId,
  getSelectedClanId,
  safeCopy,
} from "../lib/api";

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

function initialsOf(value: string): string {
  const parts = safeStr(value).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "S";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
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
      src?.banner_url
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

const SHOP_GALLERY_PAGE_BACKGROUND =
  "radial-gradient(circle at 9% 0%, rgba(11,99,209,0.14) 0%, transparent 30%), radial-gradient(circle at 92% 10%, rgba(244,114,182,0.065) 0%, transparent 26%), radial-gradient(circle at 74% 58%, rgba(212,175,55,0.065) 0%, transparent 30%), linear-gradient(180deg, rgba(239,248,253,0.99) 0%, rgba(247,251,253,0.98) 46%, rgba(234,244,250,0.98) 100%)";

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

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
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
    boxShadow: disabled
      ? "none"
      : "0 10px 20px rgba(14,73,138,0.18), inset 0 1px 0 rgba(255,255,255,0.26)",
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
  };
}

function secondaryBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
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
    boxShadow:
      "0 8px 18px rgba(8,38,67,0.08), inset 0 1px 0 rgba(255,255,255,0.82)",
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
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
  const selectedClanId = Number(getSelectedClanId() || 0);

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
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(
    null
  );
  const [error, setError] = useState<string>("");

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

        let shopRes: any = null;

        if (cleanedGmfnId) {
          shopRes = await getMarketplaceShopByGmfnId(cleanedGmfnId, {
            clan_id: selectedClanId || undefined,
            header_clan_id: selectedClanId || undefined,
          }).catch(() => null);

          if (!shopRes) {
            shopRes = await getMarketplaceShopByGmfnId(cleanedGmfnId, {
              header_clan_id: null,
            }).catch(() => null);
          }
        }

        const normalizedShop = normalizeShop(shopRes, cleanedGmfnId, clanRes);

        let productRes: any = null;

        if (normalizedShop?.id) {
          const productFetchAttempts = [
            selectedClanId > 0
              ? {
                  shop_id: normalizedShop.id,
                  clan_id: selectedClanId,
                  header_clan_id: selectedClanId,
                  only_active: true,
                  include_reposted: true,
                  limit: 100,
                }
              : null,
            normalizedShop.clanId && normalizedShop.clanId !== selectedClanId
              ? {
                  shop_id: normalizedShop.id,
                  clan_id: normalizedShop.clanId,
                  header_clan_id: normalizedShop.clanId,
                  only_active: true,
                  include_reposted: true,
                  limit: 100,
                }
              : null,
            {
              shop_id: normalizedShop.id,
              header_clan_id: null,
              only_active: true,
              include_reposted: true,
              limit: 100,
            },
          ].filter(Boolean) as Parameters<typeof getMarketplaceProducts>[0][];

          for (const attempt of productFetchAttempts) {
            const attemptRes = await getMarketplaceProducts(attempt).catch(
              () => null
            );

            if (!attemptRes) continue;

            productRes = attemptRes;
            if (rowsOf<any>(attemptRes).length > 0) break;
          }
        }

        const normalizedProducts = rowsOf<any>(productRes)
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

        let broadcastRes: any = null;

        if (selectedClanId > 0) {
          broadcastRes = await getMarketplaceBroadcasts({
            clan_id: selectedClanId,
            active_only: true,
            limit: 24,
          }).catch(() => null);
        }

        if (!broadcastRes) {
          broadcastRes = await getMarketplaceBroadcasts({
            active_only: true,
            limit: 24,
          }).catch(() => null);
        }

        const relevantBroadcast =
          rowsOf<any>(broadcastRes)
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
        const normalizedBroadcasts = rowsOf<any>(broadcastRes)
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
  }, [gmfnId, selectedClanId]);

  useEffect(() => {
    setMiniSpotlightIndex(0);
  }, [selectedClanId, gmfnId]);

  useEffect(() => {
    communitySpotlightsRef.current = communitySpotlights;
  }, [communitySpotlights]);

  useEffect(() => {
    miniSpotlightIndexRef.current = miniSpotlightIndex;
  }, [miniSpotlightIndex]);

  useEffect(() => {
    if (communitySpotlights.length <= 1) return;

    const timer = window.setInterval(() => {
      setMiniSpotlightIndex((prev) => (prev + 1) % communitySpotlights.length);
    }, 45000);

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
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [location.hash, products.length]);

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

  const visibleProducts = useMemo(() => products.slice(0, GALLERY_SLOTS_TOTAL), [products]);

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
      title: firstMeaningful(miniSpotlight?.sourceShopName, "Mini Spotlight"),
      detail: firstMeaningful(
        messageParts.summary,
        "Live promoted visibility from the current community spotlight source."
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
        ? "Open the shop owner behind the current live spotlight item."
        : "This live spotlight item does not currently expose a linked shop owner.",
    };
  }, [miniSpotlight, effectiveShop]);

  const absoluteShopLink = useMemo(() => {
    if (typeof window === "undefined") return location.pathname;
    return `${window.location.origin}${location.pathname}`;
  }, [location.pathname]);

  const shopNameText = safeStr(effectiveShop?.shopName || "Shop");
  const shopDescriptionText = safeStr(
    effectiveShop?.description ||
      "Public shop page for trusted products. Selected offers can open by Vault viewing link."
  );
  const shopGmfnText = safeStr(effectiveShop?.gmfnId);
  const shopOwnerText = safeStr(effectiveShop?.ownerName);
  const shopCommunityText = safeStr(effectiveShop?.communityName);
  const shopWhatsAppText = safeStr(effectiveShop?.whatsapp);
  const shopTelegramText = safeStr(effectiveShop?.telegram);
  const hasShopContact = Boolean(shopWhatsAppText || shopTelegramText);
  const shopTrustText = firstMeaningful(
    effectiveShop?.trustBand,
    effectiveShop?.trustScore
      ? `Trust score ${safeStr(effectiveShop?.trustScore)}`
      : "",
    ""
  );
  const showOwnerBadge =
    Boolean(shopOwnerText) &&
    shopOwnerText.toUpperCase() !== shopGmfnText.toUpperCase();
  const signpostSummaryText = shopCommunityText
    ? `Public offers from ${shopCommunityText}. Vault viewing is available by trust link.`
    : "Public offers from this shop. Vault viewing is available by trust link.";
  const signpostContactText = firstMeaningful(
    shopWhatsAppText ? `WhatsApp ${shopWhatsAppText}` : "",
    shopTelegramText ? `Telegram ${shopTelegramText}` : "",
    hasShopContact ? "Contact available" : "",
    "Share by link"
  );
  const signpostSignals = [
    shopGmfnText ? { label: "GSN ID", value: shopGmfnText, primary: true } : null,
    shopTrustText || safeStr(effectiveShop?.trustScore)
      ? {
          label: "Trust",
          value: shopTrustText || safeStr(effectiveShop?.trustScore),
          primary: false,
        }
      : null,
    shopCommunityText
      ? { label: "Community", value: shopCommunityText, primary: false }
      : null,
    { label: "Contact", value: signpostContactText, primary: false },
    { label: "Vault", value: "Private view by trust link", primary: false },
  ].filter(Boolean) as Array<{
    label: string;
    value: string;
    primary: boolean;
  }>;

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
    setNotice({ tone: "success", text: "Shop link copied." });
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
      successText: "Shop share ready.",
    });
  }

  function shareProduct(product: ShopProduct) {
    const hash = product.id ? `#product-${product.id}` : "";
    const productUrl =
      typeof window === "undefined"
        ? `${location.pathname}${hash}`
        : `${window.location.origin}${location.pathname}${hash}`;
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

    const requestText = `Hello, I would like to request a private Vault viewing link for ${shopTitle}. Please share any selected offers you do not show on the public page.`;

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
        text: "Telegram opened. Ask the owner for a Vault viewing link there.",
      });
      return;
    }

    safeCopy(`${requestText}\n${absoluteShopLink}`);
    setNotice({
      tone: "success",
      text: "Vault viewing request copied. Send it to the shop owner.",
    });
  }

  return (
    <div
      style={{
        maxWidth: 1240,
        margin: "0 auto",
        padding: isCompact ? "14px 10px 42px" : "20px 18px 46px",
        display: "grid",
        gap: 18,
        borderRadius: isCompact ? 0 : 34,
        border: isCompact ? "none" : "1px solid rgba(13,95,168,0.10)",
        background: SHOP_GALLERY_PAGE_BACKGROUND,
        boxShadow: isCompact
          ? "none"
          : "0 28px 70px rgba(8,38,67,0.08), inset 0 1px 0 rgba(255,255,255,0.76)",
      }}
    >
      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}
      {error ? <div style={noticeCard("error")}>{error}</div> : null}

      <DomainIntroToggle
        title="Your Shop Gallery"
        eyebrow="Your guide"
        body="Use Shop Gallery as the public door to a shop. People in the community, and approved outside viewers, can see what the shop is showing."
        bullets={[
          "One person has one shop, and that shop can appear in the communities they belong to.",
          "A shop normally shows through its communities. Wider sharing should use the right link or repost path.",
          "Vault is the private-viewing path for selected offers shared by trust link.",
        ]}
        note="Simple rule: Shop Gallery is where people come to view the shop."
        tone="dark"
      />

      <ExplainToggle
        label="What this screen does"
        what="This screen is the public shop gallery, showing the shop identity, live spotlight, products, and Vault private-viewing options when available."
        why="It helps visitors understand what this shop offers and how to move into the right next action without needing the full owner workspace."
        next="Start with the shop identity and live spotlight, then browse products or ask the owner for a Vault viewing link if you want to see selected offers."
        tone="light"
      />

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
            <div>
              <div
                style={{
                  marginTop: 0,
                  color: "#FFFFFF",
                  fontWeight: 900,
                  fontSize: isCompact ? 24 : 44,
                  lineHeight: 1.05,
                  maxWidth: 900,
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
                  GSN public shop
                </div>
              </div>

              {!isCompact ? (
                <ExplainToggle
                  label="What this does"
                  what="This signpost block gives visitors the main identity of the shop before they browse products or ask for Vault viewing."
                  why="It helps the shop feel grounded in a real owner and community context rather than as an isolated product wall."
                  next="Read the shop signpost first, then continue into products, spotlight, or Vault viewing depending on what you need."
                  tone="light"
                  style={{ marginTop: 12, marginBottom: 12 }}
                />
              ) : null}

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
                    gridTemplateColumns: isCompact ? "1fr" : "76px minmax(0, 1fr)",
                    gap: isCompact ? 10 : 14,
                    alignItems: "center",
                    justifyItems: isCompact ? "center" : "start",
                    textAlign: isCompact ? "center" : "left",
                  }}
                >
                  <div
                    style={{
                      width: isCompact ? 62 : 80,
                      height: isCompact ? 62 : 80,
                      borderRadius: "50%",
                      border: "1px solid rgba(212,175,55,0.48)",
                      background:
                        "radial-gradient(circle at 34% 24%, rgba(255,255,255,1) 0%, rgba(232,244,253,0.98) 52%, rgba(191,213,232,0.95) 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#124E88",
                      fontWeight: 950,
                      fontSize: isCompact ? 20 : 24,
                      boxShadow:
                        "0 14px 28px rgba(0,0,0,0.24), 0 0 0 5px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.96)",
                    }}
                  >
                    {initialsOf(
                      safeStr(
                        shopNameText ||
                          shopOwnerText ||
                          "Shop"
                      )
                    )}
                  </div>

                  <div>
                    <div
                      style={{
                        color: "#FFFFFF",
                        fontWeight: 950,
                        fontSize: isCompact ? 20 : 22,
                        lineHeight: 1.18,
                        display: "-webkit-box",
                        WebkitLineClamp: isCompact ? 2 : 2,
                        WebkitBoxOrient: "vertical" as any,
                        overflow: "hidden",
                        letterSpacing: 0.2,
                        textShadow: "0 2px 14px rgba(0,0,0,0.25)",
                        textTransform: "uppercase",
                      }}
                    >
                      {shopNameText}
                    </div>

                    <div
                      style={{
                        marginTop: isCompact ? 7 : 8,
                        color: "rgba(235,245,255,0.88)",
                        fontSize: isCompact ? 12 : 13,
                        lineHeight: isCompact ? 1.38 : 1.58,
                        maxWidth: isCompact ? 280 : 520,
                      }}
                    >
                      {signpostSummaryText}
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
                    : `repeat(${Math.min(signpostSignals.length, 5)}, minmax(0, 1fr))`,
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
                {signpostSignals.map((item) => (
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
                  onClick={shareShop}
                  style={{
                    ...primaryBtn(false),
                    minHeight: isCompact ? 38 : 42,
                    padding: isCompact ? "8px 12px" : "10px 14px",
                    flex: isCompact ? "1 1 132px" : undefined,
                  }}
                >
                  Share shop
                </button>

                <button
                  type="button"
                  onClick={copyShopLink}
                  style={{
                    ...secondaryBtn(false),
                    minHeight: isCompact ? 38 : 40,
                    padding: isCompact ? "8px 12px" : "9px 12px",
                    flex: isCompact ? "1 1 132px" : undefined,
                  }}
                >
                  Copy shop link
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
                onClick={askForVaultAccess}
                style={{
                  ...primaryBtn(false),
                  minHeight: 38,
                  padding: "8px 12px",
                  fontSize: 12.5,
                  flex: isCompact ? "1 1 132px" : undefined,
                }}
              >
                Ask for Vault view
              </button>
              <button
                type="button"
                onClick={copyShopLink}
                style={{
                  ...secondaryBtn(false),
                  minHeight: 38,
                  padding: "8px 12px",
                  fontSize: 12.5,
                  flex: isCompact ? "1 1 132px" : undefined,
                }}
              >
                Copy shop link
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
                ...innerCard(
                  "radial-gradient(circle at 4% 0%, rgba(11,99,209,0.18) 0%, transparent 33%), radial-gradient(circle at 100% 8%, rgba(212,175,55,0.10) 0%, transparent 28%), linear-gradient(180deg, rgba(255,255,255,0.985) 0%, rgba(235,247,253,0.96) 100%)"
                ),
                border: "1px solid rgba(13,95,168,0.18)",
                boxShadow:
                  "0 22px 46px rgba(8,38,67,0.12), inset 0 1px 0 rgba(255,255,255,0.86)",
                padding: 9,
                overflow: "hidden",
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
                    "linear-gradient(90deg, rgba(212,175,55,0.78) 0%, rgba(29,78,216,0.72) 52%, rgba(244,114,182,0.44) 100%)",
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
                  }}
                >
                  Mini Spotlight
                </div>
                <span
                  style={{
                    ...badge(true),
                    minHeight: 22,
                    padding: "2px 7px",
                    fontSize: 10,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    border: "1px solid rgba(29,78,216,0.16)",
                    background:
                      "linear-gradient(180deg, rgba(238,246,255,0.98) 0%, rgba(220,235,250,0.88) 100%)",
                  }}
                >
                  Live promo
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
                        border: "1px solid rgba(13,95,168,0.18)",
                        background:
                          "radial-gradient(circle at 0% 0%, rgba(77,160,255,0.24) 0%, transparent 36%), linear-gradient(180deg, rgba(10,35,58,0.99) 0%, rgba(26,76,116,0.98) 100%)",
                        boxShadow:
                          "0 16px 34px rgba(8,38,67,0.14), inset 0 1px 0 rgba(255,255,255,0.10)",
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
                            minHeight: 20,
                            padding: "2px 6px",
                            borderRadius: 999,
                            border: "1px solid rgba(255,255,255,0.55)",
                            background: "rgba(203,213,225,0.68)",
                            color: "#12263A",
                            fontWeight: 800,
                            fontSize: 9.5,
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
                            minHeight: 20,
                            padding: "2px 6px",
                            borderRadius: 999,
                            border: "1px solid rgba(255,255,255,0.5)",
                            background: "rgba(226,232,240,0.54)",
                            color: "#203247",
                            fontWeight: 700,
                            fontSize: 9.5,
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
                        Community spotlight
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
                      ? "Live community spotlight is active here, but this current item has no image."
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
              are not mixed into the public gallery.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(true)}>
              {visibleProducts.length} public products live
            </span>
            <span style={badge(false)}>Up to {GALLERY_SLOTS_TOTAL} public slots</span>
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
              Vault card above to ask the owner for a link.
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
              const hasVideoStory = Boolean(safeStr(product.videoUrl));
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
                    minHeight: 36,
                    padding: "7px 14px",
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
                    minHeight: isCompact ? "calc(100svh - 18px)" : 430,
                    display: "flex",
                    flexDirection: "column",
                    scrollSnapAlign: isCompact ? "start" : undefined,
                    scrollMarginTop: isCompact ? 12 : undefined,
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      height: isCompact ? "calc(100svh - 18px)" : 360,
                      minHeight: isCompact ? "calc(100svh - 18px)" : undefined,
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
                        src={product.videoUrl}
                        poster={safeStr(product.imageUrl) || undefined}
                        controls
                        playsInline
                        preload="metadata"
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
                    ) : safeStr(product.imageUrl) ? (
                      <img
                        src={product.imageUrl}
                        alt={displayTitle}
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
                      position: isCompact ? "absolute" : "relative",
                      left: isCompact ? 14 : undefined,
                      right: isCompact ? 14 : undefined,
                      bottom: isCompact ? 14 : undefined,
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
                        WebkitLineClamp: isCompact ? 1 : 2,
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
                        WebkitLineClamp: isCompact ? 1 : 2,
                        WebkitBoxOrient: "vertical" as any,
                        overflow: "hidden",
                        textAlign: "center",
                      }}
                    >
                      {safeStr(buyerCue)}
                    </div>

                    <div
                      style={{
                        display: isCompact ? "grid" : "flex",
                        gridTemplateColumns: isCompact ? "minmax(0, 1fr) auto" : undefined,
                        justifyContent: isCompact ? undefined : "center",
                        gap: isCompact ? 8 : 10,
                        alignItems: "center",
                        flexWrap: isCompact ? undefined : "wrap",
                        paddingTop: isCompact ? 2 : undefined,
                      }}
                    >
                      <span style={dockPriceStyle}>{product.priceText}</span>

                      <button
                        type="button"
                        onClick={() => shareProduct(product)}
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




