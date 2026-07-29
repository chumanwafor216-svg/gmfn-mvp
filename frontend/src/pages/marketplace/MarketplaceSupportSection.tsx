import React from "react";
import ExplainToggle from "../../components/ExplainToggle";
import { StableButton, StableDisclosureSummary } from "../../components/StableButton";
import { GsnLegacyIcon, type GsnIconName } from "../../components/GsnLegacyIcon";
import { marketplaceSectionStyle } from "../../lib/marketplaceActionStability";

type Props = {
  data: Record<string, any>;
};

type MarketplaceGlyphName = "support";

const MARKETPLACE_GLYPH_ICON_MAP = {
  support: "repaymentSchedule",
} satisfies Record<MarketplaceGlyphName, GsnIconName>;

function MarketplaceGlyph({ name, size = 24 }: { name: MarketplaceGlyphName; size?: number }) {
  return (
    <GsnLegacyIcon
      name={MARKETPLACE_GLYPH_ICON_MAP[name]}
      size={Math.max(size, Math.round(size * 1.15))}
      decorative
      style={{ display: "inline-grid", flex: "0 0 auto" }}
    />
  );
}

export default function MarketplaceSupportSection({ data }: Props) {
  const {
    isCompact,
    supportSectionRef,
    pageCard,
    activeLoanCount,
    badge,
    toggleSectionFromButton,
    marketplaceActionStyle,
    marketplaceSurfaceTouchProps,
    marketplaceDepartmentShellStyle,
    activeCommunityName,
    activeCommunityId,
    currentGmfnId,
    hasMoneyOutSupportTask,
    moneyOutSupportAmountText,
    poolCurrency,
    moneyOutSupportGapText,
    runMarketplaceAction,
    setSupportDeskMode,
    scheduleMarketplaceSectionScroll,
    supportLoanDeskOpen,
    openMarketplaceSection,
    sectionLabel,
    helperText,
    innerCard,
    loanDraftId,
    requiredGuarantorCount,
    suggestedSupporters,
    loanAmount,
    setLoanAmount,
    supportProcessBusy,
    inputStyle,
    loanDurationDays,
    setLoanDurationDays,
    loanRepaymentCadence,
    setLoanRepaymentCadence,
    loanPurpose,
    setLoanPurpose,
    textAreaStyle,
    agreementAmount,
    agreementServiceFee,
    agreementNetAmount,
    agreementDueAt,
    agreementRepaymentCadence,
    softCard,
    marketplaceInlineActionsStyle,
    startingLoanDraft,
    handleStartLoanDraft,
    marketplaceInlineActionStyle,
    loadingSuggestions,
    handleRefreshSuggestions,
    cancellingLoanDraft,
    handleCancelLoanDraft,
    openMarketplaceCta,
    loanDraftSummary,
    safeStr,
    sentGuarantorCount,
    approvedGuarantorCount,
    supportProcessMessage,
    selectedSupporterKeys,
    toggleSuggestedSupporter,
    visibleSelectedSupporters,
    guarantorRequestsBlocked,
    showGuarantorRequestBlockedNotice,
    handleSendGuarantorRequests,
    sendingGuarantorRequests,
    loanStatusLower,
    loans,
    firstTruthy,
    getLoanAmountText,
    safeDateTime,
    marketplaceOsIconStyle,
    marketplaceFieldTouchProps
  } = data as any;
  const sectionsOpen = { support: true };

  return (
    <>
      {sectionsOpen.support ? (
      <section
        id="marketplace-loans-support"
        ref={supportSectionRef}
        style={{ ...pageCard("#FFFFFF"), ...marketplaceSectionStyle(), order: 6 }}
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
                "linear-gradient(180deg, #25A65A 0%, #0B5A34 100%)",
                true
              )}
            >
              <MarketplaceGlyph name="support" size={26} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={sectionLabel()}>Support</div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Ask this marketplace for support when your withdrawal needs
                backing.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(false)}>Active items: {activeLoanCount}</span>
            <StableButton
              debugId="marketplace.support.toggle"
              type="button"
              onClick={(event) => toggleSectionFromButton(event, "support")}
              style={marketplaceActionStyle("soft")}
            >
              {sectionsOpen.support ? "Collapse" : "Open"}
            </StableButton>
          </div>
        </div>

        {sectionsOpen.support ? (
          <ExplainToggle
            label="What this support area does"
            what="This is where you ask the selected marketplace for support when your own available balance is not enough."
            why="GSN keeps the request, supporters, repayment plan, and later finance record together."
            next="Start the request here. GSN will show the next support step after the draft is created."
            tone="light"
            style={{ marginTop: 12 }}
          />
        ) : null}

        {sectionsOpen.support ? (
          <div
            {...marketplaceSurfaceTouchProps("marketplace.support.selected-module")}
            style={marketplaceDepartmentShellStyle("neutral", isCompact)}
          >
            <div style={sectionLabel()}>Selected marketplace</div>
            <div
              style={{
                marginTop: 8,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  ...badge(Boolean(activeCommunityName)),
                  flexBasis: isCompact ? "100%" : "auto",
                  maxWidth: "100%",
                  minWidth: 0,
                  overflowWrap: "anywhere",
                }}
              >
                {activeCommunityName || "Select marketplace"}
              </span>
              <span style={badge(Boolean(activeCommunityId))}>
                ID: {activeCommunityId || "not ready"}
              </span>
              <span
                style={{
                  ...badge(Boolean(currentGmfnId)),
                  flexBasis: isCompact ? "100%" : "auto",
                  maxWidth: "100%",
                  minWidth: 0,
                  overflowWrap: "anywhere",
                }}
              >
                GSN ID: {currentGmfnId || "not ready"}
              </span>
              {hasMoneyOutSupportTask ? (
                <span style={badge(true)}>From Money Out</span>
              ) : null}
            </div>

            {hasMoneyOutSupportTask ? (
              <div style={{ marginTop: 10, ...helperText() }}>
                This withdrawal needs support here. Requested:{" "}
                {moneyOutSupportAmountText || "not shown"} {poolCurrency}.
                Support needed:{" "}
                {moneyOutSupportGapText || moneyOutSupportAmountText || "not shown"}{" "}
                {poolCurrency}.
              </div>
            ) : null}
          </div>
        ) : null}

        {sectionsOpen.support ? (
          <div
            {...marketplaceSurfaceTouchProps("marketplace.support.path-chooser")}
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div
              style={{
                ...marketplaceDepartmentShellStyle("support", isCompact),
                display: "grid",
                gap: 12,
                alignContent: "space-between",
              }}
            >
              <div>
                <div style={sectionLabel()}>Loan Support</div>
                <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                  Use this path for one request that needs backing, supporter
                  checks, repayment terms, and finance follow-up.
                </div>
              </div>
              <StableButton
                debugId="marketplace.support.open-loan-support"
                type="button"
                onClick={(event) => {
                  runMarketplaceAction(event, () => {
                    setSupportDeskMode("loan");
                    scheduleMarketplaceSectionScroll("marketplace-loans-support", {
                      force: true,
                    });
                  });
                }}
                style={{
                  ...marketplaceActionStyle(
                    supportLoanDeskOpen ? "primary" : "secondary"
                  ),
                  width: "100%",
                  justifySelf: "stretch",
                }}
              >
                {supportLoanDeskOpen ? "Loan Support Open" : "Open Loan Support"}
              </StableButton>
            </div>

            <div
              style={{
                ...marketplaceDepartmentShellStyle("rosca", isCompact),
                display: "grid",
                gap: 12,
                alignContent: "space-between",
              }}
            >
              <div>
                <div style={sectionLabel()}>ROSCA</div>
                <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                  Use this path for a selected-member savings circle. It is not
                  a loan or support request.
                </div>
              </div>
              <StableButton
                debugId="marketplace.support.open-rosca"
                type="button"
                onClick={(event) =>
                  openMarketplaceSection(event, "rosca", "marketplace-rosca")
                }
                style={{
                  ...marketplaceActionStyle("secondary"),
                  width: "100%",
                  justifySelf: "stretch",
                }}
              >
                Open ROSCA
              </StableButton>
            </div>
          </div>
        ) : null}

        {supportLoanDeskOpen ? (
          <div
            {...marketplaceSurfaceTouchProps(
              "marketplace.support.financial-support-module"
            )}
            style={{
              ...marketplaceDepartmentShellStyle("support", isCompact),
            }}
          >
            <div style={sectionLabel()}>Loan Support requests</div>
            <div style={{ marginTop: 8, ...helperText(), maxWidth: 760 }}>
              This is the loan-support path only. ROSCA opens through its own
              path and does not share this request form.
            </div>
          </div>
        ) : null}

        {supportLoanDeskOpen ? (
          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {[
              ["1", "Start request", "Amount, duration, repayment, purpose."],
              ["2", "Check supporters", "GSN shows who can back the request."],
              ["3", "Send requests", "Send only after the draft is ready."],
            ].map(([step, title, detail]) => (
              <div
                key={step}
                style={{
                  borderRadius: 18,
                  border: "1px solid rgba(37,166,90,0.18)",
                  background:
                    "linear-gradient(180deg, rgba(243,251,246,0.98) 0%, rgba(230,244,236,0.94) 100%)",
                  padding: isCompact ? 8 : 14,
                  overflow: "hidden",
                  overflowAnchor: "none",
                }}
              >
                <div
                  style={{
                    ...sectionLabel(),
                    color: "#0B6B3B",
                    fontSize: isCompact ? 10 : 12,
                  }}
                >
                  Step {step}
                </div>
                <div
                  style={{
                    marginTop: isCompact ? 4 : 6,
                    color: "#08233A",
                    fontSize: isCompact ? 12 : 16,
                    fontWeight: 950,
                    lineHeight: isCompact ? 1.1 : 1.2,
                    overflowWrap: "break-word",
                  }}
                >
                  {title}
                </div>
                <div
                  style={{
                    marginTop: 5,
                    color: "#5E6F82",
                    fontSize: isCompact ? 12 : 13,
                    fontWeight: 800,
                    lineHeight: 1.35,
                    overflowWrap: "break-word",
                    display: isCompact ? "none" : undefined,
                  }}
                >
                  {detail}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {supportLoanDeskOpen ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "minmax(0, 1.05fr) minmax(320px, 0.95fr)",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div style={sectionLabel()}>Start a support request</div>

              <div style={{ marginTop: 8, ...helperText(), maxWidth: 760 }}>
                Enter the amount, duration, repayment plan, and purpose. GSN
                creates one support draft and then shows the people who may be
                able to back it.
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={badge(Boolean(loanDraftId))}>
                  {loanDraftId ? `Draft #${loanDraftId}` : "No draft yet"}
                </span>
                <span style={badge(requiredGuarantorCount > 0)}>
                  Supporters: {requiredGuarantorCount || "not checked"}
                </span>
                <span style={badge(suggestedSupporters.length > 0)}>
                  Fit: {suggestedSupporters.length}
                </span>
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "1fr 1fr",
                  gap: isCompact ? 9 : 12,
                }}
              >
                <div>
                  <div style={sectionLabel()}>Amount needed</div>
                  <input
                    {...marketplaceFieldTouchProps("marketplace.support.amount")}
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    disabled={supportProcessBusy}
                    placeholder="Enter amount"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>How long do you want it?</div>
                  <input
                    {...marketplaceFieldTouchProps("marketplace.support.duration-days")}
                    type="number"
                    min="1"
                    value={loanDurationDays}
                    onChange={(e) => setLoanDurationDays(e.target.value)}
                    disabled={supportProcessBusy}
                    placeholder="Duration in days"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div style={{ gridColumn: "1 / span 2" }}>
                  <div style={sectionLabel()}>Repayment plan</div>
                  <select
                    {...marketplaceFieldTouchProps("marketplace.support.repayment-cadence")}
                    value={loanRepaymentCadence}
                    onChange={(e) => setLoanRepaymentCadence(e.target.value)}
                    disabled={supportProcessBusy}
                    style={{ ...inputStyle(), marginTop: 8 }}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Every 2 weeks</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div style={{ gridColumn: "1 / span 2" }}>
                  <div style={sectionLabel()}>Purpose</div>
                  <textarea
                    {...marketplaceFieldTouchProps("marketplace.support.purpose")}
                    value={loanPurpose}
                    onChange={(e) => setLoanPurpose(e.target.value)}
                    disabled={supportProcessBusy}
                    placeholder="State what the support is for."
                    style={{
                      ...textAreaStyle(),
                      marginTop: 8,
                      minHeight: isCompact ? 72 : 96,
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 14, ...softCard("#F8FBFF") }}>
                <div style={sectionLabel()}>Agreement preview</div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  GSN records this as a support request and repayment commitment.
                </div>
                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gridTemplateColumns: isCompact
                      ? "repeat(2, minmax(0, 1fr))"
                      : "repeat(4, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <div style={innerCard("#FFFFFF")}>
                    <div style={sectionLabel()}>Requested</div>
                    <div style={{ marginTop: 6, color: "#07172C", fontWeight: 950 }}>
                      {agreementAmount
                        ? `${agreementAmount.toFixed(2)} ${poolCurrency}`
                        : "Enter amount"}
                    </div>
                  </div>
                  <div style={innerCard("#FFFFFF")}>
                    <div style={sectionLabel()}>Service fee</div>
                    <div style={{ marginTop: 6, color: "#07172C", fontWeight: 950 }}>
                      {agreementAmount
                        ? `${agreementServiceFee} ${poolCurrency}`
                        : "After amount"}
                    </div>
                  </div>
                  <div style={innerCard("#FFFFFF")}>
                    <div style={sectionLabel()}>You receive</div>
                    <div style={{ marginTop: 6, color: "#07172C", fontWeight: 950 }}>
                      {agreementAmount
                        ? `${agreementNetAmount} ${poolCurrency}`
                        : "After amount"}
                    </div>
                  </div>
                  <div style={innerCard("#FFFFFF")}>
                    <div style={sectionLabel()}>Repay by</div>
                    <div style={{ marginTop: 6, color: "#07172C", fontWeight: 950 }}>
                      {agreementDueAt}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                  Plan: {agreementRepaymentCadence}. Fee rule shown here follows the current
                  GSN support rule and is confirmed when the draft is created.
                </div>
              </div>

              <div style={{ marginTop: 12, ...softCard("#FFFBEF") }}>
                <div style={sectionLabel()}>Support window</div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  Supporters have a response window. If enough support does not
                  come in, GSN can expire unanswered requests and release locked
                  support after the grace window.
                </div>
              </div>

              <div
                style={{
                  ...marketplaceInlineActionsStyle(isCompact),
                  marginTop: 16,
                }}
              >
                <StableButton
                  debugId="marketplace.support.start-request"
                  type="button"
                  onClick={(event) => {
                    runMarketplaceAction(event, () => {
                      if (startingLoanDraft) return;
                      void handleStartLoanDraft();
                    });
                  }}
                  disabled={supportProcessBusy}
                  stableHeight={58}
                  style={marketplaceInlineActionStyle(
                    "primary",
                    supportProcessBusy,
                    isCompact
                  )}
                >
                  {startingLoanDraft ? "Starting..." : "Start Support Request"}
                </StableButton>

                {loanDraftId ? (
                  <StableButton
                    debugId="marketplace.support.refresh-fit"
                    type="button"
                    onClick={(event) => {
                      runMarketplaceAction(event, () => {
                        if (loadingSuggestions) return;
                        void handleRefreshSuggestions();
                      });
                    }}
                    disabled={supportProcessBusy}
                    stableHeight={58}
                    style={marketplaceInlineActionStyle(
                      "secondary",
                      supportProcessBusy,
                      isCompact
                    )}
                  >
                    {loadingSuggestions ? "Refreshing..." : "Refresh Fit Check"}
                  </StableButton>
                ) : null}

                {loanDraftId ? (
                  <StableButton
                    debugId="marketplace.support.cancel-draft"
                    type="button"
                    onClick={(event) => {
                      runMarketplaceAction(event, () => {
                        if (cancellingLoanDraft) return;
                        void handleCancelLoanDraft();
                      });
                    }}
                    disabled={supportProcessBusy}
                    stableHeight={58}
                    style={marketplaceInlineActionStyle(
                      "secondary",
                      supportProcessBusy,
                      isCompact
                    )}
                  >
                    {cancellingLoanDraft ? "Cancelling..." : "Cancel Draft"}
                  </StableButton>
                ) : null}
              </div>

              {loanDraftId ? (
                <details style={{ marginTop: 12 }}>
                  <StableDisclosureSummary
                    debugId="marketplace.support.deeper-pages.summary"
                    stableHeight={isCompact ? 48 : 52}
                    style={{
                      ...marketplaceActionStyle("soft"),
                      width: "100%",
                      justifyContent: "space-between",
                      padding: isCompact ? "0 12px" : "0 14px",
                      fontSize: isCompact ? 13 : 14,
                    }}
                  >
                    More support tools
                    <span aria-hidden="true">+</span>
                  </StableDisclosureSummary>

                  <div
                    style={{
                      ...marketplaceInlineActionsStyle(isCompact),
                      marginTop: 10,
                    }}
                  >
                    <StableButton
                      debugId="marketplace.support.loan-readiness"
                      type="button"
                      onClick={(event) =>
                        openMarketplaceCta(event, "loanReadiness")
                      }
                      disabled={supportProcessBusy}
                      stableHeight={58}
                      style={marketplaceInlineActionStyle("soft", supportProcessBusy, isCompact)}
                    >
                      Check readiness
                    </StableButton>
                    <StableButton
                      debugId="marketplace.support.loan-suggestions"
                      type="button"
                      onClick={(event) =>
                        openMarketplaceCta(event, "loanSuggestions")
                      }
                      disabled={supportProcessBusy}
                      stableHeight={58}
                      style={marketplaceInlineActionStyle("soft", supportProcessBusy, isCompact)}
                    >
                      Find supporters
                    </StableButton>
                    <StableButton
                      debugId="marketplace.support.loan-workbench"
                      type="button"
                      onClick={(event) =>
                        openMarketplaceCta(event, "loanWorkbench")
                      }
                      disabled={supportProcessBusy}
                      stableHeight={58}
                      style={marketplaceInlineActionStyle("soft", supportProcessBusy, isCompact)}
                    >
                      Support workbench
                    </StableButton>
                    <StableButton
                      debugId="marketplace.support.finance"
                      type="button"
                      onClick={(event) => openMarketplaceCta(event, "finance")}
                      disabled={supportProcessBusy}
                      stableHeight={58}
                      style={marketplaceInlineActionStyle("soft", supportProcessBusy, isCompact)}
                    >
                      Finance
                    </StableButton>
                    <StableButton
                      debugId="marketplace.support.full-loans"
                      type="button"
                      onClick={(event) => openMarketplaceCta(event, "loans")}
                      disabled={supportProcessBusy}
                      stableHeight={58}
                      style={marketplaceInlineActionStyle("soft", supportProcessBusy, isCompact)}
                    >
                      Full support view
                    </StableButton>
                  </div>
                </details>
              ) : null}

              {loanDraftId ? (
                <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
                  <div style={softCard("#FFFFFF")}>
                    <div style={sectionLabel()}>Draft status</div>

                    <ExplainToggle
                      label="What this draft status does"
                      what="This status strip shows how far the current support draft has moved, including whether supporters are required, how many fit suggestions exist, and how many people have responded."
                      why="It turns the draft into something readable so users can tell whether they should stay here, send support requests, or continue into the next support step."
                      next="Read the status first, then review the fit suggestions below or move into the deeper support tools only when the draft shows you what is still missing."
                      tone="light"
                      style={{ marginTop: 12 }}
                    />

                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={badge(true)}>
                        Status: {safeStr(loanDraftSummary?.status || "Open")}
                      </span>
                      <span style={badge(false)}>
                        Required supporters: {requiredGuarantorCount}
                      </span>
                      <span style={badge(false)}>
                        Suggested fit: {suggestedSupporters.length}
                      </span>
                      <span style={badge(false)}>Sent: {sentGuarantorCount}</span>
                      <span style={badge(false)}>
                        Approved: {approvedGuarantorCount}
                      </span>
                    </div>

                    <div style={{ marginTop: 12, ...helperText() }}>
                      {supportProcessMessage}
                    </div>
                  </div>

                  {requiredGuarantorCount > 0 ? (
                    <div style={softCard("#F8FBFF")}>
                      <div style={sectionLabel()}>Fit suggestions</div>

                      <ExplainToggle
                        label="What these fit suggestions do"
                        what="These suggestions show which visible community members may fit the current support request based on the draft amount and the support signals already available."
                        why="They help the user choose who to ask next without treating supporter selection like a blind guess or a random contact list."
                        next="Read the reason and suggested support amount first, choose only the people that make sense for this request, then continue once the chosen supporters reflect the draft."
                        tone="light"
                        style={{ marginTop: 12 }}
                      />

                      {suggestedSupporters.length === 0 ? (
                        <div style={{ marginTop: 10, ...helperText() }}>
                          No supporter suggestion is shown yet for this amount.
                        </div>
                      ) : (
                        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                          {suggestedSupporters.map((item: any) => {
                            const selected = selectedSupporterKeys.has(item.key);

                            return (
                              <div key={item.key} style={innerCard("#FFFFFF")}>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: 10,
                                    flexWrap: "wrap",
                                    alignItems: "center",
                                  }}
                                >
                                  <div>
                                    <div
                                      style={{
                                        color: "#0B1F33",
                                        fontWeight: 900,
                                        fontSize: 15,
                                        lineHeight: 1.35,
                                      }}
                                    >
                                      {item.name}
                                    </div>

                                    <div
                                      style={{
                                        marginTop: 6,
                                        display: "flex",
                                        gap: 8,
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      {safeStr(item.reason) ? (
                                        <span style={badge(false)}>
                                          {safeStr(item.reason)}
                                        </span>
                                      ) : null}

                                      {safeStr(item.recommendedPledge) ? (
                                        <span style={badge(true)}>
                                          Suggested support: {safeStr(item.recommendedPledge)}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>

                                  <StableButton
                                    debugId={`marketplace.support.suggestion.${item.key}.choose`}
                                    type="button"
                                    onClick={(event) => {
                                      runMarketplaceAction(event, () => {
                                        toggleSuggestedSupporter(item);
                                      });
                                    }}
                                    stableHeight={58}
                                    style={marketplaceInlineActionStyle(
                                      selected ? "primary" : "secondary",
                                      false,
                                      isCompact
                                    )}
                                  >
                                    {selected ? "Selected" : "Choose"}
                                  </StableButton>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {visibleSelectedSupporters.length > 0 ? (
                        <div style={{ marginTop: 14 }}>
                          <div style={sectionLabel()}>Chosen supporters</div>

                          <ExplainToggle
                            label="What these chosen supporters do"
                            what="These are the people you have selected for this draft so far. They are still candidates until the support requests are actually sent."
                            why="This keeps selection separate from approval so users do not mistake a chosen name for a completed support commitment."
                            next="Review the selected names here, remove anyone who no longer fits, then send the support requests only when the final set looks right."
                            tone="light"
                            style={{ marginTop: 12 }}
                          />

                          <div
                            style={{
                              ...marketplaceInlineActionsStyle(isCompact),
                              marginTop: 10,
                            }}
                          >
                            {visibleSelectedSupporters.map((item: any) => (
                              <StableButton
                                debugId={`marketplace.support.selected.${item.key}.remove`}
                                key={item.key}
                                type="button"
                                onClick={(event) => {
                                  runMarketplaceAction(event, () => {
                                    toggleSuggestedSupporter(item);
                                  });
                                }}
                                stableHeight={58}
                                style={marketplaceInlineActionStyle("soft", false, isCompact)}
                              >
                                {item.name} x
                              </StableButton>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <ExplainToggle
                        label="What this request step does"
                        what="This step sends the support requests to the selected people so the draft can move from chosen candidates into real outreach."
                        why="It separates selection from action, which helps users understand that support is not approved just because names have been picked."
                        next="Check that the selected count is enough, send the requests when the final set is ready, then watch the draft status for replies and approvals."
                        tone="light"
                        style={{ marginTop: 14 }}
                      />

                      <div
                        style={{
                          ...marketplaceInlineActionsStyle(isCompact),
                          marginTop: 14,
                        }}
                      >
                        <StableButton
                          debugId="marketplace.support.send-guarantor-requests"
                          type="button"
                          onClick={(event) => {
                            runMarketplaceAction(event, () => {
                              if (guarantorRequestsBlocked) {
                                showGuarantorRequestBlockedNotice();
                                return;
                              }
                              void handleSendGuarantorRequests();
                            });
                          }}
                          stableHeight={58}
                          style={marketplaceInlineActionStyle(
                            "primary",
                            guarantorRequestsBlocked,
                            isCompact
                          )}
                        >
                          {sendingGuarantorRequests
                            ? "Sending..."
                            : loanStatusLower === "approved"
                            ? "Already Approved"
                            : "Send Support Requests"}
                        </StableButton>

                        <span style={badge(false)}>
                          Selected: {visibleSelectedSupporters.length}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>Visible support items</div>

              <ExplainToggle
                label="What these support items do"
                what="This list shows the support items already visible in the current community, including the amount, status, and role attached to each item."
                why="It keeps people from confusing a live community support record with the draft they are still building on the left."
                next="Read this list to see what is already active here, then stay in the draft lane only if you still need to create or continue a separate request."
                tone="light"
                style={{ marginTop: 12 }}
              />

              <div
                style={{
                  marginTop: 10,
                  color: "#0B1F33",
                  fontSize: 20,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                Your visible support activity here
              </div>

              <div
                style={{
                  marginTop: 8,
                  ...helperText(),
                }}
              >
                These are the support items currently visible in this community.
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gap: 12,
                }}
              >
                {loans.length === 0 ? (
                  <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                    No visible support item is active in this community right now.
                  </div>
                ) : (
                  loans.slice(0, 6).map((item: any, index: number) => (
                    <div key={`${item.id || index}`} style={innerCard("#FCFEFF")}>
                      <div
                        style={{
                          color: "#0B1F33",
                          fontSize: 16,
                          fontWeight: 900,
                          lineHeight: 1.35,
                        }}
                      >
                        {firstTruthy(item?.purpose, item?.title, "Support item")}
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={badge(true)}>{getLoanAmountText(item)}</span>
                        <span style={badge(false)}>
                          Status: {firstTruthy(item?.status, "Open")}
                        </span>
                        <span style={badge(false)}>
                          Role: {firstTruthy(item?.role, "Support")}
                        </span>
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          color: "#5F7287",
                          fontSize: 13,
                          lineHeight: 1.7,
                        }}
                      >
                        {firstTruthy(
                          item?.borrower_name
                            ? `Requested by: ${item.borrower_name}`
                            : "",
                          item?.guarantor_name
                            ? `Supporter: ${item.guarantor_name}`
                            : "",
                          item?.created_at ? `Started: ${safeDateTime(item.created_at)}` : "",
                          "This support item is visible in your current community."
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>
      ) : null}
    </>
  );
}
