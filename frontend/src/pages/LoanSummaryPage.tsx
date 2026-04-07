import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  decideLoanGuarantor,
  getAccessToken,
  getLoanGuarantors,
  getLoanSummary,
  getMe,
  safeCopy,
} from "../lib/api";

type MeLite = {
  id?: number | string;
  email?: string;
  role?: string;
};

type LoanSummary = {
  id: number;
  clan_id?: number;
  status: string;
  amount: number;
  currency?: string;
  guarantors_required?: number;
  created_at?: string | null;
  due_at?: string | null;
  purpose?: string | null;
  note?: string | null;
};

type LoanGuarantor = {
  id?: number;
  guarantor_user_id: number;
  guarantor_email?: string;
  status: string;
  pledge_amount?: number;
  is_locked?: boolean;
  locked_amount?: number;
};

type TrustEvent = {
  id?: number;
  event_type?: string;
  created_at?: string;
  meta_json?: any;
  meta?: any;
};

type Repayment = {
  id?: number;
  amount: number;
  created_at?: string;
};

type Suggestion = {
  user_id: number;
  email?: string;
  cci?: number;
  recommended_pledge?: number;
};

type FeedbackTone = "success" | "error";

function safeItems<T>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as T[];
  if (Array.isArray(res.items)) return res.items as T[];
  return [];
}

const n = (x: any) => (Number.isFinite(Number(x)) ? Number(x) : 0);
const lc = (x: any) => String(x ?? "").toLowerCase().trim();
const safeStr = (x: any) => String(x ?? "").trim();

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
}

function fmtMoney(value: any, currency: string): string {
  const amount = Number(value);
  const text = Number.isFinite(amount) ? amount.toFixed(2) : safeStr(value || "0");
  return `${text} ${currency}`;
}

function parseMetaObj(meta: any): Record<string, any> | null {
  if (meta == null) return null;
  try {
    if (typeof meta === "string") {
      const s = meta.trim();
      if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
        const parsed = JSON.parse(s);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? parsed
          : null;
      }
      return null;
    }

    if (typeof meta === "object" && !Array.isArray(meta)) {
      return meta as Record<string, any>;
    }

    return null;
  } catch {
    return null;
  }
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 20,
    boxShadow:
      "0 14px 34px rgba(15,23,42,0.045), 0 2px 8px rgba(15,23,42,0.02)",
    overflow: "hidden",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 14,
  };
}

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 14px",
    borderRadius: 14,
    border: "none",
    background: disabled ? "#CBD5E1" : "#0B63D1",
    color: "#FFFFFF",
    fontWeight: 900,
    fontSize: 14,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
    opacity: disabled ? 0.86 : 1,
  };
}

function secondaryBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 800,
    fontSize: 14,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
    opacity: disabled ? 0.86 : 1,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#5D7389",
    fontWeight: 900,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    background: primary ? "rgba(11,99,209,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#0B63D1" : "#51657A",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  };
}

function feedbackCard(tone: FeedbackTone): React.CSSProperties {
  return {
    ...softCard(tone === "success" ? "#F3FBF5" : "#FEF2F2"),
    color: tone === "success" ? "#166534" : "#991B1B",
    border:
      tone === "success"
        ? "1px solid rgba(34,197,94,0.16)"
        : "1px solid rgba(239,68,68,0.16)",
    fontWeight: 800,
  };
}

function authHeaders(clanId?: number) {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  if (Number(clanId || 0) > 0) {
    headers["X-Clan-Id"] = String(clanId);
  }

  return headers;
}

async function fetchJson(path: string, clanId?: number): Promise<any> {
  const res = await fetch(path, {
    method: "GET",
    headers: authHeaders(clanId),
    credentials: "include",
  });

  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(message || `HTTP ${res.status}`);
  }

  const text = await res.text().catch(() => "");
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function statusBadge(status: string) {
  const s = lc(status);
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  };

  if (s === "approved" || s === "disbursed") {
    return (
      <span
        style={{
          ...base,
          background: "#ecfdf5",
          color: "#065f46",
          borderColor: "#a7f3d0",
        }}
      >
        {s.toUpperCase()}
      </span>
    );
  }

  if (s === "pending") {
    return (
      <span
        style={{
          ...base,
          background: "#eff6ff",
          color: "#1e40af",
          borderColor: "#bfdbfe",
        }}
      >
        {s.toUpperCase()}
      </span>
    );
  }

  if (s === "repaid") {
    return (
      <span
        style={{
          ...base,
          background: "#f0fdf4",
          color: "#166534",
          borderColor: "#bbf7d0",
        }}
      >
        {s.toUpperCase()}
      </span>
    );
  }

  if (s === "rejected" || s === "declined") {
    return (
      <span
        style={{
          ...base,
          background: "#fef2f2",
          color: "#991b1b",
          borderColor: "#fecaca",
        }}
      >
        {(status || "REJECTED").toUpperCase()}
      </span>
    );
  }

  return (
    <span style={{ ...base, background: "#f9fafb", color: "#374151" }}>
      {(status || "UNKNOWN").toUpperCase()}
    </span>
  );
}

function guarantorBadge(status: string) {
  const s = lc(status);
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  };

  if (s === "approved") {
    return (
      <span
        style={{
          ...base,
          background: "#ecfdf5",
          color: "#065f46",
          borderColor: "#a7f3d0",
        }}
      >
        APPROVED
      </span>
    );
  }

  if (s === "declined") {
    return (
      <span
        style={{
          ...base,
          background: "#fef2f2",
          color: "#991b1b",
          borderColor: "#fecaca",
        }}
      >
        DECLINED
      </span>
    );
  }

  if (s === "expired") {
    return (
      <span
        style={{
          ...base,
          background: "#f9fafb",
          color: "#374151",
          borderColor: "#e5e7eb",
        }}
      >
        EXPIRED
      </span>
    );
  }

  return (
    <span
      style={{
        ...base,
        background: "#eff6ff",
        color: "#1e40af",
        borderColor: "#bfdbfe",
      }}
    >
      PENDING
    </span>
  );
}

function nextStepText(status: string) {
  const s = lc(status);

  if (s === "pending") {
    return "Next: request guarantors, wait for approvals, and watch the approval count. When enough guarantors approve, the loan can continue.";
  }

  if (s === "approved") {
    return "Next: the loan is approved. Repayment and evidence review become the main actions.";
  }

  if (s === "disbursed") {
    return "Next: repayments should continue according to the active support path.";
  }

  if (s === "repaid") {
    return "Completed: this loan has been fully repaid.";
  }

  if (s === "rejected" || s === "declined") {
    return "Stopped: this loan was rejected. Return to preparation before starting a new request.";
  }

  return "Next: review guarantors, evidence, and repayment state for this loan.";
}

export default function LoanSummaryPage() {
  const { loanId } = useParams();
  const nav = useNavigate();
  const id = Number(loanId);

  const [me, setMe] = useState<MeLite | null>(null);
  const [summary, setSummary] = useState<LoanSummary | null>(null);
  const [guarantors, setGuarantors] = useState<LoanGuarantor[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [events, setEvents] = useState<TrustEvent[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyDecisionKey, setBusyDecisionKey] = useState("");
  const [feedback, setFeedback] = useState<{
    tone: FeedbackTone;
    text: string;
  } | null>(null);

  const currency = summary?.currency ?? "NGN";
  const isAdmin = lc(me?.role) === "admin";

  const requiredCount = n(summary?.guarantors_required);
  const approvedCount = guarantors.filter((g) => lc(g.status) === "approved").length;
  const pendingGuarantors = guarantors.filter(
    (g) => lc(g.status) === "pending" && g.id != null
  );

  const loanStatus = lc(summary?.status);
  const canActOnGuarantors = loanStatus === "pending";
  const canRepay = loanStatus === "approved" || loanStatus === "disbursed";

  const latestEvent = useMemo(() => {
    const xs = [...events].filter((e) => !!e.created_at);
    xs.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
    return xs[0] || null;
  }, [events]);

  const latestMeta = useMemo(
    () => parseMetaObj(latestEvent?.meta_json ?? latestEvent?.meta),
    [latestEvent]
  );

  const latestReason = safeStr(latestMeta?.reason || "");
  const latestNote = safeStr(latestMeta?.note || latestMeta?.message || "");

  useEffect(() => {
    if (!feedback) return;

    const timer = window.setTimeout(() => {
      setFeedback(null);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [feedback]);

  function jumpToAudit() {
    const clan = summary?.clan_id ? String(summary.clan_id) : "1";
    nav(`/app/trust-analytics?clan_id=${clan}&loan_id=${summary?.id}&audit=1`);
  }

  async function refreshAll() {
    setLoading(true);

    try {
      const meRes = await getMe().catch(() => null);
      if (meRes) setMe({ id: meRes.id, email: meRes.email, role: meRes.role });
      else setMe(null);

      const summaryRes = (await getLoanSummary(id)) as LoanSummary;
      setSummary(summaryRes);

      const guarantorRes = await getLoanGuarantors(id, {
        clan_id: summaryRes?.clan_id,
      }).catch(() => ({ items: [] }));
      setGuarantors(safeItems<LoanGuarantor>(guarantorRes));

      try {
        const repaymentsRes = await fetchJson(
          `/api/loans/${Number(summaryRes.id)}/repayments`,
          summaryRes?.clan_id
        );
        setRepayments(safeItems<Repayment>(repaymentsRes));
      } catch {
        setRepayments([]);
      }

      try {
        const suggestionsRes = await fetchJson(
          `/api/loans/${Number(summaryRes.id)}/guarantors/suggestions?limit=10`,
          summaryRes?.clan_id
        );
        setSuggestions(safeItems<Suggestion>(suggestionsRes));
      } catch {
        setSuggestions([]);
      }

      try {
        const eventsRes = await fetchJson(
          `/api/admin/trust-events/recent?limit=20&loan_id=${Number(summaryRes.id)}&clan_id=${Number(
            summaryRes.clan_id || 0
          )}`,
          summaryRes?.clan_id
        );
        setEvents(safeItems<TrustEvent>(eventsRes));
      } catch {
        setEvents([]);
      }
    } catch (e: any) {
      setFeedback({
        tone: "error",
        text: e?.message || "Failed to load loan summary.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    void refreshAll();
  }, [id]);

  async function handleGuarantorDecision(
    guarantor: LoanGuarantor,
    status: "approved" | "declined"
  ) {
    if (!summary?.id || !guarantor?.id) return;
    if (!canActOnGuarantors) {
      setFeedback({
        tone: "error",
        text: "Guarantor decisions are only available while the loan is pending.",
      });
      return;
    }

    const key = `${summary.id}-${guarantor.id}-${status}`;
    setBusyDecisionKey(key);

    try {
      await decideLoanGuarantor(summary.id, Number(guarantor.id), {
        status,
        clan_id: summary?.clan_id,
      });

      setFeedback({
        tone: "success",
        text:
          status === "approved"
            ? "Guarantor approved successfully."
            : "Guarantor declined successfully.",
      });

      await refreshAll();
    } catch (e: any) {
      setFeedback({
        tone: "error",
        text: e?.message || "Guarantor decision failed.",
      });
    } finally {
      setBusyDecisionKey("");
    }
  }

  function copyLoanAuditLink() {
    if (!summary?.id) return;

    const p = new URLSearchParams({
      clan_id: String(summary.clan_id || 1),
      loan_id: String(summary.id),
      audit: "1",
    });

    safeCopy(`${window.location.origin}/app/trust-analytics?${p.toString()}`);
    setFeedback({
      tone: "success",
      text: "Loan and audit link copied.",
    });
  }

  function downloadPdf() {
    setFeedback({
      tone: "error",
      text: "PDF download is disabled in this build.",
    });
  }

  const summaryNextStep = useMemo(() => {
    if (!summary) return "";
    return nextStepText(summary.status);
  }, [summary]);

  if (!id) {
    return (
      <div style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: 40 }}>
        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#991B1B", fontWeight: 800 }}>
            Invalid loan ID.
          </div>
        </section>
      </div>
    );
  }

  if (loading && !summary) {
    return (
      <div style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: 40 }}>
        <PageTopNav
          sectionLabel="Loan Summary"
          title="Loan Summary"
          subtitle="Preparing the loan detail surface..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/loans"
          backLabel="Loans & Support"
        />

        <section style={{ ...pageCard("#FFFFFF"), marginTop: 18 }}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading loan summary...
          </div>
        </section>
      </div>
    );
  }

  if (!summary) {
    return (
      <div style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: 40 }}>
        <PageTopNav
          sectionLabel="Loan Summary"
          title="Loan Summary"
          subtitle="This page summarizes one support item."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/loans"
          backLabel="Loans & Support"
        />

        {feedback ? (
          <div style={{ ...feedbackCard(feedback.tone), marginTop: 18 }}>
            {feedback.text}
          </div>
        ) : null}

        <section style={{ ...pageCard("#FFFFFF"), marginTop: 18 }}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loan summary could not be loaded.
          </div>
        </section>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        paddingBottom: 40,
        display: "grid",
        gap: 18,
      }}
    >
      <PageTopNav
        sectionLabel="Loan Summary"
        title={`Loan #${summary.id}`}
        subtitle="Review the support item, guarantor progress, evidence trail, and repayment state in one calmer surface."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/loans"
        backLabel="Loans & Support"
        nextLinks={[
          { label: "Open audit", to: `/app/trust-analytics?clan_id=${summary.clan_id || 1}&loan_id=${summary.id}&audit=1` },
          { label: "Marketplace", to: "/app/marketplace" },
        ]}
        utilityLinks={[
          { label: "Notifications", to: "/app/notifications" },
          { label: "Trust", to: "/app/trust" },
        ]}
      />

      {feedback ? <div style={feedbackCard(feedback.tone)}>{feedback.text}</div> : null}

      <section
        style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)")}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.08fr) minmax(320px, 0.92fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={sectionLabel()}>Summary</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontSize: 30,
                fontWeight: 1000,
                lineHeight: 1.12,
              }}
            >
              {fmtMoney(n(summary.amount), currency)}
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {statusBadge(summary.status)}
              <span style={badge(true)}>
                Required guarantors: {requiredCount}
              </span>
              <span style={badge(false)}>
                Approved: {approvedCount}
              </span>
              <span style={badge(false)}>
                Pending: {pendingGuarantors.length}
              </span>
              <span style={badge(false)}>
                Clan: {summary.clan_id ?? "-"}
              </span>
            </div>

            <div
              style={{
                marginTop: 14,
                color: "#5F7287",
                lineHeight: 1.8,
                fontSize: 15,
                maxWidth: 860,
              }}
            >
              <strong style={{ color: "#0B1F33" }}>What happens next:</strong>{" "}
              {summaryNextStep}
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button type="button" onClick={copyLoanAuditLink} style={secondaryBtn(false)}>
                Copy loan + audit link
              </button>
              <button type="button" onClick={jumpToAudit} style={secondaryBtn(false)}>
                Open audit
              </button>
              <button type="button" onClick={downloadPdf} style={secondaryBtn(false)}>
                Download PDF
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Today</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.65,
                }}
              >
                {canActOnGuarantors
                  ? "Review guarantor progress and keep the pending decisions moving."
                  : canRepay
                  ? "Review repayment state and continue with the money path."
                  : "Review the evidence and status before taking another step."}
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Tomorrow</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.65,
                }}
              >
                A clearer summary and evidence trail keeps the support path easier
                to understand and easier to defend.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 0.92fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Guarantors</div>

          <div
            style={{
              marginTop: 10,
              color: "#5F7287",
              fontSize: 14,
              lineHeight: 1.75,
            }}
          >
            Review the guarantor rows one by one. Bulk admin action remains
            intentionally disabled in this build.
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {guarantors.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No guarantor has been attached yet.
              </div>
            ) : (
              guarantors.map((g, idx) => {
                const gStatus = lc(g.status);
                const canDecide = canActOnGuarantors && g.id != null && gStatus === "pending";
                const approveKey = `${summary.id}-${g.id}-approved`;
                const declineKey = `${summary.id}-${g.id}-declined`;
                const busyApprove = busyDecisionKey === approveKey;
                const busyDecline = busyDecisionKey === declineKey;

                return (
                  <div key={idx} style={innerCard("#FCFEFF")}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: "#0B1F33",
                            fontSize: 16,
                            fontWeight: 900,
                            lineHeight: 1.35,
                          }}
                        >
                          {safeStr(g.guarantor_email || `user:${g.guarantor_user_id}`)}
                        </div>

                        <div
                          style={{
                            marginTop: 8,
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          {guarantorBadge(g.status)}
                          <span style={badge(true)}>
                            Pledge: {fmtMoney(n(g.pledge_amount), currency)}
                          </span>
                          {g.is_locked ? (
                            <span style={badge(false)}>
                              Locked: {fmtMoney(n(g.locked_amount), currency)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleGuarantorDecision(g, "approved")}
                          disabled={!canDecide || busyApprove || busyDecline}
                          style={primaryBtn(!canDecide || busyApprove || busyDecline)}
                        >
                          {busyApprove ? "Approving..." : "Approve"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleGuarantorDecision(g, "declined")}
                          disabled={!canDecide || busyApprove || busyDecline}
                          style={secondaryBtn(!canDecide || busyApprove || busyDecline)}
                        >
                          {busyDecline ? "Declining..." : "Decline"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={pageCard("#FFFFFF")}>
            <div style={sectionLabel()}>Bulk admin action</div>

            <div
              style={{
                marginTop: 10,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              {isAdmin
                ? "Bulk approve and bulk decline remain disabled in this build. Use single-item review until the controlled bulk path is enabled."
                : "Bulk guarantor actions are admin-only and remain disabled in this build."}
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button type="button" disabled style={secondaryBtn(true)}>
                Bulk approve disabled
              </button>
              <button type="button" disabled style={secondaryBtn(true)}>
                Bulk decline disabled
              </button>
            </div>
          </div>

          <div style={pageCard("#FFFFFF")}>
            <div style={sectionLabel()}>Fit suggestions</div>

            <div
              style={{
                marginTop: 10,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              Suggested guarantor candidates for this loan, when available.
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              {suggestions.length === 0 ? (
                <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                  No fit suggestion is visible right now.
                </div>
              ) : (
                suggestions.map((s, index) => (
                  <div key={index} style={innerCard("#FCFEFF")}>
                    <div
                      style={{
                        color: "#0B1F33",
                        fontSize: 15,
                        fontWeight: 900,
                        lineHeight: 1.35,
                      }}
                    >
                      {safeStr(s.email || `user:${s.user_id}`)}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      {Number.isFinite(Number(s.cci)) ? (
                        <span style={badge(false)}>CCI: {String(s.cci)}</span>
                      ) : null}

                      {Number.isFinite(Number(s.recommended_pledge)) ? (
                        <span style={badge(true)}>
                          Suggested pledge: {fmtMoney(n(s.recommended_pledge), currency)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 0.92fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Repayment evidence</div>

          <div
            style={{
              marginTop: 10,
              color: "#5F7287",
              fontSize: 14,
              lineHeight: 1.75,
            }}
          >
            Existing repayment records are shown here. Manual repayment posting
            from this page remains disabled in this build.
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {repayments.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No repayment record is visible yet.
              </div>
            ) : (
              repayments.map((repayment, index) => (
                <div key={repayment.id || index} style={innerCard("#FCFEFF")}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        color: "#0B1F33",
                        fontSize: 15,
                        fontWeight: 900,
                        lineHeight: 1.35,
                      }}
                    >
                      Repayment #{safeStr(repayment.id || index + 1)}
                    </div>

                    <span style={badge(true)}>
                      {fmtMoney(n(repayment.amount), currency)}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      color: "#64748B",
                      fontSize: 13,
                      lineHeight: 1.7,
                    }}
                  >
                    Posted: {safeDateTime(repayment.created_at)}
                  </div>
                </div>
              ))
            )}
          </div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              disabled={!canRepay}
              style={secondaryBtn(!canRepay)}
              onClick={() =>
                setFeedback({
                  tone: "error",
                  text: canRepay
                    ? "Manual repayment posting is disabled in this build. Use Loans & Support for the live money path."
                    : "Repayment becomes the main path after approval or disbursement.",
                })
              }
            >
              Manual repayment disabled
            </button>

            <Link to="/app/loans" style={primaryBtn(false)}>
              Return to Loans & Support
            </Link>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={pageCard("#FFFFFF")}>
            <div style={sectionLabel()}>Latest trust note</div>

            {latestEvent ? (
              <>
                <div
                  style={{
                    marginTop: 10,
                    color: "#0B1F33",
                    fontSize: 15,
                    fontWeight: 900,
                    lineHeight: 1.5,
                  }}
                >
                  {latestNote || "No explicit note was recorded in the latest event."}
                </div>

                <div
                  style={{
                    marginTop: 10,
                    color: "#64748B",
                    fontSize: 13,
                    lineHeight: 1.75,
                  }}
                >
                  Event type: <strong style={{ color: "#0B1F33" }}>{safeStr(latestEvent.event_type || "—")}</strong>
                  <br />
                  Created: <strong style={{ color: "#0B1F33" }}>{safeDateTime(latestEvent.created_at)}</strong>
                  <br />
                  Reason code: <strong style={{ color: "#0B1F33" }}>{latestReason || "(auto)"}</strong>
                </div>
              </>
            ) : (
              <div
                style={{
                  marginTop: 10,
                  color: "#64748B",
                  fontSize: 14,
                  lineHeight: 1.8,
                }}
              >
                No trust event evidence is visible from this page right now.
              </div>
            )}
          </div>

          <div style={pageCard("#FFFFFF")}>
            <div style={sectionLabel()}>Summary facts</div>

            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              <div style={innerCard("#FCFEFF")}>
                <div style={{ color: "#64748B", fontSize: 12, fontWeight: 900 }}>
                  Amount
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: "#0B1F33",
                    fontSize: 22,
                    fontWeight: 1000,
                  }}
                >
                  {fmtMoney(n(summary.amount), currency)}
                </div>
              </div>

              <div style={innerCard("#FCFEFF")}>
                <div style={{ color: "#64748B", fontSize: 12, fontWeight: 900 }}>
                  Created
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: "#0B1F33",
                    fontSize: 16,
                    fontWeight: 900,
                  }}
                >
                  {safeDateTime(summary.created_at)}
                </div>
              </div>

              <div style={innerCard("#FCFEFF")}>
                <div style={{ color: "#64748B", fontSize: 12, fontWeight: 900 }}>
                  Due
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: "#0B1F33",
                    fontSize: 16,
                    fontWeight: 900,
                  }}
                >
                  {safeDateTime(summary.due_at)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}