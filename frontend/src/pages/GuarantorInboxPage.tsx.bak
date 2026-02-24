// src/pages/GuarantorInboxPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { getMe, listIncomingGuarantorRequests, decideIncomingGuarantorRequest } from "../lib/api";

/**
 * B) GUARANTOR EXPERIENCE (Inbox)
 * - Underbanked/low-end friendly: big cards, simple language, minimal payload
 * - Actions: Approve / Decline / Ignore (ignore = leave pending)
 * - Reason + note (audit / visa evidence)
 * - Shows "My Guarantees" (history) in the same page for simplicity
 *
 * Authority UI:
 * - Neutral base (slate/gray)
 * - Green = approved
 * - Red = declined
 * - Blue = informational
 * - Gold = history/records
 */

type InboxItem = {
  id: number;
  loan_id: number;
  clan_id: number;
  guarantor_user_id: number;

  status: string;
  pledge_amount?: string | null;

  responded_at?: string | null;

  borrower_user_id?: number | null;
  borrower_email?: string | null;

  amount?: string | null;
  currency?: string | null;
};

type DecisionStatus = "approved" | "declined";

function safeStr(x: any): string {
  return (x ?? "").toString();
}

function displayNameFromEmail(email?: string | null): string {
  const e = safeStr(email).trim();
  if (!e) return "Borrower";
  const head = e.split("@")[0] || "borrower";
  const pretty = head.replace(/[._-]+/g, " ").trim();
  return pretty ? pretty.replace(/\b\w/g, (m) => m.toUpperCase()) : "Borrower";
}

function maskedEmail(email?: string | null): string {
  const e = safeStr(email).trim();
  if (!e) return "borrower@gmfn.com";
  const head = e.split("@")[0] || "borrower";
  const short = head.length <= 3 ? head : head.slice(0, 3) + "…";
  return `${short}@gmfn.com`;
}

function cardStyle(): React.CSSProperties {
  return {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 14,
    background: "rgba(255,255,255,0.92)",
    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
  };
}

function btnStyle(disabled?: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "rgba(255,255,255,0.95)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 900,
    opacity: disabled ? 0.6 : 1,
  };
}

function btnPrimaryStyle(disabled?: boolean): React.CSSProperties {
  return {
    ...btnStyle(disabled),
    background: "#111827",
    color: "white",
    border: "1px solid #111827",
  };
}

function pill(kind: "green" | "red" | "gray" | "blue" | "gold"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 1000,
    border: "1px solid #e5e7eb",
    background: "#fff",
    whiteSpace: "nowrap",
  };
  if (kind === "green") return { ...base, color: "#065f46", background: "#ecfdf5", borderColor: "#a7f3d0" };
  if (kind === "red") return { ...base, color: "#991b1b", background: "#fef2f2", borderColor: "#fecaca" };
  if (kind === "blue") return { ...base, color: "#1e40af", background: "#eff6ff", borderColor: "#bfdbfe" };
  if (kind === "gold") return { ...base, color: "#92400e", background: "#fffbeb", borderColor: "#fde68a" };
  return { ...base, color: "#374151", background: "#f9fafb", borderColor: "#e5e7eb" };
}

function normalizeInboxPayload(payload: any): InboxItem[] {
  if (!payload) return [];
  const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
  const out: InboxItem[] = [];

  for (const r of items) {
    const id = Number(r?.id);
    const loan_id = Number(r?.loan_id ?? r?.loanId ?? r?.loan);
    const clan_id = Number(r?.clan_id ?? r?.clanId ?? r?.clan);
    const guarantor_user_id = Number(r?.guarantor_user_id ?? r?.guarantorUserId ?? r?.guarantor_user);

    if (!Number.isFinite(id) || !Number.isFinite(loan_id) || !Number.isFinite(clan_id) || !Number.isFinite(guarantor_user_id)) continue;

    out.push({
      id,
      loan_id,
      clan_id,
      guarantor_user_id,
      status: safeStr(r?.status ?? "pending"),
      pledge_amount: r?.pledge_amount != null ? safeStr(r.pledge_amount) : null,
      responded_at: r?.responded_at ?? r?.respondedAt ?? null,
      borrower_user_id: r?.borrower_user_id ?? r?.borrowerUserId ?? null,
      borrower_email: r?.borrower_email ?? r?.borrowerEmail ?? null,
      amount: r?.amount != null ? safeStr(r.amount) : null,
      currency: r?.currency != null ? safeStr(r.currency) : null,
    });
  }

  return out;
}

// Structured reasons (good for audit & visa evidence)
const REASONS: { value: string; label: string }[] = [
  { value: "trust_character", label: "I trust their repayment character." },
  { value: "seen_history", label: "I’ve seen good repayment history." },
  { value: "business_verified", label: "Their business is verifiable / stable." },
  { value: "community_accountability", label: "Community accountability is strong." },
  { value: "decline_uncertain", label: "I am not confident enough to support this." },
  { value: "decline_no_capacity", label: "I don’t have capacity to risk this right now." },
  { value: "decline_insufficient_info", label: "Not enough information / proof." },
];

function defaultReasonFor(status: DecisionStatus): string {
  return status === "approved" ? "trust_character" : "decline_uncertain";
}

export default function GuarantorInboxPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [me, setMe] = useState<any>(null);
  const [items, setItems] = useState<InboxItem[]>([]);

  const pending = useMemo(() => items.filter((x) => safeStr(x.status).toLowerCase() === "pending"), [items]);
  const history = useMemo(() => items.filter((x) => safeStr(x.status).toLowerCase() !== "pending"), [items]);

  // Evidence inputs
  const [decisionReason, setDecisionReason] = useState<string>(defaultReasonFor("approved"));
  const [note, setNote] = useState<string>("");

  // Guard against double-taps / retries
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  async function loadAll() {
    setLoading(true);
    setErr(null);
    try {
      const m = await getMe();
      setMe(m);

      const raw = await listIncomingGuarantorRequests();
      setItems(normalizeInboxPayload(raw));
    } catch (e: any) {
      setErr(String(e?.message || e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function decide(item: InboxItem, status: DecisionStatus) {
    setErr(null);

    // Reason is mandatory (structured)
    const r = safeStr(decisionReason).trim();
    if (!r) {
      setErr("Please select a reason before submitting.");
      return;
    }

    // Prevent double submit for the same row
    if (submittingId === item.id) return;

    setSubmittingId(item.id);
    try {
      await decideIncomingGuarantorRequest(item.loan_id, item.id, {
        status,
        reason: r,
        note: safeStr(note).trim() || undefined,
      });
      await loadAll();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSubmittingId(null);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 1000 }}>Guarantor Inbox</div>
          <div style={{ color: "#64748b", fontSize: 12 }}>Decide who to support. Keep trust precious.</div>
        </div>

        <button style={btnStyle(loading)} onClick={loadAll} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {err && (
        <div style={{ marginTop: 12, ...cardStyle(), borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" }}>
          {err}
        </div>
      )}

      {/* Reason / note */}
      <div style={{ marginTop: 12, ...cardStyle() }}>
        <div style={{ fontSize: 16, fontWeight: 1000 }}>Your explanation (stored as evidence)</div>
        <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
          This becomes part of the TrustEvent audit trail (“Why did trust change?”).
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Reason (required)</div>
            <select
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff" }}
            >
              {REASONS.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>

            <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
              Tip: use <b>Approve</b> reasons when approving, and <b>Decline</b> reasons when declining.
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Note (optional)</div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
              placeholder="Short note (optional)..."
            />
          </div>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
          Signed in as: <b>{me?.email ?? "—"}</b>
        </div>
      </div>

      {/* Pending */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 1000 }}>Pending Requests</div>
          <span style={pill(pending.length ? "blue" : "gray")}>{pending.length} pending</span>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
          {pending.map((it) => {
            const borrowerName = displayNameFromEmail(it.borrower_email);
            const borrowerMail = maskedEmail(it.borrower_email);
            const busy = submittingId === it.id;

            return (
              <div key={it.id} style={cardStyle()}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={pill("blue")}>Loan #{it.loan_id}</span>
                    <span style={pill("gray")}>Clan #{it.clan_id}</span>
                    <span style={pill("gray")}>Pledge: {it.pledge_amount ?? "—"}</span>
                  </div>
                  <span style={pill("gray")}>pending</span>
                </div>

                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Borrower</div>
                    <div style={{ fontWeight: 1000 }}>{borrowerName}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{borrowerMail}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Loan amount</div>
                    <div style={{ fontWeight: 1000 }}>
                      {it.amount ?? "—"} {it.currency ?? ""}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    style={btnPrimaryStyle(busy)}
                    onClick={() => {
                      // helpful default: if user is approving and has a "decline_*" reason selected, switch to approve default
                      if (safeStr(decisionReason).startsWith("decline_")) setDecisionReason(defaultReasonFor("approved"));
                      decide(it, "approved");
                    }}
                    disabled={busy}
                  >
                    {busy ? "Saving..." : "Approve"}
                  </button>

                  <button
                    style={btnStyle(busy)}
                    onClick={() => {
                      // helpful default: if user is declining and has an approve reason selected, switch to decline default
                      if (!safeStr(decisionReason).startsWith("decline_")) setDecisionReason(defaultReasonFor("declined"));
                      decide(it, "declined");
                    }}
                    disabled={busy}
                  >
                    Decline
                  </button>

                  <button
                    style={btnStyle(busy)}
                    onClick={() => alert("Ignore = do nothing. The request stays pending until it expires.")}
                    title="Ignore leaves it pending."
                    disabled={busy}
                  >
                    Ignore
                  </button>

                  <Link to="/loans" style={{ ...btnStyle(busy), display: "inline-block", textDecoration: "none", color: "#111827" }}>
                    Open Loans →
                  </Link>
                </div>

                <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
                  Tip: Approve only when you trust the person’s repayment character. Your reputation is also at stake.
                </div>
              </div>
            );
          })}

          {!loading && pending.length === 0 && (
            <div style={{ ...cardStyle(), color: "#64748b" }}>No pending requests right now.</div>
          )}
        </div>
      </div>

      {/* My Guarantees (History) */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 1000 }}>My Guarantees (History)</div>
          <span style={pill(history.length ? "gold" : "gray")}>{history.length} record(s)</span>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
          {history.slice(0, 60).map((it) => {
            const st = safeStr(it.status).toLowerCase();
            const k = st === "approved" ? "green" : st === "declined" ? "red" : "gray";

            return (
              <div key={it.id} style={cardStyle()}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={pill("blue")}>Loan #{it.loan_id}</span>
                    <span style={pill("gray")}>Pledge: {it.pledge_amount ?? "—"}</span>
                  </div>
                  <span style={pill(k as any)}>{st || "—"}</span>
                </div>

                <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>Responded: {it.responded_at ?? "—"}</div>
              </div>
            );
          })}

          {!loading && history.length === 0 && <div style={{ ...cardStyle(), color: "#64748b" }}>No guarantees history yet.</div>}
        </div>
      </div>
    </div>
  );
}