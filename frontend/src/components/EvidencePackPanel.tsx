import React from "react";
import { GsnRealisticIcon } from "./GsnRealisticIcon";
import { SecondaryButton } from "./StableButton";

type Props = {
  title?: string;
  subtitle?: string;
  onDownloadFull: () => void;
  onDownloadRedacted: () => void;
  disabled?: boolean;
};

export default function EvidencePackPanel({
  title = "GSN Evidence Pack (PDF)",
  subtitle = "Official trust and support records for careful review.",
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
          <SecondaryButton
            onClick={onDownloadFull}
            disabled={disabled}
            stableHeight={52}
            debugId="evidence-pack.download-full"
            style={{ borderRadius: 10, border: "1px solid #ddd", background: "white" }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <GsnRealisticIcon name="certificate-seal" size={28} decorative />
              Complete record
            </span>
          </SecondaryButton>
          <SecondaryButton
            onClick={onDownloadRedacted}
            disabled={disabled}
            stableHeight={52}
            debugId="evidence-pack.download-redacted"
            style={{ borderRadius: 10, border: "1px solid #ddd", background: "white" }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <GsnRealisticIcon name="records-folder" size={28} decorative />
              Share copy
            </span>
          </SecondaryButton>
        </div>
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 13 }}>
        <div><b>Includes</b></div>
        <ul style={{ margin: 0, paddingLeft: 18, color: "#374151" }}>
          <li>Trust snapshot and timeline</li>
          <li>Guarantor summary and decisions where provided</li>
          <li>Repayments history</li>
          <li>Community and loan context</li>
        </ul>

        <div style={{ marginTop: 8 }}>
          <b>Share copy</b> removes sensitive identifiers for outside review.{" "}
          <span style={{ color: "#6b7280" }}>Use the complete record only when the reviewer is allowed to see the private details.</span>
        </div>
        <div style={{ marginTop: 8, color: "#6b7280" }}>
          GSN evidence papers support a trust decision. They are not a bank guarantee and do not start automatic debit.
        </div>
      </div>
    </div>
  );
}
