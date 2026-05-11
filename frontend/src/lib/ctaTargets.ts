import type { Location, NavigateFunction, NavigateOptions, To } from "react-router-dom";
import { appRoute, type AppRouteContext } from "./appRoutes";
import type { APP_ROUTES } from "./appRoutes";
import { navigateWithOrigin } from "./nav";

export type CtaIntent =
  | "dashboard"
  | "communityHome"
  | "communityDetail"
  | "communityJoinRequests"
  | "clans"
  | "marketplace"
  | "shop"
  | "shopAssets"
  | "vaultControl"
  | "freeSpotlight"
  | "subscriptionSpotlight"
  | "moneyIn"
  | "moneyOut"
  | "payoutDetails"
  | "paymentRails"
  | "finance"
  | "demandBox"
  | "trust"
  | "openTrust"
  | "cci"
  | "cciReading"
  | "trustSlip"
  | "merchantVerify"
  | "loans"
  | "loanReadiness"
  | "loanSuggestions"
  | "loanWorkbench"
  | "loanSummary"
  | "repayment"
  | "guarantorInbox"
  | "guarantorEarnings"
  | "notifications"
  | "buildFirstCircle"
  | "settings"
  | "profile"
  | "adminCommand"
  | "systemOperations"
  | "bankConsole"
  | "incompleteLoans"
  | "identityRisk"
  | "trustAnalytics"
  | "trustEvents"
  | "trustGraph"
  | "exposureAdmin"
  | "revenueAllocation"
  | "joinPending"
  | "login"
  | "welcome";

export type CtaTargetContext = AppRouteContext & {
  enabled?: boolean;
  disabledReason?: string;
  fallbackTo?: To;
  explicitTo?: To;
  debugId?: string;
};

export type CtaTarget = {
  intent: CtaIntent;
  to: To;
  enabled: boolean;
  disabledReason?: string;
  debugId?: string;
};

const INTENT_ROUTE = {
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
} as const satisfies Record<CtaIntent, keyof typeof APP_ROUTES>;

export function resolveCtaTarget(
  intent: CtaIntent,
  context: CtaTargetContext = {}
): CtaTarget {
  const enabled = context.enabled !== false;
  const to =
    context.explicitTo ||
    (enabled
      ? appRoute(INTENT_ROUTE[intent], context)
      : context.fallbackTo || appRoute(INTENT_ROUTE[intent], context));

  return {
    intent,
    to,
    enabled,
    disabledReason: enabled ? undefined : context.disabledReason || "Not available yet",
    debugId: context.debugId,
  };
}

export function debugCtaResolution(target: CtaTarget, meta: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const devMode = window.localStorage?.getItem("gmfn_debug_cta") === "1";
  if (!devMode) return;
  console.debug("[GSN CTA]", {
    intent: target.intent,
    to: target.to,
    enabled: target.enabled,
    disabledReason: target.disabledReason,
    debugId: target.debugId,
    ...meta,
  });
}

export function navigateToCta(
  navigate: NavigateFunction,
  location: Pick<Location, "pathname" | "search" | "hash">,
  target: CtaTarget,
  options?: NavigateOptions
): boolean {
  debugCtaResolution(target, { origin: `${location.pathname}${location.search}${location.hash}` });
  if (!target.enabled) return false;
  navigateWithOrigin(navigate, target.to, location, options);
  return true;
}
