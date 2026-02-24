// src/pages/ClansPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  listMyClans,
  createClan,
  selectClan,
  getCurrentClan,
  getSelectedClanId,
  setSelectedClanId,
} from "../lib/api";

function card(): React.CSSProperties {
  return {
    border: "1px solid rgba(11,31,51,0.10)",
    borderRadius: 18,
    padding: 14,
    background: "rgba(255,255,255,0.94)",
    boxShadow: "0 18px 60px rgba(2,6,23,0.06)",
  };
}

function btn(primary?: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 14,
    border: primary ? "1px solid rgba(11,31,51,0.75)" : "1px solid rgba(11,31,51,0.12)",
    background: primary ? "#0B1F33" : "#fff",
    color: primary ? "#fff" : "#0B1F33",
    fontWeight: 1000,
    cursor: "pointer",
  };
}

function pill(kind: "blue" | "gray" | "gold"): React.CSSProperties {
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
  if (kind === "blue") return { ...base, color: "#1e40af", background: "#eff6ff", borderColor: "#bfdbfe" };
  if (kind === "gold") return { ...base, color: "#92400e", background: "#fffbeb", borderColor: "#fde68a" };
  return { ...base, color: "#334155", background: "#f9fafb", borderColor: "#e5e7eb" };
}

function safeStr(x: any): string {
  return (x ?? "").toString();
}

function parseItems(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.clans)) return raw.clans;
  return [];
}

function prettyErr(e: any): string {
  const msg = String(e?.message || e || "").trim();
  if (!msg) return "Unknown error";
  try {
    const j = JSON.parse(msg);
    if (typeof j?.detail === "string") return j.detail;
    if (Array.isArray(j?.detail)) return JSON.stringify(j.detail, null, 2);
    return JSON.stringify(j, null, 2);
  } catch {
    return msg;
  }
}

export default function ClansPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [name, setName] = useState("My Clan");
  const [clans, setClans] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(getSelectedClanId());

  const selectedLabel = useMemo(() => (selectedId ? `#${selectedId}` : "—"), [selectedId]);
  const nav = useNavigate();
  async function loadAll() {
    setLoading(true);
    setErr(null);
    setOkMsg(null);
    try {
      const raw = await listMyClans();
      setClans(parseItems(raw));

      try {
        const cur = await getCurrentClan();
        const cid = Number(cur?.id ?? cur?.clan_id ?? cur?.clanId ?? 0);
        if (Number.isFinite(cid) && cid > 0) {
          setSelectedId(cid);
          setSelectedClanId(cid);
        }
      } catch {
        // ignore
      }
    } catch (e: any) {
      setErr(prettyErr(e));
      setClans([]);
    } finally {
      setLoading(false);
    }
  }

  async function onCreate() {
    setErr(null);
    setOkMsg(null);
    try {
      const nm = name.trim();
      if (!nm) throw new Error("Enter a clan name.");
      const created = await createClan({ name: nm });
      setOkMsg(`Clan created: ${safeStr(created?.name || nm)}`);
      await loadAll();
    } catch (e: any) {
      setErr(prettyErr(e));
    }
  }

  async function onSelect(clanId: number) {
  setErr(null);
  setOkMsg(null);
  try {
    await selectClan(clanId);
    setSelectedId(clanId);
    setSelectedClanId(clanId);
    setOkMsg(`Selected clan #${clanId}. Redirecting…`);

    // Seamless next step: take user to dashboard to see pool/trust context immediately
    window.setTimeout(() => nav("/dashboard"), 250);
  } catch (e: any) {
    setErr(prettyErr(e));
  }
}

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 18, maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 1000, color: "#0B1F33" }}>Clans</div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#6B7A88" }}>
            Create and select your active clan. Pool + trust actions use the selected clan.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={pill("gold")}>Active: {selectedLabel}</span>
          <button onClick={loadAll} style={btn()} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {err && (
        <div
          style={{
            ...card(),
            marginTop: 12,
            borderColor: "rgba(153,27,27,0.25)",
            background: "rgba(254,242,242,0.9)",
            color: "#991b1b",
          }}
        >
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>
            {err}
          </pre>
        </div>
      )}

      {okMsg && (
        <div
          style={{
            ...card(),
            marginTop: 12,
            borderColor: "rgba(6,95,70,0.18)",
            background: "rgba(236,253,245,0.95)",
            color: "#065f46",
            fontWeight: 900,
          }}
        >
          {okMsg}
        </div>
      )}

      {/* Create clan */}
      <div style={{ ...card(), marginTop: 12 }}>
        <div style={{ fontWeight: 1000, color: "#0B1F33" }}>Create Clan</div>
        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ flex: 1, minWidth: 240, padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(11,31,51,0.18)" }}
            placeholder="Clan name"
          />
          <button onClick={onCreate} style={btn(true)} disabled={loading}>
            Create
          </button>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "#6B7A88" }}>
          After creating, select the clan so the pool ledger and trust endpoints work seamlessly.
        </div>
      </div>

      {/* My clans */}
      <div style={{ ...card(), marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 1000, color: "#0B1F33" }}>My Clans</div>
          <span style={pill(clans.length ? "blue" : "gray")}>{clans.length} clan(s)</span>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {clans.length === 0 && <div style={{ fontSize: 12, color: "#6B7A88" }}>No clans yet.</div>}

          {clans.map((c) => {
            const cid = Number(c?.id ?? c?.clan_id ?? c?.clanId ?? 0);
            const isSelected = selectedId != null && cid === selectedId;

            return (
              <div key={String(cid)} style={{ border: "1px solid rgba(11,31,51,0.10)", borderRadius: 16, padding: 12, background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 1000, color: "#0B1F33" }}>{safeStr(c?.name || "Clan")}</div>
                    <div style={{ marginTop: 2, fontSize: 12, color: "#6B7A88" }}>#{cid}</div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <button onClick={() => onSelect(cid)} style={btn()} disabled={!Number.isFinite(cid) || cid <= 0}>
                      Select
                    </button>
                    {isSelected && <span style={pill("blue")}>Selected</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "#6B7A88" }}>
        Tip: If you refresh a route like <b>/clans</b> and get 404, that is a dev-server SPA fallback issue (fixed in Vite config). It is not a backend error.
      </div>
    </div>
  );
}