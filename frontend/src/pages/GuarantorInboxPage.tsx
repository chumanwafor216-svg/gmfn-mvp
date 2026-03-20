import React, { useEffect, useMemo, useState } from "react";
import {
  decideIncomingGuarantorRequest,
  getGuarantorInbox,
  getMe,
  safeCopy,
} from "../lib/api";

type MeLite = {
  gmfn_id?: string | null;
  nickname?: string | null;
  display_name?: string | null;
  email?: string | null;
};

type InboxRow = {
  id?: number;
  loan_id?: number;
  guarantor_user_id?: number;
  borrower_user_id?: number;
  borrower_display?: string | null;
  borrower_email?: string | null;
  pledge_amount?: string | number | null;
  requested_amount?: string | number | null;
  amount?: string | number | null;
  currency?: string | null;
  status?: string | null;
  note?: string | null;
  created_at?: string | null;
};

function safeStr(x: any): string {
  return String(x ?? "");
}

function fmtMoney(x: any): string {
  const n = Number(x);
  if (!Number.isFinite(n)) {
    const s = String(x ?? "").trim();
    return s || "0.00";
  }
  return n.toFixed(2);
}

function displayName(me: MeLite | null): string {
  const n1 = safeStr(me?.nickname).trim();
  if (n1) return n1;

  const n2 = safeStr(me?.display_name).trim();
  if (n2) return n2;

  const email = safeStr(me?.email).trim();
  if (!email) return "Member";

  const left = email.split("@")[0] || "member";
  return left
    .split(/[._-]+/)
    .filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

function topPattern(): string {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="320" viewBox="0 0 1600 320">
    <rect width="1600" height="320" fill="#F7FAFD"/>
    <g fill="none" stroke="#C7D9EE" stroke-opacity="0.42" stroke-width="2">
      <path d="M80 160 C180 90, 280 90, 380 160 S580 230, 690 150" />
      <path d="M920 160 C1020 90, 1120 90, 1220 160 S1420 230, 1520 150" />
    </g>
    <g fill="#D6AF47" fill-opacity="0.95">
      <path d="M80 150 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M180 96 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M280 96 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M380 150 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M510 205 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M650 150 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>

      <path d="M920 150 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M1020 96 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M1120 96 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M1220 150 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M1350 205 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
      <path d="M1490 150 l4 10 10 1 -8 7 2 10 -8 -5 -8 5 2 -10 -8 -7 10 -1z"/>
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

function pill(kind: "green" | "gold" | "red" | "gray" | "blue"): React.CSSProperties {
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

  if (kind === "green") return { ...base, color: "#065F46", background: "#ECFDF5", borderColor: "#A7F3D0" };
  if (kind === "gold") return { ...base, color: "#92400E", background: "#FFFBEB", borderColor: "#FDE68A" };
  if (kind === "red") return { ...base, color: "#991B1B", background: "#FEF2F2", borderColor: "#FECACA" };
  if (kind === "blue") return { ...base, color: "#1D4ED8", background: "#EFF6FF", borderColor: "#BFDBFE" };
  return { ...base, color: "#475569", background: "#F8FAFC", borderColor: "#E2E8F0" };
}

function actionButton(kind: "default" | "approve" | "decline" = "default"): React.CSSProperties {
  if (kind === "approve") {
    return {
      padding: "10px 12px",
      borderRadius: 14,
      border: "1px solid #A7F3D0",
      background: "#ECFDF5",
      color: "#065F46",
      fontWeight: 1000,
      cursor: "pointer",
      fontSize: 14,
    };
  }

  if (kind === "decline") {
    return {
      padding: "10px 12px",
      borderRadius: 14,
      border: "1px solid #FECACA",
      background: "#FEF2F2",
      color: "#991B1B",
      fontWeight: 1000,
      cursor: "pointer",
      fontSize: 14,
    };
  }

  return {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: "#0B1F33",
    fontWeight: 1000,
    cursor: "pointer",
    fontSize: 14,
  };
}

function statusKind(status?: string | null): "green" | "gold" | "red" | "gray" | "blue" {
  const s = safeStr(status).toLowerCase();
  if (s.includes("approved")) return "green";
  if (s.includes("pending") || s.includes("requested")) return "gold";
  if (s.includes("declined") || s.includes("expired")) return "red";
  return "gray";
}

function fieldLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#5B7693",
    fontWeight: 1000,
    marginBottom: 6,
  };
}

export default function GuarantorInboxPage() {
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [me, setMe] = useState<MeLite | null>(null);
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("pending");

  const pattern = useMemo(() => topPattern(), []);

  async function loadAll() {
    setLoading(true);
    setErr(null);

    try {
      const [meRes, inboxRes] = await Promise.all([
        getMe().catch(() => null),
        getGuarantorInbox(statusFilter, 100).catch(() => []),
      ]);

      setMe(meRes || null);

      const items = Array.isArray(inboxRes) ? inboxRes : inboxRes?.items || [];
      setRows(items || []);
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to load guarantor inbox."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [statusFilter]);

  async function decide(row: InboxRow, decision: "approved" | "declined") {
    const loanId = Number(row.loan_id || 0);
    const guarantorId = Number(row.guarantor_user_id || 0);

    if (!loanId || !guarantorId) {
      setErr("Missing loan or guarantor information.");
      return;
    }

    setBusyId(Number(row.id || loanId));
    setErr(null);
    setMsg(null);

    try {
      await decideIncomingGuarantorRequest(loanId, guarantorId, {
        status: decision,
        reason: decision === "approved" ? "capacity_confirmed" : "capacity_declined",
        note:
          decision === "approved"
            ? "Approved from guarantor inbox."
            : "Declined from guarantor inbox.",
      });

      setMsg(decision === "approved" ? "Request approved." : "Request declined.");
      await loadAll();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusyId(null);
    }
  }

  const name = useMemo(() => displayName(me), [me]);
  const gmfnId = useMemo(() => safeStr(me?.gmfn_id).trim() || "Pending", [me]);
  const pendingCount = useMemo(
    () => rows.filter((r) => safeStr(r.status || "pending").toLowerCase().includes("pending")).length,
    [rows]
  );

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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 1000,
                  color: "#0B1F33",
                  textShadow: "0 1px 0 rgba(255,255,255,0.85)",
                }}
              >
                Incoming Guarantor Requests
              </div>
              <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
                Review requests carefully. Guarantee is a personal commitment decision.
              </div>
            </div>

            <button onClick={loadAll} disabled={loading} style={actionButton()}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
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

          {msg && (
            <div
              style={{
                marginTop: 16,
                padding: "12px 14px",
                borderRadius: 14,
                background: "#ECFDF5",
                border: "1px solid #A7F3D0",
                color: "#065F46",
                fontWeight: 900,
              }}
            >
              {msg}
            </div>
          )}

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "1.05fr 0.95fr",
              gap: 18,
            }}
          >
            <div
              style={{
                ...card(),
                background: "linear-gradient(180deg, rgba(239,246,255,0.96) 0%, rgba(255,255,255,0.98) 100%)",
              }}
            >
              <div style={{ fontSize: 12, color: "#5B7693", fontWeight: 1000, letterSpacing: 0.8 }}>
                GUARANTOR POSITION
              </div>

              <div style={{ marginTop: 10, fontSize: 28, fontWeight: 1000, color: "#0B1F33" }}>
                {name}
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={pill("blue")}>{gmfnId}</span>
                <span style={pill(pendingCount > 0 ? "gold" : "gray")}>
                  {pendingCount} pending
                </span>
              </div>

              <div style={{ marginTop: 16, color: "#6B7A88", lineHeight: 1.8 }}>
                Approval should reflect your real willingness and actual capacity to stand behind the request.
              </div>
            </div>

            <div style={card()}>
              <div style={{ fontSize: 16, fontWeight: 1000, color: "#0B1F33" }}>Filter inbox</div>

              <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
                View pending, approved, declined, or all requests.
              </div>

              <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                {["pending", "approved", "declined", "all"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    style={
                      statusFilter === s
                        ? {
                            padding: "10px 12px",
                            borderRadius: 14,
                            border: "1px solid #BFDBFE",
                            background: "#EFF6FF",
                            color: "#1D4ED8",
                            fontWeight: 1000,
                            cursor: "pointer",
                          }
                        : actionButton()
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18, ...card() }}>
            <div style={{ fontSize: 16, fontWeight: 1000, color: "#0B1F33" }}>
              Request queue
            </div>
            <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
              Open each request with clear judgment. Approval should not be casual.
            </div>

            <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
              {rows.length === 0 && (
                <div style={{ color: "#7A8D9F" }}>No guarantor requests found for this filter.</div>
              )}

              {rows.map((row, idx) => {
                const rowId = Number(row.id || idx + 1);
                const loanId = Number(row.loan_id || 0);
                const borrower = safeStr(
                  row.borrower_display || row.borrower_email || `Borrower #${row.borrower_user_id || "—"}`
                );
                const pledgeAmount = fmtMoney(row.pledge_amount ?? "0");
                const requestedAmount = fmtMoney(row.requested_amount ?? row.amount ?? "0");
                const rowCurrency = safeStr(row.currency || "NGN");
                const rowStatus = safeStr(row.status || "pending");

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
                        <div style={{ fontWeight: 1000, color: "#0B1F33", fontSize: 18 }}>
                          Loan #{loanId || "—"}
                        </div>
                        <div style={{ marginTop: 4, color: "#6B7A88", fontSize: 13 }}>
                          {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={pill(statusKind(rowStatus))}>{rowStatus}</span>
                        <span style={pill("blue")}>
                          pledge {pledgeAmount} {rowCurrency}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 14,
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={fieldLabel()}>Borrower</div>
                        <div style={{ color: "#0B1F33", fontWeight: 900 }}>{borrower}</div>
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

                    <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {safeStr(rowStatus).toLowerCase().includes("pending") ? (
                        <>
                          <button
                            onClick={() => decide(row, "approved")}
                            disabled={busyId === rowId}
                            style={actionButton("approve")}
                          >
                            {busyId === rowId ? "Working..." : "Approve"}
                          </button>

                          <button
                            onClick={() => decide(row, "declined")}
                            disabled={busyId === rowId}
                            style={actionButton("decline")}
                          >
                            {busyId === rowId ? "Working..." : "Decline"}
                          </button>
                        </>
                      ) : null}

                      <button
                        onClick={() =>
                          safeCopy(
                            `Loan ${loanId} | Borrower: ${borrower} | Pledge: ${pledgeAmount} ${rowCurrency} | Status: ${rowStatus}`
                          )
                        }
                        style={actionButton()}
                      >
                        Copy summary
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}