type RouteLoader = () => Promise<unknown>;

const preloadedRoutes = new Set<string>();

const ROUTE_LOADERS: Array<{
  match: (pathname: string) => boolean;
  key: string;
  load: RouteLoader;
}> = [
  {
    key: "dashboard",
    match: (pathname) => pathname === "/app/dashboard",
    load: () => import("../pages/DashboardPage"),
  },
  {
    key: "community-join-requests",
    match: (pathname) =>
      /^\/app\/community\/[^/]+\/join-requests$/.test(pathname),
    load: () => import("../pages/CommunityJoinRequestsPage"),
  },
  {
    key: "community-home",
    match: (pathname) =>
      pathname === "/app/community" || pathname.startsWith("/app/community/"),
    load: () => import("../pages/CommunityHomePage"),
  },
  {
    key: "community-domain",
    match: (pathname) => pathname.startsWith("/app/community-domain"),
    load: () => import("../pages/CommunityDomainDashboardPage"),
  },
  {
    key: "marketplace",
    match: (pathname) => pathname === "/app/marketplace",
    load: () => import("../pages/MarketplacePage"),
  },
  {
    key: "shop-gallery",
    match: (pathname) =>
      pathname === "/app/shop" || pathname.startsWith("/shop/"),
    load: () => import("../pages/ShopGalleryPage"),
  },
  {
    key: "shop-control",
    match: (pathname) => pathname === "/app/shop-control",
    load: () => import("../pages/ShopControlPage"),
  },
  {
    key: "shop-assets",
    match: (pathname) => pathname === "/app/shop-assets",
    load: () => import("../pages/ShopAssetsPage"),
  },
  {
    key: "subscription-spotlight",
    match: (pathname) => pathname === "/app/shop-control/subscription-spotlight",
    load: () => import("../pages/SubscriptionSpotlightPage"),
  },
  {
    key: "vault-control",
    match: (pathname) => pathname === "/app/vault-control",
    load: () => import("../pages/VaultControlPage"),
  },
  {
    key: "build-first-circle",
    match: (pathname) => pathname === "/app/build-first-circle",
    load: () => import("../pages/BuildFirstCirclePage"),
  },
  {
    key: "trust-passport",
    match: (pathname) => pathname === "/app/trust",
    load: () => import("../pages/TrustScorePage"),
  },
  {
    key: "open-trust-reading",
    match: (pathname) => pathname === "/app/open-trust-reading",
    load: () => import("../pages/OpenTrustPage"),
  },
  {
    key: "trust-timeline",
    match: (pathname) => pathname === "/app/trust-timeline",
    load: () => import("../pages/TrustTimelinePage"),
  },
  {
    key: "trust-slip",
    match: (pathname) => pathname === "/app/trust-slip",
    load: () => import("../pages/TrustSlipPage"),
  },
  {
    key: "trust-slip-verify",
    match: (pathname) =>
      pathname === "/app/trust-slip/verify" ||
      pathname === "/verify/trust-slip" ||
      pathname.startsWith("/t/"),
    load: () => import("../pages/TrustSlipVerifyPage"),
  },
  {
    key: "cci-reading",
    match: (pathname) => pathname === "/app/cci-reading",
    load: () => import("../pages/CCIReadingPage"),
  },
  {
    key: "finance",
    match: (pathname) => pathname === "/app/finance",
    load: () => import("../pages/FinancePage"),
  },
  {
    key: "payment-instructions",
    match: (pathname) => pathname === "/app/payment/pool",
    load: () => import("../pages/PaymentInstructionsPage"),
  },
  {
    key: "repayment",
    match: (pathname) => /^\/app\/payment\/loans\/[^/]+$/.test(pathname),
    load: () => import("../pages/RepaymentPage"),
  },
  {
    key: "withdrawal-instructions",
    match: (pathname) => pathname === "/app/withdrawal-instructions",
    load: () => import("../pages/WithdrawalInstructionsPage"),
  },
  {
    key: "payment-rails",
    match: (pathname) => pathname === "/app/payment-rails",
    load: () => import("../pages/PaymentRailsPage"),
  },
  {
    key: "payout-details",
    match: (pathname) => pathname === "/app/payout-details",
    load: () => import("../pages/PayoutDetailsPage"),
  },
  {
    key: "loans",
    match: (pathname) => pathname === "/app/loans",
    load: () => import("../pages/LoansPage"),
  },
  {
    key: "loan-readiness",
    match: (pathname) => pathname === "/app/loan-readiness",
    load: () => import("../pages/LoanReadinessPage"),
  },
  {
    key: "loan-suggestions",
    match: (pathname) => pathname === "/app/loan-suggestions",
    load: () => import("../pages/LoanSuggestionsPage"),
  },
  {
    key: "loan-workbench",
    match: (pathname) => pathname === "/app/loan-workbench",
    load: () => import("../pages/LoanWorkbenchPage"),
  },
  {
    key: "guarantor-inbox",
    match: (pathname) => pathname === "/app/guarantor-inbox",
    load: () => import("../pages/GuarantorInboxPage"),
  },
  {
    key: "guarantor-earnings",
    match: (pathname) => pathname === "/app/guarantor-earnings",
    load: () => import("../pages/GuarantorEarningsPage"),
  },
  {
    key: "community-confirmation-inbox",
    match: (pathname) =>
      pathname === "/app/community-confirmations" ||
      pathname === "/app/community-confirmation-inbox",
    load: () => import("../pages/CommunityConfirmationInboxPage"),
  },
  {
    key: "community-confirmation-policy",
    match: (pathname) =>
      pathname === "/app/community-confirmations/policy" ||
      pathname === "/app/community-confirmation-policy",
    load: () => import("../pages/CommunityConfirmationPolicyPage"),
  },
  {
    key: "demand-box",
    match: (pathname) => pathname === "/app/demand-box",
    load: () => import("../pages/DemandBoxPage"),
  },
  {
    key: "identity-home",
    match: (pathname) => pathname === "/app/my-gmfn-and-i",
    load: () => import("../pages/MyGMFNAndIPage"),
  },
  {
    key: "identity-integrity",
    match: (pathname) => pathname === "/app/identity",
    load: () => import("../pages/IdentityIntegrityPage"),
  },
  {
    key: "notifications",
    match: (pathname) => pathname === "/app/notifications",
    load: () => import("../pages/NotificationsPage"),
  },
  {
    key: "admin-command",
    match: (pathname) => pathname === "/app/command-center",
    load: () => import("../pages/TrustCommandCentrePage"),
  },
  {
    key: "bank-console",
    match: (pathname) => pathname === "/app/command-center/bank-console",
    load: () => import("../pages/BankConsolePage"),
  },
  {
    key: "revenue-allocation",
    match: (pathname) => pathname === "/app/command-center/revenue-allocation",
    load: () => import("../pages/RevenueAllocationPage"),
  },
  {
    key: "exposure-admin",
    match: (pathname) => pathname === "/app/command-center/exposure",
    load: () => import("../pages/ExposureAdminPage"),
  },
  {
    key: "trust-analytics",
    match: (pathname) => pathname === "/app/command-center/trust-analytics",
    load: () => import("../pages/TrustAnalyticsPage"),
  },
  {
    key: "trust-events",
    match: (pathname) => pathname === "/app/command-center/trust-events",
    load: () => import("../pages/AdminTrustEventsPage"),
  },
  {
    key: "identity-risk",
    match: (pathname) => pathname === "/app/command-center/identity-risk",
    load: () => import("../pages/AdminIdentityRiskPage"),
  },
  {
    key: "incomplete-loans",
    match: (pathname) => pathname === "/app/command-center/incomplete-loans",
    load: () => import("../pages/AdminIncompleteLoansPage"),
  },
  {
    key: "system-operations",
    match: (pathname) => pathname === "/app/command-center/system-operations",
    load: () => import("../pages/SystemOperationsPage"),
  },
  {
    key: "trust-graph",
    match: (pathname) => pathname === "/app/command-center/trust-graph",
    load: () => import("../pages/AdminTrustGraphPage"),
  },
];

const PRIORITY_CORE_ROUTE_KEYS = [
  "community-home",
  "marketplace",
  "identity-home",
];

const STANDARD_CORE_ROUTE_KEYS = [
  "dashboard",
  "shop-gallery",
  "trust-slip",
  "finance",
  "loans",
];

const BRIDGE_ROUTE_KEYS = [
  "notifications",
  "payment-instructions",
  "withdrawal-instructions",
  "loan-readiness",
  "loan-suggestions",
  "loan-workbench",
  "guarantor-inbox",
  "community-confirmation-inbox",
  "shop-assets",
  "demand-box",
  "open-trust-reading",
  "trust-timeline",
  "cci-reading",
];

const SECONDARY_HEAVY_ROUTE_KEYS = [
  "trust-passport",
  "shop-control",
  "community-domain",
];

function routePathname(to: string): string {
  try {
    return new URL(to, "https://gsn.local").pathname;
  } catch {
    return String(to || "").split(/[?#]/)[0] || "/";
  }
}

function routeConnectionEffectiveType(): string {
  if (typeof navigator === "undefined") return "";
  const connection = (navigator as any).connection;
  return String(connection?.effectiveType || "").toLowerCase();
}

function shouldPreloadRouteChunks(): boolean {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as any).connection;
  if (connection?.saveData) return false;
  const effectiveType = routeConnectionEffectiveType();
  return effectiveType !== "slow-2g" && effectiveType !== "2g";
}

function shouldPreloadSecondaryHeavyRoutes(): boolean {
  if (!shouldPreloadRouteChunks()) return false;
  return routeConnectionEffectiveType() !== "3g";
}

function shouldPreloadBridgeRoutes(): boolean {
  return shouldPreloadSecondaryHeavyRoutes();
}

function scheduleSoon(task: () => void, delayMs: number): void {
  if (typeof window === "undefined") return;
  window.setTimeout(task, delayMs);
}

function scheduleIdle(task: () => void, delayMs: number): void {
  if (typeof window === "undefined") return;
  window.setTimeout(() => {
    const requestIdleCallback = (window as any).requestIdleCallback;
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(task, { timeout: 1800 });
      return;
    }
    task();
  }, delayMs);
}

function preloadRouteByKey(key: string): void {
  if (preloadedRoutes.has(key)) return;
  const loader = ROUTE_LOADERS.find((item) => item.key === key);
  if (!loader) return;
  preloadedRoutes.add(key);
  void loader.load().catch(() => {
    preloadedRoutes.delete(key);
  });
}

export function preloadRouteForPath(to: string): void {
  if (!shouldPreloadRouteChunks()) return;
  const pathname = routePathname(to);
  const match = ROUTE_LOADERS.find((item) => item.match(pathname));
  if (match) preloadRouteByKey(match.key);
}

export function preloadCoreAppRoutes(): void {
  if (!shouldPreloadRouteChunks()) return;
  PRIORITY_CORE_ROUTE_KEYS.forEach((key, index) => {
    scheduleSoon(() => preloadRouteByKey(key), 250 + index * 400);
  });

  STANDARD_CORE_ROUTE_KEYS.forEach((key, index) => {
    scheduleIdle(() => preloadRouteByKey(key), 1900 + index * 650);
  });

  if (!shouldPreloadBridgeRoutes()) return;
  BRIDGE_ROUTE_KEYS.forEach((key, index) => {
    scheduleIdle(() => preloadRouteByKey(key), 5000 + index * 520);
  });

  if (!shouldPreloadSecondaryHeavyRoutes()) return;
  SECONDARY_HEAVY_ROUTE_KEYS.forEach((key, index) => {
    scheduleIdle(() => preloadRouteByKey(key), 5600 + index * 950);
  });
}
