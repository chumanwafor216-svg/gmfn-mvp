import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { formatMoney } from "../lib/money";
import {
  getMe,
  getLoanSummary,
  getLoanGuarantors,
  decideLoanGuarantor,
  getRepayments,
  
} from "../lib/api";

type MeLite = { id?: number | string; email?: string; role?: string };

type LoanSummary = {
  id: number;
  clan_id?: number;
  status: string;
  amount: number;
  currency?: string;
  guarantors_required?: number;
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

type TrustEvent = { id?: number; event_type?: string; created_at?: string; meta_json?: any; meta?: any };
type Repayment = { id?: number; amount: number; created_at?: string };

type Suggestion = { user_id: number; email?: string; cci?: number; recommended_pledge?: number };

// Bulk result is typed as unknown in api.ts — we cast here for UI
type BulkActionResult = { attempted: number; succeeded: number; failed: number };

function safeItems<T>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as T[];
  if (Array.isArray(res.items)) return res.items as T[];
  return [];
}

const n = (x: any) => (Number.isFinite(Number(x)) ? Number(x) : 0);
const lc = (x: any) => String(x ?? "").toLowerCase();

function parseMetaObj(meta: any): Record<string, any> | null {
  if (meta == null) return null;
  try {
    if (typeof meta === "string") {
      const s = meta.trim();
      if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
        const parsed = JSON.parse(s);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
      }
      return null;
    }
    if (typeof meta === "object" && !Array.isArray(meta)) return meta as Record<string, any>;
    return null;
  } catch {
    return null;
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

  if (s === "approved" || s === "disbursed")
    return <span style={{ ...base, background: "#ecfdf5", color: "#065f46", borderColor: "#a7f3d0" }}>{s.toUpperCase()}</span>;
  if (s === "pending")
    return <span style={{ ...base, background: "#eff6ff", color: "#1e40af", borderColor: "#bfdbfe" }}>{s.toUpperCase()}</span>;
  if (s === "repaid")
    return <span style={{ ...base, background: "#f0fdf4", color: "#166534", borderColor: "#bbf7d0" }}>{s.toUpperCase()}</span>;
  if (s === "rejected")
    return <span style={{ ...base, background: "#fef2f2", color: "#991b1b", borderColor: "#fecaca" }}>{s.toUpperCase()}</span>;

  return <span style={{ ...base, background: "#f9fafb", color: "#374151" }}>{(status || "UNKNOWN").toUpperCase()}</span>;
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
  if (s === "approved")
    return <span style={{ ...base, background: "#ecfdf5", color: "#065f46", borderColor: "#a7f3d0" }}>APPROVED</span>;
  if (s === "declined")
    return <span style={{ ...base, background: "#fef2f2", color: "#991b1b", borderColor: "#fecaca" }}>DECLINED</span>;
  if (s === "expired")
    return <span style={{ ...base, background: "#f9fafb", color: "#374151", borderColor: "#e5e7eb" }}>EXPIRED</span>;
  return <span style={{ ...base, background: "#eff6ff", color: "#1e40af", borderColor: "#bfdbfe" }}>PENDING</span>;
}

function nextStepText(status: string) {
  const s = lc(status);
  if (s === "pending") return "Next: request guarantors → wait for approvals. When enough guarantors approve, the loan auto-approves.";
  if (s === "approved") return "Next: the loan is approved. You can begin repayments and generate evidence reports.";
  if (s === "disbursed") return "Next: repayments should begin according to the schedule.";
  if (s === "repaid") return "Completed: this loan has been fully repaid.";
  if (s === "rejected") return "Stopped: this loan was rejected. Create a new request or contact clan admin.";
  return "Next: review guarantors and events for this loan.";
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

  const [busy, setBusy] = useState(false);
  const [repayAmount, setRepayAmount] = useState<number>(100);

  // admin confirm (typed + checkbox + 3s)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<"approve" | "decline">("approve");
  const [confirmText, setConfirmText] = useState("");
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [confirmCountdown, setConfirmCountdown] = useState(3);

  const confirmPhrase = confirmMode === "approve" ? "APPROVE ALL" : "DECLINE ALL";
  const isAdmin = lc(me?.role) === "admin";

  const currency = summary?.currency ?? "NGN";
  const requiredCount = n(summary?.guarantors_required);
  const approvedCount = guarantors.filter((g) => lc(g.status) === "approved").length;
  const pendingGuarantors = guarantors.filter((g) => lc(g.status) === "pending" && g.id != null);

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

  const latestMeta = useMemo(() => parseMetaObj(latestEvent?.meta_json ?? latestEvent?.meta), [latestEvent]);
  const latestReason = (latestMeta?.reason ?? "").toString().trim();
  const latestNote = (latestMeta?.note ?? "").toString().trim();

  function jumpToAudit() {
    const clan = summary?.clan_id ? String(summary.clan_id) : "1";
    nav(`/trust-analytics?clan_id=${clan}&loan_id=${summary?.id}&audit=1`);
  }

  function confirmReady() {
    return confirmText.trim().toUpperCase() === confirmPhrase && confirmChecked && confirmCountdown === 0;
  }

  useEffect(() => {
    if (!confirmOpen) return;
    setConfirmCountdown(3);
    const t = setInterval(() => setConfirmCountdown((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [confirmOpen, confirmMode]);

  async function refreshAll() {
    try {
      const m = await getMe().catch(() => null);
      if (m) setMe({ id: m.id, email: m.email, role: m.role });
      else setMe(null);

      const s = (await getLoanSummary(id)) as LoanSummary;
      setSummary(s);

      const gs = await getLoanGuarantors(id);
      setGuarantors(safeItems<LoanGuarantor>(gs));

      const rs = await getRepayments(id).catch(() => ({ items: [] }));
      setRepayments(safeItems<Repayment>(rs));

      // trust events (api.ts signature: getTrustEvents(clanId: number))
      const ts = { items: [] as any[] };
      setEvents(safeItems<TrustEvent>(ts).slice(0, 50));

      // suggestions via direct endpoint (no missing api exports)
      try {
        const res = await fetch(`/api/loans/${Number(s.id)}/guarantors/suggestions?limit=10`);
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as { items: Suggestion[] };
        setSuggestions(data?.items || []);
      } catch {
        setSuggestions([]);
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to load");
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ONE-CLICK AUTO-ADD (until required met)
  async function autoAddUntilMet() {
    if (!summary?.clan_id) return;
    if (!canActOnGuarantors) {
      toast.error("Guarantors can only be added while loan is pending.");
      return;
    }
    const need = Math.max(0, requiredCount - approvedCount);
    if (need <= 0) {
      toast.success("Already met required approvals ✅");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/loans/${Number(summary.id)}/guarantors/suggestions?limit=20`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { items: Suggestion[] };
      const items = data?.items || [];

      const existing = new Set(guarantors.map((g) => Number(g.guarantor_user_id)));
      const picks = items.filter((s) => !existing.has(Number(s.user_id))).slice(0, need);

      let added = 0;
      for (const s of picks) {
        const pledge =
          n(s.recommended_pledge) > 0
            ? n(s.recommended_pledge)
            : Math.ceil((n(summary.amount) / Math.max(1, requiredCount)) / 100) * 100;

        throw new Error("Add guarantor is disabled in this build.");
      }

      toast.success(`Auto-added ${added} guarantor(s) ✅`);
      await refreshAll();
    } catch (e: any) {
      toast.error(e?.message || "Auto-add failed");
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf() {
    if (!summary?.id) return;
    setBusy(true);
    try {
  // PDF download intentionally disabled in this build.
  // Keep function structure for later enablement.
  toast.error("PDF download is disabled in this build.");
  return;
} finally {
  setBusy(false);
} 
  }

  function copyLoanAuditLink() {
    if (!summary?.id) return;
    const p = new URLSearchParams({ clan_id: String(summary.clan_id || 1), loan_id: String(summary.id), audit: "1" });
    navigator.clipboard.writeText(`${window.location.origin}/trust-analytics?${p.toString()}`);
    toast.success("Loan + audit link copied ✅");
  }

  async function runBulkAction() {
    if (!summary) return;
    if (!isAdmin) return toast.error("Admin only");
    if (!canActOnGuarantors) return toast.error("Bulk actions only available while loan is pending.");
    if (!confirmReady()) return toast.error(`Type "${confirmPhrase}", tick checkbox, wait countdown`);

    setBusy(true);
    try {
      let res: BulkActionResult;

      if (confirmMode === "approve") {
        throw new Error("Bulk actions disabled in this build.");
        toast.success(`Bulk approve ✅ attempted=${res.attempted}, ok=${res.succeeded}, failed=${res.failed}`);
      } else {
        throw new Error("Bulk actions disabled in this build.");
        toast.success(`Bulk decline ✅ attempted=${res.attempted}, ok=${res.succeeded}, failed=${res.failed}`);
      }

      setConfirmOpen(false);
      setConfirmText("");
      setConfirmChecked(false);
      await refreshAll();
      jumpToAudit();
    } catch (e: any) {
      toast.error(e?.message || "Bulk action failed");
    } finally {
      setBusy(false);
    }
  }

  async function onPostRepayment() {
    if (!summary) return;
    if (!canRepay) return toast.error("Repayments enabled after approval/disbursement");
    if (!repayAmount || repayAmount <= 0) return toast.error("Enter a valid amount");

    setBusy(true);
    try {
      throw new Error("Repayment post disabled in this build.");
      toast.success("Repayment posted ✅");
      await refreshAll();
      jumpToAudit();
    } catch (e: any) {
      toast.error(e?.message || "Repayment failed");
    } finally {
      setBusy(false);
    }
  }

  if (!summary) return <div style={{ padding: 20 }}>Loading…</div>;

  return (
    <div style={{ padding: 16, maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <Link to="/loans">← Back</Link>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={copyLoanAuditLink}>Copy loan + audit link</button>
          <button onClick={jumpToAudit}>Open audit</button>
          <button onClick={downloadPdf} disabled={busy}>Download PDF</button>
        </div>
      </div>

      <h2 style={{ marginTop: 10 }}>Loan Summary</h2>

      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div><b>ID:</b> {summary.id}</div>
          <div><b>Status:</b> {statusBadge(summary.status)}</div>
          <div><b>Amount:</b> {formatMoney(n(summary.amount), currency)}</div>
          <div><b>Clan:</b> {summary.clan_id ?? "-"}</div>
        </div>

        <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
          <b>What happens next:</b> {nextStepText(summary.status)}
        </div>

        <div style={{ marginTop: 8 }}>
          <b>Approved:</b> {approvedCount}/{requiredCount} · <b>Pending:</b> {pendingGuarantors.length}
        </div>

        {(latestNote || latestReason) && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 10, border: "1px solid #eee", background: "#fafafa" }}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>Latest trust note</div>
            <div style={{ fontSize: 13 }}>{latestNote || "—"}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
              reason: <code>{latestReason || "(auto)"}</code>
            </div>
          </div>
        )}

        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={refreshAll} disabled={busy}>Refresh</button>
          <button onClick={autoAddUntilMet} disabled={busy || !canActOnGuarantors || (requiredCount - approvedCount) <= 0}>
            Auto-add until met
          </button>
          {isAdmin && (
            <>
              <button onClick={() => { setConfirmMode("approve"); setConfirmOpen(true); }} disabled={busy || !canActOnGuarantors || pendingGuarantors.length === 0}>
                Bulk approve (admin)
              </button>
              <button onClick={() => { setConfirmMode("decline"); setConfirmOpen(true); }} disabled={busy || !canActOnGuarantors || pendingGuarantors.length === 0}>
                Bulk decline (admin)
              </button>
            </>
          )}
        </div>

        {!canActOnGuarantors && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
            Note: Loan is <b>{summary.status}</b>. Guarantor decisions are disabled.
          </div>
        )}
      </div>

      {confirmOpen && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <div style={{ fontWeight: 800 }}>Confirm bulk {confirmMode}</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
            Type <b>{confirmPhrase}</b>, tick checkbox, wait countdown to reach 0.
          </div>

          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={`Type ${confirmPhrase}`}
            style={{ marginTop: 8, padding: 8, width: 260, borderRadius: 8, border: "1px solid #ddd" }}
          />

          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, fontSize: 12 }}>
            <input type="checkbox" checked={confirmChecked} onChange={(e) => setConfirmChecked(e.target.checked)} />
            I understand this will apply to all pending guarantors.
          </label>

          <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
            Countdown: <b>{confirmCountdown}</b>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <button onClick={runBulkAction} disabled={busy || !confirmReady()} style={{ opacity: confirmReady() ? 1 : 0.6 }}>
              Confirm
            </button>
            <button onClick={() => { setConfirmOpen(false); setConfirmText(""); setConfirmChecked(false); }} disabled={busy}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>Guarantors</h3>

        {guarantors.length === 0 ? (
          <div style={{ color: "#6b7280" }}>None yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Guarantor</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Status</th>
                <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>Pledge</th>
                <th style={{ padding: 8, borderBottom: "1px solid #eee" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {guarantors.map((g, idx) => {
                const gStatus = lc(g.status);
                const canDecide = canActOnGuarantors && g.id != null && gStatus === "pending";
                return (
                  <tr key={idx}>
                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>
                      {g.guarantor_email ?? `user:${g.guarantor_user_id}`}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>{guarantorBadge(g.status)}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3", textAlign: "right" }}>
                      {formatMoney(n(g.pledge_amount), currency)}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3", textAlign: "center" }}>
                      <button onClick={() => decideLoanGuarantor(summary.id, Number(g.id), { status: "approved" })} disabled={busy || !canDecide}>
                        Approve
                      </button>
                      <button onClick={() => decideLoanGuarantor(summary.id, Number(g.id), { status: "declined" })} disabled={busy || !canDecide} style={{ marginLeft: 8 }}>
                        Decline
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 16, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>Post repayment</h3>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
          Repayments are enabled after approval/disbursement.
        </div>
        <input type="number" value={repayAmount} onChange={(e) => setRepayAmount(Number(e.target.value))} />
        <button onClick={onPostRepayment} disabled={busy || !canRepay} style={{ marginLeft: 8 }}>
          Post repayment
        </button>
      </div>
    </div>
  );
}
