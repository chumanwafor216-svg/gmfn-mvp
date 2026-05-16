import React from "react";
import { institutionalPageCard } from "../../lib/institutionalSurface";

type TrustSlipVerifyBoundaryProps = {
  compact: boolean;
};

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    borderRadius: 22,
  };
}

export default function TrustSlipVerifyBoundary({
  compact,
}: TrustSlipVerifyBoundaryProps) {
  return (
    <section
      aria-label="Public private boundary"
      style={{
        ...pageCard("#07172C"),
        padding: compact ? 14 : 18,
        border: "2px solid rgba(183,121,31,0.72)",
        boxShadow: "0 16px 34px rgba(7,23,44,0.16)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "1fr auto 1fr",
          gap: 12,
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              color: "#F2C766",
              fontSize: 13,
              fontWeight: 1000,
              textTransform: "uppercase",
            }}
          >
            Public paper ends here
          </div>
          <div
            style={{
              marginTop: 4,
              color: "#EAF3FF",
              fontSize: 14,
              fontWeight: 800,
              lineHeight: 1.45,
            }}
          >
            Share or print only the section above.
          </div>
        </div>

        <div
          aria-hidden="true"
          style={{
            width: compact ? "100%" : 72,
            height: compact ? 2 : 72,
            borderRadius: 999,
            background: compact
              ? "linear-gradient(90deg, rgba(242,199,102,0.18), rgba(242,199,102,0.9), rgba(242,199,102,0.18))"
              : "linear-gradient(180deg, rgba(242,199,102,0.18), rgba(242,199,102,0.9), rgba(242,199,102,0.18))",
          }}
        />

        <div style={{ textAlign: compact ? "left" : "right" }}>
          <div
            style={{
              color: "#FCA5A5",
              fontSize: 13,
              fontWeight: 1000,
              textTransform: "uppercase",
            }}
          >
            Private internal mockup below
          </div>
          <div
            style={{
              marginTop: 4,
              color: "#EAF3FF",
              fontSize: 14,
              fontWeight: 800,
              lineHeight: 1.45,
            }}
          >
            Open the drawer below only for signed-in review and repair.
          </div>
        </div>
      </div>
    </section>
  );
}
