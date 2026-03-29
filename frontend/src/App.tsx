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
import AppLayout from "./layout/AppLayout";
import RequireAuth from "./components/RequireAuth";
import CommunityJoinRequestsPage from "./pages/CommunityJoinRequestsPage";
import JoinApprovalPage from "./pages/JoinApprovalPage";
import MemberActivationPage from "./pages/MemberActivationPage";
import DemandBoxPage from "./pages/DemandBoxPage";
import JoinRequestPendingPage from "./pages/JoinRequestPendingPage";

type EntryMode = "general" | "create" | "invite" | "approved" | "existing";

function PreserveQueryRedirect(props: { to: string }) {
  const location = useLocation();
  return <Navigate to={`${props.to}${location.search}`} replace />;
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

  return <Navigate to={`/cover?${next.toString()}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/cover" replace />} />

      <Route path="/cover" element={<CoverPage />} />
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/guide" element={<MyGMFNAndIPage />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/existing" element={<RedirectToCover entry="existing" />} />

      <Route path="/create" element={<CreateEntryPage />} />
      <Route
        path="/register"
        element={<PreserveQueryRedirect to="/create" />}
      />
      <Route path="/founder" element={<RedirectToCover entry="create" />} />
      <Route
        path="/public-create"
        element={<RedirectToCover entry="create" />}
      />

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
        element={<PreserveQueryRedirect to="/pending-approval" />}
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
        element={<PreserveQueryRedirect to="/activate-membership" />}
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

        <Route path="clans" element={<ClansPage />} />
        <Route
          path="create-community"
          element={<Navigate to="/app/clans" replace />}
        />

        <Route path="community" element={<CommunityHomePage />} />
        <Route path="community/:clanId" element={<CommunityHomePage />} />
        <Route
          path="community/:clanId/join-requests"
          element={<CommunityJoinRequestsPage />}
        />

        <Route path="loans" element={<LoansPage />} />
        <Route path="money" element={<Navigate to="/app/loans" replace />} />

        <Route path="payment/pool" element={<PaymentInstructionsPage />} />
        <Route
          path="payment/loans/:loanId"
          element={<PaymentInstructionsPage />}
        />
        <Route
          path="withdrawal-instructions"
          element={<WithdrawalInstructionsPage />}
        />
        <Route path="loan-readiness" element={<LoanReadinessPage />} />
        <Route path="loan-suggestions" element={<LoanSuggestionsPage />} />
        <Route path="loan-workbench" element={<LoanWorkbenchPage />} />
        <Route path="guarantor-earnings" element={<GuarantorEarningsPage />} />

        <Route path="marketplace" element={<MarketplacePage />} />
        <Route
          path="marketplace/demand-box"
          element={<Navigate to="/app/demand-box" replace />}
        />
        <Route path="demand-box" element={<DemandBoxPage />} />

        <Route path="shop-control" element={<ShopControlPage />} />
        <Route path="shop" element={<Navigate to="/app/shop/me" replace />} />
        <Route path="shop/:gmfnId" element={<ShopGalleryPage />} />

        <Route path="trust" element={<TrustScorePage />} />
        <Route path="trust-slip" element={<TrustSlipPage />} />
        <Route path="trust-slip/verify" element={<TrustSlipVerifyPage />} />

        <Route path="identity" element={<IdentityIntegrityPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="my-gmfn-and-i" element={<MyGMFNAndIPage />} />
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
          element={<PreserveQueryRedirect to="/app/command-center" />}
        />
        <Route
          path="trust-analytics"
          element={
            <PreserveQueryRedirect to="/app/command-center/trust-analytics" />
          }
        />
        <Route
          path="system-operations"
          element={
            <PreserveQueryRedirect to="/app/command-center/system-operations" />
          }
        />
        <Route
          path="admin/exposure"
          element={<PreserveQueryRedirect to="/app/command-center/exposure" />}
        />
        <Route
          path="admin/trust-graph"
          element={
            <PreserveQueryRedirect to="/app/command-center/trust-graph" />
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/cover" replace />} />
    </Routes>
  );
}