import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CommunityShopControlPanel from "../components/CommunityShopControlPanel";
import DomainIntroToggle from "../components/DomainIntroToggle";
import ExplainToggle from "../components/ExplainToggle";
import GSNBrandMark from "../components/GSNBrandMark";
import PageTopNav from "../components/PageTopNav";
import SpotlightMediaFrame from "../components/SpotlightMediaFrame";
import { navigateWithOrigin } from "../lib/nav";
import {
  createMarketplaceBroadcast,
  getClanInviteLink,
  getMarketplaceBroadcasts,
  getMarketplaceShopByGmfnId,
  getMe,
  getPoolMe,
  getPoolMeSummary,
  getSelectedClanId,
  listMarketplaceRequests,
  listMyClans,
  listExpectedPayments,
  safeCopy,
  selectClan,
  uploadMarketplaceImageFile,
  uploadMarketplaceVideoFile,
} from "../lib/api";
import {
  getCommunityMoneySurface,
  type CommunityMoneySurface,
} from "../lib/communityMoney";
import {
  buildInviteBundle,
  getFirstCircleProgress,
  getSuggestedRelationshipsForRole,
  isContactInviteReady,
  loadFirstCircleDraft,
  relationshipLabel,
  roleLabel,
} from "../lib/firstCircle";
import {
  prepareSpotlightImageFile,
  prepareSpotlightVideoFile,
} from "../lib/spotlightMediaPrep";

type ClanItem = {
  id?: number;
  clan_id?: number;
  name?: string | null;
  clan_name?: string | null;
  description?: string | null;
  clan_description?: string | null;
  marketplace_name?: string | null;
  marketplace_description?: string | null;
  community_global_id?: string | null;
  global_id?: string | null;
  gmfn_id?: string | null;
  clan_code?: string | null;
  code?: string | null;
  trust_band?: string | null;
  trust_class?: string | null;
  community_trust_band?: string | null;
  member_count?: number | null;
  members_count?: number | null;
  role?: string | null;
  member_role?: string | null;
  membership_role?: string | null;
  participant_role?: string | null;
  community?: any;
  profile?: any;
  marketplace?: any;
  clan?: any;
};

type NoticeTone = "success" | "error";
type CollapseKey =
  | "selected"
  | "tools"
  | "circle"
  | "spotlight"
  | "communities";

type CollapseState = Record<CollapseKey, boolean>;

type SpotlightDraftState = {
  description: string;
  tagNumber: string;
  expiry: string;
};

type ActiveCommunitySpotlight = {
  id?: number;
  message: string;
  imageUrl: string;
  videoUrl: string;
  expiresAt: string;
  createdAt: string;
};

type DemandRow = {
  id?: number;
  title?: string | null;
  description?: string | null;
  urgency?: string | null;
  status?: string | null;
  created_at?: string | null;
  area?: string | null;
  requester_gmfn_id?: string | null;
  requester_email?: string | null;
  is_mine?: boolean;
  mine?: boolean;
};

type ExpectedPaymentRecord = {
  id?: number | null;
  expected_type?: string | null;
  amount?: string | null;
  currency?: string | null;
  reference_display?: string | null;
  status?: string | null;
  status_reason?: string | null;
  due_at?: string | null;
  matched_bank_event_id?: number | null;
  confirmed_at?: string | null;
};

const COMMUNITY_HOME_COLLAPSE_KEY = "gmfn.communityHome.sections.v2";
const SPOTLIGHT_DRAFT_PREFIX = "gmfn.communityHome.spotlightDraft.";
const SPOTLIGHT_ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];
const SPOTLIGHT_ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
];
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
const SPOTLIGHT_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const SPOTLIGHT_MAX_VIDEO_BYTES = 10 * 1024 * 1024;
const COMMUNITY_BRAND = {
  ink: "#071827",
  navy: "#081E32",
  deep: "#0B2942",
  blue: "#0D5FA8",
  lightBlue: "#EAF4FF",
  gold: "#D9AC33",
  goldSoft: "#FFF4C9",
  panel: "rgba(255,255,255,0.94)",
  border: "rgba(21,64,103,0.14)",
};

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function formatFileSize(bytes: number): string {
  const size = Number(bytes || 0);
  if (!Number.isFinite(size) || size <= 0) return "0 KB";
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function normalizeSpotlightImageType(contentType: string): string {
  const raw = safeStr(contentType).toLowerCase().split(";")[0]?.trim() || "";
  return SPOTLIGHT_IMAGE_TYPE_ALIASES[raw] || raw;
}

function spotlightMediaExtension(filename: string): string {
  const raw = safeStr(filename).toLowerCase();
  const dot = raw.lastIndexOf(".");
  return dot >= 0 ? raw.slice(dot) : "";
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

function normalizeSpotlightVideoType(contentType: string): string {
  const raw = safeStr(contentType).toLowerCase().split(";")[0]?.trim() || "";
  return SPOTLIGHT_VIDEO_TYPE_ALIASES[raw] || raw;
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
    )}. Spotlight videos must be 10 MB or smaller.`;
  }

  return "";
}

function toBackendAssetUrl(path: string): string {
  const raw = safeStr(path);
  if (!raw) return "";
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("blob:") ||
    raw.startsWith("data:")
  ) {
    return raw;
  }

  const configured =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env?.VITE_API_BASE_URL) ||
    "/api";
  const trimmed = String(configured || "").trim().replace(/\/+$/, "");

  let origin = "";
  if (typeof window !== "undefined" && window.location) {
    if (/^https?:\/\//i.test(trimmed)) {
      try {
        origin = new URL(trimmed).origin;
      } catch {
        origin = window.location.origin;
      }
    } else {
      origin = window.location.origin.replace(/:\d+$/, ":8012");
    }
  }

  if (!origin) return raw;
  return `${origin}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function rowsOf<T = any>(input: any): T[] {
  if (Array.isArray(input)) return input as T[];
  if (Array.isArray(input?.items)) return input.items as T[];
  if (Array.isArray(input?.data?.items)) return input.data.items as T[];
  if (Array.isArray(input?.results)) return input.results as T[];
  if (Array.isArray(input?.rows)) return input.rows as T[];
  return [];
}

function getClanId(clan: ClanItem | null | undefined): number {
  return Number(clan?.id || clan?.clan_id || 0);
}

function getClanName(clan: ClanItem | null | undefined): string {
  return firstTruthy(
    clan?.name,
    clan?.clan_name,
    clan?.marketplace_name,
    "Community"
  );
}

function getClanDescription(clan: ClanItem | null | undefined): string {
  return firstTruthy(
    clan?.description,
    clan?.clan_description,
    clan?.marketplace_description,
    "This community is available from your private Community Home."
  );
}

function getClanGlobalId(clan: ClanItem | null | undefined): string {
  return firstTruthy(
    clan?.community_global_id,
    clan?.global_id,
    clan?.gmfn_id,
    clan?.clan_code,
    clan?.code,
    getClanId(clan) ? `COMM-${getClanId(clan)}` : "",
    "Awaiting issue"
  );
}

function getClanTrust(clan: ClanItem | null | undefined): string {
  return firstTruthy(
    clan?.community_trust_band,
    clan?.trust_band,
    clan?.trust_class,
    clan?.community?.trust_band,
    clan?.marketplace?.trust_band,
    "Visible community"
  );
}

function getClanFinanceHealth(clan: ClanItem | null | undefined): string {
  return firstTruthy(
    (clan as any)?.community_finance_health,
    (clan as any)?.finance_health,
    (clan as any)?.finance_band,
    (clan as any)?.liquidity_band,
    (clan as any)?.exposure_band,
    clan?.community?.finance_health,
    clan?.community?.liquidity_band,
    clan?.marketplace?.finance_health,
    clan?.marketplace?.liquidity_band,
    "Preparing"
  );
}

function getClanCci(clan: ClanItem | null | undefined): string {
  return firstTruthy(
    (clan as any)?.community_cci_band,
    (clan as any)?.community_cci_score,
    (clan as any)?.cci_band,
    (clan as any)?.cci_score,
    (clan as any)?.community_integrity_band,
    (clan as any)?.group_integrity_band,
    clan?.community?.cci_band,
    clan?.community?.cci_score,
    clan?.marketplace?.cci_band,
    clan?.marketplace?.cci_score,
    "Preparing"
  );
}

function getClanMemberCount(clan: ClanItem | null | undefined): number {
  const count = Number(clan?.member_count ?? clan?.members_count ?? 0);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

function getClanRole(clan: ClanItem | null | undefined): string {
  return (
    firstTruthy(
      clan?.role,
      clan?.member_role,
      clan?.membership_role,
      clan?.participant_role,
      clan?.community?.role,
      clan?.profile?.role,
      clan?.marketplace?.role,
      clan?.clan?.role
    ) || ""
  );
}

function resolveMemberName(me: any): string {
  const direct =
    safeStr(me?.display_name) ||
    safeStr(me?.nickname) ||
    safeStr(me?.name) ||
    safeStr(me?.first_name);

  if (direct) return direct;

  const email = safeStr(me?.email);
  if (email.includes("@")) return email.split("@")[0] || "Member";

  return email || "Member";
}

function communityShellStyle(isCompact: boolean): React.CSSProperties {
  return {
    position: "relative",
    maxWidth: 1180,
    margin: "0 auto",
    padding: isCompact ? 12 : 22,
    paddingBottom: isCompact ? 28 : 44,
    display: "grid",
    gap: isCompact ? 14 : 18,
    borderRadius: isCompact ? 24 : 34,
    background:
      "radial-gradient(circle at 12% 0%, rgba(217,172,51,0.22) 0%, rgba(217,172,51,0) 28%), radial-gradient(circle at 92% 10%, rgba(38,132,205,0.20) 0%, rgba(38,132,205,0) 30%), linear-gradient(180deg, #071827 0%, #0B2942 42%, #EAF4FF 42.1%, #F8FBFF 100%)",
    boxShadow:
      "0 28px 70px rgba(2,12,27,0.20), inset 0 1px 0 rgba(255,255,255,0.08)",
    overflow: "hidden",
  };
}

function communityWatermarkStyle(isCompact: boolean): React.CSSProperties {
  return {
    position: "absolute",
    right: isCompact ? -28 : 20,
    top: isCompact ? 70 : 88,
    opacity: isCompact ? 0.055 : 0.08,
    pointerEvents: "none",
    filter: "drop-shadow(0 24px 38px rgba(0,0,0,0.24))",
  };
}

function communityContentStyle(isCompact: boolean): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gap: isCompact ? 14 : 18,
  };
}

function communityHeroStyle(isCompact: boolean): React.CSSProperties {
  return {
    borderRadius: isCompact ? 22 : 30,
    border: "1px solid rgba(255,255,255,0.16)",
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(238,247,255,0.92) 56%, rgba(255,244,201,0.92) 100%)",
    padding: isCompact ? 14 : 20,
    boxShadow:
      "0 20px 48px rgba(2,12,27,0.18), inset 0 1px 0 rgba(255,255,255,0.82)",
    overflow: "hidden",
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  const resolvedBg =
    bg === "#FFFFFF"
      ? "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,251,255,0.96) 100%)"
      : bg;

  return {
    borderRadius: 24,
    border: `1px solid ${COMMUNITY_BRAND.border}`,
    background: resolvedBg,
    padding: 20,
    boxShadow:
      "0 18px 44px rgba(7,24,39,0.10), 0 2px 8px rgba(15,23,42,0.03), inset 0 1px 0 rgba(255,255,255,0.74)",
    overflow: "hidden",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  const resolvedBg =
    bg === "#F8FBFF"
      ? "linear-gradient(180deg, #F8FBFF 0%, #EFF7FF 100%)"
      : bg;

  return {
    borderRadius: 18,
    border: `1px solid ${COMMUNITY_BRAND.border}`,
    background: resolvedBg,
    padding: 16,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.72)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  const resolvedBg =
    bg === "#FFFFFF"
      ? "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"
      : bg;

  return {
    borderRadius: 16,
    border: `1px solid ${COMMUNITY_BRAND.border}`,
    background: resolvedBg,
    padding: 14,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.72)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#244B72",
    fontWeight: 900,
    letterSpacing: 1.8,
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
    background: primary ? COMMUNITY_BRAND.goldSoft : "rgba(13,95,168,0.08)",
    color: primary ? "#6F4C00" : "#1E4063",
    border: primary
      ? "1px solid rgba(217,172,51,0.32)"
      : "1px solid rgba(13,95,168,0.12)",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
  };
}

function actionBtn(
  kind: "primary" | "secondary" | "soft" = "secondary",
  disabled = false
): React.CSSProperties {
  if (kind === "primary") {
    return {
      position: "relative",
      zIndex: 1,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 42,
      padding: "10px 14px",
      borderRadius: 14,
      border: disabled
        ? "1px solid rgba(148,163,184,0.26)"
        : "1px solid rgba(255,255,255,0.22)",
      background: disabled
        ? "#CBD5E1"
        : "linear-gradient(180deg, #0D5FA8 0%, #0A3D70 100%)",
      color: "#FFFFFF",
      fontWeight: 900,
      fontSize: 14,
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      opacity: disabled ? 0.86 : 1,
      boxShadow: disabled
        ? "none"
        : "0 12px 24px rgba(13,95,168,0.20), inset 0 1px 0 rgba(255,255,255,0.26)",
      touchAction: "manipulation",
    };
  }

  if (kind === "soft") {
    return {
      position: "relative",
      zIndex: 1,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 38,
      padding: "8px 12px",
      borderRadius: 12,
      border: "1px solid rgba(13,95,168,0.12)",
      background: "linear-gradient(180deg, #FFFFFF 0%, #F4F9FF 100%)",
      color: disabled ? "#94A3B8" : "#1E4063",
      fontWeight: 800,
      fontSize: 13,
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      opacity: disabled ? 0.86 : 1,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.82)",
      touchAction: "manipulation",
    };
  }

  return {
    position: "relative",
    zIndex: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(13,95,168,0.14)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #F6FAFF 100%)",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 800,
    fontSize: 14,
    textAlign: "center",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    opacity: disabled ? 0.86 : 1,
    boxShadow: "0 8px 18px rgba(7,24,39,0.05), inset 0 1px 0 rgba(255,255,255,0.82)",
    touchAction: "manipulation",
  };
}

function collapseToggle(): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(13,95,168,0.14)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #F5FAFF 100%)",
    color: "#1E4063",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
    textAlign: "center",
    whiteSpace: "normal",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.82)",
    touchAction: "manipulation",
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
    minHeight: 110,
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

function previewMediaBox(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 220,
    borderRadius: 22,
    border: "1px solid rgba(212,175,55,0.16)",
    background: "linear-gradient(180deg, #15314C 0%, #21496C 56%, #2B5E88 100%)",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow:
      "0 20px 42px rgba(2,12,27,0.18), inset 0 1px 0 rgba(255,255,255,0.04)",
  };
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

  return "Not available yet";
}

function getPoolCurrency(payload: any): string {
  return firstTruthy(
    payload?.currency,
    payload?.summary?.currency,
    payload?.totals?.currency,
    "NGN"
  );
}

function getSummaryTotal(payload: any, key: string, fallback = "0.00"): string {
  return firstTruthy(payload?.totals?.[key], payload?.summary?.totals?.[key], fallback);
}

function getSummaryCurrency(payload: any): string {
  return firstTruthy(payload?.currency, payload?.summary?.currency, "NGN");
}

function formatMoneySignal(amount: string, currency: string): string {
  const cleanAmount = safeStr(amount) || "0.00";
  const cleanCurrency = safeStr(currency) || "NGN";
  return `${cleanAmount} ${cleanCurrency}`;
}

function getInviteUrl(payload: any): string {
  return firstTruthy(
    payload?.url,
    payload?.invite_url,
    payload?.link,
    payload?.invite_link
  );
}

function demandUrgencyLabel(value?: string | null): string {
  const urgency = safeStr(value).toLowerCase();
  if (urgency === "high") return "Urgent";
  if (urgency === "low") return "Low pressure";
  return "Normal";
}

function safeDateTime(value: any): string {
  const raw = safeStr(value);
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function isMineDemandRow(row: DemandRow, me: any): boolean {
  if (row?.is_mine === true || row?.mine === true) return true;

  const myGmfnId = safeStr(me?.gmfn_id).toUpperCase();
  const rowGmfnId = safeStr(row?.requester_gmfn_id).toUpperCase();
  if (myGmfnId && rowGmfnId && myGmfnId === rowGmfnId) return true;

  const myEmail = safeStr(me?.email).toLowerCase();
  const rowEmail = safeStr(row?.requester_email).toLowerCase();
  return Boolean(myEmail && rowEmail && myEmail === rowEmail);
}

function expectedPaymentState(item: ExpectedPaymentRecord): string {
  if (safeStr(item.confirmed_at)) return "Confirmed";
  if (item.matched_bank_event_id) return "Matched";
  if (safeStr(item.reference_display)) return "Awaiting reconciliation";
  return "Awaiting issue";
}

function expectedPaymentNextAction(item: ExpectedPaymentRecord): string {
  const state = expectedPaymentState(item);
  if (state === "Confirmed") {
    return "Use the unlocked money route or dependent feature.";
  }
  if (state === "Matched") {
    return "Wait for reconciliation to finish and confirmation to post.";
  }
  if (state === "Awaiting reconciliation") {
    return "Pay with the exact reference, then wait for the bank match.";
  }
  return "Generate or refresh the instruction so a usable reference can be issued.";
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

function removeLocal(key: string) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function spotlightDraftStorageKey(clanId: number): string {
  return `${SPOTLIGHT_DRAFT_PREFIX}${clanId}`;
}

function defaultCollapseState(): CollapseState {
  return {
    selected: false,
    tools: true,
    circle: false,
    spotlight: true,
    communities: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    selected: Boolean(raw?.selected ?? base.selected),
    tools: Boolean(raw?.tools ?? base.tools),
    circle: Boolean(raw?.circle ?? base.circle),
    spotlight: Boolean(raw?.spotlight ?? base.spotlight),
    communities: Boolean(raw?.communities ?? base.communities),
  };
}

export default function CommunityHomePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [me, setMe] = useState<any>(null);
  const [clans, setClans] = useState<ClanItem[]>([]);
  const [selectedClan, setSelectedClan] = useState<ClanItem | null>(null);
  const [poolInfo, setPoolInfo] = useState<any>(null);
  const [poolSummary, setPoolSummary] = useState<any>(null);
  const [poolSummaryIssue, setPoolSummaryIssue] = useState("");
  const [inviteLink, setInviteLink] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [changingClanId, setChangingClanId] = useState<number>(0);

  const [notice, setNotice] = useState<{
    tone: NoticeTone;
    text: string;
  } | null>(null);

  const [spotlightDescription, setSpotlightDescription] = useState("");
  const [spotlightTagNumber, setSpotlightTagNumber] = useState("");
  const [spotlightExpiry, setSpotlightExpiry] = useState("");
  const [spotlightImageFile, setSpotlightImageFile] = useState<File | null>(
    null
  );
  const [spotlightPreviewUrl, setSpotlightPreviewUrl] = useState("");
  const [preparingSpotlightImage, setPreparingSpotlightImage] = useState(false);
  const [spotlightVideoFile, setSpotlightVideoFile] = useState<File | null>(
    null
  );
  const [spotlightVideoPreviewUrl, setSpotlightVideoPreviewUrl] = useState("");
  const [spotlightVideoDurationSeconds, setSpotlightVideoDurationSeconds] =
    useState<number | null>(null);
  const [preparingSpotlightVideo, setPreparingSpotlightVideo] = useState(false);
  const [spotlightFileInputKey, setSpotlightFileInputKey] = useState(0);
  const [spotlightVideoInputKey, setSpotlightVideoInputKey] = useState(0);
  const [spotlightNotice, setSpotlightNotice] = useState<{
    tone: NoticeTone;
    text: string;
  } | null>(null);
  const [activeCommunitySpotlight, setActiveCommunitySpotlight] =
    useState<ActiveCommunitySpotlight | null>(null);
  const [activeCommunitySpotlightLoading, setActiveCommunitySpotlightLoading] =
    useState(false);
  const [activeCommunitySpotlightSyncIssue, setActiveCommunitySpotlightSyncIssue] =
    useState("");
  const [publishingSpotlight, setPublishingSpotlight] = useState(false);
  const [moneySurface, setMoneySurface] = useState<CommunityMoneySurface | null>(null);
  const [expectedPayments, setExpectedPayments] = useState<ExpectedPaymentRecord[]>([]);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeSyncIssue, setFinanceSyncIssue] = useState("");
  const [myOpenDemands, setMyOpenDemands] = useState<DemandRow[]>([]);
  const [visibleDemands, setVisibleDemands] = useState<DemandRow[]>([]);
  const [demandLoading, setDemandLoading] = useState(false);
  const [demandSyncIssue, setDemandSyncIssue] = useState("");

  const [firstCircleDraft, setFirstCircleDraft] = useState(() =>
    loadFirstCircleDraft()
  );

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(COMMUNITY_HOME_COLLAPSE_KEY, defaultCollapseState())
    )
  );
  const spotlightImagePrepJobRef = useRef(0);
  const spotlightVideoPrepJobRef = useRef(0);

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
    writeLocalJSON(COMMUNITY_HOME_COLLAPSE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 2600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [notice]);

  useEffect(() => {
    if (!spotlightImageFile) {
      setSpotlightPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(spotlightImageFile);
    setSpotlightPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [spotlightImageFile]);

  useEffect(() => {
    if (!spotlightVideoFile) {
      setSpotlightVideoPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(spotlightVideoFile);
    setSpotlightVideoPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [spotlightVideoFile]);

  useEffect(() => {
    function refreshFirstCircleDraft() {
      setFirstCircleDraft(loadFirstCircleDraft());
    }

    refreshFirstCircleDraft();

    if (typeof window === "undefined") return;

    window.addEventListener("focus", refreshFirstCircleDraft);
    window.addEventListener("storage", refreshFirstCircleDraft);
    document.addEventListener("visibilitychange", refreshFirstCircleDraft);

    return () => {
      window.removeEventListener("focus", refreshFirstCircleDraft);
      window.removeEventListener("storage", refreshFirstCircleDraft);
      document.removeEventListener("visibilitychange", refreshFirstCircleDraft);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const [meRes, clansRes] = await Promise.all([
          getMe().catch(() => null),
          listMyClans().catch(() => ({ items: [] })),
        ]);

        const rows: ClanItem[] = Array.isArray(clansRes)
          ? clansRes
          : Array.isArray(clansRes?.items)
          ? clansRes.items
          : [];

        const storedId = Number(getSelectedClanId() || 0);
        const current =
          rows.find((item) => getClanId(item) === storedId) || rows[0] || null;

        if (current) {
          const currentId = getClanId(current);

          if (currentId && currentId !== storedId) {
            await selectClan(currentId).catch(() => null);
          }
        }

        if (!alive) return;

        setMe(meRes || null);
        setClans(rows);
        setSelectedClan(current);
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

  useEffect(() => {
    let alive = true;

    const clanId = getClanId(selectedClan);

    if (!clanId) {
      setPoolInfo(null);
      setPoolSummary(null);
      setPoolSummaryIssue("");
      setInviteLink("");
      return;
    }

    (async () => {
      const [poolRes, summaryRes, inviteRes] = await Promise.all([
        getPoolMe("NGN", 20).catch(() => null),
        getPoolMeSummary("NGN").catch((err) => ({
          __failed: String(
            err?.message || err || "Cumulative finance summary is not ready."
          ),
        })),
        getClanInviteLink(clanId).catch(() => null),
      ]);

      if (!alive) return;

      setPoolInfo(poolRes);
      setPoolSummary(
        summaryRes && !(summaryRes as any).__failed ? summaryRes : null
      );
      setPoolSummaryIssue(safeStr((summaryRes as any)?.__failed || ""));
      setInviteLink(getInviteUrl(inviteRes));
    })();

    return () => {
      alive = false;
    };
  }, [selectedClan]);

  useEffect(() => {
    let alive = true;

    const clanId = getClanId(selectedClan);

    if (!clanId) {
      setMyOpenDemands([]);
      setVisibleDemands([]);
      setDemandSyncIssue("");
      setDemandLoading(false);
      return;
    }

    (async () => {
      setDemandLoading(true);

      try {
        const [myRes, visibleRes] = await Promise.all([
          listMarketplaceRequests({
            clan_id: clanId,
            mine_only: true,
            status: "open",
            limit: 20,
          }).catch((err) => ({
            items: [],
            __failed: String(err?.message || err || "My demand refresh failed."),
          })),
          listMarketplaceRequests({
            clan_id: clanId,
            mine_only: false,
            status: "open",
            limit: 20,
          }).catch((err) => ({
            items: [],
            __failed: String(
              err?.message || err || "Visible demand refresh failed."
            ),
          })),
        ]);

        if (!alive) return;

        const myRows = rowsOf<DemandRow>(myRes).sort((a, b) =>
          safeStr(b?.created_at).localeCompare(safeStr(a?.created_at))
        );
        const visibleRows = rowsOf<DemandRow>(visibleRes)
          .filter((row) => !isMineDemandRow(row, me))
          .sort((a, b) =>
            safeStr(b?.created_at).localeCompare(safeStr(a?.created_at))
          );

        setMyOpenDemands(myRows);
        setVisibleDemands(visibleRows);
        setDemandSyncIssue(
          [safeStr((myRes as any)?.__failed), safeStr((visibleRes as any)?.__failed)]
            .filter(Boolean)
            .join(" ")
        );
      } finally {
        if (alive) {
          setDemandLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedClan, me]);

  useEffect(() => {
    let alive = true;

    const clanId = getClanId(selectedClan);
    const gmfnId = safeStr(me?.gmfn_id);

    if (!clanId || !gmfnId) {
      setMoneySurface(null);
      setExpectedPayments([]);
      setFinanceSyncIssue("");
      setFinanceLoading(false);
      return;
    }

    (async () => {
      setFinanceLoading(true);

      try {
        const [surfaceRes, expectedRes] = await Promise.all([
          getCommunityMoneySurface(clanId, gmfnId, "NGN").catch((err) => ({
            __failed: String(err?.message || err || "Finance page refresh failed."),
          })),
          listExpectedPayments({ clan_id: clanId, limit: 30 }).catch((err) => ({
            items: [],
            __failed: String(err?.message || err || "Expected payment refresh failed."),
          })),
        ]);

        if (!alive) return;

        const nextSurface =
          surfaceRes && !("__failed" in (surfaceRes as any))
            ? (surfaceRes as CommunityMoneySurface)
            : null;
        const nextExpectedPayments = rowsOf<ExpectedPaymentRecord>(expectedRes).filter(
          (item) => !["applied", "cancelled", "expired"].includes(safeStr(item?.status).toLowerCase())
        );

        setMoneySurface(nextSurface);
        setExpectedPayments(nextExpectedPayments);
        setFinanceSyncIssue(
          [
            safeStr((surfaceRes as any)?.__failed),
            safeStr((expectedRes as any)?.__failed),
          ]
            .filter(Boolean)
            .join(" ")
        );
      } finally {
        if (alive) {
          setFinanceLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedClan, me]);

  useEffect(() => {
    const clanId = getClanId(selectedClan);
    if (!clanId) {
      setSpotlightDescription("");
      setSpotlightTagNumber("");
      setSpotlightExpiry("");
      setSpotlightImageFile(null);
      setSpotlightPreviewUrl("");
      setSpotlightFileInputKey((x) => x + 1);
      return;
    }

    const draft = readLocalJSON<SpotlightDraftState>(
      spotlightDraftStorageKey(clanId),
      {
        description: "",
        tagNumber: "",
        expiry: "",
      }
    );

    setSpotlightDescription(draft.description || "");
    setSpotlightTagNumber(draft.tagNumber || "");
    setSpotlightExpiry(draft.expiry || "");
    setSpotlightImageFile(null);
    setSpotlightPreviewUrl("");
    setSpotlightFileInputKey((x) => x + 1);
  }, [selectedClan]);

  useEffect(() => {
    const clanId = getClanId(selectedClan);
    if (!clanId) return;

    writeLocalJSON(spotlightDraftStorageKey(clanId), {
      description: spotlightDescription,
      tagNumber: spotlightTagNumber,
      expiry: spotlightExpiry,
    });
  }, [selectedClan, spotlightDescription, spotlightTagNumber, spotlightExpiry]);

  const selectedClanName = getClanName(selectedClan);
  const selectedClanDescription = getClanDescription(selectedClan);
  const selectedClanGlobalId = getClanGlobalId(selectedClan);
  const selectedClanTrust = getClanTrust(selectedClan);
  const selectedClanFinanceHealth = getClanFinanceHealth(selectedClan);
  const selectedClanCci = getClanCci(selectedClan);
  const selectedClanMemberCount = getClanMemberCount(selectedClan);
  const selectedClanRole = getClanRole(selectedClan);
  const selectedClanId = getClanId(selectedClan);
  const memberGlobalId = firstTruthy(
    me?.gmfn_id,
    me?.global_member_id,
    me?.member_global_id,
    me?.member_id,
    me?.id,
    "Awaiting issue"
  );

  const poolAmount = getPoolAmountText(poolInfo);
  const poolCurrency = getPoolCurrency(poolInfo);
  const poolSummaryCurrency = getSummaryCurrency(poolSummary);
  const cumulativeAvailable = getSummaryTotal(
    poolSummary,
    "effective_available",
    getSummaryTotal(poolSummary, "available_balance", "0.00")
  );
  const cumulativeReserved = getSummaryTotal(poolSummary, "reserved_pool", "0.00");
  const cumulativePendingIn = getSummaryTotal(poolSummary, "pending_deposits", "0.00");
  const cumulativePendingOut = getSummaryTotal(poolSummary, "pending_withdrawals", "0.00");
  const cumulativeLockedGuarantee = getSummaryTotal(
    poolSummary,
    "guarantee_locked_as_guarantor",
    "0.00"
  );
  const communityHomeOwnerName = resolveMemberName(me);
  const communityCountFromSummary = Number(poolSummary?.communities_count || clans.length || 0);

  const sortedClans = useMemo(() => {
    return [...clans].sort((a, b) => getClanName(a).localeCompare(getClanName(b)));
  }, [clans]);

  const urgentDemandCount = useMemo(() => {
    return [...myOpenDemands, ...visibleDemands].filter(
      (row) => safeStr(row?.urgency).toLowerCase() === "high"
    ).length;
  }, [myOpenDemands, visibleDemands]);

  const demandPreviewRows = useMemo(() => {
    return [...myOpenDemands, ...visibleDemands]
      .sort((a, b) => safeStr(b?.created_at).localeCompare(safeStr(a?.created_at)))
      .slice(0, 3);
  }, [myOpenDemands, visibleDemands]);

  const demandNextAction = useMemo(() => {
    if (!selectedClanId) {
      return {
        title: "Select a community before managing demand",
        detail:
          "Demand belongs to a real community. Choose your active community first, then create or review live need signals here.",
      };
    }

    if (urgentDemandCount > 0) {
      return {
        title: "Review urgent demand before it drifts",
        detail:
          "Urgent need signals are already live in this community. Open Demand Box or Action Inbox and decide the next clean follow-up.",
      };
    }

    if (myOpenDemands.length > 0) {
      return {
        title: "Keep your open demand current",
        detail:
          "You already have live demand in this community. Review it, update it, or close it cleanly so notices and visibility stay credible.",
      };
    }

    return {
      title: "Create the next real demand from Community Home",
      detail:
        "Start the next real demand here, then continue in Demand Box when you want the fuller follow-up view.",
    };
  }, [selectedClanId, urgentDemandCount, myOpenDemands.length]);

  const activeExpectedPayments = useMemo(() => {
    return expectedPayments;
  }, [expectedPayments]);

  const pendingFinanceCount = useMemo(() => {
    return activeExpectedPayments.filter((item) => {
      const state = expectedPaymentState(item);
      return state === "Matched" || state === "Awaiting reconciliation";
    }).length;
  }, [activeExpectedPayments]);

  const financePreviewPayments = useMemo(() => {
    return activeExpectedPayments
      .slice()
      .sort((a, b) => safeStr(b?.due_at).localeCompare(safeStr(a?.due_at)))
      .slice(0, 3);
  }, [activeExpectedPayments]);

  const financeNextAction = useMemo(() => {
    if (!selectedClanId) {
      return {
        title: "Select a marketplace group before reviewing finance",
        detail:
          "Choose one community from Community Home first, then review its local signal here before opening the combined Finance workspace.",
      };
    }

    if (pendingFinanceCount > 0) {
      return {
        title: "Reconciliation is waiting inside this marketplace signal",
        detail:
          "One or more expected payments are still waiting for confirmation or bank match. Review this local group signal first, then open Finance for the fuller cumulative money record.",
      };
    }

    if (moneySurface?.pendingWithdrawals && safeStr(moneySurface.pendingWithdrawals) !== "0.00") {
      return {
        title: "A money-out record is already open in this marketplace",
        detail:
          "Withdrawal movement is already visible in this selected marketplace signal. Review the current record and destination details before opening another page.",
      };
    }

    return {
      title: "Community Home shows the local finance signal only",
      detail:
        "Review this marketplace group signal here first, then open Finance when you need your combined money record across all marketplaces.",
    };
  }, [selectedClanId, pendingFinanceCount, moneySurface]);

  const cumulativeFinanceNextAction = useMemo(() => {
    if (poolSummaryIssue) {
      return {
        title: "Cumulative finance is syncing",
        detail:
          "The app can still show the selected community signal, but the full cross-community finance reading needs another refresh.",
      };
    }

    if (Number(cumulativeLockedGuarantee || 0) > 0) {
      return {
        title: "Part of your pool is already backing trust",
        detail:
          "Some money is locked because you guaranteed support. Open Finance to see where the lock sits before taking another money step.",
      };
    }

    if (
      Number(cumulativePendingIn || 0) > 0 ||
      Number(cumulativePendingOut || 0) > 0
    ) {
      return {
        title: "Money movement is still settling",
        detail:
          "At least one money-in or money-out record is not fully settled yet. Open Finance when you need the full cross-community record.",
      };
    }

    return {
      title: "Your cross-community finance signal is steady",
      detail:
        "This is your quick money reading across the communities attached to your GSN ID. Open Finance for the fuller breakdown.",
    };
  }, [
    cumulativeLockedGuarantee,
    cumulativePendingIn,
    cumulativePendingOut,
    poolSummaryIssue,
  ]);

  const firstCircleProgress = useMemo(
    () => getFirstCircleProgress(firstCircleDraft),
    [firstCircleDraft]
  );

  const readyFirstCircleContacts = useMemo(() => {
    return firstCircleDraft.contacts.filter(
      (item) => item.selected && isContactInviteReady(item)
    );
  }, [firstCircleDraft]);

  const firstCircleRelationshipHints = useMemo(() => {
    return getSuggestedRelationshipsForRole(firstCircleDraft.memberRole);
  }, [firstCircleDraft.memberRole]);

  const communitySpotlightNextAction = useMemo(() => {
    const hasDraft =
      Boolean(safeStr(spotlightDescription)) ||
      Boolean(safeStr(spotlightTagNumber)) ||
      Boolean(safeStr(spotlightExpiry)) ||
      Boolean(spotlightImageFile) ||
      Boolean(spotlightVideoFile);

    if (activeCommunitySpotlight) {
      return {
        title: "Keep the live spotlight visible or replace it deliberately",
        detail: activeCommunitySpotlight.expiresAt
          ? "A spotlight is already active for this community. Let it run until expiry unless there is a real reason to replace the current live item."
          : "A spotlight is already active without an expiry. Replace it only when you are ready for the new image and message to become the live community signal.",
      };
    }

    if (hasDraft) {
      return {
        title: "Publish the prepared spotlight when the message is ready",
        detail:
          "Your draft is already in progress. Review the preview carefully, then publish so the live community spotlight state updates from backend truth.",
      };
    }

    return {
      title: "Prepare a spotlight draft first",
      detail:
        "Add the description, optional expiry, and image or short video here. Once the draft looks right, publish it so the live state can appear below.",
    };
  }, [
    activeCommunitySpotlight,
    spotlightDescription,
    spotlightTagNumber,
    spotlightExpiry,
    spotlightImageFile,
    spotlightVideoFile,
  ]);

  async function refreshActiveCommunitySpotlight(clanId: number) {
    if (!clanId) {
      setActiveCommunitySpotlight(null);
      setActiveCommunitySpotlightLoading(false);
      setActiveCommunitySpotlightSyncIssue("");
      return;
    }

    setActiveCommunitySpotlightLoading(true);

    try {
      const res = await getMarketplaceBroadcasts({
        clan_id: clanId,
        active_only: true,
        limit: 12,
      }).catch((err) => ({
        items: [],
        __failed: String(err?.message || err || "Spotlight refresh failed."),
      }));

      const rows = Array.isArray((res as any)?.items)
        ? (res as any).items
        : Array.isArray(res)
        ? res
        : [];

      const firstActive = rows[0] || null;

      setActiveCommunitySpotlight(
        firstActive
          ? {
              id: Number(firstActive?.id || 0) || undefined,
              message: safeStr(firstActive?.message || ""),
              imageUrl: toBackendAssetUrl(safeStr(firstActive?.image_url || "")),
              videoUrl: toBackendAssetUrl(safeStr(firstActive?.video_url || "")),
              expiresAt: safeStr(firstActive?.expires_at || ""),
              createdAt: safeStr(firstActive?.created_at || ""),
            }
          : null
      );
      setActiveCommunitySpotlightSyncIssue(safeStr((res as any)?.__failed || ""));
    } finally {
      setActiveCommunitySpotlightLoading(false);
    }
  }

  useEffect(() => {
    const clanId = getClanId(selectedClan);

    if (!clanId) {
      setActiveCommunitySpotlight(null);
      setActiveCommunitySpotlightLoading(false);
      return;
    }

    let alive = true;

    async function loadIfAlive() {
      if (!alive) return;
      await refreshActiveCommunitySpotlight(clanId);
    }

    void loadIfAlive();

    const timer = window.setInterval(() => {
      void loadIfAlive();
    }, 60000);

    function handleFocusRefresh() {
      void loadIfAlive();
    }

    function handleVisibilityRefresh() {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void loadIfAlive();
      }
    }

    window.addEventListener("focus", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, [selectedClan]);

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  function showSpotlightNotice(tone: NoticeTone, text: string) {
    setSpotlightNotice({ tone, text });
    showNotice(tone, text);
  }

  function toggleSection(key: CollapseKey) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function openGrowYourCircle() {
    setCollapsed((prev) => ({ ...prev, circle: false }));

    if (typeof document !== "undefined") {
      const el = document.getElementById("community-home-grow-your-circle");
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  function openSpotlightGears() {
    setCollapsed((prev) => ({ ...prev, spotlight: false }));

    if (typeof document !== "undefined") {
      const el = document.getElementById("community-home-spotlight-gears");
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  function openShopControlPanel() {
    if (typeof document !== "undefined") {
      const el = document.getElementById("community-home-shop-control");
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  async function handleSelectCommunity(clan: ClanItem, openAfter = false) {
    const clanId = getClanId(clan);
    if (!clanId) {
      showNotice("error", "This community is missing a usable ID.");
      return;
    }

    setChangingClanId(clanId);

    try {
      await selectClan(clanId);
      setSelectedClan(clan);

      if (openAfter) {
        navigateWithOrigin(navigate, "/app/marketplace", location);
      } else {
        showNotice(
          "success",
          `${getClanName(clan)} is now your current community.`
        );
      }
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "This community could not be selected right now."
      );
    } finally {
      setChangingClanId(0);
    }
  }

  function copyInviteLink() {
    if (!inviteLink) {
      showNotice("error", "Invite link is not ready yet.");
      return;
    }

    safeCopy(inviteLink);
    showNotice("success", "Invite link copied.");
  }

  function copyCommunityId() {
    if (!selectedClanGlobalId) {
      showNotice("error", "Community ID is not ready yet.");
      return;
    }

    safeCopy(selectedClanGlobalId);
    showNotice("success", "Community ID copied.");
  }

  function consumeCommunityPointerEvent(
    event?: React.SyntheticEvent<HTMLElement>
  ) {
    if (!event) return;
    event.stopPropagation();
  }

  function consumeCommunityButtonEvent(
    event?: React.SyntheticEvent<HTMLElement>
  ) {
    if (!event) return;

    if (event.type === "click" || event.type === "submit") {
      event.preventDefault();
    }

    event.stopPropagation();
  }

  function openCommunityRoute(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    to: string
  ) {
    consumeCommunityButtonEvent(event);
    navigateWithOrigin(navigate, to, location);
  }

  async function openSelectedMarketplace() {
    if (!selectedClanId || !selectedClan) {
      showNotice("error", "Select a community first.");
      return;
    }

    setChangingClanId(selectedClanId);

    try {
      await selectClan(selectedClanId);
      navigateWithOrigin(navigate, "/app/marketplace", location);
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Selected community could not be opened."
      );
    } finally {
      setChangingClanId(0);
    }
  }

  function clearSpotlightDraft() {
    const clanId = getClanId(selectedClan);
    spotlightImagePrepJobRef.current += 1;
    spotlightVideoPrepJobRef.current += 1;

    setSpotlightImageFile(null);
    setSpotlightVideoFile(null);
    setSpotlightVideoDurationSeconds(null);
    setPreparingSpotlightImage(false);
    setPreparingSpotlightVideo(false);
    setSpotlightNotice(null);
    setSpotlightDescription("");
    setSpotlightTagNumber("");
    setSpotlightExpiry("");
    setSpotlightPreviewUrl("");
    setSpotlightVideoPreviewUrl("");
    setSpotlightFileInputKey((x) => x + 1);
    setSpotlightVideoInputKey((x) => x + 1);

    if (clanId) {
      removeLocal(spotlightDraftStorageKey(clanId));
    }
  }

  async function handleSpotlightImageChange(file: File | null) {
    spotlightImagePrepJobRef.current += 1;
    const prepJob = spotlightImagePrepJobRef.current;

    if (!file) {
      setPreparingSpotlightImage(false);
      setSpotlightImageFile(null);
      setSpotlightNotice(null);
      return;
    }

    const validationIssue = validateSpotlightImageFile(file, false);
    if (validationIssue) {
      setPreparingSpotlightImage(false);
      setSpotlightImageFile(null);
      setSpotlightPreviewUrl("");
      setSpotlightFileInputKey((x) => x + 1);
      showSpotlightNotice("error", validationIssue);
      return;
    }

    try {
      setPreparingSpotlightImage(true);

      const prepared = await prepareSpotlightImageFile(file, {
        maxBytes: SPOTLIGHT_MAX_IMAGE_BYTES,
      });
      if (spotlightImagePrepJobRef.current !== prepJob) return;

      const preparedValidationIssue = validateSpotlightImageFile(
        prepared.file,
        true
      );
      if (preparedValidationIssue) {
        throw new Error(preparedValidationIssue);
      }

      setSpotlightImageFile(prepared.file);
      setSpotlightNotice({
        tone: "success",
        text:
          prepared.message ||
          (spotlightVideoFile
            ? `${safeStr(prepared.file.name) || "Selected image"} is ready as the fallback cover for your spotlight video.`
            : `${safeStr(prepared.file.name) || "Selected image"} is ready for spotlight publish.`),
      });
    } catch (err: any) {
      if (spotlightImagePrepJobRef.current !== prepJob) return;
      setSpotlightImageFile(null);
      setSpotlightPreviewUrl("");
      setSpotlightFileInputKey((x) => x + 1);
      showSpotlightNotice(
        "error",
        safeStr(err?.message) || "This image could not be prepared right now."
      );
    } finally {
      if (spotlightImagePrepJobRef.current === prepJob) {
        setPreparingSpotlightImage(false);
      }
    }
  }

  async function handleSpotlightVideoChange(file: File | null) {
    spotlightVideoPrepJobRef.current += 1;
    const prepJob = spotlightVideoPrepJobRef.current;

    if (!file) {
      setPreparingSpotlightVideo(false);
      setSpotlightVideoFile(null);
      setSpotlightVideoDurationSeconds(null);
      setSpotlightNotice(null);
      return;
    }

    const validationIssue = validateSpotlightVideoFile(file, false);
    if (validationIssue) {
      setPreparingSpotlightVideo(false);
      setSpotlightVideoFile(null);
      setSpotlightVideoDurationSeconds(null);
      setSpotlightVideoPreviewUrl("");
      setSpotlightVideoInputKey((x) => x + 1);
      showSpotlightNotice("error", validationIssue);
      return;
    }

    try {
      setPreparingSpotlightVideo(true);

      const prepared = await prepareSpotlightVideoFile(file, {
        maxBytes: SPOTLIGHT_MAX_VIDEO_BYTES,
        maxDurationSeconds: 5,
      });
      if (spotlightVideoPrepJobRef.current !== prepJob) return;

      const preparedValidationIssue = validateSpotlightVideoFile(
        prepared.file,
        true
      );
      if (preparedValidationIssue) {
        throw new Error(preparedValidationIssue);
      }

      setSpotlightVideoFile(prepared.file);
      setSpotlightVideoDurationSeconds(prepared.durationSeconds ?? null);
      setSpotlightNotice({
        tone: "success",
        text:
          prepared.message ||
          (spotlightImageFile
            ? `${safeStr(prepared.file.name) || "Selected video"} is ready for spotlight publish. Your selected image will stay as the fallback cover.`
            : `${safeStr(prepared.file.name) || "Selected video"} is ready for spotlight publish.`),
      });
    } catch (err: any) {
      if (spotlightVideoPrepJobRef.current !== prepJob) return;
      setSpotlightVideoFile(null);
      setSpotlightVideoDurationSeconds(null);
      setSpotlightVideoPreviewUrl("");
      setSpotlightVideoInputKey((x) => x + 1);
      showSpotlightNotice(
        "error",
        safeStr(err?.message) || "This video could not be prepared right now."
      );
    } finally {
      if (spotlightVideoPrepJobRef.current === prepJob) {
        setPreparingSpotlightVideo(false);
      }
    }
  }

  function copyFirstCircleInviteBundle() {
    if (readyFirstCircleContacts.length === 0) {
      showNotice("error", "No ready invite draft is available yet.");
      return;
    }

    const bundle = buildInviteBundle({
      draft: firstCircleDraft,
      memberName: resolveMemberName(me),
      gmfnId: safeStr(me?.gmfn_id || ""),
      communityName: selectedClanName || "your community",
    });

    safeCopy(bundle);
    showNotice("success", "First-circle invite bundle copied.");
  }

  async function publishSpotlight() {
    if (!selectedClanId) {
      showSpotlightNotice(
        "error",
        "Select a community before publishing spotlight."
      );
      return;
    }

    if (preparingSpotlightImage || preparingSpotlightVideo) {
      showSpotlightNotice(
        "error",
        "Please wait while the app prepares your spotlight media."
      );
      return;
    }

    const description = safeStr(spotlightDescription);
    const tagNumber = safeStr(spotlightTagNumber);
    const expiry = safeStr(spotlightExpiry);
    const myGmfnId = safeStr(me?.gmfn_id || "");

    const combinedMessage = [description, tagNumber ? `Tag: ${tagNumber}` : ""]
      .filter(Boolean)
      .join("\n");

    if (!combinedMessage && !spotlightImageFile && !spotlightVideoFile) {
      showSpotlightNotice(
        "error",
        "Add a spotlight description, image, or short video first."
      );
      return;
    }

    const imageValidationIssue = validateSpotlightImageFile(spotlightImageFile);
    if (imageValidationIssue) {
      showSpotlightNotice("error", imageValidationIssue);
      return;
    }

    const videoValidationIssue = validateSpotlightVideoFile(spotlightVideoFile);
    if (videoValidationIssue) {
      showSpotlightNotice("error", videoValidationIssue);
      return;
    }

    try {
      setPublishingSpotlight(true);
      setSpotlightNotice(null);

      let imageUrl = "";
      let videoUrl = "";
      let spotlightShopId = 0;

      if (spotlightImageFile) {
        const uploadRes = await uploadMarketplaceImageFile(
          spotlightImageFile,
          selectedClanId
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
          spotlightVideoDurationSeconds,
          selectedClanId
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

      if (myGmfnId) {
        const shopRes = await getMarketplaceShopByGmfnId(myGmfnId, {
          clan_id: selectedClanId,
          header_clan_id: selectedClanId,
        }).catch(() => null);

        spotlightShopId = Number(
          shopRes?.item?.id || shopRes?.item?.shop_id || shopRes?.shop_id || 0
        );
      }

      const resolvedExpiry = expiry
        ? new Date(expiry).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      await createMarketplaceBroadcast({
        clan_id: selectedClanId,
        shop_id: spotlightShopId > 0 ? spotlightShopId : undefined,
        message: combinedMessage || "Spotlight update",
        image_url: imageUrl || undefined,
        video_url: videoUrl || undefined,
        expires_at: resolvedExpiry,
      });

      await refreshActiveCommunitySpotlight(selectedClanId);
      clearSpotlightDraft();

      showSpotlightNotice(
        "success",
        videoUrl
          ? "Spotlight video uploaded successfully. It should now appear on the dashboard spotlight screen."
          : "Spotlight uploaded successfully. It should now appear on the dashboard spotlight screen."
      );
    } catch (err: any) {
      showSpotlightNotice(
        "error",
        safeStr(err?.message) || "Spotlight upload failed."
      );
    } finally {
      setPublishingSpotlight(false);
    }
  }

  if (loading) {
    return (
      <div style={communityShellStyle(isCompact)}>
        <div style={communityWatermarkStyle(isCompact)} aria-hidden="true">
          <GSNBrandMark width={isCompact ? 180 : 260} height={isCompact ? 218 : 315} />
        </div>
        <div style={communityContentStyle(isCompact)}>
          <PageTopNav
            sectionLabel="Community Home"
            title="Community Home"
            subtitle="Loading your current community..."
            homeTo="/app/dashboard"
            homeLabel="Dashboard"
            backTo="/app/dashboard"
            nextLinks={[
              { label: "Marketplace", to: "/app/marketplace" },
              { label: "Notifications", to: "/app/notifications" },
            ]}
          />

          <section style={pageCard("#FFFFFF")}>
            <div style={{ color: "#64748B", lineHeight: 1.8 }}>
              Loading your communities...
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (clans.length === 0) {
    return (
      <div style={communityShellStyle(isCompact)}>
        <div style={communityWatermarkStyle(isCompact)} aria-hidden="true">
          <GSNBrandMark width={isCompact ? 180 : 260} height={isCompact ? 218 : 315} />
        </div>
        <div style={communityContentStyle(isCompact)}>
          <PageTopNav
            sectionLabel="Community Home"
            title="Community Home"
            subtitle="Choose a working community here, confirm where you are, and move into the right community route."
            homeTo="/app/dashboard"
            homeLabel="Dashboard"
            backTo="/app/dashboard"
            nextLinks={[
              { label: "My GSN and I", to: "/app/my-gmfn-and-i" },
              { label: "Trust", to: "/app/trust" },
            ]}
          />

          <DomainIntroToggle
            title="About Community Home"
            eyebrow="Your guide"
            body="This is where your communities will appear. Create or join one first, then come back here to choose the group you want to work in."
            bullets={[
              "Create or join a community first.",
              "Then choose the group you want to work in.",
              "Finance, Trust Passport, and Shop Gallery become clearer after your first community is in place.",
            ]}
            note="Simple rule: your groups gather here before you open one for live work."
            tone="dark"
          />

          <section style={pageCard("#FFFFFF")}>
            <div style={sectionLabel()}>No communities yet</div>

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
              You do not have any visible communities in Community Home yet.
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
              Create or join a community first. After that, Community Home will
              show your groups in one place and let you open the right
              marketplace when you need to work.
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
                onPointerDown={consumeCommunityPointerEvent}
                onClick={(event) => openCommunityRoute(event, "/app/clans")}
                style={actionBtn("primary")}
              >
                Create New Community
              </button>
              <button
                type="button"
                onPointerDown={consumeCommunityPointerEvent}
                onClick={(event) =>
                  openCommunityRoute(event, "/app/build-first-circle")
                }
                style={actionBtn("secondary")}
              >
                Build Your First Circle
              </button>
              <button
                type="button"
                onPointerDown={consumeCommunityPointerEvent}
                onClick={(event) => openCommunityRoute(event, "/app/dashboard")}
                style={actionBtn("secondary")}
              >
                Dashboard
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div style={communityShellStyle(isCompact)}>
      <div style={communityWatermarkStyle(isCompact)} aria-hidden="true">
        <GSNBrandMark width={isCompact ? 180 : 260} height={isCompact ? 218 : 315} />
      </div>
      <div style={communityContentStyle(isCompact)}>
      <PageTopNav
        sectionLabel="Community Home"
        title="Community Home"
        subtitle="All your communities live here. Choose one, then open its Marketplace to work inside it."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/dashboard"
        nextLinks={[
          { label: "Marketplace", to: "/app/marketplace" },
          { label: "Notifications", to: "/app/notifications" },
        ]}
        utilityLinks={[
          { label: "Trust", to: "/app/trust" },
          { label: "My GSN and I", to: "/app/my-gmfn-and-i" },
        ]}
      />

      <section style={communityHeroStyle(isCompact)}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "auto minmax(0, 1fr)",
            gap: isCompact ? 12 : 18,
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: isCompact ? "flex-start" : "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: isCompact ? 54 : 68,
                height: isCompact ? 62 : 78,
                display: "grid",
                placeItems: "center",
                borderRadius: 22,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(234,244,255,0.92) 100%)",
                border: "1px solid rgba(217,172,51,0.24)",
                boxShadow: "0 14px 28px rgba(7,24,39,0.14)",
              }}
            >
              <GSNBrandMark
                width={isCompact ? 38 : 48}
                height={isCompact ? 46 : 58}
              />
            </div>
            {isCompact ? (
              <div style={{ minWidth: 0 }}>
                <div style={sectionLabel()}>GSN Community Home</div>
                <div
                  style={{
                    marginTop: 3,
                    color: COMMUNITY_BRAND.ink,
                    fontSize: 18,
                    fontWeight: 900,
                    lineHeight: 1.15,
                  }}
                >
                  Community Home of {communityHomeOwnerName}
                </div>
              </div>
            ) : null}
          </div>

          <div>
            {!isCompact ? (
              <>
                <div style={sectionLabel()}>GSN Community Home</div>
                <div
                  style={{
                    marginTop: 6,
                    color: COMMUNITY_BRAND.ink,
                    fontSize: 30,
                    fontWeight: 900,
                    lineHeight: 1.08,
                    letterSpacing: -0.4,
                  }}
                >
                  Community Home of {communityHomeOwnerName}
                </div>
              </>
            ) : null}

            <div
              style={{
                marginTop: isCompact ? 10 : 12,
                color: "#3A526A",
                fontSize: 14,
                lineHeight: 1.75,
                maxWidth: 880,
              }}
            >
              This page gathers the communities attached to your one GSN ID.
              Choose a community here when you want to open its Marketplace.
              Your wider finance, trust, shop, and spotlight controls stay tied
              to this same identity.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(142px, 1fr))",
                gap: 8,
              }}
            >
              <div style={innerCard("rgba(255,255,255,0.74)")}>
                <div style={sectionLabel()}>Holder</div>
                <div
                  style={{
                    marginTop: 6,
                    color: COMMUNITY_BRAND.ink,
                    fontSize: 15,
                    fontWeight: 900,
                    lineHeight: 1.25,
                    wordBreak: "break-word",
                  }}
                >
                  {communityHomeOwnerName}
                </div>
              </div>
              <div style={innerCard("rgba(255,255,255,0.74)")}>
                <div style={sectionLabel()}>GSN ID</div>
                <div
                  style={{
                    marginTop: 6,
                    color: COMMUNITY_BRAND.ink,
                    fontSize: 15,
                    fontWeight: 900,
                    lineHeight: 1.25,
                    wordBreak: "break-word",
                  }}
                >
                  {memberGlobalId}
                </div>
              </div>
              <div style={innerCard("rgba(255,255,255,0.74)")}>
                <div style={sectionLabel()}>Communities</div>
                <div
                  style={{
                    marginTop: 6,
                    color: COMMUNITY_BRAND.ink,
                    fontSize: 24,
                    fontWeight: 900,
                  }}
                >
                  {communityCountFromSummary}
                </div>
              </div>
              <div style={innerCard("rgba(255,255,255,0.74)")}>
                <div style={sectionLabel()}>Shop</div>
                <div
                  style={{
                    marginTop: 6,
                    color: COMMUNITY_BRAND.ink,
                    fontSize: 15,
                    fontWeight: 900,
                    lineHeight: 1.25,
                  }}
                >
                  One ID. One shop.
                </div>
              </div>
              <div style={innerCard("rgba(255,255,255,0.74)")}>
                <div style={sectionLabel()}>Spotlight</div>
                <div
                  style={{
                    marginTop: 6,
                    color: COMMUNITY_BRAND.ink,
                    fontSize: 15,
                    fontWeight: 900,
                    lineHeight: 1.25,
                  }}
                >
                  Community-governed exposure
                </div>
              </div>
              <div style={innerCard("rgba(255,255,255,0.74)")}>
                <div style={sectionLabel()}>Cumulative pool</div>
                <div
                  style={{
                    marginTop: 6,
                    color: COMMUNITY_BRAND.ink,
                    fontSize: 15,
                    fontWeight: 900,
                    lineHeight: 1.25,
                    wordBreak: "break-word",
                  }}
                >
                  {formatMoneySignal(cumulativeAvailable, poolSummaryCurrency)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <DomainIntroToggle
        title="About Community Home"
        eyebrow="Your guide"
        body="This is where all your groups sit together. Choose one group here when you want to work inside that community."
        bullets={[
          "Use it to see all the communities you belong to.",
          "Choose one community, then open it as Marketplace to work inside it.",
          "This page can show simple group signs like trust, money health, CCI (cross-community integrity), demand, and spotlight. Your full private records stay in Finance and Trust Passport.",
        ]}
        note="Simple rule: Community Home shows all your groups. Marketplace opens the one you choose."
        tone="dark"
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section
        style={{
          ...pageCard(
            "linear-gradient(180deg, #10243A 0%, #163552 52%, #244B72 100%)"
          ),
          order: 30,
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
          <div>
            <div style={{ ...sectionLabel(), color: "#D7E3F1" }}>
              Active marketplace entry
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#C7D4E5",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              This is the community currently selected from your Community Home
              circle. Open it as Marketplace when you need the live working
              tools.
            </div>
          </div>

          <button
            type="button"
            onPointerDown={consumeCommunityPointerEvent}
            onClick={() => toggleSection("selected")}
            style={collapseToggle()}
          >
            {collapsed.selected ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.selected ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "minmax(0, 1.12fr) minmax(320px, 0.88fr)",
              gap: 16,
              alignItems: "stretch",
            }}
          >
            <div>
              <div
                style={{
                  color: "#F8FBFF",
                  fontSize: isCompact ? 28 : 34,
                  fontWeight: 900,
                  lineHeight: 1.08,
                }}
              >
                {selectedClanName}
              </div>

              <div
                style={{
                  marginTop: 12,
                  color: "#D7E3F1",
                  fontSize: 15,
                  lineHeight: 1.85,
                  maxWidth: 760,
                }}
              >
                {selectedClanDescription}
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    ...badge(true),
                    background: "rgba(255,255,255,0.16)",
                    color: "#FFFFFF",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  Community ID: {selectedClanGlobalId}
                </span>
                <span
                  style={{
                    ...badge(false),
                    background: "rgba(255,255,255,0.12)",
                    color: "#F8FBFF",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  Member ID: {memberGlobalId}
                </span>
                <span
                  style={{
                    ...badge(false),
                    background: "rgba(255,255,255,0.12)",
                    color: "#F8FBFF",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  Trust: {selectedClanTrust}
                </span>
                <span
                  style={{
                    ...badge(false),
                    background: "rgba(255,255,255,0.12)",
                    color: "#F8FBFF",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  Finance: {selectedClanFinanceHealth}
                </span>
                <span
                  style={{
                    ...badge(false),
                    background: "rgba(255,255,255,0.12)",
                    color: "#F8FBFF",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  CCI: {selectedClanCci}
                </span>
                <span
                  style={{
                    ...badge(false),
                    background: "rgba(255,255,255,0.12)",
                    color: "#F8FBFF",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  Members: {selectedClanMemberCount}
                </span>
                <span
                  style={{
                    ...badge(false),
                    background: "rgba(255,255,255,0.12)",
                    color: "#F8FBFF",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  Opens as Marketplace
                </span>
                {selectedClanRole ? (
                  <span
                    style={{
                      ...badge(false),
                      background: "rgba(255,255,255,0.12)",
                      color: "#F8FBFF",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    Role: {selectedClanRole}
                  </span>
                ) : null}
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
                  onPointerDown={consumeCommunityPointerEvent}
                  onClick={() => void openSelectedMarketplace()}
                  disabled={!selectedClanId || changingClanId === selectedClanId}
                  style={actionBtn(
                    "primary",
                    !selectedClanId || changingClanId === selectedClanId
                  )}
                >
                  {changingClanId === selectedClanId
                    ? "Opening..."
                    : "Open Marketplace"}
                </button>

                <button
                  type="button"
                  onPointerDown={consumeCommunityPointerEvent}
                  onClick={copyCommunityId}
                  style={actionBtn("secondary")}
                >
                  Copy Community ID
                </button>
              </div>
            </div>

            <div
              style={{
                ...softCard("rgba(255,255,255,0.94)"),
                border: "1px solid rgba(148,163,184,0.16)",
              }}
            >
              <div style={sectionLabel()}>Your pool position</div>

              <div
                style={{
                  marginTop: 10,
                  color: "#0B1F33",
                  fontSize: 24,
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
                This shows only your own visible pool position in your current
                community. Open Finance for the cumulative money picture across
                all communities.
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section style={{ ...pageCard("#FFFFFF"), order: 65 }}>
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
            <div style={sectionLabel()}>Owner controls</div>
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              These actions belong to the owner side of Community Home: create a
              new community, manage the one shop tied to your GSN ID, grow your
              trusted circle, and open the selected marketplace tools.
            </div>
          </div>

          <button
            type="button"
            onPointerDown={consumeCommunityPointerEvent}
            onClick={() => toggleSection("tools")}
            style={collapseToggle()}
          >
            {collapsed.tools ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.tools ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 10,
            }}
          >
            <button
              type="button"
              onPointerDown={consumeCommunityPointerEvent}
              onClick={(event) => openCommunityRoute(event, "/app/clans")}
              style={actionBtn("primary")}
            >
              Create New Community
            </button>

            <button
              type="button"
              onPointerDown={consumeCommunityPointerEvent}
              onClick={copyInviteLink}
              style={actionBtn("secondary", !inviteLink)}
              disabled={!inviteLink}
            >
              Copy Selected Community Link
            </button>

            <button
              type="button"
              onPointerDown={consumeCommunityPointerEvent}
              onClick={(event) => openCommunityRoute(event, "/app/demand-box")}
              style={actionBtn("secondary")}
            >
              Demand Box
            </button>

            <button
              type="button"
              onPointerDown={consumeCommunityPointerEvent}
              onClick={openGrowYourCircle}
              style={actionBtn("secondary")}
            >
              Grow Trusted Circle
            </button>

            <button
              type="button"
              onPointerDown={consumeCommunityPointerEvent}
              onClick={openSpotlightGears}
              style={actionBtn("secondary")}
            >
              Manage Spotlight
            </button>

            <button
              type="button"
              onPointerDown={consumeCommunityPointerEvent}
              onClick={openShopControlPanel}
              style={actionBtn("secondary")}
            >
              Shop Control
            </button>

            <button
              type="button"
              onPointerDown={consumeCommunityPointerEvent}
              onClick={(event) => openCommunityRoute(event, "/app/notifications")}
              style={actionBtn("secondary")}
            >
              Notifications
            </button>

            <button
              type="button"
              onPointerDown={consumeCommunityPointerEvent}
              onClick={(event) => openCommunityRoute(event, "/app/payment/pool")}
              style={actionBtn("secondary")}
            >
              Money In
            </button>

            <button
              type="button"
              onPointerDown={consumeCommunityPointerEvent}
              onClick={(event) =>
                openCommunityRoute(event, "/app/withdrawal-instructions")
              }
              style={actionBtn("secondary")}
            >
              Money Out
            </button>

            <button
              type="button"
              onPointerDown={consumeCommunityPointerEvent}
              onClick={() => void openSelectedMarketplace()}
              disabled={!selectedClanId || changingClanId === selectedClanId}
              style={actionBtn(
                "secondary",
                !selectedClanId || changingClanId === selectedClanId
              )}
            >
              {changingClanId === selectedClanId
                ? "Opening..."
                : "Open Marketplace"}
            </button>
          </div>
        ) : null}
      </section>

      <section style={{ ...pageCard("#FFFFFF"), order: 40 }}>
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
            <div style={sectionLabel()}>Cumulative finance summary</div>
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
                maxWidth: 860,
              }}
            >
              This is your money signal across the communities attached to your
              GSN ID. The selected marketplace signal is still shown below, but
              the fuller personal record belongs in Finance.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(true)}>
              Available: {formatMoneySignal(cumulativeAvailable, poolSummaryCurrency)}
            </span>
            <span style={badge(false)}>
              Locked: {formatMoneySignal(cumulativeLockedGuarantee, poolSummaryCurrency)}
            </span>
            <span style={badge(false)}>Communities: {communityCountFromSummary}</span>
          </div>
        </div>

        <ExplainToggle
          label="About finance here"
          what="This gives you one quick money reading across your communities, then keeps the local selected-community money signal underneath."
          why="A person can belong to many communities, so GSN must help them see the wider money picture before they take another money step."
          next="Open Finance when you need the full breakdown, including the separate record for each community."
          tone="light"
          style={{ marginTop: 12 }}
        />

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.12fr) minmax(320px, 0.88fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div style={softCard("#F8FBFF")}>
            <div style={sectionLabel()}>Cross-community reading</div>
            <ExplainToggle
              label="About this finance reading"
              what="This card reads your finance signal across all communities currently attached to your GSN ID."
              why="It helps you avoid borrowing, guaranteeing, or paying from one place while missing what is already happening elsewhere."
              next="Open Finance when you need to see each community record and the full money trail."
              tone="light"
              style={{ marginTop: 12 }}
            />
            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontSize: 22,
                fontWeight: 900,
                lineHeight: 1.28,
              }}
            >
              {cumulativeFinanceNextAction.title}
            </div>
            <div style={{ marginTop: 10, color: "#5F7287", fontSize: 14, lineHeight: 1.78 }}>
              {cumulativeFinanceNextAction.detail}
            </div>

            {poolSummaryIssue ? (
              <div style={{ marginTop: 12, ...noticeCard("error") }}>
                {poolSummaryIssue}
              </div>
            ) : null}

            {financeSyncIssue ? (
              <div style={{ marginTop: 12, ...noticeCard("error") }}>
                {financeSyncIssue}
              </div>
            ) : null}

            <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
              <div style={innerCard("#FFFFFF")}>
                <div style={sectionLabel()}>Cumulative available</div>
                <div style={{ marginTop: 8, color: "#0B1F33", fontSize: 20, fontWeight: 900 }}>
                  {formatMoneySignal(cumulativeAvailable, poolSummaryCurrency)}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr", gap: 8 }}>
                <div style={innerCard("#FFFFFF")}>
                  <div style={sectionLabel()}>Money settling</div>
                  <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 900 }}>
                    In {formatMoneySignal(cumulativePendingIn, poolSummaryCurrency)} | Out {formatMoneySignal(cumulativePendingOut, poolSummaryCurrency)}
                  </div>
                </div>
                <div style={innerCard("#FFFFFF")}>
                  <div style={sectionLabel()}>Guarantee locked</div>
                  <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 900 }}>
                    {formatMoneySignal(cumulativeLockedGuarantee, poolSummaryCurrency)}
                  </div>
                </div>
              </div>
              <div style={innerCard("#FFFFFF")}>
                <div style={sectionLabel()}>Reserved pool</div>
                <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 900 }}>
                  {formatMoneySignal(cumulativeReserved, poolSummaryCurrency)}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onPointerDown={consumeCommunityPointerEvent}
                onClick={(event) => openCommunityRoute(event, "/app/finance")}
                style={actionBtn("primary")}
              >
                Open Finance
              </button>
            </div>

            <div style={{ marginTop: 10, color: "#5F7287", fontSize: 13, lineHeight: 1.78 }}>
              Money In, Money Out, Payment Rails, and Payout Details now sit
              inside the fuller Finance workspace instead of owning space on
              Community Home.
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Current-community finance signal</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontSize: 18,
                fontWeight: 900,
                lineHeight: 1.35,
              }}
            >
              {financeNextAction.title}
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              {financeNextAction.detail}
            </div>

            <ExplainToggle
              label="What this live finance record does"
              what="This card gathers the current community money signal into one place, including pool position, movement, record status, money routes, and expected payments."
              why="It helps users understand this marketplace-linked finance picture here first instead of jumping across several money routes to work out what state the community is in."
              next="Read this summary first, then open Finance, Payment Rails, Money In, Money Out, or Payout Details when you need the deeper route."
              tone="light"
              style={{ marginTop: 12 }}
            />

            {financeLoading ? (
              <div style={{ marginTop: 10, color: "#5F7287", fontSize: 14, lineHeight: 1.75 }}>
                Loading your current community finance record.
              </div>
            ) : (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <div style={innerCard("#FCFEFF")}>
                  <div style={sectionLabel()}>Pool position</div>
                  <div
                    style={{
                      marginTop: 10,
                      color: "#0B1F33",
                      fontSize: 20,
                      fontWeight: 900,
                      lineHeight: 1.28,
                    }}
                  >
                    {safeStr(moneySurface?.poolAmount || poolAmount)} {safeStr(moneySurface?.poolCurrency || poolCurrency)}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={badge(true)}>
                      Available: {safeStr(moneySurface?.effectiveAvailable || "0.00")}
                    </span>
                    <span style={badge(false)}>
                      Reserved: {safeStr(moneySurface?.reservedPool || "0.00")}
                    </span>
                  </div>
                </div>

                <div style={innerCard("#FCFEFF")}>
                  <div style={sectionLabel()}>Movement</div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={badge(true)}>
                      Pending in: {safeStr(moneySurface?.pendingDeposits || "0.00")}
                    </span>
                    <span style={badge(false)}>
                      Pending out: {safeStr(moneySurface?.pendingWithdrawals || "0.00")}
                    </span>
                    <span style={badge(false)}>
                      Recent events: {Array.isArray(moneySurface?.recentPoolEvents) ? moneySurface?.recentPoolEvents.length : 0}
                    </span>
                  </div>
                </div>

                <div style={innerCard("#FCFEFF")}>
                  <div style={sectionLabel()}>Record status</div>
                  <div
                    style={{
                      marginTop: 10,
                      color: "#0B1F33",
                      fontWeight: 900,
                      lineHeight: 1.35,
                    }}
                  >
                    {safeStr(moneySurface?.poolReference)
                      ? `Reference ${safeStr(moneySurface?.poolReference)} is active in the current finance file.`
                      : "No active pool reference is visible in the current finance file."}
                  </div>
                  <div style={{ marginTop: 8, color: "#5F7287", fontSize: 13, lineHeight: 1.7 }}>
                    {activeExpectedPayments.length > 0
                      ? `${activeExpectedPayments.length} expected payment record${
                          activeExpectedPayments.length === 1 ? "" : "s"
                        } are open in this community.`
                      : "No expected payment record is open right now."}
                  </div>
                </div>

                <div style={innerCard("#FCFEFF")}>
                  <div style={sectionLabel()}>Money routes</div>
                  <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                    <div>
                      <div style={{ color: "#0B1F33", fontWeight: 900, lineHeight: 1.35 }}>
                        {safeStr(moneySurface?.depositRoute?.title || "Money In route")}
                      </div>
                      <div style={{ marginTop: 6, color: "#5F7287", fontSize: 13, lineHeight: 1.7 }}>
                        {safeStr(
                          moneySurface?.depositRoute?.detail ||
                            "Generate and use the current deposit instruction from the finance file."
                        )}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "#0B1F33", fontWeight: 900, lineHeight: 1.35 }}>
                        {safeStr(moneySurface?.withdrawalRoute?.title || "Money Out route")}
                      </div>
                      <div style={{ marginTop: 6, color: "#5F7287", fontSize: 13, lineHeight: 1.7 }}>
                        {safeStr(
                          moneySurface?.withdrawalRoute?.detail ||
                            "Use the current payout route only after the finance file is ready."
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onPointerDown={consumeCommunityPointerEvent}
                        onClick={(event) =>
                          openCommunityRoute(event, "/app/payment-rails")
                        }
                        style={actionBtn("soft")}
                      >
                        Review Payment Rails
                      </button>
                      <button
                        type="button"
                        onPointerDown={consumeCommunityPointerEvent}
                        onClick={(event) =>
                          openCommunityRoute(event, "/app/payout-details")
                        }
                        style={actionBtn("soft")}
                      >
                        Review Payout Details
                      </button>
                    </div>
                  </div>
                </div>

                <div style={innerCard("#FCFEFF")}>
                  <div style={sectionLabel()}>Expected payments & reconciliation</div>
                  {financePreviewPayments.length === 0 ? (
                    <div style={{ marginTop: 10, color: "#5F7287", fontSize: 13, lineHeight: 1.7 }}>
                      No payment is waiting here right now.
                    </div>
                  ) : (
                    <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                      {financePreviewPayments.map((item, index) => (
                        <div key={`${item.id || index}`} style={innerCard("#FFFFFF")}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <span style={badge(true)}>
                              {safeStr(item.expected_type || "Expected payment")}
                            </span>
                            <span style={badge(false)}>
                              State: {expectedPaymentState(item)}
                            </span>
                            {safeStr(item.status) ? (
                              <span style={badge(false)}>
                                Status: {safeStr(item.status)}
                              </span>
                            ) : null}
                          </div>
                          <div
                            style={{
                              marginTop: 10,
                              color: "#0B1F33",
                              fontWeight: 900,
                              lineHeight: 1.35,
                            }}
                          >
                            {safeStr(item.amount || "0.00")} {safeStr(item.currency || moneySurface?.poolCurrency || poolCurrency)}
                          </div>
                          <div style={{ marginTop: 8, color: "#5F7287", fontSize: 13, lineHeight: 1.7 }}>
                            {[
                              item.reference_display
                                ? `Reference: ${safeStr(item.reference_display)}`
                                : "",
                              item.confirmed_at
                                ? `Confirmed: ${safeDateTime(item.confirmed_at)}`
                                : item.due_at
                                ? `Due: ${safeDateTime(item.due_at)}`
                                : "",
                              `Next action: ${expectedPaymentNextAction(item)}`,
                            ]
                              .filter(Boolean)
                              .join(" - ")}
                          </div>
                          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onPointerDown={consumeCommunityPointerEvent}
                              onClick={(event) =>
                                openCommunityRoute(event, "/app/finance")
                              }
                              style={actionBtn("soft")}
                            >
                              Open Finance Record
                            </button>
                            <button
                              type="button"
                              onPointerDown={consumeCommunityPointerEvent}
                              onClick={(event) =>
                                openCommunityRoute(
                                  event,
                                  expectedPaymentState(item) === "Awaiting issue"
                                    ? "/app/payment/pool"
                                    : "/app/payment-rails"
                                )
                              }
                              style={actionBtn("soft")}
                            >
                              {expectedPaymentState(item) === "Awaiting issue"
                                ? "Open Money In"
                                : "Open Payment Rails"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section style={{ ...pageCard("#FFFFFF"), order: 45 }}>
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
            <div style={sectionLabel()}>Cumulative trust summary</div>
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
                maxWidth: 860,
              }}
            >
              Community Home can show the quick trust signal, but the fuller
              story belongs in Trust Passport. TrustSlip is the portable proof
              people can check when they need confidence.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(true)}>Trust: {selectedClanTrust}</span>
            <span style={badge(false)}>CCI: {selectedClanCci}</span>
            <span style={badge(false)}>One GSN ID</span>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.05fr) minmax(320px, 0.95fr)",
            gap: 16,
            alignItems: "stretch",
          }}
        >
          <div style={softCard("#F8FBFF")}>
            <div style={sectionLabel()}>What this means</div>
            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontSize: 22,
                fontWeight: 900,
                lineHeight: 1.28,
              }}
            >
              Your trust follows one identity across many communities.
            </div>
            <div
              style={{
                marginTop: 10,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.78,
              }}
            >
              One community can show a local trust reading. Trust Passport
              gathers the fuller record across your communities. TrustSlip is
              the shorter proof another person may check before trade, support,
              or decision.
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Open the right trust page</div>
            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <button
                type="button"
                onPointerDown={consumeCommunityPointerEvent}
                onClick={(event) => openCommunityRoute(event, "/app/trust")}
                style={actionBtn("secondary")}
              >
                Trust Passport
              </button>
              <button
                type="button"
                onPointerDown={consumeCommunityPointerEvent}
                onClick={(event) => openCommunityRoute(event, "/app/trust-slip")}
                style={actionBtn("secondary")}
              >
                TrustSlip
              </button>
              <button
                type="button"
                onPointerDown={consumeCommunityPointerEvent}
                onClick={(event) => openCommunityRoute(event, "/app/identity")}
                style={actionBtn("secondary")}
              >
                Identity
              </button>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              <div style={innerCard("#FCFEFF")}>
                <div style={sectionLabel()}>Selected community</div>
                <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 900 }}>
                  {selectedClanName}
                </div>
              </div>
              <div style={innerCard("#FCFEFF")}>
                <div style={sectionLabel()}>Trust</div>
                <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 900 }}>
                  {selectedClanTrust}
                </div>
              </div>
              <div style={innerCard("#FCFEFF")}>
                <div style={sectionLabel()}>CCI</div>
                <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 900 }}>
                  {selectedClanCci}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ ...pageCard("#FFFFFF"), order: 90 }}>
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
            <div style={sectionLabel()}>Demand Control Box</div>
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
                maxWidth: 860,
              }}
            >
              Raise demand here, review what is already open, and continue into
              Demand Box when you need the fuller follow-up path.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(true)}>My open: {myOpenDemands.length}</span>
            <span style={badge(false)}>Community open: {visibleDemands.length}</span>
            <span style={badge(false)}>Urgent: {urgentDemandCount}</span>
          </div>
        </div>

        <ExplainToggle
          label="What this demand box does"
          what="This keeps the current community's live need signals in one place so users can raise a new demand, review what is already open, and decide the next follow-up."
          why="Demand works best when it feels like a real community signal desk rather than a static note or a hidden side route."
          next="Read the next action first, then create a new demand or open Demand Box when you need the fuller workflow and follow-up view."
          tone="light"
          style={{ marginTop: 12 }}
        />

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.12fr) minmax(320px, 0.88fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div style={softCard("#F8FBFF")}>
            <div style={sectionLabel()}>Current next action</div>
            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontSize: 22,
                fontWeight: 900,
                lineHeight: 1.28,
              }}
            >
              {demandNextAction.title}
            </div>
            <div style={{ marginTop: 10, color: "#5F7287", fontSize: 14, lineHeight: 1.78 }}>
              {demandNextAction.detail}
            </div>

            {demandSyncIssue ? (
              <div style={{ marginTop: 12, ...noticeCard("error") }}>
                {demandSyncIssue}
              </div>
            ) : null}

            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onPointerDown={consumeCommunityPointerEvent}
                onClick={(event) =>
                  openCommunityRoute(event, "/app/demand-box#demand-box-create")
                }
                style={actionBtn("primary")}
              >
                Create Demand
              </button>
              <button
                type="button"
                onPointerDown={consumeCommunityPointerEvent}
                onClick={(event) => openCommunityRoute(event, "/app/demand-box")}
                style={actionBtn("secondary")}
              >
                Open Demand Box
              </button>
              <button
                type="button"
                onPointerDown={consumeCommunityPointerEvent}
                onClick={(event) => openCommunityRoute(event, "/app/notifications")}
                style={actionBtn("soft")}
              >
                Open Action Inbox
              </button>
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Live demand summary</div>

            <ExplainToggle
              label="What this live demand summary does"
              what="This card shows the open demand items that are currently visible for your community, including urgency, area, and the latest signal details."
              why="It helps users read the live need picture here first instead of guessing whether the community has active demand before opening the full Demand Box."
              next="Check what is already live here, then open Demand Box only when you need to create, update, or manage the underlying demand items."
              tone="light"
              style={{ marginTop: 12 }}
            />

            {demandLoading ? (
              <div style={{ marginTop: 10, color: "#5F7287", fontSize: 14, lineHeight: 1.75 }}>
                Loading the current demand state for this community.
              </div>
            ) : demandPreviewRows.length === 0 ? (
              <div style={{ marginTop: 10, color: "#5F7287", fontSize: 14, lineHeight: 1.75 }}>
                No open demand is visible right now. Create the next real need here
                when the community has something that should become a live signal.
              </div>
            ) : (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {demandPreviewRows.map((row, index) => (
                  <div key={`${row?.id || index}`} style={innerCard("#FCFEFF")}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={badge(true)}>{demandUrgencyLabel(row?.urgency)}</span>
                      {safeStr(row?.status) ? (
                        <span style={badge(false)}>{safeStr(row?.status)}</span>
                      ) : null}
                      {safeStr(row?.area) ? (
                        <span style={badge(false)}>{safeStr(row?.area)}</span>
                      ) : null}
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        color: "#0B1F33",
                        fontWeight: 900,
                        lineHeight: 1.35,
                      }}
                    >
                      {firstTruthy(row?.title, row?.description, "Open community demand")}
                    </div>
                    <div style={{ marginTop: 8, color: "#5F7287", fontSize: 13, lineHeight: 1.7 }}>
                      {safeDateTime(row?.created_at) || "Recently posted"}
                    </div>
                    <div
                      style={{
                        marginTop: 12,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <span style={badge(false)}>
                        {isMineDemandRow(row, me) ? "My demand" : "Community demand"}
                      </span>
                      <button
                        type="button"
                        onPointerDown={consumeCommunityPointerEvent}
                        onClick={(event) => openCommunityRoute(event, "/app/demand-box")}
                        style={actionBtn("soft")}
                      >
                        Manage in Demand Box
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <div id="community-home-shop-control" style={{ order: 60 }}>
        <CommunityShopControlPanel />
      </div>

      <section
        id="community-home-grow-your-circle"
        style={{ ...pageCard("#FFFFFF"), order: 70 }}
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
            <div style={sectionLabel()}>Grow your trusted circle</div>
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              Bring in the people you already trust and already do real life with.
              Keep this circle deliberate.
            </div>
          </div>

          <button
            type="button"
            onPointerDown={consumeCommunityPointerEvent}
            onClick={() => toggleSection("circle")}
            style={collapseToggle()}
          >
            {collapsed.circle ? "Open" : "Collapse"}
          </button>
        </div>

        <ExplainToggle
          label="What this trusted circle does"
          what="This is where the community owner builds the first layer of trusted real-life people who strengthen identity, support, and early growth."
          why="The trusted circle should feel deliberate, not random, because these relationships shape how the community becomes credible and useful."
          next="Review the progress first, then open First Circle to add or prepare the right people before copying the invite bundle."
          tone="light"
          style={{ marginTop: 12 }}
        />

        {!collapsed.circle ? (
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
              <div style={sectionLabel()}>First-circle progress</div>

              <div
                style={{
                  marginTop: 10,
                  color: "#0B1F33",
                  fontSize: 20,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                {firstCircleProgress.nextStepText}
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={badge(true)}>
                  Role: {roleLabel(firstCircleDraft.memberRole)}
                </span>
                <span style={badge(false)}>
                  Selected: {firstCircleProgress.selectedCount}
                </span>
                <span style={badge(false)}>
                  Ready: {firstCircleProgress.readyCount}
                </span>
                <span style={badge(false)}>
                  Target: {firstCircleProgress.targetCount}
                </span>
              </div>

              <div
                style={{
                  marginTop: 14,
                  color: "#5F7287",
                  fontSize: 14,
                  lineHeight: 1.75,
                }}
              >
                Build this circle from serious real-life relationships: suppliers,
                buyers, family-support people, remittance contacts, group
                officers, savings partners, and other trusted people.
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
                  onPointerDown={consumeCommunityPointerEvent}
                  onClick={(event) =>
                    openCommunityRoute(event, "/app/build-first-circle")
                  }
                  style={actionBtn("primary")}
                >
                  Open First Circle
                </button>

                <button
                  type="button"
                  onClick={copyFirstCircleInviteBundle}
                  disabled={readyFirstCircleContacts.length === 0}
                  style={actionBtn(
                    "secondary",
                    readyFirstCircleContacts.length === 0
                  )}
                >
                  Copy Invite Bundle
                </button>
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>Role-based hints</div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {firstCircleRelationshipHints.length > 0 ? (
                  firstCircleRelationshipHints.map((item) => (
                    <span key={item} style={badge(false)}>
                      {relationshipLabel(item)}
                    </span>
                  ))
                ) : (
                  <span style={badge(false)}>Choose your member role first</span>
                )}
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                {firstCircleDraft.contacts.length === 0 ? (
                  <div style={{ color: "#64748B", lineHeight: 1.75 }}>
                    No trusted person has been added yet.
                  </div>
                ) : (
                  firstCircleDraft.contacts.slice(0, 3).map((item) => (
                    <div key={item.id} style={innerCard("#FCFEFF")}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ color: "#0B1F33", fontWeight: 900 }}>
                          {safeStr(item.name || "Contact")}
                        </div>

                        <span style={badge(item.selected)}>
                          {item.selected ? "Selected" : "Saved"}
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
                          {relationshipLabel(item.relationship)}
                        </span>
                        <span style={badge(false)}>
                          {isContactInviteReady(item)
                            ? "Invite ready"
                            : "Needs phone or email"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section
        id="community-home-spotlight-gears"
        style={{ ...pageCard("#FFFFFF"), order: 80 }}
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
            <div style={sectionLabel()}>Spotlight management</div>
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              Choose the spotlight image or short video and details here,
              preview it first, then publish it to the dashboard spotlight
              screen.
            </div>
          </div>

          <button
            type="button"
            onPointerDown={consumeCommunityPointerEvent}
            onClick={() => toggleSection("spotlight")}
            style={collapseToggle()}
          >
            {collapsed.spotlight ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.spotlight ? (
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
              <div style={sectionLabel()}>Prepare spotlight</div>

              <div style={{ marginTop: 14 }}>
                <div style={sectionLabel()}>Product description</div>
                <textarea
                  value={spotlightDescription}
                  onChange={(e) => setSpotlightDescription(e.target.value)}
                  placeholder="Write the spotlight product description..."
                  style={{ ...textAreaStyle(), marginTop: 8 }}
                />
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <div style={sectionLabel()}>Tag number</div>
                  <input
                    value={spotlightTagNumber}
                    onChange={(e) => setSpotlightTagNumber(e.target.value)}
                    placeholder="Enter tag number"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>Expiry (optional)</div>
                  <input
                    type="datetime-local"
                    value={spotlightExpiry}
                    onChange={(e) => setSpotlightExpiry(e.target.value)}
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={sectionLabel()}>Image</div>
                <input
                  key={spotlightFileInputKey}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  onChange={(e) =>
                    handleSpotlightImageChange(e.target.files?.[0] || null)
                  }
                  style={{ ...inputStyle(), marginTop: 8, paddingTop: 10 }}
                />
                <div
                  style={{
                    marginTop: 8,
                    color: "#5F7287",
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}
                >
                  Accepted image types: {SPOTLIGHT_ALLOWED_IMAGE_LABEL}. Maximum
                  size: 10 MB. If a photo is heavier than that, the app will try
                  to prepare a lighter copy automatically before upload.
                </div>
                {spotlightImageFile ? (
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontSize: 13,
                      fontWeight: 700,
                      lineHeight: 1.6,
                    }}
                  >
                    Selected image: {safeStr(spotlightImageFile.name) || "image"} |{" "}
                    {formatFileSize(spotlightImageFile.size)} |{" "}
                    {safeStr(spotlightImageFile.type) || "unknown type"}
                  </div>
                ) : null}
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={sectionLabel()}>Short video (optional)</div>
                <input
                  key={spotlightVideoInputKey}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                  onChange={(e) =>
                    handleSpotlightVideoChange(e.target.files?.[0] || null)
                  }
                  style={{ ...inputStyle(), marginTop: 8, paddingTop: 10 }}
                />
                <div
                  style={{
                    marginTop: 8,
                    color: "#5F7287",
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}
                >
                  Accepted video types: {SPOTLIGHT_ALLOWED_VIDEO_LABEL}. Maximum
                  size: 10 MB. If a clip is too heavy or too long, the app will
                  try to prepare a shorter spotlight-ready version
                  automatically. If you add both image and video, the video
                  becomes the live spotlight media and the image stays as the
                  fallback cover.
                </div>
                {spotlightVideoFile ? (
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontSize: 13,
                      fontWeight: 700,
                      lineHeight: 1.6,
                    }}
                  >
                    Selected video: {safeStr(spotlightVideoFile.name) || "video"} |{" "}
                    {formatFileSize(spotlightVideoFile.size)} |{" "}
                    {safeStr(spotlightVideoFile.type) || "unknown type"}
                    {spotlightVideoDurationSeconds != null
                      ? ` | ${spotlightVideoDurationSeconds.toFixed(1)}s`
                      : ""}
                  </div>
                ) : null}
                {spotlightNotice ? (
                  <div
                    style={{
                      marginTop: 12,
                      ...noticeCard(spotlightNotice.tone),
                    }}
                  >
                    {spotlightNotice.text}
                  </div>
                ) : null}
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
                  onClick={publishSpotlight}
                  disabled={
                    publishingSpotlight ||
                    preparingSpotlightImage ||
                    preparingSpotlightVideo
                  }
                  style={actionBtn(
                    "primary",
                    publishingSpotlight ||
                      preparingSpotlightImage ||
                      preparingSpotlightVideo
                  )}
                >
                  {publishingSpotlight
                    ? "Publishing..."
                    : preparingSpotlightImage || preparingSpotlightVideo
                    ? "Preparing media..."
                    : "Publish Spotlight"}
                </button>

                <button
                  type="button"
                  onClick={clearSpotlightDraft}
                  style={actionBtn("secondary")}
                >
                  Clear Draft
                </button>
              </div>

              <div
                style={{
                  marginTop: 14,
                  ...innerCard("#FFFFFF"),
                  border: "1px solid rgba(11,31,51,0.08)",
                }}
              >
                <div style={sectionLabel()}>Live spotlight state</div>
                {activeCommunitySpotlightLoading ? (
                  <div style={{ marginTop: 10, color: "#5F7287", fontSize: 14, lineHeight: 1.75 }}>
                    Refreshing live spotlight state...
                  </div>
                ) : activeCommunitySpotlight ? (
                  <>
                    <div style={{ marginTop: 12 }}>
                      <SpotlightMediaFrame
                        imageUrl={activeCommunitySpotlight.imageUrl}
                        videoUrl={activeCommunitySpotlight.videoUrl}
                        videoPoster={activeCommunitySpotlight.imageUrl}
                        alt="Live community spotlight"
                        frameStyle={{
                          minHeight: 180,
                          maxHeight: 260,
                          borderRadius: 18,
                          border: "1px solid rgba(212,175,55,0.14)",
                          background:
                            "linear-gradient(180deg, rgba(24,58,88,0.98) 0%, rgba(38,84,122,0.98) 100%)",
                        }}
                        mediaStyle={{
                          minHeight: 180,
                          maxHeight: 260,
                        }}
                        showVideoControls={Boolean(
                          activeCommunitySpotlight.videoUrl
                        )}
                        fallback={
                          <div
                            style={{
                              padding: 20,
                              textAlign: "center",
                              color: "#D7E3F1",
                              fontWeight: 800,
                              fontSize: 14,
                              lineHeight: 1.7,
                            }}
                          >
                            The active spotlight is live, but no image or video is attached to it.
                          </div>
                        }
                      />
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        color: "#0B1F33",
                        fontSize: 16,
                        fontWeight: 900,
                        lineHeight: 1.4,
                      }}
                    >
                      {activeCommunitySpotlight.message || "Live spotlight is active."}
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={badge(true)}>Active now</span>
                      {activeCommunitySpotlight.videoUrl ? (
                        <span style={badge(false)}>Short video live</span>
                      ) : activeCommunitySpotlight.imageUrl ? (
                        <span style={badge(false)}>Image live</span>
                      ) : null}
                      {activeCommunitySpotlight.expiresAt ? (
                        <span style={badge(false)}>
                          Expires: {new Date(activeCommunitySpotlight.expiresAt).toLocaleString()}
                        </span>
                      ) : (
                        <span style={badge(false)}>No expiry set</span>
                      )}
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        color: "#5F7287",
                        fontSize: 13,
                        lineHeight: 1.75,
                      }}
                    >
                      This live spotlight belongs to your current community and
                      should return after refresh or restart while it remains active.
                    </div>
                  </>
                ) : activeCommunitySpotlightSyncIssue ? (
                  <div style={{ marginTop: 10, color: "#5F7287", fontSize: 14, lineHeight: 1.75 }}>
                    Live spotlight data could not be confirmed just now. Refresh from this page or
                    retry after the community spotlight source becomes available again.
                    <div style={{ marginTop: 8, color: "#8A1C1C" }}>
                      Refresh note: {activeCommunitySpotlightSyncIssue}
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 10, color: "#5F7287", fontSize: 14, lineHeight: 1.75 }}>
                    No active community spotlight is live right now. Publish from this panel and
                    the active state will appear here after backend confirmation.
                  </div>
                )}
                <div
                  style={{
                    marginTop: 12,
                    ...innerCard("#FCFEFF"),
                    border: "1px solid rgba(11,31,51,0.08)",
                  }}
                >
                  <div style={sectionLabel()}>Current next action</div>
                  <div
                    style={{
                      marginTop: 10,
                      color: "#0B1F33",
                      fontSize: 16,
                      fontWeight: 900,
                      lineHeight: 1.35,
                    }}
                  >
                    {communitySpotlightNextAction.title}
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#5F7287",
                      fontSize: 13,
                      lineHeight: 1.75,
                    }}
                  >
                    {communitySpotlightNextAction.detail}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                ...innerCard("rgba(255,255,255,0.98)"),
                border: "1px solid rgba(212,175,55,0.12)",
                boxShadow: "0 16px 34px rgba(2,12,27,0.10)",
              }}
            >
              <div style={sectionLabel()}>Preview before publish</div>

              <div style={{ marginTop: 14 }}>
                <SpotlightMediaFrame
                  imageUrl={spotlightPreviewUrl}
                  videoUrl={spotlightVideoPreviewUrl}
                  videoPoster={spotlightPreviewUrl}
                  alt="Spotlight preview"
                  frameStyle={previewMediaBox()}
                  mediaStyle={{ minHeight: 220 }}
                  showVideoControls={Boolean(spotlightVideoPreviewUrl)}
                  fallback={
                    <div
                      style={{
                        padding: 18,
                        textAlign: "center",
                        color: "#D7E3F1",
                        fontWeight: 800,
                        fontSize: 16,
                        lineHeight: 1.5,
                      }}
                    >
                      No image or video selected yet
                    </div>
                  }
                />

                <div
                  style={{
                    marginTop: 14,
                    color: "#0B1F33",
                    fontSize: 18,
                    fontWeight: 900,
                    lineHeight: 1.35,
                  }}
                >
                  {safeStr(spotlightDescription) || "No description written yet"}
                </div>

                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {safeStr(spotlightTagNumber) ? (
                    <span style={badge(true)}>Tag: {safeStr(spotlightTagNumber)}</span>
                  ) : (
                    <span style={badge(false)}>Tag not entered yet</span>
                  )}

                  {safeStr(spotlightExpiry) ? (
                    <span style={badge(false)}>Expiry: {safeStr(spotlightExpiry)}</span>
                  ) : (
                    <span style={badge(false)}>No expiry set</span>
                  )}

                  {spotlightVideoPreviewUrl ? (
                    <span style={badge(true)}>Short video selected</span>
                  ) : spotlightPreviewUrl ? (
                    <span style={badge(false)}>Image selected</span>
                  ) : (
                    <span style={badge(false)}>No media selected</span>
                  )}

                  <span style={badge(false)}>
                    Community: {selectedClanName || "No community selected"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section style={{ ...pageCard("#FFFFFF"), order: 20 }}>
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
            <div style={sectionLabel()}>Your communities</div>
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              Each line is one community attached to your GSN ID. Choose one,
              then open it as Marketplace when you want to work inside it.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(false)}>{sortedClans.length} communities</span>
            <span style={badge(false)}>One global member ID</span>
            <button
              type="button"
              onPointerDown={consumeCommunityPointerEvent}
              onClick={() => toggleSection("communities")}
              style={collapseToggle()}
            >
              {collapsed.communities ? "Open" : "Collapse"}
            </button>
          </div>
        </div>

        {!collapsed.communities ? (
          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {sortedClans.map((clan, index) => {
              const clanId = getClanId(clan);
              const active = clanId > 0 && clanId === getClanId(selectedClan);
              const working = clanId > 0 && clanId === changingClanId;

              return (
                <div key={`${clanId || index}`} style={innerCard("#FCFEFF")}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "1fr"
                        : "minmax(0, 1.2fr) minmax(0, 0.9fr) auto",
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
                        {index + 1}. {getClanName(clan)}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          color: "#5F7287",
                          fontSize: 14,
                          lineHeight: 1.75,
                        }}
                      >
                        Community ID: {getClanGlobalId(clan)}
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={badge(active)}>
                          {active ? "Selected" : "Available"}
                        </span>
                        <span style={badge(false)}>
                          Trust: {getClanTrust(clan)}
                        </span>
                        <span style={badge(false)}>
                          Finance: {getClanFinanceHealth(clan)}
                        </span>
                        <span style={badge(false)}>CCI: {getClanCci(clan)}</span>
                        <span style={badge(false)}>
                          Members: {getClanMemberCount(clan)}
                        </span>
                        {getClanRole(clan) ? (
                          <span style={badge(false)}>Role: {getClanRole(clan)}</span>
                        ) : null}
                      </div>
                    </div>

                    <div
                      style={{
                        color: "#64748B",
                        fontSize: 13,
                        lineHeight: 1.7,
                      }}
                    >
                      {active
                        ? "This community is selected. Its live work opens in Marketplace."
                        : "Set this community first, then open its Marketplace."}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: isCompact ? "flex-start" : "flex-end",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => void handleSelectCommunity(clan, false)}
                        disabled={working}
                        style={actionBtn("secondary", working)}
                      >
                        {active ? "Current" : working ? "Selecting..." : "Set Current"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleSelectCommunity(clan, true)}
                        disabled={working}
                        style={actionBtn("primary", working)}
                      >
                        {working ? "Opening..." : "Open Marketplace"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>
      </div>
    </div>
  );
}


