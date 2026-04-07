import React from "react";
import { Link } from "react-router-dom";

function card(): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

const memberRoutes = [
  ["/dashboard", "Dashboard"],
  ["/community", "Community Home"],
  ["/clans", "My Communities"],
  ["/loans", "Finances"],
  ["/payment/pool?currency=NGN", "Pool Deposit Instructions"],
  ["/withdrawal-instructions", "Withdrawal Instructions"],
  ["/guarantor-earnings", "Guarantor Earnings"],
  ["/borrower-preflight", "Support Readiness"],
  ["/loan-readiness", "Readiness Review"],
  ["/loan-suggestions", "Guided Suggestions"],
  ["/loan-decision", "Decision View"],
  ["/loan-workbench", "Workbench"],
  ["/trust", "Community Standing"],
  ["/trust-slip", "TrustSlip"],
  ["/identity", "Identity Integrity"],
  ["/notifications", "Notifications"],
  ["/pilot-showcase", "Pilot Showcase"],
  ["/settings", "Appearance"],
];

const adminRoutes = [
  ["/admin/exposure", "Safety & Risk"],
  ["/admin/incomplete-loans", "Incomplete Loans"],
  ["/admin/trust-events", "Audit Log"],
  ["/admin/trust-graph", "Trust Graph"],
  ["/admin/identity-risk", "Identity Risk"],
  ["/admin/revenue-allocation", "Revenue Allocation"],
  ["/admin/payment-rails", "Payment Rails"],
  ["/admin/liquidity", "Liquidity Console"],
  ["/admin/bank-console", "Bank Console"],
  ["/admin/system-operations", "System Operations"],
  ["/admin/seed", "Seed Demo"],
];

function linkStyle(): React.CSSProperties {
  return {
    display: "block",
    padding: "10px 12px",
    borderRadius: 12,
    textDecoration: "none",
    color: "#0B1F33",
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#F8FAFC",
    fontWeight: 800,
  };
}

export default function RouteSmokeCheckPage() {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 34, fontWeight: 1000, color: "#0B1F33" }}>
          Route Smoke Check
        </div>
        <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
          Open each page once. Confirm it loads without crash, blank screen, or missing import failure.
        </div>
      </div>

      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={card()}>
          <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>Member Routes</div>
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {memberRoutes.map(([to, label]) => (
              <Link key={to} to={to} style={linkStyle()}>
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div style={card()}>
          <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>Admin Routes</div>
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {adminRoutes.map(([to, label]) => (
              <Link key={to} to={to} style={linkStyle()}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}