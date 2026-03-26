import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getMe,
  getMyTrustSlip,
  listMyClans,
  getSelectedClanId,
  selectClan,
} from "../lib/api";

type ClanItem = {
  id?: number;
  name?: string | null;
  display_name?: string | null;
  community_id?: string | null;
  marketplace_id?: string | null;
  gmfn_id?: string | null;
  clan_code?: string | null;
  description?: string | null;
};

type CciState = {
  classText: string;
  scoreText: string;
  tone: "green" | "yellow" | "red" | "neutral";
  statusText: string;
};

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 18,
    boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 14,
  };
}

function btn(primary = false): React.CSSProperties {
  return {
    border: "1px solid rgba(11,31,51,0.10)",
    background: primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 14,
    fontWeight: 900,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "6px 10px",
    background: primary ? "rgba(11,99,209,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#0B63D1" : "#475569",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
  };
}

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function apiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";
  return String(raw || "").trim().replace(/\/+$/, "");
}

function apiOrigin(): string {
  const base = apiBase();

  if (base.startsWith("http://") || base.startsWith("https://")) {
    try {
      const u = new URL(base);
      return `${u.protocol}//${u.host}`;
    } catch {
      return "http://127.0.0.1:8012";
    }
  }

  return "http://127.0.0.1:8012";
}

function communityName(c: ClanItem): string {
  return String(c.display_name || c.name || "Community");
}

function communityId(c: ClanItem): string {
  return String(
    c.community_id || c.marketplace_id || c.gmfn_id || c.clan_code || "Pending"
  );
}

function getCciState(me: any): CciState {
  const rawScore =
    me?.cci_score ??
    me?.cross_client_integrity_score ??
    me?.cross_clan_integrity_score ??
    me?.cross_community_integrity_score ??
    null;

  const rawClass =
    me?.cci_class ??
    me?.cross_client_integrity_class ??
    me?.cross_clan_integrity_class ??
    me?.cross_community_integrity_class ??
    "";

  const scoreNum =
    rawScore === null || rawScore === undefined || String(rawScore).trim() === ""
      ? null
      : Number(rawScore);

  const classText = String(rawClass || "").trim().toUpperCase();

  if (classText) {
    return {
      classText,
      scoreText:
        scoreNum === null || Number.isNaN(scoreNum)
          ? "—"
          : String(Math.round(scoreNum)),
      tone:
        classText === "A" || classText === "A+" || classText === "B"
          ? "green"
          : classText === "C"
          ? "yellow"
          : "red",
      statusText:
        classText === "A" || classText === "A+"
          ? "Healthy"
          : classText === "B"
            ? "Stable"
            : classText === "C"
              ? "Needs attention"
              : "At risk",
    };
  }

  if (scoreNum !== null && !Number.isNaN(scoreNum)) {
    if (scoreNum >= 75) {
      return {
        classText: "A",
        scoreText: String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Healthy",
      };
    }
    if (scoreNum >= 55) {
      return {
        classText: "B",
        scoreText: String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Stable",
      };
    }
    if (scoreNum >= 35) {
      return {
        classText: "C",
        scoreText: String(Math.round(scoreNum)),
        tone: "yellow",
        statusText: "Needs attention",
      };
    }
    return {
      classText: "D",
      scoreText: String(Math.round(scoreNum)),
      tone: "red",
      statusText: "At risk",
    };
  }

  return {
    classText: "Pending",
    scoreText: "—",
    tone: "neutral",
    statusText: "Preparing",
  };
}

function cciToneStyles(tone: "green" | "yellow" | "red" | "neutral") {
  if (tone === "green") {
    return {
      bg: "#F0FDF4",
      border: "1px solid rgba(34,197,94,0.18)",
      text: "#166534",
    };
  }

  if (tone === "yellow") {
    return {
      bg: "#FFFBEB",
      border: "1px solid rgba(245,158,11,0.18)",
      text: "#92400E",
    };
  }

  if (tone === "red") {
    return {
      bg: "#FEF2F2",
      border: "1px solid rgba(239,68,68,0.18)",
      text: "#991B1B",
    };
  }

  return {
    bg: "#F8FAFC",
    border: "1px solid rgba(148,163,184,0.18)",
    text: "#334155",
  };
}

export default function CommunityHomePage() {
  const [me, setMe] = useState<any>(null);
  const [trustSlip, setTrustSlip] = useState<any>(null);
  const [clans, setClans] = useState<ClanItem[]>([]);
  const [selectedClanId, setSelectedClanId] = useState<number | null>(
    getSelectedClanId()
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [meRes, trustSlipRes, clansRes] = await Promise.all([
          getMe().catch(() => null),
          getMyTrustSlip().catch(() => null),
          listMyClans().catch(() => []),
        ]);

        const rows = Array.isArray(clansRes) ? clansRes : [];
        setMe(meRes || null);
        setTrustSlip(trustSlipRes || null);
        setClans(rows);

        const storedId = Number(getSelectedClanId() || 0);

        if (!storedId && rows.length > 0 && rows[0]?.id) {
          const firstId = Number(rows[0].id);
          await selectClan(firstId).catch(() => null);
          setSelectedClanId(firstId);
        } else if (storedId) {
          setSelectedClanId(storedId);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSelectClan(id: number) {
    await selectClan(id).catch(() => null);
    setSelectedClanId(id);
  }

  const cci = useMemo(() => getCciState(me), [me]);
  const cciTone = useMemo(() => cciToneStyles(cci.tone), [cci.tone]);

  const displayName = safeStr(
    me?.display_name || me?.full_name || me?.nickname || me?.email || "Member"
  );

  const gmfnId = safeStr(me?.gmfn_id || "Pending");
  const trustSlipCode = safeStr(trustSlip?.code || "");

  return (
    <div
      style={{
        maxWidth: 1040,
        margin: "0 auto",
        paddingBottom: 30,
        display: "grid",
        gap: 16,
      }}
    >
      <div style={pageCard()}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.15fr 0.85fr",
            gap: 16,
            alignItems: "stretch",
          }}
        >
          <div style={softCard("#FCFEFF")}>
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 900 }}>
              My identity
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 1000,
                fontSize: 30,
                lineHeight: 1.15,
              }}
            >
              {displayName}
            </div>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>GMFN ID: {gmfnId}</span>
              <span style={badge(false)}>CCI: {cci.classText}</span>
              <span style={badge(false)}>Score: {cci.scoreText}</span>
            </div>

            <div
              style={{
                marginTop: 14,
                color: "#64748B",
                fontSize: 14,
                lineHeight: 1.75,
                maxWidth: 560,
              }}
            >
              Your identity travels with you across the communities you belong to.
              This page only shows your identity and the communities you belong to.
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <Link to="/app/shop-control" style={btn(true)}>
                My Shop
              </Link>
              <Link to="/app/trust-slip" style={btn(false)}>
                TrustSlip
              </Link>
              <Link to="/app/trust" style={btn(false)}>
                Trust
              </Link>
              <Link to="/app/clans" style={btn(false)}>
                Create Community
              </Link>
            </div>
          </div>

          <div
            style={{
              ...softCard(cciTone.bg),
              border: cciTone.border,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <div>
                <div style={{ fontSize: 13, color: cciTone.text, fontWeight: 900 }}>
                  Trust standing
                </div>

                <div
                  style={{
                    marginTop: 12,
                    fontSize: 40,
                    fontWeight: 1000,
                    lineHeight: 1,
                    color: cciTone.text,
                  }}
                >
                  {cci.classText}
                </div>

                <div
                  style={{
                    marginTop: 10,
                    display: "inline-flex",
                    padding: "7px 12px",
                    borderRadius: 999,
                    background: "#FFFFFF",
                    border: cciTone.border,
                    color: cciTone.text,
                    fontSize: 13,
                    fontWeight: 900,
                  }}
                >
                  Score: {cci.scoreText}
                </div>

                <div
                  style={{
                    marginTop: 14,
                    color: cciTone.text,
                    fontWeight: 900,
                    fontSize: 18,
                  }}
                >
                  {cci.statusText}
                </div>
              </div>

              {trustSlipCode ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <img
                    src={`${apiOrigin()}/trust-slips/verify/${encodeURIComponent(
                      trustSlipCode
                    )}/qr.png`}
                    alt="Trust QR"
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 12,
                      border: "1px solid rgba(11,31,51,0.10)",
                      background: "#FFFFFF",
                      padding: 4,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 11,
                      color: "#64748B",
                      fontWeight: 700,
                      textAlign: "center",
                    }}
                  >
                    Scan to verify
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 12,
                    border: "1px dashed rgba(11,31,51,0.16)",
                    background: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    color: "#64748B",
                  }}
                >
                  No QR
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <Link to="/app/trust-slip" style={btn(true)}>
                Open TrustSlip
              </Link>
              <Link to="/app/trust" style={btn(false)}>
                Open Trust
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div style={pageCard()}>
        <div style={{ fontWeight: 900, color: "#0B1F33", fontSize: 18 }}>
          Money & Support
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Link to="/app/payment/pool" style={btn(false)}>
            Money In
          </Link>
          <Link to="/app/withdrawal-instructions" style={btn(false)}>
            Money Out
          </Link>
          <Link to="/app/loans" style={btn(false)}>
            Loans
          </Link>
          <Link to="/app/loan-readiness" style={btn(false)}>
            Readiness
          </Link>
          <Link to="/app/loan-workbench" style={btn(false)}>
            Workbench
          </Link>
          <Link to="/app/guarantor-earnings" style={btn(false)}>
            Earnings
          </Link>
          <Link to="/app/loan-suggestions" style={btn(false)}>
            Suggestions
          </Link>
        </div>
      </div>

      <div style={pageCard()}>
        <div style={{ fontWeight: 900, color: "#0B1F33", fontSize: 18 }}>
          My Communities
        </div>

        <div
          style={{
            marginTop: 8,
            color: "#64748B",
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          Open any community you belong to.
        </div>

        {loading ? (
          <div style={{ marginTop: 14, color: "#64748B" }}>
            Loading communities...
          </div>
        ) : clans.length === 0 ? (
          <div style={{ marginTop: 14, color: "#64748B" }}>
            No communities yet
          </div>
        ) : (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gap: 10,
            }}
          >
            {clans.map((c) => {
              const id = Number(c.id || 0);
              const active = id === selectedClanId;

              return (
                <div key={id} style={softCard()}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: "#0B1F33",
                          fontWeight: 1000,
                          fontSize: 18,
                        }}
                      >
                        {communityName(c)}
                      </div>

                      <div
                        style={{
                          marginTop: 6,
                          color: "#64748B",
                          fontSize: 13,
                        }}
                      >
                        Community ID: {communityId(c)}
                      </div>

                      {safeStr(c.description) ? (
                        <div
                          style={{
                            marginTop: 8,
                            color: "#64748B",
                            fontSize: 14,
                            lineHeight: 1.65,
                          }}
                        >
                          {safeStr(c.description)}
                        </div>
                      ) : null}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectClan(id)}
                        style={active ? btn(true) : btn(false)}
                      >
                        {active ? "Selected" : "Select"}
                      </button>

                      <Link to={`/community/${id}`} style={btn(false)}>
                        Open Community
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}