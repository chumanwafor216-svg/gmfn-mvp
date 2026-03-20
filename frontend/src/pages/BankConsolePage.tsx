import React, { useEffect, useState } from "react";
import PageTopNav from "../components/PageTopNav";
import {
  bankIngestEvent,
  getPublicConfig,
  getSelectedClanId,
  listBankCredits,
  listExpectedPayments,
  listRecentBankEvents,
  listUnmatchedBankEvents,
  runBankReconciliation,
} from "../lib/api";

function safeStr(x: any): string {
  return String(x ?? "");
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

function btn(primary = false): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 14,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.10)",
    background: primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 1000,
    cursor: "pointer",
    fontSize: 14,
  };
}

export default function BankConsolePage() {
  const [cfg, setCfg] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [unmatched, setUnmatched] = useState<any[]>([]);
  const [credits, setCredits] = useState<any[]>([]);
  const [expected, setExpected] = useState<any[]>([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [amount, setAmount] = useState("1000.00");
  const [currency, setCurrency] = useState("NGN");
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");

  async function loadAll() {
    setErr("");
    try {
      const clanId = getSelectedClanId();
      if (!clanId) {
        setRecent([]);
        setUnmatched([]);
        setCredits([]);
        setExpected([]);
        return;
      }

      const [cfgRes, recentRes, unmatchedRes, creditsRes, expectedRes] = await Promise.all([
        getPublicConfig().catch(() => null),
        listRecentBankEvents(clanId).catch(() => []),
        listUnmatchedBankEvents(clanId).catch(() => []),
        listBankCredits({ clan_id: clanId, currency }).catch(() => []),
        listExpectedPayments({ clan_id: clanId }).catch(() => ({ items: [] })),
      ]);

      setCfg(cfgRes || null);
      setRecent(Array.isArray(recentRes) ? recentRes : recentRes?.items || []);
      setUnmatched(Array.isArray(unmatchedRes) ? unmatchedRes : unmatchedRes?.items || []);
      setCredits(Array.isArray(creditsRes) ? creditsRes : creditsRes?.items || []);
      setExpected(Array.isArray(expectedRes) ? expectedRes : expectedRes?.items || []);
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to load bank console."));
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function ingestNow() {
    setErr("");
    setMsg("");

    try {
      const clanId = getSelectedClanId();
      if (!clanId) throw new Error("Select a community first.");

      const res = await bankIngestEvent({
        clan_id: clanId,
        amount,
        currency,
        direction,
        reference: reference || null,
        description: description || null,
      });

      setMsg(`Bank event ingested${res?.bank_event_id ? ` (#${res.bank_event_id})` : ""}.`);
      await loadAll();
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to ingest bank event."));
    }
  }

  async function reconcileNow() {
    setErr("");
    setMsg("");

    try {
      const clanId = getSelectedClanId();
      if (!clanId) throw new Error("Select a community first.");

      const res = await runBankReconciliation({ clan_id: clanId, limit: 200 });
      setMsg(`Reconciliation complete. Seen=${safeStr(res?.seen || 0)} Confirmed=${safeStr(res?.confirmed || 0)}.`);
      await loadAll();
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to run reconciliation."));
    }
  }

  function renderList(title: string, rows: any[]) {
    return (
      <div style={card()}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>{title}</div>
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {rows.length === 0 ? <div style={{ color: "#6B7A88" }}>No records.</div> : null}
          {rows.map((row: any, i: number) => (
            <div key={row?.id || i} style={{ borderRadius: 14, background: "#F8FAFC", border: "1px solid rgba(11,31,51,0.08)", padding: 14 }}>
              <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
                {row?.reference || row?.reference_raw || row?.bank_txn_id || `Item ${i + 1}`}
              </div>
              <div style={{ marginTop: 6, color: "#475569", lineHeight: 1.7 }}>
                Amount: {row?.amount ?? "—"} {row?.currency ?? ""}
              </div>
              <div style={{ marginTop: 4, color: "#64748b", fontSize: 13 }}>
                Status: {row?.status ?? "—"}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1260, margin: "0 auto" }}>
      <PageTopNav
        title="Bank Console"
        subtitle="Use this page to ingest bank events, run reconciliation, and review what has matched or remained unmatched."
      />

      {err ? (
        <div style={{ ...card(), marginTop: 18, background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", fontWeight: 900 }}>
          {err}
        </div>
      ) : null}

      {msg ? (
        <div style={{ ...card(), marginTop: 18, background: "#ECFDF5", border: "1px solid #A7F3D0", color: "#065F46", fontWeight: 900 }}>
          {msg}
        </div>
      ) : null}

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>What this page does</div>
        <div style={{ marginTop: 10, color: "#475569", lineHeight: 1.8 }}>
          This page helps operations staff detect incoming bank events, match them against expected references,
          and understand which items are confirmed and which still need review.
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>Manual Ingest</div>
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" style={{ padding: 12, borderRadius: 12, border: "1px solid #CBD5E1" }} />
          <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="Currency" style={{ padding: 12, borderRadius: 12, border: "1px solid #CBD5E1" }} />
          <select value={direction} onChange={(e) => setDirection(e.target.value as "credit" | "debit")} style={{ padding: 12, borderRadius: 12, border: "1px solid #CBD5E1" }}>
            <option value="credit">credit</option>
            <option value="debit">debit</option>
          </select>
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Reference" style={{ padding: 12, borderRadius: 12, border: "1px solid #CBD5E1" }} />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" style={{ padding: 12, borderRadius: 12, border: "1px solid #CBD5E1", gridColumn: "span 2" }} />
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={ingestNow} style={btn(true)}>Ingest Event</button>
          <button onClick={reconcileNow} style={btn(false)}>Run Reconciliation</button>
        </div>
      </div>

      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {renderList("Recent Events", recent)}
        {renderList("Unmatched Events", unmatched)}
        {renderList("Credits", credits)}
        {renderList("Expected Payments / Config", expected.length ? expected : cfg ? [cfg] : [])}
      </div>
    </div>
  );
}