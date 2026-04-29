import React from "react";
import type { TrustDocumentActionGuideContent } from "../lib/trustDocumentActionGuide";

type Props = {
  content: TrustDocumentActionGuideContent;
  compact?: boolean;
};

function wrapperStyle(): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(16,37,59,0.10)",
    background:
      "linear-gradient(180deg, rgba(248,251,255,0.98) 0%, rgba(239,246,252,0.94) 100%)",
    padding: "18px 18px 16px",
    boxShadow: "0 16px 34px rgba(15,23,42,0.05)",
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

function cardStyle(): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(16,37,59,0.08)",
    background: "#FFFFFF",
    padding: 14,
    boxShadow: "0 10px 24px rgba(15,23,42,0.035)",
  };
}

export default function TrustDocumentActionGuide({
  content,
  compact = false,
}: Props) {
  return (
    <section style={wrapperStyle()}>
      <div style={eyebrowStyle()}>{content.eyebrow}</div>
      <div
        style={{
          marginTop: 8,
          color: "#0B1F33",
          fontSize: compact ? 22 : 26,
          fontWeight: 900,
          lineHeight: 1.15,
        }}
      >
        {content.title}
      </div>
      <div style={{ marginTop: 10, ...helperStyle(), maxWidth: 920 }}>
        {content.intro}
      </div>

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "repeat(3, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        {content.cards.map((card) => (
          <div key={card.id} style={cardStyle()}>
            <div
              style={{
                color: "#0B1F33",
                fontSize: 15,
                fontWeight: 900,
                lineHeight: 1.35,
              }}
            >
              {card.title}
            </div>
            <div style={{ marginTop: 8, ...helperStyle() }}>{card.detail}</div>
          </div>
        ))}
      </div>

      {content.footer ? (
        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: "1px solid rgba(16,37,59,0.08)",
            ...helperStyle(),
            color: "#34516B",
          }}
        >
          {content.footer}
        </div>
      ) : null}
    </section>
  );
}
