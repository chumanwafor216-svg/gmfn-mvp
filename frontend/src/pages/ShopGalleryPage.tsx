import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import GSNBrandMark from "../components/GSNBrandMark";
import ShopVoiceNotePlayer from "../components/ShopVoiceNotePlayer";

import { GsnRealisticIcon, type Gsn3DIconKey } from "../components/GsnRealisticIcon";
import PublicShopPhotoHero from "../components/shop/PublicShopPhotoHero";
import PrivateVaultEverydayItems from "../components/PrivateVaultEverydayItems";
import OwnerOnlySurfaceNav from "../components/OwnerOnlySurfaceNav";
import SocialTagShareButton from "../components/SocialTagShareButton";
import SpotlightMediaFrame, {
  type SpotlightMediaReadyDetails,
  type SpotlightPlaybackStateDetails,
} from "../components/SpotlightMediaFrame";
import { PrimaryButton, SecondaryButton, StableCtaLink, StableDisclosureSummary, SubtleButton } from "../components/StableButton";
import ExistingWorkflowPlusLink from '../components/ExistingWorkflowPlusLink';
import {
  acknowledgeSpotlightPresentationSupply,
  createMarketplaceShop,
  createMarketplacePurchaseIntention,
  createMarketplaceProductEnquiry,
  followMarketplaceShop,
  getAccessToken,
  getCurrentClan,
  getMarketplaceBroadcasts,
  getMarketplaceShopFollowStatus,
  getMarketplaceShopSpotlightStatus,
  getPublicShopSpotlightOpportunity,
  getSpotlightAdvertPreferences,
  listMyClans,
  logout,
  getMe,
  getPublicMarketplaceShopByGmfnId,
  saveMarketplaceProduct,
  unsaveMarketplaceProduct,
  listSavedMarketplaceProducts,
  listLikedMarketplaceProducts,
  likeMarketplaceProduct,
  unlikeMarketplaceProduct,
  saveSpotlightAdvert,
  unsaveSpotlightAdvert,
  likeSpotlightAdvert,
  unlikeSpotlightAdvert,
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
  PUBLIC_SHOP_PRODUCTS_ANCHOR,
  PUBLIC_SHOP_SPOTLIGHT_ANCHOR,
  PUBLIC_SHOP_VAULT_ANCHOR,
  publicFrontendUrl,
  publicShopPath,
  publicShopShareCardUrl,
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
import { selectShopHeroSource } from "../lib/shopHeroSelection";
import { ownerSurfaceIdentityMatches } from "../lib/ownerSurfaceIdentity";
import { APP_ROUTES, routeWithCommunity } from "../lib/appRoutes";
import { OWNER_SHOP_HASHES } from "../lib/ownerShopHandles";
import { revealElementWithoutJump } from "../lib/mobileRevealStability";
import {
  SPOTLIGHT_PREMIUM_MAX_VIDEO_SECONDS,
  SPOTLIGHT_PILOT_REFRESH_MS,
} from "../lib/spotlightPilot";
import {
  PUBLIC_SHOP_SPOTLIGHT_INTERACTION_PAUSE_MS,
  PUBLIC_SHOP_SPOTLIGHT_MIN_VISIBLE_RATIO,
  publicShopSpotlightRotationMs,
  PUBLIC_SHOP_SPOTLIGHT_QUALIFYING_VISIBLE_MS,
} from "../lib/spotlightPresentationPolicy";
import {
  spotlightPlaybackCanQualify,
  spotlightPlaybackPausesDisplayClock,
  spotlightTransitionCanRetainFrame,
} from '../lib/spotlightPlaybackPolicy.js';

const SPOTLIGHT_REFRESH_RETRY_DELAY_MS = 2000;
const SPOTLIGHT_REFRESH_RETRY_LIMIT = 3;
const SPOTLIGHT_MEDIA_PRELOAD_TIMEOUT_MS = 8000;
const SPOTLIGHT_AUTHORIZED_FRAME_HOLD_MS = 1500;

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
  voiceAttachmentId?: number;
  voiceDurationSeconds?: number;
  voiceDeletedAt?: string;
  voiceSpeakerName?: string;
  voiceSpeakerGmfnId?: string;
};

type ShopFollowState = {
  shopId: number;
  isFollowing: boolean;
  canFollow: boolean;
  isOwner: boolean;
  ownershipResolved?: boolean;
  followerCount: number;
  loading: boolean;
  busy: boolean;
};

type SpotlightMediaStatus =
  | {
      status: 'ready';
      kind: SpotlightMediaReadyDetails['kind'];
      durationSeconds: number | null;
      fallbackFromVideo: boolean;
    }
  | { status: 'unavailable' };

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
  imageAvailable: boolean;
  isActive: boolean;
  videoUrl: string;
  visibilityMode: string;
  createdAt: string;
  originShopName: string;
  isSaved: boolean;
  originClanId: number;
  repostsUsed: number;
  distributionSlotsRemaining: number;
  voiceAttachmentId?: number;
  voiceDurationSeconds?: number;
  voiceDeletedAt?: string;
  voiceSpeakerName?: string;
  voiceSpeakerGmfnId?: string;
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
  sourceProductIsActive?: boolean;
  sourceProductImageUrl: string;
  sourceProductVideoUrl: string;
  sourceShopName: string;
  sourceShopWhatsApp: string;
  advertiserContactPhone: string;
  campaignSourceKind: string;
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
  isCanonicalVisibility?: boolean;
  opportunityCampaignId?: number;
  opportunityPresentationId?: string;
  opportunityPresentationToken?: string;
  opportunityPresentationExpiresAt?: string;
  opportunityReplayExpiresAt?: string;
  opportunityVisibilityExpiresAt?: string;
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

type SpotlightCommercialIntentType =
  | "buy_now"
  | "book_now"
  | "request_quote"
  | "notify_me";

type SpotlightFulfilmentMethod = "collection" | "delivery" | "on_request";

type ShopPurchaseDraft = {
  productId: number;
  shopId: number;
  clanId: number;
  intentType: "buy_now" | "request_quote";
  quantity: number;
  fulfilmentMethod: SpotlightFulfilmentMethod;
  clientRequestId: string;
};

type SpotlightTransitionState = {
  phase: 'holding' | 'neutral' | 'handoff';
  sourceOccurrenceId: string;
  startedAtMs: number;
  targetItem: ShopBroadcast | null;
  targetMediaKey: string;
};

type PublicShopSpotlightSelectionCycle = {
  items: any[] | null;
  promise?: Promise<any[] | null>;
  authoritative: boolean;
  requestId: string;
  selectedAtMs: number;
  expiresAtMs: number;
};

type PublicShopSpotlightWindowResult = {
  items: ShopBroadcast[];
  rotationCycleComplete: boolean;
};
const publicShopSpotlightSelectionCycles = new Map<
  string,
  PublicShopSpotlightSelectionCycle
>();
const PUBLIC_SHOP_PURCHASE_DRAFT_KEY = "gsn.public-shop.purchase-draft.v1";

function newPurchaseRequestId(productId: number): string {
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Date.now() + "-" + Math.random().toString(36).slice(2, 12);
  return ("shop-purchase-" + productId + "-" + randomPart).slice(0, 80);
}

function readShopPurchaseDraft(): ShopPurchaseDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(
      window.sessionStorage.getItem(PUBLIC_SHOP_PURCHASE_DRAFT_KEY) || "null"
    );
    const productId = positiveNumber(parsed?.productId);
    const shopId = positiveNumber(parsed?.shopId);
    const quantity = positiveNumber(parsed?.quantity);
    const intentType =
      parsed?.intentType === "request_quote" ? "request_quote" : "buy_now";
    const fulfilmentMethod = ["collection", "delivery", "on_request"].includes(
      parsed?.fulfilmentMethod
    )
      ? parsed.fulfilmentMethod
      : intentType === "request_quote"
      ? "on_request"
      : "collection";
    const clientRequestId = safeStr(parsed?.clientRequestId);
    if (!productId || !shopId || !quantity || clientRequestId.length < 8) {
      return null;
    }
    return {
      productId,
      shopId,
      clanId: positiveNumber(parsed?.clanId),
      intentType,
      quantity: Math.min(quantity, 99),
      fulfilmentMethod,
      clientRequestId,
    };
  } catch {
    return null;
  }
}

function writeShopPurchaseDraft(draft: ShopPurchaseDraft | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!draft) {
      window.sessionStorage.removeItem(PUBLIC_SHOP_PURCHASE_DRAFT_KEY);
      return;
    }
    window.sessionStorage.setItem(
      PUBLIC_SHOP_PURCHASE_DRAFT_KEY,
      JSON.stringify(draft)
    );
  } catch {
  }
}

function shopProductCommercialAction(product: ShopProduct): {
  intentType: "buy_now" | "request_quote";
  label: "Request to buy" | "Request quote";
} {
  const hasListedPrice =
    Boolean(firstMeaningful(product.priceText)) &&
    product.priceText.toLowerCase() !== "price on request";
  return hasListedPrice
    ? { intentType: "buy_now", label: "Request to buy" }
    : { intentType: "request_quote", label: "Request quote" };
}

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

const GALLERY_STANDARD_SLOTS_TOTAL = 12;
const GALLERY_EXTRA_SLOTS_LIMIT = 0;
const GALLERY_SLOTS_TOTAL = GALLERY_STANDARD_SLOTS_TOTAL + GALLERY_EXTRA_SLOTS_LIMIT;
const GALLERY_INITIAL_VISIBLE_PRODUCT_COUNT = 6;
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
  const visibilityExpiresAt = firstMeaningful(
    src?.opportunity_visibility_expires_at,
    src?.opportunityVisibilityExpiresAt
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
  const canonicalVisibility = Boolean(
    (src?.is_canonical_visibility || src?.isCanonicalVisibility) &&
      !presentationToken &&
      visibilityExpiresAt &&
      countsAsDelivery === false &&
      countsAsExposure === false
  );
  return Boolean(
    src?.is_canonical_opportunity &&
      (presentationToken || canonicalReplay || canonicalVisibility)
  );
}

function publicShopSpotlightRowsAreCanonical(items: any[] | null | undefined): boolean {
  return Array.isArray(items) && items.some((item) => publicShopSpotlightRowIsCanonical(item));
}

function publicShopSpotlightPresentationIsCurrent(item: ShopBroadcast | null): boolean {
  if (!item?.isCanonicalOpportunity) return false;
  const deadlineMs = publicShopSpotlightPresentationDeadlineMs(item);
  if (item.isCanonicalReplay || item.isCanonicalVisibility) {
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
  if (item.isCanonicalVisibility) {
    return new Date(item.opportunityVisibilityExpiresAt || '').getTime();
  }
  return new Date(
    item.isCanonicalReplay
      ? item.opportunityReplayExpiresAt || ""
      : item.opportunityPresentationExpiresAt || ""
  ).getTime();
}

async function loadNextPublicShopSpotlightPresentations(
  cleanedGmfnId: string,
  visibilityWindow: number,
  rotationSeenCampaignIds: number[]
): Promise<PublicShopSpotlightWindowResult> {
  if (!cleanedGmfnId || !getAccessToken()) {
    return { items: [], rotationCycleComplete: false };
  }
  const response = await getPublicShopSpotlightOpportunity(
    cleanedGmfnId,
    newSpotlightPresentationRequestId(),
    visibilityWindow,
    rotationSeenCampaignIds
  );
  if (Number(response?.serving_contract_version || 0) < 2) {
    throw new Error('Spotlight serving contract is unavailable.');
  }
  return {
    items: publicShopSpotlightResponseItems(response)
      .filter((row) => publicShopSpotlightRowIsCanonical(row))
      .map((row) => normalizeBroadcast(row))
      .filter(
        (item): item is ShopBroadcast =>
          publicShopSpotlightPresentationIsCurrent(item) && broadcastIsActive(item)
      ),
    rotationCycleComplete: Boolean(
      response?.canonical_visibility?.rotation_cycle_complete
    ),
  };
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
          src?.opportunityReplayExpiresAt,
          src?.opportunity_visibility_expires_at,
          src?.opportunityVisibilityExpiresAt
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
  const requestPromise: Promise<any[] | null> = getPublicShopSpotlightOpportunity(
    cleanedGmfnId,
    requestId,
    0
  )
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
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "GSN could not load or reconnect this shop. Check the internet connection, then reopen this shop. Do not create another shop first; GSN will look for the existing shop when it reconnects.";
  }

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

function spotlightProductRailButtonStyle(
  compact: boolean,
  _background: string
): React.CSSProperties {
  const size = compact ? 44 : 46;
  return {
    width: size,
    minWidth: size,
    maxWidth: size,
    height: size,
    minHeight: size,
    maxHeight: size,
    padding: 0,
    display: "inline-grid",
    placeItems: "center",
    borderRadius: 999,
    border: 0,
    color: "#F8FBFF",
    background: "transparent",
    boxShadow: "none",
    fontSize: compact ? 16 : 18,
    fontWeight: 950,
    lineHeight: 1,
    cursor: "pointer",
    overflow: "visible",
  };
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

async function preparePublicShopSharePosterFile(
  sourceUrl: string,
  shopName: string,
  signal: AbortSignal
): Promise<File> {
  if (!sourceUrl) throw new Error("Shop picture is not ready.");

  const response = await fetch(sourceUrl, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("Shop picture could not be opened.");

  const sourceBlob = await response.blob();
  const fileBase =
    firstMeaningful(shopName, "My GSN Shop")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "My-GSN-Shop";
  const sourceFile = new File([sourceBlob], `${fileBase}-GSN-Shop.png`, {
    type: "image/png",
  });

  if (typeof createImageBitmap !== "function") return sourceFile;

  const bitmap = await createImageBitmap(sourceBlob);
  try {
    if (signal.aborted) throw new DOMException("Share cancelled.", "AbortError");

    const cropWidth = Math.min(
      bitmap.width,
      Math.round(bitmap.height * (660 / 630))
    );
    if (cropWidth >= bitmap.width) return sourceFile;

    const canvas = document.createElement("canvas");
    canvas.width = cropWidth;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) return sourceFile;

    const cropLeft = Math.max(0, Math.round((bitmap.width - cropWidth) / 2));
    context.drawImage(
      bitmap,
      cropLeft,
      0,
      cropWidth,
      bitmap.height,
      0,
      0,
      cropWidth,
      bitmap.height
    );

    const croppedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Shop picture could not be prepared."));
      }, "image/png");
    });

    return new File([croppedBlob], `${fileBase}-GSN-Shop.png`, {
      type: "image/png",
    });
  } finally {
    bitmap.close();
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

function savedProductState(
  overrides: Record<string, boolean>,
  productId: number,
  fallback = false
): boolean {
  const key = String(productId);
  return Object.prototype.hasOwnProperty.call(overrides, key)
    ? overrides[key] === true
    : fallback;
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
    publicSlotsTotal: clampGallerySlotsTotal(
      src?.shop_product_slots_total ||
        src?.public_product_slots_total ||
        src?.publicSlotsTotal
    ),
    voiceAttachmentId:
      positiveNumber(src?.voice_attachment_id || src?.voiceAttachmentId) ||
      undefined,
    voiceDurationSeconds:
      positiveNumber(src?.voice_duration_seconds || src?.voiceDurationSeconds) ||
      undefined,
    voiceDeletedAt: firstMeaningful(
      src?.voice_deleted_at,
      src?.voiceDeletedAt
    ),
    voiceSpeakerName: firstMeaningful(
      src?.voice_speaker_name,
      src?.voiceSpeakerName
    ),
    voiceSpeakerGmfnId: firstMeaningful(
      src?.voice_speaker_gmfn_id,
      src?.voiceSpeakerGmfnId
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
    sourceProductIsActive:
      typeof src?.source_product_is_active === "boolean"
        ? src.source_product_is_active
        : typeof src?.sourceProductIsActive === "boolean"
        ? src.sourceProductIsActive
        : undefined,
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
      src?.sourceShopWhatsApp,
      src?.shop_whatsapp_number,
      src?.whatsapp_number
    ),
    advertiserContactPhone: firstMeaningful(
      src?.advertiser_contact_phone,
      src?.advertiserContactPhone
    ),
    campaignSourceKind: firstMeaningful(
      src?.campaign_source_kind,
      src?.campaignSourceKind
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
    isCanonicalVisibility: Boolean(
      src?.is_canonical_visibility || src?.isCanonicalVisibility
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
    opportunityVisibilityExpiresAt: firstMeaningful(
      src?.opportunity_visibility_expires_at,
      src?.opportunityVisibilityExpiresAt
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

function spotlightOwnerInspectionOccurrenceKey(
  item: ShopBroadcast | null
): string {
  const broadcastKey = spotlightBroadcastKey(item);
  if (!broadcastKey) return '';
  return [
    broadcastKey,
    positiveNumber(item?.contentVersion),
    firstMeaningful(item?.authorizedExpiresAt, item?.expiresAt),
  ].join('|');
}

function spotlightBroadcastSortValue(item: ShopBroadcast | null): number {
  if (!item?.createdAt) return 0;
  const timestamp = new Date(item.createdAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function dedupePublicShopSpotlightRows(
  items: ShopBroadcast[]
): ShopBroadcast[] {
  const seenCanonicalCampaignIds = new Set<number>();
  const seenPresentationKeys = new Set<string>();

  return items.filter((item) => {
    const campaignId = positiveNumber(item.opportunityCampaignId);
    if (item.isCanonicalOpportunity && campaignId > 0) {
      if (seenCanonicalCampaignIds.has(campaignId)) return false;
      seenCanonicalCampaignIds.add(campaignId);
      return true;
    }

    const presentationKey = firstMeaningful(
      item.opportunityPresentationId,
      spotlightBroadcastKey(item)
    );
    if (!presentationKey || seenPresentationKeys.has(presentationKey)) {
      return false;
    }
    seenPresentationKeys.add(presentationKey);
    return true;
  });
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

function spotlightItemView(item: ShopBroadcast | null) {
  if (!item) {
    return {
      title: 'Discover what is new',
      detail: 'No live community spotlight is attached to this shop context yet.',
      priceLabel: '',
      sourceShopWhatsApp: '',
      advertiserContactPhone: '',
      imageUrl: '',
      videoUrl: '',
    };
  }

  const messageParts = splitSpotlightMessage(item.message);
  return {
    title: firstMeaningful(
      item.sourceProductTitle,
      item.spotlightTitle,
      messageParts.summary,
      'Live Spotlight'
    ),
    detail: firstMeaningful(
      item.sourceProductDescription,
      item.spotlightDescription,
      messageParts.summary,
      'Live Spotlight from another shop in this community.'
    ),
    priceLabel: firstMeaningful(
      [item.sourceProductCurrency, item.sourceProductPrice]
        .filter(Boolean)
        .join(' '),
      item.sourceProductPrice
    ),
    sourceShopWhatsApp: firstMeaningful(item.sourceShopWhatsApp),
    advertiserContactPhone: firstMeaningful(item.advertiserContactPhone),
    imageUrl: firstMeaningful(item.sourceProductImageUrl, item.imageUrl),
    videoUrl: firstMeaningful(item.sourceProductVideoUrl, item.videoUrl),
  };
}

function spotlightItemMediaKey(item: ShopBroadcast | null): string {
  if (!item) return '';
  const view = spotlightItemView(item);
  return [spotlightBroadcastKey(item), view.imageUrl, view.videoUrl].join('|');
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
  const imageAvailable =
    src?.image_url_available === false ? false : Boolean(imageUrl);
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
    imageAvailable,
    isActive: src?.is_active !== false,
    videoUrl,
    visibilityMode:
      firstMeaningful(src?.visibility_mode, "community_visible") ||
      "community_visible",
    createdAt: firstMeaningful(src?.created_at),
    originShopName: firstMeaningful(src?.origin_shop_name, src?.source_shop_name),
    isSaved: src?.is_saved === true || src?.isSaved === true,
    originClanId: positiveNumber(
      src?.origin_clan_id || src?.source_clan_id || src?.clan_id
    ),
    repostsUsed: positiveNumber(src?.reposts_used),
    distributionSlotsRemaining: positiveNumber(
      src?.distribution_slots_remaining || src?.remaining_distribution_slots
    ),
    voiceAttachmentId:
      positiveNumber(src?.voice_attachment_id || src?.voiceAttachmentId) ||
      undefined,
    voiceDurationSeconds:
      positiveNumber(src?.voice_duration_seconds || src?.voiceDurationSeconds) ||
      undefined,
    voiceDeletedAt: firstMeaningful(
      src?.voice_deleted_at,
      src?.voiceDeletedAt
    ),
    voiceSpeakerName: firstMeaningful(
      src?.voice_speaker_name,
      src?.voiceSpeakerName
    ),
    voiceSpeakerGmfnId: firstMeaningful(
      src?.voice_speaker_gmfn_id,
      src?.voiceSpeakerGmfnId
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

function publicProductCollectionsMatch(
  current: ShopProduct[],
  incoming: ShopProduct[]
): boolean {
  if (current.length !== incoming.length) return false;
  return current.every(
    (product, index) => JSON.stringify(product) === JSON.stringify(incoming[index])
  );
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
  const openedFromPublicDiscovery =
    new URLSearchParams(location.search).get("source") === "public-discovery";
  const navigate = useNavigate();
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
  const routeShopPurchaseRequested = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return query.get("purchase") === "1";
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
  const expiredSessionRecoveryStartedRef = useRef(false);
  const shopPurchaseReturnHandledRef = useRef("");
  const recoverExpiredPublicShopSession = useCallback(() => {
    if (expiredSessionRecoveryStartedRef.current) return;
    expiredSessionRecoveryStartedRef.current = true;
    logout();
    navigate("/login?session=expired&force=1", {
      replace: true,
      state: {
        from: {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
        },
      },
    });
  }, [location.hash, location.pathname, location.search, navigate]);
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
  const spotlightLegacyOccurrenceIdsRef = useRef(
    new WeakMap<ShopBroadcast, string>()
  );
  const spotlightLegacyOccurrenceSequenceRef = useRef(0);
  const spotlightPresentationGateRef = useRef<HTMLDetailsElement | null>(null);
  const spotlightPresentationAutoOpenedRef = useRef(false);
  const spotlightPresentationVisibleRef = useRef(false);
  const spotlightRailRef = useRef<HTMLElement | null>(null);
  const spotlightVisibleRatioRef = useRef(0);
  const spotlightQualificationTimerRef = useRef<number | null>(null);
  const spotlightQualifiedKeysRef = useRef<Set<string>>(new Set());
  const spotlightQualificationInFlightKeysRef = useRef<Set<string>>(new Set());
  const spotlightSuppliedKeysRef = useRef<Set<string>>(new Set());
  const productMediaQualifiedKeysRef = useRef<Set<string>>(new Set());
  const productMediaQualificationInFlightKeysRef = useRef<Set<string>>(new Set());
  const spotlightNextRequestPendingRef = useRef(false);
  const spotlightNextEmptyUntilRef = useRef(0);
  const spotlightRefreshRetryTimerRef = useRef<number | null>(null);
  const spotlightRefreshRetryCountRef = useRef(0);
  const spotlightInteractionPausedUntilRef = useRef(0);
  const spotlightRefreshGenerationRef = useRef(0);
  const spotlightVisibilityWindowRef = useRef(1);
  const spotlightSeenCampaignIdsRef = useRef<Set<number>>(new Set());
  const spotlightConsumedOwnerInspectionKeysRef = useRef<Set<string>>(
    new Set()
  );
  const [spotlightPresentationActivated, setSpotlightPresentationActivated] =
    useState(false);
  const [spotlightHasKeyboardFocus, setSpotlightHasKeyboardFocus] = useState(false);
  const [spotlightInteractionPausedUntil, setSpotlightInteractionPausedUntil] = useState(0);
  const [spotlightReducedMotion, setSpotlightReducedMotion] = useState(false);
  const [spotlightFeedError, setSpotlightFeedError] = useState('');
  const [spotlightRefreshRetryTick, setSpotlightRefreshRetryTick] = useState(0);
  const [spotlightMediaStatusByKey, setSpotlightMediaStatusByKey] = useState<
    Record<string, SpotlightMediaStatus>
  >({});
  const spotlightMediaStatusByKeyRef = useRef<
    Record<string, SpotlightMediaStatus>
  >({});
  const [spotlightActiveMediaStatusByOccurrence, setSpotlightActiveMediaStatusByOccurrence] =
    useState<Record<string, SpotlightMediaStatus>>({});
  const spotlightActiveMediaStatusByOccurrenceRef = useRef<
    Record<string, SpotlightMediaStatus>
  >({});
  const [spotlightTransition, setSpotlightTransition] =
    useState<SpotlightTransitionState | null>(null);
  const spotlightTransitionRef = useRef<SpotlightTransitionState | null>(null);
  const [spotlightPlaybackStatusByKey, setSpotlightPlaybackStatusByKey] =
    useState<Record<string, SpotlightPlaybackStateDetails>>({});
  const spotlightPlaybackStatusByKeyRef = useRef<
    Record<string, SpotlightPlaybackStateDetails>
  >({});
  const [spotlightSoundEnabled, setSpotlightSoundEnabled] = useState(false);
  const galleryRevealFrameRef = useRef<number | null>(null);
  const galleryRevealTimeoutRefs = useRef<number[]>([]);
  const galleryRevealTargetRef = useRef("");
  const completedGalleryRevealKeyRef = useRef("");
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [savedProductIds, setSavedProductIds] = useState<Record<string, boolean>>({});
  const [savingProductId, setSavingProductId] = useState<number | null>(null);
  const [likedProductIds, setLikedProductIds] = useState<Record<string, boolean>>({});
  const [likingProductId, setLikingProductId] = useState<number | null>(null);
  const [savedSpotlightCampaignIds, setSavedSpotlightCampaignIds] = useState<
    Record<string, boolean>
  >({});
  const [likedSpotlightCampaignIds, setLikedSpotlightCampaignIds] = useState<
    Record<string, boolean>
  >({});
  const [savingSpotlightCampaignId, setSavingSpotlightCampaignId] = useState<
    number | null
  >(null);
  const [likingSpotlightCampaignId, setLikingSpotlightCampaignId] = useState<
    number | null
  >(null);
  const [spotlightImmersiveOpen, setSpotlightImmersiveOpen] = useState(false);
  const [shopDiaryEntries, setShopDiaryEntries] = useState<ShopDiaryEntryRecord[]>([]);
  const [openProductId, setOpenProductId] = useState<number | null>(null);
  const [brokenProductMediaUrls, setBrokenProductMediaUrls] = useState<
    Record<string, boolean>
  >({});
  const [brokenShopHeroMediaUrls, setBrokenShopHeroMediaUrls] = useState<
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
    shopId: 0,
    isFollowing: false,
    canFollow: false,
    isOwner: false,
    followerCount: 0,
    loading: false,
    busy: false,
  });
  const [spotlightShopFollowState, setSpotlightShopFollowState] =
    useState<ShopFollowState>({
      shopId: 0,
      isFollowing: false,
      canFollow: false,
      isOwner: false,
      followerCount: 0,
      loading: false,
      busy: false,
    });
  const [spotlightPurchaseOpen, setSpotlightPurchaseOpen] = useState(false);
  const [spotlightPurchaseQuantity, setSpotlightPurchaseQuantity] = useState(1);
  const [spotlightPurchaseFulfilment, setSpotlightPurchaseFulfilment] =
    useState<SpotlightFulfilmentMethod>("collection");
  const [spotlightPurchaseBusy, setSpotlightPurchaseBusy] = useState(false);
  const [shopPurchaseDraft, setShopPurchaseDraft] =
    useState<ShopPurchaseDraft | null>(null);
  const [shopPurchaseBusy, setShopPurchaseBusy] = useState(false);
  const [spotlightProductActionsOpen, setSpotlightProductActionsOpen] =
    useState(true);
  const [error, setError] = useState<string>("");
  const [autoRefreshingShop, setAutoRefreshingShop] = useState(false);
  const [shopReconnectRetryKey, setShopReconnectRetryKey] = useState(0);
  const [ownerContactPanelOpen, setOwnerContactPanelOpen] = useState(false);
  const [shopVerificationOpen, setShopVerificationOpen] = useState(false);
  const [shopVerificationQrOpen, setShopVerificationQrOpen] = useState(false);
  const [shopOptionsOpen, setShopOptionsOpen] = useState(false);
  const [shopMoreOpen, setShopMoreOpen] = useState(true);
  const [spotlightInformationOpen, setSpotlightInformationOpen] =
    useState<boolean>(() => {
      if (typeof window === "undefined") return true;
      return window.innerWidth > 980;
    });
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
      const ownerInspectionOccurrenceKey =
        spotlightOwnerInspectionOccurrenceKey(ownerInspectionBroadcast);
      const ownerInspectionCanEnterRotation = Boolean(
        ownerSpotlightPreviewAuthorized ||
          (ownerInspectionOccurrenceKey &&
            !spotlightConsumedOwnerInspectionKeysRef.current.has(
              ownerInspectionOccurrenceKey
            ))
      );
      const spotlightRequestFailed = viewerSpotlightRows === undefined;
      const viewerBroadcasts = spotlightRequestFailed
        ? []
        : Array.isArray(viewerSpotlightRows)
        ? viewerSpotlightRows
        : publicBroadcasts;
      const spotlightBroadcasts = ownerSpotlightInspectionMode
        ? [
            ownerInspectionCanEnterRotation ? ownerInspectionBroadcast : null,
            ...viewerBroadcasts,
          ].filter(Boolean)
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
      const normalizedBroadcasts = dedupePublicShopSpotlightRows(
        normalizedBroadcastCandidates
      )
        .sort((a, b) => {
          const weightDelta =
            Number(b?.rotationWeight || 1) - Number(a?.rotationWeight || 1);
          if (weightDelta !== 0) return weightDelta;
          const timeDelta =
            spotlightBroadcastSortValue(b) - spotlightBroadcastSortValue(a);
          if (timeDelta !== 0) return timeDelta;
          return spotlightBroadcastKey(a).localeCompare(spotlightBroadcastKey(b));
        });
      const ownerInspectionSpotlight =
        ownerSpotlightInspectionMode &&
        ownerInspectionCanEnterRotation &&
        relevantBroadcast
        ? normalizedBroadcasts.find(
            (item) => spotlightBroadcastKey(item) === spotlightBroadcastKey(relevantBroadcast)
          ) || relevantBroadcast
        : null;
      const ownerInspectionKey = spotlightBroadcastKey(ownerInspectionSpotlight);
      // Canonical Public Shop rows get one queue occurrence each. Rotation
      // metadata remains available for reporting and future governed policy,
      // but must not let an early paid row starve unseen campaigns on-device.
      const viewerRotationBroadcasts = normalizedBroadcasts.filter(
        (item) => spotlightBroadcastKey(item) !== ownerInspectionKey
      );
      const freshPresentationIndex = freshPresentationKey
        ? viewerRotationBroadcasts.findIndex(
            (item) => item.opportunityPresentationId === freshPresentationKey
          )
        : -1;
      const orderedViewerRotationBroadcasts = freshPresentationIndex > 0
        ? [
            viewerRotationBroadcasts[freshPresentationIndex],
            ...viewerRotationBroadcasts.slice(0, freshPresentationIndex),
            ...viewerRotationBroadcasts.slice(freshPresentationIndex + 1),
          ]
        : viewerRotationBroadcasts;
      const rotationBroadcasts = ownerSpotlightPreviewAuthorized
        ? ownerInspectionSpotlight
          ? [ownerInspectionSpotlight]
          : []
        : ownerInspectionSpotlight
        ? [ownerInspectionSpotlight, ...orderedViewerRotationBroadcasts]
        : orderedViewerRotationBroadcasts;
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
      setProducts((currentProducts) =>
        publicProductCollectionsMatch(currentProducts, arrangedProducts)
          ? currentProducts
          : arrangedProducts
      );
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
      if (
        spotlightPresentationActivated &&
        spotlightPresentationAutoOpenedRef.current &&
        rotationBroadcasts.length <= 0
      ) {
        spotlightPresentationAutoOpenedRef.current = false;
        setShopMoreOpen(false);
      } else if (rotationBroadcasts.length > 0) {
        spotlightPresentationAutoOpenedRef.current = false;
      }
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
      if (!spotlightPresentationVisibleRef.current) {
        const cycleKey = publicShopSpotlightSelectionCycleKey(cleanedGmfnId);
        const currentCycle = cycleKey
          ? publicShopSpotlightSelectionCycles.get(cycleKey)
          : undefined;
        return publicShopSpotlightCycleIsAuthoritative(currentCycle, Date.now())
          ? currentCycle?.items || []
          : [];
      }

      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        const cycleKey = publicShopSpotlightSelectionCycleKey(cleanedGmfnId);
        const currentCycle = cycleKey
          ? publicShopSpotlightSelectionCycles.get(cycleKey)
          : undefined;
        return publicShopSpotlightCycleIsAuthoritative(currentCycle, Date.now())
          ? currentCycle?.items || []
          : [];
      }

      if (
        spotlightPresentationActivated &&
        communitySpotlightsRef.current.some((item) =>
          publicShopSpotlightPresentationIsCurrent(item)
        )
      ) {
        return communitySpotlightsRef.current;
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
          if (status === 401) {
            recoverExpiredPublicShopSession();
            return undefined;
          }
          setSpotlightFeedError(
            'Community Spotlight could not refresh. The last valid showing is kept while GSN retries automatically.'
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
        let clanRes: any = null;
        if (getAccessToken()) {
          try {
            clanRes = await getCurrentClan();
          } catch (err: any) {
            if (Number(err?.status || 0) === 401) {
              recoverExpiredPublicShopSession();
              return;
            }
          }
        }
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

    void refreshPublicShopState(!spotlightPresentationActivated);

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
    recoverExpiredPublicShopSession,
    routeClanId,
    routeDiaryEntryId,
    routeProductId,
    shopReconnectRetryKey,
    spotlightPresentationActivated,
  ]);

  useEffect(() => {
    const setVisible = (visible: boolean) => {
      spotlightPresentationVisibleRef.current = visible;
      if (visible) setSpotlightPresentationActivated(true);
    };

    if (
      loading ||
      !getAccessToken() ||
      ownerSpotlightPreviewAuthorized ||
      routeDiaryEntryId > 0
    ) {
      setVisible(false);
      return;
    }

    const gate = spotlightPresentationGateRef.current;
    const rail = spotlightRailRef.current;
    if (!gate || !rail || typeof window === 'undefined') {
      setVisible(false);
      return;
    }

    const elementIsVisible = (element: HTMLElement) => {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState !== 'visible'
      ) {
        return false;
      }
      const rect = element.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight &&
        rect.right > 0 &&
        rect.left < window.innerWidth
      );
    };

    const updateVisibility = () => {
      const gateVisible = elementIsVisible(gate);
      if (gateVisible && isCompact && !gate.open) {
        setVisible(false);
        spotlightPresentationAutoOpenedRef.current = true;
        setShopMoreOpen(true);
        return;
      }
      setVisible(gateVisible && gate.open && elementIsVisible(rail));
    };

    const observer =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(updateVisibility, {
            threshold: [0, 0.01],
          })
        : null;
    observer?.observe(gate);
    observer?.observe(rail);
    window.addEventListener('scroll', updateVisibility, { passive: true });
    window.addEventListener('resize', updateVisibility);
    document.addEventListener('visibilitychange', updateVisibility);
    updateVisibility();

    return () => {
      setVisible(false);
      observer?.disconnect();
      window.removeEventListener('scroll', updateVisibility);
      window.removeEventListener('resize', updateVisibility);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, [
    isCompact,
    loading,
    ownerSpotlightPreviewAuthorized,
    routeDiaryEntryId,
    shopMoreOpen,
  ]);

  useEffect(() => {
    setMiniSpotlightIndex(0);
    miniSpotlightIndexRef.current = 0;
    setCommunitySpotlights([]);
    communitySpotlightsRef.current = [];
    setSpotlightMediaStatusByKey({});
    spotlightMediaStatusByKeyRef.current = {};
    setSpotlightActiveMediaStatusByOccurrence({});
    spotlightActiveMediaStatusByOccurrenceRef.current = {};
    spotlightTransitionRef.current = null;
    setSpotlightTransition(null);
    setSpotlightPlaybackStatusByKey({});
    spotlightPlaybackStatusByKeyRef.current = {};
    spotlightPresentationAutoOpenedRef.current = false;
    spotlightPresentationVisibleRef.current = false;
    setSpotlightPresentationActivated(false);
    spotlightQualifiedKeysRef.current.clear();
    spotlightQualificationInFlightKeysRef.current.clear();
    spotlightSuppliedKeysRef.current.clear();
    spotlightNextRequestPendingRef.current = false;
    spotlightNextEmptyUntilRef.current = 0;
    spotlightRefreshRetryCountRef.current = 0;
    spotlightVisibilityWindowRef.current = 1;
    spotlightSeenCampaignIdsRef.current.clear();
    spotlightConsumedOwnerInspectionKeysRef.current.clear();
    completedGalleryRevealKeyRef.current = "";
    if (spotlightRefreshRetryTimerRef.current !== null) {
      window.clearTimeout(spotlightRefreshRetryTimerRef.current);
      spotlightRefreshRetryTimerRef.current = null;
    }
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

    const revealKey = [
      gmfnId,
      location.hash,
      routeProductId,
      routeBlockNumber,
    ].join(":");
    if (completedGalleryRevealKeyRef.current === revealKey) return;

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
      completedGalleryRevealKeyRef.current = revealKey;
      if (products.indexOf(matchedProduct) >= gallerySlotsTotal) {
        setShowAllProducts(true);
      }
      setOpenProductId(matchedProduct.id ?? matchedProduct.slotNumber);
      revealGalleryTarget(publicShopBlockAnchorId(matchedProduct));
    } else if (id) {
      completedGalleryRevealKeyRef.current = revealKey;
      revealGalleryTarget(id);
    }
  }, [
    cancelPendingGalleryReveal,
    gmfnId,
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
      voiceAttachmentId: positiveNumber(shop?.voiceAttachmentId) || undefined,
      voiceDurationSeconds:
        positiveNumber(shop?.voiceDurationSeconds) || undefined,
      voiceDeletedAt: firstMeaningful(shop?.voiceDeletedAt),
      voiceSpeakerName: firstMeaningful(shop?.voiceSpeakerName),
      voiceSpeakerGmfnId: firstMeaningful(shop?.voiceSpeakerGmfnId),
    };
  }, [shop, broadcast, gmfnId, currentClan]);

  useEffect(() => {
    const shopId = positiveNumber(effectiveShop?.id);
    const fallbackCount = positiveNumber(effectiveShop?.followerCount);
    const token = getAccessToken();

    if (!shopId) {
      setShopFollowState({
        shopId: 0,
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
        shopId,
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
      shopId,
      isFollowing: false,
      canFollow: false,
      isOwner: false,
      followerCount: fallbackCount,
      loading: true,
    }));

    getMarketplaceShopFollowStatus(shopId)
      .then((res) => {
        if (!alive) return;
        const count = positiveNumber(res?.follower_count || res?.followers_count);
        setShopFollowState((current) => ({
          ...current,
          shopId,
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
          shopId,
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
      !spotlightPresentationVisibleRef.current ||
      spotlightNextRequestPendingRef.current ||
      Date.now() < spotlightNextEmptyUntilRef.current
    ) {
      return;
    }

    spotlightNextRequestPendingRef.current = true;
    try {
      const queuedCampaignIds = communitySpotlightsRef.current
        .map((item) => positiveNumber(item.opportunityCampaignId))
        .filter((campaignId) => campaignId > 0);
      const seenCampaignIds = Array.from(
        new Set([
          ...spotlightSeenCampaignIdsRef.current,
          ...queuedCampaignIds,
        ])
      );
      let requestedVisibilityWindow = spotlightVisibilityWindowRef.current;
      let nextWindow = await loadNextPublicShopSpotlightPresentations(
        cleanedGmfnId,
        requestedVisibilityWindow,
        seenCampaignIds
      );
      spotlightVisibilityWindowRef.current = requestedVisibilityWindow + 1;

      if (
        nextWindow.rotationCycleComplete &&
        nextWindow.items.length <= 0
      ) {
        spotlightSeenCampaignIdsRef.current.clear();
        requestedVisibilityWindow = spotlightVisibilityWindowRef.current;
        nextWindow = await loadNextPublicShopSpotlightPresentations(
          cleanedGmfnId,
          requestedVisibilityWindow,
          queuedCampaignIds
        );
        spotlightVisibilityWindowRef.current = requestedVisibilityWindow + 1;
      }

      const nextItems = nextWindow.items;
      spotlightRefreshRetryCountRef.current = 0;
      if (spotlightRefreshRetryTimerRef.current !== null) {
        window.clearTimeout(spotlightRefreshRetryTimerRef.current);
        spotlightRefreshRetryTimerRef.current = null;
      }
      setSpotlightFeedError('');
      if (nextItems.length <= 0) {
        spotlightNextEmptyUntilRef.current = Date.now() + SPOTLIGHT_PILOT_REFRESH_MS;
        return;
      }
      const retainedAtResponse = dedupePublicShopSpotlightRows(
        communitySpotlightsRef.current.filter(
          (item) =>
            !item.isCanonicalOpportunity ||
            publicShopSpotlightPresentationIsCurrent(item)
        )
      );
      const retainedCampaignIds = new Set(
        retainedAtResponse
          .map((item) => positiveNumber(item.opportunityCampaignId))
          .filter(Boolean)
      );
      const retainedPresentationIds = new Set(
        retainedAtResponse
          .map((item) =>
            firstMeaningful(
              item.opportunityPresentationId,
              spotlightBroadcastKey(item)
            )
          )
          .filter(Boolean)
      );
      const appendableNextItems = dedupePublicShopSpotlightRows(nextItems).filter(
        (item) => {
          const campaignId = positiveNumber(item.opportunityCampaignId);
          const presentationId = firstMeaningful(
            item.opportunityPresentationId,
            spotlightBroadcastKey(item)
          );
          return !(
            (campaignId > 0 &&
              spotlightSeenCampaignIdsRef.current.has(campaignId)) ||
            (campaignId > 0 && retainedCampaignIds.has(campaignId)) ||
            (presentationId && retainedPresentationIds.has(presentationId))
          );
        }
      );
      if (appendableNextItems.length <= 0) {
        spotlightNextEmptyUntilRef.current = Date.now() + SPOTLIGHT_PILOT_REFRESH_MS;
        return;
      }
      spotlightNextEmptyUntilRef.current = 0;
      setCommunitySpotlights((current) => {
        const retained = dedupePublicShopSpotlightRows(
          current.filter(
            (item) =>
              !item.isCanonicalOpportunity ||
              publicShopSpotlightPresentationIsCurrent(item)
          )
        );
        const seenCampaignIds = new Set(
          retained
            .map((item) => positiveNumber(item.opportunityCampaignId))
            .filter(Boolean)
        );
        const seenPresentationIds = new Set(
          retained
            .map((item) =>
              firstMeaningful(
                item.opportunityPresentationId,
                spotlightBroadcastKey(item)
              )
            )
            .filter(Boolean)
        );
        const unseenNextItems = appendableNextItems.filter(
          (item) => {
            const campaignId = positiveNumber(item.opportunityCampaignId);
            const presentationId = firstMeaningful(
              item.opportunityPresentationId,
              spotlightBroadcastKey(item)
            );
            if (
              (campaignId > 0 && seenCampaignIds.has(campaignId)) ||
              (presentationId && seenPresentationIds.has(presentationId))
            ) {
              return false;
            }
            if (campaignId > 0) seenCampaignIds.add(campaignId);
            if (presentationId) seenPresentationIds.add(presentationId);
            return true;
          }
        );
        // Never let a newly fetched server window jump ahead of campaigns that
        // are already waiting on this handset. Append unseen rows in their
        // governed order so refill cannot starve an older queued campaign.
        const nextQueue = [
          ...retained,
          ...unseenNextItems,
        ];
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
    } catch (err: any) {
      const status = Number(err?.status || 0);
      if (status === 401) {
        recoverExpiredPublicShopSession();
        return;
      }
      setSpotlightFeedError(
        'Community Spotlight could not refresh. The last valid showing is kept while GSN retries automatically.'
      );
      spotlightRefreshRetryCountRef.current += 1;
      const retryNumber = spotlightRefreshRetryCountRef.current;
      if (
        typeof window !== 'undefined' &&
        retryNumber <= SPOTLIGHT_REFRESH_RETRY_LIMIT
      ) {
        if (spotlightRefreshRetryTimerRef.current !== null) {
          window.clearTimeout(spotlightRefreshRetryTimerRef.current);
        }
        spotlightNextEmptyUntilRef.current =
          Date.now() + SPOTLIGHT_REFRESH_RETRY_DELAY_MS * retryNumber;
        spotlightRefreshRetryTimerRef.current = window.setTimeout(() => {
          spotlightRefreshRetryTimerRef.current = null;
          spotlightNextEmptyUntilRef.current = 0;
          setSpotlightRefreshRetryTick((current) => current + 1);
        }, SPOTLIGHT_REFRESH_RETRY_DELAY_MS * retryNumber);
      }
    } finally {
      spotlightNextRequestPendingRef.current = false;
    }
  }, [
    gmfnId,
    ownerSpotlightPreviewAuthorized,
    recoverExpiredPublicShopSession,
  ]);

  useEffect(() => {
    if (spotlightRefreshRetryTick <= 0) return;
    void requestNextCanonicalSpotlight();
  }, [requestNextCanonicalSpotlight, spotlightRefreshRetryTick]);

  useEffect(
    () => () => {
      if (spotlightRefreshRetryTimerRef.current !== null) {
        window.clearTimeout(spotlightRefreshRetryTimerRef.current);
        spotlightRefreshRetryTimerRef.current = null;
      }
    },
    []
  );

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
      const activeItem =
        communitySpotlightsRef.current[miniSpotlightIndexRef.current] || null;
      if (
        activeItem?.isCanonicalOpportunity &&
        !publicShopSpotlightPresentationIsCurrent(activeItem)
      ) {
        const transition: SpotlightTransitionState = {
          phase: 'neutral',
          sourceOccurrenceId: firstMeaningful(
            activeItem.opportunityPresentationId,
            spotlightBroadcastKey(activeItem)
          ),
          startedAtMs: Date.now(),
          targetItem: null,
          targetMediaKey: '',
        };
        spotlightTransitionRef.current = transition;
        setSpotlightTransition(transition);
      }
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
      source: openedFromPublicDiscovery ? "public_discovery_shop" : "public_shop_gallery",
    });
  }, [
    effectiveShop?.id,
    error,
    loading,
    openedFromPublicDiscovery,
    trackMarketplaceAttention,
  ]);

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
        source: openedFromPublicDiscovery
          ? "public_discovery_offer"
          : "public_shop_product_visible",
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
  }, [
    error,
    loading,
    openProductId,
    openedFromPublicDiscovery,
    products,
    trackMarketplaceAttention,
  ]);

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
    if (showAllProducts) return products;
    return products.slice(0, GALLERY_INITIAL_VISIBLE_PRODUCT_COUNT);
  }, [focusedBlockLinkActive, focusedBlockProduct, products, showAllProducts]);

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
  const latestPublicShopUpdateVoiceEntry = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return (
      shopDiaryEntries.find((entry) => {
        const timestamp = Date.parse(String(entry.occurred_at || entry.created_at));
        return (
          Number.isFinite(timestamp) &&
          timestamp >= cutoff &&
          entry.is_public !== false &&
          entry.is_active !== false &&
          positiveNumber(entry.voice_attachment_id) > 0 &&
          !entry.voice_deleted_at
        );
      }) || null
    );
  }, [shopDiaryEntries]);

  const heroImage = useMemo(() => {
    return effectiveShop?.imageUrl || "";
  }, [effectiveShop]);
  const shopHeroSource = useMemo(
    () =>
      selectShopHeroSource({
        shopName: effectiveShop?.shopName,
        shopImageUrl: effectiveShop?.imageUrl,
        products,
        brokenImageUrls: brokenShopHeroMediaUrls,
      }),
    [
      brokenShopHeroMediaUrls,
      effectiveShop?.imageUrl,
      effectiveShop?.shopName,
      products,
    ]
  );

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
        advertiserContactPhone: "",
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
      advertiserContactPhone: firstMeaningful(
        miniSpotlight?.advertiserContactPhone
      ),
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

  const spotlightSourceShopId = positiveNumber(miniSpotlight?.shopId);
  const spotlightSourceProductId = positiveNumber(
    miniSpotlight?.sourceProductId
  );
  const spotlightSourceClanId = positiveNumber(miniSpotlight?.sourceClanId);
  const spotlightCampaignId = positiveNumber(
    miniSpotlight?.opportunityCampaignId
  );
  const spotlightProductLinked = Boolean(
    miniSpotlight &&
      spotlightSourceShopId &&
      spotlightSourceProductId
  );
  const spotlightProductPreferenceAvailable = Boolean(spotlightSourceProductId);
  const spotlightAdvertPreferenceAvailable = Boolean(spotlightCampaignId);
  const spotlightEngagementAvailable = Boolean(
    (spotlightProductPreferenceAvailable || spotlightAdvertPreferenceAvailable) &&
      spotlightTransition?.phase !== 'neutral'
  );
  const spotlightPreferenceKind = spotlightProductPreferenceAvailable
    ? "product"
    : "advert";
  const spotlightProductSaved = Boolean(
    spotlightProductPreferenceAvailable
      ? savedProductState(savedProductIds, spotlightSourceProductId)
      : spotlightCampaignId &&
          savedProductState(savedSpotlightCampaignIds, spotlightCampaignId)
  );
  const spotlightProductLiked = Boolean(
    spotlightProductPreferenceAvailable
      ? savedProductState(likedProductIds, spotlightSourceProductId)
      : spotlightCampaignId &&
          savedProductState(likedSpotlightCampaignIds, spotlightCampaignId)
  );

  useEffect(() => {
    if (!getAccessToken() || !spotlightSourceProductId) return;
    let alive = true;

    void Promise.all([
      listSavedMarketplaceProducts(),
      listLikedMarketplaceProducts(),
    ])
      .then(([savedResponse, likedResponse]) => {
        if (!alive) return;
        const savedIds: Record<string, boolean> = {};
        const likedIds: Record<string, boolean> = {};
        for (const product of Array.isArray(savedResponse?.products) ? savedResponse.products : []) {
          const productId = positiveNumber(product?.id);
          if (productId) savedIds[String(productId)] = true;
        }
        for (const product of Array.isArray(likedResponse?.products) ? likedResponse.products : []) {
          const productId = positiveNumber(product?.id);
          if (productId) likedIds[String(productId)] = true;
        }
        setSavedProductIds(savedIds);
        setLikedProductIds(likedIds);
      })
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, [spotlightSourceProductId]);

  useEffect(() => {
    if (!getAccessToken() || !spotlightCampaignId) return;
    let alive = true;

    void getSpotlightAdvertPreferences()
      .then((response) => {
        if (!alive) return;
        const savedIds: Record<string, boolean> = {};
        const likedIds: Record<string, boolean> = {};
        for (const campaignId of Array.isArray(response?.saved_campaign_ids)
          ? response.saved_campaign_ids
          : []) {
          const normalizedId = positiveNumber(campaignId);
          if (normalizedId) savedIds[String(normalizedId)] = true;
        }
        for (const campaignId of Array.isArray(response?.liked_campaign_ids)
          ? response.liked_campaign_ids
          : []) {
          const normalizedId = positiveNumber(campaignId);
          if (normalizedId) likedIds[String(normalizedId)] = true;
        }
        setSavedSpotlightCampaignIds(savedIds);
        setLikedSpotlightCampaignIds(likedIds);
      })
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, [spotlightCampaignId]);

  useEffect(() => {
    if (!spotlightImmersiveOpen || typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSpotlightImmersiveOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [spotlightImmersiveOpen]);
  useEffect(() => {
    setSpotlightProductActionsOpen(true);
  }, [spotlightSourceProductId, spotlightSourceShopId]);

  useEffect(() => {
    const token = getAccessToken();
    const shopId = spotlightSourceShopId;
    if (!shopId || !token) {
      setSpotlightShopFollowState({
        shopId,
        isFollowing: false,
        canFollow: false,
        isOwner: false,
        ownershipResolved: true,
        followerCount: 0,
        loading: false,
        busy: false,
      });
      return;
    }

    let alive = true;
    setSpotlightShopFollowState({
      shopId,
      isFollowing: false,
      canFollow: false,
      isOwner: false,
      ownershipResolved: false,
      followerCount: 0,
      loading: true,
      busy: false,
    });

    getMarketplaceShopFollowStatus(shopId)
      .then((res) => {
        if (!alive) return;
        setSpotlightShopFollowState({
          shopId,
          isFollowing: Boolean(res?.is_following),
          canFollow: Boolean(res?.can_follow),
          isOwner: Boolean(res?.is_owner),
          ownershipResolved: true,
          followerCount: positiveNumber(
            res?.follower_count || res?.followers_count
          ),
          loading: false,
          busy: false,
        });
      })
      .catch(() => {
        if (!alive) return;
        setSpotlightShopFollowState({
          shopId,
          isFollowing: false,
          canFollow: false,
          isOwner: false,
          ownershipResolved: false,
          followerCount: 0,
          loading: false,
          busy: false,
        });
      });

    return () => {
      alive = false;
    };
  }, [spotlightSourceShopId]);

  const spotlightOwnershipCheckRequired = Boolean(
    getAccessToken() && spotlightSourceShopId
  );
  const spotlightIsGsnHouse =
    safeStr(miniSpotlight?.campaignSourceKind).toLowerCase() === "gsn_house";
  const spotlightAdvertiserCallUrl = buildPhoneCallUrl(
    miniSpotlightView.advertiserContactPhone
  );
  const spotlightOwnershipStateMatchesSource =
    spotlightShopFollowState.shopId === spotlightSourceShopId;
  const spotlightOwnershipResolved =
    !spotlightOwnershipCheckRequired ||
    (spotlightOwnershipStateMatchesSource &&
      spotlightShopFollowState.ownershipResolved === true);
  const signedInOwnsSpotlightSourceShop = Boolean(
    spotlightOwnershipStateMatchesSource &&
      spotlightOwnershipResolved &&
      spotlightShopFollowState.isOwner
  );
  const signedInOwnsSpotlightAdvert = Boolean(
    getAccessToken() &&
      signedInGmfnId &&
      miniSpotlight?.authorGmfnId &&
      ownerSurfaceIdentityMatches(
        signedInGmfnId,
        miniSpotlight.authorGmfnId
      )
  );
  const spotlightSelfActionsBlocked = Boolean(
    signedInOwnsSpotlightAdvert ||
      (spotlightOwnershipCheckRequired &&
        (!spotlightOwnershipResolved || signedInOwnsSpotlightSourceShop))
  );
  const spotlightCommercialAction = useMemo(() => {
    if (spotlightProductLinked) {
      if (miniSpotlight?.sourceProductIsActive === false) {
        return { kind: "visit_shop" as const, label: "View shop" };
      }
      const hasPrice = Boolean(safeStr(miniSpotlight?.sourceProductPrice));
      return {
        kind: "intent" as const,
        intentType: (hasPrice ? "buy_now" : "request_quote") as SpotlightCommercialIntentType,
        label: hasPrice ? "Request to buy" : "Request quote",
      };
    }
    if (spotlightIsGsnHouse) {
      if (spotlightAdvertiserCallUrl) {
        return { kind: "contact_advertiser" as const, label: "Contact advertiser" };
      }
      return {
        kind: "unavailable" as const,
        label: "Advert details only",
      };
    }
    if (spotlightSourceShopId || miniSpotlight?.sourceShopName) {
      return { kind: "visit_shop" as const, label: "View shop" };
    }
    return { kind: "unavailable" as const, label: "Advert details only" };
  }, [
    miniSpotlight,
    spotlightAdvertiserCallUrl,
    spotlightIsGsnHouse,
    spotlightProductLinked,
    spotlightSourceShopId,
  ]);
  const spotlightPurchaseUnitAmount = useMemo(() => {
    const normalized = safeStr(miniSpotlight?.sourceProductPrice)
      .replace(/,/g, "")
      .match(/-?\d+(?:\.\d+)?/);
    if (!normalized) return null;
    const amount = Number(normalized[0]);
    return Number.isFinite(amount) && amount >= 0 ? amount : null;
  }, [miniSpotlight?.sourceProductPrice]);
  const spotlightPurchaseSubtotal =
    spotlightPurchaseUnitAmount === null
      ? ""
      : `${firstMeaningful(miniSpotlight?.sourceProductCurrency)} ${(
          spotlightPurchaseUnitAmount * spotlightPurchaseQuantity
        ).toFixed(2)}`.trim();

  useEffect(() => {
    setSpotlightPurchaseOpen(false);
    setSpotlightPurchaseQuantity(1);
    setSpotlightPurchaseFulfilment("collection");
    setSpotlightPurchaseBusy(false);
  }, [spotlightSourceProductId, spotlightSourceShopId]);

  const nextMiniSpotlight = useMemo(() => {
    if (communitySpotlights.length <= 1) return null;
    const activeIndex = Math.min(
      Math.max(miniSpotlightIndex, 0),
      communitySpotlights.length - 1
    );
    return communitySpotlights[(activeIndex + 1) % communitySpotlights.length] || null;
  }, [communitySpotlights, miniSpotlightIndex]);
  const nextMiniSpotlightView = useMemo(
    () => spotlightItemView(nextMiniSpotlight),
    [nextMiniSpotlight]
  );
  const nextSpotlightMediaKey = spotlightItemMediaKey(nextMiniSpotlight);
  const spotlightPreloadItem =
    spotlightTransition?.phase === 'handoff' && spotlightTransition.targetItem
      ? spotlightTransition.targetItem
      : nextMiniSpotlight;
  const spotlightPreloadView = spotlightItemView(spotlightPreloadItem);
  const spotlightPreloadMediaKey = spotlightItemMediaKey(spotlightPreloadItem);
  const spotlightPreloadIsHandoff = Boolean(
    spotlightTransition?.phase === 'handoff' &&
      spotlightTransition.targetMediaKey &&
      spotlightTransition.targetMediaKey === spotlightPreloadMediaKey
  );

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

  const reportSpotlightMediaStatus = useCallback(
    (mediaKey: string, status: SpotlightMediaStatus) => {
      if (!mediaKey) return;
      setSpotlightMediaStatusByKey((current) => {
        const previous = current[mediaKey];
        if (
          previous?.status === status.status &&
          (status.status === 'unavailable' ||
            (previous.status === 'ready' &&
              previous.kind === status.kind &&
              previous.durationSeconds === status.durationSeconds &&
              previous.fallbackFromVideo === status.fallbackFromVideo))
        ) {
          return current;
        }
        const next = { ...current, [mediaKey]: status };
        spotlightMediaStatusByKeyRef.current = next;
        return next;
      });
    },
    []
  );

  useEffect(() => {
    spotlightMediaStatusByKeyRef.current = spotlightMediaStatusByKey;
  }, [spotlightMediaStatusByKey]);

  const reportSpotlightPlaybackStatus = useCallback(
    (occurrenceKey: string, status: SpotlightPlaybackStateDetails) => {
      if (!occurrenceKey || status.occurrenceId !== occurrenceKey) return;
      spotlightPlaybackStatusByKeyRef.current = {
        ...spotlightPlaybackStatusByKeyRef.current,
        [occurrenceKey]: status,
      };
      setSpotlightPlaybackStatusByKey((current) => {
        const previous = current[occurrenceKey];
        if (
          previous?.phase === status.phase &&
          previous.retryCount === status.retryCount &&
          previous.pauseReason === status.pauseReason &&
          spotlightPlaybackCanQualify(previous) ===
            spotlightPlaybackCanQualify(status)
        ) {
          return current;
        }
        return { ...current, [occurrenceKey]: status };
      });
    },
    []
  );

  useEffect(() => {
    spotlightPlaybackStatusByKeyRef.current = spotlightPlaybackStatusByKey;
  }, [spotlightPlaybackStatusByKey]);

  const spotlightRotationActiveKey = useMemo(
    () => {
      if (!miniSpotlight) return '';
      const presentationId = firstMeaningful(
        miniSpotlight.opportunityPresentationId
      );
      if (presentationId) return presentationId;
      const existing = spotlightLegacyOccurrenceIdsRef.current.get(miniSpotlight);
      if (existing) return existing;
      spotlightLegacyOccurrenceSequenceRef.current += 1;
      const occurrenceId = `${spotlightMediaKey}::legacy-occurrence-${spotlightLegacyOccurrenceSequenceRef.current}`;
      spotlightLegacyOccurrenceIdsRef.current.set(miniSpotlight, occurrenceId);
      return occurrenceId;
    },
    [miniSpotlight, spotlightMediaKey]
  );

  const reportSpotlightActiveMediaStatus = useCallback(
    (occurrenceKey: string, status: SpotlightMediaStatus) => {
      if (!occurrenceKey) return;
      const next = { [occurrenceKey]: status };
      spotlightActiveMediaStatusByOccurrenceRef.current = next;
      setSpotlightActiveMediaStatusByOccurrence(next);
    },
    []
  );

  const completeSpotlightMediaHandoff = useCallback(
    (occurrenceKey: string, mediaKey: string) => {
      const transition = spotlightTransitionRef.current;
      if (
        !transition ||
        !['handoff', 'neutral'].includes(transition.phase) ||
        transition.targetMediaKey !== mediaKey ||
        occurrenceKey !== spotlightRotationActiveKey
      ) {
        return;
      }
      const finish = () => {
        const latest = spotlightTransitionRef.current;
        if (
          !latest ||
          !['handoff', 'neutral'].includes(latest.phase) ||
          latest.targetMediaKey !== mediaKey
        ) {
          return;
        }
        spotlightTransitionRef.current = null;
        setSpotlightTransition(null);
      };
      if (typeof window === 'undefined') {
        finish();
        return;
      }
      window.requestAnimationFrame(() => window.requestAnimationFrame(finish));
    },
    [spotlightRotationActiveKey]
  );
  const activeSpotlightMediaStatus =
    spotlightActiveMediaStatusByOccurrence[spotlightRotationActiveKey];
  const spotlightRotationMediaSettled =
    !spotlightHasRenderableMedia || Boolean(activeSpotlightMediaStatus);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !spotlightHasRenderableMedia ||
      !spotlightRotationActiveKey ||
      activeSpotlightMediaStatus
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      const status: SpotlightMediaStatus = { status: 'unavailable' };
      reportSpotlightActiveMediaStatus(spotlightRotationActiveKey, status);
      const transition = spotlightTransitionRef.current;
      if (
        transition &&
        ['handoff', 'neutral'].includes(transition.phase) &&
        transition.targetMediaKey === spotlightMediaKey
      ) {
        spotlightTransitionRef.current = null;
        setSpotlightTransition(null);
      }
    }, SPOTLIGHT_MEDIA_PRELOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [
    activeSpotlightMediaStatus,
    reportSpotlightActiveMediaStatus,
    spotlightHasRenderableMedia,
    spotlightMediaKey,
    spotlightRotationActiveKey,
  ]);

  // Reduced Motion changes playback, not the governed campaign dwell.
  const governedSpotlightDwellMs = publicShopSpotlightRotationMs({
    mediaKind:
      activeSpotlightMediaStatus?.status === 'ready'
        ? activeSpotlightMediaStatus.kind
        : miniSpotlightView.videoUrl
        ? 'video'
        : 'image',
    videoDurationSeconds:
      activeSpotlightMediaStatus?.status === 'ready' &&
      activeSpotlightMediaStatus.kind === 'video'
        ? activeSpotlightMediaStatus.durationSeconds
        : null,
  });
  // Terminally unavailable media has no user-facing dwell budget. Keep the
  // active occurrence in place only until a ready successor can replace it.
  const spotlightRotationDelayMs =
    !spotlightHasRenderableMedia ||
    activeSpotlightMediaStatus?.status === 'unavailable'
      ? 0
      : governedSpotlightDwellMs;
  const spotlightPresentationType = miniSpotlightIsOwnerInspection
    ? 'owner-preview'
    : miniSpotlight?.isCanonicalVisibility
    ? 'visibility'
    : miniSpotlight?.isCanonicalReplay
    ? 'replay'
    : miniSpotlight?.isCanonicalOpportunity
    ? 'fresh'
    : 'legacy';
  const spotlightEffectiveMediaKind =
    activeSpotlightMediaStatus?.status === 'ready'
      ? activeSpotlightMediaStatus.kind
      : spotlightHasRenderableMedia
      ? 'pending'
      : 'none';
  const spotlightRotationCanAdvance =
    communitySpotlights.length > 1 ||
    Boolean(
      miniSpotlight?.isCanonicalOpportunity &&
        !ownerSpotlightPreviewAuthorized
    );


  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pendingMediaKeys = [
      spotlightHasRenderableMedia ? spotlightMediaKey : '',
      nextMiniSpotlightView.imageUrl || nextMiniSpotlightView.videoUrl
        ? nextSpotlightMediaKey
        : '',
    ].filter(
      (mediaKey, index, values) =>
        Boolean(mediaKey) &&
        values.indexOf(mediaKey) === index &&
        !spotlightMediaStatusByKey[mediaKey]
    );
    if (pendingMediaKeys.length <= 0) return;

    const timers = pendingMediaKeys.map((mediaKey) =>
      window.setTimeout(
        () => reportSpotlightMediaStatus(mediaKey, { status: 'unavailable' }),
        SPOTLIGHT_MEDIA_PRELOAD_TIMEOUT_MS
      )
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [
    nextMiniSpotlightView.imageUrl,
    nextMiniSpotlightView.videoUrl,
    nextSpotlightMediaKey,
    reportSpotlightMediaStatus,
    spotlightHasRenderableMedia,
    spotlightMediaKey,
    spotlightMediaStatusByKey,
  ]);

  useEffect(() => {
    if (
      spotlightTransitionRef.current ||
      !spotlightRotationCanAdvance ||
      !spotlightRotationActiveKey ||
      !spotlightRotationMediaSettled
    ) {
      return;
    }

    let remainingVisibleMs = spotlightRotationDelayMs;
    let lastTickAt = Date.now();
    let timer: number | null = null;

    const advancePastActiveOccurrence = () => {
      const activeRows = communitySpotlightsRef.current;
      if (activeRows.length <= 0) return false;

      const activeIndex = Math.min(
        Math.max(miniSpotlightIndexRef.current, 0),
        activeRows.length - 1
      );
      const activeCampaignId = positiveNumber(
        activeRows[activeIndex]?.opportunityCampaignId
      );
      const activeItem = activeRows[activeIndex] || null;
      if (
        ownerSpotlightInspectionMode &&
        !ownerSpotlightPreviewAuthorized &&
        activeItem &&
        !activeItem.isCanonicalOpportunity
      ) {
        const ownerOccurrenceKey =
          spotlightOwnerInspectionOccurrenceKey(activeItem);
        if (ownerOccurrenceKey) {
          spotlightConsumedOwnerInspectionKeysRef.current.add(
            ownerOccurrenceKey
          );
        }
      }
      if (activeCampaignId > 0) {
        spotlightSeenCampaignIdsRef.current.add(activeCampaignId);
      }
      const beginWaitingTransition = () => {
        const currentTransition = spotlightTransitionRef.current;
        if (
          currentTransition?.sourceOccurrenceId ===
          spotlightRotationActiveKey
        ) {
          return;
        }
        const transition: SpotlightTransitionState = {
          phase: 'holding',
          sourceOccurrenceId: spotlightRotationActiveKey,
          startedAtMs: Date.now(),
          targetItem: null,
          targetMediaKey: '',
        };
        spotlightTransitionRef.current = transition;
        setSpotlightTransition(transition);
      };

      if (activeRows.length <= 1) {
        beginWaitingTransition();
        void requestNextCanonicalSpotlight();
        return true;
      }

      const nextIndexBeforeRemoval = (activeIndex + 1) % activeRows.length;
      const nextItem = activeRows[nextIndexBeforeRemoval] || null;
      const nextMediaKey = spotlightItemMediaKey(nextItem);
      const nextView = spotlightItemView(nextItem);
      const nextHasMedia = Boolean(nextView.imageUrl || nextView.videoUrl);
      const nextMediaStatus = nextMediaKey
        ? spotlightMediaStatusByKeyRef.current[nextMediaKey]
        : undefined;

      if (nextHasMedia && !nextMediaStatus) {
        beginWaitingTransition();
        return true;
      }
      if (nextHasMedia && nextMediaStatus?.status === 'unavailable') {
        const remainingRows = activeRows.filter(
          (_, index) => index !== nextIndexBeforeRemoval
        );
        const retainedActiveIndex = remainingRows.findIndex(
          (item) => item === activeRows[activeIndex]
        );
        const safeActiveIndex = Math.max(retainedActiveIndex, 0);
        communitySpotlightsRef.current = remainingRows;
        miniSpotlightIndexRef.current = safeActiveIndex;
        setCommunitySpotlights(remainingRows);
        setMiniSpotlightIndex(safeActiveIndex);
        beginWaitingTransition();
        void requestNextCanonicalSpotlight();
        return true;
      }

      const nextRows = activeRows.filter((_, index) => index !== activeIndex);
      const nextIndex = nextRows.length > 0 ? activeIndex % nextRows.length : 0;
      const transition: SpotlightTransitionState | null = nextHasMedia
        ? {
            phase: 'handoff',
            sourceOccurrenceId: spotlightRotationActiveKey,
            startedAtMs: Date.now(),
            targetItem: nextItem,
            targetMediaKey: nextMediaKey,
          }
        : null;
      spotlightTransitionRef.current = transition;
      setSpotlightTransition(transition);
      communitySpotlightsRef.current = nextRows;
      miniSpotlightIndexRef.current = nextIndex;
      setCommunitySpotlights(nextRows);
      setMiniSpotlightIndex(nextIndex);
      if (nextRows.length <= 1) {
        void requestNextCanonicalSpotlight();
      }
      return true;
    };
    const activeRowsAtStart = communitySpotlightsRef.current;
    const activeIndexAtStart = Math.min(
      Math.max(miniSpotlightIndexRef.current, 0),
      Math.max(activeRowsAtStart.length - 1, 0)
    );
    const activeItemAtStart = activeRowsAtStart[activeIndexAtStart] || null;
    if (
      activeRowsAtStart.length <= 1 &&
      activeItemAtStart?.isCanonicalOpportunity
    ) {
      void requestNextCanonicalSpotlight();
    }
    const activeDeadlineMs = activeItemAtStart?.isCanonicalOpportunity
      ? publicShopSpotlightPresentationDeadlineMs(activeItemAtStart)
      : Number.NaN;
    const minimumSafeStartMs = spotlightRotationDelayMs;
    if (
      Number.isFinite(activeDeadlineMs) &&
      activeDeadlineMs - Date.now() < minimumSafeStartMs
    ) {
      advancePastActiveOccurrence();
      return;
    }

    const tick = () => {
      const now = Date.now();
      const hidden =
        typeof document !== 'undefined' &&
        document.visibilityState !== 'visible';
      const playbackStatus =
        spotlightPlaybackStatusByKeyRef.current[spotlightRotationActiveKey];
      const playbackStalled =
        activeSpotlightMediaStatus?.status === 'ready' &&
        activeSpotlightMediaStatus.kind === 'video' &&
        (!playbackStatus || spotlightPlaybackPausesDisplayClock(playbackStatus));
      const paused =
        hidden ||
        !spotlightPresentationVisibleRef.current ||
        Date.now() < spotlightInteractionPausedUntilRef.current ||
        spotlightHasKeyboardFocus ||
        playbackStalled;

      if (!paused) {
        remainingVisibleMs -= Math.max(0, now - lastTickAt);
      }
      lastTickAt = now;

      if (remainingVisibleMs <= 0) {
        // Consume this occurrence after one complete dwell. Circularly keeping
        // it allowed early promotions to repeat while later server windows had
        // not yet reached the handset.
        if (advancePastActiveOccurrence()) return;
        timer = window.setTimeout(tick, 250);
        return;
      }

      timer = window.setTimeout(tick, Math.min(250, remainingVisibleMs));
    };

    timer = window.setTimeout(tick, Math.min(250, remainingVisibleMs));
    return () => {
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [
    spotlightHasKeyboardFocus,
    spotlightInteractionPausedUntil,
    spotlightRotationActiveKey,
    spotlightRotationDelayMs,
    spotlightRotationCanAdvance,
    spotlightRotationMediaSettled,
    requestNextCanonicalSpotlight,
    ownerSpotlightInspectionMode,
    ownerSpotlightPreviewAuthorized,
    spotlightTransition,
  ]);

  useEffect(() => {
    const transition = spotlightTransition;
    if (!transition || transition.phase === 'handoff') return;

    if (spotlightRotationActiveKey !== transition.sourceOccurrenceId) {
      if (!miniSpotlight) {
        if (transition.phase !== 'neutral') {
          const neutralTransition = { ...transition, phase: 'neutral' as const };
          spotlightTransitionRef.current = neutralTransition;
          setSpotlightTransition(neutralTransition);
        }
        void requestNextCanonicalSpotlight();
        return;
      }
      const targetMediaKey = spotlightItemMediaKey(miniSpotlight);
      const replacementTransition: SpotlightTransitionState = {
        ...transition,
        phase: 'neutral',
        targetItem: miniSpotlight,
        targetMediaKey,
      };
      spotlightTransitionRef.current = replacementTransition;
      setSpotlightTransition(replacementTransition);
      if (!targetMediaKey) {
        window.requestAnimationFrame(() => {
          spotlightTransitionRef.current = null;
          setSpotlightTransition(null);
        });
      }
      return;
    }

    if (!nextMiniSpotlight) {
      void requestNextCanonicalSpotlight();
      const retainAuthorizedFrame = spotlightTransitionCanRetainFrame({
        hasActiveItem: Boolean(miniSpotlight),
        isCanonicalOpportunity: Boolean(
          miniSpotlight?.isCanonicalOpportunity
        ),
        presentationIsCurrent: Boolean(
          miniSpotlight &&
            publicShopSpotlightPresentationIsCurrent(miniSpotlight)
        ),
        mediaStatus: activeSpotlightMediaStatus?.status,
      });
      if (retainAuthorizedFrame) {
        if (transition.phase !== 'holding') {
          const holdingTransition = {
            ...transition,
            phase: 'holding' as const,
          };
          spotlightTransitionRef.current = holdingTransition;
          setSpotlightTransition(holdingTransition);
        }
        return;
      }
      const remainingHoldMs = Math.max(
        0,
        SPOTLIGHT_AUTHORIZED_FRAME_HOLD_MS -
          (Date.now() - transition.startedAtMs)
      );
      if (transition.phase === 'holding' && remainingHoldMs <= 0) {
        const neutralTransition = { ...transition, phase: 'neutral' as const };
        spotlightTransitionRef.current = neutralTransition;
        setSpotlightTransition(neutralTransition);
        return;
      }
      if (transition.phase === 'holding') {
        const timer = window.setTimeout(() => {
          const current = spotlightTransitionRef.current;
          if (
            current?.phase === 'holding' &&
            current.sourceOccurrenceId === transition.sourceOccurrenceId
          ) {
            const neutralTransition = {
              ...current,
              phase: 'neutral' as const,
            };
            spotlightTransitionRef.current = neutralTransition;
            setSpotlightTransition(neutralTransition);
          }
        }, remainingHoldMs);
        return () => window.clearTimeout(timer);
      }
      return;
    }

    const nextMediaKey = spotlightItemMediaKey(nextMiniSpotlight);
    const nextView = spotlightItemView(nextMiniSpotlight);
    const nextHasMedia = Boolean(nextView.imageUrl || nextView.videoUrl);
    const nextStatus = nextMediaKey
      ? spotlightMediaStatusByKeyRef.current[nextMediaKey]
      : undefined;
    if (nextHasMedia && !nextStatus) return;

    if (nextHasMedia && nextStatus?.status === 'unavailable') {
      const rows = communitySpotlightsRef.current;
      const filteredRows = rows.filter((item) => item !== nextMiniSpotlight);
      const sourceIndex = Math.max(
        filteredRows.findIndex(
          (item) => item === rows[miniSpotlightIndexRef.current]
        ),
        0
      );
      communitySpotlightsRef.current = filteredRows;
      miniSpotlightIndexRef.current = sourceIndex;
      setCommunitySpotlights(filteredRows);
      setMiniSpotlightIndex(sourceIndex);
      void requestNextCanonicalSpotlight();
      return;
    }

    const rows = communitySpotlightsRef.current;
    const activeIndex = Math.min(
      Math.max(miniSpotlightIndexRef.current, 0),
      Math.max(rows.length - 1, 0)
    );
    const nextRows = rows.filter((_, index) => index !== activeIndex);
    const nextIndex = nextRows.length > 0 ? activeIndex % nextRows.length : 0;
    const handoffTransition: SpotlightTransitionState | null = nextHasMedia
      ? {
          ...transition,
          phase: 'handoff',
          targetItem: nextMiniSpotlight,
          targetMediaKey: nextMediaKey,
        }
      : null;
    spotlightTransitionRef.current = handoffTransition;
    setSpotlightTransition(handoffTransition);
    communitySpotlightsRef.current = nextRows;
    miniSpotlightIndexRef.current = nextIndex;
    setCommunitySpotlights(nextRows);
    setMiniSpotlightIndex(nextIndex);
    if (nextRows.length <= 1) void requestNextCanonicalSpotlight();
  }, [
    miniSpotlight,
    nextMiniSpotlight,
    requestNextCanonicalSpotlight,
    spotlightMediaStatusByKey,
    spotlightRotationActiveKey,
    spotlightTransition,
    activeSpotlightMediaStatus,
  ]);

  const ownerSpotlightStatusView = useMemo(() => {
    if (spotlightTransition) return null;
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
    spotlightTransition,
  ]);

  useEffect(() => {
    const qualifyingMediaStatus =
      spotlightActiveMediaStatusByOccurrence[spotlightRotationActiveKey];
    if (
      spotlightTransition ||
      loading ||
      error ||
      !miniSpotlight ||
      miniSpotlightIsOwnerInspection ||
      ownerSpotlightPreviewAuthorized ||
      !spotlightHasRenderableMedia ||
      !spotlightMediaKey ||
      qualifyingMediaStatus?.status !== 'ready' ||
      qualifyingMediaStatus.fallbackFromVideo
    ) return;
    if (typeof window === "undefined") return;
    const activeSpotlight = miniSpotlight;

    // A canonical replay is continuity for a presentation already qualified by
    // this viewer. It must not qualify again or emit a second attention event.
    if (
      activeSpotlight.isCanonicalReplay ||
      activeSpotlight.isCanonicalVisibility
    ) return;

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
            if (communitySpotlightsRef.current.length <= 1) {
              void requestNextCanonicalSpotlight();
            }
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


      const latestMediaStatus =
        spotlightActiveMediaStatusByOccurrenceRef.current[
          spotlightRotationActiveKey
        ];
      if (
        latestMediaStatus?.status === 'ready' &&
        latestMediaStatus.kind === 'video'
      ) {
        const playbackStatus =
          spotlightPlaybackStatusByKeyRef.current[spotlightRotationActiveKey];
        if (
          !playbackStatus ||
          !spotlightPlaybackCanQualify(playbackStatus)
        ) {
          visibleSince = 0;
          qualificationTimer = window.setTimeout(evaluateQualification, 250);
          spotlightQualificationTimerRef.current = qualificationTimer;
          return;
        }
      }

      if (
        activeSpotlight.isCanonicalOpportunity &&
        activeSpotlight.opportunityPresentationToken &&
        !spotlightSuppliedKeysRef.current.has(presentationKey)
      ) {
        spotlightSuppliedKeysRef.current.add(presentationKey);
        void acknowledgeSpotlightPresentationSupply({
          presentation_token: activeSpotlight.opportunityPresentationToken,
          visible_ratio: spotlightVisibleRatioRef.current,
          document_visible: currentDocumentVisible(),
          owner_preview: false,
        }).catch(() => {
          if (alive) spotlightSuppliedKeysRef.current.delete(presentationKey);
        });
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
    spotlightActiveMediaStatusByOccurrence,
    spotlightRotationActiveKey,
    spotlightTransition,
    trackMarketplaceAttention,
  ]);

  const publicShopSpotlightActive = Boolean(
    miniSpotlight && spotlightTransition?.phase !== 'neutral'
  );
  const spotlightScreenHeight = spotlightImmersiveOpen
    ? isCompact
      ? "calc(100dvh - 64px)"
      : "calc(100dvh - 72px)"
    : isCompact
    ? "clamp(560px, 74svh, 620px)"
    : "clamp(500px, 64vh, 680px)";
  const spotlightAdvertiserLabel = firstMeaningful(
    miniSpotlight?.sourceShopName,
    miniSpotlight?.authorName
  );
  const spotlightCommunityLabel = firstMeaningful(
    miniSpotlight?.sourceClanName
  );
  const spotlightAvailabilityLabel = firstMeaningful(
    miniSpotlight?.sourceProductAvailability
  );
  const spotlightCategoryLabel = firstMeaningful(
    miniSpotlight?.sourceProductCategory
  );
  const spotlightFactLabels = Array.from(
    new Set(
      [
        ownerSpotlightStatusView ? miniSpotlightView.priceLabel : "",
        spotlightAvailabilityLabel,
        spotlightCategoryLabel,
      ].filter(Boolean)
    )
  );
  const spotlightViewDetail =
    safeStr(miniSpotlightView.detail).trim().toLocaleLowerCase() !==
    safeStr(miniSpotlightView.title).trim().toLocaleLowerCase()
      ? miniSpotlightView.detail
      : "";
  const spotlightInformationDetail = publicShopSpotlightActive
    ? firstMeaningful(
        miniSpotlight?.sourceProductDescription,
        spotlightViewDetail
      )
    : firstMeaningful(ownerSpotlightStatusView?.detail, spotlightViewDetail);
  const spotlightInformationTitle = publicShopSpotlightActive
    ? firstMeaningful(
        miniSpotlight?.sourceProductTitle,
        miniSpotlightView.title,
        "Spotlight product"
      )
    : ownerSpotlightStatusView
    ? ownerSpotlightStatusView.title
    : "Discover what's new";
  const spotlightInformationAvailable = Boolean(
    publicShopSpotlightActive || ownerSpotlightStatusView
  );
  const publicShopMoreHashOpen = [
    `#${PUBLIC_SHOP_SPOTLIGHT_ANCHOR}`,
    `#${PUBLIC_SHOP_VAULT_ANCHOR}`,
    `#${PUBLIC_SHOP_DIARIES_ANCHOR}`,
  ].includes(location.hash);
  const publicShopMoreDisclosureOpen =
    !isCompact || shopMoreOpen || publicShopMoreHashOpen;
  const publicShopMoreLabel =
    routeDiaryEntryId > 0
      ? "Shared shop update"
      : ownerSpotlightStatusView
      ? ownerSpotlightStatusView.label
      : publicShopSpotlightActive
      ? "Live Spotlight"
      : "More from this shop";

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
    return ownerId ? publicShopSocialPreviewUrl({ gmfnId: ownerId }) : "";
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
  const marketplaceReturnCommunityId = positiveNumber(
    explicitRouteClanId || routeClanId || effectiveShop?.clanId || getSelectedClanId()
  );
  const marketplaceMemberShopsPath = routeWithCommunity(
    `${APP_ROUTES.MARKETPLACE}#marketplace-members-shops`,
    marketplaceReturnCommunityId
  );
  const ownerShopAnalyticsPath = routeWithCommunity(
    `${APP_ROUTES.SHOP_ME}#${OWNER_SHOP_HASHES.summary}`,
    ownerSurfaceCommunityId
  );
  const ownerShopEditPath = routeWithCommunity(
    `${APP_ROUTES.SHOP_ME}#${OWNER_SHOP_HASHES.billboard}`,
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
  const ownerVaultControlPath = routeWithCommunity(
    APP_ROUTES.VAULT_CONTROL,
    ownerSurfaceCommunityId
  );
  const ownerSpotlightShortcutMode =
    ownerSpotlightStatusView?.state === 'none' ? 'create' : 'manage';
  const signedInOwnsShop = Boolean(
    ownerSessionPresent &&
      (signedInRouteIsOwner ||
        (signedInGmfnId &&
        shopOwnerGmfnId &&
        ownerSurfaceIdentityMatches(signedInGmfnId, shopOwnerGmfnId)) ||
        (positiveNumber(effectiveShop?.id) > 0 &&
          shopFollowState.shopId === positiveNumber(effectiveShop?.id) &&
          shopFollowState.isOwner))
  );
  const showMarketplaceReturn = Boolean(
    ownerSessionPresent && effectiveShop && !loading && !signedInOwnsShop
  );
  const shopOptionsOwner = signedInOwnsShop || shopFollowState.isOwner;
  const nextEmptyProductSlot = useMemo(() => {
    if (focusedBlockLinkActive) return 0;
    const occupiedSlots = new Set(
      products
        .map((product) => positiveNumber(product.slotNumber))
        .filter((slotNumber) => slotNumber > 0)
    );
    return (
      Array.from(
        { length: gallerySlotsTotal },
        (_, index) => index + 1
      ).find((slotNumber) => !occupiedSlots.has(slotNumber)) || 0
    );
  }, [focusedBlockLinkActive, gallerySlotsTotal, products]);
  const hiddenProductCount = focusedBlockLinkActive
    ? 0
    : Math.max(0, products.length - GALLERY_INITIAL_VISIBLE_PRODUCT_COUNT);
  const ownerProgressiveEmptySlotVisible = Boolean(
    nextEmptyProductSlot && (showAllProducts || hiddenProductCount === 0)
  );
  const visitorProgressiveEmptySlotVisible = Boolean(
    nextEmptyProductSlot && (showAllProducts || hiddenProductCount === 0)
  );
  const ownerEmptyProductSlots =
    signedInOwnsShop && ownerProgressiveEmptySlotVisible
      ? [nextEmptyProductSlot]
      : [];
  const visitorOpeningSoonSlot =
    !signedInOwnsShop && visitorProgressiveEmptySlotVisible
      ? nextEmptyProductSlot
      : 0;
  const progressiveShelfCardOrder = gallerySlotsTotal + 1;
  const progressiveSlotSpansPair = visibleProducts.length % 2 === 0;
  const hiddenShelfEntryCount = focusedBlockLinkActive
    ? 0
    : hiddenProductCount +
      (signedInOwnsShop &&
      nextEmptyProductSlot > 0 &&
      hiddenProductCount > 0
        ? 1
        : 0);

  useEffect(() => {
    if (hiddenShelfEntryCount === 0 && showAllProducts) {
      setShowAllProducts(false);
    }
  }, [hiddenShelfEntryCount, showAllProducts]);
  const showBlockPlacementAction = signedInOwnsShop && !shopLoadFailed;
  const showProductContactAction = !signedInOwnsShop && !shopLoadFailed;
  const showProductSaveAction = !signedInOwnsShop && !shopLoadFailed;
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

  function similarProductsPath(product: ShopProduct): string {
    const params = new URLSearchParams();
    params.set("q", productDisplayTitle(product));
    params.set("source", "similar-products");
    const productId = positiveNumber(product.id);
    if (productId) params.set("product_id", String(productId));
    params.set("return_to", publicShopReturnPath);
    return `/discover?${params.toString()}`;
  }

  function ownerEmptyProductPath(blockNumber: number): string {
    const params = new URLSearchParams();
    params.set("manage_block", String(blockNumber));
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
  function shopProductReturnPath(
    product: ShopProduct,
    purchaseRequested: boolean
  ): string {
    const params = new URLSearchParams(location.search);
    const productId = positiveNumber(product.id);
    const clanId = positiveNumber(product.originClanId || effectiveShop?.clanId);
    if (productId) params.set("product_id", String(productId));
    if (clanId) params.set("clan_id", String(clanId));
    if (purchaseRequested) {
      params.set("purchase", "1");
      params.set("gsn_source", "shop_purchase_action");
    } else {
      params.delete("purchase");
    }
    const query = params.toString();
    return `${location.pathname}${query ? `?${query}` : ""}`;
  }

  useEffect(() => {
    if (
      !routeShopPurchaseRequested ||
      loading ||
      error ||
      !getAccessToken() ||
      signedInOwnsShop ||
      routeProductId <= 0
    ) {
      return;
    }
    const product = products.find(
      (candidate) =>
        positiveNumber(candidate.id) === routeProductId && candidate.isActive
    );
    const returnKey = [
      location.pathname,
      routeProductId,
      positiveNumber(effectiveShop?.id),
    ].join(":");
    if (!product || shopPurchaseReturnHandledRef.current === returnKey) return;
    shopPurchaseReturnHandledRef.current = returnKey;
    openShopProductPurchase(product);
  }, [
    effectiveShop?.id,
    error,
    loading,
    location.pathname,
    products,
    routeProductId,
    routeShopPurchaseRequested,
    signedInOwnsShop,
  ]);
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
    !isCompact &&
    Boolean(shopDescriptionText) &&
    shopDescriptionText.toLowerCase() !== shopCategoryText.toLowerCase();
  const shopGmfnText = safeStr(effectiveShop?.gmfnId);
  const publicShopSharePosterUrl = publicShopShareCardUrl(
    firstMeaningful(shopGmfnText, gmfnId)
  );
  const publicShopShareCaption = [
    shopNameText,
    absoluteShopLink ? `Open Shop: ${absoluteShopLink}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const preparePublicShopSharePoster = useCallback(
    (signal: AbortSignal) =>
      preparePublicShopSharePosterFile(
        publicShopSharePosterUrl,
        shopNameText,
        signal
      ),
    [publicShopSharePosterUrl, shopNameText]
  );
  const publicShopNativeFileShare = useMemo(
    () =>
      publicShopSharePosterUrl && absoluteShopLink
        ? {
            sourceKey: publicShopSharePosterUrl,
            caption: publicShopShareCaption,
            statusLink: absoluteShopLink,
            prepareFile: preparePublicShopSharePoster,
            mediaKind: "image" as const,
            label: "Share shop picture",
          }
        : undefined,
    [
      absoluteShopLink,
      preparePublicShopSharePoster,
      publicShopShareCaption,
      publicShopSharePosterUrl,
    ]
  );
  const shopCommunityText = safeStr(effectiveShop?.communityName);
  const shopUpdateContextText = firstMeaningful(
    shopCommunityText,
    spotlightCommunityLabel
  );
  const publicBlockCount = Math.min(products.length, GALLERY_SLOTS_TOTAL);
  const publicBlockText = autoRefreshingShop
    ? "Reconnecting shop"
    : shopLoadFailed
    ? "Shop not connected"
    : publicBlockCount === 1
      ? "1 shop item"
      : `${publicBlockCount} shop items`;
  const shopDiaryCounterText = loading ? 'Loading' : autoRefreshingShop
    ? "Refreshing"
    : shopLoadFailed
    ? "Needs refresh"
    : `${publicBlockCount} ${publicBlockCount === 1 ? "item" : "items"}`;
  const productsServicesUpdateText = featuredDiaryEntry
    ? firstMeaningful(
        featuredDiaryEntry.note,
        featuredDiaryEntry.activity_label,
        "A new shop update is available."
      )
    : loading
    ? "Loading the latest products and services."
    : publicBlockCount > 0
    ? `${shopDiaryCounterText} currently listed. Ask the owner about availability.`
    : "No products or services update right now.";
  const shopWelcomeVoice = effectiveShop?.voiceAttachmentId
    ? {
        attachmentId: effectiveShop.voiceAttachmentId,
        durationSeconds: effectiveShop.voiceDurationSeconds,
        deletedAt: effectiveShop.voiceDeletedAt,
        speakerName: effectiveShop.voiceSpeakerName,
        speakerGmfnId: effectiveShop.voiceSpeakerGmfnId,
        label: "Shop welcome voice",
      }
    : null;
  const latestShopUpdateVoice = positiveNumber(featuredDiaryEntry?.voice_attachment_id)
    || positiveNumber(latestPublicShopUpdateVoiceEntry?.voice_attachment_id)
    ? {
        attachmentId: positiveNumber(
          latestPublicShopUpdateVoiceEntry?.voice_attachment_id
        ),
        durationSeconds: latestPublicShopUpdateVoiceEntry?.voice_duration_seconds,
        deletedAt: latestPublicShopUpdateVoiceEntry?.voice_deleted_at,
        speakerName: latestPublicShopUpdateVoiceEntry?.voice_speaker_name,
        speakerGmfnId: latestPublicShopUpdateVoiceEntry?.voice_speaker_gmfn_id,
        label: "Latest Shop Update voice",
      }
    : null;
  const activeShopWelcomeVoice =
    shopWelcomeVoice && !shopWelcomeVoice.deletedAt ? shopWelcomeVoice : null;
  const activeLatestShopUpdateVoice =
    latestShopUpdateVoice && !latestShopUpdateVoice.deletedAt
      ? latestShopUpdateVoice
      : null;
  const visitorPublicShopVoice = !signedInOwnsShop
    ? activeShopWelcomeVoice || activeLatestShopUpdateVoice
    : null;
  const publicShopTickerVoice = signedInOwnsShop
    ? activeShopWelcomeVoice || activeLatestShopUpdateVoice
    : visitorPublicShopVoice;
  const visitorOpeningSoonVoice =
    visitorOpeningSoonSlot && visitorPublicShopVoice
      ? visitorPublicShopVoice
      : null;
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
    trackMarketplaceAttention("contact_tap", {
      source: openedFromPublicDiscovery
        ? "public_discovery_contact"
        : "public_shop_phone_contact",
    });

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
    trackMarketplaceAttention("contact_tap", {
      source: openedFromPublicDiscovery
        ? "public_discovery_contact"
        : "public_shop_whatsapp_contact",
    });

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

  async function toggleProductSave(product: ShopProduct) {
    const productId = positiveNumber(product.id);
    if (!productId || savingProductId === productId) return;

    const key = String(productId);
    const wasSaved = savedProductState(
      savedProductIds,
      productId,
      Boolean(product.isSaved)
    );
    const intendedSavedState = !wasSaved;
    setSavingProductId(productId);
    try {
      const result = wasSaved
        ? await unsaveMarketplaceProduct(productId)
        : await saveMarketplaceProduct(productId);
      const saved =
        typeof result?.saved === "boolean"
          ? result.saved
          : intendedSavedState;
      setSavedProductIds((current) => ({ ...current, [key]: saved }));
      void trackMarketplaceAttention(saved ? "product_saved" : "product_unsaved", {
        product_id: productId,
        source: "public_shop_product_save",
      });
    } catch {
      setNotice({
        tone: "error",
        text: "Could not update saved products. Please try again.",
      });
    } finally {
      setSavingProductId(null);
    }
  }

  function openShopProductPurchase(product: ShopProduct) {
    const productId = positiveNumber(product.id);
    const shopId = positiveNumber(effectiveShop?.id);
    const clanId = positiveNumber(product.originClanId || effectiveShop?.clanId);
    if (!productId || !shopId || !product.isActive || signedInOwnsShop) {
      setNotice({
        tone: "error",
        text: signedInOwnsShop
          ? "Shop owners cannot submit a purchase request to their own shop."
          : "This product is not ready for a purchase request.",
      });
      return;
    }

    const action = shopProductCommercialAction(product);
    const savedDraft = readShopPurchaseDraft();
    const draft: ShopPurchaseDraft =
      savedDraft &&
      savedDraft.productId === productId &&
      savedDraft.shopId === shopId &&
      savedDraft.intentType === action.intentType
        ? savedDraft
        : {
            productId,
            shopId,
            clanId,
            intentType: action.intentType,
            quantity: 1,
            fulfilmentMethod:
              action.intentType === "request_quote" ? "on_request" : "collection",
            clientRequestId: newPurchaseRequestId(productId),
          };
    writeShopPurchaseDraft(draft);
    setShopPurchaseDraft(draft);
    setOpenProductId(product.id ?? product.slotNumber);

    if (!getAccessToken()) {
      const returnPath = shopProductReturnPath(product, true);
      navigate(`/login?next=${encodeURIComponent(returnPath)}`);
    }
  }

  function updateShopPurchaseDraft(
    update: Partial<Pick<ShopPurchaseDraft, "quantity" | "fulfilmentMethod">>
  ) {
    setShopPurchaseDraft((current) => {
      if (!current) return current;
      const next = { ...current, ...update };
      writeShopPurchaseDraft(next);
      return next;
    });
  }

  async function submitShopProductPurchase(product: ShopProduct) {
    const productId = positiveNumber(product.id);
    const shopId = positiveNumber(effectiveShop?.id);
    const draft = shopPurchaseDraft;
    if (
      !draft ||
      shopPurchaseBusy ||
      !getAccessToken() ||
      !productId ||
      !shopId ||
      !product.isActive ||
      draft.productId !== productId ||
      draft.shopId !== shopId
    ) {
      setNotice({
        tone: "error",
        text: "GSN could not revalidate this product. Close the check and open the product again.",
      });
      return;
    }

    setShopPurchaseBusy(true);
    try {
      const created = await createMarketplacePurchaseIntention({
        product_id: productId,
        shop_id: shopId,
        clan_id: draft.clanId || null,
        client_request_id: draft.clientRequestId,
        intent_type: draft.intentType,
        quantity: draft.quantity,
        fulfilment_method: draft.fulfilmentMethod,
        origin_source: "shop",
      });
      const continuation = created.purchase_continuation;
      const savedIntent = created.commercial_intent;
      writeShopPurchaseDraft(null);
      setShopPurchaseDraft(null);
      navigate(
        `/app/demand-box?demand_id=${created.id}&queue=mine&focus=conversation`,
        {
          state: {
            originPath: shopProductReturnPath(product, false),
            purchaseContinuation:
              continuation?.reused_existing && savedIntent
                ? {
                    productTitle: firstMeaningful(
                      created.product_context?.product_title,
                      productDisplayTitle(product)
                    ),
                    quantity: savedIntent.quantity,
                    fulfilmentMethod: savedIntent.fulfilment_method,
                    currentStage: continuation.current_stage,
                    originSource: savedIntent.origin_source,
                  }
                : null,
          },
        }
      );
    } catch (error: any) {
      setNotice({
        tone: "error",
        text:
          (safeStr(error?.message) ||
            "GSN could not record this purchase request right now.") +
          " Your choices are still here. Try again; GSN will not divert this request outside the private transaction path.",
      });
    } finally {
      setShopPurchaseBusy(false);
    }
  }

  function renderShopPurchaseConfirmation(product: ShopProduct) {
    const productId = positiveNumber(product.id);
    if (!shopPurchaseDraft || shopPurchaseDraft.productId !== productId) {
      return null;
    }
    const action = shopProductCommercialAction(product);
    return (
      <div
        data-shop-purchase-card-shell="true"
        role="presentation"
        onClick={(event) => event.stopPropagation()}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 20,
          display: "grid",
          alignItems: "end",
          padding: isCompact ? 10 : 16,
          background: "rgba(2,12,27,0.64)",
        }}
      >
        <div
          data-shop-purchase-card="true"
          role="dialog"
          aria-modal="true"
          aria-label={action.label}
          style={{
            width: "100%",
            maxWidth: 520,
            maxHeight: "calc(100% - 12px)",
            margin: "0 auto",
            overflowY: "auto",
            boxSizing: "border-box",
            padding: isCompact ? 14 : 18,
            border: "1px solid rgba(85,232,255,0.58)",
            borderRadius: isCompact ? 18 : 22,
            color: "#0B1F33",
            background: "rgba(255,255,255,0.99)",
            boxShadow: "0 18px 44px rgba(2,12,27,0.48)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "grid", gap: 3 }}>
              <strong style={{ fontSize: isCompact ? 18 : 21 }}>{action.label}</strong>
              <span style={{ color: "#52677C", fontSize: 12, fontWeight: 760 }}>
                Check the saved product before sending one private request.
              </span>
            </div>
            <SecondaryButton
              onClick={() => setShopPurchaseDraft(null)}
              minWidth={0}
              stableHeight={40}
              debugId="shop-gallery.product.purchase.close"
              aria-label="Close purchase request check"
              style={{ width: 40, minHeight: 40, borderRadius: 999, padding: 0 }}
            >
              {"\u00D7"}
            </SecondaryButton>
          </div>
          <div style={{ marginTop: 10, display: "grid", gap: 3 }}>
            <strong>{productDisplayTitle(product)}</strong>
            <span style={{ color: "#0757BC", fontSize: 15, fontWeight: 900 }}>
              {product.priceText}
            </span>
          </div>
          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
              gap: 10,
            }}
          >
            <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 850 }}>
              Quantity
              <input
                type="number"
                min={1}
                max={99}
                value={shopPurchaseDraft.quantity}
                onChange={(event) =>
                  updateShopPurchaseDraft({
                    quantity: Math.min(
                      99,
                      Math.max(1, positiveNumber(event.target.value) || 1)
                    ),
                  })
                }
                data-shop-purchase-field="quantity"
                style={{ minWidth: 0, minHeight: 44, borderRadius: 12, padding: "8px 10px" }}
              />
            </label>
            <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 850 }}>
              Fulfilment
              <select
                value={shopPurchaseDraft.fulfilmentMethod}
                onChange={(event) =>
                  updateShopPurchaseDraft({
                    fulfilmentMethod: event.target.value as SpotlightFulfilmentMethod,
                  })
                }
                data-shop-purchase-field="fulfilment"
                style={{ minWidth: 0, minHeight: 44, borderRadius: 12, padding: "8px 10px" }}
              >
                <option value="collection">Collection</option>
                <option value="delivery">Delivery</option>
                <option value="on_request">To be agreed</option>
              </select>
            </label>
          </div>
          <div style={{ marginTop: 10, color: "#52677C", fontSize: 11.5, lineHeight: 1.4 }}>
            Sending this request is not an agreement. Any later agreement is not
            payment, and a payment report is not bank verification.
          </div>
          <PrimaryButton
            onClick={() => void submitShopProductPurchase(product)}
            disabled={shopPurchaseBusy}
            minWidth={0}
            fullWidth
            stableHeight={48}
            debugId="shop-gallery.product.purchase.confirm"
            style={{ ...primaryBtn(false), marginTop: 12, width: "100%", borderRadius: 14 }}
          >
            {shopPurchaseBusy ? "Recording..." : "Confirm request"}
          </PrimaryButton>
          <SubtleButton
            onClick={() => void contactOwnerAboutProduct(product)}
            minWidth={0}
            fullWidth
            stableHeight={42}
            debugId="shop-gallery.product.purchase.ask-seller"
            style={{ width: "100%", marginTop: 6, borderRadius: 12 }}
          >
            Need more information? Ask seller
          </SubtleButton>
        </div>
      </div>
    );
  }

  async function contactOwnerAboutProduct(product: ShopProduct) {
    trackMarketplaceAttention("contact_tap", {
      source: "public_shop_product_contact",
    });

    const productTitle = productDisplayTitle(product);
    const shopTitle = firstMeaningful(
      effectiveShop?.shopName,
      effectiveShop?.ownerName,
      "this GSN shop"
    );
    const priceText = firstMeaningful(product.priceText);
    const message = [
      `Hello, I found "${productTitle}" in ${shopTitle} on GSN.`,
      priceText
        ? `The listed price is ${priceText}. Is this product still available?`
        : "Is this product still available? Please confirm the current price.",
    ].join(" ");
    const productUrl = buildProductSocialShareTarget(product).url;
    const productId = positiveNumber(product.id);
    const shopId = positiveNumber(effectiveShop?.id);
    const clanId = positiveNumber(product.originClanId || effectiveShop?.clanId);

    if (productId && shopId) {
      try {
        const created = await createMarketplaceProductEnquiry({
          product_id: productId,
          shop_id: shopId,
          clan_id: clanId || undefined,
          note: "Is this product still available?",
          client_request_id: `shop-enquiry-${productId}-${Date.now()}`,
        });
        navigate(`/app/demand-box?demand_id=${created.id}&queue=mine`);
        setNotice({
          tone: "success",
          text: "Your private seller conversation is open in GSN.",
        });
        return;
      } catch {
      }
    }

    if (
      openOwnerWhatsAppChat(
        message,
        "WhatsApp opened with the product details. Confirm price, availability and fulfilment with the seller."
      )
    ) {
      return;
    }

    const copied = await safeCopy(`${message}\n${productUrl}`);
    setNotice({
      tone: copied ? "success" : "error",
      text: copied
        ? "The product enquiry and Shop link were copied. Send them to the seller."
        : "The seller contact path is not ready and the enquiry could not be copied.",
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

  function buildSpotlightProductShareTarget() {
    const isProductShare = spotlightProductPreferenceAvailable;
    const productTitle = firstMeaningful(
      miniSpotlight?.sourceProductTitle,
      miniSpotlightView.title,
      isProductShare ? "this product" : "this Spotlight advert"
    );
    const shopTitle = firstMeaningful(
      miniSpotlight?.sourceShopName,
      miniSpotlight?.spotlightOwner,
      miniSpotlight?.authorName,
      isProductShare ? "this GSN shop" : "GSN Spotlight"
    );
    const ownerGmfnId = firstMeaningful(miniSpotlight?.authorGmfnId);
    const shareUrl =
      ownerGmfnId && spotlightSourceProductId
        ? appendShopShareAttribution(
            publicShopShareUrl({
              gmfnId: ownerGmfnId,
              productId: spotlightSourceProductId,
              block: positiveNumber(miniSpotlight?.sourceProductBlock) || undefined,
            }),
            "spotlight_product_share"
          )
        : typeof window !== "undefined"
        ? window.location.href
        : "";
    const priceText = firstMeaningful(miniSpotlightView.priceLabel);
    const message = [
      isProductShare
        ? productTitle + " in " + shopTitle + "."
        : productTitle + " from " + shopTitle + ".",
      priceText ? "Price: " + priceText + "." : "",
      isProductShare
        ? "Open this product on GSN."
        : "Open this Spotlight advert on GSN.",
    ]
      .filter(Boolean)
      .join(" ");

    return {
      title: productTitle + " - " + shopTitle,
      message,
      socialMessage: message,
      socialUrl: shareUrl,
      url: shareUrl,
    };
  }

  async function toggleSpotlightProductSave() {
    const productId = spotlightSourceProductId;
    const campaignId = spotlightCampaignId;
    if (
      (!productId && !campaignId) ||
      (productId && savingProductId === productId) ||
      (!productId && campaignId && savingSpotlightCampaignId === campaignId)
    ) {
      return;
    }
    if (spotlightSelfActionsBlocked) {
      setNotice({
        tone: "error",
        text:
          signedInOwnsSpotlightSourceShop || signedInOwnsSpotlightAdvert
            ? `Advertisers cannot save their own ${spotlightPreferenceKind}.`
            : "GSN is still checking who owns this advertised product.",
      });
      return;
    }
    if (!getAccessToken()) {
      setNotice({
        tone: "error",
        text: `Sign in to save this ${spotlightPreferenceKind} privately.`,
      });
      return;
    }

    const intendedSavedState = !spotlightProductSaved;
    if (productId) {
      setSavingProductId(productId);
    } else {
      setSavingSpotlightCampaignId(campaignId);
    }
    try {
      const result = productId
        ? spotlightProductSaved
          ? await unsaveMarketplaceProduct(productId)
          : await saveMarketplaceProduct(productId)
        : spotlightProductSaved
        ? await unsaveSpotlightAdvert(campaignId)
        : await saveSpotlightAdvert(campaignId);
      const saved =
        typeof result?.saved === "boolean"
          ? result.saved
          : intendedSavedState;
      if (productId) {
        setSavedProductIds((current) => ({
          ...current,
          [String(productId)]: saved,
        }));
        void trackMarketplaceAttention(
          saved ? "product_saved" : "product_unsaved",
          {
            shop_id: spotlightSourceShopId,
            product_id: productId,
            clan_id: spotlightSourceClanId || undefined,
            broadcast_id: positiveNumber(miniSpotlight?.id) || undefined,
            source: "public_shop_spotlight_product_preference",
          },
          { allowShopFallback: false }
        );
      } else {
        setSavedSpotlightCampaignIds((current) => ({
          ...current,
          [String(campaignId)]: saved,
        }));
      }
      setNotice({
        tone: "success",
        text: saved
          ? `${spotlightPreferenceKind === "product" ? "Product" : "Advert"} saved privately.`
          : `${spotlightPreferenceKind === "product" ? "Product" : "Advert"} removed from saved items.`,
      });
    } catch {
      setNotice({
        tone: "error",
        text: `Could not update this ${spotlightPreferenceKind} preference. Please try again.`,
      });
    } finally {
      if (productId) {
        setSavingProductId(null);
      } else {
        setSavingSpotlightCampaignId(null);
      }
    }
  }

  async function toggleSpotlightProductLike() {
    const productId = spotlightSourceProductId;
    const campaignId = spotlightCampaignId;
    if (
      (!productId && !campaignId) ||
      (productId && likingProductId === productId) ||
      (!productId && campaignId && likingSpotlightCampaignId === campaignId)
    ) {
      return;
    }
    if (spotlightSelfActionsBlocked) {
      setNotice({
        tone: "error",
        text:
          signedInOwnsSpotlightSourceShop || signedInOwnsSpotlightAdvert
            ? `Advertisers cannot like their own ${spotlightPreferenceKind}.`
            : "GSN is still checking who owns this advertised product.",
      });
      return;
    }
    if (!getAccessToken()) {
      setNotice({
        tone: "error",
        text: `Sign in to like this ${spotlightPreferenceKind} privately.`,
      });
      return;
    }

    const intendedLikedState = !spotlightProductLiked;
    if (productId) {
      setLikingProductId(productId);
    } else {
      setLikingSpotlightCampaignId(campaignId);
    }
    try {
      const result = productId
        ? spotlightProductLiked
          ? await unlikeMarketplaceProduct(productId)
          : await likeMarketplaceProduct(productId)
        : spotlightProductLiked
        ? await unlikeSpotlightAdvert(campaignId)
        : await likeSpotlightAdvert(campaignId);
      const liked =
        typeof result?.liked === "boolean" ? result.liked : intendedLikedState;
      if (productId) {
        setLikedProductIds((current) => ({
          ...current,
          [String(productId)]: liked,
        }));
      } else {
        setLikedSpotlightCampaignIds((current) => ({
          ...current,
          [String(campaignId)]: liked,
        }));
      }
      setNotice({
        tone: "success",
        text: liked
          ? "Liked privately. No public count, ranking signal, or advertiser notification was created."
          : "Private Like removed.",
      });
    } catch {
      setNotice({ tone: "error", text: "Could not update this private Like. Please try again." });
    } finally {
      if (productId) {
        setLikingProductId(null);
      } else {
        setLikingSpotlightCampaignId(null);
      }
    }
  }

  function showSpotlightBusinessArea() {
    if (!spotlightCommunityLabel) return;
    setSpotlightInformationOpen(true);
    pauseSpotlightPresentationRotation();
    setNotice({
      tone: "success",
      text: `Business area: ${spotlightCommunityLabel}. This is the seller's public community area, not an exact address.`,
    });
  }
  async function contactSpotlightProductSeller() {
    pauseSpotlightPresentationRotation();
    const productId = spotlightSourceProductId;
    const shopId = spotlightSourceShopId;
    if (!productId || !shopId) return;
    if (spotlightSelfActionsBlocked) {
      setNotice({
        tone: "error",
        text: signedInOwnsSpotlightSourceShop
          ? "Shop owners cannot contact themselves about their advertised products."
          : "GSN is still checking who owns this advertised product.",
      });
      return;
    }

    void trackMarketplaceAttention(
      "contact_tap",
      {
        shop_id: shopId,
        product_id: productId,
        clan_id: spotlightSourceClanId || undefined,
        broadcast_id: positiveNumber(miniSpotlight?.id) || undefined,
        source: "public_shop_spotlight_product_contact",
      },
      { allowShopFallback: false }
    );

    if (getAccessToken()) {
      try {
        const created = await createMarketplaceProductEnquiry({
          product_id: productId,
          shop_id: shopId,
          clan_id: spotlightSourceClanId || undefined,
          note: "Is this product still available?",
          client_request_id: "spotlight-enquiry-" + productId + "-" + Date.now(),
        });
        navigate("/app/demand-box?demand_id=" + created.id + "&queue=mine");
        return;
      } catch {
      }
    }

    contactSpotlightOwnerByWhatsApp();
  }

  function openSpotlightSourceShop() {
    if (spotlightIsGsnHouse) {
      setNotice({
        tone: "error",
        text: "This GSN House advert is not attached to a GSN Shop.",
      });
      return;
    }
    const sourceOwnerId = firstMeaningful(miniSpotlight?.authorGmfnId);
    if (!sourceOwnerId) {
      setNotice({
        tone: "error",
        text: "This advert does not expose a public shop destination.",
      });
      return;
    }
    const params = new URLSearchParams();
    if (spotlightSourceProductId) {
      params.set("product_id", String(spotlightSourceProductId));
    }
    if (spotlightSourceClanId) {
      params.set("clan_id", String(spotlightSourceClanId));
    }
    params.set("gsn_source", "spotlight_commercial_action");
    navigate(`/shop/${encodeURIComponent(sourceOwnerId)}?${params.toString()}`);
  }

  function openSpotlightCommercialAction() {
    pauseSpotlightPresentationRotation();
    if (spotlightCommercialAction.kind === "contact_advertiser") {
      if (spotlightAdvertiserCallUrl && typeof window !== "undefined") {
        window.location.assign(spotlightAdvertiserCallUrl);
      }
      return;
    }
    if (spotlightCommercialAction.kind === "unavailable") {
      setNotice({
        tone: "error",
        text: "This advert has no verified Shop, product, or advertiser contact destination.",
      });
      return;
    }
    if (spotlightCommercialAction.kind === "visit_shop") {
      openSpotlightSourceShop();
      return;
    }
    if (spotlightSelfActionsBlocked) {
      setNotice({
        tone: "error",
        text: signedInOwnsSpotlightSourceShop
          ? "Shop owners cannot submit a commercial request to their own shop."
          : "GSN is still checking who owns this advertised product.",
      });
      return;
    }
    if (!getAccessToken()) {
      setNotice({
        tone: "error",
        text: `Sign in to ${spotlightCommercialAction.label.toLowerCase()}.`,
      });
      return;
    }
    setSpotlightPurchaseOpen(true);
  }

  async function submitSpotlightPurchaseIntention() {
    if (
      spotlightCommercialAction.kind !== "intent" ||
      !spotlightSourceProductId ||
      !spotlightSourceShopId ||
      spotlightPurchaseBusy
    ) {
      return;
    }
    setSpotlightPurchaseBusy(true);
    try {
      const requiresFulfilment = ["buy_now", "book_now"].includes(
        spotlightCommercialAction.intentType
      );
      const created = await createMarketplacePurchaseIntention({
        product_id: spotlightSourceProductId,
        shop_id: spotlightSourceShopId,
        clan_id: null,
        client_request_id:
          `spotlight-${spotlightCommercialAction.intentType}-` +
          `${spotlightCampaignId || positiveNumber(miniSpotlight?.id) || 0}-` +
          `${spotlightSourceProductId}`,
        intent_type: spotlightCommercialAction.intentType,
        quantity:
          spotlightCommercialAction.intentType === "notify_me"
            ? 1
            : spotlightPurchaseQuantity,
        fulfilment_method: requiresFulfilment
          ? spotlightPurchaseFulfilment
          : "on_request",
        origin_source: "spotlight",
        origin_campaign_id: spotlightCampaignId || null,
        origin_broadcast_id: positiveNumber(miniSpotlight?.id) || null,
      });
      setSpotlightPurchaseOpen(false);
      navigate(
        `/app/demand-box?demand_id=${created.id}&queue=mine&focus=conversation`
      );
    } catch (error: any) {
      setNotice({
        tone: "error",
        text:
          safeStr(error?.message) ||
          "GSN could not record this purchase intention right now.",
      });
    } finally {
      setSpotlightPurchaseBusy(false);
    }
  }

  async function toggleSpotlightShopFollow() {
    const shopId = spotlightSourceShopId;
    if (!shopId || spotlightShopFollowState.busy) return;
    if (spotlightSelfActionsBlocked) {
      setNotice({
        tone: "error",
        text: signedInOwnsSpotlightSourceShop
          ? "Shop owners cannot follow their own advertised shop."
          : "GSN is still checking who owns this advertised product.",
      });
      return;
    }
    if (!getAccessToken()) {
      setNotice({
        tone: "error",
        text: "Sign in to follow this shop.",
      });
      return;
    }

    setSpotlightShopFollowState((current) => ({ ...current, busy: true }));
    try {
      const nextFollowing = !spotlightShopFollowState.isFollowing;
      const response = nextFollowing
        ? await followMarketplaceShop(shopId)
        : await unfollowMarketplaceShop(shopId);
      setSpotlightShopFollowState((current) => ({
        ...current,
        shopId,
        isFollowing: nextFollowing,
        canFollow: true,
        followerCount: positiveNumber(
          response?.follower_count || response?.followers_count
        ),
        loading: false,
        busy: false,
      }));
      void trackMarketplaceAttention(
        "recommendation_actioned",
        {
          shop_id: shopId,
          product_id: spotlightSourceProductId || undefined,
          clan_id: spotlightSourceClanId || undefined,
          broadcast_id: positiveNumber(miniSpotlight?.id) || undefined,
          source: nextFollowing
            ? "public_shop_spotlight_follow"
            : "public_shop_spotlight_unfollow",
        },
        { allowShopFallback: false }
      );
    } catch {
      setSpotlightShopFollowState((current) => ({
        ...current,
        busy: false,
      }));
      setNotice({
        tone: "error",
        text: "GSN could not update this shop follow right now.",
      });
    }
  }

  function openSpotlightSimilarProducts() {
    const productTitle = firstMeaningful(miniSpotlight?.sourceProductTitle);
    if (!productTitle) return;
    pauseSpotlightPresentationRotation();
    void trackMarketplaceAttention(
      "recommendation_actioned",
      {
        shop_id: spotlightSourceShopId,
        product_id: spotlightSourceProductId || undefined,
        clan_id: spotlightSourceClanId || undefined,
        broadcast_id: positiveNumber(miniSpotlight?.id) || undefined,
        source: "public_shop_spotlight_similar_products",
      },
      { allowShopFallback: false }
    );
    const returnTo =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/app/marketplace";
    navigate(
      "/discover?q=" +
        encodeURIComponent(productTitle) +
        "&source=similar-products&product_id=" +
        encodeURIComponent(String(spotlightSourceProductId || "")) +
        "&return_to=" +
        encodeURIComponent(returnTo)
    );
  }

  function contactSpotlightOwnerByWhatsApp() {
    pauseSpotlightPresentationRotation();
    if (spotlightSelfActionsBlocked) {
      setNotice({
        tone: "error",
        text: signedInOwnsSpotlightSourceShop
          ? "Shop owners cannot contact themselves about their advertised products."
          : "GSN is still checking who owns this advertised product.",
      });
      return;
    }
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

  function renderShopShareButton() {
    return (
      <SocialTagShareButton
        target={{
          title: "Open Shop",
          message: "",
          socialMessage: "",
          socialUrl: attributedShopSocialLink,
          url: attributedShopShareLink || absoluteShopShareLink,
        }}
        nativeFileShare={publicShopNativeFileShare}
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
          padding: isCompact ? "5px 8px" : "10px 12px",
          gap: isCompact ? 5 : 8,
          color: "#07172C",
          background:
            "linear-gradient(180deg, #FFFFFF 0%, #F4F8FF 54%, #E8F0FA 100%)",
          border: "1px solid rgba(214,170,69,0.58)",
          boxShadow:
            "0 10px 0 rgba(4,25,45,0.10), 0 15px 26px rgba(23,103,211,0.16), inset 0 2px 0 rgba(255,255,255,0.98), inset 0 -2px 5px rgba(84,118,153,0.14)",
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
    );
  }

  function renderShopDiaryShortcut(compact = false) {
    return (
      <ExistingWorkflowPlusLink
        to={ownerShopDiaryPath}
        label="Add Shop Update or voice note"
        debugId="shop-gallery.diary.owner-shortcut"
        shortcut="shop-diary"
        style={compact ? {
          width: 42,
          height: 42,
          minWidth: 42,
          minHeight: 42,
          maxWidth: 42,
          maxHeight: 42,
          borderRadius: 10,
          padding: 0,
          border: "none",
          outline: "none",
          background: "transparent",
          boxShadow: "none",
        } : undefined}
      />
    );
  }

  return (
    <main
      className="public-shop-shell theme-public-shop public-shop-neon-environment"
      data-public-shop-neon-environment="approved-soft"
    >
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

        {showMarketplaceReturn ? (
          <StableCtaLink
            to={marketplaceMemberShopsPath}
            fullWidth
            stableHeight={isCompact ? 40 : 50}
            debugId="shop-gallery.return-marketplace"
            aria-label="Back to Marketplace member shops"
            style={{
              ...secondaryBtn(false),
              order: -1,
              minHeight: isCompact ? 40 : 50,
              borderRadius: isCompact ? 13 : 18,
              fontSize: isCompact ? 11.5 : 14,
              padding: isCompact ? "5px 9px" : "9px 14px",
              color: "#07172C",
              border: "1px solid rgba(214,170,69,0.34)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,250,255,0.96) 100%)",
              boxShadow:
                "0 8px 18px rgba(8,38,67,0.08), inset 0 1px 0 rgba(255,255,255,0.94)",
              gap: isCompact ? 6 : 8,
            }}
          >
            {inlineShopIcon("navigation", "#8C6829", isCompact ? 12 : 15)}
            <span>Back to Marketplace</span>
          </StableCtaLink>
        ) : null}

        <section
          className="public-shop-signboard"
          style={{
            position: "relative",
            overflow: "visible",
            borderRadius: 0,
            padding: 0,
            border: 0,
            outline: "none",
            background: "transparent",
            boxShadow: "none",
          }}
        >
          <PublicShopPhotoHero
            source={shopHeroSource}
            compact={isCompact}
            shopName={shopNameText}
            category={shopCategoryText}
            description={showShopHeroDescription ? shopDescriptionText : undefined}
            gmfnId={shopGmfnText}
            communityName={shopCommunityText}
            ownerAction={
              signedInOwnsShop ? (
                <StableCtaLink
                  to={ownerShopEditPath}
                  stableHeight={isCompact ? 36 : 42}
                  debugId="shop-gallery.owner.edit-shop"
                  style={{
                    minHeight: isCompact ? 36 : 42,
                    flex: isCompact ? "0 0 auto" : undefined,
                    padding: isCompact ? "6px" : "9px 14px",
                    borderRadius: 999,
                    color: "#FFFFFF",
                    background: "rgba(3,20,36,0.34)",
                    border: "1px solid rgba(246,215,122,0.38)",
                    boxShadow: "0 7px 16px rgba(0,0,0,0.14)",
                    fontSize: isCompact ? 9.5 : 13,
                    fontWeight: 900,
                    gap: isCompact ? 4 : 8,
                  }}
                >
                  {inlineShopIcon("pen", "#F6D77A", isCompact ? 12 : 16)}
                  <span>Edit shop</span>
                </StableCtaLink>
              ) : null
            }
            onImageError={(imageUrl) => {
              setBrokenShopHeroMediaUrls((current) => ({
                ...current,
                [imageUrl]: true,
              }));
            }}
          />
          <div
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr)",
              alignItems: "center",
              justifyItems: "stretch",
              gap: isCompact ? 7 : 10,
              minHeight: isCompact ? 0 : undefined,
              marginTop: isCompact ? 7 : 10,
            }}
          >
            <div
              data-public-shop-signboard-content="true"
              style={{
                display: "grid",
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
                  display: "none",
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
                  display: "none",
                  gridColumn: "1",
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
                className="public-shop-options-panel"
                data-public-shop-options="secondary"
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? shopOptionsOwner
                      ? "repeat(2, minmax(0, 1fr))"
                      : "minmax(0, 1fr)"
                    : shopOptionsOwner
                    ? "repeat(3, minmax(0, 1fr))"
                    : "minmax(0, 1fr) auto",
                  gridColumn: "1 / -1",
                  gap: isCompact ? 8 : 12,
                  alignItems: "center",
                  minHeight: isCompact ? 30 : 54,
                  order: 2,
                  padding: isCompact ? 6 : 9,
                  borderRadius: isCompact ? 17 : 22,
                  border: "1px solid rgba(83,177,255,0.72)",
                  background:
                    "radial-gradient(circle at 88% 0%, rgba(146,76,255,0.22) 0%, transparent 34%), linear-gradient(145deg, rgba(5,27,52,0.98) 0%, rgba(8,46,79,0.98) 68%, rgba(24,31,80,0.98) 100%)",
                  boxShadow:
                    "0 14px 30px rgba(2,12,27,0.22), 0 0 0 1px rgba(146,76,255,0.18), inset 0 1px 0 rgba(255,255,255,0.12)",
                }}
                open={shopOptionsOpen}
                onToggle={(event) => {
                  setShopOptionsOpen(event.currentTarget.open);
                }}
                aria-label="Shop options and follow controls"
              >
                <StableDisclosureSummary
                  className="public-shop-options-summary"
                  debugId="shop-gallery.options.toggle"
                  stableHeight={isCompact ? 44 : 50}
                  style={{
                    display: "flex",
                    gridColumn: "1 / -1",
                    minHeight: isCompact ? 44 : 50,
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: isCompact ? "7px 11px" : "9px 14px",
                    borderRadius: isCompact ? 13 : 16,
                    border: "1px solid rgba(246,215,122,0.62)",
                    background:
                      "linear-gradient(180deg, #153E68 0%, #092B4A 48%, #061C33 100%)",
                    color: "#FFFFFF",
                    cursor: "pointer",
                    fontSize: isCompact ? 12.5 : 15,
                    fontWeight: 950,
                    listStyle: "none",
                    textShadow: "0 2px 4px rgba(0,0,0,0.28)",
                    boxShadow:
                      "0 7px 0 rgba(1,13,27,0.58), 0 12px 24px rgba(45,132,255,0.24), inset 0 2px 0 rgba(255,255,255,0.22), inset 0 -2px 5px rgba(0,0,0,0.26)",
                  }}
                >
                  <span>{shopOptionsOwner ? "Shop options" : "Follow shop"}</span>
                  <span className="public-shop-options-chevron" aria-hidden="true">
                    {shopOptionsOpen ? "-" : "+"}
                  </span>
                </StableDisclosureSummary>
                <div
                  className="public-shop-follower-pill"
                  style={{
                    minHeight: isCompact ? 44 : 48,
                    width: "100%",
                    maxWidth: "100%",
                    justifySelf: "start",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: shopOptionsOwner ? "center" : "flex-start",
                    gap: isCompact ? 5 : 8,
                    padding: isCompact ? "7px 10px" : "9px 14px",
                    borderRadius: isCompact ? 14 : 17,
                    border: "1px solid rgba(214,170,69,0.62)",
                    background:
                      "linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 48%, #E5EDF7 100%)",
                    color: "#07172C",
                    fontSize: isCompact ? 10.5 : 13,
                    fontWeight: 950,
                    boxShadow:
                      "0 7px 0 rgba(1,13,27,0.32), 0 12px 24px rgba(40,129,255,0.17), inset 0 2px 0 rgba(255,255,255,0.98), inset 0 -2px 5px rgba(73,103,135,0.16)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {inlineShopIcon("shop", "#8C6829", isCompact ? 11 : 15)}
                  <span>{shopFollowerText}</span>
                </div>
                {!shopOptionsOwner ? (
                  <div
                    className="public-shop-follow-actions"
                    role="group"
                    aria-label="Shop follow controls"
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
              {shopOptionsOwner ? (
                <StableCtaLink
                  className="public-shop-analytics-button"
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
                    fontSize: isCompact ? 10.8 : 13,
                    fontWeight: 900,
                    gap: isCompact ? 6 : 8,
                    minWidth: 0,
                    minHeight: isCompact ? 44 : 46,
                    padding: isCompact ? "5px 8px" : undefined,
                    justifyContent: isCompact ? "center" : "flex-start",
                    whiteSpace: "normal",
                    textOverflow: "clip",
                    boxShadow:
                      "0 7px 0 rgba(1,13,27,0.68), 0 14px 25px rgba(38,123,255,0.24), inset 0 2px 0 rgba(255,255,255,0.18), inset 0 -2px 5px rgba(0,0,0,0.28)",
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
                className="public-shop-identity-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gridColumn: "1 / -1",
                  gap: 0,
                  order: 1,
                  borderRadius: isCompact ? 17 : 22,
                  border: "1px solid rgba(102,187,255,0.72)",
                  background:
                    "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 50%, #E8EFF8 100%)",
                  overflow: "hidden",
                  boxShadow:
                    "0 8px 0 rgba(1,13,27,0.16), 0 16px 30px rgba(45,132,255,0.20), 0 0 0 1px rgba(145,76,255,0.18), inset 0 2px 0 rgba(255,255,255,0.98), inset 0 -3px 7px rgba(66,98,132,0.16)",
                  marginTop: isCompact ? 0 : 0,
                }}
              >
                {[
                  { icon: "id" as ShopIconName, label: "GSN ID", value: shopGmfnText || "Not ready" },
                  { icon: "community" as ShopIconName, label: "Homeland", value: shopLocationText },
                ].map((row, rowIndex) => (
                  <div
                    className="public-shop-identity-card"
                    key={row.label}
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "24px minmax(0, 1fr)"
                        : "34px minmax(0, 1fr)",
                      gap: isCompact ? 8 : 10,
                      alignItems: "center",
                      minWidth: 0,
                      padding: isCompact ? "10px 11px" : "13px 15px",
                      borderTop: "none",
                      borderLeft:
                        rowIndex > 0
                          ? "1px solid rgba(84,165,242,0.34)"
                          : "none",
                    }}
                  >
                    <span
                      className="public-shop-identity-icon"
                      aria-hidden="true"
                      style={{
                        display: "grid",
                        placeItems: "center",
                        width: isCompact ? 32 : 40,
                        height: isCompact ? 32 : 40,
                        borderRadius: isCompact ? 11 : 14,
                        border: "1px solid rgba(214,170,69,0.62)",
                        background:
                          "linear-gradient(145deg, #FFF9E6 0%, #F1CF70 48%, #C88D2D 100%)",
                        color: "#8C6829",
                        boxShadow:
                          "0 5px 0 rgba(121,78,16,0.34), 0 9px 17px rgba(8,38,67,0.18), inset 0 2px 0 rgba(255,255,255,0.88), inset 0 -2px 4px rgba(98,56,6,0.18)",
                      }}
                    >
                      <GsnRealisticIcon
                        name={shop3DIconName(row.icon)}
                        size={isCompact ? 29 : 37}
                        decorative
                      />
                    </span>
                    <div
                      style={{
                        display: "grid",
                        gap: isCompact ? 3 : 5,
                        alignItems: "start",
                        minWidth: 0,
                        color: "#29394A",
                        fontSize: isCompact ? 12 : 13.5,
                        fontWeight: 760,
                        lineHeight: isCompact ? 1.18 : 1.22,
                      }}
                      title={row.value}
                    >
                      <span style={{ color: "#66798E", fontWeight: 900 }}>
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
                          fontSize: isCompact ? 13.2 : 15,
                          lineHeight: 1.14,
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
                    display: "none",
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
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              alignItems: "stretch",
              gap: isCompact ? 5 : 10,
              marginTop: isCompact ? 8 : 18,
            }}
            aria-label="Public shop actions"
          >
            {renderShopShareButton()}
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
                  "linear-gradient(180deg, #FFFFFF 0%, #F4F8FF 54%, #E8F0FA 100%)",
                boxShadow:
                  "0 10px 0 rgba(4,25,45,0.10), 0 15px 26px rgba(23,103,211,0.16), inset 0 2px 0 rgba(255,255,255,0.98), inset 0 -2px 5px rgba(84,118,153,0.14)",
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
                  "0 10px 0 rgba(4,72,35,0.28), 0 15px 27px rgba(18,140,74,0.26), inset 0 2px 0 rgba(255,255,255,0.42), inset 0 -2px 5px rgba(0,69,31,0.28)",
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
            { icon: "tag" as ShopIconName, title: "Private Vault", detail: "Private item link" },
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

        {!focusedBlockLinkActive &&
        (hiddenShelfEntryCount > 0 ||
          showAllProducts ||
          ((isCompact || spotlightInformationAvailable) &&
            routeDiaryEntryId <= 0)) ? (
          <div
            className="public-shop-compact-reveal-row"
            data-public-shop-reveal-controls="true"
            style={{
              order: routeDiaryEntryId > 0 ? 3 : 2,
              position: "relative",
              zIndex: 20,
              display: "grid",
              gridTemplateColumns:
                (hiddenShelfEntryCount > 0 || showAllProducts) &&
                ((isCompact || spotlightInformationAvailable) &&
                  routeDiaryEntryId <= 0)
                  ? "repeat(2, minmax(0, 1fr))"
                  : "minmax(0, 1fr)",
              gap: isCompact ? 7 : 10,
              alignItems: "stretch",
            }}
          >
            {hiddenShelfEntryCount > 0 || showAllProducts ? (
              <SecondaryButton
                onClick={() => setShowAllProducts((current) => !current)}
                minWidth={0}
                fullWidth
                stableHeight={
                  spotlightInformationAvailable ? 54 : isCompact ? 46 : 48
                }
                debugId="shop-gallery.toggle-all-products"
                data-public-shop-neon-action="true"
                style={{
                  ...secondaryBtn(false),
                  minHeight: spotlightInformationAvailable
                    ? 54
                    : isCompact
                    ? 46
                    : 48,
                  borderRadius: isCompact ? 14 : 16,
                  padding: isCompact ? "5px 7px" : "8px 12px",
                  fontSize: isCompact ? 11.2 : 13.5,
                }}
              >
                {showAllProducts ? "Show less" : `Show ${hiddenShelfEntryCount} more`}
              </SecondaryButton>
            ) : null}
            {(isCompact || spotlightInformationAvailable) &&
            routeDiaryEntryId <= 0 ? (
              <SecondaryButton
                onClick={() => {
                  if (spotlightInformationAvailable) {
                    setShopMoreOpen(true);
                    setSpotlightInformationOpen((current) => !current);
                    pauseSpotlightPresentationRotation();
                    return;
                  }
                  setShopMoreOpen((current) => !current);
                }}
                minWidth={0}
                fullWidth
                stableHeight={spotlightInformationAvailable ? 54 : 46}
                debugId="shop-gallery.more.compact-toggle"
                data-public-shop-neon-action="true"
                data-spotlight-information-disclosure={
                  spotlightInformationAvailable ? "true" : undefined
                }
                aria-expanded={
                  spotlightInformationAvailable
                    ? spotlightInformationOpen
                    : publicShopMoreDisclosureOpen
                }
                aria-controls={
                  spotlightInformationAvailable
                    ? "public-shop-spotlight-information-details"
                    : "public-shop-more-panel"
                }
                style={{
                  ...secondaryBtn(false),
                  minHeight: spotlightInformationAvailable ? 54 : 46,
                  borderRadius: 14,
                  padding: "5px 8px",
                  fontSize: 11.2,
                  justifyContent: "space-between",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    display: "grid",
                    minWidth: 0,
                    gap: 1,
                    textAlign: "left",
                  }}
                >
                  <span>{publicShopMoreLabel}</span>
                  {spotlightInformationAvailable ? (
                    <small
                      data-spotlight-information-title="true"
                      style={{
                        minWidth: 0,
                        overflow: "hidden",
                        color: "#50647A",
                        fontSize: 10.5,
                        fontWeight: 780,
                        lineHeight: 1.15,
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {spotlightInformationTitle}
                    </small>
                  ) : null}
                </span>
                <span aria-hidden="true">
                  {spotlightInformationAvailable
                    ? spotlightInformationOpen
                      ? "\u25B4"
                      : "\u25BE"
                    : publicShopMoreDisclosureOpen
                    ? "-"
                    : "+"}
                </span>
              </SecondaryButton>
            ) : null}
            {spotlightInformationAvailable &&
            spotlightInformationOpen &&
            routeDiaryEntryId <= 0 ? (
              <div
                id="public-shop-spotlight-information-details"
                className="public-shop-spotlight-information-popover"
                data-spotlight-information-overlay="true"
                data-spotlight-information-popover="true"
                data-spotlight-information-details="true"
                role="region"
                aria-label={`${spotlightInformationTitle} details`}
                aria-live="polite"
              >
                {spotlightAdvertiserLabel || spotlightCommunityLabel ? (
                  <span data-spotlight-source-line="true">
                    {spotlightAdvertiserLabel || "GSN Spotlight"}
                    {spotlightCommunityLabel
                      ? ` \u00B7 ${spotlightCommunityLabel}`
                      : ""}
                  </span>
                ) : null}
                {spotlightInformationDetail ? (
                  <div data-spotlight-information-detail="true">
                    {spotlightInformationDetail}
                  </div>
                ) : null}
                {spotlightFeedError ? (
                  <div data-spotlight-feed-error="true">
                    {spotlightFeedError}
                  </div>
                ) : null}
                {spotlightMediaStatusByKey[spotlightMediaKey]?.status ===
                  "unavailable" && spotlightMediaKey ? (
                  <div data-spotlight-media-status="unavailable">
                    Media could not be shown. GSN will not count this showing and
                    will retry automatically.
                  </div>
                ) : null}
                {publicShopSpotlightActive && spotlightFactLabels.length > 0 ? (
                  <div data-spotlight-fact-line="true">
                    {spotlightFactLabels.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                ) : null}
                {spotlightProductLinked ? (
                  <div data-spotlight-protected-sales-path="true">
                    Request to buy records a private purchase intention. Payment and
                    availability are not confirmed until the parties agree;
                    eligible transactions continue through the existing Protected Sales workflow.
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <details
          id="public-shop-more-panel"
          ref={spotlightPresentationGateRef}
          data-public-shop-more="secondary"
          data-public-shop-live-spotlight={publicShopSpotlightActive ? "true" : "false"}
          data-public-shop-exact-update={routeDiaryEntryId > 0 ? "true" : "false"}
          open={publicShopMoreDisclosureOpen}
          onToggle={(event) => {
            if (!isCompact || publicShopMoreHashOpen) return;
            setShopMoreOpen(event.currentTarget.open);
          }}
          style={{
            order: routeDiaryEntryId > 0 ? 1 : 3,
            display: focusedBlockLinkActive ? "none" : "block",
          }}
        >
          <StableDisclosureSummary
            debugId="shop-gallery.more.toggle"
            stableHeight={50}
            style={{
              display: isCompact && routeDiaryEntryId > 0 ? "flex" : "none",
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
            <span>{publicShopMoreLabel}</span>
            <span aria-hidden="true">
              {publicShopMoreDisclosureOpen ? "-" : "+"}
            </span>
          </StableDisclosureSummary>
          <div style={{ display: "grid", gap: isCompact ? 10 : 14, marginTop: 0 }}>
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
            data-spotlight-campaign-id={
              miniSpotlight?.opportunityCampaignId || undefined
            }
            data-spotlight-presentation-type={spotlightPresentationType}
            data-spotlight-media-kind={spotlightEffectiveMediaKind}
            data-spotlight-dwell-ms={
              activeSpotlightMediaStatus?.status === 'ready'
                ? spotlightRotationDelayMs
                : undefined
            }
            data-spotlight-next-media-status={
              nextSpotlightMediaKey
                ? spotlightMediaStatusByKey[nextSpotlightMediaKey]?.status || 'pending'
                : 'none'
            }
            data-spotlight-queue-size={communitySpotlights.length}
            data-owner-spotlight-inspection={
              ownerSpotlightStatusView?.state || "visitor"
            }
            data-spotlight-layout="unified-spotlight-stage"
            data-spotlight-transition={spotlightTransition?.phase || "settled"}
            data-spotlight-immersive={spotlightImmersiveOpen ? "true" : "false"}
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
              position: spotlightImmersiveOpen ? "fixed" : "relative",
              inset: spotlightImmersiveOpen ? 0 : undefined,
              zIndex: spotlightImmersiveOpen ? 10000 : undefined,
              width: spotlightImmersiveOpen ? "100dvw" : undefined,
              height: spotlightImmersiveOpen ? "100dvh" : undefined,
              overflow: "hidden",
              scrollMarginTop: isCompact ? 96 : 88,
              borderRadius: spotlightImmersiveOpen ? 0 : isCompact ? 0 : 22,
              padding: 0,
              minHeight: 0,
              border: 0,
              background: spotlightImmersiveOpen ? "#020C1B" : "transparent",
              boxShadow: "none",
            }}
          >
            <div
              className="public-shop-spotlight-stage"
              style={{
                position: "relative",
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr)",
                gridTemplateRows: "minmax(0, 1fr) auto",
                height: spotlightImmersiveOpen ? "100%" : undefined,
                gap: 0,
                alignItems: "stretch",
                minHeight: 0,
                padding: 0,
              }}
            >
              <div
                data-spotlight-information-shell="true"
                style={{
                  display: "contents",
                }}
              >
                <div
                  className="public-shop-spotlight-action-row"
                  data-spotlight-action-row="true"
                  data-spotlight-action-count={
                    miniSpotlight
                      ? spotlightSelfActionsBlocked
                        ? 1 + Number(signedInOwnsShop)
                        : 1 + Number(Boolean(spotlightSourceShopId)) + Number(signedInOwnsShop)
                      : Number(signedInOwnsShop)
                  }
                  style={{
                    width: "100%",
                    maxWidth: "100%",
                    display: miniSpotlight || signedInOwnsShop ? "grid" : "none",
                    gridTemplateColumns: !miniSpotlight
                      ? "48px"
                      : spotlightSelfActionsBlocked
                      ? signedInOwnsShop
                        ? "minmax(0, 1fr) 48px"
                        : "minmax(0, 1fr)"
                      : signedInOwnsShop
                        ? (spotlightSourceShopId ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)") + " 48px"
                        : spotlightSourceShopId
                      ? "repeat(2, minmax(0, 1fr))"
                      : "minmax(0, 1fr)",
                    justifyContent: "stretch",
                    alignItems: "center",
                    gap: isCompact ? 7 : 10,
                    minHeight: isCompact ? 58 : 68,
                    padding: isCompact ? "6px 8px 7px" : "8px 12px 10px",
                    color: "#FFFFFF",
                    fontSize: isCompact ? 11 : 13,
                    fontWeight: 950,
                    textTransform: "none",
                    letterSpacing: 0,
                    gridColumn: "1",
                    gridRow: "2",
                  }}
                >
                  {miniSpotlight ? (spotlightSelfActionsBlocked ? (
                    <>
                      <SocialTagShareButton
                        target={buildSpotlightProductShareTarget()}
                        buttonLabel="Share"
                        ariaLabel={`Share this ${spotlightPreferenceKind}`}
                        triggerIcon={<span aria-hidden="true">{"\u2197"}</span>}
                        minWidth={0}
                        stableHeight={isCompact ? 44 : 48}
                        debugId="shop-gallery.spotlight.owner-share"
                        onBeforeOpen={() => {
                          pauseSpotlightPresentationRotation();
                          return true;
                        }}
                        onResult={(tone, text, channel) => {
                          if (tone === "success") {
                            void trackMarketplaceAttention(
                              "share_action",
                              {
                                shop_id: spotlightSourceShopId,
                                product_id:
                                  spotlightSourceProductId || undefined,
                                clan_id: spotlightSourceClanId || undefined,
                                broadcast_id:
                                  positiveNumber(miniSpotlight?.id) || undefined,
                                source:
                                  `public_shop_spotlight_owner_share_` +
                                  firstMeaningful(channel, "share"),
                              },
                              { allowShopFallback: false }
                            );
                          }
                          setNotice({ tone, text });
                        }}
                        style={{
                          ...secondaryBtn(false),
                          width: "100%",
                          minHeight: isCompact ? 44 : 48,
                          borderRadius: 999,
                          fontSize: isCompact ? 12 : 14,
                        }}
                      />
                    </>
                  ) : (
                    <>
                      {spotlightSourceShopId ? (
                        <SecondaryButton
                          onClick={() => void toggleSpotlightShopFollow()}
                          disabled={
                            spotlightShopFollowState.loading ||
                            spotlightShopFollowState.busy
                          }
                          minWidth={0}
                          stableHeight={isCompact ? 44 : 48}
                          debugId="shop-gallery.spotlight.primary-follow"
                          data-spotlight-primary-action="follow-shop"
                          style={{
                            ...secondaryBtn(false),
                            width: "100%",
                            minHeight: isCompact ? 44 : 48,
                            borderRadius: 999,
                            padding: isCompact ? "7px 8px" : "9px 14px",
                            fontSize: isCompact ? 11.5 : 14,
                          }}
                        >
                          {spotlightShopFollowState.isFollowing
                            ? "Following"
                            : "Follow shop"}
                        </SecondaryButton>
                      ) : null}
                    <PrimaryButton
                      onClick={openSpotlightCommercialAction}
                      disabled={spotlightCommercialAction.kind === "unavailable"}
                      minWidth={0}
                      fullWidth={false}
                      stableHeight={isCompact ? 44 : 48}
                      debugId="shop-gallery.spotlight.primary-commercial-action"
                      data-public-shop-neon-action="true"
                      data-spotlight-primary-action={
                        spotlightCommercialAction.kind === "intent"
                          ? spotlightCommercialAction.intentType
                          : spotlightCommercialAction.kind
                      }
                      style={{
                        ...primaryBtn(false),
                        justifySelf: "stretch",
                        borderRadius: 999,
                        minHeight: isCompact ? 44 : 48,
                        width: "100%",
                        maxWidth: "100%",
                        padding: isCompact ? "7px 8px" : "9px 14px",
                        fontSize: isCompact ? 11.5 : 14,
                        whiteSpace: "nowrap",
                        background: "linear-gradient(180deg, #1676E8 0%, #0757BC 100%)",
                        border: "1px solid rgba(85,232,255,0.48)",
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
                        {inlineShopIcon(
                          spotlightCommercialAction.kind === "contact_advertiser"
                            ? "phone"
                            : "cart",
                          "#FFFFFF",
                          isCompact ? 11 : 15
                        )}
                        {spotlightCommercialAction.label}
                      </span>
                    </PrimaryButton>
                    </>
                  )) : null}
                  {signedInOwnsShop ? (
                    <ExistingWorkflowPlusLink
                      to={ownerSpotlightShortcutPath}
                      label="Add Spotlight"
                      debugId="shop-gallery.spotlight.owner-shortcut"
                      shortcut="spotlight"
                      data-public-shop-neon-action="true"
                      data-spotlight-shortcut-mode={ownerSpotlightShortcutMode}
                      style={{ gridColumn: "-2 / -1", justifySelf: "center" }}
                    />
                  ) : null}
                </div>
              </div>
              <div
                className="public-shop-spotlight-screen"
                data-spotlight-screen="true"
                style={{
                  minHeight: spotlightScreenHeight,
                  height: spotlightScreenHeight,
                  borderRadius: 0,
                  overflow: "hidden",
                  position: "relative",
                  gridColumn: "1",
                  gridRow: "1",
                  zIndex: 1,
                  background: "#020C1B",
                  border: 0,
                  boxShadow: "none",
                }}
              >
                {isCompact ? (
                  <div
                    className="public-shop-product-update-ticker"
                    data-public-shop-product-update-ticker="true"
                    role="note"
                    aria-label={`Shop Update: ${productsServicesUpdateText}${publicShopTickerVoice ? ". Voice note available." : ""}`}
                  >
                    <span className="public-shop-product-update-label">
                      {signedInOwnsShop
                        ? renderShopDiaryShortcut(true)
                        : <span aria-hidden="true">{inlineShopIcon("cart", "#8C6829", 12)}</span>}
                      <span className="public-shop-product-update-label-copy">
                        <strong>P&amp;S Update</strong>
                        {shopUpdateContextText ? <small>{shopUpdateContextText}</small> : null}
                      </span>
                    </span>
                    <span
                      className="public-shop-product-update-viewport"
                      aria-hidden="true"
                    >
                      <span className="public-shop-product-update-track">
                        <span className="public-shop-product-update-message">
                          {productsServicesUpdateText}
                          <span className="public-shop-product-update-separator">•</span>
                        </span>
                        <span className="public-shop-product-update-message">
                          {productsServicesUpdateText}
                          <span className="public-shop-product-update-separator">•</span>
                        </span>
                      </span>
                    </span>
                    {publicShopTickerVoice ? (
                      <ShopVoiceNotePlayer
                        attachmentId={publicShopTickerVoice.attachmentId}
                        durationSeconds={publicShopTickerVoice.durationSeconds}
                        deletedAt={publicShopTickerVoice.deletedAt}
                        speakerName={publicShopTickerVoice.speakerName}
                        speakerGmfnId={publicShopTickerVoice.speakerGmfnId}
                        shopName={shopNameText}
                        publicAccess
                        compactInline
                        debugId="shop-gallery.welcome-voice.listen"
                        label={publicShopTickerVoice.label}
                      />
                    ) : null}
                  </div>
                ) : null}
                {miniSpotlightView.imageUrl || miniSpotlightView.videoUrl ? (
                  <>
                  <SpotlightMediaFrame
                    // Keep one active media element across rotations. Mobile
                    // Safari associates the viewer's sound gesture with the
                    // element; promoting a different preloaded <video> can
                    // lose that permission even though the shared preference
                    // still says sound is on.
                    key='public-shop-spotlight-active-media'
                    imageUrl={miniSpotlightView.imageUrl}
                    imageLoading="eager"
                    imageFetchPriority="high"
                    imageSizes="(max-width: 720px) 100vw, 720px"
                    preserveNaturalColor={true}
                    videoUrl={miniSpotlightView.videoUrl}
                    videoPoster={miniSpotlightView.imageUrl}
                    occurrenceId={spotlightRotationActiveKey}
                    alt={miniSpotlightView.title}
                    onMediaReady={(details) => {
                      if (details.occurrenceId !== spotlightRotationActiveKey) return;
                      const status: SpotlightMediaStatus = {
                        status: 'ready',
                        kind: details.kind,
                        durationSeconds: details.durationSeconds,
                        fallbackFromVideo: Boolean(details.fallbackFromVideo),
                      };
                      reportSpotlightMediaStatus(spotlightMediaKey, status);
                      reportSpotlightActiveMediaStatus(
                        spotlightRotationActiveKey,
                        status
                      );
                      completeSpotlightMediaHandoff(
                        spotlightRotationActiveKey,
                        spotlightMediaKey
                      );
                    }}
                    onMediaUnavailable={(details) => {
                      if (details.occurrenceId !== spotlightRotationActiveKey) return;
                      const status: SpotlightMediaStatus = {
                        status: 'unavailable',
                      };
                      reportSpotlightMediaStatus(spotlightMediaKey, status);
                      reportSpotlightActiveMediaStatus(
                        spotlightRotationActiveKey,
                        status
                      );
                      if (
                        spotlightTransitionRef.current &&
                        ['handoff', 'neutral'].includes(
                          spotlightTransitionRef.current.phase
                        ) &&
                        spotlightTransitionRef.current.targetMediaKey ===
                          spotlightMediaKey
                      ) {
                        spotlightTransitionRef.current = null;
                        setSpotlightTransition(null);
                      }
                    }}
                    fallback={
                      <div
                        data-spotlight-media-unavailable='true'
                        style={{
                          width: '100%',
                          height: '100%',
                          minHeight: spotlightScreenHeight,
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
                    showPlaybackControl={Boolean(miniSpotlightView.videoUrl)}
                    monitorPlayback={Boolean(miniSpotlightView.videoUrl)}
                    presentationDurationMs={spotlightRotationDelayMs}
                    onPlaybackStateChange={(details) =>
                      reportSpotlightPlaybackStatus(
                        spotlightRotationActiveKey,
                        details
                      )
                    }
                    autoPlayVideo={
                      Boolean(miniSpotlightView.videoUrl) && !spotlightReducedMotion
                    }
                    mutedVideo={Boolean(miniSpotlightView.videoUrl)}
                    loopVideo={
                      Boolean(miniSpotlightView.videoUrl) && !spotlightReducedMotion
                    }
                    preloadVideo='auto'
                    showAudioUnlock={Boolean(miniSpotlightView.videoUrl)}
                    audioEnabled={spotlightSoundEnabled}
                    onAudioEnabledChange={setSpotlightSoundEnabled}
                    preserveVideoElement={true}
                    showFallbackNotice={spotlightTransition?.phase !== 'neutral'}
                    audioUnlockLabel="Sound on"
                    audioUnlockOffLabel="Muted"
                    audioUnlockErrorLabel="Play"
                    audioUnlockStyle={{
                      top: isCompact ? 62 : "auto",
                      right: isCompact ? 10 : 10,
                      bottom: isCompact ? "auto" : 10,
                      minWidth: isCompact ? 44 : 46,
                      width: isCompact ? 44 : 46,
                      height: isCompact ? 44 : 46,
                      minHeight: isCompact ? 44 : 46,
                      maxHeight: isCompact ? 44 : 46,
                      padding: 0,
                      border: 0,
                      background: "transparent",
                      color: "#F8FBFF",
                      fontSize: isCompact ? 13 : 16,
                      boxShadow: "none",
                      overflow: "visible",
                    }}
                    playbackControlStyle={{
                      top: isCompact ? 108 : 'auto',
                      right: isCompact ? 10 : 56,
                      bottom: isCompact ? 'auto' : 10,
                      width: isCompact ? 44 : 46,
                      minWidth: isCompact ? 44 : 46,
                      height: isCompact ? 44 : 46,
                      minHeight: isCompact ? 44 : 46,
                      maxHeight: isCompact ? 44 : 46,
                      border: 0,
                      background: 'transparent',
                      color: '#F8FBFF',
                      boxShadow: 'none',
                      overflow: 'visible',
                    }}
                    maxVideoSeconds={SPOTLIGHT_PREMIUM_MAX_VIDEO_SECONDS}
                    frameStyle={{
                      width: "100%",
                      height: spotlightScreenHeight,
                      minHeight: spotlightScreenHeight,
                      borderRadius: 0,
                      position: 'relative',
                      zIndex: 1,
                    }}
                    mediaStyle={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      objectPosition: "center",
                    }}
                  />
                  {spotlightPreloadItem &&
                  spotlightPreloadMediaKey &&
                  (spotlightPreloadIsHandoff ||
                    spotlightPreloadMediaKey !== spotlightMediaKey) &&
                  (spotlightPreloadView.imageUrl ||
                    spotlightPreloadView.videoUrl) ? (
                    <SpotlightMediaFrame
                      key={`public-shop-spotlight-preload-${spotlightPreloadMediaKey}`}
                      imageUrl={spotlightPreloadView.imageUrl}
                      imageLoading="eager"
                      imageFetchPriority="low"
                      imageSizes="(max-width: 720px) 100vw, 720px"
                      preserveNaturalColor={true}
                      videoUrl={spotlightPreloadView.videoUrl}
                      videoPoster={spotlightPreloadView.imageUrl}
                      alt=''
                      onMediaReady={(details) =>
                        reportSpotlightMediaStatus(spotlightPreloadMediaKey, {
                          status: 'ready',
                          kind: details.kind,
                          durationSeconds: details.durationSeconds,
                          fallbackFromVideo: Boolean(
                            details.fallbackFromVideo
                          ),
                        })
                      }
                      onMediaUnavailable={() =>
                        reportSpotlightMediaStatus(
                          spotlightPreloadMediaKey,
                          { status: 'unavailable' }
                        )
                      }
                      fallback={null}
                      contentPadding={0}
                      showVideoControls={false}
                      autoPlayVideo={false}
                      mutedVideo={true}
                      loopVideo={false}
                      preloadVideo='auto'
                      showAudioUnlock={false}
                      maxVideoSeconds={SPOTLIGHT_PREMIUM_MAX_VIDEO_SECONDS}
                      frameStyle={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: spotlightScreenHeight,
                        minHeight: spotlightScreenHeight,
                        borderRadius: 0,
                        opacity: spotlightPreloadIsHandoff ? 1 : 0,
                        pointerEvents: 'none',
                        zIndex: spotlightPreloadIsHandoff ? 5 : 0,
                      }}
                      mediaStyle={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        objectPosition: 'center',
                      }}
                    />
                  ) : null}
                  </>
                ) : heroImage && !ownerSpotlightStatusView && !miniSpotlight ? (
                  <img
                    src={heroImage}
                    alt={shopNameText}
                    style={{
                      width: "100%",
                      height: spotlightScreenHeight,
                      minHeight: spotlightScreenHeight,
                      objectFit: "cover",
                      objectPosition: "center",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      height: spotlightScreenHeight,
                      minHeight: spotlightScreenHeight,
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
                {spotlightTransition?.phase === 'neutral' ? (
                  <div
                    data-spotlight-transition-bridge="neutral"
                    role="status"
                    aria-live="polite"
                    style={{
                      position: "absolute",
                      inset: 0,
                      zIndex: 4,
                      display: "grid",
                      placeItems: "center",
                      padding: isCompact ? "70px 18px 18px" : 24,
                      color: "#E8F2FF",
                      background:
                        "rgba(2,12,27,0.96)",
                      textAlign: "center",
                      pointerEvents: "auto",
                    }}
                  >
                    <span
                      style={{
                        display: "grid",
                        gap: 6,
                        maxWidth: 280,
                        fontSize: isCompact ? 12 : 14,
                        fontWeight: 850,
                        lineHeight: 1.35,
                      }}
                    >
                      <strong style={{ color: "#FFFFFF", fontSize: "1.15em" }}>
                        No other Spotlight is ready
                      </strong>
                      <span>
                        Browse this shop while GSN checks again. No blank showing is counted.
                      </span>
                    </span>
                  </div>
                ) : null}
                <SecondaryButton
                  onClick={() => {
                    setSpotlightImmersiveOpen((open) => !open);
                    pauseSpotlightPresentationRotation();
                  }}
                  minWidth={0}
                  stableHeight={isCompact ? 44 : 46}
                  debugId="shop-gallery.spotlight.immersive"
                  aria-label={spotlightImmersiveOpen ? "Close full-screen Spotlight" : "Open full-screen Spotlight"}
                  title={spotlightImmersiveOpen ? "Close full screen" : "Full screen"}
                  data-spotlight-view-action="immersive"
                  style={{
                    ...spotlightProductRailButtonStyle(isCompact, "linear-gradient(180deg, #07172C 0%, #0B4E8A 100%)"),
                    position: "absolute",
                    right: isCompact ? 9 : 12,
                    bottom: isCompact ? 12 : 14,
                    zIndex: 7,
                    color: "#FFFFFF",
                  }}
                >
                  <span aria-hidden="true">{spotlightImmersiveOpen ? "\u00D7" : "\u26F6"}</span>
                </SecondaryButton>
                {spotlightEngagementAvailable ? (
                  <>
                    {spotlightProductActionsOpen && spotlightProductLinked ? (
                      <div
                        data-spotlight-product-context="true"
                        style={{
                          position: "absolute",
                          left: isCompact ? 10 : 14,
                          right: isCompact ? 64 : 72,
                          top: isCompact ? 10 : 14,
                          bottom: "auto",
                          zIndex: 5,
                          display: "none",
                          gap: 3,
                          padding: isCompact ? "9px 11px" : "11px 13px",
                          borderRadius: 16,
                          color: "#F8FAFC",
                          background:
                            "linear-gradient(180deg, rgba(2,12,27,0.72) 0%, rgba(2,12,27,0.92) 100%)",
                          boxShadow: "0 12px 26px rgba(2,12,27,0.28)",
                          pointerEvents: "none",
                        }}
                      >
                        <strong
                          style={{
                            fontSize: isCompact ? 16 : 18,
                            lineHeight: 1.18,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {firstMeaningful(
                            miniSpotlight?.sourceProductTitle,
                            "Product"
                          )}
                        </strong>
                        <span
                          style={{
                            color: "#F8D66D",
                            fontSize: isCompact ? 13 : 14,
                            fontWeight: 900,
                          }}
                        >
                          {firstMeaningful(
                            miniSpotlightView.priceLabel,
                            "Ask seller for price"
                          )}
                        </span>
                        <span
                          style={{
                            fontSize: isCompact ? 11 : 12,
                            fontWeight: 760,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {firstMeaningful(
                            miniSpotlight?.sourceShopName,
                            "GSN shop"
                          )}
                          {firstMeaningful(miniSpotlight?.sourceClanName)
                            ? " · " +
                              firstMeaningful(miniSpotlight?.sourceClanName)
                            : ""}
                        </span>
                      </div>
                    ) : null}
                    <div
                      data-spotlight-product-actions="true"
                      style={{
                        position: "absolute",
                        top: isCompact
                          ? miniSpotlightView.videoUrl
                            ? 154
                            : 62
                          : 68,
                        right: isCompact ? 9 : 12,
                        zIndex: 6,
                        display: "grid",
                        gap: isCompact ? 2 : 4,
                        justifyItems: "center",
                      }}
                    >
                      <SecondaryButton
                        onClick={() =>
                          setSpotlightProductActionsOpen((open) => !open)
                        }
                        minWidth={0}
                        stableHeight={isCompact ? 44 : 46}
                        debugId="shop-gallery.spotlight-product.toggle"
                        aria-label={
                          spotlightProductActionsOpen
                            ? "Close Spotlight actions"
                            : "Open Spotlight actions"
                        }
                        title={
                          spotlightProductActionsOpen
                            ? "Close Spotlight actions"
                            : "Open Spotlight actions"
                        }
                        data-spotlight-product-action="toggle"
                        style={spotlightProductRailButtonStyle(
                          isCompact,
                          "linear-gradient(180deg, #FFFFFF 0%, #EAF2FA 100%)"
                        )}
                      >
                        <span aria-hidden="true">
                          {spotlightProductActionsOpen ? "\u00D7" : "+"}
                        </span>
                      </SecondaryButton>
                      {spotlightProductActionsOpen ? (
                        <>
                          {!spotlightSelfActionsBlocked ? (
                            <>
                              <SecondaryButton
                                onClick={() => void toggleSpotlightProductSave()}
                                disabled={
                                  spotlightProductPreferenceAvailable
                                    ? savingProductId === spotlightSourceProductId
                                    : savingSpotlightCampaignId === spotlightCampaignId
                                }
                                minWidth={0}
                                stableHeight={isCompact ? 44 : 46}
                                debugId="shop-gallery.spotlight-product.save"
                                aria-label={
                                  spotlightProductSaved
                                    ? `Remove this ${spotlightPreferenceKind} from saved items`
                                    : `Save this ${spotlightPreferenceKind} privately`
                                }
                                title={
                                  spotlightProductSaved
                                    ? "Remove from saved items"
                                    : `Save ${spotlightPreferenceKind} privately`
                                }
                                data-spotlight-product-action="save"
                                data-spotlight-engagement-kind={spotlightPreferenceKind}
                                style={spotlightProductRailButtonStyle(
                                  isCompact,
                                  spotlightProductSaved
                                    ? "linear-gradient(180deg, #FFF4D6 0%, #FFDFA0 100%)"
                                    : "linear-gradient(180deg, #FFFFFF 0%, #FFF7E7 100%)"
                                )}
                              >
                                <span
                                  aria-hidden="true"
                                  style={{
                                    color: spotlightProductSaved
                                      ? "#C2410C"
                                      : "#9A3412",
                                  }}
                                >
                                  {spotlightProductSaved ? "\u2713" : "\uD83D\uDD16"}
                                </span>
                              </SecondaryButton>
                              <SecondaryButton
                                onClick={() => void toggleSpotlightProductLike()}
                                disabled={
                                  spotlightProductPreferenceAvailable
                                    ? likingProductId === spotlightSourceProductId
                                    : likingSpotlightCampaignId === spotlightCampaignId
                                }
                                minWidth={0}
                                stableHeight={isCompact ? 44 : 46}
                                debugId="shop-gallery.spotlight-product.like"
                                aria-label={spotlightProductLiked ? "\u2665" : "\u2661"}
                                title={spotlightProductLiked ? "\u2665" : "\u2661"}
                                data-spotlight-product-action="like"
                                data-spotlight-engagement-kind={spotlightPreferenceKind}
                                style={spotlightProductRailButtonStyle(
                                  isCompact,
                                  spotlightProductLiked
                                    ? "linear-gradient(180deg, #FFE8EE 0%, #FFB9C9 100%)"
                                    : "linear-gradient(180deg, #FFFFFF 0%, #FFF0F4 100%)"
                                )}
                              >
                                <span aria-hidden="true" style={{ color: "#BE123C" }}>
                                  {spotlightProductLiked ? "\u2665" : "\u2661"}
                                </span>
                              </SecondaryButton>
                              {spotlightProductLinked ? (
                                <SecondaryButton
                                  onClick={() =>
                                    void contactSpotlightProductSeller()
                                  }
                                  minWidth={0}
                                  stableHeight={isCompact ? 44 : 46}
                                  debugId="shop-gallery.spotlight-product.ask-seller"
                                  aria-label="Ask seller about this product"
                                  title="Ask seller"
                                  data-spotlight-product-action="ask-seller"
                                  style={spotlightProductRailButtonStyle(
                                    isCompact,
                                    "linear-gradient(180deg, #FFFFFF 0%, #FFF0C7 100%)"
                                  )}
                                >
                                  <span aria-hidden="true">{"\uD83D\uDCAC"}</span>
                                </SecondaryButton>
                              ) : null}
                            </>
                          ) : null}
                          {!spotlightSelfActionsBlocked ? (
                          <SocialTagShareButton
                            target={buildSpotlightProductShareTarget()}
                            buttonLabel=""
                            ariaLabel={`Share this ${spotlightPreferenceKind}`}
                            triggerIcon={<span>{"\u2197"}</span>}
                            minWidth={0}
                            stableHeight={isCompact ? 44 : 46}
                            debugId="shop-gallery.spotlight-product.share"
                            onBeforeOpen={() => {
                              pauseSpotlightPresentationRotation();
                              return true;
                            }}
                            onResult={(tone, text, channel) => {
                              if (tone === "success") {
                                void trackMarketplaceAttention(
                                  "share_action",
                                  {
                                    shop_id: spotlightSourceShopId,
                                    product_id:
                                      spotlightSourceProductId || undefined,
                                    clan_id:
                                      spotlightSourceClanId || undefined,
                                    broadcast_id:
                                      positiveNumber(miniSpotlight?.id) ||
                                      undefined,
                                    source:
                                      `public_shop_spotlight_${spotlightPreferenceKind}_share_` +
                                      firstMeaningful(channel, "share"),
                                  },
                                  { allowShopFallback: false }
                                );
                              }
                              setNotice({ tone, text });
                            }}
                            style={spotlightProductRailButtonStyle(
                              isCompact,
                              "linear-gradient(180deg, #FFFFFF 0%, #EAF6FF 100%)"
                            )}
                          />
                          ) : null}
                          {spotlightCommunityLabel ? (
                            <SecondaryButton
                              onClick={showSpotlightBusinessArea}
                              minWidth={0}
                              stableHeight={isCompact ? 44 : 46}
                              debugId="shop-gallery.spotlight-product.business-area"
                              aria-label={`Show public business area ${spotlightCommunityLabel}`}
                              title="Business area"
                              data-spotlight-product-action="business-area"
                              style={spotlightProductRailButtonStyle(
                                isCompact,
                                "linear-gradient(180deg, #FFFFFF 0%, #E6F7FF 100%)"
                              )}
                            >
                              <span aria-hidden="true">{"\u2316"}</span>
                            </SecondaryButton>
                          ) : null}
                          {spotlightProductPreferenceAvailable &&
                          firstMeaningful(miniSpotlight?.sourceProductTitle) ? (
                            <SecondaryButton
                              onClick={openSpotlightSimilarProducts}
                              minWidth={0}
                              stableHeight={isCompact ? 44 : 46}
                              debugId="shop-gallery.spotlight-product.similar"
                              aria-label="See similar products"
                              title="See similar products"
                              data-spotlight-product-action="similar"
                              style={spotlightProductRailButtonStyle(
                                isCompact,
                                "linear-gradient(180deg, #FFFFFF 0%, #E8F7F1 100%)"
                              )}
                            >
                              <span aria-hidden="true">{"\uD83D\uDD0D"}</span>
                            </SecondaryButton>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </>
                ) : null}
                {spotlightPurchaseOpen &&
                spotlightCommercialAction.kind === "intent" ? (
                  <div
                    data-spotlight-purchase-card-shell="true"
                    role="presentation"
                    style={{
                      position: "absolute",
                      inset: 0,
                      zIndex: 20,
                      display: "grid",
                      alignItems: "end",
                      padding: isCompact ? 10 : 18,
                      background: "rgba(2,12,27,0.62)",
                    }}
                  >
                    <div
                      data-spotlight-purchase-card="true"
                      role="dialog"
                      aria-modal="true"
                      aria-label={spotlightCommercialAction.label}
                      style={{
                        width: "100%",
                        maxWidth: 520,
                        maxHeight: "calc(100% - 20px)",
                        margin: "0 auto",
                        overflowY: "auto",
                        boxSizing: "border-box",
                        padding: isCompact ? 14 : 18,
                        border: "1px solid rgba(85,232,255,0.58)",
                        borderRadius: isCompact ? 18 : 22,
                        color: "#0B1F33",
                        background: "rgba(255,255,255,0.98)",
                        boxShadow: "0 18px 44px rgba(2,12,27,0.48)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <strong style={{ fontSize: isCompact ? 18 : 22 }}>
                          {spotlightCommercialAction.label}
                        </strong>
                        <SecondaryButton
                          onClick={() => setSpotlightPurchaseOpen(false)}
                          minWidth={0}
                          stableHeight={40}
                          debugId="shop-gallery.spotlight.purchase.close"
                          aria-label="Close commercial action"
                          style={{ width: 40, minHeight: 40, borderRadius: 999, padding: 0 }}
                        >
                          {"\u00D7"}
                        </SecondaryButton>
                      </div>
                      <div style={{ marginTop: 10, display: "grid", gap: 3 }}>
                        <strong style={{ fontSize: isCompact ? 15 : 17 }}>
                          {miniSpotlightView.title}
                        </strong>
                        <span style={{ color: "#52677C", fontSize: 13, fontWeight: 760 }}>
                          {firstMeaningful(miniSpotlight?.sourceShopName, "GSN shop")}
                        </span>
                        {miniSpotlightView.priceLabel ? (
                          <strong style={{ color: "#0757BC", fontSize: 16 }}>
                            {miniSpotlightView.priceLabel}
                          </strong>
                        ) : null}
                      </div>
                      {spotlightCommercialAction.intentType !== "notify_me" ? (
                        <div style={{ marginTop: 13, display: "grid", gap: 11 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 12,
                            }}
                          >
                            <strong>Quantity</strong>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                              <SecondaryButton
                                onClick={() =>
                                  setSpotlightPurchaseQuantity((value) => Math.max(1, value - 1))
                                }
                                disabled={spotlightPurchaseQuantity <= 1}
                                minWidth={0}
                                stableHeight={40}
                                debugId="shop-gallery.spotlight.purchase.quantity-minus"
                                style={{ width: 40, minHeight: 40, borderRadius: 999, padding: 0 }}
                              >
                                {"\u2212"}
                              </SecondaryButton>
                              <strong aria-live="polite">{spotlightPurchaseQuantity}</strong>
                              <SecondaryButton
                                onClick={() =>
                                  setSpotlightPurchaseQuantity((value) => Math.min(99, value + 1))
                                }
                                minWidth={0}
                                stableHeight={40}
                                debugId="shop-gallery.spotlight.purchase.quantity-plus"
                                style={{ width: 40, minHeight: 40, borderRadius: 999, padding: 0 }}
                              >
                                +
                              </SecondaryButton>
                            </span>
                          </div>
                          {["buy_now", "book_now"].includes(
                            spotlightCommercialAction.intentType
                          ) ? (
                            <fieldset style={{ margin: 0, padding: 0, border: 0 }}>
                              <legend style={{ fontWeight: 850, marginBottom: 7 }}>
                                How would you like to receive it?
                              </legend>
                              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                                {(["collection", "delivery"] as const).map((method) => (
                                  <label key={method} style={{ display: "inline-flex", gap: 6 }}>
                                    <input
                                      type="radio"
                                      name="spotlight-fulfilment"
                                      value={method}
                                      checked={spotlightPurchaseFulfilment === method}
                                      onChange={() => setSpotlightPurchaseFulfilment(method)}
                                    />
                                    {method === "collection" ? "Collection" : "Delivery"}
                                  </label>
                                ))}
                              </div>
                            </fieldset>
                          ) : null}
                        </div>
                      ) : null}
                      {spotlightPurchaseSubtotal ? (
                        <div
                          style={{
                            marginTop: 13,
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            fontWeight: 900,
                          }}
                        >
                          <span>Product subtotal</span>
                          <span>{spotlightPurchaseSubtotal}</span>
                        </div>
                      ) : null}
                      <div style={{ marginTop: 10, color: "#52677C", fontSize: 11.5, lineHeight: 1.4 }}>
                        This records your intention only. It is not payment, a binding order, or confirmed availability.
                      </div>
                      <PrimaryButton
                        onClick={() => void submitSpotlightPurchaseIntention()}
                        disabled={spotlightPurchaseBusy}
                        minWidth={0}
                        fullWidth
                        stableHeight={48}
                        debugId="shop-gallery.spotlight.purchase.confirm"
                        style={{ ...primaryBtn(false), marginTop: 12, width: "100%", borderRadius: 14 }}
                      >
                        {spotlightPurchaseBusy
                          ? "Recording..."
                          : "Confirm request"}
                      </PrimaryButton>
                      {!spotlightIsGsnHouse && miniSpotlight?.authorGmfnId ? (
                        <SubtleButton
                          onClick={openSpotlightSourceShop}
                          minWidth={0}
                          stableHeight={42}
                          debugId="shop-gallery.spotlight.purchase.view-shop"
                          style={{ width: "100%", marginTop: 6, borderRadius: 12 }}
                        >
                          View shop
                        </SubtleButton>
                      ) : null}
                      {spotlightProductLinked ? (
                        <SubtleButton
                          onClick={() => void contactSpotlightProductSeller()}
                          minWidth={0}
                          stableHeight={42}
                          debugId="shop-gallery.spotlight.purchase.ask-seller"
                          style={{ width: "100%", marginTop: 6, borderRadius: 12 }}
                        >
                          Need more information? Ask seller
                        </SubtleButton>
                      ) : null}
                    </div>
                  </div>
                ) : null}
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
                ? "minmax(0, 1fr)"
                : "minmax(260px, 0.9fr) minmax(0, 1.1fr)",
              alignItems: "center",
              gap: isCompact ? 10 : 16,
            }}
          >
            <PrivateVaultEverydayItems
              compact={isCompact}
              style={isCompact ? { height: 82, aspectRatio: "auto" } : undefined}
            />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 6,
                  minWidth: 0,
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ ...sectionLabel(), color: "#F6D77A" }}>
                  Private Vault
                </span>
                <span aria-hidden="true" style={{ color: "rgba(246,215,122,0.68)", fontSize: 10 }}>
                  |
                </span>
                <span style={{ color: "#D7E5F2", fontSize: isCompact ? 10.5 : 12, fontWeight: 760 }}>
                  Owner invitation only.
                </span>
                {signedInOwnsShop ? (
                  <ExistingWorkflowPlusLink
                    to={ownerVaultControlPath}
                    label="Open Vault Control"
                    debugId="shop-gallery.vault.owner-shortcut"
                    shortcut="vault"
                    data-public-shop-neon-action="true"
                    style={{
                      marginLeft: "auto",
                      flexShrink: 0,
                    }}
                  />
                ) : null}
              </div>
              <div
                style={{
                  marginTop: isCompact ? 4 : 8,
                  color: "#FFFFFF",
                  fontSize: isCompact ? 14 : 23,
                  fontWeight: 950,
                  lineHeight: 1.15,
                  whiteSpace: isCompact ? "nowrap" : undefined,
                }}
              >
                Everyday items shared privately.
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact ? "minmax(0, 1fr) auto" : "repeat(2, minmax(0, 1fr))",
                  gap: isCompact ? 6 : 8,
                  marginTop: isCompact ? 7 : 16,
                }}
              >
                <PrimaryButton
                  onClick={askForVaultAccess}
                  minWidth={0}
                  stableHeight={isCompact ? 44 : 48}
                  debugId="shop-gallery.ask-vault-access"
                  style={{
                    ...primaryBtn(false),
                    minHeight: isCompact ? 44 : 48,
                    padding: isCompact ? "7px 11px" : "10px 14px",
                    borderRadius: isCompact ? 14 : 999,
                    fontSize: isCompact ? 11.5 : 14,
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
                  stableHeight={isCompact ? 44 : 48}
                  debugId="shop-gallery.copy-vault-request-link"
                  style={{
                    ...secondaryBtn(false),
                    minHeight: isCompact ? 44 : 48,
                    padding: isCompact ? "7px 10px" : "9px 12px",
                    borderRadius: isCompact ? 14 : 999,
                    fontSize: isCompact ? 11 : 14,
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
              display:
                focusedBlockLinkActive || (isCompact && routeDiaryEntryId <= 0)
                  ? "none"
                  : "block",
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
              {!isCompact && signedInOwnsShop ? renderShopDiaryShortcut() : null}
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
                  <div style={{ marginTop: 12 }}>
                    <ShopVoiceNotePlayer
                      attachmentId={featuredDiaryEntry.voice_attachment_id}
                      durationSeconds={featuredDiaryEntry.voice_duration_seconds}
                      deletedAt={featuredDiaryEntry.voice_deleted_at}
                      speakerName={featuredDiaryEntry.voice_speaker_name}
                      speakerGmfnId={featuredDiaryEntry.voice_speaker_gmfn_id}
                      shopName={shopNameText}
                      publicAccess
                      debugId="shop-gallery.update-voice.listen"
                      label="Voice message - tap Listen to hear it"
                    />
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
          id={PUBLIC_SHOP_PRODUCTS_ANCHOR}
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
              {focusedBlockLinkActive ? (
                <div
                  style={{
                    marginTop: 4,
                    color: "#526C84",
                    fontSize: isCompact ? 11.5 : 13,
                    lineHeight: 1.3,
                    fontWeight: 700,
                  }}
                >
                  Shared item.
                </div>
              ) : null}

            </div>
            <span style={badge(true)}>
              {focusedBlockProduct
                ? publicShopBlockLabel(focusedBlockProduct)
                : focusedBlockLinkActive
                ? "Shared item"
                : shopDiaryCounterText}
            </span>
          </div>

          {!isCompact &&
          signedInOwnsShop &&
          (effectiveShop?.voiceAttachmentId || effectiveShop?.voiceDeletedAt) ? (
            <div style={{ marginBottom: isCompact ? 10 : 12 }}>
              <ShopVoiceNotePlayer
                attachmentId={effectiveShop.voiceAttachmentId}
                durationSeconds={effectiveShop.voiceDurationSeconds}
                deletedAt={effectiveShop.voiceDeletedAt}
                speakerName={effectiveShop.voiceSpeakerName}
                speakerGmfnId={effectiveShop.voiceSpeakerGmfnId}
                shopName={shopNameText}
                publicAccess
                debugId="shop-gallery.welcome-voice.listen"
                label="Shop welcome"
              />
            </div>
          ) : null}

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
                const productCommercialAction =
                  shopProductCommercialAction(product);
                const productPurchaseCardOpen =
                  isProductOpen &&
                  shopPurchaseDraft?.productId === positiveNumber(product.id);
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
                const canSaveProduct =
                  isProductOpen && showProductSaveAction && positiveNumber(product.id) > 0;
                const isProductSaved = Boolean(
                  savedProductState(
                    savedProductIds,
                    positiveNumber(product.id),
                    Boolean(product.isSaved)
                  )
                );
                const showPublicProductShareAction =
                  isProductOpen && !showBlockPlacementAction && !shopLoadFailed;
                const showSimilarProductsAction =
                  isProductOpen && !showBlockPlacementAction && !shopLoadFailed;
                const hasActiveProductVoice =
                  isProductOpen &&
                  positiveNumber(product.voiceAttachmentId) > 0 &&
                  !product.voiceDeletedAt;
                const showVisitorProductVoiceAction =
                  hasActiveProductVoice &&
                  !showBlockPlacementAction &&
                  !shopLoadFailed;
                const showOwnerProductVoiceAction =
                  hasActiveProductVoice && showBlockPlacementAction;
                const openVisitorActionCount =
                  (canSaveProduct ? 1 : 0) +
                  (showPublicProductShareAction ? 1 : 0) +
                  (showSimilarProductsAction ? 1 : 0) +
                  (showVisitorProductVoiceAction ? 1 : 0);
                const closedVisitorActionCount = 0;
                const productOpenActionRailWidth = showBlockPlacementAction
                  ? isProductOpen
                    ? diaryActionWidth * 4 + (isCompact ? 6 : 8) * 3
                    : diaryActionWidth
                  : openVisitorActionCount > 0
                  ? isProductOpen
                    ? diaryActionWidth
                    : diaryActionWidth * (1 + closedVisitorActionCount) +
                      (isCompact ? 6 : 8) * closedVisitorActionCount
                  : diaryActionWidth;
                const productOpenActionColumns = showBlockPlacementAction
                  ? isProductOpen
                    ? `repeat(4, ${diaryActionWidth}px)`
                    : `${diaryActionWidth}px`
                  : openVisitorActionCount > 0
                  ? isProductOpen
                    ? "1fr"
                    : `repeat(${1 + closedVisitorActionCount}, ${diaryActionWidth}px)`
                  : `${diaryActionWidth}px`;
                const productClosedActionRailWidth = showBlockPlacementAction
                  ? diaryActionWidth
                  : closedVisitorActionCount > 0
                  ? diaryActionWidth * (1 + closedVisitorActionCount) +
                    (isCompact ? 6 : 8) * closedVisitorActionCount
                  : diaryActionWidth;
                const productClosedActionColumns = showBlockPlacementAction
                  ? `${diaryActionWidth}px`
                  : closedVisitorActionCount > 0
                  ? `repeat(${1 + closedVisitorActionCount}, ${diaryActionWidth}px)`
                  : `${diaryActionWidth}px`;
                const diaryMediaControlHeight = isCompact ? 34 : 38;
                const diaryClosedDockHeight = isCompact ? 78 : 88;
                const existingOpenProductHeight = isCompact ? 430 : 380;
                const visitorOpenProductInfoHeight = Math.round(
                  existingOpenProductHeight * 0.2
                );
                const visitorPurchaseActionHeight = isCompact ? 44 : 48;
                const visitorPurchaseActionGap = isCompact ? 7 : 9;
                const visitorOpenDockHeight =
                  visitorOpenProductInfoHeight +
                  visitorPurchaseActionHeight +
                  visitorPurchaseActionGap;
                const visitorOpenProductHeight =
                  existingOpenProductHeight + visitorOpenDockHeight;
                const diaryOpenDockHeight = showBlockPlacementAction
                  ? isCompact
                    ? 132
                    : 144
                  : visitorOpenDockHeight;

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
                      order: positiveNumber(product.slotNumber) || index + 1,
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
                        ? showBlockPlacementAction
                          ? existingOpenProductHeight
                          : visitorOpenProductHeight
                        : isCompact
                        ? 258
                        : 300,
                      height:
                        isProductOpen && !showBlockPlacementAction
                          ? visitorOpenProductHeight
                          : undefined,
                      aspectRatio: isProductOpen
                        ? showBlockPlacementAction
                          ? isCompact
                            ? "1 / 1.16"
                            : "1.65 / 1"
                          : "auto"
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
                        top: 0,
                        right: 0,
                        bottom:
                          isProductOpen && !showBlockPlacementAction
                            ? diaryOpenDockHeight
                            : 0,
                        left: 0,
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
                          autoPlayVideo={isProductOpen}
                          mutedVideo={true}
                          loopVideo={isProductOpen}
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
                          maxVideoSeconds={SPOTLIGHT_PREMIUM_MAX_VIDEO_SECONDS}
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
                    {productPurchaseCardOpen
                      ? renderShopPurchaseConfirmation(product)
                      : null}
                    {showOwnerProductVoiceAction ? (
                      <div
                        style={{
                          position: "absolute",
                          right: isCompact ? 8 : 12,
                          bottom: diaryOpenDockHeight + (isCompact ? 8 : 12),
                          zIndex: 4,
                        }}
                      >
                        <ShopVoiceNotePlayer
                          attachmentId={product.voiceAttachmentId}
                          durationSeconds={product.voiceDurationSeconds}
                          speakerName={product.voiceSpeakerName}
                          speakerGmfnId={product.voiceSpeakerGmfnId}
                          shopName={firstMeaningful(
                            product.originShopName,
                            shopNameText
                          )}
                          publicAccess
                          debugId={`shop-gallery.product.${productOpenId}.voice.owner-listen`}
                          label="Product or service voice note"
                          symbolOnly
                          symbolSize={diaryActionWidth}
                          symbolVariant="microphone"
                        />
                      </div>
                    ) : null}
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 3,
                        minWidth: 0,
                        padding: isProductOpen
                          ? showBlockPlacementAction
                            ? isCompact
                              ? "7px 9px"
                              : "9px 12px"
                            : isCompact
                            ? "5px 8px"
                            : "6px 10px"
                          : isCompact
                          ? "6px 7px"
                          : "7px 9px",
                        boxSizing: "border-box",
                        display: "grid",
                        gridTemplateColumns: isProductOpen
                          ? showBlockPlacementAction
                            ? `minmax(0, 1fr) ${productOpenActionRailWidth}px`
                            : "minmax(0, 1fr) auto"
                          : `minmax(0, 1fr) ${productClosedActionRailWidth}px`,
                        gridTemplateRows: isProductOpen
                          ? showBlockPlacementAction
                            ? "auto auto auto auto"
                            : "auto auto auto auto"
                          : "minmax(0, 1fr) minmax(0, 1fr)",
                        gap: isProductOpen ? (isCompact ? 3 : 4) : "2px 7px",
                        alignContent: "end",
                        alignItems: isProductOpen ? undefined : "stretch",
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
                        overflow: isProductOpen && !showBlockPlacementAction ? "visible" : "hidden",
                      }}
                    >
                      <div
                        style={{
                          gridColumn:
                            isProductOpen && !showBlockPlacementAction
                              ? "1"
                              : isProductOpen
                              ? "1 / -1"
                              : "1",
                          gridRow: isProductOpen ? "1" : "1",
                          minWidth: 0,
                          color: "#07172C",
                          fontWeight: 950,
                          fontSize: isProductOpen
                            ? showBlockPlacementAction
                              ? isCompact
                                ? 17
                                : 20
                              : isCompact
                              ? 16
                              : 18
                            : isCompact
                            ? 13
                            : 17,
                          lineHeight: 1.08,
                          display: "-webkit-box",
                          WebkitLineClamp: isProductOpen ? 2 : isCompact ? 1 : 2,
                          WebkitBoxOrient: "vertical" as any,
                          overflow: "hidden",
                          overflowWrap: "anywhere",
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
                      {isProductOpen && !showBlockPlacementAction ? (
                        <div
                          style={{
                            gridColumn: "1 / -1",
                            gridRow: "3",
                            minWidth: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: isCompact ? 6 : 8,
                            overflow: "hidden",
                          }}
                        >
                          <span
                            style={{
                              minWidth: 0,
                              flex: "1 1 auto",
                              color: "#526C84",
                              fontSize: isCompact ? 11 : 12,
                              fontWeight: 850,
                              lineHeight: 1.1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={shopLocationText}
                          >
                            <span aria-hidden="true">{"\uD83D\uDCCD"}</span>{" "}
                            {shopLocationText}
                          </span>
                          <SecondaryButton
                            onClick={(event) => {
                              event.stopPropagation();
                              if (shopFollowState.isFollowing && shopFollowSignedIn) {
                                void handleUnfollowShop();
                              } else {
                                void handleFollowShop();
                              }
                            }}
                            disabled={shopFollowButtonDisabled || (shopFollowSignedIn && !shopFollowState.canFollow)}
                            minWidth={0}
                            stableHeight={isCompact ? 28 : 30}
                            debugId="shop-gallery.open-product.follow-shop"
                            aria-label={
                              shopFollowState.isFollowing
                                ? "Unfollow shop"
                                : "Follow shop"
                            }
                            title={
                              shopFollowState.isFollowing
                                ? "Unfollow shop"
                                : "Follow shop"
                            }
                            style={{
                              ...secondaryBtn(shopFollowButtonDisabled),
                              flex: "0 0 auto",
                              minHeight: isCompact ? 28 : 30,
                              minWidth: isCompact ? 74 : 86,
                              padding: isCompact ? "3px 7px" : "4px 9px",
                              borderRadius: 999,
                              color: shopFollowState.isFollowing ? "#276E4A" : "#8C6829",
                              border: "1px solid rgba(214,170,69,0.52)",
                              background:
                                "linear-gradient(180deg, #FFFDF4 0%, #FFEFC2 100%)",
                              fontSize: isCompact ? 10 : 11,
                              fontWeight: 950,
                            }}
                          >
                            {shopFollowState.isFollowing ? "Following" : "Follow shop"}
                          </SecondaryButton>
                        </div>
                      ) : null}
                      <span
                        style={{
                          ...badge(true),
                          gridColumn:
                            isProductOpen && !showBlockPlacementAction
                              ? "2"
                              : isProductOpen
                              ? "1"
                              : "1",
                          gridRow:
                            isProductOpen && !showBlockPlacementAction
                              ? "1"
                              : isProductOpen
                              ? "4"
                              : "2",
                          justifyContent: "flex-start",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          width: "fit-content",
                          maxWidth: "100%",
                          minHeight: isProductOpen
                            ? showBlockPlacementAction
                              ? isCompact
                                ? 26
                                : 28
                              : isCompact
                              ? 22
                              : 24
                            : isCompact
                            ? 22
                            : 26,
                          padding: isProductOpen
                            ? showBlockPlacementAction
                              ? isCompact
                                ? "4px 9px"
                                : "5px 11px"
                              : isCompact
                              ? "3px 7px"
                              : "4px 9px"
                            : isCompact
                            ? "3px 7px"
                            : "4px 9px",
                          fontSize: isProductOpen
                            ? showBlockPlacementAction
                              ? isCompact
                                ? 12
                                : 13
                              : isCompact
                              ? 11
                              : 12
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
                      {isProductOpen && showProductContactAction ? (
                        <PrimaryButton
                          onClick={(event) => {
                            event.stopPropagation();
                            openShopProductPurchase(product);
                          }}
                          minWidth={0}
                          fullWidth
                          stableHeight={visitorPurchaseActionHeight}
                          debugId={`shop-gallery.product.${productOpenId}.purchase`}
                          data-product-purchase-action="true"
                          style={{
                            ...primaryBtn(false),
                            gridColumn: "1 / -1",
                            gridRow: "4",
                            width: "100%",
                            minWidth: 0,
                            minHeight: visitorPurchaseActionHeight,
                            borderRadius: 14,
                            fontSize: isCompact ? 13 : 14,
                          }}
                        >
                          {productCommercialAction.label}
                        </PrimaryButton>
                      ) : null}
                      <div
                        style={{
                          gridColumn: isProductOpen && !showBlockPlacementAction ? "1" : "2",
                          gridRow:
                            isProductOpen && !showBlockPlacementAction
                              ? "1"
                              : isProductOpen
                              ? "4"
                              : "1 / span 2",
                          display: "grid",
                          gridTemplateColumns: isProductOpen
                            ? productOpenActionColumns
                            : productClosedActionColumns,
                          gridAutoRows:
                            isProductOpen && !showBlockPlacementAction
                              ? `${diaryActionHeight}px`
                              : undefined,
                          gap: isCompact ? 6 : 8,
                          width: isProductOpen ? "fit-content" : "auto",
                          maxWidth: "100%",
                          minWidth: 0,
                          justifyContent: "start",
                          justifyItems: "start",
                          alignItems: "center",
                          alignSelf: "center",
                          boxSizing: "border-box",
                          overflow: "hidden",
                          overflowAnchor: "none",
                          ...(isProductOpen && !showBlockPlacementAction
                            ? {
                                position: "absolute" as const,
                                top: -(
                                  existingOpenProductHeight -
                                  (isCompact ? 12 : 16)
                                ),
                                right: isCompact ? 10 : 14,
                                zIndex: 6,
                                gridTemplateColumns: `${diaryActionWidth}px`,
                                padding: 0,
                                overflow: "visible",
                              }
                            : {}),
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
                          data-public-shop-neon-action="true"
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
                        {canSaveProduct ? (
                          <SecondaryButton
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!ownerSessionPresent) {
                                navigate(loginReconnectPath);
                                return;
                              }
                              void toggleProductSave(product);
                            }}
                            minWidth={0}
                            stableHeight={diaryActionHeight}
                            debugId={`shop-gallery.product.${productOpenId}.save`}
                            aria-label={
                              isProductSaved
                                ? `Remove ${displayTitle} from saved products`
                                : `Save ${displayTitle} privately`
                            }
                            title={
                              isProductSaved
                                ? "Remove from saved products"
                                : "Save product privately"
                            }
                            data-product-save-action="true"
                            disabled={savingProductId === positiveNumber(product.id)}
                            style={{
                              ...secondaryBtn(false),
                              width: diaryActionWidth,
                              maxWidth: diaryActionWidth,
                              minWidth: 0,
                              minHeight: diaryActionHeight,
                              padding: 0,
                              borderRadius: 999,
                              fontSize: isCompact ? 22 : 25,
                              lineHeight: 1,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              color: isProductSaved ? "#C2410C" : "#B45309",
                              border: "1px solid rgba(234,88,12,0.34)",
                              background:
                                "linear-gradient(180deg, #FFF9ED 0%, #FFECC8 100%)",
                              boxShadow:
                                "0 8px 18px rgba(234,88,12,0.16), inset 0 1px 0 rgba(255,255,255,0.88)",
                            }}
                          >
                            <span aria-hidden="true">
                              {isProductSaved ? "\u2713" : "\uD83D\uDD16"}
                            </span>
                          </SecondaryButton>
                        ) : null}
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
                        {showPublicProductShareAction ? (
                          <SocialTagShareButton
                            target={buildProductSocialShareTarget(product)}
                            buttonLabel=""
                            triggerIcon={
                              showBlockPlacementAction ? undefined : (
                                <span style={{ fontSize: isCompact ? 18 : 20 }}>↗</span>
                              )
                            }
                            minWidth={0}
                            stableHeight={diaryActionHeight}
                            debugId={`shop-gallery.product.${productOpenId}.share`}
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
                        {showSimilarProductsAction ? (
                          <StableCtaLink
                            to={similarProductsPath(product)}
                            minWidth={0}
                            stableHeight={diaryActionHeight}
                            debugId={`shop-gallery.product.${productOpenId}.similar-products`}
                            aria-label={`See products similar to ${displayTitle}`}
                            title="See similar products"
                            style={{
                              ...secondaryBtn(false),
                              width: diaryActionWidth,
                              maxWidth: diaryActionWidth,
                              minWidth: 0,
                              minHeight: diaryActionHeight,
                              padding: 0,
                              borderRadius: 999,
                              fontSize: isCompact ? 20 : 22,
                              lineHeight: 1,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              background:
                                "linear-gradient(180deg, rgba(235,248,255,0.99) 0%, rgba(207,236,255,0.94) 100%)",
                              color: "#0B4D78",
                            }}
                          >
                            <span aria-hidden="true">{"\u2315"}</span>
                          </StableCtaLink>
                        ) : null}
                        {showVisitorProductVoiceAction ? (
                          <ShopVoiceNotePlayer
                            attachmentId={product.voiceAttachmentId}
                            durationSeconds={product.voiceDurationSeconds}
                            speakerName={product.voiceSpeakerName}
                            speakerGmfnId={product.voiceSpeakerGmfnId}
                            shopName={firstMeaningful(
                              product.originShopName,
                              shopNameText
                            )}
                            publicAccess
                            debugId={`shop-gallery.product.${productOpenId}.voice.listen`}
                            label="Product or service voice note"
                            symbolOnly
                            symbolSize={diaryActionWidth}
                            symbolVariant="microphone"
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
              {visitorOpeningSoonSlot ? (
                <article
                  aria-label={
                    "GSN product coming soon, shop space " + visitorOpeningSoonSlot
                  }
                  className="visitor-opening-soon-card"
                  data-public-shop-neon-card="visitor-message"
                  data-visitor-opening-soon-space={visitorOpeningSoonSlot}
                  style={{
                    order: progressiveShelfCardOrder,
                    gridColumn: progressiveSlotSpansPair ? "1 / -1" : undefined,
                    width: "100%",
                    minWidth: 0,
                    minHeight: isCompact ? 258 : 300,
                    aspectRatio: progressiveSlotSpansPair
                      ? isCompact
                        ? "1.55 / 1"
                        : "2.5 / 1"
                      : isCompact
                        ? "0.72 / 1"
                        : "1.22 / 1",
                    borderRadius: isCompact ? 18 : 20,
                    padding: 0,
                    display: "grid",
                    gridTemplateRows: visitorOpeningSoonVoice ? "1fr 1fr" : "1fr",
                    textAlign: "center",
                    color: "#FFFFFF",
                    background:
                      "radial-gradient(circle at 50% 18%, rgba(26,93,170,0.96) 0%, #0B326A 48%, #061A38 100%)",
                    border: "1px solid rgba(221,178,72,0.78)",
                    boxShadow:
                      "0 18px 34px rgba(8,38,67,0.18), inset 0 1px 0 rgba(255,255,255,0.20)",
                    boxSizing: "border-box",
                    overflow: "hidden",
                  }}
                >
                  <div
                    data-visitor-opening-soon-message="true"
                    style={{
                      minHeight: 0,
                      padding: isCompact ? 12 : 16,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: isCompact ? 7 : 9,
                      boxSizing: "border-box",
                    }}
                  >
                    <div
                      aria-hidden="true"
                      style={{
                        width: visitorOpeningSoonVoice
                          ? isCompact
                            ? 48
                            : 58
                          : isCompact
                          ? 74
                          : 86,
                        height: visitorOpeningSoonVoice
                          ? isCompact
                            ? 54
                            : 64
                          : isCompact
                          ? 82
                          : 96,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(245,211,119,0.34)",
                      }}
                    >
                      <GSNBrandMark
                        width={visitorOpeningSoonVoice ? (isCompact ? 34 : 40) : isCompact ? 48 : 56}
                        height={visitorOpeningSoonVoice ? (isCompact ? 44 : 52) : isCompact ? 64 : 74}
                      />
                    </div>
                    <span
                      style={{
                        color: "#F4D57C",
                        fontSize: isCompact ? 11 : 12,
                        fontWeight: 950,
                        letterSpacing: "0.16em",
                      }}
                    >
                      GSN
                    </span>
                    <strong
                      style={{
                        fontSize: visitorOpeningSoonVoice
                          ? isCompact
                            ? 15
                            : 18
                          : isCompact
                          ? 17
                          : 20,
                        fontWeight: 950,
                        lineHeight: 1.12,
                      }}
                    >
                      Product coming soon
                    </strong>
                    {!visitorOpeningSoonVoice ? (
                      <span
                        style={{
                          maxWidth: 170,
                          color: "rgba(237,245,255,0.82)",
                          fontSize: isCompact ? 11 : 12,
                          fontWeight: 750,
                          lineHeight: 1.35,
                        }}
                      >
                        The owner is preparing this space.
                      </span>
                    ) : null}
                  </div>
                  {visitorOpeningSoonVoice ? (
                    <div
                      data-visitor-opening-soon-audio="true"
                      aria-label="Public shop audio message"
                      style={{
                        minHeight: 0,
                        display: "grid",
                        placeItems: "center",
                        padding: isCompact ? 10 : 14,
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.12) 100%)",
                        borderTop: "1px solid rgba(245,211,119,0.42)",
                        boxSizing: "border-box",
                      }}
                    >
                      <ShopVoiceNotePlayer
                        attachmentId={visitorOpeningSoonVoice.attachmentId}
                        durationSeconds={visitorOpeningSoonVoice.durationSeconds}
                        speakerName={visitorOpeningSoonVoice.speakerName}
                        speakerGmfnId={visitorOpeningSoonVoice.speakerGmfnId}
                        shopName={shopNameText}
                        publicAccess
                        symbolOnly
                        debugId="shop-gallery.visitor-shop-message.play"
                        label="public shop message"
                      />
                    </div>
                  ) : null}
                </article>
              ) : null}
              {ownerEmptyProductSlots.map((slotNumber, index) => {
                const isFirstShopStep = products.length === 0 && index === 0;
                const actionLabel = isFirstShopStep
                  ? "Add your product"
                  : "Add another product";

                return (
                  <StableCtaLink
                    key={`owner-empty-shop-space-${slotNumber}`}
                    to={ownerEmptyProductPath(slotNumber)}
                    kind="secondary"
                    preserveOrigin={false}
                    debugId={`shop-gallery.owner-empty-space.${slotNumber}`}
                    stableHeight={isCompact ? 258 : 300}
                    aria-label={`${actionLabel}, shop space ${slotNumber}`}
                    data-owner-empty-shop-space={slotNumber}
                    data-owner-empty-shop-primary={isFirstShopStep ? "true" : "false"}
                    style={{
                      order: progressiveShelfCardOrder,
                      gridColumn: progressiveSlotSpansPair ? "1 / -1" : undefined,
                      width: "100%",
                      minWidth: 0,
                      minHeight: isCompact ? 258 : 300,
                      aspectRatio: progressiveSlotSpansPair
                        ? isCompact
                          ? "1.55 / 1"
                          : "2.5 / 1"
                        : isCompact
                          ? "0.72 / 1"
                          : "1.22 / 1",
                      borderRadius: isCompact ? 18 : 20,
                      padding: isCompact ? 14 : 18,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: isCompact ? 10 : 12,
                      textAlign: "center",
                      whiteSpace: "normal",
                      color: "#0B4EA2",
                      background: isFirstShopStep
                        ? "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.98) 0%, rgba(255,248,219,0.96) 46%, rgba(242,216,147,0.88) 100%)"
                        : "linear-gradient(145deg, #FFFFFF 0%, #F4F8FF 54%, #E6F0FC 100%)",
                      border: isFirstShopStep
                        ? "2px solid rgba(190,142,29,0.52)"
                        : "1px dashed rgba(13,95,168,0.34)",
                      boxShadow: isFirstShopStep
                        ? "0 20px 36px rgba(122,86,10,0.16), inset 0 1px 0 rgba(255,255,255,0.96)"
                        : "0 16px 30px rgba(8,38,67,0.10), inset 0 1px 0 rgba(255,255,255,0.96)",
                      boxSizing: "border-box",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: isCompact ? 68 : 76,
                        height: isCompact ? 68 : 76,
                        borderRadius: 999,
                        display: "inline-grid",
                        placeItems: "center",
                        color: isFirstShopStep ? "#7A4A00" : "#0B4EA2",
                        background: "rgba(255,255,255,0.96)",
                        border: isFirstShopStep
                          ? "1px solid rgba(190,142,29,0.44)"
                          : "1px solid rgba(13,95,168,0.25)",
                        boxShadow:
                          "0 12px 24px rgba(8,38,67,0.13), inset 0 1px 0 rgba(255,255,255,0.98)",
                        fontSize: isCompact ? 44 : 50,
                        fontWeight: 650,
                        lineHeight: 1,
                      }}
                    >
                      +
                    </span>
                    <span
                      style={{
                        color: "#07172C",
                        fontSize: isCompact ? 15 : 17,
                        fontWeight: 950,
                        lineHeight: 1.2,
                      }}
                    >
                      {actionLabel}
                    </span>
                    <span
                      style={{
                        color: "#526C84",
                        fontSize: isCompact ? 11 : 12,
                        fontWeight: 800,
                        lineHeight: 1.2,
                      }}
                    >
                      {isFirstShopStep
                        ? "Tap to start selling"
                        : "Awaiting your product"}
                    </span>
                  </StableCtaLink>
                );
              })}
            </div>
          )}


        </section>
      </section>
      </div>
    </main>
  );
}
