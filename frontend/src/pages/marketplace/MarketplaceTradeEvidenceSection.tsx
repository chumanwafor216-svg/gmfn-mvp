import React, { lazy, Suspense } from "react";

import { StableButton } from "../../components/StableButton";

const GsnSnapshotPaperCard = lazy(
  () => import("../../components/GsnSnapshotPaperCard")
);

type MarketplaceTradeEvidenceSectionProps = {
  data: any;
};

export default function MarketplaceTradeEvidenceSection({
  data,
}: MarketplaceTradeEvidenceSectionProps) {
  const {
    MarketplaceGlyph,
    PROTECTED_TRADE_EVENT_OPTIONS,
    consumeMarketplaceButtonEvent,
    creatingProtectedTrade,
    handleConfirmProtectedTradeOutcome,
    handleCreateProtectedTrade,
    handleRecordProtectedTradeEvent,
    helperText,
    innerCard,
    inputStyle,
    isCompact,
    loadingProtectedTradeDetail,
    loadingProtectedTrades,
    marketplaceDepartmentHeaderStyle,
    marketplaceDepartmentShellStyle,
    marketplaceFieldTouchProps,
    marketplaceInlineActionStyle,
    marketplaceActionStyle,
    marketplaceOsIconStyle,
    marketplaceSectionStyle,
    marketplaceSurfaceTouchProps,
    pageCard,
    positiveNumber,
    protectedTradeCounterpartOptions,
    protectedTradeCreateOpen,
    protectedTradeDraft,
    protectedTradeEventLine,
    protectedTradeEventNote,
    protectedTradeEventType,
    protectedTradeEvidencePaperText,
    protectedTradeStatusLabel,
    protectedTrades,
    recentProtectedTradeEvents,
    recentProtectedTrades,
    recordingProtectedTradeEvent,
    recordingProtectedTradeOutcome,
    refreshProtectedTrades,
    safeCopy,
    safeStr,
    sectionLabel,
    sectionsOpen,
    selectedProtectedTrade,
    selectedProtectedTradeEventOption,
    selectedProtectedTradeHasDetail,
    selectedProtectedTradeId,
    selectedProtectedTradeOutcomeActions,
    selectedProtectedTradeUserSide,
    setProtectedTradeCreateOpen,
    setProtectedTradeDraft,
    setProtectedTradeEventNote,
    setProtectedTradeEventType,
    setSelectedProtectedTradeId,
    showNotice,
    showProtectedTradeCreateForm,
    stableStatusPillStyle,
    textAreaStyle,
    toggleSectionFromButton,
  } = data;

  return (
    <>
      {sectionsOpen.trade ? (
      <section
        id="marketplace-trade-evidence"
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
                "linear-gradient(180deg, #4B36C8 0%, #17124F 100%)",
                true
              )}
            >
              <MarketplaceGlyph name="trade" size={26} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={sectionLabel()}>Trade Evidence</div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Record the item, the other side, and agreed terms before goods,
                service, or money move. This is evidence, not escrow.
              </div>
            </div>
          </div>

          <StableButton
            debugId="marketplace.trade.toggle"
            type="button"
            onClick={(event) => toggleSectionFromButton(event, "trade")}
            style={marketplaceActionStyle("soft")}
          >
            {sectionsOpen.trade ? "Collapse" : "Open"}
          </StableButton>
        </div>

        {sectionsOpen.trade ? (
          <div
            style={{
              marginTop: 12,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span style={stableStatusPillStyle(true)}>
              Trade record lane
            </span>
            <span style={stableStatusPillStyle(protectedTrades.length > 0)}>
              {protectedTrades.length
                ? `${protectedTrades.length} recent`
                : "No records yet"}
            </span>
          </div>
        ) : null}

        {sectionsOpen.trade ? (
          <div
            {...marketplaceSurfaceTouchProps(
              "marketplace.trade.evidence-module"
            )}
            style={{
              ...marketplaceDepartmentShellStyle("trade", isCompact),
            }}
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
                <div style={sectionLabel()}>Trade Evidence Record</div>
                <div
                  style={{
                    marginTop: 5,
                    ...helperText(),
                    fontSize: 13,
                    lineHeight: 1.35,
                  }}
                >
                  Record the item, other side, and basic terms before goods,
                  service, or money move. This creates evidence, not escrow.
                </div>
              </div>
              <span
                style={{
                  ...stableStatusPillStyle(protectedTrades.length > 0),
                  justifySelf: isCompact ? "start" : "end",
                }}
              >
                {protectedTrades.length
                ? `${protectedTrades.length} recent`
                : "No records yet"}
              </span>
            </div>

            {recentProtectedTrades.length ? (
              <div
                style={{
                  borderRadius: 16,
                  border: "1px solid rgba(13,95,168,0.16)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(240,247,255,0.96) 100%)",
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
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={sectionLabel()}>Confirm outcome</div>
                    <div
                      style={{
                        marginTop: 4,
                        ...helperText(),
                        fontSize: isCompact ? 12 : 13,
                        lineHeight: 1.35,
                      }}
                    >
                      One tap records what happened. It becomes event evidence,
                      not a human score.
                    </div>
                  </div>
                  <span style={stableStatusPillStyle(Boolean(selectedProtectedTrade?.id))}>
                    {selectedProtectedTradeUserSide === "seller"
                      ? "Seller side"
                      : selectedProtectedTradeUserSide === "buyer"
                        ? "Buyer side"
                        : "Participant"}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    minWidth: 0,
                  }}
                >
                  <span style={stableStatusPillStyle(Boolean(selectedProtectedTrade?.id))}>
                    {safeStr(selectedProtectedTrade?.trade_code) || "Choose record"}
                  </span>
                  <span
                    style={stableStatusPillStyle(
                      Boolean(
                        selectedProtectedTradeUserSide === "seller"
                          ? selectedProtectedTrade?.payment_status
                          : selectedProtectedTrade?.receipt_status
                      )
                    )}
                  >
                    {selectedProtectedTradeUserSide === "seller"
                      ? "Payment"
                      : "Receipt"}
                    :{" "}
                    {protectedTradeStatusLabel(
                      selectedProtectedTradeUserSide === "seller"
                        ? selectedProtectedTrade?.payment_status
                        : selectedProtectedTrade?.receipt_status
                    )}
                  </span>
                  <span
                    style={stableStatusPillStyle(
                      Boolean(
                        selectedProtectedTradeUserSide === "seller"
                          ? selectedProtectedTrade?.release_status
                          : selectedProtectedTrade?.dispute_status
                      )
                    )}
                  >
                    {selectedProtectedTradeUserSide === "seller"
                      ? "Release"
                      : "Issue"}
                    :{" "}
                    {protectedTradeStatusLabel(
                      selectedProtectedTradeUserSide === "seller"
                        ? selectedProtectedTrade?.release_status
                        : selectedProtectedTrade?.dispute_status
                    )}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact
                      ? "1fr"
                      : "repeat(3, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  <StableButton
                    debugId="marketplace.protected-trade.outcome.good"
                    type="button"
                    busy={recordingProtectedTradeOutcome === "good"}
                    busyLabel="Recording"
                    onClick={(event) =>
                      void handleConfirmProtectedTradeOutcome(
                        event,
                        selectedProtectedTradeOutcomeActions.good
                      )
                    }
                    stableHeight={52}
                    style={marketplaceInlineActionStyle(
                      selectedProtectedTradeOutcomeActions.good.tone,
                      false,
                      isCompact
                    )}
                  >
                    {selectedProtectedTradeOutcomeActions.good.label}
                  </StableButton>
                  <StableButton
                    debugId="marketplace.protected-trade.outcome.blocked"
                    type="button"
                    busy={recordingProtectedTradeOutcome === "blocked"}
                    busyLabel="Recording"
                    onClick={(event) =>
                      void handleConfirmProtectedTradeOutcome(
                        event,
                        selectedProtectedTradeOutcomeActions.blocked
                      )
                    }
                    stableHeight={52}
                    style={marketplaceInlineActionStyle(
                      selectedProtectedTradeOutcomeActions.blocked.tone,
                      false,
                      isCompact
                    )}
                  >
                    {selectedProtectedTradeOutcomeActions.blocked.label}
                  </StableButton>
                  <StableButton
                    debugId="marketplace.protected-trade.outcome.issue"
                    type="button"
                    busy={recordingProtectedTradeOutcome === "issue"}
                    busyLabel="Opening"
                    onClick={(event) =>
                      void handleConfirmProtectedTradeOutcome(
                        event,
                        selectedProtectedTradeOutcomeActions.issue
                      )
                    }
                    stableHeight={52}
                    style={marketplaceInlineActionStyle(
                      selectedProtectedTradeOutcomeActions.issue.tone,
                      false,
                      isCompact
                    )}
                  >
                    {selectedProtectedTradeOutcomeActions.issue.label}
                  </StableButton>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  <StableButton
                    debugId="marketplace.protected-trade.start-another"
                    type="button"
                    onClick={(event) => {
                      consumeMarketplaceButtonEvent(event);
                      setProtectedTradeCreateOpen((open: boolean) => !open);
                    }}
                    stableHeight={44}
                    style={{
                      ...marketplaceInlineActionStyle("soft", false, isCompact),
                      height: 44,
                      minHeight: 44,
                      maxHeight: 44,
                      fontSize: isCompact ? 12 : 12.5,
                    }}
                  >
                    {protectedTradeCreateOpen
                      ? "Hide form"
                      : "New record"}
                  </StableButton>
                  <StableButton
                    debugId="marketplace.protected-trade.refresh"
                    type="button"
                    busy={loadingProtectedTrades}
                    busyLabel="Refreshing"
                    onClick={(event) => {
                      consumeMarketplaceButtonEvent(event);
                      void refreshProtectedTrades();
                    }}
                    stableHeight={44}
                    style={{
                      ...marketplaceInlineActionStyle("soft", false, isCompact),
                      height: 44,
                      minHeight: 44,
                      maxHeight: 44,
                      fontSize: isCompact ? 12 : 12.5,
                    }}
                  >
                    Refresh
                  </StableButton>
                </div>
              </div>
            ) : null}

            {showProtectedTradeCreateForm ? (
              <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "0.7fr 1fr 1.2fr 0.7fr 0.55fr",
                gap: 10,
                alignItems: "end",
              }}
            >
              <label style={{ display: "block" }}>
                <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                  Your side
                </div>
                <select
                  {...marketplaceFieldTouchProps("marketplace.protected-trade.role")}
                  value={protectedTradeDraft.role}
                  onChange={(event) =>
                    setProtectedTradeDraft((prev: any) => ({
                      ...prev,
                      role: event.target.value === "buyer" ? "buyer" : "seller",
                    }))
                  }
                  style={{ ...inputStyle(), marginTop: 6 }}
                >
                  <option value="seller">Seller</option>
                  <option value="buyer">Buyer</option>
                </select>
              </label>

              <label style={{ display: "block" }}>
                <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                  Other side
                </div>
                <select
                  {...marketplaceFieldTouchProps("marketplace.protected-trade.counterpart")}
                  value={protectedTradeDraft.counterpartUserId}
                  onChange={(event) =>
                    setProtectedTradeDraft((prev: any) => ({
                      ...prev,
                      counterpartUserId: event.target.value,
                    }))
                  }
                  style={{ ...inputStyle(), marginTop: 6 }}
                >
                  <option value="">Choose member</option>
                  {protectedTradeCounterpartOptions.map((row: any) => (
                    <option key={row.userId} value={row.userId}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "block" }}>
                <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                  Item or service
                </div>
                <input
                  {...marketplaceFieldTouchProps("marketplace.protected-trade.item")}
                  value={protectedTradeDraft.itemTitle}
                  onChange={(event) =>
                    setProtectedTradeDraft((prev: any) => ({
                      ...prev,
                      itemTitle: event.target.value,
                    }))
                  }
                  style={{ ...inputStyle(), marginTop: 6 }}
                  placeholder="Example: two bags of rice"
                  maxLength={160}
                />
              </label>

              <label style={{ display: "block" }}>
                <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                  Amount
                </div>
                <input
                  {...marketplaceFieldTouchProps("marketplace.protected-trade.amount")}
                  value={protectedTradeDraft.amount}
                  onChange={(event) =>
                    setProtectedTradeDraft((prev: any) => ({
                      ...prev,
                      amount: event.target.value,
                    }))
                  }
                  style={{ ...inputStyle(), marginTop: 6 }}
                  inputMode="decimal"
                  placeholder="0.00"
                />
              </label>

              <label style={{ display: "block" }}>
                <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                  Currency
                </div>
                <input
                  {...marketplaceFieldTouchProps("marketplace.protected-trade.currency")}
                  value={protectedTradeDraft.currency}
                  onChange={(event) =>
                    setProtectedTradeDraft((prev: any) => ({
                      ...prev,
                      currency: event.target.value.toUpperCase(),
                    }))
                  }
                  style={{ ...inputStyle(), marginTop: 6 }}
                  maxLength={8}
                  placeholder="NGN"
                />
              </label>
            </div>

            <label style={{ display: "block" }}>
              <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                Basic terms
              </div>
              <textarea
                {...marketplaceFieldTouchProps("marketplace.protected-trade.terms")}
                value={protectedTradeDraft.termsSummary}
                onChange={(event) =>
                  setProtectedTradeDraft((prev: any) => ({
                    ...prev,
                    termsSummary: event.target.value,
                  }))
                }
                style={{ ...textAreaStyle(), marginTop: 6, minHeight: 78 }}
                placeholder="Example: buyer pays first; seller releases after payment claim is reviewed."
                maxLength={4000}
              />
            </label>

            <label style={{ display: "block" }}>
              <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                Minimum evidence packet
              </div>
              <textarea
                {...marketplaceFieldTouchProps("marketplace.protected-trade.packet")}
                value={protectedTradeDraft.evidencePacketNote}
                onChange={(event) =>
                  setProtectedTradeDraft((prev: any) => ({
                    ...prev,
                    evidencePacketNote: event.target.value,
                  }))
                }
                style={{ ...textAreaStyle(), marginTop: 6, minHeight: 78 }}
                placeholder="Optional: invoice reference, final agreement evidence, courier handoff, expected delivery, and payment schedule. Keep WhatsApp conversation outside GSN unless a final evidence note is needed."
                maxLength={1200}
              />
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                gap: 8,
              }}
            >
              <StableButton
                debugId="marketplace.protected-trade.create"
                type="button"
                busy={creatingProtectedTrade}
                busyLabel="Starting"
                onClick={(event) => void handleCreateProtectedTrade(event)}
                stableHeight={52}
                style={marketplaceInlineActionStyle("primary", false, isCompact)}
              >
                Start record
              </StableButton>
              {!recentProtectedTrades.length ? (
                <StableButton
                  debugId="marketplace.protected-trade.refresh-empty"
                  type="button"
                  busy={loadingProtectedTrades}
                  busyLabel="Refreshing"
                  onClick={(event) => {
                    consumeMarketplaceButtonEvent(event);
                    void refreshProtectedTrades();
                  }}
                  stableHeight={52}
                  style={marketplaceInlineActionStyle("secondary", false, isCompact)}
                >
                  Refresh records
                </StableButton>
              ) : null}
            </div>
              </>
            ) : null}

            {recentProtectedTrades.length ? (
              <div style={{ display: "grid", gap: 8 }}>
                {recentProtectedTrades.map((trade: any) => (
                  <div
                    key={trade.id || trade.trade_code || trade.item_title}
                    style={{
                      borderRadius: 14,
                      border: "1px solid rgba(16,37,59,0.08)",
                      background: "#FFFFFF",
                      padding: isCompact ? 10 : 12,
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "1fr"
                        : "minmax(0, 1fr) 120px",
                      gap: 8,
                      alignItems: "center",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ minWidth: 0, display: "grid", gap: 5 }}>
                      <div
                        style={{
                          color: "#0B1F33",
                          fontSize: isCompact ? 14 : 15,
                          fontWeight: 950,
                          lineHeight: 1.18,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflowWrap: "break-word",
                        }}
                      >
                        {safeStr(trade.item_title) || "Protected trade record"}
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
                            ...stableStatusPillStyle(Boolean(trade.trade_code)),
                            height: "auto",
                            minHeight: 28,
                            whiteSpace: "normal",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {safeStr(trade.trade_code) || "No trade code yet"}
                        </span>
                        <span style={stableStatusPillStyle(Boolean(trade.status))}>
                          {safeStr(trade.status || "draft").replace(/_/g, " ")}
                        </span>
                        <span style={stableStatusPillStyle(Boolean(trade.release_status))}>
                          {safeStr(trade.release_status || "not requested").replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        color: "#173750",
                        fontSize: isCompact ? 13 : 14,
                        fontWeight: 950,
                        justifySelf: isCompact ? "start" : "end",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {safeStr(trade.amount)
                        ? `${safeStr(trade.currency || "NGN")} ${safeStr(trade.amount)}`
                        : "No amount"}
                    </div>
                  </div>
                ))}
                <div
                  style={{
                    borderRadius: 14,
                    border: "1px solid rgba(214,170,69,0.22)",
                    background:
                      "linear-gradient(180deg, #FFFDF7 0%, #F8FBFF 100%)",
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
                    <div style={sectionLabel()}>Record update</div>
                    <span style={stableStatusPillStyle(Boolean(selectedProtectedTrade?.id))}>
                      {safeStr(selectedProtectedTrade?.trade_code) || "Choose record"}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                      gap: 10,
                      alignItems: "end",
                    }}
                  >
                    <label style={{ display: "block" }}>
                      <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                        Trade record
                      </div>
                      <select
                        {...marketplaceFieldTouchProps("marketplace.protected-trade.update.record")}
                        value={selectedProtectedTradeId}
                        onChange={(event) =>
                          setSelectedProtectedTradeId(event.target.value)
                        }
                        style={{ ...inputStyle(), marginTop: 6 }}
                      >
                        {recentProtectedTrades.map((trade: any) => (
                          <option
                            key={trade.id || trade.trade_code || trade.item_title}
                            value={positiveNumber(trade.id) || ""}
                          >
                            {safeStr(trade.item_title) ||
                              safeStr(trade.trade_code) ||
                              "Protected trade"}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={{ display: "block" }}>
                      <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                        Update type
                      </div>
                      <select
                        {...marketplaceFieldTouchProps("marketplace.protected-trade.update.type")}
                        value={protectedTradeEventType}
                        onChange={(event) =>
                          setProtectedTradeEventType(event.target.value)
                        }
                        style={{ ...inputStyle(), marginTop: 6 }}
                      >
                        {PROTECTED_TRADE_EVENT_OPTIONS.map((option: any) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div
                    style={{
                      color: "#41556B",
                      fontSize: isCompact ? 12 : 13,
                      fontWeight: 850,
                      lineHeight: 1.35,
                    }}
                  >
                    {selectedProtectedTradeEventOption.detail}
                  </div>

                  <label style={{ display: "block" }}>
                    <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                      Evidence note
                    </div>
                    <textarea
                      {...marketplaceFieldTouchProps("marketplace.protected-trade.update.note")}
                      value={protectedTradeEventNote}
                      onChange={(event) =>
                        setProtectedTradeEventNote(event.target.value)
                      }
                      style={{ ...textAreaStyle(), marginTop: 6, minHeight: 72 }}
                      placeholder="Write what happened and who can stand by this update."
                      maxLength={4000}
                    />
                  </label>

                  <StableButton
                    debugId="marketplace.protected-trade.record-update"
                    type="button"
                    busy={recordingProtectedTradeEvent}
                    busyLabel="Recording"
                    onClick={(event) => void handleRecordProtectedTradeEvent(event)}
                    stableHeight={52}
                    style={marketplaceInlineActionStyle("primary", false, isCompact)}
                  >
                    Record update
                  </StableButton>

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
                        <div style={sectionLabel()}>Evidence paper</div>
                        <div
                          style={{
                            marginTop: 4,
                            ...helperText(),
                            fontSize: 12,
                            lineHeight: 1.35,
                          }}
                        >
                          Signed-in evidence paper for screenshot review. Private
                          to the people who can already see this record.
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
                            <div style={sectionLabel()}>Event trail</div>
                            <span
                              style={stableStatusPillStyle(
                                selectedProtectedTradeHasDetail &&
                                  recentProtectedTradeEvents.length > 0
                              )}
                            >
                              {loadingProtectedTradeDetail
                                ? "Loading trail"
                                : recentProtectedTradeEvents.length
                                  ? `${recentProtectedTradeEvents.length} recent`
                                  : "No trail loaded"}
                            </span>
                          </div>

                          {recentProtectedTradeEvents.length ? (
                            <div style={{ display: "grid", gap: 6 }}>
                              {recentProtectedTradeEvents.map((event: any) => (
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
                              Open or refresh the record to load the detailed
                              protected-trade event trail.
                            </div>
                          )}
                        </div>
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
                                    ? "Protected trade evidence paper copied."
                                    : "Evidence paper could not be copied."
                                );
                              }
                            );
                          }}
                          stableHeight={50}
                          style={marketplaceInlineActionStyle("secondary", false, isCompact)}
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
                        Start or choose a protected trade record before copying
                        the GSN evidence paper.
                      </div>
                    )}
                  </div>
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
                Start with one serious trade record. It will sit beside the
                member, shop, and evidence history for this community.
              </div>
            )}
          </div>
        ) : null}
      </section>
      ) : null}
    </>
  );
}