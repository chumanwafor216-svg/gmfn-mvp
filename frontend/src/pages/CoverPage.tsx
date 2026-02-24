// src/pages/CoverPage.tsx
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import Wordmark from "../assets/gmfn-wordmark.svg";
import Mark from "../assets/gmfn-mark.svg";

function patternDataUri(): string {
  // Ultra-light SVG pattern (WhatsApp-like, but institutional geometry)
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
    <g fill="none" stroke="#0B1F33" stroke-opacity="0.08" stroke-width="1">
      <circle cx="42" cy="46" r="10"/>
      <circle cx="168" cy="58" r="8"/>
      <circle cx="122" cy="170" r="9"/>
      <path d="M42 46 L88 66 L122 44" />
      <path d="M168 58 L198 92 L154 106" />
      <path d="M122 170 L154 106" />
      <path d="M88 66 L154 106" />
      <path d="M60 140 C90 110, 140 110, 180 140" />
      <path d="M52 188 C92 156, 150 156, 196 188" />
      <path d="M26 118 H214" />
    </g>
    <g fill="none" stroke="#C6A14A" stroke-opacity="0.06" stroke-width="1">
      <path d="M120 22 C170 22, 218 70, 218 120 C218 170, 170 218, 120 218 C70 218, 22 170, 22 120 C22 70, 70 22, 120 22 Z"/>
    </g>
  </svg>`.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function CoverPage() {
  const nav = useNavigate();
  const bg = useMemo(() => patternDataUri(), []);

  return (
    <div
      onClick={() => nav("/login", { replace: true })}
      role="button"
      title="Tap to enter"
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
        cursor: "pointer",
        backgroundImage: `url("${bg}")`,
        backgroundRepeat: "repeat",
        backgroundSize: "240px 240px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 760, textAlign: "center" }}>
        <div
          style={{
            border: "1px solid rgba(11,31,51,0.10)",
            borderRadius: 26,
            padding: 28,
            background: "rgba(255,255,255,0.92)",
            boxShadow: "0 18px 60px rgba(2, 6, 23, 0.10)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center" }}>
            <img src={Mark} alt="GMFN Mark" style={{ height: 58, width: 58 }} />
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
            <img src={Wordmark} alt="GMFN" style={{ height: 46, maxWidth: "100%" }} />
          </div>

          <div style={{ marginTop: 12, color: "#1E2A36", fontWeight: 900, letterSpacing: 0.4 }}>
            Trust Infrastructure Protocol
          </div>

          <div style={{ marginTop: 8, color: "#6B7A88", fontSize: 13, lineHeight: 1.5 }}>
            Sovereign-grade trust transmission for underbanked markets.
          </div>

          <div
            style={{
              marginTop: 18,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 16,
              border: "1px solid rgba(198,161,74,0.40)",
              background: "rgba(198,161,74,0.08)",
              color: "#0B1F33",
              fontWeight: 1000,
            }}
          >
            Tap to enter →
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: "#6B7A88" }}>
            (Pilot build)
          </div>
        </div>
      </div>
    </div>
  );
}