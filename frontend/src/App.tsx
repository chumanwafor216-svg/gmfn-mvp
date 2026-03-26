import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import InviteInterestPage from "./pages/InviteInterestPage";
import JoinRequestPendingPage from "./pages/JoinRequestPendingPage";
import CoverPage from "./pages/CoverPage";
import CreateEntryPage from "./pages/CreateEntryPage";
import WelcomePage from "./pages/WelcomePage";
import ActivatePage from "./pages/ActivatePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import JoinEntryPage from "./pages/JoinEntryPage";
import DashboardPage from "./pages/DashboardPage";
import MarketplaceWorkspacePage from "./pages/MarketplaceWorkspacePage";
import ClansPage from "./pages/ClansPage";
import CommunityHomePage from "./pages/CommunityHomePage";
import LoansPage from "./pages/LoansPage";
import MarketplacePage from "./pages/MarketplacePage";
import ShopPage from "./pages/ShopPage";
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/cover" replace />} />

      <Route path="/cover" element={<CoverPage />} />
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/join" element={<JoinEntryPage />} />
      <Route path="/join/community/:clanId" element={<JoinEntryPage />} />

      <Route path="/create" element={<CreateEntryPage />} />

      <Route path="/activate" element={<ActivatePage />} />
      <Route path="/activate-membership" element={<MemberActivationPage />} />

      <Route path="/invite/:code" element={<InviteInterestPage />} />
      <Route path="/join-request/pending" element={<JoinRequestPendingPage />} />
      <Route path="/join-approval/:requestId" element={<JoinApprovalPage />} />
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
        <Route path="community" element={<CommunityHomePage />} />
        <Route path="community/:clanId" element={<CommunityHomePage />} />
        <Route
          path="community/:clanId/join-requests"
          element={<CommunityJoinRequestsPage />}
        />

        <Route path="loans" element={<LoansPage />} />
        <Route path="payment/pool" element={<PaymentInstructionsPage />} />
        <Route
          path="withdrawal-instructions"
          element={<WithdrawalInstructionsPage />}
        />
        <Route path="loan-readiness" element={<LoanReadinessPage />} />
        <Route path="loan-suggestions" element={<LoanSuggestionsPage />} />
        <Route path="loan-workbench" element={<LoanWorkbenchPage />} />
        <Route path="guarantor-earnings" element={<GuarantorEarningsPage />} />

        <Route path="marketplace" element={<MarketplacePage />} />
        <Route path="marketplace/demand-box" element={<DemandBoxPage />} />
        <Route path="demand-box" element={<DemandBoxPage />} />

        <Route path="shop-control" element={<ShopControlPage />} />
        <Route path="shop/:gmfn_id" element={<ShopPage />} />

        <Route path="trust" element={<TrustScorePage />} />
        <Route path="trust-slip" element={<TrustSlipPage />} />
        <Route path="trust-slip/verify" element={<TrustSlipVerifyPage />} />

        <Route path="identity" element={<IdentityIntegrityPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="my-gmfn-and-i" element={<MyGMFNAndIPage />} />

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
          <Route
            path="system-operations"
            element={<SystemOperationsPage />}
          />
          <Route path="exposure" element={<ExposureAdminPage />} />
          <Route path="trust-graph" element={<AdminTrustGraphPage />} />
        </Route>

        <Route
          path="trust-command-centre"
          element={<Navigate to="/app/command-center" replace />}
        />
        <Route
          path="trust-analytics"
          element={<Navigate to="/app/command-center/trust-analytics" replace />}
        />
        <Route
          path="system-operations"
          element={
            <Navigate to="/app/command-center/system-operations" replace />
          }
        />
        <Route
          path="admin/exposure"
          element={<Navigate to="/app/command-center/exposure" replace />}
        />
        <Route
          path="admin/trust-graph"
          element={<Navigate to="/app/command-center/trust-graph" replace />}
        />
      </Route>

      <Route path="*" element={<Navigate to="/cover" replace />} />
    </Routes>
  );
}