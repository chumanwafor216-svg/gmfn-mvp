import { withCommunityQuery } from "./communityRouteContext";

export const APP_ROUTES = {
  DASHBOARD: "/app/dashboard",
  COMMUNITY: "/app/community",
  COMMUNITY_DETAIL: "/app/community",
  COMMUNITY_JOIN_REQUESTS: "/app/community",
  CLANS: "/app/clans",
  MARKETPLACE: "/app/marketplace",
  SHOP: "/app/shop-control",
  SHOP_ME: "/app/shop-control",
  SHOP_ASSETS: "/app/shop-assets",
  VAULT_CONTROL: "/app/vault-control",
  FREE_SPOTLIGHT: "/app/shop-control#shop-control-spotlight",
  SUBSCRIPTION_SPOTLIGHT: "/app/shop-control/subscription-spotlight",
  MONEY_IN: "/app/payment/pool",
  MONEY_OUT: "/app/withdrawal-instructions",
  PAYOUT_DETAILS: "/app/payout-details",
  PAYMENT_RAILS: "/app/payment-rails",
  FINANCE: "/app/finance",
  DEMAND_BOX: "/app/demand-box",
  TRUST: "/app/trust",
  OPEN_TRUST: "/app/open-trust-reading",
  CCI: "/app/identity",
  CCI_READING: "/app/cci-reading",
  TRUST_SLIP: "/app/trust-slip",
  MERCHANT_VERIFY: "/app/trust-slip/verify",
  LOANS: "/app/loans",
  LOAN_READINESS: "/app/loan-readiness",
  LOAN_SUGGESTIONS: "/app/loan-suggestions",
  LOAN_WORKBENCH: "/app/loan-workbench",
  LOAN_SUMMARY: "/app/loan-summary",
  REPAYMENT: "/app/payment/loans",
  GUARANTOR_INBOX: "/app/guarantor-inbox",
  GUARANTOR_EARNINGS: "/app/guarantor-earnings",
  NOTIFICATIONS: "/app/notifications",
  BUILD_FIRST_CIRCLE: "/app/build-first-circle",
  PROFILE: "/app/my-gmfn-and-i",
  SETTINGS: "/app/my-gmfn-and-i?tab=settings",
  GUIDE: "/app/my-gmfn-and-i",
  ADMIN_COMMAND: "/app/command-center",
  SYSTEM_OPERATIONS: "/app/command-center/system-operations",
  BANK_CONSOLE: "/app/command-center/bank-console",
  INCOMPLETE_LOANS: "/app/command-center/incomplete-loans",
  IDENTITY_RISK: "/app/command-center/identity-risk",
  TRUST_ANALYTICS: "/app/command-center/trust-analytics",
  TRUST_EVENTS: "/app/command-center/trust-events",
  TRUST_GRAPH: "/app/command-center/trust-graph",
  EXPOSURE_ADMIN: "/app/command-center/exposure",
  REVENUE_ALLOCATION: "/app/command-center/revenue-allocation",
  JOIN_PENDING: "/pending-approval",
  WELCOME: "/welcome",
  LOGIN: "/login",
} as const;

export type AppRouteKey = keyof typeof APP_ROUTES;

export type AppRouteContext = {
  communityId?: number | string | null;
  hash?: string | null;
  loanId?: number | string | null;
  requestId?: number | string | null;
};

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

export function appendHash(path: string, hash?: string | null): string {
  const safeHash = cleanText(hash).replace(/^#/, "");
  if (!safeHash) return path;
  if (path.includes("#")) return path;
  return `${path}#${safeHash}`;
}

export function routeWithCommunity(path: string, communityId?: number | string | null): string {
  const rawCommunityId = cleanText(communityId);
  if (!rawCommunityId) return path;
  const numericCommunityId = Number(rawCommunityId);
  if (!Number.isFinite(numericCommunityId) || numericCommunityId <= 0) return path;
  return withCommunityQuery(path, numericCommunityId);
}

export function appRoute(key: AppRouteKey, context: AppRouteContext = {}): string {
  let path: string = APP_ROUTES[key];

  if (key === "JOIN_PENDING" && cleanText(context.requestId)) {
    path = `${path}?request_id=${encodeURIComponent(cleanText(context.requestId))}`;
  }

  if (key === "COMMUNITY_DETAIL" && cleanText(context.communityId)) {
    path = `${path}/${encodeURIComponent(cleanText(context.communityId))}`;
  }

  if (key === "COMMUNITY_JOIN_REQUESTS" && cleanText(context.communityId)) {
    path = `${path}/${encodeURIComponent(cleanText(context.communityId))}/join-requests`;
  }

  if ((key === "LOAN_SUMMARY" || key === "REPAYMENT") && cleanText(context.loanId)) {
    path = `${path}/${encodeURIComponent(cleanText(context.loanId))}`;
  }

  if (
    [
      "COMMUNITY",
      "MARKETPLACE",
      "CLANS",
      "SHOP",
      "SHOP_ME",
      "SHOP_ASSETS",
      "VAULT_CONTROL",
      "FREE_SPOTLIGHT",
      "SUBSCRIPTION_SPOTLIGHT",
      "MONEY_IN",
      "MONEY_OUT",
      "PAYOUT_DETAILS",
      "PAYMENT_RAILS",
      "FINANCE",
      "DEMAND_BOX",
      "TRUST",
      "OPEN_TRUST",
      "CCI",
      "CCI_READING",
      "TRUST_SLIP",
      "MERCHANT_VERIFY",
      "LOANS",
      "LOAN_READINESS",
      "LOAN_SUGGESTIONS",
      "LOAN_WORKBENCH",
      "LOAN_SUMMARY",
      "REPAYMENT",
      "GUARANTOR_INBOX",
      "GUARANTOR_EARNINGS",
      "NOTIFICATIONS",
      "BUILD_FIRST_CIRCLE",
      "SYSTEM_OPERATIONS",
      "BANK_CONSOLE",
      "INCOMPLETE_LOANS",
      "IDENTITY_RISK",
      "TRUST_ANALYTICS",
      "TRUST_EVENTS",
      "TRUST_GRAPH",
      "EXPOSURE_ADMIN",
      "REVENUE_ALLOCATION",
    ].includes(key)
  ) {
    path = routeWithCommunity(path, context.communityId);
  }

  return appendHash(path, context.hash);
}
