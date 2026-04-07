import React from "react";
import {
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
  useParams,
} from "react-router-dom";

import CoverPage from "./pages/CoverPage";
import CreateEntryPage from "./pages/CreateEntryPage";
import WelcomePage from "./pages/WelcomePage";
import LoginPage from "./pages/LoginPage";
import JoinEntryPage from "./pages/JoinEntryPage";
import DashboardPage from "./pages/DashboardPage";
import MarketplaceWorkspacePage from "./pages/MarketplaceWorkspacePage";
import ClansPage from "./pages/ClansPage";
import CommunityHomePage from "./pages/CommunityHomePage";
import LoansPage from "./pages/LoansPage";
import MarketplacePage from "./pages/MarketplacePage";
import ShopGalleryPage from "./pages/ShopGalleryPage";
import TrustScorePage from "./pages/TrustScorePage";
import TrustSlipPage from "./pages/TrustSlipPage";
import TrustSlipVerifyPage from "./pages/TrustSlipVerifyPage";
import PaymentInstructionsPage from "./pages/PaymentInstructionsPage";
import WithdrawalInstructionsPage from "./pages/WithdrawalInstructionsPage";
import LoanReadinessPage from "./pages/LoanReadinessPage";
import LoanSuggestionsPage from "./pages/LoanSuggestionsPage";
import LoanWorkbenchPage from "./pages/LoanWorkbenchPage";
import GuarantorEarningsPage from "./pages/GuarantorEarningsPage";
import IdentityIntegrityPage from "./pages/IdentityIntegrityPage";
import NotificationsPage from "./pages/NotificationsPage";
import SystemOperationsPage from "./pages/SystemOperationsPage";
import ExposureAdminPage from "./pages/ExposureAdminPage";
import AdminTrustGraphPage from "./pages/AdminTrustGraphPage";
import MyGMFNAndIPage from "./pages/MyGMFNAndIPage";
import TrustAnalyticsPage from "./pages/TrustAnalyticsPage";
import TrustCommandCentrePage from "./pages/TrustCommandCentrePage";
import ShopControlPage from "./pages/ShopControlPage";
import BuildFirstCirclePage from "./pages/BuildFirstCirclePage";
import AppLayout from "./layout/AppLayout";
import RequireAuth from "./components/RequireAuth";
import CommunityJoinRequestsPage from "./pages/CommunityJoinRequestsPage";
import JoinApprovalPage from "./pages/JoinApprovalPage";
import MemberActivationPage from "./pages/MemberActivationPage";
import DemandBoxPage from "./pages/DemandBoxPage";
import JoinRequestPendingPage from "./pages/JoinRequestPendingPage";

type EntryMode = "general" | "create" | "invite" | "approved" | "existing";

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

function RedirectShopGalleryAlias() {
  const location = useLocation();
  const params = useParams<Record<string, string | undefined>>();
  const gmfnId = String(params.gmfnId || "me").trim();

  return (
    <Navigate
      to={mergeTargetWithCurrent(
        `/app/shop/${encodeURIComponent(gmfnId)}`,
        location.search,
        location.hash
      )}
      replace
    />
  );
}

function RedirectOpenShopAlias() {
  const location = useLocation();
  const params = useParams<Record<string, string | undefined>>();
  const gmfnId = String(params.gmfnId || "me").trim();

  return (
    <Navigate
      to={mergeTargetWithCurrent(
        `/app/shop/${encodeURIComponent(gmfnId)}`,
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
        clanId ? `/community/${encodeURIComponent(clanId)}` : "/app/marketplace",
        location.search,
        location.hash
      )}
      replace
    />
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/cover" replace />} />

      <Route path="/cover" element={<CoverPage />} />
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/guide" element={<MyGMFNAndIPage />} />
      <Route
        path="/my-gmfn-and-i"
        element={<PreserveRedirect to="/guide" />}
      />

      <Route path="/community-home" element={<PreserveRedirect to="/app/community" />} />
      <Route path="/community-tools" element={<PreserveRedirect to="/app/community" />} />
      <Route path="/control-room" element={<PreserveRedirect to="/app/community" />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/existing" element={<RedirectToCover entry="existing" />} />

      <Route path="/create" element={<CreateEntryPage />} />
      <Route path="/register" element={<PreserveRedirect to="/create" />} />
      <Route path="/founder" element={<RedirectToCover entry="create" />} />
      <Route path="/public-create" element={<RedirectToCover entry="create" />} />

      <Route path="/join" element={<JoinEntryPage />} />
      <Route path="/join/community/:clanId" element={<JoinEntryPage />} />
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
      <Route
        path="/activate-membership"
        element={<MemberActivationPage />}
      />

      <Route path="/t/:code" element={<TrustSlipVerifyPage />} />
      <Route path="/community/:clanId" element={<MarketplaceWorkspacePage />} />

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
        <Route path="home" element={<PreserveRedirect to="/app/dashboard" />} />
        <Route
          path="main-dashboard"
          element={<PreserveRedirect to="/app/dashboard" />}
        />
        <Route
          path="member-home"
          element={<PreserveRedirect to="/app/dashboard" />}
        />

        <Route path="clans" element={<ClansPage />} />
        <Route
          path="create-community"
          element={<Navigate to="/app/clans" replace />}
        />
        <Route
          path="new-community"
          element={<Navigate to="/app/clans" replace />}
        />

        <Route path="community" element={<CommunityHomePage />} />
        <Route
          path="community-home"
          element={<Navigate to="/app/community" replace />}
        />
        <Route
          path="community-tools"
          element={<PreserveRedirect to="/app/community" />}
        />
        <Route
          path="community-tool"
          element={<PreserveRedirect to="/app/community" />}
        />
        <Route
          path="community/control-room"
          element={<PreserveRedirect to="/app/community" />}
        />
        <Route
          path="community/tools"
          element={<PreserveRedirect to="/app/community" />}
        />
        <Route
          path="community/workspace"
          element={<PreserveRedirect to="/app/community" />}
        />
        <Route
          path="open-community"
          element={<PreserveRedirect to="/app/community" />}
        />
        <Route
          path="open-community-home"
          element={<PreserveRedirect to="/app/community" />}
        />
        <Route
          path="control-room"
          element={<PreserveRedirect to="/app/community" />}
        />
        <Route
          path="command-room"
          element={<PreserveRedirect to="/app/community" />}
        />
        <Route path="community/:clanId" element={<CommunityHomePage />} />
        <Route
          path="community/:clanId/join-requests"
          element={<CommunityJoinRequestsPage />}
        />
        <Route
          path="join-requests"
          element={<PreserveRedirect to="/app/community" />}
        />

        <Route path="loans" element={<LoansPage />} />
        <Route path="money" element={<Navigate to="/app/loans" replace />} />
        <Route
          path="support"
          element={<PreserveRedirect to="/app/loans" />}
        />
        <Route
          path="support-path"
          element={<PreserveRedirect to="/app/loans" />}
        />
        <Route
          path="loan-support"
          element={<PreserveRedirect to="/app/loans" />}
        />
        <Route
          path="loans-support"
          element={<PreserveRedirect to="/app/loans" />}
        />

        <Route path="payment/pool" element={<PaymentInstructionsPage />} />
        <Route
          path="payment/loans/:loanId"
          element={<PaymentInstructionsPage />}
        />
        <Route
          path="pool"
          element={<PreserveRedirect to="/app/payment/pool" />}
        />
        <Route
          path="money-in"
          element={<PreserveRedirect to="/app/payment/pool" />}
        />
        <Route
          path="withdrawal-instructions"
          element={<WithdrawalInstructionsPage />}
        />
        <Route
          path="withdrawal"
          element={<PreserveRedirect to="/app/withdrawal-instructions" />}
        />
        <Route
          path="money-out"
          element={<PreserveRedirect to="/app/withdrawal-instructions" />}
        />
        <Route path="loan-readiness" element={<LoanReadinessPage />} />
        <Route
          path="readiness"
          element={<PreserveRedirect to="/app/loan-readiness" />}
        />
        <Route path="loan-suggestions" element={<LoanSuggestionsPage />} />
        <Route
          path="suggestions"
          element={<PreserveRedirect to="/app/loan-suggestions" />}
        />
        <Route path="loan-workbench" element={<LoanWorkbenchPage />} />
        <Route
          path="workbench"
          element={<PreserveRedirect to="/app/loan-workbench" />}
        />
        <Route path="guarantor-earnings" element={<GuarantorEarningsPage />} />
        <Route
          path="earnings"
          element={<PreserveRedirect to="/app/guarantor-earnings" />}
        />

        <Route path="marketplace" element={<MarketplacePage />} />
        <Route
          path="market"
          element={<Navigate to="/app/marketplace" replace />}
        />
        <Route
          path="open-marketplace"
          element={<PreserveRedirect to="/app/marketplace" />}
        />
        <Route
          path="marketplace/community/:clanId"
          element={<RedirectCommunityMarketplaceAlias />}
        />
        <Route
          path="marketplace/demand-box"
          element={<Navigate to="/app/demand-box" replace />}
        />
        <Route path="demand-box" element={<DemandBoxPage />} />
        <Route
          path="demands"
          element={<PreserveRedirect to="/app/demand-box" />}
        />
        <Route
          path="open-demand"
          element={<PreserveRedirect to="/app/demand-box" />}
        />

        <Route path="shop-control" element={<ShopControlPage />} />
        <Route
          path="shop-manager"
          element={<PreserveRedirect to="/app/shop-control" />}
        />
        <Route path="shop" element={<Navigate to="/app/shop/me" replace />} />
        <Route
          path="my-shop"
          element={<Navigate to="/app/shop/me" replace />}
        />
        <Route
          path="open-shop"
          element={<PreserveRedirect to="/app/shop/me" />}
        />
        <Route path="open-shop/:gmfnId" element={<RedirectOpenShopAlias />} />
        <Route path="shop/:gmfnId" element={<ShopGalleryPage />} />
        <Route
          path="shop-gallery"
          element={<PreserveRedirect to="/app/shop/me" />}
        />
        <Route
          path="shop-gallery/:gmfnId"
          element={<RedirectShopGalleryAlias />}
        />

        <Route path="trust" element={<TrustScorePage />} />
        <Route
          path="trust-passport"
          element={<Navigate to="/app/trust" replace />}
        />
        <Route
          path="open-trust"
          element={<PreserveRedirect to="/app/trust" />}
        />
        <Route path="trust-slip" element={<TrustSlipPage />} />
        <Route
          path="trustslip"
          element={<Navigate to="/app/trust-slip" replace />}
        />
        <Route
          path="open-trust-slip"
          element={<PreserveRedirect to="/app/trust-slip" />}
        />
        <Route
          path="merchant-verify"
          element={<PreserveRedirect to="/app/trust-slip" />}
        />
        <Route
          path="verify-merchant"
          element={<PreserveRedirect to="/app/trust-slip" />}
        />
        <Route path="trust-slip/verify" element={<TrustSlipVerifyPage />} />

        <Route path="build-first-circle" element={<BuildFirstCirclePage />} />
        <Route
          path="first-circle"
          element={<PreserveRedirect to="/app/build-first-circle" />}
        />
        <Route
          path="grow-your-circle"
          element={<PreserveRedirect to="/app/build-first-circle" />}
        />
        <Route
          path="circle"
          element={<PreserveRedirect to="/app/build-first-circle" />}
        />
        <Route
          path="circle-builder"
          element={<PreserveRedirect to="/app/build-first-circle" />}
        />

        <Route path="identity" element={<IdentityIntegrityPage />} />
        <Route
          path="identity-integrity"
          element={<PreserveRedirect to="/app/identity" />}
        />

        <Route path="notifications" element={<NotificationsPage />} />
        <Route
          path="action-inbox"
          element={<PreserveRedirect to="/app/notifications" />}
        />
        <Route
          path="inbox"
          element={<PreserveRedirect to="/app/notifications" />}
        />

        <Route path="my-gmfn-and-i" element={<MyGMFNAndIPage />} />
        <Route
          path="my-gmfn-and-i/settings"
          element={
            <PreserveRedirect to="/app/my-gmfn-and-i?tab=settings" />
          }
        />
        <Route
          path="settings"
          element={
            <PreserveRedirect to="/app/my-gmfn-and-i?tab=settings" />
          }
        />
        <Route
          path="workspace-settings"
          element={
            <PreserveRedirect to="/app/my-gmfn-and-i?tab=settings" />
          }
        />
        <Route
          path="member-guide"
          element={<PreserveRedirect to="/app/my-gmfn-and-i" />}
        />
        <Route
          path="guide"
          element={<Navigate to="/app/my-gmfn-and-i" replace />}
        />

        <Route
          path="command-center"
          element={
            <RequireAuth requireRole="admin">
              <Outlet />
            </RequireAuth>
          }
        >
          <Route index element={<TrustCommandCentrePage />} />
          <Route path="trust-analytics" element={<TrustAnalyticsPage />} />
          <Route path="system-operations" element={<SystemOperationsPage />} />
          <Route path="exposure" element={<ExposureAdminPage />} />
          <Route path="trust-graph" element={<AdminTrustGraphPage />} />
        </Route>

        <Route
          path="trust-command-centre"
          element={<PreserveRedirect to="/app/command-center" />}
        />
        <Route
          path="trust-analytics"
          element={
            <PreserveRedirect to="/app/command-center/trust-analytics" />
          }
        />
        <Route
          path="system-operations"
          element={
            <PreserveRedirect to="/app/command-center/system-operations" />
          }
        />
        <Route
          path="admin/exposure"
          element={<PreserveRedirect to="/app/command-center/exposure" />}
        />
        <Route
          path="admin/trust-graph"
          element={
            <PreserveRedirect to="/app/command-center/trust-graph" />
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/cover" replace />} />
    </Routes>
  );
}