import React from "react";
import ExplainToggle from "../../components/ExplainToggle";
import { GsnLegacyIcon } from "../../components/GsnLegacyIcon";
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
    letterSpacing: 0,
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

function resultIconBadge(compact: boolean, loadError?: string) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: compact ? 60 : 72,
        height: compact ? 60 : 72,
        minWidth: compact ? 60 : 72,
        borderRadius: compact ? 20 : 24,
        display: "inline-grid",
        placeItems: "center",
        background: loadError
          ? "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,247,237,0.76))"
          : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,251,255,0.76))",
        border: loadError
          ? "1px solid rgba(200,58,58,0.16)"
          : "1px solid rgba(20,52,83,0.12)",
        boxShadow:
          "0 16px 32px rgba(7,20,36,0.12), inset 0 1px 0 rgba(255,255,255,0.96)",
      }}
    >
      <GsnLegacyIcon
        name={loadError ? "alert" : "shield"}
        size={compact ? 56 : 66}
        imageStyle={{
          filter: "drop-shadow(0 10px 12px rgba(7,20,36,0.20))",
          transform: "scale(1.06)",
        }}
      />
    </span>
  );
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: compact ? "60px minmax(0, 1fr)" : "72px minmax(0, 1fr)",
          gap: 12,
          alignItems: "center",
        }}
      >
        {resultIconBadge(compact, loadError)}
        <div>
          <div style={sectionLabel()}>Verification result</div>
          <div
            style={{
              marginTop: 5,
              color: "#0B1F33",
              fontSize: compact ? 16 : 18,
              fontWeight: 1000,
              lineHeight: 1.2,
            }}
          >
            {bannerTitle}
          </div>
        </div>
      </div>

      <ExplainToggle
        label="What this result means"
        what="This banner is the first verification answer for the supplied code."
        why="It tells you quickly whether the record is valid now and whether it is safe to trust the public reading shown below."
        next="Use the status and code here as the first check, then read the detailed verification record if you need the fuller context."
        tone="light"
        style={{ marginTop: 12 }}
      />

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
