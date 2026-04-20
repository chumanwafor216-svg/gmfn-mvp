import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import OriginLink from "../components/OriginLink";
import { navigateWithOrigin } from "../lib/nav";
import PageTopNav from "../components/PageTopNav";
import {
  getMyNotifications,
  getMySettings,
  markNotificationRead,
} from "../lib/api";
import {
  buildGuidanceSnapshot,
  type GuidanceInboxBucketKey,
  type GuidanceNotice,
  type GuidanceSnapshot,
} from "../lib/guidance";

type RawNotificationRow = {
  id: string;
  kind: string;
  title: string;
  detail: string;
  ctaLabel: string;
  ctaTo: string;
  unread: boolean;
  createdAt: string;
};

type SettingsState = {
  notificationsMode: "summary" | "detailed";
  unreadFirst: boolean;
  openActionsDirectly: boolean;
};

type CollapseState = {
  focus: boolean;
  buckets: boolean;
  rawFeed: boolean;
  reading: boolean;
};

const DEFAULT_SETTINGS: SettingsState = {
  notificationsMode: "summary",
  unreadFirst: true,
  openActionsDirectly: true,
};

const NOTIFICATIONS_UI_STORAGE_KEY = "gmfn.notifications.ui.v1";

const GSN_ACTION_BRAND = {
  ink: "#0B1F33",
  muted: "#557089",
  label: "#2D587F",
  blue: "#174A78",
  blueSoft: "#EAF3FA",
  gold: "#A9791F",
  goldSoft: "#F8EDD0",
  cardBorder: "rgba(22, 66, 102, 0.16)",
  cardBorderStrong: "rgba(13, 47, 78, 0.28)",
  hero:
    "linear-gradient(145deg, #071F35 0%, #103657 46%, #1D5B86 100%)",
  heroPanel:
    "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.07) 100%)",
  whiteButton:
    "linear-gradient(180deg, #FFFFFF 0%, #F5F9FC 58%, #EDF4F9 100%)",
  primaryButton:
    "linear-gradient(180deg, #103A60 0%, #1C5A8A 55%, #2D72A8 100%)",
};

const BUCKET_ORDER: GuidanceInboxBucketKey[] = [
  "actNow",
  "dueSoon",
  "watchAndWait",
  "generalUpdates",
];

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
];

const NOTIFICATION_TARGETS = {
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
  NOTIFICATIONS: "/app/notifications",
  DEMAND_BOX: "/app/demand-box",
  LOANS: "/app/loans",
  LOAN_READINESS: "/app/loan-readiness",
  LOAN_SUGGESTIONS: "/app/loan-suggestions",
  LOAN_WORKBENCH: "/app/loan-workbench",
  COMMITMENT_BUILDER: "/app/dashboard#focus-commitments",
  GUIDE: "/app/my-gmfn-and-i",
  SETTINGS: "/app/my-gmfn-and-i?tab=settings",
  BUILD_FIRST_CIRCLE: "/app/build-first-circle",
  SHOP_ME: "/app/shop/me",
  COMMAND_CENTER: "/app/command-center",
  GUARANTOR_EARNINGS: "/app/guarantor-earnings",
} as const;

const EXACT_TARGET_ALIASES: Record<string, string> = {
  dashboard: NOTIFICATION_TARGETS.DASHBOARD,
  home: NOTIFICATION_TARGETS.DASHBOARD,
  "main-dashboard": NOTIFICATION_TARGETS.DASHBOARD,
  "member-home": NOTIFICATION_TARGETS.DASHBOARD,

  notifications: NOTIFICATION_TARGETS.NOTIFICATIONS,
  "action-inbox": NOTIFICATION_TARGETS.NOTIFICATIONS,
  inbox: NOTIFICATION_TARGETS.NOTIFICATIONS,

  finance: NOTIFICATION_TARGETS.FINANCE,
  finances: NOTIFICATION_TARGETS.FINANCE,
  financials: NOTIFICATION_TARGETS.FINANCE,
  "open-finance": NOTIFICATION_TARGETS.FINANCE,
  "finance-overview": NOTIFICATION_TARGETS.FINANCE,
  "finance-meter": NOTIFICATION_TARGETS.FINANCE,

  "money-in": NOTIFICATION_TARGETS.MONEY_IN,
  "payment/pool": NOTIFICATION_TARGETS.MONEY_IN,

  "money-out": NOTIFICATION_TARGETS.MONEY_OUT,
  withdrawal: NOTIFICATION_TARGETS.MONEY_OUT,
  "withdrawal-instructions": NOTIFICATION_TARGETS.MONEY_OUT,

  marketplace: NOTIFICATION_TARGETS.MARKETPLACE,
  market: NOTIFICATION_TARGETS.MARKETPLACE,
  "open-marketplace": NOTIFICATION_TARGETS.MARKETPLACE,

  community: NOTIFICATION_TARGETS.COMMUNITY,
  "community-home": NOTIFICATION_TARGETS.COMMUNITY,
  "community-tools": NOTIFICATION_TARGETS.COMMUNITY,
  "community-tool": NOTIFICATION_TARGETS.COMMUNITY,
  "control-room": NOTIFICATION_TARGETS.COMMUNITY,
  "command-room": NOTIFICATION_TARGETS.COMMUNITY,
  "open-community": NOTIFICATION_TARGETS.COMMUNITY,
  "open-community-home": NOTIFICATION_TARGETS.COMMUNITY,

  trust: NOTIFICATION_TARGETS.TRUST,
  "trust-passport": NOTIFICATION_TARGETS.TRUST,
  "open-trust": NOTIFICATION_TARGETS.TRUST,

  "trust-slip": NOTIFICATION_TARGETS.TRUST_SLIP,
  trustslip: NOTIFICATION_TARGETS.TRUST_SLIP,
  "open-trust-slip": NOTIFICATION_TARGETS.TRUST_SLIP,
  "merchant-verify": NOTIFICATION_TARGETS.TRUST_SLIP,
  "verify-merchant": NOTIFICATION_TARGETS.TRUST_SLIP,
  "trust-slip/verify": NOTIFICATION_TARGETS.TRUST_SLIP_VERIFY,

  identity: NOTIFICATION_TARGETS.CCI,
  "identity-integrity": NOTIFICATION_TARGETS.CCI,
  cci: NOTIFICATION_TARGETS.CCI,

  "demand-box": NOTIFICATION_TARGETS.DEMAND_BOX,
  demands: NOTIFICATION_TARGETS.DEMAND_BOX,
  "open-demand": NOTIFICATION_TARGETS.DEMAND_BOX,

  loans: NOTIFICATION_TARGETS.LOANS,
  money: NOTIFICATION_TARGETS.LOANS,
  support: NOTIFICATION_TARGETS.LOANS,
  "support-path": NOTIFICATION_TARGETS.LOANS,
  "loan-support": NOTIFICATION_TARGETS.LOANS,
  "loans-support": NOTIFICATION_TARGETS.LOANS,

  "loan-readiness": NOTIFICATION_TARGETS.LOAN_READINESS,
  readiness: NOTIFICATION_TARGETS.LOAN_READINESS,

  "loan-suggestions": NOTIFICATION_TARGETS.LOAN_SUGGESTIONS,
  suggestions: NOTIFICATION_TARGETS.LOAN_SUGGESTIONS,

  "loan-workbench": NOTIFICATION_TARGETS.LOAN_WORKBENCH,
  workbench: NOTIFICATION_TARGETS.LOAN_WORKBENCH,

  "commitment-builder": NOTIFICATION_TARGETS.COMMITMENT_BUILDER,
  commitment: NOTIFICATION_TARGETS.COMMITMENT_BUILDER,
  commitments: NOTIFICATION_TARGETS.COMMITMENT_BUILDER,
  "focus-commitments": NOTIFICATION_TARGETS.COMMITMENT_BUILDER,

  "my-gmfn-and-i": NOTIFICATION_TARGETS.GUIDE,
  guide: NOTIFICATION_TARGETS.GUIDE,
  "member-guide": NOTIFICATION_TARGETS.GUIDE,
  settings: NOTIFICATION_TARGETS.SETTINGS,
  "workspace-settings": NOTIFICATION_TARGETS.SETTINGS,
  "my-gmfn-and-i/settings": NOTIFICATION_TARGETS.SETTINGS,

  "build-first-circle": NOTIFICATION_TARGETS.BUILD_FIRST_CIRCLE,
  "first-circle": NOTIFICATION_TARGETS.BUILD_FIRST_CIRCLE,
  "grow-your-circle": NOTIFICATION_TARGETS.BUILD_FIRST_CIRCLE,
  circle: NOTIFICATION_TARGETS.BUILD_FIRST_CIRCLE,
  "circle-builder": NOTIFICATION_TARGETS.BUILD_FIRST_CIRCLE,

  shop: NOTIFICATION_TARGETS.SHOP_ME,
  "my-shop": NOTIFICATION_TARGETS.SHOP_ME,
  "shop-gallery": NOTIFICATION_TARGETS.SHOP_ME,
  "open-shop": NOTIFICATION_TARGETS.SHOP_ME,

  "shop-control": "/app/shop-control",
  "shop-manager": "/app/shop-control",

  "command-center": NOTIFICATION_TARGETS.COMMAND_CENTER,
  "trust-command-centre": NOTIFICATION_TARGETS.COMMAND_CENTER,
  "trust-analytics": "/app/command-center/trust-analytics",
  "system-operations": "/app/command-center/system-operations",
  "admin/exposure": "/app/command-center/exposure",
  "admin/trust-graph": "/app/command-center/trust-graph",

  earnings: NOTIFICATION_TARGETS.GUARANTOR_EARNINGS,
  "guarantor-earnings": NOTIFICATION_TARGETS.GUARANTOR_EARNINGS,
};

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

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 28,
    border: `1px solid ${GSN_ACTION_BRAND.cardBorder}`,
    background: bg,
    padding: 20,
    boxShadow:
      "0 18px 42px rgba(12,35,58,0.075), 0 2px 10px rgba(12,35,58,0.035)",
    overflow: "hidden",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 22,
    border: `1px solid ${GSN_ACTION_BRAND.cardBorder}`,
    background: bg,
    padding: 16,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.82)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 20,
    border: `1px solid ${GSN_ACTION_BRAND.cardBorder}`,
    background: bg,
    padding: 14,
    boxShadow: "0 8px 20px rgba(12,35,58,0.035)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: GSN_ACTION_BRAND.label,
    fontWeight: 900,
    letterSpacing: 1.7,
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
    border: primary
      ? "1px solid rgba(169,121,31,0.24)"
      : `1px solid ${GSN_ACTION_BRAND.cardBorder}`,
    background: primary ? GSN_ACTION_BRAND.goldSoft : GSN_ACTION_BRAND.blueSoft,
    color: primary ? "#735315" : GSN_ACTION_BRAND.blue,
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
  };
}

function actionBtn(
  kind: "primary" | "secondary" | "soft" = "secondary",
  disabled = false
): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: kind === "soft" ? 44 : 46,
    minWidth: 112,
    maxWidth: "100%",
    padding: kind === "soft" ? "9px 14px" : "11px 18px",
    borderRadius: kind === "soft" ? 16 : 18,
    fontWeight: 900,
    fontSize: kind === "soft" ? 13 : 14,
    lineHeight: 1.15,
    letterSpacing: 0.15,
    textAlign: "center",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    userSelect: "none",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    opacity: disabled ? 0.78 : 1,
  };

  if (kind === "primary") {
    return {
      ...base,
      border: "1px solid rgba(255,255,255,0.22)",
      background: disabled ? "#CBD5E1" : GSN_ACTION_BRAND.primaryButton,
      color: "#FFFFFF",
      boxShadow:
        "0 10px 22px rgba(16,58,96,0.20), inset 0 1px 0 rgba(255,255,255,0.22)",
    };
  }

  if (kind === "soft") {
    return {
      ...base,
      border: `1px solid ${GSN_ACTION_BRAND.cardBorder}`,
      background: "#F8FBFF",
      color: disabled ? "#94A3B8" : GSN_ACTION_BRAND.blue,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.84)",
    };
  }

  return {
    ...base,
    border: `1px solid ${GSN_ACTION_BRAND.cardBorderStrong}`,
    background: GSN_ACTION_BRAND.whiteButton,
    color: disabled ? "#94A3B8" : GSN_ACTION_BRAND.ink,
    boxShadow:
      "0 8px 18px rgba(12,35,58,0.055), inset 0 1px 0 rgba(255,255,255,0.9)",
  };
}

function collapseToggle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    minWidth: 108,
    padding: "10px 16px",
    borderRadius: 18,
    border: `1px solid ${GSN_ACTION_BRAND.cardBorderStrong}`,
    background: GSN_ACTION_BRAND.whiteButton,
    color: GSN_ACTION_BRAND.blue,
    fontWeight: 900,
    fontSize: 13,
    letterSpacing: 0.15,
    textAlign: "center",
    cursor: "pointer",
    whiteSpace: "normal",
    userSelect: "none",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    boxShadow:
      "0 8px 18px rgba(12,35,58,0.055), inset 0 1px 0 rgba(255,255,255,0.9)",
  };
}

function statTile(): React.CSSProperties {
  return {
    borderRadius: 20,
    border: `1px solid ${GSN_ACTION_BRAND.cardBorder}`,
    background: "linear-gradient(180deg, #FFFFFF 0%, #F6FAFD 100%)",
    padding: 14,
    boxShadow: "0 10px 20px rgba(12,35,58,0.045)",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: GSN_ACTION_BRAND.muted,
    fontSize: 14,
    lineHeight: 1.75,
  };
}

function actionRow(isPhone = false): React.CSSProperties {
  return isPhone
    ? {
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 10,
        alignItems: "stretch",
      }
    : {
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "stretch",
      };
}

function containsAny(text: string, tokens: string[]): boolean {
  return tokens.some((token) => text.includes(token));
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

function normalizeActionTargetPath(value: any): string {
  const raw = safeStr(value);
  if (!raw) return NOTIFICATION_TARGETS.NOTIFICATIONS;

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
    return `${NOTIFICATION_TARGETS.NOTIFICATIONS}${raw}`;
  }

  const { path, suffix } = splitPathSuffix(raw);
  const normalizedPath = safeStr(path).replace(/^\/+/, "");
  const lowerPath = normalizedPath.toLowerCase();

  if (!lowerPath) return NOTIFICATION_TARGETS.NOTIFICATIONS;

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

  return NOTIFICATION_TARGETS.NOTIFICATIONS;
}

function resolveNoticeTarget(raw: any): string {
  const explicit = normalizeActionTargetPath(
    raw?.action_url || raw?.cta_to || raw?.ctaTo || raw?.to
  );
  if (explicit && explicit !== NOTIFICATION_TARGETS.NOTIFICATIONS) return explicit;

  const text = [
    safeStr(raw?.kind),
    safeStr(raw?.title),
    safeStr(raw?.message),
    safeStr(raw?.detail),
    safeStr(raw?.description),
    safeStr(raw?.action_label),
  ]
    .join(" ")
    .toLowerCase();

  if (
    containsAny(text, [
      "build first circle",
      "first circle",
      "grow your circle",
      "circle invite",
    ])
  ) {
    return NOTIFICATION_TARGETS.BUILD_FIRST_CIRCLE;
  }

  if (
    containsAny(text, [
      "merchant verify",
      "trustslip",
      "trust slip",
      "verify qr",
      "scan qr",
      "qr verify",
    ])
  ) {
    return NOTIFICATION_TARGETS.TRUST_SLIP;
  }

  if (
    containsAny(text, [
      "demand",
      "buyer need",
      "market need",
      "open need",
      "request for goods",
      "request for item",
      "sourcing",
    ])
  ) {
    return NOTIFICATION_TARGETS.DEMAND_BOX;
  }

  if (
    containsAny(text, [
      "settings",
      "preference",
      "notifications mode",
      "quiet notifications",
    ])
  ) {
    return NOTIFICATION_TARGETS.SETTINGS;
  }

  if (containsAny(text, ["my gmfn and i", "guide"])) {
    return NOTIFICATION_TARGETS.GUIDE;
  }

  if (
    containsAny(text, [
      "commitment builder",
      "focus commitment",
      "commitment checkpoint",
      "replan",
      "check in",
      "savings target",
      "repayment target",
      "business target",
      "retirement readiness",
      "follow-through",
    ])
  ) {
    return NOTIFICATION_TARGETS.COMMITMENT_BUILDER;
  }

  return NOTIFICATION_TARGETS.NOTIFICATIONS;
}

function normalizeSettings(raw: any): SettingsState {
  return {
    notificationsMode:
      safeStr(raw?.notificationsMode || raw?.notifications_mode) === "detailed"
        ? "detailed"
        : "summary",
    unreadFirst: Boolean(raw?.unreadFirst ?? raw?.unread_first ?? true),
    openActionsDirectly: Boolean(
      raw?.openActionsDirectly ?? raw?.open_actions_directly ?? true
    ),
  };
}

function normalizeRawNotificationRow(raw: any): RawNotificationRow {
  return {
    id: firstTruthy(raw?.id, raw?.notification_id, raw?.title, raw?.message),
    kind: firstTruthy(raw?.kind, raw?.title, "update"),
    title: firstTruthy(raw?.title, raw?.kind, "Update"),
    detail: firstTruthy(
      raw?.message,
      raw?.detail,
      "Review this update and continue from the right page."
    ),
    ctaLabel: firstTruthy(raw?.action_label, "Open"),
    ctaTo: resolveNoticeTarget(raw),
    unread: !raw?.is_read,
    createdAt: firstTruthy(raw?.created_at),
  };
}

function isTrustOnboardingRow(row: RawNotificationRow | null | undefined): boolean {
  const kind = safeStr(row?.kind).toLowerCase();
  const title = safeStr(row?.title).toLowerCase();
  const detail = safeStr(row?.detail).toLowerCase();

  return (
    kind === "trust.onboarding" ||
    kind === "trust.verification-results" ||
    title.includes("starter trust") ||
    title.includes("onboarding checks") ||
    detail.includes("starter trust") ||
    detail.includes("verification checks")
  );
}

function onboardingProofBadges(detail: string): string[] {
  const text = safeStr(detail).toLowerCase();
  const badges: string[] = [];

  if (text.includes("phone")) badges.push("Verified phone");
  if (text.includes("bank")) badges.push("Bank destination saved");
  if (text.includes("licence") || text.includes("license")) {
    badges.push("Driver's licence");
  }
  if (text.includes("region")) badges.push("Region checked");

  return badges;
}

function normalizeGuidanceNotice(item: GuidanceNotice): GuidanceNotice {
  return {
    ...item,
    ctaTo: normalizeActionTargetPath(item.ctaTo),
  };
}

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function bucketTitle(bucket: GuidanceInboxBucketKey): string {
  if (bucket === "actNow") return "Act now";
  if (bucket === "dueSoon") return "Due soon";
  if (bucket === "watchAndWait") return "Watch and wait";
  return "General updates";
}

function bucketDescription(bucket: GuidanceInboxBucketKey): string {
  if (bucket === "actNow") {
    return "Someone may be waiting for your answer. Open these first.";
  }
  if (bucket === "dueSoon") {
    return "These are not urgent yet, but it is better to handle them soon.";
  }
  if (bucket === "watchAndWait") {
    return "These are already moving. Check them, but you may not need to act now.";
  }
  return "These are useful updates. Read them when you have time.";
}

function bucketTone(
  bucket: GuidanceInboxBucketKey
): { bg: string; border: string; text: string } {
  if (bucket === "actNow") {
    return {
      bg: "#FFF5F5",
      border: "1px solid rgba(239,68,68,0.16)",
      text: "#991B1B",
    };
  }

  if (bucket === "dueSoon") {
    return {
      bg: "#FFFBEF",
      border: "1px solid rgba(245,158,11,0.16)",
      text: "#92400E",
    };
  }

  if (bucket === "watchAndWait") {
    return {
      bg: "#F8FBFF",
      border: "1px solid rgba(11,99,209,0.12)",
      text: "#0B63D1",
    };
  }

  return {
    bg: "#F8FAFC",
    border: "1px solid rgba(148,163,184,0.16)",
    text: "#334155",
  };
}

function truncateText(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trim()}…`;
}

function sortGuidanceNotices(
  rows: GuidanceNotice[],
  unreadFirst: boolean
): GuidanceNotice[] {
  const next = [...rows];

  next.sort((a, b) => {
    if (unreadFirst) {
      const aUnread = a.unread ? 1 : 0;
      const bUnread = b.unread ? 1 : 0;
      if (aUnread !== bUnread) return bUnread - aUnread;
    }

    return safeStr(a.title).localeCompare(safeStr(b.title));
  });

  return next;
}

function sortRawNotifications(
  rows: RawNotificationRow[],
  unreadFirst: boolean
): RawNotificationRow[] {
  const next = [...rows];

  next.sort((a, b) => {
    if (unreadFirst) {
      const aUnread = a.unread ? 1 : 0;
      const bUnread = b.unread ? 1 : 0;
      if (aUnread !== bUnread) return bUnread - aUnread;
    }

    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return bTime - aTime;
  });

  return next;
}

function markGuidanceSnapshotReadLocally(
  snapshot: GuidanceSnapshot | null,
  id: string
): GuidanceSnapshot | null {
  if (!snapshot) return snapshot;

  const patch = (rows: GuidanceNotice[]) =>
    rows.map((item) =>
      safeStr(item.id) === id ? { ...item, unread: false } : item
    );

  const nextActionInboxSummary = {
    ...snapshot.actionInboxSummary,
    actNow: patch(snapshot.actionInboxSummary.actNow || []),
    dueSoon: patch(snapshot.actionInboxSummary.dueSoon || []),
    watchAndWait: patch(snapshot.actionInboxSummary.watchAndWait || []),
    generalUpdates: patch(snapshot.actionInboxSummary.generalUpdates || []),
  };

  const unreadCount = [
    ...nextActionInboxSummary.actNow,
    ...nextActionInboxSummary.dueSoon,
    ...nextActionInboxSummary.watchAndWait,
    ...nextActionInboxSummary.generalUpdates,
  ].filter((item) => item.unread).length;

  return {
    ...snapshot,
    actionInboxSummary: {
      ...nextActionInboxSummary,
      unreadCount,
    },
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

function defaultCollapseState(): CollapseState {
  return {
    focus: false,
    buckets: false,
    rawFeed: true,
    reading: true,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    focus: Boolean(raw?.focus ?? base.focus),
    buckets: Boolean(raw?.buckets ?? base.buckets),
    rawFeed: Boolean(raw?.rawFeed ?? base.rawFeed),
    reading: Boolean(raw?.reading ?? base.reading),
  };
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });
  const [isPhone, setIsPhone] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 640;
  });

  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [guidanceSnapshot, setGuidanceSnapshot] = useState<GuidanceSnapshot | null>(
    null
  );
  const [guidanceLoading, setGuidanceLoading] = useState(false);
  const [rawNotifications, setRawNotifications] = useState<RawNotificationRow[]>(
    []
  );
  const [rawLoading, setRawLoading] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<GuidanceNotice | null>(null);

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(NOTIFICATIONS_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 980);
      setIsPhone(window.innerWidth <= 640);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    writeLocalJSON(NOTIFICATIONS_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    let alive = true;

    async function loadAll() {
      setGuidanceLoading(true);
      setRawLoading(true);

      try {
        const [settingsRes, guidanceRes, rawRes] = await Promise.all([
          getMySettings().catch(() => null),
          buildGuidanceSnapshot().catch(() => null),
          getMyNotifications(100, false).catch(() => ({ items: [] })),
        ]);

        if (!alive) return;

        setSettings(normalizeSettings(settingsRes || {}));
        setGuidanceSnapshot(guidanceRes);

        const rows = (
          Array.isArray(rawRes?.items)
            ? rawRes.items
            : Array.isArray(rawRes)
            ? rawRes
            : []
        ).map((item: any) => normalizeRawNotificationRow(item));

        setRawNotifications(rows);
      } finally {
        if (alive) {
          setGuidanceLoading(false);
          setRawLoading(false);
        }
      }
    }

    void loadAll();

    const intervalId = window.setInterval(() => {
      void loadAll();
    }, 60000);

    return () => {
      alive = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const bucketRows = useMemo(() => {
    const summary = guidanceSnapshot?.actionInboxSummary;

    const normalizeAndSort = (rows: GuidanceNotice[]) =>
      sortGuidanceNotices(rows.map(normalizeGuidanceNotice), settings.unreadFirst);

    return {
      actNow: normalizeAndSort(summary?.actNow || []),
      dueSoon: normalizeAndSort(summary?.dueSoon || []),
      watchAndWait: normalizeAndSort(summary?.watchAndWait || []),
      generalUpdates: normalizeAndSort(summary?.generalUpdates || []),
    };
  }, [guidanceSnapshot, settings.unreadFirst]);

  const unreadCount = guidanceSnapshot?.actionInboxSummary?.unreadCount || 0;

  const rawFeed = useMemo(
    () => sortRawNotifications(rawNotifications, settings.unreadFirst).slice(0, 10),
    [rawNotifications, settings.unreadFirst]
  );

  const onboardingTrustNotice = useMemo(() => {
    const preferred = rawNotifications.find(
      (row) => isTrustOnboardingRow(row) && row.unread
    );
    if (preferred) return preferred;

    return rawNotifications.find((row) => isTrustOnboardingRow(row)) || null;
  }, [rawNotifications]);

  const operationalFocus = useMemo(() => {
    if (onboardingTrustNotice) {
      return normalizeGuidanceNotice({
        id: safeStr(onboardingTrustNotice.id) || "trust-onboarding-focus",
        kind: safeStr(onboardingTrustNotice.kind) || "trust.onboarding",
        title: safeStr(onboardingTrustNotice.title) || "Starter trust has been established",
        detail:
          safeStr(onboardingTrustNotice.detail) ||
          "Your starter trust record was saved and your trust page is ready to review.",
        ctaLabel: safeStr(onboardingTrustNotice.ctaLabel) || "Review Trust",
        ctaTo: safeStr(onboardingTrustNotice.ctaTo) || NOTIFICATION_TARGETS.TRUST,
        bucket: "actNow" as GuidanceInboxBucketKey,
        unread: Boolean(onboardingTrustNotice.unread),
      });
    }
    if (bucketRows.actNow.length > 0) return bucketRows.actNow[0];
    if (bucketRows.dueSoon.length > 0) return bucketRows.dueSoon[0];
    if (guidanceSnapshot?.recoveryPath) {
      return normalizeGuidanceNotice({
        id: "recovery-focus",
        kind: guidanceSnapshot.recoveryPath.kind,
        title: guidanceSnapshot.recoveryPath.title,
        detail: guidanceSnapshot.recoveryPath.detail,
        ctaLabel: guidanceSnapshot.recoveryPath.ctaLabel,
        ctaTo: guidanceSnapshot.recoveryPath.ctaTo,
        bucket: "actNow" as GuidanceInboxBucketKey,
        unread: true,
      });
    }
    return null;
  }, [bucketRows, guidanceSnapshot, onboardingTrustNotice]);

  async function markAsRead(id: string) {
    if (!/^\d+$/.test(id)) return;

    await markNotificationRead(Number(id)).catch(() => null);

    setGuidanceSnapshot((prev) => markGuidanceSnapshotReadLocally(prev, id));
    setRawNotifications((prev) =>
      prev.map((item) =>
        safeStr(item.id) === id ? { ...item, unread: false } : item
      )
    );
    setSelectedNotice((prev) =>
      prev && safeStr(prev.id) === id ? { ...prev, unread: false } : prev
    );
  }

  async function handlePrimaryNoticeAction(notice: GuidanceNotice) {
    const normalizedNotice = normalizeGuidanceNotice(notice);

    if (safeStr(normalizedNotice.id)) {
      await markAsRead(safeStr(normalizedNotice.id));
    }

    if (settings.openActionsDirectly) {
      navigateWithOrigin(navigate, normalizedNotice.ctaTo, location);
      return;
    }

    setSelectedNotice(normalizedNotice);
  }

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  return (
    <div
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        paddingBottom: 40,
        display: "grid",
        gap: isPhone ? 14 : 18,
      }}
    >
      <PageTopNav
        sectionLabel="Notifications"
        title="Action Inbox"
        subtitle="Check what is waiting for you, then open the right page to answer it."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/dashboard"
        nextLinks={[
          { label: "Community Home", to: "/app/community" },
          { label: "Trust", to: "/app/trust" },
          { label: "Demand Box", to: "/app/demand-box" },
        ]}
        utilityLinks={[
          { label: "Marketplace", to: "/app/marketplace" },
          { label: "My GSN and I", to: "/app/my-gmfn-and-i" },
          { label: "Commitment Builder", to: "/app/dashboard#focus-commitments" },
        ]}
      />

      <ExplainToggle
        label="About Action Inbox"
        what="Action Inbox shows the messages and requests that may need your answer."
        why="It helps you start with the item that matters most instead of searching through every update."
        next="Start with Act now. If nothing needs your answer, you can return to Dashboard."
        tone="blue"
      />

      <section
        style={{
          ...pageCard(GSN_ACTION_BRAND.hero),
          border: "1px solid rgba(255,255,255,0.18)",
          boxShadow:
            "0 22px 52px rgba(7,31,53,0.22), inset 0 1px 0 rgba(255,255,255,0.14)",
        }}
      >
        <div
          style={{
            ...sectionLabel(),
            color: "#DCEBFA",
          }}
        >
          Action inbox summary
        </div>

        <div
          style={{
            marginTop: 10,
            color: "#F8FBFF",
            fontSize: isPhone ? 24 : isCompact ? 28 : 34,
            fontWeight: 900,
            lineHeight: 1.08,
            maxWidth: 860,
          }}
        >
          Check what needs your answer now.
        </div>

        <div
          style={{
            marginTop: 12,
            ...helperText(),
            color: "#D7E3F1",
            maxWidth: 880,
          }}
        >
          Start with Act now. If nothing is waiting, you can mark items as read or return to Dashboard.
        </div>

        <ExplainToggle
          label="About this summary"
          what="This summary shows how many items are unread, urgent, due soon, or safe to watch."
          why="It helps you know where to begin without guessing."
          next="Open the urgent items first. If there are none, check due soon or go back to Dashboard."
          tone="dark"
          style={{ marginTop: 14 }}
        />

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isPhone
              ? "1fr 1fr"
              : isCompact
              ? "1fr 1fr"
              : "repeat(4, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <div style={statTile()}>
            <div style={sectionLabel()}>Unread</div>
            <div
              style={{
                marginTop: 8,
                color: "#0B63D1",
                fontWeight: 900,
                fontSize: 26,
              }}
            >
              {unreadCount}
            </div>
          </div>

          <div style={statTile()}>
            <div style={sectionLabel()}>Act now</div>
            <div
              style={{
                marginTop: 8,
                color: "#991B1B",
                fontWeight: 900,
                fontSize: 26,
              }}
            >
              {bucketRows.actNow.length}
            </div>
          </div>

          <div style={statTile()}>
            <div style={sectionLabel()}>Due soon</div>
            <div
              style={{
                marginTop: 8,
                color: "#92400E",
                fontWeight: 900,
                fontSize: 26,
              }}
            >
              {bucketRows.dueSoon.length}
            </div>
          </div>

          <div style={statTile()}>
            <div style={sectionLabel()}>Watch</div>
            <div
              style={{
                marginTop: 8,
                color: "#0B63D1",
                fontWeight: 900,
                fontSize: 26,
              }}
            >
              {bucketRows.watchAndWait.length}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, ...actionRow(isPhone) }}>
          <button
            type="button"
            onClick={() =>
              setCollapsed((prev) => ({
                ...prev,
                focus: false,
                buckets: false,
              }))
            }
            style={actionBtn("primary")}
          >
            Show urgent items
          </button>
        </div>
      </section>

      {onboardingTrustNotice ? (
        <section style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)")}>
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
              <div style={sectionLabel()}>Trust update</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: isCompact ? 22 : 28,
                  fontWeight: 900,
                  lineHeight: 1.15,
                }}
              >
                {onboardingTrustNotice.title}
              </div>
              <div style={{ marginTop: 10, ...helperText() }}>
                {onboardingTrustNotice.detail}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {onboardingTrustNotice.unread ? (
                <span style={badge(true)}>Unread</span>
              ) : (
                <span style={badge(false)}>Reviewed</span>
              )}
              <span style={badge(false)}>Trust record</span>
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {onboardingProofBadges(onboardingTrustNotice.detail).map((label) => (
              <span key={label} style={badge(false)}>
                {label}
              </span>
            ))}
          </div>

          <div style={{ marginTop: 16, ...actionRow(isPhone) }}>
            <OriginLink to="/app/trust" style={actionBtn("primary")}>
              Review Trust
            </OriginLink>

            <OriginLink to="/app/dashboard" style={actionBtn("secondary")}>
              Return to Dashboard
            </OriginLink>

            {onboardingTrustNotice.unread && /^\d+$/.test(safeStr(onboardingTrustNotice.id)) ? (
              <button
                type="button"
                onClick={() => void markAsRead(safeStr(onboardingTrustNotice.id))}
                style={actionBtn("soft")}
              >
                Mark as read
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

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
            <div style={sectionLabel()}>Start here</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              This is the first item to check.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("focus")}
            style={collapseToggle()}
          >
            {collapsed.focus ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.focus ? (
          operationalFocus ? (
            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "minmax(0, 1.1fr) minmax(320px, 0.9fr)",
                gap: 16,
                alignItems: "start",
              }}
            >
              <div style={innerCard("#FCFEFF")}>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={badge(true)}>Needs your attention</span>
                  {operationalFocus.unread ? (
                    <span style={badge(false)}>Unread</span>
                  ) : (
                    <span style={badge(false)}>Reviewed</span>
                  )}
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
                  {operationalFocus.title}
                </div>

                <div
                  style={{
                    marginTop: 12,
                    ...helperText(),
                  }}
                >
                  {operationalFocus.detail}
                </div>

                <div style={{ marginTop: 16, ...actionRow(isPhone) }}>
                  <button
                    type="button"
                    onClick={() => void handlePrimaryNoticeAction(operationalFocus)}
                    style={actionBtn("primary")}
                  >
                    {settings.openActionsDirectly ? operationalFocus.ctaLabel : "Review first"}
                  </button>

                  <OriginLink to={operationalFocus.ctaTo} style={actionBtn("secondary")}>
                    Open page
                  </OriginLink>
                </div>
              </div>

              <div style={softCard("#F8FBFF")}>
                <div style={sectionLabel()}>What to do</div>

                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  <div style={helperText()}>
                    Open the first item if it needs your answer. Use Mark as read when you have already handled it.
                  </div>

                  <div style={helperText()}>
                    If you only came to check messages, use Dashboard or Menu to return when you are done.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 12, color: "#64748B", lineHeight: 1.8 }}>
              Nothing needs your attention first right now.
            </div>
          )
        ) : null}
      </section>

      {selectedNotice ? (
        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Review this item</div>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    color: "#0B1F33",
                    fontSize: isCompact ? 22 : 26,
                    fontWeight: 900,
                    lineHeight: 1.2,
                  }}
                >
                  {selectedNotice.title}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={badge(true)}>{bucketTitle(selectedNotice.bucket)}</span>
                  {selectedNotice.unread ? (
                    <span style={badge(false)}>Unread</span>
                  ) : (
                    <span style={badge(false)}>Reviewed</span>
                  )}
                </div>
              </div>

              <div
                style={{
                  marginTop: 12,
                  ...helperText(),
                  color: "#0B1F33",
                }}
              >
                {selectedNotice.detail}
              </div>

              <div style={{ marginTop: 16, ...actionRow(isPhone) }}>
                <OriginLink to={selectedNotice.ctaTo} style={actionBtn("primary")}>
                  {selectedNotice.ctaLabel}
                </OriginLink>

                {selectedNotice.unread && /^\d+$/.test(safeStr(selectedNotice.id)) ? (
                  <button
                    type="button"
                    onClick={() => void markAsRead(safeStr(selectedNotice.id))}
                    style={actionBtn("secondary")}
                  >
                    Mark as read
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => setSelectedNotice(null)}
                  style={actionBtn("soft")}
                >
                  Close review
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

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
            <div style={sectionLabel()}>All waiting items</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Handle the most important group first.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("buckets")}
            style={collapseToggle()}
          >
            {collapsed.buckets ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.buckets ? (
          guidanceLoading ? (
            <div style={{ marginTop: 14, color: "#64748B", lineHeight: 1.8 }}>
              Loading your waiting items...
            </div>
          ) : (
            <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
              {BUCKET_ORDER.map((bucket) => {
                const rows = bucketRows[bucket];
                const tone = bucketTone(bucket);

                return (
                  <div
                    key={bucket}
                    style={{
                      ...innerCard(tone.bg),
                      border: tone.border,
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
                            color: tone.text,
                            fontSize: 18,
                            fontWeight: 900,
                            lineHeight: 1.25,
                          }}
                        >
                          {bucketTitle(bucket)}
                        </div>

                        <div style={{ marginTop: 8, ...helperText() }}>
                          {bucketDescription(bucket)}
                        </div>
                      </div>

                      <span style={badge(bucket === "actNow")}>{rows.length}</span>
                    </div>

                    <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                      {rows.length === 0 ? (
                        <div style={innerCard("#FFFFFF")}>
                          <div style={helperText()}>
                            Nothing is waiting here right now.
                          </div>
                        </div>
                      ) : (
                        rows.map((notice) => (
                          <div key={`${bucket}-${notice.id}`} style={innerCard("#FFFFFF")}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 10,
                                flexWrap: "wrap",
                                alignItems: "center",
                              }}
                            >
                              <div
                                style={{
                                  color: "#0B1F33",
                                  fontWeight: 900,
                                  lineHeight: 1.35,
                                }}
                              >
                                {notice.title}
                              </div>

                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {notice.unread ? (
                                  <span style={badge(true)}>Unread</span>
                                ) : (
                                  <span style={badge(false)}>Reviewed</span>
                                )}
                              </div>
                            </div>

                            <div style={{ marginTop: 8, ...helperText() }}>
                              {settings.notificationsMode === "detailed"
                                ? notice.detail
                                : truncateText(notice.detail, 150)}
                            </div>

                            <div style={{ marginTop: 12, ...actionRow(isPhone) }}>
                              <button
                                type="button"
                                onClick={() => void handlePrimaryNoticeAction(notice)}
                                style={actionBtn("primary")}
                              >
                                {settings.openActionsDirectly ? notice.ctaLabel : "Review first"}
                              </button>

                              <OriginLink to={notice.ctaTo} style={actionBtn("secondary")}>
                                Open page
                              </OriginLink>

                              {notice.unread && /^\d+$/.test(safeStr(notice.id)) ? (
                                <button
                                  type="button"
                                  onClick={() => void markAsRead(safeStr(notice.id))}
                                  style={actionBtn("soft")}
                                >
                                  Mark as read
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : null}
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: isCompact
            ? "1fr"
            : "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
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
              <div style={sectionLabel()}>Recent notifications</div>
              <div
                style={{
                  marginTop: 8,
                  ...helperText(),
                }}
              >
                See the latest messages in time order.
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggleSection("rawFeed")}
              style={collapseToggle()}
            >
              {collapsed.rawFeed ? "Open" : "Collapse"}
            </button>
          </div>

          {!collapsed.rawFeed ? (
            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              {rawLoading ? (
                <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                  Loading recent notifications...
                </div>
              ) : rawFeed.length === 0 ? (
                <div style={innerCard("#FCFEFF")}>
                  <div style={helperText()}>
                    No recent notification is shown right now.
                  </div>
                </div>
              ) : (
                rawFeed.map((item) => (
                  <div key={`feed-${item.id}-${item.createdAt}`} style={innerCard("#FCFEFF")}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          color: "#0B1F33",
                          fontWeight: 900,
                          lineHeight: 1.35,
                        }}
                      >
                        {item.title}
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={badge(false)}>{item.kind}</span>
                        {item.unread ? (
                          <span style={badge(true)}>Unread</span>
                        ) : (
                          <span style={badge(false)}>Reviewed</span>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: 8, ...helperText() }}>
                      {settings.notificationsMode === "detailed"
                        ? item.detail
                        : truncateText(item.detail, 120)}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        color: "#64748B",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {safeDateTime(item.createdAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </section>

        <section style={pageCard("#F8FBFF")}>
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
              <div style={sectionLabel()}>What the labels mean</div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Use this if you are not sure where to start.
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggleSection("reading")}
              style={collapseToggle()}
            >
              {collapsed.reading ? "Open" : "Collapse"}
            </button>
          </div>

          {!collapsed.reading ? (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div style={softCard("#FFFFFF")}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontSize: 15,
                    fontWeight: 900,
                  }}
                >
                  Act now
                </div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  Open this first. Someone may be waiting for you.
                </div>
              </div>

              <div style={softCard("#FFFFFF")}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontSize: 15,
                    fontWeight: 900,
                  }}
                >
                  Due soon
                </div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  Not urgent yet, but better to handle soon.
                </div>
              </div>

              <div style={softCard("#FFFFFF")}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontSize: 15,
                    fontWeight: 900,
                  }}
                >
                  Watch and wait
                </div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  Keep an eye on it. You may not need to do anything now.
                </div>
              </div>

              <div style={softCard("#FFFFFF")}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontSize: 15,
                    fontWeight: 900,
                  }}
                >
                  General updates
                </div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  Useful information. It is not blocking you.
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </section>
    </div>
  );
}


