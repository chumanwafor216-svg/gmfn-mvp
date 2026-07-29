import React from "react";
import { CardActionRow, SecondaryButton, SubtleButton } from "../../components/StableButton";
import { GsnLegacyIcon } from "../../components/GsnLegacyIcon";

type DecisionPackPointer = {
  key?: string;
  label: string;
  value?: string;
  decisionUse?: string;
};

type DecisionPackEvidenceCategory = {
  key?: string;
  label: string;
  evidenceCount: number;
  latestAt?: string;
  eventRefs: Array<{ label?: string }>;
};

type DecisionPackEvidenceExtract = {
  declarationBoundaryNote?: string;
  recordPointerBoundaryNote?: string;
  housingReferenceBoundaryNote?: string;
  guaranteeOutcomeBoundaryNote?: string;
  fulfillmentOutcomeBoundaryNote?: string;
  completedWorkBoundaryNote?: string;
  demandRequestOutcomeBoundaryNote?: string;
  confirmationPointerBoundaryNote?: string;
  issueResolutionBoundaryNote?: string;
};

type DecisionPackConsentShareRow = {
  id: string;
  accessPurpose: string;
  exportFormat?: string;
  categoryCount: number;
  eventRefCount: number;
  createdAt?: string;
};

type DecisionPackAccessRow = {
  id: string;
  accessPurpose: string;
  code?: string;
  accessScope?: string;
  createdAt?: string;
};

type TrustSlipDecisionPackPrivatePreviewProps = {
  isCompact: boolean;
  isCollapsed: boolean;
  decisionPackEvidenceLoading: boolean;
  privateDecisionPackEvidenceAvailable: boolean;
  privateDecisionPackEvidenceScopeSummary: string;
  privateDecisionPackEvidenceScopeBoundary: string;
  decisionPackEvidenceExtract: DecisionPackEvidenceExtract | null;
  privateDecisionPackDeclaredClaims: DecisionPackPointer[];
  privateDecisionPackRecordPointers: DecisionPackPointer[];
  privateDecisionPackHousingReferencePointers: DecisionPackPointer[];
  privateDecisionPackGuaranteeOutcomePointers: DecisionPackPointer[];
  privateDecisionPackFulfillmentOutcomePointers: DecisionPackPointer[];
  privateDecisionPackCompletedWorkPointers: DecisionPackPointer[];
  privateDecisionPackDemandRequestOutcomePointers: DecisionPackPointer[];
  privateDecisionPackConfirmationPointers: DecisionPackPointer[];
  privateDecisionPackIssueResolutionPointers: DecisionPackPointer[];
  privateDecisionPackEvidenceCategories: DecisionPackEvidenceCategory[];
  selectedPurposeKey: string;
  housingExternalContactLabel: string;
  setHousingExternalContactLabel: (value: string) => void;
  housingExternalContactChannel: string;
  setHousingExternalContactChannel: (value: string) => void;
  housingExternalContactValue: string;
  setHousingExternalContactValue: (value: string) => void;
  copyDecisionPackConsentSummary: () => void | Promise<void>;
  copyDecisionPackConsentJson: () => void | Promise<void>;
  decisionPackConsentShares: DecisionPackConsentShareRow[];
  decisionPackAccesses: DecisionPackAccessRow[];
};

function safeDateTime(x: unknown): string {
  const raw = String(x ?? "").trim();
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function sectionLabel(): React.CSSProperties {
  return {
    color: "#D6AA45",
    textTransform: "uppercase",
    letterSpacing: 0,
    fontSize: 11,
    fontWeight: 900,
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 26,
    padding: "4px 9px",
    borderRadius: 999,
    border: primary ? "1px solid rgba(214,170,69,0.55)" : "1px solid rgba(37,78,119,0.12)",
    background: primary ? "#FFF7E6" : "#F8FBFF",
    color: primary ? "#7A4A00" : "#39526C",
    fontSize: 11,
    fontWeight: 900,
    lineHeight: 1,
    whiteSpace: "nowrap",
  };
}

export default function TrustSlipDecisionPackPrivatePreview({
  isCompact,
  isCollapsed,
  decisionPackEvidenceLoading,
  privateDecisionPackEvidenceAvailable,
  privateDecisionPackEvidenceScopeSummary,
  privateDecisionPackEvidenceScopeBoundary,
  decisionPackEvidenceExtract,
  privateDecisionPackDeclaredClaims,
  privateDecisionPackRecordPointers,
  privateDecisionPackHousingReferencePointers,
  privateDecisionPackGuaranteeOutcomePointers,
  privateDecisionPackFulfillmentOutcomePointers,
  privateDecisionPackCompletedWorkPointers,
  privateDecisionPackDemandRequestOutcomePointers,
  privateDecisionPackConfirmationPointers,
  privateDecisionPackIssueResolutionPointers,
  privateDecisionPackEvidenceCategories,
  selectedPurposeKey,
  housingExternalContactLabel,
  setHousingExternalContactLabel,
  housingExternalContactChannel,
  setHousingExternalContactChannel,
  housingExternalContactValue,
  setHousingExternalContactValue,
  copyDecisionPackConsentSummary,
  copyDecisionPackConsentJson,
  decisionPackConsentShares,
  decisionPackAccesses,
}: TrustSlipDecisionPackPrivatePreviewProps) {
  return (
    <>            <div
              data-gsn-holder-private-decision-pack-evidence="true"
              style={{
                borderRadius: 14,
                border: "1px solid rgba(214,170,69,0.24)",
                background: "linear-gradient(180deg, #FFFDF7 0%, #F8FBFF 100%)",
                padding: isCompact ? 11 : 13,
                display: isCompact && isCollapsed ? "none" : "grid",
                gap: 9,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px minmax(0, 1fr)",
                  gap: 9,
                  alignItems: "center",
                }}
              >
                <GsnLegacyIcon name="vault" size={30} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ ...sectionLabel(), fontSize: isCompact ? 9 : 10 }}>
                    Private holder preview
                  </div>
                  <div
                    style={{
                      marginTop: 2,
                      color: "#07172C",
                      fontSize: isCompact ? 13 : 15,
                      fontWeight: 1000,
                      lineHeight: 1.16,
                    }}
                  >
                    Evidence behind this Decision Pack
                  </div>
                </div>
              </div>

              {decisionPackEvidenceLoading ? (
                <div
                  style={{
                    color: "#526579",
                    fontSize: isCompact ? 11 : 12,
                    fontWeight: 850,
                    lineHeight: 1.35,
                  }}
                >
                  Checking your private evidence categories...
                </div>
              ) : privateDecisionPackEvidenceAvailable ? (
                <div style={{ display: "grid", gap: 7 }}>
                  <div
                    style={{
                      border: "1px solid rgba(37,78,119,0.10)",
                      borderRadius: 12,
                      background: "#F8FBFF",
                      padding: "8px 9px",
                      color: "#526579",
                      fontSize: isCompact ? 10.5 : 11.5,
                      fontWeight: 850,
                      lineHeight: 1.35,
                    }}
                  >
                    {privateDecisionPackEvidenceScopeSummary} {privateDecisionPackEvidenceScopeBoundary}
                  </div>
                  {privateDecisionPackDeclaredClaims.length ? (
                    <div
                      data-gsn-holder-decision-pack-declared-claims="true"
                      style={{
                        border: "1px solid rgba(37,78,119,0.10)",
                        borderRadius: 12,
                        background: "#FFFFFF",
                        padding: "8px 9px",
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          color: "#07172C",
                          fontSize: isCompact ? 12 : 13,
                          fontWeight: 950,
                          lineHeight: 1.15,
                        }}
                      >
                        Declared work/service claim
                      </div>
                      {privateDecisionPackDeclaredClaims.map((claim) => (
                        <div
                          key={claim.key || claim.label}
                          style={{
                            color: "#526579",
                            fontSize: isCompact ? 10 : 11,
                            fontWeight: 800,
                            lineHeight: 1.28,
                          }}
                        >
                          <strong>{claim.label}:</strong> {claim.value || claim.decisionUse}
                        </div>
                      ))}
                      {decisionPackEvidenceExtract?.declarationBoundaryNote ? (
                        <div
                          style={{
                            color: "#8A6500",
                            fontSize: isCompact ? 9.5 : 10.5,
                            fontWeight: 850,
                            lineHeight: 1.28,
                          }}
                        >
                          {decisionPackEvidenceExtract.declarationBoundaryNote}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {privateDecisionPackRecordPointers.length ? (
                    <div
                      data-gsn-holder-decision-pack-record-pointers="true"
                      style={{
                        border: "1px solid rgba(37,78,119,0.10)",
                        borderRadius: 12,
                        background: "#FFFFFF",
                        padding: "8px 9px",
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          color: "#07172C",
                          fontSize: isCompact ? 12 : 13,
                          fontWeight: 950,
                          lineHeight: 1.15,
                        }}
                      >
                        Connected record pointers
                      </div>
                      {privateDecisionPackRecordPointers.map((pointer) => (
                        <div
                          key={pointer.key || pointer.label}
                          style={{
                            color: "#526579",
                            fontSize: isCompact ? 10 : 11,
                            fontWeight: 800,
                            lineHeight: 1.28,
                          }}
                        >
                          <strong>{pointer.label}:</strong> {pointer.value || pointer.decisionUse}
                        </div>
                      ))}
                      {decisionPackEvidenceExtract?.recordPointerBoundaryNote ? (
                        <div
                          style={{
                            color: "#8A6500",
                            fontSize: isCompact ? 9.5 : 10.5,
                            fontWeight: 850,
                            lineHeight: 1.28,
                          }}
                        >
                          {decisionPackEvidenceExtract.recordPointerBoundaryNote}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {privateDecisionPackHousingReferencePointers.length ? (
                    <div
                      data-gsn-holder-decision-pack-housing-reference-pointers="true"
                      style={{
                        border: "1px solid rgba(37,78,119,0.10)",
                        borderRadius: 12,
                        background: "#FFFFFF",
                        padding: "8px 9px",
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          color: "#07172C",
                          fontSize: isCompact ? 12 : 13,
                          fontWeight: 950,
                          lineHeight: 1.15,
                        }}
                      >
                        Housing conduct readiness
                      </div>
                      {privateDecisionPackHousingReferencePointers.map((pointer) => (
                        <div
                          key={pointer.key || pointer.label}
                          style={{
                            color: "#526579",
                            fontSize: isCompact ? 10 : 11,
                            fontWeight: 800,
                            lineHeight: 1.28,
                          }}
                        >
                          <strong>{pointer.label}:</strong> {pointer.value || pointer.decisionUse}
                        </div>
                      ))}
                      {decisionPackEvidenceExtract?.housingReferenceBoundaryNote ? (
                        <div
                          style={{
                            color: "#8A6500",
                            fontSize: isCompact ? 9.5 : 10.5,
                            fontWeight: 850,
                            lineHeight: 1.28,
                          }}
                        >
                          {decisionPackEvidenceExtract.housingReferenceBoundaryNote}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {privateDecisionPackGuaranteeOutcomePointers.length ? (
                    <div
                      data-gsn-holder-decision-pack-guarantee-outcome-pointers="true"
                      style={{
                        border: "1px solid rgba(37,78,119,0.10)",
                        borderRadius: 12,
                        background: "#FFFFFF",
                        padding: "8px 9px",
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          color: "#07172C",
                          fontSize: isCompact ? 12 : 13,
                          fontWeight: 950,
                          lineHeight: 1.15,
                        }}
                      >
                        Guarantee/support outcomes
                      </div>
                      {privateDecisionPackGuaranteeOutcomePointers.map((pointer) => (
                        <div
                          key={pointer.key || pointer.label}
                          style={{
                            color: "#526579",
                            fontSize: isCompact ? 10 : 11,
                            fontWeight: 800,
                            lineHeight: 1.28,
                          }}
                        >
                          <strong>{pointer.label}:</strong> {pointer.value || pointer.decisionUse}
                        </div>
                      ))}
                      {decisionPackEvidenceExtract?.guaranteeOutcomeBoundaryNote ? (
                        <div
                          style={{
                            color: "#8A6500",
                            fontSize: isCompact ? 9.5 : 10.5,
                            fontWeight: 850,
                            lineHeight: 1.28,
                          }}
                        >
                          {decisionPackEvidenceExtract.guaranteeOutcomeBoundaryNote}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {privateDecisionPackFulfillmentOutcomePointers.length ? (
                    <div
                      data-gsn-holder-decision-pack-fulfillment-outcome-pointers="true"
                      style={{
                        border: "1px solid rgba(37,78,119,0.10)",
                        borderRadius: 12,
                        background: "#FFFFFF",
                        padding: "8px 9px",
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          color: "#07172C",
                          fontSize: isCompact ? 12 : 13,
                          fontWeight: 950,
                          lineHeight: 1.15,
                        }}
                      >
                        Fulfilment/correction outcomes
                      </div>
                      {privateDecisionPackFulfillmentOutcomePointers.map((pointer) => (
                        <div
                          key={pointer.key || pointer.label}
                          style={{
                            color: "#526579",
                            fontSize: isCompact ? 10 : 11,
                            fontWeight: 800,
                            lineHeight: 1.28,
                          }}
                        >
                          <strong>{pointer.label}:</strong> {pointer.value || pointer.decisionUse}
                        </div>
                      ))}
                      {decisionPackEvidenceExtract?.fulfillmentOutcomeBoundaryNote ? (
                        <div
                          style={{
                            color: "#8A6500",
                            fontSize: isCompact ? 9.5 : 10.5,
                            fontWeight: 850,
                            lineHeight: 1.28,
                          }}
                        >
                          {decisionPackEvidenceExtract.fulfillmentOutcomeBoundaryNote}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {privateDecisionPackCompletedWorkPointers.length ? (
                    <div
                      data-gsn-holder-decision-pack-completed-work-pointers="true"
                      style={{
                        border: "1px solid rgba(37,78,119,0.10)",
                        borderRadius: 12,
                        background: "#FFFFFF",
                        padding: "8px 9px",
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          color: "#07172C",
                          fontSize: isCompact ? 12 : 13,
                          fontWeight: 950,
                          lineHeight: 1.15,
                        }}
                      >
                        Completed work/customer confirmation
                      </div>
                      {privateDecisionPackCompletedWorkPointers.map((pointer) => (
                        <div
                          key={pointer.key || pointer.label}
                          style={{
                            color: "#526579",
                            fontSize: isCompact ? 10 : 11,
                            fontWeight: 800,
                            lineHeight: 1.28,
                          }}
                        >
                          <strong>{pointer.label}:</strong> {pointer.value || pointer.decisionUse}
                        </div>
                      ))}
                      {decisionPackEvidenceExtract?.completedWorkBoundaryNote ? (
                        <div
                          style={{
                            color: "#8A6500",
                            fontSize: isCompact ? 9.5 : 10.5,
                            fontWeight: 850,
                            lineHeight: 1.28,
                          }}
                        >
                          {decisionPackEvidenceExtract.completedWorkBoundaryNote}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {privateDecisionPackDemandRequestOutcomePointers.length ? (
                    <div
                      data-gsn-holder-decision-pack-demand-request-outcome-pointers="true"
                      style={{
                        border: "1px solid rgba(37,78,119,0.10)",
                        borderRadius: 12,
                        background: "#FFFFFF",
                        padding: "8px 9px",
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          color: "#07172C",
                          fontSize: isCompact ? 12 : 13,
                          fontWeight: 950,
                          lineHeight: 1.15,
                        }}
                      >
                        Demand Box request outcomes
                      </div>
                      {privateDecisionPackDemandRequestOutcomePointers.map((pointer) => (
                        <div
                          key={pointer.key || pointer.label}
                          style={{
                            color: "#526579",
                            fontSize: isCompact ? 10 : 11,
                            fontWeight: 800,
                            lineHeight: 1.28,
                          }}
                        >
                          <strong>{pointer.label}:</strong> {pointer.value || pointer.decisionUse}
                        </div>
                      ))}
                      {decisionPackEvidenceExtract?.demandRequestOutcomeBoundaryNote ? (
                        <div
                          style={{
                            color: "#8A6500",
                            fontSize: isCompact ? 9.5 : 10.5,
                            fontWeight: 850,
                            lineHeight: 1.28,
                          }}
                        >
                          {decisionPackEvidenceExtract.demandRequestOutcomeBoundaryNote}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {privateDecisionPackConfirmationPointers.length ? (
                    <div
                      data-gsn-holder-decision-pack-confirmation-pointers="true"
                      style={{
                        border: "1px solid rgba(37,78,119,0.10)",
                        borderRadius: 12,
                        background: "#FFFFFF",
                        padding: "8px 9px",
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          color: "#07172C",
                          fontSize: isCompact ? 12 : 13,
                          fontWeight: 950,
                          lineHeight: 1.15,
                        }}
                      >
                        Community witness outcomes
                      </div>
                      {privateDecisionPackConfirmationPointers.map((pointer) => (
                        <div
                          key={pointer.key || pointer.label}
                          style={{
                            color: "#526579",
                            fontSize: isCompact ? 10 : 11,
                            fontWeight: 800,
                            lineHeight: 1.28,
                          }}
                        >
                          <strong>{pointer.label}:</strong> {pointer.value || pointer.decisionUse}
                        </div>
                      ))}
                      {decisionPackEvidenceExtract?.confirmationPointerBoundaryNote ? (
                        <div
                          style={{
                            color: "#8A6500",
                            fontSize: isCompact ? 9.5 : 10.5,
                            fontWeight: 850,
                            lineHeight: 1.28,
                          }}
                        >
                          {decisionPackEvidenceExtract.confirmationPointerBoundaryNote}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {privateDecisionPackIssueResolutionPointers.length ? (
                    <div
                      data-gsn-holder-decision-pack-issue-resolution-pointers="true"
                      style={{
                        border: "1px solid rgba(37,78,119,0.10)",
                        borderRadius: 12,
                        background: "#FFFFFF",
                        padding: "8px 9px",
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          color: "#07172C",
                          fontSize: isCompact ? 12 : 13,
                          fontWeight: 950,
                          lineHeight: 1.15,
                        }}
                      >
                        Issue resolution pointers
                      </div>
                      {privateDecisionPackIssueResolutionPointers.map((pointer) => (
                        <div
                          key={pointer.key || pointer.label}
                          style={{
                            color: "#526579",
                            fontSize: isCompact ? 10 : 11,
                            fontWeight: 800,
                            lineHeight: 1.28,
                          }}
                        >
                          <strong>{pointer.label}:</strong> {pointer.value || pointer.decisionUse}
                        </div>
                      ))}
                      {decisionPackEvidenceExtract?.issueResolutionBoundaryNote ? (
                        <div
                          style={{
                            color: "#8A6500",
                            fontSize: isCompact ? 9.5 : 10.5,
                            fontWeight: 850,
                            lineHeight: 1.28,
                          }}
                        >
                          {decisionPackEvidenceExtract.issueResolutionBoundaryNote}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {privateDecisionPackEvidenceCategories.map((category) => (
                    <div
                      key={category.key || category.label}
                      style={{
                        display: "grid",
                        gap: 5,
                        borderTop: "1px solid rgba(37,78,119,0.08)",
                        paddingTop: 7,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(0, 1fr) auto",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            color: "#07172C",
                            fontSize: isCompact ? 12 : 13,
                            fontWeight: 950,
                            lineHeight: 1.15,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {category.label}
                        </div>
                        <span style={{ ...badge(category.evidenceCount > 0), fontSize: isCompact ? 10 : 11 }}>
                          {category.evidenceCount} event{category.evidenceCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div
                        style={{
                          color: "#526579",
                          fontSize: isCompact ? 10 : 11,
                          fontWeight: 800,
                          lineHeight: 1.28,
                        }}
                      >
                        Latest: {safeDateTime(category.latestAt) || "Not recorded"}
                        {category.eventRefs[0]?.label ? ` | Sample: ${category.eventRefs[0].label}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    color: "#526579",
                    fontSize: isCompact ? 11 : 12,
                    fontWeight: 850,
                    lineHeight: 1.35,
                  }}
                >
                  No private TrustEvent categories are ready for this pack yet.
                </div>
              )}


              {selectedPurposeKey === "housing_decision" ? (
                <div
                  data-gsn-housing-external-contact-handoff="holder"
                  style={{
                    border: "1px solid rgba(37,78,119,0.12)",
                    borderRadius: 14,
                    background: "#FFFFFF",
                    padding: isCompact ? "9px 10px" : "10px 12px",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ ...sectionLabel(), fontSize: isCompact ? 9 : 10 }}>
                      Optional external contact
                    </div>
                    <div
                      style={{
                        marginTop: 2,
                        color: "#07172C",
                        fontSize: isCompact ? 12 : 13,
                        fontWeight: 950,
                        lineHeight: 1.2,
                      }}
                    >
                      Holder-supplied follow-up only
                    </div>
                    <div
                      style={{
                        marginTop: 3,
                        color: "#526579",
                        fontSize: isCompact ? 10 : 11,
                        fontWeight: 800,
                        lineHeight: 1.3,
                      }}
                    >
                      Use this only when the holder decides it is safe to share a landlord, letting agent, or tenancy-office contact. GSN does not verify, require, publish, or store it in the consent ledger.
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) 140px minmax(0, 1fr)",
                      gap: 7,
                    }}
                  >
                    <input
                      aria-label="External contact label"
                      value={housingExternalContactLabel}
                      onChange={(event) => setHousingExternalContactLabel(event.target.value)}
                      placeholder="Landlord, agent, tenancy office"
                      style={{
                        width: "100%",
                        minHeight: 44,
                        borderRadius: 12,
                        border: "1px solid rgba(37,78,119,0.18)",
                        background: "#FFFDF7",
                        color: "#07172C",
                        fontSize: 16,
                        fontWeight: 850,
                        padding: "0 11px",
                      }}
                    />
                    <select
                      aria-label="External contact channel"
                      value={housingExternalContactChannel}
                      onChange={(event) => setHousingExternalContactChannel(event.target.value)}
                      style={{
                        width: "100%",
                        minHeight: 44,
                        borderRadius: 12,
                        border: "1px solid rgba(37,78,119,0.18)",
                        background: "#FFFDF7",
                        color: "#07172C",
                        fontSize: 16,
                        fontWeight: 900,
                        padding: "0 10px",
                      }}
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="phone">Phone</option>
                      <option value="email">Email</option>
                      <option value="other">Other</option>
                    </select>
                    <input
                      aria-label="External contact value"
                      value={housingExternalContactValue}
                      onChange={(event) => setHousingExternalContactValue(event.target.value)}
                      placeholder="Number, email, or contact"
                      style={{
                        width: "100%",
                        minHeight: 44,
                        borderRadius: 12,
                        border: "1px solid rgba(37,78,119,0.18)",
                        background: "#FFFDF7",
                        color: "#07172C",
                        fontSize: 16,
                        fontWeight: 850,
                        padding: "0 11px",
                      }}
                    />
                  </div>
                </div>
              ) : null}

              <CardActionRow data-gsn-decision-pack-consent-export="holder">
                <SecondaryButton
                  onClick={copyDecisionPackConsentSummary}
                  disabled={!privateDecisionPackEvidenceAvailable || decisionPackEvidenceLoading}
                  stableHeight={isCompact ? 50 : 48}
                  minWidth={isCompact ? undefined : 176}
                  debugId="trust-slip.private-decision-pack.copy-summary"
                  style={{ fontSize: isCompact ? 11 : 12 }}
                >
                  Copy consent summary
                </SecondaryButton>
                <SubtleButton
                  onClick={copyDecisionPackConsentJson}
                  disabled={!privateDecisionPackEvidenceAvailable || decisionPackEvidenceLoading}
                  stableHeight={isCompact ? 50 : 48}
                  minWidth={isCompact ? undefined : 154}
                  debugId="trust-slip.private-decision-pack.copy-json"
                  style={{ fontSize: isCompact ? 11 : 12 }}
                >
                  Copy safe JSON
                </SubtleButton>
              </CardActionRow>

              <div
                data-gsn-decision-pack-consent-share-ledger="holder"
                style={{
                  borderTop: "1px solid rgba(214,170,69,0.22)",
                  paddingTop: 9,
                  display: "grid",
                  gap: 7,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ ...sectionLabel(), fontSize: isCompact ? 9 : 10 }}>
                      Recent consent exports
                    </div>
                    <div
                      style={{
                        marginTop: 2,
                        color: "#07172C",
                        fontSize: isCompact ? 12 : 13,
                        fontWeight: 950,
                        lineHeight: 1.16,
                      }}
                    >
                      Holder copy/export audit trail
                    </div>
                  </div>
                  <span style={{ ...badge(Boolean(decisionPackConsentShares.length)), fontSize: isCompact ? 10 : 11 }}>
                    {decisionPackConsentShares.length} saved
                  </span>
                </div>

                {decisionPackConsentShares.length ? (
                  <div style={{ display: "grid", gap: 6 }}>
                    {decisionPackConsentShares.slice(0, 3).map((share) => (
                      <div
                        key={share.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: isCompact
                            ? "minmax(0, 1fr)"
                            : "minmax(0, 1fr) minmax(122px, auto)",
                          gap: 6,
                          alignItems: "center",
                          borderTop: "1px solid rgba(37,78,119,0.08)",
                          paddingTop: 7,
                          minWidth: 0,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              color: "#07172C",
                              fontSize: isCompact ? 11 : 12,
                              fontWeight: 950,
                              lineHeight: 1.15,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {share.accessPurpose}
                          </div>
                          <div
                            style={{
                              marginTop: 2,
                              color: "#526579",
                              fontSize: isCompact ? 10 : 11,
                              fontWeight: 800,
                              lineHeight: 1.25,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {share.exportFormat || "summary"} | {share.categoryCount} categor{share.categoryCount === 1 ? "y" : "ies"} | {share.eventRefCount} safe refs
                          </div>
                        </div>
                        <div
                          style={{
                            color: "#39526C",
                            fontSize: isCompact ? 10 : 11,
                            fontWeight: 900,
                            textAlign: isCompact ? "left" : "right",
                            lineHeight: 1.2,
                          }}
                        >
                          {safeDateTime(share.createdAt) || "Time not shown"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      color: "#526579",
                      fontSize: isCompact ? 11 : 12,
                      fontWeight: 850,
                      lineHeight: 1.35,
                    }}
                  >
                    No private Decision Pack exports are recorded yet.
                  </div>
                )}

                <div
                  style={{
                    color: "#7A4A00",
                    fontSize: isCompact ? 10 : 11,
                    fontWeight: 900,
                    lineHeight: 1.35,
                  }}
                >
                  Consent-share history records holder copy/export markers only. It is not public-read evidence, recipient identity, copied text, or raw TrustEvent history.
                </div>
              </div>
            </div>
            <div
              data-gsn-decision-pack-access-ledger="holder"
              style={{
                borderRadius: 14,
                border: "1px solid rgba(37,78,119,0.12)",
                background: "linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)",
                padding: isCompact ? 11 : 13,
                display: isCompact && isCollapsed ? "none" : "grid",
                gap: 9,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px minmax(0, 1fr)",
                  gap: 9,
                  alignItems: "center",
                }}
              >
                <GsnLegacyIcon name="document" size={30} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ ...sectionLabel(), fontSize: isCompact ? 9 : 10 }}>
                    Recent public reads
                  </div>
                  <div
                    style={{
                      marginTop: 2,
                      color: "#07172C",
                      fontSize: isCompact ? 13 : 15,
                      fontWeight: 1000,
                      lineHeight: 1.16,
                    }}
                  >
                    Decision Pack access ledger
                  </div>
                </div>
              </div>

              {decisionPackAccesses.length ? (
                <div style={{ display: "grid", gap: 7 }}>
                  {decisionPackAccesses.slice(0, 3).map((access) => (
                    <div
                      key={access.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: isCompact
                          ? "minmax(0, 1fr)"
                          : "minmax(0, 1fr) minmax(120px, auto)",
                        gap: 6,
                        alignItems: "center",
                        borderTop: "1px solid rgba(37,78,119,0.08)",
                        paddingTop: 7,
                        minWidth: 0,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            color: "#07172C",
                            fontSize: isCompact ? 12 : 13,
                            fontWeight: 950,
                            lineHeight: 1.15,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {access.accessPurpose}
                        </div>
                        <div
                          style={{
                            marginTop: 2,
                            color: "#526579",
                            fontSize: isCompact ? 10 : 11,
                            fontWeight: 800,
                            lineHeight: 1.25,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {access.code || "TrustSlip code hidden"} | {access.accessScope || "public decision pack"}
                        </div>
                      </div>
                      <div
                        style={{
                          color: "#39526C",
                          fontSize: isCompact ? 10 : 11,
                          fontWeight: 900,
                          textAlign: isCompact ? "left" : "right",
                          lineHeight: 1.2,
                        }}
                      >
                        {safeDateTime(access.createdAt) || "Time not shown"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    color: "#526579",
                    fontSize: isCompact ? 11 : 12,
                    fontWeight: 850,
                    lineHeight: 1.35,
                  }}
                >
                  No public Decision Pack reads are recorded yet.
                </div>
              )}

              <div
                style={{
                  color: "#7A4A00",
                  fontSize: isCompact ? 10 : 11,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                Access records show public read context only. They are not TrustEvents, behaviour evidence, recipient identity, or private Passport disclosure.
              </div>
            </div>

    </>
  );
}