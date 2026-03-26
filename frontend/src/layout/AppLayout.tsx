import React, { useMemo, useState } from "react";
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
  const isAdmin =
    (localStorage.getItem("gmfn_role") || "").toLowerCase() === "admin";

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
        hint: "Open your current community or manage membership and invites.",
        items: [
          { label: "Community Overview", to: "/app/community" },
          { label: "Manage Community", to: "/app/clans" },
        ],
      },
      {
        key: "market",
        label: "Marketplace",
        hint: "Browse people, shops, and requests across your communities.",
        items: [
          { label: "Browse Marketplace", to: "/app/marketplace" },
          { label: "Demand Box", to: "/app/demand-box" },
          { label: "Shop Control", to: "/app/shop-control" },
        ],
      },
      {
        key: "money",
        label: "Money and Support",
        hint: "Follow loans, readiness, workbench, and earnings.",
        items: [
          { label: "Loans and Support", to: "/app/loans" },
          { label: "Guarantor Earnings", to: "/app/guarantor-earnings" },
          { label: "Support Readiness", to: "/app/loan-readiness" },
          { label: "Helpful Suggestions", to: "/app/loan-suggestions" },
          { label: "Workbench", to: "/app/loan-workbench" },
        ],
      },
      {
        key: "trust",
        label: "Trust and Identity",
        hint: "See trust position, trust tools, and updates.",
        items: [
          { label: "My Trust", to: "/app/trust" },
          { label: "TrustSlip", to: "/app/trust-slip" },
          { label: "Trust Activity", to: "/app/trust-analytics" },
          { label: "Trust Operations", to: "/app/trust-command-centre" },
          { label: "Notifications", to: "/app/notifications" },
        ],
      },
      {
        key: "identity",
        label: "My GSN",
        hint: "Understand your place in the network.",
        items: [{ label: "My GMFN and I", to: "/app/my-gmfn-and-i" }],
      },
      {
        key: "system",
        label: "System Tools",
        hint: "Internal controls and review tools.",
        adminOnly: true,
        items: [
          { label: "System Operations", to: "/app/system-operations" },
          { label: "Safety and Risk", to: "/app/admin/exposure" },
          { label: "Relationship Graph", to: "/app/admin/trust-graph" },
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

  React.useEffect(() => {
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
            GLOBAL SUPPORT NETWORK
          </div>

          <div
            style={{
              marginTop: 8,
              color: "rgba(255,255,255,0.78)",
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            GSN connects identity, trust, community, and market activity in one
            network.
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
                      One identity stays the same across communities. Shops are
                      global per identity, while Demand Box remains identity-based.
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