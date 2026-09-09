import React from "react";
import { GsnRealisticIcon } from "./GsnRealisticIcon";
import type { RealLifeTrustGuidance } from "../lib/realLifeTrustGuidance";

type RealLifeMeaningGuideTone = "light" | "dark";

type RealLifeMeaningGuideProps = {
  guidance: RealLifeTrustGuidance;
  compact?: boolean;
  tone?: RealLifeMeaningGuideTone;
  style?: React.CSSProperties;
};

function cardStyle(
  tone: RealLifeMeaningGuideTone,
  compact: boolean
): React.CSSProperties {
  const dark = tone === "dark";

  return {
    display: "grid",
    gridTemplateColumns: compact ? "1fr" : "52px minmax(0, 1fr)",
    gap: compact ? 12 : 14,
    alignItems: "start",
    borderRadius: compact ? 20 : 24,
    padding: compact ? 14 : 16,
    border: dark
      ? "1px solid rgba(242,199,102,0.24)"
      : "1px solid rgba(16,37,59,0.12)",
    background: dark
      ? "linear-gradient(180deg, rgba(8,35,58,0.86) 0%, rgba(6,24,39,0.88) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(241,247,255,0.96) 100%)",
    boxShadow: dark
      ? "0 18px 34px rgba(0,8,18,0.22), inset 0 1px 0 rgba(255,255,255,0.08)"
      : "0 14px 28px rgba(10,24,49,0.07), inset 0 1px 0 rgba(255,255,255,0.80)",
    boxSizing: "border-box",
    overflow: "hidden",
  };
}

function eyebrowStyle(tone: RealLifeMeaningGuideTone): React.CSSProperties {
  return {
    color: tone === "dark" ? "#F2C766" : "#8A640E",
    fontSize: 11,
    fontWeight: 1000,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  };
}

function titleStyle(tone: RealLifeMeaningGuideTone): React.CSSProperties {
  return {
    marginTop: 5,
    color: tone === "dark" ? "#FFFFFF" : "#07172C",
    fontSize: 17,
    fontWeight: 1000,
    lineHeight: 1.22,
  };
}

function bodyStyle(tone: RealLifeMeaningGuideTone): React.CSSProperties {
  return {
    color: tone === "dark" ? "#CFE0F3" : "#405870",
    fontSize: 13.5,
    fontWeight: 760,
    lineHeight: 1.55,
  };
}

function factStyle(tone: RealLifeMeaningGuideTone): React.CSSProperties {
  return {
    borderRadius: 16,
    padding: "10px 11px",
    background:
      tone === "dark" ? "rgba(255,255,255,0.06)" : "rgba(234,243,255,0.72)",
    border:
      tone === "dark"
        ? "1px solid rgba(255,255,255,0.10)"
        : "1px solid rgba(16,37,59,0.08)",
    minWidth: 0,
  };
}

function factLabelStyle(tone: RealLifeMeaningGuideTone): React.CSSProperties {
  return {
    color: tone === "dark" ? "#F6E4AE" : "#315A80",
    fontSize: 10.5,
    fontWeight: 1000,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  };
}

export function RealLifeMeaningGuide({
  guidance,
  compact = false,
  tone = "light",
  style,
}: RealLifeMeaningGuideProps) {
  const facts = [
    ["Meaning", guidance.meaning],
    ["Why it matters", guidance.why],
    ["First step", guidance.firstStep],
    ["If skipped", guidance.ifSkipped],
  ];

  return (
    <section
      data-gsn-real-life-meaning
      aria-label="Real-life meaning"
      style={{
        ...cardStyle(tone, compact),
        ...style,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          justifySelf: compact ? "start" : "center",
          width: 52,
          height: 52,
          borderRadius: 18,
          display: "grid",
          placeItems: "center",
          background:
            tone === "dark"
              ? "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))"
              : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(234,243,255,0.92))",
          border:
            tone === "dark"
              ? "1px solid rgba(242,199,102,0.22)"
              : "1px solid rgba(16,37,59,0.10)",
          boxShadow:
            tone === "dark"
              ? "0 12px 24px rgba(0,0,0,0.18)"
              : "0 10px 20px rgba(10,24,49,0.08)",
        }}
      >
        <GsnRealisticIcon name="trust-shield" size={44} />
      </div>

      <div style={{ minWidth: 0, display: "grid", gap: 11 }}>
        <div>
          <div style={eyebrowStyle(tone)}>{guidance.eyebrow}</div>
          <div style={titleStyle(tone)}>{guidance.title}</div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: compact ? "1fr" : "repeat(2, minmax(0, 1fr))",
            gap: 8,
          }}
        >
          {facts.map(([label, value]) => (
            <div key={label} style={factStyle(tone)}>
              <div style={factLabelStyle(tone)}>{label}</div>
              <div style={{ ...bodyStyle(tone), marginTop: 4 }}>{value}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            ...bodyStyle(tone),
            color: tone === "dark" ? "#F7E7B3" : "#7A5C17",
            fontSize: 12.5,
            fontWeight: 880,
          }}
        >
          {guidance.boundary}
        </div>
      </div>
    </section>
  );
}
