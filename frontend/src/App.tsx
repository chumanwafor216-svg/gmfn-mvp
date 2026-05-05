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
import { gmfnBrand } from "./styles/gmfnBrand";

const CoverPage = React.lazy(() => import("./pages/CoverPage"));
const CreateEntryPage = React.lazy(() => import("./pages/CreateEntryPage"));
const WelcomePage = React.lazy(() => import("./pages/WelcomePage"));
const LoginPage = React.lazy(() => import("./pages/LoginPage"));
const JoinEntryPage = React.lazy(() => import("./pages/JoinEntryPage"));
const DashboardPage = React.lazy(() => import("./pages/DashboardPage"));
const MarketplaceWorkspacePage = React.lazy(
  () => import("./pages/MarketplaceWorkspacePage")
);
const ClansPage = React.lazy(() => import("./pages/ClansPage"));
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
const InviteComposerPreviewPage = React.lazy(
  () => import("./pages/InviteComposerPreviewPage")
);

type EntryMode = "general" | "create" | "invite" | "approved" | "existing";

const APP_ROUTES = {
  DASHBOARD: "/app/dashboard",
  COMMUNITY: "/app/community",
  LOANS: "/app/loans",
  FINANCE: "/app/finance",
  MONEY_IN: "/app/payment/pool",
  MONEY_OUT: "/app/withdrawal-instructions",
  LOAN_READINESS: "/app/loan-readiness",
  LOAN_SUGGESTIONS: "/app/loan-suggestions",
  LOAN_WORKBENCH: "/app/loan-workbench",
  MARKETPLACE: "/app/marketplace",
  DEMAND_BOX: "/app/demand-box",
  TRUST: "/app/trust",
  TRUST_SLIP: "/app/trust-slip",
  CCI: "/app/identity",
  NOTIFICATIONS: "/app/notifications",
  GUIDE: "/app/my-gmfn-and-i",
  SETTINGS: "/app/my-gmfn-and-i?tab=settings",
  SHOP_ME: "/app/shop-control",
  SHOP_ASSETS: "/app/shop-assets",
} as const;

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
  const location = useLocation();
  const params = useParams<Record<string, string | undefined>>();
  const gmfnId = String(params.gmfnId || "").trim();

  return (
    <Navigate
      to={mergeTargetWithCurrent(
        gmfnId ? `/shop/${encodeURIComponent(gmfnId)}` : "/cover",
        location.search,
        location.hash
      )}
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
        clanId ? `/community/${encodeURIComponent(clanId)}` : APP_ROUTES.MARKETPLACE,
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

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/cover" replace />} />

      <Route path="/cover" element={<CoverPage />} />
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/guide" element={<MyGMFNAndIPage />} />
      <Route path="/my-gmfn-and-i" element={<PreserveRedirect to="/guide" />} />

      <Route path="/dashboard" element={<PreserveRedirect to={APP_ROUTES.DASHBOARD} />} />
      <Route path="/notifications" element={<PreserveRedirect to={APP_ROUTES.NOTIFICATIONS} />} />
      <Route path="/action-inbox" element={<PreserveRedirect to={APP_ROUTES.NOTIFICATIONS} />} />
      <Route path="/inbox" element={<PreserveRedirect to={APP_ROUTES.NOTIFICATIONS} />} />

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

      <Route path="/trust" element={<PreserveRedirect to={APP_ROUTES.TRUST} />} />
      <Route path="/trust-passport" element={<PreserveRedirect to={APP_ROUTES.TRUST} />} />
      <Route path="/open-trust" element={<PreserveRedirect to={APP_ROUTES.TRUST} />} />

      <Route path="/trust-slip" element={<PreserveRedirect to={APP_ROUTES.TRUST_SLIP} />} />
      <Route path="/trustslip" element={<PreserveRedirect to={APP_ROUTES.TRUST_SLIP} />} />
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
      <Route path="/invite-composer-preview" element={<InviteComposerPreviewPage />} />
      <Route
        path="/start/join/:code"
        element={
          <RedirectToCover
            entry="invite"
            sourceParam="code"
            targetQueryKey="invite_code"
          />
        }
      />
      <Route
        path="/start/invite/:code"
        element={
          <RedirectToCover
            entry="invite"
            sourceParam="code"
            targetQueryKey="invite_code"
          />
        }
      />
      <Route
        path="/invite/:code"
        element={
          <RedirectToCover
            entry="invite"
            sourceParam="code"
            targetQueryKey="invite_code"
          />
        }
      />
      <Route
        path="/get-invite/:code"
        element={
          <RedirectToCover
            entry="invite"
            sourceParam="code"
            targetQueryKey="invite_code"
          />
        }
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
      <Route path="/shop/:gmfnId" element={<ShopGalleryPage />} />
      <Route path="/shop-gallery/:gmfnId" element={<RedirectPublicShopAlias />} />
      <Route path="/open-shop/:gmfnId" element={<RedirectPublicShopAlias />} />
      <Route path="/community/:clanId" element={<MarketplaceWorkspacePage />} />

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

        <Route path="clans" element={<ClansPage />} />
        <Route path="create-community" element={<Navigate to="/app/clans" replace />} />
        <Route path="new-community" element={<Navigate to="/app/clans" replace />} />

        <Route path="community" element={<CommunityHomePage />} />
        <Route path="community-home" element={<Navigate to={APP_ROUTES.COMMUNITY} replace />} />
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
        <Route path="money" element={<Navigate to={APP_ROUTES.LOANS} replace />} />
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
        <Route path="earnings" element={<PreserveRedirect to="/app/guarantor-earnings" />} />

        <Route path="marketplace" element={<MarketplacePage />} />
        <Route path="market" element={<Navigate to={APP_ROUTES.MARKETPLACE} replace />} />
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
          element={<Navigate to={APP_ROUTES.DEMAND_BOX} replace />}
        />
        <Route path="demand-box" element={<DemandBoxPage />} />
        <Route path="demands" element={<PreserveRedirect to={APP_ROUTES.DEMAND_BOX} />} />
        <Route path="open-demand" element={<PreserveRedirect to={APP_ROUTES.DEMAND_BOX} />} />

        <Route path="shop-control" element={<ShopControlPage />} />
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
        <Route path="shop" element={<Navigate to={APP_ROUTES.SHOP_ME} replace />} />
        <Route path="my-shop" element={<Navigate to={APP_ROUTES.SHOP_ME} replace />} />
        <Route path="shop/me" element={<Navigate to={APP_ROUTES.SHOP_ME} replace />} />
        <Route path="open-shop" element={<PreserveRedirect to={APP_ROUTES.SHOP_ME} />} />
        <Route path="open-shop/me" element={<Navigate to={APP_ROUTES.SHOP_ME} replace />} />
        <Route path="open-shop/:gmfnId" element={<RedirectPublicShopAlias />} />
        <Route path="shop/:gmfnId" element={<RedirectPublicShopAlias />} />
        <Route path="shop-gallery" element={<PreserveRedirect to={APP_ROUTES.SHOP_ME} />} />
        <Route path="shop-gallery/me" element={<Navigate to={APP_ROUTES.SHOP_ME} replace />} />
        <Route path="shop-gallery/:gmfnId" element={<RedirectPublicShopAlias />} />

        <Route path="trust" element={<TrustScorePage />} />
        <Route path="open-trust-reading" element={<OpenTrustPage />} />
        <Route path="trust-passport" element={<Navigate to={APP_ROUTES.TRUST} replace />} />
        <Route path="open-trust" element={<PreserveRedirect to={APP_ROUTES.TRUST} />} />
        <Route path="trust-slip" element={<TrustSlipPage />} />
        <Route path="trustslip" element={<Navigate to={APP_ROUTES.TRUST_SLIP} replace />} />
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
        <Route path="guide" element={<Navigate to={APP_ROUTES.GUIDE} replace />} />

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

        <Route path="*" element={<Navigate to="/cover" replace />} />
      </Routes>
    </Suspense>
  );
}
