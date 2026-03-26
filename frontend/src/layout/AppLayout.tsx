import React, { useEffect, useMemo, useState } from "react";
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

function groupBox(): React.CSSProperties {
  return {
    borderRadius: 18,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.05)",
    padding: 10,
  };
}

function groupHeader(active = false): React.CSSProperties {
  return {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 14,
    border: active
      ? "1px solid rgba(255,255,255,0.10)"
      : "1px solid rgba(255,255,255,0.04)",
    background: active ? "rgba(11,99,209,0.28)" : "rgba(255,255,255,0.03)",
    color: "#FFFFFF",
    fontWeight: 1000,
    fontSize: 14,
    cursor: "pointer",
    textAlign: "left",
  };
}

function navItem(active = false): React.CSSProperties {
  return {
    display: "block",
    padding: "11px 12px",
    borderRadius: 12,
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

type NavLinkItem = {
  label: string;
  to: string;
};

type NavGroup = {
  key: string;
  label: string;
  hint?: string;
  adminOnly?: boolean;
  items: NavLinkItem[];
};

export default function AppLayout() {
  const location = useLocation();

  const isAdmin = useMemo(() => {
    try {
      return (localStorage.getItem("gmfn_role") || "").toLowerCase() === "admin";
    } catch {
      return false;
    }
  }, []);

  const groups: NavGroup[] = useMemo(
    () => [
      {
        key: "home",
        label: "Home",
        hint: "Start from your main workspace.",
        items: [{ label: "Dashboard", to: "/app/dashboard" }],
      },
      {
        key: "community",
        label: "Community",
        hint: "Your private community hub and related member tools.",
        items: [
          { label: "Community Home", to: "/app/community" },
          { label: "My Communities", to: "/app/clans" },
          { label: "My Shop Tools", to: "/app/shop-control" },
        ],
      },
      {
        key: "market",
        label: "Marketplace",
        hint: "Work inside community market flow and demand visibility.",
        items: [
          { label: "Browse Marketplace", to: "/app/marketplace" },
          { label: "Demand Box", to: "/app/demand-box" },
        ],
      },
      {
        key: "money",
        label: "Money and Support",
        hint: "Loans, readiness, guidance, workbench, and earnings.",
        items: [
          { label: "Loans and Support", to: "/app/loans" },
          { label: "Pool Payment", to: "/app/payment/pool" },
          { label: "Withdrawal Guidance", to: "/app/withdrawal-instructions" },
          { label: "Support Readiness", to: "/app/loan-readiness" },
          { label: "Helpful Suggestions", to: "/app/loan-suggestions" },
          { label: "Workbench", to: "/app/loan-workbench" },
          { label: "Guarantor Earnings", to: "/app/guarantor-earnings" },
        ],
      },
      {
        key: "trust",
        label: "Trust and Identity",
        hint: "Member-facing trust, identity, and notice surfaces only.",
        items: [
          { label: "My Trust", to: "/app/trust" },
          { label: "TrustSlip", to: "/app/trust-slip" },
          { label: "Identity Integrity", to: "/app/identity" },
          { label: "Notifications", to: "/app/notifications" },
        ],
      },
      {
        key: "guide",
        label: "My GSN",
        hint: "Read the guide and understand how the system works.",
        items: [{ label: "My GMFN and I", to: "/app/my-gmfn-and-i" }],
      },
      {
        key: "admin",
        label: "Command Center",
        hint: "Restricted system oversight, analytics, and admin tools.",
        adminOnly: true,
        items: [
          { label: "Command Center Home", to: "/app/command-center" },
          {
            label: "Trust Analytics",
            to: "/app/command-center/trust-analytics",
          },
          {
            label: "System Operations",
            to: "/app/command-center/system-operations",
          },
          { label: "Safety and Risk", to: "/app/command-center/exposure" },
          {
            label: "Relationship Graph",
            to: "/app/command-center/trust-graph",
          },
        ],
      },
    ],
    []
  );

  const firstOpenGroup = useMemo(() => {
    const found = groups.find((group) =>
      group.items.some((item) => isActive(location.pathname, item.to))
    );
    return found?.key || "home";
  }, [groups, location.pathname]);

  const [openGroup, setOpenGroup] = useState<string>(firstOpenGroup);

  useEffect(() => {
    setOpenGroup(firstOpenGroup);
  }, [firstOpenGroup]);

  function toggleGroup(key: string) {
    setOpenGroup((prev) => (prev === key ? "" : key));
  }

  return (
    <div style={shell()}>
      <aside style={sidebar()}>
        <div style={brandBox()}>
          <div style={{ fontSize: 12, fontWeight: 1000, letterSpacing: "0.06em" }}>
            GMFN / GSN
          </div>

          <div
            style={{
              marginTop: 8,
              color: "rgba(255,255,255,0.78)",
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            Trust, identity, community, and market activity arranged into one
            working system.
          </div>
        </div>

        {groups.map((group) => {
          if (group.adminOnly && !isAdmin) return null;

          const isOpen = openGroup === group.key;
          const hasActiveChild = group.items.some((item) =>
            isActive(location.pathname, item.to)
          );

          return (
            <div key={group.key} style={groupBox()}>
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                style={groupHeader(isOpen || hasActiveChild)}
              >
                <span>{group.label}</span>
                <span style={{ fontSize: 12, opacity: 0.8 }}>
                  {isOpen ? "Hide" : "Open"}
                </span>
              </button>

              {group.hint ? (
                <div
                  style={{
                    marginTop: 8,
                    color: "rgba(255,255,255,0.75)",
                    fontSize: 12,
                    lineHeight: 1.6,
                    padding: "0 4px",
                  }}
                >
                  {group.hint}
                </div>
              ) : null}

              {isOpen ? (
                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  {group.items.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      style={navItem(isActive(location.pathname, item.to))}
                    >
                      {item.label}
                    </Link>
                  ))}

                  {group.key === "market" ? (
                    <div style={noteBox()}>
                      One identity stays the same across communities. The shop
                      belongs to identity, while Demand Box stays identity-based.
                    </div>
                  ) : null}

                  {group.key === "admin" ? (
                    <div style={noteBox()}>
                      These tools are restricted. They should not appear in
                      normal member flow.
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </aside>

      <main style={content()}>
        <Outlet />
      </main>
    </div>
  );
}