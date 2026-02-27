// src/pages/BankConsolePage.tsx
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { getAccessToken } from "../lib/api";

type BankEventRow = {
  id: number;
  direction: string;
  amount: string;
  currency: string;
  reference?: string | null;
  status: string;
  status_reason?: string | null;
  expected_payment_id?: number | null;
  canonical?: boolean;
};

type BankCreditRow = {
  id: number;
  clan_id: number;
  user_id: number;
  currency: string;
  amount: string;
  source_bank_event_id: number;
  created_at?: string | null;
};

type ExpectedPaymentRow = {
  id: number;
  clan_id: number;
  user_id: number;
  expected_type: string;
  amount: string;
  currency: string;
  paid_amount?: string;
  remaining_amount?: string;
  status: string;
  status_reason?: string | null;
  reference_display: string;
  reference_normalized: string;
  bank_event_id?: number | null;
  created_at?: string;
};

type TabKey = "recent" | "unmatched" | "credits" | "expected";

function apiBase(): string {
  // Keep consistent with your existing setup (same as other pages).
  // If you already have a central BASE_URL in lib/api, swap to that.
  return (import.meta as any).env?.VITE_API_BASE_URL || "";
}

async function parseError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text);
    return j?.detail || text || `HTTP ${res.status}`;
  } catch {
    return text || `HTTP ${res.status}`;
  }
}

async function authedGet(path: string): Promise<any> {
  const token = getAccessToken();
  const res = await fetch(`${apiBase()}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(await parseError(res));
  return await res.json();
}

async function authedPost(path: string, body?: any): Promise<any> {
  const token = getAccessToken();
  const res = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : "{}",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return await res.json();
}

export default function BankConsolePage() {
  const [tab, setTab] = useState<TabKey>("recent");

  const [clanId, setClanId] = useState<string>(() => localStorage.getItem("bank_console_clan_id") || "");
  const clanIdNum = useMemo(() => {
    const n = Number(clanId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [clanId]);

  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<BankEventRow[]>([]);
  const [unmatched, setUnmatched] = useState<BankEventRow[]>([]);
  const [credits, setCredits] = useState<BankCreditRow[]>([]);
  const [expected, setExpected] = useState<ExpectedPaymentRow[]>([]);

  const [reconcileLimit, setReconcileLimit] = useState<string>("200");

  useEffect(() => {
    localStorage.setItem("bank_console_clan_id", clanId);
  }, [clanId]);

  async function loadActiveTab() {
    if (!clanIdNum) {
      toast.error("Enter a valid clan_id");
      return;
    }
    setLoading(true);
    try {
      if (tab === "recent") {
        const rows = await authedGet(`/bank/recent?clan_id=${clanIdNum}`);
        setRecent(Array.isArray(rows) ? rows : []);
      } else if (tab === "unmatched") {
        const rows = await authedGet(`/bank/unmatched?clan_id=${clanIdNum}`);
        setUnmatched(Array.isArray(rows) ? rows : []);
      } else if (tab === "credits") {
        const rows = await authedGet(`/bank/credits?clan_id=${clanIdNum}`);
        setCredits(Array.isArray(rows) ? rows : []);
      } else if (tab === "expected") {
        // if your endpoint is /bank/expected, use it. If it’s /bank/expected?clan_id=..., this matches.
        const rows = await authedGet(`/bank/expected?clan_id=${clanIdNum}`);
        setExpected(Array.isArray(rows) ? rows : []);
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function runReconcile() {
    if (!clanIdNum) {
      toast.error("Enter a valid clan_id");
      return;
    }
    const lim = Number(reconcileLimit);
    const limit = Number.isFinite(lim) && lim > 0 ? lim : 200;

    setLoading(true);
    try {
      const res = await authedPost(`/bank/reconcile?clan_id=${clanIdNum}&limit=${limit}`);
      toast.success(`Reconcile ran. Seen=${res?.seen ?? "?"} confirmed=${res?.confirmed ?? "?"} partial=${res?.partial ?? "?"}`);
      await loadActiveTab();
    } catch (e: any) {
      toast.error(e?.message || "Reconcile failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // auto-load when tab changes, but only if clan_id valid
    if (clanIdNum) loadActiveTab();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>Bank Console</h2>
        <div style={{ color: "#64748b" }}>
          Read-only monitoring + deterministic reconcile runner.
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: "#64748b" }}>clan_id</span>
          <input
            value={clanId}
            onChange={(e) => setClanId(e.target.value)}
            placeholder="e.g. 1"
            style={{ padding: 8, border: "1px solid #e2e8f0", borderRadius: 8, width: 140 }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: "#64748b" }}>reconcile limit</span>
          <input
            value={reconcileLimit}
            onChange={(e) => setReconcileLimit(e.target.value)}
            placeholder="200"
            style={{ padding: 8, border: "1px solid #e2e8f0", borderRadius: 8, width: 140 }}
          />
        </label>

        <button
          onClick={runReconcile}
          disabled={loading}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #0f172a",
            background: "#0f172a",
            color: "white",
            fontWeight: 700,
          }}
        >
          Run reconcile
        </button>

        <button
          onClick={loadActiveTab}
          disabled={loading}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            background: "white",
            color: "#0f172a",
            fontWeight: 700,
          }}
        >
          Refresh
        </button>

        {loading ? <span style={{ color: "#64748b" }}>Loading…</span> : null}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(["recent", "unmatched", "credits", "expected"] as TabKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              padding: "8px 10px",
              borderRadius: 999,
              border: "1px solid #cbd5e1",
              background: tab === k ? "#e2e8f0" : "white",
              fontWeight: 700,
            }}
          >
            {k.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        {tab === "recent" && <EventsTable rows={recent} />}
        {tab === "unmatched" && <EventsTable rows={unmatched} />}
        {tab === "credits" && <CreditsTable rows={credits} />}
        {tab === "expected" && <ExpectedTable rows={expected} />}
      </div>
    </div>
  );
}

function EventsTable({ rows }: { rows: BankEventRow[] }) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 12 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f8fafc", textAlign: "left" }}>
            <th style={th}>id</th>
            <th style={th}>dir</th>
            <th style={th}>amount</th>
            <th style={th}>ccy</th>
            <th style={th}>reference</th>
            <th style={th}>status</th>
            <th style={th}>reason</th>
            <th style={th}>expected</th>
            <th style={th}>canonical</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderTop: "1px solid #e2e8f0" }}>
              <td style={td}>{r.id}</td>
              <td style={td}>{r.direction}</td>
              <td style={td}>{r.amount}</td>
              <td style={td}>{r.currency}</td>
              <td style={td}>{r.reference ?? ""}</td>
              <td style={td}>{r.status}</td>
              <td style={td}>{r.status_reason ?? ""}</td>
              <td style={td}>{r.expected_payment_id ?? ""}</td>
              <td style={td}>{String(!!r.canonical)}</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td style={td} colSpan={9}>
                No rows
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function CreditsTable({ rows }: { rows: BankCreditRow[] }) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 12 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f8fafc", textAlign: "left" }}>
            <th style={th}>id</th>
            <th style={th}>user_id</th>
            <th style={th}>ccy</th>
            <th style={th}>amount</th>
            <th style={th}>source_be</th>
            <th style={th}>created_at</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderTop: "1px solid #e2e8f0" }}>
              <td style={td}>{r.id}</td>
              <td style={td}>{r.user_id}</td>
              <td style={td}>{r.currency}</td>
              <td style={td}>{r.amount}</td>
              <td style={td}>{r.source_bank_event_id}</td>
              <td style={td}>{r.created_at ?? ""}</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td style={td} colSpan={6}>
                No rows
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function ExpectedTable({ rows }: { rows: ExpectedPaymentRow[] }) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 12 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f8fafc", textAlign: "left" }}>
            <th style={th}>id</th>
            <th style={th}>user</th>
            <th style={th}>type</th>
            <th style={th}>amount</th>
            <th style={th}>paid</th>
            <th style={th}>remaining</th>
            <th style={th}>ccy</th>
            <th style={th}>ref</th>
            <th style={th}>status</th>
            <th style={th}>reason</th>
            <th style={th}>bank_event</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderTop: "1px solid #e2e8f0" }}>
              <td style={td}>{r.id}</td>
              <td style={td}>{r.user_id}</td>
              <td style={td}>{r.expected_type}</td>
              <td style={td}>{r.amount}</td>
              <td style={td}>{r.paid_amount ?? ""}</td>
              <td style={td}>{r.remaining_amount ?? ""}</td>
              <td style={td}>{r.currency}</td>
              <td style={td}>{r.reference_normalized}</td>
              <td style={td}>{r.status}</td>
              <td style={td}>{r.status_reason ?? ""}</td>
              <td style={td}>{r.bank_event_id ?? ""}</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td style={td} colSpan={11}>
                No rows
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "10px 10px",
  fontSize: 12,
  color: "#334155",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "10px 10px",
  fontSize: 13,
  whiteSpace: "nowrap",
};
