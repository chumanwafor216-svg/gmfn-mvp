import React, { useEffect, useMemo, useState } from "react";
import ExplainToggle from "../components/ExplainToggle";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import {
  getAdminIncompleteLoans,
  getCurrentClan,
  getSelectedClanId,
  safeCopy,
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

function statTile(): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(108,138,184,0.16)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #F6FAFF 100%)",
    padding: 16,
    boxShadow: "0 14px 28px rgba(15,23,42,0.04)",
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

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#39526C",
    fontWeight: 1000,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#526579",
    fontSize: 14.5,
    lineHeight: 1.75,
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
    transform: "none",
    outlineOffset: 4,
  };
}

function guardButtonPress(event?: React.SyntheticEvent<HTMLElement>) {
  event?.stopPropagation();
}

function buttonGuardProps(): Pick<
  React.HTMLAttributes<HTMLElement>,
  "onPointerDown" | "onMouseDown"
> {
  return {
    onPointerDown: guardButtonPress,
    onMouseDown: guardButtonPress,
  };
}

function actionBtn(kind: "primary" | "secondary" | "soft" = "secondary"): React.CSSProperties {
  const base: React.CSSProperties = {
    ...stableTapStyle(),
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 14px",
    borderRadius: 14,
    fontWeight: 900,
    fontSize: 14,
    textDecoration: "none",
    whiteSpace: "normal",
  };

  if (kind === "primary") {
    return {
      ...base,
      border: "1px solid rgba(9,83,176,0.24)",
      background: "linear-gradient(180deg, #1D75E8 0%, #0B63D1 100%)",
      color: "#FFFFFF",
      boxShadow: "0 14px 28px rgba(15,23,42,0.12)",
    };
  }

  if (kind === "soft") {
    return {
      ...base,
      border: "1px solid rgba(124,153,196,0.18)",
      background: "linear-gradient(180deg, #F8FBFF 0%, #EAF2FF 100%)",
      color: "#24415C",
      boxShadow: "0 12px 24px rgba(15,23,42,0.08)",
    };
  }

  return {
    ...base,
    border: "1px solid rgba(124,153,196,0.18)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #EEF4FF 100%)",
    color: "#0B1F33",
    boxShadow: "0 12px 24px rgba(15,23,42,0.08)",
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

function buildLoanSnapshot(loan: any): string {
  return [
    `Loan: ${safeStr(loan?.loan_id || loan?.id || "-")}`,
    `Borrower: ${safeStr(loan?.borrower_user_id || "-")}`,
    `Amount: ${fmtMoney(loan?.amount ?? "0")} ${safeStr(loan?.currency || "NGN")}`,
    `Approved guarantors: ${toNum(loan?.approved_guarantors)} / ${toNum(loan?.guarantors_required)}`,
    `Pending guarantors: ${toNum(loan?.pending_guarantors)}`,
    `Locked coverage: ${fmtMoney(loan?.locked_coverage ?? 0)}`,
    `Coverage gap: ${fmtMoney(loan?.required_gap ?? 0)}`,
    `Auto-cancel: ${formatRemaining(loan?.auto_cancel_remaining_seconds)}`,
    `Status: ${safeStr(loan?.status || "incomplete")}`,
  ].join("`n");
}

export default function AdminIncompleteLoansPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [community, setCommunity] = useState<any>(null);
  const [notice, setNotice] = useState<string | null>(null);
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

  const queueSummary = useMemo(() => {
    const urgent = rows.filter((loan) => {
      const remaining = toNum(loan?.auto_cancel_remaining_seconds);
      return remaining > 0 && remaining <= 60;
    });
    const missingApprovals = rows.filter(
      (loan) => toNum(loan?.approved_guarantors) < toNum(loan?.guarantors_required)
    );
    const totalGap = rows.reduce((sum, loan) => sum + toNum(loan?.required_gap), 0);
    const lockedCoverage = rows.reduce((sum, loan) => sum + toNum(loan?.locked_coverage), 0);

    return {
      urgentCount: urgent.length,
      missingApprovalCount: missingApprovals.length,
      totalGap,
      lockedCoverage,
    };
  }, [rows]);

  async function copyText(text: string, success: string, failure: string) {
    try {
      safeCopy(text);
      setNotice(success);
    } catch {
      setNotice(failure);
    }
  }

  function copyQueueSnapshot() {
    const snapshot = [
      `Community: ${communityLabel}`,
      `Incomplete loans: ${rows.length}`,
      `Ending soon: ${queueSummary.urgentCount}`,
      `Missing approvals: ${queueSummary.missingApprovalCount}`,
      `Total coverage gap: ${fmtMoney(queueSummary.totalGap)}`,
      `Locked coverage: ${fmtMoney(queueSummary.lockedCoverage)}`,
      "",
      ...rows.map((loan) => buildLoanSnapshot(loan)),
    ].join("`n`n");

    void copyText(snapshot, "Incomplete-loan queue snapshot copied.", "Clipboard is not available here.");
  }

  return (
    <div style={{ maxWidth: 1260, margin: "0 auto" }}>
      <PageTopNav sectionLabel="Incomplete Loans" title="Incomplete Loans" subtitle="Review unresolved loans in the current community before they auto-cancel, stall, or stay under-covered." homeTo="/app/dashboard" homeLabel="Dashboard" backTo="/app/command-center" backLabel="Command Center" />

      <ExplainToggle
        label="What this screen does"
        what="This screen shows the real admin queue of incomplete loans for the current community, including approval progress, locked coverage, and any live auto-cancel countdown."
        why="It helps you see which support items are still unresolved and whether they are missing approvals, missing coverage, or simply running out of time."
        next="Read the queue overview first, then open the specific loan summary for the item that needs follow-up now."
        tone="light"
        style={{ marginTop: 18 }}
      />

      <div style={{ backgroundImage: `url("${pattern}")`, backgroundRepeat: "no-repeat", backgroundSize: "cover", backgroundPosition: "center top", borderRadius: 28, border: "1px solid rgba(11,31,51,0.06)", overflow: "hidden", backgroundColor: "#F8FBFE" }}>
        <div style={{ padding: 24 }}>
          <div style={{ fontSize: 34, fontWeight: 1000, color: "#0B1F33" }}>Incomplete Loans Queue</div>
          <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
            Review unresolved support items in {communityLabel} and see which ones are close to auto-cancel, still short on approvals, or still missing coverage.
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(true)}>Context: {communityLabel}</span>
            <span style={badge(false)}>Incomplete: {rows.length}</span>
            <span style={badge(false)}>Ending soon: {queueSummary.urgentCount}</span>
            <span style={badge(false)}>Missing approvals: {queueSummary.missingApprovalCount}</span>
          </div>

          {notice ? <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 14, background: "#ECFDF3", border: "1px solid #A7F3D0", color: "#166534", fontWeight: 900 }}>{notice}</div> : null}
          {err ? <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 14, background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", fontWeight: 900 }}>{err}</div> : null}

          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div style={statTile()}>
              <div style={sectionLabel()}>Coverage gap</div>
              <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 1000, fontSize: 24 }}>{fmtMoney(queueSummary.totalGap)}</div>
              <div style={{ marginTop: 6, ...helperText() }}>This is the total remaining support gap still visible in the current queue.</div>
            </div>
            <div style={statTile()}>
              <div style={sectionLabel()}>Locked coverage</div>
              <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 1000, fontSize: 24 }}>{fmtMoney(queueSummary.lockedCoverage)}</div>
              <div style={{ marginTop: 6, ...helperText() }}>Use this with the gap reading to see whether the queue is missing money, approvals, or both.</div>
            </div>
            <div style={statTile()}>
              <div style={sectionLabel()}>What to do next</div>
              <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                Open the loan summary when one item needs evidence, go to System Operations when the queue pattern itself looks operational, and go to Bank Console when the issue looks like money movement or settlement timing.
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" {...buttonGuardProps()} onClick={copyQueueSnapshot} style={actionBtn("secondary")}>Copy queue snapshot</button>
            <OriginLink to="/app/command-center/system-operations" style={actionBtn("primary")}>Open System Operations</OriginLink>
            <OriginLink to="/app/command-center/bank-console" style={actionBtn("secondary")}>Open Bank Console</OriginLink>
            <OriginLink to="/app/command-center" style={actionBtn("soft")}>Back to Command Center</OriginLink>
          </div>

          <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
            {!selectedClanId ? <div style={{ ...card(), color: "#7A8D9F" }}>Choose the community first. This admin queue is clan-specific and becomes useful only once the active community is clear.</div> : null}
            {selectedClanId && rows.length === 0 && !err ? <div style={{ ...card(), color: "#7A8D9F" }}>No incomplete loans are currently shown.</div> : null}
            {rows.map((loan, i) => {
              const loanId = safeStr(loan?.loan_id || loan?.id || i);
              const borrowerId = safeStr(loan?.borrower_user_id || "-");
              return (
                <div key={loanId} style={card()}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 1000, color: "#0B1F33", fontSize: 18 }}>Loan #{loanId}</div>
                      <div style={{ marginTop: 4, color: "#6B7A88", fontSize: 13 }}>Borrower #{borrowerId}</div>
                    </div>
                    <div style={{ color: "#0B1F33", fontWeight: 1000 }}>{fmtMoney(loan?.amount ?? "0")} {safeStr(loan?.currency || "NGN")}</div>
                  </div>

                  <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                    <div>
                      <div style={sectionLabel()}>Approval progress</div>
                      <div style={{ marginTop: 6, color: "#0B1F33", fontWeight: 900 }}>{toNum(loan?.approved_guarantors)} approved / {toNum(loan?.guarantors_required)} required</div>
                      <div style={{ marginTop: 4, color: "#6B7A88", fontSize: 13 }}>Pending guarantors: {toNum(loan?.pending_guarantors)}</div>
                    </div>
                    <div>
                      <div style={sectionLabel()}>Coverage</div>
                      <div style={{ marginTop: 6, color: "#0B1F33", fontWeight: 900 }}>Locked {fmtMoney(loan?.locked_coverage ?? 0)}</div>
                      <div style={{ marginTop: 4, color: "#6B7A88", fontSize: 13 }}>Gap: {fmtMoney(loan?.required_gap ?? 0)}</div>
                    </div>
                    <div>
                      <div style={sectionLabel()}>Auto-cancel</div>
                      <div style={{ marginTop: 6, color: "#0B1F33", fontWeight: 900 }}>{formatRemaining(loan?.auto_cancel_remaining_seconds)}</div>
                      <div style={{ marginTop: 4, color: "#6B7A88", fontSize: 13 }}>Decision marker: {safeStr(loan?.decision_at || "Not started")}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 14, color: "#6B7A88", lineHeight: 1.8 }}>Status: {safeStr(loan?.status || "incomplete")}</div>

                  <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      {...buttonGuardProps()}
                      onClick={() => {
                        void copyText(buildLoanSnapshot(loan), `Loan #${loanId} snapshot copied.`, "Clipboard is not available here.");
                      }}
                      style={actionBtn("secondary")}
                    >
                      Copy loan snapshot
                    </button>
                    <OriginLink to={`/app/loan-summary/${encodeURIComponent(loanId)}`} style={actionBtn("primary")}>Open Loan Summary</OriginLink>
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
