import React, {
  lazy,
  Suspense,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
  type SyntheticEvent,
} from "react";

import { StableButton } from "../../components/StableButton";
import type { ProtectedTradeEventRecord, ProtectedTradeRecord } from "../../lib/api";
import type {
  MarketplaceActionKind,
  MarketplaceDepartmentTone,
  MarketplaceFieldTouchProps,
  MarketplaceSectionKey,
  MarketplaceSurfaceTouchProps,
} from "./MarketplaceSupportTypes";
import type {
  MarketplaceGlyphName,
  NoticeTone,
} from "../MarketplacePage";

const GsnSnapshotPaperCard = lazy(
  () => import("../../components/GsnSnapshotPaperCard")
);

type MarketplaceGlyphComponent = (props: {
  name: MarketplaceGlyphName;
  size?: number;
}) => React.ReactElement | null;

export type MarketplaceTradeEvidenceSectionData = {
  MarketplaceGlyph: MarketplaceGlyphComponent;
  consumeMarketplaceButtonEvent: (
    event?: SyntheticEvent<HTMLElement>
  ) => void;
  helperText: () => CSSProperties;
  innerCard: (bg?: string) => CSSProperties;
  inputStyle: () => CSSProperties;
  isCompact: boolean;
  loadingProtectedTradeDetail: boolean;
  loadingProtectedTrades: boolean;
  marketplaceDepartmentHeaderStyle: (isCompact: boolean) => CSSProperties;
  marketplaceDepartmentShellStyle: (
    tone: MarketplaceDepartmentTone,
    isCompact: boolean
  ) => CSSProperties;
  marketplaceFieldTouchProps: (debugId: string) => MarketplaceFieldTouchProps;
  marketplaceActionStyle: (
    kind?: MarketplaceActionKind,
    disabled?: boolean
  ) => CSSProperties;
  marketplaceOsIconStyle: (bg: string, isCompact?: boolean) => CSSProperties;
  marketplaceSectionStyle: () => CSSProperties;
  marketplaceSurfaceTouchProps: (debugId: string) => MarketplaceSurfaceTouchProps;
  pageCard: (bg?: string) => CSSProperties;
  positiveNumber: (value: unknown) => number;
  protectedTradeEventLine: (event: ProtectedTradeEventRecord) => string;
  protectedTradeEvidencePaperText: string;
  protectedTradeStatusLabel: (value: unknown, fallback?: string) => string;
  protectedTrades: ProtectedTradeRecord[];
  recentProtectedTradeEvents: ProtectedTradeEventRecord[];
  recentProtectedTrades: ProtectedTradeRecord[];
  refreshProtectedTrades: () => Promise<void>;
  safeCopy: (text: string) => Promise<boolean>;
  safeStr: (value: unknown) => string;
  sectionLabel: () => CSSProperties;
  sectionsOpen: Record<MarketplaceSectionKey, boolean>;
  selectedProtectedTrade: ProtectedTradeRecord | null;
  selectedProtectedTradeHasDetail: boolean;
  selectedProtectedTradeId: string;
  setSelectedProtectedTradeId: Dispatch<SetStateAction<string>>;
  showNotice: (tone: NoticeTone, text: string) => void;
  stableStatusPillStyle: (primary?: boolean) => CSSProperties;
  toggleSectionFromButton: (
    event: SyntheticEvent<HTMLElement> | undefined,
    key: MarketplaceSectionKey
  ) => void;
};
type MarketplaceTradeEvidenceSectionProps = {
  data: MarketplaceTradeEvidenceSectionData;
  landingRef?: (node: HTMLElement | null) => void;
};

export default function MarketplaceTradeEvidenceSection({
  data,
  landingRef,
}: MarketplaceTradeEvidenceSectionProps) {
  const {
    MarketplaceGlyph,
    consumeMarketplaceButtonEvent,
    helperText,
    innerCard,
    inputStyle,
    isCompact,
    loadingProtectedTradeDetail,
    loadingProtectedTrades,
    marketplaceDepartmentHeaderStyle,
    marketplaceDepartmentShellStyle,
    marketplaceFieldTouchProps,
    marketplaceActionStyle,
    marketplaceOsIconStyle,
    marketplaceSectionStyle,
    marketplaceSurfaceTouchProps,
    pageCard,
    positiveNumber,
    protectedTradeEventLine,
    protectedTradeEvidencePaperText,
    protectedTradeStatusLabel,
    protectedTrades,
    recentProtectedTradeEvents,
    recentProtectedTrades,
    refreshProtectedTrades,
    safeCopy,
    safeStr,
    sectionLabel,
    sectionsOpen,
    selectedProtectedTrade,
    selectedProtectedTradeHasDetail,
    selectedProtectedTradeId,
    setSelectedProtectedTradeId,
    showNotice,
    stableStatusPillStyle,
    toggleSectionFromButton,
  } = data;

  if (!sectionsOpen.trade) return null;

  const selectedAmount = safeStr(selectedProtectedTrade?.amount);
  const selectedCurrency = safeStr(selectedProtectedTrade?.currency || "NGN");

  return (
    <section
      id="marketplace-trade-evidence"
      ref={isCompact ? undefined : landingRef}
      style={{ ...pageCard("#FFFFFF"), ...marketplaceSectionStyle(), order: 3 }}
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
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <span
            aria-hidden="true"
            style={marketplaceOsIconStyle(
              "linear-gradient(180deg, #4B36C8 0%, #17124F 100%)",
              true
            )}
          >
            <MarketplaceGlyph name="trade" size={26} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={sectionLabel()}>Trade Records archive</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Read-only history. New Trade Records start inside the private
              DemandBox conversation.
            </div>
          </div>
        </div>

        <StableButton
          debugId="marketplace.trade.toggle"
          type="button"
          onClick={(event) => toggleSectionFromButton(event, "trade")}
          style={marketplaceActionStyle("soft")}
        >
          Collapse
        </StableButton>
      </div>

      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <span style={stableStatusPillStyle(true)}>Read-only archive</span>
        <span style={stableStatusPillStyle(protectedTrades.length > 0)}>
          {protectedTrades.length
            ? `${protectedTrades.length} record${protectedTrades.length === 1 ? "" : "s"}`
            : "No records yet"}
        </span>
      </div>

      <div
        data-gsn-trade-archive="read-only"
        {...marketplaceSurfaceTouchProps("marketplace.trade.evidence-module")}
        style={marketplaceDepartmentShellStyle("trade", isCompact)}
      >
        <div
          style={{
            ...marketplaceDepartmentHeaderStyle(isCompact),
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "46px minmax(0, 1fr) 150px",
            gap: 12,
            alignItems: "center",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              ...marketplaceOsIconStyle(
                "linear-gradient(180deg, #244969 0%, #061827 100%)",
                true
              ),
              display: isCompact ? "none" : "inline-flex",
            }}
          >
            <MarketplaceGlyph name="ledger" size={24} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={sectionLabel()}>Historical Trade Records</div>
            <div
              style={{
                marginTop: 5,
                ...helperText(),
                fontSize: 13,
                lineHeight: 1.35,
              }}
            >
              Review existing agreement evidence, status and history. This
              archive cannot create or change a transaction.
            </div>
          </div>
          <span
            style={{
              ...stableStatusPillStyle(true),
              justifySelf: isCompact ? "start" : "end",
            }}
          >
            Archive only
          </span>
        </div>

        <div
          ref={isCompact ? landingRef : undefined}
          {...marketplaceSurfaceTouchProps("marketplace.protected-trade.archive-guidance")}
          style={{
            borderRadius: 16,
            border: "1px solid rgba(214,170,69,0.24)",
            background: "linear-gradient(180deg, #FFFDF7 0%, #F7FAFD 100%)",
            padding: isCompact ? 11 : 13,
            display: "grid",
            gap: 7,
          }}
        >
          <div style={sectionLabel()}>Where live trade work happens</div>
          <div
            style={{
              color: "#173750",
              fontSize: isCompact ? 14 : 15,
              fontWeight: 900,
              lineHeight: 1.35,
            }}
          >
            Start or amend an agreement in the matched private DemandBox
            conversation. Return here only to review its saved record.
          </div>
          <div
            style={{
              color: "#617085",
              fontSize: isCompact ? 11.5 : 12.5,
              fontWeight: 800,
              lineHeight: 1.35,
            }}
          >
            GSN preserves evidence. It does not hold money or guarantee delivery.
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <StableButton
            debugId="marketplace.protected-trade.archive.refresh"
            type="button"
            busy={loadingProtectedTrades}
            busyLabel="Refreshing"
            onClick={(event) => {
              consumeMarketplaceButtonEvent(event);
              void refreshProtectedTrades();
            }}
            stableHeight={44}
            style={marketplaceActionStyle("soft")}
          >
            Refresh archive
          </StableButton>
        </div>

        {recentProtectedTrades.length ? (
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "block" }}>
              <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                Choose a saved record
              </div>
              <select
                {...marketplaceFieldTouchProps("marketplace.protected-trade.archive.record")}
                value={selectedProtectedTradeId}
                onChange={(event) => setSelectedProtectedTradeId(event.target.value)}
                style={{ ...inputStyle(), marginTop: 6 }}
              >
                {recentProtectedTrades.map((trade) => (
                  <option
                    key={trade.id || trade.trade_code || trade.item_title}
                    value={positiveNumber(trade.id) || ""}
                  >
                    {safeStr(trade.item_title) ||
                      safeStr(trade.trade_code) ||
                      "Trade Record"}
                  </option>
                ))}
              </select>
            </label>

            <div
              style={{
                borderRadius: 16,
                border: "1px solid rgba(13,95,168,0.16)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(240,247,255,0.96) 100%)",
                padding: isCompact ? 11 : 14,
                display: "grid",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={sectionLabel()}>Saved agreement</div>
                  <div
                    style={{
                      marginTop: 5,
                      color: "#0B1F33",
                      fontSize: isCompact ? 17 : 19,
                      fontWeight: 950,
                      lineHeight: 1.2,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {safeStr(selectedProtectedTrade?.item_title) || "Trade Record"}
                  </div>
                </div>
                <span
                  style={{
                    ...stableStatusPillStyle(Boolean(selectedProtectedTrade?.trade_code)),
                    height: "auto",
                    minHeight: 30,
                    whiteSpace: "normal",
                    overflowWrap: "anywhere",
                  }}
                >
                  {safeStr(selectedProtectedTrade?.trade_code) || "No trade code yet"}
                </span>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <span style={stableStatusPillStyle(Boolean(selectedProtectedTrade?.status))}>
                  Record: {protectedTradeStatusLabel(selectedProtectedTrade?.status, "Draft")}
                </span>
                <span style={stableStatusPillStyle(Boolean(selectedProtectedTrade?.payment_status))}>
                  Payment: {protectedTradeStatusLabel(selectedProtectedTrade?.payment_status)}
                </span>
                <span style={stableStatusPillStyle(Boolean(selectedProtectedTrade?.release_status))}>
                  Release: {protectedTradeStatusLabel(selectedProtectedTrade?.release_status)}
                </span>
                <span style={stableStatusPillStyle(Boolean(selectedProtectedTrade?.receipt_status))}>
                  Receipt: {protectedTradeStatusLabel(selectedProtectedTrade?.receipt_status)}
                </span>
                <span style={stableStatusPillStyle(Boolean(selectedProtectedTrade?.dispute_status))}>
                  Issue: {protectedTradeStatusLabel(selectedProtectedTrade?.dispute_status)}
                </span>
              </div>

              <div
                style={{
                  ...innerCard("#FFFFFF"),
                  padding: isCompact ? 10 : 12,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ color: "#617085", fontWeight: 850 }}>Amount</span>
                  <strong style={{ color: "#0B1F33" }}>
                    {selectedAmount
                      ? `${selectedCurrency} ${selectedAmount}`
                      : "No amount recorded"}
                  </strong>
                </div>
                <div style={{ color: "#173750", lineHeight: 1.45, overflowWrap: "anywhere" }}>
                  {safeStr(selectedProtectedTrade?.terms_summary) ||
                    "No agreement summary was stored on this historical record."}
                </div>
              </div>
            </div>

            <div
              style={{
                borderRadius: 16,
                border: "1px solid rgba(212,175,55,0.26)",
                background:
                  "linear-gradient(180deg, rgba(255,253,247,0.96) 0%, rgba(248,251,255,0.98) 100%)",
                padding: isCompact ? 10 : 12,
                display: "grid",
                gap: 10,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={sectionLabel()}>Trade Record paper</div>
                  <div
                    style={{
                      marginTop: 4,
                      ...helperText(),
                      fontSize: 12,
                      lineHeight: 1.35,
                    }}
                  >
                    Private evidence visible only to people already allowed to
                    view this record.
                  </div>
                </div>
                <span style={stableStatusPillStyle(Boolean(selectedProtectedTrade?.id))}>
                  {safeStr(selectedProtectedTrade?.trade_code) || "Not ready"}
                </span>
              </div>

              {protectedTradeEvidencePaperText ? (
                <>
                  <Suspense fallback={null}>
                    <GsnSnapshotPaperCard
                      paperText={protectedTradeEvidencePaperText}
                      compact={isCompact}
                      icon="document"
                      maxBodyLines={isCompact ? 4 : 6}
                    />
                  </Suspense>
                  <StableButton
                    debugId="marketplace.protected-trade.copy-paper"
                    type="button"
                    onClick={(event) => {
                      consumeMarketplaceButtonEvent(event);
                      void safeCopy(protectedTradeEvidencePaperText).then(
                        (copied: boolean) => {
                          showNotice(
                            copied ? "success" : "error",
                            copied
                              ? "Trade Record paper copied."
                              : "Trade Record paper could not be copied."
                          );
                        }
                      );
                    }}
                    stableHeight={50}
                    style={marketplaceActionStyle("soft")}
                  >
                    Copy paper text
                  </StableButton>
                </>
              ) : (
                <div
                  style={{
                    ...innerCard("#FFFFFF"),
                    padding: isCompact ? 10 : 12,
                    color: "#41556B",
                    fontSize: isCompact ? 12 : 13,
                    fontWeight: 800,
                    lineHeight: 1.35,
                  }}
                >
                  Choose a saved Trade Record to view its evidence paper.
                </div>
              )}
            </div>

            <div
              style={{
                borderRadius: 14,
                border: "1px solid rgba(16,37,59,0.08)",
                background: "#FFFFFF",
                padding: isCompact ? 10 : 12,
                display: "grid",
                gap: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <div style={sectionLabel()}>Event history</div>
                <span
                  style={stableStatusPillStyle(
                    selectedProtectedTradeHasDetail && recentProtectedTradeEvents.length > 0
                  )}
                >
                  {loadingProtectedTradeDetail
                    ? "Loading history"
                    : recentProtectedTradeEvents.length
                      ? `${recentProtectedTradeEvents.length} event${
                          recentProtectedTradeEvents.length === 1 ? "" : "s"
                        }`
                      : "No history loaded"}
                </span>
              </div>

              {recentProtectedTradeEvents.length ? (
                <div style={{ display: "grid", gap: 6 }}>
                  {recentProtectedTradeEvents.map((event) => (
                    <div
                      key={event.id || `${event.event_type}-${event.created_at}`}
                      style={{
                        color: "#173750",
                        fontSize: isCompact ? 12 : 13,
                        fontWeight: 850,
                        lineHeight: 1.35,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {protectedTradeEventLine(event)}
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    color: "#41556B",
                    fontSize: isCompact ? 12 : 13,
                    fontWeight: 800,
                    lineHeight: 1.35,
                  }}
                >
                  Refresh the archive or choose another saved record to load its
                  history.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            style={{
              ...innerCard("#FFFFFF"),
              padding: isCompact ? 10 : 12,
              color: "#41556B",
              fontSize: isCompact ? 12 : 13,
              fontWeight: 800,
              lineHeight: 1.35,
            }}
          >
            No historical Trade Records are available. New agreements begin in
            the matched private DemandBox conversation.
          </div>
        )}
      </div>
    </section>
  );
}
