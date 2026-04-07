import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listMyLoans } from "../lib/api";

function safeStr(x: any): string {
  return String(x ?? "");
}

function fmtMoney(x: any): string {
  const n = Number(x);
  if (!Number.isFinite(n)) return String(x ?? "").trim() || "0.00";
  return n.toFixed(2);
}

function pagePattern(): string {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="320" viewBox="0 0 1600 320">
    <rect width="1600" height="320" fill="#F8FBFE"/>
    <g fill="none" stroke="#C7D9EE" stroke-opacity="0.40" stroke-width="2">
      <path d="M70 170 C180 90, 290 90, 400 170 S620 250, 730 170" />
      <path d="M900 170 C1010 90, 1120 90, 1230 170 S1450 250, 1560 170" />
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

function actionLink(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: "#0B1F33",
    textDecoration: "none",
    fontWeight: 1000,
    fontSize: 14,
  };
}

function statusStyle(status: string): React.CSSProperties {
  const s = status.toLowerCase();
  if (s.includes("approved") || s.includes("repaid") || s.includes("active")) {
    return {
      padding: "6px 10px",
      borderRadius: 999,
      background: "#ECFDF5",
      border: "1px solid #A7F3D0",
      color: "#065F46",
      fontWeight: 1000,
      fontSize: 12,
    };
  }
  if (s.includes("pending") || s.includes("review")) {
    return {
      padding: "6px 10px",
      borderRadius: 999,
      background: "#FFFBEB",
      border: "1px solid #FDE68A",
      color: "#92400E",
      fontWeight: 1000,
      fontSize: 12,
    };
  }
  if (s.includes("declined") || s.includes("cancel") || s.includes("default")) {
    return {
      padding: "6px 10px",
      borderRadius: 999,
      background: "#FEF2F2",
      border: "1px solid #FECACA",
      color: "#991B1B",
      fontWeight: 1000,
      fontSize: 12,
    };
  }
  return {
    padding: "6px 10px",
    borderRadius: 999,
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    color: "#475569",
    fontWeight: 1000,
    fontSize: 12,
  };
}

export default function LoanDecisionPage() {
  const [loans, setLoans] = useState<any[]>([]);
  const pattern = useMemo(() => pagePattern(), []);

  useEffect(() => {
    (async () => {
      const res = await listMyLoans().catch(() => []);
      const items = Array.isArray(res) ? res : res?.items || [];
      setLoans(items || []);
    })();
  }, []);

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
          backgroundColor: "#F8FBFE",
        }}
      >
        <div style={{ padding: 24 }}>
          <div style={{ fontSize: 38, fontWeight: 1000, color: "#0B1F33" }}>Support Decision View</div>
          <div style={{ marginTop: 10, color: "#6B7A88", lineHeight: 1.8 }}>
            Review visible support states in a calmer decision-oriented view.
          </div>

          <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
            {loans.length === 0 ? (
              <div style={card()}>
                <div style={{ color: "#6B7A88" }}>No visible support decisions yet.</div>
              </div>
            ) : (
              loans.map((loan, i) => (
                <div key={loan?.id || i} style={card()}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 1000, color: "#0B1F33", fontSize: 18 }}>
                        Support item #{safeStr(loan?.id || "—")}
                      </div>
                      <div style={{ marginTop: 4, color: "#6B7A88", fontSize: 13 }}>
                        {safeStr(loan?.created_at || "—")}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={statusStyle(safeStr(loan?.status || "pending"))}>
                        {safeStr(loan?.status || "pending")}
                      </span>
                      <span style={statusStyle("neutral")}>
                        {fmtMoney(loan?.amount ?? "0")} {safeStr(loan?.currency || "NGN")}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: 12, color: "#6B7A88", lineHeight: 1.9 }}>
                    Purpose: {safeStr(loan?.purpose || "—")}
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: 18, ...card() }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link to="/loan-workbench" style={actionLink()}>
                Workbench →
              </Link>
              <Link to="/loans" style={actionLink()}>
                Return to finances →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}