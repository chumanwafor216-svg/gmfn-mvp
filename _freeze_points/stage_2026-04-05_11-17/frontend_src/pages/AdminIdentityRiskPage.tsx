import React, { useEffect, useMemo, useState } from "react";
import PageTopNav from "../components/PageTopNav";
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
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
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
  return { level: "green", label: "Healthy / low concern", score };
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

  const items = Array.isArray(data?.items) ? data.items : [];

  const grouped = useMemo(() => {
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
        { level: "green" as const, label: "Healthy / low concern", score: 0 }
      );
      return { userId, rows, risk: max };
    });
  }, [items]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <PageTopNav
        title="Identity Risk"
        subtitle="Use this page to monitor suspicious device overlap, identity clusters, and signals that may suggest multi-account misuse."
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
          Yellow means a staff member should monitor the account.
          Red means unusual overlap or signal concentration is strong enough to justify intervention or manual review.
        </div>
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
        {grouped.length === 0 ? (
          <div style={card()}>
            <div style={{ color: "#6B7A88" }}>No identity risk signals found.</div>
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
                    borderRadius: 14,
                    border: "1px solid rgba(11,31,51,0.08)",
                    background: "#F8FAFC",
                    padding: 14,
                  }}
                >
                  <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
                    {safeStr(row?.signal_type || "signal")}
                  </div>
                  <div style={{ marginTop: 6, color: "#475569", lineHeight: 1.7 }}>
                    {safeStr(row?.description || "No description")}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>
                    Severity: {safeStr(row?.severity || "0")} · Created: {safeStr(row?.created_at || "—")}
                  </div>
                </div>
              ))}
            </div>

            <details style={{ marginTop: 14 }}>
              <summary style={{ cursor: "pointer", fontWeight: 900, color: "#0B1F33" }}>
                Raw identity data
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