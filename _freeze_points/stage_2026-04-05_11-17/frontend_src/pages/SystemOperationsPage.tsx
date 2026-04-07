import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  getPilotReadiness,
  getProtocolStatus,
  getSystemHealth,
} from "../lib/api";

function safeStr(x: any, fallback = "—"): string {
  const s = String(x ?? "").trim();
  return s || fallback;
}

function n(x: any): number {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
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

function safeDateTime(x: any): string {
  const raw = String(x || "").trim();
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
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

function statusBox(ok?: boolean): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: ok === true ? "#F0FDF4" : ok === false ? "#FEF2F2" : "#F8FAFC",
    padding: 18,
  };
}

function actionLink(primary = false, disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    borderRadius: 14,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.10)",
    background: disabled ? "#CBD5E1" : primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    textDecoration: "none",
    fontWeight: 1000,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.72 : 1,
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

export default function SystemOperationsPage() {
  const [health, setHealth] = useState<any>(null);
  const [protocol, setProtocol] = useState<any>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [err, setErr] = useState("");
  const [lastLoaded, setLastLoaded] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(options?: { silent?: boolean }) {
    const silent = options?.silent === true;

    if (silent) setRefreshing(true);
    else setLoading(true);

    setErr("");

    try {
      const [healthRes, protocolRes, readinessRes] = await Promise.all([
        getSystemHealth().catch(() => null),
        getProtocolStatus().catch(() => null),
        getPilotReadiness().catch(() => null),
      ]);

      setHealth(healthRes || null);
      setProtocol(protocolRes || null);
      setReadiness(readinessRes || null);
      setLastLoaded(new Date().toLocaleString());
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to load system operations."));
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }

  useEffect(() => {
    void load();

    const timer = window.setInterval(() => {
      void load({ silent: true });
    }, 20000);

    return () => window.clearInterval(timer);
  }, []);

  const healthStatus = safeStr(
    firstValue(health, ["status", "health", "state"]),
    "unknown"
  ).toLowerCase();

  const healthOk = useMemo(() => {
    return health?.ok === true || healthStatus === "ok" || healthStatus === "healthy";
  }, [health, healthStatus]);

  const protocolStage = safeStr(
    firstValue(protocol, ["stage", "status", "phase"]),
    "—"
  );

  const pilotStatus = safeStr(
    firstValue(readiness, ["overall_status", "status", "phase"]),
    "—"
  );

  const blockedCount = n(
    firstValue(readiness, [
      "blocked_count",
      "blocked",
      "blocked_items",
      "summary.blocked_count",
    ])
  );

  const checksCount = useMemo(() => {
    const checks = firstValue(readiness, ["checks", "summary.checks"]);
    return Array.isArray(checks) ? checks.length : 0;
  }, [readiness]);

  const updatedAt = safeDateTime(
    firstValue(readiness, [
      "updated_at",
      "generated_at",
      "as_of",
      "summary.generated_at",
    ]) ||
      firstValue(protocol, ["updated_at", "generated_at", "as_of"]) ||
      firstValue(health, ["updated_at", "generated_at", "as_of"])
  );

  return (
    <div style={{ maxWidth: 1260, margin: "0 auto", paddingBottom: 30 }}>
      <PageTopNav
        title="System Operations"
        subtitle="Admin-only monitoring for platform condition, protocol stage, and pilot readiness."
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
              System Operations
            </div>
            <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
              Central admin view for technical health, protocol stage, and pilot
              readiness. This page should not appear in ordinary member flow.
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
            <Link to="/app/command-center/exposure" style={actionLink(false)}>
              Safety & Risk
            </Link>
            <button
              type="button"
              onClick={() => void load()}
              style={actionLink(true, loading || refreshing)}
              disabled={loading || refreshing}
            >
              {loading ? "Loading..." : refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 16,
            background: "#FFFDF5",
            border: "1px solid rgba(214,175,71,0.25)",
            color: "#475569",
            lineHeight: 1.8,
          }}
        >
          This page is for system-level observation only. It is not a member
          preference surface and not a place for ordinary daily actions.
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

      <div style={{ ...pageCard("#F8FBFF"), marginTop: 18 }}>
        <div style={{ color: "#64748B", fontSize: 13 }}>
          Last refresh: <b>{lastLoaded || "—"}</b>
        </div>
        <div style={{ marginTop: 6, color: "#64748B", fontSize: 13 }}>
          Last updated source time: <b>{updatedAt}</b>
        </div>
      </div>

      {loading ? (
        <div style={{ ...pageCard(), marginTop: 18, color: "#64748B" }}>
          Loading system operations...
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
            <div style={statusBox(healthOk)}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                SYSTEM HEALTH
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  fontSize: 24,
                  color: "#0B1F33",
                }}
              >
                {healthOk ? "Healthy" : "Attention needed"}
              </div>
              <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.7 }}>
                Shows whether the technical platform is responding normally.
              </div>
            </div>

            <div style={statusBox()}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                PROTOCOL STAGE
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  fontSize: 24,
                  color: "#0B1F33",
                }}
              >
                {protocolStage}
              </div>
              <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.7 }}>
                Shows which maturity stage the protocol currently reports.
              </div>
            </div>

            <div style={statusBox(blockedCount === 0)}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                PILOT STATUS
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  fontSize: 24,
                  color: "#0B1F33",
                }}
              >
                {pilotStatus}
              </div>
              <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.7 }}>
                Shows whether the current pilot state is broadly ready or needs intervention.
              </div>
            </div>

            <div style={statusBox(blockedCount === 0)}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                BLOCKED / CHECKS
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  fontSize: 24,
                  color: "#0B1F33",
                }}
              >
                {blockedCount} / {checksCount}
              </div>
              <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.7 }}>
                Blocked items compared with visible readiness checks.
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
              <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
                System Health
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
                {prettyValue(health)}
              </pre>
            </div>

            <div style={pageCard()}>
              <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
                Protocol Status
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
                {prettyValue(protocol)}
              </pre>
            </div>

            <div style={{ ...pageCard(), gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
                Pilot Readiness
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
                {prettyValue(readiness)}
              </pre>
            </div>
          </div>

          <div
            style={{
              ...pageCard("#FFFDF5"),
              marginTop: 18,
              border: "1px solid rgba(214,175,71,0.25)",
            }}
          >
            <div style={{ fontWeight: 1000, color: "#92400E" }}>
              Operational note
            </div>
            <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.8 }}>
              System Operations should monitor current platform condition and
              pilot readiness. Deep trust behaviour review belongs in Trust
              Analytics, graph interpretation belongs in Trust Graph, and risk
              concentration belongs in Safety & Risk.
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
            <div style={softCard("#FFFFFF")}>
              <div style={{ fontWeight: 1000, color: "#0B1F33", fontSize: 18 }}>
                What belongs here
              </div>
              <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.8 }}>
                Platform health, protocol state, pilot readiness, and other
                system-level operational observations.
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={{ fontWeight: 1000, color: "#0B1F33", fontSize: 18 }}>
                What does not belong here
              </div>
              <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.8 }}>
                Personal member settings, everyday user actions, trust graph
                analysis details, or exposure review logic.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}