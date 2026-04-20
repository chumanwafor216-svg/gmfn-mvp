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
  visibilityMode: string;
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
    visibilityMode:
      firstMeaningful(src?.visibility_mode, "community_visible") ||
      "community_visible",
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 28,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 20,
    boxShadow:
      "0 18px 44px rgba(15,23,42,0.05), 0 3px 10px rgba(15,23,42,0.02)",
    overflow: "hidden",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
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
    minHeight: 30,
    padding: "6px 10px",
    borderRadius: 999,
    background: primary ? "rgba(29,78,216,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#1D4ED8" : "#51657A",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
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
    border: "none",
    background: disabled ? "#CBD5E1" : "#1D4ED8",
    color: "#FFFFFF",
    fontWeight: 900,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.86 : 1,
    whiteSpace: "normal",
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
    border: "1px solid rgba(11,99,209,0.12)",
    background: "#FDFEFF",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 800,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.86 : 1,
    whiteSpace: "normal",
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

function executiveImageShellStyle(minHeight: number): React.CSSProperties {
  return {
    position: "relative",
    minHeight,
    borderRadius: 28,
    padding: 10,
    overflow: "hidden",
    background:
      "linear-gradient(180deg, rgba(16,36,58,0.98) 0%, rgba(23,54,84,0.96) 54%, rgba(38,82,124,0.96) 100%)",
    border: "1px solid rgba(212,175,55,0.2)",
    boxShadow:
      "0 26px 56px rgba(2,12,27,0.24), inset 0 1px 0 rgba(255,255,255,0.05)",
  };
}

function executiveImageInnerStyle(minHeight: number): React.CSSProperties {
  return {
    position: "relative",
    minHeight,
    borderRadius: 22,
    overflow: "hidden",
    border: "1px solid rgba(212,175,55,0.14)",
    background:
      "linear-gradient(180deg, rgba(24,58,88,0.98) 0%, rgba(38,84,122,0.98) 100%)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function executiveFrameLabelStyle(): React.CSSProperties {
  return {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 2,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 30,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(7,16,28,0.72)",
    border: "1px solid rgba(212,175,55,0.22)",
    color: "#F6D77A",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 0.24,
    textTransform: "uppercase",
    backdropFilter: "blur(8px)",
    whiteSpace: "normal",
  };
}

function executiveFallbackStyle(): React.CSSProperties {
  return {
    width: "100%",
    height: "100%",
    minHeight: "inherit",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    textAlign: "center",
    padding: 20,
    color: "#E2E8F0",
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
            shopRes = await getMarketplaceShopByGmfnId(cleanedGmfnId).catch(
              () => null
            );
          }
        }

        const normalizedShop = normalizeShop(shopRes, cleanedGmfnId, clanRes);

        let productRes: any = null;

        if (normalizedShop?.id) {
          productRes = await getMarketplaceProducts({
            shop_id: normalizedShop.id,
            clan_id: selectedClanId || undefined,
            header_clan_id: selectedClanId || undefined,
            only_active: true,
            include_reposted: true,
            limit: 100,
          }).catch(() => null);

          if (!productRes) {
            productRes = await getMarketplaceProducts({
              shop_id: normalizedShop.id,
              only_active: true,
              include_reposted: true,
              limit: 100,
            }).catch(() => null);
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

  function repostShop() {
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
      successText: "Shop share opened.",
    });
  }

  function repostProduct(product: ShopProduct) {
    const hash = product.id ? `#product-${product.id}` : "";
    const productUrl =
      typeof window === "undefined"
        ? `${location.pathname}${hash}`
        : `${window.location.origin}${location.pathname}${hash}`;

    void shareOrCopy({
      title: product.name,
      text: `${product.description || "Shop product"} - ${product.priceText}`,
      url: productUrl,
      successText: "Product share opened.",
    });
  }

  function askForVaultAccess() {
    const shopTitle = firstMeaningful(
      effectiveShop?.shopName,
      effectiveShop?.ownerName,
      "this shop"
    );

    const requestText = `Hello, I would like to ask for Vault access for ${shopTitle}. Please let me know if private offers are available by permission.`;

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
        text: "Telegram opened. Ask for Vault access there.",
      });
      return;
    }

    safeCopy(`${requestText}\n${absoluteShopLink}`);
    setNotice({
      tone: "success",
      text: "Vault access request copied. Send it to the shop owner.",
    });
  }

  return (
    <div
      style={{
        maxWidth: 1240,
        margin: "0 auto",
        paddingBottom: 36,
        display: "grid",
        gap: 18,
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
          "Vault items are locked. They should only open with the right permission or access link.",
        ]}
        note="Simple rule: Shop Gallery is where people come to view the shop."
        tone="dark"
      />

      <ExplainToggle
        label="What this screen does"
        what="This screen is the public shop gallery, showing the shop identity, live spotlight, products, and private-access options when available."
        why="It helps visitors understand what this shop offers and how to move into the right next action without needing the full owner workspace."
        next="Start with the shop identity and live spotlight, then browse products or request Vault access if private offers are relevant."
        tone="light"
      />

      <section
        style={pageCard(
          heroImage
            ? "linear-gradient(180deg, rgba(16,36,58,0.82) 0%, rgba(23,54,84,0.92) 52%, rgba(35,79,118,0.98) 100%)"
            : "linear-gradient(180deg, #10243A 0%, #173654 52%, #26527C 100%)"
        )}
      >
        <div
          style={{
            position: "relative",
            borderRadius: 28,
            overflow: "hidden",
            padding: 10,
            border: "1px solid rgba(212,175,55,0.18)",
            background:
              "linear-gradient(135deg, rgba(16,36,58,0.98) 0%, rgba(23,54,84,0.96) 55%, rgba(38,82,124,0.96) 100%)",
            boxShadow:
              "0 26px 56px rgba(2,12,27,0.24), inset 0 1px 0 rgba(255,255,255,0.05)",
            minHeight: isCompact ? 300 : 360,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 18,
              right: 18,
              zIndex: 2,
              display: "inline-flex",
              alignItems: "center",
              minHeight: 30,
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(7,16,28,0.72)",
              border: "1px solid rgba(212,175,55,0.22)",
              color: "#F6D77A",
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 0.24,
              textTransform: "uppercase",
              backdropFilter: "blur(8px)",
            }}
          >
            Public shop identity
          </div>
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
                "linear-gradient(180deg, rgba(12,34,56,0.10) 0%, rgba(12,34,56,0.16) 25%, rgba(12,34,56,0.60) 100%)",
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 1,
              padding: isCompact ? 18 : 24,
              minHeight: isCompact ? 300 : 360,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "minmax(0, 1.08fr) minmax(320px, 0.92fr)",
              gap: 18,
              alignItems: "end",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    ...badge(true),
                    background: "rgba(255,255,255,0.16)",
                    color: "#FFFFFF",
                  }}
                >
                  Visitor shop page
                </span>

                <span
                  style={{
                    ...badge(false),
                    background: "rgba(255,255,255,0.12)",
                    color: "#FFFFFF",
                  }}
                >
                  Clean outside view
                </span>
              </div>

              <div
                style={{
                  marginTop: 14,
                  color: "#FFFFFF",
                  fontWeight: 900,
                  fontSize: isCompact ? 30 : 44,
                  lineHeight: 1.05,
                  maxWidth: 900,
                  textShadow: "0 6px 18px rgba(0,0,0,0.22)",
                }}
              >
                {safeStr(effectiveShop?.shopName || "Shop")}
              </div>

              <div
                style={{
                  marginTop: 10,
                  color: "rgba(255,255,255,0.90)",
                  fontSize: 15,
                  lineHeight: 1.8,
                  maxWidth: 860,
                }}
              >
                {safeStr(
                  effectiveShop?.description ||
                    "A premium visitor page for trusted products. Management controls stay out of this page."
                )}
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {safeStr(effectiveShop?.ownerName) ? (
                  <span
                    style={{
                      ...badge(true),
                      background: "rgba(255,255,255,0.16)",
                      color: "#FFFFFF",
                    }}
                  >
                    Owner: {safeStr(effectiveShop?.ownerName)}
                  </span>
                ) : null}

                {safeStr(effectiveShop?.gmfnId) ? (
                  <span
                    style={{
                      ...badge(false),
                      background: "rgba(255,255,255,0.12)",
                      color: "#FFFFFF",
                    }}
                  >
                    GMFN ID: {safeStr(effectiveShop?.gmfnId)}
                  </span>
                ) : null}

                {safeStr(effectiveShop?.communityName) ? (
                  <span
                    style={{
                      ...badge(false),
                      background: "rgba(255,255,255,0.12)",
                      color: "#FFFFFF",
                    }}
                  >
                    {safeStr(effectiveShop?.communityName)}
                  </span>
                ) : null}
              </div>
            </div>

            <div
              style={{
                ...innerCard("rgba(255,255,255,0.95)"),
                border: "1px solid rgba(255,255,255,0.28)",
                backdropFilter: "blur(8px)",
                boxShadow: "0 18px 38px rgba(11,31,51,0.16)",
                padding: 18,
              }}
            >
              <div style={sectionLabel()}>Shop signpost</div>

              <ExplainToggle
                label="What this does"
                what="This signpost block gives visitors the main identity of the shop before they browse products or ask for private access."
                why="It helps the shop feel grounded in a real owner and community context rather than as an isolated product wall."
                next="Read the shop signpost first, then continue into products, spotlight, or vault access depending on what you need."
                tone="light"
                style={{ marginTop: 12, marginBottom: 12 }}
              />

              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: "72px minmax(0, 1fr)",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 18,
                    border: "1px solid rgba(11,31,51,0.10)",
                    background:
                      "linear-gradient(180deg, #F8FBFF 0%, #E7F0FF 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#1D4ED8",
                    fontWeight: 900,
                    fontSize: 24,
                  }}
                >
                  {initialsOf(
                    safeStr(
                      effectiveShop?.shopName ||
                        effectiveShop?.ownerName ||
                        "Shop"
                    )
                  )}
                </div>

                <div>
                  <div
                    style={{
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 19,
                      lineHeight: 1.25,
                    }}
                  >
                    {safeStr(effectiveShop?.shopName || "Shop")}
                  </div>

                  <div style={{ marginTop: 6, ...helperText(), fontSize: 13 }}>
                    Share this shop outside the community with a clean public shop link.
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {safeStr(effectiveShop?.gmfnId) ? (
                  <span style={badge(true)}>
                    GMFN ID: {safeStr(effectiveShop?.gmfnId)}
                  </span>
                ) : null}

                <span style={badge(false)}>
                  Trust:{" "}
                  {safeStr(effectiveShop?.trustBand || "Trust reading not available yet")}
                  {safeStr(effectiveShop?.trustScore)
                    ? ` - ${safeStr(effectiveShop?.trustScore)}`
                    : ""}
                </span>

                {safeStr(effectiveShop?.communityName) ? (
                  <span style={badge(false)}>
                    {safeStr(effectiveShop?.communityName)}
                  </span>
                ) : null}

                <span style={badge(false)}>Vault</span>
                <span style={badge(false)}>Private access by permission</span>

                {safeStr(effectiveShop?.whatsapp) ? (
                  <span style={badge(false)}>
                    WhatsApp: {safeStr(effectiveShop?.whatsapp)}
                  </span>
                ) : null}

                {safeStr(effectiveShop?.telegram) ? (
                  <span style={badge(false)}>
                    Telegram: {safeStr(effectiveShop?.telegram)}
                  </span>
                ) : null}
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button type="button" onClick={repostShop} style={primaryBtn(false)}>
                  Share shop
                </button>

                <button type="button" onClick={copyShopLink} style={secondaryBtn(false)}>
                  Copy shop link
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        style={pageCard(
          "linear-gradient(180deg, #10243A 0%, #173654 52%, #26527C 100%)"
        )}
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
              ...innerCard("rgba(255,255,255,0.96)"),
              border: "1px solid rgba(212,175,55,0.14)",
              boxShadow: "0 18px 38px rgba(2,12,27,0.18)",
              padding: 9,
            }}
          >
            <div style={{ ...sectionLabel(), color: "#5D7389" }}>Vault</div>
            <div
              style={{
                marginTop: 4,
                color: "#0B1F33",
                fontSize: 17,
                fontWeight: 900,
                lineHeight: 1.2,
              }}
            >
              Vault: private stock by permission.
            </div>
            <div style={{ marginTop: 4, ...helperText(), fontSize: 11.5, lineHeight: 1.45 }}>
              Private stock may exist here, but it is not shown publicly.
            </div>
            <div style={{ marginTop: 2, ...helperText(), fontSize: 11.5, lineHeight: 1.45 }}>
              Access is owner-controlled and granted by permission only.
            </div>
            <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
              <span style={{ ...badge(true), minHeight: 26, padding: "4px 8px", fontSize: 11 }}>
                Vault
              </span>
              <span style={{ ...badge(false), minHeight: 24, padding: "3px 8px", fontSize: 10.5 }}>
                Private warehouse
              </span>
              <span style={{ ...badge(false), minHeight: 24, padding: "3px 8px", fontSize: 10.5 }}>
                Controlled commerce
              </span>
              <span style={{ ...badge(false), minHeight: 24, padding: "3px 8px", fontSize: 10.5 }}>
                Permission only
              </span>
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
                ...innerCard(
                  "linear-gradient(180deg, #15314C 0%, #21496C 56%, #2B5E88 100%)"
                ),
                border: "1px solid rgba(212,175,55,0.16)",
                boxShadow: "0 18px 40px rgba(2,12,27,0.24)",
                padding: 9,
              }}
            >
              <div style={{ ...sectionLabel(), color: "#D7E3F1" }}>Private access</div>
              <div
                style={{
                  marginTop: 4,
                  color: "#F8FBFF",
                  fontSize: 13.5,
                  fontWeight: 900,
                  lineHeight: 1.24,
                }}
              >
                Ask for access to the private warehouse
              </div>
              <div style={{ marginTop: 3, ...helperText(), color: "#E2E8F0", fontSize: 11, lineHeight: 1.38 }}>
                Ask if private offers are available for you. Nothing inside Vault is shown until access is granted.
              </div>
              <div style={{ marginTop: 4, display: "flex", gap: 5, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={askForVaultAccess}
                  style={{ ...primaryBtn(false), minHeight: 34, padding: "6px 10px", fontSize: 12 }}
                >
                  Ask for access
                </button>
                <button
                  type="button"
                  onClick={copyShopLink}
                  style={{ ...secondaryBtn(false), minHeight: 34, padding: "6px 10px", fontSize: 12 }}
                >
                  Copy shop link
                </button>
              </div>
            </div>

            <div
              style={{
                position: "relative",
                ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)"),
                border: "1px solid rgba(11,99,209,0.14)",
                boxShadow: "0 18px 38px rgba(29,78,216,0.10)",
                padding: 8,
                overflow: "hidden",
                display: "grid",
                gap: 4,
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
                    "linear-gradient(90deg, #1D4ED8 0%, #3B82F6 52%, #93C5FD 100%)",
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
                        border: "1px solid rgba(11,99,209,0.14)",
                        background:
                          "linear-gradient(180deg, rgba(24,58,88,0.98) 0%, rgba(38,84,122,0.98) 100%)",
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

      <section style={pageCard("#FFFFFF")}>
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
            <div style={sectionLabel()}>Product blocks</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Public products appear here. Vault stays separate, so private offers are not mixed
              into the public gallery.
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
              ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)"),
              border: "1px solid rgba(11,31,51,0.10)",
              boxShadow: "0 18px 40px rgba(2,12,27,0.08)",
            }}
          >
            <div style={{ color: "#0B1F33", fontSize: 18, fontWeight: 900, lineHeight: 1.3 }}>
              No public products are showing yet.
            </div>
            <div style={{ marginTop: 10, ...helperText(), maxWidth: 760 }}>
              Check back later for public offers. If you are looking for something private, use the
              Vault card above to ask the owner for access.
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
              gap: 14,
            }}
          >
            {visibleProducts.map((product, index) => {
              const slotNumber = String(index + 1).padStart(2, "0");

              return (
                <div
                  key={`shop-product-${product.id || slotNumber}`}
                  id={product.id ? `product-${product.id}` : undefined}
                  style={{
                    ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)"),
                    padding: 0,
                    overflow: "hidden",
                    border: "1px solid rgba(11,31,51,0.10)",
                    boxShadow:
                      "0 24px 48px rgba(2,12,27,0.08), 0 8px 18px rgba(2,12,27,0.04)",
                    minHeight: 430,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      height: 360,
                      background:
                        "linear-gradient(180deg, #14314C 0%, #21496C 52%, #2B5E88 100%)",
                      borderBottom: "1px solid rgba(11,31,51,0.08)",
                      overflow: "hidden",
                      padding: 10,
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
                        background: "rgba(7,16,28,0.72)",
                        border: "1px solid rgba(212,175,55,0.22)",
                        color: "#F6D77A",
                        fontSize: 11,
                        fontWeight: 900,
                        letterSpacing: 0.24,
                        textTransform: "uppercase",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      Product frame
                    </div>
                    {safeStr(product.imageUrl) ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: 18,
                          border: "1px solid rgba(212,175,55,0.14)",
                          objectFit: "cover",
                          objectPosition: "center",
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
                          color: "#D7E3F1",
                          fontSize: 14,
                          fontWeight: 800,
                          textAlign: "center",
                          padding: 16,
                        }}
                      >
                        <div>
                          <div style={{ color: "#F8FBFF", fontSize: 18, fontWeight: 900 }}>
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
                      padding: 12,
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={badge(false)}>Storefront block</span>
                      <span style={badge(false)}>Community-visible</span>
                    </div>

                    <div
                      style={{
                        color: "#0B1F33",
                        fontWeight: 900,
                        fontSize: 17,
                        lineHeight: 1.28,
                        display: "-webkit-box",
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: "vertical" as any,
                        overflow: "hidden",
                      }}
                    >
                      {product.name}
                    </div>

                    <div
                      style={{
                        color: "#4D657D",
                        fontSize: 12,
                        lineHeight: 1.5,
                        minHeight: 18,
                        display: "-webkit-box",
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: "vertical" as any,
                        overflow: "hidden",
                      }}
                    >
                      {safeStr(
                        product.description || "No product description is available yet."
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={badge(true)}>{product.priceText}</span>

                      <button
                        type="button"
                        onClick={() => repostProduct(product)}
                        style={secondaryBtn(false)}
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




