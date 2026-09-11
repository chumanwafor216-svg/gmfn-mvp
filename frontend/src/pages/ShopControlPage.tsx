import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useLocation, useNavigate } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import GSNBrandMark from "../components/GSNBrandMark";
import { RealLifeMeaningGuide } from "../components/RealLifeMeaningGuide";
import PaymentProofSubmissionPanel from "../components/PaymentProofSubmissionPanel";
import {
  PrimaryButton,
  SecondaryButton,
  StableButton,
  StableCtaLink,
  StableDisclosureSummary,
  SubtleButton,
} from "../components/StableButton";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import ShopAssetsPage from "./ShopAssetsPage";
import {
  createMarketplaceShop,
  createMarketplaceBroadcast,
  getPublicMarketplaceShopByGmfnId,
  getMe,
  getMarketplaceShopByGmfnId,
  getMarketplaceShopAttentionSummary,
  listMarketplaceRequests,
  recordMarketplaceAttentionEvent,
  getMyMarketplaceShop,
  getMyIdentityRisk,
  getSelectedClanId,
  listMyCommunityDomains,
  createVaultShopAccessLink,
  extendVaultShopAccessLink,
  listVaultShopAccessLinks,
  revokeVaultShopAccessLink,
  safeCopy,
  uploadMarketplaceImageFile,
  uploadMarketplaceVideoFile,
  type MarketplaceRequestItem,
} from "../lib/api";
import {
  communityDomainFeatureIsOff,
  communityDomainFeatureModeFromPayload,
  communityDomainFeatureOffMessage,
} from "../lib/communityDomainFeaturePolicy";
import {
  prepareSpotlightImageFile,
  prepareSpotlightVideoFile,
} from "../lib/spotlightMediaPrep";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import { buildGsnVaultInviteMessage } from "../lib/gsnSnapshotPaper";
import {
  SPOTLIGHT_MAX_IMAGE_BYTES,
  SPOTLIGHT_MAX_VIDEO_BYTES,
  SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS,
} from "../lib/spotlightPilot";
import { publicFrontendUrl } from "../lib/publicLinks";
import { institutionalBlueRailShell } from "../lib/institutionalSurface";
import { getRealLifeTrustGuidance } from "../lib/realLifeTrustGuidance";
import { marketplaceGovernanceErrorMessage } from "../lib/structuredErrors";
import { rememberPublishRecovery } from "../lib/publishRecovery";
import { navigateWithOrigin } from "../lib/nav";
import { revealElementWithoutJump } from "../lib/mobileRevealStability";
import {
  analyticsRate,
  buildShopAnalyticsWisdom,
  buildShopMarketIntelligenceSummary,
  buildShopSellerHelper,
  formatAnalyticsRate,
} from "../lib/shopAnalyticsWisdom";
import {
  OWNER_SHOP_HASHES,
  PAID_REPOST_HASH,
  SHOP_CONTROL_SHORTCUTS,
  ownerShopLayerForTarget,
  type ShopControlShortcutId,
} from "../lib/ownerShopHandles";
import type {
  ShopControlSpotlightFeedback,
  ShopControlSpotlightFlowStep,
  ShopControlSpotlightMediaChoice,
  ShopControlSpotlightPriorityMode,
  ShopControlSpotlightStepBadge,
  ShopControlSpotlightWorkflowProps,
} from "./shopControl/ShopControlSpotlightWorkflowTypes";

const ShopControlSpotlightWorkflow = React.lazy(() => import("./shopControl/ShopControlSpotlightWorkflow"));

type ShopRecord = {
  id: number;
  clan_id?: number | null;
  owner_user_id?: number | null;
  gmfn_id?: string | null;
  owner_gmfn_id?: string | null;
  name?: string | null;
  description?: string | null;
  whatsapp_number?: string | null;
  telegram_handle?: string | null;
  image_url?: string | null;
  marketplace_name?: string | null;
  is_active?: boolean;
  created_at?: string | null;
  shop_product_slots_free?: number | null;
  shop_product_slots_extra?: number | null;
  shop_product_slots_total?: number | null;
};

type ProductRecord = {
  id: number;
  shop_id: number;
  clan_id?: number;
  name?: string | null;
  description?: string | null;
  price?: string | null;
  currency?: string | null;
  image_url?: string | null;
  visibility_mode?: string | null;
  public_block_number?: number | string | null;
  slot_number?: number | string | null;
  source_product_slot_number?: number | string | null;
  sourceProductSlotNumber?: number | string | null;
  block?: number | string | null;
  block_number?: number | string | null;
  is_active?: boolean;
  created_at?: string | null;
  category?: string | null;
  categories?: string[] | string | null;
  service_category?: string | null;
  shop_product_slots_free?: number | null;
  shop_product_slots_extra?: number | null;
  shop_product_slots_total?: number | null;
};

type BroadcastRecord = {
  id: number;
  shop_id?: number | null;
  message?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  priority_mode?: string | null;
  visibility_scope?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
};

type VaultLinkRecord = {
  id: number;
  shop_id: number;
  product_id?: number | string | null;
  access_url?: string | null;
  token?: string | null;
  status?: string | null;
  expires_at?: string | null;
  max_views?: number | null;
  views_used?: number | null;
  allow_download?: boolean;
  allow_print?: boolean;
  allow_reshare?: boolean;
  watermark_enabled?: boolean;
  frontend_hint_path?: string | null;
  api_view_url?: string | null;
  created_at?: string | null;
  last_opened_at?: string | null;
};

type ExpectedPaymentRecord = {
  id?: number;
  expected_type?: string | null;
  amount?: string | null;
  currency?: string | null;
  reference_display?: string | null;
  status?: string | null;
  due_at?: string | null;
  matched_bank_event_id?: number | null;
  confirmed_at?: string | null;
  meta?: any;
};

type CommunityPackageStatusItem = {
  package_code?: string | null;
  feature_code?: string | null;
  title?: string | null;
  unit_label?: string | null;
  active_remaining?: number | null;
  consumer?: string | null;
  engine_ready?: boolean | null;
  message?: string | null;
  latest_payment?: ExpectedPaymentRecord | null;
};

type CommunityPackageStatus = {
  clan_id?: number | null;
  shop_id?: number | null;
  packages?: CommunityPackageStatusItem[];
};

type ShopAttentionPeriod = {
  shop_visits?: number | null;
  unique_shop_visitors?: number | null;
  product_opens?: number | null;
  spotlight_impressions?: number | null;
  unique_spotlight_viewers?: number | null;
  spotlight_shop_clicks?: number | null;
  contact_taps?: number | null;
};

type ShopAttentionDailyActivity = ShopAttentionPeriod & {
  date?: string | null;
};

type ShopAttentionSourceBreakdown = ShopAttentionPeriod & {
  source?: string | null;
  label?: string | null;
  total_events?: number | null;
  boundary_label?: string | null;
};

type ShopAttentionSummary = {
  periods?: {
    today?: ShopAttentionPeriod;
    last_7_days?: ShopAttentionPeriod;
    requested?: ShopAttentionPeriod;
  };
  spotlight?: {
    active_count?: number | null;
    active_spotlights?: number | null;
    possible_member_reach?: number | null;
    possible_reach_label?: string | null;
    reach_label?: string | null;
  };
  followers?: {
    follower_count?: number | null;
    followers_count?: number | null;
    notification_label?: string | null;
    boundary_label?: string | null;
  };
  follower_notifications?: {
    last_7_days?: number | null;
    year_to_date?: number | null;
    last_sent_at?: string | null;
    delivery_label?: string | null;
    boundary_label?: string | null;
    count_method?: string | null;
    by_kind?: Array<{
      kind?: string | null;
      label?: string | null;
      count?: number | null;
      last_sent_at?: string | null;
    }> | null;
  } | null;
  follower_notification_response?: {
    last_7_days?: number | null;
    shop_visits?: number | null;
    unique_visitors?: number | null;
    product_opens?: number | null;
    contact_taps?: number | null;
    boundary_label?: string | null;
    count_method?: string | null;
    by_kind?: Array<{
      kind?: string | null;
      label?: string | null;
      shop_visits?: number | null;
      unique_visitors?: number | null;
      product_opens?: number | null;
      contact_taps?: number | null;
      total_events?: number | null;
    }> | null;
  } | null;
  share_actions?: {
    last_7_days?: number | null;
    boundary_label?: string | null;
    count_method?: string | null;
    by_channel?: Array<{
      source?: string | null;
      label?: string | null;
      count?: number | null;
    }> | null;
  } | null;
  share_response?: {
    last_7_days?: number | null;
    shop_visits?: number | null;
    unique_visitors?: number | null;
    product_opens?: number | null;
    contact_taps?: number | null;
    boundary_label?: string | null;
    count_method?: string | null;
    by_channel?: Array<{
      source?: string | null;
      label?: string | null;
      shop_visits?: number | null;
      unique_visitors?: number | null;
      product_opens?: number | null;
      contact_taps?: number | null;
      total_events?: number | null;
    }> | null;
  } | null;
  recommendation_actions?: {
    last_7_days?: number | null;
    boundary_label?: string | null;
    count_method?: string | null;
    by_action?: Array<{
      action?: string | null;
      label?: string | null;
      count?: number | null;
      diagnosis?: string | null;
    }> | null;
  } | null;
  trade_outcomes?: {
    last_7_days?: number | null;
    shop_linked_records?: number | null;
    seller_side_records?: number | null;
    released_records?: number | null;
    payment_claimed_or_recorded?: number | null;
    receipt_confirmed?: number | null;
    dispute_records?: number | null;
    unresolved_records?: number | null;
    boundary_label?: string | null;
    count_method?: string | null;
    recent_records?: Array<{
      trade_id?: number | null;
      trade_code?: string | null;
      item_title?: string | null;
      status?: string | null;
      payment_status?: string | null;
      release_status?: string | null;
      receipt_status?: string | null;
      dispute_status?: string | null;
      linked_to_shop?: boolean | null;
    }> | null;
  } | null;
  daily_activity?: ShopAttentionDailyActivity[] | null;
  source_breakdown?: ShopAttentionSourceBreakdown[] | null;
  boundary_note?: string | null;
};

type RoscaRoundSummary = {
  round_number?: number | null;
  payout_user_id?: number | null;
  payout_amount?: string | null;
  due_at?: string | null;
  expected_count?: number | null;
  confirmed_count?: number | null;
  ready_for_payout?: boolean | null;
  payout_recorded?: boolean | null;
  status?: string | null;
};

type RoscaCycleSummary = {
  cycle_id?: string | null;
  title?: string | null;
  status?: string | null;
  currency?: string | null;
  contribution_amount?: string | null;
  total_rounds?: number | null;
  total_expected_contributions?: number | null;
  total_confirmed_contributions?: number | null;
  total_recorded_payouts?: number | null;
  member_user_ids?: number[] | null;
  payout_order_user_ids?: number[] | null;
  rounds?: RoscaRoundSummary[];
};

type CommunityMeetingAttendanceSession = {
  event_id?: number | null;
  attendance_session_id?: string | null;
  method?: string | null;
  method_label?: string | null;
  evidence_strength?: string | null;
  checkin_url?: string | null;
  attendance_token?: string | null;
  expires_at?: string | null;
  window_minutes?: number | null;
  automatic_bluetooth_scan?: boolean | null;
};

type BrowserBluetoothDevice = {
  id?: string | null;
  name?: string | null;
};

type BrowserBluetoothApi = {
  getAvailability?: () => Promise<boolean>;
  requestDevice?: (options: {
    acceptAllDevices: boolean;
    optionalServices?: string[];
  }) => Promise<BrowserBluetoothDevice>;
};

type NavigatorWithBluetooth = Navigator & {
  bluetooth?: BrowserBluetoothApi;
};

type CommunityMeetingRecord = {
  meeting_id?: string | null;
  title?: string | null;
  purpose?: string | null;
  scheduled_at?: string | null;
  summary?: string | null;
  decisions?: string | null;
  attendance_count?: number | null;
  attendee_user_ids?: number[] | null;
  whatsapp_share_text?: string | null;
  whatsapp_share_url?: string | null;
  action_url?: string | null;
  status?: string | null;
  reminder_event_id?: number | null;
  summary_event_id?: number | null;
  interest_summary?: {
    yes?: number | null;
    no?: number | null;
    maybe?: number | null;
    total?: number | null;
    own_response?: string | null;
    planning_ready?: boolean | null;
  } | null;
  attendance_summary?: {
    checkin_count?: number | null;
    checked_in_user_ids?: number[] | null;
    latest_checkin_at?: string | null;
    method_counts?: Record<string, number> | null;
    active_session?: CommunityMeetingAttendanceSession | null;
    presence_evidence_boundary?: string | null;
  } | null;
  created_at?: string | null;
};

type TrustSlipFeatureSummary = {
  merchant_verify_active?: boolean | null;
  merchant_verify_subscription_required?: boolean | null;
  merchant_verify_detail?: string | null;
  public_verify_url?: string | null;
  code?: string | null;
  verification_code?: string | null;
  token?: string | null;
};

type ContinuityReviewState = {
  blocked: boolean;
  reason: string;
};

type NoticeTone = "success" | "error" | "info";

type SpotlightFeedbackState = ShopControlSpotlightFeedback;

const OWNER_PUBLIC_PRODUCT_VISIBILITY_MODES = new Set([
  "community_visible",
  "public",
  "community",
  "public_gallery",
  "shop_gallery",
]);
type SpotlightFlowStep = ShopControlSpotlightFlowStep;
type SpotlightMediaChoice = ShopControlSpotlightMediaChoice;
type ShopControlLayerKey =
  | "overview"
  | "products"
  | "spotlight"
  | "shop-details"
  | "paid-tools"
  | "vault"
  | "summary";

type ShopAnalyticsPanelKey =
  | "key-metrics"
  | "view-contact"
  | "visitor-activity"
  | "trade-outcomes"
  | "traffic-sources"
  | "market-intelligence";

const SHOP_ANALYTICS_PANELS: Array<{
  key: ShopAnalyticsPanelKey;
  label: string;
  detail: string;
  icon: GsnIconName;
}> = [
  { key: "key-metrics", label: "Key Metrics", detail: "Last 7 days", icon: "chart" },
  { key: "view-contact", label: "View to Contact", detail: "Attention funnel", icon: "eye" },
  { key: "visitor-activity", label: "Visitor Activity", detail: "Visits and spotlight", icon: "community" },
  { key: "trade-outcomes", label: "Trade Outcome", detail: "Evidence records", icon: "document" },
  { key: "traffic-sources", label: "Traffic Sources", detail: "Where attention came from", icon: "copy" },
  { key: "market-intelligence", label: "Market Intelligence", detail: "What to do next", icon: "spark" },
];
function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function safePositiveNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function routeTarget(
  intent: CtaIntent,
  communityId: number,
  debugId: string,
  extra: { hash?: string } = {}
): string {
  return resolveCtaTarget(intent, {
    communityId,
    debugId,
    ...extra,
  }).to as string;
}

function appendRouteQueryParam(to: string, key: string, value: string): string {
  const [baseAndQuery, hash = ""] = to.split("#");
  const separator = baseAndQuery.includes("?") ? "&" : "?";
  const query = `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  return `${baseAndQuery}${separator}${query}${hash ? `#${hash}` : ""}`;
}

function isMerchantReleaseControlTarget(targetId: unknown): boolean {
  const normalized = safeStr(targetId).replace(/^#/, "").toLowerCase();
  return (
    normalized === OWNER_SHOP_HASHES.merchantRelease ||
    normalized.includes("merchant") ||
    normalized.includes("verify") ||
    normalized.includes("release")
  );
}

const SHOP_CONTROL_SHORTCUT_ICONS: Record<ShopControlShortcutId, GsnIconName> = {
  "shop-billboard": "shop",
  "shop-diaries": "document",
  "shop-summary": "chart",
  "community-package": "financeInstitution",
};

const SPOTLIGHT_ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const SPOTLIGHT_ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const SPOTLIGHT_IMAGE_TYPE_ALIASES: Record<string, string> = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-png": "image/png",
};
const SPOTLIGHT_VIDEO_TYPE_ALIASES: Record<string, string> = {
  "video/mov": "video/quicktime",
};
const SPOTLIGHT_GENERIC_IMAGE_TYPES = [
  "",
  "application/octet-stream",
  "binary/octet-stream",
];
const SPOTLIGHT_GENERIC_VIDEO_TYPES = [
  "",
  "application/octet-stream",
  "binary/octet-stream",
];
const SPOTLIGHT_ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const SPOTLIGHT_ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov"];
const SPOTLIGHT_ALLOWED_IMAGE_LABEL = "JPG, PNG, or WebP";
const SPOTLIGHT_ALLOWED_VIDEO_LABEL = "MP4, WebM, or MOV";

function firstTruthy(...values: unknown[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function marketIntelligenceActionKey(value: unknown, index: number): string {
  const text = safeStr(value).toLowerCase();
  if (text.includes("ask community")) return "ask_community";
  if (text.includes("demand box") || text.includes("demand")) return "open_demand_box";
  if (text.includes("protected trade") || text.includes("trade evidence") || text.includes("receipt evidence")) return "review_trade_evidence";
  if (text.includes("thumbnail") || text.includes("call-to-action") || text.includes("call to action")) return "improve_thumbnail";
  if (text.includes("product") || text.includes("inventory") || text.includes("shop block")) return "improve_products";
  if (text.includes("spotlight")) return "review_spotlight";
  if (text.includes("share") || text.includes("reach") || text.includes("traffic") || text.includes("distribution")) return "increase_distribution";
  return `advice_${index + 1}`;
}

const SHOP_DEMAND_CONTEXT_STOP_WORDS = new Set([
  "and",
  "are",
  "available",
  "buy",
  "for",
  "from",
  "has",
  "have",
  "need",
  "needs",
  "offer",
  "open",
  "please",
  "request",
  "sale",
  "sell",
  "service",
  "shop",
  "the",
  "this",
  "want",
  "with",
]);

const SHOP_SENSITIVE_DEMAND_TERMS = new Set([
  "asylum",
  "benefit",
  "benefits",
  "child",
  "children",
  "crisis",
  "debt",
  "doctor",
  "health",
  "hospital",
  "immigration",
  "legal",
  "medicine",
  "mental",
  "safeguarding",
  "shelter",
  "visa",
  "welfare",
]);

type ShopCommunityNeedOpportunityState =
  | "DIRECT_DEMAND_MATCH"
  | "INSUFFICIENT_EVIDENCE"
  | "STRONG_CAPABILITY_MATCH";

type ShopCommunityNeedOpportunity = {
  row: MarketplaceRequestItem;
  terms: string[];
  state: ShopCommunityNeedOpportunityState;
  stateLabel: string;
  confidence: "Low" | "Medium";
  categoryLabel: string;
  evidence: string;
  reason: string;
  primaryAction: "Respond in Demand Box" | "Read Demand Box" | "Add clearer offer";
  reviewTrigger: string;
};

function marketContextTokens(...values: unknown[]): Set<string> {
  const text = values.map((value) => safeStr(value).toLowerCase()).join(" ");
  const tokens = text
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(
      (token) => token.length >= 3 && !SHOP_DEMAND_CONTEXT_STOP_WORDS.has(token)
    );
  return new Set(tokens);
}

function demandCategoryToken(value: unknown): string {
  return safeStr(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isSensitiveDemandSignal(row: MarketplaceRequestItem): boolean {
  const tokens = marketContextTokens(row.title, row.category, row.description, row.area);
  return [...tokens].some((token) => SHOP_SENSITIVE_DEMAND_TERMS.has(token));
}

function productCapabilityTokens(products: ProductRecord[]): Set<string> {
  return marketContextTokens(
    ...products.flatMap((item) => [
      item.name,
      item.description,
      item.price,
      item.category,
      item.categories,
      item.service_category,
    ])
  );
}

function sharedMarketContextTerms(
  demand: MarketplaceRequestItem,
  products: ProductRecord[]
): string[] {
  const demandTokens = marketContextTokens(
    demand.title,
    demand.category,
    demand.description,
    demand.area
  );
  if (!demandTokens.size) return [];

  const productTokens = productCapabilityTokens(products);
  if (!productTokens.size) return [];

  return [...demandTokens]
    .filter((token) => productTokens.has(token))
    .slice(0, 4);
}

function demandCategoryMatchesProducts(
  demand: MarketplaceRequestItem,
  products: ProductRecord[]
): boolean {
  const demandCategory = demandCategoryToken(demand.category);
  if (!demandCategory) return false;

  return products.some((item) => {
    const productCategoryText = demandCategoryToken([
      item.category,
      item.categories,
      item.service_category,
      item.name,
      item.description,
    ]);
    return Boolean(
      productCategoryText &&
        (productCategoryText.includes(demandCategory) ||
          demandCategory.includes(productCategoryText))
    );
  });
}

function buildShopCommunityNeedOpportunities(
  rows: MarketplaceRequestItem[],
  products: ProductRecord[]
): ShopCommunityNeedOpportunity[] {
  return rows
    .filter((row) => !isSensitiveDemandSignal(row))
    .map((row) => {
      const terms = sharedMarketContextTerms(row, products);
      const categoryMatch = demandCategoryMatchesProducts(row, products);
      const hasCapabilitySignal = terms.length > 0 || categoryMatch;
      const confidence: "Low" | "Medium" =
        terms.length >= 2 || (categoryMatch && terms.length >= 1) ? "Medium" : "Low";
      const state: ShopCommunityNeedOpportunityState = hasCapabilitySignal
        ? categoryMatch
          ? "STRONG_CAPABILITY_MATCH"
          : "DIRECT_DEMAND_MATCH"
        : "INSUFFICIENT_EVIDENCE";
      const primaryAction: ShopCommunityNeedOpportunity["primaryAction"] =
        hasCapabilitySignal ? "Respond in Demand Box" : "Read Demand Box";

      return {
        row,
        terms,
        state,
        stateLabel:
          state === "STRONG_CAPABILITY_MATCH"
            ? "Strong capability match"
            : state === "DIRECT_DEMAND_MATCH"
              ? "Direct demand match"
              : "Insufficient evidence",
        confidence,
        categoryLabel: firstTruthy(row.category, "Community need"),
        evidence: hasCapabilitySignal
          ? "One active Demand Box request; one request, not a trend."
          : "One active request exists, but this shop link is not clear yet.",
        reason: hasCapabilitySignal
          ? "This may fit your shop because the request shares category or wording with your public offers."
          : "Read the request before changing products; the current evidence is too small for an offer decision.",
        primaryAction,
        reviewTrigger: hasCapabilitySignal
          ? "Review after you respond, create an offer, or receive five more product opens."
          : "Watch the category or validate later with Ask Community when that governed pulse is ready.",
      };
    })
    .sort((a, b) => {
      const score = (item: ShopCommunityNeedOpportunity) =>
        (item.state === "STRONG_CAPABILITY_MATCH" ? 3 : item.state === "DIRECT_DEMAND_MATCH" ? 2 : 1) *
          10 +
        item.terms.length;
      return score(b) - score(a);
    })
    .slice(0, 3);
}
function extractPublicBlockNumber(description: string): number {
  const match = safeStr(description).match(/^\[BLOCK:(\d{1,2})\]\s*/i);
  const value = Number(match?.[1] || 0);
  return value >= 1 ? value : 0;
}

function publicBlockNumberForProduct(item: ProductRecord | null | undefined): number {
  const explicitBlock = Number(
    firstTruthy(
      item?.public_block_number,
      item?.slot_number,
      item?.source_product_slot_number,
      item?.sourceProductSlotNumber,
      item?.block,
      item?.block_number
    )
  );
  if (explicitBlock >= 1) return explicitBlock;

  return extractPublicBlockNumber(firstTruthy(item?.description));
}

function productDisplayRank(item: ProductRecord | null | undefined): {
  createdMs: number;
  id: number;
} {
  const createdMs = Date.parse(firstTruthy(item?.created_at));
  return {
    createdMs: Number.isFinite(createdMs) ? createdMs : 0,
    id: Number(item?.id || 0),
  };
}

function isNewerProductCandidate(
  candidate: ProductRecord,
  current: ProductRecord | null | undefined
): boolean {
  if (!current) return true;

  const candidateRank = productDisplayRank(candidate);
  const currentRank = productDisplayRank(current);
  if (candidateRank.createdMs !== currentRank.createdMs) {
    return candidateRank.createdMs > currentRank.createdMs;
  }

  return candidateRank.id > currentRank.id;
}

function arrangePublicProductsIntoSlots(
  items: ProductRecord[],
  slotCount: number
): (ProductRecord | null)[] {
  const safeSlotCount = Math.max(1, Math.floor(slotCount || 12));
  const slots: (ProductRecord | null)[] = Array.from(
    { length: safeSlotCount },
    () => null
  );
  const overflow: ProductRecord[] = [];

  items.forEach((item) => {
    const blockNumber = publicBlockNumberForProduct(item);
    if (blockNumber >= 1 && blockNumber <= safeSlotCount) {
      if (isNewerProductCandidate(item, slots[blockNumber - 1])) {
        slots[blockNumber - 1] = item;
      }
      return;
    }

    overflow.push(item);
  });

  overflow.forEach((item) => {
    const emptyIndex = slots.findIndex((slot) => slot === null);
    if (emptyIndex >= 0) {
      slots[emptyIndex] = item;
    }
  });

  return slots;
}

function formatFileSize(bytes: number): string {
  const size = Number(bytes || 0);
  if (!Number.isFinite(size) || size <= 0) return "0 KB";
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function spotlightMediaExtension(filename: string): string {
  const raw = safeStr(filename).toLowerCase();
  const dot = raw.lastIndexOf(".");
  return dot >= 0 ? raw.slice(dot) : "";
}

function normalizeSpotlightImageType(contentType: string): string {
  const raw = safeStr(contentType).toLowerCase().split(";")[0]?.trim() || "";
  return SPOTLIGHT_IMAGE_TYPE_ALIASES[raw] || raw;
}

function normalizeSpotlightVideoType(contentType: string): string {
  const raw = safeStr(contentType).toLowerCase().split(";")[0]?.trim() || "";
  return SPOTLIGHT_VIDEO_TYPE_ALIASES[raw] || raw;
}

function validateSpotlightImageFile(
  file: File | null | undefined,
  enforceSize = true
): string {
  if (!file) return "";

  const contentType = normalizeSpotlightImageType(file.type);
  const ext = spotlightMediaExtension(file.name);
  const hasAcceptedType = SPOTLIGHT_ALLOWED_IMAGE_TYPES.includes(contentType);
  const hasAcceptedExtension = SPOTLIGHT_ALLOWED_IMAGE_EXTENSIONS.includes(ext);
  const hasGenericType = SPOTLIGHT_GENERIC_IMAGE_TYPES.includes(contentType);

  if (!hasAcceptedType && !(hasGenericType && hasAcceptedExtension)) {
    return `Use a ${SPOTLIGHT_ALLOWED_IMAGE_LABEL} image. Other formats are not accepted yet.`;
  }

  if (enforceSize && Number(file.size || 0) > SPOTLIGHT_MAX_IMAGE_BYTES) {
    return `Image is ${formatFileSize(
      file.size
    )}. Spotlight images must be 10 MB or smaller.`;
  }

  return "";
}

function validateSpotlightVideoFile(
  file: File | null | undefined,
  enforceSize = true
): string {
  if (!file) return "";

  const contentType = normalizeSpotlightVideoType(file.type);
  const ext = spotlightMediaExtension(file.name);
  const hasAcceptedType = SPOTLIGHT_ALLOWED_VIDEO_TYPES.includes(contentType);
  const hasAcceptedExtension = SPOTLIGHT_ALLOWED_VIDEO_EXTENSIONS.includes(ext);
  const hasGenericType = SPOTLIGHT_GENERIC_VIDEO_TYPES.includes(contentType);

  if (!hasAcceptedType && !(hasGenericType && hasAcceptedExtension)) {
    return `Use a ${SPOTLIGHT_ALLOWED_VIDEO_LABEL} video. Other formats are not accepted yet.`;
  }

  if (enforceSize && Number(file.size || 0) > SPOTLIGHT_MAX_VIDEO_BYTES) {
    return `Video is ${formatFileSize(
      file.size
    )}. Spotlight videos must be 15 MB or smaller.`;
  }

  return "";
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 26,
    border: "1px solid rgba(18,58,89,0.18)",
    background: bg === "#FFFFFF" ? "linear-gradient(180deg, #FDFEFF 0%, #EEF5FF 100%)" : bg,
    padding: "clamp(14px, 3.3vw, 20px)",
    boxShadow:
      "0 22px 48px rgba(2,12,27,0.15), 0 8px 20px rgba(8,40,72,0.09), inset 0 1px 0 rgba(255,255,255,0.94), inset 0 -2px 0 rgba(8,40,72,0.07)",
    overflow: "hidden",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(18,58,89,0.16)",
    background: bg === "#F8FBFF" ? "linear-gradient(180deg, #F5F9FF 0%, #E5EEFB 100%)" : bg,
    padding: 15,
    boxShadow:
      "0 14px 28px rgba(7,24,39,0.09), inset 0 1px 0 rgba(255,255,255,0.90), inset 0 -2px 0 rgba(8,40,72,0.06)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(18,58,89,0.16)",
    background: bg === "#F8FBFF" ? "linear-gradient(180deg, #F5F9FF 0%, #E5EEFB 100%)" : bg,
    padding: 12,
    boxShadow:
      "0 12px 26px rgba(7,24,39,0.08), inset 0 1px 0 rgba(255,255,255,0.90), inset 0 -2px 0 rgba(8,40,72,0.05)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4E6680",
    fontWeight: 900,
    letterSpacing: 0,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#466078",
    fontSize: 14,
    lineHeight: 1.68,
  };
}

function inlineIcon(
  name: GsnIconName,
  color = "currentColor",
  size = 15
): React.ReactNode {
  return (
    <span
      aria-hidden="true"
      style={{
        flex: "0 0 auto",
        width: Math.max(20, size + 7),
        height: Math.max(20, size + 7),
        borderRadius: 8,
        display: "inline-grid",
        placeItems: "center",
        color,
        background: "rgba(255,255,255,0.96)",
        border: "1px solid rgba(13,95,168,0.14)",
        boxShadow:
          "0 8px 16px rgba(6,24,39,0.08), inset 0 1px 0 rgba(255,255,255,0.96)",
        verticalAlign: "-5px",
      }}
    >
      <GsnLegacyIcon name={name} size={size} />
    </span>
  );
}

function labelWithIcon(
  name: GsnIconName,
  label: React.ReactNode,
  color = "currentColor"
): React.ReactNode {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, minWidth: 0 }}>
      {inlineIcon(name, color)}
      <span>{label}</span>
    </span>
  );
}

function controlIconTile(
  name: GsnIconName,
  active = true,
  size = 32
): React.ReactNode {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 54,
        height: 54,
        borderRadius: 18,
        display: "grid",
        placeItems: "center",
        color: active ? "#7A4A00" : "#0B63D1",
        background: "rgba(255,255,255,0.96)",
        border: active
          ? "1px solid rgba(226,192,106,0.34)"
          : "1px solid rgba(13,95,168,0.14)",
        boxShadow:
          "0 10px 18px rgba(6,24,39,0.08), inset 0 1px 0 rgba(255,255,255,0.96)",
      }}
    >
      <GsnLegacyIcon name={name} size={size} />
    </div>
  );
}

function heroShortcutIconTile(name: GsnIconName): React.ReactNode {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 38,
        height: 38,
        borderRadius: 14,
        display: "inline-grid",
        placeItems: "center",
        flex: "0 0 auto",
        background: "rgba(255,255,255,0.98)",
        border: "1px solid rgba(246,215,122,0.30)",
        boxShadow:
          "0 12px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.96)",
        color: "#7A4A00",
      }}
    >
      <GsnLegacyIcon name={name} size={32} />
    </span>
  );
}

function safeDateTime(value: unknown): string {
  const raw = safeStr(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleString();
}

function featureEvidenceLine(
  payment: ExpectedPaymentRecord | null | undefined,
  options: {
    active: boolean;
    activeText: string;
    awaitingText: string;
    confirmedText: string;
  }
): string {
  if (options.active) return options.activeText;
  if (!payment) return options.awaitingText;
  if (safeStr(payment.confirmed_at)) return options.confirmedText;
  return `Waiting for payment confirmation after reference ${firstTruthy(
    payment.reference_display,
    "is issued"
  )}.`;
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    background: primary
      ? "linear-gradient(180deg, #FFF9D8 0%, #F2D16E 100%)"
      : "linear-gradient(180deg, #FFFFFF 0%, #EAF4FF 100%)",
    color: primary ? "#6F4C00" : "#1D4267",
    border: primary
      ? "1px solid rgba(217,172,51,0.26)"
      : "1px solid rgba(13,95,168,0.11)",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
    textAlign: "center",
    boxShadow: primary
      ? "0 7px 14px rgba(217,172,51,0.13), inset 0 1px 0 rgba(255,255,255,0.72)"
      : "0 6px 12px rgba(7,24,39,0.06), inset 0 1px 0 rgba(255,255,255,0.82)",
  };
}

function controlGrid(isCompact: boolean, minWidth = 138): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: isCompact
      ? "repeat(2, minmax(0, 1fr))"
      : `repeat(auto-fit, minmax(${minWidth}px, 1fr))`,
    gridAutoRows: isCompact ? "64px" : "56px",
    gap: 10,
    alignItems: "stretch",
    overflowAnchor: "none",
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 48,
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    padding: "11px 12px",
    fontFamily: "inherit",
    fontSize: 16,
    lineHeight: 1.35,
    color: "#0B1F33",
    outline: "none",
    boxSizing: "border-box",
    appearance: "none",
    WebkitAppearance: "none",
    touchAction: "manipulation",
    overflowAnchor: "none",
  };
}

function textAreaStyle(): React.CSSProperties {
  return {
    ...inputStyle(),
    minHeight: 96,
    resize: "none",
    overflow: "auto",
    lineHeight: 1.45,
  };
}

const SHOP_CONTROL_SOFT_PLACEHOLDER_CLASS = "shop-control-soft-placeholder";

function ShopControlFieldPolish() {
  return (
    <style>
      {`
        .${SHOP_CONTROL_SOFT_PLACEHOLDER_CLASS}::placeholder {
          color: rgba(82, 101, 121, 0.42);
          font-weight: 500;
          opacity: 1;
        }
      `}
    </style>
  );
}

function statTile(): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(18,58,89,0.14)",
    background:
      "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 48%, #EAF4FF 100%)",
    padding: 14,
    boxShadow:
      "0 14px 26px rgba(7,24,39,0.08), inset 0 1px 0 rgba(255,255,255,0.90), inset 0 -2px 0 rgba(8,40,72,0.05)",
  };
}

type AnalyticsAccent = "green" | "gold" | "blue" | "purple" | "red" | "navy";

const ANALYTICS_ACCENTS: Record<AnalyticsAccent, { bg: string; border: string; color: string }> = {
  green: { bg: "linear-gradient(180deg, #F3FFF9 0%, #E6FBF2 100%)", border: "rgba(46,155,98,0.24)", color: "#1F8A57" },
  gold: { bg: "linear-gradient(180deg, #FFF9E7 0%, #FFF1C7 100%)", border: "rgba(214,170,69,0.34)", color: "#B47B00" },
  blue: { bg: "linear-gradient(180deg, #F3F9FF 0%, #E5F1FF 100%)", border: "rgba(32,116,204,0.22)", color: "#176FC2" },
  purple: { bg: "linear-gradient(180deg, #F7F5FF 0%, #ECEBFF 100%)", border: "rgba(91,84,196,0.22)", color: "#574EC6" },
  red: { bg: "linear-gradient(180deg, #FFF5F6 0%, #FFECEE 100%)", border: "rgba(200,58,58,0.18)", color: "#C83A3A" },
  navy: { bg: "linear-gradient(180deg, #F8FBFF 0%, #EAF4FF 100%)", border: "rgba(18,58,89,0.16)", color: "#0B2D4A" },
};

function shopAnalyticsMetricCardStyle(accent: AnalyticsAccent): React.CSSProperties {
  const palette = ANALYTICS_ACCENTS[accent];
  return {
    ...statTile(),
    minWidth: 0,
    overflow: "hidden",
    padding: 10,
    minHeight: 112,
    display: "grid",
    alignContent: "space-between",
    border: `1px solid ${palette.border}`,
    background: palette.bg,
  };
}

function shopAnalyticsIconTile(accent: AnalyticsAccent): React.CSSProperties {
  const palette = ANALYTICS_ACCENTS[accent];
  return {
    width: 36,
    height: 36,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    color: palette.color,
    background: "rgba(255,255,255,0.78)",
    boxShadow: "0 10px 18px rgba(8,38,67,0.08), inset 0 1px 0 rgba(255,255,255,0.92)",
  };
}

function shopAnalyticsMetricLabelStyle(label: string): React.CSSProperties {
  const compactLabel = label.length > 8;
  return {
    ...sectionLabel(),
    flex: "1 1 0",
    minWidth: 0,
    textAlign: "right",
    lineHeight: 1.12,
    fontSize: compactLabel ? 9.2 : 10.5,
    letterSpacing: 0,
    overflowWrap: "normal",
    wordBreak: "keep-all",
    hyphens: "none",
  };
}

function ShopAnalyticsMetricCard({
  icon,
  label,
  value,
  detail,
  accent,
}: {
  icon: GsnIconName;
  label: string;
  value: React.ReactNode;
  detail: string;
  accent: AnalyticsAccent;
}) {
  return (
    <div style={shopAnalyticsMetricCardStyle(accent)}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div style={{ ...shopAnalyticsIconTile(accent), flex: "0 0 auto", width: 36, height: 36, borderRadius: 14 }} aria-hidden="true">
          <GsnLegacyIcon name={icon} size={24} />
        </div>
        <div style={shopAnalyticsMetricLabelStyle(label)}>{label}</div>
      </div>
      <div>
        <div style={{ color: "#061827", fontSize: 26, fontWeight: 950, lineHeight: 1, overflowWrap: "anywhere" }}>{value}</div>
        <div style={{ ...helperText(), marginTop: 8, fontSize: 12, lineHeight: 1.35 }}>{detail}</div>
      </div>
    </div>
  );
}

function ShopAnalyticsFunnelStep({
  icon,
  label,
  value,
  detail,
  rateLabel,
  strong,
}: {
  icon: GsnIconName;
  label: string;
  value: number;
  detail: string;
  rateLabel: string;
  strong?: boolean;
}) {
  return (
    <div
      style={{
        borderRadius: 18,
        border: strong ? "1px solid rgba(255,255,255,0.36)" : "1px solid rgba(18,58,89,0.12)",
        background: strong
          ? "linear-gradient(180deg, #0F79D0 0%, #2C94E6 100%)"
          : "linear-gradient(180deg, #F7FBFF 0%, #E7F3FF 100%)",
        color: strong ? "#FFFFFF" : "#0B2D4A",
        padding: "14px 12px",
        minHeight: 160,
        display: "grid",
        alignContent: "space-between",
        boxShadow: "0 14px 28px rgba(8,38,67,0.08), inset 0 1px 0 rgba(255,255,255,0.86)",
      }}
    >
      <div style={{ display: "grid", justifyItems: "center", gap: 6, textAlign: "center" }}>
        <GsnLegacyIcon name={icon} size={32} />
        <div style={{ fontSize: 13, fontWeight: 900, lineHeight: 1.2 }}>{label}</div>
        <div style={{ fontSize: 30, fontWeight: 950, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, fontWeight: 750, lineHeight: 1.25, opacity: strong ? 0.92 : 0.82 }}>{detail}</div>
      </div>
      <div
        style={{
          justifySelf: "center",
          borderRadius: 999,
          padding: "5px 12px",
          background: strong ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.92)",
          color: strong ? "#FFFFFF" : "#0F5EAA",
          fontSize: 12,
          fontWeight: 900,
        }}
      >
        {rateLabel}
      </div>
    </div>
  );
}

function shortAnalyticsDateLabel(value: unknown): string {
  const text = safeStr(value);
  if (!text) return "Day";
  const parsed = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return text.slice(5) || text;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function noticeCard(tone: NoticeTone): React.CSSProperties {
  if (tone === "success") {
    return {
      ...softCard("#F3FBF5"),
      color: "#166534",
      border: "1px solid rgba(34,197,94,0.16)",
      fontWeight: 800,
    };
  }

  if (tone === "error") {
    return {
      ...softCard("#FEF2F2"),
      color: "#991B1B",
      border: "1px solid rgba(239,68,68,0.16)",
      fontWeight: 800,
    };
  }

  return {
    ...softCard("#F8FBFF"),
    color: "#24415C",
    border: "1px solid rgba(11,31,51,0.08)",
    fontWeight: 800,
  };
}

function getToken(): string {
  try {
    return localStorage.getItem("access_token") || "";
  } catch {
    return "";
  }
}

function apiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";

  const base = String(raw || "").trim().replace(/\/+$/, "");
  if (!base || !/^https?:\/\//i.test(base)) return base;

  try {
    const url = new URL(base);
    const path = url.pathname.replace(/\/+$/, "");
    if (path.toLowerCase() === "/api") {
      return url.origin;
    }

    url.search = "";
    url.hash = "";
    url.pathname = path;
    return url.toString().replace(/\/+$/, "");
  } catch {
    return base;
  }
}

function apiUrl(path: string): string {
  const raw = safeStr(path);
  if (/^https?:\/\//i.test(raw)) return raw;

  let cleanPath = raw.startsWith("/") ? raw : `/${raw}`;
  if (cleanPath.startsWith("/api/")) cleanPath = cleanPath.slice(4);

  return `${apiBase()}${cleanPath}`;
}

function shopControlRequestErrorMessage(error: any): string {
  const governedMessage = marketplaceGovernanceErrorMessage(error);
  const message = safeStr(governedMessage || error?.message || error);
  const lower = message.toLowerCase();
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("server did not finish") ||
    lower.includes("check your connection")
  ) {
    return (
      "GSN could not publish from this browser yet. Check your connection, reopen GSN if needed, then tap Publish again."
    );
  }
  return message || "Shop Control could not complete that request.";
}

const SHOP_CONTROL_JSON_TIMEOUT_MS = 30000;

async function fetchShopControlJson(
  input: RequestInfo | URL,
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(
    () => controller.abort(),
    SHOP_CONTROL_JSON_TIMEOUT_MS
  );

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(
        "The server did not finish this request. Please check your connection and try again."
      );
    }
    throw err;
  } finally {
    globalThis.clearTimeout(timer);
  }
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init?.headers || {});
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (!headers.has("Content-Type") && !(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetchShopControlJson(apiUrl(path), {
      ...init,
      headers,
      credentials: "include",
    });
  } catch (err: any) {
    throw new Error(shopControlRequestErrorMessage(err));
  }

  const text = await res.text();
  const contentType = String(res.headers.get("content-type") || "").toLowerCase();

  if (!res.ok) {
    let message = text || `HTTP ${res.status}`;
    try {
      const parsed = text ? JSON.parse(text) : {};
      const detail = parsed?.detail;
      message =
        detail && typeof detail === "object"
          ? JSON.stringify(detail)
          : detail || parsed?.message || message;
    } catch {
      // Keep the original response text.
    }
    throw new Error(String(message));
  }

  if (!text) return {} as T;
  if (contentType.includes("application/json")) return JSON.parse(text) as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return { raw: text } as T;
  }
}

export default function ShopControlPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(
    null
  );

  const [me, setMe] = useState<any>(null);
  const [continuityReview, setContinuityReview] = useState<ContinuityReviewState>({
    blocked: false,
    reason: "",
  });
  const [shop, setShop] = useState<ShopRecord | null>(null);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [spotlights, setSpotlights] = useState<BroadcastRecord[]>([]);
  const [vaultLinks, setVaultLinks] = useState<VaultLinkRecord[]>([]);
  const [activeOwnerLayer, setActiveOwnerLayer] =
    useState<ShopControlLayerKey>("overview");
  const [activeAnalyticsPanel, setActiveAnalyticsPanel] =
    useState<ShopAnalyticsPanelKey | "">("");
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [expectedPayments, setExpectedPayments] = useState<ExpectedPaymentRecord[]>([]);
  const [communityPackageStatus, setCommunityPackageStatus] =
    useState<CommunityPackageStatus | null>(null);
  const [shopAttentionSummary, setShopAttentionSummary] =
    useState<ShopAttentionSummary | null>(null);
  const [loggedRecommendationActionKeys, setLoggedRecommendationActionKeys] =
    useState<Set<string>>(() => new Set());
  const [openDemandRows, setOpenDemandRows] = useState<MarketplaceRequestItem[]>([]);
  const [roscaCycles, setRoscaCycles] = useState<RoscaCycleSummary[]>([]);
  const [communityMeetings, setCommunityMeetings] = useState<CommunityMeetingRecord[]>(
    []
  );
  const [roscaTitle, setRoscaTitle] = useState("Community ROSCA cycle");
  const [roscaContributionAmount, setRoscaContributionAmount] = useState("25.00");
  const [roscaCurrency, setRoscaCurrency] = useState("GBP");
  const [roscaIntervalDays, setRoscaIntervalDays] = useState("30");
  const [startingRoscaCycle, setStartingRoscaCycle] = useState(false);
  const [recordingRoscaPayoutKey, setRecordingRoscaPayoutKey] = useState<string | null>(
    null
  );
  const [trustSlipFeature, setTrustSlipFeature] = useState<TrustSlipFeatureSummary | null>(
    null
  );
  const [creatingVaultInstruction, setCreatingVaultInstruction] = useState(false);
  const [creatingCommunityPackageCode, setCreatingCommunityPackageCode] =
    useState<string | null>(null);
  const [meetingTitle, setMeetingTitle] = useState("Community meeting");
  const [meetingPurpose, setMeetingPurpose] = useState("");
  const [meetingScheduledAt, setMeetingScheduledAt] = useState("");
  const [meetingWhatsappNumber, setMeetingWhatsappNumber] = useState("");
  const [creatingMeetingReminder, setCreatingMeetingReminder] = useState(false);
  const [meetingSummary, setMeetingSummary] = useState("");
  const [meetingDecisions, setMeetingDecisions] = useState("");
  const [meetingAttendanceCount, setMeetingAttendanceCount] = useState("");
  const [meetingAttendanceMethod, setMeetingAttendanceMethod] = useState<"qr" | "bluetooth_proximity">("qr");
  const [meetingAttendanceWindowMinutes, setMeetingAttendanceWindowMinutes] = useState("120");
  const [openedAttendanceSession, setOpenedAttendanceSession] =
    useState<CommunityMeetingAttendanceSession | null>(null);
  const [openingAttendanceSession, setOpeningAttendanceSession] = useState(false);
  const [recordingAttendanceCheckin, setRecordingAttendanceCheckin] = useState(false);
  const [checkingBluetoothPresence, setCheckingBluetoothPresence] = useState(false);
  const [bluetoothPresenceStatus, setBluetoothPresenceStatus] = useState("");
  const [recordingMeetingSummary, setRecordingMeetingSummary] = useState(false);
  const [recordingMeetingInterest, setRecordingMeetingInterest] = useState<string | null>(null);
  const [creatingVaultLink, setCreatingVaultLink] = useState(false);
  const [busyVaultLinkId, setBusyVaultLinkId] = useState<number | null>(null);
  const [busyVaultLinkAction, setBusyVaultLinkAction] = useState<"extend" | "revoke" | null>(
    null
  );
  const [creatingMerchantVerifyInstruction, setCreatingMerchantVerifyInstruction] =
    useState(false);
  const [shopName, setShopName] = useState("");
  const [shopDescription, setShopDescription] = useState("");
  const [whatsApp, setWhatsApp] = useState("");
  const [telegramHandle, setTelegramHandle] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [savingShop, setSavingShop] = useState(false);

  const [spotlightProductName, setSpotlightProductName] = useState("");
  const [spotlightPriceNote, setSpotlightPriceNote] = useState("");
  const [spotlightMessage, setSpotlightMessage] = useState("");
  const [spotlightImageUrl, setSpotlightImageUrl] = useState("");
  const [spotlightVideoUrl, setSpotlightVideoUrl] = useState("");
  const [spotlightImageFile, setSpotlightImageFile] = useState<File | null>(null);
  const [spotlightVideoFile, setSpotlightVideoFile] = useState<File | null>(null);
  const [spotlightImagePreviewUrl, setSpotlightImagePreviewUrl] = useState("");
  const [spotlightVideoPreviewUrl, setSpotlightVideoPreviewUrl] = useState("");
  const [spotlightVideoDurationSeconds, setSpotlightVideoDurationSeconds] =
    useState<number | null>(null);
  const [spotlightImageInputKey, setSpotlightImageInputKey] = useState(0);
  const [spotlightVideoInputKey, setSpotlightVideoInputKey] = useState(0);
  const [preparingSpotlightImage, setPreparingSpotlightImage] = useState(false);
  const [preparingSpotlightVideo, setPreparingSpotlightVideo] = useState(false);
  const [creatingSpotlight, setCreatingSpotlight] = useState(false);
  const [creatingSpotlightShop, setCreatingSpotlightShop] = useState(false);
  const [spotlightPriorityMode, setSpotlightPriorityMode] = useState<ShopControlSpotlightPriorityMode>("free");
  const [spotlightPublishFeedback, setSpotlightPublishFeedback] =
    useState<SpotlightFeedbackState>(null);
  const [spotlightFlowStep, setSpotlightFlowStep] = useState<SpotlightFlowStep>("upload");
  const [spotlightMediaChoice, setSpotlightMediaChoice] =
    useState<SpotlightMediaChoice>("image");
  const spotlightImagePrepJobRef = useRef(0);
  const spotlightVideoPrepJobRef = useRef(0);
  const lastAutoScrolledHashRef = useRef("");
  const controlRevealFrameRef = useRef<number | null>(null);
  const controlRevealTargetRef = useRef("");
  const spotlightIdleTimerRef = useRef<number | null>(null);
  const spotlightSuccessTimerRef = useRef<number | null>(null);
  const [communityDomainPolicyPayload, setCommunityDomainPolicyPayload] =
    useState<any>(null);

  const selectedClanId = Number(getSelectedClanId() || 0);
  const shopActionsLocked = Boolean(continuityReview.blocked);
  const identityLockNotice = shopActionsLocked
    ? firstTruthy(
        continuityReview.reason,
        "Identity continuity needs review before protected shop actions can run."
      )
    : "";
  const effectiveShopClanId = Number(shop?.clan_id || selectedClanId || 0);
  const shopControlPolicyCommunityId = Number(effectiveShopClanId || selectedClanId || 0);
  const shopControlDomainFallbackName = useMemo(
    () => firstTruthy(shop?.marketplace_name, "this Community Domain"),
    [shop?.marketplace_name]
  );
  const marketplaceShopsDomainFeatureMatch = useMemo(
    () =>
      communityDomainFeatureModeFromPayload(
        communityDomainPolicyPayload,
        shopControlPolicyCommunityId,
        "marketplace_shops"
      ),
    [communityDomainPolicyPayload, shopControlPolicyCommunityId]
  );
  const marketplaceShopsFeatureOff = communityDomainFeatureIsOff(
    marketplaceShopsDomainFeatureMatch
  );
  const marketplaceShopsFeatureOffText = communityDomainFeatureOffMessage(
    "Marketplace Shops",
    marketplaceShopsDomainFeatureMatch?.domainName || shopControlDomainFallbackName
  );
  const spotlightDomainFeatureMatch = useMemo(
    () =>
      communityDomainFeatureModeFromPayload(
        communityDomainPolicyPayload,
        shopControlPolicyCommunityId,
        "spotlight"
      ),
    [communityDomainPolicyPayload, shopControlPolicyCommunityId]
  );
  const spotlightFeatureOff = communityDomainFeatureIsOff(
    spotlightDomainFeatureMatch
  );
  const spotlightFeatureOffText = communityDomainFeatureOffMessage(
    "Spotlight",
    spotlightDomainFeatureMatch?.domainName || shopControlDomainFallbackName
  );
  const vaultDomainFeatureMatch = useMemo(
    () =>
      communityDomainFeatureModeFromPayload(
        communityDomainPolicyPayload,
        shopControlPolicyCommunityId,
        "vault"
      ),
    [communityDomainPolicyPayload, shopControlPolicyCommunityId]
  );
  const vaultFeatureOff = communityDomainFeatureIsOff(vaultDomainFeatureMatch);
  const vaultFeatureOffText = communityDomainFeatureOffMessage(
    "Vault",
    vaultDomainFeatureMatch?.domainName || shopControlDomainFallbackName
  );
  const roscaCyclesDomainFeatureMatch = useMemo(
    () =>
      communityDomainFeatureModeFromPayload(
        communityDomainPolicyPayload,
        shopControlPolicyCommunityId,
        "rosca_cycles"
      ),
    [communityDomainPolicyPayload, shopControlPolicyCommunityId]
  );
  const roscaCyclesFeatureOff = communityDomainFeatureIsOff(
    roscaCyclesDomainFeatureMatch
  );
  const roscaCyclesFeatureOffText = communityDomainFeatureOffMessage(
    "ROSCA Cycles",
    roscaCyclesDomainFeatureMatch?.domainName || shopControlDomainFallbackName
  );
  const routes = useMemo(
    () => ({
      dashboard: routeTarget(
        "dashboard",
        effectiveShopClanId,
        "shop-control.route.dashboard"
      ),
      marketplace: routeTarget(
        "marketplace",
        effectiveShopClanId,
        "shop-control.route.marketplace"
      ),
      demandBox: routeTarget(
        "demandBox",
        effectiveShopClanId,
        "shop-control.route.demand-box"
      ),
      askCommunity: appendRouteQueryParam(
        routeTarget(
          "marketplace",
          effectiveShopClanId,
          "shop-control.route.ask-community",
          { hash: "marketplace-official-board" }
        ),
        "ask_market",
        "1"
      ),
      tradeEvidence: routeTarget(
        "marketplace",
        effectiveShopClanId,
        "shop-control.route.trade-evidence",
        { hash: "marketplace-trade-evidence" }
      ),
      shop: routeTarget("shop", effectiveShopClanId, "shop-control.route.shop"),
      shopGallery: routeTarget(
        "shop",
        effectiveShopClanId,
        "shop-control.route.gallery",
        { hash: OWNER_SHOP_HASHES.diaries }
      ),
      shopDetails: routeTarget(
        "shop",
        effectiveShopClanId,
        "shop-control.route.details",
        { hash: OWNER_SHOP_HASHES.billboard }
      ),
      shopSummary: routeTarget(
        "shop",
        effectiveShopClanId,
        "shop-control.route.summary",
        { hash: OWNER_SHOP_HASHES.summary }
      ),
      communityPackages: routeTarget(
        "shop",
        effectiveShopClanId,
        "shop-control.route.community-packages",
        { hash: OWNER_SHOP_HASHES.communityPackage }
      ),
      shopAssets: routeTarget(
        "shopAssets",
        effectiveShopClanId,
        "shop-control.route.shop-assets"
      ),
      freeSpotlight: routeTarget(
        "freeSpotlight",
        effectiveShopClanId,
        "shop-control.route.free-spotlight"
      ),
      subscriptionSpotlight: routeTarget(
        "subscriptionSpotlight",
        effectiveShopClanId,
        "shop-control.route.subscription-spotlight"
      ),
      paidRepost: routeTarget(
        "marketplace",
        effectiveShopClanId,
        "shop-control.route.paid-repost",
        { hash: PAID_REPOST_HASH }
      ),
      vaultControl: routeTarget(
        "vaultControl",
        effectiveShopClanId,
        "shop-control.route.vault-control"
      ),
      trustSlip: routeTarget(
        "trustSlip",
        effectiveShopClanId,
        "shop-control.route.trust-slip"
      ),
    }),
    [effectiveShopClanId]
  );

  useEffect(() => {
    let alive = true;

    if (!shopControlPolicyCommunityId) {
      setCommunityDomainPolicyPayload(null);
      return () => {
        alive = false;
      };
    }

    listMyCommunityDomains()
      .then((payload) => {
        if (alive) setCommunityDomainPolicyPayload(payload);
      })
      .catch(() => {
        if (alive) setCommunityDomainPolicyPayload(null);
      });

    return () => {
      alive = false;
    };
  }, [shopControlPolicyCommunityId]);
  const shopHeroShortcuts: Array<{
    label: string;
    icon: GsnIconName;
    to: string;
  }> = SHOP_CONTROL_SHORTCUTS.map((item) => ({
    label: item.label,
    icon: SHOP_CONTROL_SHORTCUT_ICONS[item.id],
    to: routeTarget("shop", effectiveShopClanId, `shop-control.route.${item.id}`, {
      hash: item.hash,
    }),
  }));
  const merchantReleaseHashFocused = useMemo(() => {
    const sectionParam = new URLSearchParams(location.search).get("section");
    const rawTargetId =
      safeStr(sectionParam) ||
      String(location.hash || "").replace(/^#/, "").trim();
    if (!rawTargetId) return false;

    try {
      return isMerchantReleaseControlTarget(decodeURIComponent(rawTargetId));
    } catch {
      return isMerchantReleaseControlTarget(rawTargetId);
    }
  }, [location.hash, location.search]);

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
    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!spotlightImageFile) {
      setSpotlightImagePreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(spotlightImageFile);
    setSpotlightImagePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [spotlightImageFile]);

  useEffect(() => {
    if (!spotlightVideoFile) {
      setSpotlightVideoPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(spotlightVideoFile);
    setSpotlightVideoPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [spotlightVideoFile]);

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  const cancelPendingControlReveal = useCallback(() => {
    controlRevealTargetRef.current = "";
    if (controlRevealFrameRef.current !== null) {
      window.cancelAnimationFrame(controlRevealFrameRef.current);
      controlRevealFrameRef.current = null;
    }
  }, []);

  const resetSpotlightIdleTimer = useCallback(() => {
    if (typeof window === "undefined") return;
    if (spotlightIdleTimerRef.current !== null) {
      window.clearTimeout(spotlightIdleTimerRef.current);
      spotlightIdleTimerRef.current = null;
    }

    if (!spotlightOpen) return;

    spotlightIdleTimerRef.current = window.setTimeout(() => {
      spotlightIdleTimerRef.current = null;
      setSpotlightOpen(false);
      setSpotlightPublishFeedback({
        tone: "info",
        text: "Spotlight portal closed after inactivity. Open it again when you are ready to continue.",
      });
      showNotice(
        "info",
        "Spotlight portal closed after inactivity. Open it again when you are ready to continue."
      );
    }, 5 * 60 * 1000);
  }, [spotlightOpen]);

  useEffect(() => {
    resetSpotlightIdleTimer();

    return () => {
      if (spotlightIdleTimerRef.current !== null) {
        window.clearTimeout(spotlightIdleTimerRef.current);
        spotlightIdleTimerRef.current = null;
      }
    };
  }, [
    resetSpotlightIdleTimer,
    spotlightOpen,
    spotlightFlowStep,
    spotlightPriorityMode,
    spotlightMediaChoice,
    spotlightProductName,
    spotlightPriceNote,
    spotlightMessage,
    spotlightImageFile,
    spotlightVideoFile,
  ]);

  function clearSpotlightDraft() {
    spotlightImagePrepJobRef.current += 1;
    spotlightVideoPrepJobRef.current += 1;
    setSpotlightProductName("");
    setSpotlightPriceNote("");
    setSpotlightMessage("");
    setSpotlightImageUrl("");
    setSpotlightVideoUrl("");
    setSpotlightImageFile(null);
    setSpotlightVideoFile(null);
    setSpotlightVideoDurationSeconds(null);
    setPreparingSpotlightImage(false);
    setPreparingSpotlightVideo(false);
    setSpotlightImageInputKey((prev) => prev + 1);
    setSpotlightVideoInputKey((prev) => prev + 1);
    setSpotlightPriorityMode("free");
    setSpotlightFlowStep("upload");
    setSpotlightMediaChoice("image");
    setSpotlightPublishFeedback(null);
  }

  const loadPage = useCallback(async (options?: { background?: boolean; preferredClanId?: number | null }) => {
    const background = Boolean(options?.background);
    const preferredClanId = Number(options?.preferredClanId || 0);
    if (!background) {
      setLoading(true);
      setDetailsLoading(false);
    }

    try {
      const [meRes, riskRes] = await Promise.all([
        getMe().catch(() => null),
        getMyIdentityRisk().catch(() => null),
      ]);
      setMe(meRes || null);
      const continuity = (riskRes as any)?.continuity || {};
      const continuityStatus = String(continuity?.status || "").trim().toLowerCase();
      setContinuityReview({
        blocked:
          continuityStatus === "reverify_required" ||
          continuityStatus === "protected_lock",
        reason: firstTruthy(
          continuity?.reason,
          "Identity continuity needs review before shop changes continue."
        ),
      });

      let shopRes = await getMyMarketplaceShop({
        clan_id: preferredClanId > 0 ? preferredClanId : selectedClanId || undefined,
        header_clan_id: preferredClanId > 0 ? preferredClanId : selectedClanId || undefined,
        product_limit: 300,
      }).catch(() => null);
      if (!shopRes?.item && (preferredClanId > 0 || selectedClanId > 0)) {
        shopRes = await getMyMarketplaceShop({
          product_limit: 300,
        }).catch(() => shopRes);
      }

      const gmfnId = firstTruthy(meRes?.gmfn_id);
      if (!shopRes?.item && gmfnId) {
        shopRes = await getMarketplaceShopByGmfnId(gmfnId, {
          clan_id: preferredClanId > 0 ? preferredClanId : selectedClanId || undefined,
          header_clan_id: preferredClanId > 0 ? preferredClanId : selectedClanId || undefined,
        }).catch(() => shopRes);
        if (!shopRes?.item && (preferredClanId > 0 || selectedClanId > 0)) {
          shopRes = await getMarketplaceShopByGmfnId(gmfnId).catch(() => shopRes);
        }
      }
      if (!shopRes?.item) {
        if (gmfnId) {
          const publicShopRes = await getPublicMarketplaceShopByGmfnId(gmfnId, {
            product_limit: 200,
            broadcast_limit: 20,
          }).catch(() => null);
          if (publicShopRes?.item) {
            shopRes = publicShopRes;
          }
        }
      }

      const shopItem = (shopRes?.item || null) as ShopRecord | null;
      const shopProducts = Array.isArray(shopRes?.products)
        ? (shopRes.products as ProductRecord[])
        : [];
      const shopContextClanId = Number(
        shopItem?.clan_id || shopRes?.clan_id || preferredClanId || selectedClanId || 0
      );

      setShop(shopItem);
      setProducts(shopProducts);
      setShopName(firstTruthy(shopItem?.name));
      setShopDescription(firstTruthy(shopItem?.description));
      setWhatsApp(firstTruthy(shopItem?.whatsapp_number));
      setTelegramHandle(firstTruthy(shopItem?.telegram_handle));
      setImageUrlInput(firstTruthy(shopItem?.image_url));
      setMeetingWhatsappNumber((current) =>
        safeStr(current) ? current : firstTruthy(shopItem?.whatsapp_number)
      );

      if (!background) {
        setLoading(false);
      }

      if (shopItem?.id) {
        if (!background) setDetailsLoading(true);
        const expectedPaymentsPath =
          `/api/payment-instructions/my/expected?clan_id=${shopContextClanId || 0}&limit=100`;

        const packageStatusPath =
          `/api/payment-instructions/community-package/status?clan_id=${shopContextClanId || 0}&shop_id=${shopItem.id}`;
        const roscaCyclesPath = `/api/rosca/cycles?clan_id=${shopContextClanId || 0}`;
        const communityMeetingsPath =
          `/api/community-meetings?clan_id=${shopContextClanId || 0}&limit=20`;

        const [
          broadcastsRes,
          vaultLinksRes,
          privateProductsRes,
          expectedRes,
          trustSlipRes,
          packageStatusRes,
          roscaCyclesRes,
          communityMeetingsRes,
          attentionSummaryRes,
          demandRequestsRes,
        ] =
          await Promise.all([
          apiJson<any>(
            `/api/marketplace/broadcasts?clan_id=${shopContextClanId || 0}&limit=20`
          ).catch(() => ({ items: [] })),
          listVaultShopAccessLinks(shopItem.id).catch(() => []),
          apiJson<any>(
            `/api/marketplace/products?clan_id=${shopContextClanId || 0}&shop_id=${shopItem.id}&include_private_manage=true&limit=200`
          ).catch(() => ({ items: [] })),
          apiJson<any>(expectedPaymentsPath).catch(() => []),
          apiJson<any>("/api/trust-slips/me").catch(() => null),
          apiJson<any>(packageStatusPath).catch(() => null),
          apiJson<any>(roscaCyclesPath).catch(() => null),
          apiJson<any>(communityMeetingsPath).catch(() => null),
          getMarketplaceShopAttentionSummary(shopItem.id, { days: 30 }).catch(() => null),
          listMarketplaceRequests({
            clan_id: shopContextClanId || undefined,
            status: "open",
            mine_only: false,
            limit: 12,
          }).catch(() => []),
        ]).finally(() => {
          if (!background) setDetailsLoading(false);
        });

        const visibleSpotlights = Array.isArray(broadcastsRes?.items)
          ? (broadcastsRes.items as BroadcastRecord[]).filter(
              (item) => Number(item?.shop_id || 0) === Number(shopItem.id)
            )
          : [];

        const privateManagedProducts = Array.isArray(privateProductsRes?.items)
          ? (privateProductsRes.items as ProductRecord[])
          : [];

        setProducts(privateManagedProducts.length > 0 ? privateManagedProducts : shopProducts);
        setSpotlights(visibleSpotlights);
        setVaultLinks(
          Array.isArray(vaultLinksRes) ? (vaultLinksRes as VaultLinkRecord[]) : []
        );
        setExpectedPayments(
          Array.isArray(expectedRes)
            ? (expectedRes as ExpectedPaymentRecord[])
            : Array.isArray(expectedRes?.items)
              ? (expectedRes.items as ExpectedPaymentRecord[])
              : []
        );
        setTrustSlipFeature((trustSlipRes || null) as TrustSlipFeatureSummary | null);
        setCommunityPackageStatus(
          (packageStatusRes || null) as CommunityPackageStatus | null
        );
        setShopAttentionSummary(
          (attentionSummaryRes || null) as ShopAttentionSummary | null
        );
        setRoscaCycles(
          Array.isArray(roscaCyclesRes?.cycles)
            ? (roscaCyclesRes.cycles as RoscaCycleSummary[])
            : []
        );
        setCommunityMeetings(
          Array.isArray(communityMeetingsRes?.meetings)
            ? (communityMeetingsRes.meetings as CommunityMeetingRecord[])
            : []
        );
        setOpenDemandRows(
          Array.isArray(demandRequestsRes)
            ? (demandRequestsRes as MarketplaceRequestItem[])
            : []
        );
      } else {
        if (!background) setDetailsLoading(false);
        setSpotlights([]);
        setVaultLinks([]);
        setExpectedPayments([]);
        setTrustSlipFeature(null);
        setCommunityPackageStatus(null);
        setShopAttentionSummary(null);
        setRoscaCycles([]);
        setCommunityMeetings([]);
        setOpenDemandRows([]);
      }
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  }, [selectedClanId]);

  const revealControlTarget = useCallback(function revealControlTarget(
    targetId: string,
    attempt = 0
  ) {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const target = document.getElementById(targetId);
    if (target) {
      cancelPendingControlReveal();
      revealElementWithoutJump(target, {
        surface: "shop-control",
        targetId,
        reason: "section-reveal",
      });
      return;
    }

    if (attempt < 18) {
      controlRevealTargetRef.current = targetId;
      controlRevealFrameRef.current = window.requestAnimationFrame(() => {
        controlRevealFrameRef.current = null;
        if (controlRevealTargetRef.current !== targetId) return;
        revealControlTarget(targetId, attempt + 1);
      });
    }
  }, [cancelPendingControlReveal]);

  useEffect(() => {
    void loadPage();

    const timer = window.setInterval(() => {
      void loadPage({ background: true });
    }, 60000);

    function handleFocusRefresh() {
      void loadPage({ background: true });
    }

    function handleVisibilityRefresh() {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void loadPage({ background: true });
      }
    }

    window.addEventListener("focus", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, [loadPage]);

  useEffect(() => {
    return () => {
      cancelPendingControlReveal();
      if (spotlightSuccessTimerRef.current !== null) {
        window.clearTimeout(spotlightSuccessTimerRef.current);
        spotlightSuccessTimerRef.current = null;
      }
    };
  }, [cancelPendingControlReveal]);

  useEffect(() => {
    if (loading) return;

    const sectionParam = new URLSearchParams(location.search).get("section");
    const rawTargetId =
      safeStr(sectionParam) ||
      String(location.hash || "").replace(/^#/, "").trim();
    if (!rawTargetId) {
      lastAutoScrolledHashRef.current = "";
      return;
    }

    let targetId = rawTargetId;
    try {
      targetId = decodeURIComponent(rawTargetId);
    } catch {
      targetId = rawTargetId;
    }

    if (!targetId) return;
    if (targetId === "summary") targetId = "shop-control-summary";
    if (targetId === "picture-gallery") targetId = "shop-control-gallery-tools";
    if (targetId === "gallery-tools") targetId = "shop-control-gallery-tools";
    if (targetId === "products") targetId = "shop-control-gallery-tools";
    if (targetId === "spotlight") targetId = "shop-control-spotlight";
    if (targetId === "paid-spotlight") targetId = "shop-control-paid-spotlight";
    if (targetId === "vault") targetId = "shop-control-vault";
    if (lastAutoScrolledHashRef.current === targetId) return;

    lastAutoScrolledHashRef.current = targetId;

    if (targetId === "shop-control-paid-spotlight") {
      navigateWithOrigin(navigate, routes.subscriptionSpotlight, location, {
        replace: true,
      });
      return;
    }

    if (targetId === "shop-control-spotlight") {
      setSpotlightPriorityMode("free");
      setSpotlightFlowStep("upload");
      setSpotlightOpen(true);
    }

    if (targetId !== "shop-control-spotlight") {
      setActiveOwnerLayer(ownerShopLayerForTarget(targetId));
    }

    cancelPendingControlReveal();
    revealControlTarget(targetId);
  }, [cancelPendingControlReveal, loading, location, location.hash, location.search, navigate, revealControlTarget, routes.subscriptionSpotlight, shop?.id]);

  const publicProducts = useMemo(
    () =>
      products.filter(
        (item) =>
          OWNER_PUBLIC_PRODUCT_VISIBILITY_MODES.has(
            firstTruthy(item?.visibility_mode, "community_visible").toLowerCase()
          ) &&
          item?.is_active !== false
      ),
    [products]
  );

  const publicProductSlotsTotal = useMemo(() => {
    const fromShop = safePositiveNumber(shop?.shop_product_slots_total, 0);
    if (fromShop > 0) return fromShop;

    const fromProducts = products
      .map((item) => safePositiveNumber(item?.shop_product_slots_total, 0))
      .filter((value) => value > 0);
    return Math.max(12, ...fromProducts);
  }, [products, shop]);

  const publicProductSlots = useMemo(
    () => arrangePublicProductsIntoSlots(publicProducts, publicProductSlotsTotal),
    [publicProductSlotsTotal, publicProducts]
  );
  const occupiedPublicProductSlotCount = useMemo(
    () => publicProductSlots.filter(Boolean).length,
    [publicProductSlots]
  );

  const vaultProducts = useMemo(
    () =>
      products.filter(
        (item) =>
          firstTruthy(item?.visibility_mode, "community_visible") === "vault_private" &&
          item?.is_active !== false
      ),
    [products]
  );

  const activeSpotlights = useMemo(() => {
    const now = Date.now();
    return spotlights.filter((item) => {
      const expiresRaw = safeStr(item?.expires_at);
      if (!expiresRaw) return true;
      const parsed = new Date(expiresRaw);
      if (Number.isNaN(parsed.getTime())) return true;
      return parsed.getTime() > now;
    });
  }, [spotlights]);

  const currentActiveSpotlight = useMemo(() => {
    if (activeSpotlights.length === 0) return null;

    return [...activeSpotlights].sort((a, b) => {
      const aTime = new Date(safeStr(a?.created_at || "")).getTime();
      const bTime = new Date(safeStr(b?.created_at || "")).getTime();
      const safeATime = Number.isFinite(aTime) ? aTime : 0;
      const safeBTime = Number.isFinite(bTime) ? bTime : 0;
      return safeBTime - safeATime;
    })[0];
  }, [activeSpotlights]);

  const currentActiveSpotlightAgeHours = useMemo(() => {
    const createdRaw = safeStr(currentActiveSpotlight?.created_at);
    if (!createdRaw) return null;
    const createdMs = new Date(createdRaw).getTime();
    if (!Number.isFinite(createdMs)) return null;
    return Math.max(0, Math.round((Date.now() - createdMs) / (60 * 60 * 1000)));
  }, [currentActiveSpotlight?.created_at]);

  const attentionLast7Days = shopAttentionSummary?.periods?.last_7_days || {};
  const attentionShopVisits7Days = safePositiveNumber(
    attentionLast7Days.shop_visits,
    0
  );
  const attentionVisitors7Days = safePositiveNumber(
    attentionLast7Days.unique_shop_visitors,
    0
  );
  const attentionProductOpens7Days = safePositiveNumber(
    attentionLast7Days.product_opens,
    0
  );
  const attentionContactTaps7Days = safePositiveNumber(
    attentionLast7Days.contact_taps,
    0
  );
  const attentionSpotlightImpressions7Days = safePositiveNumber(
    attentionLast7Days.spotlight_impressions,
    0
  );
  const attentionSpotlightShopClicks7Days = safePositiveNumber(
    attentionLast7Days.spotlight_shop_clicks,
    0
  );
  const attentionPossibleSpotlightReach = safePositiveNumber(
    shopAttentionSummary?.spotlight?.possible_member_reach,
    0
  );
  const attentionDailyActivityRows = useMemo(() => {
    const rows = Array.isArray(shopAttentionSummary?.daily_activity)
      ? shopAttentionSummary.daily_activity
      : [];
    return rows.slice(-7).map((row) => ({
      date: safeStr(row?.date),
      visitors: safePositiveNumber(row?.unique_shop_visitors, 0),
      visits: safePositiveNumber(row?.shop_visits, 0),
      productOpens: safePositiveNumber(row?.product_opens, 0),
      contactTaps: safePositiveNumber(row?.contact_taps, 0),
    }));
  }, [shopAttentionSummary?.daily_activity]);
  const attentionDailyMaxVisitors = Math.max(
    1,
    ...attentionDailyActivityRows.map((row) => row.visitors || row.visits || 0)
  );
  const attentionSourceBreakdownRows = useMemo(() => {
    const rows = Array.isArray(shopAttentionSummary?.source_breakdown)
      ? shopAttentionSummary.source_breakdown
      : [];
    return rows.slice(0, 5).map((row) => ({
      source: safeStr(row?.source),
      label: firstTruthy(row?.label, row?.source, "Traffic source"),
      shopVisits: safePositiveNumber(row?.shop_visits, 0),
      productOpens: safePositiveNumber(row?.product_opens, 0),
      spotlightViews: safePositiveNumber(row?.spotlight_impressions, 0),
      contactTaps: safePositiveNumber(row?.contact_taps, 0),
      totalEvents: safePositiveNumber(row?.total_events, 0),
      boundary: firstTruthy(
        row?.boundary_label,
        "Source counts show where attention was recorded, not who bought or paid."
      ),
    }));
  }, [shopAttentionSummary?.source_breakdown]);
  const shopFollowerCount = safePositiveNumber(
    shopAttentionSummary?.followers?.follower_count ??
      shopAttentionSummary?.followers?.followers_count,
    0
  );
  const followerNotices7Days = safePositiveNumber(
    shopAttentionSummary?.follower_notifications?.last_7_days,
    0
  );
  const followerNoticesYearToDate = safePositiveNumber(
    shopAttentionSummary?.follower_notifications?.year_to_date,
    0
  );
  const followerNoticeBoundary = firstTruthy(
    shopAttentionSummary?.follower_notifications?.boundary_label,
    "Follower notices are distribution records, not views, purchases, or push-delivery proof."
  );
  const followerNoticeDeliveryLabel = firstTruthy(
    shopAttentionSummary?.follower_notifications?.delivery_label,
    "Action Inbox notices created for eligible followers; phone push is best-effort."
  );
  const followerNoticeKindRows = Array.isArray(shopAttentionSummary?.follower_notifications?.by_kind)
    ? shopAttentionSummary.follower_notifications.by_kind.slice(0, 4).map((row) => ({
        kind: safeStr(row?.kind),
        label: firstTruthy(row?.label, row?.kind, "Follower notice"),
        count: safePositiveNumber(row?.count, 0),
      }))
    : [];
  const followerNoticeResponseVisits = safePositiveNumber(
    shopAttentionSummary?.follower_notification_response?.shop_visits,
    0
  );
  const followerNoticeResponseVisitors = safePositiveNumber(
    shopAttentionSummary?.follower_notification_response?.unique_visitors,
    0
  );
  const followerNoticeResponseProductOpens = safePositiveNumber(
    shopAttentionSummary?.follower_notification_response?.product_opens,
    0
  );
  const followerNoticeResponseContactTaps = safePositiveNumber(
    shopAttentionSummary?.follower_notification_response?.contact_taps,
    0
  );
  const followerNoticeResponseBoundary = firstTruthy(
    shopAttentionSummary?.follower_notification_response?.boundary_label,
    "Follower notice response counts attributed visits, opens, and taps after a follower-notice link is opened; it is not buyer, payment, delivery, push-display, or sales proof."
  );
  const followerNoticeResponseKindRows = Array.isArray(shopAttentionSummary?.follower_notification_response?.by_kind)
    ? shopAttentionSummary.follower_notification_response.by_kind.slice(0, 3).map((row) => ({
        kind: safeStr(row?.kind),
        label: firstTruthy(row?.label, row?.kind, "Follower response"),
        visits: safePositiveNumber(row?.shop_visits, 0),
        visitors: safePositiveNumber(row?.unique_visitors, 0),
        productOpens: safePositiveNumber(row?.product_opens, 0),
        contactTaps: safePositiveNumber(row?.contact_taps, 0),
        totalEvents: safePositiveNumber(row?.total_events, 0),
      }))
    : [];
  const shareActions7Days = safePositiveNumber(
    shopAttentionSummary?.share_actions?.last_7_days,
    0
  );
  const shareActionBoundary = firstTruthy(
    shopAttentionSummary?.share_actions?.boundary_label,
    "Share actions are owner/user share attempts, not proof that a recipient opened the link."
  );
  const shareActionChannelRows = Array.isArray(shopAttentionSummary?.share_actions?.by_channel)
    ? shopAttentionSummary.share_actions.by_channel.slice(0, 4).map((row) => ({
        source: safeStr(row?.source),
        label: firstTruthy(row?.label, row?.source, "Share channel"),
        count: safePositiveNumber(row?.count, 0),
      }))
    : [];
  const shareResponseVisits = safePositiveNumber(
    shopAttentionSummary?.share_response?.shop_visits,
    0
  );
  const shareResponseVisitors = safePositiveNumber(
    shopAttentionSummary?.share_response?.unique_visitors,
    0
  );
  const shareResponseProductOpens = safePositiveNumber(
    shopAttentionSummary?.share_response?.product_opens,
    0
  );
  const shareResponseContactTaps = safePositiveNumber(
    shopAttentionSummary?.share_response?.contact_taps,
    0
  );
  const shareResponseBoundary = firstTruthy(
    shopAttentionSummary?.share_response?.boundary_label,
    "Share response counts attributed visits, opens, and taps after a shared link is opened; it is still not buyer, payment, or delivery proof."
  );
  const shareResponseChannelRows = Array.isArray(shopAttentionSummary?.share_response?.by_channel)
    ? shopAttentionSummary.share_response.by_channel.slice(0, 4).map((row) => ({
        source: safeStr(row?.source),
        label: firstTruthy(row?.label, row?.source, "Share response"),
        visits: safePositiveNumber(row?.shop_visits, 0),
        visitors: safePositiveNumber(row?.unique_visitors, 0),
        productOpens: safePositiveNumber(row?.product_opens, 0),
        contactTaps: safePositiveNumber(row?.contact_taps, 0),
        totalEvents: safePositiveNumber(row?.total_events, 0),
      }))
    : [];
  const recommendationActions7Days = safePositiveNumber(
    shopAttentionSummary?.recommendation_actions?.last_7_days,
    0
  );
  const recommendationActionBoundary = firstTruthy(
    shopAttentionSummary?.recommendation_actions?.boundary_label,
    "Recommendation actions mean the shop owner tapped or marked advice as tried; they do not prove the advice produced sales."
  );
  const recommendationActionRows = Array.isArray(shopAttentionSummary?.recommendation_actions?.by_action)
    ? shopAttentionSummary.recommendation_actions.by_action.slice(0, 4).map((row) => ({
        action: safeStr(row?.action),
        label: firstTruthy(row?.label, row?.action, "Advice action"),
        count: safePositiveNumber(row?.count, 0),
        diagnosis: safeStr(row?.diagnosis),
      }))
    : [];
  const tradeOutcomeRecords7Days = safePositiveNumber(
    shopAttentionSummary?.trade_outcomes?.last_7_days,
    0
  );
  const tradeOutcomeShopLinkedRecords = safePositiveNumber(
    shopAttentionSummary?.trade_outcomes?.shop_linked_records,
    0
  );
  const tradeOutcomeSellerSideRecords = safePositiveNumber(
    shopAttentionSummary?.trade_outcomes?.seller_side_records,
    0
  );
  const tradeOutcomeReleasedRecords = safePositiveNumber(
    shopAttentionSummary?.trade_outcomes?.released_records,
    0
  );
  const tradeOutcomePaymentClaimedRecords = safePositiveNumber(
    shopAttentionSummary?.trade_outcomes?.payment_claimed_or_recorded,
    0
  );
  const tradeOutcomeReceiptConfirmedRecords = safePositiveNumber(
    shopAttentionSummary?.trade_outcomes?.receipt_confirmed,
    0
  );
  const tradeOutcomeDisputeRecords = safePositiveNumber(
    shopAttentionSummary?.trade_outcomes?.dispute_records,
    0
  );
  const tradeOutcomeUnresolvedRecords = safePositiveNumber(
    shopAttentionSummary?.trade_outcomes?.unresolved_records,
    0
  );
  const tradeOutcomeBoundary = firstTruthy(
    shopAttentionSummary?.trade_outcomes?.boundary_label,
    "Protected trade outcomes are recorded trade evidence, not automatic sales, payment confirmation, escrow, delivery proof, or buyer satisfaction proof."
  );
  const tradeOutcomeRecentRows = Array.isArray(shopAttentionSummary?.trade_outcomes?.recent_records)
    ? shopAttentionSummary.trade_outcomes.recent_records.slice(0, 4).map((row) => ({
        tradeId: safePositiveNumber(row?.trade_id, 0),
        tradeCode: safeStr(row?.trade_code),
        itemTitle: firstTruthy(row?.item_title, "Protected trade"),
        status: safeStr(row?.status),
        paymentStatus: safeStr(row?.payment_status),
        releaseStatus: safeStr(row?.release_status),
        receiptStatus: safeStr(row?.receipt_status),
        disputeStatus: safeStr(row?.dispute_status),
        linkedToShop: Boolean(row?.linked_to_shop),
      }))
    : [];
  const shopAnalyticsWisdom = buildShopAnalyticsWisdom({
    possibleReach: attentionPossibleSpotlightReach,
    spotlightSeen: attentionSpotlightImpressions7Days,
    visitors: attentionVisitors7Days,
    productOpens: attentionProductOpens7Days,
    contactTaps: attentionContactTaps7Days,
    followers: shopFollowerCount,
    activeSpotlights: activeSpotlights.length,
    activeSpotlightAgeHours: currentActiveSpotlightAgeHours,
    publicItems: occupiedPublicProductSlotCount,
    publicSlots: publicProductSlotsTotal,
    vaultItems: vaultProducts.length,
    vaultSlots: 6,
    tradeRecords: tradeOutcomeRecords7Days,
    releasedTradeRecords: tradeOutcomeReleasedRecords,
    paymentClaimedTradeRecords: tradeOutcomePaymentClaimedRecords,
    receiptConfirmedTradeRecords: tradeOutcomeReceiptConfirmedRecords,
    disputeTradeRecords: tradeOutcomeDisputeRecords,
    unresolvedTradeRecords: tradeOutcomeUnresolvedRecords,
  });
  const shopMarketIntelligenceSummary = buildShopMarketIntelligenceSummary(
    shopAnalyticsWisdom,
    `${routes.shop}#${OWNER_SHOP_HASHES.summary}`
  );
  const shopSellerHelper = useMemo(
    () => buildShopSellerHelper(shopAnalyticsWisdom),
    [shopAnalyticsWisdom]
  );
  const marketIntelligencePrimaryAction = useMemo(() => {
    switch (shopAnalyticsWisdom.diagnosisCode) {
      case "SHOP_SETUP_GAP":
      case "LOW_PRODUCT_CURIOSITY":
        return {
          to: routes.shopAssets,
          label: shopAnalyticsWisdom.primaryActionLabel || "Edit products",
          actionKey: "improve_products",
          detail: "Open the existing product and shop block tools.",
        };
      case "FOLLOWERS_WAITING":
      case "GATHERING_DATA":
      case "LOW_EXPOSURE":
      case "LOW_VISIT_RATE":
        return {
          to: routes.freeSpotlight,
          label: shopAnalyticsWisdom.primaryActionLabel || "Review spotlight",
          actionKey: "review_spotlight",
          detail: "Open the existing Spotlight lane for the next visibility step.",
        };
      case "LOW_CONTACT_INTENT":
        return {
          to: routes.shopDetails,
          label: shopAnalyticsWisdom.primaryActionLabel || "Improve contact",
          actionKey: "improve_contact",
          detail: "Open the existing shop details area to clarify buyer instructions.",
        };
      case "CONTACTS_NOT_PROTECTED":
      case "TRADE_RECORD_PRESSURE":
      case "OUTCOME_EVIDENCE_BUILDING":
        return {
          to: routes.tradeEvidence,
          label: shopAnalyticsWisdom.primaryActionLabel || "Review trade evidence",
          actionKey: "review_trade_evidence",
          detail: "Open the existing protected trade evidence lane.",
        };
      case "STRONG_MOMENTUM":
      default:
        return {
          to: routes.shopGallery,
          label: shopAnalyticsWisdom.primaryActionLabel || "Review shop gallery",
          actionKey: "review_shop_gallery",
          detail: "Open the existing shop gallery to repeat what is working.",
        };
    }
  }, [routes.freeSpotlight, routes.shopAssets, routes.shopDetails, routes.shopGallery, routes.tradeEvidence, shopAnalyticsWisdom.diagnosisCode, shopAnalyticsWisdom.primaryActionLabel]);
  const trackMarketIntelligenceAction = useCallback(
    (actionKey: string) => {
      const activeShopId = Number(shop?.id || 0);
      if (!activeShopId) return;
      const todayKey = new Date().toISOString().slice(0, 10);
      const diagnosis = shopAnalyticsWisdom.diagnosisCode;
      const safeActionKey = actionKey || "mark_tried";
      const sourcePath = `/app/shop-control?gsn_recommendation=market_intelligence&gsn_action=${encodeURIComponent(safeActionKey)}&gsn_diagnosis=${encodeURIComponent(diagnosis)}#${OWNER_SHOP_HASHES.summary}`;
      void recordMarketplaceAttentionEvent({
        event_type: "recommendation_actioned",
        shop_id: activeShopId,
        clan_id: effectiveShopClanId || selectedClanId || null,
        source: "shop_market_intelligence",
        source_path: sourcePath,
        client_event_id: `shop-mi-${activeShopId}-${diagnosis}-${safeActionKey}-${todayKey}`,
      })
        .then((result) => {
          if (result?.recorded || result?.deduped) {
            setLoggedRecommendationActionKeys((previous) => {
              const next = new Set(previous);
              next.add(safeActionKey);
              return next;
            });
          }
        })
        .catch(() => undefined);
    },
    [effectiveShopClanId, selectedClanId, shop?.id, shopAnalyticsWisdom.diagnosisCode]
  );
  const publicInventoryRate = analyticsRate(occupiedPublicProductSlotCount, publicProductSlotsTotal);
  const vaultInventoryRate = analyticsRate(vaultProducts.length, 6);
  const openDemandSignals = useMemo(
    () =>
      openDemandRows
        .filter((row) => safeStr(row?.status || "open").toLowerCase() === "open")
        .slice(0, 3),
    [openDemandRows]
  );
  const communityNeedOpportunities = useMemo(
    () => buildShopCommunityNeedOpportunities(openDemandSignals, publicProducts),
    [openDemandSignals, publicProducts]
  );
  const openDemandSignalCount = openDemandRows.filter(
    (row) => safeStr(row?.status || "open").toLowerCase() === "open"
  ).length;
  const demandContextLabel = openDemandSignalCount
    ? `${openDemandSignalCount} open community demand signal${openDemandSignalCount === 1 ? "" : "s"}`
    : "No open Demand Box signal in this community yet";
  const sensitiveDemandSignalCount = openDemandSignals.filter(isSensitiveDemandSignal).length;
  const demandOverlapLabel = communityNeedOpportunities.some(
    (opportunity) => opportunity.state !== "INSUFFICIENT_EVIDENCE"
  )
    ? "Some requests share a category or wording with your public offers. Treat this as a direct request, not community-wide demand."
    : "No clear shop-to-request link is visible yet. Read Demand Box before changing products.";
  const communityName = useMemo(() => {
    return firstTruthy(
      shop?.marketplace_name,
      shop?.clan_id ? `Community ${shop.clan_id}` : "",
      "Selected community"
    );
  }, [shop]);

  const featurePayments = useMemo(() => {
    return expectedPayments.filter((item) =>
      [
        "vault_subscription",
        "merchant_verify_subscription",
        "spotlight_subscription",
        "community_package_subscription",
      ].includes(firstTruthy(item?.expected_type).toLowerCase())
    );
  }, [expectedPayments]);

  const latestVaultPayment = useMemo(
    () =>
      featurePayments.find(
        (item) => firstTruthy(item?.expected_type).toLowerCase() === "vault_subscription"
      ) || null,
    [featurePayments]
  );

  const latestMerchantVerifyPayment = useMemo(
    () =>
      featurePayments.find(
        (item) =>
          firstTruthy(item?.expected_type).toLowerCase() === "merchant_verify_subscription"
      ) || null,
    [featurePayments]
  );

  const latestSpotlightPayment = useMemo(
    () =>
      featurePayments.find(
        (item) => firstTruthy(item?.expected_type).toLowerCase() === "spotlight_subscription"
      ) || null,
    [featurePayments]
  );

  const latestCommunityPackagePayment = useMemo(
    () =>
      featurePayments.find(
        (item) =>
          firstTruthy(item?.expected_type).toLowerCase() === "community_package_subscription"
      ) || null,
    [featurePayments]
  );

  const communityPackageItems = useMemo(
    () =>
      Array.isArray(communityPackageStatus?.packages)
        ? communityPackageStatus.packages
        : [],
    [communityPackageStatus]
  );

  const communityPackageByCode = useMemo(() => {
    const map = new Map<string, CommunityPackageStatusItem>();
    communityPackageItems.forEach((item) => {
      const code = firstTruthy(item?.package_code);
      if (code) map.set(code, item);
    });
    return map;
  }, [communityPackageItems]);

  const communityPackageStatusText = useMemo(() => {
    const packageLabels: Array<[string, string]> = [
      ["extra_shop_blocks", "Shop blocks"],
      ["extra_members", "Member places"],
      ["rosca_cycle", "ROSCA yearly"],
      ["community_meeting_pack", "Meeting records"],
    ];

    return packageLabels.map(([code, label]) => {
      const item = communityPackageByCode.get(code);
      const remaining = safePositiveNumber(item?.active_remaining, 0);
      if (code === "rosca_cycle") {
        return `${label}: ${remaining > 0 ? "yearly service active" : "yearly service inactive"}`;
      }
      const readyText = remaining > 0 ? `${remaining} ready` : "none ready";
      const engineText = item?.engine_ready === false ? "record only" : "active";
      return `${label}: ${readyText}${remaining > 0 ? `, ${engineText}` : ""}`;
    });
  }, [communityPackageByCode]);

  const latestRoscaCycle = useMemo(() => {
    if (!roscaCycles.length) return null;
    return roscaCycles[roscaCycles.length - 1] || null;
  }, [roscaCycles]);

  const nextRoscaPayoutRound = useMemo(() => {
    const rounds = Array.isArray(latestRoscaCycle?.rounds)
      ? latestRoscaCycle.rounds
      : [];
    return (
      rounds.find((round) => round?.ready_for_payout && !round?.payout_recorded) ||
      null
    );
  }, [latestRoscaCycle]);

  const latestCommunityMeeting = useMemo(() => {
    if (!communityMeetings.length) return null;
    return communityMeetings[0] || null;
  }, [communityMeetings]);
  const routeMeetingId = useMemo(
    () => firstTruthy(new URLSearchParams(location.search).get("meeting_id")),
    [location.search]
  );
  const routeAttendanceToken = useMemo(
    () => firstTruthy(new URLSearchParams(location.search).get("attendance_token")),
    [location.search]
  );
  const meetingForActions = useMemo(() => {
    if (routeMeetingId) {
      const match = communityMeetings.find(
        (item) => firstTruthy(item?.meeting_id) === routeMeetingId
      );
      if (match) return match;
    }
    return latestCommunityMeeting;
  }, [communityMeetings, latestCommunityMeeting, routeMeetingId]);

  const latestMeetingInterest = meetingForActions?.interest_summary || null;
  const latestMeetingOwnInterest = safeStr(latestMeetingInterest?.own_response);
  const latestAttendanceSummary = meetingForActions?.attendance_summary || null;
  const activeAttendanceSession =
    openedAttendanceSession || latestAttendanceSummary?.active_session || null;
  const activeAttendanceCheckinUrl = firstTruthy(activeAttendanceSession?.checkin_url)
    ? publicFrontendUrl(firstTruthy(activeAttendanceSession?.checkin_url))
    : "";
  const activeAttendanceIsBluetooth =
    firstTruthy(activeAttendanceSession?.method, meetingAttendanceMethod) === "bluetooth_proximity";
  const activeAttendanceToken = firstTruthy(
    routeAttendanceToken,
    activeAttendanceSession?.attendance_token
  );

  const activePaidSpotlights = useMemo(
    () =>
      activeSpotlights.filter(
        (item) => firstTruthy(item?.priority_mode, "free").toLowerCase() === "paid"
      ),
    [activeSpotlights]
  );

  const vaultEvidenceText = useMemo(
    () =>
      featureEvidenceLine(latestVaultPayment, {
        active: vaultProducts.length > 0 || vaultLinks.length > 0,
        activeText:
          "Vault is active. You can now add private offers and share access links.",
        awaitingText:
          "Vault is not active yet. Start a Vault payment request first.",
        confirmedText:
          "Vault payment is confirmed. You can now add private offers.",
      }),
    [latestVaultPayment, vaultLinks.length, vaultProducts.length]
  );

  const merchantVerifyEvidenceText = useMemo(
    () =>
      featureEvidenceLine(latestMerchantVerifyPayment, {
        active: Boolean(trustSlipFeature?.merchant_verify_active),
        activeText:
          "Shop verification is active. Visitors can now rely on your verification page.",
        awaitingText:
          "Shop verification is not active yet. Start the payment request first.",
        confirmedText:
          "Shop verification payment is confirmed. Your verification page should now be active.",
      }),
    [latestMerchantVerifyPayment, trustSlipFeature?.merchant_verify_active]
  );

  const spotlightEvidenceText = useMemo(
    () =>
      featureEvidenceLine(latestSpotlightPayment, {
        active: activePaidSpotlights.length > 0,
        activeText:
          "Paid spotlight is active. Your shop now has priority visibility.",
        awaitingText:
          "No paid spotlight is active yet. Start the spotlight payment request first.",
        confirmedText:
          "Spotlight payment is confirmed. You can now start one paid spotlight for this shop.",
      }),
    [activePaidSpotlights.length, latestSpotlightPayment]
  );

  const vaultStateLabel = vaultProducts.length > 0 || vaultLinks.length > 0
    ? "Usable now"
    : safeStr(latestVaultPayment?.confirmed_at)
      ? "Confirmed"
      : latestVaultPayment
        ? "Awaiting confirmation"
        : "No payment request";

  const merchantVerifyStateLabel = trustSlipFeature?.merchant_verify_active
    ? "Usable now"
    : safeStr(latestMerchantVerifyPayment?.confirmed_at)
      ? "Confirmed"
      : latestMerchantVerifyPayment
        ? "Awaiting confirmation"
        : "No payment request";

  const canStartPaidSpotlight = Boolean(
    safeStr(latestSpotlightPayment?.confirmed_at) && activePaidSpotlights.length === 0
  );

  const spotlightHasImage = Boolean(spotlightImageFile);
  const spotlightHasVideo = Boolean(spotlightVideoFile);
  const spotlightHasChosenMedia =
    spotlightHasImage || spotlightHasVideo;
  const spotlightHasProductText = Boolean(
    safeStr(spotlightProductName) ||
      safeStr(spotlightPriceNote) ||
      safeStr(spotlightMessage)
  );
  const spotlightCanContinueToPreview =
    spotlightHasProductText ||
    (spotlightMediaChoice === "both"
      ? spotlightHasChosenMedia
      : spotlightMediaChoice === "image"
      ? spotlightHasImage
      : spotlightHasVideo);

  function pinShopControlLinkSection(sectionId?: string | null) {
    const targetId = safeStr(sectionId);
    if (!targetId) return;

    lastAutoScrolledHashRef.current = targetId;
    navigateWithOrigin(
      navigate,
      {
        pathname: location.pathname,
        search: "",
        hash: `#${targetId}`,
      },
      location,
      { replace: true, preventScrollReset: true }
    );
  }

  async function copyText(
    text: string,
    successMessage: string,
    sectionId?: string
  ): Promise<boolean> {
    if (!text) {
      showNotice("error", "Nothing to copy yet.");
      return false;
    }

    pinShopControlLinkSection(sectionId);
    const copied = await safeCopy(text);
    showNotice(
      copied ? "success" : "error",
      copied
        ? successMessage
        : "Clipboard copy was blocked. Select the text and copy it manually."
    );
    return copied;
  }

  function vaultLinkUrl(link: VaultLinkRecord | null | undefined): string {
    const raw = firstTruthy(
      link?.access_url,
      link?.frontend_hint_path,
      link?.api_view_url,
      link?.token ? `/vault/${encodeURIComponent(String(link.token))}` : ""
    );
    if (!raw) return "";
    return publicFrontendUrl(raw);
  }

  function buildVaultViewingLinkPackage(
    link: VaultLinkRecord | null | undefined
  ): string {
    const url = vaultLinkUrl(link);
    if (!url) return "";

    const linkedProductId = Number(link?.product_id || 0);
    const product =
      vaultProducts.find((item) => Number(item.id) === linkedProductId) ||
      products.find((item) => Number(item.id) === linkedProductId) ||
      vaultProducts[0] ||
      null;

    return buildGsnVaultInviteMessage({
      shopName: firstTruthy(shopName, shop?.name, "GSN Private Vault"),
      gsnId: firstTruthy(shop?.owner_gmfn_id, shop?.gmfn_id, me?.gmfn_id),
      blockLabel: link?.id ? `Vault link #${link.id}` : "Vault viewing link",
      blockName: firstTruthy(product?.name, product?.description, "Private Vault offer"),
      vaultLink: url,
    });
  }

  function vaultDefaultExpiry(): string {
    const next = new Date();
    next.setHours(next.getHours() + 72);
    return next.toISOString();
  }

  async function createVaultViewingLink() {
    if (!shop?.id) {
      showNotice("error", "Shop record is not available.");
      return;
    }
    const firstVaultProduct = vaultProducts[0];
    if (!firstVaultProduct?.id) {
      showNotice("error", "Add a private Vault offer before creating a link.");
      return;
    }

    setCreatingVaultLink(true);
    try {
      const link = await createVaultShopAccessLink({
        shop_id: shop.id,
        product_id: firstVaultProduct.id,
        expires_at: vaultDefaultExpiry(),
        max_views: 20,
        watermark_enabled: true,
      });
      setVaultLinks((prev) => [link as VaultLinkRecord, ...prev]);
      await copyText(
        buildVaultViewingLinkPackage(link as VaultLinkRecord),
        "Vault viewing package for one private offer created and copied.",
        "shop-control-vault"
      );
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Vault viewing link could not be created.");
    } finally {
      setCreatingVaultLink(false);
    }
  }

  async function revokeVaultViewingLink(link: VaultLinkRecord) {
    const linkId = Number(link?.id || 0);
    if (!linkId) {
      showNotice("error", "Vault link is not available.");
      return;
    }

    setBusyVaultLinkId(linkId);
    setBusyVaultLinkAction("revoke");
    try {
      const updated = await revokeVaultShopAccessLink(linkId);
      setVaultLinks((prev) =>
        prev.map((item) =>
          Number(item.id) === linkId ? (updated as VaultLinkRecord) : item
        )
      );
      showNotice("success", "Vault viewing link revoked.");
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Vault viewing link could not be revoked.");
    } finally {
      setBusyVaultLinkId(null);
      setBusyVaultLinkAction(null);
    }
  }

  async function extendVaultViewingLink(link: VaultLinkRecord) {
    const linkId = Number(link?.id || 0);
    if (!linkId) {
      showNotice("error", "Vault link is not available.");
      return;
    }

    setBusyVaultLinkId(linkId);
    setBusyVaultLinkAction("extend");
    try {
      const updated = await extendVaultShopAccessLink(linkId, vaultDefaultExpiry());
      setVaultLinks((prev) =>
        prev.map((item) =>
          Number(item.id) === linkId ? (updated as VaultLinkRecord) : item
        )
      );
      showNotice("success", "Vault viewing link extended for 72 more hours.");
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Vault viewing link could not be extended.");
    } finally {
      setBusyVaultLinkId(null);
      setBusyVaultLinkAction(null);
    }
  }

  function collapseSpotlightTools(event?: React.SyntheticEvent<HTMLElement>) {
    event?.stopPropagation();

    if (spotlightIdleTimerRef.current !== null) {
      window.clearTimeout(spotlightIdleTimerRef.current);
      spotlightIdleTimerRef.current = null;
    }
    if (spotlightSuccessTimerRef.current !== null) {
      window.clearTimeout(spotlightSuccessTimerRef.current);
      spotlightSuccessTimerRef.current = null;
    }
    setSpotlightOpen(false);
    setSpotlightFlowStep("upload");
  }

  function scheduleSpotlightSuccessCollapse() {
    if (typeof window === "undefined") {
      setSpotlightOpen(false);
      setSpotlightFlowStep("upload");
      return;
    }

    if (spotlightIdleTimerRef.current !== null) {
      window.clearTimeout(spotlightIdleTimerRef.current);
      spotlightIdleTimerRef.current = null;
    }
    if (spotlightSuccessTimerRef.current !== null) {
      window.clearTimeout(spotlightSuccessTimerRef.current);
    }

    spotlightSuccessTimerRef.current = window.setTimeout(() => {
      spotlightSuccessTimerRef.current = null;
      setSpotlightOpen(false);
      setSpotlightFlowStep("upload");
      setSpotlightPublishFeedback({
        tone: "success",
        text: "Spotlight published. The spotlight portal closed so you can continue with other shop work.",
      });
    }, 1200);
  }

  function openExternalLink(url?: string | null, sectionId?: string) {
    const resolved = safeStr(url);
    if (!resolved) {
      showNotice("error", "Link is not ready yet.");
      return;
    }
    pinShopControlLinkSection(sectionId);
    const opened = window.open(resolved, "_blank", "noopener,noreferrer");
    if (!opened) {
      showNotice("error", "The browser blocked that window. Copy the link and open it yourself.");
      return;
    }
    showNotice("success", "Opening link now.");
  }

  function paidToolActionLabel(options: {
    locked: boolean;
    busy?: boolean;
    idle: string;
    busyText?: string;
  }) {
    if (options.locked) return "Identity first";
    if (options.busy) return options.busyText || "Working...";
    return options.idle;
  }

  async function createVaultInstruction(quantityTotal: 1 | 6) {
    if (!shop?.id) {
      showNotice("error", "Shop record is not available.");
      return;
    }
    if (vaultFeatureOff) {
      showNotice("error", vaultFeatureOffText);
      return;
    }

    setCreatingVaultInstruction(true);
    try {
      const result = await apiJson<any>("/api/payment-instructions/vault", {
        method: "POST",
        body: JSON.stringify({
          clan_id: Number(shop?.clan_id || selectedClanId || 0),
          shop_id: Number(shop.id),
          quantity_total: quantityTotal,
          currency: "GBP",
        }),
      });

      await loadPage();
      const copied = await copyText(
        firstTruthy(result?.reference_display, result?.reference),
        "Vault payment reference copied."
      );
      showNotice(
        copied ? "success" : "error",
        copied
          ? `Vault payment request created for ${quantityTotal} slot${quantityTotal > 1 ? "s" : ""}. Reference copied.`
          : `Vault payment request created for ${quantityTotal} slot${quantityTotal > 1 ? "s" : ""}, but clipboard copy was blocked. Copy the reference shown here.`
      );
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Vault payment request could not be created.");
    } finally {
      setCreatingVaultInstruction(false);
    }
  }

  async function createMerchantVerifyInstruction() {
    if (!shop?.id) {
      showNotice("error", "Shop record is not available.");
      return;
    }
    if (marketplaceShopsFeatureOff) {
      showNotice("error", marketplaceShopsFeatureOffText);
      return;
    }

    setCreatingMerchantVerifyInstruction(true);
    try {
      const result = await apiJson<any>("/api/payment-instructions/merchant-verify", {
        method: "POST",
        body: JSON.stringify({
          clan_id: Number(shop?.clan_id || selectedClanId || 0),
          shop_id: Number(shop.id),
          amount: "1.00",
          currency: "GBP",
        }),
      });

      await loadPage();
      const copied = await copyText(
        firstTruthy(result?.reference_display, result?.reference),
        "Shop verification payment reference copied."
      );
      showNotice(
        copied ? "success" : "error",
        copied
          ? "Shop verification payment request created. Reference copied."
          : "Shop verification payment request created, but clipboard copy was blocked. Copy the reference shown here."
      );
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Shop verification payment request could not be created."
      );
    } finally {
      setCreatingMerchantVerifyInstruction(false);
    }
  }

  async function createCommunityPackageInstruction(
    packageCode: string,
    label: string,
    options: { needsShop?: boolean; quantityTotal?: number } = {}
  ) {
    const clanId = Number(shop?.clan_id || selectedClanId || 0);
    if (!clanId) {
      showNotice("error", "Choose a marketplace first.");
      return;
    }
    if (options.needsShop && !shop?.id) {
      showNotice("error", "Shop record is not available.");
      return;
    }
    if (packageCode === "extra_shop_blocks" && marketplaceShopsFeatureOff) {
      showNotice("error", marketplaceShopsFeatureOffText);
      return;
    }
    if (packageCode === "rosca_cycle" && roscaCyclesFeatureOff) {
      showNotice("error", roscaCyclesFeatureOffText);
      return;
    }

    setCreatingCommunityPackageCode(packageCode);
    try {
      const result = await apiJson<any>("/api/payment-instructions/community-package", {
        method: "POST",
        body: JSON.stringify({
          clan_id: clanId,
          package_code: packageCode,
          quantity_total: options.quantityTotal || 1,
          shop_id: options.needsShop ? Number(shop?.id) : undefined,
          currency: "GBP",
        }),
      });

      await loadPage();
      const copied = await copyText(
        firstTruthy(result?.reference_display, result?.reference),
        `${label} payment reference copied.`
      );
      showNotice(
        copied ? "success" : "error",
        copied
          ? `${label} payment request created. Reference copied.`
          : `${label} payment request created, but clipboard copy was blocked. Copy the reference shown here.`
      );
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || `${label} payment request could not be created.`);
    } finally {
      setCreatingCommunityPackageCode(null);
    }
  }

  async function startRoscaCycle() {
    const clanId = Number(shop?.clan_id || selectedClanId || 0);
    const amount = Number(roscaContributionAmount || 0);
    const interval = Number(roscaIntervalDays || 30);
    if (!clanId) {
      showNotice("error", "Choose a marketplace first.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      showNotice("error", "Enter a ROSCA contribution amount above zero.");
      return;
    }

    setStartingRoscaCycle(true);
    try {
      const result = await apiJson<any>("/api/rosca/cycles", {
        method: "POST",
        body: JSON.stringify({
          clan_id: clanId,
          title: safeStr(roscaTitle) || "Community ROSCA cycle",
          contribution_amount: amount.toFixed(2),
          currency: safeStr(roscaCurrency).toUpperCase() || "GBP",
          interval_days: Number.isFinite(interval) && interval > 0 ? Math.floor(interval) : 30,
          note: "Started from Shop Control marketplace capacity.",
        }),
      });

      await loadPage({ background: true });
      showNotice(
        "success",
        firstTruthy(
          result?.message,
          "ROSCA cycle started. Member contribution references are ready."
        )
      );
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "ROSCA cycle could not be started.");
    } finally {
      setStartingRoscaCycle(false);
    }
  }

  async function recordRoscaPayout(cycleId: string, roundNumber: number) {
    const clanId = Number(shop?.clan_id || selectedClanId || 0);
    if (!clanId || !cycleId || !roundNumber) {
      showNotice("error", "ROSCA payout status is not ready yet.");
      return;
    }

    const busyKey = `${cycleId}:${roundNumber}`;
    setRecordingRoscaPayoutKey(busyKey);
    try {
      const result = await apiJson<any>(
        `/api/rosca/cycles/${encodeURIComponent(cycleId)}/rounds/${roundNumber}/payout?clan_id=${clanId}`,
        {
          method: "POST",
          body: JSON.stringify({
            note: "Recorded from Shop Control after confirmed contributions.",
          }),
        }
      );

      await loadPage({ background: true });
      showNotice(
        "success",
        firstTruthy(
          result?.message,
          "ROSCA payout recorded. GSN did not execute an external payout."
        )
      );
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "ROSCA payout could not be recorded.");
    } finally {
      setRecordingRoscaPayoutKey(null);
    }
  }

  async function createMeetingReminder() {
    const clanId = Number(shop?.clan_id || selectedClanId || 0);
    if (!clanId) {
      showNotice("error", "Choose a marketplace first.");
      return;
    }
    if (!safeStr(meetingTitle)) {
      showNotice("error", "Add a short meeting title first.");
      return;
    }

    setCreatingMeetingReminder(true);
    try {
      const result = await apiJson<any>("/api/community-meetings/reminders", {
        method: "POST",
        body: JSON.stringify({
          clan_id: clanId,
          title: safeStr(meetingTitle) || "Community meeting",
          purpose: safeStr(meetingPurpose) || undefined,
          scheduled_at: safeStr(meetingScheduledAt) || undefined,
          whatsapp_number: safeStr(meetingWhatsappNumber) || undefined,
          note: "Created from Shop Control marketplace capacity.",
        }),
      });

      await loadPage({ background: true });
      const whatsappUrl = firstTruthy(result?.meeting?.whatsapp_share_url);
      showNotice(
        "success",
        firstTruthy(
          result?.message,
          whatsappUrl
            ? "Meeting reminder recorded. WhatsApp share is ready."
            : "Meeting reminder recorded as TrustEvent evidence."
        )
      );
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Meeting reminder could not be recorded.");
    } finally {
      setCreatingMeetingReminder(false);
    }
  }

  async function recordMeetingSummary() {
    const clanId = Number(shop?.clan_id || selectedClanId || 0);
    const meetingId = firstTruthy(meetingForActions?.meeting_id);
    if (!clanId || !meetingId) {
      showNotice("error", "Create a meeting reminder before adding the summary.");
      return;
    }
    if (!safeStr(meetingSummary)) {
      showNotice("error", "Add the meeting summary first.");
      return;
    }

    const attendance = Number(meetingAttendanceCount || 0);
    setRecordingMeetingSummary(true);
    try {
      const result = await apiJson<any>(
        `/api/community-meetings/${encodeURIComponent(meetingId)}/summary`,
        {
          method: "POST",
          body: JSON.stringify({
            clan_id: clanId,
            summary: safeStr(meetingSummary),
            decisions: safeStr(meetingDecisions) || undefined,
            attendance_count:
              Number.isFinite(attendance) && attendance >= 0 ? Math.floor(attendance) : undefined,
            note: "Recorded from Shop Control marketplace capacity.",
          }),
        }
      );

      setMeetingSummary("");
      setMeetingDecisions("");
      setMeetingAttendanceCount("");
      await loadPage({ background: true });
      showNotice(
        "success",
        firstTruthy(
          result?.message,
          "Meeting summary recorded as TrustEvent evidence."
        )
      );
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Meeting summary could not be recorded.");
    } finally {
      setRecordingMeetingSummary(false);
    }
  }

  async function recordMeetingInterest(response: "yes" | "maybe" | "no") {
    const clanId = Number(shop?.clan_id || selectedClanId || 0);
    const meetingId = firstTruthy(meetingForActions?.meeting_id);
    if (!clanId || !meetingId) {
      showNotice("error", "Create a meeting reminder before asking members to respond.");
      return;
    }

    setRecordingMeetingInterest(response);
    try {
      const result = await apiJson<any>(
        `/api/community-meetings/${encodeURIComponent(meetingId)}/interest`,
        {
          method: "POST",
          body: JSON.stringify({
            clan_id: clanId,
            response,
            note: "Recorded from Shop Control meeting planning.",
          }),
        }
      );

      await loadPage({ background: true });
      showNotice(
        "success",
        firstTruthy(
          result?.message,
          "Meeting response recorded. The planning count is updated."
        )
      );
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Meeting response could not be recorded.");
    } finally {
      setRecordingMeetingInterest(null);
    }
  }


  async function openMeetingAttendanceSession() {
    const clanId = Number(shop?.clan_id || selectedClanId || 0);
    const meetingId = firstTruthy(meetingForActions?.meeting_id, routeMeetingId);
    if (!clanId || !meetingId) {
      showNotice("error", "Create a meeting reminder before opening attendance.");
      return;
    }

    const windowMinutes = Number(meetingAttendanceWindowMinutes || 120);
    setOpeningAttendanceSession(true);
    try {
      const result = await apiJson<any>(
        `/api/community-meetings/${encodeURIComponent(meetingId)}/attendance-sessions`,
        {
          method: "POST",
          body: JSON.stringify({
            clan_id: clanId,
            method: meetingAttendanceMethod,
            window_minutes:
              Number.isFinite(windowMinutes) && windowMinutes >= 5
                ? Math.min(720, Math.floor(windowMinutes))
                : 120,
            note:
              meetingAttendanceMethod === "bluetooth_proximity"
                ? "Opened as proximity evidence. Browser Bluetooth scan is not automatic in this slice."
                : "Opened as QR meeting attendance evidence.",
          }),
        }
      );

      setOpenedAttendanceSession(result?.attendance_session || null);
      await loadPage({ background: true });
      showNotice(
        "success",
        firstTruthy(result?.message, "Attendance check-in is open.")
      );
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Attendance check-in could not be opened.");
    } finally {
      setOpeningAttendanceSession(false);
    }
  }

  async function recordMeetingAttendanceCheckin(
    method: "qr" | "bluetooth_proximity" = "qr",
    noteOverride = ""
  ) {
    const clanId = Number(shop?.clan_id || selectedClanId || 0);
    const meetingId = firstTruthy(meetingForActions?.meeting_id, routeMeetingId);
    const token = activeAttendanceToken;
    if (!clanId || !meetingId || !token) {
      showNotice("error", "Open or scan an active attendance QR before recording attendance.");
      return false;
    }

    setRecordingAttendanceCheckin(true);
    try {
      const result = await apiJson<any>(
        `/api/community-meetings/${encodeURIComponent(meetingId)}/attendance-check-ins`,
        {
          method: "POST",
          body: JSON.stringify({
            clan_id: clanId,
            attendance_token: token,
            method,
            note: firstTruthy(
              noteOverride,
              method === "bluetooth_proximity"
                ? "Recorded as proximity Presence Evidence. No automatic browser Bluetooth scan was performed."
                : "Recorded from meeting attendance QR."
            ),
          }),
        }
      );

      await loadPage({ background: true });
      showNotice(
        "success",
        firstTruthy(result?.message, "Attendance recorded with check-in time.")
      );
      return true;
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Attendance could not be recorded.");
      return false;
    } finally {
      setRecordingAttendanceCheckin(false);
    }
  }

  async function recordBluetoothPresenceAttendance() {
    if (!activeAttendanceToken) {
      showNotice("error", "Scan or open an active attendance link before using Bluetooth presence.");
      return;
    }

    const bluetooth = (navigator as NavigatorWithBluetooth).bluetooth;
    if (!bluetooth?.requestDevice) {
      const message = "This browser does not support Web Bluetooth. Use the QR check-in instead.";
      setBluetoothPresenceStatus(message);
      showNotice("error", message);
      return;
    }

    if (typeof window !== "undefined" && !window.isSecureContext) {
      const message = "Bluetooth check-in needs HTTPS or localhost. Use the QR check-in here.";
      setBluetoothPresenceStatus(message);
      showNotice("error", message);
      return;
    }

    setCheckingBluetoothPresence(true);
    setBluetoothPresenceStatus("Opening the Bluetooth chooser...");
    try {
      const device = await bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["battery_service"],
      });
      const deviceName = firstTruthy(device?.name, "nearby Bluetooth device");
      setBluetoothPresenceStatus(`Bluetooth chooser confirmed ${deviceName}. Recording attendance...`);
      const recorded = await recordMeetingAttendanceCheckin(
        "bluetooth_proximity",
        "Member completed an explicit browser Bluetooth chooser before attendance was recorded. Device identifier was not stored by GSN UI."
      );
      if (recorded) {
        setBluetoothPresenceStatus(`Bluetooth presence check recorded for ${deviceName}.`);
      }
    } catch (err: any) {
      const errorName = safeStr(err?.name);
      const message =
        errorName === "NotFoundError"
          ? "Bluetooth check was cancelled or no nearby device was selected. QR check-in is still available."
          : safeStr(err?.message) || "Bluetooth check-in could not be completed. Use the QR check-in instead.";
      setBluetoothPresenceStatus(message);
      showNotice("error", message);
    } finally {
      setCheckingBluetoothPresence(false);
    }
  }
  function fallbackShopName(): string {
    return (
      safeStr(shopName) ||
      firstTruthy(me?.display_name, me?.email).replace(/@.*$/, "").trim() ||
      firstTruthy(me?.gmfn_id) ||
      "My GSN Shop"
    );
  }

  async function saveShopDetails(extra?: Partial<ShopRecord> & { clear_image?: boolean }) {
    if (marketplaceShopsFeatureOff) {
      showNotice("error", marketplaceShopsFeatureOffText);
      return;
    }

    setSavingShop(true);

    try {
      const body: any = {
        clan_id: Number(shop?.clan_id || selectedClanId || 0) || null,
        name: safeStr(extra?.name ?? shopName) || fallbackShopName(),
        description: safeStr(extra?.description ?? shopDescription) || null,
        whatsapp_number: safeStr(extra?.whatsapp_number ?? whatsApp) || null,
        telegram_handle: safeStr(extra?.telegram_handle ?? telegramHandle) || null,
      };

      if (shop?.id && extra?.clear_image) {
        body.clear_image = true;
      } else if (extra && "image_url" in extra) {
        body.image_url = safeStr(extra.image_url) || null;
      } else {
        body.image_url = safeStr(imageUrlInput) || null;
      }

      const res = await apiJson<any>(shop?.id ? `/api/marketplace/shops/${shop.id}` : "/api/marketplace/shops", {
        method: shop?.id ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });

      if (res?.submitted_for_review) {
        const message =
          safeStr(res?.message) || "Shop details were sent for community admin review.";
        setActiveOwnerLayer("shop-details");
        showNotice("success", message);
        return;
      }

      const updated = (res?.item || shop) as ShopRecord;
      setShop(updated);
      setShopName(firstTruthy(updated?.name));
      setShopDescription(firstTruthy(updated?.description));
      setWhatsApp(firstTruthy(updated?.whatsapp_number));
      setTelegramHandle(firstTruthy(updated?.telegram_handle));
      setImageUrlInput(firstTruthy(updated?.image_url));
      setActiveOwnerLayer("shop-details");
      showNotice("success", "Shop billboard details saved on the system.");
    } catch (err: any) {
      showNotice("error", shopControlRequestErrorMessage(err) || "Shop details could not be saved.");
    } finally {
      setSavingShop(false);
    }
  }

  async function ensureSpotlightShopRecord(): Promise<ShopRecord | null> {
    if (shop?.id) {
      setSpotlightFlowStep("upload");
      return shop;
    }

    if (marketplaceShopsFeatureOff) {
      setSpotlightPublishFeedback({
        tone: "error",
        text: marketplaceShopsFeatureOffText,
      });
      showNotice("error", marketplaceShopsFeatureOffText);
      return null;
    }

    const clanId = Number(selectedClanId || 0);
    if (clanId <= 0) {
      const message =
        "Select the community first, then GSN can create the shop record that spotlight belongs to.";
      setSpotlightPublishFeedback({ tone: "error", text: message });
      showNotice("error", message);
      return null;
    }

    const preparedShopName =
      safeStr(shopName) ||
      firstTruthy(me?.display_name, me?.email).replace(/@.*$/, "").trim() ||
      "My GSN Shop";

    setCreatingSpotlightShop(true);
    setSpotlightPublishFeedback(null);

    try {
      const res = await createMarketplaceShop({
        clan_id: clanId,
        name: preparedShopName,
        description: safeStr(shopDescription) || null,
        whatsapp_number: safeStr(whatsApp) || null,
        telegram_handle: safeStr(telegramHandle) || null,
      });

      if (res?.submitted_for_review) {
        const message =
          safeStr(res?.message) || "Shop details were sent for community admin review.";
        setSpotlightPublishFeedback({ tone: "success", text: message });
        showNotice("success", message);
        await loadPage({ background: true, preferredClanId: clanId });
        return null;
      }

      const created = (res?.item || null) as ShopRecord | null;
      if (!created?.id) {
        throw new Error("GSN could not prepare the shop record for spotlight yet.");
      }

      setShop(created);
      setShopName(firstTruthy(created?.name, preparedShopName));
      setShopDescription(firstTruthy(created?.description, shopDescription));
      setWhatsApp(firstTruthy(created?.whatsapp_number, whatsApp));
      setTelegramHandle(firstTruthy(created?.telegram_handle, telegramHandle));
      setImageUrlInput(firstTruthy(created?.image_url));
      setSpotlightFlowStep("upload");
      const successMessage =
        "Shop record is ready. Continue with the product spotlight.";
      setSpotlightPublishFeedback({ tone: "success", text: successMessage });
      showNotice("success", successMessage);
      await loadPage({ background: true, preferredClanId: Number(created?.clan_id || clanId) });
      return created;
    } catch (err: any) {
      const errorMessage =
        shopControlRequestErrorMessage(err) || "GSN could not create the shop record yet.";
      setSpotlightPublishFeedback({ tone: "error", text: errorMessage });
      showNotice("error", errorMessage);
      return null;
    } finally {
      setCreatingSpotlightShop(false);
    }
  }

  async function handleSpotlightImagePicked(file: File | null) {
    spotlightImagePrepJobRef.current += 1;
    const prepJob = spotlightImagePrepJobRef.current;

    setPreparingSpotlightImage(false);

    if (!file) {
      setSpotlightImageInputKey((prev) => prev + 1);
      return;
    }

    const validationIssue = validateSpotlightImageFile(file, false);
    if (validationIssue) {
      showNotice("error", validationIssue);
      setSpotlightImageInputKey((prev) => prev + 1);
      return;
    }

    try {
      setPreparingSpotlightImage(true);
      const prepared = await prepareSpotlightImageFile(file, {
        maxBytes: SPOTLIGHT_MAX_IMAGE_BYTES,
      });

      if (spotlightImagePrepJobRef.current !== prepJob) return;

      const preparedValidationIssue = validateSpotlightImageFile(prepared.file, true);
      if (preparedValidationIssue) {
        showNotice("error", preparedValidationIssue);
        setSpotlightImageInputKey((prev) => prev + 1);
        return;
      }

      setSpotlightImageFile(prepared.file);
      setSpotlightPublishFeedback(null);
      if (spotlightMediaChoice === "image" || spotlightMediaChoice === "both") {
        setSpotlightFlowStep("preview");
      }
      if (prepared.message) {
        showNotice("info", prepared.message);
      } else {
        showNotice(
          "info",
          `${safeStr(prepared.file.name) || "Selected image"} is ready for spotlight publish.`
        );
      }
    } catch (err: any) {
      if (spotlightImagePrepJobRef.current !== prepJob) return;
      showNotice(
        "error",
        safeStr(err?.message) || "This image could not be prepared for spotlight publish."
      );
      setSpotlightImageInputKey((prev) => prev + 1);
    } finally {
      if (spotlightImagePrepJobRef.current === prepJob) {
        setPreparingSpotlightImage(false);
      }
    }
  }

  async function handleSpotlightVideoPicked(file: File | null) {
    spotlightVideoPrepJobRef.current += 1;
    const prepJob = spotlightVideoPrepJobRef.current;

    setPreparingSpotlightVideo(false);

    if (!file) {
      setSpotlightVideoInputKey((prev) => prev + 1);
      return;
    }

    const validationIssue = validateSpotlightVideoFile(file, false);
    if (validationIssue) {
      showNotice("error", validationIssue);
      setSpotlightVideoInputKey((prev) => prev + 1);
      return;
    }

    try {
      setPreparingSpotlightVideo(true);
      const prepared = await prepareSpotlightVideoFile(file, {
        maxBytes: SPOTLIGHT_MAX_VIDEO_BYTES,
        maxDurationSeconds: SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS,
      });

      if (spotlightVideoPrepJobRef.current !== prepJob) return;

      const preparedValidationIssue = validateSpotlightVideoFile(prepared.file, true);
      if (preparedValidationIssue) {
        showNotice("error", preparedValidationIssue);
        setSpotlightVideoInputKey((prev) => prev + 1);
        return;
      }

      setSpotlightVideoFile(prepared.file);
      setSpotlightVideoDurationSeconds(prepared.durationSeconds ?? null);
      setSpotlightPublishFeedback(null);
      if (spotlightMediaChoice === "video" || spotlightMediaChoice === "both") {
        setSpotlightFlowStep("preview");
      }
      if (prepared.message) {
        showNotice("info", prepared.message);
      } else {
        showNotice(
          "info",
          `${safeStr(prepared.file.name) || "Selected video"} is ready for spotlight publish.`
        );
      }
    } catch (err: any) {
      if (spotlightVideoPrepJobRef.current !== prepJob) return;

      const canUseOriginalForPilot =
        Number(file.size || 0) <= SPOTLIGHT_MAX_VIDEO_BYTES &&
        !validateSpotlightVideoFile(file, true);

      if (canUseOriginalForPilot) {
        setSpotlightVideoFile(file);
        setSpotlightVideoDurationSeconds(null);
        setSpotlightPublishFeedback(null);
        if (spotlightMediaChoice === "video") {
          setSpotlightFlowStep("preview");
        }
        showNotice(
          "info",
          "This phone could not trim the video automatically, so GSN will use the uploaded file and play it as a 10-second spotlight clip."
        );
        return;
      }

      showNotice(
        "error",
        safeStr(err?.message) || "This video could not be prepared for spotlight publish."
      );
      setSpotlightVideoInputKey((prev) => prev + 1);
    } finally {
      if (spotlightVideoPrepJobRef.current === prepJob) {
        setPreparingSpotlightVideo(false);
      }
    }
  }

  function composeSpotlightMessage(): string {
    const parts = [
      safeStr(spotlightProductName),
      safeStr(spotlightPriceNote),
      safeStr(spotlightMessage),
    ].filter(Boolean);

    return parts.join(" - ");
  }

  async function handleCreateSpotlight() {
    if (creatingSpotlight) {
      setSpotlightPublishFeedback({
        tone: "info",
        text: "Spotlight publish is already running. Wait for it to finish.",
      });
      return;
    }

    if (spotlightFeatureOff) {
      setSpotlightPublishFeedback({
        tone: "error",
        text: spotlightFeatureOffText,
      });
      showNotice("error", spotlightFeatureOffText);
      return;
    }

    rememberPublishRecovery(
      routes.freeSpotlight,
      "shop-control.spotlight.preview.publish"
    );

    if (shopActionsLocked && spotlightPriorityMode === "paid") {
      const lockMessage =
        "Identity review is blocking paid spotlight right now. Open the identity review first, then return here to publish.";
      setSpotlightPublishFeedback({ tone: "error", text: lockMessage });
      showNotice("error", lockMessage);
      return;
    }

    const activeShop = shop?.id ? shop : await ensureSpotlightShopRecord();
    if (!activeShop?.id) {
      const missingShopMessage =
        "GSN could not connect this spotlight to your shop yet. Check the selected community, then try publish again.";
      setSpotlightPublishFeedback({ tone: "error", text: missingShopMessage });
      showNotice("error", missingShopMessage);
      return;
    }

    const targetClanId = Number(activeShop?.clan_id || selectedClanId || effectiveShopClanId || 0);

    if (preparingSpotlightImage || preparingSpotlightVideo) {
      const preparingMessage =
        "Please wait while the app prepares your spotlight media, then tap Publish again.";
      setSpotlightPublishFeedback({ tone: "info", text: preparingMessage });
      showNotice("error", preparingMessage);
      return;
    }

    const message = composeSpotlightMessage();
    const manualImageUrl = safeStr(spotlightImageUrl);
    const manualVideoUrl = safeStr(spotlightVideoUrl);

    if (!message && !manualImageUrl && !manualVideoUrl && !spotlightImageFile && !spotlightVideoFile) {
      const emptyMessage =
        "Add product details, price, picture, or short video first, then tap Publish.";
      setSpotlightPublishFeedback({ tone: "error", text: emptyMessage });
      showNotice("error", emptyMessage);
      return;
    }

    const imageValidationIssue = validateSpotlightImageFile(spotlightImageFile);
    if (imageValidationIssue) {
      setSpotlightPublishFeedback({ tone: "error", text: imageValidationIssue });
      showNotice("error", imageValidationIssue);
      return;
    }

    const videoValidationIssue = validateSpotlightVideoFile(spotlightVideoFile);
    if (videoValidationIssue) {
      setSpotlightPublishFeedback({ tone: "error", text: videoValidationIssue });
      showNotice("error", videoValidationIssue);
      return;
    }

    setCreatingSpotlight(true);
    setSpotlightPublishFeedback(null);

    try {
      let imageUrl = manualImageUrl;
      let videoUrl = manualVideoUrl;

      if (spotlightImageFile) {
        const uploadRes = await uploadMarketplaceImageFile(
          spotlightImageFile,
          targetClanId || null
        );
        imageUrl = firstTruthy(
          uploadRes?.image_url,
          uploadRes?.url,
          uploadRes?.file_url,
          uploadRes?.path,
          uploadRes?.item?.image_url,
          uploadRes?.data?.image_url
        );

        if (!imageUrl) {
          throw new Error(
            "Image upload completed but the system did not return a usable image link."
          );
        }
      }

      if (spotlightVideoFile) {
        const uploadRes = await uploadMarketplaceVideoFile(
          spotlightVideoFile,
          spotlightVideoDurationSeconds != null &&
            spotlightVideoDurationSeconds <= SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS
            ? spotlightVideoDurationSeconds
            : null,
          targetClanId || null
        );
        videoUrl = firstTruthy(
          uploadRes?.video_url,
          uploadRes?.url,
          uploadRes?.file_url,
          uploadRes?.path,
          uploadRes?.item?.video_url,
          uploadRes?.data?.video_url
        );

        if (!videoUrl) {
          throw new Error(
            "Video upload completed but the system did not return a usable video link."
          );
        }
      }

      const createRes = await createMarketplaceBroadcast({
        clan_id: targetClanId,
        shop_id: Number(activeShop.id),
        message: message || "Spotlight update",
        image_url: imageUrl || null,
        video_url: videoUrl || null,
        priority_mode: spotlightPriorityMode,
        visibility_scope: "direct_communities",
      });

      const createdSpotlight =
        (createRes as any)?.item ||
        (Array.isArray((createRes as any)?.items)
          ? (createRes as any).items?.[0]
          : null);
      const optimisticSpotlight = {
        ...(createdSpotlight || {}),
        id: Number(createdSpotlight?.id || Date.now()),
        clan_id: Number(createdSpotlight?.clan_id || targetClanId || 0),
        shop_id: Number(createdSpotlight?.shop_id || activeShop.id || 0),
        message: firstTruthy(createdSpotlight?.message, message, "Spotlight update"),
        image_url: firstTruthy(createdSpotlight?.image_url, imageUrl),
        video_url: firstTruthy(createdSpotlight?.video_url, videoUrl),
        priority_mode: firstTruthy(createdSpotlight?.priority_mode, spotlightPriorityMode),
        visibility_scope: firstTruthy(
          createdSpotlight?.visibility_scope,
          "direct_communities"
        ),
        created_at: firstTruthy(createdSpotlight?.created_at, new Date().toISOString()),
        source_shop_name: firstTruthy(createdSpotlight?.source_shop_name, activeShop.name),
      };

      const propagatedCount = Number(
        createRes?.propagated_count ||
          (Array.isArray(createRes?.propagated_clan_ids)
            ? createRes.propagated_clan_ids.length
            : 0)
      );
      const communityPlacementText =
        propagatedCount > 1 ? ` into ${propagatedCount} community feeds` : "";
      const successMessage =
        `${spotlightPriorityMode === "paid" ? "Paid" : "Free"} spotlight published` +
        communityPlacementText +
        `${videoUrl ? " with short video." : "."}`;

      clearSpotlightDraft();
      setSpotlights((prev) => [
        optimisticSpotlight,
        ...prev.filter((item) => Number(item?.id || 0) !== Number(optimisticSpotlight.id)),
      ]);
      setSpotlightPublishFeedback({
        tone: "success",
        text: successMessage,
      });
      showNotice("success", successMessage);
      scheduleSpotlightSuccessCollapse();

      try {
        await loadPage({
          background: true,
          preferredClanId: targetClanId,
        });
      } catch (refreshErr: any) {
        const refreshMessage =
          shopControlRequestErrorMessage(refreshErr) ||
          "Spotlight published, but the page could not refresh immediately.";
        setSpotlightPublishFeedback({
          tone: "info",
          text: refreshMessage,
        });
        showNotice("info", refreshMessage);
      }
    } catch (err: any) {
      const errorMessage =
        shopControlRequestErrorMessage(err) || "Spotlight could not be created.";
      setSpotlightPublishFeedback({
        tone: "error",
        text: errorMessage,
      });
      showNotice("error", errorMessage);
    } finally {
      setCreatingSpotlight(false);
    }
  }

  const spotlightModeIsPaid = spotlightPriorityMode === "paid";
  const spotlightPortalTitle = spotlightModeIsPaid
    ? "Spotlight Subscription"
    : "Free Spotlight";
  const spotlightPortalSubtitle = spotlightModeIsPaid
    ? "Use the paid lane only after the subscription payment is confirmed."
    : "Show one clear shop update to people inside your community.";
  const spotlightLaneIcon: GsnIconName = spotlightModeIsPaid
    ? "financeInstitution"
    : "megaphone";
  const spotlightStepBadges = [
    { key: "upload", label: "1. Product update" },
    { key: "preview", label: "2. Publish" },
  ] satisfies ShopControlSpotlightStepBadge[];
  const spotlightPreviewHasPicture = Boolean(spotlightImageFile || safeStr(spotlightImageUrl));
  const spotlightPreviewHasVideo = Boolean(spotlightVideoFile || safeStr(spotlightVideoUrl));
  const spotlightPreviewMessage = composeSpotlightMessage();
  const spotlightWorkflowProps = {
    isCompact,
    pageCard,
    spotlightLaneIcon,
    sectionLabel,
    spotlightPortalTitle,
    helperText,
    spotlightPortalSubtitle,
    spotlightStepBadges,
    spotlightFlowStep,
    badge,
    communityName,
    spotlightFeatureOff,
    noticeCard,
    spotlightFeatureOffText,
    marketplaceShopsFeatureOff,
    shop,
    marketplaceShopsFeatureOffText,
    currentActiveSpotlight,
    firstTruthy,
    spotlightPublishFeedback,
    innerCard,
    labelWithIcon,
    shopName,
    setShopName,
    inputStyle,
    whatsApp,
    setWhatsApp,
    telegramHandle,
    setTelegramHandle,
    shopDescription,
    setShopDescription,
    textAreaStyle,
    controlGrid,
    ensureSpotlightShopRecord,
    creatingSpotlightShop,
    collapseSpotlightTools,
    controlIconTile,
    spotlightPriorityMode,
    setSpotlightPriorityMode,
    navigate,
    routes,
    location,
    spotlightMediaChoice,
    setSpotlightMediaChoice,
    inlineIcon,
    spotlightProductName,
    setSpotlightProductName,
    spotlightPriceNote,
    setSpotlightPriceNote,
    spotlightMessage,
    setSpotlightMessage,
    preparingSpotlightImage,
    creatingSpotlight,
    showNotice,
    spotlightImageInputKey,
    handleSpotlightImagePicked,
    spotlightImageFile,
    formatFileSize,
    preparingSpotlightVideo,
    spotlightVideoInputKey,
    handleSpotlightVideoPicked,
    spotlightVideoFile,
    spotlightVideoDurationSeconds,
    spotlightCanContinueToPreview,
    setSpotlightFlowStep,
    spotlightImagePreviewUrl,
    spotlightVideoPreviewUrl,
    spotlightPilotMaxVideoSeconds: SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS,
    spotlightPreviewMessage,
    spotlightPreviewHasPicture,
    spotlightPreviewHasVideo,
    handleCreateSpotlight,
    shopActionsLocked,
  } satisfies ShopControlSpotlightWorkflowProps;

  const spotlightWorkflowSection = spotlightOpen ? (
    <React.Suspense
      fallback={
        <section
          id="shop-control-spotlight"
          style={pageCard("linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 54%, #EAF3FF 100%)")}
        >
          <div style={sectionLabel()}>Spotlight publisher</div>
          <div style={{ marginTop: 8, color: "#07172C", fontSize: isCompact ? 22 : 26, fontWeight: 950 }}>
            Opening spotlight publisher...
          </div>
        </section>
      }
    >
      <ShopControlSpotlightWorkflow {...spotlightWorkflowProps} />
    </React.Suspense>
  ) : null;
  if (loading) {
    return (
      <div style={institutionalBlueRailShell(isCompact, { gap: 18 })}>
        <PageTopNav
          sectionLabel="Shop Control"
          title="Shop Control"
          subtitle="Loading shop control..."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.marketplace}
          backLabel="Marketplace"
        />
        <section style={pageCard()}>
          <div style={helperText()}>Loading shop control...</div>
        </section>
      </div>
    );
  }

  if (spotlightWorkflowSection) {
    return (
      <div style={institutionalBlueRailShell(isCompact)}>
        <ShopControlFieldPolish />
        <PageTopNav
          sectionLabel="Spotlight Portal"
          title={spotlightPortalTitle}
          subtitle={spotlightPortalSubtitle}
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.shop}
          backLabel="Shop Control"
        />

        {detailsLoading ? (
          <div style={noticeCard("info")}>Spotlight is open. Live status, payment, and capacity rows are still refreshing.</div>
        ) : null}
        {identityLockNotice ? (
          <div style={noticeCard("info")}>
            Identity review is needed before protected shop actions can run. {identityLockNotice}
          </div>
        ) : null}
        {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}
        {spotlightWorkflowSection}
      </div>
    );
  }

  return (
    <div style={institutionalBlueRailShell(isCompact)}>
      <ShopControlFieldPolish />
      <PageTopNav
        sectionLabel="Focused Task"
        title="Shop Control"
        subtitle=""
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.marketplace}
        backLabel="Marketplace"
      />

      {detailsLoading ? (
        <div style={noticeCard("info")}>Shop Control is open. Live Spotlight, Vault, payment, and capacity rows are still refreshing.</div>
      ) : null}

      {identityLockNotice ? (
        <>
          <div style={noticeCard("info")}>
            Identity review is needed before protected shop actions can run. {identityLockNotice}
          </div>
          <RealLifeMeaningGuide
            compact={isCompact}
            guidance={getRealLifeTrustGuidance("shop-control-readiness")}
          />
        </>
      ) : null}

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      {activeOwnerLayer === "overview" || activeOwnerLayer === "products" ? (
      <section
        id="shop-control-summary"
        style={{
          ...pageCard(
            "radial-gradient(circle at 12% 0%, rgba(217,172,51,0.14) 0%, rgba(217,172,51,0) 28%), linear-gradient(180deg, #071827 0%, #0B2942 56%, #123A59 100%)"
          ),
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            right: isCompact ? -22 : 16,
            top: isCompact ? 14 : -10,
            opacity: 0.08,
            pointerEvents: "none",
            transform: isCompact ? "rotate(-6deg)" : "rotate(-4deg)",
          }}
        >
          <GSNBrandMark width={isCompact ? 112 : 168} height={isCompact ? 140 : 210} />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 16,
            alignItems: "start",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div>
            <div style={{ ...sectionLabel(), color: "#F6D77A" }}>Owner shop control</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.1,
                textTransform: "uppercase",
              }}
            >
              {firstTruthy(shop?.name, "My Shop")}
            </div>

            <div
              style={{
                marginTop: 12,
                ...helperText(),
                maxWidth: 860,
                color: "#D7E3F1",
              }}
            >
              Use only the shop setup tools here: public shop face, products,
              and shop details.
            </div>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "repeat(2, minmax(0, 1fr))"
                  : "repeat(auto-fit, minmax(138px, 1fr))",
                gap: 8,
              }}
              aria-label="Shop control shortcuts"
            >
              {shopHeroShortcuts.map((item) => (
                <StableCtaLink
                  key={item.label}
                  to={item.to}
                  kind="soft"
                  fullWidth
                  debugId={`shop-control.hero-shortcut.${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  style={{
                    minHeight: 58,
                    padding: "9px 10px",
                    border: "1px solid rgba(246,215,122,0.28)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.05) 100%)",
                    color: "#F8FBFF",
                    boxShadow:
                      "0 8px 18px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.16)",
                    gap: 8,
                  }}
                >
                  {heroShortcutIconTile(item.icon)}
                  <span>{item.label}</span>
                </StableCtaLink>
              ))}
            </div>
          </div>

        </div>
      </section>
      ) : null}

      {activeOwnerLayer === "products" ? (
        <section
          id="shop-control-gallery-tools"
          style={pageCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 56%, #EAF4FF 100%)")}
        >
          <div
            style={{
              marginBottom: 14,
              ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #FFF9E7 100%)"),
              border: "1px solid rgba(214,170,69,0.16)",
            }}
          >
            <div style={sectionLabel()}>Shop Gallery Tools</div>
            <div style={{ marginTop: 8, color: "#0B1F33", fontSize: 20, fontWeight: 950 }}>
              Control the public shop billboard and 12 Shop Diaries.
            </div>
            <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
              Use this lane for pictures, products, diary blocks, and the public shop face.
              When the marketplace needs extra public shop blocks, open Marketplace Capacity.
            </div>
            <div style={{ marginTop: 12, ...controlGrid(isCompact, 170) }}>
              <StableCtaLink
                to={routes.shopDetails}
                kind="secondary"
                fullWidth
                debugId="shop-control.gallery.shop-billboard"
              >
                Shop billboard
              </StableCtaLink>
              <StableCtaLink
                to={routes.communityPackages}
                kind="secondary"
                fullWidth
                debugId="shop-control.gallery.community-package"
              >
                Marketplace capacity
              </StableCtaLink>
            </div>
          </div>
          <ShopAssetsPage
            embedded
            preferredClanId={effectiveShopClanId || selectedClanId || null}
            preferredGmfnId={firstTruthy(shop?.owner_gmfn_id, shop?.gmfn_id, me?.gmfn_id) || null}
            seedShop={shop}
            seedProducts={products}
          />
        </section>
      ) : null}
      {activeOwnerLayer === "paid-tools" ? (
      <section
        id="shop-control-unlocks"
        style={pageCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 55%, #EAF4FF 78%, #FFF7D8 100%)")}
      >
        <div style={sectionLabel()}>
          {merchantReleaseHashFocused ? "Merchant Release Rail" : "Optional paid tools"}
        </div>

        <div style={{ marginTop: 10, ...helperText(), maxWidth: 900 }}>
          {merchantReleaseHashFocused
            ? "This is a paid verification and release-evidence activity. Start here when a merchant or outside buyer needs a signed rail for the minimum trade packet."
            : "These are optional. Use them only when you need private viewing, public verification, or paid spotlight priority."}
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 12,
          }}
        >
          <div
            id="shop-control-vault-subscription"
            style={{
              ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #FFF9E7 100%)"),
              border: "1px solid rgba(212,175,55,0.12)",
              boxShadow: "0 16px 34px rgba(2,12,27,0.10)",
              order: merchantReleaseHashFocused ? 2 : 0,
            }}
          >
            <div style={sectionLabel()}>{labelWithIcon("vault", "Vault Control")}</div>
            <div style={{ marginTop: 10, color: "#0B1F33", fontSize: 20, fontWeight: 950 }}>
              Private offers, controlled access.
            </div>
            <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
              Pay for private slots, add private offers, then share one secure viewing link.
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badge(vaultProducts.length > 0)}>
                {labelWithIcon("vault", <>Offers: {vaultProducts.length} / 6</>)}
              </span>
              <span style={badge(vaultLinks.length > 0)}>
                {labelWithIcon("lock", <>Links: {vaultLinks.length}</>)}
              </span>
              <span style={badge(false)}>{labelWithIcon("check", vaultStateLabel)}</span>
              <span style={badge(false)}>
                {labelWithIcon("financeInstitution", <>Payment: {firstTruthy(latestVaultPayment?.status, "Not started")}</>)}
              </span>
            </div>
            {latestVaultPayment ? (
              <div
                style={{
                  marginTop: 12,
                  ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"),
                  border: "1px solid rgba(13,95,168,0.10)",
                }}
              >
                <div style={sectionLabel()}>Payment reference</div>
                <div style={{ marginTop: 8, color: "#0B1F33", fontSize: 17, fontWeight: 950 }}>
                  {firstTruthy(latestVaultPayment.reference_display, "Awaiting reference")}
                </div>
                <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                  {safeStr(latestVaultPayment.confirmed_at)
                    ? `Confirmed ${safeDateTime(latestVaultPayment.confirmed_at)}`
                    : firstTruthy(latestVaultPayment.status, "Expected")}
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={badge(false)}>
                    {labelWithIcon(
                      "globe",
                      <>
                        {firstTruthy(latestVaultPayment.amount, "0.00")}{" "}
                        {firstTruthy(latestVaultPayment.currency, "GBP")}
                      </>
                    )}
                  </span>
                  <span style={badge(Boolean(latestVaultPayment.matched_bank_event_id))}>
                    {labelWithIcon(
                      "bank",
                      <>Bank check: {latestVaultPayment.matched_bank_event_id ? "Matched" : "Waiting"}</>
                    )}
                  </span>
                </div>
                <PaymentProofSubmissionPanel
                  payment={latestVaultPayment as any}
                  clanId={Number(shop?.clan_id || selectedClanId || (latestVaultPayment as any)?.clan_id || 0)}
                  compact={isCompact}
                  title="Upload proof after transfer"
                  debugIdPrefix="shop-control.vault-payment-proof"
                  onNotice={(tone, text) => showNotice(tone, text)}
                  onUploaded={async () => {
                    await loadPage();
                  }}
                />
              </div>
            ) : null}
            {vaultFeatureOff ? (
              <div
                style={{
                  marginTop: 10,
                  borderRadius: 14,
                  border: "1px solid rgba(245,158,11,0.24)",
                  background: "linear-gradient(180deg, #FFF8E7 0%, #FFFDF6 100%)",
                  color: "#8A5A00",
                  padding: "10px 12px",
                  fontSize: 13,
                  fontWeight: 850,
                  lineHeight: 1.45,
                }}
              >
                {vaultFeatureOffText}
              </div>
            ) : null}
            <div style={{ marginTop: 8, ...controlGrid(isCompact, 160) }}>
              <PrimaryButton
                onClick={() => createVaultInstruction(1)}
                disabled={
                  shopActionsLocked ||
                  creatingVaultInstruction ||
                  vaultFeatureOff
                }
                busy={creatingVaultInstruction}
                busyLabel="Preparing..."
                fullWidth
                debugId="shop-control.vault.pay-1-slot"
              >
                {paidToolActionLabel({
                  locked: shopActionsLocked,
                  busy: creatingVaultInstruction,
                  idle: "Pay 1 slot",
                  busyText: "Preparing...",
                })}
              </PrimaryButton>
              <SecondaryButton
                onClick={() => createVaultInstruction(6)}
                disabled={
                  shopActionsLocked ||
                  creatingVaultInstruction ||
                  vaultFeatureOff
                }
                busy={creatingVaultInstruction}
                busyLabel="Preparing..."
                fullWidth
                debugId="shop-control.vault.pay-6-slots"
              >
                {paidToolActionLabel({
                  locked: shopActionsLocked,
                  busy: creatingVaultInstruction,
                  idle: "Pay 6 slots",
                  busyText: "Preparing...",
                })}
              </SecondaryButton>
              <StableCtaLink
                to={routes.shopAssets}
                kind="secondary"
                fullWidth
                debugId="shop-control.vault.manage-offers"
              >
                Manage private offers
              </StableCtaLink>
              <SubtleButton
                onClick={() => createVaultViewingLink()}
                disabled={
                  shopActionsLocked ||
                  creatingVaultLink ||
                  vaultProducts.length === 0
                }
                busy={creatingVaultLink}
                busyLabel="Creating link..."
                fullWidth
                debugId="shop-control.vault.create-link"
              >
                {paidToolActionLabel({
                  locked: shopActionsLocked,
                  busy: creatingVaultLink,
                  idle: "Create access link",
                  busyText: "Creating link...",
                })}
              </SubtleButton>
            </div>
            <div style={{ marginTop: 10, ...helperText(), fontSize: 12 }}>
              {vaultEvidenceText}
            </div>
          </div>

          <div
            id="shop-control-merchant-release-rail"
            style={{
              ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"),
              border: merchantReleaseHashFocused
                ? "1px solid rgba(214,170,69,0.28)"
                : "1px solid rgba(8,35,58,0.08)",
              boxShadow: merchantReleaseHashFocused
                ? "0 18px 38px rgba(6,24,39,0.14), inset 0 1px 0 rgba(255,255,255,0.9)"
                : "0 16px 34px rgba(2,12,27,0.08)",
              order: merchantReleaseHashFocused ? 1 : 0,
            }}
          >
            <div style={sectionLabel()}>Verification</div>
            <div style={{ marginTop: 10, color: "#0B1F33", fontSize: 18, fontWeight: 900 }}>
              Visitor verification
            </div>
            <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
              Let visitors review this shop through your TrustSlip page before they rely on it.
              A merchant can later record a minimum trade packet against the same signed rail: item,
              invoice, final WhatsApp evidence note, courier handoff, expected delivery, and payment
              schedule. It is still evidence for judgement only, not release approval for goods, credit, or money.
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badge(true)}>1. Create link</span>
              <span style={badge(false)}>2. Verify rail</span>
              <span style={badge(false)}>3. Packet recorded</span>
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badge(true)}>
                {trustSlipFeature?.merchant_verify_active ? "Active" : "Subscription required"}
              </span>
              <span style={badge(false)}>State: {merchantVerifyStateLabel}</span>
              <span style={badge(false)}>
                Payment: {firstTruthy(latestMerchantVerifyPayment?.status, "Not started")}
              </span>
            </div>
            <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
              <div style={helperText()}>
                {firstTruthy(
                  trustSlipFeature?.merchant_verify_detail,
                  "Merchant-facing verification is not active yet."
                )}
              </div>
              {latestMerchantVerifyPayment ? (
                <>
                  <div style={helperText()}>
                    Reference: {firstTruthy(latestMerchantVerifyPayment.reference_display, "Awaiting reference")}
                  </div>
                  <div style={helperText()}>
                    Amount: {firstTruthy(latestMerchantVerifyPayment.amount, "0.00")}{" "}
                    {firstTruthy(latestMerchantVerifyPayment.currency, "GBP")}
                  </div>
                  <div style={helperText()}>
                    Confirmation:
                    {" "}
                    {safeStr(latestMerchantVerifyPayment.confirmed_at)
                      ? `Confirmed ${safeDateTime(latestMerchantVerifyPayment.confirmed_at)}`
                      : firstTruthy(latestMerchantVerifyPayment.status, "Expected")}
                  </div>
                  <div style={helperText()}>
                    Bank check: {latestMerchantVerifyPayment.matched_bank_event_id ? "Matched" : "Waiting"}
                  </div>
                  <PaymentProofSubmissionPanel
                    payment={latestMerchantVerifyPayment as any}
                    clanId={Number(shop?.clan_id || selectedClanId || (latestMerchantVerifyPayment as any)?.clan_id || 0)}
                    compact={isCompact}
                    title="Upload proof after transfer"
                    debugIdPrefix="shop-control.merchant-verify-payment-proof"
                    onNotice={(tone, text) => showNotice(tone, text)}
                    onUploaded={async () => {
                      await loadPage();
                    }}
                  />
                </>
              ) : null}
            </div>
            <div style={{ marginTop: 10, ...helperText() }}>{merchantVerifyEvidenceText}</div>
            <div style={{ marginTop: 12, ...helperText() }}>Start or renew verification</div>
            {marketplaceShopsFeatureOff ? (
              <div
                style={{
                  marginTop: 10,
                  borderRadius: 14,
                  border: "1px solid rgba(245,158,11,0.24)",
                  background: "linear-gradient(180deg, #FFF8E7 0%, #FFFDF6 100%)",
                  color: "#8A5A00",
                  padding: "10px 12px",
                  fontSize: 13,
                  fontWeight: 850,
                  lineHeight: 1.45,
                }}
              >
                {marketplaceShopsFeatureOffText}
              </div>
            ) : null}
            <div style={{ marginTop: 8, ...controlGrid(isCompact, 160) }}>
              <PrimaryButton
                onClick={() => createMerchantVerifyInstruction()}
                disabled={
                  shopActionsLocked ||
                  creatingMerchantVerifyInstruction ||
                  marketplaceShopsFeatureOff
                }
                busy={creatingMerchantVerifyInstruction}
                busyLabel="Preparing..."
                fullWidth
                debugId="shop-control.verify.pay"
              >
                {paidToolActionLabel({
                  locked: shopActionsLocked,
                  busy: creatingMerchantVerifyInstruction,
                  idle: "Pay verification",
                  busyText: "Preparing...",
                })}
              </PrimaryButton>
            </div>
            <div style={{ marginTop: 10, ...helperText() }}>Use verification pages</div>
            <div style={{ marginTop: 8, ...controlGrid(isCompact, 160) }}>
              <StableCtaLink
                to={routes.trustSlip}
                kind="secondary"
                fullWidth
                debugId="shop-control.verify.trust-slip"
              >
                Open TrustSlip
              </StableCtaLink>
              {safeStr(trustSlipFeature?.public_verify_url) ? (
                <SecondaryButton
                  onClick={() =>
                    openExternalLink(String(trustSlipFeature?.public_verify_url))
                  }
                  fullWidth
                  debugId="shop-control.verify.public"
                >
                  Open public verification
                </SecondaryButton>
              ) : null}
            </div>
          </div>

          <div
            id="shop-control-paid-spotlight"
            style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #FFF8DE 56%, #F7FAFF 100%)")}
          >
            <div style={sectionLabel()}>{labelWithIcon("financeInstitution", "Spotlight Subscription")}</div>
            <div style={{ marginTop: 10, color: "#0B1F33", fontSize: 20, fontWeight: 950 }}>
              Paid priority, kept separate.
            </div>
            <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
              Payment, bank instructions, credits, and the paid publisher now live on the focused Subscription Spotlight page.
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badge(activePaidSpotlights.length > 0)}>
                {labelWithIcon("megaphone", <>Active: {activePaidSpotlights.length}</>)}
              </span>
              <span style={badge(canStartPaidSpotlight)}>
                {labelWithIcon("check", <>Subscription: {canStartPaidSpotlight ? "Ready" : "Not ready"}</>)}
              </span>
              <span style={badge(false)}>
                {labelWithIcon("financeInstitution", <>Payment: {firstTruthy(latestSpotlightPayment?.status, "Not started")}</>)}
              </span>
            </div>
            {latestSpotlightPayment ? (
              <div
                style={{
                  marginTop: 12,
                  ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"),
                  border: "1px solid rgba(13,95,168,0.10)",
                }}
              >
                <div style={sectionLabel()}>Payment reference</div>
                <div style={{ marginTop: 8, color: "#0B1F33", fontSize: 17, fontWeight: 950 }}>
                  {firstTruthy(latestSpotlightPayment.reference_display, "Awaiting reference")}
                </div>
                <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                  {safeStr(latestSpotlightPayment.confirmed_at)
                    ? `Confirmed ${safeDateTime(latestSpotlightPayment.confirmed_at)}`
                    : firstTruthy(latestSpotlightPayment.status, "Expected")}
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={badge(false)}>
                    {labelWithIcon(
                      "globe",
                      <>
                        {firstTruthy(latestSpotlightPayment.amount, "0.00")}{" "}
                        {firstTruthy(latestSpotlightPayment.currency, "GBP")}
                      </>
                    )}
                  </span>
                  <span style={badge(Boolean(latestSpotlightPayment.matched_bank_event_id))}>
                    {labelWithIcon(
                      "bank",
                      <>Bank check: {latestSpotlightPayment.matched_bank_event_id ? "Matched" : "Waiting"}</>
                    )}
                  </span>
                </div>
                <PaymentProofSubmissionPanel
                  payment={latestSpotlightPayment as any}
                  clanId={Number(shop?.clan_id || selectedClanId || (latestSpotlightPayment as any)?.clan_id || 0)}
                  compact={isCompact}
                  title="Upload proof after transfer"
                  debugIdPrefix="shop-control.spotlight-payment-proof"
                  onNotice={(tone, text) => showNotice(tone, text)}
                  onUploaded={async () => {
                    await loadPage();
                  }}
                />
              </div>
            ) : null}
            <div
              style={{
                marginTop: 12,
                ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #FFF9E7 100%)"),
                border: "1px solid rgba(11,31,51,0.08)",
              }}
            >
              <div style={sectionLabel()}>Next action</div>
              <div
                style={{
                  marginTop: 10,
                  color: "#0B1F33",
                  fontSize: 16,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                Subscription Spotlight is separate from Free Spotlight.
              </div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                Open the focused lane so a paid spotlight never falls back into the free composer.
              </div>
            </div>
            <div style={{ marginTop: 8, ...controlGrid(isCompact, 160) }}>
              <PrimaryButton
                onClick={() =>
                  navigateWithOrigin(navigate, routes.subscriptionSpotlight, location)
                }
                disabled={shopActionsLocked}
                fullWidth
                debugId="shop-control.subscription.open"
              >
                {paidToolActionLabel({
                  locked: shopActionsLocked,
                  busy: false,
                  idle: "Open Subscription Spotlight",
                  busyText: "Opening...",
                })}
              </PrimaryButton>
              <SecondaryButton
                onClick={() =>
                  navigateWithOrigin(navigate, routes.subscriptionSpotlight, location)
                }
                fullWidth
                debugId="shop-control.subscription.publisher"
              >
                Open paid publisher
              </SecondaryButton>
            </div>
            <div style={{ marginTop: 10, ...helperText(), fontSize: 12 }}>
              {spotlightEvidenceText}
            </div>
          </div>

          <div
            id="shop-control-community-packages"
            style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 58%, #FFF8DE 100%)")}
          >
            <div style={sectionLabel()}>Marketplace capacity</div>
            <div style={{ marginTop: 10, color: "#0B1F33", fontSize: 20, fontWeight: 950 }}>
              Add capacity when the marketplace needs more.
            </div>
            <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
              Generate the exact capacity reference. Extra shop blocks and member places
              activate after bank match. ROSCA starts contribution cycles, while meeting
              packs create reminder and summary evidence for TrustEvents.
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badge(false)}>ROSCA: GBP 60 yearly</span>
              <span style={badge(false)}>Other capacity units: GBP 1</span>
              <span style={badge(Boolean(latestCommunityPackagePayment))}>
                {latestCommunityPackagePayment
                  ? firstTruthy(latestCommunityPackagePayment.status, "Expected")
                  : "No request yet"}
              </span>
            </div>
            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "repeat(2, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              {communityPackageStatusText.map((text) => (
                <div
                  key={text}
                  style={{
                    minHeight: 38,
                    borderRadius: 14,
                    border: "1px solid rgba(13,95,168,0.11)",
                    background: "linear-gradient(180deg, #FFFFFF 0%, #EEF7FF 100%)",
                    color: "#1D4267",
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 10px",
                    fontSize: 12,
                    fontWeight: 900,
                    boxSizing: "border-box",
                  }}
                >
                  {text}
                </div>
              ))}
            </div>
            {latestCommunityPackagePayment ? (
              <div
                style={{
                  marginTop: 12,
                  ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"),
                  border: "1px solid rgba(13,95,168,0.10)",
                }}
              >
                <div style={sectionLabel()}>Latest capacity reference</div>
                <div style={{ marginTop: 8, color: "#0B1F33", fontSize: 16, fontWeight: 950 }}>
                  {firstTruthy(latestCommunityPackagePayment.reference_display, "Awaiting reference")}
                </div>
                <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                  {safeStr(latestCommunityPackagePayment.confirmed_at)
                    ? `Confirmed ${safeDateTime(latestCommunityPackagePayment.confirmed_at)}`
                    : firstTruthy(latestCommunityPackagePayment.status, "Expected")}
                </div>
                <PaymentProofSubmissionPanel
                  payment={latestCommunityPackagePayment as any}
                  clanId={Number(shop?.clan_id || selectedClanId || (latestCommunityPackagePayment as any)?.clan_id || 0)}
                  compact={isCompact}
                  title="Upload proof after transfer"
                  debugIdPrefix="shop-control.community-package-payment-proof"
                  onNotice={(tone, text) => showNotice(tone, text)}
                  onUploaded={async () => {
                    await loadPage();
                  }}
                />
              </div>
            ) : null}
            {marketplaceShopsFeatureOff || roscaCyclesFeatureOff ? (
              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gap: 8,
                }}
              >
                {marketplaceShopsFeatureOff ? (
                  <div
                    style={{
                      borderRadius: 14,
                      border: "1px solid rgba(245,158,11,0.24)",
                      background: "linear-gradient(180deg, #FFF8E7 0%, #FFFDF6 100%)",
                      color: "#8A5A00",
                      padding: "10px 12px",
                      fontSize: 13,
                      fontWeight: 850,
                      lineHeight: 1.45,
                    }}
                  >
                    {marketplaceShopsFeatureOffText}
                  </div>
              ) : null}
                {roscaCyclesFeatureOff ? (
                  <div
                    style={{
                      borderRadius: 14,
                      border: "1px solid rgba(245,158,11,0.24)",
                      background: "linear-gradient(180deg, #FFF8E7 0%, #FFFDF6 100%)",
                      color: "#8A5A00",
                      padding: "10px 12px",
                      fontSize: 13,
                      fontWeight: 850,
                      lineHeight: 1.45,
                    }}
                  >
                    {roscaCyclesFeatureOffText}
                  </div>
              ) : null}
              </div>
            ) : null}
            <div style={{ marginTop: 12, ...controlGrid(isCompact, 168) }}>
              <PrimaryButton
                onClick={() =>
                  createCommunityPackageInstruction("extra_shop_blocks", "Extra shop block", {
                    needsShop: true,
                  })
                }
                disabled={
                  shopActionsLocked ||
                  Boolean(creatingCommunityPackageCode) ||
                  marketplaceShopsFeatureOff
                }
                busy={creatingCommunityPackageCode === "extra_shop_blocks"}
                busyLabel="Preparing..."
                fullWidth
                debugId="shop-control.package.extra-shop-block"
              >
                Extra shop block
              </PrimaryButton>
              <SecondaryButton
                onClick={() =>
                  createCommunityPackageInstruction("extra_members", "Extra member place")
                }
                disabled={shopActionsLocked || Boolean(creatingCommunityPackageCode)}
                busy={creatingCommunityPackageCode === "extra_members"}
                busyLabel="Preparing..."
                fullWidth
                debugId="shop-control.package.extra-members"
              >
                Extra member place
              </SecondaryButton>
              <SecondaryButton
                onClick={() =>
                  createCommunityPackageInstruction("rosca_cycle", "ROSCA cycle")
                }
                disabled={
                  shopActionsLocked ||
                  Boolean(creatingCommunityPackageCode) ||
                  roscaCyclesFeatureOff
                }
                busy={creatingCommunityPackageCode === "rosca_cycle"}
                busyLabel="Preparing..."
                fullWidth
                debugId="shop-control.package.rosca-cycle"
              >
                ROSCA yearly
              </SecondaryButton>
              <SecondaryButton
                onClick={() =>
                  createCommunityPackageInstruction(
                    "community_meeting_pack",
                    "Community meeting pack"
                  )
                }
                disabled={shopActionsLocked || Boolean(creatingCommunityPackageCode)}
                busy={creatingCommunityPackageCode === "community_meeting_pack"}
                busyLabel="Preparing..."
                fullWidth
                debugId="shop-control.package.meeting-pack"
              >
                Meeting pack
              </SecondaryButton>
            </div>
            <div
              style={{
                marginTop: 12,
                ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"),
                border: "1px solid rgba(13,95,168,0.10)",
              }}
            >
              <div style={sectionLabel()}>ROSCA engine</div>
              <div
                style={{
                  marginTop: 8,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1.2fr 0.8fr 0.7fr 0.7fr",
                  gap: 10,
                  alignItems: "end",
                }}
              >
                <label style={{ display: "block" }}>
                  <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                    Cycle name
                  </div>
                  <input
                    value={roscaTitle}
                    onChange={(event) => setRoscaTitle(event.target.value)}
                    style={{ ...inputStyle(), marginTop: 6 }}
                    placeholder="Community ROSCA cycle"
                  />
                </label>
                <label style={{ display: "block" }}>
                  <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                    Contribution
                  </div>
                  <input
                    value={roscaContributionAmount}
                    onChange={(event) => setRoscaContributionAmount(event.target.value)}
                    style={{ ...inputStyle(), marginTop: 6 }}
                    inputMode="decimal"
                    placeholder="25.00"
                  />
                </label>
                <label style={{ display: "block" }}>
                  <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                    Currency
                  </div>
                  <input
                    value={roscaCurrency}
                    onChange={(event) => setRoscaCurrency(event.target.value.toUpperCase())}
                    style={{ ...inputStyle(), marginTop: 6 }}
                    maxLength={8}
                    placeholder="GBP"
                  />
                </label>
                <label style={{ display: "block" }}>
                  <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                    Days
                  </div>
                  <input
                    value={roscaIntervalDays}
                    onChange={(event) => setRoscaIntervalDays(event.target.value)}
                    style={{ ...inputStyle(), marginTop: 6 }}
                    inputMode="numeric"
                    placeholder="30"
                  />
                </label>
              </div>
              <div style={{ marginTop: 12, ...controlGrid(isCompact, 178) }}>
                <PrimaryButton
                  onClick={startRoscaCycle}
                  disabled={
                    shopActionsLocked ||
                    startingRoscaCycle ||
                    safePositiveNumber(
                      communityPackageByCode.get("rosca_cycle")?.active_remaining,
                      0
                    ) < 1
                  }
                  busy={startingRoscaCycle}
                  busyLabel="Starting..."
                  fullWidth
                  debugId="shop-control.rosca.start-cycle"
                >
                  Start ROSCA cycle
                </PrimaryButton>
                <SecondaryButton
                  onClick={() =>
                    nextRoscaPayoutRound && latestRoscaCycle?.cycle_id
                      ? recordRoscaPayout(
                          String(latestRoscaCycle.cycle_id),
                          Number(nextRoscaPayoutRound.round_number || 0)
                        )
                      : showNotice(
                          "info",
                          "No ROSCA round is ready for payout recording yet."
                        )
                  }
                  disabled={
                    shopActionsLocked ||
                    !nextRoscaPayoutRound ||
                    !latestRoscaCycle?.cycle_id ||
                    Boolean(recordingRoscaPayoutKey)
                  }
                  busy={
                    Boolean(nextRoscaPayoutRound) &&
                    recordingRoscaPayoutKey ===
                      `${latestRoscaCycle?.cycle_id}:${nextRoscaPayoutRound?.round_number}`
                  }
                  busyLabel="Recording..."
                  fullWidth
                  debugId="shop-control.rosca.record-payout"
                >
                  Record payout
                </SecondaryButton>
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 12 }}>
                {latestRoscaCycle ? (
                  <>
                    Latest cycle: {firstTruthy(latestRoscaCycle.title, "ROSCA cycle")} -{" "}
                    {safePositiveNumber(latestRoscaCycle.total_confirmed_contributions, 0)} /{" "}
                    {safePositiveNumber(latestRoscaCycle.total_expected_contributions, 0)}{" "}
                    contributions confirmed -{" "}
                    {safePositiveNumber(latestRoscaCycle.total_recorded_payouts, 0)} /{" "}
                    {safePositiveNumber(latestRoscaCycle.total_rounds, 0)} payouts recorded.
                  </>
                ) : (
                  "The active yearly ROSCA service can start contribution cycles without spending down credits. It does not move external money by itself."
                )}
              </div>
            </div>
            <div
              style={{
                marginTop: 12,
                ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"),
                border: "1px solid rgba(13,95,168,0.10)",
              }}
            >
              <div style={sectionLabel()}>Meeting pack engine</div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                Create the reminder record in GSN, share the meeting text through
                WhatsApp, then return here to record the summary as TrustEvent evidence.
              </div>
              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1.1fr 0.9fr",
                  gap: 10,
                }}
              >
                <label style={{ display: "block" }}>
                  <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                    Meeting title
                  </div>
                  <input
                    value={meetingTitle}
                    onChange={(event) => setMeetingTitle(event.target.value)}
                    style={{ ...inputStyle(), marginTop: 6 }}
                    placeholder="Community meeting"
                  />
                </label>
                <label style={{ display: "block" }}>
                  <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                    Date and time
                  </div>
                  <input
                    value={meetingScheduledAt}
                    onChange={(event) => setMeetingScheduledAt(event.target.value)}
                    style={{ ...inputStyle(), marginTop: 6 }}
                    type="datetime-local"
                  />
                </label>
                <label style={{ display: "block" }}>
                  <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                    WhatsApp number
                  </div>
                  <input
                    value={meetingWhatsappNumber}
                    onChange={(event) => setMeetingWhatsappNumber(event.target.value)}
                    style={{ ...inputStyle(), marginTop: 6 }}
                    placeholder="+44..."
                  />
                </label>
                <label style={{ display: "block" }}>
                  <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                    Purpose
                  </div>
                  <input
                    value={meetingPurpose}
                    onChange={(event) => setMeetingPurpose(event.target.value)}
                    style={{ ...inputStyle(), marginTop: 6 }}
                    placeholder="What members should decide"
                  />
                </label>
              </div>
              <div style={{ marginTop: 12, ...controlGrid(isCompact, 178) }}>
                <PrimaryButton
                  onClick={createMeetingReminder}
                  disabled={
                    shopActionsLocked ||
                    creatingMeetingReminder ||
                    safePositiveNumber(
                      communityPackageByCode.get("community_meeting_pack")
                        ?.active_remaining,
                      0
                    ) < 1
                  }
                  busy={creatingMeetingReminder}
                  busyLabel="Recording..."
                  fullWidth
                  debugId="shop-control.meeting.create-reminder"
                >
                  Create reminder
                </PrimaryButton>
                <SecondaryButton
                  onClick={() => {
                    const shareUrl = firstTruthy(meetingForActions?.whatsapp_share_url);
                    if (!shareUrl) {
                      showNotice(
                        "info",
                        "Create a meeting reminder first, then WhatsApp share will be ready."
                      );
                      return;
                    }
                    window.location.href = shareUrl;
                  }}
                  disabled={!firstTruthy(meetingForActions?.whatsapp_share_url)}
                  fullWidth
                  debugId="shop-control.meeting.share-whatsapp"
                >
                  Share WhatsApp
                </SecondaryButton>
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 12 }}>
                {meetingForActions ? (
                  <>
                    Latest meeting: {firstTruthy(meetingForActions.title, "Community meeting")} -{" "}
                    {firstTruthy(meetingForActions.status, "reminder_created").replace(/_/g, " ")}
                    {safeStr(meetingForActions.scheduled_at)
                      ? ` - ${safeDateTime(meetingForActions.scheduled_at)}`
                      : ""}
                  </>
                ) : (
                  "One meeting pack unit creates one reminder evidence thread. The summary later uses the same thread and does not consume another unit."
                )}
              </div>
              {meetingForActions ? (
                <div
                  style={{
                    marginTop: 12,
                    borderRadius: 16,
                    border: "1px solid rgba(13,95,168,0.10)",
                    background: "rgba(255,255,255,0.74)",
                    padding: 12,
                  }}
                >
                  <div style={{ ...sectionLabel(), fontSize: 12 }}>
                    Who is planning to attend?
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: 8,
                    }}
                  >
                    {[
                      ["yes", "Yes", latestMeetingInterest?.yes],
                      ["maybe", "Maybe", latestMeetingInterest?.maybe],
                      ["no", "No", latestMeetingInterest?.no],
                    ].map(([key, label, count]) => (
                      <div
                        key={String(key)}
                        style={{
                          borderRadius: 14,
                          background: latestMeetingOwnInterest === key ? "#07172C" : "#F7FAFF",
                          color: latestMeetingOwnInterest === key ? "#FFFFFF" : "#07172C",
                          border: "1px solid rgba(13,95,168,0.12)",
                          padding: "8px 10px",
                          textAlign: "center",
                          minWidth: 0,
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 950 }}>{String(label)}</div>
                        <div style={{ fontSize: 18, fontWeight: 950 }}>{safePositiveNumber(count, 0)}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 10, ...controlGrid(isCompact, 112) }}>
                    <SecondaryButton
                      onClick={() => recordMeetingInterest("yes")}
                      disabled={shopActionsLocked || Boolean(recordingMeetingInterest)}
                      busy={recordingMeetingInterest === "yes"}
                      busyLabel="Saving..."
                      fullWidth
                      debugId="shop-control.meeting.interest-yes"
                    >
                      Yes
                    </SecondaryButton>
                    <SecondaryButton
                      onClick={() => recordMeetingInterest("maybe")}
                      disabled={shopActionsLocked || Boolean(recordingMeetingInterest)}
                      busy={recordingMeetingInterest === "maybe"}
                      busyLabel="Saving..."
                      fullWidth
                      debugId="shop-control.meeting.interest-maybe"
                    >
                      Maybe
                    </SecondaryButton>
                    <SecondaryButton
                      onClick={() => recordMeetingInterest("no")}
                      disabled={shopActionsLocked || Boolean(recordingMeetingInterest)}
                      busy={recordingMeetingInterest === "no"}
                      busyLabel="Saving..."
                      fullWidth
                      debugId="shop-control.meeting.interest-no"
                    >
                      No
                    </SecondaryButton>
                  </div>
                  <div style={{ marginTop: 8, ...helperText(), fontSize: 12 }}>
                    Planning count only. Attendance check-in records who showed up and when.
                  </div>
                </div>
              ) : null}
              {meetingForActions ? (
                <div
                  style={{
                    marginTop: 12,
                    borderRadius: 16,
                    border: "1px solid rgba(13,95,168,0.10)",
                    background: "rgba(255,255,255,0.74)",
                    padding: 12,
                  }}
                >
                  <div style={{ ...sectionLabel(), fontSize: 12 }}>
                    Attendance registry
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: 8,
                    }}
                  >
                    {[
                      ["Checked in", safePositiveNumber(latestAttendanceSummary?.checkin_count, 0)],
                      ["Method", firstTruthy(activeAttendanceSession?.method_label, "QR")],
                      ["Latest", latestAttendanceSummary?.latest_checkin_at ? safeDateTime(latestAttendanceSummary.latest_checkin_at) : "None"],
                    ].map(([label, value]) => (
                      <div
                        key={String(label)}
                        style={{
                          borderRadius: 14,
                          background: "#F7FAFF",
                          border: "1px solid rgba(13,95,168,0.12)",
                          padding: "8px 10px",
                          minWidth: 0,
                        }}
                      >
                        <div style={{ ...helperText(), fontSize: 11, fontWeight: 900 }}>{String(label)}</div>
                        <div style={{ fontSize: 13, fontWeight: 950, color: "#07172C", overflowWrap: "anywhere" }}>
                          {String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      display: "grid",
                      gridTemplateColumns: isCompact ? "1fr" : "0.8fr 0.45fr 1fr",
                      gap: 10,
                      alignItems: "end",
                    }}
                  >
                    <label style={{ display: "block" }}>
                      <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                        Attendance method
                      </div>
                      <select
                        value={meetingAttendanceMethod}
                        onChange={(event) =>
                          setMeetingAttendanceMethod(
                            event.target.value === "bluetooth_proximity" ? "bluetooth_proximity" : "qr"
                          )
                        }
                        style={{ ...inputStyle(), marginTop: 6 }}
                      >
                        <option value="qr">QR check-in</option>
                        <option value="bluetooth_proximity">Proximity record</option>
                      </select>
                    </label>
                    <label style={{ display: "block" }}>
                      <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                        Minutes
                      </div>
                      <input
                        value={meetingAttendanceWindowMinutes}
                        onChange={(event) => setMeetingAttendanceWindowMinutes(event.target.value)}
                        style={{ ...inputStyle(), marginTop: 6 }}
                        inputMode="numeric"
                        placeholder="120"
                      />
                    </label>
                    <PrimaryButton
                      onClick={openMeetingAttendanceSession}
                      disabled={shopActionsLocked || openingAttendanceSession}
                      busy={openingAttendanceSession}
                      busyLabel="Opening..."
                      fullWidth
                      debugId="shop-control.meeting.open-attendance"
                    >
                      Open attendance
                    </PrimaryButton>
                  </div>
                  {activeAttendanceCheckinUrl ? (
                    <div
                      style={{
                        marginTop: 12,
                        display: "grid",
                        gridTemplateColumns: isCompact ? "1fr" : "140px 1fr",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 128,
                          height: 128,
                          borderRadius: 18,
                          background: "#FFFFFF",
                          border: "1px solid rgba(13,95,168,0.14)",
                          display: "grid",
                          placeItems: "center",
                          justifySelf: isCompact ? "center" : "start",
                        }}
                      >
                        <QRCodeSVG value={activeAttendanceCheckinUrl} size={104} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 950, color: "#07172C" }}>
                          Scan to record attendance time
                        </div>
                        <div style={{ marginTop: 5, ...helperText(), fontSize: 12 }}>
                          {activeAttendanceIsBluetooth
                            ? "Members confirm a nearby Bluetooth device first. QR stays available as a fallback."
                            : "Members scan during the open window. GSN records member, method, and check-in time."}
                        </div>
                        <div style={{ marginTop: 10, ...controlGrid(isCompact, 138) }}>
                          <SecondaryButton
                            onClick={() => {
                              safeCopy(activeAttendanceCheckinUrl);
                              showNotice("success", "Attendance link copied.");
                            }}
                            fullWidth
                            debugId="shop-control.meeting.copy-attendance-link"
                          >
                            Copy link
                          </SecondaryButton>
                          <SecondaryButton
                            onClick={() => recordMeetingAttendanceCheckin("qr")}
                            disabled={recordingAttendanceCheckin || !activeAttendanceToken}
                            busy={recordingAttendanceCheckin}
                            busyLabel="Recording..."
                            fullWidth
                            debugId="shop-control.meeting.record-attendance"
                          >
                            {activeAttendanceIsBluetooth ? "QR fallback" : "Record my attendance"}
                          </SecondaryButton>
                          {activeAttendanceIsBluetooth ? (
                            <SecondaryButton
                              onClick={recordBluetoothPresenceAttendance}
                              disabled={checkingBluetoothPresence || recordingAttendanceCheckin || !activeAttendanceToken}
                              busy={checkingBluetoothPresence}
                              busyLabel="Checking..."
                              fullWidth
                              debugId="shop-control.meeting.bluetooth-check"
                            >
                              Bluetooth check
                            </SecondaryButton>
                          ) : null}
                        </div>
                        {bluetoothPresenceStatus ? (
                          <div style={{ marginTop: 8, ...helperText(), fontSize: 12 }}>
                            {bluetoothPresenceStatus}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  <div style={{ marginTop: 8, ...helperText(), fontSize: 12 }}>
                    Attendance is Presence Evidence only. It records showing up, method, and time; it does not prove contribution or create a trust score.
                  </div>
                </div>
              ) : null}
              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                  gap: 10,
                }}
              >
                <label style={{ display: "block" }}>
                  <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                    Summary
                  </div>
                  <textarea
                    className={SHOP_CONTROL_SOFT_PLACEHOLDER_CLASS}
                    value={meetingSummary}
                    onChange={(event) => setMeetingSummary(event.target.value)}
                    style={{ ...textAreaStyle(), marginTop: 6 }}
                    placeholder="What was agreed or confirmed"
                  />
                </label>
                <label style={{ display: "block" }}>
                  <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                    Decisions
                  </div>
                  <textarea
                    className={SHOP_CONTROL_SOFT_PLACEHOLDER_CLASS}
                    value={meetingDecisions}
                    onChange={(event) => setMeetingDecisions(event.target.value)}
                    style={{ ...textAreaStyle(), marginTop: 6 }}
                    placeholder="Next steps, owners, or deadlines"
                  />
                </label>
              </div>
              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "0.55fr 1fr",
                  gap: 10,
                  alignItems: "end",
                }}
              >
                <label style={{ display: "block" }}>
                  <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                    Attendance count
                  </div>
                  <input
                    className={SHOP_CONTROL_SOFT_PLACEHOLDER_CLASS}
                    value={meetingAttendanceCount}
                    onChange={(event) => setMeetingAttendanceCount(event.target.value)}
                    style={{ ...inputStyle(), marginTop: 6 }}
                    inputMode="numeric"
                    placeholder="0"
                  />
                </label>
                <SecondaryButton
                  onClick={recordMeetingSummary}
                  disabled={
                    shopActionsLocked ||
                    recordingMeetingSummary ||
                    !firstTruthy(meetingForActions?.meeting_id)
                  }
                  busy={recordingMeetingSummary}
                  busyLabel="Recording..."
                  fullWidth
                  debugId="shop-control.meeting.record-summary"
                >
                  Record summary
                </SecondaryButton>
              </div>
            </div>
            <div style={{ marginTop: 10, ...helperText(), fontSize: 12 }}>
              ROSCA and meeting packs now create GSN evidence. ROSCA still does not
              execute external payouts, and WhatsApp remains the outside conversation
              channel for meetings.
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {activeOwnerLayer === "shop-details" ? (
      <section
        id="shop-control-details"
        style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 72%, #FFF7D8 100%)")}
      >
        <div style={sectionLabel()}>Shop details</div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
            gap: 12,
          }}
        >
          <div style={{ gridColumn: isCompact ? "auto" : "1 / span 2" }}>
            <div style={sectionLabel()}>Shop name</div>
            <input
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Shop name"
              style={{ ...inputStyle(), marginTop: 8 }}
            />
          </div>

          <div>
            <div style={sectionLabel()}>WhatsApp</div>
            <input
              value={whatsApp}
              onChange={(e) => setWhatsApp(e.target.value)}
              placeholder="WhatsApp number"
              style={{ ...inputStyle(), marginTop: 8 }}
            />
          </div>

          <div>
            <div style={sectionLabel()}>Telegram</div>
            <input
              value={telegramHandle}
              onChange={(e) => setTelegramHandle(e.target.value)}
              placeholder="Telegram handle"
              style={{ ...inputStyle(), marginTop: 8 }}
            />
          </div>

          <div style={{ gridColumn: isCompact ? "auto" : "1 / span 2" }}>
            <div style={sectionLabel()}>Description</div>
            <textarea
              value={shopDescription}
              onChange={(e) => setShopDescription(e.target.value)}
              placeholder="Tell people what this shop offers..."
              style={{ ...textAreaStyle(), marginTop: 8 }}
            />
          </div>
        </div>

        <div style={{ marginTop: 16, ...controlGrid(isCompact, 150) }}>
          <PrimaryButton
            onClick={() => saveShopDetails()}
            disabled={shopActionsLocked || savingShop || marketplaceShopsFeatureOff}
            busy={savingShop}
            busyLabel="Saving..."
            fullWidth
            stableHeight={isCompact ? 64 : 56}
            debugId="shop-control.details.save"
          >
            {shopActionsLocked ? "Review Identity First" : "Save Shop Details"}
          </PrimaryButton>

          <StableCtaLink
            to={routes.shopAssets}
            kind="secondary"
            fullWidth
            stableHeight={isCompact ? 64 : 56}
            debugId="shop-control.details.manage-products"
          >
            Manage Products
          </StableCtaLink>
        </div>
      </section>
      ) : null}

      {activeOwnerLayer === "summary" ? (
      <section
        id="shop-control-counts"
        style={pageCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 52%, #EAF4FF 78%, #FFF7D8 100%)")}
      >
        <div style={sectionLabel()}>Shop analytics</div>
        <div
          style={{
            marginTop: 10,
            borderRadius: 24,
            border: "1px solid rgba(255,255,255,0.28)",
            background:
              shopAnalyticsWisdom.tone === "warning"
                ? "linear-gradient(135deg, #09223A 0%, #124F82 58%, #276E4A 100%)"
                : shopAnalyticsWisdom.tone === "quiet"
                  ? "linear-gradient(135deg, #071827 0%, #0B2D4A 64%, #8C6829 100%)"
                  : "linear-gradient(135deg, #08233A 0%, #1269AD 62%, #2E9B62 100%)",
            color: "#FFFFFF",
            padding: isCompact ? 16 : 18,
            display: "grid",
            gridTemplateColumns: isCompact ? "46px minmax(0, 1fr)" : "58px minmax(0, 1fr) 160px",
            gap: isCompact ? 12 : 16,
            alignItems: "center",
            boxShadow: "0 18px 34px rgba(4,18,31,0.22), inset 0 1px 0 rgba(255,255,255,0.18)",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: isCompact ? 46 : 58,
              height: isCompact ? 46 : 58,
              borderRadius: 18,
              display: "grid",
              placeItems: "center",
              background: "rgba(255,255,255,0.16)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
            }}
          >
            <GsnLegacyIcon name="chart" size={isCompact ? 34 : 42} />
          </div>
          <div>
            <div style={{ fontSize: isCompact ? 13 : 15, fontWeight: 850, opacity: 0.88 }}>
              {shopAnalyticsWisdom.state}:
            </div>
            <div style={{ marginTop: 4, fontSize: isCompact ? 21 : 27, fontWeight: 950, lineHeight: 1.08 }}>
              {shopAnalyticsWisdom.headline}
            </div>
            <div style={{ marginTop: 8, fontSize: isCompact ? 13 : 15, lineHeight: 1.45, opacity: 0.9 }}>
              {shopAnalyticsWisdom.detail}
            </div>
          </div>
          {!isCompact ? (
            <div style={{ textAlign: "right", fontSize: 14, lineHeight: 1.35, fontWeight: 800, opacity: 0.9 }}>
              Every signal needs context.
            </div>
          ) : null}
        </div>
        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "repeat(2, minmax(0, 1fr))"
              : "repeat(3, minmax(0, 1fr))",
            gap: 10,
          }}
          aria-label="Shop analytics sections"
        >
          {SHOP_ANALYTICS_PANELS.map((panel) => {
            const active = activeAnalyticsPanel === panel.key;
            return (
              <StableButton
                key={panel.key}
                type="button"
                debugId={`shop-control.analytics-panel.${panel.key}`}
                stableHeight={isCompact ? 58 : 60}
                onClick={() =>
                  setActiveAnalyticsPanel((current) =>
                    current === panel.key ? "" : panel.key
                  )
                }
                style={{
                  justifyContent: "flex-start",
                  gap: 9,
                  minWidth: 0,
                  padding: "8px 10px",
                  borderRadius: 18,
                  color: active ? "#FFFFFF" : "#0B2D4A",
                  background: active
                    ? "linear-gradient(135deg, #08233A 0%, #0F5EAA 100%)"
                    : "linear-gradient(180deg, #FFFFFF 0%, #F5FAFF 100%)",
                  border: active
                    ? "1px solid rgba(255,255,255,0.22)"
                    : "1px solid rgba(18,58,89,0.12)",
                  boxShadow: active
                    ? "0 14px 26px rgba(7,24,39,0.16)"
                    : "0 10px 20px rgba(7,24,39,0.07)",
                  textAlign: "left",
                }}
              >
                {inlineIcon(panel.icon, active ? "#F2C766" : "#0F5EAA", 15)}
                <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 950, lineHeight: 1.15, whiteSpace: "normal" }}>
                    {panel.label}
                  </span>
                  <span style={{ fontSize: 10.5, fontWeight: 800, lineHeight: 1.15, opacity: 0.78, whiteSpace: "normal" }}>
                    {panel.detail}
                  </span>
                </span>
              </StableButton>
            );
          })}
        </div>

        {!activeAnalyticsPanel ? (
          <div
            style={{
              marginTop: 12,
              borderRadius: 16,
              border: "1px solid rgba(18,58,89,0.10)",
              background: "rgba(255,255,255,0.74)",
              color: "#385773",
              padding: "11px 14px",
              fontSize: 13,
              fontWeight: 800,
              lineHeight: 1.4,
            }}
          >
            Open one analytics section at a time.
          </div>
        ) : null}
        <div
          style={{
            marginTop: 14,
            display: activeAnalyticsPanel === "key-metrics" ? "block" : "none",
            ...statTile(),
            background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,251,255,0.94) 100%)",
            borderRadius: 22,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ color: "#061827", fontSize: isCompact ? 19 : 23, fontWeight: 950 }}>
              Key Metrics
            </div>
            <div style={{ color: "#27496A", fontSize: 13, fontWeight: 850 }}>Last 7 days</div>
          </div>
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))",
              gap: 12,
            }}
            aria-label="Shop owner key analytics metrics"
          >
            <ShopAnalyticsMetricCard icon="tag" label="Public items" value={`${occupiedPublicProductSlotCount} / ${publicProductSlotsTotal}`} detail={occupiedPublicProductSlotCount >= publicProductSlotsTotal ? "All published" : "Public shop blocks"} accent="green" />
            <ShopAnalyticsMetricCard icon="vault" label="Vault" value={`${vaultProducts.length} / 6`} detail={vaultProducts.length > 0 ? "Private offers" : "No vault items yet"} accent="purple" />
            <ShopAnalyticsMetricCard icon="megaphone" label="Spotlights" value={activeSpotlights.length} detail={activeSpotlights.length > 0 ? "Active spotlight" : "No active spotlight"} accent="gold" />
            <ShopAnalyticsMetricCard icon="user" label="Followers" value={shopFollowerCount} detail={shopFollowerCount > 0 ? "Notification audience" : "No followers yet"} accent="blue" />
            <ShopAnalyticsMetricCard icon="document" label="Follower notices" value={followerNotices7Days} detail={followerNoticesYearToDate > followerNotices7Days ? `${followerNoticesYearToDate} this year` : "Sent last 7 days"} accent="purple" />
            <ShopAnalyticsMetricCard icon="community" label="Notice visits" value={followerNoticeResponseVisitors} detail={followerNoticeResponseVisits > followerNoticeResponseVisitors ? `${followerNoticeResponseVisits} total visits` : "From follower notices"} accent="blue" />
            <ShopAnalyticsMetricCard icon="copy" label="Shared links" value={shareActions7Days} detail="Prepared shares" accent="gold" />
            <ShopAnalyticsMetricCard icon="community" label="Visitors" value={attentionVisitors7Days} detail={attentionShopVisits7Days > attentionVisitors7Days ? `${attentionShopVisits7Days} total visits` : "Last 7 days"} accent="blue" />
            <ShopAnalyticsMetricCard icon="shop" label="Product opens" value={attentionProductOpens7Days} detail="Opened shop blocks" accent="green" />
            <ShopAnalyticsMetricCard icon="phone" label="Contact taps" value={attentionContactTaps7Days} detail="Buyer intent signal only" accent="red" />
            <ShopAnalyticsMetricCard icon="document" label="Trade records" value={tradeOutcomeRecords7Days} detail={tradeOutcomeReleasedRecords > 0 ? `${tradeOutcomeReleasedRecords} released` : "Protected evidence"} accent="green" />
            <ShopAnalyticsMetricCard icon="eye" label="Spotlight seen" value={attentionSpotlightImpressions7Days} detail={`Potential audience: ${attentionPossibleSpotlightReach}`} accent="navy" />
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: activeAnalyticsPanel === "view-contact" ? "block" : "none",
            ...statTile(),
            borderRadius: 22,
            background: "linear-gradient(180deg, #FFFFFF 0%, #F4FAFF 100%)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <div style={{ color: "#061827", fontSize: isCompact ? 19 : 23, fontWeight: 950 }}>
                From View to Contact
              </div>
              <div style={{ ...helperText(), fontSize: 13, lineHeight: 1.35 }}>
                Your shop's attention-to-action funnel
              </div>
            </div>
            <div
              style={{
                borderRadius: 16,
                background: "linear-gradient(180deg, #EAF4FF 0%, #DCEBFF 100%)",
                color: "#153A61",
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 850,
                lineHeight: 1.35,
                maxWidth: isCompact ? "100%" : 260,
              }}
            >
              {attentionPossibleSpotlightReach} people could see your spotlight. {attentionSpotlightImpressions7Days} saw it, {attentionVisitors7Days} visited, and {attentionContactTaps7Days} took action.
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "repeat(5, minmax(0, 1fr))",
              gap: 8,
            }}
          >
            <ShopAnalyticsFunnelStep icon="eye" label="Potential Audience" value={attentionPossibleSpotlightReach} detail="People who may see your spotlight" rateLabel="Reach base" strong />
            <ShopAnalyticsFunnelStep icon="community" label="Spotlight Seen" value={attentionSpotlightImpressions7Days} detail="People saw your spotlight" rateLabel={`${formatAnalyticsRate(attentionSpotlightImpressions7Days, attentionPossibleSpotlightReach)} of reach`} strong />
            <ShopAnalyticsFunnelStep icon="user" label="Visitors" value={attentionVisitors7Days} detail="Unique visitors" rateLabel={`${formatAnalyticsRate(attentionVisitors7Days, attentionSpotlightImpressions7Days)} of seen`} />
            <ShopAnalyticsFunnelStep icon="shop" label="Product Opens" value={attentionProductOpens7Days} detail="Opened shop blocks" rateLabel={`${formatAnalyticsRate(attentionProductOpens7Days, attentionVisitors7Days)} of visitors`} />
            <ShopAnalyticsFunnelStep icon="phone" label="Contact Taps" value={attentionContactTaps7Days} detail="Buyer intent signal only" rateLabel={`${formatAnalyticsRate(attentionContactTaps7Days, attentionVisitors7Days)} of visitors`} />
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: activeAnalyticsPanel === "key-metrics" || activeAnalyticsPanel === "visitor-activity" ? "grid" : "none",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) minmax(0, 0.92fr)",
            gap: 12,
          }}
        >
          <div style={{ ...statTile(), minHeight: 210, display: activeAnalyticsPanel === "visitor-activity" ? "block" : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div style={{ color: "#061827", fontSize: 19, fontWeight: 950 }}>Visitor Activity - Last 7 Days</div>
              <div style={{ color: "#27496A", fontSize: 13, fontWeight: 850, textAlign: "right" }}>Total<br />{attentionVisitors7Days}</div>
            </div>
            {attentionDailyActivityRows.length > 0 ? (
              <div
                style={{
                  marginTop: 16,
                  height: 126,
                  display: "grid",
                  gridTemplateColumns: `repeat(${attentionDailyActivityRows.length}, minmax(0, 1fr))`,
                  gap: 8,
                  alignItems: "end",
                  borderBottom: "1px solid rgba(18,58,89,0.16)",
                  backgroundImage: "linear-gradient(rgba(18,58,89,0.08) 1px, transparent 1px)",
                  backgroundSize: "100% 32px",
                }}
                aria-label="Daily unique shop visitors"
              >
                {attentionDailyActivityRows.map((row) => {
                  const value = row.visitors || row.visits;
                  const height = Math.max(4, Math.round((value / attentionDailyMaxVisitors) * 92));
                  return (
                    <div key={row.date || `day-${shortAnalyticsDateLabel(row.date)}`} style={{ display: "grid", gap: 6, justifyItems: "center", alignItems: "end" }}>
                      <div
                        title={`${value} visitor${value === 1 ? "" : "s"}`}
                        style={{
                          width: "72%",
                          minWidth: 10,
                          maxWidth: 28,
                          height,
                          borderRadius: "8px 8px 2px 2px",
                          background: value > 0 ? "linear-gradient(180deg, #4DA3F0 0%, #1D72C9 100%)" : "rgba(29,114,201,0.18)",
                          boxShadow: value > 0 ? "0 8px 16px rgba(29,114,201,0.18)" : "none",
                        }}
                      />
                      <div style={{ color: "#526579", fontSize: 11, fontWeight: 800, textAlign: "center" }}>
                        {shortAnalyticsDateLabel(row.date)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ ...helperText(), marginTop: 18 }}>
                Daily history will appear after new shop attention events are recorded.
              </div>
            )}
          </div>

          <div style={{ ...statTile(), minHeight: 210, display: activeAnalyticsPanel === "key-metrics" ? "block" : "none" }}>
            <div style={{ color: "#061827", fontSize: 19, fontWeight: 950 }}>Inventory Visibility</div>
            <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { label: "Public Items", value: `${occupiedPublicProductSlotCount} / ${publicProductSlotsTotal}`, rate: publicInventoryRate, color: "#2E9B62", note: occupiedPublicProductSlotCount >= publicProductSlotsTotal ? "All items are published" : "Some public slots are empty" },
                { label: "Vault", value: `${vaultProducts.length} / 6`, rate: vaultInventoryRate, color: "#4D7DE0", note: vaultProducts.length > 0 ? "Vault offers ready" : "No vault items yet" },
              ].map((item) => (
                <div key={item.label} style={{ display: "grid", justifyItems: "center", textAlign: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 94,
                      height: 94,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      background: `conic-gradient(${item.color} ${item.rate}%, rgba(18,58,89,0.12) 0)`,
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.84)",
                    }}
                  >
                    <div style={{ width: 68, height: 68, borderRadius: "50%", background: "#FFFFFF", display: "grid", placeItems: "center", color: "#061827", fontSize: 19, fontWeight: 950 }}>
                      {item.rate}%
                    </div>
                  </div>
                  <div style={{ color: "#061827", fontSize: 20, fontWeight: 950 }}>{item.value}</div>
                  <div style={{ color: "#27496A", fontSize: 13, fontWeight: 900 }}>{item.label}</div>
                  <div style={{ borderRadius: 999, padding: "5px 10px", background: "rgba(255,255,255,0.78)", color: item.color, fontSize: 11, fontWeight: 850 }}>
                    {item.note}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: ["visitor-activity", "trade-outcomes", "traffic-sources", "market-intelligence"].includes(activeAnalyticsPanel) ? "grid" : "none",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 12,
          }}
        >
          <div style={{ ...statTile(), minHeight: 170, display: activeAnalyticsPanel === "visitor-activity" ? "block" : "none" }}>
            <div style={{ color: "#061827", fontSize: 19, fontWeight: 950 }}>Spotlight Performance</div>
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "74px 1fr 1fr 1fr", gap: 12, alignItems: "center" }}>
              <div style={shopAnalyticsIconTile("gold")} aria-hidden="true">
                <GsnLegacyIcon name="megaphone" size={34} />
              </div>
              <div>
                <div style={{ color: "#061827", fontSize: 23, fontWeight: 950 }}>{activeSpotlights.length}</div>
                <div style={{ ...helperText(), fontSize: 12, lineHeight: 1.2 }}>Spotlights</div>
              </div>
              <div>
                <div style={{ color: "#061827", fontSize: 23, fontWeight: 950 }}>{attentionSpotlightImpressions7Days}</div>
                <div style={{ ...helperText(), fontSize: 12, lineHeight: 1.2 }}>Seen</div>
              </div>
              <div>
                <div style={{ color: "#061827", fontSize: 23, fontWeight: 950 }}>{attentionPossibleSpotlightReach}</div>
                <div style={{ ...helperText(), fontSize: 12, lineHeight: 1.2 }}>Possible Reach</div>
              </div>
            </div>
            <div style={{ marginTop: 14, borderRadius: 16, padding: 12, background: "linear-gradient(180deg, #EAF4FF 0%, #DCEBFF 100%)", color: "#17426B", fontSize: 13, fontWeight: 800, lineHeight: 1.45 }}>
              {attentionSpotlightShopClicks7Days > 0
                ? `${attentionSpotlightShopClicks7Days} spotlight tap${attentionSpotlightShopClicks7Days === 1 ? "" : "s"} opened your shop from the feed.`
                : "Your spotlight is getting measured. Turn attention into product opens with a stronger thumbnail or call-to-action."}
            </div>
          </div>

          <div style={{ ...statTile(), minHeight: 210, display: activeAnalyticsPanel === "trade-outcomes" ? "block" : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div>
                <div style={{ color: "#061827", fontSize: 19, fontWeight: 950 }}>Recorded trade outcomes</div>
                <div style={{ ...helperText(), fontSize: 12 }}>Protected trade evidence linked to this shop or seller.</div>
              </div>
              <span style={badge(tradeOutcomeRecords7Days > 0)}>Evidence only</span>
            </div>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              {[
                ["Protected records", tradeOutcomeRecords7Days],
                ["Shop linked", tradeOutcomeShopLinkedRecords],
                ["Seller side", tradeOutcomeSellerSideRecords],
                ["Released", tradeOutcomeReleasedRecords],
                ["Payment claimed", tradeOutcomePaymentClaimedRecords],
                ["Receipt confirmed", tradeOutcomeReceiptConfirmedRecords],
                ["Disputes", tradeOutcomeDisputeRecords],
                ["Unresolved", tradeOutcomeUnresolvedRecords],
              ].map(([label, value]) => (
                <div key={`trade-outcome-${label}`} style={{ borderRadius: 14, background: "linear-gradient(180deg, #F8FBFF 0%, #EEF6FF 100%)", border: "1px solid rgba(18,58,89,0.10)", padding: "9px 10px" }}>
                  <div style={{ color: "#385773", fontSize: 11, fontWeight: 850, lineHeight: 1.2 }}>{label}</div>
                  <div style={{ color: "#061827", fontSize: 20, fontWeight: 950, lineHeight: 1.05, marginTop: 5 }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, borderTop: "1px solid rgba(18,58,89,0.10)", paddingTop: 10 }}>
              <div style={{ color: "#061827", fontSize: 13, fontWeight: 950 }}>Recent protected records</div>
              {tradeOutcomeRecentRows.length ? (
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  {tradeOutcomeRecentRows.map((row) => (
                    <div key={`trade-outcome-recent-${row.tradeId || row.tradeCode || row.itemTitle}`} style={{ borderRadius: 12, background: "rgba(239,247,255,0.82)", border: "1px solid rgba(18,58,89,0.08)", padding: "7px 8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, color: "#24415C", fontSize: 11, fontWeight: 900 }}>
                        <span>{row.itemTitle}</span>
                        <span>{row.linkedToShop ? "Shop" : "Seller"}</span>
                      </div>
                      <div style={{ marginTop: 3, color: "#5A6F84", fontSize: 10.5, fontWeight: 750, lineHeight: 1.35 }}>
                        Status {firstTruthy(row.status, "open")} / payment {firstTruthy(row.paymentStatus, "not started")} / release {firstTruthy(row.releaseStatus, "not requested")}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 6, color: "#385773", fontSize: 12, fontWeight: 800, lineHeight: 1.4 }}>
                  No protected trade record is linked yet. Attention can be growing before formal trade evidence appears.
                </div>
              )}
            </div>
            <div style={{ marginTop: 10, color: "#5A6F84", fontSize: 11, fontWeight: 750, lineHeight: 1.4 }}>
              {tradeOutcomeBoundary}
            </div>
          </div>
          <div style={{ ...statTile(), minHeight: 210, display: activeAnalyticsPanel === "traffic-sources" ? "block" : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div>
                <div style={{ color: "#061827", fontSize: 19, fontWeight: 950 }}>Traffic sources</div>
                <div style={{ ...helperText(), fontSize: 12 }}>Where attention was recorded in the last 7 days.</div>
              </div>
              <span style={badge(attentionSourceBreakdownRows.length > 0)}>Attention only</span>
            </div>
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {attentionSourceBreakdownRows.length ? (
                attentionSourceBreakdownRows.map((row) => (
                  <div key={`traffic-source-${row.source || row.label}`} style={{ borderRadius: 14, background: "linear-gradient(180deg, #F8FBFF 0%, #EEF6FF 100%)", border: "1px solid rgba(18,58,89,0.10)", padding: "9px 10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <div style={{ color: "#061827", fontSize: 13, fontWeight: 900 }}>{row.label}</div>
                      <div style={{ color: "#0F5EAA", fontSize: 13, fontWeight: 950 }}>{row.totalEvents}</div>
                    </div>
                    <div style={{ marginTop: 5, color: "#385773", fontSize: 11, fontWeight: 750, lineHeight: 1.35 }}>
                      Visits {row.shopVisits} / opens {row.productOpens} / spotlight {row.spotlightViews} / contacts {row.contactTaps}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: "#385773", fontSize: 13, fontWeight: 800, lineHeight: 1.4 }}>
                  No source breakdown is available yet. Share or publish once, then check again after people have had time to respond.
                </div>
              )}
            </div>
            <div style={{ marginTop: 12, borderTop: "1px solid rgba(18,58,89,0.10)", paddingTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ color: "#061827", fontSize: 13, fontWeight: 950 }}>Follower notice trail</div>
                <div style={{ color: "#0F5EAA", fontSize: 12, fontWeight: 900 }}>{followerNotices7Days} sent</div>
              </div>
              <div style={{ marginTop: 5, color: "#385773", fontSize: 11, fontWeight: 750, lineHeight: 1.4 }}>
                {followerNoticeDeliveryLabel}
              </div>
              {followerNoticeKindRows.length ? (
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  {followerNoticeKindRows.map((row) => (
                    <div key={`follower-notice-${row.kind || row.label}`} style={{ display: "flex", justifyContent: "space-between", gap: 10, color: "#24415C", fontSize: 11, fontWeight: 850 }}>
                      <span>{row.label}</span>
                      <span>{row.count}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div style={{ marginTop: 12, borderTop: "1px solid rgba(18,58,89,0.10)", paddingTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ color: "#061827", fontSize: 13, fontWeight: 950 }}>Share action trail</div>
                <div style={{ color: "#0F5EAA", fontSize: 12, fontWeight: 900 }}>{shareActions7Days} prepared</div>
              </div>
              {shareActionChannelRows.length ? (
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  {shareActionChannelRows.map((row) => (
                    <div key={`share-action-${row.source || row.label}`} style={{ display: "flex", justifyContent: "space-between", gap: 10, color: "#24415C", fontSize: 11, fontWeight: 850 }}>
                      <span>{row.label}</span>
                      <span>{row.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 5, color: "#385773", fontSize: 11, fontWeight: 750, lineHeight: 1.4 }}>
                  No tracked share action yet. Copy or share the shop link to start measuring distribution attempts.
                </div>
              )}
            </div>
            <div style={{ marginTop: 8, borderRadius: 12, background: "rgba(239,247,255,0.82)", border: "1px solid rgba(18,58,89,0.08)", padding: "7px 8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, color: "#24415C", fontSize: 11, fontWeight: 900 }}>
                  <span>Follower notice response</span>
                  <span>{followerNoticeResponseVisitors} visitors</span>
                </div>
                <div style={{ marginTop: 3, color: "#5A6F84", fontSize: 10.5, fontWeight: 750, lineHeight: 1.35 }}>
                  Visits {followerNoticeResponseVisits} / opens {followerNoticeResponseProductOpens} / taps {followerNoticeResponseContactTaps}
                </div>
                {followerNoticeResponseKindRows.length ? (
                  <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
                    {followerNoticeResponseKindRows.map((row) => (
                      <div key={`follower-response-${row.kind || row.label}`} style={{ display: "flex", justifyContent: "space-between", gap: 8, color: "#385773", fontSize: 10.5, fontWeight: 800 }}>
                        <span>{row.label}</span>
                        <span>{row.totalEvents}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
            </div>
            <div style={{ marginTop: 10, color: "#5A6F84", fontSize: 11, fontWeight: 750, lineHeight: 1.4 }}>
              {followerNoticeBoundary} {followerNoticeResponseBoundary}
            </div>
            <div style={{ marginTop: 12, borderTop: "1px solid rgba(18,58,89,0.10)", paddingTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ color: "#061827", fontSize: 13, fontWeight: 950 }}>Share response</div>
                <div style={{ color: "#0F5EAA", fontSize: 12, fontWeight: 900 }}>{shareResponseVisits} visits</div>
              </div>
              <div style={{ marginTop: 5, color: "#385773", fontSize: 11, fontWeight: 750, lineHeight: 1.4 }}>
                {shareResponseVisitors} unique visitors / {shareResponseProductOpens} opens / {shareResponseContactTaps} contact taps from attributed links.
              </div>
              {shareResponseChannelRows.length ? (
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  {shareResponseChannelRows.map((row) => (
                    <div key={`share-response-${row.source || row.label}`} style={{ borderRadius: 12, background: "rgba(239,247,255,0.82)", border: "1px solid rgba(18,58,89,0.08)", padding: "7px 8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, color: "#24415C", fontSize: 11, fontWeight: 900 }}>
                        <span>{row.label}</span>
                        <span>{row.totalEvents}</span>
                      </div>
                      <div style={{ marginTop: 3, color: "#5A6F84", fontSize: 10.5, fontWeight: 750, lineHeight: 1.35 }}>
                        Visits {row.visits} / unique {row.visitors} / opens {row.productOpens} / taps {row.contactTaps}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div style={{ marginTop: 10, color: "#5A6F84", fontSize: 11, fontWeight: 750, lineHeight: 1.4 }}>
              {shareActionBoundary}
            </div>
            <div style={{ marginTop: 10, color: "#5A6F84", fontSize: 11, fontWeight: 750, lineHeight: 1.4 }}>
              {shareResponseBoundary}
            </div>
            <div style={{ marginTop: 10, color: "#5A6F84", fontSize: 11, fontWeight: 750, lineHeight: 1.4 }}>
              Source counts show where attention was recorded, not who bought or paid.
            </div>
          </div>

          <div style={{ ...statTile(), minHeight: 250, display: activeAnalyticsPanel === "market-intelligence" ? "block" : "none" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <GsnLegacyIcon name="spark" size={34} />
              <div>
                <div style={{ color: "#061827", fontSize: 19, fontWeight: 950 }}>Market Intelligence</div>
                <div style={{ ...helperText(), fontSize: 12 }}>Evidence first, recommendation second.</div>
              </div>
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badge(shopAnalyticsWisdom.confidence === "high")}>Confidence: {shopAnalyticsWisdom.confidence}</span>
              <span style={badge(shopAnalyticsWisdom.diagnosisCode !== "GATHERING_DATA")}>{shopAnalyticsWisdom.diagnosisCode.replace(/_/g, " ")}</span>
              <span style={badge(shopMarketIntelligenceSummary.workCount > 0)}>Spine: {shopMarketIntelligenceSummary.headline}</span>
            </div>
            <div
              style={{
                marginTop: 12,
                borderRadius: 18,
                border: "1px solid rgba(46,155,98,0.18)",
                background: "linear-gradient(180deg, #F3FFF9 0%, #E8F8F1 100%)",
                padding: 12,
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
                <GsnLegacyIcon name="shop" size={30} />
                <div>
                  <div style={{ color: "#061827", fontSize: 13, fontWeight: 950 }}>Small Seller Helper</div>
                  <div style={{ marginTop: 2, color: "#2D5A46", fontSize: 12, fontWeight: 800, lineHeight: 1.35 }}>
                    {shopSellerHelper.reassurance}
                  </div>
                </div>
              </div>
              {[
                ["What is happening", shopSellerHelper.whatIsHappening],
                ["Why it matters", shopSellerHelper.whyItMatters],
                ["Try first", shopSellerHelper.tryFirst],
              ].map(([label, value]) => (
                <div key={`seller-helper-${label}`} style={{ borderRadius: 14, background: "rgba(255,255,255,0.76)", border: "1px solid rgba(46,155,98,0.10)", padding: "8px 10px" }}>
                  <div style={{ color: "#1F6F4A", fontSize: 10.5, fontWeight: 950, textTransform: "uppercase", letterSpacing: 0 }}>{label}</div>
                  <div style={{ marginTop: 3, color: "#183A2B", fontSize: 12, fontWeight: 820, lineHeight: 1.4 }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div style={{ color: "#24415C", fontSize: 13, fontWeight: 850, lineHeight: 1.4 }}>
                <strong style={{ color: "#061827" }}>Observation:</strong> {shopAnalyticsWisdom.observation}
              </div>
              <div style={{ color: "#24415C", fontSize: 13, fontWeight: 850, lineHeight: 1.4 }}>
                <strong style={{ color: "#061827" }}>Interpretation:</strong> {shopAnalyticsWisdom.interpretation}
              </div>
              <div style={{ borderRadius: 14, padding: 11, background: "linear-gradient(180deg, #F7FBFF 0%, #EAF4FF 100%)", color: "#17426B", fontSize: 12, fontWeight: 800, lineHeight: 1.4 }}>
                Recheck: {shopAnalyticsWisdom.recheckPoint}
              </div>
            </div>
            <div
              style={{
                marginTop: 12,
                borderRadius: 16,
                border: "1px solid rgba(15,94,170,0.16)",
                background: "linear-gradient(180deg, #F8FBFF 0%, #EAF4FF 100%)",
                padding: 12,
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ color: "#061827", fontSize: 13, fontWeight: 950 }}>Recommended next move</div>
                <div style={{ marginTop: 4, color: "#385773", fontSize: 12, fontWeight: 800, lineHeight: 1.4 }}>
                  {marketIntelligencePrimaryAction.detail}
                </div>
              </div>
              <StableCtaLink
                to={marketIntelligencePrimaryAction.to}
                onClick={() => trackMarketIntelligenceAction(marketIntelligencePrimaryAction.actionKey)}
                debugId="shop-control.market-intelligence.primary-action"
                stableHeight={38}
                style={{
                  borderRadius: 999,
                  padding: "0 13px",
                  background: "#FFFFFF",
                  color: "#0F5EAA",
                  border: "1px solid rgba(15,94,170,0.18)",
                  fontSize: 12,
                  fontWeight: 900,
                  boxShadow: "0 8px 16px rgba(8,38,67,0.08)",
                }}
              >
                {marketIntelligencePrimaryAction.label}
              </StableCtaLink>
            </div>
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {shopAnalyticsWisdom.actions.slice(0, 3).map((item, index) => {
                const actionKey = marketIntelligenceActionKey(item, index);
                const actionLogged = loggedRecommendationActionKeys.has(actionKey);
                return (
                  <div key={`${item}-${index}`} style={{ display: "grid", gridTemplateColumns: "28px minmax(0, 1fr)", gap: 8, alignItems: "start" }}>
                    <div
                      aria-hidden="true"
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 999,
                        display: "grid",
                        placeItems: "center",
                        background: index === 0 ? "#2E9B62" : "#F2C766",
                        color: index === 0 ? "#FFFFFF" : "#061827",
                        fontSize: 12,
                        fontWeight: 950,
                      }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <div style={{ color: "#24415C", fontSize: 13, fontWeight: 800, lineHeight: 1.35 }}>{item}</div>
                      <SubtleButton
                        onClick={() => trackMarketIntelligenceAction(actionKey)}
                        stableHeight={32}
                        minWidth={110}
                        debugId={`shop-control.market-intelligence.actioned.${actionKey}`}
                        style={{ marginTop: 7, borderRadius: 999, fontSize: 11, fontWeight: 900, padding: "0 11px" }}
                      >
                        {actionLogged ? "Logged tried" : "Mark tried"}
                      </SubtleButton>
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              style={{
                marginTop: 12,
                borderRadius: 16,
                border: "1px solid rgba(214,170,69,0.20)",
                background: "linear-gradient(180deg, #FFFDF6 0%, #FFF6D7 100%)",
                padding: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ color: "#061827", fontSize: 13, fontWeight: 950 }}>Community Needs</div>
                  <div style={{ marginTop: 4, color: "#5A4720", fontSize: 12, fontWeight: 800, lineHeight: 1.4 }}>
                    {demandContextLabel}. {demandOverlapLabel} Market Wisdom reads Demand Box as structured community context only; it is not buyer proof, sales proof, or automatic product matching.
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <StableCtaLink
                    to={routes.askCommunity}
                    onClick={() => trackMarketIntelligenceAction("ask_community")}
                    debugId="shop-control.market-intelligence.ask-community"
                    stableHeight={38}
                    style={{
                      borderRadius: 999,
                      padding: "0 13px",
                      background: "#0F5EAA",
                      color: "#FFFFFF",
                      border: "1px solid rgba(15,94,170,0.18)",
                      fontSize: 12,
                      fontWeight: 900,
                      boxShadow: "0 8px 16px rgba(8,38,67,0.08)",
                    }}
                  >
                    Ask Community
                  </StableCtaLink>
                  <StableCtaLink
                    to={routes.demandBox}
                    onClick={() => trackMarketIntelligenceAction("open_demand_box")}
                    debugId="shop-control.market-intelligence.demand-box"
                    stableHeight={38}
                    style={{
                      borderRadius: 999,
                      padding: "0 13px",
                      background: "#FFFFFF",
                      color: "#0F5EAA",
                      border: "1px solid rgba(15,94,170,0.18)",
                      fontSize: 12,
                      fontWeight: 900,
                      boxShadow: "0 8px 16px rgba(8,38,67,0.08)",
                    }}
                  >
                    Open Demand Box
                  </StableCtaLink>
                </div>
              </div>
              {communityNeedOpportunities.length ? (
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {communityNeedOpportunities.map((opportunity) => (
                    <div
                      key={`community-need-${opportunity.row.id}`}
                      style={{
                        borderRadius: 14,
                        border: "1px solid rgba(122,89,16,0.14)",
                        background: "rgba(255,255,255,0.72)",
                        padding: 10,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: "#061827", fontSize: 13, fontWeight: 950, lineHeight: 1.25 }}>
                            {firstTruthy(opportunity.row.title, opportunity.categoryLabel, "Community request")}
                          </div>
                          <div style={{ marginTop: 3, color: "#5A4720", fontSize: 11, fontWeight: 850 }}>
                            {opportunity.categoryLabel}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          <span style={{ ...badge(opportunity.state !== "INSUFFICIENT_EVIDENCE"), fontSize: 10 }}>
                            {opportunity.stateLabel}
                          </span>
                          <span style={{ ...badge(opportunity.confidence === "Medium"), fontSize: 10 }}>
                            {opportunity.confidence} confidence
                          </span>
                        </div>
                      </div>
                      <div style={{ marginTop: 8, display: "grid", gap: 5, color: "#385773", fontSize: 11, fontWeight: 760, lineHeight: 1.4 }}>
                        <div><strong style={{ color: "#061827" }}>Evidence:</strong> {opportunity.evidence}</div>
                        <div><strong style={{ color: "#061827" }}>Why it may match:</strong> {opportunity.reason}</div>
                        <div><strong style={{ color: "#061827" }}>Action:</strong> {opportunity.primaryAction}</div>
                        <div><strong style={{ color: "#061827" }}>Review:</strong> {opportunity.reviewTrigger}</div>
                        {opportunity.terms.length ? (
                          <div><strong style={{ color: "#061827" }}>Shared words:</strong> {opportunity.terms.join(", ")}</div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 10, color: "#385773", fontSize: 12, fontWeight: 760, lineHeight: 1.4 }}>
                  No commercial Community Needs card is ready from current Demand Box records. This may mean there is no open request, the link to your shop is unclear, or a sensitive/support need was kept out of shop opportunity guidance.
                </div>
              )}
              {sensitiveDemandSignalCount > 0 ? (
                <div style={{ marginTop: 8, color: "#7A4A00", fontSize: 11, fontWeight: 800, lineHeight: 1.4 }}>
                  {sensitiveDemandSignalCount} sensitive or support-related request{sensitiveDemandSignalCount === 1 ? " was" : "s were"} not shown as a commercial opportunity.
                </div>
              ) : null}
            </div>
            <div style={{ marginTop: 12, borderRadius: 14, padding: 11, background: "rgba(239,247,255,0.80)", border: "1px solid rgba(18,58,89,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ color: "#061827", fontSize: 13, fontWeight: 950 }}>Advice action trail</div>
                <div style={{ color: "#0F5EAA", fontSize: 12, fontWeight: 900 }}>{recommendationActions7Days} logged</div>
              </div>
              <div style={{ marginTop: 5, color: "#385773", fontSize: 12, fontWeight: 780, lineHeight: 1.4 }}>
                Tracks whether the owner acted on Market Intelligence guidance in the last 7 days.
              </div>
              {recommendationActionRows.length ? (
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  {recommendationActionRows.map((row) => (
                    <div key={`recommendation-action-${row.action || row.label}`} style={{ display: "flex", justifyContent: "space-between", gap: 10, color: "#24415C", fontSize: 11, fontWeight: 850 }}>
                      <span>{row.label}</span>
                      <span>{row.count}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              <div style={{ marginTop: 8, color: "#5A6F84", fontSize: 11, fontWeight: 750, lineHeight: 1.4 }}>
                {recommendationActionBoundary}
              </div>
            </div>
            <details style={{ marginTop: 12 }}>
              <StableDisclosureSummary debugId="shop-control.market-intelligence.why" stableHeight={40} style={{ color: "#0F5EAA", fontSize: 13, fontWeight: 900, cursor: "pointer" }}>Why this advice?</StableDisclosureSummary>
              <div style={{ marginTop: 8, color: "#385773", fontSize: 12, fontWeight: 750, lineHeight: 1.45 }}>
                {shopAnalyticsWisdom.why} This reading is packaged through the shared Attention Spine signal engine, so it does not create a separate shop-only priority system. Community Needs is read from the existing Demand Box request lane, not a separate matching engine or survey system.
              </div>
            </details>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            borderRadius: 16,
            border: "1px solid rgba(18,58,89,0.10)",
            background: "rgba(234,244,255,0.76)",
            color: "#385773",
            padding: "11px 14px",
            fontSize: 13,
            fontWeight: 750,
            lineHeight: 1.45,
          }}
        >
          Visitors, views, opens, and taps are attention signals. They are not buyers, sales, payment proof, verification, or a trust score.
        </div>
      </section>
      ) : null}
      {activeOwnerLayer === "vault" ? (
      <section
        id="shop-control-vault"
        style={pageCard("linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 55%, #EAF3FF 100%)")}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "72px minmax(0, 1fr)",
            gap: 14,
            alignItems: "center",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 64,
              height: 64,
              borderRadius: 22,
              display: "grid",
              placeItems: "center",
              background: "rgba(255,255,255,0.97)",
              color: "#7A4A00",
              border: "1px solid rgba(226,192,106,0.36)",
              boxShadow:
                "0 16px 30px rgba(6,24,39,0.10), inset 0 1px 0 rgba(255,255,255,0.96)",
            }}
          >
            <GsnLegacyIcon name="vault" size={38} />
          </div>

          <div>
            <div style={sectionLabel()}>Vault Control</div>
            <div
              style={{
                marginTop: 8,
                color: "#07172C",
                fontSize: isCompact ? 23 : 28,
                fontWeight: 950,
                lineHeight: 1.08,
              }}
            >
              Private offers and secure links.
            </div>
            <div style={{ marginTop: 8, ...helperText(), maxWidth: 760 }}>
              Vault is for selected people only. Add private offers, then create a link for the right viewer.
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={badge(vaultProducts.length > 0)}>
            {labelWithIcon("vault", <>Offers: {vaultProducts.length}</>)}
          </span>
          <span style={badge(vaultLinks.length > 0)}>
            {labelWithIcon("lock", <>Links: {vaultLinks.length}</>)}
          </span>
          <span style={badge(false)}>{labelWithIcon("check", vaultStateLabel)}</span>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {[
            ["financeInstitution", "1. Activate slots", "Pay for one slot or six private slots."],
            ["vault", "2. Add private offers", "Put only private products inside Vault."],
            ["lock", "3. Share access", "Create a link only for the person who should see it."],
          ].map(([icon, title, text]) => (
            <div key={title} style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)")}>
              {controlIconTile(icon as GsnIconName, false, 22)}
              <div style={{ marginTop: 10, color: "#0B1F33", fontWeight: 950, fontSize: 16 }}>
                {title}
              </div>
              <div style={{ marginTop: 6, ...helperText(), fontSize: 13 }}>
                {text}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1fr 1.2fr",
            gap: 12,
          }}
        >
          <div style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 60%, #FFF9E7 100%)")}>
            <div style={sectionLabel()}>{labelWithIcon("vault", "Private offers")}</div>
            <div style={{ marginTop: 8, color: "#0B1F33", fontSize: 18, fontWeight: 950 }}>
              {vaultProducts.length} offer{vaultProducts.length === 1 ? "" : "s"} ready
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {vaultProducts.length > 0 ? (
                vaultProducts.slice(0, 5).map((item) => (
                  <div key={item.id} style={{ ...helperText(), fontWeight: 800 }}>
                    {firstTruthy(item?.name, "Private offer")}
                  </div>
                ))
              ) : (
                <div style={helperText()}>
                  No private offer is ready yet. Add one before creating a viewing link.
                </div>
              )}
            </div>

            <div style={{ marginTop: 12, ...controlGrid(isCompact, 160) }}>
              <StableCtaLink
                to={routes.shopAssets}
                kind="secondary"
                fullWidth
                debugId="shop-control.vault-layer.manage-offers"
              >
                Manage private offers
              </StableCtaLink>
              <PrimaryButton
                onClick={() => createVaultViewingLink()}
                disabled={
                  shopActionsLocked ||
                  creatingVaultLink ||
                  vaultProducts.length === 0
                }
                busy={creatingVaultLink}
                busyLabel="Creating..."
                fullWidth
                debugId="shop-control.vault-layer.create-link"
              >
                {shopActionsLocked
                  ? "Review Identity First"
                  : creatingVaultLink
                  ? "Creating..."
                  : vaultProducts.length === 0
                    ? "Add private offer first"
                    : "Create viewing link"}
              </PrimaryButton>
            </div>
          </div>

          <div style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)")}>
            <div style={sectionLabel()}>{labelWithIcon("lock", "Access links")}</div>
            <div style={{ marginTop: 8, color: "#0B1F33", fontSize: 18, fontWeight: 950 }}>
              {vaultLinks.length} link{vaultLinks.length === 1 ? "" : "s"} ready
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {vaultLinks.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  style={{
                    ...innerCard("rgba(255,255,255,0.08)"),
                    border: "1px solid rgba(212,175,55,0.16)",
                    padding: 12,
                  }}
                >
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={badge(true)}>{labelWithIcon("lock", <>Link #{item.id}</>)}</span>
                    <span
                      style={{
                        ...badge(false),
                        background: "rgba(217,172,51,0.12)",
                        color: "#6F4C00",
                      }}
                    >
                      {firstTruthy(item?.status, "active")}
                    </span>
                    <span style={badge(false)}>
                      {labelWithIcon(
                        "eye",
                        <>
                          {Number(item.views_used || 0)} / {Number(item.max_views || 0) || "Unlimited"}
                        </>
                      )}
                    </span>
                  </div>
                  <div style={{ marginTop: 8, ...helperText() }}>
                    Access ends: {safeDateTime(item?.expires_at) || "No expiry set"}
                  </div>
                  <div style={{ marginTop: 8, ...controlGrid(isCompact, 160) }}>
                    <SubtleButton
                      onClick={() =>
                        copyText(
                          buildVaultViewingLinkPackage(item),
                          "Vault viewing package copied.",
                          "shop-control-vault"
                        )
                      }
                      disabled={!vaultLinkUrl(item)}
                      fullWidth
                      debugId={`shop-control.vault-link.${item.id}.copy`}
                    >
                      Copy link
                    </SubtleButton>
                    <SecondaryButton
                      onClick={() => openExternalLink(vaultLinkUrl(item), "shop-control-vault")}
                      disabled={!vaultLinkUrl(item)}
                      fullWidth
                      debugId={`shop-control.vault-link.${item.id}.open`}
                    >
                      Open link
                    </SecondaryButton>
                    <SecondaryButton
                      onClick={() => extendVaultViewingLink(item)}
                      disabled={busyVaultLinkId === Number(item.id)}
                      busy={busyVaultLinkId === Number(item.id) && busyVaultLinkAction === "extend"}
                      busyLabel="Extending..."
                      fullWidth
                      debugId={`shop-control.vault-link.${item.id}.extend`}
                    >
                      Extend 72 hours
                    </SecondaryButton>
                    <SecondaryButton
                      onClick={() => revokeVaultViewingLink(item)}
                      disabled={
                        busyVaultLinkId === Number(item.id) ||
                        firstTruthy(item?.status).toLowerCase() === "revoked"
                      }
                      busy={busyVaultLinkId === Number(item.id) && busyVaultLinkAction === "revoke"}
                      busyLabel="Revoking..."
                      fullWidth
                      debugId={`shop-control.vault-link.${item.id}.revoke`}
                    >
                      Revoke
                    </SecondaryButton>
                  </div>
                </div>
              ))}

              {vaultLinks.length === 0 ? (
                <div style={helperText()}>
                  No access link is ready yet. Create a link after at least one private offer is ready.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
      ) : null}
    </div>
  );
}
