import React from "react";
import { GsnRealisticIcon } from "./GsnRealisticIcon";
import EvidenceMeter from "./EvidenceMeter";
import {
  type CommunityProofInput,
  type CommunityProofItem,
  type CommunityProofTone,
  buildCommunityProofItems,
} from "../lib/communityProof";

type CommunityProofPanelProps = CommunityProofInput & {
  title?: string;
  subtitle?: string;
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

function tonePalette(tone: CommunityProofTone) {
  switch (tone) {
    case "good":
      return {
        color: "#12633F",
        background: "linear-gradient(180deg, #F8FFFB 0%, #E7F7ED 100%)",
        border: "rgba(46,155,98,0.24)",
      };
    case "warn":
      return {
        color: "#8A4D08",
        background: "linear-gradient(180deg, #FFFDF4 0%, #F8EBC2 100%)",
        border: "rgba(214,170,69,0.34)",
      };
    case "info":
      return {
        color: "#0B4EA2",
        background: "linear-gradient(180deg, #F2F8FF 0%, #E3F0FE 100%)",
        border: "rgba(11,99,209,0.22)",
      };
    case "neutral":
    default:
      return {
        color: "#24415C",
        background: "linear-gradient(180deg, #F8FBFF 0%, #EDF3F9 100%)",
        border: "rgba(36,65,92,0.18)",
      };
  }
}

function proofItemStyle(item: CommunityProofItem, compact: boolean): React.CSSProperties {
  const palette = tonePalette(item.tone);
  return {
    minWidth: 0,
    minHeight: compact ? 82 : 98,
    borderRadius: 16,
    border: `1px solid ${palette.border}`,
    background: palette.background,
    padding: compact ? "10px 11px" : "12px 13px",
    display: "grid",
    gridTemplateColumns: compact ? "34px minmax(0, 1fr)" : "42px minmax(0, 1fr)",
    gap: compact ? 8 : 10,
    alignItems: "start",
    boxShadow:
      "0 12px 26px rgba(7,20,36,0.055), inset 0 1px 0 rgba(255,255,255,0.86)",
    overflow: "hidden",
  };
}

export default function CommunityProofPanel({
  title = "Community proof layer",
  subtitle = "What this record can safely show before a person relies on it.",
  compact = false,
  className,
  style,
  ...input
}: CommunityProofPanelProps) {
  const items = buildCommunityProofItems(input);

  return (
    <section
      className={className}
      data-gsn-community-proof-layer="true"
      aria-label={title}
      style={{
        borderRadius: compact ? 18 : 22,
        border: "1px solid rgba(8,35,58,0.14)",
        background:
          "radial-gradient(circle at 12% 8%, rgba(214,170,69,0.12) 0%, rgba(214,170,69,0) 28%), linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)",
        padding: compact ? 12 : 15,
        display: "grid",
        gap: compact ? 10 : 12,
        boxShadow: "0 16px 34px rgba(6,24,39,0.07)",
        overflowAnchor: "none",
        ...style,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: compact ? "42px minmax(0, 1fr)" : "50px minmax(0, 1fr)",
          gap: 11,
          alignItems: "center",
        }}
      >
        <GsnRealisticIcon
          name="certificate-seal"
          size={compact ? 42 : 48}
          decorative
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(214,170,69,0.26)",
            boxShadow: "0 10px 20px rgba(7,20,36,0.08)",
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: "#07172C",
              fontSize: compact ? 16 : 18,
              fontWeight: 1000,
              lineHeight: 1.12,
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: 4,
              color: "#526579",
              fontSize: compact ? 12 : 13,
              fontWeight: 820,
              lineHeight: 1.32,
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "repeat(3, minmax(0, 1fr))",
          gap: 8,
        }}
      >
        {items.map((item) => {
          const palette = tonePalette(item.tone);
          return (
            <div
              key={item.key}
              data-gsn-community-proof-item={item.key}
              style={proofItemStyle(item, compact)}
            >
              <GsnRealisticIcon
                name={item.icon}
                size={compact ? 34 : 40}
                decorative
                style={{
                  background: "#FFFFFF",
                  border: `1px solid ${palette.border}`,
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    color: "#526579",
                    fontSize: 10,
                    fontWeight: 1000,
                    letterSpacing: 0,
                    lineHeight: 1.1,
                    textTransform: "uppercase",
                  }}
                >
                  {item.label}
                </div>
                <div style={{ marginTop: 5 }}>
                  <EvidenceMeter
                    status={item.value}
                    style={{
                      maxWidth: "100%",
                      minHeight: 28,
                      borderRadius: 10,
                      fontSize: 11,
                      justifyContent: "flex-start",
                      whiteSpace: "normal",
                    }}
                  >
                    {item.value}
                  </EvidenceMeter>
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: "#526579",
                    fontSize: 11.5,
                    fontWeight: 780,
                    lineHeight: 1.28,
                  }}
                >
                  {item.detail}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
