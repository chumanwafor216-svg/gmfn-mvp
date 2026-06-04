import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useLocation, useParams } from "react-router-dom";
import GsnInstallPrompt from "../components/GsnInstallPrompt";
import GSNBrandMark from "../components/GSNBrandMark";
import OwnerOnlySurfaceNav from "../components/OwnerOnlySurfaceNav";
import SpotlightMediaFrame from "../components/SpotlightMediaFrame";
import { PrimaryButton, SecondaryButton, StableCtaLink } from "../components/StableButton";
import {
  createMarketplaceShop,
  getAccessToken,
  getCurrentClan,
  listMyClans,
  getMe,
  getPublicMarketplaceShopByGmfnId,
  getSelectedClanId,
  safeCopy,
} from "../lib/api";
import {
  PUBLIC_SHOP_DIARIES_ANCHOR,
  publicFrontendUrl,
  publicShopPath,
  publicShopShareUrl,
  publicShopUrl,
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
  publicBlockNumber?: number;
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

function isPublicIdentityFallback(value: any): boolean {
  const text = cleanText(value);
  if (!text) return true;

  const lowered = text.toLowerCase();
  if (lowered.includes("@")) return true;
  if (/@(?:pending\.)?(?:gmfn|gmfm)\.local$/i.test(lowered)) return true;
  if (/^\+?\d[\d\s().-]{6,}$/.test(text)) return true;
  return false;
}

function publicName(...values: any[]): string {
  for (const value of values) {
    const text = cleanText(value);
    if (!text || isPublicIdentityFallback(text)) continue;
    return text;
  }
  return "";
}

function publicOwnerName(...values: any[]): string {
  return publicName(...values) || "GSN member";
}

function publicShopName(...values: any[]): string {
  return publicName(...values) || "Public GSN Shop";
}

function publicShopCategory(...values: any[]): string {
  return firstMeaningful(...values) || "General merchandise";
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

function isPublicShopBlockHash(value: string): boolean {
  const id = safeStr(value).replace(/^#/, "");
  return /^shop-block-\d{1,2}$/i.test(id) || /^product-\d+$/i.test(id);
}

function isInteractiveCardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest("button,a,input,select,textarea,[role='button']")
  );
}

function PublicVaultEmblem({ compact = false }: { compact?: boolean }) {
  const uid = compact ? "compact" : "full";

  return (
    <div
      aria-hidden="true"
      style={{
        width: "100%",
        minHeight: compact ? 92 : 132,
        aspectRatio: "1.48 / 1",
        borderRadius: compact ? 18 : 24,
        border: "1px solid rgba(255,218,132,0.74)",
        background:
          "radial-gradient(circle at 22% 18%, rgba(255,237,178,0.34) 0%, transparent 34%), linear-gradient(145deg, #041424 0%, #082A4C 56%, #03111F 100%)",
        boxShadow:
          "0 18px 36px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.13), inset 0 0 44px rgba(246,196,83,0.10)",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 320 216"
        focusable="false"
        role="presentation"
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id={`vaultBody-${uid}`} x1="38" y1="32" x2="272" y2="188" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#1B4E78" />
            <stop offset="0.38" stopColor="#071E35" />
            <stop offset="1" stopColor="#020A13" />
          </linearGradient>
          <linearGradient id={`vaultGold-${uid}`} x1="72" y1="24" x2="250" y2="194" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFF0B6" />
            <stop offset="0.33" stopColor="#E4B85D" />
            <stop offset="0.68" stopColor="#9C6A1E" />
            <stop offset="1" stopColor="#F0CA74" />
          </linearGradient>
          <radialGradient id={`vaultGlow-${uid}`} cx="52%" cy="44%" r="62%">
            <stop offset="0" stopColor="#FFE6A3" stopOpacity="0.34" />
            <stop offset="0.42" stopColor="#2F80ED" stopOpacity="0.10" />
            <stop offset="1" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
          <filter id={`vaultShadow-${uid}`} x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="16" stdDeviation="12" floodColor="#000814" floodOpacity="0.45" />
          </filter>
        </defs>
        <rect x="0" y="0" width="320" height="216" rx="30" fill={`url(#vaultGlow-${uid})`} />
        <ellipse cx="166" cy="187" rx="118" ry="18" fill="#000814" opacity="0.36" />
        <g filter={`url(#vaultShadow-${uid})`}>
          <path
            d="M64 54C64 40 76 28 90 28h128c15 0 28 12 28 28v122H82c-10 0-18-8-18-18V54Z"
            fill={`url(#vaultBody-${uid})`}
          />
          <path
            d="M84 28h132c15 0 28 12 28 28v122H84c-15 0-28-12-28-28V56c0-16 12-28 28-28Z"
            fill="none"
            stroke={`url(#vaultGold-${uid})`}
            strokeWidth="7"
          />
          <rect
            x="100"
            y="52"
            width="154"
            height="126"
            rx="20"
            fill="#071B30"
            stroke={`url(#vaultGold-${uid})`}
            strokeWidth="7"
          />
          <rect
            x="116"
            y="68"
            width="122"
            height="94"
            rx="14"
            fill="none"
            stroke="#7F682F"
            strokeWidth="2"
            opacity="0.75"
          />
          <rect x="50" y="64" width="34" height="24" rx="8" fill="#142D49" stroke="#F0CA74" strokeWidth="3" />
          <rect x="50" y="126" width="34" height="24" rx="8" fill="#142D49" stroke="#F0CA74" strokeWidth="3" />
          <rect x="80" y="67" width="22" height="18" rx="5" fill="#E8BD62" opacity="0.92" />
          <rect x="80" y="129" width="22" height="18" rx="5" fill="#E8BD62" opacity="0.92" />
          <circle cx="177" cy="115" r="36" fill="#071522" stroke={`url(#vaultGold-${uid})`} strokeWidth="8" />
          <circle cx="177" cy="115" r="10" fill="#F5D680" stroke="#805411" strokeWidth="2" />
          {Array.from({ length: 6 }).map((_, index) => {
            const angle = index * 60;
            return (
              <line
                key={angle}
                x1="177"
                y1="115"
                x2="177"
                y2="82"
                stroke="#E8BD62"
                strokeWidth="5"
                strokeLinecap="round"
                transform={`rotate(${angle} 177 115)`}
              />
            );
          })}
          {[126, 228].map((x) =>
            [74, 150].map((y) => (
              <circle
                key={`${x}-${y}`}
                cx={x}
                cy={y}
                r="6"
                fill="#F0CA74"
                stroke="#865A19"
                strokeWidth="2"
              />
            ))
          )}
          <rect x="96" y="178" width="28" height="12" rx="4" fill="#A8782D" opacity="0.85" />
          <rect x="210" y="178" width="28" height="12" rx="4" fill="#A8782D" opacity="0.85" />
        </g>
      </svg>
    </div>
  );
}

// Retained briefly as a rollback comparison for the public shop visual pass.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _ShopSignboardVisual({ compact = false }: { compact?: boolean }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: compact ? 116 : 204,
        height: compact ? 128 : 194,
        borderRadius: compact ? 24 : 34,
        position: "relative",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        border: "1px solid rgba(255,226,151,0.56)",
        background:
          "radial-gradient(circle at 34% 26%, rgba(255,224,138,0.40) 0%, transparent 34%), linear-gradient(145deg, rgba(6,24,43,0.72), rgba(8,42,76,0.94))",
        boxShadow:
          "0 24px 46px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.18)",
      }}
    >
      <span
        style={{
          position: "absolute",
          inset: compact ? 8 : 12,
          borderRadius: compact ? 20 : 28,
          border: "1px solid rgba(255,236,173,0.20)",
          boxShadow: "inset 0 0 28px rgba(255,215,118,0.10)",
        }}
      />
      <span
        style={{
          position: "absolute",
          left: compact ? 13 : 20,
          top: compact ? 14 : 22,
          width: compact ? 34 : 48,
          height: compact ? 34 : 48,
          display: "grid",
          placeItems: "center",
          borderRadius: "50%",
          background: "linear-gradient(180deg, #FFECA8 0%, #D6AA45 100%)",
          color: "#061827",
          fontSize: compact ? 13 : 17,
          fontWeight: 950,
          boxShadow: "0 10px 22px rgba(214,170,69,0.30)",
        }}
      >
        GSN
      </span>
      <span
        style={{
          position: "absolute",
          right: compact ? 12 : 20,
          bottom: compact ? 16 : 24,
          fontSize: compact ? 44 : 72,
          filter: "drop-shadow(0 14px 20px rgba(0,0,0,0.28))",
          transform: "rotate(-4deg)",
        }}
      >
        🛒
      </span>
      <span
        style={{
          position: "absolute",
          left: compact ? 32 : 50,
          bottom: compact ? 23 : 36,
          fontSize: compact ? 34 : 58,
          filter: "drop-shadow(0 12px 18px rgba(0,0,0,0.24))",
        }}
      >
        🎁
      </span>
      <GSNBrandMark width={compact ? 44 : 62} height={compact ? 58 : 82} />
    </div>
  );
}

function ReferenceShopSignboardVisual({ compact = false }: { compact?: boolean }) {
  const uid = compact ? "compact" : "full";

  return (
    <div
      aria-hidden="true"
      style={{
        width: compact ? 98 : 204,
        height: compact ? 96 : 194,
        borderRadius: compact ? 22 : 32,
        position: "relative",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        border: "1px solid rgba(255,226,151,0.66)",
        background:
          "radial-gradient(circle at 34% 30%, rgba(255,224,138,0.25) 0%, transparent 38%), linear-gradient(145deg, rgba(4,16,29,0.72), rgba(9,42,74,0.96))",
        boxShadow:
          "0 24px 46px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.16), inset 0 0 42px rgba(246,196,83,0.08)",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 260 250"
        focusable="false"
        role="presentation"
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient
            id={`shopGold-${uid}`}
            x1="28"
            y1="30"
            x2="220"
            y2="220"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#FFF1B8" />
            <stop offset="0.32" stopColor="#E4B85D" />
            <stop offset="0.72" stopColor="#9C6A1E" />
            <stop offset="1" stopColor="#F6D77A" />
          </linearGradient>
          <linearGradient
            id={`shopBlue-${uid}`}
            x1="80"
            y1="52"
            x2="182"
            y2="178"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#163E65" />
            <stop offset="0.62" stopColor="#08233A" />
            <stop offset="1" stopColor="#03111F" />
          </linearGradient>
          <radialGradient id={`shopSpark-${uid}`} cx="36%" cy="32%" r="64%">
            <stop offset="0" stopColor="#FFE8A7" stopOpacity="0.50" />
            <stop offset="0.38" stopColor="#D6AA45" stopOpacity="0.13" />
            <stop offset="1" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
          <filter id={`shopDrop-${uid}`} x="-25%" y="-25%" width="150%" height="155%">
            <feDropShadow dx="0" dy="14" stdDeviation="10" floodColor="#000814" floodOpacity="0.44" />
          </filter>
        </defs>
        <rect x="0" y="0" width="260" height="250" rx="34" fill={`url(#shopSpark-${uid})`} />
        <rect x="15" y="14" width="230" height="222" rx="30" fill="none" stroke="#F6D77A" strokeOpacity="0.32" strokeWidth="2" />
        <g filter={`url(#shopDrop-${uid})`}>
          <path
            d="M72 113c0-20 16-36 36-36h54c20 0 36 16 36 36v89H72v-89Z"
            fill={`url(#shopBlue-${uid})`}
            stroke={`url(#shopGold-${uid})`}
            strokeWidth="5"
          />
          <path
            d="M103 82c2-28 22-48 49-48 28 0 48 20 50 48"
            fill="none"
            stroke={`url(#shopGold-${uid})`}
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M126 135l8-17 8 17 18 2-13 12 4 18-17-9-16 9 3-18-13-12 18-2Z"
            fill="#F6D77A"
            stroke="#8C5A12"
            strokeWidth="2"
          />
          <path
            d="M27 178h36l8 28H39l-12-28Z"
            fill="#163E65"
            stroke={`url(#shopGold-${uid})`}
            strokeWidth="4"
          />
          <path d="M34 178h52" stroke={`url(#shopGold-${uid})`} strokeWidth="5" strokeLinecap="round" />
          <path d="M74 178l12-26h34l-9 26" fill="none" stroke={`url(#shopGold-${uid})`} strokeWidth="5" strokeLinejoin="round" />
          <circle cx="47" cy="214" r="6" fill="#E4B85D" />
          <circle cx="84" cy="214" r="6" fill="#E4B85D" />
          <rect x="40" y="150" width="36" height="36" rx="8" fill="#0A2B48" stroke="#E4B85D" strokeWidth="3" />
          <path d="M40 167h36M58 150v36" stroke="#F6D77A" strokeWidth="3" />
          <path d="M42 149l-10-12m32 12l11-12" stroke="#F6D77A" strokeWidth="4" strokeLinecap="round" />
        </g>
        {[
          [45, 58],
          [55, 76],
          [217, 76],
          [205, 58],
          [31, 104],
          [220, 150],
        ].map(([cx, cy]) => (
          <path
            key={`${cx}-${cy}`}
            d={`M${cx} ${cy - 7}l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z`}
            fill="#F6D77A"
            opacity="0.88"
          />
        ))}
      </svg>
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

  const ownerName = publicOwnerName(
    src?.owner_display_name,
    src?.owner_name,
    src?.display_name,
    src?.member_name,
    src?.name,
    src?.user_name
  );

  const shopName = publicShopName(
    src?.shop_name,
    src?.business_name,
    src?.marketplace_shop_name,
    src?.shop_display_name,
    src?.name,
    src?.display_name,
    src?.title
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
    clanId:
      positiveNumber(src?.clan_id) ||
      positiveNumber(src?.clanId) ||
      positiveNumber(src?.community_id) ||
      positiveNumber(currentClan?.id) ||
      positiveNumber(currentClan?.clan_id) ||
      positiveNumber(currentClan?.community_id) ||
      undefined,
    gmfnId: ownerGmfnId,
    ownerName,
    shopName,
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

function extractPublicBlockNumber(description: any): number {
  const match = safeStr(description).match(/^\[BLOCK:(\d{1,2})\]\s*/i);
  const blockNumber = Number(match?.[1] || 0);
  return blockNumber >= 1 && blockNumber <= GALLERY_SLOTS_TOTAL ? blockNumber : 0;
}

function publicBlockNumberFromProduct(src: any, description: any): number {
  const explicitBlockNumber = Number(
    firstMeaningful(src?.public_block_number, src?.slot_number)
  );
  if (
    explicitBlockNumber >= 1 &&
    explicitBlockNumber <= GALLERY_SLOTS_TOTAL
  ) {
    return explicitBlockNumber;
  }

  return extractPublicBlockNumber(description);
}

function stripPublicBlockNumber(description: any): string {
  return safeStr(description).replace(/^\[BLOCK:\d{1,2}\]\s*/i, "");
}

function stripProductLabel(description: any): string {
  return stripPublicBlockNumber(description).replace(/^\[LABEL:(.+?)\]\s*/i, "");
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

  const rawDescription = firstMeaningful(
    src?.description,
    src?.detail,
    src?.summary
  );
  const explicitSlotNumber = publicBlockNumberFromProduct(src, rawDescription);
  const resolvedSlotNumber = explicitSlotNumber || slotNumber;
  const description = stripProductLabel(rawDescription);

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
    slotNumber: resolvedSlotNumber,
    publicBlockNumber: explicitSlotNumber || undefined,
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

function arrangeProductsByPublicBlock(items: ShopProduct[]): ShopProduct[] {
  const slots: (ShopProduct | null)[] = Array.from(
    { length: GALLERY_SLOTS_TOTAL },
    () => null
  );
  const overflow: ShopProduct[] = [];

  items.forEach((item) => {
    const slotNumber = positiveNumber(item?.slotNumber);
    if (
      slotNumber >= 1 &&
      slotNumber <= GALLERY_SLOTS_TOTAL &&
      !slots[slotNumber - 1]
    ) {
      slots[slotNumber - 1] = item;
      return;
    }

    overflow.push(item);
  });

  overflow.forEach((item) => {
    const emptyIndex = slots.findIndex((slot) => slot === null);
    if (emptyIndex >= 0) {
      slots[emptyIndex] = {
        ...item,
        slotNumber: emptyIndex + 1,
      };
      return;
    }

    slots.push(item);
  });

  return slots.filter(Boolean) as ShopProduct[];
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
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
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
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
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
  const routeBlockNumber = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return positiveNumber(query.get("block") || query.get("slot"));
  }, [location.search]);
  const routeClanId = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return positiveNumber(
      query.get("clan_id") || query.get("community_id") || query.get("community")
    );
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
  const [publicShopVerification, setPublicShopVerification] = useState<
    Record<string, any> | null
  >(null);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(
    null
  );
  const [error, setError] = useState<string>("");
  const [autoRefreshingShop, setAutoRefreshingShop] = useState(false);
  const [shopReconnectRetryKey, setShopReconnectRetryKey] = useState(0);
  const [ownerContactPanelOpen, setOwnerContactPanelOpen] = useState(false);
  const [shopVerificationOpen, setShopVerificationOpen] = useState(false);
  const [shopVerificationQrOpen, setShopVerificationQrOpen] = useState(false);
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
          id: positiveNumber(
            publicShopRes?.verification?.community_id ||
              publicShopRes?.clan_id ||
              publicShopRes?.community_id ||
              clanRes?.id ||
              clanRes?.clan_id ||
              clanRes?.community_id
          ),
          clan_id: positiveNumber(
            publicShopRes?.verification?.community_id ||
              publicShopRes?.clan_id ||
              publicShopRes?.community_id ||
              clanRes?.id ||
              clanRes?.clan_id ||
              clanRes?.community_id
          ),
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
      const arrangedProducts = arrangeProductsByPublicBlock(normalizedProducts);

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
      setPublicShopVerification(publicShopRes?.verification || null);
      setProducts(arrangedProducts);
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
        clan_id: routeClanId > 0 ? routeClanId : undefined,
        product_id: routeProductId > 0 ? routeProductId : undefined,
        product_limit: 100,
        broadcast_limit: 24,
      });

      return publicShopRes;
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
  }, [gmfnId, routeClanId, routeProductId, shopReconnectRetryKey]);

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
    if (!location.hash && routeProductId <= 0 && routeBlockNumber <= 0) return;
    if (loading) return;

    const id = location.hash.replace(/^#/, "");
    const shouldRevealProduct = id !== PUBLIC_SHOP_DIARIES_ANCHOR;
    const matchedProduct = shouldRevealProduct
      ? products.find((product) => {
          return routeProductId > 0 && product.id === routeProductId;
        }) ||
        products.find((product) => {
          return (
            routeBlockNumber > 0 &&
            positiveNumber(product.slotNumber) === routeBlockNumber
          );
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
    } else if (id) {
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
    routeBlockNumber,
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

    const effectiveOwnerName = publicOwnerName(
      shop?.ownerName,
      broadcast?.authorName
    );

    const effectiveShopName = publicShopName(
      shop?.shopName,
      broadcast?.sourceShopName
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

  const focusedBlockLinkActive = useMemo(() => {
    return (
      routeProductId > 0 ||
      routeBlockNumber > 0 ||
      isPublicShopBlockHash(location.hash)
    );
  }, [location.hash, routeBlockNumber, routeProductId]);

  const focusedBlockProduct = useMemo(() => {
    if (!focusedBlockLinkActive) return null;

    const hashId = safeStr(location.hash).replace(/^#/, "");
    return (
      products.find((product) => routeProductId > 0 && product.id === routeProductId) ||
      products.find(
        (product) =>
          routeBlockNumber > 0 &&
          positiveNumber(product.slotNumber) === routeBlockNumber
      ) ||
      products.find(
        (product) =>
          hashId === publicShopBlockAnchorId(product) ||
          hashId === legacyProductAnchorId(product)
      ) ||
      null
    );
  }, [focusedBlockLinkActive, location.hash, products, routeBlockNumber, routeProductId]);

  const visibleProducts = useMemo(() => {
    if (focusedBlockLinkActive) return focusedBlockProduct ? [focusedBlockProduct] : [];
    return showAllProducts ? products : products.slice(0, GALLERY_SLOTS_TOTAL);
  }, [focusedBlockLinkActive, focusedBlockProduct, products, showAllProducts]);

  const overflowProductCount = focusedBlockLinkActive
    ? 0
    : Math.max(0, products.length - GALLERY_SLOTS_TOTAL);

  const heroImage = useMemo(() => {
    return effectiveShop?.imageUrl || "";
  }, [effectiveShop]);

  const miniSpotlight = useMemo(() => {
    if (communitySpotlights.length === 0) return null;
    return communitySpotlights[miniSpotlightIndex % communitySpotlights.length] || communitySpotlights[0];
  }, [communitySpotlights, miniSpotlightIndex]);

  const miniSpotlightView = useMemo(() => {
    const currentShopGmfnId = firstMeaningful(effectiveShop?.gmfnId).toUpperCase();
    if (!miniSpotlight) {
      return {
        title: "Discover what's new",
        detail: "No live community spotlight is attached to this shop context yet.",
        tagLabel: "",
        communityName: firstMeaningful(effectiveShop?.communityName),
        trustBand: "Community spotlight",
        createdAt: "",
        createdLabel: "",
        imageUrl: "",
        videoUrl: "",
        shopTo: "",
        communityTo: "",
        isCurrentShop: true,
        shopLabel: "Shop",
        communityLabel: "Community",
        helperLine:
          "Spotlight is now rendered only from the backend community spotlight contract.",
      };
    }

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

  const publicShopSpotlightActive = Boolean(miniSpotlight);

  const absoluteShopLink = useMemo(() => {
    const ownerId = firstMeaningful(effectiveShop?.gmfnId, gmfnId);
    return ownerId ? publicShopUrl(ownerId) : "";
  }, [effectiveShop?.gmfnId, gmfnId]);

  const absoluteShopShareLink = useMemo(() => {
    const ownerId = firstMeaningful(effectiveShop?.gmfnId, gmfnId);
    return ownerId ? publicShopShareUrl({ gmfnId: ownerId }) : "";
  }, [effectiveShop?.gmfnId, gmfnId]);

  const shopRootPath = useMemo(() => {
    const ownerId = firstMeaningful(effectiveShop?.gmfnId, gmfnId);
    return ownerId ? publicShopPath(ownerId) : "";
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
  const memberSurfaceLinks = useMemo(
    () => [
      {
        label: "Dashboard",
        to: APP_ROUTES.DASHBOARD,
        debugId: "shop-gallery.member-nav.dashboard",
      },
      {
        label: "Community Home",
        to: routeWithCommunity(APP_ROUTES.COMMUNITY, ownerSurfaceCommunityId),
        debugId: "shop-gallery.member-nav.community",
      },
      {
        label: "Marketplace",
        to: routeWithCommunity(APP_ROUTES.MARKETPLACE, ownerSurfaceCommunityId),
        debugId: "shop-gallery.member-nav.marketplace",
      },
      {
        label: "Paid Repost",
        to: routeWithCommunity(
          `${APP_ROUTES.MARKETPLACE}#marketplace-paid-network-placement`,
          ownerSurfaceCommunityId
        ),
        debugId: "shop-gallery.member-nav.paid-placement",
      },
      {
        label: "My Shop",
        to: routeWithCommunity(APP_ROUTES.SHOP_ME, ownerSurfaceCommunityId),
        debugId: "shop-gallery.member-nav.my-shop",
      },
    ],
    [ownerSurfaceCommunityId]
  );
  const loginReconnectPath = `/login?next=${encodeURIComponent(
    publicShopReturnPath
  )}`;
  const shopNameText = safeStr(effectiveShop?.shopName || "Shop");
  const shopCategoryText = publicShopCategory();
  const shopDescriptionText = safeStr(
    autoRefreshingShop
      ? "This public shop link is reconnecting to the owner's active shop so Shop Diaries can load."
      : shopLoadFailed
      ? "This public shop link has reached the shop page, but the backend has not connected it to an active owner shop yet."
      : effectiveShop?.description ||
          "Public shop face for trusted products. Private Vault offers open only through a trust link."
  );
  const showShopHeroDescription =
    Boolean(shopDescriptionText) &&
    shopDescriptionText.toLowerCase() !== shopCategoryText.toLowerCase();
  const shopGmfnText = safeStr(effectiveShop?.gmfnId);
  const shopCommunityText = safeStr(effectiveShop?.communityName);
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
  const verificationCommunityId = firstMeaningful(
    publicShopVerification?.community_id,
    effectiveShop?.clanId
  );
  const shopCommunityIdText = safeStr(verificationCommunityId);
  const shopCommunityVerifyPath = firstMeaningful(
    publicShopVerification?.community_verify_path,
    shopCommunityIdText
      ? `/verify/community/${encodeURIComponent(shopCommunityIdText)}`
      : ""
  );
  const verificationPublicShopPath = firstMeaningful(
    publicShopVerification?.public_shop_path,
    shopRootPath
  );
  const verificationScanKind = safeStr(publicShopVerification?.scan_kind).toLowerCase();
  const shopPublicQrTarget = verificationPublicShopPath
    ? publicFrontendUrl(verificationPublicShopPath)
    : "";
  const shopVerificationQrKind =
    verificationScanKind === "community" && shopCommunityVerifyPath
      ? "community"
      : verificationScanKind === "shop" && shopPublicQrTarget
      ? "shop"
      : shopCommunityVerifyPath
      ? "community"
      : shopPublicQrTarget
      ? "shop"
      : "";
  const verificationPrimaryScanPath = firstMeaningful(
    publicShopVerification?.primary_scan_path,
    shopVerificationQrKind === "community"
      ? shopCommunityVerifyPath
      : verificationPublicShopPath
  );
  const shopVerificationQrTarget = verificationPrimaryScanPath
    ? publicFrontendUrl(verificationPrimaryScanPath)
    : "";
  const shopVerificationStatusText = shopVerificationQrKind === "community"
    ? "Community record ready"
    : shopVerificationQrKind === "shop"
    ? "Public shop QR ready"
    : "Trust proof on request";
  const shopVerificationQrLabel = shopVerificationQrKind === "community"
    ? "Scan community record"
    : shopVerificationQrKind === "shop"
    ? "Scan public shop"
    : "Public shop QR is not ready";
  const shopVerificationScanButtonText = shopVerificationQrKind === "community"
    ? shopVerificationQrOpen
      ? "Hide scan"
      : "Show community scan"
    : shopVerificationQrKind === "shop"
    ? shopVerificationQrOpen
      ? "Hide scan"
      : "Show shop scan"
    : "Scan not ready";
  const shopVerificationRows = [
    { icon: "🏪", label: "Shop name", value: shopNameText },
    { icon: "🪪", label: "Shop owner ID", value: shopGmfnText || "Not ready" },
    { icon: "🌍", label: "Marketplace", value: shopLocationText },
    { icon: "👥", label: "Community", value: shopCommunityText || "Not exposed yet" },
    { icon: "🔐", label: "Community ID", value: shopCommunityIdText || "Not exposed yet" },
  ];
  const shopTrustCheckOptions = [
    { icon: "📄", text: "Request TrustSlip for live proof" },
    { icon: "👥", text: "Ask community for extra confirmation" },
    { icon: "🔎", text: "Use IDs to avoid name confusion" },
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
        : "Clipboard copy was blocked. Use Share, or copy the page address from your browser.",
    });
  }

  function shareShop() {
    if (shopLoadFailed) {
      setNotice({
        tone: "error",
        text: "This public shop link is not active yet. Ask the owner to refresh the shop link from Marketplace before sharing it.",
      });
      return;
    }

    if (!absoluteShopShareLink) {
      setNotice({ tone: "error", text: "Public shop link is not ready yet." });
      return;
    }

    const shopTitle = firstMeaningful(
      effectiveShop?.shopName,
      effectiveShop?.ownerName,
      "GSN public shop"
    );

    void shareOrCopy({
      title: shopTitle,
      text: "Trusted marketplace. Real people. Real value.",
      url: absoluteShopShareLink,
      successText: "Public shop share ready.",
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
      text: `${blockLabel}\n${text}\n${product.priceText}\nFrom ${shopContext}.\nOpen this public shop block directly.`,
      url: productUrl,
      successText: `${blockLabel} share ready. This link opens that block directly.`,
    });
  }

  function contactOwnerAboutProduct(product: ShopProduct) {
    const productTitle = productDisplayTitle(product);
    const blockLabel = publicShopBlockLabel(product);
    const message = `Hello, I am asking about ${productTitle} (${blockLabel}) in your GSN public shop.`;

    if (openOwnerWhatsAppChat(message, "Owner WhatsApp opened for this shop block.")) {
      return;
    }

    setNotice({
      tone: "error",
      text: "Owner WhatsApp is not ready for this shop block. Use the main WhatsApp button near the shop signboard.",
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

  function toggleShopVerificationPanel() {
    setOwnerContactPanelOpen(false);
    setShopVerificationOpen((open) => {
      const nextOpen = !open;
      if (!nextOpen) setShopVerificationQrOpen(false);
      return nextOpen;
    });
  }

  function toggleOwnerContactPanel() {
    if (shopLoadFailed) {
      setNotice({
        tone: "error",
        text: "This shop link needs the owner to refresh it from Marketplace before owner contact can be trusted.",
      });
      return;
    }

    setShopVerificationOpen(false);
    setShopVerificationQrOpen(false);
    setOwnerContactPanelOpen((open) => !open);
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

  async function requestShopTrustSlip() {
    const shopTitle = firstMeaningful(
      effectiveShop?.shopName,
      effectiveShop?.ownerName,
      "this GSN shop"
    );
    const proofContext = firstMeaningful(
      shopVerificationQrTarget,
      absoluteShopShareLink,
      absoluteShopLink
    );
    const message = `Hello, I am checking ${shopTitle} on GSN. Please send the current TrustSlip or merchant verification proof for this shop owner (${shopGmfnText || "owner ID not visible yet"}).`;

    if (
      openOwnerWhatsAppChat(
        message,
        "WhatsApp opened. Ask the owner for the current TrustSlip or merchant verification proof."
      )
    ) {
      return;
    }

    const copied = await safeCopy(`${message}\n${proofContext}`);
    setNotice({
      tone: copied ? "success" : "error",
      text: copied
        ? "TrustSlip request copied. Send it to the shop owner."
        : "Owner WhatsApp is not ready and clipboard copy was blocked.",
    });
  }

  async function requestCommunityConfirmationFromOwner() {
    const shopTitle = firstMeaningful(
      effectiveShop?.shopName,
      effectiveShop?.ownerName,
      "this GSN shop"
    );
    const communityLabel = firstMeaningful(
      shopCommunityText,
      shopLocationText,
      "this community"
    );
    const message = `Hello, I am checking ${shopTitle} on GSN. Please connect me with the right community confirmation route for ${communityLabel}, or send the current community verification link for this shop owner (${shopGmfnText || "owner ID not visible yet"}).`;
    const proofContext = firstMeaningful(
      shopCommunityVerifyPath ? publicFrontendUrl(shopCommunityVerifyPath) : "",
      absoluteShopShareLink,
      absoluteShopLink
    );

    if (
      openOwnerWhatsAppChat(
        message,
        "WhatsApp opened. Ask the owner for the community confirmation route."
      )
    ) {
      return;
    }

    const copied = await safeCopy(`${message}\n${proofContext}`);
    setNotice({
      tone: copied ? "success" : "error",
      text: copied
        ? "Community confirmation request copied. Send it to the shop owner."
        : "Owner WhatsApp is not ready and clipboard copy was blocked.",
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
        label="Public Shop shortcuts"
        ariaLabel="Public Shop signed-in shortcuts"
        links={memberSurfaceLinks}
        refreshKey={shopReconnectRetryKey}
        requireOwnerMatch={false}
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
          className="public-shop-brandbar"
          style={{
            display: "grid",
            gridTemplateColumns: "auto minmax(0, 1fr)",
            alignItems: "center",
            gap: isCompact ? 12 : 16,
            color: "#FFFFFF",
            padding: isCompact ? "6px 8px 8px" : "8px 12px 10px",
            borderRadius: isCompact ? 18 : 22,
            background:
              "linear-gradient(90deg, rgba(255,232,160,0.08) 0%, rgba(255,255,255,0.03) 54%, rgba(23,92,168,0.10) 100%)",
            border: "1px solid rgba(255,232,160,0.18)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: isCompact ? 44 : 54,
              height: isCompact ? 44 : 54,
              borderRadius: isCompact ? 14 : 16,
              display: "grid",
              placeItems: "center",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,232,160,0.34)",
              boxShadow:
                "0 12px 24px rgba(0,0,0,0.24), 0 0 18px rgba(47,128,237,0.12), inset 0 1px 0 rgba(255,255,255,0.14)",
              overflow: "hidden",
            }}
          >
            <GSNBrandMark width={isCompact ? 27 : 34} height={isCompact ? 34 : 42} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: isCompact ? 20 : 26,
                fontWeight: 950,
                lineHeight: 1,
                letterSpacing: 0,
              }}
            >
              GSN
            </div>
            <div
              style={{
                marginTop: 3,
                color: "rgba(255,255,255,0.84)",
                fontSize: isCompact ? 11.5 : 14,
                fontWeight: 760,
                lineHeight: 1.25,
              }}
            >
              Trusted marketplace. Real people. Real value.
            </div>
          </div>
        </div>

        <section
          className="public-shop-signboard"
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: isCompact ? 22 : 30,
            padding: isCompact ? "14px 13px 13px" : "26px 28px 24px",
            border: "1px solid rgba(246,196,83,0.72)",
            background:
              "radial-gradient(circle at 14% 8%, rgba(246,196,83,0.22) 0%, transparent 26%), radial-gradient(circle at 92% 0%, rgba(37,99,235,0.26) 0%, transparent 34%), linear-gradient(145deg, #06182B 0%, #082A4C 54%, #031424 100%)",
            boxShadow:
              "0 28px 70px rgba(2,12,27,0.34), inset 0 1px 0 rgba(255,255,255,0.14)",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "repeating-linear-gradient(135deg, transparent 0 34px, rgba(255,255,255,0.024) 34px 35px), radial-gradient(circle at 56% 4%, rgba(255,255,255,0.10) 0%, transparent 42%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "220px minmax(0, 1fr)",
              alignItems: "center",
              justifyItems: isCompact ? "center" : "stretch",
              gap: isCompact ? 12 : 22,
            }}
          >
            <ReferenceShopSignboardVisual compact={isCompact} />
            <div
              style={{
                display: "grid",
                gap: isCompact ? 8 : 10,
                minWidth: 0,
                width: "100%",
                justifySelf: "stretch",
              }}
            >
              <h1
                style={{
                  margin: 0,
                  color: "#F6D77A",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: isCompact ? 26 : 46,
                  lineHeight: 0.96,
                  fontWeight: 950,
                  textTransform: "uppercase",
                  letterSpacing: 0,
                  textShadow:
                    "0 2px 0 rgba(255,255,255,0.10), 0 12px 30px rgba(0,0,0,0.40)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical" as any,
                }}
              >
                {shopNameText}
              </h1>
              <div
                style={{
                  width: "fit-content",
                  maxWidth: "100%",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  minHeight: isCompact ? 28 : 34,
                  padding: isCompact ? "5px 9px" : "7px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.24)",
                  background: "rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.88)",
                  fontSize: isCompact ? 11 : 13,
                  fontWeight: 850,
                  overflow: "hidden",
                }}
              >
                <span aria-hidden="true">🏷️</span>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {shopCategoryText}
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gap: 0,
                  borderRadius: isCompact ? 15 : 18,
                  border: "1px solid rgba(255,232,160,0.26)",
                  background: "rgba(3,20,36,0.34)",
                  overflow: "hidden",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
                }}
              >
                {[
                  { icon: "🪪", label: "GMFN ID", value: shopGmfnText || "Not ready" },
                  { icon: "👥", label: "Homeland", value: shopLocationText },
                ].map((row, rowIndex) => (
                  <div
                    key={row.label}
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "24px minmax(0, 1fr)"
                        : "34px minmax(0, 1fr)",
                      gap: isCompact ? 6 : 10,
                      alignItems: "center",
                      minWidth: 0,
                      padding: isCompact ? "8px 9px" : "10px 12px",
                      borderTop:
                        rowIndex > 0 ? "1px solid rgba(255,255,255,0.10)" : "none",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        display: "grid",
                        placeItems: "center",
                        width: isCompact ? 22 : 28,
                        height: isCompact ? 22 : 28,
                        borderRadius: 8,
                        background: "rgba(246,215,122,0.15)",
                        color: "#F6D77A",
                        fontSize: isCompact ? 13 : 16,
                      }}
                    >
                      {row.icon}
                    </span>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 5,
                        alignItems: "baseline",
                        minWidth: 0,
                        color: "rgba(255,255,255,0.86)",
                        fontSize: isCompact ? 11.2 : 13.5,
                        fontWeight: 760,
                        lineHeight: 1.22,
                      }}
                      title={row.value}
                    >
                      <span style={{ color: "rgba(255,236,173,0.88)" }}>
                        {row.label === "Homeland"
                          ? "Community"
                          : row.label === "GMFN ID"
                          ? "GSN Global ID"
                          : row.label}
                        :
                      </span>
                      <strong
                        style={{
                          color: row.label === "Homeland" ? "#F6D77A" : "#FFFFFF",
                          minWidth: 0,
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                        }}
                      >
                        {row.value}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
              {showShopHeroDescription ? (
                <p
                  style={{
                    margin: 0,
                    color: "rgba(255,255,255,0.76)",
                    fontSize: isCompact ? 11.2 : 13.5,
                    lineHeight: 1.35,
                    maxWidth: 720,
                    display: "-webkit-box",
                    WebkitLineClamp: isCompact ? 2 : 2,
                    WebkitBoxOrient: "vertical" as any,
                    overflow: "hidden",
                  }}
                >
                  {shopDescriptionText}
                </p>
              ) : null}
            </div>
          </div>
          <div
            className="public-shop-action-row"
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: isCompact
                ? "repeat(3, minmax(0, 1fr))"
                : "repeat(3, minmax(0, 1fr))",
              gap: isCompact ? 6 : 10,
              marginTop: isCompact ? 13 : 18,
            }}
            aria-label="Public shop actions"
          >
            <PrimaryButton
              onClick={shareShop}
              minWidth={0}
              fullWidth
              stableHeight={isCompact ? 46 : 54}
              debugId="shop-gallery.share-shop"
              style={{
                ...primaryBtn(shopLoadFailed),
                minHeight: isCompact ? 46 : 54,
                borderRadius: isCompact ? 13 : 15,
                fontSize: isCompact ? 12 : 14,
                padding: isCompact ? "8px 6px" : "10px 12px",
                gap: 7,
              }}
            >
              <span aria-hidden="true">🔗</span>
              <span>Share</span>
            </PrimaryButton>
            <SecondaryButton
              onClick={toggleShopVerificationPanel}
              minWidth={0}
              fullWidth
              stableHeight={isCompact ? 46 : 54}
              debugId="shop-gallery.verify-shop.toggle"
              aria-expanded={shopVerificationOpen}
              aria-controls="public-shop-verify-panel"
              style={{
                ...secondaryBtn(false),
                minHeight: isCompact ? 46 : 54,
                borderRadius: isCompact ? 13 : 15,
                fontSize: isCompact ? 12 : 14,
                padding: isCompact ? "8px 6px" : "10px 12px",
                color: "#FFFFFF",
                border: "1px solid rgba(255,255,255,0.22)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.08) 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14)",
                gap: 7,
              }}
            >
              <span aria-hidden="true">🛡️</span>
              <span>Verify</span>
            </SecondaryButton>
            <PrimaryButton
              onClick={toggleOwnerContactPanel}
              minWidth={0}
              fullWidth
              stableHeight={isCompact ? 46 : 54}
              debugId="shop-gallery.owner-contact.choose"
              aria-expanded={ownerContactPanelOpen}
              aria-controls="public-shop-owner-contact-panel"
              style={{
                ...primaryBtn(false),
                minHeight: isCompact ? 46 : 54,
                borderRadius: isCompact ? 13 : 15,
                fontSize: isCompact ? 12 : 14,
                padding: isCompact ? "8px 6px" : "10px 12px",
                background:
                  "linear-gradient(180deg, #25D366 0%, #128C4A 100%)",
                border: "1px solid rgba(37,211,102,0.38)",
                gap: 7,
              }}
            >
              <span aria-hidden="true">💬</span>
              <span>WhatsApp</span>
            </PrimaryButton>
          </div>
        </section>

        <div
          className="public-shop-status-strip"
          style={{
            display: "grid",
            gridTemplateColumns: isCompact
              ? "repeat(4, minmax(0, 1fr))"
              : "repeat(4, minmax(0, 1fr))",
            gap: 0,
            borderRadius: isCompact ? 16 : 18,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.88)",
            background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
            boxShadow:
              "0 18px 36px rgba(8,38,67,0.13), inset 0 1px 0 rgba(255,255,255,0.90)",
          }}
        >
          {[
            {
              mark: "🛡️",
              title: "Community Checked",
              detail: shopCommunityIdText ? "Member review" : "Record pending",
            },
            { mark: "🌐", title: "Public Shelf", detail: publicBlockText },
            { mark: "🔒", title: "Private Vault", detail: "By trust link" },
            { mark: "🏅", title: "Trust Identity", detail: "GSN ID visible" },
          ].map((item, itemIndex) => {
            const statusItemStyle: React.CSSProperties = {
                minHeight: isCompact ? 58 : 76,
                padding: isCompact ? "7px 5px" : "12px 14px",
                borderRight:
                  itemIndex < 3 ? "1px solid rgba(13,95,168,0.12)" : "none",
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "44px minmax(0, 1fr)",
                alignItems: "center",
                justifyItems: isCompact ? "center" : "stretch",
                gap: isCompact ? 4 : 10,
                textAlign: isCompact ? "center" : "left",
                minWidth: 0,
              };
            const statusItemContent = (
              <>
                <div
                  style={{
                    width: isCompact ? 28 : 50,
                    height: isCompact ? 28 : 50,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    background: "linear-gradient(180deg, #EEF6FF 0%, #FFFFFF 100%)",
                    color: "#0B4A7A",
                    boxShadow:
                      "0 8px 18px rgba(8,38,67,0.10), inset 0 1px 0 rgba(255,255,255,0.85)",
                    fontSize: isCompact ? 16 : 21,
                    border: "1px solid rgba(13,95,168,0.10)",
                  }}
                >
                  {item.mark}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      color: "#0B1F33",
                      fontWeight: 950,
                      fontSize: isCompact ? 9.4 : 14,
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
                      fontSize: isCompact ? 8.2 : 11.5,
                      lineHeight: 1.1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: isCompact ? 2 : 1,
                      WebkitBoxOrient: "vertical" as any,
                    }}
                  >
                    {item.detail}
                  </div>
                </div>
              </>
            );

            return (
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

        {shopVerificationOpen ? (
          <section
            className="public-shop-section public-shop-verify"
            style={{
              ...innerCard("#061827"),
              position: "relative",
              overflow: "hidden",
              display: "grid",
              gap: isCompact ? 11 : 14,
              padding: isCompact ? 16 : 22,
              border: "1px solid rgba(246,196,83,0.44)",
              background:
                "radial-gradient(circle at 92% 12%, rgba(246,196,83,0.22) 0%, transparent 36%), radial-gradient(circle at 12% 8%, rgba(47,128,237,0.18) 0%, transparent 32%), linear-gradient(145deg, #061827 0%, #082A4C 100%)",
              boxShadow:
                "0 24px 54px rgba(2,12,27,0.30), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
            aria-label="Shop verification summary"
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                right: isCompact ? -32 : -14,
                top: isCompact ? 62 : 42,
                opacity: 0.12,
                transform: "rotate(-7deg)",
                pointerEvents: "none",
              }}
            >
              <GSNBrandMark width={isCompact ? 150 : 210} height={isCompact ? 190 : 270} />
            </div>
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "repeating-linear-gradient(135deg, transparent 0 35px, rgba(255,255,255,0.025) 35px 36px)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "relative",
                display: "grid",
                gridTemplateColumns: isCompact ? "42px minmax(0, 1fr)" : "64px minmax(0, 1fr) 140px",
                gap: isCompact ? 9 : 12,
                alignItems: "start",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: isCompact ? 42 : 58,
                  height: isCompact ? 42 : 58,
                  borderRadius: isCompact ? 14 : 18,
                  display: "grid",
                  placeItems: "center",
                  color: "#F6D77A",
                  background:
                    "linear-gradient(145deg, rgba(255,236,173,0.18), rgba(47,128,237,0.16))",
                  border: "1px solid rgba(246,215,122,0.34)",
                  fontSize: isCompact ? 24 : 32,
                  boxShadow: "0 14px 28px rgba(0,0,0,0.24)",
                }}
              >
                🛡️
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ ...sectionLabel(), color: "#F6D77A" }}>
                  Shop verification
                </div>
                <div
                  style={{
                    marginTop: 5,
                    color: "#FFFFFF",
                    fontSize: isCompact ? 18 : 24,
                    fontWeight: 950,
                    lineHeight: 1.16,
                  }}
                >
                  Verify this shop before you trade.
                </div>
                <div
                  style={{
                    marginTop: 5,
                    color: "rgba(255,255,255,0.76)",
                    fontSize: isCompact ? 10.8 : 12.8,
                    lineHeight: 1.35,
                    fontWeight: 720,
                  }}
                >
                  Community membership and shop IDs are visible here. Request a
                  live TrustSlip when you need fresh proof from the owner.
                </div>
              </div>

              <SecondaryButton
                onClick={toggleShopVerificationPanel}
                minWidth={0}
                stableHeight={isCompact ? 40 : 46}
                debugId="shop-gallery.verify-shop.close"
                aria-expanded={shopVerificationOpen}
                aria-controls="public-shop-verify-panel"
                style={{
                  ...secondaryBtn(false),
                  minHeight: isCompact ? 40 : 46,
                  borderRadius: isCompact ? 13 : 14,
                  fontSize: isCompact ? 11.2 : 13.5,
                  color: "#FFFFFF",
                  border: "1px solid rgba(255,255,255,0.22)",
                  background: "rgba(255,255,255,0.08)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {isCompact ? "Hide" : "Hide proof"}
              </SecondaryButton>
            </div>

            <div
              style={{
                position: "relative",
                justifySelf: "center",
                width: "fit-content",
                maxWidth: "100%",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                minHeight: isCompact ? 36 : 42,
                padding: isCompact ? "7px 13px" : "8px 17px",
                borderRadius: 999,
                color: shopVerificationQrTarget ? "#86EFAC" : "#FDE68A",
                background: shopVerificationQrTarget
                  ? "rgba(34,197,94,0.15)"
                  : "rgba(246,196,83,0.15)",
                border: shopVerificationQrTarget
                  ? "1px solid rgba(34,197,94,0.32)"
                  : "1px solid rgba(246,196,83,0.30)",
                boxShadow: "0 12px 24px rgba(0,0,0,0.18)",
                fontSize: isCompact ? 13 : 15,
                fontWeight: 950,
              }}
            >
              <span aria-hidden="true">{shopVerificationQrTarget ? "✅" : "🟡"}</span>
              <span>{shopVerificationStatusText}</span>
            </div>

            <div
              id="public-shop-verify-panel"
              style={{
                position: "relative",
                display: "grid",
                gridTemplateColumns:
                  isCompact || !shopVerificationQrOpen
                    ? "1fr"
                    : "178px minmax(0, 1fr)",
                gap: isCompact ? 10 : 14,
                alignItems: "stretch",
                borderRadius: isCompact ? 20 : 24,
                border: "1px solid rgba(246,196,83,0.34)",
                background: "rgba(3,20,36,0.48)",
                padding: isCompact ? 11 : 14,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              {shopVerificationQrOpen ? (
                <div
                  style={{
                    minHeight: isCompact ? 132 : 148,
                    borderRadius: isCompact ? 14 : 16,
                    border: "1px solid rgba(246,196,83,0.28)",
                    background:
                      "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)",
                    display: "grid",
                    placeItems: "center",
                    padding: isCompact ? 10 : 12,
                  }}
                >
                  {shopVerificationQrTarget ? (
                    <div style={{ display: "grid", gap: 7, justifyItems: "center" }}>
                      <QRCodeSVG
                        value={shopVerificationQrTarget}
                        size={isCompact ? 106 : 126}
                        marginSize={1}
                        fgColor="#07172C"
                        bgColor="#FFFFFF"
                      />
                      <span
                        style={{
                          color: "#526C84",
                          fontSize: isCompact ? 9.4 : 10.4,
                          fontWeight: 850,
                          textAlign: "center",
                          lineHeight: 1.2,
                        }}
                      >
                        {shopVerificationQrLabel}
                      </span>
                    </div>
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
                      {shopVerificationQrLabel}
                    </span>
                  )}
                </div>
              ) : null}

              <div
                style={{
                  display: "grid",
                  gap: isCompact ? 8 : 9,
                  alignContent: "start",
                }}
              >
                {shopVerificationRows.map((row) => (
                  <div
                    key={row.label}
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "42px minmax(0, 1fr)"
                        : "54px minmax(0, 1fr)",
                      gap: isCompact ? 8 : 10,
                      alignItems: "center",
                      borderRadius: isCompact ? 14 : 16,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(234,243,255,0.08)",
                      padding: isCompact ? "8px 9px" : "10px 12px",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: isCompact ? 36 : 44,
                        height: isCompact ? 36 : 44,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        color: "#F6D77A",
                        background: "rgba(255,255,255,0.10)",
                        border: "1px solid rgba(246,196,83,0.16)",
                        fontSize: isCompact ? 18 : 22,
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
                      }}
                    >
                      {row.icon}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          color: "rgba(255,236,173,0.82)",
                          fontSize: isCompact ? 10 : 11.5,
                          fontWeight: 850,
                          lineHeight: 1.15,
                        }}
                      >
                        <span aria-hidden="true" style={{ fontSize: isCompact ? 10 : 12 }}>
                          {row.icon}
                        </span>
                        <span>{row.label}</span>
                      </div>
                      <div
                        style={{
                          marginTop: 3,
                          color: "#FFFFFF",
                          fontSize: isCompact ? 12.4 : 14.5,
                          fontWeight: 950,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={row.value}
                      >
                        {row.value}
                      </div>
                    </div>
                  </div>
                ))}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    color: "rgba(246,215,122,0.86)",
                    fontSize: isCompact ? 10.4 : 12,
                    fontWeight: 760,
                    lineHeight: 1.3,
                    padding: isCompact ? "2px 2px 0" : "3px 4px 0",
                  }}
                >
                  <span aria-hidden="true">ⓘ</span>
                  <span>Community ID confirms the exact community.</span>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "1.2fr 1fr 1fr",
                gap: isCompact ? 8 : 10,
              }}
            >
              <PrimaryButton
                onClick={() => void requestShopTrustSlip()}
                minWidth={0}
                fullWidth
                stableHeight={isCompact ? 44 : 50}
                debugId="shop-gallery.verify-shop.request-trustslip"
                style={{
                  ...primaryBtn(false),
                  minHeight: isCompact ? 44 : 50,
                  borderRadius: isCompact ? 13 : 14,
                  fontSize: isCompact ? 12 : 14,
                  background:
                    "linear-gradient(180deg, #F8D36A 0%, #D6AA45 100%)",
                  color: "#07172C",
                }}
              >
                Request TrustSlip
              </PrimaryButton>
              <SecondaryButton
                onClick={() => setShopVerificationQrOpen((open) => !open)}
                disabled={!shopVerificationQrTarget}
                fullWidth
                minWidth={0}
                stableHeight={isCompact ? 44 : 50}
                debugId="shop-gallery.verify-shop.toggle-scan"
                style={{
                  ...secondaryBtn(!shopVerificationQrTarget),
                  minHeight: isCompact ? 44 : 50,
                  borderRadius: isCompact ? 13 : 14,
                  fontSize: isCompact ? 12 : 14,
                  color: "#FFFFFF",
                  border: "1px solid rgba(255,255,255,0.22)",
                  background: "rgba(255,255,255,0.08)",
                }}
              >
                {shopVerificationScanButtonText}
              </SecondaryButton>
              <SecondaryButton
                onClick={() => void requestCommunityConfirmationFromOwner()}
                fullWidth
                minWidth={0}
                stableHeight={isCompact ? 44 : 50}
                debugId="shop-gallery.verify-shop.open-community-record"
                style={{
                  ...secondaryBtn(false),
                  minHeight: isCompact ? 44 : 50,
                  borderRadius: isCompact ? 13 : 14,
                  fontSize: isCompact ? 12 : 14,
                  color: "#F6D77A",
                  border: "1px solid rgba(246,196,83,0.32)",
                  background: "rgba(246,196,83,0.08)",
                }}
              >
                Ask owner
              </SecondaryButton>
            </div>

            <div
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: isCompact ? 18 : 22,
                border: "1px solid rgba(246,196,83,0.30)",
                background:
                  "linear-gradient(145deg, rgba(3,20,36,0.58), rgba(8,42,76,0.46))",
                padding: isCompact ? "12px 13px" : "16px 18px",
                display: "grid",
                gap: isCompact ? 9 : 11,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  right: isCompact ? 12 : 20,
                  bottom: isCompact ? 10 : 14,
                  fontSize: isCompact ? 72 : 96,
                  lineHeight: 1,
                  color: "rgba(246,215,122,0.08)",
                }}
              >
                🛡️
              </span>
              <div
                style={{
                  position: "relative",
                  color: "#F6D77A",
                  fontSize: isCompact ? 12 : 14,
                  fontWeight: 950,
                  lineHeight: 1.1,
                }}
              >
                Trust check options
              </div>
              <div
                style={{
                  position: "relative",
                  display: "grid",
                  gap: isCompact ? 7 : 8,
                }}
              >
                {shopTrustCheckOptions.map((item) => (
                  <div
                    key={item.text}
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "28px minmax(0, 1fr)"
                        : "34px minmax(0, 1fr)",
                      gap: isCompact ? 8 : 10,
                      alignItems: "center",
                      color: "rgba(255,255,255,0.88)",
                      fontSize: isCompact ? 11.2 : 13,
                      fontWeight: 780,
                      lineHeight: 1.22,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        display: "inline-grid",
                        placeItems: "center",
                        width: isCompact ? 24 : 28,
                        height: isCompact ? 24 : 28,
                        borderRadius: 9,
                        color: "#F6D77A",
                        background: "rgba(255,255,255,0.08)",
                      }}
                    >
                      {item.icon}
                    </span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

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
          style={{
            display: focusedBlockLinkActive ? "none" : "grid",
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
              padding: isCompact ? 14 : 22,
              border: "1px solid rgba(246,215,122,0.68)",
              background:
                "radial-gradient(circle at 88% 8%, rgba(246,196,83,0.34) 0%, transparent 34%), linear-gradient(135deg, #FFF9E9 0%, #FFFFFF 58%, #EFF6FF 100%)",
              boxShadow:
                "0 22px 48px rgba(8,38,67,0.12), inset 0 1px 0 rgba(255,255,255,0.90)",
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
                <div style={{ ...sectionLabel(), color: "#A36F08" }}>
                  Spotlight
                </div>
                <div
                  style={{
                    marginTop: 10,
                    color: "#07172C",
                    fontSize: isCompact ? 22 : 32,
                    fontWeight: 950,
                    lineHeight: 1.1,
                  }}
                >
                  {publicShopSpotlightActive
                    ? miniSpotlightView.title
                    : "Discover what's new"}
                </div>
                <div
                  style={{
                    marginTop: isCompact ? 7 : 10,
                    color: "#425E78",
                    fontSize: isCompact ? 12.2 : 15,
                    lineHeight: 1.35,
                    fontWeight: 720,
                  }}
                >
                  {publicShopSpotlightActive
                    ? miniSpotlightView.detail
                    : "Fresh items, hot deals, and trusted shop updates."}
                </div>
                {miniSpotlightView.tagLabel ? (
                  <div
                    style={{
                      marginTop: isCompact ? 7 : 10,
                      color: "#A36F08",
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
                  Explore Spotlight →
                </PrimaryButton>
              </div>
              <div
                style={{
                  minHeight: isCompact ? 112 : 178,
                  borderRadius: isCompact ? 18 : 20,
                  overflow: "hidden",
                  background:
                    "radial-gradient(circle at 40% 24%, rgba(255,255,255,0.92) 0%, rgba(246,196,83,0.28) 42%, rgba(11,74,122,0.16) 100%)",
                  border: "1px solid rgba(214,170,69,0.24)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75)",
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
                    audioUnlockLabel="🔊"
                    audioUnlockOffLabel="🔇"
                    audioUnlockErrorLabel="▶️"
                    audioUnlockStyle={{
                      top: "auto",
                      right: isCompact ? 7 : 10,
                      bottom: isCompact ? 7 : 10,
                      minWidth: isCompact ? 34 : 38,
                      width: isCompact ? 34 : 38,
                      minHeight: isCompact ? 34 : 38,
                      padding: 0,
                      fontSize: isCompact ? 16 : 18,
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
                    🛍️
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
              borderRadius: isCompact ? 18 : 24,
              padding: isCompact ? 10 : 16,
              border: "1px solid rgba(212,175,55,0.62)",
              background:
                "radial-gradient(circle at 100% 0%, rgba(212,175,55,0.24) 0%, transparent 36%), linear-gradient(145deg, #061827 0%, #082A4C 58%, #031424 100%)",
              boxShadow:
                "0 18px 38px rgba(2,12,27,0.20), inset 0 1px 0 rgba(255,255,255,0.12)",
              display: "grid",
              gridTemplateColumns: isCompact
                ? "92px minmax(0, 1fr)"
                : "170px minmax(0, 1fr)",
              alignItems: "center",
              gap: isCompact ? 10 : 16,
            }}
          >
            <div
              aria-hidden="true"
              style={{
                minHeight: isCompact ? 92 : 132,
                display: "grid",
                placeItems: "stretch",
              }}
            >
              <PublicVaultEmblem compact={isCompact} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...sectionLabel(), color: "#F6D77A" }}>
                🔒 Private Vault
              </div>
              <div
                style={{
                  marginTop: 8,
                  color: "#FFFFFF",
                  fontSize: isCompact ? 16 : 23,
                  fontWeight: 950,
                  lineHeight: 1.15,
                }}
              >
                Exclusive offers for trusted buyers.
              </div>
              <p
                style={{
                  margin: "5px 0 0",
                  color: "rgba(235,245,255,0.78)",
                  fontSize: isCompact ? 10.5 : 13,
                  lineHeight: 1.28,
                  fontWeight: 650,
                }}
              >
                Ask the owner for a trust link to view private deals.
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
                  {isCompact ? "Ask Vault" : "Ask for Vault access"}
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
                {focusedBlockLinkActive
                  ? "This shared link opens only this public shop block."
                  : "These are the 12 public blocks anyone can browse or share."}
              </div>
            </div>
            <span style={badge(true)}>
              {focusedBlockProduct
                ? publicShopBlockLabel(focusedBlockProduct)
                : focusedBlockLinkActive
                ? "Shared block"
                : shopDiaryCounterText}
            </span>
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
                Check back later, share the shop with someone who should see it,
                or ask the owner for a private Vault link.
              </div>
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
                <PrimaryButton
                  onClick={askForVaultAccess}
                  fullWidth
                  stableHeight={isCompact ? 42 : 48}
                  debugId="shop-gallery.empty-ask-vault-access"
                  style={{
                    ...primaryBtn(false),
                    minHeight: isCompact ? 42 : 48,
                  }}
                >
                  Ask for Vault access
                </PrimaryButton>
                <SecondaryButton
                  onClick={copyShopLink}
                  fullWidth
                  stableHeight={isCompact ? 42 : 48}
                  debugId="shop-gallery.empty-copy-shop-link"
                  style={{
                    ...secondaryBtn(shopLoadFailed),
                    minHeight: isCompact ? 42 : 48,
                  }}
                >
                  Copy public shop link
                </SecondaryButton>
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
                const diaryActionHeight = isProductOpen
                  ? isCompact
                    ? 36
                    : 40
                  : isCompact
                  ? 38
                  : 42;
                const diaryActionWidth = isProductOpen
                  ? isCompact
                    ? 36
                    : 40
                  : isCompact
                  ? 40
                  : 44;
                const diaryMediaControlHeight = isCompact ? 36 : 40;
                const diaryClosedDockHeight = isCompact ? 58 : 68;
                const diaryOpenDockHeight = isCompact ? 126 : 132;

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
                      border: "2px solid rgba(8,31,51,0.62)",
                      background: "#FFFFFF",
                      overflow: "hidden",
                      boxShadow:
                        "0 16px 30px rgba(8,38,67,0.18), 0 0 0 1px rgba(255,232,160,0.20), inset 0 1px 0 rgba(255,255,255,0.92)",
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
                        ? 258
                        : 300,
                      aspectRatio: isProductOpen
                        ? isCompact
                          ? "1 / 1.16"
                          : "1.65 / 1"
                        : isCompact
                        ? "0.72 / 1"
                        : "1.22 / 1",
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
                          audioUnlockLabel="🔊"
                          audioUnlockOffLabel="🔇"
                          audioUnlockErrorLabel="▶️"
                          audioUnlockStyle={{
                            top: isCompact ? 9 : 12,
                            right: isCompact ? 9 : 12,
                            minWidth: diaryMediaControlHeight,
                            width: diaryMediaControlHeight,
                            minHeight: diaryMediaControlHeight,
                            padding: 0,
                            fontSize: isCompact ? 17 : 19,
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
                            ? "9px 10px"
                            : "11px 13px"
                          : isCompact
                          ? "6px 7px"
                          : "7px 9px",
                        boxSizing: "border-box",
                        display: "grid",
                        gridTemplateColumns: isProductOpen
                          ? `minmax(0, 1fr) ${diaryActionWidth * 3 + (isCompact ? 12 : 16)}px`
                          : `minmax(0, 1fr) ${diaryActionWidth}px`,
                        gridTemplateRows: isProductOpen
                          ? "auto auto auto"
                          : "auto auto",
                        gap: isProductOpen ? (isCompact ? 4 : 5) : "2px 7px",
                        alignContent: "end",
                        background:
                          isProductOpen
                            ? "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, #FFFFFF 100%)"
                            : "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, #FFFFFF 100%)",
                        borderTop: "1px solid rgba(13,95,168,0.14)",
                        maxHeight: isProductOpen
                          ? diaryOpenDockHeight
                          : diaryClosedDockHeight,
                        minHeight: isProductOpen
                          ? diaryOpenDockHeight
                          : diaryClosedDockHeight,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          gridColumn: isProductOpen ? "1 / -1" : "1",
                          gridRow: isProductOpen ? "1" : "1",
                          minWidth: 0,
                          color: "#07172C",
                          fontWeight: 950,
                          fontSize: isProductOpen
                            ? isCompact
                              ? 18
                              : 20
                            : isCompact
                            ? 13
                            : 17,
                          lineHeight: 1.08,
                          display: "-webkit-box",
                          WebkitLineClamp: isProductOpen ? 1 : isCompact ? 1 : 2,
                          WebkitBoxOrient: "vertical" as any,
                          overflow: "hidden",
                        }}
                      >
                        {displayTitle}
                      </div>
                      {isProductOpen ? (
                        <div
                          style={{
                            color: "#526C84",
                            fontWeight: 650,
                            fontSize: isCompact ? 13 : 14,
                            lineHeight: 1.18,
                            gridColumn: "1 / -1",
                            gridRow: "2",
                            display: "-webkit-box",
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: "vertical" as any,
                            overflow: "hidden",
                          }}
                        >
                          {buyerCue}
                        </div>
                      ) : null}
                      <span
                        style={{
                          ...badge(true),
                          gridColumn: isProductOpen ? "1" : "1",
                          gridRow: isProductOpen ? "3" : "2",
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
                          color: "#1D4ED8",
                        }}
                      >
                        {product.priceText}
                      </span>
                      <div
                        style={{
                          gridColumn: isProductOpen ? "2" : "2",
                          gridRow: isProductOpen ? "3" : "1 / span 2",
                          display: "grid",
                          gridTemplateColumns: isProductOpen
                            ? `repeat(3, ${diaryActionWidth}px)`
                            : `${diaryActionWidth}px`,
                          gap: isCompact ? 6 : 8,
                          width: "fit-content",
                          maxWidth: "100%",
                          minWidth: 0,
                          justifyContent: "start",
                          justifyItems: "start",
                          alignItems: "center",
                          alignSelf: "center",
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
                          aria-label={isProductOpen ? `Close ${displayTitle}` : `Open ${displayTitle}`}
                          title={isProductOpen ? "Close" : "Open"}
                          style={{
                            ...secondaryBtn(false),
                            width: diaryActionWidth,
                            maxWidth: diaryActionWidth,
                            minWidth: 0,
                            minHeight: diaryActionHeight,
                            padding: 0,
                            borderRadius: 999,
                            fontSize: isCompact ? 18 : 20,
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
                          {isProductOpen ? "🔼" : "👁️"}
                        </SecondaryButton>
                        <SecondaryButton
                          onClick={() => {
                            shareProduct(product);
                          }}
                          minWidth={0}
                          stableHeight={diaryActionHeight}
                          debugId={`shop-gallery.product.${productOpenId}.share`}
                          aria-label={`Share ${displayTitle}`}
                          title="Share"
                          style={{
                            ...secondaryBtn(false),
                            display: isProductOpen ? "inline-flex" : "none",
                            width: diaryActionWidth,
                            maxWidth: diaryActionWidth,
                            minWidth: 0,
                            minHeight: diaryActionHeight,
                            padding: 0,
                            borderRadius: 999,
                            fontSize: isCompact ? 18 : 20,
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
                          🔗
                        </SecondaryButton>
                        <SecondaryButton
                          onClick={() => {
                            contactOwnerAboutProduct(product);
                          }}
                          minWidth={0}
                          stableHeight={diaryActionHeight}
                          debugId={`shop-gallery.product.${productOpenId}.contact`}
                          aria-label={`Contact owner about ${displayTitle}`}
                          title="Contact owner"
                          style={{
                            ...secondaryBtn(false),
                            display: isProductOpen ? "inline-flex" : "none",
                            width: diaryActionWidth,
                            maxWidth: diaryActionWidth,
                            minWidth: 0,
                            minHeight: diaryActionHeight,
                            padding: 0,
                            borderRadius: 999,
                            fontSize: isCompact ? 17 : 19,
                            lineHeight: 1,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            overflowWrap: "normal",
                            overflowAnchor: "none",
                            background:
                              "linear-gradient(180deg, rgba(37,211,102,0.98) 0%, rgba(18,140,76,0.94) 100%)",
                            color: "#FFFFFF",
                            borderColor: "rgba(18,140,76,0.52)",
                          }}
                        >
                          💬
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




