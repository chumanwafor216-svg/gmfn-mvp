import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import OriginLink from "../components/OriginLink";
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
  getSmartMarketWisdomPair,
  type MarketWisdomPair,
} from "../lib/marketWisdom";

type SpotlightItem = {
  id?: number;
  title?: string | null;
  message?: string | null;
  body?: string | null;
  image_url?: string | null;
  image?: string | null;
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

type DashboardNoticeBucket = "actNow" | "dueSoon" | "watch" | "unread";

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

type AppUseRecord = {
  key: string;
  label: string;
  detail: string;
  to: string;
  count: number;
  lastOpenedAt: string;
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

const DASHBOARD_UI_STORAGE_KEY = "gmfn.dashboard.ui.v2";
const DASHBOARD_AVATAR_STORAGE_KEY = "gmfn.member.avatar";
const DASHBOARD_APP_USAGE_STORAGE_KEY = "gmfn.dashboard.app-usage.v1";
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

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(15,59,116,0.18)",
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
    border: "1px solid rgba(11,31,51,0.07)",
    background: bg,
    padding: 16,
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(15,59,116,0.18)",
    background: bg,
    padding: 16,
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
      ? "1px solid rgba(11,99,209,0.18)"
      : "1px solid rgba(11,31,51,0.08)",
    background: primary ? "#F7FAFF" : "#FFFFFF",
    padding: 14,
    textDecoration: "none",
    boxShadow: primary ? "0 8px 20px rgba(11,99,209,0.05)" : "none",
  };
}

function primaryBtn(disabled = false): React.CSSProperties {
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
    opacity: disabled ? 0.85 : 1,
    whiteSpace: "nowrap",
  };
}

function secondaryBtn(disabled = false): React.CSSProperties {
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
  };
}

function subtleBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#F8FBFF",
    color: disabled ? "#94A3B8" : "#24415C",
    fontWeight: 800,
    fontSize: 13,
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
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

function helperText(): React.CSSProperties {
  return {
    color: "#5F7287",
    fontSize: 14,
    lineHeight: 1.75,
  };
}

function fieldInputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 42,
    borderRadius: 12,
    border: "1px solid rgba(11,31,51,0.12)",
    background: "#FFFFFF",
    padding: "10px 12px",
    fontSize: 14,
    color: "#0B1F33",
    outline: "none",
  };
}

function fieldTextareaStyle(): React.CSSProperties {
  return {
    ...fieldInputStyle(),
    minHeight: 84,
    resize: "vertical",
  };
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
      return "http://127.0.0.1:8012";
    }
  }

  return "http://127.0.0.1:8012";
}

function getSpotlightOrigins(): string[] {
  const out: string[] = [];
  const base = apiBase();

  const webOrigin =
    typeof window !== "undefined"
      ? String(window.location.origin || "").trim().replace(/\/+$/, "")
      : "";

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

    try {
      const u = new URL(webOrigin);
      if (u.hostname) {
        out.push(`${u.protocol}//${u.hostname}:8012`);
      }
    } catch {
      // ignore
    }
  }

  out.push("http://127.0.0.1:8012");
  out.push("http://localhost:8012");

  return [...new Set(out.filter(Boolean))];
}

function buildResolvedSpotlightCandidates(src: string): string[] {
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

  const origins = getSpotlightOrigins();
  const trimmed = raw.replace(/^\/+/, "");
  const out: string[] = [];

  if (raw.startsWith("/")) {
    for (const origin of origins) out.push(`${origin}${raw}`);
  } else {
    for (const origin of origins) out.push(`${origin}/${trimmed}`);
  }

  out.push(raw);

  return [...new Set(out.filter(Boolean))];
}

function RotatingSpotlightImage(props: {
  candidates: string[];
  alt: string;
  style: React.CSSProperties;
  fallback?: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [props.candidates.join("|")]);

  const src = props.candidates[index] || "";

  if (!src) return <>{props.fallback || null}</>;

  return (
    <img
      src={src}
      alt={props.alt}
      onError={() =>
        setIndex((prev) => {
          const next = prev + 1;
          return next <= props.candidates.length ? next : prev;
        })
      }
      style={props.style}
    />
  );
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

function operationalClassLabel(value: UserOperationalClass): string {
  if (value === "repair") return "Repair mode";
  if (value === "approval") return "Approval pressure";
  if (value === "setup") return "Setup mode";
  if (value === "seller") return "Seller mode";
  if (value === "demand") return "Demand response";
  return "Steady mode";
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

function dashboardNoticeMeta(bucket: DashboardNoticeBucket) {
  if (bucket === "actNow") {
    return {
      title: "Act now",
      detail: "Items waiting directly on you or blocking movement.",
      bg: "#FFF5F5",
      border: "1px solid rgba(239,68,68,0.16)",
      text: "#991B1B",
    };
  }

  if (bucket === "dueSoon") {
    return {
      title: "Due soon",
      detail: "Important items that should be handled before they drift.",
      bg: "#FFFBEF",
      border: "1px solid rgba(245,158,11,0.16)",
      text: "#92400E",
    };
  }

  if (bucket === "watch") {
    return {
      title: "Watch",
      detail: "Signals already moving that you should keep in view.",
      bg: "#F8FBFF",
      border: "1px solid rgba(11,99,209,0.12)",
      text: "#0B63D1",
    };
  }

  return {
    title: "Unread",
    detail: "Unread items are still waiting across your dashboard.",
    bg: "#F8FAFC",
    border: "1px solid rgba(148,163,184,0.16)",
    text: "#334155",
  };
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

function renderDashboardNoticeCard(item: DashboardNoticeItem) {
  return (
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
        <div
          style={{
            color: "#0B1F33",
            fontWeight: 900,
            lineHeight: 1.32,
          }}
        >
          {item.title}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={badge(false)}>{item.source}</span>
          {item.unread ? <span style={badge(true)}>Unread</span> : null}
        </div>
      </div>

      <div style={{ marginTop: 8, ...helperText() }}>{item.detail}</div>

      <div style={{ marginTop: 12 }}>
        <OriginLink to={item.ctaTo} style={secondaryBtn(false)}>
          {item.ctaLabel}
        </OriginLink>
      </div>
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

function sortAppUsageRows(rows: AppUseRecord[]): AppUseRecord[] {
  return [...rows].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    const dateCompare = safeStr(b.lastOpenedAt).localeCompare(
      safeStr(a.lastOpenedAt)
    );
    if (dateCompare !== 0) return dateCompare;
    return safeStr(a.label).localeCompare(safeStr(b.label));
  });
}

function trackAppUsage(
  rows: AppUseRecord[],
  next: Pick<AppUseRecord, "key" | "label" | "detail" | "to">
): AppUseRecord[] {
  const copy = [...rows];
  const index = copy.findIndex((row) => row.key === next.key);

  if (index >= 0) {
    copy[index] = {
      ...copy[index],
      label: next.label,
      detail: next.detail,
      to: next.to,
      count: positiveNumber(copy[index].count) + 1,
      lastOpenedAt: isoNow(),
    };
    return sortAppUsageRows(copy);
  }

  copy.push({
    ...next,
    count: 1,
    lastOpenedAt: isoNow(),
  });

  return sortAppUsageRows(copy);
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
      ? ["trust", "cci", "notifications", "trust-slip", "community", "finance"]
      : params.userClass === "approval"
      ? ["community", "notifications", "trust", "finance", "marketplace", "guide"]
      : params.userClass === "setup"
      ? ["trust-slip", "trust", "community", "guide", "notifications", "finance"]
      : params.userClass === "demand"
      ? ["demand-box", "marketplace", "notifications", "finance", "community", "shop"]
      : params.userClass === "seller"
      ? ["shop", "marketplace", "finance", "trust-slip", "notifications", "community"]
      : ["notifications", "community", "marketplace", "finance", "trust", "shop"];

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
    if (result.length >= 6) return result;
  }

  for (const row of fallback) {
    if (seen.has(row.key)) continue;
    seen.add(row.key);
    result.push(row);
    if (result.length >= 6) return result;
  }

  return result.slice(0, 6);
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
  utilityRoutes: IntelligentRoute[];
} {
  const sharedUtilityRoutes: IntelligentRoute[] = [
    {
      key: "community",
      label: "Community",
      detail: "Your community page.",
      to: DASHBOARD_TARGETS.COMMUNITY,
    },
    {
      key: "marketplace",
      label: "Marketplace",
      detail: "Your community marketplace page.",
      to: DASHBOARD_TARGETS.MARKETPLACE,
    },
    {
      key: "finance",
      label: "Finance",
      detail: "Pool, locks, support, and money events.",
      to: DASHBOARD_TARGETS.FINANCE,
    },
    {
      key: "notifications",
      label: "What Matters Now",
      detail: "Organised live actions and next priorities.",
      to: DASHBOARD_TARGETS.WHAT_MATTERS_NOW,
    },
    {
      key: "trust",
      label: "Trust",
      detail: "Read trust movement and repair paths.",
      to: DASHBOARD_TARGETS.TRUST,
    },
    {
      key: "demand-box",
      label: "Demand Box",
      detail: "Your demand page.",
      to: DASHBOARD_TARGETS.DEMAND_BOX,
    },
  ];

  const joinRequestsTo = params.selectedClanId
    ? `/app/community/${params.selectedClanId}/join-requests`
    : DASHBOARD_TARGETS.COMMUNITY;

  const urgentDemandCount = params.demandItems.filter(
    (item) => safeStr(item.urgency).toLowerCase() === "high"
  ).length;

  if (params.userClass === "repair") {
    const trustPrimary = params.openTrustTone === "red";

    return {
      title: "Repair trust before expanding",
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
      utilityRoutes: sharedUtilityRoutes,
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
      utilityRoutes: sharedUtilityRoutes,
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
      utilityRoutes: sharedUtilityRoutes,
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
      utilityRoutes: sharedUtilityRoutes,
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
      utilityRoutes: sharedUtilityRoutes,
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
    utilityRoutes: sharedUtilityRoutes,
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
      : "No review scheduled",
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
      postureTitle: "Incomplete and unverified",
      postureDetail:
        "Your verification record is not fully ready yet. Complete it before expecting stronger trust and confidence.",
      primaryRoute: {
        key: "trust-slip",
        label: "Open TrustSlip",
        detail: "Complete your verification record.",
        to: DASHBOARD_TARGETS.TRUST_SLIP,
      },
      secondaryRoute: {
        key: "trust",
        label: "Open Trust Passport",
        detail: "Understand the trust path clearly.",
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
      postureTitle: "At risk and needs repair",
      postureDetail:
        "Trust pressure is visible. Repair should come before expansion, borrowing, or wider exposure.",
      primaryRoute:
        params.openTrust.tone === "red"
          ? {
              key: "trust",
              label: "Open Trust",
              detail: "Review the trust pressure in your community.",
              to: DASHBOARD_TARGETS.TRUST,
            }
          : {
              key: "cci",
              label: "Open CCI",
              detail: "Review the cross-community integrity pressure.",
              to: DASHBOARD_TARGETS.CCI,
            },
      secondaryRoute: {
        key: "notifications",
        label: "Open What Matters Now",
        detail: "Review the next corrective action waiting on you.",
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
      postureTitle: "Drifting and needs correction",
      postureDetail:
        "The position is still recoverable without heavy damage, but delay will make repair more expensive.",
      primaryRoute: {
        key: "trust",
        label: "Review Trust",
        detail: "Inspect what is weakening trust now.",
        to: DASHBOARD_TARGETS.TRUST,
      },
      secondaryRoute: {
        key: "cci",
        label: "Review CCI",
        detail: "Review the wider integrity picture.",
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
      postureTitle: "Strong and portable",
      postureDetail:
        "Trust is stable, visible, and supported by execution discipline. Keep it protected through consistency.",
      primaryRoute: {
        key: "trust-slip",
        label: "Use TrustSlip",
        detail: "Keep merchant verification ready and visible.",
        to: DASHBOARD_TARGETS.TRUST_SLIP,
      },
      secondaryRoute: {
        key: "trust",
        label: "Open Trust",
        detail: "Review what is strengthening trust.",
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
    postureTitle: "Stable and should be protected",
    postureDetail:
      "The trust position is not under major pressure, but steady participation and visible follow-through still matter.",
    primaryRoute: {
      key: "trust",
      label: "Open Trust",
      detail: "Review the current trust path.",
      to: DASHBOARD_TARGETS.TRUST,
    },
    secondaryRoute: {
      key: "notifications",
      label: "Open What Matters Now",
      detail: "Review the organised queue before branching.",
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

  const [pendingRequests, setPendingRequests] = useState<JoinRequestItem[]>([]);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [noticesLoading, setNoticesLoading] = useState<boolean>(false);

  const [demandItems, setDemandItems] = useState<DemandItem[]>([]);

  const [marketWisdomIndex, setMarketWisdomIndex] = useState<number>(0);
  const [activeWisdom, setActiveWisdom] = useState<MarketWisdomPair | null>(
    null
  );
  const [sellerIdentityDockOpen, setSellerIdentityDockOpen] =
    useState<boolean>(true);

  const [avatarSrc, setAvatarSrc] = useState<string>("");
  const [pictureOptionsOpen, setPictureOptionsOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [appUsage, setAppUsage] = useState<AppUseRecord[]>(() =>
    readLocalJSON(DASHBOARD_APP_USAGE_STORAGE_KEY, [])
  );
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
    writeLocalJSON(DASHBOARD_UI_STORAGE_KEY, uiState);
  }, [uiState]);

  useEffect(() => {
    writeLocalJSON(DASHBOARD_APP_USAGE_STORAGE_KEY, appUsage);
  }, [appUsage]);

  useEffect(() => {
    writeLocalJSON(DASHBOARD_FOCUS_COMMITMENTS_STORAGE_KEY, focusCommitments);
  }, [focusCommitments]);

  useEffect(() => {
    writeLocalJSON(DASHBOARD_FOCUS_EVENTS_STORAGE_KEY, focusEvents);
  }, [focusEvents]);

  useEffect(() => {
    setAvatarSrc(readStoredImage(DASHBOARD_AVATAR_STORAGE_KEY));
  }, []);

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
    (async () => {
      setSpotlightLoading(true);
      try {
        const res = await getMarketplaceBroadcasts({
          active_only: true,
          limit: 20,
        }).catch(() => ({ items: [] }));

        const items: SpotlightItem[] = Array.isArray(res)
          ? res
          : Array.isArray((res as any)?.items)
          ? (res as any).items
          : [];

        setSpotlights(items);
      } finally {
        setSpotlightLoading(false);
      }
    })();
  }, []);

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
    }, 600000);

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

  const verificationStatus =
    safeStr(
      trustSlip?.status ||
        trustSlip?.verification_status ||
        (trustSlipCode ? "Verification ready" : "")
    ) || "Verification pending";

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

    if (openTrust.tone === "red" || cci.tone === "red") {
      pushItem(
        makeItem({
          id: "synthetic-trust-risk",
          title: "Trust event needs attention",
          detail:
            "Open Trust or CCI to review the current trust pressure before it affects your next movement.",
          ctaLabel: "Open Trust",
          ctaTo:
            openTrust.tone === "red"
              ? DASHBOARD_TARGETS.TRUST
              : DASHBOARD_TARGETS.CCI,
          source: "Trust Events",
          bucket: "actNow",
          scoreBoost: 16,
        })
      );
    } else if (
      openTrust.tone === "yellow" ||
      cci.tone === "yellow" ||
      !trustSlipCode
    ) {
      pushItem(
        makeItem({
          id: "synthetic-trust-review",
          title: !trustSlipCode
            ? "TrustSlip still preparing"
            : "Trust review coming up",
          detail: !trustSlipCode
            ? "TrustSlip is still preparing. Open it now and make sure your verification record is ready."
            : "Open Trust or CCI to review the current reading before it drifts into pressure.",
          ctaLabel: !trustSlipCode ? "Open TrustSlip" : "Open Trust",
          ctaTo: !trustSlipCode
            ? DASHBOARD_TARGETS.TRUST_SLIP
            : DASHBOARD_TARGETS.TRUST,
          source: "Trust Events",
          bucket: "dueSoon",
          scoreBoost: 10,
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
          detail: `${focusSummary.nextReviewLabel}. Keep the next checkpoint visible before it drifts into pressure.`,
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
          detail: `${focusSummary.nextReviewLabel}. ${focusSummary.disciplineLine}.`,
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

  const nextRouteTo = normalizeActionTargetPath(
    weeklyFocus?.ctaTo ||
      recoveryPath?.ctaTo ||
      nextBestStep?.ctaTo ||
      DASHBOARD_TARGETS.WHAT_MATTERS_NOW
  );

  const nextRouteLabel = safeStr(
    weeklyFocus?.ctaLabel ||
      recoveryPath?.ctaLabel ||
      nextBestStep?.ctaLabel ||
      "Open next step"
  );

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

  const mostUsedAppFallback = useMemo(
    () =>
      buildMostUsedAppFallback({
        userClass: userOperationalClass,
        myShopLink,
      }),
    [userOperationalClass, myShopLink]
  );

  const mostUsedApps = useMemo(
    () => buildMostUsedAppRows(appUsage, mostUsedAppFallback),
    [appUsage, mostUsedAppFallback]
  );
  const mostUsedAppPreview = useMemo(() => {
    const primary = mostUsedApps[0] || null;
    const financeApp =
      mostUsedApps.find((app) => app.key === "finance") ||
      mostUsedAppFallback.find((app) => app.key === "finance") ||
      null;
    if (primary && financeApp && financeApp.key !== primary.key) {
      return [primary, financeApp];
    }
    return mostUsedApps.slice(0, 2);
  }, [mostUsedApps, mostUsedAppFallback]);

  const trustJourneyModel = useMemo(
    () =>
      buildTrustJourneyModel({
        openTrust,
        cci,
        trustSlipCode,
        trustExplainer,
        focusSummary,
      }),
    [openTrust, cci, trustSlipCode, trustExplainer, focusSummary]
  );

  const trustJourneyTone = useMemo(
    () => toneStyles(trustJourneyModel.tone),
    [trustJourneyModel.tone]
  );

  function updateUiState(patch: Partial<DashboardUIState>) {
    setUiState((prev) => ({
      ...prev,
      ...patch,
    }));
  }

  function goPrevSpotlight() {
    if (spotlights.length <= 1) return;
    setSpotlightIndex((prev) => (prev <= 0 ? spotlights.length - 1 : prev - 1));
  }

  function goNextSpotlight() {
    if (spotlights.length <= 1) return;
    setSpotlightIndex((prev) => (prev >= spotlights.length - 1 ? 0 : prev + 1));
  }

  function openSpotlightShop() {
    const spotlightGmfnId = safeStr(activeSpotlight?.author_gmfn_id || "");
    if (!spotlightGmfnId) return;

    navigateWithOrigin(
      navigate,
      `/app/shop/${encodeURIComponent(spotlightGmfnId)}`,
      location
    );
  }

  function openSpotlightMarketplace() {
    navigateWithOrigin(
      navigate,
      spotlightMarketplaceTo(activeSpotlight),
      location
    );
  }

  function rememberAppOpen(route: {
    key: string;
    label: string;
    detail: string;
    to: string;
  }) {
    setAppUsage((prev) => trackAppUsage(prev, route));
  }

  function openTrackedRoute(route: IntelligentRoute) {
    rememberAppOpen({
      key: route.key,
      label: route.label,
      detail: route.detail,
      to: route.to,
    });

    navigateWithOrigin(navigate, route.to, location);
  }

  function openTrackedApp(app: AppUseRecord) {
    rememberAppOpen({
      key: app.key,
      label: app.label,
      detail: app.detail,
      to: app.to,
    });

    navigateWithOrigin(navigate, app.to, location);
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

  const profileName = greetingName;
  const showSpotlight = !uiState.spotlightMinimized; 
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
      <section style={pageCard("#FFFFFF")}>
        <div
          style={{
            ...innerCard("linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"),
            border: "1px solid rgba(212,175,55,0.24)",
            boxShadow: "0 18px 38px rgba(2,12,27,0.18)",
            padding: isCompact ? 16 : 18,
          }}
        >
          <div
            style={{
              ...softCard("linear-gradient(180deg, #0F3B74 0%, #0B63D1 100%)"),
              border: "1px solid rgba(11,99,209,0.12)",
              color: "#FFFFFF",
              padding: isCompact ? 16 : 18,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: 0.45,
                textTransform: "uppercase",
                opacity: 0.88,
              }}
            >
              GSN
            </div>

            <div
              style={{
                marginTop: 10,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "minmax(0, 1.2fr) minmax(280px, 0.8fr)",
                gap: 14,
                alignItems: "start",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: isCompact ? 28 : 36,
                    fontWeight: 900,
                    lineHeight: 1.08,
                    maxWidth: 820,
                  }}
                >
                  Trust is the first currency.
                </div>

                <div
                  style={{
                    marginTop: 10,
                    fontSize: 15,
                    lineHeight: 1.75,
                    color: "rgba(255,255,255,0.92)",
                    maxWidth: 860,
                  }}
                >
                  GSN makes it visible, portable, and usable before trade,
                  support, or decision.
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  justifyContent: isCompact ? "flex-start" : "flex-end",
                }}
              >
                <span
                  style={{
                    ...badge(true),
                    background: "rgba(255,255,255,0.14)",
                    color: "#FFFFFF",
                  }}
                >
                  Portable Trust Identity
                </span>

                <span
                  style={{
                    ...badge(false),
                    background: "rgba(255,255,255,0.12)",
                    color: "#FFFFFF",
                  }}
                >
                  Merchant Verify
                </span>

                <span
                  style={{
                    ...badge(false),
                    background: "rgba(255,255,255,0.12)",
                    color: "#FFFFFF",
                  }}
                >
                  Current page: Dashboard
                </span>

                <span
                  style={{
                    ...badge(false),
                    background: "rgba(255,255,255,0.12)",
                    color: "#FFFFFF",
                  }}
                >
                  Current step: Review what matters now
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "220px minmax(0, 1fr)",
              gap: 18,
              alignItems: "start",
            }}
          >
            <div>
              <div
                style={{
                  width: "100%",
                  borderRadius: 34,
                  padding: 10,
                  border: "1px solid rgba(212,175,55,0.22)",
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
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onAvatarSelected}
                style={{ display: "none" }}
              />

              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setPictureOptionsOpen((prev) => !prev)}
                  style={{
                    ...secondaryBtn(false),
                    width: "100%",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Picture options</span>
                  <span>{pictureOptionsOpen ? "-" : "+"}</span>
                </button>
              </div>

              {pictureOptionsOpen ? (
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={openAvatarPicker}
                    style={subtleBtn(false)}
                  >
                    Upload
                  </button>

                  <button
                    type="button"
                    onClick={openAvatarPicker}
                    style={subtleBtn(false)}
                  >
                    Change
                  </button>

                  <button
                    type="button"
                    onClick={removeAvatar}
                    style={subtleBtn(!avatarSrc)}
                    disabled={!avatarSrc}
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </div>

            <div>
              <div style={sectionLabel()}>Identity Passport</div>

              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: isCompact ? 28 : 34,
                  lineHeight: 1.1,
                }}
              >
                {profileName}
              </div>

              {profileSecondary ? (
                <div
                  style={{
                    marginTop: 8,
                    color: "#64748B",
                    fontSize: 14,
                    lineHeight: 1.65,
                  }}
                >
                  {profileSecondary}
                </div>
              ) : null}

              <div
                style={{
                  marginTop: 10,
                  ...helperText(),
                  maxWidth: 860,
                }}
              >
                One view of identity, trust, and verification before trade,
                support, or decision.
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={badge(true)}>GMFN ID: {gmfnId}</span>
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    ...innerCard("linear-gradient(180deg, #12304D 0%, #0B1F33 100%)"),
                    border: "1px solid rgba(184,137,45,0.24)",
                    boxShadow: "0 16px 32px rgba(15,23,42,0.14)",
                  }}
                >
                  <div
                    style={{
                      ...sectionLabel(),
                      color: "rgba(226,232,240,0.82)",
                    }}
                  >
                    Trust & Verification
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                      gap: 10,
                    }}
                  >
                    <div style={statTile(openTrustTone.bg, openTrustTone.border)}>
                      <div style={sectionLabel()}>Open Trust</div>
                      <div
                        style={{
                          marginTop: 8,
                          color: openTrustTone.text,
                          fontSize: 30,
                          fontWeight: 900,
                          lineHeight: 1,
                        }}
                      >
                        {openTrust.classText}
                      </div>
                      <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                        Score: {openTrust.scoreText}
                      </div>
                      <div
                        style={{
                          marginTop: 6,
                          color: "#0B1F33",
                          fontSize: 13,
                          fontWeight: 700,
                          lineHeight: 1.45,
                        }}
                      >
                        {openTrust.statusText}
                      </div>
                    </div>

                    <div style={statTile(cciTone.bg, cciTone.border)}>
                      <div style={sectionLabel()}>CCI</div>
                      <div
                        style={{
                          marginTop: 8,
                          color: cciTone.text,
                          fontSize: 30,
                          fontWeight: 900,
                          lineHeight: 1,
                        }}
                      >
                        {cci.classText}
                      </div>
                      <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                        Score: {cci.scoreText}
                      </div>
                      <div
                        style={{
                          marginTop: 6,
                          color: "#0B1F33",
                          fontSize: 13,
                          fontWeight: 700,
                          lineHeight: 1.45,
                        }}
                      >
                        {cci.statusText}
                      </div>
                    </div>

                    <div
                      style={statTile(
                        "#F8FBFF",
                        "1px solid rgba(11,99,209,0.10)"
                      )}
                    >
                      <div style={sectionLabel()}>TrustSlip</div>
                      <div
                        style={{
                          marginTop: 8,
                          color: "#0B1F33",
                          fontSize: 24,
                          fontWeight: 900,
                          lineHeight: 1.1,
                          wordBreak: "break-word",
                        }}
                      >
                        {trustSlipCode || "Pending"}
                      </div>
                      <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                        {verificationStatus}
                      </div>
                      <div
                        style={{
                          marginTop: 6,
                          color: "#0F3B74",
                          fontSize: 13,
                          fontWeight: 800,
                          lineHeight: 1.45,
                        }}
                      >
                        Portable verification record
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    position: "relative",
                    ...innerCard(
                      "linear-gradient(135deg, #F4F8FD 0%, #E7F0FB 40%, #FDFEFF 100%)"
                    ),
                    border: "1px solid rgba(15,59,116,0.18)",
                    boxShadow:
                      "0 20px 42px rgba(15,59,116,0.10), inset 0 1px 0 rgba(255,255,255,0.92)",
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
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "96px minmax(0, 1fr)"
                        : "112px minmax(0, 1fr)",
                      gap: 16,
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        ...innerCard(
                          "linear-gradient(180deg, #0A1625 0%, #11263B 100%)"
                        ),
                        border: "1px solid rgba(212,175,55,0.26)",
                        boxShadow: "0 20px 38px rgba(2,12,27,0.30)",
                        padding: 12,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {trustSlipCode ? (
                        <img
                          src={`${apiOrigin()}/trust-slips/verify/${encodeURIComponent(
                            trustSlipCode
                          )}/qr.png`}
                          alt="Trust QR"
                          style={{
                            width: 88,
                            height: 88,
                            borderRadius: 12,
                            border: "1px solid rgba(212,175,55,0.16)",
                            background: "#FFFFFF",
                            padding: 4,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 88,
                            height: 88,
                            borderRadius: 12,
                            border: "1px solid rgba(212,175,55,0.24)",
                            background:
                              "linear-gradient(180deg, #11263B 0%, #193A58 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#F8FBFF",
                            fontSize: 12,
                            textAlign: "center",
                            padding: 8,
                          }}
                        >
                          QR loading
                        </div>
                      )}

                      <div
                        style={{
                          fontSize: 12,
                          color: "#F8FBFF",
                          fontWeight: 900,
                          textAlign: "center",
                          letterSpacing: 0.15,
                        }}
                      >
                        Scan to verify
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ ...badge(true), background: "rgba(226,240,255,0.96)", color: "#16324F", border: "1px solid rgba(22,50,79,0.10)", boxShadow: "0 8px 18px rgba(15,23,42,0.08)" }}>Verification Dock</span>
                        <span
                          style={{
                            ...badge(false),
                            background: "rgba(255,244,214,0.96)",
                            color: "#7A4B00",
                            border: "1px solid rgba(184,137,45,0.24)",
                            boxShadow: "0 8px 18px rgba(15,23,42,0.08)",
                          }}
                        >
                          {verificationStatus}
                        </span>
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          color: "#102A43",
                          fontSize: 21,
                          fontWeight: 900,
                          lineHeight: 1.22,
                        }}
                      >
                        Keep your verification record visible, readable, and ready to share.
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          color: "#28445E",
                          fontSize: 14,
                          lineHeight: 1.78,
                          maxWidth: 760,
                        }}
                      >
                        Use this verification dock to open trust explanation, read integrity status, and share your verification record when someone needs confirmation.
                      </div>

                      <div
                        style={{
                          marginTop: 14,
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <OriginLink to="/app/trust" style={primaryBtn(false)}>
                          Open Trust Passport
                        </OriginLink>

                        <OriginLink to="/app/identity" style={{ ...secondaryBtn(false), background: "#FFFFFF", color: "#14324C", border: "1px solid rgba(15,59,116,0.18)", boxShadow: "0 10px 20px rgba(15,23,42,0.08)" }}>
                          Open CCI
                        </OriginLink>

                        <OriginLink to="/app/trust-slip" style={{ ...secondaryBtn(false), background: "#FFFFFF", color: "#14324C", border: "1px solid rgba(15,59,116,0.18)", boxShadow: "0 10px 20px rgba(15,23,42,0.08)" }}>
                          Open TrustSlip
                        </OriginLink>

                        {merchantVerifyHref ? (
                          <a
                            href={merchantVerifyHref}
                            target="_blank"
                            rel="noreferrer"
                            style={{ ...secondaryBtn(false), background: "#FFFFFF", color: "#14324C", border: "1px solid rgba(15,59,116,0.18)", boxShadow: "0 10px 20px rgba(15,23,42,0.08)" }}
                          >
                            Merchant Verify
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #EEF5FF 100%)")}
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
            <div style={sectionLabel()}>Spotlight</div>
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                lineHeight: 1.7,
                fontSize: 14,
                maxWidth: 780,
              }}
            >
              Spotlight is the main visibility window for trusted value in the
              marketplace. It should feel premium, clear, and instantly
              actionable.
            </div>
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
                  style={secondaryBtn(false)}
                >
                  Next
                </button>
              </>
            ) : null}

            <button
              type="button"
              onClick={() =>
                updateUiState({ spotlightMinimized: showSpotlight })
              }
              style={secondaryBtn(false)}
            >
              {showSpotlight ? "Minimize spotlight" : "Open spotlight"}
            </button>
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
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <span style={badge(true)}>Spotlight Visibility</span>
                  <span style={badge(false)}>Reputation-Based Visibility</span>
                </div>

                <div
                  style={{
                    marginTop: 10,
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
                  onClick={() =>
                    updateUiState({ spotlightMinimized: false })
                  }
                  style={primaryBtn(false)}
                >
                  Open spotlight
                </button>

                <button
                  type="button"
                  style={secondaryBtn(
                    !safeStr(activeSpotlight?.author_gmfn_id || "")
                  )}
                  onClick={openSpotlightShop}
                  disabled={!safeStr(activeSpotlight?.author_gmfn_id || "")}
                >
                  Open shop
                </button>
              </div>
            </div>
          </div>
        ) : spotlightLoading ? (
          <div style={{ marginTop: 16, color: "#64748B" }}>
            Loading spotlight...
          </div>
        ) : activeSpotlight ? (
          <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
            <div
              style={{
                position: "relative",
                width: "100%",
                minHeight: isCompact ? 320 : 450,
                borderRadius: 36,
                overflow: "hidden",
                border: "1px solid rgba(184,137,45,0.32)",
                outline: "1px solid rgba(255,255,255,0.14)",
                outlineOffset: "-8px",
                background:
                  "linear-gradient(180deg, #081625 0%, #0D2742 42%, #0F3B74 74%, #0B63D1 100%)",
                boxShadow:
                  "0 34px 70px rgba(2,12,27,0.30), 0 14px 34px rgba(15,59,116,0.20), inset 0 0 0 1px rgba(255,255,255,0.10), inset 0 1px 0 rgba(255,255,255,0.16)",
              }}
            >
              {spotlightImageCandidates.length > 0 ? (
                <RotatingSpotlightImage
                  candidates={spotlightImageCandidates}
                  alt={safeStr(
                    activeSpotlight?.title ||
                      activeSpotlight?.message ||
                      "Spotlight"
                  )}
                  style={{
                    width: "100%",
                    height: "100%",
                    minHeight: isCompact ? 320 : 450,
                    objectFit: "cover",
                    objectPosition: "center 20%",
                    display: "block",
                  }}
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
                  top: 18,
                  left: 18,
                  right: 18,
                  display: "flex",
                  justifyContent: "space-between",
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
                  }}
                >
                  <span
                    style={{
                      ...badge(true),
                      background: "rgba(255,255,255,0.16)",
                      color: "#FFFFFF",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    Spotlight Visibility
                  </span>

                  <span
                    style={{
                      ...badge(false),
                      background: "rgba(255,255,255,0.12)",
                      color: "#FFFFFF",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    Reputation-Based Visibility
                  </span>

                  <span
                    style={{
                      ...badge(false),
                      background: "rgba(255,255,255,0.12)",
                      color: "#FFFFFF",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    One Global Shop
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    justifyContent: isCompact ? "flex-start" : "flex-end",
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
                    {safeStr(activeSpotlight.trust_band || "Trusted member")}
                  </span>

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
                </div>
              </div>

              <div
                style={{
                  position: "absolute",
                  left: 20,
                  right: 20,
                  bottom: 20,
                  display: "grid",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    color: "rgba(255,255,255,0.92)",
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: 0.35,
                    textTransform: "uppercase",
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
                    color: "#FFFFFF",
                    fontWeight: 900,
                    fontSize: isCompact ? 30 : 44,
                    lineHeight: 1.08,
                    maxWidth: 900,
                    textShadow: "0 10px 28px rgba(0,0,0,0.32)",
                  }}
                >
                  {safeStr(
                    activeSpotlight.title ||
                      activeSpotlight.message ||
                      "Community Spotlight"
                  )}
                </div>

                <div
                  style={{
                    color: "rgba(255,255,255,0.90)",
                    fontSize: 15,
                    lineHeight: 1.75,
                    maxWidth: 860,
                  }}
                >
                  {safeStr(
                    activeSpotlight.body ||
                      activeSpotlight.message ||
                      "No extra detail is available yet."
                  )}
                </div>
              </div>
            </div>

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
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  background:
                    "linear-gradient(90deg, #0F3B74 0%, #0B63D1 50%, #93C5FD 100%)",
                }}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                    minWidth: 0,
                  }}
                >
                  <span style={badge(true)}>Seller Identity Dock</span>
                  <span
                    style={{
                      ...badge(false),
                      background: "rgba(15,59,116,0.08)",
                      color: "#0F3B74",
                    }}
                  >
                    Trusted visibility
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: isCompact ? "flex-start" : "flex-end",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSellerIdentityDockOpen((prev) => !prev)}
                    style={{
                      ...secondaryBtn(false),
                      minWidth: 138,
                      flexShrink: 0,
                    }}
                  >
                    {sellerIdentityDockOpen ? "Collapse dock" : "Open dock"}
                  </button>
                </div>
              </div>

              {sellerIdentityDockOpen ? (
                <div
                  style={{
                    marginTop: 14,
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
                      minHeight: 220,
                      boxShadow: "0 18px 36px rgba(2,12,27,0.24)",
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
                      <span style={badge(true)}>Visibility & Action</span>
                      <span
                        style={{
                          ...badge(false),
                          background: "rgba(212,175,55,0.10)",
                          color: "#F6D77A",
                        }}
                      >
                        Reputation-based presence
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        color: "#F8FBFF",
                        fontWeight: 900,
                        fontSize: 18,
                        lineHeight: 1.3,
                      }}
                    >
                      Featured visibility before the buyer decides.
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        color: "#F8FBFF",
                        fontSize: 14,
                        lineHeight: 1.78,
                      }}
                    >
                      Spotlight should help the right goods, services, and
                      merchants become visible with more confidence. It is not
                      just display; it is visible reputation, visible trust, and
                      visible market presence before action.
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={badge(true)}>Spotlight Visibility</span>
                      <span
                        style={{
                          ...badge(false),
                          background: "rgba(212,175,55,0.10)",
                          color: "#F6D77A",
                        }}
                      >
                        Reputation-Based Visibility
                      </span>
                      <span
                        style={{
                          ...badge(false),
                          background: "rgba(255,255,255,0.10)",
                          color: "#F8FBFF",
                        }}
                      >
                        One Global Shop
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 14,
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      <button
                        type="button"
                        style={primaryBtn(
                          !safeStr(activeSpotlight.author_gmfn_id || "")
                        )}
                        onClick={openSpotlightShop}
                        disabled={!safeStr(activeSpotlight.author_gmfn_id || "")}
                      >
                        Open shop
                      </button>

                      <button
                        type="button"
                        onClick={openSpotlightMarketplace}
                        style={secondaryBtn(false)}
                      >
                        Open marketplace
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateUiState({ spotlightMinimized: true })
                        }
                        style={subtleBtn(false)}
                      >
                        Minimize spotlight
                      </button>
                    </div>
                  </div>

                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 16, color: "#64748B" }}>
            No active spotlight is available yet.
          </div>
        )}
      </section>

      <section
        style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #EEF5FF 100%)")}
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
            <div style={{ ...sectionLabel(), color: "#0F3B74" }}>Demand Control</div>
            <div style={{ marginTop: 8, ...helperText(), maxWidth: 760 }}>
              Read the live need signal in your community and decide whether to review, respond, or return later.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(true)}>Open requests: {demandItems.length}</span>
            <span style={badge(false)}>
              Urgent now: {demandItems.filter((item) => safeStr(item.urgency).toLowerCase() === "high").length}
            </span>
          </div>
        </div>
        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.1fr) minmax(280px, 0.9fr)",
            gap: 14,
            alignItems: "start",
          }}
        >
          <div
            style={{
              ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F6FAFF 100%)"),
              border: "1px solid rgba(11,99,209,0.12)",
              boxShadow: "0 14px 30px rgba(11,99,209,0.05)",
            }}
          >
            <div style={{ ...sectionLabel(), color: "#0F3B74" }}>Current request</div>
            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontSize: 20,
                fontWeight: 900,
                lineHeight: 1.3,
              }}
            >
              {safeStr(
                demandItems[0]?.title || "No open request is pressing right now"
              )}
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#35516B",
                fontSize: 14,
                lineHeight: 1.75,
                maxWidth: 760,
              }}
            >
              {safeStr(
                demandItems[0]?.description ||
                  "No request is pressing right now. You can open Demand Box to create one or review the wider queue."
              )}
            </div>
            {demandItems[0] ? (
              <div
                style={{
                  marginTop: 10,
                  color: "#4C647B",
                  fontSize: 13,
                  lineHeight: 1.65,
                  maxWidth: 760,
                }}
              >
                {safeStr(demandItems[0]?.requester_name || demandItems[0]?.requester_nickname)
                  ? `A member in ${currentCommunityName(currentClan, selectedClanId)} raised this request${safeDateTime(demandItems[0]?.created_at) ? ` on ${safeDateTime(demandItems[0]?.created_at)}` : ""}.`
                  : `This request is active in ${currentCommunityName(currentClan, selectedClanId)}${safeDateTime(demandItems[0]?.created_at) ? ` since ${safeDateTime(demandItems[0]?.created_at)}` : ""}.`}
              </div>
            ) : null}
            {demandItems[0] ? (
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={badge(true)}>
                  {safeStr(demandItems[0]?.urgency).toLowerCase() === "high"
                    ? "Urgent"
                    : "Normal"}
                </span>
                {safeStr(demandItems[0]?.requester_name || demandItems[0]?.requester_nickname) ? (
                  <span style={badge(false)}>
                    Raised by {safeStr(demandItems[0]?.requester_name || demandItems[0]?.requester_nickname)}
                  </span>
                ) : null}
                <span style={badge(false)}>
                  {currentCommunityName(currentClan, selectedClanId)}
                </span>
                {safeDateTime(demandItems[0]?.created_at) ? (
                  <span style={badge(false)}>{safeDateTime(demandItems[0]?.created_at)}</span>
                ) : null}
              </div>
            ) : null}
          </div>
          <div
            style={{
              ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #FCFEFF 100%)"),
              border: "1px solid rgba(15,59,116,0.18)",
            }}
          >
            <div style={{ ...sectionLabel(), color: "#0F3B74" }}>What you can do now</div>
            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontSize: 18,
                fontWeight: 900,
                lineHeight: 1.3,
              }}
            >
              {demandItems.length > 1
                ? demandItems.filter((item) => safeStr(item.urgency).toLowerCase() === "high").length > 0
                  ? "High-pressure requests need review now."
                  : "Several open requests are waiting for review in your community."
                : demandItems.length === 1
                ? "This request is waiting for your decision."
                : "No live request is pressing right now."}
            </div>
            <div style={{ marginTop: 10, ...helperText() }}>
              {demandItems.length > 1
                ? "Open the queue and start with the strongest live need first."
                : demandItems.length === 1
                ? "Check the details and decide whether to respond now or continue later."
                : "Create a new request or open Demand Box to review the wider queue."}
            </div>
            <div style={{ marginTop: 14 }}>
              <OriginLink
                to={demandItems.length === 0 ? "/app/demand-box#demand-box-create" : DASHBOARD_TARGETS.DEMAND_BOX}
                style={primaryBtn(false)}
              >
                {demandItems.length > 1
                  ? "Review open demands"
                  : demandItems.length === 1
                  ? "Open Demand Box"
                  : "Create demand"}
              </OriginLink>
            </div>
          </div>
        </div>
      </section>

      <section
        style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #EEF5FF 100%)")}
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
            <div style={sectionLabel()}>What Matters Now</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Organised signals from spotlight demand, demand box, join links,
              trust events, open finance, community voting, and other dashboard
              signals.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() =>
                updateUiState({ inboxExpanded: !uiState.inboxExpanded })
              }
              style={secondaryBtn(false)}
            >
              {uiState.inboxExpanded ? "Collapse notifications" : "Open notifications"}
            </button>

            <OriginLink
              to={DASHBOARD_TARGETS.WHAT_MATTERS_NOW}
              style={primaryBtn(false)}
            >
              Open What Matters Now
            </OriginLink>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr 1fr"
              : "repeat(4, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <div
            style={statTile("#FFF5F5", "1px solid rgba(239,68,68,0.16)")}
          >
            <div style={sectionLabel()}>Act now</div>
            <div
              style={{
                marginTop: 8,
                color: "#991B1B",
                fontWeight: 900,
                fontSize: 24,
              }}
            >
              {dashboardNoticeSummary.counts.actNow}
            </div>
            <div style={{ marginTop: 6, ...helperText(), fontSize: 12 }}>
              Direct blockers and waiting actions
            </div>
          </div>

          <div
            style={statTile("#FFFBEF", "1px solid rgba(245,158,11,0.16)")}
          >
            <div style={sectionLabel()}>Due soon</div>
            <div
              style={{
                marginTop: 8,
                color: "#92400E",
                fontWeight: 900,
                fontSize: 24,
              }}
            >
              {dashboardNoticeSummary.counts.dueSoon}
            </div>
            <div style={{ marginTop: 6, ...helperText(), fontSize: 12 }}>
              Important items that should not drift
            </div>
          </div>

          <div
            style={statTile("#F7FAFF", "1px solid rgba(11,99,209,0.14)")}
          >
            <div style={sectionLabel()}>Watch</div>
            <div
              style={{
                marginTop: 8,
                color: "#0B63D1",
                fontWeight: 900,
                fontSize: 24,
              }}
            >
              {dashboardNoticeSummary.counts.watch}
            </div>
            <div style={{ marginTop: 6, ...helperText(), fontSize: 12 }}>
              Signals already moving
            </div>
          </div>

          <div
            style={statTile("#F8FAFC", "1px solid rgba(148,163,184,0.16)")}
          >
            <div style={sectionLabel()}>Unread</div>
            <div
              style={{
                marginTop: 8,
                color: "#334155",
                fontWeight: 900,
                fontSize: 24,
              }}
            >
              {dashboardNoticeSummary.counts.unread}
            </div>
            <div style={{ marginTop: 6, ...helperText(), fontSize: 12 }}>
              Unread dashboard-linked items
            </div>
          </div>
        </div>

        {guidanceError ? (
          <div
            style={{
              marginTop: 14,
              ...softCard("#FEF2F2"),
              color: "#991B1B",
              border: "1px solid rgba(239,68,68,0.16)",
              fontWeight: 800,
            }}
          >
            {guidanceError}
          </div>
        ) : guidanceLoading && !guidancePulse ? (
          <div style={{ marginTop: 14, color: "#64748B", lineHeight: 1.8 }}>
            Preparing your guided focus...
          </div>
        ) : uiState.inboxExpanded ? (
          <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
            {guidancePulse ? (
              <div
                style={{
                  ...innerCard(
                    guidancePulse.severity === "urgent"
                      ? "linear-gradient(180deg, #FFF5F5 0%, #FFFFFF 100%)"
                      : guidancePulse.severity === "important"
                      ? "linear-gradient(180deg, #FFFBEF 0%, #FFFFFF 100%)"
                      : "linear-gradient(180deg, #F7FAFF 0%, #FFFFFF 100%)"
                  ),
                  border:
                    guidancePulse.severity === "urgent"
                      ? "1px solid rgba(239,68,68,0.16)"
                      : guidancePulse.severity === "important"
                      ? "1px solid rgba(245,158,11,0.16)"
                      : "1px solid rgba(11,99,209,0.12)",
                  boxShadow:
                    guidancePulse.severity === "urgent"
                      ? "0 14px 28px rgba(239,68,68,0.06)"
                      : guidancePulse.severity === "important"
                      ? "0 14px 28px rgba(245,158,11,0.06)"
                      : "0 14px 28px rgba(11,99,209,0.05)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      ...badge(true),
                      background:
                        guidancePulse.severity === "urgent"
                          ? "rgba(220,38,38,0.10)"
                          : guidancePulse.severity === "important"
                          ? "rgba(245,158,11,0.14)"
                          : "rgba(11,99,209,0.10)",
                      color:
                        guidancePulse.severity === "urgent"
                          ? "#B91C1C"
                          : guidancePulse.severity === "important"
                          ? "#92400E"
                          : "#0B63D1",
                    }}
                  >
                    {guidancePulse.severity}
                  </span>

                  <span style={badge(false)}>Highlighted now</span>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    color: "#0B1F33",
                    fontSize: isCompact ? 22 : 28,
                    fontWeight: 900,
                    lineHeight: 1.15,
                  }}
                >
                  {guidancePulse.title}
                </div>

                <div style={{ marginTop: 10, ...helperText() }}>
                  {guidancePulse.nowLine}
                </div>
              </div>
            ) : (
              <div style={innerCard("#FCFEFF")}>
                <div style={helperText()}>
                  No urgent step is blocking you right now.
                </div>
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {(["actNow", "dueSoon", "watch", "unread"] as DashboardNoticeBucket[]).map(
                (bucket) => {
                  const meta = dashboardNoticeMeta(bucket);
                  const rows =
                    bucket === "actNow"
                      ? dashboardNoticeSummary.actNow
                      : bucket === "dueSoon"
                      ? dashboardNoticeSummary.dueSoon
                      : bucket === "watch"
                      ? dashboardNoticeSummary.watch
                      : dashboardNoticeSummary.unread;
                  const count =
                    bucket === "actNow"
                      ? dashboardNoticeSummary.counts.actNow
                      : bucket === "dueSoon"
                      ? dashboardNoticeSummary.counts.dueSoon
                      : bucket === "watch"
                      ? dashboardNoticeSummary.counts.watch
                      : dashboardNoticeSummary.counts.unread;

                  return (
                    <div
                      key={`dashboard-bucket-${bucket}`}
                      style={{
                        ...innerCard(meta.bg),
                        border: meta.border,
                        padding: 12,
                        boxShadow:
                          bucket === "actNow"
                            ? "0 10px 24px rgba(239,68,68,0.05)"
                            : bucket === "dueSoon"
                            ? "0 10px 24px rgba(245,158,11,0.05)"
                            : bucket === "watch"
                            ? "0 10px 24px rgba(11,99,209,0.05)"
                            : "0 10px 24px rgba(148,163,184,0.05)",
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
                            color: meta.text,
                            fontSize: 18,
                            fontWeight: 900,
                            lineHeight: 1.25,
                          }}
                        >
                          {meta.title}
                        </div>

                        <span style={badge(bucket === "actNow")}>{count}</span>
                      </div>

                      <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                        {meta.detail}
                      </div>

                      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                        {noticesLoading && count === 0 ? (
                          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                            Loading signals...
                          </div>
                        ) : rows.length > 0 ? (
                          rows.map(renderDashboardNoticeCard)
                        ) : (
                          <div style={innerCard("#FFFFFF")}>
                            <div style={helperText()}>
                              Nothing is sitting in this bucket right now.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            <div
              style={{
                ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"),
                border: "1px solid rgba(11,99,209,0.10)",
              }}
            >
              <div style={sectionLabel()}>Next step</div>

              <div
                style={{
                  marginTop: 10,
                  color: "#0B1F33",
                  fontSize: 18,
                  fontWeight: 900,
                  lineHeight: 1.32,
                }}
              >
                {weeklyFocus?.title || "Next clean route"}
              </div>

              <div style={{ marginTop: 8, ...helperText() }}>
                {weeklyFocus?.detail ||
                  guidancePulse?.nextLine ||
                  "Keep tomorrow lighter by finishing the current step well."}
              </div>

              <div style={{ marginTop: 14 }}>
                <OriginLink to={nextRouteTo} style={secondaryBtn(false)}>
                  {nextRouteLabel}
                </OriginLink>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            <div
              style={{
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
                    lineHeight: 1.3,
                  }}
                >
                  {dashboardNoticeSummary.actNow[0]?.title ||
                    guidancePulse?.title ||
                    "No urgent dashboard signal right now"}
                </div>

                <span style={badge(true)}>
                  {dashboardNoticeSummary.counts.actNow > 0 ? "Act now" : "Calm"}
                </span>
              </div>

              <div style={{ marginTop: 8, ...helperText() }}>
                {dashboardNoticeSummary.actNow[0]?.detail ||
                  guidancePulse?.nowLine ||
                  "Open notifications to review your organised signals."}
              </div>
            </div>
          </div>
        )}
      </section>

      <section
        style={pageCard("linear-gradient(180deg, #12304D 0%, #0B1F33 100%)")}
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
                color: "rgba(226,232,240,0.82)",
              }}
            >
              Market Wisdom
            </div>
            <div
              style={{
                marginTop: 8,
                color: "rgba(226,232,240,0.76)",
                fontSize: 14,
                lineHeight: 1.75,
                maxWidth: 760,
              }}
            >
              Read one clear market signal first, then use the supporting insight only if it helps your next move.
            </div>
          </div>

          <span
            style={{
              ...badge(true),
              background: "rgba(255,255,255,0.12)",
              color: "#F4D58D",
              border: "1px solid rgba(184,137,45,0.28)",
            }}
          >
            Today
          </span>
        </div>

        <div
          style={{
            marginTop: 12,
            ...innerCard(
              "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)"
            ),
            border: "1px solid rgba(184,137,45,0.22)",
            padding: 16,
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 24px rgba(2,12,27,0.10)",
          }}
        >
          {activeWisdomTitle ? (
            <div
              style={{
                color: "#FFFFFF",
                fontSize: 20,
                fontWeight: 900,
                lineHeight: 1.28,
              }}
            >
              {activeWisdomTitle}
            </div>
          ) : null}

          <div
            style={{
              marginTop: activeWisdomTitle ? 8 : 0,
              color: "#F8FBFF",
              fontSize: 15,
              fontWeight: 800,
              lineHeight: 1.72,
              maxWidth: 860,
            }}
          >
            {guidancePulse?.wisdomLine || signalText}
          </div>

          {signalSupport ? (
            <div
              style={{
                marginTop: 8,
                color: "rgba(226,232,240,0.82)",
                fontSize: 13,
                lineHeight: 1.68,
                maxWidth: 760,
              }}
            >
              {signalSupport}
            </div>
          ) : null}

          {activeWisdomCapability ? (
            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  ...badge(false),
                  background: "rgba(184,137,45,0.18)",
                  color: "#F4D58D",
                  border: "1px solid rgba(184,137,45,0.22)",
                }}
              >
                Capability {activeWisdomCapability}
              </span>
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
                padding: "12px 14px",
                borderRadius: 16,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(191,219,254,0.16)",
              }}
            >
              <div>
                <div
                  style={{
                    color: "#F8FBFF",
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
                    color: "rgba(226,232,240,0.82)",
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
                  Turn goals into steadier follow-through after today's main signal is clear.
                </div>
              </div>

              <OriginLink
                to={`${DASHBOARD_TARGETS.DASHBOARD}#focus-commitments`}
                style={{
                  ...secondaryBtn(false),
                  background: "rgba(255,255,255,0.94)",
                  color: "#173654",
                  border: "1px solid rgba(23,54,84,0.14)",
                  boxShadow: "0 8px 18px rgba(15,23,42,0.06)",
                }}
              >
                Open Commitment Builder
              </OriginLink>
            </div>
          ) : null}
        </div>
      </section>

      <section
        id="operational-focus"
        style={pageCard("linear-gradient(180deg, #FFFFFF 0%, #F5F9FF 100%)")}
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
            <div style={sectionLabel()}>Operational Focus</div>
            <div style={{ marginTop: 8, ...helperText(), maxWidth: 840 }}>
              Priority routes, regular app pages, structured commitments, and trust
              consequence in one disciplined working view.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(true)}>{operationalClassLabel(userOperationalClass)}</span>
            <span style={badge(false)}>{focusSummary.nextReviewLabel}</span>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.18fr) minmax(340px, 0.82fr)",
            gap: 14,
            alignItems: "start",
          }}
        >
          <div
            id="priority-routes"
            style={{
              position: "relative",
              ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F3F8FF 100%)"),
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
                  "linear-gradient(90deg, #0F3B74 0%, #0B63D1 55%, #93C5FD 100%)",
              }}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div>
                <div style={sectionLabel()}>Priority Routes</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontSize: 21,
                    fontWeight: 900,
                    lineHeight: 1.25,
                  }}
                >
                  {priorityRoutes.title}
                </div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  {priorityRoutes.detail}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: isCompact ? "flex-start" : "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    updateUiState({ routesExpanded: !uiState.routesExpanded })
                  }
                  style={{
                    ...secondaryBtn(false),
                    minWidth: 146,
                    flexShrink: 0,
                  }}
                >
                  {uiState.routesExpanded ? "Collapse routes" : "Open routes"}
                </button>
              </div>
            </div>

            {uiState.routesExpanded ? (
              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => openTrackedRoute(priorityRoutes.primaryRoute)}
                  style={{
                    ...routeTile(true),
                    width: "100%",
                    minHeight: 132,
                    cursor: "pointer",
                    textAlign: "left",
                    background: "linear-gradient(180deg, #0F3B74 0%, #0B63D1 100%)",
                    boxShadow: "0 18px 34px rgba(11,99,209,0.16)",
                    border: "1px solid rgba(11,99,209,0.22)",
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
                        ...badge(true),
                        background: "rgba(255,255,255,0.16)",
                        color: "#FFFFFF",
                      }}
                    >
                      Primary route
                    </span>

                    <span
                      style={{
                        ...badge(false),
                        background: "rgba(255,255,255,0.12)",
                        color: "#FFFFFF",
                      }}
                    >
                      {operationalClassLabel(userOperationalClass)}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      color: "#FFFFFF",
                      fontSize: 22,
                      fontWeight: 900,
                      lineHeight: 1.2,
                    }}
                  >
                    {priorityRoutes.primaryRoute.label}
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      color: "rgba(255,255,255,0.88)",
                      fontSize: 14,
                      lineHeight: 1.75,
                    }}
                  >
                    {priorityRoutes.primaryRoute.detail}
                  </div>

                  {priorityRoutes.primaryRoute.reason ? (
                    <div
                      style={{
                        marginTop: 10,
                        color: "#BFDBFE",
                        fontSize: 13,
                        fontWeight: 900,
                        lineHeight: 1.6,
                      }}
                    >
                      {priorityRoutes.primaryRoute.reason}
                    </div>
                  ) : null}
                </button>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact
                      ? "1fr"
                      : "repeat(3, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  {priorityRoutes.supportingRoutes.map((route) => (
                    <button
                      key={`supporting-route-${route.key}`}
                      type="button"
                      onClick={() => openTrackedRoute(route)}
                      style={{
                        ...routeTile(false),
                        width: "100%",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          color: "#0B1F33",
                          fontWeight: 900,
                          fontSize: 15,
                          lineHeight: 1.3,
                        }}
                      >
                        {route.label}
                      </div>
                      <div style={{ marginTop: 8, ...helperText(), fontSize: 12 }}>
                        {route.detail}
                      </div>
                    </button>
                  ))}
                </div>

                <div>
                  <div style={sectionLabel()}>Other core routes</div>
                  <div
                    style={{
                      marginTop: 10,
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "repeat(2, minmax(0, 1fr))"
                        : "repeat(3, minmax(0, 1fr))",
                      gap: 10,
                    }}
                  >
                    {priorityRoutes.utilityRoutes.map((route) => (
                      <button
                        key={`utility-route-${route.key}`}
                        type="button"
                        onClick={() => openTrackedRoute(route)}
                        style={{
                          ...routeTile(false),
                          width: "100%",
                          minHeight: 82,
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <div
                          style={{
                            color: "#0B1F33",
                            fontWeight: 900,
                            fontSize: 14,
                            lineHeight: 1.25,
                          }}
                        >
                          {route.label}
                        </div>
                        <div style={{ marginTop: 8, ...helperText(), fontSize: 12 }}>
                          {route.detail}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                <div
                  style={{
                    ...innerCard("linear-gradient(180deg, #F7FAFF 0%, #FFFFFF 100%)"),
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
                    <div
                      style={{
                        color: "#0B1F33",
                        fontWeight: 900,
                        fontSize: 18,
                        lineHeight: 1.3,
                      }}
                    >
                      {priorityRoutes.primaryRoute.label}
                    </div>

                    <button
                      type="button"
                      onClick={() => openTrackedRoute(priorityRoutes.primaryRoute)}
                      style={primaryBtn(false)}
                    >
                      Open
                    </button>
                  </div>

                  <div style={{ marginTop: 8, ...helperText() }}>
                    {priorityRoutes.primaryRoute.detail}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact
                      ? "1fr"
                      : "repeat(2, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  {priorityRoutes.supportingRoutes.slice(0, 2).map((route) => (
                    <button
                      key={`supporting-preview-${route.key}`}
                      type="button"
                      onClick={() => openTrackedRoute(route)}
                      style={{
                        ...routeTile(false),
                        width: "100%",
                        minHeight: 84,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          color: "#0B1F33",
                          fontWeight: 900,
                          fontSize: 14,
                          lineHeight: 1.25,
                        }}
                      >
                        {route.label}
                      </div>

                      <div style={{ marginTop: 8, ...helperText(), fontSize: 12 }}>
                        {route.detail}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div
            id="most-used-apps"
            style={{
              position: "relative",
              ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)"),
              border: "1px solid rgba(11,31,51,0.10)",
              boxShadow: "0 14px 30px rgba(15,23,42,0.05)",
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
                  "linear-gradient(90deg, #0B1F33 0%, #24415C 55%, #94A3B8 100%)",
              }}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div>
                <div style={sectionLabel()}>Most Used Apps</div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  Regular pages you may want close at hand.
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  justifyContent: isCompact ? "flex-start" : "flex-end",
                }}
              >
                <span style={badge(false)}>
                  {appUsage.length > 0 ? "Usage-aware" : "Building usage"}
                </span>

                <OriginLink
                  to={DASHBOARD_TARGETS.FINANCE}
                  style={primaryBtn(false)}
                >
                  Open Finance
                </OriginLink>

                <button
                  type="button"
                  onClick={() =>
                    updateUiState({ appsExpanded: !uiState.appsExpanded })
                  }
                  style={{
                    ...secondaryBtn(false),
                    minWidth: 136,
                    flexShrink: 0,
                  }}
                >
                  {uiState.appsExpanded ? "Collapse apps" : "Open apps"}
                </button>
              </div>
            </div>

            {uiState.appsExpanded ? (
              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                {mostUsedApps.map((app) => (
                  <button
                    key={`most-used-app-${app.key}`}
                    type="button"
                    onClick={() => openTrackedApp(app)}
                    style={{
                      ...routeTile(false),
                      width: "100%",
                      minHeight: 100,
                      cursor: "pointer",
                      textAlign: "left",
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
                          fontWeight: 900,
                          fontSize: 15,
                          lineHeight: 1.3,
                        }}
                      >
                        {app.label}
                      </div>

                      <span style={badge(app.count > 0)}>
                        {app.count > 0
                          ? `${app.count} open${app.count === 1 ? "" : "s"}`
                          : "Common"}
                      </span>
                    </div>

                    <div style={{ marginTop: 8, ...helperText(), fontSize: 12 }}>
                      {app.detail}
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        color: "#64748B",
                        fontSize: 12,
                        fontWeight: 800,
                        lineHeight: 1.5,
                      }}
                    >
                      {app.lastOpenedAt
                        ? `Last opened ${safeDateTime(app.lastOpenedAt)}`
                        : "Ready when you need it"}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                <div
                  style={{
                    ...innerCard("linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)"),
                    border: "1px solid rgba(15,59,116,0.18)",
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
                        lineHeight: 1.3,
                      }}
                    >
                      Most used right now
                    </div>

                    <span style={badge(true)}>
                      {mostUsedApps[0]?.label || "Apps ready"}
                    </span>
                  </div>

                  <div style={{ marginTop: 8, ...helperText() }}>
                    Keep the full app set one click away, but let the card collapse to
                    the pages you actually use most.
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact
                      ? "1fr"
                      : "repeat(2, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  {mostUsedAppPreview.map((app) => (
                    <button
                      key={`most-used-app-preview-${app.key}`}
                      type="button"
                      onClick={() => openTrackedApp(app)}
                      style={{
                        ...routeTile(false),
                        width: "100%",
                        minHeight: 92,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          color: "#0B1F33",
                          fontWeight: 900,
                          fontSize: 15,
                          lineHeight: 1.3,
                        }}
                      >
                        {app.label}
                      </div>

                      <div style={{ marginTop: 8, ...helperText(), fontSize: 12 }}>
                        {app.detail}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
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
              <div>
                <div style={sectionLabel()}>Focus Commitments</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontSize: 20,
                    fontWeight: 900,
                    lineHeight: 1.25,
                  }}
                >
                  Train execution, not just intention.
                </div>
                <div style={{ marginTop: 8, ...helperText(), maxWidth: 860 }}>
                  Keep one or two structured targets visible, review them weekly or
                  monthly, and let the dashboard reflect whether your commitments are
                  being kept.
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={badge(true)}>Max 2 active</span>
                <button
                  type="button"
                  onClick={() => setFocusComposerOpen((prev) => !prev)}
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
                gridTemplateColumns: isCompact
                  ? "1fr 1fr"
                  : "repeat(4, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <div style={statTile("#F3FBF5", "1px solid rgba(34,197,94,0.16)")}>
                <div style={sectionLabel()}>On track</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#166534",
                    fontWeight: 900,
                    fontSize: 24,
                  }}
                >
                  {focusSummary.onTrackCount}
                </div>
                <div style={{ marginTop: 6, ...helperText(), fontSize: 12 }}>
                  Visible commitments keeping pace
                </div>
              </div>

              <div style={statTile("#FFFBEF", "1px solid rgba(245,158,11,0.16)")}>
                <div style={sectionLabel()}>Watch</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#92400E",
                    fontWeight: 900,
                    fontSize: 24,
                  }}
                >
                  {focusSummary.watchCount}
                </div>
                <div style={{ marginTop: 6, ...helperText(), fontSize: 12 }}>
                  Nearer to deadline or review
                </div>
              </div>

              <div style={statTile("#FFF5F5", "1px solid rgba(239,68,68,0.16)")}>
                <div style={sectionLabel()}>Behind</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#991B1B",
                    fontWeight: 900,
                    fontSize: 24,
                  }}
                >
                  {focusSummary.behindCount}
                </div>
                <div style={{ marginTop: 6, ...helperText(), fontSize: 12 }}>
                  Needs visible correction
                </div>
              </div>

              <div style={statTile("#F8FAFC", "1px solid rgba(148,163,184,0.16)")}>
                <div style={sectionLabel()}>Next review</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#334155",
                    fontWeight: 900,
                    fontSize: 14,
                    lineHeight: 1.45,
                  }}
                >
                  {focusSummary.nextReviewLabel}
                </div>
                <div style={{ marginTop: 6, ...helperText(), fontSize: 12 }}>
                  {focusSummary.disciplineLine}
                </div>
              </div>
            </div>

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
                    <div style={{ marginTop: 8, ...helperText() }}>
                      Keep it real, measurable, and time-bound.
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => prefillFocusDraft("savings")}
                      style={subtleBtn(false)}
                    >
                      Savings idea
                    </button>
                    <button
                      type="button"
                      onClick={() => prefillFocusDraft("business")}
                      style={subtleBtn(false)}
                    >
                      Business idea
                    </button>
                    <button
                      type="button"
                      onClick={() => prefillFocusDraft("repayment")}
                      style={subtleBtn(false)}
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

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => {
                        resetFocusDraft();
                        setFocusComposerOpen(false);
                      }}
                      style={secondaryBtn(false)}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={saveFocusCommitment}
                      style={primaryBtn(!safeStr(focusDraft.title) || activeFocusCount >= 2)}
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
                            ? "1fr"
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
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => submitFocusCheckIn(item.id)}
                          style={secondaryBtn(false)}
                        >
                          Check in
                        </button>

                        <button
                          type="button"
                          onClick={() => replanFocusCommitment(item.id)}
                          style={subtleBtn(false)}
                        >
                          Replan
                        </button>

                        <button
                          type="button"
                          onClick={() => completeFocusCommitment(item.id)}
                          style={primaryBtn(false)}
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
                    No active focus commitment is visible yet.
                  </div>

                  <div style={{ marginTop: 10, ...helperText(), color: "#F8FBFF", maxWidth: 860 }}>
                    Use one or two serious targets only. The point is not to collect
                    goals. The point is to build execution discipline that can later
                    support trust, savings behavior, repayment readiness, and more
                    dependable follow-through.
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => prefillFocusDraft("savings")}
                      style={secondaryBtn(false)}
                    >
                      Start savings target
                    </button>

                    <button
                      type="button"
                      onClick={() => prefillFocusDraft("business")}
                      style={secondaryBtn(false)}
                    >
                      Start business target
                    </button>

                    <button
                      type="button"
                      onClick={() => prefillFocusDraft("repayment")}
                      style={secondaryBtn(false)}
                    >
                      Start repayment target
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            id="trust-journey"
            style={{
              position: "relative",
              ...innerCard(
                trustJourneyModel.tone === "red"
                  ? "linear-gradient(180deg, #FFF5F5 0%, #FFFFFF 100%)"
                  : trustJourneyModel.tone === "yellow"
                  ? "linear-gradient(180deg, #FFFBEF 0%, #FFFFFF 100%)"
                  : "linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"
              ),
              border: trustJourneyTone.border,
              boxShadow:
                trustJourneyModel.tone === "red"
                  ? "0 16px 34px rgba(239,68,68,0.07)"
                  : trustJourneyModel.tone === "yellow"
                  ? "0 16px 34px rgba(245,158,11,0.07)"
                  : "0 16px 34px rgba(11,99,209,0.06)",
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
                  trustJourneyModel.tone === "red"
                    ? "linear-gradient(90deg, #991B1B 0%, #DC2626 55%, #FCA5A5 100%)"
                    : trustJourneyModel.tone === "yellow"
                    ? "linear-gradient(90deg, #92400E 0%, #F59E0B 55%, #FCD34D 100%)"
                    : "linear-gradient(90deg, #166534 0%, #0B63D1 55%, #93C5FD 100%)",
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
                <div style={sectionLabel()}>Trust Journey</div>
                <div
                  style={{
                    marginTop: 8,
                    color: trustJourneyTone.text,
                    fontSize: 22,
                    fontWeight: 900,
                    lineHeight: 1.22,
                  }}
                >
                  {trustJourneyModel.postureTitle}
                </div>
                <div style={{ marginTop: 8, ...helperText(), maxWidth: 860 }}>
                  {trustJourneyModel.postureDetail}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  updateUiState({ trustExpanded: !uiState.trustExpanded })
                }
                style={secondaryBtn(false)}
              >
                {uiState.trustExpanded ? "Collapse trust detail" : "Open trust detail"}
              </button>
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
              <div style={statTile(openTrustTone.bg, openTrustTone.border)}>
                <div style={sectionLabel()}>Open Trust</div>
                <div
                  style={{
                    marginTop: 8,
                    color: openTrustTone.text,
                    fontWeight: 900,
                    fontSize: 24,
                    lineHeight: 1,
                  }}
                >
                  {openTrust.classText}
                </div>
                <div style={{ marginTop: 6, ...helperText(), fontSize: 12 }}>
                  {openTrust.statusText}
                </div>
              </div>

              <div style={statTile(cciTone.bg, cciTone.border)}>
                <div style={sectionLabel()}>CCI</div>
                <div
                  style={{
                    marginTop: 8,
                    color: cciTone.text,
                    fontWeight: 900,
                    fontSize: 24,
                    lineHeight: 1,
                  }}
                >
                  {cci.classText}
                </div>
                <div style={{ marginTop: 6, ...helperText(), fontSize: 12 }}>
                  {cci.statusText}
                </div>
              </div>

              <div style={statTile("#F8FBFF", "1px solid rgba(11,99,209,0.10)")}>
                <div style={sectionLabel()}>TrustSlip</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 18,
                    lineHeight: 1.3,
                    wordBreak: "break-word",
                  }}
                >
                  {trustSlipCode || "Pending"}
                </div>
                <div style={{ marginTop: 6, ...helperText(), fontSize: 12 }}>
                  {verificationStatus}
                </div>
              </div>

              <div
                style={statTile(
                  focusSummary.behindCount > 0
                    ? "#FFF5F5"
                    : focusSummary.watchCount > 0
                    ? "#FFFBEF"
                    : "#F3FBF5",
                  focusSummary.behindCount > 0
                    ? "1px solid rgba(239,68,68,0.16)"
                    : focusSummary.watchCount > 0
                    ? "1px solid rgba(245,158,11,0.16)"
                    : "1px solid rgba(34,197,94,0.16)"
                )}
              >
                <div style={sectionLabel()}>Commitment discipline</div>
                <div
                  style={{
                    marginTop: 8,
                    color:
                      focusSummary.behindCount > 0
                        ? "#991B1B"
                        : focusSummary.watchCount > 0
                        ? "#92400E"
                        : "#166534",
                    fontWeight: 900,
                    fontSize: 14,
                    lineHeight: 1.45,
                  }}
                >
                  {trustJourneyModel.commitmentLine}
                </div>
                <div style={{ marginTop: 6, ...helperText(), fontSize: 12 }}>
                  {focusSummary.nextReviewLabel}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Built: {trustJourney?.builtCount || 0}</span>
              <span style={badge(false)}>
                Protected: {trustJourney?.protectedCount || 0}
              </span>
              <span style={badge(false)}>
                Weakened: {trustJourney?.weakenedCount || 0}
              </span>
              <span style={badge(false)}>
                Repair: {trustJourney?.repairCount || 0}
              </span>
            </div>

            {uiState.trustExpanded ? (
              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "repeat(3, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                <div style={innerCard("#FFFFFF")}>
                  <div style={sectionLabel()}>What builds trust</div>
                  <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                    {trustJourneyModel.helps.length > 0 ? (
                      trustJourneyModel.helps.map((item, index) => (
                        <div key={`trust-help-${index}`} style={helperText()}>
                          {item}
                        </div>
                      ))
                    ) : (
                      <div style={helperText()}>
                        No strong positive trust movement explanation is visible right now.
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={innerCard(
                    trustJourneyModel.weakens.length > 0 ? "#FFFBEF" : "#FFFFFF"
                  )}
                >
                  <div style={sectionLabel()}>What weakens trust</div>
                  <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                    {trustJourneyModel.weakens.length > 0 ? (
                      trustJourneyModel.weakens.map((item, index) => (
                        <div key={`trust-weak-${index}`} style={helperText()}>
                          {item}
                        </div>
                      ))
                    ) : (
                      <div style={helperText()}>
                        No major trust drag is visible right now.
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"),
                    border: "1px solid rgba(11,99,209,0.10)",
                  }}
                >
                  <div style={sectionLabel()}>Best next trust action</div>

                  <div
                    style={{
                      marginTop: 10,
                      color: "#0B1F33",
                      fontSize: 18,
                      fontWeight: 900,
                      lineHeight: 1.3,
                    }}
                  >
                    {trustJourneyModel.primaryRoute.label}
                  </div>

                  <div style={{ marginTop: 8, ...helperText() }}>
                    {trustJourneyModel.primaryRoute.detail}
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => openTrackedRoute(trustJourneyModel.primaryRoute)}
                      style={primaryBtn(false)}
                    >
                      {trustJourneyModel.primaryRoute.label}
                    </button>

                    <button
                      type="button"
                      onClick={() => openTrackedRoute(trustJourneyModel.secondaryRoute)}
                      style={secondaryBtn(false)}
                    >
                      {trustJourneyModel.secondaryRoute.label}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 14 }}>
                <div
                  style={{
                    ...innerCard("#FFFFFF"),
                    border: trustJourneyTone.border,
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
                        lineHeight: 1.3,
                      }}
                    >
                      {trustJourneyModel.primaryRoute.label}
                    </div>

                    <button
                      type="button"
                      onClick={() => openTrackedRoute(trustJourneyModel.primaryRoute)}
                      style={primaryBtn(false)}
                    >
                      Open
                    </button>
                  </div>

                  <div style={{ marginTop: 8, ...helperText() }}>
                    {trustJourneyModel.primaryRoute.detail}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
} 


























