import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

function shell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "280px 1fr",
    background: "#EEF5FB",
  };
}

function sidebar(): React.CSSProperties {
  return {
    background:
      "radial-gradient(circle at top left, rgba(59,130,246,0.18), transparent 30%), linear-gradient(180deg, #0B1F33 0%, #102F55 100%)",
    color: "#FFFFFF",
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    position: "sticky",
    top: 0,
    height: "100vh",
    overflowY: "auto",
  };
}

function brandBox(): React.CSSProperties {
  return {
    borderRadius: 20,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    padding: 16,
  };
}

function sectionTitle(): React.CSSProperties {
  return {
    fontSize: 12,
    fontWeight: 1000,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.72)",
    marginTop: 6,
  };
}

function navItem(active = false): React.CSSProperties {
  return {
    display: "block",
    padding: "12px 14px",
    borderRadius: 14,
    textDecoration: "none",
    fontWeight: 900,
    fontSize: 14,
    color: "#FFFFFF",
    background: active ? "#0B63D1" : "rgba(255,255,255,0.05)",
    border: active
      ? "1px solid rgba(255,255,255,0.08)"
      : "1px solid rgba(255,255,255,0.04)",
  };
}

function content(): React.CSSProperties {
  return {
    padding: 22,
    overflowX: "hidden",
  };
}

function noteBox(): React.CSSProperties {
  return {
    marginTop: 8,
    borderRadius: 14,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.06)",
    padding: 12,
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    lineHeight: 1.6,
  };
}

function isActive(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}

export default function AppLayout() {
  const location = useLocation();

  return (
    <div style={shell()}>
      <aside style={sidebar()}>
        <div style={brandBox()}>
          <div style={{ fontSize: 12, fontWeight: 1000, letterSpacing: "0.06em" }}>
            TRUST INFRASTRUCTURE WORKSPACE
          </div>
        </div>

        <div>
          <div style={sectionTitle()}>Main</div>
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            <Link
              to="/app/dashboard"
              style={navItem(isActive(location.pathname, "/app/dashboard"))}
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div>
          <div style={sectionTitle()}>My Community</div>
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            <Link
              to="/app/community"
              style={navItem(isActive(location.pathname, "/app/community"))}
            >
              Community Home
            </Link>
            <Link
              to="/app/clans"
              style={navItem(isActive(location.pathname, "/app/clans"))}
            >
              My Communities
            </Link>
          </div>
        </div>

        <div>
          <div style={sectionTitle()}>Support & Finances</div>
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            <Link
              to="/app/loans"
              style={navItem(isActive(location.pathname, "/app/loans"))}
            >
              Finances
            </Link>
            <Link
              to="/app/guarantor-earnings"
              style={navItem(isActive(location.pathname, "/app/guarantor-earnings"))}
            >
              Guarantor Earnings
            </Link>
            <Link
              to="/app/loan-readiness"
              style={navItem(isActive(location.pathname, "/app/loan-readiness"))}
            >
              Support Readiness
            </Link>
            <Link
              to="/app/loan-suggestions"
              style={navItem(isActive(location.pathname, "/app/loan-suggestions"))}
            >
              Guided Suggestions
            </Link>
            <Link
              to="/app/loan-workbench"
              style={navItem(isActive(location.pathname, "/app/loan-workbench"))}
            >
              Workbench
            </Link>
          </div>
        </div>

        <div>
          <div style={sectionTitle()}>Trust Infrastructure</div>
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            <Link
              to="/app/trust"
              style={navItem(isActive(location.pathname, "/app/trust"))}
            >
              Community Standing
            </Link>
            <Link
              to="/app/trust-slip"
              style={navItem(isActive(location.pathname, "/app/trust-slip"))}
            >
              TrustSlip
            </Link>
            <Link
              to="/app/trust-analytics"
              style={navItem(isActive(location.pathname, "/app/trust-analytics"))}
            >
              Trust Event Analytics
            </Link>
            <Link
              to="/app/trust-command-centre"
              style={navItem(isActive(location.pathname, "/app/trust-command-centre"))}
            >
              Trust Operations Centre
            </Link>
            <Link
              to="/app/my-gmfn-and-i"
              style={navItem(isActive(location.pathname, "/app/my-gmfn-and-i"))}
            >
              My GMFN and I
            </Link>
            <Link
              to="/app/identity"
              style={navItem(isActive(location.pathname, "/app/identity"))}
            >
              Identity Integrity
            </Link>
            <Link
              to="/app/notifications"
              style={navItem(isActive(location.pathname, "/app/notifications"))}
            >
              Notifications
            </Link>
          </div>
        </div>

        <div>
          <div style={sectionTitle()}>Community Activity</div>
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            <Link
              to="/app/marketplace"
              style={navItem(isActive(location.pathname, "/app/marketplace"))}
            >
              Marketplace
            </Link>
          </div>

          <div style={noteBox()}>
            Marketplace access is community-scoped. Enter through your communities,
            then open the marketplace view that belongs to the community you want to work in.
          </div>
        </div>

        <div>
          <div style={sectionTitle()}>Operations</div>
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            <Link
              to="/app/system-operations"
              style={navItem(isActive(location.pathname, "/app/system-operations"))}
            >
              System Operations
            </Link>
            <Link
              to="/app/admin/exposure"
              style={navItem(isActive(location.pathname, "/app/admin/exposure"))}
            >
              Safety & Risk
            </Link>
            <Link
              to="/app/admin/trust-graph"
              style={navItem(isActive(location.pathname, "/app/admin/trust-graph"))}
            >
              Relationship Graph
            </Link>
          </div>
        </div>
      </aside>

      <main style={content()}>
        <Outlet />
      </main>
    </div>
  );
}