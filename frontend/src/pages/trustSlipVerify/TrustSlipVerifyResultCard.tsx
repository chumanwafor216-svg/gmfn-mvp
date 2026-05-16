import React from "react";
import ExplainToggle from "../../components/ExplainToggle";
import {
  institutionalPageCard,
  institutionalStatTile,
} from "../../lib/institutionalSurface";

type VerifyBannerToneStyle = {
  bg: string;
  border: string;
  text: string;
};

type TrustSlipVerifyResultCardProps = {
  bannerTitle: string;
  bannerDetail: string;
  bannerStyle: VerifyBannerToneStyle;
  compact: boolean;
  loadError?: string;
  resolvedCode: string;
  statusLabel: string;
};

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    borderRadius: 22,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    color: "#526579",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#4C6178",
    fontSize: 15,
    lineHeight: 1.55,
  };
}

function badge(success = true): React.CSSProperties {
  return {
    ...institutionalStatTile(success ? "#EEF9F1" : "#F8FBFF"),
    width: "fit-content",
    minHeight: "auto",
    padding: "7px 10px",
    borderRadius: 999,
    color: success ? "#166534" : "#35506B",
    fontSize: 12,
    fontWeight: 900,
  };
}

export default function TrustSlipVerifyResultCard({
  bannerTitle,
  bannerDetail,
  bannerStyle,
  compact,
  loadError,
  resolvedCode,
  statusLabel,
}: TrustSlipVerifyResultCardProps) {
  return (
    <section
      style={{
        ...pageCard(bannerStyle.bg),
        border: bannerStyle.border,
        marginTop: 14,
      }}
    >
      <div style={sectionLabel()}>Verification result</div>

      <ExplainToggle
        label="What this result means"
        what="This banner is the first verification answer for the supplied code."
        why="It tells you quickly whether the record is valid now and whether it is safe to trust the public reading shown below."
        next="Use the status and code here as the first check, then read the detailed verification record if you need the fuller context."
        tone="light"
        style={{ marginTop: 12 }}
      />

      <div
        style={{
          marginTop: 10,
          color: bannerStyle.text,
          fontWeight: 900,
          fontSize: compact ? 24 : 30,
          lineHeight: 1.15,
        }}
      >
        {bannerTitle}
      </div>

      <div style={{ marginTop: 12, ...helperText(), color: "#0B1F33" }}>
        {loadError || bannerDetail}
      </div>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span style={badge(true)}>Code: {resolvedCode || "Not available"}</span>
        <span style={badge(false)}>Status: {statusLabel}</span>
      </div>
    </section>
  );
}
