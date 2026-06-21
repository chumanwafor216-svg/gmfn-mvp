import React from "react";
import { GsnLegacyIcon, type GsnIconName } from "./GsnLegacyIcon";
import { StableCtaLink } from "./StableButton";
import type { TrustDocumentFamilyItem } from "../lib/trustDocumentFamilyMap";

type Props = {
  title?: string;
  intro?: string;
  items: TrustDocumentFamilyItem[];
  compact?: boolean;
};

function wrapperStyle(): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(16,37,59,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,250,254,0.93) 100%)",
    padding: 18,
    boxShadow: "0 16px 34px rgba(15,23,42,0.045)",
  };
}

function sectionLabelStyle(): React.CSSProperties {
  return {
    color: "#355674",
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: 0,
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

function cardStyle(disabled = false): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(16,37,59,0.08)",
    background: disabled ? "#F8FAFC" : "#FFFFFF",
    padding: 14,
    boxShadow: "0 10px 24px rgba(15,23,42,0.03)",
    opacity: disabled ? 0.88 : 1,
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

function trustDocumentIcon(id: string): GsnIconName {
  switch (id) {
    case "identity":
      return "id";
    case "cci":
      return "community";
    case "passport":
      return "certificate";
    case "trust-slip":
      return "evidence";
    case "verify":
      return "qr";
    default:
      return "document";
  }
}

function iconTile(disabled = false): React.CSSProperties {
  return {
    width: 46,
    height: 46,
    borderRadius: 15,
    display: "inline-grid",
    placeItems: "center",
    flex: "0 0 auto",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,251,255,0.96) 100%)",
    border: disabled
      ? "1px solid rgba(100,116,139,0.14)"
      : "1px solid rgba(13,95,168,0.14)",
    boxShadow:
      "0 12px 22px rgba(10,24,49,0.09), inset 4px 0 0 rgba(214,170,69,0.18), inset 0 1px 0 rgba(255,255,255,0.96)",
    opacity: disabled ? 0.78 : 1,
  };
}

export default function TrustDocumentFamilyMap({
  title = "How these trust surfaces fit together",
  intro = "Use this map when you need to understand the difference between the stable identity layer, the fuller trust story, the portable record, and the public verification check.",
  items,
  compact = false,
}: Props) {
  return (
    <section style={wrapperStyle()}>
      <div style={sectionLabelStyle()}>Trust document family</div>
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
          <div key={item.id} style={cardStyle(Boolean(item.disabled))}>
            <div style={{ display: "grid", gridTemplateColumns: "46px minmax(0, 1fr)", gap: 10, alignItems: "center" }}>
              <span aria-hidden="true" style={iconTile(Boolean(item.disabled))}>
                <GsnLegacyIcon name={trustDocumentIcon(item.id)} size={34} decorative />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={sectionLabelStyle()}>{item.label}</div>
                <div
                  style={{
                    marginTop: 5,
                    color: "#0B1F33",
                    fontSize: 18,
                    fontWeight: 900,
                    lineHeight: 1.2,
                  }}
                >
                  {item.title}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 8, ...helperStyle() }}>{item.detail}</div>

            {item.to && !item.disabled ? (
              <div style={{ marginTop: 12 }}>
                <StableCtaLink
                  to={item.to}
                  debugId={`trust-document-family.open.${item.id}`}
                  stableHeight={52}
                  style={linkStyle()}
                >
                  Open {item.title}
                </StableCtaLink>
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
