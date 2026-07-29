import React from "react";
import { GsnRealisticIcon } from "../../components/GsnRealisticIcon";
import PaymentProofSubmissionPanel from "../../components/PaymentProofSubmissionPanel";
import { StableButton } from "../../components/StableButton";
import type { BillingTaskPanelsData } from "./BillingTaskPanelsTypes";

type BillingTaskPanelsProps = {
  data: BillingTaskPanelsData;
};

export default function BillingTaskPanels({ data }: BillingTaskPanelsProps) {
  const {
    activeBillingAccountTask,
    activeBillingAccountTaskOption,
    activeBillingPaymentGroup,
    activeBillingPaymentGroupOption,
    activeBillingPaymentGroupTasks,
    activeBillingPaymentTask,
    activeBillingPaymentTaskOption,
    activeBillingTask,
    activeBillingTaskOption,
    activeLane,
    billingAccountTaskChooserOpen,
    billingInputStyle,
    billingIsActive,
    billingPaymentGroupChooserOpen,
    billingPaymentStepChooserOpen,
    billingSequenceSteps,
    billingSettlementCountry,
    billingStepCard,
    billingTaskChooserOpen,
    BILLING_ACCOUNT_TASK_OPTIONS,
    BILLING_PAYMENT_GROUP_OPTIONS,
    BILLING_TASK_OPTIONS,
    busyDomainPayment,
    busyQuote,
    canEditPayInAccount,
    cleanText,
    communityLinkClanRows,
    communityPayInCountryLabel,
    communityPayInDraft,
    communityPayInIsReady,
    communityPayInLoading,
    communityPayInRows,
    communityPayInSaving,
    compactStatus,
    createDedicatedDomainMarketplace,
    creatingDomainMarketplace,
    dashboard,
    domain,
    domainPayment,
    domainPaymentBankMatchLabel,
    domainPaymentIntent,
    domainPaymentProofLabel,
    domainPaymentReference,
    domainPaymentSettlement,
    domainPaymentSettlementLabel,
    domainPaymentSettlementReady,
    domainPaymentSettlementRows,
    domainPaymentStatusLabel,
    emptyCommunityDomainPayInDraft,
    featurePolicyModeLabel,
    generateDomainPaymentInstruction,
    helperText,
    iconFrame,
    iconHeaderStyle,
    isAdmin,
    linkedDomainClanId,
    linkedDomainClanRow,
    normalizeSettlementCountryCode,
    packageReviewActionLabel,
    paymentClanIdDraft,
    paymentClanRow,
    paymentsContributionsOff,
    paymentsContributionsPolicyMode,
    quote,
    quoteAmount,
    quoteCurrency,
    quoteNote,
    refreshQuote,
    saveCommunityDomainPayInAccount,
    sectionLabel,
    selectedDomainClanId,
    selectedLane,
    setActiveBillingAccountTask,
    setActiveBillingPaymentTask,
    setActiveBillingTask,
    setBillingAccountTaskChooserOpen,
    setBillingPaymentGroupChooserOpen,
    setBillingPaymentStepChooserOpen,
    setBillingSettlementCountry,
    setBillingTaskChooserOpen,
    setCommunityPayInDraft,
    setDomainPayment,
    setMessage,
    setPaymentClanIdDraft,
    setQuoteAmount,
    setQuoteCurrency,
    setQuoteNote,
    SETTLEMENT_COUNTRY_OPTIONS,
    settlementCurrencyForCountry,
    softCard,
    status,
    statusBadge,
    subscriptionStatusMode,
    updateCommunityPayInDraft,
  } = data;

  return (
    <>
{activeLane === "billing" ? (
                  <div style={softCard()}>
                    <div style={iconHeaderStyle()}>
                      <span style={iconFrame(48)}>
                        <GsnRealisticIcon name="finance-bank-building" size={36} decorative />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={sectionLabel()}>
                          {subscriptionStatusMode ? "Subscription" : "Billing"}
                        </div>
                        <h3 style={{ margin: "4px 0 0", fontSize: 20, lineHeight: 1.12 }}>
                          {subscriptionStatusMode
                            ? "Package and renewal status."
                            : "Code, account, proof."}
                        </h3>
                        <div style={{ ...helperText(), marginTop: 7, fontSize: 13 }}>
                          {subscriptionStatusMode
                            ? "Status only. Payment code, account, and proof stay in Billing jobs."
                            : "Generate one code, pay the shown account, then upload proof."}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        marginTop: 12,
                      }}
                    >
                      {subscriptionStatusMode ? (
                        <>
                          <span style={statusBadge(quote?.package_name || "package pending")}>
                            Package: {cleanText(quote?.package_name, "package pending")}
                          </span>
                          <span style={statusBadge(status.billing_status || selectedLane?.status)}>
                            Billing: {compactStatus(status.billing_status || selectedLane?.status)}
                          </span>
                          <span style={statusBadge(quote?.renewal_policy?.status || "not set")}>
                            Renewal: {compactStatus(quote?.renewal_policy?.status || "not set")}
                          </span>
                        </>
                      ) : (
                        <>
                          <span style={statusBadge(status.billing_status || selectedLane?.status)}>
                            Billing: {compactStatus(status.billing_status || selectedLane?.status)}
                          </span>
                          <span style={statusBadge(quote?.pricing_status || quote?.quote_status)}>
                            Quote: {compactStatus(quote?.pricing_status || quote?.quote_status)}
                          </span>
                          <span style={statusBadge(domainPaymentReference ? "code ready" : "code needed")}>
                            {domainPaymentReference ? "Code ready" : "Code needed"}
                          </span>
                        </>
                      )}
                    </div>
                    <div style={{ ...softCard(), marginTop: 12, display: "grid", gap: 10 }}>
                      <div style={sectionLabel()}>
                        {subscriptionStatusMode ? "Payment jobs" : "Billing jobs"}
                      </div>
                      {subscriptionStatusMode ? (
                        <div style={{ ...helperText(), fontSize: 13 }}>
                          Keep status reading here. Open a payment job only when you
                          need code, account, proof, or the step list.
                        </div>
                      ) : (
                        <div style={{ ...helperText(), fontSize: 13 }}>
                          Current billing job:{" "}
                          <strong>{activeBillingTaskOption.label}</strong>.{" "}
                          {activeBillingTaskOption.note}
                        </div>
                      )}
                      <StableButton
                        type="button"
                        kind="secondary"
                        fullWidth
                        stableHeight={42}
                        debugId="community-domain-dashboard.billing-task-toggle"
                        aria-expanded={billingTaskChooserOpen}
                        aria-controls="community-domain-billing-jobs"
                        onClick={() =>
                          setBillingTaskChooserOpen((current: boolean) => !current)
                        }
                        style={{
                          justifyContent: "center",
                          fontSize: 13,
                          textTransform: "none",
                        }}
                      >
                        {billingTaskChooserOpen
                          ? "Close billing jobs"
                          : "Change billing job"}
                      </StableButton>
                      {billingTaskChooserOpen ? (
                        <div
                          id="community-domain-billing-jobs"
                          data-debug-id="community-domain-dashboard.billing-task-panel"
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(min(100%, 132px), 1fr))",
                            gap: 8,
                          }}
                        >
                          {BILLING_TASK_OPTIONS.map((task) => (
                            <StableButton
                              key={task.key}
                              type="button"
                              kind={
                                activeBillingTask === task.key
                                  ? "primary"
                                  : "secondary"
                              }
                              stableHeight={46}
                              debugId={`community-domain-dashboard.billing-task.${task.key}`}
                              onClick={() => {
                                setActiveBillingTask(task.key);
                                setBillingTaskChooserOpen(false);
                                setBillingPaymentGroupChooserOpen(false);
                                setBillingPaymentStepChooserOpen(false);
                                setBillingAccountTaskChooserOpen(false);
                                if (task.key === "payment_code") {
                                  setActiveBillingPaymentTask("reference");
                                } else if (task.key === "account") {
                                  setActiveBillingAccountTask("summary");
                                }
                              }}
                            >
                              {task.label}
                            </StableButton>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {activeBillingTask === "steps" ? (
                      <div
                        style={{
                          display: "grid",
                          gap: 9,
                          marginTop: 12,
                        }}
                      >
                        {billingSequenceSteps.map((item) =>
                          billingStepCard(
                            item.step,
                            item.title,
                            item.detail,
                            item.status,
                            item.active
                          )
                        )}
                      </div>
                    ) : null}
                    {activeBillingTask === "account" ? (
                    <div
                      style={{
                        ...softCard(),
                        marginTop: 12,
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={sectionLabel()}>Community pay-in account</div>
                          <h4 style={{ margin: "4px 0 0", fontSize: 16, lineHeight: 1.18 }}>
                            Shown to payers. Locked for editing.
                          </h4>
                        </div>
                        <span
                          style={statusBadge(
                            communityPayInLoading
                              ? "Loading"
                              : communityPayInIsReady
                              ? "Ready"
                              : "Not saved"
                          )}
                        >
                          {communityPayInLoading
                            ? "Loading"
                            : communityPayInIsReady
                            ? "Ready"
                            : "Not saved"}
                        </span>
                      </div>
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        Use this account with the generated code. Editing is GSN-admin only.
                      </div>
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        Current pay-in account view:{" "}
                        <strong>{activeBillingAccountTaskOption.label}</strong>.{" "}
                        {activeBillingAccountTaskOption.note}
                      </div>
                      <StableButton
                        type="button"
                        kind="secondary"
                        fullWidth
                        stableHeight={42}
                        debugId="community-domain-dashboard.billing-account-toggle"
                        aria-expanded={billingAccountTaskChooserOpen}
                        aria-controls="community-domain-billing-account-packets"
                        onClick={() =>
                          setBillingAccountTaskChooserOpen((current: boolean) => !current)
                        }
                        style={{
                          justifyContent: "center",
                          fontSize: 13,
                          textTransform: "none",
                        }}
                      >
                        {billingAccountTaskChooserOpen
                          ? "Close pay-in account views"
                          : "Change pay-in account view"}
                      </StableButton>
                      {billingAccountTaskChooserOpen ? (
                        <div
                          id="community-domain-billing-account-packets"
                          data-debug-id="community-domain-dashboard.billing-account-panel"
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(min(100%, 145px), 1fr))",
                            gap: 8,
                          }}
                        >
                          {BILLING_ACCOUNT_TASK_OPTIONS.map((task) => {
                            const selected = task.key === activeBillingAccountTask;
                            return (
                              <StableButton
                                key={task.key}
                                type="button"
                                kind={selected ? "primary" : "secondary"}
                                stableHeight={46}
                                aria-pressed={selected}
                                title={task.note}
                                debugId={`community-domain-dashboard.billing-account.${task.key}`}
                                onClick={() => {
                                  setActiveBillingAccountTask(task.key);
                                  setBillingAccountTaskChooserOpen(false);
                                  if (task.key === "setup" && !communityPayInIsReady) {
                                    const nextCountry = normalizeSettlementCountryCode(
                                      billingSettlementCountry
                                    );
                                    setCommunityPayInDraft(
                                      emptyCommunityDomainPayInDraft(
                                        nextCountry,
                                        settlementCurrencyForCountry(nextCountry)
                                      )
                                    );
                                  }
                                }}
                              >
                                {task.label}
                              </StableButton>
                            );
                          })}
                        </div>
                      ) : null}
                      {activeBillingAccountTask === "summary" && communityPayInIsReady ? (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              borderRadius: 12,
                              background: "rgba(255,255,255,0.82)",
                              border: "1px solid rgba(9,27,46,0.10)",
                              padding: "8px 10px",
                            }}
                          >
                            <div style={{ ...sectionLabel(), fontSize: 11 }}>Area</div>
                            <div
                              style={{
                                color: "#091B2E",
                                fontSize: 13,
                                fontWeight: 900,
                                marginTop: 3,
                              }}
                            >
                              {communityPayInCountryLabel}
                            </div>
                          </div>
                          {communityPayInRows.slice(0, 5).map(([label, value]) => (
                            <div
                              key={label}
                              style={{
                                borderRadius: 12,
                                background: "rgba(255,255,255,0.82)",
                                border: "1px solid rgba(9,27,46,0.10)",
                                padding: "8px 10px",
                              }}
                            >
                              <div style={{ ...sectionLabel(), fontSize: 11 }}>{label}</div>
                              <div
                                style={{
                                  color: "#091B2E",
                                  fontSize: 13,
                                  fontWeight: 900,
                                  marginTop: 3,
                                  overflowWrap: "anywhere",
                                }}
                              >
                                {value}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {activeBillingAccountTask === "summary" && !communityPayInIsReady ? (
                        <div style={{ ...helperText(), fontSize: 13, fontWeight: 820 }}>
                          No account is saved yet. Do not pay until GSN assigns one.
                        </div>
                      ) : null}
                      {activeBillingAccountTask === "setup" && !canEditPayInAccount ? (
                        <div style={{ ...helperText(), fontSize: 12.5, fontWeight: 820 }}>
                          Edit locked. The account can be used for payment, but only GSN platform
                          admin can change it during the pilot.
                        </div>
                      ) : null}
                      {activeBillingAccountTask === "setup" && canEditPayInAccount ? (
                        <div style={{ display: "grid", gap: 10 }}>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                              gap: 10,
                            }}
                          >
                            <label style={{ display: "grid", gap: 6 }}>
                              <span style={sectionLabel()}>Area</span>
                              <select
                                value={communityPayInDraft.country}
                                onChange={(event) =>
                                  updateCommunityPayInDraft("country", event.target.value)
                                }
                                style={billingInputStyle()}
                              >
                                {SETTLEMENT_COUNTRY_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label} - {option.currency}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span style={sectionLabel()}>Currency</span>
                              <input
                                value={communityPayInDraft.currency}
                                onChange={(event) =>
                                  updateCommunityPayInDraft("currency", event.target.value)
                                }
                                maxLength={3}
                                placeholder="GBP"
                                style={billingInputStyle()}
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span style={sectionLabel()}>Bank</span>
                              <input
                                value={communityPayInDraft.bankName}
                                onChange={(event) =>
                                  updateCommunityPayInDraft("bankName", event.target.value)
                                }
                                placeholder="Bank name"
                                style={billingInputStyle()}
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span style={sectionLabel()}>Account name</span>
                              <input
                                value={communityPayInDraft.accountName}
                                onChange={(event) =>
                                  updateCommunityPayInDraft("accountName", event.target.value)
                                }
                                placeholder="Account holder"
                                style={billingInputStyle()}
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span style={sectionLabel()}>Account number</span>
                              <input
                                value={communityPayInDraft.accountNumber}
                                onChange={(event) =>
                                  updateCommunityPayInDraft("accountNumber", event.target.value)
                                }
                                inputMode="numeric"
                                placeholder="Account number"
                                style={billingInputStyle()}
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span style={sectionLabel()}>Sort code</span>
                              <input
                                value={communityPayInDraft.sortCode}
                                onChange={(event) =>
                                  updateCommunityPayInDraft("sortCode", event.target.value)
                                }
                                placeholder="UK sort code"
                                style={billingInputStyle()}
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span style={sectionLabel()}>Routing number</span>
                              <input
                                value={communityPayInDraft.routingNumber}
                                onChange={(event) =>
                                  updateCommunityPayInDraft("routingNumber", event.target.value)
                                }
                                placeholder="US/other routing"
                                style={billingInputStyle()}
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span style={sectionLabel()}>IBAN</span>
                              <input
                                value={communityPayInDraft.iban}
                                onChange={(event) =>
                                  updateCommunityPayInDraft("iban", event.target.value)
                                }
                                placeholder="IBAN if used"
                                style={billingInputStyle()}
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span style={sectionLabel()}>SWIFT / BIC</span>
                              <input
                                value={communityPayInDraft.swiftBic}
                                onChange={(event) =>
                                  updateCommunityPayInDraft("swiftBic", event.target.value)
                                }
                                placeholder="SWIFT/BIC if used"
                                style={billingInputStyle()}
                              />
                            </label>
                          </div>
                          <label style={{ display: "grid", gap: 6 }}>
                            <span style={sectionLabel()}>Finance note</span>
                            <textarea
                              value={communityPayInDraft.note}
                              onChange={(event) =>
                                updateCommunityPayInDraft("note", event.target.value)
                              }
                              placeholder="Instruction shown with this account"
                              style={{
                                ...billingInputStyle(),
                                minHeight: 92,
                                padding: "12px",
                                resize: "vertical",
                              }}
                            />
                          </label>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                              gap: 8,
                            }}
                          >
                            <StableButton
                              type="button"
                              kind="primary"
                              fullWidth
                              disabled={communityPayInSaving}
                              debugId="community-domain-dashboard.pay-in-account-save"
                              onClick={saveCommunityDomainPayInAccount}
                            >
                              {communityPayInSaving ? "Saving account..." : "Save pay-in account"}
                            </StableButton>
                            <StableButton
                              type="button"
                              kind="secondary"
                              fullWidth
                              debugId="community-domain-dashboard.pay-in-account-close"
                              onClick={() => {
                                setActiveBillingAccountTask("summary");
                                setBillingAccountTaskChooserOpen(false);
                              }}
                            >
                              Close
                            </StableButton>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    ) : null}
                    {activeBillingTask === "payment_code" ? (
                      <>
                    <StableButton
                      type="button"
                      kind="secondary"
                      fullWidth
                      disabled={busyQuote}
                      debugId="community-domain-dashboard.refresh-package-quote"
                      onClick={refreshQuote}
                      style={{ marginTop: 12 }}
                    >
                      {packageReviewActionLabel}
                    </StableButton>

                    <div
                      style={{
                        ...softCard(),
                        marginTop: 12,
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <div style={sectionLabel()}>Payment rule</div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        <span style={statusBadge("Subscription billing")}>
                          Subscription billing: required
                        </span>
                        <span
                          style={statusBadge(
                            paymentsContributionsOff
                              ? "Domain payments off"
                              : featurePolicyModeLabel(paymentsContributionsPolicyMode)
                          )}
                        >
                          Payments and Contributions:{" "}
                          {paymentsContributionsOff
                            ? "off for domain activity"
                            : featurePolicyModeLabel(paymentsContributionsPolicyMode)}
                        </span>
                      </div>
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        This setup payment is the Community Domain subscription.
                        Do not use the Payments and Contributions setting to block this setup payment.
                        Use that setting for registrations,
                        donations, event fees, seminar fees, and other domain money-in.
                      </div>
                    </div>

                    <div style={{ ...softCard(), marginTop: 12, display: "grid", gap: 10 }}>
                      <div style={sectionLabel()}>Code & proof views</div>
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        Current view:{" "}
                        <strong>{activeBillingPaymentGroupOption.label}</strong>.{" "}
                        {activeBillingPaymentGroupOption.note}
                      </div>
                      <StableButton
                        type="button"
                        kind="secondary"
                        fullWidth
                        stableHeight={42}
                        debugId="community-domain-dashboard.billing-payment-group-toggle"
                        aria-expanded={billingPaymentGroupChooserOpen}
                        aria-controls="community-domain-billing-payment-groups"
                        onClick={() =>
                          setBillingPaymentGroupChooserOpen((current: boolean) => !current)
                        }
                        style={{
                          justifyContent: "center",
                          fontSize: 13,
                          textTransform: "none",
                        }}
                      >
                        {billingPaymentGroupChooserOpen
                          ? "Close code/proof views"
                          : "Change code/proof view"}
                      </StableButton>
                      {billingPaymentGroupChooserOpen ? (
                        <div
                          id="community-domain-billing-payment-groups"
                          data-debug-id="community-domain-dashboard.billing-payment-group-panel"
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(min(100%, 132px), 1fr))",
                            gap: 8,
                          }}
                        >
                          {BILLING_PAYMENT_GROUP_OPTIONS.map((group) => {
                            const selected = group.key === activeBillingPaymentGroup;
                            return (
                              <StableButton
                                key={group.key}
                                type="button"
                                kind={selected ? "primary" : "secondary"}
                                stableHeight={44}
                                fullWidth
                                aria-pressed={selected}
                                title={group.note}
                                debugId={`community-domain-dashboard.billing-payment-group.${group.key}`}
                                onClick={() => {
                                  setActiveBillingPaymentTask(group.defaultTask);
                                  setBillingPaymentGroupChooserOpen(false);
                                  setBillingPaymentStepChooserOpen(false);
                                }}
                                style={{
                                  justifyContent: "center",
                                  fontSize: 13,
                                  textTransform: "none",
                                }}
                              >
                                {group.label}
                              </StableButton>
                            );
                          })}
                        </div>
                      ) : null}
                      {activeBillingPaymentGroupTasks.length > 1 ? (
                        <div
                          style={{
                            borderTop: "1px solid rgba(9,27,46,0.08)",
                            paddingTop: 10,
                            display: "grid",
                            gap: 8,
                          }}
                        >
                          <div style={sectionLabel()}>
                            {activeBillingPaymentGroupOption.label} steps
                          </div>
                          <div style={{ ...helperText(), fontSize: 13 }}>
                            Current step:{" "}
                            <strong>{activeBillingPaymentTaskOption.label}</strong>.{" "}
                            {activeBillingPaymentTaskOption.note}
                          </div>
                          <StableButton
                            type="button"
                            kind="secondary"
                            fullWidth
                            stableHeight={40}
                            debugId="community-domain-dashboard.billing-payment-step-toggle"
                            aria-expanded={billingPaymentStepChooserOpen}
                            aria-controls="community-domain-billing-payment-steps"
                            onClick={() =>
                              setBillingPaymentStepChooserOpen((current: boolean) => !current)
                            }
                            style={{
                              justifyContent: "center",
                              fontSize: 13,
                              textTransform: "none",
                            }}
                          >
                            {billingPaymentStepChooserOpen
                              ? `Close ${activeBillingPaymentGroupOption.label} steps`
                              : `Change ${activeBillingPaymentGroupOption.label} step`}
                          </StableButton>
                          {billingPaymentStepChooserOpen ? (
                            <div
                              id="community-domain-billing-payment-steps"
                              data-debug-id="community-domain-dashboard.billing-payment-step-panel"
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(min(100%, 128px), 1fr))",
                                gap: 8,
                              }}
                            >
                              {activeBillingPaymentGroupTasks.map((task) => {
                                const selected = task.key === activeBillingPaymentTask;
                                return (
                                  <StableButton
                                    key={task.key}
                                    type="button"
                                    kind={selected ? "primary" : "secondary"}
                                    stableHeight={40}
                                    fullWidth
                                    aria-pressed={selected}
                                    title={task.note}
                                    debugId={`community-domain-dashboard.billing-payment.${task.key}`}
                                    onClick={() => {
                                      setActiveBillingPaymentTask(task.key);
                                      setBillingPaymentStepChooserOpen(false);
                                    }}
                                    style={{
                                      justifyContent: "center",
                                      fontSize: 13,
                                      textTransform: "none",
                                    }}
                                  >
                                    {task.label}
                                  </StableButton>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      {activeBillingPaymentGroupTasks.length === 1 ? (
                        <div style={{ ...helperText(), fontSize: 13 }}>
                          Current step:{" "}
                          <strong>{activeBillingPaymentTaskOption.label}</strong>.{" "}
                          {activeBillingPaymentTaskOption.note}
                        </div>
                      ) : null}
                    </div>

                    {activeBillingPaymentTask === "generate" &&
                    (!isAdmin || billingIsActive) ? (
                      <div style={{ ...softCard(), marginTop: 12 }}>
                        <div style={sectionLabel()}>Generate payment code</div>
                        <div style={{ ...helperText(), marginTop: 7 }}>
                          Payment-code generation is locked here because billing is
                          already active or this account does not have Community
                          Domain admin authority.
                        </div>
                      </div>
                    ) : null}

                    {activeBillingPaymentTask === "generate" &&
                    isAdmin &&
                    !billingIsActive ? (
                      <div style={{ ...softCard(), marginTop: 12 }}>
                        <div style={sectionLabel()}>Generate payment code</div>
                        <div style={{ ...helperText(), marginTop: 7, fontSize: 13 }}>
                          Enter amount, area, and currency.
                        </div>
                        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                          <div style={sectionLabel()}>Linked marketplace community</div>
                          {linkedDomainClanId ? (
                            <div style={{ ...helperText(), fontSize: 13, fontWeight: 820 }}>
                              Locked to{" "}
                              <strong>
                                {cleanText(
                                  linkedDomainClanRow?.name || paymentClanRow?.name,
                                  `Community ${linkedDomainClanId}`
                                )}
                              </strong>
                              . Marketplace, invite, shop, and member lists use this
                              linked community only.
                            </div>
                          ) : (
                            <>
                              <select
                                value={paymentClanIdDraft}
                                onChange={(event) =>
                                  setPaymentClanIdDraft(event.target.value)
                                }
                                style={billingInputStyle()}
                              >
                                <option value="">
                                  Choose the dedicated marketplace community
                                </option>
                                {communityLinkClanRows.map((row) => (
                                  <option key={row.id} value={String(row.id)}>
                                    {row.name}
                                    {row.communityCode ? ` - ${row.communityCode}` : ""}
                                  </option>
                                ))}
                              </select>
                              <div style={{ ...helperText(), fontSize: 12.5 }}>
                                Choose only the Community Home record that belongs to
                                this Community Domain. This step no longer borrows
                                the last marketplace selected on your phone.
                              </div>
                              {paymentClanRow ? (
                                <div
                                  style={{
                                    ...helperText(),
                                    fontSize: 12.5,
                                    fontWeight: 860,
                                  }}
                                >
                                  Payment code will link{" "}
                                  {cleanText(domain?.display_name, "this Community Domain")}{" "}
                                  to {paymentClanRow.name}.
                                </div>
                              ) : null}
                              <StableButton
                                type="button"
                                kind="secondary"
                                fullWidth
                                disabled={creatingDomainMarketplace}
                                debugId="community-domain-dashboard.create-linked-marketplace"
                                onClick={createDedicatedDomainMarketplace}
                              >
                                {creatingDomainMarketplace
                                  ? "Creating marketplace..."
                                  : "Create dedicated marketplace"}
                              </StableButton>
                            </>
                          )}
                        </div>
                        <div
                          style={{
                            marginTop: 12,
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                            gap: 10,
                          }}
                        >
                          <label style={{ display: "grid", gap: 6 }}>
                            <span style={sectionLabel()}>Amount</span>
                            <input
                              value={quoteAmount}
                              onChange={(event) => setQuoteAmount(event.target.value)}
                              inputMode="decimal"
                              placeholder="Agreed quote"
                              style={billingInputStyle()}
                            />
                          </label>
                          <label style={{ display: "grid", gap: 6 }}>
                            <span style={sectionLabel()}>Area</span>
                            <select
                              value={billingSettlementCountry}
                              onChange={(event) => {
                                const nextCountry = normalizeSettlementCountryCode(
                                  event.target.value
                                );
                                setBillingSettlementCountry(nextCountry);
                                setQuoteCurrency(settlementCurrencyForCountry(nextCountry));
                              }}
                              style={billingInputStyle()}
                            >
                              {SETTLEMENT_COUNTRY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label} - {option.currency}
                                </option>
                              ))}
                            </select>
                            <span style={{ ...helperText(), fontSize: 12 }}>
                              Currency follows the selected area. Bank details appear after code generation.
                            </span>
                          </label>
                          <label style={{ display: "grid", gap: 6 }}>
                            <span style={sectionLabel()}>Currency</span>
                            <input
                              value={quoteCurrency}
                              onChange={(event) => setQuoteCurrency(event.target.value.toUpperCase())}
                              maxLength={3}
                              placeholder="GBP"
                              style={billingInputStyle()}
                            />
                          </label>
                        </div>
                        <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
                          <span style={sectionLabel()}>Quote note</span>
                          <input
                            value={quoteNote}
                            onChange={(event) => setQuoteNote(event.target.value)}
                            placeholder="Optional note from the agreed quote"
                            style={billingInputStyle()}
                          />
                        </label>
                        <StableButton
                          type="button"
                          kind="primary"
                          fullWidth
                          disabled={busyDomainPayment}
                          debugId="community-domain-dashboard.generate-payment-code"
                          onClick={generateDomainPaymentInstruction}
                          style={{ marginTop: 12 }}
                        >
                          {busyDomainPayment ? "Generating code..." : "Generate payment code"}
                        </StableButton>
                      </div>
                    ) : null}

                    {domainPayment && activeBillingPaymentTask !== "generate" ? (
                      <div style={{ ...softCard(), marginTop: 12 }}>
                        <div style={sectionLabel()}>Latest payment code</div>
                        <div style={{ ...helperText(), marginTop: 7, fontWeight: 900 }}>
                          {cleanText(
                            domainPayment.reference_display || domainPayment.reference_normalized,
                            "Payment code not shown"
                          )}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                            marginTop: 10,
                          }}
                        >
                          <span style={statusBadge(`Payment: ${domainPaymentStatusLabel}`)}>
                            Payment: {domainPaymentStatusLabel}
                          </span>
                          <span style={statusBadge(`Bank match: ${domainPaymentBankMatchLabel}`)}>
                            Bank match: {domainPaymentBankMatchLabel}
                          </span>
                          <span style={statusBadge(`Proof: ${domainPaymentProofLabel}`)}>
                            Proof: {domainPaymentProofLabel}
                          </span>
                        </div>
                        <div style={{ ...helperText(), marginTop: 9 }}>
                          Amount:{" "}
                          <strong>
                            {cleanText(domainPayment.amount, "0")}{" "}
                            {cleanText(domainPayment.currency, quoteCurrency || "GBP")}
                          </strong>
                          . Finance confirms only after bank/provider reconciliation succeeds.
                        </div>
                        {activeBillingPaymentTask === "credit_link" ? (
                          <div
                            style={{
                              marginTop: 10,
                              borderRadius: 16,
                              border: "1px solid rgba(12,79,168,0.18)",
                              background: "#F1F7FF",
                              padding: "12px",
                              display: "grid",
                              gap: 9,
                            }}
                          >
                            <div style={sectionLabel()}>GSN credit link</div>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                                gap: 8,
                              }}
                            >
                              {[
                                [
                                  "GSN ID",
                                  cleanText(
                                    domainPaymentIntent?.payer_gmfn_id,
                                    "Signed-in owner account"
                                  ),
                                ],
                                [
                                  "Community",
                                  cleanText(
                                    domainPaymentIntent?.community_name,
                                    `Community ${selectedDomainClanId || ""}`.trim()
                                  ),
                                ],
                                [
                                  "Domain",
                                  cleanText(
                                    domainPaymentIntent?.domain_display_name,
                                    cleanText(
                                      dashboard?.community_domain?.display_name,
                                      "Community Domain"
                                    )
                                  ),
                                ],
                                [
                                  "Record",
                                  cleanText(
                                    domainPaymentIntent?.expected_payment_id,
                                    cleanText(domainPayment?.id)
                                  ),
                                ],
                              ].map(([label, value]) => (
                                <div
                                  key={label}
                                  style={{
                                    borderRadius: 12,
                                    background: "rgba(255,255,255,0.82)",
                                    border: "1px solid rgba(9,27,46,0.10)",
                                    padding: "8px 10px",
                                  }}
                                >
                                  <div style={{ ...sectionLabel(), fontSize: 11 }}>{label}</div>
                                  <div
                                    style={{
                                      color: "#091B2E",
                                      fontSize: 13,
                                      fontWeight: 900,
                                      marginTop: 3,
                                      overflowWrap: "anywhere",
                                    }}
                                  >
                                    {cleanText(value, "Recorded")}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div style={{ ...helperText(), fontSize: 12.5, fontWeight: 820 }}>
                              Use only the payment code as the bank reference.
                            </div>
                          </div>
                        ) : null}
                        {activeBillingPaymentTask === "pay_account" ? (
                          <div
                            style={{
                              marginTop: 10,
                              borderRadius: 16,
                              border: domainPaymentSettlementReady
                                ? "1px solid rgba(22,101,52,0.22)"
                                : "1px solid rgba(146,64,14,0.24)",
                              background: domainPaymentSettlementReady
                                ? "rgba(240,253,244,0.88)"
                                : "rgba(255,247,237,0.92)",
                              padding: "12px",
                              display: "grid",
                              gap: 9,
                            }}
                          >
                            <div style={sectionLabel()}>
                              Official GSN account for {domainPaymentSettlementLabel}
                            </div>
                            {domainPaymentSettlementReady ? (
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns:
                                    "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
                                  gap: 8,
                                }}
                              >
                                {domainPaymentSettlementRows.map(([label, value]) => (
                                  <div
                                    key={label}
                                    style={{
                                      borderRadius: 12,
                                      background: "rgba(255,255,255,0.82)",
                                      border: "1px solid rgba(9,27,46,0.10)",
                                      padding: "8px 10px",
                                    }}
                                  >
                                    <div style={{ ...sectionLabel(), fontSize: 11 }}>
                                      {label}
                                    </div>
                                    <div
                                      style={{
                                        color: "#091B2E",
                                        fontSize: 13,
                                        fontWeight: 900,
                                        marginTop: 3,
                                        overflowWrap: "anywhere",
                                      }}
                                    >
                                      {value}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ ...helperText(), fontSize: 13, fontWeight: 850 }}>
                                Payment account is not ready for this area yet. Do not send
                                money until GSN finance gives an active account.
                              </div>
                            )}
                            {cleanText(domainPaymentSettlement?.support_note) ? (
                              <div style={{ ...helperText(), fontSize: 12.5 }}>
                                {cleanText(domainPaymentSettlement?.support_note)}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        {activeBillingPaymentTask === "proof" ? (
                          <>
                            <div
                              style={{
                                marginTop: 10,
                                borderRadius: 16,
                                border: "1px solid rgba(12,79,168,0.18)",
                                background: "#F1F7FF",
                                color: "#25415F",
                                padding: "10px 12px",
                                fontSize: 13,
                                fontWeight: 820,
                                lineHeight: 1.45,
                              }}
                            >
                              Use this code as the payment reference in your own bank or
                              provider channel. If the bank asks for app approval, SMS OTP,
                              a one-time code, code generator, or biometric confirmation,
                              complete that with the bank first.
                            </div>
                            <div style={{ marginTop: 10 }}>
                              <PaymentProofSubmissionPanel
                                payment={domainPayment}
                                clanId={selectedDomainClanId}
                                title="Community Domain payment proof"
                                compact
                                debugIdPrefix="community-domain-payment-proof"
                                onUploaded={(updated) => {
                                  setDomainPayment({ ...domainPayment, ...updated });
                                  setMessage(
                                    "Community Domain payment proof uploaded for finance review. Activation still waits for reconciliation."
                                  );
                                }}
                                onNotice={(tone, text) => {
                                  if (tone === "success" || tone === "error") {
                                    setMessage(text);
                                  }
                                }}
                              />
                            </div>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                    {!domainPayment && activeBillingPaymentTask !== "generate" ? (
                      <div style={{ ...softCard(), marginTop: 12 }}>
                        <div style={sectionLabel()}>Payment code needed</div>
                        <div style={{ ...helperText(), marginTop: 7 }}>
                          Generate the Community Domain payment code first. The
                          official pay account and proof upload appear after the
                          payment record exists.
                        </div>
                        <StableButton
                          type="button"
                          kind="primary"
                          fullWidth
                          debugId="community-domain-dashboard.open-generate-payment-code"
                          onClick={() => {
                            setActiveBillingPaymentTask("generate");
                            setBillingPaymentGroupChooserOpen(false);
                            setBillingPaymentStepChooserOpen(false);
                            setBillingAccountTaskChooserOpen(false);
                          }}
                          style={{ marginTop: 12 }}
                        >
                          Open Generate
                        </StableButton>
                      </div>
                    ) : null}
                      </>
                    ) : null}
                  </div>
                ) : null}
    </>
  );
}
