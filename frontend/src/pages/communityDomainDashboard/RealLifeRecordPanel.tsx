/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// Lazy UI shell receives parent-typed workflow state through one data prop; parent and audits keep behavioral coverage.
import React from "react";
import { GsnRealisticIcon } from "../../components/GsnRealisticIcon";
import { StableButton } from "../../components/StableButton";

type Props = {
  data: Record<string, any>;
};

export default function CommunityDomainRealLifeRecordPanel({ data }: Props) {
  const {
    ACTIVITY_RECORD_STAGE_OPTIONS,
    ACTIVITY_RECORD_TASK_OPTIONS,
    BENEFICIARY_CHALLENGE_STATUS_OPTIONS,
    BENEFICIARY_CONFIRMATION_OPTIONS,
    BENEFICIARY_CONTACT_CONSENT_WITHDRAWAL_REASON_OPTIONS,
    BENEFICIARY_CONTACT_REFERENCE_STATUS_OPTIONS,
    BENEFICIARY_CORRECTION_DECISION_OPTIONS,
    BENEFICIARY_DELIVERY_CHANNEL_OPTIONS,
    BENEFICIARY_DELIVERY_CONSENT_OPTIONS,
    BENEFICIARY_DELIVERY_RECEIPT_CORRECTION_OPTIONS,
    BENEFICIARY_DELIVERY_STATUS_OPTIONS,
    BENEFICIARY_FOLLOW_UP_STATE_OPTIONS,
    BENEFICIARY_OUTCOME_RECENT_PACKET_OPTIONS,
    BENEFICIARY_OUTCOME_RECORD_STAGE_OPTIONS,
    BENEFICIARY_OUTCOME_STATE_OPTIONS,
    BENEFICIARY_OUTCOME_TASK_OPTIONS,
    activeActivityRecordStage,
    activeActivityRecordTask,
    activeActivityRecordTaskOption,
    activeBeneficiaryOutcomeRecordStage,
    activeBeneficiaryOutcomeTask,
    activeBeneficiaryOutcomeTaskOption,
    activeGovernanceTask,
    activeRealLifeRecordTask,
    activityCatalogueOptions,
    activityDraft,
    activityRecordStageChooserOpen,
    activityRecordTaskChooserOpen,
    activityRows,
    beneficiaryContactConsentDraftByOutcomeId,
    beneficiaryContactConsentWithdrawalDraftByOutcomeId,
    beneficiaryCorrectionDecisionByOutcomeId,
    beneficiaryCorrectionNoteByOutcomeId,
    beneficiaryDeliveryPackByOutcomeId,
    beneficiaryDeliveryReceiptCorrectionDraftByOutcomeId,
    beneficiaryDeliveryReceiptDraftByOutcomeId,
    beneficiaryOutcomeConfirmationActionById,
    beneficiaryOutcomeConfirmationActionChooserOpenById,
    beneficiaryOutcomeConfirmationActionOpenById,
    beneficiaryOutcomeContactActionById,
    beneficiaryOutcomeContactActionChooserOpenById,
    beneficiaryOutcomeContactActionOpenById,
    beneficiaryOutcomeDeliveryNotesOpenById,
    beneficiaryOutcomeDraft,
    beneficiaryOutcomeReceiptFormOpenById,
    beneficiaryOutcomeRecentPacketById,
    beneficiaryOutcomeRecentPacketChooserOpenById,
    beneficiaryOutcomeRecordStageChooserOpen,
    beneficiaryOutcomeRows,
    beneficiaryOutcomeSummaryDetailsOpenById,
    beneficiaryOutcomeTaskChooserOpen,
    billingInputStyle,
    busyActivityRecord,
    busyBeneficiaryOutcomeRecord,
    busyOutcomeConfirmationLinkId,
    busyOutcomeContactConsentId,
    busyOutcomeContactConsentWithdrawalId,
    busyOutcomeCorrectionReviewId,
    busyOutcomeDeliveryReceiptCorrectionId,
    busyOutcomeDeliveryReceiptId,
    busyOutcomeProviderSendId,
    checkBeneficiaryOutcomeProviderSend,
    cleanText,
    compactStatus,
    correctBeneficiaryOutcomeDeliveryReceipt,
    createBeneficiaryOutcomeConfirmationLink,
    emptyBeneficiaryContactConsentDraft,
    emptyBeneficiaryContactConsentWithdrawalDraft,
    emptyBeneficiaryDeliveryReceiptCorrectionDraft,
    emptyBeneficiaryDeliveryReceiptDraft,
    helperText,
    iconFrame,
    iconHeaderStyle,
    isAdmin,
    noticeDateLabel,
    realLifeRecordTypeChooserOpen,
    recordBeneficiaryOutcomeContactConsent,
    recordBeneficiaryOutcomeDeliveryReceipt,
    sectionLabel,
    setActiveActivityRecordStage,
    setActiveActivityRecordTask,
    setActiveBeneficiaryOutcomeRecordStage,
    setActiveBeneficiaryOutcomeTask,
    setActiveRealLifeRecordTask,
    setActivityRecordStageChooserOpen,
    setActivityRecordTaskChooserOpen,
    setBeneficiaryDeliveryReceiptCorrectionDraftByOutcomeId,
    setBeneficiaryOutcomeConfirmationActionById,
    setBeneficiaryOutcomeConfirmationActionChooserOpenById,
    setBeneficiaryOutcomeConfirmationActionOpenById,
    setBeneficiaryOutcomeContactActionById,
    setBeneficiaryOutcomeContactActionChooserOpenById,
    setBeneficiaryOutcomeContactActionOpenById,
    setBeneficiaryOutcomeDeliveryNotesOpenById,
    setBeneficiaryOutcomeReceiptFormOpenById,
    setBeneficiaryOutcomeRecentPacketById,
    setBeneficiaryOutcomeRecentPacketChooserOpenById,
    setBeneficiaryOutcomeRecordStageChooserOpen,
    setBeneficiaryOutcomeSummaryDetailsOpenById,
    setBeneficiaryOutcomeTaskChooserOpen,
    setRealLifeRecordTypeChooserOpen,
    softCard,
    statusBadge,
    subjectReferenceLabel,
    submitBeneficiaryOutcomeCorrectionReview,
    submitCommunityDomainActivityRecord,
    submitCommunityDomainBeneficiaryOutcomeRecord,
    updateActivityDraft,
    updateBeneficiaryContactConsentDraft,
    updateBeneficiaryContactConsentWithdrawalDraft,
    updateBeneficiaryCorrectionDecision,
    updateBeneficiaryCorrectionNote,
    updateBeneficiaryDeliveryReceiptDraft,
    updateBeneficiaryOutcomeDraft,
    withdrawBeneficiaryOutcomeContactConsent,
  } = data;

  return (
    <>
                    {isAdmin && activeGovernanceTask === "real_life_record" ? (
                      <>
                      <div
                        style={{
                          ...softCard(),
                          display: "grid",
                          gap: 12,
                        }}
                      >
                        <div style={iconHeaderStyle()}>
                          <div style={iconFrame(44)}>
                            <GsnRealisticIcon name="certificate-seal" size={34} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={sectionLabel()}>Record from real life</div>
                            <h3
                              style={{
                                margin: "3px 0 0",
                                fontSize: 20,
                                lineHeight: 1.16,
                              }}
                            >
                              Choose the one record task you are doing now.
                            </h3>
                            <div style={{ ...helperText(), marginTop: 6 }}>
                              Activity says work happened. Beneficiary outcome says what changed for a person or case.
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "grid", gap: 8 }}>
                          <div style={{ ...helperText(), fontSize: 13 }}>
                            Current record type:{" "}
                            <strong>
                              {activeRealLifeRecordTask === "beneficiary_outcome"
                                ? "Beneficiary outcome"
                                : "Activity"}
                            </strong>
                            .
                          </div>
                          <StableButton
                            type="button"
                            kind="secondary"
                            fullWidth
                            stableHeight={42}
                            debugId="community-domain-dashboard.real-life-record.type-toggle"
                            aria-expanded={realLifeRecordTypeChooserOpen}
                            aria-controls="community-domain-real-life-record-types"
                            onClick={() =>
                              setRealLifeRecordTypeChooserOpen((current) => !current)
                            }
                            style={{
                              justifyContent: "center",
                              fontSize: 13,
                              textTransform: "none",
                            }}
                          >
                            {realLifeRecordTypeChooserOpen
                              ? "Close record types"
                              : "Change record type"}
                          </StableButton>
                          {realLifeRecordTypeChooserOpen ? (
                            <div
                              id="community-domain-real-life-record-types"
                              data-debug-id="community-domain-dashboard.real-life-record.type-panel"
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
                                gap: 8,
                              }}
                            >
                              <StableButton
                                type="button"
                                kind={
                                  activeRealLifeRecordTask === "activity"
                                    ? "primary"
                                    : "secondary"
                                }
                                stableHeight={46}
                                debugId="community-domain-dashboard.real-life-record.activity-inline"
                                onClick={() => {
                                  setActiveRealLifeRecordTask("activity");
                                  setActiveActivityRecordTask("record");
                                  setActivityRecordTaskChooserOpen(false);
                                  setActiveActivityRecordStage("person");
                                  setActivityRecordStageChooserOpen(false);
                                  setBeneficiaryOutcomeRecordStageChooserOpen(false);
                                  setRealLifeRecordTypeChooserOpen(false);
                                }}
                              >
                                Activity
                              </StableButton>
                              <StableButton
                                type="button"
                                kind={
                                  activeRealLifeRecordTask === "beneficiary_outcome"
                                    ? "primary"
                                    : "secondary"
                                }
                                stableHeight={46}
                                debugId="community-domain-dashboard.real-life-record.beneficiary-outcome-inline"
                                onClick={() => {
                                  setActiveRealLifeRecordTask("beneficiary_outcome");
                                  setActiveBeneficiaryOutcomeTask("record");
                                  setBeneficiaryOutcomeTaskChooserOpen(false);
                                  setActiveBeneficiaryOutcomeRecordStage("person");
                                  setActivityRecordStageChooserOpen(false);
                                  setBeneficiaryOutcomeRecordStageChooserOpen(false);
                                  setRealLifeRecordTypeChooserOpen(false);
                                }}
                              >
                                Beneficiary outcome
                              </StableButton>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {activeRealLifeRecordTask === "activity" ? (
                      <div
                        id="community-domain-activity-record-panel"
                        style={{
                          ...softCard(),
                          display: "grid",
                          gap: 12,
                        }}
                      >
                        <div style={iconHeaderStyle()}>
                          <div style={iconFrame(44)}>
                            <GsnRealisticIcon name="certificate-seal" size={34} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={sectionLabel()}>Activity catalogue</div>
                            <h3
                              style={{
                                margin: "3px 0 0",
                                fontSize: 20,
                                lineHeight: 1.16,
                              }}
                            >
                              Record one real activity.
                            </h3>
                            <div style={{ ...helperText(), marginTop: 6 }}>
                              Use this when an admin has a real attendance, service, support, contribution, or project record to preserve.
                            </div>
                          </div>
                        </div>

                        {activeActivityRecordTask === "record" &&
                        activeActivityRecordStage === "activity" ? (
                          <div
                            data-debug-id="community-domain-dashboard.source-activity-draft-summary"
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(min(100%, 132px), 1fr))",
                              gap: 8,
                            }}
                          >
                            {[
                              [
                                "Source activity",
                                cleanText(
                                  activityDraft.activity_label,
                                  "No activity label selected yet"
                                ),
                              ],
                              ["Evidence state", "Draft only"],
                              ["Confirmation", "Not requested yet"],
                              ["Boundary", "Not confirmed evidence"],
                            ].map(([label, value]) => (
                              <div
                                key={label}
                                style={{
                                  borderRadius: 12,
                                  border: "1px solid rgba(9,27,46,0.1)",
                                  background: "#FFFFFF",
                                  padding: "9px 10px",
                                  minWidth: 0,
                                }}
                              >
                                <div style={{ ...sectionLabel(), fontSize: 10 }}>
                                  {label}
                                </div>
                                <div
                                  style={{
                                    color: "#091B2E",
                                    fontSize: 13,
                                    fontWeight: 900,
                                    lineHeight: 1.2,
                                    overflowWrap: "anywhere",
                                  }}
                                >
                                  {value}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}


                        <div style={{ ...helperText(), fontSize: 13 }}>
                          Current activity view:{" "}
                          <strong>{activeActivityRecordTaskOption.label}</strong>.{" "}
                          {activeActivityRecordTaskOption.note}
                        </div>
                        <StableButton
                          type="button"
                          kind="secondary"
                          fullWidth
                          stableHeight={42}
                          debugId="community-domain-dashboard.activity-task-toggle"
                          aria-expanded={activityRecordTaskChooserOpen}
                          aria-controls="community-domain-activity-record-packets"
                          onClick={() =>
                            setActivityRecordTaskChooserOpen((current) => !current)
                          }
                          style={{
                            justifyContent: "center",
                            fontSize: 13,
                            textTransform: "none",
                          }}
                        >
                          {activityRecordTaskChooserOpen
                            ? "Close activity views"
                            : "Change activity view"}
                        </StableButton>
                        {activityRecordTaskChooserOpen ? (
                          <div
                            id="community-domain-activity-record-packets"
                            data-debug-id="community-domain-dashboard.activity-task-panel"
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
                              gap: 8,
                            }}
                          >
                            {ACTIVITY_RECORD_TASK_OPTIONS.map((task) => (
                              <StableButton
                                key={task.key}
                                type="button"
                                kind={
                                  activeActivityRecordTask === task.key
                                    ? "primary"
                                    : "secondary"
                                }
                                stableHeight={44}
                                debugId={`community-domain-dashboard.activity-task.${task.key}`}
                                onClick={() => {
                                  setActiveActivityRecordTask(task.key);
                                  if (task.key === "record") {
                                    setActiveActivityRecordStage("person");
                                  }
                                  setActivityRecordTaskChooserOpen(false);
                                  setActivityRecordStageChooserOpen(false);
                                }}
                                style={{
                                  justifyContent: "center",
                                  fontSize: 13,
                                  textTransform: "none",
                                }}
                              >
                                {task.label}
                              </StableButton>
                            ))}
                          </div>
                        ) : null}

                        {activeActivityRecordTask === "record" ? (
                          <>
                            <div
                              style={{
                                display: "grid",
                                gap: 8,
                              }}
                            >
                              <div style={{ ...helperText(), fontSize: 13 }}>
                                Current step:{" "}
                                <strong>
                                  {ACTIVITY_RECORD_STAGE_OPTIONS.find(
                                    (stage) => stage.key === activeActivityRecordStage
                                  )?.label || "Person"}
                                </strong>
                                .{" "}
                                {ACTIVITY_RECORD_STAGE_OPTIONS.find(
                                  (stage) => stage.key === activeActivityRecordStage
                                )?.note || "Follow the next action to continue."}
                              </div>
                              <StableButton
                                type="button"
                                kind="secondary"
                                fullWidth
                                stableHeight={42}
                                debugId="community-domain-dashboard.activity-record-stage-toggle"
                                aria-expanded={activityRecordStageChooserOpen}
                                aria-controls="community-domain-activity-record-stages"
                                onClick={() =>
                                  setActivityRecordStageChooserOpen(
                                    (current) => !current
                                  )
                                }
                                style={{
                                  justifyContent: "center",
                                  fontSize: 13,
                                  textTransform: "none",
                                }}
                              >
                                {activityRecordStageChooserOpen
                                  ? "Close steps"
                                  : "Change step"}
                              </StableButton>
                              {activityRecordStageChooserOpen ? (
                                <div
                                  id="community-domain-activity-record-stages"
                                  data-debug-id="community-domain-dashboard.activity-record-stage-panel"
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fit, minmax(min(100%, 120px), 1fr))",
                                    gap: 8,
                                  }}
                                >
                                  {ACTIVITY_RECORD_STAGE_OPTIONS.map((stage) => {
                                    const selected =
                                      stage.key === activeActivityRecordStage;
                                    return (
                                      <StableButton
                                        key={stage.key}
                                        type="button"
                                        kind={selected ? "primary" : "secondary"}
                                        stableHeight={42}
                                        fullWidth
                                        aria-pressed={selected}
                                        title={stage.note}
                                        debugId={`community-domain-dashboard.activity-record-stage.${stage.key}`}
                                        onClick={() => {
                                          setActiveActivityRecordStage(stage.key);
                                          setActivityRecordStageChooserOpen(false);
                                        }}
                                        style={{
                                          justifyContent: "center",
                                          fontSize: 13,
                                          textTransform: "none",
                                        }}
                                      >
                                        {stage.label}
                                      </StableButton>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>

                            {activeActivityRecordStage === "person" ? (
                              <div style={{ display: "grid", gap: 10 }}>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
                                    gap: 8,
                                  }}
                                >
                                  <input
                                    value={activityDraft.subject_user_id}
                                    disabled={busyActivityRecord}
                                    onChange={(event) =>
                                      updateActivityDraft(
                                        "subject_user_id",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Subject user id"
                                    inputMode="numeric"
                                    style={billingInputStyle()}
                                  />
                                  <select
                                    value={activityDraft.activity_type}
                                    disabled={busyActivityRecord}
                                    onChange={(event) =>
                                      updateActivityDraft(
                                        "activity_type",
                                        event.target.value
                                      )
                                    }
                                    style={billingInputStyle()}
                                  >
                                    {activityCatalogueOptions.map((item) => (
                                      <option
                                        key={cleanText(item?.activity_type)}
                                        value={cleanText(item?.activity_type)}
                                      >
                                        {cleanText(item?.label, item?.activity_type)}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <StableButton
                                  type="button"
                                  kind="primary"
                                  stableHeight={44}
                                  debugId="community-domain-dashboard.activity-record-next.activity"
                                  onClick={() => {
                                    setActiveActivityRecordStage("activity");
                                    setActivityRecordStageChooserOpen(false);
                                  }}
                                  style={{
                                    justifyContent: "center",
                                    fontSize: 13,
                                    textTransform: "none",
                                  }}
                                >
                                  Next: activity
                                </StableButton>
                              </div>
                            ) : null}

                            {activeActivityRecordStage === "activity" ? (
                              <div style={{ display: "grid", gap: 10 }}>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
                                    gap: 8,
                                  }}
                                >
                                  <input
                                    value={activityDraft.activity_label}
                                    disabled={busyActivityRecord}
                                    onChange={(event) =>
                                      updateActivityDraft(
                                        "activity_label",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Activity label"
                                    style={{ ...billingInputStyle(), fontSize: 14 }}
                                  />
                                  <input
                                    value={activityDraft.quantity}
                                    disabled={busyActivityRecord}
                                    onChange={(event) =>
                                      updateActivityDraft(
                                        "quantity",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Quantity"
                                    inputMode="decimal"
                                    style={billingInputStyle()}
                                  />
                                  <input
                                    value={activityDraft.measurement_unit}
                                    disabled={busyActivityRecord}
                                    onChange={(event) =>
                                      updateActivityDraft(
                                        "measurement_unit",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Unit, e.g. hours"
                                    style={billingInputStyle()}
                                  />
                                </div>
                                <StableButton
                                  type="button"
                                  kind="primary"
                                  stableHeight={44}
                                  debugId="community-domain-dashboard.activity-record-next.evidence"
                                  onClick={() => {
                                    setActiveActivityRecordStage("evidence");
                                    setActivityRecordStageChooserOpen(false);
                                  }}
                                  style={{
                                    justifyContent: "center",
                                    fontSize: 13,
                                    textTransform: "none",
                                  }}
                                >
                                  Next: evidence
                                </StableButton>
                              </div>
                            ) : null}

                            {activeActivityRecordStage === "evidence" ? (
                              <div style={{ display: "grid", gap: 10 }}>
                                <input
                                  value={activityDraft.evidence_reference}
                                  disabled={busyActivityRecord}
                                  onChange={(event) =>
                                    updateActivityDraft(
                                      "evidence_reference",
                                      event.target.value
                                    )
                                  }
                                  placeholder="Evidence reference"
                                  style={billingInputStyle()}
                                />
                                <textarea
                                  value={activityDraft.note}
                                  disabled={busyActivityRecord}
                                  onChange={(event) =>
                                    updateActivityDraft("note", event.target.value)
                                  }
                                  placeholder="Short note about what happened."
                                  style={{
                                    ...billingInputStyle(),
                                    minHeight: 78,
                                    padding: 12,
                                    resize: "vertical",
                                  }}
                                />
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
                                    gap: 8,
                                    alignItems: "center",
                                  }}
                                >
                                  <StableButton
                                    type="button"
                                    kind="primary"
                                    stableHeight={46}
                                    disabled={busyActivityRecord}
                                    debugId="community-domain-dashboard.activity-record"
                                    onClick={() => {
                                      void submitCommunityDomainActivityRecord();
                                    }}
                                  >
                                    {busyActivityRecord
                                      ? "Recording..."
                                      : "Record activity"}
                                  </StableButton>
                                  <div style={{ ...helperText(), fontSize: 13 }}>
                                    Creates an admin-recorded Trust Event for the subject user. It does not prove final beneficiary outcomes.
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </>
                        ) : null}

                        {activeActivityRecordTask === "catalogue" ? (
                          <div style={{ display: "grid", gap: 8 }}>
                            <div style={sectionLabel()}>Activity catalogue</div>
                            <div style={{ ...helperText(), fontSize: 13 }}>
                              Use one catalogue type when recording a real activity.
                            </div>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                                gap: 8,
                              }}
                            >
                              {activityCatalogueOptions.map((item) => (
                                <div
                                  key={cleanText(item?.activity_type)}
                                  style={{
                                    borderRadius: 10,
                                    border: "1px solid rgba(9,27,46,0.1)",
                                    background: "#FFFFFF",
                                    padding: "10px 12px",
                                  }}
                                >
                                  <div style={sectionLabel()}>
                                    {cleanText(item?.label, item?.activity_type)}
                                  </div>
                                  <div style={{ ...helperText(), fontSize: 12 }}>
                                    {cleanText(item?.activity_type)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {activeActivityRecordTask === "recent" ? (
                          activityRows.length ? (
                            <div
                              data-debug-id="community-domain-dashboard.activity-recent-records"
                              style={{ display: "grid", gap: 8 }}
                            >
                              <div style={sectionLabel()}>Recent records</div>
                              <div style={{ ...helperText(), fontSize: 13 }}>
                                Recorded activity evidence is kept separate from confirmation and beneficiary outcome proof.
                              </div>
                              {activityRows.slice(0, 5).map((item) => (
                                <div
                                  key={cleanText(item?.event_id)}
                                  style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 8,
                                    alignItems: "center",
                                    padding: "8px 0",
                                    borderTop: "1px solid rgba(9,27,46,0.1)",
                                  }}
                                >
                                  <strong style={{ color: "#091B2E", fontSize: 14 }}>
                                    {cleanText(item?.activity_label, item?.activity_type)}
                                  </strong>
                                  <span style={statusBadge(item?.evidence_strength)}>
                                    {compactStatus(item?.evidence_strength)}
                                  </span>
                                  <span style={statusBadge("subject")}>
                                    {subjectReferenceLabel(item)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={helperText()}>
                              No activity records are loaded for this Community Domain yet.
                            </div>
                          )
                        ) : null}

                      </div>
                      ) : null}

                      {activeRealLifeRecordTask === "beneficiary_outcome" ? (
                      <div
                        id="community-domain-beneficiary-outcome-record-panel"
                        style={{
                          ...softCard(),
                          display: "grid",
                          gap: 12,
                        }}
                      >
                        <div style={iconHeaderStyle()}>
                          <div style={iconFrame(44)}>
                            <GsnRealisticIcon name="records-folder" size={34} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={sectionLabel()}>Beneficiary outcomes</div>
                            <h3
                              style={{
                                margin: "3px 0 0",
                                fontSize: 20,
                                lineHeight: 1.16,
                              }}
                            >
                              Record baseline to after.
                            </h3>
                            <div style={{ ...helperText(), marginTop: 6 }}>
                              Use this when a beneficiary, member, or case has a before-and-after result worth preserving for directors or sponsors.
                            </div>
                          </div>
                        </div>

                        <div style={{ ...helperText(), fontSize: 13 }}>
                          Current outcome view:{" "}
                          <strong>{activeBeneficiaryOutcomeTaskOption.label}</strong>.{" "}
                          {activeBeneficiaryOutcomeTaskOption.note}
                        </div>
                        <StableButton
                          type="button"
                          kind="secondary"
                          fullWidth
                          stableHeight={42}
                          debugId="community-domain-dashboard.beneficiary-outcome-task-toggle"
                          aria-expanded={beneficiaryOutcomeTaskChooserOpen}
                          aria-controls="community-domain-beneficiary-outcome-packets"
                          onClick={() =>
                            setBeneficiaryOutcomeTaskChooserOpen((current) => !current)
                          }
                          style={{
                            justifyContent: "center",
                            fontSize: 13,
                            textTransform: "none",
                          }}
                        >
                          {beneficiaryOutcomeTaskChooserOpen
                            ? "Close outcome views"
                            : "Change outcome view"}
                        </StableButton>
                        {beneficiaryOutcomeTaskChooserOpen ? (
                          <div
                            id="community-domain-beneficiary-outcome-packets"
                            data-debug-id="community-domain-dashboard.beneficiary-outcome-task-panel"
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                              gap: 8,
                            }}
                          >
                            {BENEFICIARY_OUTCOME_TASK_OPTIONS.map((task) => (
                              <StableButton
                                key={task.key}
                                type="button"
                                kind={
                                  activeBeneficiaryOutcomeTask === task.key
                                    ? "primary"
                                    : "secondary"
                                }
                                stableHeight={44}
                                debugId={`community-domain-dashboard.beneficiary-outcome-task.${task.key}`}
                                onClick={() => {
                                  setActiveBeneficiaryOutcomeTask(task.key);
                                  if (task.key === "record") {
                                    setActiveBeneficiaryOutcomeRecordStage("person");
                                  }
                                  setBeneficiaryOutcomeTaskChooserOpen(false);
                                  setBeneficiaryOutcomeRecordStageChooserOpen(false);
                                }}
                                style={{
                                  justifyContent: "center",
                                  fontSize: 13,
                                  textTransform: "none",
                                }}
                              >
                                {task.label}
                              </StableButton>
                            ))}
                          </div>
                        ) : null}

                        {activeBeneficiaryOutcomeTask === "record" ? (
                          <>
                            <div
                              style={{
                                display: "grid",
                                gap: 8,
                              }}
                            >
                              <div style={{ ...helperText(), fontSize: 13 }}>
                                Current step:{" "}
                                <strong>
                                  {BENEFICIARY_OUTCOME_RECORD_STAGE_OPTIONS.find(
                                    (stage) =>
                                      stage.key === activeBeneficiaryOutcomeRecordStage
                                  )?.label || "Person"}
                                </strong>
                                .{" "}
                                {BENEFICIARY_OUTCOME_RECORD_STAGE_OPTIONS.find(
                                  (stage) =>
                                    stage.key === activeBeneficiaryOutcomeRecordStage
                                )?.note || "Follow the next action to continue."}
                              </div>
                              <StableButton
                                type="button"
                                kind="secondary"
                                fullWidth
                                stableHeight={42}
                                debugId="community-domain-dashboard.beneficiary-outcome-record-stage-toggle"
                                aria-expanded={beneficiaryOutcomeRecordStageChooserOpen}
                                aria-controls="community-domain-beneficiary-outcome-record-stages"
                                onClick={() =>
                                  setBeneficiaryOutcomeRecordStageChooserOpen(
                                    (current) => !current
                                  )
                                }
                                style={{
                                  justifyContent: "center",
                                  fontSize: 13,
                                  textTransform: "none",
                                }}
                              >
                                {beneficiaryOutcomeRecordStageChooserOpen
                                  ? "Close steps"
                                  : "Change step"}
                              </StableButton>
                              {beneficiaryOutcomeRecordStageChooserOpen ? (
                                <div
                                  id="community-domain-beneficiary-outcome-record-stages"
                                  data-debug-id="community-domain-dashboard.beneficiary-outcome-record-stage-panel"
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fit, minmax(min(100%, 120px), 1fr))",
                                    gap: 8,
                                  }}
                                >
                                  {BENEFICIARY_OUTCOME_RECORD_STAGE_OPTIONS.map(
                                    (stage) => {
                                      const selected =
                                        stage.key ===
                                        activeBeneficiaryOutcomeRecordStage;
                                      return (
                                        <StableButton
                                          key={stage.key}
                                          type="button"
                                          kind={selected ? "primary" : "secondary"}
                                          stableHeight={42}
                                          fullWidth
                                          aria-pressed={selected}
                                          title={stage.note}
                                          debugId={`community-domain-dashboard.beneficiary-outcome-record-stage.${stage.key}`}
                                          onClick={() => {
                                            setActiveBeneficiaryOutcomeRecordStage(
                                              stage.key
                                            );
                                            setBeneficiaryOutcomeRecordStageChooserOpen(
                                              false
                                            );
                                          }}
                                          style={{
                                            justifyContent: "center",
                                            fontSize: 13,
                                            textTransform: "none",
                                          }}
                                        >
                                          {stage.label}
                                        </StableButton>
                                      );
                                    }
                                  )}
                                </div>
                              ) : null}
                            </div>

                            {activeBeneficiaryOutcomeRecordStage === "person" ? (
                              <div style={{ display: "grid", gap: 10 }}>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
                                    gap: 8,
                                  }}
                                >
                                  <input
                                    value={beneficiaryOutcomeDraft.subject_user_id}
                                    disabled={busyBeneficiaryOutcomeRecord}
                                    onChange={(event) =>
                                      updateBeneficiaryOutcomeDraft(
                                        "subject_user_id",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Beneficiary user id"
                                    inputMode="numeric"
                                    style={billingInputStyle()}
                                  />
                                  <input
                                    value={beneficiaryOutcomeDraft.programme_label}
                                    disabled={busyBeneficiaryOutcomeRecord}
                                    onChange={(event) =>
                                      updateBeneficiaryOutcomeDraft(
                                        "programme_label",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Programme or case label"
                                    style={billingInputStyle()}
                                  />
                                </div>
                                <StableButton
                                  type="button"
                                  kind="primary"
                                  stableHeight={44}
                                  debugId="community-domain-dashboard.beneficiary-outcome-record-next.change"
                                  onClick={() => {
                                    setActiveBeneficiaryOutcomeRecordStage("change");
                                    setBeneficiaryOutcomeRecordStageChooserOpen(
                                      false
                                    );
                                  }}
                                  style={{
                                    justifyContent: "center",
                                    fontSize: 13,
                                    textTransform: "none",
                                  }}
                                >
                                  Next: change
                                </StableButton>
                              </div>
                            ) : null}

                            {activeBeneficiaryOutcomeRecordStage === "change" ? (
                              <div style={{ display: "grid", gap: 10 }}>
                                <input
                                  value={beneficiaryOutcomeDraft.outcome_indicator}
                                  disabled={busyBeneficiaryOutcomeRecord}
                                  onChange={(event) =>
                                    updateBeneficiaryOutcomeDraft(
                                      "outcome_indicator",
                                      event.target.value
                                    )
                                  }
                                  placeholder="Measured indicator"
                                  style={billingInputStyle()}
                                />
                                <textarea
                                  value={beneficiaryOutcomeDraft.baseline_value}
                                  disabled={busyBeneficiaryOutcomeRecord}
                                  onChange={(event) =>
                                    updateBeneficiaryOutcomeDraft(
                                      "baseline_value",
                                      event.target.value
                                    )
                                  }
                                  placeholder="Baseline before support."
                                  style={{
                                    ...billingInputStyle(),
                                    minHeight: 72,
                                    padding: 12,
                                    resize: "vertical",
                                  }}
                                />
                                <textarea
                                  value={beneficiaryOutcomeDraft.after_value}
                                  disabled={busyBeneficiaryOutcomeRecord}
                                  onChange={(event) =>
                                    updateBeneficiaryOutcomeDraft(
                                      "after_value",
                                      event.target.value
                                    )
                                  }
                                  placeholder="After value or current follow-up result."
                                  style={{
                                    ...billingInputStyle(),
                                    minHeight: 72,
                                    padding: 12,
                                    resize: "vertical",
                                  }}
                                />
                                <textarea
                                  value={beneficiaryOutcomeDraft.support_received}
                                  disabled={busyBeneficiaryOutcomeRecord}
                                  onChange={(event) =>
                                    updateBeneficiaryOutcomeDraft(
                                      "support_received",
                                      event.target.value
                                    )
                                  }
                                  placeholder="Support received from this Community Domain."
                                  style={{
                                    ...billingInputStyle(),
                                    minHeight: 72,
                                    padding: 12,
                                    resize: "vertical",
                                  }}
                                />
                                <StableButton
                                  type="button"
                                  kind="primary"
                                  stableHeight={44}
                                  debugId="community-domain-dashboard.beneficiary-outcome-record-next.proof"
                                  onClick={() => {
                                    setActiveBeneficiaryOutcomeRecordStage("proof");
                                    setBeneficiaryOutcomeRecordStageChooserOpen(
                                      false
                                    );
                                  }}
                                  style={{
                                    justifyContent: "center",
                                    fontSize: 13,
                                    textTransform: "none",
                                  }}
                                >
                                  Next: proof
                                </StableButton>
                              </div>
                            ) : null}

                            {activeBeneficiaryOutcomeRecordStage === "proof" ? (
                              <div style={{ display: "grid", gap: 10 }}>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
                                    gap: 8,
                                  }}
                                >
                                  <select
                                    value={beneficiaryOutcomeDraft.outcome_state}
                                    disabled={busyBeneficiaryOutcomeRecord}
                                    onChange={(event) =>
                                      updateBeneficiaryOutcomeDraft(
                                        "outcome_state",
                                        event.target.value
                                      )
                                    }
                                    style={billingInputStyle()}
                                  >
                                    {BENEFICIARY_OUTCOME_STATE_OPTIONS.map((item) => (
                                      <option key={item.value} value={item.value}>
                                        {item.label}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    value={beneficiaryOutcomeDraft.follow_up_state}
                                    disabled={busyBeneficiaryOutcomeRecord}
                                    onChange={(event) =>
                                      updateBeneficiaryOutcomeDraft(
                                        "follow_up_state",
                                        event.target.value
                                      )
                                    }
                                    style={billingInputStyle()}
                                  >
                                    {BENEFICIARY_FOLLOW_UP_STATE_OPTIONS.map(
                                      (item) => (
                                        <option key={item.value} value={item.value}>
                                          {item.label}
                                        </option>
                                      )
                                    )}
                                  </select>
                                  <select
                                    value={
                                      beneficiaryOutcomeDraft.beneficiary_confirmation
                                    }
                                    disabled={busyBeneficiaryOutcomeRecord}
                                    onChange={(event) =>
                                      updateBeneficiaryOutcomeDraft(
                                        "beneficiary_confirmation",
                                        event.target.value
                                      )
                                    }
                                    style={billingInputStyle()}
                                  >
                                    {BENEFICIARY_CONFIRMATION_OPTIONS.map((item) => (
                                      <option key={item.value} value={item.value}>
                                        {item.label}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    value={beneficiaryOutcomeDraft.challenge_status}
                                    disabled={busyBeneficiaryOutcomeRecord}
                                    onChange={(event) =>
                                      updateBeneficiaryOutcomeDraft(
                                        "challenge_status",
                                        event.target.value
                                      )
                                    }
                                    style={billingInputStyle()}
                                  >
                                    {BENEFICIARY_CHALLENGE_STATUS_OPTIONS.map(
                                      (item) => (
                                        <option key={item.value} value={item.value}>
                                          {item.label}
                                        </option>
                                      )
                                    )}
                                  </select>
                                  <input
                                    value={beneficiaryOutcomeDraft.evidence_reference}
                                    disabled={busyBeneficiaryOutcomeRecord}
                                    onChange={(event) =>
                                      updateBeneficiaryOutcomeDraft(
                                        "evidence_reference",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Evidence reference"
                                    style={billingInputStyle()}
                                  />
                                </div>
                                <textarea
                                  value={beneficiaryOutcomeDraft.note}
                                  disabled={busyBeneficiaryOutcomeRecord}
                                  onChange={(event) =>
                                    updateBeneficiaryOutcomeDraft(
                                      "note",
                                      event.target.value
                                    )
                                  }
                                  placeholder="Private admin note."
                                  style={{
                                    ...billingInputStyle(),
                                    minHeight: 72,
                                    padding: 12,
                                    resize: "vertical",
                                  }}
                                />
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
                                    gap: 8,
                                    alignItems: "center",
                                  }}
                                >
                                  <StableButton
                                    type="button"
                                    kind="primary"
                                    stableHeight={46}
                                    disabled={busyBeneficiaryOutcomeRecord}
                                    debugId="community-domain-dashboard.beneficiary-outcome-record"
                                    onClick={() => {
                                      void submitCommunityDomainBeneficiaryOutcomeRecord();
                                    }}
                                  >
                                    {busyBeneficiaryOutcomeRecord
                                      ? "Recording..."
                                      : "Record outcome"}
                                  </StableButton>
                                  <div style={{ ...helperText(), fontSize: 13 }}>
                                    Creates a before-and-after Trust Event. Sponsor reports still need aggregation and privacy review.
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </>
                        ) : null}

                        {activeBeneficiaryOutcomeTask === "recent" ? (
                          beneficiaryOutcomeRows.length ? (
                          <div style={{ display: "grid", gap: 8 }}>
                            <div style={sectionLabel()}>Recent outcomes</div>
                            {beneficiaryOutcomeRows.slice(0, 5).map((item) => {
                              const outcomeEventId = cleanText(item?.event_id);
                              const latestResponse =
                                item?.latest_confirmation_response || null;
                              const latestReview =
                                item?.latest_correction_review || null;
                              const latestDeliveryPreparation =
                                item?.latest_delivery_preparation || null;
                              const latestDeliveryReceipt =
                                item?.latest_delivery_receipt || null;
                              const latestProviderSendBlockedCheck =
                                item?.latest_provider_send_blocked_check || null;
                              const latestContactConsent =
                                item?.latest_contact_consent_record || null;
                              const latestContactConsentWithdrawal =
                                item?.latest_contact_consent_withdrawal || null;
                              const contactConsentStatus =
                                item?.contact_consent_status || {};
                              const localDeliveryPack =
                                beneficiaryDeliveryPackByOutcomeId[
                                  outcomeEventId
                                ] || null;
                              const selectedDeliveryReceiptDraft =
                                beneficiaryDeliveryReceiptDraftByOutcomeId[
                                  outcomeEventId
                                ] || emptyBeneficiaryDeliveryReceiptDraft();
                              const selectedContactConsentDraft =
                                beneficiaryContactConsentDraftByOutcomeId[
                                  outcomeEventId
                                ] || emptyBeneficiaryContactConsentDraft();
                              const selectedContactConsentWithdrawalDraft =
                                beneficiaryContactConsentWithdrawalDraftByOutcomeId[
                                  outcomeEventId
                                ] || emptyBeneficiaryContactConsentWithdrawalDraft();
                              const selectedDeliveryReceiptCorrectionDraft =
                                beneficiaryDeliveryReceiptCorrectionDraftByOutcomeId[
                                  outcomeEventId
                                ] ||
                                emptyBeneficiaryDeliveryReceiptCorrectionDraft();
                              const canWithdrawContactConsent =
                                Boolean(latestContactConsent?.event_id) &&
                                cleanText(contactConsentStatus?.status) ===
                                  "active_attestation";
                              const contactConsentStatusName = cleanText(
                                contactConsentStatus?.status
                              );
                              const currentProviderDeliveryReadiness =
                                item?.current_provider_delivery_readiness || {};
                              const currentProviderContactStatus = compactStatus(
                                currentProviderDeliveryReadiness
                                  ?.active_contact_consent_status ||
                                  "not evaluated"
                              );
                              const preparedDeliveryContactStatus = compactStatus(
                                latestDeliveryPreparation
                                  ?.active_contact_consent_status ||
                                  "not recorded at preparation"
                              );
                              const canRecordManualDelivery =
                                Boolean(
                                  localDeliveryPack?.delivery_event_id ||
                                    latestDeliveryPreparation?.event_id
                                ) &&
                                !latestDeliveryReceipt &&
                                contactConsentStatus?.manual_delivery_allowed !== false;
                              const manualDeliveryBlockedByConsent =
                                Boolean(
                                  localDeliveryPack?.delivery_event_id ||
                                    latestDeliveryPreparation?.event_id
                                ) &&
                                !latestDeliveryReceipt &&
                                contactConsentStatus?.manual_delivery_allowed === false;
                              const manualDeliveryBlockedText =
                                contactConsentStatusName === "not_recorded"
                                  ? "Manual delivery receipt is blocked until contact/consent is recorded. Record contact/consent before recording delivery."
                                  : "Manual delivery receipt is blocked until an active contact/consent attestation exists. Record replacement contact/consent before recording delivery.";
                              const responseChallengeStatus = cleanText(
                                latestResponse?.challenge_status
                              );
                              const needsCorrectionReview =
                                responseChallengeStatus === "challenged" ||
                                responseChallengeStatus === "under_review";
                              const selectedCorrectionDecision =
                                beneficiaryCorrectionDecisionByOutcomeId[
                                  outcomeEventId
                                ] || "mark_corrected";
                              const selectedCorrectionNote =
                                beneficiaryCorrectionNoteByOutcomeId[
                                  outcomeEventId
                                ] || "";
                              const activeOutcomeRecentPacket =
                                beneficiaryOutcomeRecentPacketById[
                                  outcomeEventId
                                ] || "summary";
                              const outcomeRecentPacketChooserOpen = Boolean(
                                beneficiaryOutcomeRecentPacketChooserOpenById[
                                  outcomeEventId
                                ]
                              );
                              const activeOutcomeRecentPacketOption =
                                BENEFICIARY_OUTCOME_RECENT_PACKET_OPTIONS.find(
                                  (packet) =>
                                    packet.key === activeOutcomeRecentPacket
                                ) ||
                                BENEFICIARY_OUTCOME_RECENT_PACKET_OPTIONS[0];
                              const outcomeSummaryDetailCount = [
                                latestResponse?.correction_note,
                                latestReview,
                                latestDeliveryReceipt,
                                latestDeliveryReceipt?.latest_correction,
                                latestProviderSendBlockedCheck,
                              ].filter(Boolean).length;
                              const outcomeSummaryDetailsOpen = Boolean(
                                beneficiaryOutcomeSummaryDetailsOpenById[
                                  outcomeEventId
                                ]
                              );
                              const requestedOutcomeConfirmationAction =
                                beneficiaryOutcomeConfirmationActionById[
                                  outcomeEventId
                                ] ||
                                (needsCorrectionReview ? "review" : "link");
                              const activeOutcomeConfirmationAction =
                                requestedOutcomeConfirmationAction === "review" &&
                                needsCorrectionReview
                                  ? "review"
                                  : "link";
                              const outcomeConfirmationActionChooserOpen =
                                Boolean(
                                  beneficiaryOutcomeConfirmationActionChooserOpenById[
                                    outcomeEventId
                                  ]
                                );
                              const outcomeConfirmationActionOpen = Boolean(
                                beneficiaryOutcomeConfirmationActionOpenById[
                                  outcomeEventId
                                ]
                              );
                              const activeOutcomeConfirmationActionLabel =
                                activeOutcomeConfirmationAction === "review"
                                  ? "Review challenge"
                                  : "Create confirmation link";
                              const activeOutcomeConfirmationActionNote =
                                activeOutcomeConfirmationAction === "review"
                                  ? "Resolve the beneficiary challenge before treating this outcome as settled."
                                  : "Prepare one private confirmation link for the beneficiary response.";
                              const requestedOutcomeContactAction =
                                beneficiaryOutcomeContactActionById[
                                  outcomeEventId
                                ] || "record";
                              const activeOutcomeContactAction =
                                requestedOutcomeContactAction === "withdraw" &&
                                canWithdrawContactConsent
                                  ? "withdraw"
                                  : "record";
                              const outcomeContactActionChooserOpen = Boolean(
                                beneficiaryOutcomeContactActionChooserOpenById[
                                  outcomeEventId
                                ]
                              );
                              const outcomeContactActionOpen = Boolean(
                                beneficiaryOutcomeContactActionOpenById[
                                  outcomeEventId
                                ]
                              );
                              const activeOutcomeContactActionLabel =
                                activeOutcomeContactAction === "withdraw"
                                  ? "Withdraw consent"
                                  : "Record contact/consent";
                              const activeOutcomeContactActionNote =
                                activeOutcomeContactAction === "withdraw"
                                  ? "Use this only when the beneficiary or authorized contact withdraws consent."
                                  : "Record or replace contact/consent evidence without exposing private contact details.";
                              const outcomeReceiptFormOpen = Boolean(
                                beneficiaryOutcomeReceiptFormOpenById[
                                  outcomeEventId
                                ]
                              );
                              const canOpenOutcomeReceiptForm =
                                canRecordManualDelivery ||
                                Boolean(latestDeliveryReceipt);
                              const activeOutcomeReceiptTaskLabel =
                                latestDeliveryReceipt
                                  ? "Record receipt correction"
                                  : canRecordManualDelivery
                                    ? "Record manual receipt"
                                    : "Wait for delivery readiness";
                              const activeOutcomeReceiptTaskNote =
                                latestDeliveryReceipt
                                  ? "Use this only to correct an existing receipt; the original stays in the audit trail."
                                  : canRecordManualDelivery
                                    ? "Open this after manual delivery has happened and record one receipt outcome."
                                    : "Prepare a confirmation link and keep active contact/consent evidence before recording delivery.";
                              const outcomeDeliveryNotesOpen = Boolean(
                                beneficiaryOutcomeDeliveryNotesOpenById[
                                  outcomeEventId
                                ]
                              );
                              const activeOutcomeDeliveryTaskLabel =
                                manualDeliveryBlockedByConsent
                                  ? "Resolve contact/consent first"
                                  : latestDeliveryPreparation
                                    ? "Delivery readiness recorded"
                                    : localDeliveryPack && !latestDeliveryPreparation
                                      ? "Session delivery pack ready"
                                      : "Prepare delivery pack";
                              const activeOutcomeDeliveryTaskNote =
                                manualDeliveryBlockedByConsent
                                  ? manualDeliveryBlockedText
                                  : latestDeliveryPreparation
                                    ? "Review readiness before recording any manual receipt."
                                    : localDeliveryPack && !latestDeliveryPreparation
                                      ? "GSN has prepared local delivery text in this session only."
                                      : "Use Confirm to create the private confirmation link and delivery text first.";
                              const outcomePrivacyLabel = cleanText(
                                item?.privacy_position ||
                                  item?.privacy_status ||
                                  item?.visibility,
                                "Private by default"
                              );
                              const outcomeChallengeLabel = compactStatus(
                                latestResponse?.challenge_status ||
                                  item?.challenge_status ||
                                  "No challenge recorded"
                              );
                              const outcomeCurrentnessLabel = cleanText(
                                item?.currentness_label ||
                                  item?.review_currentness_label ||
                                  (item?.follow_up_due_at
                                    ? `Review due ${noticeDateLabel(
                                        item?.follow_up_due_at
                                      )}`
                                    : ""),
                                "Current window"
                              );
                              const outcomeConsentLabel = compactStatus(
                                contactConsentStatus?.status ||
                                  latestContactConsent?.consent_basis ||
                                  "Not recorded"
                              );
                              return (
                              <div
                                key={outcomeEventId}
                                style={{
                                  display: "grid",
                                  gap: 6,
                                  padding: "8px 0",
                                  borderTop: "1px solid rgba(9,27,46,0.1)",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 8,
                                    alignItems: "center",
                                  }}
                                >
                                  <strong style={{ color: "#091B2E", fontSize: 14 }}>
                                    {cleanText(
                                      item?.outcome_indicator,
                                      item?.programme_label || "Outcome"
                                    )}
                                  </strong>
                                  <span style={statusBadge(item?.outcome_state)}>
                                    {compactStatus(item?.outcome_state)}
                                  </span>
                                  <span style={statusBadge(item?.beneficiary_confirmation)}>
                                    {compactStatus(item?.beneficiary_confirmation)}
                                  </span>
                                  <span style={statusBadge("subject")}>
                                    {subjectReferenceLabel(item)}
                                  </span>
                                  {latestResponse ? (
                                    <span
                                      style={statusBadge(
                                        latestResponse?.challenge_status ||
                                          latestResponse?.response_type
                                      )}
                                    >
                                      Response:{" "}
                                      {compactStatus(latestResponse?.response_type)}
                                    </span>
                                  ) : null}
                                  {latestReview ? (
                                    <span
                                      style={statusBadge(
                                        latestReview?.challenge_status_after ||
                                          latestReview?.decision
                                      )}
                                    >
                                      Review: {compactStatus(latestReview?.decision)}
                                    </span>
                                  ) : null}
                                  {latestDeliveryReceipt ? (
                                    <span
                                      style={statusBadge(
                                        latestDeliveryReceipt?.delivery_status
                                      )}
                                    >
                                      Delivery:{" "}
                                      {compactStatus(
                                        latestDeliveryReceipt?.delivery_status
                                      )}
                                    </span>
                                  ) : null}
                                  {latestContactConsent ? (
                                    <span
                                      style={statusBadge(
                                        latestContactConsent?.consent_basis ||
                                          "contact_consent"
                                      )}
                                    >
                                      Contact:{" "}
                                      {compactStatus(
                                        latestContactConsent?.consent_basis
                                      )}
                                    </span>
                                  ) : null}
                                  {latestContactConsentWithdrawal ? (
                                    <span
                                      style={statusBadge(
                                        latestContactConsentWithdrawal?.withdrawal_reason ||
                                          "contact_consent_withdrawn"
                                      )}
                                    >
                                      Consent withdrawn:{" "}
                                      {compactStatus(
                                        latestContactConsentWithdrawal?.withdrawal_reason
                                      )}
                                    </span>
                                  ) : null}
                                </div>
                                <div style={{ ...helperText(), fontSize: 13 }}>
                                  {cleanText(item?.baseline_value, "Baseline not shown")}
                                  {" -> "}
                                  {cleanText(item?.after_value, "After value not shown")}
                                </div>
                                <div
                                  data-debug-id="community-domain-dashboard.beneficiary-outcome-privacy-currentness-summary"
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fit, minmax(min(100%, 132px), 1fr))",
                                    gap: 8,
                                  }}
                                >
                                  {[
                                    ["Privacy", outcomePrivacyLabel],
                                    ["Challenge", outcomeChallengeLabel],
                                    ["Currentness", outcomeCurrentnessLabel],
                                    ["Consent", outcomeConsentLabel],
                                  ].map(([label, value]) => (
                                    <div
                                      key={label}
                                      style={{
                                        border: "1px solid rgba(9,27,46,0.1)",
                                        borderRadius: 16,
                                        padding: "8px 10px",
                                        background: "rgba(255,255,255,0.76)",
                                        minWidth: 0,
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
                                          lineHeight: 1.25,
                                        }}
                                      >
                                        {value}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div style={{ display: "grid", gap: 8 }}>
                                  <div style={{ ...helperText(), fontSize: 13 }}>
                                    Current view:{" "}
                                    <strong>
                                      {activeOutcomeRecentPacketOption.label}
                                    </strong>
                                    . {activeOutcomeRecentPacketOption.note}
                                  </div>
                                  <StableButton
                                    type="button"
                                    kind="secondary"
                                    fullWidth
                                    stableHeight={38}
                                    debugId="community-domain-dashboard.beneficiary-outcome-recent-packet-toggle"
                                    aria-expanded={outcomeRecentPacketChooserOpen}
                                    aria-controls={`community-domain-beneficiary-outcome-recent-packets-${outcomeEventId}`}
                                    onClick={() =>
                                      setBeneficiaryOutcomeRecentPacketChooserOpenById(
                                        (current) => ({
                                          ...current,
                                          [outcomeEventId]: !current[outcomeEventId],
                                        })
                                      )
                                    }
                                    style={{
                                      justifyContent: "center",
                                      fontSize: 13,
                                      textTransform: "none",
                                    }}
                                  >
                                    {outcomeRecentPacketChooserOpen
                                      ? "Close views"
                                      : "Change view"}
                                  </StableButton>
                                  {outcomeRecentPacketChooserOpen ? (
                                    <div
                                      id={`community-domain-beneficiary-outcome-recent-packets-${outcomeEventId}`}
                                      data-debug-id="community-domain-dashboard.beneficiary-outcome-recent-packet-panel"
                                      style={{
                                        display: "grid",
                                        gridTemplateColumns:
                                          "repeat(auto-fit, minmax(min(100%, 112px), 1fr))",
                                        gap: 8,
                                      }}
                                    >
                                      {BENEFICIARY_OUTCOME_RECENT_PACKET_OPTIONS.map(
                                        (packet) => {
                                          const selected =
                                            packet.key === activeOutcomeRecentPacket;
                                          return (
                                            <StableButton
                                              key={packet.key}
                                              type="button"
                                              kind={
                                                selected ? "primary" : "secondary"
                                              }
                                              stableHeight={38}
                                              fullWidth
                                              aria-pressed={selected}
                                              title={packet.note}
                                              debugId={`community-domain-dashboard.beneficiary-outcome-recent-packet.${packet.key}`}
                                              onClick={() => {
                                                setBeneficiaryOutcomeRecentPacketById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: packet.key,
                                                  })
                                                );
                                                setBeneficiaryOutcomeRecentPacketChooserOpenById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: false,
                                                  })
                                                );
                                                setBeneficiaryOutcomeSummaryDetailsOpenById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: false,
                                                  })
                                                );
                                                setBeneficiaryOutcomeConfirmationActionChooserOpenById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: false,
                                                  })
                                                );
                                                setBeneficiaryOutcomeConfirmationActionOpenById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: false,
                                                  })
                                                );
                                                setBeneficiaryOutcomeContactActionChooserOpenById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: false,
                                                  })
                                                );
                                                setBeneficiaryOutcomeContactActionOpenById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: false,
                                                  })
                                                );
                                                setBeneficiaryOutcomeReceiptFormOpenById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: false,
                                                  })
                                                );
                                                setBeneficiaryOutcomeDeliveryNotesOpenById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: false,
                                                  })
                                                );
                                              }}
                                              style={{
                                                justifyContent: "center",
                                                fontSize: 12,
                                                textTransform: "none",
                                              }}
                                            >
                                              {packet.label}
                                            </StableButton>
                                          );
                                        }
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                                {activeOutcomeRecentPacket === "summary" ? (
                                  <>
                                    <div style={{ display: "grid", gap: 8 }}>
                                      <div style={{ ...helperText(), fontSize: 13 }}>
                                        Summary details:{" "}
                                        <strong>
                                          {outcomeSummaryDetailCount
                                            ? `${outcomeSummaryDetailCount} recorded`
                                            : "none recorded"}
                                        </strong>
                                        . Keep this closed unless you need the
                                        audit context for this outcome.
                                      </div>
                                      {outcomeSummaryDetailCount ? (
                                        <StableButton
                                          type="button"
                                          kind="secondary"
                                          fullWidth
                                          stableHeight={38}
                                          debugId="community-domain-dashboard.beneficiary-outcome-summary-details-toggle"
                                          aria-expanded={outcomeSummaryDetailsOpen}
                                          aria-controls={`community-domain-beneficiary-outcome-summary-details-${outcomeEventId}`}
                                          onClick={() =>
                                            setBeneficiaryOutcomeSummaryDetailsOpenById(
                                              (current) => ({
                                                ...current,
                                                [outcomeEventId]:
                                                  !outcomeSummaryDetailsOpen,
                                              })
                                            )
                                          }
                                          style={{
                                            justifyContent: "center",
                                            fontSize: 13,
                                            textTransform: "none",
                                          }}
                                        >
                                          {outcomeSummaryDetailsOpen
                                            ? "Close summary details"
                                            : "Open summary details"}
                                        </StableButton>
                                      ) : null}
                                    </div>
                                    {outcomeSummaryDetailsOpen ? (
                                      <div
                                        id={`community-domain-beneficiary-outcome-summary-details-${outcomeEventId}`}
                                        style={{ display: "grid", gap: 6 }}
                                      >
                                        {latestResponse?.correction_note ? (
                                          <div style={{ ...helperText(), fontSize: 13 }}>
                                            Correction note:{" "}
                                            {cleanText(latestResponse?.correction_note)}
                                          </div>
                                        ) : null}
                                        {latestReview ? (
                                          <div style={{ ...helperText(), fontSize: 13 }}>
                                            Latest review marked this as{" "}
                                            {compactStatus(
                                              latestReview?.challenge_status_after
                                            )}
                                            . The original outcome was not rewritten.
                                          </div>
                                        ) : null}
                                        {latestDeliveryReceipt ? (
                                          <div style={{ ...helperText(), fontSize: 13 }}>
                                            Manual delivery receipt:{" "}
                                            {compactStatus(
                                              latestDeliveryReceipt?.channel
                                            )}{" "}
                                            marked as{" "}
                                            {compactStatus(
                                              latestDeliveryReceipt?.delivery_status
                                            )}
                                            {latestDeliveryReceipt?.consent_basis ? (
                                              <>
                                                {" "}
                                                with consent basis{" "}
                                                {compactStatus(
                                                  latestDeliveryReceipt?.consent_basis
                                                )}
                                              </>
                                            ) : null}
                                            {latestDeliveryReceipt?.contact_consent_event_id ? (
                                              <>
                                                {" "}
                                                backed by contact/consent record{" "}
                                                {cleanText(
                                                  latestDeliveryReceipt?.contact_consent_event_id
                                                )}
                                              </>
                                            ) : null}
                                            . GSN did not send the external message.
                                          </div>
                                        ) : null}
                                        {latestDeliveryReceipt?.latest_correction ? (
                                          <div style={{ ...helperText(), fontSize: 13 }}>
                                            Receipt correction:{" "}
                                            {compactStatus(
                                              latestDeliveryReceipt?.latest_correction
                                                ?.decision
                                            )}{" "}
                                            marked this receipt as{" "}
                                            {compactStatus(
                                              latestDeliveryReceipt
                                                ?.receipt_correction_status
                                            )}
                                            . The original manual receipt remains in the
                                            audit trail.
                                          </div>
                                        ) : null}
                                        {latestProviderSendBlockedCheck ? (
                                          <div style={{ ...helperText(), fontSize: 13 }}>
                                            Provider send blocked:{" "}
                                            {compactStatus(
                                              latestProviderSendBlockedCheck?.blocked_reason ||
                                                "provider_delivery_not_connected"
                                            )}
                                            . GSN recorded this readiness check only; no
                                            provider job, no send attempt, and no external
                                            message was created.
                                          </div>
                                        ) : null}
                                      </div>
                                    ) : null}
                                  </>
                                ) : null}
                                {activeOutcomeRecentPacket === "confirmation" ? (
                                  <div style={{ display: "grid", gap: 8 }}>
                                    <div style={{ ...helperText(), fontSize: 13 }}>
                                      Current confirmation task:{" "}
                                      <strong>
                                        {activeOutcomeConfirmationActionLabel}
                                      </strong>
                                      . {activeOutcomeConfirmationActionNote}
                                    </div>
                                    {needsCorrectionReview ? (
                                      <StableButton
                                        type="button"
                                        kind="secondary"
                                        fullWidth
                                        stableHeight={38}
                                        debugId="community-domain-dashboard.beneficiary-outcome-confirmation-action-toggle"
                                        aria-expanded={
                                          outcomeConfirmationActionChooserOpen
                                        }
                                        aria-controls={`community-domain-beneficiary-outcome-confirmation-actions-${outcomeEventId}`}
                                        onClick={() =>
                                          setBeneficiaryOutcomeConfirmationActionChooserOpenById(
                                            (current) => ({
                                              ...current,
                                              [outcomeEventId]:
                                                !current[outcomeEventId],
                                            })
                                          )
                                        }
                                        style={{
                                          justifyContent: "center",
                                          fontSize: 13,
                                          textTransform: "none",
                                        }}
                                      >
                                        {outcomeConfirmationActionChooserOpen
                                          ? "Close confirmation actions"
                                          : "Change confirmation action"}
                                      </StableButton>
                                    ) : null}
                                    {needsCorrectionReview &&
                                    outcomeConfirmationActionChooserOpen ? (
                                      <div
                                        id={`community-domain-beneficiary-outcome-confirmation-actions-${outcomeEventId}`}
                                        data-debug-id="community-domain-dashboard.beneficiary-outcome-confirmation-action-panel"
                                        style={{
                                          display: "grid",
                                          gridTemplateColumns:
                                            "repeat(auto-fit, minmax(min(100%, 155px), 1fr))",
                                          gap: 8,
                                        }}
                                      >
                                        {[
                                          ["review", "Review challenge"],
                                          ["link", "Create link"],
                                        ].map(([action, label]) => {
                                          const actionKey =
                                            action as BeneficiaryOutcomeConfirmationActionKey;
                                          return (
                                            <StableButton
                                              key={actionKey}
                                              type="button"
                                              kind={
                                                activeOutcomeConfirmationAction ===
                                                actionKey
                                                  ? "primary"
                                                  : "secondary"
                                              }
                                              stableHeight={38}
                                              fullWidth
                                              aria-pressed={
                                                activeOutcomeConfirmationAction ===
                                                actionKey
                                              }
                                              debugId={`community-domain-dashboard.beneficiary-outcome-confirmation-action.${actionKey}`}
                                              onClick={() => {
                                                setBeneficiaryOutcomeConfirmationActionById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: actionKey,
                                                  })
                                                );
                                                setBeneficiaryOutcomeConfirmationActionChooserOpenById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: false,
                                                  })
                                                );
                                                setBeneficiaryOutcomeConfirmationActionOpenById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: false,
                                                  })
                                                );
                                              }}
                                              style={{
                                                justifyContent: "center",
                                                fontSize: 13,
                                                textTransform: "none",
                                              }}
                                            >
                                              {label}
                                            </StableButton>
                                          );
                                        })}
                                      </div>
                                    ) : null}
                                    <StableButton
                                      type="button"
                                      kind="secondary"
                                      fullWidth
                                      stableHeight={38}
                                      debugId="community-domain-dashboard.beneficiary-outcome-confirmation-action-form-toggle"
                                      aria-expanded={outcomeConfirmationActionOpen}
                                      aria-controls={`community-domain-beneficiary-outcome-confirmation-action-form-${outcomeEventId}`}
                                      onClick={() =>
                                        setBeneficiaryOutcomeConfirmationActionOpenById(
                                          (current) => ({
                                            ...current,
                                            [outcomeEventId]:
                                              !current[outcomeEventId],
                                          })
                                        )
                                      }
                                      style={{
                                        justifyContent: "center",
                                        fontSize: 13,
                                        textTransform: "none",
                                      }}
                                    >
                                      {outcomeConfirmationActionOpen
                                        ? "Close confirmation action"
                                        : "Open confirmation action"}
                                    </StableButton>
                                  </div>
                                ) : null}
                                {activeOutcomeRecentPacket === "confirmation" &&
                                activeOutcomeConfirmationAction === "review" &&
                                outcomeConfirmationActionOpen &&
                                needsCorrectionReview ? (
                                  <div
                                    id={`community-domain-beneficiary-outcome-confirmation-action-form-${outcomeEventId}`}
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns:
                                        "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
                                      gap: 8,
                                      alignItems: "center",
                                    }}
                                  >
                                    <select
                                      value={selectedCorrectionDecision}
                                      disabled={
                                        busyOutcomeCorrectionReviewId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) =>
                                        updateBeneficiaryCorrectionDecision(
                                          outcomeEventId,
                                          event.target.value
                                        )
                                      }
                                      style={billingInputStyle()}
                                    >
                                      {BENEFICIARY_CORRECTION_DECISION_OPTIONS.map(
                                        (option) => (
                                          <option
                                            key={option.value}
                                            value={option.value}
                                          >
                                            {option.label}
                                          </option>
                                        )
                                      )}
                                    </select>
                                    <input
                                      value={selectedCorrectionNote}
                                      disabled={
                                        busyOutcomeCorrectionReviewId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) =>
                                        updateBeneficiaryCorrectionNote(
                                          outcomeEventId,
                                          event.target.value
                                        )
                                      }
                                      placeholder="Review note"
                                      style={billingInputStyle()}
                                    />
                                    <StableButton
                                      type="button"
                                      kind="secondary"
                                      stableHeight={38}
                                      disabled={
                                        busyOutcomeCorrectionReviewId ===
                                        outcomeEventId
                                      }
                                      debugId="community-domain-dashboard.beneficiary-outcome-correction-review"
                                      onClick={() => {
                                        void submitBeneficiaryOutcomeCorrectionReview(
                                          item
                                        );
                                      }}
                                      style={{
                                        justifyContent: "center",
                                        fontSize: 13,
                                        textTransform: "none",
                                      }}
                                    >
                                      {busyOutcomeCorrectionReviewId ===
                                      outcomeEventId
                                        ? "Recording review..."
                                        : "Review challenge"}
                                    </StableButton>
                                  </div>
                                ) : null}
                                {activeOutcomeRecentPacket === "confirmation" &&
                                activeOutcomeConfirmationAction === "link" &&
                                outcomeConfirmationActionOpen ? (
                                  <div
                                    id={`community-domain-beneficiary-outcome-confirmation-action-form-${outcomeEventId}`}
                                    style={{ display: "grid", gap: 8 }}
                                  >
                                    <StableButton
                                      type="button"
                                      kind="secondary"
                                      stableHeight={38}
                                      disabled={
                                        busyOutcomeConfirmationLinkId ===
                                        outcomeEventId
                                      }
                                      debugId="community-domain-dashboard.beneficiary-outcome-confirmation-link"
                                      onClick={() => {
                                        void createBeneficiaryOutcomeConfirmationLink(
                                          outcomeEventId
                                        );
                                      }}
                                      style={{
                                        justifyContent: "center",
                                        fontSize: 13,
                                        textTransform: "none",
                                      }}
                                    >
                                      {busyOutcomeConfirmationLinkId ===
                                      outcomeEventId
                                        ? "Creating link..."
                                        : "Create confirmation link"}
                                    </StableButton>
                                  </div>
                                ) : null}
                                {activeOutcomeRecentPacket === "contact" &&
                                isAdmin ? (
                                  <div style={{ display: "grid", gap: 8 }}>
                                    <div style={{ ...helperText(), fontSize: 13 }}>
                                      Current contact task:{" "}
                                      <strong>
                                        {activeOutcomeContactActionLabel}
                                      </strong>
                                      . {activeOutcomeContactActionNote}
                                    </div>
                                    {canWithdrawContactConsent ? (
                                      <StableButton
                                        type="button"
                                        kind="secondary"
                                        fullWidth
                                        stableHeight={38}
                                        debugId="community-domain-dashboard.beneficiary-outcome-contact-action-toggle"
                                        aria-expanded={
                                          outcomeContactActionChooserOpen
                                        }
                                        aria-controls={`community-domain-beneficiary-outcome-contact-actions-${outcomeEventId}`}
                                        onClick={() =>
                                          setBeneficiaryOutcomeContactActionChooserOpenById(
                                            (current) => ({
                                              ...current,
                                              [outcomeEventId]:
                                                !current[outcomeEventId],
                                            })
                                          )
                                        }
                                        style={{
                                          justifyContent: "center",
                                          fontSize: 13,
                                          textTransform: "none",
                                        }}
                                      >
                                        {outcomeContactActionChooserOpen
                                          ? "Close contact actions"
                                          : "Change contact action"}
                                      </StableButton>
                                    ) : null}
                                    {canWithdrawContactConsent &&
                                    outcomeContactActionChooserOpen ? (
                                      <div
                                        id={`community-domain-beneficiary-outcome-contact-actions-${outcomeEventId}`}
                                        data-debug-id="community-domain-dashboard.beneficiary-outcome-contact-action-panel"
                                        style={{
                                          display: "grid",
                                          gridTemplateColumns:
                                            "repeat(auto-fit, minmax(min(100%, 155px), 1fr))",
                                          gap: 8,
                                        }}
                                      >
                                        {[
                                          [
                                            "record",
                                            "Record contact/consent",
                                          ],
                                          ["withdraw", "Withdraw consent"],
                                        ].map(([action, label]) => {
                                          const actionKey =
                                            action as BeneficiaryOutcomeContactActionKey;
                                          return (
                                            <StableButton
                                              key={actionKey}
                                              type="button"
                                              kind={
                                                activeOutcomeContactAction ===
                                                actionKey
                                                  ? "primary"
                                                  : "secondary"
                                              }
                                              stableHeight={38}
                                              fullWidth
                                              aria-pressed={
                                                activeOutcomeContactAction ===
                                                actionKey
                                              }
                                              debugId={`community-domain-dashboard.beneficiary-outcome-contact-action.${actionKey}`}
                                              onClick={() => {
                                                setBeneficiaryOutcomeContactActionById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: actionKey,
                                                  })
                                                );
                                                setBeneficiaryOutcomeContactActionChooserOpenById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: false,
                                                  })
                                                );
                                                setBeneficiaryOutcomeContactActionOpenById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: false,
                                                  })
                                                );
                                              }}
                                              style={{
                                                justifyContent: "center",
                                                fontSize: 13,
                                                textTransform: "none",
                                              }}
                                            >
                                              {label}
                                            </StableButton>
                                          );
                                        })}
                                      </div>
                                    ) : null}
                                    <StableButton
                                      type="button"
                                      kind="secondary"
                                      fullWidth
                                      stableHeight={38}
                                      debugId="community-domain-dashboard.beneficiary-outcome-contact-action-form-toggle"
                                      aria-expanded={outcomeContactActionOpen}
                                      aria-controls={`community-domain-beneficiary-outcome-contact-action-form-${outcomeEventId}`}
                                      onClick={() =>
                                        setBeneficiaryOutcomeContactActionOpenById(
                                          (current) => ({
                                            ...current,
                                            [outcomeEventId]:
                                              !current[outcomeEventId],
                                          })
                                        )
                                      }
                                      style={{
                                        justifyContent: "center",
                                        fontSize: 13,
                                        textTransform: "none",
                                      }}
                                    >
                                      {outcomeContactActionOpen
                                        ? "Close contact action"
                                        : "Open contact action"}
                                    </StableButton>
                                  </div>
                                ) : null}
                                {activeOutcomeRecentPacket === "contact" &&
                                isAdmin &&
                                activeOutcomeContactAction === "record" &&
                                outcomeContactActionOpen ? (
                                  <div
                                    id={`community-domain-beneficiary-outcome-contact-action-form-${outcomeEventId}`}
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns:
                                        "repeat(auto-fit, minmax(min(100%, 155px), 1fr))",
                                      gap: 8,
                                      alignItems: "center",
                                    }}
                                  >
                                    <select
                                      value={selectedContactConsentDraft.channel}
                                      disabled={
                                        busyOutcomeContactConsentId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) =>
                                        updateBeneficiaryContactConsentDraft(
                                          outcomeEventId,
                                          "channel",
                                          event.target.value
                                        )
                                      }
                                      style={billingInputStyle()}
                                      aria-label="Contact consent channel"
                                    >
                                      {BENEFICIARY_DELIVERY_CHANNEL_OPTIONS.filter(
                                        (option) =>
                                          option.value === "whatsapp" ||
                                          option.value === "sms" ||
                                          option.value === "email"
                                      ).map((option) => (
                                        <option
                                          key={option.value}
                                          value={option.value}
                                        >
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                    <select
                                      value={
                                        selectedContactConsentDraft.destination_reference_status
                                      }
                                      disabled={
                                        busyOutcomeContactConsentId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) =>
                                        updateBeneficiaryContactConsentDraft(
                                          outcomeEventId,
                                          "destination_reference_status",
                                          event.target.value
                                        )
                                      }
                                      style={billingInputStyle()}
                                      aria-label="Contact reference status"
                                    >
                                      {BENEFICIARY_CONTACT_REFERENCE_STATUS_OPTIONS.map(
                                        (option) => (
                                          <option
                                            key={option.value}
                                            value={option.value}
                                          >
                                            {option.label}
                                          </option>
                                        )
                                      )}
                                    </select>
                                    <input
                                      value={
                                        selectedContactConsentDraft.destination_reference_label
                                      }
                                      disabled={
                                        busyOutcomeContactConsentId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) =>
                                        updateBeneficiaryContactConsentDraft(
                                          outcomeEventId,
                                          "destination_reference_label",
                                          event.target.value
                                        )
                                      }
                                      placeholder="Reference label, not phone/email"
                                      style={billingInputStyle()}
                                    />
                                    <select
                                      value={selectedContactConsentDraft.consent_basis}
                                      disabled={
                                        busyOutcomeContactConsentId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) =>
                                        updateBeneficiaryContactConsentDraft(
                                          outcomeEventId,
                                          "consent_basis",
                                          event.target.value
                                        )
                                      }
                                      style={billingInputStyle()}
                                      aria-label="Contact consent basis"
                                    >
                                      {BENEFICIARY_DELIVERY_CONSENT_OPTIONS.map(
                                        (option) => (
                                          <option
                                            key={option.value}
                                            value={option.value}
                                          >
                                            {option.label}
                                          </option>
                                        )
                                      )}
                                    </select>
                                    <input
                                      value={selectedContactConsentDraft.note}
                                      disabled={
                                        busyOutcomeContactConsentId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) =>
                                        updateBeneficiaryContactConsentDraft(
                                          outcomeEventId,
                                          "note",
                                          event.target.value
                                        )
                                      }
                                      placeholder="Consent note"
                                      style={billingInputStyle()}
                                    />
                                    <StableButton
                                      type="button"
                                      kind="secondary"
                                      stableHeight={38}
                                      disabled={
                                        busyOutcomeContactConsentId ===
                                        outcomeEventId
                                      }
                                      debugId="community-domain-dashboard.beneficiary-outcome-contact-consent"
                                      onClick={() => {
                                        void recordBeneficiaryOutcomeContactConsent(
                                          item
                                        );
                                      }}
                                      style={{
                                        justifyContent: "center",
                                        fontSize: 13,
                                        textTransform: "none",
                                      }}
                                    >
                                      {busyOutcomeContactConsentId ===
                                      outcomeEventId
                                        ? "Recording consent..."
                                        : "Record contact/consent"}
                                    </StableButton>
                                  </div>
                                ) : null}
                                {activeOutcomeRecentPacket === "contact" &&
                                isAdmin &&
                                canWithdrawContactConsent &&
                                activeOutcomeContactAction === "withdraw" &&
                                outcomeContactActionOpen ? (
                                  <div
                                    id={`community-domain-beneficiary-outcome-contact-action-form-${outcomeEventId}`}
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns:
                                        "repeat(auto-fit, minmax(min(100%, 155px), 1fr))",
                                      gap: 8,
                                      alignItems: "center",
                                    }}
                                  >
                                    <select
                                      value={
                                        selectedContactConsentWithdrawalDraft.withdrawal_reason
                                      }
                                      disabled={
                                        busyOutcomeContactConsentWithdrawalId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) =>
                                        updateBeneficiaryContactConsentWithdrawalDraft(
                                          outcomeEventId,
                                          "withdrawal_reason",
                                          event.target.value
                                        )
                                      }
                                      style={billingInputStyle()}
                                      aria-label="Contact consent withdrawal reason"
                                    >
                                      {BENEFICIARY_CONTACT_CONSENT_WITHDRAWAL_REASON_OPTIONS.map(
                                        (option) => (
                                          <option
                                            key={option.value}
                                            value={option.value}
                                          >
                                            {option.label}
                                          </option>
                                        )
                                      )}
                                    </select>
                                    <input
                                      value={selectedContactConsentWithdrawalDraft.note}
                                      disabled={
                                        busyOutcomeContactConsentWithdrawalId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) =>
                                        updateBeneficiaryContactConsentWithdrawalDraft(
                                          outcomeEventId,
                                          "note",
                                          event.target.value
                                        )
                                      }
                                      placeholder="Withdrawal note"
                                      style={billingInputStyle()}
                                    />
                                    <StableButton
                                      type="button"
                                      kind="secondary"
                                      stableHeight={38}
                                      disabled={
                                        busyOutcomeContactConsentWithdrawalId ===
                                        outcomeEventId
                                      }
                                      debugId="community-domain-dashboard.beneficiary-outcome-contact-consent-withdrawal"
                                      onClick={() => {
                                        void withdrawBeneficiaryOutcomeContactConsent(
                                          item
                                        );
                                      }}
                                      style={{
                                        justifyContent: "center",
                                        fontSize: 13,
                                        textTransform: "none",
                                      }}
                                    >
                                      {busyOutcomeContactConsentWithdrawalId ===
                                      outcomeEventId
                                        ? "Recording withdrawal..."
                                        : "Record consent withdrawal"}
                                    </StableButton>
                                  </div>
                                ) : null}
                                {activeOutcomeRecentPacket === "delivery" &&
                                (
                                  <div style={{ display: "grid", gap: 8 }}>
                                    <div style={{ ...helperText(), fontSize: 13 }}>
                                      Current delivery task:{" "}
                                      <strong>
                                        {activeOutcomeDeliveryTaskLabel}
                                      </strong>
                                      . {activeOutcomeDeliveryTaskNote}
                                    </div>
                                    <StableButton
                                      type="button"
                                      kind="secondary"
                                      fullWidth
                                      stableHeight={38}
                                      debugId="community-domain-dashboard.beneficiary-outcome-delivery-notes-toggle"
                                      aria-expanded={outcomeDeliveryNotesOpen}
                                      aria-controls={`community-domain-beneficiary-outcome-delivery-notes-${outcomeEventId}`}
                                      onClick={() =>
                                        setBeneficiaryOutcomeDeliveryNotesOpenById(
                                          (current) => ({
                                            ...current,
                                            [outcomeEventId]:
                                              !current[outcomeEventId],
                                          })
                                        )
                                      }
                                      style={{
                                        justifyContent: "center",
                                        fontSize: 13,
                                        textTransform: "none",
                                      }}
                                    >
                                      {outcomeDeliveryNotesOpen
                                        ? "Close delivery notes"
                                        : "Open delivery notes"}
                                    </StableButton>
                                  </div>
                                )}
                                {activeOutcomeRecentPacket === "delivery" &&
                                outcomeDeliveryNotesOpen ? (
                                  <div
                                    id={`community-domain-beneficiary-outcome-delivery-notes-${outcomeEventId}`}
                                    style={{ display: "grid", gap: 6 }}
                                  >
                                    {manualDeliveryBlockedByConsent ? (
                                      <div style={{ ...helperText(), fontSize: 13 }}>
                                        {manualDeliveryBlockedText}
                                      </div>
                                    ) : null}
                                    {latestDeliveryPreparation ? (
                                      <div style={{ ...helperText(), fontSize: 13 }}>
                                        Current provider readiness contact/consent:{" "}
                                        <strong>{currentProviderContactStatus}</strong>.
                                        Prepared delivery recorded contact/consent as{" "}
                                        <strong>{preparedDeliveryContactStatus}</strong>.
                                        GSN still has not sent WhatsApp, SMS, or email.
                                      </div>
                                    ) : null}
                                    {!manualDeliveryBlockedByConsent &&
                                    !latestDeliveryPreparation &&
                                    !localDeliveryPack ? (
                                      <div style={{ ...helperText(), fontSize: 13 }}>
                                        No delivery pack is prepared for this outcome yet.
                                        Use Confirm to create the private confirmation
                                        link and delivery text before delivery checks.
                                      </div>
                                    ) : null}
                                    {localDeliveryPack &&
                                    !latestDeliveryPreparation ? (
                                      <div style={{ ...helperText(), fontSize: 13 }}>
                                        A delivery pack is prepared in this session.
                                        GSN still has not sent WhatsApp, SMS, or email.
                                        Open Receipt after manual delivery happens.
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}
                                {activeOutcomeRecentPacket === "receipt" ? (
                                  <div style={{ display: "grid", gap: 8 }}>
                                    <div style={{ ...helperText(), fontSize: 13 }}>
                                      Current receipt task:{" "}
                                      <strong>
                                        {activeOutcomeReceiptTaskLabel}
                                      </strong>
                                      . {activeOutcomeReceiptTaskNote}
                                    </div>
                                    {canOpenOutcomeReceiptForm ? (
                                      <StableButton
                                        type="button"
                                        kind="secondary"
                                        fullWidth
                                        stableHeight={38}
                                        debugId="community-domain-dashboard.beneficiary-outcome-receipt-form-toggle"
                                        aria-expanded={outcomeReceiptFormOpen}
                                        aria-controls={`community-domain-beneficiary-outcome-receipt-form-${outcomeEventId}`}
                                        onClick={() =>
                                          setBeneficiaryOutcomeReceiptFormOpenById(
                                            (current) => ({
                                              ...current,
                                              [outcomeEventId]:
                                                !current[outcomeEventId],
                                            })
                                          )
                                        }
                                        style={{
                                          justifyContent: "center",
                                          fontSize: 13,
                                          textTransform: "none",
                                        }}
                                      >
                                        {outcomeReceiptFormOpen
                                          ? "Close receipt form"
                                          : "Open receipt form"}
                                      </StableButton>
                                    ) : null}
                                  </div>
                                ) : null}
                                {activeOutcomeRecentPacket === "receipt" &&
                                canRecordManualDelivery &&
                                outcomeReceiptFormOpen ? (
                                  <div
                                    id={`community-domain-beneficiary-outcome-receipt-form-${outcomeEventId}`}
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns:
                                        "repeat(auto-fit, minmax(min(100%, 155px), 1fr))",
                                      gap: 8,
                                      alignItems: "center",
                                    }}
                                  >
                                    <select
                                      value={selectedDeliveryReceiptDraft.channel}
                                      disabled={
                                        busyOutcomeDeliveryReceiptId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) =>
                                        updateBeneficiaryDeliveryReceiptDraft(
                                          outcomeEventId,
                                          "channel",
                                          event.target.value
                                        )
                                      }
                                      style={billingInputStyle()}
                                      aria-label="Manual delivery channel"
                                    >
                                      {BENEFICIARY_DELIVERY_CHANNEL_OPTIONS.map(
                                        (option) => (
                                          <option
                                            key={option.value}
                                            value={option.value}
                                          >
                                            {option.label}
                                          </option>
                                        )
                                      )}
                                    </select>
                                    <select
                                      value={
                                        selectedDeliveryReceiptDraft.delivery_status
                                      }
                                      disabled={
                                        busyOutcomeDeliveryReceiptId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) =>
                                        updateBeneficiaryDeliveryReceiptDraft(
                                          outcomeEventId,
                                          "delivery_status",
                                          event.target.value
                                        )
                                      }
                                      style={billingInputStyle()}
                                      aria-label="Manual delivery status"
                                    >
                                      {BENEFICIARY_DELIVERY_STATUS_OPTIONS.map(
                                        (option) => (
                                          <option
                                            key={option.value}
                                            value={option.value}
                                          >
                                            {option.label}
                                          </option>
                                        )
                                      )}
                                    </select>
                                    <input
                                      value={selectedDeliveryReceiptDraft.note}
                                      disabled={
                                        busyOutcomeDeliveryReceiptId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) =>
                                        updateBeneficiaryDeliveryReceiptDraft(
                                          outcomeEventId,
                                          "note",
                                          event.target.value
                                        )
                                      }
                                      placeholder="Delivery note"
                                      style={billingInputStyle()}
                                    />
                                    <select
                                      value={
                                        selectedDeliveryReceiptDraft.consent_basis
                                      }
                                      disabled={
                                        busyOutcomeDeliveryReceiptId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) =>
                                        updateBeneficiaryDeliveryReceiptDraft(
                                          outcomeEventId,
                                          "consent_basis",
                                          event.target.value
                                        )
                                      }
                                      style={billingInputStyle()}
                                      aria-label="Manual delivery consent basis"
                                    >
                                      {BENEFICIARY_DELIVERY_CONSENT_OPTIONS.map(
                                        (option) => (
                                          <option
                                            key={option.value}
                                            value={option.value}
                                          >
                                            {option.label}
                                          </option>
                                        )
                                      )}
                                    </select>
                                    <StableButton
                                      type="button"
                                      kind="secondary"
                                      stableHeight={38}
                                      disabled={
                                        busyOutcomeProviderSendId ===
                                        outcomeEventId
                                      }
                                      debugId="community-domain-dashboard.beneficiary-outcome-provider-send-check"
                                      onClick={() => {
                                        void checkBeneficiaryOutcomeProviderSend(
                                          item
                                        );
                                      }}
                                      style={{
                                        justifyContent: "center",
                                        fontSize: 13,
                                        textTransform: "none",
                                      }}
                                    >
                                      {busyOutcomeProviderSendId ===
                                      outcomeEventId
                                        ? "Checking provider..."
                                        : "Check provider send"}
                                    </StableButton>
                                    <StableButton
                                      type="button"
                                      kind="secondary"
                                      stableHeight={38}
                                      disabled={
                                        busyOutcomeDeliveryReceiptId ===
                                        outcomeEventId
                                      }
                                      debugId="community-domain-dashboard.beneficiary-outcome-delivery-receipt"
                                      onClick={() => {
                                        void recordBeneficiaryOutcomeDeliveryReceipt(
                                          item
                                        );
                                      }}
                                      style={{
                                        justifyContent: "center",
                                        fontSize: 13,
                                        textTransform: "none",
                                      }}
                                    >
                                      {busyOutcomeDeliveryReceiptId ===
                                      outcomeEventId
                                        ? "Recording delivery..."
                                        : "Record manual receipt"}
                                    </StableButton>
                                  </div>
                                ) : null}
                                {activeOutcomeRecentPacket === "receipt" &&
                                latestDeliveryReceipt &&
                                outcomeReceiptFormOpen ? (
                                  <div
                                    id={`community-domain-beneficiary-outcome-receipt-form-${outcomeEventId}`}
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns:
                                        "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
                                      gap: 8,
                                      alignItems: "center",
                                    }}
                                  >
                                    <select
                                      value={selectedDeliveryReceiptCorrectionDraft.decision}
                                      disabled={
                                        busyOutcomeDeliveryReceiptCorrectionId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) => {
                                        const nextDecision = event.target.value;
                                        setBeneficiaryDeliveryReceiptCorrectionDraftByOutcomeId(
                                          (current) => ({
                                            ...current,
                                            [outcomeEventId]: {
                                              ...selectedDeliveryReceiptCorrectionDraft,
                                              decision: nextDecision,
                                            },
                                          })
                                        );
                                      }}
                                      style={billingInputStyle()}
                                      aria-label="Manual delivery receipt correction decision"
                                    >
                                      {BENEFICIARY_DELIVERY_RECEIPT_CORRECTION_OPTIONS.map(
                                        (option) => (
                                          <option
                                            key={option.value}
                                            value={option.value}
                                          >
                                            {option.label}
                                          </option>
                                        )
                                      )}
                                    </select>
                                    <input
                                      value={selectedDeliveryReceiptCorrectionDraft.note}
                                      disabled={
                                        busyOutcomeDeliveryReceiptCorrectionId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) => {
                                        const nextNote = event.target.value;
                                        setBeneficiaryDeliveryReceiptCorrectionDraftByOutcomeId(
                                          (current) => ({
                                            ...current,
                                            [outcomeEventId]: {
                                              ...selectedDeliveryReceiptCorrectionDraft,
                                              note: nextNote,
                                            },
                                          })
                                        );
                                      }}
                                      style={billingInputStyle()}
                                      aria-label="Manual delivery receipt correction note"
                                      placeholder="Correction note"
                                    />
                                    <StableButton
                                      type="button"
                                      kind="secondary"
                                      stableHeight={38}
                                      disabled={
                                        busyOutcomeDeliveryReceiptCorrectionId ===
                                        outcomeEventId
                                      }
                                      debugId="community-domain-dashboard.beneficiary-outcome-delivery-receipt-correction"
                                      onClick={() => {
                                        void correctBeneficiaryOutcomeDeliveryReceipt(
                                          item
                                        );
                                      }}
                                      style={{
                                        justifyContent: "center",
                                        fontSize: 13,
                                        textTransform: "none",
                                      }}
                                    >
                                      {busyOutcomeDeliveryReceiptCorrectionId ===
                                      outcomeEventId
                                        ? "Recording correction..."
                                        : "Record receipt correction"}
                                    </StableButton>
                                  </div>
                                ) : null}
                              </div>
                              );
                            })}
                          </div>
                          ) : (
                          <div style={helperText()}>
                            No beneficiary outcome records are loaded for this Community Domain yet.
                          </div>
                          )
                        ) : null}
                      </div>
                      ) : null}
                      </>
                    ) : null}
    </>
  );
}
