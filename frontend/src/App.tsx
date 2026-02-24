// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";

import CoverPage from "./pages/CoverPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ClansPage from "./pages/ClansPage";
import LoansPage from "./pages/LoansPage";
import SeedDemoPage from "./pages/SeedDemoPage";

import ApiPage from "./pages/ApiPage";
import TrustScorePage from "./pages/TrustScorePage";
import ExposureAdminPage from "./pages/ExposureAdminPage";

import AppLayout from "./layout/AppLayout";
import RequireAuth from "./components/RequireAuth";

import TrustSlipVerifyPage from "./pages/TrustSlipVerifyPage";
import AdminTrustEventsPage from "./pages/AdminTrustEventsPage";
import AdminIncompleteLoansPage from "./pages/AdminIncompleteLoansPage";
import JoinByInvitePage from "./pages/JoinByInvitePage";

import TrustSlipPage from "./pages/TrustSlipPage";
import PaymentInstructionsPage from "./pages/PaymentInstructionsPage";
import PilotShowcasePage from "./pages/PilotShowcasePage";

import CommunityHomePage from "./pages/CommunityHomePage";
import GuarantorInboxPage from "./pages/GuarantorInboxPage";
import AppearancePage from "./pages/AppearancePage";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/cover" element={<CoverPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/t/:code" element={<TrustSlipVerifyPage />} />

      {/* Start at cover */}
      <Route index element={<Navigate to="/cover" replace />} />

      {/* Authenticated shell */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="community" element={<CommunityHomePage />} />
        <Route path="clans" element={<ClansPage />} />

        <Route path="loans" element={<LoansPage />} />
        <Route path="guarantor" element={<GuarantorInboxPage />} />

        <Route path="trust" element={<TrustScorePage />} />
        <Route path="trust-slip" element={<TrustSlipPage />} />

        <Route path="payment/loans/:loanId" element={<PaymentInstructionsPage />} />
        <Route path="pilot-showcase" element={<PilotShowcasePage />} />
        <Route path="seed" element={<SeedDemoPage />} />
        <Route path="settings" element={<AppearancePage />} />

        <Route path="admin/trust-events" element={<AdminTrustEventsPage />} />
        <Route path="admin/incomplete-loans" element={<AdminIncompleteLoansPage />} />
        <Route
          path="exposure"
          element={
            <RequireAuth requireRole="admin">
              <ExposureAdminPage />
            </RequireAuth>
          }
        />

        <Route path="join/:code" element={<JoinByInvitePage />} />
        <Route path="api" element={<ApiPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/cover" replace />} />
    </Routes>
  );
}