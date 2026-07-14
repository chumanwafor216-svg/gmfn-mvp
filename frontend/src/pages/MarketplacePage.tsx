import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CommunityNoticeModal from "../components/CommunityNoticeModal";
import DomainIntroToggle from "../components/DomainIntroToggle";
import ExplainToggle from "../components/ExplainToggle";
import GSNBrandMark from "../components/GSNBrandMark";
import GsnSnapshotPaperCard from "../components/GsnSnapshotPaperCard";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import PaymentProofSubmissionPanel from "../components/PaymentProofSubmissionPanel";
import SocialTagShareButton from "../components/SocialTagShareButton";
import {
  compactJoinInviteUrl,
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
  buildGsnCommunityVerifyLinkMessage,
  buildGsnInviteLinkMessage,
  buildGsnPublicShopLinkMessage,
} from "../lib/gsnSnapshotPaper";
import {
  publicApiUrl,
  publicFrontendUrl,
  publicShopBlockUrl,
  publicShopPath,
  publicShopSharePath,
  publicShopShareUrl,
  publicShopSocialPreviewUrl,
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
  createProtectedTrade,
  addProtectedTradeEvent,
  getCommunityPackageStatus,
  getMarketplaceRepostTargetSuggestions,
  getMarketplaceShopSpotlightStatus,
  getClanTrustScoreExplained,
  getClanInviteLink,
  getCurrentClan,
  getLoanGuarantorSuggestions,
  getLoanSummary,
  getMarketplaceProducts,
  getProtectedTrade,
  getMarketplaceShopByGmfnId,
  getMyMarketplaceShop,
  getMyTrustSlip,
  getMarketplaceShops,
  getMe,
  getPoolMe,
  getRoscaCycles,
  getSelectedClanId,
  getStoredGmfnId,
  listMyPaymentInstructionExpectedPayments,
  listProtectedTrades,
  recordRoscaCyclePayout,
  selectClan,
  setSelectedClanId,
  listClanMembers,
  listCommunityNotices,
  listMyClans,
  listMyCommunityDomains,
  listMyLoans,
  createCommunityNotice,
  updateCommunityNoticeSettings,
  safeCopy,
  type ClanInviteRelationshipEvidencePayload,
  type ProtectedTradeRecord,
} from "../lib/api";
import { buildWhatsAppChatUrl } from "../lib/whatsappLinks";
import {
  communityPayInReady,
  getCommunityMoneySurface,
  saveCommunityPayInSettlement,
  type CommunityMoneySettlement,
  type CommunityMoneySurface,
} from "../lib/communityMoney";
import {
  communityDomainFeatureIsOff,
  communityDomainFeatureModeFromPayload,
  communityDomainFeatureOffMessage,
} from "../lib/communityDomainFeaturePolicy";
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
  notice_posting_policy?: string | null;
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

type ProtectedTradeDraft = {
  role: "seller" | "buyer";
  counterpartUserId: string;
  itemTitle: string;
  amount: string;
  currency: string;
  termsSummary: string;
  evidencePacketNote: string;
};

const PROTECTED_TRADE_EVENT_OPTIONS = [
  {
    value: "payment.claimed",
    label: "Payment claimed",
    detail: "Someone says payment was sent. This is not bank confirmation.",
  },
  {
    value: "payment.recorded",
    label: "Payment note recorded",
    detail: "Record payment evidence seen by the parties, not automatic payout.",
  },
  {
    value: "release.requested",
    label: "Release requested",
    detail: "Ask for goods or service release after checking current evidence.",
  },
  {
    value: "release.recorded",
    label: "Release recorded",
    detail: "Record that the seller says goods or service were released.",
  },
  {
    value: "release.declined",
    label: "Release declined",
    detail: "Record that release was refused or paused.",
  },
  {
    value: "receipt.confirmed",
    label: "Receipt confirmed",
    detail: "Record that the buyer says goods or service were received.",
  },
  {
    value: "receipt.not_received",
    label: "Not received",
    detail: "Record that the buyer says goods or service were not received.",
  },
  {
    value: "dispute.opened",
    label: "Dispute opened",
    detail: "Record a problem that needs community or party review.",
  },
  {
    value: "dispute.resolved",
    label: "Dispute resolved",
    detail: "Record that the parties/community resolved the problem.",
  },
  {
    value: "evidence.attached",
    label: "Evidence note",
    detail: "Record a supporting reference or note for the trade file.",
  },
  {
    value: "trade.closed",
    label: "Close record",
    detail: "Close the trade record after the parties are done.",
  },
] as const;

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
  purpose?: string | null;
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
  service_fee?: string | number | null;
  net_disbursed_amount?: string | number | null;
  guarantor_pool?: string | number | null;
  platform_revenue?: string | number | null;
  remaining_amount?: string | number | null;
  guarantors_required?: number | null;
  approved_guarantors?: number | null;
  guarantors_total?: number | null;
  due_at?: string | null;
  decision_at?: string | null;
};

type PayInAccountDraft = {
  accountName: string;
  bankName: string;
  accountNumber: string;
  sortCode: string;
  country: string;
  currency: string;
  note: string;
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
  board: boolean;
  money: boolean;
  rosca: boolean;
  tools: boolean;
  members: boolean;
  trade: boolean;
  demand: boolean;
  support: boolean;
};

type SupportDeskMode = "choices" | "loan";

type LinkCenterTool =
  | "join"
  | "verify"
  | "shopFace"
  | "repost";

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

type MarketplaceNoticeItem = {
  notice_id?: string | number | null;
  meeting_id?: string | number | null;
  body?: string | null;
  title?: string | null;
  purpose?: string | null;
  scheduled_at?: string | null;
  status?: string | null;
  created_at?: string | null;
  source?: string | null;
  posting_policy?: string | null;
  expiry_policy?: string | null;
  expires_at?: string | null;
  sender_whatsapp_number?: string | null;
  sender_whatsapp_label?: string | null;
  sender_contact_ready?: boolean;
};

type MarketplaceCommunityDomainRow = {
  key: string;
  id: number;
  name: string;
  code: string;
  role: string;
  status: string;
  verification: string;
  clanId: number;
  marketplaceReady: boolean;
  dashboardPath: string;
  marketplacePath: string;
};

function normalizeNoticePostingPolicy(value: unknown): "members" | "admins" {
  return safeStr(value).toLowerCase() === "admins" ? "admins" : "members";
}

type PersistedWithdrawalTask = {
  amountInput: string;
  noteInput: string;
  latestWithdrawalResult: any | null;
  handoffMode?: string;
  supportGap?: string;
  updatedAt?: string;
};

const DEFAULT_SECTION_STATE: SectionState = {
  board: false,
  money: false,
  rosca: false,
  tools: false,
  members: false,
  trade: false,
  demand: false,
  support: false,
};

const MARKETPLACE_SECTION_ANCHORS: Record<keyof SectionState, string> = {
  board: "marketplace-official-board",
  money: "marketplace-money-routes",
  rosca: "marketplace-rosca",
  tools: "marketplace-owned-links",
  members: "marketplace-members-shops",
  trade: "marketplace-trade-evidence",
  demand: "marketplace-demand-box",
  support: "marketplace-loans-support",
};

function focusedMarketplaceSectionState(key: keyof SectionState): SectionState {
  return {
    board: key === "board",
    money: key === "money",
    rosca: key === "rosca",
    tools: key === "tools",
    members: key === "members",
    trade: key === "trade",
    demand: key === "demand",
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
  if (state.demand) return focusedMarketplaceSectionState("demand");
  if (state.trade) return focusedMarketplaceSectionState("trade");
  if (state.rosca) return focusedMarketplaceSectionState("rosca");
  if (state.members) return focusedMarketplaceSectionState("members");
  if (state.tools) return focusedMarketplaceSectionState("tools");
  if (state.board) return focusedMarketplaceSectionState("board");
  if (state.money) return focusedMarketplaceSectionState("money");
  return DEFAULT_SECTION_STATE;
}

const JOIN_RELATIONSHIP_OPTIONS = [
  { value: "family", label: "Family / blood relation" },
  { value: "school", label: "School days" },
  { value: "marketplace_trade", label: "Marketplace / trade" },
  { value: "work_business", label: "Work / business" },
  { value: "faith_association", label: "Faith or association" },
  { value: "neighbour_area", label: "Neighbour / same area" },
  { value: "friendship", label: "Friendship" },
  { value: "community_contact", label: "Community contact" },
  { value: "other", label: "Other known relationship" },
];

const JOIN_KNOWN_DURATION_OPTIONS = [
  { value: "under_6_months", label: "Less than 6 months" },
  { value: "6_to_12_months", label: "6 to 12 months" },
  { value: "1_to_3_years", label: "1 to 3 years" },
  { value: "3_to_5_years", label: "3 to 5 years" },
  { value: "over_5_years", label: "More than 5 years" },
  { value: "childhood_or_family", label: "Childhood / long family knowledge" },
];

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
    detail: "Start the withdrawal or payout page.",
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
    detail: "Start or continue a support request.",
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
    label: "Show evidence",
    detail: "Open TrustSlip evidence.",
    technical: "TrustSlip",
    to: "",
    intent: "trustSlip",
    tone: "soft",
    keywords: ["trustslip", "slip", "evidence", "verify"],
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

const WITHDRAWAL_TASK_STORAGE_KEY_PREFIXES = [
  "gmfn.withdrawal.task.v5",
  "gmfn.withdrawal.task.v4",
];

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

function wordLimit(text: string, maxWords: number): string {
  const words = safeStr(text).split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function safeDateLabel(value: any): string {
  const raw = safeStr(value);
  if (!raw) return "";
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return raw;
  return date.toLocaleString();
}

function noticeExpiryLabel(item: MarketplaceNoticeItem): string {
  if (safeStr(item?.expiry_policy).toLowerCase() === "pinned") return "Pinned";
  const expiresAt = safeDateLabel(item?.expires_at);
  return expiresAt ? `Visible until ${expiresAt}` : "";
}

function parsedMarketplaceErrorDetail(err: any): Record<string, any> | null {
  const detail = err?.detail ?? err?.response?.data?.detail;
  if (detail && typeof detail === "object") return detail;

  const message = safeStr(err?.message);
  if (!message || !message.startsWith("{")) return null;

  try {
    const parsed = JSON.parse(message);
    const parsedDetail = parsed?.detail ?? parsed;
    return parsedDetail && typeof parsedDetail === "object" ? parsedDetail : null;
  } catch {
    return null;
  }
}

function marketplaceErrorMessage(err: any, fallback: string): string {
  const detail = parsedMarketplaceErrorDetail(err);
  return firstTruthy(
    detail?.message,
    detail?.error,
    detail?.reason,
    err?.message,
    fallback
  );
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

function moneyNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  const text = safeStr(value).replace(/,/g, "");
  if (!text) return 0;
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

function signedFinanceText(amount: number, currency: string): string {
  const code = safeStr(currency || "NGN").toUpperCase() || "NGN";
  const prefix = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${prefix}${Math.abs(amount).toFixed(2)} ${code}`;
}

function financeText(amount: number, currency: string): string {
  const code = safeStr(currency || "NGN").toUpperCase() || "NGN";
  return `${amount.toFixed(2)} ${code}`;
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

function communityDomainNeedsSetup(domain: any): boolean {
  const status = safeStr(domain?.status).toLowerCase();
  if (!positiveNumber(domain?.clan_id)) return true;
  return (
    status.includes("draft") ||
    status.includes("quote") ||
    status.includes("pending") ||
    status.includes("waiting") ||
    status.includes("suspended") ||
    status.includes("closed") ||
    status.includes("expired")
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

function communityCode(row: CommunityRow | null | undefined): string {
  return firstTruthy(
    row?.community_code,
    row?.community?.community_code,
    row?.profile?.community_code,
    row?.marketplace?.community_code,
    row?.clan?.community_code,
    row?.meta?.community_code
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

let marketplaceLastFieldInteractionAt = 0;

function markMarketplaceFieldInteraction() {
  marketplaceLastFieldInteractionAt =
    typeof performance !== "undefined" ? performance.now() : Date.now();
}

function marketplaceRecentlyInteractedWithField(ms = 2400): boolean {
  if (!marketplaceLastFieldInteractionAt) return false;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  return now - marketplaceLastFieldInteractionAt <= ms;
}

function marketplaceFieldTouchProps(debugId: string) {
  const rememberMarketplaceFieldPointer = () => {
    markMarketplaceFieldInteraction();
  };
  const rememberMarketplaceFieldFocus = () => {
    markMarketplaceFieldInteraction();
  };

  return {
    "data-gmfn-field-root": "true",
    "data-gmfn-debug-id": debugId,
    onPointerDownCapture: rememberMarketplaceFieldPointer,
    onFocusCapture: rememberMarketplaceFieldFocus,
  };
}

function marketplaceSurfaceTouchProps(debugId: string) {
  return {
    "data-gmfn-surface-root": "true",
    "data-gmfn-debug-id": debugId,
  };
}

function marketplaceActiveElementIsEditable(): boolean {
  if (typeof document === "undefined") return false;
  const active = document.activeElement;
  if (!active) return false;
  const tagName = active.tagName.toLowerCase();

  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    active.getAttribute("contenteditable") === "true"
  );
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

  return raw ? displayGsnLabel(raw) : "No community ID yet";
}

function protectedTradeStatusLabel(value: any, fallback = "not recorded"): string {
  return (safeStr(value) || fallback).replace(/_/g, " ");
}

function protectedTradeAmountLabel(
  trade: ProtectedTradeRecord | null | undefined
): string {
  const amount = safeStr(trade?.amount);
  if (!amount) return "No amount recorded";
  const currency = safeStr(trade?.currency || "NGN").toUpperCase() || "NGN";
  return `${currency} ${amount}`;
}

function protectedTradeEventLabel(eventType: any): string {
  const key = safeStr(eventType)
    .toLowerCase()
    .replace(/^protected_trade\./, "");
  const option = PROTECTED_TRADE_EVENT_OPTIONS.find(
    (item) => item.value === key
  );
  return option?.label || protectedTradeStatusLabel(key, "Trade event");
}

function protectedTradeEventLine(event: any): string {
  const label = protectedTradeEventLabel(event?.event_type);
  const note = safeStr(event?.note);
  const createdAt = safeStr(event?.created_at);
  const suffix = note ? ` - ${note}` : "";
  return `${createdAt || "Time not recorded"}: ${label}${suffix}`;
}

function protectedTradeTimelineLines(
  trade: ProtectedTradeRecord | null | undefined,
  maxCount = 5
): string[] {
  const events = Array.isArray(trade?.events) ? trade?.events || [] : [];
  if (!events.length) {
    return ["Event trail: no detailed events loaded yet."];
  }

  return events
    .slice(-maxCount)
    .reverse()
    .map((event) => `Event trail: ${protectedTradeEventLine(event)}`);
}

function buildProtectedTradeEvidencePaperText({
  trade,
  community,
  communityLabel,
  generatedAt,
  actionPath,
}: {
  trade: ProtectedTradeRecord | null | undefined;
  community: CommunityRow | null | undefined;
  communityLabel: string;
  generatedAt: string;
  actionPath: string;
}): string {
  if (!trade) return "";

  const tradeCode = safeStr(trade.trade_code) || "Trade evidence record";
  const itemTitle = safeStr(trade.item_title) || "Item or service not named";
  const termsSummary =
    safeStr(trade.terms_summary) || "No terms summary recorded yet.";
  const minimumPacket =
    trade.meta && typeof trade.meta === "object"
      ? (trade.meta.minimum_trade_packet || null)
      : null;
  const minimumPacketNote = safeStr(minimumPacket?.evidence_packet_note);
  const minimumPacketContext =
    safeStr(minimumPacket?.trade_context) || "gsn_gsn";
  const createdAt = safeStr(trade.created_at) || "Not recorded";
  const updatedAt = safeStr(trade.updated_at) || "Not recorded";
  const boundaryNote =
    safeStr(trade.boundary_note) ||
    "Non-custodial evidence record only. GSN does not hold money, guarantee delivery, or release funds automatically.";
  const timelineLines = protectedTradeTimelineLines(trade, 5);

  return [
    "GLOBAL SUPPORT NETWORK (GSN)",
    "Title: GSN Trade Evidence Paper",
    "Purpose: Recorded trade evidence. GSN does not hold money or release funds.",
    `Generated (UTC): ${generatedAt}`,
    `Record code: ${tradeCode}`,
    "Public record context",
    `Community: ${communityLabel || "Selected community"}`,
    `Community ID: ${communityIdentity(community)}`,
    `Trade code: ${tradeCode}`,
    `Trade status: ${protectedTradeStatusLabel(trade.status, "draft")}`,
    `Payment status: ${protectedTradeStatusLabel(trade.payment_status)}`,
    `Release evidence status: ${protectedTradeStatusLabel(trade.release_status)}`,
    `Receipt status: ${protectedTradeStatusLabel(trade.receipt_status)}`,
    `Dispute status: ${protectedTradeStatusLabel(trade.dispute_status)}`,
    `Amount: ${protectedTradeAmountLabel(trade)}`,
    "What you need to know",
    `Item or service: ${itemTitle}`,
    `Basic terms: ${termsSummary}`,
    "Minimum trade packet",
    `Trade shape: ${minimumPacketContext === "gsn_gsn" ? "GSN + GSN" : minimumPacketContext}`,
    `Invoice / product / agreement / courier / payment references: ${
      minimumPacketNote || "No minimum packet note recorded yet."
    }`,
    "Conversation boundary: GSN keeps the agreed evidence reference. Outside chats or calls stay outside GSN unless final evidence is added.",
    `Created in GSN: ${createdAt}`,
    `Last updated in GSN: ${updatedAt}`,
    ...timelineLines,
    `Boundary: ${boundaryNote}`,
    "Signed-in evidence only for people who can already see this Marketplace record.",
    `Open this record: ${actionPath} (signed-in Marketplace record only)`,
    "Security note: Keep the GSN mark, record code, generated time, privacy note, and limitation note with any copy.",
    "Privacy: private trade record. Do not forward as public verification unless GSN provides a public link for this exact record.",
    "Limitation: evidence only. Not escrow, payout approval, bank confirmation, or delivery guarantee.",
  ].join("\n");
}

function marketplaceTrustLabel(
  row: CommunityRow | null | undefined,
  trust: any,
  me?: any,
  trustSlip?: any
): string {
  const band = firstTruthy(
    me?.open_trust_class,
    me?.open_trust_band,
    me?.current_community_trust_class,
    me?.current_community_trust_band,
    me?.community_trust_class,
    me?.community_trust_band,
    me?.selected_clan_trust_class,
    me?.selected_clan_trust_band,
    me?.trust_class,
    me?.trust_band,
    trustSlip?.open_trust_class,
    trustSlip?.open_trust_band,
    trustSlip?.community_trust_class,
    trustSlip?.community_trust_band,
    trustSlip?.trust_class,
    trustSlip?.trust_band,
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
    me?.open_trust_score,
    me?.current_community_trust_score,
    me?.community_trust_score,
    me?.selected_clan_trust_score,
    me?.trust_score,
    trustSlip?.open_trust_score,
    trustSlip?.community_trust_score,
    trustSlip?.trust_score,
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
  return band || score || "No trust value yet";
}

function marketplaceTrustEventCount(
  trust: any,
  me?: any,
  trustSlip?: any
): string {
  const counts =
    trust?.counts && typeof trust.counts === "object" ? trust.counts : {};
  const countTotal = Object.values(counts).reduce<number>((sum, value) => {
    const n = Number(value || 0);
    return Number.isFinite(n) && n > 0 ? sum + n : sum;
  }, 0);

  if (countTotal > 0) return `${countTotal} trust events`;

  const passportReading = firstTruthy(
    me?.open_trust_class,
    me?.open_trust_band,
    me?.current_community_trust_class,
    me?.current_community_trust_band,
    me?.community_trust_class,
    me?.community_trust_band,
    me?.selected_clan_trust_class,
    me?.selected_clan_trust_band,
    me?.trust_class,
    me?.trust_band,
    trustSlip?.open_trust_class,
    trustSlip?.open_trust_band,
    trustSlip?.community_trust_class,
    trustSlip?.community_trust_band,
    trustSlip?.trust_class,
    trustSlip?.trust_band,
    me?.open_trust_score,
    me?.current_community_trust_score,
    me?.community_trust_score,
    me?.selected_clan_trust_score,
    me?.trust_score,
    trustSlip?.open_trust_score,
    trustSlip?.community_trust_score,
    trustSlip?.trust_score
  );
  if (passportReading) return "Trust Passport reading";

  const reason = firstTruthy(
    me?.open_trust_reason,
    me?.current_community_trust_reason,
    me?.community_trust_reason,
    me?.selected_clan_trust_reason,
    me?.trust_reason,
    trustSlip?.open_trust_reason,
    trustSlip?.community_trust_reason,
    trustSlip?.trust_reason
  );
  if (reason) return "Trust Passport reading";

  const lastEvents = Array.isArray(trust?.last_events)
    ? trust.last_events.length
    : 0;
  return lastEvents > 0 ? `${lastEvents} recent events` : "No trust events yet";
}

function marketplaceCciLabel(
  row: CommunityRow | null | undefined,
  trust: any,
  me?: any,
  trustSlip?: any
): string {
  const cciValue = firstTruthy(
    me?.cci_score,
    me?.cross_client_integrity_score,
    me?.cross_clan_integrity_score,
    me?.cross_community_integrity_score,
    trustSlip?.cci_score,
    trustSlip?.cross_client_integrity_score,
    trustSlip?.cross_clan_integrity_score,
    trustSlip?.cross_community_integrity_score,
    trust?.cci_score,
    trust?.cci?.score,
    trust?.community_cci,
    (row as any)?.cci_score,
    (row as any)?.community_standing?.cci_score,
    (row as any)?.marketplace?.cci_score,
    (row as any)?.clan?.cci_score
  );
  const cciBand = firstTruthy(
    me?.cci_class,
    me?.cross_client_integrity_class,
    me?.cross_clan_integrity_class,
    me?.cross_community_integrity_class,
    trustSlip?.cci_class,
    trustSlip?.cross_client_integrity_class,
    trustSlip?.cross_clan_integrity_class,
    trustSlip?.cross_community_integrity_class,
    trust?.cci_band,
    trust?.cci?.band,
    (row as any)?.cci_band,
    (row as any)?.community_standing?.cci_band,
    (row as any)?.marketplace?.cci_band,
    (row as any)?.clan?.cci_band
  );

  if (cciBand && cciValue) return `${cciBand} / ${cciValue}`;
  return cciBand || cciValue || "Not shown yet";
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
    purpose: firstTruthy(src?.purpose, src?.title, src?.loan_title),
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
      src?.is_guarantor ? "Supporter" : "",
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
    service_fee: firstDefined(src?.service_fee),
    net_disbursed_amount: firstDefined(src?.net_disbursed_amount),
    guarantor_pool: firstDefined(src?.guarantor_pool),
    platform_revenue: firstDefined(src?.platform_revenue),
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

  if (!value && !currency) return "No amount recorded yet";
  if (value && currency) return `${value} ${currency}`;
  return value || currency || "No amount recorded yet";
}

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function supportCadenceLabel(value: any): string {
  const cadence = safeStr(value).toLowerCase();
  if (cadence === "weekly") return "Weekly";
  if (cadence === "biweekly") return "Every 2 weeks";
  if (cadence === "monthly") return "Monthly";
  return "Choose a plan";
}

function supportDueDateLabel(durationDays: number): string {
  if (!durationDays) return "After duration is set";
  const due = new Date();
  due.setDate(due.getDate() + durationDays);
  return due.toLocaleDateString();
}

function supportFeePreview(amount: number, guarantorsRequired: number) {
  const rate = guarantorsRequired > 0 ? 0.05 : 0.02;
  const fee = Math.round(amount * rate * 100) / 100;
  const net = Math.max(0, Math.round((amount - fee) * 100) / 100);
  return {
    fee: fee.toFixed(2),
    net: net.toFixed(2),
    rateLabel: guarantorsRequired > 0 ? "5%" : "2%",
  };
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

type MarketplaceDepartmentTone =
  | "trade"
  | "members"
  | "demand"
  | "support"
  | "rosca"
  | "neutral";

function marketplaceDepartmentShellStyle(
  tone: MarketplaceDepartmentTone,
  isCompact: boolean
): React.CSSProperties {
  const toneMap: Record<
    MarketplaceDepartmentTone,
    { border: string; background: string; shadow: string }
  > = {
    trade: {
      border: "1px solid rgba(13,95,168,0.22)",
      background:
        "linear-gradient(180deg, rgba(248,251,255,0.99) 0%, rgba(235,244,253,0.96) 100%)",
      shadow: "0 16px 34px rgba(13,95,168,0.10)",
    },
    members: {
      border: "1px solid rgba(37,166,90,0.20)",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(241,250,245,0.95) 100%)",
      shadow: "0 16px 34px rgba(37,166,90,0.09)",
    },
    demand: {
      border: "1px solid rgba(214,170,69,0.24)",
      background:
        "linear-gradient(180deg, rgba(255,253,247,0.99) 0%, rgba(250,244,226,0.95) 100%)",
      shadow: "0 16px 34px rgba(184,135,30,0.09)",
    },
    support: {
      border: "1px solid rgba(37,166,90,0.20)",
      background:
        "linear-gradient(180deg, rgba(248,253,250,0.99) 0%, rgba(231,246,238,0.95) 100%)",
      shadow: "0 16px 34px rgba(37,166,90,0.09)",
    },
    rosca: {
      border: "1px solid rgba(184,135,30,0.24)",
      background:
        "linear-gradient(180deg, rgba(255,253,247,0.99) 0%, rgba(248,239,212,0.95) 100%)",
      shadow: "0 16px 34px rgba(184,135,30,0.10)",
    },
    neutral: {
      border: "1px solid rgba(16,37,59,0.10)",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,251,255,0.96) 100%)",
      shadow: "0 16px 34px rgba(10,24,49,0.08)",
    },
  };
  const toneStyle = toneMap[tone];

  return {
    marginTop: isCompact ? 14 : 16,
    borderRadius: isCompact ? 18 : 22,
    border: toneStyle.border,
    background: toneStyle.background,
    padding: isCompact ? 12 : 14,
    boxShadow: toneStyle.shadow,
    display: "grid",
    gap: isCompact ? 10 : 12,
    overflow: "hidden",
    overflowAnchor: "none",
  };
}

function marketplaceDepartmentHeaderStyle(
  isCompact: boolean
): React.CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    gap: isCompact ? 8 : 10,
    alignItems: "center",
    flexWrap: "wrap",
    paddingBottom: isCompact ? 8 : 10,
    borderBottom: "1px solid rgba(16,37,59,0.08)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#173750",
    fontWeight: 900,
    letterSpacing: 0,
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
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
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
  const suffix = (label: string) => (code ? ` - ${label} ${code}` : "");

  if (kind === "join") {
    return `Secure GSN join link for ${cleanedSubject}${suffix("code")}`;
  }

  if (kind === "marketplace") {
    return `Community verification record for ${cleanedSubject}${suffix("ref")}`;
  }

  return `Public shop face${suffix("ref")}`;

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
    overflow: "hidden",
    overflowAnchor: "none",
  };
}

function joinShareMessageCardStyle(isCompact: boolean): React.CSSProperties {
  return {
    ...shareMessageCardStyle(isCompact),
    height: isCompact ? 146 : 132,
    minHeight: isCompact ? 146 : 132,
    maxHeight: isCompact ? 146 : 132,
  };
}

function linkReserveTextStyle(): React.CSSProperties {
  return {
    ...marketplaceLinkSummaryStyle(true),
    height: 66,
    minHeight: 66,
    maxHeight: 66,
    overflow: "hidden",
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
    hyphens: "none",
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
    color: "#0B2D4A",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,250,255,0.96) 100%)",
    borderRight: "1px solid rgba(13,95,168,0.10)",
    boxShadow:
      "inset 5px 0 0 rgba(214,170,69,0.24), inset 0 1px 0 rgba(255,255,255,0.96)",
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

function marketplaceLinkChooserGridStyle(isCompact: boolean): React.CSSProperties {
  return {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
    gap: isCompact ? 9 : 12,
    width: "100%",
    maxWidth: "100%",
    overflow: "hidden",
    overflowAnchor: "none",
    transition: "none",
  };
}

function marketplaceLinkChooserButtonStyle(
  isCompact: boolean,
  primary = false
): React.CSSProperties {
  return {
    ...marketplaceActionStyle(primary ? "primary" : "soft"),
    width: "100%",
    minWidth: 0,
    height: isCompact ? 68 : 88,
    minHeight: isCompact ? 68 : 88,
    maxHeight: isCompact ? 68 : 88,
    borderRadius: isCompact ? 18 : 20,
    padding: isCompact ? "9px 10px" : "12px 13px",
    display: "grid",
    gridTemplateColumns: isCompact ? "44px minmax(0, 1fr)" : "58px minmax(0, 1fr)",
    gap: 9,
    alignItems: "center",
    justifyContent: "stretch",
    textAlign: "left",
    overflow: "hidden",
    overflowAnchor: "none",
    transition: "none",
  };
}

function marketplaceLinkChooserTextStyle(): React.CSSProperties {
  return {
    minWidth: 0,
    maxWidth: "100%",
    display: "grid",
    gap: 3,
    overflow: "hidden",
  };
}

function marketplaceLinkChooserTitleStyle(isCompact: boolean): React.CSSProperties {
  return {
    minWidth: 0,
    maxWidth: "100%",
    color: "#07172C",
    fontSize: isCompact ? 15 : 17,
    lineHeight: 1.08,
    fontWeight: 950,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };
}

function marketplaceLinkChooserDetailStyle(isCompact: boolean): React.CSSProperties {
  return {
    minWidth: 0,
    maxWidth: "100%",
    color: "#516579",
    fontSize: isCompact ? 11.5 : 12.5,
    lineHeight: 1.18,
    fontWeight: 760,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };
}

function marketplaceLinkToolHeaderStyle(isCompact: boolean): React.CSSProperties {
  return {
    marginTop: 14,
    borderRadius: isCompact ? 18 : 20,
    border: "1px solid rgba(11,45,74,0.10)",
    background:
      "linear-gradient(180deg, rgba(247,251,255,0.99) 0%, rgba(236,245,255,0.96) 100%)",
    padding: isCompact ? 9 : 12,
    display: "grid",
    gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) 180px",
    gap: 10,
    alignItems: "center",
    overflow: "hidden",
    overflowAnchor: "none",
    transition: "none",
  };
}

function marketplaceLinkActiveToolStackStyle(): React.CSSProperties {
  return {
    marginTop: 12,
    display: "grid",
    gap: 12,
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    overflow: "visible",
    overflowAnchor: "none",
    transition: "none",
  };
}

function marketplaceLinkRowStyle(isCompact: boolean, expanded = false): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
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
    overflow: expanded ? "visible" : "hidden",
    overflowAnchor: "none",
    transition: "none",
  };
}

function marketplaceLinkRowHeaderStyle(isCompact: boolean): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    display: "grid",
    gridTemplateColumns: isCompact
      ? "44px minmax(0, 1fr)"
      : "58px minmax(0, 1fr) auto",
    gridTemplateRows: isCompact ? "auto auto" : undefined,
    gap: isCompact ? 8 : 14,
    alignItems: "center",
    overflow: "hidden",
  };
}

function marketplaceLinkRowIconStyle(
  tone: "blue" | "gold" | "green" | "purple" | "navy",
  isCompact: boolean
): React.CSSProperties {
  const accents = {
    blue: "rgba(27,102,210,0.22)",
    gold: "rgba(214,170,69,0.24)",
    green: "rgba(37,166,90,0.18)",
    purple: "rgba(106,68,216,0.17)",
    navy: "rgba(11,45,74,0.16)",
  };

  return {
    width: isCompact ? 44 : 58,
    height: isCompact ? 44 : 58,
    borderRadius: isCompact ? 13 : 16,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#0B2D4A",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,251,255,0.96) 100%)",
    border: "1px solid rgba(13,95,168,0.12)",
    boxShadow:
      `0 12px 22px rgba(10,24,49,0.10), inset 4px 0 0 ${accents[tone]}, inset 0 1px 0 rgba(255,255,255,0.96)`,
    flexShrink: 0,
  };
}

function marketplaceLinkRowTitleStyle(isCompact: boolean): React.CSSProperties {
  return {
    minWidth: 0,
    maxWidth: "100%",
    color: "#07172C",
    fontSize: isCompact ? 17 : 23,
    lineHeight: 1.08,
    fontWeight: 950,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    overflowWrap: "break-word",
    wordBreak: "normal",
    hyphens: "none",
  };
}

function marketplaceLinkRowSubStyle(isCompact: boolean): React.CSSProperties {
  return {
    minWidth: 0,
    maxWidth: "100%",
    marginTop: 3,
    color: "#516579",
    fontSize: isCompact ? 12 : 15,
    lineHeight: 1.18,
    fontWeight: 760,
    display: "-webkit-box",
    WebkitLineClamp: isCompact ? 2 : 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
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
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    marginTop: isCompact ? 8 : 12,
    display: "grid",
    gridTemplateColumns: isCompact
      ? "repeat(2, minmax(0, 1fr))"
      : "repeat(auto-fit, minmax(168px, 1fr))",
    gridAutoRows: isCompact ? "56px" : "58px",
    gap: 8,
    alignItems: "stretch",
    alignContent: "start",
    justifyItems: "stretch",
    overflow: "hidden",
    overflowAnchor: "none",
    transition: "none",
  };
}

function marketplaceJoinActionsStyle(
  isCompact: boolean
): React.CSSProperties {
  return {
    ...marketplaceInlineActionsStyle(isCompact),
    gridTemplateColumns: isCompact ? "1fr" : "repeat(auto-fit, minmax(168px, 1fr))",
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
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    height: _isCompact ? 56 : 58,
    minHeight: _isCompact ? 56 : 58,
    maxHeight: _isCompact ? 56 : 58,
    padding: _isCompact ? "0 10px" : "0 11px",
    pointerEvents: "auto",
    touchAction: "manipulation",
    overflowAnchor: "none",
    whiteSpace: "normal",
    overflow: "hidden",
    textOverflow: "clip",
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
    transition: "none",
    fontSize: _isCompact ? 12.5 : undefined,
    lineHeight: 1.08,
  };
}

function marketplaceMoneyPanelStyle(isCompact: boolean): React.CSSProperties {
  return {
    marginTop: isCompact ? 12 : 16,
    display: "grid",
    gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "1fr",
    gap: isCompact ? 8 : 12,
    overflowAnchor: "none",
    transition: "none",
  };
}

function marketplaceMoneyRouteCardStyle(
  isCompact: boolean,
  wide = false
): React.CSSProperties {
  return {
    minHeight: isCompact ? (wide ? 84 : 112) : 150,
    gridColumn: isCompact && wide ? "1 / -1" : undefined,
    borderRadius: isCompact ? 16 : 24,
    border: "1px solid rgba(16,37,59,0.08)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,252,255,0.98) 100%)",
    boxShadow:
      "0 16px 30px rgba(10,24,49,0.075), inset 0 1px 0 rgba(255,255,255,0.92)",
    padding: isCompact ? "10px" : "22px 24px",
    display: "grid",
    gridTemplateColumns: isCompact
      ? wide
        ? "42px minmax(0, 1fr) auto"
        : "38px minmax(0, 1fr)"
      : "92px minmax(0, 1fr) auto",
    gridTemplateAreas: isCompact
      ? wide
        ? '"icon text status"'
        : '"icon status" "text text"'
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

function marketplaceMoneyCardActionStyle(
  kind: "primary" | "secondary",
  isCompact: boolean
): React.CSSProperties {
  return {
    ...marketplaceActionStyle(kind),
    width: "100%",
    minWidth: 0,
    maxWidth: isCompact ? "100%" : 180,
    height: isCompact ? 38 : 42,
    minHeight: isCompact ? 38 : 42,
    maxHeight: isCompact ? 38 : 42,
    padding: isCompact ? "0 8px" : "0 12px",
    justifySelf: "start",
    fontSize: isCompact ? 11.5 : 13,
    lineHeight: 1.05,
    whiteSpace: "normal",
    overflow: "hidden",
    textOverflow: "clip",
    transition: "none",
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
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,251,255,0.96) 100%)",
    border: "1px solid rgba(13,95,168,0.12)",
    color: "#0B2D4A",
    fontSize: isCompact ? 26 : 30,
    boxShadow:
      "0 12px 22px rgba(10,24,49,0.10), inset 4px 0 0 rgba(214,170,69,0.18), inset 0 1px 0 rgba(255,255,255,0.96)",
    outline: `1px solid ${bg.includes("#25A65A") ? "rgba(46,155,98,0.10)" : "rgba(214,170,69,0.08)"}`,
    outlineOffset: -2,
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
    minHeight: isCompact ? 76 : 116,
    height: isCompact ? 76 : "auto",
    maxHeight: isCompact ? 76 : "none",
    borderRadius: isCompact ? 20 : 22,
    gridTemplateColumns: isCompact
      ? "36px minmax(0, 1fr) 16px"
      : "64px minmax(0, 1fr) 20px",
    padding: isCompact ? 7 : 16,
    gap: isCompact ? 6 : 16,
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
    width: isCompact ? 36 : 64,
    height: isCompact ? 36 : 64,
    borderRadius: isCompact ? 12 : 20,
  };
}

function marketplaceFrontTagRowStyle(isCompact = false): React.CSSProperties {
  return {
    display: "flex",
    gap: isCompact ? 5 : 7,
    flexWrap: isCompact ? "nowrap" : "wrap",
    alignItems: "center",
    minWidth: 0,
    overflow: isCompact ? "hidden" : undefined,
  };
}

function marketplaceFrontTagStyle(
  color: string,
  background: string,
  isCompact = false
): React.CSSProperties {
  return {
    borderRadius: 999,
    background,
    color,
    padding: isCompact ? "4px 7px" : "6px 10px",
    fontSize: isCompact ? 10 : 12,
    fontWeight: 950,
    lineHeight: 1.15,
    whiteSpace: "nowrap",
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
}

function marketplaceHeroShellStyle(isCompact: boolean): React.CSSProperties {
  return {
    position: "relative",
    borderRadius: isCompact ? 24 : 28,
    border: "1px solid rgba(214,170,69,0.24)",
    background:
      "linear-gradient(135deg, rgba(6,24,39,0.98) 0%, rgba(9,43,74,0.98) 58%, rgba(6,24,39,0.98) 100%)",
    padding: isCompact ? 14 : 20,
    color: "#FFFFFF",
    boxShadow:
      "0 20px 42px rgba(6,24,39,0.18), inset 0 1px 0 rgba(255,255,255,0.14)",
    overflow: "hidden",
    overflowAnchor: "none",
  };
}

function marketplaceHeroIdentityStyle(isCompact: boolean): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gridTemplateColumns: isCompact
      ? "76px minmax(0, 1fr)"
      : "104px minmax(0, 1fr) 72px",
    gap: isCompact ? 12 : 18,
    alignItems: "center",
  };
}

function marketplaceHeroImageShellStyle(isCompact: boolean): React.CSSProperties {
  return {
    width: isCompact ? 72 : 96,
    height: isCompact ? 72 : 96,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(230,239,249,0.94) 100%)",
    border: "3px solid rgba(255,255,255,0.82)",
    boxShadow:
      "0 16px 28px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.98)",
    overflow: "hidden",
  };
}

function marketplaceHeroTitleStyle(isCompact: boolean): React.CSSProperties {
  return {
    color: "#FFFFFF",
    fontSize: isCompact ? 24 : 32,
    fontWeight: 950,
    lineHeight: 1.02,
    letterSpacing: 0,
    overflowWrap: "break-word",
  };
}

function marketplaceHeroPillStyle(
  tone: "market" | "status" | "id"
): React.CSSProperties {
  const palette = {
    market: {
      color: "#DCEBFF",
      background: "rgba(78,129,232,0.24)",
      border: "1px solid rgba(220,235,255,0.16)",
    },
    status: {
      color: "#DFF7E9",
      background: "rgba(46,155,98,0.22)",
      border: "1px solid rgba(181,236,205,0.18)",
    },
    id: {
      color: "#F7E7B8",
      background: "rgba(214,170,69,0.16)",
      border: "1px solid rgba(242,199,102,0.20)",
    },
  }[tone];

  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 28,
    borderRadius: 999,
    padding: "5px 9px",
    fontSize: 11,
    fontWeight: 950,
    lineHeight: 1.05,
    whiteSpace: "nowrap",
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    ...palette,
  };
}

function marketplaceHeroStatsStyle(isCompact: boolean): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 1,
    marginTop: isCompact ? 12 : 18,
    borderRadius: isCompact ? 18 : 20,
    background: "rgba(255,255,255,0.98)",
    border: "1px solid rgba(255,255,255,0.76)",
    display: "grid",
    gridTemplateColumns: isCompact
      ? "repeat(2, minmax(0, 1fr))"
      : "repeat(4, minmax(0, 1fr))",
    gap: 0,
    boxShadow:
      "0 14px 28px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.96)",
    overflow: "hidden",
  };
}

function marketplaceHeroStatCellStyle(isCompact: boolean): React.CSSProperties {
  return {
    minWidth: 0,
    minHeight: isCompact ? 72 : 82,
    padding: isCompact ? "10px 10px" : "13px 14px",
    display: "grid",
    gridTemplateColumns: isCompact ? "34px minmax(0, 1fr)" : "40px minmax(0, 1fr)",
    gap: isCompact ? 8 : 10,
    alignItems: "center",
    borderRight: "1px solid rgba(16,37,59,0.08)",
    borderBottom: isCompact ? "1px solid rgba(16,37,59,0.06)" : undefined,
  };
}

function marketplaceFrontSummaryGridStyle(isCompact: boolean): React.CSSProperties {
  return {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: isCompact ? 10 : 12,
  };
}

function marketplaceFrontSummaryCardStyle(
  isCompact: boolean
): React.CSSProperties {
  const color = "rgba(46,155,98,0.18)";
  return {
    borderRadius: isCompact ? 18 : 20,
    border: `1px solid ${color}`,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.995) 0%, rgba(248,251,255,0.98) 100%)",
    padding: isCompact ? 12 : 14,
    minHeight: isCompact ? 112 : 154,
    minWidth: 0,
    boxShadow:
      "0 12px 24px rgba(10,24,49,0.07), inset 0 1px 0 rgba(255,255,255,0.92)",
    overflow: "hidden",
    overflowAnchor: "none",
  };
}

function marketplaceFrontLaneGridStyle(isCompact: boolean): React.CSSProperties {
  return {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: isCompact
      ? "1fr"
      : "repeat(3, minmax(190px, 1fr))",
    gap: isCompact ? 8 : 12,
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
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,251,255,0.96) 100%)",
    border: "1px solid rgba(13,95,168,0.12)",
    color: "#0B2D4A",
    fontSize: isCompact ? 20 : 22,
    boxShadow:
      "0 10px 18px rgba(10,24,49,0.09), inset 4px 0 0 rgba(214,170,69,0.16), inset 0 1px 0 rgba(255,255,255,0.96)",
    outline: `1px solid ${bg.includes("#25A65A") ? "rgba(46,155,98,0.10)" : "rgba(214,170,69,0.08)"}`,
    outlineOffset: -2,
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
    display: isCompact ? "none" : "-webkit-box",
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
  | "notice"
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

const MARKETPLACE_GLYPH_ICON_MAP = {
  bank: "financeInstitution",
  card: "card",
  cash: "wallet",
  chart: "financeInstitution",
  chevron: "navigation",
  chevronUp: "navigation",
  control: "vault",
  copy: "copy",
  cycle: "refresh",
  demand: "marketplace",
  email: "phone",
  eye: "eye",
  heart: "shield",
  join: "join-person-plus",
  ledger: "evidence",
  links: "qr",
  members: "community",
  notice: "evidence",
  open: "navigation",
  payment: "repaymentSchedule",
  pool: "financeInstitution",
  refresh: "refresh",
  repost: "megaphone",
  rosca: "repaymentSchedule",
  shop: "marketplace",
  spark: "spark",
  support: "repaymentSchedule",
  target: "qr",
  trade: "marketplace",
  trust: "shield",
  verify: "evidence",
  whatsapp: "phone",
} satisfies Record<MarketplaceGlyphName, GsnIconName>;

function MarketplaceGlyph({
  name,
  size = 24,
}: {
  name: MarketplaceGlyphName;
  size?: number;
}) {
  let _glyph: React.ReactNode;

  switch (name) {
    case "bank":
      _glyph = (
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
      _glyph = (
        <>
          <rect x="3.5" y="6" width="17" height="12" rx="2.5" />
          <path d="M3.5 10h17" />
          <path d="M7 14h4" />
        </>
      );
      break;
    case "pool":
      _glyph = (
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
      _glyph = (
        <>
          <rect x="3.5" y="7" width="17" height="10" rx="2.5" />
          <circle cx="12" cy="12" r="2.25" />
          <path d="M6.5 10v4" />
          <path d="M17.5 10v4" />
        </>
      );
      break;
    case "chart":
      _glyph = (
        <>
          <path d="M4 18h16" />
          <path d="M6 15l4-4 3 2.5 5-7" />
          <path d="M18 6.5h1.5V8" />
        </>
      );
      break;
    case "chevron":
      _glyph = <path d="M9 5.5 15.5 12 9 18.5" />;
      break;
    case "chevronUp":
      _glyph = <path d="M5.5 14.5 12 8l6.5 6.5" />;
      break;
    case "copy":
      _glyph = (
        <>
          <rect x="8" y="7" width="10" height="13" rx="2" />
          <path d="M6 17H5.8A2.8 2.8 0 0 1 3 14.2V6.8A2.8 2.8 0 0 1 5.8 4H13a2.8 2.8 0 0 1 2.8 2.8V7" />
          <path d="M11 11h4" />
        </>
      );
      break;
    case "email":
      _glyph = (
        <>
          <rect x="3.8" y="6" width="16.4" height="12" rx="2.5" />
          <path d="m5.5 8.5 6.5 4.8 6.5-4.8" />
        </>
      );
      break;
    case "open":
      _glyph = (
        <>
          <path d="M13 5h6v6" />
          <path d="M19 5 11 13" />
          <path d="M10 7H6.5A2.5 2.5 0 0 0 4 9.5v8A2.5 2.5 0 0 0 6.5 20h8A2.5 2.5 0 0 0 17 17.5V14" />
        </>
      );
      break;
    case "refresh":
      _glyph = (
        <>
          <path d="M6.5 8.2A6.8 6.8 0 0 1 18 9.5" />
          <path d="M18 5.8v3.7h-3.7" />
          <path d="M17.5 15.8A6.8 6.8 0 0 1 6 14.5" />
          <path d="M6 18.2v-3.7h3.7" />
        </>
      );
      break;
    case "join":
      _glyph = (
        <>
          <circle cx="9" cy="9" r="3" />
          <path d="M4.5 18.2c.7-3 2.2-4.5 4.5-4.5s3.8 1.5 4.5 4.5" />
          <path d="M17.5 8v6" />
          <path d="M14.5 11h6" />
        </>
      );
      break;
    case "verify":
      _glyph = (
        <>
          <path d="M12 3.8 18.5 6v5.3c0 4-2.5 7.1-6.5 8.9-4-1.8-6.5-4.9-6.5-8.9V6z" />
          <path d="M8.8 12.1 11 14.3l4.2-4.6" />
        </>
      );
      break;
    case "whatsapp":
      _glyph = (
        <>
          <path d="M5.5 18.3 6.6 15.2A7 7 0 1 1 9 17.5z" />
          <path d="M9.2 8.8c.5 2.5 2 4.1 4.6 4.9" />
          <path d="M9.2 8.8c.5-.7 1-.8 1.4-.3l.6.8c.2.3.2.6-.1.9l-.4.4" />
          <path d="M13.8 13.7l.4-.4c.3-.3.6-.3.9-.1l.8.6c.5.4.4.9-.3 1.4" />
        </>
      );
      break;
    case "repost":
      _glyph = (
        <>
          <path d="M4 13h3l8 4V7l-8 4H4z" />
          <path d="M7 13l1 5" />
          <path d="M18 9.5c.8.7 1.2 1.5 1.2 2.5s-.4 1.8-1.2 2.5" />
          <path d="M19.5 7.2c1.4 1.2 2 2.8 2 4.8s-.6 3.6-2 4.8" />
        </>
      );
      break;
    case "target":
      _glyph = (
        <>
          <circle cx="12" cy="12" r="7.2" />
          <circle cx="12" cy="12" r="3.6" />
          <circle cx="12" cy="12" r="1" />
        </>
      );
      break;
    case "payment":
      _glyph = (
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
      _glyph = (
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
      _glyph = (
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
      _glyph = (
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
      _glyph = (
        <>
          <path d="M4 13h3l8 4V7l-8 4H4z" />
          <path d="M7 13l1 5" />
          <path d="M18 9.5c.8.7 1.2 1.5 1.2 2.5s-.4 1.8-1.2 2.5" />
        </>
      );
      break;
    case "eye":
      _glyph = (
        <>
          <path d="M3.5 12s3.2-5.2 8.5-5.2 8.5 5.2 8.5 5.2-3.2 5.2-8.5 5.2S3.5 12 3.5 12z" />
          <circle cx="12" cy="12" r="2.8" />
          <circle cx="12.9" cy="11.1" r="0.7" />
        </>
      );
      break;
    case "heart":
      _glyph = (
        <>
          <path d="M12 19s-7-4.3-7-9.1C5 7.4 6.8 6 8.8 6c1.2 0 2.4.6 3.2 1.6C12.8 6.6 14 6 15.2 6 17.2 6 19 7.4 19 9.9 19 14.7 12 19 12 19z" />
          <path d="M8 13h8" />
        </>
      );
      break;
    case "ledger":
      _glyph = (
        <>
          <rect x="5" y="4" width="14" height="16" rx="2.5" />
          <path d="M8.5 8h7" />
          <path d="M8.5 12h7" />
          <path d="M8.5 16h4.5" />
        </>
      );
      break;
    case "links":
      _glyph = (
        <>
          <path d="M8.5 12.5 6.8 14.2a3 3 0 0 0 4.2 4.2l2.1-2.1" />
          <path d="M15.5 11.5l1.7-1.7A3 3 0 0 0 13 5.6l-2.1 2.1" />
          <path d="M9.5 14.5 14.5 9.5" />
        </>
      );
      break;
    case "members":
      _glyph = (
        <>
          <circle cx="9" cy="9" r="2.7" />
          <circle cx="16" cy="10" r="2.2" />
          <path d="M4.5 18c.7-2.6 2.2-4 4.5-4s3.8 1.4 4.5 4" />
          <path d="M13.5 17c.5-1.8 1.6-2.8 3.4-2.8 1.7 0 2.8 1 3.4 2.8" />
        </>
      );
      break;
    case "trade":
      _glyph = (
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
      _glyph = (
        <>
          <path d="M5 10h14l-1.2-4.5H6.2z" />
          <path d="M6.5 10v8.5h11V10" />
          <path d="M9 18.5V14h6v4.5" />
          <path d="M5 10c.4 1.4 1.3 2.1 2.5 2.1S9.6 11.4 10 10c.4 1.4 1.3 2.1 2.5 2.1s2.1-.7 2.5-2.1c.4 1.4 1.2 2.1 2.5 2.1S19.6 11.4 20 10" />
        </>
      );
      break;
    case "spark":
      _glyph = (
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
      _glyph = (
        <>
          <path d="M5.5 13.5h3.3l2.3 2.2a2.2 2.2 0 0 0 2.9.1l4.5-3.4a1.7 1.7 0 0 0-2-2.7l-3 2.1" />
          <path d="M8.8 13.5l2.5-2.7a2.8 2.8 0 0 1 3.9-.2l.6.5" />
          <path d="M4 11.8v5.7h3.2" />
          <path d="M8.2 6.9c0-1.4 1-2.4 2.3-2.4.8 0 1.6.4 2 1.1.5-.7 1.2-1.1 2-1.1 1.3 0 2.3 1 2.3 2.4 0 2.5-4.3 4.8-4.3 4.8S8.2 9.4 8.2 6.9z" />
        </>
      );
      break;
    case "trust":
      _glyph = (
        <>
          <path d="M12 3.8 18.5 6v5.3c0 4-2.5 7.1-6.5 8.9-4-1.8-6.5-4.9-6.5-8.9V6z" />
          <path d="M8.8 12.1 11 14.3l4.2-4.6" />
        </>
      );
      break;
    default:
      _glyph = null;
  }

  void _glyph;

  return (
    <GsnLegacyIcon
      name={MARKETPLACE_GLYPH_ICON_MAP[name]}
      size={Math.max(size, Math.round(size * 1.15))}
      decorative
      style={{ display: "inline-grid", flex: "0 0 auto" }}
    />
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
    touchAction: "auto",
    position: "relative",
    zIndex: 2,
  };
}

function textAreaStyle(): React.CSSProperties {
  return {
    ...inputStyle(),
    minHeight: 96,
    resize: "vertical",
    lineHeight: 1.45,
    fontFamily: "inherit",
    overflowY: "hidden",
    whiteSpace: "pre-wrap",
  };
}

function marketplaceJoinFieldLabelStyle(
  isCompact: boolean
): React.CSSProperties {
  return {
    ...helperText(),
    fontSize: 12,
    fontWeight: 900,
    lineHeight: 1.18,
    minHeight: isCompact ? 28 : 30,
    maxHeight: isCompact ? 28 : 30,
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
  };
}

function marketplaceJoinFieldShellStyle(
  isCompact: boolean
): React.CSSProperties {
  const shellHeight = isCompact ? 78 : 82;

  return {
    display: "grid",
    gap: 6,
    alignContent: "start",
    minWidth: 0,
    overflow: "visible",
    overflowAnchor: "none",
    transition: "none",
    height: shellHeight,
    minHeight: shellHeight,
    maxHeight: shellHeight,
  };
}

function marketplaceJoinFixedFieldStyle(
  isCompact: boolean
): React.CSSProperties {
  return {
    ...inputStyle(),
    height: isCompact ? 44 : 46,
    minHeight: isCompact ? 44 : 46,
    maxHeight: isCompact ? 44 : 46,
    fontSize: 16,
    lineHeight: 1.2,
    overflow: "hidden",
    transition: "none",
  };
}

function noticeCard(tone: NoticeTone, isCompact = false): React.CSSProperties {
  return {
    ...softCard(tone === "success" ? "#F3FBF5" : "#FEF2F2"),
    position: "fixed",
    left: "50%",
    bottom: isCompact
      ? "calc(104px + env(safe-area-inset-bottom, 0px))"
      : 18,
    transform: "translateX(-50%)",
    width: isCompact ? "min(520px, calc(100vw - 24px))" : "min(720px, calc(100vw - 32px))",
    zIndex: 320,
    pointerEvents: "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
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

function noticeCloseButtonStyle(tone: NoticeTone): React.CSSProperties {
  return {
    width: 34,
    height: 34,
    minWidth: 34,
    borderRadius: 999,
    border:
      tone === "success"
        ? "1px solid rgba(22,101,52,0.18)"
        : "1px solid rgba(153,27,27,0.18)",
    background: "rgba(255,255,255,0.72)",
    color: tone === "success" ? "#166534" : "#991B1B",
    fontWeight: 950,
    fontSize: 16,
    lineHeight: 1,
    cursor: "pointer",
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

function joinInviteDraftStorageKey(communityId: number): string {
  return `gmfn.marketplace.joinInviteDraft.v1.${communityId || "unknown"}`;
}

function readWithdrawalTask(clanId: number, gmfnId: string): PersistedWithdrawalTask | null {
  if (!clanId || !gmfnId) return null;

  for (const prefix of WITHDRAWAL_TASK_STORAGE_KEY_PREFIXES) {
    const key = `${prefix}.${gmfnId || "me"}.${clanId || 0}`;
    const value = readLocalJSON<PersistedWithdrawalTask | null>(key, null);
    if (value) return value;
  }

  return null;
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
  const [trustSlip, setTrustSlip] = useState<any>(null);
  const [marketplaceNotices, setMarketplaceNotices] = useState<MarketplaceNoticeItem[]>([]);
  const [marketplaceNoticesLoading, setMarketplaceNoticesLoading] = useState(false);
  const [marketplaceNoticePostingPolicy, setMarketplaceNoticePostingPolicy] =
    useState<"members" | "admins">("members");
  const [marketplaceNoticeSettingsSaving, setMarketplaceNoticeSettingsSaving] =
    useState(false);
  const [marketplaceNoticeModalOpen, setMarketplaceNoticeModalOpen] = useState(false);
  const [marketplaceNoticePosting, setMarketplaceNoticePosting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string>("");
  const [joinSenderName, setJoinSenderName] = useState("");
  const [joinRecipientName, setJoinRecipientName] = useState("");
  const [joinInviteNote, setJoinInviteNote] = useState("");
  const [joinRelationshipType, setJoinRelationshipType] = useState("");
  const [joinKnownDuration, setJoinKnownDuration] = useState("");
  const [joinRelationshipContext, setJoinRelationshipContext] = useState("");
  const [joinRelationshipEvidenceRecordedKey, setJoinRelationshipEvidenceRecordedKey] =
    useState("");
  const [creatingInviteLink, setCreatingInviteLink] = useState(false);
  const joinInviteAutoPrepareKeyRef = useRef("");
  const joinInviteDraftRestoredKeyRef = useRef("");
  const [joinInviteManualCopyMessage, setJoinInviteManualCopyMessage] =
    useState("");
  const [activeLinkCenterTool, setActiveLinkCenterTool] =
    useState<LinkCenterTool | null>(null);
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
  const [createdRoscaPackageInstruction, setCreatedRoscaPackageInstruction] =
    useState<ExpectedPaymentRecord | null>(null);
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
  const [protectedTrades, setProtectedTrades] = useState<ProtectedTradeRecord[]>(
    []
  );
  const [protectedTradeDraft, setProtectedTradeDraft] =
    useState<ProtectedTradeDraft>({
      role: "seller",
      counterpartUserId: "",
      itemTitle: "",
      amount: "",
      currency: "NGN",
      termsSummary: "",
      evidencePacketNote: "",
    });
  const [selectedProtectedTradeId, setSelectedProtectedTradeId] = useState("");
  const [protectedTradeEventType, setProtectedTradeEventType] =
    useState("payment.claimed");
  const [protectedTradeEventNote, setProtectedTradeEventNote] = useState("");
  const [creatingProtectedTrade, setCreatingProtectedTrade] = useState(false);
  const [recordingProtectedTradeEvent, setRecordingProtectedTradeEvent] =
    useState(false);
  const [loadingProtectedTrades, setLoadingProtectedTrades] = useState(false);
  const [selectedProtectedTradeDetail, setSelectedProtectedTradeDetail] =
    useState<ProtectedTradeRecord | null>(null);
  const [loadingProtectedTradeDetail, setLoadingProtectedTradeDetail] =
    useState(false);
  const [moneySurface, setMoneySurface] = useState<CommunityMoneySurface | null>(
    null
  );
  const [communityDomainPolicyPayload, setCommunityDomainPolicyPayload] =
    useState<any>(null);
  const [payInEditorOpen, setPayInEditorOpen] = useState(false);
  const [savingPayInAccount, setSavingPayInAccount] = useState(false);
  const [payInAccountDraft, setPayInAccountDraft] = useState<PayInAccountDraft>({
    accountName: "",
    bankName: "",
    accountNumber: "",
    sortCode: "",
    country: "",
    currency: "GBP",
    note: "",
  });

  const [loanAmount, setLoanAmount] = useState("");
  const [loanDurationDays, setLoanDurationDays] = useState("");
  const [loanRepaymentCadence, setLoanRepaymentCadence] = useState("weekly");
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
  const [supportDeskMode, setSupportDeskMode] =
    useState<SupportDeskMode>("choices");
  const [intentQuery, setIntentQuery] = useState("");
  const [intentGuideOpen] = useState(false);

  const roscaSectionRef = useRef<HTMLElement | null>(null);
  const supportSectionRef = useRef<HTMLElement | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const scrollTimeoutRefs = useRef<number[]>([]);
  const pendingMarketplaceSectionRef = useRef("");
  const pendingMarketplaceSectionForceRef = useRef(false);
  const routeHashLandingAppliedRef = useRef("");
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
  const routeSupportFlow = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return safeStr(
      query.get("support_flow") || query.get("supportFlow")
    ).toLowerCase();
  }, [location.search]);
  const routeFocus = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return safeStr(query.get("focus")).toLowerCase();
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
  const currentGmfnId = firstTruthy(me?.gmfn_id, getStoredGmfnId());
  const publicShopOwnerId = firstTruthy(
    publicShopRecord?.owner_gmfn_id,
    publicShopRecord?.gmfn_id,
    currentGmfnId
  );

  const activeCommunityId = useMemo(() => {
    return positiveNumber(
      selectedCommunity?.id || selectedCommunity?.clan_id || selectedClanId
    );
  }, [selectedCommunity, selectedClanId]);

  useEffect(() => {
    let alive = true;
    if (!activeCommunityId) {
      setCommunityDomainPolicyPayload(null);
      return () => {
        alive = false;
      };
    }

    (async () => {
      const payload = await listMyCommunityDomains().catch(() => null);
      if (alive) setCommunityDomainPolicyPayload(payload);
    })();

    return () => {
      alive = false;
    };
  }, [activeCommunityId]);

  const marketplaceMoneyOutTo = useMemo(
    () => {
      const target = resolveCtaTarget("moneyOut", {
        communityId: activeCommunityId,
        debugId: "marketplace.route.moneyOut",
      }).to;
      return typeof target === "string" ? target : APP_ROUTES.MONEY_OUT;
    },
    [activeCommunityId]
  );

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
  const marketplaceCommunityDomainRows = useMemo<MarketplaceCommunityDomainRow[]>(() => {
    return rowsOf<any>(communityDomainPolicyPayload)
      .map((item) => {
        const domain = item?.community_domain || item?.domain || item || {};
        const domainId = positiveNumber(domain?.id || item?.community_domain_id);
        const clanId = positiveNumber(
          domain?.clan_id || domain?.community_id || item?.clan_id || item?.community_id
        );
        const dashboardPath =
          firstTruthy(item?.dashboard_path, domain?.dashboard_path) ||
          (domainId ? `/app/community-domain/${domainId}` : "/app/community-domain");
        const marketplaceReady = !communityDomainNeedsSetup({
          ...domain,
          clan_id: clanId,
        });

        if (!domainId && !firstTruthy(domain?.domain_name, domain?.display_name)) {
          return null;
        }

        return {
          key: firstTruthy(domainId, domain?.domain_name, dashboardPath),
          id: domainId,
          name: firstTruthy(domain?.display_name, domain?.domain_name, "Community Domain"),
          code: firstTruthy(domain?.domain_name, "domain code pending"),
          role: firstTruthy(item?.membership?.role, item?.viewer?.can_admin ? "admin" : "member"),
          status: firstTruthy(domain?.status, "status pending"),
          verification: firstTruthy(domain?.verification_status, "unverified"),
          clanId,
          marketplaceReady,
          dashboardPath,
          marketplacePath: clanId
            ? routeWithCommunity(APP_ROUTES.MARKETPLACE, clanId)
            : dashboardPath,
        };
      })
      .filter((row): row is MarketplaceCommunityDomainRow => Boolean(row));
  }, [communityDomainPolicyPayload]);
  const publicShopViewLink = useMemo(() => {
    if (!publicShopOwnerId || !publicShopRecord) return "";
    return publicShopUrl(publicShopOwnerId);
  }, [publicShopOwnerId, publicShopRecord]);

  const publicShopPosterLink = useMemo(() => {
    if (!publicShopOwnerId || !publicShopRecord) return "";
    return publicShopShareUrl({ gmfnId: publicShopOwnerId });
  }, [publicShopOwnerId, publicShopRecord]);
  const marketplaceShopsDomainFeatureMatch = useMemo(
    () =>
      communityDomainFeatureModeFromPayload(
        communityDomainPolicyPayload,
        activeCommunityId,
        "marketplace_shops"
      ),
    [activeCommunityId, communityDomainPolicyPayload]
  );
  const marketplaceShopsFeatureOff = communityDomainFeatureIsOff(
    marketplaceShopsDomainFeatureMatch
  );
  const marketplaceShopsFeatureOffText = communityDomainFeatureOffMessage(
    "Marketplace Shops",
    marketplaceShopsDomainFeatureMatch?.domainName ||
      communityName(selectedCommunity) ||
      "this Community Domain"
  );
  const spotlightDomainFeatureMatch = useMemo(
    () =>
      communityDomainFeatureModeFromPayload(
        communityDomainPolicyPayload,
        activeCommunityId,
        "spotlight"
      ),
    [activeCommunityId, communityDomainPolicyPayload]
  );
  const spotlightFeatureOff = communityDomainFeatureIsOff(spotlightDomainFeatureMatch);
  const spotlightFeatureOffText = communityDomainFeatureOffMessage(
    "Spotlight",
    spotlightDomainFeatureMatch?.domainName ||
      communityName(selectedCommunity) ||
      "this Community Domain"
  );
  const publicShopActionsLocked =
    !currentGmfnId ||
    !activeCommunityId ||
    preparingPublicShopLink ||
    marketplaceShopsFeatureOff;

  const publicShopUnavailableText = !currentGmfnId
    ? "Your GSN ID is not ready yet."
    : marketplaceShopsFeatureOff
    ? marketplaceShopsFeatureOffText
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
      const message = marketplaceErrorMessage(
        err,
        "GSN could not read target community suggestions right now."
      );
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

  const showNotice = useCallback((tone: NoticeTone, text: string) => {
    setNotice({ tone, text });
  }, []);

  const loadMarketplaceNotices = useCallback(async () => {
    if (!activeCommunityId) {
      setMarketplaceNotices([]);
      setMarketplaceNoticePostingPolicy("members");
      setMarketplaceNoticesLoading(false);
      return;
    }

    setMarketplaceNoticesLoading(true);
    try {
      const res = await listCommunityNotices({
        clan_id: activeCommunityId,
        limit: 3,
      }).catch(() => null);
      const rows = Array.isArray(res?.notices) ? res.notices : [];
      setMarketplaceNotices(rows);
      setMarketplaceNoticePostingPolicy(
        normalizeNoticePostingPolicy(
          firstTruthy(res?.posting_policy, selectedCommunity?.notice_posting_policy)
        )
      );
    } finally {
      setMarketplaceNoticesLoading(false);
    }
  }, [activeCommunityId, selectedCommunity]);

  useEffect(() => {
    void loadMarketplaceNotices();
  }, [loadMarketplaceNotices]);

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
    if (key === "support" && willOpen) {
      setSupportDeskMode("choices");
    }
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

  async function submitMarketplaceNotice(
    body: string,
    options?: {
      expiry_policy?: "standard" | "urgent" | "event" | "pinned";
      expires_at?: string;
    }
  ) {
    if (!activeCommunityId) {
      showNotice("error", "Select a marketplace before posting a notice.");
      return;
    }

    setMarketplaceNoticePosting(true);
    try {
      await createCommunityNotice({ clan_id: activeCommunityId, body, ...options });
      await loadMarketplaceNotices();
      setMarketplaceNoticeModalOpen(false);
      showNotice("success", "Marketplace announcement posted.");
    } catch (err: any) {
      showNotice(
        "error",
        marketplaceErrorMessage(err, "Official notice could not be posted.")
      );
    } finally {
      setMarketplaceNoticePosting(false);
    }
  }

  async function updateMarketplaceNoticePolicy(
    event: React.SyntheticEvent<HTMLElement>,
    postingPolicy: "members" | "admins"
  ) {
    consumeMarketplaceButtonEvent(event);

    if (!activeCommunityId || !canManageMarketplaceNoticeSettings) {
      showNotice(
        "error",
        "Only a community officer can change who may post announcements."
      );
      return;
    }
    if (marketplaceNoticeSettingsSaving) {
      showNotice("success", "Saving this notice board setting now.");
      return;
    }
    if (activeNoticePostingPolicy === postingPolicy) {
      showNotice(
        "success",
        postingPolicy === "members"
          ? "Notice board is already open to active members."
          : "Notice board is already admin-only."
      );
      return;
    }

    setMarketplaceNoticeSettingsSaving(true);
    try {
      const res = await updateCommunityNoticeSettings(activeCommunityId, {
        posting_policy: postingPolicy,
      });
      const nextPolicy = normalizeNoticePostingPolicy(res?.posting_policy);
      setMarketplaceNoticePostingPolicy(nextPolicy);
      showNotice(
        "success",
        nextPolicy === "members"
          ? "Notice board is open to active members."
          : "Notice board is admin-only now."
      );
    } catch (err: any) {
      showNotice(
        "error",
        marketplaceErrorMessage(err, "This notice board setting could not be saved.")
      );
    } finally {
      setMarketplaceNoticeSettingsSaving(false);
    }
  }

  function openMarketplaceNoticeSenderWhatsApp(
    event: React.SyntheticEvent<HTMLElement>,
    noticeItem: MarketplaceNoticeItem
  ) {
    consumeMarketplaceButtonEvent(event);
    const contact = firstTruthy(noticeItem?.sender_whatsapp_number);
    const chatUrl = buildWhatsAppChatUrl(
      contact,
      `Hi ${firstTruthy(noticeItem?.sender_whatsapp_label, "there")}. I saw your GSN marketplace announcement for ${activeCommunityName}.`
    );

    if (!chatUrl || typeof window === "undefined") {
      showNotice(
        "error",
        "This announcement sender has not published a WhatsApp contact."
      );
      return;
    }

    window.open(chatUrl, "_blank", "noopener,noreferrer");
    showNotice("success", "WhatsApp opened for this announcement sender.");
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

  async function openMarketplaceCommunityDomain(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    row: MarketplaceCommunityDomainRow
  ) {
    consumeMarketplaceButtonEvent(event);

    if (!row.marketplaceReady) {
      showNotice(
        "error",
        "This Community Domain still needs setup or activation before it can open as a marketplace."
      );
      navigateWithOrigin(navigate, row.dashboardPath, location);
      return;
    }

    if (!row.clanId) {
      showNotice(
        "error",
        "This Community Domain is active, but its marketplace community is not linked yet."
      );
      navigateWithOrigin(navigate, row.dashboardPath, location);
      return;
    }

    try {
      await selectClan(row.clanId);
      navigateWithOrigin(navigate, row.marketplacePath, location);
    } catch (err: any) {
      showNotice(
        "error",
        marketplaceErrorMessage(
          err,
          "This Community Domain marketplace could not be selected right now."
        )
      );
    }
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
    attempt = 0,
    force = false
  ) {
    if (
      !force &&
      (marketplaceActiveElementIsEditable() ||
        marketplaceRecentlyInteractedWithField())
    ) {
      pendingMarketplaceSectionRef.current = "";
      traceMarketplaceLanding({
        surface: "marketplace",
        targetId: id,
        reason: marketplaceActiveElementIsEditable()
          ? "section-scroll-skipped-field-focus"
          : "section-scroll-skipped-recent-field-touch",
        attempt,
        skipped: true,
      });
      return;
    }

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
      scrollToMarketplaceSection(id, attempt + 1, force);
    });
  }, []);

  useEffect(() => {
    return () => {
      cancelMarketplaceSectionScroll();
    };
  }, [cancelMarketplaceSectionScroll]);

  const scheduleMarketplaceSectionScroll = useCallback(
    function scheduleMarketplaceSectionScroll(
      sectionId: string,
      opts?: { force?: boolean }
    ) {
      if (typeof window === "undefined") return;
      const force = Boolean(opts?.force);
      cancelMarketplaceSectionScroll();
      if (
        !force &&
        (marketplaceActiveElementIsEditable() ||
          marketplaceRecentlyInteractedWithField())
      ) {
        pendingMarketplaceSectionRef.current = "";
        pendingMarketplaceSectionForceRef.current = false;
        traceMarketplaceLanding({
          surface: "marketplace",
          targetId: sectionId,
          reason: marketplaceActiveElementIsEditable()
            ? "section-schedule-skipped-field-focus"
            : "section-schedule-skipped-recent-field-touch",
          skipped: true,
        });
        return;
      }
      pendingMarketplaceSectionRef.current = sectionId;
      pendingMarketplaceSectionForceRef.current = force;

      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef.current = window.requestAnimationFrame(() => {
          scrollFrameRef.current = null;
          scrollToMarketplaceSection(sectionId, 0, force);
          if (pendingMarketplaceSectionRef.current === sectionId) {
            pendingMarketplaceSectionRef.current = "";
            pendingMarketplaceSectionForceRef.current = false;
          }
        });
      });
    },
    [cancelMarketplaceSectionScroll, scrollToMarketplaceSection]
  );

  useEffect(() => {
    const sectionId = pendingMarketplaceSectionRef.current;
    if (!sectionId) return;
    scheduleMarketplaceSectionScroll(sectionId, {
      force: pendingMarketplaceSectionForceRef.current,
    });
  }, [sectionsOpen, scheduleMarketplaceSectionScroll]);

  useEffect(() => {
    if (sectionsOpen.tools) return;
    setActiveLinkCenterTool(null);
  }, [sectionsOpen.tools]);

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
      setSupportDeskMode("choices");
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
      setActiveLinkCenterTool("join");
      clearStaleMarketplaceHash("marketplace-owned-links");
      scheduleMarketplaceSectionScroll("marketplace-owned-links");
      return;
    }

    if (item.id === "shop" && !item.to) {
      showNotice("error", "Your shop page is not ready yet.");
      return;
    }

    if (item.intent) {
      openMarketplaceCta(undefined, item.intent);
      return;
    }

    if (!item.to) {
      showNotice("error", "That page is not ready yet.");
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
      setLoanRepaymentCadence("weekly");
      setLoanPurpose("");
    }
  }

  const loadPage = useCallback(async () => {
    setLoading(true);

    try {
      const [meRes, currentClanRes, clanListRes, trustSlipRes] = await Promise.all([
        getMe().catch(() => null),
        getCurrentClan().catch(() => null),
        listMyClans().catch(() => ({ items: [] })),
        getMyTrustSlip().catch(() => null),
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
        protectedTradesRes,
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
          currentCommunityId
            ? listProtectedTrades({ limit: 30 }).catch(() => [])
            : Promise.resolve([]),
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

      const filteredProtectedTrades = rowsOf<ProtectedTradeRecord>(
        protectedTradesRes
      )
        .filter((item) => {
          const tradeClanId = Number(item?.clan_id || 0);
          return tradeClanId <= 0 || tradeClanId === currentCommunityId;
        })
        .slice(0, 8);

      setMe(meRes || null);
      setSelectedCommunity(resolvedCommunity);
      setMembers(memberRows);
      setShops(shopRows);
      setPublicShopRecord(normalizeMarketplaceShop(ownerShopRes));
      setPoolInfo(poolRes);
      setMarketplaceTrust(trustRes || null);
      setTrustSlip(trustSlipRes || null);
      setInviteLink(getInviteUrl(inviteRes));
      setLoans(filteredLoans);
      setProtectedTrades(filteredProtectedTrades);
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

    if (marketplaceShopsFeatureOff) {
      setNotice({
        tone: "error",
        text: marketplaceShopsFeatureOffText,
      });
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
        text: marketplaceErrorMessage(
          err,
          "Public shop link could not be prepared right now."
        ),
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

  function buildPublicShopLinkMessage(link: string): string {
    return buildGsnPublicShopLinkMessage({
      shopName: firstPublicIdentity(publicShopRecord?.name) || "Public GSN Shop",
      ownerName: memberName,
      gsnId: publicShopOwnerId || currentGmfnId,
      communityName: activeCommunityName,
      shopLink: link,
    });
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
      "Public shop package refreshed and copied.",
      publicShopUnavailableText,
      buildPublicShopLinkMessage(link)
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
      buildPublicShopLinkMessage(link),
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

    if (spotlightFeatureOff) {
      showNotice("error", spotlightFeatureOffText);
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
        marketplaceErrorMessage(
          err,
          "Network Spotlight payment code could not be generated."
        )
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
        marketplaceErrorMessage(
          err,
          "Paid Repost could not complete. Check the target community ID and Spotlight credit."
        )
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
    const settlement = moneySurface?.communitySettlement || null;
    if (!communityPayInReady(settlement)) return;

    setPayInAccountDraft((prev) => ({
      accountName: firstTruthy(settlement?.accountName, prev.accountName),
      bankName: firstTruthy(settlement?.bankName, prev.bankName),
      accountNumber: firstTruthy(settlement?.accountNumber, prev.accountNumber),
      sortCode: firstTruthy(settlement?.sortCode, prev.sortCode),
      country: firstTruthy(settlement?.country, prev.country),
      currency: firstTruthy((settlement as any)?.currency, prev.currency, "GBP"),
      note: prev.note,
    }));
  }, [moneySurface?.communitySettlement]);

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
    setSupportDeskMode("loan");
  }, [loanDraftId]);

  useEffect(() => {
    const hash = safeStr(location.hash).replace(/^#/, "");
    if (hash !== "marketplace-money-routes") return;
    const landingToken = `${location.pathname}${location.search}#${hash}:${
      activeCommunityId || ""
    }`;
    if (routeHashLandingAppliedRef.current === landingToken) return;
    routeHashLandingAppliedRef.current = landingToken;

    setSectionsTouched((prev) => touchedMarketplaceSectionState(prev, "money"));
    setSectionsOpen(focusedMarketplaceSectionState("money"));

    scrollToMarketplaceSection("marketplace-money-routes");
    clearMarketplaceHash();
  }, [
    location.hash,
    location.pathname,
    location.search,
    activeCommunityId,
    scrollToMarketplaceSection,
  ]);

  useEffect(() => {
    const hash = safeStr(location.hash).replace(/^#/, "");
    const isMoneyOutSupportFlow =
      routeSupportFlow === "money-out" && routeFocus === "support";
    if (hash !== "marketplace-loans-support" && !isMoneyOutSupportFlow) return;
    const landingTarget = "marketplace-loans-support";
    const landingToken = `${location.pathname}${location.search}#${landingTarget}:${
      activeCommunityId || ""
    }`;
    if (routeHashLandingAppliedRef.current === landingToken) return;
    routeHashLandingAppliedRef.current = landingToken;

    setSectionsTouched((prev) => touchedMarketplaceSectionState(prev, "support"));
    setSectionsOpen(focusedMarketplaceSectionState("support"));
    setSupportDeskMode("loan");

    if (activeCommunityId && currentGmfnId) {
      const token = `${activeCommunityId}:${currentGmfnId}:${landingTarget}`;
      if (withdrawalHandoffAppliedRef.current !== token) {
        const storedWithdrawalTask = readWithdrawalTask(
          activeCommunityId,
          currentGmfnId
        );

        const storedAmount = safeStr(storedWithdrawalTask?.amountInput);
        const storedNote = safeStr(storedWithdrawalTask?.noteInput);
        const defaultPurpose = storedAmount ? "Withdrawal support" : "";

        if (storedAmount) {
          setLoanAmount((prev) => (safeStr(prev) ? prev : storedAmount));
        }

        if (storedNote || defaultPurpose) {
          setLoanPurpose((prev) =>
            safeStr(prev) ? prev : storedNote || defaultPurpose
          );
        }

        withdrawalHandoffAppliedRef.current = token;
      }
    }

    scheduleMarketplaceSectionScroll("marketplace-loans-support", {
      force: true,
    });
    clearMarketplaceHash();
  }, [
    location.hash,
    location.pathname,
    location.search,
    activeCommunityId,
    currentGmfnId,
    routeFocus,
    routeSupportFlow,
    scheduleMarketplaceSectionScroll,
  ]);

  useEffect(() => {
    const hash = safeStr(location.hash).replace(/^#/, "");
    if (hash !== "marketplace-rosca") return;
    const landingToken = `${location.pathname}${location.search}#${hash}:${
      activeCommunityId || ""
    }`;
    if (routeHashLandingAppliedRef.current === landingToken) return;
    routeHashLandingAppliedRef.current = landingToken;

    setSectionsTouched((prev) => touchedMarketplaceSectionState(prev, "rosca"));
    setSectionsOpen(focusedMarketplaceSectionState("rosca"));

    scrollToMarketplaceSection("marketplace-rosca");
    clearMarketplaceHash();
  }, [
    location.hash,
    location.pathname,
    location.search,
    activeCommunityId,
    scrollToMarketplaceSection,
  ]);

  useEffect(() => {
    const hash = safeStr(location.hash).replace(/^#/, "");
    if (hash !== "marketplace-owned-links") return;
    const landingToken = `${location.pathname}${location.search}#${hash}:${
      activeCommunityId || ""
    }`;
    if (routeHashLandingAppliedRef.current === landingToken) return;
    routeHashLandingAppliedRef.current = landingToken;

    setSectionsTouched((prev) => touchedMarketplaceSectionState(prev, "tools"));
    setSectionsOpen(focusedMarketplaceSectionState("tools"));
    setActiveLinkCenterTool(null);

    scrollToMarketplaceSection("marketplace-owned-links");
    clearMarketplaceHash();
  }, [
    location.hash,
    location.pathname,
    location.search,
    activeCommunityId,
    scrollToMarketplaceSection,
  ]);

  useEffect(() => {
    const hash = safeStr(location.hash).replace(/^#/, "");
    const hasRepostContext = Boolean(
      routeRepostSource ||
        routeRepostProductId ||
        routeRepostBlockNumber
    );
    const openedFromShopBlock =
      hash === "marketplace-paid-network-placement" &&
      hasRepostContext &&
      (routeRepostSource === "shop-diaries" ||
        routeRepostSource === "shop-control-gallery" ||
        Boolean(routeRepostProductId || routeRepostBlockNumber));
    if (!openedFromShopBlock) return;

    setSectionsTouched((prev) => touchedMarketplaceSectionState(prev, "tools"));
    setSectionsOpen(focusedMarketplaceSectionState("tools"));
    setActiveLinkCenterTool("repost");

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
    showNotice,
    visibleRepostProducts,
  ]);

  const profileMemberName = useMemo(() => {
    return firstPublicIdentity(
      me?.display_name,
      me?.nickname,
      me?.name,
      me?.first_name
    );
  }, [me]);

  const memberName = profileMemberName || "GSN member";

  useEffect(() => {
    if (!profileMemberName || safeStr(joinSenderName)) return;
    setJoinSenderName(profileMemberName);
  }, [profileMemberName, joinSenderName]);

  const activeCommunityName = useMemo(() => {
    return communityName(selectedCommunity);
  }, [selectedCommunity]);
  const roscaDomainFeatureMatch = useMemo(
    () =>
      communityDomainFeatureModeFromPayload(
        communityDomainPolicyPayload,
        activeCommunityId,
        "rosca_cycles"
      ),
    [activeCommunityId, communityDomainPolicyPayload]
  );
  const roscaCyclesFeatureOff = communityDomainFeatureIsOff(roscaDomainFeatureMatch);
  const roscaCyclesFeatureOffText = communityDomainFeatureOffMessage(
    "ROSCA / rotating contributions",
    roscaDomainFeatureMatch?.domainName || activeCommunityName || "this Community Domain"
  );

  const marketplaceHeroImageSrc = useMemo(() => {
    return resolveRepostAssetSrc(
      firstTruthy(
        selectedCommunity?.marketplace_image_url,
        selectedCommunity?.cover_image_url,
        selectedCommunity?.banner_url,
        selectedCommunity?.community_image_url,
        selectedCommunity?.profile_image_url,
        selectedCommunity?.image_url,
        selectedCommunity?.logo_url
      )
    );
  }, [selectedCommunity]);

  const moneyOutSupportTask = useMemo(() => {
    if (!activeCommunityId || !currentGmfnId) return null;
    const stored = readWithdrawalTask(activeCommunityId, currentGmfnId);
    const hasMoneyOutRoute =
      routeSupportFlow === "money-out" && routeFocus === "support";
    const isMoneyOutHandoff =
      safeStr(stored?.handoffMode) === "withdrawal-support";

    return hasMoneyOutRoute || isMoneyOutHandoff ? stored : null;
  }, [activeCommunityId, currentGmfnId, routeFocus, routeSupportFlow]);

  const moneyOutSupportAmountText = safeStr(moneyOutSupportTask?.amountInput);
  const moneyOutSupportGapText = safeStr(moneyOutSupportTask?.supportGap);
  const hasMoneyOutSupportTask = Boolean(moneyOutSupportTask);

  const activeJoinCommunityName = useMemo(() => {
    return baseCommunityName(selectedCommunity);
  }, [selectedCommunity]);

  const activeJoinCommunityCode = useMemo(() => {
    return communityCode(selectedCommunity);
  }, [selectedCommunity]);

  const joinRelationshipReady = useMemo(() => {
    return Boolean(safeStr(joinRelationshipType) && safeStr(joinKnownDuration));
  }, [joinRelationshipType, joinKnownDuration]);

  const joinRecipientReady = useMemo(() => {
    return Boolean(safeStr(joinRecipientName));
  }, [joinRecipientName]);

  const joinSenderDisplayName = useMemo(() => {
    return safeStr(joinSenderName);
  }, [joinSenderName]);

  const joinSenderReady = useMemo(() => {
    return Boolean(joinSenderDisplayName);
  }, [joinSenderDisplayName]);

  const joinRelationshipEvidenceKey = useMemo(() => {
    return [
      safeStr(joinRelationshipType),
      safeStr(joinKnownDuration),
      safeStr(joinRelationshipContext),
    ].join("|");
  }, [joinRelationshipType, joinKnownDuration, joinRelationshipContext]);

  const joinInviteTrustReady = useMemo(() => {
    return Boolean(
      inviteLink &&
        joinSenderReady &&
        joinRecipientReady &&
        joinRelationshipReady &&
        joinRelationshipEvidenceRecordedKey &&
        joinRelationshipEvidenceRecordedKey === joinRelationshipEvidenceKey
    );
  }, [
    inviteLink,
    joinSenderReady,
    joinRecipientReady,
    joinRelationshipReady,
    joinRelationshipEvidenceKey,
    joinRelationshipEvidenceRecordedKey,
  ]);

  const joinInviteShareReady = useMemo(() => {
    return Boolean(
      inviteLink && joinSenderReady && joinRecipientReady && joinRelationshipReady
    );
  }, [inviteLink, joinSenderReady, joinRecipientReady, joinRelationshipReady]);

  const joinRelationshipStatusText = useMemo(() => {
    if (!joinSenderReady) return "Sender needed";
    if (!joinRecipientReady) return "Name needed";
    if (!joinRelationshipReady) return "Relationship needed";
    if (creatingInviteLink) return "Preparing";
    return joinInviteShareReady ? "Ready" : "Auto";
  }, [
    creatingInviteLink,
    joinInviteShareReady,
    joinRecipientReady,
    joinRelationshipReady,
    joinSenderReady,
  ]);

  const personalizedInviteLink = useMemo(() => {
    return (
      personalizedJoinInviteUrl(inviteLink, {
        inviterName: joinSenderDisplayName,
        recipientName: joinRecipientName,
        communityCode: activeJoinCommunityCode,
        communityName: activeJoinCommunityName,
        marketplaceName: activeCommunityName,
        message: joinInviteNote,
      }) || inviteLink
    );
  }, [
    inviteLink,
    joinSenderDisplayName,
    joinRecipientName,
    activeJoinCommunityCode,
    activeJoinCommunityName,
    activeCommunityName,
    joinInviteNote,
  ]);

  const personalizedInviteMaskedLabel = useMemo(() => {
    return cleanMaskedLinkLabel(
      buildMaskedLinkLabel(personalizedInviteLink, "join", activeCommunityName)
    );
  }, [personalizedInviteLink, activeCommunityName]);

  const compactInviteLink = useMemo(() => {
    return compactJoinInviteUrl(personalizedInviteLink) || personalizedInviteLink;
  }, [personalizedInviteLink]);

  const maskedMarketplaceFaceLabel = useMemo(() => {
    return cleanMaskedLinkLabel(
      buildMaskedLinkLabel(
        publicCommunityWorkspaceLink,
        "marketplace",
        activeCommunityName
      )
    );
  }, [publicCommunityWorkspaceLink, activeCommunityName]);

  const joinInviteDoorwayMessage = useMemo(() => {
    if (!compactInviteLink) return "";
    return buildGsnInviteLinkMessage({
      senderName: joinSenderDisplayName,
      senderGsnId: currentGmfnId,
      communityName: activeJoinCommunityName,
      inviteLink: compactInviteLink,
      note: joinInviteNote || "Open this invite to request access.",
    });
  }, [
    compactInviteLink,
    joinSenderDisplayName,
    currentGmfnId,
    activeJoinCommunityName,
    joinInviteNote,
  ]);

  const joinEmailSubject = useMemo(() => {
    return buildGsnEmailSubject("join", activeCommunityName);
  }, [activeCommunityName]);

  const marketplaceEmailSubject = useMemo(() => {
    return buildGsnEmailSubject("marketplace", activeCommunityName);
  }, [activeCommunityName]);

  const marketplaceEmailMessage = useMemo(() => {
    if (!publicCommunityWorkspaceLink) return "";
    return buildGsnCommunityVerifyLinkMessage({
      communityName: activeCommunityName,
      communityId: activeCommunityId ? String(activeCommunityId) : "",
      status: "Ready",
      verifyLink: publicCommunityWorkspaceLink,
    });
  }, [activeCommunityName, activeCommunityId, publicCommunityWorkspaceLink]);

  const shopEmailSubject = useMemo(() => {
    return buildGsnEmailSubject("shop", activeCommunityName);
  }, [activeCommunityName]);

  const publicShopSocialLink = useMemo(() => {
    return (
      publicShopPosterLink ||
      (publicShopOwnerId || currentGmfnId
        ? publicShopShareUrl({ gmfnId: publicShopOwnerId || currentGmfnId })
        : publicShopViewLink)
    );
  }, [currentGmfnId, publicShopOwnerId, publicShopPosterLink, publicShopViewLink]);

  const publicShopSocialPreviewLink = useMemo(() => {
    return publicShopOwnerId || currentGmfnId
      ? publicShopSocialPreviewUrl({ gmfnId: publicShopOwnerId || currentGmfnId })
      : "";
  }, [currentGmfnId, publicShopOwnerId]);

  const publicShopSocialPackage = useMemo(() => {
    if (!publicShopSocialLink) return "";
    return buildGsnPublicShopLinkMessage({
      shopName: firstPublicIdentity(publicShopRecord?.name) || "Public GSN Shop",
      ownerName: memberName,
      gsnId: publicShopOwnerId || currentGmfnId,
      communityName: activeCommunityName,
      shopLink: publicShopSocialLink,
    });
  }, [
    activeCommunityName,
    currentGmfnId,
    memberName,
    publicShopOwnerId,
    publicShopRecord?.name,
    publicShopSocialLink,
  ]);

  const poolAmount = getPoolAmountText(poolInfo);
  const poolCurrency = getPoolCurrency(poolInfo);
  const visiblePoolAmount = safeStr(moneySurface?.poolAmount || poolAmount || "-");
  const visiblePoolCurrency = safeStr(
    moneySurface?.poolCurrency || poolCurrency || "NGN"
  );

  const communitySettlementReady = communityPayInReady(
    moneySurface?.communitySettlement || null
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

  const currentUserId = positiveNumber(
    firstDefined(me?.id, me?.user_id, me?.account_id)
  );

  const protectedTradeCounterpartOptions = useMemo(() => {
    return memberRows
      .filter((row) => positiveNumber(row.userId) > 0)
      .filter((row) => !currentUserId || row.userId !== currentUserId)
      .slice(0, 24);
  }, [currentUserId, memberRows]);

  const recentProtectedTrades = useMemo(() => {
    return protectedTrades.slice(0, isCompact ? 3 : 5);
  }, [isCompact, protectedTrades]);

  const selectedProtectedTradeNumericId = useMemo(() => {
    return (
      positiveNumber(selectedProtectedTradeId) ||
      positiveNumber(recentProtectedTrades[0]?.id)
    );
  }, [recentProtectedTrades, selectedProtectedTradeId]);

  const selectedProtectedTrade = useMemo(() => {
    const selectedId = selectedProtectedTradeNumericId;
    const summaryTrade =
      protectedTrades.find((trade) => positiveNumber(trade.id) === selectedId) ||
      recentProtectedTrades[0] ||
      null;
    const detailMatches =
      selectedProtectedTradeDetail &&
      positiveNumber(selectedProtectedTradeDetail.id) ===
        positiveNumber(summaryTrade?.id || selectedId);

    return detailMatches
      ? selectedProtectedTradeDetail
      : summaryTrade;
  }, [
    protectedTrades,
    recentProtectedTrades,
    selectedProtectedTradeDetail,
    selectedProtectedTradeNumericId,
  ]);

  const selectedProtectedTradeEvents = useMemo(() => {
    return Array.isArray(selectedProtectedTrade?.events)
      ? selectedProtectedTrade.events || []
      : [];
  }, [selectedProtectedTrade]);

  const recentProtectedTradeEvents = useMemo(() => {
    return selectedProtectedTradeEvents.slice(-4).reverse();
  }, [selectedProtectedTradeEvents]);

  const selectedProtectedTradeHasDetail =
    Boolean(selectedProtectedTrade?.id) &&
    positiveNumber(selectedProtectedTradeDetail?.id) ===
      positiveNumber(selectedProtectedTrade?.id);

  useEffect(() => {
    const tradeId = selectedProtectedTradeNumericId;
    if (!tradeId) {
      setSelectedProtectedTradeDetail(null);
      setLoadingProtectedTradeDetail(false);
      return;
    }

    let cancelled = false;
    setLoadingProtectedTradeDetail(true);
    getProtectedTrade(tradeId)
      .then((detail) => {
        if (cancelled) return;
        setSelectedProtectedTradeDetail(detail);
        setProtectedTrades((prev) =>
          prev.map((trade) =>
            positiveNumber(trade.id) === tradeId ? { ...trade, ...detail } : trade
          )
        );
      })
      .catch(() => {
        if (!cancelled) {
          setSelectedProtectedTradeDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProtectedTradeDetail(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedProtectedTradeNumericId]);

  const selectedProtectedTradeEventOption =
    PROTECTED_TRADE_EVENT_OPTIONS.find(
      (option) => option.value === protectedTradeEventType
    ) || PROTECTED_TRADE_EVENT_OPTIONS[0];

  const protectedTradeEvidencePaperText = useMemo(() => {
    if (!selectedProtectedTrade) return "";
    return buildProtectedTradeEvidencePaperText({
      trade: selectedProtectedTrade,
      community: selectedCommunity,
      communityLabel: activeCommunityName,
      generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      actionPath: routeWithCommunity(APP_ROUTES.MARKETPLACE, activeCommunityId),
    });
  }, [
    activeCommunityId,
    activeCommunityName,
    selectedCommunity,
    selectedProtectedTrade,
  ]);

  useEffect(() => {
    if (selectedProtectedTradeId) {
      const stillAvailable = protectedTrades.some(
        (trade) => positiveNumber(trade.id) === positiveNumber(selectedProtectedTradeId)
      );
      if (stillAvailable) return;
    }

    const firstId = positiveNumber(protectedTrades[0]?.id);
    setSelectedProtectedTradeId(firstId ? String(firstId) : "");
  }, [protectedTrades, selectedProtectedTradeId]);

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

  async function refreshProtectedTrades() {
    if (!activeCommunityId) return;
    setLoadingProtectedTrades(true);
    try {
      const rows = await listProtectedTrades({ limit: 30 });
      const visibleRows = rows
        .filter((item) => {
          const tradeClanId = Number(item?.clan_id || 0);
          return tradeClanId <= 0 || tradeClanId === activeCommunityId;
        })
        .slice(0, 8);
      const detailTradeId =
        positiveNumber(selectedProtectedTradeId) ||
        positiveNumber(visibleRows[0]?.id);
      let selectedDetail: ProtectedTradeRecord | null = null;
      if (detailTradeId) {
        try {
          selectedDetail = await getProtectedTrade(detailTradeId);
          setSelectedProtectedTradeDetail(selectedDetail);
        } catch {
          setSelectedProtectedTradeDetail(null);
        }
      } else {
        setSelectedProtectedTradeDetail(null);
      }
      setProtectedTrades(
        visibleRows.map((item) =>
          selectedDetail && positiveNumber(item.id) === detailTradeId
            ? { ...item, ...selectedDetail }
            : item
        )
      );
      showNotice("success", "Protected trade records refreshed.");
    } catch (err: any) {
      showNotice(
        "error",
        marketplaceErrorMessage(
          err,
          "Protected trade records could not load."
        )
      );
    } finally {
      setLoadingProtectedTrades(false);
    }
  }

  async function handleCreateProtectedTrade(
    event?: React.SyntheticEvent<HTMLElement>
  ) {
    consumeMarketplaceButtonEvent(event);

    if (!activeCommunityId) {
      showNotice("error", "Choose a community before starting protected trade.");
      return;
    }

    const counterpartUserId = positiveNumber(
      protectedTradeDraft.counterpartUserId
    );
    if (!counterpartUserId) {
      showNotice("error", "Choose the buyer or seller on the other side.");
      return;
    }

    const itemTitle = safeStr(protectedTradeDraft.itemTitle);
    if (!itemTitle) {
      showNotice("error", "Name the goods or service before recording trade.");
      return;
    }

    const termsSummary = safeStr(protectedTradeDraft.termsSummary);
    if (!termsSummary) {
      showNotice(
        "error",
        "Write the basic terms first so the record has useful evidence."
      );
      return;
    }

    setCreatingProtectedTrade(true);
    try {
      const isSeller = protectedTradeDraft.role === "seller";
      const created = await createProtectedTrade({
        clan_id: activeCommunityId,
        participant_role: protectedTradeDraft.role,
        seller_user_id: isSeller ? undefined : counterpartUserId,
        buyer_user_id: isSeller ? counterpartUserId : undefined,
        item_title: itemTitle,
        terms_summary: termsSummary,
        amount: safeStr(protectedTradeDraft.amount) || undefined,
        currency: safeStr(protectedTradeDraft.currency || "NGN").toUpperCase(),
        meta: {
          source: "marketplace_trusted_trade_lane",
          community_name: communityName(selectedCommunity),
          minimum_trade_packet: {
            trade_context: "gsn_gsn",
            evidence_packet_note: safeStr(protectedTradeDraft.evidencePacketNote) || null,
            conversation_system_of_record: "gsn_marketplace_or_parties",
            gsn_record_scope: "minimum_structured_evidence_packet",
            evidence_slots: {
              invoice_product_agreement_courier_payment: Boolean(
                safeStr(protectedTradeDraft.evidencePacketNote)
              ),
            },
            privacy_boundary:
              "Record only the final evidence references needed for judgement. Keep unnecessary private chat, addresses, bank details, and third-party details outside this record.",
          },
          boundary:
            "Non-custodial record only. Not escrow, not automatic payout, not a delivery guarantee.",
          minimum_trade_packet_enabled: true,
          not_escrow: true,
          not_money_custody: true,
          not_payout: true,
          not_bank_confirmation: true,
          not_delivery_guarantee: true,
          not_release_authority: true,
        },
      });

      setProtectedTrades((prev) => [created, ...prev].slice(0, 8));
      if (positiveNumber(created?.id)) {
        setSelectedProtectedTradeId(String(positiveNumber(created.id)));
      }
      setProtectedTradeDraft((prev) => ({
        ...prev,
        itemTitle: "",
        amount: "",
        termsSummary: "",
        evidencePacketNote: "",
      }));
      showNotice("success", "Protected trade record started.");
    } catch (err: any) {
      showNotice(
        "error",
        marketplaceErrorMessage(
          err,
          "Protected trade record could not be created."
        )
      );
    } finally {
      setCreatingProtectedTrade(false);
    }
  }

  async function handleRecordProtectedTradeEvent(
    event?: React.SyntheticEvent<HTMLElement>
  ) {
    consumeMarketplaceButtonEvent(event);

    const tradeId = positiveNumber(selectedProtectedTrade?.id);
    if (!tradeId) {
      showNotice("error", "Choose a protected trade record first.");
      return;
    }

    const note = safeStr(protectedTradeEventNote);
    if (!note) {
      showNotice(
        "error",
        "Add a short note so this trade update is useful evidence."
      );
      return;
    }

    setRecordingProtectedTradeEvent(true);
    try {
      await addProtectedTradeEvent(tradeId, {
        event_type: protectedTradeEventType,
        note,
        meta: {
          source: "marketplace_trusted_trade_lane",
          trade_code: selectedProtectedTrade?.trade_code || null,
          boundary:
            "Evidence update only. Not escrow, not automatic payout, not a bank guarantee, not a delivery guarantee.",
        },
      });

      const rows = await listProtectedTrades({ limit: 30 });
      const detail = await getProtectedTrade(tradeId);
      setSelectedProtectedTradeDetail(detail);
      setProtectedTrades(
        rows
          .filter((item) => {
            const tradeClanId = Number(item?.clan_id || 0);
            return tradeClanId <= 0 || tradeClanId === activeCommunityId;
          })
          .map((item) =>
            positiveNumber(item.id) === tradeId ? { ...item, ...detail } : item
          )
          .slice(0, 8)
      );
      setProtectedTradeEventNote("");
      showNotice("success", "Protected trade update recorded.");
    } catch (err: any) {
      showNotice(
        "error",
        marketplaceErrorMessage(
          err,
          "Protected trade update could not be recorded."
        )
      );
    } finally {
      setRecordingProtectedTradeEvent(false);
    }
  }

  const activeLoanCount = useMemo(() => {
    return loans.filter((item) => {
      const status = safeStr(item?.status).toLowerCase();
      return !FINAL_LOAN_STATUSES.has(status);
    }).length;
  }, [loans]);
  const localOwingTotal = useMemo(() => {
    return loans.reduce((sum, item) => {
      const status = safeStr(item?.status).toLowerCase();
      if (FINAL_LOAN_STATUSES.has(status)) return sum;

      const role = safeStr(item?.role).toLowerCase();
      if (role.includes("support") || role.includes("guarant")) return sum;
      const isBorrowerSide =
        role.includes("borrow") ||
        role.includes("request") ||
        role.includes("applicant") ||
        !safeStr(item?.guarantor_name);

      return isBorrowerSide ? sum + moneyNumber(item?.amount) : sum;
    }, 0);
  }, [loans]);
  const localPoolBalance = moneyNumber(moneySurface?.poolAmount || poolAmount);
  const localLockedGuaranteeTotal = moneyNumber(
    moneySurface?.guarantorExposure?.totalLocked
  );
  const currentGuaranteeEarningAmount = moneyNumber(
    firstDefined(
      (moneySurface?.guarantorExposure as any)?.currentEarning,
      (moneySurface?.guarantorExposure as any)?.current_earning,
      (moneySurface?.guarantorExposure as any)?.pendingEarning,
      (moneySurface?.guarantorExposure as any)?.pending_earning,
      (moneySurface?.guarantorExposure as any)?.activeEarning,
      (moneySurface?.guarantorExposure as any)?.active_earning,
      (moneySurface?.guarantorExposure as any)?.currentGuaranteeEarning,
      (moneySurface?.guarantorExposure as any)?.current_guarantee_earning,
      (moneySurface?.guarantorExposure as any)?.expectedEarning,
      (moneySurface?.guarantorExposure as any)?.expected_earning,
      (moneySurface as any)?.currentGuaranteeEarning,
      (moneySurface as any)?.current_guarantee_earning,
      (moneySurface as any)?.pendingGuaranteeEarning,
      (moneySurface as any)?.pending_guarantee_earning
    )
  );
  const currentGuaranteeEarningText =
    currentGuaranteeEarningAmount > 0
      ? financeText(currentGuaranteeEarningAmount, visiblePoolCurrency)
      : "Not shown yet";
  const localNetPosition =
    localPoolBalance - localOwingTotal - localLockedGuaranteeTotal;
  const marketplaceCciDisplay = marketplaceCciLabel(
    selectedCommunity,
    marketplaceTrust,
    me,
    trustSlip
  );
  const localFinanceStandingTone =
    localNetPosition > 0
      ? "Positive"
      : localNetPosition < 0
      ? "Owing"
      : "Balanced";

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

  const canManageMarketplaceLinks = Boolean(
    activeCommunityId &&
      (currentMemberRole ||
        positiveNumber(me?.id) ||
        safeStr(me?.gmfn_id) ||
        safeStr(me?.role).toLowerCase() === "admin")
  );
  const moneyRailManagerRoles = ["admin", "owner", "founder", "creator"];
  const isMarketplaceNoticeOfficer = Boolean(
    moneyRailManagerRoles.includes(safeStr(me?.role).toLowerCase()) ||
      moneyRailManagerRoles.includes(currentMemberRole)
  );
  const activeNoticePostingPolicy = normalizeNoticePostingPolicy(
    firstTruthy(marketplaceNoticePostingPolicy, selectedCommunity?.notice_posting_policy)
  );
  const canPostMarketplaceNotice = Boolean(
    activeCommunityId &&
      (activeNoticePostingPolicy === "members" || isMarketplaceNoticeOfficer)
  );
  const canManageMarketplaceNoticeSettings = Boolean(
    activeCommunityId && isMarketplaceNoticeOfficer
  );
  const canManagePayInAccount = Boolean(
    activeCommunityId &&
      (moneyRailManagerRoles.includes(safeStr(me?.role).toLowerCase()) ||
        moneyRailManagerRoles.includes(currentMemberRole))
  );
  const marketplaceJoinLinkMissingMessage = canManageMarketplaceLinks
    ? "GSN is preparing the reusable join link. Try again in a moment."
    : "Join links are available to active members after community selection.";
  const marketplaceJoinLinkGuidance = canManageMarketplaceLinks
    ? "Add the invite names and relationship evidence. GSN will prepare the reusable join link automatically."
    : "Select an active community first. Every join request still goes through community review.";
  const marketplaceJoinPreviewPendingMessage = canManageMarketplaceLinks
    ? "The join message preview appears after GSN prepares the reusable link."
    : "The invite message appears after the community is selected.";
  const marketplaceJoinRefreshBlockedMessage =
    "Select an active community before preparing a join link. Every request still goes through community review.";

  function updatePayInAccountDraft<K extends keyof PayInAccountDraft>(
    key: K,
    value: PayInAccountDraft[K]
  ) {
    setPayInAccountDraft((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function savePayInAccount() {
    if (!activeCommunityId || !canManagePayInAccount) {
      setNotice({
        tone: "error",
        text: "Only a community admin can save the pay-in account.",
      });
      return;
    }

    setSavingPayInAccount(true);
    try {
      const saved = await saveCommunityPayInSettlement({
        clanId: activeCommunityId,
        accountName: payInAccountDraft.accountName,
        bankName: payInAccountDraft.bankName,
        accountNumber: payInAccountDraft.accountNumber,
        sortCode: payInAccountDraft.sortCode,
        country: payInAccountDraft.country,
        currency: payInAccountDraft.currency,
        note: payInAccountDraft.note,
      });

      const refreshed = await getCommunityMoneySurface(
        activeCommunityId,
        currentGmfnId,
        firstTruthy(saved?.currency, moneySurface?.poolCurrency, "GBP")
      ).catch(() => null);

      if (refreshed) {
        setMoneySurface(refreshed);
      } else if (saved) {
        setMoneySurface((prev) =>
          prev
            ? {
                ...prev,
                communitySettlement: saved,
                depositRoute: prev.depositRoute
                  ? { ...prev.depositRoute, settlement: saved }
                  : prev.depositRoute,
              }
            : prev
        );
      }

      setPayInEditorOpen(false);
      setNotice({
        tone: "success",
        text: "Pay-in account saved for this marketplace.",
      });
    } catch {
      setNotice({
        tone: "error",
        text: "Pay-in account could not be saved.",
      });
    } finally {
      setSavingPayInAccount(false);
    }
  }

  const marketplaceTrustDisplay = marketplaceTrustLabel(
    selectedCommunity,
    marketplaceTrust,
    me,
    trustSlip
  );
  const marketplaceTrustEvidenceLabel =
    marketplaceTrustEventCount(marketplaceTrust, me, trustSlip);
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
  const latestRoscaPackagePayment =
    createdRoscaPackageInstruction || roscaPackage?.latest_payment || null;
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
    if (key === "support") {
      setSupportDeskMode("choices");
    }
    clearStaleMarketplaceHash(sectionId);
    scheduleMarketplaceSectionScroll(sectionId);
  }

  async function createRoscaYearlyInstruction() {
    if (!activeCommunityId) {
      showNotice("error", "Select a community first.");
      return;
    }
    if (roscaCyclesFeatureOff) {
      showNotice("error", roscaCyclesFeatureOffText);
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

      setCreatedRoscaPackageInstruction(result as ExpectedPaymentRecord);
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
        marketplaceErrorMessage(
          err,
          "ROSCA yearly payment request could not be created."
        )
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
    if (roscaCyclesFeatureOff) {
      showNotice("error", roscaCyclesFeatureOffText);
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
      showNotice(
        "error",
        marketplaceErrorMessage(err, "ROSCA cycle could not be started.")
      );
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
      showNotice(
        "error",
        marketplaceErrorMessage(err, "ROSCA payout could not be recorded.")
      );
    } finally {
      setRecordingRoscaPayoutKey(null);
    }
  }

  const handleCreateInviteLink = useCallback(async (opts?: {
    quiet?: boolean;
    force?: boolean;
  }): Promise<boolean> => {
    const quiet = Boolean(opts?.quiet);

    if (!opts?.force && joinInviteTrustReady) {
      if (!quiet) showNotice("success", "Reusable join link is ready.");
      return true;
    }

    if (!activeCommunityId) {
      if (!quiet) showNotice("error", "Select a community first.");
      return false;
    }

    if (creatingInviteLink) {
      if (!quiet) showNotice("error", "Join link preparation is already running.");
      return false;
    }

    if (!canManageMarketplaceLinks) {
      if (!quiet) showNotice("error", marketplaceJoinRefreshBlockedMessage);
      return false;
    }

    if (!safeStr(joinSenderDisplayName)) {
      if (!quiet) showNotice("error", "Add your sender name before preparing the join link.");
      return false;
    }

    if (!safeStr(joinRecipientName)) {
      if (!quiet) showNotice("error", "Add the receiver name before preparing the join link.");
      return false;
    }

    const relationshipType = safeStr(joinRelationshipType);
    const knownDuration = safeStr(joinKnownDuration);

    if (!relationshipType || !knownDuration) {
      if (!quiet) {
        showNotice(
          "error",
          "Add how you know this person and how long you have known them before preparing the join link."
        );
      }
      return false;
    }

    setCreatingInviteLink(true);

    try {
      const relationshipEvidence: ClanInviteRelationshipEvidencePayload = {
        evidence_source: "marketplace_join_invite",
        invitation_context: "existing_community_join_invite",
        relationship_type: relationshipType,
        known_duration: knownDuration,
        confidence_level: "declared_by_inviter",
        relationship_context: safeStr(joinRelationshipContext) || null,
      };
      const inviteRes = await createClanInvite(activeCommunityId, {
        relationship_evidence: relationshipEvidence,
      });
      const nextInviteLink = getInviteUrl(inviteRes);

      if (!nextInviteLink) {
        showNotice("error", "Invite link is not ready yet.");
        return false;
      }

      setInviteLink(nextInviteLink);
      setJoinRelationshipEvidenceRecordedKey(joinRelationshipEvidenceKey);
      const retiredCount = Number(inviteRes?.retired_live_invites || 0);
      if (!quiet) {
        showNotice(
          "success",
          retiredCount > 0
            ? "Reusable join invite prepared. The old live link stays harmless; copy this one from here."
            : "Reusable join invite prepared. Copy it from here."
        );
      }
      return true;
    } catch (err: any) {
      showNotice(
        "error",
        marketplaceErrorMessage(
          err,
          "GSN could not prepare the join link yet. Please try again."
        )
      );
      return false;
    } finally {
      setCreatingInviteLink(false);
    }
  }, [
    activeCommunityId,
    canManageMarketplaceLinks,
    creatingInviteLink,
    joinInviteTrustReady,
    joinKnownDuration,
    joinRecipientName,
    joinRelationshipContext,
    joinRelationshipEvidenceKey,
    joinRelationshipType,
    joinSenderDisplayName,
    marketplaceJoinRefreshBlockedMessage,
    showNotice,
  ]);

  useEffect(() => {
    if (!activeCommunityId) return;

    const draftKey = joinInviteDraftStorageKey(activeCommunityId);
    if (joinInviteDraftRestoredKeyRef.current === draftKey) return;

    joinInviteDraftRestoredKeyRef.current = draftKey;
    const draft = readLocalJSON<{
      senderName?: string;
      recipientName?: string;
      inviteNote?: string;
      relationshipType?: string;
      knownDuration?: string;
      relationshipContext?: string;
    } | null>(draftKey, null);

    if (!draft) return;

    const hasDraftValue = [
      draft.senderName,
      draft.recipientName,
      draft.inviteNote,
      draft.relationshipType,
      draft.knownDuration,
      draft.relationshipContext,
    ].some((value) => safeStr(value));

    if (!hasDraftValue) return;

    if (!safeStr(joinSenderName)) setJoinSenderName(safeStr(draft.senderName));
    if (!safeStr(joinRecipientName)) setJoinRecipientName(safeStr(draft.recipientName));
    if (!safeStr(joinInviteNote)) setJoinInviteNote(safeStr(draft.inviteNote));
    if (!safeStr(joinRelationshipType)) {
      setJoinRelationshipType(safeStr(draft.relationshipType));
    }
    if (!safeStr(joinKnownDuration)) {
      setJoinKnownDuration(safeStr(draft.knownDuration));
    }
    if (!safeStr(joinRelationshipContext)) {
      setJoinRelationshipContext(safeStr(draft.relationshipContext));
    }
    setActiveLinkCenterTool("join");
  }, [
    activeCommunityId,
    joinInviteNote,
    joinKnownDuration,
    joinRecipientName,
    joinRelationshipContext,
    joinRelationshipType,
    joinSenderName,
  ]);

  useEffect(() => {
    if (!activeCommunityId) return;

    const hasDraftValue = [
      joinSenderName,
      joinRecipientName,
      joinInviteNote,
      joinRelationshipType,
      joinKnownDuration,
      joinRelationshipContext,
    ].some((value) => safeStr(value));

    if (!hasDraftValue) return;

    writeLocalJSON(joinInviteDraftStorageKey(activeCommunityId), {
      senderName: joinSenderName,
      recipientName: joinRecipientName,
      inviteNote: joinInviteNote,
      relationshipType: joinRelationshipType,
      knownDuration: joinKnownDuration,
      relationshipContext: joinRelationshipContext,
      updatedAt: new Date().toISOString(),
    });
  }, [
    activeCommunityId,
    joinInviteNote,
    joinKnownDuration,
    joinRecipientName,
    joinRelationshipContext,
    joinRelationshipType,
    joinSenderName,
  ]);

  useEffect(() => {
    if (activeLinkCenterTool !== "join") return;
    if (!activeCommunityId || !canManageMarketplaceLinks || creatingInviteLink) return;
    if (!joinSenderReady || !joinRecipientReady || !joinRelationshipReady) return;
    if (!joinRelationshipEvidenceKey) return;
    if (
      inviteLink &&
      joinRelationshipEvidenceRecordedKey === joinRelationshipEvidenceKey
    ) {
      return;
    }

    const autoPrepareKey = [
      activeCommunityId,
      joinRelationshipEvidenceKey,
    ].join("|");
    if (joinInviteAutoPrepareKeyRef.current === autoPrepareKey) return;

    joinInviteAutoPrepareKeyRef.current = autoPrepareKey;
    const timer = window.setTimeout(() => {
      void handleCreateInviteLink({ quiet: true }).then((ok) => {
        if (!ok && joinInviteAutoPrepareKeyRef.current === autoPrepareKey) {
          joinInviteAutoPrepareKeyRef.current = "";
        }
      });
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [
    activeCommunityId,
    activeLinkCenterTool,
    canManageMarketplaceLinks,
    creatingInviteLink,
    handleCreateInviteLink,
    inviteLink,
    joinInviteAutoPrepareKeyRef,
    joinRecipientReady,
    joinRelationshipEvidenceKey,
    joinRelationshipEvidenceRecordedKey,
    joinRelationshipReady,
    joinSenderReady,
  ]);

  function requireJoinInviteTrustEvidence(): boolean {
    if (!joinSenderReady) {
      showNotice("error", "Add your sender name before sending the invite.");
      return false;
    }

    if (!joinRecipientReady) {
      showNotice("error", "Add the receiver name before sending the invite.");
      return false;
    }

    if (!joinRelationshipReady) {
      showNotice(
        "error",
        "Add how you know this person and how long you have known them before sending the invite."
      );
      return false;
    }

    if (!inviteLink) {
      showNotice(
        "error",
        "GSN is preparing the join link. Use Prepare Link first if this takes too long."
      );
      return false;
    }

    return true;
  }

  async function copyJoinInviteMessage() {
    if (!requireJoinInviteTrustEvidence()) return;

    const message = safeStr(joinInviteDoorwayMessage);
    if (!message || !personalizedInviteLink) {
      showNotice("error", marketplaceJoinLinkMissingMessage);
      return;
    }

    const copied = await safeCopy(message);
    if (copied) {
      setJoinInviteManualCopyMessage("");
      showNotice("success", "GSN join invite message copied.");
      return;
    }

    setJoinInviteManualCopyMessage(message);
    showNotice(
      "error",
      "Clipboard copy was blocked. The invite text is shown below so you can still send it."
    );
  }

  async function copyMarketplaceLink(
    url: string,
    successText: string,
    missingText: string,
    packageText?: string
  ) {
    if (!url) {
      showNotice("error", missingText);
      return;
    }

    const copied = await safeCopy(safeStr(packageText) || url);
    showNotice(
      copied ? "success" : "error",
      copied
        ? successText
        : "Clipboard copy was blocked. The old clipboard may still contain another app page."
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
      if (/^https:\/\/wa\.me\//i.test(url)) {
        showNotice("success", "Opening WhatsApp now.");
        window.location.href = url;
        return;
      }

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
      showNotice("error", "Enter a valid support amount.");
      return;
    }

    if (!durationDays) {
      showNotice("error", "Enter how long you need the support for.");
      return;
    }

    if (!safeStr(loanRepaymentCadence)) {
      showNotice("error", "Choose how you plan to repay.");
      return;
    }

    if (!safeStr(loanPurpose)) {
      showNotice("error", "State what the support is for.");
      return;
    }

    setStartingLoanDraft(true);

    try {
      const createRes = await createLoanRequest({
        amount,
        currency: poolCurrency,
        clan_id: activeCommunityId,
        duration_days: durationDays,
        repayment_cadence: safeStr(loanRepaymentCadence),
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
      setSupportDeskMode("loan");

      showNotice(
        "success",
        "Support request created. Review fit suggestions, choose supporters, then send requests."
      );
    } catch (err: any) {
      showNotice(
        "error",
        marketplaceErrorMessage(err, "Support request could not be started.")
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
          "No fit supporter suggestion is available for this amount right now."
        );
      } else {
        showNotice("success", "Fit suggestions refreshed.");
      }
    } catch (err: any) {
      showNotice(
        "error",
        marketplaceErrorMessage(err, "Suggestions could not be refreshed.")
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
      showNotice("error", "This support draft does not currently need supporters.");
      return;
    }

    if (selectedSupporters.length < requiredGuarantorCount) {
      showNotice(
        "error",
        `Select ${requiredGuarantorCount} supporter${
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
            `Selected supporter '${guarantor.name}' does not have a usable user ID for request delivery.`
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
        "Support requests sent successfully. Wait for responses."
      );
    } catch (err: any) {
      showNotice(
        "error",
        marketplaceErrorMessage(err, "Support requests could not be sent.")
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
        marketplaceErrorMessage(err, "Support draft could not be cancelled.")
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
  const agreementAmount = positiveNumber(loanDraftSummary?.amount || loanAmount);
  const agreementDurationDays = positiveNumber(loanDurationDays);
  const feePreview = supportFeePreview(agreementAmount, requiredGuarantorCount);
  const agreementServiceFee = safeStr(loanDraftSummary?.service_fee || feePreview.fee);
  const agreementNetAmount = safeStr(
    loanDraftSummary?.net_disbursed_amount || feePreview.net
  );
  const agreementDueAt = safeStr(loanDraftSummary?.due_at)
    ? safeDateTime(loanDraftSummary?.due_at)
    : supportDueDateLabel(agreementDurationDays);
  const agreementRepaymentCadence = supportCadenceLabel(loanRepaymentCadence);
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
      ? "Support is not complete yet. Choose another fit supporter, send the next request, or cancel the draft if it should stop."
      : loanStatusLower === "approved"
      ? "Support is approved. Finance/admin still prepares the withdrawal instruction before money moves."
      : loanDraftId
      ? "Support is open. Keep the draft, suggestions, selected supporters, and next response together here."
      : "Start one support request first. After it starts, GSN will show the next required response in this same lane.";
  const supportLoanDeskOpen =
    sectionsOpen.support &&
    (supportDeskMode === "loan" || hasMoneyOutSupportTask || Boolean(loanDraftId));

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
  const marketplaceStats = [
    {
      label: "Members",
      value: `${members.length}`,
      detail: members.length === 1 ? "Visible member" : "Visible members",
      glyph: "members" as MarketplaceGlyphName,
      tone: "linear-gradient(180deg, #D7A22D 0%, #805A0F 100%)",
    },
    {
      label: "Shops",
      value: `${shops.length}`,
      detail: shops.length === 1 ? "Public shop" : "Public shops",
      glyph: "shop" as MarketplaceGlyphName,
      tone: "linear-gradient(180deg, #0B63D1 0%, #08264B 100%)",
    },
    {
      label: "Trust",
      value: marketplaceTrustDisplay,
      detail: marketplaceTrustEvidenceLabel,
      glyph: "trust" as MarketplaceGlyphName,
      tone: "linear-gradient(180deg, #25A65A 0%, #0B5A34 100%)",
    },
    {
      label: "CCI",
      value: marketplaceCciDisplay,
      detail: "Local integrity signal",
      glyph: "chart" as MarketplaceGlyphName,
      tone: "linear-gradient(180deg, #B98921 0%, #6E4B08 100%)",
    },
  ];
  const marketplaceFinanceSummaryValue =
    moneySurface || visiblePoolAmount !== "-"
      ? signedFinanceText(localNetPosition, visiblePoolCurrency)
      : communityFinanceLabel(selectedCommunity);
  function showGuarantorRequestBlockedNotice() {
    if (sendingGuarantorRequests) {
      showNotice("error", "GSN is already sending these support requests.");
      return;
    }

    if (requiredGuarantorCount <= 0) {
      showNotice(
        "error",
        "Start or refresh the support draft first so GSN can show how many supporters are needed."
      );
      return;
    }

    if (visibleSelectedSupporters.length < requiredGuarantorCount) {
      showNotice(
        "error",
        `Choose ${requiredGuarantorCount} supporter${
          requiredGuarantorCount === 1 ? "" : "s"
        } before sending requests.`
      );
      return;
    }

    if (!supportDraftStillOpen || loanStatusLower === "approved") {
      showNotice(
        "error",
        "This support draft is no longer open for support requests."
      );
      return;
    }

    showNotice(
      "error",
      "This support request step is not ready yet. Check the draft status first."
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
        {notice ? (
          <MarketplaceNoticeToast
            isCompact={isCompact}
            notice={notice}
            onClose={() => setNotice(null)}
          />
        ) : null}

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
      {notice ? (
        <MarketplaceNoticeToast
          isCompact={isCompact}
          notice={notice}
          onClose={() => setNotice(null)}
        />
      ) : null}

      <CommunityNoticeModal
        open={marketplaceNoticeModalOpen}
        communityName={activeCommunityName}
        busy={marketplaceNoticePosting}
        postingPolicy={activeNoticePostingPolicy}
        onClose={() => setMarketplaceNoticeModalOpen(false)}
        onSubmit={submitMarketplaceNotice}
      />

      <section style={marketplaceOsSectionStyle(isCompact)}>
        <div style={marketplaceHeroShellStyle(isCompact)}>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              right: isCompact ? -48 : -28,
              top: isCompact ? -18 : -34,
              width: isCompact ? 180 : 260,
              height: isCompact ? 180 : 260,
              borderRadius: 999,
              border: "1px solid rgba(220,235,255,0.14)",
              background:
                "repeating-linear-gradient(140deg, rgba(220,235,255,0.12) 0 1px, transparent 1px 18px)",
              opacity: 0.72,
            }}
          />
          <div style={marketplaceHeroIdentityStyle(isCompact)}>
            <div style={marketplaceHeroImageShellStyle(isCompact)}>
              {marketplaceHeroImageSrc ? (
                <img
                  src={marketplaceHeroImageSrc}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <MarketplaceGlyph name="shop" size={isCompact ? 44 : 58} />
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={marketplaceHeroPillStyle("market")}>MARKETPLACE</div>
              <div style={{ marginTop: 8, ...marketplaceHeroTitleStyle(isCompact) }}>
                {activeCommunityName}
              </div>
              <div
                style={{
                  marginTop: 7,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <span style={marketplaceHeroPillStyle("id")}>
                  {communityIdentity(selectedCommunity)}
                </span>
                <span style={marketplaceHeroPillStyle("status")}>
                  <MarketplaceGlyph name="verify" size={14} />
                  Active
                </span>
              </div>
              <div
                style={{
                  marginTop: 8,
                  color: "rgba(244,249,255,0.88)",
                  fontSize: isCompact ? 12.5 : 14,
                  fontWeight: 850,
                  lineHeight: 1.35,
                }}
              >
                Trade. Finance. Members. Records.
              </div>
            </div>

            {!isCompact ? (
              <div
                aria-hidden="true"
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 22,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.16)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
                }}
              >
                <GSNBrandMark width={46} height={58} />
              </div>
            ) : null}
          </div>

          <div style={marketplaceHeroStatsStyle(isCompact)}>
            {marketplaceStats.map((item) => (
              <div key={item.label} style={marketplaceHeroStatCellStyle(isCompact)}>
                <span
                  aria-hidden="true"
                  style={marketplaceFrontLaneIconStyle(item.tone, true)}
                >
                  <MarketplaceGlyph name={item.glyph} size={24} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      color: "#4A6178",
                      fontSize: 10.5,
                      fontWeight: 950,
                      textTransform: "uppercase",
                      lineHeight: 1.05,
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      display: "block",
                      marginTop: 3,
                      color: "#07172C",
                      fontSize: isCompact ? 20 : 24,
                      fontWeight: 950,
                      lineHeight: 1.05,
                    }}
                  >
                    {item.value}
                  </span>
                  <span
                    style={{
                      display: "block",
                      marginTop: 2,
                      color: "#617085",
                      fontSize: 11,
                      fontWeight: 800,
                      lineHeight: 1.15,
                    }}
                  >
                    {item.detail}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={marketplaceFrontLaneGridStyle(isCompact)}>
          <StableButton
            type="button"
            debugId="marketplace.tile.money"
            aria-label="Open Money and trust tools for this marketplace"
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
              <MarketplaceGlyph name="pool" size={isCompact ? 26 : 34} />
            </span>
            <span style={marketplaceOsRowTextStackStyle()}>
              <span style={marketplaceOsRowTitleStyle(isCompact)}>
                Money & Trust
              </span>
              <span style={marketplaceOsRowDetailStyle(isCompact)}>
                Local money pages and standing.
              </span>
              {!isCompact ? (
              <span style={marketplaceFrontTagRowStyle(isCompact)}>
                <span style={marketplaceFrontTagStyle("#0B4EA2", "#E7F1FE", isCompact)}>
                  Finance
                </span>
                <span style={marketplaceFrontTagStyle("#0B4EA2", "#E7F1FE", isCompact)}>
                  Money In
                </span>
                <span style={marketplaceFrontTagStyle("#0B4EA2", "#E7F1FE", isCompact)}>
                  Money Out
                </span>
                <span style={marketplaceFrontTagStyle("#0B4EA2", "#E7F1FE", isCompact)}>
                  Trust
                </span>
              </span>
              ) : null}
            </span>
            <span aria-hidden="true" style={marketplaceOsArrowStyle()}>
              <MarketplaceGlyph name="chevron" size={18} />
            </span>
          </StableButton>

          <StableButton
            type="button"
            debugId="marketplace.tile.members"
            aria-label="Open community domains, members, and shops"
            onClick={(event) =>
              openMarketplaceSection(event, "members", "marketplace-members-shops")
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
              <MarketplaceGlyph name="trade" size={isCompact ? 26 : 34} />
            </span>
            <span style={marketplaceOsRowTextStackStyle()}>
              <span style={marketplaceOsRowTitleStyle(isCompact)}>
                Community Members & Shops
              </span>
              <span style={marketplaceOsRowDetailStyle(isCompact)}>
                Domains, known members, and public shops.
              </span>
              {!isCompact ? (
              <span style={marketplaceFrontTagRowStyle(isCompact)}>
                <span style={marketplaceFrontTagStyle("#805A0F", "#F7EED8", isCompact)}>
                  Domains
                </span>
                <span style={marketplaceFrontTagStyle("#805A0F", "#F7EED8", isCompact)}>
                  Public Shops
                </span>
                <span style={marketplaceFrontTagStyle("#805A0F", "#F7EED8", isCompact)}>
                  Members
                </span>
              </span>
              ) : null}
            </span>
            <span aria-hidden="true" style={marketplaceOsArrowStyle()}>
              <MarketplaceGlyph name="chevron" size={18} />
            </span>
          </StableButton>

          <StableButton
            type="button"
            debugId="marketplace.row.records-links"
            aria-label="Open marketplace tools, access and public links"
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
              <MarketplaceGlyph name="links" size={isCompact ? 26 : 34} />
            </span>
            <span style={marketplaceOsRowTextStackStyle()}>
              <span style={marketplaceOsRowTitleStyle(isCompact)}>
                Marketplace Tools
              </span>
              <span style={marketplaceOsRowDetailStyle(isCompact)}>
                Access, public links, and helper tools.
              </span>
              {!isCompact ? (
              <span style={marketplaceFrontTagRowStyle(isCompact)}>
                <span style={marketplaceFrontTagStyle("#075064", "#E3F5F8", isCompact)}>
                  Verify
                </span>
                <span style={marketplaceFrontTagStyle("#075064", "#E3F5F8", isCompact)}>
                  Invite
                </span>
                <span style={marketplaceFrontTagStyle("#075064", "#E3F5F8", isCompact)}>
                  Create
                </span>
                <span style={marketplaceFrontTagStyle("#075064", "#E3F5F8", isCompact)}>
                  Shop Face
                </span>
              </span>
              ) : null}
            </span>
            <span aria-hidden="true" style={marketplaceOsArrowStyle()}>
              <MarketplaceGlyph name="chevron" size={18} />
            </span>
          </StableButton>

          <StableButton
            type="button"
            debugId="marketplace.tile.official-board"
            aria-label="Open the official community board for this marketplace"
            onClick={(event) =>
              openMarketplaceSection(event, "board", "marketplace-official-board")
            }
            style={marketplaceFrontLaneCardStyle(isCompact)}
          >
            <span
              aria-hidden="true"
              style={marketplaceFrontLaneIconStyle(
                "linear-gradient(180deg, #244969 0%, #061827 100%)",
                isCompact
              )}
            >
              <MarketplaceGlyph name="notice" size={isCompact ? 26 : 34} />
            </span>
            <span style={marketplaceOsRowTextStackStyle()}>
              <span style={marketplaceOsRowTitleStyle(isCompact)}>
                Official Board
              </span>
              <span style={marketplaceOsRowDetailStyle(isCompact)}>
                Notices stay inside this selected marketplace.
              </span>
              {!isCompact ? (
              <span style={marketplaceFrontTagRowStyle(isCompact)}>
                <span style={marketplaceFrontTagStyle("#173750", "#EEF3F7", isCompact)}>
                  This marketplace
                </span>
                <span style={marketplaceFrontTagStyle("#173750", "#EEF3F7", isCompact)}>
                  Members only
                </span>
                <span style={marketplaceFrontTagStyle("#173750", "#EEF3F7", isCompact)}>
                  No broadcast
                </span>
              </span>
              ) : null}
            </span>
            <span aria-hidden="true" style={marketplaceOsArrowStyle()}>
              <MarketplaceGlyph name="chevron" size={18} />
            </span>
          </StableButton>

          <StableButton
            type="button"
            debugId="marketplace.tile.support"
            aria-label="Open Support for this marketplace"
            onClick={(event) =>
              openMarketplaceSection(event, "support", "marketplace-loans-support")
            }
            style={marketplaceFrontLaneCardStyle(isCompact)}
          >
            <span
              aria-hidden="true"
              style={marketplaceFrontLaneIconStyle(
                "linear-gradient(180deg, #1D6D46 0%, #0B3323 100%)",
                isCompact
              )}
            >
              <MarketplaceGlyph name="support" size={isCompact ? 26 : 34} />
            </span>
            <span style={marketplaceOsRowTextStackStyle()}>
              <span style={marketplaceOsRowTitleStyle(isCompact)}>
                Support
              </span>
              <span style={marketplaceOsRowDetailStyle(isCompact)}>
                Ask for backing when balance is not enough.
              </span>
              {!isCompact ? (
              <span style={marketplaceFrontTagRowStyle(isCompact)}>
                <span style={marketplaceFrontTagStyle("#1D6D46", "#E5F4EC", isCompact)}>
                  Start Request
                </span>
                <span style={marketplaceFrontTagStyle("#1D6D46", "#E5F4EC", isCompact)}>
                  Supporters
                </span>
                <span style={marketplaceFrontTagStyle("#1D6D46", "#E5F4EC", isCompact)}>
                  Repayment
                </span>
              </span>
              ) : null}
            </span>
            <span aria-hidden="true" style={marketplaceOsArrowStyle()}>
              <MarketplaceGlyph name="chevron" size={18} />
            </span>
          </StableButton>

          <StableButton
            type="button"
            debugId="marketplace.tile.marketing-tools"
            aria-label="Open Marketing Tools for this marketplace"
            onClick={(event) => {
              openMarketplaceSection(event, "tools", "marketplace-owned-links");
              setActiveLinkCenterTool("repost");
            }}
            style={marketplaceFrontLaneCardStyle(isCompact)}
          >
            <span
              aria-hidden="true"
              style={marketplaceFrontLaneIconStyle(
                "linear-gradient(180deg, #D7A22D 0%, #805A0F 100%)",
                isCompact
              )}
            >
              <MarketplaceGlyph name="repost" size={isCompact ? 26 : 34} />
            </span>
            <span style={marketplaceOsRowTextStackStyle()}>
              <span style={marketplaceOsRowTitleStyle(isCompact)}>
                Marketing Tools
              </span>
              <span style={marketplaceOsRowDetailStyle(isCompact)}>
                Repost, Spotlight, and trade evidence.
              </span>
              {!isCompact ? (
              <span style={marketplaceFrontTagRowStyle(isCompact)}>
                <span style={marketplaceFrontTagStyle("#805A0F", "#F7EED8", isCompact)}>
                  Repost
                </span>
                <span style={marketplaceFrontTagStyle("#805A0F", "#F7EED8", isCompact)}>
                  Free Spotlight
                </span>
                <span style={marketplaceFrontTagStyle("#805A0F", "#F7EED8", isCompact)}>
                  Subscription Spotlight
                </span>
                <span style={marketplaceFrontTagStyle("#173750", "#EEF3F7", isCompact)}>
                  Evidence
                </span>
              </span>
              ) : null}
            </span>
            <span aria-hidden="true" style={marketplaceOsArrowStyle()}>
              <MarketplaceGlyph name="chevron" size={18} />
            </span>
          </StableButton>
        </div>

        <div
          style={{
            marginTop: 14,
            borderRadius: 18,
            border: "1px solid rgba(11,99,209,0.14)",
            background:
              "linear-gradient(180deg, rgba(240,247,255,0.98) 0%, rgba(229,240,250,0.96) 100%)",
            padding: isCompact ? "11px 12px" : "12px 14px",
            display: "grid",
            gridTemplateColumns: isCompact
              ? "40px minmax(0, 1fr)"
              : "44px minmax(0, 1fr) repeat(3, minmax(120px, 1fr))",
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
          {!isCompact
            ? [
                ["Marketplace type", "Standard"],
                ["Owner", canManageMarketplaceLinks ? "Admin" : "Member"],
                ["Member since", "Active"],
              ].map(([label, value]) => (
                <div key={label} style={{ minWidth: 0 }}>
                  <div style={{ ...sectionLabel(), color: "#617085" }}>
                    {label}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      color: "#07172C",
                      fontSize: 14,
                      fontWeight: 950,
                      lineHeight: 1.15,
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))
            : null}
        </div>

        <div style={marketplaceFrontSummaryGridStyle(isCompact)}>
          <div style={marketplaceFrontSummaryCardStyle(isCompact)}>
            <div style={{ ...sectionLabel(), color: "#0B6B3B" }}>
              Finance Summary
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#0B6B3B",
                fontSize: isCompact ? 22 : 28,
                fontWeight: 950,
                lineHeight: 1.05,
                overflowWrap: "anywhere",
              }}
            >
              {marketplaceFinanceSummaryValue}
            </div>
            <div style={{ marginTop: 8, ...helperText(), fontSize: 12.5 }}>
              Your local net position inside this marketplace.
            </div>
            <div style={{ marginTop: 10, ...marketplaceFrontTagRowStyle(isCompact) }}>
              <span style={marketplaceFrontTagStyle("#0B6B3B", "#DFF3E8", isCompact)}>
                Net position
              </span>
              <span style={marketplaceFrontTagStyle("#0B6B3B", "#DFF3E8", isCompact)}>
                {localFinanceStandingTone}
              </span>
            </div>
            <details
              style={{
                marginTop: 10,
                borderTop: "1px solid rgba(11,107,59,0.12)",
                paddingTop: 10,
              }}
            >
              <StableDisclosureSummary
                debugId="marketplace.finance-standing.details"
                stableHeight={34}
                style={{
                  color: "#0B6B3B",
                  fontSize: 13,
                  fontWeight: 950,
                }}
              >
                Finance details
              </StableDisclosureSummary>
              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "repeat(4, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                {[
                  [
                    "Pool balance",
                    financeText(localPoolBalance, visiblePoolCurrency),
                  ],
                  ["Owing total", financeText(localOwingTotal, visiblePoolCurrency)],
                  [
                    "Locked by guarantees",
                    financeText(localLockedGuaranteeTotal, visiblePoolCurrency),
                  ],
                  ["Current guarantee earning", currentGuaranteeEarningText],
                ].map(([label, value]) => (
                  <div key={label} style={marketplaceProfileStatStyle()}>
                    <div style={{ ...sectionLabel(), fontSize: 10 }}>{label}</div>
                    <div
                      style={{
                        marginTop: 5,
                        color: "#07172C",
                        fontSize: 13,
                        fontWeight: 950,
                        lineHeight: 1.2,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 12 }}>
                These figures are scoped to this selected marketplace. Current
                guarantee earning appears only when the finance record exposes
                a current or pending earning amount.
              </div>
            </details>
          </div>
        </div>

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
                  placeholder="Try: trust, identity, evidence, messages..."
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
      </section>

      {sectionsOpen.board || sectionsTouched.board ? (
      <section
        id="marketplace-official-board"
        style={{
          ...pageCard("#FFFFFF"),
          ...marketplaceSectionStyle(),
          order: 4,
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
                "linear-gradient(180deg, #244969 0%, #061827 100%)",
                true
              )}
            >
              <MarketplaceGlyph name="notice" size={26} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={sectionLabel()}>Official Board</div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Official notices for this selected marketplace/community only.
                They are not broadcast to your other marketplaces, other
                communities, or public visitors.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(Boolean(activeCommunityId))}>
              {activeCommunityName || "Select marketplace"}
            </span>
            {canPostMarketplaceNotice ? (
              <StableButton
                debugId="marketplace.board.post"
                type="button"
                onClick={(event) =>
                  runMarketplaceAction(event, () => setMarketplaceNoticeModalOpen(true))
                }
                style={marketplaceActionStyle("secondary")}
              >
                Post announcement
              </StableButton>
            ) : null}
            {canManageMarketplaceNoticeSettings ? (
              <>
                <StableButton
                  debugId="marketplace.board.policy.members"
                  type="button"
                  onClick={(event) =>
                    updateMarketplaceNoticePolicy(event, "members")
                  }
                  style={marketplaceActionStyle(
                    activeNoticePostingPolicy === "members" ? "secondary" : "soft",
                    marketplaceNoticeSettingsSaving
                  )}
                >
                  Open to members
                </StableButton>
                <StableButton
                  debugId="marketplace.board.policy.admins"
                  type="button"
                  onClick={(event) =>
                    updateMarketplaceNoticePolicy(event, "admins")
                  }
                  style={marketplaceActionStyle(
                    activeNoticePostingPolicy === "admins" ? "secondary" : "soft",
                    marketplaceNoticeSettingsSaving
                  )}
                >
                  Admin only
                </StableButton>
              </>
            ) : null}
            <StableButton
              debugId="marketplace.board.toggle"
              type="button"
              onClick={(event) => toggleSectionFromButton(event, "board")}
              style={marketplaceActionStyle("soft")}
            >
              {sectionsOpen.board ? "Collapse" : "Open"}
            </StableButton>
          </div>
        </div>

        {sectionsOpen.board ? (
          <div
            {...marketplaceSurfaceTouchProps("marketplace.board.module")}
            style={{
              ...marketplaceDepartmentShellStyle("neutral", isCompact),
              marginTop: 14,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
                gap: 12,
                alignItems: "start",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={sectionLabel()}>Community notice board</div>
                <div style={{ marginTop: 6, ...helperText(), fontSize: 13 }}>
                  {activeNoticePostingPolicy === "members"
                    ? "Open board: active members can post short announcements. GSN links the sender's verified public WhatsApp contact when they have chosen to show one."
                    : "Admin-only board: only community officers can post new announcements."}
                </div>
              </div>
              <span style={stableStatusPillStyle(!marketplaceNoticesLoading)}>
                {marketplaceNoticesLoading
                  ? "Loading"
                  : `${marketplaceNotices.length} visible`}
              </span>
            </div>

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gap: 10,
              }}
            >
              {marketplaceNoticesLoading ? (
                <div style={{ ...helperText(), fontSize: 13 }}>
                  Loading official marketplace notices.
                </div>
              ) : marketplaceNotices.length ? (
                marketplaceNotices.map((item, index) => {
                  const title = wordLimit(
                    firstTruthy(item?.body, item?.title, item?.purpose),
                    50
                  );
                  const when = safeDateLabel(
                    item?.created_at || item?.scheduled_at
                  );
                  const expiry = noticeExpiryLabel(item);
                  const key = firstTruthy(
                    item?.notice_id,
                    item?.meeting_id,
                    item?.created_at,
                    item?.scheduled_at,
                    index
                  );

                  return (
                    <div
                      key={key}
                      style={{
                        borderRadius: 16,
                        border: "1px solid rgba(23,55,80,0.12)",
                        background: "#FFFFFF",
                        padding: isCompact ? 12 : 14,
                        boxShadow: "0 10px 22px rgba(10,24,49,0.06)",
                      }}
                    >
                      <div
                        style={{
                          color: "#07172C",
                          fontSize: isCompact ? 14 : 15,
                          fontWeight: 950,
                          lineHeight: 1.3,
                          overflowWrap: "break-word",
                        }}
                      >
                        {title || "Official marketplace notice"}
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={marketplaceFrontTagStyle("#173750", "#EEF3F7", isCompact)}>
                          Newest first
                        </span>
                        {when ? (
                          <span style={marketplaceFrontTagStyle("#617085", "#F3F6FA", isCompact)}>
                            {when}
                          </span>
                        ) : null}
                        {expiry ? (
                          <span style={marketplaceFrontTagStyle("#617085", "#F3F6FA", isCompact)}>
                            {expiry}
                          </span>
                        ) : null}
                        <span style={marketplaceFrontTagStyle("#27435F", "#F3F6FA", isCompact)}>
                          {item?.sender_whatsapp_number
                            ? `WhatsApp: ${firstTruthy(item?.sender_whatsapp_label, "sender")}`
                            : "No sender WhatsApp"}
                        </span>
                      </div>
                      {item?.sender_whatsapp_number ? (
                        <div style={{ marginTop: 8 }}>
                          <StableButton
                            debugId={`marketplace.board.sender-whatsapp.${item?.notice_id || index}`}
                            type="button"
                            onClick={(event) =>
                              openMarketplaceNoticeSenderWhatsApp(event, item)
                            }
                            style={marketplaceActionStyle("soft")}
                          >
                            Message sender
                          </StableButton>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    borderRadius: 16,
                    border: "1px solid rgba(23,55,80,0.12)",
                    background: "#FFFFFF",
                    padding: isCompact ? 12 : 14,
                  }}
                >
                  <div
                    style={{
                      color: "#07172C",
                      fontSize: 14,
                      fontWeight: 950,
                      lineHeight: 1.3,
                    }}
                  >
                    No official notices yet.
                  </div>
                  <div style={{ marginTop: 6, ...helperText(), fontSize: 13 }}>
                    When members or community officers post for this
                    marketplace, members of this marketplace see it here.
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </section>
      ) : null}

      {sectionsOpen.money || sectionsTouched.money ? (
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
                Money In / Pool
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
                Pay into this marketplace pool and check the receiving rail.
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
            <div style={marketplaceMoneyRouteCardStyle(isCompact, true)}>
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
                  Money In Rail
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
                  Pay this account
                </div>
                <StableButton
                  debugId="marketplace.money.pay-in-account"
                  type="button"
                  onClick={() => {
                    pendingMarketplaceSectionRef.current = "";
                    cancelMarketplaceSectionScroll();
                    setPayInEditorOpen((value) => !value);
                  }}
                  stableHeight={isCompact ? 38 : 42}
                  style={marketplaceMoneyCardActionStyle(
                    communitySettlementReady ? "secondary" : "primary",
                    isCompact
                  )}
                >
                  {payInEditorOpen
                    ? "Close rail"
                    : communitySettlementReady
                      ? "Open rail"
                      : "Set rail"}
                </StableButton>
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
                  Money Out
                </div>
                <div style={marketplaceMoneyRouteValueStyle(isCompact, payoutReady)}>
                  {payoutReady ? payoutSummary(moneySurface) : "Not ready"}
                </div>
                <div style={marketplaceMoneyHelperStyle(isCompact)}>
                  Withdrawal and payout details
                </div>
                <StableCtaLink
                  to={marketplaceMoneyOutTo}
                  debugId="marketplace.money.money-out-destination"
                  stableHeight={isCompact ? 38 : 42}
                  style={marketplaceMoneyCardActionStyle(
                    payoutReady ? "secondary" : "primary",
                    isCompact
                  )}
                >
                  Open Withdrawal
                </StableCtaLink>
              </div>
              <div style={marketplaceMoneyStatusAreaStyle()}>
                <span style={marketplaceMoneyStatusPillStyle(payoutReady)}>
                  {payoutReady ? "Payout saved" : "Payout needed"}
                </span>
              </div>
            </div>

            {payInEditorOpen ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "grid",
                  gap: 12,
                  padding: isCompact ? 12 : 16,
                  borderRadius: 18,
                  border: "1px solid rgba(20,55,88,0.14)",
                  background: "#F8FBFF",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={sectionLabel()}>Money In Rail</div>
                    <div
                      style={{
                        marginTop: 4,
                        color: "#07172C",
                        fontSize: isCompact ? 18 : 22,
                        fontWeight: 1000,
                      }}
                    >
                      Receiving account for this marketplace
                    </div>
                  </div>
                  <span style={marketplaceMoneyStatusPillStyle(communitySettlementReady)}>
                    {communitySettlementReady ? "Saved" : "Not saved"}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact
                      ? "1fr"
                      : "repeat(3, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <label style={{ display: "grid", gap: 6, fontWeight: 850 }}>
                    Account name
                    <input
                      {...marketplaceFieldTouchProps("marketplace.money.pay-in.account-name")}
                      value={payInAccountDraft.accountName}
                      onChange={(event) =>
                        updatePayInAccountDraft("accountName", event.target.value)
                      }
                      style={inputStyle()}
                      placeholder="Marketplace account"
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6, fontWeight: 850 }}>
                    Bank
                    <input
                      {...marketplaceFieldTouchProps("marketplace.money.pay-in.bank-name")}
                      value={payInAccountDraft.bankName}
                      onChange={(event) =>
                        updatePayInAccountDraft("bankName", event.target.value)
                      }
                      style={inputStyle()}
                      placeholder="Bank name"
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6, fontWeight: 850 }}>
                    Account number
                    <input
                      {...marketplaceFieldTouchProps("marketplace.money.pay-in.account-number")}
                      value={payInAccountDraft.accountNumber}
                      onChange={(event) =>
                        updatePayInAccountDraft("accountNumber", event.target.value)
                      }
                      style={inputStyle()}
                      inputMode="numeric"
                      placeholder="Account number"
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6, fontWeight: 850 }}>
                    Sort code
                    <input
                      {...marketplaceFieldTouchProps("marketplace.money.pay-in.sort-code")}
                      value={payInAccountDraft.sortCode}
                      onChange={(event) =>
                        updatePayInAccountDraft("sortCode", event.target.value)
                      }
                      style={inputStyle()}
                      placeholder="40-12-65"
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6, fontWeight: 850 }}>
                    Country
                    <input
                      {...marketplaceFieldTouchProps("marketplace.money.pay-in.country")}
                      value={payInAccountDraft.country}
                      onChange={(event) =>
                        updatePayInAccountDraft("country", event.target.value)
                      }
                      style={inputStyle()}
                      placeholder="GB"
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6, fontWeight: 850 }}>
                    Currency
                    <input
                      {...marketplaceFieldTouchProps("marketplace.money.pay-in.currency")}
                      value={payInAccountDraft.currency}
                      onChange={(event) =>
                        updatePayInAccountDraft("currency", event.target.value)
                      }
                      style={inputStyle()}
                      maxLength={8}
                      placeholder="GBP"
                    />
                  </label>
                </div>

                <label style={{ display: "grid", gap: 6, fontWeight: 850 }}>
                  Note
                  <input
                    {...marketplaceFieldTouchProps("marketplace.money.pay-in.note")}
                    value={payInAccountDraft.note}
                    onChange={(event) =>
                      updatePayInAccountDraft("note", event.target.value)
                    }
                    style={inputStyle()}
                    placeholder="Dues, savings, support, and pool deposits"
                  />
                </label>

                <div style={marketplaceInlineActionsStyle(isCompact)}>
                  <StableButton
                    debugId="marketplace.money.pay-in-account-save"
                    type="button"
                    disabled={savingPayInAccount}
                    onClick={() => {
                      void savePayInAccount();
                    }}
                    stableHeight={52}
                    style={marketplaceInlineActionStyle(
                      "primary",
                      savingPayInAccount,
                      isCompact
                    )}
                  >
                    <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                      <MarketplaceGlyph name="verify" size={18} />
                    </span>
                    {savingPayInAccount ? "Saving" : "Save account"}
                  </StableButton>
                  <StableButton
                    debugId="marketplace.money.pay-in-account-close"
                    type="button"
                    onClick={() => setPayInEditorOpen(false)}
                    stableHeight={52}
                    style={marketplaceInlineActionStyle("secondary", false, isCompact)}
                  >
                    <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                      <MarketplaceGlyph name="chevronUp" size={18} />
                    </span>
                    Close
                  </StableButton>
                </div>
              </div>
            ) : null}

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
              <StableCtaLink
                to={marketplaceMoneyOutTo}
                debugId="marketplace.money.money-out"
                stableHeight={58}
                style={marketplaceInlineActionStyle("secondary", false, isCompact)}
              >
                <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                  <MarketplaceGlyph name="card" size={18} />
                </span>
                Money Out
              </StableCtaLink>
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
            <span style={badge(roscaYearlyActive && !roscaCyclesFeatureOff)}>
              {roscaCyclesFeatureOff
                ? "Turned off"
                : roscaYearlyActive
                ? "Yearly active"
                : "GBP 60 yearly"}
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

        {roscaCyclesFeatureOff ? (
          <div
            style={{
              marginTop: 12,
              borderRadius: 16,
              border: "1px solid rgba(143,51,51,0.18)",
              background:
                "linear-gradient(180deg, rgba(254,242,242,0.98) 0%, rgba(255,247,247,0.96) 100%)",
              color: "#8A1F1F",
              padding: isCompact ? 12 : 14,
              fontSize: isCompact ? 13 : 14,
              fontWeight: 850,
              lineHeight: 1.35,
            }}
          >
            {roscaCyclesFeatureOffText}
          </div>
        ) : null}

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
              {...marketplaceSurfaceTouchProps("marketplace.rosca.actions")}
              style={{
                ...marketplaceInlineActionsStyle(isCompact),
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "repeat(auto-fit, minmax(168px, 1fr))",
                marginTop: 14,
              }}
            >
              <StableButton
                debugId="marketplace.rosca.activate-yearly"
                type="button"
                onClick={(event) => {
                  runMarketplaceAction(event, () => {
                    if (roscaCyclesFeatureOff) {
                      showNotice("error", roscaCyclesFeatureOffText);
                      return;
                    }
                    if (creatingRoscaPackage) return;
                    void createRoscaYearlyInstruction();
                  });
                }}
                stableHeight={58}
                style={marketplaceInlineActionStyle(
                  roscaYearlyActive ? "secondary" : "primary",
                  creatingRoscaPackage || roscaCyclesFeatureOff,
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
                    if (roscaCyclesFeatureOff) {
                      showNotice("error", roscaCyclesFeatureOffText);
                      return;
                    }
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
                  roscaCyclesFeatureOff ||
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
                gridTemplateColumns: isCompact
                  ? "repeat(2, minmax(0, 1fr))"
                  : "1fr",
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
            {latestRoscaPackagePayment ? (
              <PaymentProofSubmissionPanel
                payment={latestRoscaPackagePayment}
                title="ROSCA yearly service payment proof"
                debugIdPrefix="marketplace-rosca-service-proof"
                onUploaded={(payment) => {
                  setCreatedRoscaPackageInstruction(
                    payment as ExpectedPaymentRecord
                  );
                  setCommunityPackageItems((prev) =>
                    prev.map((item) =>
                      firstTruthy(item.package_code) === "rosca_cycle"
                        ? {
                            ...item,
                            latest_payment: payment as ExpectedPaymentRecord,
                          }
                        : item
                    )
                  );
                  showNotice(
                    "success",
                    "ROSCA yearly service payment proof uploaded for finance review."
                  );
                }}
              />
            ) : null}
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
          <div style={sectionLabel()}>
            {activeLinkCenterTool === "repost" ? "Marketing tools" : "Access & public links"}
          </div>
          <StableButton
            debugId="marketplace.links.toggle"
            type="button"
            onClick={(event) => toggleSectionFromButton(event, "tools")}
            stableHeight={52}
            style={{
              ...marketplaceActionStyle("soft"),
              width: 112,
              height: 52,
              minHeight: 52,
              maxHeight: 52,
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
            <MarketplaceGlyph
              name={activeLinkCenterTool === "repost" ? "repost" : "links"}
              size={isCompact ? 42 : 52}
            />
          </div>
          <div style={marketplaceLinkHeroBodyStyle(isCompact)}>
            <div>
              <div style={marketplaceLinkHeroTitleStyle(isCompact)}>
                {activeLinkCenterTool === "repost" ? "Marketing Tools" : "Access & Public Links"}
              </div>
              <div style={marketplaceLinkHeroSubtitleStyle(isCompact)}>
                {activeLinkCenterTool === "repost"
                  ? "Place a shop block into another Spotlight lane, open Spotlight, or record trade evidence."
                  : "Verify the community, invite someone, start your own community, or share the public shop."}
              </div>
            </div>
            <div style={marketplaceLinkHeroPillRowStyle()}>
              <span style={marketplaceLinkHeroPillStyle()}>
                <MarketplaceGlyph name="links" size={16} />
                {activeLinkCenterTool === "repost" ? "4 marketing jobs" : "4 link jobs"}
              </span>
              <span style={marketplaceLinkHeroPillStyle()}>
                <MarketplaceGlyph name="spark" size={16} />
                {activeLinkCenterTool === "repost" ? "Repost selected" : "1 active"}
              </span>
              <span style={marketplaceLinkHeroPillStyle()}>
                <MarketplaceGlyph name="verify" size={16} />
                {activeLinkCenterTool === "repost" ? "Marketplace-safe" : "Fast links"}
              </span>
            </div>
          </div>
        </div>

        {sectionsOpen.tools ? (
          <>
            {!activeLinkCenterTool ? (
              <div style={marketplaceLinkChooserGridStyle(isCompact)}>
                <StableButton
                  debugId="marketplace.links.choose.verify"
                  type="button"
                  onClick={(event) =>
                    runMarketplaceAction(event, () => {
                      cancelMarketplaceSectionScroll();
                      pendingMarketplaceSectionRef.current = "";
                      setActiveLinkCenterTool("verify");
                    })
                  }
                  stableHeight={isCompact ? 68 : 88}
                  style={marketplaceLinkChooserButtonStyle(isCompact, true)}
                >
                  <span aria-hidden="true" style={marketplaceLinkRowIconStyle("navy", isCompact)}>
                    <MarketplaceGlyph name="verify" size={isCompact ? 24 : 28} />
                  </span>
                  <span style={marketplaceLinkChooserTextStyle()}>
                    <span style={marketplaceLinkChooserTitleStyle(isCompact)}>
                      Verify Community
                    </span>
                    <span style={marketplaceLinkChooserDetailStyle(isCompact)}>
                      Open or copy the public community record.
                    </span>
                  </span>
                </StableButton>
                <StableButton
                  debugId="marketplace.links.choose.join"
                  type="button"
                  onClick={(event) =>
                    runMarketplaceAction(event, () => {
                      cancelMarketplaceSectionScroll();
                      pendingMarketplaceSectionRef.current = "";
                      setActiveLinkCenterTool("join");
                    })
                  }
                  stableHeight={isCompact ? 68 : 88}
                  style={marketplaceLinkChooserButtonStyle(isCompact)}
                >
                  <span aria-hidden="true" style={marketplaceLinkRowIconStyle("blue", isCompact)}>
                    <MarketplaceGlyph name="join" size={isCompact ? 24 : 28} />
                  </span>
                  <span style={marketplaceLinkChooserTextStyle()}>
                    <span style={marketplaceLinkChooserTitleStyle(isCompact)}>
                      Invite Someone
                    </span>
                    <span style={marketplaceLinkChooserDetailStyle(isCompact)}>
                      Prepare a trusted join invite.
                    </span>
                  </span>
                </StableButton>
                <StableButton
                  debugId="marketplace.links.choose.create-community"
                  type="button"
                  onClick={(event) => {
                    cancelMarketplaceSectionScroll();
                    pendingMarketplaceSectionRef.current = "";
                    openMarketplaceRoute(event, APP_ROUTES.CLANS);
                  }}
                  stableHeight={isCompact ? 68 : 88}
                  style={marketplaceLinkChooserButtonStyle(isCompact)}
                >
                  <span aria-hidden="true" style={marketplaceLinkRowIconStyle("navy", isCompact)}>
                    <MarketplaceGlyph name="members" size={isCompact ? 24 : 28} />
                  </span>
                  <span style={marketplaceLinkChooserTextStyle()}>
                    <span style={marketplaceLinkChooserTitleStyle(isCompact)}>
                      Create Community
                    </span>
                    <span style={marketplaceLinkChooserDetailStyle(isCompact)}>
                      Start your own group with the same GSN ID.
                    </span>
                  </span>
                </StableButton>
                <StableButton
                  debugId="marketplace.links.choose.shop-face"
                  type="button"
                  onClick={(event) =>
                    runMarketplaceAction(event, () => {
                      cancelMarketplaceSectionScroll();
                      pendingMarketplaceSectionRef.current = "";
                      setActiveLinkCenterTool("shopFace");
                    })
                  }
                  stableHeight={isCompact ? 68 : 88}
                  style={marketplaceLinkChooserButtonStyle(isCompact)}
                >
                  <span aria-hidden="true" style={marketplaceLinkRowIconStyle("gold", isCompact)}>
                    <MarketplaceGlyph name="shop" size={isCompact ? 24 : 28} />
                  </span>
                  <span style={marketplaceLinkChooserTextStyle()}>
                    <span style={marketplaceLinkChooserTitleStyle(isCompact)}>
                      Public Shop Face
                    </span>
                    <span style={marketplaceLinkChooserDetailStyle(isCompact)}>
                      Refresh, copy, share, or open the shop link.
                    </span>
                  </span>
                </StableButton>
              </div>
            ) : (
              <>
                <div style={marketplaceLinkToolHeaderStyle(isCompact)}>
                  <div style={{ minWidth: 0 }}>
                    <div style={sectionLabel()}>
                      {activeLinkCenterTool === "repost"
                        ? "Selected Marketing Tool"
                        : "Selected Link Center tool"}
                    </div>
                    <div style={marketplaceLinkHeroSubtitleStyle(isCompact)}>
                      {activeLinkCenterTool === "join"
                        ? "Join Invite"
                        : activeLinkCenterTool === "verify"
                          ? "Verify Community"
                          : activeLinkCenterTool === "shopFace"
                          ? "Public Shop Face"
                          : activeLinkCenterTool === "repost"
                            ? "Paid Repost"
                            : "Access & Public Links"}
                    </div>
                  </div>
                  <StableButton
                    debugId="marketplace.links.back-to-center"
                    type="button"
                    onClick={(event) =>
                      runMarketplaceAction(event, () => setActiveLinkCenterTool(null))
                    }
                    stableHeight={52}
                    style={{
                      ...marketplaceActionStyle("soft"),
                      width: "100%",
                      height: 52,
                      minHeight: 52,
                      maxHeight: 52,
                    }}
                  >
                    <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                      <MarketplaceGlyph name="chevron" size={18} />
                    </span>
                    {activeLinkCenterTool === "repost"
                      ? "Back to Marketing Tools"
                      : "Back to Link Center"}
                  </StableButton>
                </div>
                <div style={marketplaceLinkActiveToolStackStyle()}>
                {activeLinkCenterTool === "join" ? (
                <div
                  {...marketplaceSurfaceTouchProps("marketplace.links.join.surface")}
                  style={marketplaceLinkRowStyle(isCompact, true)}
                >
                  <div style={marketplaceLinkRowHeaderStyle(isCompact)}>
                    <span
                      aria-hidden="true"
                      style={marketplaceLinkRowIconStyle("blue", isCompact)}
                    >
                      <MarketplaceGlyph name="join" size={isCompact ? 25 : 30} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={sectionLabel()}>Join this community</div>
                      <div style={marketplaceLinkRowTitleStyle(isCompact)}>
                        {isCompact ? "1. Join" : "1. Join Community"}
                      </div>
                      <div style={marketplaceLinkRowSubStyle(isCompact)}>
                        {isCompact ? "Community invite" : "Invite someone into this marketplace."}
                      </div>
                    </div>
                    <span
                      style={marketplaceLinkRowStatusStyle(
                        joinInviteTrustReady
                          ? "ready"
                          : joinInviteShareReady
                            ? "ready"
                            : canManageMarketplaceLinks
                            ? "warn"
                            : "idle",
                        isCompact
                      )}
                    >
                      {canManageMarketplaceLinks ? joinRelationshipStatusText : "Member"}
                    </span>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <span style={compactStatusPillStyle(joinInviteShareReady)}>
                      {joinInviteShareReady
                        ? "Community join link ready"
                        : creatingInviteLink
                          ? "Preparing reusable join link"
                        : !joinSenderReady
                          ? "Add sender name first"
                        : !joinRecipientReady
                          ? "Add receiver name first"
                        : !joinRelationshipReady
                          ? "Add relationship evidence first"
                        : canManageMarketplaceLinks
                            ? "GSN prepares the reusable link automatically"
                          : "Select an active community first"}
                    </span>
                  </div>
                  <div style={linkReserveTextStyle()}>
                    <MarketplaceGlyph name={inviteLink ? "links" : "verify"} size={15} />
                    {inviteLink
                      ? personalizedInviteMaskedLabel
                      : marketplaceJoinLinkGuidance}
                  </div>
                  <div
                    style={{
                      ...marketplaceJoinFieldShellStyle(isCompact),
                      marginTop: isCompact ? 8 : 10,
                    }}
                  >
                    <label
                      htmlFor="marketplace-join-sender-name"
                      style={marketplaceJoinFieldLabelStyle(isCompact)}
                    >
                      From (sender)
                    </label>
                    <input
                      {...marketplaceFieldTouchProps("marketplace.join.sender-name")}
                      id="marketplace-join-sender-name"
                      type="text"
                      value={joinSenderName}
                      onChange={(event) => setJoinSenderName(event.target.value)}
                      placeholder="Your name"
                      autoComplete="name"
                      enterKeyHint="next"
                      aria-label="Sender name for join invitation"
                      style={marketplaceJoinFixedFieldStyle(isCompact)}
                    />
                  </div>
                  <div
                    style={{
                      marginTop: isCompact ? 8 : 10,
                      display: "grid",
                      gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                      gap: isCompact ? 8 : 10,
                    }}
                  >
                    <div
                      style={marketplaceJoinFieldShellStyle(isCompact)}
                    >
                      <label
                        htmlFor="marketplace-join-recipient-name"
                        style={marketplaceJoinFieldLabelStyle(isCompact)}
                      >
                        Receiver name
                      </label>
                      <input
                        {...marketplaceFieldTouchProps("marketplace.join.recipient-name")}
                        id="marketplace-join-recipient-name"
                        type="text"
                        value={joinRecipientName}
                        onChange={(event) => setJoinRecipientName(event.target.value)}
                        placeholder="Receiver name"
                        autoComplete="off"
                        enterKeyHint="next"
                        style={marketplaceJoinFixedFieldStyle(isCompact)}
                        aria-label="Receiver name for join invitation"
                      />
                    </div>
                    <div
                      style={marketplaceJoinFieldShellStyle(isCompact)}
                    >
                      <label
                        htmlFor="marketplace-join-invite-note"
                        style={marketplaceJoinFieldLabelStyle(isCompact)}
                      >
                        Message to receiver (optional)
                      </label>
                      <input
                        {...marketplaceFieldTouchProps("marketplace.join.invite-note")}
                        id="marketplace-join-invite-note"
                        type="text"
                        value={joinInviteNote}
                        onChange={(event) => setJoinInviteNote(event.target.value)}
                        placeholder="Short note"
                        autoComplete="off"
                        enterKeyHint="next"
                        style={marketplaceJoinFixedFieldStyle(isCompact)}
                        aria-label="Short personal message for join invitation"
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: isCompact ? 8 : 10,
                      display: "grid",
                      gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                      gap: isCompact ? 8 : 10,
                    }}
                  >
                    <div
                      style={marketplaceJoinFieldShellStyle(isCompact)}
                    >
                      <label
                        htmlFor="marketplace-join-relationship-type"
                        style={marketplaceJoinFieldLabelStyle(isCompact)}
                      >
                        How do you know this person?
                      </label>
                      <select
                        {...marketplaceFieldTouchProps("marketplace.join.relationship-type")}
                        id="marketplace-join-relationship-type"
                        value={joinRelationshipType}
                        onChange={(event) => {
                          setJoinRelationshipType(event.target.value);
                          setJoinRelationshipEvidenceRecordedKey("");
                        }}
                        style={marketplaceJoinFixedFieldStyle(isCompact)}
                        aria-label="How you know the person you are inviting"
                      >
                        <option value="">Choose one</option>
                        {JOIN_RELATIONSHIP_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div
                      style={marketplaceJoinFieldShellStyle(isCompact)}
                    >
                      <label
                        htmlFor="marketplace-join-known-duration"
                        style={marketplaceJoinFieldLabelStyle(isCompact)}
                      >
                        How long have you known them?
                      </label>
                      <select
                        {...marketplaceFieldTouchProps("marketplace.join.known-duration")}
                        id="marketplace-join-known-duration"
                        value={joinKnownDuration}
                        onChange={(event) => {
                          setJoinKnownDuration(event.target.value);
                          setJoinRelationshipEvidenceRecordedKey("");
                        }}
                        style={marketplaceJoinFixedFieldStyle(isCompact)}
                        aria-label="How long you have known the person you are inviting"
                      >
                        <option value="">Choose one</option>
                        {JOIN_KNOWN_DURATION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div
                    style={{
                      ...marketplaceJoinFieldShellStyle(isCompact),
                      marginTop: isCompact ? 8 : 10,
                      height: isCompact ? 114 : 118,
                      minHeight: isCompact ? 114 : 118,
                      maxHeight: isCompact ? 114 : 118,
                    }}
                  >
                    <label
                      htmlFor="marketplace-join-relationship-context"
                      style={marketplaceJoinFieldLabelStyle(isCompact)}
                    >
                      Private GSN relationship note (optional)
                    </label>
                    <textarea
                      {...marketplaceFieldTouchProps("marketplace.join.relationship-context")}
                      id="marketplace-join-relationship-context"
                      value={joinRelationshipContext}
                      onChange={(event) => {
                        setJoinRelationshipContext(event.target.value);
                        setJoinRelationshipEvidenceRecordedKey("");
                      }}
                      placeholder="Private note, not sent in the invite message"
                      rows={1}
                      style={{
                        ...marketplaceJoinFixedFieldStyle(isCompact),
                        resize: "none",
                        overflowY: "hidden",
                      }}
                      aria-label="Private relationship note about how you know the invited person"
                    />
                    <span
                      style={{
                        ...helperText(),
                        fontSize: 10.5,
                        lineHeight: 1.22,
                        fontWeight: 800,
                        color: "#6A4B0B",
                      }}
                    >
                      Private trust note only. Do not add phone numbers, bank
                      details, exact addresses, or gossip.
                    </span>
                  </div>
                  <div
                    {...marketplaceSurfaceTouchProps("marketplace.links.join.actions")}
                    style={marketplaceJoinActionsStyle(isCompact)}
                  >
                    {!isCompact ? (
                      <StableButton
                        debugId="marketplace.links.join.copy"
                        type="button"
                        onClick={(event) => {
                          runMarketplaceAction(event, () => {
                            if (!requireJoinInviteTrustEvidence()) return;
                            copyMarketplaceLink(
                              personalizedInviteLink,
                              "GSN join link copied.",
                              marketplaceJoinLinkMissingMessage
                            );
                          });
                        }}
                        style={marketplaceInlineActionStyle(
                          "primary",
                          !joinInviteTrustReady,
                          isCompact
                        )}
                      >
                        <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                          <MarketplaceGlyph name="copy" size={18} />
                        </span>
                        Copy Join Link
                      </StableButton>
                    ) : null}
                    <StableButton
                      debugId="marketplace.links.join.refresh"
                      type="button"
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          void handleCreateInviteLink();
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        isCompact ? "primary" : "secondary",
                        creatingInviteLink ||
                          !canManageMarketplaceLinks ||
                          !joinRelationshipReady,
                        isCompact
                      )}
                    >
                      {creatingInviteLink
                        ? "Preparing..."
                        : canManageMarketplaceLinks
                          ? (
                            <>
                              <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                                <MarketplaceGlyph name="refresh" size={18} />
                              </span>
                              {joinInviteTrustReady ? "Link Ready" : "Prepare Link"}
                            </>
                          )
                          : "Community needed"}
                    </StableButton>
                    <StableButton
                      debugId="marketplace.links.join.copy-message"
                      type="button"
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          void copyJoinInviteMessage();
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        isCompact ? "primary" : "secondary",
                        !joinInviteShareReady,
                        isCompact
                      )}
                    >
                      <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                        <MarketplaceGlyph name="copy" size={18} />
                      </span>
                      {isCompact ? "Copy Invite" : "Copy Invite Message"}
                    </StableButton>
                    {!isCompact ? (
                      <StableButton
                        debugId="marketplace.links.join.email"
                        type="button"
                        onClick={(event) => {
                          runMarketplaceAction(event, () => {
                            if (!requireJoinInviteTrustEvidence()) return;
                            openMarketplaceEmail(
                              joinEmailSubject,
                              joinInviteDoorwayMessage,
                              personalizedInviteLink,
                              marketplaceJoinLinkMissingMessage
                            );
                          });
                        }}
                        style={marketplaceInlineActionStyle(
                          "secondary",
                          !joinInviteShareReady,
                          isCompact
                        )}
                      >
                      <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                        <MarketplaceGlyph name="email" size={18} />
                      </span>
                        Email Join Link
                      </StableButton>
                    ) : null}
                    <StableButton
                      debugId="marketplace.links.join.whatsapp"
                      type="button"
                      onClick={(event) => {
                        runMarketplaceAction(event, () => {
                          if (!requireJoinInviteTrustEvidence()) return;
                          openMarketplaceExternalLink(
                            `https://wa.me/?text=${encodeURIComponent(joinInviteDoorwayMessage)}`,
                            marketplaceJoinLinkMissingMessage
                          );
                        });
                      }}
                      style={marketplaceInlineActionStyle(
                        "secondary",
                        !joinInviteShareReady,
                        isCompact
                      )}
                    >
                      <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                        <MarketplaceGlyph name="whatsapp" size={18} />
                      </span>
                      WhatsApp
                    </StableButton>
                    {!isCompact ? (
                      <SocialTagShareButton
                        target={{
                          title: joinEmailSubject,
                          message: joinInviteDoorwayMessage,
                          url: personalizedInviteLink,
                        }}
                        disabled={!joinInviteShareReady}
                        buttonLabel="Share"
                        stableHeight={58}
                        debugId="marketplace.links.join.tag-social"
                        style={marketplaceInlineActionStyle(
                          "secondary",
                          !joinInviteShareReady,
                          isCompact
                        )}
                        onResult={showNotice}
                      />
                    ) : null}
                  </div>
                  {joinInviteManualCopyMessage ? (
                    <div
                      style={{
                        ...joinShareMessageCardStyle(isCompact),
                        height: isCompact ? 224 : 238,
                        minHeight: isCompact ? 224 : 238,
                        maxHeight: isCompact ? 224 : 238,
                      }}
                    >
                      <div style={sectionLabel()}>Invite text</div>
                      <textarea
                        {...marketplaceFieldTouchProps("marketplace.join.manual-copy")}
                        id="marketplace-join-manual-copy"
                        readOnly
                        value={joinInviteManualCopyMessage}
                        onFocus={(event) => event.currentTarget.select()}
                        onClick={(event) => event.currentTarget.select()}
                        aria-label="Prepared join invite text"
                        rows={5}
                        style={{
                          marginTop: 8,
                          width: "100%",
                          minHeight: isCompact ? 170 : 184,
                          maxHeight: isCompact ? 170 : 184,
                          resize: "none",
                          border: "1px solid rgba(148, 163, 184, 0.42)",
                          borderRadius: 14,
                          background: "#FFFFFF",
                          color: "#102033",
                          fontSize: 16,
                          lineHeight: 1.38,
                          fontWeight: 800,
                          padding: isCompact ? "12px 13px" : "14px 16px",
                          boxSizing: "border-box",
                          WebkitUserSelect: "text",
                          userSelect: "text",
                        }}
                      />
                    </div>
                  ) : null}
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
                          ? joinInviteDoorwayMessage
                          : marketplaceJoinPreviewPendingMessage}
                      </div>
                    </div>
                  ) : null}
                </div>
                ) : null}

                {activeLinkCenterTool === "verify" ? (
                <div style={marketplaceLinkRowStyle(isCompact, true)}>
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
                      {publicCommunityWorkspaceLink ? "Ready" : "Not ready yet"}
                    </span>
                  </div>
                  <div style={linkReserveTextStyle()}>
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
                            "GSN community verification package copied.",
                            "Community verification link is not ready yet.",
                            marketplaceEmailMessage
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
                ) : null}

                {activeLinkCenterTool === "shopFace" ? (
                <div style={marketplaceLinkRowStyle(isCompact, true)}>
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
                  <div style={linkReserveTextStyle()}>
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
                          overflowWrap: "normal",
                          wordBreak: "normal",
                          hyphens: "none",
                          lineHeight: 1.2,
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
                          {isCompact ? "Copy Shop" : "Copy Shop Link"}
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
                      {isCompact ? "Email" : "Email Link"}
                    </StableButton>
                    {!isCompact ? (
                      <SocialTagShareButton
                        target={{
                          title: shopEmailSubject,
                          message: publicShopSocialPackage,
                          socialMessage: `${firstPublicIdentity(publicShopRecord?.name) || "Public GSN Shop"} on GSN. Public shop record. Open the shop link.`,
                          socialUrl: publicShopSocialPreviewLink,
                          url: publicShopSocialLink,
                        }}
                        disabled={publicShopActionsLocked || !publicShopSocialLink}
                        buttonLabel="Share"
                        stableHeight={58}
                        debugId="marketplace.public-shop.tag-social"
                        style={marketplaceInlineActionStyle(
                          "secondary",
                          publicShopActionsLocked || !publicShopSocialLink,
                          isCompact
                        )}
                        onResult={showNotice}
                      />
                    ) : null}
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
                      {isCompact ? "Open Shop" : "Open Shop Face"}
                    </StableButton>
                  </div>
                </div>
                ) : null}

                {activeLinkCenterTool === "repost" ? (
                <div
                  id="marketplace-paid-network-placement"
                  {...marketplaceSurfaceTouchProps("marketplace.network-repost.surface")}
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
                      stableHeight={52}
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
                                stableHeight={52}
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
                                  height: 52,
                                  minHeight: 52,
                                  maxHeight: 52,
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
                        ? "1fr"
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
                    {...marketplaceSurfaceTouchProps("marketplace.network-repost.payment-actions")}
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
                      stableHeight={52}
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
                    {latestRepostPayment ? (
                      <PaymentProofSubmissionPanel
                        payment={latestRepostPayment}
                        title="Network Spotlight payment proof"
                        debugIdPrefix="marketplace-network-repost-proof"
                        onUploaded={(payment) => {
                          setCreatedRepostInstruction(payment as ExpectedPaymentRecord);
                          setRepostExpectedPayments((prev) => {
                            const paymentId = String(payment.id || "");
                            const reference = firstTruthy(
                              payment.reference_display,
                              payment.reference
                            );
                            let replaced = false;
                            const next = prev.map((item) => {
                              const sameId =
                                paymentId && String(item.id || "") === paymentId;
                              const sameReference =
                                reference &&
                                firstTruthy(item.reference_display, item.reference) ===
                                  reference;
                              if (sameId || sameReference) {
                                replaced = true;
                                return payment as ExpectedPaymentRecord;
                              }
                              return item;
                            });
                            return replaced
                              ? next
                              : [payment as ExpectedPaymentRecord, ...prev];
                          });
                          showNotice(
                            "success",
                            "Network Spotlight payment proof uploaded for finance review."
                          );
                        }}
                      />
                    ) : null}
                  </details>
                    <div style={marketplaceInlineActionsStyle(isCompact)}>
                      <StableCtaLink
                        to={routeWithCommunity(APP_ROUTES.FREE_SPOTLIGHT, activeCommunityId)}
                        debugId="marketplace.marketing.free-spotlight"
                        stableHeight={58}
                        style={marketplaceInlineActionStyle("secondary", false, isCompact)}
                      >
                        <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                          <MarketplaceGlyph name="spark" size={18} />
                        </span>
                        Free Spotlight
                      </StableCtaLink>
                      <StableCtaLink
                        to={routeWithCommunity(APP_ROUTES.SUBSCRIPTION_SPOTLIGHT, activeCommunityId)}
                        debugId="marketplace.network-repost.subscription"
                        stableHeight={58}
                        style={marketplaceInlineActionStyle("secondary", false, isCompact)}
                      >
                        <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                          <MarketplaceGlyph name="spark" size={18} />
                        </span>
                        Subscription Spotlight
                      </StableCtaLink>
                      <StableButton
                        type="button"
                        debugId="marketplace.marketing.trade-evidence"
                        stableHeight={58}
                        onClick={(event) =>
                          openMarketplaceSection(event, "trade", "marketplace-trade-evidence")
                        }
                        style={marketplaceInlineActionStyle("secondary", false, isCompact)}
                      >
                        <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                          <MarketplaceGlyph name="ledger" size={18} />
                        </span>
                        Trade Evidence
                      </StableButton>
                    </div>
                </div>
                ) : null}

                </div>
              </>
            )}
          </>
        ) : null}
      </section>
      ) : null}

      {sectionsOpen.trade ? (
      <section
        id="marketplace-trade-evidence"
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
              <div style={sectionLabel()}>Trade Evidence</div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Record the item, the other side, and agreed terms before goods,
                service, or money move. This is evidence, not escrow.
              </div>
            </div>
          </div>

          <StableButton
            debugId="marketplace.trade.toggle"
            type="button"
            onClick={(event) => toggleSectionFromButton(event, "trade")}
            style={marketplaceActionStyle("soft")}
          >
            {sectionsOpen.trade ? "Collapse" : "Open"}
          </StableButton>
        </div>

        {sectionsOpen.trade ? (
          <div
            style={{
              marginTop: 12,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span style={stableStatusPillStyle(true)}>
              Trade record lane
            </span>
            <span style={stableStatusPillStyle(protectedTrades.length > 0)}>
              {protectedTrades.length
                ? `${protectedTrades.length} recent`
                : "No records yet"}
            </span>
          </div>
        ) : null}

        {sectionsOpen.trade ? (
          <div
            {...marketplaceSurfaceTouchProps(
              "marketplace.trade.evidence-module"
            )}
            style={{
              ...marketplaceDepartmentShellStyle("trade", isCompact),
            }}
          >
            <div
              style={{
                ...marketplaceDepartmentHeaderStyle(isCompact),
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "46px minmax(0, 1fr) 150px",
                gap: 12,
                alignItems: "center",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  ...marketplaceOsIconStyle(
                    "linear-gradient(180deg, #244969 0%, #061827 100%)",
                    true
                  ),
                  display: isCompact ? "none" : "inline-flex",
                }}
              >
                <MarketplaceGlyph name="ledger" size={24} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={sectionLabel()}>Trade Evidence Record</div>
                <div
                  style={{
                    marginTop: 5,
                    ...helperText(),
                    fontSize: 13,
                    lineHeight: 1.35,
                  }}
                >
                  Record the item, other side, and basic terms before goods,
                  service, or money move. This creates evidence, not escrow.
                </div>
              </div>
              <span
                style={{
                  ...stableStatusPillStyle(protectedTrades.length > 0),
                  justifySelf: isCompact ? "start" : "end",
                }}
              >
                {protectedTrades.length
                  ? `${protectedTrades.length} recent`
                  : "No records yet"}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "0.7fr 1fr 1.2fr 0.7fr 0.55fr",
                gap: 10,
                alignItems: "end",
              }}
            >
              <label style={{ display: "block" }}>
                <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                  Your side
                </div>
                <select
                  {...marketplaceFieldTouchProps("marketplace.protected-trade.role")}
                  value={protectedTradeDraft.role}
                  onChange={(event) =>
                    setProtectedTradeDraft((prev) => ({
                      ...prev,
                      role: event.target.value === "buyer" ? "buyer" : "seller",
                    }))
                  }
                  style={{ ...inputStyle(), marginTop: 6 }}
                >
                  <option value="seller">Seller</option>
                  <option value="buyer">Buyer</option>
                </select>
              </label>

              <label style={{ display: "block" }}>
                <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                  Other side
                </div>
                <select
                  {...marketplaceFieldTouchProps("marketplace.protected-trade.counterpart")}
                  value={protectedTradeDraft.counterpartUserId}
                  onChange={(event) =>
                    setProtectedTradeDraft((prev) => ({
                      ...prev,
                      counterpartUserId: event.target.value,
                    }))
                  }
                  style={{ ...inputStyle(), marginTop: 6 }}
                >
                  <option value="">Choose member</option>
                  {protectedTradeCounterpartOptions.map((row) => (
                    <option key={row.userId} value={row.userId}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "block" }}>
                <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                  Item or service
                </div>
                <input
                  {...marketplaceFieldTouchProps("marketplace.protected-trade.item")}
                  value={protectedTradeDraft.itemTitle}
                  onChange={(event) =>
                    setProtectedTradeDraft((prev) => ({
                      ...prev,
                      itemTitle: event.target.value,
                    }))
                  }
                  style={{ ...inputStyle(), marginTop: 6 }}
                  placeholder="Example: two bags of rice"
                  maxLength={160}
                />
              </label>

              <label style={{ display: "block" }}>
                <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                  Amount
                </div>
                <input
                  {...marketplaceFieldTouchProps("marketplace.protected-trade.amount")}
                  value={protectedTradeDraft.amount}
                  onChange={(event) =>
                    setProtectedTradeDraft((prev) => ({
                      ...prev,
                      amount: event.target.value,
                    }))
                  }
                  style={{ ...inputStyle(), marginTop: 6 }}
                  inputMode="decimal"
                  placeholder="0.00"
                />
              </label>

              <label style={{ display: "block" }}>
                <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                  Currency
                </div>
                <input
                  {...marketplaceFieldTouchProps("marketplace.protected-trade.currency")}
                  value={protectedTradeDraft.currency}
                  onChange={(event) =>
                    setProtectedTradeDraft((prev) => ({
                      ...prev,
                      currency: event.target.value.toUpperCase(),
                    }))
                  }
                  style={{ ...inputStyle(), marginTop: 6 }}
                  maxLength={8}
                  placeholder="NGN"
                />
              </label>
            </div>

            <label style={{ display: "block" }}>
              <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                Basic terms
              </div>
              <textarea
                {...marketplaceFieldTouchProps("marketplace.protected-trade.terms")}
                value={protectedTradeDraft.termsSummary}
                onChange={(event) =>
                  setProtectedTradeDraft((prev) => ({
                    ...prev,
                    termsSummary: event.target.value,
                  }))
                }
                style={{ ...textAreaStyle(), marginTop: 6, minHeight: 78 }}
                placeholder="Example: buyer pays first; seller releases after payment claim is reviewed."
                maxLength={4000}
              />
            </label>

            <label style={{ display: "block" }}>
              <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                Minimum evidence packet
              </div>
              <textarea
                {...marketplaceFieldTouchProps("marketplace.protected-trade.packet")}
                value={protectedTradeDraft.evidencePacketNote}
                onChange={(event) =>
                  setProtectedTradeDraft((prev) => ({
                    ...prev,
                    evidencePacketNote: event.target.value,
                  }))
                }
                style={{ ...textAreaStyle(), marginTop: 6, minHeight: 78 }}
                placeholder="Optional: invoice reference, final agreement evidence, courier handoff, expected delivery, and payment schedule. Keep WhatsApp conversation outside GSN unless a final evidence note is needed."
                maxLength={1200}
              />
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                gap: 8,
              }}
            >
              <StableButton
                debugId="marketplace.protected-trade.create"
                type="button"
                busy={creatingProtectedTrade}
                busyLabel="Starting"
                onClick={(event) => void handleCreateProtectedTrade(event)}
                stableHeight={52}
                style={marketplaceInlineActionStyle("primary", false, isCompact)}
              >
                Start record
              </StableButton>
              <StableButton
                debugId="marketplace.protected-trade.refresh"
                type="button"
                busy={loadingProtectedTrades}
                busyLabel="Refreshing"
                onClick={(event) => {
                  consumeMarketplaceButtonEvent(event);
                  void refreshProtectedTrades();
                }}
                stableHeight={52}
                style={marketplaceInlineActionStyle("secondary", false, isCompact)}
              >
                Refresh records
              </StableButton>
            </div>

            {recentProtectedTrades.length ? (
              <div style={{ display: "grid", gap: 8 }}>
                {recentProtectedTrades.map((trade) => (
                  <div
                    key={trade.id || trade.trade_code || trade.item_title}
                    style={{
                      borderRadius: 14,
                      border: "1px solid rgba(16,37,59,0.08)",
                      background: "#FFFFFF",
                      padding: isCompact ? 10 : 12,
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "1fr"
                        : "minmax(0, 1fr) 120px",
                      gap: 8,
                      alignItems: "center",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ minWidth: 0, display: "grid", gap: 5 }}>
                      <div
                        style={{
                          color: "#0B1F33",
                          fontSize: isCompact ? 14 : 15,
                          fontWeight: 950,
                          lineHeight: 1.18,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflowWrap: "break-word",
                        }}
                      >
                        {safeStr(trade.item_title) || "Protected trade record"}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            ...stableStatusPillStyle(Boolean(trade.trade_code)),
                            height: "auto",
                            minHeight: 28,
                            whiteSpace: "normal",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {safeStr(trade.trade_code) || "No trade code yet"}
                        </span>
                        <span style={stableStatusPillStyle(Boolean(trade.status))}>
                          {safeStr(trade.status || "draft").replace(/_/g, " ")}
                        </span>
                        <span style={stableStatusPillStyle(Boolean(trade.release_status))}>
                          {safeStr(trade.release_status || "not requested").replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        color: "#173750",
                        fontSize: isCompact ? 13 : 14,
                        fontWeight: 950,
                        justifySelf: isCompact ? "start" : "end",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {safeStr(trade.amount)
                        ? `${safeStr(trade.currency || "NGN")} ${safeStr(trade.amount)}`
                        : "No amount"}
                    </div>
                  </div>
                ))}
                <div
                  style={{
                    borderRadius: 14,
                    border: "1px solid rgba(214,170,69,0.22)",
                    background:
                      "linear-gradient(180deg, #FFFDF7 0%, #F8FBFF 100%)",
                    padding: isCompact ? 10 : 12,
                    display: "grid",
                    gap: 10,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={sectionLabel()}>Record update</div>
                    <span style={stableStatusPillStyle(Boolean(selectedProtectedTrade?.id))}>
                      {safeStr(selectedProtectedTrade?.trade_code) || "Choose record"}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                      gap: 10,
                      alignItems: "end",
                    }}
                  >
                    <label style={{ display: "block" }}>
                      <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                        Trade record
                      </div>
                      <select
                        {...marketplaceFieldTouchProps("marketplace.protected-trade.update.record")}
                        value={selectedProtectedTradeId}
                        onChange={(event) =>
                          setSelectedProtectedTradeId(event.target.value)
                        }
                        style={{ ...inputStyle(), marginTop: 6 }}
                      >
                        {recentProtectedTrades.map((trade) => (
                          <option
                            key={trade.id || trade.trade_code || trade.item_title}
                            value={positiveNumber(trade.id) || ""}
                          >
                            {safeStr(trade.item_title) ||
                              safeStr(trade.trade_code) ||
                              "Protected trade"}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={{ display: "block" }}>
                      <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                        Update type
                      </div>
                      <select
                        {...marketplaceFieldTouchProps("marketplace.protected-trade.update.type")}
                        value={protectedTradeEventType}
                        onChange={(event) =>
                          setProtectedTradeEventType(event.target.value)
                        }
                        style={{ ...inputStyle(), marginTop: 6 }}
                      >
                        {PROTECTED_TRADE_EVENT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div
                    style={{
                      color: "#41556B",
                      fontSize: isCompact ? 12 : 13,
                      fontWeight: 850,
                      lineHeight: 1.35,
                    }}
                  >
                    {selectedProtectedTradeEventOption.detail}
                  </div>

                  <label style={{ display: "block" }}>
                    <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                      Evidence note
                    </div>
                    <textarea
                      {...marketplaceFieldTouchProps("marketplace.protected-trade.update.note")}
                      value={protectedTradeEventNote}
                      onChange={(event) =>
                        setProtectedTradeEventNote(event.target.value)
                      }
                      style={{ ...textAreaStyle(), marginTop: 6, minHeight: 72 }}
                      placeholder="Write what happened and who can stand by this update."
                      maxLength={4000}
                    />
                  </label>

                  <StableButton
                    debugId="marketplace.protected-trade.record-update"
                    type="button"
                    busy={recordingProtectedTradeEvent}
                    busyLabel="Recording"
                    onClick={(event) => void handleRecordProtectedTradeEvent(event)}
                    stableHeight={52}
                    style={marketplaceInlineActionStyle("primary", false, isCompact)}
                  >
                    Record update
                  </StableButton>

                  <div
                    style={{
                      borderRadius: 16,
                      border: "1px solid rgba(212,175,55,0.26)",
                      background:
                        "linear-gradient(180deg, rgba(255,253,247,0.96) 0%, rgba(248,251,255,0.98) 100%)",
                      padding: isCompact ? 10 : 12,
                      display: "grid",
                      gap: 10,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={sectionLabel()}>Evidence paper</div>
                        <div
                          style={{
                            marginTop: 4,
                            ...helperText(),
                            fontSize: 12,
                            lineHeight: 1.35,
                          }}
                        >
                          Signed-in evidence paper for screenshot review. Private
                          to the people who can already see this record.
                        </div>
                      </div>
                      <span style={stableStatusPillStyle(Boolean(selectedProtectedTrade?.id))}>
                        {safeStr(selectedProtectedTrade?.trade_code) || "Not ready"}
                      </span>
                    </div>

                    {protectedTradeEvidencePaperText ? (
                      <>
                        <GsnSnapshotPaperCard
                          paperText={protectedTradeEvidencePaperText}
                          compact={isCompact}
                          icon="document"
                          maxBodyLines={isCompact ? 4 : 6}
                        />
                        <div
                          style={{
                            borderRadius: 14,
                            border: "1px solid rgba(16,37,59,0.08)",
                            background: "#FFFFFF",
                            padding: isCompact ? 10 : 12,
                            display: "grid",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <div style={sectionLabel()}>Event trail</div>
                            <span
                              style={stableStatusPillStyle(
                                selectedProtectedTradeHasDetail &&
                                  recentProtectedTradeEvents.length > 0
                              )}
                            >
                              {loadingProtectedTradeDetail
                                ? "Loading trail"
                                : recentProtectedTradeEvents.length
                                  ? `${recentProtectedTradeEvents.length} recent`
                                  : "No trail loaded"}
                            </span>
                          </div>

                          {recentProtectedTradeEvents.length ? (
                            <div style={{ display: "grid", gap: 6 }}>
                              {recentProtectedTradeEvents.map((event) => (
                                <div
                                  key={event.id || `${event.event_type}-${event.created_at}`}
                                  style={{
                                    color: "#173750",
                                    fontSize: isCompact ? 12 : 13,
                                    fontWeight: 850,
                                    lineHeight: 1.35,
                                    overflowWrap: "anywhere",
                                  }}
                                >
                                  {protectedTradeEventLine(event)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div
                              style={{
                                color: "#41556B",
                                fontSize: isCompact ? 12 : 13,
                                fontWeight: 800,
                                lineHeight: 1.35,
                              }}
                            >
                              Open or refresh the record to load the detailed
                              protected-trade event trail.
                            </div>
                          )}
                        </div>
                        <StableButton
                          debugId="marketplace.protected-trade.copy-paper"
                          type="button"
                          onClick={(event) => {
                            consumeMarketplaceButtonEvent(event);
                            void safeCopy(protectedTradeEvidencePaperText).then(
                              (copied) => {
                                showNotice(
                                  copied ? "success" : "error",
                                  copied
                                    ? "Protected trade evidence paper copied."
                                    : "Evidence paper could not be copied."
                                );
                              }
                            );
                          }}
                          stableHeight={50}
                          style={marketplaceInlineActionStyle("secondary", false, isCompact)}
                        >
                          Copy paper text
                        </StableButton>
                      </>
                    ) : (
                      <div
                        style={{
                          ...innerCard("#FFFFFF"),
                          padding: isCompact ? 10 : 12,
                          color: "#41556B",
                          fontSize: isCompact ? 12 : 13,
                          fontWeight: 800,
                          lineHeight: 1.35,
                        }}
                      >
                        Start or choose a protected trade record before copying
                        the GSN evidence paper.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  ...innerCard("#FFFFFF"),
                  padding: isCompact ? 10 : 12,
                  color: "#41556B",
                  fontSize: isCompact ? 12 : 13,
                  fontWeight: 800,
                  lineHeight: 1.35,
                }}
              >
                Start with one serious trade record. It will sit beside the
                member, shop, and evidence history for this community.
              </div>
            )}
          </div>
        ) : null}
      </section>
      ) : null}

        {sectionsOpen.members ? (
      <section
        id="marketplace-members-shops"
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
                "linear-gradient(180deg, #D7A22D 0%, #805A0F 100%)",
                true
              )}
            >
              <MarketplaceGlyph name="members" size={26} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={sectionLabel()}>Community Members & Shops</div>
              <div style={{ marginTop: 8, ...helperText() }}>
                See Community Domains, known members, and visible shops inside
                this selected marketplace. Open a shop record for current
                evidence before you act.
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
          <span style={stableStatusPillStyle(marketplaceCommunityDomainRows.length > 0)}>
            {marketplaceCommunityDomainRows.length} domain
            {marketplaceCommunityDomainRows.length === 1 ? "" : "s"}
          </span>
          <span style={stableStatusPillStyle(true)}>
            Community-bound directory
          </span>
        </div>

        {marketplaceCommunityDomainRows.length ? (
          <div
            style={{
              ...marketplaceLinkRowStyle(isCompact, true),
              marginTop: 12,
              marginBottom: 12,
            }}
          >
            <div style={marketplaceLinkRowHeaderStyle(isCompact)}>
              <span
                aria-hidden="true"
                style={marketplaceLinkRowIconStyle("gold", isCompact)}
              >
                <MarketplaceGlyph name="shop" size={isCompact ? 25 : 30} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={sectionLabel()}>Community Domains</div>
                <div style={marketplaceLinkRowTitleStyle(isCompact)}>
                  Professional marketplace communities
                </div>
                <div style={marketplaceLinkRowSubStyle(isCompact)}>
                  They sit with community members and shops. Setup stays in
                  the Community Domain dashboard.
                </div>
              </div>
              <span
                style={marketplaceLinkRowStatusStyle(
                  marketplaceCommunityDomainRows.some((row) => row.marketplaceReady)
                    ? "ready"
                    : "idle",
                  isCompact
                )}
              >
                {marketplaceCommunityDomainRows.length} linked
              </span>
            </div>
            <div
              style={{
                marginTop: 10,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 10,
              }}
            >
              {marketplaceCommunityDomainRows.slice(0, 4).map((row) => (
                <StableButton
                  key={row.key}
                  debugId={`marketplace.domain.${row.id || row.key}.open`}
                  type="button"
                  stableHeight={isCompact ? 76 : 86}
                  onClick={(event) => {
                    void openMarketplaceCommunityDomain(event, row);
                  }}
                  style={marketplaceLinkChooserButtonStyle(isCompact)}
                >
                  <span
                    aria-hidden="true"
                    style={marketplaceLinkRowIconStyle(
                      row.marketplaceReady ? "gold" : "navy",
                      isCompact
                    )}
                  >
                    <MarketplaceGlyph name="shop" size={isCompact ? 24 : 28} />
                  </span>
                  <span style={marketplaceLinkChooserTextStyle()}>
                    <span style={marketplaceLinkChooserTitleStyle(isCompact)}>
                      {row.name}
                    </span>
                    <span style={marketplaceLinkChooserDetailStyle(isCompact)}>
                      {row.marketplaceReady
                        ? `Open marketplace | ${row.code}`
                        : `Finish setup | ${row.code}`}
                    </span>
                  </span>
                </StableButton>
              ))}
            </div>
          </div>
        ) : null}

          <div
            {...marketplaceSurfaceTouchProps(
              "marketplace.members.visible-members-module"
            )}
            style={marketplaceDepartmentShellStyle("members", isCompact)}
          >
            <div
              style={marketplaceDepartmentHeaderStyle(isCompact)}
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
                        ? "38px minmax(0, 1fr)"
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
                      <span
                        style={{
                          ...stableStatusPillStyle(Boolean(row.gmfnId)),
                          height: "auto",
                          maxHeight: "none",
                          minHeight: 30,
                          whiteSpace: "normal",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {row.gmfnId ? displayGsnLabel(row.gmfnId) : "Not issued yet"}
                      </span>
                      <span
                        style={{
                          ...stableStatusPillStyle(Boolean(row.shopTo)),
                          height: "auto",
                          maxHeight: "none",
                          minHeight: 30,
                          whiteSpace: "normal",
                        }}
                      >
                        {row.shopTo ? "Shop visible" : "No shop yet"}
                      </span>
                    </div>
                  </div>

                  {row.shopTo ? (
                    <StableCtaLink
                      debugId={`marketplace.member.${row.gmfnId || row.userId || "unknown"}.shop`}
                      to={row.shopTo}
                      stableHeight={52}
                      style={{
                        ...marketplaceInlineActionStyle(
                          "secondary",
                          false,
                          isCompact
                        ),
                        gridColumn: isCompact ? "1 / -1" : undefined,
                      }}
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
                            ? "38px minmax(0, 1fr)"
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
                          <span
                            style={{
                              ...stableStatusPillStyle(Boolean(row.gmfnId)),
                              height: "auto",
                              maxHeight: "none",
                              minHeight: 30,
                              whiteSpace: "normal",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {row.gmfnId ? displayGsnLabel(row.gmfnId) : "Not issued yet"}
                          </span>
                          <span
                            style={{
                              ...stableStatusPillStyle(Boolean(row.shopTo)),
                              height: "auto",
                              maxHeight: "none",
                              minHeight: 30,
                              whiteSpace: "normal",
                            }}
                          >
                            {row.shopTo ? "Shop visible" : "No shop yet"}
                          </span>
                        </div>
                      </div>

                      {row.shopTo ? (
                        <StableCtaLink
                          debugId={`marketplace.member.${row.gmfnId || row.userId || "unknown"}.shop`}
                          to={row.shopTo}
                          stableHeight={52}
                          style={{
                            ...marketplaceInlineActionStyle(
                              "secondary",
                              false,
                              isCompact
                            ),
                            gridColumn: isCompact ? "1 / -1" : undefined,
                          }}
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
      </section>
      ) : null}

      {sectionsOpen.demand ? (
      <section
        id="marketplace-demand-box"
        style={{ ...pageCard("#FFFDF7"), ...marketplaceSectionStyle(), order: 5 }}
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
                "linear-gradient(180deg, #D7A22D 0%, #805A0F 100%)",
                true
              )}
            >
              <MarketplaceGlyph name="demand" size={26} />
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
                Demand Box
              </div>
              <div style={{ marginTop: 6, ...helperText() }}>
                Local needs and offers, separate from ROSCA savings and Support
                requests.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(true)}>Standalone lane</span>
            <StableButton
              debugId="marketplace.demand.toggle"
              type="button"
              onClick={(event) => toggleSectionFromButton(event, "demand")}
              style={marketplaceActionStyle("soft")}
            >
              {sectionsOpen.demand ? "Collapse" : "Open"}
            </StableButton>
          </div>
        </div>

        {sectionsOpen.demand ? (
          <div
            {...marketplaceSurfaceTouchProps("marketplace.demand.module")}
            style={marketplaceDepartmentShellStyle("demand", isCompact)}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) 190px",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={sectionLabel()}>Local needs and offers</div>
                <div style={{ marginTop: 6, ...helperText(), fontSize: 13 }}>
                  Use this when people here should see what is needed, wanted,
                  available, or being sourced inside this community market.
                </div>
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={stableStatusPillStyle(Boolean(activeCommunityName))}>
                    {activeCommunityName || "Select marketplace"}
                  </span>
                  <span style={stableStatusPillStyle(Boolean(activeCommunityId))}>
                    ID: {activeCommunityId || "not ready"}
                  </span>
                  <span style={stableStatusPillStyle(Boolean(currentGmfnId))}>
                    GSN ID: {currentGmfnId || "not ready"}
                  </span>
                </div>
              </div>

              <StableButton
                debugId="marketplace.demand.open"
                type="button"
                onClick={(event) => openMarketplaceCta(event, "demandBox")}
                style={{
                  ...marketplaceInlineActionStyle("primary", false, isCompact),
                  gridColumn: isCompact ? "1 / -1" : undefined,
                }}
              >
                Open Demand Box
              </StableButton>
            </div>
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
              <div style={sectionLabel()}>Support</div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Ask this marketplace for support when your withdrawal needs
                backing.
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
            what="This is where you ask the selected marketplace for support when your own available balance is not enough."
            why="GSN keeps the request, supporters, repayment plan, and later finance record together."
            next="Start the request here. GSN will show the next support step after the draft is created."
            tone="light"
            style={{ marginTop: 12 }}
          />
        ) : null}

        {sectionsOpen.support ? (
          <div
            {...marketplaceSurfaceTouchProps("marketplace.support.selected-module")}
            style={marketplaceDepartmentShellStyle("neutral", isCompact)}
          >
            <div style={sectionLabel()}>Selected marketplace</div>
            <div
              style={{
                marginTop: 8,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  ...badge(Boolean(activeCommunityName)),
                  flexBasis: isCompact ? "100%" : "auto",
                  maxWidth: "100%",
                  minWidth: 0,
                  overflowWrap: "anywhere",
                }}
              >
                {activeCommunityName || "Select marketplace"}
              </span>
              <span style={badge(Boolean(activeCommunityId))}>
                ID: {activeCommunityId || "not ready"}
              </span>
              <span
                style={{
                  ...badge(Boolean(currentGmfnId)),
                  flexBasis: isCompact ? "100%" : "auto",
                  maxWidth: "100%",
                  minWidth: 0,
                  overflowWrap: "anywhere",
                }}
              >
                GSN ID: {currentGmfnId || "not ready"}
              </span>
              {hasMoneyOutSupportTask ? (
                <span style={badge(true)}>From Money Out</span>
              ) : null}
            </div>

            {hasMoneyOutSupportTask ? (
              <div style={{ marginTop: 10, ...helperText() }}>
                This withdrawal needs support here. Requested:{" "}
                {moneyOutSupportAmountText || "not shown"} {poolCurrency}.
                Support needed:{" "}
                {moneyOutSupportGapText || moneyOutSupportAmountText || "not shown"}{" "}
                {poolCurrency}.
              </div>
            ) : null}
          </div>
        ) : null}

        {sectionsOpen.support ? (
          <div
            {...marketplaceSurfaceTouchProps("marketplace.support.path-chooser")}
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div
              style={{
                ...marketplaceDepartmentShellStyle("support", isCompact),
                display: "grid",
                gap: 12,
                alignContent: "space-between",
              }}
            >
              <div>
                <div style={sectionLabel()}>Loan Support</div>
                <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                  Use this path for one request that needs backing, supporter
                  checks, repayment terms, and finance follow-up.
                </div>
              </div>
              <StableButton
                debugId="marketplace.support.open-loan-support"
                type="button"
                onClick={(event) => {
                  runMarketplaceAction(event, () => {
                    setSupportDeskMode("loan");
                    scheduleMarketplaceSectionScroll("marketplace-loans-support", {
                      force: true,
                    });
                  });
                }}
                style={{
                  ...marketplaceActionStyle(
                    supportLoanDeskOpen ? "primary" : "secondary"
                  ),
                  width: "100%",
                  justifySelf: "stretch",
                }}
              >
                {supportLoanDeskOpen ? "Loan Support Open" : "Open Loan Support"}
              </StableButton>
            </div>

            <div
              style={{
                ...marketplaceDepartmentShellStyle("rosca", isCompact),
                display: "grid",
                gap: 12,
                alignContent: "space-between",
              }}
            >
              <div>
                <div style={sectionLabel()}>ROSCA</div>
                <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                  Use this path for a selected-member savings circle. It is not
                  a loan or support request.
                </div>
              </div>
              <StableButton
                debugId="marketplace.support.open-rosca"
                type="button"
                onClick={(event) =>
                  openMarketplaceSection(event, "rosca", "marketplace-rosca")
                }
                style={{
                  ...marketplaceActionStyle("secondary"),
                  width: "100%",
                  justifySelf: "stretch",
                }}
              >
                Open ROSCA
              </StableButton>
            </div>
          </div>
        ) : null}

        {supportLoanDeskOpen ? (
          <div
            {...marketplaceSurfaceTouchProps(
              "marketplace.support.financial-support-module"
            )}
            style={{
              ...marketplaceDepartmentShellStyle("support", isCompact),
            }}
          >
            <div style={sectionLabel()}>Loan Support requests</div>
            <div style={{ marginTop: 8, ...helperText(), maxWidth: 760 }}>
              This is the loan-support path only. ROSCA opens through its own
              path and does not share this request form.
            </div>
          </div>
        ) : null}

        {supportLoanDeskOpen ? (
          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {[
              ["1", "Start request", "Amount, duration, repayment, purpose."],
              ["2", "Check supporters", "GSN shows who can back the request."],
              ["3", "Send requests", "Send only after the draft is ready."],
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

        {supportLoanDeskOpen ? (
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
                Enter the amount, duration, repayment plan, and purpose. GSN
                creates one support draft and then shows the people who may be
                able to back it.
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
                  Supporters: {requiredGuarantorCount || "not checked"}
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
                  <div style={sectionLabel()}>Repayment plan</div>
                  <select
                    {...marketplaceFieldTouchProps("marketplace.support.repayment-cadence")}
                    value={loanRepaymentCadence}
                    onChange={(e) => setLoanRepaymentCadence(e.target.value)}
                    disabled={supportProcessBusy}
                    style={{ ...inputStyle(), marginTop: 8 }}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Every 2 weeks</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div style={{ gridColumn: "1 / span 2" }}>
                  <div style={sectionLabel()}>Purpose</div>
                  <textarea
                    {...marketplaceFieldTouchProps("marketplace.support.purpose")}
                    value={loanPurpose}
                    onChange={(e) => setLoanPurpose(e.target.value)}
                    disabled={supportProcessBusy}
                    placeholder="State what the support is for."
                    style={{
                      ...textAreaStyle(),
                      marginTop: 8,
                      minHeight: isCompact ? 72 : 96,
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 14, ...softCard("#F8FBFF") }}>
                <div style={sectionLabel()}>Agreement preview</div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  GSN records this as a support request and repayment commitment.
                </div>
                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gridTemplateColumns: isCompact
                      ? "repeat(2, minmax(0, 1fr))"
                      : "repeat(4, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <div style={innerCard("#FFFFFF")}>
                    <div style={sectionLabel()}>Requested</div>
                    <div style={{ marginTop: 6, color: "#07172C", fontWeight: 950 }}>
                      {agreementAmount
                        ? `${agreementAmount.toFixed(2)} ${poolCurrency}`
                        : "Enter amount"}
                    </div>
                  </div>
                  <div style={innerCard("#FFFFFF")}>
                    <div style={sectionLabel()}>Service fee</div>
                    <div style={{ marginTop: 6, color: "#07172C", fontWeight: 950 }}>
                      {agreementAmount
                        ? `${agreementServiceFee} ${poolCurrency}`
                        : "After amount"}
                    </div>
                  </div>
                  <div style={innerCard("#FFFFFF")}>
                    <div style={sectionLabel()}>You receive</div>
                    <div style={{ marginTop: 6, color: "#07172C", fontWeight: 950 }}>
                      {agreementAmount
                        ? `${agreementNetAmount} ${poolCurrency}`
                        : "After amount"}
                    </div>
                  </div>
                  <div style={innerCard("#FFFFFF")}>
                    <div style={sectionLabel()}>Repay by</div>
                    <div style={{ marginTop: 6, color: "#07172C", fontWeight: 950 }}>
                      {agreementDueAt}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                  Plan: {agreementRepaymentCadence}. Fee rule shown here follows the current
                  GSN support rule and is confirmed when the draft is created.
                </div>
              </div>

              <div style={{ marginTop: 12, ...softCard("#FFFBEF") }}>
                <div style={sectionLabel()}>Support window</div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  Supporters have a response window. If enough support does not
                  come in, GSN can expire unanswered requests and release locked
                  support after the grace window.
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

              {loanDraftId ? (
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
                    More support tools
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
                      Check readiness
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
                      Find supporters
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
                      Support workbench
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
                      Full support view
                    </StableButton>
                  </div>
                </details>
              ) : null}

              {loanDraftId ? (
                <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
                  <div style={softCard("#FFFFFF")}>
                    <div style={sectionLabel()}>Draft status</div>

                    <ExplainToggle
                      label="What this draft status does"
                      what="This status strip shows how far the current support draft has moved, including whether supporters are required, how many fit suggestions exist, and how many people have responded."
                      why="It turns the draft into something readable so users can tell whether they should stay here, send support requests, or continue into the next support step."
                      next="Read the status first, then review the fit suggestions below or move into the deeper support tools only when the draft shows you what is still missing."
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
                        Required supporters: {requiredGuarantorCount}
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
                        why="They help the user choose who to ask next without treating supporter selection like a blind guess or a random contact list."
                        next="Read the reason and suggested support amount first, choose only the people that make sense for this request, then continue once the chosen supporters reflect the draft."
                        tone="light"
                        style={{ marginTop: 12 }}
                      />

                      {suggestedSupporters.length === 0 ? (
                        <div style={{ marginTop: 10, ...helperText() }}>
                          No supporter suggestion is shown yet for this amount.
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
                                          Suggested support: {safeStr(item.recommendedPledge)}
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
                          <div style={sectionLabel()}>Chosen supporters</div>

                          <ExplainToggle
                            label="What these chosen supporters do"
                            what="These are the people you have selected for this draft so far. They are still candidates until the support requests are actually sent."
                            why="This keeps selection separate from approval so users do not mistake a chosen name for a completed support commitment."
                            next="Review the selected names here, remove anyone who no longer fits, then send the support requests only when the final set looks right."
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
                        what="This step sends the support requests to the selected people so the draft can move from chosen candidates into real outreach."
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
                            : "Send Support Requests"}
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
                    No visible support item is active in this community right now.
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
                        {firstTruthy(item?.purpose, item?.title, "Support item")}
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
                            ? `Requested by: ${item.borrower_name}`
                            : "",
                          item?.guarantor_name
                            ? `Supporter: ${item.guarantor_name}`
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

function MarketplaceNoticeToast({
  isCompact,
  notice,
  onClose,
}: {
  isCompact: boolean;
  notice: { tone: NoticeTone; text: string };
  onClose: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={noticeCard(notice.tone, isCompact)}
    >
      <span style={{ minWidth: 0, overflowWrap: "break-word" }}>
        {notice.text}
      </span>
      <StableButton
        type="button"
        debugId="marketplace.notice.close"
        aria-label="Close status message"
        onClick={onClose}
        stableHeight={34}
        style={noticeCloseButtonStyle(notice.tone)}
      >
        x
      </StableButton>
    </div>
  );
}

