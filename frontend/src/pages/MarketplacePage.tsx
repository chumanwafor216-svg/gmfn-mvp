import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DomainIntroToggle from "../components/DomainIntroToggle";
import ExplainToggle from "../components/ExplainToggle";
import GSNBrandMark from "../components/GSNBrandMark";
import { normalizedJoinInviteUrl } from "../lib/joinLinks";
import { navigateWithOrigin } from "../lib/nav";
import {
  navigateToCta,
  resolveCtaTarget,
  type CtaIntent,
} from "../lib/ctaTargets";
import { routeWithCommunity } from "../lib/appRoutes";
import {
  publicFrontendUrl,
  publicShopDiariesUrl,
  publicShopPath,
} from "../lib/publicLinks";
import { useLocation, useNavigate } from "react-router-dom";
import { StableButton, StableCtaLink } from "../components/StableButton";
import {
  addLoanGuarantorRequest,
  cancelLoanRequest,
  createMarketplaceShop,
  createClanInvite,
  createLoanRequest,
  getClanTrustScoreExplained,
  getClanInviteLink,
  getCurrentClan,
  getLoanGuarantorSuggestions,
  getLoanSummary,
  getMarketplaceShopByGmfnId,
  getMarketplaceShops,
  getMe,
  getPoolMe,
  getSelectedClanId,
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
    visible: false,
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
    visible: false,
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
    firstTruthy(
      member?.display_name,
      member?.nickname,
      [safeStr(member?.first_name), safeStr(member?.surname)]
        .filter(Boolean)
        .join(" "),
      member?.email,
      member?.phone_e164
    ) || "Member"
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
    name: firstTruthy(src?.name, src?.shop_name, src?.title),
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
    return "radial-gradient(circle at 10% 0%, rgba(33,163,101,0.10) 0%, rgba(33,163,101,0.00) 38%), radial-gradient(circle at 90% 8%, rgba(214,170,69,0.10) 0%, rgba(214,170,69,0.00) 30%), radial-gradient(circle at 16% 100%, rgba(31,115,224,0.07) 0%, rgba(31,115,224,0.00) 24%), linear-gradient(180deg, var(--gsn-white) 0%, var(--gsn-blue-50) 54%, var(--gsn-surface-blue) 100%)";
  }

  if (bg === "#FCFEFF") {
    return "radial-gradient(circle at 12% 0%, rgba(33,163,101,0.08) 0%, rgba(33,163,101,0.00) 34%), radial-gradient(circle at 84% 8%, rgba(214,170,69,0.08) 0%, rgba(214,170,69,0.00) 24%), linear-gradient(180deg, var(--gsn-off-white) 0%, var(--gsn-blue-50) 100%)";
  }

  if (bg === "#F8FBFF") {
    return "radial-gradient(circle at 88% 6%, rgba(214,170,69,0.10) 0%, rgba(214,170,69,0.00) 28%), radial-gradient(circle at 14% 12%, rgba(33,163,101,0.08) 0%, rgba(33,163,101,0.00) 26%), linear-gradient(180deg, var(--gsn-blue-50) 0%, var(--gsn-surface-blue) 100%)";
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
  return "radial-gradient(circle at 8% 0%, rgba(33,163,101,0.16) 0%, rgba(33,163,101,0.00) 34%), radial-gradient(circle at 90% 10%, rgba(214,170,69,0.14) 0%, rgba(214,170,69,0.00) 30%), radial-gradient(circle at 84% 18%, rgba(31,115,224,0.10) 0%, rgba(31,115,224,0.00) 28%), linear-gradient(180deg, var(--gsn-white) 0%, var(--gsn-blue-50) 54%, var(--gsn-surface-blue) 100%)";
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
    background:
      "radial-gradient(circle at 10% 0%, rgba(33,163,101,0.18) 0%, rgba(33,163,101,0.00) 32%), radial-gradient(circle at 90% 10%, rgba(214,170,69,0.13) 0%, rgba(214,170,69,0.00) 28%), radial-gradient(circle at 12% 48%, rgba(31,115,224,0.10) 0%, rgba(31,115,224,0.00) 30%), var(--page-bg)",
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
    opacity: isCompact ? 0.62 : 0.56,
    background:
      "radial-gradient(circle at 16% 14%, rgba(33,163,101,0.12) 0%, rgba(33,163,101,0.00) 30%), radial-gradient(circle at 76% 20%, rgba(214,170,69,0.08) 0%, rgba(214,170,69,0.00) 26%), radial-gradient(circle at 58% 8%, rgba(31,115,224,0.07) 0%, rgba(31,115,224,0.00) 22%), radial-gradient(circle at 18% 46%, rgba(33,163,101,0.08) 0%, rgba(33,163,101,0.00) 30%), radial-gradient(circle at 84% 62%, rgba(214,170,69,0.06) 0%, rgba(214,170,69,0.00) 26%)",
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
      height: 48,
      minHeight: 44,
      maxHeight: 48,
      padding: "10px 15px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.18)",
      background: disabled
        ? "linear-gradient(180deg, var(--gsn-border) 0%, var(--gsn-border-strong) 100%)"
        : "linear-gradient(180deg, var(--primary-accent) 0%, #0b5f43 100%)",
      color: disabled ? "var(--gsn-text-muted)" : "var(--gsn-text-inverse)",
      fontWeight: 900,
      fontSize: 13,
      lineHeight: 1.15,
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      opacity: disabled ? 0.86 : 1,
      boxShadow:
        "0 14px 24px rgba(22,130,84,0.22), inset 0 1px 0 rgba(255,255,255,0.20), inset 0 -2px 0 rgba(3,16,31,0.16)",
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
      height: 48,
      minHeight: 44,
      maxHeight: 48,
      padding: "10px 14px",
      borderRadius: 13,
      border: "1px solid var(--gsn-border)",
      background:
        "linear-gradient(180deg, var(--gsn-white) 0%, var(--gsn-blue-50) 58%, var(--gsn-surface-blue) 100%)",
      color: disabled ? "var(--gsn-text-muted)" : "var(--gsn-text-soft)",
      fontWeight: 900,
      fontSize: 12,
      lineHeight: 1.15,
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      opacity: disabled ? 0.86 : 1,
      boxShadow:
        "var(--shadow-soft)",
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
      flexShrink: 0,
      overflowAnchor: "none",
      transition: "none",
    };
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    minHeight: 44,
    maxHeight: 48,
    padding: "10px 15px",
    borderRadius: 14,
    border: "1px solid var(--gsn-border)",
    background:
      "linear-gradient(180deg, var(--gsn-white) 0%, var(--gsn-blue-50) 56%, var(--gsn-surface-blue) 100%)",
    color: disabled ? "var(--gsn-text-muted)" : "var(--gsn-text-main)",
    fontWeight: 900,
    fontSize: 13,
    lineHeight: 1.15,
    textAlign: "center",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    opacity: disabled ? 0.86 : 1,
    boxShadow:
      "var(--shadow-soft)",
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
  kind: "join" | "create" | "marketplace" | "shop",
  subject: string
): string {
  if (!url) return "";

  const code = maskedLinkCode(url);
  const cleanedSubject = safeStr(subject) || "GSN";

  if (kind === "join") {
    return `Secure GSN join link for ${cleanedSubject}${code ? ` • code ${code}` : ""}`;
  }

  if (kind === "create") {
    return `Secure GSN founder entry${code ? ` • code ${code}` : ""}`;
  }

  if (String(kind) === "marketplace") {
    return `Community access desk for ${cleanedSubject}${code ? ` - ref ${code}` : ""}`;
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
  kind: "join" | "create",
  opts: {
    memberName: string;
    communityName: string;
    url: string;
  }
): string {
  const sender = safeStr(opts.memberName) || "a GSN member";
  const community = safeStr(opts.communityName) || "this community";
  const url = safeStr(opts.url);

  if (kind === "create") {
    return [
      `GSN note from ${sender}:`,
      "",
      "If you want to start your own community in GSN, use the secure entry below.",
      `This is not the join link for ${community}.`,
      "",
      "GSN helps existing trust become visible, portable, and usable.",
      url,
    ].join("\n");
  }

  return [
    `GSN note from ${sender}:`,
    "",
    `This is a secure GSN join link for ${community}.`,
    "Open it when you are ready to send your request back to the community.",
    "",
    "GSN helps existing trust become visible, portable, and usable.",
    url,
  ].join("\n");
}

function buildGsnSharePreview(
  kind: "join" | "create",
  opts: {
    memberName: string;
    communityName: string;
    maskedLabel: string;
  }
): string {
  const sender = safeStr(opts.memberName) || "a GSN member";
  const community = safeStr(opts.communityName) || "this community";
  const maskedLabel = safeStr(opts.maskedLabel) || "Secure GSN link";

  if (kind === "create") {
    return [
      `GSN note from ${sender}:`,
      "",
      "If you want to start your own community in GSN, use the secure entry below.",
      `This is not the join link for ${community}.`,
      "",
      "GSN helps existing trust become visible, portable, and usable.",
      maskedLabel,
    ].join("\n");
  }

  return [
    `GSN note from ${sender}:`,
    "",
    `This is a secure GSN join link for ${community}.`,
    "Open it when you are ready to send your request back to the community.",
    "",
    "GSN helps existing trust become visible, portable, and usable.",
    maskedLabel,
  ].join("\n");
}

function buildGsnEmailSubject(
  kind: "join" | "create" | "marketplace" | "shop",
  communityName: string
): string {
  const cleanedCommunity = safeStr(communityName) || "this GSN community";

  if (kind === "join") {
    return `GSN community join link for ${cleanedCommunity}`;
  }

  if (kind === "create") {
    return "GSN start a new community link";
  }

  if (String(kind) === "marketplace") {
    return `GSN community access desk link for ${cleanedCommunity}`;
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
    gridAutoRows: "54px",
    gap: 10,
    alignItems: "stretch",
    overflowAnchor: "none",
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
    height: 54,
    minHeight: 54,
    maxHeight: 54,
    padding: "0 12px",
    pointerEvents: "auto",
    touchAction: "manipulation",
    overflowAnchor: "none",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    transition: "none",
  };
}

function intentGuideCardStyle(): React.CSSProperties {
  return {
    marginTop: 14,
    borderRadius: 20,
    border: "1px solid rgba(16,37,59,0.10)",
    background:
      "radial-gradient(circle at 12% 8%, rgba(34,82,120,0.08) 0%, rgba(34,82,120,0.00) 36%), linear-gradient(180deg, #FFFFFF 0%, #F4F8FB 100%)",
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
    minHeight: 68,
    alignItems: "flex-start",
    flexDirection: "column",
    gap: 5,
    padding: "11px 12px",
    textAlign: "left",
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
    height: isCompact ? 184 : 154,
    minHeight: isCompact ? 184 : 154,
    maxHeight: isCompact ? 184 : 154,
    borderRadius: isCompact ? 18 : 20,
    border: "1px solid var(--gsn-border)",
    background:
      "linear-gradient(180deg, var(--gsn-white) 0%, var(--gsn-blue-50) 100%)",
    padding: isCompact ? 12 : 14,
    display: "grid",
    gridTemplateRows: isCompact
      ? "54px minmax(0, 2.35em) minmax(0, 1.4em) minmax(0, 2.7em)"
      : "62px minmax(0, 2.35em) minmax(0, 1.4em) minmax(0, 2.7em)",
    gap: isCompact ? 7 : 9,
    alignContent: "start",
    color: "var(--gsn-text-main)",
    textAlign: "center",
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
  };
}

function marketplaceOsIconStyle(bg: string, isCompact = false): React.CSSProperties {
  return {
    width: isCompact ? 54 : 62,
    height: isCompact ? 54 : 62,
    borderRadius: isCompact ? 17 : 19,
    margin: "0 auto",
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
    minWidth: 0,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    color: "var(--gsn-text-main)",
    fontSize: isCompact ? 16 : 18,
    fontWeight: 950,
    lineHeight: 1.15,
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
  };
}

function marketplaceOsTileMetricStyle(
  color: string,
  isCompact: boolean
): React.CSSProperties {
  return {
    minWidth: 0,
    display: "block",
    color,
    fontSize: isCompact ? 17 : 20,
    fontWeight: 950,
    lineHeight: 1.15,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
}

function marketplaceOsTileHelperStyle(isCompact: boolean): React.CSSProperties {
  return {
    ...helperText(),
    minWidth: 0,
    display: "-webkit-box",
    WebkitLineClamp: 2,
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
    height: isCompact ? 92 : 86,
    minHeight: isCompact ? 92 : 86,
    maxHeight: isCompact ? 92 : 86,
    borderRadius: isCompact ? 18 : 16,
    border: "1px solid var(--gsn-border)",
    background:
      "linear-gradient(180deg, var(--gsn-white) 0%, var(--gsn-blue-50) 100%)",
    padding: isCompact ? 12 : 13,
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto",
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
    display: "grid",
    gap: 4,
    alignContent: "center",
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
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
  };
}

function marketplaceOsRowDetailStyle(isCompact: boolean): React.CSSProperties {
  return {
    minWidth: 0,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    color: "#4A6178",
    fontSize: isCompact ? 12 : 13,
    fontWeight: 750,
    lineHeight: 1.25,
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
  };
}

function marketplaceOsArrowStyle(): React.CSSProperties {
  return {
    color: "#173750",
    fontSize: 28,
    fontWeight: 900,
    lineHeight: 1,
  };
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
  const [creatingInviteLink, setCreatingInviteLink] = useState(false);
  const [publicShopRecord, setPublicShopRecord] =
    useState<MarketplaceShop | null>(null);
  const [preparingPublicShopLink, setPreparingPublicShopLink] = useState(false);
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
  const [sectionsTouched, setSectionsTouched] =
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
    return publicFrontendUrl(`/community/${encodeURIComponent(String(activeCommunityId))}`);
  }, [activeCommunityId]);

  const publicCreateEntryLink = useMemo(() => {
    return publicFrontendUrl("/public-create");
  }, []);

  const publicShopViewLink = useMemo(() => {
    if (!publicShopOwnerId || !publicShopRecord) return "";
    return publicShopDiariesUrl(publicShopOwnerId);
  }, [publicShopOwnerId, publicShopRecord]);
  const publicShopActionsLocked =
    !currentGmfnId || !activeCommunityId || preparingPublicShopLink;

  const publicShopUnavailableText = !currentGmfnId
    ? "Your GSN ID is not ready yet."
    : "Prepare your public shop link first so it is connected to an active shop before you send it.";

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
    setSectionsTouched((prev) => ({
      ...prev,
      [key]: true,
    }));
    setSectionsOpen((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function toggleSectionFromButton(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    key: keyof SectionState
  ) {
    consumeMarketplaceButtonEvent(event);
    clearMarketplaceHash();
    toggleSection(key);
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
      const topNavOffset = Math.min(
        96,
        Math.max(18, Math.round((window.innerHeight || 0) * 0.08))
      );
      const targetTop =
        target.getBoundingClientRect().top + window.scrollY - topNavOffset;

      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "auto",
      });
      return;
    }
    if (attempt >= 5) return;
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

      [120, 320, 700, 1100].forEach((delay) => {
        const timeoutId = window.setTimeout(() => {
          scrollToMarketplaceSection(sectionId);
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
      setSectionsOpen((prev) => ({ ...prev, support: true }));
      clearStaleMarketplaceHash("marketplace-loans-support");
      scheduleMarketplaceSectionScroll("marketplace-loans-support");
      return;
    }

    if (item.id === "invite") {
      setSectionsOpen((prev) => ({ ...prev, tools: true }));
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
      const displayName = safeStr(me?.display_name || me?.name || "");
      const shopName = publicShopRecord?.name || displayName || `${currentGmfnId} Shop`;
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
      const link = ownerId ? publicShopDiariesUrl(ownerId) : "";
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
    const link = await getFreshPublicShopLink();
    copyMarketplaceLink(
      link,
      "Public shop link refreshed and copied.",
      publicShopUnavailableText
    );
  }

  async function emailFreshPublicShopLink() {
    const link = await getFreshPublicShopLink();
    openMarketplaceEmail(
      shopEmailSubject,
      ["Here is the public GSN shop face.", "", link].join("\n"),
      link,
      publicShopUnavailableText
    );
  }

  async function openFreshPublicShopLink() {
    const link = await getFreshPublicShopLink();
    openMarketplaceExternalLink(link, publicShopUnavailableText);
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

    setSectionsOpen(savedSections || DEFAULT_SECTION_STATE);
  }, [activeCommunityId]);

  useEffect(() => {
    if (!activeCommunityId) return;
    writeLocalJSON(communitySectionsStorageKey(activeCommunityId), sectionsOpen);
  }, [sectionsOpen, activeCommunityId]);

  useEffect(() => {
    if (!loanDraftId) return;
    setSectionsOpen((prev) => ({
      ...prev,
      members: true,
      support: true,
    }));
  }, [loanDraftId]);

  useEffect(() => {
    const hash = safeStr(location.hash).replace(/^#/, "");
    if (hash !== "marketplace-loans-support") return;

    setSectionsOpen((prev) => {
      if (prev.members && prev.support) return prev;
      return {
        ...prev,
        members: true,
        support: true,
      };
    });

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

    setSectionsOpen((prev) => {
      if (prev.tools) return prev;
      return {
        ...prev,
        tools: true,
      };
    });

    scrollToMarketplaceSection("marketplace-owned-links");
  }, [location.hash, scrollToMarketplaceSection]);

  const memberName = useMemo(() => {
    return (
      firstTruthy(
        me?.display_name,
        me?.nickname,
        me?.name,
        me?.first_name,
        me?.email
      ) || "Member"
    );
  }, [me]);

  const activeCommunityName = useMemo(() => {
    return communityName(selectedCommunity);
  }, [selectedCommunity]);

  const maskedInviteLinkLabel = useMemo(() => {
    return cleanMaskedLinkLabel(
      buildMaskedLinkLabel(inviteLink, "join", activeCommunityName)
    );
  }, [inviteLink, activeCommunityName]);

  const maskedCreateEntryLabel = useMemo(() => {
    return cleanMaskedLinkLabel(
      buildMaskedLinkLabel(
        publicCreateEntryLink,
        "create",
        activeCommunityName
      )
    );
  }, [publicCreateEntryLink, activeCommunityName]);

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
      communityName: activeCommunityName,
      url: inviteLink,
    });
  }, [memberName, activeCommunityName, inviteLink]);

  const joinWhatsappPreview = useMemo(() => {
    return buildGsnSharePreview("join", {
      memberName,
      communityName: activeCommunityName,
      maskedLabel: maskedInviteLinkLabel,
    });
  }, [memberName, activeCommunityName, maskedInviteLinkLabel]);

  const createWhatsappMessage = useMemo(() => {
    return buildGsnShareMessage("create", {
      memberName,
      communityName: activeCommunityName,
      url: publicCreateEntryLink,
    });
  }, [memberName, activeCommunityName, publicCreateEntryLink]);

  const createWhatsappPreview = useMemo(() => {
    return buildGsnSharePreview("create", {
      memberName,
      communityName: activeCommunityName,
      maskedLabel: maskedCreateEntryLabel,
    });
  }, [memberName, activeCommunityName, maskedCreateEntryLabel]);

  const joinEmailSubject = useMemo(() => {
    return buildGsnEmailSubject("join", activeCommunityName);
  }, [activeCommunityName]);

  const createEmailSubject = useMemo(() => {
    return buildGsnEmailSubject("create", activeCommunityName);
  }, [activeCommunityName]);

  const marketplaceEmailSubject = useMemo(() => {
    return buildGsnEmailSubject("marketplace", activeCommunityName);
  }, [activeCommunityName]);

  const marketplaceEmailMessage = useMemo(() => {
    return [
      `Here is the public GSN community access desk for ${activeCommunityName}.`,
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
      const memberDisplayName = getMemberName(member);
      const supportKey =
        userId > 0 ? `u-${userId}` : gmfn ? `g-${gmfn.toUpperCase()}` : "";

      return {
        member,
        name: memberDisplayName,
        gmfnId: gmfn,
        userId,
        supportKey,
        shopName: shop
          ? firstTruthy(shop?.name, "Shop available")
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
    setSectionsOpen((prev) => ({ ...prev, [key]: true }));
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
      showNotice("error", "Only a community admin can refresh this join link.");
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
      window.open(url, "_blank", "noopener,noreferrer");
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

      setSectionsOpen((prev) => ({
        ...prev,
        members: true,
        support: true,
      }));

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
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
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
                  🛍️ {marketplaceTradeLabel}
                </span>
                <span style={{ ...badgeStyle(true), color: "#12324F" }}>
                  👥 {marketplaceMemberLabel}
                </span>
                <span style={{ ...badgeStyle(true), color: "#12324F" }}>
                  🛡️ {marketplaceTrustDisplay}
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
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(4, minmax(0, 1fr))",
              gap: isCompact ? 10 : 12,
            }}
          >
            <StableButton
              type="button"
              debugId="marketplace.tile.money"
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
                💳
              </span>
              <span style={marketplaceOsTileTitleStyle(isCompact)}>
                Dues & Contributions
              </span>
              <span style={marketplaceOsTileMetricStyle("#0B63D1", isCompact)}>
                {marketplacePoolLabel}
              </span>
              <span style={marketplaceOsTileHelperStyle(isCompact)}>
                Shared money position
              </span>
            </StableButton>

            <StableButton
              type="button"
              debugId="marketplace.tile.support"
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
                🤝
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
                🛒
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
                🛡️
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
                💷
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
                ›
              </span>
            </StableButton>

            <StableButton
              type="button"
              debugId="marketplace.row.payment-rails"
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
                🏦
              </span>
              <span style={marketplaceOsRowTextStackStyle()}>
                <span style={marketplaceOsRowTitleStyle(isCompact)}>
                  Banking Rails
                </span>
                <span style={marketplaceOsRowDetailStyle(isCompact)}>
                  Review payment rails, bank transfer routes, and settlement setup.
                </span>
              </span>
              <span aria-hidden="true" style={marketplaceOsArrowStyle()}>
                ›
              </span>
            </StableButton>

            <StableButton
              type="button"
              debugId="marketplace.row.loan-process"
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
                💚
              </span>
              <span style={marketplaceOsRowTextStackStyle()}>
                <span style={marketplaceOsRowTitleStyle(isCompact)}>
                  Loan Process
                </span>
                <span style={marketplaceOsRowDetailStyle(isCompact)}>
                  Start support, check readiness, choose guarantors, and continue the loan workbench.
                </span>
              </span>
              <span aria-hidden="true" style={marketplaceOsArrowStyle()}>
                ›
              </span>
            </StableButton>

            <StableButton
              type="button"
              debugId="marketplace.row.member-ledger"
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
                📋
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
                ›
              </span>
            </StableButton>

            <StableButton
              type="button"
              debugId="marketplace.row.demand-box"
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
                📣
              </span>
              <span style={marketplaceOsRowTextStackStyle()}>
                <span style={marketplaceOsRowTitleStyle(isCompact)}>
                  Demand Box
                </span>
                <span style={marketplaceOsRowDetailStyle(isCompact)}>
                  Open requests and community needs when demand appears.
                </span>
              </span>
              <span aria-hidden="true" style={marketplaceOsArrowStyle()}>
                ›
              </span>
            </StableButton>

            <StableButton
              type="button"
              debugId="marketplace.row.records-links"
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
                🗂️
              </span>
              <span style={marketplaceOsRowTextStackStyle()}>
                <span style={marketplaceOsRowTitleStyle(isCompact)}>
                  Records & Links
                </span>
                <span style={marketplaceOsRowDetailStyle(isCompact)}>
                  Join links, public faces, and controlled outward links.
                </span>
              </span>
              <span aria-hidden="true" style={marketplaceOsArrowStyle()}>
                ›
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
              ✨
            </span>
            <span style={marketplaceOsRowTextStackStyle()}>
              <span style={marketplaceOsRowTitleStyle(isCompact)}>
                {intentGuideOpen ? "Hide extra marketplace tools" : "Open extra marketplace tools"}
              </span>
              <span style={marketplaceOsRowDetailStyle(isCompact)}>
                Use this only when the four main blocks are not enough.
              </span>
            </span>
            <span aria-hidden="true" style={marketplaceOsArrowStyle()}>
              {intentGuideOpen ? "⌃" : "›"}
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

      {sectionsOpen.money || sectionsTouched.money ? (
      <section
        id="marketplace-money-routes"
        style={{ ...pageCard("#FFFFFF"), order: 8 }}
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
            <div style={sectionLabel()}>Money route detail</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              This marketplace's local money rails and the handoff into the
              fuller Finance record.
            </div>
          </div>

          <StableButton
            type="button"
            debugId="marketplace.money.toggle"
            onClick={(event) => toggleSectionFromButton(event, "money")}
            style={marketplaceActionStyle("soft")}
          >
            {sectionsOpen.money ? "Collapse" : "Open"}
          </StableButton>
        </div>

        <ExplainToggle
          label="What these routes do"
          what="These routes tell you whether money can come in, move out, or continue into the fuller finance view for this community."
          why="Marketplace activity feels safer when users can confirm the community account, personal payout path, and live money status before acting."
          next="Check which route is ready first, then open Money In, Money Out, or Finance depending on whether you are funding, withdrawing, or reviewing the deeper money record."
          tone="light"
          style={{ marginTop: 12 }}
        />

        {sectionsOpen.money ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div style={sectionLabel()}>Visible pool position</div>

              <ExplainToggle
                label="What this pool reading does"
                what="This shows the pool amount currently visible in the community so users can read the shared money position at a glance."
                why="It helps people separate the community pool from personal payout and from the fixed settlement destination used for Money In."
                next="Use this as a quick shared-money reading, then open Money In, Money Out, or Finance when you need to act on the underlying routes."
                tone="light"
                style={{ marginTop: 12 }}
              />

              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 22,
                  lineHeight: 1.2,
                }}
              >
                {visiblePoolAmount} {visiblePoolCurrency}
              </div>

              <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                This shows the pool amount currently visible in your community.
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>Community account</div>

              <ExplainToggle
                label="What this account does"
                what="This is the fixed community settlement destination that Money In depends on for this marketplace."
                why="It keeps community funding separate from personal payout so users can tell which money lane belongs to the whole community."
                next="Check whether this account is ready before opening Money In, then use personal payout separately only for approved Money Out activity."
                tone="light"
                style={{ marginTop: 12 }}
              />

              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                {settlementSummary(moneySurface?.communitySettlement || null)}
              </div>

              <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                Money In uses this fixed community account and settlement route.
              </div>

              <div style={{ marginTop: 12 }}>
                <span style={communitySettlementReady ? badge(true) : badge(false)}>
                  {communitySettlementReady ? "Community account ready" : "Community account not ready"}
                </span>
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>Personal payout</div>

              <ExplainToggle
                label="What this payout does"
                what="This is the personal payout destination that approved Money Out should use for the current member."
                why="It keeps member withdrawals separate from the shared community settlement route so users can see which money lane belongs to them personally."
                next="Check whether this payout path is ready before opening Money Out, and use the community account separately when the action is funding the wider community."
                tone="light"
                style={{ marginTop: 12 }}
              />

              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                {payoutSummary(moneySurface)}
              </div>

              <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                Approved Money Out should land here. It stays separate from the fixed community account.
              </div>

              <div style={{ marginTop: 12 }}>
                <span style={payoutReady ? badge(true) : badge(false)}>
                  {payoutReady ? "Personal payout ready" : "Personal payout not ready"}
                </span>
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>Money In</div>

              <ExplainToggle
                label="What this pay-in route does"
                what="This opens the guided route for paying money into the community pool through the community settlement path."
                why="It gives users one clear funding lane instead of making pay-in feel interchangeable with payout or support activity."
                next="Use this when the goal is to fund the community, then follow the guided pay-in flow through reference, confirmation, and reconciliation."
                tone="light"
                style={{ marginTop: 12 }}
              />

              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Pay into the community pool
              </div>

              <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                  Start the guided pay-in route for this community. Once opened, the
                  pay-in route should carry the member through reference generation,
                  payment confirmation, and reconciliation.
              </div>

              <div style={{ marginTop: 14 }}>
                <StableButton
                  debugId="marketplace.money.money-in"
                  type="button"
                  onClick={(event) => openMarketplaceCta(event, "moneyIn")}
                  style={marketplaceActionStyle("primary")}
                >
                  Money In
                </StableButton>
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>Money Out</div>

              <ExplainToggle
                label="What this withdrawal route does"
                what="This opens the guided route for taking money out through the member-side withdrawal path for the current community."
                why="It keeps withdrawal separate from community funding and makes it clear that the route will decide whether direct payout or support-backed continuation applies."
                next="Use this when the goal is withdrawal, then let the guided route determine whether it can complete directly or needs to continue into support."
                tone="light"
                style={{ marginTop: 12 }}
              />

              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Withdraw through the guided route
              </div>

              <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                  Start the guided withdrawal route for this community. The route
                  decides direct withdrawal or support-backed continuation from the
                  requested amount and available position.
              </div>

              <div style={{ marginTop: 14 }}>
                <StableButton
                  debugId="marketplace.money.money-out"
                  type="button"
                  onClick={(event) =>
                    openMarketplaceCta(event, "moneyOut")
                  }
                  style={marketplaceActionStyle("secondary")}
                >
                  Money Out
                </StableButton>
              </div>
            </div>

            <div style={innerCard("#F8FBFF")}>
              <div style={sectionLabel()}>Finance</div>

              <ExplainToggle
                label="What this finance view does"
                what="This opens the fuller money record for the current community, including pool activity, support movement, locks, releases, and visible financial history."
                why="It gives users a deeper reading when the summary money cards are no longer enough to understand what is happening."
                next="Use this after reading the lighter marketplace money cards when you need the full financial story behind funding, withdrawal, or support activity."
                tone="light"
                style={{ marginTop: 12 }}
              />

              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Pool, support, locks, releases
              </div>

              <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                  Open the fuller financial truth for this community, including pay-in,
                  withdrawal, support, locks, releases, and visible event history.
              </div>

              <div style={{ marginTop: 14 }}>
                <StableButton
                  debugId="marketplace.money.finance"
                  type="button"
                  onClick={(event) => openMarketplaceCta(event, "finance")}
                  style={marketplaceActionStyle("secondary")}
                >
                  See this in Finance
                </StableButton>
              </div>
            </div>
          </div>
        ) : null}
      </section>
      ) : null}

      {sectionsOpen.tools || sectionsTouched.tools ? (
      <section
        id="marketplace-owned-links"
        style={{ ...pageCard("#FFFFFF"), order: 4 }}
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
              Keep join, create, marketplace, shop, and controlled outward
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
            what="This area separates the GSN create-entry link from the links that belong to the selected community: the community join link, the community access desk, the public shop face, and controlled private-access links."
            why="Join and create should never feel like the same action. Marketplace-facing links should stay local to this community, while create entry should remain the one wider GSN starting door."
            next="Use join when someone should enter this exact community, create when someone should start a new community, the community access desk when someone should see this community outwardly, the public shop face when someone should see one storefront, and controlled links for private Vault-style access."
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
                  community, let someone start a new community, show this
                  marketplace face, show your public shop face, or send a
                  controlled private-Vault route. Each link now has its own
                  lane.
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
                        : "Join link not ready yet"}
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
                      ? inviteLink
                      : canManageMarketplaceLinks
                        ? "Create the join link first, then copy or open it from here."
                        : "A community admin prepares this join link before it can be copied or sent."}
                  </div>
                  <div style={marketplaceInlineActionsStyle(isCompact)}>
                    <StableButton
                      debugId="marketplace.links.join.copy"
                      type="button"
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          copyMarketplaceLink(
                            inviteLink,
                            "Join link copied.",
                            "Join invite link is not ready yet."
                          );
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "primary",
                        !inviteLink,
                        isCompact
                      )}
                      disabled={!inviteLink}
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
                      disabled={creatingInviteLink || !canManageMarketplaceLinks}
                    >
                      {creatingInviteLink ? "Refreshing..." : "Refresh Join Link"}
                    </StableButton>
                    <StableButton
                      debugId="marketplace.links.join.copy-message"
                      type="button"
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          copyMarketplaceMessage(
                            joinWhatsappMessage,
                            inviteLink,
                            "Join message copied.",
                            "Join invite link is not ready yet."
                          );
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        !inviteLink,
                        isCompact
                      )}
                      disabled={!inviteLink}
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
                            inviteLink,
                            "Join invite link is not ready yet."
                          );
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        !inviteLink,
                        isCompact
                      )}
                      disabled={!inviteLink}
                    >
                      Email Join Link
                    </StableButton>
                    <StableButton
                      debugId="marketplace.links.join.whatsapp"
                      type="button"
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          if (!inviteLink) {
                            showNotice("error", "Join invite link is not ready yet.");
                            return;
                          }
                          if (typeof window !== "undefined") {
                            window.open(
                              `https://wa.me/?text=${encodeURIComponent(joinWhatsappMessage)}`,
                              "_blank",
                              "noopener,noreferrer"
                            );
                          }
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        !inviteLink,
                        isCompact
                      )}
                      disabled={!inviteLink}
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
                        : "The join message preview will appear here after the join link is ready."}
                    </div>
                  </div>
                </div>

                <div style={innerCard("#FFFFFF")}>
                  <div style={sectionLabel()}>Start a new community</div>
                  <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                    Send this only when someone should create their own
                    community. It will not join them to the selected community.
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <span style={compactStatusPillStyle(Boolean(publicCreateEntryLink))}>
                      {publicCreateEntryLink
                        ? "Create entry link ready"
                        : "Create entry link not ready yet"}
                    </span>
                  </div>
                  {publicCreateEntryLink ? (
                    <div style={shareMessageCardStyle(isCompact)}>
                      <div style={sectionLabel()}>Message to send</div>
                      <div
                        style={{
                          marginTop: 8,
                          ...helperText(),
                          whiteSpace: "pre-line",
                          fontSize: 13,
                        }}
                      >
                        {createWhatsappPreview}
                      </div>
                      <div style={{ marginTop: 8, ...helperText(), fontSize: 12 }}>
                        {maskedCreateEntryLabel}
                      </div>
                    </div>
                  ) : null}
                  <div style={marketplaceInlineActionsStyle(isCompact)}>
                    <StableButton
                      debugId="marketplace.links.create.copy"
                      type="button"
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          copyMarketplaceLink(
                            publicCreateEntryLink,
                            "Create entry link copied.",
                            "Create entry link is not ready yet."
                          );
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        !publicCreateEntryLink,
                        isCompact
                      )}
                      disabled={!publicCreateEntryLink}
                    >
                      Copy Create Link
                    </StableButton>
                    <StableButton
                      debugId="marketplace.links.create.copy-message"
                      type="button"
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          copyMarketplaceMessage(
                            createWhatsappMessage,
                            publicCreateEntryLink,
                            "Create message copied.",
                            "Create entry link is not ready yet."
                          );
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        !publicCreateEntryLink,
                        isCompact
                      )}
                      disabled={!publicCreateEntryLink}
                    >
                      Copy Message
                    </StableButton>
                    <StableButton
                      debugId="marketplace.links.create.email"
                      type="button"
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          openMarketplaceEmail(
                            createEmailSubject,
                            createWhatsappMessage,
                            publicCreateEntryLink,
                            "Create entry link is not ready yet."
                          );
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        !publicCreateEntryLink,
                        isCompact
                      )}
                      disabled={!publicCreateEntryLink}
                    >
                      Email Link
                    </StableButton>
                    <StableButton
                      debugId="marketplace.links.create.open"
                      type="button"
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          openMarketplaceExternalLink(
                            publicCreateEntryLink,
                            "Create entry link is not ready yet."
                          );
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        !publicCreateEntryLink,
                        isCompact
                      )}
                      disabled={!publicCreateEntryLink}
                    >
                      Open Create Link
                    </StableButton>
                    <StableButton
                      debugId="marketplace.links.create.whatsapp"
                      type="button"
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          if (!publicCreateEntryLink) {
                            showNotice("error", "Create entry link is not ready yet.");
                            return;
                          }
                          if (typeof window !== "undefined") {
                            window.open(
                              `https://wa.me/?text=${encodeURIComponent(createWhatsappMessage)}`,
                              "_blank",
                              "noopener,noreferrer"
                            );
                          }
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        !publicCreateEntryLink,
                        isCompact
                      )}
                      disabled={!publicCreateEntryLink}
                    >
                      Send WhatsApp
                    </StableButton>
                  </div>
                </div>

                <div style={innerCard("#FFFFFF")}>
                  <div style={sectionLabel()}>Community access desk</div>
                  <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                    Share the outward access desk for this community. This is not the public shop.
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <span
                      style={compactStatusPillStyle(
                        Boolean(publicCommunityWorkspaceLink)
                      )}
                    >
                      {publicCommunityWorkspaceLink
                        ? "Community access desk ready"
                        : "Community access desk not ready yet"}
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
                      : "Community access desk appears after the community context is ready."}
                  </div>
                  <div style={marketplaceInlineActionsStyle(isCompact)}>
                    <StableButton
                      debugId="marketplace.links.community-desk.copy"
                      type="button"
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          copyMarketplaceLink(
                            publicCommunityWorkspaceLink,
                            "Community access desk link copied.",
                            "Community access desk link is not ready yet."
                          );
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        !publicCommunityWorkspaceLink,
                        isCompact
                      )}
                      disabled={!publicCommunityWorkspaceLink}
                    >
                      Copy Community Desk
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
                            "Community access desk link is not ready yet."
                          );
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        !publicCommunityWorkspaceLink,
                        isCompact
                      )}
                      disabled={!publicCommunityWorkspaceLink}
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
                            "Community access desk link is not ready yet."
                          );
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        !publicCommunityWorkspaceLink,
                        isCompact
                      )}
                      disabled={!publicCommunityWorkspaceLink}
                    >
                      Open Community Desk
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
                      stableHeight={54}
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
                      disabled={publicShopActionsLocked}
                    >
                      {preparingPublicShopLink ? "Refreshing..." : "Refresh Shop Link"}
                    </StableButton>
                    <StableButton
                      type="button"
                      debugId="marketplace.public-shop.copy"
                      stableHeight={54}
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
                      disabled={publicShopActionsLocked}
                    >
                      {preparingPublicShopLink ? "Refreshing..." : "Copy Shop Link"}
                    </StableButton>
                    <StableButton
                      type="button"
                      debugId="marketplace.public-shop.email"
                      stableHeight={54}
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
                      disabled={publicShopActionsLocked}
                    >
                      Email Link
                    </StableButton>
                    <StableButton
                      type="button"
                      debugId="marketplace.public-shop.open"
                      stableHeight={54}
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
                          void openFreshPublicShopLink();
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        publicShopActionsLocked,
                        isCompact
                      )}
                      disabled={publicShopActionsLocked}
                    >
                      Open Shop Face
                    </StableButton>
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

      {sectionsOpen.members || sectionsTouched.members ? (
      <section
        id="marketplace-members-shops"
        style={{ ...pageCard("#FFFFFF"), order: 3 }}
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
                            display: "flex",
                            justifyContent: isCompact ? "flex-start" : "flex-end",
                            gap: 10,
                            flexWrap: "wrap",
                          }}
                        >
                          {row.shopTo ? (
                            <StableCtaLink
                              debugId={`marketplace.member.${row.gmfnId || row.userId || "unknown"}.shop`}
                              to={row.shopTo}
                              style={marketplaceActionStyle("secondary")}
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
                              style={
                                selected ? marketplaceActionStyle("primary") : marketplaceActionStyle("soft")
                              }
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

      {sectionsOpen.support || sectionsTouched.support ? (
      <section
        id="marketplace-loans-support"
        ref={supportSectionRef}
        style={{ ...pageCard("#FFFFFF"), order: 6 }}
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
                    placeholder="Duration in days"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div style={{ gridColumn: isCompact ? "auto" : "1 / span 2" }}>
                  <div style={sectionLabel()}>Purpose / note</div>
                  <textarea
                    value={loanPurpose}
                    onChange={(e) => setLoanPurpose(e.target.value)}
                    placeholder="State what the support is for..."
                    style={{ ...textAreaStyle(), marginTop: 8 }}
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
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
                  disabled={startingLoanDraft}
                  style={marketplaceActionStyle("primary", startingLoanDraft)}
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
                    disabled={loadingSuggestions}
                    style={marketplaceActionStyle("secondary", loadingSuggestions)}
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
                    disabled={cancellingLoanDraft}
                    style={marketplaceActionStyle("secondary", cancellingLoanDraft)}
                  >
                    {cancellingLoanDraft ? "Cancelling..." : "Cancel Draft"}
                  </StableButton>
                ) : null}
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <StableButton
                  debugId="marketplace.support.loan-readiness"
                  type="button"
                  onClick={(event) =>
                    openMarketplaceCta(event, "loanReadiness")
                  }
                  style={marketplaceActionStyle("soft")}
                >
                  Loan Readiness
                </StableButton>
                <StableButton
                  debugId="marketplace.support.loan-suggestions"
                  type="button"
                  onClick={(event) =>
                    openMarketplaceCta(event, "loanSuggestions")
                  }
                  style={marketplaceActionStyle("soft")}
                >
                  Loan Suggestions
                </StableButton>
                <StableButton
                  debugId="marketplace.support.loan-workbench"
                  type="button"
                  onClick={(event) =>
                    openMarketplaceCta(event, "loanWorkbench")
                  }
                  style={marketplaceActionStyle("soft")}
                >
                  Loan Workbench
                </StableButton>
                <StableButton
                  debugId="marketplace.support.finance"
                  type="button"
                  onClick={(event) => openMarketplaceCta(event, "finance")}
                  style={marketplaceActionStyle("soft")}
                >
                  Finance
                </StableButton>
                <StableButton
                  debugId="marketplace.support.full-loans"
                  type="button"
                  onClick={(event) => openMarketplaceCta(event, "loans")}
                  style={marketplaceActionStyle("soft")}
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
                      {extractSuggestionMessage(loanSuggestionRaw) ||
                        "Review the fit suggestions below if the support draft needs guarantors."}
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
                                    style={
                                      selected
                                        ? marketplaceActionStyle("primary")
                                        : marketplaceActionStyle("secondary")
                                    }
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
                              marginTop: 10,
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
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
                                style={marketplaceActionStyle("soft")}
                              >
                                {item.name} ×
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
                          marginTop: 14,
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
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
                          style={marketplaceActionStyle(
                            "primary",
                            guarantorRequestsBlocked
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
