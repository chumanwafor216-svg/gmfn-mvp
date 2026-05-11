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

type SmokeRoute = {
  to: string;
  label: string;
  note?: string;
};

const memberRoutes: SmokeRoute[] = [
  {
    to: "/welcome",
    label: "Welcome",
    note: "Confirm public entry still leads cleanly into login after logout.",
  },
  {
    to: "/login?force=1",
    label: "Login",
    note: "Use this after logout to confirm clean re-entry without stale protected-screen state.",
  },
  { to: "/app/dashboard", label: "Dashboard" },
  {
    to: "/app/community",
    label: "Community Home",
    note: "Check that the spotlight management block restores the current live community spotlight state after refresh.",
  },
  { to: "/app/clans", label: "My Communities" },
  { to: "/app/marketplace", label: "Marketplace" },
  { to: "/app/finance", label: "Finance" },
  { to: "/app/payment/pool?currency=NGN", label: "Money In" },
  { to: "/app/withdrawal-instructions", label: "Money Out" },
  { to: "/app/payment-rails", label: "Payment Rails" },
  { to: "/app/payout-details", label: "Payout Details" },
  { to: "/app/guarantor-earnings", label: "Guarantor Earnings" },
  { to: "/app/loan-readiness", label: "Readiness Review" },
  {
    to: "/app/borrower-preflight",
    label: "Borrower Preflight",
    note: "Should hand members into readiness and Commitment Builder without breaking the guided support chain.",
  },
  { to: "/app/loan-suggestions", label: "Guided Suggestions" },
  { to: "/app/loan-workbench", label: "Workbench" },
  {
    to: "/app/dashboard#focus-commitments",
    label: "Commitment Builder",
    note: "Should land on the live dashboard commitment page, not only the dashboard top.",
  },
  { to: "/app/trust", label: "Trust Passport" },
  { to: "/app/trust-slip", label: "TrustSlip" },
  { to: "/app/identity", label: "Identity Integrity" },
  { to: "/app/notifications", label: "Notifications" },
  { to: "/app/settings", label: "Settings" },
  {
    to: "/app/shop-control",
    label: "Shop Control",
    note: "Confirm free and paid spotlight tools both load, and the current live spotlight block reflects backend truth.",
  },
  {
    to: "/app/shop",
    label: "Shop Alias",
    note: "Should redirect into the live shop control route without dropping route context.",
  },
  {
    to: "/app/open-shop",
    label: "Owner Open Shop Alias",
    note: "Internal owner alias only. Public share aliases with a GSN ID should land on the root /shop/:gmfnId public shop.",
  },
  { to: "/app/shop-assets", label: "Shop Assets" },
  {
    to: "/app/shop-gallery",
    label: "Owner Shop Gallery Alias",
    note: "Internal owner alias only. Public /shop-gallery/:gmfnId aliases should redirect to the root /shop/:gmfnId public shop.",
  },
];

const adminRoutes: SmokeRoute[] = [
  { to: "/app/command-center", label: "Command Center" },
  { to: "/app/command-center/trust-analytics", label: "Trust Analytics" },
  { to: "/app/command-center/trust-events", label: "Trust Events" },
  { to: "/app/command-center/exposure", label: "Safety & Risk" },
  { to: "/app/command-center/trust-graph", label: "Trust Graph" },
  { to: "/app/command-center/identity-risk", label: "Identity Risk" },
  { to: "/app/command-center/incomplete-loans", label: "Incomplete Loans" },
  { to: "/app/command-center/revenue-allocation", label: "Revenue Allocation" },
  { to: "/app/command-center/bank-console", label: "Bank Console" },
  { to: "/app/command-center/system-operations", label: "System Operations" },
  {
    to: "/app/admin/trust-events",
    label: "Legacy Trust Events Alias",
    note: "Should redirect into Command Center.",
  },
  {
    to: "/app/admin/payment-rails",
    label: "Legacy Payment Rails Alias",
    note: "Should redirect into the live Payment Rails page.",
  },
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

function noteStyle(): React.CSSProperties {
  return {
    marginTop: 4,
    color: "#64748B",
    fontSize: 12,
    lineHeight: 1.6,
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
          Open each live page once. Confirm it loads without crash, blank screen, broken redirect,
          or missing import failure.
        </div>
        <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.8 }}>
          This checklist should also cover guided handoff routes such as Commitment Builder and borrower
          preflight, not only top-level pages.
        </div>
        <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.8 }}>
          Spotlight checks matter here too: verify dashboard, community, shop control, and shop aliases
          all resolve to the current live spotlight pages without stale redirects.
        </div>
      </div>

      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={card()}>
          <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>Member Routes</div>
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {memberRoutes.map((route) => (
              <div key={route.to}>
                <Link to={route.to} style={linkStyle()}>
                  {route.label}
                </Link>
                {route.note ? <div style={noteStyle()}>{route.note}</div> : null}
              </div>
            ))}
          </div>
        </div>

        <div style={card()}>
          <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>Admin Routes</div>
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {adminRoutes.map((route) => (
              <div key={route.to}>
                <Link to={route.to} style={linkStyle()}>
                  {route.label}
                </Link>
                {route.note ? <div style={noteStyle()}>{route.note}</div> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
