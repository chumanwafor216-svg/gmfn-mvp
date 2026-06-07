import React, { Suspense } from "react";
import {
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
  useParams,
} from "react-router-dom";

import AppLayout from "./layout/AppLayout";
import RequireAuth from "./components/RequireAuth";
import {
  configuredPublicFrontendOrigin,
  isSuspendedPublicFrontendHost,
  publicShopPath,
} from "./lib/publicLinks";
import { APP_ROUTES } from "./lib/appRoutes";
import { getAccessToken, logout } from "./lib/api";
import {
  peekPublishRecoveryTarget,
  publishRecoveryTarget,
} from "./lib/publishRecovery";
import { gmfnBrand } from "./styles/gmfnBrand";

const CoverPage = React.lazy(() => import("./pages/CoverPage"));
const CreateEntryPage = React.lazy(() => import("./pages/CreateEntryPage"));
const WelcomePage = React.lazy(() => import("./pages/WelcomePage"));
const LoginPage = React.lazy(() => import("./pages/LoginPage"));
const JoinEntryPage = React.lazy(() => import("./pages/JoinEntryPage"));
const DashboardPage = React.lazy(() => import("./pages/DashboardPage"));
const CommunityHomePage = React.lazy(() => import("./pages/CommunityHomePage"));
const LoansPage = React.lazy(() => import("./pages/LoansPage"));
const MarketplacePage = React.lazy(() => import("./pages/MarketplacePage"));
const ShopGalleryPage = React.lazy(() => import("./pages/ShopGalleryPage"));
const TrustScorePage = React.lazy(() => import("./pages/TrustScorePage"));
const TrustSlipPage = React.lazy(() => import("./pages/TrustSlipPage"));
const TrustSlipVerifyPage = React.lazy(
  () => import("./pages/TrustSlipVerifyPage")
);
const OpenTrustPage = React.lazy(() => import("./pages/OpenTrustPage"));
const CCIReadingPage = React.lazy(() => import("./pages/CCIReadingPage"));
const PaymentInstructionsPage = React.lazy(
  () => import("./pages/PaymentInstructionsPage")
);
const RepaymentPage = React.lazy(() => import("./pages/RepaymentPage"));
const WithdrawalInstructionsPage = React.lazy(
  () => import("./pages/WithdrawalInstructionsPage")
);
const PaymentRailsPage = React.lazy(() => import("./pages/PaymentRailsPage"));
const PayoutDetailsPage = React.lazy(() => import("./pages/PayoutDetailsPage"));
const LoanReadinessPage = React.lazy(
  () => import("./pages/LoanReadinessPage")
);
const LoanSuggestionsPage = React.lazy(
  () => import("./pages/LoanSuggestionsPage")
);
const LoanWorkbenchPage = React.lazy(
  () => import("./pages/LoanWorkbenchPage")
);
const GuarantorEarningsPage = React.lazy(
  () => import("./pages/GuarantorEarningsPage")
);
const GuarantorInboxPage = React.lazy(
  () => import("./pages/GuarantorInboxPage")
);
const CommunityConfirmationInboxPage = React.lazy(
  () => import("./pages/CommunityConfirmationInboxPage")
);
const CommunityConfirmationPolicyPage = React.lazy(
  () => import("./pages/CommunityConfirmationPolicyPage")
);
const CommunityConfirmationOutcomePage = React.lazy(
  () => import("./pages/CommunityConfirmationOutcomePage")
);
const CommunityVerifyPage = React.lazy(
  () => import("./pages/CommunityVerifyPage")
);
const IdentityIntegrityPage = React.lazy(
  () => import("./pages/IdentityIntegrityPage")
);
const NotificationsPage = React.lazy(
  () => import("./pages/NotificationsPage")
);
const SystemOperationsPage = React.lazy(
  () => import("./pages/SystemOperationsPage")
);
const ExposureAdminPage = React.lazy(
  () => import("./pages/ExposureAdminPage")
);
const AdminTrustGraphPage = React.lazy(
  () => import("./pages/AdminTrustGraphPage")
);
const MyGMFNAndIPage = React.lazy(() => import("./pages/MyGMFNAndIPage"));
const TrustAnalyticsPage = React.lazy(
  () => import("./pages/TrustAnalyticsPage")
);
const TrustCommandCentrePage = React.lazy(
  () => import("./pages/TrustCommandCentrePage")
);
const AdminTrustEventsPage = React.lazy(
  () => import("./pages/AdminTrustEventsPage")
);
const AdminIdentityRiskPage = React.lazy(
  () => import("./pages/AdminIdentityRiskPage")
);
const AdminIncompleteLoansPage = React.lazy(
  () => import("./pages/AdminIncompleteLoansPage")
);
const BankConsolePage = React.lazy(() => import("./pages/BankConsolePage"));
const RevenueAllocationPage = React.lazy(
  () => import("./pages/RevenueAllocationPage")
);
const ShopControlPage = React.lazy(() => import("./pages/ShopControlPage"));
const ShopAssetsPage = React.lazy(() => import("./pages/ShopAssetsPage"));
const VaultControlPage = React.lazy(() => import("./pages/VaultControlPage"));
const SubscriptionSpotlightPage = React.lazy(
  () => import("./pages/SubscriptionSpotlightPage")
);
const ShopAccessPage = React.lazy(() => import("./pages/ShopAccessPage"));
const BuildFirstCirclePage = React.lazy(
  () => import("./pages/BuildFirstCirclePage")
);
const FinancePage = React.lazy(() => import("./pages/FinancePage"));
const LoanSummaryPage = React.lazy(() => import("./pages/LoanSummaryPage"));
const CommunityJoinRequestsPage = React.lazy(
  () => import("./pages/CommunityJoinRequestsPage")
);
const JoinApprovalPage = React.lazy(() => import("./pages/JoinApprovalPage"));
const MemberActivationPage = React.lazy(
  () => import("./pages/MemberActivationPage")
);
const DemandBoxPage = React.lazy(() => import("./pages/DemandBoxPage"));
const JoinRequestPendingPage = React.lazy(
  () => import("./pages/JoinRequestPendingPage")
);

type EntryMode = "general" | "create" | "invite" | "approved" | "existing";

const LAST_AUTHENTICATED_APP_PATH_KEY = "gmfn_last_authenticated_app_path";

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: gmfnBrand.gradients.pageWash,
        color: gmfnBrand.colors.ink,
        fontSize: "15px",
        fontWeight: 700,
      }}
    >
      Loading page...
    </div>
  );
}

function splitTarget(raw: string): {
  pathname: string;
  search: string;
  hash: string;
} {
  const value = String(raw || "").trim();
  let pathname = value;
  let search = "";
  let hash = "";

  const hashIndex = pathname.indexOf("#");
  if (hashIndex >= 0) {
    hash = pathname.slice(hashIndex);
    pathname = pathname.slice(0, hashIndex);
  }

  const searchIndex = pathname.indexOf("?");
  if (searchIndex >= 0) {
    search = pathname.slice(searchIndex + 1);
    pathname = pathname.slice(0, searchIndex);
  }

  return {
    pathname: pathname || "/",
    search,
    hash,
  };
}

function mergeTargetWithCurrent(
  target: string,
  currentSearch: string,
  currentHash: string
): string {
  const { pathname, search, hash } = splitTarget(target);
  const merged = new URLSearchParams(search);
  const current = new URLSearchParams(currentSearch);

  current.forEach((value, key) => {
    if (!merged.has(key)) {
      merged.append(key, value);
    }
  });

  const nextSearch = merged.toString();
  const nextHash = hash || currentHash || "";

  return `${pathname}${nextSearch ? `?${nextSearch}` : ""}${nextHash}`;
}

function PreserveRedirect(props: { to: string }) {
  const location = useLocation();

  return (
    <Navigate
      to={mergeTargetWithCurrent(props.to, location.search, location.hash)}
      replace
    />
  );
}

function currentRoutePath(location: Pick<ReturnType<typeof useLocation>, "pathname" | "search" | "hash">): string {
  return `${location.pathname || ""}${location.search || ""}${location.hash || ""}`;
}

function rememberAuthenticatedAppPath(path: string): void {
  try {
    if (typeof window === "undefined") return;
    if (!path.startsWith("/app/") && path !== "/app") return;
    window.sessionStorage.setItem(LAST_AUTHENTICATED_APP_PATH_KEY, path);
  } catch {
    // Ignore storage failures; the redirect guard still has a dashboard fallback.
  }
}

function lastAuthenticatedAppPath(): string {
  try {
    if (typeof window === "undefined") return "";
    const value = String(
      window.sessionStorage.getItem(LAST_AUTHENTICATED_APP_PATH_KEY) || ""
    ).trim();
    return value.startsWith("/app/") || value === "/app" ? value : "";
  } catch {
    return "";
  }
}

function hasSessionReset(search: string): boolean {
  try {
    const params = new URLSearchParams(search);
    const value = String(params.get("reset") || "").trim().toLowerCase();
    return value === "1" || value === "true" || value === "yes";
  } catch {
    return false;
  }
}

function clearLocalBrowserSession(): void {
  try {
    logout();
  } catch {
    // Keep the reset route best-effort.
  }

  try {
    window.localStorage.clear();
  } catch {
    // Some mobile browsers can block storage access.
  }

  try {
    window.sessionStorage.clear();
  } catch {
    // Some mobile browsers can block storage access.
  }
}

function PublicSessionReset() {
  const [done, setDone] = React.useState(false);

  React.useLayoutEffect(() => {
    clearLocalBrowserSession();
    setDone(true);
  }, []);

  if (!done) {
    return <RouteFallback />;
  }

  return <Navigate to="/cover" replace />;
}

function GlobalSessionResetGate(props: { children: React.ReactNode }) {
  const location = useLocation();

  if (hasSessionReset(location.search)) {
    return <PublicSessionReset />;
  }

  return <>{props.children}</>;
}

function RememberAuthenticatedAppRoute() {
  const location = useLocation();

  React.useEffect(() => {
    if (!getAccessToken()) return;
    rememberAuthenticatedAppPath(currentRoutePath(location));
  }, [location]);

  return null;
}

function PublicEntryGuard(props: { children: React.ReactNode }) {
  const location = useLocation();

  if (hasSessionReset(location.search)) {
    return <PublicSessionReset />;
  }

  const token = getAccessToken();
  const publishTarget = token
    ? publishRecoveryTarget()
    : peekPublishRecoveryTarget();

  if (token) {
    return (
      <Navigate
        to={publishTarget || lastAuthenticatedAppPath() || APP_ROUTES.DASHBOARD}
        replace
        state={{ recoveredFrom: currentRoutePath(location) }}
      />
    );
  }

  if (publishTarget) {
    const next = new URLSearchParams(location.search);
    next.set("session", "expired");
    next.set("next", publishTarget);

    return (
      <Navigate
        to={`/login?${next.toString()}`}
        replace
        state={{
          from: routeStateFromTarget(publishTarget),
          recoveredFrom: currentRoutePath(location),
        }}
      />
    );
  }

  return <>{props.children}</>;
}

function routeStateFromTarget(target: string): {
  pathname: string;
  search?: string;
  hash?: string;
} {
  try {
    const parsed = new URL(target, "https://gsn.local");
    return {
      pathname: parsed.pathname || APP_ROUTES.DASHBOARD,
      search: parsed.search || "",
      hash: parsed.hash || "",
    };
  } catch {
    return { pathname: APP_ROUTES.DASHBOARD, search: "", hash: "" };
  }
}

const ROOT_APP_ROUTE_ALIASES: Record<string, string> = {
  "app/free-spotlight": APP_ROUTES.FREE_SPOTLIGHT,
  "free-spotlight": APP_ROUTES.FREE_SPOTLIGHT,
  "app/spotlight": APP_ROUTES.FREE_SPOTLIGHT,
  spotlight: APP_ROUTES.FREE_SPOTLIGHT,
  "app/shop-spotlight": APP_ROUTES.FREE_SPOTLIGHT,
  "shop-spotlight": APP_ROUTES.FREE_SPOTLIGHT,
  "app/shop-control/spotlight": APP_ROUTES.FREE_SPOTLIGHT,
  "shop-control/spotlight": APP_ROUTES.FREE_SPOTLIGHT,
  "app/shop-control/free-spotlight": APP_ROUTES.FREE_SPOTLIGHT,
  "shop-control/free-spotlight": APP_ROUTES.FREE_SPOTLIGHT,
  "app/paid-spotlight": APP_ROUTES.SUBSCRIPTION_SPOTLIGHT,
  "paid-spotlight": APP_ROUTES.SUBSCRIPTION_SPOTLIGHT,
  "app/subscription-spotlight": APP_ROUTES.SUBSCRIPTION_SPOTLIGHT,
  "subscription-spotlight": APP_ROUTES.SUBSCRIPTION_SPOTLIGHT,
  "app/shop-control/paid-spotlight": APP_ROUTES.SUBSCRIPTION_SPOTLIGHT,
  "shop-control/paid-spotlight": APP_ROUTES.SUBSCRIPTION_SPOTLIGHT,
  "app/shop-control/subscription-spotlight": APP_ROUTES.SUBSCRIPTION_SPOTLIGHT,
  "shop-control/subscription-spotlight": APP_ROUTES.SUBSCRIPTION_SPOTLIGHT,
  "app/shop-control": APP_ROUTES.SHOP_ME,
  "shop-control": APP_ROUTES.SHOP_ME,
  "app/shop-manager": APP_ROUTES.SHOP_ME,
  "shop-manager": APP_ROUTES.SHOP_ME,
  "app/shop-assets": APP_ROUTES.SHOP_ASSETS,
  "shop-assets": APP_ROUTES.SHOP_ASSETS,
  "app/shop-gallery-control": "/app/shop-control#shop-control-gallery-tools",
  "shop-gallery-control": "/app/shop-control#shop-control-gallery-tools",
  "app/vault-control": APP_ROUTES.VAULT_CONTROL,
  "vault-control": APP_ROUTES.VAULT_CONTROL,
};

function rootAppAliasTarget(pathname: string, search: string, hash: string): string {
  const alias = String(pathname || "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
  const target = ROOT_APP_ROUTE_ALIASES[alias];
  return target ? mergeTargetWithCurrent(target, search, hash) : "";
}

function authenticatedFallbackTarget(pathname: string, search: string, hash: string): string {
  const alias = String(pathname || "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();

  if (!alias.startsWith("app/")) return "";

  if (alias.includes("shop-control") || alias.includes("spotlight")) {
    if (alias.includes("paid") || alias.includes("subscription")) {
      return mergeTargetWithCurrent(APP_ROUTES.SUBSCRIPTION_SPOTLIGHT, search, hash);
    }

    if (alias.includes("spotlight")) {
      return mergeTargetWithCurrent(APP_ROUTES.FREE_SPOTLIGHT, search, hash);
    }

    return mergeTargetWithCurrent(APP_ROUTES.SHOP_ME, search, hash);
  }

  return mergeTargetWithCurrent(APP_ROUTES.DASHBOARD, search, hash);
}

function RedirectUnknownRoute() {
  const location = useLocation();
  const appAliasTarget = rootAppAliasTarget(
    location.pathname,
    location.search,
    location.hash
  );
  const appFallbackTarget = authenticatedFallbackTarget(
    location.pathname,
    location.search,
    location.hash
  );

  return <Navigate to={appAliasTarget || appFallbackTarget || "/cover"} replace />;
}

function RedirectToCover(props: {
  entry: EntryMode;
  sourceParam?: string;
  targetQueryKey?: string;
}) {
  const location = useLocation();
  const params = useParams<Record<string, string | undefined>>();

  const next = new URLSearchParams(location.search);
  next.set("entry", props.entry);

  if (props.sourceParam && props.targetQueryKey) {
    const value = params[props.sourceParam];
    if (value) {
      next.set(props.targetQueryKey, value);
    }
  }

  const hash = location.hash || "";
  return <Navigate to={`/cover?${next.toString()}${hash}`} replace />;
}

function RedirectPublicShopAlias() {
  const params = useParams<Record<string, string | undefined>>();
  const gmfnId = String(params.gmfnId || "").trim();

  return (
    <Navigate
      to={gmfnId ? publicShopPath(gmfnId) : "/cover"}
      replace
    />
  );
}

function RedirectCommunityMarketplaceAlias() {
  const location = useLocation();
  const params = useParams<Record<string, string | undefined>>();
  const clanId = String(params.clanId || "").trim();

  return (
    <Navigate
      to={mergeTargetWithCurrent(
        clanId
          ? `${APP_ROUTES.MARKETPLACE}?community=${encodeURIComponent(clanId)}`
          : APP_ROUTES.MARKETPLACE,
        location.search,
        location.hash
      )}
      replace
    />
  );
}

function RedirectVaultAlias() {
  const location = useLocation();
  const params = useParams<Record<string, string | undefined>>();
  const token = String(params.token || "").trim();

  return (
    <Navigate
      to={mergeTargetWithCurrent(
        token ? `/vault/${encodeURIComponent(token)}` : "/cover",
        location.search,
        location.hash
      )}
      replace
    />
  );
}

function PublicHostRedirect() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const hostname = String(window.location.hostname || "").trim();
    if (!isSuspendedPublicFrontendHost(hostname)) return;

    const targetOrigin = configuredPublicFrontendOrigin();
    if (!targetOrigin || targetOrigin === window.location.origin) return;

    window.location.replace(
      `${targetOrigin}${window.location.pathname}${window.location.search}${window.location.hash}`
    );
  }, []);

  return null;
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <PublicHostRedirect />
      <GlobalSessionResetGate>
        <RememberAuthenticatedAppRoute />
        <Routes>
          <Route path="/" element={<Navigate to="/cover" replace />} />
          <Route path="/reset" element={<PublicSessionReset />} />

      <Route
        path="/cover"
        element={
          <PublicEntryGuard>
            <CoverPage />
          </PublicEntryGuard>
        }
      />
      <Route
        path="/welcome"
        element={
          <PublicEntryGuard>
            <WelcomePage />
          </PublicEntryGuard>
        }
      />
      <Route path="/guide" element={<MyGMFNAndIPage />} />
      <Route path="/my-gmfn-and-i" element={<PreserveRedirect to="/guide" />} />

      <Route path="/dashboard" element={<PreserveRedirect to={APP_ROUTES.DASHBOARD} />} />
      <Route path="/notifications" element={<PreserveRedirect to={APP_ROUTES.NOTIFICATIONS} />} />
      <Route path="/action-inbox" element={<PreserveRedirect to={APP_ROUTES.NOTIFICATIONS} />} />
      <Route path="/inbox" element={<PreserveRedirect to={APP_ROUTES.NOTIFICATIONS} />} />
      <Route path="/profile" element={<PreserveRedirect to={APP_ROUTES.PROFILE} />} />

      <Route path="/finance" element={<PreserveRedirect to={APP_ROUTES.FINANCE} />} />
      <Route path="/finances" element={<PreserveRedirect to={APP_ROUTES.FINANCE} />} />
      <Route path="/financials" element={<PreserveRedirect to={APP_ROUTES.FINANCE} />} />
      <Route path="/open-finance" element={<PreserveRedirect to={APP_ROUTES.FINANCE} />} />
      <Route path="/finance-overview" element={<PreserveRedirect to={APP_ROUTES.FINANCE} />} />
      <Route path="/finance-meter" element={<PreserveRedirect to={APP_ROUTES.FINANCE} />} />

      <Route path="/money-in" element={<PreserveRedirect to={APP_ROUTES.MONEY_IN} />} />
      <Route path="/payment/pool" element={<PreserveRedirect to={APP_ROUTES.MONEY_IN} />} />

      <Route path="/money-out" element={<PreserveRedirect to={APP_ROUTES.MONEY_OUT} />} />
      <Route
        path="/withdrawal-instructions"
        element={<PreserveRedirect to={APP_ROUTES.MONEY_OUT} />}
      />

      <Route path="/marketplace" element={<PreserveRedirect to={APP_ROUTES.MARKETPLACE} />} />
      <Route path="/market" element={<PreserveRedirect to={APP_ROUTES.MARKETPLACE} />} />
      <Route path="/open-marketplace" element={<PreserveRedirect to={APP_ROUTES.MARKETPLACE} />} />
      <Route
        path="/free-spotlight"
        element={<PreserveRedirect to={APP_ROUTES.FREE_SPOTLIGHT} />}
      />
      <Route
        path="/paid-spotlight"
        element={<PreserveRedirect to={APP_ROUTES.SUBSCRIPTION_SPOTLIGHT} />}
      />
      <Route path="/shop-control" element={<PreserveRedirect to={APP_ROUTES.SHOP_ME} />} />
      <Route path="/shop-manager" element={<PreserveRedirect to={APP_ROUTES.SHOP_ME} />} />
      <Route path="/shop-assets" element={<PreserveRedirect to={APP_ROUTES.SHOP_ASSETS} />} />
      <Route path="/vault-control" element={<PreserveRedirect to={APP_ROUTES.VAULT_CONTROL} />} />

      <Route path="/trust" element={<PreserveRedirect to={APP_ROUTES.TRUST} />} />
      <Route path="/trust-passport" element={<PreserveRedirect to={APP_ROUTES.TRUST} />} />
      <Route path="/open-trust" element={<PreserveRedirect to={APP_ROUTES.TRUST} />} />

      <Route path="/trust-slip" element={<PreserveRedirect to={APP_ROUTES.TRUST_SLIP} />} />
      <Route path="/trustslip" element={<PreserveRedirect to={APP_ROUTES.TRUST_SLIP} />} />
      <Route
        path="/community-confirmations"
        element={<PreserveRedirect to={APP_ROUTES.COMMUNITY_CONFIRMATION_INBOX} />}
      />
      <Route
        path="/community-confirmation-inbox"
        element={<PreserveRedirect to={APP_ROUTES.COMMUNITY_CONFIRMATION_INBOX} />}
      />
      <Route
        path="/trust-slip/verify"
        element={<PreserveRedirect to={APP_ROUTES.MERCHANT_VERIFY} />}
      />
      <Route
        path="/trustslip/verify"
        element={<PreserveRedirect to={APP_ROUTES.MERCHANT_VERIFY} />}
      />
      <Route
        path="/open-trust-slip"
        element={<PreserveRedirect to={APP_ROUTES.TRUST_SLIP} />}
      />
      <Route
        path="/merchant-verify"
        element={<PreserveRedirect to={APP_ROUTES.TRUST_SLIP} />}
      />
      <Route
        path="/verify-merchant"
        element={<PreserveRedirect to={APP_ROUTES.TRUST_SLIP} />}
      />

      <Route path="/identity" element={<PreserveRedirect to={APP_ROUTES.CCI} />} />
      <Route
        path="/identity-integrity"
        element={<PreserveRedirect to={APP_ROUTES.CCI} />}
      />
      <Route path="/cci" element={<PreserveRedirect to={APP_ROUTES.CCI} />} />

      <Route path="/loans" element={<PreserveRedirect to={APP_ROUTES.LOANS} />} />
      <Route
        path="/loan-readiness"
        element={<PreserveRedirect to={APP_ROUTES.LOAN_READINESS} />}
      />
      <Route
        path="/loan-suggestions"
        element={<PreserveRedirect to={APP_ROUTES.LOAN_SUGGESTIONS} />}
      />
      <Route
        path="/loan-workbench"
        element={<PreserveRedirect to={APP_ROUTES.LOAN_WORKBENCH} />}
      />

      <Route path="/community" element={<PreserveRedirect to={APP_ROUTES.COMMUNITY} />} />
      <Route path="/community-home" element={<PreserveRedirect to={APP_ROUTES.COMMUNITY} />} />
      <Route path="/community-tools" element={<PreserveRedirect to={APP_ROUTES.COMMUNITY} />} />
      <Route path="/control-room" element={<PreserveRedirect to={APP_ROUTES.COMMUNITY} />} />

      <Route path="/demand-box" element={<PreserveRedirect to={APP_ROUTES.DEMAND_BOX} />} />
      <Route path="/demands" element={<PreserveRedirect to={APP_ROUTES.DEMAND_BOX} />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/existing" element={<RedirectToCover entry="existing" />} />
      <Route path="/start" element={<RedirectToCover entry="create" />} />
      <Route path="/start/create" element={<RedirectToCover entry="create" />} />
      <Route path="/start/community" element={<RedirectToCover entry="create" />} />
      <Route path="/start/existing" element={<RedirectToCover entry="existing" />} />
      <Route path="/start/member" element={<RedirectToCover entry="existing" />} />
      <Route path="/start/login" element={<RedirectToCover entry="existing" />} />

      <Route path="/create" element={<CreateEntryPage />} />
      <Route path="/register" element={<PreserveRedirect to="/create" />} />
      <Route path="/founder" element={<RedirectToCover entry="create" />} />
      <Route path="/public-create" element={<RedirectToCover entry="create" />} />

      <Route path="/join" element={<JoinEntryPage />} />
      <Route path="/join/:code" element={<JoinEntryPage />} />
      <Route path="/join/community/:clanId" element={<JoinEntryPage />} />
      <Route path="/invite-composer-preview" element={<Navigate to="/cover" replace />} />
      <Route
        path="/start/join/:code"
        element={<JoinEntryPage />}
      />
      <Route
        path="/start/invite/:code"
        element={<JoinEntryPage />}
      />
      <Route
        path="/invite/:code"
        element={<JoinEntryPage />}
      />
      <Route
        path="/get-invite/:code"
        element={<JoinEntryPage />}
      />

      <Route path="/pending-approval" element={<JoinRequestPendingPage />} />
      <Route
        path="/join-request/pending"
        element={<PreserveRedirect to="/pending-approval" />}
      />

      <Route path="/join-approval/:requestId" element={<JoinApprovalPage />} />
      <Route path="/approved" element={<RedirectToCover entry="approved" />} />
      <Route
        path="/approved/:requestId"
        element={
          <RedirectToCover
            entry="approved"
            sourceParam="requestId"
            targetQueryKey="request_id"
          />
        }
      />

      <Route
        path="/activate"
        element={<PreserveRedirect to="/activate-membership" />}
      />
      <Route path="/activate-membership" element={<MemberActivationPage />} />

      <Route path="/t/:code" element={<TrustSlipVerifyPage />} />
      <Route path="/verify/trust-slip" element={<TrustSlipVerifyPage />} />
      <Route path="/verify/trustslip" element={<TrustSlipVerifyPage />} />
      <Route path="/trust-slips/verify/:code" element={<TrustSlipVerifyPage />} />
      <Route path="/trust-slips/verify/:code/page" element={<TrustSlipVerifyPage />} />
      <Route path="/trust-slips/verify/:code/lite" element={<TrustSlipVerifyPage />} />
      <Route path="/trust-slips/verify/:code/print" element={<TrustSlipVerifyPage />} />
      <Route
        path="/community-confirmations/public/:token"
        element={<CommunityConfirmationOutcomePage />}
      />
      <Route path="/verify/community/:communityKey" element={<CommunityVerifyPage />} />
      <Route path="/shop/:gmfnId" element={<ShopGalleryPage />} />
      <Route path="/shop-gallery/:gmfnId" element={<RedirectPublicShopAlias />} />
      <Route path="/open-shop/:gmfnId" element={<RedirectPublicShopAlias />} />

      <Route path="/vault/:token" element={<ShopAccessPage />} />
      <Route path="/shop-access/:token" element={<RedirectVaultAlias />} />
      <Route path="/vault-shop-access/:token" element={<RedirectVaultAlias />} />

      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />

        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="home" element={<PreserveRedirect to={APP_ROUTES.DASHBOARD} />} />
        <Route
          path="main-dashboard"
          element={<PreserveRedirect to={APP_ROUTES.DASHBOARD} />}
        />
        <Route
          path="member-home"
          element={<PreserveRedirect to={APP_ROUTES.DASHBOARD} />}
        />

        <Route path="clans" element={<PreserveRedirect to={APP_ROUTES.COMMUNITY} />} />
        <Route path="create-community" element={<Navigate to="/create" replace />} />
        <Route path="new-community" element={<Navigate to="/create" replace />} />

        <Route path="community" element={<CommunityHomePage />} />
        <Route path="community-home" element={<PreserveRedirect to={APP_ROUTES.COMMUNITY} />} />
        <Route path="community-tools" element={<PreserveRedirect to={APP_ROUTES.COMMUNITY} />} />
        <Route path="community-tool" element={<PreserveRedirect to={APP_ROUTES.COMMUNITY} />} />
        <Route
          path="community/control-room"
          element={<PreserveRedirect to={APP_ROUTES.COMMUNITY} />}
        />
        <Route
          path="community/tools"
          element={<PreserveRedirect to={APP_ROUTES.COMMUNITY} />}
        />
        <Route
          path="community/workspace"
          element={<PreserveRedirect to={APP_ROUTES.COMMUNITY} />}
        />
        <Route path="open-community" element={<PreserveRedirect to={APP_ROUTES.COMMUNITY} />} />
        <Route
          path="open-community-home"
          element={<PreserveRedirect to={APP_ROUTES.COMMUNITY} />}
        />
        <Route path="control-room" element={<PreserveRedirect to={APP_ROUTES.COMMUNITY} />} />
        <Route path="command-room" element={<PreserveRedirect to={APP_ROUTES.COMMUNITY} />} />
        <Route path="community/:clanId" element={<CommunityHomePage />} />
        <Route
          path="community/:clanId/join-requests"
          element={<CommunityJoinRequestsPage />}
        />
        <Route path="join-requests" element={<PreserveRedirect to={APP_ROUTES.COMMUNITY} />} />

        <Route path="loans" element={<LoansPage />} />
        <Route path="loan-summary/:loanId" element={<LoanSummaryPage />} />
        <Route path="money" element={<PreserveRedirect to={APP_ROUTES.LOANS} />} />
        <Route path="support" element={<PreserveRedirect to={APP_ROUTES.LOANS} />} />
        <Route path="support-path" element={<PreserveRedirect to={APP_ROUTES.LOANS} />} />
        <Route path="loan-support" element={<PreserveRedirect to={APP_ROUTES.LOANS} />} />
        <Route path="loans-support" element={<PreserveRedirect to={APP_ROUTES.LOANS} />} />

        <Route path="finance" element={<FinancePage />} />
        <Route path="finances" element={<PreserveRedirect to={APP_ROUTES.FINANCE} />} />
        <Route path="financials" element={<PreserveRedirect to={APP_ROUTES.FINANCE} />} />
        <Route path="open-finance" element={<PreserveRedirect to={APP_ROUTES.FINANCE} />} />
        <Route path="finance-overview" element={<PreserveRedirect to={APP_ROUTES.FINANCE} />} />
        <Route path="finance-meter" element={<PreserveRedirect to={APP_ROUTES.FINANCE} />} />

        <Route path="payment/pool" element={<PaymentInstructionsPage />} />
        <Route path="payment/loans/:loanId" element={<RepaymentPage />} />
        <Route path="payment-rails" element={<PaymentRailsPage />} />
        <Route path="payment-rails-overview" element={<PreserveRedirect to="/app/payment-rails" />} />
        <Route path="payout-details" element={<PayoutDetailsPage />} />
        <Route path="pool" element={<PreserveRedirect to={APP_ROUTES.MONEY_IN} />} />
        <Route path="money-in" element={<PreserveRedirect to={APP_ROUTES.MONEY_IN} />} />

        <Route path="withdrawal-instructions" element={<WithdrawalInstructionsPage />} />
        <Route path="withdrawal" element={<PreserveRedirect to={APP_ROUTES.MONEY_OUT} />} />
        <Route path="money-out" element={<PreserveRedirect to={APP_ROUTES.MONEY_OUT} />} />

        <Route path="loan-readiness" element={<LoanReadinessPage />} />
        <Route
          path="readiness"
          element={<PreserveRedirect to={APP_ROUTES.LOAN_READINESS} />}
        />
        <Route path="loan-suggestions" element={<LoanSuggestionsPage />} />
        <Route
          path="suggestions"
          element={<PreserveRedirect to={APP_ROUTES.LOAN_SUGGESTIONS} />}
        />
        <Route path="loan-workbench" element={<LoanWorkbenchPage />} />
        <Route
          path="workbench"
          element={<PreserveRedirect to={APP_ROUTES.LOAN_WORKBENCH} />}
        />
        <Route path="guarantor-earnings" element={<GuarantorEarningsPage />} />
        <Route path="guarantor-inbox" element={<GuarantorInboxPage />} />
        <Route path="community-confirmations" element={<CommunityConfirmationInboxPage />} />
        <Route
          path="community-confirmations/policy"
          element={<CommunityConfirmationPolicyPage />}
        />
        <Route
          path="community-confirmation-policy"
          element={<PreserveRedirect to={APP_ROUTES.COMMUNITY_CONFIRMATION_POLICY} />}
        />
        <Route
          path="community-confirmation-inbox"
          element={<PreserveRedirect to={APP_ROUTES.COMMUNITY_CONFIRMATION_INBOX} />}
        />
        <Route path="earnings" element={<PreserveRedirect to="/app/guarantor-earnings" />} />

        <Route path="marketplace" element={<MarketplacePage />} />
        <Route path="market" element={<PreserveRedirect to={APP_ROUTES.MARKETPLACE} />} />
        <Route
          path="open-marketplace"
          element={<PreserveRedirect to={APP_ROUTES.MARKETPLACE} />}
        />
        <Route
          path="marketplace/community/:clanId"
          element={<RedirectCommunityMarketplaceAlias />}
        />
        <Route
          path="marketplace/demand-box"
          element={<PreserveRedirect to={APP_ROUTES.DEMAND_BOX} />}
        />
        <Route path="demand-box" element={<DemandBoxPage />} />
        <Route path="demands" element={<PreserveRedirect to={APP_ROUTES.DEMAND_BOX} />} />
        <Route path="open-demand" element={<PreserveRedirect to={APP_ROUTES.DEMAND_BOX} />} />

        <Route path="shop-control" element={<ShopControlPage />} />
        <Route
          path="spotlight"
          element={<PreserveRedirect to={APP_ROUTES.FREE_SPOTLIGHT} />}
        />
        <Route
          path="shop-spotlight"
          element={<PreserveRedirect to={APP_ROUTES.FREE_SPOTLIGHT} />}
        />
        <Route
          path="shop-control/spotlight"
          element={<PreserveRedirect to={APP_ROUTES.FREE_SPOTLIGHT} />}
        />
        <Route
          path="shop-control/free-spotlight"
          element={<PreserveRedirect to={APP_ROUTES.FREE_SPOTLIGHT} />}
        />
        <Route
          path="subscription-spotlight"
          element={<PreserveRedirect to={APP_ROUTES.SUBSCRIPTION_SPOTLIGHT} />}
        />
        <Route
          path="shop-control/paid-spotlight"
          element={<PreserveRedirect to={APP_ROUTES.SUBSCRIPTION_SPOTLIGHT} />}
        />
        <Route
          path="shop-control/subscription-spotlight"
          element={<SubscriptionSpotlightPage />}
        />
        <Route
          path="shop-gallery-control"
          element={<PreserveRedirect to="/app/shop-control#shop-control-gallery-tools" />}
        />
        <Route
          path="vault-control"
          element={<VaultControlPage />}
        />
        <Route
          path="free-spotlight"
          element={<PreserveRedirect to="/app/shop-control#shop-control-spotlight" />}
        />
        <Route
          path="paid-spotlight"
          element={<PreserveRedirect to="/app/shop-control/subscription-spotlight" />}
        />
        <Route path="shop-assets" element={<ShopAssetsPage />} />
        <Route path="shop-assets-page" element={<PreserveRedirect to={APP_ROUTES.SHOP_ASSETS} />} />
        <Route path="shop-manager" element={<PreserveRedirect to="/app/shop-control" />} />
        <Route path="shop" element={<PreserveRedirect to={APP_ROUTES.SHOP_ME} />} />
        <Route path="my-shop" element={<PreserveRedirect to={APP_ROUTES.SHOP_ME} />} />
        <Route path="shop/me" element={<PreserveRedirect to={APP_ROUTES.SHOP_ME} />} />
        <Route path="open-shop" element={<PreserveRedirect to={APP_ROUTES.SHOP_ME} />} />
        <Route path="open-shop/me" element={<PreserveRedirect to={APP_ROUTES.SHOP_ME} />} />
        <Route path="open-shop/:gmfnId" element={<RedirectPublicShopAlias />} />
        <Route path="shop/:gmfnId" element={<RedirectPublicShopAlias />} />
        <Route path="shop-gallery" element={<PreserveRedirect to={APP_ROUTES.SHOP_ME} />} />
        <Route path="shop-gallery/me" element={<PreserveRedirect to={APP_ROUTES.SHOP_ME} />} />
        <Route path="shop-gallery/:gmfnId" element={<RedirectPublicShopAlias />} />

        <Route path="trust" element={<TrustScorePage />} />
        <Route path="open-trust-reading" element={<OpenTrustPage />} />
        <Route path="trust-passport" element={<PreserveRedirect to={APP_ROUTES.TRUST} />} />
        <Route path="open-trust" element={<PreserveRedirect to={APP_ROUTES.TRUST} />} />
        <Route path="trust-slip" element={<TrustSlipPage />} />
        <Route path="trustslip" element={<PreserveRedirect to={APP_ROUTES.TRUST_SLIP} />} />
        <Route path="open-trust-slip" element={<PreserveRedirect to={APP_ROUTES.TRUST_SLIP} />} />
        <Route path="merchant-verify" element={<PreserveRedirect to={APP_ROUTES.TRUST_SLIP} />} />
        <Route path="verify-merchant" element={<PreserveRedirect to={APP_ROUTES.TRUST_SLIP} />} />
        <Route path="trust-slip/verify" element={<TrustSlipVerifyPage />} />

        <Route path="identity" element={<IdentityIntegrityPage />} />
        <Route path="cci-reading" element={<CCIReadingPage />} />
        <Route path="identity-integrity" element={<PreserveRedirect to={APP_ROUTES.CCI} />} />
        <Route path="cci" element={<PreserveRedirect to={APP_ROUTES.CCI} />} />

        <Route path="build-first-circle" element={<BuildFirstCirclePage />} />
        <Route
          path="first-circle"
          element={<PreserveRedirect to="/app/build-first-circle" />}
        />
        <Route
          path="grow-your-circle"
          element={<PreserveRedirect to="/app/build-first-circle" />}
        />
        <Route path="circle" element={<PreserveRedirect to="/app/build-first-circle" />} />
        <Route
          path="circle-builder"
          element={<PreserveRedirect to="/app/build-first-circle" />}
        />

        <Route path="notifications" element={<NotificationsPage />} />
        <Route
          path="action-inbox"
          element={<PreserveRedirect to={APP_ROUTES.NOTIFICATIONS} />}
        />
        <Route path="inbox" element={<PreserveRedirect to={APP_ROUTES.NOTIFICATIONS} />} />

        <Route path="profile" element={<PreserveRedirect to={APP_ROUTES.PROFILE} />} />
        <Route path="my-gmfn-and-i" element={<MyGMFNAndIPage />} />
        <Route
          path="my-gmfn-and-i/settings"
          element={<PreserveRedirect to={APP_ROUTES.SETTINGS} />}
        />
        <Route path="settings" element={<PreserveRedirect to={APP_ROUTES.SETTINGS} />} />
        <Route
          path="workspace-settings"
          element={<PreserveRedirect to={APP_ROUTES.SETTINGS} />}
        />
        <Route path="member-guide" element={<PreserveRedirect to={APP_ROUTES.GUIDE} />} />
        <Route path="guide" element={<PreserveRedirect to={APP_ROUTES.GUIDE} />} />

        <Route
          path="command-center"
          element={
            <RequireAuth requireRole="adminOrClanAdmin">
              <Outlet />
            </RequireAuth>
          }
        >
          <Route index element={<TrustCommandCentrePage />} />
          <Route path="bank-console" element={<BankConsolePage />} />
          <Route path="revenue-allocation" element={<RevenueAllocationPage />} />
          <Route path="exposure" element={<ExposureAdminPage />} />
          <Route
            element={
              <RequireAuth requireRole="admin">
                <Outlet />
              </RequireAuth>
            }
          >
            <Route path="trust-analytics" element={<TrustAnalyticsPage />} />
            <Route path="trust-events" element={<AdminTrustEventsPage />} />
            <Route path="identity-risk" element={<AdminIdentityRiskPage />} />
            <Route path="incomplete-loans" element={<AdminIncompleteLoansPage />} />
            <Route path="system-operations" element={<SystemOperationsPage />} />
            <Route path="trust-graph" element={<AdminTrustGraphPage />} />
          </Route>
        </Route>

        <Route
          path="trust-command-centre"
          element={<PreserveRedirect to="/app/command-center" />}
        />
        <Route
          path="trust-analytics"
          element={<PreserveRedirect to="/app/command-center/trust-analytics" />}
        />
        <Route
          path="trust-events"
          element={<PreserveRedirect to="/app/command-center/trust-events" />}
        />
        <Route
          path="identity-risk"
          element={<PreserveRedirect to="/app/command-center/identity-risk" />}
        />
        <Route
          path="incomplete-loans"
          element={<PreserveRedirect to="/app/command-center/incomplete-loans" />}
        />
        <Route
          path="bank-console"
          element={<PreserveRedirect to="/app/command-center/bank-console" />}
        />
        <Route
          path="revenue-allocation"
          element={<PreserveRedirect to="/app/command-center/revenue-allocation" />}
        />
        <Route
          path="system-operations"
          element={<PreserveRedirect to="/app/command-center/system-operations" />}
        />
        <Route
          path="admin/exposure"
          element={<PreserveRedirect to="/app/command-center/exposure" />}
        />
        <Route
          path="admin/trust-events"
          element={<PreserveRedirect to="/app/command-center/trust-events" />}
        />
        <Route
          path="admin/identity-risk"
          element={<PreserveRedirect to="/app/command-center/identity-risk" />}
        />
        <Route
          path="admin/incomplete-loans"
          element={<PreserveRedirect to="/app/command-center/incomplete-loans" />}
        />
        <Route
          path="admin/revenue-allocation"
          element={<PreserveRedirect to="/app/command-center/revenue-allocation" />}
        />
        <Route
          path="admin/bank-console"
          element={<PreserveRedirect to="/app/command-center/bank-console" />}
        />
        <Route
          path="admin/payment-rails"
          element={<PreserveRedirect to="/app/payment-rails" />}
        />
        <Route
          path="admin/trust-graph"
          element={<PreserveRedirect to="/app/command-center/trust-graph" />}
        />
      </Route>

        <Route path="*" element={<RedirectUnknownRoute />} />
        </Routes>
      </GlobalSessionResetGate>
    </Suspense>
  );
}
