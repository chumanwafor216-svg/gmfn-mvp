import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";

function card(): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

function linkBtn(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    borderRadius: 14,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.10)",
    background: primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 1000,
    fontSize: 14,
    textDecoration: "none",
    cursor: "pointer",
  };
}

const THEMES = [
  { key: "deep_blue", label: "Deep Blue", note: "Institutional default", preview: "#0B63D1" },
  { key: "soft_light", label: "Soft Light", note: "Easier for some eyes", preview: "#CBD5E1" },
  { key: "dark", label: "Dark", note: "Night mode style", preview: "#0F172A" },
  { key: "royal_purple", label: "Royal Purple", note: "Premium visual feel", preview: "#6B46C1" },
  { key: "rose_pink", label: "Rose Pink", note: "Warm, softer theme", preview: "#E64980" },
];

export default function AppearancePage() {
  const [theme, setTheme] = useState("deep_blue");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("gmfn_theme") || "deep_blue";
    setTheme(saved);
  }, []);

  function applyTheme(next: string) {
    localStorage.setItem("gmfn_theme", next);
    setTheme(next);
    setMsg(`Theme saved: ${next}. Navigate to another page or reopen the sidebar to see the updated shell styling.`);
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <PageTopNav
        title="Settings"
        subtitle="Manage your visual preferences and the financial identity details used in your pilot workflow."
      />

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
          Settings shortcuts
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/payout-details" style={linkBtn(true)}>
            Bank / Wallet Details
          </Link>
          <Link to="/notifications" style={linkBtn(false)}>
            Notifications
          </Link>
          <Link to="/identity" style={linkBtn(false)}>
            Identity Integrity
          </Link>
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
          Choose your colour
        </div>
        <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
          Different users prefer different contrast levels. This setting changes the shell feel of the workspace and helps the platform feel clearer and more comfortable.
        </div>

        {msg ? (
          <div
            style={{
              marginTop: 16,
              padding: "12px 14px",
              borderRadius: 14,
              background: "#ECFDF5",
              border: "1px solid #A7F3D0",
              color: "#065F46",
              fontWeight: 900,
            }}
          >
            {msg}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
          }}
        >
          {THEMES.map((t) => (
            <button
              key={t.key}
              onClick={() => applyTheme(t.key)}
              style={{
                textAlign: "left",
                borderRadius: 18,
                border: theme === t.key ? "2px solid #0B63D1" : "1px solid rgba(11,31,51,0.10)",
                background: "#FFFFFF",
                padding: 16,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    background: t.preview,
                    border: "1px solid rgba(11,31,51,0.10)",
                  }}
                />
                <div>
                  <div style={{ fontWeight: 1000, color: "#0B1F33" }}>{t.label}</div>
                  <div style={{ marginTop: 4, fontSize: 13, color: "#64748b" }}>{t.note}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}