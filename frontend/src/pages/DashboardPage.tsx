import React, { useEffect, useMemo, useRef, useState } from "react";
import ExplainToggle from "../components/ExplainToggle";
import SpotlightMediaFrame from "../components/SpotlightMediaFrame";
import SystemPictureFrame from "../components/SystemPictureFrame";
import { useLocation, useNavigate } from "react-router-dom";
import { navigateWithOrigin } from "../lib/nav";
import {
  getCommunityJoinRequests,
  getCurrentClan,
  getDailyInsight,
  getMarketplaceBroadcasts,
  getMe,
  getMyNotifications,
  getMyTrustSlip,
  getSelectedClanId,
  listMarketplaceRequests,
} from "../lib/api";
import {
  buildGuidanceSnapshot,
  type GuidanceSnapshot,
} from "../lib/guidance";
import {
  GMFN_CAPABILITY_COUNT,
  getFeaturedGmfnCapability,
  getGmfnCapability,
  getGmfnCapabilityGuideLine,
} from "../lib/gmfnCapabilities";
import {
  getSmartMarketWisdomPair,
  type MarketWisdomPair,
} from "../lib/marketWisdom";
import {
  buildDashboardNextRouteCopy,
  buildDashboardTrustAttentionCore,
  buildDashboardTrustNoticeCopy,
  getDashboardRouteSurfaceLabel,
} from "../lib/dashboardUserGuidance";
import {
  readDashboardAppUsage,
  sortAppUsageRows,
  type AppUseRecord,
} from "../lib/dashboardAppUsage";
import {
  buildDashboardAttentionSignal,
  defaultDashboardAttentionStoredState,
  markDashboardAttentionActed,
  markDashboardAttentionDismissed,
  markDashboardAttentionShown,
  normalizeDashboardAttentionStoredState,
} from "../lib/dashboardAttentionEngine";

type SpotlightItem = {
  id?: number;
  title?: string | null;
  message?: string | null;
  body?: string | null;
  image_url?: string | null;
  image?: string | null;
  video_url?: string | null;
  source_shop_name?: string | null;
  source_clan_name?: string | null;
  source_clan_id?: number | string | null;
  source_marketplace_id?: number | string | null;
  clan_id?: number | string | null;
  marketplace_id?: number | string | null;
  author_name?: string | null;
  author_gmfn_id?: string | null;
  trust_band?: string | null;
  trust_score?: number | string | null;
  price?: string | number | null;
  currency?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
};

type JoinRequestItem = {
  id?: number;
  clan_id?: number;
  clan_name?: string | null;
  applicant_email?: string | null;
  status?: string | null;
  approvals?: number;
  required_approvals?: number;
};

type DemandItem = {
  id?: number;
  title?: string;
  description?: string | null;
  status?: string;
  urgency?: string | null;
  requester_name?: string | null;
  requester_nickname?: string | null;
  requester_email?: string | null;
  requester_gmfn_id?: string | null;
  created_at?: string | null;
  allow_trust_credit?: boolean;
};

type NoticeItem = {
  id?: number;
  kind?: string;
  title?: string;
  message?: string;
  action_url?: string | null;
  action_label?: string | null;
  is_read?: boolean;
  created_at?: string | null;
};

type ReadingState = {
  classText: string;
  scoreText: string;
  tone: "green" | "yellow" | "red" | "neutral";
  statusText: string;
  whyText: string;
};

type GuidancePulse = {
  severity: "normal" | "important" | "urgent";
  title: string;
  body: string;
  nowLine: string;
  nextLine: string;
  wisdomLine: string;
  ctaTo: string;
  ctaLabel: string;
};

type DashboardUIState = {
  spotlightMinimized: boolean;
  routesExpanded: boolean;
  appsExpanded: boolean;
  inboxExpanded: boolean;
  trustExpanded: boolean;
};

type DashboardNoticeItem = {
  id: string;
  title: string;
  detail: string;
  ctaLabel: string;
  ctaTo: string;
  unread: boolean;
  source: string;
  bucket: "actNow" | "dueSoon" | "watch";
  score: number;
};

type DashboardNoticeSummary = {
  allRows: DashboardNoticeItem[];
  actNow: DashboardNoticeItem[];
  dueSoon: DashboardNoticeItem[];
  watch: DashboardNoticeItem[];
  unread: DashboardNoticeItem[];
  counts: {
    actNow: number;
    dueSoon: number;
    watch: number;
    unread: number;
  };
};

type DashboardNoticePreviewTone = "red" | "yellow" | "blue" | "slate";

type DashboardNoticeSourceGroup = {
  key: string;
  title: string;
  detail: string;
  count: number;
  unreadCount: number;
  actNowCount: number;
  dueSoonCount: number;
  watchCount: number;
  to: string;
  ctaLabel: string;
  tone: DashboardNoticePreviewTone;
  rows: DashboardNoticeItem[];
};

type DashboardNoticeQuickGroupKey = "act-now" | "due-soon" | "unread";

type DemandDetailPanelKey =
  | "open-requests"
  | "urgent"
  | "current-request"
  | "create-demand";

type DemandDetailPanel = {
  key: DemandDetailPanelKey;
  chipLabel: string;
  title: string;
  detail: string;
  to: string;
  ctaLabel: string;
  tone: DashboardNoticePreviewTone;
  items: DemandItem[];
};

type UserOperationalClass =
  | "repair"
  | "approval"
  | "setup"
  | "seller"
  | "demand"
  | "steady";

type IntelligentRoute = {
  key: string;
  label: string;
  detail: string;
  to: string;
  reason?: string;
};

type FocusCommitmentCategory =
  | "savings"
  | "business"
  | "sales"
  | "inventory"
  | "service"
  | "repayment"
  | "community";

type FocusCommitmentCadence = "weekly" | "monthly";

type FocusCommitmentStatus = "onTrack" | "watch" | "behind" | "completed";

type FocusCommitment = {
  id: string;
  title: string;
  category: FocusCommitmentCategory;
  targetValue: number | null;
  currentValue: number | null;
  unit: string;
  startDate: string;
  dueDate: string;
  cadence: FocusCommitmentCadence;
  nextCheckInDate: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  archived?: boolean;
};

type FocusCommitmentEventKind =
  | "created"
  | "checkin"
  | "milestone"
  | "replan"
  | "complete"
  | "missed-reported";

type FocusCommitmentEvent = {
  id: string;
  commitmentId: string;
  kind: FocusCommitmentEventKind;
  createdAt: string;
  progressValue?: number | null;
  note?: string;
};

type FocusCommitmentDraft = {
  title: string;
  category: FocusCommitmentCategory;
  targetValue: string;
  unit: string;
  dueDate: string;
  cadence: FocusCommitmentCadence;
  note: string;
};

type FocusCommitmentSummary = {
  active: FocusCommitment[];
  onTrackCount: number;
  watchCount: number;
  behindCount: number;
  completedCount: number;
  nextReviewLabel: string;
  disciplineLine: string;
};

type TrustJourneyModel = {
  tone: ReadingState["tone"];
  posture:
    | "strongPortable"
    | "stableProtected"
    | "drifting"
    | "repair"
    | "unverified";
  postureTitle: string;
  postureDetail: string;
  primaryRoute: IntelligentRoute;
  secondaryRoute: IntelligentRoute;
  helps: string[];
  weakens: string[];
  commitmentLine: string;
};

type DashboardRouteActionHandler = (
  event: React.SyntheticEvent<HTMLElement> | undefined,
  to: string
) => void;

const DASHBOARD_UI_STORAGE_KEY = "gmfn.dashboard.ui.v4";
const DASHBOARD_AVATAR_STORAGE_KEY = "gmfn.member.avatar";
const DASHBOARD_ATTENTION_STORAGE_KEY = "gmfn.dashboard.attention.v2";
const DASHBOARD_FOCUS_COMMITMENTS_STORAGE_KEY =
  "gmfn.dashboard.focus-commitments.v1";
const DASHBOARD_FOCUS_EVENTS_STORAGE_KEY =
  "gmfn.dashboard.focus-events.v1";

const PUBLIC_ROUTE_PREFIXES = [
  "cover",
  "welcome",
  "guide",
  "login",
  "create",
  "join",
  "pending-approval",
  "join-request",
  "join-approval",
  "approved",
  "activate",
  "activate-membership",
  "existing",
  "founder",
  "public-create",
  "register",
  "finance",
  "finances",
  "financials",
  "open-finance",
];

const DASHBOARD_TARGETS = {
  DASHBOARD: "/app/dashboard",
  COMMUNITY: "/app/community",
  MARKETPLACE: "/app/marketplace",
  FINANCE: "/app/finance",
  MONEY_IN: "/app/payment/pool",
  MONEY_OUT: "/app/withdrawal-instructions",
  TRUST: "/app/trust",
  TRUST_SLIP: "/app/trust-slip",
  TRUST_SLIP_VERIFY: "/app/trust-slip/verify",
  CCI: "/app/identity",
  WHAT_MATTERS_NOW: "/app/notifications",
  DEMAND_BOX: "/app/demand-box",
  LOANS: "/app/loans",
  LOAN_READINESS: "/app/loan-readiness",
  LOAN_SUGGESTIONS: "/app/loan-suggestions",
  LOAN_WORKBENCH: "/app/loan-workbench",
  GUIDE: "/app/my-gmfn-and-i",
  SETTINGS: "/app/my-gmfn-and-i?tab=settings",
  BUILD_FIRST_CIRCLE: "/app/build-first-circle",
  SHOP_ME: "/app/shop/me",
  COMMAND_CENTER: "/app/command-center",
  GUARANTOR_EARNINGS: "/app/guarantor-earnings",
} as const;

const EXACT_TARGET_ALIASES: Record<string, string> = {
  dashboard: DASHBOARD_TARGETS.DASHBOARD,
  home: DASHBOARD_TARGETS.DASHBOARD,
  "main-dashboard": DASHBOARD_TARGETS.DASHBOARD,
  "member-home": DASHBOARD_TARGETS.DASHBOARD,

  notifications: DASHBOARD_TARGETS.WHAT_MATTERS_NOW,
  "action-inbox": DASHBOARD_TARGETS.WHAT_MATTERS_NOW,
  inbox: DASHBOARD_TARGETS.WHAT_MATTERS_NOW,

  finance: DASHBOARD_TARGETS.FINANCE,
  finances: DASHBOARD_TARGETS.FINANCE,
  financials: DASHBOARD_TARGETS.FINANCE,
  "open-finance": DASHBOARD_TARGETS.FINANCE,
  "finance-overview": DASHBOARD_TARGETS.FINANCE,
  "finance-meter": DASHBOARD_TARGETS.FINANCE,

  "money-in": DASHBOARD_TARGETS.MONEY_IN,
  "payment/pool": DASHBOARD_TARGETS.MONEY_IN,

  "money-out": DASHBOARD_TARGETS.MONEY_OUT,
  withdrawal: DASHBOARD_TARGETS.MONEY_OUT,
  "withdrawal-instructions": DASHBOARD_TARGETS.MONEY_OUT,

  marketplace: DASHBOARD_TARGETS.MARKETPLACE,
  market: DASHBOARD_TARGETS.MARKETPLACE,
  "open-marketplace": DASHBOARD_TARGETS.MARKETPLACE,

  community: DASHBOARD_TARGETS.COMMUNITY,
  "community-home": DASHBOARD_TARGETS.COMMUNITY,
  "community-tools": DASHBOARD_TARGETS.COMMUNITY,
  "community-tool": DASHBOARD_TARGETS.COMMUNITY,
  "control-room": DASHBOARD_TARGETS.COMMUNITY,
  "command-room": DASHBOARD_TARGETS.COMMUNITY,
  "open-community": DASHBOARD_TARGETS.COMMUNITY,
  "open-community-home": DASHBOARD_TARGETS.COMMUNITY,

  trust: DASHBOARD_TARGETS.TRUST,
  "trust-passport": DASHBOARD_TARGETS.TRUST,
  "open-trust": DASHBOARD_TARGETS.TRUST,

  "trust-slip": DASHBOARD_TARGETS.TRUST_SLIP,
  trustslip: DASHBOARD_TARGETS.TRUST_SLIP,
  "open-trust-slip": DASHBOARD_TARGETS.TRUST_SLIP,
  "merchant-verify": DASHBOARD_TARGETS.TRUST_SLIP,
  "verify-merchant": DASHBOARD_TARGETS.TRUST_SLIP,
  "trust-slip/verify": DASHBOARD_TARGETS.TRUST_SLIP_VERIFY,

  identity: DASHBOARD_TARGETS.CCI,
  "identity-integrity": DASHBOARD_TARGETS.CCI,
  cci: DASHBOARD_TARGETS.CCI,

  "demand-box": DASHBOARD_TARGETS.DEMAND_BOX,
  demands: DASHBOARD_TARGETS.DEMAND_BOX,
  "open-demand": DASHBOARD_TARGETS.DEMAND_BOX,

  loans: DASHBOARD_TARGETS.LOANS,
  money: DASHBOARD_TARGETS.LOANS,
  support: DASHBOARD_TARGETS.LOANS,
  "support-path": DASHBOARD_TARGETS.LOANS,
  "loan-support": DASHBOARD_TARGETS.LOANS,
  "loans-support": DASHBOARD_TARGETS.LOANS,

  "loan-readiness": DASHBOARD_TARGETS.LOAN_READINESS,
  readiness: DASHBOARD_TARGETS.LOAN_READINESS,

  "loan-suggestions": DASHBOARD_TARGETS.LOAN_SUGGESTIONS,
  suggestions: DASHBOARD_TARGETS.LOAN_SUGGESTIONS,

  "loan-workbench": DASHBOARD_TARGETS.LOAN_WORKBENCH,
  workbench: DASHBOARD_TARGETS.LOAN_WORKBENCH,

  "my-gmfn-and-i": DASHBOARD_TARGETS.GUIDE,
  guide: DASHBOARD_TARGETS.GUIDE,
  "member-guide": DASHBOARD_TARGETS.GUIDE,
  settings: DASHBOARD_TARGETS.SETTINGS,
  "workspace-settings": DASHBOARD_TARGETS.SETTINGS,
  "my-gmfn-and-i/settings": DASHBOARD_TARGETS.SETTINGS,

  "build-first-circle": DASHBOARD_TARGETS.BUILD_FIRST_CIRCLE,
  "first-circle": DASHBOARD_TARGETS.BUILD_FIRST_CIRCLE,
  "grow-your-circle": DASHBOARD_TARGETS.BUILD_FIRST_CIRCLE,
  circle: DASHBOARD_TARGETS.BUILD_FIRST_CIRCLE,
  "circle-builder": DASHBOARD_TARGETS.BUILD_FIRST_CIRCLE,

  shop: DASHBOARD_TARGETS.SHOP_ME,
  "my-shop": DASHBOARD_TARGETS.SHOP_ME,
  "shop-gallery": DASHBOARD_TARGETS.SHOP_ME,
  "open-shop": DASHBOARD_TARGETS.SHOP_ME,

  "shop-control": "/app/shop-control",
  "shop-manager": "/app/shop-control",

  "command-center": DASHBOARD_TARGETS.COMMAND_CENTER,
  "trust-command-centre": DASHBOARD_TARGETS.COMMAND_CENTER,
  "trust-analytics": "/app/command-center/trust-analytics",
  "system-operations": "/app/command-center/system-operations",
  "admin/exposure": "/app/command-center/exposure",
  "admin/trust-graph": "/app/command-center/trust-graph",

  earnings: DASHBOARD_TARGETS.GUARANTOR_EARNINGS,
  "guarantor-earnings": DASHBOARD_TARGETS.GUARANTOR_EARNINGS,
};

const DASHBOARD_BRAND = {
  pageWash:
    "radial-gradient(circle at top, rgba(47,103,196,0.16) 0%, rgba(16,37,59,0.00) 22%), linear-gradient(180deg, #F5FAFF 0%, #EEF5FD 42%, #F8FBFF 100%)",
  heroField:
    "radial-gradient(circle at top, rgba(47,103,196,0.16) 0%, rgba(16,37,59,0.00) 32%), linear-gradient(180deg, #10243A 0%, #173654 62%, #26527C 100%)",
  heroGlass:
    "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)",
  summaryPanel:
    "linear-gradient(180deg, rgba(248,251,255,0.98) 0%, rgba(230,239,252,0.96) 58%, rgba(212,226,246,0.92) 100%)",
  summaryButton:
    "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(229,237,249,0.96) 100%)",
  softPanel: "linear-gradient(180deg, #F8FBFF 0%, #EEF5FF 100%)",
  raisedPanel: "linear-gradient(180deg, #FFFFFF 0%, #F4F9FF 100%)",
  quietPanel: "linear-gradient(180deg, #FFFFFF 0%, #FCFEFF 100%)",
  cardBorder: "rgba(16,37,59,0.10)",
  cardBorderStrong: "rgba(16,37,59,0.14)",
  ink: "#10253B",
  subInk: "#35516B",
  helper: "#4A6580",
  label: "#355A86",
  accentDeep: "#123055",
  goldText: "#8A651E",
};

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 26,
    border: `1px solid ${DASHBOARD_BRAND.cardBorderStrong}`,
    background: bg,
    padding: 20,
    boxShadow:
      "0 20px 44px rgba(10,24,49,0.08), inset 0 1px 0 rgba(255,255,255,0.72)",
    overflow: "hidden",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: `1px solid ${DASHBOARD_BRAND.cardBorder}`,
    background: bg,
    padding: 16,
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.86), 0 12px 26px rgba(10,24,49,0.05)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: `1px solid ${DASHBOARD_BRAND.cardBorderStrong}`,
    background: bg,
    padding: 16,
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.84), 0 14px 28px rgba(10,24,49,0.05)",
  };
}

function statTile(
  bg = "#FFFFFF",
  border = "1px solid rgba(11,31,51,0.08)"
): React.CSSProperties {
  return {
    borderRadius: 16,
    border,
    background: bg,
    padding: 14,
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.72), 0 8px 18px rgba(10,24,49,0.04)",
  };
}

function routeTile(primary = false): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 88,
    borderRadius: 16,
    border: primary
      ? "1px solid rgba(29,78,216,0.18)"
      : `1px solid ${DASHBOARD_BRAND.cardBorder}`,
    background: primary
      ? DASHBOARD_BRAND.summaryPanel
      : DASHBOARD_BRAND.raisedPanel,
    padding: 14,
    textDecoration: "none",
    boxShadow: primary
      ? "0 12px 24px rgba(29,78,216,0.07), inset 0 1px 0 rgba(255,255,255,0.78)"
      : "0 10px 22px rgba(10,24,49,0.04), inset 0 1px 0 rgba(255,255,255,0.82)",
  };
}

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    padding: "8px 12px",
    borderRadius: 13,
    border: `1px solid ${DASHBOARD_BRAND.cardBorderStrong}`,
    background: disabled
      ? "linear-gradient(180deg, #E2E8F0 0%, #CBD5E1 100%)"
      : "linear-gradient(180deg, #1B4B78 0%, #2B6599 56%, #3B78AE 100%)",
    color: disabled ? "#64748B" : "#FFFFFF",
    fontWeight: 900,
    fontSize: 13,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.85 : 1,
    whiteSpace: "normal",
    textAlign: "center",
    lineHeight: 1.18,
    maxWidth: "100%",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    boxShadow: disabled
      ? "none"
      : "0 16px 30px rgba(10,24,49,0.16), inset 0 1px 0 rgba(255,255,255,0.16)",
  };
}

function secondaryBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    padding: "8px 12px",
    borderRadius: 13,
    border: `1px solid ${DASHBOARD_BRAND.cardBorderStrong}`,
    background: disabled
      ? "linear-gradient(180deg, #F8FAFC 0%, #E2E8F0 100%)"
      : DASHBOARD_BRAND.summaryButton,
    color: disabled ? "#94A3B8" : DASHBOARD_BRAND.accentDeep,
    fontWeight: 800,
    fontSize: 13,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    textAlign: "center",
    lineHeight: 1.18,
    maxWidth: "100%",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    boxShadow: disabled
      ? "none"
      : "0 10px 22px rgba(10,24,49,0.08), inset 0 1px 0 rgba(255,255,255,0.82)",
  };
}

function subtleBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 34,
    padding: "6px 10px",
    borderRadius: 11,
    border: `1px solid ${DASHBOARD_BRAND.cardBorder}`,
    background: disabled
      ? "linear-gradient(180deg, #F8FAFC 0%, #E2E8F0 100%)"
      : DASHBOARD_BRAND.quietPanel,
    color: disabled ? "#94A3B8" : DASHBOARD_BRAND.subInk,
    fontWeight: 800,
    fontSize: 12,
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    textAlign: "center",
    lineHeight: 1.16,
    maxWidth: "100%",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    boxShadow: disabled
      ? "none"
      : "0 8px 18px rgba(10,24,49,0.06), inset 0 1px 0 rgba(255,255,255,0.82)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: DASHBOARD_BRAND.label,
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
    background: primary
      ? "linear-gradient(180deg, rgba(243,208,106,0.22) 0%, rgba(243,208,106,0.12) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(240,246,255,0.92) 100%)",
    color: primary ? DASHBOARD_BRAND.goldText : DASHBOARD_BRAND.label,
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
    border: primary
      ? "1px solid rgba(145,103,19,0.18)"
      : `1px solid ${DASHBOARD_BRAND.cardBorder}`,
  };
}

function helperText(): React.CSSProperties {
  return {
    color: DASHBOARD_BRAND.helper,
    fontSize: 14,
    lineHeight: 1.75,
  };
}

function fieldInputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 42,
    borderRadius: 12,
    border: `1px solid ${DASHBOARD_BRAND.cardBorderStrong}`,
    background: DASHBOARD_BRAND.quietPanel,
    padding: "10px 12px",
    fontSize: 14,
    color: DASHBOARD_BRAND.ink,
    outline: "none",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.86), 0 6px 14px rgba(10,24,49,0.04)",
  };
}

function fieldTextareaStyle(): React.CSSProperties {
  return {
    ...fieldInputStyle(),
    minHeight: 84,
    resize: "vertical",
  };
}

function stopDashboardPointerEvent(
  event?: React.SyntheticEvent<HTMLElement>
) {
  event?.stopPropagation();
}

function safeStr(x: unknown): string {
  return String(x ?? "").trim();
}

function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function firstNumberLike(...values: unknown[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || String(value).trim() === "") {
      continue;
    }
    const num = Number(value);
    if (!Number.isNaN(num)) return num;
  }
  return null;
}

function positiveNumber(value: unknown): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function readStoredImage(key: string): string {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function readLocalString(key: string): string {
  try {
    if (typeof window === "undefined") return "";
    return String(window.localStorage.getItem(key) || "").trim();
  } catch {
    return "";
  }
}

function initialsFromName(name: string): string {
  const parts = safeStr(name).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function makeLocalId(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function isoNow(): string {
  return new Date().toISOString();
}

function dateInputValueFromNow(days = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
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
      return typeof window !== "undefined"
        ? String(window.location.origin || "").trim().replace(/\/+$/, "")
        : "";
    }
  }

  return typeof window !== "undefined"
    ? String(window.location.origin || "").trim().replace(/\/+$/, "")
    : "";
}

function resolveSpotlightAssetUrl(value?: string | null): string {
  const raw = safeStr(value);
  if (!raw) return "";

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("blob:") ||
    raw.startsWith("data:")
  ) {
    return raw;
  }

  const origin = apiOrigin();
  if (!origin) return raw;
  return `${origin}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function buildResolvedSpotlightCandidates(src: string): string[] {
  const raw = safeStr(src);
  if (!raw) return [];

  return [...new Set([resolveSpotlightAssetUrl(raw), raw].filter(Boolean))];
}

function getStoredCommunitySpotlightImage(clanId: number): string {
  if (!clanId) return "";

  return firstNonEmpty(
    readLocalString(`gmfn.marketplace.communityPicture.${clanId}`),
    readLocalString(`gmfn.communityHome.spotlightImage.${clanId}`)
  );
}

function resolveUserName(me: any): string {
  const direct =
    safeStr(me?.display_name) ||
    safeStr(me?.nickname) ||
    safeStr(me?.name) ||
    safeStr(me?.first_name);

  if (direct) return direct;

  const email = safeStr(me?.email);
  if (email.includes("@")) {
    return email.split("@")[0] || "Member";
  }

  return email || "Member";
}

function resolveUserSecondary(me: any): string {
  return safeStr(me?.email || me?.phone_e164 || "");
}

function currentCommunityName(currentClan: any, selectedClanId: number): string {
  return (
    firstNonEmpty(
      currentClan?.marketplace_name,
      currentClan?.name,
      currentClan?.display_name,
      currentClan?.title
    ) || (selectedClanId ? `Community ${selectedClanId}` : "No community selected")
  );
}

function safeDateTime(x: unknown): string {
  const raw = safeStr(x);
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function describeSpotlightExpiry(item: SpotlightItem | null): {
  chip: string;
  detail: string;
  urgent: boolean;
} {
  const expiresAt = toDateSafe(item?.expires_at);
  if (!expiresAt) {
    return {
      chip: "Live now",
      detail: "No end time is visible for this spotlight yet.",
      urgent: false,
    };
  }

  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffMs <= 0) {
    return {
      chip: "Run ended",
      detail: `This spotlight reached its end time at ${safeDateTime(expiresAt)}.`,
      urgent: true,
    };
  }

  if (diffHours <= 24) {
    return {
      chip: "Ends soon",
      detail: `This spotlight is scheduled to end at ${safeDateTime(expiresAt)}.`,
      urgent: true,
    };
  }

  return {
    chip: "Live now",
    detail: `This spotlight is scheduled to end at ${safeDateTime(expiresAt)}.`,
    urgent: false,
  };
}

function toDateSafe(value: unknown): Date | null {
  const raw = safeStr(value);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d : null;
}

function shiftDateInputValue(value: unknown, days: number): string {
  const d = toDateSafe(value) || new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysUntil(value: unknown): number | null {
  const d = toDateSafe(value);
  if (!d) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(d);
  target.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function formatDateLabel(value: unknown): string {
  const d = toDateSafe(value);
  if (!d) return "—";
  return d.toLocaleDateString();
}

function minDateInputValue(a: unknown, b: unknown): string {
  const da = toDateSafe(a);
  const db = toDateSafe(b);

  if (!da && !db) return dateInputValueFromNow(0);
  if (!da) return safeStr(b);
  if (!db) return safeStr(a);

  return da.getTime() <= db.getTime() ? safeStr(a) : safeStr(b);
}

function nextCheckInForCadence(
  cadence: FocusCommitmentCadence,
  base: unknown = new Date()
): string {
  return shiftDateInputValue(base, cadence === "weekly" ? 7 : 30);
}

function defaultFocusCommitmentDraft(): FocusCommitmentDraft {
  return {
    title: "",
    category: "savings",
    targetValue: "",
    unit: "?",
    dueDate: dateInputValueFromNow(30),
    cadence: "weekly",
    note: "",
  };
}

function focusCategoryLabel(category: FocusCommitmentCategory): string {
  if (category === "savings") return "Savings";
  if (category === "business") return "Business";
  if (category === "sales") return "Sales";
  if (category === "inventory") return "Inventory";
  if (category === "service") return "Service";
  if (category === "repayment") return "Repayment";
  return "Community";
}

function routeSurfaceLabel(route: IntelligentRoute): string {
  return getDashboardRouteSurfaceLabel({
    key: route.key,
    label: route.label,
  });
}

function buildNextRouteCopy(params: {
  userClass: UserOperationalClass;
  pendingRequestsCount: number;
  urgentDemandCount: number;
  actNowCount: number;
  openTrust: ReadingState;
  cci: ReadingState;
  trustSlipCode: string;
  primaryLabel: string;
  trustExplainer?: {
    helps?: string[];
    weakens?: string[];
    next?: string[];
  } | null;
}): {
  badge: string;
  title: string;
  detail: string;
  issueText: string;
  consequenceText: string;
  actionText: string;
  supportHint: string;
} {
  return buildDashboardNextRouteCopy(params);
}

function formatFocusProgress(
  currentValue: number | null,
  targetValue: number | null,
  unit: string
): string {
  const current =
    currentValue === null || Number.isNaN(Number(currentValue))
      ? "0"
      : String(currentValue);

  const target =
    targetValue === null || Number.isNaN(Number(targetValue))
      ? "—"
      : String(targetValue);

  if (unit === "?") {
    return `${unit}${current} / ${unit}${target}`;
  }

  return `${current} / ${target} ${unit}`.trim();
}

function splitPathSuffix(raw: string): { path: string; suffix: string } {
  const match = raw.match(/^([^?#]*)(.*)$/);
  return {
    path: safeStr(match?.[1] || ""),
    suffix: String(match?.[2] || ""),
  };
}

function matchesRoutePrefix(path: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) =>
      path === prefix ||
      path.startsWith(`${prefix}/`) ||
      path.startsWith(`${prefix}?`) ||
      path.startsWith(`${prefix}#`)
  );
}

function mergeAliasTarget(target: string, suffix: string): string {
  if (!suffix) return target;

  const parsed = new URL(target, "http://local");
  const hashIndex = suffix.indexOf("#");
  const queryPart = hashIndex >= 0 ? suffix.slice(0, hashIndex) : suffix;
  const hashPart = hashIndex >= 0 ? suffix.slice(hashIndex) : "";

  if (queryPart.startsWith("?")) {
    const extra = new URLSearchParams(queryPart.slice(1));
    extra.forEach((value, key) => {
      if (!parsed.searchParams.has(key)) {
        parsed.searchParams.append(key, value);
      }
    });
  }

  if (hashPart) {
    parsed.hash = hashPart;
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function isSafeRelativeAppPath(path: string): boolean {
  const value = path.toLowerCase();

  return (
    /^payment\/loans\/[^/]+$/.test(value) ||
    /^shop\/[^/]+$/.test(value) ||
    /^open-shop\/[^/]+$/.test(value) ||
    /^shop-gallery\/[^/]+$/.test(value) ||
    /^community\/[^/]+\/join-requests$/.test(value) ||
    value === "trust-slip/verify" ||
    value.startsWith("command-center/") ||
    value.startsWith("admin/")
  );
}

function normalizeActionTargetPath(value: unknown): string {
  const raw = safeStr(value);
  if (!raw) return DASHBOARD_TARGETS.WHAT_MATTERS_NOW;

  if (/^(https?:|mailto:|tel:)/i.test(raw)) {
    return raw;
  }

  if (raw.startsWith("#")) {
    return raw;
  }

  if (raw.startsWith("/")) {
    return raw;
  }

  if (raw.startsWith("?")) {
    return `${DASHBOARD_TARGETS.DASHBOARD}${raw}`;
  }

  const { path, suffix } = splitPathSuffix(raw);
  const normalizedPath = safeStr(path).replace(/^\/+/, "");
  const lowerPath = normalizedPath.toLowerCase();

  if (!lowerPath) return DASHBOARD_TARGETS.WHAT_MATTERS_NOW;

  const aliased = EXACT_TARGET_ALIASES[lowerPath];
  if (aliased) {
    return mergeAliasTarget(aliased, suffix);
  }

  if (lowerPath === "app" || lowerPath.startsWith("app/")) {
    return `/${normalizedPath}${suffix}`;
  }

  if (matchesRoutePrefix(lowerPath, PUBLIC_ROUTE_PREFIXES)) {
    return `/${normalizedPath}${suffix}`;
  }

  if (isSafeRelativeAppPath(lowerPath)) {
    return `/app/${normalizedPath}${suffix}`;
  }

  return DASHBOARD_TARGETS.WHAT_MATTERS_NOW;
}

function getCciState(me: any): ReadingState {
  const rawScore =
    me?.cci_score ??
    me?.cross_client_integrity_score ??
    me?.cross_clan_integrity_score ??
    me?.cross_community_integrity_score ??
    null;

  const rawClass =
    me?.cci_class ??
    me?.cross_client_integrity_class ??
    me?.cross_clan_integrity_class ??
    me?.cross_community_integrity_class ??
    "";

  const rawWhy =
    me?.cci_reason ??
    me?.cross_client_integrity_reason ??
    me?.cross_clan_integrity_reason ??
    me?.cross_community_integrity_reason ??
    "";

  const scoreNum =
    rawScore === null || rawScore === undefined || String(rawScore).trim() === ""
      ? null
      : Number(rawScore);

  const classText = String(rawClass || "").trim().toUpperCase();

  if (classText) {
    if (classText === "A" || classText === "A+") {
      return {
        classText,
        scoreText:
          scoreNum === null || Number.isNaN(scoreNum)
            ? "—"
            : String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Healthy across visible communities",
        whyText: String(rawWhy || "Your trust position is steady right now."),
      };
    }

    if (classText === "B") {
      return {
        classText,
        scoreText:
          scoreNum === null || Number.isNaN(scoreNum)
            ? "—"
            : String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Stable and growing",
        whyText: String(
          rawWhy || "Keep consistent positive actions across communities."
        ),
      };
    }

    if (classText === "C") {
      return {
        classText,
        scoreText:
          scoreNum === null || Number.isNaN(scoreNum)
            ? "—"
            : String(Math.round(scoreNum)),
        tone: "yellow",
        statusText: "Needs attention",
        whyText: String(
          rawWhy || "A few better actions can improve your standing."
        ),
      };
    }

    return {
      classText,
      scoreText:
        scoreNum === null || Number.isNaN(scoreNum)
          ? "—"
          : String(Math.round(scoreNum)),
      tone: "red",
      statusText: "At risk",
      whyText: String(rawWhy || "Your trust position needs action and repair."),
    };
  }

  if (scoreNum !== null && !Number.isNaN(scoreNum)) {
    if (scoreNum >= 75) {
      return {
        classText: "A",
        scoreText: String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Healthy across visible communities",
        whyText: String(rawWhy || "Your trust position is looking strong."),
      };
    }

    if (scoreNum >= 55) {
      return {
        classText: "B",
        scoreText: String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Stable and growing",
        whyText: String(
          rawWhy || "Keep consistent actions to strengthen your standing."
        ),
      };
    }

    if (scoreNum >= 35) {
      return {
        classText: "C",
        scoreText: String(Math.round(scoreNum)),
        tone: "yellow",
        statusText: "Needs attention",
        whyText: String(
          rawWhy || "Some recent actions may have reduced your trust strength."
        ),
      };
    }

    return {
      classText: "D",
      scoreText: String(Math.round(scoreNum)),
      tone: "red",
      statusText: "At risk",
      whyText: String(rawWhy || "Your trust position needs urgent improvement."),
    };
  }

  return {
    classText: "Pending",
    scoreText: "—",
    tone: "neutral",
    statusText: "CCI is being prepared",
    whyText: "A fuller cross-community reading will appear when available.",
  };
}

function getOpenTrustState(
  me: any,
  trustSlip: any,
  hasSelectedCommunity: boolean
): ReadingState {
  const rawClass = firstNonEmpty(
    me?.open_trust_class,
    me?.open_trust_band,
    me?.current_community_trust_class,
    me?.current_community_trust_band,
    me?.community_trust_class,
    me?.community_trust_band,
    me?.selected_clan_trust_class,
    me?.selected_clan_trust_band,
    trustSlip?.open_trust_class,
    trustSlip?.open_trust_band,
    trustSlip?.community_trust_class,
    trustSlip?.community_trust_band,
    me?.trust_class,
    me?.trust_band,
    trustSlip?.trust_class,
    trustSlip?.trust_band
  ).toUpperCase();

  const rawScore = firstNumberLike(
    me?.open_trust_score,
    me?.current_community_trust_score,
    me?.community_trust_score,
    me?.selected_clan_trust_score,
    trustSlip?.open_trust_score,
    trustSlip?.community_trust_score,
    me?.trust_score,
    trustSlip?.trust_score
  );

  const rawWhy = firstNonEmpty(
    me?.open_trust_reason,
    me?.current_community_trust_reason,
    me?.community_trust_reason,
    me?.selected_clan_trust_reason,
    trustSlip?.open_trust_reason,
    trustSlip?.community_trust_reason,
    me?.trust_reason,
    trustSlip?.trust_reason
  );

  if (rawClass) {
    if (rawClass === "A" || rawClass === "A+") {
      return {
        classText: rawClass,
        scoreText:
          rawScore === null || Number.isNaN(rawScore)
            ? "—"
            : String(Math.round(rawScore)),
        tone: "green",
        statusText: "Strong in your current community",
        whyText: rawWhy || "Your present community reading is strong.",
      };
    }

    if (rawClass === "B") {
      return {
        classText: rawClass,
        scoreText:
          rawScore === null || Number.isNaN(rawScore)
            ? "—"
            : String(Math.round(rawScore)),
        tone: "green",
        statusText: "Stable in your current community",
        whyText:
          rawWhy || "Your current community reading looks steady right now.",
      };
    }

    if (rawClass === "C") {
      return {
        classText: rawClass,
        scoreText:
          rawScore === null || Number.isNaN(rawScore)
            ? "—"
            : String(Math.round(rawScore)),
        tone: "yellow",
        statusText: "Needs attention in your current community",
        whyText:
          rawWhy ||
          "Your current community reading suggests some areas need attention.",
      };
    }

    return {
      classText: rawClass,
      scoreText:
        rawScore === null || Number.isNaN(rawScore)
          ? "—"
          : String(Math.round(rawScore)),
      tone: "red",
      statusText: "At risk in your current community",
      whyText:
        rawWhy ||
        "Your current community reading shows pressure that needs attention.",
    };
  }

  if (rawScore !== null && !Number.isNaN(rawScore)) {
    if (rawScore >= 75) {
      return {
        classText: "A",
        scoreText: String(Math.round(rawScore)),
        tone: "green",
        statusText: "Strong in your current community",
        whyText: rawWhy || "Your current community reading is strong.",
      };
    }

    if (rawScore >= 55) {
      return {
        classText: "B",
        scoreText: String(Math.round(rawScore)),
        tone: "green",
        statusText: "Stable in your current community",
        whyText:
          rawWhy || "Your current community reading looks steady right now.",
      };
    }

    if (rawScore >= 35) {
      return {
        classText: "C",
        scoreText: String(Math.round(rawScore)),
        tone: "yellow",
        statusText: "Needs attention in your current community",
        whyText:
          rawWhy ||
          "Your current community reading suggests some areas need attention.",
      };
    }

    return {
      classText: "D",
      scoreText: String(Math.round(rawScore)),
      tone: "red",
      statusText: "At risk in your current community",
      whyText:
        rawWhy ||
        "Your current community reading shows pressure that needs attention.",
    };
  }

  if (!hasSelectedCommunity) {
    return {
      classText: "Pending",
      scoreText: "—",
      tone: "neutral",
      statusText: "Select a community to view Open Trust",
      whyText:
        "Open Trust belongs to your immediate community reading, not to your cross-community integrity reading.",
    };
  }

  return {
    classText: "Pending",
    scoreText: "—",
    tone: "neutral",
    statusText: "Open Trust is being prepared",
    whyText:
      "Open Trust reflects your standing in the community you are using now and will appear here when available.",
  };
}

function toneStyles(tone: "green" | "yellow" | "red" | "neutral") {
  if (tone === "green") {
    return {
      bg: "#F3FBF5",
      border: "1px solid rgba(34,197,94,0.16)",
      text: "#166534",
    };
  }

  if (tone === "yellow") {
    return {
      bg: "#FFFBEF",
      border: "1px solid rgba(245,158,11,0.16)",
      text: "#92400E",
    };
  }

  if (tone === "red") {
    return {
      bg: "#FFF5F5",
      border: "1px solid rgba(239,68,68,0.16)",
      text: "#991B1B",
    };
  }

  return {
    bg: "#F8FAFC",
    border: "1px solid rgba(148,163,184,0.16)",
    text: "#334155",
  };
}

function textContainsAny(text: string, tokens: string[]): boolean {
  const lower = safeStr(text).toLowerCase();
  return tokens.some((token) => lower.includes(token));
}

function dashboardNoticeSource(text: string, target: string): string {
  const joined = `${safeStr(text)} ${safeStr(target)}`.toLowerCase();
  const to = safeStr(target).toLowerCase();

  if (
    textContainsAny(joined, [
      "join request",
      "join approval",
      "invite link",
      "join link",
      "pending approval",
      "membership request",
    ]) ||
    to.includes("/join-requests")
  ) {
    return "Join Links";
  }

  if (
    textContainsAny(joined, [
      "vote",
      "voting",
      "ballot",
      "poll",
      "community decision",
      "council decision",
    ])
  ) {
    return "Community Voting";
  }

  if (
    textContainsAny(joined, [
      "trust passport",
      "trustslip",
      "trust slip",
      "merchant verify",
      "verify merchant",
      "identity",
      "cci",
      "trust event",
    ]) ||
    to.includes("/app/trust") ||
    to.includes("/app/identity") ||
    to.includes("/app/trust-slip")
  ) {
    return "Trust Events";
  }

  if (
    textContainsAny(joined, [
      "demand box",
      "open demand",
      "market demand",
      "buyer need",
      "request for goods",
      "request for item",
      "demand",
    ]) ||
    to.includes("/app/demand-box")
  ) {
    return "Demand Box";
  }

  if (
    textContainsAny(joined, [
      "spotlight",
      "broadcast",
      "shop spotlight",
      "market spotlight",
    ])
  ) {
    return "Spotlight Demand";
  }

  if (
    textContainsAny(joined, [
      "finance",
      "payment",
      "pool",
      "withdrawal",
      "deposit",
      "money in",
      "money out",
      "open finance",
    ]) ||
    to.includes("/app/finance") ||
    to.includes("/app/payment/pool") ||
    to.includes("/app/withdrawal-instructions")
  ) {
    return "Open Finance";
  }

  if (
    textContainsAny(joined, [
      "loan",
      "guarantor",
      "support path",
      "loan readiness",
      "loan suggestions",
      "loan workbench",
    ]) ||
    to.includes("/app/loans") ||
    to.includes("/app/loan-")
  ) {
    return "Support Path";
  }

  if (
    textContainsAny(joined, [
      "focus commitment",
      "checkpoint",
      "check in",
      "replan",
      "savings target",
      "repayment target",
      "business target",
      "review due",
      "commitment",
    ]) ||
    to.includes("#focus-commitments") ||
    to.includes("#trust-journey")
  ) {
    return "Focus Commitments";
  }

  if (to.includes("/app/marketplace") || to.includes("/app/shop/")) {
    return "Marketplace";
  }

  return "General";
} 
function dashboardNoticeScore(
  bucket: "actNow" | "dueSoon" | "watch",
  unread: boolean,
  source: string
): number {
  const bucketScore =
    bucket === "actNow" ? 300 : bucket === "dueSoon" ? 200 : 100;
  const unreadScore = unread ? 25 : 0;
  const sourceScore =
    source === "Join Links" ||
    source === "Trust Events" ||
    source === "Community Voting"
      ? 20
      : source === "Demand Box" ||
        source === "Open Finance" ||
        source === "Support Path" ||
        source === "Focus Commitments"
      ? 12
      : source === "Spotlight Demand"
      ? 6
      : 0;

  return bucketScore + unreadScore + sourceScore;
}

function dashboardNoticePreviewToneStyles(
  tone: DashboardNoticePreviewTone
): {
  bg: string;
  border: string;
  text: string;
  badgeBg: string;
  badgeText: string;
} {
  if (tone === "red") {
    return {
      bg: "#FFF7F7",
      border: "1px solid rgba(239,68,68,0.14)",
      text: "#991B1B",
      badgeBg: "rgba(239,68,68,0.10)",
      badgeText: "#991B1B",
    };
  }

  if (tone === "yellow") {
    return {
      bg: "#FFFBEF",
      border: "1px solid rgba(245,158,11,0.14)",
      text: "#92400E",
      badgeBg: "rgba(245,158,11,0.14)",
      badgeText: "#92400E",
    };
  }

  if (tone === "blue") {
    return {
      bg: "#F7FAFF",
      border: "1px solid rgba(11,99,209,0.12)",
      text: "#0B63D1",
      badgeBg: "rgba(11,99,209,0.10)",
      badgeText: "#0B63D1",
    };
  }

  return {
    bg: "#F8FAFC",
    border: "1px solid rgba(148,163,184,0.16)",
    text: "#334155",
    badgeBg: "rgba(148,163,184,0.12)",
    badgeText: "#334155",
  };
}

function dashboardNoticeSourceKey(source: string): string {
  return (
    safeStr(source)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "general"
  );
}

function sortDashboardNoticeItems(rows: DashboardNoticeItem[]): DashboardNoticeItem[] {
  return [...rows].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (Number(b.unread) !== Number(a.unread)) {
      return Number(b.unread) - Number(a.unread);
    }
    return safeStr(a.title).localeCompare(safeStr(b.title));
  });
}

function renderDashboardNoticeCard(
  item: DashboardNoticeItem,
  onOpenRoute: DashboardRouteActionHandler
) {
  const bucketLabel =
    item.bucket === "actNow"
      ? "Act now"
      : item.bucket === "dueSoon"
      ? "Due soon"
      : "Watch";
  const bucketTone =
    item.bucket === "actNow"
      ? { bg: "rgba(239,68,68,0.10)", text: "#991B1B" }
      : item.bucket === "dueSoon"
      ? { bg: "rgba(245,158,11,0.14)", text: "#92400E" }
      : { bg: "rgba(11,99,209,0.10)", text: "#0B63D1" };

  return (
    <div
      key={item.id}
      style={{
        ...softCard("#FFFFFF"),
        padding: 12,
      }}
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
        <div
          style={{
            color: "#0B1F33",
            fontWeight: 800,
            lineHeight: 1.32,
            flex: "1 1 220px",
          }}
        >
          {item.title}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              ...badge(false),
              background: bucketTone.bg,
              color: bucketTone.text,
              border: "none",
            }}
          >
            {bucketLabel}
          </span>
          {item.unread ? <span style={badge(true)}>Unread</span> : null}
        </div>
      </div>

      <div style={{ marginTop: 6, ...helperText(), fontSize: 13 }}>
        {item.detail}
      </div>

      <div style={{ marginTop: 10 }}>
        <button
          type="button"
          onClick={(event) => onOpenRoute(event, item.ctaTo)}
          onPointerDown={stopDashboardPointerEvent}
          style={{
            ...subtleBtn(false),
            minHeight: 34,
            padding: "7px 11px",
            fontSize: 12.5,
          }}
        >
          {item.ctaLabel}
        </button>
      </div>
    </div>
  );
}

function renderDashboardNoticeSourceGroup(
  item: DashboardNoticeSourceGroup,
  expanded: boolean,
  onToggle: (key: string) => void,
  onOpenRoute: DashboardRouteActionHandler
) {
  const tone = dashboardNoticePreviewToneStyles(item.tone);
  const visibleRows = item.rows.slice(0, 2);
  const hiddenCount = Math.max(item.rows.length - visibleRows.length, 0);

  return (
    <div
      key={item.key}
      style={{
        ...innerCard(tone.bg),
        border: tone.border,
        padding: 12,
        boxShadow: "0 10px 22px rgba(10,24,49,0.04)",
      }}
    >
      <button
        type="button"
        onClick={() => onToggle(item.key)}
        onPointerDown={stopDashboardPointerEvent}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "flex-start",
          flexWrap: "wrap",
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div
          style={{
            minWidth: 0,
            flex: "1 1 220px",
          }}
        >
          <div
            style={{
              color: tone.text,
              fontWeight: 900,
              fontSize: 15,
              lineHeight: 1.25,
            }}
          >
            {item.title}
          </div>

          <div
            style={{
              marginTop: 6,
              color: "#4A6580",
              fontSize: 12.5,
              lineHeight: 1.58,
              whiteSpace: expanded ? "normal" : "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.detail}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <span
            style={{
              ...badge(false),
              background: tone.badgeBg,
              color: tone.badgeText,
              border: "none",
              minWidth: 30,
              justifyContent: "center",
            }}
          >
            {item.count}
          </span>
          <span style={badge(false)}>{expanded ? "Close" : "Open"}</span>
        </div>
      </button>

      {expanded ? (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={(event) => onOpenRoute(event, item.to)}
              onPointerDown={stopDashboardPointerEvent}
              style={{
                ...secondaryBtn(false),
                minHeight: 36,
                padding: "8px 12px",
                fontSize: 12.5,
              }}
            >
              {item.ctaLabel}
            </button>
            {hiddenCount > 0 ? (
              <span style={badge(false)}>
                {hiddenCount} more on this screen
              </span>
            ) : null}
          </div>

          {visibleRows.map((row) => renderDashboardNoticeCard(row, onOpenRoute))}
        </div>
      ) : null}
    </div>
  );
}

function spotlightMarketplaceTo(item: SpotlightItem | null): string {
  const verifiedClanId = positiveNumber(item?.source_clan_id || item?.clan_id);

  if (verifiedClanId > 0) {
    return `/community/${verifiedClanId}`;
  }

  return DASHBOARD_TARGETS.MARKETPLACE;
}

function defaultDashboardUIState(): DashboardUIState {
  return {
    spotlightMinimized: false,
    routesExpanded:
      typeof window !== "undefined" ? window.innerWidth > 1100 : true,
    appsExpanded:
      typeof window !== "undefined" ? window.innerWidth > 1100 : true,
    inboxExpanded: false,
    trustExpanded: false,
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

function writeLocalJSON(key: string, value: unknown) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function normalizeDashboardUIState(raw: unknown): DashboardUIState {
  const base = defaultDashboardUIState();
  const src = (raw ?? {}) as Partial<DashboardUIState>;

  return {
    spotlightMinimized: Boolean(
      src.spotlightMinimized ?? base.spotlightMinimized
    ),
    routesExpanded: Boolean(src.routesExpanded ?? base.routesExpanded),
    appsExpanded: Boolean(src.appsExpanded ?? base.appsExpanded),
    inboxExpanded: Boolean(src.inboxExpanded ?? base.inboxExpanded),
    trustExpanded: Boolean(src.trustExpanded ?? base.trustExpanded),
  };
}

function getFocusCommitmentStatus(
  item: FocusCommitment
): FocusCommitmentStatus {
  if (item.completedAt) return "completed";

  const target = Number(item.targetValue || 0);
  const current = Number(item.currentValue || 0);
  const dueIn = daysUntil(item.dueDate);
  const reviewIn = daysUntil(item.nextCheckInDate);

  if (target > 0 && current >= target) return "completed";
  if (dueIn !== null && dueIn < 0) return "behind";
  if (reviewIn !== null && reviewIn < 0) return "behind";
  if ((dueIn !== null && dueIn <= 7) || (reviewIn !== null && reviewIn <= 3)) {
    return "watch";
  }

  return "onTrack";
}

function focusStatusMeta(status: FocusCommitmentStatus) {
  if (status === "completed") {
    return {
      label: "Completed",
      bg: "#F3FBF5",
      border: "1px solid rgba(34,197,94,0.16)",
      text: "#166534",
    };
  }

  if (status === "behind") {
    return {
      label: "Behind",
      bg: "#FFF5F5",
      border: "1px solid rgba(239,68,68,0.16)",
      text: "#991B1B",
    };
  }

  if (status === "watch") {
    return {
      label: "Watch",
      bg: "#FFFBEF",
      border: "1px solid rgba(245,158,11,0.16)",
      text: "#92400E",
    };
  }

  return {
    label: "On track",
    bg: "#F3FBF5",
    border: "1px solid rgba(34,197,94,0.16)",
    text: "#166534",
  };
}

function buildMostUsedAppFallback(params: {
  userClass: UserOperationalClass;
  myShopLink: string;
}): AppUseRecord[] {
  const catalog: Record<string, AppUseRecord> = {
    community: {
      key: "community",
      label: "Community",
      detail: "Your community page.",
      to: DASHBOARD_TARGETS.COMMUNITY,
      count: 0,
      lastOpenedAt: "",
    },
    marketplace: {
      key: "marketplace",
      label: "Marketplace",
      detail: "Your community marketplace page.",
      to: DASHBOARD_TARGETS.MARKETPLACE,
      count: 0,
      lastOpenedAt: "",
    },
    finance: {
      key: "finance",
      label: "Finance",
      detail: "Pool, locks, support, and money events.",
      to: DASHBOARD_TARGETS.FINANCE,
      count: 0,
      lastOpenedAt: "",
    },
    support: {
      key: "support",
      label: "Loans & Support",
      detail: "Loans, readiness, suggestions, workbench, and support paths.",
      to: DASHBOARD_TARGETS.LOANS,
      count: 0,
      lastOpenedAt: "",
    },
    "money-in": {
      key: "money-in",
      label: "Money In",
      detail: "Add money into the pool path.",
      to: DASHBOARD_TARGETS.MONEY_IN,
      count: 0,
      lastOpenedAt: "",
    },
    "money-out": {
      key: "money-out",
      label: "Money Out",
      detail: "Open the clean money-out route.",
      to: DASHBOARD_TARGETS.MONEY_OUT,
      count: 0,
      lastOpenedAt: "",
    },
    notifications: {
      key: "notifications",
      label: "What Matters Now",
      detail: "Organised live actions and next priorities.",
      to: DASHBOARD_TARGETS.WHAT_MATTERS_NOW,
      count: 0,
      lastOpenedAt: "",
    },
    shop: {
      key: "shop",
      label: "Shop",
      detail: "Your public trade page.",
      to: params.myShopLink,
      count: 0,
      lastOpenedAt: "",
    },
    trust: {
      key: "trust",
      label: "Trust",
      detail: "Read trust movement and repair paths.",
      to: DASHBOARD_TARGETS.TRUST,
      count: 0,
      lastOpenedAt: "",
    },
    cci: {
      key: "cci",
      label: "CCI",
      detail: "Cross-community integrity reading.",
      to: DASHBOARD_TARGETS.CCI,
      count: 0,
      lastOpenedAt: "",
    },
    "trust-slip": {
      key: "trust-slip",
      label: "TrustSlip",
      detail: "Portable verification for merchants and institutions.",
      to: DASHBOARD_TARGETS.TRUST_SLIP,
      count: 0,
      lastOpenedAt: "",
    },
    "demand-box": {
      key: "demand-box",
      label: "Demand Box",
      detail: "Your demand page.",
      to: DASHBOARD_TARGETS.DEMAND_BOX,
      count: 0,
      lastOpenedAt: "",
    },
    guide: {
      key: "guide",
      label: "My GSN and I",
      detail: "Plain-language guide and settings path.",
      to: DASHBOARD_TARGETS.GUIDE,
      count: 0,
      lastOpenedAt: "",
    },
  };

  const order =
    params.userClass === "repair"
      ? [
          "trust",
          "cci",
          "notifications",
          "support",
          "trust-slip",
          "community",
          "finance",
          "money-in",
          "money-out",
        ]
      : params.userClass === "approval"
      ? [
          "community",
          "notifications",
          "support",
          "trust",
          "finance",
          "marketplace",
          "money-in",
          "money-out",
          "guide",
        ]
      : params.userClass === "setup"
      ? [
          "trust-slip",
          "trust",
          "community",
          "support",
          "guide",
          "notifications",
          "finance",
          "marketplace",
          "money-in",
        ]
      : params.userClass === "demand"
      ? [
          "demand-box",
          "support",
          "marketplace",
          "notifications",
          "finance",
          "community",
          "money-in",
          "money-out",
          "shop",
        ]
      : params.userClass === "seller"
      ? [
          "shop",
          "marketplace",
          "support",
          "finance",
          "money-in",
          "money-out",
          "trust-slip",
          "notifications",
          "community",
        ]
      : [
          "notifications",
          "community",
          "marketplace",
          "support",
          "finance",
          "money-in",
          "money-out",
          "trust",
          "shop",
        ];

  return order.map((key) => catalog[key]).filter(Boolean);
}

function buildMostUsedAppRows(
  usage: AppUseRecord[],
  fallback: AppUseRecord[]
): AppUseRecord[] {
  const result: AppUseRecord[] = [];
  const seen = new Set<string>();

  for (const row of sortAppUsageRows(usage)) {
    if (seen.has(row.key)) continue;
    seen.add(row.key);
    result.push(row);
    if (result.length >= 8) return result;
  }

  for (const row of fallback) {
    if (seen.has(row.key)) continue;
    seen.add(row.key);
    result.push(row);
    if (result.length >= 8) return result;
  }

  return result.slice(0, 8);
}

function getUserOperationalClass(params: {
  openTrustTone: ReadingState["tone"];
  cciTone: ReadingState["tone"];
  trustSlipCode: string;
  pendingRequestsCount: number;
  demandItems: DemandItem[];
  activeSpotlight: SpotlightItem | null;
  gmfnId: string;
  dashboardNoticeSummary: DashboardNoticeSummary;
}): UserOperationalClass {
  if (params.openTrustTone === "red" || params.cciTone === "red") {
    return "repair";
  }

  if (params.pendingRequestsCount > 0) {
    return "approval";
  }

  if (!safeStr(params.trustSlipCode) || safeStr(params.gmfnId) === "Pending") {
    return "setup";
  }

  const urgentDemandCount = params.demandItems.filter(
    (item) => safeStr(item.urgency).toLowerCase() === "high"
  ).length;

  if (urgentDemandCount > 0 || params.dashboardNoticeSummary.counts.actNow > 0) {
    return "demand";
  }

  if (params.activeSpotlight || safeStr(params.gmfnId) !== "Pending") {
    return "seller";
  }

  return "steady";
}

function buildPriorityRoutes(params: {
  userClass: UserOperationalClass;
  selectedClanId: number;
  myShopLink: string;
  openTrustTone: ReadingState["tone"];
  pendingRequestsCount: number;
  demandItems: DemandItem[];
  dashboardNoticeSummary: DashboardNoticeSummary;
  trustSlipCode: string;
}): {
  title: string;
  detail: string;
  primaryRoute: IntelligentRoute;
  supportingRoutes: IntelligentRoute[];
} {
  const joinRequestsTo = params.selectedClanId
    ? `/app/community/${params.selectedClanId}/join-requests`
    : DASHBOARD_TARGETS.COMMUNITY;

  const urgentDemandCount = params.demandItems.filter(
    (item) => safeStr(item.urgency).toLowerCase() === "high"
  ).length;

  if (params.userClass === "repair") {
    const trustPrimary = params.openTrustTone === "red";

    return {
      title: "Fix trust first",
      detail:
        "Your current trust position is under pressure. Protect tomorrow’s options before chasing more visibility or movement.",
      primaryRoute: trustPrimary
        ? {
            key: "trust",
            label: "Open Trust",
            detail: "Review the trust pressure in your community.",
            to: DASHBOARD_TARGETS.TRUST,
            reason: "Trust pressure should be handled before new exposure.",
          }
        : {
            key: "cci",
            label: "Open CCI",
            detail: "Review the cross-community integrity pressure.",
            to: DASHBOARD_TARGETS.CCI,
            reason: "Integrity pressure should be handled before new exposure.",
          },
      supportingRoutes: [
        trustPrimary
          ? {
              key: "cci",
              label: "Open CCI",
              detail: "Review the cross-community integrity reading.",
              to: DASHBOARD_TARGETS.CCI,
            }
          : {
              key: "trust",
              label: "Open Trust",
              detail: "Read what is weakening trust now.",
              to: DASHBOARD_TARGETS.TRUST,
            },
        {
          key: "trust-slip",
          label: "Open TrustSlip",
          detail: "Check whether your verification record is ready.",
          to: DASHBOARD_TARGETS.TRUST_SLIP,
        },
        {
          key: "notifications",
          label: "Open What Matters Now",
          detail: "Review the actions waiting for you now.",
            to: DASHBOARD_TARGETS.WHAT_MATTERS_NOW,
          },
      ],
    };
  }

  if (params.userClass === "approval") {
    return {
      title: "Clear what others are waiting on",
      detail: `${params.pendingRequestsCount} join request${
        params.pendingRequestsCount === 1 ? "" : "s"
      } ${params.pendingRequestsCount === 1 ? "is" : "are"} waiting. Delay here slows movement for the whole community path.`,
      primaryRoute: {
        key: "join-requests",
        label: "Open Join Requests",
        detail: "Review pending community approvals directly.",
        to: joinRequestsTo,
        reason: "Highest-value response waiting on you right now.",
      },
      supportingRoutes: [
        {
          key: "community",
          label: "Open Community",
          detail: "Manage the wider operating room around membership.",
          to: DASHBOARD_TARGETS.COMMUNITY,
        },
        {
          key: "notifications",
          label: "Open What Matters Now",
          detail: "Keep the action queue clean.",
          to: DASHBOARD_TARGETS.WHAT_MATTERS_NOW,
        },
        {
          key: "trust",
          label: "Open Trust",
          detail: "Protect the credibility of your response discipline.",
          to: DASHBOARD_TARGETS.TRUST,
        },
      ],
    };
  }

  if (params.userClass === "setup") {
    return {
      title: "Complete the base operating setup",
      detail:
        "Identity, verification, and stable footing come before expansion. Finish the core setup cleanly.",
      primaryRoute: {
        key: "trust-slip",
        label: "Open TrustSlip",
        detail: safeStr(params.trustSlipCode)
          ? "Review your verification record."
          : "Complete your verification record.",
        to: DASHBOARD_TARGETS.TRUST_SLIP,
        reason: "A weak setup creates friction everywhere else.",
      },
      supportingRoutes: [
        {
          key: "trust",
          label: "Open Trust Passport",
          detail: "Understand the trust path clearly.",
          to: DASHBOARD_TARGETS.TRUST,
        },
        {
          key: "community",
          label: "Open Community",
          detail: "Stabilise your operating base.",
          to: DASHBOARD_TARGETS.COMMUNITY,
        },
        {
          key: "guide",
          label: "Open My GSN and I",
          detail: "Use the plain-language guide to complete the basics.",
          to: DASHBOARD_TARGETS.GUIDE,
        },
      ],
    };
  }

  if (params.userClass === "demand") {
    return {
      title: "Work the active signals while the window is open",
      detail:
        urgentDemandCount > 0
          ? `${urgentDemandCount} urgent demand signal${
              urgentDemandCount === 1 ? "" : "s"
            } need attention.`
          : `${params.dashboardNoticeSummary.counts.actNow} act-now signal${
              params.dashboardNoticeSummary.counts.actNow === 1 ? "" : "s"
            } are waiting in the queue.`,
      primaryRoute: {
        key: "demand-box",
        label: "Open Demand Box",
        detail: "Respond to visible need signals before they drift.",
        to: DASHBOARD_TARGETS.DEMAND_BOX,
        reason: "Opportunity and responsibility are both gathering here.",
      },
      supportingRoutes: [
        {
          key: "marketplace",
          label: "Open Marketplace",
          detail: "Match supply and demand with context.",
          to: DASHBOARD_TARGETS.MARKETPLACE,
        },
        {
          key: "finance",
          label: "Open Finance",
          detail: "Review money readiness and movement.",
          to: DASHBOARD_TARGETS.FINANCE,
        },
        {
          key: "notifications",
          label: "Open What Matters Now",
          detail: "Keep the action queue visible.",
          to: DASHBOARD_TARGETS.WHAT_MATTERS_NOW,
        },
      ],
    };
  }

  if (params.userClass === "seller") {
    return {
      title: "Use your trade pages deliberately",
      detail:
        "Your trust, shop, and marketplace presence should work together rather than compete for attention.",
      primaryRoute: {
        key: "shop",
        label: "Open Shop",
        detail: "Start from the seller page first.",
        to: params.myShopLink,
        reason: "Your trade page is the clearest value signal right now.",
      },
      supportingRoutes: [
        {
          key: "marketplace",
          label: "Open Marketplace",
          detail: "See wider movement around your goods and services.",
          to: DASHBOARD_TARGETS.MARKETPLACE,
        },
        {
          key: "trust-slip",
          label: "Open TrustSlip",
          detail: "Keep merchant verification ready.",
          to: DASHBOARD_TARGETS.TRUST_SLIP,
        },
        {
          key: "finance",
          label: "Open Finance",
          detail: "Connect visibility with money discipline.",
          to: DASHBOARD_TARGETS.FINANCE,
        },
      ],
    };
  }

  return {
    title: "Keep the system calm and well ordered",
    detail:
      "No major pressure is dominating the dashboard. Use the clean route and keep momentum disciplined.",
    primaryRoute: {
      key: "notifications",
      label: "Open What Matters Now",
      detail: "Review the organised queue first.",
      to: DASHBOARD_TARGETS.WHAT_MATTERS_NOW,
      reason: "The cleanest operating choice is to review the queue before branching.",
    },
    supportingRoutes: [
      {
        key: "community",
        label: "Open Community",
        detail: "Keep the operating room in shape.",
        to: DASHBOARD_TARGETS.COMMUNITY,
      },
      {
        key: "marketplace",
        label: "Open Marketplace",
        detail: "Watch visible opportunity.",
        to: DASHBOARD_TARGETS.MARKETPLACE,
      },
      {
        key: "finance",
        label: "Open Finance",
        detail: "Check money discipline and exposure.",
        to: DASHBOARD_TARGETS.FINANCE,
      },
    ],
  };
}

function summarizeFocusCommitments(
  commitments: FocusCommitment[],
  events: FocusCommitmentEvent[]
): FocusCommitmentSummary {
  const active = commitments
    .filter((item) => !item.archived && !item.completedAt)
    .sort((a, b) => {
      const aDays =
        daysUntil(a.nextCheckInDate) ?? daysUntil(a.dueDate) ?? 999999;
      const bDays =
        daysUntil(b.nextCheckInDate) ?? daysUntil(b.dueDate) ?? 999999;
      return aDays - bDays;
    })
    .slice(0, 2);

  let onTrackCount = 0;
  let watchCount = 0;
  let behindCount = 0;
  let completedCount = 0;

  for (const item of commitments.filter((row) => !row.archived)) {
    const status = getFocusCommitmentStatus(item);

    if (status === "completed") completedCount += 1;
    if (status === "onTrack") onTrackCount += 1;
    if (status === "watch") watchCount += 1;
    if (status === "behind") behindCount += 1;
  }

  const nextReview = active[0];

  const recentEvents = [...events]
    .sort((a, b) => safeStr(b.createdAt).localeCompare(safeStr(a.createdAt)))
    .slice(0, 8);

  const checkins = recentEvents.filter((row) => row.kind === "checkin").length;
  const milestones = recentEvents.filter((row) => row.kind === "milestone").length;
  const completions = recentEvents.filter((row) => row.kind === "complete").length;
  const replans = recentEvents.filter((row) => row.kind === "replan").length;
  const misses = recentEvents.filter(
    (row) => row.kind === "missed-reported"
  ).length;

  const disciplineLine =
    completions > 0
      ? `${completions} recent completion${
          completions === 1 ? "" : "s"
        } visible`
      : misses > 0 && checkins === 0 && milestones === 0
      ? "Discipline is under pressure and needs visible follow-through"
      : checkins > 0 || milestones > 0
      ? `${checkins + milestones} recent execution update${
          checkins + milestones === 1 ? "" : "s"
        } kept${
          replans > 0
            ? `, ${replans} honest replan${replans === 1 ? "" : "s"}`
            : ""
        }`
      : "No recent execution signal is visible yet";

  return {
    active,
    onTrackCount,
    watchCount,
    behindCount,
    completedCount,
    nextReviewLabel: nextReview
      ? `${nextReview.title} review ${
          daysUntil(nextReview.nextCheckInDate) === 0
            ? "today"
            : daysUntil(nextReview.nextCheckInDate) === 1
            ? "tomorrow"
            : `on ${formatDateLabel(nextReview.nextCheckInDate)}`
        }`
      : "",
    disciplineLine,
  };
}

function buildTrustJourneyModel(params: {
  openTrust: ReadingState;
  cci: ReadingState;
  trustSlipCode: string;
  trustExplainer: any;
  focusSummary: FocusCommitmentSummary;
}): TrustJourneyModel {
  const helps = [...(params.trustExplainer?.helps || [])]
    .slice(0, 2)
    .map((item: string) => safeStr(item))
    .filter(Boolean);

  const weakens = [...(params.trustExplainer?.weakens || [])]
    .slice(0, 2)
    .map((item: string) => safeStr(item))
    .filter(Boolean);

  if (!safeStr(params.trustSlipCode)) {
    return {
      tone: "neutral",
      posture: "unverified",
      postureTitle: "Finish your trust record first",
      postureDetail:
        "Your verification is still not complete. Finish it before you expect stronger trust.",
      primaryRoute: {
        key: "trust-slip",
        label: "Open TrustSlip",
        detail: "Finish the missing verification step.",
        to: DASHBOARD_TARGETS.TRUST_SLIP,
      },
      secondaryRoute: {
        key: "trust",
        label: "Open Trust Passport",
        detail: "See the trust path in a simpler view.",
        to: DASHBOARD_TARGETS.TRUST,
      },
      helps,
      weakens,
      commitmentLine: params.focusSummary.disciplineLine,
    };
  }

  if (params.openTrust.tone === "red" || params.cci.tone === "red") {
    return {
      tone: "red",
      posture: "repair",
      postureTitle: "Fix this trust issue now",
      postureDetail:
        "Something is hurting trust right now. Fix it before you grow, ask for support, or open up to more people.",
      primaryRoute:
        params.openTrust.tone === "red"
          ? {
              key: "trust",
              label: "Open Trust",
              detail: "See what is hurting trust in your community.",
              to: DASHBOARD_TARGETS.TRUST,
            }
          : {
              key: "cci",
              label: "Open CCI",
              detail: "See what is hurting trust outside your community.",
              to: DASHBOARD_TARGETS.CCI,
            },
      secondaryRoute: {
        key: "notifications",
        label: "Open What Matters Now",
        detail: "Check the next item waiting for your action.",
        to: DASHBOARD_TARGETS.WHAT_MATTERS_NOW,
      },
      helps,
      weakens: [
        ...weakens,
        params.focusSummary.behindCount > 0
          ? `${params.focusSummary.behindCount} focus commitment${
              params.focusSummary.behindCount === 1 ? "" : "s"
            } behind`
          : "",
      ].filter(Boolean),
      commitmentLine: params.focusSummary.disciplineLine,
    };
  }

  if (
    params.openTrust.tone === "yellow" ||
    params.cci.tone === "yellow" ||
    params.focusSummary.behindCount > 0
  ) {
    return {
      tone: "yellow",
      posture: "drifting",
      postureTitle: "Trust is starting to slip",
      postureDetail:
        "You can still fix this early. Do not leave it until it becomes a bigger problem.",
      primaryRoute: {
        key: "trust",
        label: "Review Trust",
        detail: "See what is starting to weaken trust.",
        to: DASHBOARD_TARGETS.TRUST,
      },
      secondaryRoute: {
        key: "cci",
        label: "Review CCI",
        detail: "Check the wider trust picture.",
        to: DASHBOARD_TARGETS.CCI,
      },
      helps,
      weakens: [
        ...weakens,
        params.focusSummary.behindCount > 0
          ? `${params.focusSummary.behindCount} focus commitment${
              params.focusSummary.behindCount === 1 ? "" : "s"
            } need visible correction`
          : "",
      ].filter(Boolean),
      commitmentLine: params.focusSummary.disciplineLine,
    };
  }

  if (
    params.focusSummary.onTrackCount > 0 ||
    params.focusSummary.completedCount > 0
  ) {
    return {
      tone: "green",
      posture: "strongPortable",
      postureTitle: "Trust is working well",
      postureDetail:
        "People can see your steady follow-through. Keep it that way.",
      primaryRoute: {
        key: "trust-slip",
        label: "Use TrustSlip",
        detail: "Keep your trust record ready to show.",
        to: DASHBOARD_TARGETS.TRUST_SLIP,
      },
      secondaryRoute: {
        key: "trust",
        label: "Open Trust",
        detail: "See what is helping trust.",
        to: DASHBOARD_TARGETS.TRUST,
      },
      helps: [
        ...helps,
        params.focusSummary.onTrackCount > 0
          ? `${params.focusSummary.onTrackCount} focus commitment${
              params.focusSummary.onTrackCount === 1 ? "" : "s"
            } on track`
          : "",
        params.focusSummary.completedCount > 0
          ? `${params.focusSummary.completedCount} commitment${
              params.focusSummary.completedCount === 1 ? "" : "s"
            } completed`
          : "",
      ].filter(Boolean),
      weakens,
      commitmentLine: params.focusSummary.disciplineLine,
    };
  }

  return {
    tone: "green",
    posture: "stableProtected",
    postureTitle: "Trust is steady",
    postureDetail:
      "Nothing serious is wrong now. Keep answering people and keeping your word.",
    primaryRoute: {
      key: "trust",
      label: "Open Trust",
      detail: "Check your current trust path.",
      to: DASHBOARD_TARGETS.TRUST,
    },
    secondaryRoute: {
      key: "notifications",
      label: "Open What Matters Now",
      detail: "Check your organised list before branching out.",
      to: DASHBOARD_TARGETS.WHAT_MATTERS_NOW,
    },
    helps,
    weakens,
    commitmentLine: params.focusSummary.disciplineLine,
  };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedClanId = Number(getSelectedClanId() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [uiState, setUiState] = useState<DashboardUIState>(() =>
    normalizeDashboardUIState(
      readLocalJSON(DASHBOARD_UI_STORAGE_KEY, defaultDashboardUIState())
    )
  );

  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [trustSlip, setTrustSlip] = useState<any>(null);
  const [insight, setInsight] = useState<any>(null);

  const [guidance, setGuidance] = useState<GuidanceSnapshot | null>(null);
  const [guidanceLoading, setGuidanceLoading] = useState<boolean>(false);
  const [guidanceError, setGuidanceError] = useState<string>("");

  const [spotlights, setSpotlights] = useState<SpotlightItem[]>([]);
  const [spotlightLoading, setSpotlightLoading] = useState<boolean>(false);
  const [spotlightIndex, setSpotlightIndex] = useState<number>(0);
  const [latestSpotlightSnapshot, setLatestSpotlightSnapshot] =
    useState<SpotlightItem | null>(null);

  const [pendingRequests, setPendingRequests] = useState<JoinRequestItem[]>([]);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [noticesLoading, setNoticesLoading] = useState<boolean>(false);
  const [noticeSourceOpenKey, setNoticeSourceOpenKey] = useState<string>("");

  const [demandItems, setDemandItems] = useState<DemandItem[]>([]);
  const [demandPanelOpenKey, setDemandPanelOpenKey] = useState<string>("");

  const [marketWisdomIndex, setMarketWisdomIndex] = useState<number>(0);
  const [marketWisdomSignalIndex, setMarketWisdomSignalIndex] =
    useState<number>(0);
  const [marketWisdomSignalsOpen, setMarketWisdomSignalsOpen] =
    useState<boolean>(false);
  const [activeWisdom, setActiveWisdom] = useState<MarketWisdomPair | null>(
    null
  );
  const [qrReady, setQrReady] = useState<boolean>(false);
  const [qrFailed, setQrFailed] = useState<boolean>(false);
  const [sellerIdentityDockOpen, setSellerIdentityDockOpen] =
    useState<boolean>(true);

  const [avatarSrc, setAvatarSrc] = useState<string>("");
  const [pictureOptionsOpen, setPictureOptionsOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [appUsage] = useState<AppUseRecord[]>(() => readDashboardAppUsage());
  const [focusCommitments, setFocusCommitments] = useState<FocusCommitment[]>(
    () => readLocalJSON(DASHBOARD_FOCUS_COMMITMENTS_STORAGE_KEY, [])
  );
  const [focusEvents, setFocusEvents] = useState<FocusCommitmentEvent[]>(() =>
    readLocalJSON(DASHBOARD_FOCUS_EVENTS_STORAGE_KEY, [])
  );
  const [focusComposerOpen, setFocusComposerOpen] = useState<boolean>(false);
  const [focusDraft, setFocusDraft] = useState<FocusCommitmentDraft>(() =>
    defaultFocusCommitmentDraft()
  );
  const [focusProgressDrafts, setFocusProgressDrafts] = useState<
    Record<string, string>
  >({});
  const [attentionState, setAttentionState] = useState(() =>
    normalizeDashboardAttentionStoredState(
      readLocalJSON(
        DASHBOARD_ATTENTION_STORAGE_KEY,
        defaultDashboardAttentionStoredState()
      )
    )
  );
  const [attentionPopupVisible, setAttentionPopupVisible] =
    useState<boolean>(false);
  const [attentionClockMs, setAttentionClockMs] = useState<number>(() =>
    Date.now()
  );
  const [dashboardInteractionShieldVisible, setDashboardInteractionShieldVisible] =
    useState<boolean>(false);
  const dashboardInteractionShieldTimerRef = useRef<number | null>(null);

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
    return () => {
      if (
        typeof window !== "undefined" &&
        dashboardInteractionShieldTimerRef.current !== null
      ) {
        window.clearTimeout(dashboardInteractionShieldTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    writeLocalJSON(DASHBOARD_UI_STORAGE_KEY, uiState);
  }, [uiState]);

  useEffect(() => {
    writeLocalJSON(DASHBOARD_FOCUS_COMMITMENTS_STORAGE_KEY, focusCommitments);
  }, [focusCommitments]);

  useEffect(() => {
    writeLocalJSON(DASHBOARD_FOCUS_EVENTS_STORAGE_KEY, focusEvents);
  }, [focusEvents]);

  useEffect(() => {
    writeLocalJSON(DASHBOARD_ATTENTION_STORAGE_KEY, attentionState);
  }, [attentionState]);

  useEffect(() => {
    setAvatarSrc(readStoredImage(DASHBOARD_AVATAR_STORAGE_KEY));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function refreshAttentionClock() {
      setAttentionClockMs(Date.now());
    }

    refreshAttentionClock();

    const timer = window.setInterval(refreshAttentionClock, 60000);
    window.addEventListener("focus", refreshAttentionClock);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshAttentionClock);
    };
  }, []);

  useEffect(() => {
    setQrReady(false);
    setQrFailed(false);
  }, [trustSlip?.code]);

  useEffect(() => {
    (async () => {
      const [meRes, clanRes, trustSlipRes, insightRes] = await Promise.all([
        getMe().catch(() => null),
        getCurrentClan().catch(() => null),
        getMyTrustSlip().catch(() => null),
        getDailyInsight().catch(() => null),
      ]);

      setMe(meRes);
      setCurrentClan(clanRes);
      setTrustSlip(trustSlipRes);
      setInsight(insightRes);
    })();
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      setGuidanceLoading(true);
      setGuidanceError("");

      try {
        const snapshot = await buildGuidanceSnapshot();
        if (!alive) return;
        setGuidance(snapshot);
      } catch (err: any) {
        if (!alive) return;
        setGuidanceError(
          safeStr(err?.message) ||
            "Guided dashboard focus could not be prepared right now."
        );
      } finally {
        if (alive) {
          setGuidanceLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedClanId]);

  useEffect(() => {
    let alive = true;

    async function refreshSpotlights() {
      if (!alive) return;
      setSpotlightLoading(true);

      try {
        const res = await getMarketplaceBroadcasts({
          active_only: true,
          limit: 20,
        });

        if (!alive) return;

        const items: SpotlightItem[] = Array.isArray(res)
          ? res
          : Array.isArray((res as any)?.items)
          ? (res as any).items
          : [];

        setSpotlights(items);

        if (items.length > 0) {
          setLatestSpotlightSnapshot(items[0] || null);
          return;
        }

        const recentRes = await getMarketplaceBroadcasts({
          active_only: false,
          limit: 5,
        });

        if (!alive) return;

        const recentItems: SpotlightItem[] = Array.isArray(recentRes)
          ? recentRes
          : Array.isArray((recentRes as any)?.items)
          ? (recentRes as any).items
          : [];

        setLatestSpotlightSnapshot(recentItems[0] || null);
      } catch {
        // Keep the current spotlight state if the refresh fails temporarily.
      } finally {
        if (alive) {
          setSpotlightLoading(false);
        }
      }
    }

    void refreshSpotlights();

    function handleVisibilityRefresh() {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }

      void refreshSpotlights();
    }

    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleVisibilityRefresh);
    }

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityRefresh);
    }

    return () => {
      alive = false;

      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleVisibilityRefresh);
      }

      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityRefresh);
      }
    };
  }, [selectedClanId]);

  useEffect(() => {
    (async () => {
      if (!selectedClanId) {
        setPendingRequests([]);
        return;
      }

      try {
        const res = await getCommunityJoinRequests(selectedClanId).catch(() => ({
          items: [],
        }));

        const rows: JoinRequestItem[] = Array.isArray(res)
          ? res
          : Array.isArray((res as any)?.items)
          ? (res as any).items
          : [];

        const pending = rows.filter(
          (r) => String(r?.status || "").toLowerCase() === "pending"
        );

        setPendingRequests(pending);
      } catch {
        setPendingRequests([]);
      }
    })();
  }, [selectedClanId]);

  useEffect(() => {
    (async () => {
      setNoticesLoading(true);
      try {
        const res = await getMyNotifications(12, false).catch(() => ({
          items: [],
        }));

        const rows: NoticeItem[] = Array.isArray((res as any)?.items)
          ? (res as any).items
          : Array.isArray(res)
          ? res
          : [];

        setNotices(rows);
      } finally {
        setNoticesLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const rows = await listMarketplaceRequests({
        status: "open",
        mine_only: false,
        limit: 6,
      }).catch(() => []);

      setDemandItems(Array.isArray(rows) ? rows : []);
    })();
  }, []);

  useEffect(() => {
    if (spotlights.length <= 1) return;

    const timer = window.setInterval(() => {
      setSpotlightIndex((prev) => (prev + 1) % spotlights.length);
    }, 15000);

    return () => window.clearInterval(timer);
  }, [spotlights.length]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMarketWisdomIndex((prev) => prev + 1);
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  const activeSpotlight = useMemo(() => {
    if (spotlights.length === 0) return null;
    return spotlights[spotlightIndex % spotlights.length] || spotlights[0];
  }, [spotlights, spotlightIndex]);

  const cci = useMemo(() => getCciState(me), [me]);
  const openTrust = useMemo(
    () => getOpenTrustState(me, trustSlip, Boolean(selectedClanId)),
    [me, trustSlip, selectedClanId]
  );

  const cciTone = useMemo(() => toneStyles(cci.tone), [cci.tone]);
  const openTrustTone = useMemo(() => toneStyles(openTrust.tone), [openTrust.tone]);

  useEffect(() => {
    const hour = new Date().getHours();

    setActiveWisdom((prev) =>
      getSmartMarketWisdomPair({
        hour,
        unread: notices.filter((n) => !n?.is_read).length,
        pendingRequests: pendingRequests.length,
        hasSpotlight: Boolean(activeSpotlight),
        hasGmfnId: Boolean(me?.gmfn_id),
        trustTone: cci.tone,
        previousId: (prev as any)?.id,
      })
    );
  }, [
    marketWisdomIndex,
    notices,
    pendingRequests.length,
    activeSpotlight,
    me,
    cci.tone,
  ]);

  const greetingName = useMemo(() => resolveUserName(me), [me]);
  const profileSecondary = useMemo(() => resolveUserSecondary(me), [me]);
  const profileInitials = useMemo(
    () => initialsFromName(resolveUserName(me)),
    [me]
  );

  const gmfnId = safeStr(me?.gmfn_id || "Pending");
  const trustSlipCode = safeStr(trustSlip?.code || "");

  function trustGoldBtn(minHeight = 34, fontSize = 13): React.CSSProperties {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight,
      padding: "6px 10px",
      borderRadius: 11,
      border: "1px solid rgba(122,75,0,0.24)",
      background:
        "linear-gradient(180deg, #F6D77A 0%, #E1B948 48%, #C9971F 100%)",
      color: "#533300",
      fontWeight: 900,
      fontSize,
      textDecoration: "none",
      cursor: "pointer",
      whiteSpace: "normal",
      textAlign: "center",
      boxShadow:
        "inset 0 1px 0 rgba(255,248,220,0.9), inset 0 -2px 0 rgba(122,75,0,0.16), 0 7px 12px rgba(15,23,42,0.12)",
      letterSpacing: 0.08,
    };
  }

  function trustGoldMiniBtn(): React.CSSProperties {
    return {
      ...trustGoldBtn(24, 10),
      padding: "2px 7px",
      borderRadius: 8,
      minWidth: 84,
      boxShadow:
        "inset 0 1px 0 rgba(255,248,220,0.92), inset 0 -1px 0 rgba(122,75,0,0.14), 0 5px 10px rgba(15,23,42,0.10)",
    };
  }

  const merchantVerifyHref = useMemo(() => {
    const direct = firstNonEmpty(
      trustSlip?.public_verify_url,
      trustSlip?.verify_url
    );

    if (direct) {
      if (direct.startsWith("http://") || direct.startsWith("https://")) {
        return direct;
      }

      return `${apiOrigin()}${direct.startsWith("/") ? direct : `/${direct}`}`;
    }

    return trustSlipCode
      ? `${apiOrigin()}/trust-slips/verify/${encodeURIComponent(
          trustSlipCode
        )}/page`
      : "";
  }, [trustSlip, trustSlipCode]);

  const trustQrSrc = useMemo(
    () =>
      trustSlipCode
        ? `${apiOrigin()}/trust-slips/verify/${encodeURIComponent(
            trustSlipCode
          )}/qr.png`
        : "",
    [trustSlipCode]
  );

  const storedCommunitySpotlightImage = useMemo(() => {
    const spotlightClanId = positiveNumber(
      activeSpotlight?.source_clan_id || activeSpotlight?.clan_id || selectedClanId
    );

    return firstNonEmpty(
      getStoredCommunitySpotlightImage(spotlightClanId),
      getStoredCommunitySpotlightImage(selectedClanId)
    );
  }, [activeSpotlight, selectedClanId]);

  const spotlightImageSrc = safeStr(
    activeSpotlight?.image_url ||
      activeSpotlight?.image ||
      storedCommunitySpotlightImage ||
      ""
  );

  const spotlightImageCandidates = useMemo(
    () => buildResolvedSpotlightCandidates(spotlightImageSrc),
    [spotlightImageSrc]
  );
  const spotlightVideoSrc = safeStr(activeSpotlight?.video_url || "");
  const spotlightVideoCandidates = useMemo(
    () => buildResolvedSpotlightCandidates(spotlightVideoSrc),
    [spotlightVideoSrc]
  );
  const spotlightVideoCandidate = spotlightVideoCandidates[0] || "";
  const spotlightHasMedia =
    spotlightImageCandidates.length > 0 || Boolean(spotlightVideoCandidate);
  const spotlightExpiryStatus = useMemo(
    () => describeSpotlightExpiry(activeSpotlight),
    [activeSpotlight]
  );
  const latestSpotlightStatus = useMemo(
    () => describeSpotlightExpiry(latestSpotlightSnapshot),
    [latestSpotlightSnapshot]
  );

  const myShopLink = safeStr(me?.gmfn_id)
    ? `/app/shop/${encodeURIComponent(safeStr(me?.gmfn_id))}`
    : "/app/shop/me";

  const unreadCount = useMemo(
    () => notices.filter((n) => !n?.is_read).length,
    [notices]
  );

  const nextBestStep = (guidance as any)?.nextBestStep || null;
  const todayTomorrow = (guidance as any)?.todayTomorrow || null;
  const trustJourney = (guidance as any)?.trustJourneySummary || null;
  const trustExplainer = (guidance as any)?.trustChangeExplainer || null;
  const weeklyFocus = (guidance as any)?.weeklyFocus || null;
  const recoveryPath = (guidance as any)?.recoveryPath || null;
  const actionInbox = (guidance as any)?.actionInboxSummary || null;

  const focusSummary = useMemo(
    () => summarizeFocusCommitments(focusCommitments, focusEvents),
    [focusCommitments, focusEvents]
  );

  const dashboardNoticeSummary = useMemo<DashboardNoticeSummary>(() => {
    const items: DashboardNoticeItem[] = [];

    function pushItem(item: DashboardNoticeItem | null) {
      if (!item) return;
      items.push(item);
    }

    function makeItem(params: {
      id: string;
      title: string;
      detail: string;
      ctaLabel: string;
      ctaTo: string;
      unread?: boolean;
      source: string;
      bucket: "actNow" | "dueSoon" | "watch";
      scoreBoost?: number;
    }): DashboardNoticeItem {
      const unread = Boolean(params.unread);
      const normalizedTarget = normalizeActionTargetPath(params.ctaTo);

      return {
        id: params.id,
        title: safeStr(params.title || "Update"),
        detail: safeStr(
          params.detail || "Review this update and continue from the right page."
        ),
        ctaLabel: safeStr(params.ctaLabel || "Open"),
        ctaTo: normalizedTarget,
        unread,
        source: safeStr(params.source || "General"),
        bucket: params.bucket,
        score:
          dashboardNoticeScore(params.bucket, unread, params.source) +
          Number(params.scoreBoost || 0),
      };
    }

    for (const item of actionInbox?.actNow || []) {
      const text = [item.title, item.detail, item.kind, item.ctaLabel].join(" ");
      const source = dashboardNoticeSource(text, item.ctaTo);

      pushItem(
        makeItem({
          id: `guidance-act-${safeStr(item.id) || safeStr(item.title)}`,
          title: item.title,
          detail: item.detail,
          ctaLabel: item.ctaLabel,
          ctaTo: item.ctaTo,
          unread: item.unread,
          source,
          bucket: "actNow",
        })
      );
    }

    for (const item of actionInbox?.dueSoon || []) {
      const text = [item.title, item.detail, item.kind, item.ctaLabel].join(" ");
      const source = dashboardNoticeSource(text, item.ctaTo);

      pushItem(
        makeItem({
          id: `guidance-due-${safeStr(item.id) || safeStr(item.title)}`,
          title: item.title,
          detail: item.detail,
          ctaLabel: item.ctaLabel,
          ctaTo: item.ctaTo,
          unread: item.unread,
          source,
          bucket: "dueSoon",
        })
      );
    }

    for (const item of [
      ...(actionInbox?.watchAndWait || []),
      ...(actionInbox?.generalUpdates || []),
    ]) {
      const text = [item.title, item.detail, item.kind, item.ctaLabel].join(" ");
      const source = dashboardNoticeSource(text, item.ctaTo);

      pushItem(
        makeItem({
          id: `guidance-watch-${safeStr(item.id) || safeStr(item.title)}`,
          title: item.title,
          detail: item.detail,
          ctaLabel: item.ctaLabel,
          ctaTo: item.ctaTo,
          unread: item.unread,
          source,
          bucket: "watch",
        })
      );
    }

    for (const item of notices) {
      const title = safeStr(item.title || item.kind || "Update");
      const detail = safeStr(
        item.message || "Review this update and continue from the right page."
      );
      const ctaLabel = safeStr(item.action_label || "Open");
      const ctaTo = normalizeActionTargetPath(
        item.action_url || DASHBOARD_TARGETS.WHAT_MATTERS_NOW
      );
      const text = [title, detail, item.kind, ctaLabel].join(" ");
      const source = dashboardNoticeSource(text, ctaTo);
      const lower = text.toLowerCase();

      const bucket =
        source === "Join Links" ||
        source === "Community Voting" ||
        textContainsAny(lower, [
          "urgent",
          "act now",
          "waiting on you",
          "approve",
          "verify",
          "confirm",
          "complete now",
          "response required",
        ])
          ? "actNow"
          : source === "Demand Box" ||
            source === "Open Finance" ||
            source === "Support Path" ||
            source === "Trust Events" ||
            textContainsAny(lower, [
              "due",
              "soon",
              "reminder",
              "review",
              "pending",
              "follow up",
              "expiring",
            ])
          ? "dueSoon"
          : "watch";

      pushItem(
        makeItem({
          id: `raw-${safeStr(item.id) || title}`,
          title,
          detail,
          ctaLabel,
          ctaTo,
          unread: !item.is_read,
          source,
          bucket,
        })
      );
    }

    if (selectedClanId && pendingRequests.length > 0) {
      pushItem(
        makeItem({
          id: `synthetic-join-${selectedClanId}`,
          title: `${pendingRequests.length} join request${
            pendingRequests.length === 1 ? "" : "s"
          } waiting`,
          detail:
            "Community join links are active and approvals are still waiting. Open Join Requests to review them directly.",
          ctaLabel: "Open Join Requests",
          ctaTo: `/app/community/${selectedClanId}/join-requests`,
          source: "Join Links",
          bucket: "actNow",
          scoreBoost: 18,
        })
      );
    }

    if (demandItems.length > 0) {
      const urgentCount = demandItems.filter(
        (item) => safeStr(item.urgency).toLowerCase() === "high"
      ).length;

      pushItem(
        makeItem({
          id: "synthetic-demand-box",
          title:
            urgentCount > 0
              ? `${urgentCount} urgent demand signal${
                  urgentCount === 1 ? "" : "s"
                } visible`
              : `${demandItems.length} open demand signal${
                  demandItems.length === 1 ? "" : "s"
                } visible`,
          detail:
            urgentCount > 0
              ? "Urgent requests are active in Demand Box. Review the highest-pressure requests before they drift further."
              : "Open requests are active in Demand Box. Review what is moving and decide whether you need to respond.",
          ctaLabel: "Open Demand Box",
          ctaTo: DASHBOARD_TARGETS.DEMAND_BOX,
          source: "Demand Box",
          bucket: urgentCount > 0 ? "actNow" : "dueSoon",
          scoreBoost: urgentCount > 0 ? 14 : 8,
        })
      );
    }

    if (activeSpotlight) {
      pushItem(
        makeItem({
          id: `synthetic-spotlight-${safeStr(activeSpotlight.id || spotlightIndex)}`,
          title: safeStr(
            activeSpotlight.title ||
              activeSpotlight.message ||
              "Marketplace spotlight live"
          ),
          detail: safeStr(
            activeSpotlight.body ||
              activeSpotlight.message ||
              "Spotlight is live in the marketplace. Watch the visibility, demand, and trust signals around this seller."
          ),
          ctaLabel: "Open Marketplace",
          ctaTo: spotlightMarketplaceTo(activeSpotlight),
          source: "Spotlight Demand",
          bucket: "watch",
        })
      );
    }

    const trustNotice = buildDashboardTrustNoticeCopy({
      openTrust,
      cci,
      trustSlipCode,
      trustExplainer,
    });

    if (trustNotice) {
      pushItem(
        makeItem({
          id:
            trustNotice.bucket === "actNow"
              ? "synthetic-trust-risk"
              : "synthetic-trust-review",
          title: trustNotice.title,
          detail: trustNotice.detail,
          ctaLabel: trustNotice.ctaLabel,
          ctaTo:
            trustNotice.ctaRouteKey === "trust"
              ? DASHBOARD_TARGETS.TRUST
              : trustNotice.ctaRouteKey === "cci"
              ? DASHBOARD_TARGETS.CCI
              : DASHBOARD_TARGETS.TRUST_SLIP,
          source: "Trust Events",
          bucket: trustNotice.bucket,
          scoreBoost: trustNotice.bucket === "actNow" ? 16 : 10,
        })
      );
    }

    pushItem(
      makeItem({
        id: "synthetic-finance-review",
        title: "Finance record ready to review",
        detail:
          "Open Finance to review pool position, money-in events, money-out movement, locks, and support needs.",
        ctaLabel: "Open Finance",
        ctaTo: DASHBOARD_TARGETS.FINANCE,
        source: "Open Finance",
        bucket: "watch",
        scoreBoost: -10,
      })
    );

    if (focusSummary.behindCount > 0) {
      pushItem(
        makeItem({
          id: "synthetic-focus-behind",
          title: `${focusSummary.behindCount} focus commitment${
            focusSummary.behindCount === 1 ? "" : "s"
          } behind`,
          detail:
            "A focus checkpoint or due date has slipped. Open Focus Commitments to check in, replan honestly, or complete the target before execution discipline weakens further.",
          ctaLabel: "Open Focus Commitments",
          ctaTo: `${DASHBOARD_TARGETS.DASHBOARD}#focus-commitments`,
          source: "Focus Commitments",
          bucket: "actNow",
          scoreBoost: 14,
        })
      );
    } else if (focusSummary.watchCount > 0) {
      pushItem(
        makeItem({
          id: "synthetic-focus-watch",
          title: `${focusSummary.watchCount} focus commitment${
            focusSummary.watchCount === 1 ? "" : "s"
          } due for closer review`,
          detail: focusSummary.nextReviewLabel
            ? `${focusSummary.nextReviewLabel}. Keep the next checkpoint visible before it drifts into pressure.`
            : "Keep the next checkpoint visible before it drifts into pressure.",
          ctaLabel: "Review commitments",
          ctaTo: `${DASHBOARD_TARGETS.DASHBOARD}#focus-commitments`,
          source: "Focus Commitments",
          bucket: "dueSoon",
          scoreBoost: 10,
        })
      );
    } else if (focusSummary.active.length > 0) {
      pushItem(
        makeItem({
          id: "synthetic-focus-steady",
          title: "Focus commitments active",
          detail: focusSummary.nextReviewLabel
            ? `${focusSummary.nextReviewLabel}. ${focusSummary.disciplineLine}.`
            : focusSummary.disciplineLine,
          ctaLabel: "Open commitments",
          ctaTo: `${DASHBOARD_TARGETS.DASHBOARD}#focus-commitments`,
          source: "Focus Commitments",
          bucket: "watch",
          scoreBoost: 4,
        })
      );
    }

    const deduped = new Map<string, DashboardNoticeItem>();

    for (const item of items) {
      const key = [
        safeStr(item.title).toLowerCase(),
        safeStr(item.ctaTo).toLowerCase(),
        safeStr(item.source).toLowerCase(),
      ].join("|");

      const existing = deduped.get(key);

      if (!existing || item.score > existing.score) {
        deduped.set(key, item);
        continue;
      }

      if (existing && item.unread && !existing.unread) {
        deduped.set(key, {
          ...existing,
          unread: true,
          score: existing.score + 5,
        });
      }
    }

    const allRows = sortDashboardNoticeItems([...deduped.values()]);

    const actNow = allRows.filter((item) => item.bucket === "actNow");
    const dueSoon = allRows.filter((item) => item.bucket === "dueSoon");
    const watch = allRows.filter((item) => item.bucket === "watch");
    const unread = sortDashboardNoticeItems(
      allRows.filter((item) => item.unread)
    );

    return {
      allRows,
      actNow: actNow.slice(0, 3),
      dueSoon: dueSoon.slice(0, 3),
      watch: watch.slice(0, 3),
      unread: unread.slice(0, 3),
      counts: {
        actNow: actNow.length,
        dueSoon: dueSoon.length,
        watch: watch.length,
        unread: Math.max(unread.length, unreadCount),
      },
    };
  }, [
    actionInbox,
    notices,
    unreadCount,
    pendingRequests,
    demandItems,
    activeSpotlight,
    spotlightIndex,
    openTrust.tone,
    cci.tone,
    trustSlipCode,
    selectedClanId,
    focusSummary,
  ]);

  const dashboardNoticeSourceGroups = useMemo<DashboardNoticeSourceGroup[]>(() => {
    const grouped = new Map<string, DashboardNoticeItem[]>();

    for (const item of dashboardNoticeSummary.allRows) {
      const key = dashboardNoticeSourceKey(item.source);
      const bucket = grouped.get(key) || [];
      bucket.push(item);
      grouped.set(key, bucket);
    }

    return [...grouped.entries()]
      .map(([key, rows]) => {
        const sortedRows = sortDashboardNoticeItems(rows);
        const first = sortedRows[0] || null;
        const actNowCount = sortedRows.filter((item) => item.bucket === "actNow").length;
        const dueSoonCount = sortedRows.filter((item) => item.bucket === "dueSoon").length;
        const watchCount = sortedRows.filter((item) => item.bucket === "watch").length;
        const unreadCount = sortedRows.filter((item) => item.unread).length;
        const detailParts: string[] = [];
        const tone: DashboardNoticePreviewTone =
          actNowCount > 0
            ? "red"
            : dueSoonCount > 0
            ? "yellow"
            : watchCount > 0 || unreadCount > 0
            ? "blue"
            : "slate";

        if (actNowCount > 0) {
          detailParts.push(
            `${actNowCount} ${actNowCount === 1 ? "needs" : "need"} action now`
          );
        }

        if (dueSoonCount > 0) {
          detailParts.push(`${dueSoonCount} due soon`);
        }

        if (unreadCount > 0) {
          detailParts.push(`${unreadCount} unread`);
        }

        if (detailParts.length === 0) {
          detailParts.push(
            `${sortedRows.length} notification${sortedRows.length === 1 ? "" : "s"} ready`
          );
        }

        return {
          key: `source-${key}`,
          title: safeStr(first?.source || "General"),
          detail: detailParts.join(" • "),
          count: sortedRows.length,
          unreadCount,
          actNowCount,
          dueSoonCount,
          watchCount,
          to: first?.ctaTo || DASHBOARD_TARGETS.WHAT_MATTERS_NOW,
          ctaLabel:
            sortedRows.length === 1
              ? safeStr(first?.ctaLabel || "Open notification")
              : safeStr(first?.source || "General") === "General"
              ? "Open notifications"
              : `Open ${safeStr(first?.source || "screen")}`,
          tone,
          rows: sortedRows,
        };
      })
      .sort((a, b) => {
        const aScore =
          a.actNowCount * 100 +
          a.dueSoonCount * 60 +
          a.unreadCount * 20 +
          a.watchCount * 10 +
          a.count;
        const bScore =
          b.actNowCount * 100 +
          b.dueSoonCount * 60 +
          b.unreadCount * 20 +
          b.watchCount * 10 +
          b.count;

        if (bScore !== aScore) return bScore - aScore;
        return a.title.localeCompare(b.title);
      });
  }, [dashboardNoticeSummary]);

  const dashboardNoticeQuickGroups = useMemo<DashboardNoticeSourceGroup[]>(() => {
    const makeGroup = (
      key: DashboardNoticeQuickGroupKey,
      title: string,
      rows: DashboardNoticeItem[],
      tone: DashboardNoticePreviewTone,
      emptyDetail: string
    ): DashboardNoticeSourceGroup => {
      const sortedRows = sortDashboardNoticeItems(rows);
      const first = sortedRows[0] || null;
      const actNowCount = sortedRows.filter((item) => item.bucket === "actNow").length;
      const dueSoonCount = sortedRows.filter((item) => item.bucket === "dueSoon").length;
      const watchCount = sortedRows.filter((item) => item.bucket === "watch").length;
      const unreadCount = sortedRows.filter((item) => item.unread).length;

      return {
        key: `quick-${key}`,
        title,
        detail:
          sortedRows.length > 0
            ? first?.title ||
              `${sortedRows.length} notification${sortedRows.length === 1 ? "" : "s"} ready`
            : emptyDetail,
        count: sortedRows.length,
        unreadCount,
        actNowCount,
        dueSoonCount,
        watchCount,
        to: first?.ctaTo || DASHBOARD_TARGETS.WHAT_MATTERS_NOW,
        ctaLabel: first?.ctaLabel || "Open notifications",
        tone,
        rows: sortedRows,
      };
    };

    return [
      makeGroup(
        "act-now",
        "Act now",
        dashboardNoticeSummary.allRows.filter((item) => item.bucket === "actNow"),
        "red",
        "Nothing needs immediate action right now."
      ),
      makeGroup(
        "due-soon",
        "Due soon",
        dashboardNoticeSummary.allRows.filter((item) => item.bucket === "dueSoon"),
        "yellow",
        "Nothing important is drifting right now."
      ),
      makeGroup(
        "unread",
        "Unread",
        dashboardNoticeSummary.allRows.filter((item) => item.unread),
        "blue",
        "No unread notification is waiting right now."
      ),
    ].filter((group) => group.count > 0);
  }, [dashboardNoticeSummary]);

  const dashboardNoticePanels = useMemo(
    () => [...dashboardNoticeQuickGroups, ...dashboardNoticeSourceGroups],
    [dashboardNoticeQuickGroups, dashboardNoticeSourceGroups]
  );

  const dashboardNoticeTotalCount = useMemo(
    () =>
      dashboardNoticeSourceGroups.reduce((sum, group) => sum + group.count, 0),
    [dashboardNoticeSourceGroups]
  );

  const dashboardNoticeSummaryLine = useMemo(() => {
    if (dashboardNoticeTotalCount === 0) {
      return "No new notification is waiting right now.";
    }

    const visibleSources = dashboardNoticeSourceGroups
      .slice(0, 3)
      .map((group) => group.title);
    const moreSources = Math.max(dashboardNoticeSourceGroups.length - visibleSources.length, 0);
    const sourceLine =
      visibleSources.length === 1
        ? visibleSources[0]
        : visibleSources.length === 2
        ? `${visibleSources[0]} and ${visibleSources[1]}`
        : `${visibleSources.slice(0, -1).join(", ")}, and ${
            visibleSources[visibleSources.length - 1]
          }`;

    return `You have ${dashboardNoticeTotalCount} notification${
      dashboardNoticeTotalCount === 1 ? "" : "s"
    } from ${sourceLine}${
      moreSources > 0
        ? ` and ${moreSources} more place${moreSources === 1 ? "" : "s"}`
        : ""
    }.`;
  }, [dashboardNoticeSourceGroups, dashboardNoticeTotalCount]);

  useEffect(() => {
    if (!noticeSourceOpenKey) return;

    const currentStillExists = dashboardNoticePanels.some(
      (group) => group.key === noticeSourceOpenKey
    );

    if (!currentStillExists) {
      setNoticeSourceOpenKey("");
    }
  }, [dashboardNoticePanels, noticeSourceOpenKey]);

  const dashboardNoticeSelectedPanel = useMemo(
    () =>
      dashboardNoticePanels.find((group) => group.key === noticeSourceOpenKey) ||
      null,
    [dashboardNoticePanels, noticeSourceOpenKey]
  );

  const dashboardNoticeSourceTitles = useMemo(
    () => dashboardNoticeSourceGroups.map((group) => safeStr(group.title)).filter(Boolean),
    [dashboardNoticeSourceGroups]
  );

  const urgentDemandItems = useMemo(
    () =>
      demandItems.filter(
        (item) => safeStr(item.urgency).toLowerCase() === "high"
      ),
    [demandItems]
  );

  const currentDemandItem = demandItems[0] || null;

  const demandSummaryLine = useMemo(() => {
    if (demandItems.length === 0) {
      return "No open demand request is waiting right now.";
    }

    if (urgentDemandItems.length > 0) {
      return `You have ${demandItems.length} demand request${
        demandItems.length === 1 ? "" : "s"
      }. ${urgentDemandItems.length} need attention now.`;
    }

    return `You have ${demandItems.length} demand request${
      demandItems.length === 1 ? "" : "s"
    } waiting now.`;
  }, [demandItems, urgentDemandItems]);

  const demandSummarySubline = useMemo(() => {
    if (currentDemandItem) {
      return `${currentCommunityName(
        currentClan,
        selectedClanId
      )}${safeDateTime(currentDemandItem.created_at) ? `, ${safeDateTime(currentDemandItem.created_at)}` : ""}`;
    }

    return `${currentCommunityName(
      currentClan,
      selectedClanId
    )}. Open Demand Box when you want to create or review demand.`;
  }, [currentClan, currentDemandItem, selectedClanId]);

  const demandDetailPanels = useMemo<DemandDetailPanel[]>(() => {
    const panels: DemandDetailPanel[] = [];
    const hasMultipleDemandItems = demandItems.length > 1;
    const currentDemandIsUrgent =
      safeStr(currentDemandItem?.urgency).toLowerCase() === "high";

    if (hasMultipleDemandItems) {
      panels.push({
        key: "open-requests",
        chipLabel: `Open requests ${demandItems.length}`,
        title:
          `${demandItems.length} open requests are waiting`,
        detail:
          urgentDemandItems.length > 0
            ? "Start with the request that is already under pressure."
            : "Open the live queue and review what needs response first.",
        to: DASHBOARD_TARGETS.DEMAND_BOX,
        ctaLabel: "Open Demand Box",
        tone: urgentDemandItems.length > 0 ? "red" : "blue",
        items: demandItems.slice(0, 2),
      });
    }

    if (demandItems.length > 0) {
      panels.push({
        key: "current-request",
        chipLabel:
          demandItems.length === 1
            ? currentDemandIsUrgent
              ? "Needs attention"
              : "Request"
            : "Current request",
        title: safeStr(currentDemandItem?.title || "Current request"),
        detail: safeStr(
          currentDemandItem?.description ||
            "Open Demand Box to read the full request and decide the next move."
        ),
        to: DASHBOARD_TARGETS.DEMAND_BOX,
        ctaLabel: "Open current request",
        tone:
          safeStr(currentDemandItem?.urgency).toLowerCase() === "high"
            ? "red"
            : "blue",
        items: currentDemandItem ? [currentDemandItem] : [],
      });
    }

    if (
      urgentDemandItems.length > 0 &&
      (urgentDemandItems.length > 1 || hasMultipleDemandItems || !currentDemandIsUrgent)
    ) {
      panels.push({
        key: "urgent",
        chipLabel: `Urgent ${urgentDemandItems.length}`,
        title:
          urgentDemandItems.length === 1
            ? "1 urgent demand needs review"
            : `${urgentDemandItems.length} urgent demands need review`,
        detail: "Urgent demand should be checked before it drifts further.",
        to: DASHBOARD_TARGETS.DEMAND_BOX,
        ctaLabel: "Review urgent demand",
        tone: "red",
        items: urgentDemandItems.slice(0, 2),
      });
    }

    if (demandItems.length === 0) {
      panels.push({
        key: "create-demand",
        chipLabel: "Create demand",
        title: "No open demand is waiting",
        detail:
          "Create a demand when a member or seller needs the community to respond.",
        to: "/app/demand-box#demand-box-create",
        ctaLabel: "Create demand",
        tone: "slate",
        items: [],
      });
    }

    return panels;
  }, [currentDemandItem, demandItems, urgentDemandItems]);

  useEffect(() => {
    if (!demandPanelOpenKey) return;

    const currentStillExists = demandDetailPanels.some(
      (panel) => panel.key === demandPanelOpenKey
    );

    if (!currentStillExists) {
      setDemandPanelOpenKey("");
    }
  }, [demandDetailPanels, demandPanelOpenKey]);

  const selectedDemandPanel = useMemo(
    () =>
      demandDetailPanels.find((panel) => panel.key === demandPanelOpenKey) ||
      null,
    [demandDetailPanels, demandPanelOpenKey]
  );

  const demandSurfaceChrome = useMemo(() => {
    if (urgentDemandItems.length > 0) {
      return {
        shellBg:
          "radial-gradient(circle at top left, rgba(245,158,11,0.14) 0%, rgba(245,158,11,0.00) 24%), linear-gradient(180deg, #F7FBFF 0%, #EEF5FF 52%, #E4EEF9 100%)",
        shellBorder: "1px solid rgba(11,99,209,0.12)",
        accent:
          "linear-gradient(90deg, #0B63D1 0%, #3B82F6 54%, #F59E0B 100%)",
        leadBg:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(243,248,255,0.97) 52%, rgba(227,237,248,0.95) 100%)",
        leadBorder: "1px solid rgba(11,99,209,0.12)",
        leadShadow:
          "0 16px 34px rgba(11,99,209,0.08), inset 0 1px 0 rgba(255,255,255,0.82)",
        statusBg: "rgba(245,158,11,0.14)",
        statusText: "#9A4D04",
        chipBg:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,249,255,0.96) 100%)",
        chipBorder: "1px solid rgba(15,59,116,0.10)",
        chipSelectedBg:
          "linear-gradient(180deg, rgba(230,239,252,1.00) 0%, rgba(210,225,244,0.98) 100%)",
        chipSelectedBorder: "1px solid rgba(11,99,209,0.22)",
        detailBg:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,250,255,0.96) 100%)",
        detailBorder: "1px solid rgba(11,99,209,0.12)",
        itemBg:
          "linear-gradient(180deg, rgba(252,254,255,0.98) 0%, rgba(242,247,253,0.96) 100%)",
        itemBorder: "1px solid rgba(15,59,116,0.10)",
      };
    }

    if (demandItems.length > 0) {
      return {
        shellBg:
          "radial-gradient(circle at top left, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.00) 26%), linear-gradient(180deg, #F8FBFF 0%, #F1F7FF 52%, #E7F0FB 100%)",
        shellBorder: "1px solid rgba(11,99,209,0.12)",
        accent:
          "linear-gradient(90deg, #0B63D1 0%, #60A5FA 60%, #93C5FD 100%)",
        leadBg:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,249,255,0.97) 52%, rgba(232,240,250,0.95) 100%)",
        leadBorder: "1px solid rgba(11,99,209,0.12)",
        leadShadow:
          "0 16px 34px rgba(11,99,209,0.07), inset 0 1px 0 rgba(255,255,255,0.84)",
        statusBg: "rgba(11,99,209,0.10)",
        statusText: "#0B63D1",
        chipBg:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,250,255,0.96) 100%)",
        chipBorder: "1px solid rgba(15,59,116,0.10)",
        chipSelectedBg:
          "linear-gradient(180deg, rgba(226,238,255,0.98) 0%, rgba(212,226,246,0.96) 100%)",
        chipSelectedBorder: "1px solid rgba(11,99,209,0.22)",
        detailBg:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,251,255,0.96) 100%)",
        detailBorder: "1px solid rgba(11,99,209,0.12)",
        itemBg:
          "linear-gradient(180deg, rgba(252,254,255,0.98) 0%, rgba(245,249,255,0.96) 100%)",
        itemBorder: "1px solid rgba(15,59,116,0.10)",
      };
    }

    return {
      shellBg:
        "radial-gradient(circle at top left, rgba(148,163,184,0.10) 0%, rgba(148,163,184,0.00) 26%), linear-gradient(180deg, #F8FBFF 0%, #F4F8FD 52%, #EEF4FB 100%)",
      shellBorder: "1px solid rgba(148,163,184,0.14)",
      accent:
        "linear-gradient(90deg, #64748B 0%, #94A3B8 58%, #CBD5E1 100%)",
      leadBg:
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.97) 52%, rgba(237,242,247,0.95) 100%)",
      leadBorder: "1px solid rgba(148,163,184,0.14)",
      leadShadow:
        "0 14px 30px rgba(10,24,49,0.05), inset 0 1px 0 rgba(255,255,255,0.84)",
      statusBg: "rgba(148,163,184,0.14)",
      statusText: "#475569",
      chipBg:
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 100%)",
      chipBorder: "1px solid rgba(148,163,184,0.14)",
      chipSelectedBg:
        "linear-gradient(180deg, rgba(237,242,247,0.98) 0%, rgba(226,232,240,0.96) 100%)",
      chipSelectedBorder: "1px solid rgba(148,163,184,0.20)",
      detailBg:
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,250,251,0.96) 100%)",
      detailBorder: "1px solid rgba(148,163,184,0.14)",
      itemBg:
        "linear-gradient(180deg, rgba(252,253,255,0.98) 0%, rgba(246,248,251,0.96) 100%)",
      itemBorder: "1px solid rgba(148,163,184,0.14)",
    };
  }, [demandItems.length, urgentDemandItems.length]);

  const activeWisdomCapability = safeStr((activeWisdom as any)?.capability || "");
  const activeWisdomTitle = safeStr((activeWisdom as any)?.title || "");

  const signalText = safeStr(
    (activeWisdom as any)?.proverb ||
      (guidance as any)?.marketWisdomCard?.text ||
      (insight as any)?.text ||
      "Stay visible, stay trustworthy, and move one clear step at a time."
  );

  const signalSupport = safeStr(
    (activeWisdom as any)?.gmfn ||
      (!activeWisdom && (guidance as any)?.marketWisdomCard?.title
        ? (guidance as any).marketWisdomCard.title
        : "")
  );

  const activeWisdomCategory = safeStr((activeWisdom as any)?.category || "");
  const activeWisdomGuideCapability = useMemo(() => {
    const seed = [
      activeWisdomTitle,
      activeWisdomCategory,
      activeSpotlight?.id,
      urgentDemandItems.length,
      demandItems.length,
      pendingRequests.length,
      dashboardNoticeSummary.counts.unread,
      openTrust.tone,
      cci.tone,
    ].join("|");

    return (
      getGmfnCapability(activeWisdomCapability) ||
      getFeaturedGmfnCapability(seed)
    );
  }, [
    activeSpotlight?.id,
    activeWisdomCapability,
    activeWisdomCategory,
    activeWisdomTitle,
    cci.tone,
    dashboardNoticeSummary.counts.unread,
    demandItems.length,
    openTrust.tone,
    pendingRequests.length,
    urgentDemandItems.length,
  ]);

  const activeWisdomCategoryLabel = useMemo(() => {
    switch (activeWisdomCategory) {
      case "trade":
        return "Trade";
      case "visibility":
        return "Visibility";
      case "finance":
        return "Finance";
      case "support":
        return "Support";
      case "community":
        return "Community";
      case "identity":
        return "Identity";
      case "work":
        return "Work";
      case "operating":
        return "Operating";
      default:
        return "Market";
    }
  }, [activeWisdomCategory]);

  const marketWisdomNowLine = useMemo(() => {
    if (activeSpotlight) {
      return "Spotlight is live. Check seller trust before the next move.";
    }

    if (urgentDemandItems.length > 0) {
      return "Urgent demand is live. Check timing and response now.";
    }

    if (demandItems.length > 0) {
      return "Demand Box is active. Read the current need before you act.";
    }

    if (pendingRequests.length > 0) {
      return "Support requests are waiting. Review and respond when ready.";
    }

    if (dashboardNoticeSummary.counts.unread > 0) {
      return "New signals are waiting. Open the screen that needs you next.";
    }

    if (openTrust.tone === "red" || cci.tone === "red") {
      return "Trust is under pressure. Read risk before the next move.";
    }

    if (openTrust.tone === "yellow" || cci.tone === "yellow") {
      return "Trust needs steadier handling today. Move with care.";
    }

    switch (activeWisdomCategory) {
      case "trade":
        return "Use this before trade, pricing, or the next seller decision.";
      case "visibility":
        return "Use this before spotlight, display, or seller-reach decisions.";
      case "finance":
        return "Use this before contribution, borrowing, or repayment decisions.";
      case "support":
        return "Use this before helping, approving, or reviewing another member.";
      case "community":
        return "Use this before a wider group decision or a shared next step.";
      case "identity":
        return "Use this before trust, access, or verification decisions.";
      case "work":
        return "Use this before offering service, hiring, or taking on the next task.";
      default:
        return "Use this to steady the next move before you act.";
    }
  }, [
    activeSpotlight,
    activeWisdomCategory,
    cci.tone,
    dashboardNoticeSummary.counts.unread,
    demandItems.length,
    openTrust.tone,
    pendingRequests.length,
    urgentDemandItems.length,
  ]);

  const marketWisdomGuideLine = useMemo(() => {
    const seed = [
      activeWisdomTitle,
      activeWisdomCategory,
      activeSpotlight?.id,
      urgentDemandItems.length,
      demandItems.length,
      pendingRequests.length,
      dashboardNoticeSummary.counts.unread,
      openTrust.tone,
      cci.tone,
    ].join("|");
    const guideLine = getGmfnCapabilityGuideLine(
      activeWisdomGuideCapability?.id,
      seed
    );

    if (activeWisdomGuideCapability) {
      return `${activeWisdomGuideCapability.title}: ${guideLine}`;
    }

    return `My GSN and I keeps the ${GMFN_CAPABILITY_COUNT} core capabilities visible behind this reading.`;
  }, [
    activeSpotlight?.id,
    activeWisdomCategory,
    activeWisdomGuideCapability,
    activeWisdomTitle,
    cci.tone,
    dashboardNoticeSummary.counts.unread,
    demandItems.length,
    openTrust.tone,
    pendingRequests.length,
    urgentDemandItems.length,
  ]);

  const marketWisdomAttentionState = useMemo(() => {
    if (activeSpotlight) {
      return {
        label: "Spotlight live",
        detail: "Live seller visibility is shaping the current reading.",
        accent: "#A16207",
        border: "rgba(184,137,45,0.18)",
        background:
          "linear-gradient(180deg, rgba(248,222,141,0.24) 0%, rgba(255,255,255,0.96) 100%)",
      };
    }

    if (urgentDemandItems.length > 0) {
      return {
        label: "Urgent demand",
        detail: "Demand pressure is shaping the current reading right now.",
        accent: "#B91C1C",
        border: "rgba(220,38,38,0.18)",
        background:
          "linear-gradient(180deg, rgba(254,226,226,0.88) 0%, rgba(255,255,255,0.96) 100%)",
      };
    }

    if (pendingRequests.length > 0) {
      return {
        label: "Support waiting",
        detail: "Pending community requests are shaping the current reading.",
        accent: "#B45309",
        border: "rgba(217,119,6,0.18)",
        background:
          "linear-gradient(180deg, rgba(254,243,199,0.90) 0%, rgba(255,255,255,0.96) 100%)",
      };
    }

    if (dashboardNoticeSummary.counts.unread > 0) {
      return {
        label: "New signal",
        detail: "Unread dashboard activity is shaping the current reading.",
        accent: "#1D4ED8",
        border: "rgba(29,78,216,0.16)",
        background:
          "linear-gradient(180deg, rgba(219,234,254,0.90) 0%, rgba(255,255,255,0.96) 100%)",
      };
    }

    if (openTrust.tone === "red" || cci.tone === "red") {
      return {
        label: "Trust warning",
        detail: "Trust pressure is shaping the current reading.",
        accent: "#B91C1C",
        border: "rgba(220,38,38,0.18)",
        background:
          "linear-gradient(180deg, rgba(254,226,226,0.88) 0%, rgba(255,255,255,0.96) 100%)",
      };
    }

    if (openTrust.tone === "yellow" || cci.tone === "yellow") {
      return {
        label: "Trust watch",
        detail: "Trust caution is shaping the current reading.",
        accent: "#B45309",
        border: "rgba(217,119,6,0.18)",
        background:
          "linear-gradient(180deg, rgba(254,243,199,0.90) 0%, rgba(255,255,255,0.96) 100%)",
      };
    }

    return {
      label: `${activeWisdomCategoryLabel} focus`,
      detail: "GSN is rotating the current reading from live activity and guide context.",
      accent: "#1D4ED8",
      border: "rgba(29,78,216,0.16)",
      background:
        "linear-gradient(180deg, rgba(219,234,254,0.90) 0%, rgba(255,255,255,0.96) 100%)",
    };
  }, [
    activeSpotlight,
    activeWisdomCategoryLabel,
    cci.tone,
    dashboardNoticeSummary.counts.unread,
    openTrust.tone,
    pendingRequests.length,
    urgentDemandItems.length,
  ]);

  const marketWisdomSignals = useMemo(
    () => [
      {
        key: "market",
        label: "Market",
        title: activeWisdomTitle || "Market reading",
        text: signalText,
        accent: "#1D4ED8",
        border: "rgba(29,78,216,0.16)",
        background:
          "linear-gradient(180deg, rgba(219,234,254,0.88) 0%, rgba(255,255,255,0.96) 100%)",
      },
      {
        key: "gsn",
        label: "GSN",
        title: "GSN line",
        text:
          signalSupport ||
          "GSN keeps identity, trust, and community readable before movement.",
        accent: "#0F766E",
        border: "rgba(15,118,110,0.16)",
        background:
          "linear-gradient(180deg, rgba(220,252,231,0.88) 0%, rgba(255,255,255,0.96) 100%)",
      },
      {
        key: "guide",
        label: "Guide",
        title: activeWisdomGuideCapability?.title || "My GSN and I",
        text: marketWisdomGuideLine,
        accent: DASHBOARD_BRAND.goldText,
        border: "rgba(184,137,45,0.18)",
        background:
          "linear-gradient(180deg, rgba(254,243,199,0.90) 0%, rgba(255,255,255,0.96) 100%)",
      },
      {
        key: "now",
        label: "Now",
        title: marketWisdomAttentionState.label,
        text: marketWisdomNowLine,
        accent: marketWisdomAttentionState.accent,
        border: marketWisdomAttentionState.border,
        background: marketWisdomAttentionState.background,
      },
    ],
    [
      activeWisdomGuideCapability?.title,
      activeWisdomTitle,
      marketWisdomAttentionState,
      marketWisdomGuideLine,
      marketWisdomNowLine,
      signalSupport,
      signalText,
    ]
  );

  const activeMarketWisdomSignal = useMemo(() => {
    if (marketWisdomSignals.length === 0) return null;
    return (
      marketWisdomSignals[marketWisdomSignalIndex % marketWisdomSignals.length] ||
      marketWisdomSignals[0]
    );
  }, [marketWisdomSignalIndex, marketWisdomSignals]);

  useEffect(() => {
    if (marketWisdomSignals.length <= 1) return;

    const timer = window.setInterval(() => {
      setMarketWisdomSignalIndex((prev) => (prev + 1) % marketWisdomSignals.length);
    }, 7000);

    return () => window.clearInterval(timer);
  }, [marketWisdomSignals.length]);

  useEffect(() => {
    setMarketWisdomSignalIndex(0);
  }, [activeWisdom?.id, marketWisdomNowLine]);

  const guidancePulse = useMemo<GuidancePulse | null>(() => {
    if (!guidance && !nextBestStep && !todayTomorrow && !weeklyFocus) return null;

    const severity = (
      safeStr(
        nextBestStep?.severity ||
          recoveryPath?.severity ||
          (((actionInbox as any)?.actNow?.length || 0) > 0 ? "important" : "normal")
      ).toLowerCase() || "normal"
    ) as GuidancePulse["severity"];

    const title = safeStr(
      nextBestStep?.title ||
        weeklyFocus?.title ||
        recoveryPath?.title ||
        "Keep your path steady"
    );

    const body = safeStr(
      nextBestStep?.detail ||
        recoveryPath?.detail ||
        weeklyFocus?.detail ||
        "Review your current position and continue from the right page."
    );

    const nowLine = safeStr(
      todayTomorrow?.today || body || "Complete the next right step now."
    );

    const nextLine = safeStr(
      todayTomorrow?.tomorrow ||
        weeklyFocus?.detail ||
        weeklyFocus?.title ||
        "Keep tomorrow lighter by finishing the current step well."
    );

    const wisdomLine = safeStr(
      (activeWisdom as any)?.proverb ||
        (guidance as any)?.marketWisdomCard?.text ||
        signalText
    );

    const ctaTo = normalizeActionTargetPath(
      nextBestStep?.ctaTo ||
        recoveryPath?.ctaTo ||
        weeklyFocus?.ctaTo ||
        DASHBOARD_TARGETS.COMMUNITY
    );

    const ctaLabel = safeStr(
      nextBestStep?.ctaLabel ||
        recoveryPath?.ctaLabel ||
        weeklyFocus?.ctaLabel ||
        "Open important step"
    );

    return {
      severity:
        severity === "urgent" || severity === "important" ? severity : "normal",
      title,
      body,
      nowLine,
      nextLine,
      wisdomLine,
      ctaTo,
      ctaLabel,
    };
  }, [
    guidance,
    nextBestStep,
    todayTomorrow,
    weeklyFocus,
    recoveryPath,
    actionInbox,
    activeWisdom,
    signalText,
  ]);

  const activeFocusCount = useMemo(
    () =>
      focusCommitments.filter((item) => !item.archived && !item.completedAt)
        .length,
    [focusCommitments]
  );

  const userOperationalClass = useMemo(
    () =>
      getUserOperationalClass({
        openTrustTone: openTrust.tone,
        cciTone: cci.tone,
        trustSlipCode,
        pendingRequestsCount: pendingRequests.length,
        demandItems,
        activeSpotlight,
        gmfnId,
        dashboardNoticeSummary,
      }),
    [
      openTrust.tone,
      cci.tone,
      trustSlipCode,
      pendingRequests.length,
      demandItems,
      activeSpotlight,
      gmfnId,
      dashboardNoticeSummary,
    ]
  );

  const priorityRoutes = useMemo(
    () =>
      buildPriorityRoutes({
        userClass: userOperationalClass,
        selectedClanId,
        myShopLink,
        openTrustTone: openTrust.tone,
        pendingRequestsCount: pendingRequests.length,
        demandItems,
        dashboardNoticeSummary,
        trustSlipCode,
      }),
    [
      userOperationalClass,
      selectedClanId,
      myShopLink,
      openTrust.tone,
      pendingRequests.length,
      demandItems,
      dashboardNoticeSummary,
      trustSlipCode,
    ]
  );

  const urgentDemandCount = useMemo(
    () =>
      demandItems.filter((item) => safeStr(item.urgency).toLowerCase() === "high")
        .length,
    [demandItems]
  );

  // Keep all priority-route-derived values below this block so later dashboard
  // tweaks do not accidentally reintroduce TDZ/HMR ordering errors.
  const nextRouteCopy = useMemo(
    () =>
      buildNextRouteCopy({
        userClass: userOperationalClass,
        pendingRequestsCount: pendingRequests.length,
        urgentDemandCount,
        actNowCount: dashboardNoticeSummary.counts.actNow,
        openTrust,
        cci,
        trustSlipCode,
        primaryLabel: routeSurfaceLabel(priorityRoutes.primaryRoute),
        trustExplainer,
      }),
    [
      userOperationalClass,
      pendingRequests.length,
      urgentDemandCount,
      dashboardNoticeSummary.counts.actNow,
      openTrust,
      cci,
      trustSlipCode,
      priorityRoutes.primaryRoute,
      trustExplainer,
    ]
  );

  const attentionSignal = useMemo(
    () =>
      buildDashboardAttentionSignal({
        userClass: userOperationalClass,
        nextRouteKey: priorityRoutes.primaryRoute.key,
        nextRouteLabel: routeSurfaceLabel(priorityRoutes.primaryRoute),
        nextRouteTo: priorityRoutes.primaryRoute.to,
        nextRouteCopy,
        totalNotifications: dashboardNoticeTotalCount,
        actNowCount: dashboardNoticeSummary.counts.actNow,
        unreadCount: dashboardNoticeSummary.counts.unread,
        sourceTitles: dashboardNoticeSourceTitles,
        focusBehindCount: focusSummary.behindCount,
        focusWatchCount: focusSummary.watchCount,
        focusNextReviewLabel: focusSummary.nextReviewLabel,
        focusRouteTo: `${DASHBOARD_TARGETS.DASHBOARD}#focus-commitments`,
        notificationsTo: DASHBOARD_TARGETS.WHAT_MATTERS_NOW,
        nowMs: attentionClockMs,
        storedState: attentionState,
      }),
    [
      userOperationalClass,
      priorityRoutes.primaryRoute,
      nextRouteCopy,
      dashboardNoticeTotalCount,
      dashboardNoticeSummary.counts.actNow,
      dashboardNoticeSummary.counts.unread,
      dashboardNoticeSourceTitles,
      focusSummary.behindCount,
      focusSummary.watchCount,
      focusSummary.nextReviewLabel,
      attentionClockMs,
      attentionState,
    ]
  );

  const trustAttentionCore = useMemo(
    () =>
      buildDashboardTrustAttentionCore({
        openTrust,
        cci,
        trustSlipCode,
        trustExplainer,
        pendingRequestsCount: pendingRequests.length,
        unreadCount: dashboardNoticeSummary.counts.unread,
        actNowCount: dashboardNoticeSummary.counts.actNow,
        urgentDemandCount,
        focusBehindCount: focusSummary.behindCount,
        focusWatchCount: focusSummary.watchCount,
        focusOnTrackCount: focusSummary.onTrackCount,
        focusCompletedCount: focusSummary.completedCount,
        primaryLabel: routeSurfaceLabel(priorityRoutes.primaryRoute),
      }),
    [
      openTrust,
      cci,
      trustSlipCode,
      trustExplainer,
      pendingRequests.length,
      dashboardNoticeSummary.counts.unread,
      dashboardNoticeSummary.counts.actNow,
      urgentDemandCount,
      focusSummary.behindCount,
      focusSummary.watchCount,
      focusSummary.onTrackCount,
      focusSummary.completedCount,
      priorityRoutes.primaryRoute,
    ]
  );

  const attentionDisplaySignal = useMemo(() => {
    if (!attentionSignal.active || attentionSignal.sourceKind === "seller") {
      return attentionSignal;
    }

    return {
      ...attentionSignal,
      problemText: trustAttentionCore.problemText,
      consequenceText: trustAttentionCore.consequenceText,
      actionText: trustAttentionCore.actionText,
    };
  }, [attentionSignal, trustAttentionCore]);

  const mostUsedAppFallback = useMemo(
    () =>
      buildMostUsedAppFallback({
        userClass: userOperationalClass,
        myShopLink,
      }),
    [userOperationalClass, myShopLink]
  );

  const actualMostUsedApps = useMemo(
    () => sortAppUsageRows(appUsage).filter((row) => row.count > 0),
    [appUsage]
  );
  const mostUsedAppSurface = useMemo(
    () =>
      (actualMostUsedApps.length > 0
        ? actualMostUsedApps
        : mostUsedAppFallback
      ).slice(0, 4),
    [actualMostUsedApps, mostUsedAppFallback]
  );

  useEffect(() => {
    if (attentionSignal.active) return;

    setAttentionPopupVisible(false);
    setAttentionState((prev) =>
      prev.signature
        ? defaultDashboardAttentionStoredState()
        : prev
    );
  }, [attentionSignal.active]);

  useEffect(() => {
    if (!attentionSignal.active || !attentionSignal.shouldShow) return;
    if (
      typeof document !== "undefined" &&
      document.visibilityState !== "visible"
    ) {
      return;
    }

    if (
      attentionPopupVisible &&
      attentionState.signature === attentionSignal.signature
    ) {
      return;
    }

    const nowIso = new Date(attentionClockMs).toISOString();
    setAttentionPopupVisible(true);
    setAttentionState(markDashboardAttentionShown(attentionSignal.state, nowIso));
  }, [
    attentionSignal.active,
    attentionSignal.shouldShow,
    attentionSignal.signature,
    attentionSignal.state,
    attentionPopupVisible,
    attentionState.signature,
    attentionClockMs,
  ]);

  function updateUiState(patch: Partial<DashboardUIState>) {
    setUiState((prev) => ({
      ...prev,
      ...patch,
    }));
  }

  function dismissAttentionPopup() {
    const nowIso = new Date().toISOString();
    setAttentionPopupVisible(false);
    setAttentionState(markDashboardAttentionDismissed(attentionSignal.state, nowIso));
  }

  function consumeDashboardPointerEvent(
    event?: React.SyntheticEvent<HTMLElement>
  ) {
    stopDashboardPointerEvent(event);
  }

  function consumeDashboardButtonEvent(
    event?: React.SyntheticEvent<HTMLElement>
  ) {
    if (!event) return;

    if (event.type === "click" || event.type === "submit") {
      event.preventDefault();
    }

    event.stopPropagation();
  }

  function openDashboardRoute(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    to: string
  ) {
    consumeDashboardButtonEvent(event);
    navigateWithOrigin(navigate, to, location);
  }

  function armDashboardInteractionShield(durationMs = 420) {
    if (typeof window === "undefined") return;

    if (dashboardInteractionShieldTimerRef.current !== null) {
      window.clearTimeout(dashboardInteractionShieldTimerRef.current);
    }

    setDashboardInteractionShieldVisible(true);
    dashboardInteractionShieldTimerRef.current = window.setTimeout(() => {
      setDashboardInteractionShieldVisible(false);
      dashboardInteractionShieldTimerRef.current = null;
    }, durationMs);
  }

  function runDashboardUiMutation(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    action: () => void,
    durationMs = 420
  ) {
    consumeDashboardButtonEvent(event);
    armDashboardInteractionShield(durationMs);

    if (typeof window === "undefined") {
      action();
      return;
    }

    window.requestAnimationFrame(() => {
      action();
    });
  }

  function openAttentionTarget(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    to: string
  ) {
    consumeDashboardButtonEvent(event);
    const nowIso = new Date().toISOString();
    setAttentionPopupVisible(false);
    setAttentionState(markDashboardAttentionActed(attentionSignal.state, nowIso));
    navigateWithOrigin(navigate, to, location);
  }

  function openTrustJourneyFromAttention(
    event?: React.SyntheticEvent<HTMLElement>
  ) {
    consumeDashboardButtonEvent(event);
    const nowIso = new Date().toISOString();
    setAttentionPopupVisible(false);
    setAttentionState(markDashboardAttentionActed(attentionSignal.state, nowIso));
    navigateWithOrigin(navigate, "/app/trust#trust-journey", location);
  }

  function goPrevSpotlight(event?: React.SyntheticEvent<HTMLElement>) {
    runDashboardUiMutation(event, () => {
      if (spotlights.length <= 1) return;
      setSpotlightIndex((prev) => (prev <= 0 ? spotlights.length - 1 : prev - 1));
    });
  }

  function goNextSpotlight(event?: React.SyntheticEvent<HTMLElement>) {
    runDashboardUiMutation(event, () => {
      if (spotlights.length <= 1) return;
      setSpotlightIndex((prev) => (prev >= spotlights.length - 1 ? 0 : prev + 1));
    });
  }

  function openSellerIdentityDock(
    event?: React.SyntheticEvent<HTMLButtonElement>
  ) {
    runDashboardUiMutation(event, () => setSellerIdentityDockOpen(true));
  }

  function closeSellerIdentityDock(
    event?: React.SyntheticEvent<HTMLButtonElement>
  ) {
    runDashboardUiMutation(event, () => setSellerIdentityDockOpen(false));
  }

  function openSpotlightPanel(event?: React.SyntheticEvent<HTMLElement>) {
    runDashboardUiMutation(event, () =>
      updateUiState({ spotlightMinimized: false })
    );
  }

  function minimizeSpotlight(event?: React.SyntheticEvent<HTMLElement>) {
    runDashboardUiMutation(event, () =>
      updateUiState({ spotlightMinimized: true })
    );
  }

  function openSpotlightShop(event?: React.SyntheticEvent<HTMLElement>) {
    consumeDashboardButtonEvent(event);
    const spotlightGmfnId = safeStr(activeSpotlight?.author_gmfn_id || "");
    if (!spotlightGmfnId) return;

    navigateWithOrigin(
      navigate,
      `/app/shop/${encodeURIComponent(spotlightGmfnId)}`,
      location
    );
  }

  function openSpotlightMarketplace(
    event?: React.SyntheticEvent<HTMLElement>
  ) {
    openDashboardRoute(event, spotlightMarketplaceTo(activeSpotlight));
  }

  function openTrackedRoute(route: IntelligentRoute) {
    navigateWithOrigin(navigate, route.to, location);
  }

  function openTrackedApp(app: AppUseRecord) {
    navigateWithOrigin(navigate, app.to, location);
  }

  function openMerchantVerifyPage(
    event?: React.SyntheticEvent<HTMLElement>
  ) {
    consumeDashboardButtonEvent(event);
    const href = safeStr(merchantVerifyHref);
    if (!href || typeof window === "undefined") return;
    window.open(href, "_blank", "noopener,noreferrer");
  }

  function openTrustSlipPage(
    event?: React.SyntheticEvent<HTMLElement>
  ) {
    const query = trustSlipCode
      ? `?code=${encodeURIComponent(trustSlipCode)}`
      : "";
    openDashboardRoute(event, `/app/trust-slip${query}`);
  }

  function openTrustSlipVerifyInApp(
    event?: React.SyntheticEvent<HTMLElement>
  ) {
    const query = trustSlipCode
      ? `?code=${encodeURIComponent(trustSlipCode)}`
      : "";
    openDashboardRoute(event, `/app/trust-slip/verify${query}`);
  }

  function openAvatarPicker() {
    fileInputRef.current?.click();
  }

  function onAvatarSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      if (!result) return;

      try {
        localStorage.setItem(DASHBOARD_AVATAR_STORAGE_KEY, result);
      } catch {
        // ignore
      }

      setAvatarSrc(result);
    };

    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    try {
      localStorage.removeItem(DASHBOARD_AVATAR_STORAGE_KEY);
    } catch {
      // ignore
    }

    setAvatarSrc("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function resetFocusDraft() {
    setFocusDraft(defaultFocusCommitmentDraft());
  }

  function prefillFocusDraft(kind: "savings" | "business" | "repayment") {
    if (kind === "savings") {
      setFocusDraft({
        title: "Savings target",
        category: "savings",
        targetValue: "",
        unit: "?",
        dueDate: dateInputValueFromNow(30),
        cadence: "weekly",
        note: "Protect cash discipline and visible follow-through.",
      });
    } else if (kind === "repayment") {
      setFocusDraft({
        title: "Repayment target",
        category: "repayment",
        targetValue: "",
        unit: "?",
        dueDate: dateInputValueFromNow(30),
        cadence: "weekly",
        note: "Keep the repayment path visible and disciplined.",
      });
    } else {
      setFocusDraft({
        title: "Business target",
        category: "business",
        targetValue: "",
        unit: "units",
        dueDate: dateInputValueFromNow(30),
        cadence: "weekly",
        note: "Define the next real business milestone.",
      });
    }

    setFocusComposerOpen(true);
  }

  function saveFocusCommitment() {
    const title = safeStr(focusDraft.title);

    if (!title) return;
    if (activeFocusCount >= 2) return;

    const parsedTarget = safeStr(focusDraft.targetValue)
      ? Number(focusDraft.targetValue)
      : null;

    const targetValue =
      parsedTarget !== null && Number.isFinite(parsedTarget)
        ? parsedTarget
        : null;

    const dueDate = safeStr(focusDraft.dueDate) || dateInputValueFromNow(30);
    const cadence = focusDraft.cadence;
    const now = isoNow();

    const item: FocusCommitment = {
      id: makeLocalId("focus"),
      title,
      category: focusDraft.category,
      targetValue,
      currentValue: 0,
      unit:
        safeStr(focusDraft.unit) ||
        (focusDraft.category === "savings" || focusDraft.category === "repayment"
          ? "?"
          : "units"),
      startDate: dateInputValueFromNow(0),
      dueDate,
      cadence,
      nextCheckInDate: minDateInputValue(
        dueDate,
        nextCheckInForCadence(cadence, new Date())
      ),
      note: safeStr(focusDraft.note),
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      archived: false,
    };

    setFocusCommitments((prev) => [item, ...prev].slice(0, 24));

    const createdEvent: FocusCommitmentEvent = {
      id: makeLocalId("focus-event"),
      commitmentId: item.id,
      kind: "created",
      createdAt: now,
      progressValue: 0,
      note: item.note || `Created ${focusCategoryLabel(item.category)} commitment`,
    };

    setFocusEvents((prev) => [createdEvent, ...prev].slice(0, 120));

    setFocusComposerOpen(false);
    setFocusDraft(defaultFocusCommitmentDraft());
  }

  function submitFocusCheckIn(commitmentId: string) {
    const item = focusCommitments.find((row) => row.id === commitmentId);
    if (!item) return;

    const rawValue = safeStr(focusProgressDrafts[commitmentId]);
    if (!rawValue) return;

    const nextValue = Number(rawValue);
    if (!Number.isFinite(nextValue) || nextValue < 0) return;

    const now = isoNow();
    const completed =
      item.targetValue !== null && Number(nextValue) >= Number(item.targetValue);

    const eventKind: FocusCommitmentEventKind = completed
      ? "complete"
      : item.targetValue !== null &&
        nextValue > Number(item.currentValue || 0)
      ? "milestone"
      : "checkin";

    setFocusCommitments((prev) =>
      prev.map((row) =>
        row.id !== commitmentId
          ? row
          : {
              ...row,
              currentValue: nextValue,
              updatedAt: now,
              nextCheckInDate: completed
                ? row.nextCheckInDate
                : minDateInputValue(
                    row.dueDate,
                    nextCheckInForCadence(row.cadence, new Date())
                  ),
              completedAt: completed ? now : row.completedAt || null,
            }
      )
    );

    setFocusEvents((prev) =>
      [
        {
          id: makeLocalId("focus-event"),
          commitmentId,
          kind: eventKind,
          createdAt: now,
          progressValue: nextValue,
          note: completed
            ? "Commitment completed"
            : `Progress updated to ${nextValue}`,
        },
        ...prev,
      ].slice(0, 120)
    );

    setFocusProgressDrafts((prev) => ({
      ...prev,
      [commitmentId]: "",
    }));
  }

  function replanFocusCommitment(commitmentId: string) {
    const item = focusCommitments.find((row) => row.id === commitmentId);
    if (!item) return;

    const now = isoNow();
    const proposedNextCheckIn = nextCheckInForCadence(item.cadence, new Date());
    const dueIn = daysUntil(item.dueDate);
    const nextDueDate =
      dueIn !== null && dueIn < 0 ? proposedNextCheckIn : item.dueDate;

    const eventKind: FocusCommitmentEventKind =
      (daysUntil(item.nextCheckInDate) ?? 0) < 0 ? "missed-reported" : "replan";

    setFocusCommitments((prev) =>
      prev.map((row) =>
        row.id !== commitmentId
          ? row
          : {
              ...row,
              dueDate: nextDueDate,
              nextCheckInDate: minDateInputValue(
                nextDueDate,
                proposedNextCheckIn
              ),
              updatedAt: now,
            }
      )
    );

    setFocusEvents((prev) =>
      [
        {
          id: makeLocalId("focus-event"),
          commitmentId,
          kind: eventKind,
          createdAt: now,
          progressValue: null,
          note:
            eventKind === "missed-reported"
              ? "Reported a missed checkpoint and moved the review"
              : "Replanned the next review date",
        },
        ...prev,
      ].slice(0, 120)
    );
  }

  function completeFocusCommitment(commitmentId: string) {
    const item = focusCommitments.find((row) => row.id === commitmentId);
    if (!item) return;

    const now = isoNow();

    setFocusCommitments((prev) =>
      prev.map((row) =>
        row.id !== commitmentId
          ? row
          : {
              ...row,
              currentValue:
                row.targetValue !== null
                  ? Number(row.targetValue)
                  : Number(row.currentValue || 0),
              completedAt: now,
              updatedAt: now,
            }
      )
    );

    const completedEvent: FocusCommitmentEvent = {
      id: makeLocalId("focus-event"),
      commitmentId,
      kind: "complete",
      createdAt: now,
      progressValue:
        item.targetValue !== null
          ? Number(item.targetValue)
          : Number(item.currentValue || 0),
      note: "Marked as completed",
    };

    setFocusEvents((prev) => [completedEvent, ...prev].slice(0, 120));
  }

  const attentionPopupTone =
    attentionDisplaySignal.sourceKind === "focus" ||
    attentionDisplaySignal.stage === "persistent"
      ? {
          border: "1px solid rgba(220,38,38,0.18)",
          bar: "linear-gradient(90deg, #991B1B 0%, #DC2626 60%, #FCA5A5 100%)",
          shadow: "0 28px 54px rgba(153,27,27,0.20)",
          labelBg: "rgba(220,38,38,0.10)",
          labelColor: "#991B1B",
        }
      : attentionDisplaySignal.stage === "followup"
      ? {
          border: "1px solid rgba(245,158,11,0.18)",
          bar: "linear-gradient(90deg, #92400E 0%, #F59E0B 60%, #FCD34D 100%)",
          shadow: "0 28px 54px rgba(146,64,14,0.18)",
          labelBg: "rgba(245,158,11,0.12)",
          labelColor: "#92400E",
        }
      : {
          border: "1px solid rgba(11,99,209,0.18)",
          bar: "linear-gradient(90deg, #0F3B74 0%, #0B63D1 60%, #93C5FD 100%)",
          shadow: "0 28px 54px rgba(11,99,209,0.18)",
          labelBg: "rgba(11,99,209,0.10)",
          labelColor: "#0F3B74",
        };

  const attentionPopupChrome =
    attentionDisplaySignal.sourceKind === "focus" ||
    attentionDisplaySignal.stage === "persistent"
      ? {
          shellBg:
            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,244,244,0.98) 100%)",
          heroBg:
            "radial-gradient(circle at top left, rgba(252,165,165,0.18) 0%, rgba(153,27,27,0) 36%), linear-gradient(135deg, #10243A 0%, #3B1020 42%, #7F1D1D 100%)",
          heroBorder: "1px solid rgba(252,165,165,0.18)",
          heroTitle: "#FFF7F7",
          heroBody: "rgba(255,241,242,0.90)",
          heroLabel: "rgba(255,228,230,0.82)",
          stageBg:
            "linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.10) 100%)",
          stageBorder: "1px solid rgba(255,228,230,0.24)",
          stageText: "#FFF4F4",
          bodyBg:
            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,249,249,0.94) 100%)",
          panelBg: "#FFFFFF",
          panelBorder: "1px solid rgba(220,38,38,0.10)",
          actionBg:
            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,244,244,0.96) 100%)",
          connectBg:
            "linear-gradient(180deg, rgba(255,247,247,0.98) 0%, rgba(255,255,255,0.98) 100%)",
          connectBorder: "1px solid rgba(220,38,38,0.10)",
          reminderBg:
            "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,245,245,0.94) 100%)",
          reminderText: "#681A1A",
        }
      : attentionDisplaySignal.stage === "followup"
      ? {
          shellBg:
            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,251,243,0.98) 100%)",
          heroBg:
            "radial-gradient(circle at top left, rgba(252,211,77,0.18) 0%, rgba(146,64,14,0) 34%), linear-gradient(135deg, #10243A 0%, #4B2A0D 48%, #A16207 100%)",
          heroBorder: "1px solid rgba(252,211,77,0.18)",
          heroTitle: "#FFFBF0",
          heroBody: "rgba(255,247,225,0.88)",
          heroLabel: "rgba(255,241,204,0.84)",
          stageBg:
            "linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.10) 100%)",
          stageBorder: "1px solid rgba(253,230,138,0.24)",
          stageText: "#FFF8E4",
          bodyBg:
            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,252,246,0.94) 100%)",
          panelBg: "#FFFFFF",
          panelBorder: "1px solid rgba(245,158,11,0.10)",
          actionBg:
            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,249,239,0.96) 100%)",
          connectBg:
            "linear-gradient(180deg, rgba(255,251,243,0.98) 0%, rgba(255,255,255,0.98) 100%)",
          connectBorder: "1px solid rgba(245,158,11,0.10)",
          reminderBg:
            "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,251,241,0.94) 100%)",
          reminderText: "#6C4407",
        }
      : {
          shellBg:
            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,249,255,0.98) 100%)",
          heroBg:
            "radial-gradient(circle at top left, rgba(147,197,253,0.22) 0%, rgba(11,99,209,0) 34%), linear-gradient(135deg, #10243A 0%, #15395B 44%, #1F5F95 100%)",
          heroBorder: "1px solid rgba(147,197,253,0.18)",
          heroTitle: "#F8FBFF",
          heroBody: "rgba(225,238,252,0.90)",
          heroLabel: "rgba(217,231,245,0.84)",
          stageBg:
            "linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.10) 100%)",
          stageBorder: "1px solid rgba(191,219,254,0.24)",
          stageText: "#F3F9FF",
          bodyBg:
            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,250,255,0.94) 100%)",
          panelBg: "#FFFFFF",
          panelBorder: "1px solid rgba(11,99,209,0.10)",
          actionBg:
            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(243,248,255,0.96) 100%)",
          connectBg:
            "linear-gradient(180deg, rgba(244,249,255,0.98) 0%, rgba(255,255,255,0.98) 100%)",
          connectBorder: "1px solid rgba(11,99,209,0.10)",
          reminderBg:
            "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(241,247,255,0.94) 100%)",
          reminderText: "#123055",
        };

  const attentionStageLabel =
    attentionDisplaySignal.stage === "persistent"
      ? "Urgent now"
      : attentionDisplaySignal.stage === "followup"
      ? "Follow-up"
      : "Active guide";

  const attentionStageDot =
    attentionDisplaySignal.stage === "persistent"
      ? "#FCA5A5"
      : attentionDisplaySignal.stage === "followup"
      ? "#FCD34D"
      : "#93C5FD";

  const profileName = greetingName;
  const showSpotlight = !uiState.spotlightMinimized;
  const dashboardSpotlightMinHeight = isCompact ? 80 : 106;
  const dashboardSpotlightRadius = isCompact ? 20 : 24;
  const dashboardSpotlightTopInset = isCompact ? 6 : 8;
  const dashboardSpotlightBottomInset = isCompact ? 6 : 8;
  const dashboardSpotlightThumbSize = isCompact ? 84 : 112;
  const dashboardSpotlightTitleSize = isCompact ? 18 : 22;
  const dashboardSpotlightBodyFontSize = isCompact ? 12.5 : 13.5;
  const dashboardActionGrid = (
    minWidth = isCompact ? 112 : 132
  ): React.CSSProperties => ({
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))`,
    gap: 8,
    alignItems: "stretch",
  });
  const dashboardFillButton = (
    base: React.CSSProperties,
    overrides: React.CSSProperties = {}
  ): React.CSSProperties => ({
    ...base,
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
    ...overrides,
  });
  return (
    <div
      style={{
        minHeight: "100%",
        margin: "0 -16px",
        padding: "18px 16px 40px",
        background: DASHBOARD_BRAND.pageWash,
      }}
    >
      {attentionDisplaySignal.active ? (
        <>
          <style>
            {`
              @keyframes dashboardAttentionPopupSlide {
                0% {
                  opacity: 0;
                  transform: translateY(-14px) scale(0.98);
                }
                100% {
                  opacity: 1;
                  transform: translateY(0) scale(1);
                }
              }

              @keyframes dashboardAttentionPillPulse {
                0%, 100% {
                  box-shadow: 0 12px 28px rgba(15, 59, 116, 0.16);
                }
                50% {
                  box-shadow: 0 18px 34px rgba(15, 59, 116, 0.26);
                }
              }
            `}
          </style>

          {attentionPopupVisible ? (
            <div
              style={{
                position: "fixed",
                top: isCompact ? 12 : 18,
                right: isCompact ? 12 : 18,
                left: isCompact ? 12 : "auto",
                width: isCompact ? "auto" : 452,
                zIndex: 1200,
                borderRadius: 22,
                overflow: "hidden",
                border: attentionPopupTone.border,
                background: attentionPopupChrome.shellBg,
                boxShadow: attentionPopupTone.shadow,
                animation: "dashboardAttentionPopupSlide 240ms ease-out",
                backdropFilter: "blur(14px)",
              }}
            >
              <div
                style={{
                  height: 4,
                  background: attentionPopupTone.bar,
                }}
              />

              <div
                style={{
                  padding: isCompact ? 14 : 16,
                  background: attentionPopupChrome.heroBg,
                  borderBottom: attentionPopupChrome.heroBorder,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          ...sectionLabel(),
                          color: attentionPopupChrome.heroLabel,
                        }}
                      >
                        Attention Guide
                      </div>

                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          minHeight: 26,
                          padding: "4px 9px",
                          borderRadius: 999,
                          background: attentionPopupChrome.stageBg,
                          border: attentionPopupChrome.stageBorder,
                          color: attentionPopupChrome.stageText,
                          fontSize: 10.5,
                          fontWeight: 900,
                          letterSpacing: 0.18,
                          textTransform: "uppercase",
                          boxShadow:
                            "inset 0 1px 0 rgba(255,255,255,0.18), 0 10px 20px rgba(7,16,28,0.12)",
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: 999,
                            background: attentionStageDot,
                            flexShrink: 0,
                          }}
                        />
                        {attentionStageLabel}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        color: attentionPopupChrome.heroTitle,
                        fontSize: isCompact ? 18 : 20,
                        fontWeight: 900,
                        lineHeight: 1.18,
                        maxWidth: 500,
                        textWrap: "balance",
                      }}
                    >
                      {attentionDisplaySignal.title}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        color: attentionPopupChrome.heroBody,
                        fontSize: 13,
                        lineHeight: 1.58,
                        fontWeight: 700,
                        maxWidth: 520,
                      }}
                    >
                      {attentionDisplaySignal.intro}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 6,
                      justifyItems: isCompact ? "start" : "end",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        minHeight: 28,
                        padding: "5px 9px",
                        borderRadius: 999,
                        background: attentionPopupChrome.stageBg,
                        border: attentionPopupChrome.stageBorder,
                        color: attentionPopupChrome.stageText,
                        fontSize: 11,
                        fontWeight: 900,
                        letterSpacing: 0.12,
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.16), 0 10px 20px rgba(7,16,28,0.10)",
                      }}
                    >
                      Every {attentionDisplaySignal.intervalHours} hour
                      {attentionDisplaySignal.intervalHours === 1 ? "" : "s"}
                    </span>

                    <button
                      type="button"
                      onClick={(event) =>
                        runDashboardUiMutation(event, dismissAttentionPopup, 260)
                      }
                      onPointerDown={consumeDashboardPointerEvent}
                      style={{
                        ...subtleBtn(false),
                        minHeight: 32,
                        padding: "5px 10px",
                        fontSize: 11.5,
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.18)",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.08) 100%)",
                        color: attentionPopupChrome.stageText,
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.14), 0 10px 20px rgba(7,16,28,0.10)",
                      }}
                    >
                      Hide for now
                    </button>
                  </div>
                </div>

                {attentionDisplaySignal.sourceLine ? (
                  <div
                    style={{
                      marginTop: 10,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      minHeight: 28,
                      maxWidth: "100%",
                      padding: "5px 9px",
                      borderRadius: 12,
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      color: attentionPopupChrome.heroBody,
                      fontSize: 12,
                      fontWeight: 800,
                      lineHeight: 1.42,
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.14), 0 10px 20px rgba(7,16,28,0.10)",
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 999,
                        background: attentionStageDot,
                        flexShrink: 0,
                      }}
                    />
                    {attentionDisplaySignal.sourceLine}
                  </div>
                ) : null}
              </div>

              <div
                style={{
                  padding: isCompact ? 12 : 14,
                  background: attentionPopupChrome.bodyBg,
                }}
              >
                <div
                  style={{
                    ...innerCard(attentionPopupChrome.connectBg),
                    padding: isCompact ? 10 : 11,
                    border: attentionPopupChrome.connectBorder,
                    marginTop: 0,
                  }}
                >
                  <div
                    style={{
                      ...sectionLabel(),
                      color: attentionPopupTone.labelColor,
                    }}
                  >
                    How it connects
                  </div>
                  <div
                    style={{
                      marginTop: 7,
                      color: DASHBOARD_BRAND.ink,
                      fontSize: 12.5,
                      fontWeight: 800,
                      lineHeight: 1.54,
                    }}
                  >
                    {trustAttentionCore.connectionText}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gridTemplateColumns: isCompact
                      ? "1fr"
                      : "minmax(0, 1fr) minmax(0, 1fr)",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      ...innerCard(attentionPopupChrome.panelBg),
                      border: attentionPopupChrome.panelBorder,
                      padding: isCompact ? 10 : 11,
                    }}
                  >
                    <div style={sectionLabel()}>Problem</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: DASHBOARD_BRAND.ink,
                        fontSize: 13.5,
                        fontWeight: 800,
                        lineHeight: 1.52,
                      }}
                    >
                      {attentionDisplaySignal.problemText}
                    </div>
                  </div>

                  <div
                    style={{
                      ...innerCard(attentionPopupChrome.panelBg),
                      border: attentionPopupChrome.panelBorder,
                      padding: isCompact ? 10 : 11,
                    }}
                  >
                    <div style={sectionLabel()}>Why it matters</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: DASHBOARD_BRAND.subInk,
                        fontSize: 13,
                        fontWeight: 800,
                        lineHeight: 1.54,
                      }}
                    >
                      {attentionDisplaySignal.consequenceText}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 8,
                    ...innerCard(attentionPopupChrome.actionBg),
                    border: attentionPopupChrome.panelBorder,
                    padding: isCompact ? 10 : 11,
                  }}
                >
                  <div
                    style={{
                      ...sectionLabel(),
                      color: attentionPopupTone.labelColor,
                    }}
                  >
                    Do this now
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#1D4ED8",
                      fontSize: 13.5,
                      fontWeight: 900,
                      lineHeight: 1.54,
                    }}
                  >
                    {attentionDisplaySignal.actionText}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    ...innerCard("linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,250,255,0.96) 100%)"),
                    padding: 8,
                    border: attentionPopupChrome.connectBorder,
                    ...dashboardActionGrid(isCompact ? 108 : 124),
                  }}
                >
                  <button
                    type="button"
                    onClick={(event) =>
                      openAttentionTarget(event, attentionDisplaySignal.ctaTo)
                    }
                    onPointerDown={consumeDashboardPointerEvent}
                    style={{
                      ...dashboardFillButton(primaryBtn(false), {
                        minHeight: isCompact ? 34 : 36,
                        padding: isCompact ? "7px 10px" : "8px 12px",
                        fontSize: isCompact ? 11.5 : 12.25,
                        borderRadius: isCompact ? 11 : 13,
                      }),
                      background:
                        "linear-gradient(180deg, #103B70 0%, #0B63D1 60%, #3B82F6 100%)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.22), 0 16px 26px rgba(11,99,209,0.18)",
                    }}
                  >
                    {attentionDisplaySignal.ctaLabel}
                  </button>

                  {attentionDisplaySignal.secondaryCtaLabel &&
                  attentionDisplaySignal.secondaryCtaTo ? (
                    <button
                      type="button"
                      onClick={(event) =>
                        openAttentionTarget(
                          event,
                          attentionDisplaySignal.secondaryCtaTo || ""
                        )
                      }
                      onPointerDown={consumeDashboardPointerEvent}
                      style={{
                        ...dashboardFillButton(secondaryBtn(false), {
                          minHeight: isCompact ? 34 : 36,
                          padding: isCompact ? "7px 10px" : "8px 12px",
                          fontSize: isCompact ? 11.5 : 12.25,
                          borderRadius: isCompact ? 11 : 13,
                        }),
                        background: DASHBOARD_BRAND.summaryButton,
                        border: `1px solid ${DASHBOARD_BRAND.cardBorderStrong}`,
                        color: DASHBOARD_BRAND.accentDeep,
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.86), 0 14px 24px rgba(10,24,49,0.08)",
                      }}
                    >
                      {attentionDisplaySignal.secondaryCtaLabel}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={openTrustJourneyFromAttention}
                    onPointerDown={consumeDashboardPointerEvent}
                    style={{
                      ...dashboardFillButton(secondaryBtn(false), {
                        minHeight: isCompact ? 34 : 36,
                        padding: isCompact ? "7px 10px" : "8px 12px",
                        fontSize: isCompact ? 11.5 : 12.25,
                        borderRadius: isCompact ? 11 : 13,
                      }),
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,249,255,0.96) 100%)",
                      border: "1px solid rgba(184,137,45,0.20)",
                      color: DASHBOARD_BRAND.goldText,
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.88), 0 14px 24px rgba(10,24,49,0.08)",
                    }}
                  >
                    Trust Journey
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={(event) =>
                runDashboardUiMutation(event, () => setAttentionPopupVisible(true), 260)
              }
              onPointerDown={consumeDashboardPointerEvent}
              style={{
                position: "fixed",
                top: isCompact ? 12 : 18,
                right: isCompact ? 12 : 18,
                zIndex: 1190,
                borderRadius: 16,
                border: attentionPopupTone.border,
                background: attentionPopupChrome.reminderBg,
                color: attentionPopupChrome.reminderText,
                minHeight: 42,
                padding: "8px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                fontWeight: 900,
                fontSize: 12,
                boxShadow: "0 12px 28px rgba(15,59,116,0.16)",
                animation:
                  attentionDisplaySignal.shouldShow || attentionDisplaySignal.stage !== "early"
                    ? "dashboardAttentionPillPulse 1.8s ease-in-out infinite"
                    : undefined,
                backdropFilter: "blur(12px)",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background:
                    attentionDisplaySignal.stage === "persistent"
                      ? "#DC2626"
                      : attentionDisplaySignal.stage === "followup"
                      ? "#F59E0B"
                      : "#0B63D1",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  display: "grid",
                  gap: 1,
                  textAlign: "left",
                  lineHeight: 1.15,
                }}
              >
                <span
                  style={{
                    fontSize: 10.5,
                    letterSpacing: 0.18,
                    textTransform: "uppercase",
                    opacity: 0.72,
                  }}
                >
                  Attention Guide
                </span>
                <span style={{ fontSize: 12 }}>{attentionStageLabel}</span>
              </span>
            </button>
          )}
        </>
      ) : null}

      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          display: "grid",
          gap: 18,
        }}
      >
      <section
        style={{
          ...pageCard(DASHBOARD_BRAND.heroField),
          padding: isCompact ? 16 : 18,
          border: "1px solid rgba(255,255,255,0.14)",
          boxShadow:
            "0 28px 60px rgba(7,16,28,0.14), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            ...innerCard(
              "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)"
            ),
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow:
              "0 20px 42px rgba(7,16,28,0.16), inset 0 1px 0 rgba(255,255,255,0.12)",
            padding: isCompact ? 14 : 16,
            borderRadius: 28,
            backdropFilter: "blur(14px)",
          }}
        >
          <div
            style={{
              ...softCard(
                "linear-gradient(180deg, rgba(249,252,255,0.98) 0%, rgba(230,239,252,0.94) 100%)"
              ),
              border: "1px solid rgba(255,255,255,0.34)",
              boxShadow:
                "0 18px 38px rgba(5,16,38,0.18), inset 0 1px 0 rgba(255,255,255,0.78)",
              color: DASHBOARD_BRAND.ink,
              padding: isCompact ? 14 : 16,
              borderRadius: 24,
            }}
          >
            <div
              style={{
                position: "relative",
                display: "grid",
                gap: 8,
                justifyItems: "center",
                marginBottom: 6,
                minHeight: isCompact ? 56 : 60,
              }}
            >
              <button
                type="button"
                onClick={(event) => openDashboardRoute(event, "/app/community")}
                onPointerDown={consumeDashboardPointerEvent}
                aria-label="Back"
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: isCompact ? 40 : 42,
                  minWidth: isCompact ? 40 : 42,
                  padding: 0,
                  borderRadius: 999,
                  border: "1px solid rgba(16,37,59,0.10)",
                  background:
                    "linear-gradient(180deg, #1B4B78 0%, #2B6599 56%, #3B78AE 100%)",
                  boxShadow:
                    "0 12px 24px rgba(10,24,49,0.18), inset 0 1px 0 rgba(255,255,255,0.18)",
                  textDecoration: "none",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    color: "#F8FBFF",
                    fontSize: 14,
                    fontWeight: 900,
                  lineHeight: 1,
                }}
              >
                {"<-"}
              </span>
              </button>

              <div
                style={{
                  textAlign: "center",
                  fontSize: isCompact ? 24 : 31,
                  fontWeight: 900,
                  lineHeight: 1.04,
                  padding: "0 44px",
                  color: DASHBOARD_BRAND.ink,
                }}
              >
                Trust is the first currency.
              </div>

              <div
                style={{
                  textAlign: "center",
                  fontSize: isCompact ? 13 : 14.5,
                  lineHeight: 1.68,
                  color: "rgba(16,37,59,0.88)",
                  maxWidth: 760,
                  padding: "0 18px",
                }}
              >
                GSN makes it visible, portable, and usable before trade,
                support, or decision.
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  justifySelf: "center",
                  minHeight: isCompact ? 40 : 44,
                  padding: isCompact ? "0 18px" : "0 22px",
                  borderRadius: 999,
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.50) 0%, rgba(233,240,250,0.18) 100%)",
                  border: "1px solid rgba(255,255,255,0.42)",
                  boxShadow:
                    "0 18px 36px rgba(10,24,49,0.12), inset 0 1px 0 rgba(255,255,255,0.78)",
                  color: DASHBOARD_BRAND.goldText,
                  fontSize: isCompact ? 18 : 20,
                  fontWeight: 1000,
                  letterSpacing: 4.2,
                  textTransform: "uppercase",
                }}
              >
                GSN
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "220px minmax(0, 1fr)",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div
              style={{
                ...innerCard(
                  "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)"
                ),
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow:
                  "0 18px 34px rgba(2,12,27,0.14), inset 0 1px 0 rgba(255,255,255,0.08)",
                padding: isCompact ? 12 : 14,
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: isCompact ? 360 : 380,
                  margin: "0 auto",
                  borderRadius: 34,
                  padding: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background:
                    "linear-gradient(180deg, #0A1625 0%, #10263C 48%, #153756 100%)",
                  boxShadow:
                    "0 22px 48px rgba(2,12,27,0.34), inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    height: isCompact ? 250 : 280,
                    borderRadius: 24,
                    overflow: "hidden",
                    border: "1px solid rgba(212,175,55,0.16)",
                    background:
                      "linear-gradient(180deg, #11263B 0%, #193A58 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt="Profile"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center 16%",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 120,
                        height: 120,
                        borderRadius: 999,
                        border: "1px solid rgba(212,175,55,0.28)",
                        background:
                          "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18) 0%, rgba(212,175,55,0.14) 26%, rgba(11,31,51,0.18) 100%)",
                        boxShadow:
                          "0 18px 40px rgba(3,10,22,0.28), inset 0 1px 0 rgba(255,255,255,0.08)",
                        color: "#F8FBFF",
                        fontWeight: 900,
                        fontSize: 42,
                        letterSpacing: 1.4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {profileInitials}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(event) =>
                      runDashboardUiMutation(event, () =>
                        setPictureOptionsOpen((prev) => !prev)
                      )
                    }
                    onPointerDown={consumeDashboardPointerEvent}
                    style={{
                      ...secondaryBtn(false),
                      position: "absolute",
                      right: 14,
                      bottom: 14,
                      width: "auto",
                      minWidth: 42,
                      minHeight: 24,
                      padding: "3px 6px",
                      justifyContent: "space-between",
                      gap: 3,
                      background:
                        "linear-gradient(180deg, rgba(247,217,120,0.96) 0%, rgba(212,175,55,0.98) 52%, rgba(184,137,45,1) 100%)",
                      color: "#4A3200",
                      border: "1px solid rgba(122,75,0,0.24)",
                      boxShadow:
                        "0 16px 28px rgba(2,12,27,0.28), inset 0 1px 0 rgba(255,255,255,0.42)",
                      backdropFilter: "blur(8px)",
                      fontSize: 9,
                    }}
                  >
                    <span>Picture frame</span>
                    <span>{pictureOptionsOpen ? "-" : "+"}</span>
                  </button>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onAvatarSelected}
                style={{ display: "none" }}
              />

              {pictureOptionsOpen ? (
                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gridTemplateColumns:
                      isCompact ? "repeat(3, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  <button
                    type="button"
                    onClick={openAvatarPicker}
                    onPointerDown={consumeDashboardPointerEvent}
                    style={{ ...dashboardFillButton(subtleBtn(false)) }}
                  >
                    Upload
                  </button>

                  <button
                    type="button"
                    onClick={openAvatarPicker}
                    onPointerDown={consumeDashboardPointerEvent}
                    style={{ ...dashboardFillButton(subtleBtn(false)) }}
                  >
                    Change
                  </button>

                  <button
                    type="button"
                    onClick={(event) => runDashboardUiMutation(event, removeAvatar, 260)}
                    onPointerDown={consumeDashboardPointerEvent}
                    style={{ ...dashboardFillButton(subtleBtn(!avatarSrc)) }}
                    disabled={!avatarSrc}
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </div>

            <div>
              <div
                style={{
                  display: "grid",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    ...innerCard(
                      "linear-gradient(180deg, rgba(18,48,77,0.96) 0%, rgba(11,31,51,0.98) 100%)"
                    ),
                    border: "1px solid rgba(255,255,255,0.14)",
                    boxShadow:
                      "0 18px 36px rgba(15,23,42,0.16), inset 0 1px 0 rgba(255,255,255,0.08)",
                    padding: isCompact ? 12 : 14,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          ...sectionLabel(),
                          color: "rgba(226,232,240,0.82)",
                          textAlign: "left",
                        }}
                      >
                        Trust and verification
                      </div>

                      <button
                        type="button"
                        onClick={(event) =>
                          runDashboardUiMutation(event, () =>
                            updateUiState({ trustExpanded: !uiState.trustExpanded })
                          )
                        }
                        onPointerDown={consumeDashboardPointerEvent}
                        style={{
                          ...trustGoldBtn(22, 9),
                          minWidth: 52,
                          padding: "1px 6px",
                          borderRadius: 8,
                          boxShadow:
                            "inset 0 1px 0 rgba(255,248,220,0.94), inset 0 -1px 0 rgba(122,75,0,0.16), 0 6px 10px rgba(15,23,42,0.10)",
                        }}
                      >
                        {uiState.trustExpanded ? "Collapse" : "Open"}
                      </button>
                    </div>

                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        width: "fit-content",
                        gap: 3,
                        minHeight: 26,
                        padding: "2px 5px",
                        borderRadius: 9,
                        background:
                          "linear-gradient(180deg, rgba(255,248,220,0.98) 0%, rgba(243,220,152,0.96) 48%, rgba(229,196,102,0.94) 100%)",
                        color: "#6B4300",
                        border: "1px solid rgba(145,103,19,0.26)",
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.94), inset 0 -2px 0 rgba(145,103,19,0.12), 0 10px 20px rgba(15,23,42,0.16)",
                        fontWeight: 900,
                        fontSize: 10,
                        letterSpacing: 0.04,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span style={{ opacity: 0.88 }}>GSN ID</span>
                      <span
                        style={{
                          color: "#4F2F00",
                          fontSize: 13,
                          lineHeight: 1,
                        }}
                      >
                        {gmfnId}
                      </span>
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        minHeight: 28,
                        padding: "4px 10px",
                        borderRadius: 999,
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.08) 100%)",
                        border: "1px solid rgba(255,255,255,0.16)",
                        color: "#F8FBFF",
                        boxShadow:
                          "0 8px 16px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.12)",
                        fontWeight: 900,
                        fontSize: 11,
                        letterSpacing: 0.04,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span style={{ opacity: 0.8 }}>Name</span>
                      <span
                        style={{
                          fontSize: 13,
                          color: "#FFFFFF",
                        }}
                      >
                        {greetingName}
                      </span>
                    </span>

                    <span
                      style={{
                        color: "rgba(226,232,240,0.74)",
                        fontSize: 11.5,
                        fontWeight: 800,
                      }}
                    >
                      Verification holder
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      color: "rgba(226,232,240,0.86)",
                      fontSize: 12,
                      lineHeight: 1.45,
                      maxWidth: 560,
                    }}
                  >
                    Keep your verification record visible, readable, and ready
                    to share.
                  </div>

                  {uiState.trustExpanded ? (
                    <>
                      <div
                        style={{
                          marginTop: 8,
                          ...innerCard(
                            "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)"
                          ),
                          border: "1px solid rgba(212,175,55,0.18)",
                          boxShadow:
                            "inset 0 1px 0 rgba(255,255,255,0.08), 0 10px 18px rgba(2,12,27,0.08)",
                          padding: 8,
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                            gap: 6,
                          }}
                        >
                          <button
                            type="button"
                            onClick={(event) => openDashboardRoute(event, "/app/trust")}
                            onPointerDown={consumeDashboardPointerEvent}
                            style={{
                              ...trustGoldBtn(30, 11),
                              width: "100%",
                              padding: "6px 10px",
                            }}
                          >
                            Open Trust Passport
                          </button>

                          <button
                            type="button"
                            onClick={(event) => openDashboardRoute(event, "/app/identity")}
                            onPointerDown={consumeDashboardPointerEvent}
                            style={{
                              ...trustGoldBtn(30, 11),
                              width: "100%",
                              padding: "6px 10px",
                            }}
                          >
                            Open Identity & Integrity
                          </button>

                          {merchantVerifyHref ? (
                            <button
                              type="button"
                              onClick={openMerchantVerifyPage}
                              onPointerDown={consumeDashboardPointerEvent}
                              style={{
                                ...trustGoldBtn(30, 11),
                                width: "100%",
                                padding: "6px 10px",
                              }}
                            >
                              Merchant Verify
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          ...innerCard(
                            "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)"
                          ),
                          border: "1px solid rgba(212,175,55,0.20)",
                          boxShadow:
                            "inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 24px rgba(2,12,27,0.10)",
                          padding: 10,
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(118px, 1fr))",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              ...statTile(openTrustTone.bg, openTrustTone.border),
                              padding: 8,
                              minHeight: 102,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              textAlign: "center",
                            }}
                          >
                            <div
                              style={{
                                ...sectionLabel(),
                                textAlign: "center",
                                width: "100%",
                              }}
                            >
                              Open Trust
                            </div>
                            <div
                              style={{
                                marginTop: 4,
                                color: openTrustTone.text,
                                fontSize: 20,
                                fontWeight: 900,
                                lineHeight: 1,
                                width: "50%",
                                minWidth: 72,
                              }}
                            >
                              Class {openTrust.classText}
                            </div>
                            <div
                              style={{
                                marginTop: 4,
                                ...helperText(),
                                fontSize: 11,
                                width: "50%",
                                minWidth: 72,
                                textAlign: "center",
                              }}
                            >
                              Score {openTrust.scoreText}
                            </div>
                            <div
                              style={{
                                marginTop: 2,
                                color: "#0B1F33",
                                fontSize: 11,
                                fontWeight: 700,
                                lineHeight: 1.25,
                                width: "50%",
                                minWidth: 72,
                                textAlign: "center",
                              }}
                            >
                              {openTrust.statusText}
                            </div>
                            <div
                              style={{
                                marginTop: "auto",
                                width: "100%",
                                display: "flex",
                                justifyContent: "center",
                                paddingTop: 6,
                              }}
                            >
                              <button
                                type="button"
                                onClick={(event) =>
                                  openDashboardRoute(event, "/app/open-trust-reading")
                                }
                                onPointerDown={consumeDashboardPointerEvent}
                                style={{
                                  ...trustGoldBtn(26, 10),
                                  minWidth: 88,
                                  padding: "4px 10px",
                                }}
                              >
                                Open Trust
                              </button>
                            </div>
                          </div>

                          <div
                            style={{
                              ...statTile(cciTone.bg, cciTone.border),
                              padding: 8,
                              minHeight: 102,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              textAlign: "center",
                            }}
                          >
                            <div
                              style={{
                                ...sectionLabel(),
                                textAlign: "center",
                                width: "100%",
                              }}
                            >
                              CCI
                            </div>
                            <div
                              style={{
                                marginTop: 4,
                                color: cciTone.text,
                                fontSize: 20,
                                fontWeight: 900,
                                lineHeight: 1,
                                width: "50%",
                                minWidth: 72,
                              }}
                            >
                              Class {cci.classText}
                            </div>
                            <div
                              style={{
                                marginTop: 4,
                                ...helperText(),
                                fontSize: 11,
                                width: "50%",
                                minWidth: 72,
                                textAlign: "center",
                              }}
                            >
                              Score {cci.scoreText}
                            </div>
                            <div
                              style={{
                                marginTop: 2,
                                color: "#0B1F33",
                                fontSize: 11,
                                fontWeight: 700,
                                lineHeight: 1.25,
                                width: "50%",
                                minWidth: 72,
                                textAlign: "center",
                              }}
                            >
                              {cci.statusText}
                            </div>
                            <div
                              style={{
                                marginTop: "auto",
                                width: "100%",
                                display: "flex",
                                justifyContent: "center",
                                paddingTop: 6,
                              }}
                            >
                              <button
                                type="button"
                                onClick={(event) =>
                                  openDashboardRoute(event, "/app/cci-reading")
                                }
                                onPointerDown={consumeDashboardPointerEvent}
                                style={{
                                  ...trustGoldBtn(26, 10),
                                  minWidth: 84,
                                  padding: "4px 10px",
                                }}
                              >
                                Open CCI
                              </button>
                            </div>
                          </div>

                          <div
                            style={{
                              ...statTile(
                                "#F8FBFF",
                                "1px solid rgba(11,99,209,0.10)"
                              ),
                              padding: 8,
                              minHeight: 102,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              textAlign: "center",
                            }}
                          >
                            <div
                              style={{
                                ...sectionLabel(),
                                width: "100%",
                                textAlign: "center",
                              }}
                            >
                              TrustSlip
                            </div>
                            <div
                              style={{
                                marginTop: 4,
                                color: "#0B1F33",
                                fontSize: 18,
                                fontWeight: 900,
                                lineHeight: 1.1,
                                wordBreak: "break-word",
                                minHeight: 40,
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                textAlign: "center",
                              }}
                            >
                              {trustSlipCode || "Pending"}
                            </div>
                            <div
                              style={{
                                marginTop: "auto",
                                display: "flex",
                                flexDirection: "column",
                                gap: 4,
                                alignItems: "center",
                                justifyContent: "center",
                                width: "100%",
                                paddingTop: 6,
                              }}
                            >
                              <button
                                type="button"
                                onClick={openTrustSlipPage}
                                onPointerDown={consumeDashboardPointerEvent}
                                style={{
                                  color: "#14324C",
                                  fontSize: 10,
                                  fontWeight: 800,
                                  padding: 0,
                                  minHeight: "auto",
                                  background: "transparent",
                                  border: "none",
                                  boxShadow: "none",
                                  marginTop: 2,
                                  width: "100%",
                                  textAlign: "center",
                                }}
                              >
                                Check status
                              </button>
                              <button
                                type="button"
                                onClick={openTrustSlipPage}
                                onPointerDown={consumeDashboardPointerEvent}
                                style={{ ...trustGoldMiniBtn(), marginTop: 2 }}
                              >
                                Open TrustSlip
                              </button>
                            </div>
                          </div>

                          <div
                            style={{
                              ...statTile(
                                "#F8FBFF",
                                "1px solid rgba(11,99,209,0.10)"
                              ),
                              padding: 8,
                              minHeight: 102,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              textAlign: "center",
                            }}
                          >
                            <div
                              style={{
                                ...sectionLabel(),
                                width: "100%",
                                textAlign: "center",
                              }}
                            >
                              Verify QR
                            </div>
                            <div
                              style={{
                                marginTop: 6,
                                width: "80%",
                                aspectRatio: "1 / 1",
                                minWidth: 64,
                                maxWidth: 82,
                                borderRadius: 10,
                                border: "1px solid rgba(15,59,116,0.14)",
                                background: "#FFFFFF",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                overflow: "hidden",
                                position: "relative",
                                marginLeft: "auto",
                                marginRight: "auto",
                              }}
                            >
                              {trustQrSrc ? (
                                <>
                                  <img
                                    src={trustQrSrc}
                                    alt="Trust QR"
                                    onLoad={() => {
                                      setQrReady(true);
                                      setQrFailed(false);
                                    }}
                                    onError={() => {
                                      setQrReady(false);
                                      setQrFailed(true);
                                    }}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      display: qrFailed ? "none" : "block",
                                    }}
                                  />
                                  {!qrReady && !qrFailed ? (
                                    <div
                                      style={{
                                        position: "absolute",
                                        inset: 0,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "#14324C",
                                        fontSize: 8,
                                        fontWeight: 800,
                                        textAlign: "center",
                                        padding: 4,
                                        background:
                                          "rgba(255,255,255,0.92)",
                                      }}
                                    >
                                      Loading
                                    </div>
                                  ) : null}
                                  {qrFailed ? (
                                    <div
                                      style={{
                                        position: "absolute",
                                        inset: 0,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "#7A1F1F",
                                        fontSize: 8,
                                        fontWeight: 800,
                                        textAlign: "center",
                                        padding: 4,
                                        background:
                                          "rgba(255,245,245,0.96)",
                                      }}
                                    >
                                      Unavailable
                                    </div>
                                  ) : null}
                                </>
                              ) : (
                                <div
                                  style={{
                                    color: "#14324C",
                                    fontSize: 8,
                                    fontWeight: 800,
                                    textAlign: "center",
                                    padding: 4,
                                  }}
                                >
                                  Pending
                                </div>
                              )}
                            </div>
                            <div
                              style={{
                                marginTop: 4,
                                color: "#0B1F33",
                                fontSize: 12,
                                fontWeight: 900,
                                lineHeight: 1.1,
                                textAlign: "center",
                              }}
                            >
                              {qrFailed
                                ? "Unavailable"
                                : trustQrSrc
                                ? "Ready"
                                : "Pending"}
                            </div>
                            <div
                              style={{
                                marginTop: 6,
                                width: "100%",
                                display: "flex",
                                justifyContent: "center",
                              }}
                            >
                              <button
                                type="button"
                                onClick={openTrustSlipVerifyInApp}
                                onPointerDown={consumeDashboardPointerEvent}
                                style={{ ...trustGoldMiniBtn(), marginTop: 2 }}
                              >
                                Verify QR
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        marginTop: 12,
                        ...innerCard(
                          "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)"
                        ),
                        border: "1px solid rgba(212,175,55,0.16)",
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 20px rgba(2,12,27,0.08)",
                        padding: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <span style={badge(true)}>
                          Open Trust {openTrust.classText}
                        </span>
                        <span style={badge(false)}>CCI {cci.classText}</span>
                        <span style={badge(false)}>
                          TrustSlip {trustSlipCode || "Pending"}
                        </span>
                        <span style={badge(false)}>
                          QR{" "}
                          {qrFailed
                            ? "Unavailable"
                            : trustQrSrc
                            ? "Ready"
                            : "Pending"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          ...pageCard(demandSurfaceChrome.shellBg),
          position: "relative",
          border: demandSurfaceChrome.shellBorder,
          padding: isCompact ? 16 : 18,
          boxShadow:
            "0 20px 44px rgba(10,24,49,0.08), inset 0 1px 0 rgba(255,255,255,0.76)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: demandSurfaceChrome.accent,
          }}
        />
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
            <div style={sectionLabel()}>Spotlight</div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {spotlights.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={goPrevSpotlight}
                  onPointerDown={consumeDashboardPointerEvent}
                  style={secondaryBtn(false)}
                >
                  Previous
                </button>

                <span style={badge(false)}>
                  Spotlight {(spotlightIndex % spotlights.length) + 1} / {spotlights.length}
                </span>

                <button
                  type="button"
                  onClick={goNextSpotlight}
                  onPointerDown={consumeDashboardPointerEvent}
                  style={secondaryBtn(false)}
                >
                  Next
                </button>
              </>
            ) : null}

            {!showSpotlight ? (
              <button
                type="button"
                onClick={openSpotlightPanel}
                onPointerDown={consumeDashboardPointerEvent}
                style={secondaryBtn(false)}
              >
                Open spotlight
              </button>
            ) : null}
          </div>
        </div>

        {!showSpotlight ? (
          <div
            style={{
              marginTop: 16,
              ...innerCard("#FFFFFF"),
              border: "1px solid rgba(11,99,209,0.10)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "minmax(0, 1.15fr) auto",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 20,
                    lineHeight: 1.25,
                  }}
                >
                  {safeStr(
                    activeSpotlight?.title ||
                      activeSpotlight?.message ||
                      "Community Spotlight"
                  )}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    ...helperText(),
                    maxWidth: 760,
                  }}
                >
                  {safeStr(
                    activeSpotlight?.source_shop_name ||
                      activeSpotlight?.author_name ||
                      "Community seller"
                  )}{" "}
                  •{" "}
                  {safeStr(
                    activeSpotlight?.source_clan_name ||
                      currentCommunityName(currentClan, selectedClanId)
                  )}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    color: spotlightExpiryStatus.urgent ? "#9A3412" : "#1D4ED8",
                  }}
                >
                  {spotlightExpiryStatus.detail}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  justifyContent: isCompact ? "flex-start" : "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={openSpotlightPanel}
                  onPointerDown={consumeDashboardPointerEvent}
                  style={primaryBtn(false)}
                >
                  Open spotlight
                </button>
              </div>
            </div>
          </div>
        ) : spotlightLoading ? (
          <div style={{ marginTop: 16, color: "#64748B" }}>
            Loading spotlight...
          </div>
        ) : activeSpotlight ? (
          <>
            <div
              style={{
                marginTop: 16,
                ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"),
                border: "1px solid rgba(11,99,209,0.12)",
                boxShadow:
                  "0 20px 40px rgba(15,59,116,0.08), inset 0 1px 0 rgba(255,255,255,0.8)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    !isCompact && spotlightHasMedia
                      ? `${dashboardSpotlightThumbSize}px minmax(0, 1fr)`
                      : "1fr",
                  gap: 14,
                  alignItems: "start",
                }}
              >
                {!isCompact && spotlightHasMedia ? (
                  <SpotlightMediaFrame
                    imageCandidates={spotlightImageCandidates}
                    videoUrl={spotlightVideoCandidate}
                    videoPoster={spotlightImageCandidates[0] || ""}
                    alt={safeStr(
                      activeSpotlight?.title ||
                        activeSpotlight?.message ||
                        "Spotlight"
                    )}
                    frameStyle={{
                      width: dashboardSpotlightThumbSize,
                      height: dashboardSpotlightThumbSize,
                      borderRadius: 18,
                      overflow: "hidden",
                      border: "1px solid rgba(184,137,45,0.24)",
                      background:
                        "linear-gradient(180deg, #0D2742 0%, #0F3B74 62%, #0B63D1 100%)",
                      boxShadow:
                        "0 16px 30px rgba(15,59,116,0.14), inset 0 1px 0 rgba(255,255,255,0.12)",
                    }}
                    mediaStyle={{
                      width: "100%",
                      height: "100%",
                    }}
                    contentPadding={10}
                    showVideoControls={false}
                    autoPlayVideo={Boolean(spotlightVideoCandidate)}
                    mutedVideo={Boolean(spotlightVideoCandidate)}
                    loopVideo={Boolean(spotlightVideoCandidate)}
                    fallback={
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#F8FBFF",
                          fontWeight: 900,
                          letterSpacing: 0.8,
                          fontSize: 18,
                        }}
                      >
                        GSN
                      </div>
                    }
                  />
                ) : null}

                <div style={{ display: "grid", gap: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <span style={badge(true)}>
                      {safeStr(activeSpotlight.trust_band || "Trusted member")}
                    </span>
                    <span
                      style={{
                        ...badge(false),
                        background: spotlightExpiryStatus.urgent
                          ? "rgba(249,115,22,0.10)"
                          : "rgba(11,99,209,0.08)",
                        color: spotlightExpiryStatus.urgent ? "#9A3412" : "#1D4ED8",
                      }}
                    >
                      {spotlightExpiryStatus.chip}
                    </span>
                    <span
                      style={{
                        ...badge(false),
                        background: spotlightHasMedia
                          ? "rgba(15,59,116,0.08)"
                          : "rgba(249,115,22,0.10)",
                        color: spotlightHasMedia ? "#0F3B74" : "#9A3412",
                      }}
                    >
                      {spotlightHasMedia ? "Media ready" : "Media unavailable"}
                    </span>
                    {!isCompact ? (
                      <span style={badge(false)}>
                        {safeDateTime(activeSpotlight.created_at) || "—"}
                      </span>
                    ) : null}
                  </div>

                  <div
                    style={{
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: dashboardSpotlightTitleSize,
                      lineHeight: 1.15,
                      maxWidth: 760,
                    }}
                  >
                    {safeStr(
                      activeSpotlight.title ||
                        activeSpotlight.message ||
                        "Community Spotlight"
                    )}
                  </div>

                  <div style={{ ...helperText(), maxWidth: 820 }}>
                    {safeStr(
                      activeSpotlight.source_shop_name ||
                        activeSpotlight.author_name ||
                        "Community seller"
                    )}{" "}
                    •{" "}
                    {safeStr(
                      activeSpotlight.source_clan_name ||
                        currentCommunityName(currentClan, selectedClanId)
                    )}
                  </div>

                  {safeStr(activeSpotlight.body || "") ? (
                    <div
                      style={{
                        color: "#475569",
                        fontSize: dashboardSpotlightBodyFontSize,
                        lineHeight: 1.65,
                        maxWidth: 860,
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: isCompact ? 2 : 3,
                        overflow: "hidden",
                      }}
                    >
                      {safeStr(activeSpotlight.body || "")}
                    </div>
                  ) : null}

                  <div
                    style={{
                      color: spotlightExpiryStatus.urgent ? "#9A3412" : "#1D4ED8",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {spotlightExpiryStatus.detail}
                  </div>

                  <div style={{ ...helperText(), maxWidth: 860 }}>
                    Dashboard now keeps spotlight as a quick summary. Open the
                    marketplace or shop for the fuller seller and media context.
                  </div>

                  <div style={{ ...dashboardActionGrid(isCompact ? 128 : 152) }}>
                    <button
                      type="button"
                      onClick={openSpotlightMarketplace}
                      onPointerDown={consumeDashboardPointerEvent}
                      style={dashboardFillButton(secondaryBtn(false))}
                    >
                      Open marketplace
                    </button>
                    {safeStr(activeSpotlight.author_gmfn_id || "") ? (
                      <button
                        type="button"
                        onClick={openSpotlightShop}
                        onPointerDown={consumeDashboardPointerEvent}
                        style={dashboardFillButton(secondaryBtn(false))}
                      >
                        Open shop
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={minimizeSpotlight}
                      onPointerDown={consumeDashboardPointerEvent}
                      style={dashboardFillButton(subtleBtn(false))}
                    >
                      Minimize
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {false ? ((activeSpotlight: SpotlightItem) => (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns:
                isCompact || !sellerIdentityDockOpen
                  ? "1fr"
                  : "minmax(0, 1.08fr) minmax(320px, 0.92fr)",
              gap: 14,
              alignItems: "start",
            }}
          >
            <SystemPictureFrame
              outerStyle={{
                minHeight: dashboardSpotlightMinHeight,
                borderRadius: dashboardSpotlightRadius,
                border: "1px solid rgba(184,137,45,0.32)",
                outline: "1px solid rgba(255,255,255,0.14)",
                outlineOffset: "-8px",
                background:
                  "linear-gradient(180deg, #081625 0%, #0D2742 42%, #0F3B74 74%, #0B63D1 100%)",
                boxShadow:
                  "0 34px 70px rgba(2,12,27,0.30), 0 14px 34px rgba(15,59,116,0.20), inset 0 0 0 1px rgba(255,255,255,0.10), inset 0 1px 0 rgba(255,255,255,0.16)",
              }}
              innerStyle={{
                minHeight: dashboardSpotlightMinHeight,
                borderRadius: dashboardSpotlightRadius,
                border: "none",
                background:
                  "linear-gradient(180deg, #081625 0%, #0D2742 42%, #0F3B74 74%, #0B63D1 100%)",
              }}
            >
              {spotlightImageCandidates.length > 0 || spotlightVideoCandidate ? (
                <SpotlightMediaFrame
                  imageCandidates={spotlightImageCandidates}
                  videoUrl={spotlightVideoCandidate}
                  videoPoster={spotlightImageCandidates[0] || ""}
                  alt={safeStr(
                    activeSpotlight?.title ||
                      activeSpotlight?.message ||
                      "Spotlight"
                  )}
                  frameStyle={{
                    width: "100%",
                    height: "100%",
                    minHeight: dashboardSpotlightMinHeight,
                    borderRadius: dashboardSpotlightRadius,
                    background: "transparent",
                  }}
                  mediaStyle={{
                    width: "100%",
                    height: "100%",
                    minHeight: dashboardSpotlightMinHeight,
                  }}
                  contentPadding={isCompact ? 12 : 16}
                  showVideoControls={false}
                  autoPlayVideo={Boolean(spotlightVideoCandidate)}
                  mutedVideo={Boolean(spotlightVideoCandidate)}
                  loopVideo={Boolean(spotlightVideoCandidate)}
                  fallback={
                    <div
                      style={{
                        minHeight: dashboardSpotlightMinHeight,
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        padding: isCompact ? 16 : 22,
                        textAlign: "center",
                        color: "#F8FBFF",
                      }}
                    >
                      <div
                        style={{
                          width: isCompact ? 54 : 66,
                          height: isCompact ? 54 : 66,
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.20)",
                          background:
                            "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18) 0%, rgba(212,175,55,0.12) 32%, rgba(11,31,51,0.22) 100%)",
                          boxShadow:
                            "0 14px 28px rgba(2,12,27,0.26), inset 0 1px 0 rgba(255,255,255,0.08)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 900,
                          fontSize: isCompact ? 18 : 22,
                          letterSpacing: 0.8,
                        }}
                      >
                        GSN
                      </div>

                      <div
                        style={{
                          fontWeight: 900,
                          fontSize: isCompact ? 13 : 15,
                          lineHeight: 1.45,
                          maxWidth: 380,
                        }}
                      >
                        Spotlight is live, but the media file is unavailable right
                        now.
                      </div>

                      <div
                        style={{
                          fontSize: isCompact ? 11.5 : 12.5,
                          lineHeight: 1.6,
                          color: "rgba(231,238,248,0.90)",
                          maxWidth: 420,
                        }}
                      >
                        Re-open or republish the spotlight media from Community
                        Home or Shop Control if you want the picture to appear
                        again.
                      </div>
                    </div>
                  }
                />
              ) : null}

              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(4,18,33,0.06) 0%, rgba(4,18,33,0.18) 14%, rgba(4,18,33,0.44) 46%, rgba(4,18,33,0.84) 82%, rgba(2,10,20,0.94) 100%)",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  top: dashboardSpotlightTopInset,
                  left: dashboardSpotlightTopInset,
                  right: dashboardSpotlightTopInset,
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      ...badge(false),
                      background: "rgba(255,255,255,0.12)",
                      color: "#FFFFFF",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    {safeStr(activeSpotlight!.trust_band || "Trusted member")}
                  </span>

                  <span
                    style={{
                      ...badge(false),
                      background: spotlightExpiryStatus.urgent
                        ? "rgba(251,146,60,0.22)"
                        : "rgba(255,255,255,0.12)",
                      color: "#FFFFFF",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    {spotlightExpiryStatus.chip}
                  </span>

                  {!isCompact ? (
                    <span
                      style={{
                        ...badge(false),
                        background: "rgba(255,255,255,0.12)",
                        color: "#FFFFFF",
                        backdropFilter: "blur(10px)",
                      }}
                    >
                      {safeDateTime(activeSpotlight.created_at) || "—"}
                    </span>
                  ) : null}
                </div>
              </div>

              <div
                style={{
                  position: "absolute",
                  right: isCompact ? 8 : 14,
                  top: isCompact ? 42 : "50%",
                  transform: isCompact ? "none" : "translateY(-50%)",
                  zIndex: 3,
                  display: "grid",
                  gap: isCompact ? 6 : 8,
                }}
              >
                {!sellerIdentityDockOpen ? (
                  <button
                    type="button"
                    onClick={openSellerIdentityDock}
                    onPointerDown={consumeDashboardPointerEvent}
                    style={{
                      minWidth: isCompact ? 82 : 118,
                      minHeight: isCompact ? 36 : 44,
                      padding: isCompact ? "6px 10px" : "9px 15px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.38)",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(233,241,251,0.94) 48%, rgba(173,201,236,0.88) 100%)",
                      color: "#0D2B4A",
                      fontSize: isCompact ? 10.5 : 12.5,
                      fontWeight: 900,
                      letterSpacing: 0.3,
                      cursor: "pointer",
                      touchAction: "manipulation",
                      boxShadow:
                        "0 16px 28px rgba(2,12,27,0.24), inset 0 1px 0 rgba(255,255,255,0.94), inset 0 -10px 18px rgba(15,59,116,0.12)",
                      backdropFilter: "blur(12px)",
                      textTransform: "uppercase",
                    }}
                  >
                    Open
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={minimizeSpotlight}
                  onPointerDown={consumeDashboardPointerEvent}
                  style={{
                      minWidth: isCompact ? 82 : 118,
                    minHeight: isCompact ? 34 : 38,
                    padding: isCompact ? "6px 10px" : "7px 14px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.36)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(231,237,245,0.92) 52%, rgba(187,198,212,0.86) 100%)",
                    color: "#314559",
                    fontSize: isCompact ? 10.5 : 11.5,
                    fontWeight: 900,
                    letterSpacing: 0.25,
                    cursor: "pointer",
                    touchAction: "manipulation",
                    boxShadow:
                      "0 12px 22px rgba(2,12,27,0.18), inset 0 1px 0 rgba(255,255,255,0.96), inset 0 -8px 14px rgba(100,116,139,0.12)",
                    backdropFilter: "blur(12px)",
                    textTransform: "uppercase",
                  }}
                >
                  Minimize
                </button>
              </div>

              <div
                style={{
                  position: "absolute",
                  left: isCompact ? 12 : 18,
                  right: isCompact ? 12 : 18,
                  bottom: dashboardSpotlightBottomInset,
                  display: "grid",
                  gap: isCompact ? 5 : 8,
                }}
              >
                <div
                  style={{
                    color: "rgba(255,255,255,0.92)",
                    fontSize: isCompact ? 10.5 : 12,
                    fontWeight: 800,
                    letterSpacing: 0.35,
                    textTransform: "uppercase",
                  }}
                >
                  {safeStr(
                    activeSpotlight!.source_shop_name ||
                      activeSpotlight!.author_name ||
                      "Community seller"
                  )}
                </div>

                <div
                  style={{
                    color: "#FFFFFF",
                    fontWeight: 900,
                    fontSize: dashboardSpotlightTitleSize,
                    lineHeight: isCompact ? 1.02 : 1.06,
                    maxWidth: isCompact ? 520 : 760,
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: isCompact ? 2 : 3,
                    overflow: "hidden",
                    textShadow: "0 10px 28px rgba(0,0,0,0.32)",
                  }}
                >
                  {safeStr(
                    activeSpotlight!.title ||
                      activeSpotlight!.message ||
                      "Community Spotlight"
                  )}
                </div>

                {!isCompact && safeStr(activeSpotlight!.body || "") ? (
                  <div
                    style={{
                      color: "rgba(255,255,255,0.90)",
                      fontSize: dashboardSpotlightBodyFontSize,
                      lineHeight: 1.56,
                      maxWidth: 720,
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 2,
                      overflow: "hidden",
                    }}
                  >
                    {safeStr(activeSpotlight!.body || "")}
                  </div>
                ) : null}
              </div>
            </SystemPictureFrame>

            {sellerIdentityDockOpen ? (
              <div
                style={{
                  position: "relative",
                  ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"),
                  border: "1px solid rgba(184,137,45,0.18)",
                  boxShadow: "0 24px 46px rgba(15,59,116,0.10), inset 0 1px 0 rgba(255,255,255,0.72)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact
                      ? "1fr"
                      : "minmax(0, 0.92fr) minmax(0, 1.08fr)",
                    gap: 16,
                    alignItems: "start",
                  }}
                >
                  <div
                    style={{
                      ...innerCard(
                        "linear-gradient(180deg, #0D1B2A 0%, #12293F 100%)"
                      ),
                      border: "1px solid rgba(212,175,55,0.24)",
                      boxShadow: "0 18px 36px rgba(2,12,27,0.24)",
                    }}
                  >
                    <div
                      style={{
                        color: "#F8FBFF",
                        fontWeight: 900,
                        fontSize: 20,
                        lineHeight: 1.3,
                      }}
                    >
                      {safeStr(
                        activeSpotlight.source_shop_name ||
                          activeSpotlight.author_name ||
                          "Community seller"
                      )}
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={badge(true)}>
                        {safeStr(activeSpotlight.trust_band || "Trusted member")}
                      </span>
                      <span
                        style={{
                          ...badge(false),
                          background: "rgba(212,175,55,0.10)",
                          color: "#F6D77A",
                        }}
                      >
                        {safeStr(
                          activeSpotlight.source_clan_name ||
                            currentCommunityName(currentClan, selectedClanId)
                        )}
                      </span>
                    </div>

                    <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                      <div
                        style={statTile(
                          "rgba(255,255,255,0.05)",
                          "1px solid rgba(212,175,55,0.12)"
                        )}
                      >
                        <div style={sectionLabel()}>Community</div>
                        <div
                          style={{
                            marginTop: 8,
                            color: "#F8FBFF",
                            fontWeight: 900,
                            lineHeight: 1.32,
                          }}
                        >
                          {safeStr(
                            activeSpotlight.source_clan_name ||
                              currentCommunityName(currentClan, selectedClanId)
                          )}
                        </div>
                      </div>

                      <div
                        style={statTile(
                          "rgba(255,255,255,0.05)",
                          "1px solid rgba(212,175,55,0.12)"
                        )}
                      >
                        <div style={sectionLabel()}>Posted</div>
                        <div
                          style={{
                            marginTop: 8,
                            color: "#F8FBFF",
                            fontWeight: 900,
                            lineHeight: 1.32,
                          }}
                        >
                          {safeDateTime(activeSpotlight.created_at) || "—"}
                        </div>
                      </div>

                      {safeStr(activeSpotlight.author_gmfn_id || "") ? (
                        <div
                          style={statTile(
                            "rgba(255,255,255,0.05)",
                            "1px solid rgba(212,175,55,0.12)"
                          )}
                        >
                          <div style={sectionLabel()}>GMFN ID</div>
                          <div
                            style={{
                              marginTop: 8,
                              color: "#F8FBFF",
                              fontWeight: 900,
                              lineHeight: 1.32,
                              wordBreak: "break-word",
                            }}
                          >
                            {safeStr(activeSpotlight.author_gmfn_id || "")}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div
                    style={{
                      ...innerCard(
                        "linear-gradient(180deg, #0D1B2A 0%, #12293F 100%)"
                      ),
                      border: "1px solid rgba(212,175,55,0.24)",
                      boxShadow: "0 18px 36px rgba(2,12,27,0.24)",
                    }}
                  >
                    <div style={sectionLabel()}>Actions</div>

                    <div
                      style={{
                        marginTop: 10,
                        color: "#F8FBFF",
                        fontSize: 14,
                        lineHeight: 1.72,
                      }}
                    >
                      {spotlightExpiryStatus.detail}
                    </div>

                    {spotlightVideoCandidate ? (
                      <div
                        style={{
                          marginTop: 12,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            ...badge(false),
                            background: "rgba(255,255,255,0.12)",
                            color: "#FFFFFF",
                            backdropFilter: "blur(10px)",
                          }}
                        >
                          Short video spotlight
                        </span>
                      </div>
                    ) : null}

                    <div
                      style={{
                        marginTop: 14,
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      <button
                        type="button"
                        onClick={openSpotlightMarketplace}
                        onPointerDown={consumeDashboardPointerEvent}
                        style={secondaryBtn(false)}
                      >
                        Open marketplace
                      </button>
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        type="button"
                        onClick={closeSellerIdentityDock}
                        onPointerDown={consumeDashboardPointerEvent}
                        style={{
                          ...subtleBtn(false),
                          minHeight: isCompact ? 32 : 34,
                          minWidth: isCompact ? 70 : 78,
                          padding: isCompact ? "5px 9px" : "6px 10px",
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.24)",
                          background:
                            "linear-gradient(180deg, rgba(248,250,253,0.98) 0%, rgba(225,232,241,0.96) 52%, rgba(177,191,207,0.90) 100%)",
                          color: "#314559",
                          boxShadow:
                            "0 10px 18px rgba(2,12,27,0.16), inset 0 1px 0 rgba(255,255,255,0.96)",
                          fontSize: isCompact ? 10.5 : 11.5,
                          letterSpacing: 0.2,
                          touchAction: "manipulation",
                          textTransform: "uppercase",
                        }}
                      >
                        Close
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            ) : null}
          </div>
            ))(activeSpotlight!) : null}
          </>
        ) : latestSpotlightSnapshot ? (
          <div
            style={{
              marginTop: 16,
              ...innerCard("#FFFFFF"),
              border: "1px solid rgba(11,99,209,0.10)",
              display: "grid",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <span style={badge(true)}>No live spotlight now</span>
              <span
                style={{
                  ...badge(false),
                  background: latestSpotlightStatus.urgent
                    ? "rgba(249,115,22,0.10)"
                    : "rgba(11,99,209,0.08)",
                  color: latestSpotlightStatus.urgent ? "#9A3412" : "#1D4ED8",
                }}
              >
                {latestSpotlightStatus.chip}
              </span>
            </div>

            <div
              style={{
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 20,
                lineHeight: 1.25,
              }}
            >
              {safeStr(
                latestSpotlightSnapshot.title ||
                  latestSpotlightSnapshot.message ||
                  "Most recent community spotlight"
              )}
            </div>

            <div style={{ ...helperText(), maxWidth: 820 }}>
              {safeStr(
                latestSpotlightSnapshot.source_shop_name ||
                  latestSpotlightSnapshot.author_name ||
                  "Community seller"
              )}{" "}
              •{" "}
              {safeStr(
                latestSpotlightSnapshot.source_clan_name ||
                  currentCommunityName(currentClan, selectedClanId)
              )}
            </div>

            <div
              style={{
                color: latestSpotlightStatus.urgent ? "#9A3412" : "#1D4ED8",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {latestSpotlightStatus.detail}
            </div>

            <div style={{ ...helperText(), maxWidth: 860 }}>
              This spotlight has ended. Open Community Home to publish a new
              spotlight.
            </div>

            <div
              style={{
                ...dashboardActionGrid(isCompact ? 128 : 152),
              }}
            >
              <button
                type="button"
                onClick={(event) =>
                  openDashboardRoute(
                    event,
                    spotlightMarketplaceTo(latestSpotlightSnapshot)
                  )
                }
                onPointerDown={consumeDashboardPointerEvent}
                style={dashboardFillButton(secondaryBtn(false))}
              >
                Open marketplace
              </button>
              <button
                type="button"
                onClick={(event) =>
                  openDashboardRoute(event, DASHBOARD_TARGETS.COMMUNITY)
                }
                onPointerDown={consumeDashboardPointerEvent}
                style={dashboardFillButton(secondaryBtn(false))}
              >
                Open community home
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 16, color: "#64748B" }}>
            No active spotlight is available yet.
          </div>
        )}
      </section>

      <section style={pageCard(DASHBOARD_BRAND.summaryPanel)}>
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
            <div style={sectionLabel()}>Demand Box</div>
            <div style={{ marginTop: 3, ...helperText(), maxWidth: 420 }}>
              Live demand in your community.
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <span
              style={{
                ...badge(false),
                background: "rgba(15,59,116,0.08)",
                color: "#0F3B74",
              }}
            >
              {demandItems.length}
            </span>
            <span
              style={{
                ...badge(false),
                background: demandSurfaceChrome.statusBg,
                color: demandSurfaceChrome.statusText,
                border: "none",
              }}
            >
              {urgentDemandItems.length > 0
                ? "Needs response"
                : demandItems.length > 0
                ? "Open queue"
                : "Steady"}
            </span>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            ...innerCard(demandSurfaceChrome.leadBg),
            border: demandSurfaceChrome.leadBorder,
            boxShadow: demandSurfaceChrome.leadShadow,
            padding: isCompact ? 14 : 16,
          }}
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
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 18,
                lineHeight: 1.32,
                maxWidth: 760,
              }}
            >
              {demandSummaryLine}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {urgentDemandItems.length > 0 ? (
                <span
                  style={{
                    ...badge(true),
                    background: "rgba(245,158,11,0.16)",
                    color: "#9A4D04",
                    border: "none",
                  }}
                >
                  Act now
                </span>
              ) : demandItems.length > 0 ? (
                <span
                  style={{
                    ...badge(false),
                    background: "rgba(11,99,209,0.10)",
                    color: "#0B63D1",
                    border: "none",
                  }}
                >
                  Open queue
                </span>
              ) : (
                <span
                  style={{
                    ...badge(false),
                    background: "rgba(148,163,184,0.14)",
                    color: "#475569",
                    border: "none",
                  }}
                >
                  Steady
                </span>
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: 6,
              ...helperText(),
              maxWidth: 820,
              color: "#44617D",
            }}
          >
            {demandSummarySubline}
          </div>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: `repeat(auto-fit, minmax(${isCompact ? 108 : 124}px, 1fr))`,
              gap: 8,
            }}
          >
            {demandDetailPanels.map((panel) => {
              const selected = demandPanelOpenKey === panel.key;
              const routesStraightToDemandBox =
                panel.chipLabel === "Needs attention";

              return (
                <button
                  key={`dashboard-demand-chip-${panel.key}`}
                  type="button"
                  onClick={(event) => {
                    if (routesStraightToDemandBox) {
                      openDashboardRoute(event, panel.to);
                      return;
                    }

                    runDashboardUiMutation(
                      event,
                      () =>
                        setDemandPanelOpenKey((prev) =>
                          prev === panel.key ? "" : panel.key
                        ),
                      260
                    );
                  }}
                  onPointerDown={consumeDashboardPointerEvent}
                  style={{
                    ...subtleBtn(false),
                    width: "100%",
                    minHeight: 34,
                    padding: "7px 10px",
                    fontSize: 12,
                    border: selected
                      ? demandSurfaceChrome.chipSelectedBorder
                      : demandSurfaceChrome.chipBorder,
                    background: selected
                      ? demandSurfaceChrome.chipSelectedBg
                      : demandSurfaceChrome.chipBg,
                    boxShadow: selected
                      ? "0 10px 20px rgba(11,99,209,0.08), inset 0 1px 0 rgba(255,255,255,0.82)"
                      : "0 6px 14px rgba(10,24,49,0.04), inset 0 1px 0 rgba(255,255,255,0.82)",
                  }}
                >
                  {panel.chipLabel}
                </button>
              );
            })}
          </div>

          {selectedDemandPanel ? (
            <div
              style={{
                marginTop: 12,
                ...innerCard(demandSurfaceChrome.detailBg),
                border: demandSurfaceChrome.detailBorder,
                padding: isCompact ? 12 : 14,
                boxShadow:
                  "0 12px 28px rgba(10,24,49,0.06), inset 0 1px 0 rgba(255,255,255,0.84)",
              }}
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
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 15.5,
                    lineHeight: 1.3,
                  }}
                >
                  {selectedDemandPanel.title}
                </div>

                <span style={badge(selectedDemandPanel.tone === "red")}>
                  {selectedDemandPanel.items.length > 0
                    ? selectedDemandPanel.items.length
                    : "Ready"}
                </span>
              </div>

              <div style={{ marginTop: 8, ...helperText() }}>
                {selectedDemandPanel.detail}
              </div>

              {selectedDemandPanel.items.length > 0 ? (
                <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                  {selectedDemandPanel.items.map((item, index) => (
                    <div
                      key={`dashboard-demand-item-${selectedDemandPanel.key}-${item.id || index}`}
                      style={{
                        ...softCard(demandSurfaceChrome.itemBg),
                        border: demandSurfaceChrome.itemBorder,
                        padding: 12,
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.84), 0 8px 18px rgba(10,24,49,0.05)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 8,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            color: "#0B1F33",
                            fontWeight: 800,
                            lineHeight: 1.3,
                            flex: "1 1 220px",
                          }}
                        >
                          {safeStr(item.title || "Demand request")}
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span
                            style={badge(
                              safeStr(item.urgency).toLowerCase() === "high"
                            )}
                          >
                            {safeStr(item.urgency).toLowerCase() === "high"
                              ? "Urgent"
                              : "Open"}
                          </span>
                          {safeDateTime(item.created_at) ? (
                            <span style={badge(false)}>
                              {safeDateTime(item.created_at)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div style={{ marginTop: 6, ...helperText(), fontSize: 13 }}>
                        {safeStr(
                          item.description ||
                            "Open Demand Box to read the full request."
                        )}
                      </div>

                      {safeStr(item.requester_name || item.requester_nickname) ? (
                        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span style={badge(false)}>
                            {safeStr(item.requester_name || item.requester_nickname)}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  onClick={(event) =>
                    openDashboardRoute(event, selectedDemandPanel.to)
                  }
                  onPointerDown={consumeDashboardPointerEvent}
                  style={{
                    ...secondaryBtn(false),
                    width: "100%",
                    minHeight: isCompact ? 38 : 36,
                    padding: isCompact ? "8px 11px" : "7px 11px",
                    fontSize: 12.5,
                  }}
                >
                  {selectedDemandPanel.ctaLabel}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section style={pageCard(DASHBOARD_BRAND.summaryPanel)}>
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
            <div style={{ marginTop: 2, ...helperText(), maxWidth: 420 }}>
              See which screen the latest notification is coming from.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span
              style={{
                ...badge(false),
                background: "rgba(15,59,116,0.08)",
                color: "#0F3B74",
              }}
            >
              Notifications
            </span>
            {dashboardNoticeTotalCount > 0 ? (
              <span style={badge(true)}>{dashboardNoticeTotalCount}</span>
            ) : null}
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            ...innerCard("linear-gradient(180deg, #F7FAFF 0%, #FFFFFF 100%)"),
            border: "1px solid rgba(11,99,209,0.10)",
            boxShadow: "0 10px 24px rgba(11,99,209,0.05)",
          }}
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
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 18,
                lineHeight: 1.32,
                maxWidth: 760,
              }}
            >
              {dashboardNoticeSummaryLine}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {dashboardNoticeSourceGroups.length > 0 ? (
                <span style={badge(false)}>
                  {dashboardNoticeSourceGroups.length} screen
                  {dashboardNoticeSourceGroups.length === 1 ? "" : "s"}
                </span>
              ) : null}
              {dashboardNoticeSummary.counts.actNow > 0 ? (
                <span style={badge(true)}>
                  Act now {dashboardNoticeSummary.counts.actNow}
                </span>
              ) : null}
              {dashboardNoticeSummary.counts.unread > 0 ? (
                <span style={badge(false)}>
                  Unread {dashboardNoticeSummary.counts.unread}
                </span>
              ) : null}
            </div>
          </div>

          {guidanceError ? (
            <div
              style={{
                marginTop: 12,
                ...softCard("#FEF2F2"),
                color: "#991B1B",
                border: "1px solid rgba(239,68,68,0.16)",
                fontWeight: 800,
                padding: 12,
              }}
            >
              {guidanceError}
            </div>
          ) : guidanceLoading && dashboardNoticeTotalCount === 0 ? (
            <div style={{ marginTop: 12, color: "#64748B", lineHeight: 1.7 }}>
              Preparing dashboard notifications...
            </div>
          ) : null}

          {dashboardNoticeSourceGroups.length > 0 ? (
            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {dashboardNoticeQuickGroups.map((group) => {
                const selected = noticeSourceOpenKey === group.key;

                return (
                  <button
                    key={`dashboard-notice-chip-${group.key}`}
                    type="button"
                    onClick={(event) =>
                      runDashboardUiMutation(event, () =>
                        setNoticeSourceOpenKey((prev) =>
                          prev === group.key ? "" : group.key
                        ),
                        260
                      )
                    }
                    onPointerDown={consumeDashboardPointerEvent}
                    style={{
                      ...subtleBtn(false),
                      minHeight: 32,
                      padding: "6px 10px",
                      fontSize: 12,
                      border: selected
                        ? "1px solid rgba(11,99,209,0.22)"
                        : "1px solid rgba(15,59,116,0.10)",
                      background: selected
                        ? "linear-gradient(180deg, rgba(226,238,255,0.98) 0%, rgba(212,226,246,0.96) 100%)"
                        : DASHBOARD_BRAND.quietPanel,
                    }}
                  >
                    {group.title} {group.count}
                  </button>
                );
              })}
              {dashboardNoticeSourceGroups.map((group) => {
                const selected = noticeSourceOpenKey === group.key;

                return (
                  <button
                    key={`dashboard-notice-chip-${group.key}`}
                    type="button"
                    onClick={(event) =>
                      runDashboardUiMutation(event, () =>
                        setNoticeSourceOpenKey((prev) =>
                          prev === group.key ? "" : group.key
                        ),
                        260
                      )
                    }
                    onPointerDown={consumeDashboardPointerEvent}
                    style={{
                      ...subtleBtn(false),
                      minHeight: 32,
                      padding: "6px 10px",
                      fontSize: 12,
                      border: selected
                        ? "1px solid rgba(11,99,209,0.22)"
                        : "1px solid rgba(15,59,116,0.10)",
                      background: selected
                        ? "linear-gradient(180deg, rgba(226,238,255,0.98) 0%, rgba(212,226,246,0.96) 100%)"
                        : DASHBOARD_BRAND.quietPanel,
                    }}
                  >
                    {group.title} {group.count}
                  </button>
                );
              })}
            </div>
          ) : null}

          {dashboardNoticeSelectedPanel ? (
            <div style={{ marginTop: 12 }}>
              {renderDashboardNoticeSourceGroup(
                dashboardNoticeSelectedPanel,
                true,
                (key) =>
                  setNoticeSourceOpenKey((prev) => (prev === key ? "" : key)),
                openDashboardRoute
              )}
            </div>
          ) : noticesLoading && dashboardNoticeTotalCount === 0 ? (
            <div style={{ marginTop: 12, color: "#64748B", lineHeight: 1.7 }}>
              Loading notifications...
            </div>
          ) : null}

        </div>
      </section>

      <section
        style={pageCard(
          "radial-gradient(circle at top, rgba(243,208,106,0.10) 0%, rgba(243,208,106,0) 26%), linear-gradient(180deg, #F7FBFF 0%, #EAF3FF 52%, #DCEAFB 100%)"
        )}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                ...sectionLabel(),
                color: "#0F3B74",
              }}
            >
              Market Wisdom
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 10,
            ...innerCard(
              "linear-gradient(180deg, #FFFFFF 0%, #F4F9FF 100%)"
            ),
            border: "1px solid rgba(15,59,116,0.12)",
            padding: 14,
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.78), 0 12px 24px rgba(2,12,27,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                color: "#0B1F33",
                fontSize: 18,
                fontWeight: 900,
                lineHeight: 1.26,
                flex: "1 1 280px",
              }}
            >
              {activeWisdomTitle || "Live GSN reading"}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                minHeight: 1,
              }}
            />
          </div>

          {activeMarketWisdomSignal ? (
            <div
              style={{
                marginTop: 10,
                display: "grid",
                gap: 10,
              }}
            >
              <div
                style={{
                  ...softCard(activeMarketWisdomSignal.background),
                  padding: "12px 14px",
                  border: `1px solid ${activeMarketWisdomSignal.border}`,
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.82), 0 14px 28px rgba(10,24,49,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      ...badge(false),
                      background: "rgba(255,255,255,0.82)",
                      color: activeMarketWisdomSignal.accent,
                      border: `1px solid ${activeMarketWisdomSignal.border}`,
                    }}
                  >
                    {activeMarketWisdomSignal.label}
                  </span>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                    }}
                  >
                    <div
                      style={{
                        color: DASHBOARD_BRAND.helper,
                        fontSize: 11.5,
                        fontWeight: 900,
                        letterSpacing: 0.22,
                      }}
                    >
                      {((marketWisdomSignalIndex % marketWisdomSignals.length) || 0) + 1} /{" "}
                      {marketWisdomSignals.length}
                    </div>

                    <button
                      type="button"
                      onClick={(event) =>
                        runDashboardUiMutation(event, () =>
                          setMarketWisdomSignalsOpen((prev) => !prev),
                          260
                        )
                      }
                      onPointerDown={consumeDashboardPointerEvent}
                      style={{
                        ...subtleBtn(false),
                        minHeight: 28,
                        padding: "5px 10px",
                        fontSize: 11.5,
                        border: "1px solid rgba(148,163,184,0.18)",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(226,232,240,0.90) 100%)",
                        color: "#526274",
                        boxShadow:
                          "0 8px 16px rgba(10,24,49,0.06), inset 0 1px 0 rgba(255,255,255,0.92)",
                      }}
                    >
                      {marketWisdomSignalsOpen ? "Hide all" : "Open all"}
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 6,
                    color: DASHBOARD_BRAND.helper,
                    fontSize: 11.8,
                    lineHeight: 1.55,
                  }}
                >
                  {marketWisdomAttentionState.detail}
                </div>

                <div
                  style={{
                    marginTop: 10,
                    color: "#0B1F33",
                    fontSize: 16,
                    fontWeight: 900,
                    lineHeight: 1.28,
                  }}
                >
                  {activeMarketWisdomSignal.title}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontSize: activeMarketWisdomSignal.key === "market" ? 14.5 : 13.5,
                    fontWeight: activeMarketWisdomSignal.key === "market" ? 800 : 700,
                    lineHeight: 1.62,
                  }}
                >
                  {activeMarketWisdomSignal.text}
                </div>
              </div>

              {marketWisdomSignalsOpen ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact
                      ? "repeat(2, minmax(0, 1fr))"
                      : "repeat(4, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  {marketWisdomSignals.map((signal, index) => {
                    const selected = activeMarketWisdomSignal.key === signal.key;

                    return (
                      <button
                        key={`market-wisdom-selector-${signal.key}`}
                        type="button"
                        onClick={(event) =>
                          runDashboardUiMutation(
                            event,
                            () => setMarketWisdomSignalIndex(index),
                            180
                          )
                        }
                        onPointerDown={consumeDashboardPointerEvent}
                        style={{
                          ...subtleBtn(false),
                          minHeight: 76,
                          padding: "9px 10px",
                          display: "grid",
                          gap: 6,
                          alignContent: "start",
                          justifyItems: "stretch",
                          textAlign: "left",
                          background: selected ? signal.background : DASHBOARD_BRAND.quietPanel,
                          border: selected
                            ? `1px solid ${signal.border}`
                            : "1px solid rgba(15,59,116,0.10)",
                          boxShadow: selected
                            ? "0 12px 22px rgba(10,24,49,0.08), inset 0 1px 0 rgba(255,255,255,0.86)"
                            : "0 8px 18px rgba(10,24,49,0.05), inset 0 1px 0 rgba(255,255,255,0.82)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 900,
                              letterSpacing: 0.25,
                              textTransform: "uppercase",
                              color: selected ? signal.accent : DASHBOARD_BRAND.label,
                            }}
                          >
                            {signal.label}
                          </span>

                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 999,
                              background: selected ? signal.accent : "rgba(148,163,184,0.5)",
                              boxShadow: selected
                                ? `0 0 0 4px ${signal.border}`
                                : "none",
                              flexShrink: 0,
                            }}
                          />
                        </div>

                        <div
                          style={{
                            color: "#0B1F33",
                            fontSize: 12.5,
                            fontWeight: selected ? 800 : 700,
                            lineHeight: 1.45,
                            maxHeight: 36,
                            overflow: "hidden",
                          }}
                        >
                          {signal.text}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          {activeWisdomCapability === "22" ? (
            <div
              style={{
                marginTop: 10,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.68)",
                border: "1px solid rgba(16,37,59,0.10)",
              }}
            >
              <div>
                <div
                  style={{
                    color: DASHBOARD_BRAND.ink,
                    fontSize: 14,
                    fontWeight: 900,
                    lineHeight: 1.35,
                  }}
                >
                  Commitment Builder
                </div>
                <div
                  style={{
                    marginTop: 4,
                    color: DASHBOARD_BRAND.helper,
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                >
                  Keep follow-through close when today's signal points to execution.
                </div>
              </div>

              <button
                type="button"
                onClick={(event) =>
                  openDashboardRoute(
                    event,
                    `${DASHBOARD_TARGETS.DASHBOARD}#focus-commitments`
                  )
                }
                onPointerDown={consumeDashboardPointerEvent}
                style={{
                  ...secondaryBtn(false),
                  minHeight: 34,
                  padding: "8px 12px",
                  fontSize: 12.5,
                  background: "rgba(255,255,255,0.94)",
                  color: "#173654",
                  border: "1px solid rgba(23,54,84,0.14)",
                  boxShadow: "0 8px 18px rgba(15,23,42,0.06)",
                }}
              >
                Open
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section id="most-used-apps" style={pageCard(DASHBOARD_BRAND.raisedPanel)}>
        <div
          style={{
            display: "grid",
            gap: 14,
          }}
        >
          <div
            style={{
              position: "relative",
              ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F4F9FF 100%)"),
              border: "1px solid rgba(11,99,209,0.12)",
              boxShadow: "0 16px 32px rgba(11,99,209,0.06)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background:
                  "linear-gradient(90deg, #0F3B74 0%, #0B63D1 55%, #93C5FD 100%)",
              }}
            />

            <div
              style={{
                display: "grid",
                gap: 12,
              }}
            >
              <div style={sectionLabel()}>Regular Apps</div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "repeat(2, minmax(0, 1fr))"
                    : "repeat(4, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                {mostUsedAppSurface.map((app, index) => (
                  <button
                    key={`most-used-app-surface-${app.key}`}
                    type="button"
                    onClick={() => openTrackedApp(app)}
                    onPointerDown={consumeDashboardPointerEvent}
                    style={{
                      width: "100%",
                      borderRadius: 12,
                      border:
                        index === 0
                          ? "1px solid rgba(29,78,216,0.18)"
                          : `1px solid ${DASHBOARD_BRAND.cardBorder}`,
                      cursor: "pointer",
                      textAlign: "center",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: isCompact ? 34 : 36,
                      padding: isCompact ? "6px 8px" : "7px 9px",
                      boxShadow:
                        index === 0
                          ? "0 8px 16px rgba(29,78,216,0.06), inset 0 1px 0 rgba(255,255,255,0.78)"
                          : "0 6px 14px rgba(10,24,49,0.04), inset 0 1px 0 rgba(255,255,255,0.82)",
                      background:
                        index === 0
                          ? "linear-gradient(180deg, #F2F8FF 0%, #E3F0FF 100%)"
                          : DASHBOARD_BRAND.quietPanel,
                    }}
                  >
                    <div
                      style={{
                        color: "#0B1F33",
                        fontWeight: 900,
                        fontSize: isCompact ? 11.75 : 12.5,
                        lineHeight: 1.15,
                        whiteSpace: "normal",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {app.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

      </section>

      <section
        style={{
          marginTop: 14,
          ...pageCard(DASHBOARD_BRAND.raisedPanel),
          display: "grid",
          gap: 14,
        }}
      >
          <div
            id="focus-commitments"
            style={{
              position: "relative",
              ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F4F9FF 100%)"),
              border: "1px solid rgba(11,99,209,0.14)",
              boxShadow: "0 16px 34px rgba(11,99,209,0.06)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background:
                  "linear-gradient(90deg, #0F3B74 0%, #0B63D1 52%, #60A5FA 100%)",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={sectionLabel()}>Focus Commitments</div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {focusSummary.nextReviewLabel ? (
                  <span style={badge(false)}>{focusSummary.nextReviewLabel}</span>
                ) : null}
                <span style={badge(true)}>Max 2 active</span>
                <button
                  type="button"
                  onClick={(event) =>
                    runDashboardUiMutation(event, () =>
                      setFocusComposerOpen((prev) => !prev)
                    )
                  }
                  onPointerDown={consumeDashboardPointerEvent}
                  style={secondaryBtn(activeFocusCount >= 2)}
                  disabled={activeFocusCount >= 2}
                >
                  {focusComposerOpen ? "Close composer" : "Add commitment"}
                </button>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    ...statTile("#F3FBF5", "1px solid rgba(34,197,94,0.16)"),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "8px 10px",
                  }}
                >
                  <div style={sectionLabel()}>On track</div>
                  <div
                    style={{
                      color: "#166534",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: 1,
                    }}
                  >
                    {focusSummary.onTrackCount}
                  </div>
                </div>

                <div
                  style={{
                    ...statTile("#FFFBEF", "1px solid rgba(245,158,11,0.16)"),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "8px 10px",
                  }}
                >
                  <div style={sectionLabel()}>Watch</div>
                  <div
                    style={{
                      color: "#92400E",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: 1,
                    }}
                  >
                    {focusSummary.watchCount}
                  </div>
                </div>

                <div
                  style={{
                    ...statTile("#FFF5F5", "1px solid rgba(239,68,68,0.16)"),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "8px 10px",
                  }}
                >
                  <div style={sectionLabel()}>Behind</div>
                  <div
                    style={{
                      color: "#991B1B",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: 1,
                    }}
                  >
                    {focusSummary.behindCount}
                  </div>
                </div>
              </div>
            </div>

            {activeFocusCount > 0 ? (
              <div style={{ marginTop: 8, ...helperText(), fontSize: 12 }}>
                {focusSummary.disciplineLine}
              </div>
            ) : null}

            {focusComposerOpen ? (
              <div
                style={{
                  marginTop: 14,
                  ...innerCard("#FFFFFF"),
                  border: "1px solid rgba(11,99,209,0.10)",
                }}
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
                  <div>
                    <div style={sectionLabel()}>New commitment</div>
                    <div style={{ marginTop: 6, ...helperText(), fontSize: 13 }}>
                      Keep it measurable and time-bound.
                    </div>
                  </div>

                  <div style={dashboardActionGrid(isCompact ? 96 : 120)}>
                    <button
                      type="button"
                      onClick={() => prefillFocusDraft("savings")}
                      onPointerDown={consumeDashboardPointerEvent}
                      style={dashboardFillButton(subtleBtn(false))}
                    >
                      Savings idea
                    </button>
                    <button
                      type="button"
                      onClick={() => prefillFocusDraft("business")}
                      onPointerDown={consumeDashboardPointerEvent}
                      style={dashboardFillButton(subtleBtn(false))}
                    >
                      Business idea
                    </button>
                    <button
                      type="button"
                      onClick={() => prefillFocusDraft("repayment")}
                      onPointerDown={consumeDashboardPointerEvent}
                      style={dashboardFillButton(subtleBtn(false))}
                    >
                      Repayment idea
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 14,
                    display: "grid",
                    gridTemplateColumns: isCompact
                      ? "1fr"
                      : "minmax(0, 1.3fr) repeat(4, minmax(120px, 1fr))",
                    gap: 10,
                  }}
                >
                  <input
                    value={focusDraft.title}
                    onChange={(event) =>
                      setFocusDraft((prev) => ({
                        ...prev,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Commitment title"
                    style={fieldInputStyle()}
                  />

                  <select
                    value={focusDraft.category}
                    onChange={(event) =>
                      setFocusDraft((prev) => ({
                        ...prev,
                        category: event.target.value as FocusCommitmentCategory,
                      }))
                    }
                    style={fieldInputStyle()}
                  >
                    <option value="savings">Savings</option>
                    <option value="business">Business</option>
                    <option value="sales">Sales</option>
                    <option value="inventory">Inventory</option>
                    <option value="service">Service</option>
                    <option value="repayment">Repayment</option>
                    <option value="community">Community</option>
                  </select>

                  <input
                    type="number"
                    min="0"
                    value={focusDraft.targetValue}
                    onChange={(event) =>
                      setFocusDraft((prev) => ({
                        ...prev,
                        targetValue: event.target.value,
                      }))
                    }
                    placeholder="Target"
                    style={fieldInputStyle()}
                  />

                  <input
                    value={focusDraft.unit}
                    onChange={(event) =>
                      setFocusDraft((prev) => ({
                        ...prev,
                        unit: event.target.value,
                      }))
                    }
                    placeholder="Unit"
                    style={fieldInputStyle()}
                  />

                  <input
                    type="date"
                    value={focusDraft.dueDate}
                    onChange={(event) =>
                      setFocusDraft((prev) => ({
                        ...prev,
                        dueDate: event.target.value,
                      }))
                    }
                    style={fieldInputStyle()}
                  />
                </div>

                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gridTemplateColumns: isCompact
                      ? "1fr"
                      : "180px minmax(0, 1fr)",
                    gap: 10,
                  }}
                >
                  <select
                    value={focusDraft.cadence}
                    onChange={(event) =>
                      setFocusDraft((prev) => ({
                        ...prev,
                        cadence: event.target.value as FocusCommitmentCadence,
                      }))
                    }
                    style={fieldInputStyle()}
                  >
                    <option value="weekly">Weekly review</option>
                    <option value="monthly">Monthly review</option>
                  </select>

                  <textarea
                    value={focusDraft.note}
                    onChange={(event) =>
                      setFocusDraft((prev) => ({
                        ...prev,
                        note: event.target.value,
                      }))
                    }
                    placeholder="Why this commitment matters"
                    style={fieldTextareaStyle()}
                  />
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ ...helperText(), fontSize: 13 }}>
                    {activeFocusCount >= 2
                      ? "You already have 2 active commitments. Complete or archive one before adding another."
                      : "Two active commitments maximum keeps the dashboard focused."}
                  </div>

                  <div style={dashboardActionGrid(isCompact ? 118 : 136)}>
                    <button
                      type="button"
                      onClick={() => {
                        resetFocusDraft();
                        setFocusComposerOpen(false);
                      }}
                      onPointerDown={consumeDashboardPointerEvent}
                      style={dashboardFillButton(secondaryBtn(false))}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={saveFocusCommitment}
                      onPointerDown={consumeDashboardPointerEvent}
                      style={dashboardFillButton(
                        primaryBtn(!safeStr(focusDraft.title) || activeFocusCount >= 2)
                      )}
                      disabled={!safeStr(focusDraft.title) || activeFocusCount >= 2}
                    >
                      Save commitment
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              {focusSummary.active.length > 0 ? (
                focusSummary.active.map((item) => {
                  const status = getFocusCommitmentStatus(item);
                  const meta = focusStatusMeta(status);

                  return (
                    <div
                      key={`focus-commitment-${item.id}`}
                      style={{
                        ...innerCard("#FFFFFF"),
                        border: meta.border,
                        background:
                          status === "onTrack"
                            ? "linear-gradient(180deg, #FFFFFF 0%, #F7FCF8 100%)"
                            : status === "watch"
                            ? "linear-gradient(180deg, #FFFFFF 0%, #FFFBEF 100%)"
                            : status === "behind"
                            ? "linear-gradient(180deg, #FFFFFF 0%, #FFF5F5 100%)"
                            : "linear-gradient(180deg, #FFFFFF 0%, #F3FBF5 100%)",
                      }}
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
                        <div>
                          <div
                            style={{
                              color: "#0B1F33",
                              fontWeight: 900,
                              fontSize: 18,
                              lineHeight: 1.3,
                            }}
                          >
                            {item.title}
                          </div>

                          <div
                            style={{
                              marginTop: 8,
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <span style={badge(true)}>
                              {focusCategoryLabel(item.category)}
                            </span>
                            <span
                              style={{
                                ...badge(false),
                                background: meta.bg,
                                color: meta.text,
                              }}
                            >
                              {meta.label}
                            </span>
                            <span style={badge(false)}>
                              {item.cadence === "weekly" ? "Weekly" : "Monthly"} review
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gap: 6,
                            textAlign: isCompact ? "left" : "right",
                          }}
                        >
                          <div
                            style={{
                              color: "#0B1F33",
                              fontWeight: 900,
                              fontSize: 15,
                              lineHeight: 1.25,
                            }}
                          >
                            {formatFocusProgress(
                              item.currentValue,
                              item.targetValue,
                              item.unit
                            )}
                          </div>
                          <div style={{ ...helperText(), fontSize: 12 }}>
                            Due {formatDateLabel(item.dueDate)}
                          </div>
                        </div>
                      </div>

                      {safeStr(item.note) ? (
                        <div style={{ marginTop: 10, ...helperText() }}>{item.note}</div>
                      ) : null}

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
                        <div
                          style={statTile(
                            "#F8FBFF",
                            "1px solid rgba(11,99,209,0.08)"
                          )}
                        >
                          <div style={sectionLabel()}>Next review</div>
                          <div
                            style={{
                              marginTop: 8,
                              color: "#0B1F33",
                              fontWeight: 900,
                              lineHeight: 1.32,
                            }}
                          >
                            {formatDateLabel(item.nextCheckInDate)}
                          </div>
                        </div>

                        <div
                          style={statTile(
                            "#FFFFFF",
                            "1px solid rgba(11,31,51,0.08)"
                          )}
                        >
                          <div style={sectionLabel()}>Days to due</div>
                          <div
                            style={{
                              marginTop: 8,
                              color: "#0B1F33",
                              fontWeight: 900,
                              lineHeight: 1.32,
                            }}
                          >
                            {daysUntil(item.dueDate) ?? "—"}
                          </div>
                        </div>

                        <div style={statTile(meta.bg, meta.border)}>
                          <div style={sectionLabel()}>Execution signal</div>
                          <div
                            style={{
                              marginTop: 8,
                              color: meta.text,
                              fontWeight: 900,
                              lineHeight: 1.32,
                            }}
                          >
                            {meta.label}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: 12,
                          display: "grid",
                          gridTemplateColumns: isCompact
                            ? "repeat(2, minmax(0, 1fr))"
                            : "minmax(0, 180px) repeat(3, auto)",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <input
                          type="number"
                          min="0"
                          value={focusProgressDrafts[item.id] ?? ""}
                          onChange={(event) =>
                            setFocusProgressDrafts((prev) => ({
                              ...prev,
                              [item.id]: event.target.value,
                            }))
                          }
                          placeholder={`Update ${item.unit}`}
                          style={{
                            ...fieldInputStyle(),
                            minHeight: 38,
                            gridColumn: isCompact ? "1 / -1" : undefined,
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => submitFocusCheckIn(item.id)}
                          onPointerDown={consumeDashboardPointerEvent}
                          style={dashboardFillButton(secondaryBtn(false))}
                        >
                          Check in
                        </button>

                        <button
                          type="button"
                          onClick={() => replanFocusCommitment(item.id)}
                          onPointerDown={consumeDashboardPointerEvent}
                          style={dashboardFillButton(subtleBtn(false))}
                        >
                          Replan
                        </button>

                        <button
                          type="button"
                          onClick={() => completeFocusCommitment(item.id)}
                          onPointerDown={consumeDashboardPointerEvent}
                          style={dashboardFillButton(primaryBtn(false))}
                        >
                          Complete
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                  <div
                    style={{
                      ...innerCard("linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"),
                      border: "1px solid rgba(212,175,55,0.24)",
                    }}
                  >
                    <div
                      style={{
                        color: "#F8FBFF",
                        fontWeight: 900,
                        fontSize: 18,
                        lineHeight: 1.3,
                    }}
                  >
                    No active commitment yet.
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      ...helperText(),
                      color: "#F8FBFF",
                      maxWidth: 640,
                    }}
                  >
                    Start one or two real targets and keep them visible.
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: 8,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => prefillFocusDraft("savings")}
                      onPointerDown={consumeDashboardPointerEvent}
                      style={{
                        ...dashboardFillButton(secondaryBtn(false)),
                        width: "100%",
                        minHeight: 36,
                        padding: "7px 9px",
                        whiteSpace: "normal",
                        textAlign: "center",
                      }}
                    >
                      Start savings target
                    </button>

                    <button
                      type="button"
                      onClick={() => prefillFocusDraft("business")}
                      onPointerDown={consumeDashboardPointerEvent}
                      style={{
                        ...dashboardFillButton(secondaryBtn(false)),
                        width: "100%",
                        minHeight: 36,
                        padding: "7px 9px",
                        whiteSpace: "normal",
                        textAlign: "center",
                      }}
                    >
                      Start business target
                    </button>

                    <button
                      type="button"
                      onClick={() => prefillFocusDraft("repayment")}
                      onPointerDown={consumeDashboardPointerEvent}
                      style={{
                        ...dashboardFillButton(secondaryBtn(false)),
                        width: "100%",
                        minHeight: 36,
                        padding: "7px 9px",
                        whiteSpace: "normal",
                        textAlign: "center",
                      }}
                    >
                      Start repayment target
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
      </section>

      {dashboardInteractionShieldVisible ? (
        <div
          aria-hidden="true"
          onPointerDown={consumeDashboardPointerEvent}
          onClick={consumeDashboardButtonEvent}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "transparent",
            pointerEvents: "auto",
            touchAction: "none",
          }}
        />
      ) : null}

      </div>
    </div>
  );
} 


























