import React, { useMemo, useState } from "react";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import { PrimaryButton } from "../components/StableButton";
import { devBootstrapClan } from "../lib/api";

function topPattern(): string {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="320" viewBox="0 0 1600 320">
    <rect width="1600" height="320" fill="#F7FAFD"/>
    <g fill="none" stroke="#C7D9EE" stroke-opacity="0.42" stroke-width="2">
      <path d="M80 160 C180 90, 280 90, 380 160 S580 230, 690 150" />
      <path d="M920 160 C1020 90, 1120 90, 1220 160 S1420 230, 1520 150" />
    </g>
  </svg>`.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
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

function labelWithIcon(icon: GsnIconName, label: string): React.ReactNode {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <GsnLegacyIcon name={icon} size={24} />
      <span>{label}</span>
    </span>
  );
}

function tileIcon(icon: GsnIconName): React.ReactNode {
  return (
    <span
      style={{
        width: 46,
        height: 46,
        borderRadius: 16,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#EAF3FF",
        color: "#0B63D1",
        border: "1px solid rgba(11,99,209,0.14)",
        flex: "0 0 auto",
      }}
    >
      <GsnLegacyIcon name={icon} size={34} />
    </span>
  );
}

export default function SeedDemoPage() {
  const pattern = useMemo(() => topPattern(), []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function runSeed() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      await devBootstrapClan();
      setMsg("Test records are ready.");
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to prepare test records."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 1260, margin: "0 auto" }}>
      <div
        style={{
          backgroundImage: `url("${pattern}")`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          borderRadius: 28,
          border: "1px solid rgba(11,31,51,0.06)",
          overflow: "hidden",
          backgroundColor: "#F8FBFE",
        }}
      >
        <div style={{ padding: 24 }}>
          <div style={{ fontSize: 34, fontWeight: 1000, color: "#0B1F33" }}>
            Prepare Test Records
          </div>
          <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
            Use this controlled setup only when you need a known pilot test state.
          </div>

          {msg && (
            <div
              style={{
                marginTop: 16,
                padding: "12px 14px",
                borderRadius: 14,
                background: "#ECFDF5",
                border: "1px solid #A7F3D0",
                color: "#065F46",
                fontWeight: 900,
              }}
            >
              {msg}
            </div>
          )}

          {err && (
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
          )}

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 18,
            }}
          >
            <div style={{ ...card(), background: "linear-gradient(180deg, rgba(239,246,255,0.96) 0%, rgba(255,255,255,0.98) 100%)" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                {tileIcon("shield")}
                <div>
                  <div style={{ fontSize: 12, color: "#5B7693", fontWeight: 1000, letterSpacing: 0.8 }}>
                    CONTROLLED SETUP
                  </div>
                  <div style={{ marginTop: 10, fontSize: 28, fontWeight: 1000, color: "#0B1F33" }}>
                    Prepare a known test state
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 10, color: "#6B7A88", lineHeight: 1.8 }}>
                This may create or refresh records for guided pilot checks. Use it only when you
                intend to reset the test story.
              </div>
            </div>

            <div style={card()}>
              <div style={{ fontSize: 16, fontWeight: 1000, color: "#0B1F33" }}>
                {labelWithIcon("refresh", "Prepare records")}
              </div>
              <div style={{ marginTop: 10, color: "#6B7A88", lineHeight: 1.8 }}>
                Continue only if you want GSN to refresh the controlled test records for this environment.
              </div>
              <div style={{ marginTop: 16 }}>
                <PrimaryButton
                  onClick={runSeed}
                  disabled={busy}
                  busy={busy}
                  busyLabel={labelWithIcon("refresh", "Preparing")}
                  stableHeight={52}
                  debugId="seed-demo.run"
                  style={{
                    padding: "12px 16px",
                    borderRadius: 14,
                    border: "none",
                    background: "#0B63D1",
                    color: "#FFFFFF",
                    fontWeight: 1000,
                    cursor: busy ? "not-allowed" : "pointer",
                    fontSize: 14,
                  }}
                >
                  {labelWithIcon("refresh", "Prepare test records")}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
