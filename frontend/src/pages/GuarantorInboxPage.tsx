// FILE: src/pages/GuarantorInboxPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  decideLoanGuarantor,
  getCurrentClan,
  getLoanGuarantorInbox,
  getMe,
  getSelectedClanId,
  safeCopy,
} from "../lib/api";

type MeLite = {
  gmfn_id?: string | null;
  nickname?: string | null;
  display_name?: string | null;
  email?: string | null;
};

type CommunityLite = {
  id?: number;
  clan_id?: number;
  name?: string | null;
  marketplace_name?: string | null;
};

type InboxRow = {
  id?: number;
  loan_id?: number;
  guarantor_user_id?: number;
  borrower_user_id?: number;
  borrower_display?: string | null;
  borrower_name?: string | null;
  borrower_email?: string | null;
  borrower_gmfn_id?: string | null;
  pledge_amount?: string | number | null;
  requested_amount?: string | number | null;
  amount?: string | number | null;
  currency?: string | null;
  status?: string | null;
  note?: string | null;
  created_at?: string | null;
  loan_title?: string | null;
};

type FilterKey = "pending" | "approved" | "declined" | "all";

type NextStepState = {
  title: string;
  detail: string;
  today: string;
  tomorrow: string;
  ctaLabel: string;
  ctaTo: string;
};

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function firstDefined(...values: any[]): any {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    return value;
  }
  return undefined;
}

function positiveNumber(x: any): number {
  const n = Number(x || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function fmtMoney(x: any): string {
  const n = Number(x);
  if (!Number.isFinite(n)) {
    const s = safeStr(x);
    return s || "0.00";
  }
  return n.toFixed(2);
}

function safeDate(x: any): Date | null {
  const raw = safeStr(x);
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
}

function displayName(me: MeLite | null): string {
  const n1 = safeStr(me?.nickname);
  if (n1) return n1;

  const n2 = safeStr(me?.display_name);
  if (n2) return n2;

  const email = safeStr(me?.email);
  if (!email) return "Member";

  const left = email.split("@")[0] || "member";
  return left
    .split(/[._-]+/)
    .filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

function getCommunityName(clan: CommunityLite | null): string {
  return safeStr(clan?.marketplace_name || clan?.name || "");
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
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

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    minHeight: 42,
    borderRadius: 14,
    border: "none",
    background: disabled ? "#CBD5E1" : "#0B63D1",
    color: "#FFFFFF",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    textDecoration: "none",
    opacity: disabled ? 0.72 : 1,
    whiteSpace: "nowrap",
  };
}

function secondaryBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    minHeight: 42,
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    textDecoration: "none",
    opacity: disabled ? 0.72 : 1,
    whiteSpace: "nowrap",
  };
}

function approveBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    minHeight: 42,
    borderRadius: 14,
    border: "1px solid #A7F3D0",
    background: disabled ? "#DCFCE7" : "#ECFDF5",
    color: "#065F46",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    opacity: disabled ? 0.72 : 1,
    whiteSpace: "nowrap",
  };
}

function declineBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    minHeight: 42,
    borderRadius: 14,
    border: "1px solid #FECACA",
    background: disabled ? "#FEE2E2" : "#FEF2F2",
    color: "#991B1B",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    opacity: disabled ? 0.72 : 1,
    whiteSpace: "nowrap",
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
    whiteSpace: "nowrap",
  };
}

function feedbackCard(success = false): React.CSSProperties {
  return {
    ...pageCard(success ? "#ECFDF5" : "#FEF2F2"),
    border: success ? "1px solid #A7F3D0" : "1px solid #FECACA",
    color: success ? "#065F46" : "#991B1B",
    fontWeight: 900,
    padding: 14,
  };
}

function statusKind(
  status?: string | null
): "green" | "gold" | "red" | "gray" | "blue" {
  const s = safeStr(status).toLowerCase();

  if (s.includes("approved")) return "green";
  if (s.includes("pending") || s.includes("requested") || s.includes("waiting"))
    return "gold";
  if (s.includes("declined") || s.includes("expired")) return "red";
  if (s.includes("review")) return "blue";
  return "gray";
}

function statusPill(
  kind: "green" | "gold" | "red" | "gray" | "blue"
): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 1000,
    border: "1px solid #E5E7EB",
    whiteSpace: "nowrap",
    background: "#FFFFFF",
  };

  if (kind === "green") {
    return {
      ...base,
      color: "#065F46",
      background: "#ECFDF5",
      borderColor: "#A7F3D0",
    };
  }

  if (kind === "gold") {
    return {
      ...base,
      color: "#92400E",
      background: "#FFFBEB",
      borderColor: "#FDE68A",
    };
  }

  if (kind === "red") {
    return {
      ...base,
      color: "#991B1B",
      background: "#FEF2F2",
      borderColor: "#FECACA",
    };
  }

  if (kind === "blue") {
    return {
      ...base,
      color: "#1D4ED8",
      background: "#EFF6FF",
      borderColor: "#BFDBFE",
    };
  }

  return {
    ...base,
    color: "#475569",
    background: "#F8FAFC",
    borderColor: "#E2E8F0",
  };
}

function fieldLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#5B7693",
    fontWeight: 1000,
    marginBottom: 6,
  };
}

function normalizeInboxRow(raw: any): InboxRow | null {
  if (!raw) return null;

  const src = raw?.item || raw?.request || raw?.guarantor || raw;

  return {
    id:
      positiveNumber(firstDefined(src?.id, src?.guarantor_id, src?.request_id)) ||
      undefined,
    loan_id:
      positiveNumber(firstDefined(src?.loan_id, src?.support_loan_id)) || undefined,
    guarantor_user_id:
      positiveNumber(firstDefined(src?.guarantor_user_id, src?.user_id)) ||
      undefined,
    borrower_user_id:
      positiveNumber(firstDefined(src?.borrower_user_id, src?.requester_user_id)) ||
      undefined,
    borrower_display:
      firstTruthy(
        src?.borrower_display,
        src?.borrower_name,
        src?.requester_name,
        src?.member_name
      ) || null,
    borrower_name: firstTruthy(src?.borrower_name, src?.requester_name) || null,
    borrower_email:
      firstTruthy(src?.borrower_email, src?.requester_email, src?.email) || null,
    borrower_gmfn_id:
      firstTruthy(src?.borrower_gmfn_id, src?.requester_gmfn_id) || null,
    pledge_amount:
      firstDefined(
        src?.pledge_amount,
        src?.guarantee_amount,
        src?.weight_amount,
        src?.locked_amount
      ) ?? null,
    requested_amount:
      firstDefined(src?.requested_amount, src?.amount, src?.loan_amount) ?? null,
    amount:
      firstDefined(src?.amount, src?.requested_amount, src?.loan_amount) ?? null,
    currency: firstTruthy(src?.currency, src?.currency_code, "NGN") || null,
    status: firstTruthy(src?.status, "pending") || null,
    note:
      firstTruthy(src?.note, src?.purpose, src?.loan_title, src?.title) || null,
    created_at:
      firstTruthy(src?.created_at, src?.requested_at, src?.updated_at) || null,
    loan_title: firstTruthy(src?.loan_title, src?.title, src?.purpose) || null,
  };
}

function dedupeRows(rows: InboxRow[]): InboxRow[] {
  const seen = new Set<string>();
  const out: InboxRow[] = [];

  for (const row of rows) {
    const key = [
      safeStr(row.id),
      safeStr(row.loan_id),
      safeStr(row.guarantor_user_id),
      safeStr(row.status),
    ].join("|");

    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }

  return out;
}

function renderStepAction(step: NextStepState) {
  if (step.ctaTo.startsWith("#")) {
    return (
      <a href={step.ctaTo} style={primaryBtn(false)}>
        {step.ctaLabel}
      </a>
    );
  }

  return (
    <Link to={step.ctaTo} style={primaryBtn(false)}>
      {step.ctaLabel}
    </Link>
  );
}

export default function GuarantorInboxPage() {
  const selectedClanId = Number(getSelectedClanId() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string>("");
  const [err, setErr] = useState<string>("");
  const [msg, setMsg] = useState<string>("");

  const [me, setMe] = useState<MeLite | null>(null);
  const [community, setCommunity] = useState<CommunityLite | null>(null);
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<FilterKey>("pending");
  const [counts, setCounts] = useState({
    pending: 0,
    approved: 0,
    declined: 0,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 980);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!err && !msg) return;

    const timer = window.setTimeout(() => {
      setErr("");
      setMsg("");
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [err, msg]);

  async function fetchRowsByStatus(status: "pending" | "approved" | "declined") {
    if (!selectedClanId) return [];

    const res = await getLoanGuarantorInbox({
      clan_id: selectedClanId,
      status,
      limit: 100,
    }).catch(() => ({ items: [] }));

    const items = Array.isArray(res)
      ? res
      : Array.isArray((res as any)?.items)
      ? (res as any).items
      : [];

    return items
      .map((row: any) => normalizeInboxRow(row))
      .filter(Boolean) as InboxRow[];
  }

  async function loadAll() {
    setLoading(true);
    setErr("");

    try {
      const [meRes, clanRes] = await Promise.all([
        getMe().catch(() => null),
        getCurrentClan().catch(() => null),
      ]);

      setMe(meRes || null);
      setCommunity(clanRes || null);

      if (!selectedClanId) {
        setCounts({
          pending: 0,
          approved: 0,
          declined: 0,
        });
        setRows([]);
        return;
      }

      const [pendingRows, approvedRows, declinedRows] = await Promise.all([
        fetchRowsByStatus("pending"),
        fetchRowsByStatus("approved"),
        fetchRowsByStatus("declined"),
      ]);

      const nextCounts = {
        pending: pendingRows.length,
        approved: approvedRows.length,
        declined: declinedRows.length,
      };
      setCounts(nextCounts);

      const filtered =
        statusFilter === "pending"
          ? pendingRows
          : statusFilter === "approved"
          ? approvedRows
          : statusFilter === "declined"
          ? declinedRows
          : dedupeRows([...pendingRows, ...approvedRows, ...declinedRows]);

      const sorted = [...filtered].sort((a, b) => {
        const ta = safeDate(a?.created_at)?.getTime() || 0;
        const tb = safeDate(b?.created_at)?.getTime() || 0;
        return tb - ta;
      });

      setRows(sorted);
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to load guarantor inbox."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, [statusFilter, selectedClanId]);

  async function decide(row: InboxRow, decision: "approved" | "declined") {
    const loanId = positiveNumber(row.loan_id);
    const guarantorRequestId = positiveNumber(row.id);

    if (!selectedClanId) {
      setErr("Select a community first.");
      return;
    }

    if (!loanId || !guarantorRequestId) {
      setErr("Missing loan or guarantor request information.");
      return;
    }

    const rowKey = `${Number(row.id || loanId)}-${decision}`;
    setBusyKey(rowKey);
    setErr("");
    setMsg("");

    try {
      await decideLoanGuarantor(loanId, guarantorRequestId, {
        status: decision,
        clan_id: selectedClanId,
        reason:
          decision === "approved" ? "capacity_confirmed" : "capacity_declined",
        note:
          decision === "approved"
            ? "Approved from guarantor inbox."
            : "Declined from guarantor inbox.",
      });

      setMsg(decision === "approved" ? "Request approved." : "Request declined.");
      await loadAll();
    } catch (e: any) {
      setErr(
        String(
          e?.message || e || "Unable to complete this guarantor decision."
        )
      );
    } finally {
      setBusyKey("");
    }
  }

  const name = useMemo(() => displayName(me), [me]);
  const gmfnId = useMemo(() => safeStr(me?.gmfn_id) || "Pending", [me]);

  const selectedCommunityLabel = useMemo(() => {
    return (
      getCommunityName(community) ||
      (selectedClanId ? `Community ${selectedClanId}` : "No community selected")
    );
  }, [community, selectedClanId]);

  const pendingCount = counts.pending;
  const approvedCount = counts.approved;
  const declinedCount = counts.declined;

  const nextStep = useMemo<NextStepState>(() => {
    if (!selectedClanId) {
      return {
        title: "Choose the community context first",
        detail:
          "Guarantor decisions should stay inside the selected community support path before you approve or decline anything.",
        today: "Open Community Home and confirm the community before reviewing requests.",
        tomorrow:
          "A selected community keeps guarantor obligations attached to the correct support flow.",
        ctaLabel: "Open Community Home",
        ctaTo: "/app/community",
      };
    }

    if (pendingCount > 0) {
      return {
        title:
          pendingCount === 1
            ? "One guarantor decision is waiting"
            : `${pendingCount} guarantor decisions are waiting`,
        detail:
          "Approve only when you are truly willing and able to stand behind the request. Decline if you cannot carry the obligation.",
        today:
          "Review the waiting requests one by one and make a clear decision.",
        tomorrow:
          "Clear guarantor decisions help borrowers move forward without confusion.",
        ctaLabel: "Review the request queue",
        ctaTo: "#guarantor-request-queue",
      };
    }

    return {
      title: "No guarantor request is waiting right now",
      detail:
        "This inbox is calmer when no request is waiting. Return here when a new guarantor decision arrives.",
      today: "No immediate guarantor action is required.",
      tomorrow:
        "Keeping this inbox clear makes future guarantor decisions easier to manage.",
      ctaLabel: "Return to Notifications",
      ctaTo: "/app/notifications",
    };
  }, [selectedClanId, pendingCount]);

  return (
    <div style={{ maxWidth: 1260, margin: "0 auto", paddingBottom: 30 }}>
      <PageTopNav
        sectionLabel="Incoming Guarantor Requests"
        title="Incoming Guarantor Requests"
        subtitle="Review requests carefully. A guarantor approval is a real personal commitment decision."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/notifications"
        backLabel="Notifications"
        nextLinks={[
          { label: "Loans & Support", to: "/app/loans" },
          { label: "Community Home", to: "/app/community" },
          { label: "Marketplace", to: "/app/marketplace" },
        ]}
        utilityLinks={[
          { label: "Trust", to: "/app/trust" },
          { label: "My GMFN and I", to: "/app/my-gmfn-and-i" },
        ]}
      />

      {err ? (
        <div style={{ ...feedbackCard(false), marginTop: 18 }}>{err}</div>
      ) : null}

      {msg ? (
        <div style={{ ...feedbackCard(true), marginTop: 18 }}>{msg}</div>
      ) : null}

      <section
        style={{
          ...pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
          marginTop: 18,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.08fr) minmax(320px, 0.92fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={sectionLabel()}>Guarantor position</div>

            <div
              style={{
                marginTop: 10,
                fontSize: 30,
                fontWeight: 1000,
                color: "#0B1F33",
                lineHeight: 1.15,
              }}
            >
              {nextStep.title}
            </div>

            <div style={{ marginTop: 10, color: "#6B7A88", lineHeight: 1.8 }}>
              {nextStep.detail}
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>{gmfnId}</span>
              <span style={badge(false)}>Guarantor: {name}</span>
              <span style={badge(false)}>Context: {selectedCommunityLabel}</span>
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              {renderStepAction(nextStep)}

              <button
                onClick={() => void loadAll()}
                disabled={loading}
                style={secondaryBtn(loading)}
              >
                {loading ? "Refreshing..." : "Refresh"}
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
                {nextStep.today}
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
                {nextStep.tomorrow}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Pending</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {loading ? "…" : pendingCount}
          </div>
        </div>

        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Approved</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {loading ? "…" : approvedCount}
          </div>
        </div>

        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Declined</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {loading ? "…" : declinedCount}
          </div>
        </div>

        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Visible rows</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {loading ? "…" : rows.length}
          </div>
        </div>
      </section>

      <section style={{ ...pageCard(), marginTop: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={sectionLabel()}>Filter inbox</div>
            <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
              View pending, approved, declined, or all requests.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {(["pending", "approved", "declined", "all"] as FilterKey[]).map(
              (s) => {
                const active = statusFilter === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    style={active ? primaryBtn(false) : secondaryBtn(false)}
                  >
                    {s}
                  </button>
                );
              }
            )}
          </div>
        </div>
      </section>

      <section
        id="guarantor-request-queue"
        style={{ ...pageCard(), marginTop: 18 }}
      >
        <div style={{ fontSize: 16, fontWeight: 1000, color: "#0B1F33" }}>
          Request queue
        </div>

        <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
          Open each request with clear judgment. Approval should not be casual.
        </div>

        <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
          {!loading && rows.length === 0 ? (
            <div style={{ color: "#7A8D9F", lineHeight: 1.8 }}>
              {selectedClanId
                ? "No guarantor requests found for this filter."
                : "Select a community first to keep guarantor decisions inside the correct support context."}
            </div>
          ) : null}

          {rows.map((row, idx) => {
            const rowId = Number(row.id || idx + 1);
            const loanId = Number(row.loan_id || 0);
            const borrower = firstTruthy(
              row.borrower_display,
              row.borrower_name,
              row.borrower_email,
              row.borrower_gmfn_id ? `GMFN ${row.borrower_gmfn_id}` : "",
              row.borrower_user_id ? `Borrower #${row.borrower_user_id}` : "",
              "Borrower"
            );
            const pledgeAmount = fmtMoney(row.pledge_amount ?? "0");
            const requestedAmount = fmtMoney(
              row.requested_amount ?? row.amount ?? "0"
            );
            const rowCurrency = safeStr(row.currency || "NGN");
            const rowStatus = safeStr(row.status || "pending");
            const pending = rowStatus.toLowerCase().includes("pending");
            const approveBusy = busyKey === `${rowId}-approved`;
            const declineBusy = busyKey === `${rowId}-declined`;

            return (
              <div
                key={`${rowId}-${idx}`}
                style={{
                  borderRadius: 18,
                  border: "1px solid rgba(11,31,51,0.08)",
                  background: "#FFFFFF",
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    alignItems: "center",
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
                      {row.loan_title ? row.loan_title : `Loan #${loanId || "—"}`}
                    </div>

                    <div style={{ marginTop: 4, color: "#6B7A88", fontSize: 13 }}>
                      {row.created_at ? safeDateTime(row.created_at) : "—"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={statusPill(statusKind(rowStatus))}>
                      {rowStatus}
                    </span>
                    <span style={statusPill("blue")}>
                      Pledge {pledgeAmount} {rowCurrency}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 14,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={fieldLabel()}>Borrower</div>
                    <div style={{ color: "#0B1F33", fontWeight: 900 }}>
                      {borrower}
                    </div>
                  </div>

                  <div>
                    <div style={fieldLabel()}>Requested amount</div>
                    <div style={{ color: "#0B1F33", fontWeight: 900 }}>
                      {requestedAmount} {rowCurrency}
                    </div>
                  </div>

                  <div>
                    <div style={fieldLabel()}>Note</div>
                    <div style={{ color: "#0B1F33", fontWeight: 900 }}>
                      {safeStr(row.note || "—")}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 14,
                    color: "#6B7A88",
                    lineHeight: 1.8,
                    fontSize: 14,
                  }}
                >
                  Approve only if you are intentionally willing and able to stand
                  behind this request. Decline if you cannot carry that obligation.
                </div>

                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  {pending ? (
                    <>
                      <button
                        onClick={() => void decide(row, "approved")}
                        disabled={approveBusy || declineBusy}
                        style={approveBtn(approveBusy || declineBusy)}
                      >
                        {approveBusy ? "Working..." : "Approve"}
                      </button>

                      <button
                        onClick={() => void decide(row, "declined")}
                        disabled={approveBusy || declineBusy}
                        style={declineBtn(approveBusy || declineBusy)}
                      >
                        {declineBusy ? "Working..." : "Decline"}
                      </button>
                    </>
                  ) : null}

                  <button
                    onClick={() =>
                      safeCopy(
                        `Loan ${loanId} | Borrower: ${borrower} | Requested: ${requestedAmount} ${rowCurrency} | Pledge: ${pledgeAmount} ${rowCurrency} | Status: ${rowStatus}`
                      )
                    }
                    style={secondaryBtn(false)}
                  >
                    Copy summary
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}