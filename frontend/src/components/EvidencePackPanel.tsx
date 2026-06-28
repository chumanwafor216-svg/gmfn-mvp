import React, { useMemo } from "react";
import { GsnRealisticIcon } from "./GsnRealisticIcon";
import GsnSnapshotPaperCard from "./GsnSnapshotPaperCard";
import { PrimaryButton, SecondaryButton } from "./StableButton";
import { buildGsnSnapshotPaper } from "../lib/gsnSnapshotPaper";

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
  const paperPreview = useMemo(
    () =>
      buildGsnSnapshotPaper({
        title,
        purpose: subtitle,
        reference: "GSN evidence pack",
        context: [
          { label: "Package", value: "Trust and support records" },
          { label: "Reader boundary", value: "Redacted share copy first" },
          { label: "Complete record", value: "Authorized private review only" },
        ],
        bodyLines: [
          "Includes trust snapshot and timeline.",
          "Includes supporter summary and decisions where provided.",
          "Includes repayment history, community context, and support context.",
          "Share copy removes sensitive identifiers for outside review.",
        ],
        privacyNote:
          "Privacy: the redacted share copy is the safer outside-review paper. Use the complete record only when the reviewer is allowed to see private member details.",
        limitationNote:
          "Limitation: GSN evidence papers support a trust decision. They are not a bank guarantee, credit approval, payment instruction, automatic debit authority, or proof that money moved.",
      }),
    [subtitle, title]
  );

  return (
    <section
      aria-label={title}
      style={{
        display: "grid",
        gap: 12,
        minWidth: 0,
        overflowAnchor: "none",
      }}
    >
      <GsnSnapshotPaperCard
        paperText={paperPreview}
        compact
        icon="document"
        maxBodyLines={4}
      />

      <div
        style={{
          borderRadius: 18,
          border: "1px solid rgba(212,175,55,0.20)",
          background: "rgba(255,255,255,0.82)",
          padding: 12,
          display: "grid",
          gap: 10,
        }}
      >
        <div
          style={{
            color: "#24415C",
            fontSize: 13,
            fontWeight: 850,
            lineHeight: 1.42,
          }}
        >
          Start with the redacted share copy for outside review. Download the
          complete record only for a reviewer who is allowed to see private
          member evidence.
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <PrimaryButton
            onClick={onDownloadRedacted}
            disabled={disabled}
            stableHeight={52}
            debugId="evidence-pack.download-redacted"
            minWidth={178}
            style={{ borderRadius: 14 }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <GsnRealisticIcon name="records-folder" size={28} decorative />
              Share copy
            </span>
          </PrimaryButton>
          <SecondaryButton
            onClick={onDownloadFull}
            disabled={disabled}
            stableHeight={52}
            debugId="evidence-pack.download-full"
            minWidth={178}
            style={{ borderRadius: 14, border: "1px solid rgba(11,45,74,0.14)", background: "white" }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <GsnRealisticIcon name="certificate-seal" size={28} decorative />
              Complete record
            </span>
          </SecondaryButton>
        </div>
      </div>
    </section>
  );
}
