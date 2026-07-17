import React from "react";
import { StableDisclosureSummary } from "./StableButton";
import {
  getTrustBandLanguage,
  getTrustBandShortLabel,
  TRUST_BAND_LANGUAGE,
  type TrustBandLanguage,
} from "../lib/trustBandLanguage";

type TrustBandMeaningGuideProps = {
  currentBand?: string | null;
  compact?: boolean;
};

function shell(): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(37,78,119,0.12)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(246,250,255,0.98) 100%)",
    boxShadow: "0 16px 38px rgba(15,23,42,0.08)",
    padding: 18,
    color: "#0B1F33",
  };
}

function label(): React.CSSProperties {
  return {
    color: "#526579",
    fontSize: 11,
    fontWeight: 1000,
    letterSpacing: 0.42,
    textTransform: "uppercase",
  };
}

function body(): React.CSSProperties {
  return {
    color: "#38506A",
    fontSize: 14,
    lineHeight: 1.65,
  };
}

function toneColors(tone: TrustBandLanguage["tone"]): {
  border: string;
  bg: string;
  text: string;
} {
  if (tone === "strong" || tone === "good") {
    return {
      border: "1px solid rgba(46,155,98,0.18)",
      bg: "linear-gradient(180deg, rgba(243,251,245,0.98) 0%, rgba(255,255,255,0.98) 100%)",
      text: "#166534",
    };
  }
  if (tone === "care") {
    return {
      border: "1px solid rgba(214,170,69,0.24)",
      bg: "linear-gradient(180deg, rgba(255,251,235,0.98) 0%, rgba(255,255,255,0.98) 100%)",
      text: "#92400E",
    };
  }
  return {
    border: "1px solid rgba(200,58,58,0.18)",
    bg: "linear-gradient(180deg, rgba(255,245,245,0.98) 0%, rgba(255,255,255,0.98) 100%)",
    text: "#991B1B",
  };
}

function itemCard(active: boolean, tone: TrustBandLanguage["tone"]): React.CSSProperties {
  const colors = toneColors(tone);
  return {
    borderRadius: 16,
    border: active ? colors.border : "1px solid rgba(37,78,119,0.10)",
    background: active ? colors.bg : "#FFFFFF",
    padding: 12,
    minWidth: 0,
  };
}

export default function TrustBandMeaningGuide({
  currentBand,
  compact = false,
}: TrustBandMeaningGuideProps) {
  const selected = getTrustBandLanguage(currentBand);
  const selectedShortLabel = getTrustBandShortLabel(selected.band);
  const selectedColors = toneColors(selected.tone);

  return (
    <section style={shell()}>
      <div style={label()}>Evidence reading</div>
      <div style={{ marginTop: 9, ...body(), color: "#0B1F33" }}>
        <b>{selectedShortLabel}</b>. {selected.plainMeaning}
      </div>
      <details style={{ marginTop: 12 }}>
        <StableDisclosureSummary
          debugId="trust-band-meaning.toggle"
          stableHeight={52}
          style={{
            borderRadius: 16,
            border: selectedColors.border,
            background: selectedColors.bg,
            color: selectedColors.text,
            fontWeight: 1000,
            padding: "10px 12px",
          }}
        >
          Open evidence guide
        </StableDisclosureSummary>
        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: compact ? "1fr" : "120px minmax(0, 1fr)",
            gap: 14,
            alignItems: "stretch",
          }}
        >
        <div
          style={{
            borderRadius: 20,
            border: selectedColors.border,
            background: selectedColors.bg,
            display: "grid",
            placeItems: "center",
            minHeight: 112,
            padding: 12,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={label()}>Current posture</div>
            <div
              style={{
                marginTop: 8,
                color: selectedColors.text,
                fontSize: compact ? 28 : 34,
                lineHeight: 1.02,
                fontWeight: 1000,
                overflowWrap: "break-word",
              }}
            >
              {selectedShortLabel}
            </div>
            <div style={{ marginTop: 8, ...body(), fontWeight: 900 }}>
              Evidence posture
            </div>
          </div>
        </div>

        <div
          style={{
            borderRadius: 20,
            border: selectedColors.border,
            background: selectedColors.bg,
            padding: 14,
          }}
        >
          <div
            style={{
              color: selectedColors.text,
              fontSize: 20,
              fontWeight: 1000,
              lineHeight: 1.2,
            }}
          >
            {selectedShortLabel}
          </div>
          <div style={{ marginTop: 9, ...body(), color: "#0B1F33" }}>
            {selected.plainMeaning}
          </div>
          <div style={{ marginTop: 8, ...body() }}>
            <b>Implication:</b> {selected.implication}
          </div>
          <div style={{ marginTop: 8, ...body() }}>
            <b>Next action:</b> {selected.nextStep}
          </div>
        </div>
        </div>

        <div style={{ marginTop: 14, ...body() }}>
          Use this guide to read the evidence posture. This is not approval,
          a character label, or a permanent judgement.
        </div>

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: compact ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {TRUST_BAND_LANGUAGE.map((item) => {
            const active = item.band === selected.band;
            const colors = toneColors(item.tone);
            const itemShortLabel = getTrustBandShortLabel(item.band);
            return (
              <div key={item.band} style={itemCard(active, item.tone)}>
                <div
                  style={{
                    color: active ? colors.text : "#0B1F33",
                    fontWeight: 1000,
                    fontSize: 14,
                  }}
                >
                  {itemShortLabel}
                </div>
                <div style={{ marginTop: 6, ...body(), fontSize: 13 }}>
                  {item.nextStep}
                </div>
              </div>
            );
          })}
        </div>
      </details>
    </section>
  );
}
