import React, { useEffect, useMemo, useRef, useState } from "react";
import GSNBrandMark from "../components/GSNBrandMark";
import PictureFrameToolsControl from "../components/PictureFrameToolsControl";
import SpotlightMediaFrame from "../components/SpotlightMediaFrame";
import { StableButton, StableDisclosureSummary } from "../components/StableButton";
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
  getMyRoscaObligations,
  getMyTrustSlip,
  getPublicMarketplaceShopByGmfnId,
  getSelectedClanId,
  getStoredGmfnId,
  listMarketplaceRequests,
  removeMyProfileImage,
  recordFocusCommitmentTrustEvent,
  uploadMyProfileImageFile,
} from "../lib/api";
import {
  buildGuidanceSnapshot,
  type GuidanceSnapshot,
} from "../lib/guidance";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
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
import { publicShopPath, publicShopSharePath } from "../lib/publicLinks";
import { buildWhatsAppChatUrl } from "../lib/whatsappLinks";
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
  source_shop_whatsapp_number?: string | null;
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
  source_product_id?: number | string | null;
  source_product_block?: number | string | null;
  source_product_slot_number?: number | string | null;
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

type RoscaFocusObligation = {
  id: number;
  kind?: string;
  source?: string;
  clan_id?: number;
  cycle_id?: string;
  cycle_title?: string;
  round_number?: number;
  total_rounds?: number;
  amount?: string;
  currency?: string;
  remaining_amount?: string;
  due_at?: string | null;
  reference_display?: string;
  status?: string;
  status_group?: "on_track" | "watch" | "behind" | "partial" | string;
  action_url?: string;
  action_label?: string;
  plain_language?: string;
  writes_commitment_trust_event?: boolean;
};

const DASHBOARD_UI_STORAGE_KEY = "gmfn.dashboard.ui.v8";
const DASHBOARD_AVATAR_STORAGE_KEY = "gmfn.member.avatar";
const DASHBOARD_ATTENTION_STORAGE_KEY = "gmfn.dashboard.attention.v2";
const DASHBOARD_FOCUS_COMMITMENTS_STORAGE_KEY =
  "gmfn.dashboard.focus-commitments.v1";
const DASHBOARD_FOCUS_EVENTS_STORAGE_KEY =
  "gmfn.dashboard.focus-events.v1";
const DASHBOARD_AVATAR_MAX_BYTES = 360 * 1024;
const DASHBOARD_AVATAR_MAX_DIMENSION = 1280;
const MARKET_WISDOM_ROTATION_MS = 45000;

const PUBLIC_ROUTE_PREFIXES = [
  "guide",
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

const PRE_AUTH_ROUTE_PREFIXES = ["cover", "welcome", "login"];

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
  SHOP_ME: "/app/shop-control",
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
  "app/trust-slip": DASHBOARD_TARGETS.TRUST_SLIP,
  trustslip: DASHBOARD_TARGETS.TRUST_SLIP,
  "app/trustslip": DASHBOARD_TARGETS.TRUST_SLIP,
  "open-trust-slip": DASHBOARD_TARGETS.TRUST_SLIP,
  "app/open-trust-slip": DASHBOARD_TARGETS.TRUST_SLIP,
  "merchant-verify": DASHBOARD_TARGETS.TRUST_SLIP,
  "verify-merchant": DASHBOARD_TARGETS.TRUST_SLIP,
  "trust-slip/verify": DASHBOARD_TARGETS.TRUST_SLIP_VERIFY,
  "app/trust-slip/verify": DASHBOARD_TARGETS.TRUST_SLIP_VERIFY,

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
    minHeight: 44,
    padding: "10px 14px",
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
    boxSizing: "border-box",
    overflow: "hidden",
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
    flexShrink: 0,
    overflowAnchor: "none",
    touchAction: "manipulation",
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTapHighlightColor: "transparent",
    transform: "none",
    transition: "none",
    appearance: "none",
    WebkitAppearance: "none",
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
    minHeight: 44,
    padding: "10px 14px",
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
    boxSizing: "border-box",
    overflow: "hidden",
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
    flexShrink: 0,
    overflowAnchor: "none",
    touchAction: "manipulation",
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTapHighlightColor: "transparent",
    transform: "none",
    transition: "none",
    appearance: "none",
    WebkitAppearance: "none",
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
    minHeight: 40,
    padding: "8px 12px",
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
    boxSizing: "border-box",
    overflow: "hidden",
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
    flexShrink: 0,
    overflowAnchor: "none",
    touchAction: "manipulation",
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTapHighlightColor: "transparent",
    transform: "none",
    transition: "none",
    appearance: "none",
    WebkitAppearance: "none",
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

type DashboardSignalName =
  | "marketplace"
  | "demand"
  | "spotlight"
  | "trust"
  | "community"
  | "shop"
  | "alerts"
  | "identity"
  | "compass"
  | "package"
  | "target"
  | "calendar"
  | "user"
  | "check"
  | "add"
  | "time"
  | "dot";

function dashboardActionSignal(label: string): DashboardSignalName {
  switch (label) {
    case "Your Marketplace":
    case "Marketplace":
      return "marketplace";
    case "Create Demand":
    case "Create Your Demand":
      return "demand";
    case "Your Spotlight":
    case "Spotlight":
      return "spotlight";
    case "Your Trust Events":
    case "Trust Events":
      return "trust";
    case "Your Community":
    case "Community":
      return "community";
    case "Your Shop":
    case "Shop":
      return "shop";
    case "Your Alerts":
    case "What Matters Now":
      return "alerts";
    case "Your Identity":
    case "My Identity":
      return "identity";
    case "Trust":
      return "trust";
    case "CCI":
    case "Wider":
    case "Wider consistency":
      return "community";
    case "TrustSlip":
      return "identity";
    default:
      return "dot";
  }
}

function dashboardSectionSignal(label: string): DashboardSignalName {
  switch (label) {
    case "What do you want to do next?":
      return "compass";
    case "Your Identity Passport":
      return "trust";
    case "Your Spotlight":
      return "spotlight";
    case "Your Demand Box":
      return "package";
    case "What needs your attention":
    case "What Matters Now":
      return "alerts";
    case "Your Market Wisdom":
      return "compass";
    case "Your Focus Commitments":
      return "target";
    case "Your community":
      return "community";
    case "Posted":
      return "calendar";
    case "Seller GSN ID":
      return "user";
    case "Actions":
      return "check";
    case "Your new commitment":
      return "add";
    case "Your next review":
      return "calendar";
    case "Days left":
      return "time";
    case "Your execution signal":
      return "check";
    case "Your Commitment Builder":
      return "target";
    default:
      return "dot";
  }
}

function DashboardSignalIcon({
  name,
  size = 22,
  strokeWidth: _strokeWidth = 2.1,
}: {
  name: DashboardSignalName;
  size?: number;
  strokeWidth?: number;
}) {
  void _strokeWidth;

  let glyph = "\u25CF";
  switch (name) {
    case "marketplace":
      glyph = "\uD83D\uDED2";
      break;
    case "demand":
      glyph = "\u2795";
      break;
    case "spotlight":
      glyph = "\u2B50";
      break;
    case "trust":
      glyph = "\uD83D\uDEE1\uFE0F";
      break;
    case "community":
      glyph = "\uD83D\uDC65";
      break;
    case "shop":
      glyph = "\uD83C\uDFEA";
      break;
    case "alerts":
      glyph = "\uD83D\uDD14";
      break;
    case "identity":
      glyph = "\uD83E\uDEAA";
      break;
    case "compass":
      glyph = "\uD83E\uDDED";
      break;
    case "package":
      glyph = "\uD83D\uDCE6";
      break;
    case "target":
      glyph = "\uD83C\uDFAF";
      break;
    case "calendar":
      glyph = "\uD83D\uDCC5";
      break;
    case "user":
      glyph = "\uD83D\uDC64";
      break;
    case "check":
      glyph = "\u2705";
      break;
    case "add":
      glyph = "\u2795";
      break;
    case "time":
      glyph = "\u23F3";
      break;
    default:
      glyph = "\u2022";
  }

  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flexShrink: 0,
        fontSize: Math.round(size * 1.05),
        lineHeight: 1,
        fontFamily:
          '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
        letterSpacing: 0,
        textTransform: "none",
        filter: "saturate(0.96) contrast(1.02)",
      }}
    >
      {glyph}
    </span>
  );
}

function DashboardPassportFeatureIcon({
  name,
  size = 18,
}: {
  name: "eye" | "briefcase" | "check";
  size?: number;
}) {
  if (name === "eye") {
    return (
      <svg
        aria-hidden="true"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        style={{ display: "block", flexShrink: 0 }}
      >
        <path
          d="M2.8 12s3.4-6 9.2-6 9.2 6 9.2 6-3.4 6-9.2 6-9.2-6-9.2-6Z"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="2.3" />
      </svg>
    );
  }

  if (name === "briefcase") {
    return (
      <svg
        aria-hidden="true"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        style={{ display: "block", flexShrink: 0 }}
      >
        <path
          d="M8 7V5.8C8 4.8 8.8 4 9.8 4h4.4c1 0 1.8.8 1.8 1.8V7"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
        <path
          d="M4.5 7.5h15v10.8c0 1-.8 1.7-1.7 1.7H6.2c-.9 0-1.7-.8-1.7-1.7V7.5Z"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinejoin="round"
        />
        <path d="M9 12h6" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ display: "block", flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth="2.3" />
      <path
        d="m8.4 12.1 2.4 2.4 4.9-5.2"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DashboardChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      style={{
        display: "block",
        transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
        transition: "none",
      }}
    >
      <path
        d="m9 6 6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function DashboardSectionLabel({
  label,
  signal,
  style,
}: {
  label: string;
  signal?: DashboardSignalName;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        ...sectionLabel(),
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          borderRadius: 999,
          background:
            "linear-gradient(180deg, rgba(235,244,255,0.98) 0%, rgba(221,234,250,0.88) 100%)",
          border: "1px solid rgba(11,99,209,0.14)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.88)",
          fontSize: 13,
          lineHeight: 1,
          letterSpacing: 0,
          textTransform: "none",
          flexShrink: 0,
          color: DASHBOARD_BRAND.accentDeep,
        }}
      >
        <DashboardSignalIcon name={signal || dashboardSectionSignal(label)} size={15} />
      </span>
      <span>{label}</span>
    </div>
  );
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

function readableTrustStatus(classText: unknown): string {
  const classValue = safeStr(classText);
  if (!classValue || classValue.toLowerCase() === "pending") {
    return "Not enough info";
  }

  switch (classValue.toUpperCase()) {
    case "A+":
    case "A":
      return "Strong";
    case "B":
      return "Established";
    case "C":
      return "Growing";
    case "D":
      return "Building";
    case "E":
      return "Developing";
    default:
      return "Needs review";
  }
}

function dashboardPassportSignalStrength(classText: unknown): number {
  const classValue = safeStr(classText).toUpperCase();
  if (classValue === "A+" || classValue === "A") return 5;
  if (classValue === "B") return 4;
  if (classValue === "C") return 3;
  if (classValue === "D" || classValue === "E") return 1;
  return 0;
}

function routeTarget(
  intent: CtaIntent,
  communityId: number,
  debugId: string,
  extra: { hash?: string } = {}
): string {
  return resolveCtaTarget(intent, {
    communityId,
    debugId,
    ...extra,
  }).to as string;
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

function normalizeSpotlightItem(raw: any): SpotlightItem | null {
  const source = raw?.item || raw?.broadcast || raw;
  if (!source || typeof source !== "object") return null;

  const id = positiveNumber(source.id);
  const clanId = source.clan_id ?? source.clanId ?? source.source_clan_id;
  const sourceClanId =
    source.source_clan_id ?? source.sourceClanId ?? source.clan_id;

  return {
    id: id || undefined,
    title: safeStr(source.title) || null,
    message: safeStr(source.message || source.content || source.text) || null,
    body: safeStr(source.body || source.description) || null,
    image_url: safeStr(source.image_url || source.imageUrl) || null,
    image: safeStr(source.image || source.image_url || source.imageUrl) || null,
    video_url: safeStr(source.video_url || source.videoUrl) || null,
    source_shop_name:
      safeStr(source.source_shop_name || source.sourceShopName) || null,
    source_shop_whatsapp_number:
      safeStr(
        source.source_shop_whatsapp_number ||
          source.sourceShopWhatsAppNumber ||
          source.source_shop_whatsapp ||
          source.shop_whatsapp_number ||
          source.whatsapp_number
      ) || null,
    source_clan_name:
      safeStr(source.source_clan_name || source.sourceClanName) || null,
    source_clan_id: sourceClanId ?? null,
    source_marketplace_id:
      source.source_marketplace_id ?? source.sourceMarketplaceId ?? null,
    clan_id: clanId ?? null,
    marketplace_id: source.marketplace_id ?? source.marketplaceId ?? null,
    author_name: safeStr(source.author_name || source.authorName) || null,
    author_gmfn_id:
      safeStr(source.author_gmfn_id || source.authorGmfnId) || null,
    trust_band: safeStr(source.trust_band || source.trustBand) || null,
    trust_score: source.trust_score ?? source.trustScore ?? null,
    price: source.price ?? null,
    currency: safeStr(source.currency) || null,
    source_product_id:
      source.source_product_id ?? source.sourceProductId ?? null,
    source_product_block:
      source.source_product_block ?? source.sourceProductBlock ?? null,
    source_product_slot_number:
      source.source_product_slot_number ?? source.sourceProductSlotNumber ?? null,
    created_at: safeStr(source.created_at || source.createdAt) || null,
    expires_at: safeStr(source.expires_at || source.expiresAt) || null,
  };
}

function spotlightSortTime(item: SpotlightItem | null): number {
  return (
    toDateSafe(item?.created_at)?.getTime() ||
    positiveNumber(item?.id) ||
    0
  );
}

function spotlightIsActive(item: SpotlightItem | null): boolean {
  const expiresAt = toDateSafe(item?.expires_at);
  return !expiresAt || expiresAt.getTime() > Date.now();
}

function normalizePublicShopSpotlights(raw: any): SpotlightItem[] {
  const candidates = [
    raw?.primary_broadcast,
    raw?.primaryBroadcast,
    ...(Array.isArray(raw?.broadcasts) ? raw.broadcasts : []),
    ...(Array.isArray(raw?.items) ? raw.items : []),
  ];
  const seen = new Set<string>();
  const items: SpotlightItem[] = [];

  for (const candidate of candidates) {
    const item = normalizeSpotlightItem(candidate);
    if (!item || !spotlightIsActive(item)) continue;

    const key = safeStr(item.id) || [
      item.author_gmfn_id,
      item.created_at,
      item.message,
      item.image_url,
      item.video_url,
    ]
      .map(safeStr)
      .join("|");

    if (!key || seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }

  return items.sort((a, b) => spotlightSortTime(b) - spotlightSortTime(a));
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

  const candidates = [resolveSpotlightAssetUrl(raw), raw];

  if (
    raw.startsWith("/") &&
    !raw.startsWith("//") &&
    typeof window !== "undefined" &&
    window.location
  ) {
    candidates.push(`${window.location.origin}${raw}`);
    candidates.push(`${window.location.origin.replace(/:\d+$/, ":8012")}${raw}`);
  }

  return [...new Set(candidates.filter(Boolean))];
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

  if (matchesRoutePrefix(lowerPath, PRE_AUTH_ROUTE_PREFIXES)) {
    return DASHBOARD_TARGETS.WHAT_MATTERS_NOW;
  }

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
    statusText: "No cross-community consistency reading yet",
    whyText:
      "Complete identity and community activity first. The fuller consistency reading across communities will appear here when it is available.",
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
      statusText: "Select your community to view local trust",
      whyText:
        "Your local community trust belongs to the community you are using right now. It is separate from the wider cross-community consistency reading.",
    };
  }

  return {
    classText: "Pending",
    scoreText: "—",
    tone: "neutral",
    statusText: "No local community reading yet",
    whyText:
      "Your local community trust reflects your standing in the community you are using now. Select or use a community first, then this reading will appear here.",
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
    return "Your Trust Events";
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
    return "Your Demand Box";
  }

  if (
    textContainsAny(joined, [
      "spotlight",
      "broadcast",
      "shop spotlight",
      "market spotlight",
    ])
  ) {
    return "Your Spotlight";
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
    return "Your Finance";
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
    return "Your Support Path";
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
    return "Your Focus Commitments";
  }

  if (to.includes("/app/marketplace") || to.includes("/app/shop/")) {
    return "Your Marketplace";
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
    source === "Your Trust Events" ||
    source === "Community Voting"
      ? 20
      : source === "Demand Box" ||
        source === "Your Demand Box" ||
        source === "Open Finance" ||
        source === "Your Finance" ||
        source === "Support Path" ||
        source === "Your Support Path" ||
        source === "Focus Commitments" ||
        source === "Your Focus Commitments"
      ? 12
      : source === "Spotlight Demand" || source === "Your Spotlight"
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

function spotlightShopTo(item: SpotlightItem | null): string {
  const gmfnId = safeStr(item?.author_gmfn_id || "");
  if (!gmfnId) return "";

  const clanId = positiveNumber(item?.source_clan_id || item?.clan_id);
  const productId = positiveNumber(item?.source_product_id);
  const block =
    positiveNumber(item?.source_product_block) ||
    positiveNumber(item?.source_product_slot_number);

  return productId || block || clanId
    ? publicShopSharePath({
        gmfnId,
        clanId: clanId || undefined,
        productId: productId || undefined,
        block: block || undefined,
      })
    : publicShopPath(gmfnId);
}

function defaultDashboardUIState(): DashboardUIState {
  return {
    spotlightMinimized: false,
    routesExpanded: false,
    appsExpanded: false,
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
      label: "Your Marketplace",
      detail: "See goods, services, and trusted trade around you.",
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
      label: "Your Alerts",
      detail: "See what needs your attention now.",
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
      label: "Wider consistency",
      detail: "Cross-community consistency reading.",
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
      label: "Your Demand Box",
      detail: "Ask for goods, service, support, or follow-up.",
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
    ? routeTarget(
        "communityJoinRequests",
        params.selectedClanId,
        "dashboard.join-requests.target"
      )
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
            label: "Open your Trust",
            detail: "Review the trust pressure in your community.",
            to: DASHBOARD_TARGETS.TRUST,
            reason: "Trust pressure should be handled before new exposure.",
          }
        : {
            key: "cci",
            label: "Open wider consistency",
            detail: "Review the cross-community consistency pressure.",
            to: DASHBOARD_TARGETS.CCI,
            reason: "Integrity pressure should be handled before new exposure.",
          },
      supportingRoutes: [
        trustPrimary
          ? {
              key: "cci",
              label: "Open wider consistency",
              detail: "Review the cross-community consistency reading.",
              to: DASHBOARD_TARGETS.CCI,
            }
          : {
              key: "trust",
              label: "Open your Trust",
              detail: "Read what is weakening trust now.",
              to: DASHBOARD_TARGETS.TRUST,
            },
        {
          key: "trust-slip",
          label: "Open your TrustSlip",
          detail: "Check whether your verification record is ready.",
          to: DASHBOARD_TARGETS.TRUST_SLIP,
        },
        {
          key: "notifications",
          label: "Open your alerts",
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
          label: "Open your Community",
          detail: "Manage the wider operating room around membership.",
          to: DASHBOARD_TARGETS.COMMUNITY,
        },
        {
          key: "notifications",
          label: "Open your alerts",
          detail: "Keep your action queue clean.",
          to: DASHBOARD_TARGETS.WHAT_MATTERS_NOW,
        },
        {
          key: "trust",
          label: "Open your Trust",
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
        label: "Open your TrustSlip",
        detail: safeStr(params.trustSlipCode)
          ? "Review your verification record."
          : "Complete your verification record.",
        to: DASHBOARD_TARGETS.TRUST_SLIP,
        reason: "A weak setup creates friction everywhere else.",
      },
      supportingRoutes: [
        {
          key: "trust",
          label: "Open your Trust Passport",
          detail: "Understand the trust path clearly.",
          to: DASHBOARD_TARGETS.TRUST,
        },
        {
          key: "community",
          label: "Open your Community",
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
        label: "Open your Demand Box",
        detail: "Respond to visible need signals before they drift.",
        to: DASHBOARD_TARGETS.DEMAND_BOX,
        reason: "Opportunity and responsibility are both gathering here.",
      },
      supportingRoutes: [
        {
          key: "marketplace",
          label: "Open your Marketplace",
          detail: "Match supply and demand with context.",
          to: DASHBOARD_TARGETS.MARKETPLACE,
        },
        {
          key: "finance",
          label: "Open your Finance",
          detail: "Review money readiness and movement.",
          to: DASHBOARD_TARGETS.FINANCE,
        },
        {
          key: "notifications",
          label: "Open your alerts",
          detail: "Keep your action queue visible.",
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
        label: "Open your Shop",
        detail: "Start from the seller page first.",
        to: params.myShopLink,
        reason: "Your trade page is the clearest value signal right now.",
      },
      supportingRoutes: [
        {
          key: "marketplace",
          label: "Open your Marketplace",
          detail: "See wider movement around your goods and services.",
          to: DASHBOARD_TARGETS.MARKETPLACE,
        },
        {
          key: "trust-slip",
          label: "Open your TrustSlip",
          detail: "Keep merchant verification ready.",
          to: DASHBOARD_TARGETS.TRUST_SLIP,
        },
        {
          key: "finance",
          label: "Open your Finance",
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
      label: "Open your alerts",
      detail: "Review your organised queue first.",
      to: DASHBOARD_TARGETS.WHAT_MATTERS_NOW,
      reason: "The cleanest operating choice is to review the queue before branching.",
    },
    supportingRoutes: [
      {
        key: "community",
        label: "Open your Community",
        detail: "Keep the operating room in shape.",
        to: DASHBOARD_TARGETS.COMMUNITY,
      },
      {
        key: "marketplace",
        label: "Open your Marketplace",
        detail: "Watch visible opportunity.",
        to: DASHBOARD_TARGETS.MARKETPLACE,
      },
      {
        key: "finance",
        label: "Open your Finance",
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
  const dashboardGmfnId = useMemo(
    () => firstNonEmpty(me?.gmfn_id, me?.gmfnId, me?.gmfnID),
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
  const [passportPictureToolsOpen, setPassportPictureToolsOpen] =
    useState<boolean>(false);
  const [pictureToolsOpen, setPictureToolsOpen] = useState<boolean>(false);
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
  const [roscaObligations, setRoscaObligations] = useState<
    RoscaFocusObligation[]
  >([]);
  const [roscaObligationsLoading, setRoscaObligationsLoading] =
    useState<boolean>(false);
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
  const dashboardTapLockUntilRef = useRef<number>(0);
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

        if (dashboardGmfnId) {
          const publicShopRes = await getPublicMarketplaceShopByGmfnId(
            dashboardGmfnId,
            {
              product_limit: 1,
              broadcast_limit: 24,
            }
          ).catch(() => null);

          if (!alive) return;

          const publicShopSpotlights =
            normalizePublicShopSpotlights(publicShopRes);

          if (publicShopSpotlights.length > 0) {
            setSpotlights(publicShopSpotlights);
            setSpotlightQueueTotal(
              Math.max(
                publicShopSpotlights.length,
                Number((publicShopRes as any)?.broadcasts?.length || 0)
              )
            );
            setLatestSpotlightSnapshot(publicShopSpotlights[0] || null);
            return;
          }
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
  }, [dashboardGmfnId, selectedClanId]);

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

    async function refreshRoscaObligations() {
      if (!alive) return;
      setRoscaObligationsLoading(true);

      try {
        const res = await getMyRoscaObligations({
          clan_id: selectedClanId || undefined,
          limit: 12,
        }).catch(() => ({ obligations: [] }));

        if (!alive) return;

        const rows = Array.isArray((res as any)?.obligations)
          ? ((res as any).obligations as RoscaFocusObligation[])
          : [];
        setRoscaObligations(rows);
      } finally {
        if (alive) setRoscaObligationsLoading(false);
      }
    }

    refreshRoscaObligations();

    if (typeof window !== "undefined") {
      const handleVisibilityRefresh = () => {
        if (document.visibilityState === "visible") refreshRoscaObligations();
      };

      window.addEventListener("focus", refreshRoscaObligations);
      document.addEventListener("visibilitychange", handleVisibilityRefresh);
      refreshTimer = window.setInterval(refreshRoscaObligations, 60000);

      return () => {
        alive = false;
        window.removeEventListener("focus", refreshRoscaObligations);
        document.removeEventListener("visibilitychange", handleVisibilityRefresh);
        if (refreshTimer) window.clearInterval(refreshTimer);
      };
    }

    return () => {
      alive = false;
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

  const gmfnId = safeStr(me?.gmfn_id || getStoredGmfnId() || "Pending");
  const visibleGsnId =
    gmfnId === "Pending" ? gmfnId : gmfnId.replace(/^GMF[MN]/i, "GSN");
  const globalIdParts = /^([A-Za-z]+-[A-Za-z]+-)(.+)$/.exec(visibleGsnId);
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
      boxSizing: "border-box",
      overflow: "hidden",
      overflowAnchor: "none",
      touchAction: "manipulation",
      userSelect: "none",
      WebkitUserSelect: "none",
      WebkitTapHighlightColor: "transparent",
      transform: "none",
      transition: "none",
      flexShrink: 0,
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
    gap: isPhone ? 2 : 4,
    minHeight: isPhone ? 46 : 50,
    minWidth: 0,
    borderRadius: isPhone ? 12 : 14,
    padding: isPhone ? "6px 7px" : "8px 10px",
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
    letterSpacing: 0,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  });

  const trustMetricValue = (primary = false): React.CSSProperties => ({
    color: primary ? "#F6D77A" : "#FFFFFF",
    fontSize: isPhone ? 10.2 : 13.5,
    fontWeight: 950,
    lineHeight: 1.12,
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
  const roscaFocusSummary = useMemo(() => {
    const active = roscaObligations.filter((item) => {
      const status = safeStr(item.status).toLowerCase();
      return status !== "confirmed" && status !== "cancelled";
    });

    return {
      active,
      onTrackCount: active.filter((item) => item.status_group === "on_track")
        .length,
      watchCount: active.filter(
        (item) => item.status_group === "watch" || item.status_group === "partial"
      ).length,
      behindCount: active.filter((item) => item.status_group === "behind")
        .length,
    };
  }, [roscaObligations]);

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
            source === "Your Demand Box" ||
            source === "Open Finance" ||
            source === "Your Finance" ||
            source === "Support Path" ||
            source === "Your Support Path" ||
            source === "Trust Events" ||
            source === "Your Trust Events" ||
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
          ctaTo: routeTarget(
            "communityJoinRequests",
            selectedClanId,
            "dashboard.notice.join-requests"
          ),
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
              ? "Urgent requests are active in your Demand Box. Review the highest-pressure requests before they drift further."
              : "Open requests are active in your Demand Box. Review what is moving and decide whether you need to respond.",
          ctaLabel: "Open your Demand Box",
          ctaTo: DASHBOARD_TARGETS.DEMAND_BOX,
          source: "Your Demand Box",
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
              "Your Marketplace Spotlight is live"
          ),
          detail: safeStr(
              activeSpotlight.body ||
              activeSpotlight.message ||
              "Your Spotlight is live in the marketplace. Watch the visibility, demand, and trust signals around this seller."
          ),
          ctaLabel: "Open your Marketplace",
          ctaTo: spotlightMarketplaceTo(activeSpotlight),
          source: "Your Spotlight",
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
          source: "Your Trust Events",
          bucket: trustNotice.bucket,
          scoreBoost: trustNotice.bucket === "actNow" ? 16 : 10,
        })
      );
    }

    pushItem(
      makeItem({
        id: "synthetic-finance-review",
        title: "Your finance record is ready to review",
        detail:
          "Open your Finance to review pool position, money-in events, money-out movement, locks, and support needs.",
        ctaLabel: "Open your Finance",
        ctaTo: DASHBOARD_TARGETS.FINANCE,
        source: "Your Finance",
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
            "Your focus checkpoint or due date has slipped. Open your Focus Commitments to check in, replan honestly, or complete the target before execution discipline weakens further.",
          ctaLabel: "Open your Focus Commitments",
          ctaTo: `${DASHBOARD_TARGETS.DASHBOARD}#focus-commitments`,
          source: "Your Focus Commitments",
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
          source: "Your Focus Commitments",
          bucket: "dueSoon",
          scoreBoost: 10,
        })
      );
    } else if (focusSummary.active.length > 0) {
      pushItem(
        makeItem({
          id: "synthetic-focus-steady",
          title: "Your focus commitments are active",
          detail: focusSummary.nextReviewLabel
            ? `${focusSummary.nextReviewLabel}. ${focusSummary.disciplineLine}.`
            : focusSummary.disciplineLine,
          ctaLabel: "Open your commitments",
          ctaTo: `${DASHBOARD_TARGETS.DASHBOARD}#focus-commitments`,
          source: "Your Focus Commitments",
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
            `${sortedRows.length} alert${sortedRows.length === 1 ? "" : "s"} ready for you`
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
              ? safeStr(first?.ctaLabel || "Open your alert")
              : safeStr(first?.source || "General") === "General"
              ? "Open your alerts"
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
              `${sortedRows.length} alert${sortedRows.length === 1 ? "" : "s"} ready for you`
            : emptyDetail,
        count: sortedRows.length,
        unreadCount,
        actNowCount,
        dueSoonCount,
        watchCount,
        to: first?.ctaTo || DASHBOARD_TARGETS.WHAT_MATTERS_NOW,
        ctaLabel: first?.ctaLabel || "Open your alerts",
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
        "No unread alert is waiting for you right now."
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
      return "No new alert is waiting for you right now.";
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

    return `You have ${dashboardNoticeTotalCount} alert${
      dashboardNoticeTotalCount === 1 ? "" : "s"
    } from ${sourceLine}${
      moreSources > 0
        ? ` and ${moreSources} more place${moreSources === 1 ? "" : "s"}`
        : ""
    }.`;
  }, [dashboardNoticeSourceGroups, dashboardNoticeTotalCount]);
  const dashboardNoticePhoneSummaryLine = useMemo(() => {
    if (dashboardNoticeTotalCount === 0) {
      return "No new alert is waiting for you right now.";
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

    return `${dashboardNoticeTotalCount} alert${
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
    dashboardNoticeLeadItem?.ctaLabel || "Open your alerts";
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

    return "Choose the community or marketplace this demand should come from before you create it.";
  }, [currentClan, currentDemandItem, selectedClanId]);
  const currentDemandIsUrgent =
    safeStr(currentDemandItem?.urgency).toLowerCase() === "high";
  const demandPrimaryActionTo =
    demandItems.length === 0
      ? "/app/demand-box?mode=create"
      : DASHBOARD_TARGETS.DEMAND_BOX;
  const demandPrimaryActionLabel =
    demandItems.length === 0
      ? "Create your demand"
      : urgentDemandItems.length > 0
      ? "Open urgent demand"
      : "Open your Demand Box";
  const demandCommunityLabel = currentCommunityName(currentClan, selectedClanId);
  const demandRequesterId = safeStr(currentDemandItem?.requester_gmfn_id || "");
  const demandRequesterTrust = safeStr(
    currentDemandItem?.requester_trust_band || ""
  );
  const demandPaymentMode = safeStr(currentDemandItem?.payment_mode || "");
  const demandArea = safeStr(currentDemandItem?.area || "");
  const demandGuideTitle = demandItems.length
    ? "A person's request is live in your community."
    : "Create your demand when you need help.";
  const demandGuideBody =
    "Your Demand Box is personal: you say what you need, and your GSN trust signal shows who is asking. Your community name shows where you are sending it from. Payment terms and TrustSlip expectations help both sides agree before work starts.";

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
      return "Your Spotlight is live. Check seller trust before the next move.";
    }

    if (urgentDemandItems.length > 0) {
      return "Urgent demand is live. Check timing and response now.";
    }

    if (demandItems.length > 0) {
      return "Your Demand Box is active. Read the current need before you act.";
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
  const activeRoscaObligationCount = roscaFocusSummary.active.length;
  const combinedFocusOnTrackCount =
    focusSummary.onTrackCount + roscaFocusSummary.onTrackCount;
  const combinedFocusWatchCount =
    focusSummary.watchCount + roscaFocusSummary.watchCount;
  const combinedFocusBehindCount =
    focusSummary.behindCount + roscaFocusSummary.behindCount;

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
  const attentionAutoOpenAllowed = false;

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

  function toggleUiStateFlag(key: keyof DashboardUIState) {
    setUiState((prev) => ({
      ...prev,
      [key]: !prev[key],
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
    event?.preventDefault();
    event?.stopPropagation();
  }

  function openDashboardRoute(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    to: string
  ) {
    consumeDashboardButtonEvent(event);
    if (Date.now() < dashboardTapLockUntilRef.current) return;
    navigateWithOrigin(navigate, to, location);
  }

  function runDashboardUiMutation(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    action: () => void,
    durationMs = 520
  ) {
    consumeDashboardButtonEvent(event);
    action();
    dashboardTapLockUntilRef.current = Date.now() + durationMs;
  }

  function openAttentionTarget(
    event: React.SyntheticEvent<HTMLElement> | undefined,
    to: string
  ) {
    consumeDashboardButtonEvent(event);
    if (Date.now() < dashboardTapLockUntilRef.current) return;
    const nowIso = new Date().toISOString();
    setAttentionPopupVisible(false);
    setAttentionState(markDashboardAttentionActed(attentionSignal.state, nowIso));
    navigateWithOrigin(navigate, to, location);
  }

  function openTrustJourneyFromAttention(
    event?: React.SyntheticEvent<HTMLElement>
  ) {
    consumeDashboardButtonEvent(event);
    if (Date.now() < dashboardTapLockUntilRef.current) return;
    const nowIso = new Date().toISOString();
    setAttentionPopupVisible(false);
    setAttentionState(markDashboardAttentionActed(attentionSignal.state, nowIso));
    navigateWithOrigin(
      navigate,
      routeTarget("trust", selectedClanId, "dashboard.attention.trust-journey", {
        hash: "trust-journey",
      }),
      location
    );
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

  function restoreSpotlight(event?: React.SyntheticEvent<HTMLElement>) {
    runDashboardUiMutation(event, () =>
      updateUiState({ spotlightMinimized: false })
    );
  }

  function toggleSpotlightGuide(event?: React.SyntheticEvent<HTMLElement>) {
    runDashboardUiMutation(event, () => setSpotlightGuideOpen((open) => !open));
  }

  function toggleDemandGuide(event?: React.SyntheticEvent<HTMLElement>) {
    runDashboardUiMutation(event, () => setDemandGuideOpen((open) => !open));
  }

  function openSpotlightShop(event?: React.SyntheticEvent<HTMLElement>) {
    consumeDashboardButtonEvent(event);
    if (Date.now() < dashboardTapLockUntilRef.current) return;
    const spotlightGmfnId = safeStr(activeSpotlight?.author_gmfn_id || "");
    if (!spotlightGmfnId) return;

    navigateWithOrigin(navigate, spotlightShopTo(activeSpotlight), location);
  }

  function openSpotlightWhatsApp(event?: React.SyntheticEvent<HTMLElement>) {
    consumeDashboardButtonEvent(event);
    if (Date.now() < dashboardTapLockUntilRef.current) return;
    const spotlightTitle = safeStr(
      activeSpotlight?.title ||
        activeSpotlight?.message ||
        "this GSN Spotlight"
    );
    const spotlightShop = safeStr(
      activeSpotlight?.source_shop_name ||
        activeSpotlight?.author_name ||
        "this GSN shop"
    );
    const message = `Hello, I found ${spotlightShop} on GSN Spotlight. I am asking about: ${spotlightTitle}.`;
    const chatUrl = buildWhatsAppChatUrl(
      activeSpotlight?.source_shop_whatsapp_number,
      message
    );

    if (chatUrl && typeof window !== "undefined") {
      window.open(chatUrl, "_blank", "noopener,noreferrer");
      return;
    }

    openSpotlightShop(event);
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
    if (Date.now() < dashboardTapLockUntilRef.current) return;
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

  function explainMissingAvatarForRemoval(
    event?: React.SyntheticEvent<HTMLElement>
  ) {
    consumeDashboardButtonEvent(event);
    setAvatarStatus({
      tone: "error",
      text:
        "There is no saved profile picture to remove yet. Use Upload or Change first, then Remove will clear it from your GSN profile.",
    });
  }

  async function removeAvatar(event?: React.SyntheticEvent<HTMLElement>) {
    consumeDashboardButtonEvent(event);

    try {
      const updated = await removeMyProfileImage();
      for (const key of dashboardAvatarStorageKeys) {
        try {
          localStorage.removeItem(key);
        } catch {
          // Storage can be unavailable in private browsing; the backend clear still wins.
        }
      }

      setAvatarSrc("");
      setMe((previous: any) => ({
        ...(previous || {}),
        ...(updated || {}),
        profile_image_url: null,
      }));
      setAvatarStatus({
        tone: "success",
        text: "Picture removed from your GSN profile and dashboard.",
      });
    } catch (error) {
      setAvatarStatus({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Picture could not be removed right now.",
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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

  function syncFocusCommitmentTrustEvent(
    item: FocusCommitment,
    event: FocusCommitmentEvent
  ) {
    if (!dashboardIdentityReady) return;

    void recordFocusCommitmentTrustEvent({
      clan_id: selectedClanId || undefined,
      local_commitment_id: item.id,
      local_event_id: event.id,
      event_kind: event.kind,
      title: item.title,
      category: item.category,
      target_value: item.targetValue,
      current_value: item.currentValue,
      progress_value: event.progressValue,
      unit: item.unit,
      due_date: item.dueDate,
      cadence: item.cadence,
      note: event.note || item.note || null,
    }).catch(() => {
      // Keep local commitment usable; backend sync can be retried by a later check-in.
    });
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
    syncFocusCommitmentTrustEvent(item, createdEvent);

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
    const checkInEvent: FocusCommitmentEvent = {
      id: makeLocalId("focus-event"),
      commitmentId,
      kind: eventKind,
      createdAt: now,
      progressValue: nextValue,
      note: completed
        ? "Commitment completed"
        : `Progress updated to ${nextValue}`,
    };

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

    setFocusEvents((prev) => [checkInEvent, ...prev].slice(0, 120));
    syncFocusCommitmentTrustEvent(
      { ...item, currentValue: nextValue, completedAt: completed ? now : item.completedAt || null },
      checkInEvent
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
    const replanEvent: FocusCommitmentEvent = {
      id: makeLocalId("focus-event"),
      commitmentId,
      kind: eventKind,
      createdAt: now,
      progressValue: null,
      note:
        eventKind === "missed-reported"
          ? "Reported a missed checkpoint and moved the review"
          : "Replanned the next review date",
    };

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

    setFocusEvents((prev) => [replanEvent, ...prev].slice(0, 120));
    syncFocusCommitmentTrustEvent(
      { ...item, dueDate: nextDueDate, nextCheckInDate: minDateInputValue(nextDueDate, proposedNextCheckIn), updatedAt: now },
      replanEvent
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
    syncFocusCommitmentTrustEvent(
      {
        ...item,
        currentValue:
          item.targetValue !== null
            ? Number(item.targetValue)
            : Number(item.currentValue || 0),
        completedAt: now,
        updatedAt: now,
      },
      completedEvent
    );
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

  const showSpotlight = Boolean(activeSpotlight) || !uiState.spotlightMinimized;
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
        minHeight: 40,
        padding: "8px 12px",
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
    justifyContent: "stretch",
    overflowAnchor: "none",
    transition: "none",
  });
  const dashboardStableActionFrame = (
    style: React.CSSProperties
  ): React.CSSProperties => {
    const stableHeight = style.height ?? style.minHeight;

    return {
      ...style,
      ...(stableHeight
        ? {
            height: stableHeight,
            minHeight: stableHeight,
            maxHeight: style.maxHeight ?? stableHeight,
          }
        : {}),
      boxSizing: "border-box",
      overflow: "hidden",
      overflowAnchor: "none",
      transform: "none",
      flexShrink: 0,
      transition: "none",
      touchAction: "manipulation",
      userSelect: "none",
      WebkitUserSelect: "none",
      WebkitTapHighlightColor: "transparent",
      whiteSpace: style.whiteSpace ?? "normal",
      overflowWrap: "normal",
      wordBreak: "normal",
      hyphens: "none",
    };
  };
  const dashboardFillButton = (
    base: React.CSSProperties,
    overrides: React.CSSProperties = {}
  ): React.CSSProperties =>
    dashboardStableActionFrame({
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
  const dashboardAccordionButtonStyle = (
    border: string,
    background: string
  ): React.CSSProperties => {
    const height = isPhone ? 74 : 76;

    return dashboardStableActionFrame({
      width: "100%",
      height,
      minHeight: height,
      maxHeight: height,
      display: "grid",
      gridTemplateColumns: isPhone
        ? "auto minmax(0, 1fr) auto"
        : "auto minmax(0, 1fr) auto auto",
      gap: isPhone ? 10 : 13,
      alignItems: "center",
      padding: isPhone ? "0 12px" : "0 15px",
      borderRadius: isPhone ? 20 : 22,
      border,
      background,
      color: DASHBOARD_BRAND.ink,
      boxShadow:
        "0 14px 26px rgba(10,24,49,0.065), inset 0 1px 0 rgba(255,255,255,0.94)",
      cursor: "pointer",
      textAlign: "left",
      fontFamily: "inherit",
      overflow: "hidden",
      transition: "none",
    });
  };
  const dashboardAccordionIconStyle = (
    background = "linear-gradient(180deg, rgba(235,244,255,0.96) 0%, rgba(221,234,250,0.86) 100%)",
    border = "1px solid rgba(11,99,209,0.16)",
    color: string | undefined = undefined
  ): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: isPhone ? 42 : 44,
    height: isPhone ? 42 : 44,
    borderRadius: 999,
    background,
    border,
    color: color || DASHBOARD_BRAND.accentDeep,
    boxShadow:
      "0 10px 18px rgba(10,24,49,0.09), inset 0 1px 0 rgba(255,255,255,0.92)",
    lineHeight: 1,
    flexShrink: 0,
  });
  const dashboardAccordionTitleStyle: React.CSSProperties = {
    minWidth: 0,
    display: "-webkit-box",
    WebkitLineClamp: 1,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    color: DASHBOARD_BRAND.ink,
    fontSize: isPhone ? 16 : 21,
    fontWeight: 900,
    lineHeight: 1.12,
    letterSpacing: 0,
    textRendering: "geometricPrecision",
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
  };
  const dashboardAccordionSummaryStyle: React.CSSProperties = {
    minWidth: 0,
    display: "-webkit-box",
    WebkitLineClamp: 1,
    WebkitBoxOrient: "vertical",
    marginTop: 5,
    color: DASHBOARD_BRAND.helper,
    fontSize: isPhone ? 12.2 : 13.4,
    fontWeight: 700,
    lineHeight: 1.32,
    letterSpacing: 0,
    overflow: "hidden",
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
  };
  const dashboardAccordionChevronStyle = (
    expanded: boolean
  ): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: isPhone ? 32 : 34,
    height: isPhone ? 32 : 34,
    borderRadius: 999,
    border: "1px solid rgba(15,59,116,0.12)",
    color: expanded ? DASHBOARD_BRAND.goldText : DASHBOARD_BRAND.accentDeep,
    background: "rgba(255,255,255,0.72)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.86)",
    flexShrink: 0,
  });
  const dashboardAccordionStatusStyle = (
    background: string,
    color: string,
    border: string
  ): React.CSSProperties => ({
    ...badge(false),
    minHeight: isPhone ? 26 : 36,
    minWidth: isPhone ? 0 : 104,
    justifyContent: "center",
    padding: isPhone ? "4px 8px" : "8px 12px",
    background,
    color,
    border,
    fontSize: isPhone ? 10.5 : undefined,
    lineHeight: 1.05,
    whiteSpace: "nowrap",
  });
  const dashboardLauncherHeight = isPhone ? 76 : 74;
  const dashboardLauncherButtonStyle: React.CSSProperties = dashboardStableActionFrame({
    height: dashboardLauncherHeight,
    minHeight: dashboardLauncherHeight,
    maxHeight: dashboardLauncherHeight,
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    alignItems: "center",
    justifyContent: "stretch",
    gap: isPhone ? 9 : 11,
    padding: isPhone ? "10px 10px" : "12px 14px",
    borderRadius: isPhone ? 17 : 18,
    border: "1px solid rgba(15,59,116,0.16)",
    background:
      "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 48%, #EEF6FF 100%)",
    color: DASHBOARD_BRAND.ink,
    boxShadow:
      "0 12px 24px rgba(10,24,49,0.07), inset 0 1px 0 rgba(255,255,255,0.94)",
    fontSize: isPhone ? 12.6 : 14.2,
    fontWeight: 900,
    cursor: "pointer",
    textAlign: "left",
    overflow: "hidden",
    fontFamily: "inherit",
  });
  const attentionConnectionText = isPhone
    ? "Focus shows follow-through. Local trust is how your community reads it. Wider consistency is how outsiders may read it. TrustSlip keeps later proof."
    : trustAttentionCore.connectionText;
  const attentionConsequenceText = isPhone
    ? "Leaving it waiting weakens trust now. If it stays open, it can affect wider consistency and make your TrustSlip story look less steady."
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
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        textRendering: "geometricPrecision",
        letterSpacing: 0,
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

                    <StableButton
                      debugId="dashboard.attention-popup.dismiss"
                      type="button"
                      onClick={(event) =>
                        runDashboardUiMutation(event, dismissAttentionPopup, 260)
                      }
                      onPointerDown={consumeDashboardPointerEvent}
                      style={dashboardStableActionFrame({
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
                      })}
                    >
                      Hide for now
                    </StableButton>
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
                  <StableButton
                    debugId="dashboard.attention-popup.primary"
                    type="button"
                    onClick={(event) =>
                      openAttentionTarget(event, attentionDisplaySignal.ctaTo)
                    }
                    onPointerDown={consumeDashboardPointerEvent}
                    onMouseDown={consumeDashboardPointerEvent}
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
                  </StableButton>

                  {attentionDisplaySignal.secondaryCtaLabel &&
                  attentionDisplaySignal.secondaryCtaTo ? (
                    <StableButton
                      debugId="dashboard.attention-popup.secondary"
                      type="button"
                      onClick={(event) =>
                        openAttentionTarget(
                          event,
                          attentionDisplaySignal.secondaryCtaTo || ""
                        )
                      }
                      onPointerDown={consumeDashboardPointerEvent}
                      onMouseDown={consumeDashboardPointerEvent}
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
                    </StableButton>
                  ) : null}

                  <StableButton
                    debugId="dashboard.attention-popup.trust-journey"
                    type="button"
                    onClick={openTrustJourneyFromAttention}
                    onPointerDown={consumeDashboardPointerEvent}
                    onMouseDown={consumeDashboardPointerEvent}
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
                  </StableButton>
                </div>
              </div>
            </div>
          ) : (
            <StableButton
              debugId="dashboard.attention-reminder.open"
              type="button"
              onClick={(event) =>
                runDashboardUiMutation(event, () => setAttentionPopupVisible(true), 260)
              }
              onPointerDown={consumeDashboardPointerEvent}
              onMouseDown={consumeDashboardPointerEvent}
              style={dashboardStableActionFrame({
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
                display: "none",
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
              })}
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
            </StableButton>
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
        <section
          style={{
            ...pageCard(
              "radial-gradient(circle at 12% 0%, rgba(11,99,209,0.10) 0%, rgba(11,99,209,0) 36%), linear-gradient(180deg, #F8FBFF 0%, #EEF5FF 100%)"
            ),
            order: 10,
            padding: isPhone ? 14 : 20,
            borderRadius: isPhone ? 22 : 28,
            border: "1px solid rgba(15,59,116,0.14)",
            boxShadow:
              "0 18px 36px rgba(10,24,49,0.08), inset 0 1px 0 rgba(255,255,255,0.88)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isPhone
                ? "minmax(0, 1fr) minmax(104px, 118px)"
                : "minmax(0, 1fr) 180px",
              gap: isPhone ? 10 : 18,
              alignItems: "center",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  color: DASHBOARD_BRAND.label,
                  fontSize: isPhone ? 11 : 13,
                  fontWeight: 1000,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                }}
              >
                <GSNBrandMark width={isPhone ? 22 : 28} height={isPhone ? 28 : 36} />
                <span>Identity Passport</span>
              </div>
              <div
                style={{
                  marginTop: isPhone ? 8 : 10,
                  color: DASHBOARD_BRAND.ink,
                  fontSize: isPhone ? 24 : 38,
                  fontWeight: 1000,
                  lineHeight: 1.05,
                  textWrap: "balance",
                }}
              >
                Your trust is{" "}
                <span style={{ color: DASHBOARD_BRAND.goldText }}>
                  the first currency
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(38px, 1fr) auto minmax(38px, 1fr)",
                  gap: isPhone ? 10 : 14,
                  marginTop: isPhone ? 12 : 16,
                  alignItems: "center",
                  maxWidth: isPhone ? 240 : 310,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    height: 1,
                    background: "rgba(201,154,39,0.34)",
                  }}
                />
                <span
                  style={{
                    display: "inline-flex",
                    minHeight: isPhone ? 30 : 34,
                    alignItems: "center",
                    justifyContent: "center",
                    padding: isPhone ? "4px 15px" : "5px 18px",
                    borderRadius: 999,
                    background:
                      "linear-gradient(180deg, rgba(255,249,225,0.98) 0%, rgba(239,207,113,0.94) 100%)",
                    border: "1px solid rgba(145,103,19,0.22)",
                    color: "#6B4300",
                    fontSize: isPhone ? 12 : 13,
                    fontWeight: 1000,
                    letterSpacing: 0.9,
                    boxShadow:
                      "0 10px 18px rgba(145,103,19,0.12), inset 0 1px 0 rgba(255,255,255,0.86)",
                  }}
                >
                  GSN
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    height: 1,
                    background: "rgba(201,154,39,0.34)",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                alignSelf: "center",
                display: "grid",
                gap: isPhone ? 6 : 8,
                position: "relative",
                width: "100%",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                  borderRadius: isPhone ? 18 : 24,
                  border: "5px solid rgba(255,255,255,0.82)",
                  background:
                    "linear-gradient(180deg, rgba(235,244,255,0.96) 0%, rgba(218,232,248,0.96) 100%)",
                  boxShadow:
                    "0 18px 34px rgba(10,24,49,0.13), inset 0 1px 0 rgba(255,255,255,0.92)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  overflow: "visible",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: isPhone ? 13 : 19,
                    overflow: "hidden",
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
                        objectPosition: "center 18%",
                        display: "block",
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: DASHBOARD_BRAND.accentDeep,
                        fontSize: isPhone ? 24 : 42,
                        fontWeight: 1000,
                      }}
                    >
                      {profileInitials}
                    </span>
                  )}
                </div>

              </div>

              <PictureFrameToolsControl
                open={passportPictureToolsOpen}
                label="Frame tools"
                ariaLabel="Open passport picture frame tools"
                onToggle={(event) =>
                  runDashboardUiMutation(event, () => {
                    setPictureToolsOpen(false);
                    setPassportPictureToolsOpen((open) => !open);
                  })
                }
                slotStyle={{
                  marginTop: isPhone ? 7 : 8,
                  height: isPhone ? 40 : 42,
                  minHeight: isPhone ? 40 : 42,
                  maxHeight: isPhone ? 40 : 42,
                  width: "100%",
                  minWidth: 0,
                  maxWidth: "100%",
                  display: "block",
                  flex: "0 0 auto",
                  zIndex: 240,
                }}
                buttonStyle={{
                  ...dashboardFillButton(subtleBtn(false)),
                  height: isPhone ? 40 : 42,
                  minHeight: isPhone ? 40 : 42,
                  maxHeight: isPhone ? 40 : 42,
                  padding: isPhone ? "0 12px" : "0 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxSizing: "border-box",
                  borderRadius: 999,
                  fontSize: isPhone ? 11.5 : 12.5,
                  fontWeight: 1000,
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  transition: "none",
                  boxShadow:
                    "0 12px 22px rgba(10,24,49,0.12), inset 0 1px 0 rgba(255,255,255,0.92)",
                }}
                railGap={8}
                railColumns="repeat(3, minmax(0, 1fr))"
                railMinWidth={isPhone ? 286 : 300}
                triggerHeight={isPhone ? 40 : 42}
                zIndex={3200}
                railStyle={{
                  gap: 8,
                  alignItems: "stretch",
                  borderRadius: 18,
                  padding: 8,
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(239,246,255,0.96) 100%)",
                  border: "1px solid rgba(11,99,209,0.12)",
                  boxShadow: "0 18px 30px rgba(10,24,49,0.16)",
                  transition: "none",
                }}
                actions={[
                  {
                    label: "Upload",
                    inputId: avatarInputId,
                    style: {
                      ...dashboardFillButton(subtleBtn(false)),
                      minHeight: isPhone ? 44 : 42,
                      height: isPhone ? 44 : 42,
                      maxHeight: isPhone ? 44 : 42,
                      padding: isPhone ? "9px 8px" : "8px 12px",
                      fontSize: isPhone ? 11 : 12,
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                      transition: "none",
                    },
                  },
                  {
                    label: "Change",
                    inputId: avatarInputId,
                    style: {
                      ...dashboardFillButton(subtleBtn(false)),
                      minHeight: isPhone ? 44 : 42,
                      height: isPhone ? 44 : 42,
                      maxHeight: isPhone ? 44 : 42,
                      padding: isPhone ? "9px 8px" : "8px 12px",
                      fontSize: isPhone ? 11 : 12,
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                      transition: "none",
                    },
                  },
                  {
                    label: "Remove",
                    disabled: !avatarSrc,
                    onDisabledClick: explainMissingAvatarForRemoval,
                    onClick: removeAvatar,
                    style: {
                      ...dashboardFillButton(subtleBtn(!avatarSrc)),
                      minHeight: isPhone ? 44 : 42,
                      height: isPhone ? 44 : 42,
                      maxHeight: isPhone ? 44 : 42,
                      padding: isPhone ? "9px 8px" : "8px 12px",
                      fontSize: isPhone ? 11 : 12,
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                      transition: "none",
                    },
                  },
                ]}
              />

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
            </div>
          </div>

          <div
            style={{
              marginTop: isPhone ? 18 : 22,
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              minHeight: isPhone ? 44 : 50,
              alignItems: "center",
              borderRadius: isPhone ? 14 : 18,
              border: "1px solid rgba(15,59,116,0.10)",
              background: "rgba(255,255,255,0.76)",
              boxShadow:
                "0 10px 20px rgba(10,24,49,0.05), inset 0 1px 0 rgba(255,255,255,0.88)",
              overflow: "hidden",
            }}
          >
            {[
              ["eye", "Visible"],
              ["briefcase", "Portable"],
              ["check", "Usable"],
            ].map(([icon, label], index) => (
              <div
                key={label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: isPhone ? 5 : 8,
                  minWidth: 0,
                  padding: isPhone ? "8px 4px" : "10px 8px",
                  borderLeft:
                    index === 0 ? "0" : "1px solid rgba(15,59,116,0.10)",
                  color: "#173654",
                  fontSize: isPhone ? 10.8 : 13,
                  fontWeight: 900,
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    color: "#0D3A63",
                    lineHeight: 1,
                  }}
                >
                  <DashboardPassportFeatureIcon
                    name={icon as "eye" | "briefcase" | "check"}
                    size={isPhone ? 18 : 21}
                  />
                </span>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: isPhone ? 10 : 18,
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              background:
                "radial-gradient(circle at 12% 0%, rgba(11,99,209,0.28) 0%, rgba(11,99,209,0) 38%), repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 10px), linear-gradient(180deg, #113A62 0%, #071E33 100%)",
              borderRadius: isPhone ? 14 : 18,
              overflow: "hidden",
              boxShadow: "0 16px 28px rgba(10,24,49,0.16)",
            }}
          >
            {[
              {
                label: "Trust",
                value: readableTrustStatus(openTrust.classText),
                detail: "",
                strength: dashboardPassportSignalStrength(openTrust.classText),
                to: DASHBOARD_TARGETS.TRUST,
              },
              {
                label: "CCI",
                value: readableTrustStatus(cci.classText),
                detail: "Cross-Community Integrity",
                strength: dashboardPassportSignalStrength(cci.classText),
                to: DASHBOARD_TARGETS.CCI,
              },
              {
                label: "TrustSlip",
                value: trustSlipCode || "Pending",
                detail: "",
                strength: 0,
                to: trustSlipCode ? `/app/trust-slip?code=${encodeURIComponent(trustSlipCode)}` : DASHBOARD_TARGETS.TRUST_SLIP,
              },
            ].map((item, index) => (
              <StableButton
                debugId={`dashboard.passport-signal.${item.label.toLowerCase()}`}
                key={item.label}
                type="button"
                onClick={(event) => openDashboardRoute(event, item.to)}
                onPointerDown={consumeDashboardPointerEvent}
                style={dashboardStableActionFrame({
                  minWidth: 0,
                  minHeight: isPhone ? 102 : 122,
                  display: "grid",
                  gridTemplateRows: "auto auto auto 1fr",
                  gap: isPhone ? 4 : 6,
                  alignItems: "start",
                  justifyItems: "center",
                  padding: isPhone ? "13px 4px 10px" : "16px 12px 13px",
                  border: 0,
                  borderLeft:
                    index === 0 ? "0" : "1px solid rgba(255,255,255,0.22)",
                  background: "transparent",
                  color: "#F8FBFF",
                  cursor: "pointer",
                  textAlign: "center",
                })}
              >
                <DashboardSignalIcon
                  name={dashboardActionSignal(item.label)}
                  size={isPhone ? 25 : 30}
                  strokeWidth={2.4}
                />
                <span
                  style={{
                    color: "#F8FBFF",
                    fontSize: isPhone ? 13.8 : 17,
                    fontWeight: 1000,
                    lineHeight: 1.05,
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    color: "#F3D06A",
                    fontSize:
                      item.label === "TrustSlip"
                        ? isPhone
                          ? 11.6
                          : 15
                        : isPhone
                        ? 11.8
                        : 14,
                    fontWeight: 1000,
                    lineHeight: 1.08,
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                    maxWidth: "100%",
                  }}
                >
                  {item.value}
                </span>
                {item.detail ? (
                  <span
                    style={{
                      color: "rgba(248,251,255,0.72)",
                      fontSize: isPhone ? 8.8 : 11,
                      fontWeight: 800,
                      lineHeight: 1.12,
                      maxWidth: "100%",
                      overflowWrap: "break-word",
                    }}
                  >
                    {item.detail}
                  </span>
                ) : (
                  <span
                    aria-hidden="true"
                    style={{
                      minHeight: isPhone ? 11 : 13,
                      display: "block",
                    }}
                  />
                )}
                {item.strength > 0 ? (
                  <span
                    aria-hidden="true"
                    style={{
                      alignSelf: "end",
                      display: "grid",
                      gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                      gap: isPhone ? 3 : 4,
                      width: "72%",
                      minHeight: 5,
                    }}
                  >
                    {Array.from({ length: 5 }).map((_, barIndex) => (
                      <span
                        key={barIndex}
                        style={{
                          height: isPhone ? 4 : 5,
                          borderRadius: 999,
                          background:
                            barIndex < item.strength
                              ? "#F3D06A"
                              : "rgba(226,232,240,0.25)",
                        }}
                      />
                    ))}
                  </span>
                ) : (
                  <span aria-hidden="true" />
                )}
              </StableButton>
            ))}
          </div>

          <div
            style={{
              marginTop: 12,
              width: "100%",
              minHeight: isPhone ? 96 : 112,
              display: "grid",
              gridTemplateColumns: isPhone
                ? "48px minmax(0, 1fr) minmax(94px, 0.72fr)"
                : "66px minmax(0, 1fr) minmax(148px, 0.76fr)",
              gap: 0,
              alignItems: "center",
              padding: isPhone ? "10px 8px" : "14px 16px",
              borderRadius: isPhone ? 16 : 20,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,250,255,0.96) 100%)",
              border: "1px solid rgba(16,37,59,0.08)",
              boxShadow:
                "0 18px 26px rgba(10,24,49,0.12), inset 0 1px 0 rgba(255,255,255,0.94)",
              color: DASHBOARD_BRAND.ink,
              textAlign: "left",
              overflow: "hidden",
              boxSizing: "border-box",
              overflowAnchor: "none",
              transition: "none",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: isPhone ? 44 : 54,
                height: isPhone ? 44 : 54,
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                justifySelf: "center",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(234,243,255,0.94) 100%)",
                border: "1px solid rgba(16,37,59,0.08)",
                boxShadow:
                  "0 10px 18px rgba(10,24,49,0.10), inset 0 1px 0 rgba(255,255,255,0.92)",
                color: "#0D3A63",
              }}
            >
              <DashboardSignalIcon name="trust" size={isPhone ? 25 : 30} />
            </span>

            <span
              style={{
                display: "grid",
                gap: isPhone ? 5 : 7,
                alignContent: "center",
                minWidth: 0,
                height: "100%",
                justifyItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: isPhone ? "0 10px" : "0 18px",
                borderLeft: "1px solid rgba(16,37,59,0.10)",
                borderRight: "1px solid rgba(16,37,59,0.10)",
              }}
            >
              <span
                style={{
                  color: DASHBOARD_BRAND.ink,
                  fontSize: isPhone ? 17 : 23,
                  fontWeight: 1000,
                  lineHeight: 1.05,
                  overflowWrap: "break-word",
                }}
              >
                GSN Global ID
              </span>
              <span
                style={{
                  color: DASHBOARD_BRAND.label,
                  fontSize: isPhone ? 11.5 : 14,
                  fontWeight: 800,
                  lineHeight: 1.24,
                  maxWidth: isPhone ? 120 : 180,
                }}
              >
                Your permanent network identity
              </span>
            </span>

            <span
              style={{
                display: "grid",
                gap: isPhone ? 5 : 7,
                alignContent: "center",
                justifyItems: "center",
                minWidth: 0,
                textAlign: "center",
                paddingLeft: isPhone ? 10 : 18,
              }}
            >
              <span
                style={{
                  color: DASHBOARD_BRAND.ink,
                  display: "grid",
                  gap: 0,
                  fontSize: isPhone ? 21 : 27,
                  fontWeight: 1000,
                  lineHeight: 1.08,
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                }}
              >
                {globalIdParts ? (
                  <>
                    <span>{globalIdParts[1]}</span>
                    <span>{globalIdParts[2]}</span>
                  </>
                ) : (
                  <span>{visibleGsnId}</span>
                )}
              </span>
            </span>
          </div>
        </section>

      <section
        style={{
          ...pageCard(DASHBOARD_BRAND.heroField),
          display: "none",
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
                position: "relative",
                zIndex: 5,
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
                  position: "relative",
                  overflow: "visible",
                  zIndex: 6,
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
                </div>

                <PictureFrameToolsControl
                  open={pictureToolsOpen}
                  label="Picture frame"
                  ariaLabel="Dashboard picture frame tools"
                  onToggle={(event) =>
                    runDashboardUiMutation(event, () => {
                      setPassportPictureToolsOpen(false);
                      setPictureToolsOpen((open) => !open);
                    })
                  }
                  slotStyle={{
                    marginTop: isPhone ? 7 : 9,
                    height: isPhone ? 44 : 42,
                    minHeight: isPhone ? 44 : 42,
                    maxHeight: isPhone ? 44 : 42,
                    width: "100%",
                    minWidth: 0,
                    maxWidth: "100%",
                    display: "block",
                    flex: "0 0 auto",
                    zIndex: 240,
                  }}
                  buttonStyle={{
                      ...dashboardFillButton(subtleBtn(false)),
                      height: isPhone ? 44 : 42,
                      minHeight: isPhone ? 44 : 42,
                      maxHeight: isPhone ? 44 : 42,
                      padding: isPhone ? "0 12px" : "0 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxSizing: "border-box",
                      flex: "0 0 auto",
                      verticalAlign: "top",
                      borderRadius: 999,
                      fontSize: isPhone ? 12 : 12.5,
                      fontWeight: 900,
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      transition: "none",
                      boxShadow:
                        "0 12px 22px rgba(2,12,27,0.16), inset 0 1px 0 rgba(255,255,255,0.92)",
                  }}
                  railGap={8}
                  railColumns="repeat(3, minmax(0, 1fr))"
                  railMinWidth={isPhone ? 210 : 280}
                  triggerHeight={isPhone ? 44 : 42}
                  railStyle={{
                      gap: 8,
                      alignItems: "stretch",
                      borderRadius: 16,
                      padding: 8,
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(239,246,255,0.96) 100%)",
                      border: "1px solid rgba(11,99,209,0.12)",
                      boxShadow: "0 18px 30px rgba(2,12,27,0.18)",
                      transition: "none",
                  }}
                  actions={[
                    {
                      label: "Upload",
                      inputId: avatarInputId,
                      style: {
                        ...dashboardFillButton(subtleBtn(false)),
                        minHeight: isPhone ? 44 : 42,
                        height: isPhone ? 44 : 42,
                        maxHeight: isPhone ? 44 : 42,
                        lineHeight: 1,
                        whiteSpace: "nowrap",
                        transition: "none",
                      },
                    },
                    {
                      label: "Change",
                      inputId: avatarInputId,
                      style: {
                        ...dashboardFillButton(subtleBtn(false)),
                        minHeight: isPhone ? 44 : 42,
                        height: isPhone ? 44 : 42,
                        maxHeight: isPhone ? 44 : 42,
                        lineHeight: 1,
                        whiteSpace: "nowrap",
                        transition: "none",
                      },
                    },
                    {
                      label: "Remove",
                      disabled: !avatarSrc,
                      onDisabledClick: explainMissingAvatarForRemoval,
                      onClick: removeAvatar,
                      style: {
                        ...dashboardFillButton(subtleBtn(!avatarSrc)),
                        minHeight: isPhone ? 44 : 42,
                        height: isPhone ? 44 : 42,
                        maxHeight: isPhone ? 44 : 42,
                        lineHeight: 1,
                        whiteSpace: "nowrap",
                        transition: "none",
                      },
                    },
                  ]}
                />
              </div>

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
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: isPhone ? 6 : 8,
                        alignItems: "center",
                      }}
                    >
                      <span style={trustMetricTile(true, "gold")}>
                        <span style={trustMetricLabel()}>Trust</span>
                        <span style={trustMetricValue(true)}>
                          {readableTrustStatus(openTrust.classText)}
                        </span>
                      </span>
                      <span style={trustMetricTile(false, "blue")}>
                        <span style={trustMetricLabel()}>Wider</span>
                        <span style={trustMetricValue()}>
                          {readableTrustStatus(cci.classText)}
                        </span>
                      </span>
                      <span style={trustMetricTile(false, "steel")}>
                        <span style={trustMetricLabel()}>TrustSlip</span>
                        <span
                          style={{
                            ...trustMetricValue(),
                            fontSize: isPhone ? 9.8 : 12,
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
                      <StableDisclosureSummary
                        debugId="dashboard.trust-detail.toggle"
                        onPointerDown={stopDashboardPointerEvent}
                        onMouseDown={stopDashboardPointerEvent}
                        style={{
                          color: "#F6D77A",
                          fontWeight: 900,
                          fontSize: isPhone ? 11.5 : 12,
                          letterSpacing: 0.08,
                        }}
                      >
                        More trust detail
                      </StableDisclosureSummary>
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
                          ? "repeat(2, minmax(0, 1fr))"
                          : "repeat(4, minmax(116px, 1fr))",
                        gap: isPhone ? 6 : 8,
                        alignItems: "stretch",
                      }}
                    >
                      <StableButton
                        debugId="dashboard.trust-action.trust"
                        type="button"
                        onClick={(event) => openDashboardRoute(event, "/app/trust")}
                        onPointerDown={consumeDashboardPointerEvent}
                        style={trustActionButton()}
                      >
                        Trust
                      </StableButton>

                      <StableButton
                        debugId="dashboard.trust-action.identity"
                        type="button"
                        onClick={(event) => openDashboardRoute(event, "/app/identity")}
                        onPointerDown={consumeDashboardPointerEvent}
                        style={trustActionButton()}
                      >
                        Identity
                      </StableButton>

                      <StableButton
                        debugId="dashboard.trust-action.trust-slip"
                        type="button"
                        onClick={openTrustSlipPage}
                        onPointerDown={consumeDashboardPointerEvent}
                        style={trustActionButton()}
                      >
                        TrustSlip
                      </StableButton>

                      <StableButton
                        debugId="dashboard.trust-action.verify-code"
                        type="button"
                        onClick={(event) => openDashboardRoute(event, "/verify/trust-slip")}
                        onPointerDown={consumeDashboardPointerEvent}
                        style={trustActionButton()}
                      >
                        Verify code
                      </StableButton>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          ...pageCard(
            "linear-gradient(180deg, #FFFDF6 0%, #F8FBFF 48%, #EEF6FF 100%)"
          ),
          order: 20,
          border: "1px solid rgba(214,170,69,0.24)",
          borderRadius: isPhone ? 20 : 24,
          padding: isPhone ? 14 : 18,
          boxShadow:
            "0 16px 34px rgba(10,24,49,0.07), inset 0 1px 0 rgba(255,255,255,0.92)",
        }}
      >
        <StableButton
          debugId="dashboard.apps.toggle"
          type="button"
          aria-expanded={uiState.appsExpanded}
          onClick={(event) =>
            runDashboardUiMutation(event, () => toggleUiStateFlag("appsExpanded"))
          }
          onPointerDown={consumeDashboardPointerEvent}
          style={dashboardAccordionButtonStyle(
            "1px solid rgba(214,170,69,0.26)",
            "linear-gradient(180deg, #FFFFFF 0%, #FFF8E6 46%, #F4F9FF 100%)"
          )}
        >
          <span
            aria-hidden="true"
            style={dashboardAccordionIconStyle(
              "linear-gradient(180deg, rgba(242,199,102,0.30) 0%, rgba(255,248,230,0.92) 100%)",
              "1px solid rgba(214,170,69,0.34)",
              DASHBOARD_BRAND.goldText
            )}
          >
            <DashboardSignalIcon
              name={dashboardSectionSignal("What do you want to do next?")}
              size={isPhone ? 19 : 21}
              strokeWidth={2.3}
            />
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={dashboardAccordionTitleStyle}>
              What do you want to do next?
            </span>
            <span style={dashboardAccordionSummaryStyle}>
              Marketplace, demand, spotlight, trust, and more.
            </span>
          </span>
          <span
            aria-hidden="true"
            style={dashboardAccordionChevronStyle(uiState.appsExpanded)}
          >
            <DashboardChevronIcon expanded={uiState.appsExpanded} />
          </span>
        </StableButton>

        {uiState.appsExpanded ? (
        <div
          style={{
            marginTop: isPhone ? 10 : 12,
            display: "grid",
            gridTemplateColumns: isPhone
              ? "repeat(2, minmax(0, 1fr))"
              : "repeat(4, minmax(0, 1fr))",
            gap: isPhone ? 9 : 12,
          }}
        >
          {[
            {
              label: "Your Marketplace",
              to: DASHBOARD_TARGETS.MARKETPLACE,
            },
            {
              label: "Create Demand",
              to: DASHBOARD_TARGETS.DEMAND_BOX,
            },
            {
              label: "Your Spotlight",
              to: DASHBOARD_TARGETS.COMMUNITY_SPOTLIGHT,
            },
            {
              label: "Your Trust Events",
              to: DASHBOARD_TARGETS.TRUST,
            },
          ].map((item) => (
            <StableButton
              debugId={`dashboard.apps.primary.${item.label
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "")}`}
              key={item.label}
              type="button"
              onClick={(event) => openDashboardRoute(event, item.to)}
              onPointerDown={consumeDashboardPointerEvent}
              style={dashboardLauncherButtonStyle}
            >
              <span
                aria-hidden="true"
                style={dashboardAccordionIconStyle(
                  "linear-gradient(180deg, rgba(235,244,255,0.96) 0%, rgba(221,234,250,0.86) 100%)",
                  "1px solid rgba(11,99,209,0.16)"
                )}
              >
                <DashboardSignalIcon
                  name={dashboardActionSignal(item.label)}
                  size={isPhone ? 18 : 20}
                  strokeWidth={2.25}
                />
              </span>
              <span
                style={{
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.15,
                }}
              >
                {item.label}
              </span>
            </StableButton>
          ))}
        </div>
        ) : null}

        {uiState.appsExpanded ? (
          <div
            style={{
              marginTop: isPhone ? 10 : 12,
              display: "grid",
              gridTemplateColumns: isPhone
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(4, minmax(0, 1fr))",
              gap: isPhone ? 9 : 12,
            }}
          >
            {[
              {
                label: "Your Community",
                to: DASHBOARD_TARGETS.COMMUNITY,
              },
              {
                label: "Your Shop",
                to: DASHBOARD_TARGETS.SHOP_ME,
              },
              {
                label: "Your Alerts",
                to: DASHBOARD_TARGETS.WHAT_MATTERS_NOW,
              },
            {
              label: "Your Identity",
              to: DASHBOARD_TARGETS.CCI,
            },
          ].map((item) => (
            <StableButton
              debugId={`dashboard.apps.secondary.${item.label
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "")}`}
              key={item.label}
              type="button"
              onClick={(event) => openDashboardRoute(event, item.to)}
              onPointerDown={consumeDashboardPointerEvent}
              style={dashboardLauncherButtonStyle}
            >
              <span
                aria-hidden="true"
                style={dashboardAccordionIconStyle(
                  "linear-gradient(180deg, rgba(235,244,255,0.96) 0%, rgba(221,234,250,0.86) 100%)",
                  "1px solid rgba(11,99,209,0.16)"
                )}
              >
                <DashboardSignalIcon
                  name={dashboardActionSignal(item.label)}
                  size={isPhone ? 18 : 20}
                  strokeWidth={2.25}
                />
              </span>
              <span
                style={{
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.15,
                }}
              >
                {item.label}
              </span>
            </StableButton>
          ))}
          </div>
        ) : null}
      </section>

      <section
        style={{
          ...pageCard(
            "radial-gradient(circle at top left, rgba(11,99,209,0.14) 0%, rgba(11,99,209,0) 38%), linear-gradient(180deg, #F8FBFF 0%, #EEF6FF 100%)"
          ),
          order: 30,
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
              <DashboardSectionLabel label="Your Spotlight" />
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
                <StableButton
                  debugId="dashboard.spotlight.previous"
                  type="button"
                  onClick={goPrevSpotlight}
                  onPointerDown={consumeDashboardPointerEvent}
                  style={spotlightWhiteButton({
                    width: "auto",
                    minWidth: isPhone ? 92 : 120,
                  })}
                >
                  Previous
                </StableButton>

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

                <StableButton
                  debugId="dashboard.spotlight.next"
                  type="button"
                  onClick={goNextSpotlight}
                  onPointerDown={consumeDashboardPointerEvent}
                  style={spotlightWhiteButton({
                    width: "auto",
                    minWidth: isPhone ? 74 : 104,
                  })}
                >
                  Next
                </StableButton>
              </>
            ) : null}

            {!showSpotlight ? (
              <StableButton
                debugId="dashboard.spotlight.restore"
                type="button"
                onClick={restoreSpotlight}
                onPointerDown={consumeDashboardPointerEvent}
                style={dashboardStableActionFrame(secondaryBtn(false))}
              >
                Show Spotlight screen
              </StableButton>
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
                      "Your community Spotlight"
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
                      "Your community seller"
                  )}{" "}
                  -{" "}
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
                <StableButton
                  debugId="dashboard.spotlight.restore.empty-card"
                  type="button"
                  onClick={restoreSpotlight}
                  onPointerDown={consumeDashboardPointerEvent}
                  style={dashboardStableActionFrame(primaryBtn(false))}
                >
                  Show Spotlight screen
                </StableButton>
              </div>
            </div>
          </div>
        ) : spotlightLoading ? (
          <div style={{ marginTop: 16, color: "#64748B" }}>
            Loading your Spotlight...
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
                  showAudioUnlock={Boolean(spotlightVideoCandidate)}
                  audioUnlockErrorLabel="Play"
                  audioUnlockStyle={{
                    top: isPhone ? 14 : 16,
                    right: isPhone ? 14 : 16,
                    minWidth: isPhone ? 40 : 44,
                    width: isPhone ? 40 : 44,
                    minHeight: isPhone ? 40 : 44,
                    padding: 0,
                    borderRadius: 999,
                    fontSize: isPhone ? 18 : 20,
                    boxShadow: "0 12px 22px rgba(2,12,27,0.30)",
                  }}
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
                <StableButton
                  debugId="dashboard.spotlight.whatsapp"
                  type="button"
                  onClick={openSpotlightWhatsApp}
                  onPointerDown={consumeDashboardPointerEvent}
                  stableHeight={52}
                  style={{
                    position: "absolute",
                    right: isPhone ? 16 : 18,
                    bottom: isPhone ? 16 : 18,
                    zIndex: 5,
                    minWidth: isPhone ? 94 : 108,
                    width: "auto",
                    minHeight: 52,
                    padding: isPhone ? "8px 12px" : "9px 14px",
                    borderRadius: 999,
                    background:
                      "linear-gradient(180deg, #28D267 0%, #16A34A 100%)",
                    border: "1px solid rgba(22,163,74,0.42)",
                    color: "#FFFFFF",
                    boxShadow:
                      "0 12px 24px rgba(2,12,27,0.26), inset 0 1px 0 rgba(255,255,255,0.34)",
                    fontSize: isPhone ? 12.2 : 13,
                    fontWeight: 950,
                    whiteSpace: "nowrap",
                    pointerEvents: "auto",
                  }}
                >
                  WhatsApp
                </StableButton>
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
                    right: isPhone ? 122 : 146,
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
                        "Your community Spotlight"
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
                        "Your community seller"
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
                        "Your community Spotlight"
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
                        "Your community seller"
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
                <StableButton
                  debugId="dashboard.spotlight.guide.toggle"
                  type="button"
                  onClick={toggleSpotlightGuide}
                  onPointerDown={consumeDashboardPointerEvent}
                  style={dashboardStableActionFrame({
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
                  })}
                >
                  {spotlightGuideOpen ? "Close Spotlight" : "About Spotlight"}
                </StableButton>
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
                    Open your Community Home to upload a picture or video. GSN will
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
                    <StableButton
                      debugId="dashboard.spotlight.guide.upload"
                      type="button"
                      onClick={openDashboardSpotlightGuide}
                      onPointerDown={consumeDashboardPointerEvent}
                      style={spotlightActionButton()}
                    >
                      Upload
                    </StableButton>
                    <StableButton
                      debugId="dashboard.spotlight.guide.market"
                      type="button"
                      onClick={openSpotlightMarketplace}
                      onPointerDown={consumeDashboardPointerEvent}
                      style={spotlightActionButton()}
                    >
                      Market
                    </StableButton>
                    {safeStr(activeSpotlight.author_gmfn_id || "") ? (
                      <StableButton
                        debugId="dashboard.spotlight.guide.shop"
                        type="button"
                        onClick={openSpotlightShop}
                        onPointerDown={consumeDashboardPointerEvent}
                        style={spotlightActionButton()}
                      >
                        Shop
                      </StableButton>
                    ) : null}
                    <StableButton
                      debugId="dashboard.spotlight.guide.hide"
                      type="button"
                      onClick={minimizeSpotlight}
                      onPointerDown={consumeDashboardPointerEvent}
                      style={spotlightWhiteButton()}
                    >
                      Hide
                    </StableButton>
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
                  showAudioUnlock={Boolean(spotlightVideoCandidate)}
                  audioUnlockErrorLabel="Play"
                  audioUnlockStyle={{
                    top: isPhone ? 14 : 16,
                    right: isPhone ? 14 : 16,
                    minWidth: isPhone ? 40 : 44,
                    width: isPhone ? 40 : 44,
                    minHeight: isPhone ? 40 : 44,
                    padding: 0,
                    borderRadius: 999,
                    fontSize: isPhone ? 18 : 20,
                    boxShadow: "0 12px 22px rgba(2,12,27,0.30)",
                  }}
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
                  <StableButton
                    debugId="dashboard.spotlight.seller.open-details"
                    type="button"
                    onClick={openSellerIdentityDock}
                    onPointerDown={consumeDashboardPointerEvent}
                    style={dashboardStableActionFrame({
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
                    })}
                  >
                    Open seller details
                  </StableButton>
                ) : null}

                <StableButton
                  debugId="dashboard.spotlight.legacy.minimize"
                  type="button"
                  onClick={minimizeSpotlight}
                  onPointerDown={consumeDashboardPointerEvent}
                  style={dashboardStableActionFrame({
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
                  })}
                >
                  Minimize
                </StableButton>
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
                      "Your community seller"
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
                      "Your community Spotlight"
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
                          "Your community seller"
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
                        <DashboardSectionLabel label="Your community" />
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
                        <DashboardSectionLabel label="Posted" />
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
                          <DashboardSectionLabel label="Seller GSN ID" />
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
                    <DashboardSectionLabel label="Actions" />

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
                          Your short video Spotlight
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
                      <StableButton
                        debugId="dashboard.spotlight.seller.open-marketplace"
                        type="button"
                        onClick={openSpotlightMarketplace}
                        onPointerDown={consumeDashboardPointerEvent}
                        style={dashboardStableActionFrame(secondaryBtn(false))}
                      >
                        Open your Marketplace
                      </StableButton>
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        justifyContent: "flex-end",
                      }}
                    >
                      <StableButton
                        debugId="dashboard.spotlight.seller.close"
                        type="button"
                        onClick={closeSellerIdentityDock}
                        onPointerDown={consumeDashboardPointerEvent}
                        style={dashboardStableActionFrame({
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
                        })}
                      >
                        Close
                      </StableButton>
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
              <span style={badge(true)}>No live Spotlight for you</span>
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
                  "Your most recent community Spotlight"
              )}
            </div>

            <div style={{ ...helperText(), maxWidth: 820 }}>
              {safeStr(
                latestSpotlightSnapshot.source_shop_name ||
                  latestSpotlightSnapshot.author_name ||
                  "Your community seller"
              )}{" "}
              -{" "}
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
              Your last Spotlight has ended. Open your Community Home when you want
              to publish your next Spotlight.
            </div>

            <div
              style={{
                ...dashboardActionGrid(isCompact ? 128 : 152),
              }}
            >
              <StableButton
                debugId="dashboard.spotlight.latest.open-marketplace"
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
                Open your Marketplace
              </StableButton>
              <StableButton
                debugId="dashboard.spotlight.latest.open-tasks"
                type="button"
                onClick={openDashboardSpotlightGuide}
                onPointerDown={consumeDashboardPointerEvent}
                style={dashboardFillButton(secondaryBtn(false))}
              >
                Open your Spotlight tasks
              </StableButton>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 16, color: "#64748B" }}>
            No Spotlight is live for you right now.
          </div>
        )}
      </section>

      <section
        style={{
          ...pageCard(demandSurfaceChrome.shellBg),
          order: 50,
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
        <StableButton
          debugId="dashboard.demand.toggle"
          type="button"
          aria-expanded={demandGuideOpen}
          onClick={toggleDemandGuide}
          onPointerDown={consumeDashboardPointerEvent}
          style={dashboardAccordionButtonStyle(
            demandSurfaceChrome.chipBorder,
            demandSurfaceChrome.chipBg
          )}
        >
          <span
            aria-hidden="true"
            style={dashboardAccordionIconStyle(
              demandSurfaceChrome.statusBg,
              demandSurfaceChrome.chipSelectedBorder,
              demandSurfaceChrome.statusText
            )}
          >
            <DashboardSignalIcon
              name={dashboardSectionSignal("Your Demand Box")}
              size={isPhone ? 19 : 21}
              strokeWidth={2.3}
            />
          </span>

          <span style={{ minWidth: 0 }}>
            <span style={dashboardAccordionTitleStyle}>
              Your Demand Box
            </span>
            <span style={dashboardAccordionSummaryStyle}>
              {demandItems.length > 0
                ? `${demandItems.length} demand request${
                    demandItems.length === 1 ? "" : "s"
                  } visible.`
                : "No open demand is waiting right now."}
            </span>
          </span>

          <span
            style={{
              ...dashboardAccordionStatusStyle(
                demandSurfaceChrome.statusBg,
                demandSurfaceChrome.statusText,
                demandSurfaceChrome.chipSelectedBorder
              ),
              display: isPhone ? "none" : "inline-flex",
            }}
          >
            {urgentDemandItems.length > 0
              ? "Respond"
              : demandItems.length > 0
              ? "Open"
              : "Steady"}
          </span>

          <span
            aria-hidden="true"
            style={dashboardAccordionChevronStyle(demandGuideOpen)}
          >
            <DashboardChevronIcon expanded={demandGuideOpen} />
          </span>
        </StableButton>

        {demandGuideOpen ? (
          <>
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
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(252,254,255,0.98) 100%)",
                  border: "1px solid rgba(214,170,69,0.46)",
                  padding: isPhone ? 13 : 18,
                  borderRadius: isPhone ? 18 : 22,
                  boxShadow:
                    "0 18px 36px rgba(10,24,49,0.10), inset 0 1px 0 rgba(255,255,255,0.92)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    color: "#0B1F33",
                    fontSize: isPhone ? 11 : 12,
                    fontWeight: 1000,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      color: "#B88A1C",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    <DashboardSignalIcon name="trust" size={isPhone ? 16 : 18} />
                  </span>
                  Demand Box Response
                </div>

                <div
                  style={{
                    marginTop: isPhone ? 11 : 14,
                    display: "grid",
                    gridTemplateColumns: "auto minmax(0, 1fr)",
                    gap: isPhone ? 10 : 14,
                    alignItems: "center",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: isPhone ? 42 : 48,
                      height: isPhone ? 42 : 48,
                      borderRadius: isPhone ? 12 : 14,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#F2C766",
                      background:
                        "linear-gradient(180deg, #0B2D4A 0%, #061827 100%)",
                      boxShadow: "0 10px 20px rgba(6,24,39,0.18)",
                    }}
                  >
                    <DashboardSignalIcon name="package" size={isPhone ? 23 : 26} />
                  </span>
                  <div
                    style={{
                      color: "#0B1F33",
                      fontWeight: 1000,
                      fontSize: isPhone ? 27 : 34,
                      lineHeight: 1.04,
                      letterSpacing: 0,
                      minWidth: 0,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {safeStr(currentDemandItem.title || "Current demand request")}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: isPhone ? 13 : 16,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      ...badge(false),
                      minHeight: isPhone ? 30 : 34,
                      color: "#0B63D1",
                      border: "1px solid rgba(11,99,209,0.20)",
                      background: "rgba(239,246,255,0.92)",
                    }}
                  >
                    <span aria-hidden="true">•</span>
                    {currentDemandIsUrgent ? "Urgent" : "Open"}
                  </span>
                  {safeDateTime(currentDemandItem.created_at) ? (
                    <span
                      style={{
                        ...badge(false),
                        minHeight: isPhone ? 30 : 34,
                        color: "#425C78",
                        border: "1px solid rgba(11,99,209,0.16)",
                        background: "rgba(248,251,255,0.96)",
                      }}
                    >
                      <DashboardSignalIcon name="calendar" size={isPhone ? 14 : 15} />
                      {safeDateTime(currentDemandItem.created_at)}
                    </span>
                  ) : null}
                </div>

                <div
                  style={{
                    marginTop: isPhone ? 14 : 18,
                    paddingTop: isPhone ? 12 : 14,
                    borderTop: "1px solid rgba(15,59,116,0.10)",
                    ...helperText(),
                    color: "#4F6073",
                    fontSize: isPhone ? 14 : 15,
                    lineHeight: isPhone ? 1.42 : 1.55,
                    fontWeight: 760,
                  }}
                >
                  Item detail:{" "}
                  {safeStr(
                    currentDemandItem.description ||
                      "Open your Demand Box to read the full request."
                  )}
                </div>

                <div
                  style={{
                    marginTop: isPhone ? 16 : 18,
                    borderRadius: isPhone ? 15 : 18,
                    border: "1px solid rgba(15,59,116,0.10)",
                    background: "rgba(255,255,255,0.78)",
                    overflow: "hidden",
                  }}
                >
                  {[
                    {
                      icon: "community" as const,
                      label: "Community",
                      value: demandCommunityLabel,
                    },
                    {
                      icon: "user" as const,
                      label: "Requested by",
                      value:
                        safeStr(currentDemandItem.requester_email) ||
                        safeStr(
                          currentDemandItem.requester_name ||
                            currentDemandItem.requester_nickname
                        ) ||
                        "Not shown",
                    },
                    {
                      icon: "identity" as const,
                      label: "GSN ID",
                      value: demandRequesterId || "Not shown",
                    },
                    {
                      icon: "trust" as const,
                      label: "Trust reading",
                      value: demandRequesterTrust
                        ? safeStr(demandRequesterTrust).toLowerCase().startsWith("trust")
                          ? demandRequesterTrust
                          : `Trust ${demandRequesterTrust}`
                        : "Not shown",
                    },
                    {
                      icon: "demand" as const,
                      label: "Support type / Credit line",
                      value: currentDemandItem.allow_trust_credit
                        ? "Trust credit"
                        : demandPaymentMode || "Not stated",
                    },
                    {
                      icon: "marketplace" as const,
                      label: "Sender / courier location",
                      value: demandArea || "Not stated",
                    },
                  ].map((row, rowIndex) => (
                    <div
                      key={row.label}
                      style={{
                        display: "grid",
                        gridTemplateColumns: isPhone
                          ? "34px minmax(96px, 0.72fr) minmax(0, 1fr)"
                          : "44px minmax(170px, 0.62fr) minmax(0, 1fr)",
                        gap: isPhone ? 8 : 12,
                        alignItems: "center",
                        padding: isPhone ? "9px 10px" : "12px 14px",
                        borderTop:
                          rowIndex === 0
                            ? "none"
                            : "1px solid rgba(15,59,116,0.08)",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: isPhone ? 30 : 34,
                          height: isPhone ? 30 : 34,
                          borderRadius: 999,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "rgba(234,243,255,0.96)",
                          color: "#0B2D4A",
                        }}
                      >
                        <DashboardSignalIcon name={row.icon} size={isPhone ? 17 : 18} />
                      </span>
                      <span
                        style={{
                          color: "#66758A",
                          fontWeight: 760,
                          fontSize: isPhone ? 12.2 : 13,
                          lineHeight: 1.22,
                        }}
                      >
                        {row.label}
                      </span>
                      <span
                        style={{
                          color: "#0B1F33",
                          fontWeight: 940,
                          fontSize: isPhone ? 12.4 : 13.5,
                          lineHeight: 1.24,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: isPhone ? 16 : 20,
                    borderRadius: isPhone ? 15 : 18,
                    border: "1px solid rgba(214,170,69,0.34)",
                    background:
                      "linear-gradient(180deg, rgba(255,253,247,0.98) 0%, rgba(255,250,235,0.90) 100%)",
                    display: "grid",
                    gridTemplateColumns: isPhone ? "54px minmax(0, 1fr)" : "76px minmax(0, 1fr)",
                    gap: isPhone ? 12 : 16,
                    alignItems: "center",
                    padding: isPhone ? 13 : 16,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: isPhone ? 48 : 62,
                      height: isPhone ? 48 : 62,
                      borderRadius: 999,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#FFFFFF",
                      background:
                        "linear-gradient(180deg, #F2C766 0%, #D6AA45 100%)",
                      boxShadow: "0 10px 22px rgba(214,170,69,0.20)",
                    }}
                  >
                    <DashboardSignalIcon name="check" size={isPhone ? 24 : 30} />
                  </span>
                  <div
                    style={{
                      borderLeft: "1px solid rgba(214,170,69,0.44)",
                      paddingLeft: isPhone ? 12 : 18,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        color: "#0B1F33",
                        fontWeight: 1000,
                        fontSize: isPhone ? 14 : 16,
                        lineHeight: 1.28,
                      }}
                    >
                      Response proof expected.
                    </div>
                    <div
                      style={{
                        marginTop: 5,
                        color: "#334155",
                        fontWeight: 760,
                        fontSize: isPhone ? 12.8 : 14,
                        lineHeight: 1.42,
                      }}
                    >
                      Please confirm GSN ID and TrustSlip before work starts.
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: isPhone ? 14 : 18,
                    display: "grid",
                    gap: isPhone ? 9 : 10,
                  }}
                >
                  <StableButton
                    debugId="dashboard.demand.response.open-demand-box"
                    type="button"
                    onClick={(event) =>
                      openDashboardRoute(event, demandPrimaryActionTo)
                    }
                    onPointerDown={consumeDashboardPointerEvent}
                    style={{
                      ...primaryBtn(false),
                      width: "100%",
                      minHeight: isPhone ? 54 : 58,
                      borderRadius: isPhone ? 14 : 16,
                      background:
                        "linear-gradient(180deg, #0B2D4A 0%, #061827 100%)",
                      border: "1px solid rgba(214,170,69,0.42)",
                      color: "#FFFFFF",
                      boxShadow:
                        "0 14px 28px rgba(6,24,39,0.18), inset 0 1px 0 rgba(255,255,255,0.12)",
                      gap: 10,
                    }}
                  >
                    <DashboardSignalIcon name="package" size={isPhone ? 18 : 20} />
                    Open your Demand Box
                    <span aria-hidden="true" style={{ marginLeft: "auto", color: "#D6AA45" }}>
                      ›
                    </span>
                  </StableButton>

                  <StableButton
                    debugId="dashboard.demand.response.view-record"
                    type="button"
                    onClick={(event) =>
                      openDashboardRoute(event, demandPrimaryActionTo)
                    }
                    onPointerDown={consumeDashboardPointerEvent}
                    style={{
                      ...spotlightWhiteButton({
                        ...dashboardPhoneButton,
                        width: "100%",
                        minHeight: isPhone ? 50 : 54,
                        borderRadius: isPhone ? 13 : 15,
                      }),
                      gap: 10,
                    }}
                  >
                    <DashboardSignalIcon name="identity" size={isPhone ? 17 : 18} />
                    View full record
                    <span aria-hidden="true" style={{ marginLeft: "auto", color: "#66758A" }}>
                      ›
                    </span>
                  </StableButton>
                </div>

                <div
                  style={{
                    marginTop: isPhone ? 18 : 24,
                    textAlign: "center",
                    color: "#0B2D4A",
                    fontSize: isPhone ? 10.5 : 12,
                    fontWeight: 1000,
                    letterSpacing: isPhone ? 4 : 5,
                    textTransform: "uppercase",
                  }}
                >
                  Trust. Verify. Move.
                  <div
                    style={{
                      marginTop: 5,
                      color: "#66758A",
                      letterSpacing: isPhone ? 3 : 4,
                      fontSize: isPhone ? 9.5 : 10,
                    }}
                  >
                    GSN / GMFN
                  </div>
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
                  No open demand is waiting for you.
                </div>
                <div
                  style={{
                    marginTop: 5,
                    ...helperText(),
                    fontSize: isPhone ? 12.2 : 13,
                    lineHeight: isPhone ? 1.42 : 1.75,
                  }}
                >
                  Create your demand, then choose the community or marketplace
                  it should come from.
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
              <StableButton
                debugId="dashboard.demand.primary"
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
              </StableButton>
            </div>
          </div>
        </div>
          </>
        ) : null}
      </section>

      <section
        style={{
          ...pageCard(notificationSurfaceChrome.shellBg),
          order: 40,
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
        <StableButton
          debugId="dashboard.inbox.toggle"
          type="button"
          aria-expanded={uiState.inboxExpanded}
          onClick={(event) =>
            runDashboardUiMutation(event, () =>
              toggleUiStateFlag("inboxExpanded")
            )
          }
          onPointerDown={consumeDashboardPointerEvent}
          style={dashboardAccordionButtonStyle(
            notificationSurfaceChrome.chipBorder,
            notificationSurfaceChrome.chipBg
          )}
        >
          <span
            aria-hidden="true"
            style={dashboardAccordionIconStyle(
              notificationSurfaceChrome.statusBg,
              notificationSurfaceChrome.chipSelectedBorder,
              notificationSurfaceChrome.statusText
            )}
          >
            <DashboardSignalIcon
              name={dashboardSectionSignal("What needs your attention")}
              size={isPhone ? 19 : 21}
              strokeWidth={2.3}
            />
          </span>

          <span style={{ minWidth: 0 }}>
            <span style={dashboardAccordionTitleStyle}>
              What needs your attention
            </span>
            <span style={dashboardAccordionSummaryStyle}>
              {dashboardNoticeTotalCount > 0
                ? `${dashboardNoticeTotalCount} alert${
                    dashboardNoticeTotalCount === 1 ? "" : "s"
                  } ready for you.`
                : "No new alert is waiting for you."}
            </span>
          </span>

          <span
            style={{
              ...dashboardAccordionStatusStyle(
                notificationSurfaceChrome.statusBg,
                notificationSurfaceChrome.statusText,
                notificationSurfaceChrome.chipSelectedBorder
              ),
              display: isPhone ? "none" : "inline-flex",
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

          <span
            aria-hidden="true"
            style={dashboardAccordionChevronStyle(uiState.inboxExpanded)}
          >
            <DashboardChevronIcon expanded={uiState.inboxExpanded} />
          </span>
        </StableButton>

        {uiState.inboxExpanded ? (
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
              Preparing your dashboard alerts...
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
                <StableButton
                  debugId="dashboard.inbox.primary"
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
                </StableButton>
                <StableButton
                  debugId="dashboard.inbox.open-alerts"
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
                  Open your alerts
                </StableButton>
              </div>
            </div>
          ) : noticesLoading && dashboardNoticeTotalCount === 0 ? (
            <div style={{ marginTop: 12, color: "#64748B", lineHeight: 1.7 }}>
              Loading your alerts...
            </div>
          ) : null}

        </div>
        ) : null}
      </section>

      <section
        style={{
          ...pageCard(
            "radial-gradient(circle at top, rgba(243,208,106,0.10) 0%, rgba(243,208,106,0) 26%), linear-gradient(180deg, #F7FBFF 0%, #EAF3FF 52%, #DCEAFB 100%)"
          ),
          order: 80,
        }}
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
            <DashboardSectionLabel
              label="Your Market Wisdom"
              style={{ color: "#0F3B74" }}
            />
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
              {activeWisdomTitle || "Your live GSN reading"}
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
                  <DashboardSectionLabel
                    label="Your Commitment Builder"
                    style={{
                      color: DASHBOARD_BRAND.ink,
                      fontSize: 14,
                      letterSpacing: 0.12,
                    }}
                  />
                </div>
                <div
                  style={{
                    marginTop: 4,
                    color: DASHBOARD_BRAND.helper,
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                >
                  Keep your follow-through close when today's signal points to execution.
                </div>
              </div>

              <StableButton
                debugId="dashboard.market-wisdom.open-focus-commitments"
                type="button"
                onClick={(event) =>
                  openDashboardRoute(
                    event,
                    `${DASHBOARD_TARGETS.DASHBOARD}#focus-commitments`
                  )
                }
                onPointerDown={consumeDashboardPointerEvent}
                style={dashboardStableActionFrame({
                  ...secondaryBtn(false),
                  minHeight: 40,
                  padding: "8px 12px",
                  fontSize: 12.5,
                  background: "rgba(255,255,255,0.94)",
                  color: "#173654",
                  border: "1px solid rgba(23,54,84,0.14)",
                  boxShadow: "0 8px 18px rgba(15,23,42,0.06)",
                })}
              >
                Open Focus Commitments
              </StableButton>
            </div>
          ) : null}
        </div>
      </section>

      <section
        id="most-used-apps"
        style={{
          ...pageCard(DASHBOARD_BRAND.raisedPanel),
          order: 70,
          display: "none",
        }}
      >
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
                  <StableButton
                    debugId={`dashboard.most-used-app.${app.key}`}
                    key={`most-used-app-surface-${app.key}`}
                    type="button"
                    onClick={() => openTrackedApp(app)}
                    onPointerDown={consumeDashboardPointerEvent}
                    style={dashboardStableActionFrame({
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
                    })}
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
                  </StableButton>
                ))}
              </div>
            </div>
          </div>
        </div>

      </section>

      <section
        style={{
          order: 90,
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

            <StableButton
              debugId="dashboard.focus.toggle"
              type="button"
              aria-expanded={uiState.trustExpanded}
              onClick={(event) =>
                runDashboardUiMutation(event, () =>
                  toggleUiStateFlag("trustExpanded")
                )
              }
              onPointerDown={consumeDashboardPointerEvent}
              style={dashboardAccordionButtonStyle(
                "1px solid rgba(11,99,209,0.14)",
                "linear-gradient(180deg, #FFFFFF 0%, #F5F9FF 100%)"
              )}
            >
              <span
                aria-hidden="true"
                style={dashboardAccordionIconStyle()}
              >
                <DashboardSignalIcon
                  name={dashboardSectionSignal("Your Focus Commitments")}
                  size={isPhone ? 19 : 21}
                  strokeWidth={2.3}
                />
              </span>

              <span style={{ minWidth: 0 }}>
                <span style={dashboardAccordionTitleStyle}>
                  Your Focus Commitments
                </span>
                <span style={dashboardAccordionSummaryStyle}>
                  {activeFocusCount > 0 || activeRoscaObligationCount > 0
                    ? `${activeFocusCount} personal, ${activeRoscaObligationCount} ROSCA linked.`
                    : "No active commitment yet."}
                </span>
              </span>

              <span
                style={{
                  ...dashboardAccordionStatusStyle(
                    combinedFocusBehindCount > 0
                      ? "rgba(254,242,242,0.92)"
                      : combinedFocusWatchCount > 0
                      ? "rgba(255,251,235,0.94)"
                      : "rgba(240,253,244,0.92)",
                    combinedFocusBehindCount > 0
                      ? "#991B1B"
                      : combinedFocusWatchCount > 0
                      ? "#92400E"
                      : "#166534",
                    combinedFocusBehindCount > 0
                      ? "1px solid rgba(239,68,68,0.16)"
                      : combinedFocusWatchCount > 0
                      ? "1px solid rgba(245,158,11,0.16)"
                      : "1px solid rgba(34,197,94,0.16)"
                  ),
                  display: isPhone ? "none" : "inline-flex",
                }}
              >
                {combinedFocusBehindCount > 0
                  ? `Behind ${combinedFocusBehindCount}`
                  : combinedFocusWatchCount > 0
                  ? `Watch ${combinedFocusWatchCount}`
                  : "Steady"}
              </span>

              <span
                aria-hidden="true"
                style={dashboardAccordionChevronStyle(uiState.trustExpanded)}
              >
                <DashboardChevronIcon expanded={uiState.trustExpanded} />
              </span>
            </StableButton>

            {uiState.trustExpanded ? (
              <div style={{ display: "contents" }}>
            <div
              style={{
                marginTop: isPhone ? 10 : 12,
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
              <StableButton
                debugId="dashboard.focus.composer.toggle"
                type="button"
                onClick={(event) => {
                  if (activeFocusCount >= 2) {
                    consumeDashboardButtonEvent(event);
                    setFocusComposerOpen(true);
                    return;
                  }

                  runDashboardUiMutation(event, () =>
                    setFocusComposerOpen((prev) => !prev)
                  );
                }}
                onPointerDown={consumeDashboardPointerEvent}
                aria-disabled={activeFocusCount >= 2}
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
              >
                {focusComposerOpen ? "Close composer" : "Add commitment"}
              </StableButton>
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
                    {combinedFocusOnTrackCount}
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
                    {combinedFocusWatchCount}
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
                    {combinedFocusBehindCount}
                  </div>
                </div>
              </div>
            </div>

            {activeFocusCount > 0 ? (
              <div style={{ marginTop: 8, ...helperText(), fontSize: 12 }}>
                {focusSummary.disciplineLine}
              </div>
            ) : null}

            <div
              style={{
                marginTop: isPhone ? 10 : 14,
                ...innerCard("#FFFFFF"),
                border: "1px solid rgba(214,170,69,0.18)",
                display: "grid",
                gap: isPhone ? 9 : 10,
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
                  <DashboardSectionLabel label="ROSCA linked responsibilities" />
                  <div style={{ marginTop: 6, ...helperText(), fontSize: 13 }}>
                    These come from ROSCA Money In records. Focus shows them here
                    but does not create commitment TrustEvents.
                  </div>
                </div>
                <span style={badge(true)}>
                  {roscaObligationsLoading
                    ? "Checking"
                    : `${activeRoscaObligationCount} open`}
                </span>
              </div>

              {roscaFocusSummary.active.length > 0 ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {roscaFocusSummary.active.slice(0, 4).map((item) => {
                    const statusKey = safeStr(item.status_group).toLowerCase();
                    const statusTone =
                      statusKey === "behind"
                        ? {
                            label: "Behind",
                            bg: "#FFF5F5",
                            text: "#991B1B",
                            border: "1px solid rgba(239,68,68,0.16)",
                          }
                        : statusKey === "watch" || statusKey === "partial"
                        ? {
                            label: statusKey === "partial" ? "Partial" : "Watch",
                            bg: "#FFFBEF",
                            text: "#92400E",
                            border: "1px solid rgba(245,158,11,0.16)",
                          }
                        : {
                            label: "On track",
                            bg: "#F3FBF5",
                            text: "#166534",
                            border: "1px solid rgba(34,197,94,0.16)",
                          };
                    const amountLine = `${safeStr(item.currency) || "GBP"} ${
                      safeStr(item.remaining_amount || item.amount) || "0.00"
                    }`;
                    const target = normalizeActionTargetPath(
                      item.action_url || DASHBOARD_TARGETS.MONEY_IN
                    );

                    return (
                      <div
                        key={`rosca-focus-${item.id}`}
                        style={{
                          ...statTile(statusTone.bg, statusTone.border),
                          display: "grid",
                          gridTemplateColumns: isCompact
                            ? "1fr"
                            : "minmax(0, 1fr) auto",
                          gap: isPhone ? 8 : 10,
                          alignItems: "center",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              color: "#0B1F33",
                              fontWeight: 900,
                              fontSize: isPhone ? 14 : 15,
                              lineHeight: 1.3,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {safeStr(item.cycle_title) || "ROSCA cycle"} - Round{" "}
                            {Number(item.round_number || 0) || "?"}
                          </div>
                          <div
                            style={{
                              marginTop: 6,
                              display: "flex",
                              gap: 7,
                              flexWrap: "wrap",
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                ...badge(false),
                                background: statusTone.bg,
                                color: statusTone.text,
                              }}
                            >
                              {statusTone.label}
                            </span>
                            <span style={badge(false)}>{amountLine}</span>
                            {safeStr(item.due_at) ? (
                              <span style={badge(false)}>
                                Due {formatDateLabel(item.due_at || "")}
                              </span>
                            ) : null}
                          </div>
                          <div
                            style={{
                              marginTop: 7,
                              ...helperText(),
                              fontSize: 12,
                              lineHeight: 1.45,
                            }}
                          >
                            {safeStr(item.plain_language) ||
                              "Open Money In to handle this ROSCA contribution."}
                          </div>
                          {safeStr(item.reference_display) ? (
                            <div
                              style={{
                                marginTop: 6,
                                ...helperText(),
                                fontSize: 11,
                                overflowWrap: "anywhere",
                              }}
                            >
                              Ref: {safeStr(item.reference_display)}
                            </div>
                          ) : null}
                        </div>

                        <StableButton
                          debugId={`dashboard.focus.rosca.open.${item.id}`}
                          type="button"
                          onClick={(event) => openDashboardRoute(event, target)}
                          onPointerDown={consumeDashboardPointerEvent}
                          style={focusCommitmentButton({
                            minHeight: isPhone ? 42 : 40,
                            padding: isPhone ? "8px 10px" : "8px 12px",
                          })}
                        >
                          {safeStr(item.action_label) || "Open Money In"}
                        </StableButton>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ ...helperText(), fontSize: 13 }}>
                  {roscaObligationsLoading
                    ? "Checking open ROSCA responsibilities."
                    : "No open ROSCA responsibility right now."}
                </div>
              )}
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
                    <DashboardSectionLabel label="Your new commitment" />
                    <div style={{ marginTop: 6, ...helperText(), fontSize: 13 }}>
                      Keep it measurable and time-bound.
                    </div>
                  </div>

                  <div style={dashboardActionGrid(isCompact ? 96 : 120)}>
                    <StableButton
                      debugId="dashboard.focus.template.savings"
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
                    </StableButton>
                    <StableButton
                      debugId="dashboard.focus.template.business"
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
                    </StableButton>
                    <StableButton
                      debugId="dashboard.focus.template.repayment"
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
                    </StableButton>
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
                    <StableButton
                      debugId="dashboard.focus.composer.cancel"
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
                    </StableButton>

                    <StableButton
                      debugId="dashboard.focus.composer.save"
                      type="button"
                      onClick={(event) => {
                        if (!safeStr(focusDraft.title) || activeFocusCount >= 2) {
                          consumeDashboardButtonEvent(event);
                          return;
                        }

                        runDashboardUiMutation(event, saveFocusCommitment);
                      }}
                      onPointerDown={consumeDashboardPointerEvent}
                      aria-disabled={
                        !safeStr(focusDraft.title) || activeFocusCount >= 2
                      }
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
                    >
                      Save commitment
                    </StableButton>
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
                          <DashboardSectionLabel label="Your next review" />
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
                          <DashboardSectionLabel label="Days left" />
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
                          <DashboardSectionLabel label="Your execution signal" />
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

                        <StableButton
                          debugId={`dashboard.focus.check-in.${item.id}`}
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
                        </StableButton>

                        <StableButton
                          debugId={`dashboard.focus.replan.${item.id}`}
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
                        </StableButton>

                        <StableButton
                          debugId={`dashboard.focus.complete.${item.id}`}
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
                        </StableButton>
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
                    <StableButton
                      debugId="dashboard.focus.empty-template.savings"
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
                    </StableButton>

                    <StableButton
                      debugId="dashboard.focus.empty-template.business"
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
                    </StableButton>

                    <StableButton
                      debugId="dashboard.focus.empty-template.repayment"
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
                    </StableButton>
                  </div>
                </div>
              )}
            </div>
              </div>
            ) : null}
          </div>
      </section>

      </div>
    </div>
  );
} 


























