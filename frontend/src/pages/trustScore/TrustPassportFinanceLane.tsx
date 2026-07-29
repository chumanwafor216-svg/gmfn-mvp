import React from "react";
import GSNBrandMark from "../../components/GSNBrandMark";
import {
  GsnLegacyIcon,
  type GsnIconName,
} from "../../components/GsnLegacyIcon";
import { institutionalInnerCard } from "../../lib/institutionalSurface";

export type TrustPassportFinanceCard = [string, string, string, GsnIconName];

type TrustPassportFinanceLaneProps = {
  isCompact: boolean;
  financeDisciplineCards: TrustPassportFinanceCard[];
};

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

function OfficialGsnWatermark({
  isCompact,
  opacity = 0.05,
  style,
}: {
  isCompact: boolean;
  opacity?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        right: isCompact ? -54 : -28,
        top: isCompact ? -42 : -56,
        opacity,
        pointerEvents: "none",
        transform: "rotate(-7deg)",
        zIndex: 0,
        ...style,
      }}
    >
      <GSNBrandMark width={isCompact ? 148 : 210} height={isCompact ? 186 : 264} />
    </div>
  );
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
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,250,255,0.88) 100%)",
      border: "1px solid rgba(153,27,27,0.16)",
    },
  }[tone];

  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: size >= 34 ? 13 : 11,
        display: "grid",
        placeItems: "center",
        flex: "0 0 auto",
        boxShadow:
          "0 9px 18px rgba(2,6,23,0.10), inset 0 1px 0 rgba(255,255,255,0.86)",
        ...palette,
      }}
    >
      <GsnLegacyIcon
        name={name}
        size={Math.max(26, Math.round(size * 0.96))}
        decorative
      />
    </span>
  );
}

export default function TrustPassportFinanceLane({
  isCompact,
  financeDisciplineCards,
}: TrustPassportFinanceLaneProps) {
  return (
    <section
      style={{
        ...innerCard("#F8FBFF"),
        border: "1px solid rgba(11,99,209,0.14)",
        marginTop: 14,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <OfficialGsnWatermark
        isCompact={isCompact}
        opacity={0.04}
        style={{ right: isCompact ? -76 : -42, top: -52 }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          color: "#0B63D1",
          fontSize: 14,
          fontWeight: 1000,
          letterSpacing: 0,
          textTransform: "uppercase",
        }}
      >
        <GsnLegacyIcon name="financeInstitution" size={32} decorative />
        Finance Discipline
      </div>
      <div
        style={{
          color: "#07172C",
          fontSize: isCompact ? 22 : 28,
          lineHeight: 1.08,
          fontWeight: 1000,
          marginTop: 8,
        }}
      >
        What money discipline adds to the evidence
      </div>
      <p
        style={{
          ...helperText(),
          maxWidth: 720,
          margin: "8px 0 0",
        }}
      >
        This lane explains money-related evidence signals. It does not
        move money, create a bank guarantee, or start auto-debit. Finance
        remains the place for the fuller money story.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isCompact
            ? "1fr"
            : "repeat(5, minmax(0, 1fr))",
          gap: 10,
          marginTop: 14,
        }}
      >
        {financeDisciplineCards.map(([label, value, detail, icon]) => (
          <div
            key={label}
            style={{
              ...innerCard("#FFFFFF"),
              border:
                label === "Risk level"
                  ? "1px solid rgba(200,58,58,0.16)"
                  : "1px solid rgba(216,227,238,0.9)",
              minHeight: isCompact ? 0 : 154,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: label === "Risk level" ? "#991B1B" : "#0B63D1",
                fontWeight: 1000,
              }}
            >
              {trustIconBadge(icon, 28, label === "Risk level" ? "red" : "blue")}
              {label}
            </div>
            <div
              style={{
                color: label === "Risk level" ? "#991B1B" : "#07172C",
                fontSize: isCompact ? 20 : 22,
                lineHeight: 1.1,
                fontWeight: 1000,
                marginTop: 8,
                overflowWrap: "break-word",
              }}
            >
              {value}
            </div>
            <p style={{ ...helperText(), margin: "8px 0 0", lineHeight: 1.45 }}>
              {detail}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          ...innerCard("#FFFFFF"),
          border: "1px solid rgba(216,227,238,0.9)",
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: isCompact ? "48px minmax(0, 1fr)" : "56px minmax(0, 1fr)",
          gap: isCompact ? 10 : 14,
          alignItems: "start",
        }}
      >
        {trustIconBadge("financeInstitution", isCompact ? 46 : 54, "blue")}
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#07172C", fontWeight: 1000 }}>
            Plain rule
          </div>
          <p style={{ ...helperText(), margin: "8px 0 0" }}>
            GSN is showing whether the record carries enough financial-discipline evidence
            for careful decisions. It is not promising repayment, collecting
            money, or replacing the Finance page.
          </p>
        </div>
      </div>
    </section>
  );
}
