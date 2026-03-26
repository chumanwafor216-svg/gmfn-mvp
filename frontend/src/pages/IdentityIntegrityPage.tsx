import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import { getMyIdentityRisk } from "../lib/api";

function safeStr(x: any, fallback = "—"): string {
  const s = String(x ?? "").trim();
  return s || fallback;
}

function firstValue(obj: any, paths: string[]): any {
  for (const path of paths) {
    const value = path.split(".").reduce((acc, key) => {
      if (acc == null) return undefined;
      return acc[key];
    }, obj);

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return null;
}

function safeDateTime(x: any): string {
  const raw = String(x || "").trim();
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
}

function prettyValue(v: any): string {
  if (v == null) return "—";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.10)",
    background: bg,
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

function softCard(bg = "#F8FAFC"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
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

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4F6B8A",
    fontWeight: 1000,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  };
}

function toneForStatus(status: string) {
  const s = status.toLowerCase();

  if (
    s.includes("ok") ||
    s.includes("healthy") ||
    s.includes("clear") ||
    s.includes("safe")
  ) {
    return {
      bg: "linear-gradient(180deg, #F3FCF6 0%, #ECFDF3 100%)",
      border: "1px solid rgba(34,197,94,0.18)",
      text: "#166534",
    };
  }

  if (
    s.includes("risk") ||
    s.includes("alert") ||
    s.includes("warning") ||
    s.includes("flag") ||
    s.includes("high")
  ) {
    return {
      bg: "linear-gradient(180deg, #FFF5F5 0%, #FEF2F2 100%)",
      border: "1px solid rgba(239,68,68,0.18)",
      text: "#991B1B",
    };
  }

  return {
    bg: "linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)",
    border: "1px solid rgba(59,130,246,0.18)",
    text: "#1D4ED8",
  };
}

export default function IdentityIntegrityPage() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");

      try {
        const res = await getMyIdentityRisk();
        setData(res || null);
      } catch (e: any) {
        setErr(String(e?.message || e || "Unable to load identity integrity."));
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const summary = useMemo(() => {
    const status = safeStr(
      firstValue(data, [
        "integrity_status",
        "risk_status",
        "status",
        "summary.status",
        "detail",
      ]) || "Monitoring"
    );

    const score = firstValue(data, [
      "risk_score",
      "integrity_score",
      "score",
      "summary.score",
    ]);

    const band = safeStr(
      firstValue(data, ["risk_band", "band", "summary.band"]) || "—"
    );

    const deviceCount = firstValue(data, [
      "device_count",
      "devices_total",
      "summary.device_count",
    ]);

    const lastSeen = firstValue(data, [
      "last_seen_at",
      "updated_at",
      "created_at",
      "summary.last_seen_at",
    ]);

    const note = safeStr(
      firstValue(data, ["note", "detail", "summary.note"]) ||
        "Identity observations help detect unusual account or device behaviour."
    );

    const flagsRaw =
      firstValue(data, [
        "flags",
        "risk_flags",
        "summary.flags",
        "summary.risk_flags",
      ]) || [];

    const flags = Array.isArray(flagsRaw)
      ? flagsRaw.map((item) => safeStr(item)).filter(Boolean)
      : [];

    return {
      status,
      score,
      band,
      deviceCount,
      lastSeen,
      note,
      flags,
    };
  }, [data]);

  const tone = toneForStatus(summary.status);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 30 }}>
      <PageTopNav
        title="Identity Integrity"
        subtitle="Review how your account and device pattern looks from a member-facing identity safety view."
      />

      <div
        style={{
          ...pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
          marginTop: 18,
        }}
      >
        <div style={sectionLabel()}>Identity integrity</div>

        <div
          style={{
            marginTop: 10,
            fontSize: 30,
            fontWeight: 1000,
            color: "#0B1F33",
            lineHeight: 1.15,
          }}
        >
          Keep your identity pattern clear and consistent
        </div>

        <div
          style={{
            marginTop: 10,
            color: "#6B7A88",
            lineHeight: 1.8,
            maxWidth: 760,
          }}
        >
          This page helps you understand whether your account and device pattern
          looks normal, stable, and easy to trust.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Link to="/app/dashboard" style={actionLink(true)}>
            Dashboard
          </Link>
          <Link to="/app/community" style={actionLink(false)}>
            Community Home
          </Link>
          <Link to="/app/trust" style={actionLink(false)}>
            Trust
          </Link>
        </div>
      </div>

      {err ? (
        <div
          style={{
            ...pageCard("#FEF2F2"),
            marginTop: 18,
            border: "1px solid #FECACA",
            color: "#991B1B",
            fontWeight: 900,
          }}
        >
          {err}
        </div>
      ) : null}

      {loading ? (
        <div style={{ ...pageCard(), marginTop: 18, color: "#64748B" }}>
          Loading identity integrity...
        </div>
      ) : (
        <>
          <div
            style={{
              ...pageCard(tone.bg),
              marginTop: 18,
              border: tone.border,
            }}
          >
            <div style={sectionLabel()}>Current status</div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                justifyContent: "space-between",
                gap: 14,
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 30,
                    fontWeight: 1000,
                    color: tone.text,
                    lineHeight: 1.1,
                  }}
                >
                  {summary.status}
                </div>

                <div
                  style={{
                    marginTop: 10,
                    color: "#475569",
                    lineHeight: 1.8,
                    maxWidth: 700,
                  }}
                >
                  {summary.note}
                </div>
              </div>

              <div style={{ minWidth: 140, textAlign: "right" }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 1000,
                    color: tone.text,
                    opacity: 0.8,
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                  }}
                >
                  Score / Band
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 24,
                    fontWeight: 1000,
                    color: tone.text,
                  }}
                >
                  {summary.score == null || String(summary.score).trim() === ""
                    ? "—"
                    : String(summary.score)}
                  {" / "}
                  {summary.band}
                </div>
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
              <div style={sectionLabel()}>Devices seen</div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 28,
                  fontWeight: 1000,
                  color: "#0B1F33",
                }}
              >
                {summary.deviceCount == null || String(summary.deviceCount).trim() === ""
                  ? "—"
                  : String(summary.deviceCount)}
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Last seen</div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 18,
                  fontWeight: 1000,
                  color: "#0B1F33",
                  lineHeight: 1.5,
                }}
              >
                {safeDateTime(summary.lastSeen)}
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Visible flags</div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 28,
                  fontWeight: 1000,
                  color: "#0B1F33",
                }}
              >
                {summary.flags.length}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 18,
            }}
          >
            <div style={pageCard()}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 1000,
                  color: "#0B1F33",
                }}
              >
                What this page is for
              </div>

              <div
                style={{
                  marginTop: 10,
                  color: "#475569",
                  lineHeight: 1.8,
                }}
              >
                Identity integrity helps show whether your account use looks
                consistent. It supports account trust and safer community use.
              </div>
            </div>

            <div style={pageCard()}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 1000,
                  color: "#0B1F33",
                }}
              >
                What to do if something looks wrong
              </div>

              <div
                style={{
                  marginTop: 10,
                  color: "#475569",
                  lineHeight: 1.8,
                }}
              >
                Keep your access pattern simple, use the same trusted devices,
                avoid account sharing, and review any visible trust changes.
              </div>
            </div>
          </div>

          {summary.flags.length > 0 ? (
            <div style={{ ...pageCard(), marginTop: 18 }}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 1000,
                  color: "#0B1F33",
                }}
              >
                Visible flags
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                {summary.flags.map((flag, idx) => (
                  <div key={idx} style={innerCard("#F8FBFF")}>
                    <div
                      style={{
                        color: "#0B1F33",
                        fontWeight: 900,
                        lineHeight: 1.7,
                      }}
                    >
                      {flag}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div style={{ ...pageCard(), marginTop: 18 }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 1000,
                color: "#0B1F33",
              }}
            >
              Live identity data
            </div>

            <pre
              style={{
                marginTop: 12,
                whiteSpace: "pre-wrap",
                fontSize: 13,
                color: "#334155",
                background: "#F8FAFC",
                border: "1px solid rgba(11,31,51,0.08)",
                borderRadius: 14,
                padding: 14,
              }}
            >
              {prettyValue(data)}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}