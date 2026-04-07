import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
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

type GuarantorPick = {
  key: string;
  userId?: number;
  gmfnId?: string;
  name: string;
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
type CollapseKey = "profile" | "tools" | "members" | "loan";

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

function positiveNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function hasVisibleValue(value: any): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function mergeFirstVisible(...rows: any[]): any {
  const out: any = {};

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;

    for (const [key, value] of Object.entries(row)) {
      if (!hasVisibleValue(out[key]) && hasVisibleValue(value)) {
        out[key] = value;
      }
    }
  }

  return out;
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

function getClanRecordId(row: any): number {
  return positiveNumber(row?.id || row?.clan_id || row?.community_id);
}

function buildSelectedCommunity(currentClan: any, clanRows: any[]): any {
  const currentId = getClanRecordId(currentClan);
  const matchedRow =
    clanRows.find((row: any) => getClanRecordId(row) === currentId) || null;
  const firstRow = clanRows[0] || null;

  return {
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
    } catch {}
  }

  if (webOrigin) {
    out.push(webOrigin);

    try {
      const u = new URL(webOrigin);
      if (u.hostname) {
        out.push(`${u.protocol}//${u.hostname}:8012`);
      }
    } catch {}
  }

  out.push("http://127.0.0.1:8012");
  out.push("http://localhost:8012");

  return dedupeStrings(out);
}

function addCacheBust(url: string, seed: number): string {
  const raw = safeStr(url);
  if (!raw || !seed) return raw;
  if (
    raw.startsWith("blob:") ||
    raw.startsWith("data:") ||
    raw.includes("v=")
  ) {
    return raw;
  }

  const joiner = raw.includes("?") ? "&" : "?";
  return `${raw}${joiner}v=${seed}`;
}

function buildResolvedMediaCandidates(src: string, seed = 0): string[] {
  const raw = safeStr(src);
  if (!raw) return [];

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("blob:") ||
    raw.startsWith("data:")
  ) {
    return [addCacheBust(raw, seed)];
  }

  const origins = getMediaOrigins();
  const trimmed = raw.replace(/^\/+/, "");
  const out: string[] = [];

  if (raw.startsWith("/")) {
    for (const origin of origins) {
      out.push(addCacheBust(`${origin}${raw}`, seed));
    }
  } else {
    for (const origin of origins) {
      out.push(addCacheBust(`${origin}/${trimmed}`, seed));
    }
  }

  out.push(addCacheBust(raw, seed));
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

function collectCommunityImageSources(clan: any): string[] {
  const rows = [
    clan,
    clan?.community,
    clan?.profile,
    clan?.marketplace,
    clan?.clan,
    clan?.meta,
  ];

  const out: string[] = [];

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;

    for (const field of IMAGE_FIELD_NAMES) {
      const value = safeStr((row as any)?.[field]);
      if (value) out.push(value);
    }
  }

  const nested = getNestedImageCandidate(clan);
  if (nested) out.push(nested);

  return dedupeStrings(out);
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

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    background: primary ? "rgba(11,99,209,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#0B63D1" : "#51657A",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  };
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
      background: disabled ? "#CBD5E1" : "#0B63D1",
      color: "#FFFFFF",
      fontWeight: 900,
      fontSize: 14,
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "nowrap",
      opacity: disabled ? 0.86 : 1,
    };
  }

  if (kind === "soft") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 40,
      padding: "9px 12px",
      borderRadius: 13,
      border: "1px solid rgba(11,31,51,0.08)",
      background: "#F8FBFF",
      color: disabled ? "#94A3B8" : "#24415C",
      fontWeight: 800,
      fontSize: 13,
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "nowrap",
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
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
    opacity: disabled ? 0.86 : 1,
  };
}

function collapseToggle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: "#24415C",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
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
    color: tone === "success" ? "#166534" : "#991B1B",
    border:
      tone === "success"
        ? "1px solid rgba(34,197,94,0.16)"
        : "1px solid rgba(239,68,68,0.16)",
    fontWeight: 800,
  };
}

function communityImageBox(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 260,
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "linear-gradient(180deg, #E8F0FF 0%, #DDEBFF 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };
}

function getCommunityName(clan: any): string {
  return firstTruthy(
    clan?.name,
    clan?.clan_name,
    clan?.marketplace_name,
    clan?.community?.name,
    clan?.marketplace?.name,
    "Selected community"
  );
}

function getCommunityDescription(clan: any): string {
  return firstTruthy(
    clan?.description,
    clan?.clan_description,
    clan?.marketplace_description,
    clan?.community?.description,
    clan?.marketplace?.description,
    "This selected community surface contains the community identity, the member rows, the loan path, and the link to each member’s Shop Gallery."
  );
}

function getCommunityGlobalId(clan: any): string {
  return firstTruthy(
    clan?.community_global_id,
    clan?.global_id,
    clan?.gmfn_id,
    clan?.clan_code,
    clan?.code,
    clan?.marketplace_code,
    clan?.community?.community_global_id,
    clan?.community?.global_id,
    clan?.community?.gmfn_id,
    clan?.id ? `COMM-${clan.id}` : "",
    "Pending"
  );
}

function getCommunityTrustLabel(clan: any): string {
  return firstTruthy(
    clan?.community_trust_band,
    clan?.trust_band,
    clan?.trust_class,
    clan?.reputation_band,
    clan?.status,
    clan?.community?.community_trust_band,
    clan?.community?.trust_band,
    "Visible community"
  );
}

function getMemberName(member: ClanMember): string {
  return firstTruthy(
    member?.display_name,
    member?.nickname,
    [safeStr(member?.first_name), safeStr(member?.surname)]
      .filter(Boolean)
      .join(" "),
    member?.email,
    member?.phone_e164,
    "Member"
  );
}

function getMemberGmfnId(member: ClanMember): string {
  return firstTruthy(member?.gmfn_id);
}

function getMemberUserId(member: ClanMember): number {
  return positiveNumber(member?.user_id || member?.id);
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
  return firstTruthy(
    payload?.url,
    payload?.invite_url,
    payload?.link,
    payload?.invite_link
  );
}

function getCurrentPageUrl(): string {
  try {
    if (typeof window === "undefined") return "";
    return window.location.href;
  } catch {
    return "";
  }
}

function normalizeLoan(raw: any): LoanSupportItem | null {
  if (!raw) return null;

  const src = raw?.item || raw?.loan || raw;

  const id = positiveNumber(firstDefined(src?.id, src?.loan_id));
  const clanId = positiveNumber(firstDefined(src?.clan_id, src?.community_id));

  const role = firstTruthy(
    src?.role,
    src?.my_role,
    src?.participant_role,
    src?.is_guarantor ? "Guarantor" : "",
    src?.is_borrower ? "Borrower" : ""
  );

  return {
    id: id || undefined,
    clan_id: clanId || undefined,
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
    role,
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

function getLoanAmountText(item: LoanSupportItem): string {
  const value = safeStr(item?.amount);
  const currency = safeStr(item?.currency);

  if (!value && !currency) return "Amount pending";
  if (value && currency) return `${value} ${currency}`;
  return value || currency || "Amount pending";
}

function getLoanStatusText(item: LoanSupportItem): string {
  return firstTruthy(item?.status, "Open");
}

function getLoanRoleText(item: LoanSupportItem): string {
  return firstTruthy(item?.role, "Support");
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
  return (total / count).toFixed(2);
}

function guarantorKeyFromParts(userId?: number, gmfnId?: string): string {
  if (Number(userId || 0) > 0) return `u-${Number(userId)}`;
  return `g-${safeStr(gmfnId).toUpperCase()}`;
}

function StableAuthImage(props: {
  candidates: string[];
  alt: string;
  clanId?: number;
  style: React.CSSProperties;
  fallback: React.ReactNode;
}) {
  const { candidates, alt, clanId, style, fallback } = props;
  const [resolvedSrc, setResolvedSrc] = useState("");
  const candidateKey = useMemo(() => candidates.join("|"), [candidates]);

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
      const uniqueCandidates = dedupeStrings(candidates);

      for (const candidate of uniqueCandidates) {
        const url = safeStr(candidate);
        if (!url) continue;

        try {
          const headers: Record<string, string> = {};
          if (token) headers["Authorization"] = `Bearer ${token}`;
          if (positiveNumber(clanId)) headers["X-Clan-Id"] = String(clanId);

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
          // try direct load next
        }

        try {
          const ok = await preloadDirect(url);
          if (ok) {
            if (!alive) return;
            setResolvedSrc(url);
            return;
          }
        } catch {
          // move on
        }
      }
    }

    void run();

    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [candidateKey, clanId]);

  if (resolvedSrc) {
    return <img src={resolvedSrc} alt={alt} style={style} />;
  }

  return <>{fallback}</>;
}

export default function MarketplacePage() {
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [me, setMe] = useState<any>(null);
  const [selectedClan, setSelectedClan] = useState<any>(null);
  const [members, setMembers] = useState<ClanMember[]>([]);
  const [shops, setShops] = useState<MarketplaceShop[]>([]);
  const [poolInfo, setPoolInfo] = useState<any>(null);
  const [inviteLink, setInviteLink] = useState<string>("");
  const [loans, setLoans] = useState<LoanSupportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(
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
  const [selectedGuarantors, setSelectedGuarantors] = useState<
    GuarantorPick[]
  >([]);
  const [suggestedSupporters, setSuggestedSupporters] = useState<
    SuggestedSupporter[]
  >([]);
  const [loanDraftId, setLoanDraftId] = useState<number>(0);
  const [loanDraftSummary, setLoanDraftSummary] =
    useState<LoanDraftSummary | null>(null);
  const [loanSuggestionRaw, setLoanSuggestionRaw] = useState<any>(null);

  const [startingLoanDraft, setStartingLoanDraft] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [sendingGuarantorRequests, setSendingGuarantorRequests] =
    useState(false);
  const [cancellingLoanDraft, setCancellingLoanDraft] = useState(false);

  const [collapsed, setCollapsed] = useState<Record<CollapseKey, boolean>>({
    profile: false,
    tools: true,
    members: false,
    loan: false,
  });

  const selectedClanId = Number(getSelectedClanId() || 0);

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

  async function reloadSelectedCommunity(preferredCommunityId?: number) {
    const [currentClanRes, clansRes] = await Promise.all([
      getCurrentClan().catch(() => null),
      listMyClans().catch(() => ({ items: [] })),
    ]);

    const clanRows = Array.isArray(clansRes)
      ? clansRes
      : Array.isArray(clansRes?.items)
      ? clansRes.items
      : [];

    let resolvedClan = buildSelectedCommunity(currentClanRes, clanRows);

    if (!getClanRecordId(resolvedClan) && positiveNumber(preferredCommunityId)) {
      resolvedClan =
        clanRows.find(
          (row: any) =>
            getClanRecordId(row) === positiveNumber(preferredCommunityId)
        ) || resolvedClan;
    }

    setSelectedClan(getClanRecordId(resolvedClan) ? resolvedClan : null);
    return resolvedClan;
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const [meRes, currentClanRes, clansRes] = await Promise.all([
          getMe().catch(() => null),
          getCurrentClan().catch(() => null),
          listMyClans().catch(() => ({ items: [] })),
        ]);

        if (!alive) return;

        const clanRows = Array.isArray(clansRes)
          ? clansRes
          : Array.isArray(clansRes?.items)
          ? clansRes.items
          : [];

        const resolvedClan = buildSelectedCommunity(currentClanRes, clanRows);

        setMe(meRes || null);
        setSelectedClan(getClanRecordId(resolvedClan) ? resolvedClan : null);
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const communityId = useMemo(() => {
    return Number(
      selectedClan?.id || selectedClan?.clan_id || selectedClanId || 0
    );
  }, [selectedClan, selectedClanId]);

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  function toggleSection(key: CollapseKey) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function resetLoanTaskState(opts?: { clearInputs?: boolean }) {
    setSelectedGuarantors([]);
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

  function applyCommunityImageLocally(imageUrl: string | null) {
    const value = safeStr(imageUrl) || "";

    function patchRow(row: any) {
      if (!row || typeof row !== "object") return row;

      const patch: any = { ...row };
      for (const field of IMAGE_FIELD_NAMES) {
        patch[field] = value;
      }
      return patch;
    }

    setSelectedClan((prev: any) => {
      if (!prev) return prev;

      return patchRow({
        ...prev,
        community: patchRow(prev?.community),
        profile: patchRow(prev?.profile),
        marketplace: patchRow(prev?.marketplace),
        clan: patchRow(prev?.clan),
        meta: patchRow(prev?.meta),
      });
    });
  }

  async function reloadLoansForCommunity(currentCommunityId: number) {
    const loansRes = await listMyLoans().catch(() => []);
    const loanRows = Array.isArray(loansRes)
      ? loansRes
      : Array.isArray((loansRes as any)?.items)
      ? (loansRes as any).items
      : [];

    const normalizedLoans = loanRows
      .map((row: any) => normalizeLoan(row))
      .filter(Boolean) as LoanSupportItem[];

    const filteredLoans =
      normalizedLoans.filter((item) => {
        const loanClanId = Number(item?.clan_id || 0);
        return loanClanId <= 0 || loanClanId === currentCommunityId;
      }) || [];

    setLoans(filteredLoans);
  }

  async function loadLoanDraftContext(
    loanId: number,
    currentCommunityId: number
  ) {
    const [summaryRes, suggestionsRes] = await Promise.all([
      getLoanSummary(loanId).catch(() => null),
      getLoanGuarantorSuggestions(loanId, {
        clan_id: currentCommunityId,
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

  useEffect(() => {
    resetLoanTaskState({ clearInputs: true });
    setCommunityPictureUrl("");
    setCommunityPictureFileInputKey((x) => x + 1);
    setCommunityPictureRefreshSeed((x) => x + 1);
  }, [communityId]);

  useEffect(() => {
    let alive = true;

    if (!communityId) {
      setMembers([]);
      setShops([]);
      setPoolInfo(null);
      setInviteLink("");
      setLoans([]);
      return;
    }

    (async () => {
      const [membersRes, shopsRes, poolRes, inviteRes, loansRes] =
        await Promise.all([
          listClanMembers(communityId).catch(() => ({ items: [] })),
          getMarketplaceShops({ clan_id: communityId, limit: 200 }).catch(
            () => ({ items: [] })
          ),
          getPoolMe("NGN", 20).catch(() => null),
          getClanInviteLink(communityId).catch(() => null),
          listMyLoans().catch(() => []),
        ]);

      if (!alive) return;

      const memberRows: ClanMember[] = Array.isArray(membersRes)
        ? membersRes
        : Array.isArray(membersRes?.items)
        ? membersRes.items
        : [];

      const shopRows: MarketplaceShop[] = Array.isArray(shopsRes)
        ? shopsRes
        : Array.isArray(shopsRes?.items)
        ? shopsRes.items
        : [];

      const loanRows = Array.isArray(loansRes)
        ? loansRes
        : Array.isArray((loansRes as any)?.items)
        ? (loansRes as any).items
        : [];

      const normalizedLoans = loanRows
        .map((row: any) => normalizeLoan(row))
        .filter(Boolean) as LoanSupportItem[];

      const filteredLoans =
        normalizedLoans.filter((item) => {
          const loanClanId = Number(item?.clan_id || 0);
          return loanClanId <= 0 || loanClanId === communityId;
        }) || [];

      setMembers(memberRows);
      setShops(shopRows);
      setPoolInfo(poolRes);
      setLoans(filteredLoans);
      setInviteLink(getInviteUrl(inviteRes));
    })();

    return () => {
      alive = false;
    };
  }, [communityId]);

  const loanStatusLower = safeStr(loanDraftSummary?.status).toLowerCase();
  const loanDraftIsFinal = [
    "approved",
    "repaid",
    "cancelled",
    "defaulted",
    "closed",
    "completed",
  ].includes(loanStatusLower);

  const loanDraftIsActive = Boolean(loanDraftId && !loanDraftIsFinal);

  useEffect(() => {
    if (loanDraftIsActive) {
      setCollapsed((prev) => ({
        ...prev,
        profile: true,
        tools: true,
        members: false,
        loan: false,
      }));
      return;
    }

    if (loanDraftId && loanDraftIsFinal) {
      setCollapsed({
        profile: false,
        tools: true,
        members: false,
        loan: false,
      });
    }
  }, [loanDraftIsActive, loanDraftIsFinal, loanDraftId]);

  useEffect(() => {
    if (!loanDraftId || !communityId || !loanDraftIsActive) return;

    const timer = window.setInterval(() => {
      (async () => {
        try {
          await loadLoanDraftContext(loanDraftId, communityId);
          await reloadLoansForCommunity(communityId);
        } catch {
          // silent refresh
        }
      })();
    }, 10000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loanDraftId, communityId, loanDraftIsActive]);

  const myUserId = positiveNumber(me?.id);
  const myGmfnId = safeStr(me?.gmfn_id || "").toUpperCase();

  const communityName = getCommunityName(selectedClan);
  const communityDescription = getCommunityDescription(selectedClan);
  const communityGlobalId = getCommunityGlobalId(selectedClan);
  const communityTrust = getCommunityTrustLabel(selectedClan);

  const communityImageCandidates = useMemo(() => {
    const rawSources = dedupeStrings([
      communityPictureUrl,
      ...collectCommunityImageSources(selectedClan),
    ]);

    return dedupeStrings(
      rawSources.flatMap((src: string) =>
        buildResolvedMediaCandidates(src, communityPictureRefreshSeed)
      )
    );
  }, [communityPictureUrl, selectedClan, communityPictureRefreshSeed]);

  const hasCommunityPicture =
    Boolean(communityPictureUrl) || communityImageCandidates.length > 0;

  const poolAmount = getPoolAmountText(poolInfo);
  const poolCurrency = getPoolCurrency(poolInfo);

  const memberRows = useMemo(() => {
    const rows = members.map((member: ClanMember) => {
      const shop = getShopForMember(member, shops);
      const gmfnId = getMemberGmfnId(member);
      const userId = getMemberUserId(member);
      const memberName = getMemberName(member);
      const shopName = firstTruthy(shop?.name, "No visible shop yet");

      const isSelf = Boolean(
        (myUserId > 0 && userId > 0 && myUserId === userId) ||
          (myGmfnId &&
            gmfnId &&
            myGmfnId === safeStr(gmfnId).toUpperCase())
      );

      const guarantorKey = guarantorKeyFromParts(userId, gmfnId);

      return {
        member,
        memberName,
        gmfnId,
        userId,
        isSelf,
        guarantorKey,
        shopName,
        shop,
        shopTo: gmfnId ? `/app/shop/${encodeURIComponent(gmfnId)}` : "",
      };
    });

    rows.sort((a, b) => a.memberName.localeCompare(b.memberName));
    return rows;
  }, [members, shops, myUserId, myGmfnId]);

  const activeLoanCount = useMemo(() => {
    return loans.filter((item) => {
      const status = safeStr(item?.status).toLowerCase();
      return (
        status !== "closed" &&
        status !== "completed" &&
        status !== "repaid"
      );
    }).length;
  }, [loans]);

  const selectedGuarantorKeys = useMemo(() => {
    return new Set(selectedGuarantors.map((item) => item.key));
  }, [selectedGuarantors]);

  const suggestedSupporterKeys = useMemo(() => {
    return new Set(suggestedSupporters.map((item) => item.key));
  }, [suggestedSupporters]);

  const requiredGuarantorCount = positiveNumber(
    loanDraftSummary?.guarantors_required
  );
  const sentGuarantorCount = positiveNumber(loanDraftSummary?.guarantors_total);
  const approvedGuarantorCount = positiveNumber(
    loanDraftSummary?.approved_guarantors
  );

  const effectivePreparedGuarantorCount =
    sentGuarantorCount + selectedGuarantors.length;

  const remainingGuarantorsNeeded = useMemo(() => {
    if (!requiredGuarantorCount) return 0;
    return Math.max(
      requiredGuarantorCount - effectivePreparedGuarantorCount,
      0
    );
  }, [requiredGuarantorCount, effectivePreparedGuarantorCount]);

  const waitingForResponses = useMemo(() => {
    if (!loanDraftIsActive) return false;
    if (requiredGuarantorCount <= 0) return false;
    if (sentGuarantorCount <= 0) return false;
    if (remainingGuarantorsNeeded > 0) return false;
    if (selectedGuarantors.length > 0) return false;
    return approvedGuarantorCount < requiredGuarantorCount;
  }, [
    loanDraftIsActive,
    requiredGuarantorCount,
    sentGuarantorCount,
    remainingGuarantorsNeeded,
    selectedGuarantors.length,
    approvedGuarantorCount,
  ]);

  const taskStepLabel = useMemo(() => {
    if (!loanDraftId) return "Step 1: Start loan draft";
    if (loanStatusLower === "approved") return "Finished";
    if (requiredGuarantorCount <= 0) return "Step 2: Monitor support result";
    if (waitingForResponses) return "Step 4: Wait for responses";
    if (remainingGuarantorsNeeded > 0) return "Step 2: Select fit guarantors";
    if (selectedGuarantors.length > 0) return "Step 3: Send guarantor requests";
    return "Step 2: Review fit result";
  }, [
    loanDraftId,
    loanStatusLower,
    requiredGuarantorCount,
    waitingForResponses,
    remainingGuarantorsNeeded,
    selectedGuarantors.length,
  ]);

  const loanGuideMessage = useMemo(() => {
    const messageFromBackend = extractSuggestionMessage(loanSuggestionRaw);

    if (!loanDraftId) {
      return "Start with amount and duration. The app will create the draft, check fit, tell you the guarantor requirement, and keep the rest of the task calm until you reach the next valid step.";
    }

    if (loanStatusLower === "approved") {
      return "This request has already been covered inside your current support path. No guarantor action is needed now.";
    }

    if (waitingForResponses) {
      const remainingApprovals = Math.max(
        requiredGuarantorCount - approvedGuarantorCount,
        0
      );

      return `Guarantor requests were sent. ${remainingApprovals} approval${
        remainingApprovals === 1 ? "" : "s"
      } still pending. Watch Notifications and this page for updates.`;
    }

    if (messageFromBackend) return messageFromBackend;

    if (requiredGuarantorCount > 0 && suggestedSupporters.length === 0) {
      return `This loan draft needs ${requiredGuarantorCount} guarantor${
        requiredGuarantorCount === 1 ? "" : "s"
      }, but the system has not returned a fit list yet. Refresh fit check, reduce the amount, or cancel the draft and start again.`;
    }

    if (requiredGuarantorCount > 0) {
      return `This loan draft needs ${requiredGuarantorCount} guarantor${
        requiredGuarantorCount === 1 ? "" : "s"
      }. Use the fit suggestions and the member rows below before sending requests.`;
    }

    return "Use the member rows and support tools to continue the next step.";
  }, [
    loanDraftId,
    loanStatusLower,
    waitingForResponses,
    requiredGuarantorCount,
    approvedGuarantorCount,
    suggestedSupporters.length,
    loanSuggestionRaw,
  ]);

  const selectionProgressMessage = useMemo(() => {
    if (!loanDraftId || loanStatusLower === "approved") return "";

    if (requiredGuarantorCount <= 0) {
      return "This loan draft does not currently need guarantors.";
    }

    if (waitingForResponses) {
      const remainingApprovals = Math.max(
        requiredGuarantorCount - approvedGuarantorCount,
        0
      );

      return `Requests sent. ${remainingApprovals} approval${
        remainingApprovals === 1 ? "" : "s"
      } still pending. Wait for responses.`;
    }

    if (effectivePreparedGuarantorCount === 0) {
      return `You need ${requiredGuarantorCount} guarantor${
        requiredGuarantorCount === 1 ? "" : "s"
      }. Select people below before the request can move forward.`;
    }

    if (remainingGuarantorsNeeded > 0) {
      return `Required guarantors: ${requiredGuarantorCount}. Already requested: ${sentGuarantorCount}. Newly selected: ${selectedGuarantors.length}. ${remainingGuarantorsNeeded} more remaining before this request can move forward.`;
    }

    if (selectedGuarantors.length > 0) {
      return "You have selected enough guarantors for this draft. You can now send the guarantor requests.";
    }

    return "The guarantor requirement is currently covered. Wait for responses.";
  }, [
    loanDraftId,
    loanStatusLower,
    requiredGuarantorCount,
    waitingForResponses,
    approvedGuarantorCount,
    effectivePreparedGuarantorCount,
    remainingGuarantorsNeeded,
    sentGuarantorCount,
    selectedGuarantors.length,
  ]);

  const canSendGuarantorRequests = useMemo(() => {
    if (!loanDraftId) return false;
    if (loanStatusLower === "approved") return false;
    if (requiredGuarantorCount <= 0) return false;
    if (selectedGuarantors.length === 0) return false;
    if (remainingGuarantorsNeeded > 0) return false;
    if (suggestedSupporters.length === 0) return false;

    const unfitSelected = selectedGuarantors.filter(
      (item) => !suggestedSupporterKeys.has(item.key)
    );

    return unfitSelected.length === 0;
  }, [
    loanDraftId,
    loanStatusLower,
    requiredGuarantorCount,
    selectedGuarantors,
    remainingGuarantorsNeeded,
    suggestedSupporters.length,
    suggestedSupporterKeys,
  ]);

  const sendButtonLabel = useMemo(() => {
    if (sendingGuarantorRequests) return "Sending...";
    if (!loanDraftId) return "Send Guarantor Requests";
    if (loanStatusLower === "approved") return "Already Approved";
    if (waitingForResponses) return "Requests Sent";
    if (requiredGuarantorCount > 0 && remainingGuarantorsNeeded > 0) {
      return `Need ${remainingGuarantorsNeeded} more guarantor${
        remainingGuarantorsNeeded === 1 ? "" : "s"
      }`;
    }
    if (selectedGuarantors.length === 0) return "Choose Guarantors";
    if (suggestedSupporters.length === 0) return "No Fit Guarantor Yet";
    return "Send Guarantor Requests";
  }, [
    sendingGuarantorRequests,
    loanDraftId,
    loanStatusLower,
    waitingForResponses,
    requiredGuarantorCount,
    remainingGuarantorsNeeded,
    selectedGuarantors.length,
    suggestedSupporters.length,
  ]);

  function copyInviteLink() {
    if (!inviteLink) {
      showNotice("error", "Invite link is not ready yet.");
      return;
    }

    safeCopy(inviteLink);
    showNotice("success", "Invite link copied.");
  }

  function copyTrustLink() {
    const pageUrl = getCurrentPageUrl();
    if (!pageUrl) {
      showNotice("error", "Community link is not available.");
      return;
    }

    safeCopy(pageUrl);
    showNotice("success", "Community link copied.");
  }

  function copyCommunityId() {
    if (!communityGlobalId) {
      showNotice("error", "Community ID is not available.");
      return;
    }

    safeCopy(communityGlobalId);
    showNotice("success", "Community ID copied.");
  }

  function toggleGuarantorFromRow(row: {
    guarantorKey: string;
    userId: number;
    gmfnId: string;
    memberName: string;
    isSelf: boolean;
  }) {
    if (row.isSelf) return;
    if (!row.userId && !row.gmfnId) return;

    setSelectedGuarantors((prev) => {
      const exists = prev.some((item) => item.key === row.guarantorKey);
      if (exists) {
        return prev.filter((item) => item.key !== row.guarantorKey);
      }

      return [
        ...prev,
        {
          key: row.guarantorKey,
          userId: row.userId || undefined,
          gmfnId: row.gmfnId || undefined,
          name: row.memberName,
        },
      ];
    });
  }

  function addSuggestedSupporter(item: SuggestedSupporter) {
    setSelectedGuarantors((prev) => {
      if (prev.some((entry) => entry.key === item.key)) {
        return prev;
      }

      return [
        ...prev,
        {
          key: item.key,
          userId: item.userId,
          gmfnId: item.gmfnId,
          name: item.name,
        },
      ];
    });
  }

  function removeSelectedGuarantor(key: string) {
    setSelectedGuarantors((prev) => prev.filter((item) => item.key !== key));
  }

  async function handleUploadCommunityPicture(file: File | null) {
    if (!file) return;

    if (!communityId) {
      showNotice("error", "Select a community before uploading a picture.");
      return;
    }

    setUploadingCommunityPicture(true);

    try {
      const uploadRes = await uploadCommunityProfileImageFile(file, communityId);

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
          clan_id: communityId,
          image_url: imageUrl,
        });
      } catch {
        await (setCommunityProfileImage as any)(communityId, imageUrl);
      }

      setCommunityPictureUrl(imageUrl);
      applyCommunityImageLocally(imageUrl);
      setCommunityPictureRefreshSeed((x) => x + 1);
      await reloadSelectedCommunity(communityId).catch(() => null);

      showNotice("success", "Community picture updated successfully.");
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
    if (!communityId) {
      showNotice("error", "Select a community before removing a picture.");
      return;
    }

    setRemovingCommunityPicture(true);

    try {
      await removeCommunityProfileImage(communityId);
      setCommunityPictureUrl("");
      applyCommunityImageLocally(null);
      setCommunityPictureRefreshSeed((x) => x + 1);
      await reloadSelectedCommunity(communityId).catch(() => null);

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

  async function handleStartLoanDraft() {
    if (!communityId) {
      showNotice("error", "Select a community before starting a loan request.");
      return;
    }

    if (loanDraftIsActive) {
      showNotice(
        "error",
        "Finish or cancel the current loan draft before starting another one."
      );
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
        clan_id: communityId,
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
          "Loan request started, but the system did not return a usable loan ID."
        );
      }

      const loaded = await loadLoanDraftContext(createdLoanId, communityId);
      await reloadLoansForCommunity(communityId);

      if (safeStr(loaded.summary?.status).toLowerCase() === "approved") {
        showNotice(
          "success",
          "Loan request created and covered immediately. No guarantor action is needed."
        );
        setCollapsed({
          profile: false,
          tools: true,
          members: false,
          loan: false,
        });
      } else {
        showNotice(
          "success",
          "Loan draft created. The page is now guiding you through fit check and guarantor selection."
        );
        setCollapsed((prev) => ({
          ...prev,
          profile: true,
          tools: true,
          members: false,
          loan: false,
        }));
      }
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Loan request could not be started."
      );
    } finally {
      setStartingLoanDraft(false);
    }
  }

  async function handleRefreshSuggestions() {
    if (!loanDraftId || !communityId) {
      showNotice("error", "Start the loan request first.");
      return;
    }

    setLoadingSuggestions(true);

    try {
      const loaded = await loadLoanDraftContext(loanDraftId, communityId);

      if (safeStr(loaded.summary?.status).toLowerCase() === "approved") {
        showNotice(
          "success",
          "This loan request is already approved. No guarantor step is needed now."
        );
        return;
      }

      if ((loaded.suggestions || []).length === 0) {
        showNotice(
          "error",
          "No fit guarantor suggestion was returned for this amount right now."
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

  async function handleSendGuarantorRequests() {
    if (!communityId) {
      showNotice("error", "Select a community before sending the request.");
      return;
    }

    if (!loanDraftId) {
      showNotice("error", "Start the loan request first.");
      return;
    }

    if (loanStatusLower === "approved") {
      showNotice(
        "success",
        "This loan draft is already approved. No guarantor requests are needed."
      );
      return;
    }

    if (requiredGuarantorCount <= 0) {
      showNotice("error", "This loan draft does not currently need guarantors.");
      return;
    }

    if (selectedGuarantors.length === 0) {
      showNotice(
        "error",
        "Choose the remaining guarantors from the member rows before sending requests."
      );
      return;
    }

    if (remainingGuarantorsNeeded > 0) {
      showNotice(
        "error",
        `You still need ${remainingGuarantorsNeeded} more guarantor${
          remainingGuarantorsNeeded === 1 ? "" : "s"
        }. Select more people before this request can move forward.`
      );
      return;
    }

    if (suggestedSupporters.length === 0) {
      showNotice(
        "error",
        "The system did not find fit guarantors for this amount yet. Reduce the amount, refresh fit check, or cancel the draft."
      );
      return;
    }

    const unfitSelected = selectedGuarantors.filter(
      (item) => !suggestedSupporterKeys.has(item.key)
    );

    if (unfitSelected.length > 0) {
      showNotice(
        "error",
        `These selected guarantors are not fit for this amount in the current system check: ${unfitSelected
          .map((x) => x.name)
          .join(", ")}.`
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

      const suggestedMap = new Map<string, SuggestedSupporter>(
        suggestedSupporters.map((item) => [item.key, item])
      );

      const fallbackSplit = computePerGuarantorPledge(
        targetAmount > 0 ? targetAmount : Number(loanAmount || 0),
        selectedGuarantors.length
      );

      for (const guarantor of selectedGuarantors) {
        const suggested = suggestedMap.get(guarantor.key);
        const pledgeAmount =
          safeStr(suggested?.recommendedPledge) || fallbackSplit;

        if (!guarantor.userId) {
          throw new Error(
            `Selected guarantor '${guarantor.name}' does not have a usable user ID for request delivery.`
          );
        }

        await addLoanGuarantorRequest({
          loan_id: loanDraftId,
          guarantor_user_id: guarantor.userId,
          pledge_amount: pledgeAmount,
          clan_id: communityId,
        });
      }

      await loadLoanDraftContext(loanDraftId, communityId);
      await reloadLoansForCommunity(communityId);
      setSelectedGuarantors([]);

      showNotice(
        "success",
        "Your request was sent successfully. Wait for their response."
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
      resetLoanTaskState();
      setCollapsed({
        profile: false,
        tools: true,
        members: false,
        loan: false,
      });
      showNotice(
        "success",
        "Loan draft focus cleared. You can start again when ready."
      );
      return;
    }

    setCancellingLoanDraft(true);

    try {
      await cancelLoanRequest(loanDraftId, {
        clan_id: communityId || undefined,
      }).catch(() => null);

      await reloadLoansForCommunity(communityId);
      resetLoanTaskState();

      setCollapsed({
        profile: false,
        tools: true,
        members: false,
        loan: false,
      });

      showNotice(
        "success",
        "Loan draft cancelled. You can adjust the amount and start again when ready."
      );
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Loan draft could not be cancelled."
      );
    } finally {
      setCancellingLoanDraft(false);
    }
  }

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
        <PageTopNav
          sectionLabel="Marketplace"
          title="Selected community marketplace"
          subtitle="Preparing your selected community surface..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/community"
          nextLinks={[
            { label: "Community Home", to: "/app/community" },
            { label: "Notifications", to: "/app/notifications" },
            { label: "Loans & Support", to: "/app/loans" },
          ]}
          utilityLinks={[
            { label: "Trust", to: "/app/trust" },
            { label: "My GMFN and I", to: "/app/my-gmfn-and-i" },
          ]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading selected community...
          </div>
        </section>
      </div>
    );
  }

  if (!communityId || !selectedClan) {
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
        <PageTopNav
          sectionLabel="Marketplace"
          title="Selected community marketplace"
          subtitle="Marketplace is the selected community surface. Choose a community first from Community Home."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/community"
          nextLinks={[
            { label: "Community Home", to: "/app/community" },
            { label: "My GMFN and I", to: "/app/my-gmfn-and-i" },
          ]}
          utilityLinks={[{ label: "Trust", to: "/app/trust" }]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>No selected community</div>

          <div
            style={{
              marginTop: 12,
              color: "#0B1F33",
              fontSize: 28,
              fontWeight: 900,
              lineHeight: 1.15,
              maxWidth: 760,
            }}
          >
            Open Community Home first, then choose the community you want to work
            with.
          </div>

          <div
            style={{
              marginTop: 12,
              color: "#5F7287",
              fontSize: 15,
              lineHeight: 1.8,
              maxWidth: 860,
            }}
          >
            Community Home remains the private control room. Marketplace is the
            selected community surface that opens after a community has been
            chosen.
          </div>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link to="/app/community" style={actionBtn("primary")}>
              Open Community Home
            </Link>
            <Link to="/app/dashboard" style={actionBtn("secondary")}>
              Dashboard
            </Link>
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
      <PageTopNav
        sectionLabel="Marketplace"
        title="Selected community marketplace"
        subtitle="This is the selected community surface for people, trade identity, demand, and guided support movement."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/community"
        backLabel="Community Home"
        nextLinks={[
          { label: "Community Home", to: "/app/community" },
          { label: "Notifications", to: "/app/notifications" },
          { label: "Loans & Support", to: "/app/loans" },
        ]}
        utilityLinks={[
          { label: "Trust", to: "/app/trust" },
          { label: "My GMFN and I", to: "/app/my-gmfn-and-i" },
        ]}
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

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
            <div style={sectionLabel()}>Community profile</div>
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              One steady marketplace identity block for the selected community.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("profile")}
            style={collapseToggle()}
          >
            {collapsed.profile ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.profile ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "320px minmax(0, 1fr)",
              gap: 18,
              alignItems: "start",
            }}
          >
            <div>
              <div style={communityImageBox()}>
                <StableAuthImage
                  candidates={communityImageCandidates}
                  alt={communityName}
                  clanId={communityId}
                  style={{
                    width: "100%",
                    height: "100%",
                    minHeight: 260,
                    objectFit: "cover",
                    display: "block",
                  }}
                  fallback={
                    <div
                      style={{
                        padding: 18,
                        textAlign: "center",
                        color: "#37506A",
                        fontWeight: 900,
                        fontSize: 22,
                        lineHeight: 1.3,
                      }}
                    >
                      {communityName}
                    </div>
                  }
                />
              </div>
            </div>

            <div>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: isCompact ? 28 : 34,
                  lineHeight: 1.08,
                }}
              >
                {communityName}
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={badge(true)}>Community ID: {communityGlobalId}</span>
                <span style={badge(false)}>Trust: {communityTrust}</span>
                <span style={badge(false)}>Members: {members.length}</span>
              </div>

              <div
                style={{
                  marginTop: 14,
                  color: "#5F7287",
                  fontSize: 15,
                  lineHeight: 1.8,
                  maxWidth: 760,
                }}
              >
                {communityDescription}
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
                  onClick={copyCommunityId}
                  style={actionBtn("secondary")}
                >
                  Copy Community ID
                </button>

                <button
                  type="button"
                  onClick={copyTrustLink}
                  style={actionBtn("secondary")}
                >
                  Copy Community Link
                </button>
              </div>

              <div
                style={{
                  marginTop: 18,
                  ...softCard("#F8FBFF"),
                }}
              >
                <div style={sectionLabel()}>Community picture</div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#5F7287",
                    fontSize: 14,
                    lineHeight: 1.75,
                  }}
                >
                  This is the dedicated community DP field for this community. It
                  is separate from spotlight and should stay visually steady.
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gridTemplateColumns: isCompact
                      ? "1fr"
                      : "minmax(220px, 1fr) auto",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <input
                    key={communityPictureFileInputKey}
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      void handleUploadCommunityPicture(e.target.files?.[0] || null)
                    }
                    style={inputStyle()}
                  />

                  <button
                    type="button"
                    onClick={() => void handleRemoveCommunityPicture()}
                    disabled={
                      removingCommunityPicture ||
                      uploadingCommunityPicture ||
                      !hasCommunityPicture
                    }
                    style={actionBtn(
                      "secondary",
                      removingCommunityPicture ||
                        uploadingCommunityPicture ||
                        !hasCommunityPicture
                    )}
                  >
                    {removingCommunityPicture ? "Removing..." : "Remove Picture"}
                  </button>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={badge(false)}>
                    {uploadingCommunityPicture
                      ? "Uploading..."
                      : hasCommunityPicture
                      ? "Replace picture"
                      : "Upload picture"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section
        style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)")}
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
            <div style={sectionLabel()}>Community tools</div>
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              Keep the main working buttons together and out of the way until needed.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("tools")}
            style={collapseToggle()}
          >
            {collapsed.tools ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.tools ? (
          <>
            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={copyInviteLink}
                style={actionBtn("primary", !inviteLink)}
                disabled={!inviteLink}
              >
                Copy Invite Link
              </button>

              <Link to="/app/payment/pool" style={actionBtn("secondary")}>
                Money In
              </Link>

              <Link
                to="/app/withdrawal-instructions"
                style={actionBtn("secondary")}
              >
                Money Out
              </Link>

              <Link to="/app/demand-box" style={actionBtn("secondary")}>
                Demand Box
              </Link>

              <Link to="/app/trust-slip" style={actionBtn("secondary")}>
                Merchant Verify
              </Link>

              <Link to="/app/notifications" style={actionBtn("secondary")}>
                Notifications
              </Link>

              <Link to="/app/trust" style={actionBtn("secondary")}>
                Trust
              </Link>

              <Link to="/app/my-gmfn-and-i" style={actionBtn("secondary")}>
                My GMFN and I
              </Link>
            </div>

            <div
              style={{
                marginTop: 16,
                ...softCard("#FFFFFF"),
              }}
            >
              <div style={sectionLabel()}>Pool position</div>

              <div
                style={{
                  marginTop: 10,
                  color: "#0B1F33",
                  fontSize: 22,
                  fontWeight: 900,
                  lineHeight: 1.2,
                }}
              >
                {poolAmount} {poolCurrency}
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#5F7287",
                  fontSize: 14,
                  lineHeight: 1.8,
                }}
              >
                This shows only your own visible pool position in the selected
                community context.
              </div>
            </div>
          </>
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
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              Choose a member, open the Shop Gallery, or mark the member as a
              possible guarantor for the guided loan flow below.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(false)}>
              Selected guarantors: {selectedGuarantors.length}
            </span>
            <button
              type="button"
              onClick={() => toggleSection("members")}
              style={collapseToggle()}
            >
              {collapsed.members ? "Open" : "Collapse"}
            </button>
          </div>
        </div>

        {!collapsed.members ? (
          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {memberRows.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No member rows are visible yet for this selected community.
              </div>
            ) : (
              memberRows.map((row, index) => {
                const selected = selectedGuarantorKeys.has(row.guarantorKey);
                const suggested = suggestedSupporterKeys.has(row.guarantorKey);

                return (
                  <div
                    key={`${row.gmfnId || row.member?.id || index}`}
                    style={innerCard("#FCFEFF")}
                  >
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
                          {row.memberName}
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
                          {row.shop ? (
                            <span style={badge(false)}>Shop link available</span>
                          ) : (
                            <span style={badge(false)}>No visible shop yet</span>
                          )}

                          {loanDraftId && suggested ? (
                            <span style={badge(true)}>Fit for this amount</span>
                          ) : null}

                          {loanDraftId &&
                          suggestedSupporters.length > 0 &&
                          !suggested &&
                          !row.isSelf ? (
                            <span style={badge(false)}>Not in fit list</span>
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
                          <Link to={row.shopTo} style={actionBtn("secondary")}>
                            Open Shop Gallery
                          </Link>
                        ) : (
                          <button
                            type="button"
                            style={actionBtn("secondary", true)}
                            disabled
                          >
                            No Shop Yet
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            toggleGuarantorFromRow({
                              guarantorKey: row.guarantorKey,
                              userId: row.userId,
                              gmfnId: row.gmfnId,
                              memberName: row.memberName,
                              isSelf: row.isSelf,
                            })
                          }
                          disabled={row.isSelf || (!row.userId && !row.gmfnId)}
                          style={
                            selected
                              ? actionBtn("primary")
                              : actionBtn(
                                  "secondary",
                                  row.isSelf || (!row.userId && !row.gmfnId)
                                )
                          }
                        >
                          {row.isSelf
                            ? "You"
                            : selected
                            ? "Selected as Guarantor"
                            : "Choose as Guarantor"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : null}
      </section>

      <section id="marketplace-loans-support" style={pageCard("#FFFFFF")}>
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
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
                maxWidth: 860,
              }}
            >
              The system guides you in a deterministic order: start the draft,
              check fit, select guarantors, send requests, then wait for responses.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(false)}>{activeLoanCount} active support items</span>
            <button
              type="button"
              onClick={() => toggleSection("loan")}
              style={collapseToggle()}
            >
              {collapsed.loan ? "Open" : "Collapse"}
            </button>
          </div>
        </div>

        {!collapsed.loan ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "minmax(0, 1.06fr) minmax(320px, 0.94fr)",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div style={sectionLabel()}>Guided support entry</div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={badge(true)}>{taskStepLabel}</span>
                {loanDraftId ? (
                  <span style={badge(false)}>Draft: #{loanDraftId}</span>
                ) : (
                  <span style={badge(false)}>No active draft</span>
                )}
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "repeat(3, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                <Link to="/app/loan-suggestions" style={actionBtn("secondary")}>
                  Suggestions
                </Link>
                <Link to="/app/loan-readiness" style={actionBtn("secondary")}>
                  Readiness
                </Link>
                <Link to="/app/loan-workbench" style={actionBtn("secondary")}>
                  Workbench
                </Link>
              </div>

              <div
                style={{
                  marginTop: 14,
                  color: "#0B1F33",
                  fontSize: 18,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                Need a loan?
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#5F7287",
                  fontSize: 14,
                  lineHeight: 1.75,
                }}
              >
                Enter the amount and duration first. Once the draft starts, the
                page narrows the task and tells you exactly what remains.
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
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={sectionLabel()}>Purpose / note</div>
                <textarea
                  value={loanPurpose}
                  onChange={(e) => setLoanPurpose(e.target.value)}
                  placeholder="State what the loan is for..."
                  style={{ ...textAreaStyle(), marginTop: 8 }}
                />
              </div>

              <div
                style={{
                  marginTop: 14,
                  color: "#5F7287",
                  fontSize: 13,
                  lineHeight: 1.7,
                }}
              >
                Only one guided loan task should stay active at a time. Finish it
                or cancel it intentionally before starting another.
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
                  onClick={handleStartLoanDraft}
                  disabled={startingLoanDraft || loanDraftIsActive}
                  style={actionBtn(
                    "primary",
                    startingLoanDraft || loanDraftIsActive
                  )}
                >
                  {startingLoanDraft
                    ? "Starting..."
                    : loanDraftIsActive
                    ? "Draft In Progress"
                    : "Start Loan Request"}
                </button>

                {loanDraftId ? (
                  <button
                    type="button"
                    onClick={handleRefreshSuggestions}
                    disabled={loadingSuggestions}
                    style={actionBtn("secondary", loadingSuggestions)}
                  >
                    {loadingSuggestions ? "Refreshing..." : "Refresh Fit Check"}
                  </button>
                ) : null}

                {loanDraftId && loanStatusLower !== "approved" ? (
                  <button
                    type="button"
                    onClick={handleCancelLoanDraft}
                    disabled={cancellingLoanDraft}
                    style={actionBtn("secondary", cancellingLoanDraft)}
                  >
                    {cancellingLoanDraft ? "Cancelling..." : "Cancel Draft"}
                  </button>
                ) : null}

                <Link to="/app/loans" style={actionBtn("soft")}>
                  Full Loans View
                </Link>
              </div>

              <div
                style={{
                  marginTop: 18,
                  ...softCard("#FFFFFF"),
                }}
              >
                <div style={sectionLabel()}>System guidance</div>

                <div
                  style={{
                    marginTop: 10,
                    color: "#0B1F33",
                    fontSize: 16,
                    fontWeight: 800,
                    lineHeight: 1.55,
                  }}
                >
                  {loanGuideMessage}
                </div>

                {loanDraftSummary ? (
                  <>
                    <div
                      style={{
                        marginTop: 12,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={badge(true)}>
                        Status: {safeStr(loanDraftSummary.status || "Open")}
                      </span>
                      <span style={badge(false)}>
                        Required guarantors: {requiredGuarantorCount}
                      </span>
                      <span style={badge(false)}>
                        Approved: {approvedGuarantorCount}
                      </span>
                      <span style={badge(false)}>
                        Requests sent: {sentGuarantorCount}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 14,
                        color:
                          waitingForResponses || remainingGuarantorsNeeded === 0
                            ? "#166534"
                            : "#92400E",
                        fontSize: 14,
                        fontWeight: 800,
                        lineHeight: 1.75,
                      }}
                    >
                      {selectionProgressMessage}
                    </div>
                  </>
                ) : null}
              </div>

              {loanDraftId &&
              loanStatusLower !== "approved" &&
              requiredGuarantorCount > 0 ? (
                <>
                  <div style={{ marginTop: 18 }}>
                    <div style={sectionLabel()}>Chosen guarantors</div>

                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      {selectedGuarantors.length === 0 ? (
                        <span style={{ color: "#64748B", lineHeight: 1.8 }}>
                          No new guarantor selected yet. Use the member rows above.
                        </span>
                      ) : (
                        selectedGuarantors.map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => removeSelectedGuarantor(item.key)}
                            style={actionBtn("soft")}
                          >
                            {item.name} ×
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {suggestedSupporters.length > 0 ? (
                    <div style={{ marginTop: 18 }}>
                      <div style={sectionLabel()}>System fit suggestions</div>

                      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                        {suggestedSupporters.map((item) => (
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
                                      Suggested pledge:{" "}
                                      {safeStr(item.recommendedPledge)}
                                    </span>
                                  ) : null}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => addSuggestedSupporter(item)}
                                style={
                                  selectedGuarantorKeys.has(item.key)
                                    ? actionBtn("primary")
                                    : actionBtn("secondary")
                                }
                              >
                                {selectedGuarantorKeys.has(item.key)
                                  ? "Selected"
                                  : "Use Suggestion"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

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
                      onClick={handleSendGuarantorRequests}
                      disabled={
                        !canSendGuarantorRequests || sendingGuarantorRequests
                      }
                      style={actionBtn(
                        "primary",
                        !canSendGuarantorRequests || sendingGuarantorRequests
                      )}
                    >
                      {sendButtonLabel}
                    </button>

                    <Link to="/app/loan-readiness" style={actionBtn("secondary")}>
                      Check Readiness Again
                    </Link>
                  </div>
                </>
              ) : null}
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>Live support items</div>

              <div
                style={{
                  marginTop: 10,
                  color: "#0B1F33",
                  fontSize: 20,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                Your support activity in this community
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#5F7287",
                  fontSize: 14,
                  lineHeight: 1.75,
                }}
              >
                These are the support items currently visible in your selected
                community context.
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
                    No visible loan or support item is active in this community
                    right now.
                  </div>
                ) : (
                  loans.slice(0, 8).map((item, index) => (
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
                          Status: {getLoanStatusText(item)}
                        </span>
                        <span style={badge(false)}>
                          Role: {getLoanRoleText(item)}
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
                          item?.created_at ? `Started: ${item.created_at}` : "",
                          "This support item is visible in the current community context."
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <Link to="/app/loans" style={actionBtn("primary")}>
                  Open Full Loans View
                </Link>
                <Link to="/app/loan-workbench" style={actionBtn("secondary")}>
                  Workbench
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}