// src/pages/LoansPage.tsx
import React, { useEffect, useMemo, useState } from "react";

import {
  getMe,
  getSelectedClanId,
  listClanMembers,
  listMyLoans,
  createLoan,
  cancelLoan,
  getLoanGuarantors,
  decideLoanGuarantor,
  listIncomingGuarantorRequests,
  decideIncomingGuarantorRequest,
  listMyGuarantees,
  getAccessToken,
} from "../lib/api";

import RevenuePanel from "../components/RevenuePanel";
import ShareActions from "../components/ShareActions";
import { Alert, Button, ButtonPrimary, Card, PageHeader, Pill, Field, SoftCard } from "../components/uiKit";
import { fmtMoney, moneyNum, parseItems, safeStr, maskedEmail } from "../ui/format";

type MemberRow = { user_id: number; email?: string | null; personal_pool_balance?: string | null };
type LoanRow = {
  id: number;
  clan_id: number;
  borrower_user_id: number;
  amount: string;
  currency: string;
  status: string;
  guarantors_required?: number;
  personal_pool_at_request?: string | null;
  pool_used?: string | null;
  guarantee_gap?: string | null;
};

type GuarantorRow = {
  id: number;
  loan_id: number;
  clan_id: number;
  guarantor_user_id: number;
  pledge_amount: string;
  status: string;
  responded_at?: string | null;
};

type InboxItem = {
  id: number;
  loan_id: number;
  clan_id: number;
  guarantor_user_id: number;
  status: string;
  pledge_amount?: string | null;
  borrower_email?: string | null;
  borrower_user_id?: number | null;
  amount?: string | null;
  currency?: string | null;
};

type MyGuaranteeRow = {
  id: number;
  loan_id: number;
  clan_id: number;
  borrower_user_id?: number | null;
  borrower_email?: string | null;
  pledge_amount?: string | null;
  status?: string | null;
};

export default function LoansPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [me, setMe] = useState<any>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loans, setLoans] = useState<LoanRow[]>([]);

  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<LoanRow | null>(null);
  const [guarantors, setGuarantors] = useState<GuarantorRow[]>([]);
  const [pool, setPool] = useState<any | null>(null);
  // Request support
  const [amountInput, setAmountInput] = useState("100");
  const [currencyInput, setCurrencyInput] = useState("NGN");

  // Decision meta (shared by inbox + guarantor decisions)
  const [reason, setReason] = useState("I can support this pledge.");
  const [note, setNote] = useState("");

  // Inbox (incoming requests)
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxErr, setInboxErr] = useState<string | null>(null);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);

  // My guarantees
  const [myGLoading, setMyGLoading] = useState(false);
  const [myGErr, setMyGErr] = useState<string | null>(null);
  const [myGuarantees, setMyGuarantees] = useState<MyGuaranteeRow[]>([]);

  const clanId = useMemo(() => getSelectedClanId(), []);

  const myMember = useMemo(() => {
    if (!me) return null;
    return members.find((m) => m.user_id === me.id) || null;
  }, [members, me]);

  const poolBalance = useMemo(() => moneyNum(myMember?.personal_pool_balance ?? null), [myMember]);
  const poolBalanceFmt = useMemo(() => fmtMoney(String(poolBalance)), [poolBalance]);

  const guaranteeGap = useMemo(() => moneyNum(selectedLoan?.guarantee_gap ?? null), [selectedLoan]);

  const approvedTotal = useMemo(() => {
    let sum = 0;
    for (const g of guarantors) {
      if (safeStr(g.status).toLowerCase() === "approved") sum += moneyNum(g.pledge_amount);
    }
    return sum;
  }, [guarantors]);

  const coveragePct = useMemo(() => {
    if (guaranteeGap <= 0) return 100;
    return Math.max(0, Math.min(100, Math.floor((approvedTotal / guaranteeGap) * 100)));
  }, [approvedTotal, guaranteeGap]);

  async function loadCore() {
    setLoading(true);
    setErr(null);
    try {
      const m = await getMe();
      setMe(m);

      if (clanId) {
        const mem = await listClanMembers(clanId);
        setMembers(parseItems<MemberRow>(mem));
      } else {
        setMembers([]);
      }

      const l = await listMyLoans();
      setLoans(parseItems<LoanRow>(l));

      if (selectedLoanId) {
        // keep selection stable
      }
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function selectLoan(id: number) {
    setErr(null);
    try {
      setSelectedLoanId(id);
      const row = loans.find((x) => x.id === id) || null;
      setSelectedLoan(row);

      const gs = await getLoanGuarantors(id);
      setGuarantors(parseItems<GuarantorRow>(gs));
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function refreshAll() {
    await loadCore();
    await loadInbox();
    await loadMyGuarantees();
    if (selectedLoanId) await selectLoan(selectedLoanId);
  }

  async function createSupportRequest() {
    setErr(null);
    try {
      const cid = clanId;
      if (!cid) throw new Error("Select a clan first (go to My Community / Clans).");
      const amt = safeStr(amountInput).trim();
      if (!amt) throw new Error("Enter an amount.");
      const cur = safeStr(currencyInput).trim() || "NGN";
      await createLoan({ clan_id: cid, amount: amt, currency: cur });
      await loadCore();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function cancelSelectedLoan() {
    setErr(null);
    try {
      if (!selectedLoanId) throw new Error("Select a loan first.");
      await cancelLoan(selectedLoanId);
      setSelectedLoanId(null);
      setSelectedLoan(null);
      setGuarantors([]);
      await loadCore();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function decideGuarantor(guarantorId: number, status: "approved" | "declined") {
  setErr(null);

  // Submit guard: reason required
  if (!(reason || "").trim()) {
    setErr("Please select a reason before approving or declining.");
    return;
  }

  try {
      if (!selectedLoanId) throw new Error("Select a loan first.");
      await decideLoanGuarantor(selectedLoanId, guarantorId, {
        status,
        reason: reason.trim() || undefined,
        note: note.trim() || undefined,
      });
      const gs = await getLoanGuarantors(selectedLoanId);
      setGuarantors(parseItems<GuarantorRow>(gs));
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function loadInbox() {
    setInboxLoading(true);
    setInboxErr(null);
    try {
      const raw = await listIncomingGuarantorRequests();
      const items = parseItems<any>(raw);

      const mapped: InboxItem[] = items
        .map((r: any) => ({
          id: Number(r?.id),
          loan_id: Number(r?.loan_id ?? r?.loanId),
          clan_id: Number(r?.clan_id ?? r?.clanId),
          guarantor_user_id: Number(r?.guarantor_user_id ?? r?.guarantorUserId),
          status: safeStr(r?.status || "pending"),
          pledge_amount: r?.pledge_amount != null ? safeStr(r?.pledge_amount) : null,
          borrower_email: r?.borrower_email ?? null,
          borrower_user_id: r?.borrower_user_id ?? null,
          amount: r?.amount != null ? safeStr(r?.amount) : null,
          currency: r?.currency != null ? safeStr(r?.currency) : null,
        }))
        .filter((x) => Number.isFinite(x.id) && Number.isFinite(x.loan_id));

      setInboxItems(mapped);
    } catch (e: any) {
      setInboxErr(String(e?.message || e));
      setInboxItems([]);
    } finally {
      setInboxLoading(false);
    }
  }

  async function decideInbox(it: InboxItem, status: "approved" | "declined") {
    setInboxErr(null);
    // Submit guard: reason required
    if (!(reason || "").trim()) {
      setInboxErr("Please select a reason before approving or declining.");
      return;
    }
    try {
      await decideIncomingGuarantorRequest(it.loan_id, it.id, {
        status,
        reason: reason.trim() || undefined,
        note: note.trim() || undefined,
      });
      await loadInbox();
    } catch (e: any) {
      setInboxErr(String(e?.message || e));
    }
  }

  async function loadMyGuarantees() {
    setMyGLoading(true);
    setMyGErr(null);
    try {
      const raw = await listMyGuarantees();
      const items = parseItems<any>(raw);
      const mapped: MyGuaranteeRow[] = items.map((r: any) => ({
        id: Number(r?.id),
        loan_id: Number(r?.loan_id ?? r?.loanId),
        clan_id: Number(r?.clan_id ?? r?.clanId),
        borrower_user_id: r?.borrower_user_id ?? null,
        borrower_email: r?.borrower_email ?? null,
        pledge_amount: r?.pledge_amount != null ? safeStr(r?.pledge_amount) : null,
        status: r?.status != null ? safeStr(r?.status) : null,
      }));
      setMyGuarantees(mapped.filter((x) => Number.isFinite(x.loan_id)));
    } catch (e: any) {
      setMyGErr(String(e?.message || e));
      setMyGuarantees([]);
    } finally {
      setMyGLoading(false);
    }
  }

  // Share support request (simple internal link – stable, low friction)
  const shareLoanUrl = useMemo(() => {
    if (!selectedLoanId) return "";
    return `${window.location.origin}/loans?loan=${encodeURIComponent(String(selectedLoanId))}`;
  }, [selectedLoanId]);

  const shareLoanText = useMemo(() => {
    if (!selectedLoan) return "";
    return `GMFN support request\nLoan #${selectedLoan.id}\nAmount: ${selectedLoan.amount} ${selectedLoan.currency}\n\nOpen:\n${shareLoanUrl}`;
  }, [selectedLoan, shareLoanUrl]);
  
  // ===== GMFN BLOCK START: LOANS_POOL_LOADER_V2 =====
type PoolMe = {
  currency?: string;
  available_balance?: string;
  pending_deposits?: string;
  pending_withdrawals?: string;
  reserved_pool?: string;
  effective_available?: string;
  reference?: string;
};


async function loadPool() {
  try {
    // IMPORTANT: use the same token mechanism as the rest of the frontend
    const token = localStorage.getItem("access_token");
    if (!token) return;

    // IMPORTANT: do not hardcode backend URL; use Vite proxy via /pool/*
    const p: any = await getPoolMe("NGN", 20);
    setPool(p || null);
  } catch {
    // silent fail — loans page should still work without pool
    setPool(null);
  }
}

useEffect(() => {
  loadPool();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
// ===== GMFN BLOCK END: LOANS_POOL_LOADER_V2 =====
  return (
    <div style={{ padding: 18, maxWidth: 1100 }}>
      <PageHeader
        title="Loans & Supporters"
        subtitle="Request support, manage guarantors, and respond to incoming requests."
        right={
          <Button onClick={refreshAll} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        }
      />

      {err && <Alert kind="error">{err}</Alert>}

      {/* Personal pool */}
      <Card style={{ marginTop: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 1000 }}>Your Personal Pool</div>
        <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>
          Small requests may auto-approve within your pool. Bigger requests need guarantors to cover the gap.
        </div>
        <div style={{ marginTop: 10, fontSize: 28, fontWeight: 1000 }}>
          {poolBalanceFmt} <span style={{ fontSize: 12, color: "#64748b" }}>(pool)</span>
        </div>
      </Card>

      {/* Request support */}
      <Card style={{ marginTop: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 1000 }}>Request Support</div>
        <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>
          If amount is above your pool, it becomes a guarantor-backed request.
        </div>
         {/* ===== GMFN BLOCK START: POOL_NOTE_B_MODEL ===== */}
<div
  style={{
    marginTop: 10,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "rgba(255,255,255,0.92)",
    fontSize: 12,
    color: "#6B7A88",
    lineHeight: 1.5,
  }}
>
  <b style={{ color: "#0B1F33" }}>Pool note (Pilot):</b> The Clan Pool is <b>non-custodial</b>. Deposits and withdrawals are recorded for evidence and admin-confirmed,
  but GMFN does not move money automatically in this phase.
  <div style={{ marginTop: 8 }}>
    If you need cash externally, <b>request a withdrawal in Dashboard</b> first.
    <a href="/dashboard" style={{ marginLeft: 8, fontWeight: 1000, color: "#0B1F33", textDecoration: "none" }}>
      Go to Pool →
    </a>
  </div>
</div>
{/* ===== GMFN BLOCK END: POOL_NOTE_B_MODEL ===== */}
        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <Field label="Amount" value={amountInput} onChange={setAmountInput} width={180} placeholder="100" />
          <Field label="Currency" value={currencyInput} onChange={setCurrencyInput} width={120} placeholder="NGN" />
          <ButtonPrimary onClick={createSupportRequest}>Request →</ButtonPrimary>
          <Button onClick={cancelSelectedLoan} disabled={!selectedLoanId}>
            Cancel selected loan
          </Button>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ marginTop: 6, fontSize: 12, fontWeight: 900, color: "#1e40af" }}>
  Pilot Service Fee: 3%
</div>

<RevenuePanel
  amount={amountInput}
  currency={safeStr(currencyInput || "NGN")}
  mode="pilot"
/>
        </div>
      </Card>

      {/* Decision meta */}
<Card style={{ marginTop: 12 }}>
  <div style={{ fontSize: 16, fontWeight: 1000 }}>Decision note (audit)</div>
  <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>
    Used when you approve/decline (incoming requests and guarantor decisions). Reason is stored in TrustEvent meta.
  </div>

  <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
    <div>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Reason (required)</div>
      <select
        value={(reason ?? "").toString()}
        onChange={(e) => setReason(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          background: "#fff",
          fontWeight: 800,
        }}
      >
        <option value="">Select reason…</option>

        <option value="trust_character">I trust their repayment character.</option>
        <option value="seen_history">I’ve seen good repayment history.</option>
        <option value="business_verified">Their business is verifiable / stable.</option>
        <option value="community_accountability">Community accountability is strong.</option>

        <option value="decline_uncertain">I am not confident enough to support this.</option>
        <option value="decline_no_capacity">I don’t have capacity to risk this right now.</option>
        <option value="decline_insufficient_info">Not enough information / proof.</option>
      </select>

      {(!(reason || "").trim()) && (
        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 900, color: "#92400e" }}>
          ⚠️ Pick a reason before you approve/decline — it’s part of the evidence trail.
        </div>
      )}
    </div>

    <div>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Note (optional)</div>
      <input
        value={(note ?? "").toString()}
        onChange={(e) => setNote(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
        placeholder="Optional note…"
      />
    </div>
  </div>
</Card>

      {/* Incoming requests (Inbox) */}
      <Card style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 1000 }}>Incoming Guarantor Requests</div>
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>Approve / Decline / Ignore (ignore stays pending).</div>
          </div>
          <Button onClick={loadInbox} disabled={inboxLoading}>
            {inboxLoading ? "Loading..." : "Load inbox"}
          </Button>
        </div>

        {inboxErr && <div style={{ marginTop: 10, color: "#991b1b", fontWeight: 900 }}>{inboxErr}</div>}

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {inboxItems.length === 0 && !inboxLoading && <div style={{ color: "#64748b" }}>No inbox items.</div>}

          {inboxItems.map((it) => (
            <SoftCard key={`${it.loan_id}-${it.id}`}>
              <div style={{ fontWeight: 1000 }}>Loan #{it.loan_id}</div>
              <div style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}>
                Borrower: {it.borrower_email ? maskedEmail(it.borrower_email) : `User #${it.borrower_user_id ?? "—"}`}
              </div>
              <div style={{ marginTop: 6, color: "#334155", fontSize: 12 }}>
                Amount: <b>{safeStr(it.amount || "—")}</b> {safeStr(it.currency || "")} · Pledge: <b>{safeStr(it.pledge_amount || "—")}</b> · Status:{" "}
                <b>{safeStr(it.status)}</b>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <ButtonPrimary onClick={() => decideInbox(it, "approved")}>Approve</ButtonPrimary>
                <Button onClick={() => decideInbox(it, "declined")}>Decline</Button>
                <Button onClick={() => alert("Ignore = do nothing (stays pending).")}>Ignore</Button>
              </div>
            </SoftCard>
          ))}
        </div>
      </Card>

      {/* My guarantees */}
      <Card style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 1000 }}>My Guarantees</div>
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>What I’m backing (exposure transparency).</div>
          </div>
          <Button onClick={loadMyGuarantees} disabled={myGLoading}>
            {myGLoading ? "Loading..." : "Load my guarantees"}
          </Button>
        </div>

        {myGErr && <div style={{ marginTop: 10, color: "#991b1b", fontWeight: 900 }}>{myGErr}</div>}

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {myGuarantees.length === 0 && !myGLoading && <div style={{ color: "#64748b" }}>No guarantees yet.</div>}
          {myGuarantees.map((g) => (
            <SoftCard key={`${g.loan_id}-${g.id}`}>
              <div style={{ fontWeight: 1000 }}>Loan #{g.loan_id}</div>
              <div style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}>
                Borrower: {g.borrower_email ? maskedEmail(g.borrower_email) : `User #${g.borrower_user_id ?? "—"}`}
              </div>
              <div style={{ marginTop: 6, color: "#334155", fontSize: 12 }}>
                Pledge: <b>{safeStr(g.pledge_amount || "—")}</b> · Status: <b>{safeStr(g.status || "—")}</b>
              </div>
              <div style={{ marginTop: 10 }}>
                <Button onClick={() => selectLoan(g.loan_id)}>View loan</Button>
              </div>
            </SoftCard>
          ))}
        </div>
      </Card>

      {/* Loans list + details */}
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card>
          <div style={{ fontSize: 16, fontWeight: 1000 }}>My Loans</div>
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {loans.map((l) => (
              <SoftCard key={l.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontWeight: 1000 }}>
                    Loan #{l.id} · {l.amount} {l.currency}
                  </div>
                  <Pill kind={safeStr(l.status).toLowerCase().includes("approved") ? "green" : "gray"}>{safeStr(l.status)}</Pill>
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <ButtonPrimary onClick={() => selectLoan(l.id)}>Select</ButtonPrimary>
                </div>
              </SoftCard>
            ))}
            {loans.length === 0 && <div style={{ color: "#64748b" }}>No loans yet.</div>}
          </div>
        </Card>

        <Card>
  <div style={{ fontSize: 16, fontWeight: 1000 }}>Selected loan</div>

  {!selectedLoan && (
    <div style={{ marginTop: 10, color: "#64748b" }}>
      Select a loan to view guarantors and pool-gap analytics.
    </div>
  )}

  {selectedLoan && (
    <>
      <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <Pill kind="blue">Loan #{selectedLoan.id}</Pill>
        <Pill kind="gray">Gap: {fmtMoney((selectedLoan as any)?.guarantee_gap ?? "0")}</Pill>
        <Pill kind="green">
          Coverage:{" "}
          {(() => {
            const gap = Number(String((selectedLoan as any)?.guarantee_gap ?? "0"));
            const locked = (guarantors || []).reduce((acc: number, g: any) => acc + Number(g?.locked_amount ?? 0), 0);
            if (!Number.isFinite(gap) || gap <= 0) return "Within pool";
            const pct = Math.min(100, Math.round((locked / gap) * 100));
            return `${pct}%`;
          })()}
        </Pill>
      </div>

      {/* Pool-gap analytics (B2) */}
      <div
        style={{
          marginTop: 10,
          padding: 12,
          borderRadius: 14,
          border: "1px solid rgba(11,31,51,0.10)",
          background: "rgba(255,255,255,0.92)",
        }}
      {/* ===== GMFN BLOCK START: LOANS_B2_GRID_V3 ===== */}
<div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    fontSize: 12,
  }}
>
  <div>
    <div style={{ color: "#64748b" }}>Personal pool at request</div>
    <div style={{ fontWeight: 900 }}>
      {fmtMoney((selectedLoan as any)?.personal_pool_at_request ?? "0")}
    </div>
  </div>

  <div>
    <div style={{ color: "#64748b" }}>Effective pool now</div>
    <div style={{ fontWeight: 900 }}>
      {fmtMoney(pool?.effective_available ?? "0")}
    </div>
  </div>

  <div>
    <div style={{ color: "#64748b" }}>Pool used</div>
    <div style={{ fontWeight: 900 }}>
      {fmtMoney((selectedLoan as any)?.pool_used ?? "0")}
    </div>
  </div>

  <div>
    <div style={{ color: "#64748b" }}>Exposure ratio</div>
    <div style={{ fontWeight: 900 }}>
      {(() => {
        const used = Number((selectedLoan as any)?.pool_used ?? 0);
        const eff = Number(pool?.effective_available ?? 0);
        const base = used + eff; // total “usable + already used”
        if (!base || !Number.isFinite(base)) return "0%";
        return `${Math.round((used / base) * 100)}%`;
      })()}
    </div>
  </div>

  <div>
    <div style={{ color: "#64748b" }}>Guarantee gap</div>
    <div style={{ fontWeight: 900 }}>
      {fmtMoney((selectedLoan as any)?.guarantee_gap ?? "0")}
    </div>
  </div>

  <div>
    <div style={{ color: "#64748b" }}>Guarantors required</div>
    <div style={{ fontWeight: 900 }}>
      {String((selectedLoan as any)?.guarantors_required ?? "0")}
    </div>
  </div>

  <div>
    <div style={{ color: "#64748b" }}>Pledged total</div>
    <div style={{ fontWeight: 900 }}>
      {(guarantors || [])
        .reduce((acc: number, g: any) => acc + Number(g?.pledge_amount ?? 0), 0)
        .toFixed(2)}
    </div>
  </div>

  <div>
    <div style={{ color: "#64748b" }}>Locked total</div>
    <div style={{ fontWeight: 900 }}>
      {(guarantors || [])
        .reduce((acc: number, g: any) => acc + Number(g?.locked_amount ?? 0), 0)
        .toFixed(2)}
    </div>
  </div>
</div>
{/* ===== GMFN BLOCK END: LOANS_B2_GRID_V3 ===== */}



{/* ================================
    GMFN BLOCK END: LOANS_B2_GRID_V2
   ================================ */} 


        <div style={{ marginTop: 8, color: "#64748b", fontSize: 12 }}>
          Note: Pool reduces guarantor gap (B2). GMFN does not auto-move money (non-custodial pilot).
        </div>
      </div>

      {/* Share this request */}
      <div style={{ marginTop: 12 }}>
        <ShareActions
          title={`GMFN support request (Loan #${selectedLoan.id})`}
          text={shareLoanText}
          url={shareLoanUrl}
          copyLabel="Copy request link"
          whatsappLabel="WhatsApp request"
          qrLabel="QR"
        />
      </div>

      {/* Guarantors list */}
      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {(guarantors || []).map((g: any) => (
          <SoftCard key={String(g.id)}>
            <div style={{ fontWeight: 1000 }}>Guarantor #{g.guarantor_user_id}</div>
            <div style={{ marginTop: 6, color: "#334155", fontSize: 12 }}>
              Pledge: <b>{String(g.pledge_amount ?? "—")}</b> · Status: <b>{String(g.status ?? "—")}</b>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <ButtonPrimary onClick={() => decideGuarantor(g.id, "approved")}>Approve</ButtonPrimary>
              <Button onClick={() => decideGuarantor(g.id, "declined")}>Decline</Button>
            </div>
          </SoftCard>
        ))}

        {(guarantors || []).length === 0 && <div style={{ color: "#64748b" }}>No guarantors yet.</div>}
      </div>
    </>
  )}
</Card>
      </div>
    </div>
  );
}