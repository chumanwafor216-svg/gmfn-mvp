import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentClan, getMe, listMyLoans } from "../lib/api";

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

function stageForLoan(loan: any): { label: string; note: string } {
  const status = safeStr(loan?.status).toLowerCase();
  if (status.includes("repaid")) {
    return { label: "Completed", note: "This support item appears fully completed." };
  }
  if (status.includes("approved") || status.includes("active")) {
    return { label: "Active support", note: "Support appears active and in progress." };
  }
  if (status.includes("pending") || status.includes("review")) {
    return { label: "Awaiting decision", note: "This item still appears to be in review or waiting." };
  }
  if (status.includes("declined") || status.includes("cancel")) {
    return { label: "Closed", note: "This item appears closed or no longer continuing." };
  }
  return { label: "In progress", note: "This item still looks operational." };
}

export default function LoanWorkbenchPage() {
  const [me, setMe] = useState<any>(null);
  const [clan, setClan] = useState<any>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const pattern = useMemo(() => pagePattern(), []);

  useEffect(() => {
    (async () => {
      const [meRes, clanRes, loansRes] = await Promise.all([
        getMe().catch(() => null),
        getCurrentClan().catch(() => null),
        listMyLoans().catch(() => []),
      ]);
      const items = Array.isArray(loansRes) ? loansRes : loansRes?.items || [];
      setMe(meRes || null);
      setClan(clanRes || null);
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
          <div style={{ fontSize: 38, fontWeight: 1000, color: "#0B1F33" }}>Support Workbench</div>
          <div style={{ marginTop: 10, color: "#6B7A88", lineHeight: 1.8 }}>
            Continue where you left off without crowding the finances entry screen.
          </div>

          <div style={{ marginTop: 18, ...card() }}>
            <div style={{ color: "#6B7A88", lineHeight: 1.8 }}>
              Member: <b style={{ color: "#0B1F33" }}>{safeStr(me?.gmfn_id || "GMFN ID pending")}</b> · Community:{" "}
              <b style={{ color: "#0B1F33" }}>{safeStr(clan?.name || "No active community")}</b>
            </div>
          </div>

          <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
            {loans.length === 0 ? (
              <div style={card()}>
                <div style={{ color: "#6B7A88" }}>No work items visible yet.</div>
              </div>
            ) : (
              loans.map((loan, i) => {
                const stage = stageForLoan(loan);
                return (
                  <div key={loan?.id || i} style={card()}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        gap: 14,
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 1000, color: "#0B1F33", fontSize: 18 }}>
                          Support item #{safeStr(loan?.id || "—")}
                        </div>
                        <div style={{ marginTop: 6, color: "#6B7A88", lineHeight: 1.7 }}>
                          {fmtMoney(loan?.amount ?? "0")} {safeStr(loan?.currency || "NGN")} · {safeStr(loan?.purpose || "—")}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: "8px 12px",
                          borderRadius: 999,
                          border: "1px solid rgba(11,31,51,0.10)",
                          background: "#F8FBFE",
                          fontWeight: 1000,
                          color: "#0B1F33",
                        }}
                      >
                        {stage.label}
                      </div>
                    </div>

                    <div style={{ marginTop: 10, color: "#6B7A88", lineHeight: 1.8 }}>{stage.note}</div>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ marginTop: 18, ...card() }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link to="/loan-readiness" style={actionLink()}>
                Readiness →
              </Link>
              <Link to="/loan-suggestions" style={actionLink()}>
                Suggestions →
              </Link>
              <Link to="/loan-decision" style={actionLink()}>
                Decision →
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