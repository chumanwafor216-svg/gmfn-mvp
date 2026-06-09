import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DomainIntroToggle from "../components/DomainIntroToggle";
import ExplainToggle from "../components/ExplainToggle";
import GSNBrandMark from "../components/GSNBrandMark";
import {
  normalizedJoinInviteUrl,
  personalizedJoinInviteUrl,
} from "../lib/joinLinks";
import { navigateWithOrigin } from "../lib/nav";
import {
  navigateToCta,
  resolveCtaTarget,
  type CtaIntent,
} from "../lib/ctaTargets";
import { APP_ROUTES, routeWithCommunity } from "../lib/appRoutes";
import {
  publicApiUrl,
  publicFrontendUrl,
  publicShopBlockUrl,
  publicShopPath,
  publicShopSharePath,
  publicShopShareUrl,
  publicShopUrl,
} from "../lib/publicLinks";
import { useLocation, useNavigate } from "react-router-dom";
import { StableButton, StableCtaLink } from "../components/StableButton";
import { StableDisclosureSummary } from "../components/StableButton";
import {
  addLoanGuarantorRequest,
  cancelLoanRequest,
  createCommunityPackagePaymentInstruction,
  createMarketplaceRepost,
  createMarketplaceShop,
  createRoscaCycle,
  createSpotlightPaymentInstruction,
  createClanInvite,
  createLoanRequest,
  getCommunityPackageStatus,
  getMarketplaceRepostTargetSuggestions,
  getMarketplaceShopSpotlightStatus,
  getClanTrustScoreExplained,
  getClanInviteLink,
  getCurrentClan,
  getLoanGuarantorSuggestions,
  getLoanSummary,
  getMarketplaceProducts,
  getMarketplaceShopByGmfnId,
  getMyMarketplaceShop,
  getMarketplaceShops,
  getMe,
  getPoolMe,
  getRoscaCycles,
  getSelectedClanId,
  listMyPaymentInstructionExpectedPayments,
  recordRoscaCyclePayout,
  setSelectedClanId,
  listClanMembers,
  listMyClans,
  listMyLoans,
  safeCopy,
} from "../lib/api";
import {
  getCommunityMoneySurface,
  type CommunityMoneySettlement,
  type CommunityMoneySurface,
} from "../lib/communityMoney";
import {
  marketplaceSectionStyle,
  scrollElementToMarketplaceLanding,
  traceMarketplaceLanding,
} from "../lib/marketplaceActionStability";

type CommunityRow = {
  id?: number;
  clan_id?: number;
  name?: string | null;
  display_name?: string | null;
  title?: string | null;
  description?: string | null;
  marketplace_name?: string | null;
  marketplace_description?: string | null;
  clan_name?: string | null;
  invite_code?: string | null;
  invite_link?: string | null;
  invite_url?: string | null;
  community_global_id?: string | null;
  global_id?: string | null;
  community_id?: string | null;
  community_code?: string | null;
  marketplace_id?: string | null;
  gmfn_id?: string | null;
  clan_code?: string | null;
  code?: string | null;
  image_url?: string | null;
  profile_image_url?: string | null;
  community_image_url?: string | null;
  marketplace_image_url?: string | null;
  cover_image_url?: string | null;
  banner_url?: string | null;
  logo_url?: string | null;
  trust_band?: string | null;
  trust_class?: string | null;
  trust_score?: string | null;
  community_trust_band?: string | null;
  community_trust_score?: string | null;
  reputation_band?: string | null;
  community_finance_health?: string | null;
  finance_health?: string | null;
  finance_band?: string | null;
  member_count?: number | null;
  members_count?: number | null;
  community_standing?: any;
  community_strength?: string | null;
  status?: string | null;
  role?: string | null;
  member_role?: string | null;
  membership_role?: string | null;
  participant_role?: string | null;
  community?: any;
  profile?: any;
  marketplace?: any;
  clan?: any;
  meta?: any;
};

type ClanMember = {
  id?: number;
  user_id?: number;
  gmfn_id?: string | null;
  role?: string | null;
  display_name?: string | null;
  nickname?: string | null;
  first_name?: string | null;
  surname?: string | null;
  email?: string | null;
  phone_e164?: string | null;
};

type ShopVisibilityMode = "community_visible" | "vault_private";

type MarketplaceShop = {
  id?: number;
  clan_id?: number | null;
  user_id?: number;
  owner_user_id?: number;
  gmfn_id?: string | null;
  owner_gmfn_id?: string | null;
  name?: string | null;
  description?: string | null;
  whatsapp_number?: string | null;
  telegram_handle?: string | null;
  visibility_mode?: string | null;
  shop_visibility_mode?: string | null;
  mode?: string | null;
  shop_mode?: string | null;
  shop_type?: string | null;
  visibility?: string | null;
  type?: string | null;
  is_vault?: boolean | null;
  vault_private?: boolean | null;
  is_private?: boolean | null;
};

type RepostProductOption = {
  id: number;
  originShopId: number;
  originCommunityId: number;
  blockNumber: number;
  title: string;
  description: string;
  price: string;
  currency: string;
  imageUrl: string;
  videoUrl: string;
  originShopName: string;
  sellerGmfnId: string;
  whatsappNumber: string;
  visibilityMode: ShopVisibilityMode;
  remainingSlots: number;
  repostsUsed: number;
};

type PaidRepostHandoff = {
  version?: number;
  source?: string;
  createdAt?: string;
  productId?: number;
  blockNumber?: number;
  title?: string;
  description?: string;
  priceText?: string;
  currency?: string;
  imageUrl?: string;
  videoUrl?: string;
  shopId?: number;
  ownerShopId?: number;
  originShopId?: number;
  originShopName?: string;
  sellerGmfnId?: string;
  whatsappNumber?: string;
  originCommunityId?: number;
  ownerCommunityId?: number;
  publicShopUrl?: string;
};

const PAID_REPOST_HANDOFF_STORAGE_KEY = "gmfn_paid_repost_handoff_v1";

type ExpectedPaymentRecord = {
  id?: number | string | null;
  expected_type?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  due_at?: string | null;
  reference?: string | null;
  reference_display?: string | null;
  status?: string | null;
  confirmed_at?: string | null;
  meta?: any;
  meta_json?: any;
  settlement?: any;
};

type SpotlightStatusRecord = {
  available_paid_credits?: number | string | null;
  active_paid_spotlights?: number | string | null;
  can_publish_paid_spotlight?: boolean | null;
};

type CommunityPackageStatusItem = {
  package_code?: string | null;
  feature_code?: string | null;
  title?: string | null;
  unit_label?: string | null;
  active_remaining?: number | string | null;
  engine_ready?: boolean | null;
  message?: string | null;
  latest_payment?: ExpectedPaymentRecord | null;
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
  interval_days?: number | null;
  total_rounds?: number | null;
  total_expected_contributions?: number | null;
  total_confirmed_contributions?: number | null;
  total_recorded_payouts?: number | null;
  member_user_ids?: number[] | null;
  payout_order_user_ids?: number[] | null;
  rounds?: RoscaRoundSummary[];
};

type RepostTargetSuggestion = {
  community_id?: number | string | null;
  community_code?: string | null;
  marketplace_name?: string | null;
  public_name?: string | null;
  score?: number | string | null;
  confidence?: string | null;
  reasons?: string[] | null;
  matched_terms?: string[] | null;
  active_public_blocks?: number | string | null;
  community_signal?: string | null;
  active_spotlights?: number | string | null;
  max_spotlights?: number | string | null;
};

type LoanSupportItem = {
  id?: number;
  clan_id?: number;
  title?: string | null;
  status?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  borrower_name?: string | null;
  guarantor_name?: string | null;
  created_at?: string | null;
  role?: string | null;
};

type LoanDraftSummary = {
  id?: number;
  status?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  remaining_amount?: string | number | null;
  guarantors_required?: number | null;
  approved_guarantors?: number | null;
  guarantors_total?: number | null;
  due_at?: string | null;
  decision_at?: string | null;
};

type SuggestedSupporter = {
  key: string;
  userId?: number;
  gmfnId?: string;
  name: string;
  reason?: string | null;
  recommendedPledge?: string | null;
};

type NoticeTone = "success" | "error";

type SectionState = {
  money: boolean;
  rosca: boolean;
  tools: boolean;
  members: boolean;
  support: boolean;
};

type MarketplaceIntentItem = {
  id: string;
  label: string;
  detail: string;
  technical: string;
  to: string;
  intent?: CtaIntent;
  tone: "primary" | "secondary" | "soft";
  keywords: string[];
  visible?: boolean;
};

type PersistedWithdrawalTask = {
  amountInput: string;
  noteInput: string;
  latestWithdrawalResult: any | null;
};

const DEFAULT_SECTION_STATE: SectionState = {
  money: false,
  rosca: false,
  tools: false,
  members: false,
  support: false,
};

const MARKETPLACE_SECTION_ANCHORS: Record<keyof SectionState, string> = {
  money: "marketplace-money-routes",
  rosca: "marketplace-rosca",
  tools: "marketplace-owned-links",
  members: "marketplace-members-shops",
  support: "marketplace-loans-support",
};

function focusedMarketplaceSectionState(key: keyof SectionState): SectionState {
  return {
    money: key === "money",
    rosca: key === "rosca",
    tools: key === "tools",
    members: key === "members",
    support: key === "support",
  };
}

function touchedMarketplaceSectionState(
  prev: SectionState,
  key: keyof SectionState
): SectionState {
  return {
    ...prev,
    [key]: true,
  };
}

function normalizeMarketplaceSectionState(
  state: SectionState | null | undefined
): SectionState {
  if (!state) return DEFAULT_SECTION_STATE;
  if (state.support) return focusedMarketplaceSectionState("support");
  if (state.rosca) return focusedMarketplaceSectionState("rosca");
  if (state.members) return focusedMarketplaceSectionState("members");
  if (state.tools) return focusedMarketplaceSectionState("tools");
  if (state.money) return focusedMarketplaceSectionState("money");
  return DEFAULT_SECTION_STATE;
}

const MARKETPLACE_INTENT_ITEMS: MarketplaceIntentItem[] = [
  {
    id: "money-in",
    label: "Add money",
    detail: "Pay into this marketplace or community pool.",
    technical: "Money In",
    to: "",
    intent: "moneyIn",
    tone: "primary",
    keywords: ["add", "deposit", "pay", "pay in", "money in", "fund", "top up"],
    visible: false,
  },
  {
    id: "money-out",
    label: "Take money out",
    detail: "Start the withdrawal or payout route.",
    technical: "Money Out",
    to: "",
    intent: "moneyOut",
    tone: "secondary",
    keywords: ["withdraw", "cash out", "money out", "payout", "take out"],
    visible: false,
  },
  {
    id: "finance",
    label: "Check money record",
    detail: "Review the money picture for this selected marketplace.",
    technical: "Finance",
    to: "",
    intent: "finance",
    tone: "secondary",
    keywords: ["finance", "balance", "pool", "record", "account", "money"],
    visible: false,
  },
  {
    id: "rosca",
    label: "Open ROSCA",
    detail: "Start or check this community contribution cycle.",
    technical: "ROSCA",
    to: "#marketplace-rosca",
    tone: "secondary",
    keywords: ["rosca", "cycle", "ajo", "susu", "contribution", "rotation"],
    visible: false,
  },
  {
    id: "support",
    label: "Ask for support",
    detail: "Start or continue a support or loan request.",
    technical: "Borrow / Lend / Support",
    to: "#marketplace-loans-support",
    tone: "secondary",
    keywords: ["loan", "borrow", "support", "lend", "help", "guarantor"],
    visible: false,
  },
  {
    id: "shop",
    label: "Show my shop",
    detail: "Open the shop connected to your GSN ID.",
    technical: "Shop Gallery",
    to: "",
    tone: "secondary",
    keywords: ["shop", "gallery", "sell", "market", "store", "product"],
    visible: false,
  },
  {
    id: "invite",
    label: "Invite people",
    detail: "Open links owned by this marketplace.",
    technical: "Marketplace links",
    to: "#marketplace-owned-links",
    tone: "soft",
    keywords: ["invite", "join", "link", "bring", "people", "share"],
    visible: false,
  },
  {
    id: "trust",
    label: "Check trust or ID",
    detail: "Open your broader trust reading.",
    technical: "Trust Passport",
    to: "",
    intent: "trust",
    tone: "soft",
    keywords: ["trust", "score", "passport"],
  },
  {
    id: "identity",
    label: "Check identity",
    detail: "Open identity and continuity checks.",
    technical: "Identity",
    to: "",
    intent: "cci",
    tone: "soft",
    keywords: ["id", "identity", "continuity"],
  },
  {
    id: "trustslip",
    label: "Show proof",
    detail: "Open TrustSlip proof.",
    technical: "TrustSlip",
    to: "",
    intent: "trustSlip",
    tone: "soft",
    keywords: ["trustslip", "slip", "proof", "verify"],
  },
  {
    id: "demand",
    label: "Post a need",
    detail: "Tell this marketplace what is needed.",
    technical: "Demand Box",
    to: "",
    intent: "demandBox",
    tone: "soft",
    keywords: ["need", "demand", "request", "post", "supply", "want"],
    visible: false,
  },
  {
    id: "community",
    label: "Switch community",
    detail: "Return to Community Home and choose another group.",
    technical: "Community Home",
    to: "",
    intent: "communityHome",
    tone: "soft",
    keywords: ["community", "group", "clan", "choose", "switch", "home"],
  },
  {
    id: "messages",
    label: "Check messages",
    detail: "See alerts, requests, and unfinished items.",
    technical: "Notifications",
    to: "",
    intent: "notifications",
    tone: "soft",
    keywords: ["message", "messages", "notification", "alert", "notice"],
  },
];

const FINAL_LOAN_STATUSES = new Set([
  "approved",
  "repaid",
  "closed",
  "completed",
  "cancelled",
  "defaulted",
]);

const WITHDRAWAL_TASK_STORAGE_KEY_PREFIX = "gmfn.withdrawal.task.v4";

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function normalizeIntentText(value: any): string {
  return safeStr(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findMarketplaceIntent(value: string): MarketplaceIntentItem | null {
  const text = normalizeIntentText(value);
  if (!text) return null;

  return (
    MARKETPLACE_INTENT_ITEMS.find((item) =>
      item.keywords.some((keyword) => {
        const normalizedKeyword = normalizeIntentText(keyword);
        return (
          text === normalizedKeyword ||
          text.includes(normalizedKeyword) ||
          normalizedKeyword.includes(text)
        );
      })
    ) || null
  );
}

function displayGsnLabel(value: any): string {
  const text = safeStr(value);
  return text.replace(/^GMF[MN]/i, "GSN");
}

function isPublicIdentityFallback(value: any): boolean {
  const text = safeStr(value);
  if (!text) return true;

  const lowered = text.toLowerCase();
  if (lowered.includes("@")) return true;
  if (lowered.endsWith(".local")) return true;
  if (/^(?:gmf[MN]|gsn)-/i.test(text)) return true;
  if (/^(?:gmf[MN]|gsn)-.+\s+shop$/i.test(text)) return true;

  const compact = text.replace(/\s+/g, "");
  const digits = compact.replace(/\D/g, "");
  if (digits.length >= 7 && digits.length >= compact.length - 2) return true;

  return false;
}

function firstPublicIdentity(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (!text || isPublicIdentityFallback(text)) continue;
    return text;
  }

  return "";
}

function firstDefined(...values: any[]): any {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    return value;
  }
  return undefined;
}

function rowsOf<T = any>(input: any): T[] {
  if (Array.isArray(input)) return input as T[];
  if (Array.isArray(input?.items)) return input.items as T[];
  if (Array.isArray(input?.data?.items)) return input.data.items as T[];
  if (Array.isArray(input?.results)) return input.results as T[];
  if (Array.isArray(input?.rows)) return input.rows as T[];
  return [];
}

function positiveNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function paymentQuantity(payment?: ExpectedPaymentRecord | null): number {
  const meta = payment?.meta || payment?.meta_json || {};
  const value = Number(firstDefined((payment as any)?.quantity_total, meta?.quantity_total, 1));
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function isConfirmedPayment(payment?: ExpectedPaymentRecord | null): boolean {
  const status = safeStr(payment?.status).toLowerCase();
  return Boolean(payment?.confirmed_at) || status === "confirmed" || status === "matched";
}

function spotlightCreditAmount(creditCount: unknown): number {
  const credits = Math.max(1, Math.floor(Number(creditCount || 1)));
  const bundleCount = Math.floor(credits / 6);
  const remainder = credits % 6;
  return bundleCount * 5 + remainder;
}

function formatRailMoney(amount: unknown, currency = "GBP"): string {
  const code = safeStr(currency || "GBP").toUpperCase() || "GBP";
  const n = Number(amount);
  if (!Number.isFinite(n)) {
    const text = safeStr(amount);
    return text ? `${code} ${text}` : "";
  }
  return `${code} ${n.toFixed(Math.abs(n % 1) > 0 ? 2 : 0)}`;
}

function mergeFirstVisible(...rows: any[]): any {
  const out: any = {};

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;

    for (const [key, value] of Object.entries(row)) {
      const existing = out[key];
      const existingVisible =
        existing !== undefined &&
        existing !== null &&
        !(typeof existing === "string" && existing.trim() === "");

      const valueVisible =
        value !== undefined &&
        value !== null &&
        !(typeof value === "string" && String(value).trim() === "");

      if (!existingVisible && valueVisible) {
        out[key] = value;
      }
    }
  }

  return out;
}

function getRowId(row: any): number {
  return positiveNumber(row?.id || row?.clan_id || row?.community_id);
}

function buildSelectedCommunity(
  currentClan: any,
  clanRows: any[],
  preferredClanId = 0
): CommunityRow | null {
  const preferredId = positiveNumber(preferredClanId);
  const currentId = getRowId(currentClan);
  const currentClanMatchesPreferred = !preferredId || currentId === preferredId;
  const preferredRow =
    preferredId > 0
      ? clanRows.find((row: any) => getRowId(row) === preferredId) || null
      : null;
  const matchedRow =
    preferredRow ||
    (currentClanMatchesPreferred
      ? clanRows.find((row: any) => getRowId(row) === currentId) || null
      : null);
  const firstRow = preferredId ? null : clanRows[0] || null;
  const currentSource = currentClanMatchesPreferred ? currentClan : null;

  const merged = {
    ...mergeFirstVisible(currentSource, matchedRow, firstRow),
    community: mergeFirstVisible(
      currentSource?.community,
      matchedRow?.community,
      firstRow?.community
    ),
    profile: mergeFirstVisible(
      currentSource?.profile,
      matchedRow?.profile,
      firstRow?.profile
    ),
    marketplace: mergeFirstVisible(
      currentSource?.marketplace,
      matchedRow?.marketplace,
      firstRow?.marketplace
    ),
    clan: mergeFirstVisible(currentSource?.clan, matchedRow?.clan, firstRow?.clan),
    meta: mergeFirstVisible(currentSource?.meta, matchedRow?.meta, firstRow?.meta),
  };

  if (getRowId(merged)) return merged as CommunityRow;

  return preferredId
    ? ({
        id: preferredId,
        clan_id: preferredId,
        name: `Community ${preferredId}`,
      } as CommunityRow)
    : null;
}

function getMemberName(member: ClanMember): string {
  return (
    firstPublicIdentity(
      member?.display_name,
      member?.nickname,
      [safeStr(member?.first_name), safeStr(member?.surname)]
        .filter((part) => !isPublicIdentityFallback(part))
        .join(" ")
    ) || "GSN member"
  );
}

function getMemberGmfnId(member: ClanMember): string {
  return firstTruthy(member?.gmfn_id);
}

function getShopForMember(
  member: ClanMember,
  shops: MarketplaceShop[]
): MarketplaceShop | null {
  const memberGmfnId = safeStr(member?.gmfn_id || "").toUpperCase();
  const memberUserId = Number(member?.user_id || member?.id || 0);

  for (const shop of shops) {
    const shopGmfn = safeStr(
      shop?.gmfn_id || shop?.owner_gmfn_id || ""
    ).toUpperCase();
    const shopUserId = Number(shop?.user_id || shop?.owner_user_id || 0);

    if (memberGmfnId && shopGmfn && memberGmfnId === shopGmfn) {
      return shop;
    }

    if (memberUserId > 0 && shopUserId > 0 && memberUserId === shopUserId) {
      return shop;
    }
  }

  return null;
}

function getPoolAmountText(payload: any): string {
  const candidates = [
    payload?.available_balance,
    payload?.balance,
    payload?.pool_balance,
    payload?.summary?.available_balance,
    payload?.summary?.balance,
    payload?.totals?.available_balance,
    payload?.totals?.balance,
    payload?.wallet_balance,
  ];

  for (const candidate of candidates) {
    const text = safeStr(candidate);
    if (text) return text;
  }

  return "—";
}

function getPoolCurrency(payload: any): string {
  return firstTruthy(
    payload?.currency,
    payload?.summary?.currency,
    payload?.totals?.currency,
    "NGN"
  );
}

function getInviteUrl(payload: any): string {
  return normalizedJoinInviteUrl(payload);
}

function communityName(row: CommunityRow | null | undefined): string {
  return (
    firstTruthy(
      row?.marketplace_name,
      row?.marketplace?.marketplace_name,
      row?.community?.marketplace_name,
      row?.clan?.marketplace_name,
      row?.display_name,
      row?.name,
      row?.clan_name,
      row?.community?.display_name,
      row?.community?.name,
      row?.clan?.name,
      row?.title
    ) || "Selected community"
  );
}

function baseCommunityName(row: CommunityRow | null | undefined): string {
  return (
    firstTruthy(
      row?.display_name,
      row?.name,
      row?.clan_name,
      row?.community?.display_name,
      row?.community?.name,
      row?.clan?.name,
      row?.title,
      row?.marketplace_name
    ) || "Selected community"
  );
}
function normalizeMarketplaceShopVisibility(raw: any): ShopVisibilityMode {
  const src = raw?.item || raw?.shop || raw || {};

  const modeText = firstTruthy(
    src?.visibility_mode,
    src?.shop_visibility_mode,
    src?.mode,
    src?.shop_mode,
    src?.shop_type,
    src?.visibility,
    src?.type
  ).toLowerCase();

  if (
    modeText.includes("vault") ||
    modeText.includes("lock") ||
    modeText.includes("private") ||
    src?.is_vault === true ||
    src?.vault_private === true ||
    src?.is_private === true
  ) {
    return "vault_private";
  }

  return "community_visible";
}

function normalizeMarketplaceShop(raw: any): MarketplaceShop | null {
  if (!raw) return null;

  const src = raw?.item || raw?.shop || raw;

  return {
    id: positiveNumber(firstDefined(src?.id, src?.shop_id)) || undefined,
    user_id: positiveNumber(firstDefined(src?.user_id)),
    owner_user_id: positiveNumber(
      firstDefined(src?.owner_user_id, src?.owner_id)
    ),
    gmfn_id: firstTruthy(src?.gmfn_id, src?.gmfnId),
    owner_gmfn_id: firstTruthy(
      src?.owner_gmfn_id,
      src?.owner_gmfn,
      src?.ownerGmfnId
    ),
    name: firstPublicIdentity(src?.name, src?.shop_name, src?.title),
    description: firstTruthy(
      src?.description,
      src?.shop_description,
      src?.about,
      src?.summary
    ),
    whatsapp_number: firstTruthy(
      src?.whatsapp_number,
      src?.whatsapp,
      src?.phone_whatsapp
    ),
    telegram_handle: firstTruthy(
      src?.telegram_handle,
      src?.telegram,
      src?.telegram_username
    ),
    visibility_mode: firstTruthy(src?.visibility_mode),
    shop_visibility_mode: firstTruthy(src?.shop_visibility_mode),
    mode: firstTruthy(src?.mode),
    shop_mode: firstTruthy(src?.shop_mode),
    shop_type: firstTruthy(src?.shop_type),
    visibility: firstTruthy(src?.visibility),
    type: firstTruthy(src?.type),
    is_vault: src?.is_vault ?? null,
    vault_private: src?.vault_private ?? null,
    is_private: src?.is_private ?? null,
  };
}

function stripPublicBlockMetadata(description: any): string {
  return safeStr(description)
    .replace(/\[BLOCK:\s*\d+\]/gi, "")
    .replace(/\[LABEL:\s*[^\]]+\]/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeRepostProductOption(raw: any): RepostProductOption | null {
  const src = raw?.item || raw?.product || raw;
  const id = positiveNumber(src?.id || src?.product_id);
  if (!id) return null;

  const visibilityMode =
    firstTruthy(src?.visibility_mode, src?.visibilityMode) === "vault_private"
      ? "vault_private"
      : "community_visible";

  const title = firstTruthy(src?.name, src?.title, `Public block ${id}`);
  const description = stripPublicBlockMetadata(src?.description);

  return {
    id,
    originShopId: positiveNumber(
      firstDefined(src?.shop_id, src?.shopId, src?.origin_shop_id, src?.shop?.id)
    ),
    originCommunityId: positiveNumber(
      firstDefined(
        src?.clan_id,
        src?.clanId,
        src?.community_id,
        src?.origin_clan_id,
        src?.source_clan_id,
        src?.shop?.clan_id,
        src?.shop?.community_id
      )
    ),
    blockNumber: positiveNumber(
      firstDefined(
        src?.public_block_number,
        src?.slot_number,
        src?.slotNumber,
        src?.block,
        src?.block_number
      )
    ),
    title,
    description,
    price: firstTruthy(src?.price, src?.amount, src?.display_price),
    currency: firstTruthy(src?.currency, src?.currency_code, "NGN"),
    imageUrl: firstTruthy(
      src?.image_url,
      src?.imageUrl,
      src?.thumbnail_url,
      src?.poster_url,
      src?.media?.image_url,
      src?.media?.thumbnail_url
    ),
    videoUrl: firstTruthy(
      src?.video_url,
      src?.videoUrl,
      src?.media?.video_url,
      src?.media?.url
    ),
    originShopName: firstPublicIdentity(
      src?.origin_shop_name,
      src?.shop_name,
      src?.shop?.name,
      src?.marketplace_shop_name
    ),
    sellerGmfnId: firstTruthy(
      src?.seller_gmfn_id,
      src?.owner_gmfn_id,
      src?.gmfn_id,
      src?.shop?.owner_gmfn_id,
      src?.shop?.gmfn_id
    ),
    whatsappNumber: firstTruthy(
      src?.whatsapp_number,
      src?.shop_whatsapp_number,
      src?.owner_whatsapp_number,
      src?.shop?.whatsapp_number
    ),
    visibilityMode,
    remainingSlots: positiveNumber(
      firstDefined(
        src?.distribution_slots_remaining,
        src?.remaining_distribution_slots,
        src?.remainingSlots
      )
    ),
    repostsUsed: positiveNumber(firstDefined(src?.reposts_used, src?.repostsUsed)),
  };
}

function normalizePaidRepostHandoff(raw: PaidRepostHandoff | null): RepostProductOption | null {
  if (!raw) return null;
  const id = positiveNumber(raw.productId);
  const blockNumber = positiveNumber(raw.blockNumber);
  if (!id && !blockNumber) return null;

  const priceText = firstTruthy(raw.priceText);
  const currency = firstTruthy(raw.currency, "NGN");
  const price = priceText
    ? priceText.replace(new RegExp(`\\s+${currency}$`, "i"), "").trim()
    : "";

  return {
    id: id || blockNumber,
    originShopId: positiveNumber(
      firstDefined(raw.shopId, raw.ownerShopId, raw.originShopId)
    ),
    originCommunityId: positiveNumber(
      firstDefined(raw.originCommunityId, raw.ownerCommunityId)
    ),
    blockNumber,
    title: firstTruthy(raw.title, `Public block ${blockNumber || id || "?"}`),
    description: stripPublicBlockMetadata(raw.description),
    price,
    currency,
    imageUrl: firstTruthy(raw.imageUrl),
    videoUrl: firstTruthy(raw.videoUrl),
    originShopName: firstPublicIdentity(raw.originShopName),
    sellerGmfnId: firstTruthy(raw.sellerGmfnId),
    whatsappNumber: firstTruthy(raw.whatsappNumber),
    visibilityMode: "community_visible",
    remainingSlots: 0,
    repostsUsed: 0,
  };
}

function readPaidRepostHandoff(
  routeProductId: number,
  routeBlockNumber: number,
  routeSource: string
): RepostProductOption | null {
  if (typeof window === "undefined") return null;
  if (
    routeSource &&
    routeSource !== "shop-diaries" &&
    routeSource !== "shop-control-gallery"
  ) {
    return null;
  }

  try {
    const text = window.sessionStorage.getItem(PAID_REPOST_HANDOFF_STORAGE_KEY);
    if (!text) return null;
    const raw = JSON.parse(text) as PaidRepostHandoff;
    const handoffProductId = positiveNumber(raw.productId);
    const handoffBlockNumber = positiveNumber(raw.blockNumber);
    if (routeProductId && handoffProductId && routeProductId !== handoffProductId) {
      return null;
    }
    if (
      routeBlockNumber &&
      handoffBlockNumber &&
      routeBlockNumber !== handoffBlockNumber
    ) {
      return null;
    }
    return normalizePaidRepostHandoff(raw);
  } catch {
    return null;
  }
}

function resolveRepostAssetSrc(raw: any): string {
  const text = safeStr(raw);
  if (!text) return "";
  if (/^(?:https?:|data:|blob:)/i.test(text)) return text;
  return publicApiUrl(text);
}

function repostProductLabel(product: RepostProductOption | null): string {
  if (!product) return "Choose public block";
  const blockPrefix = product.blockNumber ? `Block #${product.blockNumber} - ` : "";
  return product.description
    ? `${blockPrefix}${product.title} - ${product.description}`
    : `${blockPrefix}${product.title}`;
}

function repostProductPriceLabel(product: RepostProductOption | null): string {
  if (!product?.price) return "";
  const price = safeStr(product.price);
  const currency = safeStr(product.currency || "NGN");
  if (!currency) return price;
  if (new RegExp(`(?:^|\\s)${currency}$`, "i").test(price)) return price;
  return `${price} ${currency}`;
}

function uniqRepostProductOptions(items: RepostProductOption[]): RepostProductOption[] {
  const seen = new Set<number>();
  const result: RepostProductOption[] = [];

  items.forEach((item) => {
    if (!item?.id || seen.has(item.id)) return;
    seen.add(item.id);
    result.push(item);
  });

  return result.sort((a, b) => {
    const aBlock = a.blockNumber || Number.MAX_SAFE_INTEGER;
    const bBlock = b.blockNumber || Number.MAX_SAFE_INTEGER;
    if (aBlock !== bBlock) return aBlock - bBlock;
    return a.id - b.id;
  });
}

function marketplaceFieldTouchProps(debugId: string) {
  const stopMarketplaceTap = (event: React.SyntheticEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  return {
    "data-gmfn-action-root": "true",
    "data-cta-id": debugId,
    "data-gmfn-debug-id": debugId,
    onPointerDownCapture: stopMarketplaceTap,
    onPointerDown: stopMarketplaceTap,
    onPointerUpCapture: stopMarketplaceTap,
    onPointerUp: stopMarketplaceTap,
    onMouseDownCapture: stopMarketplaceTap,
    onMouseDown: stopMarketplaceTap,
    onClickCapture: stopMarketplaceTap,
    onClick: stopMarketplaceTap,
  };
}

function communityIdentity(row: CommunityRow | null | undefined): string {
  const raw = firstTruthy(
    row?.community_global_id,
    row?.global_id,
    row?.community_code,
    row?.community_id,
    row?.marketplace_id,
    row?.gmfn_id,
    row?.clan_code,
    row?.code,
    row?.community?.community_global_id,
    row?.community?.global_id,
    row?.community?.community_code,
    row?.community?.community_id,
    row?.profile?.community_global_id,
    row?.profile?.global_id,
    row?.profile?.community_code,
    row?.marketplace?.community_global_id,
    row?.marketplace?.global_id,
    row?.marketplace?.community_code,
    row?.marketplace?.marketplace_id,
    row?.clan?.community_global_id,
    row?.clan?.global_id,
    row?.clan?.community_code,
    row?.clan?.clan_code,
    row?.meta?.community_global_id,
    row?.meta?.global_id,
    row?.meta?.community_code,
    getRowId(row) ? `COMM-${getRowId(row)}` : ""
  );

  return raw ? displayGsnLabel(raw) : "Pending";
}

function marketplaceTrustLabel(
  row: CommunityRow | null | undefined,
  trust: any
): string {
  const band = firstTruthy(
    trust?.band,
    trust?.trust_band,
    row?.community_trust_band,
    row?.trust_band,
    row?.trust_class,
    row?.reputation_band,
    row?.community?.community_trust_band,
    row?.community?.trust_band,
    row?.marketplace?.community_trust_band,
    row?.marketplace?.trust_band,
    row?.clan?.community_trust_band,
    row?.clan?.trust_band,
    row?.community_standing?.community_trust_band,
    row?.community_standing?.trust_band
  );
  const score = firstTruthy(
    trust?.score,
    trust?.trust_score,
    row?.community_trust_score,
    row?.trust_score,
    row?.community?.community_trust_score,
    row?.community?.trust_score,
    row?.marketplace?.community_trust_score,
    row?.marketplace?.trust_score,
    row?.clan?.community_trust_score,
    row?.clan?.trust_score,
    row?.community_standing?.community_trust_score,
    row?.community_standing?.trust_score
  );

  if (band && score) return `${band} / ${score}`;
  return band || score || "Trust preparing";
}

function marketplaceTrustEventCount(trust: any): string {
  const counts =
    trust?.counts && typeof trust.counts === "object" ? trust.counts : {};
  const countTotal = Object.values(counts).reduce<number>((sum, value) => {
    const n = Number(value || 0);
    return Number.isFinite(n) && n > 0 ? sum + n : sum;
  }, 0);

  if (countTotal > 0) return `${countTotal} trust events`;

  const lastEvents = Array.isArray(trust?.last_events)
    ? trust.last_events.length
    : 0;
  return lastEvents > 0 ? `${lastEvents} recent events` : "No trust events yet";
}

function communityFinanceLabel(row: CommunityRow | null | undefined): string {
  return (
    firstTruthy(
      row?.community_finance_health,
      row?.finance_health,
      row?.finance_band,
      row?.community_standing?.community_finance_health,
      row?.community_standing?.finance_health,
      row?.community_standing?.finance_band,
      row?.community?.community_finance_health,
      row?.community?.finance_health,
      row?.community?.finance_band,
      row?.marketplace?.community_finance_health,
      row?.marketplace?.finance_health,
      row?.marketplace?.finance_band,
      row?.clan?.community_finance_health,
      row?.clan?.finance_health,
      row?.clan?.finance_band,
      "Marketplace finance preparing"
    )
  );
}

function normalizeLoan(raw: any): LoanSupportItem | null {
  if (!raw) return null;

  const src = raw?.item || raw?.loan || raw;

  return {
    id: positiveNumber(firstDefined(src?.id, src?.loan_id)) || undefined,
    clan_id: positiveNumber(firstDefined(src?.clan_id, src?.community_id)) || undefined,
    title: firstTruthy(
      src?.title,
      src?.purpose,
      src?.name,
      src?.loan_title,
      src?.description
    ),
    status: firstTruthy(src?.status, src?.loan_status, src?.state, "Open"),
    amount: firstDefined(
      src?.amount,
      src?.principal_amount,
      src?.loan_amount,
      src?.outstanding_amount,
      src?.requested_amount
    ),
    currency: firstTruthy(src?.currency, src?.currency_code, "NGN"),
    borrower_name: firstTruthy(
      src?.borrower_name,
      src?.member_name,
      src?.requester_name
    ),
    guarantor_name: firstTruthy(
      src?.guarantor_name,
      src?.supporter_name,
      src?.guarantee_name
    ),
    created_at: firstTruthy(src?.created_at, src?.requested_at),
    role: firstTruthy(
      src?.role,
      src?.my_role,
      src?.participant_role,
      src?.is_guarantor ? "Guarantor" : "",
      src?.is_borrower ? "Borrower" : ""
    ),
  };
}

function normalizeLoanSummary(raw: any): LoanDraftSummary | null {
  if (!raw) return null;

  const src = raw?.item || raw?.loan || raw;

  return {
    id: positiveNumber(firstDefined(src?.id, src?.loan_id)) || undefined,
    status: firstTruthy(src?.status),
    amount: firstDefined(src?.amount),
    currency: firstTruthy(src?.currency, "NGN"),
    remaining_amount: firstDefined(src?.remaining_amount),
    guarantors_required: positiveNumber(src?.guarantors_required) || undefined,
    approved_guarantors: positiveNumber(src?.approved_guarantors) || undefined,
    guarantors_total: positiveNumber(src?.guarantors_total) || undefined,
    due_at: firstTruthy(src?.due_at),
    decision_at: firstTruthy(src?.decision_at),
  };
}

function normalizeSuggestedSupporter(raw: any): SuggestedSupporter | null {
  if (!raw) return null;

  const src = raw?.item || raw?.member || raw?.user || raw?.candidate || raw;

  const userId = positiveNumber(
    firstDefined(src?.user_id, src?.member_user_id, src?.id, src?.member_id)
  );
  const gmfnId = firstTruthy(
    src?.gmfn_id,
    src?.member_gmfn_id,
    src?.owner_gmfn_id
  );
  const name = firstTruthy(
    src?.display_name,
    src?.name,
    src?.nickname,
    [safeStr(src?.first_name), safeStr(src?.surname)].filter(Boolean).join(" "),
    gmfnId,
    userId ? `Member ${userId}` : ""
  );
  const reason = firstTruthy(src?.reason, src?.note, src?.detail, src?.why);
  const recommendedPledge = firstTruthy(
    src?.recommended_pledge_amount,
    src?.pledge_amount,
    src?.suggested_amount,
    src?.amount
  );

  if (!userId && !gmfnId && !name) return null;

  const key = userId > 0 ? `u-${userId}` : `g-${safeStr(gmfnId).toUpperCase()}`;

  return {
    key,
    userId: userId || undefined,
    gmfnId: gmfnId || undefined,
    name,
    reason: reason || undefined,
    recommendedPledge: recommendedPledge || undefined,
  };
}

function extractSuggestedSupporters(raw: any): SuggestedSupporter[] {
  const buckets = [
    raw?.items,
    raw?.suggestions,
    raw?.guarantors,
    raw?.candidates,
    raw?.recommended,
    raw?.data?.items,
    raw?.data?.suggestions,
  ];

  for (const bucket of buckets) {
    if (!Array.isArray(bucket)) continue;

    const rows = bucket
      .map((row: any) => normalizeSuggestedSupporter(row))
      .filter(Boolean) as SuggestedSupporter[];

    if (rows.length > 0) return rows;
  }

  return [];
}

function extractSuggestionMessage(raw: any): string {
  return firstTruthy(
    raw?.decision_message,
    raw?.message,
    raw?.summary?.message,
    raw?.summary?.note,
    raw?.borrower_message,
    raw?.liquidity_message,
    raw?.note,
    raw?.detail
  );
}

function extractGuaranteeTarget(
  suggestionRaw: any,
  loanSummary: LoanDraftSummary | null,
  fallbackAmount: string
): number {
  const candidates = [
    suggestionRaw?.guarantee_gap,
    suggestionRaw?.required_gap,
    suggestionRaw?.coverage_gap,
    suggestionRaw?.summary?.guarantee_gap,
    suggestionRaw?.summary?.required_gap,
    suggestionRaw?.loan?.guarantee_gap,
    loanSummary?.remaining_amount,
    loanSummary?.amount,
    fallbackAmount,
  ];

  for (const candidate of candidates) {
    const n = Number(candidate);
    if (Number.isFinite(n) && n > 0) return n;
  }

  return 0;
}

function computePerGuarantorPledge(total: number, count: number): string {
  if (!Number.isFinite(total) || total <= 0 || count <= 0) return "0";
  const value = total / count;
  return value.toFixed(2);
}

function getLoanAmountText(item: LoanSupportItem): string {
  const value = safeStr(item?.amount);
  const currency = safeStr(item?.currency);

  if (!value && !currency) return "Amount pending";
  if (value && currency) return `${value} ${currency}`;
  return value || currency || "Amount pending";
}

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function marketplaceSurface(bg: string): string {
  if (bg === "#FFFFFF") {
    return "linear-gradient(180deg, var(--gsn-white) 0%, var(--gsn-blue-50) 54%, var(--gsn-surface-blue) 100%)";
  }

  if (bg === "#FCFEFF") {
    return "linear-gradient(180deg, var(--gsn-off-white) 0%, var(--gsn-blue-50) 100%)";
  }

  if (bg === "#F8FBFF") {
    return "linear-gradient(180deg, var(--gsn-blue-50) 0%, var(--gsn-surface-blue) 100%)";
  }

  return bg;
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--gsn-border)",
    background: marketplaceSurface(bg),
    padding: 18,
    boxShadow: "var(--shadow-card)",
    backdropFilter: "blur(8px)",
    overflow: "hidden",
    overflowAnchor: "none",
  };
}

function marketplaceProfileBackground(): string {
  return "linear-gradient(180deg, var(--gsn-white) 0%, var(--gsn-blue-50) 54%, var(--gsn-surface-blue) 100%)";
}

function marketplaceProfileStatStyle(): React.CSSProperties {
  return {
    borderRadius: 15,
    border: "1px solid var(--gsn-border)",
    background:
      "linear-gradient(180deg, var(--gsn-white) 0%, var(--gsn-blue-50) 100%)",
    padding: 13,
    minHeight: 82,
    boxShadow: "var(--shadow-soft)",
  };
}

function marketplaceShellStyle(isCompact: boolean): React.CSSProperties {
  return {
    position: "relative",
    maxWidth: 1180,
    margin: "0 auto",
    padding: isCompact ? 11 : 20,
    paddingBottom: isCompact ? 26 : 40,
    display: "grid",
    gap: isCompact ? 13 : 17,
    borderRadius: isCompact ? "var(--radius-lg)" : "var(--radius-xl)",
    border: "1px solid var(--gsn-border-strong)",
    isolation: "isolate",
    background: "var(--page-bg)",
    boxShadow: "var(--shadow-card)",
    overflow: "hidden",
  };
}

function marketplaceAuraStyle(isCompact: boolean): React.CSSProperties {
  return {
    position: "absolute",
    inset: isCompact ? "-7% -38%" : "-10% -18%",
    zIndex: 0,
    pointerEvents: "none",
    opacity: 0,
    background: "none",
    transform: "none",
    animation: "none",
    willChange: "auto",
  };
}

function marketplaceWatermarkStyle(isCompact: boolean): React.CSSProperties {
  return {
    position: "absolute",
    right: isCompact ? -28 : 20,
    top: isCompact ? 70 : 88,
    zIndex: 0,
    opacity: isCompact ? 0.045 : 0.065,
    pointerEvents: "none",
    filter: "drop-shadow(0 18px 30px rgba(16,36,58,0.14))",
  };
}

function marketplaceContentStyle(isCompact: boolean): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gap: isCompact ? 10 : 18,
  };
}

function MarketplaceShellLayers({ isCompact }: { isCompact: boolean }) {
  return (
    <>
      <style>
        {`
          @keyframes marketplaceAuraShift {
            0% {
              transform: translate3d(-1.2%, -0.6%, 0) scale(1);
              opacity: 0.62;
            }
            50% {
              transform: translate3d(1%, 1%, 0) scale(1.025);
              opacity: 0.76;
            }
            100% {
              transform: translate3d(1.8%, -0.4%, 0) scale(1.015);
              opacity: 0.68;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .marketplace-aura-shift {
              animation: none !important;
              transform: none !important;
            }
          }
        `}
      </style>
      <div
        aria-hidden="true"
        className="marketplace-aura-shift"
        style={marketplaceAuraStyle(isCompact)}
      />
      <div style={marketplaceWatermarkStyle(isCompact)} aria-hidden="true">
        <GSNBrandMark
          width={isCompact ? 180 : 260}
          height={isCompact ? 218 : 315}
        />
      </div>
    </>
  );
}

function MarketplaceShell({
  children,
  isCompact,
}: {
  children: React.ReactNode;
  isCompact: boolean;
}) {
  return (
    <main className="gsn-page theme-marketplace">
      <div style={marketplaceShellStyle(isCompact)}>
        <MarketplaceShellLayers isCompact={isCompact} />
        <div style={marketplaceContentStyle(isCompact)}>{children}</div>
      </div>
    </main>
  );
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 17,
    border: "1px solid var(--gsn-border)",
    background: marketplaceSurface(bg),
    padding: 15,
    boxShadow: "var(--shadow-soft)",
    backdropFilter: "blur(6px)",
    overflowAnchor: "none",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 15,
    border: "1px solid var(--gsn-border)",
    background: marketplaceSurface(bg),
    padding: 13,
    boxShadow: "var(--shadow-soft)",
    backdropFilter: "blur(5px)",
    overflowAnchor: "none",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#173750",
    fontWeight: 900,
    letterSpacing: 0.34,
    textTransform: "uppercase",
  };
}

function badgeStyle(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 28,
    borderRadius: 999,
    padding: "6px 10px",
    border: primary
      ? "1px solid rgba(34,82,120,0.10)"
      : "1px solid rgba(16,37,59,0.08)",
    background: primary
      ? "linear-gradient(180deg, rgba(224,236,248,0.96) 0%, rgba(208,224,239,0.92) 100%)"
      : "linear-gradient(180deg, rgba(236,243,250,0.94) 0%, rgba(222,233,244,0.9) 100%)",
    color: primary ? "#1E4868" : "#42596F",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.72), 0 6px 14px rgba(10,24,49,0.05)",
  };
}

// alias kept to match existing component usage
function badge(primary = false): React.CSSProperties {
  return badgeStyle(primary);
}

function compactStatusPillStyle(primary = false): React.CSSProperties {
  return {
    ...badgeStyle(primary),
    maxWidth: "100%",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  };
}

function stableStatusPillStyle(primary = false): React.CSSProperties {
  return {
    ...badgeStyle(primary),
    height: 34,
    minHeight: 34,
    maxHeight: 34,
    maxWidth: "100%",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  };
}

function publicShopActionUnavailableMessage(
  isPreparing: boolean,
  fallbackText: string
) {
  return isPreparing
    ? "Public shop link is already refreshing."
    : fallbackText;
}

function marketplaceActionStyle(
  kind: "primary" | "secondary" | "soft" = "secondary",
  disabled = false
): React.CSSProperties {
  if (kind === "primary") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      height: 56,
      minHeight: 56,
      maxHeight: 56,
      padding: "0 15px",
      borderRadius: 14,
      border: disabled
        ? "1px solid rgba(66,87,106,0.42)"
        : "1px solid rgba(255,255,255,0.18)",
      background: disabled
        ? "linear-gradient(180deg, #DDE8F1 0%, #C5D6E4 58%, #AFC3D3 100%)"
        : "linear-gradient(180deg, var(--primary-accent) 0%, #0b5f43 100%)",
      color: disabled ? "#34495F" : "var(--gsn-text-inverse)",
      fontWeight: 900,
      fontSize: 13,
      lineHeight: 1.15,
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "nowrap",
      overflowWrap: "normal",
      wordBreak: "normal",
      hyphens: "none",
      textOverflow: "ellipsis",
      opacity: 1,
      boxShadow:
        disabled
          ? "0 10px 18px rgba(8,35,58,0.12), inset 0 1px 0 rgba(255,255,255,0.70), inset 0 -2px 0 rgba(8,35,58,0.14)"
          : "0 14px 24px rgba(22,130,84,0.22), inset 0 1px 0 rgba(255,255,255,0.20), inset 0 -2px 0 rgba(3,16,31,0.16)",
      touchAction: "manipulation",
      WebkitTapHighlightColor: "transparent",
      userSelect: "none",
      WebkitUserSelect: "none",
      boxSizing: "border-box",
      appearance: "none",
      WebkitAppearance: "none",
      pointerEvents: "auto",
      overflow: "hidden",
      transform: "none",
      translate: "none",
      scale: "none",
      flexShrink: 0,
      overflowAnchor: "none",
      transition: "none",
    };
  }

  if (kind === "soft") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      height: 56,
      minHeight: 56,
      maxHeight: 56,
      padding: "0 14px",
      borderRadius: 13,
      border: disabled
        ? "1px solid rgba(66,87,106,0.40)"
        : "1px solid rgba(8,35,58,0.34)",
      background:
        disabled
          ? "linear-gradient(180deg, #E0EAF2 0%, #CBDCE8 52%, #B5C9DA 100%)"
          : "linear-gradient(180deg, #EFF6FB 0%, #D8E8F5 46%, #BFD7EA 100%)",
      color: disabled ? "#34495F" : "#08233A",
      fontWeight: 900,
      fontSize: 12,
      lineHeight: 1.15,
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "nowrap",
      overflowWrap: "normal",
      wordBreak: "normal",
      hyphens: "none",
      textOverflow: "ellipsis",
      opacity: 1,
      boxShadow:
        disabled
          ? "0 9px 16px rgba(8,35,58,0.10), inset 0 1px 0 rgba(255,255,255,0.76), inset 0 -2px 0 rgba(8,35,58,0.12)"
          : "0 10px 18px rgba(8,35,58,0.10), inset 0 1px 0 rgba(255,255,255,0.84), inset 0 -2px 0 rgba(8,35,58,0.12)",
      touchAction: "manipulation",
      WebkitTapHighlightColor: "transparent",
      userSelect: "none",
      WebkitUserSelect: "none",
      boxSizing: "border-box",
      appearance: "none",
      WebkitAppearance: "none",
      pointerEvents: "auto",
      overflow: "hidden",
      transform: "none",
      translate: "none",
      scale: "none",
      flexShrink: 0,
      overflowAnchor: "none",
      transition: "none",
    };
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    minHeight: 56,
    maxHeight: 56,
    padding: "0 15px",
    borderRadius: 14,
    border: disabled
      ? "1px solid rgba(66,87,106,0.42)"
      : "1px solid rgba(6,24,39,0.42)",
    background:
      disabled
        ? "linear-gradient(180deg, #DDE8F1 0%, #C5D6E4 58%, #AFC3D3 100%)"
        : "linear-gradient(180deg, #0B2D4A 0%, #08233A 62%, #061827 100%)",
    color: disabled ? "#34495F" : "#FFFFFF",
    fontWeight: 900,
    fontSize: 13,
    lineHeight: 1.15,
    textAlign: "center",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
    textOverflow: "ellipsis",
    opacity: 1,
    boxShadow:
      disabled
        ? "0 10px 18px rgba(8,35,58,0.12), inset 0 1px 0 rgba(255,255,255,0.70), inset 0 -2px 0 rgba(8,35,58,0.14)"
        : "0 13px 22px rgba(6,24,39,0.22), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -2px 0 rgba(0,0,0,0.18)",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    WebkitUserSelect: "none",
    boxSizing: "border-box",
    appearance: "none",
    WebkitAppearance: "none",
    pointerEvents: "auto",
    overflow: "hidden",
    transform: "none",
    translate: "none",
    scale: "none",
    flexShrink: 0,
    overflowAnchor: "none",
    transition: "none",
  };
}

function maskedLinkCode(url: string): string {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const tail = pathParts[pathParts.length - 1] || "";
    if (!tail) return "";
    if (tail.length <= 12) return tail;
    return `${tail.slice(0, 6)}...${tail.slice(-4)}`;
  } catch {
    if (url.length <= 16) return url;
    return `${url.slice(0, 8)}...${url.slice(-4)}`;
  }
}

function buildMaskedLinkLabel(
  url: string,
  kind: "join" | "marketplace" | "shop",
  subject: string
): string {
  if (!url) return "";

  const code = maskedLinkCode(url);
  const cleanedSubject = safeStr(subject) || "GSN";

  if (kind === "join") {
    return `Secure GSN join link for ${cleanedSubject}${code ? ` • code ${code}` : ""}`;
  }

  if (String(kind) === "marketplace") {
    return `Community verification record for ${cleanedSubject}${code ? ` - ref ${code}` : ""}`;
  }

  if (kind === "marketplace") {
    return `Public marketplace face for ${cleanedSubject}${code ? ` • ref ${code}` : ""}`;
  }

  return `Public shop face${code ? ` • ref ${code}` : ""}`;
}

function cleanMaskedLinkLabel(label: string): string {
  return label.replace(/\s+[^ -~]+\s+/g, " - ");
}

function shareMessageCardStyle(isCompact = false): React.CSSProperties {
  return {
    marginTop: 10,
    borderRadius: 14,
    border: "1px solid rgba(16,37,59,0.14)",
    background:
      "linear-gradient(180deg, rgba(248,251,255,0.99) 0%, rgba(232,241,249,0.95) 100%)",
    boxShadow:
      "0 12px 20px rgba(10,24,49,0.07), inset 0 1px 0 rgba(255,255,255,0.9)",
    padding: "10px 12px",
    minHeight: isCompact ? 146 : 132,
    maxHeight: isCompact ? 146 : 164,
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    overflowAnchor: "none",
  };
}

function joinShareMessageCardStyle(isCompact: boolean): React.CSSProperties {
  return {
    ...shareMessageCardStyle(isCompact),
    height: isCompact ? 92 : 132,
    minHeight: isCompact ? 92 : 132,
    maxHeight: isCompact ? 92 : 132,
    overscrollBehavior: "contain",
    scrollbarWidth: "thin",
  };
}

function marketplaceLinkSummaryStyle(isCompact: boolean): React.CSSProperties {
  return {
    marginTop: isCompact ? 8 : 10,
    minHeight: isCompact ? 36 : 48,
    borderRadius: isCompact ? 14 : 16,
    border: "1px solid rgba(11,45,74,0.10)",
    background:
      "linear-gradient(180deg, rgba(246,250,255,0.98) 0%, rgba(233,242,250,0.94) 100%)",
    color: "#334B61",
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: isCompact ? "7px 10px" : "9px 12px",
    fontSize: isCompact ? 12 : 13,
    fontWeight: 820,
    lineHeight: 1.18,
    overflow: "hidden",
    overflowWrap: "break-word",
    wordBreak: "normal",
  };
}

function marketplaceLinkHeroStyle(isCompact: boolean): React.CSSProperties {
  return {
    marginTop: isCompact ? 8 : 14,
    borderRadius: isCompact ? 16 : 26,
    border: "1px solid rgba(16,37,59,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(247,250,255,0.98) 100%)",
    boxShadow:
      "0 18px 34px rgba(10,24,49,0.09), inset 0 1px 0 rgba(255,255,255,0.9)",
    overflow: "hidden",
    display: "grid",
    gridTemplateColumns: isCompact ? "58px minmax(0, 1fr)" : "128px minmax(0, 1fr)",
    minHeight: isCompact ? 82 : 126,
  };
}

function marketplaceLinkHeroIconStyle(isCompact: boolean): React.CSSProperties {
  return {
    minHeight: "100%",
    display: "grid",
    placeItems: "center",
    color: "#F2C766",
    background:
      "linear-gradient(145deg, #123F6B 0%, #08233A 60%, #061827 100%)",
    boxShadow: "inset -1px 0 0 rgba(255,255,255,0.16)",
    fontSize: isCompact ? 36 : 46,
  };
}

function marketplaceLinkHeroBodyStyle(isCompact: boolean): React.CSSProperties {
  return {
    minWidth: 0,
    padding: isCompact ? "9px 10px" : "18px 22px",
    display: "grid",
    gap: isCompact ? 7 : 10,
    alignContent: "center",
  };
}

function marketplaceLinkHeroTitleStyle(isCompact: boolean): React.CSSProperties {
  return {
    color: "#07172C",
    fontSize: isCompact ? 20 : 32,
    lineHeight: 1.05,
    fontWeight: 950,
    letterSpacing: 0,
    overflowWrap: "break-word",
  };
}

function marketplaceLinkHeroSubtitleStyle(isCompact: boolean): React.CSSProperties {
  return {
    color: "#4A6178",
    fontSize: isCompact ? 12.5 : 17,
    lineHeight: 1.2,
    fontWeight: 760,
  };
}

function marketplaceLinkHeroPillRowStyle(): React.CSSProperties {
  return {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  };
}

function marketplaceLinkHeroPillStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 28,
    borderRadius: 12,
    padding: "0 9px",
    border: "1px solid rgba(11,45,74,0.11)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(236,244,255,0.96) 100%)",
    color: "#173750",
    fontSize: 11.5,
    fontWeight: 900,
    whiteSpace: "nowrap",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.88)",
  };
}

function marketplaceLinkRowStyle(isCompact: boolean, expanded = false): React.CSSProperties {
  return {
    borderRadius: isCompact ? 20 : 22,
    border: expanded
      ? "1.5px solid rgba(27,102,210,0.45)"
      : "1px solid rgba(16,37,59,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,251,255,0.98) 100%)",
    boxShadow:
      expanded
        ? "0 16px 32px rgba(27,102,210,0.10), inset 0 1px 0 rgba(255,255,255,0.9)"
        : "0 12px 24px rgba(10,24,49,0.065), inset 0 1px 0 rgba(255,255,255,0.9)",
    padding: isCompact ? 9 : 14,
    display: "grid",
    gap: isCompact ? 8 : expanded ? 12 : 10,
    overflow: "hidden",
    overflowAnchor: "none",
    transition: "none",
  };
}

function marketplaceLinkRowHeaderStyle(isCompact: boolean): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: isCompact
      ? "44px minmax(0, 1fr)"
      : "58px minmax(0, 1fr) auto",
    gridTemplateRows: isCompact ? "auto auto" : undefined,
    gap: isCompact ? 8 : 14,
    alignItems: "center",
    minWidth: 0,
  };
}

function marketplaceLinkRowIconStyle(
  tone: "blue" | "gold" | "green" | "purple" | "navy",
  isCompact: boolean
): React.CSSProperties {
  const backgrounds = {
    blue: "linear-gradient(180deg, #1D74D8 0%, #074E93 100%)",
    gold: "linear-gradient(180deg, #D9A51F 0%, #8C6509 100%)",
    green: "linear-gradient(180deg, #35A971 0%, #08704A 100%)",
    purple: "linear-gradient(180deg, #6A44D8 0%, #23106B 100%)",
    navy: "linear-gradient(180deg, #244969 0%, #061827 100%)",
  };

  return {
    width: isCompact ? 44 : 58,
    height: isCompact ? 44 : 58,
    borderRadius: isCompact ? 13 : 16,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#FFFFFF",
    background: backgrounds[tone],
    boxShadow:
      "0 12px 22px rgba(10,24,49,0.14), inset 0 1px 0 rgba(255,255,255,0.22)",
    flexShrink: 0,
  };
}

function marketplaceLinkRowTitleStyle(isCompact: boolean): React.CSSProperties {
  return {
    minWidth: 0,
    color: "#07172C",
    fontSize: isCompact ? 17 : 23,
    lineHeight: 1.08,
    fontWeight: 950,
    overflowWrap: "break-word",
    wordBreak: "normal",
    hyphens: "none",
  };
}

function marketplaceLinkRowSubStyle(isCompact: boolean): React.CSSProperties {
  return {
    marginTop: 3,
    color: "#516579",
    fontSize: isCompact ? 12 : 15,
    lineHeight: 1.18,
    fontWeight: 760,
    overflowWrap: "break-word",
    wordBreak: "normal",
    hyphens: "none",
  };
}

function marketplaceLinkRowStatusStyle(
  tone: "ready" | "warn" | "idle" = "ready",
  isCompact = false
): React.CSSProperties {
  const colors = {
    ready: {
      color: "#12633F",
      bg: "linear-gradient(180deg, #EEFBF4 0%, #D9F0E3 100%)",
      border: "1px solid rgba(46,155,98,0.18)",
    },
    warn: {
      color: "#8A5A05",
      bg: "linear-gradient(180deg, #FFF9E8 0%, #F6E6C3 100%)",
      border: "1px solid rgba(214,170,69,0.28)",
    },
    idle: {
      color: "#45586C",
      bg: "linear-gradient(180deg, #F5F8FC 0%, #E9EEF6 100%)",
      border: "1px solid rgba(16,37,59,0.08)",
    },
  };

  return {
    ...stableStatusPillStyle(tone === "ready"),
    height: isCompact ? 28 : 30,
    minHeight: isCompact ? 28 : 30,
    maxHeight: isCompact ? 28 : 30,
    padding: "0 9px",
    color: colors[tone].color,
    background: colors[tone].bg,
    border: colors[tone].border,
    justifyContent: "center",
    gridColumn: isCompact ? "2 / 3" : undefined,
    justifySelf: isCompact ? "start" : undefined,
    maxWidth: isCompact ? "100%" : undefined,
    whiteSpace: "nowrap",
  };
}

function marketplaceLinkMiniIconStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
    flexShrink: 0,
  };
}

function buildGsnShareMessage(
  kind: "join",
  opts: {
    memberName: string;
    communityName: string;
    marketplaceName?: string;
    recipientName?: string;
    personalNote?: string;
    url: string;
  }
): string {
  const sender = safeStr(opts.memberName) || "a known GSN member";
  const community = safeStr(opts.communityName) || "this community";
  const marketplace = safeStr(opts.marketplaceName);
  const recipient = safeStr(opts.recipientName);
  const personalNote = safeStr(opts.personalNote);
  const url = safeStr(opts.url);

  return [
    recipient ? `Hello ${recipient},` : "Hello,",
    "",
    `${sender} from ${marketplace || community} is inviting you to begin the GSN join request for ${community}.`,
    "This link lets you send your request back to the community for review. It is not automatic entry.",
    personalNote ? `Personal note: ${personalNote}` : "",
    "",
    "GSN helps existing trust become visible, recordable, and useful.",
    "Open secure join link:",
    url,
    "",
    "Sent through GSN",
  ].filter(Boolean).join("\n");
}

function buildGsnSharePreview(
  kind: "join",
  opts: {
    memberName: string;
    communityName: string;
    marketplaceName?: string;
    recipientName?: string;
    personalNote?: string;
    maskedLabel: string;
  }
): string {
  const sender = safeStr(opts.memberName) || "a known GSN member";
  const community = safeStr(opts.communityName) || "this community";
  const marketplace = safeStr(opts.marketplaceName);
  const recipient = safeStr(opts.recipientName);
  const personalNote = safeStr(opts.personalNote);
  const maskedLabel = safeStr(opts.maskedLabel) || "Secure GSN join link";

  return [
    recipient ? `Hello ${recipient},` : "Hello,",
    "",
    `${sender} from ${marketplace || community} is inviting you to begin the GSN join request for ${community}.`,
    "This link lets you send your request back to the community for review. It is not automatic entry.",
    personalNote ? `Personal note: ${personalNote}` : "",
    "",
    "GSN helps existing trust become visible, recordable, and useful.",
    maskedLabel,
    "",
    "Sent through GSN",
  ].join("\n");
}

function buildGsnEmailSubject(
  kind: "join" | "marketplace" | "shop",
  communityName: string
): string {
  const cleanedCommunity = safeStr(communityName) || "this GSN community";

  if (kind === "join") {
    return `GSN community join link for ${cleanedCommunity}`;
  }

  if (String(kind) === "marketplace") {
    return `GSN community verification link for ${cleanedCommunity}`;
  }

  if (kind === "marketplace") {
    return `GSN marketplace link for ${cleanedCommunity}`;
  }

  return "GSN public shop link";
}

function marketplaceInlineActionsStyle(
  isCompact: boolean
): React.CSSProperties {
  return {
    marginTop: isCompact ? 8 : 12,
    display: "grid",
    gridTemplateColumns: isCompact
      ? "repeat(2, minmax(0, 1fr))"
      : "repeat(auto-fit, minmax(168px, 1fr))",
    gridAutoRows: "58px",
    gap: 8,
    alignItems: "stretch",
    alignContent: "start",
    overflowAnchor: "none",
    transition: "none",
  };
}

function marketplaceInlineActionStyle(
  kind: "primary" | "secondary" | "soft",
  disabled: boolean,
  _isCompact: boolean
): React.CSSProperties {
  return {
    ...marketplaceActionStyle(kind, disabled),
    width: "100%",
    height: 58,
    minHeight: 58,
    maxHeight: 58,
    padding: _isCompact ? "0 8px" : "0 11px",
    pointerEvents: "auto",
    touchAction: "manipulation",
    overflowAnchor: "none",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    transition: "none",
    fontSize: _isCompact ? 13 : undefined,
  };
}

function marketplaceMoneyPanelStyle(isCompact: boolean): React.CSSProperties {
  return {
    marginTop: isCompact ? 12 : 16,
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: isCompact ? 8 : 12,
    overflowAnchor: "none",
    transition: "none",
  };
}

function marketplaceMoneyRouteCardStyle(isCompact: boolean): React.CSSProperties {
  return {
    minHeight: isCompact ? 92 : 150,
    borderRadius: isCompact ? 16 : 24,
    border: "1px solid rgba(16,37,59,0.08)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,252,255,0.98) 100%)",
    boxShadow:
      "0 16px 30px rgba(10,24,49,0.075), inset 0 1px 0 rgba(255,255,255,0.92)",
    padding: isCompact ? "10px" : "22px 24px",
    display: "grid",
    gridTemplateColumns: isCompact
      ? "50px minmax(0, 1fr) auto"
      : "92px minmax(0, 1fr) auto",
    gridTemplateAreas: isCompact
      ? '"icon text status"'
      : '"icon text status"',
    gap: isCompact ? "9px" : "14px 24px",
    alignItems: "center",
    overflow: "hidden",
    overflowAnchor: "none",
    transform: "none",
    transition: "none",
  };
}

function marketplaceMoneyIconBubbleStyle(
  isCompact: boolean,
  tone: "blue" | "gold" | "soft"
): React.CSSProperties {
  const color =
    tone === "gold" ? "#D6AA45" : tone === "blue" ? "#1B66D2" : "#244969";

  return {
    gridArea: "icon",
    width: isCompact ? 38 : 80,
    height: isCompact ? 38 : 80,
    borderRadius: isCompact ? 13 : 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(236,244,255,0.98) 58%, rgba(224,235,248,0.98) 100%)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.92), 0 10px 20px rgba(10,24,49,0.08)",
    flexShrink: 0,
  };
}

function marketplaceMoneyTextStackStyle(): React.CSSProperties {
  return {
    gridArea: "text",
    minWidth: 0,
    display: "grid",
    gap: 5,
    alignContent: "center",
  };
}

function marketplaceMoneyTitleStyle(isCompact: boolean): React.CSSProperties {
  return {
    color: "#08233A",
    fontSize: isCompact ? 13 : 20,
    fontWeight: 950,
    lineHeight: 1.14,
    overflowWrap: "break-word",
    wordBreak: "normal",
  };
}

function marketplaceMoneyValueStyle(isCompact: boolean): React.CSSProperties {
  return {
    color: "#061827",
    fontSize: isCompact ? 17 : 42,
    fontWeight: 950,
    lineHeight: isCompact ? 1.04 : 1,
    letterSpacing: 0,
    overflowWrap: "break-word",
    wordBreak: "normal",
  };
}

function marketplaceMoneyRouteValueStyle(
  isCompact: boolean,
  ready: boolean
): React.CSSProperties {
  return {
    ...marketplaceMoneyValueStyle(isCompact),
    fontSize: ready ? (isCompact ? 14 : 30) : isCompact ? 17 : 42,
    lineHeight: ready ? 1.08 : 1,
    display: "-webkit-box",
    WebkitLineClamp: ready ? 2 : 1,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };
}

function marketplaceMoneyHelperStyle(isCompact: boolean): React.CSSProperties {
  return {
    color: "#41556B",
    fontSize: isCompact ? 11.5 : 17,
    fontWeight: 750,
    lineHeight: 1.24,
    overflowWrap: "break-word",
    wordBreak: "normal",
  };
}

function marketplaceMoneyStatusAreaStyle(): React.CSSProperties {
  return {
    gridArea: "status",
    justifySelf: "end",
    alignSelf: "start",
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  };
}

function marketplaceMoneyStatusPillStyle(ready = false): React.CSSProperties {
  return {
    ...stableStatusPillStyle(ready),
    height: 28,
    minHeight: 28,
    maxHeight: 28,
    minWidth: 0,
    padding: "0 8px",
    justifyContent: "center",
    color: ready ? "#1D6D46" : "#3D4F61",
    background: ready
      ? "linear-gradient(180deg, #EFFBF4 0%, #DCEFE5 100%)"
      : "linear-gradient(180deg, #F5F8FC 0%, #E9EEF6 100%)",
    border: ready
      ? "1px solid rgba(46,155,98,0.18)"
      : "1px solid rgba(16,37,59,0.06)",
  };
}

function marketplaceMoneyChartBubbleStyle(isCompact: boolean): React.CSSProperties {
  return {
    width: isCompact ? 38 : 68,
    height: isCompact ? 38 : 68,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#2C68D8",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(235,243,255,0.96) 60%, rgba(222,234,250,0.96) 100%)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.9), 0 10px 20px rgba(10,24,49,0.08)",
    flexShrink: 0,
  };
}

function intentGuideCardStyle(): React.CSSProperties {
  return {
    marginTop: 14,
    borderRadius: 20,
    border: "1px solid rgba(16,37,59,0.10)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #F4F8FB 100%)",
    padding: 14,
    boxShadow:
      "0 12px 22px rgba(10,24,49,0.055), inset 0 1px 0 rgba(255,255,255,0.76)",
  };
}

function intentChoiceStyle(
  tone: MarketplaceIntentItem["tone"]
): React.CSSProperties {
  return {
    ...marketplaceActionStyle(tone),
    height: 82,
    minHeight: 82,
    maxHeight: 82,
    alignItems: "flex-start",
    flexDirection: "column",
    justifyContent: "center",
    gap: 4,
    padding: "10px 12px",
    textAlign: "left",
    overflow: "hidden",
    overflowAnchor: "none",
    transition: "none",
  };
}

function marketplaceOsSectionStyle(isCompact: boolean): React.CSSProperties {
  return {
    ...pageCard("#FFFFFF"),
    order: 2,
    padding: isCompact ? 14 : 18,
  };
}

function marketplaceOsHeaderStyle(isCompact: boolean): React.CSSProperties {
  return {
    borderRadius: isCompact ? 22 : 26,
    border: "1px solid rgba(16,37,59,0.08)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,251,255,0.98) 100%)",
    padding: isCompact ? 14 : 18,
    color: "var(--gsn-text-main)",
    boxShadow: "0 18px 34px rgba(10,24,49,0.08)",
    overflow: "hidden",
  };
}

function marketplaceOsIconStyle(bg: string, isCompact = false): React.CSSProperties {
  return {
    gridArea: "icon",
    width: isCompact ? 46 : 62,
    height: isCompact ? 46 : 62,
    borderRadius: isCompact ? 15 : 19,
    margin: isCompact ? 0 : "0 auto",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: bg,
    color: "#FFFFFF",
    fontSize: isCompact ? 26 : 30,
    boxShadow:
      "0 14px 26px rgba(10,24,49,0.16), inset 0 1px 0 rgba(255,255,255,0.22)",
  };
}

function marketplaceOsRowStyle(isCompact: boolean): React.CSSProperties {
  return {
    width: "100%",
    height: isCompact ? 116 : 96,
    minHeight: isCompact ? 116 : 96,
    maxHeight: isCompact ? 116 : 96,
    borderRadius: isCompact ? 18 : 16,
    border: "1px solid var(--gsn-border)",
    background:
      "linear-gradient(180deg, var(--gsn-white) 0%, var(--gsn-blue-50) 100%)",
    padding: isCompact ? 12 : 13,
    display: "grid",
    gridTemplateColumns: isCompact
      ? "42px minmax(0, 1fr) 18px"
      : "46px minmax(0, 1fr) 20px",
    gap: isCompact ? 10 : 12,
    alignItems: "center",
    color: "var(--gsn-text-main)",
    textAlign: "left",
    boxShadow: "var(--shadow-soft)",
    cursor: "pointer",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    appearance: "none",
    WebkitAppearance: "none",
    boxSizing: "border-box",
    overflow: "hidden",
    overflowAnchor: "none",
    transform: "none",
    flexShrink: 0,
    transition: "none",
  };
}

function marketplaceFrontLaneCardStyle(isCompact: boolean): React.CSSProperties {
  return {
    ...marketplaceOsRowStyle(isCompact),
    minHeight: isCompact ? 126 : 116,
    height: "auto",
    maxHeight: "none",
    borderRadius: isCompact ? 20 : 22,
    gridTemplateColumns: isCompact
      ? "58px minmax(0, 1fr) 18px"
      : "64px minmax(0, 1fr) 20px",
    padding: isCompact ? 14 : 16,
    gap: isCompact ? 12 : 16,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.995) 0%, rgba(250,253,255,0.98) 100%)",
  };
}

function marketplaceFrontLaneIconStyle(
  bg: string,
  isCompact = false
): React.CSSProperties {
  return {
    ...marketplaceOsRowIconStyle(bg, isCompact),
    width: isCompact ? 58 : 64,
    height: isCompact ? 58 : 64,
    borderRadius: isCompact ? 18 : 20,
  };
}

function marketplaceFrontTagRowStyle(): React.CSSProperties {
  return {
    display: "flex",
    gap: 7,
    flexWrap: "wrap",
    alignItems: "center",
    minWidth: 0,
  };
}

function marketplaceFrontTagStyle(
  color: string,
  background: string
): React.CSSProperties {
  return {
    borderRadius: 999,
    background,
    color,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 950,
    lineHeight: 1.15,
    whiteSpace: "nowrap",
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
}

function marketplaceOsRowIconStyle(bg: string, isCompact = false): React.CSSProperties {
  return {
    width: isCompact ? 42 : 46,
    height: isCompact ? 42 : 46,
    borderRadius: isCompact ? 14 : 15,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: bg,
    color: "#FFFFFF",
    fontSize: isCompact ? 20 : 22,
    boxShadow:
      "0 12px 22px rgba(10,24,49,0.14), inset 0 1px 0 rgba(255,255,255,0.2)",
  };
}

function marketplaceOsRowTextStackStyle(): React.CSSProperties {
  return {
    minWidth: 0,
    maxWidth: "100%",
    display: "grid",
    gap: 4,
    alignContent: "center",
    overflow: "hidden",
  };
}

function marketplaceOsRowTitleStyle(isCompact: boolean): React.CSSProperties {
  return {
    minWidth: 0,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    color: "var(--gsn-text-main)",
    fontSize: isCompact ? 16 : 18,
    fontWeight: 950,
    lineHeight: 1.12,
    overflowWrap: "break-word",
    wordBreak: "normal",
    hyphens: "none",
  };
}

function marketplaceOsRowDetailStyle(isCompact: boolean): React.CSSProperties {
  return {
    minWidth: 0,
    display: "-webkit-box",
    WebkitLineClamp: isCompact ? 3 : 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    color: "#4A6178",
    fontSize: isCompact ? 12 : 13,
    fontWeight: 750,
    lineHeight: 1.25,
    overflowWrap: "break-word",
    wordBreak: "normal",
    hyphens: "none",
  };
}

function marketplaceOsArrowStyle(): React.CSSProperties {
  return {
    color: "#173750",
    width: 18,
    minWidth: 18,
    height: 18,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

type MarketplaceGlyphName =
  | "bank"
  | "card"
  | "cash"
  | "chart"
  | "chevron"
  | "chevronUp"
  | "control"
  | "copy"
  | "cycle"
  | "demand"
  | "email"
  | "eye"
  | "heart"
  | "join"
  | "ledger"
  | "links"
  | "members"
  | "open"
  | "payment"
  | "pool"
  | "refresh"
  | "repost"
  | "rosca"
  | "shop"
  | "spark"
  | "support"
  | "target"
  | "trade"
  | "trust"
  | "verify"
  | "whatsapp";

function MarketplaceGlyph({
  name,
  size = 24,
}: {
  name: MarketplaceGlyphName;
  size?: number;
}) {
  let glyph: React.ReactNode;

  switch (name) {
    case "bank":
      glyph = (
        <>
          <path d="M4 10h16" />
          <path d="M5 10l7-5 7 5" />
          <path d="M7 10v7" />
          <path d="M12 10v7" />
          <path d="M17 10v7" />
          <path d="M5 19h14" />
        </>
      );
      break;
    case "card":
      glyph = (
        <>
          <rect x="3.5" y="6" width="17" height="12" rx="2.5" />
          <path d="M3.5 10h17" />
          <path d="M7 14h4" />
        </>
      );
      break;
    case "pool":
      glyph = (
        <>
          <rect x="4" y="5" width="16" height="14" rx="2.8" />
          <path d="M4 9h16" />
          <circle cx="8" cy="14" r="1.7" />
          <path d="M12 13h4.5" />
          <path d="M12 16h3.2" />
          <path d="M7 3.8h10" />
        </>
      );
      break;
    case "cash":
      glyph = (
        <>
          <rect x="3.5" y="7" width="17" height="10" rx="2.5" />
          <circle cx="12" cy="12" r="2.25" />
          <path d="M6.5 10v4" />
          <path d="M17.5 10v4" />
        </>
      );
      break;
    case "chart":
      glyph = (
        <>
          <path d="M4 18h16" />
          <path d="M6 15l4-4 3 2.5 5-7" />
          <path d="M18 6.5h1.5V8" />
        </>
      );
      break;
    case "chevron":
      glyph = <path d="M9 5.5 15.5 12 9 18.5" />;
      break;
    case "chevronUp":
      glyph = <path d="M5.5 14.5 12 8l6.5 6.5" />;
      break;
    case "copy":
      glyph = (
        <>
          <rect x="8" y="7" width="10" height="13" rx="2" />
          <path d="M6 17H5.8A2.8 2.8 0 0 1 3 14.2V6.8A2.8 2.8 0 0 1 5.8 4H13a2.8 2.8 0 0 1 2.8 2.8V7" />
          <path d="M11 11h4" />
        </>
      );
      break;
    case "email":
      glyph = (
        <>
          <rect x="3.8" y="6" width="16.4" height="12" rx="2.5" />
          <path d="m5.5 8.5 6.5 4.8 6.5-4.8" />
        </>
      );
      break;
    case "open":
      glyph = (
        <>
          <path d="M13 5h6v6" />
          <path d="M19 5 11 13" />
          <path d="M10 7H6.5A2.5 2.5 0 0 0 4 9.5v8A2.5 2.5 0 0 0 6.5 20h8A2.5 2.5 0 0 0 17 17.5V14" />
        </>
      );
      break;
    case "refresh":
      glyph = (
        <>
          <path d="M6.5 8.2A6.8 6.8 0 0 1 18 9.5" />
          <path d="M18 5.8v3.7h-3.7" />
          <path d="M17.5 15.8A6.8 6.8 0 0 1 6 14.5" />
          <path d="M6 18.2v-3.7h3.7" />
        </>
      );
      break;
    case "join":
      glyph = (
        <>
          <circle cx="9" cy="9" r="3" />
          <path d="M4.5 18.2c.7-3 2.2-4.5 4.5-4.5s3.8 1.5 4.5 4.5" />
          <path d="M17.5 8v6" />
          <path d="M14.5 11h6" />
        </>
      );
      break;
    case "verify":
      glyph = (
        <>
          <path d="M12 3.8 18.5 6v5.3c0 4-2.5 7.1-6.5 8.9-4-1.8-6.5-4.9-6.5-8.9V6z" />
          <path d="M8.8 12.1 11 14.3l4.2-4.6" />
        </>
      );
      break;
    case "whatsapp":
      glyph = (
        <>
          <path d="M5.5 18.3 6.6 15.2A7 7 0 1 1 9 17.5z" />
          <path d="M9.2 8.8c.5 2.5 2 4.1 4.6 4.9" />
          <path d="M9.2 8.8c.5-.7 1-.8 1.4-.3l.6.8c.2.3.2.6-.1.9l-.4.4" />
          <path d="M13.8 13.7l.4-.4c.3-.3.6-.3.9-.1l.8.6c.5.4.4.9-.3 1.4" />
        </>
      );
      break;
    case "repost":
      glyph = (
        <>
          <path d="M4 13h3l8 4V7l-8 4H4z" />
          <path d="M7 13l1 5" />
          <path d="M18 9.5c.8.7 1.2 1.5 1.2 2.5s-.4 1.8-1.2 2.5" />
          <path d="M19.5 7.2c1.4 1.2 2 2.8 2 4.8s-.6 3.6-2 4.8" />
        </>
      );
      break;
    case "target":
      glyph = (
        <>
          <circle cx="12" cy="12" r="7.2" />
          <circle cx="12" cy="12" r="3.6" />
          <circle cx="12" cy="12" r="1" />
        </>
      );
      break;
    case "payment":
      glyph = (
        <>
          <rect x="4" y="5" width="5" height="5" rx="1" />
          <rect x="15" y="5" width="5" height="5" rx="1" />
          <rect x="4" y="15" width="5" height="5" rx="1" />
          <path d="M14 15h2.2" />
          <path d="M19.5 15H20v5h-5" />
          <path d="M14 18h2" />
          <path d="M17.5 18h2.5" />
        </>
      );
      break;
    case "control":
      glyph = (
        <>
          <circle cx="12" cy="12" r="2.7" />
          <path d="M12 4.5v2" />
          <path d="M12 17.5v2" />
          <path d="M4.5 12h2" />
          <path d="M17.5 12h2" />
          <path d="M6.7 6.7 8.1 8.1" />
          <path d="M15.9 15.9l1.4 1.4" />
          <path d="M17.3 6.7 15.9 8.1" />
          <path d="M8.1 15.9l-1.4 1.4" />
        </>
      );
      break;
    case "cycle":
      glyph = (
        <>
          <path d="M7.2 7.1A7 7 0 0 1 18.5 9" />
          <path d="M18.5 5.5V9h-3.5" />
          <path d="M16.8 16.9A7 7 0 0 1 5.5 15" />
          <path d="M5.5 18.5V15H9" />
          <circle cx="12" cy="12" r="2.4" />
        </>
      );
      break;
    case "rosca":
      glyph = (
        <>
          <circle cx="12" cy="12" r="7.2" />
          <path d="M7.2 8.8a6.4 6.4 0 0 1 5.4-2.1" />
          <path d="M12.6 4.7 15 7l-2.4 2.3" />
          <path d="M16.8 15.2a6.4 6.4 0 0 1-5.4 2.1" />
          <path d="M11.4 19.3 9 17l2.4-2.3" />
          <path d="M8.7 12h6.6" />
          <path d="M10.3 9.8h3.4a1.6 1.6 0 0 1 0 3.2h-2.6a1.6 1.6 0 0 0 0 3.2h3.6" />
        </>
      );
      break;
    case "demand":
      glyph = (
        <>
          <path d="M4 13h3l8 4V7l-8 4H4z" />
          <path d="M7 13l1 5" />
          <path d="M18 9.5c.8.7 1.2 1.5 1.2 2.5s-.4 1.8-1.2 2.5" />
        </>
      );
      break;
    case "eye":
      glyph = (
        <>
          <path d="M3.5 12s3.2-5.2 8.5-5.2 8.5 5.2 8.5 5.2-3.2 5.2-8.5 5.2S3.5 12 3.5 12z" />
          <circle cx="12" cy="12" r="2.8" />
          <circle cx="12.9" cy="11.1" r="0.7" />
        </>
      );
      break;
    case "heart":
      glyph = (
        <>
          <path d="M12 19s-7-4.3-7-9.1C5 7.4 6.8 6 8.8 6c1.2 0 2.4.6 3.2 1.6C12.8 6.6 14 6 15.2 6 17.2 6 19 7.4 19 9.9 19 14.7 12 19 12 19z" />
          <path d="M8 13h8" />
        </>
      );
      break;
    case "ledger":
      glyph = (
        <>
          <rect x="5" y="4" width="14" height="16" rx="2.5" />
          <path d="M8.5 8h7" />
          <path d="M8.5 12h7" />
          <path d="M8.5 16h4.5" />
        </>
      );
      break;
    case "links":
      glyph = (
        <>
          <path d="M8.5 12.5 6.8 14.2a3 3 0 0 0 4.2 4.2l2.1-2.1" />
          <path d="M15.5 11.5l1.7-1.7A3 3 0 0 0 13 5.6l-2.1 2.1" />
          <path d="M9.5 14.5 14.5 9.5" />
        </>
      );
      break;
    case "members":
      glyph = (
        <>
          <circle cx="9" cy="9" r="2.7" />
          <circle cx="16" cy="10" r="2.2" />
          <path d="M4.5 18c.7-2.6 2.2-4 4.5-4s3.8 1.4 4.5 4" />
          <path d="M13.5 17c.5-1.8 1.6-2.8 3.4-2.8 1.7 0 2.8 1 3.4 2.8" />
        </>
      );
      break;
    case "trade":
      glyph = (
        <>
          <path d="M5 10h14l-1.2-4.5H6.2z" />
          <path d="M6.5 10v8.5h11V10" />
          <path d="M9 18.5V14h4.4" />
          <path d="M5 10c.4 1.4 1.3 2.1 2.5 2.1S9.6 11.4 10 10c.4 1.4 1.3 2.1 2.5 2.1s2.1-.7 2.5-2.1c.4 1.4 1.2 2.1 2.5 2.1S19.6 11.4 20 10" />
          <path d="M13.8 16.1 15.4 17.7 18.5 14.5" />
        </>
      );
      break;
    case "shop":
      glyph = (
        <>
          <path d="M5 10h14l-1.2-4.5H6.2z" />
          <path d="M6.5 10v8.5h11V10" />
          <path d="M9 18.5V14h6v4.5" />
          <path d="M5 10c.4 1.4 1.3 2.1 2.5 2.1S9.6 11.4 10 10c.4 1.4 1.3 2.1 2.5 2.1s2.1-.7 2.5-2.1c.4 1.4 1.2 2.1 2.5 2.1S19.6 11.4 20 10" />
        </>
      );
      break;
    case "spark":
      glyph = (
        <>
          <path d="M12 3v4" />
          <path d="M12 17v4" />
          <path d="M3 12h4" />
          <path d="M17 12h4" />
          <path d="M7.5 7.5 9.8 9.8" />
          <path d="M14.2 14.2l2.3 2.3" />
          <path d="M16.5 7.5l-2.3 2.3" />
          <path d="M9.8 14.2l-2.3 2.3" />
        </>
      );
      break;
    case "support":
      glyph = (
        <>
          <path d="M5.5 13.5h3.3l2.3 2.2a2.2 2.2 0 0 0 2.9.1l4.5-3.4a1.7 1.7 0 0 0-2-2.7l-3 2.1" />
          <path d="M8.8 13.5l2.5-2.7a2.8 2.8 0 0 1 3.9-.2l.6.5" />
          <path d="M4 11.8v5.7h3.2" />
          <path d="M8.2 6.9c0-1.4 1-2.4 2.3-2.4.8 0 1.6.4 2 1.1.5-.7 1.2-1.1 2-1.1 1.3 0 2.3 1 2.3 2.4 0 2.5-4.3 4.8-4.3 4.8S8.2 9.4 8.2 6.9z" />
        </>
      );
      break;
    case "trust":
      glyph = (
        <>
          <path d="M12 3.8 18.5 6v5.3c0 4-2.5 7.1-6.5 8.9-4-1.8-6.5-4.9-6.5-8.9V6z" />
          <path d="M8.8 12.1 11 14.3l4.2-4.6" />
        </>
      );
      break;
    default:
      glyph = null;
  }

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.1}
      >
        {glyph}
      </g>
    </svg>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 44,
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    padding: "11px 12px",
    fontSize: 14,
    color: "#0B1F33",
    outline: "none",
    boxSizing: "border-box",
    pointerEvents: "auto",
    touchAction: "manipulation",
    position: "relative",
    zIndex: 2,
  };
}

function textAreaStyle(): React.CSSProperties {
  return {
    ...inputStyle(),
    minHeight: 96,
    resize: "vertical",
    lineHeight: 1.6,
  };
}

function noticeCard(tone: NoticeTone): React.CSSProperties {
  return {
    ...softCard(tone === "success" ? "#F3FBF5" : "#FEF2F2"),
    position: "fixed",
    left: "50%",
    bottom: 18,
    transform: "translateX(-50%)",
    width: "min(720px, calc(100vw - 32px))",
    zIndex: 80,
    pointerEvents: "none",
    color: tone === "success" ? "#166534" : "#991B1B",
    border:
      tone === "success"
        ? "1px solid rgba(34,197,94,0.16)"
        : "1px solid rgba(239,68,68,0.16)",
    fontWeight: 800,
    boxShadow:
      "0 18px 42px rgba(10,24,49,0.20), inset 0 1px 0 rgba(255,255,255,0.82)",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#4A6178",
    fontSize: 14,
    lineHeight: 1.55,
  };
}

function readLocalJSON<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalJSON(key: string, value: any) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function communitySectionsStorageKey(communityId: number): string {
  return `gmfn.marketplace.sections.v4.${communityId}`;
}

function withdrawalTaskStorageKey(clanId: number, gmfnId: string): string {
  return `${WITHDRAWAL_TASK_STORAGE_KEY_PREFIX}.${gmfnId || "me"}.${clanId || 0}`;
}

function settlementSummary(settlement: CommunityMoneySettlement | null): string {
  if (!settlement) return "Community account not ready";

  return firstTruthy(
    settlement.bankName,
    settlement.accountName,
    settlement.accountNumber,
    "Community account ready"
  );
}

function payoutSummary(surface: CommunityMoneySurface | null): string {
  return firstTruthy(
    surface?.payoutDestination?.destinationName,
    surface?.payoutDestination?.bankName,
    surface?.payoutDestination?.accountNumber,
    "Personal payout not ready"
  );
}

export default function MarketplacePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(
    null
  );

  const [me, setMe] = useState<any>(null);
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityRow | null>(
    null
  );
  const [members, setMembers] = useState<ClanMember[]>([]);
  const [shops, setShops] = useState<MarketplaceShop[]>([]);
  const [poolInfo, setPoolInfo] = useState<any>(null);
  const [marketplaceTrust, setMarketplaceTrust] = useState<any>(null);
  const [inviteLink, setInviteLink] = useState<string>("");
  const [joinRecipientName, setJoinRecipientName] = useState("");
  const [joinInviteNote, setJoinInviteNote] = useState("");
  const [creatingInviteLink, setCreatingInviteLink] = useState(false);
  const [publicShopRecord, setPublicShopRecord] =
    useState<MarketplaceShop | null>(null);
  const [preparingPublicShopLink, setPreparingPublicShopLink] = useState(false);
  const [repostProducts, setRepostProducts] = useState<RepostProductOption[]>([]);
  const [loadingRepostProducts, setLoadingRepostProducts] = useState(false);
  const [selectedRepostProductId, setSelectedRepostProductId] = useState(0);
  const [repostTargetMarketplaceId, setRepostTargetMarketplaceId] = useState("");
  const [repostDurationDays, setRepostDurationDays] = useState("1");
  const [placingMarketplaceRepost, setPlacingMarketplaceRepost] = useState(false);
  const [repostSpotlightStatus, setRepostSpotlightStatus] =
    useState<SpotlightStatusRecord | null>(null);
  const [repostExpectedPayments, setRepostExpectedPayments] = useState<
    ExpectedPaymentRecord[]
  >([]);
  const [createdRepostInstruction, setCreatedRepostInstruction] =
    useState<ExpectedPaymentRecord | null>(null);
  const [loadingRepostCredits, setLoadingRepostCredits] = useState(false);
  const [creatingRepostPaymentInstruction, setCreatingRepostPaymentInstruction] =
    useState(false);
  const [repostTargetSuggestions, setRepostTargetSuggestions] = useState<
    RepostTargetSuggestion[]
  >([]);
  const [loadingRepostTargetSuggestions, setLoadingRepostTargetSuggestions] =
    useState(false);
  const [repostTargetSuggestionError, setRepostTargetSuggestionError] =
    useState("");
  const [communityPackageItems, setCommunityPackageItems] = useState<
    CommunityPackageStatusItem[]
  >([]);
  const [roscaCycles, setRoscaCycles] = useState<RoscaCycleSummary[]>([]);
  const [roscaTitle, setRoscaTitle] = useState("Community ROSCA cycle");
  const [roscaContributionAmount, setRoscaContributionAmount] = useState("25.00");
  const [roscaCurrency, setRoscaCurrency] = useState("GBP");
  const [roscaIntervalDays, setRoscaIntervalDays] = useState("30");
  const [selectedRoscaMemberIds, setSelectedRoscaMemberIds] = useState<number[]>([]);
  const [creatingRoscaPackage, setCreatingRoscaPackage] = useState(false);
  const [startingRoscaCycle, setStartingRoscaCycle] = useState(false);
  const [recordingRoscaPayoutKey, setRecordingRoscaPayoutKey] =
    useState<string | null>(null);
  const selectedRepostProductIdRef = useRef<number | null>(null);
  const routeRepostSelectionTokenRef = useRef("");
  const repostTargetSuggestionRequestRef = useRef(0);
  const [loans, setLoans] = useState<LoanSupportItem[]>([]);
  const [moneySurface, setMoneySurface] = useState<CommunityMoneySurface | null>(
    null
  );

  const [loanAmount, setLoanAmount] = useState("");
  const [loanDurationDays, setLoanDurationDays] = useState("");
  const [loanPurpose, setLoanPurpose] = useState("");
  const [selectedSupporters, setSelectedSupporters] = useState<SuggestedSupporter[]>(
    []
  );
  const [suggestedSupporters, setSuggestedSupporters] = useState<SuggestedSupporter[]>(
    []
  );
  const [loanDraftId, setLoanDraftId] = useState<number>(0);
  const [loanDraftSummary, setLoanDraftSummary] =
    useState<LoanDraftSummary | null>(null);
  const [loanSuggestionRaw, setLoanSuggestionRaw] = useState<any>(null);

  const [startingLoanDraft, setStartingLoanDraft] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [sendingGuarantorRequests, setSendingGuarantorRequests] =
    useState(false);
  const [cancellingLoanDraft, setCancellingLoanDraft] = useState(false);

  const [sectionsOpen, setSectionsOpen] =
    useState<SectionState>(DEFAULT_SECTION_STATE);
  const [, setSectionsTouched] =
    useState<SectionState>(DEFAULT_SECTION_STATE);
  const [profileDetailsOpen, setProfileDetailsOpen] = useState(false);
  const [intentQuery, setIntentQuery] = useState("");
  const [intentGuideOpen, setIntentGuideOpen] = useState(false);

  const roscaSectionRef = useRef<HTMLElement | null>(null);
  const supportSectionRef = useRef<HTMLElement | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const scrollTimeoutRefs = useRef<number[]>([]);
  const pendingMarketplaceSectionRef = useRef("");
  const withdrawalHandoffAppliedRef = useRef("");
  const publicShopPrepareInFlightRef = useRef(false);

  const routeSelectedClanId = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return positiveNumber(
      query.get("community") ||
        query.get("clan_id") ||
        query.get("community_id")
    );
  }, [location.search]);
  const routeRepostProductId = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return positiveNumber(
      query.get("repost_product_id") ||
        query.get("product_id") ||
        query.get("product")
    );
  }, [location.search]);
  const routeRepostBlockNumber = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return positiveNumber(query.get("block") || query.get("slot"));
  }, [location.search]);
  const routeRepostSource = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return safeStr(query.get("source")).toLowerCase();
  }, [location.search]);
  const routeRepostHandoffProduct = useMemo(
    () =>
      readPaidRepostHandoff(
        routeRepostProductId,
        routeRepostBlockNumber,
        routeRepostSource
      ),
    [routeRepostBlockNumber, routeRepostProductId, routeRepostSource]
  );
  const selectedClanId = routeSelectedClanId || Number(getSelectedClanId() || 0);
  const currentGmfnId = safeStr(me?.gmfn_id || "");
  const publicShopOwnerId = firstTruthy(
    publicShopRecord?.owner_gmfn_id,
    publicShopRecord?.gmfn_id,
    currentGmfnId
  );

  const activeCommunityId = useMemo(() => {
    return positiveNumber(selectedCommunity?.id || selectedCommunity?.clan_id);
  }, [selectedCommunity]);

  const myShopTo = useMemo(() => {
    return currentGmfnId ? publicShopPath(currentGmfnId) : "";
  }, [currentGmfnId]);

  useEffect(() => {
    if (routeSelectedClanId > 0) {
      setSelectedClanId(routeSelectedClanId);
    }
  }, [routeSelectedClanId]);

  const marketplaceIntentItems = useMemo(() => {
    return MARKETPLACE_INTENT_ITEMS.map((item) =>
      item.id === "shop" ? { ...item, to: myShopTo } : item
    );
  }, [myShopTo]);

  const matchedIntent = useMemo(() => {
    const match = findMarketplaceIntent(intentQuery);
    if (!match) return null;
    return marketplaceIntentItems.find((item) => item.id === match.id) || match;
  }, [intentQuery, marketplaceIntentItems]);

  const publicCommunityWorkspaceLink = useMemo(() => {
    if (!activeCommunityId) return "";
    return publicFrontendUrl(
      `/verify/community/${encodeURIComponent(String(activeCommunityId))}`
    );
  }, [activeCommunityId]);

  const publicShopViewLink = useMemo(() => {
    if (!publicShopOwnerId || !publicShopRecord) return "";
    return publicShopUrl(publicShopOwnerId);
  }, [publicShopOwnerId, publicShopRecord]);

  const publicShopPosterLink = useMemo(() => {
    if (!publicShopOwnerId || !publicShopRecord) return "";
    return publicShopShareUrl({ gmfnId: publicShopOwnerId });
  }, [publicShopOwnerId, publicShopRecord]);
  const publicShopActionsLocked =
    !currentGmfnId || !activeCommunityId || preparingPublicShopLink;

  const publicShopUnavailableText = !currentGmfnId
    ? "Your GSN ID is not ready yet."
    : "Prepare your public shop link first so it is connected to an active shop before you send it.";

  const sourceRepostShopId = positiveNumber(
    routeRepostHandoffProduct?.originShopId || publicShopRecord?.id
  );
  const sourceRepostCommunityId = positiveNumber(
    routeRepostHandoffProduct?.originCommunityId ||
      publicShopRecord?.clan_id ||
      activeCommunityId
  );

  const loadMarketplaceRepostCredits = useCallback(
    async (background = false) => {
      const shopId = positiveNumber(sourceRepostShopId);
      const clanId = positiveNumber(sourceRepostCommunityId);

      if (!shopId || !clanId) {
        setRepostSpotlightStatus(null);
        setRepostExpectedPayments([]);
        return;
      }

      if (!background) setLoadingRepostCredits(true);
      try {
        const [statusRes, expectedRes] = await Promise.all([
          getMarketplaceShopSpotlightStatus(shopId).catch(() => null),
          listMyPaymentInstructionExpectedPayments({
            clan_id: clanId,
            expected_type: "spotlight_subscription",
            limit: 100,
          }).catch(() => ({ items: [] })),
        ]);

        setRepostSpotlightStatus((statusRes || null) as SpotlightStatusRecord | null);
        setRepostExpectedPayments(rowsOf<ExpectedPaymentRecord>(expectedRes));
      } finally {
        if (!background) setLoadingRepostCredits(false);
      }
    },
    [sourceRepostCommunityId, sourceRepostShopId]
  );

  useEffect(() => {
    void loadMarketplaceRepostCredits(true);
  }, [loadMarketplaceRepostCredits]);

  useEffect(() => {
    const shopId = positiveNumber(publicShopRecord?.id);
    if (!shopId) {
      setRepostProducts([]);
      setSelectedRepostProductId(0);
      return;
    }

    let alive = true;
    setLoadingRepostProducts(true);

    const clanId = positiveNumber(activeCommunityId || publicShopRecord?.clan_id);
    const enrichWithShop = (row: any) => ({
      ...(row || {}),
      shop_id: firstDefined(row?.shop_id, row?.shopId, row?.shop?.id, shopId),
      clan_id: firstDefined(
        row?.clan_id,
        row?.clanId,
        row?.community_id,
        row?.shop?.clan_id,
        row?.shop?.community_id,
        clanId
      ),
      shop_name: firstTruthy(
        row?.shop_name,
        row?.marketplace_shop_name,
        row?.shop?.name,
        publicShopRecord?.name
      ),
      owner_gmfn_id: firstTruthy(
        row?.owner_gmfn_id,
        row?.gmfn_id,
        row?.shop?.owner_gmfn_id,
        row?.shop?.gmfn_id,
        publicShopOwnerId,
        currentGmfnId
      ),
      whatsapp_number: firstTruthy(
        row?.whatsapp_number,
        row?.shop_whatsapp_number,
        row?.owner_whatsapp_number,
        row?.shop?.whatsapp_number,
        publicShopRecord?.whatsapp_number
      ),
    });

    Promise.all([
      getMarketplaceProducts({
        shop_id: shopId,
        only_active: true,
        include_reposted: false,
        include_private_manage: true,
        limit: 120,
        header_clan_id: clanId || undefined,
      }).catch(() => ({ items: [] })),
      getMyMarketplaceShop({
        clan_id: clanId || undefined,
        header_clan_id: clanId || undefined,
        product_limit: 300,
      }).catch(() => null),
    ])
      .then(([productsRes, myShopRes]) => {
        if (!alive) return;
        const directRows = rowsOf<any>(productsRes);
        const ownerRows = Array.isArray((myShopRes as any)?.products)
          ? ((myShopRes as any).products as any[])
          : rowsOf<any>((myShopRes as any)?.products);
        const options = uniqRepostProductOptions(
          [...directRows, ...ownerRows]
            .map(enrichWithShop)
            .map(normalizeRepostProductOption)
            .filter((item): item is RepostProductOption => {
              return Boolean(
                item &&
                  item.visibilityMode === "community_visible"
              );
            })
        );
        setRepostProducts(options);
        setSelectedRepostProductId((current) =>
          options.some((item) => item.id === current) ? current : options[0]?.id || 0
        );
      })
      .catch(() => {
        if (!alive) return;
        setRepostProducts([]);
      })
      .finally(() => {
        if (alive) setLoadingRepostProducts(false);
      });

    return () => {
      alive = false;
    };
  }, [
    activeCommunityId,
    currentGmfnId,
    publicShopOwnerId,
    publicShopRecord?.clan_id,
    publicShopRecord?.id,
    publicShopRecord?.name,
    publicShopRecord?.whatsapp_number,
  ]);

  const visibleRepostProducts = useMemo(() => {
    return uniqRepostProductOptions(
      [
        ...repostProducts,
        routeRepostHandoffProduct,
      ].filter((item): item is RepostProductOption => Boolean(item))
    );
  }, [repostProducts, routeRepostHandoffProduct]);

  const selectedRepostProduct = useMemo(() => {
    return (
      visibleRepostProducts.find((product) => product.id === selectedRepostProductId) ||
      visibleRepostProducts[0] ||
      null
    );
  }, [visibleRepostProducts, selectedRepostProductId]);

  const selectedRepostProductVideoSrc = useMemo(() => {
    return resolveRepostAssetSrc(selectedRepostProduct?.videoUrl);
  }, [selectedRepostProduct?.videoUrl]);

  const selectedRepostProductImageSrc = useMemo(() => {
    return resolveRepostAssetSrc(selectedRepostProduct?.imageUrl);
  }, [selectedRepostProduct?.imageUrl]);

  const selectedRepostProductPublicLink = useMemo(() => {
    if (!publicShopOwnerId || !selectedRepostProduct?.id) return "";
    return publicShopBlockUrl({
      gmfnId: publicShopOwnerId,
      productId: selectedRepostProduct.id,
      block: selectedRepostProduct.blockNumber || undefined,
    });
  }, [
    publicShopOwnerId,
    selectedRepostProduct?.blockNumber,
    selectedRepostProduct?.id,
  ]);

  useEffect(() => {
    selectedRepostProductIdRef.current =
      positiveNumber(selectedRepostProduct?.id) || null;
    repostTargetSuggestionRequestRef.current += 1;
    setRepostTargetSuggestions([]);
    setRepostTargetSuggestionError("");
    setLoadingRepostTargetSuggestions(false);
  }, [selectedRepostProduct?.id]);

  async function loadMarketplaceRepostTargetSuggestions(background = false) {
    const productId = positiveNumber(selectedRepostProduct?.id);

    if (!productId) {
      setRepostTargetSuggestionError(
        "Choose one public block before asking GSN for target community IDs."
      );
      showNotice("error", "Choose one public block before finding target IDs.");
      return;
    }

    const requestId = repostTargetSuggestionRequestRef.current + 1;
    repostTargetSuggestionRequestRef.current = requestId;

    if (!background) setLoadingRepostTargetSuggestions(true);
    setRepostTargetSuggestionError("");
    try {
      const res = await getMarketplaceRepostTargetSuggestions(productId, { limit: 6 });
      const items = rowsOf<RepostTargetSuggestion>(res);
      if (
        requestId !== repostTargetSuggestionRequestRef.current ||
        selectedRepostProductIdRef.current !== productId
      ) {
        return;
      }
      setRepostTargetSuggestions(items);
      if (!background) {
        showNotice(
          items.length ? "success" : "error",
          items.length
            ? "GSN found target community IDs for this block."
            : "No target community suggestions are ready yet. You can still enter a community ID manually."
        );
      }
    } catch (err: any) {
      const message =
        safeStr(err?.message) ||
        "GSN could not read target community suggestions right now.";
      if (
        requestId !== repostTargetSuggestionRequestRef.current ||
        selectedRepostProductIdRef.current !== productId
      ) {
        return;
      }
      setRepostTargetSuggestions([]);
      setRepostTargetSuggestionError(message);
      if (!background) showNotice("error", message);
    } finally {
      if (!background && requestId === repostTargetSuggestionRequestRef.current) {
        setLoadingRepostTargetSuggestions(false);
      }
    }
  }

  const resolvedRepostTargetMarketplaceId = positiveNumber(repostTargetMarketplaceId);
  const resolvedRepostTargetCommunityInput = safeStr(repostTargetMarketplaceId);
  const resolvedRepostDurationDays = Math.max(
    1,
    Math.min(365, positiveNumber(repostDurationDays) || 1)
  );
  const requiredMarketplaceRepostCredits = resolvedRepostDurationDays;
  const confirmedMarketplaceRepostCredits = useMemo(
    () =>
      repostExpectedPayments
        .filter(isConfirmedPayment)
        .reduce((total, item) => total + paymentQuantity(item), 0),
    [repostExpectedPayments]
  );
  const statusMarketplaceRepostCredits = Number(
    repostSpotlightStatus?.available_paid_credits
  );
  const availableMarketplaceRepostCredits =
    Number.isFinite(statusMarketplaceRepostCredits) &&
    statusMarketplaceRepostCredits >= 0
      ? statusMarketplaceRepostCredits
      : confirmedMarketplaceRepostCredits;
  const missingMarketplaceRepostCredits = Math.max(
    0,
    requiredMarketplaceRepostCredits - availableMarketplaceRepostCredits
  );
  const requiredMarketplaceRepostAmount = spotlightCreditAmount(
    requiredMarketplaceRepostCredits
  );
  const createdRepostReference = firstTruthy(
    createdRepostInstruction?.reference_display,
    createdRepostInstruction?.reference
  );
  const latestRepostPayment =
    (createdRepostReference
      ? repostExpectedPayments.find(
          (item) =>
            firstTruthy(item.reference_display, item.reference) === createdRepostReference
        )
      : null) ||
    repostExpectedPayments[0] ||
    createdRepostInstruction ||
    null;
  const latestRepostPaymentReference = firstTruthy(
    latestRepostPayment?.reference_display,
    latestRepostPayment?.reference
  );
  const latestRepostPaymentAmount = formatRailMoney(
    latestRepostPayment?.amount,
    latestRepostPayment?.currency || "GBP"
  );
  const latestRepostPaymentStatus = firstTruthy(
    latestRepostPayment?.status,
    latestRepostPayment ? "awaiting payment" : ""
  );
  const canPlaceMarketplaceRepost =
    availableMarketplaceRepostCredits >= requiredMarketplaceRepostCredits;
  const marketplaceRepostLocked =
    loadingRepostProducts ||
    placingMarketplaceRepost ||
    !selectedRepostProduct ||
    !resolvedRepostTargetCommunityInput ||
    !canPlaceMarketplaceRepost;

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
    }, 2800);

    return () => window.clearTimeout(timer);
  }, [notice]);

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  function toggleSection(key: keyof SectionState) {
    setSectionsTouched((prev) => touchedMarketplaceSectionState(prev, key));
    setSectionsOpen((prev) =>
      prev[key]
        ? {
            ...prev,
            [key]: false,
          }
        : focusedMarketplaceSectionState(key)
    );
  }

  function toggleSectionFromButton(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    key: keyof SectionState
  ) {
    consumeMarketplaceButtonEvent(event);
    clearMarketplaceHash();
    const willOpen = !sectionsOpen[key];
    toggleSection(key);
    if (willOpen) {
      scheduleMarketplaceSectionScroll(MARKETPLACE_SECTION_ANCHORS[key]);
    } else {
      pendingMarketplaceSectionRef.current = "";
      cancelMarketplaceSectionScroll();
    }
  }

  function consumeMarketplaceButtonEvent(
    event?: React.SyntheticEvent<HTMLElement>
  ) {
    if (!event) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function runMarketplaceAction(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    action: () => void
  ) {
    consumeMarketplaceButtonEvent(event);
    action();
  }

  function clearStaleMarketplaceHash(activeSectionId: string) {
    if (typeof window === "undefined") return;
    const currentHash = safeStr(window.location.hash).replace(/^#/, "");
    if (!currentHash || currentHash === activeSectionId) return;

    clearMarketplaceHash();
  }

  function clearMarketplaceHash() {
    if (typeof window === "undefined") return;
    const currentHash = safeStr(window.location.hash).replace(/^#/, "");
    if (!currentHash) return;
    if (!Object.values(MARKETPLACE_SECTION_ANCHORS).includes(currentHash)) {
      return;
    }

    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}`
    );
  }

  function toggleProfileDetails(
    event?: React.SyntheticEvent<HTMLElement>
  ) {
    consumeMarketplaceButtonEvent(event);
    setProfileDetailsOpen((prev) => !prev);
  }

  function openMarketplaceRoute(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    to: string
  ) {
    consumeMarketplaceButtonEvent(event);
    const target = to.startsWith("/app/")
      ? routeWithCommunity(to, activeCommunityId)
      : to;
    navigateWithOrigin(navigate, target, location);
  }

  function openMarketplaceCta(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    intent: CtaIntent
  ) {
    consumeMarketplaceButtonEvent(event);
    navigateToCta(
      navigate,
      location,
      resolveCtaTarget(intent, {
        communityId: activeCommunityId,
        debugId: `marketplace.route.${intent}`,
      })
    );
  }

  function toggleIntentGuide(event?: React.SyntheticEvent<HTMLElement>) {
    consumeMarketplaceButtonEvent(event);
    setIntentGuideOpen((prev) => !prev);
  }

  const cancelMarketplaceSectionScroll = useCallback(() => {
    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current);
      scrollFrameRef.current = null;
    }
    scrollTimeoutRefs.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    scrollTimeoutRefs.current = [];
  }, []);

  const scrollToMarketplaceSection = useCallback(function scrollToMarketplaceSection(
    id: string,
    attempt = 0
  ) {
    if (attempt === 0 && scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current);
      scrollFrameRef.current = null;
    }

    const target =
      document.getElementById(id) ||
      (id === "marketplace-rosca"
        ? roscaSectionRef.current
        : id === "marketplace-loans-support"
          ? supportSectionRef.current
          : null);
    if (target) {
      scrollElementToMarketplaceLanding(target as HTMLElement, {
        surface: "marketplace",
        targetId: id,
        reason: "section-open",
        attempt,
      });
      return;
    }
    traceMarketplaceLanding({
      surface: "marketplace",
      targetId: id,
      reason: "section-target-missing",
      attempt,
    });
    if (attempt >= 7) return;
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      scrollToMarketplaceSection(id, attempt + 1);
    });
  }, []);

  useEffect(() => {
    return () => {
      cancelMarketplaceSectionScroll();
    };
  }, [cancelMarketplaceSectionScroll]);

  const scheduleMarketplaceSectionScroll = useCallback(
    function scheduleMarketplaceSectionScroll(sectionId: string) {
      if (typeof window === "undefined") return;
      cancelMarketplaceSectionScroll();
      pendingMarketplaceSectionRef.current = sectionId;

      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef.current = window.requestAnimationFrame(() => {
          scrollFrameRef.current = null;
          scrollToMarketplaceSection(sectionId);
        });
      });

      [80, 180, 360, 720, 1200, 1800].forEach((delay, index) => {
        const timeoutId = window.setTimeout(() => {
          scrollToMarketplaceSection(sectionId, index + 1);
        }, delay);
        scrollTimeoutRefs.current.push(timeoutId);
      });

      [2400, 3200].forEach((delay, index) => {
        const timeoutId = window.setTimeout(() => {
          scrollToMarketplaceSection(sectionId, index + 7);
          if (index === 1 && pendingMarketplaceSectionRef.current === sectionId) {
            pendingMarketplaceSectionRef.current = "";
          }
        }, delay);
        scrollTimeoutRefs.current.push(timeoutId);
      });
    },
    [cancelMarketplaceSectionScroll, scrollToMarketplaceSection]
  );

  useEffect(() => {
    const sectionId = pendingMarketplaceSectionRef.current;
    if (!sectionId) return;
    scheduleMarketplaceSectionScroll(sectionId);
  }, [sectionsOpen, scheduleMarketplaceSectionScroll]);

  function openMarketplaceIntent(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    item: MarketplaceIntentItem | null
  ) {
    consumeMarketplaceButtonEvent(event);

    if (!item) {
      showNotice(
        "error",
        "Type what you want to do, like loan, deposit, withdraw, shop, invite, or trust."
      );
      return;
    }

    if (item.id === "support") {
      setSectionsTouched((prev) => touchedMarketplaceSectionState(prev, "support"));
      setSectionsOpen(focusedMarketplaceSectionState("support"));
      clearStaleMarketplaceHash("marketplace-loans-support");
      scheduleMarketplaceSectionScroll("marketplace-loans-support");
      return;
    }

    if (item.id === "rosca") {
      setSectionsTouched((prev) => touchedMarketplaceSectionState(prev, "rosca"));
      setSectionsOpen(focusedMarketplaceSectionState("rosca"));
      clearStaleMarketplaceHash("marketplace-rosca");
      scheduleMarketplaceSectionScroll("marketplace-rosca");
      return;
    }

    if (item.id === "invite") {
      setSectionsTouched((prev) => touchedMarketplaceSectionState(prev, "tools"));
      setSectionsOpen(focusedMarketplaceSectionState("tools"));
      clearStaleMarketplaceHash("marketplace-owned-links");
      scheduleMarketplaceSectionScroll("marketplace-owned-links");
      return;
    }

    if (item.id === "shop" && !item.to) {
      showNotice("error", "Your shop route is not ready yet.");
      return;
    }

    if (item.intent) {
      openMarketplaceCta(undefined, item.intent);
      return;
    }

    if (!item.to) {
      showNotice("error", "That route is not ready yet.");
      return;
    }

    openMarketplaceRoute(undefined, item.to);
  }

  function handleIntentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();

    const match = matchedIntent;
    if (!match) {
      showNotice(
        "error",
        "I could not match that yet. Try loan, deposit, withdraw, shop, invite, trust, or group."
      );
      return;
    }

    openMarketplaceIntent(undefined, match);
  }

  async function loadLoanDraftContext(loanId: number, communityId: number) {
    const [summaryRes, suggestionsRes] = await Promise.all([
      getLoanSummary(loanId).catch(() => null),
      getLoanGuarantorSuggestions(loanId, {
        clan_id: communityId,
        limit: 8,
      }).catch(() => null),
    ]);

    const normalizedSummary = normalizeLoanSummary(summaryRes);
    const normalizedSuggestions = extractSuggestedSupporters(suggestionsRes);

    setLoanDraftId(loanId);
    setLoanDraftSummary(normalizedSummary);
    setLoanSuggestionRaw(suggestionsRes);
    setSuggestedSupporters(normalizedSuggestions);

    return {
      summary: normalizedSummary,
      suggestions: normalizedSuggestions,
      suggestionMessage: extractSuggestionMessage(suggestionsRes),
    };
  }

  function resetLoanTaskState(opts?: { clearInputs?: boolean }) {
    setSelectedSupporters([]);
    setSuggestedSupporters([]);
    setLoanDraftId(0);
    setLoanDraftSummary(null);
    setLoanSuggestionRaw(null);

    if (opts?.clearInputs) {
      setLoanAmount("");
      setLoanDurationDays("");
      setLoanPurpose("");
    }
  }

  const loadPage = useCallback(async () => {
    setLoading(true);

    try {
      const [meRes, currentClanRes, clanListRes] = await Promise.all([
        getMe().catch(() => null),
        getCurrentClan().catch(() => null),
        listMyClans().catch(() => ({ items: [] })),
      ]);

      const clanRows = rowsOf<any>(clanListRes);
      const resolvedCommunity = buildSelectedCommunity(
        currentClanRes,
        clanRows,
        selectedClanId
      );
      const currentCommunityId =
        positiveNumber(resolvedCommunity?.id || resolvedCommunity?.clan_id) ||
        selectedClanId;

      const currentMemberGmfnId = safeStr(meRes?.gmfn_id || "");

      const [
        membersRes,
        shopsRes,
        ownerShopRes,
        poolRes,
        inviteRes,
        loansRes,
        trustRes,
        packageStatusRes,
        roscaCyclesRes,
      ] =
        await Promise.all([
          currentCommunityId
            ? listClanMembers(currentCommunityId).catch(() => ({ items: [] }))
            : Promise.resolve({ items: [] }),
          currentCommunityId
            ? getMarketplaceShops({
                clan_id: currentCommunityId,
                only_active: true,
                limit: 200,
              }).catch(() => ({ items: [] }))
            : Promise.resolve({ items: [] }),
          currentMemberGmfnId
            ? getMyMarketplaceShop({
                clan_id: currentCommunityId || undefined,
                header_clan_id: currentCommunityId || undefined,
                product_limit: 300,
              })
                .catch(() =>
                  getMarketplaceShopByGmfnId(currentMemberGmfnId, {
                    clan_id: currentCommunityId || undefined,
                    header_clan_id: currentCommunityId || undefined,
                  })
                )
                .catch(() => null)
            : Promise.resolve(null),
          currentCommunityId
            ? getPoolMe("NGN", 20, { clan_id: currentCommunityId }).catch(
                () => null
              )
            : Promise.resolve(null),
          currentCommunityId
            ? getClanInviteLink(currentCommunityId).catch(() => null)
            : Promise.resolve(null),
          currentCommunityId
            ? listMyLoans({ clan_id: currentCommunityId }).catch(() => [])
            : Promise.resolve([]),
          currentCommunityId
            ? getClanTrustScoreExplained({
                clan_id: currentCommunityId,
                limit: 8,
              }).catch(() => null)
            : Promise.resolve(null),
          currentCommunityId
            ? getCommunityPackageStatus({
                clan_id: currentCommunityId,
              }).catch(() => null)
            : Promise.resolve(null),
          currentCommunityId
            ? getRoscaCycles({
                clan_id: currentCommunityId,
              }).catch(() => null)
            : Promise.resolve(null),
        ]);

            const memberRows = rowsOf<ClanMember>(membersRes);
            const shopRows = rowsOf<any>(shopsRes)
              .map((row) => normalizeMarketplaceShop(row))
              .filter(Boolean)
              .filter(
                (row) => normalizeMarketplaceShopVisibility(row) !== "vault_private"
              ) as MarketplaceShop[];

            const normalizedLoans = rowsOf<any>(loansRes)
             .map((row) => normalizeLoan(row))
             .filter(Boolean) as LoanSupportItem[];

            const filteredLoans = normalizedLoans.filter((item) => {
            const loanClanId = Number(item?.clan_id || 0);
        return loanClanId <= 0 || loanClanId === currentCommunityId;
      });

      setMe(meRes || null);
      setSelectedCommunity(resolvedCommunity);
      setMembers(memberRows);
      setShops(shopRows);
      setPublicShopRecord(normalizeMarketplaceShop(ownerShopRes));
      setPoolInfo(poolRes);
      setMarketplaceTrust(trustRes || null);
      setInviteLink(getInviteUrl(inviteRes));
      setLoans(filteredLoans);
      setCommunityPackageItems(
        Array.isArray(packageStatusRes?.packages)
          ? (packageStatusRes.packages as CommunityPackageStatusItem[])
          : []
      );
      setRoscaCycles(
        Array.isArray(roscaCyclesRes?.cycles)
          ? (roscaCyclesRes.cycles as RoscaCycleSummary[])
          : []
      );
    } finally {
      setLoading(false);
    }
  }, [selectedClanId]);

  useEffect(() => {
    void loadPage();
  }, [loadPage, selectedClanId]);

  async function preparePublicShopLink(): Promise<string> {
    if (publicShopPrepareInFlightRef.current) {
      setNotice({
        tone: "error",
        text: publicShopActionUnavailableMessage(
          true,
          publicShopUnavailableText
        ),
      });
      return publicShopViewLink;
    }

    if (!activeCommunityId) {
      setNotice({
        tone: "error",
        text: "Select a community before preparing the public shop link.",
      });
      return "";
    }

    if (!currentGmfnId) {
      setNotice({ tone: "error", text: "Your GSN ID is not ready yet." });
      return "";
    }

    publicShopPrepareInFlightRef.current = true;
    setPreparingPublicShopLink(true);
    try {
      const displayName = firstPublicIdentity(me?.display_name, me?.name, me?.nickname);
      const shopName =
        firstPublicIdentity(publicShopRecord?.name) ||
        displayName ||
        "Public GSN Shop";
      const created = await createMarketplaceShop({
        clan_id: activeCommunityId,
        name: shopName,
        description:
          publicShopRecord?.description ||
          "Public GSN shop face for the owner's active shop blocks.",
      });

      const normalized = normalizeMarketplaceShop(created);
      setPublicShopRecord(normalized);
      await loadPage();
      const ownerId = firstTruthy(
        normalized?.owner_gmfn_id,
        normalized?.gmfn_id,
        currentGmfnId
      );
      const link = ownerId ? publicShopUrl(ownerId) : "";
      setNotice({
        tone: "success",
        text: link
          ? "Public shop link is connected to an active shop."
          : "Public shop refreshed, but the owner ID is still not ready.",
      });
      return link;
    } catch (err: any) {
      setNotice({
        tone: "error",
        text:
          safeStr(err?.message) ||
          "Public shop link could not be prepared right now.",
      });
      return "";
    } finally {
      publicShopPrepareInFlightRef.current = false;
      setPreparingPublicShopLink(false);
    }
  }

  async function getFreshPublicShopLink(): Promise<string> {
    if (publicShopViewLink) return publicShopViewLink;
    return preparePublicShopLink();
  }

  async function copyFreshPublicShopLink() {
    const freshLink = await getFreshPublicShopLink();
    if (!freshLink && !publicShopViewLink) {
      copyMarketplaceLink("", "", publicShopUnavailableText);
      return;
    }
    const link =
      publicShopPosterLink ||
      (publicShopOwnerId || currentGmfnId
        ? publicShopShareUrl({ gmfnId: publicShopOwnerId || currentGmfnId })
        : freshLink);
    copyMarketplaceLink(
      link,
      "Public shop poster link refreshed and copied.",
      publicShopUnavailableText
    );
  }

  async function emailFreshPublicShopLink() {
    const freshLink = await getFreshPublicShopLink();
    if (!freshLink && !publicShopViewLink) {
      openMarketplaceEmail("", "", "", publicShopUnavailableText);
      return;
    }
    const link =
      publicShopPosterLink ||
      (publicShopOwnerId || currentGmfnId
        ? publicShopShareUrl({ gmfnId: publicShopOwnerId || currentGmfnId })
        : freshLink);
    openMarketplaceEmail(
      shopEmailSubject,
      ["Here is the public GSN shop face.", "", link].join("\n"),
      link,
      publicShopUnavailableText
    );
  }

  function openReadyPublicShopLink() {
    const link = publicShopPosterLink || publicShopViewLink;
    if (!link) {
      showNotice(
        "error",
        "Refresh the public shop link first. Then tap Open Shop Face again."
      );
      return;
    }

    if (typeof window !== "undefined") {
      window.location.assign(link);
    }
  }

  async function createMarketplaceRepostPaymentInstruction() {
    const shopId = positiveNumber(
      selectedRepostProduct?.originShopId || publicShopRecord?.id
    );
    const clanId = positiveNumber(
      selectedRepostProduct?.originCommunityId ||
        publicShopRecord?.clan_id ||
        activeCommunityId
    );
    const requiredCredits = requiredMarketplaceRepostCredits;

    if (loadingRepostProducts) {
      showNotice(
        "error",
        "Public blocks are still loading. Wait a moment, then generate the payment code."
      );
      return;
    }

    if (!shopId || !clanId) {
      showNotice(
        "error",
        "Shop and community context must be ready before GSN can generate this payment code."
      );
      return;
    }

    if (!selectedRepostProduct?.id) {
      showNotice("error", "Choose one public block before generating the payment code.");
      return;
    }

    setCreatingRepostPaymentInstruction(true);
    try {
      const result = await createSpotlightPaymentInstruction({
        clan_id: clanId,
        shop_id: shopId,
        quantity_total: requiredCredits,
        currency: "GBP",
        visibility_scope: "marketplace_repost",
      });
      setCreatedRepostInstruction(result as ExpectedPaymentRecord);
      const reference = firstTruthy(result?.reference_display, result?.reference);
      if (reference) {
        safeCopy(reference);
      }
      await loadMarketplaceRepostCredits(true);
      showNotice(
        "success",
        `Payment code generated for ${requiredCredits} Network Spotlight day${
          requiredCredits === 1 ? "" : "s"
        }. Use the exact code in the transfer.`
      );
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) ||
          "Network Spotlight payment code could not be generated."
      );
    } finally {
      setCreatingRepostPaymentInstruction(false);
    }
  }

  async function refreshMarketplaceRepostCredits() {
    await loadMarketplaceRepostCredits(false);
    showNotice("success", "Network Spotlight payment status refreshed.");
  }

  async function submitMarketplaceRepost() {
    const product = selectedRepostProduct;
    const targetCommunityInput = resolvedRepostTargetCommunityInput;
    const targetMarketplaceId = resolvedRepostTargetMarketplaceId;
    const durationDays = resolvedRepostDurationDays;

    if (loadingRepostProducts) {
      showNotice(
        "error",
        "Public blocks are still loading. Wait a moment, then place the block."
      );
      return;
    }

    if (placingMarketplaceRepost) {
      showNotice(
        "error",
        "GSN is already placing this block into Network Spotlight."
      );
      return;
    }

    if (!product?.id) {
      showNotice("error", "Choose one public block before placing it into Network Spotlight.");
      return;
    }

    if (!targetCommunityInput) {
      showNotice("error", "Enter the target community ID where this block should appear.");
      return;
    }

    if (availableMarketplaceRepostCredits < durationDays) {
      showNotice(
        "error",
        `This placement needs ${durationDays} paid Spotlight credit${
          durationDays === 1 ? "" : "s"
        }. ${availableMarketplaceRepostCredits} ${
          availableMarketplaceRepostCredits === 1 ? "is" : "are"
        } ready. Generate the exact payment code here first.`
      );
      return;
    }

    setPlacingMarketplaceRepost(true);
    try {
      const res = await createMarketplaceRepost({
        product_id: product.id,
        target_clan_id: targetMarketplaceId || undefined,
        target_community_code: targetMarketplaceId ? undefined : targetCommunityInput,
        duration_days: durationDays,
      });
      const remaining = positiveNumber(
        firstDefined(
          res?.product?.distribution_slots_remaining,
          res?.product?.remaining_distribution_slots,
          product.remainingSlots - 1
        )
      );
      setRepostProducts((prev) =>
        prev
          .map((item) =>
            item.id === product.id
              ? {
                  ...item,
                  remainingSlots: Math.max(0, remaining),
                  repostsUsed: item.repostsUsed + 1,
                }
              : item
          )
      );
      setRepostTargetMarketplaceId("");
      setRepostDurationDays("1");
      await loadMarketplaceRepostCredits(true);
      const targetLabel = safeStr(
        firstDefined(
          res?.target_community?.community_code,
          res?.target_community?.name,
          targetCommunityInput
        )
      );
      showNotice(
        "success",
        `${product.title} entered ${targetLabel} Network Spotlight for ${durationDays} day${
          durationDays === 1 ? "" : "s"
        }. ${durationDays} paid Spotlight credit${durationDays === 1 ? "" : "s"} used.`
      );
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) ||
          "Paid Repost could not complete. Check the target community ID and Spotlight credit."
      );
    } finally {
      setPlacingMarketplaceRepost(false);
    }
  }

  useEffect(() => {
    let alive = true;

    if (!activeCommunityId || !currentGmfnId) {
      setMoneySurface(null);
      return () => {
        alive = false;
      };
    }

    (async () => {
      const surface = await getCommunityMoneySurface(
        activeCommunityId,
        currentGmfnId,
        "NGN"
      ).catch(() => null);

      if (!alive) return;
      setMoneySurface(surface);
    })();

    return () => {
      alive = false;
    };
  }, [activeCommunityId, currentGmfnId]);

  useEffect(() => {
    if (!activeCommunityId) {
      setSectionsOpen(DEFAULT_SECTION_STATE);
      return;
    }

    const savedSections = readLocalJSON<SectionState | null>(
      communitySectionsStorageKey(activeCommunityId),
      null
    );

    setSectionsOpen(normalizeMarketplaceSectionState(savedSections));
  }, [activeCommunityId]);

  useEffect(() => {
    if (!activeCommunityId) return;
    writeLocalJSON(communitySectionsStorageKey(activeCommunityId), sectionsOpen);
  }, [sectionsOpen, activeCommunityId]);

  useEffect(() => {
    if (!loanDraftId) return;
    setSectionsTouched((prev) => touchedMarketplaceSectionState(prev, "support"));
    setSectionsOpen(focusedMarketplaceSectionState("support"));
  }, [loanDraftId]);

  useEffect(() => {
    const hash = safeStr(location.hash).replace(/^#/, "");
    if (hash !== "marketplace-loans-support") return;

    setSectionsTouched((prev) => touchedMarketplaceSectionState(prev, "support"));
    setSectionsOpen(focusedMarketplaceSectionState("support"));

    if (activeCommunityId && currentGmfnId) {
      const token = `${activeCommunityId}:${currentGmfnId}:${hash}`;
      if (withdrawalHandoffAppliedRef.current !== token) {
        const storedWithdrawalTask = readLocalJSON<PersistedWithdrawalTask | null>(
          withdrawalTaskStorageKey(activeCommunityId, currentGmfnId),
          null
        );

        const storedAmount = safeStr(storedWithdrawalTask?.amountInput);
        const storedNote = safeStr(storedWithdrawalTask?.noteInput);

        if (storedAmount) {
          setLoanAmount((prev) => (safeStr(prev) ? prev : storedAmount));
        }

        if (storedNote) {
          setLoanPurpose((prev) => (safeStr(prev) ? prev : storedNote));
        }

        withdrawalHandoffAppliedRef.current = token;
      }
    }

    scrollToMarketplaceSection("marketplace-loans-support");
  }, [location.hash, activeCommunityId, currentGmfnId, scrollToMarketplaceSection]);

  useEffect(() => {
    const hash = safeStr(location.hash).replace(/^#/, "");
    if (hash !== "marketplace-rosca") return;

    setSectionsTouched((prev) => touchedMarketplaceSectionState(prev, "rosca"));
    setSectionsOpen(focusedMarketplaceSectionState("rosca"));

    scrollToMarketplaceSection("marketplace-rosca");
  }, [location.hash, scrollToMarketplaceSection]);

  useEffect(() => {
    const hash = safeStr(location.hash).replace(/^#/, "");
    if (hash !== "marketplace-owned-links") return;

    setSectionsTouched((prev) => touchedMarketplaceSectionState(prev, "tools"));
    setSectionsOpen(focusedMarketplaceSectionState("tools"));

    scrollToMarketplaceSection("marketplace-owned-links");
  }, [location.hash, scrollToMarketplaceSection]);

  useEffect(() => {
    const hash = safeStr(location.hash).replace(/^#/, "");
    const openedFromShopBlock =
      hash === "marketplace-paid-network-placement" ||
      routeRepostSource === "shop-diaries" ||
      routeRepostSource === "shop-control-gallery" ||
      Boolean(routeRepostProductId || routeRepostBlockNumber);
    if (!openedFromShopBlock) return;

    setSectionsTouched((prev) => touchedMarketplaceSectionState(prev, "tools"));
    setSectionsOpen(focusedMarketplaceSectionState("tools"));

    const matchedProduct =
      (routeRepostProductId
        ? visibleRepostProducts.find((product) => product.id === routeRepostProductId)
        : null) ||
      (routeRepostBlockNumber
        ? visibleRepostProducts.find(
            (product) => product.blockNumber === routeRepostBlockNumber
          )
        : null);

    if (matchedProduct) {
      const routeToken = [
        location.search,
        location.hash,
        matchedProduct.id,
        matchedProduct.blockNumber,
      ].join("|");
      if (routeRepostSelectionTokenRef.current !== routeToken) {
        routeRepostSelectionTokenRef.current = routeToken;
        setSelectedRepostProductId(matchedProduct.id);
        showNotice(
          "success",
          `Block #${matchedProduct.blockNumber || routeRepostBlockNumber || "?"} is loaded for Paid Repost.`
        );
      } else if (selectedRepostProductId !== matchedProduct.id) {
        setSelectedRepostProductId(matchedProduct.id);
      }
    }

    scrollToMarketplaceSection("marketplace-paid-network-placement");
  }, [
    location.search,
    location.hash,
    routeRepostBlockNumber,
    routeRepostProductId,
    routeRepostSource,
    scrollToMarketplaceSection,
    selectedRepostProductId,
    visibleRepostProducts,
  ]);

  const memberName = useMemo(() => {
    return (
      firstPublicIdentity(
        me?.display_name,
        me?.nickname,
        me?.name,
        me?.first_name
      ) || "GSN member"
    );
  }, [me]);

  const activeCommunityName = useMemo(() => {
    return communityName(selectedCommunity);
  }, [selectedCommunity]);

  const activeJoinCommunityName = useMemo(() => {
    return baseCommunityName(selectedCommunity);
  }, [selectedCommunity]);

  const personalizedInviteLink = useMemo(() => {
    return (
      personalizedJoinInviteUrl(inviteLink, {
        inviterName: memberName,
        recipientName: joinRecipientName,
        communityName: activeJoinCommunityName,
        marketplaceName: activeCommunityName,
        message: joinInviteNote,
      }) || inviteLink
    );
  }, [
    inviteLink,
    memberName,
    joinRecipientName,
    activeJoinCommunityName,
    activeCommunityName,
    joinInviteNote,
  ]);

  const personalizedInviteMaskedLabel = useMemo(() => {
    return cleanMaskedLinkLabel(
      buildMaskedLinkLabel(personalizedInviteLink, "join", activeCommunityName)
    );
  }, [personalizedInviteLink, activeCommunityName]);

  const maskedMarketplaceFaceLabel = useMemo(() => {
    return cleanMaskedLinkLabel(
      buildMaskedLinkLabel(
        publicCommunityWorkspaceLink,
        "marketplace",
        activeCommunityName
      )
    );
  }, [publicCommunityWorkspaceLink, activeCommunityName]);

  const joinWhatsappMessage = useMemo(() => {
    return buildGsnShareMessage("join", {
      memberName,
      communityName: activeJoinCommunityName,
      marketplaceName: activeCommunityName,
      recipientName: joinRecipientName,
      personalNote: joinInviteNote,
      url: personalizedInviteLink,
    });
  }, [
    memberName,
    activeJoinCommunityName,
    activeCommunityName,
    joinRecipientName,
    joinInviteNote,
    personalizedInviteLink,
  ]);

  const joinWhatsappPreview = useMemo(() => {
    return buildGsnSharePreview("join", {
      memberName,
      communityName: activeJoinCommunityName,
      marketplaceName: activeCommunityName,
      recipientName: joinRecipientName,
      personalNote: joinInviteNote,
      maskedLabel: personalizedInviteMaskedLabel,
    });
  }, [
    memberName,
    activeJoinCommunityName,
    activeCommunityName,
    joinRecipientName,
    joinInviteNote,
    personalizedInviteMaskedLabel,
  ]);

  const joinEmailSubject = useMemo(() => {
    return buildGsnEmailSubject("join", activeCommunityName);
  }, [activeCommunityName]);

  const marketplaceEmailSubject = useMemo(() => {
    return buildGsnEmailSubject("marketplace", activeCommunityName);
  }, [activeCommunityName]);

  const marketplaceEmailMessage = useMemo(() => {
    return [
      `Here is the public GSN community verification record for ${activeCommunityName}.`,
      "",
      publicCommunityWorkspaceLink,
    ].join("\n");
  }, [activeCommunityName, publicCommunityWorkspaceLink]);

  const shopEmailSubject = useMemo(() => {
    return buildGsnEmailSubject("shop", activeCommunityName);
  }, [activeCommunityName]);

  const poolAmount = getPoolAmountText(poolInfo);
  const poolCurrency = getPoolCurrency(poolInfo);
  const visiblePoolAmount = safeStr(moneySurface?.poolAmount || poolAmount || "—");
  const visiblePoolCurrency = safeStr(
    moneySurface?.poolCurrency || poolCurrency || "NGN"
  );

  const communitySettlementReady = Boolean(
    moneySurface?.communitySettlement?.bankName ||
      moneySurface?.communitySettlement?.accountName ||
      moneySurface?.communitySettlement?.accountNumber
  );

  const payoutReady = Boolean(
    safeStr(moneySurface?.payoutDestination?.destinationName) &&
      safeStr(moneySurface?.payoutDestination?.bankName) &&
      safeStr(moneySurface?.payoutDestination?.accountNumber)
  );

  const selectedSupporterKeys = useMemo(() => {
    return new Set(selectedSupporters.map((item) => item.key));
  }, [selectedSupporters]);

  const memberRows = useMemo(() => {
    const rows = members.map((member) => {
      const shop = getShopForMember(member, shops);
      const gmfn = getMemberGmfnId(member);
      const userId = positiveNumber(member?.user_id || member?.id);
      const visibleShopName = firstPublicIdentity(shop?.name);
      const memberDisplayName = visibleShopName || getMemberName(member);
      const supportKey =
        userId > 0 ? `u-${userId}` : gmfn ? `g-${gmfn.toUpperCase()}` : "";

      return {
        member,
        name: memberDisplayName,
        gmfnId: gmfn,
        userId,
        supportKey,
        shopName: shop
          ? firstTruthy(visibleShopName, "Public shop active")
          : "Shop not visible yet",
        shopTo:
          shop && gmfn
            ? publicShopSharePath({
                gmfnId: gmfn,
                clanId: activeCommunityId || undefined,
              })
            : "",
      };
    });

    rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [activeCommunityId, members, shops]);

  const roscaSelectableMembers = useMemo(() => {
    return memberRows
      .filter((row) => positiveNumber(row.userId) > 0)
      .map((row) => ({
        userId: positiveNumber(row.userId),
        name: row.name,
        gmfnId: row.gmfnId,
        role: safeStr(row.member?.role || "member"),
      }));
  }, [memberRows]);

  const selectedRoscaMemberSet = useMemo(() => {
    return new Set(selectedRoscaMemberIds);
  }, [selectedRoscaMemberIds]);

  const selectedRoscaMembers = useMemo(() => {
    return roscaSelectableMembers.filter((row) =>
      selectedRoscaMemberSet.has(row.userId)
    );
  }, [roscaSelectableMembers, selectedRoscaMemberSet]);

  useEffect(() => {
    const availableIds = new Set(roscaSelectableMembers.map((row) => row.userId));
    setSelectedRoscaMemberIds((prev) =>
      prev.filter((userId) => availableIds.has(userId))
    );
  }, [roscaSelectableMembers]);

  const activeLoanCount = useMemo(() => {
    return loans.filter((item) => {
      const status = safeStr(item?.status).toLowerCase();
      return !FINAL_LOAN_STATUSES.has(status);
    }).length;
  }, [loans]);

  const currentMemberRole = useMemo(() => {
    const currentUserId = positiveNumber(me?.id || me?.user_id);
    const currentGmfn = safeStr(currentGmfnId).toUpperCase();
    const currentMember = members.find((member) => {
      const memberUserId = positiveNumber(member?.user_id || member?.id);
      const memberGmfn = safeStr(member?.gmfn_id).toUpperCase();

      if (currentUserId > 0 && memberUserId === currentUserId) return true;
      return Boolean(currentGmfn && memberGmfn && currentGmfn === memberGmfn);
    });

    return safeStr(
      firstDefined(
        currentMember?.role,
        selectedCommunity?.membership_role,
        selectedCommunity?.member_role,
        selectedCommunity?.role
      )
    ).toLowerCase();
  }, [currentGmfnId, me, members, selectedCommunity]);

  const canManageMarketplaceLinks =
    currentMemberRole === "admin" || safeStr(me?.role).toLowerCase() === "admin";
  const marketplaceJoinLinkMissingMessage = canManageMarketplaceLinks
    ? "Create the official join link first. Then copy or send it from here."
    : "A community admin must prepare this official join link before members can copy it.";
  const marketplaceJoinLinkGuidance = canManageMarketplaceLinks
    ? "Create the official join link first, then copy or open it from here."
    : "A community admin prepares the official join link. Once it is ready, members can copy and share it. Every join request still goes through community review.";
  const marketplaceJoinPreviewPendingMessage = canManageMarketplaceLinks
    ? "The join message preview will appear here after the official join link is ready."
    : "The invite message will appear after a community admin prepares the official join link.";
  const marketplaceJoinRefreshBlockedMessage =
    "Only a community admin can refresh the official join link. Members can share it after an admin prepares it.";

  const marketplaceTrustDisplay = marketplaceTrustLabel(
    selectedCommunity,
    marketplaceTrust
  );
  const marketplaceTrustEvidenceLabel =
    marketplaceTrustEventCount(marketplaceTrust);
  const marketplaceTrustPositiveLabel = firstTruthy(
    marketplaceTrust?.positives,
    "0"
  );
  const marketplaceTrustNegativeLabel = firstTruthy(
    marketplaceTrust?.negatives,
    "0"
  );
  const communityPackageByCode = useMemo(() => {
    const map = new Map<string, CommunityPackageStatusItem>();
    communityPackageItems.forEach((item) => {
      const code = firstTruthy(item?.package_code);
      if (code) map.set(code, item);
    });
    return map;
  }, [communityPackageItems]);
  const roscaPackage = communityPackageByCode.get("rosca_cycle") || null;
  const roscaYearlyActive =
    positiveNumber(roscaPackage?.active_remaining) > 0;
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
  function openMarketplaceSection(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    key: keyof SectionState,
    sectionId: string
  ) {
    consumeMarketplaceButtonEvent(event);
    setSectionsTouched((prev) => touchedMarketplaceSectionState(prev, key));
    setSectionsOpen(focusedMarketplaceSectionState(key));
    clearStaleMarketplaceHash(sectionId);
    scheduleMarketplaceSectionScroll(sectionId);
  }

  async function createRoscaYearlyInstruction() {
    if (!activeCommunityId) {
      showNotice("error", "Select a community first.");
      return;
    }
    if (creatingRoscaPackage) {
      showNotice("error", "ROSCA yearly payment request is already running.");
      return;
    }

    setCreatingRoscaPackage(true);
    try {
      const result = await createCommunityPackagePaymentInstruction({
        clan_id: activeCommunityId,
        package_code: "rosca_cycle",
        quantity_total: 1,
        currency: "GBP",
      });

      await loadPage();
      const reference = firstTruthy(result?.reference_display, result?.reference);
      if (reference) {
        await safeCopy(reference);
      }
      showNotice(
        "success",
        reference
          ? "ROSCA yearly payment request created. Reference copied."
          : "ROSCA yearly payment request created. Copy the reference from the payment record."
      );
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "ROSCA yearly payment request could not be created."
      );
    } finally {
      setCreatingRoscaPackage(false);
    }
  }

  async function startMarketplaceRoscaCycle() {
    const amount = Number(roscaContributionAmount || 0);
    const interval = Number(roscaIntervalDays || 30);
    if (!activeCommunityId) {
      showNotice("error", "Select a community first.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      showNotice("error", "Enter a ROSCA contribution amount above zero.");
      return;
    }
    if (selectedRoscaMemberIds.length < 2) {
      showNotice(
        "error",
        "Choose at least two members for this ROSCA cycle. Do not start it for the whole community by accident."
      );
      return;
    }

    setStartingRoscaCycle(true);
    try {
      const result = await createRoscaCycle({
        clan_id: activeCommunityId,
        title: safeStr(roscaTitle) || "Community ROSCA cycle",
        contribution_amount: amount.toFixed(2),
        currency: safeStr(roscaCurrency).toUpperCase() || "GBP",
        interval_days:
          Number.isFinite(interval) && interval > 0 ? Math.floor(interval) : 30,
        member_user_ids: selectedRoscaMemberIds,
        note: "Started from Marketplace ROSCA desk.",
      });

      await loadPage();
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

  async function recordMarketplaceRoscaPayout(
    cycleId: string,
    roundNumber: number
  ) {
    if (!activeCommunityId || !cycleId || !roundNumber) {
      showNotice("error", "ROSCA payout status is not ready yet.");
      return;
    }

    const busyKey = `${cycleId}:${roundNumber}`;
    setRecordingRoscaPayoutKey(busyKey);
    try {
      const result = await recordRoscaCyclePayout({
        clan_id: activeCommunityId,
        cycle_id: cycleId,
        round_number: roundNumber,
        note: "Recorded from Marketplace after confirmed contributions.",
      });

      await loadPage();
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

  async function handleCreateInviteLink() {
    if (!activeCommunityId) {
      showNotice("error", "Select a community first.");
      return;
    }

    if (creatingInviteLink) {
      showNotice("error", "Join link refresh is already running.");
      return;
    }

    if (!canManageMarketplaceLinks) {
      showNotice("error", marketplaceJoinRefreshBlockedMessage);
      return;
    }

    setCreatingInviteLink(true);

    try {
      const inviteRes = await createClanInvite(activeCommunityId);
      const nextInviteLink = getInviteUrl(inviteRes);

      if (!nextInviteLink) {
        showNotice("error", "Invite link is not ready yet.");
        return;
      }

      setInviteLink(nextInviteLink);
      const retiredCount = Number(inviteRes?.retired_live_invites || 0);
      showNotice(
        "success",
        retiredCount > 0
          ? "Fresh join invite created and older live link retired. Copy it from the link shown here."
          : "Fresh join invite created. Copy it from the link shown here."
      );
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) ||
          "GSN could not create the join link yet. Please refresh and try again."
      );
    } finally {
      setCreatingInviteLink(false);
    }
  }

  async function copyMarketplaceLink(
    url: string,
    successText: string,
    missingText: string
  ) {
    if (!url) {
      showNotice("error", missingText);
      return;
    }

    const copied = await safeCopy(url);
    showNotice(
      copied ? "success" : "error",
      copied
        ? successText
        : "Clipboard copy was blocked. The old clipboard may still contain another app route."
    );
  }

  async function copyMarketplaceMessage(
    message: string,
    url: string,
    successText: string,
    missingText: string
  ) {
    if (!url || !safeStr(message)) {
      showNotice("error", missingText);
      return;
    }

    const copied = await safeCopy(message);
    showNotice(
      copied ? "success" : "error",
      copied
        ? successText
        : "Clipboard copy was blocked. The old clipboard may still contain another app route."
    );
  }

  function openMarketplaceEmail(
    subject: string,
    body: string,
    url: string,
    missingText: string
  ) {
    if (!url || !safeStr(body)) {
      showNotice("error", missingText);
      return;
    }

    if (typeof window !== "undefined") {
      showNotice("success", "Opening email now.");
      window.location.href = `mailto:?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`;
    }
  }

  function openMarketplaceExternalLink(url: string, missingText: string) {
    if (!url) {
      showNotice("error", missingText);
      return;
    }

    if (typeof window !== "undefined") {
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) {
        showNotice("error", "The browser blocked that window. Copy the link and open it yourself.");
        return;
      }
      showNotice("success", "Opening link now.");
    }
  }

  async function handleStartLoanDraft() {
    if (startingLoanDraft) return;

    if (!activeCommunityId) {
      showNotice("error", "Select a community before starting a support request.");
      return;
    }

    const amount = safeStr(loanAmount);
    const durationDays = positiveNumber(loanDurationDays);

    if (!amount || Number(amount) <= 0) {
      showNotice("error", "Enter a valid loan amount.");
      return;
    }

    if (!durationDays) {
      showNotice("error", "Enter how long you want the loan for.");
      return;
    }

    setStartingLoanDraft(true);

    try {
      const createRes = await createLoanRequest({
        amount,
        currency: poolCurrency,
        clan_id: activeCommunityId,
        duration_days: durationDays,
        purpose: safeStr(loanPurpose),
        note: safeStr(loanPurpose),
      });

      const createdLoanId = positiveNumber(
        firstDefined(
          createRes?.id,
          createRes?.loan_id,
          createRes?.item?.id,
          createRes?.item?.loan_id,
          createRes?.data?.id,
          createRes?.data?.loan_id
        )
      );

      if (!createdLoanId) {
        throw new Error(
          "Support request started, but the system did not return a usable loan ID."
        );
      }

      await loadLoanDraftContext(createdLoanId, activeCommunityId);
      await loadPage();

      setSectionsTouched((prev) => touchedMarketplaceSectionState(prev, "support"));
      setSectionsOpen(focusedMarketplaceSectionState("support"));

      showNotice(
        "success",
        "Support request created. Review fit suggestions and send guarantor requests if needed."
      );
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Support request could not be started."
      );
    } finally {
      setStartingLoanDraft(false);
    }
  }

  async function handleRefreshSuggestions() {
    if (loadingSuggestions) return;

    if (!loanDraftId || !activeCommunityId) {
      showNotice("error", "Start the support request first.");
      return;
    }

    setLoadingSuggestions(true);

    try {
      const loaded = await loadLoanDraftContext(loanDraftId, activeCommunityId);

      if ((loaded?.suggestions || []).length === 0) {
        showNotice(
          "error",
          "No fit guarantor suggestion is available for this amount right now."
        );
      } else {
        showNotice("success", "Fit suggestions refreshed.");
      }
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Suggestions could not be refreshed."
      );
    } finally {
      setLoadingSuggestions(false);
    }
  }

  function toggleSuggestedSupporter(item: SuggestedSupporter) {
    setSelectedSupporters((prev) => {
      const exists = prev.some((entry) => entry.key === item.key);
      if (exists) {
        return prev.filter((entry) => entry.key !== item.key);
      }
      return [...prev, item];
    });
  }

  async function handleSendGuarantorRequests() {
    if (sendingGuarantorRequests) return;

    if (!activeCommunityId) {
      showNotice("error", "Select a community first.");
      return;
    }

    if (!loanDraftId) {
      showNotice("error", "Start the support request first.");
      return;
    }

    const requiredGuarantorCount = positiveNumber(
      loanDraftSummary?.guarantors_required
    );

    if (requiredGuarantorCount <= 0) {
      showNotice("error", "This support draft does not currently need guarantors.");
      return;
    }

    if (selectedSupporters.length < requiredGuarantorCount) {
      showNotice(
        "error",
        `Select ${requiredGuarantorCount} guarantor${
          requiredGuarantorCount === 1 ? "" : "s"
        } before sending requests.`
      );
      return;
    }

    setSendingGuarantorRequests(true);

    try {
      const targetAmount = extractGuaranteeTarget(
        loanSuggestionRaw,
        loanDraftSummary,
        loanAmount
      );

      const fallbackSplit = computePerGuarantorPledge(
        targetAmount > 0 ? targetAmount : Number(loanAmount || 0),
        selectedSupporters.length
      );

      for (const guarantor of selectedSupporters.slice(0, requiredGuarantorCount)) {
        const pledgeAmount = safeStr(guarantor.recommendedPledge) || fallbackSplit;

        if (!guarantor.userId) {
          throw new Error(
            `Selected guarantor '${guarantor.name}' does not have a usable user ID for request delivery.`
          );
        }

        await addLoanGuarantorRequest({
          loan_id: loanDraftId,
          guarantor_user_id: guarantor.userId,
          pledge_amount: pledgeAmount,
          clan_id: activeCommunityId,
        });
      }

      await loadLoanDraftContext(loanDraftId, activeCommunityId);
      await loadPage();
      setSelectedSupporters([]);

      showNotice(
        "success",
        "Guarantor requests sent successfully. Wait for responses."
      );
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Guarantor requests could not be sent."
      );
    } finally {
      setSendingGuarantorRequests(false);
    }
  }

  async function handleCancelLoanDraft() {
    if (cancellingLoanDraft) return;

    if (!loanDraftId) {
      resetLoanTaskState({ clearInputs: true });
      showNotice("success", "Support draft cleared.");
      return;
    }

    setCancellingLoanDraft(true);

    try {
      await cancelLoanRequest(loanDraftId, {
        clan_id: activeCommunityId || undefined,
      }).catch(() => null);

      await loadPage();
      resetLoanTaskState({ clearInputs: true });

      showNotice(
        "success",
        "Support draft cancelled. You can start again when ready."
      );
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Support draft could not be cancelled."
      );
    } finally {
      setCancellingLoanDraft(false);
    }
  }

  const loanStatusLower = safeStr(loanDraftSummary?.status).toLowerCase();
  const requiredGuarantorCount = positiveNumber(
    loanDraftSummary?.guarantors_required
  );
  const approvedGuarantorCount = positiveNumber(
    loanDraftSummary?.approved_guarantors
  );
  const sentGuarantorCount = positiveNumber(loanDraftSummary?.guarantors_total);
  const supportProcessBusy =
    startingLoanDraft ||
    loadingSuggestions ||
    sendingGuarantorRequests ||
    cancellingLoanDraft;
  const supportDraftStillOpen =
    !loanDraftId ||
    loanStatusLower === "pending" ||
    loanStatusLower === "incomplete" ||
    !loanStatusLower;
  const supportProcessMessage =
    supportProcessBusy
      ? "GSN is working on this support step now. Other support actions are held until this response finishes."
      : loanStatusLower === "incomplete"
      ? "Support is not complete yet. Choose another fit guarantor, send the next request, or cancel the draft if it should stop."
      : loanStatusLower === "approved"
      ? "Support is approved. Move to the loan summary or repayment path instead of sending more guarantor requests."
      : loanDraftId
      ? "Support is open. Keep the draft, suggestions, selected guarantors, and next response together here."
      : "Start one support request first. After it starts, GSN will show the next required response in this same lane.";

  const visibleSelectedSupporters = useMemo(
    () =>
      selectedSupporters.slice(
        0,
        requiredGuarantorCount || selectedSupporters.length
      ),
    [selectedSupporters, requiredGuarantorCount]
  );
  const guarantorRequestsBlocked =
    sendingGuarantorRequests ||
    requiredGuarantorCount <= 0 ||
    visibleSelectedSupporters.length < requiredGuarantorCount ||
    !supportDraftStillOpen ||
    loanStatusLower === "approved";

  const visibleTradeMemberRows = memberRows.slice(0, isCompact ? 3 : 5);
  const hiddenTradeMemberRows = memberRows.slice(visibleTradeMemberRows.length);
  const visibleTradeShopCount = memberRows.filter((row) => row.shopTo).length;

  function showGuarantorRequestBlockedNotice() {
    if (sendingGuarantorRequests) {
      showNotice("error", "GSN is already sending these guarantor requests.");
      return;
    }

    if (requiredGuarantorCount <= 0) {
      showNotice(
        "error",
        "Start or refresh the support draft first so GSN can show how many guarantors are needed."
      );
      return;
    }

    if (visibleSelectedSupporters.length < requiredGuarantorCount) {
      showNotice(
        "error",
        `Choose ${requiredGuarantorCount} guarantor${
          requiredGuarantorCount === 1 ? "" : "s"
        } before sending requests.`
      );
      return;
    }

    if (!supportDraftStillOpen || loanStatusLower === "approved") {
      showNotice(
        "error",
        "This support draft is no longer open for guarantor requests."
      );
      return;
    }

    showNotice(
      "error",
      "This guarantor request step is not ready yet. Check the draft status first."
    );
  }

  if (loading) {
    return (
      <MarketplaceShell isCompact={isCompact}>
        <section
          style={pageCard(marketplaceProfileBackground())}
        >
          <div style={sectionLabel()}>Marketplace</div>
          <div
            style={{
              marginTop: 10,
              color: "#0B1F33",
              fontSize: isCompact ? 30 : 40,
              fontWeight: 900,
              lineHeight: 1.08,
            }}
          >
            Selected community marketplace
          </div>
          <div style={{ marginTop: 12, ...helperText(), color: "#50667A" }}>
            Loading your current community...
          </div>
        </section>
      </MarketplaceShell>
    );
  }

  if (!activeCommunityId || !selectedCommunity) {
    return (
      <MarketplaceShell isCompact={isCompact}>
        {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

        <DomainIntroToggle
          title="Your Marketplace"
          eyebrow="Choose community first"
          body="Marketplace only opens after you choose one community first. Go to Community Home, pick the group you want, then come back here to work inside it."
          bullets={[
            "This is not the page for all your groups together.",
            "It shows one community's members, shops, links, demand, money signs, and trust signs.",
            "After choosing a community, come here to work inside that one community.",
          ]}
          note="Simple rule: choose the community first, then work inside it here."
          tone="blue"
        />

        <section
          style={pageCard(marketplaceProfileBackground())}
        >
          <div style={sectionLabel()}>Marketplace</div>

          <div
            style={{
              marginTop: 10,
              color: "#0B1F33",
              fontSize: isCompact ? 30 : 40,
              fontWeight: 900,
              lineHeight: 1.08,
              maxWidth: 760,
            }}
          >
            No community is active in Marketplace yet
          </div>

          <div style={{ marginTop: 12, ...helperText(), color: "#50667A", maxWidth: 860 }}>
            Choose a community in Community Home first, then return here to open
            that community's Marketplace.
          </div>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <StableButton
              type="button"
              debugId="marketplace.empty.community-home"
              onClick={(event) => openMarketplaceCta(event, "communityHome")}
              style={marketplaceActionStyle("primary")}
            >
              Community Home
            </StableButton>
            <StableButton
              type="button"
              debugId="marketplace.empty.dashboard"
              onClick={(event) => openMarketplaceCta(event, "dashboard")}
              style={marketplaceActionStyle("secondary")}
            >
              Dashboard
            </StableButton>
          </div>
        </section>
      </MarketplaceShell>
    );
  }

  return (
    <MarketplaceShell isCompact={isCompact}>
      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section style={marketplaceOsSectionStyle(isCompact)}>
        <div style={marketplaceOsHeaderStyle(isCompact)}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact
                ? "64px minmax(0, 1fr)"
                : "76px minmax(0, 1fr) auto",
              gap: isCompact ? 12 : 16,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: isCompact ? 58 : 68,
                height: isCompact ? 70 : 82,
                display: "grid",
                placeItems: "center",
              }}
            >
              <GSNBrandMark
                width={isCompact ? 48 : 56}
                height={isCompact ? 60 : 70}
              />
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: "#08233A",
                  fontSize: isCompact ? 20 : 26,
                  fontWeight: 950,
                  lineHeight: 1.08,
                  overflowWrap: "break-word",
                }}
              >
                GSN Marketplace
              </div>

              <div
                style={{
                  marginTop: 6,
                  color: "#4A6178",
                  fontSize: isCompact ? 13 : 15,
                  fontWeight: 850,
                  lineHeight: 1.35,
                  overflowWrap: "break-word",
                }}
              >
                {communityName(selectedCommunity)}. Trade. Support. Dues.
                Members. Records.
              </div>
            </div>

            <StableButton
              type="button"
              debugId="marketplace.tile.trust"
              aria-label="Open this marketplace trust summary"
              onClick={toggleProfileDetails}
              aria-expanded={profileDetailsOpen}
              stableHeight={isCompact ? 46 : 48}
              style={{
                ...(isCompact
                  ? {
                      gridColumn: "1 / span 2",
                      justifySelf: "start",
                      marginTop: 8,
                    }
                  : {}),
                border: "1px solid rgba(11,99,209,0.12)",
                borderRadius: 999,
                background:
                  "linear-gradient(180deg, rgba(235,246,255,0.98) 0%, rgba(220,237,250,0.96) 100%)",
                color: "#0B63D1",
                padding: "0 14px",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                fontWeight: 950,
                lineHeight: 1,
                boxShadow: "0 8px 18px rgba(10,24,49,0.08)",
                cursor: "pointer",
                touchAction: "manipulation",
              }}
            >
              <MarketplaceGlyph name="trust" size={16} />
              {marketplaceTrustDisplay}
            </StableButton>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            borderRadius: 24,
            border: "1px solid rgba(16,37,59,0.1)",
            background:
              "linear-gradient(180deg, rgba(238,246,252,0.98) 0%, rgba(222,235,247,0.96) 100%)",
            padding: isCompact ? 12 : 16,
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.84), 0 18px 34px rgba(10,24,49,0.08)",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: isCompact ? 10 : 12,
            }}
          >
            <StableButton
              type="button"
              debugId="marketplace.tile.money"
              aria-label="Open Money In, Money Out, dues and contributions"
              onClick={(event) =>
                openMarketplaceSection(event, "money", "marketplace-money-routes")
              }
              style={marketplaceFrontLaneCardStyle(isCompact)}
            >
              <span
                aria-hidden="true"
                style={marketplaceFrontLaneIconStyle(
                  "linear-gradient(180deg, #0B63D1 0%, #08264B 100%)",
                  isCompact
                )}
              >
                <MarketplaceGlyph name="pool" size={isCompact ? 30 : 34} />
              </span>
              <span style={marketplaceOsRowTextStackStyle()}>
                <span style={marketplaceOsRowTitleStyle(isCompact)}>
                  Finance & Pool
                </span>
                <span style={marketplaceOsRowDetailStyle(isCompact)}>
                  Pool, money in/out, and banking.
                </span>
                <span style={marketplaceFrontTagRowStyle()}>
                  <span
                    style={marketplaceFrontTagStyle("#0B4EA2", "#E7F1FE")}
                  >
                    Money In
                  </span>
                  <span
                    style={marketplaceFrontTagStyle("#0B4EA2", "#E7F1FE")}
                  >
                    Money Out
                  </span>
                  <span
                    style={marketplaceFrontTagStyle("#0B4EA2", "#E7F1FE")}
                  >
                    Banking Rails
                  </span>
                </span>
              </span>
              <span aria-hidden="true" style={marketplaceOsArrowStyle()}>
                <MarketplaceGlyph name="chevron" size={18} />
              </span>
            </StableButton>

            <StableButton
              type="button"
              debugId="marketplace.tile.rosca"
              aria-label="Open ROSCA contribution cycles for this marketplace"
              onClick={(event) =>
                openMarketplaceSection(event, "rosca", "marketplace-rosca")
              }
              style={marketplaceFrontLaneCardStyle(isCompact)}
            >
              <span
                aria-hidden="true"
                style={marketplaceFrontLaneIconStyle(
                  "linear-gradient(180deg, #B8871E 0%, #513A0B 100%)",
                  isCompact
                )}
              >
                <MarketplaceGlyph name="rosca" size={isCompact ? 30 : 34} />
              </span>
              <span style={marketplaceOsRowTextStackStyle()}>
                <span style={marketplaceOsRowTitleStyle(isCompact)}>
                  ROSCA
                </span>
                <span style={marketplaceOsRowDetailStyle(isCompact)}>
                  Member savings circle for this community.
                </span>
                <span style={marketplaceFrontTagRowStyle()}>
                  <span
                    style={marketplaceFrontTagStyle("#8A5B0A", "#F8EED6")}
                  >
                    Yearly Service
                  </span>
                  <span
                    style={marketplaceFrontTagStyle("#8A5B0A", "#F8EED6")}
                  >
                    Member Cycle
                  </span>
                  <span
                    style={marketplaceFrontTagStyle("#8A5B0A", "#F8EED6")}
                  >
                    Payout Record
                  </span>
                </span>
              </span>
              <span aria-hidden="true" style={marketplaceOsArrowStyle()}>
                <MarketplaceGlyph name="chevron" size={18} />
              </span>
            </StableButton>

            <StableButton
              type="button"
              debugId="marketplace.tile.members"
              aria-label="Open trusted trade, members and visible shops"
              onClick={(event) =>
                openMarketplaceSection(
                  event,
                  "members",
                  "marketplace-members-shops"
                )
              }
              style={marketplaceFrontLaneCardStyle(isCompact)}
            >
              <span
                aria-hidden="true"
                style={marketplaceFrontLaneIconStyle(
                  "linear-gradient(180deg, #D7A22D 0%, #805A0F 100%)",
                  isCompact
                )}
              >
                <MarketplaceGlyph name="trade" size={isCompact ? 30 : 34} />
              </span>
              <span style={marketplaceOsRowTextStackStyle()}>
                <span style={marketplaceOsRowTitleStyle(isCompact)}>
                  Trade & Shops
                </span>
                <span style={marketplaceOsRowDetailStyle(isCompact)}>
                  Shops, offers, and visible trade.
                </span>
                <span style={marketplaceFrontTagRowStyle()}>
                  <span
                    style={marketplaceFrontTagStyle("#805A0F", "#F7EED8")}
                  >
                    Trusted Trade
                  </span>
                  <span
                    style={marketplaceFrontTagStyle("#805A0F", "#F7EED8")}
                  >
                    Demand Box
                  </span>
                  <span
                    style={marketplaceFrontTagStyle("#805A0F", "#F7EED8")}
                  >
                    Public Shops
                  </span>
                </span>
              </span>
              <span aria-hidden="true" style={marketplaceOsArrowStyle()}>
                <MarketplaceGlyph name="chevron" size={18} />
              </span>
            </StableButton>

            <StableButton
              type="button"
              debugId="marketplace.tile.support"
              aria-label="Open Support Requests, guarantors and loans"
              onClick={(event) =>
                openMarketplaceSection(
                  event,
                  "support",
                  "marketplace-loans-support"
                )
              }
              style={marketplaceFrontLaneCardStyle(isCompact)}
            >
              <span
                aria-hidden="true"
                style={marketplaceFrontLaneIconStyle(
                  "linear-gradient(180deg, #25A65A 0%, #0B5A34 100%)",
                  isCompact
                )}
              >
                <MarketplaceGlyph name="support" size={isCompact ? 30 : 34} />
              </span>
              <span style={marketplaceOsRowTextStackStyle()}>
                <span style={marketplaceOsRowTitleStyle(isCompact)}>
                  Support & Loans
                </span>
                <span style={marketplaceOsRowDetailStyle(isCompact)}>
                  Get help and manage loans.
                </span>
                <span style={marketplaceFrontTagRowStyle()}>
                  <span
                    style={marketplaceFrontTagStyle("#0B6B3B", "#DFF3E8")}
                  >
                    Support Requests
                  </span>
                  <span
                    style={marketplaceFrontTagStyle("#0B6B3B", "#DFF3E8")}
                  >
                    Loan Process
                  </span>
                </span>
              </span>
              <span aria-hidden="true" style={marketplaceOsArrowStyle()}>
                <MarketplaceGlyph name="chevron" size={18} />
              </span>
            </StableButton>

            <StableButton
              type="button"
              debugId="marketplace.row.records-links"
              aria-label="Open Records and Links for this marketplace"
              onClick={(event) =>
                openMarketplaceSection(event, "tools", "marketplace-owned-links")
              }
              style={marketplaceFrontLaneCardStyle(isCompact)}
            >
              <span
                aria-hidden="true"
                style={marketplaceFrontLaneIconStyle(
                  "linear-gradient(180deg, #158BA0 0%, #075064 100%)",
                  isCompact
                )}
              >
                <MarketplaceGlyph name="links" size={isCompact ? 30 : 34} />
              </span>
              <span style={marketplaceOsRowTextStackStyle()}>
                <span style={marketplaceOsRowTitleStyle(isCompact)}>
                  Link Center
                </span>
                <span style={marketplaceOsRowDetailStyle(isCompact)}>
                  Share, verify, shop, repost.
                </span>
                <span style={marketplaceFrontTagRowStyle()}>
                  <span
                    style={marketplaceFrontTagStyle("#075064", "#E3F5F8")}
                  >
                    Join
                  </span>
                  <span
                    style={marketplaceFrontTagStyle("#075064", "#E3F5F8")}
                  >
                    Verify
                  </span>
                  <span
                    style={marketplaceFrontTagStyle("#075064", "#E3F5F8")}
                  >
                    Shop Face
                  </span>
                  <span
                    style={marketplaceFrontTagStyle("#075064", "#E3F5F8")}
                  >
                    Paid Repost
                  </span>
                </span>
              </span>
              <span aria-hidden="true" style={marketplaceOsArrowStyle()}>
                <MarketplaceGlyph name="chevron" size={18} />
              </span>
            </StableButton>

            <StableButton
              type="button"
              debugId="marketplace.extra-tools.toggle"
              onClick={toggleIntentGuide}
              aria-expanded={intentGuideOpen}
              style={marketplaceFrontLaneCardStyle(isCompact)}
            >
              <span
                aria-hidden="true"
                style={marketplaceFrontLaneIconStyle(
                  "linear-gradient(180deg, #173750 0%, #061827 100%)",
                  isCompact
                )}
              >
                <MarketplaceGlyph name="spark" size={isCompact ? 30 : 34} />
              </span>
              <span style={marketplaceOsRowTextStackStyle()}>
                <span style={marketplaceOsRowTitleStyle(isCompact)}>
                  More / Community Tools
                </span>
                <span style={marketplaceOsRowDetailStyle(isCompact)}>
                  Trust, ID, proof, messages, and route help.
                </span>
                <span style={marketplaceFrontTagRowStyle()}>
                  <span
                    style={marketplaceFrontTagStyle("#173750", "#EEF3F7")}
                  >
                    Trust
                  </span>
                  <span
                    style={marketplaceFrontTagStyle("#173750", "#EEF3F7")}
                  >
                    Identity
                  </span>
                  <span
                    style={marketplaceFrontTagStyle("#173750", "#EEF3F7")}
                  >
                    TrustSlip
                  </span>
                  <span
                    style={marketplaceFrontTagStyle("#173750", "#EEF3F7")}
                  >
                    Messages
                  </span>
                </span>
              </span>
              <span aria-hidden="true" style={marketplaceOsArrowStyle()}>
                <MarketplaceGlyph
                  name={intentGuideOpen ? "chevronUp" : "chevron"}
                  size={18}
                />
              </span>
            </StableButton>
          </div>

          <div
            style={{
              marginTop: 12,
              borderRadius: 18,
              border: "1px solid rgba(11,99,209,0.14)",
              background:
                "linear-gradient(180deg, rgba(240,247,255,0.98) 0%, rgba(229,240,250,0.96) 100%)",
              padding: isCompact ? "11px 12px" : "12px 14px",
              display: "grid",
              gridTemplateColumns: isCompact
                ? "40px minmax(0, 1fr)"
                : "44px minmax(0, 1fr)",
              gap: 10,
              alignItems: "center",
              overflow: "hidden",
              overflowAnchor: "none",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: isCompact ? 38 : 42,
                height: isCompact ? 38 : 42,
                borderRadius: 14,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                background:
                  "linear-gradient(180deg, #0B63D1 0%, #08315E 100%)",
                boxShadow:
                  "0 10px 18px rgba(10,24,49,0.14), inset 0 1px 0 rgba(255,255,255,0.22)",
              }}
            >
              <MarketplaceGlyph name="spark" size={isCompact ? 22 : 24} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...sectionLabel(), color: "#0B4EA2" }}>
                Focus your work
              </div>
              <div
                style={{
                  marginTop: 4,
                  color: "#173750",
                  fontSize: isCompact ? 13 : 14,
                  fontWeight: 800,
                  lineHeight: 1.35,
                  overflowWrap: "break-word",
                }}
              >
                Open one lane at a time. Everything else steps back.
              </div>
            </div>
          </div>

          {profileDetailsOpen ? (
            <div style={{ marginTop: 12, ...innerCard("#FFFFFF") }}>
              <div style={sectionLabel()}>Local Marketplace Trust</div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                This is this selected community's local trust signal. Use More
                / Community Tools when you need fuller proof routes.
              </div>
              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "repeat(4, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                {[
                  ["Marketplace ID", communityIdentity(selectedCommunity)],
                  ["Local trust", marketplaceTrustDisplay],
                  ["Trust events", marketplaceTrustEvidenceLabel],
                  ["Positive trust", marketplaceTrustPositiveLabel],
                  ["Negative trust", marketplaceTrustNegativeLabel],
                  [
                    "Local finance signal",
                    communityFinanceLabel(selectedCommunity),
                  ],
                ].map(([label, value]) => (
                  <div key={label} style={marketplaceProfileStatStyle()}>
                    <div style={sectionLabel()}>{label}</div>
                    <div
                      style={{
                        marginTop: 6,
                        color: "#0B1F33",
                        fontWeight: 950,
                        fontSize: 15,
                        lineHeight: 1.25,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {intentGuideOpen ? (
            <div style={intentGuideCardStyle()}>
              <div style={{ ...helperText(), marginBottom: 12 }}>
                Use this helper when the job is not one of the main cards.
                Search still understands money, ROSCA, support, shop, invite,
                demand, and records.
              </div>

              <form
                onSubmit={handleIntentSubmit}
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "minmax(0, 1fr) auto",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <input
                  {...marketplaceFieldTouchProps("marketplace.intent.query")}
                  value={intentQuery}
                  onChange={(event) => setIntentQuery(event.target.value)}
                  placeholder="Try: trust, identity, proof, messages..."
                  aria-label="Type what you want to do next"
                  style={{
                    ...inputStyle(),
                    fontWeight: 800,
                  }}
                />

                <StableButton
                  type="submit"
                  debugId="marketplace.intent.submit"
                  style={marketplaceActionStyle("primary")}
                >
                  {matchedIntent ? `Open ${matchedIntent.label}` : "Find action"}
                </StableButton>
              </form>

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
                {marketplaceIntentItems
                  .filter((item) => item.visible !== false)
                  .map((item) => (
                    <StableButton
                      key={item.id}
                      type="button"
                      debugId={`marketplace.intent.${item.id}`}
                      onClick={(event) => openMarketplaceIntent(event, item)}
                      style={intentChoiceStyle(item.tone)}
                    >
                      <span
                        style={{
                          color: "#0B1F33",
                          fontSize: 15,
                          fontWeight: 950,
                          lineHeight: 1.2,
                        }}
                      >
                        {item.label}
                      </span>
                      <span
                        style={{
                          color: "#52677C",
                          fontSize: 12,
                          fontWeight: 800,
                          lineHeight: 1.35,
                        }}
                      >
                        {item.detail}
                      </span>
                    </StableButton>
                  ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {sectionsOpen.money ? (
      <section
        id="marketplace-money-routes"
        style={{
          ...pageCard("#FFFFFF"),
          ...marketplaceSectionStyle(),
          order: 8,
          padding: isCompact ? 14 : 18,
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              minWidth: 0,
            }}
          >
            <span
              aria-hidden="true"
              style={marketplaceOsIconStyle(
                "linear-gradient(180deg, #2F73D8 0%, #1B4DA6 100%)",
                true
              )}
            >
              <MarketplaceGlyph name="pool" size={26} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: "#08233A",
                  fontSize: isCompact ? 20 : 24,
                  fontWeight: 950,
                  lineHeight: 1.08,
                  overflowWrap: "break-word",
                }}
              >
                Money Pool
              </div>
              <div
                style={{
                  marginTop: 5,
                  color: "#5E6F82",
                  fontSize: isCompact ? 14 : 16,
                  fontWeight: 750,
                  lineHeight: 1.25,
                }}
              >
                This community's pool, money in, and money out.
              </div>
            </div>
          </div>

          <StableButton
            type="button"
            debugId="marketplace.money.toggle"
            onClick={(event) => toggleSectionFromButton(event, "money")}
            style={marketplaceActionStyle("soft")}
          >
            {sectionsOpen.money ? "Collapse" : "Open"}{" "}
            <span aria-hidden="true" style={{ display: "inline-flex" }}>
              <MarketplaceGlyph
                name={sectionsOpen.money ? "chevronUp" : "chevron"}
                size={16}
              />
            </span>
          </StableButton>
        </div>

        {sectionsOpen.money ? (
          <div style={marketplaceMoneyPanelStyle(isCompact)}>
            <div style={marketplaceMoneyRouteCardStyle(isCompact)}>
              <span
                aria-hidden="true"
                style={marketplaceMoneyIconBubbleStyle(isCompact, "soft")}
              >
                <MarketplaceGlyph name="eye" size={isCompact ? 24 : 40} />
              </span>
              <div style={marketplaceMoneyTextStackStyle()}>
                <div style={marketplaceMoneyTitleStyle(isCompact)}>
                  Visible Pool
                </div>
                <div style={marketplaceMoneyValueStyle(isCompact)}>
                  {visiblePoolAmount} {visiblePoolCurrency}
                </div>
                <div style={marketplaceMoneyHelperStyle(isCompact)}>
                  Current pool view
                </div>
              </div>
              <div style={marketplaceMoneyStatusAreaStyle()}>
                <span
                  aria-hidden="true"
                  style={marketplaceMoneyChartBubbleStyle(isCompact)}
                >
                  <MarketplaceGlyph name="chart" size={isCompact ? 22 : 34} />
                </span>
              </div>
            </div>

            <div style={marketplaceMoneyRouteCardStyle(isCompact)}>
              <span
                aria-hidden="true"
                style={marketplaceMoneyIconBubbleStyle(isCompact, "gold")}
              >
                <MarketplaceGlyph name="bank" size={isCompact ? 24 : 40} />
              </span>
              <div style={marketplaceMoneyTextStackStyle()}>
                <div style={marketplaceMoneyTitleStyle(isCompact)}>
                  Community Account
                </div>
                <div
                  style={marketplaceMoneyRouteValueStyle(
                    isCompact,
                    communitySettlementReady
                  )}
                >
                  {communitySettlementReady
                    ? settlementSummary(moneySurface?.communitySettlement || null)
                    : "Not ready"}
                </div>
                <div style={marketplaceMoneyHelperStyle(isCompact)}>
                  Money In route
                </div>
              </div>
              <div style={marketplaceMoneyStatusAreaStyle()}>
                <span style={marketplaceMoneyStatusPillStyle(communitySettlementReady)}>
                  {communitySettlementReady ? "Ready" : "Not ready"}
                </span>
              </div>
            </div>

            <div style={marketplaceMoneyRouteCardStyle(isCompact)}>
              <span
                aria-hidden="true"
                style={marketplaceMoneyIconBubbleStyle(isCompact, "blue")}
              >
                <MarketplaceGlyph name="card" size={isCompact ? 24 : 40} />
              </span>
              <div style={marketplaceMoneyTextStackStyle()}>
                <div style={marketplaceMoneyTitleStyle(isCompact)}>
                  Personal Payout
                </div>
                <div style={marketplaceMoneyRouteValueStyle(isCompact, payoutReady)}>
                  {payoutReady ? payoutSummary(moneySurface) : "Not ready"}
                </div>
                <div style={marketplaceMoneyHelperStyle(isCompact)}>
                  Money Out route
                </div>
              </div>
              <div style={marketplaceMoneyStatusAreaStyle()}>
                <span style={marketplaceMoneyStatusPillStyle(payoutReady)}>
                  {payoutReady ? "Ready" : "Not ready"}
                </span>
              </div>
            </div>

            <div
              style={{
                ...marketplaceInlineActionsStyle(isCompact),
                gridColumn: isCompact ? "1 / -1" : undefined,
              }}
            >
              <StableButton
                debugId="marketplace.money.money-in"
                type="button"
                onClick={(event) => openMarketplaceCta(event, "moneyIn")}
                stableHeight={58}
                style={marketplaceInlineActionStyle("primary", false, isCompact)}
              >
                <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                  <MarketplaceGlyph name="cash" size={18} />
                </span>
                Money In
              </StableButton>
              <StableButton
                debugId="marketplace.money.money-out"
                type="button"
                onClick={(event) => openMarketplaceCta(event, "moneyOut")}
                stableHeight={58}
                style={marketplaceInlineActionStyle("secondary", false, isCompact)}
              >
                <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                  <MarketplaceGlyph name="card" size={18} />
                </span>
                Money Out
              </StableButton>
              <StableButton
                debugId="marketplace.money.finance"
                type="button"
                onClick={(event) => openMarketplaceCta(event, "finance")}
                stableHeight={58}
                style={marketplaceInlineActionStyle("secondary", false, isCompact)}
              >
                <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                  <MarketplaceGlyph name="chart" size={18} />
                </span>
                Finance
              </StableButton>
            </div>
          </div>
        ) : null}
      </section>
      ) : null}

      {sectionsOpen.rosca ? (
      <section
        id="marketplace-rosca"
        ref={roscaSectionRef}
        style={{
          ...pageCard("#FFFFFF"),
          ...marketplaceSectionStyle(),
          order: 9,
          padding: isCompact ? 14 : 18,
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              minWidth: 0,
            }}
          >
            <span
              aria-hidden="true"
              style={marketplaceOsIconStyle(
                "linear-gradient(180deg, #C9952F 0%, #6D470B 100%)",
                true
              )}
            >
              <MarketplaceGlyph name="rosca" size={26} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: "#08233A",
                  fontSize: isCompact ? 20 : 24,
                  fontWeight: 950,
                  lineHeight: 1.08,
                  overflowWrap: "break-word",
                }}
              >
                ROSCA
              </div>
              <div
                style={{
                  marginTop: 5,
                  color: "#5E6F82",
                  fontSize: isCompact ? 14 : 16,
                  fontWeight: 750,
                  lineHeight: 1.25,
                }}
              >
                Member savings circle for this community only
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(roscaYearlyActive)}>
              {roscaYearlyActive ? "Yearly active" : "GBP 60 yearly"}
            </span>
            <StableButton
              debugId="marketplace.rosca.toggle"
              type="button"
              onClick={(event) => toggleSectionFromButton(event, "rosca")}
              style={marketplaceActionStyle("soft")}
            >
              {sectionsOpen.rosca ? "Collapse" : "Open"}
            </StableButton>
          </div>
        </div>

        <ExplainToggle
          label="What this savings circle does"
          what="ROSCA helps a known group contribute on schedule and take turns receiving the pool."
          why="GSN records the plan, contribution expectations, and payout completion. It does not move external money by itself."
          next="Activate the yearly service first, then start the member cycle when the group is ready."
          tone="light"
          style={{ marginTop: 12 }}
        />

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {[
            ["1", "Activate yearly service", "Unlock this community's ROSCA desk."],
            ["2", "Choose members", "Select only the people in this cycle."],
            ["3", "Start cycle", "Set name, amount, currency, and days."],
          ].map(([step, title, detail]) => (
            <div
              key={step}
              style={{
                borderRadius: 18,
                border: "1px solid rgba(184,135,30,0.18)",
                background:
                  "linear-gradient(180deg, rgba(255,252,244,0.98) 0%, rgba(248,241,222,0.94) 100%)",
                padding: isCompact ? 12 : 14,
                overflow: "hidden",
                overflowAnchor: "none",
              }}
            >
              <div style={{ ...sectionLabel(), color: "#8A5A08" }}>
                Step {step}
              </div>
              <div
                style={{
                  marginTop: 6,
                  color: "#08233A",
                  fontSize: isCompact ? 15 : 16,
                  fontWeight: 950,
                  lineHeight: 1.2,
                  overflowWrap: "break-word",
                }}
              >
                {title}
              </div>
              <div
                style={{
                  marginTop: 5,
                  color: "#5E6F82",
                  fontSize: isCompact ? 12 : 13,
                  fontWeight: 800,
                  lineHeight: 1.35,
                  overflowWrap: "break-word",
                }}
              >
                {detail}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.05fr) minmax(300px, 0.95fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div style={innerCard("#FCFEFF")}>
            <div style={sectionLabel()}>Start cycle</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Build one named cycle at a time. Membership is selected for this
              cycle only; it is not the whole community unless you choose
              everyone.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "repeat(2, minmax(0, 1fr))"
                  : "1.2fr 0.8fr 0.6fr 0.6fr",
                gap: 10,
                alignItems: "end",
              }}
            >
              <label
                style={{
                  display: "block",
                  gridColumn: isCompact ? "1 / -1" : undefined,
                }}
              >
                <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                  Cycle name
                </div>
                <input
                  {...marketplaceFieldTouchProps("marketplace.rosca.title")}
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
                  {...marketplaceFieldTouchProps("marketplace.rosca.contribution")}
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
                  {...marketplaceFieldTouchProps("marketplace.rosca.currency")}
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
                  {...marketplaceFieldTouchProps("marketplace.rosca.interval-days")}
                  value={roscaIntervalDays}
                  onChange={(event) => setRoscaIntervalDays(event.target.value)}
                  style={{ ...inputStyle(), marginTop: 6 }}
                  inputMode="numeric"
                  placeholder="30"
                />
              </label>
            </div>

            <div
              style={{
                marginTop: 12,
                borderRadius: 16,
                border: "1px solid rgba(16,37,59,0.08)",
                background:
                  "linear-gradient(180deg, rgba(248,252,255,0.98) 0%, rgba(239,246,253,0.96) 100%)",
                padding: isCompact ? 10 : 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div style={sectionLabel()}>Membership</div>
                <span style={stableStatusPillStyle(selectedRoscaMemberIds.length >= 2)}>
                  {selectedRoscaMemberIds.length >= 2
                    ? `${selectedRoscaMemberIds.length} selected`
                    : "Choose 2+"}
                </span>
              </div>
              <div
                style={{
                  marginTop: 7,
                  color: "#41556B",
                  fontSize: isCompact ? 12 : 13,
                  fontWeight: 800,
                  lineHeight: 1.3,
                }}
              >
                Alerts, contribution references, and payout order follow these
                selected cycle members.
              </div>
              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "repeat(2, minmax(0, 1fr))"
                    : "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: 8,
                }}
              >
                {roscaSelectableMembers.length ? (
                  roscaSelectableMembers.map((member) => {
                    const selected = selectedRoscaMemberSet.has(member.userId);
                    return (
                      <label
                        key={member.userId}
                        style={{
                          minHeight: isCompact ? 50 : 56,
                          borderRadius: 14,
                          border: selected
                            ? "1px solid rgba(34,102,65,0.28)"
                            : "1px solid rgba(16,37,59,0.08)",
                          background: selected
                            ? "linear-gradient(180deg, #F1FBF5 0%, #DDEFE6 100%)"
                            : "#FFFFFF",
                          padding: "8px 9px",
                          display: "grid",
                          gridTemplateColumns: "22px minmax(0, 1fr)",
                          gap: 7,
                          alignItems: "center",
                          color: "#08233A",
                          fontWeight: 900,
                          overflow: "hidden",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          {...marketplaceFieldTouchProps(
                            `marketplace.rosca.member.${member.userId}`
                          )}
                          type="checkbox"
                          checked={selected}
                          onChange={(event) => {
                            const checked = event.currentTarget.checked;
                            setSelectedRoscaMemberIds((prev) => {
                              if (checked) {
                                return Array.from(new Set([...prev, member.userId]));
                              }
                              return prev.filter((userId) => userId !== member.userId);
                            });
                          }}
                          style={{
                            width: 18,
                            height: 18,
                            accentColor: "#1D6D46",
                          }}
                        />
                        <span style={{ minWidth: 0 }}>
                          <span
                            style={{
                              display: "block",
                              fontSize: isCompact ? 12 : 13,
                              lineHeight: 1.1,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {member.name}
                          </span>
                          <span
                            style={{
                              display: "block",
                              marginTop: 2,
                              color: "#617085",
                              fontSize: 10.5,
                              fontWeight: 850,
                              lineHeight: 1.1,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {firstTruthy(member.gmfnId, member.role, "member")}
                          </span>
                        </span>
                      </label>
                    );
                  })
                ) : (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      ...helperText(),
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    No visible marketplace members are ready for cycle selection.
                  </div>
                )}
              </div>
            </div>

            <div
              {...marketplaceFieldTouchProps("marketplace.rosca.actions")}
              style={{
                ...marketplaceInlineActionsStyle(isCompact),
                marginTop: 14,
              }}
            >
              <StableButton
                debugId="marketplace.rosca.activate-yearly"
                type="button"
                onClick={(event) => {
                  runMarketplaceAction(event, () => {
                    if (creatingRoscaPackage) return;
                    void createRoscaYearlyInstruction();
                  });
                }}
                stableHeight={58}
                style={marketplaceInlineActionStyle(
                  roscaYearlyActive ? "secondary" : "primary",
                  creatingRoscaPackage,
                  isCompact
                )}
              >
                {creatingRoscaPackage ? "Creating..." : "Activate yearly service"}
              </StableButton>
              <StableButton
                debugId="marketplace.rosca.start-cycle"
                type="button"
                onClick={(event) => {
                  runMarketplaceAction(event, () => {
                    if (startingRoscaCycle) return;
                    if (!roscaYearlyActive) {
                      showNotice(
                        "error",
                        "Activate the GBP 60 yearly ROSCA service before starting a cycle."
                      );
                      return;
                    }
                    void startMarketplaceRoscaCycle();
                  });
                }}
                stableHeight={58}
                style={marketplaceInlineActionStyle(
                  "primary",
                  startingRoscaCycle ||
                    !roscaYearlyActive ||
                    selectedRoscaMemberIds.length < 2,
                  isCompact
                )}
              >
                {startingRoscaCycle ? "Starting..." : "Start ROSCA Cycle"}
              </StableButton>
              <StableButton
                debugId="marketplace.rosca.record-payout"
                type="button"
                onClick={(event) => {
                  runMarketplaceAction(event, () => {
                    if (recordingRoscaPayoutKey) return;
                    if (nextRoscaPayoutRound && latestRoscaCycle?.cycle_id) {
                      void recordMarketplaceRoscaPayout(
                        String(latestRoscaCycle.cycle_id),
                        Number(nextRoscaPayoutRound.round_number || 0)
                      );
                      return;
                    }
                    showNotice(
                      "error",
                      "No ROSCA round is ready for payout recording yet."
                    );
                  });
                }}
                stableHeight={58}
                style={marketplaceInlineActionStyle(
                  "soft",
                  !nextRoscaPayoutRound ||
                    !latestRoscaCycle?.cycle_id ||
                    Boolean(recordingRoscaPayoutKey),
                  isCompact
                )}
              >
                {recordingRoscaPayoutKey ? "Recording..." : "Record payout"}
              </StableButton>
            </div>
          </div>

          <div style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)")}>
            <div style={sectionLabel()}>Cycle status</div>
            <div
              style={{
                marginTop: 10,
                display: "grid",
                gap: 9,
              }}
            >
              {[
                ["Service", roscaYearlyActive ? "Yearly service active" : "Inactive"],
                [
                  "Selected now",
                  selectedRoscaMembers.length >= 2
                    ? `${selectedRoscaMembers.length} cycle members`
                    : "Choose 2+ members",
                ],
                [
                  "Latest cycle",
                  latestRoscaCycle
                    ? firstTruthy(latestRoscaCycle.title, "ROSCA cycle")
                    : "No cycle started yet",
                ],
                [
                  "Latest members",
                  latestRoscaCycle?.member_user_ids?.length
                    ? `${latestRoscaCycle.member_user_ids.length} members in cycle`
                    : `${members.length} visible in marketplace`,
                ],
                [
                  "Frequency",
                  latestRoscaCycle?.interval_days
                    ? `Every ${positiveNumber(latestRoscaCycle.interval_days)} days`
                    : `${positiveNumber(roscaIntervalDays || 30)} days planned`,
                ],
                [
                  "Contributions",
                  latestRoscaCycle
                    ? `${positiveNumber(
                        latestRoscaCycle.total_confirmed_contributions
                      )} / ${positiveNumber(
                        latestRoscaCycle.total_expected_contributions
                      )} confirmed`
                    : "Waiting for first cycle",
                ],
                [
                  "Payouts",
                  latestRoscaCycle
                    ? `${positiveNumber(
                        latestRoscaCycle.total_recorded_payouts
                      )} / ${positiveNumber(latestRoscaCycle.total_rounds)} recorded`
                    : "Waiting for first cycle",
                ],
              ].map(([label, value]) => (
                <div key={label} style={marketplaceProfileStatStyle()}>
                  <div style={sectionLabel()}>{label}</div>
                  <div
                    style={{
                      marginTop: 6,
                      color: "#0B1F33",
                      fontWeight: 950,
                      fontSize: 15,
                      lineHeight: 1.25,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12, ...helperText(), fontSize: 12 }}>
              {roscaPackage?.message ||
                "ROSCA is tied to this selected community marketplace. Members must already belong to the community before they can be included in the cycle."}
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {sectionsOpen.tools ? (
      <section
        id="marketplace-owned-links"
        style={{ ...pageCard("#FFFFFF"), ...marketplaceSectionStyle(), order: 4 }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={sectionLabel()}>Marketplace links</div>
          <StableButton
            debugId="marketplace.links.toggle"
            type="button"
            onClick={(event) => toggleSectionFromButton(event, "tools")}
            style={{
              ...marketplaceActionStyle("soft"),
              width: 112,
              height: 46,
              minHeight: 46,
              maxHeight: 46,
            }}
          >
            <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
              <MarketplaceGlyph
                name={sectionsOpen.tools ? "chevronUp" : "chevron"}
                size={18}
              />
            </span>
            {sectionsOpen.tools ? "Close" : "Open"}
          </StableButton>
        </div>

        <div style={marketplaceLinkHeroStyle(isCompact)}>
          <div aria-hidden="true" style={marketplaceLinkHeroIconStyle(isCompact)}>
            <MarketplaceGlyph name="links" size={isCompact ? 42 : 52} />
          </div>
          <div style={marketplaceLinkHeroBodyStyle(isCompact)}>
            <div>
              <div style={marketplaceLinkHeroTitleStyle(isCompact)}>
                Link Center
              </div>
              <div style={marketplaceLinkHeroSubtitleStyle(isCompact)}>
                Share, verify, shop, repost.
              </div>
            </div>
            <div style={marketplaceLinkHeroPillRowStyle()}>
              <span style={marketplaceLinkHeroPillStyle()}>
                <MarketplaceGlyph name="links" size={16} />
                5 lanes
              </span>
              <span style={marketplaceLinkHeroPillStyle()}>
                <MarketplaceGlyph name="spark" size={16} />
                1 active
              </span>
              <span style={marketplaceLinkHeroPillStyle()}>
                <MarketplaceGlyph name="verify" size={16} />
                Fast links
              </span>
            </div>
          </div>
        </div>

        {sectionsOpen.tools ? (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                <div style={marketplaceLinkRowStyle(isCompact, true)}>
                  <div style={marketplaceLinkRowHeaderStyle(isCompact)}>
                    <span
                      aria-hidden="true"
                      style={marketplaceLinkRowIconStyle("blue", isCompact)}
                    >
                      <MarketplaceGlyph name="join" size={isCompact ? 25 : 30} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={marketplaceLinkRowTitleStyle(isCompact)}>
                        {isCompact ? "1. Join" : "1. Join Community"}
                      </div>
                      <div style={marketplaceLinkRowSubStyle(isCompact)}>
                        {isCompact ? "Community invite" : "Invite someone into this marketplace."}
                      </div>
                    </div>
                    <span
                      style={marketplaceLinkRowStatusStyle(
                        inviteLink ? "ready" : canManageMarketplaceLinks ? "warn" : "idle",
                        isCompact
                      )}
                    >
                      {inviteLink ? "Ready" : canManageMarketplaceLinks ? "Refresh" : "Admin"}
                    </span>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <span style={compactStatusPillStyle(Boolean(inviteLink))}>
                      {inviteLink
                        ? "Community join link ready"
                        : canManageMarketplaceLinks
                          ? "Join link not ready yet"
                          : "Admin prepares join link"}
                    </span>
                  </div>
                  <div style={marketplaceLinkSummaryStyle(isCompact)}>
                    <MarketplaceGlyph name={inviteLink ? "links" : "verify"} size={15} />
                    {inviteLink
                      ? personalizedInviteMaskedLabel
                      : marketplaceJoinLinkGuidance}
                  </div>
                  <div
                    style={{
                      marginTop: isCompact ? 8 : 10,
                      display: "grid",
                      gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                      gap: isCompact ? 8 : 10,
                    }}
                  >
                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                        Name
                      </span>
                      <input
                        {...marketplaceFieldTouchProps("marketplace.join.recipient-name")}
                        value={joinRecipientName}
                        onChange={(event) => setJoinRecipientName(event.target.value)}
                        placeholder="Receiver name"
                        style={inputStyle()}
                        aria-label="Receiver name for join invitation"
                      />
                    </label>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                        Note (optional)
                      </span>
                      <textarea
                        {...marketplaceFieldTouchProps("marketplace.join.invite-note")}
                        value={joinInviteNote}
                        onChange={(event) => setJoinInviteNote(event.target.value)}
                        placeholder="Short note"
                        rows={1}
                        style={{
                          ...textAreaStyle(),
                          minHeight: isCompact ? 40 : 44,
                          maxHeight: isCompact ? 40 : 44,
                          resize: "none",
                          overflowY: "auto",
                        }}
                        aria-label="Short personal note for join invitation"
                      />
                    </label>
                  </div>
                  <div style={marketplaceInlineActionsStyle(isCompact)}>
                    <StableButton
                      debugId="marketplace.links.join.copy"
                      type="button"
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          copyMarketplaceLink(
                            personalizedInviteLink,
                            "Join link copied.",
                            marketplaceJoinLinkMissingMessage
                          );
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "primary",
                        !inviteLink,
                        isCompact
                      )}
                    >
                      <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                        <MarketplaceGlyph name="copy" size={18} />
                      </span>
                      Copy
                    </StableButton>
                    <StableButton
                      debugId="marketplace.links.join.refresh"
                      type="button"
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          void handleCreateInviteLink();
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        creatingInviteLink || !canManageMarketplaceLinks,
                        isCompact
                      )}
                    >
                      {creatingInviteLink
                        ? "Refreshing..."
                        : canManageMarketplaceLinks
                          ? (
                            <>
                              <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                                <MarketplaceGlyph name="refresh" size={18} />
                              </span>
                              Refresh
                            </>
                          )
                          : "Admin only"}
                    </StableButton>
                    <StableButton
                      debugId="marketplace.links.join.copy-message"
                      type="button"
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          copyMarketplaceMessage(
                            joinWhatsappMessage,
                            personalizedInviteLink,
                            "Join message copied.",
                            marketplaceJoinLinkMissingMessage
                          );
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        !inviteLink,
                        isCompact
                      )}
                    >
                      <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                        <MarketplaceGlyph name="copy" size={18} />
                      </span>
                      Copy Text
                    </StableButton>
                    <StableButton
                      debugId="marketplace.links.join.email"
                      type="button"
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          openMarketplaceEmail(
                            joinEmailSubject,
                            joinWhatsappMessage,
                            personalizedInviteLink,
                            marketplaceJoinLinkMissingMessage
                          );
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        !inviteLink,
                        isCompact
                      )}
                    >
                      <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                        <MarketplaceGlyph name="email" size={18} />
                      </span>
                      Email
                    </StableButton>
                    <StableButton
                      debugId="marketplace.links.join.whatsapp"
                      type="button"
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          if (!inviteLink) {
                            showNotice("error", marketplaceJoinLinkMissingMessage);
                            return;
                          }
                          openMarketplaceExternalLink(
                            `https://wa.me/?text=${encodeURIComponent(joinWhatsappMessage)}`,
                            marketplaceJoinLinkMissingMessage
                          );
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        !inviteLink,
                        isCompact
                      )}
                    >
                      <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                        <MarketplaceGlyph name="whatsapp" size={18} />
                      </span>
                      WhatsApp
                    </StableButton>
                  </div>
                  {!isCompact ? (
                    <div style={joinShareMessageCardStyle(isCompact)}>
                      <div style={sectionLabel()}>Message to send</div>
                      <div
                        style={{
                          marginTop: 8,
                          ...helperText(),
                          whiteSpace: "pre-line",
                          fontSize: 13,
                        }}
                      >
                        {inviteLink
                          ? joinWhatsappPreview
                          : marketplaceJoinPreviewPendingMessage}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div style={marketplaceLinkRowStyle(isCompact)}>
                  <div style={marketplaceLinkRowHeaderStyle(isCompact)}>
                    <span
                      aria-hidden="true"
                      style={marketplaceLinkRowIconStyle("navy", isCompact)}
                    >
                      <MarketplaceGlyph name="verify" size={isCompact ? 25 : 30} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={marketplaceLinkRowTitleStyle(isCompact)}>
                        {isCompact ? "2. Verify" : "2. Verify Community"}
                      </div>
                      <div style={marketplaceLinkRowSubStyle(isCompact)}>
                        Public record
                      </div>
                    </div>
                    <span
                      style={marketplaceLinkRowStatusStyle(
                        publicCommunityWorkspaceLink ? "ready" : "idle",
                        isCompact
                      )}
                    >
                      {publicCommunityWorkspaceLink ? "Ready" : "Pending"}
                    </span>
                  </div>
                  <div style={marketplaceLinkSummaryStyle(isCompact)}>
                    <MarketplaceGlyph name="verify" size={15} />
                    {publicCommunityWorkspaceLink
                      ? maskedMarketplaceFaceLabel
                      : "Community verification appears after the community context is ready."}
                  </div>
                  <div style={marketplaceInlineActionsStyle(isCompact)}>
                    <StableButton
                      debugId="marketplace.links.community-desk.copy"
                      type="button"
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          copyMarketplaceLink(
                            publicCommunityWorkspaceLink,
                            "Community verification link copied.",
                            "Community verification link is not ready yet."
                          );
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        !publicCommunityWorkspaceLink,
                        isCompact
                      )}
                    >
                      <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                        <MarketplaceGlyph name="copy" size={18} />
                      </span>
                      Copy Link
                    </StableButton>
                    <StableButton
                      debugId="marketplace.links.community-desk.email"
                      type="button"
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          openMarketplaceEmail(
                            marketplaceEmailSubject,
                            marketplaceEmailMessage,
                            publicCommunityWorkspaceLink,
                            "Community verification link is not ready yet."
                          );
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        !publicCommunityWorkspaceLink,
                        isCompact
                      )}
                    >
                      <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                        <MarketplaceGlyph name="email" size={18} />
                      </span>
                      Email
                    </StableButton>
                    <StableButton
                      debugId="marketplace.links.community-desk.open"
                      type="button"
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          openMarketplaceExternalLink(
                            publicCommunityWorkspaceLink,
                            "Community verification link is not ready yet."
                          );
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        !publicCommunityWorkspaceLink,
                        isCompact
                      )}
                    >
                      <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                        <MarketplaceGlyph name="open" size={18} />
                      </span>
                      Open
                    </StableButton>
                  </div>
                </div>

                <div style={marketplaceLinkRowStyle(isCompact)}>
                  <div style={marketplaceLinkRowHeaderStyle(isCompact)}>
                    <span
                      aria-hidden="true"
                      style={marketplaceLinkRowIconStyle("gold", isCompact)}
                    >
                      <MarketplaceGlyph name="shop" size={isCompact ? 25 : 30} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={marketplaceLinkRowTitleStyle(isCompact)}>
                        {isCompact ? "3. Shop Face" : "3. Public Shop Face"}
                      </div>
                      <div style={marketplaceLinkRowSubStyle(isCompact)}>
                        Storefront link
                      </div>
                    </div>
                    <span
                      style={{
                        ...stableStatusPillStyle(Boolean(publicShopViewLink)),
                        padding: "0 10px",
                        color: publicShopViewLink ? "#12633F" : "#8A5A05",
                        background: publicShopViewLink
                          ? "linear-gradient(180deg, #EEFBF4 0%, #D9F0E3 100%)"
                          : "linear-gradient(180deg, #FFF9E8 0%, #F6E6C3 100%)",
                        border: publicShopViewLink
                          ? "1px solid rgba(46,155,98,0.18)"
                          : "1px solid rgba(214,170,69,0.28)",
                        justifyContent: "center",
                        gridColumn: isCompact ? "2 / 3" : undefined,
                        justifySelf: isCompact ? "start" : undefined,
                        height: isCompact ? 28 : undefined,
                        minHeight: isCompact ? 28 : undefined,
                        maxHeight: isCompact ? 28 : undefined,
                      }}
                    >
                      {publicShopViewLink
                        ? "Ready"
                        : publicShopRecord
                        ? "Refreshing"
                        : "Needs refresh"}
                    </span>
                  </div>
                  <div style={marketplaceLinkSummaryStyle(isCompact)}>
                    <MarketplaceGlyph name="shop" size={15} />
                    {publicShopViewLink ? (
                      <StableCtaLink
                        to={publicShopViewLink}
                        target="_blank"
                        rel="noreferrer"
                        debugId="marketplace.public-shop.visible-link"
                        style={{
                          display: "inline",
                          width: "auto",
                          minWidth: 0,
                          minHeight: 0,
                          height: "auto",
                          padding: 0,
                          border: "0",
                          background: "transparent",
                          boxShadow: "none",
                          color: "inherit",
                          fontWeight: 850,
                          textDecoration: "underline",
                          textUnderlineOffset: 3,
                          touchAction: "manipulation",
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                          lineHeight: 1.2,
                        }}
                      >
                        {isCompact ? buildMaskedLinkLabel(publicShopViewLink, "shop", activeCommunityName) : publicShopViewLink}
                      </StableCtaLink>
                    ) : (
                      publicShopUnavailableText
                    )}
                  </div>
                  <div style={marketplaceInlineActionsStyle(isCompact)}>
                    <StableButton
                      type="button"
                      debugId="marketplace.public-shop.refresh"
                      stableHeight={58}
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          if (publicShopActionsLocked) {
                            showNotice(
                              "error",
                              publicShopActionUnavailableMessage(
                                preparingPublicShopLink,
                                publicShopUnavailableText
                              )
                            );
                            return;
                          }
                          void preparePublicShopLink();
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "primary",
                        publicShopActionsLocked,
                        isCompact
                      )}
                    >
                      {preparingPublicShopLink ? (
                        "Refreshing..."
                      ) : (
                        <>
                          <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                            <MarketplaceGlyph name="refresh" size={18} />
                          </span>
                          Refresh
                        </>
                      )}
                    </StableButton>
                    <StableButton
                      type="button"
                      debugId="marketplace.public-shop.copy"
                      stableHeight={58}
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          if (publicShopActionsLocked) {
                            showNotice(
                              "error",
                              publicShopActionUnavailableMessage(
                                preparingPublicShopLink,
                                publicShopUnavailableText
                              )
                            );
                            return;
                          }
                          void copyFreshPublicShopLink();
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        publicShopActionsLocked,
                        isCompact
                      )}
                    >
                      {preparingPublicShopLink ? (
                        "Refreshing..."
                      ) : (
                        <>
                          <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                            <MarketplaceGlyph name="copy" size={18} />
                          </span>
                          Copy
                        </>
                      )}
                    </StableButton>
                    <StableButton
                      type="button"
                      debugId="marketplace.public-shop.email"
                      stableHeight={58}
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          if (publicShopActionsLocked) {
                            showNotice(
                              "error",
                              publicShopActionUnavailableMessage(
                                preparingPublicShopLink,
                                publicShopUnavailableText
                              )
                            );
                            return;
                          }
                          void emailFreshPublicShopLink();
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        publicShopActionsLocked,
                        isCompact
                      )}
                    >
                      <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                        <MarketplaceGlyph name="email" size={18} />
                      </span>
                      Email
                    </StableButton>
                    <StableButton
                      type="button"
                      debugId="marketplace.public-shop.open"
                      stableHeight={58}
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          if (publicShopActionsLocked) {
                            showNotice(
                              "error",
                              publicShopActionUnavailableMessage(
                                preparingPublicShopLink,
                                publicShopUnavailableText
                              )
                            );
                            return;
                          }
                          openReadyPublicShopLink();
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        publicShopActionsLocked,
                        isCompact
                      )}
                    >
                      <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                        <MarketplaceGlyph name="open" size={18} />
                      </span>
                      Open
                    </StableButton>
                  </div>
                </div>

                <div
                  id="marketplace-paid-network-placement"
                  {...marketplaceFieldTouchProps("marketplace.network-repost.surface")}
                  style={{
                    ...marketplaceLinkRowStyle(isCompact),
                    scrollMarginTop: isCompact ? 84 : 104,
                    position: "relative",
                    pointerEvents: "auto",
                  }}
                >
                  <div style={marketplaceLinkRowHeaderStyle(isCompact)}>
                    <span
                      aria-hidden="true"
                      style={marketplaceLinkRowIconStyle("green", isCompact)}
                    >
                      <MarketplaceGlyph name="repost" size={isCompact ? 25 : 30} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={marketplaceLinkRowTitleStyle(isCompact)}>
                        {isCompact ? "4. Repost" : "4. Paid Repost"}
                      </div>
                      <div style={marketplaceLinkRowSubStyle(isCompact)}>
                        Target, duration, credits.
                      </div>
                    </div>
                    <span
                      style={marketplaceLinkRowStatusStyle(
                        selectedRepostProduct || canPlaceMarketplaceRepost ? "ready" : "idle",
                        isCompact
                      )}
                    >
                      {selectedRepostProduct || canPlaceMarketplaceRepost ? "Ready" : "Set up"}
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      display: isCompact ? "none" : "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={badge(Boolean(selectedRepostProduct))}>
                      {loadingRepostProducts
                        ? "Loading block"
                        : selectedRepostProduct
                        ? "Block ready"
                        : "No block ready"}
                    </span>
                    <span style={badge(Boolean(resolvedRepostTargetCommunityInput))}>
                      {resolvedRepostTargetCommunityInput
                        ? `Target ${resolvedRepostTargetCommunityInput}`
                        : "Target needed"}
                    </span>
                    <span style={badge(true)}>
                      {resolvedRepostDurationDays} day{resolvedRepostDurationDays === 1 ? "" : "s"}
                    </span>
                    <span style={badge(canPlaceMarketplaceRepost)}>
                      {availableMarketplaceRepostCredits} credit{availableMarketplaceRepostCredits === 1 ? "" : "s"}
                    </span>
                  </div>
                  {selectedRepostProduct ? (
                    <div
                      style={{
                        marginTop: 12,
                        minHeight: isCompact ? 92 : 190,
                        padding: isCompact ? 9 : 12,
                        borderRadius: isCompact ? 17 : 20,
                        border: "1px solid rgba(11, 45, 74, 0.14)",
                        background:
                          "linear-gradient(135deg, rgba(7,23,44,0.96) 0%, rgba(13,54,88,0.92) 100%)",
                        color: "#FFFFFF",
                        display: "grid",
                        gridTemplateColumns: isCompact
                          ? "72px minmax(0, 1fr)"
                          : "minmax(160px, 0.42fr) minmax(0, 1fr)",
                        gap: isCompact ? 9 : 12,
                        alignItems: isCompact ? "center" : "stretch",
                        overflow: "hidden",
                        overflowAnchor: "none",
                        transition: "none",
                      }}
                    >
                      <div
                        style={{
                          minHeight: isCompact ? 72 : 164,
                          height: isCompact ? 72 : undefined,
                          borderRadius: isCompact ? 14 : 18,
                          overflow: "hidden",
                          background:
                            "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))",
                          border: "1px solid rgba(255,255,255,0.18)",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        {selectedRepostProductVideoSrc ? (
                          <video
                            src={selectedRepostProductVideoSrc}
                            poster={selectedRepostProductImageSrc || undefined}
                            muted
                            playsInline
                            controls
                            style={{
                              width: "100%",
                              height: "100%",
                              minHeight: isCompact ? 72 : 164,
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        ) : selectedRepostProductImageSrc ? (
                          <img
                            src={selectedRepostProductImageSrc}
                            alt={selectedRepostProduct.title}
                            style={{
                              width: "100%",
                              height: "100%",
                              minHeight: isCompact ? 72 : 164,
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              padding: 14,
                              textAlign: "center",
                              fontWeight: 950,
                              color: "rgba(255,255,255,0.82)",
                            }}
                          >
                            Block #{selectedRepostProduct.blockNumber || "?"}
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          minWidth: 0,
                          display: "grid",
                          gap: isCompact ? 5 : 9,
                          alignContent: "center",
                        }}
                      >
                        <div
                          style={{
                            ...sectionLabel(),
                            color: "#F2C766",
                            display: isCompact ? "none" : undefined,
                          }}
                        >
                          Selected public block
                        </div>
                        <div
                          style={{
                            fontSize: isCompact ? 15 : 26,
                            lineHeight: isCompact ? 1.12 : 1.05,
                            fontWeight: 950,
                            overflowWrap: "break-word",
                            wordBreak: "normal",
                            display: isCompact ? "-webkit-box" : undefined,
                            WebkitLineClamp: isCompact ? 2 : undefined,
                            WebkitBoxOrient: isCompact ? "vertical" : undefined,
                            overflow: "hidden",
                          }}
                        >
                          Block #{selectedRepostProduct.blockNumber || "?"}:{" "}
                          {selectedRepostProduct.title}
                        </div>
                        {selectedRepostProduct.description && !isCompact ? (
                          <div
                            style={{
                              color: "rgba(255,255,255,0.78)",
                              fontSize: 14,
                              lineHeight: 1.45,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {selectedRepostProduct.description}
                          </div>
                        ) : null}
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            alignItems: "center",
                            minWidth: 0,
                          }}
                        >
                          {repostProductPriceLabel(selectedRepostProduct) ? (
                            <span
                              style={{
                                ...badge(true),
                                background: "rgba(242,199,102,0.16)",
                                color: "#FFF4C7",
                              }}
                            >
                              {repostProductPriceLabel(selectedRepostProduct)}
                            </span>
                          ) : null}
                          {!isCompact ? (
                            <>
                              <span
                                style={{
                                  ...badge(true),
                                  background: "rgba(255,255,255,0.12)",
                                  color: "#FFFFFF",
                                }}
                              >
                                Product ID {selectedRepostProduct.id}
                              </span>
                              <span
                                style={{
                                  ...badge(true),
                                  background: "rgba(255,255,255,0.12)",
                                  color: "#FFFFFF",
                                }}
                              >
                                Exact block handoff
                              </span>
                            </>
                          ) : null}
                        </div>
                        {!isCompact ? (
                          <div
                            style={{
                              color: "rgba(255,255,255,0.72)",
                              fontSize: 13,
                              lineHeight: 1.45,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {selectedRepostProduct.originShopName
                              ? `From ${selectedRepostProduct.originShopName}. `
                              : ""}
                            {selectedRepostProduct.sellerGmfnId
                              ? `GSN ID ${displayGsnLabel(selectedRepostProduct.sellerGmfnId)}.`
                              : "This block will carry its shop identity into the target Spotlight."}
                          </div>
                        ) : null}
                        <StableButton
                          type="button"
                          debugId="marketplace.network-repost.selected-block.copy-link"
                          stableHeight={48}
                          onClick={(event) => {
                            runMarketplaceAction(event, () => {
                              if (!selectedRepostProductPublicLink) {
                                showNotice(
                                  "error",
                                  "This block link is not ready yet."
                                );
                                return;
                              }
                              void safeCopy(selectedRepostProductPublicLink).then(
                                (copied) => {
                                  showNotice(
                                    copied ? "success" : "error",
                                    copied
                                      ? "Exact block link copied."
                                      : "This block link could not be copied."
                                  );
                                }
                              );
                            });
                          }}
                          style={{
                            ...marketplaceInlineActionStyle(
                              "soft",
                              !selectedRepostProductPublicLink,
                              isCompact
                            ),
                            display: isCompact ? "none" : undefined,
                            height: 48,
                            minHeight: 48,
                            maxHeight: 48,
                            maxWidth: isCompact ? "100%" : 220,
                          }}
                        >
                          Copy exact block link
                        </StableButton>
                      </div>
                    </div>
                  ) : loadingRepostProducts &&
                    (routeRepostProductId || routeRepostBlockNumber) ? (
                    <div
                      style={{
                        marginTop: 12,
                        minHeight: 96,
                        padding: 14,
                        borderRadius: 18,
                        border: "1px solid rgba(214, 170, 69, 0.28)",
                        background: "rgba(214, 170, 69, 0.12)",
                        color: "#0B1F33",
                        display: "grid",
                        alignContent: "center",
                        gap: 6,
                        overflowAnchor: "none",
                        transition: "none",
                      }}
                    >
                      <div style={{ fontWeight: 950 }}>
                        Loading the selected block...
                      </div>
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        Wait for this block before choosing the target
                        community.
                      </div>
                    </div>
                  ) : routeRepostProductId || routeRepostBlockNumber ? (
                    <div
                      style={{
                        marginTop: 12,
                        minHeight: 108,
                        padding: 14,
                        borderRadius: 18,
                        border: "1px solid rgba(139, 25, 25, 0.2)",
                        background: "rgba(255, 239, 239, 0.92)",
                        color: "#3B1420",
                        display: "grid",
                        alignContent: "center",
                        gap: 6,
                        overflowAnchor: "none",
                        transition: "none",
                      }}
                    >
                      <div style={{ fontWeight: 950 }}>
                        This block did not load yet.
                      </div>
                      <div style={{ ...helperText(), fontSize: 13, color: "#6B2630" }}>
                        Return to Shop Diaries and tap Repost again.
                      </div>
                    </div>
                  ) : null}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "minmax(0, 1fr) minmax(112px, 0.48fr)"
                        : "minmax(0, 1fr) minmax(0, 1fr) minmax(150px, 0.55fr)",
                      gap: 10,
                      marginTop: 12,
                    }}
                  >
                    <label
                      style={{
                        display: "grid",
                        gap: 6,
                        color: "#0B1F33",
                        fontWeight: 850,
                        gridColumn: isCompact ? "1 / -1" : undefined,
                      }}
                    >
                      <span style={{ fontSize: 12 }}>Public block</span>
                      <select
                        {...marketplaceFieldTouchProps(
                          "marketplace.network-repost.public-block-select"
                        )}
                        value={String(selectedRepostProduct?.id || "")}
                        onChange={(event) =>
                          setSelectedRepostProductId(Number(event.target.value || 0))
                        }
                        data-gmfn-control-state={
                          loadingRepostProducts
                            ? "loading"
                            : visibleRepostProducts.length === 0
                              ? "empty"
                              : "ready"
                        }
                        style={{
                          ...inputStyle(),
                          opacity: loadingRepostProducts ? 0.78 : 1,
                        }}
                      >
                        {visibleRepostProducts.length === 0 ? (
                          <option value="">
                            {loadingRepostProducts
                              ? "Loading public blocks..."
                              : "No public block is ready"}
                          </option>
                        ) : (
                          visibleRepostProducts.map((product) => (
                            <option key={`marketplace-repost-product-${product.id}`} value={product.id}>
                              {repostProductLabel(product)}
                            </option>
                          ))
                        )}
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: 6, color: "#0B1F33", fontWeight: 850 }}>
                      <span style={{ fontSize: 12 }}>Target community ID</span>
                      <input
                        {...marketplaceFieldTouchProps(
                          "marketplace.network-repost.target-community-input"
                        )}
                        inputMode="text"
                        value={repostTargetMarketplaceId}
                        onChange={(event) =>
                          setRepostTargetMarketplaceId(event.target.value.trim())
                        }
                        placeholder="GMFN-C-000008"
                        style={inputStyle()}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 6, color: "#0B1F33", fontWeight: 850 }}>
                      <span style={{ fontSize: 12 }}>Duration</span>
                      <select
                        {...marketplaceFieldTouchProps(
                          "marketplace.network-repost.duration-select"
                        )}
                        value={repostDurationDays}
                        onChange={(event) => setRepostDurationDays(event.target.value)}
                        style={inputStyle()}
                      >
                        <option value="1">1 day</option>
                        <option value="3">3 days</option>
                        <option value="5">5 days</option>
                        <option value="7">7 days</option>
                        <option value="14">14 days</option>
                        <option value="30">30 days</option>
                      </select>
                    </label>
                  </div>
                  {selectedRepostProduct ? (
                    <div
                      style={{
                        marginTop: 10,
                        display: isCompact ? "none" : "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={badge(true)}>
                        Block identity kept
                      </span>
                      <span style={badge(true)}>
                        {selectedRepostProduct.repostsUsed} placements recorded
                      </span>
                      <span style={badge(canPlaceMarketplaceRepost)}>
                        Needs {requiredMarketplaceRepostCredits} paid credit{requiredMarketplaceRepostCredits === 1 ? "" : "s"}
                      </span>
                    </div>
                  ) : null}
                  <details
                    open={!isCompact}
                    style={{
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 18,
                      border: "1px solid rgba(11, 45, 74, 0.12)",
                      background: "rgba(234, 243, 255, 0.72)",
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <StableDisclosureSummary
                      debugId="marketplace.network-repost.target-help.summary"
                      stableHeight={36}
                      style={{
                        cursor: "pointer",
                        color: "#0B1F33",
                        fontWeight: 950,
                        listStyle: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <span>Target help</span>
                      <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                        <MarketplaceGlyph name="target" size={18} />
                      </span>
                    </StableDisclosureSummary>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 950,
                            color: "#0B1F33",
                            display: isCompact ? "none" : undefined,
                          }}
                        >
                          Target help
                        </div>
                        <div style={{ ...helperText(), fontSize: 13 }}>
                          Find communities that fit this block.
                        </div>
                      </div>
                      <StableButton
                        type="button"
                        debugId="marketplace.network-repost.find-targets"
                        stableHeight={50}
                        onClick={(event) => {
                          runMarketplaceAction(event, () => {
                            if (loadingRepostTargetSuggestions) {
                              showNotice(
                                "error",
                                "GSN is already finding target IDs for this block."
                              );
                              return;
                            }
                            void loadMarketplaceRepostTargetSuggestions();
                          });
                        }}
                        style={{
                          ...marketplaceInlineActionStyle(
                            "secondary",
                            loadingRepostTargetSuggestions || !selectedRepostProduct,
                            false
                          ),
                          height: 50,
                          minHeight: 50,
                          maxHeight: 50,
                          minWidth: isCompact ? "100%" : 180,
                          flex: "0 0 auto",
                        }}
                      >
                        {loadingRepostTargetSuggestions ? (
                          "Finding..."
                        ) : (
                          <>
                            <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                              <MarketplaceGlyph name="target" size={18} />
                            </span>
                            Targets
                          </>
                        )}
                      </StableButton>
                    </div>
                    {repostTargetSuggestionError ? (
                      <div style={{ ...helperText(), fontSize: 13, color: "#8A1F1F" }}>
                        {repostTargetSuggestionError}
                      </div>
                    ) : null}
                    {repostTargetSuggestions.length ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        {repostTargetSuggestions.slice(0, 3).map((item, index) => {
                          const code = safeStr(item.community_code);
                          const title = firstTruthy(
                            item.marketplace_name,
                            item.public_name,
                            code
                          );
                          const reasons = Array.isArray(item.reasons)
                            ? item.reasons.filter(Boolean).slice(0, 2)
                            : [];
                          const score = positiveNumber(item.score);
                          return (
                            <div
                              key={`marketplace-repost-target-${code || index}`}
                              style={{
                                display: "grid",
                                gridTemplateColumns: isCompact
                                  ? "1fr"
                                  : "minmax(0, 1fr) 132px",
                                gap: 8,
                                alignItems: "center",
                                padding: 10,
                                borderRadius: 16,
                                background: "#FFFFFF",
                                border: "1px solid rgba(11, 45, 74, 0.1)",
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    fontWeight: 900,
                                    color: "#0B1F33",
                                    overflowWrap: "anywhere",
                                  }}
                                >
                                  {title}
                                </div>
                                <div style={{ ...helperText(), fontSize: 12 }}>
                                  {code}
                                  {score ? ` | fit ${score}%` : ""}
                                </div>
                                {reasons.length ? (
                                  <div style={{ ...helperText(), fontSize: 12 }}>
                                    {reasons.join(" | ")}
                                  </div>
                                ) : null}
                              </div>
                              <StableButton
                                type="button"
                                debugId={`marketplace.network-repost.target.${code || index}.use`}
                                stableHeight={46}
                                onClick={(event) => {
                                  runMarketplaceAction(event, () => {
                                    if (!code) {
                                      showNotice(
                                        "error",
                                        "This target community ID is not ready yet."
                                      );
                                      return;
                                    }
                                    setRepostTargetMarketplaceId(code);
                                    showNotice(
                                      "success",
                                      `${code} selected for Paid Repost.`
                                    );
                                  });
                                }}
                                style={{
                                  ...marketplaceInlineActionStyle(
                                    "primary",
                                    !code,
                                    isCompact
                                  ),
                                  height: 46,
                                  minHeight: 46,
                                  maxHeight: 46,
                                }}
                              >
                                <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                                  <MarketplaceGlyph name="target" size={18} />
                                </span>
                                Use
                              </StableButton>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </details>
                  <div
                    style={{
                      marginTop: 12,
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "repeat(2, minmax(0, 1fr))"
                        : "repeat(4, minmax(0, 1fr))",
                      gap: 8,
                    }}
                  >
                    <span style={badge(Boolean(selectedRepostProduct))}>
                      Block {selectedRepostProduct ? "ready" : "needed"}
                    </span>
                    <span style={badge(Boolean(resolvedRepostTargetCommunityInput))}>
                      Target {resolvedRepostTargetCommunityInput ? "ready" : "needed"}
                    </span>
                    <span style={badge(true)}>
                      {resolvedRepostDurationDays} day{resolvedRepostDurationDays === 1 ? "" : "s"}
                    </span>
                    <span style={badge(canPlaceMarketplaceRepost)}>
                      {availableMarketplaceRepostCredits}/{requiredMarketplaceRepostCredits} credit{requiredMarketplaceRepostCredits === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div
                    {...marketplaceFieldTouchProps("marketplace.network-repost.payment-actions")}
                    style={marketplaceInlineActionsStyle(isCompact)}
                  >
                    <StableButton
                      type="button"
                      debugId="marketplace.network-repost.generate-payment-code"
                      stableHeight={58}
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          void createMarketplaceRepostPaymentInstruction();
                        });
                      }}
                      disabled={creatingRepostPaymentInstruction}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        creatingRepostPaymentInstruction,
                        isCompact
                      )}
                    >
                      {creatingRepostPaymentInstruction ? (
                        "Generating..."
                      ) : (
                        <>
                          <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                            <MarketplaceGlyph name="payment" size={18} />
                          </span>
                          Pay Code
                        </>
                      )}
                    </StableButton>
                    <StableButton
                      type="button"
                      debugId="marketplace.network-repost.refresh-credits"
                      stableHeight={58}
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          void refreshMarketplaceRepostCredits();
                        });
                      }}
                      disabled={loadingRepostCredits}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        loadingRepostCredits,
                        isCompact
                      )}
                    >
                      {loadingRepostCredits ? (
                        "Refreshing..."
                      ) : (
                        <>
                          <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                            <MarketplaceGlyph name="refresh" size={18} />
                          </span>
                          Refresh
                        </>
                      )}
                    </StableButton>
                    <StableButton
                      type="button"
                      debugId="marketplace.network-repost.place"
                      stableHeight={58}
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          void submitMarketplaceRepost();
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "primary",
                        marketplaceRepostLocked,
                        isCompact
                      )}
                    >
                      {placingMarketplaceRepost ? (
                        "Placing..."
                      ) : (
                        <>
                          <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                            <MarketplaceGlyph name="spark" size={18} />
                          </span>
                          Place
                        </>
                      )}
                    </StableButton>
                  </div>
                  <details
                    open={!isCompact}
                    style={{
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 18,
                      border: "1px solid rgba(11, 45, 74, 0.12)",
                      background: canPlaceMarketplaceRepost
                        ? "rgba(46, 155, 98, 0.08)"
                        : "rgba(214, 170, 69, 0.12)",
                      color: "#0B1F33",
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <StableDisclosureSummary
                      debugId="marketplace.network-repost.credit-details.summary"
                      stableHeight={36}
                      style={{
                        cursor: "pointer",
                        color: "#0B1F33",
                        fontWeight: 950,
                        listStyle: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <span>
                        {canPlaceMarketplaceRepost
                          ? "Credit details"
                          : `Need ${missingMarketplaceRepostCredits} credit${
                              missingMarketplaceRepostCredits === 1 ? "" : "s"
                            }`}
                      </span>
                      <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                        <MarketplaceGlyph name="payment" size={18} />
                      </span>
                    </StableDisclosureSummary>
                    <div style={{ fontWeight: 900 }}>
                      {canPlaceMarketplaceRepost
                        ? "Credit ready."
                        : `Need ${missingMarketplaceRepostCredits} Spotlight credit${
                            missingMarketplaceRepostCredits === 1 ? "" : "s"
                          } before placing.`}
                    </div>
                    <div style={{ ...helperText(), fontSize: 13 }}>
                      {requiredMarketplaceRepostCredits} day{requiredMarketplaceRepostCredits === 1 ? "" : "s"} =
                      {" "}{formatRailMoney(requiredMarketplaceRepostAmount, "GBP")}.
                    </div>
                    {latestRepostPaymentReference ? (
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        Latest code: <strong>{latestRepostPaymentReference}</strong>
                        {latestRepostPaymentAmount ? ` | ${latestRepostPaymentAmount}` : ""}
                        {latestRepostPaymentStatus ? ` | ${latestRepostPaymentStatus}` : ""}
                      </div>
                    ) : (
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        Generate when the block and target are ready.
                      </div>
                    )}
                    <StableCtaLink
                      to={routeWithCommunity(APP_ROUTES.SUBSCRIPTION_SPOTLIGHT, activeCommunityId)}
                      debugId="marketplace.network-repost.subscription"
                      stableHeight={58}
                      style={{
                        ...marketplaceInlineActionStyle("secondary", false, isCompact),
                        marginTop: 8,
                      }}
                    >
                      <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                        <MarketplaceGlyph name="spark" size={18} />
                      </span>
                      Spotlight
                    </StableCtaLink>
                  </details>
                </div>

                <div style={marketplaceLinkRowStyle(isCompact)}>
                  <div style={marketplaceLinkRowHeaderStyle(isCompact)}>
                    <span
                      aria-hidden="true"
                      style={marketplaceLinkRowIconStyle("purple", isCompact)}
                    >
                      <MarketplaceGlyph name="control" size={isCompact ? 25 : 30} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={marketplaceLinkRowTitleStyle(isCompact)}>
                        5. Owner Controls
                      </div>
                      <div style={marketplaceLinkRowSubStyle(isCompact)}>
                        Manage your shop & settings.
                      </div>
                    </div>
                    <span style={marketplaceLinkRowStatusStyle("ready", isCompact)}>
                      Ready
                    </span>
                  </div>
                  <div style={marketplaceInlineActionsStyle(isCompact)}>
                    <StableButton
                      debugId="marketplace.links.owner-shop-control"
                      type="button"
                      onClick={(event) =>
                        openMarketplaceCta(event, "shop")
                      }
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        false,
                        isCompact
                      )}
                    >
                      <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                        <MarketplaceGlyph name="control" size={18} />
                      </span>
                      Open Control
                    </StableButton>
                  </div>
                </div>

          </div>
        ) : null}
      </section>
      ) : null}

      {sectionsOpen.members ? (
      <section
        id="marketplace-members-shops"
        style={{ ...pageCard("#FFFFFF"), ...marketplaceSectionStyle(), order: 3 }}
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              minWidth: 0,
            }}
          >
            <span
              aria-hidden="true"
              style={marketplaceOsIconStyle(
                "linear-gradient(180deg, #4B36C8 0%, #17124F 100%)",
                true
              )}
            >
              <MarketplaceGlyph name="trade" size={26} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={sectionLabel()}>Trusted Trade</div>
              <div style={{ marginTop: 8, ...helperText() }}>
                See known members and visible shops inside this selected
                community.
              </div>
            </div>
          </div>

          <StableButton
            debugId="marketplace.members.toggle"
            type="button"
            onClick={(event) => toggleSectionFromButton(event, "members")}
            style={marketplaceActionStyle("soft")}
          >
            {sectionsOpen.members ? "Collapse" : "Open"}
          </StableButton>
        </div>

        {sectionsOpen.members ? (
          <div
            style={{
              marginTop: 12,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span style={stableStatusPillStyle(memberRows.length > 0)}>
              {memberRows.length} visible member{memberRows.length === 1 ? "" : "s"}
            </span>
            <span style={stableStatusPillStyle(visibleTradeShopCount > 0)}>
              {visibleTradeShopCount} public shop{visibleTradeShopCount === 1 ? "" : "s"}
            </span>
            <span style={stableStatusPillStyle(true)}>
              Community-bound trade
            </span>
          </div>
        ) : null}

        {sectionsOpen.members ? (
          <div
            style={{
              marginTop: 12,
              ...innerCard("#FFFDF7"),
              display: "grid",
              gridTemplateColumns: isCompact
                ? "42px minmax(0, 1fr)"
                : "46px minmax(0, 1fr) 190px",
              gap: isCompact ? 10 : 14,
              alignItems: "center",
              borderColor: "rgba(128,90,15,0.18)",
            }}
          >
            <span
              aria-hidden="true"
              style={marketplaceOsIconStyle(
                "linear-gradient(180deg, #D7A22D 0%, #805A0F 100%)",
                true
              )}
            >
              <MarketplaceGlyph name="demand" size={24} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={sectionLabel()}>Demand Box</div>
              <div style={{ marginTop: 5, ...helperText(), fontSize: 13 }}>
                Post a local need or offer request for this marketplace.
              </div>
            </div>
            <StableButton
              debugId="marketplace.members.demand-box"
              type="button"
              onClick={(event) => openMarketplaceCta(event, "demandBox")}
              style={{
                ...marketplaceInlineActionStyle(
                  "secondary",
                  false,
                  isCompact
                ),
                gridColumn: isCompact ? "1 / -1" : undefined,
              }}
            >
              Demand Box
            </StableButton>
          </div>
        ) : null}

        {sectionsOpen.members ? (
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={sectionLabel()}>Visible members</div>
              <span style={stableStatusPillStyle(hiddenTradeMemberRows.length === 0)}>
                {hiddenTradeMemberRows.length > 0
                  ? `${hiddenTradeMemberRows.length} more tucked away`
                  : "Full visible list shown"}
              </span>
            </div>

            {memberRows.length === 0 ? (
              <div style={{ ...innerCard("#FCFEFF"), color: "#64748B", lineHeight: 1.6 }}>
                No members are visible in this marketplace yet.
              </div>
            ) : (
              visibleTradeMemberRows.map((row, index) => (
                <div
                  key={`${row.gmfnId || row.userId || index}`}
                  style={{
                    borderRadius: isCompact ? 14 : 16,
                    border: "1px solid rgba(16,37,59,0.08)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,252,255,0.98) 100%)",
                    padding: isCompact ? 10 : 12,
                    overflow: "hidden",
                    display: "grid",
                    gridTemplateColumns: row.shopTo
                      ? isCompact
                        ? "38px minmax(0, 1fr) 98px"
                        : "42px minmax(0, 1fr) 130px"
                      : isCompact
                      ? "38px minmax(0, 1fr)"
                      : "42px minmax(0, 1fr)",
                    gap: isCompact ? 8 : 10,
                    alignItems: "center",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: isCompact ? 38 : 42,
                      height: isCompact ? 38 : 42,
                      borderRadius: isCompact ? 13 : 14,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flex: "0 0 auto",
                      color: "#FFFFFF",
                      background: row.shopTo
                        ? "linear-gradient(180deg, #D7A22D 0%, #805A0F 100%)"
                        : "linear-gradient(180deg, #244969 0%, #061827 100%)",
                      boxShadow:
                        "0 10px 18px rgba(10,24,49,0.11), inset 0 1px 0 rgba(255,255,255,0.22)",
                    }}
                  >
                    <MarketplaceGlyph
                      name={row.shopTo ? "trade" : "members"}
                      size={20}
                    />
                  </span>

                  <div style={{ minWidth: 0, display: "grid", gap: 5 }}>
                    <div
                      style={{
                        color: "#0B1F33",
                        fontSize: isCompact ? 14 : 16,
                        fontWeight: 950,
                        lineHeight: 1.18,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflowWrap: "break-word",
                        wordBreak: "normal",
                      }}
                    >
                      {row.name}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        minWidth: 0,
                      }}
                    >
                      <span style={stableStatusPillStyle(Boolean(row.gmfnId))}>
                        {row.gmfnId ? displayGsnLabel(row.gmfnId) : "ID pending"}
                      </span>
                      <span style={stableStatusPillStyle(Boolean(row.shopTo))}>
                        {row.shopTo ? "Shop visible" : "No shop yet"}
                      </span>
                    </div>
                  </div>

                  {row.shopTo ? (
                    <StableCtaLink
                      debugId={`marketplace.member.${row.gmfnId || row.userId || "unknown"}.shop`}
                      to={row.shopTo}
                      stableHeight={52}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        false,
                        isCompact
                      )}
                    >
                      Open shop
                    </StableCtaLink>
                  ) : null}
                </div>
              ))
            )}

            {hiddenTradeMemberRows.length > 0 ? (
              <details
                style={{
                  ...innerCard("#FFFFFF"),
                  padding: 0,
                  overflow: "hidden",
                }}
              >
                <StableDisclosureSummary
                  debugId="marketplace.members.more-visible.summary"
                  stableHeight={50}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "0 12px",
                    color: "#173750",
                    fontSize: isCompact ? 13 : 14,
                    fontWeight: 950,
                    background:
                      "linear-gradient(180deg, rgba(236,243,250,0.96) 0%, rgba(222,233,244,0.92) 100%)",
                  }}
                >
                  <span>More visible members</span>
                  <span>{hiddenTradeMemberRows.length}</span>
                </StableDisclosureSummary>
                <div
                  style={{
                    padding: 10,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  {hiddenTradeMemberRows.map((row, index) => (
                    <div
                      key={`${row.gmfnId || row.userId || visibleTradeMemberRows.length + index}`}
                      style={{
                        borderRadius: isCompact ? 14 : 16,
                        border: "1px solid rgba(16,37,59,0.08)",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,252,255,0.98) 100%)",
                        padding: isCompact ? 10 : 12,
                        overflow: "hidden",
                        display: "grid",
                        gridTemplateColumns: row.shopTo
                          ? isCompact
                            ? "38px minmax(0, 1fr) 98px"
                            : "42px minmax(0, 1fr) 130px"
                          : isCompact
                          ? "38px minmax(0, 1fr)"
                          : "42px minmax(0, 1fr)",
                        gap: isCompact ? 8 : 10,
                        alignItems: "center",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: isCompact ? 38 : 42,
                          height: isCompact ? 38 : 42,
                          borderRadius: isCompact ? 13 : 14,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flex: "0 0 auto",
                          color: "#FFFFFF",
                          background: row.shopTo
                            ? "linear-gradient(180deg, #D7A22D 0%, #805A0F 100%)"
                            : "linear-gradient(180deg, #244969 0%, #061827 100%)",
                          boxShadow:
                            "0 10px 18px rgba(10,24,49,0.11), inset 0 1px 0 rgba(255,255,255,0.22)",
                        }}
                      >
                        <MarketplaceGlyph
                          name={row.shopTo ? "trade" : "members"}
                          size={20}
                        />
                      </span>

                      <div style={{ minWidth: 0, display: "grid", gap: 5 }}>
                        <div
                          style={{
                            color: "#0B1F33",
                            fontSize: isCompact ? 14 : 16,
                            fontWeight: 950,
                            lineHeight: 1.18,
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflowWrap: "break-word",
                            wordBreak: "normal",
                          }}
                        >
                          {row.name}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 6,
                            minWidth: 0,
                          }}
                        >
                          <span style={stableStatusPillStyle(Boolean(row.gmfnId))}>
                            {row.gmfnId ? displayGsnLabel(row.gmfnId) : "ID pending"}
                          </span>
                          <span style={stableStatusPillStyle(Boolean(row.shopTo))}>
                            {row.shopTo ? "Shop visible" : "No shop yet"}
                          </span>
                        </div>
                      </div>

                      {row.shopTo ? (
                        <StableCtaLink
                          debugId={`marketplace.member.${row.gmfnId || row.userId || "unknown"}.shop`}
                          to={row.shopTo}
                          stableHeight={52}
                          style={marketplaceInlineActionStyle(
                            "secondary",
                            false,
                            isCompact
                          )}
                        >
                          Open shop
                        </StableCtaLink>
                      ) : null}
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        ) : null}
      </section>
      ) : null}

      {sectionsOpen.support ? (
      <section
        id="marketplace-loans-support"
        ref={supportSectionRef}
        style={{ ...pageCard("#FFFFFF"), ...marketplaceSectionStyle(), order: 6 }}
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              minWidth: 0,
            }}
          >
            <span
              aria-hidden="true"
              style={marketplaceOsIconStyle(
                "linear-gradient(180deg, #25A65A 0%, #0B5A34 100%)",
                true
              )}
            >
              <MarketplaceGlyph name="support" size={26} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={sectionLabel()}>Support Requests</div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Start one guided support request inside this selected
                marketplace.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(false)}>Active items: {activeLoanCount}</span>
            <StableButton
              debugId="marketplace.support.toggle"
              type="button"
              onClick={(event) => toggleSectionFromButton(event, "support")}
              style={marketplaceActionStyle("soft")}
            >
              {sectionsOpen.support ? "Collapse" : "Open"}
            </StableButton>
          </div>
        </div>

        {sectionsOpen.support ? (
          <ExplainToggle
            label="What this support area does"
            what="This is where a member asks the current community for support, checks whether guarantors are needed, and follows the borrowing path only after the draft is clear."
            why="Support should feel like one guided community request, not a pile of loan pages and member lists."
            next="Start the request here, check the fit signals, then continue only to the next borrowing page the draft needs."
            tone="light"
            style={{ marginTop: 12 }}
          />
        ) : null}

        {sectionsOpen.support ? (
          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {[
              ["1", "Start request", "Enter amount, days, and reason here."],
              ["2", "Check fit", "Review guarantor need and suggested supporters."],
              ["3", "Continue flow", "Open readiness or workbench only when needed."],
            ].map(([step, title, detail]) => (
              <div
                key={step}
                style={{
                  borderRadius: 18,
                  border: "1px solid rgba(37,166,90,0.18)",
                  background:
                    "linear-gradient(180deg, rgba(243,251,246,0.98) 0%, rgba(230,244,236,0.94) 100%)",
                  padding: isCompact ? 8 : 14,
                  overflow: "hidden",
                  overflowAnchor: "none",
                }}
              >
                <div
                  style={{
                    ...sectionLabel(),
                    color: "#0B6B3B",
                    fontSize: isCompact ? 10 : 12,
                  }}
                >
                  Step {step}
                </div>
                <div
                  style={{
                    marginTop: isCompact ? 4 : 6,
                    color: "#08233A",
                    fontSize: isCompact ? 12 : 16,
                    fontWeight: 950,
                    lineHeight: isCompact ? 1.1 : 1.2,
                    overflowWrap: "break-word",
                  }}
                >
                  {title}
                </div>
                <div
                  style={{
                    marginTop: 5,
                    color: "#5E6F82",
                    fontSize: isCompact ? 12 : 13,
                    fontWeight: 800,
                    lineHeight: 1.35,
                    overflowWrap: "break-word",
                    display: isCompact ? "none" : undefined,
                  }}
                >
                  {detail}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {sectionsOpen.support ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "minmax(0, 1.05fr) minmax(320px, 0.95fr)",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div style={sectionLabel()}>Start a support request</div>

              <div style={{ marginTop: 8, ...helperText(), maxWidth: 760 }}>
                Start one request, then let GSN show the next fit or guarantor
                step. Deeper loan pages stay behind details until the draft
                needs them.
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={badge(Boolean(loanDraftId))}>
                  {loanDraftId ? `Draft #${loanDraftId}` : "No draft yet"}
                </span>
                <span style={badge(requiredGuarantorCount > 0)}>
                  Guarantors: {requiredGuarantorCount || "not checked"}
                </span>
                <span style={badge(suggestedSupporters.length > 0)}>
                  Fit: {suggestedSupporters.length}
                </span>
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "1fr 1fr",
                  gap: isCompact ? 9 : 12,
                }}
              >
                <div>
                  <div style={sectionLabel()}>Amount needed</div>
                  <input
                    {...marketplaceFieldTouchProps("marketplace.support.amount")}
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    disabled={supportProcessBusy}
                    placeholder="Enter amount"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>How long do you want it?</div>
                  <input
                    {...marketplaceFieldTouchProps("marketplace.support.duration-days")}
                    type="number"
                    min="1"
                    value={loanDurationDays}
                    onChange={(e) => setLoanDurationDays(e.target.value)}
                    disabled={supportProcessBusy}
                    placeholder="Duration in days"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div style={{ gridColumn: "1 / span 2" }}>
                  <div style={sectionLabel()}>Purpose / note</div>
                  <textarea
                    {...marketplaceFieldTouchProps("marketplace.support.purpose")}
                    value={loanPurpose}
                    onChange={(e) => setLoanPurpose(e.target.value)}
                    disabled={supportProcessBusy}
                    placeholder="State what the support is for..."
                    style={{
                      ...textAreaStyle(),
                      marginTop: 8,
                      minHeight: isCompact ? 72 : 96,
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  ...marketplaceInlineActionsStyle(isCompact),
                  marginTop: 16,
                }}
              >
                <StableButton
                  debugId="marketplace.support.start-request"
                  type="button"
                  onClick={(event) => {
                    runMarketplaceAction(event, () => {
                      if (startingLoanDraft) return;
                      void handleStartLoanDraft();
                    });
                  }}
                  disabled={supportProcessBusy}
                  stableHeight={58}
                  style={marketplaceInlineActionStyle(
                    "primary",
                    supportProcessBusy,
                    isCompact
                  )}
                >
                  {startingLoanDraft ? "Starting..." : "Start Support Request"}
                </StableButton>

                {loanDraftId ? (
                  <StableButton
                    debugId="marketplace.support.refresh-fit"
                    type="button"
                    onClick={(event) => {
                      runMarketplaceAction(event, () => {
                        if (loadingSuggestions) return;
                        void handleRefreshSuggestions();
                      });
                    }}
                    disabled={supportProcessBusy}
                    stableHeight={58}
                    style={marketplaceInlineActionStyle(
                      "secondary",
                      supportProcessBusy,
                      isCompact
                    )}
                  >
                    {loadingSuggestions ? "Refreshing..." : "Refresh Fit Check"}
                  </StableButton>
                ) : null}

                {loanDraftId ? (
                  <StableButton
                    debugId="marketplace.support.cancel-draft"
                    type="button"
                    onClick={(event) => {
                      runMarketplaceAction(event, () => {
                        if (cancellingLoanDraft) return;
                        void handleCancelLoanDraft();
                      });
                    }}
                    disabled={supportProcessBusy}
                    stableHeight={58}
                    style={marketplaceInlineActionStyle(
                      "secondary",
                      supportProcessBusy,
                      isCompact
                    )}
                  >
                    {cancellingLoanDraft ? "Cancelling..." : "Cancel Draft"}
                  </StableButton>
                ) : null}
              </div>

              <details style={{ marginTop: 12 }}>
                <StableDisclosureSummary
                  debugId="marketplace.support.deeper-pages.summary"
                  stableHeight={isCompact ? 48 : 52}
                  style={{
                    ...marketplaceActionStyle("soft"),
                    width: "100%",
                    justifyContent: "space-between",
                    padding: isCompact ? "0 12px" : "0 14px",
                    fontSize: isCompact ? 13 : 14,
                  }}
                >
                  Deeper support pages
                  <span aria-hidden="true">+</span>
                </StableDisclosureSummary>

                <div
                  style={{
                    ...marketplaceInlineActionsStyle(isCompact),
                    marginTop: 10,
                  }}
                >
                  <StableButton
                    debugId="marketplace.support.loan-readiness"
                    type="button"
                    onClick={(event) =>
                      openMarketplaceCta(event, "loanReadiness")
                    }
                    disabled={supportProcessBusy}
                    stableHeight={58}
                    style={marketplaceInlineActionStyle("soft", supportProcessBusy, isCompact)}
                  >
                    Loan Readiness
                  </StableButton>
                  <StableButton
                    debugId="marketplace.support.loan-suggestions"
                    type="button"
                    onClick={(event) =>
                      openMarketplaceCta(event, "loanSuggestions")
                    }
                    disabled={supportProcessBusy}
                    stableHeight={58}
                    style={marketplaceInlineActionStyle("soft", supportProcessBusy, isCompact)}
                  >
                    Loan Suggestions
                  </StableButton>
                  <StableButton
                    debugId="marketplace.support.loan-workbench"
                    type="button"
                    onClick={(event) =>
                      openMarketplaceCta(event, "loanWorkbench")
                    }
                    disabled={supportProcessBusy}
                    stableHeight={58}
                    style={marketplaceInlineActionStyle("soft", supportProcessBusy, isCompact)}
                  >
                    Loan Workbench
                  </StableButton>
                  <StableButton
                    debugId="marketplace.support.finance"
                    type="button"
                    onClick={(event) => openMarketplaceCta(event, "finance")}
                    disabled={supportProcessBusy}
                    stableHeight={58}
                    style={marketplaceInlineActionStyle("soft", supportProcessBusy, isCompact)}
                  >
                    Finance
                  </StableButton>
                  <StableButton
                    debugId="marketplace.support.full-loans"
                    type="button"
                    onClick={(event) => openMarketplaceCta(event, "loans")}
                    disabled={supportProcessBusy}
                    stableHeight={58}
                    style={marketplaceInlineActionStyle("soft", supportProcessBusy, isCompact)}
                  >
                    Full Loans View
                  </StableButton>
                </div>
              </details>

              {loanDraftId ? (
                <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
                  <div style={softCard("#FFFFFF")}>
                    <div style={sectionLabel()}>Draft status</div>

                    <ExplainToggle
                      label="What this draft status does"
                      what="This status strip shows how far the current support draft has moved, including whether guarantors are required, how many fit suggestions exist, and how many people have responded."
                      why="It turns the draft into something readable so users can tell whether they should stay here, send requests, or continue into the next borrowing step."
                      next="Read the status first, then review the fit suggestions below or move into the deeper loan pages only when the draft shows you what is still missing."
                      tone="light"
                      style={{ marginTop: 12 }}
                    />

                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={badge(true)}>
                        Status: {safeStr(loanDraftSummary?.status || "Open")}
                      </span>
                      <span style={badge(false)}>
                        Required guarantors: {requiredGuarantorCount}
                      </span>
                      <span style={badge(false)}>
                        Suggested fit: {suggestedSupporters.length}
                      </span>
                      <span style={badge(false)}>Sent: {sentGuarantorCount}</span>
                      <span style={badge(false)}>
                        Approved: {approvedGuarantorCount}
                      </span>
                    </div>

                    <div style={{ marginTop: 12, ...helperText() }}>
                      {supportProcessMessage}
                    </div>
                  </div>

                  {requiredGuarantorCount > 0 ? (
                    <div style={softCard("#F8FBFF")}>
                      <div style={sectionLabel()}>Fit suggestions</div>

                      <ExplainToggle
                        label="What these fit suggestions do"
                        what="These suggestions show which visible community members may fit the current support request based on the draft amount and the support signals already available."
                        why="They help the user choose who to ask next without treating guarantor selection like a blind guess or a random contact list."
                        next="Read the reason and suggested pledge first, choose only the people that make sense for this request, then continue once the chosen guarantors reflect the draft."
                        tone="light"
                        style={{ marginTop: 12 }}
                      />

                      {suggestedSupporters.length === 0 ? (
                        <div style={{ marginTop: 10, ...helperText() }}>
                          No fit guarantor suggestion is shown yet for this amount.
                        </div>
                      ) : (
                        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                          {suggestedSupporters.map((item) => {
                            const selected = selectedSupporterKeys.has(item.key);

                            return (
                              <div key={item.key} style={innerCard("#FFFFFF")}>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: 10,
                                    flexWrap: "wrap",
                                    alignItems: "center",
                                  }}
                                >
                                  <div>
                                    <div
                                      style={{
                                        color: "#0B1F33",
                                        fontWeight: 900,
                                        fontSize: 15,
                                        lineHeight: 1.35,
                                      }}
                                    >
                                      {item.name}
                                    </div>

                                    <div
                                      style={{
                                        marginTop: 6,
                                        display: "flex",
                                        gap: 8,
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      {safeStr(item.reason) ? (
                                        <span style={badge(false)}>
                                          {safeStr(item.reason)}
                                        </span>
                                      ) : null}

                                      {safeStr(item.recommendedPledge) ? (
                                        <span style={badge(true)}>
                                          Suggested pledge: {safeStr(item.recommendedPledge)}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>

                                  <StableButton
                                    debugId={`marketplace.support.suggestion.${item.key}.choose`}
                                    type="button"
                                    onClick={(event) => {
                                      runMarketplaceAction(event, () => {
                                        toggleSuggestedSupporter(item);
                                      });
                                    }}
                                    stableHeight={58}
                                    style={marketplaceInlineActionStyle(
                                      selected ? "primary" : "secondary",
                                      false,
                                      isCompact
                                    )}
                                  >
                                    {selected ? "Selected" : "Choose"}
                                  </StableButton>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {visibleSelectedSupporters.length > 0 ? (
                        <div style={{ marginTop: 14 }}>
                          <div style={sectionLabel()}>Chosen guarantors</div>

                          <ExplainToggle
                            label="What these chosen guarantors do"
                            what="These are the people you have selected for this draft so far. They are still candidates until the guarantor requests are actually sent."
                            why="This keeps selection separate from approval so users do not mistake a chosen name for a completed support commitment."
                            next="Review the selected names here, remove anyone who no longer fits, then send the guarantor requests only when the final set looks right."
                            tone="light"
                            style={{ marginTop: 12 }}
                          />

                          <div
                            style={{
                              ...marketplaceInlineActionsStyle(isCompact),
                              marginTop: 10,
                            }}
                          >
                            {visibleSelectedSupporters.map((item) => (
                              <StableButton
                                debugId={`marketplace.support.selected.${item.key}.remove`}
                                key={item.key}
                                type="button"
                                onClick={(event) => {
                                  runMarketplaceAction(event, () => {
                                    toggleSuggestedSupporter(item);
                                  });
                                }}
                                stableHeight={58}
                                style={marketplaceInlineActionStyle("soft", false, isCompact)}
                              >
                                {item.name} x
                              </StableButton>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <ExplainToggle
                        label="What this request step does"
                        what="This step sends the guarantor requests to the selected people so the draft can move from chosen candidates into real outreach."
                        why="It separates selection from action, which helps users understand that support is not approved just because names have been picked."
                        next="Check that the selected count is enough, send the requests when the final set is ready, then watch the draft status for replies and approvals."
                        tone="light"
                        style={{ marginTop: 14 }}
                      />

                      <div
                        style={{
                          ...marketplaceInlineActionsStyle(isCompact),
                          marginTop: 14,
                        }}
                      >
                        <StableButton
                          debugId="marketplace.support.send-guarantor-requests"
                          type="button"
                          onClick={(event) => {
                            runMarketplaceAction(event, () => {
                              if (guarantorRequestsBlocked) {
                                showGuarantorRequestBlockedNotice();
                                return;
                              }
                              void handleSendGuarantorRequests();
                            });
                          }}
                          stableHeight={58}
                          style={marketplaceInlineActionStyle(
                            "primary",
                            guarantorRequestsBlocked,
                            isCompact
                          )}
                        >
                          {sendingGuarantorRequests
                            ? "Sending..."
                            : loanStatusLower === "approved"
                            ? "Already Approved"
                            : "Send Guarantor Requests"}
                        </StableButton>

                        <span style={badge(false)}>
                          Selected: {visibleSelectedSupporters.length}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>Visible support items</div>

              <ExplainToggle
                label="What these support items do"
                what="This list shows the support items already visible in the current community, including the amount, status, and role attached to each item."
                why="It keeps people from confusing a live community support record with the draft they are still building on the left."
                next="Read this list to see what is already active here, then stay in the draft lane only if you still need to create or continue a separate request."
                tone="light"
                style={{ marginTop: 12 }}
              />

              <div
                style={{
                  marginTop: 10,
                  color: "#0B1F33",
                  fontSize: 20,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                Your visible support activity here
              </div>

              <div
                style={{
                  marginTop: 8,
                  ...helperText(),
                }}
              >
                These are the support items currently visible in this community.
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gap: 12,
                }}
              >
                {loans.length === 0 ? (
                  <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                    No visible loan or support item is active in this community right now.
                  </div>
                ) : (
                  loans.slice(0, 6).map((item, index) => (
                    <div key={`${item.id || index}`} style={innerCard("#FCFEFF")}>
                      <div
                        style={{
                          color: "#0B1F33",
                          fontSize: 16,
                          fontWeight: 900,
                          lineHeight: 1.35,
                        }}
                      >
                        {firstTruthy(item?.title, "Loan and support item")}
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={badge(true)}>{getLoanAmountText(item)}</span>
                        <span style={badge(false)}>
                          Status: {firstTruthy(item?.status, "Open")}
                        </span>
                        <span style={badge(false)}>
                          Role: {firstTruthy(item?.role, "Support")}
                        </span>
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          color: "#5F7287",
                          fontSize: 13,
                          lineHeight: 1.7,
                        }}
                      >
                        {firstTruthy(
                          item?.borrower_name
                            ? `Borrower: ${item.borrower_name}`
                            : "",
                          item?.guarantor_name
                            ? `Guarantor: ${item.guarantor_name}`
                            : "",
                          item?.created_at ? `Started: ${safeDateTime(item.created_at)}` : "",
                          "This support item is visible in your current community."
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>
      ) : null}
    </MarketplaceShell>
  );
}
