import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { getCurrentClan, getMe, getStoredGmfnId, logout } from "../lib/api";
import {
  getDashboardAppUsageEntryFromLocation,
  recordDashboardAppUsage,
} from "../lib/dashboardAppUsage";
import { StableButton, StableCtaLink } from "../components/StableButton";
import { GsnRealisticIcon, type Gsn3DIconKey } from "../components/GsnRealisticIcon";
import WorkspaceSettingsBridge from "../components/WorkspaceSettingsBridge";
import WorkspaceCompanionBridge from "../components/WorkspaceCompanionBridge";
import { currentPath, isSafeInternalPath } from "../lib/nav";
import { routeWithCommunity } from "../lib/appRoutes";
import { communityIdFromSearch } from "../lib/communityRouteContext";
import { publicShopPath } from "../lib/publicLinks";
import { gmfnBrand } from "../styles/gmfnBrand";

type NavLinkItem = {
  label: string;
  to: string;
  disabled?: boolean;
  match?: (pathname: string, search: string) => boolean;
};

type NavGroup = {
  key: string;
  label: string;
  hint?: string;
  items: NavLinkItem[];
};

type MobileDrawerGroup = {
  title: string;
  items: NavLinkItem[];
  variant?: "main" | "tools" | "quick";
};

type RouteMeta = {
  section: string;
  page: string;
};

type TaskModeMeta = {
  title: string;
  hint: string;
  actions: NavLinkItem[];
};

const COMMUNITY_CONTEXT_ROUTE_PREFIXES = [
  "/app/community",
  "/app/marketplace",
  "/app/finance",
  "/app/loans",
  "/app/payment",
  "/app/payment-rails",
  "/app/payout-details",
  "/app/shop-control",
  "/app/shop/me",
  "/app/trust",
  "/app/trust-slip",
  "/app/vault-control",
  "/app/demand-box",
];

function shouldCarryCommunityContext(to: string): boolean {
  const path = String(to || "").split(/[?#]/)[0];
  return COMMUNITY_CONTEXT_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

function contextualizeAppNavTarget(to: string, communityId: number): string {
  if (!communityId || !shouldCarryCommunityContext(to)) return to;
  return routeWithCommunity(to, communityId);
}

function readRole(): string {
  try {
    if (typeof window === "undefined") return "";
    return String(window.localStorage.getItem("gmfn_role") || "")
      .trim()
      .toLowerCase();
  } catch {
    return "";
  }
}

function writeRole(role: string): void {
  try {
    if (typeof window === "undefined") return;
    const next = String(role || "").trim().toLowerCase();

    if (!next) {
      window.localStorage.removeItem("gmfn_role");
      return;
    }

    window.localStorage.setItem("gmfn_role", next);
  } catch {
    // ignore storage write issues
  }
}

function pathOnly(to: string): string {
  return String(to || "").split("?")[0].split("#")[0] || "/";
}

function routeParts(to: string): { pathname: string; search: string } {
  const raw = String(to || "").trim();
  const hashless = raw.split("#")[0] || "/";
  const [pathnameRaw, searchRaw = ""] = hashless.split("?");
  return {
    pathname: pathnameRaw || "/",
    search: searchRaw ? `?${searchRaw}` : "",
  };
}

function originPathFromState(
  location: ReturnType<typeof useLocation>
): string {
  const current = currentPath(location);
  const raw =
    location.state && typeof location.state === "object"
      ? String(
          (location.state as any).originPath || (location.state as any).from || ""
        ).trim()
      : "";

  if (!raw || raw === current || !isSafeInternalPath(raw)) return "";
  return raw;
}

function isItemActive(
  item: NavLinkItem,
  pathname: string,
  search: string
): boolean {
  if (item.disabled) return false;

  if (item.match) {
    return item.match(pathname, search);
  }

  const base = pathOnly(item.to);
  return pathname === base || pathname.startsWith(`${base}/`);
}

function makeDashboardItem(): NavLinkItem {
  return {
    label: "Dashboard",
    to: "/app/dashboard",
    match: (pathname) => pathname === "/app/dashboard",
  };
}

function makeCommunityItem(): NavLinkItem {
  return {
    label: "Community Home",
    to: "/app/community",
    match: (pathname) =>
      pathname === "/app/community" || pathname.startsWith("/app/community/"),
  };
}

function makeMarketplaceItem(): NavLinkItem {
  return {
    label: "Marketplace",
    to: "/app/marketplace",
    match: (pathname) => pathname === "/app/marketplace",
  };
}

function makeFinanceItem(): NavLinkItem {
  return {
    label: "Finance",
    to: "/app/finance",
    match: (pathname) =>
      pathname === "/app/finance" ||
      pathname === "/app/payment/pool" ||
      pathname === "/app/payment-rails" ||
      pathname === "/app/payout-details" ||
      pathname === "/app/withdrawal-instructions" ||
      pathname.startsWith("/app/payment/loans/"),
  };
}

function makeLoansItem(label = "Loans & Support"): NavLinkItem {
  return {
    label,
    to: "/app/loans",
    match: (pathname) =>
      pathname === "/app/loans" ||
      pathname === "/app/loan-readiness" ||
      pathname === "/app/loan-suggestions" ||
      pathname === "/app/loan-workbench" ||
      pathname.startsWith("/app/loan-summary/") ||
      pathname === "/app/guarantor-earnings" ||
      pathname === "/app/guarantor-inbox" ||
      pathname.startsWith("/app/loans/"),
  };
}

function makeTrustPassportItem(): NavLinkItem {
  return {
    label: "Trust Passport",
    to: "/app/trust",
    match: (pathname) =>
      pathname === "/app/trust" ||
      pathname === "/app/open-trust-reading" ||
      pathname === "/app/trust-slip" ||
      pathname.startsWith("/app/trust-slip/"),
  };
}

function makeShopGalleryItem(
  myShopGalleryTo: string,
  disabled = false
): NavLinkItem {
  return {
    label: "Public Shop",
    to: myShopGalleryTo,
    disabled,
    match: (pathname) =>
      pathname.startsWith("/shop/") ||
      pathname === "/app/shop-assets" ||
      pathname.startsWith("/app/shop-gallery") ||
      pathname === "/app/shop/me",
  };
}

function makeShopControlItem(): NavLinkItem {
  return {
    label: "Shop Control",
    to: "/app/shop-control",
    match: (pathname) => pathname === "/app/shop-control",
  };
}

function makeSettingsItem(): NavLinkItem {
  return {
    label: "Settings",
    to: "/app/my-gmfn-and-i?tab=settings",
    match: (pathname, search) =>
      (pathname === "/app/my-gmfn-and-i" && search.includes("tab=settings")) ||
      pathname === "/app/settings",
  };
}

function makeGuideItem(): NavLinkItem {
  return {
    label: "My GSN and I",
    to: "/app/my-gmfn-and-i",
    match: (pathname, search) =>
      pathname === "/app/my-gmfn-and-i" && !search.includes("tab=settings"),
  };
}

function makeProfileItem(): NavLinkItem {
  return {
    label: "Profile",
    to: "/app/my-gmfn-and-i",
    match: (pathname) => pathname === "/app/my-gmfn-and-i",
  };
}

function makeAdminItem(): NavLinkItem {
  return {
    label: "Admin Tools",
    to: "/app/command-center",
    match: (pathname) =>
      pathname.startsWith("/app/command-center") ||
      pathname.startsWith("/app/trust-command-centre") ||
      pathname.startsWith("/app/trust-analytics") ||
      pathname.startsWith("/app/trust-events") ||
      pathname.startsWith("/app/system-operations") ||
      pathname.startsWith("/app/admin/exposure") ||
      pathname.startsWith("/app/admin/trust-graph"),
  };
}

function buildPrimaryItems(
  canUseAdminTools: boolean,
  myShopGalleryTo: string,
  myShopGalleryDisabled = false
): NavLinkItem[] {
  const items: NavLinkItem[] = [
    makeDashboardItem(),
    makeCommunityItem(),
    makeMarketplaceItem(),
    makeShopGalleryItem(myShopGalleryTo, myShopGalleryDisabled),
    makeShopControlItem(),
    makeFinanceItem(),
    makeLoansItem(),
    makeTrustPassportItem(),
  ];

  if (canUseAdminTools) {
    items.push(makeAdminItem());
  }

  return items;
}

function buildTrustPassportItems(): NavLinkItem[] {
  return [{ label: "TrustSlip", to: "/app/trust-slip" }];
}

function buildCommerceItems(): NavLinkItem[] {
  return [makeShopControlItem()];
}

function buildIdentityItems(): NavLinkItem[] {
  return [
    { label: "Identity Integrity", to: "/app/identity" },
    { label: "Notifications", to: "/app/notifications" },
    makeGuideItem(),
    makeSettingsItem(),
  ];
}

function buildFinanceToolsItems(): NavLinkItem[] {
  return [
    { label: "Money In", to: "/app/payment/pool" },
    { label: "Money Out", to: "/app/withdrawal-instructions" },
    { label: "Payment Rails", to: "/app/payment-rails" },
    { label: "Payout Details", to: "/app/payout-details" },
  ];
}

function buildLoansItems(): NavLinkItem[] {
  return [
    makeLoansItem(),
    { label: "Readiness", to: "/app/loan-readiness" },
    { label: "Suggestions", to: "/app/loan-suggestions" },
    { label: "Workbench", to: "/app/loan-workbench" },
    { label: "Guarantor Earnings", to: "/app/guarantor-earnings" },
  ];
}

function uniqueNavItems(items: NavLinkItem[]): NavLinkItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${pathOnly(item.to)}::${item.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getTaskModeMeta(pathname: string): TaskModeMeta | null {
  if (pathname === "/app/demand-box") {
    return {
      title: "Demand Box",
      hint:
        "Post or finish this need first. You can return to Marketplace when you are done.",
      actions: [
        makeCommunityItem(),
        makeMarketplaceItem(),
        makeDashboardItem(),
      ],
    };
  }

  if (pathname === "/app/build-first-circle") {
    return {
      title: "First Circle",
      hint:
        "Add trusted people first. You can return to Community Home when you are done.",
      actions: [
        makeCommunityItem(),
        { label: "Notifications", to: "/app/notifications" },
        makeDashboardItem(),
      ],
    };
  }

  if (pathname === "/app/shop-control") {
    return {
      title: "Shop Control",
      hint:
        "Finish this shop update first. You can return to Marketplace when you are done.",
      actions: [
        makeCommunityItem(),
        makeMarketplaceItem(),
        makeDashboardItem(),
      ],
    };
  }

  if (pathname === "/app/vault-control") {
    return {
      title: "Vault Control",
      hint:
        "Finish the private Vault setup first. You can return to Shop Control when you are done.",
      actions: [
        makeShopControlItem(),
        makeCommunityItem(),
        makeMarketplaceItem(),
        makeDashboardItem(),
      ],
    };
  }

  if (pathname === "/app/shop-control/subscription-spotlight") {
    return {
      title: "Subscription Spotlight",
      hint:
        "Finish the paid Spotlight payment or publish step first.",
      actions: [
        makeShopControlItem(),
        makeCommunityItem(),
        makeMarketplaceItem(),
        makeDashboardItem(),
      ],
    };
  }

  if (
    pathname === "/app/loans" ||
    pathname === "/app/loan-readiness" ||
    pathname === "/app/loan-suggestions" ||
    pathname === "/app/loan-workbench" ||
    pathname === "/app/guarantor-earnings" ||
    pathname === "/app/payment/pool" ||
    pathname === "/app/payment-rails" ||
    pathname === "/app/payout-details" ||
    pathname.startsWith("/app/payment/loans/") ||
    pathname === "/app/withdrawal-instructions"
  ) {
    return {
      title: "Loans & Support",
      hint:
        "Finish this money or support step first, or leave it intentionally before moving on.",
      actions: [
        makeMarketplaceItem(),
        makeCommunityItem(),
        makeDashboardItem(),
      ],
    };
  }

  if (
    pathname.startsWith("/app/community/") &&
    pathname.includes("/join-requests")
  ) {
    return {
      title: "Join Requests",
      hint:
        "Finish this community decision first. You can return to Community Home when you are done.",
      actions: [
        makeCommunityItem(),
        makeMarketplaceItem(),
        makeDashboardItem(),
      ],
    };
  }

  return null;
}

function shouldKeepBottomRailInTaskMode(pathname: string): boolean {
  return (
    pathname === "/app/loans" ||
    pathname === "/app/loan-readiness" ||
    pathname === "/app/loan-suggestions" ||
    pathname === "/app/loan-workbench" ||
    pathname.startsWith("/app/loan-summary/") ||
    pathname === "/app/guarantor-inbox" ||
    pathname === "/app/guarantor-earnings" ||
    pathname === "/app/revenue-allocation" ||
    pathname === "/app/borrower-preflight" ||
    pathname === "/app/loan-decision" ||
    pathname === "/app/payment/pool" ||
    pathname === "/app/payment-rails" ||
    pathname === "/app/payout-details" ||
    pathname.startsWith("/app/payment/loans/") ||
    pathname === "/app/withdrawal-instructions"
  );
}

function getSpecialRouteMeta(
  pathname: string,
  search: string,
  canUseAdminTools: boolean
): RouteMeta | null {
  if (pathname.startsWith("/app/shop/")) {
    return {
      section: "Main movement",
      page: "Shop",
    };
  }

  if (pathname === "/app/shop-control") {
    return {
      section: "Focused task",
      page: "Shop Control",
    };
  }

  if (pathname === "/app/shop-assets") {
    return {
      section: "Shop tools",
      page: "Shop Assets",
    };
  }

  if (pathname === "/app/vault-control") {
    return {
      section: "Focused task",
      page: "Vault Control",
    };
  }

  if (pathname === "/app/shop-control/subscription-spotlight") {
    return {
      section: "Focused task",
      page: "Subscription Spotlight",
    };
  }

  if (pathname === "/app/build-first-circle") {
    return {
      section: "Focused task",
      page: "First Circle",
    };
  }

  if (pathname === "/app/clans") {
    return {
      section: "Community",
      page: "Create Community",
    };
  }

  if (pathname === "/app/demand-box") {
    return {
      section: "Focused task",
      page: "Demand Box",
    };
  }

  if (pathname === "/app/notifications") {
    return {
      section: "Identity & settings",
      page: "Action Inbox",
    };
  }

  if (pathname === "/app/trust-slip" || pathname.startsWith("/app/trust-slip/")) {
    return {
      section: "Trust detail",
      page: pathname.startsWith("/app/trust-slip/verify")
        ? "TrustSlip verify"
        : "TrustSlip",
    };
  }

  if (pathname === "/app/my-gmfn-and-i" && search.includes("tab=settings")) {
    return {
      section: "Identity & settings",
      page: "Settings",
    };
  }

  if (pathname === "/app/my-gmfn-and-i") {
    return {
      section: "Identity & settings",
      page: "My GSN and I",
    };
  }

  if (canUseAdminTools && pathname.startsWith("/app/command-center")) {
    if (pathname.startsWith("/app/command-center/trust-analytics")) {
      return {
        section: "Main movement",
        page: "Trust Analytics",
      };
    }

    if (pathname.startsWith("/app/command-center/trust-events")) {
      return {
        section: "Main movement",
        page: "Trust Events",
      };
    }

    if (pathname.startsWith("/app/command-center/system-operations")) {
      return {
        section: "Main movement",
        page: "System Operations",
      };
    }

    if (pathname.startsWith("/app/command-center/exposure")) {
      return {
        section: "Main movement",
        page: "Exposure Admin",
      };
    }

    if (pathname.startsWith("/app/command-center/trust-graph")) {
      return {
        section: "Main movement",
        page: "Trust Graph",
      };
    }

    return {
      section: "Main movement",
      page: "Admin Tools",
    };
  }

  if (
    pathname.startsWith("/app/community/") &&
    pathname.includes("/join-requests")
  ) {
    return {
      section: "Community",
      page: "Join Requests",
    };
  }

  return null;
}

function findCurrentRouteMeta(
  pathname: string,
  search: string,
  groups: NavGroup[],
  canUseAdminTools: boolean,
  taskMode: TaskModeMeta | null
): RouteMeta {
  if (taskMode) {
    return {
      section: "Focused task",
      page: taskMode.title,
    };
  }

  const special = getSpecialRouteMeta(pathname, search, canUseAdminTools);
  if (special) return special;

  for (const group of groups) {
    for (const item of group.items) {
      if (isItemActive(item, pathname, search)) {
        return {
          section: group.label,
          page: item.label,
        };
      }
    }
  }

  return {
    section: "GSN",
    page: "Workspace",
  };
}

function getPageActions(
  pathname: string,
  search: string,
  myShopGalleryTo: string,
  isPlatformAdmin: boolean,
  myShopGalleryDisabled = false
): NavLinkItem[] {
  if (pathname === "/app/dashboard") {
    return uniqueNavItems([
      makeCommunityItem(),
      makeMarketplaceItem(),
      makeShopGalleryItem(myShopGalleryTo, myShopGalleryDisabled),
      { label: "Finance", to: "/app/finance" },
      { label: "Notifications", to: "/app/notifications" },
      { label: "Trust Passport", to: "/app/trust" },
    ]);
  }

  if (pathname === "/app/build-first-circle") {
    return uniqueNavItems([
      makeCommunityItem(),
      { label: "Notifications", to: "/app/notifications" },
      makeDashboardItem(),
      { label: "My GSN and I", to: "/app/my-gmfn-and-i" },
    ]);
  }

  if (pathname === "/app/shop-control") {
    return uniqueNavItems([
      makeCommunityItem(),
      makeMarketplaceItem(),
      makeShopControlItem(),
      makeDashboardItem(),
    ]);
  }

  if (pathname === "/app/vault-control") {
    return uniqueNavItems([
      makeShopControlItem(),
      makeCommunityItem(),
      makeMarketplaceItem(),
      makeDashboardItem(),
    ]);
  }

  if (pathname === "/app/shop-control/subscription-spotlight") {
    return uniqueNavItems([
      makeShopControlItem(),
      makeCommunityItem(),
      makeMarketplaceItem(),
      makeDashboardItem(),
    ]);
  }

  if (pathname.startsWith("/app/community")) {
    return uniqueNavItems([
      makeShopGalleryItem(myShopGalleryTo, myShopGalleryDisabled),
      makeShopControlItem(),
      { label: "Demand Box", to: "/app/demand-box" },
      { label: "Finance", to: "/app/finance" },
      { label: "Notifications", to: "/app/notifications" },
    ]);
  }

  if (pathname === "/app/marketplace") {
    return uniqueNavItems([
      makeShopGalleryItem(myShopGalleryTo, myShopGalleryDisabled),
      { label: "Loans & Support", to: "/app/loans" },
      makeShopControlItem(),
      { label: "Finance", to: "/app/finance" },
      { label: "Notifications", to: "/app/notifications" },
      { label: "Trust Passport", to: "/app/trust" },
    ]);
  }

  if (pathname.startsWith("/app/shop/")) {
    return uniqueNavItems([
      makeShopControlItem(),
      makeMarketplaceItem(),
      makeCommunityItem(),
      { label: "Notifications", to: "/app/notifications" },
    ]);
  }

  if (
    pathname.startsWith("/app/loans") ||
    pathname.startsWith("/app/loan-readiness") ||
    pathname.startsWith("/app/loan-suggestions") ||
    pathname.startsWith("/app/loan-workbench") ||
    pathname.startsWith("/app/payment") ||
    pathname.startsWith("/app/payment-rails") ||
    pathname.startsWith("/app/payout-details") ||
    pathname.startsWith("/app/withdrawal-instructions") ||
    pathname.startsWith("/app/guarantor-earnings")
  ) {
    return uniqueNavItems([
      makeMarketplaceItem(),
      makeCommunityItem(),
      { label: "Payment Rails", to: "/app/payment-rails" },
      { label: "Payout Details", to: "/app/payout-details" },
      { label: "Notifications", to: "/app/notifications" },
      makeDashboardItem(),
    ]);
  }

  if (pathname.startsWith("/app/notifications")) {
    return uniqueNavItems([
      makeDashboardItem(),
      makeMarketplaceItem(),
      makeCommunityItem(),
      { label: "Loans & Support", to: "/app/loans" },
      { label: "Demand Box", to: "/app/demand-box" },
    ]);
  }

  if (
    pathname.startsWith("/app/trust") ||
    pathname.startsWith("/app/trust-slip") ||
    pathname.startsWith("/app/identity")
  ) {
    return uniqueNavItems([
      { label: "Notifications", to: "/app/notifications" },
      makeCommunityItem(),
      makeMarketplaceItem(),
      { label: "My GSN and I", to: "/app/my-gmfn-and-i" },
    ]);
  }

  if (pathname === "/app/my-gmfn-and-i" && search.includes("tab=settings")) {
    return uniqueNavItems([
      makeDashboardItem(),
      makeCommunityItem(),
      makeMarketplaceItem(),
      { label: "Notifications", to: "/app/notifications" },
    ]);
  }

  if (pathname.startsWith("/app/my-gmfn-and-i")) {
    return uniqueNavItems([
      makeCommunityItem(),
      makeMarketplaceItem(),
      { label: "Notifications", to: "/app/notifications" },
      { label: "Trust Passport", to: "/app/trust" },
    ]);
  }

  if (pathname.startsWith("/app/command-center")) {
    if (!isPlatformAdmin) {
      return uniqueNavItems([
        makeDashboardItem(),
        makeCommunityItem(),
        { label: "Exposure", to: "/app/command-center/exposure" },
        { label: "Bank Console", to: "/app/command-center/bank-console" },
      ]);
    }

    return uniqueNavItems([
      makeDashboardItem(),
      makeCommunityItem(),
      { label: "Trust Events", to: "/app/command-center/trust-events" },
      makeMarketplaceItem(),
    ]);
  }

  return uniqueNavItems([
    makeCommunityItem(),
    makeMarketplaceItem(),
    { label: "Notifications", to: "/app/notifications" },
    { label: "Loans & Support", to: "/app/loans" },
  ]);
}

function desktopShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "286px minmax(0, 1fr)",
    background: gmfnBrand.gradients.pageWash,
  };
}

function mobileShell(): React.CSSProperties {
  return {
    minHeight: "100svh",
    height: "100dvh",
    background: gmfnBrand.gradients.pageWash,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  };
}

function sidebar(): React.CSSProperties {
  return {
    position: "sticky",
    top: 0,
    height: "100vh",
    overflowY: "auto",
    padding: 18,
    color: gmfnBrand.colors.darkText,
    background: gmfnBrand.gradients.heroSidebar,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  };
}

function brandCard(): React.CSSProperties {
  return {
    borderRadius: 22,
    padding: 18,
    background: gmfnBrand.gradients.glass,
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: gmfnBrand.shadows.glass,
  };
}

function drawerBrandCard(): React.CSSProperties {
  return {
    borderRadius: 18,
    padding: "10px 12px",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.105) 0%, rgba(255,255,255,0.055) 100%)",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.12), 0 16px 34px rgba(7,16,28,0.16)",
  };
}

function brandEyebrow(): React.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "rgba(248,251,255,0.78)",
  };
}

function brandTitle(): React.CSSProperties {
  return {
    marginTop: 8,
    fontSize: 22,
    fontWeight: 900,
    lineHeight: 1.15,
    color: gmfnBrand.colors.darkText,
  };
}

function brandText(): React.CSSProperties {
  return {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 1.7,
    color: "rgba(248,251,255,0.78)",
  };
}

function noteCard(): React.CSSProperties {
  return {
    borderRadius: 18,
    padding: 14,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
  };
}

function noteTitle(): React.CSSProperties {
  return {
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "rgba(248,251,255,0.72)",
  };
}

function noteText(): React.CSSProperties {
  return {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 1.7,
    color: "rgba(248,251,255,0.78)",
  };
}

function groupCard(): React.CSSProperties {
  return {
    borderRadius: 16,
    padding: 9,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
  };
}

function groupHeader(active = false): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 42,
    border: active
      ? "1px solid rgba(255,255,255,0.14)"
      : "1px solid rgba(255,255,255,0.08)",
    background: active
      ? "rgba(29,78,216,0.28)"
      : "rgba(255,255,255,0.03)",
    color: gmfnBrand.colors.darkText,
    borderRadius: 13,
    padding: "9px 11px",
    fontWeight: 800,
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    cursor: "pointer",
    textAlign: "left",
  };
}

function groupHint(): React.CSSProperties {
  return {
    marginTop: 8,
    padding: "0 4px",
    fontSize: 12,
    lineHeight: 1.55,
    color: "rgba(255,255,255,0.72)",
  };
}

function navItem(active = false, disabled = false): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: 42,
    minHeight: 42,
    maxHeight: 42,
    padding: "9px 12px",
    borderRadius: 12,
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 14,
    lineHeight: 1.16,
    textAlign: "center",
    color: disabled ? "rgba(255,255,255,0.48)" : "#FFFFFF",
    background: active ? "#0B63D1" : "rgba(255,255,255,0.04)",
    border: active
      ? "1px solid rgba(255,255,255,0.14)"
      : "1px solid rgba(255,255,255,0.06)",
    pointerEvents: "auto",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  };
}

function mainContent(
  isMobile: boolean,
  taskMode: boolean
): React.CSSProperties {
  const mobileBottomPadding = "calc(16px + env(safe-area-inset-bottom, 0px))";

  return {
    minWidth: 0,
    padding: isMobile
      ? taskMode
        ? `16px 16px ${mobileBottomPadding}`
        : `16px 16px ${mobileBottomPadding}`
      : "24px 28px 34px",
    overflowX: "hidden",
    overflowY: isMobile ? "auto" : undefined,
    WebkitOverflowScrolling: isMobile ? "touch" : undefined,
    overscrollBehaviorY: isMobile ? "contain" : undefined,
    touchAction: isMobile ? "pan-y pinch-zoom" : undefined,
    flex: isMobile ? "1 1 auto" : undefined,
    minHeight: isMobile ? 0 : undefined,
  };
}

function mobileTopBar(): React.CSSProperties {
  return {
    position: "sticky",
    top: 0,
    zIndex: 20,
    display: "grid",
    gridTemplateColumns: "minmax(82px, auto) minmax(0, 1fr) minmax(82px, auto)",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    background: "rgba(255,255,255,0.97)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid rgba(11,31,51,0.08)",
  };
}

function mobileIconButton(): React.CSSProperties {
  return {
    width: "100%",
    height: 44,
    minHeight: 44,
    maxHeight: 44,
    borderRadius: 11,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: "#0B1F33",
    fontSize: 11.5,
    fontWeight: 900,
    cursor: "pointer",
    gap: 5,
    padding: "8px 10px",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  };
}

function MobileTopIcon({ name }: { name: "menu" | "tools" }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2.4,
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="17"
      height="17"
      style={{ display: "block", flex: "0 0 auto" }}
    >
      {name === "menu" ? (
        <>
          <path {...common} d="M4 7h16" />
          <path {...common} d="M4 12h16" />
          <path {...common} d="M4 17h16" />
        </>
      ) : (
        <>
          <path {...common} d="M14.7 5.3 18.7 9.3" />
          <path {...common} d="M4.7 19.3 15.6 8.4" />
          <path {...common} d="M15.6 4.4 19.6 8.4 17.7 10.3 13.7 6.3 15.6 4.4Z" />
          <path {...common} d="m7.4 5.1 2.2 2.2" />
          <path {...common} d="M4.3 8.2 8.6 4" />
          <path {...common} d="m15.8 16.7 2.5 2.5" />
          <path {...common} d="M14.2 19.8 19.8 14.2" />
        </>
      )}
    </svg>
  );
}

function mobileTopMeta(): React.CSSProperties {
  return {
    minWidth: 0,
  };
}

function mobileTopEyebrow(): React.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#6B7A88",
  };
}

function mobileTopTitle(): React.CSSProperties {
  return {
    marginTop: 2,
    fontSize: 16,
    fontWeight: 900,
    color: "#0B1F33",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
}

function overlayBackdrop(open: boolean, zIndex: number): React.CSSProperties {
  return {
    position: "fixed",
    inset: 0,
    background: "rgba(11,31,51,0.34)",
    opacity: open ? 1 : 0,
    pointerEvents: open ? "auto" : "none",
    transition: "none",
    zIndex,
  };
}

function drawerPanel(open: boolean): React.CSSProperties {
  return {
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    width: "min(94vw, 390px)",
    maxWidth: 390,
    padding: "14px 14px max(14px, env(safe-area-inset-bottom))",
    background:
      "radial-gradient(circle at 18% 0%, rgba(47,126,214,0.22), transparent 34%), linear-gradient(180deg, #061827 0%, #08233A 54%, #061827 100%)",
    color: "#FFFFFF",
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    overscrollBehaviorY: "contain",
    touchAction: "pan-y pinch-zoom",
    transform: open ? "translateX(0)" : "translateX(-100%)",
    pointerEvents: open ? "auto" : "none",
    transition: "none",
    zIndex: 1300,
    borderRight: "1px solid rgba(116,170,226,0.24)",
    boxShadow: "18px 0 46px rgba(2,12,27,0.38)",
  };
}

function drawerHeader(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  };
}

function overlayCloseButton(dark = false): React.CSSProperties {
  return {
    width: 46,
    height: 46,
    minWidth: 46,
    minHeight: 46,
    borderRadius: 18,
    border: dark
      ? "1px solid rgba(255,255,255,0.12)"
      : "1px solid rgba(11,31,51,0.10)",
    background: dark ? "rgba(255,255,255,0.08)" : "#FFFFFF",
    color: dark ? "#FFFFFF" : "#0B1F33",
    fontSize: 24,
    fontWeight: 900,
    cursor: "pointer",
  };
}

function drawerSectionTitle(): React.CSSProperties {
  return {
    margin: "14px 0 8px",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.72)",
  };
}

function drawerLink(active = false, disabled = false): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 10,
    height: 56,
    minHeight: 56,
    maxHeight: 56,
    padding: "8px 10px",
    borderRadius: 16,
    textDecoration: "none",
    fontWeight: 900,
    fontSize: 13.6,
    lineHeight: 1.12,
    textAlign: "left",
    color: disabled ? "rgba(255,255,255,0.48)" : "#FFFFFF",
    background: active
      ? "linear-gradient(135deg, rgba(11,99,209,0.96) 0%, rgba(8,35,58,0.96) 100%)"
      : "rgba(255,255,255,0.06)",
    border: active
      ? "1px solid rgba(116,170,226,0.52)"
      : "1px solid rgba(255,255,255,0.11)",
    pointerEvents: "auto",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
    overflow: "hidden",
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
    textOverflow: "ellipsis",
    boxShadow: active
      ? "0 14px 28px rgba(11,99,209,0.24), inset 0 1px 0 rgba(255,255,255,0.14)"
      : "inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function drawerLinkGrid(single = false): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: single ? "1fr" : "repeat(2, minmax(0, 1fr))",
    gap: 8,
    alignItems: "stretch",
  };
}

function drawerToolRail(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 7,
  };
}

function drawerToolLink(active = false, disabled = false): React.CSSProperties {
  return {
    ...drawerLink(active, disabled),
    height: 48,
    minHeight: 48,
    maxHeight: 48,
    borderRadius: 15,
    padding: "7px 8px",
    fontSize: 12.2,
  };
}

function drawerIconTile(active = false): React.CSSProperties {
  return {
    width: 34,
    height: 34,
    minWidth: 34,
    borderRadius: 13,
    display: "grid",
    placeItems: "center",
    background: active
      ? "rgba(255,255,255,0.13)"
      : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(232,243,255,0.96) 100%)",
    boxShadow:
      "0 10px 20px rgba(2,12,27,0.18), inset 0 1px 0 rgba(255,255,255,0.66)",
    overflow: "hidden",
  };
}

function drawerChevron(): React.CSSProperties {
  return {
    marginLeft: "auto",
    color: "rgba(255,255,255,0.72)",
    fontSize: 24,
    lineHeight: 1,
    fontWeight: 900,
  };
}

function navIconForLabel(label: string): Gsn3DIconKey {
  const normalized = label.toLowerCase();
  if (normalized.includes("dashboard")) return "public-globe";
  if (normalized.includes("community")) return "community-building";
  if (normalized.includes("marketplace")) return "market-stall";
  if (normalized.includes("public shop")) return "shop-storefront";
  if (normalized.includes("shop")) return "shop-storefront";
  if (normalized.includes("finance") || normalized.includes("money")) {
    return "finance-bank-building";
  }
  if (normalized.includes("loan") || normalized.includes("support")) {
    return "repayment-schedule";
  }
  if (normalized.includes("trust")) return "trust-shield";
  if (normalized.includes("identity") || normalized.includes("settings")) {
    return "identity-card";
  }
  if (normalized.includes("notification")) return "records-folder";
  if (normalized.includes("admin")) return "records-folder";
  return "certificate-seal";
}

function actionsPanel(open: boolean): React.CSSProperties {
  return {
    position: "fixed",
    top: 12,
    right: 12,
    width: "min(92vw, 360px)",
    maxHeight: "min(78vh, 620px)",
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    overscrollBehaviorY: "contain",
    touchAction: "pan-y pinch-zoom",
    padding: 16,
    borderRadius: 22,
    background: "#FFFFFF",
    border: "1px solid rgba(11,31,51,0.08)",
    boxShadow: "0 22px 54px rgba(15,23,42,0.16)",
    transform: open ? "translateY(0)" : "translateY(-12px)",
    opacity: open ? 1 : 0,
    pointerEvents: open ? "auto" : "none",
    transition: "none",
    zIndex: 1300,
  };
}

function actionsTitle(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#64748B",
    fontWeight: 900,
    letterSpacing: 0.32,
    textTransform: "uppercase",
  };
}

function actionsLink(active = false, disabled = false): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    minHeight: 44,
    maxHeight: 44,
    padding: "10px 12px",
    borderRadius: 13,
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 14,
    lineHeight: 1.16,
    textAlign: "center",
    color: disabled ? "#94A3B8" : active ? "#0B63D1" : "#0B1F33",
    background: active ? "rgba(11,99,209,0.08)" : "#F8FBFF",
    border: active
      ? "1px solid rgba(11,99,209,0.14)"
      : "1px solid rgba(11,31,51,0.08)",
    pointerEvents: "auto",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  };
}

function bottomNav(): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 1,
    flexShrink: 0,
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 6,
    justifyContent: "stretch",
    overflowX: "hidden",
    overflowY: "hidden",
    padding: "7px 9px calc(9px + env(safe-area-inset-bottom, 0px))",
    background: "rgba(244,248,255,0.99)",
    borderTop: "1px solid rgba(29,95,212,0.12)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.76)",
    overscrollBehaviorX: "none",
    overscrollBehaviorY: "none",
    touchAction: "manipulation",
    pointerEvents: "none",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  };
}

function bottomNavItem(active = false, disabled = false): React.CSSProperties {
  return {
    width: "100%",
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: 42,
    minHeight: 42,
    maxHeight: 42,
    padding: "8px 4px",
    borderRadius: 12,
    textDecoration: "none",
    textAlign: "center",
    fontSize: 10.5,
    fontWeight: active ? 900 : 800,
    color: disabled ? "#94A3B8" : active ? "#0A4FB5" : "#27435F",
    background: active
      ? "linear-gradient(180deg, rgba(233,244,255,0.96) 0%, rgba(212,229,255,0.98) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(244,248,255,0.98) 100%)",
    border: active
      ? "1px solid rgba(29,95,212,0.24)"
      : "1px solid rgba(76,111,146,0.18)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    pointerEvents: "auto",
    touchAction: "manipulation",
    cursor: disabled ? "not-allowed" : "pointer",
    boxShadow: active
      ? "inset 0 0 0 1px rgba(29,95,212,0.08)"
      : "none",
    opacity: disabled ? 0.7 : 1,
  };
}

function sourceReturnStrip(isMobile: boolean): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) auto",
    gap: isMobile ? 8 : 12,
    alignItems: "center",
    marginBottom: isMobile ? 12 : 16,
    padding: isMobile ? "10px 11px" : "12px 14px",
    borderRadius: isMobile ? 14 : 16,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,251,255,0.98) 100%)",
    border: "1px solid rgba(29,95,212,0.12)",
    boxShadow: "0 10px 22px rgba(15,23,42,0.07)",
    overflow: "hidden",
    overflowAnchor: "none",
    transition: "none",
  };
}

function sourceReturnCopy(): React.CSSProperties {
  return {
    minWidth: 0,
    display: "grid",
    gap: 2,
  };
}

function sourceReturnEyebrow(): React.CSSProperties {
  return {
    color: "#64748B",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  };
}

function sourceReturnTitle(): React.CSSProperties {
  return {
    color: "#0B1F33",
    fontSize: 15,
    fontWeight: 900,
    lineHeight: 1.16,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
}

function sourceReturnButton(isMobile: boolean): React.CSSProperties {
  return {
    width: isMobile ? "100%" : undefined,
    minHeight: 40,
    height: 40,
    maxHeight: 40,
    borderRadius: 12,
    padding: "9px 12px",
    whiteSpace: "nowrap",
    fontSize: 13,
  };
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeCommunityId = useMemo(
    () => communityIdFromSearch(location.search),
    [location.search]
  );

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 768;
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [myGmfnId, setMyGmfnId] = useState<string>(() => getStoredGmfnId() || "");
  const [myRole, setMyRole] = useState<string>(() => readRole());
  const [myClanRole, setMyClanRole] = useState<string>("");

  const isAdmin = useMemo(() => {
    const role = String(myRole || "").trim().toLowerCase();
    return role === "admin";
  }, [myRole]);

  const isClanAdmin = useMemo(() => {
    const role = String(myClanRole || "").trim().toLowerCase();
    return role === "admin";
  }, [myClanRole]);

  const canUseAdminTools = useMemo(
    () => isAdmin || isClanAdmin,
    [isAdmin, isClanAdmin]
  );

  useEffect(() => {
    let alive = true;

    (async () => {
      const [me, currentClan] = await Promise.all([
        getMe().catch(() => null),
        getCurrentClan().catch(() => null),
      ]);
      if (!alive) return;

      const gmfnId = String(me?.gmfn_id || getStoredGmfnId() || "").trim();
      const role = String(
        me?.role ||
          me?.account_role ||
          me?.user_role ||
          (Array.isArray(me?.permissions) && me.permissions.includes("admin")
            ? "admin"
            : "")
      )
        .trim()
        .toLowerCase();
      const clanRole = String(
        currentClan?.role ||
          currentClan?.member_role ||
          currentClan?.membership_role ||
          currentClan?.participant_role ||
          ""
      )
        .trim()
        .toLowerCase();

      setMyGmfnId(gmfnId);
      setMyRole(role);
      setMyClanRole(clanRole);
      writeRole(role);
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsMobile(window.innerWidth <= 768);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const myShopGalleryTo = useMemo(() => {
    if (location.pathname.startsWith("/shop/")) {
      return `${location.pathname}${location.search || ""}${location.hash || ""}`;
    }

    if (myGmfnId) {
      return publicShopPath(myGmfnId);
    }

    return `${location.pathname}${location.search || ""}${location.hash || ""}`;
  }, [location.hash, location.pathname, location.search, myGmfnId]);

  const myShopGalleryDisabled = !location.pathname.startsWith("/shop/") && !myGmfnId;

  const taskMode = useMemo(
    () => getTaskModeMeta(location.pathname),
    [location.pathname]
  );

  const primaryItems = useMemo(
    () =>
      buildPrimaryItems(
        canUseAdminTools,
        myShopGalleryTo,
        myShopGalleryDisabled
      ),
    [canUseAdminTools, myShopGalleryDisabled, myShopGalleryTo]
  );

  const trustPassportItems = useMemo(() => buildTrustPassportItems(), []);
  const commerceItems = useMemo(() => buildCommerceItems(), []);
  const identityItems = useMemo(() => buildIdentityItems(), []);
  const financeToolsItems = useMemo(() => buildFinanceToolsItems(), []);
  const loansItems = useMemo(() => buildLoansItems(), []);

  const groups = useMemo<NavGroup[]>(() => {
    return [
      {
        key: "primary",
        label: "Main movement",
        hint:
          canUseAdminTools
            ? "The main routes stay simple: Dashboard, Community Home, Marketplace, Public Shop, Shop Control, Finance, Loans, Trust, and Admin."
            : "The main routes stay simple: Dashboard, Community Home, Marketplace, Public Shop, Shop Control, Finance, Loans, and Trust.",
        items: primaryItems,
      },
      {
        key: "commerce",
        label: "Shop tools",
        hint:
          "Shop Control is the owner workspace. Public Shop is the outward shop face shown in the main movement row.",
        items: commerceItems,
      },
      {
        key: "finance-tools",
        label: "Finance tools",
        hint:
          "Money In, Money Out, rails, and payout details stay grouped under the Finance workspace.",
        items: financeToolsItems,
      },
      {
        key: "trust-passport",
        label: "Trust detail",
        hint:
          "TrustSlip stays grouped here while Trust Passport itself now sits in the main movement row.",
        items: trustPassportItems,
      },
      {
        key: "identity",
        label: "Identity & settings",
        hint:
          "Identity integrity, notifications, profile help, and settings live here.",
        items: identityItems,
      },
      {
        key: "support",
        label: "Loans & Support",
        hint:
          "Money, readiness, suggestions, workbench, and support tools stay together here.",
        items: loansItems,
      },
    ];
  }, [
    primaryItems,
    canUseAdminTools,
    commerceItems,
    financeToolsItems,
    trustPassportItems,
    identityItems,
    loansItems,
  ]);

  const displayedGroups = useMemo(() => {
    if (!taskMode) return groups;
    return groups.filter((group) => group.key === "primary");
  }, [groups, taskMode]);

  const firstOpenGroup = useMemo(() => {
    const found = displayedGroups.find((group) =>
      group.items.some((item) =>
        isItemActive(item, location.pathname, location.search)
      )
    );
    return found?.key || "primary";
  }, [displayedGroups, location.pathname, location.search]);

  const [openGroup, setOpenGroup] = useState<string>(firstOpenGroup);

  useEffect(() => {
    if (!openGroup) {
      setOpenGroup(firstOpenGroup);
      return;
    }

    const stillExists = displayedGroups.some((group) => group.key === openGroup);
    if (!stillExists) {
      setOpenGroup(firstOpenGroup);
    }
  }, [displayedGroups, firstOpenGroup, openGroup]);

  useEffect(() => {
    setIsDrawerOpen(false);
    setIsActionsOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isMobile) {
      setIsDrawerOpen(false);
      setIsActionsOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    const usageEntry = getDashboardAppUsageEntryFromLocation(
      location.pathname,
      location.search
    );
    if (!usageEntry) return;

    recordDashboardAppUsage(usageEntry);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!isMobile) return;

    const previousOverflow = document.body.style.overflow;
    const shouldLock = isDrawerOpen || isActionsOpen;
    document.body.style.overflow = shouldLock ? "hidden" : "";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isDrawerOpen, isActionsOpen, isMobile]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isDrawerOpen && !isActionsOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDrawerOpen(false);
        setIsActionsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen, isActionsOpen]);

  function toggleGroup(key: string) {
    setOpenGroup((prev) => (prev === key ? "" : key));
  }

  function openDrawer() {
    setIsActionsOpen(false);
    setIsDrawerOpen(true);
  }

  function closeDrawer() {
    setIsDrawerOpen(false);
  }

  function openActions() {
    setIsDrawerOpen(false);
    setIsActionsOpen(true);
  }

  function closeActions() {
    setIsActionsOpen(false);
  }

  function handleLogout() {
    logout();
    setIsDrawerOpen(false);
    setIsActionsOpen(false);
    navigate("/login?force=1", { replace: true });
  }

  const routeMeta = findCurrentRouteMeta(
    location.pathname,
    location.search,
    groups,
    canUseAdminTools,
    taskMode
  );
  const originPath = originPathFromState(location);
  const originRoute = originPath ? routeParts(originPath) : null;
  const originMeta = originRoute
    ? findCurrentRouteMeta(
        originRoute.pathname,
        originRoute.search,
        groups,
        canUseAdminTools,
        null
      )
    : null;

  const pageActions = useMemo(
    () =>
      taskMode
        ? taskMode.actions
        : getPageActions(
            location.pathname,
            location.search,
            myShopGalleryTo,
            isAdmin,
            myShopGalleryDisabled
          ),
    [
      taskMode,
      location.pathname,
      location.search,
      myShopGalleryTo,
      isAdmin,
      myShopGalleryDisabled,
    ]
  );

  const mobileBottomItems = useMemo<NavLinkItem[]>(() => {
    const items: NavLinkItem[] = [
      makeDashboardItem(),
      {
        label: "Community",
        to: "/app/community",
        match: (pathname) =>
          pathname === "/app/community" ||
          pathname.startsWith("/app/community/"),
      },
      makeMarketplaceItem(),
      {
        ...makeShopGalleryItem(myShopGalleryTo, myShopGalleryDisabled),
        label: "Shop",
      },
      makeProfileItem(),
    ];

    return items.filter((item) => !item.disabled || item.label === "Shop");
  }, [myShopGalleryDisabled, myShopGalleryTo]);

  const mobileDrawerGroups = useMemo<MobileDrawerGroup[]>(() => {
    if (taskMode) {
      return [
        {
          title: "Focused task",
          items: taskMode.actions,
          variant: "main",
        },
      ];
    }

    return [
      {
        title: "Main movement",
        items: primaryItems,
        variant: "main",
      },
      {
        title: "Tools & resources",
        items: commerceItems,
        variant: "tools",
      },
      {
        title: "Finance tools",
        items: financeToolsItems,
        variant: "tools",
      },
      {
        title: "Trust detail",
        items: trustPassportItems,
        variant: "tools",
      },
      {
        title: "Identity & settings",
        items: identityItems,
        variant: "tools",
      },
      {
        title: "Quick actions",
        items: loansItems,
        variant: "quick",
      },
    ];
  }, [
    taskMode,
    primaryItems,
    commerceItems,
    financeToolsItems,
    trustPassportItems,
    identityItems,
    loansItems,
  ]);

  const showMobileBottomRail =
    isMobile && (!taskMode || shouldKeepBottomRailInTaskMode(location.pathname));

  return (
    <div style={isMobile ? mobileShell() : desktopShell()}>
      {!isMobile ? (
        <aside style={sidebar()}>
          <StableCtaLink
            to="/app/dashboard"
            kind="soft"
            fullWidth
            debugId="app-layout.brand.dashboard"
            style={{
              display: "block",
              padding: 0,
              minHeight: 0,
              border: "none",
              background: "transparent",
              boxShadow: "none",
              textDecoration: "none",
              color: "inherit",
              textAlign: "left",
            }}
          >
            <div style={brandCard()}>
              <div style={brandEyebrow()}>GSN</div>
              <div style={brandTitle()}>Member workspace</div>
              <div style={brandText()}>
                A guided, calmer workspace for community movement, marketplace,
                finance, trust, identity, and support.
              </div>
            </div>
          </StableCtaLink>

          <div style={noteCard()}>
            <div style={noteTitle()}>
              {taskMode ? "Task focus mode" : "Movement order"}
            </div>
            <div style={noteText()}>
                {taskMode
                  ? taskMode.hint
                  : "Dashboard leads to Community Home. Community Home leads to Marketplace. Marketplace leads to Shop, Finance, and Trust Passport when deeper work is needed."}
            </div>
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {displayedGroups.map((group) => {
              const groupActive = group.items.some((item) =>
                isItemActive(item, location.pathname, location.search)
              );
              const expanded = openGroup === group.key || groupActive;

              return (
                <div key={group.key} style={groupCard()}>
                  <StableButton
                    onClick={() => toggleGroup(group.key)}
                    aria-expanded={expanded}
                    kind="soft"
                    debugId={`app-layout.desktop-group.${group.key}.toggle`}
                    style={groupHeader(groupActive)}
                  >
                    <span>{group.label}</span>
                    <span style={{ fontSize: 16, lineHeight: 1 }}>
                      {expanded ? "-" : "+"}
                    </span>
                  </StableButton>

                  {expanded ? (
                    <>
                      {group.hint ? (
                        <div style={groupHint()}>{group.hint}</div>
                      ) : null}

                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        {group.items.map((item) => (
                          <StableCtaLink
                            key={`${group.key}-${item.label}-${item.to}`}
                            to={contextualizeAppNavTarget(
                              item.to,
                              activeCommunityId
                            )}
                            kind="soft"
                            disabled={!!item.disabled}
                            debugId={`app-layout.desktop-nav.${group.key}.${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                            style={navItem(
                              isItemActive(item, location.pathname, location.search),
                              !!item.disabled
                            )}
                          >
                            {item.label}
                          </StableCtaLink>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              );
            })}
          </nav>

          <div style={{ marginTop: "auto", paddingTop: 16 }}>
            <StableButton
              onClick={handleLogout}
              kind="soft"
              debugId="app-layout.desktop.logout"
              style={groupHeader(false)}
            >
              <span>Log out</span>
              <span style={{ fontSize: 16, lineHeight: 1 }}>&rarr;</span>
            </StableButton>
            <div style={groupHint()}>
              Leave the workspace cleanly and return to the sign-in screen.
            </div>
          </div>
        </aside>
      ) : (
        <>
          <header style={mobileTopBar()}>
            <StableButton
              onClick={openDrawer}
              aria-label="Open navigation"
              kind="secondary"
              debugId="app-layout.mobile.open-navigation"
              style={mobileIconButton()}
            >
              <MobileTopIcon name="menu" />
              Menu
            </StableButton>

            <div style={mobileTopMeta()}>
              <div style={mobileTopEyebrow()}>{routeMeta.section}</div>
              <div style={mobileTopTitle()}>{routeMeta.page}</div>
            </div>

            <StableButton
              onClick={openActions}
              aria-label="Open page actions"
              kind="secondary"
              debugId="app-layout.mobile.open-tools"
              style={mobileIconButton()}
            >
              <MobileTopIcon name="tools" />
              Tools
            </StableButton>
          </header>

          <div
            style={overlayBackdrop(isDrawerOpen, 1290)}
            onClick={closeDrawer}
          />

          <aside
            style={drawerPanel(isDrawerOpen)}
            aria-hidden={!isDrawerOpen}
            data-gmfn-mobile-overlay="drawer"
            data-gmfn-mobile-overlay-open={isDrawerOpen ? "true" : "false"}
          >
            <div style={drawerHeader()}>
              <div>
                <div style={brandEyebrow()}>GSN</div>
                <div
                  style={{
                    marginTop: 5,
                    fontSize: 18,
                    fontWeight: 900,
                    letterSpacing: 0.2,
                  }}
                >
                  Navigation
                </div>
              </div>

              <StableButton
                onClick={closeDrawer}
                aria-label="Close navigation"
                kind="soft"
                debugId="app-layout.mobile.close-navigation"
                style={overlayCloseButton(true)}
              >
                x
              </StableButton>
            </div>

            <div style={drawerBrandCard()}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px minmax(0, 1fr) auto",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <span style={drawerIconTile(true)}>
                  <GsnRealisticIcon
                    name={navIconForLabel(taskMode ? taskMode.title : routeMeta.page)}
                    size={34}
                    decorative
                  />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={brandEyebrow()}>
                    {taskMode ? "Focused task" : "You are here"}
                  </div>
                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 20,
                      fontWeight: 1000,
                      lineHeight: 1.1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {taskMode ? taskMode.title : routeMeta.page}
                  </div>
                </div>
                <span
                  aria-hidden="true"
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 999,
                    background: "#74AAE2",
                    boxShadow: "0 0 0 6px rgba(116,170,226,0.14)",
                  }}
                />
              </div>
              {taskMode ? (
                <div
                  style={{
                    ...brandText(),
                    marginTop: 7,
                    fontSize: 12,
                    lineHeight: 1.36,
                  }}
                >
                  {taskMode.hint}
                </div>
              ) : null}
            </div>

            {mobileDrawerGroups.map((group) => (
              <div key={group.title}>
                <div style={drawerSectionTitle()}>{group.title}</div>

                <div
                  style={
                    group.variant === "tools"
                      ? drawerToolRail()
                      : drawerLinkGrid(group.items.length === 1)
                  }
                >
                  {group.items.map((item) => (
                    <StableCtaLink
                      key={`${group.title}-${item.label}-${item.to}`}
                      to={contextualizeAppNavTarget(
                        item.to,
                        activeCommunityId
                      )}
                      kind="soft"
                      disabled={!!item.disabled}
                      onClick={() => closeDrawer()}
                      debugId={`app-layout.drawer.${group.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                      style={
                        group.variant === "tools"
                          ? drawerToolLink(
                              isItemActive(item, location.pathname, location.search),
                              !!item.disabled
                            )
                          : drawerLink(
                              isItemActive(item, location.pathname, location.search),
                              !!item.disabled
                            )
                      }
                    >
                      <span
                        aria-hidden="true"
                        style={drawerIconTile(
                          isItemActive(item, location.pathname, location.search)
                        )}
                      >
                        <GsnRealisticIcon
                          name={navIconForLabel(item.label)}
                          size={group.variant === "tools" ? 30 : 34}
                          decorative
                        />
                      </span>
                      <span
                        style={{
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.label}
                      </span>
                      <span aria-hidden="true" style={drawerChevron()}>
                        &gt;
                      </span>
                    </StableCtaLink>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ marginTop: 18 }}>
              <div style={drawerSectionTitle()}>Session</div>
              <StableButton
                onClick={handleLogout}
                kind="soft"
                debugId="app-layout.drawer.logout"
                style={drawerLink(false, false)}
              >
                Log out
              </StableButton>
            </div>
          </aside>

          <div
            style={overlayBackdrop(isActionsOpen, 1290)}
            onClick={closeActions}
          />

          <div
            style={{
              ...actionsPanel(isActionsOpen),
              pointerEvents:
                isActionsOpen ? "auto" : "none",
            }}
            aria-hidden={!isActionsOpen}
            data-gmfn-mobile-overlay="tools"
            data-gmfn-mobile-overlay-open={isActionsOpen ? "true" : "false"}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div>
                <div style={actionsTitle()}>
                  {taskMode ? "Current action" : "Page tools"}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 18,
                    fontWeight: 900,
                    color: "#0B1F33",
                  }}
                >
                  {taskMode ? taskMode.title : routeMeta.page}
                </div>
              </div>

              <StableButton
                onClick={closeActions}
                aria-label="Close page actions"
                kind="soft"
                debugId="app-layout.mobile.close-tools"
                style={overlayCloseButton(false)}
              >
                x
              </StableButton>
            </div>

            <div
              style={{
                color: "#5D7389",
                fontSize: 14,
                lineHeight: 1.75,
                marginBottom: 14,
              }}
            >
              {taskMode
                ? "Finish this step first, or choose where you want to go next."
                : "These actions belong to the page you are using now."}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pageActions.map((item) => (
                <StableCtaLink
                  key={`page-action-${item.label}-${item.to}`}
                  to={contextualizeAppNavTarget(item.to, activeCommunityId)}
                  kind="secondary"
                  disabled={!!item.disabled}
                  onClick={() => closeActions()}
                  debugId={`app-layout.page-action.${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  style={actionsLink(
                    isItemActive(item, location.pathname, location.search),
                    !!item.disabled
                  )}
                >
                  {item.label}
                </StableCtaLink>
              ))}
              <StableButton
                onClick={handleLogout}
                kind="secondary"
                debugId="app-layout.page-action.logout"
                style={actionsLink(false, false)}
              >
                Log out
              </StableButton>
            </div>
          </div>
        </>
      )}

      <main
        style={mainContent(isMobile, !!taskMode)}
      >
        {originPath && originMeta ? (
          <section
            aria-label="Return to previous page"
            style={sourceReturnStrip(isMobile)}
          >
            <div style={sourceReturnCopy()}>
              <div style={sourceReturnEyebrow()}>Return path</div>
              <div style={sourceReturnTitle()}>
                Back to {originMeta.page}
              </div>
            </div>
            <StableCtaLink
              to={originPath}
              preserveOrigin={false}
              kind="secondary"
              debugId="app-layout.source-return"
              style={sourceReturnButton(isMobile)}
            >
              Back
            </StableCtaLink>
          </section>
        ) : null}
        <WorkspaceCompanionBridge />
        <WorkspaceSettingsBridge />
        <Outlet />
      </main>

      {showMobileBottomRail ? (
        <nav data-gmfn-bottom-nav="true" style={bottomNav()}>
          {mobileBottomItems.map((item) => (
            <StableCtaLink
              key={`bottom-${item.label}-${item.to}`}
              to={contextualizeAppNavTarget(item.to, activeCommunityId)}
              kind="soft"
              disabled={!!item.disabled}
              data-gmfn-bottom-nav-item="true"
              data-bottom-nav-active={
                isItemActive(item, location.pathname, location.search)
                  ? "true"
                  : "false"
              }
              debugId={`app-layout.bottom-nav.${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              style={bottomNavItem(
                isItemActive(item, location.pathname, location.search),
                !!item.disabled
              )}
            >
              {item.label}
            </StableCtaLink>
          ))}
        </nav>
      ) : null}
    </div>
  );
}



