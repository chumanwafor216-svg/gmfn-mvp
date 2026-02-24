import React from "react";

type Props = {
  title?: string;
  subtitle?: string;
  onDownloadFull: () => void;
  onDownloadRedacted: () => void;
  disabled?: boolean;
};

export default function EvidencePackPanel({
  title = "Evidence Pack (PDF)",
  subtitle = "Pilot-ready audit bundle for trust + loan actions.",
  onDownloadFull,
  onDownloadRedacted,
  disabled = false,
}: Props) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <b>{title}</b>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={onDownloadFull}
            disabled={disabled}
            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd", background: "white" }}
          >
            Download Full
          </button>
          <button
            onClick={onDownloadRedacted}
            disabled={disabled}
            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd", background: "white" }}
          >
            Download Redacted
          </button>
        </div>
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 13 }}>
        <div><b>Includes</b></div>
        <ul style={{ margin: 0, paddingLeft: 18, color: "#374151" }}>
          <li>Trust snapshot + timeline (TrustEvents)</li>
          <li>Guarantors summary + decisions (reason/note where provided)</li>
          <li>Repayments history</li>
          <li>Clan + loan context (pilot/audit view)</li>
        </ul>

        <div style={{ marginTop: 8 }}>
          <b>Redacted</b> removes sensitive identifiers (for sharing externally).{" "}
          <span style={{ color: "#6b7280" }}>Use Full for internal evidence, Redacted for stakeholders.</span>
        </div>
      </div>
    </div>
  );
}
