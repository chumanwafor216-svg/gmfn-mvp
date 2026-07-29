import React from "react";
import { StableButton, StableCtaLink } from "../../components/StableButton";
import { StableDisclosureSummary } from "../../components/StableButton";
import { GsnLegacyIcon, type GsnIconName } from "../../components/GsnLegacyIcon";
import { marketplaceSectionStyle } from "../../lib/marketplaceActionStability";

type MarketplaceMemberRow = {
  name: string;
  gmfnId?: string;
  userId?: number | string;
  shopTo?: string;
};

type MarketplaceCommunityDomainRow = {
  key: string;
  id: number;
  name: string;
  code: string;
  role: string;
  status: string;
  verification: string;
  clanId: number;
  marketplaceReady: boolean;
  dashboardPath: string;
  marketplacePath: string;
};

type Props = {
  isCompact: boolean;
  memberRows: MarketplaceMemberRow[];
  visibleTradeMemberRows: MarketplaceMemberRow[];
  hiddenTradeMemberRows: MarketplaceMemberRow[];
  visibleTradeShopCount: number;
  marketplaceCommunityDomainRows: MarketplaceCommunityDomainRow[];
  marketplaceSurfaceTouchProps: (debugId: string) => Record<string, unknown>;
  onToggleMembers: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onOpenCommunityDomain: (
    event: React.SyntheticEvent<HTMLElement> | undefined,
    row: MarketplaceCommunityDomainRow
  ) => void | Promise<void>;
};

type MarketplaceGlyphName = "members" | "shop" | "trade";

const MARKETPLACE_GLYPH_ICON_MAP = {
  members: "community",
  shop: "marketplace",
  trade: "marketplace",
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
    return "linear-gradient(180deg, var(--gsn-white) 0%, var(--gsn-blue-50) 54%, var(--gsn-surface-blue) 100%)";
  }

  if (bg === "#FCFEFF") {
    return "linear-gradient(180deg, var(--gsn-off-white) 0%, var(--gsn-blue-50) 100%)";
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

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 15,
    border: "1px solid var(--gsn-border)",
    background: marketplaceSurface(bg),
    padding: 13,
    boxShadow: "var(--shadow-soft)",
    backdropFilter: "blur(5px)",
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
      "inset 0 1px 0 rgba(255,255,255,0.72), 0 6px 14px rgba(10,24,49,0.05)",
  };
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

function marketplaceActionStyle(
  kind: "primary" | "secondary" | "soft" = "secondary",
  disabled = false
): React.CSSProperties {
  if (kind === "soft") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      height: 56,
      minHeight: 56,
      maxHeight: 56,
      padding: "0 14px",
      borderRadius: 13,
      border: disabled
        ? "1px solid rgba(66,87,106,0.40)"
        : "1px solid rgba(8,35,58,0.34)",
      background: disabled
        ? "linear-gradient(180deg, #E0EAF2 0%, #CBDCE8 52%, #B5C9DA 100%)"
        : "linear-gradient(180deg, #EFF6FB 0%, #D8E8F5 46%, #BFD7EA 100%)",
      color: disabled ? "#34495F" : "#08233A",
      fontWeight: 900,
      fontSize: 12,
      lineHeight: 1.15,
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "nowrap",
      overflowWrap: "normal",
      wordBreak: "normal",
      hyphens: "none",
      textOverflow: "ellipsis",
      opacity: 1,
      boxShadow: disabled
        ? "0 9px 16px rgba(8,35,58,0.10), inset 0 1px 0 rgba(255,255,255,0.76), inset 0 -2px 0 rgba(8,35,58,0.12)"
        : "0 10px 18px rgba(8,35,58,0.10), inset 0 1px 0 rgba(255,255,255,0.84), inset 0 -2px 0 rgba(8,35,58,0.12)",
      touchAction: "manipulation",
      WebkitTapHighlightColor: "transparent",
      userSelect: "none",
      WebkitUserSelect: "none",
      boxSizing: "border-box",
      appearance: "none",
      WebkitAppearance: "none",
      pointerEvents: "auto",
      overflow: "hidden",
      transform: "none",
      translate: "none",
      scale: "none",
      flexShrink: 0,
      overflowAnchor: "none",
      transition: "none",
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
      : "1px solid rgba(6,24,39,0.42)",
    background: disabled
      ? "linear-gradient(180deg, #DDE8F1 0%, #C5D6E4 58%, #AFC3D3 100%)"
      : "linear-gradient(180deg, #0B2D4A 0%, #08233A 62%, #061827 100%)",
    color: disabled ? "#34495F" : "#FFFFFF",
    fontWeight: 900,
    fontSize: 13,
    lineHeight: 1.15,
    textAlign: "center",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
    textOverflow: "ellipsis",
    opacity: 1,
    boxShadow: disabled
      ? "0 10px 18px rgba(8,35,58,0.12), inset 0 1px 0 rgba(255,255,255,0.70), inset 0 -2px 0 rgba(8,35,58,0.14)"
      : "0 13px 22px rgba(6,24,39,0.22), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -2px 0 rgba(0,0,0,0.18)",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    WebkitUserSelect: "none",
    boxSizing: "border-box",
    appearance: "none",
    WebkitAppearance: "none",
    pointerEvents: "auto",
    overflow: "hidden",
    transform: "none",
    translate: "none",
    scale: "none",
    flexShrink: 0,
    overflowAnchor: "none",
    transition: "none",
  };
}

function marketplaceOsIconStyle(bg: string, isCompact = false): React.CSSProperties {
  return {
    width: isCompact ? 42 : 46,
    height: isCompact ? 42 : 46,
    borderRadius: isCompact ? 14 : 15,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,251,255,0.96) 100%)",
    border: "1px solid rgba(13,95,168,0.12)",
    color: "#0B2D4A",
    fontSize: isCompact ? 20 : 22,
    boxShadow:
      "0 10px 18px rgba(10,24,49,0.09), inset 4px 0 0 rgba(214,170,69,0.16), inset 0 1px 0 rgba(255,255,255,0.96)",
    outline: `1px solid ${
      bg.includes("#25A65A")
        ? "rgba(46,155,98,0.10)"
        : "rgba(214,170,69,0.08)"
    }`,
    outlineOffset: -2,
  };
}

function marketplaceLinkRowStyle(isCompact: boolean, expanded = false): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    borderRadius: isCompact ? 20 : 22,
    border: expanded
      ? "1.5px solid rgba(27,102,210,0.45)"
      : "1px solid rgba(16,37,59,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,251,255,0.98) 100%)",
    boxShadow: expanded
      ? "0 16px 32px rgba(27,102,210,0.10), inset 0 1px 0 rgba(255,255,255,0.9)"
      : "0 12px 24px rgba(10,24,49,0.065), inset 0 1px 0 rgba(255,255,255,0.9)",
    padding: isCompact ? 9 : 14,
    display: "grid",
    gap: isCompact ? 8 : expanded ? 12 : 10,
    overflow: expanded ? "visible" : "hidden",
    overflowAnchor: "none",
    transition: "none",
  };
}

function marketplaceLinkRowHeaderStyle(isCompact: boolean): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    display: "grid",
    gridTemplateColumns: isCompact
      ? "44px minmax(0, 1fr)"
      : "58px minmax(0, 1fr) auto",
    gridTemplateRows: isCompact ? "auto auto" : undefined,
    gap: isCompact ? 8 : 14,
    alignItems: "center",
    overflow: "hidden",
  };
}

function marketplaceLinkRowIconStyle(
  tone: "blue" | "gold" | "green" | "purple" | "navy",
  isCompact: boolean
): React.CSSProperties {
  const accents = {
    blue: "rgba(27,102,210,0.22)",
    gold: "rgba(214,170,69,0.24)",
    green: "rgba(37,166,90,0.18)",
    purple: "rgba(106,68,216,0.17)",
    navy: "rgba(11,45,74,0.16)",
  };

  return {
    width: isCompact ? 44 : 58,
    height: isCompact ? 44 : 58,
    borderRadius: isCompact ? 13 : 16,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#0B2D4A",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,251,255,0.96) 100%)",
    border: "1px solid rgba(13,95,168,0.12)",
    boxShadow: `0 12px 22px rgba(10,24,49,0.10), inset 4px 0 0 ${accents[tone]}, inset 0 1px 0 rgba(255,255,255,0.96)`,
    flexShrink: 0,
  };
}

function marketplaceLinkRowTitleStyle(isCompact: boolean): React.CSSProperties {
  return {
    minWidth: 0,
    maxWidth: "100%",
    color: "#07172C",
    fontSize: isCompact ? 17 : 23,
    lineHeight: 1.08,
    fontWeight: 950,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    overflowWrap: "break-word",
    wordBreak: "normal",
    hyphens: "none",
  };
}

function marketplaceLinkRowSubStyle(isCompact: boolean): React.CSSProperties {
  return {
    minWidth: 0,
    maxWidth: "100%",
    marginTop: 3,
    color: "#516579",
    fontSize: isCompact ? 12 : 15,
    lineHeight: 1.18,
    fontWeight: 760,
    display: "-webkit-box",
    WebkitLineClamp: isCompact ? 2 : 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    overflowWrap: "break-word",
    wordBreak: "normal",
    hyphens: "none",
  };
}

function marketplaceLinkRowStatusStyle(
  tone: "ready" | "warn" | "idle" = "ready",
  isCompact = false
): React.CSSProperties {
  const colors = {
    ready: {
      color: "#12633F",
      bg: "linear-gradient(180deg, #EEFBF4 0%, #D9F0E3 100%)",
      border: "1px solid rgba(46,155,98,0.18)",
    },
    warn: {
      color: "#8A5A05",
      bg: "linear-gradient(180deg, #FFF9E8 0%, #F6E6C3 100%)",
      border: "1px solid rgba(214,170,69,0.28)",
    },
    idle: {
      color: "#45586C",
      bg: "linear-gradient(180deg, #F5F8FC 0%, #E9EEF6 100%)",
      border: "1px solid rgba(16,37,59,0.08)",
    },
  };

  return {
    ...stableStatusPillStyle(tone === "ready"),
    height: isCompact ? 28 : 30,
    minHeight: isCompact ? 28 : 30,
    maxHeight: isCompact ? 28 : 30,
    padding: "0 9px",
    color: colors[tone].color,
    background: colors[tone].bg,
    border: colors[tone].border,
    justifyContent: "center",
    gridColumn: isCompact ? "2 / 3" : undefined,
    justifySelf: isCompact ? "start" : undefined,
    maxWidth: isCompact ? "100%" : undefined,
    whiteSpace: "nowrap",
  };
}

function marketplaceLinkChooserButtonStyle(
  isCompact: boolean,
  primary = false
): React.CSSProperties {
  return {
    ...marketplaceActionStyle(primary ? "primary" : "soft"),
    width: "100%",
    minWidth: 0,
    height: isCompact ? 68 : 88,
    minHeight: isCompact ? 68 : 88,
    maxHeight: isCompact ? 68 : 88,
    borderRadius: isCompact ? 18 : 20,
    padding: isCompact ? "9px 10px" : "12px 13px",
    display: "grid",
    gridTemplateColumns: isCompact ? "44px minmax(0, 1fr)" : "58px minmax(0, 1fr)",
    gap: 9,
    alignItems: "center",
    justifyContent: "stretch",
    textAlign: "left",
    overflow: "hidden",
    overflowAnchor: "none",
    transition: "none",
  };
}

function marketplaceLinkChooserTextStyle(): React.CSSProperties {
  return {
    minWidth: 0,
    maxWidth: "100%",
    display: "grid",
    gap: 3,
    overflow: "hidden",
  };
}

function marketplaceLinkChooserTitleStyle(isCompact: boolean): React.CSSProperties {
  return {
    minWidth: 0,
    maxWidth: "100%",
    color: "#07172C",
    fontSize: isCompact ? 15 : 17,
    lineHeight: 1.08,
    fontWeight: 950,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };
}

function marketplaceLinkChooserDetailStyle(isCompact: boolean): React.CSSProperties {
  return {
    minWidth: 0,
    maxWidth: "100%",
    color: "#516579",
    fontSize: isCompact ? 11.5 : 12.5,
    lineHeight: 1.18,
    fontWeight: 760,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };
}

function marketplaceDepartmentShellStyle(
  tone: "members",
  isCompact: boolean
): React.CSSProperties {
  void tone;
  return {
    marginTop: isCompact ? 14 : 16,
    borderRadius: isCompact ? 18 : 22,
    border: "1px solid rgba(37,166,90,0.20)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(241,250,245,0.95) 100%)",
    padding: isCompact ? 12 : 14,
    boxShadow: "0 16px 34px rgba(37,166,90,0.09)",
    display: "grid",
    gap: isCompact ? 10 : 12,
    overflow: "hidden",
    overflowAnchor: "none",
  };
}

function marketplaceDepartmentHeaderStyle(
  isCompact: boolean
): React.CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    gap: isCompact ? 8 : 10,
    alignItems: "center",
    flexWrap: "wrap",
    paddingBottom: isCompact ? 8 : 10,
    borderBottom: "1px solid rgba(16,37,59,0.08)",
  };
}

function marketplaceInlineActionStyle(
  kind: "primary" | "secondary" | "soft",
  disabled: boolean,
  isCompact: boolean
): React.CSSProperties {
  return {
    ...marketplaceActionStyle(kind, disabled),
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    height: isCompact ? 56 : 58,
    minHeight: isCompact ? 56 : 58,
    maxHeight: isCompact ? 56 : 58,
    padding: isCompact ? "0 10px" : "0 11px",
    pointerEvents: "auto",
    touchAction: "manipulation",
    overflowAnchor: "none",
    whiteSpace: "normal",
    overflow: "hidden",
    textOverflow: "clip",
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
    transition: "none",
    fontSize: isCompact ? 12.5 : undefined,
    lineHeight: 1.08,
  };
}

function displayGsnLabel(value: unknown): string {
  const text = String(value || "").trim();
  if (!text) return "GSN ID pending";
  return text.toUpperCase().startsWith("GSN-") ? text : `GSN-${text}`;
}

function memberCardStyle(
  row: MarketplaceMemberRow,
  isCompact: boolean
): React.CSSProperties {
  return {
    borderRadius: isCompact ? 14 : 16,
    border: "1px solid rgba(16,37,59,0.08)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,252,255,0.98) 100%)",
    padding: isCompact ? 10 : 12,
    overflow: "hidden",
    display: "grid",
    gridTemplateColumns: row.shopTo
      ? isCompact
        ? "38px minmax(0, 1fr)"
        : "42px minmax(0, 1fr) 130px"
      : isCompact
        ? "38px minmax(0, 1fr)"
        : "42px minmax(0, 1fr)",
    gap: isCompact ? 8 : 10,
    alignItems: "center",
  };
}

function memberIconStyle(
  row: MarketplaceMemberRow,
  isCompact: boolean
): React.CSSProperties {
  return {
    width: isCompact ? 38 : 42,
    height: isCompact ? 38 : 42,
    borderRadius: isCompact ? 13 : 14,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 auto",
    color: "#FFFFFF",
    background: row.shopTo
      ? "linear-gradient(180deg, #D7A22D 0%, #805A0F 100%)"
      : "linear-gradient(180deg, #244969 0%, #061827 100%)",
    boxShadow:
      "0 10px 18px rgba(10,24,49,0.11), inset 0 1px 0 rgba(255,255,255,0.22)",
  };
}


export default function MarketplaceMembersSection({
  isCompact,
  memberRows,
  visibleTradeMemberRows,
  hiddenTradeMemberRows,
  visibleTradeShopCount,
  marketplaceCommunityDomainRows,
  marketplaceSurfaceTouchProps,
  onToggleMembers,
  onOpenCommunityDomain,
}: Props) {
  return (
    <section
      id="marketplace-members-shops"
      style={{ ...pageCard("#FFFFFF"), ...marketplaceSectionStyle(), order: 4 }}
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
            <MarketplaceGlyph name="members" size={26} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={sectionLabel()}>Community Members & Shops</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              See Community Domains, known members, and visible shops inside
              this selected marketplace. Open a shop record for current
              evidence before you act.
            </div>
          </div>
        </div>

        <StableButton
          debugId="marketplace.members.toggle"
          type="button"
          onClick={onToggleMembers}
          style={marketplaceActionStyle("soft")}
        >
          Collapse
        </StableButton>
      </div>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span style={stableStatusPillStyle(memberRows.length > 0)}>
          {memberRows.length} visible member{memberRows.length === 1 ? "" : "s"}
        </span>
        <span style={stableStatusPillStyle(visibleTradeShopCount > 0)}>
          {visibleTradeShopCount} public shop{visibleTradeShopCount === 1 ? "" : "s"}
        </span>
        <span style={stableStatusPillStyle(marketplaceCommunityDomainRows.length > 0)}>
          {marketplaceCommunityDomainRows.length} domain
          {marketplaceCommunityDomainRows.length === 1 ? "" : "s"}
        </span>
        <span style={stableStatusPillStyle(true)}>Community-bound directory</span>
      </div>

      {marketplaceCommunityDomainRows.length ? (
        <div
          style={{
            ...marketplaceLinkRowStyle(isCompact, true),
            marginTop: 12,
            marginBottom: 12,
          }}
        >
          <div style={marketplaceLinkRowHeaderStyle(isCompact)}>
            <span
              aria-hidden="true"
              style={marketplaceLinkRowIconStyle("gold", isCompact)}
            >
              <MarketplaceGlyph name="shop" size={isCompact ? 25 : 30} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={sectionLabel()}>Community Domains</div>
              <div style={marketplaceLinkRowTitleStyle(isCompact)}>
                Professional marketplace communities
              </div>
              <div style={marketplaceLinkRowSubStyle(isCompact)}>
                They sit with community members and shops. Setup stays in the
                Community Domain dashboard.
              </div>
            </div>
            <span
              style={marketplaceLinkRowStatusStyle(
                marketplaceCommunityDomainRows.some((row) => row.marketplaceReady)
                  ? "ready"
                  : "idle",
                isCompact
              )}
            >
              {marketplaceCommunityDomainRows.length} linked
            </span>
          </div>
          <div
            style={{
              marginTop: 10,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 10,
            }}
          >
            {marketplaceCommunityDomainRows.slice(0, 4).map((row) => (
              <StableButton
                key={row.key}
                debugId={`marketplace.domain.${row.id || row.key}.open`}
                type="button"
                stableHeight={isCompact ? 76 : 86}
                onClick={(event) => {
                  void onOpenCommunityDomain(event, row);
                }}
                style={marketplaceLinkChooserButtonStyle(isCompact)}
              >
                <span
                  aria-hidden="true"
                  style={marketplaceLinkRowIconStyle(
                    row.marketplaceReady ? "gold" : "navy",
                    isCompact
                  )}
                >
                  <MarketplaceGlyph name="shop" size={isCompact ? 24 : 28} />
                </span>
                <span style={marketplaceLinkChooserTextStyle()}>
                  <span style={marketplaceLinkChooserTitleStyle(isCompact)}>
                    {row.name}
                  </span>
                  <span style={marketplaceLinkChooserDetailStyle(isCompact)}>
                    {row.marketplaceReady
                      ? `Open marketplace | ${row.code}`
                      : `Finish setup | ${row.code}`}
                  </span>
                </span>
              </StableButton>
            ))}
          </div>
        </div>
      ) : null}

      <div
        {...marketplaceSurfaceTouchProps("marketplace.members.visible-members-module")}
        style={marketplaceDepartmentShellStyle("members", isCompact)}
      >
        <div style={marketplaceDepartmentHeaderStyle(isCompact)}>
          <div style={sectionLabel()}>Visible members</div>
          <span style={stableStatusPillStyle(hiddenTradeMemberRows.length === 0)}>
            {hiddenTradeMemberRows.length > 0
              ? `${hiddenTradeMemberRows.length} more tucked away`
              : "Full visible list shown"}
          </span>
        </div>

        {memberRows.length === 0 ? (
          <div style={{ ...innerCard("#FCFEFF"), color: "#64748B", lineHeight: 1.6 }}>
            No members are visible in this marketplace yet.
          </div>
        ) : (
          visibleTradeMemberRows.map((row, index) => (
            <MemberRowCard
              key={`${row.gmfnId || row.userId || index}`}
              row={row}
              isCompact={isCompact}
            />
          ))
        )}

        {hiddenTradeMemberRows.length > 0 ? (
          <details
            style={{
              ...innerCard("#FFFFFF"),
              padding: 0,
              overflow: "hidden",
            }}
          >
            <StableDisclosureSummary
              debugId="marketplace.members.more-visible.summary"
              stableHeight={50}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "0 12px",
                color: "#173750",
                fontSize: isCompact ? 13 : 14,
                fontWeight: 950,
                background:
                  "linear-gradient(180deg, rgba(236,243,250,0.96) 0%, rgba(222,233,244,0.92) 100%)",
              }}
            >
              <span>More visible members</span>
              <span>{hiddenTradeMemberRows.length}</span>
            </StableDisclosureSummary>
            <div
              style={{
                padding: 10,
                display: "grid",
                gap: 8,
              }}
            >
              {hiddenTradeMemberRows.map((row, index) => (
                <MemberRowCard
                  key={`${
                    row.gmfnId || row.userId || visibleTradeMemberRows.length + index
                  }`}
                  row={row}
                  isCompact={isCompact}
                />
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
}

function MemberRowCard({
  row,
  isCompact,
}: {
  row: MarketplaceMemberRow;
  isCompact: boolean;
}) {
  return (
    <div style={memberCardStyle(row, isCompact)}>
      <span aria-hidden="true" style={memberIconStyle(row, isCompact)}>
        <MarketplaceGlyph name={row.shopTo ? "trade" : "members"} size={20} />
      </span>

      <div style={{ minWidth: 0, display: "grid", gap: 5 }}>
        <div
          style={{
            color: "#0B1F33",
            fontSize: isCompact ? 14 : 16,
            fontWeight: 950,
            lineHeight: 1.18,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflowWrap: "break-word",
            wordBreak: "normal",
          }}
        >
          {row.name}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            minWidth: 0,
          }}
        >
          <span
            style={{
              ...stableStatusPillStyle(Boolean(row.gmfnId)),
              height: "auto",
              maxHeight: "none",
              minHeight: 30,
              whiteSpace: "normal",
              overflowWrap: "anywhere",
            }}
          >
            {row.gmfnId ? displayGsnLabel(row.gmfnId) : "Not issued yet"}
          </span>
          <span
            style={{
              ...stableStatusPillStyle(Boolean(row.shopTo)),
              height: "auto",
              maxHeight: "none",
              minHeight: 30,
              whiteSpace: "normal",
            }}
          >
            {row.shopTo ? "Shop visible" : "No shop yet"}
          </span>
        </div>
      </div>

      {row.shopTo ? (
        <StableCtaLink
          debugId={`marketplace.member.${row.gmfnId || row.userId || "unknown"}.shop`}
          to={row.shopTo}
          stableHeight={52}
          style={{
            ...marketplaceInlineActionStyle("secondary", false, isCompact),
            gridColumn: isCompact ? "1 / -1" : undefined,
          }}
        >
          Open shop
        </StableCtaLink>
      ) : null}
    </div>
  );
}
