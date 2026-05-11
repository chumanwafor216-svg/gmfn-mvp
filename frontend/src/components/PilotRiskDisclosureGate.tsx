import React, { useEffect, useMemo, useState } from "react";
import { PrimaryButton } from "./StableButton";

type Props = {
  storageKey?: string;
  title?: string;
  children: React.ReactNode;
};

const DEFAULT_KEY = "gmfn_pilot_risk_ack_v1";

export default function PilotRiskDisclosureGate({ storageKey = DEFAULT_KEY, title = "Pilot Disclosure", children }: Props) {
  const [ack, setAck] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey);
      if (v === "1") setAck(true);
    } catch {
      // ignore
    }
  }, [storageKey]);

  const body = useMemo(
    () => (
      <div style={{ maxWidth: 720, width: "92%", background: "#fff", borderRadius: 18, padding: 16, border: "1px solid #e5e7eb" }}>
        <div style={{ fontSize: 18, fontWeight: 1000 }}>{title}</div>
        <div style={{ marginTop: 8, color: "#334155", fontSize: 13, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Before you share a TrustSlip:</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>This is <b>not</b> a bank guarantee.</li>
            <li>Guarantors are <b>not auto-debited</b> in MVP.</li>
            <li>Breach triggers <b>reputation + network consequences</b> (visibility + reduced future access).</li>
            <li>Pilot status: use careful judgement and store reasons/notes honestly.</li>
          </ul>

          <div style={{ marginTop: 10, color: "#64748b", fontSize: 12 }}>
            This acknowledgement is stored locally on this device for pilot safety.
          </div>
        </div>

        <label style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", fontWeight: 900 }}>
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          I understand and I want to continue.
        </label>

        <div style={{ marginTop: 12, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <PrimaryButton
            onClick={() => {
              if (!checked) return;
              try {
                localStorage.setItem(storageKey, "1");
              } catch {
                // ignore
              }
              setAck(true);
            }}
            disabled={!checked}
            stableHeight={42}
            debugId="pilot-risk-disclosure.continue"
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #111827",
              background: "#111827",
              color: "#fff",
              fontWeight: 1000,
              cursor: checked ? "pointer" : "not-allowed",
              opacity: checked ? 1 : 0.6,
            }}
          >
            Continue
          </PrimaryButton>
        </div>
      </div>
    ),
    [checked, storageKey, title]
  );

  if (ack) return <>{children}</>;

  return (
    <div style={{ position: "relative" }}>
      {children}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: 12,
        }}
      >
        {body}
      </div>
    </div>
  );
}
