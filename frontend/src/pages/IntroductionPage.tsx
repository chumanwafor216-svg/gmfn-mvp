import React from "react";
import { useNavigate } from "react-router-dom";

import Mark from "../assets/gmfn-mark.svg";
import Wordmark from "../assets/gmfn-wordmark.svg";

function topPattern(): string {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="320" viewBox="0 0 1600 320">
    <rect width="1600" height="320" fill="#F7FAFD"/>
    <g fill="none" stroke="#C5D7EB" stroke-opacity="0.52" stroke-width="2">
      <path d="M80 160 C180 90, 280 90, 380 160 S580 230, 690 150" />
      <path d="M920 160 C1020 90, 1120 90, 1220 160 S1420 230, 1520 150" />
    </g>
    <g fill="#D6AF47" fill-opacity="0.95">
      <path d="M80 150 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M180 96 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M280 96 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M380 150 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M510 205 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M650 150 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>

      <path d="M920 150 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M1020 96 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M1120 96 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M1220 150 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M1350 205 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M1490 150 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
    </g>
  </svg>`.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function panel(): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    padding: 24,
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
  };
}

function actionButton(primary?: boolean): React.CSSProperties {
  return {
    padding: "15px 24px",
    borderRadius: 16,
    border: primary ? "none" : "1px solid #D7E3F0",
    background: primary ? "#0B1F33" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 1000,
    fontSize: 16,
    cursor: "pointer",
    minWidth: 180,
  };
}

export default function IntroductionPage() {
  const nav = useNavigate();
  const pattern = topPattern();

  return (
    <div style={{ minHeight: "100vh", background: "#F8FBFE" }}>
      <div
        style={{
          backgroundImage: `url("${pattern}")`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          borderBottom: "1px solid rgba(11,31,51,0.06)",
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 24px 38px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
            <img src={Mark} alt="GSN mark" style={{ width: 36, height: 36 }} />
            <img src={Wordmark} alt="GSN wordmark" style={{ height: 30, width: "auto" }} />
          </div>

          <div style={{ fontSize: 13, fontWeight: 1000, color: "#5B7693", letterSpacing: 1 }}>
            INTRODUCTION
          </div>

          <h1
            style={{
              marginTop: 12,
              marginBottom: 16,
              fontSize: 56,
              lineHeight: 1.08,
              color: "#0B1F33",
              fontWeight: 1000,
              maxWidth: 900,
              letterSpacing: -1,
              textShadow: "0 1px 0 rgba(255,255,255,0.85)",
            }}
          >
            A structured trust framework for community-backed support.
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: 22,
              lineHeight: 1.76,
              color: "#48627C",
              maxWidth: 980,
            }}
          >
            GMFN is designed to help communities organise support responsibly,
            make trust visible, and preserve a clear evidence trail around commitments,
            guarantees, and repayment behaviour.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 20 }}>
          <div style={panel()}>
            <div style={{ fontSize: 14, fontWeight: 1000, color: "#0B1F33" }}>
              Community coordination
            </div>
            <p style={{ marginTop: 12, marginBottom: 0, color: "#5F768D", lineHeight: 1.85 }}>
              Communities can organise support using visible relationships, transparent processes,
              and shared awareness of current obligations.
            </p>
          </div>

          <div style={panel()}>
            <div style={{ fontSize: 14, fontWeight: 1000, color: "#0B1F33" }}>
              Explainable trust growth
            </div>
            <p style={{ marginTop: 12, marginBottom: 0, color: "#5F768D", lineHeight: 1.85 }}>
              Trust grows gradually through verified completion of commitments,
              rather than hidden manual scoring or unexplained adjustments.
            </p>
          </div>

          <div style={panel()}>
            <div style={{ fontSize: 14, fontWeight: 1000, color: "#0B1F33" }}>
              Portable reliability
            </div>
            <p style={{ marginTop: 12, marginBottom: 0, color: "#5F768D", lineHeight: 1.85 }}>
              TrustSlip allows reliability to be presented clearly to merchants and partners
              without claiming to be a bank guarantee.
            </p>
          </div>
        </div>

        <div
          style={{
            marginTop: 28,
            ...panel(),
            display: "grid",
            gridTemplateColumns: "1.05fr 0.95fr",
            gap: 24,
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 1000, color: "#0B1F33" }}>
              Continue into the workspace
            </div>
            <div style={{ marginTop: 10, color: "#5F768D", lineHeight: 1.85 }}>
              Enter the dashboard to view your community, active support requests,
              trust position, and the next actions most relevant to you.
            </div>

            <div style={{ marginTop: 14, color: "#7A8D9F", fontSize: 13, lineHeight: 1.75 }}>
              Pilot note: this environment remains non-custodial in the current phase.
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <button onClick={() => nav("/dashboard")} style={actionButton(true)}>
              Enter Dashboard
            </button>

            <button onClick={() => nav("/login")} style={actionButton(false)}>
              Back to sign in
            </button>

            <button onClick={() => nav("/welcome")} style={actionButton(false)}>
              Welcome page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}