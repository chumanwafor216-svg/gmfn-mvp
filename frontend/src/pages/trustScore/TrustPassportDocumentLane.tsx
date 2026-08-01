import React from "react";
import GsnSnapshotPaperCard from "../../components/GsnSnapshotPaperCard";
import EvidenceMeter from "../../components/EvidenceMeter";
import {
  DangerButton,
  PrimaryButton,
  SecondaryButton,
  SubtleButton,
} from "../../components/StableButton";
import {
  GsnLegacyIcon,
  type GsnIconName,
} from "../../components/GsnLegacyIcon";
import { institutionalInnerCard } from "../../lib/institutionalSurface";

type NoticeTone = "success" | "error";

type TrustPassportDocumentLaneProps = {
  isCompact: boolean;
  refreshing: boolean;
  trustPassportSnapshotReady: boolean;
  trustSlipBlockedByPhone: boolean;
  trustSlipBlockDetail: string;
  trustSlipStatus: string;
  trustSlipCode: string;
  expiresText: string;
  trustPassportPaper: string;
  trustSlipRoute: string;
  verifyAppPath: string;
  documentPreviewDetailsOpen: boolean;
  setDocumentPreviewDetailsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setNotice: React.Dispatch<
    React.SetStateAction<{ tone: NoticeTone; text: string } | null>
  >;
  onRefreshTrust: () => Promise<void>;
  onCopyTrustSnapshot: () => void;
  onOpenTrustRoute: (to: string) => void;
  onScrollToPressureNotes: () => void;
};

const trustPassportDocumentFlowRows = [
  {
    label: "1. Refresh reading",
    value: "Pull the latest signed-in evidence before copying or opening a public check.",
    icon: "refresh" as GsnIconName,
  },
  {
    label: "2. Carry TrustSlip",
    value: "Open the portable public summary when someone outside GSN needs a scoped record.",
    icon: "document" as GsnIconName,
  },
  {
    label: "3. Verify publicly",
    value: "Use TrustSlip Verify when the reader needs the current code and validity check.",
    icon: "search" as GsnIconName,
  },
];

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalInnerCard(bg),
    borderRadius: 18,
    padding: 15,
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#526579",
    fontSize: 14.5,
    lineHeight: 1.75,
  };
}

function trustIconBadge(
  name: GsnIconName,
  size = 30,
  tone: "navy" | "blue" | "green" | "amber" | "red" = "navy"
): React.ReactElement {
  const palette = {
    navy: {
      color: "#0B4EA2",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,250,255,0.88) 100%)",
      border: "1px solid rgba(12,41,71,0.08)",
    },
    blue: {
      color: "#0B63D1",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,250,255,0.88) 100%)",
      border: "1px solid rgba(11,99,209,0.14)",
    },
    green: {
      color: "#168254",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,250,255,0.88) 100%)",
      border: "1px solid rgba(22,130,84,0.14)",
    },
    amber: {
      color: "#92400E",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,250,255,0.88) 100%)",
      border: "1px solid rgba(146,64,14,0.16)",
    },
    red: {
      color: "#991B1B",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,247,247,0.88) 100%)",
      border: "1px solid rgba(153,27,27,0.14)",
    },
  }[tone];

  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: Math.max(10, Math.round(size * 0.38)),
        display: "inline-grid",
        placeItems: "center",
        color: palette.color,
        background: palette.background,
        border: palette.border,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.92)",
      }}
    >
      <GsnLegacyIcon name={name} size={Math.max(17, Math.round(size * 0.68))} decorative />
    </span>
  );
}

export default function TrustPassportDocumentLane({
  isCompact,
  refreshing,
  trustPassportSnapshotReady,
  trustSlipBlockedByPhone,
  trustSlipBlockDetail,
  trustSlipStatus,
  trustSlipCode,
  expiresText,
  trustPassportPaper,
  trustSlipRoute,
  verifyAppPath,
  documentPreviewDetailsOpen,
  setDocumentPreviewDetailsOpen,
  setNotice,
  onRefreshTrust,
  onCopyTrustSnapshot,
  onOpenTrustRoute,
  onScrollToPressureNotes,
}: TrustPassportDocumentLaneProps) {
  return (
    <div
      style={{
        ...innerCard("#FFFFFF"),
        border: "1px solid rgba(216,227,238,0.9)",
      }}
    >
      <style>{`
        .trust-passport-print-paper { display: none; }
        @page { margin: 14mm; }
        @media print {
          html, body { background: #ffffff !important; }
          body * { visibility: hidden !important; }
          .trust-passport-print-paper,
          .trust-passport-print-paper * {
            visibility: visible !important;
          }
          .trust-passport-print-paper {
            display: block !important;
            position: fixed !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            z-index: 2147483647 !important;
          }
          .trust-passport-print-paper .gsn-snapshot-paper-card {
            box-shadow: none !important;
            border: 1px solid rgba(148,163,184,0.34) !important;
            background: #ffffff !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .trust-passport-print-paper button {
            display: none !important;
          }
        }
      `}</style>
      {trustPassportSnapshotReady ? (
        <div
          className="trust-passport-print-paper"
          data-trust-passport-print-document="official-paper"
          aria-hidden="true"
        >
          <GsnSnapshotPaperCard
            paperText={trustPassportPaper}
            compact={false}
            icon="shield"
            previewMode="full"
            style={{ boxShadow: "none" }}
          />
        </div>
      ) : null}
      <div style={{ color: "#07172C", fontWeight: 1000, fontSize: 20 }}>
        7. Shareable trust tools
      </div>
      <div
        data-trust-passport-document-flow="compact"
        style={{
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
          gap: 8,
          marginTop: 10,
        }}
      >
        {trustPassportDocumentFlowRows.map((row) => (
          <div
            key={row.label}
            style={{
              display: "grid",
              gridTemplateColumns: "30px minmax(0, 1fr)",
              gap: 8,
              alignItems: "center",
              borderRadius: 13,
              border: "1px solid rgba(37,78,119,0.12)",
              background: "#FFFFFF",
              padding: isCompact ? "8px 9px" : "10px 11px",
              minWidth: 0,
            }}
          >
            {trustIconBadge(row.icon, 28, "blue")}
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: "#0B63D1",
                  fontSize: isCompact ? 9 : 10,
                  fontWeight: 1000,
                  lineHeight: 1.1,
                  textTransform: "uppercase",
                }}
              >
                {row.label}
              </div>
              <div
                style={{
                  marginTop: 3,
                  color: "#334155",
                  fontSize: isCompact ? 10.5 : 11.5,
                  fontWeight: 850,
                  lineHeight: 1.3,
                }}
              >
                {row.value}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isCompact
            ? "repeat(2, minmax(0, 1fr))"
            : "repeat(4, minmax(0, 1fr))",
          gap: 10,
          marginTop: 12,
        }}
      >
        <PrimaryButton
          onClick={() => {
            void onRefreshTrust();
          }}
          busy={refreshing}
          busyLabel="Refreshing..."
          fullWidth
          stableHeight={isCompact ? 48 : 58}
          debugId="trust-score.refresh"
          style={{
            borderRadius: 11,
            fontSize: isCompact ? 12 : 14,
            fontWeight: 950,
            paddingInline: 10,
          }}
        >
          {trustIconBadge("refresh", isCompact ? 26 : 28, "navy")}
          Refresh evidence reading
        </PrimaryButton>
        <SecondaryButton
          onClick={onCopyTrustSnapshot}
          fullWidth
          stableHeight={isCompact ? 48 : 58}
          debugId="trust-score.copy-snapshot"
          style={{
            borderRadius: 11,
            fontSize: isCompact ? 12 : 14,
            fontWeight: 950,
            paddingInline: 10,
          }}
        >
          {trustIconBadge("copy", isCompact ? 26 : 28, "navy")}
          Copy text
        </SecondaryButton>
        <SecondaryButton
          onClick={() => onOpenTrustRoute(trustSlipRoute)}
          fullWidth
          stableHeight={isCompact ? 48 : 58}
          debugId="trust-score.open-trust-slip"
          style={{
            borderRadius: 11,
            fontSize: isCompact ? 12 : 14,
            fontWeight: 950,
            paddingInline: 10,
          }}
        >
          {trustIconBadge("document", isCompact ? 26 : 28, "navy")}
          Open TrustSlip
        </SecondaryButton>
        <SecondaryButton
          onClick={() => onOpenTrustRoute(verifyAppPath)}
          fullWidth
          stableHeight={isCompact ? 48 : 58}
          debugId="trust-score.verify"
          style={{
            borderRadius: 11,
            fontSize: isCompact ? 12 : 14,
            fontWeight: 950,
            paddingInline: 10,
          }}
        >
          {trustIconBadge("search", isCompact ? 26 : 28, "navy")}
          Open TrustSlip verify
        </SecondaryButton>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginTop: 10,
        }}
      >
        <DangerButton
          onClick={onScrollToPressureNotes}
          fullWidth
          stableHeight={isCompact ? 52 : 40}
          debugId="trust-score.review-care"
          style={{ borderRadius: 10, fontSize: 13, fontWeight: 950 }}
        >
          Review pressure notes
        </DangerButton>
        <SubtleButton
          onClick={() => {
            if (!trustPassportSnapshotReady) {
              setNotice({
                tone: "error",
                text: trustSlipBlockedByPhone
                  ? trustSlipBlockDetail
                  : "Trust Passport PDF is not ready yet. Issue the GSN ID and TrustSlip first.",
              });
              return;
            }

            if (
              typeof window !== "undefined" &&
              typeof window.print === "function"
            ) {
              window.print();
            }
          }}
          fullWidth
          stableHeight={isCompact ? 52 : 40}
          debugId="trust-score.export"
          style={{ borderRadius: 10, fontSize: 13, fontWeight: 950 }}
        >
          Export / print
        </SubtleButton>
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <EvidenceMeter status={trustSlipStatus}>
          TrustSlip: {trustSlipStatus || "Not issued yet"}
        </EvidenceMeter>
        <EvidenceMeter status={trustSlipCode ? "Ready" : "Limited"}>
          Code: {trustSlipCode || "Not stated"}
        </EvidenceMeter>
        <EvidenceMeter status="Limited">Expires: {expiresText}</EvidenceMeter>
      </div>
      {trustPassportSnapshotReady ? (
        <div
          data-trust-passport-document-preview-details="collapsed"
          style={{
            ...innerCard("#FFFFFF"),
            border: "1px solid rgba(216,227,238,0.9)",
            display: "grid",
            gap: documentPreviewDetailsOpen ? (isCompact ? 9 : 12) : 0,
            marginTop: 14,
          }}
        >
          <SubtleButton
            debugId="trust-score.documents-lane.preview-details.toggle"
            stableHeight={isCompact ? 42 : 44}
            onClick={() => setDocumentPreviewDetailsOpen((open) => !open)}
            aria-expanded={documentPreviewDetailsOpen}
            fullWidth
            style={{
              justifyContent: "space-between",
              borderRadius: 13,
              background: documentPreviewDetailsOpen ? "#F8FBFF" : "#FFFFFF",
              border: "1px solid rgba(11,99,209,0.14)",
              color: "#24415C",
              boxShadow: "none",
              fontSize: 12.5,
              fontWeight: 1000,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <GsnLegacyIcon name="document" size={24} decorative />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Document preview details
              </span>
            </span>
            <span aria-hidden="true" style={{ color: "#617085", fontSize: 18 }}>
              {documentPreviewDetailsOpen ? "-" : "+"}
            </span>
          </SubtleButton>

          {documentPreviewDetailsOpen ? (
            <div
              style={{
                display: "grid",
                gap: isCompact ? 8 : 10,
                paddingTop: isCompact ? 8 : 10,
                borderTop: "1px solid rgba(216,227,238,0.62)",
              }}
            >
              <GsnSnapshotPaperCard
                paperText={trustPassportPaper}
                compact={isCompact}
                icon="shield"
                maxBodyLines={isCompact ? 6 : undefined}
              />
              <p
                style={{
                  ...helperText(),
                  margin: 0,
                  fontSize: isCompact ? 12 : 13,
                }}
              >
                Copy gives a short text summary. Export / print sends the official
                GSN paper only, without the app menu, tools, or bottom navigation.
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <div
          style={{
            ...innerCard("#FFFDF7"),
            marginTop: 14,
            border: "1px solid rgba(245,158,11,0.20)",
            display: "grid",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "42px minmax(0, 1fr)",
              gap: 10,
              alignItems: "center",
            }}
          >
            {trustIconBadge("document", 34, "amber")}
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: "#92400E",
                  fontSize: 13,
                  fontWeight: 1000,
                  textTransform: "uppercase",
                  letterSpacing: 0,
                }}
              >
                Snapshot not ready
              </div>
              <div
                style={{
                  color: "#07172C",
                  fontSize: isCompact ? 17 : 19,
                  fontWeight: 1000,
                  lineHeight: 1.18,
                  marginTop: 3,
                }}
              >
                {trustSlipBlockedByPhone
                  ? "Verify the phone number before sharing."
                  : "Finish the GSN ID and TrustSlip before sharing."}
              </div>
            </div>
          </div>
          <p style={{ ...helperText(), margin: 0 }}>
            {trustSlipBlockedByPhone
              ? trustSlipBlockDetail
              : "A public-looking paper should not show a missing GSN ID or a blank TrustSlip code."}
          </p>
          <SecondaryButton
            onClick={() => onOpenTrustRoute(trustSlipRoute)}
            fullWidth
            stableHeight={isCompact ? 50 : 52}
            debugId="trust-score.snapshot-open-trust-slip"
            style={{ borderRadius: 12, fontWeight: 950 }}
          >
            {trustIconBadge("document", 28, "navy")}
            Open TrustSlip
          </SecondaryButton>
        </div>
      )}
    </div>
  );
}
