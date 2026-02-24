// src/layout/AppLayout.tsx
import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { getMe, logout } from "../lib/api";
import { applyAppearanceToDocument } from "../lib/appearance";

import Mark from "../assets/gmfn-mark.svg";
import Wordmark from "../assets/gmfn-wordmark.svg";

type MeOut = { id: number; email?: string; role?: string };

function patternDataUri(): string {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
    <g fill="none" stroke="#0B1F33" stroke-opacity="0.05" stroke-width="1">
      <circle cx="42" cy="46" r="10"/>
      <circle cx="168" cy="58" r="8"/>
      <circle cx="122" cy="170" r="9"/>
      <path d="M42 46 L88 66 L122 44" />
      <path d="M168 58 L198 92 L154 106" />
      <path d="M122 170 L154 106" />
      <path d="M88 66 L154 106" />
      <path d="M60 140 C90 110, 140 110, 180 140" />
      <path d="M26 118 H214" />
    </g>
    <g fill="none" stroke="#C6A14A" stroke-opacity="0.04" stroke-width="1">
      <circle cx="120" cy="120" r="90"/>
    </g>
  </svg>`.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function navItemStyle(isActive: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 14,
    textDecoration: "none",
    fontWeight: 900,
    color: isActive ? "#0B1F33" : "#334155",
    background: isActive ? "rgba(11,31,51,0.06)" : "transparent",
    border: isActive ? "1px solid rgba(11,31,51,0.10)" : "1px solid transparent",
  };
}

function sectionLabelStyle(): React.CSSProperties {
  return { marginTop: 10, fontWeight: 1000, fontSize: 12, color: "#6B7A88", letterSpacing: 0.6 };
}

export default function AppLayout() {
  const nav = useNavigate();
  const [me, setMe] = useState<MeOut | null>(null);
  const bg = useMemo(() => patternDataUri(), []);

  useEffect(() => {
    applyAppearanceToDocument();
    (async () => {
      try {
        const m: any = await getMe();
        setMe({ id: m.id, email: m.email, role: m.role });
      } catch {
        setMe(null);
      }
    })();
  }, []);

  const role = (me?.role || "user").toLowerCase();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        backgroundImage: `url("${bg}")`,
        backgroundRepeat: "repeat",
        backgroundSize: "240px 240px",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "290px 1fr", minHeight: "100vh" }}>
        {/* Sidebar */}
        <aside
          style={{
            borderRight: "1px solid rgba(11,31,51,0.10)",
            background: "rgba(255,255,255,0.92)",
            padding: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={Mark} alt="GMFN" style={{ height: 28, width: 28 }} />
            <img src={Wordmark} alt="GMFN" style={{ height: 22 }} />
          </div>

          <div style={{ marginTop: 6, color: "#6B7A88", fontSize: 12 }}>
            Reputation grows when repayment is complete.
          </div>

          <div
            style={{
              marginTop: 12,
              border: "1px solid rgba(11,31,51,0.10)",
              borderRadius: 18,
              padding: 12,
              background: "#fff",
            }}
          >
            <div style={{ fontSize: 12, color: "#6B7A88", fontWeight: 900 }}>Signed in</div>
            <div style={{ fontWeight: 1000, marginTop: 4, color: "#0B1F33" }}>{me?.email ?? "—"}</div>
            <div style={{ fontSize: 12, color: "#6B7A88", marginTop: 4 }}>Role: {role}</div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                style={{
                  padding: "8px 10px",
                  borderRadius: 12,
                  border: "1px solid rgba(11,31,51,0.12)",
                  background: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
                onClick={async () => {
                  try {
                    await logout();
                  } catch {
                    // ignore
                  }
                  nav("/login");
                }}
              >
                Logout
              </button>
            </div>
          </div>

          <nav style={{ marginTop: 14, display: "grid", gap: 8 }}>
            <div style={sectionLabelStyle()}>CORE</div>
            <NavLink to="/dashboard" style={({ isActive }) => navItemStyle(isActive)}>
              🧭 Dashboard
            </NavLink>
            <NavLink to="/community" style={({ isActive }) => navItemStyle(isActive)}>
              👥 My Community
            </NavLink>
            <NavLink to="/clans" style={({ isActive }) => navItemStyle(isActive)}>
              🏠 Clans
            </NavLink>

            <div style={sectionLabelStyle()}>LOANS</div>
            <NavLink to="/loans" style={({ isActive }) => navItemStyle(isActive)}>
              💳 Loans & Supporters
            </NavLink>
            <NavLink to="/guarantor" style={({ isActive }) => navItemStyle(isActive)}>
              📥 Guarantor Inbox
            </NavLink>

            <div style={sectionLabelStyle()}>TRUST</div>
            <NavLink to="/trust" style={({ isActive }) => navItemStyle(isActive)}>
              🌿 Community Standing
            </NavLink>
            <NavLink to="/trust-slip" style={({ isActive }) => navItemStyle(isActive)}>
              🧾 TrustSlip
            </NavLink>

            <div style={sectionLabelStyle()}>PILOT</div>
            <NavLink to="/pilot-showcase" style={({ isActive }) => navItemStyle(isActive)}>
              🧪 Pilot Showcase
            </NavLink>
            <NavLink to="/seed" style={({ isActive }) => navItemStyle(isActive)}>
              🌱 Seed Demo Data
            </NavLink>

            <div style={sectionLabelStyle()}>SETTINGS</div>
            <NavLink to="/settings" style={({ isActive }) => navItemStyle(isActive)}>
              ⚙️ Appearance
            </NavLink>

            {role === "admin" && (
              <>
                <div style={sectionLabelStyle()}>ADMIN TOOLS</div>
                <NavLink to="/exposure" style={({ isActive }) => navItemStyle(isActive)}>
                  🛡️ Safety & Risk
                </NavLink>
                <NavLink to="/admin/incomplete-loans" style={({ isActive }) => navItemStyle(isActive)}>
                  ⏳ Incomplete Loans Queue
                </NavLink>
                <NavLink to="/admin/trust-events" style={({ isActive }) => navItemStyle(isActive)}>
                  🧾 Audit Log
                </NavLink>
                <NavLink to="/api" style={({ isActive }) => navItemStyle(isActive)}>
                  🧩 API
                </NavLink>
              </>
            )}

            <div style={{ marginTop: 12, fontSize: 12, color: "#6B7A88" }}>
              Authority UI: structured, calm, and verifiable.
            </div>
          </nav>
        </aside>

        {/* Main (Swagger-like white canvas) */}
        <main style={{ padding: 18 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}