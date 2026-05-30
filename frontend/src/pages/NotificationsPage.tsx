import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { navigateWithOrigin } from "../lib/nav";
import PageTopNav from "../components/PageTopNav";
import {
  PrimaryButton,
  SecondaryButton,
  StableButton,
  StableCtaLink,
  SubtleButton,
} from "../components/StableButton";
import {
  getMyNotifications,
  getMySettings,
  getSelectedClanId,
  markNotificationRead,
} from "../lib/api";
import { APP_ROUTES } from "../lib/appRoutes";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import {
  buildGuidanceSnapshot,
  type GuidanceInboxBucketKey,
  type GuidanceNotice,
  type GuidanceSnapshot,
} from "../lib/guidance";
import type { ActionResponse } from "../lib/actionResponseProtocol";

type RawNotificationRow = {
  id: string;
  kind: string;
  kindLabel: string;
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
  "community-confirmations",
  "approved",
  "activate",
  "activate-membership",
  "existing",
  "founder",
  "public-create",
  "register",
];

const NOTIFICATION_TARGETS = {
  DASHBOARD: APP_ROUTES.DASHBOARD,
  COMMUNITY: APP_ROUTES.COMMUNITY,
  MARKETPLACE: APP_ROUTES.MARKETPLACE,
  FINANCE: APP_ROUTES.FINANCE,
  MONEY_IN: APP_ROUTES.MONEY_IN,
  MONEY_OUT: APP_ROUTES.MONEY_OUT,
  PAYMENT_RAILS: APP_ROUTES.PAYMENT_RAILS,
  PAYOUT_DETAILS: APP_ROUTES.PAYOUT_DETAILS,
  TRUST: APP_ROUTES.TRUST,
  TRUST_SLIP: APP_ROUTES.TRUST_SLIP,
  TRUST_SLIP_VERIFY: APP_ROUTES.MERCHANT_VERIFY,
  CCI: APP_ROUTES.CCI,
  NOTIFICATIONS: APP_ROUTES.NOTIFICATIONS,
  DEMAND_BOX: APP_ROUTES.DEMAND_BOX,
  LOANS: APP_ROUTES.LOANS,
  LOAN_READINESS: APP_ROUTES.LOAN_READINESS,
  LOAN_SUGGESTIONS: APP_ROUTES.LOAN_SUGGESTIONS,
  LOAN_WORKBENCH: APP_ROUTES.LOAN_WORKBENCH,
  COMMITMENT_BUILDER: `${APP_ROUTES.DASHBOARD}#focus-commitments`,
  GUIDE: APP_ROUTES.GUIDE,
  SETTINGS: APP_ROUTES.SETTINGS,
  BUILD_FIRST_CIRCLE: APP_ROUTES.BUILD_FIRST_CIRCLE,
  SHOP_ME: APP_ROUTES.SHOP_ME,
  COMMAND_CENTER: APP_ROUTES.ADMIN_COMMAND,
  GUARANTOR_EARNINGS: APP_ROUTES.GUARANTOR_EARNINGS,
  GUARANTOR_INBOX: APP_ROUTES.GUARANTOR_INBOX,
  TRUST_ANALYTICS: APP_ROUTES.TRUST_ANALYTICS,
  SYSTEM_OPERATIONS: APP_ROUTES.SYSTEM_OPERATIONS,
  EXPOSURE_ADMIN: APP_ROUTES.EXPOSURE_ADMIN,
  TRUST_GRAPH: APP_ROUTES.TRUST_GRAPH,
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
  "payment-rails": NOTIFICATION_TARGETS.PAYMENT_RAILS,
  "bank-accounts": NOTIFICATION_TARGETS.PAYMENT_RAILS,
  "bank-rails": NOTIFICATION_TARGETS.PAYMENT_RAILS,

  "money-out": NOTIFICATION_TARGETS.MONEY_OUT,
  withdrawal: NOTIFICATION_TARGETS.MONEY_OUT,
  "withdrawal-instructions": NOTIFICATION_TARGETS.MONEY_OUT,
  "payout-details": NOTIFICATION_TARGETS.PAYOUT_DETAILS,

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

  "shop-control": NOTIFICATION_TARGETS.SHOP_ME,
  "shop-manager": NOTIFICATION_TARGETS.SHOP_ME,
  spotlight: "/app/shop-control#shop-control-spotlight",
  "shop-spotlight": "/app/shop-control#shop-control-spotlight",
  "free-spotlight": "/app/shop-control#shop-control-spotlight",
  "shop-control/spotlight": "/app/shop-control#shop-control-spotlight",
  "shop-control/free-spotlight": "/app/shop-control#shop-control-spotlight",
  "paid-spotlight": "/app/shop-control/subscription-spotlight",
  "subscription-spotlight": "/app/shop-control/subscription-spotlight",
  "shop-control/paid-spotlight": "/app/shop-control/subscription-spotlight",

  "command-center": NOTIFICATION_TARGETS.COMMAND_CENTER,
  "trust-command-centre": NOTIFICATION_TARGETS.COMMAND_CENTER,
  "trust-analytics": NOTIFICATION_TARGETS.TRUST_ANALYTICS,
  "system-operations": NOTIFICATION_TARGETS.SYSTEM_OPERATIONS,
  "admin/exposure": NOTIFICATION_TARGETS.EXPOSURE_ADMIN,
  "admin/trust-graph": NOTIFICATION_TARGETS.TRUST_GRAPH,

  earnings: NOTIFICATION_TARGETS.GUARANTOR_EARNINGS,
  "guarantor-earnings": NOTIFICATION_TARGETS.GUARANTOR_EARNINGS,
  "guarantor-inbox": NOTIFICATION_TARGETS.GUARANTOR_INBOX,
};

const SAFE_STATIC_APP_PATHS = new Set([
  "dashboard",
  "community",
  "marketplace",
  "finance",
  "payment/pool",
  "payment-rails",
  "payout-details",
  "withdrawal-instructions",
  "trust",
  "trust-slip",
  "trust-slip/verify",
  "identity",
  "notifications",
  "demand-box",
  "loans",
  "loan-readiness",
  "loan-suggestions",
  "loan-workbench",
  "guarantor-earnings",
  "guarantor-inbox",
  "my-gmfn-and-i",
  "build-first-circle",
  "shop/me",
  "shop-control",
  "shop-control/subscription-spotlight",
  "shop-gallery-control",
  "vault-control",
  "shop-assets",
  "command-center",
  "command-center/bank-console",
  "command-center/revenue-allocation",
  "command-center/exposure",
  "command-center/trust-analytics",
  "command-center/trust-events",
  "command-center/identity-risk",
  "command-center/incomplete-loans",
  "command-center/system-operations",
  "command-center/trust-graph",
]);

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
    borderRadius: 24,
    border: "1px solid rgba(17,42,68,0.10)",
    background: bg,
    padding: 18,
    boxShadow:
      "0 16px 36px rgba(11,31,51,0.10), inset 0 1px 0 rgba(255,255,255,0.94)",
    overflow: "hidden",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(17,42,68,0.10)",
    background: bg,
    padding: 14,
    boxShadow:
      "0 10px 24px rgba(11,31,51,0.07), inset 0 1px 0 rgba(255,255,255,0.90)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(17,42,68,0.10)",
    background: bg,
    padding: 14,
    boxShadow:
      "0 10px 22px rgba(11,31,51,0.06), inset 0 1px 0 rgba(255,255,255,0.92)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#50647C",
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
      ? "1px solid rgba(245,158,11,0.22)"
      : "1px solid rgba(17,42,68,0.10)",
    background: primary ? "#FFF7E0" : "#EFF6FF",
    color: primary ? "#8A5A00" : "#0B63D1",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
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
    border: "1px solid rgba(255,255,255,0.16)",
    background:
      "linear-gradient(180deg, rgba(18,54,86,0.96) 0%, rgba(12,38,65,0.94) 100%)",
    color: "#F8FBFF",
    fontWeight: 900,
    fontSize: 13,
    letterSpacing: 0.15,
    textAlign: "center",
    cursor: "pointer",
    whiteSpace: "normal",
    boxShadow:
      "0 10px 22px rgba(2,12,27,0.14), inset 0 1px 0 rgba(255,255,255,0.10)",
  };
}

function statTile(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(17,42,68,0.10)",
    background:
      "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)",
    padding: 14,
    boxShadow:
      "0 10px 24px rgba(11,31,51,0.07), inset 0 1px 0 rgba(255,255,255,0.90)",
  };
}

function compactPanelTitle(): React.CSSProperties {
  return {
    color: "#07172C",
    fontSize: 18,
    fontWeight: 950,
    lineHeight: 1.2,
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#465A72",
    fontSize: 14,
    lineHeight: 1.55,
  };
}

function actionNoticeCard(tone: ActionResponse["tone"]): React.CSSProperties {
  const isSuccess = tone === "success";
  const isError = tone === "error";

  return {
    ...softCard(isSuccess ? "#ECFDF5" : isError ? "#FEF2F2" : "#EFF6FF"),
    color: isSuccess ? "#065F46" : isError ? "#991B1B" : "#1E3A8A",
    border: isSuccess
      ? "1px solid rgba(16,185,129,0.30)"
      : isError
        ? "1px solid rgba(239,68,68,0.28)"
        : "1px solid rgba(59,130,246,0.24)",
    fontWeight: 900,
    lineHeight: 1.55,
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

function normalizeAppTargetPath(path: string, suffix: string): string {
  const appPath = safeStr(path).replace(/^app\/?/i, "");
  const lowerAppPath = appPath.toLowerCase();

  if (!lowerAppPath) return NOTIFICATION_TARGETS.DASHBOARD;

  const aliased = EXACT_TARGET_ALIASES[lowerAppPath];
  if (aliased) {
    return mergeAliasTarget(aliased, suffix);
  }

  if (SAFE_STATIC_APP_PATHS.has(lowerAppPath) || isSafeRelativeAppPath(lowerAppPath)) {
    return `/app/${appPath}${suffix}`;
  }

  return NOTIFICATION_TARGETS.NOTIFICATIONS;
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
    const { path, suffix } = splitPathSuffix(raw.replace(/^\/+/, ""));
    const normalizedPath = safeStr(path).replace(/^\/+/, "");
    const lowerPath = normalizedPath.toLowerCase();

    if (!lowerPath) return NOTIFICATION_TARGETS.NOTIFICATIONS;

    if (lowerPath === "app" || lowerPath.startsWith("app/")) {
      return normalizeAppTargetPath(normalizedPath, suffix);
    }

    const aliased = EXACT_TARGET_ALIASES[lowerPath];
    if (aliased) {
      return mergeAliasTarget(aliased, suffix);
    }

    if (matchesRoutePrefix(lowerPath, PUBLIC_ROUTE_PREFIXES)) {
      return `/${normalizedPath}${suffix}`;
    }

    return NOTIFICATION_TARGETS.NOTIFICATIONS;
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
    return normalizeAppTargetPath(normalizedPath, suffix);
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
  if (explicit && explicit !== NOTIFICATION_TARGETS.NOTIFICATIONS) {
    const explicitText = rawNotificationText(raw);
    if (
      explicit === NOTIFICATION_TARGETS.LOANS &&
      containsAny(explicitText, [
        "pool deposit",
        "deposit confirmed",
        "deposit was confirmed",
      ])
    ) {
      return NOTIFICATION_TARGETS.FINANCE;
    }
    return explicit;
  }

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

function normalizeNotificationCtaLabel(
  ctaTo: string,
  rawLabel: any,
  fallback: string
): string {
  const direct = safeStr(rawLabel);
  const normalizedTarget = normalizeActionTargetPath(ctaTo);
  const targetPath = splitPathSuffix(normalizedTarget).path;
  const genericLabel =
    !direct ||
    /^(open|continue|review|view|open finances|view finances|open support|view support|deposit|deposit to pool|open deposit|make deposit|open payment)$/i.test(
      direct
    );

  if (normalizedTarget === NOTIFICATION_TARGETS.COMMITMENT_BUILDER) {
    return "Open Focus Commitments";
  }

  if (targetPath === NOTIFICATION_TARGETS.LOANS && (genericLabel || /finance/i.test(direct))) {
    return "Open Loans & Support";
  }

  if (targetPath === NOTIFICATION_TARGETS.FINANCE && (genericLabel || /finance/i.test(direct))) {
    return "Open Finance File";
  }

  if (targetPath === NOTIFICATION_TARGETS.MONEY_IN && genericLabel) {
    return "Open Money In";
  }

  if (targetPath === NOTIFICATION_TARGETS.MONEY_OUT && genericLabel) {
    return "Open Money Out";
  }

  if (targetPath === NOTIFICATION_TARGETS.DEMAND_BOX && genericLabel) {
    return "Open Demand Box";
  }

  if (/^\/app\/community\/[^/]+\/join-requests$/.test(targetPath) && genericLabel) {
    return "Review Join Request";
  }

  if (targetPath === "/activate-membership" && genericLabel) {
    return "Activate Membership";
  }

  if (/^\/join-approval\/[^/]+$/.test(targetPath) && genericLabel) {
    return "View Decision";
  }

  if (normalizedTarget === NOTIFICATION_TARGETS.GUIDE) {
    if (
      !direct ||
      /^(open|continue|review first)$/i.test(direct) ||
      /my gmfn and i/i.test(direct)
    ) {
      return "Open My GSN and I";
    }
  }

  return direct || fallback;
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

function rawNotificationText(raw: any): string {
  return [
    safeStr(raw?.kind),
    safeStr(raw?.title),
    safeStr(raw?.message),
    safeStr(raw?.detail),
    safeStr(raw?.description),
    safeStr(raw?.action_label),
    safeStr(raw?.action_url),
  ]
    .join(" ")
    .toLowerCase();
}

function isJoinReviewNotification(raw: any): boolean {
  const kind = safeStr(raw?.kind).toLowerCase();
  const text = rawNotificationText(raw);

  return (
    kind === "approval_request" ||
    kind === "approval_rejected" ||
    kind === "approval_approved" ||
    text.includes("join request") ||
    text.includes("wants to join") ||
    text.includes("community review") ||
    text.includes("/join-approval/") ||
    text.includes("/join-requests")
  );
}

function isJoinReviewRequestNotification(raw: any): boolean {
  const kind = safeStr(raw?.kind).toLowerCase();
  const text = rawNotificationText(raw);
  return (
    kind === "approval_request" ||
    text.includes("pending join request") ||
    text.includes("new join request") ||
    text.includes("wants to join")
  );
}

function isJoinReviewRejectedNotification(raw: any): boolean {
  const kind = safeStr(raw?.kind).toLowerCase();
  const text = rawNotificationText(raw);
  return (
    kind === "approval_rejected" ||
    text.includes("not approved") ||
    text.includes("view decision")
  );
}

function joinReviewKindLabel(raw: any): string {
  if (isJoinReviewRequestNotification(raw)) return "Join review";
  if (isJoinReviewRejectedNotification(raw)) return "Join decision";
  return "Join update";
}

function normalizeRawNotificationRow(raw: any): RawNotificationRow {
  if (isJoinReviewNotification(raw)) {
    const isReview = isJoinReviewRequestNotification(raw);
    const isRejected = isJoinReviewRejectedNotification(raw);
    const ctaTo = resolveNoticeTarget(raw);

    return {
      id: firstTruthy(raw?.id, raw?.notification_id, raw?.title, raw?.message),
      kind: firstTruthy(raw?.kind, raw?.title, "approval_request"),
      kindLabel: joinReviewKindLabel(raw),
      title: firstTruthy(
        raw?.title,
        isReview
          ? "Someone is waiting to join"
          : isRejected
          ? "Join request was not approved"
          : "Join request update"
      ),
      detail: firstTruthy(
        raw?.message,
        raw?.detail,
        isReview
          ? "Someone is waiting for community review. Open the review page and decide whether to approve or reject the request."
          : isRejected
          ? "This request was not approved. Open the decision page to review the outcome."
          : "Open the join review lane to continue with the correct next step."
      ),
      ctaLabel: normalizeNotificationCtaLabel(
        ctaTo,
        raw?.action_label,
        isReview ? "Open join review" : "Open decision"
      ),
      ctaTo,
      unread: !raw?.is_read,
      createdAt: firstTruthy(raw?.created_at),
    };
  }

  const ctaTo = resolveNoticeTarget(raw);

  return {
    id: firstTruthy(raw?.id, raw?.notification_id, raw?.title, raw?.message),
    kind: firstTruthy(raw?.kind, raw?.title, "update"),
    kindLabel: firstTruthy(raw?.kind, raw?.title, "Update"),
    title: firstTruthy(raw?.title, raw?.kind, "Update"),
    detail: firstTruthy(
      raw?.message,
      raw?.detail,
      "Review this update and continue from the right page."
    ),
    ctaLabel: normalizeNotificationCtaLabel(ctaTo, raw?.action_label, "Open"),
    ctaTo,
    unread: !raw?.is_read,
    createdAt: firstTruthy(raw?.created_at),
  };
}

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
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

function normalizeGuidanceNotice(item: GuidanceNotice): GuidanceNotice {
  return {
    ...item,
    ctaTo: normalizeActionTargetPath(item.ctaTo),
  };
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
  return `${text.slice(0, limit).trim()}...`;
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

function routeTarget(intent: CtaIntent, communityId: number, debugId: string): string {
  return resolveCtaTarget(intent, { communityId, debugId }).to as string;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedClanId = Number(getSelectedClanId() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "notifications.route.dashboard"),
      trust: routeTarget("trust", selectedClanId, "notifications.route.trust"),
    }),
    [selectedClanId]
  );

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
  const [selectedBucket, setSelectedBucket] =
    useState<GuidanceInboxBucketKey | null>(null);
  const [actionNotice, setActionNotice] = useState<ActionResponse | null>(null);

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
    if (!actionNotice) return;

    const timer = window.setTimeout(() => setActionNotice(null), 2800);
    return () => window.clearTimeout(timer);
  }, [actionNotice]);

  useEffect(() => {
    let alive = true;
    let intervalId: number | null = null;

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

    function handleVisibilityRefresh() {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }

      void loadAll();
    }

    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleVisibilityRefresh);
      intervalId = window.setInterval(() => {
        void loadAll();
      }, 15000);
    }

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityRefresh);
    }

    return () => {
      alive = false;

      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleVisibilityRefresh);
        if (intervalId !== null) {
          window.clearInterval(intervalId);
        }
      }

      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityRefresh);
      }
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
        ctaLabel: safeStr(onboardingTrustNotice.ctaLabel) || "Open Trust Passport",
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
    if (!/^\d+$/.test(id)) {
      setActionNotice({
        tone: "info",
        text: "This notice is already local guidance. There is no server record to mark as read.",
      });
      return;
    }

    const out = await markNotificationRead(Number(id)).catch((err: any) => {
      setActionNotice({
        tone: "error",
        text:
          safeStr(err?.message) ||
          "GSN could not mark this notice as read. Check your connection and try again.",
      });
      return null;
    });

    if (!out) return;

    setGuidanceSnapshot((prev) => markGuidanceSnapshotReadLocally(prev, id));
    setRawNotifications((prev) =>
      prev.map((item) =>
        safeStr(item.id) === id ? { ...item, unread: false } : item
      )
    );
    setSelectedNotice((prev) =>
      prev && safeStr(prev.id) === id ? { ...prev, unread: false } : prev
    );
    setActionNotice({
      tone: "success",
      text: "Notice marked as read.",
    });
  }

  async function handlePrimaryNoticeAction(notice: GuidanceNotice) {
    const normalizedNotice = normalizeGuidanceNotice(notice);

    if (safeStr(normalizedNotice.id)) {
      void markAsRead(safeStr(normalizedNotice.id));
    }

    if (settings.openActionsDirectly) {
      setActionNotice({
        tone: "info",
        text: `Opening ${normalizedNotice.ctaLabel || "the next page"} now.`,
      });
      navigateWithOrigin(navigate, normalizedNotice.ctaTo, location);
      return;
    }

    setSelectedNotice(normalizedNotice);
    setActionNotice({
      tone: "info",
      text: "Notice opened here first. Review it, then choose the next action.",
    });
  }

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  const loadingInbox = guidanceLoading || rawLoading;
  const focusNotice =
    operationalFocus ||
    normalizeGuidanceNotice({
      id: "empty-focus",
      kind: "empty",
      title: "No urgent action is waiting",
      detail: "You can check due soon items or return to Dashboard.",
      ctaLabel: "Go to Dashboard",
      ctaTo: routes.dashboard,
      bucket: "watchAndWait" as GuidanceInboxBucketKey,
      unread: false,
    });
  const selectedBucketRows = selectedBucket ? bucketRows[selectedBucket] : [];
  const bucketRowHeight = isPhone ? 124 : 86;

  function showUrgentItems() {
    setCollapsed((prev) => ({ ...prev, focus: false, buckets: false }));
    setSelectedBucket("actNow");
    if (bucketRows.actNow.length > 0) {
      setSelectedNotice(bucketRows.actNow[0]);
      setActionNotice({
        tone: "info",
        text: "First urgent item opened below.",
      });
      return;
    }
    setActionNotice({
      tone: "info",
      text: "No urgent item is waiting now. Check Due soon or return to Dashboard.",
    });
  }

  function openBucket(bucket: GuidanceInboxBucketKey) {
    setCollapsed((prev) => ({ ...prev, buckets: false }));
    setSelectedBucket(bucket);
    const first = bucketRows[bucket][0];
    if (!first) {
      setSelectedNotice(null);
      setActionNotice({
        tone: "info",
        text: `${bucketTitle(bucket)} has no waiting item right now.`,
      });
      return;
    }
    setSelectedNotice(first);
    setActionNotice({
      tone: "info",
      text: `${bucketTitle(bucket)} opened. Use Open page when you are ready.`,
    });
  }

  return (
    <div
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: isPhone ? "0 2px 34px" : "0 10px 40px",
        display: "grid",
        gap: isPhone ? 12 : 16,
      }}
    >
      {!isPhone ? (
        <PageTopNav
          sectionLabel="Identity & Settings"
          title="Action Inbox"
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.dashboard}
        />
      ) : null}

      {actionNotice ? (
        <section style={actionNoticeCard(actionNotice.tone)}>
          {actionNotice.text}
        </section>
      ) : null}

      {!isPhone ? (
      <section
        style={{
          ...pageCard("linear-gradient(135deg, #061827 0%, #082B4A 64%, #0B3862 100%)"),
          minHeight: isPhone ? 168 : 190,
          padding: isPhone ? 18 : 32,
          borderRadius: 24,
          color: "#F8FBFF",
          position: "relative",
          boxShadow:
            "0 22px 50px rgba(7,31,53,0.24), inset 0 1px 0 rgba(255,255,255,0.12)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isPhone ? "64px minmax(0, 1fr)" : "96px minmax(0, 1fr) 230px",
            gap: isPhone ? 14 : 22,
            alignItems: "center",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: isPhone ? 64 : 92,
              height: isPhone ? 64 : 92,
              borderRadius: 20,
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(180deg, #0B63D1 0%, #064AAD 100%)",
              boxShadow: "0 18px 34px rgba(4,58,138,0.34)",
              fontSize: isPhone ? 34 : 44,
            }}
          >
            In
          </div>

          <div>
            <div
              style={{
                color: "#FFFFFF",
                fontSize: isPhone ? 30 : 42,
                fontWeight: 950,
                lineHeight: 1.03,
              }}
            >
              Action Inbox
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#D7E3F1",
                fontSize: isPhone ? 15 : 19,
                fontWeight: 750,
                lineHeight: 1.45,
                maxWidth: 430,
              }}
            >
              Check what is waiting for you, then open the right page to answer it.
            </div>
            <div style={{ marginTop: 20, maxWidth: 260 }}>
              <StableCtaLink
                to={routes.dashboard}
                kind="secondary"
                stableHeight={52}
                debugId="notifications.hero.dashboard"
              >
                Go to Dashboard
              </StableCtaLink>
            </div>
          </div>

          {!isPhone ? (
            <div
              aria-hidden="true"
              style={{
                justifySelf: "end",
                width: 190,
                height: 150,
                borderRadius: 30,
                opacity: 0.18,
                border: "10px solid #B8D7F7",
                transform: "rotate(-2deg)",
              }}
            />
          ) : null}
        </div>
      </section>
      ) : null}

      <section style={pageCard("#FFFFFF")}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "52px minmax(0, 1fr)",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              background: "#F0F7FF",
              color: "#0B63D1",
              fontSize: 28,
            }}
          >
            I
          </div>
          <div>
            <div style={sectionLabel()}>Inbox summary</div>
            <div
              style={{
                marginTop: 2,
                color: "#07172C",
                fontSize: isPhone ? 20 : 24,
                fontWeight: 950,
                lineHeight: 1.15,
              }}
            >
              What needs your attention
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isPhone
              ? "1fr 1fr"
              : isCompact
              ? "repeat(4, minmax(0, 1fr))"
              : "repeat(4, minmax(0, 1fr))",
            gap: isPhone ? 10 : 16,
          }}
        >
          <div style={statTile()}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span aria-hidden="true" style={{ color: "#0B63D1", fontSize: 24 }}>
                In
              </span>
              <div style={sectionLabel()}>Unread</div>
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#0B63D1",
                fontWeight: 950,
                fontSize: isPhone ? 32 : 42,
                lineHeight: 1,
                textAlign: "center",
              }}
            >
              {unreadCount}
            </div>
            <div style={{ ...helperText(), textAlign: "center", marginTop: 6 }}>
              New items
            </div>
          </div>

          <div style={statTile()}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span aria-hidden="true" style={{ color: "#DC2626", fontSize: 24 }}>
                !
              </span>
              <div style={sectionLabel()}>Act now</div>
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#DC2626",
                fontWeight: 950,
                fontSize: isPhone ? 32 : 42,
                lineHeight: 1,
                textAlign: "center",
              }}
            >
              {bucketRows.actNow.length}
            </div>
            <div style={{ ...helperText(), textAlign: "center", marginTop: 6 }}>
              Waiting now
            </div>
          </div>

          <div style={statTile()}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span aria-hidden="true" style={{ color: "#F59E0B", fontSize: 24 }}>
                T
              </span>
              <div style={sectionLabel()}>Due soon</div>
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#F97316",
                fontWeight: 950,
                fontSize: isPhone ? 32 : 42,
                lineHeight: 1,
                textAlign: "center",
              }}
            >
              {bucketRows.dueSoon.length}
            </div>
            <div style={{ ...helperText(), textAlign: "center", marginTop: 6 }}>
              Due soon
            </div>
          </div>

          <div style={statTile()}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span aria-hidden="true" style={{ color: "#0B63D1", fontSize: 24 }}>
                O
              </span>
              <div style={sectionLabel()}>Watch</div>
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#0B63D1",
                fontWeight: 950,
                fontSize: isPhone ? 32 : 42,
                lineHeight: 1,
                textAlign: "center",
              }}
            >
              {bucketRows.watchAndWait.length}
            </div>
            <div style={{ ...helperText(), textAlign: "center", marginTop: 6 }}>
              Keep an eye
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <PrimaryButton
            onClick={showUrgentItems}
            fullWidth
            stableHeight={56}
            debugId="notifications.show-urgent"
          >
            Show urgent items (Act now)
          </PrimaryButton>
        </div>

        {isPhone ? (
          <div style={{ marginTop: 10 }}>
            <StableCtaLink
              to={routes.dashboard}
              stableHeight={52}
              debugId="notifications.hero.dashboard"
            >
              Go to Dashboard
            </StableCtaLink>
          </div>
        ) : null}
      </section>

      <section style={pageCard("linear-gradient(180deg, #061827 0%, #082B4A 100%)")}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "56px minmax(0, 1fr)",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                background: "rgba(219,234,254,0.12)",
                color: "#F8FBFF",
                fontSize: 28,
              }}
            >
              ▶
            </div>
            <div>
              <div style={{ ...sectionLabel(), color: "#AFC4DA" }}>Start here</div>
              <div
                style={{
                  color: "#F8FBFF",
                  fontSize: isPhone ? 23 : 28,
                  fontWeight: 950,
                  lineHeight: 1.15,
                }}
              >
                First item to check
              </div>
            </div>
          </div>
          <SubtleButton
            onClick={() => toggleSection("focus")}
            style={collapseToggle()}
            stableHeight={48}
            debugId="notifications.toggle-focus"
          >
            {collapsed.focus ? "Open ^" : "Collapse ^"}
          </SubtleButton>
        </div>

        {!collapsed.focus ? (
          <div style={{ marginTop: 18, ...innerCard("#FFFFFF") }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isPhone ? "1fr" : "minmax(0, 1fr) 290px",
                gap: 14,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "72px minmax(0, 1fr)",
                  gap: 14,
                  alignItems: "center",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 18,
                    display: "grid",
                    placeItems: "center",
                    background: "#FFF7E0",
                    color: "#F59E0B",
                    fontSize: 34,
                  }}
                >
                  !
                </div>
                <div>
                  <div
                    style={{
                      color: "#07172C",
                      fontSize: isPhone ? 17 : 20,
                      fontWeight: 950,
                      lineHeight: 1.2,
                    }}
                  >
                    {focusNotice.title}
                    {focusNotice.unread ? (
                      <span style={{ marginLeft: 8, ...badge(true) }}>
                        Needs your attention
                      </span>
                    ) : null}
                  </div>
                  <div style={{ marginTop: 8, ...helperText() }}>
                    {truncateText(focusNotice.detail, isPhone ? 112 : 150)}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <PrimaryButton
                  onClick={() => void handlePrimaryNoticeAction(focusNotice)}
                  stableHeight={54}
                  debugId="notifications.focus.primary"
                >
                  {focusNotice.ctaLabel}
                </PrimaryButton>

                <StableCtaLink
                  to={focusNotice.ctaTo}
                  stableHeight={50}
                  debugId="notifications.focus.open-page"
                >
                  Open page
                </StableCtaLink>

                {focusNotice.unread && /^\d+$/.test(safeStr(focusNotice.id)) ? (
                  <SecondaryButton
                    onClick={() => void markAsRead(safeStr(focusNotice.id))}
                    stableHeight={50}
                    debugId="notifications.focus.mark-read"
                  >
                    Mark as read
                  </SecondaryButton>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section style={pageCard("linear-gradient(180deg, #061827 0%, #082B4A 100%)")}>
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
              display: "grid",
              gridTemplateColumns: "56px minmax(0, 1fr)",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                background: "rgba(219,234,254,0.12)",
                color: "#F8FBFF",
                fontSize: 28,
              }}
            >
              =
            </div>
            <div>
              <div style={{ ...sectionLabel(), color: "#AFC4DA" }}>
                All waiting items
              </div>
              <div
                style={{
                  color: "#F8FBFF",
                  fontSize: isPhone ? 23 : 28,
                  fontWeight: 950,
                  lineHeight: 1.15,
                }}
              >
                Handle in order
              </div>
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("buckets")}
            style={collapseToggle()}
            stableHeight={48}
            debugId="notifications.toggle-buckets"
          >
            {collapsed.buckets ? "Open ^" : "Collapse ^"}
          </SubtleButton>
        </div>

        {!collapsed.buckets ? (
          loadingInbox ? (
            <div style={{ marginTop: 14, color: "#D7E3F1", lineHeight: 1.8 }}>
              Loading your waiting items...
            </div>
          ) : (
            <div
              style={{
                marginTop: 18,
                overflow: "hidden",
                borderRadius: 18,
                background: "#FFFFFF",
                border: "1px solid rgba(17,42,68,0.10)",
              }}
            >
              {BUCKET_ORDER.map((bucket, index) => {
                const rows = bucketRows[bucket];
                const tone = bucketTone(bucket);
                const isLast = index === BUCKET_ORDER.length - 1;
                const icon =
                  bucket === "actNow"
                    ? "!"
                    : bucket === "dueSoon"
                    ? "T"
                    : bucket === "watchAndWait"
                    ? "O"
                    : "U";

                return (
                  <StableButton
                    key={bucket}
                    type="button"
                    onClick={() => openBucket(bucket)}
                    fullWidth
                    stableHeight={bucketRowHeight}
                    debugId={`notifications.bucket.${bucket}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: isPhone
                        ? "46px minmax(0, 1fr) 46px 18px"
                        : "56px minmax(0, 1fr) 54px 24px",
                      gap: isPhone ? 10 : 12,
                      alignItems: "center",
                      justifyContent: "stretch",
                      minHeight: bucketRowHeight,
                      height: bucketRowHeight,
                      maxHeight: bucketRowHeight,
                      background: "#FFFFFF",
                      border: "none",
                      borderBottom: isLast ? "none" : "1px solid rgba(17,42,68,0.08)",
                      borderRadius: 0,
                      boxShadow: "none",
                      color: "#07172C",
                      padding: isPhone ? "12px 10px" : "10px 14px",
                      textAlign: "left",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: isPhone ? 40 : 44,
                        height: isPhone ? 40 : 44,
                        borderRadius: 14,
                        display: "grid",
                        placeItems: "center",
                        background: tone.bg,
                        color: tone.text,
                        fontSize: isPhone ? 19 : 23,
                        fontWeight: 950,
                      }}
                    >
                      {icon}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: "block",
                          color: "#07172C",
                          fontSize: isPhone ? 14.5 : 20,
                          fontWeight: 950,
                          lineHeight: 1.16,
                        }}
                      >
                        {bucketTitle(bucket)}
                      </span>
                      <span
                        style={{
                          marginTop: 5,
                          color: "#465A72",
                          fontSize: isPhone ? 12.5 : 15,
                          fontWeight: 700,
                          lineHeight: isPhone ? 1.22 : 1.25,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: isPhone ? 4 : 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {bucketDescription(bucket)}
                      </span>
                    </span>
                    <span
                      style={{
                        justifySelf: "center",
                        minWidth: isPhone ? 40 : 44,
                        minHeight: isPhone ? 40 : 44,
                        borderRadius: 999,
                        display: "grid",
                        placeItems: "center",
                        background: tone.bg,
                        color: tone.text,
                        fontWeight: 950,
                        fontSize: isPhone ? 18 : 19,
                      }}
                    >
                      {rows.length}
                    </span>
                    <span
                      aria-hidden="true"
                      style={{ color: "#07172C", fontSize: 26, fontWeight: 950 }}
                    >
                      {">"}
                    </span>
                  </StableButton>
                );
              })}
            </div>
          )
        ) : null}
      </section>

      {selectedNotice ? (
        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Selected item</div>
          <div style={{ marginTop: 8, color: "#07172C", fontSize: 22, fontWeight: 950 }}>
            {selectedNotice.title}
          </div>
          <div style={{ marginTop: 8, ...helperText() }}>
            {selectedNotice.detail}
          </div>
          <div style={{ marginTop: 14, ...actionRow(isPhone) }}>
            <StableCtaLink
              to={selectedNotice.ctaTo}
              kind="primary"
              stableHeight={52}
              debugId="notifications.selected.open"
            >
              {selectedNotice.ctaLabel || "Open page"}
            </StableCtaLink>
            {selectedNotice.unread && /^\d+$/.test(safeStr(selectedNotice.id)) ? (
              <SecondaryButton
                onClick={() => void markAsRead(safeStr(selectedNotice.id))}
                stableHeight={52}
                debugId="notifications.selected.mark-read"
              >
                Mark as read
              </SecondaryButton>
            ) : null}
            <SubtleButton
              onClick={() => setSelectedNotice(null)}
              stableHeight={52}
              debugId="notifications.selected.close"
            >
              Close
            </SubtleButton>
          </div>
        </section>
      ) : null}

      {selectedBucket ? (
        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Open items in {bucketTitle(selectedBucket)}</div>
          <div style={{ marginTop: 8, ...helperText() }}>
            Review each waiting item and choose the right next action.
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {selectedBucketRows.length === 0 ? (
              <div style={innerCard("#F8FBFF")}>
                <div style={helperText()}>
                  Nothing is waiting in this group right now.
                </div>
              </div>
            ) : (
              selectedBucketRows.map((notice) => (
                <div
                  key={`${selectedBucket}-${notice.id}`}
                  style={innerCard("#F8FBFF")}
                >
                  <div style={compactPanelTitle()}>{notice.title}</div>
                  <div style={{ marginTop: 8, ...helperText() }}>
                    {settings.notificationsMode === "detailed"
                      ? notice.detail
                      : truncateText(notice.detail, isPhone ? 130 : 170)}
                  </div>

                  <div style={{ marginTop: 12, ...actionRow(isPhone) }}>
                    <PrimaryButton
                      onClick={() => void handlePrimaryNoticeAction(notice)}
                      stableHeight={52}
                      debugId={`notifications.notice.${notice.id}.primary`}
                    >
                      {settings.openActionsDirectly ? notice.ctaLabel : "Review first"}
                    </PrimaryButton>

                    <StableCtaLink
                      to={notice.ctaTo}
                      stableHeight={52}
                      debugId={`notifications.notice.${notice.id}.open-page`}
                    >
                      Open page
                    </StableCtaLink>

                    {notice.unread && /^\d+$/.test(safeStr(notice.id)) ? (
                      <SubtleButton
                        onClick={() => void markAsRead(safeStr(notice.id))}
                        stableHeight={52}
                        debugId={`notifications.notice.${notice.id}.mark-read`}
                      >
                        Mark as read
                      </SubtleButton>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

      <section
        style={{
          ...softCard("#EAF3FF"),
          display: "grid",
          gridTemplateColumns: isPhone
            ? "52px minmax(0, 1fr)"
            : "52px minmax(0, 1fr) 92px",
          gap: 14,
          alignItems: "center",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            display: "grid",
            placeItems: "center",
            background: "#DBEAFE",
            color: "#0B63D1",
            fontSize: 28,
          }}
        >
          D
        </div>
        <div>
          <div
            style={{
              color: "#12304C",
              fontSize: isPhone ? 17 : 20,
              fontWeight: 950,
              lineHeight: 1.15,
            }}
          >
            Stay consistent. Build trust.
          </div>
          <div style={{ marginTop: 4, ...helperText() }}>
            Every action here helps your identity and community grow stronger.
          </div>
        </div>
        <div
          aria-hidden="true"
          style={{
            display: isPhone ? "none" : undefined,
            justifySelf: "end",
            color: "rgba(11,99,209,0.12)",
            fontSize: 72,
            lineHeight: 1,
          }}
        >
          Box
        </div>
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
            <div style={sectionLabel()}>Recent notifications</div>
            <div style={{ marginTop: 6, ...helperText() }}>
              Latest messages remain available without crowding the first screen.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("rawFeed")}
            style={collapseToggle()}
            stableHeight={48}
            debugId="notifications.toggle-raw-feed"
          >
            {collapsed.rawFeed ? "Open" : "Collapse"}
          </SubtleButton>
        </div>

        {!collapsed.rawFeed ? (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {rawLoading ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                Loading recent notifications...
              </div>
            ) : rawFeed.length === 0 ? (
              <div style={innerCard("#F8FBFF")}>
                <div style={helperText()}>
                  No recent notification is shown right now.
                </div>
              </div>
            ) : (
              rawFeed.map((item) => (
                <div
                  key={`feed-${item.id}-${item.createdAt}`}
                  style={innerCard("#F8FBFF")}
                >
                  <div style={compactPanelTitle()}>{item.title}</div>
                  <div style={{ marginTop: 8, ...helperText() }}>
                    {settings.notificationsMode === "detailed"
                      ? item.detail
                      : truncateText(item.detail, isPhone ? 120 : 150)}
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={badge(false)}>{item.kindLabel || item.kind}</span>
                    {item.unread ? (
                      <span style={badge(true)}>Unread</span>
                    ) : (
                      <span style={badge(false)}>Reviewed</span>
                    )}
                    <span style={badge(false)}>{safeDateTime(item.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
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
            <div style={sectionLabel()}>What the labels mean</div>
            <div style={{ marginTop: 6, ...helperText() }}>
              Use this when you are not sure where to start.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("reading")}
            style={collapseToggle()}
            stableHeight={48}
            debugId="notifications.toggle-reading"
          >
            {collapsed.reading ? "Open" : "Collapse"}
          </SubtleButton>
        </div>

        {!collapsed.reading ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isPhone ? "1fr" : "repeat(2, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {BUCKET_ORDER.map((bucket) => {
              const tone = bucketTone(bucket);
              return (
                <div key={`meaning-${bucket}`} style={innerCard(tone.bg)}>
                  <div
                    style={{
                      color: tone.text,
                      fontSize: 16,
                      fontWeight: 950,
                      lineHeight: 1.2,
                    }}
                  >
                    {bucketTitle(bucket)}
                  </div>
                  <div style={{ marginTop: 8, ...helperText() }}>
                    {bucketDescription(bucket)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>
    </div>
  );
}
