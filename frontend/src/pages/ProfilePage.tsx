import React, { useEffect, useState } from "react";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import { CardActionRow, PrimaryButton, SecondaryButton } from "../components/StableButton";
import { getMe, updateMyProfile } from "../lib/api";

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
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string>("");

  const [displayName, setDisplayName] = useState<string>(localStorage.getItem("gmfn_profile_name") || "");

  async function load() {
    setLoading(true);
    try {
      const m = await getMe();
      setMe(m);
      const accountName = String(m?.display_name || m?.nickname || "").trim();
      if (accountName) {
        setDisplayName(accountName);
        localStorage.setItem("gmfn_profile_name", accountName);
      }
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveProfile() {
    const cleanName = displayName.trim();
    if (cleanName.length < 2) {
      setNote("Enter the name or street name people know you by.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateMyProfile({ display_name: cleanName });
      setMe(updated);
      const savedName = String(updated?.display_name || cleanName).trim();
      setDisplayName(savedName);
      localStorage.setItem("gmfn_profile_name", savedName);
      setNote("Name saved to your GSN account. TrustSlip and profile screens can now use it.");
    } catch (err: any) {
      setNote(err?.message || "GSN could not save this name. Check it and try again.");
    } finally {
      setSaving(false);
      setTimeout(() => setNote(""), 3200);
    }
  }

  const accountPhone = String(me?.phone_e164 || "").trim();
  const phoneStatus = me?.phone_verified
    ? "Verified phone"
    : accountPhone
      ? "Phone recorded, verification needed"
      : "No phone recorded yet";

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
            placeholder="Name or street name people know you by"
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
          />

          <div style={{ color: "#64748b", fontSize: 12 }}>
            {profileIconText("phone", phoneStatus, 20)}
          </div>
          <input
            value={accountPhone || "Open phone verification to add it"}
            readOnly
            aria-readonly="true"
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f8fafc" }}
          />
        </div>

        <CardActionRow style={{ marginTop: 12 }}>
          <PrimaryButton
            type="button"
            onClick={() => void saveProfile()}
            disabled={saving || loading}
            busy={saving}
            busyLabel="Saving..."
            debugId="profile.save-account"
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
            "Your display name can appear on GSN account, TrustSlip, and profile surfaces. Phone changes use verified phone steps.",
            20
          )}
        </div>
      </div>
    </div>
  );
}
