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
  publicShopShareUrl,
  publicShopUrl,
} from "../lib/publicLinks";
import { useLocation, useNavigate } from "react-router-dom";
import { StableButton, StableCtaLink } from "../components/StableButton";
import {
  addLoanGuarantorRequest,
  cancelLoanRequest,
  createMarketplaceRepost,
  createMarketplaceShop,
  createSpotlightPaymentInstruction,
  createClanInvite,
  createLoanRequest,
  getMarketplaceRepostTargetSuggestions,
  getMarketplaceShopSpotlightStatus,
  getClanTrustScoreExplained,
  getClanInviteLink,
  getCurrentClan,
  getLoanGuarantorSuggestions,
  getLoanSummary,
  getMarketplaceProducts,
  getMarketplaceShopByGmfnId,
  getMarketplaceShops,
  getMe,
  getPoolMe,
  getSelectedClanId,
  listMyPaymentInstructionExpectedPayments,
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
  tools: false,
  members: false,
  support: false,
};

const MARKETPLACE_SECTION_ANCHORS: Record<keyof SectionState, string> = {
  money: "marketplace-money-routes",
  tools: "marketplace-owned-links",
  members: "marketplace-members-shops",
  support: "marketplace-loans-support",
};

function focusedMarketplaceSectionState(key: keyof SectionState): SectionState {
  if (key === "support") {
    return {
      money: false,
      tools: false,
      members: true,
      support: true,
    };
  }

  return {
    money: key === "money",
    tools: key === "tools",
    members: key === "members",
    support: false,
  };
}

function touchedMarketplaceSectionState(
  prev: SectionState,
  key: keyof SectionState
): SectionState {
  if (key === "support") {
    return {
      ...prev,
      members: true,
      support: true,
    };
  }

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
  },
  {
    id: "support",
    label: "Ask for support",
    detail: "Start or continue a support or loan request.",
    technical: "Borrow / Lend / Support",
    to: "#marketplace-loans-support",
    tone: "secondary",
    keywords: ["loan", "borrow", "support", "lend", "help", "guarantor"],
  },
  {
    id: "shop",
    label: "Show my shop",
    detail: "Open the shop connected to your GSN ID.",
    technical: "Shop Gallery",
    to: "",
    tone: "secondary",
    keywords: ["shop", "gallery", "sell", "market", "store", "product"],
  },
  {
    id: "invite",
    label: "Invite people",
    detail: "Open links owned by this marketplace.",
    technical: "Marketplace links",
    to: "#marketplace-owned-links",
    tone: "soft",
    keywords: ["invite", "join", "link", "bring", "people", "share"],
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

function linkReserveTextStyle(): React.CSSProperties {
  return {
    marginTop: 10,
    height: 66,
    minHeight: 66,
    maxHeight: 66,
    overflowY: "auto",
    overscrollBehavior: "contain",
    scrollbarWidth: "thin",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    overflowAnchor: "none",
  };
}

function publicShopFaceCardStyle(isCompact: boolean): React.CSSProperties {
  return {
    ...innerCard("#FFFFFF"),
    minHeight: isCompact ? 0 : 330,
    alignSelf: "stretch",
    overflowAnchor: "none",
  };
}

function joinLinkReserveTextStyle(isCompact: boolean): React.CSSProperties {
  return {
    ...linkReserveTextStyle(),
    height: isCompact ? 78 : 66,
    minHeight: isCompact ? 78 : 66,
    maxHeight: isCompact ? 78 : 66,
    overflowY: "auto",
    overscrollBehavior: "contain",
    scrollbarWidth: "thin",
  };
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
    height: isCompact ? 146 : 132,
    minHeight: isCompact ? 146 : 132,
    maxHeight: isCompact ? 146 : 132,
    overscrollBehavior: "contain",
    scrollbarWidth: "thin",
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
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: isCompact
      ? "1fr"
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
  void _isCompact;

  return {
    ...marketplaceActionStyle(kind, disabled),
    width: "100%",
    height: 58,
    minHeight: 58,
    maxHeight: 58,
    padding: "0 11px",
    pointerEvents: "auto",
    touchAction: "manipulation",
    overflowAnchor: "none",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    transition: "none",
  };
}

function marketplaceMoneyPanelStyle(isCompact: boolean): React.CSSProperties {
  return {
    marginTop: isCompact ? 12 : 16,
    display: "grid",
    gap: isCompact ? 8 : 12,
    overflowAnchor: "none",
    transition: "none",
  };
}

function marketplaceMoneyRouteCardStyle(isCompact: boolean): React.CSSProperties {
  return {
    minHeight: isCompact ? 92 : 150,
    borderRadius: isCompact ? 18 : 24,
    border: "1px solid rgba(16,37,59,0.08)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,252,255,0.98) 100%)",
    boxShadow:
      "0 16px 30px rgba(10,24,49,0.075), inset 0 1px 0 rgba(255,255,255,0.92)",
    padding: isCompact ? "12px 13px" : "22px 24px",
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
    width: isCompact ? 48 : 80,
    height: isCompact ? 48 : 80,
    borderRadius: 999,
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
    fontSize: isCompact ? 15 : 20,
    fontWeight: 950,
    lineHeight: 1.14,
    overflowWrap: "break-word",
    wordBreak: "normal",
  };
}

function marketplaceMoneyValueStyle(isCompact: boolean): React.CSSProperties {
  return {
    color: "#061827",
    fontSize: isCompact ? 21 : 42,
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
    fontSize: ready ? (isCompact ? 18 : 30) : isCompact ? 21 : 42,
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
    fontSize: isCompact ? 12.5 : 17,
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
    alignSelf: "center",
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  };
}

function marketplaceMoneyStatusPillStyle(ready = false): React.CSSProperties {
  return {
    ...stableStatusPillStyle(ready),
    minWidth: 0,
    padding: "0 10px",
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
    border: "1px solid var(--hero-border)",
    background: "var(--hero-bg)",
    padding: isCompact ? 18 : 24,
    color: "var(--gsn-text-inverse)",
    boxShadow: "var(--shadow-heavy)",
    overflow: "hidden",
  };
}

function marketplaceOsTileStyle(isCompact: boolean): React.CSSProperties {
  return {
    width: "100%",
    height: isCompact ? 116 : 178,
    minHeight: isCompact ? 116 : 178,
    maxHeight: isCompact ? 116 : 178,
    borderRadius: isCompact ? 18 : 20,
    border: "1px solid var(--gsn-border)",
    background:
      "linear-gradient(180deg, var(--gsn-white) 0%, var(--gsn-blue-50) 100%)",
    padding: isCompact ? 12 : 14,
    display: "grid",
    gridTemplateColumns: isCompact ? "46px minmax(0, 1fr)" : "1fr",
    gridTemplateRows: isCompact
      ? "2.35em 1.35em 1.45em"
      : "62px 2.35em 1.45em 2.7em",
    gridTemplateAreas: isCompact
      ? '"icon title" "icon metric" "icon helper"'
      : '"icon" "title" "metric" "helper"',
    columnGap: isCompact ? 11 : 0,
    rowGap: isCompact ? 3 : 9,
    alignContent: "center",
    color: "var(--gsn-text-main)",
    textAlign: isCompact ? "left" : "center",
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

function marketplaceOsTileTitleStyle(isCompact: boolean): React.CSSProperties {
  return {
    gridArea: "title",
    minWidth: 0,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    color: "var(--gsn-text-main)",
    fontSize: isCompact ? 14 : 18,
    fontWeight: 950,
    lineHeight: 1.15,
    overflowWrap: "break-word",
    wordBreak: "normal",
    hyphens: "none",
  };
}

function marketplaceOsTileMetricStyle(
  color: string,
  isCompact: boolean
): React.CSSProperties {
  return {
    gridArea: "metric",
    minWidth: 0,
    display: "-webkit-box",
    WebkitLineClamp: isCompact ? 1 : 2,
    WebkitBoxOrient: "vertical",
    color,
    fontSize: isCompact ? 15 : 20,
    fontWeight: 950,
    lineHeight: 1.15,
    whiteSpace: "normal",
    overflow: "hidden",
    overflowWrap: "break-word",
    wordBreak: "normal",
  };
}

function marketplaceOsTileHelperStyle(isCompact: boolean): React.CSSProperties {
  return {
    ...helperText(),
    gridArea: "helper",
    minWidth: 0,
    display: "-webkit-box",
    WebkitLineClamp: isCompact ? 1 : 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    fontSize: isCompact ? 11 : 12,
    lineHeight: 1.3,
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
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
  | "demand"
  | "eye"
  | "heart"
  | "ledger"
  | "links"
  | "members"
  | "shop"
  | "spark"
  | "support"
  | "trade"
  | "trust";

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
    case "shop":
    case "trade":
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
          <circle cx="8.2" cy="8.8" r="2.4" />
          <circle cx="15.8" cy="8.8" r="2.4" />
          <path d="M4.5 18c.6-2.5 1.8-3.8 3.7-3.8s3.1 1.3 3.7 3.8" />
          <path d="M12.1 18c.6-2.5 1.8-3.8 3.7-3.8s3.1 1.3 3.7 3.8" />
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

  const supportSectionRef = useRef<HTMLElement | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const scrollTimeoutRefs = useRef<number[]>([]);
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

  const loadMarketplaceRepostCredits = useCallback(
    async (background = false) => {
      const shopId = positiveNumber(publicShopRecord?.id);
      const clanId = positiveNumber(activeCommunityId || publicShopRecord?.clan_id);

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
    [activeCommunityId, publicShopRecord?.clan_id, publicShopRecord?.id]
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

    getMarketplaceProducts({
      shop_id: shopId,
      only_active: true,
      include_reposted: false,
      include_private_manage: true,
      limit: 60,
      header_clan_id: activeCommunityId || undefined,
    })
      .then((res) => {
        if (!alive) return;
        const options = rowsOf<any>(res)
          .map(normalizeRepostProductOption)
          .filter((item): item is RepostProductOption => {
            return Boolean(
              item &&
                item.visibilityMode === "community_visible"
            );
          });
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
  }, [activeCommunityId, publicShopRecord?.id]);

  const selectedRepostProduct = useMemo(() => {
    return (
      repostProducts.find((product) => product.id === selectedRepostProductId) ||
      repostProducts[0] ||
      null
    );
  }, [repostProducts, selectedRepostProductId]);

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

  const controlledMarketplaceLinkNote = useMemo(() => {
    if (!selectedCommunity) {
      return "Select a community first. This marketplace issues private and controlled outward links only after the community and shop context are known.";
    }

    return "Private Vault access and other controlled outward links belong to this marketplace, but they are issued as approved live links instead of one permanent public URL.";
  }, [selectedCommunity]);

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
      (id === "marketplace-loans-support" ? supportSectionRef.current : null);
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

      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef.current = null;
        scrollToMarketplaceSection(sectionId);
      });

      [80, 180, 360, 720, 1200, 1800].forEach((delay, index) => {
        const timeoutId = window.setTimeout(() => {
          scrollToMarketplaceSection(sectionId, index + 1);
        }, delay);
        scrollTimeoutRefs.current.push(timeoutId);
      });
    },
    [cancelMarketplaceSectionScroll, scrollToMarketplaceSection]
  );

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
            ? getMarketplaceShopByGmfnId(currentMemberGmfnId, {
                clan_id: currentCommunityId || undefined,
                header_clan_id: currentCommunityId || undefined,
              }).catch(() => null)
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
    const shopId = positiveNumber(publicShopRecord?.id);
    const clanId = positiveNumber(activeCommunityId || publicShopRecord?.clan_id);
    const requiredCredits = requiredMarketplaceRepostCredits;

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

    if (loadingRepostProducts || placingMarketplaceRepost) {
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
        ? repostProducts.find((product) => product.id === routeRepostProductId)
        : null) ||
      (routeRepostBlockNumber
        ? repostProducts.find(
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
    repostProducts,
    routeRepostBlockNumber,
    routeRepostProductId,
    routeRepostSource,
    scrollToMarketplaceSection,
    selectedRepostProductId,
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

  const suggestedSupporterMap = useMemo(() => {
    return new Map<string, SuggestedSupporter>(
      suggestedSupporters.map((item) => [item.key, item])
    );
  }, [suggestedSupporters]);

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
            ? publicShopPath(gmfn)
            : "",
      };
    });

    rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [members, shops]);

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

  const marketplacePoolLabel =
    visiblePoolAmount === "—"
      ? "Pool pending"
      : `${visiblePoolAmount} ${visiblePoolCurrency}`;
  const marketplaceSupportLabel =
    activeLoanCount > 0 ? `${activeLoanCount} active` : "Open support";
  const marketplaceTradeLabel =
    shops.length > 0 ? `${shops.length} visible shops` : "Open shop";
  const marketplaceMemberLabel =
    memberRows.length > 0 ? `${memberRows.length} visible members` : "Members";
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

  function toggleMemberAsSupporter(row: {
    supportKey: string;
    name: string;
    gmfnId: string;
    userId: number;
  }) {
    const match = suggestedSupporterMap.get(row.supportKey);
    if (!match) return;
    toggleSuggestedSupporter(match);
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
              gridTemplateColumns: isCompact ? "1fr" : "auto minmax(0, 1fr)",
              gap: 18,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: isCompact ? 76 : 92,
                height: isCompact ? 92 : 112,
                display: "grid",
                placeItems: "center",
              }}
            >
              <GSNBrandMark
                width={isCompact ? 62 : 76}
                height={isCompact ? 76 : 94}
              />
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 950,
                  letterSpacing: 2.4,
                  color: "#F3D06A",
                  textTransform: "uppercase",
                }}
              >
                GSN Marketplace
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#FFFFFF",
                  fontSize: isCompact ? 30 : 46,
                  fontWeight: 950,
                  lineHeight: 1.02,
                  overflowWrap: "break-word",
                  wordBreak: "normal",
                }}
              >
                {communityName(selectedCommunity)}
              </div>

              <div
                style={{
                  marginTop: 10,
                  maxWidth: 760,
                  color: "rgba(248,251,255,0.84)",
                  fontSize: isCompact ? 14 : 17,
                  lineHeight: 1.5,
                  fontWeight: 750,
                }}
              >
                Trade, support, dues, members, and records in one trusted
                community place.
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ ...badgeStyle(true), color: "#12324F" }}>
                  <MarketplaceGlyph name="shop" size={15} /> {marketplaceTradeLabel}
                </span>
                <span style={{ ...badgeStyle(true), color: "#12324F" }}>
                  <MarketplaceGlyph name="members" size={15} /> {marketplaceMemberLabel}
                </span>
                <span style={{ ...badgeStyle(true), color: "#12324F" }}>
                  <MarketplaceGlyph name="trust" size={15} /> {marketplaceTrustDisplay}
                </span>
              </div>
            </div>
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
              gridTemplateColumns: isCompact
                ? "1fr"
                : "repeat(4, minmax(0, 1fr))",
              gap: isCompact ? 8 : 12,
            }}
          >
            <StableButton
              type="button"
              debugId="marketplace.tile.money"
              aria-label="Open Money In, Money Out, dues and contributions"
              onClick={(event) =>
                openMarketplaceSection(event, "money", "marketplace-money-routes")
              }
              style={marketplaceOsTileStyle(isCompact)}
            >
              <span
                aria-hidden="true"
                style={marketplaceOsIconStyle(
                  "linear-gradient(180deg, #0B63D1 0%, #08264B 100%)",
                  isCompact
                )}
              >
                <MarketplaceGlyph name="card" size={isCompact ? 28 : 32} />
              </span>
              <span style={marketplaceOsTileTitleStyle(isCompact)}>
                Money Pool
              </span>
              <span style={marketplaceOsTileMetricStyle("#0B63D1", isCompact)}>
                {marketplacePoolLabel}
              </span>
              <span style={marketplaceOsTileHelperStyle(isCompact)}>
                Dues, Money In, Money Out
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
              style={marketplaceOsTileStyle(isCompact)}
            >
              <span
                aria-hidden="true"
                style={marketplaceOsIconStyle(
                  "linear-gradient(180deg, #25A65A 0%, #0B5A34 100%)",
                  isCompact
                )}
              >
                <MarketplaceGlyph name="support" size={isCompact ? 28 : 32} />
              </span>
              <span style={marketplaceOsTileTitleStyle(isCompact)}>
                Support Requests
              </span>
              <span style={marketplaceOsTileMetricStyle("#18864A", isCompact)}>
                {marketplaceSupportLabel}
              </span>
              <span style={marketplaceOsTileHelperStyle(isCompact)}>
                Help, loans, guarantors
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
              style={marketplaceOsTileStyle(isCompact)}
            >
              <span
                aria-hidden="true"
                style={marketplaceOsIconStyle(
                  "linear-gradient(180deg, #4B36C8 0%, #17124F 100%)",
                  isCompact
                )}
              >
                <MarketplaceGlyph name="trade" size={isCompact ? 28 : 32} />
              </span>
              <span style={marketplaceOsTileTitleStyle(isCompact)}>
                Trusted Trade
              </span>
              <span style={marketplaceOsTileMetricStyle("#4338CA", isCompact)}>
                {marketplaceTradeLabel}
              </span>
              <span style={marketplaceOsTileHelperStyle(isCompact)}>
                Members and visible shops
              </span>
            </StableButton>

            <StableButton
              type="button"
              debugId="marketplace.tile.trust"
              aria-label="Open this marketplace trust summary"
              onClick={toggleProfileDetails}
              aria-expanded={profileDetailsOpen}
              style={marketplaceOsTileStyle(isCompact)}
            >
              <span
                aria-hidden="true"
                style={marketplaceOsIconStyle(
                  "linear-gradient(180deg, #D7A22D 0%, #805A0F 100%)",
                  isCompact
                )}
              >
                <MarketplaceGlyph name="trust" size={isCompact ? 28 : 32} />
              </span>
              <span style={marketplaceOsTileTitleStyle(isCompact)}>
                Trust
              </span>
              <span style={marketplaceOsTileMetricStyle("#A16A08", isCompact)}>
                {marketplaceTrustDisplay}
              </span>
              <span style={marketplaceOsTileHelperStyle(isCompact)}>
                This community only
              </span>
            </StableButton>
          </div>

          {profileDetailsOpen ? (
            <div style={{ marginTop: 12, ...innerCard("#FFFFFF") }}>
              <div style={sectionLabel()}>Your Trust in this marketplace</div>
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
                  ["Trust", marketplaceTrustDisplay],
                  ["Trust events", marketplaceTrustEvidenceLabel],
                  ["Positive trust", marketplaceTrustPositiveLabel],
                  ["Negative trust", marketplaceTrustNegativeLabel],
                  ["Finance", communityFinanceLabel(selectedCommunity)],
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

          <div
            style={{
              marginTop: 14,
              color: "#5F7287",
              fontSize: 12,
              fontWeight: 950,
              letterSpacing: 1.6,
              textTransform: "uppercase",
            }}
          >
            Operating lanes
          </div>

          <div
            style={{
              marginTop: 8,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            <StableButton
              type="button"
              debugId="marketplace.row.money"
              aria-label="Open Money In and Money Out for this marketplace"
              onClick={(event) =>
                openMarketplaceSection(event, "money", "marketplace-money-routes")
              }
              style={marketplaceOsRowStyle(isCompact)}
            >
              <span
                aria-hidden="true"
                style={marketplaceOsRowIconStyle(
                  "linear-gradient(180deg, #1177CC 0%, #05365F 100%)",
                  isCompact
                )}
              >
                <MarketplaceGlyph name="cash" size={isCompact ? 22 : 24} />
              </span>
              <span style={marketplaceOsRowTextStackStyle()}>
                <span style={marketplaceOsRowTitleStyle(isCompact)}>
                  Money In / Money Out
                </span>
                <span style={marketplaceOsRowDetailStyle(isCompact)}>
                  Pay into this community or start a guided withdrawal.
                </span>
              </span>
              <span aria-hidden="true" style={marketplaceOsArrowStyle()}>
                <MarketplaceGlyph name="chevron" size={18} />
              </span>
            </StableButton>

            <StableButton
              type="button"
              debugId="marketplace.row.payment-rails"
              aria-label="Open Banking Rails for this marketplace"
              onClick={(event) =>
                openMarketplaceCta(event, "paymentRails")
              }
              style={marketplaceOsRowStyle(isCompact)}
            >
              <span
                aria-hidden="true"
                style={marketplaceOsRowIconStyle(
                  "linear-gradient(180deg, #C9952F 0%, #6D470B 100%)",
                  isCompact
                )}
              >
                <MarketplaceGlyph name="bank" size={isCompact ? 22 : 24} />
              </span>
              <span style={marketplaceOsRowTextStackStyle()}>
                <span style={marketplaceOsRowTitleStyle(isCompact)}>
                  Banking Rails
                </span>
                <span style={marketplaceOsRowDetailStyle(isCompact)}>
                  Payment rails, bank transfers, and settlement setup.
                </span>
              </span>
              <span aria-hidden="true" style={marketplaceOsArrowStyle()}>
                <MarketplaceGlyph name="chevron" size={18} />
              </span>
            </StableButton>

            <StableButton
              type="button"
              debugId="marketplace.row.loan-process"
              aria-label="Open Loan Process and support workbench"
              onClick={(event) =>
                openMarketplaceSection(
                  event,
                  "support",
                  "marketplace-loans-support"
                )
              }
              style={marketplaceOsRowStyle(isCompact)}
            >
              <span
                aria-hidden="true"
                style={marketplaceOsRowIconStyle(
                  "linear-gradient(180deg, #25A65A 0%, #0B5A34 100%)",
                  isCompact
                )}
              >
                <MarketplaceGlyph name="heart" size={isCompact ? 22 : 24} />
              </span>
              <span style={marketplaceOsRowTextStackStyle()}>
                <span style={marketplaceOsRowTitleStyle(isCompact)}>
                  Loan Process
                </span>
                <span style={marketplaceOsRowDetailStyle(isCompact)}>
                  Start support, check readiness, and continue the workbench.
                </span>
              </span>
              <span aria-hidden="true" style={marketplaceOsArrowStyle()}>
                <MarketplaceGlyph name="chevron" size={18} />
              </span>
            </StableButton>

            <StableButton
              type="button"
              debugId="marketplace.row.member-ledger"
              aria-label="Open Member Ledger and visible shops"
              onClick={(event) =>
                openMarketplaceSection(
                  event,
                  "members",
                  "marketplace-members-shops"
                )
              }
              style={marketplaceOsRowStyle(isCompact)}
            >
              <span
                aria-hidden="true"
                style={marketplaceOsRowIconStyle(
                  "linear-gradient(180deg, #4B36C8 0%, #17124F 100%)",
                  isCompact
                )}
              >
                <MarketplaceGlyph name="ledger" size={isCompact ? 22 : 24} />
              </span>
              <span style={marketplaceOsRowTextStackStyle()}>
                <span style={marketplaceOsRowTitleStyle(isCompact)}>
                  Member Ledger
                </span>
                <span style={marketplaceOsRowDetailStyle(isCompact)}>
                  See visible members, GSN IDs, and connected shops.
                </span>
              </span>
              <span aria-hidden="true" style={marketplaceOsArrowStyle()}>
                <MarketplaceGlyph name="chevron" size={18} />
              </span>
            </StableButton>

            <StableButton
              type="button"
              debugId="marketplace.row.demand-box"
              aria-label="Open Demand Box for this marketplace"
              onClick={(event) => openMarketplaceCta(event, "demandBox")}
              style={marketplaceOsRowStyle(isCompact)}
            >
              <span
                aria-hidden="true"
                style={marketplaceOsRowIconStyle(
                  "linear-gradient(180deg, #D7A22D 0%, #805A0F 100%)",
                  isCompact
                )}
              >
                <MarketplaceGlyph name="demand" size={isCompact ? 22 : 24} />
              </span>
              <span style={marketplaceOsRowTextStackStyle()}>
                <span style={marketplaceOsRowTitleStyle(isCompact)}>
                  Demand Box
                </span>
                <span style={marketplaceOsRowDetailStyle(isCompact)}>
                  Open community requests and visible needs.
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
              style={marketplaceOsRowStyle(isCompact)}
            >
              <span
                aria-hidden="true"
                style={marketplaceOsRowIconStyle(
                  "linear-gradient(180deg, #158BA0 0%, #075064 100%)",
                  isCompact
                )}
              >
                <MarketplaceGlyph name="links" size={isCompact ? 22 : 24} />
              </span>
              <span style={marketplaceOsRowTextStackStyle()}>
                <span style={marketplaceOsRowTitleStyle(isCompact)}>
                  Records & Links
                </span>
                <span style={marketplaceOsRowDetailStyle(isCompact)}>
                  Join links, public faces, and controlled links.
                </span>
              </span>
              <span aria-hidden="true" style={marketplaceOsArrowStyle()}>
                <MarketplaceGlyph name="chevron" size={18} />
              </span>
            </StableButton>
          </div>

          <StableButton
            type="button"
            debugId="marketplace.extra-tools.toggle"
            onClick={toggleIntentGuide}
            aria-expanded={intentGuideOpen}
            style={{
              ...marketplaceOsRowStyle(isCompact),
              marginTop: 14,
              minHeight: isCompact ? 92 : 86,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(238,244,250,0.98) 100%)",
            }}
          >
            <span
              aria-hidden="true"
              style={marketplaceOsRowIconStyle(
                "linear-gradient(180deg, #0B63D1 0%, #08264B 100%)",
                isCompact
              )}
            >
              <MarketplaceGlyph name="spark" size={isCompact ? 22 : 24} />
            </span>
            <span style={marketplaceOsRowTextStackStyle()}>
              <span style={marketplaceOsRowTitleStyle(isCompact)}>
                {intentGuideOpen ? "Hide more tools" : "More marketplace tools"}
              </span>
              <span style={marketplaceOsRowDetailStyle(isCompact)}>
                CCI, TrustSlip, shop, invite, identity, and messages.
              </span>
            </span>
            <span aria-hidden="true" style={marketplaceOsArrowStyle()}>
              <MarketplaceGlyph
                name={intentGuideOpen ? "chevronUp" : "chevron"}
                size={18}
              />
            </span>
          </StableButton>

          {intentGuideOpen ? (
            <div style={intentGuideCardStyle()}>
              <div style={{ ...helperText(), marginBottom: 12 }}>
                Say the job you want to do inside this one marketplace, like
                loan, deposit, withdraw, shop, invite, or trust. GSN will point
                you to the closest working place.
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
                  value={intentQuery}
                  onChange={(event) => setIntentQuery(event.target.value)}
                  placeholder="Try: loan, deposit, withdraw, shop, invite..."
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
              <MarketplaceGlyph name="chart" size={26} />
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
                Marketplace Finance
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
                Finance overview
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

            <div style={marketplaceInlineActionsStyle(isCompact)}>
              <StableButton
                debugId="marketplace.money.money-in"
                type="button"
                onClick={(event) => openMarketplaceCta(event, "moneyIn")}
                stableHeight={58}
                style={marketplaceInlineActionStyle("primary", false, isCompact)}
              >
                Money In
              </StableButton>
              <StableButton
                debugId="marketplace.money.money-out"
                type="button"
                onClick={(event) => openMarketplaceCta(event, "moneyOut")}
                stableHeight={58}
                style={marketplaceInlineActionStyle("secondary", false, isCompact)}
              >
                Money Out
              </StableButton>
              <StableButton
                debugId="marketplace.money.finance"
                type="button"
                onClick={(event) => openMarketplaceCta(event, "finance")}
                stableHeight={58}
                style={marketplaceInlineActionStyle("secondary", false, isCompact)}
              >
                Finance
              </StableButton>
            </div>
          </div>
        ) : null}
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
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={sectionLabel()}>Marketplace and entry links</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Keep join, marketplace, shop, and controlled outward
              links separated so participants know exactly which door they are
              opening.
            </div>
          </div>

          <StableButton
            debugId="marketplace.links.toggle"
            type="button"
            onClick={(event) => toggleSectionFromButton(event, "tools")}
            style={marketplaceActionStyle("soft")}
          >
            {sectionsOpen.tools ? "Collapse" : "Open"}
          </StableButton>
        </div>

        {sectionsOpen.tools ? (
          <ExplainToggle
            label="What these links do"
            what="This area holds the links that belong to the selected community: the community join link, the public community verification record, the public shop face, and controlled private-access links."
            why="Marketplace-facing links should stay local to this community. Starting a brand-new community belongs to the wider GSN start door, not this selected marketplace desk."
            next="Use join when someone should enter this exact community, verification when someone should confirm the community exists, the public shop face when someone should see one storefront, and controlled links for private Vault-style access."
            tone="light"
            style={{ marginTop: 12 }}
          />
        ) : null}

        {sectionsOpen.tools ? (
          <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
            <div
              style={{
                ...softCard("#FCFEFF"),
                borderRadius: 18,
                padding: 16,
                display: "grid",
                gap: 14,
              }}
            >
              <div>
                <div style={sectionLabel()}>Outgoing links</div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  Use one clear link for each job: let someone join this
                  community, verify this community, show your public shop
                  face, or send a controlled private-Vault route. Each link now
                  has its own lane.
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                }}
              >
                <div style={innerCard("#FFFFFF")}>
                  <div style={sectionLabel()}>Join this community</div>
                  <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                    Send this only to someone who should request access to this
                    selected marketplace/community.
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
                  <div
                    style={{
                      ...joinLinkReserveTextStyle(isCompact),
                      ...helperText(),
                      fontSize: inviteLink ? 12 : 13,
                    }}
                  >
                    {inviteLink
                      ? personalizedInviteLink
                      : marketplaceJoinLinkGuidance}
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div style={sectionLabel()}>Personalize before sending</div>
                    <input
                      value={joinRecipientName}
                      onChange={(event) => setJoinRecipientName(event.target.value)}
                      placeholder="Receiver name, e.g. John"
                      style={inputStyle()}
                      aria-label="Receiver name for join invitation"
                    />
                    <textarea
                      value={joinInviteNote}
                      onChange={(event) => setJoinInviteNote(event.target.value)}
                      placeholder="Short personal note (optional)"
                      rows={2}
                      style={{ ...textAreaStyle(), minHeight: 68 }}
                      aria-label="Short personal note for join invitation"
                    />
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
                      Copy Join Link
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
                          ? "Refresh Join Link"
                          : "Admin Refresh Only"}
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
                      Copy Invite Message
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
                      Email Join Link
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
                      WhatsApp
                    </StableButton>
                  </div>
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
                </div>

                <div style={innerCard("#FFFFFF")}>
                  <div style={sectionLabel()}>Verify community</div>
                  <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                    Share this when someone only needs to confirm the community exists in GSN.
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <span
                      style={compactStatusPillStyle(
                        Boolean(publicCommunityWorkspaceLink)
                      )}
                    >
                      {publicCommunityWorkspaceLink
                        ? "Community verification ready"
                        : "Community verification not ready yet"}
                    </span>
                  </div>
                  <div
                    style={{
                      ...linkReserveTextStyle(),
                      ...helperText(),
                      fontSize: 12,
                    }}
                  >
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
                      Copy Verify Link
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
                      Email Link
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
                      Open Verify Page
                    </StableButton>
                  </div>
                </div>

                <div style={publicShopFaceCardStyle(isCompact)}>
                  <div style={sectionLabel()}>Public shop face</div>
                  <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                    Share the one-shop storefront that follows your GSN ID.
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <span style={stableStatusPillStyle(Boolean(publicShopViewLink))}>
                      {publicShopViewLink
                        ? "Public shop link ready"
                        : publicShopRecord
                        ? "Public shop link reconnecting"
                        : "Public shop link needs refresh"}
                    </span>
                  </div>
                  <div
                    style={{
                      ...linkReserveTextStyle(),
                      ...helperText(),
                      fontSize: 12,
                    }}
                  >
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
                          lineHeight: 1.45,
                        }}
                      >
                        {publicShopViewLink}
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
                      {preparingPublicShopLink ? "Refreshing..." : "Refresh Shop Link"}
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
                      {preparingPublicShopLink ? "Refreshing..." : "Copy Shop Link"}
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
                      Email Link
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
                      Open Shop Face
                    </StableButton>
                  </div>
                </div>

                <div
                  id="marketplace-paid-network-placement"
                  style={{
                    ...innerCard("#F8FBFF"),
                    scrollMarginTop: isCompact ? 84 : 104,
                  }}
                >
                  <div style={sectionLabel()}>Paid Repost</div>
                  <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                    Pick one public shop block, enter the target community ID,
                    and send that exact block into the community Spotlight with
                    the paid Spotlight rail.
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={badge(Boolean(selectedRepostProduct))}>
                      {loadingRepostProducts
                        ? "Loading public blocks"
                        : selectedRepostProduct
                        ? "One block selected"
                        : "No eligible public block"}
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
                      {availableMarketplaceRepostCredits} paid credit{availableMarketplaceRepostCredits === 1 ? "" : "s"} available
                    </span>
                  </div>
                  {selectedRepostProduct ? (
                    <div
                      style={{
                        marginTop: 12,
                        minHeight: isCompact ? 292 : 190,
                        padding: 12,
                        borderRadius: 20,
                        border: "1px solid rgba(11, 45, 74, 0.14)",
                        background:
                          "linear-gradient(135deg, rgba(7,23,44,0.96) 0%, rgba(13,54,88,0.92) 100%)",
                        color: "#FFFFFF",
                        display: "grid",
                        gridTemplateColumns: isCompact
                          ? "1fr"
                          : "minmax(160px, 0.42fr) minmax(0, 1fr)",
                        gap: 12,
                        alignItems: "stretch",
                        overflow: "hidden",
                        overflowAnchor: "none",
                        transition: "none",
                      }}
                    >
                      <div
                        style={{
                          minHeight: isCompact ? 152 : 164,
                          borderRadius: 18,
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
                              minHeight: isCompact ? 152 : 164,
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
                              minHeight: isCompact ? 152 : 164,
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
                          gap: 9,
                          alignContent: "center",
                        }}
                      >
                        <div style={{ ...sectionLabel(), color: "#F2C766" }}>
                          Selected public block
                        </div>
                        <div
                          style={{
                            fontSize: isCompact ? 22 : 26,
                            lineHeight: 1.05,
                            fontWeight: 950,
                            overflowWrap: "anywhere",
                          }}
                        >
                          Block #{selectedRepostProduct.blockNumber || "?"}:{" "}
                          {selectedRepostProduct.title}
                        </div>
                        {selectedRepostProduct.description ? (
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
                          }}
                        >
                          {selectedRepostProduct.price ? (
                            <span
                              style={{
                                ...badge(true),
                                background: "rgba(242,199,102,0.16)",
                                color: "#FFF4C7",
                              }}
                            >
                              {selectedRepostProduct.price}{" "}
                              {selectedRepostProduct.currency || "NGN"}
                            </span>
                          ) : null}
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
                        </div>
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
                          disabled={!selectedRepostProductPublicLink}
                          style={{
                            ...marketplaceInlineActionStyle(
                              "soft",
                              !selectedRepostProductPublicLink,
                              isCompact
                            ),
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
                        Loading the selected shop block...
                      </div>
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        GSN is matching the block route to the owner shop record
                        before you choose the target community.
                      </div>
                    </div>
                  ) : null}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "1fr"
                        : "minmax(0, 1fr) minmax(0, 1fr) minmax(150px, 0.55fr)",
                      gap: 10,
                      marginTop: 12,
                    }}
                  >
                    <label style={{ display: "grid", gap: 6, color: "#0B1F33", fontWeight: 850 }}>
                      <span style={{ fontSize: 12 }}>Public block</span>
                      <select
                        value={String(selectedRepostProduct?.id || "")}
                        onChange={(event) =>
                          setSelectedRepostProductId(Number(event.target.value || 0))
                        }
                        disabled={loadingRepostProducts || repostProducts.length === 0}
                        style={inputStyle()}
                      >
                        {repostProducts.length === 0 ? (
                          <option value="">
                            {loadingRepostProducts
                              ? "Loading public blocks..."
                              : "No public block is ready"}
                          </option>
                        ) : (
                          repostProducts.map((product) => (
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
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
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
                  <div
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
                        <div style={{ fontWeight: 950, color: "#0B1F33" }}>
                          Target help
                        </div>
                        <div style={{ ...helperText(), fontSize: 13 }}>
                          Find public community IDs that fit this selected block.
                        </div>
                      </div>
                      <StableButton
                        type="button"
                        debugId="marketplace.network-repost.find-targets"
                        stableHeight={50}
                        onClick={(event) => {
                          runMarketplaceAction(event, () => {
                            void loadMarketplaceRepostTargetSuggestions();
                          });
                        }}
                        disabled={loadingRepostTargetSuggestions || !selectedRepostProduct}
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
                        {loadingRepostTargetSuggestions ? "Finding..." : "Find Target IDs"}
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
                                    if (!code) return;
                                    setRepostTargetMarketplaceId(code);
                                    showNotice(
                                      "success",
                                      `${code} selected for Paid Repost.`
                                    );
                                  });
                                }}
                                disabled={!code}
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
                                Use ID
                              </StableButton>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                  <div
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
                    <div style={{ fontWeight: 900 }}>
                      {canPlaceMarketplaceRepost
                        ? "Payment credit is ready for this duration."
                        : `Generate or confirm ${missingMarketplaceRepostCredits} more paid Spotlight credit${
                            missingMarketplaceRepostCredits === 1 ? "" : "s"
                          } before placing.`}
                    </div>
                    <div style={{ ...helperText(), fontSize: 13 }}>
                      One Repost day uses one paid Spotlight credit.
                      {requiredMarketplaceRepostCredits} day{requiredMarketplaceRepostCredits === 1 ? "" : "s"} =
                      {" "}{formatRailMoney(requiredMarketplaceRepostAmount, "GBP")} with the current GSN bundle rail.
                    </div>
                    {latestRepostPaymentReference ? (
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        Latest code: <strong>{latestRepostPaymentReference}</strong>
                        {latestRepostPaymentAmount ? ` | ${latestRepostPaymentAmount}` : ""}
                        {latestRepostPaymentStatus ? ` | ${latestRepostPaymentStatus}` : ""}
                      </div>
                    ) : (
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        No payment code is open for this Paid Repost yet.
                      </div>
                    )}
                  </div>
                  <div style={marketplaceInlineActionsStyle(isCompact)}>
                    <StableButton
                      type="button"
                      debugId="marketplace.network-repost.generate-payment-code"
                      stableHeight={58}
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          void createMarketplaceRepostPaymentInstruction();
                        });
                      }}
                      disabled={
                        creatingRepostPaymentInstruction ||
                        loadingRepostProducts ||
                        !selectedRepostProduct
                      }
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        creatingRepostPaymentInstruction ||
                          loadingRepostProducts ||
                          !selectedRepostProduct,
                        isCompact
                      )}
                    >
                      {creatingRepostPaymentInstruction ? "Generating..." : "Generate Payment Code"}
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
                      {loadingRepostCredits ? "Refreshing..." : "Refresh Credits"}
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
                      disabled={marketplaceRepostLocked}
                      style={marketplaceInlineActionStyle(
                        "primary",
                        marketplaceRepostLocked,
                        isCompact
                      )}
                    >
                      {placingMarketplaceRepost ? "Placing..." : "Place on Network Spotlight"}
                    </StableButton>
                    <StableCtaLink
                      to={routeWithCommunity(APP_ROUTES.SUBSCRIPTION_SPOTLIGHT, activeCommunityId)}
                      debugId="marketplace.network-repost.subscription"
                      stableHeight={58}
                      style={marketplaceInlineActionStyle("secondary", false, isCompact)}
                    >
                      Subscription Spotlight
                    </StableCtaLink>
                  </div>
                </div>

                <div style={innerCard("#F8FBFF")}>
                  <div style={sectionLabel()}>Private and controlled outward links</div>
                  <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                    {controlledMarketplaceLinkNote}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={badge(false)}>Private Vault access is conditional</span>
                    <span style={badge(false)}>Vault-style access stays controlled</span>
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
                      Open Owner Shop Control
                    </StableButton>
                  </div>
                </div>
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
          <div>
            <div style={sectionLabel()}>Members and shops</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Each line shows the person, their GSN ID, and the shop visible
              in this marketplace.
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
          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {memberRows.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No members are visible in this marketplace yet.
              </div>
            ) : (
              memberRows.map((row, index) => {
                const fitSuggestion = suggestedSupporterMap.get(row.supportKey);
                const selected = selectedSupporterKeys.has(row.supportKey);

                return (
                  <div
                    key={`${row.gmfnId || index}`}
                    style={{
                      ...innerCard("#FCFEFF"),
                      padding: isCompact ? 12 : 14,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isCompact
                          ? "1fr"
                          : "minmax(0, 1fr) auto",
                        gap: isCompact ? 10 : 14,
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "flex-start",
                          minWidth: 0,
                          width: "100%",
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 999,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flex: "0 0 auto",
                            border: "1px solid rgba(16,37,59,0.10)",
                            background:
                              "linear-gradient(180deg, #FFFFFF 0%, #EEF6FF 100%)",
                            color: "#12324F",
                            fontSize: 13,
                            fontWeight: 900,
                            boxShadow:
                              "0 8px 16px rgba(10,24,49,0.07), inset 0 1px 0 rgba(255,255,255,0.92)",
                          }}
                        >
                          {index + 1}
                        </div>

                        <div
                          style={{
                            minWidth: 0,
                            maxWidth: "100%",
                            display: "grid",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              flexWrap: "wrap",
                              minWidth: 0,
                            }}
                          >
                            <span
                              style={{
                                color: "#0B1F33",
                                fontSize: isCompact ? 15 : 17,
                                fontWeight: 950,
                                lineHeight: 1.25,
                                maxWidth: "100%",
                                overflowWrap: "anywhere",
                                wordBreak: "break-word",
                              }}
                            >
                              {row.name}
                            </span>
                            <span style={compactStatusPillStyle(true)}>
                              GSN ID:{" "}
                              {row.gmfnId ? displayGsnLabel(row.gmfnId) : "Pending"}
                            </span>
                            <span style={compactStatusPillStyle(Boolean(row.shopTo))}>
                              Shop: {row.shopName}
                            </span>
                          </div>

                          {fitSuggestion ? (
                            <div
                              style={{
                                color: "#51657A",
                                fontSize: 12,
                                fontWeight: 800,
                                lineHeight: 1.45,
                              }}
                            >
                              This member may be able to support the current
                              request.
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {(row.shopTo || fitSuggestion) ? (
                        <div
                          style={{
                            ...marketplaceInlineActionsStyle(isCompact),
                            marginTop: 0,
                            minWidth: isCompact ? "100%" : 260,
                            justifyContent: isCompact ? "flex-start" : "flex-end",
                          }}
                        >
                          {row.shopTo ? (
                            <StableCtaLink
                              debugId={`marketplace.member.${row.gmfnId || row.userId || "unknown"}.shop`}
                              to={row.shopTo}
                              stableHeight={58}
                              style={marketplaceInlineActionStyle("secondary", false, isCompact)}
                            >
                              Open shop
                            </StableCtaLink>
                          ) : null}

                          {fitSuggestion ? (
                            <StableButton
                              debugId={`marketplace.member.${row.gmfnId || row.userId || "unknown"}.choose-supporter`}
                              type="button"
                              onClick={(event) => {
                                runMarketplaceAction(event, () => {
                                  toggleMemberAsSupporter(row);
                                });
                              }}
                              stableHeight={58}
                              style={marketplaceInlineActionStyle(
                                selected ? "primary" : "soft",
                                false,
                                isCompact
                              )}
                            >
                              {selected ? "Chosen" : "Choose supporter"}
                            </StableButton>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
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
          <div>
            <div style={sectionLabel()}>Borrow / Lend / Support</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Start or continue support work inside this selected marketplace.
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
            what="This is where marketplace users begin a support request, read whether guarantors are needed, and continue into the borrowing flow when the draft becomes active."
            why="Support should feel connected to the current community and visible member context, not like a separate disconnected system."
            next="Start the request here, check the draft and fit signals below, then move into readiness, suggestions, or workbench only when the guided flow tells you to continue."
            tone="light"
            style={{ marginTop: 12 }}
          />
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

              <ExplainToggle
                label="What this request form does"
                what="This form starts a borrowing request inside the current community by collecting the amount, timing, and purpose before the guided support flow opens further."
                why="It gives people one clear starting point instead of making readiness, suggestions, and workbench feel like separate disconnected pages."
                next="Enter the request details first, start the draft, then use the guided pages below only after the draft and fit signals tell you what to do next."
                tone="light"
                style={{ marginTop: 12 }}
              />

              <div style={{ marginTop: 10, ...helperText(), maxWidth: 760 }}>
                Enter amount and duration first. If the draft needs guarantors,
                fit suggestions appear below. Once support becomes active, the
                guided continuation pages should carry the person through
                readiness, suggestions, and workbench in order.
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <div style={sectionLabel()}>Amount needed</div>
                  <input
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
                    type="number"
                    min="1"
                    value={loanDurationDays}
                    onChange={(e) => setLoanDurationDays(e.target.value)}
                    disabled={supportProcessBusy}
                    placeholder="Duration in days"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div style={{ gridColumn: isCompact ? "auto" : "1 / span 2" }}>
                  <div style={sectionLabel()}>Purpose / note</div>
                  <textarea
                    value={loanPurpose}
                    onChange={(e) => setLoanPurpose(e.target.value)}
                    disabled={supportProcessBusy}
                    placeholder="State what the support is for..."
                    style={{ ...textAreaStyle(), marginTop: 8 }}
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

              <div
                style={{
                  ...marketplaceInlineActionsStyle(isCompact),
                  marginTop: 12,
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
                              if (guarantorRequestsBlocked) return;
                              void handleSendGuarantorRequests();
                            });
                          }}
                          disabled={guarantorRequestsBlocked}
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
