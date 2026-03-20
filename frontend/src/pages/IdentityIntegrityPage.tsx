import React, { useEffect, useState } from "react";
import { getMyIdentityRisk } from "../lib/api";

function card(): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

export default function IdentityIntegrityPage() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await getMyIdentityRisk();
        setData(res || null);
      } catch (e: any) {
        setErr(String(e?.message || e || "Unable to load identity integrity."));
      }
    })();
  }, []);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 34, fontWeight: 1000, color: "#0B1F33" }}>
          Identity Integrity
        </div>
        <div style={{ marginTop: 8, color: "#6B7A88" }}>
          Device and identity observations linked to your GMFN account.
        </div>

        {err ? (
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
        ) : null}

        <pre style={{ marginTop: 16, whiteSpace: "pre-wrap", fontSize: 13 }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}