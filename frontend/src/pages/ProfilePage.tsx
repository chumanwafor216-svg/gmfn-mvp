import React, { useEffect, useState } from "react";
import { getMe } from "../lib/api";

function card(): React.CSSProperties {
  return {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 14,
    background: "rgba(255,255,255,0.92)",
    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
  };
}

function btn(): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "rgba(255,255,255,0.95)",
    cursor: "pointer",
    fontWeight: 900,
  };
}

export default function ProfilePage() {
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string>("");

  // Local-only placeholders (until backend stores them)
  const [displayName, setDisplayName] = useState<string>(localStorage.getItem("gmfn_profile_name") || "");
  const [phone, setPhone] = useState<string>(localStorage.getItem("gmfn_profile_phone") || "");
  const [country, setCountry] = useState<string>(localStorage.getItem("gmfn_profile_country") || "");

  async function load() {
    setLoading(true);
    try {
      const m = await getMe();
      setMe(m);
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function saveLocal() {
    localStorage.setItem("gmfn_profile_name", displayName.trim());
    localStorage.setItem("gmfn_profile_phone", phone.trim());
    localStorage.setItem("gmfn_profile_country", country.trim());
    setNote("Saved locally ✅ (backend profile storage is a future upgrade)");
    setTimeout(() => setNote(""), 2200);
  }

  return (
    <div style={{ padding: 18, maxWidth: 900 }}>
      <div style={{ fontSize: 24, fontWeight: 1000 }}>My Profile</div>
      <div style={{ color: "#64748b", fontSize: 12 }}>Human identity for trust (low-end friendly).</div>

      <div style={{ marginTop: 12, ...card() }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              border: "1px dashed #cbd5e1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 1000,
              color: "#64748b",
              background: "rgba(255,255,255,0.85)",
            }}
            title="Avatar placeholder (future upload)"
          >
            🙂
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Signed in</div>
            <div style={{ fontWeight: 1000 }}>{me?.email ?? "—"}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
              Role: <b>{me?.role ?? "—"}</b>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "160px 1fr", gap: 10 }}>
          <div style={{ color: "#64748b", fontSize: 12 }}>Display name</div>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g., Chuma"
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
          />

          <div style={{ color: "#64748b", fontSize: 12 }}>Phone</div>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g., +44..."
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
          />

          <div style={{ color: "#64748b", fontSize: 12 }}>Country</div>
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g., UK / Nigeria"
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
          />
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={btn()} onClick={saveLocal}>Save</button>
          <button style={btn()} onClick={load} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button>
        </div>

        {note && <div style={{ marginTop: 10, color: "#166534", fontWeight: 900 }}>{note}</div>}

        <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
          Later upgrade: store profile fields in backend for cross-device portability.
        </div>
      </div>
    </div>
  );
}