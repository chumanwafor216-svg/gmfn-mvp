import React, { useEffect, useState } from "react";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import { CardActionRow, PrimaryButton, SecondaryButton } from "../components/StableButton";
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

function profileIconText(
  name: GsnIconName,
  label: React.ReactNode,
  size = 24
) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <GsnLegacyIcon name={name} size={size} />
      <span>{label}</span>
    </span>
  );
}

export default function ProfilePage() {
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string>("");

  // Local browser fields until backend profile storage is available.
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
    setNote("Saved on this device. Backend profile storage is a future upgrade.");
    setTimeout(() => setNote(""), 2200);
  }

  return (
    <div style={{ padding: 18, maxWidth: 900 }}>
      <div style={{ fontSize: 24, fontWeight: 1000 }}>
        {profileIconText("id", "My Profile", 28)}
      </div>
      <div style={{ color: "#64748b", fontSize: 12 }}>
        {profileIconText("shield", "Human identity for trust (low-end friendly).", 20)}
      </div>

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
            title="Profile mark"
          >
            <GsnLegacyIcon name="id" size={44} />
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              {profileIconText("check", "Signed in", 20)}
            </div>
            <div style={{ fontWeight: 1000 }}>{me?.email ?? "Not available"}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
              {profileIconText("user", <>Role: <b>{me?.role ?? "Not available"}</b></>, 20)}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "160px 1fr", gap: 10 }}>
          <div style={{ color: "#64748b", fontSize: 12 }}>
            {profileIconText("user", "Display name", 20)}
          </div>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g., Chuma"
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
          />

          <div style={{ color: "#64748b", fontSize: 12 }}>
            {profileIconText("phone", "Phone", 20)}
          </div>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g., +44..."
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
          />

          <div style={{ color: "#64748b", fontSize: 12 }}>
            {profileIconText("globe", "Country", 20)}
          </div>
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g., UK / Nigeria"
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
          />
        </div>

        <CardActionRow style={{ marginTop: 12 }}>
          <PrimaryButton
            type="button"
            onClick={saveLocal}
            debugId="profile.save-local"
          >
            {profileIconText("check", "Save")}
          </PrimaryButton>
          <SecondaryButton
            type="button"
            onClick={() => void load()}
            disabled={loading}
            busy={loading}
            busyLabel="Refreshing..."
            debugId="profile.refresh"
          >
            {profileIconText("refresh", "Refresh")}
          </SecondaryButton>
        </CardActionRow>

        {note && (
          <div style={{ marginTop: 10, color: "#166534", fontWeight: 900 }}>
            {profileIconText("check", note, 22)}
          </div>
        )}

        <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
          {profileIconText(
            "records-folder",
            "Later upgrade: store profile fields in backend for cross-device portability.",
            20
          )}
        </div>
      </div>
    </div>
  );
}
