import { APP_ROUTES } from "./appRoutes";

export const ACTION_TARGETS = {
  DASHBOARD: APP_ROUTES.DASHBOARD,
  COMMUNITY: APP_ROUTES.COMMUNITY,
  MARKETPLACE: APP_ROUTES.MARKETPLACE,
  FINANCE: APP_ROUTES.FINANCE,
  MONEY_IN: APP_ROUTES.MONEY_IN,
  MONEY_OUT: APP_ROUTES.MONEY_OUT,
  PAYMENT_RAILS: APP_ROUTES.PAYMENT_RAILS,
  PAYOUT_DETAILS: APP_ROUTES.PAYOUT_DETAILS,
  TRUST: APP_ROUTES.TRUST,
  TRUST_TIMELINE: APP_ROUTES.TRUST_TIMELINE,
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
  SHOP_ASSETS: APP_ROUTES.SHOP_ASSETS,
  VAULT_CONTROL: APP_ROUTES.VAULT_CONTROL,
  FREE_SPOTLIGHT: APP_ROUTES.FREE_SPOTLIGHT,
  SUBSCRIPTION_SPOTLIGHT: APP_ROUTES.SUBSCRIPTION_SPOTLIGHT,
  COMMAND_CENTER: APP_ROUTES.ADMIN_COMMAND,
  GUARANTOR_EARNINGS: APP_ROUTES.GUARANTOR_EARNINGS,
  GUARANTOR_INBOX: APP_ROUTES.GUARANTOR_INBOX,
  TRUST_ANALYTICS: APP_ROUTES.TRUST_ANALYTICS,
  SYSTEM_OPERATIONS: APP_ROUTES.SYSTEM_OPERATIONS,
  EXPOSURE_ADMIN: APP_ROUTES.EXPOSURE_ADMIN,
  TRUST_GRAPH: APP_ROUTES.TRUST_GRAPH,
} as const;

export const PUBLIC_ROUTE_PREFIXES = [
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
] as const;

export const EXACT_TARGET_ALIASES: Record<string, string> = {
  dashboard: ACTION_TARGETS.DASHBOARD,
  home: ACTION_TARGETS.DASHBOARD,
  "main-dashboard": ACTION_TARGETS.DASHBOARD,
  "member-home": ACTION_TARGETS.DASHBOARD,

  notifications: ACTION_TARGETS.NOTIFICATIONS,
  "action-inbox": ACTION_TARGETS.NOTIFICATIONS,
  inbox: ACTION_TARGETS.NOTIFICATIONS,

  finance: ACTION_TARGETS.FINANCE,
  finances: ACTION_TARGETS.FINANCE,
  financials: ACTION_TARGETS.FINANCE,
  "open-finance": ACTION_TARGETS.FINANCE,
  "finance-overview": ACTION_TARGETS.FINANCE,
  "finance-meter": ACTION_TARGETS.FINANCE,

  "money-in": ACTION_TARGETS.MONEY_IN,
  "payment/pool": ACTION_TARGETS.MONEY_IN,
  "payment-rails": ACTION_TARGETS.PAYMENT_RAILS,
  "bank-accounts": ACTION_TARGETS.PAYMENT_RAILS,
  "bank-rails": ACTION_TARGETS.PAYMENT_RAILS,

  "money-out": ACTION_TARGETS.MONEY_OUT,
  withdrawal: ACTION_TARGETS.MONEY_OUT,
  "withdrawal-instructions": ACTION_TARGETS.MONEY_OUT,
  "payout-details": ACTION_TARGETS.PAYOUT_DETAILS,

  marketplace: ACTION_TARGETS.MARKETPLACE,
  market: ACTION_TARGETS.MARKETPLACE,
  "open-marketplace": ACTION_TARGETS.MARKETPLACE,

  community: ACTION_TARGETS.COMMUNITY,
  "community-home": ACTION_TARGETS.COMMUNITY,
  "community-tools": ACTION_TARGETS.COMMUNITY,
  "community-tool": ACTION_TARGETS.COMMUNITY,
  "control-room": ACTION_TARGETS.COMMUNITY,
  "command-room": ACTION_TARGETS.COMMUNITY,
  "open-community": ACTION_TARGETS.COMMUNITY,
  "open-community-home": ACTION_TARGETS.COMMUNITY,

  trust: ACTION_TARGETS.TRUST,
  "trust-passport": ACTION_TARGETS.TRUST,
  "open-trust": ACTION_TARGETS.TRUST,
  "trust-timeline": ACTION_TARGETS.TRUST_TIMELINE,

  "trust-slip": ACTION_TARGETS.TRUST_SLIP,
  trustslip: ACTION_TARGETS.TRUST_SLIP,
  "open-trust-slip": ACTION_TARGETS.TRUST_SLIP,
  "merchant-verify": ACTION_TARGETS.TRUST_SLIP,
  "verify-merchant": ACTION_TARGETS.TRUST_SLIP,
  "trust-slip/verify": ACTION_TARGETS.TRUST_SLIP_VERIFY,

  identity: ACTION_TARGETS.CCI,
  "identity-integrity": ACTION_TARGETS.CCI,
  cci: ACTION_TARGETS.CCI,

  "demand-box": ACTION_TARGETS.DEMAND_BOX,
  demands: ACTION_TARGETS.DEMAND_BOX,
  "open-demand": ACTION_TARGETS.DEMAND_BOX,

  loans: ACTION_TARGETS.LOANS,
  money: ACTION_TARGETS.LOANS,
  support: ACTION_TARGETS.LOANS,
  "support-path": ACTION_TARGETS.LOANS,
  "loan-support": ACTION_TARGETS.LOANS,
  "loans-support": ACTION_TARGETS.LOANS,

  "loan-readiness": ACTION_TARGETS.LOAN_READINESS,
  readiness: ACTION_TARGETS.LOAN_READINESS,

  "loan-suggestions": ACTION_TARGETS.LOAN_SUGGESTIONS,
  suggestions: ACTION_TARGETS.LOAN_SUGGESTIONS,

  "loan-workbench": ACTION_TARGETS.LOAN_WORKBENCH,
  workbench: ACTION_TARGETS.LOAN_WORKBENCH,

  "commitment-builder": ACTION_TARGETS.COMMITMENT_BUILDER,
  commitment: ACTION_TARGETS.COMMITMENT_BUILDER,
  commitments: ACTION_TARGETS.COMMITMENT_BUILDER,
  "focus-commitments": ACTION_TARGETS.COMMITMENT_BUILDER,

  "my-gmfn-and-i": ACTION_TARGETS.GUIDE,
  guide: ACTION_TARGETS.GUIDE,
  "member-guide": ACTION_TARGETS.GUIDE,
  settings: ACTION_TARGETS.SETTINGS,
  "workspace-settings": ACTION_TARGETS.SETTINGS,
  "my-gmfn-and-i/settings": ACTION_TARGETS.SETTINGS,

  "build-first-circle": ACTION_TARGETS.BUILD_FIRST_CIRCLE,
  "first-circle": ACTION_TARGETS.BUILD_FIRST_CIRCLE,
  "grow-your-circle": ACTION_TARGETS.BUILD_FIRST_CIRCLE,
  circle: ACTION_TARGETS.BUILD_FIRST_CIRCLE,
  "circle-builder": ACTION_TARGETS.BUILD_FIRST_CIRCLE,

  shop: ACTION_TARGETS.SHOP_ME,
  "my-shop": ACTION_TARGETS.SHOP_ME,
  "shop-gallery": ACTION_TARGETS.SHOP_ME,
  "open-shop": ACTION_TARGETS.SHOP_ME,

  "shop-control": ACTION_TARGETS.SHOP_ME,
  "shop-manager": ACTION_TARGETS.SHOP_ME,
  spotlight: ACTION_TARGETS.FREE_SPOTLIGHT,
  "shop-spotlight": ACTION_TARGETS.FREE_SPOTLIGHT,
  "free-spotlight": ACTION_TARGETS.FREE_SPOTLIGHT,
  "shop-control/spotlight": ACTION_TARGETS.FREE_SPOTLIGHT,
  "shop-control/free-spotlight": ACTION_TARGETS.FREE_SPOTLIGHT,
  "paid-spotlight": ACTION_TARGETS.SUBSCRIPTION_SPOTLIGHT,
  "subscription-spotlight": ACTION_TARGETS.SUBSCRIPTION_SPOTLIGHT,
  "shop-control/paid-spotlight": ACTION_TARGETS.SUBSCRIPTION_SPOTLIGHT,

  "command-center": ACTION_TARGETS.COMMAND_CENTER,
  "trust-command-centre": ACTION_TARGETS.COMMAND_CENTER,
  "trust-analytics": ACTION_TARGETS.TRUST_ANALYTICS,
  "system-operations": ACTION_TARGETS.SYSTEM_OPERATIONS,
  "admin/exposure": ACTION_TARGETS.EXPOSURE_ADMIN,
  "admin/trust-graph": ACTION_TARGETS.TRUST_GRAPH,

  earnings: ACTION_TARGETS.GUARANTOR_EARNINGS,
  "guarantor-earnings": ACTION_TARGETS.GUARANTOR_EARNINGS,
  "guarantor-inbox": ACTION_TARGETS.GUARANTOR_INBOX,
};

export const CTA_INTENT_ROUTES = {
  dashboard: "DASHBOARD",
  communityHome: "COMMUNITY",
  communityDetail: "COMMUNITY_DETAIL",
  communityJoinRequests: "COMMUNITY_JOIN_REQUESTS",
  clans: "CLANS",
  marketplace: "MARKETPLACE",
  shop: "SHOP",
  shopAssets: "SHOP_ASSETS",
  vaultControl: "VAULT_CONTROL",
  freeSpotlight: "FREE_SPOTLIGHT",
  subscriptionSpotlight: "SUBSCRIPTION_SPOTLIGHT",
  moneyIn: "MONEY_IN",
  moneyOut: "MONEY_OUT",
  payoutDetails: "PAYOUT_DETAILS",
  paymentRails: "PAYMENT_RAILS",
  finance: "FINANCE",
  demandBox: "DEMAND_BOX",
  trust: "TRUST",
  trustTimeline: "TRUST_TIMELINE",
  openTrust: "OPEN_TRUST",
  cci: "CCI",
  cciReading: "CCI_READING",
  trustSlip: "TRUST_SLIP",
  merchantVerify: "MERCHANT_VERIFY",
  loans: "LOANS",
  loanReadiness: "LOAN_READINESS",
  loanSuggestions: "LOAN_SUGGESTIONS",
  loanWorkbench: "LOAN_WORKBENCH",
  loanSummary: "LOAN_SUMMARY",
  repayment: "REPAYMENT",
  guarantorInbox: "GUARANTOR_INBOX",
  communityConfirmationInbox: "COMMUNITY_CONFIRMATION_INBOX",
  guarantorEarnings: "GUARANTOR_EARNINGS",
  notifications: "NOTIFICATIONS",
  buildFirstCircle: "BUILD_FIRST_CIRCLE",
  settings: "SETTINGS",
  profile: "PROFILE",
  adminCommand: "ADMIN_COMMAND",
  systemOperations: "SYSTEM_OPERATIONS",
  bankConsole: "BANK_CONSOLE",
  incompleteLoans: "INCOMPLETE_LOANS",
  identityRisk: "IDENTITY_RISK",
  trustAnalytics: "TRUST_ANALYTICS",
  trustEvents: "TRUST_EVENTS",
  trustGraph: "TRUST_GRAPH",
  exposureAdmin: "EXPOSURE_ADMIN",
  revenueAllocation: "REVENUE_ALLOCATION",
  joinPending: "JOIN_PENDING",
  login: "LOGIN",
  welcome: "WELCOME",
} as const satisfies Record<string, keyof typeof APP_ROUTES>;

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
  "trust-timeline",
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

function cleanTarget(value: unknown): string {
  return String(value ?? "").trim();
}

export function splitActionTargetSuffix(raw: string): { path: string; suffix: string } {
  const match = raw.match(/^([^?#]*)(.*)$/);
  return {
    path: cleanTarget(match?.[1] || ""),
    suffix: String(match?.[2] || ""),
  };
}

function matchesRoutePrefix(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some(
    (prefix) =>
      path === prefix ||
      path.startsWith(`${prefix}/`) ||
      path.startsWith(`${prefix}?`) ||
      path.startsWith(`${prefix}#`)
  );
}

function normalizePublicRouteTarget(raw: string): string {
  try {
    const parsed = new URL(raw);
    const normalizedPath = cleanTarget(parsed.pathname).replace(/^\/+/, "");
    const lowerPath = normalizedPath.toLowerCase();

    if (matchesRoutePrefix(lowerPath, PUBLIC_ROUTE_PREFIXES)) {
      return `/${normalizedPath}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return "";
  }

  return "";
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
  const appPath = cleanTarget(path).replace(/^app\/?/i, "");
  const lowerAppPath = appPath.toLowerCase();

  if (!lowerAppPath) return ACTION_TARGETS.DASHBOARD;

  const aliased = EXACT_TARGET_ALIASES[lowerAppPath];
  if (aliased) {
    return mergeAliasTarget(aliased, suffix);
  }

  if (SAFE_STATIC_APP_PATHS.has(lowerAppPath) || isSafeRelativeAppPath(lowerAppPath)) {
    return `/app/${appPath}${suffix}`;
  }

  return ACTION_TARGETS.NOTIFICATIONS;
}

export function normalizeActionTargetPath(value: unknown): string {
  const raw = cleanTarget(value);
  if (!raw) return ACTION_TARGETS.NOTIFICATIONS;

  if (/^(https?:|mailto:|tel:)/i.test(raw)) {
    const publicRouteTarget = normalizePublicRouteTarget(raw);
    if (publicRouteTarget) return publicRouteTarget;
    return raw;
  }

  if (raw.startsWith("#")) {
    return raw;
  }

  if (raw.startsWith("/")) {
    const { path, suffix } = splitActionTargetSuffix(raw.replace(/^\/+/, ""));
    const normalizedPath = cleanTarget(path).replace(/^\/+/, "");
    const lowerPath = normalizedPath.toLowerCase();

    if (!lowerPath) return ACTION_TARGETS.NOTIFICATIONS;

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

    return ACTION_TARGETS.NOTIFICATIONS;
  }

  if (raw.startsWith("?")) {
    return `${ACTION_TARGETS.NOTIFICATIONS}${raw}`;
  }

  const { path, suffix } = splitActionTargetSuffix(raw);
  const normalizedPath = cleanTarget(path).replace(/^\/+/, "");
  const lowerPath = normalizedPath.toLowerCase();

  if (!lowerPath) return ACTION_TARGETS.NOTIFICATIONS;

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

  return ACTION_TARGETS.NOTIFICATIONS;
}
