// src/pages/LoginPage.tsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Wordmark from "../assets/gmfn-wordmark.svg";
import Mark from "../assets/gmfn-mark.svg";

function patternDataUri(): string {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
    <g fill="none" stroke="#0B1F33" stroke-opacity="0.06" stroke-width="1">
      <path d="M18 62 H202" />
      <path d="M30 160 C70 128, 150 128, 190 160" />
      <circle cx="56" cy="56" r="10"/>
      <circle cx="164" cy="56" r="8"/>
      <circle cx="110" cy="110" r="9"/>
      <path d="M56 56 L110 110 L164 56"/>
    </g>
    <g fill="none" stroke="#C6A14A" stroke-opacity="0.05" stroke-width="1">
      <circle cx="110" cy="110" r="82"/>
    </g>
  </svg>`.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function silhouettesSvg(): string {
  // One lightweight SVG “success panel”: dignified silhouettes
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0B1F33" stop-opacity="0.95"/>
        <stop offset="1" stop-color="#0B1F33" stop-opacity="0.70"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="900" height="900" fill="url(#g)"/>
    <g fill="#ffffff" fill-opacity="0.06">
      <circle cx="140" cy="150" r="90"/>
      <circle cx="520" cy="180" r="120"/>
      <circle cx="780" cy="260" r="80"/>
      <circle cx="260" cy="520" r="120"/>
      <circle cx="660" cy="560" r="140"/>
    </g>
    <g fill="none" stroke="#C6A14A" stroke-opacity="0.22" stroke-width="2">
      <path d="M60 820 C180 710, 310 710, 430 820" />
      <path d="M470 820 C590 690, 730 690, 850 820" />
    </g>

    <!-- silhouettes -->
    <g fill="#ffffff" fill-opacity="0.18">
      <!-- Person 1 -->
      <circle cx="220" cy="420" r="56"/>
      <path d="M120 760 C140 640, 300 640, 320 760 Z"/>

      <!-- Person 2 -->
      <circle cx="460" cy="380" r="62"/>
      <path d="M340 760 C365 620, 555 620, 580 760 Z"/>

      <!-- Person 3 -->
      <circle cx="680" cy="440" r="54"/>
      <path d="M590 760 C610 650, 750 650, 770 760 Z"/>
    </g>

    <g fill="#ffffff" fill-opacity="0.10">
      <path d="M0 640 H900" />
      <path d="M0 700 H900" />
    </g>
  </svg>`.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function LoginPage() {
  const nav = useNavigate();
  const bg = useMemo(() => patternDataUri(), []);
  const hero = useMemo(() => silhouettesSvg(), []);

  const [email, setEmail] = useState("admin@test.com");
  const [password, setPassword] = useState("password");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function doLogin() {
    setErr(null);
    setBusy(true);
    try {
      const body = new URLSearchParams();
      body.set("username", email.trim());
      body.set("password", password);

      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      const j = JSON.parse(text);
      const token = j?.access_token;
      if (!token) throw new Error("Login succeeded but no access_token returned.");

      localStorage.setItem("access_token", token);
      nav("/dashboard", { replace: true });
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        display: "grid",
        gridTemplateColumns: "1.35fr 1fr",
      }}
    >
      {/* Left: dignity panel */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          backgroundImage: `url("${hero}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: "rgba(11,31,51,0.10)" }} />
        <div style={{ position: "absolute", top: 22, left: 22, display: "flex", alignItems: "center", gap: 10 }}>
          <img src={Mark} alt="GMFN" style={{ height: 34, width: 34, opacity: 0.98 }} />
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <div style={{ color: "rgba(255,255,255,0.92)", fontWeight: 1000, letterSpacing: 1.5 }}>GMFN</div>
            <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 12 }}>Trust Infrastructure (Pilot)</div>
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 22, left: 22, right: 22, color: "rgba(255,255,255,0.80)" }}>
          <div style={{ fontWeight: 1000, fontSize: 18 }}>Dignity. Structure. Accountability.</div>
          <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>
            GMFN transforms informal trust into a portable, verifiable authorization layer — without banks or collateral.
          </div>
        </div>
      </div>

      {/* Right: login card */}
      <div
        style={{
          backgroundImage: `url("${bg}")`,
          backgroundRepeat: "repeat",
          backgroundSize: "220px 220px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 18,
        }}
      >
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <img src={Wordmark} alt="GMFN" style={{ height: 38 }} />
          </div>

          <div
            style={{
              marginTop: 14,
              border: "1px solid rgba(11,31,51,0.12)",
              borderRadius: 22,
              padding: 18,
              background: "rgba(255,255,255,0.94)",
              boxShadow: "0 18px 60px rgba(2, 6, 23, 0.08)",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 1000, color: "#0B1F33", letterSpacing: 0.6 }}>
              Secure Access
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#6B7A88" }}>
              Pilot login. Authorization required.
            </div>

            {err && (
              <div style={{ marginTop: 12, padding: 10, borderRadius: 14, border: "1px solid rgba(153,27,27,0.25)", background: "rgba(254,242,242,0.9)", color: "#991b1b", fontWeight: 900 }}>
                {err}
              </div>
            )}

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: "#6B7A88", fontWeight: 900 }}>Email</div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(11,31,51,0.18)" }}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <div style={{ fontSize: 12, color: "#6B7A88", fontWeight: 900 }}>Password</div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(11,31,51,0.18)" }}
                  placeholder="••••••••"
                />
              </div>

              <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: "#6B7A88" }}>Non-custodial pilot build.</div>

                {/* Small padlock button */}
                <button
                  onClick={doLogin}
                  disabled={busy}
                  title="Unlock Access"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    border: "1px solid rgba(198,161,74,0.65)",
                    background: busy ? "rgba(198,161,74,0.12)" : "rgba(198,161,74,0.16)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: busy ? "not-allowed" : "pointer",
                  }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>🔒</span>
                </button>
              </div>

              <div style={{ marginTop: 4, fontSize: 12, color: "#6B7A88" }}>
                Tip: button is intentionally small — authority UI, not attention UI.
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, textAlign: "center", fontSize: 12, color: "#6B7A88" }}>
            Trust Infrastructure Protocol — <span style={{ fontWeight: 900, color: "#0B1F33" }}>GMFN</span>
          </div>
        </div>
      </div>
    </div>
  );
}