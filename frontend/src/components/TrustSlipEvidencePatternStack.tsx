import React from "react";
import { GsnLegacyIcon } from "./GsnLegacyIcon";
import type {
  TrustSlipEvidencePatternItem,
  TrustSlipEvidencePatternTone,
} from "../lib/trustSlipEvidencePatterns";
export type {
  TrustSlipEvidencePatternItem,
  TrustSlipEvidencePatternTone,
} from "../lib/trustSlipEvidencePatterns";

type TrustSlipEvidencePatternStackProps = {
  compact?: boolean;
  title?: string;
  reading: string;
  items: TrustSlipEvidencePatternItem[];
  nextStep: string;
  boundary?: string;
};

function labelStyle(): React.CSSProperties {
  return {
    color: "#526579",
    fontSize: 11,
    fontWeight: 1000,
    letterSpacing: 0,
    textTransform: "uppercase",
  };
}

function textStyle(): React.CSSProperties {
  return {
    color: "#334155",
    fontSize: 12.5,
    fontWeight: 850,
    lineHeight: 1.38,
  };
}

function toneStyle(tone: TrustSlipEvidencePatternTone = "building") {
  if (tone === "strong") {
    return {
      border: "1px solid rgba(46,155,98,0.18)",
      bg: "linear-gradient(180deg, #F4FBF7 0%, #FFFFFF 100%)",
      status: "#166534",
      iconBg: "#EEF9F1",
    };
  }

  if (tone === "check") {
    return {
      border: "1px solid rgba(245,158,11,0.24)",
      bg: "linear-gradient(180deg, #FFF8E8 0%, #FFFFFF 100%)",
      status: "#92400E",
      iconBg: "#FFF7E6",
    };
  }

  return {
    border: "1px solid rgba(37,78,119,0.12)",
    bg: "linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)",
    status: "#0B63D1",
    iconBg: "#EEF5FF",
  };
}

export default function TrustSlipEvidencePatternStack({
  compact = false,
  title = "Evidence pattern stack",
  reading,
  items,
  nextStep,
  boundary = "GSN records what happened inside GSN. This is evidence for judgement, not a guarantee, approval, credit decision, or prediction of future behaviour.",
}: TrustSlipEvidencePatternStackProps) {
  const visibleItems = items.slice(0, compact ? 4 : 6);

  return (
    <section
      data-gsn-trustslip-pattern-stack="evidence-reading"
      style={{
        borderRadius: compact ? 14 : 18,
        border: "1px solid rgba(214,170,69,0.28)",
        background:
          "linear-gradient(180deg, rgba(255,253,247,0.98) 0%, rgba(248,251,255,0.98) 100%)",
        padding: compact ? 10 : 14,
        display: "grid",
        gap: compact ? 9 : 12,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: compact ? "34px minmax(0, 1fr)" : "42px minmax(0, 1fr)",
          gap: compact ? 8 : 10,
          alignItems: "center",
        }}
      >
        <span
          aria-hidden
          style={{
            width: compact ? 34 : 42,
            height: compact ? 34 : 42,
            borderRadius: compact ? 10 : 12,
            display: "grid",
            placeItems: "center",
            background: "#FFFFFF",
            border: "1px solid rgba(214,170,69,0.30)",
          }}
        >
          <GsnLegacyIcon name="evidence" size={compact ? 30 : 38} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...labelStyle(), color: "#7A4A00" }}>{title}</div>
          <div
            style={{
              marginTop: 3,
              color: "#07172C",
              fontSize: compact ? 16 : 20,
              fontWeight: 1000,
              lineHeight: 1.14,
              overflowWrap: "anywhere",
            }}
          >
            {reading}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "repeat(3, minmax(0, 1fr))",
          gap: compact ? 7 : 8,
        }}
      >
        {visibleItems.map((item) => {
          const tone = toneStyle(item.tone);
          return (
            <div
              key={item.key}
              style={{
                borderRadius: 13,
                border: tone.border,
                background: tone.bg,
                padding: compact ? "8px 9px" : "10px 11px",
                display: "grid",
                gridTemplateColumns: "28px minmax(0, 1fr)",
                gap: 7,
                alignItems: "start",
                minWidth: 0,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 9,
                  display: "grid",
                  placeItems: "center",
                  background: tone.iconBg,
                  border: "1px solid rgba(37,78,119,0.08)",
                }}
              >
                <GsnLegacyIcon name={item.icon} size={25} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    color: "#07172C",
                    fontSize: compact ? 12 : 13,
                    fontWeight: 1000,
                    lineHeight: 1.16,
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    marginTop: 3,
                    color: tone.status,
                    fontSize: compact ? 10.5 : 11.5,
                    fontWeight: 1000,
                    lineHeight: 1.2,
                  }}
                >
                  {item.status}
                </div>
                <div style={{ marginTop: 4, ...textStyle(), fontSize: compact ? 11 : 12 }}>
                  {item.meaning}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "minmax(0, 1.15fr) minmax(0, 0.85fr)",
          gap: 8,
        }}
      >
        <div
          style={{
            borderRadius: 12,
            border: "1px solid rgba(37,78,119,0.12)",
            background: "#FFFFFF",
            padding: "8px 10px",
          }}
        >
          <div style={{ ...labelStyle(), color: "#0B63D1" }}>Reader next step</div>
          <div style={{ marginTop: 3, ...textStyle(), color: "#07172C" }}>{nextStep}</div>
        </div>
        <div
          style={{
            borderRadius: 12,
            border: "1px solid rgba(214,170,69,0.22)",
            background: "#FFFDF7",
            padding: "8px 10px",
          }}
        >
          <div style={{ ...labelStyle(), color: "#7A4A00" }}>Boundary</div>
          <div style={{ marginTop: 3, ...textStyle(), color: "#5F4100" }}>{boundary}</div>
        </div>
      </div>
    </section>
  );
}
