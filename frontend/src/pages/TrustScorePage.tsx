import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getCurrentClan,
  getMe,
  getPoolMe,
  getTrustScoreExplained,
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
  latest_reason?: string | null;
  latest_source?: string | null;
  explanation?: string | null;
};

type PoolLite = {
  available_balance?: string | null;
  effective_available?: string | null;
  currency?: string | null;
};

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function asNum(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function displayName(me: MeLite | null): string {
  const n1 = safeStr(me?.display_name);
  if (n1) return n1;

  const n2 = safeStr(me?.nickname);
  if (n2) return n2;

  const email = safeStr(me?.email);
  if (!email) return "Member";

  return email.split("@")[0] || "Member";
}

function pagePattern(): string {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="320" viewBox="0 0 1600 320">
    <rect width="1600" height="320" fill="#F8FBFE"/>
    <g fill="none" stroke="#C7D9EE" stroke-opacity="0.40" stroke-width="2">
      <path d="M70 170 C180 90, 290 90, 400 170 S620 250, 730 170" />
      <path d="M900 170 C1010 90, 1120 90, 1230 170 S1450 250, 1560 170" />
    </g>
    <g fill="#D6AF47" fill-opacity="0.92">
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

function softCard(bg = "#F8FBFE"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.06)",
    background: bg,
    padding: 16,
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
    return {
      ...base,
      background: "#EFF6FF",
      borderColor: "#BFDBFE",
      color: "#1D4ED8",
    };
  }

  if (kind === "gold") {
    return {
      ...base,
      background: "#FFFBEB",
      borderColor: "#FDE68A",
      color: "#92400E",
    };
  }

  if (kind === "green") {
    return {
      ...base,
      background: "#ECFDF5",
      borderColor: "#A7F3D0",
      color: "#065F46",
    };
  }

  return {
    ...base,
    background: "#F8FAFC",
    borderColor: "#E2E8F0",
    color: "#475569",
  };
}

function Meter({
  title,
  value,
  max,
  suffix,
  note,
}: {
  title: string;
  value: number;
  max: number;
  suffix?: string;
  note: string;
}) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));

  return (
    <div
      style={{
        padding: 18,
        borderRadius: 18,
        background: "#F8FBFE",
        border: "1px solid rgba(11,31,51,0.06)",
      }}
    >
      <div style={{ fontWeight: 1000, color: "#0B1F33" }}>{title}</div>

      <div
        style={{
          marginTop: 10,
          fontSize: 34,
          fontWeight: 1000,
          color: "#0B1F33",
        }}
      >
        {value.toFixed(2)} {suffix || ""}
      </div>

      <div
        style={{
          marginTop: 10,
          height: 12,
          borderRadius: 999,
          background: "#EAF2FA",
          overflow: "hidden",
          border: "1px solid rgba(11,31,51,0.06)",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 999,
            background: "linear-gradient(90deg, #0B63D1 0%, #3FA2FF 100%)",
          }}
        />
      </div>

      <div
        style={{
          marginTop: 8,
          color: "#6B7A88",
          lineHeight: 1.7,
          fontSize: 13,
        }}
      >
        {note}
      </div>
    </div>
  );
}

export default function TrustScorePage() {
  const [me, setMe] = useState<MeLite | null>(null);
  const [clan, setClan] = useState<ClanLite | null>(null);
  const [trust, setTrust] = useState<TrustLite | null>(null);
  const [pool, setPool] = useState<PoolLite | null>(null);
  const [loading, setLoading] = useState(true);

  const pattern = useMemo(() => pagePattern(), []);

  useEffect(() => {
    (async () => {
      setLoading(true);

      try {
        const [meRes, clanRes, trustRes, poolRes] = await Promise.all([
          getMe().catch(() => null),
          getCurrentClan().catch(() => null),
          getTrustScoreExplained().catch(() => null),
          getPoolMe("NGN", 10).catch(() => null),
        ]);

        setMe(meRes || null);
        setClan(clanRes || null);
        setTrust(trustRes || null);
        setPool(poolRes || null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const name = displayName(me);
  const gmfnId = safeStr(me?.gmfn_id || "GMFN ID pending");
  const communityName = safeStr(clan?.name || "No active community");
  const score = asNum(
    trust?.score ?? trust?.trust_score ?? trust?.standing_score ?? 0
  );
  const band = safeStr(trust?.band || "Band E");
  const effectivePool = asNum(
    pool?.effective_available ?? pool?.available_balance ?? 0
  );
  const poolCurrency = safeStr(pool?.currency || "NGN");
  const latestReason = safeStr(
    trust?.latest_reason || trust?.latest_source || "Not yet available"
  );
  const trustExplanation = safeStr(trust?.explanation || "");

  const trustMeaning = [
    "Trust standing reflects visible behaviour inside the community trust system.",
    "Repayment, support completion, and other verified activity can gradually influence this standing.",
    "The purpose is clarity, accountability, and stronger community confidence.",
  ];

  return (
    <div style={{ maxWidth: 1320, margin: "0 auto", paddingBottom: 36 }}>
      <div
        style={{
          backgroundImage: `url("${pattern}")`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          borderRadius: 28,
          border: "1px solid rgba(11,31,51,0.06)",
          overflow: "hidden",
          backgroundColor: "#F8FBFE",
          marginTop: 18,
        }}
      >
        <div style={{ padding: 24 }}>
          <div style={{ fontSize: 38, fontWeight: 1000, color: "#0B1F33" }}>
            Trust
          </div>

          <div
            style={{
              marginTop: 10,
              color: "#6B7A88",
              lineHeight: 1.8,
            }}
          >
            Understand your trust position, what it means, and how it connects to
            your visible economic credibility.
          </div>

          {loading ? (
            <div style={{ marginTop: 18, ...card(), color: "#64748B" }}>
              Loading trust view...
            </div>
          ) : (
            <>
              <div
                style={{
                  marginTop: 18,
                  display: "grid",
                  gridTemplateColumns: "1.1fr 0.9fr",
                  gap: 18,
                }}
              >
                <div
                  style={{
                    ...card(),
                    background:
                      "linear-gradient(180deg, rgba(239,246,255,0.96) 0%, rgba(255,255,255,0.98) 100%)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "#5B7693",
                      fontWeight: 1000,
                      letterSpacing: 1,
                    }}
                  >
                    TRUST POSITION
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 34,
                      fontWeight: 1000,
                      color: "#0B1F33",
                    }}
                  >
                    {name}
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={pill("blue")}>{gmfnId}</span>
                    <span style={pill("gold")}>{band}</span>
                    <span style={pill("gray")}>{communityName}</span>
                  </div>

                  <div
                    style={{
                      marginTop: 18,
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 14,
                    }}
                  >
                    <Meter
                      title="Trust standing"
                      value={score}
                      max={100}
                      note="This is your member-facing trust reading, not an admin control."
                    />

                    <Meter
                      title="Pool context"
                      value={effectivePool}
                      max={Math.max(100, effectivePool * 2 || 100)}
                      suffix={poolCurrency}
                      note="Pool strength and trust visibility can support practical community finance."
                    />
                  </div>
                </div>

                <div style={card()}>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 1000,
                      color: "#0B1F33",
                    }}
                  >
                    What this means
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                    {trustMeaning.map((text, i) => (
                      <div
                        key={i}
                        style={{
                          padding: 14,
                          borderRadius: 14,
                          background: "#F8FBFE",
                          border: "1px solid rgba(11,31,51,0.06)",
                          color: "#6B7A88",
                          lineHeight: 1.8,
                        }}
                      >
                        {text}
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      marginTop: 16,
                      color: "#6B7A88",
                      lineHeight: 1.8,
                    }}
                  >
                    Latest visible reason:{" "}
                    <b style={{ color: "#0B1F33" }}>{latestReason}</b>
                  </div>

                  <div
                    style={{
                      marginTop: 16,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <Link to="/app/trust-slip" style={actionLink(true)}>
                      Open TrustSlip
                    </Link>
                    <Link to="/app/dashboard" style={actionLink(false)}>
                      Dashboard
                    </Link>
                    <Link to="/app/community" style={actionLink(false)}>
                      Community Home
                    </Link>
                  </div>
                </div>
              </div>

              {trustExplanation ? (
                <div style={{ marginTop: 18, ...card() }}>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 1000,
                      color: "#0B1F33",
                    }}
                  >
                    Current explanation
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      color: "#6B7A88",
                      lineHeight: 1.9,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {trustExplanation}
                  </div>
                </div>
              ) : null}

              <div
                style={{
                  marginTop: 18,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 18,
                }}
              >
                <div style={card()}>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 1000,
                      color: "#0B1F33",
                    }}
                  >
                    How trust helps
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      color: "#6B7A88",
                      lineHeight: 1.9,
                    }}
                  >
                    Trust standing helps the community interpret whether a person
                    has a visible pattern of reliable behaviour. Over time, this
                    can support fairer community finance, clearer expectations,
                    and stronger confidence between members.
                  </div>

                  <div style={{ marginTop: 16, ...softCard() }}>
                    <div style={{ ...pill("green"), width: "fit-content" }}>
                      Member-facing surface
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        color: "#6B7A88",
                        lineHeight: 1.8,
                        fontSize: 14,
                      }}
                    >
                      This page is for understanding your trust position. It is
                      not an admin analytics or system-operations surface.
                    </div>
                  </div>
                </div>

                <div style={card()}>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 1000,
                      color: "#0B1F33",
                    }}
                  >
                    Guided next step
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      color: "#6B7A88",
                      lineHeight: 1.9,
                    }}
                  >
                    If you want a portable summary of your trust position, open
                    the TrustSlip. That is the member-facing surface for carrying
                    your trust into real interactions.
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <Link to="/app/trust-slip" style={actionLink(true)}>
                      Open TrustSlip
                    </Link>
                    <Link to="/app/my-gmfn-and-i" style={actionLink(false)}>
                      Open Guide
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}