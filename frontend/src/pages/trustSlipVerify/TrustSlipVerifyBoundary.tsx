import React from "react";
import { GsnLegacyIcon } from "../../components/GsnLegacyIcon";
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

function boundaryIcon(name: "document" | "lock", compact: boolean) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: compact ? 46 : 54,
        height: compact ? 46 : 54,
        minWidth: compact ? 46 : 54,
        borderRadius: 18,
        display: "inline-grid",
        placeItems: "center",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,251,255,0.72))",
        border: "1px solid rgba(255,255,255,0.54)",
        boxShadow:
          "0 12px 26px rgba(2,8,23,0.18), inset 0 1px 0 rgba(255,255,255,0.94)",
      }}
    >
      <GsnLegacyIcon
        name={name}
        size={compact ? 42 : 50}
        imageStyle={{
          filter: "drop-shadow(0 8px 10px rgba(2,8,23,0.22))",
          transform: "scale(1.08)",
        }}
      />
    </span>
  );
}

export default function TrustSlipVerifyBoundary({
  compact,
}: TrustSlipVerifyBoundaryProps) {
  return (
    <section
      aria-label="Public sharing boundary"
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: compact ? "46px minmax(0, 1fr)" : "54px minmax(0, 1fr)",
            gap: 10,
            alignItems: "center",
          }}
        >
          {boundaryIcon("document", compact)}
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: compact ? "46px minmax(0, 1fr)" : "54px minmax(0, 1fr)",
            gap: 10,
            alignItems: "center",
            textAlign: compact ? "left" : "right",
          }}
        >
          {boundaryIcon("lock", compact)}
          <div>
          <div
            style={{
              color: "#FCA5A5",
              fontSize: 13,
              fontWeight: 1000,
              textTransform: "uppercase",
            }}
          >
            Private review area below
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
            Open the drawer below only when signed-in review or repair is needed.
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
