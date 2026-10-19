import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useLocation, useParams } from "react-router-dom";
import GSNBrandMark from "../components/GSNBrandMark";
import CommunityProofPanel from "../components/CommunityProofPanel";
import { GsnRealisticIcon, type Gsn3DIconKey } from "../components/GsnRealisticIcon";
import OwnerOnlySurfaceNav from "../components/OwnerOnlySurfaceNav";
import SocialTagShareButton from "../components/SocialTagShareButton";
import SpotlightMediaFrame from "../components/SpotlightMediaFrame";
import { PrimaryButton, SecondaryButton, StableCtaLink, StableDisclosureSummary } from "../components/StableButton";
import ExistingWorkflowPlusLink from '../components/ExistingWorkflowPlusLink';
import {
  createMarketplaceShop,
  followMarketplaceShop,
  getAccessToken,
  getCurrentClan,
  getMarketplaceBroadcasts,
  getMarketplaceShopFollowStatus,
  getMarketplaceShopSpotlightStatus,
  getPublicShopSpotlightOpportunity,
  listMyClans,
  getMe,
  getPublicMarketplaceShopByGmfnId,
  getPublicShopDiaryEntries,
  type ShopDiaryEntryRecord,
  getSelectedClanId,
  getStoredGmfnId,
  recordMarketplaceAttentionEvent,
  qualifySpotlightPresentation,
  revalidateSpotlightPresentation,
  safeCopy,
  unfollowMarketplaceShop,
} from "../lib/api";
import {
  PUBLIC_SHOP_DIARIES_ANCHOR,
  PUBLIC_SHOP_SPOTLIGHT_ANCHOR,
  PUBLIC_SHOP_VAULT_ANCHOR,
  publicFrontendUrl,
  publicShopPath,
  publicShopShareUrl,
  publicShopSocialPreviewUrl,
  publicShopUrl,
} from "../lib/publicLinks";
import { buildGsnPublicShopLinkMessage } from "../lib/gsnSnapshotPaper";
import {
  buildWhatsAppChatUrl,
  normalizeWhatsAppRecipient,
} from "../lib/whatsappLinks";
import { getCachedShopProductMedia } from "../lib/shopProductMediaCache";
import { ownerSurfaceIdentityMatches } from "../lib/ownerSurfaceIdentity";
import { APP_ROUTES, routeWithCommunity } from "../lib/appRoutes";
import { OWNER_SHOP_HASHES } from "../lib/ownerShopHandles";
import { revealElementWithoutJump } from "../lib/mobileRevealStability";
import {
  buildSpotlightRotationQueue,
  SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS,
  SPOTLIGHT_PILOT_REFRESH_MS,
} from "../lib/spotlightPilot";
import {
  PUBLIC_SHOP_SPOTLIGHT_INTERACTION_PAUSE_MS,
  PUBLIC_SHOP_SPOTLIGHT_MIN_VISIBLE_RATIO,
  publicShopSpotlightRotationMs,
  PUBLIC_SHOP_SPOTLIGHT_QUALIFYING_VISIBLE_MS,
  PUBLIC_SHOP_SPOTLIGHT_REDUCED_MOTION_ROTATION_MS,
} from "../lib/spotlightPresentationPolicy";

type ShopProfile = {
  id?: number;
  clanId?: number;
  ownerUserId?: number;
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
  followerCount: number;
  publicSlotsTotal?: number;
};

type ShopFollowState = {
  isFollowing: boolean;
  canFollow: boolean;
  isOwner: boolean;
  followerCount: number;
  loading: boolean;
  busy: boolean;
};

type OwnerSpotlightInspection = {
  state: string;
  campaign: {
    campaign_id?: number;
    status?: string;
    serving_status?: string;
    content_version?: number;
    activated_at?: string | null;
    authorized_expires_at?: string | null;
  } | null;
  item: any | null;
  counts_as_delivery?: boolean;
  counts_as_exposure?: boolean;
  delivery_exhausted?: boolean;
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
  shopId?: number;
  imageUrl: string;
  videoUrl: string;
  message: string;
  spotlightTitle: string;
  spotlightDescription: string;
  spotlightOwner: string;
  spotlightCommunity: string;
  sourceProductTitle: string;
  sourceProductDescription: string;
  sourceProductPrice: string;
  sourceProductCurrency: string;
  sourceProductCategory: string;
  sourceProductAvailability: string;
  sourceProductImageUrl: string;
  sourceProductVideoUrl: string;
  sourceShopName: string;
  sourceShopWhatsApp: string;
  sourceClanName: string;
  sourceClanId?: number;
  trustBand: string;
  trustScore: string;
  authorName: string;
  authorGmfnId: string;
  sourceProductId?: number;
  sourceProductBlock?: number;
  sourceProductSlotNumber?: number;
  priorityMode?: string;
  rotationWeight?: number;
  isCanonicalOpportunity?: boolean;
  isCanonicalReplay?: boolean;
  opportunityCampaignId?: number;
  opportunityPresentationId?: string;
  opportunityPresentationToken?: string;
  opportunityPresentationExpiresAt?: string;
  opportunityReplayExpiresAt?: string;
  opportunityPresentationSurface?: string;
  opportunityCountsAsDelivery?: boolean;
  opportunityCountsAsExposure?: boolean;
  servingStatus?: string;
  campaignServingStatus?: string;
  contentVersion?: number;
  authorizedExpiresAt?: string;
  createdAt?: string;
  expiresAt?: string;
};

type PublicShopSpotlightSelectionCycle = {
  items: any[] | null;
  promise?: Promise<any[] | null>;
  authoritative: boolean;
  requestId: string;
  selectedAtMs: number;
  expiresAtMs: number;
};

const publicShopSpotlightSelectionCycles = new Map<
  string,
  PublicShopSpotlightSelectionCycle
>();

type LegacyShopIconName =
  | "alert"
  | "bank"
  | "briefcase"
  | "calendar"
  | "card"
  | "cart"
  | "chart"
  | "chevronDown"
  | "chevronUp"
  | "check"
  | "community"
  | "copy"
  | "document"
  | "eye"
  | "globe"
  | "hash"
  | "home"
  | "id"
  | "image"
  | "lock"
  | "megaphone"
  | "navigation"
  | "pen"
  | "phone"
  | "qr"
  | "refresh"
  | "search"
  | "shield"
  | "shop"
  | "spark"
  | "tag"
  | "user"
  | "vault"
  | "video"
  | "wallet";

type ShopIconName = LegacyShopIconName | Gsn3DIconKey;

type NoticeTone = "success" | "error";

const GALLERY_STANDARD_SLOTS_TOTAL = 6;
const GALLERY_EXTRA_SLOTS_LIMIT = 4;
const GALLERY_SLOTS_TOTAL = GALLERY_STANDARD_SLOTS_TOTAL + GALLERY_EXTRA_SLOTS_LIMIT;
const PAID_REPOST_HANDOFF_STORAGE_KEY = "gmfn_paid_repost_handoff_v1";
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

function stripPublicBlockMetadata(description: any): string {
  return safeStr(description)
    .replace(/\[BLOCK:\s*\d+\]/gi, "")
    .replace(/\[LABEL:\s*[^\]]+\]/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
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

function formatShopFollowerCount(count: any): string {
  const value = positiveNumber(count);
  return value === 1 ? "1 follower" : `${value} followers`;
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

function publicShopSpotlightSelectionCycleKey(gmfnId: string): string {
  const shopKey = safeStr(gmfnId).toUpperCase();
  const token = safeStr(getAccessToken());
  const viewerKey = firstMeaningful(
    getStoredGmfnId(),
    token ? `session:${token.slice(-16)}` : ""
  );
  return shopKey && viewerKey ? `${shopKey}::${viewerKey}` : "";
}

function publicShopSpotlightResponseItems(response: any): any[] {
  return Array.isArray(response?.items)
    ? response.items
    : response?.item
    ? [response.item]
    : [];
}

function publicShopSpotlightRowIsCanonical(row: any): boolean {
  const src = row?.item || row?.broadcast || row?.data || row;
  const presentationToken = firstMeaningful(
    src?.opportunity_presentation_token,
    src?.opportunityPresentationToken
  );
  const replayExpiresAt = firstMeaningful(
    src?.opportunity_replay_expires_at,
    src?.opportunityReplayExpiresAt
  );
  const countsAsDelivery =
    src?.opportunity_counts_as_delivery ?? src?.opportunityCountsAsDelivery;
  const countsAsExposure =
    src?.opportunity_counts_as_exposure ?? src?.opportunityCountsAsExposure;
  const canonicalReplay = Boolean(
    (src?.is_canonical_replay || src?.isCanonicalReplay) &&
      !presentationToken &&
      replayExpiresAt &&
      countsAsDelivery === false &&
      countsAsExposure === false
  );
  return Boolean(
    src?.is_canonical_opportunity &&
      (presentationToken || canonicalReplay)
  );
}

function publicShopSpotlightRowsAreCanonical(items: any[] | null | undefined): boolean {
  return Array.isArray(items) && items.some((item) => publicShopSpotlightRowIsCanonical(item));
}

function publicShopSpotlightPresentationIsCurrent(item: ShopBroadcast | null): boolean {
  if (!item?.isCanonicalOpportunity) return false;
  const deadlineMs = publicShopSpotlightPresentationDeadlineMs(item);
  if (item.isCanonicalReplay) {
    if (
      item.opportunityPresentationToken ||
      item.opportunityCountsAsDelivery !== false ||
      item.opportunityCountsAsExposure !== false
    ) {
      return false;
    }
    return Number.isFinite(deadlineMs) && deadlineMs > Date.now();
  }
  if (!item.opportunityPresentationToken) return false;
  return Number.isFinite(deadlineMs) && deadlineMs > Date.now();
}

function publicShopSpotlightPresentationDeadlineMs(item: ShopBroadcast): number {
  return new Date(
    item.isCanonicalReplay
      ? item.opportunityReplayExpiresAt || ""
      : item.opportunityPresentationExpiresAt || ""
  ).getTime();
}

async function loadNextPublicShopSpotlightPresentations(
  cleanedGmfnId: string
): Promise<ShopBroadcast[]> {
  if (!cleanedGmfnId || !getAccessToken()) return [];
  const response = await getPublicShopSpotlightOpportunity(
    cleanedGmfnId,
    newSpotlightPresentationRequestId()
  ).catch(() => null);
  if (Number(response?.serving_contract_version || 0) < 2) return [];
  return publicShopSpotlightResponseItems(response)
    .filter((row) => publicShopSpotlightRowIsCanonical(row))
    .map((row) => normalizeBroadcast(row))
    .filter(
      (item): item is ShopBroadcast =>
        publicShopSpotlightPresentationIsCurrent(item) && broadcastIsActive(item)
    );
}

function publicShopSpotlightCycleExpiryMs(items: any[], selectedAtMs: number): number {
  const explicitExpiry = items
    .map((item) => {
      const src = item?.item || item?.broadcast || item?.data || item;
      return new Date(
        firstMeaningful(
          src?.opportunity_presentation_expires_at,
          src?.opportunityPresentationExpiresAt,
          src?.opportunity_replay_expires_at,
          src?.opportunityReplayExpiresAt
        )
      ).getTime();
    })
    // Keep elapsed server deadlines. A delayed response must fail closed;
    // discarding an elapsed deadline here would manufacture a fresh 30-second lease.
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b)[0];
  const nextScheduledRefresh = selectedAtMs + SPOTLIGHT_PILOT_REFRESH_MS;
  return explicitExpiry
    ? Math.min(explicitExpiry, nextScheduledRefresh)
    : nextScheduledRefresh;
}

function prunePublicShopSpotlightSelectionCycles(nowMs: number): void {
  for (const [key, cycle] of publicShopSpotlightSelectionCycles.entries()) {
    if (!cycle.promise && cycle.expiresAtMs <= nowMs) {
      publicShopSpotlightSelectionCycles.delete(key);
    }
  }
}

function publicShopSpotlightCycleIsAuthoritative(
  cycle: PublicShopSpotlightSelectionCycle | undefined,
  nowMs: number
): boolean {
  return Boolean(
    cycle &&
      cycle.authoritative &&
      cycle.expiresAtMs > nowMs
  );
}

function newSpotlightPresentationRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `spotlight-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function loadPublicShopSpotlightPresentationCycle(
  cleanedGmfnId: string
): Promise<any[] | null> {
  const cycleKey = publicShopSpotlightSelectionCycleKey(cleanedGmfnId);
  if (!cycleKey) return null;

  const nowMs = Date.now();
  prunePublicShopSpotlightSelectionCycles(nowMs);

  const existingCycle = publicShopSpotlightSelectionCycles.get(cycleKey);
  if (existingCycle?.promise) return existingCycle.promise;
  if (publicShopSpotlightCycleIsAuthoritative(existingCycle, nowMs)) {
    return existingCycle?.items || null;
  }

  const requestStartedAtMs = Date.now();
  const requestId = existingCycle?.requestId || newSpotlightPresentationRequestId();
  const requestPromise: Promise<any[] | null> = getPublicShopSpotlightOpportunity(cleanedGmfnId, requestId)
    .then((opportunityRes) => {
      const opportunityItems = publicShopSpotlightResponseItems(opportunityRes);
      const requestFinishedAtMs = Date.now();
      if (Number(opportunityRes?.serving_contract_version || 0) >= 2) {
        const currentCanonicalItems = opportunityItems.filter((row) => {
          if (!publicShopSpotlightRowIsCanonical(row)) return false;
          const normalized = normalizeBroadcast(row);
          return (
            publicShopSpotlightPresentationIsCurrent(normalized) &&
            broadcastIsActive(normalized)
          );
        });
        const expiryMs = publicShopSpotlightCycleExpiryMs(
          currentCanonicalItems,
          requestStartedAtMs
        );
        const safeItems =
          publicShopSpotlightRowsAreCanonical(currentCanonicalItems) &&
          expiryMs > requestFinishedAtMs
            ? currentCanonicalItems
            : [];
        publicShopSpotlightSelectionCycles.set(cycleKey, {
          items: safeItems,
          authoritative: true,
          requestId,
          selectedAtMs: requestStartedAtMs,
          expiresAtMs: Math.max(expiryMs, requestFinishedAtMs + 1),
        });
        return safeItems;
      }

      const currentCycle = publicShopSpotlightSelectionCycles.get(cycleKey);
      if (
        currentCycle &&
        currentCycle.promise === requestPromise &&
        publicShopSpotlightCycleIsAuthoritative(currentCycle, requestFinishedAtMs)
      ) {
        return currentCycle.items || null;
      }
      if (currentCycle?.promise === requestPromise) {
        publicShopSpotlightSelectionCycles.delete(cycleKey);
      }
      return null;
    })
    .catch((error) => {
      const currentCycle = publicShopSpotlightSelectionCycles.get(cycleKey);
      if (!currentCycle || currentCycle.promise === requestPromise) {
        publicShopSpotlightSelectionCycles.delete(cycleKey);
      }
      throw error;
    });

  publicShopSpotlightSelectionCycles.set(cycleKey, {
    items: null,
    promise: requestPromise,
    authoritative: false,
    requestId,
    selectedAtMs: requestStartedAtMs,
    expiresAtMs: requestStartedAtMs + SPOTLIGHT_PILOT_REFRESH_MS,
  });
  return requestPromise;
}

function publicShopReconnectErrorMessage(message: string): string {
  if (/no active clan selected/i.test(message)) {
    return "GSN found your owner sign-in, but it could not find an active community for this shop yet. Open Marketplace or Community Home once while signed in, then this public shop page can reconnect Products & Services.";
  }

  if (/not an active member/i.test(message)) {
    return "GSN found your owner sign-in, but this browser is pointing at a community where the owner is not active. Open the shop from Marketplace again so GSN can use the right community.";
  }

  if (isDisconnectedPublicShopError(message)) {
    return "This public shop link is not connected to an active shop yet. If you are signed in as the owner, this page will reconnect to your current GSN shop and load Products & Services automatically.";
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

function clampGallerySlotsTotal(value: any): number {
  const parsed = Math.floor(positiveNumber(value) || GALLERY_STANDARD_SLOTS_TOTAL);
  return Math.min(GALLERY_SLOTS_TOTAL, Math.max(GALLERY_STANDARD_SLOTS_TOTAL, parsed));
}

function appendShopShareAttribution(
  url: string,
  shareSource: string,
  channel?: string
): string {
  const rawUrl = safeStr(url);
  if (!rawUrl) return "";

  try {
    const base = typeof window !== "undefined" ? window.location.origin : "https://gsn.local";
    const parsed = new URL(rawUrl, base);
    parsed.searchParams.set("gsn_share", firstMeaningful(shareSource, "share_shop"));
    if (channel) parsed.searchParams.set("gsn_channel", channel);
    parsed.searchParams.set("utm_source", "gsn_shop_gallery");
    return parsed.toString();
  } catch {
    const joiner = rawUrl.includes("?") ? "&" : "?";
    const params = new URLSearchParams({
      gsn_share: firstMeaningful(shareSource, "share_shop"),
      utm_source: "gsn_shop_gallery",
    });
    if (channel) params.set("gsn_channel", channel);
    return `${rawUrl}${joiner}${params.toString()}`;
  }
}

function createShareClientEventId(prefix: string): string {
  const randomId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}:${randomId}`;
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
    return `Code ${name}. Ask the owner.`;
  }
  if (product.priceText.toLowerCase() === "price on request") {
    return "Ask the owner for price and availability.";
  }
  if (shopName) return `${shopName}. Ask about stock.`;
  return "Ask the owner about stock.";
}

function publicShopBlockLabel(product: ShopProduct): string {
  return `Shop item ${product.slotNumber}`;
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
    target.closest("button,a,input,select,textarea,[role='button'],[data-media-control='true']")
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
          filter: "drop-shadow(0 14px 20px rgba(0,0,0,0.28))",
          transform: "rotate(-4deg)",
        }}
      >
        <GsnRealisticIcon name="shop-storefront" size={compact ? 54 : 84} decorative />
      </span>
      <span
        style={{
          position: "absolute",
          left: compact ? 32 : 50,
          bottom: compact ? 23 : 36,
          filter: "drop-shadow(0 12px 18px rgba(0,0,0,0.24))",
        }}
      >
        <GsnRealisticIcon name="shop-storefront" size={compact ? 44 : 68} decorative />
      </span>
      <GSNBrandMark width={compact ? 44 : 62} height={compact ? 58 : 82} />
    </div>
  );
}

function ReferenceShopSignboardVisual({ compact = false }: { compact?: boolean }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: compact ? 92 : 204,
        height: compact ? 92 : 194,
        borderRadius: compact ? 24 : 32,
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
      <span
        style={{
          position: "absolute",
          inset: compact ? 8 : 16,
          borderRadius: compact ? 20 : 28,
          border: "1px solid rgba(246,215,122,0.26)",
          background:
            "radial-gradient(circle at 34% 28%, rgba(255,255,255,0.13) 0%, transparent 38%)",
          boxShadow: "inset 0 0 42px rgba(246,196,83,0.08)",
        }}
      />
      <GsnRealisticIcon
        name="shopping-cart"
        size={compact ? 78 : 148}
        decorative
        loading="eager"
        style={{
          position: "relative",
          zIndex: 2,
          filter: "drop-shadow(0 18px 26px rgba(0,0,0,0.34))",
          transform: "rotate(-3deg)",
        }}
        imageStyle={{ width: "106%", height: "106%" }}
      />
      <span
        style={{
          position: "absolute",
          left: compact ? 10 : 22,
          top: compact ? 10 : 22,
          width: compact ? 20 : 34,
          height: compact ? 20 : 34,
          borderRadius: "50%",
          background: "linear-gradient(180deg, #FFECA8 0%, #D6AA45 100%)",
          boxShadow: "0 10px 20px rgba(214,170,69,0.24)",
        }}
      />
      <span
        style={{
          position: "absolute",
          right: compact ? 12 : 26,
          bottom: compact ? 12 : 26,
          width: compact ? 11 : 18,
          height: compact ? 11 : 18,
          borderRadius: "50%",
          background: "#F6D77A",
          opacity: 0.9,
        }}
      />
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
    ownerUserId:
      positiveNumber(src?.owner_user_id) ||
      positiveNumber(src?.ownerUserId) ||
      undefined,
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
    followerCount: positiveNumber(
      src?.follower_count || src?.followers_count || src?.shop_follower_count
    ),
  };
}

function normalizeBroadcast(raw: any): ShopBroadcast | null {
  if (!raw) return null;

  const src = raw?.item || raw?.broadcast || raw?.data || raw;

  return {
    id: positiveNumber(src?.id) || undefined,
    shopId:
      positiveNumber(
        src?.shop_id ||
          src?.shopId ||
          src?.source_shop_id ||
          src?.sourceShopId ||
          src?.marketplace_shop_id ||
          src?.marketplaceShopId ||
          src?.published_shop_id ||
          src?.publishedShopId ||
          src?.shop?.id ||
          src?.source_shop?.id ||
          src?.sourceShop?.id
      ) ||
      undefined,
    imageUrl: resolveImageSrc(
      src?.source_product_image_url ||
        src?.sourceProductImageUrl ||
        src?.image_url ||
        src?.imageUrl
    ),
    videoUrl: resolveImageSrc(
      src?.source_product_video_url ||
        src?.sourceProductVideoUrl ||
        src?.video_url ||
        src?.videoUrl
    ),
    message: firstMeaningful(src?.message, src?.content, src?.text),
    spotlightTitle: firstMeaningful(src?.spotlight_title, src?.spotlightTitle),
    spotlightDescription: firstMeaningful(
      src?.spotlight_description,
      src?.spotlightDescription
    ),
    spotlightOwner: firstMeaningful(src?.spotlight_owner, src?.spotlightOwner),
    spotlightCommunity: firstMeaningful(
      src?.spotlight_community,
      src?.spotlightCommunity
    ),
    sourceProductTitle: firstMeaningful(
      src?.source_product_title,
      src?.sourceProductTitle
    ),
    sourceProductDescription: firstMeaningful(
      src?.source_product_description,
      src?.sourceProductDescription
    ),
    sourceProductPrice: firstMeaningful(
      src?.source_product_price,
      src?.sourceProductPrice,
      src?.price
    ),
    sourceProductCurrency: firstMeaningful(
      src?.source_product_currency,
      src?.sourceProductCurrency,
      src?.currency
    ),
    sourceProductCategory: firstMeaningful(
      src?.source_product_category,
      src?.sourceProductCategory
    ),
    sourceProductAvailability: firstMeaningful(
      src?.source_product_availability,
      src?.sourceProductAvailability
    ),
    sourceProductImageUrl: resolveImageSrc(
      src?.source_product_image_url || src?.sourceProductImageUrl
    ),
    sourceProductVideoUrl: resolveImageSrc(
      src?.source_product_video_url || src?.sourceProductVideoUrl
    ),
    sourceShopName: firstMeaningful(src?.source_shop_name, src?.sourceShopName),
    sourceShopWhatsApp: firstMeaningful(
      src?.source_shop_whatsapp_number,
      src?.sourceShopWhatsAppNumber,
      src?.source_shop_whatsapp,
      src?.shop_whatsapp_number,
      src?.whatsapp_number
    ),
    sourceClanName: firstMeaningful(src?.source_clan_name, src?.sourceClanName),
    sourceClanId:
      positiveNumber(src?.source_clan_id || src?.sourceClanId || src?.clan_id || src?.clanId) ||
      undefined,
    trustBand: firstMeaningful(src?.trust_band, src?.trustBand),
    trustScore: firstMeaningful(src?.trust_score, src?.trustScore),
    authorName: firstMeaningful(src?.author_name, src?.authorName),
    authorGmfnId: firstMeaningful(src?.author_gmfn_id, src?.authorGmfnId),
    sourceProductId:
      positiveNumber(src?.source_product_id || src?.sourceProductId) ||
      undefined,
    sourceProductBlock:
      positiveNumber(src?.source_product_block || src?.sourceProductBlock) ||
      undefined,
    sourceProductSlotNumber:
      positiveNumber(
        src?.source_product_slot_number || src?.sourceProductSlotNumber
      ) || undefined,
    priorityMode: firstMeaningful(src?.priority_mode, src?.priorityMode),
    rotationWeight:
      positiveNumber(src?.rotation_weight || src?.rotationWeight) || undefined,
    isCanonicalOpportunity: Boolean(
      src?.is_canonical_opportunity || src?.isCanonicalOpportunity
    ),
    isCanonicalReplay: Boolean(
      src?.is_canonical_replay || src?.isCanonicalReplay
    ),
    opportunityCampaignId:
      positiveNumber(src?.opportunity_campaign_id || src?.opportunityCampaignId) ||
      positiveNumber(src?.spotlight_campaign_id || src?.spotlightCampaignId) ||
      undefined,
    opportunityPresentationId: firstMeaningful(
      src?.opportunity_presentation_id,
      src?.opportunityPresentationId
    ),
    opportunityPresentationToken: firstMeaningful(
      src?.opportunity_presentation_token,
      src?.opportunityPresentationToken
    ),
    opportunityPresentationExpiresAt: firstMeaningful(
      src?.opportunity_presentation_expires_at,
      src?.opportunityPresentationExpiresAt
    ),
    opportunityReplayExpiresAt: firstMeaningful(
      src?.opportunity_replay_expires_at,
      src?.opportunityReplayExpiresAt
    ),
    opportunityPresentationSurface: firstMeaningful(
      src?.opportunity_presentation_surface,
      src?.opportunityPresentationSurface
    ),
    opportunityCountsAsDelivery:
      typeof src?.opportunity_counts_as_delivery === "boolean"
        ? src.opportunity_counts_as_delivery
        : typeof src?.opportunityCountsAsDelivery === "boolean"
        ? src.opportunityCountsAsDelivery
        : undefined,
    opportunityCountsAsExposure:
      typeof src?.opportunity_counts_as_exposure === "boolean"
        ? src.opportunity_counts_as_exposure
        : typeof src?.opportunityCountsAsExposure === "boolean"
        ? src.opportunityCountsAsExposure
        : undefined,
    servingStatus: firstMeaningful(src?.serving_status, src?.servingStatus),
    campaignServingStatus: firstMeaningful(
      src?.campaign_serving_status,
      src?.campaignServingStatus
    ),
    contentVersion:
      positiveNumber(src?.content_version || src?.contentVersion) || undefined,
    authorizedExpiresAt: firstMeaningful(
      src?.authorized_expires_at,
      src?.authorizedExpiresAt
    ),
    createdAt: firstMeaningful(src?.created_at, src?.createdAt),
    expiresAt: firstMeaningful(src?.expires_at, src?.expiresAt),
  };
}

function broadcastIsActive(item: ShopBroadcast | null): boolean {
  if (!item) return false;
  if (item.servingStatus && item.servingStatus !== "serving") return false;
  if (
    item.campaignServingStatus &&
    item.campaignServingStatus !== "serving"
  ) {
    return false;
  }
  const expiry = firstMeaningful(item.authorizedExpiresAt, item.expiresAt);
  if (!expiry) return true;
  const expiresAt = new Date(expiry).getTime();
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

function formatSpotlightInspectionTime(value: unknown): string {
  const timestamp = new Date(String(value || "")).getTime();
  if (!Number.isFinite(timestamp)) return "";
  return new Date(timestamp).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
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

function hasOwnValue(source: any, key: string): boolean {
  return Boolean(source) && Object.prototype.hasOwnProperty.call(source, key);
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
  const productHasImageTruth =
    hasOwnValue(src, "image_url") ||
    hasOwnValue(src, "thumbnail_url") ||
    hasOwnValue(src, "photo_url") ||
    hasOwnValue(src, "cover_image_url");
  const productHasVideoTruth = hasOwnValue(src, "video_url");
  const imageUrl = resolveImageSrc(
    src?.image_url ||
      src?.thumbnail_url ||
      src?.photo_url ||
      src?.cover_image_url ||
      (!productHasImageTruth ? cachedMedia?.image_url : "")
  );
  const videoUrl = resolveImageSrc(
    src?.video_url || (!productHasVideoTruth ? cachedMedia?.video_url : "")
  );

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

function productDisplayRank(item: ShopProduct | null | undefined): {
  createdMs: number;
  id: number;
} {
  const createdMs = Date.parse(firstMeaningful(item?.createdAt));
  return {
    createdMs: Number.isFinite(createdMs) ? createdMs : 0,
    id: positiveNumber(item?.id),
  };
}

function isNewerProductCandidate(
  candidate: ShopProduct,
  current: ShopProduct | null | undefined
): boolean {
  if (!current) return true;

  const candidateRank = productDisplayRank(candidate);
  const currentRank = productDisplayRank(current);
  if (candidateRank.createdMs !== currentRank.createdMs) {
    return candidateRank.createdMs > currentRank.createdMs;
  }

  return candidateRank.id > currentRank.id;
}

function arrangeProductsByPublicBlock(items: ShopProduct[], slotCount = GALLERY_STANDARD_SLOTS_TOTAL): ShopProduct[] {
  const safeSlotCount = clampGallerySlotsTotal(slotCount);
  const slots: (ShopProduct | null)[] = Array.from(
    { length: safeSlotCount },
    () => null
  );
  const overflow: ShopProduct[] = [];

  items.forEach((item) => {
    const slotNumber = positiveNumber(item?.slotNumber);
    if (slotNumber >= 1 && slotNumber <= safeSlotCount) {
      if (isNewerProductCandidate(item, slots[slotNumber - 1])) {
        slots[slotNumber - 1] = item;
      }
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
  "radial-gradient(circle at 8% 0%, rgba(47,128,237,0.105) 0%, transparent 34%), radial-gradient(circle at 100% 6%, rgba(246,196,83,0.075) 0%, transparent 30%), linear-gradient(135deg, #FFFFFF 0%, #F7FBFF 56%, #EEF6FF 100%)";

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
    letterSpacing: 0,
    textTransform: "uppercase",
    textShadow: "0 1px 0 rgba(255,255,255,0.82)",
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

function glossyIconBadge(size: number, fontSize: number): React.CSSProperties {
  return {
    display: "grid",
    placeItems: "center",
    width: size,
    height: size,
    borderRadius: "50%",
    background:
      "radial-gradient(circle at 34% 22%, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.68) 42%, rgba(234,243,255,0.96) 100%)",
    color: "#0B4A7A",
    boxShadow:
      "0 10px 22px rgba(8,38,67,0.14), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -8px 18px rgba(13,95,168,0.08)",
    fontSize,
    border: "1px solid rgba(13,95,168,0.10)",
    lineHeight: 1,
  };
}

function shop3DIconName(name: ShopIconName): Gsn3DIconKey {
  const mapped = {
    alert: "trust-shield",
    bank: "finance-wallet-card",
    briefcase: "records-folder",
    calendar: "records-folder",
    card: "finance-wallet-card",
    cart: "shopping-cart",
    chart: "finance-wallet-card",
    chevronDown: "public-globe",
    check: "trust-shield",
    chevronUp: "public-globe",
    community: "community-building",
    copy: "qr-record",
    document: "records-folder",
    eye: "public-globe",
    globe: "public-globe",
    hash: "qr-record",
    home: "community-building",
    id: "identity-card",
    image: "records-folder",
    lock: "vault-safe",
    megaphone: "spotlight-megaphone",
    navigation: "public-globe",
    pen: "records-folder",
    phone: "phone-contact",
    qr: "qr-record",
    refresh: "records-folder",
    search: "qr-record",
    shield: "trust-shield",
    shop: "shop-storefront",
    spark: "spotlight-megaphone",
    tag: "shop-storefront",
    user: "identity-card",
    vault: "vault-safe",
    video: "media-video",
    wallet: "finance-wallet-card",
  } satisfies Record<LegacyShopIconName, Gsn3DIconKey>;

  return mapped[name as LegacyShopIconName] || (name as Gsn3DIconKey);
}

function inlineShopIcon(
  name: ShopIconName,
  color = "currentColor",
  size = 15
): React.ReactNode {
  const iconSize = Math.max(24, size + 14);

  return (
    <span
      aria-hidden="true"
      style={{
        flex: "0 0 auto",
        width: iconSize,
        height: iconSize,
        borderRadius: 8,
        display: "inline-grid",
        placeItems: "center",
        color,
        background: "rgba(255,255,255,0.94)",
        border: "1px solid rgba(13,95,168,0.12)",
        boxShadow:
          "0 8px 16px rgba(6,24,39,0.08), inset 0 1px 0 rgba(255,255,255,0.96)",
        verticalAlign: "-5px",
      }}
    >
      <GsnRealisticIcon
        name={shop3DIconName(name)}
        size={Math.max(22, size + 10)}
        decorative
        imageStyle={{ width: "96%", height: "96%" }}
      />
    </span>
  );
}

function inlineShareGlyph(color = "#FFFFFF", size = 18): React.ReactNode {
  const dot = Math.max(4, Math.round(size * 0.25));
  const lineHeight = Math.max(2, Math.round(size * 0.11));

  return (
    <span
      aria-hidden="true"
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-block",
        flex: "0 0 auto",
      }}
    >
      <span
        style={{
          position: "absolute",
          left: Math.round(size * 0.28),
          top: Math.round(size * 0.28),
          width: Math.round(size * 0.42),
          height: lineHeight,
          borderRadius: 999,
          background: color,
          transform: "rotate(-30deg)",
          transformOrigin: "left center",
        }}
      />
      <span
        style={{
          position: "absolute",
          left: Math.round(size * 0.28),
          top: Math.round(size * 0.62),
          width: Math.round(size * 0.42),
          height: lineHeight,
          borderRadius: 999,
          background: color,
          transform: "rotate(30deg)",
          transformOrigin: "left center",
        }}
      />
      {[
        [0, Math.round(size * 0.43)],
        [Math.round(size * 0.66), Math.round(size * 0.1)],
        [Math.round(size * 0.66), Math.round(size * 0.72)],
      ].map(([left, top], index) => (
        <span
          key={index}
          style={{
            position: "absolute",
            left,
            top,
            width: dot,
            height: dot,
            borderRadius: "50%",
            background: color,
            boxShadow: "0 1px 0 rgba(255,255,255,0.28)",
          }}
        />
      ))}
    </span>
  );
}
function labelWithShopIcon(
  name: ShopIconName,
  label: React.ReactNode,
  color = "currentColor"
): React.ReactNode {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, minWidth: 0 }}>
      {inlineShopIcon(name, color)}
      <span>{label}</span>
    </span>
  );
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
  const routeDiaryEntryId = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return positiveNumber(query.get("diary_entry_id") || query.get("update_id"));
  }, [location.search]);
  const ownerSpotlightPreviewRequested = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return query.get("owner_spotlight_preview") === "1";
  }, [location.search]);
  const explicitRouteClanId = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return positiveNumber(
      query.get("clan_id") || query.get("community_id") || query.get("community")
    );
  }, [location.search]);
  const routeClanId = useMemo(() => {
    if (explicitRouteClanId > 0) return explicitRouteClanId;

    const signedInSelectedClanId = positiveNumber(getSelectedClanId());
    return getAccessToken() && signedInSelectedClanId > 0 ? signedInSelectedClanId : 0;
  }, [explicitRouteClanId]);
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
  const spotlightRailRef = useRef<HTMLElement | null>(null);
  const spotlightVisibleRatioRef = useRef(0);
  const spotlightQualificationTimerRef = useRef<number | null>(null);
  const spotlightQualifiedKeysRef = useRef<Set<string>>(new Set());
  const spotlightQualificationInFlightKeysRef = useRef<Set<string>>(new Set());
  const productMediaQualifiedKeysRef = useRef<Set<string>>(new Set());
  const productMediaQualificationInFlightKeysRef = useRef<Set<string>>(new Set());
  const spotlightNextRequestPendingRef = useRef(false);
  const spotlightNextEmptyUntilRef = useRef(0);
  const spotlightInteractionPausedUntilRef = useRef(0);
  const spotlightRefreshGenerationRef = useRef(0);
  const [spotlightHasKeyboardFocus, setSpotlightHasKeyboardFocus] = useState(false);
  const [spotlightInteractionPausedUntil, setSpotlightInteractionPausedUntil] = useState(0);
  const [spotlightReducedMotion, setSpotlightReducedMotion] = useState(false);
  const [spotlightFeedError, setSpotlightFeedError] = useState('');
  const [spotlightMediaReadyKey, setSpotlightMediaReadyKey] = useState('');
  const [spotlightMediaUnavailableKey, setSpotlightMediaUnavailableKey] =
    useState('');
  const galleryRevealFrameRef = useRef<number | null>(null);
  const galleryRevealTimeoutRefs = useRef<number[]>([]);
  const galleryRevealTargetRef = useRef("");
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [shopDiaryEntries, setShopDiaryEntries] = useState<ShopDiaryEntryRecord[]>([]);
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
  const [shopFollowState, setShopFollowState] = useState<ShopFollowState>({
    isFollowing: false,
    canFollow: false,
    isOwner: false,
    followerCount: 0,
    loading: false,
    busy: false,
  });
  const [error, setError] = useState<string>("");
  const [autoRefreshingShop, setAutoRefreshingShop] = useState(false);
  const [shopReconnectRetryKey, setShopReconnectRetryKey] = useState(0);
  const [ownerContactPanelOpen, setOwnerContactPanelOpen] = useState(false);
  const [shopVerificationOpen, setShopVerificationOpen] = useState(false);
  const [shopVerificationQrOpen, setShopVerificationQrOpen] = useState(false);
  const [shopOptionsOpen, setShopOptionsOpen] = useState(false);
  const [shopMoreOpen, setShopMoreOpen] = useState(false);
  const gallerySlotsTotal = clampGallerySlotsTotal(shop?.publicSlotsTotal);
  const [signedInGmfnId, setSignedInGmfnId] = useState<string>(
    () => getStoredGmfnId() || ""
  );
  const [ownerSpotlightInspection, setOwnerSpotlightInspection] =
    useState<OwnerSpotlightInspection | null>(null);
  const autoRefreshAttemptedRef = useRef("");
  const signedInRouteIsOwner = Boolean(
    getAccessToken() &&
      signedInGmfnId &&
      gmfnId &&
      ownerSurfaceIdentityMatches(signedInGmfnId, gmfnId)
  );
  const ownerSpotlightInspectionMode = signedInRouteIsOwner;
  const ownerSpotlightPreviewAuthorized = Boolean(
    ownerSpotlightPreviewRequested && signedInRouteIsOwner
  );

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
    let alive = true;
    let refreshFrame: number | null = null;

    async function refreshSignedInIdentity() {
      if (!getAccessToken()) {
        if (alive) setSignedInGmfnId("");
        return;
      }

      const meRes = await getMe().catch(() => null);
      if (!alive) return;
      setSignedInGmfnId(
        firstMeaningful(meRes?.gmfn_id, meRes?.gmfnId, getStoredGmfnId())
      );
    }

    function scheduleIdentityRefresh() {
      if (refreshFrame !== null) return;
      refreshFrame = window.requestAnimationFrame(() => {
        refreshFrame = null;
        void refreshSignedInIdentity();
      });
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") scheduleIdentityRefresh();
    }

    scheduleIdentityRefresh();
    window.addEventListener("focus", scheduleIdentityRefresh);
    window.addEventListener("storage", scheduleIdentityRefresh);
    window.addEventListener("GSN_AUTH_SESSION_CHANGED", scheduleIdentityRefresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      alive = false;
      window.removeEventListener("focus", scheduleIdentityRefresh);
      window.removeEventListener("storage", scheduleIdentityRefresh);
      window.removeEventListener("GSN_AUTH_SESSION_CHANGED", scheduleIdentityRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (refreshFrame !== null) window.cancelAnimationFrame(refreshFrame);
    };
  }, [shopReconnectRetryKey]);

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

    function applyPublicShop(
      publicShopRes: any,
      clanRes: any,
      cleanedGmfnId: string,
      viewerSpotlightRows?: any[] | null,
      publicDiaryRows?: ShopDiaryEntryRecord[] | null,
      ownerInspection?: OwnerSpotlightInspection | null
    ) {
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
      const arrangedProducts = arrangeProductsByPublicBlock(normalizedProducts, normalizedShop?.publicSlotsTotal);

      const relevantGmfnId = firstMeaningful(
        normalizedShop?.gmfnId,
        cleanedGmfnId
      );

      const publicBroadcasts = [
        publicShopRes?.primary_broadcast,
        publicShopRes?.primaryBroadcast,
        ...rowsOf<any>(publicShopRes?.broadcasts),
      ].filter(Boolean);
      const ownerInspectionBroadcast = normalizeBroadcast(ownerInspection?.item);
      const spotlightRequestFailed = viewerSpotlightRows === undefined;
      const viewerBroadcasts = spotlightRequestFailed
        ? []
        : Array.isArray(viewerSpotlightRows)
        ? viewerSpotlightRows
        : publicBroadcasts;
      const spotlightBroadcasts = ownerSpotlightInspectionMode
        ? [ownerInspectionBroadcast, ...viewerBroadcasts].filter(Boolean)
        : viewerBroadcasts;

      const publicOwnerBroadcast = publicBroadcasts
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
      const relevantBroadcast = ownerSpotlightInspectionMode
        ? ownerInspectionBroadcast
        : publicOwnerBroadcast;

      if (!alive) return;
      const retainedCanonicalBroadcasts = communitySpotlightsRef.current.filter(
        (item) => publicShopSpotlightPresentationIsCurrent(item) && broadcastIsActive(item)
      );
      const normalizedBroadcastCandidates = [
        ...spotlightBroadcasts
        .map((row) => normalizeBroadcast(row))
        .filter(Boolean)
        .filter(broadcastIsActive),
        ...retainedCanonicalBroadcasts,
      ] as ShopBroadcast[];
      const freshPresentationKey = firstMeaningful(
        ...viewerBroadcasts.map((row) => {
          const normalized = normalizeBroadcast(row);
          return normalized?.isCanonicalOpportunity &&
            !normalized.isCanonicalReplay &&
            normalized.opportunityPresentationToken
            ? normalized.opportunityPresentationId
            : "";
        })
      );
      const normalizedBroadcastKeys = new Set<string>();
      const normalizedBroadcasts = normalizedBroadcastCandidates
        .filter((item) => {
          const key = firstMeaningful(
            item.opportunityPresentationId,
            spotlightBroadcastKey(item)
          );
          if (!key || normalizedBroadcastKeys.has(key)) return false;
          normalizedBroadcastKeys.add(key);
          return true;
        })
        .sort((a, b) => {
          const weightDelta =
            Number(b?.rotationWeight || 1) - Number(a?.rotationWeight || 1);
          if (weightDelta !== 0) return weightDelta;
          const timeDelta =
            spotlightBroadcastSortValue(b) - spotlightBroadcastSortValue(a);
          if (timeDelta !== 0) return timeDelta;
          return spotlightBroadcastKey(a).localeCompare(spotlightBroadcastKey(b));
        });
      const ownerInspectionSpotlight = ownerSpotlightInspectionMode && relevantBroadcast
        ? normalizedBroadcasts.find(
            (item) => spotlightBroadcastKey(item) === spotlightBroadcastKey(relevantBroadcast)
          ) || relevantBroadcast
        : null;
      const ownerInspectionKey = spotlightBroadcastKey(ownerInspectionSpotlight);
      const weightedViewerRotationBroadcasts = buildSpotlightRotationQueue(
        normalizedBroadcasts.filter(
          (item) => spotlightBroadcastKey(item) !== ownerInspectionKey
        )
      );
      const freshPresentationIndex = freshPresentationKey
        ? weightedViewerRotationBroadcasts.findIndex(
            (item) => item.opportunityPresentationId === freshPresentationKey
          )
        : -1;
      const viewerRotationBroadcasts = freshPresentationIndex > 0
        ? [
            weightedViewerRotationBroadcasts[freshPresentationIndex],
            ...weightedViewerRotationBroadcasts.slice(0, freshPresentationIndex),
            ...weightedViewerRotationBroadcasts.slice(freshPresentationIndex + 1),
          ]
        : weightedViewerRotationBroadcasts;
      const rotationBroadcasts = ownerSpotlightPreviewAuthorized
        ? ownerInspectionSpotlight
          ? [ownerInspectionSpotlight]
          : []
        : ownerInspectionSpotlight
        ? [ownerInspectionSpotlight, ...viewerRotationBroadcasts]
        : viewerRotationBroadcasts;
      const currentSpotlight =
        communitySpotlightsRef.current[miniSpotlightIndexRef.current] ||
        communitySpotlightsRef.current[0] ||
        null;
      const currentKey = spotlightBroadcastKey(currentSpotlight);
      const matchedSpotlightIndex = ownerSpotlightPreviewAuthorized
        ? 0
        : currentKey
        ? rotationBroadcasts.findIndex(
            (item) => spotlightBroadcastKey(item) === currentKey
          )
        : -1;

      setCurrentClan(clanRes || null);
      setShop(normalizedShop);
      setPublicShopVerification(publicShopRes?.verification || null);
      setProducts(arrangedProducts);
      setShopDiaryEntries(
        Array.isArray(publicDiaryRows)
          ? publicDiaryRows
          : Array.isArray(publicShopRes?.shop_diary_entries)
          ? publicShopRes.shop_diary_entries
          : []
      );
      setBroadcast(relevantBroadcast);
      setOwnerSpotlightInspection(
        ownerSpotlightInspectionMode ? ownerInspection || null : null
      );
      setCommunitySpotlights(rotationBroadcasts);
      setMiniSpotlightIndex(
        rotationBroadcasts.length <= 0
          ? 0
          : matchedSpotlightIndex >= 0
          ? matchedSpotlightIndex
          : 0
      );
    }

    async function loadPublicShop(
      cleanedGmfnId: string,
      options: { useCommunityScope?: boolean } = {}
    ) {
      if (!cleanedGmfnId) return null;

      const useCommunityScope = options.useCommunityScope !== false;
      const publicShopRes = await getPublicMarketplaceShopByGmfnId(cleanedGmfnId, {
        clan_id: useCommunityScope && routeClanId > 0 ? routeClanId : undefined,
        product_id: routeProductId > 0 ? routeProductId : undefined,
        product_limit: 100,
        broadcast_limit: 24,
      });

      return publicShopRes;
    }

    async function loadPublicShopDiaryRows(
      cleanedGmfnId: string,
      publicShopRes: any,
      options: { useCommunityScope?: boolean } = {}
    ) {
      const diaryGmfnId = firstMeaningful(publicShopRes?.gmfn_id, cleanedGmfnId);
      if (!diaryGmfnId) return null;

      const useCommunityScope = options.useCommunityScope !== false;
      const scopedClanId = useCommunityScope
        ? positiveNumber(publicShopRes?.clan_id || routeClanId)
        : 0;
      const scopedRes = await getPublicShopDiaryEntries(diaryGmfnId, {
        clan_id: scopedClanId > 0 ? scopedClanId : undefined,
        entry_id: routeDiaryEntryId > 0 ? routeDiaryEntryId : undefined,
        limit: 12,
      }).catch(() => null);
      const scopedRows = Array.isArray(scopedRes?.items) ? scopedRes.items : null;

      if (!useCommunityScope || scopedClanId <= 0 || (scopedRows && scopedRows.length > 0)) {
        return scopedRows;
      }

      const unscopedRes = await getPublicShopDiaryEntries(diaryGmfnId, {
        entry_id: routeDiaryEntryId > 0 ? routeDiaryEntryId : undefined,
        limit: 12,
      }).catch(() => null);
      return Array.isArray(unscopedRes?.items) ? unscopedRes.items : scopedRows;
    }

    async function loadViewerSpotlightRows(cleanedGmfnId: string) {
      if (!getAccessToken()) return null;
      if (ownerSpotlightPreviewAuthorized) return [];

      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        const cycleKey = publicShopSpotlightSelectionCycleKey(cleanedGmfnId);
        const currentCycle = cycleKey
          ? publicShopSpotlightSelectionCycles.get(cycleKey)
          : undefined;
        return publicShopSpotlightCycleIsAuthoritative(currentCycle, Date.now())
          ? currentCycle?.items || []
          : [];
      }

      const canRequestCanonicalPresentation =
        safeStr(cleanedGmfnId) &&
        !ownerSpotlightPreviewAuthorized;

      if (canRequestCanonicalPresentation) {
        const opportunityItems = await loadPublicShopSpotlightPresentationCycle(
          cleanedGmfnId
        );
        if (opportunityItems !== null) return opportunityItems;
      }

      const res = await getMarketplaceBroadcasts({
        clan_id: null,
        active_only: true,
        limit: 24,
      }).catch(() => null);

      const items = Array.isArray(res)
        ? res
        : Array.isArray((res as any)?.items)
        ? (res as any).items
        : [];

      return items.length > 0 ? items : null;
    }

    async function loadViewerSpotlightRowsWithFeedback(cleanedGmfnId: string) {
      try {
        const rows = await loadViewerSpotlightRows(cleanedGmfnId);
        if (alive) setSpotlightFeedError('');
        return rows;
      } catch (err: any) {
        if (alive) {
          const status = Number(err?.status || 0);
          setSpotlightFeedError(
            status === 401
              ? 'Your sign-in could not refresh community Spotlight. The last valid showing is kept while GSN retries; sign in again if this continues.'
              : 'Community Spotlight could not refresh. The last valid showing is kept while GSN retries automatically.'
          );
        }
        return undefined;
      }
    }

    async function loadOwnerSpotlightInspection(
      publicShopRes: any
    ): Promise<OwnerSpotlightInspection | null> {
      if (!ownerSpotlightInspectionMode) return null;

      const shopId = positiveNumber(
        publicShopRes?.item?.id || publicShopRes?.shop?.id || publicShopRes?.shop_id
      );
      if (!shopId) {
        return {
          state: "unavailable",
          campaign: null,
          item: null,
          counts_as_delivery: false,
          counts_as_exposure: false,
        };
      }

      const statusRes = await getMarketplaceShopSpotlightStatus(shopId).catch(
        () => null
      );
      const inspection = statusRes?.owner_spotlight_inspection;
      if (inspection && typeof inspection === "object") {
        return inspection as OwnerSpotlightInspection;
      }
      return {
        state: "unavailable",
        campaign: null,
        item: null,
        counts_as_delivery: false,
        counts_as_exposure: false,
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
        description: "Public GSN shop face for visible product records.",
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
      const requestGeneration = ++spotlightRefreshGenerationRef.current;
      if (showPageLoading) {
        setLoading(true);
      }
      setError("");
      setAutoRefreshingShop(false);

      try {
        const cleanedGmfnId = safeStr(gmfnId || "");
        let effectiveGmfnId = cleanedGmfnId;
        const clanRes = getAccessToken()
          ? await getCurrentClan().catch(() => null)
          : null;
        let publicShopRes: any = null;
        let viewerSpotlightRows: any[] | null | undefined = null;
        let publicDiaryRows: ShopDiaryEntryRecord[] | null = null;
        let ownerInspection: OwnerSpotlightInspection | null = null;

        try {
          publicShopRes = await loadPublicShop(cleanedGmfnId);
          if (ownerSpotlightInspectionMode) {
            ownerInspection = await loadOwnerSpotlightInspection(publicShopRes);
          }
          viewerSpotlightRows = await loadViewerSpotlightRowsWithFeedback(
            cleanedGmfnId
          );
          publicDiaryRows = await loadPublicShopDiaryRows(cleanedGmfnId, publicShopRes);
        } catch (err: any) {
          const message = safeStr(err?.message);
          if (
            routeClanId > 0 &&
            explicitRouteClanId <= 0 &&
            isDisconnectedPublicShopError(message)
          ) {
            publicShopRes = await loadPublicShop(cleanedGmfnId, {
              useCommunityScope: false,
            }).catch(() => null);
            if (publicShopRes) {
              if (ownerSpotlightInspectionMode) {
                ownerInspection = await loadOwnerSpotlightInspection(publicShopRes);
              }
              viewerSpotlightRows = await loadViewerSpotlightRowsWithFeedback(
                cleanedGmfnId
              );
              publicDiaryRows = await loadPublicShopDiaryRows(
                cleanedGmfnId,
                publicShopRes,
                { useCommunityScope: false }
              );
              if (
                !alive ||
                requestGeneration !== spotlightRefreshGenerationRef.current
              ) {
                return;
              }
              applyPublicShop(
                publicShopRes,
                clanRes,
                effectiveGmfnId,
                viewerSpotlightRows,
                publicDiaryRows,
                ownerInspection
              );
              return;
            }
          }

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
          if (ownerSpotlightInspectionMode) {
            ownerInspection = await loadOwnerSpotlightInspection(publicShopRes);
          }
          viewerSpotlightRows = await loadViewerSpotlightRowsWithFeedback(
            cleanedGmfnId
          );
          publicDiaryRows = await loadPublicShopDiaryRows(effectiveGmfnId, publicShopRes);
          if (alive) {
            setNotice({
              tone: "success",
              text: ownerSurfaceIdentityMatches(refreshedGmfnId, cleanedGmfnId)
                ? "Public shop reconnected. Products & Services is ready."
                : "Stale shop link refreshed to your current GSN shop.",
            });
          }
        }

        if (!alive || requestGeneration !== spotlightRefreshGenerationRef.current) {
          return;
        }
        applyPublicShop(
          publicShopRes,
          clanRes,
          effectiveGmfnId,
          viewerSpotlightRows,
          publicDiaryRows,
          ownerInspection
        );
      } catch (err: any) {
        if (!alive || requestGeneration !== spotlightRefreshGenerationRef.current) return;
        const message = safeStr(err?.message);
        setError(publicShopReconnectErrorMessage(message));
      } finally {
        if (alive && requestGeneration === spotlightRefreshGenerationRef.current) {
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
      spotlightRefreshGenerationRef.current += 1;
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
  }, [
    explicitRouteClanId,
    gmfnId,
    ownerSpotlightInspectionMode,
    ownerSpotlightPreviewAuthorized,
    routeClanId,
    routeDiaryEntryId,
    routeProductId,
    shopReconnectRetryKey,
  ]);

  useEffect(() => {
    setMiniSpotlightIndex(0);
    spotlightQualifiedKeysRef.current.clear();
    spotlightQualificationInFlightKeysRef.current.clear();
    spotlightNextRequestPendingRef.current = false;
    spotlightNextEmptyUntilRef.current = 0;
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

      if (
        targetId === PUBLIC_SHOP_SPOTLIGHT_ANCHOR ||
        (targetId === PUBLIC_SHOP_DIARIES_ANCHOR && routeDiaryEntryId > 0)
      ) {
        target.scrollIntoView({ block: "start", inline: "nearest", behavior: "auto" });
        return;
      }

      revealElementWithoutJump(target, {
        surface: "public-shop",
        targetId,
        reason: "hash-landing",
      });
    },
    [routeDiaryEntryId]
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
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSpotlightReducedMotion(Boolean(query.matches));
    update();
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    }
    query.addListener(update);
    return () => query.removeListener(update);
  }, []);

  const spotlightRotationItemCount = useMemo(() => {
    const uniqueKeys = new Set(
      communitySpotlights.map(spotlightBroadcastKey).filter(Boolean)
    );
    return Math.max(uniqueKeys.size, communitySpotlights.length > 0 ? 1 : 0);
  }, [communitySpotlights]);

  useEffect(() => {
    if (communitySpotlights.length <= 1) return;

    const timer = window.setInterval(() => {
      const hidden =
        typeof document !== "undefined" && document.visibilityState !== "visible";
      const interactionPaused = Date.now() < spotlightInteractionPausedUntilRef.current;
      if (hidden || interactionPaused || spotlightHasKeyboardFocus) return;
      setMiniSpotlightIndex((prev) => (prev + 1) % communitySpotlights.length);
    }, spotlightReducedMotion
      ? PUBLIC_SHOP_SPOTLIGHT_REDUCED_MOTION_ROTATION_MS
      : publicShopSpotlightRotationMs(spotlightRotationItemCount));

    return () => window.clearInterval(timer);
  }, [
    communitySpotlights.length,
    spotlightHasKeyboardFocus,
    spotlightInteractionPausedUntil,
    spotlightReducedMotion,
    spotlightRotationItemCount,
  ]);

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
      if (products.indexOf(matchedProduct) >= gallerySlotsTotal) {
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
    gallerySlotsTotal,
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
      clanId: shop?.clanId,
      ownerUserId: shop?.ownerUserId,
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
      followerCount: positiveNumber(shop?.followerCount),
      publicSlotsTotal: clampGallerySlotsTotal(shop?.publicSlotsTotal),
    };
  }, [shop, broadcast, gmfnId, currentClan]);

  useEffect(() => {
    const shopId = positiveNumber(effectiveShop?.id);
    const fallbackCount = positiveNumber(effectiveShop?.followerCount);
    const token = getAccessToken();

    if (!shopId) {
      setShopFollowState({
        isFollowing: false,
        canFollow: false,
        isOwner: false,
        followerCount: fallbackCount,
        loading: false,
        busy: false,
      });
      return;
    }

    if (!token) {
      setShopFollowState((current) => ({
        ...current,
        isFollowing: false,
        canFollow: false,
        isOwner: false,
        followerCount: fallbackCount,
        loading: false,
      }));
      return;
    }

    let alive = true;
    setShopFollowState((current) => ({
      ...current,
      followerCount: fallbackCount,
      loading: true,
    }));

    getMarketplaceShopFollowStatus(shopId)
      .then((res) => {
        if (!alive) return;
        const count = positiveNumber(res?.follower_count || res?.followers_count);
        setShopFollowState((current) => ({
          ...current,
          isFollowing: Boolean(res?.is_following),
          canFollow: Boolean(res?.can_follow),
          isOwner: Boolean(res?.is_owner),
          followerCount: count,
          loading: false,
        }));
      })
      .catch(() => {
        if (!alive) return;
        setShopFollowState((current) => ({
          ...current,
          isFollowing: false,
          canFollow: false,
          isOwner: false,
          followerCount: fallbackCount,
          loading: false,
        }));
      });

    return () => {
      alive = false;
    };
  }, [effectiveShop?.followerCount, effectiveShop?.id]);

  const trackMarketplaceAttention = useCallback(
    function trackMarketplaceAttention(
      eventType: Parameters<typeof recordMarketplaceAttentionEvent>[0]["event_type"],
      payload: Omit<Parameters<typeof recordMarketplaceAttentionEvent>[0], "event_type"> = {},
      options?: { allowShopFallback?: boolean }
    ) {
      const allowShopFallback = options?.allowShopFallback !== false;
      const explicitShopId = positiveNumber(payload.shop_id);
      const fallbackShopId = allowShopFallback ? positiveNumber(effectiveShop?.id) : 0;
      const shopId = explicitShopId || fallbackShopId;
      if (!shopId) return;

      const clanId = positiveNumber(payload.clan_id) || positiveNumber(effectiveShop?.clanId) || undefined;

      return recordMarketplaceAttentionEvent({
        ...payload,
        event_type: eventType,
        shop_id: shopId,
        clan_id: clanId,
      }).catch(() => undefined);
    },
    [effectiveShop?.clanId, effectiveShop?.id]
  );

  const pauseSpotlightPresentationRotation = useCallback(() => {
    const pausedUntil = Date.now() + PUBLIC_SHOP_SPOTLIGHT_INTERACTION_PAUSE_MS;
    spotlightInteractionPausedUntilRef.current = pausedUntil;
    setSpotlightInteractionPausedUntil(pausedUntil);
  }, []);

  const requestNextCanonicalSpotlight = useCallback(async () => {
    const cleanedGmfnId = safeStr(gmfnId);
    if (
      !cleanedGmfnId ||
      ownerSpotlightPreviewAuthorized ||
      spotlightNextRequestPendingRef.current ||
      Date.now() < spotlightNextEmptyUntilRef.current
    ) {
      return;
    }

    spotlightNextRequestPendingRef.current = true;
    try {
      const nextItems = await loadNextPublicShopSpotlightPresentations(
        cleanedGmfnId
      );
      if (nextItems.length <= 0) {
        spotlightNextEmptyUntilRef.current = Date.now() + SPOTLIGHT_PILOT_REFRESH_MS;
        return;
      }
      spotlightNextEmptyUntilRef.current = 0;
      setCommunitySpotlights((current) => {
        const retained = current.filter(
          (item) =>
            !item.isCanonicalOpportunity ||
            publicShopSpotlightPresentationIsCurrent(item)
        );
        const nextCampaignIds = new Set(
          nextItems.map((item) => positiveNumber(item.opportunityCampaignId)).filter(Boolean)
        );
        const nextPresentationIds = new Set(
          nextItems.map((item) => firstMeaningful(item.opportunityPresentationId)).filter(Boolean)
        );
        const ownerPrefix =
          ownerSpotlightInspectionMode &&
          retained[0] &&
          !retained[0].isCanonicalOpportunity
            ? [retained[0]]
            : [];
        const viewerCandidates = [
          ...nextItems,
          ...retained.slice(ownerPrefix.length).filter((item) => {
            const campaignId = positiveNumber(item.opportunityCampaignId);
            const presentationId = firstMeaningful(item.opportunityPresentationId);
            return !(
              (campaignId > 0 && nextCampaignIds.has(campaignId)) ||
              (presentationId && nextPresentationIds.has(presentationId))
            );
          }),
        ];
        const seen = new Set<string>();
        const uniqueViewerCandidates = viewerCandidates.filter((item) => {
          const key = firstMeaningful(
            item.opportunityPresentationId,
            spotlightBroadcastKey(item)
          );
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        const weightedQueue = buildSpotlightRotationQueue(uniqueViewerCandidates);
        const firstNextKey = firstMeaningful(
          nextItems[0]?.opportunityPresentationId,
          spotlightBroadcastKey(nextItems[0])
        );
        const freshIndex = firstNextKey
          ? weightedQueue.findIndex(
              (item) =>
                firstMeaningful(
                  item.opportunityPresentationId,
                  spotlightBroadcastKey(item)
                ) === firstNextKey
            )
          : -1;
        const prioritizedQueue = freshIndex > 0
          ? [
              weightedQueue[freshIndex],
              ...weightedQueue.slice(0, freshIndex),
              ...weightedQueue.slice(freshIndex + 1),
            ]
          : weightedQueue;
        const nextQueue = [...ownerPrefix, ...prioritizedQueue];
        const activeItem = current[miniSpotlightIndexRef.current];
        const activeKey = firstMeaningful(
          activeItem?.opportunityPresentationId,
          spotlightBroadcastKey(activeItem)
        );
        const activeIndex = activeKey
          ? nextQueue.findIndex(
              (item) =>
                firstMeaningful(
                  item.opportunityPresentationId,
                  spotlightBroadcastKey(item)
                ) === activeKey
            )
          : -1;
        if (activeIndex < 0) return nextQueue;

        const circularQueue = [
          nextQueue[activeIndex],
          ...nextQueue.slice(0, activeIndex),
          ...nextQueue.slice(activeIndex + 1),
        ];
        const retainedIndex = Math.min(
          miniSpotlightIndexRef.current,
          circularQueue.length - 1
        );
        return retainedIndex > 0
          ? [
              ...circularQueue.slice(circularQueue.length - retainedIndex),
              ...circularQueue.slice(0, circularQueue.length - retainedIndex),
            ]
          : circularQueue;
      });
    } finally {
      spotlightNextRequestPendingRef.current = false;
    }
  }, [gmfnId, ownerSpotlightInspectionMode, ownerSpotlightPreviewAuthorized]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextExpiryMs = communitySpotlights
      .filter((item) => item.isCanonicalOpportunity)
      .map(publicShopSpotlightPresentationDeadlineMs)
      .filter((value) => Number.isFinite(value) && value > Date.now())
      .sort((a, b) => a - b)[0];
    if (!nextExpiryMs) return;

    const expiryTimer = window.setTimeout(() => {
      prunePublicShopSpotlightSelectionCycles(Date.now());
      setCommunitySpotlights((current) =>
        current.filter(
          (item) =>
            !item.isCanonicalOpportunity ||
            publicShopSpotlightPresentationIsCurrent(item)
        )
      );
      spotlightNextEmptyUntilRef.current = 0;
      void requestNextCanonicalSpotlight();
    }, Math.max(nextExpiryMs - Date.now() + 25, 25));

    return () => window.clearTimeout(expiryTimer);
  }, [communitySpotlights, requestNextCanonicalSpotlight]);
  useEffect(() => {
    if (loading || error) return;
    const shopId = positiveNumber(effectiveShop?.id);
    if (!shopId) return;

    trackMarketplaceAttention("shop_visit", {
      source: "public_shop_gallery",
    });
  }, [effectiveShop?.id, error, loading, trackMarketplaceAttention]);

  useEffect(() => {
    if (loading || error || openProductId === null) return;
    const openedProduct = products.find(
      (product) => (product.id ?? product.slotNumber) === openProductId
    );
    const productId = positiveNumber(openedProduct?.id);
    if (!openedProduct || !productId || typeof document === "undefined") return;

    const qualificationKey = `product-media:${productId}`;
    if (productMediaQualifiedKeysRef.current.has(qualificationKey)) return;
    const target = document.querySelector<HTMLElement>(
      `[data-product-media-attention-id="${productId}"]`
    );
    if (!target) return;

    let alive = true;
    let visibleSince = 0;
    let visibleRatio = 0;
    let qualificationTimer: number | null = null;

    function clearQualificationTimer() {
      if (qualificationTimer !== null) {
        window.clearTimeout(qualificationTimer);
        qualificationTimer = null;
      }
    }

    function documentIsVisible() {
      return document.visibilityState === "visible";
    }

    function recordQualifiedProductMedia() {
      if (
        !alive ||
        productMediaQualifiedKeysRef.current.has(qualificationKey) ||
        productMediaQualificationInFlightKeysRef.current.has(qualificationKey)
      ) return;

      productMediaQualificationInFlightKeysRef.current.add(qualificationKey);
      const visibleMs = Math.max(
        PUBLIC_SHOP_SPOTLIGHT_QUALIFYING_VISIBLE_MS,
        visibleSince > 0
          ? Date.now() - visibleSince
          : PUBLIC_SHOP_SPOTLIGHT_QUALIFYING_VISIBLE_MS
      );
      void trackMarketplaceAttention("product_open", {
        product_id: productId,
        source: "public_shop_product_visible",
        visible_ms: visibleMs,
        visible_ratio: Math.min(1, Math.max(visibleRatio, 0)),
        document_visible: true,
      })?.then((result) => {
        productMediaQualificationInFlightKeysRef.current.delete(qualificationKey);
        if (!alive) return;
        if (result?.recorded === true || result?.deduped === true) {
          productMediaQualifiedKeysRef.current.add(qualificationKey);
          return;
        }
        visibleSince = 0;
      });
    }

    function evaluateQualification() {
      clearQualificationTimer();
      if (
        !alive ||
        productMediaQualifiedKeysRef.current.has(qualificationKey) ||
        productMediaQualificationInFlightKeysRef.current.has(qualificationKey)
      ) return;
      if (
        !documentIsVisible() ||
        visibleRatio < PUBLIC_SHOP_SPOTLIGHT_MIN_VISIBLE_RATIO
      ) {
        visibleSince = 0;
        return;
      }

      if (visibleSince <= 0) visibleSince = Date.now();
      const remaining =
        PUBLIC_SHOP_SPOTLIGHT_QUALIFYING_VISIBLE_MS -
        (Date.now() - visibleSince);
      if (remaining <= 0) {
        recordQualifiedProductMedia();
        return;
      }
      qualificationTimer = window.setTimeout(evaluateQualification, remaining);
    }

    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              const entry = entries[0];
              visibleRatio = entry?.isIntersecting
                ? Number(entry.intersectionRatio || 0)
                : 0;
              evaluateQualification();
            },
            { threshold: [0, PUBLIC_SHOP_SPOTLIGHT_MIN_VISIBLE_RATIO, 1] }
          )
        : null;

    function handleVisibilityChange() {
      if (!documentIsVisible()) {
        visibleSince = 0;
        clearQualificationTimer();
        return;
      }
      evaluateQualification();
    }

    if (observer) {
      observer.observe(target);
    } else {
      visibleRatio = 1;
      evaluateQualification();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      alive = false;
      clearQualificationTimer();
      observer?.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [error, loading, openProductId, products, trackMarketplaceAttention]);

  const handleFollowShop = useCallback(async () => {
    const shopId = positiveNumber(effectiveShop?.id);
    if (!getAccessToken()) {
      setNotice({
        tone: "error",
        text: "Sign in to follow this shop and keep it in your GSN updates.",
      });
      return;
    }
    if (!shopId) {
      setNotice({
        tone: "error",
        text: "This shop is still loading. Try again in a moment.",
      });
      return;
    }

    setShopFollowState((current) => ({ ...current, busy: true }));
    try {
      const res = await followMarketplaceShop(shopId);
      const count = positiveNumber(res?.follower_count || res?.followers_count);
      setShopFollowState((current) => ({
        ...current,
        isFollowing: true,
        canFollow: true,
        followerCount: count,
        busy: false,
      }));
      setNotice({
        tone: "success",
        text:
          "Shop followed. You will see this shop in your GSN updates. This does not verify the seller or approve goods, credit, or payment.",
      });
    } catch (err: any) {
      setShopFollowState((current) => ({ ...current, busy: false }));
      setNotice({
        tone: "error",
        text: safeStr(err?.message) || "GSN could not follow this shop right now.",
      });
    }
  }, [effectiveShop?.id]);

  const handleUnfollowShop = useCallback(async () => {
    const shopId = positiveNumber(effectiveShop?.id);
    if (!shopId) return;

    setShopFollowState((current) => ({ ...current, busy: true }));
    try {
      const res = await unfollowMarketplaceShop(shopId);
      const count = positiveNumber(res?.follower_count || res?.followers_count);
      setShopFollowState((current) => ({
        ...current,
        isFollowing: false,
        canFollow: true,
        followerCount: count,
        busy: false,
      }));
      setNotice({
        tone: "success",
        text:
          "Shop unfollowed. This shop will no longer stay in your GSN updates.",
      });
    } catch (err: any) {
      setShopFollowState((current) => ({ ...current, busy: false }));
      setNotice({
        tone: "error",
        text: safeStr(err?.message) || "GSN could not unfollow this shop right now.",
      });
    }
  }, [effectiveShop?.id]);

  useEffect(() => {
    if (products.length <= gallerySlotsTotal && showAllProducts) {
      setShowAllProducts(false);
    }
  }, [gallerySlotsTotal, products.length, showAllProducts]);

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
    return showAllProducts ? products : products.slice(0, gallerySlotsTotal);
  }, [focusedBlockLinkActive, focusedBlockProduct, gallerySlotsTotal, products, showAllProducts]);

  const overflowProductCount = focusedBlockLinkActive
    ? 0
    : Math.max(0, products.length - gallerySlotsTotal);

  const liveShopDiaryEntries = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return shopDiaryEntries
      .filter((entry) => {
        const timestamp = Date.parse(String(entry.occurred_at || entry.created_at || ""));
        return Number.isFinite(timestamp) && timestamp >= cutoff;
      })
      .slice(0, 1);
  }, [shopDiaryEntries]);
  const featuredDiaryEntry = liveShopDiaryEntries[0] || null;

  const heroImage = useMemo(() => {
    return effectiveShop?.imageUrl || "";
  }, [effectiveShop]);

  const miniSpotlight = useMemo(() => {
    if (communitySpotlights.length === 0) return null;
    return communitySpotlights[miniSpotlightIndex % communitySpotlights.length] || communitySpotlights[0];
  }, [communitySpotlights, miniSpotlightIndex]);
  const ownerInspectionSpotlightKey = spotlightBroadcastKey(
    normalizeBroadcast(ownerSpotlightInspection?.item)
  );
  const miniSpotlightIsOwnerInspection = Boolean(
    ownerSpotlightInspectionMode &&
      miniSpotlight &&
      ownerInspectionSpotlightKey &&
      spotlightBroadcastKey(miniSpotlight) === ownerInspectionSpotlightKey
  );

  const miniSpotlightView = useMemo(() => {
    if (!miniSpotlight) {
      return {
        title: "Discover what's new",
        detail: "No live community spotlight is attached to this shop context yet.",
        priceLabel: "",
        sourceShopWhatsApp: "",
        imageUrl: "",
        videoUrl: "",
      };
    }

    const messageParts = splitSpotlightMessage(miniSpotlight?.message);

    return {
      title: firstMeaningful(
        miniSpotlight?.sourceProductTitle,
        miniSpotlight?.spotlightTitle,
        messageParts.summary,
        "Live Spotlight"
      ),
      detail: firstMeaningful(
        miniSpotlight?.sourceProductDescription,
        miniSpotlight?.spotlightDescription,
        messageParts.summary,
        "Live Spotlight from another shop in this community."
      ),
      priceLabel: firstMeaningful(
        [miniSpotlight?.sourceProductCurrency, miniSpotlight?.sourceProductPrice]
          .filter(Boolean)
          .join(" "),
        miniSpotlight?.sourceProductPrice
      ),
      sourceShopWhatsApp: firstMeaningful(miniSpotlight?.sourceShopWhatsApp),
      imageUrl: firstMeaningful(
        miniSpotlight?.sourceProductImageUrl,
        miniSpotlight?.imageUrl
      ),
      videoUrl: firstMeaningful(
        miniSpotlight?.sourceProductVideoUrl,
        miniSpotlight?.videoUrl
      ),
    };
  }, [miniSpotlight]);

  const spotlightMediaKey = miniSpotlight
    ? [
        spotlightBroadcastKey(miniSpotlight),
        miniSpotlightView.imageUrl,
        miniSpotlightView.videoUrl,
      ].join('|')
    : '';
  const spotlightHasRenderableMedia = Boolean(
    miniSpotlightView.imageUrl || miniSpotlightView.videoUrl
  );

  useEffect(() => {
    setSpotlightMediaReadyKey('');
    setSpotlightMediaUnavailableKey('');
  }, [spotlightMediaKey]);

  const ownerSpotlightStatusView = useMemo(() => {
    if (!ownerSpotlightInspectionMode) return null;
    if (miniSpotlight && !miniSpotlightIsOwnerInspection) return null;

    const state = safeStr(ownerSpotlightInspection?.state || "unavailable").toLowerCase();
    const campaign = ownerSpotlightInspection?.campaign || null;
    const expiresAt = formatSpotlightInspectionTime(campaign?.authorized_expires_at);
    const entryLabel = ownerSpotlightPreviewAuthorized ? "Owner preview" : "Your Spotlight";

    if (state === "live" && miniSpotlight) {
      return {
        state,
        label: `${entryLabel} · Live`,
        title: miniSpotlightView.title,
        detail: "",
      };
    }
    if (state === "delivery_exhausted" && miniSpotlight) {
      return {
        state,
        label: `${entryLabel} · All showings used`,
        title: miniSpotlightView.title,
        detail: `${expiresAt ? `Saved until ${expiresAt}. ` : ""}All available Spotlight showings have been used. GSN is not starting another showing from this Spotlight.`,
      };
    }
    if (state === "correction_hold") {
      return {
        state,
        label: `${entryLabel} · Needs correction`,
        title: "Spotlight is paused for correction",
        detail: `${expiresAt ? `Original expiry remains ${expiresAt}. ` : ""}Time keeps running while it is paused.`,
      };
    }
    if (state === "withdrawn") {
      return {
        state,
        label: `${entryLabel} · Withdrawn`,
        title: "Spotlight was permanently removed",
        detail: "It is no longer being shown. Opening this owner view does not publish it again.",
      };
    }
    if (state === "expired") {
      return {
        state,
        label: `${entryLabel} · Expired`,
        title: "Spotlight has expired",
        detail: `${expiresAt ? `Expired ${expiresAt}. ` : ""}Opening this page does not restart it.`,
      };
    }
    if (state === "none") {
      return {
        state,
        label: `${entryLabel} · None saved`,
        title: "No Spotlight saved",
        detail: "This shop does not have a Spotlight yet. Shop updates remain separate.",
      };
    }
    if (state === "not_serving") {
      return {
        state,
        label: `${entryLabel} · Not showing`,
        title: "Spotlight is not currently being shown",
        detail: "The Spotlight is saved, but GSN is not showing it now. Opening this owner view does not restart it.",
      };
    }
    return {
      state: "unavailable",
      label: `${entryLabel} · Status unavailable`,
      title: "Spotlight status could not be confirmed",
      detail: "GSN cannot confirm the current Spotlight status. Refresh, or open Shop Control and try again.",
    };
  }, [
    miniSpotlight,
    miniSpotlightIsOwnerInspection,
    miniSpotlightView.title,
    ownerSpotlightInspection,
    ownerSpotlightInspectionMode,
    ownerSpotlightPreviewAuthorized,
  ]);

  useEffect(() => {
    if (
      loading ||
      error ||
      !miniSpotlight ||
      miniSpotlightIsOwnerInspection ||
      ownerSpotlightPreviewAuthorized ||
      !spotlightHasRenderableMedia ||
      !spotlightMediaKey ||
      spotlightMediaReadyKey !== spotlightMediaKey
    ) return;
    if (typeof window === "undefined") return;
    const activeSpotlight = miniSpotlight;

    // A canonical replay is continuity for a presentation already qualified by
    // this viewer. It must not qualify again or emit a second attention event.
    if (activeSpotlight.isCanonicalReplay) return;

    const target = spotlightRailRef.current;
    if (!target) return;

    const presentationKey = firstMeaningful(
      activeSpotlight.opportunityPresentationId,
      spotlightBroadcastKey(activeSpotlight)
    );
    if (!presentationKey || spotlightQualifiedKeysRef.current.has(presentationKey)) {
      return;
    }

    let alive = true;
    let visibleSince = 0;
    let qualificationTimer: number | null = null;

    function clearQualificationTimer() {
      if (qualificationTimer !== null) {
        window.clearTimeout(qualificationTimer);
        qualificationTimer = null;
      }
      if (spotlightQualificationTimerRef.current !== null) {
        window.clearTimeout(spotlightQualificationTimerRef.current);
        spotlightQualificationTimerRef.current = null;
      }
    }

    function currentDocumentVisible() {
      return typeof document === "undefined" || document.visibilityState === "visible";
    }

    function recordQualifiedPresentation() {
      if (
        !alive ||
        spotlightQualifiedKeysRef.current.has(presentationKey) ||
        spotlightQualificationInFlightKeysRef.current.has(presentationKey)
      ) return;

      const visibleRatio = Math.min(
        1,
        Math.max(PUBLIC_SHOP_SPOTLIGHT_MIN_VISIBLE_RATIO, spotlightVisibleRatioRef.current)
      );
      const visibleMs = Math.max(
        PUBLIC_SHOP_SPOTLIGHT_QUALIFYING_VISIBLE_MS,
        visibleSince > 0 ? Date.now() - visibleSince : PUBLIC_SHOP_SPOTLIGHT_QUALIFYING_VISIBLE_MS
      );
      const spotlightShopId = positiveNumber(activeSpotlight.shopId);
      const attentionClientEventId = `spotlight-attention:${presentationKey}`;

      function recordAcceptedAttention() {
        if (!spotlightShopId) return;
        trackMarketplaceAttention(
          "spotlight_impression",
          {
            shop_id: spotlightShopId,
            broadcast_id: positiveNumber(activeSpotlight.id) || undefined,
            product_id: positiveNumber(activeSpotlight.sourceProductId) || undefined,
            clan_id: positiveNumber(activeSpotlight.sourceClanId) || undefined,
            source: activeSpotlight.isCanonicalOpportunity
              ? "public_shop_spotlight_canonical_visible"
              : "public_shop_spotlight_legacy_visible",
            client_event_id: attentionClientEventId,
          },
          { allowShopFallback: false }
        );
      }

      if (
        activeSpotlight.isCanonicalOpportunity &&
        activeSpotlight.opportunityPresentationToken
      ) {
        spotlightQualificationInFlightKeysRef.current.add(presentationKey);
        void qualifySpotlightPresentation({
          presentation_token: activeSpotlight.opportunityPresentationToken,
          qualification_key: presentationKey,
          visible_ms: Math.round(visibleMs),
          visible_ratio: visibleRatio,
          document_visible: currentDocumentVisible(),
          owner_preview: false,
        })
          .then((result) => {
            spotlightQualificationInFlightKeysRef.current.delete(presentationKey);
            const accepted = Boolean(
              result?.ok === true ||
              result?.recorded === true ||
              result?.deduped === true
            );
            if (!accepted) {
              if (alive) {
                visibleSince = 0;
                qualificationTimer = window.setTimeout(
                  evaluateQualification,
                  750
                );
                spotlightQualificationTimerRef.current = qualificationTimer;
              }
              return;
            }
            spotlightQualifiedKeysRef.current.add(presentationKey);
            recordAcceptedAttention();
            void requestNextCanonicalSpotlight();
          })
          .catch(() => {
            spotlightQualificationInFlightKeysRef.current.delete(presentationKey);
            if (!alive) return;
            visibleSince = 0;
            qualificationTimer = window.setTimeout(evaluateQualification, 1000);
            spotlightQualificationTimerRef.current = qualificationTimer;
          });
        return;
      }

      spotlightQualifiedKeysRef.current.add(presentationKey);
      recordAcceptedAttention();
    }

    function evaluateQualification() {
      clearQualificationTimer();
      if (
        !alive ||
        spotlightQualifiedKeysRef.current.has(presentationKey) ||
        spotlightQualificationInFlightKeysRef.current.has(presentationKey)
      ) return;
      if (!currentDocumentVisible()) {
        visibleSince = 0;
        return;
      }
      if (spotlightVisibleRatioRef.current < PUBLIC_SHOP_SPOTLIGHT_MIN_VISIBLE_RATIO) {
        visibleSince = 0;
        return;
      }

      if (visibleSince <= 0) visibleSince = Date.now();
      const elapsed = Date.now() - visibleSince;
      const remaining = PUBLIC_SHOP_SPOTLIGHT_QUALIFYING_VISIBLE_MS - elapsed;
      if (remaining <= 0) {
        recordQualifiedPresentation();
        return;
      }
      qualificationTimer = window.setTimeout(evaluateQualification, remaining);
      spotlightQualificationTimerRef.current = qualificationTimer;
    }

    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              const entry = entries[0];
              spotlightVisibleRatioRef.current = entry?.isIntersecting
                ? Number(entry.intersectionRatio || 0)
                : 0;
              evaluateQualification();
            },
            {
              threshold: [0, PUBLIC_SHOP_SPOTLIGHT_MIN_VISIBLE_RATIO, 1],
            }
          )
        : null;

    function handleVisibilityChange() {
      if (!currentDocumentVisible()) {
        visibleSince = 0;
        clearQualificationTimer();
        return;
      }
      if (
        activeSpotlight.isCanonicalOpportunity &&
        activeSpotlight.opportunityPresentationToken
      ) {
        void revalidateSpotlightPresentation(
          activeSpotlight.opportunityPresentationToken
        )
          .then((result) => {
            if (!alive) return;
            if (result?.valid === true) {
              evaluateQualification();
              return;
            }
            clearQualificationTimer();
            const cycleKey = publicShopSpotlightSelectionCycleKey(
              firstMeaningful(gmfnId)
            );
            if (cycleKey) publicShopSpotlightSelectionCycles.delete(cycleKey);
            window.dispatchEvent(new Event("focus"));
          })
          .catch(() => {
            clearQualificationTimer();
          });
        return;
      }
      evaluateQualification();
    }

    if (observer) {
      observer.observe(target);
    } else {
      spotlightVisibleRatioRef.current = 1;
      evaluateQualification();
    }

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      alive = false;
      clearQualificationTimer();
      observer?.disconnect();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [
    error,
    gmfnId,
    loading,
    miniSpotlight,
    miniSpotlightIsOwnerInspection,
    ownerSpotlightPreviewAuthorized,
    requestNextCanonicalSpotlight,
    spotlightHasRenderableMedia,
    spotlightMediaKey,
    spotlightMediaReadyKey,
    trackMarketplaceAttention,
  ]);

  const publicShopSpotlightActive = Boolean(miniSpotlight);
  const spotlightWhatsAppAvailable = Boolean(
    publicShopSpotlightActive &&
      normalizeWhatsAppRecipient(miniSpotlightView.sourceShopWhatsApp)
  );

  useEffect(() => {
    if (isCompact && publicShopSpotlightActive) {
      setShopMoreOpen(true);
    }
  }, [isCompact, publicShopSpotlightActive]);

  const absoluteShopLink = useMemo(() => {
    const ownerId = firstMeaningful(effectiveShop?.gmfnId, gmfnId);
    return ownerId ? publicShopUrl(ownerId) : "";
  }, [effectiveShop?.gmfnId, gmfnId]);

  const absoluteShopShareLink = useMemo(() => {
    const ownerId = firstMeaningful(effectiveShop?.gmfnId, gmfnId);
    return ownerId ? publicShopShareUrl({ gmfnId: ownerId }) : "";
  }, [effectiveShop?.gmfnId, gmfnId]);

  const attributedShopShareLink = useMemo(
    () => appendShopShareAttribution(absoluteShopShareLink, "share_shop"),
    [absoluteShopShareLink]
  );

  const attributedShopSocialLink = useMemo(() => {
    const ownerId = firstMeaningful(effectiveShop?.gmfnId, gmfnId);
    return ownerId
      ? appendShopShareAttribution(
          publicShopSocialPreviewUrl({ gmfnId: ownerId }),
          "share_shop"
        )
      : "";
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
  const marketplaceMemberShopsPath = routeWithCommunity(
    `${APP_ROUTES.MARKETPLACE}#marketplace-members-shops`,
    ownerSurfaceCommunityId
  );
  const ownerShopAnalyticsPath = routeWithCommunity(
    `${APP_ROUTES.SHOP_ME}#${OWNER_SHOP_HASHES.summary}`,
    ownerSurfaceCommunityId
  );
  const ownerShopDiaryPath = routeWithCommunity(
    `${APP_ROUTES.SHOP_ME}#shop-assets-diary`,
    ownerSurfaceCommunityId
  );
  const ownerSpotlightShortcutPath = routeWithCommunity(
    APP_ROUTES.FREE_SPOTLIGHT,
    ownerSurfaceCommunityId
  );
  const ownerSpotlightShortcutMode =
    ownerSpotlightStatusView?.state === 'none' ? 'create' : 'manage';
  const signedInOwnsShop = Boolean(
    ownerSessionPresent &&
      signedInGmfnId &&
      shopOwnerGmfnId &&
      ownerSurfaceIdentityMatches(signedInGmfnId, shopOwnerGmfnId)
  );
  const showBlockPlacementAction = signedInOwnsShop && !shopLoadFailed;
  function blockPlacementPath(product: ShopProduct): string {
    const params = new URLSearchParams();
    const productId = positiveNumber(product.id);
    const blockNumber = positiveNumber(product.slotNumber);
    if (productId) params.set("repost_product_id", String(productId));
    if (blockNumber) params.set("block", String(blockNumber));
    params.set("source", "shop-diaries");

    return routeWithCommunity(
      `${APP_ROUTES.MARKETPLACE}?${params.toString()}#marketplace-paid-network-placement`,
      ownerSurfaceCommunityId
    );
  }

  function ownerProductManagePath(product: ShopProduct): string {
    const params = new URLSearchParams();
    const productId = positiveNumber(product.id);
    const blockNumber = positiveNumber(product.slotNumber);
    if (productId) params.set("manage_product_id", String(productId));
    if (blockNumber) params.set("manage_block", String(blockNumber));
    params.set("source", "public-shop-product");

    return routeWithCommunity(
      `${APP_ROUTES.SHOP_ME}?${params.toString()}#shop-control-gallery-tools`,
      ownerSurfaceCommunityId
    );
  }

  function writePaidRepostHandoff(product: ShopProduct) {
    if (typeof window === "undefined") return;

    const productId = positiveNumber(product.id);
    const blockNumber = positiveNumber(product.slotNumber);
    if (!productId && !blockNumber) return;

    const payload = {
      version: 1,
      source: "shop-diaries",
      createdAt: new Date().toISOString(),
      productId,
      blockNumber,
      title: firstMeaningful(product.name, `Block #${blockNumber || "?"}`),
      description: stripPublicBlockMetadata(product.description),
      priceText: firstMeaningful(product.priceText),
      currency: firstMeaningful(product.currency, "NGN"),
      imageUrl: firstMeaningful(product.imageUrl),
      videoUrl: firstMeaningful(product.videoUrl),
      shopId: positiveNumber(effectiveShop?.id),
      originShopId: positiveNumber(effectiveShop?.id),
      originShopName: firstMeaningful(
        product.originShopName,
        effectiveShop?.shopName
      ),
      sellerGmfnId: firstMeaningful(effectiveShop?.gmfnId, gmfnId),
      whatsappNumber: firstMeaningful(effectiveShop?.whatsapp),
      originCommunityId: positiveNumber(
        product.originClanId || effectiveShop?.clanId || ownerSurfaceCommunityId
      ),
      ownerCommunityId: ownerSurfaceCommunityId,
      publicShopUrl: absoluteShopLink,
    };

    try {
      window.sessionStorage.setItem(
        PAID_REPOST_HANDOFF_STORAGE_KEY,
        JSON.stringify(payload)
      );
    } catch {
      // If storage is unavailable, the URL query still carries product/block ids.
    }
  }

  function paidRepostHandoffHandler(product: ShopProduct) {
    return () => writePaidRepostHandoff(product);
  }
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
        label: "Profile",
        to: routeWithCommunity(APP_ROUTES.PROFILE, ownerSurfaceCommunityId),
        debugId: "shop-gallery.member-nav.profile",
      },
      {
        label: "Public Shop",
        to: shopRootPath || publicShopReturnPath,
        debugId: "shop-gallery.member-nav.public-shop",
      },
      {
        label: "Finance",
        to: routeWithCommunity(APP_ROUTES.FINANCE, ownerSurfaceCommunityId),
        debugId: "shop-gallery.member-nav.finance",
      },
      {
        label: "Loan Support",
        to: routeWithCommunity(APP_ROUTES.LOANS, ownerSurfaceCommunityId),
        debugId: "shop-gallery.member-nav.loans",
      },
      {
        label: "Trust",
        to: routeWithCommunity(APP_ROUTES.TRUST, ownerSurfaceCommunityId),
        debugId: "shop-gallery.member-nav.trust",
      },
    ],
    [ownerSurfaceCommunityId, publicShopReturnPath, shopRootPath]
  );
  const loginReconnectPath = `/login?next=${encodeURIComponent(
    publicShopReturnPath
  )}`;
  const shopNameText = safeStr(effectiveShop?.shopName || "Shop");
  const shopCategoryText = publicShopCategory();
  const shopDescriptionText = safeStr(
    autoRefreshingShop
      ? "This public shop link is reconnecting to the owner's active shop so Products & Services can load."
      : shopLoadFailed
      ? "This public shop link opened, but GSN has not connected it to an active owner shop yet."
      : effectiveShop?.description ||
          "Products and services shown by this shop. Private Vault items open only with a link from the owner."
  );
  const showShopHeroDescription =
    Boolean(shopDescriptionText) &&
    shopDescriptionText.toLowerCase() !== shopCategoryText.toLowerCase();
  const shopGmfnText = safeStr(effectiveShop?.gmfnId);
  const shopCommunityText = safeStr(effectiveShop?.communityName);
  const publicBlockCount = Math.min(products.length, gallerySlotsTotal);
  const publicBlockText = autoRefreshingShop
    ? "Reconnecting shop"
    : shopLoadFailed
    ? "Shop not connected"
    : publicBlockCount === 1
      ? "1 shop item showing"
      : `${publicBlockCount} shop items showing`;
  const shopDiaryCounterText = autoRefreshingShop
    ? "Refreshing"
    : shopLoadFailed
    ? "Needs refresh"
    : `${publicBlockCount}/${gallerySlotsTotal}`;
  const shopLocationText = firstMeaningful(
    shopCommunityText,
    "GSN public marketplace"
  );
  const shopFollowerText = formatShopFollowerCount(shopFollowState.followerCount);
  const shopFollowSignedIn = Boolean(getAccessToken());
  const shopFollowButtonDisabled =
    shopLoadFailed || shopFollowState.loading || shopFollowState.busy;
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
    : "Trust evidence on request";
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
    { icon: "shop", label: "Shop name", value: shopNameText },
    { icon: "id", label: "Shop owner ID", value: shopGmfnText || "Not ready" },
    { icon: "globe", label: "Marketplace", value: shopLocationText },
    { icon: "community", label: "Community", value: shopCommunityText || "Not shown" },
    { icon: "lock", label: "Community ID", value: shopCommunityIdText || "Not shown" },
  ] satisfies Array<{ icon: ShopIconName; label: string; value: string }>;
  const shopTrustCheckOptions = [
    { icon: "document", text: "Request TrustSlip for current evidence" },
    { icon: "community", text: "Ask community for extra confirmation" },
    { icon: "search", text: "Use IDs to avoid name confusion" },
  ] satisfies Array<{ icon: ShopIconName; text: string }>;
  const shopCommerceDecisionText =
    "Before credit, goods, or money move, read the shop ID, Community ID, current TrustSlip, and community confirmation together. This panel is evidence for judgement, not approval to release goods or credit.";
  const shopCommunityProofTrustSlipStatus = publicShopVerification?.trustslip_available
    ? "Current TrustSlip can be checked from this shop record"
    : "Current TrustSlip must be requested from the shop owner";
  const shopCommunityProofCurrentness = publicShopVerification?.trustslip_request_required
    ? "Needs current TrustSlip"
    : firstMeaningful(
        publicShopVerification?.membership_currentness_label,
        publicShopVerification?.community_evidence_currentness_label,
        "Ask for current confirmation"
      );
  const shopCommunityProofScope = firstMeaningful(
    publicShopVerification?.plain_language,
    "Use the shop ID and Community ID to match the right owner, then ask for current TrustSlip or community confirmation before serious trade."
  );

  function buildPublicShopMessage(link: string, itemName?: string): string {
    return buildGsnPublicShopLinkMessage({
      shopName: shopNameText,
      ownerName: effectiveShop?.ownerName,
      gsnId: shopGmfnText,
      communityName: shopLocationText,
      itemName,
      shopLink: link,
    });
  }

  function trackShopShareAction(
    shareSource: string,
    sourcePath: string,
    product?: ShopProduct
  ) {
    if (!sourcePath) return;

    trackMarketplaceAttention("share_action", {
      product_id: product ? positiveNumber(product.id) || undefined : undefined,
      source: firstMeaningful(shareSource, "share_shop"),
      source_path: sourcePath,
      client_event_id: createShareClientEventId(
        `shop-share:${positiveNumber(effectiveShop?.id) || "pending"}`
      ),
    });
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

    const shareLink = attributedShopShareLink || absoluteShopShareLink;
    const copied = await safeCopy(buildPublicShopMessage(shareLink));
    if (copied) {
      trackShopShareAction("copy_shop_link", shareLink);
    }
    setNotice({
      tone: copied ? "success" : "error",
      text: copied
        ? "GSN public shop invitation copied."
        : "Clipboard copy was blocked. Use Share, or copy the page address from your browser.",
    });
  }

  function buildVaultRequestText() {
    const shopTitle = firstMeaningful(
      effectiveShop?.shopName,
      effectiveShop?.ownerName,
      "this shop"
    );

    return [
      `Hello, I am asking about private Vault offers from ${shopTitle}.`,
      "Please send me an owner-issued Vault access link if there are selected offers you do not show on the public page.",
    ].filter(Boolean).join("\n");
  }

  async function copyVaultRequestLink() {
    if (shopLoadFailed) {
      setNotice({
        tone: "error",
        text: "This Vault request is not ready yet. Ask the owner directly for a private Vault link.",
      });
      return;
    }

    const requestText = buildVaultRequestText();
    const copied = await safeCopy(requestText);
    setNotice({
      tone: copied ? "success" : "error",
      text: copied
        ? "Vault request copied. Send it to the shop owner."
        : "Clipboard copy was blocked. Ask the owner for a private Vault link.",
    });
  }

  function buildProductSocialShareTarget(product: ShopProduct) {
    const blockLabel = publicShopBlockLabel(product);
    const ownerId = firstMeaningful(effectiveShop?.gmfnId, gmfnId);
    const productUrl = appendShopShareAttribution(
      publicShopShareUrl({
        gmfnId: ownerId,
        productId: product.id,
        block: product.slotNumber,
      }),
      "share_product"
    );
    const productSocialUrl = appendShopShareAttribution(
      publicShopSocialPreviewUrl({
        gmfnId: ownerId,
        productId: product.id,
        block: product.slotNumber,
      }),
      "share_product"
    );
    const productTitle = productDisplayTitle(product);
    const title = `${blockLabel} - ${productTitle}`;
    const shopContext = firstMeaningful(
      effectiveShop?.shopName,
      effectiveShop?.ownerName,
      "this public shop"
    );
    const priceText = firstMeaningful(product.priceText);
    const socialMessage = [
      `${productTitle} in ${shopContext}.`,
      priceText ? `Price: ${priceText}.` : "",
      `Open ${blockLabel} on GSN.`,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      title,
      message: buildPublicShopMessage(productUrl, productTitle),
      socialMessage,
      socialUrl: productSocialUrl,
      url: productUrl,
    };
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
        : "WhatsApp could not open. Ask the owner to refresh the saved GSN contact path for this shop.",
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
        text: "This shop link needs the owner to refresh it from Marketplace before owner contact is reliable.",
      });
      return;
    }

    setShopVerificationOpen(false);
    setShopVerificationQrOpen(false);
    setOwnerContactPanelOpen((open) => !open);
  }

  function callOwnerPhone() {
    trackMarketplaceAttention("contact_tap", { source: "public_shop_phone_contact" });

    const phoneUrl = buildPhoneCallUrl(effectiveShop?.whatsapp);
    if (!phoneUrl || typeof window === "undefined") {
      setNotice({
        tone: "error",
        text: "No owner call path is ready on this public shop yet.",
      });
      return;
    }

    window.location.href = phoneUrl;
    setOwnerContactPanelOpen(false);
    setNotice({
      tone: "success",
      text: "Call path opened. If the call prompt does not appear, use another contact action on this shop card.",
    });
  }

  async function contactOwnerByWhatsApp() {
    trackMarketplaceAttention("contact_tap", { source: "public_shop_whatsapp_contact" });

    const shopTitle = firstMeaningful(
      effectiveShop?.shopName,
      effectiveShop?.ownerName,
      "this GSN shop"
    );
    const message = `Hello, I found ${shopTitle} on GSN. I would like to chat with the owner.`;

    if (
      openOwnerWhatsAppChat(
        message,
        "WhatsApp chat opened for the shop owner. If WhatsApp cannot complete the chat, come back and use Call phone."
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
    const evidenceContext = firstMeaningful(
      shopVerificationQrTarget,
      absoluteShopShareLink,
      absoluteShopLink
    );
    const message = `Hello, I am checking ${shopTitle} on GSN. Please send the current TrustSlip or merchant verification record for this shop owner (${shopGmfnText || "owner ID not visible yet"}).`;

    if (
      openOwnerWhatsAppChat(
        message,
        "WhatsApp opened. Ask the owner for the current TrustSlip or merchant verification record."
      )
    ) {
      return;
    }

    const copied = await safeCopy(`${message}\n${evidenceContext}`);
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
    const message = `Hello, I am checking ${shopTitle} on GSN. Please send the right community confirmation link for ${communityLabel}, or send the current community verification link for this shop owner (${shopGmfnText || "owner ID not visible yet"}).`;
    const evidenceContext = firstMeaningful(
      shopCommunityVerifyPath ? publicFrontendUrl(shopCommunityVerifyPath) : "",
      absoluteShopShareLink,
      absoluteShopLink
    );

    if (
      openOwnerWhatsAppChat(
        message,
        "WhatsApp opened. Ask the owner for the community confirmation link."
      )
    ) {
      return;
    }

    const copied = await safeCopy(`${message}\n${evidenceContext}`);
    setNotice({
      tone: copied ? "success" : "error",
      text: copied
        ? "Community confirmation request copied. Send it to the shop owner."
        : "Owner WhatsApp is not ready and clipboard copy was blocked.",
    });
  }

  async function askForVaultAccess() {
    const requestText = buildVaultRequestText();

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

    const copied = await safeCopy(requestText);
    setNotice({
      tone: copied ? "success" : "error",
      text: copied
        ? "Vault access request copied. Send it to the shop owner."
        : "Clipboard copy was blocked. Ask the shop owner for a private Vault access link.",
    });
  }

  function contactSpotlightOwnerByWhatsApp() {
    pauseSpotlightPresentationRotation();
    const spotlightShopId = positiveNumber(miniSpotlight?.shopId);
    const spotlightTitle = firstMeaningful(
      miniSpotlightView.detail,
      miniSpotlight?.message,
      "this Spotlight"
    );
    const spotlightShop = firstMeaningful(
      miniSpotlightView.title,
      miniSpotlight?.sourceShopName,
      "this GSN shop"
    );
    const message = `Hello, I found ${spotlightShop} on GSN Spotlight. I am asking about: ${spotlightTitle}.`;
    const chatUrl = buildWhatsAppChatUrl(
      miniSpotlightView.sourceShopWhatsApp,
      message
    );
    const spotlightPhone = normalizeWhatsAppRecipient(
      miniSpotlightView.sourceShopWhatsApp
    );
    const currentShopPhone = normalizeWhatsAppRecipient(effectiveShop?.whatsapp);
    const spotlightName = safeStr(miniSpotlight?.sourceShopName).toLowerCase();
    const currentShopName = safeStr(effectiveShop?.shopName).toLowerCase();
    const spotlightContactMatchesCurrentShop =
      !spotlightShopId &&
      Boolean(chatUrl) &&
      (Boolean(spotlightPhone && spotlightPhone === currentShopPhone) ||
        Boolean(spotlightName && currentShopName && spotlightName === currentShopName));
    const spotlightAttentionPayload = {
      shop_id: spotlightShopId || undefined,
      broadcast_id: positiveNumber(miniSpotlight?.id) || undefined,
      product_id: positiveNumber(miniSpotlight?.sourceProductId) || undefined,
      clan_id: positiveNumber(miniSpotlight?.sourceClanId) || undefined,
      source: "public_shop_spotlight_contact",
    };
    const allowShopFallback = spotlightContactMatchesCurrentShop;

    if (chatUrl && typeof window !== "undefined") {
      trackMarketplaceAttention("spotlight_shop_click", spotlightAttentionPayload, {
        allowShopFallback,
      });
      trackMarketplaceAttention("contact_tap", spotlightAttentionPayload, {
        allowShopFallback,
      });
      const opened = window.open(chatUrl, "_blank", "noopener,noreferrer");
      setNotice({
        tone: opened ? "success" : "error",
        text: opened
          ? "WhatsApp opened for this Spotlight owner."
          : "WhatsApp could not open for this Spotlight owner.",
      });
      return;
    }

    setNotice({
      tone: "error",
      text: "This Spotlight does not expose an owner contact path yet.",
    });
  }

  return (
    <main className="public-shop-shell theme-public-shop">
      <div className="public-shop-inner">
      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}
      {error ? <div style={noticeCard("error")}>{error}</div> : null}
      <OwnerOnlySurfaceNav
        ownerGmfnId={shopOwnerGmfnId}
        compact={isCompact}
        label="Your shop shortcuts"
        ariaLabel="Your Public Shop shortcuts"
        links={memberSurfaceLinks}
        refreshKey={shopReconnectRetryKey}
        requireOwnerMatch={true}
        collapseOnCompact={true}
      />

      <section
        className="public-shop-stack"
        style={{
          display: "grid",
          gap: isCompact ? 9 : 18,
        }}
        aria-label="Public shop gallery"
      >
        <div
          className="public-shop-brandbar"
          style={{
            display: isCompact ? "none" : "grid",
            gridTemplateColumns: "auto minmax(0, 1fr)",
            alignItems: "center",
            gap: isCompact ? 10 : 16,
            color: "#FFFFFF",
            padding: isCompact ? "8px 10px" : "12px 16px",
            borderRadius: isCompact ? 16 : 22,
            background:
              "linear-gradient(90deg, #061827 0%, #08233A 58%, #0B2D4A 100%)",
            border: "1px solid rgba(214,170,69,0.44)",
            boxShadow:
              "0 14px 30px rgba(8,38,67,0.16), inset 0 1px 0 rgba(255,255,255,0.12)",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: isCompact ? 38 : 54,
              height: isCompact ? 38 : 54,
              borderRadius: isCompact ? 12 : 16,
              display: "grid",
              placeItems: "center",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,250,255,0.92) 100%)",
              border: "1px solid rgba(255,232,160,0.46)",
              boxShadow:
                "0 12px 24px rgba(0,0,0,0.20), 0 0 18px rgba(214,170,69,0.18), inset 0 1px 0 rgba(255,255,255,0.96)",
              overflow: "hidden",
            }}
          >
            <GSNBrandMark width={isCompact ? 23 : 34} height={isCompact ? 29 : 42} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: isCompact ? 19 : 26,
                fontWeight: 950,
                lineHeight: 1,
                letterSpacing: 0,
              }}
            >
              GSN
            </div>
            {!isCompact ? (
              <div
                style={{
                  marginTop: 3,
                  color: "rgba(255,255,255,0.78)",
                  fontSize: 14,
                  fontWeight: 760,
                  lineHeight: 1.25,
                }}
              >
                Public shop page. Check seller evidence before trade.
              </div>
            ) : null}
          </div>
        </div>

        <StableCtaLink
          to={marketplaceMemberShopsPath}
          fullWidth
          stableHeight={isCompact ? 44 : 50}
          debugId="shop-gallery.return-marketplace"
          aria-label="Back to Marketplace member shops"
          style={{
            ...secondaryBtn(false),
            order: isCompact ? 3 : 0,
            minHeight: isCompact ? 44 : 50,
            borderRadius: isCompact ? 14 : 18,
            fontSize: isCompact ? 12 : 14,
            padding: isCompact ? "6px 9px" : "9px 14px",
            color: "#07172C",
            border: "1px solid rgba(214,170,69,0.26)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,250,255,0.96) 100%)",
            boxShadow:
              "0 10px 22px rgba(8,38,67,0.08), inset 0 1px 0 rgba(255,255,255,0.94)",
            gap: isCompact ? 6 : 8,
          }}
        >
          {inlineShopIcon("navigation", "#8C6829", isCompact ? 12 : 15)}
          <span>{isCompact ? "Marketplace" : "Back to Marketplace"}</span>
        </StableCtaLink>

        <section
          className="public-shop-signboard"
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: isCompact ? 18 : 30,
            padding: isCompact ? "10px" : "24px 26px 22px",
            border: "1px solid rgba(214,170,69,0.46)",
            background:
              "radial-gradient(circle at 20% 8%, rgba(246,196,83,0.18) 0%, transparent 28%), radial-gradient(circle at 92% 2%, rgba(47,128,237,0.10) 0%, transparent 32%), linear-gradient(145deg, #FFFFFF 0%, #FFFCF4 54%, #F6FBFF 100%)",
            boxShadow:
              "0 22px 48px rgba(8,38,67,0.13), 0 0 0 4px rgba(255,255,255,0.42), inset 0 1px 0 rgba(255,255,255,0.96)",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "repeating-linear-gradient(135deg, transparent 0 34px, rgba(214,170,69,0.035) 34px 35px), radial-gradient(circle at 72% 18%, rgba(214,170,69,0.10) 0%, transparent 28%)",
              pointerEvents: "none",
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              right: isCompact ? 12 : 38,
              top: isCompact ? 14 : 32,
              opacity: isCompact ? 0.045 : 0.08,
              pointerEvents: "none",
            }}
          >
            <GSNBrandMark width={isCompact ? 58 : 150} height={isCompact ? 76 : 196} />
          </div>
          <div
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: isCompact ? "96px minmax(0, 1fr)" : "220px minmax(0, 1fr)",
              alignItems: "center",
              justifyItems: "stretch",
              columnGap: isCompact ? 10 : 22,
              rowGap: isCompact ? 8 : 0,
              minHeight: isCompact ? 0 : undefined,
            }}
          >
            <div
              data-public-shop-signboard-icon="true"
              style={{
                position: "relative",
                zIndex: 2,
                width: isCompact ? 92 : 206,
                height: isCompact ? 92 : 206,
                borderRadius: isCompact ? 24 : "50%",
                display: "grid",
                placeItems: "center",
                justifySelf: "center",
                alignSelf: isCompact ? "start" : "center",
                gridRow: isCompact ? "1 / span 3" : undefined,
                background:
                  "radial-gradient(circle at 36% 30%, rgba(255,255,255,0.95) 0%, rgba(246,196,83,0.18) 46%, rgba(4,24,43,0.92) 100%)",
                border: "1px solid rgba(214,170,69,0.58)",
                boxShadow:
                  "0 18px 34px rgba(8,38,67,0.18), inset 0 1px 0 rgba(255,255,255,0.68)",
                overflow: "hidden",
              }}
            >
              <ReferenceShopSignboardVisual compact={isCompact} />
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  right: isCompact ? -2 : 8,
                  bottom: isCompact ? 0 : 10,
                  width: isCompact ? 22 : 42,
                  height: isCompact ? 22 : 42,
                  borderRadius: "50%",
                  display: "none",
                  placeItems: "center",
                  background:
                    "linear-gradient(180deg, #5BBE78 0%, #2E9B62 100%)",
                  border: "2px solid #FFFDF6",
                  color: "#FFFFFF",
                  boxShadow: "0 8px 18px rgba(46,155,98,0.28)",
                  fontSize: isCompact ? 14 : 24,
                  fontWeight: 950,
                }}
              >
                {"\u2713"}
              </span>
            </div>
            <div
              data-public-shop-signboard-content="true"
              style={{
                display: isCompact ? "contents" : "grid",
                gap: isCompact ? 5 : 10,
                minWidth: 0,
                width: "100%",
                justifySelf: "stretch",
              }}
            >
              <h1
                style={{
                  margin: 0,
                  gridColumn: isCompact ? "2" : undefined,
                  color: "#061827",
                  fontFamily:
                    "'Inter', 'Segoe UI', 'Arial Black', Arial, sans-serif",
                  fontSize: isCompact ? 20 : 44,
                  lineHeight: isCompact ? 1.12 : 1,
                  fontWeight: 950,
                  textTransform: isCompact ? "none" : "uppercase",
                  letterSpacing: 0,
                  textShadow:
                    isCompact
                      ? "0 1px 0 rgba(255,255,255,0.96), 0 7px 14px rgba(8,38,67,0.12)"
                      : "0 1px 0 rgba(255,255,255,0.94), 0 12px 22px rgba(8,38,67,0.10)",
                  padding: isCompact ? "5px 8px 6px" : 0,
                  borderRadius: isCompact ? 10 : 0,
                  borderLeft: isCompact ? "3px solid rgba(214,170,69,0.72)" : "none",
                  background: isCompact
                    ? "linear-gradient(90deg, rgba(255,248,224,0.82) 0%, rgba(255,255,255,0.50) 72%, transparent 100%)"
                    : "transparent",
                  minHeight: isCompact ? 0 : undefined,
                  overflow: isCompact ? "visible" : "hidden",
                  textOverflow: isCompact ? "clip" : "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: isCompact ? 3 : 2,
                  WebkitBoxOrient: "vertical" as any,
                  overflowWrap: "anywhere",
                  wordBreak: "normal",
                  textAlign: isCompact ? "left" : "inherit",
                }}
              >
                {shopNameText}
              </h1>
              <div
                style={{
                  display: "flex",
                  gridColumn: isCompact ? "2" : undefined,
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: isCompact ? 5 : 7,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    maxWidth: "100%",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: isCompact ? 5 : 7,
                    minHeight: isCompact ? 28 : 34,
                    padding: isCompact ? "4px 8px" : "7px 12px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.28)",
                    background:
                      "linear-gradient(180deg, rgba(248,251,254,0.98) 0%, rgba(234,241,232,0.94) 100%)",
                    color: "#3F4F3F",
                    fontSize: isCompact ? 11 : 13,
                    fontWeight: 850,
                    overflow: "hidden",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.86)",
                  }}
                >
                  {inlineShopIcon("tag", "#3F4F3F", isCompact ? 10 : 15)}
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
                {!isCompact ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      color: "#8C6829",
                      fontSize: 14,
                      fontWeight: 850,
                      lineHeight: 1.12,
                    }}
                  >
                    {inlineShopIcon("shield", "#8C6829", 14)}
                    <span>Public listing. Verify current evidence before goods, credit, or money move.</span>
                  </div>
                ) : null}
              </div>
              <details
                data-public-shop-options="secondary"
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? shopFollowState.isOwner
                      ? "repeat(2, minmax(0, 1fr))"
                      : "minmax(0, 1fr)"
                    : "minmax(0, 1fr) auto",
                  gridColumn: isCompact ? "2" : undefined,
                  gap: isCompact ? 6 : 10,
                  alignItems: "center",
                  minHeight: isCompact ? 30 : 54,
                }}
                open={!isCompact || shopOptionsOpen}
                onToggle={(event) => {
                  if (isCompact) setShopOptionsOpen(event.currentTarget.open);
                }}
                aria-label="Shop follow controls"
              >
                <StableDisclosureSummary
                  debugId="shop-gallery.options.toggle"
                  stableHeight={40}
                  style={{
                    display: isCompact ? "flex" : "none",
                    gridColumn: "1 / -1",
                    minHeight: 40,
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "5px 8px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.82)",
                    color: "#07172C",
                    cursor: "pointer",
                    fontSize: 11.5,
                    fontWeight: 900,
                    listStyle: "none",
                  }}
                >
                  <span>{shopFollowState.isOwner ? "Shop options" : "Follow shop"}</span>
                  <span aria-hidden="true">{shopOptionsOpen ? "-" : "+"}</span>
                </StableDisclosureSummary>
                <div
                  style={{
                    minHeight: isCompact ? 30 : 44,
                    width: isCompact && shopFollowState.isOwner ? "100%" : "fit-content",
                    maxWidth: "100%",
                    justifySelf: "start",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: isCompact && shopFollowState.isOwner ? "center" : "flex-start",
                    gap: isCompact ? 5 : 8,
                    padding: isCompact ? "4px 8px" : "8px 12px",
                    borderRadius: 999,
                    border: "1px solid rgba(214,170,69,0.24)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,250,255,0.94) 100%)",
                    color: "#07172C",
                    fontSize: isCompact ? 10.5 : 13,
                    fontWeight: 850,
                    boxShadow:
                      "0 8px 18px rgba(8,38,67,0.08), inset 0 1px 0 rgba(255,255,255,0.94)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {inlineShopIcon("shop", "#8C6829", isCompact ? 11 : 15)}
                  <span>{shopFollowerText}</span>
                </div>
                {!shopFollowState.isOwner ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        shopFollowState.isFollowing && shopFollowSignedIn
                          ? "minmax(0, 1fr) minmax(0, 1fr)"
                          : "minmax(0, 1fr)",
                      gap: isCompact ? 6 : 8,
                      minWidth: isCompact ? 0 : 280,
                      width: "100%",
                    }}
                  >
                    {!shopFollowSignedIn ? (
                      <SecondaryButton
                        onClick={() =>
                          setNotice({
                            tone: "error",
                            text: "Sign in to follow this shop and keep it in your GSN updates.",
                          })
                        }
                        minWidth={0}
                        fullWidth
                        stableHeight={isCompact ? 44 : 46}
                        debugId="shop-gallery.public-shop.sign-in-follow"
                        style={{
                          ...secondaryBtn(false),
                          minHeight: isCompact ? 44 : 46,
                          borderRadius: isCompact ? 14 : 16,
                          fontSize: isCompact ? 11 : 13,
                          padding: isCompact ? "5px 8px" : "8px 12px",
                          gap: isCompact ? 5 : 8,
                        }}
                      >
                        {inlineShopIcon("id", "#8C6829", isCompact ? 12 : 15)}
                        <span>Sign in to follow</span>
                      </SecondaryButton>
                    ) : shopFollowState.isFollowing ? (
                      <>
                        <SecondaryButton
                          disabled
                          minWidth={0}
                          fullWidth
                          stableHeight={isCompact ? 44 : 46}
                          debugId="shop-gallery.public-shop.following"
                          style={{
                            ...secondaryBtn(true),
                            minHeight: isCompact ? 44 : 46,
                            borderRadius: isCompact ? 14 : 16,
                            fontSize: isCompact ? 11 : 13,
                            padding: isCompact ? "5px 8px" : "8px 12px",
                            gap: isCompact ? 5 : 8,
                          }}
                        >
                          {inlineShopIcon("shield", "#276E4A", isCompact ? 12 : 15)}
                          <span>Following</span>
                        </SecondaryButton>
                        <SecondaryButton
                          onClick={() => void handleUnfollowShop()}
                          disabled={shopFollowButtonDisabled}
                          minWidth={0}
                          fullWidth
                          stableHeight={isCompact ? 44 : 46}
                          debugId="shop-gallery.public-shop.unfollow"
                          style={{
                            ...secondaryBtn(shopFollowButtonDisabled),
                            minHeight: isCompact ? 44 : 46,
                            borderRadius: isCompact ? 14 : 16,
                            fontSize: isCompact ? 11 : 13,
                            padding: isCompact ? "5px 8px" : "8px 12px",
                            gap: isCompact ? 5 : 8,
                          }}
                        >
                          {inlineShopIcon("vault", "#8C6829", isCompact ? 12 : 15)}
                          <span>Unfollow</span>
                        </SecondaryButton>
                      </>
                    ) : (
                      <PrimaryButton
                        onClick={() => void handleFollowShop()}
                        disabled={shopFollowButtonDisabled || !shopFollowState.canFollow}
                        minWidth={0}
                        fullWidth
                        stableHeight={isCompact ? 44 : 46}
                        debugId="shop-gallery.public-shop.follow"
                        style={{
                          ...primaryBtn(shopFollowButtonDisabled || !shopFollowState.canFollow),
                          minHeight: isCompact ? 44 : 46,
                          borderRadius: isCompact ? 14 : 16,
                          fontSize: isCompact ? 11 : 13,
                          padding: isCompact ? "5px 8px" : "8px 12px",
                          gap: isCompact ? 5 : 8,
                        }}
                      >
                        {inlineShopIcon("shop", "#FFFFFF", isCompact ? 12 : 15)}
                        <span>Follow Shop</span>
                      </PrimaryButton>
                    )}
                  </div>
                ) : null}
                <div
                  style={{
                    gridColumn: "1 / -1",
                    display: isCompact ? "none" : "block",
                    color: "#5B6878",
                    fontSize: 12,
                    fontWeight: 800,
                    lineHeight: 1.35,
                    maxWidth: "100%",
                  }}
                >
                  Follow to keep this shop in your GSN updates. Still verify
                  the seller before goods, credit, or money move.
                </div>
              {shopFollowState.isOwner ? (
                <StableCtaLink
                  to={ownerShopAnalyticsPath}
                  fullWidth
                  stableHeight={isCompact ? 44 : 46}
                  debugId="shop-gallery.owner.shop-analytics"
                  aria-label="Open owner shop analytics"
                  style={{
                    gridColumn: isCompact ? "auto" : undefined,
                    borderRadius: isCompact ? 14 : 16,
                    background: "linear-gradient(180deg, #08233A 0%, #0B2D4A 100%)",
                    color: "#FFFFFF",
                    border: "1px solid rgba(214,170,69,0.28)",
                    boxShadow: "0 10px 20px rgba(8,38,67,0.16), inset 0 1px 0 rgba(255,255,255,0.16)",
                    fontSize: isCompact ? 10.8 : 13,
                    fontWeight: 900,
                    gap: isCompact ? 6 : 8,
                    minWidth: 0,
                    minHeight: isCompact ? 44 : 46,
                    padding: isCompact ? "5px 8px" : undefined,
                    justifyContent: isCompact ? "center" : "flex-start",
                    whiteSpace: "normal",
                    textOverflow: "clip",
                  }}
                >
                  {inlineShopIcon("chart", "#FFFFFF", isCompact ? 9 : 15)}
                  <span
                    style={{
                      display: isCompact ? "block" : "grid",
                      gap: 1,
                      minWidth: 0,
                      lineHeight: 1.05,
                      textAlign: isCompact ? "center" : "left",
                      overflow: "visible",
                      textOverflow: "clip",
                      whiteSpace: isCompact ? "normal" : "nowrap",
                    }}
                  >
                    <span>{isCompact ? "Analytics" : "Shop analytics"}</span>
                    {!isCompact ? (
                      <span
                        style={{
                          color: "rgba(255,255,255,0.72)",
                          fontSize: 11,
                          fontWeight: 750,
                        }}
                      >
                        View insights
                      </span>
                    ) : null}
                  </span>
                </StableCtaLink>
              ) : null}
              </details>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "minmax(0, 1fr)"
                    : "1fr",
                  gridColumn: isCompact ? "1 / -1" : undefined,
                  gap: 0,
                  borderRadius: isCompact ? 14 : 18,
                  border: "1px solid rgba(214,170,69,0.24)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(248,251,254,0.72) 100%)",
                  overflow: "hidden",
                  boxShadow:
                    "0 10px 20px rgba(8,38,67,0.06), inset 0 1px 0 rgba(255,255,255,0.92)",
                  marginTop: isCompact ? 0 : 0,
                }}
              >
                {[
                  { icon: "id" as ShopIconName, label: "GSN ID", value: shopGmfnText || "Not ready" },
                  { icon: "community" as ShopIconName, label: "Homeland", value: shopLocationText },
                ].map((row, rowIndex) => (
                  <div
                    key={row.label}
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "24px minmax(0, 1fr)"
                        : "34px minmax(0, 1fr)",
                      gap: isCompact ? 8 : 10,
                      alignItems: "center",
                      minWidth: 0,
                      padding: isCompact ? "8px 10px" : "10px 12px",
                      borderTop:
                        rowIndex > 0
                          ? "1px solid rgba(214,170,69,0.16)"
                          : "none",
                      borderLeft: "none",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        display: "grid",
                        placeItems: "center",
                        width: isCompact ? 24 : 28,
                        height: isCompact ? 24 : 28,
                        borderRadius: isCompact ? 8 : 8,
                        background: "rgba(246,215,122,0.18)",
                        color: "#8C6829",
                        boxShadow:
                          "0 8px 18px rgba(8,38,67,0.08), inset 0 1px 0 rgba(255,255,255,0.86)",
                      }}
                    >
                      <GsnRealisticIcon
                        name={shop3DIconName(row.icon)}
                        size={isCompact ? 22 : 28}
                        decorative
                      />
                    </span>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: isCompact ? 3 : 5,
                        alignItems: "baseline",
                        minWidth: 0,
                        color: "#29394A",
                        fontSize: isCompact ? 12.2 : 13.5,
                        fontWeight: 760,
                        lineHeight: isCompact ? 1.18 : 1.22,
                      }}
                      title={row.value}
                    >
                      <span style={{ color: "#6F7F91" }}>
                        {row.label === "Homeland"
                          ? "Community"
                          : row.label === "GSN ID"
                          ? isCompact
                            ? "GSN ID"
                            : "GSN Global ID"
                          : row.label}
                        :
                      </span>
                      <strong
                        style={{
                          color: row.label === "Homeland" ? "#276E4A" : "#07172C",
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
              {showShopHeroDescription && !isCompact ? (
                <p
                  style={{
                    margin: 0,
                    color: "#5F7287",
                    fontSize: isCompact ? 10.8 : 13.5,
                    lineHeight: 1.22,
                    textAlign: isCompact ? "center" : "left",
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
              alignItems: "stretch",
              gap: isCompact ? 5 : 10,
              marginTop: isCompact ? 8 : 18,
            }}
            aria-label="Public shop actions"
          >
            <SocialTagShareButton
              target={{
                title: firstMeaningful(
                  effectiveShop?.shopName,
                  effectiveShop?.ownerName,
                  "GSN public shop"
                ),
                message: buildPublicShopMessage(attributedShopShareLink || absoluteShopShareLink),
                socialMessage: `${firstMeaningful(
                  effectiveShop?.shopName,
                  effectiveShop?.ownerName,
                  "GSN public shop"
                )} on GSN. Public shop record. Open the shop link.`,
                socialUrl: attributedShopSocialLink,
                url: attributedShopShareLink || absoluteShopShareLink,
              }}
              disabled={shopLoadFailed || !absoluteShopShareLink}
              buttonLabel="Share"
              buttonKind="secondary"
              triggerIcon={inlineShareGlyph("#8C6829", isCompact ? 18 : 21)}
              minWidth={0}
              fullWidth
              stableHeight={isCompact ? 46 : 54}
              debugId="shop-gallery.share-shop"
              style={{
                ...secondaryBtn(shopLoadFailed || !absoluteShopShareLink),
                alignSelf: "stretch",
                minHeight: isCompact ? 46 : 54,
                borderRadius: isCompact ? 14 : 18,
                fontSize: isCompact ? 11.2 : 14,
                padding: isCompact ? "5px 3px" : "10px 12px",
                gap: isCompact ? 4 : 7,
                color: "#07172C",
                background:
                  "linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)",
                border: "1px solid rgba(214,170,69,0.28)",
                boxShadow:
                  "0 10px 22px rgba(8,38,67,0.10), inset 0 1px 0 rgba(255,255,255,0.94)",
              }}
              onResult={(tone, text, channel) => {
                if (tone === "success") {
                  trackShopShareAction(
                    "share_shop",
                    appendShopShareAttribution(
                      absoluteShopShareLink,
                      "share_shop",
                      channel
                    )
                  );
                }
                setNotice({ tone, text });
              }}
            />
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
                alignSelf: "stretch",
                minHeight: isCompact ? 46 : 54,
                borderRadius: isCompact ? 14 : 18,
                fontSize: isCompact ? 11.2 : 14,
                padding: isCompact ? "5px 3px" : "10px 12px",
                color: "#07172C",
                border: "1px solid rgba(214,170,69,0.28)",
                background:
                  "linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)",
                boxShadow:
                  "0 10px 22px rgba(8,38,67,0.10), inset 0 1px 0 rgba(255,255,255,0.94)",
                gap: isCompact ? 4 : 7,
              }}
            >
              {inlineShopIcon("shield", "#8C6829", isCompact ? 12 : 16)}
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
                alignSelf: "stretch",
                minHeight: isCompact ? 46 : 54,
                borderRadius: isCompact ? 14 : 18,
                fontSize: isCompact ? 11.2 : 14,
                padding: isCompact ? "5px 3px" : "10px 12px",
                background:
                  "linear-gradient(180deg, #25D366 0%, #128C4A 100%)",
                border: "1px solid rgba(37,211,102,0.38)",
                boxShadow:
                  "0 10px 22px rgba(18,140,74,0.14), inset 0 1px 0 rgba(255,255,255,0.30)",
                gap: isCompact ? 4 : 7,
              }}
            >
              {inlineShopIcon("phone", "#FFFFFF", isCompact ? 12 : 16)}
              <span>WhatsApp</span>
            </PrimaryButton>
          </div>
        </section>

        {!isCompact ? (
          <div
            className="public-shop-status-strip"
            style={{
            display: "grid",
            gridTemplateColumns: isCompact
              ? "repeat(4, minmax(0, 1fr))"
              : "repeat(4, minmax(0, 1fr))",
            gap: 0,
            borderRadius: isCompact ? 14 : 18,
            overflow: "hidden",
            border: "1px solid rgba(214,170,69,0.30)",
            background:
              "linear-gradient(135deg, #FFFFFF 0%, #FFFCF4 54%, #F7FBFF 100%)",
            boxShadow:
              "0 18px 36px rgba(8,38,67,0.10), 0 0 0 1px rgba(13,95,168,0.04), inset 0 1px 0 rgba(255,255,255,0.96)",
            }}
          >
          {[
            {
              icon: "shield" as ShopIconName,
              title: "Community Record",
              detail: shopCommunityIdText ? "ID check" : "Record pending",
            },
            { icon: "cart" as ShopIconName, title: "Shop items", detail: publicBlockText },
            { icon: "vault" as ShopIconName, title: "Private Vault", detail: "Owner-issued link" },
            { icon: "id" as ShopIconName, title: "Trust Identity", detail: "GSN ID visible" },
          ].map((item, itemIndex) => {
            const statusItemStyle: React.CSSProperties = {
                minHeight: isCompact ? 52 : 76,
                padding: isCompact ? "6px 3px" : "12px 14px",
                borderRight:
                  itemIndex < 3 ? "1px solid rgba(214,170,69,0.16)" : "none",
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "44px minmax(0, 1fr)",
                alignItems: "center",
                justifyItems: isCompact ? "center" : "stretch",
                gap: isCompact ? 3 : 10,
                textAlign: isCompact ? "center" : "left",
                minWidth: 0,
              };
            const statusItemContent = (
              <>
                <div
                  style={{
                    ...glossyIconBadge(
                      isCompact ? 28 : 50,
                      isCompact ? 14 : 21
                    ),
                  }}
                >
                  <GsnRealisticIcon
                    name={shop3DIconName(item.icon)}
                    size={isCompact ? 21 : 42}
                    decorative
                  />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                    color: "#0B1F33",
                    fontWeight: 950,
                    fontSize: isCompact ? 8.4 : 14,
                    lineHeight: isCompact ? 1.05 : 1.12,
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
                      marginTop: isCompact ? 1 : 3,
                      color: "#526C84",
                      fontWeight: 750,
                      fontSize: isCompact ? 7.8 : 11.5,
                      lineHeight: isCompact ? 1.04 : 1.1,
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
                key={`${item.icon}-${item.title}`}
                className="public-shop-status-item"
                style={statusItemStyle}
              >
                {statusItemContent}
              </div>
            );
          })}
          </div>
        ) : null}

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
                        boxShadow: "0 14px 28px rgba(0,0,0,0.24)",
                      }}
                    >
                <GsnRealisticIcon
                  name="trust-shield"
                  size={isCompact ? 34 : 48}
                  decorative
                />
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
                  live TrustSlip when you need current evidence from the owner.
                  Shop and community IDs do not show member-witness currentness
                  by themselves.
                </div>
              </div>

              <SecondaryButton
                onClick={toggleShopVerificationPanel}
                minWidth={0}
                stableHeight={isCompact ? 52 : 46}
                debugId="shop-gallery.verify-shop.close"
                aria-expanded={shopVerificationOpen}
                aria-controls="public-shop-verify-panel"
                style={{
                  ...secondaryBtn(false),
                  minHeight: isCompact ? 52 : 46,
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
                {isCompact ? "Hide" : "Hide evidence"}
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
              {inlineShopIcon(
                shopVerificationQrTarget ? "check" : "alert",
                shopVerificationQrTarget ? "#86EFAC" : "#FDE68A",
                isCompact ? 15 : 17
              )}
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
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
                      }}
                    >
                      <GsnRealisticIcon
                        name={shop3DIconName(row.icon)}
                        size={isCompact ? 30 : 38}
                        decorative
                      />
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
                        {inlineShopIcon(row.icon, "rgba(255,236,173,0.82)", isCompact ? 11 : 13)}
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
                  {inlineShopIcon("shield", "rgba(246,215,122,0.86)", isCompact ? 12 : 14)}
                  <span>Community ID points to the recorded community.</span>
                </div>
              </div>
            </div>

            <CommunityProofPanel
              title="Why trust this shop?"
              subtitle="Community context helps you know what to ask for before goods, credit, or money move."
              compact={isCompact}
              communityName={firstMeaningful(
                publicShopVerification?.community_name,
                shopCommunityText,
                shopLocationText
              )}
              holderRole="Shop owner"
              identityLabel={shopGmfnText ? "Shop owner GSN ID shown" : "Shop owner ID not shown"}
              memberWitnessCount={publicShopVerification?.member_witness_count}
              membershipStrengthLabel={firstMeaningful(
                publicShopVerification?.membership_strength_label,
                "Ask for member-witness confirmation"
              )}
              membershipCurrentnessLabel={shopCommunityProofCurrentness}
              membershipCurrentnessScope={shopCommunityProofScope}
              nextWitnessRenewalStatusLabel={
                publicShopVerification?.next_witness_renewal_status_label
              }
              communityActivityCount={publicShopVerification?.community_activity_count}
              communityActivityLabel={publicShopVerification?.community_activity_label}
              communityActivityCategories={
                publicShopVerification?.community_activity_categories
              }
              trustSlipStatusLabel={shopCommunityProofTrustSlipStatus}
              style={{
                position: "relative",
                boxShadow: "0 18px 36px rgba(2,12,27,0.20)",
              }}
            />

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
                stableHeight={isCompact ? 52 : 50}
                debugId="shop-gallery.verify-shop.request-trustslip"
                style={{
                  ...primaryBtn(false),
                  minHeight: isCompact ? 52 : 50,
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
                stableHeight={isCompact ? 52 : 50}
                debugId="shop-gallery.verify-shop.toggle-scan"
                style={{
                  ...secondaryBtn(!shopVerificationQrTarget),
                  minHeight: isCompact ? 52 : 50,
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
                stableHeight={isCompact ? 52 : 50}
                debugId="shop-gallery.verify-shop.open-community-record"
                style={{
                  ...secondaryBtn(false),
                  minHeight: isCompact ? 52 : 50,
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
                gap: isCompact ? 8 : 10,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  right: isCompact ? 12 : 20,
                  bottom: isCompact ? 10 : 14,
                  lineHeight: 1,
                  color: "rgba(246,215,122,0.08)",
                }}
              >
                <GsnRealisticIcon
                  name="trust-shield"
                  size={isCompact ? 74 : 96}
                  decorative
                  style={{ opacity: 0.72 }}
                />
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
                  gap: isCompact ? 5 : 6,
                  borderRadius: isCompact ? 14 : 16,
                  border: "1px solid rgba(246,196,83,0.22)",
                  background: "rgba(246,196,83,0.08)",
                  padding: isCompact ? "9px 10px" : "11px 13px",
                  color: "rgba(255,255,255,0.90)",
                  fontSize: isCompact ? 10.6 : 12.4,
                  fontWeight: 760,
                  lineHeight: 1.35,
                }}
              >
                <span
                  style={{
                    color: "#F6D77A",
                    fontSize: isCompact ? 10 : 11.5,
                    fontWeight: 950,
                    lineHeight: 1.1,
                  }}
                >
                  Before goods or money move
                </span>
                <span>{shopCommerceDecisionText}</span>
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
                      <GsnRealisticIcon
                        name={shop3DIconName(item.icon)}
                        size={isCompact ? 24 : 28}
                        decorative
                      />
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
              position: "relative",
              overflow: "hidden",
              borderRadius: isCompact ? 16 : 22,
              padding: isCompact ? "8px" : "12px",
              border: "1px solid rgba(37,211,102,0.28)",
              background:
                "linear-gradient(135deg, #FFFFFF 0%, #F5FFF8 54%, #F7FAFF 100%)",
              boxShadow:
                "0 12px 26px rgba(8,38,67,0.10), inset 0 1px 0 rgba(255,255,255,0.96)",
              display: "grid",
              gridTemplateColumns: isCompact
                ? "minmax(0, 0.78fr) minmax(0, 1.22fr)"
                : "minmax(0, 1fr) minmax(260px, 1.4fr)",
              alignItems: "center",
              gap: isCompact ? 8 : 12,
            }}
            aria-label="Owner contact choices"
          >
            <div
              aria-hidden="true"
              style={{
                display: "none",
                position: "absolute",
                left: -58,
                top: -54,
                width: isCompact ? 180 : 230,
                height: isCompact ? 114 : 142,
                borderRadius: "0 0 90% 0",
                background:
                  "linear-gradient(135deg, rgba(33,96,183,0.64) 0%, rgba(33,96,183,0.18) 64%, transparent 100%)",
              }}
            />
            <div
              aria-hidden="true"
              style={{
                display: "none",
                position: "absolute",
                right: -62,
                top: -38,
                width: isCompact ? 176 : 230,
                height: isCompact ? 108 : 136,
                borderRadius: "0 0 0 90%",
                background:
                  "linear-gradient(225deg, rgba(246,196,83,0.54) 0%, rgba(246,196,83,0.16) 58%, transparent 100%)",
              }}
            />
            <div style={{ position: "relative", textAlign: "left", display: "grid", minWidth: 0 }}>
              <div
                style={{
                  display: "none",
                  margin: "0 auto 6px",
                  width: isCompact ? 38 : 46,
                  height: isCompact ? 38 : 46,
                  borderRadius: 16,
                  border: "1px solid rgba(214,170,69,0.42)",
                  background:
                    "linear-gradient(145deg, rgba(255,255,255,0.92), rgba(235,244,255,0.74))",
                  placeItems: "center",
                  boxShadow:
                    "0 10px 22px rgba(8,38,67,0.10), inset 0 1px 0 rgba(255,255,255,0.86)",
                  color: "#1F5FB7",
                }}
              >
                <GsnRealisticIcon name="trust-shield" size={isCompact ? 32 : 38} decorative />
              </div>
              <div style={{ ...sectionLabel(), color: "#128C4A", fontSize: isCompact ? 8.5 : 10 }}>
                Contact owner
              </div>
              <div
                style={{
                  marginTop: 2,
                  color: "#07172C",
                  fontSize: isCompact ? 12.5 : 16,
                  fontWeight: 950,
                  lineHeight: 1.08,
                  maxWidth: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                WhatsApp
              </div>
              <div
                style={{
                  marginTop: 2,
                  color: "#5F7287",
                  fontSize: isCompact ? 9.6 : 12,
                  lineHeight: 1.2,
                  fontWeight: 750,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                Choose chat or call.
              </div>
            </div>

            <div
              style={{
                position: "relative",
                display: "none",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: isCompact ? 6 : 8,
                alignItems: "center",
                padding: isCompact ? 8 : 10,
                borderRadius: 14,
                border: "1px solid rgba(13,95,168,0.08)",
                background: "rgba(247,250,255,0.82)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 15,
                  display: "grid",
                  placeItems: "center",
                  color: "#1F5FB7",
                  background: "#FFFFFF",
                  border: "1px solid rgba(13,95,168,0.14)",
                }}
              >
                <GsnRealisticIcon name="trust-shield" size={30} decorative />
              </span>
              <div
                style={{
                  color: "#5F7287",
                  fontWeight: 760,
                  lineHeight: 1.25,
                  fontSize: isCompact ? 10.5 : 12,
                }}
              >
                <strong style={{ color: "#2E9B62" }}>WhatsApp</strong> opens the
                chat link.
              </div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  color: "#5F7287",
                  fontWeight: 760,
                  lineHeight: 1.25,
                  fontSize: isCompact ? 10.5 : 12,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-grid",
                    placeItems: "center",
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    color: "#1F5FB7",
                    background: "#FFFFFF",
                    border: "1px solid rgba(13,95,168,0.14)",
                  }}
                >
                  <GsnRealisticIcon name="phone-contact" size={24} decorative />
                </span>
                <span>
                  A <strong style={{ color: "#1F5FB7" }}>phone call</strong> opens the
                  number directly.
                </span>
              </div>
            </div>

            <div
              style={{
                position: "relative",
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: isCompact ? 6 : 8,
              }}
            >
              <PrimaryButton
                onClick={() => void contactOwnerByWhatsApp()}
                minWidth={0}
                fullWidth
                stableHeight={isCompact ? 40 : 48}
                debugId="shop-gallery.owner-contact.whatsapp-chat"
                style={{
                  ...primaryBtn(false),
                  minHeight: isCompact ? 40 : 48,
                  borderRadius: isCompact ? 13 : 16,
                  justifyContent: "center",
                  padding: isCompact ? "6px 8px" : "9px 12px",
                  fontSize: isCompact ? 12.2 : 15,
                  background:
                    "linear-gradient(180deg, #59D85B 0%, #36B848 52%, #26A141 100%)",
                  border: "1px solid rgba(34,197,94,0.52)",
                  boxShadow:
                    "0 10px 18px rgba(35,163,72,0.18), inset 0 1px 0 rgba(255,255,255,0.30)",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: isCompact ? 6 : 8 }}>
                  <GsnRealisticIcon name="phone-contact" size={isCompact ? 22 : 26} decorative />
                  <span>Chat</span>
                </span>
                <span aria-hidden="true" style={{ display: "none", color: "#FFFFFF", fontSize: isCompact ? 25 : 29 }}>
                  ›
                </span>
              </PrimaryButton>
              <SecondaryButton
                onClick={callOwnerPhone}
                minWidth={0}
                fullWidth
                stableHeight={isCompact ? 40 : 48}
                debugId="shop-gallery.owner-contact.phone-call"
                style={{
                  ...secondaryBtn(false),
                  minHeight: isCompact ? 40 : 48,
                  borderRadius: isCompact ? 13 : 16,
                  justifyContent: "center",
                  padding: isCompact ? "6px 8px" : "9px 12px",
                  fontSize: isCompact ? 12.2 : 15,
                  color: "#07172C",
                  background: "linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)",
                  border: "1px solid rgba(13,95,168,0.22)",
                  boxShadow:
                    "0 10px 22px rgba(8,38,67,0.10), inset 0 1px 0 rgba(255,255,255,0.92)",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: isCompact ? 6 : 8 }}>
                  <GsnRealisticIcon name="phone-contact" size={isCompact ? 22 : 26} decorative />
                  <span>Call</span>
                </span>
                <span aria-hidden="true" style={{ display: "none", color: "#1F5FB7", fontSize: isCompact ? 25 : 29 }}>
                  ›
                </span>
              </SecondaryButton>
            </div>
            <div
              style={{
                position: "relative",
                display: "none",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                color: "#5F7287",
                fontSize: isCompact ? 11 : 13,
                fontWeight: 760,
              }}
            >
              {inlineShopIcon("lock", "#5F7287", isCompact ? 13 : 15)}
              <span>Your contact details stay private and secure.</span>
            </div>
          </section>
        ) : null}

        <details
          data-public-shop-more="secondary"
          data-public-shop-live-spotlight={publicShopSpotlightActive ? "true" : "false"}
          data-public-shop-exact-update={routeDiaryEntryId > 0 ? "true" : "false"}
          open={
            !isCompact ||
            shopMoreOpen ||
            [
              `#${PUBLIC_SHOP_SPOTLIGHT_ANCHOR}`,
              `#${PUBLIC_SHOP_VAULT_ANCHOR}`,
              `#${PUBLIC_SHOP_DIARIES_ANCHOR}`,
            ].includes(location.hash)
          }
          onToggle={(event) => {
            if (isCompact) setShopMoreOpen(event.currentTarget.open);
          }}
          style={{
            order: routeDiaryEntryId > 0 ? 1 : 2,
            display: focusedBlockLinkActive ? "none" : "block",
          }}
        >
          <StableDisclosureSummary
            debugId="shop-gallery.more.toggle"
            stableHeight={50}
            style={{
              display: isCompact ? "flex" : "none",
              minHeight: 50,
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "0 14px",
              borderRadius: 16,
              border: "1px solid rgba(214,170,69,0.28)",
              background: "#FFFFFF",
              color: "#07172C",
              cursor: "pointer",
              fontSize: 13.5,
              fontWeight: 950,
              listStyle: "none",
            }}
          >
            <span>
              {routeDiaryEntryId > 0
                ? "Shared shop update"
                : ownerSpotlightStatusView
                ? ownerSpotlightStatusView.label
                : publicShopSpotlightActive
                ? "Live Spotlight"
                : "More from this shop"}
            </span>
            <span aria-hidden="true">
              {routeDiaryEntryId > 0 || shopMoreOpen ? "-" : "+"}
            </span>
          </StableDisclosureSummary>
          <div style={{ display: "grid", gap: isCompact ? 10 : 14, marginTop: isCompact ? 9 : 0 }}>
        <div
          data-public-shop-secondary-features="spotlight-vault"
          style={{
            display:
              focusedBlockLinkActive || routeDiaryEntryId > 0 ? "none" : "grid",
            gridTemplateColumns: "1fr",
            gap: isCompact ? 10 : 14,
          }}
        >
          <section
            id={PUBLIC_SHOP_SPOTLIGHT_ANCHOR}
            ref={spotlightRailRef}
            className="public-shop-section public-shop-spotlight"
            data-spotlight-canonical={miniSpotlight?.isCanonicalOpportunity ? "true" : "false"}
            data-owner-spotlight-inspection={
              ownerSpotlightStatusView?.state || "visitor"
            }
            onPointerEnter={pauseSpotlightPresentationRotation}
            onPointerDown={pauseSpotlightPresentationRotation}
            onFocusCapture={(event) => {
              const focusTarget = event.target;
              const keyboardFocus =
                focusTarget instanceof HTMLElement &&
                focusTarget.matches(":focus-visible");
              setSpotlightHasKeyboardFocus(keyboardFocus);
              pauseSpotlightPresentationRotation();
            }}
            onBlurCapture={() => {
              setSpotlightHasKeyboardFocus(false);
              pauseSpotlightPresentationRotation();
            }}
            style={{
              position: "relative",
              overflow: "hidden",
              scrollMarginTop: isCompact ? 96 : 88,
              borderRadius: isCompact ? 20 : 26,
              padding: isCompact ? 10 : 22,
              height: isCompact ? "auto" : undefined,
              minHeight: isCompact ? 456 : undefined,
              border: isCompact ? "1px solid rgba(13,95,168,0.28)" : "1px solid rgba(255,255,255,0.92)",
              background:
                isCompact
                  ? "radial-gradient(circle at 88% 4%, rgba(47,128,237,0.18) 0%, transparent 32%), radial-gradient(circle at 7% 4%, rgba(255,255,255,0.86) 0%, transparent 34%), linear-gradient(145deg, #F8FBFF 0%, #EAF4FF 46%, #DCEBFA 100%)"
                  : "radial-gradient(circle at 82% 18%, rgba(47,128,237,0.18) 0%, transparent 34%), radial-gradient(circle at 8% 0%, rgba(246,196,83,0.12) 0%, transparent 30%), linear-gradient(135deg, #FFFFFF 0%, #F7FBFF 48%, #EEF6FF 100%)",
              boxShadow:
                isCompact
                  ? "0 24px 46px rgba(8,38,67,0.16), 0 0 0 1px rgba(13,95,168,0.08), inset 0 1px 0 rgba(255,255,255,0.92)"
                  : "0 24px 52px rgba(8,38,67,0.14), 0 0 0 1px rgba(13,95,168,0.08), inset 0 1px 0 rgba(255,255,255,0.96)",
            }}
          >
            <div
              style={{
                position: "relative",
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "minmax(0, 0.95fr) minmax(340px, 0.9fr)",
                gap: isCompact ? 8 : 18,
                alignItems: "stretch",
                height: isCompact ? "auto" : undefined,
                minHeight: isCompact ? 436 : undefined,
                padding: 0,
              }}
            >
              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  gridColumn: isCompact ? "1" : "1",
                  gridRow: isCompact ? "2" : "1",
                  minWidth: 0,
                  overflow: "hidden",
                  display: "grid",
                  alignContent: "start",
                  gap: isCompact ? 5 : 0,
                  padding: isCompact ? "5px 4px 0" : 0,
                  maxWidth: isCompact ? "none" : undefined,
                }}
              >
                <div
                  style={{
                    width: isCompact ? "100%" : "fit-content",
                    maxWidth: "100%",
                    display: isCompact ? "grid" : "inline-flex",
                    gridTemplateColumns: isCompact
                      ? "minmax(0, 1fr) 48px"
                      : undefined,
                    alignItems: "center",
                    justifyContent: isCompact ? "space-between" : "flex-start",
                    gap: isCompact ? 6 : 6,
                    rowGap: isCompact ? 6 : undefined,
                    minHeight: isCompact ? 34 : 52,
                    padding: 0,
                    borderRadius: 0,
                    background: "transparent",
                    color: isCompact ? "#07172C" : "#276E4A",
                    fontSize: isCompact ? 9.5 : 12,
                    fontWeight: 950,
                    textTransform: "uppercase",
                    letterSpacing: 0,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      minHeight: isCompact ? 28 : "auto",
                      maxWidth: "100%",
                      minWidth: 0,
                      padding: isCompact ? "4px 8px" : "6px 11px",
                      borderRadius: isCompact ? 999 : 9,
                      background: isCompact ? "rgba(237,245,233,0.94)" : "#EDF5E9",
                      color: "#276E4A",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {inlineShopIcon("spark", "#276E4A", isCompact ? 10 : 13)}
                    {ownerSpotlightStatusView
                      ? ownerSpotlightStatusView.label
                      : publicShopSpotlightActive
                      ? firstMeaningful(miniSpotlightView.priceLabel, "Spotlight")
                      : "Spotlight"}
                  </span>
                  {signedInOwnsShop ? (
                    <ExistingWorkflowPlusLink
                      to={ownerSpotlightShortcutPath}
                      label='Add Spotlight'
                      debugId='shop-gallery.spotlight.owner-shortcut'
                      shortcut='spotlight'
                      data-spotlight-shortcut-mode={ownerSpotlightShortcutMode}
                    />
                  ) : null}
                  {spotlightWhatsAppAvailable ? (
                    <PrimaryButton
                      onClick={contactSpotlightOwnerByWhatsApp}
                      minWidth={0}
                      fullWidth={false}
                      stableHeight={isCompact ? 34 : 52}
                      debugId="shop-gallery.spotlight.whatsapp-chat"
                      style={{
                        ...primaryBtn(false),
                        gridColumn: isCompact ? "1 / -1" : undefined,
                        justifySelf: isCompact ? "end" : undefined,
                        borderRadius: 999,
                        minHeight: isCompact ? 34 : 52,
                        width: "fit-content",
                        maxWidth: "100%",
                        padding: isCompact ? "5px 9px" : "10px 16px",
                        fontSize: isCompact ? 11 : 14,
                        whiteSpace: "nowrap",
                        background:
                          "linear-gradient(180deg, #25D366 0%, #128C4A 100%)",
                        border: "1px solid rgba(37,211,102,0.38)",
                        boxShadow: isCompact
                          ? "0 8px 14px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.18)"
                          : undefined,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: isCompact ? 3 : 8,
                        }}
                      >
                        {inlineShopIcon("phone", "#FFFFFF", isCompact ? 11 : 15)}
                        WhatsApp
                      </span>
                    </PrimaryButton>
                  ) : null}
                </div>
                <div
                  style={{
                    marginTop: isCompact ? 0 : 10,
                    color: "#07172C",
                    fontSize: isCompact ? 20 : 34,
                    fontWeight: 950,
                    lineHeight: isCompact ? 1.04 : 1.04,
                    textTransform: isCompact ? "none" : "uppercase",
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "clip",
                    display: "-webkit-box",
                    WebkitLineClamp: isCompact ? 2 : 3,
                    WebkitBoxOrient: "vertical" as any,
                    overflowWrap: "anywhere",
                    wordBreak: "normal",
                  }}
                >
                  {ownerSpotlightStatusView
                    ? ownerSpotlightStatusView.title
                    : publicShopSpotlightActive
                    ? miniSpotlightView.title
                    : "Discover what's new"}
                </div>
                {spotlightFeedError ? (
                  <div
                    data-spotlight-feed-error='true'
                    style={{
                      marginTop: 7,
                      color: '#8A4B08',
                      fontSize: 12,
                      lineHeight: 1.4,
                      fontWeight: 820,
                    }}
                  >
                    {spotlightFeedError}
                  </div>
                ) : null}
                {spotlightMediaUnavailableKey === spotlightMediaKey &&
                spotlightMediaKey ? (
                  <div
                    data-spotlight-media-status='unavailable'
                    style={{
                      marginTop: 7,
                      color: '#8A4B08',
                      fontSize: 12,
                      lineHeight: 1.4,
                      fontWeight: 820,
                    }}
                  >
                    Media could not be shown. GSN will not count this showing and will retry automatically.
                  </div>
                ) : null}
                {isCompact && ownerSpotlightStatusView?.detail ? (
                  <div
                    data-owner-spotlight-status-detail="true"
                    style={{
                      color: "#425E78",
                      fontSize: 11.5,
                      lineHeight: 1.35,
                      fontWeight: 720,
                    }}
                  >
                    {ownerSpotlightStatusView.detail}
                  </div>
                ) : null}
                {!isCompact && (!ownerSpotlightStatusView || ownerSpotlightStatusView.detail) ? (
                  <div
                    style={{
                      marginTop: 10,
                      color: "#425E78",
                      fontSize: 15,
                      lineHeight: 1.35,
                      fontWeight: 720,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical" as any,
                    }}
                  >
                    {ownerSpotlightStatusView
                      ? ownerSpotlightStatusView.detail
                      : publicShopSpotlightActive
                      ? miniSpotlightView.detail
                      : "Fresh items, hot deals, and public shop updates."}
                  </div>
                ) : null}
              </div>
              <div
                style={{
                  minHeight: isCompact ? 318 : 340,
                  height: isCompact ? 318 : 340,
                  borderRadius: isCompact ? 18 : 20,
                  overflow: "hidden",
                  position: "relative",
                  gridColumn: isCompact ? "1" : "2",
                  gridRow: "1",
                  zIndex: 1,
                  background:
                    "radial-gradient(circle at 38% 18%, rgba(255,255,255,0.96) 0%, rgba(234,243,255,0.72) 46%, rgba(11,99,209,0.15) 100%)",
                  border: isCompact ? "1px solid rgba(13,95,168,0.18)" : "1px solid rgba(255,255,255,0.94)",
                  boxShadow:
                    isCompact
                      ? "inset 0 1px 0 rgba(255,255,255,0.10)"
                      : "0 16px 30px rgba(8,38,67,0.13), inset 0 1px 0 rgba(255,255,255,0.82)",
                }}
              >
                {miniSpotlightView.imageUrl || miniSpotlightView.videoUrl ? (
                  <SpotlightMediaFrame
                    key={spotlightMediaKey}
                    imageUrl={miniSpotlightView.imageUrl}
                    videoUrl={miniSpotlightView.videoUrl}
                    videoPoster={miniSpotlightView.imageUrl}
                    alt={miniSpotlightView.title}
                    onMediaReady={() => {
                      if (!spotlightMediaKey) return;
                      setSpotlightMediaUnavailableKey('');
                      setSpotlightMediaReadyKey(spotlightMediaKey);
                    }}
                    onMediaUnavailable={() => {
                      if (!spotlightMediaKey) return;
                      setSpotlightMediaReadyKey('');
                      setSpotlightMediaUnavailableKey(spotlightMediaKey);
                    }}
                    fallback={
                      <div
                        data-spotlight-media-unavailable='true'
                        style={{
                          width: '100%',
                          height: '100%',
                          minHeight: isCompact ? 318 : 340,
                          display: 'grid',
                          placeItems: 'center',
                          padding: 18,
                          boxSizing: 'border-box',
                          color: '#173A5C',
                          background:
                            'linear-gradient(180deg, #F8FBFF 0%, #EAF4FF 100%)',
                          fontSize: 13,
                          fontWeight: 850,
                          lineHeight: 1.45,
                          textAlign: 'center',
                        }}
                      >
                        This Spotlight media is not available yet. GSN will retry, and this showing will not be counted.
                      </div>
                    }
                    contentPadding={0}
                    showVideoControls={false}
                    autoPlayVideo={Boolean(miniSpotlightView.videoUrl)}
                    mutedVideo={Boolean(miniSpotlightView.videoUrl)}
                    loopVideo={Boolean(miniSpotlightView.videoUrl)}
                    showAudioUnlock={Boolean(miniSpotlightView.videoUrl)}
                    audioUnlockLabel="Sound on"
                    audioUnlockOffLabel="Muted"
                    audioUnlockErrorLabel="Play"
                    audioUnlockStyle={{
                      top: isCompact ? 12 : "auto",
                      right: isCompact ? 12 : 10,
                      bottom: isCompact ? "auto" : 10,
                      minWidth: isCompact ? 44 : 38,
                      width: isCompact ? 44 : 38,
                      minHeight: isCompact ? 44 : 38,
                      padding: 0,
                      fontSize: isCompact ? 14 : 18,
                      boxShadow: "0 10px 18px rgba(2, 12, 27, 0.22)",
                    }}
                    maxVideoSeconds={SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS}
                    frameStyle={{
                      width: "100%",
                      height: isCompact ? 318 : 340,
                      minHeight: isCompact ? 318 : 340,
                      borderRadius: isCompact ? 18 : 20,
                    }}
                    mediaStyle={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center",
                    }}
                  />
                ) : heroImage && !ownerSpotlightStatusView && !miniSpotlight ? (
                  <img
                    src={heroImage}
                    alt={shopNameText}
                    style={{
                      width: "100%",
                      height: isCompact ? 318 : 340,
                      minHeight: isCompact ? 318 : undefined,
                      objectFit: "cover",
                      objectPosition: "center",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      height: isCompact ? 318 : 340,
                      minHeight: isCompact ? 318 : undefined,
                      display: "grid",
                      placeItems: "center",
                      color: "#D7E3F1",
                      fontWeight: 850,
                      fontSize: isCompact ? 12 : 14,
                      textAlign: "center",
                      padding: isCompact ? 10 : 16,
                    }}
                  >
                    {miniSpotlight ? (
                      <span data-spotlight-media-missing='true'>
                        This Spotlight does not have ready media. GSN will not count this showing.
                      </span>
                    ) : (
                      <GsnRealisticIcon name="shop-storefront" size={isCompact ? 42 : 52} decorative />
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section
            id={PUBLIC_SHOP_VAULT_ANCHOR}
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
                minHeight: isCompact ? 76 : 112,
                display: "grid",
                placeItems: "stretch",
              }}
            >
              <PublicVaultEmblem compact={isCompact} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...sectionLabel(), color: "#F6D77A" }}>
                {labelWithShopIcon("vault", "Private Vault", "#F6D77A")}
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
                Owner invitation only.
              </div>
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
                  stableHeight={isCompact ? 52 : 48}
                  debugId="shop-gallery.ask-vault-access"
                  style={{
                    ...primaryBtn(false),
                    minHeight: isCompact ? 52 : 48,
                    padding: isCompact ? "6px 9px" : "10px 14px",
                    borderRadius: 999,
                    fontSize: isCompact ? 9.6 : 14,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  Request access
                </PrimaryButton>
                <SecondaryButton
                  onClick={copyVaultRequestLink}
                  minWidth={0}
                  stableHeight={isCompact ? 52 : 48}
                  debugId="shop-gallery.copy-vault-request-link"
                  style={{
                    ...secondaryBtn(false),
                    minHeight: isCompact ? 52 : 48,
                    padding: isCompact ? "6px 9px" : "9px 12px",
                    borderRadius: 999,
                    fontSize: isCompact ? 9.6 : 14,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  Copy request
                </SecondaryButton>
              </div>
            </div>
          </section>
        </div>

        <section
          id={PUBLIC_SHOP_DIARIES_ANCHOR}
          className="public-shop-section public-shop-diary"
          style={{
            display: focusedBlockLinkActive ? "none" : "block",
            borderRadius: isCompact ? 24 : 28,
            padding: isCompact ? 10 : 18,
            border: "1px solid rgba(255,255,255,0.92)",
            background: "linear-gradient(135deg, #FFFFFF 0%, #F8FBFF 58%, #EEF6FF 100%)",
            boxShadow: "0 24px 52px rgba(8,38,67,0.12), 0 0 0 1px rgba(13,95,168,0.07), inset 0 1px 0 rgba(255,255,255,0.96)",
            scrollMarginTop: 12,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "center", gap: isCompact ? 8 : 12, marginBottom: isCompact ? 10 : 14 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...sectionLabel(), color: "#07172C", fontSize: isCompact ? 15 : 17, fontWeight: 950, textTransform: "uppercase" }}>Shop Update</div>
              <div style={{ marginTop: 4, color: "#526C84", fontSize: isCompact ? 11.5 : 13, lineHeight: 1.3, fontWeight: 700 }}>Latest message from this shop.</div>
            </div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              {signedInOwnsShop ? (
                <ExistingWorkflowPlusLink
                  to={ownerShopDiaryPath}
                  label="Add diary entry"
                  debugId="shop-gallery.diary.owner-shortcut"
                  shortcut="shop-diary"
                />
              ) : null}
              <span style={badge(Boolean(featuredDiaryEntry))}>{featuredDiaryEntry ? "Live now" : "No live update"}</span>
            </span>
          </div>

          {featuredDiaryEntry ? (
            <div style={{ display: "grid", gap: 12 }}>
              <article className="public-shop-diary-featured" style={{ borderRadius: isCompact ? 20 : 24, overflow: "hidden", border: "1px solid rgba(184,137,45,0.42)", background: "#FFFFFF", boxShadow: "0 18px 36px rgba(6,24,39,0.12)" }}>
                <div style={{ padding: isCompact ? "12px 12px 14px" : "15px 16px 17px", background: "#FFFFFF" }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={badge(true)}>{featuredDiaryEntry.activity_label || "Other update"}</span>
                  </div>
                  <div style={{ marginTop: 8, color: "#07172C", fontSize: isCompact ? 19 : 22, fontWeight: 950, lineHeight: 1.12 }}>{featuredDiaryEntry.note}</div>
                  <div style={{ marginTop: 8, color: "#526C84", fontSize: isCompact ? 12.5 : 13.5, fontWeight: 700, lineHeight: 1.35 }}>
                    {new Date(featuredDiaryEntry.occurred_at || featuredDiaryEntry.created_at || Date.now()).toLocaleDateString()}
                    {featuredDiaryEntry.product_name ? ` - Related to ${featuredDiaryEntry.product_name}` : ""}
                  </div>
                </div>
              </article>

            </div>
          ) : (
            <div style={{ ...innerCard("#F8FBFF") }}>
              <div style={{ color: "#0B1F33", fontWeight: 900, fontSize: 18 }}>{routeDiaryEntryId > 0 ? "This update is no longer available." : "No live update right now."}</div>
              <div style={{ marginTop: 8, ...helperText() }}>{routeDiaryEntryId > 0 ? "It may have expired or been made private. You can still browse this shop." : "Browse the products and services above, or contact the owner to ask what is available today."}</div>
            </div>
          )}
        </section>
          </div>
        </details>
        <section
          className="public-shop-section"
          style={{
            order: routeDiaryEntryId > 0 ? 2 : 1,
            borderRadius: isCompact ? 24 : 28,
            padding: isCompact ? 9 : 18,
            border: "1px solid rgba(255,255,255,0.92)",
            background:
              "radial-gradient(circle at 6% 0%, rgba(47,128,237,0.12) 0%, transparent 34%), linear-gradient(135deg, #FFFFFF 0%, #F7FBFF 56%, #EEF6FF 100%)",
            boxShadow:
              "0 26px 56px rgba(8,38,67,0.13), 0 0 0 1px rgba(13,95,168,0.08), inset 0 1px 0 rgba(255,255,255,0.96)",
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
              <div
                style={{
                  ...sectionLabel(),
                  color: "#07172C",
                  fontSize: isCompact ? 15 : 17,
                  fontWeight: 950,
                  textTransform: "uppercase",
                  textShadow:
                    "0 1px 0 rgba(255,255,255,0.94), 0 10px 18px rgba(8,38,67,0.10)",
                }}
              >
                {labelWithShopIcon("cart", "Products & Services")}
              </div>
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
                  ? "Shared item."
                  : "Browse items. Ask the owner about availability."}
              </div>

            </div>
            <span style={badge(true)}>
              {focusedBlockProduct
                ? publicShopBlockLabel(focusedBlockProduct)
                : focusedBlockLinkActive
                ? "Shared item"
                : shopDiaryCounterText}
            </span>
          </div>

          {loading ? (
            <div style={{ ...helperText(), padding: 16 }}>
              {autoRefreshingShop
                ? "Reconnecting shop..."
                : "Loading shop items..."}
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
                    stableHeight={isCompact ? 52 : 48}
                    debugId="shop-gallery.reconnect-owner-shop"
                  >
                    Reconnect my shop
                  </PrimaryButton>
                ) : (
                  <StableCtaLink
                    to={loginReconnectPath}
                    fullWidth
                    stableHeight={isCompact ? 52 : 48}
                    debugId="shop-gallery.sign-in-reconnect-shop"
                  >
                    Sign in to reconnect
                  </StableCtaLink>
                )}
                <StableCtaLink
                  to="/app/marketplace"
                  fullWidth
                  stableHeight={isCompact ? 52 : 48}
                  debugId="shop-gallery.open-marketplace-refresh"
                >
                  Open Marketplace
                </StableCtaLink>
              </div>
            </div>
          ) : visibleProducts.length === 0 ? (
            <div style={{ ...innerCard("#F8FBFF") }}>
              <div style={{ color: "#0B1F33", fontWeight: 900, fontSize: 18 }}>
                No public items yet.
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Check back later, share this shop, or ask for Vault access.
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
                  stableHeight={isCompact ? 52 : 48}
                  debugId="shop-gallery.empty-ask-vault-access"
                  style={{
                    ...primaryBtn(false),
                    minHeight: isCompact ? 52 : 48,
                  }}
                >
                  Ask for Vault access
                </PrimaryButton>
                <SecondaryButton
                  onClick={copyShopLink}
                  fullWidth
                  stableHeight={isCompact ? 52 : 48}
                  debugId="shop-gallery.empty-copy-shop-link"
                  style={{
                    ...secondaryBtn(shopLoadFailed),
                    minHeight: isCompact ? 52 : 48,
                  }}
                >
                  Copy GSN shop paper
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
                const productMediaKey = [
                  productOpenId,
                  isProductOpen ? "open" : "closed",
                  productImageUrl,
                  productVideoUrl,
                ].join("|");
                const diaryActionHeight = isProductOpen
                  ? showBlockPlacementAction
                    ? 48
                    : isCompact
                    ? 36
                    : 40
                  : isCompact
                  ? 38
                  : 42;
                const diaryActionWidth = isProductOpen
                  ? showBlockPlacementAction
                    ? 48
                    : isCompact
                    ? 36
                    : 40
                  : isCompact
                  ? 40
                  : 44;
                const productOpenActionRailWidth = showBlockPlacementAction
                  ? diaryActionWidth * 4 + (isCompact ? 6 : 8) * 3
                  : diaryActionWidth;
                const productOpenActionColumns = showBlockPlacementAction
                  ? `repeat(4, ${diaryActionWidth}px)`
                  : `${diaryActionWidth}px`;
                const diaryMediaControlHeight = isCompact ? 34 : 38;
                const diaryClosedDockHeight = isCompact ? 58 : 68;
                const diaryOpenDockHeight = isCompact ? 92 : 104;

                return (
                  <article
                    key={`public-diary-${product.id || index}`}
                    className="shop-diary-card"
                    id={publicShopBlockAnchorId(product)}
                    aria-expanded={isProductOpen}
                    data-product-media-attention-id={
                      positiveNumber(product.id) || undefined
                    }
                    onClick={(event) => {
                      if (isInteractiveCardTarget(event.target)) return;
                      if (!isProductOpen) {
                        setOpenProductId(productOpenId);
                        return;
                      }
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
                      border: "1px solid rgba(255,255,255,0.92)",
                      background:
                        "linear-gradient(135deg, #FFFFFF 0%, #F8FBFF 100%)",
                      overflow: "hidden",
                      boxShadow:
                        "0 20px 34px rgba(8,38,67,0.17), 0 0 0 1px rgba(13,95,168,0.10), 0 0 0 4px rgba(255,255,255,0.42), inset 0 1px 0 rgba(255,255,255,0.96)",
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
                          key={productMediaKey}
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
                          audioUnlockOffLabel="Muted"
                          audioUnlockErrorLabel="Play"
                          audioUnlockStyle={{
                            top: isCompact ? 7 : 10,
                            right: isCompact ? 7 : 10,
                            minWidth: diaryMediaControlHeight,
                            width: diaryMediaControlHeight,
                            minHeight: diaryMediaControlHeight,
                            height: diaryMediaControlHeight,
                            maxHeight: diaryMediaControlHeight,
                            padding: 0,
                            fontSize: isCompact ? 17 : 19,
                            border: "1px solid rgba(255,255,255,0.52)",
                            background: "rgba(6,24,39,0.74)",
                            boxShadow: "0 8px 16px rgba(2, 12, 27, 0.22)",
                            backdropFilter: "blur(6px)",
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
                            objectPosition: "center",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            height: "100%",
                            display: "grid",
                            placeItems: "center",
                            color: "#D7E3F1",
                            fontWeight: 850,
                            fontSize: isCompact ? 11 : 12,
                            padding: 8,
                            textAlign: "center",
                            background:
                              "radial-gradient(circle at 50% 28%, rgba(255,255,255,0.16) 0%, rgba(234,243,255,0.07) 42%, rgba(6,24,39,0.18) 100%)",
                          }}
                        >
                          <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
                            <GsnRealisticIcon
                              name="shopping-cart"
                              size={isCompact ? 54 : 66}
                              decorative
                              imageStyle={{ width: "100%", height: "100%" }}
                            />
                            <span>Picture soon</span>
                          </div>
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
                            ? "7px 9px"
                            : "9px 12px"
                          : isCompact
                          ? "6px 7px"
                          : "7px 9px",
                        boxSizing: "border-box",
                        display: "grid",
                        gridTemplateColumns: isProductOpen
                          ? `minmax(0, 1fr) ${productOpenActionRailWidth}px`
                          : `minmax(0, 1fr) ${diaryActionWidth}px`,
                        gridTemplateRows: isProductOpen
                          ? "auto auto auto"
                          : "auto auto",
                        gap: isProductOpen ? (isCompact ? 3 : 4) : "2px 7px",
                        alignContent: "end",
                        background:
                          isProductOpen
                            ? "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(247,251,255,0.98) 100%)"
                            : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,251,255,0.96) 100%)",
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
                              ? 17
                              : 20
                            : isCompact
                            ? 13
                            : 17,
                          lineHeight: 1.08,
                          display: "-webkit-box",
                          WebkitLineClamp: isProductOpen ? 1 : isCompact ? 1 : 2,
                          WebkitBoxOrient: "vertical" as any,
                          overflow: "hidden",
                          textShadow:
                            "0 1px 0 rgba(255,255,255,0.88), 0 9px 16px rgba(8,38,67,0.10)",
                        }}
                      >
                        {displayTitle}
                      </div>
                      {isProductOpen ? (
                        <div
                          style={{
                            color: "#526C84",
                            fontWeight: 650,
                            fontSize: isCompact ? 12 : 13,
                            lineHeight: 1.12,
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
                            ? productOpenActionColumns
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
                            color: isProductOpen ? "#526C84" : "#0B63B6",
                            background:
                              "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,248,255,0.92) 100%)",
                          }}
                        >
                          <span
                            data-product-card-toggle-symbol={isProductOpen ? "close" : "open"}
                            aria-hidden="true"
                            style={{
                              display: "inline-grid",
                              placeItems: "center",
                              width: "100%",
                              height: "100%",
                              fontSize: isCompact ? 25 : 28,
                              fontWeight: 760,
                              lineHeight: 1,
                              transform: isProductOpen ? "translateY(-1px)" : "none",
                            }}
                          >
                            {isProductOpen ? "×" : "+"}
                          </span>
                        </SecondaryButton>
                        {showBlockPlacementAction ? (
                          <SocialTagShareButton
                            target={buildProductSocialShareTarget(product)}
                            buttonLabel="Share"
                            minWidth={0}
                            stableHeight={diaryActionHeight}
                            debugId={`shop-gallery.product.${productOpenId}.owner-share`}
                            onResult={(tone, text, channel) => {
                              if (tone === "success") {
                                trackShopShareAction(
                                  "share_product",
                                  appendShopShareAttribution(
                                    publicShopShareUrl({
                                      gmfnId: firstMeaningful(effectiveShop?.gmfnId, gmfnId),
                                      productId: product.id,
                                      block: product.slotNumber,
                                    }),
                                    "share_product",
                                    channel
                                  ),
                                  product
                                );
                              }
                              setNotice({ tone, text });
                            }}
                            style={{
                              ...secondaryBtn(false),
                              display: isProductOpen ? "inline-flex" : "none",
                              width: diaryActionWidth,
                              maxWidth: diaryActionWidth,
                              minWidth: 0,
                              minHeight: diaryActionHeight,
                              padding: 0,
                              borderRadius: 999,
                              fontSize: isCompact ? 9.3 : 10.2,
                              lineHeight: 1,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              overflowWrap: "normal",
                              overflowAnchor: "none",
                              background:
                                "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,248,255,0.92) 100%)",
                            }}
                          />
                        ) : null}
                        {showBlockPlacementAction ? (
                          <StableCtaLink
                            to={blockPlacementPath(product)}
                            onClick={paidRepostHandoffHandler(product)}
                            minWidth={0}
                            stableHeight={diaryActionHeight}
                            debugId={`shop-gallery.product.${productOpenId}.paid-placement`}
                            aria-label={`Repost ${displayTitle} into another community Spotlight`}
                            title="Paid Repost"
                            style={{
                              ...secondaryBtn(false),
                              display: isProductOpen ? "inline-flex" : "none",
                              width: diaryActionWidth,
                              maxWidth: diaryActionWidth,
                              minWidth: 0,
                              minHeight: diaryActionHeight,
                              padding: 0,
                              borderRadius: 999,
                              fontSize: isCompact ? 9.5 : 10.5,
                              lineHeight: 1,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              overflowWrap: "normal",
                              overflowAnchor: "none",
                              background:
                                "linear-gradient(180deg, rgba(255,247,214,0.99) 0%, rgba(222,172,55,0.92) 100%)",
                              borderColor: "rgba(177,132,29,0.36)",
                              color: "#082643",
                            }}
                          >
                            Repost
                          </StableCtaLink>
                        ) : null}

                        {showBlockPlacementAction && positiveNumber(product.id) ? (
                          <ExistingWorkflowPlusLink
                            to={ownerProductManagePath(product)}
                            label={`Manage media for ${displayTitle}`}
                            debugId={`shop-gallery.product.${productOpenId}.owner-manage`}
                            shortcut="shop-product"
                            preserveOrigin={false}
                            data-owner-product-id={positiveNumber(product.id)}
                            data-owner-product-block={positiveNumber(product.slotNumber)}
                            style={{
                              display: isProductOpen ? "inline-flex" : "none",
                              alignSelf: "center",
                              justifySelf: "start",
                              overflowAnchor: "none",
                            }}
                          />
                        ) : null}

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
              {showAllProducts ? "Show less" : `Show ${overflowProductCount} more`}
            </SecondaryButton>
          ) : null}
        </section>
      </section>
      </div>
    </main>
  );
}
