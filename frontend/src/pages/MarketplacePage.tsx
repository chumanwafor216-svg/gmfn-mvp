import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  addLoanGuarantorRequest,
  cancelLoanRequest,
  createLoanRequest,
  getClanInviteLink,
  getCurrentClan,
  getLoanGuarantorSuggestions,
  getLoanGuarantors,
  getLoanSummary,
  getMarketplaceShops,
  getMe,
  getPoolMe,
  getSelectedClanId,
  listClanMembers,
  listMyClans,
  listMyLoans,
  safeCopy,
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

type LoanGuarantorRow = {
  id?: number;
  loan_id?: number;
  clan_id?: number;
  guarantor_user_id?: number;
  pledge_amount?: string | number | null;
  status?: string | null;
  responded_at?: string | null;
  is_locked?: boolean;
  locked_amount?: string | number | null;
  released_amount?: string | number | null;
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
    clan: mergeFirstVisible(
      currentClan?.clan,
      matchedRow?.clan,
      firstRow?.clan
    ),
    meta: mergeFirstVisible(
      currentClan?.meta,
      matchedRow?.meta,
      firstRow?.meta
    ),
  };
}

function isTerminalLoanStatus(status: string): boolean {
  const s = safeStr(status).toLowerCase();
  return ["approved", "repaid", "cancelled", "defaulted"].includes(s);
}

function apiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";

  return String(raw || "").trim().replace(/\/+$/, "");
}

function apiOrigin(): string {
  const base = apiBase();

  if (base.startsWith("http://") || base.startsWith("https://")) {
    try {
      const u = new URL(base);
      return `${u.protocol}//${u.host}`;
    } catch {
      return "http://127.0.0.1:8012";
    }
  }

  return "http://127.0.0.1:8012";
}

function resolveMediaSrc(src: string): string {
  const raw = safeStr(src);
  if (!raw) return "";

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("blob:")
  ) {
    return raw;
  }

  if (raw.startsWith("/")) {
    return `${apiOrigin()}${raw}`;
  }

  return `${apiOrigin()}/${raw.replace(/^\/+/, "")}`;
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
    minHeight: 188,
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "linear-gradient(180deg, #E8F0FF 0%, #DDEBFF 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };
}

function getCommunityImage(clan: any): string {
  return firstTruthy(
    clan?.image_url,
    clan?.avatar_url,
    clan?.photo_url,
    clan?.cover_image_url,
    clan?.banner_url,
    clan?.logo_url,
    clan?.community_logo_url,
    clan?.profile_picture_url,
    clan?.image,
    clan?.community?.image_url,
    clan?.community?.avatar_url,
    clan?.community?.photo_url,
    clan?.community?.cover_image_url,
    clan?.community?.banner_url,
    clan?.community?.logo_url,
    clan?.community?.community_logo_url,
    clan?.community?.profile_picture_url,
    clan?.community?.image,
    clan?.profile?.image_url,
    clan?.profile?.avatar_url,
    clan?.profile?.photo_url,
    clan?.profile?.cover_image_url,
    clan?.profile?.banner_url,
    clan?.profile?.logo_url,
    clan?.profile?.profile_picture_url,
    clan?.profile?.image,
    clan?.marketplace?.image_url,
    clan?.marketplace?.avatar_url,
    clan?.marketplace?.photo_url,
    clan?.marketplace?.cover_image_url,
    clan?.marketplace?.banner_url,
    clan?.marketplace?.logo_url,
    clan?.marketplace?.profile_picture_url,
    clan?.marketplace?.image,
    clan?.clan?.image_url,
    clan?.clan?.avatar_url,
    clan?.clan?.photo_url,
    clan?.clan?.cover_image_url,
    clan?.clan?.banner_url,
    clan?.clan?.logo_url,
    clan?.clan?.profile_picture_url,
    clan?.clan?.image,
    clan?.meta?.image_url,
    clan?.meta?.avatar_url,
    clan?.meta?.photo_url,
    clan?.meta?.cover_image_url,
    clan?.meta?.banner_url,
    clan?.meta?.logo_url,
    clan?.meta?.profile_picture_url,
    clan?.meta?.image
  );
}

function getCommunityName(clan: any): string {
  return firstTruthy(
    clan?.name,
    clan?.clan_name,
    clan?.marketplace_name,
    clan?.community_name,
    clan?.community?.name,
    clan?.profile?.name,
    clan?.marketplace?.name,
    clan?.clan?.name,
    "Selected community"
  );
}

function getCommunityDescription(clan: any): string {
  return firstTruthy(
    clan?.description,
    clan?.clan_description,
    clan?.marketplace_description,
    clan?.community?.description,
    clan?.profile?.description,
    clan?.marketplace?.description,
    clan?.clan?.description,
    clan?.meta?.description,
    "This selected community surface contains the community identity, the member rows, loan and support actions, and the link to each member’s Shop Gallery."
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

function normalizeLoanGuarantorRow(raw: any): LoanGuarantorRow | null {
  if (!raw) return null;

  const src = raw?.item || raw?.guarantor || raw;

  return {
    id: positiveNumber(firstDefined(src?.id)) || undefined,
    loan_id: positiveNumber(firstDefined(src?.loan_id)) || undefined,
    clan_id: positiveNumber(firstDefined(src?.clan_id)) || undefined,
    guarantor_user_id:
      positiveNumber(firstDefined(src?.guarantor_user_id)) || undefined,
    pledge_amount: firstDefined(src?.pledge_amount),
    status: firstTruthy(src?.status),
    responded_at: firstTruthy(src?.responded_at),
    is_locked: Boolean(src?.is_locked),
    locked_amount: firstDefined(src?.locked_amount),
    released_amount: firstDefined(src?.released_amount),
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
  const value = total / count;
  return value.toFixed(2);
}

function guarantorKeyFromParts(userId?: number, gmfnId?: string): string {
  if (Number(userId || 0) > 0) return `u-${Number(userId)}`;
  return `g-${safeStr(gmfnId).toUpperCase()}`;
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

  const [loanAmount, setLoanAmount] = useState("");
  const [loanDurationDays, setLoanDurationDays] = useState("");
  const [loanPurpose, setLoanPurpose] = useState("");
  const [selectedGuarantors, setSelectedGuarantors] = useState<GuarantorPick[]>([]);
  const [suggestedSupporters, setSuggestedSupporters] = useState<SuggestedSupporter[]>(
    []
  );
  const [loanDraftId, setLoanDraftId] = useState<number>(0);
  const [loanDraftSummary, setLoanDraftSummary] = useState<LoanDraftSummary | null>(
    null
  );
  const [loanSuggestionRaw, setLoanSuggestionRaw] = useState<any>(null);
  const [loanGuarantorRows, setLoanGuarantorRows] = useState<LoanGuarantorRow[]>([]);
  const [loadingLoanGuarantorRows, setLoadingLoanGuarantorRows] = useState(false);
  const [lastApprovalNoticeLoanId, setLastApprovalNoticeLoanId] = useState(0);

  const [startingLoanDraft, setStartingLoanDraft] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [sendingGuarantorRequests, setSendingGuarantorRequests] = useState(false);
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

    return () => {
      window.clearTimeout(timer);
    };
  }, [notice]);

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
    return Number(getClanRecordId(selectedClan) || selectedClanId || 0);
  }, [selectedClan, selectedClanId]);

  function clearLoanDraftState(resetInputs = false) {
    setLoanDraftId(0);
    setLoanDraftSummary(null);
    setLoanSuggestionRaw(null);
    setLoanGuarantorRows([]);
    setSuggestedSupporters([]);
    setSelectedGuarantors([]);
    setLastApprovalNoticeLoanId(0);

    if (resetInputs) {
      setLoanAmount("");
      setLoanDurationDays("");
      setLoanPurpose("");
    }
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

  async function loadLoanDraftContext(loanId: number, currentCommunityId: number) {
    setLoadingLoanGuarantorRows(true);

    try {
      const [summaryRes, suggestionsRes, guarantorsRes] = await Promise.all([
        getLoanSummary(loanId).catch(() => null),
        getLoanGuarantorSuggestions(loanId, {
          clan_id: currentCommunityId,
          limit: 8,
        }).catch(() => null),
        getLoanGuarantors(loanId, {
          clan_id: currentCommunityId,
        }).catch(() => ({ items: [] })),
      ]);

      const normalizedSummary = normalizeLoanSummary(summaryRes);
      const normalizedSuggestions = extractSuggestedSupporters(suggestionsRes);

      const guarantorRows = Array.isArray(guarantorsRes)
        ? guarantorsRes
        : Array.isArray((guarantorsRes as any)?.items)
        ? (guarantorsRes as any).items
        : [];

      const normalizedGuarantors = guarantorRows
        .map((row: any) => normalizeLoanGuarantorRow(row))
        .filter(Boolean) as LoanGuarantorRow[];

      setLoanDraftId(loanId);
      setLoanDraftSummary(normalizedSummary);
      setLoanSuggestionRaw(suggestionsRes);
      setSuggestedSupporters(normalizedSuggestions);
      setLoanGuarantorRows(normalizedGuarantors);

      return {
        summary: normalizedSummary,
        suggestions: normalizedSuggestions,
        guarantors: normalizedGuarantors,
        suggestionMessage: extractSuggestionMessage(suggestionsRes),
      };
    } finally {
      setLoadingLoanGuarantorRows(false);
    }
  }

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
      const [membersRes, shopsRes, poolRes, inviteRes, loansRes] = await Promise.all([
        listClanMembers(communityId).catch(() => ({ items: [] })),
        getMarketplaceShops({ clan_id: communityId, limit: 200 }).catch(() => ({
          items: [],
        })),
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

      const resolvedInviteLink = firstTruthy(
        inviteRes?.url,
        inviteRes?.invite_url,
        inviteRes?.link,
        inviteRes?.invite_link
      );

      setInviteLink(resolvedInviteLink);
    })();

    return () => {
      alive = false;
    };
  }, [communityId]);

  useEffect(() => {
    const status = safeStr(loanDraftSummary?.status).toLowerCase();
    const inLoanMode = Boolean(loanDraftId && !isTerminalLoanStatus(status));

    if (inLoanMode) {
      setCollapsed((prev) => ({
        ...prev,
        profile: true,
        tools: true,
        members: false,
        loan: false,
      }));
    }
  }, [loanDraftId, loanDraftSummary?.status]);

  useEffect(() => {
    const status = safeStr(loanDraftSummary?.status).toLowerCase();

    if (!loanDraftId || !communityId) return;
    if (isTerminalLoanStatus(status)) return;

    const timer = window.setInterval(() => {
      (async () => {
        try {
          await loadLoanDraftContext(loanDraftId, communityId);
          await reloadLoansForCommunity(communityId);
        } catch {
          // silent background refresh
        }
      })();
    }, 10000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loanDraftId, loanDraftSummary?.status, communityId]);

  useEffect(() => {
    const status = safeStr(loanDraftSummary?.status).toLowerCase();

    if (
      loanDraftId &&
      status === "approved" &&
      lastApprovalNoticeLoanId !== loanDraftId
    ) {
      showNotice(
        "success",
        "Loan approved successfully. You can continue from Loans and Support."
      );
      setLastApprovalNoticeLoanId(loanDraftId);
    }
  }, [loanDraftId, loanDraftSummary?.status, lastApprovalNoticeLoanId]);

  const myUserId = positiveNumber(me?.id);
  const myGmfnId = safeStr(me?.gmfn_id || "").toUpperCase();

  const communityName = getCommunityName(selectedClan);
  const communityDescription = getCommunityDescription(selectedClan);
  const communityGlobalId = getCommunityGlobalId(selectedClan);
  const communityTrust = getCommunityTrustLabel(selectedClan);
  const communityImage = getCommunityImage(selectedClan);
  const resolvedCommunityImage = resolveMediaSrc(communityImage);
  const poolAmount = getPoolAmountText(poolInfo);
  const poolCurrency = getPoolCurrency(poolInfo);

  const memberRows = useMemo(() => {
    const rows = members.map((member) => {
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
      return status !== "closed" && status !== "completed" && status !== "repaid";
    }).length;
  }, [loans]);

  const selectedGuarantorKeys = useMemo(() => {
    return new Set(selectedGuarantors.map((item) => item.key));
  }, [selectedGuarantors]);

  const suggestedSupporterKeys = useMemo(() => {
    return new Set(suggestedSupporters.map((item) => item.key));
  }, [suggestedSupporters]);

  const memberNameByUserId = useMemo(() => {
    const map = new Map<number, string>();

    memberRows.forEach((row) => {
      if (row.userId > 0) {
        map.set(row.userId, row.memberName);
      }
    });

    return map;
  }, [memberRows]);

  const requiredGuarantorCount = positiveNumber(
    loanDraftSummary?.guarantors_required
  );

  const selectableGuarantorCount = useMemo(() => {
    return memberRows.filter((row) => !row.isSelf && !!row.userId).length;
  }, [memberRows]);

  const remainingGuarantorsNeeded = useMemo(() => {
    if (!requiredGuarantorCount) return 0;
    return Math.max(requiredGuarantorCount - selectedGuarantors.length, 0);
  }, [requiredGuarantorCount, selectedGuarantors.length]);

  const canSendGuarantorRequests = useMemo(() => {
    const status = safeStr(loanDraftSummary?.status).toLowerCase();

    if (!loanDraftId) return false;
    if (status === "approved") return false;
    if (selectedGuarantors.length === 0) return false;
    if (requiredGuarantorCount > 0 && remainingGuarantorsNeeded > 0) return false;
    if (suggestedSupporters.length === 0) return false;

    const unfitSelected = selectedGuarantors.filter(
      (item) => !suggestedSupporterKeys.has(item.key)
    );

    return unfitSelected.length === 0;
  }, [
    loanDraftId,
    loanDraftSummary?.status,
    selectedGuarantors,
    requiredGuarantorCount,
    remainingGuarantorsNeeded,
    suggestedSupporters.length,
    suggestedSupporterKeys,
  ]);

  const sendButtonLabel = useMemo(() => {
    if (sendingGuarantorRequests) return "Sending...";
    if (!loanDraftId) return "Send Guarantor Requests";
    if (safeStr(loanDraftSummary?.status).toLowerCase() === "approved") {
      return "Already Approved";
    }
    if (requiredGuarantorCount > 0 && remainingGuarantorsNeeded > 0) {
      return `Need ${remainingGuarantorsNeeded} more guarantor${
        remainingGuarantorsNeeded === 1 ? "" : "s"
      }`;
    }
    if (selectedGuarantors.length === 0) {
      return "Choose Guarantors";
    }
    if (suggestedSupporters.length === 0) {
      return "No Fit Guarantor Yet";
    }
    return "Send Guarantor Requests";
  }, [
    sendingGuarantorRequests,
    loanDraftId,
    loanDraftSummary?.status,
    requiredGuarantorCount,
    remainingGuarantorsNeeded,
    selectedGuarantors.length,
    suggestedSupporters.length,
  ]);

  const selectionProgressMessage = useMemo(() => {
    const status = safeStr(loanDraftSummary?.status).toLowerCase();

    if (!loanDraftId || isTerminalLoanStatus(status)) return "";

    if (requiredGuarantorCount <= 0) {
      return "This loan draft does not currently need guarantors.";
    }

    if (selectedGuarantors.length === 0) {
      return `You need ${requiredGuarantorCount} guarantor${
        requiredGuarantorCount === 1 ? "" : "s"
      }. Select people below or cancel this loan draft.`;
    }

    if (remainingGuarantorsNeeded > 0) {
      const base = `You selected ${selectedGuarantors.length} of ${requiredGuarantorCount} required guarantor${
        requiredGuarantorCount === 1 ? "" : "s"
      }. ${remainingGuarantorsNeeded} more remaining.`;

      if (selectableGuarantorCount < requiredGuarantorCount) {
        return `${base} This community currently shows only ${selectableGuarantorCount} selectable guarantor${
          selectableGuarantorCount === 1 ? "" : "s"
        } for this requirement. Select more when available or cancel the loan draft.`;
      }

      return `${base} Select more people or cancel the loan draft.`;
    }

    return `You have selected all ${requiredGuarantorCount} required guarantor${
      requiredGuarantorCount === 1 ? "" : "s"
    }. You can now send the guarantor requests.`;
  }, [
    loanDraftId,
    loanDraftSummary?.status,
    requiredGuarantorCount,
    selectedGuarantors.length,
    remainingGuarantorsNeeded,
    selectableGuarantorCount,
  ]);

  const loanGuideMessage = useMemo(() => {
    const status = safeStr(loanDraftSummary?.status).toLowerCase();
    const messageFromBackend = extractSuggestionMessage(loanSuggestionRaw);

    if (messageFromBackend) return messageFromBackend;

    if (!loanDraftId) {
      return "Start with amount and duration. Then the app will create the loan draft, calculate whether guarantors are needed, and guide you to the next move.";
    }

    if (status === "approved") {
      return "This request has already been covered inside your current support path. No guarantor action is needed now.";
    }

    if (requiredGuarantorCount > 0) {
      return `This loan draft needs ${requiredGuarantorCount} guarantor${
        requiredGuarantorCount === 1 ? "" : "s"
      }. Use the fit suggestions and the member rows below before sending requests.`;
    }

    return "Use the member rows and the support tools to continue the next step.";
  }, [loanDraftId, loanDraftSummary, loanSuggestionRaw, requiredGuarantorCount]);

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  function toggleSection(key: CollapseKey) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

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
    showNotice("success", "Community trust link copied.");
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

  async function handleStartLoanDraft() {
    if (!communityId) {
      showNotice("error", "Select a community before starting a loan request.");
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
      } else {
        showNotice(
          "success",
          "Loan draft created. The app is now focusing you on guarantor selection and fit checking."
        );
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

  async function handleCancelLoanDraft() {
    if (!loanDraftId || !communityId) {
      showNotice("error", "There is no active loan draft to cancel.");
      return;
    }

    setCancellingLoanDraft(true);

    try {
      await cancelLoanRequest(loanDraftId, { clan_id: communityId });
      await reloadLoansForCommunity(communityId);
      clearLoanDraftState(false);

      showNotice(
        "success",
        "Loan draft cancelled successfully. You can change the amount or start again."
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

  async function handleSendGuarantorRequests() {
    if (!communityId) {
      showNotice("error", "Select a community before sending the request.");
      return;
    }

    if (!loanDraftId) {
      showNotice("error", "Start the loan request first.");
      return;
    }

    const status = safeStr(loanDraftSummary?.status).toLowerCase();

    if (status === "approved") {
      showNotice(
        "success",
        "This loan draft is already approved. No guarantor requests are needed."
      );
      return;
    }

    if (selectedGuarantors.length === 0) {
      showNotice(
        "error",
        "Choose at least one guarantor from the member rows before sending requests."
      );
      return;
    }

    if (requiredGuarantorCount > 0 && remainingGuarantorsNeeded > 0) {
      showNotice(
        "error",
        `You still need ${remainingGuarantorsNeeded} more guarantor${
          remainingGuarantorsNeeded === 1 ? "" : "s"
        }. Select more people or cancel the loan draft.`
      );
      return;
    }

    if (suggestedSupporters.length === 0) {
      showNotice(
        "error",
        "The system did not find fit guarantors for this amount yet. Reduce the amount or revisit readiness and suggestions."
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
          subtitle="Preparing the selected community surface..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/community"
          nextLinks={[
            { label: "Community Home", to: "/app/community" },
            { label: "Notifications", to: "/app/notifications" },
            { label: "Loans and Support", to: "/app/loans" },
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
              System-level community identity for the selected marketplace surface.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("profile")}
            style={actionBtn("soft")}
          >
            {collapsed.profile ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.profile ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "250px minmax(0, 1fr)",
              gap: 18,
              alignItems: "start",
            }}
          >
            <div>
              <div style={communityImageBox()}>
                {resolvedCommunityImage ? (
                  <img
                    src={resolvedCommunityImage}
                    alt={communityName}
                    style={{
                      width: "100%",
                      height: "100%",
                      minHeight: 188,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
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
                )}
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
                  Copy Trust Link
                </button>
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
              Keep the working buttons together and out of the way until needed.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("tools")}
            style={actionBtn("soft")}
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
              possible guarantor for the loan flow below.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(false)}>
              Selected guarantors: {selectedGuarantors.length}
            </span>
            <button
              type="button"
              onClick={() => toggleSection("members")}
              style={actionBtn("soft")}
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
            <div style={sectionLabel()}>Loans and Support</div>
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
                maxWidth: 860,
              }}
            >
              The system now guides you in the real backend order: start the loan
              draft, check fit suggestions, choose guarantors, then send the
              guarantor requests.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(false)}>{activeLoanCount} active support items</span>
            <button
              type="button"
              onClick={() => toggleSection("loan")}
              style={actionBtn("soft")}
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
                Enter the amount and duration first. The app will start the loan
                draft, then switch into the fit-check and guarantor stage.
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
                Duration and purpose are kept here as guided preparation for the
                member flow. The backend you shared makes the real loan decision
                from the loan draft and guarantor logic.
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
                  disabled={startingLoanDraft}
                  style={actionBtn("primary", startingLoanDraft)}
                >
                  {startingLoanDraft ? "Starting..." : "Start Loan Request"}
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
                        Required guarantors: {positiveNumber(loanDraftSummary.guarantors_required)}
                      </span>
                      <span style={badge(false)}>
                        Approved: {positiveNumber(loanDraftSummary.approved_guarantors)}
                      </span>
                      <span style={badge(false)}>
                        Total requests: {positiveNumber(loanDraftSummary.guarantors_total)}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 16,
                        ...innerCard("#FCFEFF"),
                      }}
                    >
                      <div style={sectionLabel()}>Borrower request status</div>

                      <div
                        style={{
                          marginTop: 8,
                          color: "#5F7287",
                          fontSize: 14,
                          lineHeight: 1.75,
                        }}
                      >
                        {safeStr(loanDraftSummary.status).toLowerCase() === "approved"
                          ? "This loan request has already been approved."
                          : "Your request was sent successfully. Wait for their response."}
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          color: remainingGuarantorsNeeded > 0 ? "#92400E" : "#166534",
                          fontSize: 14,
                          fontWeight: 800,
                          lineHeight: 1.75,
                        }}
                      >
                        {selectionProgressMessage}
                      </div>

                      <div
                        style={{
                          marginTop: 14,
                          display: "grid",
                          gap: 10,
                        }}
                      >
                        {loadingLoanGuarantorRows ? (
                          <div style={{ color: "#64748B", lineHeight: 1.75 }}>
                            Loading guarantor responses...
                          </div>
                        ) : loanGuarantorRows.length === 0 ? (
                          <div style={{ color: "#64748B", lineHeight: 1.75 }}>
                            No guarantor request has been sent yet.
                          </div>
                        ) : (
                          loanGuarantorRows.map((item, index) => {
                            const name =
                              memberNameByUserId.get(
                                positiveNumber(item.guarantor_user_id)
                              ) ||
                              `Member ${positiveNumber(item.guarantor_user_id) || index + 1}`;

                            return (
                              <div
                                key={`${item.id || index}`}
                                style={innerCard("#FFFFFF")}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: 10,
                                    flexWrap: "wrap",
                                    alignItems: "center",
                                  }}
                                >
                                  <div style={{ color: "#0B1F33", fontWeight: 900 }}>
                                    {name}
                                  </div>

                                  <span style={badge(true)}>
                                    Pledge: {safeStr(item.pledge_amount || "0")}
                                  </span>
                                </div>

                                <div
                                  style={{
                                    marginTop: 8,
                                    display: "flex",
                                    gap: 8,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <span style={badge(false)}>
                                    Status: {safeStr(item.status || "pending")}
                                  </span>

                                  {item.responded_at ? (
                                    <span style={badge(false)}>
                                      Responded: {safeStr(item.responded_at)}
                                    </span>
                                  ) : null}

                                  {item.is_locked ? (
                                    <span style={badge(false)}>
                                      Locked: {safeStr(item.locked_amount || "0")}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              {loanDraftId &&
              !isTerminalLoanStatus(safeStr(loanDraftSummary?.status)) ? (
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
                          No guarantor selected yet. Use the member rows above.
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
                                      Suggested pledge: {safeStr(item.recommendedPledge)}
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
                      disabled={!canSendGuarantorRequests || sendingGuarantorRequests}
                      style={actionBtn(
                        "primary",
                        !canSendGuarantorRequests || sendingGuarantorRequests
                      )}
                    >
                      {sendButtonLabel}
                    </button>

                    <button
                      type="button"
                      onClick={handleCancelLoanDraft}
                      disabled={cancellingLoanDraft}
                      style={actionBtn("secondary", cancellingLoanDraft)}
                    >
                      {cancellingLoanDraft ? "Cancelling..." : "Cancel Loan Draft"}
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
                    <div
                      key={`${item.id || index}`}
                      style={innerCard("#FCFEFF")}
                    >
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
                          item?.created_at
                            ? `Started: ${item.created_at}`
                            : "",
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