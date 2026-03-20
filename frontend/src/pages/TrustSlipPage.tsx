import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  getCurrentClan,
  getMe,
  getMyTrustSlip,
  getTrustScoreExplained,
  safeCopy,
} from "../lib/api";

type MeLite = {
  email?: string | null;
  gmfn_id?: string | null;
  nickname?: string | null;
  display_name?: string | null;
};

type ClanLite = {
  id?: number;
  name?: string | null;
};

type TrustLite = {
  score?: any;
  trust_score?: any;
  standing_score?: any;
  band?: string | null;
};

type SlipLite = {
  trust_slip_limit?: string | null;
  trust_limit?: string | null;
  currency?: string | null;
  status?: string | null;

  issued_at?: string | null;
  created_at?: string | null;
  expires_at?: string | null;

  token?: string | null;
  code?: string | null;

  verification_token?: string | null;
  verify_token?: string | null;
  public_token?: string | null;
  slip_token?: string | null;
  trust_slip_token?: string | null;

  verification_code?: string | null;
  public_code?: string | null;
};

function safeStr(x: any): string {
  return String(x ?? "");
}

function asNum(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(x: any): string {
  const n = Number(x);
  if (!Number.isFinite(n)) return String(x ?? "").trim() || "0.00";
  return n.toFixed(2);
}

function displayName(me: MeLite | null): string {
  const n1 = safeStr(me?.nickname).trim();
  if (n1) return n1;
  const n2 = safeStr(me?.display_name).trim();
  if (n2) return n2;
  const email = safeStr(me?.email).trim();
  if (!email) return "Member";
  return email.split("@")[0] || "Member";
}

function pagePattern(): string {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="320" viewBox="0 0 1600 320">
    <rect width="1600" height="320" fill="#F7FAFD"/>
    <g fill="none" stroke="#D7E2EE" stroke-opacity="0.40" stroke-width="2">
      <path d="M70 170 C180 90, 290 90, 400 170 S620 250, 730 170" />
      <path d="M900 170 C1010 90, 1120 90, 1230 170 S1450 250, 1560 170" />
    </g>
    <g fill="#D6AF47" fill-opacity="0.90">
      <path d="M70 160 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M180 96 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M290 96 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M400 160 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
    </g>
  </svg>`.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function card(): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

function actionLink(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    borderRadius: 14,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.10)",
    background: primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    textDecoration: "none",
    fontWeight: 1000,
    fontSize: 14,
    cursor: "pointer",
  };
}

function actionButton(primary = false): React.CSSProperties {
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
    cursor: "pointer",
  };
}

function pill(kind: "blue" | "gold" | "gray" | "green"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 1000,
    whiteSpace: "nowrap",
    border: "1px solid #E5E7EB",
  };
  if (kind === "blue") {
    return { ...base, background: "#EFF6FF", borderColor: "#BFDBFE", color: "#1D4ED8" };
  }
  if (kind === "gold") {
    return { ...base, background: "#FFFBEB", borderColor: "#FDE68A", color: "#92400E" };
  }
  if (kind === "green") {
    return { ...base, background: "#ECFDF5", borderColor: "#A7F3D0", color: "#065F46" };
  }
  return { ...base, background: "#F8FAFC", borderColor: "#E2E8F0", color: "#475569" };
}

export default function TrustSlipPage() {
  const [me, setMe] = useState<MeLite | null>(null);
  const [clan, setClan] = useState<ClanLite | null>(null);
  const [trust, setTrust] = useState<TrustLite | null>(null);
  const [slip, setSlip] = useState<SlipLite | null>(null);
  const [msg, setMsg] = useState("");

  const pattern = useMemo(() => pagePattern(), []);

  useEffect(() => {
    (async () => {
      const [meRes, clanRes, trustRes, slipRes] = await Promise.all([
        getMe().catch(() => null),
        getCurrentClan().catch(() => null),
        getTrustScoreExplained().catch(() => null),
        getMyTrustSlip().catch(() => null),
      ]);

      setMe(meRes || null);
      setClan(clanRes || null);
      setTrust(trustRes || null);
      setSlip((slipRes || null) as SlipLite | null);
    })();
  }, []);

  const name = displayName(me);
  const gmfnId = safeStr(me?.gmfn_id || "GMFN ID pending");
  const communityName = safeStr(clan?.name || "No active community");
  const band = safeStr(trust?.band || "Band E");
  const trustScore = asNum(trust?.score ?? trust?.trust_score ?? trust?.standing_score ?? 0);
  const trustLimit = fmtMoney(slip?.trust_slip_limit ?? slip?.trust_limit ?? "0");
  const currency = safeStr(slip?.currency || "NGN");
  const rawStatus = safeStr(slip?.status || "").trim().toLowerCase();

  const displayCode = safeStr(
    slip?.verification_code ||
      slip?.public_code ||
      slip?.code ||
      slip?.verification_token ||
      slip?.verify_token ||
      slip?.public_token ||
      slip?.trust_slip_token ||
      slip?.slip_token ||
      slip?.token ||
      ""
  ).trim();

  const verificationToken = safeStr(
    slip?.verification_token ||
      slip?.verify_token ||
      slip?.public_token ||
      slip?.trust_slip_token ||
      slip?.slip_token ||
      slip?.token ||
      slip?.verification_code ||
      slip?.public_code ||
      slip?.code ||
      ""
  ).trim();

  const issuedAt = safeStr(slip?.issued_at || slip?.created_at || "").trim();
  const expiresAt = safeStr(slip?.expires_at || "").trim();

  const isIssued = Boolean(verificationToken);
  const effectiveStatus = isIssued ? rawStatus || "active" : rawStatus || "pending issuance";

  const PUBLIC_APP_URL = safeStr(
    (import.meta as any)?.env?.VITE_PUBLIC_APP_URL || ""
  )
    .trim()
    .replace(/\/+$/, "");

  const appBaseUrl = PUBLIC_APP_URL || window.location.origin;

  const verifyUrl = verificationToken
    ? `${appBaseUrl}/t/${encodeURIComponent(verificationToken)}`
    : "";

  const memberPhoto =
    localStorage.getItem("gmfn.member.avatar") ||
    localStorage.getItem("gsm.member_photo") ||
    "";

  function whatsappShare(link: string) {
    const text = `Verify my GMFN TrustSlip\n${link}`;
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(wa, "_blank", "noopener,noreferrer");
  }

  return (
    <div style={{ maxWidth: 1320, margin: "0 auto" }}>
      <div
        style={{
          backgroundImage: `url("${pattern}")`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          borderRadius: 28,
          border: "1px solid rgba(11,31,51,0.06)",
          overflow: "hidden",
          backgroundColor: "#F7FAFD",
        }}
      >
        <div style={{ padding: 24 }}>
          <div style={{ fontSize: 38, fontWeight: 1000, color: "#0B1F33" }}>
            TrustSlip
          </div>
          <div style={{ marginTop: 10, color: "#6B7A88", lineHeight: 1.8 }}>
            Executive trust summary designed for formal presentation, verification, and pilot use.
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

          {!isIssued ? (
            <div
              style={{
                marginTop: 16,
                padding: "12px 14px",
                borderRadius: 14,
                background: "#FFFBEB",
                border: "1px solid #FDE68A",
                color: "#92400E",
                fontWeight: 900,
              }}
            >
              This TrustSlip has not been fully issued for public verification yet. A verification token or code is missing from the backend response.
            </div>
          ) : null}

          <div
            style={{
              marginTop: 18,
              ...card(),
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,250,253,1) 100%)",
              border: "1px solid rgba(11,31,51,0.10)",
              boxShadow: "0 24px 60px rgba(15,23,42,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 18,
                flexWrap: "wrap",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 1000,
                    letterSpacing: 1.2,
                    color: "#5B7693",
                  }}
                >
                  ISSUED BY GMFN TRUST AUTHORITY
                </div>
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 34,
                    fontWeight: 1000,
                    color: "#0B1F33",
                  }}
                >
                  Global Support Network TrustSlip
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={pill("blue")}>{gmfnId}</span>
                  <span style={pill("gold")}>{band}</span>
                  <span style={pill(isIssued ? "green" : "gray")}>{effectiveStatus}</span>
                </div>
              </div>

              <div
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: "50%",
                  background: memberPhoto
                    ? `center / cover no-repeat url("${memberPhoto}")`
                    : "linear-gradient(180deg, #EFF6FF 0%, #DBEAFE 100%)",
                  border: "2px solid rgba(11,31,51,0.08)",
                }}
              />
            </div>

            <div
              style={{
                marginTop: 22,
                display: "grid",
                gridTemplateColumns: "1.1fr 0.9fr",
                gap: 20,
                alignItems: "start",
              }}
            >
              <div
                style={{
                  borderRadius: 20,
                  background: "linear-gradient(180deg, #0B1F33 0%, #123A63 100%)",
                  color: "#FFFFFF",
                  padding: 22,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "radial-gradient(circle at top right, rgba(214,175,71,0.18), transparent 40%)",
                  }}
                />
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#D6AF47",
                      fontWeight: 1000,
                      letterSpacing: 1,
                    }}
                  >
                    VERIFIED TRUST POSITION
                  </div>
                  <div style={{ marginTop: 12, fontSize: 30, fontWeight: 1000 }}>
                    {name}
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "rgba(255,255,255,0.86)",
                      lineHeight: 1.8,
                    }}
                  >
                    Community: <b>{communityName}</b>
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      color: "rgba(255,255,255,0.86)",
                      lineHeight: 1.8,
                    }}
                  >
                    Standing band: <b>{band}</b> · Trust score:{" "}
                    <b>{trustScore.toFixed(2)}</b>
                  </div>

                  <div
                    style={{
                      marginTop: 18,
                      padding: 16,
                      borderRadius: 16,
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.10)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: "#D6AF47",
                        fontWeight: 1000,
                      }}
                    >
                      TRUST LIMIT
                    </div>
                    <div style={{ marginTop: 8, fontSize: 34, fontWeight: 1000 }}>
                      {trustLimit} {currency}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ ...card(), background: "#FFFFFF", boxShadow: "none" }}>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  {verifyUrl ? (
                    <QRCodeSVG
                      value={verifyUrl}
                      size={220}
                      bgColor="#ffffff"
                      fgColor="#0B1F33"
                      level="Q"
                    />
                  ) : (
                    <div
                      style={{
                        width: 220,
                        height: 220,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: 16,
                        background: "#F8FAFC",
                        border: "1px solid #E2E8F0",
                        color: "#64748B",
                        textAlign: "center",
                        padding: 20,
                        lineHeight: 1.6,
                        fontWeight: 700,
                      }}
                    >
                      Verification token not available yet.
                    </div>
                  )}
                </div>

                <div
                  style={{
                    marginTop: 16,
                    color: "#6B7A88",
                    lineHeight: 1.8,
                    textAlign: "center",
                  }}
                >
                  Scan or verify independently to confirm the visible trust summary.
                </div>

                <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                  <div style={{ color: "#0B1F33", fontWeight: 1000 }}>
                    Code: {displayCode || "Not issued yet"}
                  </div>
                  <div style={{ color: "#6B7A88" }}>
                    Issued: {issuedAt || "Not yet issued"}
                  </div>
                  <div style={{ color: "#6B7A88" }}>
                    Expiry: {expiresAt || "Not yet set"}
                  </div>
                </div>

                {verifyUrl ? (
                  <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        background: "#F8FAFC",
                        border: "1px solid #E2E8F0",
                        color: "#475569",
                        wordBreak: "break-word",
                        fontSize: 13,
                        lineHeight: 1.7,
                      }}
                    >
                      {verifyUrl}
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => {
                          safeCopy(verifyUrl);
                          setMsg("Verification link copied.");
                        }}
                        style={actionButton(true)}
                      >
                        Copy Verification Link
                      </button>

                      <button
                        type="button"
                        onClick={() => whatsappShare(verifyUrl)}
                        style={actionButton(false)}
                      >
                        Share via WhatsApp
                      </button>

                      <Link
                        to={`/t/${encodeURIComponent(verificationToken)}`}
                        style={actionLink(false)}
                      >
                        Open Verify Page
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div
              style={{
                marginTop: 22,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 18,
              }}
            >
              <div
                style={{
                  padding: 16,
                  borderRadius: 16,
                  background: "#F8FBFE",
                  border: "1px solid rgba(11,31,51,0.06)",
                  color: "#6B7A88",
                  lineHeight: 1.9,
                }}
              >
                This TrustSlip is intended to present a portable, explainable summary
                of visible community-backed trust, especially for early pilot and
                verification contexts.
              </div>

              <div
                style={{
                  padding: 16,
                  borderRadius: 16,
                  background: "#F8FBFE",
                  border: "1px solid rgba(11,31,51,0.06)",
                  color: "#6B7A88",
                  lineHeight: 1.9,
                }}
              >
                Presentation depth may vary depending on audience, transaction
                context, and the level of detail appropriate for the person
                reviewing it.
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18, ...card() }}>
            <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
              How this can help
            </div>
            <div style={{ marginTop: 10, color: "#6B7A88", lineHeight: 1.9 }}>
              TrustSlip gives a more executive and presentable summary than the
              regular trust page. It helps a reviewer see that community-backed
              trust is visible, structured, and capable of independent verification.
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link to="/app/trust" style={actionLink(false)}>
                Return to community standing
              </Link>
              <Link to="/app/dashboard" style={actionLink(false)}>
                Return to dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}