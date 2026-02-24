import React, { useEffect, useState } from "react";
import {
  getMe,
  getMyTrustSlip,
  getTrustEvents,
  getCciScore,
  listMyClans,
  listMyLoans,
} from "../lib/api";

type ProbeStatus = "ok" | "fail";

type ProbeResult = {
  name: string;
  status: ProbeStatus;
  message: string;
};

async function probe(name: string, fn: () => Promise<any>): Promise<ProbeResult> {
  try {
    const res = await fn();
    return {
      name,
      status: "ok",
      message: typeof res === "object" ? "OK" : String(res ?? "OK"),
    };
  } catch (e: any) {
    return {
      name,
      status: "fail",
      message: e?.message ?? "Error",
    };
  }
}

export default function PilotShowcasePage() {
  const [results, setResults] = useState<ProbeResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);

    const checks: ProbeResult[] = await Promise.all([
      probe("Auth / Me", () => getMe()),
      probe("TrustSlip", () => getMyTrustSlip()),
      probe("Trust Events", () => getTrustEvents(10)),
      probe("CCI Score", () => getCciScore(1, 1)),
      probe("Clans", () => listMyClans()),
      probe("Loans", () => listMyLoans()),
    ]);

    setResults(checks);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>🧪 GMFN Pilot Showcase</h2>

      <p>This screen probes all major MVP endpoints and shows live status.</p>

      <button onClick={load} disabled={loading}>
        {loading ? "Checking..." : "Re-check"}
      </button>

      <div style={{ marginTop: 24 }}>
        {results.map((r) => (
          <div
            key={r.name}
            style={{
              padding: 14,
              marginBottom: 10,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background:
                r.status === "ok"
                  ? "rgba(16,185,129,0.08)"
                  : "rgba(239,68,68,0.08)",
            }}
          >
            <div style={{ fontWeight: 900 }}>
              {r.status === "ok" ? "✅" : "❌"} {r.name}
            </div>
            <div style={{ fontSize: 13, marginTop: 4 }}>{r.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}