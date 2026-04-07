import React, { useEffect, useMemo, useState } from "react";
import { listMyLoans } from "../lib/api";

function safeStr(x: any): string {
  return String(x ?? "");
}
function fmtMoney(x: any): string {
  const n = Number(x);
  if (!Number.isFinite(n)) return String(x ?? "").trim() || "0.00";
  return n.toFixed(2);
}
function topPattern(): string {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="320" viewBox="0 0 1600 320">
    <rect width="1600" height="320" fill="#F7FAFD"/>
    <g fill="none" stroke="#C7D9EE" stroke-opacity="0.42" stroke-width="2">
      <path d="M80 160 C180 90, 280 90, 380 160 S580 230, 690 150" />
      <path d="M920 160 C1020 90, 1120 90, 1220 160 S1420 230, 1520 150" />
    </g>
  </svg>`.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
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
function isIncomplete(loan: any): boolean {
  const status = safeStr(loan?.status).toLowerCase();
  return !(status.includes("repaid") || status.includes("cancel") || status.includes("declined"));
}

export default function AdminIncompleteLoansPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const pattern = useMemo(() => topPattern(), []);

  useEffect(() => {
    (async () => {
      try {
        const res = await listMyLoans().catch(() => []);
        const items = Array.isArray(res) ? res : res?.items || [];
        setRows((items || []).filter(isIncomplete));
      } catch (e: any) {
        setErr(String(e?.message || e || "Unable to load incomplete loans."));
      }
    })();
  }, []);

  return (
    <div style={{ maxWidth: 1260, margin: "0 auto" }}>
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
          <div style={{ fontSize: 34, fontWeight: 1000, color: "#0B1F33" }}>Incomplete Loans Queue</div>
          <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
            Visibility over loans still in motion or not yet fully resolved.
          </div>

          {err && (
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
          )}

          <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
            {rows.length === 0 && <div style={{ ...card(), color: "#7A8D9F" }}>No incomplete loans visible.</div>}

            {rows.map((loan, i) => (
              <div key={loan?.id || i} style={card()}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 1000, color: "#0B1F33", fontSize: 18 }}>
                      Loan #{safeStr(loan?.id || "—")}
                    </div>
                    <div style={{ marginTop: 4, color: "#6B7A88", fontSize: 13 }}>
                      {safeStr(loan?.created_at || "—")}
                    </div>
                  </div>

                  <div style={{ color: "#0B1F33", fontWeight: 1000 }}>
                    {fmtMoney(loan?.amount ?? "0")} {safeStr(loan?.currency || "NGN")}
                  </div>
                </div>

                <div style={{ marginTop: 12, color: "#6B7A88", lineHeight: 1.8 }}>
                  Status: {safeStr(loan?.status || "pending")} · Purpose: {safeStr(loan?.purpose || "—")}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}