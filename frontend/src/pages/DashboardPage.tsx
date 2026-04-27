import React, { useEffect, useMemo, useRef, useState } from "react";
import DomainIntroToggle from "../components/DomainIntroToggle";
import GSNBrandMark from "../components/GSNBrandMark";
import NextActionGuide, {
  type NextActionGuideItem,
} from "../components/NextActionGuide";
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
  uploadMyProfileImageFile,
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
  type DashboardAttentionStoredState,
  defaultDashboardAttentionStoredState,
  markDashboardAttentionActed,
  markDashboardAttentionDismissed,
  markDashboardAttentionShown,
  normalizeDashboardAttentionStoredState,
} from "../lib/dashboardAttentionEngine";
import { prepareSpotlightImageFile } from "../lib/spotlightMediaPrep";
import {
  SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS,
  SPOTLIGHT_PILOT_REFRESH_MS,
  SPOTLIGHT_PILOT_ROTATION_MS,
  SPOTLIGHT_PILOT_ROTATION_SECONDS_LABEL,
} from "../lib/spotlightPilot";

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
  area?: string | null;
  payment_mode?: string | null;
  requester_trust_band?: string | null;
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

const DASHBOARD_UI_STORAGE_KEY = "gmfn.dashboard.ui.v4";
const DASHBOARD_AVATAR_STORAGE_KEY = "gmfn.member.avatar";
const DASHBOARD_ATTENTION_STORAGE_KEY = "gmfn.dashboard.attention.v2";
const DASHBOARD_FOCUS_COMMITMENTS_STORAGE_KEY =
  "gmfn.dashboard.focus-commitments.v1";
const DASHBOARD_FOCUS_EVENTS_STORAGE_KEY =
  "gmfn.dashboard.focus-events.v1";
const DASHBOARD_AVATAR_MAX_BYTES = 360 * 1024;
const DASHBOARD_AVATAR_MAX_DIMENSION = 1280;
const MARKET_WISDOM_ROTATION_MS = 45000;

const DASHBOARD_HELP_BODY =
  "Dashboard helps me keep my market life, community duties, shop chances, and trust record in one first look. In real life, I may not know what my friends have in their shops unless I travel there. I may forget a promise unless somebody reminds me. I may miss a need, a payment, or an act of kindness because life is busy. Dashboard brings those signals back before they disappear.";

const DASHBOARD_HELP_BULLETS = [
  "Market Wisdom reads the day for me. It turns the movement around my money, trust, community, shop, and attention into a plain signal before I start opening many pages.",
  "Community Home is where the working tools live. If I want to invite trusted people, manage my shop, prepare spotlight, choose a community, or open the marketplace from the right context, Dashboard points me there first.",
  "Spotlight is not just a display. It lets me see, from home, office, shop, or abroad, what trusted people in my community are showing, selling, or promoting. I can buy, support, or help resell without first walking to their shop.",
  "Focus Commitment keeps my promises beside me. Instead of depending only on memory, a spouse, or a friend to remind me, I can set a target, check in, adjust honestly, and let the app record the follow-through.",
  "Demand Box means opportunity can come from what people are asking for, not only what I already displayed. A need can become trade, supply, service, support, or a new responsibility I can answer.",
  "Notifications are event memory. They keep payment movement, requests, kindness, approvals, demand, spotlight, repayment, and unfinished duties from disappearing inside a busy day.",
  "If I borrow, lend, repay, support someone, or make a contribution from another city or country, Dashboard helps keep the evidence together. The record can later show what actually happened, not only what somebody remembers.",
  "TrustSlip is the proof layer behind the story. When these events show that I follow through, repay, respond, and support honestly, my TrustSlip has stronger evidence to carry when someone needs to trust me.",
];

const DASHBOARD_HELP_NOTE =
  "Innovation wedge: GSN turns informal community vouching into portable, verifiable trust evidence, especially for people who are normally invisible to formal credit systems.";

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
  COMMUNITY_SPOTLIGHT: "/app/community?guide=spotlight",
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
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
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
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
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
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
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

function storageIdentitySegment(value: unknown): string {
  const normalized = safeStr(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "visitor";
}

function dashboardUserStorageIdentity(user: any): string {
  return storageIdentitySegment(
    firstNonEmpty(
      user?.gmfn_id,
      user?.id,
      user?.email,
      user?.phone_number,
      user?.phone
    )
  );
}

function scopedDashboardStorageKey(baseKey: string, identity: string): string {
  return `${baseKey}.${storageIdentitySegment(identity)}`;
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

function dashboardAvatarStorageKeysForUser(user: any): string[] {
  const identityKeys = [
    user?.gmfn_id,
    user?.id,
    user?.email,
    user?.phone_e164,
    user?.phone_number,
    user?.phone,
    "visitor",
  ]
    .map((value) => storageIdentitySegment(value))
    .filter(Boolean);

  return Array.from(new Set(identityKeys)).map((identity) =>
    scopedDashboardStorageKey(DASHBOARD_AVATAR_STORAGE_KEY, identity)
  );
}

function readStoredImage(key: string | string[]): string {
  try {
    const keys = Array.isArray(key) ? key : [key];
    for (const item of keys) {
      const value = localStorage.getItem(item) || "";
      if (value) return value;
    }
    return "";
  } catch {
    return "";
  }
}

function writeStoredImage(key: string | string[], value: string): boolean {
  try {
    const keys = Array.isArray(key) ? key : [key];
    let wrote = false;
    for (const item of Array.from(new Set(keys)).filter(Boolean)) {
      localStorage.setItem(item, value);
      wrote = true;
    }
    return wrote;
  } catch {
    return false;
  }
}

function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      if (!result) {
        reject(new Error("Picture preparation failed right now."));
        return;
      }
      resolve(result);
    };
    reader.onerror = () =>
      reject(new Error("Picture preparation failed right now."));
    reader.readAsDataURL(file);
  });
}

function parseDashboardTimeMs(value: string): number {
  const ms = new Date(String(value || "")).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function latestDashboardAttentionQuietMs(
  state: DashboardAttentionStoredState
): number {
  return Math.max(
    parseDashboardTimeMs(state.lastDismissedAt),
    parseDashboardTimeMs(state.lastActedAt)
  );
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

function resolveDashboardAvatarSrc(user: any): string {
  return resolveSpotlightAssetUrl(
    firstNonEmpty(
      user?.profile_image_url,
      user?.avatar_url,
      user?.avatar,
    )
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

function spotlightMarketplaceTo(item: SpotlightItem | null): string {
  const verifiedClanId = positiveNumber(item?.source_clan_id || item?.clan_id);

  if (verifiedClanId > 0) {
    return `/app/marketplace/community/${verifiedClanId}`;
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

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedClanId = Number(getSelectedClanId() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });
  const [isPhone, setIsPhone] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 560;
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

  const dashboardStorageIdentity = useMemo(
    () => dashboardUserStorageIdentity(me),
    [me]
  );
  const dashboardIdentityReady = dashboardStorageIdentity !== "visitor";
  const dashboardAttentionStorageKey = useMemo(
    () =>
      scopedDashboardStorageKey(
        DASHBOARD_ATTENTION_STORAGE_KEY,
        dashboardStorageIdentity
      ),
    [dashboardStorageIdentity]
  );
  const dashboardAvatarStorageKey = useMemo(
    () =>
      scopedDashboardStorageKey(
        DASHBOARD_AVATAR_STORAGE_KEY,
        dashboardStorageIdentity
      ),
    [dashboardStorageIdentity]
  );
  const dashboardAvatarStorageKeys = useMemo(() => {
    const keys = dashboardAvatarStorageKeysForUser(me);
    return Array.from(
      new Set([
        DASHBOARD_AVATAR_STORAGE_KEY,
        dashboardAvatarStorageKey,
        ...keys,
      ])
    );
  }, [dashboardAvatarStorageKey, me]);
  const dashboardAttentionStorageKeyRef = useRef(dashboardAttentionStorageKey);

  const [spotlights, setSpotlights] = useState<SpotlightItem[]>([]);
  const [spotlightLoading, setSpotlightLoading] = useState<boolean>(false);
  const [spotlightIndex, setSpotlightIndex] = useState<number>(0);
  const [spotlightQueueTotal, setSpotlightQueueTotal] = useState<number>(0);
  const [latestSpotlightSnapshot, setLatestSpotlightSnapshot] =
    useState<SpotlightItem | null>(null);
  const spotlightsRef = useRef<SpotlightItem[]>([]);
  const latestSpotlightSnapshotRef = useRef<SpotlightItem | null>(null);

  const [pendingRequests, setPendingRequests] = useState<JoinRequestItem[]>([]);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [noticesLoading, setNoticesLoading] = useState<boolean>(false);
  const [noticeSourceOpenKey, setNoticeSourceOpenKey] = useState<string>("");

  const [demandItems, setDemandItems] = useState<DemandItem[]>([]);

  const [marketWisdomIndex, setMarketWisdomIndex] = useState<number>(0);
  const [marketWisdomSignalIndex, setMarketWisdomSignalIndex] =
    useState<number>(0);
  const [activeWisdom, setActiveWisdom] = useState<MarketWisdomPair | null>(
    null
  );
  const [sellerIdentityDockOpen, setSellerIdentityDockOpen] =
    useState<boolean>(true);
  const [spotlightGuideOpen, setSpotlightGuideOpen] = useState<boolean>(false);
  const [demandGuideOpen, setDemandGuideOpen] = useState<boolean>(false);

  const [avatarSrc, setAvatarSrc] = useState<string>("");
  const [avatarStatus, setAvatarStatus] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
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
        dashboardAttentionStorageKey,
        defaultDashboardAttentionStoredState()
      )
    )
  );
  const [attentionPopupVisible, setAttentionPopupVisible] =
    useState<boolean>(false);
  const [attentionClockMs, setAttentionClockMs] = useState<number>(() =>
    Date.now()
  );
  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 980);
      setIsPhone(window.innerWidth <= 560);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
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
    if (dashboardAttentionStorageKeyRef.current === dashboardAttentionStorageKey) {
      return;
    }

    dashboardAttentionStorageKeyRef.current = dashboardAttentionStorageKey;
    setAttentionPopupVisible(false);
    setAttentionState(
      normalizeDashboardAttentionStoredState(
        readLocalJSON(
          dashboardAttentionStorageKey,
          defaultDashboardAttentionStoredState()
        )
      )
    );
  }, [dashboardAttentionStorageKey]);

  useEffect(() => {
    writeLocalJSON(dashboardAttentionStorageKey, attentionState);
  }, [dashboardAttentionStorageKey, attentionState]);

  useEffect(() => {
    const backendAvatar = resolveDashboardAvatarSrc(me);
    const storedAvatar = readStoredImage(dashboardAvatarStorageKeys);
    const nextAvatar = backendAvatar || storedAvatar;
    setAvatarSrc(nextAvatar);

    if (backendAvatar) {
      writeStoredImage(dashboardAvatarStorageKeys, backendAvatar);
    }

    if (nextAvatar && !readStoredImage(dashboardAvatarStorageKey)) {
      writeStoredImage(dashboardAvatarStorageKey, nextAvatar);
    }
  }, [dashboardAvatarStorageKey, dashboardAvatarStorageKeys, me]);

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
    spotlightsRef.current = spotlights;
  }, [spotlights]);

  useEffect(() => {
    latestSpotlightSnapshotRef.current = latestSpotlightSnapshot;
  }, [latestSpotlightSnapshot]);

  useEffect(() => {
    let alive = true;
    let refreshTimer: number | null = null;

    async function refreshSpotlights() {
      if (!alive) return;
      if (
        spotlightsRef.current.length === 0 &&
        !latestSpotlightSnapshotRef.current
      ) {
        setSpotlightLoading(true);
      }

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
        const reportedTotal = Number(
          (res as any)?.active_total ??
            (res as any)?.matching_total ??
            (res as any)?.total ??
            items.length
        );

        setSpotlights(items);
        setSpotlightQueueTotal(
          Number.isFinite(reportedTotal)
            ? Math.max(items.length, reportedTotal)
            : items.length
        );

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
        setSpotlightQueueTotal(0);
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
      refreshTimer = window.setInterval(() => {
        void refreshSpotlights();
      }, SPOTLIGHT_PILOT_REFRESH_MS);
    }

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityRefresh);
    }

    return () => {
      alive = false;

      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleVisibilityRefresh);
        if (refreshTimer !== null) {
          window.clearInterval(refreshTimer);
        }
      }

      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityRefresh);
      }
    };
  }, [selectedClanId]);

  useEffect(() => {
    let alive = true;
    let refreshTimer: number | null = null;

    async function refreshPendingRequests() {
      if (!alive) return;

      if (!selectedClanId) {
        setPendingRequests([]);
        return;
      }

      try {
        const res = await getCommunityJoinRequests(selectedClanId).catch(() => ({
          items: [],
        }));

        if (!alive) return;

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
        if (alive) {
          setPendingRequests([]);
        }
      }
    }

    void refreshPendingRequests();

    function handleVisibilityRefresh() {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }

      void refreshPendingRequests();
    }

    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleVisibilityRefresh);
      refreshTimer = window.setInterval(() => {
        void refreshPendingRequests();
      }, 15000);
    }

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityRefresh);
    }

    return () => {
      alive = false;

      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleVisibilityRefresh);
        if (refreshTimer !== null) {
          window.clearInterval(refreshTimer);
        }
      }

      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityRefresh);
      }
    };
  }, [selectedClanId]);

  useEffect(() => {
    let alive = true;
    let refreshTimer: number | null = null;

    async function refreshNotices() {
      if (!alive) return;

      setNoticesLoading(true);

      try {
        const res = await getMyNotifications(12, false).catch(() => ({
          items: [],
        }));

        if (!alive) return;

        const rows: NoticeItem[] = Array.isArray((res as any)?.items)
          ? (res as any).items
          : Array.isArray(res)
          ? res
          : [];

        setNotices(rows);
      } finally {
        if (alive) {
          setNoticesLoading(false);
        }
      }
    }

    void refreshNotices();

    function handleVisibilityRefresh() {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }

      void refreshNotices();
    }

    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleVisibilityRefresh);
      refreshTimer = window.setInterval(() => {
        void refreshNotices();
      }, 15000);
    }

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityRefresh);
    }

    return () => {
      alive = false;

      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleVisibilityRefresh);
        if (refreshTimer !== null) {
          window.clearInterval(refreshTimer);
        }
      }

      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityRefresh);
      }
    };
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
    }, SPOTLIGHT_PILOT_ROTATION_MS);

    return () => window.clearInterval(timer);
  }, [spotlights.length]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMarketWisdomIndex((prev) => prev + 1);
    }, MARKET_WISDOM_ROTATION_MS);

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
  const profileInitials = useMemo(
    () => initialsFromName(resolveUserName(me)),
    [me]
  );

  const gmfnId = safeStr(me?.gmfn_id || "Pending");
  const visibleGsnId =
    gmfnId === "Pending" ? gmfnId : gmfnId.replace(/^GMF[MN]/i, "GSN");
  const trustSlipCode = safeStr(trustSlip?.code || "");
  const avatarInputId = "dashboard-avatar-upload-input";

  function trustWhiteBtn(minHeight = 34, fontSize = 13): React.CSSProperties {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight,
      padding: "6px 10px",
      borderRadius: 11,
      border: "1px solid rgba(11,99,209,0.14)",
      background:
        "linear-gradient(180deg, #FFFFFF 0%, #F4F8FC 100%)",
      color: "#123055",
      fontWeight: 900,
      fontSize,
      textDecoration: "none",
      cursor: "pointer",
      whiteSpace: "normal",
      textAlign: "center",
      boxShadow:
        "0 10px 20px rgba(10,24,49,0.08), inset 0 1px 0 rgba(255,255,255,0.86)",
      letterSpacing: 0.08,
    };
  }

  const trustMetricTile = (
    primary = false,
    accent: "gold" | "blue" | "steel" = "steel"
  ): React.CSSProperties => ({
    display: "grid",
    alignContent: "center",
    gap: isPhone ? 1 : 2,
    minHeight: isPhone ? 40 : 46,
    minWidth: 0,
    borderRadius: isPhone ? 12 : 14,
    padding: isPhone ? "6px 7px" : "7px 10px",
    background: primary
      ? "linear-gradient(180deg, rgba(246,215,122,0.22) 0%, rgba(225,185,72,0.14) 100%)"
      : accent === "blue"
      ? "linear-gradient(180deg, rgba(226,239,252,0.16) 0%, rgba(147,197,253,0.08) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.06) 100%)",
    border: primary
      ? "1px solid rgba(212,175,55,0.28)"
      : "1px solid rgba(255,255,255,0.14)",
    color: "#F8FBFF",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 16px rgba(2,12,27,0.10)",
  });

  const trustMetricLabel = (): React.CSSProperties => ({
    color: "rgba(226,232,240,0.68)",
    fontSize: isPhone ? 8.8 : 10,
    fontWeight: 900,
    letterSpacing: 0.26,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  });

  const trustMetricValue = (primary = false): React.CSSProperties => ({
    color: primary ? "#F6D77A" : "#FFFFFF",
    fontSize: isPhone ? 12 : 14,
    fontWeight: 950,
    lineHeight: 1.05,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  });

  const trustActionButton = (): React.CSSProperties =>
    dashboardFillButton(trustWhiteBtn(isPhone ? 34 : 30, isPhone ? 10.5 : 11), {
      minHeight: isPhone ? 34 : 30,
      padding: isPhone ? "5px 6px" : "6px 10px",
      borderRadius: isPhone ? 10 : 11,
      lineHeight: 1.08,
    });

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

  const myShopLink = "/app/shop-control";

  const unreadCount = useMemo(
    () => notices.filter((n) => !n?.is_read).length,
    [notices]
  );

  const trustExplainer = (guidance as any)?.trustChangeExplainer || null;
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
    openTrust,
    cci,
    trustExplainer,
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
  const dashboardNoticePhoneSummaryLine = useMemo(() => {
    if (dashboardNoticeTotalCount === 0) {
      return "No new notification is waiting right now.";
    }

    const firstSource = safeStr(
      dashboardNoticeSummary.actNow[0]?.source ||
        dashboardNoticeSummary.dueSoon[0]?.source ||
        dashboardNoticeSummary.unread[0]?.source ||
        dashboardNoticeSummary.allRows[0]?.source ||
        dashboardNoticeSourceGroups[0]?.title ||
        ""
    );
    const otherScreens = Math.max(dashboardNoticeSourceGroups.length - 1, 0);

    return `${dashboardNoticeTotalCount} notification${
      dashboardNoticeTotalCount === 1 ? "" : "s"
    } waiting${
      firstSource ? `. First: ${firstSource}` : ""
    }${
      otherScreens > 0
        ? ` + ${otherScreens} screen${otherScreens === 1 ? "" : "s"}`
        : ""
    }.`;
  }, [dashboardNoticeSourceGroups, dashboardNoticeSummary, dashboardNoticeTotalCount]);
  const dashboardNoticeLeadItem = useMemo(
    () =>
      dashboardNoticeSummary.actNow[0] ||
      dashboardNoticeSummary.dueSoon[0] ||
      dashboardNoticeSummary.unread[0] ||
      dashboardNoticeSummary.allRows[0] ||
      null,
    [dashboardNoticeSummary]
  );
  const dashboardNoticeLeadGroup = dashboardNoticeSourceGroups[0] || null;
  const dashboardNoticePrimaryActionTo =
    dashboardNoticeLeadItem?.ctaTo || DASHBOARD_TARGETS.WHAT_MATTERS_NOW;
  const dashboardNoticePrimaryActionLabel =
    dashboardNoticeLeadItem?.ctaLabel || "Open notifications";
  const notificationSurfaceChrome = useMemo(() => {
    if (dashboardNoticeSummary.counts.actNow > 0) {
      return {
        shellBg:
          "radial-gradient(circle at top left, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.00) 28%), linear-gradient(180deg, #F8FBFF 0%, #EEF5FD 54%, #DCEBFA 100%)",
        shellBorder: "1px solid rgba(11,99,209,0.14)",
        accent:
          "linear-gradient(90deg, #1B4B78 0%, #2B6599 58%, #D4AF37 100%)",
        leadBg:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,251,255,0.97) 52%, rgba(234,243,253,0.95) 100%)",
        leadBorder: "1px solid rgba(11,99,209,0.12)",
        leadShadow:
          "0 14px 30px rgba(11,99,209,0.06), inset 0 1px 0 rgba(255,255,255,0.84)",
        statusBg: "rgba(245,158,11,0.14)",
        statusText: "#8A651E",
        chipBg:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,248,252,0.96) 100%)",
        chipBorder: "1px solid rgba(11,99,209,0.12)",
        chipSelectedBorder: "1px solid rgba(212,175,55,0.24)",
        itemBg:
          "linear-gradient(180deg, rgba(252,254,255,0.98) 0%, rgba(244,249,255,0.96) 100%)",
        itemBorder: "1px solid rgba(11,99,209,0.12)",
      };
    }

    return {
      shellBg:
        "radial-gradient(circle at top left, rgba(11,99,209,0.10) 0%, rgba(11,99,209,0.00) 28%), linear-gradient(180deg, #F8FBFF 0%, #EEF5FD 54%, #DCEBFA 100%)",
      shellBorder: "1px solid rgba(11,99,209,0.14)",
      accent: "linear-gradient(90deg, #1B4B78 0%, #2B6599 58%, #D4AF37 100%)",
      leadBg:
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,251,255,0.97) 52%, rgba(234,243,253,0.95) 100%)",
      leadBorder: "1px solid rgba(11,99,209,0.12)",
      leadShadow:
        "0 14px 30px rgba(11,99,209,0.06), inset 0 1px 0 rgba(255,255,255,0.84)",
      statusBg: "rgba(11,99,209,0.10)",
      statusText: "#123055",
      chipBg:
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,248,252,0.96) 100%)",
      chipBorder: "1px solid rgba(11,99,209,0.12)",
      chipSelectedBorder: "1px solid rgba(11,99,209,0.20)",
      itemBg:
        "linear-gradient(180deg, rgba(252,254,255,0.98) 0%, rgba(244,249,255,0.96) 100%)",
      itemBorder: "1px solid rgba(11,99,209,0.12)",
    };
  }, [dashboardNoticeSummary.counts.actNow]);

  useEffect(() => {
    if (!noticeSourceOpenKey) return;

    const currentStillExists = dashboardNoticePanels.some(
      (group) => group.key === noticeSourceOpenKey
    );

    if (!currentStillExists) {
      setNoticeSourceOpenKey("");
    }
  }, [dashboardNoticePanels, noticeSourceOpenKey]);

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
      return "No demand is waiting right now.";
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
    )}. Ready for your next request.`;
  }, [currentClan, currentDemandItem, selectedClanId]);
  const currentDemandIsUrgent =
    safeStr(currentDemandItem?.urgency).toLowerCase() === "high";
  const remainingDemandCount = Math.max(demandItems.length - 1, 0);
  const demandPrimaryActionTo =
    demandItems.length === 0
      ? "/app/demand-box?mode=create"
      : DASHBOARD_TARGETS.DEMAND_BOX;
  const demandPrimaryActionLabel =
    demandItems.length === 0
      ? "Create demand"
      : urgentDemandItems.length > 0
      ? "Open urgent demand"
      : "Open Demand Box";
  const demandCommunityLabel = currentCommunityName(currentClan, selectedClanId);
  const demandRequesterId = safeStr(currentDemandItem?.requester_gmfn_id || "");
  const demandRequesterTrust = safeStr(
    currentDemandItem?.requester_trust_band || ""
  );
  const demandPaymentMode = safeStr(currentDemandItem?.payment_mode || "");
  const demandArea = safeStr(currentDemandItem?.area || "");
  const demandGuideTitle = demandItems.length
    ? "A person's request is live in your community."
    : "Create demand when you personally need help.";
  const demandGuideBody =
    "Demand Box is personal: you say what you need, and your GSN trust signal shows who is asking. The community name shows where you are sending it from. Payment terms and TrustSlip expectations help both sides agree before work starts.";

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
        "radial-gradient(circle at top left, rgba(11,99,209,0.12) 0%, rgba(11,99,209,0.00) 28%), linear-gradient(180deg, #F8FBFF 0%, #EEF5FD 54%, #DCEBFA 100%)",
      shellBorder: "1px solid rgba(11,99,209,0.14)",
      accent:
        "linear-gradient(90deg, #1B4B78 0%, #2B6599 58%, #D4AF37 100%)",
      leadBg:
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,251,255,0.97) 52%, rgba(234,243,253,0.95) 100%)",
      leadBorder: "1px solid rgba(11,99,209,0.12)",
      leadShadow:
        "0 14px 30px rgba(11,99,209,0.06), inset 0 1px 0 rgba(255,255,255,0.84)",
      statusBg: "rgba(11,99,209,0.10)",
      statusText: "#123055",
      chipBg:
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,248,252,0.96) 100%)",
      chipBorder: "1px solid rgba(11,99,209,0.12)",
      chipSelectedBg:
        "linear-gradient(180deg, rgba(236,244,255,0.98) 0%, rgba(218,233,250,0.96) 100%)",
      chipSelectedBorder: "1px solid rgba(11,99,209,0.20)",
      detailBg:
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,251,255,0.96) 100%)",
      detailBorder: "1px solid rgba(11,99,209,0.12)",
      itemBg:
        "linear-gradient(180deg, rgba(252,254,255,0.98) 0%, rgba(244,249,255,0.96) 100%)",
      itemBorder: "1px solid rgba(11,99,209,0.12)",
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
    }, MARKET_WISDOM_ROTATION_MS);

    return () => window.clearInterval(timer);
  }, [marketWisdomSignals.length]);

  useEffect(() => {
    setMarketWisdomSignalIndex(0);
  }, [activeWisdom?.id, marketWisdomNowLine]);

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

  const dashboardNextActionItems = useMemo<NextActionGuideItem[]>(() => {
    const routeItems: NextActionGuideItem[] = [
      {
        id: `priority-${priorityRoutes.primaryRoute.key}`,
        label: routeSurfaceLabel(priorityRoutes.primaryRoute),
        detail:
          priorityRoutes.primaryRoute.reason ||
          priorityRoutes.primaryRoute.detail ||
          priorityRoutes.detail,
        technical: priorityRoutes.title,
        to: priorityRoutes.primaryRoute.to,
        keywords: [
          priorityRoutes.primaryRoute.key,
          priorityRoutes.primaryRoute.label,
          priorityRoutes.title,
          priorityRoutes.detail,
          "recommended",
          "next",
        ],
        tone: "primary",
      },
      ...priorityRoutes.supportingRoutes.map((route) => ({
        id: `support-${route.key}`,
        label: routeSurfaceLabel(route),
        detail: route.detail,
        technical: route.label,
        to: route.to,
        keywords: [route.key, route.label, route.detail],
        tone: "secondary" as const,
      })),
      {
        id: "spotlight",
        label: "Spotlight",
        detail:
          "Open the spotlight task family so GSN can lead free spotlight, subscription spotlight, Vault, or shop setup from one place.",
        technical: "Guided spotlight",
        to: DASHBOARD_TARGETS.COMMUNITY_SPOTLIGHT,
        keywords: [
          "spotlight",
          "make spotlight",
          "publish spotlight",
          "free spotlight",
          "subscription spotlight",
          "vault",
        ],
        tone: "secondary",
      },
      {
        id: "community",
        label: "Community Home",
        detail:
          "Open the working tools: invite people, choose a community, manage shop, prepare spotlight, and enter the right marketplace.",
        technical: "Community Home",
        to: DASHBOARD_TARGETS.COMMUNITY,
        keywords: [
          "community",
          "group",
          "choose",
          "home",
          "marketplace",
          "tools",
          "invite",
          "shop",
        ],
        tone: "secondary",
      },
      {
        id: "marketplace",
        label: "Marketplace",
        detail: "Open one selected community for live marketplace work.",
        technical: "Marketplace",
        to: DASHBOARD_TARGETS.MARKETPLACE,
        keywords: ["marketplace", "market", "trade", "buy", "sell", "shop"],
        tone: "secondary",
      },
      {
        id: "money-in",
        label: "Money In",
        detail: "Open the pay-in path for deposits and pool funding.",
        technical: "Payment pool",
        to: DASHBOARD_TARGETS.MONEY_IN,
        keywords: ["money in", "deposit", "pay in", "pool", "fund", "payment"],
        tone: "soft",
      },
      {
        id: "money-out",
        label: "Money Out",
        detail: "Open the withdrawal and payout instruction path.",
        technical: "Withdrawal",
        to: DASHBOARD_TARGETS.MONEY_OUT,
        keywords: ["money out", "withdraw", "payout", "cash out"],
        tone: "soft",
      },
      {
        id: "support",
        label: "Borrow or support",
        detail: "Open loans, guarantor, borrowing, lending, and support work.",
        technical: "Loans and support",
        to: DASHBOARD_TARGETS.LOANS,
        keywords: ["loan", "borrow", "lend", "support", "guarantor"],
        tone: "secondary",
      },
      {
        id: "finance",
        label: "Finance",
        detail: "Review pool position, locks, support, and money movement.",
        technical: "Finance",
        to: DASHBOARD_TARGETS.FINANCE,
        keywords: ["finance", "money", "balance", "pool", "earnings"],
        tone: "secondary",
      },
      {
        id: "trust",
        label: "Trust Passport",
        detail: "Read trust, repair pressure, and carried trust story.",
        technical: "Trust",
        to: DASHBOARD_TARGETS.TRUST,
        keywords: ["trust", "passport", "repair", "score", "reading"],
        tone: "secondary",
      },
      {
        id: "identity",
        label: "CCI",
        detail: "Review identity continuity and cross-community integrity.",
        technical: "Identity integrity",
        to: DASHBOARD_TARGETS.CCI,
        keywords: ["identity", "cci", "integrity", "continuity", "review"],
        tone: "soft",
      },
      {
        id: "trust-slip",
        label: "TrustSlip",
        detail: "Open the portable verification and merchant trust record.",
        technical: "TrustSlip",
        to: DASHBOARD_TARGETS.TRUST_SLIP,
        keywords: ["trustslip", "verify", "verification", "merchant", "qr"],
        tone: "soft",
      },
      {
        id: "demand-box",
        label: "Demand Box",
        detail: "Open visible needs, requests, and demand signals.",
        technical: "Demand Box",
        to: DASHBOARD_TARGETS.DEMAND_BOX,
        keywords: ["demand", "need", "request", "opportunity", "supply"],
        tone: "soft",
      },
      {
        id: "notifications",
        label: "What Matters Now",
        detail: "Open the action queue and items needing attention.",
        technical: "Notifications",
        to: DASHBOARD_TARGETS.WHAT_MATTERS_NOW,
        keywords: ["notice", "notification", "inbox", "alert", "queue"],
        tone: "soft",
      },
      {
        id: "shop",
        label: "Shop",
        detail: "Open your shop and seller-facing tools.",
        technical: "Shop",
        to: myShopLink,
        keywords: ["shop", "seller", "goods", "service", "store"],
        tone: "soft",
      },
    ];

    const seen = new Set<string>();
    return routeItems.filter((item) => {
      const key = item.label.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [myShopLink, priorityRoutes]);

  const dashboardGuideSearchItems = useMemo<NextActionGuideItem[]>(
    () =>
      dashboardNextActionItems.filter(
        (item) =>
          !item.id.startsWith("priority-") && !item.id.startsWith("support-")
      ),
    [dashboardNextActionItems]
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

  const attentionQuietUntilMs = useMemo(() => {
    const lastQuietMs = latestDashboardAttentionQuietMs(attentionState);
    if (!lastQuietMs || !attentionDisplaySignal.active) return 0;
    return lastQuietMs + attentionDisplaySignal.intervalHours * 3600000;
  }, [
    attentionDisplaySignal.active,
    attentionDisplaySignal.intervalHours,
    attentionState,
  ]);

  const attentionQuietActive =
    attentionQuietUntilMs > 0 && attentionQuietUntilMs > attentionClockMs;
  const attentionAutoOpenAllowed = !isPhone;

  const attentionSurfaceVisible =
    attentionDisplaySignal.active &&
    (attentionPopupVisible ||
      (!attentionAutoOpenAllowed && !attentionQuietActive) ||
      (attentionDisplaySignal.shouldShow && !attentionQuietActive));

  const attentionPillShouldPulse =
    !attentionPopupVisible &&
    attentionDisplaySignal.shouldShow &&
    !attentionQuietActive;

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
    if (!dashboardIdentityReady) return;
    if (!attentionSignal.active || !attentionSignal.shouldShow) return;
    if (attentionQuietActive) return;
    if (!attentionAutoOpenAllowed) {
      setAttentionPopupVisible(false);
      return;
    }
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
    attentionQuietActive,
    attentionAutoOpenAllowed,
    dashboardIdentityReady,
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

    event.stopPropagation();
  }

  function dashboardButtonGuardProps(): Pick<
    React.HTMLAttributes<HTMLElement>,
    "onPointerDown" | "onTouchStart" | "onMouseDown"
  > {
    return {
      onPointerDown: consumeDashboardButtonEvent,
      onTouchStart: consumeDashboardButtonEvent,
      onMouseDown: consumeDashboardButtonEvent,
    };
  }

  function openDashboardRoute(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    to: string
  ) {
    consumeDashboardButtonEvent(event);
    navigateWithOrigin(navigate, to, location);
  }

  function handleDashboardNextAction(
    item: NextActionGuideItem,
    event?: React.SyntheticEvent<HTMLElement>
  ) {
    if (!item.to) {
      consumeDashboardButtonEvent(event);
      return;
    }

    openDashboardRoute(event, item.to);
  }

  function runDashboardUiMutation(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    action: () => void,
    _durationMs = 420
  ) {
    void _durationMs;
    consumeDashboardButtonEvent(event);
    action();
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

  function openDashboardSpotlightGuide(
    event?: React.SyntheticEvent<HTMLElement>
  ) {
    openDashboardRoute(event, DASHBOARD_TARGETS.COMMUNITY_SPOTLIGHT);
  }

  function minimizeSpotlight(event?: React.SyntheticEvent<HTMLElement>) {
    runDashboardUiMutation(event, () =>
      updateUiState({ spotlightMinimized: true })
    );
  }

  function toggleSpotlightGuide(event?: React.SyntheticEvent<HTMLElement>) {
    consumeDashboardButtonEvent(event);
    setSpotlightGuideOpen((open) => !open);
  }

  function toggleDemandGuide(event?: React.SyntheticEvent<HTMLElement>) {
    consumeDashboardButtonEvent(event);
    setDemandGuideOpen((open) => !open);
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

  function openTrackedApp(app: AppUseRecord) {
    navigateWithOrigin(navigate, app.to, location);
  }

  function openTrustSlipPage(
    event?: React.SyntheticEvent<HTMLElement>
  ) {
    const query = trustSlipCode
      ? `?code=${encodeURIComponent(trustSlipCode)}`
      : "";
    openDashboardRoute(event, `/app/trust-slip${query}`);
  }

  async function onAvatarSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      input.value = "";
      return;
    }

    try {
      const prepared = await prepareSpotlightImageFile(file, {
        maxBytes: DASHBOARD_AVATAR_MAX_BYTES,
        maxDimension: DASHBOARD_AVATAR_MAX_DIMENSION,
      });
      const localPreview = await readFileAsDataUrl(prepared.file);
      writeStoredImage(dashboardAvatarStorageKeys, localPreview);
      setAvatarSrc(localPreview);

      const uploaded = await uploadMyProfileImageFile(prepared.file);
      const persistedAvatar = resolveDashboardAvatarSrc(uploaded);

      if (!persistedAvatar) {
        throw new Error(
          "Picture uploaded, but the profile save response did not include the saved image."
        );
      }

      writeStoredImage(dashboardAvatarStorageKeys, persistedAvatar);
      setAvatarSrc(persistedAvatar);
      setMe((previous: any) => ({ ...(previous || {}), ...(uploaded || {}) }));
      setAvatarStatus({
        tone: "success",
        text:
          prepared.message ||
          "Picture saved to your GSN profile and ready across your dashboard.",
      });
    } catch (error) {
      setAvatarStatus({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Picture could not be prepared right now. The previous dashboard picture is still safe.",
      });
    } finally {
      input.value = "";
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

  const showSpotlight = !uiState.spotlightMinimized;
  const showLegacySpotlightDock = Boolean(
    (globalThis as any).__GSN_LEGACY_SPOTLIGHT_DOCK
  );
  const dashboardSpotlightMinHeight = isCompact ? 80 : 106;
  const dashboardSpotlightRadius = isCompact ? 20 : 24;
  const dashboardSpotlightTopInset = isCompact ? 6 : 8;
  const dashboardSpotlightBottomInset = isCompact ? 6 : 8;
  const dashboardSpotlightScreenHeight = isPhone
    ? spotlightGuideOpen
      ? 302
      : 278
    : isCompact
    ? 260
    : 320;
  const dashboardSpotlightTitleSize = isPhone ? 16 : isCompact ? 18 : 22;
  const dashboardSpotlightBodyFontSize = isPhone
    ? 12.25
    : isCompact
    ? 12.5
    : 13.5;
  const dashboardPhoneButton: React.CSSProperties = isPhone
    ? {
        minHeight: 34,
        padding: "6px 10px",
        borderRadius: 11,
        fontSize: 12,
      }
    : {};
  const dashboardPhoneHelper: React.CSSProperties = isPhone
    ? {
        fontSize: 12.5,
        lineHeight: 1.48,
      }
    : {};
  const dashboardActionGrid = (
    minWidth = isCompact ? 112 : 132
  ): React.CSSProperties => ({
    display: "grid",
    gridTemplateColumns: isPhone
      ? "1fr"
      : `repeat(auto-fit, minmax(${minWidth}px, 1fr))`,
    gap: isPhone ? 7 : 8,
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
  const spotlightWhiteButton = (
    overrides: React.CSSProperties = {}
  ): React.CSSProperties =>
    dashboardFillButton(
      {
        ...secondaryBtn(false),
        minHeight: isPhone ? 46 : 40,
        padding: isPhone ? "10px 12px" : "8px 14px",
        borderRadius: isPhone ? 15 : 15,
        background:
          "linear-gradient(180deg, #FFFFFF 0%, #F4F8FC 100%)",
        border: "1px solid rgba(11,99,209,0.14)",
        color: "#123055",
        fontWeight: 900,
        userSelect: "none",
        touchAction: "manipulation",
        boxShadow:
          "0 10px 20px rgba(10,24,49,0.06), inset 0 1px 0 rgba(255,255,255,0.86)",
      },
      overrides
    );
  const spotlightActionButton = (
    overrides: React.CSSProperties = {}
  ): React.CSSProperties =>
    dashboardFillButton(
      {
        ...secondaryBtn(false),
        minHeight: isPhone ? 46 : 40,
        padding: isPhone ? "10px 12px" : "8px 14px",
        borderRadius: isPhone ? 15 : 15,
        background:
          "linear-gradient(180deg, #FFFFFF 0%, #F4F8FC 100%)",
        border: "1px solid rgba(11,99,209,0.14)",
        color: "#123055",
        fontWeight: 900,
        userSelect: "none",
        touchAction: "manipulation",
        boxShadow:
          "0 10px 20px rgba(10,24,49,0.08), inset 0 1px 0 rgba(255,255,255,0.86)",
      },
      overrides
    );
  const focusCommitmentButton = (
    overrides: React.CSSProperties = {}
  ): React.CSSProperties =>
    dashboardFillButton(
      {
        ...secondaryBtn(false),
        minHeight: isPhone ? 44 : 40,
        padding: isPhone ? "9px 10px" : "8px 12px",
        borderRadius: isPhone ? 15 : 14,
        background: "linear-gradient(180deg, #FFFFFF 0%, #F3F7FC 100%)",
        border: "1px solid rgba(11,99,209,0.14)",
        color: DASHBOARD_BRAND.accentDeep,
        fontWeight: 900,
        fontSize: isPhone ? 12.5 : 13,
        lineHeight: 1.08,
        whiteSpace: "nowrap",
        userSelect: "none",
        touchAction: "manipulation",
        boxShadow:
          "0 10px 20px rgba(10,24,49,0.07), inset 0 1px 0 rgba(255,255,255,0.88)",
      },
      overrides
    );
  const focusMetricLabelStyle: React.CSSProperties = {
    ...sectionLabel(),
    fontSize: isPhone ? 10.5 : 12,
    letterSpacing: isPhone ? 0.12 : 0.35,
    lineHeight: 1.05,
    whiteSpace: "nowrap",
  };
  const attentionConnectionText = isPhone
    ? "Focus shows follow-through. Trust is how your community reads it. CCI is how outsiders may read it. TrustSlip keeps later proof. The waiting request is the issue now."
    : trustAttentionCore.connectionText;
  const attentionConsequenceText = isPhone
    ? "Leaving it waiting weakens trust now. If it stays open, it can affect CCI and make your TrustSlip story look less steady."
    : attentionDisplaySignal.consequenceText;
  const attentionPopupLabelStyle = (
    color = DASHBOARD_BRAND.label
  ): React.CSSProperties => ({
    ...sectionLabel(),
    color,
    fontSize: isPhone ? 9.6 : 12,
    letterSpacing: isPhone ? 0.5 : 0.35,
    lineHeight: 1.05,
  });
  const attentionPhoneCardTight: React.CSSProperties = isPhone
    ? {
        borderRadius: 13,
        padding: 8,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.78), 0 8px 16px rgba(10,24,49,0.04)",
      }
    : {};
  return (
    <div
      style={{
        minHeight: "100%",
        margin: "0 -16px",
        padding: "18px 16px 40px",
        background: DASHBOARD_BRAND.pageWash,
      }}
    >
      {attentionSurfaceVisible ? (
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
              onPointerDown={consumeDashboardPointerEvent}
              onMouseDown={consumeDashboardPointerEvent}
              onTouchStart={consumeDashboardPointerEvent}
              onClick={consumeDashboardPointerEvent}
              style={{
                position: "fixed",
                top: isPhone ? 8 : isCompact ? 12 : 18,
                right: isPhone ? 10 : isCompact ? 12 : 18,
                left: isPhone ? 10 : isCompact ? 12 : "auto",
                width: isCompact ? "auto" : 452,
                zIndex: 1200,
                borderRadius: isPhone ? 20 : 22,
                overflow: "hidden",
                border: attentionPopupTone.border,
                background: attentionPopupChrome.shellBg,
                boxShadow: attentionPopupTone.shadow,
                animation: "dashboardAttentionPopupSlide 240ms ease-out",
                backdropFilter: "blur(14px)",
                maxHeight: isPhone ? "calc(100dvh - 16px)" : undefined,
                overflowY: isPhone ? "auto" : undefined,
                pointerEvents: "auto",
                isolation: "isolate",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                overscrollBehavior: isPhone ? "contain" : undefined,
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
                  padding: isPhone ? 11 : isCompact ? 14 : 16,
                  background: attentionPopupChrome.heroBg,
                  borderBottom: attentionPopupChrome.heroBorder,
                }}
              >
                <div
                  style={{
                    display: isPhone ? "grid" : "flex",
                    justifyContent: "space-between",
                    gap: isPhone ? 8 : 10,
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: isPhone ? 6 : 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          ...attentionPopupLabelStyle(
                            attentionPopupChrome.heroLabel
                          ),
                        }}
                      >
                        Attention Guide
                      </div>

                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: isPhone ? 5 : 6,
                          minHeight: isPhone ? 22 : 26,
                          padding: isPhone ? "3px 8px" : "4px 9px",
                          borderRadius: 999,
                          background: attentionPopupChrome.stageBg,
                          border: attentionPopupChrome.stageBorder,
                          color: attentionPopupChrome.stageText,
                          fontSize: isPhone ? 9.6 : 10.5,
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
                        fontSize: isPhone ? 16.5 : isCompact ? 18 : 20,
                        fontWeight: 900,
                        lineHeight: isPhone ? 1.12 : 1.18,
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
                        fontSize: isPhone ? 12 : 13,
                        lineHeight: isPhone ? 1.36 : 1.58,
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
                      gridTemplateColumns: isPhone
                        ? "repeat(2, minmax(0, auto))"
                        : "1fr",
                      gap: isPhone ? 7 : 6,
                      alignItems: "center",
                      justifyContent: isPhone ? "start" : undefined,
                      justifyItems: isCompact ? "start" : "end",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: isPhone ? 5 : 6,
                        minHeight: isPhone ? 26 : 28,
                        padding: isPhone ? "4px 8px" : "5px 9px",
                        borderRadius: 999,
                        background: attentionPopupChrome.stageBg,
                        border: attentionPopupChrome.stageBorder,
                        color: attentionPopupChrome.stageText,
                        fontSize: isPhone ? 10.2 : 11,
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
                        minHeight: isPhone ? 26 : 32,
                        padding: isPhone ? "4px 9px" : "5px 10px",
                        fontSize: isPhone ? 10.3 : 11.5,
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
                      gap: isPhone ? 6 : 8,
                      minHeight: isPhone ? 24 : 28,
                      maxWidth: "100%",
                      padding: isPhone ? "4px 8px" : "5px 9px",
                      borderRadius: 12,
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      color: attentionPopupChrome.heroBody,
                      fontSize: isPhone ? 10.8 : 12,
                      fontWeight: 800,
                      lineHeight: isPhone ? 1.24 : 1.42,
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
                  padding: isPhone ? 9 : isCompact ? 12 : 14,
                  background: attentionPopupChrome.bodyBg,
                }}
              >
                <div
                  style={{
                    ...innerCard(attentionPopupChrome.connectBg),
                    ...attentionPhoneCardTight,
                    padding: isPhone ? 8 : isCompact ? 10 : 11,
                    border: attentionPopupChrome.connectBorder,
                    marginTop: 0,
                  }}
                >
                  <div
                    style={{
                      ...attentionPopupLabelStyle(
                        attentionPopupTone.labelColor
                      ),
                    }}
                  >
                    How it connects
                  </div>
                  <div
                    style={{
                      marginTop: isPhone ? 5 : 7,
                      color: DASHBOARD_BRAND.ink,
                      fontSize: isPhone ? 11.35 : 12.5,
                      fontWeight: 800,
                      lineHeight: isPhone ? 1.34 : 1.54,
                    }}
                  >
                    {attentionConnectionText}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: isPhone ? 7 : 10,
                    display: "grid",
                    gridTemplateColumns: isPhone
                      ? "minmax(0, 0.9fr) minmax(0, 1.1fr)"
                      : isCompact
                      ? "1fr"
                      : "minmax(0, 1fr) minmax(0, 1fr)",
                    gap: isPhone ? 7 : 8,
                  }}
                >
                  <div
                    style={{
                      ...innerCard(attentionPopupChrome.panelBg),
                      border: attentionPopupChrome.panelBorder,
                      ...attentionPhoneCardTight,
                      padding: isPhone ? 8 : isCompact ? 10 : 11,
                    }}
                  >
                    <div style={attentionPopupLabelStyle()}>Problem</div>
                    <div
                      style={{
                        marginTop: isPhone ? 5 : 8,
                        color: DASHBOARD_BRAND.ink,
                        fontSize: isPhone ? 11.4 : 13.5,
                        fontWeight: 800,
                        lineHeight: isPhone ? 1.34 : 1.52,
                      }}
                    >
                      {attentionDisplaySignal.problemText}
                    </div>
                  </div>

                  <div
                    style={{
                      ...innerCard(attentionPopupChrome.panelBg),
                      border: attentionPopupChrome.panelBorder,
                      ...attentionPhoneCardTight,
                      padding: isPhone ? 8 : isCompact ? 10 : 11,
                    }}
                  >
                    <div style={attentionPopupLabelStyle()}>Why it matters</div>
                    <div
                      style={{
                        marginTop: isPhone ? 5 : 8,
                        color: DASHBOARD_BRAND.subInk,
                        fontSize: isPhone ? 11.2 : 13,
                        fontWeight: 800,
                        lineHeight: isPhone ? 1.34 : 1.54,
                      }}
                    >
                      {attentionConsequenceText}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: isPhone ? 7 : 8,
                    ...innerCard(attentionPopupChrome.actionBg),
                    border: attentionPopupChrome.panelBorder,
                    ...attentionPhoneCardTight,
                    padding: isPhone ? 8 : isCompact ? 10 : 11,
                  }}
                >
                  <div
                    style={{
                      ...attentionPopupLabelStyle(
                        attentionPopupTone.labelColor
                      ),
                    }}
                  >
                    Do this now
                  </div>
                  <div
                    style={{
                      marginTop: isPhone ? 5 : 8,
                      color: "#1D4ED8",
                      fontSize: isPhone ? 11.8 : 13.5,
                      fontWeight: 900,
                      lineHeight: isPhone ? 1.32 : 1.54,
                    }}
                  >
                    {attentionDisplaySignal.actionText}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: isPhone ? 7 : 10,
                    ...innerCard("linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,250,255,0.96) 100%)"),
                    ...attentionPhoneCardTight,
                    padding: isPhone ? 6 : 8,
                    border: attentionPopupChrome.connectBorder,
                    ...(isPhone
                      ? {
                          display: "grid",
                          gridTemplateColumns:
                            attentionDisplaySignal.secondaryCtaLabel &&
                            attentionDisplaySignal.secondaryCtaTo
                              ? "repeat(3, minmax(0, 1fr))"
                              : "repeat(2, minmax(0, 1fr))",
                          gap: 6,
                          alignItems: "stretch",
                        }
                      : dashboardActionGrid(isCompact ? 108 : 124)),
                  }}
                >
                  <button
                    type="button"
                    onClick={(event) =>
                      openAttentionTarget(event, attentionDisplaySignal.ctaTo)
                    }
                    {...dashboardButtonGuardProps()}
                    style={{
                      ...dashboardFillButton(primaryBtn(false), {
                        minHeight: isPhone ? 30 : isCompact ? 34 : 36,
                        padding: isPhone
                          ? "5px 6px"
                          : isCompact
                          ? "7px 10px"
                          : "8px 12px",
                        fontSize: isPhone ? 10.1 : isCompact ? 11.5 : 12.25,
                        borderRadius: isPhone ? 10 : isCompact ? 11 : 13,
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
                      {...dashboardButtonGuardProps()}
                      style={{
                        ...dashboardFillButton(secondaryBtn(false), {
                          minHeight: isPhone ? 30 : isCompact ? 34 : 36,
                          padding: isPhone
                            ? "5px 6px"
                            : isCompact
                            ? "7px 10px"
                            : "8px 12px",
                          fontSize: isPhone
                            ? 10.1
                            : isCompact
                            ? 11.5
                            : 12.25,
                          borderRadius: isPhone ? 10 : isCompact ? 11 : 13,
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
                    {...dashboardButtonGuardProps()}
                    style={{
                      ...dashboardFillButton(secondaryBtn(false), {
                        minHeight: isPhone ? 30 : isCompact ? 34 : 36,
                        padding: isPhone
                          ? "5px 6px"
                          : isCompact
                          ? "7px 10px"
                          : "8px 12px",
                        fontSize: isPhone ? 10.1 : isCompact ? 11.5 : 12.25,
                        borderRadius: isPhone ? 10 : isCompact ? 11 : 13,
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
              onMouseDown={consumeDashboardPointerEvent}
              onTouchStart={consumeDashboardPointerEvent}
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
                animation: attentionPillShouldPulse
                  ? "dashboardAttentionPillPulse 1.8s ease-in-out infinite"
                  : undefined,
                backdropFilter: "blur(12px)",
                pointerEvents: "auto",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                appearance: "none",
                WebkitAppearance: "none",
                isolation: "isolate",
                overflow: "hidden",
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
          gap: isPhone ? 8 : 18,
        }}
      >
        <details
          style={{
            borderRadius: isPhone ? 14 : 22,
            padding: isPhone ? "5px 8px" : 12,
            background: "linear-gradient(180deg, #FFFFFF 0%, #F4F8FE 100%)",
            border: "1px solid rgba(11,99,209,0.12)",
            boxShadow: "0 14px 30px rgba(11,99,209,0.06)",
          }}
        >
          <summary
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              alignItems: "center",
              gap: isPhone ? 6 : 10,
              listStyle: "none",
              cursor: "pointer",
              touchAction: "manipulation",
            }}
          >
            <span style={{ minWidth: 0 }}>
              <span
                style={{
                  display: isPhone ? "none" : "block",
                  color: "#0B63D1",
                  fontSize: isPhone ? 9.8 : 11,
                  fontWeight: 900,
                  letterSpacing: 0.32,
                  textTransform: "uppercase",
                }}
              >
                First look
              </span>
              <span
                style={{
                  display: "block",
                  marginTop: isPhone ? 0 : 3,
                  color: "#102A43",
                  fontSize: isPhone ? 12.8 : 16,
                  fontWeight: 900,
                  lineHeight: isPhone ? 1.05 : 1.15,
                }}
              >
                {isPhone ? "Dashboard guide" : "Your Dashboard"}
              </span>
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: isPhone ? 24 : 38,
                minWidth: isPhone ? 48 : 82,
                padding: isPhone ? "3px 8px" : "8px 13px",
                borderRadius: 999,
                background: "#FFFFFF",
                border: "1px solid rgba(11,99,209,0.16)",
                color: "#14324C",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.70)",
                fontSize: isPhone ? 10.5 : 13,
                fontWeight: 900,
              }}
            >
              Open
            </span>
          </summary>

          <div
            style={{
              marginTop: isPhone ? 6 : 12,
              display: "grid",
              gridTemplateColumns: isPhone ? "auto minmax(0, 1fr)" : "1fr",
              gap: isPhone ? 7 : 8,
              alignItems: "center",
              borderRadius: isPhone ? 13 : 18,
              padding: isPhone ? "7px 8px" : 14,
              background:
                "radial-gradient(circle at top left, rgba(11,99,209,0.16) 0%, rgba(11,99,209,0) 35%), linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(237,246,255,0.94) 100%)",
              border: "1px solid rgba(11,99,209,0.14)",
              color: "#233D57",
              fontSize: isPhone ? 11.4 : 14,
              fontWeight: 800,
              lineHeight: isPhone ? 1.32 : 1.75,
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.88), 0 10px 20px rgba(10,24,49,0.05)",
            }}
          >
            {isPhone ? (
              <span
                aria-hidden="true"
                style={{
                  width: 9,
                  height: 36,
                  borderRadius: 999,
                  background:
                    "linear-gradient(180deg, #0B63D1 0%, #F3D06A 100%)",
                  boxShadow: "0 8px 16px rgba(11,99,209,0.16)",
                }}
              />
            ) : null}
            <span>
              Dashboard is your quick first look. It shows what needs attention
              now and points you to the right page to handle it. For the tools
              that make GSN work, open Community Home: invite people, manage
              your shop, prepare spotlight, choose a community, and enter the
              marketplace from the right place.
            </span>
          </div>
        </details>

      <section
        style={{
          ...pageCard(DASHBOARD_BRAND.heroField),
          padding: isPhone ? 10 : isCompact ? 16 : 18,
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
            padding: isPhone ? 9 : isCompact ? 14 : 16,
            borderRadius: isPhone ? 20 : 28,
            backdropFilter: "blur(14px)",
          }}
        >
          <div
              style={{
                ...softCard(
                  "radial-gradient(circle at 12% 16%, rgba(243,208,106,0.30) 0%, rgba(243,208,106,0) 32%), radial-gradient(circle at 92% 20%, rgba(11,99,209,0.20) 0%, rgba(11,99,209,0) 34%), linear-gradient(135deg, rgba(252,254,255,0.98) 0%, rgba(235,244,255,0.96) 42%, rgba(218,232,248,0.94) 100%)"
                ),
                border: "1px solid rgba(255,255,255,0.62)",
                boxShadow:
                  "0 24px 50px rgba(5,16,38,0.20), inset 0 1px 0 rgba(255,255,255,0.92), inset 0 -1px 0 rgba(11,99,209,0.08)",
              color: DASHBOARD_BRAND.ink,
              padding: isPhone ? 7 : isCompact ? 14 : 16,
              borderRadius: isPhone ? 14 : 24,
            }}
          >
            <div
              style={{
                position: "relative",
                display: "grid",
                gridTemplateColumns: isPhone
                  ? "minmax(0, 1fr)"
                  : undefined,
                gap: isPhone ? 5 : 8,
                alignItems: isPhone ? "center" : undefined,
                justifyItems: "center",
                marginBottom: isPhone ? 0 : 6,
                minHeight: isPhone ? 78 : isCompact ? 56 : 60,
              }}
            >
              <button
                type="button"
                onClick={(event) => openDashboardRoute(event, "/app/community")}
                onPointerDown={consumeDashboardPointerEvent}
                aria-label="Back"
                style={{
                  position: isPhone ? "static" : "absolute",
                  left: isPhone ? undefined : 0,
                  top: isPhone ? undefined : 0,
                  display: "none",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: isPhone ? 30 : isCompact ? 40 : 42,
                  minWidth: isPhone ? 30 : isCompact ? 40 : 42,
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
                    width: isPhone ? 20 : 24,
                    height: isPhone ? 20 : 24,
                    borderRadius: 999,
                    color: "#F8FBFF",
                    fontSize: isPhone ? 12 : 14,
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
                  fontSize: isPhone ? 17 : isCompact ? 24 : 31,
                  fontWeight: 900,
                  lineHeight: isPhone ? 1.05 : 1.04,
                  padding: isPhone ? 0 : "0 44px",
                  color: DASHBOARD_BRAND.ink,
                  overflowWrap: "normal",
                  wordBreak: "normal",
                  hyphens: "none",
                  textWrap: "balance",
                }}
              >
                {isPhone ? (
                  <span
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 5,
                      justifyItems: "center",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 7,
                        color: DASHBOARD_BRAND.ink,
                        letterSpacing: 0.1,
                        textShadow: "0 1px 0 rgba(255,255,255,0.62)",
                        maxWidth: "100%",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 28,
                          height: 28,
                          flex: "0 0 auto",
                          borderRadius: 999,
                          background:
                            "radial-gradient(circle at 30% 22%, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.58) 36%, rgba(224,237,252,0.46) 100%)",
                          border: "1px solid rgba(255,255,255,0.70)",
                          boxShadow:
                            "0 12px 20px rgba(10,24,49,0.14), inset 0 1px 0 rgba(255,255,255,0.96)",
                          overflow: "hidden",
                        }}
                      >
                        <GSNBrandMark width={15} height={19} />
                      </span>
                      <span
                        style={{
                          display: "inline-block",
                          maxWidth: 210,
                          fontSize: 18,
                          lineHeight: 1.06,
                          textAlign: "left",
                          textWrap: "balance",
                        }}
                      >
                        Trust is{" "}
                        <span style={{ color: DASHBOARD_BRAND.goldText }}>
                          the first currency
                        </span>
                      </span>
                    </span>
                    <span
                      style={{
                        display: "grid",
                        justifyItems: "center",
                        gap: 4,
                        width: "100%",
                        maxWidth: "100%",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: 17,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background:
                            "linear-gradient(180deg, rgba(255,249,225,0.98) 0%, rgba(239,207,113,0.92) 100%)",
                          border: "1px solid rgba(145,103,19,0.22)",
                          color: "#6B4300",
                          fontSize: 8.5,
                          letterSpacing: 0.7,
                          textTransform: "uppercase",
                          boxShadow:
                            "inset 0 1px 0 rgba(255,255,255,0.88), 0 8px 14px rgba(145,103,19,0.10)",
                        }}
                      >
                        GSN
                      </span>
                      <span
                        style={{
                          color: "rgba(16,37,59,0.58)",
                          display: "inline-block",
                          maxWidth: "100%",
                          padding: "0 8px",
                          fontSize: 10.2,
                          fontWeight: 850,
                          letterSpacing: 0.16,
                          lineHeight: 1.15,
                          whiteSpace: "normal",
                          textAlign: "center",
                          textWrap: "balance",
                        }}
                      >
                        Visible. Portable. Usable.
                      </span>
                    </span>
                  </span>
                ) : (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: isCompact ? 42 : 50,
                        height: isCompact ? 42 : 50,
                        borderRadius: 999,
                        background:
                          "radial-gradient(circle at 30% 22%, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.62) 38%, rgba(224,237,252,0.48) 100%)",
                        border: "1px solid rgba(255,255,255,0.70)",
                        boxShadow:
                          "0 16px 28px rgba(10,24,49,0.14), inset 0 1px 0 rgba(255,255,255,0.96)",
                        overflow: "hidden",
                      }}
                    >
                      <GSNBrandMark
                        width={isCompact ? 22 : 27}
                        height={isCompact ? 27 : 33}
                      />
                    </span>
                    <span>Trust is the first currency</span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 26,
                        padding: "3px 10px",
                        borderRadius: 999,
                        background:
                          "linear-gradient(180deg, rgba(255,249,225,0.98) 0%, rgba(239,207,113,0.92) 100%)",
                        border: "1px solid rgba(145,103,19,0.22)",
                        color: "#6B4300",
                        fontSize: isCompact ? 11 : 12,
                        fontWeight: 1000,
                        letterSpacing: 1,
                        textTransform: "uppercase",
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.88), 0 10px 18px rgba(145,103,19,0.12)",
                      }}
                    >
                      GSN
                    </span>
                  </span>
                )}
              </div>

              <div
                style={{
                  gridColumn: isPhone ? "1 / -1" : undefined,
                  display: isPhone ? "none" : undefined,
                  textAlign: isPhone ? "left" : "center",
                  fontSize: isPhone ? 12.5 : isCompact ? 13 : 14.5,
                  lineHeight: isPhone ? 1.45 : 1.68,
                  color: "rgba(16,37,59,0.88)",
                  maxWidth: 760,
                  padding: isPhone ? "0 2px" : "0 18px",
                }}
              >
                GSN makes it visible, portable, and usable before trade,
                support, or decision.
              </div>

              <div
                style={{
                  gridColumn: isPhone ? "3" : undefined,
                  gridRow: isPhone ? "1" : undefined,
                  display: "none",
                  alignItems: "center",
                  justifyContent: "center",
                  justifySelf: isPhone ? "end" : "center",
                  alignSelf: "center",
                  minHeight: isPhone ? 36 : isCompact ? 40 : 44,
                  minWidth: isPhone ? 36 : undefined,
                  padding: isPhone ? 0 : isCompact ? "0 18px" : "0 22px",
                  borderRadius: 999,
                  background:
                    isPhone
                      ? "linear-gradient(180deg, rgba(255,255,255,0.62) 0%, rgba(233,240,250,0.32) 100%)"
                      : "linear-gradient(180deg, rgba(255,255,255,0.50) 0%, rgba(233,240,250,0.18) 100%)",
                  border: "1px solid rgba(255,255,255,0.42)",
                  boxShadow:
                    isPhone
                      ? "0 8px 16px rgba(10,24,49,0.10), inset 0 1px 0 rgba(255,255,255,0.78)"
                      : "0 18px 36px rgba(10,24,49,0.12), inset 0 1px 0 rgba(255,255,255,0.78)",
                  color: DASHBOARD_BRAND.goldText,
                  fontSize: isPhone ? 11 : isCompact ? 18 : 20,
                  fontWeight: 1000,
                  letterSpacing: isPhone ? 0.8 : 4.2,
                  textTransform: "uppercase",
                }}
              >
                GSN
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: isPhone ? 8 : 18,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "220px minmax(0, 1fr)",
              gap: isPhone ? 10 : 16,
              alignItems: "start",
            }}
          >
            <div
              style={{
                ...innerCard(
                  "radial-gradient(circle at 18% 12%, rgba(243,208,106,0.20) 0%, rgba(243,208,106,0) 34%), radial-gradient(circle at 90% 16%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 30%), linear-gradient(180deg, rgba(245,250,255,0.18) 0%, rgba(34,78,118,0.32) 48%, rgba(10,31,51,0.48) 100%)"
                ),
                border: "1px solid rgba(255,255,255,0.22)",
                boxShadow:
                  "0 20px 40px rgba(2,12,27,0.18), inset 0 1px 0 rgba(255,255,255,0.18)",
                padding: isPhone ? 5 : isCompact ? 10 : 12,
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: isPhone ? "100%" : isCompact ? 300 : 320,
                  margin: "0 auto",
                  borderRadius: isPhone ? 20 : 28,
                  padding: isPhone ? 3 : 6,
                  border: "1px solid rgba(255,255,255,0.24)",
                  background:
                    "radial-gradient(circle at 18% 12%, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0) 34%), radial-gradient(circle at 82% 10%, rgba(243,208,106,0.18) 0%, rgba(243,208,106,0) 32%), linear-gradient(180deg, rgba(18,48,77,0.92) 0%, rgba(21,63,98,0.88) 54%, rgba(236,244,252,0.24) 100%)",
                  boxShadow:
                    "0 22px 48px rgba(2,12,27,0.26), inset 0 1px 0 rgba(255,255,255,0.22)",
                }}
              >
                <div
                  style={{
                    height: isPhone ? 378 : isCompact ? 380 : 398,
                    borderRadius: isPhone ? 15 : 20,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.28)",
                    background:
                      "linear-gradient(180deg, rgba(236,244,252,0.30) 0%, rgba(30,76,116,0.66) 42%, rgba(13,45,72,0.82) 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -10px 22px rgba(2,12,27,0.18)",
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
                        width: isPhone ? 72 : 92,
                        height: isPhone ? 72 : 92,
                        borderRadius: 999,
                        border: "1px solid rgba(212,175,55,0.28)",
                        background:
                          "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18) 0%, rgba(212,175,55,0.14) 26%, rgba(11,31,51,0.18) 100%)",
                        boxShadow:
                          "0 18px 40px rgba(3,10,22,0.28), inset 0 1px 0 rgba(255,255,255,0.08)",
                        color: "#F8FBFF",
                        fontWeight: 900,
                        fontSize: isPhone ? 24 : 32,
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
                    aria-controls={avatarInputId}
                    onClick={(event) => {
                      consumeDashboardButtonEvent(event);
                      fileInputRef.current?.click();
                    }}
                    {...dashboardButtonGuardProps()}
                    style={{
                      position: "absolute",
                      right: isPhone ? 10 : 12,
                      bottom: isPhone ? 10 : 12,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: isPhone ? 46 : 44,
                      minWidth: isPhone ? 116 : 132,
                      maxWidth: "calc(100% - 20px)",
                      padding: isPhone ? "11px 16px" : "10px 17px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.82)",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(240,247,255,0.94) 54%, rgba(220,232,246,0.94) 100%)",
                      color: DASHBOARD_BRAND.accentDeep,
                      boxShadow:
                        "0 16px 28px rgba(2,12,27,0.28), inset 0 1px 0 rgba(255,255,255,0.94), inset 0 -8px 14px rgba(120,142,170,0.10)",
                      fontWeight: 900,
                      fontSize: isPhone ? 12.3 : 12.7,
                      lineHeight: 1,
                      letterSpacing: 0.08,
                      cursor: "pointer",
                      touchAction: "manipulation",
                      whiteSpace: "nowrap",
                      WebkitTapHighlightColor: "transparent",
                      WebkitAppearance: "none",
                      appearance: "none",
                      userSelect: "none",
                      isolation: "isolate",
                      zIndex: 4,
                      pointerEvents: "auto",
                      transform: "translateZ(0)",
                      outlineOffset: 4,
                    }}
                  >
                    {avatarSrc
                      ? isPhone
                        ? "Change"
                        : "Change photo"
                      : isPhone
                      ? "Upload"
                      : "Upload photo"}
                  </button>
                </div>
              </div>

              <input
                id={avatarInputId}
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onAvatarSelected}
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  opacity: 0,
                  overflow: "hidden",
                  pointerEvents: "none",
                }}
              />

              {avatarStatus ? (
                <div
                  style={{
                    marginTop: 8,
                    padding: "8px 10px",
                    borderRadius: 12,
                    border:
                      avatarStatus.tone === "error"
                        ? "1px solid rgba(185,28,28,0.18)"
                        : "1px solid rgba(11,99,209,0.14)",
                    background:
                      avatarStatus.tone === "error"
                        ? "linear-gradient(180deg, rgba(254,242,242,0.96) 0%, rgba(255,255,255,0.98) 100%)"
                        : "linear-gradient(180deg, rgba(239,246,255,0.96) 0%, rgba(255,255,255,0.98) 100%)",
                    color:
                      avatarStatus.tone === "error"
                        ? "#991B1B"
                        : "#0D4A7C",
                    fontSize: isPhone ? 11.5 : 12,
                    lineHeight: 1.45,
                    fontWeight: 700,
                  }}
                >
                  {avatarStatus.text}
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
                    padding: isPhone ? 10 : isCompact ? 12 : 14,
                    borderRadius: isPhone ? 16 : 18,
                  }}
                >
                  <div
                    style={{
                      display: isPhone ? "grid" : "flex",
                      gridTemplateColumns: isPhone ? "1fr" : undefined,
                      justifyContent: isPhone ? "center" : "space-between",
                      alignItems: "center",
                      flexWrap: isPhone ? undefined : "wrap",
                      gap: isPhone ? 8 : 6,
                    }}
                  >
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        minWidth: 0,
                        width: isPhone ? "100%" : undefined,
                      }}
                    >
                      <div
                        style={{
                          ...sectionLabel(),
                          color: "rgba(226,232,240,0.82)",
                          textAlign: isPhone ? "center" : "left",
                          fontSize: isPhone ? 11 : 12,
                        }}
                      >
                        Trust and verification
                      </div>
                    </div>

                    <span
                      style={{
                        display: "grid",
                        justifyItems: "center",
                        alignItems: "center",
                        width: isPhone ? "100%" : "fit-content",
                        maxWidth: "100%",
                        boxSizing: "border-box",
                        gap: isPhone ? 4 : 3,
                        minHeight: isPhone ? 58 : 46,
                        padding: isPhone ? "7px 10px" : "6px 12px",
                        borderRadius: isPhone ? 11 : 9,
                        background:
                          "linear-gradient(180deg, rgba(255,248,220,0.98) 0%, rgba(243,220,152,0.96) 48%, rgba(229,196,102,0.94) 100%)",
                        color: "#6B4300",
                        border: "1px solid rgba(145,103,19,0.26)",
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.94), inset 0 -2px 0 rgba(145,103,19,0.12), 0 10px 20px rgba(15,23,42,0.16)",
                        fontWeight: 900,
                        fontSize: isPhone ? 9.5 : 10,
                        letterSpacing: 0.04,
                        whiteSpace: "nowrap",
                        textAlign: "center",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "baseline",
                          justifyContent: "center",
                          gap: 6,
                          color: "#4F2F00",
                          fontSize: isPhone ? 13.5 : 13,
                          lineHeight: 1,
                        }}
                      >
                        <span
                          style={{
                            opacity: 0.72,
                            fontSize: isPhone ? 9.2 : 10,
                            textTransform: "uppercase",
                          }}
                        >
                          Holder
                        </span>
                        <span>{greetingName}</span>
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "baseline",
                          justifyContent: "center",
                          gap: 6,
                          color: "#4F2F00",
                          fontSize: isPhone ? 13.5 : 13,
                          lineHeight: 1.05,
                          letterSpacing: isPhone ? 0.8 : 0.04,
                          maxWidth: "100%",
                          whiteSpace: "normal",
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                        }}
                      >
                        <span
                          style={{
                            opacity: 0.72,
                            fontSize: isPhone ? 9.2 : 10,
                            letterSpacing: 0.04,
                            textTransform: "uppercase",
                            whiteSpace: "nowrap",
                          }}
                        >
                          GSN ID
                        </span>
                        <span>{visibleGsnId}</span>
                      </span>
                    </span>
                  </div>

                  <div
                    style={{
                      display: isPhone ? "none" : undefined,
                      marginTop: isPhone ? 7 : 4,
                      color: "rgba(226,232,240,0.86)",
                      fontSize: isPhone ? 11.5 : 12,
                      lineHeight: isPhone ? 1.38 : 1.45,
                      maxWidth: 560,
                    }}
                  >
                    This is the short record people can check before they trust,
                    trade, or support you.
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      ...innerCard(
                        "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)"
                      ),
                      border: "1px solid rgba(212,175,55,0.16)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 20px rgba(2,12,27,0.08)",
                      padding: isPhone ? 8 : 12,
                      borderRadius: isPhone ? 14 : 18,
                      display: "grid",
                      gap: isPhone ? 7 : 10,
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isPhone
                          ? "repeat(3, minmax(0, 1fr))"
                          : "repeat(3, minmax(0, 1fr))",
                        gap: isPhone ? 6 : 8,
                        alignItems: "center",
                      }}
                    >
                      <span style={trustMetricTile(true, "gold")}>
                        <span style={trustMetricLabel()}>Trust</span>
                        <span style={trustMetricValue(true)}>
                          {openTrust.classText}
                        </span>
                      </span>
                      <span style={trustMetricTile(false, "blue")}>
                        <span style={trustMetricLabel()}>CCI</span>
                        <span style={trustMetricValue()}>{cci.classText}</span>
                      </span>
                      <span style={trustMetricTile(false, "steel")}>
                        <span style={trustMetricLabel()}>TrustSlip</span>
                        <span
                          style={{
                            ...trustMetricValue(),
                            fontSize: isPhone ? 10.4 : 12,
                          }}
                        >
                          {trustSlipCode || "Pending"}
                        </span>
                      </span>
                    </div>

                    <details
                      style={{
                        color: "rgba(226,232,240,0.86)",
                        fontSize: isPhone ? 11.8 : 13,
                        lineHeight: isPhone ? 1.45 : 1.62,
                      }}
                    >
                      <summary
                        style={{
                          cursor: "pointer",
                          color: "#F6D77A",
                          fontWeight: 900,
                          fontSize: isPhone ? 11.5 : 12,
                          letterSpacing: 0.08,
                          touchAction: "manipulation",
                        }}
                      >
                        More trust detail
                      </summary>
                      <div style={{ marginTop: 6 }}>
                        This is the short record people can check before they
                        trust, trade, or support you. Dashboard keeps the trust
                        signal here. The deeper trust, TrustSlip, QR, and
                        verification detail now belong in Trust Passport and
                        related trust pages.
                      </div>
                    </details>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isPhone
                          ? `repeat(${trustSlipCode ? 3 : 2}, minmax(0, 1fr))`
                          : `repeat(${trustSlipCode ? 3 : 2}, minmax(132px, 1fr))`,
                        gap: isPhone ? 6 : 8,
                        alignItems: "stretch",
                      }}
                    >
                      <button
                        type="button"
                        onClick={(event) => openDashboardRoute(event, "/app/trust")}
                        onPointerDown={consumeDashboardPointerEvent}
                        style={trustActionButton()}
                      >
                        Trust
                      </button>

                      <button
                        type="button"
                        onClick={(event) => openDashboardRoute(event, "/app/identity")}
                        onPointerDown={consumeDashboardPointerEvent}
                        style={trustActionButton()}
                      >
                        Identity
                      </button>

                      {trustSlipCode ? (
                        <button
                          type="button"
                          onClick={openTrustSlipPage}
                          onPointerDown={consumeDashboardPointerEvent}
                          style={trustActionButton()}
                        >
                          TrustSlip
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      <NextActionGuide
        storageKey="gmfn.dashboard.nextActionGuide.v1"
        compact={isPhone || isCompact}
        items={dashboardNextActionItems}
        searchItems={dashboardGuideSearchItems}
        onSelect={handleDashboardNextAction}
        intro="Say what you want in normal words, like loan, deposit, withdraw, shop, trust, community, or marketplace. GSN will point you to the closest route."
      />

      <DomainIntroToggle
        title="How Dashboard Helps You"
        body={DASHBOARD_HELP_BODY}
        bullets={DASHBOARD_HELP_BULLETS}
        note={DASHBOARD_HELP_NOTE}
        tone="blue"
      />

      <section
        style={{
          ...pageCard(
            "radial-gradient(circle at top left, rgba(11,99,209,0.14) 0%, rgba(11,99,209,0) 38%), linear-gradient(180deg, #F8FBFF 0%, #EEF6FF 100%)"
          ),
          position: "relative",
          border: "1px solid rgba(15,59,116,0.16)",
          padding: isPhone ? 10 : isCompact ? 16 : 18,
          borderRadius: isPhone ? 24 : 28,
          boxShadow:
            "0 22px 46px rgba(10,24,49,0.09), inset 0 1px 0 rgba(255,255,255,0.82)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: isPhone ? 5 : 6,
            background:
              "linear-gradient(90deg, #0B63D1 0%, #F3D06A 44%, #0F3B74 100%)",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: isPhone ? 8 : 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
          >
            <div>
              <div style={sectionLabel()}>Spotlight</div>
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <span style={badge(true)}>
                  {spotlightQueueTotal || spotlights.length} live / queued
                </span>
                <span style={badge(false)}>
                  Rotates every {SPOTLIGHT_PILOT_ROTATION_SECONDS_LABEL} seconds
                </span>
              </div>
            </div>

          <div
            style={{
              display: "flex",
              gap: isPhone ? 6 : 8,
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
                  style={spotlightWhiteButton({
                    width: "auto",
                    minWidth: isPhone ? 92 : 120,
                  })}
                >
                  Previous
                </button>

                <span
                  style={{
                    ...badge(false),
                    minHeight: isPhone ? 46 : 40,
                    padding: isPhone ? "10px 12px" : "8px 14px",
                    borderRadius: isPhone ? 15 : 15,
                    background:
                      "linear-gradient(180deg, #FFFFFF 0%, #F4F8FC 100%)",
                    color: "#123055",
                    boxShadow:
                      "0 10px 20px rgba(10,24,49,0.05), inset 0 1px 0 rgba(255,255,255,0.86)",
                  }}
                >
                  Spotlight {(spotlightIndex % spotlights.length) + 1} / {spotlights.length}
                </span>

                <button
                  type="button"
                  onClick={goNextSpotlight}
                  onPointerDown={consumeDashboardPointerEvent}
                  style={spotlightWhiteButton({
                    width: "auto",
                    minWidth: isPhone ? 74 : 104,
                  })}
                >
                  Next
                </button>
              </>
            ) : null}

            {!showSpotlight ? (
              <button
                type="button"
                onClick={openDashboardSpotlightGuide}
                onPointerDown={consumeDashboardPointerEvent}
                style={secondaryBtn(false)}
              >
                Open spotlight tasks
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
                  onClick={openDashboardSpotlightGuide}
                  onPointerDown={consumeDashboardPointerEvent}
                  style={primaryBtn(false)}
                >
                  Open spotlight tasks
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
                marginTop: isPhone ? 10 : 16,
                ...innerCard(
                  "linear-gradient(180deg, #09233C 0%, #0D355B 48%, #0B63D1 100%)"
                ),
                border: "1px solid rgba(243,208,106,0.30)",
                padding: isPhone ? 8 : 12,
                borderRadius: isPhone ? 20 : 22,
                boxShadow:
                  "0 24px 48px rgba(9,35,60,0.20), inset 0 1px 0 rgba(255,255,255,0.14)",
              }}
            >
              <div
                style={{
                  position: "relative",
                  minHeight: dashboardSpotlightScreenHeight,
                  padding: isPhone ? 8 : 10,
                  borderRadius: isPhone ? 18 : 22,
                  overflow: "hidden",
                  border: "1px solid rgba(243,208,106,0.38)",
                  outline: "1px solid rgba(255,255,255,0.12)",
                  outlineOffset: "-6px",
                  background:
                    "linear-gradient(180deg, #061525 0%, #0A2744 45%, #0F3B74 100%)",
                  boxShadow:
                    "0 18px 34px rgba(2,12,27,0.24), inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.16)",
                }}
              >
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
                    height: dashboardSpotlightScreenHeight,
                    minHeight: dashboardSpotlightScreenHeight,
                    borderRadius: isPhone ? 12 : 14,
                    background: "transparent",
                    boxShadow:
                      "inset 0 0 0 1px rgba(255,255,255,0.10), 0 0 0 1px rgba(2,12,27,0.46)",
                  }}
                  mediaStyle={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                  contentPadding={0}
                  showVideoControls={false}
                  autoPlayVideo={Boolean(spotlightVideoCandidate)}
                  mutedVideo={Boolean(spotlightVideoCandidate)}
                  loopVideo={Boolean(spotlightVideoCandidate)}
                  maxVideoSeconds={SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS}
                  fallback={
                    <div
                      style={{
                        width: "100%",
                        height: dashboardSpotlightScreenHeight,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#F8FBFF",
                        fontWeight: 900,
                        letterSpacing: 0.8,
                        fontSize: isPhone ? 18 : 24,
                      }}
                    >
                      GSN Spotlight
                    </div>
                  }
                />
                <div
                  style={{
                    position: "absolute",
                    inset: isPhone ? 8 : 10,
                    borderRadius: isPhone ? 12 : 14,
                    pointerEvents: "none",
                    background:
                      "linear-gradient(180deg, rgba(6,19,34,0.16) 0%, rgba(6,19,34,0.08) 38%, rgba(6,19,34,0.72) 100%)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: isPhone ? 16 : 18,
                    left: isPhone ? 16 : 18,
                    right: isPhone ? 16 : 18,
                    display: "flex",
                    gap: isPhone ? 5 : 7,
                    flexWrap: "wrap",
                    alignItems: "center",
                    pointerEvents: "none",
                  }}
                >
                  <span
                    style={{
                      ...badge(true),
                      minHeight: isPhone ? 26 : 30,
                      padding: isPhone ? "5px 8px" : "6px 10px",
                      background: "rgba(255,255,255,0.9)",
                      boxShadow: "0 10px 22px rgba(2,12,27,0.12)",
                    }}
                  >
                    {safeStr(activeSpotlight.trust_band || "Trusted member")}
                  </span>
                  <span
                    style={{
                      ...badge(false),
                      minHeight: isPhone ? 26 : 30,
                      padding: isPhone ? "5px 8px" : "6px 10px",
                      background: spotlightExpiryStatus.urgent
                        ? "rgba(255,247,237,0.92)"
                        : "rgba(239,246,255,0.92)",
                      color: spotlightExpiryStatus.urgent ? "#9A3412" : "#1D4ED8",
                      boxShadow: "0 10px 22px rgba(2,12,27,0.12)",
                    }}
                  >
                    {spotlightExpiryStatus.chip}
                  </span>
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: isPhone ? 18 : 22,
                    right: isPhone ? 18 : 22,
                    bottom: isPhone ? 17 : 20,
                    display: "grid",
                    gap: 4,
                    color: "#FFFFFF",
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: dashboardSpotlightTitleSize,
                      lineHeight: 1.15,
                      textShadow: "0 10px 22px rgba(0,0,0,0.34)",
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
                      fontSize: isPhone ? 12 : 13,
                      lineHeight: 1.32,
                      color: "rgba(255,255,255,0.88)",
                      fontWeight: 800,
                      textShadow: "0 8px 18px rgba(0,0,0,0.34)",
                    }}
                  >
                    {safeStr(
                      activeSpotlight.source_shop_name ||
                        activeSpotlight.author_name ||
                        "Community seller"
                    )}{" "}
                    -{" "}
                    {safeStr(
                      activeSpotlight.source_clan_name ||
                        currentCommunityName(currentClan, selectedClanId)
                    )}
                  </div>
                </div>

                <div style={{ display: "none" }}>
                  <div
                    style={{
                      display: "flex",
                      gap: isPhone ? 6 : 8,
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
                    {!isPhone ? (
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
                    ) : null}
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

                  <div
                    style={{
                      ...helperText(),
                      ...dashboardPhoneHelper,
                      maxWidth: 820,
                    }}
                  >
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
                        lineHeight: isPhone ? 1.45 : 1.65,
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
                      fontSize: isPhone ? 12.5 : 13,
                      fontWeight: 700,
                    }}
                  >
                    {spotlightExpiryStatus.detail}
                  </div>

                  <div
                    style={{
                      ...helperText(),
                      ...dashboardPhoneHelper,
                      maxWidth: 860,
                    }}
                  >
                    Dashboard now keeps spotlight as a quick summary. Open the
                    marketplace or shop for the fuller seller and media context.
                  </div>

                  <div style={{ ...dashboardActionGrid(isCompact ? 128 : 152) }}>
                    <button
                      type="button"
                      onClick={openSpotlightMarketplace}
                      onPointerDown={consumeDashboardPointerEvent}
                      style={dashboardFillButton(
                        secondaryBtn(false),
                        dashboardPhoneButton
                      )}
                    >
                      Open marketplace
                    </button>
                    {safeStr(activeSpotlight.author_gmfn_id || "") ? (
                      <button
                        type="button"
                        onClick={openSpotlightShop}
                        onPointerDown={consumeDashboardPointerEvent}
                        style={dashboardFillButton(
                          secondaryBtn(false),
                          dashboardPhoneButton
                        )}
                      >
                        Open shop
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={minimizeSpotlight}
                      onPointerDown={consumeDashboardPointerEvent}
                      style={dashboardFillButton(
                        subtleBtn(false),
                        dashboardPhoneButton
                      )}
                    >
                      Minimize
                    </button>
                  </div>
                </div>
              </div>
              <div
                onPointerDown={consumeDashboardPointerEvent}
                style={{
                  marginTop: isPhone ? 14 : 10,
                  borderRadius: isPhone ? 16 : 17,
                  border: "1px solid rgba(243,208,106,0.24)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(238,246,255,0.97) 100%)",
                  padding: isPhone ? 10 : 9,
                  color: "#35516B",
                  fontSize: isPhone ? 11.8 : 13,
                  lineHeight: isPhone ? 1.38 : 1.55,
                }}
              >
                <button
                  type="button"
                  onClick={toggleSpotlightGuide}
                  onPointerDown={consumeDashboardPointerEvent}
                  style={{
                    width: "100%",
                    minHeight: isPhone ? 54 : 42,
                    padding: isPhone ? "10px 14px" : "8px 14px",
                    border: "1px solid rgba(15,59,116,0.16)",
                    borderRadius: isPhone ? 16 : 14,
                    background:
                      "linear-gradient(180deg, #FFFFFF 0%, #F4F8FC 100%)",
                    boxShadow:
                      "0 12px 24px rgba(10,24,49,0.08), inset 0 1px 0 rgba(255,255,255,0.88)",
                    cursor: "pointer",
                    color: "#123055",
                    fontWeight: 900,
                    fontSize: isPhone ? 13.4 : 13,
                    letterSpacing: 0.12,
                    touchAction: "manipulation",
                    userSelect: "none",
                  }}
                >
                  {spotlightGuideOpen ? "Close Spotlight" : "About Spotlight"}
                </button>
                {spotlightGuideOpen ? (
                  <div
                    style={{
                      marginTop: isPhone ? 12 : 7,
                      display: "grid",
                      gap: isPhone ? 6 : 8,
                      maxHeight: isPhone ? 216 : undefined,
                      overflowY: isPhone ? "auto" : undefined,
                      paddingRight: isPhone ? 2 : 0,
                    }}
                  >
                  <div
                    style={{
                      ...helperText(),
                      ...dashboardPhoneHelper,
                      fontSize: isPhone ? 11.4 : 13,
                      lineHeight: isPhone ? 1.3 : 1.58,
                    }}
                  >
                    Spotlight is your community display window. Show goods,
                    services, or an update your community should notice.
                  </div>
                  <div
                    style={{
                      color: "#475569",
                      fontSize: isPhone ? 11.3 : dashboardSpotlightBodyFontSize,
                      lineHeight: isPhone ? 1.3 : 1.58,
                      fontWeight: 800,
                    }}
                  >
                    Open Community Home to upload a picture or video. GSN will
                    show it here as a quick live preview, then people can open
                    your marketplace or shop for the full details.
                  </div>
                  <div
                    style={{
                      color: spotlightExpiryStatus.urgent ? "#9A3412" : "#1D4ED8",
                      fontSize: isPhone ? 10.9 : 12.5,
                      fontWeight: 800,
                    }}
                  >
                    Current slot: {spotlightExpiryStatus.detail}
                  </div>
                  <div
                    style={
                      isPhone
                        ? {
                            display: "grid",
                            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                            gap: 8,
                            alignItems: "stretch",
                          }
                        : { ...dashboardActionGrid(isCompact ? 118 : 152) }
                    }
                  >
                    <button
                      type="button"
                      onClick={openDashboardSpotlightGuide}
                      onPointerDown={consumeDashboardPointerEvent}
                      style={spotlightActionButton()}
                    >
                      Upload
                    </button>
                    <button
                      type="button"
                      onClick={openSpotlightMarketplace}
                      onPointerDown={consumeDashboardPointerEvent}
                      style={spotlightActionButton()}
                    >
                      Market
                    </button>
                    {safeStr(activeSpotlight.author_gmfn_id || "") ? (
                      <button
                        type="button"
                        onClick={openSpotlightShop}
                        onPointerDown={consumeDashboardPointerEvent}
                        style={spotlightActionButton()}
                      >
                        Shop
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={minimizeSpotlight}
                      onPointerDown={consumeDashboardPointerEvent}
                      style={spotlightWhiteButton()}
                    >
                      Hide
                    </button>
                  </div>
                </div>
                ) : null}
              </div>
            </div>

            {showLegacySpotlightDock ? ((activeSpotlight: SpotlightItem) => (
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
                  maxVideoSeconds={SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS}
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
                onClick={openDashboardSpotlightGuide}
                onPointerDown={consumeDashboardPointerEvent}
                style={dashboardFillButton(secondaryBtn(false))}
              >
                Open spotlight tasks
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 16, color: "#64748B" }}>
            No active spotlight is available yet.
          </div>
        )}
      </section>

      <section
        style={{
          ...pageCard(demandSurfaceChrome.shellBg),
          border: demandSurfaceChrome.shellBorder,
          padding: isPhone ? 13 : 20,
          borderRadius: isPhone ? 22 : 26,
        }}
      >
        <div
          style={{
            height: 3,
            margin: isPhone ? "-2px 0 10px" : "-3px 0 14px",
            borderRadius: 999,
            background: demandSurfaceChrome.accent,
            opacity: 0.88,
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: isPhone ? 8 : 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={sectionLabel()}>Demand Box</div>
            <div
              style={{
                marginTop: 3,
                ...helperText(),
                ...dashboardPhoneHelper,
                maxWidth: 420,
              }}
            >
              Live demand in your community.
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: isPhone ? 6 : 8,
              flexWrap: "wrap",
              justifyContent: "flex-end",
              alignItems: "center",
              flex: isPhone ? "1 1 100%" : undefined,
            }}
          >
            <button
              type="button"
              onClick={toggleDemandGuide}
              onPointerDown={consumeDashboardPointerEvent}
              style={spotlightWhiteButton({
                width: "auto",
                minWidth: isPhone ? 0 : 150,
                minHeight: isPhone ? 42 : 40,
                padding: isPhone ? "8px 10px" : "8px 14px",
                flex: isPhone ? "1 1 0" : "0 0 auto",
              })}
            >
              {demandGuideOpen ? "Close guide" : "About Demand Box"}
            </button>
            <span
              style={{
                ...badge(false),
                minHeight: isPhone ? 42 : 40,
                minWidth: isPhone ? 52 : 56,
                justifyContent: "center",
                padding: isPhone ? "8px 12px" : "8px 14px",
                background: demandSurfaceChrome.chipBg,
                border: demandSurfaceChrome.chipBorder,
                color: "#123055",
              }}
            >
              {demandItems.length}
            </span>
            <span
              style={{
                ...badge(false),
                minHeight: isPhone ? 42 : 40,
                minWidth: isPhone ? 90 : 104,
                justifyContent: "center",
                padding: isPhone ? "8px 12px" : "8px 14px",
                background: demandSurfaceChrome.statusBg,
                color: demandSurfaceChrome.statusText,
                border: demandSurfaceChrome.chipSelectedBorder,
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

        {demandGuideOpen ? (
          <div
            style={{
              marginTop: isPhone ? 9 : 12,
              borderRadius: isPhone ? 15 : 18,
              border: "1px solid rgba(11,99,209,0.12)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(242,247,253,0.95) 100%)",
              padding: isPhone ? "10px 11px" : "12px 14px",
              color: "#123055",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.84), 0 10px 22px rgba(10,24,49,0.05)",
            }}
            onPointerDown={consumeDashboardPointerEvent}
          >
            <div
              style={{
                fontWeight: 900,
                fontSize: isPhone ? 13.5 : 15,
                lineHeight: 1.28,
              }}
            >
              {demandGuideTitle}
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: isPhone ? 12.2 : 13,
                lineHeight: isPhone ? 1.45 : 1.6,
                fontWeight: 700,
                color: "#49647E",
              }}
            >
              {demandGuideBody}
            </div>
          </div>
        ) : null}

        <div
          style={{
            marginTop: isPhone ? 10 : 14,
            ...innerCard(demandSurfaceChrome.leadBg),
            border: demandSurfaceChrome.leadBorder,
            boxShadow: demandSurfaceChrome.leadShadow,
            padding: isPhone ? 9 : isCompact ? 14 : 16,
            borderRadius: isPhone ? 16 : 18,
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
                fontSize: isPhone ? 15 : 18,
                lineHeight: isPhone ? 1.22 : 1.32,
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
              ...dashboardPhoneHelper,
              maxWidth: 820,
              color: "#44617D",
            }}
          >
            {demandSummarySubline}
          </div>

          <div
            style={{
              marginTop: 12,
              ...innerCard(demandSurfaceChrome.detailBg),
              border: demandSurfaceChrome.detailBorder,
              padding: isPhone ? 8 : isCompact ? 12 : 14,
              borderRadius: isPhone ? 15 : 18,
              boxShadow:
                "0 12px 28px rgba(10,24,49,0.06), inset 0 1px 0 rgba(255,255,255,0.84)",
              display: "grid",
              gap: isPhone ? 8 : 10,
            }}
          >
            {currentDemandItem ? (
              <div
                style={{
                  ...softCard(demandSurfaceChrome.itemBg),
                  border: demandSurfaceChrome.itemBorder,
                  padding: isPhone ? 10 : 12,
                  borderRadius: isPhone ? 14 : 18,
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
                      fontSize: isPhone ? 15 : undefined,
                      lineHeight: isPhone ? 1.24 : 1.3,
                      flex: "1 1 220px",
                    }}
                  >
                    {safeStr(currentDemandItem.title || "Current demand request")}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={badge(currentDemandIsUrgent)}>
                      {currentDemandIsUrgent ? "Urgent" : "Open"}
                    </span>
                    {safeDateTime(currentDemandItem.created_at) ? (
                      <span style={badge(false)}>
                        {safeDateTime(currentDemandItem.created_at)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 6,
                    ...helperText(),
                    fontSize: isPhone ? 12.5 : 13,
                    lineHeight: isPhone ? 1.46 : 1.75,
                  }}
                >
                  {safeStr(
                    currentDemandItem.description ||
                      "Open Demand Box to read the full request."
                  )}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <span style={badge(false)}>{demandCommunityLabel}</span>
                  {safeStr(
                    currentDemandItem.requester_name ||
                      currentDemandItem.requester_nickname
                  ) ? (
                    <span style={badge(false)}>
                      {safeStr(
                        currentDemandItem.requester_name ||
                          currentDemandItem.requester_nickname
                      )}
                    </span>
                  ) : null}
                  {demandRequesterId ? (
                    <span style={badge(false)}>GSN ID {demandRequesterId}</span>
                  ) : null}
                  {demandRequesterTrust ? (
                    <span style={badge(false)}>Trust {demandRequesterTrust}</span>
                  ) : null}
                  {demandPaymentMode ? (
                    <span style={badge(false)}>{demandPaymentMode}</span>
                  ) : null}
                  {currentDemandItem.allow_trust_credit ? (
                    <span style={badge(false)}>Trust credit accepted</span>
                  ) : null}
                  {demandArea ? (
                    <span style={badge(false)}>{demandArea}</span>
                  ) : null}
                  {remainingDemandCount > 0 ? (
                    <span style={badge(false)}>
                      {remainingDemandCount} more waiting
                    </span>
                  ) : null}
                  {urgentDemandItems.length > 1 ? (
                    <span style={badge(true)}>
                      {urgentDemandItems.length} urgent total
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              <div
                style={{
                  ...softCard(demandSurfaceChrome.itemBg),
                  border: demandSurfaceChrome.itemBorder,
                  padding: isPhone ? 10 : 12,
                  borderRadius: isPhone ? 14 : 18,
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.84), 0 8px 18px rgba(10,24,49,0.05)",
                }}
              >
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 800,
                    fontSize: isPhone ? 15 : undefined,
                    lineHeight: isPhone ? 1.24 : 1.3,
                  }}
                >
                  No open demand is waiting.
                </div>
                <div
                  style={{
                    marginTop: 5,
                    ...helperText(),
                    fontSize: isPhone ? 12.2 : 13,
                    lineHeight: isPhone ? 1.42 : 1.75,
                  }}
                >
                  Create demand when you need goods, service, support, or
                  follow-up. Your GSN ID stays attached.
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
                  <span style={badge(false)}>{demandCommunityLabel}</span>
                  {safeStr(me?.gmfn_id) ? (
                    <span style={badge(false)}>GSN ID {safeStr(me?.gmfn_id)}</span>
                  ) : null}
                </div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: isPhone ? "3px 0 0" : "2px 0",
              }}
            >
              <button
                type="button"
                onClick={(event) =>
                  openDashboardRoute(event, demandPrimaryActionTo)
                }
                onPointerDown={consumeDashboardPointerEvent}
                style={spotlightWhiteButton({
                  ...dashboardPhoneButton,
                  width: isPhone ? "min(100%, 230px)" : "min(100%, 260px)",
                  minWidth: isPhone ? 168 : 176,
                  flex: "0 0 auto",
                })}
              >
                {demandPrimaryActionLabel}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          ...pageCard(notificationSurfaceChrome.shellBg),
          border: notificationSurfaceChrome.shellBorder,
          padding: isPhone ? 13 : 20,
          borderRadius: isPhone ? 22 : 26,
        }}
      >
        <div
          style={{
            height: 3,
            margin: isPhone ? "-2px 0 10px" : "-3px 0 14px",
            borderRadius: 999,
            background: notificationSurfaceChrome.accent,
            opacity: 0.88,
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: isPhone ? 8 : 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={sectionLabel()}>Notifications</div>
            <div
              style={{
                marginTop: 2,
                ...helperText(),
                ...dashboardPhoneHelper,
                maxWidth: 420,
              }}
            >
              See where the latest notification came from.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: isPhone ? 6 : 10,
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: isPhone ? "stretch" : "flex-end",
              flex: isPhone ? "1 1 100%" : undefined,
            }}
          >
            <span
              style={{
                ...badge(false),
                minHeight: isPhone ? 42 : 40,
                minWidth: isPhone ? 0 : 126,
                justifyContent: "center",
                padding: isPhone ? "8px 12px" : "8px 14px",
                background: notificationSurfaceChrome.chipBg,
                border: notificationSurfaceChrome.chipBorder,
                color: "#123055",
                flex: isPhone ? "1 1 0" : "0 0 auto",
              }}
            >
              Notifications
            </span>
            <span
              style={{
                ...badge(false),
                minHeight: isPhone ? 42 : 40,
                minWidth: isPhone ? 52 : 56,
                justifyContent: "center",
                padding: isPhone ? "8px 12px" : "8px 14px",
                background: notificationSurfaceChrome.statusBg,
                border: notificationSurfaceChrome.chipSelectedBorder,
                color: notificationSurfaceChrome.statusText,
              }}
            >
              {dashboardNoticeTotalCount}
            </span>
            <span
              style={{
                ...badge(false),
                minHeight: isPhone ? 42 : 40,
                minWidth: isPhone ? 90 : 104,
                justifyContent: "center",
                padding: isPhone ? "8px 12px" : "8px 14px",
                background: notificationSurfaceChrome.statusBg,
                border: notificationSurfaceChrome.chipSelectedBorder,
                color: notificationSurfaceChrome.statusText,
              }}
            >
              {dashboardNoticeSummary.counts.actNow > 0
                ? `Act now ${dashboardNoticeSummary.counts.actNow}`
                : dashboardNoticeSummary.counts.unread > 0
                ? `Unread ${dashboardNoticeSummary.counts.unread}`
                : dashboardNoticeTotalCount > 0
                ? "Waiting"
                : "Clear"}
            </span>
          </div>
        </div>

        <div
          style={{
            marginTop: isPhone ? 10 : 16,
            ...innerCard(notificationSurfaceChrome.leadBg),
            border: notificationSurfaceChrome.leadBorder,
            padding: isPhone ? 9 : 16,
            borderRadius: isPhone ? 16 : 18,
            boxShadow: notificationSurfaceChrome.leadShadow,
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
                fontSize: isPhone ? 15 : 18,
                lineHeight: isPhone ? 1.24 : 1.32,
                maxWidth: 760,
              }}
            >
              {isPhone
                ? dashboardNoticePhoneSummaryLine
                : dashboardNoticeSummaryLine}
            </div>

            <div
              style={{
                display: "flex",
                gap: isPhone ? 6 : 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {dashboardNoticeSourceGroups.length > 0 ? (
                <span
                  style={{
                    ...badge(false),
                    background: notificationSurfaceChrome.chipBg,
                    border: notificationSurfaceChrome.chipBorder,
                  }}
                >
                  {dashboardNoticeSourceGroups.length} screen
                  {dashboardNoticeSourceGroups.length === 1 ? "" : "s"}
                </span>
              ) : null}
              {dashboardNoticeSummary.counts.actNow > 0 ? (
                <span
                  style={{
                    ...badge(true),
                    background: notificationSurfaceChrome.statusBg,
                    border: notificationSurfaceChrome.chipSelectedBorder,
                    color: notificationSurfaceChrome.statusText,
                  }}
                >
                  Act now {dashboardNoticeSummary.counts.actNow}
                </span>
              ) : null}
              {dashboardNoticeSummary.counts.unread > 0 ? (
                <span
                  style={{
                    ...badge(false),
                    background: notificationSurfaceChrome.chipBg,
                    border: notificationSurfaceChrome.chipBorder,
                  }}
                >
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

          {dashboardNoticeLeadItem ? (
            <div
              style={{
                marginTop: 12,
                ...innerCard(notificationSurfaceChrome.itemBg),
                border: notificationSurfaceChrome.itemBorder,
                padding: isPhone ? 9 : isCompact ? 12 : 14,
                borderRadius: isPhone ? 15 : 18,
                boxShadow:
                  "0 12px 28px rgba(10,24,49,0.06), inset 0 1px 0 rgba(255,255,255,0.84)",
                display: "grid",
                gap: isPhone ? 8 : 10,
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
                    fontSize: isPhone ? 14.5 : undefined,
                    lineHeight: isPhone ? 1.24 : 1.3,
                    flex: "1 1 240px",
                  }}
                >
                  {dashboardNoticeLeadItem.title}
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span
                    style={{
                      ...badge(dashboardNoticeLeadItem.bucket === "actNow"),
                      background:
                        dashboardNoticeLeadItem.bucket === "actNow"
                          ? notificationSurfaceChrome.statusBg
                          : notificationSurfaceChrome.chipBg,
                      border:
                        dashboardNoticeLeadItem.bucket === "actNow"
                          ? notificationSurfaceChrome.chipSelectedBorder
                          : notificationSurfaceChrome.chipBorder,
                      color:
                        dashboardNoticeLeadItem.bucket === "actNow"
                          ? notificationSurfaceChrome.statusText
                          : undefined,
                    }}
                  >
                    {dashboardNoticeLeadItem.bucket === "actNow"
                      ? "Act now"
                      : dashboardNoticeLeadItem.unread
                      ? "Unread"
                      : "Open"}
                  </span>
                  {dashboardNoticeLeadGroup ? (
                    <span
                      style={{
                        ...badge(false),
                        background: notificationSurfaceChrome.chipBg,
                        border: notificationSurfaceChrome.chipBorder,
                      }}
                    >
                      {dashboardNoticeLeadGroup.title}
                    </span>
                  ) : null}
                  {dashboardNoticeTotalCount > 1 ? (
                    <span
                      style={{
                        ...badge(false),
                        background: notificationSurfaceChrome.chipBg,
                        border: notificationSurfaceChrome.chipBorder,
                      }}
                    >
                      {dashboardNoticeTotalCount - 1} more waiting
                    </span>
                  ) : null}
                </div>
              </div>

              <div
                style={{
                  ...helperText(),
                  fontSize: isPhone ? 12.2 : 13,
                  lineHeight: isPhone ? 1.42 : 1.75,
                }}
              >
                {dashboardNoticeLeadItem.detail}
              </div>

              {dashboardNoticeLeadGroup ? (
                <div
                  style={{
                    ...helperText(),
                    fontSize: isPhone ? 12 : 12.5,
                    lineHeight: isPhone ? 1.38 : 1.75,
                  }}
                >
                  {dashboardNoticeLeadGroup.detail}
                </div>
              ) : null}

              <div style={{ ...dashboardActionGrid(isCompact ? 132 : 156) }}>
                <button
                  type="button"
                  onClick={(event) =>
                    openDashboardRoute(event, dashboardNoticePrimaryActionTo)
                  }
                  onPointerDown={consumeDashboardPointerEvent}
                  style={spotlightWhiteButton({
                    minHeight: isPhone ? 46 : 40,
                    padding: isPhone ? "10px 12px" : "8px 14px",
                    borderRadius: isPhone ? 15 : 15,
                    width: "100%",
                  })}
                >
                  {dashboardNoticePrimaryActionLabel}
                </button>
                <button
                  type="button"
                  onClick={(event) =>
                    openDashboardRoute(event, DASHBOARD_TARGETS.WHAT_MATTERS_NOW)
                  }
                  onPointerDown={consumeDashboardPointerEvent}
                  style={spotlightWhiteButton({
                    minHeight: isPhone ? 46 : 40,
                    padding: isPhone ? "10px 12px" : "8px 14px",
                    borderRadius: isPhone ? 15 : 15,
                    width: "100%",
                  })}
                >
                  Open notifications
                </button>
              </div>
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
          marginTop: isPhone ? 10 : 14,
          ...pageCard(DASHBOARD_BRAND.raisedPanel),
          padding: isPhone ? 12 : 20,
          display: "grid",
          gap: isPhone ? 10 : 14,
        }}
      >
          <div
            id="focus-commitments"
            style={{
              position: "relative",
              ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F4F9FF 100%)"),
              padding: isPhone ? 14 : 16,
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
                gap: isPhone ? 8 : 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={sectionLabel()}>Focus Commitments</div>

              <div
                style={{
                  display: isPhone ? "grid" : "flex",
                  gridTemplateColumns: isPhone ? "1fr 1.25fr" : undefined,
                  gap: isPhone ? 7 : 8,
                  flexWrap: "wrap",
                  width: isPhone ? "100%" : undefined,
                }}
              >
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
                  style={focusCommitmentButton(
                    activeFocusCount >= 2
                      ? {
                          opacity: 0.7,
                          cursor: "not-allowed",
                          background:
                            "linear-gradient(180deg, #F8FAFC 0%, #E2E8F0 100%)",
                        }
                      : {}
                  )}
                  disabled={activeFocusCount >= 2}
                >
                  {focusComposerOpen ? "Close composer" : "Add commitment"}
                </button>
              </div>
            </div>

            <div
              style={{
                marginTop: isPhone ? 10 : 14,
                display: "grid",
                gap: isPhone ? 8 : 10,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: isPhone ? 6 : 8,
                }}
              >
                <div
                  style={{
                    ...statTile("#F3FBF5", "1px solid rgba(34,197,94,0.16)"),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: isPhone ? 5 : 8,
                    padding: isPhone ? "7px 8px" : "8px 10px",
                  }}
                >
                  <div style={focusMetricLabelStyle}>On track</div>
                  <div
                    style={{
                      color: "#166534",
                      fontWeight: 900,
                      fontSize: isPhone ? 16 : 17,
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
                    gap: isPhone ? 5 : 8,
                    padding: isPhone ? "7px 8px" : "8px 10px",
                  }}
                >
                  <div style={focusMetricLabelStyle}>Watch</div>
                  <div
                    style={{
                      color: "#92400E",
                      fontWeight: 900,
                      fontSize: isPhone ? 16 : 17,
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
                    gap: isPhone ? 5 : 8,
                    padding: isPhone ? "7px 8px" : "8px 10px",
                  }}
                >
                  <div style={focusMetricLabelStyle}>Behind</div>
                  <div
                    style={{
                      color: "#991B1B",
                      fontWeight: 900,
                      fontSize: isPhone ? 16 : 17,
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
                      onClick={(event) =>
                        runDashboardUiMutation(event, () =>
                          prefillFocusDraft("savings")
                        )
                      }
                      onPointerDown={consumeDashboardPointerEvent}
                      style={focusCommitmentButton()}
                    >
                      Savings idea
                    </button>
                    <button
                      type="button"
                      onClick={(event) =>
                        runDashboardUiMutation(event, () =>
                          prefillFocusDraft("business")
                        )
                      }
                      onPointerDown={consumeDashboardPointerEvent}
                      style={focusCommitmentButton()}
                    >
                      Business idea
                    </button>
                    <button
                      type="button"
                      onClick={(event) =>
                        runDashboardUiMutation(event, () =>
                          prefillFocusDraft("repayment")
                        )
                      }
                      onPointerDown={consumeDashboardPointerEvent}
                      style={focusCommitmentButton()}
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
                      onClick={(event) =>
                        runDashboardUiMutation(event, () => {
                          resetFocusDraft();
                          setFocusComposerOpen(false);
                        })
                      }
                      onPointerDown={consumeDashboardPointerEvent}
                      style={focusCommitmentButton()}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={(event) =>
                        runDashboardUiMutation(event, saveFocusCommitment)
                      }
                      onPointerDown={consumeDashboardPointerEvent}
                      style={focusCommitmentButton(
                        !safeStr(focusDraft.title) || activeFocusCount >= 2
                          ? {
                              opacity: 0.7,
                              cursor: "not-allowed",
                              background:
                                "linear-gradient(180deg, #F8FAFC 0%, #E2E8F0 100%)",
                            }
                          : {
                              background:
                                "linear-gradient(180deg, #FFFFFF 0%, #F3F7FC 100%)",
                            }
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
                          onClick={(event) =>
                            runDashboardUiMutation(event, () =>
                              submitFocusCheckIn(item.id)
                            )
                          }
                          onPointerDown={consumeDashboardPointerEvent}
                          style={focusCommitmentButton()}
                        >
                          Check in
                        </button>

                        <button
                          type="button"
                          onClick={(event) =>
                            runDashboardUiMutation(event, () =>
                              replanFocusCommitment(item.id)
                            )
                          }
                          onPointerDown={consumeDashboardPointerEvent}
                          style={focusCommitmentButton()}
                        >
                          Replan
                        </button>

                        <button
                          type="button"
                          onClick={(event) =>
                            runDashboardUiMutation(event, () =>
                              completeFocusCommitment(item.id)
                            )
                          }
                          onPointerDown={consumeDashboardPointerEvent}
                          style={focusCommitmentButton()}
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
                      ...innerCard(
                        "radial-gradient(circle at top right, rgba(96,165,250,0.16) 0%, rgba(96,165,250,0) 34%), linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"
                      ),
                      padding: isPhone ? 14 : 16,
                      border: "1px solid rgba(96,165,250,0.18)",
                      boxShadow:
                        "0 16px 34px rgba(10,24,49,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      style={{
                        color: "#F8FBFF",
                        fontWeight: 900,
                        fontSize: isPhone ? 17 : 18,
                        lineHeight: 1.22,
                    }}
                  >
                    No active commitment yet.
                  </div>

                  <div
                    style={{
                      marginTop: isPhone ? 6 : 8,
                      ...helperText(),
                      color: "#F8FBFF",
                      fontSize: isPhone ? 13 : 14,
                      lineHeight: isPhone ? 1.45 : 1.75,
                      maxWidth: 640,
                    }}
                  >
                    Start one or two real targets and keep them visible.
                  </div>

                  <div
                    style={{
                      marginTop: isPhone ? 12 : 14,
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: isPhone ? 7 : 8,
                    }}
                  >
                    <button
                      type="button"
                      onClick={(event) =>
                        runDashboardUiMutation(event, () =>
                          prefillFocusDraft("savings")
                        )
                      }
                      onPointerDown={consumeDashboardPointerEvent}
                      style={focusCommitmentButton({
                        minHeight: isPhone ? 42 : 40,
                        padding: isPhone ? "8px 7px" : "8px 12px",
                        fontSize: isPhone ? 12 : 13,
                      })}
                    >
                      Savings
                    </button>

                    <button
                      type="button"
                      onClick={(event) =>
                        runDashboardUiMutation(event, () =>
                          prefillFocusDraft("business")
                        )
                      }
                      onPointerDown={consumeDashboardPointerEvent}
                      style={focusCommitmentButton({
                        minHeight: isPhone ? 42 : 40,
                        padding: isPhone ? "8px 7px" : "8px 12px",
                        fontSize: isPhone ? 12 : 13,
                      })}
                    >
                      Business
                    </button>

                    <button
                      type="button"
                      onClick={(event) =>
                        runDashboardUiMutation(event, () =>
                          prefillFocusDraft("repayment")
                        )
                      }
                      onPointerDown={consumeDashboardPointerEvent}
                      style={focusCommitmentButton({
                        minHeight: isPhone ? 42 : 40,
                        padding: isPhone ? "8px 7px" : "8px 12px",
                        fontSize: isPhone ? 12 : 13,
                      })}
                    >
                      Repayment
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
      </section>

      </div>
    </div>
  );
} 


























