import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

type VerifyOut = {
  verified: boolean;
  user_id: number;
  level: string;
  level_label: string;
  disclaimer: string;
  not_a_bank_guarantee?: boolean;
  no_auto_debit?: boolean;
  last_full_repayment_at?: string | null;
  trust_slip_limit?: string | null;
};

async function parseError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text);
    return j?.detail || j?.message || text || `HTTP ${res.status}`;
  } catch {
    return text || `HTTP ${res.status}`;
  }
}

function normalizeToken(input: string): string {
  const t = (input || "").trim();

  // If user pasted full URL, pull the token after "/trust-slips/verify/"
  const idx = t.indexOf("/trust-slips/verify/");
  if (idx >= 0) return t.slice(idx + "/trust-slips/verify/".length).trim();

  // If user pasted "/trust-slips/verify/<token>"
  if (t.startsWith("/trust-slips/verify/")) return t.replace("/trust-slips/verify/", "").trim();

  // If token starts with leading slash due to copy issues
  return t.replace(/^\//, "");
}

/**
 * Merchant Verification Pack ID (deterministic):
 * MV- + short hash of token.
 * This is NOT the Evidence Pack ID; it's a merchant-quoteable verification code.
 */
async function makeMerchantPackId(token: string): Promise<string> {
  const clean = normalizeToken(token);
  const data = new TextEncoder().encode(clean);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `MV-${hex.slice(0, 10).toUpperCase()}`;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

export default function TrustSlipVerifyPage() {
  const params = useParams<{ code?: string }>();
  const rawCode = params.code || "";

  const [token, setToken] = useState<string>(rawCode);
  const [packId, setPackId] = useState<string>("");
  const [data, setData] = useState<VerifyOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const cleanToken = useMemo(() => normalizeToken(token), [token]);

  async function load() {
    setErr(null);
    setMsg(null);
    setLoading(true);
    setData(null);

    try {
      if (!cleanToken) throw new Error("Missing verification token.");

      // Generate merchant quoteable Pack ID
      const pid = await makeMerchantPackId(cleanToken);
      setPackId(pid);

      const res = await fetch(`/trust-slips/verify/${encodeURIComponent(cleanToken)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) throw new Error(await parseError(res));
      const j = (await res.json()) as VerifyOut;
      setData(j);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanToken]);

  const card: React.CSSProperties = {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 14,
    background: "rgba(255,255,255,0.9)",
    boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
  };

  const btn: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "white",
    fontWeight: 900,
    cursor: "pointer",
  };

  const small: React.CSSProperties = { fontSize: 12, color: "#64748b" };

  return (
    <div style={{ minHeight: "100vh", padding: 18, background: "linear-gradient(180deg, #e0f2fe 0%, #fff7ed 45%, #f0fdf4 100%)" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Merchant verification</h2>
          <span style={{ color: "#64748b" }}>Simple proof of community-backed integrity (pilot).</span>
        </div>

        <div style={{ marginTop: 12, ...card }}>
          <div style={{ fontWeight: 1000, fontSize: 14 }}>Verification Pack ID</div>
          <div style={{ marginTop: 6, fontFamily: "monospace", fontSize: 16 }}>{packId || "—"}</div>
          <div style={small}>
            Ask the customer to quote this ID if you need to confirm the exact verification link used.
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              style={btn}
              onClick={async () => {
                if (!packId) return;
                await copyToClipboard(packId);
                setMsg("Verification Pack ID copied ✅");
                window.setTimeout(() => setMsg(null), 1500);
              }}
            >
              Copy Pack ID
            </button>

            <button
              style={btn}
              onClick={async () => {
                if (!cleanToken) return;
                await copyToClipboard(cleanToken);
                setMsg("Token copied ✅");
                window.setTimeout(() => setMsg(null), 1500);
              }}
            >
              Copy token
            </button>

            <button style={btn} onClick={load}>
              Refresh
            </button>
          </div>
        </div>

        {err && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 14, border: "1px solid #fecaca", background: "#fee2e2", whiteSpace: "pre-wrap" }}>
            {err}
          </div>
        )}

        {msg && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 14, border: "1px solid #a7f3d0", background: "#ecfdf5" }}>
            {msg}
          </div>
        )}

        <div style={{ marginTop: 12, ...card }}>
          <div style={{ fontWeight: 1000 }}>Result</div>

          {loading && <div style={{ marginTop: 10, color: "#64748b" }}>Checking…</div>}

          {!loading && data && (
            <>
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div>
                  <b>Status:</b>{" "}
                  {data.verified ? <span style={{ color: "#166534", fontWeight: 900 }}>Verified ✅</span> : <span style={{ color: "#991b1b", fontWeight: 900 }}>Not verified</span>}
                </div>

                <div><b>Level:</b> {data.level_label || data.level || "—"}</div>
                <div><b>TrustSlip limit:</b> {data.trust_slip_limit ?? "—"}</div>
                <div><b>Last full repayment:</b> {data.last_full_repayment_at ?? "—"}</div>

                <div style={{ marginTop: 8, padding: 12, borderRadius: 12, border: "1px solid #e5e7eb", background: "rgba(255,255,255,0.95)" }}>
                  <div style={{ fontWeight: 1000 }}>Important</div>
                  <ul style={{ marginTop: 8, marginBottom: 0 }}>
                    <li>This is <b>not</b> a bank guarantee.</li>
                    <li>No auto-debit. No forced collection in MVP.</li>
                    <li>Verification is evidence-backed, not cash-backed.</li>
                  </ul>
                </div>

                <div style={{ marginTop: 10, fontSize: 12, color: "#64748b", whiteSpace: "pre-wrap" }}>
                  {data.disclaimer || "Community-backed integrity limit. Not a bank guarantee. No auto-debit."}
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ marginTop: 12, ...card }}>
          <div style={{ fontWeight: 1000 }}>Paste a link / token</div>
          <div style={small}>If you received a link on WhatsApp/SMS, paste it here.</div>

          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste /trust-slips/verify/<token> or full URL"
            style={{ marginTop: 10, width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
          />

          <div style={{ marginTop: 10 }}>
            <button style={btn} onClick={load}>Verify</button>
          </div>
        </div>
      </div>
    </div>
  );
}