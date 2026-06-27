import React, { useEffect, useMemo, useState } from "react";
import ExplainToggle from "../components/ExplainToggle";
import PageTopNav from "../components/PageTopNav";
import { SecondaryButton, StableCtaLink } from "../components/StableButton";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import {
  getAdminIncompleteLoans,
  getCurrentClan,
  getSelectedClanId,
  safeCopy,
} from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";

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

function adminIncompleteLoanActionStyle(kind: "primary" | "secondary" | "soft" = "secondary"): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: 14,
    fontWeight: 900,
    fontSize: 14,
    minWidth: 142,
    whiteSpace: "nowrap",
    transition: "none",
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

function actionText(name: GsnIconName, label: string) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minWidth: 0,
        whiteSpace: "nowrap",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 28,
          height: 28,
          borderRadius: 11,
          display: "grid",
          placeItems: "center",
          flex: "0 0 auto",
          color: "#EAF3FF",
          background:
            "linear-gradient(180deg, rgba(28,76,122,0.98) 0%, rgba(7,28,47,0.98) 100%)",
          border: "1px solid rgba(196,216,238,0.22)",
          boxShadow:
            "0 9px 18px rgba(2,6,23,0.22), inset 0 1px 0 rgba(255,255,255,0.12)",
        }}
      >
        <GsnLegacyIcon name={name} size={26} />
      </span>
      <span>{label}</span>
    </span>
  );
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
    `Support item: ${safeStr(loan?.loan_id || loan?.id || "-")}`,
    `Requester: ${safeStr(loan?.borrower_user_id || "-")}`,
    `Amount: ${fmtMoney(loan?.amount ?? "0")} ${safeStr(loan?.currency || "NGN")}`,
    `Support decisions: ${toNum(loan?.approved_guarantors)} / ${toNum(loan?.guarantors_required)}`,
    `Pending support responses: ${toNum(loan?.pending_guarantors)}`,
    `Locked support coverage: ${fmtMoney(loan?.locked_coverage ?? 0)}`,
    `Coverage gap: ${fmtMoney(loan?.required_gap ?? 0)}`,
    `Time remaining: ${formatRemaining(loan?.auto_cancel_remaining_seconds)}`,
    `Status: ${safeStr(loan?.status || "incomplete")}`,
  ].join("`n");
}

function routeTarget(
  intent: CtaIntent,
  communityId: number,
  debugId: string,
  extra: { loanId?: string } = {}
): string {
  return resolveCtaTarget(intent, { communityId, debugId, ...extra }).to as string;
}

export default function AdminIncompleteLoansPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [community, setCommunity] = useState<any>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const pattern = useMemo(() => topPattern(), []);
  const selectedClanId = Number(getSelectedClanId() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "admin-incomplete-loans.route.dashboard"),
      commandCenter: routeTarget("adminCommand", selectedClanId, "admin-incomplete-loans.route.command-center"),
      systemOperations: routeTarget(
        "systemOperations",
        selectedClanId,
        "admin-incomplete-loans.route.system-operations"
      ),
      bankConsole: routeTarget("bankConsole", selectedClanId, "admin-incomplete-loans.route.bank-console"),
    }),
    [selectedClanId]
  );

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
        setErr(String(e?.message || e || "Unable to load incomplete support items."));
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
    const missingPledgeDecisions = rows.filter(
      (loan) => toNum(loan?.approved_guarantors) < toNum(loan?.guarantors_required)
    );
    const totalGap = rows.reduce((sum, loan) => sum + toNum(loan?.required_gap), 0);
    const lockedCoverage = rows.reduce((sum, loan) => sum + toNum(loan?.locked_coverage), 0);

    return {
      urgentCount: urgent.length,
      missingPledgeDecisionCount: missingPledgeDecisions.length,
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
      `Incomplete support items: ${rows.length}`,
      `Ending soon: ${queueSummary.urgentCount}`,
      `Missing support decisions: ${queueSummary.missingPledgeDecisionCount}`,
      `Total coverage gap: ${fmtMoney(queueSummary.totalGap)}`,
      `Locked support coverage: ${fmtMoney(queueSummary.lockedCoverage)}`,
      "",
      ...rows.map((loan) => buildLoanSnapshot(loan)),
    ].join("`n`n");

    void copyText(snapshot, "Incomplete support queue snapshot copied.", "Clipboard is not available here.");
  }

  return (
    <div style={{ maxWidth: 1260, margin: "0 auto" }}>
      <PageTopNav sectionLabel="Incomplete Support" title="Incomplete Support" subtitle="Find the support items that need action now." homeTo={routes.dashboard} homeLabel="Dashboard" backTo={routes.commandCenter} backLabel="Command Center" />

      <ExplainToggle
        label="What this screen does"
        what="See unresolved support items, support decisions, coverage gaps, and time pressure for this community."
        why="This is an admin review queue; it does not approve the whole support request, authorize release, or show that money moved."
        next="Open the support item that needs follow-up now."
        tone="light"
        style={{ marginTop: 18 }}
      />

      <div style={{ backgroundImage: `url("${pattern}")`, backgroundRepeat: "no-repeat", backgroundSize: "cover", backgroundPosition: "center top", borderRadius: 28, border: "1px solid rgba(11,31,51,0.06)", overflow: "hidden", backgroundColor: "#F8FBFE" }}>
        <div style={{ padding: 24 }}>
          <div style={{ fontSize: 34, fontWeight: 1000, color: "#0B1F33" }}>Incomplete Support Queue</div>
          <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.45 }}>
            Check {communityLabel} for items short on support decisions, coverage, or time.
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(true)}>Context: {communityLabel}</span>
            <span style={badge(false)}>Incomplete: {rows.length}</span>
            <span style={badge(false)}>Ending soon: {queueSummary.urgentCount}</span>
            <span style={badge(false)}>Missing support decisions: {queueSummary.missingPledgeDecisionCount}</span>
          </div>

          {notice ? <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 14, background: "#ECFDF3", border: "1px solid #A7F3D0", color: "#166534", fontWeight: 900 }}>{notice}</div> : null}
          {err ? <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 14, background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", fontWeight: 900 }}>{err}</div> : null}

          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div style={statTile()}>
              <div style={sectionLabel()}>Coverage gap</div>
              <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 1000, fontSize: 24 }}>{fmtMoney(queueSummary.totalGap)}</div>
              <div style={{ marginTop: 6, ...helperText() }}>Remaining support gap.</div>
            </div>
            <div style={statTile()}>
              <div style={sectionLabel()}>Locked support coverage</div>
              <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 1000, fontSize: 24 }}>{fmtMoney(queueSummary.lockedCoverage)}</div>
              <div style={{ marginTop: 6, ...helperText() }}>Support coverage already recorded.</div>
            </div>
            <div style={statTile()}>
              <div style={sectionLabel()}>What to do next</div>
              <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                Open the support item first. Use Bank Console only when the finance trail needs review.
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))",
              gap: 10,
            }}
          >
            <SecondaryButton
              onClick={copyQueueSnapshot}
              fullWidth
              stableHeight={52}
              debugId="admin-incomplete-loans.copy-queue"
              style={adminIncompleteLoanActionStyle("secondary")}
            >
              {actionText("copy", "Copy queue")}
            </SecondaryButton>
            <StableCtaLink
              to={routes.systemOperations}
              debugId="admin-incomplete-loans.route.system-operations"
              fullWidth
              stableHeight={52}
              style={adminIncompleteLoanActionStyle("primary")}
            >
              {actionText("briefcase", "Operations")}
            </StableCtaLink>
            <StableCtaLink
              to={routes.bankConsole}
              debugId="admin-incomplete-loans.route.bank-console"
              fullWidth
              stableHeight={52}
              style={adminIncompleteLoanActionStyle("secondary")}
            >
              {actionText("bank", "Bank Console")}
            </StableCtaLink>
            <StableCtaLink
              to={routes.commandCenter}
              debugId="admin-incomplete-loans.route.command-center"
              fullWidth
              stableHeight={52}
              style={adminIncompleteLoanActionStyle("soft")}
            >
              {actionText("home", "Command Center")}
            </StableCtaLink>
          </div>

          <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
            {!selectedClanId ? <div style={{ ...card(), color: "#7A8D9F" }}>Choose the community first. This review queue belongs to one active community at a time.</div> : null}
            {selectedClanId && rows.length === 0 && !err ? <div style={{ ...card(), color: "#7A8D9F" }}>No incomplete support items are currently shown.</div> : null}
            {rows.map((loan, i) => {
              const loanId = safeStr(loan?.loan_id || loan?.id || i);
              const borrowerId = safeStr(loan?.borrower_user_id || "-");
              return (
                <div key={loanId} style={card()}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 1000, color: "#0B1F33", fontSize: 18 }}>Support #{loanId}</div>
                      <div style={{ marginTop: 4, color: "#6B7A88", fontSize: 13 }}>Requester #{borrowerId}</div>
                    </div>
                    <div style={{ color: "#0B1F33", fontWeight: 1000 }}>{fmtMoney(loan?.amount ?? "0")} {safeStr(loan?.currency || "NGN")}</div>
                  </div>

                  <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                    <div>
                      <div style={sectionLabel()}>Support progress</div>
                      <div style={{ marginTop: 6, color: "#0B1F33", fontWeight: 900 }}>Support decisions {toNum(loan?.approved_guarantors)} / {toNum(loan?.guarantors_required)}</div>
                      <div style={{ marginTop: 4, color: "#6B7A88", fontSize: 13 }}>Pending support responses: {toNum(loan?.pending_guarantors)}</div>
                    </div>
                    <div>
                      <div style={sectionLabel()}>Coverage</div>
                      <div style={{ marginTop: 6, color: "#0B1F33", fontWeight: 900 }}>Locked support coverage {fmtMoney(loan?.locked_coverage ?? 0)}</div>
                      <div style={{ marginTop: 4, color: "#6B7A88", fontSize: 13 }}>Gap: {fmtMoney(loan?.required_gap ?? 0)}</div>
                    </div>
                    <div>
                      <div style={sectionLabel()}>Time remaining</div>
                      <div style={{ marginTop: 6, color: "#0B1F33", fontWeight: 900 }}>{formatRemaining(loan?.auto_cancel_remaining_seconds)}</div>
                      <div style={{ marginTop: 4, color: "#6B7A88", fontSize: 13 }}>Decision started: {safeStr(loan?.decision_at || "Not started")}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 14, color: "#6B7A88", lineHeight: 1.8 }}>Status: {safeStr(loan?.status || "incomplete")}</div>

                  <div
                    style={{
                      marginTop: 14,
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(142px, 1fr))",
                      gap: 10,
                    }}
                  >
                    <SecondaryButton
                      onClick={() => {
                        void copyText(buildLoanSnapshot(loan), `Support #${loanId} snapshot copied.`, "Clipboard is not available here.");
                      }}
                      fullWidth
                      stableHeight={52}
                      debugId={`admin-incomplete-loans.loan.${loanId}.copy`}
                      style={adminIncompleteLoanActionStyle("secondary")}
                    >
                      {actionText("copy", "Copy support")}
                    </SecondaryButton>
                    <StableCtaLink
                      to={routeTarget(
                        "loanSummary",
                        selectedClanId,
                        `admin-incomplete-loans.loan.${loanId}.summary`,
                        { loanId }
                      )}
                      debugId={`admin-incomplete-loans.loan.${loanId}.summary`}
                      fullWidth
                      stableHeight={52}
                      style={adminIncompleteLoanActionStyle("primary")}
                    >
                      {actionText("document", "Support Summary")}
                    </StableCtaLink>
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
