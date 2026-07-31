import React from "react";

import { GsnLegacyIcon, type GsnIconName } from "../../components/GsnLegacyIcon";
import { StableButton, StableCtaLink } from "../../components/StableButton";
import { marketplaceSectionStyle } from "../../lib/marketplaceActionStability";
import type {
  CommunityMoneySettlement,
  CommunityMoneySurface,
} from "../../lib/communityMoney";

type PayInAccountDraft = {
  accountName: string;
  bankName: string;
  accountNumber: string;
  sortCode: string;
  country: string;
  currency: string;
  note: string;
};

type MarketplaceMoneySectionProps = {
  isCompact: boolean;
  isOpen: boolean;
  visiblePoolAmount: string;
  visiblePoolCurrency: string;
  communitySettlementReady: boolean;
  payoutReady: boolean;
  moneySurface: CommunityMoneySurface | null;
  marketplaceMoneyOutTo: string;
  payInEditorOpen: boolean;
  payInAccountDraft: PayInAccountDraft;
  savingPayInAccount: boolean;
  onToggleMoney: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onTogglePayInEditor: () => void;
  onUpdatePayInAccountDraft: (field: keyof PayInAccountDraft, value: string) => void;
  onSavePayInAccount: () => void;
  onClosePayInEditor: () => void;
  openMarketplaceCta: (event: React.MouseEvent<HTMLButtonElement>, intent: "moneyIn") => void;
};

type MarketplaceGlyphName =
  | "bank"
  | "card"
  | "cash"
  | "chart"
  | "chevron"
  | "chevronUp"
  | "eye"
  | "pool"
  | "verify";

const MARKETPLACE_GLYPH_ICON_MAP = {
  bank: "financeInstitution",
  card: "card",
  cash: "wallet",
  chart: "financeInstitution",
  chevron: "navigation",
  chevronUp: "navigation",
  eye: "eye",
  pool: "financeInstitution",
  verify: "evidence",
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

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function firstTruthy(...values: unknown[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function settlementSummary(settlement: CommunityMoneySettlement | null): string {
  if (!settlement) return "Community account not ready";

  return firstTruthy(
    settlement.bankName,
    settlement.accountName,
    settlement.accountNumber,
    "Community account ready"
  );
}

function payoutSummary(surface: CommunityMoneySurface | null): string {
  return firstTruthy(
    surface?.payoutDestination?.destinationName,
    surface?.payoutDestination?.bankName,
    surface?.payoutDestination?.accountNumber,
    "Personal payout not ready"
  );
}

function marketplaceSurface(bg: string): string {
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
  if (kind === "primary") {
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
    border: "1px solid rgba(16,37,59,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(237,244,250,0.96) 100%)",
    color: "#10253B",
    fontWeight: 900,
    fontSize: 13,
    lineHeight: 1.15,
    textAlign: "center",
    textDecoration: "none",
    cursor: "pointer",
    whiteSpace: "nowrap",
    overflowWrap: "normal",
    boxShadow:
      "0 10px 18px rgba(10,24,49,0.08), inset 0 1px 0 rgba(255,255,255,0.85)",
  };
}

function marketplaceLinkMiniIconStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
    flexShrink: 0,
  };
}

function marketplaceInlineActionsStyle(
  isCompact: boolean
): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    marginTop: isCompact ? 8 : 12,
    display: "grid",
    gridTemplateColumns: isCompact
      ? "repeat(2, minmax(0, 1fr))"
      : "repeat(auto-fit, minmax(168px, 1fr))",
    gridAutoRows: isCompact ? "56px" : "58px",
    gap: 8,
    alignItems: "stretch",
    alignContent: "start",
    justifyItems: "stretch",
    overflow: "hidden",
    overflowAnchor: "none",
    transition: "none",
  };
}

function marketplaceInlineActionStyle(
  kind: "primary" | "secondary" | "soft",
  disabled: boolean,
  _isCompact: boolean
): React.CSSProperties {
  return {
    ...marketplaceActionStyle(kind, disabled),
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    height: _isCompact ? 56 : 58,
    minHeight: _isCompact ? 56 : 58,
    maxHeight: _isCompact ? 56 : 58,
    padding: _isCompact ? "0 10px" : "0 11px",
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
    fontSize: _isCompact ? 12.5 : undefined,
    lineHeight: 1.08,
  };
}

function marketplaceMoneyPanelStyle(isCompact: boolean): React.CSSProperties {
  return {
    marginTop: isCompact ? 12 : 16,
    display: "grid",
    gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "1fr",
    gap: isCompact ? 8 : 12,
    overflowAnchor: "none",
    transition: "none",
  };
}

function marketplaceMoneyRouteCardStyle(
  isCompact: boolean,
  wide = false
): React.CSSProperties {
  return {
    minHeight: isCompact ? (wide ? 84 : 112) : 150,
    gridColumn: isCompact && wide ? "1 / -1" : undefined,
    borderRadius: isCompact ? 16 : 24,
    border: "1px solid rgba(16,37,59,0.08)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,252,255,0.98) 100%)",
    boxShadow:
      "0 16px 30px rgba(10,24,49,0.075), inset 0 1px 0 rgba(255,255,255,0.92)",
    padding: isCompact ? "10px" : "22px 24px",
    display: "grid",
    gridTemplateColumns: isCompact
      ? wide
        ? "42px minmax(0, 1fr) auto"
        : "38px minmax(0, 1fr)"
      : "92px minmax(0, 1fr) auto",
    gridTemplateAreas: isCompact
      ? wide
        ? '"icon text status"'
        : '"icon status" "text text"'
      : '"icon text status"',
    gap: isCompact ? "9px" : "14px 24px",
    alignItems: "center",
    overflow: "hidden",
    overflowAnchor: "none",
    transform: "none",
    transition: "none",
  };
}

function marketplaceMoneyIconBubbleStyle(
  isCompact: boolean,
  tone: "blue" | "gold" | "soft"
): React.CSSProperties {
  const color =
    tone === "gold" ? "#D6AA45" : tone === "blue" ? "#1B66D2" : "#244969";

  return {
    gridArea: "icon",
    width: isCompact ? 38 : 80,
    height: isCompact ? 38 : 80,
    borderRadius: isCompact ? 13 : 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(236,244,255,0.98) 58%, rgba(224,235,248,0.98) 100%)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.92), 0 10px 20px rgba(10,24,49,0.08)",
    flexShrink: 0,
  };
}

function marketplaceMoneyTextStackStyle(): React.CSSProperties {
  return {
    gridArea: "text",
    minWidth: 0,
    display: "grid",
    gap: 5,
    alignContent: "center",
  };
}

function marketplaceMoneyTitleStyle(isCompact: boolean): React.CSSProperties {
  return {
    color: "#08233A",
    fontSize: isCompact ? 13 : 20,
    fontWeight: 950,
    lineHeight: 1.14,
    overflowWrap: "break-word",
    wordBreak: "normal",
  };
}

function marketplaceMoneyValueStyle(isCompact: boolean): React.CSSProperties {
  return {
    color: "#061827",
    fontSize: isCompact ? 17 : 42,
    fontWeight: 950,
    lineHeight: isCompact ? 1.04 : 1,
    letterSpacing: 0,
    overflowWrap: "break-word",
    wordBreak: "normal",
  };
}

function marketplaceMoneyRouteValueStyle(
  isCompact: boolean,
  ready: boolean
): React.CSSProperties {
  return {
    ...marketplaceMoneyValueStyle(isCompact),
    fontSize: ready ? (isCompact ? 14 : 30) : isCompact ? 17 : 42,
    lineHeight: ready ? 1.08 : 1,
    display: "-webkit-box",
    WebkitLineClamp: ready ? 2 : 1,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };
}

function marketplaceMoneyHelperStyle(isCompact: boolean): React.CSSProperties {
  return {
    color: "#41556B",
    fontSize: isCompact ? 11.5 : 17,
    fontWeight: 750,
    lineHeight: 1.24,
    overflowWrap: "break-word",
    wordBreak: "normal",
  };
}

function marketplaceMoneyStatusAreaStyle(): React.CSSProperties {
  return {
    gridArea: "status",
    justifySelf: "end",
    alignSelf: "start",
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  };
}

function marketplaceMoneyStatusPillStyle(ready = false): React.CSSProperties {
  return {
    ...stableStatusPillStyle(ready),
    height: 28,
    minHeight: 28,
    maxHeight: 28,
    minWidth: 0,
    padding: "0 8px",
    justifyContent: "center",
    color: ready ? "#1D6D46" : "#3D4F61",
    background: ready
      ? "linear-gradient(180deg, #EFFBF4 0%, #DCEFE5 100%)"
      : "linear-gradient(180deg, #F5F8FC 0%, #E9EEF6 100%)",
    border: ready
      ? "1px solid rgba(46,155,98,0.18)"
      : "1px solid rgba(16,37,59,0.06)",
  };
}

function marketplaceMoneyCardActionStyle(
  kind: "primary" | "secondary",
  isCompact: boolean
): React.CSSProperties {
  return {
    ...marketplaceActionStyle(kind),
    width: "100%",
    minWidth: 0,
    maxWidth: isCompact ? "100%" : 180,
    height: isCompact ? 38 : 42,
    minHeight: isCompact ? 38 : 42,
    maxHeight: isCompact ? 38 : 42,
    padding: isCompact ? "0 8px" : "0 12px",
    justifySelf: "start",
    fontSize: isCompact ? 11.5 : 13,
    lineHeight: 1.05,
    whiteSpace: "normal",
    overflow: "hidden",
    textOverflow: "clip",
    transition: "none",
  };
}

function marketplaceMoneyChartBubbleStyle(isCompact: boolean): React.CSSProperties {
  return {
    width: isCompact ? 38 : 68,
    height: isCompact ? 38 : 68,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#2C68D8",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(235,243,255,0.96) 60%, rgba(222,234,250,0.96) 100%)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.9), 0 10px 20px rgba(10,24,49,0.08)",
    flexShrink: 0,
  };
}

function marketplaceOsIconStyle(bg: string, isCompact = false): React.CSSProperties {
  return {
    gridArea: "icon",
    width: isCompact ? 46 : 62,
    height: isCompact ? 46 : 62,
    borderRadius: isCompact ? 15 : 19,
    margin: isCompact ? 0 : "0 auto",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,251,255,0.96) 100%)",
    border: "1px solid rgba(13,95,168,0.12)",
    color: "#0B2D4A",
    fontSize: isCompact ? 26 : 30,
    boxShadow:
      "0 12px 22px rgba(10,24,49,0.10), inset 4px 0 0 rgba(214,170,69,0.18), inset 0 1px 0 rgba(255,255,255,0.96)",
    outline: `1px solid ${bg.includes("#25A65A") ? "rgba(46,155,98,0.10)" : "rgba(214,170,69,0.08)"}`,
    outlineOffset: -2,
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 44,
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    padding: "11px 12px",
    fontSize: 14,
    color: "#0B1F33",
    outline: "none",
    boxSizing: "border-box",
    pointerEvents: "auto",
    touchAction: "auto",
    position: "relative",
    zIndex: 2,
  };
}

function marketplaceFieldTouchProps(debugId: string) {
  const markInteraction = () => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.gmfnMarketplaceFieldInteracting = "true";
    window.setTimeout(() => {
      delete document.documentElement.dataset.gmfnMarketplaceFieldInteracting;
    }, 800);
  };

  return {
    "data-gmfn-field-root": "true",
    "data-gmfn-debug-id": debugId,
    onPointerDownCapture: markInteraction,
    onFocusCapture: markInteraction,
  };
}

export default function MarketplaceMoneySection({
  isCompact,
  isOpen,
  visiblePoolAmount,
  visiblePoolCurrency,
  communitySettlementReady,
  payoutReady,
  moneySurface,
  marketplaceMoneyOutTo,
  payInEditorOpen,
  payInAccountDraft,
  savingPayInAccount,
  onToggleMoney,
  onTogglePayInEditor,
  onUpdatePayInAccountDraft,
  onSavePayInAccount,
  onClosePayInEditor,
  openMarketplaceCta,
}: MarketplaceMoneySectionProps) {
  return (
    <section
      id="marketplace-money-routes"
      style={{
        ...pageCard("#FFFFFF"),
        ...marketplaceSectionStyle(),
        order: 8,
        padding: isCompact ? 14 : 18,
      }}
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
              "linear-gradient(180deg, #2F73D8 0%, #1B4DA6 100%)",
              true
            )}
          >
            <MarketplaceGlyph name="pool" size={26} />
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
              Money In / Pool
            </div>
            <div
              style={{
                marginTop: 5,
                color: "#5E6F82",
                fontSize: isCompact ? 14 : 16,
                fontWeight: 750,
                lineHeight: 1.25,
              }}
            >
              Pay into this marketplace pool and check the receiving rail.
            </div>
          </div>
        </div>

        <StableButton
          type="button"
          debugId="marketplace.money.toggle"
          onClick={onToggleMoney}
          style={marketplaceActionStyle("soft")}
        >
          {isOpen ? "Collapse" : "Open"}{" "}
          <span aria-hidden="true" style={{ display: "inline-flex" }}>
            <MarketplaceGlyph name={isOpen ? "chevronUp" : "chevron"} size={16} />
          </span>
        </StableButton>
      </div>

      {isOpen ? (
        <div style={marketplaceMoneyPanelStyle(isCompact)}>
          <div style={marketplaceMoneyRouteCardStyle(isCompact, true)}>
            <span
              aria-hidden="true"
              style={marketplaceMoneyIconBubbleStyle(isCompact, "soft")}
            >
              <MarketplaceGlyph name="eye" size={isCompact ? 24 : 40} />
            </span>
            <div style={marketplaceMoneyTextStackStyle()}>
              <div style={marketplaceMoneyTitleStyle(isCompact)}>
                Visible Pool
              </div>
              <div style={marketplaceMoneyValueStyle(isCompact)}>
                {visiblePoolAmount} {visiblePoolCurrency}
              </div>
              <div style={marketplaceMoneyHelperStyle(isCompact)}>
                Current pool view
              </div>
            </div>
            <div style={marketplaceMoneyStatusAreaStyle()}>
              <span
                aria-hidden="true"
                style={marketplaceMoneyChartBubbleStyle(isCompact)}
              >
                <MarketplaceGlyph name="chart" size={isCompact ? 22 : 34} />
              </span>
            </div>
          </div>

          <div style={marketplaceMoneyRouteCardStyle(isCompact)}>
            <span
              aria-hidden="true"
              style={marketplaceMoneyIconBubbleStyle(isCompact, "gold")}
            >
              <MarketplaceGlyph name="bank" size={isCompact ? 24 : 40} />
            </span>
            <div style={marketplaceMoneyTextStackStyle()}>
              <div style={marketplaceMoneyTitleStyle(isCompact)}>
                Money In Rail
              </div>
              <div
                style={marketplaceMoneyRouteValueStyle(
                  isCompact,
                  communitySettlementReady
                )}
              >
                {communitySettlementReady
                  ? settlementSummary(moneySurface?.communitySettlement || null)
                  : "Not ready"}
              </div>
              <div style={marketplaceMoneyHelperStyle(isCompact)}>
                Pay this account
              </div>
              <StableButton
                debugId="marketplace.money.pay-in-account"
                type="button"
                onClick={onTogglePayInEditor}
                stableHeight={isCompact ? 38 : 42}
                style={marketplaceMoneyCardActionStyle(
                  communitySettlementReady ? "secondary" : "primary",
                  isCompact
                )}
              >
                {payInEditorOpen
                  ? "Close rail"
                  : communitySettlementReady
                    ? "Open rail"
                    : "Set rail"}
              </StableButton>
            </div>
            <div style={marketplaceMoneyStatusAreaStyle()}>
              <span style={marketplaceMoneyStatusPillStyle(communitySettlementReady)}>
                {communitySettlementReady ? "Ready" : "Not ready"}
              </span>
            </div>
          </div>

          <div style={marketplaceMoneyRouteCardStyle(isCompact)}>
            <span
              aria-hidden="true"
              style={marketplaceMoneyIconBubbleStyle(isCompact, "blue")}
            >
              <MarketplaceGlyph name="card" size={isCompact ? 24 : 40} />
            </span>
            <div style={marketplaceMoneyTextStackStyle()}>
              <div style={marketplaceMoneyTitleStyle(isCompact)}>
                Money Out
              </div>
              <div style={marketplaceMoneyRouteValueStyle(isCompact, payoutReady)}>
                {payoutReady ? payoutSummary(moneySurface) : "Not ready"}
              </div>
              <div style={marketplaceMoneyHelperStyle(isCompact)}>
                Withdrawal and payout details
              </div>
              <StableCtaLink
                to={marketplaceMoneyOutTo}
                debugId="marketplace.money.money-out-destination"
                stableHeight={isCompact ? 38 : 42}
                style={marketplaceMoneyCardActionStyle(
                  payoutReady ? "secondary" : "primary",
                  isCompact
                )}
              >
                Open Withdrawal
              </StableCtaLink>
            </div>
            <div style={marketplaceMoneyStatusAreaStyle()}>
              <span style={marketplaceMoneyStatusPillStyle(payoutReady)}>
                {payoutReady ? "Payout saved" : "Payout needed"}
              </span>
            </div>
          </div>

          {payInEditorOpen ? (
            <div
              style={{
                gridColumn: "1 / -1",
                display: "grid",
                gap: 12,
                padding: isCompact ? 12 : 16,
                borderRadius: 18,
                border: "1px solid rgba(20,55,88,0.14)",
                background: "#F8FBFF",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={sectionLabel()}>Money In Rail</div>
                  <div
                    style={{
                      marginTop: 4,
                      color: "#07172C",
                      fontSize: isCompact ? 18 : 22,
                      fontWeight: 1000,
                    }}
                  >
                    Receiving account for this marketplace
                  </div>
                </div>
                <span style={marketplaceMoneyStatusPillStyle(communitySettlementReady)}>
                  {communitySettlementReady ? "Saved" : "Not saved"}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "repeat(3, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                <label style={{ display: "grid", gap: 6, fontWeight: 850 }}>
                  Account name
                  <input
                    {...marketplaceFieldTouchProps("marketplace.money.pay-in.account-name")}
                    value={payInAccountDraft.accountName}
                    onChange={(event) =>
                      onUpdatePayInAccountDraft("accountName", event.target.value)
                    }
                    style={inputStyle()}
                    placeholder="Marketplace account"
                  />
                </label>
                <label style={{ display: "grid", gap: 6, fontWeight: 850 }}>
                  Bank
                  <input
                    {...marketplaceFieldTouchProps("marketplace.money.pay-in.bank-name")}
                    value={payInAccountDraft.bankName}
                    onChange={(event) =>
                      onUpdatePayInAccountDraft("bankName", event.target.value)
                    }
                    style={inputStyle()}
                    placeholder="Bank name"
                  />
                </label>
                <label style={{ display: "grid", gap: 6, fontWeight: 850 }}>
                  Account number
                  <input
                    {...marketplaceFieldTouchProps("marketplace.money.pay-in.account-number")}
                    value={payInAccountDraft.accountNumber}
                    onChange={(event) =>
                      onUpdatePayInAccountDraft("accountNumber", event.target.value)
                    }
                    style={inputStyle()}
                    inputMode="numeric"
                    placeholder="Account number"
                  />
                </label>
                <label style={{ display: "grid", gap: 6, fontWeight: 850 }}>
                  Sort code
                  <input
                    {...marketplaceFieldTouchProps("marketplace.money.pay-in.sort-code")}
                    value={payInAccountDraft.sortCode}
                    onChange={(event) =>
                      onUpdatePayInAccountDraft("sortCode", event.target.value)
                    }
                    style={inputStyle()}
                    placeholder="40-12-65"
                  />
                </label>
                <label style={{ display: "grid", gap: 6, fontWeight: 850 }}>
                  Country
                  <input
                    {...marketplaceFieldTouchProps("marketplace.money.pay-in.country")}
                    value={payInAccountDraft.country}
                    onChange={(event) =>
                      onUpdatePayInAccountDraft("country", event.target.value)
                    }
                    style={inputStyle()}
                    placeholder="GB"
                  />
                </label>
                <label style={{ display: "grid", gap: 6, fontWeight: 850 }}>
                  Currency
                  <input
                    {...marketplaceFieldTouchProps("marketplace.money.pay-in.currency")}
                    value={payInAccountDraft.currency}
                    onChange={(event) =>
                      onUpdatePayInAccountDraft("currency", event.target.value)
                    }
                    style={inputStyle()}
                    maxLength={8}
                    placeholder="GBP"
                  />
                </label>
              </div>

              <label style={{ display: "grid", gap: 6, fontWeight: 850 }}>
                Note
                <input
                  {...marketplaceFieldTouchProps("marketplace.money.pay-in.note")}
                  value={payInAccountDraft.note}
                  onChange={(event) =>
                    onUpdatePayInAccountDraft("note", event.target.value)
                  }
                  style={inputStyle()}
                  placeholder="Dues, savings, support, and pool deposits"
                />
              </label>

              <div style={marketplaceInlineActionsStyle(isCompact)}>
                <StableButton
                  debugId="marketplace.money.pay-in-account-save"
                  type="button"
                  disabled={savingPayInAccount}
                  onClick={onSavePayInAccount}
                  stableHeight={52}
                  style={marketplaceInlineActionStyle(
                    "primary",
                    savingPayInAccount,
                    isCompact
                  )}
                >
                  <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                    <MarketplaceGlyph name="verify" size={18} />
                  </span>
                  {savingPayInAccount ? "Saving" : "Save account"}
                </StableButton>
                <StableButton
                  debugId="marketplace.money.pay-in-account-close"
                  type="button"
                  onClick={onClosePayInEditor}
                  stableHeight={52}
                  style={marketplaceInlineActionStyle("secondary", false, isCompact)}
                >
                  <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                    <MarketplaceGlyph name="chevronUp" size={18} />
                  </span>
                  Close
                </StableButton>
              </div>
            </div>
          ) : null}

          <div
            style={{
              ...marketplaceInlineActionsStyle(isCompact),
              gridColumn: isCompact ? "1 / -1" : undefined,
            }}
          >
            <StableButton
              debugId="marketplace.money.money-in"
              type="button"
              onClick={(event) => openMarketplaceCta(event, "moneyIn")}
              stableHeight={58}
              style={marketplaceInlineActionStyle("primary", false, isCompact)}
            >
              <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                <MarketplaceGlyph name="cash" size={18} />
              </span>
              Money In
            </StableButton>
            <StableCtaLink
              to={marketplaceMoneyOutTo}
              debugId="marketplace.money.money-out"
              stableHeight={58}
              style={marketplaceInlineActionStyle("secondary", false, isCompact)}
            >
              <span aria-hidden="true" style={marketplaceLinkMiniIconStyle()}>
                <MarketplaceGlyph name="card" size={18} />
              </span>
              Money Out
            </StableCtaLink>
          </div>
        </div>
      ) : null}
    </section>
  );
}