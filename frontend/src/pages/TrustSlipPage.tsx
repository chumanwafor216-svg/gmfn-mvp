import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getMe } from "../lib/api";

type TrustSlipSummary = {
  code?: string | null;
  trust_limit?: string | number | null;
  currency?: string | null;
  status?: string | null;
  active?: boolean | null;
  reason?: string | null;
  expires_at?: string | null;
  holder_user_id?: number | null;
  clan_id?: number | null;
  last_verified_at?: string | null;
  snapshot_visibility_level?: string | null;
  snapshot_version?: string | null;
  issued_reason?: string | null;
  cci_score?: string | number | null;
  cci_band?: string | null;
  cci_class?: string | null;
  cci_reason?: string | null;
};

type TrustMePayload = {
  user_id?: number;
  email?: string | null;
  trust_score?: string | number | null;
  cci_score?: string | number | null;
  cci_class?: string | null;
  cci_reason?: string | null;
  computed?: any;
  last_change?: {
    event_type?: string | null;
    reason?: string | null;
    note?: string | null;
    created_at?: string | null;
  } | null;
};

type PackMeta = {
  pack_id?: string | null;
  protocol_version?: string | null;
  generated_at?: string | null;
  generated_at_utc?: string | null;
  note?: string | null;
};

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.10)",
    background: bg,
    padding: 22,
    boxShadow: "0 18px 44px rgba(15,23,42,0.06)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 20,
    border: "1px solid rgba(11,31,51,0.10)",
    background: bg,
    padding: 18,
    boxShadow: "0 10px 24px rgba(15,23,42,0.035)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.10)",
    background: bg,
    padding: 16,
    boxShadow: "0 8px 18px rgba(15,23,42,0.03)",
  };
}

function actionBtn(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    borderRadius: 14,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.10)",
    background: primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 1000,
    fontSize: 14,
    textDecoration: "none",
    cursor: "pointer",
    boxShadow: primary ? "0 10px 22px rgba(11,99,209,0.16)" : "none",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4F6B8A",
    fontWeight: 1000,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  };
}

function safeStr(x: any, fallback = "—"): string {
  const s = String(x ?? "").trim();
  return s || fallback;
}

function safeDateTime(x: any): string {
  const raw = String(x || "").trim();
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
}

function apiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";
  return String(raw || "").trim().replace(/\/+$/, "");
}

function getAccessTokenMaybe(): string {
  try {
    return (
      localStorage.getItem("access_token") ||
      localStorage.getItem("gmfn_access_token") ||
      sessionStorage.getItem("access_token") ||
      ""
    );
  } catch {
    return "";
  }
}

async function apiGet(path: string) {
  const token = getAccessTokenMaybe();
  const res = await fetch(`${apiBase()}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
}

function cciTone(score: number | null): "green" | "yellow" | "red" | "neutral" {
  if (score === null || Number.isNaN(score)) return "neutral";
  if (score >= 55) return "green";
  if (score >= 35) return "yellow";
  return "red";
}

function cciToneStyles(tone: "green" | "yellow" | "red" | "neutral") {
  if (tone === "green") {
    return {
      bg: "linear-gradient(180deg, #F3FCF6 0%, #ECFDF3 100%)",
      border: "1px solid rgba(34,197,94,0.18)",
      text: "#166534",
      badge: "Fair to deal with",
    };
  }
  if (tone === "yellow") {
    return {
      bg: "linear-gradient(180deg, #FFFDF5 0%, #FFFBEB 100%)",
      border: "1px solid rgba(245,158,11,0.18)",
      text: "#92400E",
      badge: "Growing, but needs care",
    };
  }
  if (tone === "red") {
    return {
      bg: "linear-gradient(180deg, #FFF5F5 0%, #FEF2F2 100%)",
      border: "1px solid rgba(239,68,68,0.18)",
      text: "#991B1B",
      badge: "Needs caution right now",
    };
  }
  return {
    bg: "linear-gradient(180deg, #FAFBFC 0%, #F8FAFC 100%)",
    border: "1px solid rgba(148,163,184,0.18)",
    text: "#334155",
    badge: "Still being prepared",
  };
}

export default function TrustSlipPage() {
  const [me, setMe] = useState<any>(null);
  const [trustMe, setTrustMe] = useState<TrustMePayload | null>(null);
  const [trustSlip, setTrustSlip] = useState<TrustSlipSummary | null>(null);
  const [packMeta, setPackMeta] = useState<PackMeta | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setErr("");
      setLoading(true);

      try {
        const [meRes, trustMeRes, packRes, slipRes] = await Promise.all([
          getMe().catch(() => null),
          apiGet("/trust/me").catch(() => null),
          apiGet("/trust/me/evidence-pack/meta").catch(() => null),
          apiGet("/trust-slips/me").catch(() => null),
        ]);

        setMe(meRes || null);
        setTrustMe(trustMeRes || null);
        setPackMeta(packRes || null);
        setTrustSlip(slipRes || null);
      } catch (e: any) {
        setErr(String(e?.message || e || "Unable to load TrustSlip page."));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const displayName = safeStr(
    me?.display_name || me?.nickname || me?.email || "Member",
    "Member"
  );

  const cciScoreNum = useMemo(() => {
    const raw =
      trustMe?.cci_score ??
      me?.cci_score ??
      trustSlip?.cci_score ??
      trustMe?.computed?.cci_score ??
      null;

    const n =
      raw === null || raw === undefined || String(raw).trim() === ""
        ? NaN
        : Number(raw);

    return Number.isNaN(n) ? null : n;
  }, [trustMe, me, trustSlip]);

  const cciClass = safeStr(
    trustMe?.cci_class ||
      me?.cci_class ||
      trustSlip?.cci_class ||
      trustSlip?.cci_band ||
      "Pending",
    "Pending"
  );

  const cciReason = safeStr(
    trustMe?.cci_reason ||
      me?.cci_reason ||
      trustSlip?.cci_reason ||
      trustMe?.computed?.cci_reason ||
      "Your portable trust reading is being prepared.",
    "Your portable trust reading is being prepared."
  );

  const tone = cciTone(cciScoreNum);
  const toneStyle = cciToneStyles(tone);

  const trustLimit = safeStr(
    trustSlip?.trust_limit ||
      trustMe?.computed?.standing_score ||
      trustMe?.trust_score ||
      "—"
  );

  const currency = safeStr(trustSlip?.currency || "NGN");
  const trustSlipCode = safeStr(trustSlip?.code || "", "");
  const hasTrustSlipCode = !!trustSlipCode;
  const verifyUrl = hasTrustSlipCode
    ? `/app/trust-slip/verify?code=${encodeURIComponent(trustSlipCode)}`
    : "";
  const slipStatus = safeStr(trustSlip?.status || "active");
  const packId = safeStr(packMeta?.pack_id || "Pending");
  const latestReason = safeStr(
    trustMe?.last_change?.reason ||
      trustMe?.last_change?.event_type ||
      "No recent change yet"
  );
  const latestNote = safeStr(
    trustMe?.last_change?.note || "A fuller note will appear when available."
  );

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: 30 }}>
      <div style={{ ...pageCard("#F5FAFF"), marginTop: 18 }}>
        <div style={sectionLabel()}>TrustSlip</div>

        <div
          style={{
            marginTop: 10,
            fontSize: 32,
            fontWeight: 1000,
            color: "#0B1F33",
          }}
        >
          Your portable trust record
        </div>

        <div
          style={{
            marginTop: 8,
            color: "#60758E",
            lineHeight: 1.8,
            maxWidth: 760,
          }}
        >
          This is the part you can carry forward. It gathers how fair,
          dependable, and support-ready you have been across the network and
          presents it in a readable form.
        </div>

        {err ? (
          <div
            style={{
              marginTop: 16,
              padding: "12px 14px",
              borderRadius: 14,
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              color: "#991B1B",
              fontWeight: 900,
            }}
          >
            {err}
          </div>
        ) : null}
      </div>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "1.05fr 0.95fr",
          gap: 18,
          alignItems: "stretch",
        }}
      >
        <div style={pageCard()}>
          <div style={sectionLabel()}>Holder</div>

          <div
            style={{
              marginTop: 12,
              color: "#0B1F33",
              fontWeight: 1000,
              fontSize: 30,
              lineHeight: 1.2,
            }}
          >
            {displayName}
          </div>

          <div
            style={{
              marginTop: 10,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 999,
              background: "#EEF5FF",
              border: "1px solid rgba(11,99,209,0.14)",
              color: "#18406B",
              fontSize: 14,
              fontWeight: 900,
            }}
          >
            GMFN ID: {safeStr(me?.gmfn_id || "Pending")}
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>TrustSlip code</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 1000,
                  fontSize: 20,
                }}
              >
                {hasTrustSlipCode ? trustSlipCode : "Not issued yet"}
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>Pack reference</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 1000,
                  fontSize: 18,
                }}
              >
                {packId}
              </div>
              <div
                style={{
                  marginTop: 8,
                  color: "#64748B",
                  fontSize: 13,
                  lineHeight: 1.7,
                }}
              >
                Quote this when you need to refer to your evidence pack.
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            ...pageCard(),
            background: toneStyle.bg,
            border: toneStyle.border,
          }}
        >
          <div style={sectionLabel()}>CCI reading carried by this TrustSlip</div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 38,
                  fontWeight: 1000,
                  lineHeight: 1,
                  color: toneStyle.text,
                }}
              >
                {cciClass}
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.75)",
                  border: toneStyle.border,
                  fontSize: 13,
                  fontWeight: 900,
                  color: toneStyle.text,
                }}
              >
                {toneStyle.badge}
              </div>
            </div>

            <div style={{ textAlign: "right", minWidth: 90 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 1000,
                  letterSpacing: 0.3,
                  color: toneStyle.text,
                  opacity: 0.8,
                  textTransform: "uppercase",
                }}
              >
                Score
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 24,
                  fontWeight: 1000,
                  color: toneStyle.text,
                }}
              >
                {cciScoreNum === null ? "—" : String(Math.round(cciScoreNum))}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 10,
              fontSize: 14,
              lineHeight: 1.8,
              color: "#64748B",
            }}
          >
            {tone === "green"
              ? "People can confidently rely on your word."
              : tone === "yellow"
              ? "People see potential, but will watch your consistency."
              : tone === "red"
              ? "People may be careful before relying on your word right now."
              : "Your trust position is still being prepared."}
          </div>

          <div
            style={{
              marginTop: 10,
              fontSize: 14,
              lineHeight: 1.8,
              color: "#64748B",
            }}
          >
            {tone === "red"
              ? "A few consistent actions can quickly improve this."
              : "Keep showing consistency across your network."}
          </div>

          <div
            style={{
              marginTop: 10,
              fontSize: 14,
              lineHeight: 1.8,
              color: toneStyle.text,
              opacity: 0.9,
            }}
          >
            {cciReason}
          </div>

          <div
            style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}
          >
            {hasTrustSlipCode ? (
              <Link to={verifyUrl} style={actionBtn(true)}>
                Verify TrustSlip
              </Link>
            ) : (
              <button
                type="button"
                disabled
                style={{ ...actionBtn(true), opacity: 0.65, cursor: "not-allowed" }}
              >
                TrustSlip not ready yet
              </button>
            )}

            <Link to="/app/trust" style={actionBtn(false)}>
              See why this changed
            </Link>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Trust limit</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 30,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {trustLimit}
          </div>
          <div style={{ marginTop: 6, color: "#64748B", fontSize: 14 }}>
            {currency}
          </div>
        </div>

        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Status</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 30,
              fontWeight: 1000,
              color: "#0B1F33",
              textTransform: "capitalize",
            }}
          >
            {slipStatus}
          </div>
          <div style={{ marginTop: 6, color: "#64748B", fontSize: 14 }}>
            Current TrustSlip state.
          </div>
        </div>

        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Last checked</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 20,
              fontWeight: 1000,
              color: "#0B1F33",
              lineHeight: 1.5,
            }}
          >
            {safeDateTime(
              trustSlip?.last_verified_at ||
                packMeta?.generated_at ||
                packMeta?.generated_at_utc
            )}
          </div>
          <div style={{ marginTop: 6, color: "#64748B", fontSize: 14 }}>
            Most recent visible verification time.
          </div>
        </div>

        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Visibility level</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 20,
              fontWeight: 1000,
              color: "#0B1F33",
              textTransform: "capitalize",
            }}
          >
            {safeStr(trustSlip?.snapshot_visibility_level || "Standard")}
          </div>
          <div style={{ marginTop: 6, color: "#64748B", fontSize: 14 }}>
            What level of detail this TrustSlip is carrying.
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "0.95fr 1.05fr",
          gap: 18,
        }}
      >
        <div style={pageCard()}>
          <div style={sectionLabel()}>What this means in simple words</div>

          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            <div style={innerCard("#FCFEFF")}>
              <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 18 }}>
                This is not a bank score
              </div>
              <div
                style={{
                  marginTop: 8,
                  color: "#64748B",
                  lineHeight: 1.8,
                  fontSize: 14,
                }}
              >
                It reflects how fair, dependable, and support-aware you have been
                among people and communities that already know you.
              </div>
            </div>

            <div style={innerCard("#FCFEFF")}>
              <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 18 }}>
                It carries your trust forward
              </div>
              <div
                style={{
                  marginTop: 8,
                  color: "#64748B",
                  lineHeight: 1.8,
                  fontSize: 14,
                }}
              >
                Your TrustSlip gathers your current reading so that it can be shown
                clearly when you need support, trade, or verification.
              </div>
            </div>

            <div style={innerCard("#FCFEFF")}>
              <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 18 }}>
                It depends on your actions
              </div>
              <div
                style={{
                  marginTop: 8,
                  color: "#64748B",
                  lineHeight: 1.8,
                  fontSize: 14,
                }}
              >
                Fair repayment, support reliability, and consistency across the
                network shape what this page says about you.
              </div>
            </div>
          </div>
        </div>

        <div style={pageCard()}>
          <div style={sectionLabel()}>
            Latest trust change carried into this record
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            <div style={softCard("#FFFFFF")}>
              <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 18 }}>
                Latest source
              </div>
              <div
                style={{
                  marginTop: 8,
                  color: "#64748B",
                  fontSize: 14,
                  lineHeight: 1.8,
                }}
              >
                {latestReason}
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 18 }}>
                Note
              </div>
              <div
                style={{
                  marginTop: 8,
                  color: "#64748B",
                  fontSize: 14,
                  lineHeight: 1.8,
                }}
              >
                {latestNote}
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 18 }}>
                Time
              </div>
              <div
                style={{
                  marginTop: 8,
                  color: "#64748B",
                  fontSize: 14,
                  lineHeight: 1.8,
                }}
              >
                {safeDateTime(trustMe?.last_change?.created_at)}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a
                href={`${apiBase()}/trust/me/evidence-pack.zip`}
                style={actionBtn(true)}
              >
                Download Evidence Pack
              </a>

              <a
                href={`${apiBase()}/trust/me/timeline.pdf`}
                style={actionBtn(false)}
              >
                Download Timeline PDF
              </a>
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...pageCard(), marginTop: 18 }}>
        <div style={sectionLabel()}>Next useful actions</div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <div style={innerCard("#FCFEFF")}>
            <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 18 }}>
              Verify this page outwardly
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#64748B",
                fontSize: 14,
                lineHeight: 1.8,
              }}
            >
              Use the verify page when you want another person to confirm this
              TrustSlip clearly.
            </div>
            <div style={{ marginTop: 12 }}>
              {hasTrustSlipCode ? (
                <Link to={verifyUrl} style={actionBtn(true)}>
                  Open Verify Page
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  style={{ ...actionBtn(true), opacity: 0.65, cursor: "not-allowed" }}
                >
                  TrustSlip not ready yet
                </button>
              )}
            </div>
          </div>

          <div style={innerCard("#FCFEFF")}>
            <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 18 }}>
              Read the fuller trust story
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#64748B",
                fontSize: 14,
                lineHeight: 1.8,
              }}
            >
              Open your trust page to understand what shaped this reading.
            </div>
            <div style={{ marginTop: 12 }}>
              <Link to="/app/trust" style={actionBtn(false)}>
                Open Trust Page
              </Link>
            </div>
          </div>

          <div style={innerCard("#FCFEFF")}>
            <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 18 }}>
              Keep building it
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#64748B",
                fontSize: 14,
                lineHeight: 1.8,
              }}
            >
              Fair repayment, dependable support, and consistency are what make
              this record stronger over time.
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ ...pageCard(), marginTop: 18 }}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading TrustSlip...
          </div>
        </div>
      ) : null}
    </div>
  );
}