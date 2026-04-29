import React from "react";
import OriginLink from "./OriginLink";
import type { TrustDocumentUseCaseItem } from "../lib/trustDocumentUseCases";

type Props = {
  title?: string;
  intro?: string;
  items: TrustDocumentUseCaseItem[];
  compact?: boolean;
};

function wrapperStyle(): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(16,37,59,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,252,255,0.94) 100%)",
    padding: 18,
    boxShadow: "0 16px 34px rgba(15,23,42,0.045)",
  };
}

function eyebrowStyle(): React.CSSProperties {
  return {
    color: "#355674",
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  };
}

function helperStyle(): React.CSSProperties {
  return {
    color: "#4D667D",
    fontSize: 14,
    lineHeight: 1.7,
  };
}

function cardStyle(active = false, disabled = false): React.CSSProperties {
  return {
    borderRadius: 18,
    border: active
      ? "1px solid rgba(11,99,209,0.20)"
      : "1px solid rgba(16,37,59,0.08)",
    background: active
      ? "linear-gradient(180deg, #F6FAFF 0%, #FFFFFF 100%)"
      : disabled
      ? "#F8FAFC"
      : "#FFFFFF",
    padding: 14,
    boxShadow: active
      ? "0 12px 28px rgba(11,99,209,0.08)"
      : "0 10px 24px rgba(15,23,42,0.03)",
    opacity: disabled ? 0.9 : 1,
  };
}

function linkStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    borderRadius: 12,
    border: "1px solid rgba(11,99,209,0.16)",
    background: "linear-gradient(180deg, #F6FAFF 0%, #EAF2FF 100%)",
    color: "#0B63D1",
    fontSize: 13,
    fontWeight: 900,
    padding: "8px 12px",
    textDecoration: "none",
  };
}

export default function TrustDocumentUseCases({
  title = "Which trust surface answers which question?",
  intro = "Use this guide when you know the question in normal language but are not yet sure which trust surface is the right one.",
  items,
  compact = false,
}: Props) {
  return (
    <section style={wrapperStyle()}>
      <div style={eyebrowStyle()}>Trust surface chooser</div>
      <div
        style={{
          marginTop: 8,
          color: "#0B1F33",
          fontWeight: 900,
          fontSize: compact ? 22 : 26,
          lineHeight: 1.15,
        }}
      >
        {title}
      </div>
      <div style={{ marginTop: 10, ...helperStyle(), maxWidth: 920 }}>{intro}</div>

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "repeat(2, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        {items.map((item) => (
          <div key={item.id} style={cardStyle(Boolean(item.active), Boolean(item.disabled))}>
            <div style={eyebrowStyle()}>{item.question}</div>
            <div
              style={{
                marginTop: 8,
                color: "#0B1F33",
                fontSize: 18,
                fontWeight: 900,
                lineHeight: 1.25,
              }}
            >
              {item.title}
            </div>
            <div style={{ marginTop: 8, ...helperStyle() }}>{item.detail}</div>

            {item.active ? (
              <div style={{ marginTop: 12, ...helperStyle(), color: "#0B63D1", fontWeight: 800 }}>
                You are already on this trust surface.
              </div>
            ) : item.to && !item.disabled ? (
              <div style={{ marginTop: 12 }}>
                <OriginLink to={item.to} style={linkStyle()}>
                  Open {item.title.replace(/^Start with\s+|^Stay with\s+|^Carry\s+|^Open\s+/, "")}
                </OriginLink>
              </div>
            ) : item.disabledReason ? (
              <div style={{ marginTop: 12, ...helperStyle(), color: "#64748B" }}>
                {item.disabledReason}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
