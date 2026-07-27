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
    key: "trust-passport",
    match: (pathname) => pathname === "/app/trust",
    load: () => import("../pages/TrustScorePage"),
  },
  {
    key: "trust-slip",
    match: (pathname) => pathname === "/app/trust-slip",
    load: () => import("../pages/TrustSlipPage"),
  },
  {
    key: "trust-slip-verify",
    match: (pathname) =>
      pathname === "/verify/trust-slip" || pathname.startsWith("/t/"),
    load: () => import("../pages/TrustSlipVerifyPage"),
  },
  {
    key: "finance",
    match: (pathname) => pathname === "/app/finance",
    load: () => import("../pages/FinancePage"),
  },
  {
    key: "loans",
    match: (pathname) => pathname === "/app/loans",
    load: () => import("../pages/LoansPage"),
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
];

const CORE_ROUTE_KEYS = [
  "dashboard",
  "community-home",
  "marketplace",
  "shop-gallery",
  "trust-slip",
  "finance",
  "loans",
  "identity-home",
];

function routePathname(to: string): string {
  try {
    return new URL(to, "https://gsn.local").pathname;
  } catch {
    return String(to || "").split(/[?#]/)[0] || "/";
  }
}

function shouldPreloadRouteChunks(): boolean {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as any).connection;
  if (connection?.saveData) return false;
  const effectiveType = String(connection?.effectiveType || "").toLowerCase();
  return effectiveType !== "slow-2g" && effectiveType !== "2g";
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
  CORE_ROUTE_KEYS.forEach((key, index) => {
    scheduleIdle(() => preloadRouteByKey(key), 450 + index * 550);
  });
}