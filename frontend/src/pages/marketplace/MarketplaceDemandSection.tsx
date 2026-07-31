import React from "react";

import { GsnLegacyIcon, type GsnIconName } from "../../components/GsnLegacyIcon";
import { StableButton } from "../../components/StableButton";
import { marketplaceSectionStyle } from "../../lib/marketplaceActionStability";

type MarketplaceDemandSectionProps = {
  isCompact: boolean;
  isOpen: boolean;
  activeCommunityId: number;
  activeCommunityName: string;
  currentGmfnId: string;
  marketplaceSurfaceTouchProps: (debugId: string) => Record<string, unknown>;
  onToggleDemand: (event: React.MouseEvent<HTMLButtonElement>) => void;
  openMarketplaceCta: (
    event: React.MouseEvent<HTMLButtonElement>,
    intent: "demandBox"
  ) => void;
};

type MarketplaceGlyphName = "demand";

const MARKETPLACE_GLYPH_ICON_MAP = {
  demand: "marketplace",
} satisfies Record<MarketplaceGlyphName, GsnIconName>;

function MarketplaceGlyph({
  name,
  size = 24,
}: {
  name: MarketplaceGlyphName;
  size?: number;
}) {
  return (
    <GsnLegacyIcon
      name={MARKETPLACE_GLYPH_ICON_MAP[name]}
      size={Math.max(size, Math.round(size * 1.15))}
      decorative
      style={{ display: "inline-grid", flex: "0 0 auto" }}
    />
  );
}

function marketplaceSurface(bg: string): string {
  if (bg === "#FFFFFF") {
    return "linear-gradient(180deg, #FFFFFF 0%, rgba(248,251,255,0.96) 100%)";
  }
  if (bg === "#FCFEFF") {
    return "linear-gradient(180deg, #FCFEFF 0%, rgba(245,249,253,0.96) 100%)";
  }
  if (bg === "#F8FBFF") {
    return "linear-gradient(180deg, #F8FBFF 0%, rgba(237,244,250,0.96) 100%)";
  }
  return bg;
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--gsn-border)",
    background: marketplaceSurface(bg),
    padding: 18,
    boxShadow: "var(--shadow-card)",
    backdropFilter: "blur(8px)",
    overflow: "hidden",
    overflowAnchor: "none",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#173750",
    fontWeight: 900,
    letterSpacing: 0,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#4A6178",
    fontSize: 14,
    lineHeight: 1.55,
  };
}

function badgeStyle(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 28,
    borderRadius: 999,
    padding: "6px 10px",
    border: primary
      ? "1px solid rgba(34,82,120,0.10)"
      : "1px solid rgba(16,37,59,0.08)",
    background: primary
      ? "linear-gradient(180deg, rgba(224,236,248,0.96) 0%, rgba(208,224,239,0.92) 100%)"
      : "linear-gradient(180deg, rgba(236,243,250,0.94) 0%, rgba(222,233,244,0.9) 100%)",
    color: primary ? "#1E4868" : "#42596F",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.72), 0 8px 14px rgba(17,42,70,0.04)",
  };
}

function badge(primary = false): React.CSSProperties {
  return badgeStyle(primary);
}

function stableStatusPillStyle(primary = false): React.CSSProperties {
  return {
    ...badgeStyle(primary),
    height: 34,
    minHeight: 34,
    maxHeight: 34,
    maxWidth: "100%",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  };
}

function marketplaceOsIconStyle(bg: string, small = false): React.CSSProperties {
  return {
    width: small ? 46 : 56,
    height: small ? 46 : 56,
    minWidth: small ? 46 : 56,
    borderRadius: small ? 16 : 20,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: bg,
    color: "#FFFFFF",
    boxShadow:
      "0 14px 24px rgba(9,33,55,0.18), inset 0 1px 0 rgba(255,255,255,0.24)",
  };
}

function marketplaceActionStyle(
  kind: "primary" | "secondary" | "soft" = "secondary",
  disabled = false
): React.CSSProperties {
  if (kind === "soft") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 42,
      padding: "0 13px",
      borderRadius: 14,
      border: "1px solid rgba(16,37,59,0.08)",
      background: "rgba(244,248,252,0.94)",
      color: "#244359",
      fontWeight: 900,
      fontSize: 13,
      lineHeight: 1.15,
      textAlign: "center",
      textDecoration: "none",
      cursor: "pointer",
      whiteSpace: "nowrap",
      overflowWrap: "normal",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.72)",
    };
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    minHeight: 56,
    maxHeight: 56,
    padding: "0 15px",
    borderRadius: 14,
    border: disabled
      ? "1px solid rgba(66,87,106,0.42)"
      : "1px solid rgba(255,255,255,0.18)",
    background: disabled
      ? "linear-gradient(180deg, #DDE8F1 0%, #C5D6E4 58%, #AFC3D3 100%)"
      : "linear-gradient(180deg, var(--primary-accent) 0%, #0b5f43 100%)",
    color: disabled ? "#34495F" : "var(--gsn-text-inverse)",
    fontWeight: 900,
    fontSize: 13,
    lineHeight: 1.15,
    textAlign: "center",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
    overflowWrap: "normal",
    opacity: disabled ? 0.76 : 1,
    boxShadow: disabled
      ? "inset 0 1px 0 rgba(255,255,255,0.5)"
      : "0 12px 22px rgba(8,117,78,0.22), inset 0 1px 0 rgba(255,255,255,0.16)",
  };
}

function marketplaceInlineActionStyle(
  kind: "primary" | "secondary" | "soft" = "secondary",
  disabled = false,
  isCompact = false
): React.CSSProperties {
  return {
    ...marketplaceActionStyle(kind, disabled),
    width: "100%",
    minWidth: 0,
    height: isCompact ? 50 : 54,
    minHeight: isCompact ? 50 : 54,
    maxHeight: isCompact ? 50 : 54,
  };
}

function marketplaceDepartmentShellStyle(
  tone: "demand",
  isCompact: boolean
): React.CSSProperties {
  const toneStyle = {
    border: "1px solid rgba(214,170,69,0.24)",
    background:
      "linear-gradient(180deg, rgba(255,253,247,0.99) 0%, rgba(250,244,226,0.95) 100%)",
    shadow: "0 16px 34px rgba(184,135,30,0.09)",
  };

  return {
    marginTop: 12,
    borderRadius: isCompact ? 18 : 20,
    border: toneStyle.border,
    background: toneStyle.background,
    padding: isCompact ? 12 : 14,
    boxShadow: toneStyle.shadow,
    overflow: "hidden",
  };
}

export default function MarketplaceDemandSection({
  isCompact,
  isOpen,
  activeCommunityId,
  activeCommunityName,
  currentGmfnId,
  marketplaceSurfaceTouchProps,
  onToggleDemand,
  openMarketplaceCta,
}: MarketplaceDemandSectionProps) {
  return (
    <section
      id="marketplace-demand-box"
      style={{ ...pageCard("#FFFDF7"), ...marketplaceSectionStyle(), order: 5 }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            minWidth: 0,
          }}
        >
          <span
            aria-hidden="true"
            style={marketplaceOsIconStyle(
              "linear-gradient(180deg, #D7A22D 0%, #805A0F 100%)",
              true
            )}
          >
            <MarketplaceGlyph name="demand" size={26} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: "#08233A",
                fontSize: isCompact ? 20 : 24,
                fontWeight: 950,
                lineHeight: 1.08,
                overflowWrap: "break-word",
              }}
            >
              Demand Box
            </div>
            <div style={{ marginTop: 6, ...helperText() }}>
              Local needs and offers, separate from ROSCA savings and Support
              requests.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={badge(true)}>Standalone lane</span>
          <StableButton
            debugId="marketplace.demand.toggle"
            type="button"
            onClick={onToggleDemand}
            style={marketplaceActionStyle("soft")}
          >
            {isOpen ? "Collapse" : "Open"}
          </StableButton>
        </div>
      </div>

      {isOpen ? (
        <div
          {...marketplaceSurfaceTouchProps("marketplace.demand.module")}
          style={marketplaceDepartmentShellStyle("demand", isCompact)}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) 190px",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={sectionLabel()}>Local needs and offers</div>
              <div style={{ marginTop: 6, ...helperText(), fontSize: 13 }}>
                Use this when people here should see what is needed, wanted,
                available, or being sourced inside this community market.
              </div>
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={stableStatusPillStyle(Boolean(activeCommunityName))}>
                  {activeCommunityName || "Select marketplace"}
                </span>
                <span style={stableStatusPillStyle(Boolean(activeCommunityId))}>
                  ID: {activeCommunityId || "not ready"}
                </span>
                <span style={stableStatusPillStyle(Boolean(currentGmfnId))}>
                  GSN ID: {currentGmfnId || "not ready"}
                </span>
              </div>
            </div>

            <StableButton
              debugId="marketplace.demand.open"
              type="button"
              onClick={(event) => openMarketplaceCta(event, "demandBox")}
              style={{
                ...marketplaceInlineActionStyle("primary", false, isCompact),
                gridColumn: isCompact ? "1 / -1" : undefined,
              }}
            >
              Open Demand Box
            </StableButton>
          </div>
        </div>
      ) : null}
    </section>
  );
}
