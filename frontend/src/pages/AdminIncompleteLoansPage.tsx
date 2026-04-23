import React, { useEffect, useMemo, useState } from "react";
import ExplainToggle from "../components/ExplainToggle";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import {
  getAdminIncompleteLoans,
  getCurrentClan,
  getSelectedClanId,
} from "../lib/api";

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function toNum(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(x: any): string {
  const n = Number(x);
  if (!Number.isFinite(n)) return String(x ?? "").trim() || "0.00";
  return n.toFixed(2);
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
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

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    padding: "6px 10px",
    borderRadius: 999,
    background: primary ? "rgba(11,99,209,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#0B63D1" : "#475569",
    fontSize: 12,
    fontWeight: 1000,
    whiteSpace: "normal",
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

function formatRemaining(seconds: any): string {
  const total = toNum(seconds);
  if (!total) return "No live countdown";
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins > 0) return `${mins}m ${secs}s left`;
  return `${secs}s left`;
}

export default function AdminIncompleteLoansPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [community, setCommunity] = useState<any>(null);
  const pattern = useMemo(() => topPattern(), []);
  const selectedClanId = Number(getSelectedClanId() || 0);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setErr(null);

        const clanRes = await getCurrentClan().catch(() => null);
        if (!alive) return;
        setCommunity(clanRes || null);

        if (!selectedClanId) {
          setRows([]);
          return;
        }

        const res = await getAdminIncompleteLoans(selectedClanId, 100);
        if (!alive) return;
        setRows(Array.isArray(res?.items) ? res.items : []);
      } catch (e: any) {
        if (!alive) return;
        setErr(String(e?.message || e || "Unable to load incomplete loans."));
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedClanId]);

  const communityLabel = useMemo(() => {
    return (
      firstTruthy(
        community?.marketplace_name,
        community?.name,
        community?.display_name
      ) || (selectedClanId ? `Community ${selectedClanId}` : "No current community")
    );
  }, [community, selectedClanId]);

  const urgentRows = useMemo(
    () =>
      rows.filter((loan) => {
        const remaining = toNum(loan?.auto_cancel_remaining_seconds);
        return remaining > 0 && remaining <= 60;
      }),
    [rows]
  );

  return (
    <div style={{ maxWidth: 1260, margin: "0 auto" }}>
      <PageTopNav
        sectionLabel="Incomplete Loans"
        title="Incomplete Loans"
        subtitle="Review unresolved loans in the current community before they auto-cancel, stall, or stay under-covered."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/command-center"
        backLabel="Command Center"
      />

      <ExplainToggle
        label="What this screen does"
        what="This screen shows the real admin queue of incomplete loans for the current community, including approval progress, locked coverage, and any live auto-cancel countdown."
        why="It helps you see which support items are still unresolved and whether they are missing approvals, missing coverage, or simply running out of time."
        next="Read the queue overview first, then open the specific loan summary for the item that needs follow-up now."
        tone="light"
        style={{ marginTop: 18 }}
      />

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
          <div style={{ fontSize: 34, fontWeight: 1000, color: "#0B1F33" }}>
            Incomplete Loans Queue
          </div>
          <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
            Review unresolved support items in {communityLabel} and see which
            ones are close to auto-cancel, still short on approvals, or still
            missing coverage.
          </div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={badge(true)}>Context: {communityLabel}</span>
            <span style={badge(false)}>Incomplete: {rows.length}</span>
            <span style={badge(false)}>Ending soon: {urgentRows.length}</span>
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
            {!selectedClanId && (
              <div style={{ ...card(), color: "#7A8D9F" }}>
                Choose the community first. This admin queue is clan-specific
                and becomes useful only once the active community is clear.
              </div>
            )}

            {selectedClanId && rows.length === 0 && (
              <div style={{ ...card(), color: "#7A8D9F" }}>
                No incomplete loans are currently shown.
              </div>
            )}

            {rows.map((loan, i) => {
              const loanId = safeStr(loan?.loan_id || loan?.id || i);

              return (
                <div key={loanId} style={card()}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 1000,
                          color: "#0B1F33",
                          fontSize: 18,
                        }}
                      >
                        Loan #{loanId}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          color: "#6B7A88",
                          fontSize: 13,
                        }}
                      >
                        Borrower #{safeStr(loan?.borrower_user_id || "—")}
                      </div>
                    </div>

                    <div style={{ color: "#0B1F33", fontWeight: 1000 }}>
                      {fmtMoney(loan?.amount ?? "0")}{" "}
                      {safeStr(loan?.currency || "NGN")}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: "#5D7389",
                          fontSize: 12,
                          fontWeight: 900,
                          textTransform: "uppercase",
                        }}
                      >
                        Approval progress
                      </div>
                      <div
                        style={{
                          marginTop: 6,
                          color: "#0B1F33",
                          fontWeight: 900,
                        }}
                      >
                        {toNum(loan?.approved_guarantors)} approved /{" "}
                        {toNum(loan?.guarantors_required)} required
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          color: "#6B7A88",
                          fontSize: 13,
                        }}
                      >
                        Pending guarantors: {toNum(loan?.pending_guarantors)}
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          color: "#5D7389",
                          fontSize: 12,
                          fontWeight: 900,
                          textTransform: "uppercase",
                        }}
                      >
                        Coverage
                      </div>
                      <div
                        style={{
                          marginTop: 6,
                          color: "#0B1F33",
                          fontWeight: 900,
                        }}
                      >
                        Locked {fmtMoney(loan?.locked_coverage ?? 0)}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          color: "#6B7A88",
                          fontSize: 13,
                        }}
                      >
                        Gap: {fmtMoney(loan?.required_gap ?? 0)}
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          color: "#5D7389",
                          fontSize: 12,
                          fontWeight: 900,
                          textTransform: "uppercase",
                        }}
                      >
                        Auto-cancel
                      </div>
                      <div
                        style={{
                          marginTop: 6,
                          color: "#0B1F33",
                          fontWeight: 900,
                        }}
                      >
                        {formatRemaining(loan?.auto_cancel_remaining_seconds)}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          color: "#6B7A88",
                          fontSize: 13,
                        }}
                      >
                        Decision marker:{" "}
                        {safeStr(loan?.decision_at || "Not started")}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{ marginTop: 14, color: "#6B7A88", lineHeight: 1.8 }}
                  >
                    Status: {safeStr(loan?.status || "incomplete")}
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <OriginLink
                      to={`/app/loan-summary/${encodeURIComponent(loanId)}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 40,
                        padding: "10px 14px",
                        borderRadius: 14,
                        background: "#0B63D1",
                        color: "#FFFFFF",
                        fontWeight: 900,
                        textDecoration: "none",
                        ...stableTapStyle(),
                      }}
                    >
                      Open Loan Summary
                    </OriginLink>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
