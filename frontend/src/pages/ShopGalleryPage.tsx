import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useLocation, useParams } from "react-router-dom";
import GsnInstallPrompt from "../components/GsnInstallPrompt";
import OwnerOnlySurfaceNav from "../components/OwnerOnlySurfaceNav";
import SpotlightMediaFrame from "../components/SpotlightMediaFrame";
import { PrimaryButton, SecondaryButton, StableCtaLink } from "../components/StableButton";
import {
  createMarketplaceRepost,
  createMarketplaceShop,
  getAccessToken,
  getCurrentClan,
  getMarketplaceBroadcasts,
  listMyClans,
  getMe,
  getPublicMarketplaceShopByGmfnId,
  getSelectedClanId,
  safeCopy,
} from "../lib/api";
import {
  PUBLIC_SHOP_DIARIES_ANCHOR,
  publicShopDiariesUrl,
  publicShopPath,
  publicShopShareUrl,
} from "../lib/publicLinks";
import { getCachedShopProductMedia } from "../lib/shopProductMediaCache";
import { ownerSurfaceIdentityMatches } from "../lib/ownerSurfaceIdentity";
import { APP_ROUTES, routeWithCommunity } from "../lib/appRoutes";
import {
  SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS,
  SPOTLIGHT_PILOT_REFRESH_MS,
  SPOTLIGHT_PILOT_ROTATION_MS,
} from "../lib/spotlightPilot";

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
  originClanId: number;
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
  expiresAt?: string;
};

type NoticeTone = "success" | "error";

type RepostCommunityOption = {
  id: number;
  name: string;
};

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

function normalizeWhatsAppRecipient(value: any): string {
  const raw = cleanText(value);
  if (!raw) return "";

  const compact = raw.replace(/[^\d+]/g, "");
  if (!compact) return "";

  if (compact.startsWith("+")) {
    return compact.slice(1).replace(/\D/g, "");
  }

  if (compact.startsWith("00")) {
    return compact.slice(2).replace(/\D/g, "");
  }

  const digits = compact.replace(/\D/g, "");
  if (/^07\d{9}$/.test(digits)) {
    return `44${digits.slice(1)}`;
  }

  if (/^7\d{9}$/.test(digits)) {
    return `44${digits}`;
  }

  return digits;
}

function buildWhatsAppChatUrl(recipient: any, message: string): string {
  const phone = normalizeWhatsAppRecipient(recipient);
  if (!phone) return "";
  return `https://wa.me/${phone}?text=${encodeURIComponent(cleanText(message))}`;
}

function buildPhoneCallUrl(value: any): string {
  const raw = cleanText(value);
  if (!raw) return "";

  const compact = raw.replace(/[^\d+]/g, "");
  if (!compact) return "";

  if (compact.startsWith("+")) {
    return `tel:${compact}`;
  }

  return `tel:${compact.replace(/\D/g, "")}`;
}

function isDisconnectedPublicShopError(message: any): boolean {
  return /seller identity|shop not found|not connected|active shop|404/i.test(
    safeStr(message)
  );
}

function publicShopReconnectAttemptKey(gmfnId: string): string {
  const token = safeStr(getAccessToken());
  const sessionKey = token ? token.slice(-16) : "no-owner-session";
  return `${safeStr(gmfnId).toUpperCase()}::${sessionKey}`;
}

function publicShopReconnectErrorMessage(message: string): string {
  if (/no active clan selected/i.test(message)) {
    return "GSN found your owner sign-in, but it could not find an active community for this shop yet. Open Marketplace or Community Home once while signed in, then this public shop page can reconnect Shop Diaries.";
  }

  if (/not an active member/i.test(message)) {
    return "GSN found your owner sign-in, but this browser is pointing at a community where the owner is not active. Open the shop from Marketplace again so GSN can use the right community.";
  }

  if (isDisconnectedPublicShopError(message)) {
    return "This public shop link is not connected to an active shop yet. If you are signed in as the owner, this page will reconnect to your current GSN shop and load Shop Diaries automatically.";
  }

  return message || "Shop gallery could not be loaded right now.";
}

function replacePublicShopAddress(gmfnId: string): void {
  if (typeof window === "undefined") return;

  const path = publicShopPath(gmfnId);
  if (!path || window.location.pathname === path) return;

  const currentSearch = window.location.search || "";
  const currentHash = window.location.hash || "";

  window.history.replaceState(
    window.history.state,
    "",
    `${path}${currentSearch}${currentHash}`
  );
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

function publicShopBlockLabel(product: ShopProduct): string {
  return `Block #${product.slotNumber}`;
}

function publicShopBlockAnchorId(product: ShopProduct): string {
  return `shop-block-${product.slotNumber}`;
}

function legacyProductAnchorId(product: ShopProduct): string {
  return product.id ? `product-${product.id}` : "";
}

function isInteractiveCardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest("button,a,input,select,textarea,[role='button']")
  );
}

function PublicVaultEmblem({ compact = false }: { compact?: boolean }) {
  const size = compact ? 104 : 150;
  const doorSize = compact ? 66 : 92;
  const wheelSize = compact ? 24 : 34;
  const boltSize = compact ? 8 : 10;

  return (
    <div
      aria-hidden="true"
      style={{
        width: "100%",
        minHeight: size,
        borderRadius: compact ? 18 : 22,
        border: "1px solid rgba(214,170,69,0.42)",
        background:
          "radial-gradient(circle at 50% 10%, rgba(255,245,205,0.86) 0%, rgba(231,190,82,0.56) 30%, rgba(255,244,204,0.10) 62%), linear-gradient(145deg, #FFF8DD 0%, #D7A832 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.82), 0 16px 30px rgba(138,100,14,0.18)",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: compact ? 10 : 14,
          borderRadius: compact ? 16 : 20,
          border: "1px solid rgba(143,107,25,0.26)",
          background:
            "linear-gradient(145deg, rgba(255,255,255,0.18), rgba(255,255,255,0.02))",
        }}
      />
      <div
        style={{
          position: "relative",
          width: doorSize,
          height: doorSize,
          borderRadius: compact ? 18 : 22,
          background:
            "linear-gradient(145deg, #5B6C7D 0%, #24364A 44%, #0A2038 100%)",
          border: "2px solid rgba(255,236,173,0.42)",
          boxShadow:
            "inset 0 2px 7px rgba(255,255,255,0.20), inset 0 -8px 18px rgba(3,16,31,0.50), 0 16px 30px rgba(8,35,61,0.26)",
        }}
      >
        <span
          style={{
            position: "absolute",
            inset: compact ? 8 : 11,
            borderRadius: compact ? 13 : 16,
            border: "1px solid rgba(255,255,255,0.14)",
          }}
        />
        {[8, doorSize - 8 - boltSize].map((top) =>
          [6, doorSize - 6 - boltSize].map((left) => (
            <span
              key={`${top}-${left}`}
              style={{
                position: "absolute",
                top,
                left,
                width: boltSize,
                height: boltSize,
                borderRadius: "50%",
                background: "rgba(255,236,173,0.42)",
                boxShadow: "0 1px 3px rgba(3,16,31,0.35)",
              }}
            />
          ))
        )}
        <span
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: wheelSize,
            height: wheelSize,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            border: "2px solid rgba(255,236,173,0.60)",
            background:
              "radial-gradient(circle, rgba(255,244,204,0.82) 0%, rgba(214,170,69,0.28) 38%, rgba(3,16,31,0.46) 100%)",
            boxShadow: "inset 0 1px 3px rgba(255,255,255,0.24)",
          }}
        />
        <span
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: compact ? 38 : 54,
            height: 2,
            transform: "translate(-50%, -50%) rotate(28deg)",
            borderRadius: 999,
            background: "rgba(255,236,173,0.76)",
          }}
        />
        <span
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: compact ? 38 : 54,
            height: 2,
            transform: "translate(-50%, -50%) rotate(-32deg)",
            borderRadius: 999,
            background: "rgba(255,236,173,0.72)",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 8,
          right: 8,
          bottom: compact ? 9 : 12,
          color: "#08233D",
          fontSize: compact ? 10 : 14,
          fontWeight: 950,
          textAlign: "center",
          textShadow: "0 1px 0 rgba(255,255,255,0.36)",
        }}
      >
        Private Vault
      </div>
    </div>
  );
}

function apiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";

  const base = String(raw || "").trim().replace(/\/+$/, "");
  if (!base) return "";

  if (base.startsWith("http://") || base.startsWith("https://")) {
    try {
      const url = new URL(base);
      if (url.pathname.replace(/\/+$/, "").toLowerCase() === "/api") {
        return url.origin;
      }
    } catch {
      return base;
    }
  }

  if (base === "/api" && typeof window !== "undefined") {
    const hostname = safeStr(window.location?.hostname).toLowerCase();
    const port = safeStr(window.location?.port);
    if (
      port &&
      port !== "5173" &&
      ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(hostname)
    ) {
      return "http://127.0.0.1:8012";
    }
  }

  return base;
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
    imageUrl: resolveImageSrc(src?.image_url || src?.imageUrl),
    videoUrl: resolveImageSrc(src?.video_url || src?.videoUrl),
    message: firstMeaningful(src?.message, src?.content, src?.text),
    sourceShopName: firstMeaningful(src?.source_shop_name, src?.sourceShopName),
    sourceClanName: firstMeaningful(src?.source_clan_name, src?.sourceClanName),
    sourceClanId:
      positiveNumber(src?.source_clan_id || src?.sourceClanId || src?.clan_id || src?.clanId) ||
      undefined,
    trustBand: firstMeaningful(src?.trust_band, src?.trustBand),
    trustScore: firstMeaningful(src?.trust_score, src?.trustScore),
    authorName: firstMeaningful(src?.author_name, src?.authorName),
    authorGmfnId: firstMeaningful(src?.author_gmfn_id, src?.authorGmfnId),
    createdAt: firstMeaningful(src?.created_at, src?.createdAt),
    expiresAt: firstMeaningful(src?.expires_at, src?.expiresAt),
  };
}

function broadcastIsActive(item: ShopBroadcast | null): boolean {
  if (!item?.expiresAt) return true;
  const expiresAt = new Date(item.expiresAt).getTime();
  return !Number.isFinite(expiresAt) || expiresAt > Date.now();
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

  const productId = positiveNumber(src?.id) || undefined;
  const cachedMedia = productId ? getCachedShopProductMedia(productId) : null;
  const imageUrl = resolveImageSrc(
    src?.image_url ||
      src?.thumbnail_url ||
      src?.photo_url ||
      src?.cover_image_url ||
      cachedMedia?.image_url
  );
  const videoUrl = resolveImageSrc(src?.video_url || cachedMedia?.video_url);

  return {
    id: productId,
    slotNumber,
    name,
    description,
    priceText: moneyText(
      src?.price,
      src?.currency || src?.currency_code || "NGN"
    ),
    currency: firstMeaningful(src?.currency, src?.currency_code, "NGN") || "NGN",
    imageUrl,
    videoUrl,
    visibilityMode:
      firstMeaningful(src?.visibility_mode, "community_visible") ||
      "community_visible",
    createdAt: firstMeaningful(src?.created_at),
    originShopName: firstMeaningful(src?.origin_shop_name, src?.source_shop_name),
    originClanId: positiveNumber(
      src?.origin_clan_id || src?.source_clan_id || src?.clan_id
    ),
    repostsUsed: positiveNumber(src?.reposts_used),
    distributionSlotsRemaining: positiveNumber(
      src?.distribution_slots_remaining || src?.remaining_distribution_slots
    ),
  };
}

const SHOP_GALLERY_INNER_SURFACE =
  "radial-gradient(circle at 0% 0%, rgba(11,99,209,0.075) 0%, transparent 32%), radial-gradient(circle at 100% 0%, rgba(212,175,55,0.045) 0%, transparent 28%), linear-gradient(180deg, rgba(255,255,255,0.965) 0%, rgba(238,247,253,0.945) 100%)";

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
  const routeProductId = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return positiveNumber(query.get("product_id") || query.get("product"));
  }, [location.search]);
  const publicShopReturnPath = useMemo(() => {
    const path = `${location.pathname || ""}${location.search || ""}${
      location.hash || ""
    }`;
    return path || "/app/marketplace";
  }, [location.hash, location.pathname, location.search]);
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
  const galleryRevealTimeoutRefs = useRef<number[]>([]);
  const galleryRevealTargetRef = useRef("");
  const autoRevealDiariesKeyRef = useRef("");
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
  const [autoRefreshingShop, setAutoRefreshingShop] = useState(false);
  const [shopReconnectRetryKey, setShopReconnectRetryKey] = useState(0);
  const [ownerContactPanelOpen, setOwnerContactPanelOpen] = useState(false);
  const [shopVerificationOpen, setShopVerificationOpen] = useState(false);
  const [repostPanelOpen, setRepostPanelOpen] = useState(false);
  const [repostCommunities, setRepostCommunities] = useState<RepostCommunityOption[]>([]);
  const [repostCommunitiesLoading, setRepostCommunitiesLoading] = useState(false);
  const [selectedRepostProductId, setSelectedRepostProductId] = useState<number>(0);
  const [selectedRepostClanId, setSelectedRepostClanId] = useState<number>(0);
  const [repostingProduct, setRepostingProduct] = useState(false);
  const autoRefreshAttemptedRef = useRef("");

  const forceOwnerReconnect = useCallback(() => {
    autoRefreshAttemptedRef.current = "";
    setNotice({
      tone: "success",
      text: "Checking your signed-in owner shop now...",
    });
    setShopReconnectRetryKey((key) => key + 1);
  }, []);

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
    if (!repostPanelOpen) return;
    if (!getAccessToken()) return;

    let alive = true;
    setRepostCommunitiesLoading(true);

    listMyClans()
      .then((res) => {
        if (!alive) return;
        const rows = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];
        const options = rows
          .map((row: any) => {
            const id = positiveNumber(row?.id || row?.clan_id || row?.community_id);
            const name = firstMeaningful(
              row?.marketplace_name,
              row?.name,
              row?.display_name,
              id ? `Community ${id}` : ""
            );
            return id && name ? { id, name } : null;
          })
          .filter(Boolean) as RepostCommunityOption[];

        setRepostCommunities(options);
      })
      .catch(() => {
        if (!alive) return;
        setRepostCommunities([]);
        setNotice({
          tone: "error",
          text: "Could not load your communities for live repost. Sign in again and try from inside GSN.",
        });
      })
      .finally(() => {
        if (alive) setRepostCommunitiesLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [repostPanelOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const cleanedGmfnId = safeStr(gmfnId || "");
    if (!cleanedGmfnId || !isDisconnectedPublicShopError(error)) return;

    let retryFrame: number | null = null;

    const requestOwnerSessionRetry = () => {
      if (!getAccessToken()) return;

      const refreshKey = publicShopReconnectAttemptKey(cleanedGmfnId);
      if (autoRefreshAttemptedRef.current === refreshKey) return;
      if (retryFrame !== null) return;

      retryFrame = window.requestAnimationFrame(() => {
        retryFrame = null;
        setShopReconnectRetryKey((key) => key + 1);
      });
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) requestOwnerSessionRetry();
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "access_token") requestOwnerSessionRetry();
    };

    window.addEventListener("focus", requestOwnerSessionRetry);
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const retryTimer = window.setInterval(requestOwnerSessionRetry, 2500);
    requestOwnerSessionRetry();

    return () => {
      window.removeEventListener("focus", requestOwnerSessionRetry);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(retryTimer);
      if (retryFrame !== null) window.cancelAnimationFrame(retryFrame);
    };
  }, [error, gmfnId]);

  useEffect(() => {
    let alive = true;

    function applyPublicShop(publicShopRes: any, clanRes: any, cleanedGmfnId: string) {
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
          const mode = firstMeaningful(
            src?.visibility_mode,
            "community_visible"
          ).toLowerCase();
          return mode !== "vault_private";
        })
        .map((row, index) => normalizeProduct(row, index + 1))
        .filter(Boolean) as ShopProduct[];

      const relevantGmfnId = firstMeaningful(
        normalizedShop?.gmfnId,
        cleanedGmfnId
      );

      const publicBroadcasts = [
        publicShopRes?.primary_broadcast,
        publicShopRes?.primaryBroadcast,
        ...rowsOf<any>(publicShopRes?.broadcasts),
      ].filter(Boolean);

      const relevantBroadcast =
        (publicShopRes?.primary_broadcast
          ? normalizeBroadcast(publicShopRes?.primary_broadcast)
          : null) ||
        publicBroadcasts
          .map((row) => normalizeBroadcast(row))
          .filter(Boolean)
          .filter(broadcastIsActive)
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
        .filter(broadcastIsActive)
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
    }

    async function loadPublicShop(cleanedGmfnId: string) {
      if (!cleanedGmfnId) return null;

      const publicShopRes = await getPublicMarketplaceShopByGmfnId(cleanedGmfnId, {
        product_limit: 100,
        broadcast_limit: 24,
      });

      const publicBroadcasts = [
        publicShopRes?.primary_broadcast,
        publicShopRes?.primaryBroadcast,
        ...rowsOf<any>(publicShopRes?.broadcasts),
      ].filter(Boolean);

      if (publicBroadcasts.length > 0 || !getAccessToken()) {
        return publicShopRes;
      }

      const ownerFeedRes = await getMarketplaceBroadcasts({
        active_only: true,
        limit: 24,
      }).catch(() => null);
      const ownerFeed = rowsOf<any>(ownerFeedRes)
        .map((row) => normalizeBroadcast(row))
        .filter(Boolean)
        .filter(broadcastIsActive)
        .filter((row) => {
          const authorGmfnId = safeStr(row?.authorGmfnId).toUpperCase();
          return Boolean(
            authorGmfnId && authorGmfnId === cleanedGmfnId.toUpperCase()
          );
        });

      if (ownerFeed.length <= 0) return publicShopRes;

      return {
        ...publicShopRes,
        broadcasts: ownerFeed,
        primary_broadcast: ownerFeed[0],
      };
    }

    async function refreshOwnerShop(cleanedGmfnId: string, clanRes: any) {
      const meRes = await getMe().catch(() => null);
      const ownerGmfnId = firstMeaningful(meRes?.gmfn_id, meRes?.gmfnId);

      if (!ownerGmfnId) {
        return "";
      }

      const preferredClanId = positiveNumber(
        clanRes?.id || clanRes?.clan_id || getSelectedClanId()
      );
      const ownerName = firstMeaningful(
        meRes?.display_name,
        meRes?.nickname,
        ownerGmfnId,
        "GSN owner"
      );
      const basePayload = {
        name: firstMeaningful(
          clanRes?.marketplace_name,
          clanRes?.name ? `${clanRes.name} Shop` : "",
          `${ownerName} Shop`,
          "GSN Shop"
        ),
        description: "Public GSN shop face for trusted products.",
      };
      const candidateClanIds = [preferredClanId, 0];

      try {
        const clanRows = rowsOf<any>(await listMyClans().catch(() => []));
        for (const row of clanRows) {
          candidateClanIds.push(
            positiveNumber(row?.id || row?.clan_id || row?.community_id)
          );
        }
      } catch {
        // The owner reconnect can still use backend default membership.
      }

      let lastCreateError: any = null;
      for (const clanId of Array.from(new Set(candidateClanIds)).filter(
        (id) => id >= 0
      )) {
        try {
          await createMarketplaceShop({
            clan_id: clanId || null,
            ...basePayload,
          });
          lastCreateError = null;
          break;
        } catch (err: any) {
          lastCreateError = err;
          const message = safeStr(err?.message);
          const canTryAnotherCommunity =
            /no active clan selected|not an active member|community|clan/i.test(
              message
            );
          if (!canTryAnotherCommunity) break;
        }
      }

      if (lastCreateError) throw lastCreateError;

      return ownerGmfnId;
    }

    async function refreshPublicShopState(showPageLoading: boolean) {
      if (showPageLoading) {
        setLoading(true);
      }
      setError("");
      setAutoRefreshingShop(false);

      try {
        const cleanedGmfnId = safeStr(gmfnId || "");
        let effectiveGmfnId = cleanedGmfnId;
        const clanRes = await getCurrentClan().catch(() => null);
        let publicShopRes: any = null;

        try {
          publicShopRes = await loadPublicShop(cleanedGmfnId);
        } catch (err: any) {
          const message = safeStr(err?.message);
          const refreshKey = publicShopReconnectAttemptKey(cleanedGmfnId);
          const canAttemptRefresh =
            cleanedGmfnId &&
            getAccessToken() &&
            isDisconnectedPublicShopError(message) &&
            autoRefreshAttemptedRef.current !== refreshKey;

          if (!canAttemptRefresh) throw err;

          autoRefreshAttemptedRef.current = refreshKey;
          if (alive) {
            setAutoRefreshingShop(true);
            setNotice({
              tone: "success",
              text: "Reconnecting your public shop link...",
            });
          }

          const refreshedGmfnId = await refreshOwnerShop(cleanedGmfnId, clanRes);
          if (!refreshedGmfnId) throw err;

          effectiveGmfnId = refreshedGmfnId;
          replacePublicShopAddress(refreshedGmfnId);
          publicShopRes = await loadPublicShop(effectiveGmfnId);
          if (alive) {
            setNotice({
              tone: "success",
              text: ownerSurfaceIdentityMatches(refreshedGmfnId, cleanedGmfnId)
                ? "Public shop reconnected. Shop Diaries is ready."
                : "Stale shop link refreshed to your current GSN shop.",
            });
          }
        }

        applyPublicShop(publicShopRes, clanRes, effectiveGmfnId);
      } catch (err: any) {
        if (!alive) return;
        const message = safeStr(err?.message);
        setError(publicShopReconnectErrorMessage(message));
      } finally {
        if (alive) {
          setAutoRefreshingShop(false);
          if (showPageLoading) {
            setLoading(false);
          }
        }
      }
    }

    void refreshPublicShopState(true);

    let refreshTimer: number | null = null;

    function handleVisibilityRefresh() {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }

      void refreshPublicShopState(false);
    }

    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleVisibilityRefresh);
      refreshTimer = window.setInterval(() => {
        void refreshPublicShopState(false);
      }, SPOTLIGHT_PILOT_REFRESH_MS);
    }

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityRefresh);
    }

    return () => {
      alive = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleVisibilityRefresh);
        if (refreshTimer !== null) {
          window.clearInterval(refreshTimer);
        }
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityRefresh);
      }
    };
  }, [gmfnId, shopReconnectRetryKey]);

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
    galleryRevealTimeoutRefs.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    galleryRevealTimeoutRefs.current = [];
  }, []);

  const scrollGalleryTargetIntoView = useCallback(
    function scrollGalleryTargetIntoView(targetId: string) {
      if (typeof document === "undefined" || typeof window === "undefined") return;
      const target = document.getElementById(targetId);
      if (!target) return;

      const topNavOffset = Math.min(
        92,
        Math.max(12, Math.round((window.innerHeight || 0) * 0.07))
      );
      const targetTop =
        target.getBoundingClientRect().top + window.scrollY - topNavOffset;

      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "auto",
      });
    },
    []
  );

  const revealGalleryTarget = useCallback(function revealGalleryTarget(
    targetId: string,
    attempt = 0
  ) {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const target = document.getElementById(targetId);
    if (target) {
      cancelPendingGalleryReveal();
      galleryRevealTargetRef.current = targetId;
      scrollGalleryTargetIntoView(targetId);
      window.requestAnimationFrame(() => {
        if (galleryRevealTargetRef.current !== targetId) return;
        scrollGalleryTargetIntoView(targetId);
      });
      [120, 320, 700, 1100].forEach((delay) => {
        const timeoutId = window.setTimeout(() => {
          if (galleryRevealTargetRef.current !== targetId) return;
          scrollGalleryTargetIntoView(targetId);
        }, delay);
        galleryRevealTimeoutRefs.current.push(timeoutId);
      });
      return;
    }

    if (attempt < 60) {
      galleryRevealTargetRef.current = targetId;
      galleryRevealFrameRef.current = window.requestAnimationFrame(() => {
        galleryRevealFrameRef.current = null;
        if (galleryRevealTargetRef.current !== targetId) return;
        revealGalleryTarget(targetId, attempt + 1);
      });
    }
  }, [cancelPendingGalleryReveal, scrollGalleryTargetIntoView]);

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
    if (loading) return;

    const id = location.hash.replace(/^#/, "");
    const shouldRevealProduct = id !== PUBLIC_SHOP_DIARIES_ANCHOR;
    const matchedProduct = shouldRevealProduct
      ? products.find((product) => {
          return routeProductId > 0 && product.id === routeProductId;
        }) ||
        products.find((product) => {
          return (
            id === publicShopBlockAnchorId(product) ||
            id === legacyProductAnchorId(product)
          );
        })
      : null;

    cancelPendingGalleryReveal();

    if (matchedProduct) {
      if (products.indexOf(matchedProduct) >= GALLERY_SLOTS_TOTAL) {
        setShowAllProducts(true);
      }
      setOpenProductId(matchedProduct.id ?? matchedProduct.slotNumber);
      revealGalleryTarget(publicShopBlockAnchorId(matchedProduct));
    } else {
      revealGalleryTarget(id);
    }

    return () => {
      cancelPendingGalleryReveal();
    };
  }, [
    cancelPendingGalleryReveal,
    loading,
    location.hash,
    products,
    revealGalleryTarget,
    routeProductId,
  ]);

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
      effectiveGmfnId ? `${effectiveGmfnId} Shop` : "",
      "Shop"
    );

    const effectiveDescription = firstMeaningful(shop?.description);

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
    if (typeof document === "undefined") return;
    if (loading || error) return;
    if (location.hash) return;
    if (communitySpotlights.length > 0) return;

    const revealKey = firstMeaningful(effectiveShop?.gmfnId, gmfnId);
    if (!revealKey || autoRevealDiariesKeyRef.current === revealKey) return;

    autoRevealDiariesKeyRef.current = revealKey;
    revealGalleryTarget(PUBLIC_SHOP_DIARIES_ANCHOR);

    return () => {
      cancelPendingGalleryReveal();
    };
  }, [
    cancelPendingGalleryReveal,
    effectiveShop?.gmfnId,
    error,
    gmfnId,
    communitySpotlights.length,
    loading,
    location.hash,
    revealGalleryTarget,
  ]);

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
    () => (showAllProducts ? products : products.slice(0, GALLERY_SLOTS_TOTAL)),
    [products, showAllProducts]
  );
  const overflowProductCount = Math.max(0, products.length - GALLERY_SLOTS_TOTAL);
  const repostableProducts = useMemo(() => {
    return products.filter((product) => {
      return (
        positiveNumber(product.id) > 0 &&
        product.visibilityMode === "community_visible" &&
        product.distributionSlotsRemaining > 0
      );
    });
  }, [products]);
  const selectedRepostProduct = useMemo(() => {
    return (
      repostableProducts.find(
        (product) => Number(product.id || 0) === Number(selectedRepostProductId || 0)
      ) ||
      repostableProducts[0] ||
      null
    );
  }, [repostableProducts, selectedRepostProductId]);
  const targetRepostCommunities = useMemo(() => {
    const originClanId = positiveNumber(selectedRepostProduct?.originClanId);
    return repostCommunities.filter((community) => community.id !== originClanId);
  }, [repostCommunities, selectedRepostProduct?.originClanId]);
  const selectedRepostCommunity = useMemo(() => {
    return (
      targetRepostCommunities.find(
        (community) => community.id === Number(selectedRepostClanId || 0)
      ) ||
      targetRepostCommunities[0] ||
      null
    );
  }, [targetRepostCommunities, selectedRepostClanId]);

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
    const messageParts = splitSpotlightMessage(miniSpotlight?.message);
    const isCurrentShop =
      Boolean(currentShopGmfnId) &&
      Boolean(spotlightShopGmfnId) &&
      currentShopGmfnId === spotlightShopGmfnId.toUpperCase();
    const shopTo = spotlightShopGmfnId
      ? publicShopPath(spotlightShopGmfnId)
      : "";
    const spotlightClanId = positiveNumber(miniSpotlight?.sourceClanId);
    const communityTo = spotlightClanId
      ? `/verify/community/${encodeURIComponent(String(spotlightClanId))}`
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
        ? "This public page keeps visitors inside the current shop view."
        : "This live spotlight item does not currently expose a linked shop.",
    };
  }, [miniSpotlight, effectiveShop]);

  const absoluteShopLink = useMemo(() => {
    const ownerId = firstMeaningful(effectiveShop?.gmfnId, gmfnId);
    return ownerId ? publicShopDiariesUrl(ownerId) : "";
  }, [effectiveShop?.gmfnId, gmfnId]);

  const absoluteShopShareLink = useMemo(() => {
    const ownerId = firstMeaningful(effectiveShop?.gmfnId, gmfnId);
    return ownerId ? publicShopShareUrl({ gmfnId: ownerId }) : "";
  }, [effectiveShop?.gmfnId, gmfnId]);

  const shopLoadFailed = Boolean(error);
  const ownerSessionPresent = Boolean(getAccessToken());
  const shopOwnerGmfnId = firstMeaningful(
    effectiveShop?.gmfnId,
    broadcast?.authorGmfnId,
    gmfnId
  );
  const ownerSurfaceCommunityId = positiveNumber(
    effectiveShop?.clanId || getSelectedClanId()
  );
  const ownerSurfaceLinks = useMemo(
    () => [
      {
        label: "Dashboard",
        to: APP_ROUTES.DASHBOARD,
        debugId: "shop-gallery.owner-nav.dashboard",
      },
      {
        label: "Community Home",
        to: routeWithCommunity(APP_ROUTES.COMMUNITY, ownerSurfaceCommunityId),
        debugId: "shop-gallery.owner-nav.community",
      },
      {
        label: "Marketplace",
        to: routeWithCommunity(APP_ROUTES.MARKETPLACE, ownerSurfaceCommunityId),
        debugId: "shop-gallery.owner-nav.marketplace",
      },
    ],
    [ownerSurfaceCommunityId]
  );
  const loginReconnectPath = `/login?next=${encodeURIComponent(
    publicShopReturnPath
  )}`;
  const shopNameText = safeStr(effectiveShop?.shopName || "Shop");
  const shopDescriptionText = safeStr(
    autoRefreshingShop
      ? "This public shop link is reconnecting to the owner's active shop so Shop Diaries can load."
      : shopLoadFailed
      ? "This public shop link has reached the shop page, but the backend has not connected it to an active owner shop yet."
      : effectiveShop?.description ||
          "Public shop face for trusted products. Private Vault offers open only through a trust link."
  );
  const shopGmfnText = safeStr(effectiveShop?.gmfnId);
  const shopCommunityText = safeStr(effectiveShop?.communityName);
  const shopWhatsAppText = safeStr(effectiveShop?.whatsapp);
  const shopTelegramText = safeStr(effectiveShop?.telegram);
  const publicBlockCount = Math.min(products.length, GALLERY_SLOTS_TOTAL);
  const publicBlockText = autoRefreshingShop
    ? "Reconnecting shop"
    : shopLoadFailed
    ? "Shop not connected"
    : publicBlockCount === 1
      ? "1 public block live"
      : `${publicBlockCount} public blocks live`;
  const shopDiaryCounterText = autoRefreshingShop
    ? "Refreshing"
    : shopLoadFailed
    ? "Needs refresh"
    : `${publicBlockCount}/${GALLERY_SLOTS_TOTAL}`;
  const shopLocationText = firstMeaningful(
    shopCommunityText,
    "GSN public marketplace"
  );
  const shopCommunityIdText = safeStr(effectiveShop?.clanId);
  const shopVerificationQrTarget = firstMeaningful(
    absoluteShopShareLink,
    absoluteShopLink
  );
  const shopVerificationRows = [
    { label: "Shop owner ID", value: shopGmfnText || "Not ready" },
    { label: "Marketplace", value: shopLocationText },
    { label: "Community ID", value: shopCommunityIdText || "Not exposed yet" },
    { label: "Shop name", value: shopNameText },
  ];
  const shopContactText = autoRefreshingShop
    ? "Owner refresh running"
    : shopLoadFailed
    ? "Owner refresh needed"
    : firstMeaningful(
        shopWhatsAppText ? `WhatsApp ${shopWhatsAppText}` : "",
        shopTelegramText ? `Telegram ${shopTelegramText}` : "",
        "Share by shop link"
      );
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

      const copied = await safeCopy(`${params.title}\n${params.text}\n${params.url}`);
      setNotice({
        tone: copied ? "success" : "error",
        text: copied
          ? params.successText
          : "Clipboard copy was blocked. The old clipboard may still contain another app route.",
      });
    } catch {
      setNotice({
        tone: "error",
        text: "The share action did not complete.",
      });
    }
  }

  async function copyShopLink() {
    if (shopLoadFailed) {
      setNotice({
        tone: "error",
        text: "This public shop link is not active yet. Ask the owner to refresh the shop link from Marketplace before copying it.",
      });
      return;
    }

    if (!absoluteShopShareLink) {
      setNotice({ tone: "error", text: "Public shop link is not ready yet." });
      return;
    }

    const copied = await safeCopy(absoluteShopShareLink);
    setNotice({
      tone: copied ? "success" : "error",
      text: copied
        ? "Public shop poster link copied."
        : "Clipboard copy was blocked. Use the visible public shop link instead.",
    });
  }

  function shareShop() {
    if (shopLoadFailed) {
      setNotice({
        tone: "error",
        text: "This shop link needs the owner to refresh it from Marketplace before it can be shared.",
      });
      return;
    }

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
      url: absoluteShopShareLink || absoluteShopLink,
      successText: "Public shop poster share ready.",
    });
  }

  function shareProduct(product: ShopProduct) {
    const blockLabel = publicShopBlockLabel(product);
    const ownerId = firstMeaningful(effectiveShop?.gmfnId, gmfnId);
    const productUrl = publicShopShareUrl({
      gmfnId: ownerId,
      productId: product.id,
      block: product.slotNumber,
    });
    const productTitle = productDisplayTitle(product);
    const title = `${blockLabel} - ${productTitle}`;
    const text = firstMeaningful(
      productBuyerCue(product, ""),
      product.description,
      "Public shop block"
    );
    const shopContext = firstMeaningful(
      effectiveShop?.shopName,
      effectiveShop?.ownerName,
      "this public shop"
    );

    void shareOrCopy({
      title,
      text: `${blockLabel}\n${text}\n${product.priceText}\nFrom ${shopContext}.\nOpen the full public shop and check this block there.`,
      url: productUrl,
      successText: `Full public shop share ready. Mention ${blockLabel} in your message.`,
    });
  }

  function openOwnerWhatsAppChat(message: string, successText: string): boolean {
    const chatUrl = buildWhatsAppChatUrl(effectiveShop?.whatsapp, message);
    if (!chatUrl || typeof window === "undefined") {
      return false;
    }

    const opened = window.open(chatUrl, "_blank", "noopener,noreferrer");
    setNotice({
      tone: opened ? "success" : "error",
      text: opened
        ? successText
        : "WhatsApp could not open. Check that the owner number includes the correct country code.",
    });
    return true;
  }

  function toggleOwnerContactPanel() {
    if (shopLoadFailed) {
      setNotice({
        tone: "error",
        text: "This shop link needs the owner to refresh it from Marketplace before owner contact can be trusted.",
      });
      return;
    }

    setOwnerContactPanelOpen((open) => !open);
  }

  function toggleShopVerificationPanel() {
    setShopVerificationOpen((open) => !open);
  }

  function callOwnerPhone() {
    const phoneUrl = buildPhoneCallUrl(effectiveShop?.whatsapp);
    if (!phoneUrl || typeof window === "undefined") {
      setNotice({
        tone: "error",
        text: "No owner phone number is ready on this public shop yet.",
      });
      return;
    }

    window.location.href = phoneUrl;
    setOwnerContactPanelOpen(false);
    setNotice({
      tone: "success",
      text: "Phone call opened. If the call prompt does not appear, use the visible owner number on the shop card.",
    });
  }

  async function contactOwnerByWhatsApp() {
    const shopTitle = firstMeaningful(
      effectiveShop?.shopName,
      effectiveShop?.ownerName,
      "this GSN shop"
    );
    const message = `Hello, I found ${shopTitle} on GSN. I would like to chat with the owner.`;

    if (
      openOwnerWhatsAppChat(
        message,
        "WhatsApp chat opened for the shop owner. If WhatsApp says this number is not registered, come back and use Call phone."
      )
    ) {
      setOwnerContactPanelOpen(false);
      return;
    }

    const copied = await safeCopy(`${message}\n${absoluteShopLink}`);
    setNotice({
      tone: copied ? "success" : "error",
      text: copied
        ? "Owner WhatsApp is not ready on this shop. The message and shop link were copied instead."
        : "Owner WhatsApp is not ready on this shop, and clipboard copy was blocked.",
    });
  }

  async function askForVaultAccess() {
    const shopTitle = firstMeaningful(
      effectiveShop?.shopName,
      effectiveShop?.ownerName,
      "this shop"
    );

    const requestText = `Hello, I would like to request a private Vault access link for ${shopTitle}. Please share any selected offers you do not show on the public page.`;

    if (
      openOwnerWhatsAppChat(
        requestText,
        "WhatsApp chat opened. Ask the owner for a private Vault access link there."
      )
    ) {
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

    const copied = await safeCopy(`${requestText}\n${absoluteShopLink}`);
    setNotice({
      tone: copied ? "success" : "error",
      text: copied
        ? "Vault access request copied. Send it to the shop owner."
        : "Clipboard copy was blocked. Ask the shop owner for a private Vault access link.",
    });
  }

  async function repostShop() {
    if (shopLoadFailed) {
      setNotice({
        tone: "error",
        text: "This shop link needs the owner to refresh it from Marketplace before it can be reposted.",
      });
      return;
    }

    if (!getAccessToken()) {
      const copied = await safeCopy(
        `GSN network repost draft:\n${shopNameText}\n${shopDescriptionText}\n${absoluteShopLink}`
      );
      setNotice({
        tone: copied ? "success" : "error",
        text: copied
          ? "Draft copied. Sign in to complete a live GSN repost into another community."
          : "Sign in to repost inside GSN, or use Share for an outside link.",
      });
      return;
    }

    if (repostableProducts.length === 0) {
      setNotice({
        tone: "error",
        text: "No public block currently has repost slots available.",
      });
      return;
    }

    setRepostPanelOpen((open) => !open);
    setSelectedRepostProductId((current) => {
      if (current > 0 && repostableProducts.some((product) => product.id === current)) {
        return current;
      }
      return positiveNumber(repostableProducts[0]?.id);
    });
  }

  async function submitLiveRepost() {
    const product = selectedRepostProduct;
    const targetCommunity = selectedRepostCommunity;

    if (!product?.id) {
      setNotice({
        tone: "error",
        text: "Choose a public block before reposting.",
      });
      return;
    }

    if (!targetCommunity?.id) {
      setNotice({
        tone: "error",
        text: "Choose one of your communities as the repost destination.",
      });
      return;
    }

    setRepostingProduct(true);
    try {
      const res = await createMarketplaceRepost({
        product_id: Number(product.id),
        target_clan_id: Number(targetCommunity.id),
      });
      const remaining = positiveNumber(
        res?.product?.distribution_slots_remaining ||
          res?.product?.remaining_distribution_slots ||
          product.distributionSlotsRemaining - 1
      );
      setProducts((prev) =>
        prev.map((item) =>
          Number(item.id || 0) === Number(product.id)
            ? {
                ...item,
                distributionSlotsRemaining: Math.max(0, remaining),
                repostsUsed: item.repostsUsed + 1,
              }
            : item
        )
      );
      setNotice({
        tone: "success",
        text: `${publicShopBlockLabel(product)} reposted into ${targetCommunity.name}.`,
      });
      setRepostPanelOpen(false);
    } catch (err: any) {
      setNotice({
        tone: "error",
        text:
          safeStr(err?.message) ||
          "Live repost did not complete. Check membership, target community, and remaining slots.",
      });
    } finally {
      setRepostingProduct(false);
    }
  }

  async function copyRepostDraft() {
    const product = selectedRepostProduct || repostableProducts[0];
    const blockText = product
      ? `${publicShopBlockLabel(product)} - ${productDisplayTitle(product)}`
      : shopNameText;

    const copied = await safeCopy(
      `GSN network repost draft:\n${blockText}\n${shopDescriptionText}\n${absoluteShopLink}`
    );
    setNotice({
      tone: copied ? "success" : "error",
      text: copied
        ? "Network repost draft copied. A live repost still needs a product and target community inside GSN."
        : "Clipboard copy was blocked. Use the visible public shop link instead.",
    });
  }

  function openSpotlightPreview() {
    revealGalleryTarget(PUBLIC_SHOP_DIARIES_ANCHOR);
  }

  return (
    <main className="public-shop-shell theme-public-shop">
      <div className="public-shop-inner">
      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}
      {error ? <div style={noticeCard("error")}>{error}</div> : null}
      <OwnerOnlySurfaceNav
        ownerGmfnId={shopOwnerGmfnId}
        compact={isCompact}
        label="Owner navigation"
        links={ownerSurfaceLinks}
        refreshKey={shopReconnectRetryKey}
      />

      <GsnInstallPrompt
        tone="light"
        compact={isCompact}
        surface="public-shop"
      />

      <section
        className="public-shop-stack"
        style={{
          display: "grid",
          gap: isCompact ? 12 : 18,
        }}
        aria-label="Public shop gallery"
      >
        <div
          className="public-shop-signboard"
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: isCompact ? 22 : 34,
            padding: isCompact ? "14px 13px 13px" : "36px 34px 32px",
            border: "2px solid rgba(246,196,83,0.62)",
            background:
              "radial-gradient(circle at 12% 0%, rgba(31,95,183,0.58) 0%, transparent 32%), radial-gradient(circle at 88% 5%, rgba(246,196,83,0.24) 0%, transparent 28%), linear-gradient(145deg, #06182B 0%, #082A4C 48%, #031424 100%)",
            boxShadow:
              "0 28px 70px rgba(2,12,27,0.32), inset 0 1px 0 rgba(255,255,255,0.14)",
            textAlign: "center",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "repeating-linear-gradient(90deg, transparent 0 34px, rgba(255,255,255,0.026) 34px 35px), radial-gradient(circle at 50% 0%, rgba(255,255,255,0.10) 0%, transparent 42%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "relative",
              display: "grid",
              justifyItems: "center",
              gap: isCompact ? 5 : 12,
            }}
          >
            <div
              style={{
                width: isCompact ? 38 : 66,
                height: isCompact ? 38 : 66,
                borderRadius: "50%",
                border: "1px solid rgba(246,196,83,0.66)",
                background:
                  "radial-gradient(circle at 40% 28%, #FFE7A8 0%, #D4AF37 43%, #6C4D0F 100%)",
                color: "#08233D",
                display: "grid",
                placeItems: "center",
                fontWeight: 950,
                fontSize: isCompact ? 15 : 22,
                boxShadow:
                  "0 16px 34px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.45)",
              }}
            >
              GSN
            </div>
            <h1
              style={{
                margin: 0,
                color: "#FFFFFF",
                fontSize: isCompact ? 25 : 50,
                lineHeight: 1.02,
                fontWeight: 950,
                textTransform: "uppercase",
                letterSpacing: 0,
                maxWidth: 920,
                textShadow: "0 8px 26px rgba(0,0,0,0.34)",
              }}
            >
              {shopNameText}
            </h1>
            <div
              style={{
                width: 56,
                height: 2,
                borderRadius: 999,
                background: "linear-gradient(90deg, transparent, #F6D77A, transparent)",
              }}
            />
            <p
              style={{
                margin: 0,
                color: "rgba(255,255,255,0.86)",
                fontSize: isCompact ? 12 : 17,
                lineHeight: 1.3,
                maxWidth: 720,
              }}
            >
              {shopDescriptionText}
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: isCompact ? 5 : 8,
                justifyContent: "center",
                marginTop: 2,
              }}
            >
              {shopGmfnText ? (
                <span
                  style={{
                    ...badge(false),
                    color: "#FFFFFF",
                    background: "rgba(255,255,255,0.11)",
                    border: "1px solid rgba(255,255,255,0.20)",
                  }}
                >
                  ID: {shopGmfnText}
                </span>
              ) : null}
              <span
                style={{
                  ...badge(false),
                  color: "#FFFFFF",
                  background: "rgba(255,255,255,0.11)",
                  border: "1px solid rgba(255,255,255,0.20)",
                }}
              >
                {shopLocationText}
              </span>
            </div>
          </div>
        </div>

        <div
          className="public-shop-status-strip"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 0,
            borderRadius: isCompact ? 18 : 22,
            overflow: "hidden",
            border: "1px solid rgba(13,95,168,0.15)",
            background: "linear-gradient(180deg, #FFFFFF 0%, #F4F8FC 100%)",
            boxShadow:
              "0 16px 34px rgba(8,38,67,0.10), inset 0 1px 0 rgba(255,255,255,0.85)",
          }}
        >
          {[
            { mark: "12", title: publicBlockText, detail: "Open shelf" },
            { mark: "V", title: "Vault", detail: "By trust link" },
            { mark: "W", title: shopContactText, detail: "Owner contact" },
          ].map((item, itemIndex) => {
            const statusItemStyle: React.CSSProperties = {
                minHeight: isCompact ? 58 : 86,
                padding: isCompact ? "8px 6px" : "14px 16px",
                borderRight:
                  itemIndex < 2 ? "1px solid rgba(13,95,168,0.12)" : "none",
                display: "grid",
                gridTemplateColumns: isCompact ? "30px minmax(0, 1fr)" : "52px 1fr",
                alignItems: "center",
                justifyItems: "stretch",
                gap: isCompact ? 5 : 12,
                textAlign: "left",
                minWidth: 0,
              };
            const statusItemContent = (
              <>
                <div
                  style={{
                    width: isCompact ? 28 : 50,
                    height: isCompact ? 28 : 50,
                    borderRadius: item.mark === "V" ? (isCompact ? 8 : 14) : "50%",
                    display: "grid",
                    placeItems: "center",
                    background:
                      item.mark === "W"
                        ? "linear-gradient(180deg, #22C55E 0%, #15803D 100%)"
                        : item.mark === "V"
                        ? "radial-gradient(circle at 50% 44%, rgba(255,244,204,0.92) 0%, rgba(214,170,69,0.46) 26%, rgba(8,35,61,0.18) 27%, rgba(8,35,61,0.18) 33%, transparent 34%), linear-gradient(145deg, #4E6175 0%, #102A44 58%, #071827 100%)"
                        : "linear-gradient(180deg, #1F5FB7 0%, #123D7C 100%)",
                    color: "#FFFFFF",
                    fontWeight: 950,
                    boxShadow:
                      "0 10px 22px rgba(8,38,67,0.16), inset 0 1px 0 rgba(255,255,255,0.28)",
                    fontSize: isCompact ? 12 : 17,
                    border:
                      item.mark === "V"
                        ? "1px solid rgba(214,170,69,0.48)"
                        : "none",
                  }}
                >
                  {item.mark === "V" ? (
                    <span
                      style={{
                        width: isCompact ? 14 : 24,
                        height: isCompact ? 14 : 24,
                        borderRadius: "50%",
                        border: "2px solid rgba(255,236,173,0.68)",
                        boxShadow: "inset 0 1px 2px rgba(255,255,255,0.22)",
                      }}
                    />
                  ) : (
                    item.mark
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      color: "#0B1F33",
                      fontWeight: 950,
                      fontSize: isCompact ? 9.8 : 15,
                      lineHeight: 1.12,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: isCompact ? 3 : 3,
                      WebkitBoxOrient: "vertical" as any,
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      marginTop: isCompact ? 2 : 3,
                      color: "#526C84",
                      fontWeight: 750,
                      fontSize: isCompact ? 8.4 : 12,
                      lineHeight: 1.1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.detail}
                  </div>
                </div>
              </>
            );

            return item.mark === "W" ? (
              <SecondaryButton
                key={`${item.mark}-${item.title}`}
                className="public-shop-status-item"
                onClick={toggleOwnerContactPanel}
                debugId="shop-gallery.owner-contact.choose"
                fullWidth
                minWidth={0}
                aria-expanded={ownerContactPanelOpen}
                aria-controls="public-shop-owner-contact-panel"
                aria-label="Choose how to contact the shop owner"
                style={{
                  ...statusItemStyle,
                  width: "100%",
                  font: "inherit",
                  cursor: "pointer",
                  borderTop: "none",
                  borderBottom: "none",
                  borderLeft: "none",
                  background: "transparent",
                }}
              >
                {statusItemContent}
              </SecondaryButton>
            ) : (
              <div
                key={`${item.mark}-${item.title}`}
                className="public-shop-status-item"
                style={statusItemStyle}
              >
                {statusItemContent}
              </div>
            );
          })}
        </div>

        <section
          className="public-shop-section public-shop-verify"
          style={{
            ...innerCard("#F8FBFF"),
            display: "grid",
            gap: isCompact ? 10 : 12,
            padding: isCompact ? 12 : 16,
          }}
          aria-label="Shop verification summary"
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) 170px",
              gap: isCompact ? 9 : 12,
              alignItems: "center",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ ...sectionLabel(), color: "#0B4A7A" }}>
                Shop verification
              </div>
              <div
                style={{
                  marginTop: 5,
                  color: "#0B1F33",
                  fontSize: isCompact ? 13.5 : 16,
                  fontWeight: 950,
                  lineHeight: 1.16,
                }}
              >
                Check the shop identity before you trade.
              </div>
              <div
                style={{
                  marginTop: 5,
                  color: "#526C84",
                  fontSize: isCompact ? 10.2 : 12.2,
                  lineHeight: 1.35,
                  fontWeight: 720,
                }}
              >
                The QR reopens this public shop. TrustSlip proof is on request
                until a live TrustSlip code is attached.
              </div>
            </div>

            <SecondaryButton
              onClick={toggleShopVerificationPanel}
              minWidth={0}
              stableHeight={isCompact ? 40 : 46}
              debugId="shop-gallery.verify-shop.toggle"
              aria-expanded={shopVerificationOpen}
              aria-controls="public-shop-verify-panel"
              style={{
                ...secondaryBtn(false),
                minHeight: isCompact ? 40 : 46,
                borderRadius: isCompact ? 13 : 14,
                fontSize: isCompact ? 11.2 : 13.5,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {shopVerificationOpen ? "Hide proof" : "Verify shop"}
            </SecondaryButton>
          </div>

          {shopVerificationOpen ? (
            <div
              id="public-shop-verify-panel"
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "160px minmax(0, 1fr)",
                gap: isCompact ? 10 : 14,
                alignItems: "stretch",
                borderRadius: isCompact ? 16 : 18,
                border: "1px solid rgba(13,95,168,0.14)",
                background: "#FFFFFF",
                padding: isCompact ? 10 : 12,
              }}
            >
              <div
                style={{
                  minHeight: isCompact ? 132 : 148,
                  borderRadius: isCompact ? 14 : 16,
                  border: "1px solid rgba(13,95,168,0.13)",
                  background:
                    "linear-gradient(180deg, #FFFFFF 0%, #F2F7FC 100%)",
                  display: "grid",
                  placeItems: "center",
                  padding: isCompact ? 10 : 12,
                }}
              >
                {shopVerificationQrTarget ? (
                  <QRCodeSVG
                    value={shopVerificationQrTarget}
                    size={isCompact ? 116 : 132}
                    marginSize={1}
                    fgColor="#07172C"
                    bgColor="#FFFFFF"
                  />
                ) : (
                  <span
                    style={{
                      color: "#526C84",
                      fontSize: isCompact ? 11 : 12,
                      fontWeight: 850,
                      textAlign: "center",
                      lineHeight: 1.25,
                    }}
                  >
                    Shop link not ready
                  </span>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gap: isCompact ? 7 : 8,
                  alignContent: "start",
                }}
              >
                {shopVerificationRows.map((row) => (
                  <div
                    key={row.label}
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "1fr"
                        : "128px minmax(0, 1fr)",
                      gap: isCompact ? 2 : 8,
                      alignItems: "center",
                      borderRadius: 12,
                      background: "rgba(234,243,255,0.72)",
                      padding: isCompact ? "8px 9px" : "9px 10px",
                    }}
                  >
                    <span
                      style={{
                        color: "#617085",
                        fontSize: isCompact ? 9.5 : 11,
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: 0,
                      }}
                    >
                      {row.label}
                    </span>
                    <span
                      style={{
                        color: "#07172C",
                        fontSize: isCompact ? 11.5 : 13,
                        fontWeight: 900,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={row.value}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {ownerContactPanelOpen ? (
          <section
            id="public-shop-owner-contact-panel"
            className="public-shop-section"
            style={{
              ...innerCard("#F8FBFF"),
              display: "grid",
              gap: isCompact ? 9 : 12,
            }}
            aria-label="Owner contact choices"
          >
            <div>
              <div style={{ ...sectionLabel(), color: "#0B4A7A" }}>
                Owner contact
              </div>
              <div
                style={{
                  marginTop: 5,
                  color: "#0B1F33",
                  fontSize: isCompact ? 14 : 17,
                  fontWeight: 950,
                  lineHeight: 1.16,
                }}
              >
                Choose WhatsApp chat or a normal phone call.
              </div>
              <div
                style={{
                  marginTop: 6,
                  color: "#526C84",
                  fontSize: isCompact ? 10.5 : 12.5,
                  lineHeight: 1.35,
                  fontWeight: 750,
                }}
              >
                GSN can open the chat link, but only WhatsApp can confirm whether
                this number is registered there.
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "repeat(2, minmax(0, 1fr))",
                gap: isCompact ? 8 : 10,
              }}
            >
              <PrimaryButton
                onClick={() => void contactOwnerByWhatsApp()}
                minWidth={0}
                stableHeight={isCompact ? 42 : 50}
                debugId="shop-gallery.owner-contact.whatsapp-chat"
                style={{
                  ...primaryBtn(false),
                  minHeight: isCompact ? 42 : 50,
                  borderRadius: isCompact ? 13 : 14,
                  fontSize: isCompact ? 12 : 14,
                }}
              >
                WhatsApp chat
              </PrimaryButton>
              <SecondaryButton
                onClick={callOwnerPhone}
                minWidth={0}
                stableHeight={isCompact ? 42 : 50}
                debugId="shop-gallery.owner-contact.phone-call"
                style={{
                  ...secondaryBtn(false),
                  minHeight: isCompact ? 42 : 50,
                  borderRadius: isCompact ? 13 : 14,
                  fontSize: isCompact ? 12 : 14,
                }}
              >
                Call phone
              </SecondaryButton>
            </div>
          </section>
        ) : null}

        <div
          className="public-shop-action-row"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: isCompact ? 7 : 10,
          }}
        >
          <PrimaryButton
            onClick={repostShop}
            minWidth={0}
            stableHeight={isCompact ? 40 : 52}
            debugId="shop-gallery.repost-shop"
            style={{
              ...primaryBtn(shopLoadFailed),
              minHeight: isCompact ? 40 : 52,
              padding: isCompact ? "7px 4px" : "10px 14px",
              borderRadius: isCompact ? 13 : 14,
              fontSize: isCompact ? 10.7 : 14,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {isCompact ? "GSN repost" : "GSN repost"}
          </PrimaryButton>
          <PrimaryButton
            onClick={shareShop}
            minWidth={0}
            stableHeight={isCompact ? 40 : 52}
            debugId="shop-gallery.share-shop"
            style={{
              ...primaryBtn(shopLoadFailed),
              minHeight: isCompact ? 40 : 52,
              padding: isCompact ? "7px 4px" : "10px 14px",
              borderRadius: isCompact ? 13 : 14,
              fontSize: isCompact ? 10.7 : 14,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {isCompact ? "Share" : "Share shop"}
          </PrimaryButton>
          <SecondaryButton
            onClick={copyShopLink}
            minWidth={0}
            stableHeight={isCompact ? 40 : 52}
            debugId="shop-gallery.copy-shop-link"
            style={{
              ...secondaryBtn(shopLoadFailed),
              minHeight: isCompact ? 40 : 52,
              padding: isCompact ? "7px 4px" : "9px 12px",
              borderRadius: isCompact ? 13 : 14,
              fontSize: isCompact ? 10.7 : 14,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {isCompact ? "Copy link" : "Copy link"}
          </SecondaryButton>
        </div>

        {repostPanelOpen ? (
          <section
            className="public-shop-section"
            style={{
              ...innerCard("#F8FBFF"),
              display: "grid",
              gap: isCompact ? 10 : 12,
            }}
            aria-label="Live GSN repost"
          >
            <div>
              <div style={{ ...sectionLabel(), color: "#0B4A7A" }}>
                Live GSN repost
              </div>
              <div
                style={{
                  marginTop: 5,
                  color: "#0B1F33",
                  fontSize: isCompact ? 15 : 18,
                  fontWeight: 950,
                  lineHeight: 1.15,
                }}
              >
                Send one public block into another community.
              </div>
              <div
                style={{
                  marginTop: 6,
                  color: "#526C84",
                  fontSize: isCompact ? 10.5 : 12.5,
                  lineHeight: 1.35,
                  fontWeight: 700,
                }}
              >
                This is inside GSN. Outside sharing still uses the Share button.
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "minmax(0, 1fr) minmax(0, 1fr)",
                gap: isCompact ? 8 : 10,
              }}
            >
              <label style={{ display: "grid", gap: 5, color: "#0B1F33", fontWeight: 850 }}>
                <span style={{ fontSize: isCompact ? 10.5 : 12 }}>Public block</span>
                <select
                  value={String(selectedRepostProduct?.id || "")}
                  onChange={(event) => setSelectedRepostProductId(Number(event.target.value || 0))}
                  style={{
                    minHeight: isCompact ? 42 : 46,
                    borderRadius: 14,
                    border: "1px solid rgba(13,95,168,0.20)",
                    background: "#FFFFFF",
                    color: "#0B1F33",
                    fontWeight: 800,
                    padding: "8px 10px",
                    width: "100%",
                  }}
                >
                  {repostableProducts.map((product) => (
                    <option key={`repost-product-${product.id}`} value={product.id}>
                      {publicShopBlockLabel(product)} - {productDisplayTitle(product)}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 5, color: "#0B1F33", fontWeight: 850 }}>
                <span style={{ fontSize: isCompact ? 10.5 : 12 }}>Target community</span>
                <select
                  value={String(selectedRepostCommunity?.id || "")}
                  onChange={(event) => setSelectedRepostClanId(Number(event.target.value || 0))}
                  disabled={repostCommunitiesLoading || targetRepostCommunities.length === 0}
                  style={{
                    minHeight: isCompact ? 42 : 46,
                    borderRadius: 14,
                    border: "1px solid rgba(13,95,168,0.20)",
                    background: "#FFFFFF",
                    color: "#0B1F33",
                    fontWeight: 800,
                    padding: "8px 10px",
                    width: "100%",
                  }}
                >
                  {targetRepostCommunities.length === 0 ? (
                    <option value="">
                      {repostCommunitiesLoading
                        ? "Loading your communities..."
                        : "No eligible target community"}
                    </option>
                  ) : (
                    targetRepostCommunities.map((community) => (
                      <option key={`repost-community-${community.id}`} value={community.id}>
                        {community.name}
                      </option>
                    ))
                  )}
                </select>
              </label>
            </div>

            {selectedRepostProduct ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
                  gap: isCompact ? 7 : 8,
                  color: "#526C84",
                  fontSize: isCompact ? 10.5 : 12,
                  fontWeight: 800,
                }}
              >
                <span style={badge(true)}>
                  {selectedRepostProduct.distributionSlotsRemaining} slots left
                </span>
                <span style={badge(true)}>
                  {selectedRepostProduct.repostsUsed} reposts used
                </span>
                <span style={badge(Boolean(selectedRepostCommunity))}>
                  {selectedRepostCommunity ? "Target ready" : "Target needed"}
                </span>
              </div>
            ) : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "minmax(0, 1fr) minmax(0, 1fr)",
                gap: isCompact ? 7 : 10,
              }}
            >
              <PrimaryButton
                onClick={submitLiveRepost}
                minWidth={0}
                stableHeight={isCompact ? 42 : 48}
                busy={repostingProduct}
                disabled={
                  repostingProduct ||
                  !selectedRepostProduct ||
                  !selectedRepostCommunity ||
                  repostCommunitiesLoading
                }
                debugId="shop-gallery.repost-submit"
                style={{
                  ...primaryBtn(
                    repostingProduct ||
                      !selectedRepostProduct ||
                      !selectedRepostCommunity ||
                      repostCommunitiesLoading
                  ),
                  minHeight: isCompact ? 42 : 48,
                  borderRadius: 14,
                  fontSize: isCompact ? 11.2 : 13,
                }}
              >
                {repostingProduct ? "Reposting..." : "Repost inside GSN"}
              </PrimaryButton>

              <SecondaryButton
                onClick={copyRepostDraft}
                minWidth={0}
                stableHeight={isCompact ? 42 : 48}
                debugId="shop-gallery.repost-copy-draft"
                style={{
                  ...secondaryBtn(false),
                  minHeight: isCompact ? 42 : 48,
                  borderRadius: 14,
                  fontSize: isCompact ? 11.2 : 13,
                }}
              >
                Copy draft instead
              </SecondaryButton>
            </div>
          </section>
        ) : null}

        {absoluteShopLink && shopLoadFailed ? (
          <span
            aria-disabled
            onClick={() =>
              setNotice({
                tone: "error",
                text: "This public shop link is not active yet. Ask the owner to refresh the shop link from Marketplace before opening it.",
              })
            }
            style={{
              display: "block",
              minHeight: 42,
              padding: isCompact ? "8px 10px" : "10px 12px",
              borderRadius: 14,
              border: "1px solid rgba(13,95,168,0.14)",
              background: "rgba(255,255,255,0.78)",
              color: "#22415D",
              fontSize: isCompact ? 10.2 : 12,
              fontWeight: 850,
              lineHeight: 1.35,
              cursor: "not-allowed",
              opacity: 0.78,
              textDecoration: "none",
              textUnderlineOffset: 3,
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            }}
          >
            {absoluteShopLink}
          </span>
        ) : absoluteShopLink ? (
          <StableCtaLink
            to={absoluteShopLink}
            target="_blank"
            rel="noreferrer"
            debugId="shop-gallery.absolute-shop-link"
            style={{
              display: "block",
              minHeight: 42,
              padding: isCompact ? "8px 10px" : "10px 12px",
              borderRadius: 14,
              border: "1px solid rgba(13,95,168,0.14)",
              background: "rgba(255,255,255,0.78)",
              color: "#22415D",
              fontSize: isCompact ? 10.2 : 12,
              fontWeight: 850,
              lineHeight: 1.35,
              textDecoration: "underline",
              textUnderlineOffset: 3,
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            }}
          >
            {absoluteShopLink}
          </StableCtaLink>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 14,
          }}
        >
          <section
            className="public-shop-section public-shop-spotlight"
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: isCompact ? 20 : 26,
              padding: isCompact ? 12 : 22,
              border: "1px solid rgba(77,160,255,0.38)",
              background:
                "radial-gradient(circle at 6% 0%, rgba(77,160,255,0.30) 0%, transparent 34%), linear-gradient(145deg, #08233D 0%, #073A6B 52%, #04182B 100%)",
              boxShadow:
                "0 24px 52px rgba(2,12,27,0.22), inset 0 1px 0 rgba(255,255,255,0.13)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "minmax(0, 1fr) minmax(134px, 46%)" : "minmax(0, 1fr) 310px",
                gap: isCompact ? 10 : 18,
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ ...sectionLabel(), color: "#F6D77A" }}>
                  {miniSpotlight ? "Live Spotlight" : "Spotlight"}
                </div>
                <div
                  style={{
                    marginTop: 10,
                    color: "#FFFFFF",
                    fontSize: isCompact ? 16 : 28,
                    fontWeight: 950,
                    lineHeight: 1.1,
                  }}
                >
                  {miniSpotlight
                    ? miniSpotlightView.title
                    : "See the live community billboard."}
                </div>
                <div
                  style={{
                    marginTop: isCompact ? 7 : 10,
                    color: "rgba(235,245,255,0.84)",
                    fontSize: isCompact ? 10.5 : 14,
                    lineHeight: 1.35,
                  }}
                >
                  {miniSpotlight
                    ? miniSpotlightView.detail
                    : "Shops in this marketplace can highlight new items, updates, and offers here."}
                </div>
                {miniSpotlightView.tagLabel ? (
                  <div
                    style={{
                      marginTop: isCompact ? 7 : 10,
                      color: "#F6D77A",
                      fontSize: isCompact ? 10.2 : 12,
                      fontWeight: 900,
                      lineHeight: 1.35,
                    }}
                  >
                    {miniSpotlightView.tagLabel}
                  </div>
                ) : null}
                <PrimaryButton
                  onClick={openSpotlightPreview}
                  minWidth="auto"
                  stableHeight={isCompact ? 34 : 44}
                  debugId="shop-gallery.open-spotlight-preview"
                  style={{
                    ...primaryBtn(false),
                    marginTop: isCompact ? 10 : 16,
                    borderRadius: 999,
                    minHeight: isCompact ? 34 : 44,
                    width: "fit-content",
                    maxWidth: "100%",
                    padding: isCompact ? "7px 10px" : "10px 16px",
                    fontSize: isCompact ? 11.2 : 14,
                    whiteSpace: "nowrap",
                  }}
                >
                  {miniSpotlight ? "View shop blocks" : "Open shop blocks"}
                </PrimaryButton>
              </div>
              <div
                style={{
                  minHeight: isCompact ? 112 : 178,
                  borderRadius: isCompact ? 18 : 20,
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.18)",
                }}
              >
                {miniSpotlightView.imageUrl || miniSpotlightView.videoUrl ? (
                  <SpotlightMediaFrame
                    imageUrl={miniSpotlightView.imageUrl}
                    videoUrl={miniSpotlightView.videoUrl}
                    videoPoster={miniSpotlightView.imageUrl}
                    alt={miniSpotlightView.title}
                    contentPadding={0}
                    showVideoControls={false}
                    autoPlayVideo={Boolean(miniSpotlightView.videoUrl)}
                    mutedVideo={Boolean(miniSpotlightView.videoUrl)}
                    loopVideo={Boolean(miniSpotlightView.videoUrl)}
                    showAudioUnlock={Boolean(miniSpotlightView.videoUrl)}
                    audioUnlockLabel="Sound on"
                    audioUnlockStyle={{
                      top: "auto",
                      right: isCompact ? 7 : 10,
                      bottom: isCompact ? 7 : 10,
                      minHeight: isCompact ? 28 : 34,
                      padding: isCompact ? "6px 9px" : "8px 11px",
                      fontSize: isCompact ? 10.5 : 12,
                      boxShadow: "0 10px 18px rgba(2, 12, 27, 0.22)",
                    }}
                    maxVideoSeconds={SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS}
                    frameStyle={{
                      width: "100%",
                      height: isCompact ? 112 : 178,
                      minHeight: isCompact ? 112 : 178,
                      borderRadius: isCompact ? 18 : 20,
                    }}
                    mediaStyle={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center",
                    }}
                  />
                ) : heroImage ? (
                  <img
                    src={heroImage}
                    alt={shopNameText}
                    style={{
                      width: "100%",
                      height: isCompact ? 112 : 178,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      height: isCompact ? 112 : 178,
                      display: "grid",
                      placeItems: "center",
                      color: "#D7E3F1",
                      fontWeight: 850,
                      fontSize: isCompact ? 12 : 14,
                      textAlign: "center",
                      padding: isCompact ? 10 : 16,
                    }}
                  >
                    Spotlight quiet right now
                  </div>
                )}
              </div>
            </div>
          </section>

          <section
            className="public-shop-section public-shop-vault-ad"
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: isCompact ? 20 : 26,
              padding: isCompact ? 11 : 22,
              border: "1px solid rgba(212,175,55,0.34)",
              background:
                "radial-gradient(circle at 100% 0%, rgba(212,175,55,0.28) 0%, transparent 36%), linear-gradient(145deg, #FFFFFF 0%, #FFF7DD 100%)",
              boxShadow:
                "0 22px 48px rgba(8,38,67,0.12), inset 0 1px 0 rgba(255,255,255,0.88)",
              display: "grid",
              gridTemplateColumns: isCompact ? "minmax(0, 1fr) minmax(128px, 39%)" : "minmax(0, 1fr) 230px",
              alignItems: "center",
              gap: isCompact ? 10 : 18,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ ...sectionLabel(), color: "#0B4A7A" }}>Private Vault</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: isCompact ? 15.5 : 23,
                  fontWeight: 950,
                  lineHeight: 1.15,
                }}
              >
                Private offers need a trust link.
              </div>
              <p
                style={{
                  margin: "8px 0 0",
                  color: "#425E78",
                  fontSize: isCompact ? 10 : 13.5,
                  lineHeight: 1.35,
                  fontWeight: 650,
                }}
              >
                Ask the owner if you need selected private offers. The public shop stays open below.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: isCompact ? 6 : 8,
                  marginTop: isCompact ? 9 : 16,
                }}
              >
                <PrimaryButton
                  onClick={askForVaultAccess}
                  minWidth={0}
                  stableHeight={isCompact ? 34 : 48}
                  debugId="shop-gallery.ask-vault-access"
                  style={{
                    ...primaryBtn(false),
                    minHeight: isCompact ? 34 : 48,
                    padding: isCompact ? "6px 9px" : "10px 14px",
                    borderRadius: 999,
                    fontSize: isCompact ? 9.6 : 14,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {isCompact ? "Vault access" : "Ask for Vault access"}
                </PrimaryButton>
                <SecondaryButton
                  onClick={copyShopLink}
                  minWidth={0}
                  stableHeight={isCompact ? 34 : 48}
                  debugId="shop-gallery.copy-vault-shop-link"
                  style={{
                    ...secondaryBtn(false),
                    minHeight: isCompact ? 34 : 48,
                    padding: isCompact ? "6px 9px" : "9px 12px",
                    borderRadius: 999,
                    fontSize: isCompact ? 9.6 : 14,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  Copy shop link
                </SecondaryButton>
              </div>
            </div>
            <div
              aria-hidden="true"
              style={{
                minHeight: isCompact ? 104 : 150,
                display: "grid",
                placeItems: "stretch",
                }}
              >
              <PublicVaultEmblem compact={isCompact} />
            </div>
          </section>
        </div>

        <section
          id={PUBLIC_SHOP_DIARIES_ANCHOR}
          className="public-shop-section"
          style={{
            borderRadius: isCompact ? 24 : 28,
            padding: isCompact ? 9 : 18,
            border: "1px solid rgba(13,95,168,0.18)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(239,247,253,0.96) 100%)",
            boxShadow:
              "0 24px 52px rgba(8,38,67,0.10), inset 0 1px 0 rgba(255,255,255,0.86)",
            scrollMarginTop: 12,
          }}
        >
          <div
            className="shop-diaries-header"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              alignItems: "center",
              gap: isCompact ? 8 : 12,
              marginBottom: isCompact ? 10 : 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ ...sectionLabel(), color: "#0B1F33" }}>Shop Diaries</div>
              <div
                style={{
                  marginTop: 4,
                  color: "#526C84",
                  fontSize: isCompact ? 11.5 : 13,
                  lineHeight: 1.3,
                  fontWeight: 700,
                }}
              >
                These are the 12 public blocks anyone can browse or share.
              </div>
            </div>
            <span style={badge(true)}>{shopDiaryCounterText}</span>
          </div>

          {loading ? (
            <div style={{ ...helperText(), padding: 16 }}>
              {autoRefreshingShop
                ? "Reconnecting public shop and loading Shop Diaries..."
                : "Loading shop gallery..."}
            </div>
          ) : error ? (
            <div style={{ ...innerCard("#F8FBFF") }}>
              <div style={{ color: "#0B1F33", fontWeight: 900, fontSize: 18 }}>
                Public shop could not be loaded.
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>{error}</div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                  marginTop: 14,
                }}
              >
                {ownerSessionPresent ? (
                  <PrimaryButton
                    onClick={forceOwnerReconnect}
                    fullWidth
                    stableHeight={isCompact ? 42 : 48}
                    debugId="shop-gallery.reconnect-owner-shop"
                  >
                    Reconnect my shop
                  </PrimaryButton>
                ) : (
                  <StableCtaLink
                    to={loginReconnectPath}
                    fullWidth
                    stableHeight={isCompact ? 42 : 48}
                    debugId="shop-gallery.sign-in-reconnect-shop"
                  >
                    Sign in to reconnect
                  </StableCtaLink>
                )}
                <StableCtaLink
                  to="/app/marketplace"
                  fullWidth
                  stableHeight={isCompact ? 42 : 48}
                  debugId="shop-gallery.open-marketplace-refresh"
                >
                  Open Marketplace
                </StableCtaLink>
              </div>
            </div>
          ) : visibleProducts.length === 0 ? (
            <div style={{ ...innerCard("#F8FBFF") }}>
              <div style={{ color: "#0B1F33", fontWeight: 900, fontSize: 18 }}>
                No public items are showing yet.
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Check back later or ask the owner for a private Vault link.
              </div>
            </div>
          ) : (
            <div
              className="shop-diaries-grid"
              style={{
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "repeat(2, minmax(0, 1fr))"
                  : "repeat(2, minmax(0, 1fr))",
                columnGap: isCompact ? 14 : 12,
                rowGap: isCompact ? 14 : 12,
                alignItems: "start",
                paddingInline: isCompact ? 1 : 0,
              }}
            >
              {visibleProducts.map((product, index) => {
                const rawProductImageUrl = safeStr(product.imageUrl);
                const productImageUrl = brokenProductMediaUrls[rawProductImageUrl]
                  ? ""
                  : rawProductImageUrl;
                const rawProductVideoUrl = safeStr(product.videoUrl);
                const productVideoUrl = brokenProductMediaUrls[rawProductVideoUrl]
                  ? ""
                  : rawProductVideoUrl;
                const hasVideoStory = Boolean(productVideoUrl);
                const displayTitle = productDisplayTitle(product);
                const buyerCue = productBuyerCue(
                  product,
                  firstMeaningful(product.originShopName, shopNameText)
                );
                const productOpenId = product.id ?? product.slotNumber;
                const isProductOpen = openProductId === productOpenId;
                const diaryActionHeight = isCompact ? 38 : 40;
                const diaryActionPadding = isCompact ? "7px 9px" : "8px 12px";
                const diaryActionFontSize = isCompact ? 12 : 13;
                const diaryMediaControlHeight = isCompact ? 32 : 36;

                return (
                  <article
                    key={`public-diary-${product.id || index}`}
                    className="shop-diary-card"
                    id={publicShopBlockAnchorId(product)}
                    aria-expanded={isProductOpen}
                    onClick={(event) => {
                      if (!isProductOpen) return;
                      if (isInteractiveCardTarget(event.target)) return;
                      setOpenProductId(null);
                    }}
                    onDoubleClick={(event) => {
                      if (isInteractiveCardTarget(event.target)) return;
                      event.preventDefault();
                      setOpenProductId(productOpenId);
                    }}
                    style={{
                      position: "relative",
                      borderRadius: isCompact ? 18 : 20,
                      border: "1px solid rgba(242,207,119,0.22)",
                      background: "#061827",
                      overflow: "hidden",
                      boxShadow:
                        "0 14px 26px rgba(2,12,27,0.2), inset 0 1px 0 rgba(255,255,255,0.12)",
                      width: "100%",
                      maxWidth: "100%",
                      boxSizing: "border-box",
                      isolation: "isolate",
                      overflowAnchor: "none",
                      minHeight: isProductOpen
                        ? isCompact
                          ? 430
                          : 380
                        : isCompact
                        ? 214
                        : 270,
                      aspectRatio: isProductOpen
                        ? isCompact
                          ? "1 / 1.16"
                          : "1.65 / 1"
                        : isCompact
                        ? "0.78 / 1"
                        : "1.35 / 1",
                      gridColumn: isProductOpen ? "1 / -1" : undefined,
                      cursor: isProductOpen ? "zoom-out" : "zoom-in",
                      scrollMarginTop: 18,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "#0B1F33",
                        overflow: "hidden",
                      }}
                    >
                      {hasVideoStory ? (
                        <SpotlightMediaFrame
                          key={`${productOpenId}-${isProductOpen ? "open" : "closed"}`}
                          imageUrl={productImageUrl}
                          videoUrl={productVideoUrl}
                          videoPoster={productImageUrl}
                          alt={displayTitle}
                          contentPadding={0}
                          showVideoControls={isProductOpen}
                          autoPlayVideo={!isProductOpen}
                          mutedVideo={true}
                          loopVideo={!isProductOpen}
                          showAudioUnlock={hasVideoStory}
                          audioUnlockLabel="Sound on"
                          audioUnlockStyle={{
                            top: isCompact ? 9 : 12,
                            right: isCompact ? 9 : 12,
                            minHeight: diaryMediaControlHeight,
                            padding: isCompact ? "6px 9px" : "8px 11px",
                            fontSize: isCompact ? 10.5 : 12,
                            boxShadow: "0 10px 18px rgba(2, 12, 27, 0.24)",
                            overflowAnchor: "none",
                          }}
                          maxVideoSeconds={SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS}
                          frameStyle={{
                            width: "100%",
                            height: "100%",
                            minHeight: "100%",
                            borderRadius: 0,
                            background: "#0B1F33",
                          }}
                          mediaStyle={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            objectPosition: "center",
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
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            height: "100%",
                            display: "grid",
                            placeItems: "center",
                            color: "#526C84",
                            fontWeight: 850,
                            fontSize: 12,
                            padding: 8,
                            textAlign: "center",
                          }}
                        >
                          Picture soon
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 3,
                        minWidth: 0,
                        padding: isProductOpen
                          ? isCompact
                            ? "48px 12px 12px"
                            : "56px 16px 16px"
                          : isCompact
                          ? "30px 7px 7px"
                          : "46px 14px 14px",
                        boxSizing: "border-box",
                        display: "grid",
                        gap: isProductOpen ? (isCompact ? 8 : 10) : isCompact ? 5 : 7,
                        alignContent: "end",
                        background:
                          isProductOpen
                            ? "linear-gradient(180deg, rgba(3,16,31,0.00) 0%, rgba(3,16,31,0.56) 24%, rgba(3,16,31,0.94) 100%)"
                            : "linear-gradient(180deg, rgba(3,16,31,0.00) 0%, rgba(3,16,31,0.70) 36%, rgba(3,16,31,0.94) 100%)",
                      }}
                    >
                      <div
                        style={{
                          color: "#FFFFFF",
                          fontWeight: 950,
                          fontSize: isProductOpen
                            ? isCompact
                              ? 20
                              : 22
                            : isCompact
                            ? 13
                            : 17,
                          lineHeight: 1.08,
                          display: "-webkit-box",
                          WebkitLineClamp: isProductOpen ? 2 : isCompact ? 1 : 2,
                          WebkitBoxOrient: "vertical" as any,
                          overflow: "hidden",
                        }}
                      >
                        {displayTitle}
                      </div>
                      <div
                        style={{
                          color: "rgba(255,255,255,0.78)",
                          fontWeight: 650,
                          fontSize: isProductOpen
                            ? isCompact
                              ? 13
                              : 14
                            : isCompact
                            ? 10
                            : 12.5,
                          lineHeight: 1.18,
                          display: "-webkit-box",
                          WebkitLineClamp: isProductOpen ? 3 : 1,
                          WebkitBoxOrient: "vertical" as any,
                          overflow: "hidden",
                        }}
                      >
                        {buyerCue}
                      </div>
                      <span
                        style={{
                          ...badge(true),
                          width: "fit-content",
                          maxWidth: "100%",
                          minHeight: isProductOpen
                            ? isCompact
                              ? 26
                              : 28
                            : isCompact
                            ? 22
                            : 26,
                          padding: isProductOpen
                            ? isCompact
                              ? "4px 9px"
                              : "5px 11px"
                            : isCompact
                            ? "3px 7px"
                            : "4px 9px",
                          fontSize: isProductOpen
                            ? isCompact
                              ? 12
                              : 13
                            : isCompact
                            ? 10
                            : 12,
                          whiteSpace: "nowrap",
                          background:
                            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(234,243,255,0.96) 100%)",
                        }}
                      >
                        {product.priceText}
                      </span>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                          gap: isCompact ? 8 : 10,
                          width: "100%",
                          maxWidth: "100%",
                          minWidth: 0,
                          justifyContent: "stretch",
                          justifyItems: "stretch",
                          alignItems: "center",
                          boxSizing: "border-box",
                          overflow: "hidden",
                          overflowAnchor: "none",
                        }}
                      >
                        <SecondaryButton
                          onClick={() => {
                            setOpenProductId((current) =>
                              current === productOpenId ? null : productOpenId
                            );
                          }}
                          minWidth={0}
                          stableHeight={diaryActionHeight}
                          debugId={`shop-gallery.product.${productOpenId}.toggle`}
                          style={{
                            ...secondaryBtn(false),
                            width: "100%",
                            maxWidth: "100%",
                            minWidth: 0,
                            minHeight: diaryActionHeight,
                            padding: diaryActionPadding,
                            borderRadius: 999,
                            fontSize: diaryActionFontSize,
                            lineHeight: 1,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            overflowWrap: "normal",
                            overflowAnchor: "none",
                            background:
                              "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,248,255,0.92) 100%)",
                          }}
                        >
                          {isProductOpen ? "Close" : "Open"}
                        </SecondaryButton>
                        <SecondaryButton
                          onClick={() => {
                            shareProduct(product);
                          }}
                          minWidth={0}
                          stableHeight={diaryActionHeight}
                          debugId={`shop-gallery.product.${productOpenId}.share`}
                          style={{
                            ...secondaryBtn(false),
                            width: "100%",
                            maxWidth: "100%",
                            minWidth: 0,
                            minHeight: diaryActionHeight,
                            padding: diaryActionPadding,
                            borderRadius: 999,
                            fontSize: diaryActionFontSize,
                            lineHeight: 1,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            overflowWrap: "normal",
                            overflowAnchor: "none",
                            background:
                              "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,248,255,0.92) 100%)",
                          }}
                        >
                          Share shop
                        </SecondaryButton>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {overflowProductCount > 0 ? (
            <SecondaryButton
              onClick={() => setShowAllProducts((current) => !current)}
              fullWidth
              stableHeight={48}
              debugId="shop-gallery.toggle-all-products"
              style={{
                ...secondaryBtn(false),
                width: "100%",
                marginTop: 14,
              }}
            >
              {showAllProducts ? "Show first 12 blocks" : `Show ${overflowProductCount} more`}
            </SecondaryButton>
          ) : null}
        </section>
      </section>
      </div>
    </main>
  );
}




