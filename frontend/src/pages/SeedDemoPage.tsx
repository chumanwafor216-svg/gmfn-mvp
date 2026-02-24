// src/pages/SeedDemoPage.tsx
import React, { useState } from "react";
import { devBootstrapClan, selectClan } from "../lib/api";

function card(): React.CSSProperties {
  return {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 14,
    background: "rgba(255,255,255,0.92)",
    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
    maxWidth: 760,
  };
}

function btn(): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "rgba(255,255,255,0.95)",
    fontWeight: 900,
    cursor: "pointer",
  };
}

function btnPrimary(): React.CSSProperties {
  return { ...btn(), background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.35)" };
}

export default function SeedDemoPage() {
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    setOut(null);
    try {
      const res = await devBootstrapClan();
      setOut(res);

      const cid = res?.clan_id || res?.clan?.id || null;
      if (cid) {
        try {
          await selectClan(Number(cid));
        } catch {
          // ignore
        }
      }
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 18 }}>
      <div style={{ fontSize: 24, fontWeight: 1000 }}>Seed Demo Data</div>
      <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>Dev helper for local testing only.</div>

      <div style={{ marginTop: 12, ...card() }}>
        <button style={btnPrimary()} onClick={run} disabled={busy}>
          {busy ? "Seeding..." : "Seed demo clan + users"}
        </button>

        {err && (
          <div style={{ marginTop: 12, ...card(), borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" }}>
            {err}
          </div>
        )}

        {out && (
          <pre style={{ marginTop: 12, whiteSpace: "pre-wrap", fontSize: 12, color: "#111827" }}>
            {JSON.stringify(out, null, 2)}
          </pre>
        )}

        <div style={{ marginTop: 12, color: "#64748b", fontSize: 12 }}>
          If this endpoint doesn’t exist on backend yet, we’ll wire it later — but the export must exist so the app doesn’t blank out.
        </div>
      </div>
    </div>
  );
}