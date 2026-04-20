import React, { useEffect, useMemo, useRef, useState } from "react";
import ExplainToggle from "../components/ExplainToggle";
import SystemPictureFrame from "../components/SystemPictureFrame";
import { navigateWithOrigin } from "../lib/nav";
import { useLocation, useNavigate } from "react-router-dom";
import OriginLink from "../components/OriginLink";
import {
  addLoanGuarantorRequest,
  cancelLoanRequest,
  createLoanRequest,
  getAccessToken,
  getClanInviteLink,
  getCurrentClan,
  getLoanGuarantorSuggestions,
  getLoanSummary,
  getMarketplaceShops,
  getMe,
  getPoolMe,
  getSelectedClanId,
  listClanMembers,
  listMyClans,
  listMyLoans,
  removeCommunityProfileImage,
  safeCopy,
  setCommunityProfileImage,
  uploadCommunityProfileImageFile,
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
  invite_code?: string | null;
  invite_link?: string | null;
  invite_url?: string | null;
  community_id?: string | null;
  community_code?: string | null;
  marketplace_id?: string | null;
  gmfn_id?: string | null;
  clan_code?: string | null;
  image_url?: string | null;
  profile_image_url?: string | null;
  community_image_url?: string | null;
  marketplace_image_url?: string | null;
  cover_image_url?: string | null;
  banner_url?: string | null;
  logo_url?: string | null;
  trust_band?: string | null;
  trust_class?: string | null;
  community_trust_band?: string | null;
  reputation_band?: string | null;
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
  profile: boolean;
  money: boolean;
  tools: boolean;
  members: boolean;
  support: boolean;
};

type PersistedWithdrawalTask = {
  amountInput: string;
  noteInput: string;
  latestWithdrawalResult: any | null;
};

const IMAGE_FIELD_NAMES = [
  "community_image_url",
  "marketplace_image_url",
  "cover_image_url",
  "banner_url",
  "profile_picture_url",
  "profile_image_url",
  "avatar_url",
  "photo_url",
  "image_url",
  "community_logo_url",
  "logo_url",
  "picture_url",
  "display_picture_url",
  "icon_url",
  "image",
  "photo",
  "banner",
  "logo",
  "avatar",
  "picture",
  "dp",
];

const DEFAULT_SECTION_STATE: SectionState = {
  profile: false,
  money: false,
  tools: true,
  members: true,
  support: false,
};

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

function dedupeStrings(values: any[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const text = safeStr(value);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }

  return out;
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

function buildSelectedCommunity(currentClan: any, clanRows: any[]): CommunityRow | null {
  const currentId = getRowId(currentClan);
  const matchedRow =
    clanRows.find((row: any) => getRowId(row) === currentId) || null;
  const firstRow = clanRows[0] || null;

  const merged = {
    ...mergeFirstVisible(currentClan, matchedRow, firstRow),
    community: mergeFirstVisible(
      currentClan?.community,
      matchedRow?.community,
      firstRow?.community
    ),
    profile: mergeFirstVisible(
      currentClan?.profile,
      matchedRow?.profile,
      firstRow?.profile
    ),
    marketplace: mergeFirstVisible(
      currentClan?.marketplace,
      matchedRow?.marketplace,
      firstRow?.marketplace
    ),
    clan: mergeFirstVisible(currentClan?.clan, matchedRow?.clan, firstRow?.clan),
    meta: mergeFirstVisible(currentClan?.meta, matchedRow?.meta, firstRow?.meta),
  };

  return getRowId(merged) ? (merged as CommunityRow) : null;
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
  const direct = firstTruthy(
    payload?.share_link,
    payload?.invite_url,
    payload?.invite_link,
    payload?.url,
    payload?.link,
    payload?.api_link
  );

  if (direct) return direct;

  const code = firstTruthy(payload?.code, payload?.invite_code);
  if (code && typeof window !== "undefined") {
    return `${window.location.origin}/join?code=${encodeURIComponent(code)}`;
  }

  return "";
}

function apiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";

  return String(raw || "").trim().replace(/\/+$/, "");
}

function browserOrigin(): string {
  try {
    if (typeof window === "undefined") return "";
    return String(window.location.origin || "").trim().replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function getMediaOrigins(): string[] {
  const out: string[] = [];
  const base = apiBase();
  const webOrigin = browserOrigin();

  if (base.startsWith("http://") || base.startsWith("https://")) {
    try {
      const u = new URL(base);
      out.push(`${u.protocol}//${u.host}`);
    } catch {
      // ignore
    }
  }

  if (webOrigin) {
    out.push(webOrigin);
  }

  return dedupeStrings(out);
}

function buildResolvedMediaCandidates(src: string): string[] {
  const raw = safeStr(src);
  if (!raw) return [];

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("blob:") ||
    raw.startsWith("data:")
  ) {
    return [raw];
  }

  const origins = getMediaOrigins();
  const trimmed = raw.replace(/^\/+/, "");
  const out: string[] = [];

  if (raw.startsWith("/")) {
    for (const origin of origins) out.push(`${origin}${raw}`);
  } else {
    for (const origin of origins) out.push(`${origin}/${trimmed}`);
  }

  out.push(raw);
  return dedupeStrings(out);
}

function looksLikeImageKey(key: string, parentKey = ""): boolean {
  const rawKey = safeStr(key).toLowerCase();
  const rawParent = safeStr(parentKey).toLowerCase();

  if (!rawKey) return false;

  if (rawKey === "url" && rawParent) {
    return looksLikeImageKey(rawParent);
  }

  return IMAGE_FIELD_NAMES.some(
    (token) =>
      rawKey === token ||
      rawKey.endsWith(`_${token}`) ||
      rawKey.endsWith(`${token}_url`) ||
      rawKey.includes(token)
  );
}

function looksLikeImageValue(value: any): boolean {
  const raw = safeStr(value).toLowerCase();
  if (!raw) return false;

  return (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("/") ||
    /\.(png|jpe?g|webp|gif|bmp|svg|avif)(\?|#|$)/.test(raw) ||
    raw.includes("/media/") ||
    raw.includes("/images/") ||
    raw.includes("/uploads/") ||
    raw.includes("/files/") ||
    raw.includes("/image/")
  );
}

function getNestedImageCandidate(input: any): string {
  const seen = new Set<any>();
  const candidates: string[] = [];

  function walk(value: any, depth: number, parentKey = "") {
    if (value == null || depth > 6) return;

    if (typeof value === "string") {
      if (looksLikeImageKey(parentKey) && looksLikeImageValue(value)) {
        candidates.push(value);
      }
      return;
    }

    if (typeof value !== "object") return;
    if (seen.has(value)) return;
    seen.add(value);

    if (Array.isArray(value)) {
      for (const item of value) walk(item, depth + 1, parentKey);
      return;
    }

    for (const [key, child] of Object.entries(value)) {
      if (typeof child === "string") {
        if (
          (looksLikeImageKey(key, parentKey) ||
            (safeStr(key).toLowerCase() === "url" &&
              looksLikeImageKey(parentKey))) &&
          looksLikeImageValue(child)
        ) {
          candidates.push(child);
        }
      } else {
        walk(child, depth + 1, key);
      }
    }
  }

  walk(input, 0);
  return safeStr(candidates[0] || "");
}

function collectLikelyImageFields(row: any): string[] {
  if (!row || typeof row !== "object") return [];

  const values: string[] = [];
  for (const field of IMAGE_FIELD_NAMES) {
    const value = safeStr((row as any)?.[field]);
    if (value) values.push(value);
  }
  return values;
}

function buildCommunityImageCandidates(
  community: CommunityRow | null,
  localUrl: string
): string[] {
  const rows = [
    community,
    community?.community,
    community?.profile,
    community?.marketplace,
    community?.clan,
    community?.meta,
  ];

  const raw = dedupeStrings([
    safeStr(localUrl),
    ...rows.flatMap((row) => collectLikelyImageFields(row)),
    getNestedImageCandidate(community),
  ]);

  return dedupeStrings(raw.flatMap((item) => buildResolvedMediaCandidates(item)));
}

function communityName(row: CommunityRow | null | undefined): string {
  return (
    firstTruthy(
      row?.marketplace_name,
      row?.display_name,
      row?.name,
      row?.title
    ) || "Selected community"
  );
}
function communityDescription(row: CommunityRow | null | undefined): string {
  return (
    firstTruthy(
      row?.marketplace_description,
      row?.description,
      "Marketplace home for your current community."
    )
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
  return (
    firstTruthy(
      row?.community_code,
      row?.community?.community_code,
      row?.profile?.community_code,
      row?.marketplace?.community_code,
      row?.clan?.community_code,
      row?.meta?.community_code
    ) || "Pending"
  );
}

function communityTrustLabel(row: CommunityRow | null | undefined): string {
  return (
    firstTruthy(
      row?.community_trust_band,
      row?.trust_band,
      row?.trust_class,
      row?.reputation_band,
      row?.status,
      row?.community?.community_trust_band,
      row?.community?.trust_band,
      "Visible community"
    )
  );
}

function communityRole(row: CommunityRow | null | undefined): string {
  return (
    firstTruthy(
      row?.role,
      row?.member_role,
      row?.membership_role,
      row?.participant_role,
      row?.community?.role,
      row?.profile?.role,
      row?.marketplace?.role,
      row?.clan?.role
    ) || ""
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

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 20,
    boxShadow:
      "0 14px 34px rgba(15,23,42,0.045), 0 2px 8px rgba(15,23,42,0.02)",
    overflow: "hidden",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 14,
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

function badgeStyle(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    background: primary ? "rgba(29,78,216,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#1D4ED8" : "#51657A",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
  };
}

// alias kept to match existing component usage
function badge(primary = false): React.CSSProperties {
  return badgeStyle(primary);
}

function actionBtn(
  kind: "primary" | "secondary" | "soft" = "secondary",
  disabled = false
): React.CSSProperties {
  if (kind === "primary") {
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
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      opacity: disabled ? 0.86 : 1,
    };
  }

  if (kind === "soft") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 38,
      padding: "8px 12px",
      borderRadius: 12,
      border: "1px solid rgba(11,31,51,0.08)",
      background: "#F8FBFF",
      color: disabled ? "#94A3B8" : "#24415C",
      fontWeight: 800,
      fontSize: 13,
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      opacity: disabled ? 0.86 : 1,
    };
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 800,
    fontSize: 14,
    textAlign: "center",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    opacity: disabled ? 0.86 : 1,
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

function statTile(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    padding: 14,
  };
}

function noticeCard(tone: NoticeTone): React.CSSProperties {
  return {
    ...softCard(tone === "success" ? "#F3FBF5" : "#FEF2F2"),
    color: tone === "success" ? "#166534" : "#991B1B",
    border:
      tone === "success"
        ? "1px solid rgba(34,197,94,0.16)"
        : "1px solid rgba(239,68,68,0.16)",
    fontWeight: 800,
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#5F7287",
    fontSize: 14,
    lineHeight: 1.75,
  };
}

function readLocalString(key: string): string {
  try {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeLocalString(key: string, value: string) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function removeLocal(key: string) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
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

function communityPictureStorageKey(communityId: number): string {
  return `gmfn.marketplace.communityPicture.${communityId}`;
}

function communitySectionsStorageKey(communityId: number): string {
  return `gmfn.marketplace.sections.v2.${communityId}`;
}

function withdrawalTaskStorageKey(clanId: number, gmfnId: string): string {
  return `${WITHDRAWAL_TASK_STORAGE_KEY_PREFIX}.${gmfnId || "me"}.${clanId || 0}`;
}

function AuthResolvedImage(props: {
  candidates: string[];
  alt: string;
  clanId?: number;
  refreshSeed: number;
  style: React.CSSProperties;
  fallback: React.ReactNode;
}) {
  const [resolvedSrc, setResolvedSrc] = useState("");
  const candidateKey = useMemo(
    () => `${props.refreshSeed}::${props.candidates.join("|")}`,
    [props.refreshSeed, props.candidates]
  );

  useEffect(() => {
    let alive = true;
    let objectUrl = "";

    async function preloadDirect(url: string): Promise<boolean> {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
      });
    }

    async function run() {
      setResolvedSrc("");

      const token = getAccessToken();
      const uniqueCandidates = dedupeStrings(props.candidates);

      for (const candidate of uniqueCandidates) {
        const url = safeStr(candidate);
        if (!url) continue;

        try {
          const headers: Record<string, string> = {};
          if (token) headers.Authorization = `Bearer ${token}`;
          if (positiveNumber(props.clanId)) {
            headers["X-Clan-Id"] = String(props.clanId);
          }

          const res = await fetch(url, {
            method: "GET",
            headers,
            credentials: "include",
            cache: "no-store",
          });

          if (res.ok) {
            const contentType = String(
              res.headers.get("content-type") || ""
            ).toLowerCase();

            if (
              !contentType ||
              contentType.startsWith("image/") ||
              contentType.includes("application/octet-stream")
            ) {
              const blob = await res.blob();

              if (blob && blob.size > 0) {
                const nextObjectUrl = URL.createObjectURL(blob);

                if (!alive) {
                  URL.revokeObjectURL(nextObjectUrl);
                  return;
                }

                if (objectUrl) URL.revokeObjectURL(objectUrl);
                objectUrl = nextObjectUrl;
                setResolvedSrc(nextObjectUrl);
                return;
              }
            }
          }
        } catch {
          // continue
        }

        try {
          const ok = await preloadDirect(url);
          if (ok) {
            if (!alive) return;
            setResolvedSrc(url);
            return;
          }
        } catch {
          // continue
        }
      }
    }

    void run();

    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [candidateKey, props.clanId]);

  if (resolvedSrc) {
    return <img src={resolvedSrc} alt={props.alt} style={props.style} />;
  }

  return <>{props.fallback}</>;
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
  const [inviteLink, setInviteLink] = useState<string>("");
  const [creatingInviteLink, setCreatingInviteLink] = useState(false);
  const [loans, setLoans] = useState<LoanSupportItem[]>([]);
  const [moneySurface, setMoneySurface] = useState<CommunityMoneySurface | null>(
    null
  );

  const [communityPictureUrl, setCommunityPictureUrl] = useState("");
  const [communityPictureFileInputKey, setCommunityPictureFileInputKey] =
    useState(0);
  const [communityPictureRefreshSeed, setCommunityPictureRefreshSeed] =
    useState(0);
  const [uploadingCommunityPicture, setUploadingCommunityPicture] =
    useState(false);
  const [removingCommunityPicture, setRemovingCommunityPicture] =
    useState(false);

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

  const supportSectionRef = useRef<HTMLElement | null>(null);
  const withdrawalHandoffAppliedRef = useRef("");

  const selectedClanId = Number(getSelectedClanId() || 0);
  const currentGmfnId = safeStr(me?.gmfn_id || "");
  const myShopTo = useMemo(() => {
    return currentGmfnId
      ? `/app/shop/${encodeURIComponent(currentGmfnId)}`
      : "";
  }, [currentGmfnId]);

  const activeCommunityId = useMemo(() => {
    return positiveNumber(selectedCommunity?.id || selectedCommunity?.clan_id);
  }, [selectedCommunity]);

  const publicCommunityWorkspaceLink = useMemo(() => {
    const origin = browserOrigin();
    if (!origin || !activeCommunityId) return "";
    return `${origin}/community/${encodeURIComponent(String(activeCommunityId))}`;
  }, [activeCommunityId]);

  const publicShopViewLink = useMemo(() => {
    const origin = browserOrigin();
    if (!origin || !currentGmfnId) return "";
    return `${origin}/shop/${encodeURIComponent(currentGmfnId)}`;
  }, [currentGmfnId]);

  const controlledMarketplaceLinkNote = useMemo(() => {
    if (!selectedCommunity) {
      return "Select a community first. This marketplace issues controlled outward links only after the community and shop context are known.";
    }

    return "Vault and other controlled outward links belong to this marketplace, but they are issued as live approved links rather than one permanent public URL.";
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
    setSectionsOpen((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function consumeMarketplacePointerEvent(
    event?: React.SyntheticEvent<HTMLElement>
  ) {
    if (!event) return;
    event.stopPropagation();
  }

  function consumeMarketplaceButtonEvent(
    event?: React.SyntheticEvent<HTMLElement>
  ) {
    if (!event) return;

    if (event.type === "click" || event.type === "submit") {
      event.preventDefault();
    }

    event.stopPropagation();
  }

  function openMarketplaceRoute(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    to: string
  ) {
    consumeMarketplaceButtonEvent(event);
    navigateWithOrigin(navigate, to, location);
  }

  function openFinance(event?: React.SyntheticEvent<HTMLElement>) {
    consumeMarketplaceButtonEvent(event);
    navigateWithOrigin(navigate, "/app/finance", location);
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

  async function loadPage() {
    setLoading(true);

    try {
      const [meRes, currentClanRes, clanListRes] = await Promise.all([
        getMe().catch(() => null),
        getCurrentClan().catch(() => null),
        listMyClans().catch(() => ({ items: [] })),
      ]);

      const clanRows = rowsOf<any>(clanListRes);
      const resolvedCommunity = buildSelectedCommunity(currentClanRes, clanRows);
      const currentCommunityId =
        positiveNumber(resolvedCommunity?.id || resolvedCommunity?.clan_id) ||
        selectedClanId;

      const [membersRes, shopsRes, poolRes, inviteRes, loansRes] =
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
          getPoolMe("NGN", 20).catch(() => null),
          currentCommunityId
            ? getClanInviteLink(currentCommunityId).catch(() => null)
            : Promise.resolve(null),
          listMyLoans().catch(() => []),
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
      setPoolInfo(poolRes);
      setInviteLink(getInviteUrl(inviteRes));
      setLoans(filteredLoans);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
  }, [selectedClanId]);

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
      setCommunityPictureUrl("");
      setSectionsOpen(DEFAULT_SECTION_STATE);
      return;
    }

    const savedPicture = readLocalString(
      communityPictureStorageKey(activeCommunityId)
    );
    const savedSections = readLocalJSON<SectionState | null>(
      communitySectionsStorageKey(activeCommunityId),
      null
    );

    setCommunityPictureUrl(savedPicture || "");
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

        if (storedAmount && !safeStr(loanAmount)) {
          setLoanAmount(storedAmount);
        }

        if (storedNote && !safeStr(loanPurpose)) {
          setLoanPurpose(storedNote);
        }

        withdrawalHandoffAppliedRef.current = token;
      }
    }

    const timer = window.setTimeout(() => {
      supportSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [location.hash, activeCommunityId, currentGmfnId, loanAmount, loanPurpose]);

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

  const gmfnId = useMemo(() => {
    return firstTruthy(me?.gmfn_id, "Pending");
  }, [me]);

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

  const communityImageCandidates = useMemo(() => {
    return buildCommunityImageCandidates(selectedCommunity, communityPictureUrl);
  }, [selectedCommunity, communityPictureUrl]);

  const hasCommunityPicture = communityImageCandidates.length > 0;

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
        shopName: firstTruthy(shop?.name, "No community-visible shop yet"),
        shopTo: gmfn ? `/app/shop/${encodeURIComponent(gmfn)}` : "",
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

  async function handleUploadCommunityPicture(file: File | null) {
    if (!file) return;

    if (!activeCommunityId) {
      showNotice("error", "Select a community first.");
      return;
    }

    setUploadingCommunityPicture(true);

    try {
      const uploadRes = await uploadCommunityProfileImageFile(file, activeCommunityId);
      const imageUrl = firstTruthy(
        uploadRes?.image_url,
        uploadRes?.profile_image_url,
        uploadRes?.community_image_url,
        uploadRes?.url,
        uploadRes?.file_url,
        uploadRes?.path,
        uploadRes?.item?.image_url,
        uploadRes?.item?.url,
        uploadRes?.data?.image_url,
        uploadRes?.data?.url
      );

      if (!imageUrl) {
        throw new Error(
          "Upload completed, but the system did not return a usable image link."
        );
      }

      try {
        await (setCommunityProfileImage as any)({
          clan_id: activeCommunityId,
          image_url: imageUrl,
        });
      } catch {
        await (setCommunityProfileImage as any)(activeCommunityId, imageUrl);
      }

      setCommunityPictureUrl(imageUrl);
      writeLocalString(communityPictureStorageKey(activeCommunityId), imageUrl);
      setCommunityPictureRefreshSeed((x) => x + 1);
      await loadPage();
      showNotice("success", "Community picture updated.");
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Community picture upload failed."
      );
    } finally {
      setUploadingCommunityPicture(false);
      setCommunityPictureFileInputKey((x) => x + 1);
    }
  }

  async function handleRemoveCommunityPicture() {
    if (!activeCommunityId) {
      showNotice("error", "Select a community first.");
      return;
    }

    setRemovingCommunityPicture(true);

    try {
      await removeCommunityProfileImage(activeCommunityId);
      setCommunityPictureUrl("");
      removeLocal(communityPictureStorageKey(activeCommunityId));
      setCommunityPictureRefreshSeed((x) => x + 1);
      await loadPage();
      showNotice("success", "Community picture removed.");
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Community picture could not be removed."
      );
    } finally {
      setRemovingCommunityPicture(false);
      setCommunityPictureFileInputKey((x) => x + 1);
    }
  }

  async function handleCreateInviteLink() {
    if (!activeCommunityId) {
      showNotice("error", "Select a community first.");
      return;
    }

    setCreatingInviteLink(true);

    try {
      const inviteRes = await getClanInviteLink(activeCommunityId).catch(() => null);
      const nextInviteLink = getInviteUrl(inviteRes);

      if (!nextInviteLink) {
        showNotice("error", "Invite link is not ready yet.");
        return;
      }

      setInviteLink(nextInviteLink);
      safeCopy(nextInviteLink);
      showNotice("success", "Invite link created and copied.");
    } finally {
      setCreatingInviteLink(false);
    }
  }

  function handleOpenJoinLink() {
    if (!inviteLink) {
      showNotice("error", "Join invite link is not ready yet.");
      return;
    }

    if (typeof window !== "undefined") {
      window.open(inviteLink, "_blank", "noopener,noreferrer");
    }
  }

  function copyMarketplaceLink(
    url: string,
    successText: string,
    missingText: string
  ) {
    if (!url) {
      showNotice("error", missingText);
      return;
    }

    safeCopy(url);
    showNotice("success", successText);
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

  function copyCommunityId() {
    const id = communityIdentity(selectedCommunity);
    if (!id || id === "Pending") {
      showNotice("error", "Community ID is not available.");
      return;
    }

    safeCopy(id);
    showNotice("success", "Community ID copied.");
  }

  async function handleStartLoanDraft() {
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

  if (loading) {
    return (
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          paddingBottom: 40,
          display: "grid",
          gap: 18,
        }}
      >
        <section
          style={pageCard("linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)")}
        >
          <div style={sectionLabel()}>Marketplace</div>
          <div
            style={{
              marginTop: 10,
              color: "#F8FBFF",
              fontSize: isCompact ? 30 : 40,
              fontWeight: 900,
              lineHeight: 1.08,
            }}
          >
            Selected community marketplace
          </div>
          <div style={{ marginTop: 12, ...helperText(), color: "#D7E3F1" }}>
            Loading your current community...
          </div>
        </section>
      </div>
    );
  }

  if (!activeCommunityId || !selectedCommunity) {
    return (
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          paddingBottom: 40,
          display: "grid",
          gap: 18,
        }}
      >
        {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

        <section
          style={pageCard("linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)")}
        >
          <div style={sectionLabel()}>Marketplace</div>

          <div
            style={{
              marginTop: 10,
              color: "#F8FBFF",
              fontSize: isCompact ? 30 : 40,
              fontWeight: 900,
              lineHeight: 1.08,
              maxWidth: 760,
            }}
          >
            Selected community marketplace
          </div>

          <div style={{ marginTop: 12, ...helperText(), color: "#D7E3F1", maxWidth: 860 }}>
            Choose a community in Community Home first, then return here to open
            its marketplace.
          </div>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onPointerDown={consumeMarketplacePointerEvent}
              onClick={(event) => openMarketplaceRoute(event, "/app/community")}
              style={actionBtn("secondary")}
            >
              Community Home
            </button>
            <button
              type="button"
              onPointerDown={consumeMarketplacePointerEvent}
              onClick={(event) => openMarketplaceRoute(event, "/app/dashboard")}
              style={actionBtn("primary")}
            >
              Dashboard
            </button>
            <button
              type="button"
              onPointerDown={consumeMarketplacePointerEvent}
              onClick={openFinance}
              style={actionBtn("soft")}
            >
              Finance
            </button>
            <button
              type="button"
              onPointerDown={consumeMarketplacePointerEvent}
              onClick={(event) => openMarketplaceRoute(event, "/app/notifications")}
              style={actionBtn("soft")}
            >
              Notifications
            </button>
            <button
              type="button"
              onPointerDown={consumeMarketplacePointerEvent}
              onClick={(event) => openMarketplaceRoute(event, "/app/trust")}
              style={actionBtn("soft")}
            >
              Trust Passport
            </button>
            <button
              type="button"
              onPointerDown={consumeMarketplacePointerEvent}
              onClick={(event) => openMarketplaceRoute(event, "/app/identity")}
              style={actionBtn("soft")}
            >
              CCI
            </button>
            <button
              type="button"
              onPointerDown={consumeMarketplacePointerEvent}
              onClick={(event) => openMarketplaceRoute(event, "/app/trust-slip")}
              style={actionBtn("soft")}
            >
              TrustSlip
            </button>
            <button
              type="button"
              onPointerDown={consumeMarketplacePointerEvent}
              onClick={(event) => openMarketplaceRoute(event, "/app/my-gmfn-and-i")}
              style={actionBtn("soft")}
            >
              My GSN and I
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        paddingBottom: 40,
        display: "grid",
        gap: 18,
      }}
    >
      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section
        style={pageCard(
          "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"
        )}
      >
        <div style={{ ...sectionLabel(), color: "#A8C7E8" }}>
          Marketplace profile and member standing
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "300px minmax(0, 1fr)",
            gap: 18,
            alignItems: "stretch",
          }}
        >
          <SystemPictureFrame
            outerStyle={{
              minHeight: isCompact ? 190 : 220,
              borderRadius: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 10,
            }}
            innerStyle={{
              minHeight: isCompact ? 170 : 200,
            }}
          >
            <AuthResolvedImage
              candidates={communityImageCandidates}
              alt={communityName(selectedCommunity)}
              clanId={activeCommunityId}
              refreshSeed={communityPictureRefreshSeed}
              style={{
                width: "100%",
                height: isCompact ? 190 : 220,
                borderRadius: 18,
                border: "1px solid rgba(212,175,55,0.18)",
                objectFit: "cover",
                objectPosition: "center 18%",
                display: "block",
              }}
              fallback={
                <div
                  style={{
                    minHeight: isCompact ? 190 : 220,
                    padding: 18,
                    textAlign: "center",
                    color: "#F8FBFF",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 82,
                      height: 82,
                      borderRadius: 999,
                      border: "1px solid rgba(212,175,55,0.24)",
                      background:
                        "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18) 0%, rgba(212,175,55,0.14) 28%, rgba(11,31,51,0.18) 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      fontSize: 26,
                      letterSpacing: 1,
                    }}
                  >
                    {communityName(selectedCommunity)
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part.slice(0, 1).toUpperCase())
                      .join("") || "GS"}
                  </div>
                  <div
                    style={{
                      maxWidth: 220,
                      color: "#D7E3F1",
                      fontWeight: 900,
                      fontSize: 18,
                      lineHeight: 1.3,
                    }}
                  >
                    Marketplace billboard pending
                  </div>
                </div>
              }
            />
          </SystemPictureFrame>

          <div>
            <div
              style={{
                color: "#F8FBFF",
                fontSize: isCompact ? 30 : 40,
                fontWeight: 900,
                lineHeight: 1.08,
                maxWidth: 820,
              }}
            >
              {communityName(selectedCommunity)}
            </div>

            <div
              style={{
                marginTop: 12,
                ...helperText(),
                color: "#D7E3F1",
                maxWidth: 900,
              }}
            >
              {communityDescription(selectedCommunity)}
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr 1fr"
                  : "repeat(4, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              {[
                ["Community ID", communityIdentity(selectedCommunity)],
                ["Marketplace trust", communityTrustLabel(selectedCommunity)],
                ["Current member", memberName],
                ["Member ID", gmfnId],
                ["Role here", communityRole(selectedCommunity) || "Member"],
                ["Local pool", `${visiblePoolAmount} ${visiblePoolCurrency}`],
                [
                  "Money In rail",
                  communitySettlementReady ? "Ready" : "Awaiting issue",
                ],
                ["Money Out rail", payoutReady ? "Ready" : "Awaiting issue"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.07)",
                    padding: 14,
                    minHeight: 82,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "#A8C7E8",
                      fontWeight: 900,
                      letterSpacing: 0.28,
                      textTransform: "uppercase",
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 15,
                      lineHeight: 1.35,
                      wordBreak: "break-word",
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>One community in action</span>
              <span style={badge(false)}>Shop exposure is community-governed</span>
              <span style={badge(false)}>
                Private Vault Shops stay controlled
              </span>
            </div>
          </div>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Marketplace shortcuts</div>

        <div
          style={{
            marginTop: 8,
            ...helperText(),
            maxWidth: 880,
          }}
        >
          Use these launchers only after confirming the active marketplace above.
          Each action should continue with this selected community context.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onPointerDown={consumeMarketplacePointerEvent}
              onClick={openFinance}
              style={{
                ...actionBtn("primary"),
                position: "relative",
                zIndex: 4,
              }}
            >
              Finance
            </button>

            <button
              type="button"
              onPointerDown={consumeMarketplacePointerEvent}
              onClick={(event) => openMarketplaceRoute(event, "/app/payment/pool")}
              style={actionBtn("secondary")}
            >
              Money In
            </button>

            <button
              type="button"
              onPointerDown={consumeMarketplacePointerEvent}
              onClick={(event) =>
                openMarketplaceRoute(event, "/app/withdrawal-instructions")
              }
              style={actionBtn("secondary")}
            >
              Money Out
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onPointerDown={consumeMarketplacePointerEvent}
              onClick={(event) => openMarketplaceRoute(event, "/app/trust")}
              style={actionBtn("soft")}
            >
              Trust Passport
            </button>

            <button
              type="button"
              onPointerDown={consumeMarketplacePointerEvent}
              onClick={(event) => openMarketplaceRoute(event, "/app/identity")}
              style={actionBtn("soft")}
            >
              CCI
            </button>

            <button
              type="button"
              onPointerDown={consumeMarketplacePointerEvent}
              onClick={(event) => openMarketplaceRoute(event, "/app/trust-slip")}
              style={actionBtn("soft")}
            >
              TrustSlip
            </button>

            <button
              type="button"
              onPointerDown={consumeMarketplacePointerEvent}
              onClick={(event) => openMarketplaceRoute(event, "/app/demand-box")}
              style={actionBtn("soft")}
            >
              Demand Box
            </button>

            <button
              type="button"
              onPointerDown={consumeMarketplacePointerEvent}
              onClick={(event) => openMarketplaceRoute(event, "/app/notifications")}
              style={actionBtn("soft")}
            >
              Notifications
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {myShopTo ? (
              <button
                type="button"
                onPointerDown={consumeMarketplacePointerEvent}
                onClick={(event) => openMarketplaceRoute(event, myShopTo)}
                style={actionBtn("secondary")}
              >
                Shop Gallery
              </button>
            ) : null}

            <button
              type="button"
              onPointerDown={consumeMarketplacePointerEvent}
              onClick={(event) => openMarketplaceRoute(event, "/app/community")}
              style={actionBtn("secondary")}
            >
              Community Home
            </button>

            <button
              type="button"
              onPointerDown={consumeMarketplacePointerEvent}
              onClick={(event) => openMarketplaceRoute(event, "/app/dashboard")}
              style={actionBtn("secondary")}
            >
              Dashboard
            </button>
          </div>
        </div>
      </section>

      <ExplainToggle
        label="What this screen does"
        what="Marketplace is where one selected community becomes active. Read the current community identity, open Shop, check money readiness, and continue into the next trade or support route."
        why="It keeps one community in focus so users can see who is visible, what is ready, and when a money or support route should take over."
        next="Read the community identity first, then move into Shop, money, members, or support depending on what you need to do in this community."
        tone="dark"
      />

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
            <div style={sectionLabel()}>Marketplace detail</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Open this only when you need the fuller marketplace picture,
              story, and profile controls.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("profile")}
            style={actionBtn("soft")}
          >
            {sectionsOpen.profile ? "Collapse" : "Open"}
          </button>
        </div>

        <ExplainToggle
          label="What this detail does"
          what="This opens the fuller profile for the selected marketplace, including the picture, story, trust position, and profile controls."
          why="The first block already gives the quick standing. This detail is kept separate so the page stays lighter while still preserving the deeper profile view."
          next="Open it when you need to update or inspect the full marketplace profile; otherwise continue through shortcuts, members, links, demand, or support."
          tone="light"
          style={{ marginTop: 12 }}
        />

        {sectionsOpen.profile ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "280px minmax(0, 1fr)",
              gap: 18,
              alignItems: "start",
            }}
          >
            <div>
              <SystemPictureFrame
                outerStyle={{
                  minHeight: 230,
                  borderRadius: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 10,
                }}
                innerStyle={{
                  minHeight: 210,
                }}
              >
                  <div
                    style={{
                      position: "absolute",
                      top: 14,
                      right: 14,
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
                    Community identity
                  </div>
                  <AuthResolvedImage
                    candidates={communityImageCandidates}
                    alt={communityName(selectedCommunity)}
                    clanId={activeCommunityId}
                    refreshSeed={communityPictureRefreshSeed}
                    style={{
                      width: "100%",
                      height: 230,
                      borderRadius: 18,
                      border: "1px solid rgba(212,175,55,0.14)",
                      objectFit: "cover",
                      objectPosition: "center 18%",
                      display: "block",
                    }}
                    fallback={
                      <div
                        style={{
                          minHeight: 230,
                          padding: 18,
                          textAlign: "center",
                          color: "#F8FBFF",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 14,
                        }}
                      >
                        <div
                          style={{
                            width: 88,
                            height: 88,
                            borderRadius: 999,
                            border: "1px solid rgba(212,175,55,0.24)",
                            background:
                              "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18) 0%, rgba(212,175,55,0.14) 28%, rgba(11,31,51,0.18) 100%)",
                            boxShadow:
                              "0 16px 34px rgba(2,12,27,0.22), inset 0 1px 0 rgba(255,255,255,0.06)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 900,
                            fontSize: 28,
                            letterSpacing: 1,
                          }}
                        >
                          {communityName(selectedCommunity)
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part) => part.slice(0, 1).toUpperCase())
                            .join("") || "GC"}
                        </div>

                        <div
                          style={{
                            maxWidth: 220,
                            color: "#D7E3F1",
                            fontWeight: 900,
                            fontSize: 22,
                            lineHeight: 1.3,
                          }}
                        >
                          {communityName(selectedCommunity)}
                        </div>
                        <div
                          style={{
                            maxWidth: 240,
                            color: "#D7E3F1",
                            fontSize: 13,
                            lineHeight: 1.7,
                          }}
                        >
                          This executive frame will hold the visible community identity picture once
                          it is released.
                        </div>
                      </div>
                    }
                  />
              </SystemPictureFrame>
            </div>

            <div>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: isCompact ? 28 : 34,
                  lineHeight: 1.12,
                }}
              >
                {communityName(selectedCommunity)}
              </div>

              <div
                style={{
                  marginTop: 12,
                  ...helperText(),
                  maxWidth: 820,
                }}
              >
                {communityDescription(selectedCommunity)}
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr 1fr"
                    : "repeat(4, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                <div style={statTile()}>
                  <div style={sectionLabel()}>Community ID</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 15,
                      lineHeight: 1.3,
                      wordBreak: "break-word",
                    }}
                  >
                    {communityIdentity(selectedCommunity)}
                  </div>
                </div>

                <div style={statTile()}>
                  <div style={sectionLabel()}>Community trust</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 15,
                      lineHeight: 1.3,
                    }}
                  >
                    {communityTrustLabel(selectedCommunity)}
                  </div>
                </div>

                <div style={statTile()}>
                  <div style={sectionLabel()}>Members</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 20,
                    }}
                  >
                    {members.length}
                  </div>
                </div>

                <div style={statTile()}>
                  <div style={sectionLabel()}>Pool</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 15,
                      lineHeight: 1.3,
                    }}
                  >
                    {visiblePoolAmount} {visiblePoolCurrency}
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
                <span style={badge(true)}>Current member: {memberName}</span>
                <span style={badge(false)}>GMFN ID: {gmfnId}</span>
                {communityRole(selectedCommunity) ? (
                  <span style={badge(false)}>
                    Role: {communityRole(selectedCommunity)}
                  </span>
                ) : null}
                <span style={badge(false)}>
                  Invite: {inviteLink ? "Ready" : "Not ready"}
                </span>
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={openFinance}
                    style={{
                      ...actionBtn("primary"),
                      position: "relative",
                      zIndex: 4,
                    }}
                  >
                    Finance
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onPointerDown={consumeMarketplacePointerEvent}
                    onClick={(event) => openMarketplaceRoute(event, "/app/trust")}
                    style={actionBtn("secondary")}
                  >
                    Trust Passport
                  </button>

                  <button
                    type="button"
                    onPointerDown={consumeMarketplacePointerEvent}
                    onClick={(event) => openMarketplaceRoute(event, "/app/identity")}
                    style={actionBtn("secondary")}
                  >
                    CCI
                  </button>

                  <button
                    type="button"
                    onPointerDown={consumeMarketplacePointerEvent}
                    onClick={(event) => openMarketplaceRoute(event, "/app/trust-slip")}
                    style={actionBtn("secondary")}
                  >
                    TrustSlip
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
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
            <div style={sectionLabel()}>Money routes</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Use these routes when you want to pay in, withdraw, or open the
              finance view for this community.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("money")}
            style={actionBtn("soft")}
          >
            {sectionsOpen.money ? "Collapse" : "Open"}
          </button>
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
                <button
                  type="button"
                  onPointerDown={consumeMarketplacePointerEvent}
                  onClick={(event) => openMarketplaceRoute(event, "/app/payment/pool")}
                  style={actionBtn("primary")}
                >
                  Money In
                </button>
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
                <button
                  type="button"
                  onPointerDown={consumeMarketplacePointerEvent}
                  onClick={(event) =>
                    openMarketplaceRoute(event, "/app/withdrawal-instructions")
                  }
                  style={actionBtn("secondary")}
                >
                  Money Out
                </button>
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
                  Open the full financial truth for this community, including pay-in,
                  withdrawal, support, locks, releases, and visible event history.
              </div>

              <div style={{ marginTop: 14 }}>
                <button
                  type="button"
                  onPointerDown={consumeMarketplacePointerEvent}
                  onClick={openFinance}
                  style={actionBtn("secondary")}
                >
                  Open Finance
                </button>
              </div>
            </div>
          </div>
        ) : null}
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
            <div style={sectionLabel()}>Marketplace-owned outward links</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              This marketplace owns the outward links for this one community.
              They must carry this community identity when they leave the app.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("tools")}
            style={actionBtn("soft")}
          >
            {sectionsOpen.tools ? "Collapse" : "Open"}
          </button>
        </div>

        <ExplainToggle
          label="What these links do"
          what="This area keeps the outward links that belong to the selected marketplace, including join, marketplace-view, shop-view, and controlled Vault-style access."
          why="Invite links, shop-facing links, and other outward paths should stay localized to this marketplace instead of becoming loose dashboard links."
          next="Use the join, marketplace-view, or shop-view links when something must leave this community and still return to the same marketplace context."
          tone="light"
          style={{ marginTop: 12 }}
        />

        {sectionsOpen.tools ? (
          <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
            <div
              style={{
                borderRadius: 16,
                border: "1px solid rgba(11,31,51,0.08)",
                background: "#FCFEFF",
                padding: 16,
                display: "grid",
                gap: 14,
              }}
            >
              <div>
                <div style={sectionLabel()}>Marketplace-owned outward links</div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  These links belong to this marketplace only. They carry this
                  community identity outward and should return people into this
                  same marketplace context.
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
                    Use the marketplace join invite when someone should begin
                    the request-to-join path for this community. Members still
                    review and vote after the person returns.
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 13,
                      lineHeight: 1.5,
                      wordBreak: "break-word",
                    }}
                  >
                    {inviteLink || "Join invite link not ready yet."}
                  </div>
                  <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onPointerDown={consumeMarketplacePointerEvent}
                      onClick={() => void handleCreateInviteLink()}
                      style={actionBtn("primary", creatingInviteLink)}
                      disabled={creatingInviteLink}
                    >
                      {creatingInviteLink ? "Refreshing..." : "Create / Refresh"}
                    </button>
                    <button
                      type="button"
                      onPointerDown={consumeMarketplacePointerEvent}
                      onClick={() =>
                        copyMarketplaceLink(
                          inviteLink,
                          "Join invite link copied.",
                          "Join invite link is not ready yet."
                        )
                      }
                      style={actionBtn("secondary", !inviteLink)}
                      disabled={!inviteLink}
                    >
                      Copy Link
                    </button>
                    <button
                      type="button"
                      onPointerDown={consumeMarketplacePointerEvent}
                      onClick={handleOpenJoinLink}
                      style={actionBtn("secondary", !inviteLink)}
                      disabled={!inviteLink}
                    >
                      Open Link
                    </button>
                  </div>
                </div>

                <div style={innerCard("#FFFFFF")}>
                  <div style={sectionLabel()}>View this marketplace</div>
                  <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                    Share this when someone should see this community's outward
                    marketplace face directly.
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 13,
                      lineHeight: 1.5,
                      wordBreak: "break-word",
                    }}
                  >
                    {publicCommunityWorkspaceLink ||
                      "Marketplace view link not ready yet."}
                  </div>
                  <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onPointerDown={consumeMarketplacePointerEvent}
                      onClick={() =>
                        copyMarketplaceLink(
                          publicCommunityWorkspaceLink,
                          "Marketplace view link copied.",
                          "Marketplace view link is not ready yet."
                        )
                      }
                      style={actionBtn("secondary", !publicCommunityWorkspaceLink)}
                      disabled={!publicCommunityWorkspaceLink}
                    >
                      Copy Link
                    </button>
                    <button
                      type="button"
                      onPointerDown={consumeMarketplacePointerEvent}
                      onClick={() =>
                        openMarketplaceExternalLink(
                          publicCommunityWorkspaceLink,
                          "Marketplace view link is not ready yet."
                        )
                      }
                      style={actionBtn("secondary", !publicCommunityWorkspaceLink)}
                      disabled={!publicCommunityWorkspaceLink}
                    >
                      Open Link
                    </button>
                  </div>
                </div>

                <div style={innerCard("#FFFFFF")}>
                  <div style={sectionLabel()}>View this shop</div>
                  <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                    Share this when someone should see the same one-shop
                    storefront that follows you across marketplaces.
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 13,
                      lineHeight: 1.5,
                      wordBreak: "break-word",
                    }}
                  >
                    {publicShopViewLink || "Shop view link not ready yet."}
                  </div>
                  <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onPointerDown={consumeMarketplacePointerEvent}
                      onClick={() =>
                        copyMarketplaceLink(
                          publicShopViewLink,
                          "Shop view link copied.",
                          "Shop view link is not ready yet."
                        )
                      }
                      style={actionBtn("secondary", !publicShopViewLink)}
                      disabled={!publicShopViewLink}
                    >
                      Copy Link
                    </button>
                    <button
                      type="button"
                      onPointerDown={consumeMarketplacePointerEvent}
                      onClick={() =>
                        openMarketplaceExternalLink(
                          publicShopViewLink,
                          "Shop view link is not ready yet."
                        )
                      }
                      style={actionBtn("secondary", !publicShopViewLink)}
                      disabled={!publicShopViewLink}
                    >
                      Open Link
                    </button>
                  </div>
                </div>

                <div style={innerCard("#F8FBFF")}>
                  <div style={sectionLabel()}>Controlled outward links</div>
                  <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                    {controlledMarketplaceLinkNote}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={badge(false)}>Vault access is conditional</span>
                    <span style={badge(false)}>Vote-style access stays controlled</span>
                  </div>
                  <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {myShopTo ? (
                      <button
                        type="button"
                        onPointerDown={consumeMarketplacePointerEvent}
                        onClick={(event) => openMarketplaceRoute(event, myShopTo)}
                        style={actionBtn("secondary")}
                      >
                        Open Shop
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onPointerDown={consumeMarketplacePointerEvent}
                      onClick={(event) =>
                        openMarketplaceRoute(event, "/app/shop-control")
                      }
                      style={actionBtn("secondary")}
                    >
                      Open Shop Control
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        ) : null}
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
            <div style={sectionLabel()}>Member rows</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Browse members and open community-visible shop galleries from here.
              Private Vault Shops do not appear in this listing.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("members")}
            style={actionBtn("soft")}
          >
            {sectionsOpen.members ? "Collapse" : "Open"}
          </button>
        </div>

        <ExplainToggle
          label="What these member rows do"
          what="These rows show who is visible in the current community, which shop galleries can be opened, and which people may already fit the current support request."
          why="This keeps marketplace browsing and support decisions grounded in the same community view instead of forcing users to guess who is visible or relevant."
          next="Browse the rows first, open a shop gallery when you want to inspect a member's commercial presence, and only use someone as a guarantor when the fit signal appears."
          tone="light"
          style={{ marginTop: 12 }}
        />

        {sectionsOpen.members ? (
          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {memberRows.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No member rows are visible in this community yet.
              </div>
            ) : (
              memberRows.map((row, index) => {
                const fitSuggestion = suggestedSupporterMap.get(row.supportKey);
                const selected = selectedSupporterKeys.has(row.supportKey);

                return (
                  <div key={`${row.gmfnId || index}`} style={innerCard("#FCFEFF")}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isCompact
                          ? "1fr"
                          : "minmax(0, 1.15fr) minmax(0, 0.95fr) auto",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: "#0B1F33",
                            fontSize: 17,
                            fontWeight: 900,
                            lineHeight: 1.35,
                          }}
                        >
                          {row.name}
                        </div>

                        <div
                          style={{
                            marginTop: 6,
                            color: "#64748B",
                            fontSize: 13,
                            lineHeight: 1.65,
                          }}
                        >
                          {row.gmfnId ? `GMFN ID: ${row.gmfnId}` : "GMFN ID pending"}
                        </div>
                      </div>

                      <div>
                        <div
                          style={{
                            color: "#0B1F33",
                            fontSize: 15,
                            fontWeight: 800,
                            lineHeight: 1.35,
                          }}
                        >
                          {row.shopName}
                        </div>

                        <div
                          style={{
                            marginTop: 6,
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          {row.shopTo ? (
                            <span style={badge(true)}>Shop link available</span>
                          ) : (
                            <span style={badge(false)}>No visible shop yet</span>
                          )}

                          {fitSuggestion ? (
                            <span style={badge(false)}>Fit suggestion available</span>
                          ) : null}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: isCompact ? "flex-start" : "flex-end",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        {row.shopTo ? (
                          <OriginLink to={row.shopTo} style={actionBtn("secondary")}>
                            Open Shop Gallery
                          </OriginLink>
                        ) : (
                          <button type="button" style={actionBtn("secondary", true)} disabled>
                            No Shop Yet
                          </button>
                        )}

                        {fitSuggestion ? (
                          <button
                            type="button"
                            onClick={() => toggleMemberAsSupporter(row)}
                            style={selected ? actionBtn("primary") : actionBtn("soft")}
                          >
                            {selected ? "Selected" : "Use as Guarantor"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : null}
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Demand Box</div>

        <div
          style={{
            marginTop: 8,
            ...helperText(),
            maxWidth: 860,
          }}
        >
          Demand starts from marketplace life: a member needs something, and the
          community looks for who can answer it. The broader demand reading may
          combine upward, but this button should open the demand work from the
          current marketplace context.
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1fr auto",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div style={innerCard("#FCFEFF")}>
            <div style={sectionLabel()}>Current context</div>
            <div
              style={{
                marginTop: 8,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 16,
                lineHeight: 1.4,
              }}
            >
              {communityName(selectedCommunity)}
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badge(false)}>
                Community ID: {communityIdentity(selectedCommunity)}
              </span>
              <span style={badge(false)}>Member: {memberName}</span>
            </div>
          </div>

          <button
            type="button"
            onPointerDown={consumeMarketplacePointerEvent}
            onClick={(event) => openMarketplaceRoute(event, "/app/demand-box")}
            style={actionBtn("primary")}
          >
            Open Demand Box
          </button>
        </div>
      </section>

      <section
        id="marketplace-loans-support"
        ref={supportSectionRef}
        style={pageCard("#FFFFFF")}
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
            <div style={sectionLabel()}>Loans & Support</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Start a support request here. If guarantors are needed, the app can
              show suitable people to ask next.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(false)}>Active items: {activeLoanCount}</span>
            <button
              type="button"
              onClick={() => toggleSection("support")}
              style={actionBtn("soft")}
            >
              {sectionsOpen.support ? "Collapse" : "Open"}
            </button>
          </div>
        </div>

        <ExplainToggle
          label="What this support area does"
          what="This is where marketplace users begin a support request, read whether guarantors are needed, and continue into the borrowing flow when the draft becomes active."
          why="Support should feel connected to the current community and visible member context, not like a separate disconnected system."
          next="Start the request here, check the draft and fit signals below, then move into readiness, suggestions, or workbench only when the guided flow tells you to continue."
          tone="light"
          style={{ marginTop: 12 }}
        />

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
                <button
                  type="button"
                  onClick={() => void handleStartLoanDraft()}
                  disabled={startingLoanDraft}
                  style={actionBtn("primary", startingLoanDraft)}
                >
                  {startingLoanDraft ? "Starting..." : "Start Support Request"}
                </button>

                {loanDraftId ? (
                  <button
                    type="button"
                    onClick={() => void handleRefreshSuggestions()}
                    disabled={loadingSuggestions}
                    style={actionBtn("secondary", loadingSuggestions)}
                  >
                    {loadingSuggestions ? "Refreshing..." : "Refresh Fit Check"}
                  </button>
                ) : null}

                {loanDraftId ? (
                  <button
                    type="button"
                    onClick={() => void handleCancelLoanDraft()}
                    disabled={cancellingLoanDraft}
                    style={actionBtn("secondary", cancellingLoanDraft)}
                  >
                    {cancellingLoanDraft ? "Cancelling..." : "Cancel Draft"}
                  </button>
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
                <button
                  type="button"
                  onPointerDown={consumeMarketplacePointerEvent}
                  onClick={(event) =>
                    openMarketplaceRoute(event, "/app/loan-readiness")
                  }
                  style={actionBtn("soft")}
                >
                  Loan Readiness
                </button>
                <button
                  type="button"
                  onPointerDown={consumeMarketplacePointerEvent}
                  onClick={(event) =>
                    openMarketplaceRoute(event, "/app/loan-suggestions")
                  }
                  style={actionBtn("soft")}
                >
                  Loan Suggestions
                </button>
                <button
                  type="button"
                  onPointerDown={consumeMarketplacePointerEvent}
                  onClick={(event) =>
                    openMarketplaceRoute(event, "/app/loan-workbench")
                  }
                  style={actionBtn("soft")}
                >
                  Loan Workbench
                </button>
                <button
                  type="button"
                  onPointerDown={consumeMarketplacePointerEvent}
                  onClick={openFinance}
                  style={actionBtn("soft")}
                >
                  Finance
                </button>
                <button
                  type="button"
                  onPointerDown={consumeMarketplacePointerEvent}
                  onClick={(event) => openMarketplaceRoute(event, "/app/loans")}
                  style={actionBtn("soft")}
                >
                  Full Loans View
                </button>
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

                                  <button
                                    type="button"
                                    onClick={() => toggleSuggestedSupporter(item)}
                                    style={
                                      selected
                                        ? actionBtn("primary")
                                        : actionBtn("secondary")
                                    }
                                  >
                                    {selected ? "Selected" : "Choose"}
                                  </button>
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
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => toggleSuggestedSupporter(item)}
                                style={actionBtn("soft")}
                              >
                                {item.name} ×
                              </button>
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
                        <button
                          type="button"
                          onClick={() => void handleSendGuarantorRequests()}
                          disabled={
                            sendingGuarantorRequests ||
                            requiredGuarantorCount <= 0 ||
                            visibleSelectedSupporters.length < requiredGuarantorCount ||
                            loanStatusLower === "approved"
                          }
                          style={actionBtn(
                            "primary",
                            sendingGuarantorRequests ||
                              requiredGuarantorCount <= 0 ||
                              visibleSelectedSupporters.length < requiredGuarantorCount ||
                              loanStatusLower === "approved"
                          )}
                        >
                          {sendingGuarantorRequests
                            ? "Sending..."
                            : loanStatusLower === "approved"
                            ? "Already Approved"
                            : "Send Guarantor Requests"}
                        </button>

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
    </div>
  );
}


