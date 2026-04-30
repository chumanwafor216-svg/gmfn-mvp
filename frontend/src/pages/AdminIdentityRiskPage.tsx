import React, { useEffect, useMemo, useState } from "react";
import ExplainToggle from "../components/ExplainToggle";
import PageTopNav from "../components/PageTopNav";
import {
  institutionalInnerCard,
  institutionalPageCard,
} from "../lib/institutionalSurface";
import { getAdminIdentityRisk } from "../lib/api";

function safeStr(x: any): string {
  return String(x ?? "");
}

function toNum(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function card(): React.CSSProperties {
  return {
    ...institutionalPageCard(),
    border: "1px solid rgba(20,52,83,0.24)",
    boxShadow:
      "0 30px 62px rgba(7,20,36,0.12), 0 8px 18px rgba(7,20,36,0.045), inset 0 1px 0 rgba(255,255,255,0.88), inset 0 -14px 28px rgba(18,52,86,0.06)",
    padding: 22,
  };
}

function stableTapStyle(): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 2,
    isolation: "isolate",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    transform: "translateZ(0)",
    outlineOffset: 4,
  };
}

function stopIdentityRiskTap(event: React.SyntheticEvent) {
  event.stopPropagation();
}

function summaryToggle(): React.CSSProperties {
  return {
    cursor: "pointer",
    fontWeight: 900,
    color: "#0B1F33",
    display: "inline-flex",
    alignItems: "center",
    minHeight: 40,
    padding: "8px 14px",
    borderRadius: 14,
    border: "1px solid rgba(122,152,195,0.20)",
    background:
      "linear-gradient(180deg, #FFFFFF 0%, #EEF5FF 100%)",
    boxShadow: "0 14px 30px rgba(15,23,42,0.09)",
    ...stableTapStyle(),
  };
}

function riskStyle(level: "green" | "yellow" | "red"): React.CSSProperties {
  if (level === "red") {
    return {
      borderRadius: 14,
      background: "#FEF2F2",
      color: "#991B1B",
      padding: "8px 12px",
      fontWeight: 1000,
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
    };
  }
  if (level === "yellow") {
    return {
      borderRadius: 14,
      background: "#FFF7ED",
      color: "#9A3412",
      padding: "8px 12px",
      fontWeight: 1000,
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
    };
  }
  return {
    borderRadius: 14,
    background: "#F0FDF4",
    color: "#166534",
    padding: "8px 12px",
    fontWeight: 1000,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  };
}

function classify(row: any): { level: "green" | "yellow" | "red"; label: string; score: number } {
  const severity = toNum(row?.severity || 0);
  let score = severity * 10;

  const type = safeStr(row?.signal_type).toLowerCase();
  if (type.includes("cluster")) score += 30;
  if (type.includes("device")) score += 15;
  if (score >= 60) return { level: "red", label: "Intervention required", score };
  if (score >= 25) return { level: "yellow", label: "Monitor this account", score };
  return { level: "green", label: "Low visible concern", score };
}

export default function AdminIdentityRiskPage() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await getAdminIdentityRisk(100);
        setData(res || null);
      } catch (e: any) {
        setErr(String(e?.message || e || "Unable to load identity risk."));
      }
    })();
  }, []);

  const grouped = useMemo(() => {
    const items = Array.isArray(data?.items) ? data.items : [];
    const map = new Map<number, any[]>();
    for (const row of items) {
      const uid = toNum(row?.user_id || 0);
      if (!map.has(uid)) map.set(uid, []);
      map.get(uid)!.push(row);
    }
    return Array.from(map.entries()).map(([userId, rows]) => {
      const max = rows.reduce(
        (acc, r) => {
          const c = classify(r);
          if (c.score > acc.score) return c;
          return acc;
        },
        { level: "green" as const, label: "Low visible concern", score: 0 }
      );
      return { userId, rows, risk: max };
    });
  }, [data]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <PageTopNav
        sectionLabel="Identity Risk"
        title="Identity Risk"
        subtitle="Monitor suspicious device overlap, identity clusters, and signals that may suggest multi-account misuse."
      />

      <ExplainToggle
        label="What this screen does"
        what="This screen shows identity-risk signals such as suspicious overlap, unusual clusters, and patterns that may suggest account misuse."
        why="It helps you see when identity behaviour still looks normal and when a stronger manual review may be justified."
        next="Read the guide to the risk colours first, then scan the grouped users and open the detailed signals only when you need deeper evidence."
        tone="light"
        style={{ marginTop: 18 }}
      />

      {err ? (
        <div
          style={{
            ...card(),
            marginTop: 18,
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#991B1B",
            fontWeight: 900,
          }}
        >
          {err}
        </div>
      ) : null}

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>How to use this page</div>
        <div style={{ marginTop: 12, color: "#475569", lineHeight: 1.8 }}>
          Green means normal identity behaviour.
          Yellow means a staff member should monitor the account more closely.
          Red means unusual overlap or signal concentration is strong enough to justify intervention or manual review.
        </div>
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
        {grouped.length === 0 ? (
          <div style={card()}>
            <div style={{ color: "#6B7A88" }}>No identity-risk signals are currently shown.</div>
          </div>
        ) : null}

        {grouped.map((g) => (
          <div key={g.userId} style={card()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 1000, fontSize: 18, color: "#0B1F33" }}>
                  User #{g.userId}
                </div>
                <div style={{ marginTop: 6, color: "#64748b" }}>
                  Signals detected: {g.rows.length}
                </div>
              </div>

              <div style={riskStyle(g.risk.level)}>
                <span>
                  {g.risk.level === "green" ? "🟢" : g.risk.level === "yellow" ? "🟡" : "🔴"}
                </span>
                <span>{g.risk.label}</span>
              </div>
            </div>

            <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
              {g.rows.map((row: any) => (
                <div
                  key={row.id}
                  style={{
                    ...institutionalInnerCard("#F8FBFF"),
                    border: "1px solid rgba(20,52,83,0.18)",
                  }}
                >
                  <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
                    {safeStr(row?.signal_type || "signal")}
                  </div>
                  <div style={{ marginTop: 6, color: "#475569", lineHeight: 1.7 }}>
                    {safeStr(row?.description || "No description")}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>
                    Severity: {safeStr(row?.severity || "0")} | Created:{" "}
                    {safeStr(row?.created_at || "-")}
                  </div>
                </div>
              ))}
            </div>

            <details style={{ marginTop: 14 }}>
              <summary
                style={summaryToggle()}
                onPointerDown={stopIdentityRiskTap}
                onTouchStart={stopIdentityRiskTap}
                onMouseDown={stopIdentityRiskTap}
              >
                Detailed identity signals
              </summary>
              <pre
                style={{
                  marginTop: 12,
                  background: "#0B1F33",
                  color: "#E5E7EB",
                  padding: 16,
                  borderRadius: 14,
                  fontSize: 13,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {JSON.stringify(g.rows, null, 2)}
              </pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
