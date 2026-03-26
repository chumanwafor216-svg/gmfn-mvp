import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import { getExposureAdmin } from "../lib/api";

function safeStr(x: any, fallback = "—"): string {
  const s = String(x ?? "").trim();
  return s || fallback;
}

function readPath(obj: any, path: string): any {
  return path.split(".").reduce((acc, key) => {
    if (acc == null) return undefined;
    return acc[key];
  }, obj);
}

function firstValue(obj: any, paths: string[]): any {
  for (const path of paths) {
    const value = readPath(obj, path);
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return null;
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

type InfoCardProps = {
  title: string;
  body: string;
};

function InfoCard({ title, body }: InfoCardProps) {
  return (
    <div style={softCard()}>
      <div style={{ fontWeight: 1000, color: "#0B1F33", fontSize: 18 }}>
        {title}
      </div>
      <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.8 }}>
        {body}
      </div>
    </div>
  );
}

export default function ExposureAdminPage() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");

      try {
        const res = await getExposureAdmin();
        setData(res || null);
      } catch (e: any) {
        setErr(String(e?.message || e || "Unable to load exposure admin view."));
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const summary = useMemo(() => {
    return {
      totalExposure: firstValue(data, [
        "total_exposure",
        "summary.total_exposure",
        "exposure_total",
        "totals.total_exposure",
        "totals.exposure",
      ]),
      concentrationRatio: firstValue(data, [
        "concentration_ratio",
        "summary.concentration_ratio",
        "concentration_index",
        "summary.concentration_index",
      ]),
      flaggedCount: firstValue(data, [
        "flagged_count",
        "summary.flagged_count",
        "flagged_entities",
        "summary.flagged_entities",
        "risk_flags_total",
      ]),
      updatedAt: firstValue(data, [
        "updated_at",
        "generated_at",
        "summary.generated_at",
        "as_of",
      ]),
    };
  }, [data]);

  const riskFlags = useMemo(() => {
    const value =
      firstValue(data, [
        "risk_flags",
        "summary.risk_flags",
        "flags",
        "alerts",
      ]) || [];

    if (Array.isArray(value)) {
      return value.map((x) => safeStr(x)).filter(Boolean);
    }

    return [];
  }, [data]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 30 }}>
      <PageTopNav
        title="Safety & Risk"
        subtitle="Admin-only exposure view for concentration, pilot risk, and governance-sensitive patterns."
      />

      <div
        style={{
          ...pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
          marginTop: 18,
        }}
      >
        <div style={sectionLabel()}>Command Center</div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 34, fontWeight: 1000, color: "#0B1F33" }}>
              Exposure and Risk
            </div>
            <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
              Use this page to inspect exposure concentration, pilot-stage risk
              conditions, and governance-sensitive patterns. This is an
              admin-only surface and should not appear in ordinary member flow.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/app/command-center" style={actionLink(false)}>
              Command Center
            </Link>
            <Link to="/app/command-center/trust-analytics" style={actionLink(false)}>
              Trust Analytics
            </Link>
            <Link to="/app/command-center/trust-graph" style={actionLink(false)}>
              Trust Graph
            </Link>
            <Link to="/app/command-center/exposure" style={actionLink(true)}>
              Safety & Risk
            </Link>
          </div>
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
          Loading exposure view...
        </div>
      ) : (
        <>
          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: 18,
            }}
          >
            <div style={pageCard()}>
              <div style={sectionLabel()}>Total Exposure</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  fontSize: 28,
                  color: "#0B1F33",
                }}
              >
                {safeStr(summary.totalExposure)}
              </div>
            </div>

            <div style={pageCard()}>
              <div style={sectionLabel()}>Concentration Ratio</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  fontSize: 28,
                  color: "#0B1F33",
                }}
              >
                {safeStr(summary.concentrationRatio)}
              </div>
            </div>

            <div style={pageCard()}>
              <div style={sectionLabel()}>Flagged Count</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  fontSize: 28,
                  color: "#0B1F33",
                }}
              >
                {safeStr(summary.flaggedCount)}
              </div>
            </div>

            <div style={pageCard()}>
              <div style={sectionLabel()}>Updated</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  fontSize: 20,
                  color: "#0B1F33",
                  lineHeight: 1.5,
                }}
              >
                {safeStr(summary.updatedAt)}
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
            <InfoCard
              title="Exposure Concentration"
              body="Use this section to notice when one borrower, one guarantor, or one small group is carrying too much support or guarantee exposure. Concentrated exposure creates fragility."
            />

            <InfoCard
              title="Pilot Risk Review"
              body="Use this section to monitor unusual pilot-stage patterns, especially where behaviour is changing faster than expected or the support pattern becomes difficult to explain."
            />

            <InfoCard
              title="Deterministic Governance"
              body="Use this section to verify that support decisions are still following protocol logic rather than accidental drift, weak manual handling, or inconsistent intervention."
            />

            <InfoCard
              title="Exposure Rules"
              body="Use this section to understand why the system limits support, who may need review, and which patterns should trigger intervention before risk becomes dangerous."
            />
          </div>

          <div
            style={{
              ...pageCard("#FFFDF5"),
              marginTop: 18,
              border: "1px solid rgba(214,175,71,0.25)",
            }}
          >
            <div style={{ fontWeight: 1000, color: "#92400E" }}>
              Admin note
            </div>
            <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.8 }}>
              This page should inform review and intervention, not replace the
              protocol. Exposure handling must still remain deterministic and
              auditable.
            </div>
          </div>

          {riskFlags.length > 0 ? (
            <div style={{ ...pageCard(), marginTop: 18 }}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 1000,
                  color: "#0B1F33",
                }}
              >
                Visible Risk Flags
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                {riskFlags.map((flag, idx) => (
                  <div key={idx} style={softCard("#FFFFFF")}>
                    <div style={{ color: "#0B1F33", fontWeight: 900 }}>{flag}</div>
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
              Live Exposure Data
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