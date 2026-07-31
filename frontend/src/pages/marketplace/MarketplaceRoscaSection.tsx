import React, { lazy, Suspense } from "react";

import ExplainToggle from "../../components/ExplainToggle";
import { GsnLegacyIcon, type GsnIconName } from "../../components/GsnLegacyIcon";
import type { PaymentProofExpectedPayment } from "../../components/PaymentProofSubmissionPanel";
import { StableButton } from "../../components/StableButton";
import { marketplaceSectionStyle } from "../../lib/marketplaceActionStability";

const PaymentProofSubmissionPanel = lazy(
  () => import("../../components/PaymentProofSubmissionPanel")
);

type RoscaSelectableMember = {
  userId: number;
  name: string;
  gmfnId: string;
  role: string;
};

type RoscaRoundSummary = {
  round_number?: number | null;
  ready_for_payout?: boolean | null;
  payout_recorded?: boolean | null;
};

type RoscaCycleSummary = {
  cycle_id?: string | null;
  title?: string | null;
  interval_days?: number | null;
  member_user_ids?: number[] | null;
  total_confirmed_contributions?: number | string | null;
  total_expected_contributions?: number | string | null;
  total_recorded_payouts?: number | string | null;
  total_rounds?: number | string | null;
  rounds?: RoscaRoundSummary[];
};

type RoscaPackageStatus = {
  message?: string | null;
};

type MarketplaceActionKind = "primary" | "secondary" | "soft";

type MarketplaceRoscaSectionProps = {
  isCompact: boolean;
  isOpen: boolean;
  sectionRef: React.RefObject<HTMLElement | null>;
  roscaCyclesFeatureOff: boolean;
  roscaCyclesFeatureOffText: string;
  roscaYearlyActive: boolean;
  roscaTitle: string;
  roscaContributionAmount: string;
  roscaCurrency: string;
  roscaIntervalDays: string;
  selectedRoscaMemberIds: number[];
  selectedRoscaMemberSet: Set<number>;
  selectedRoscaMembers: RoscaSelectableMember[];
  roscaSelectableMembers: RoscaSelectableMember[];
  creatingRoscaPackage: boolean;
  startingRoscaCycle: boolean;
  recordingRoscaPayoutKey: string | null;
  latestRoscaCycle: RoscaCycleSummary | null;
  nextRoscaPayoutRound: RoscaRoundSummary | null;
  roscaPackage: RoscaPackageStatus | null;
  latestRoscaPackagePayment: PaymentProofExpectedPayment | null;
  memberCount: number;
  pageCard: (bg?: string) => React.CSSProperties;
  marketplaceOsIconStyle: (bg: string, small?: boolean) => React.CSSProperties;
  badge: (primary?: boolean) => React.CSSProperties;
  marketplaceActionStyle: (
    kind?: MarketplaceActionKind,
    disabled?: boolean
  ) => React.CSSProperties;
  sectionLabel: () => React.CSSProperties;
  helperText: () => React.CSSProperties;
  innerCard: (bg?: string) => React.CSSProperties;
  inputStyle: () => React.CSSProperties;
  marketplaceFieldTouchProps: (debugId: string) => Record<string, unknown>;
  stableStatusPillStyle: (primary?: boolean) => React.CSSProperties;
  marketplaceSurfaceTouchProps: (debugId: string) => Record<string, unknown>;
  marketplaceInlineActionsStyle: (isCompact: boolean) => React.CSSProperties;
  marketplaceInlineActionStyle: (
    kind: MarketplaceActionKind,
    disabled: boolean,
    isCompact: boolean
  ) => React.CSSProperties;
  marketplaceProfileStatStyle: () => React.CSSProperties;
  runMarketplaceAction: (
    event: React.SyntheticEvent<HTMLElement> | undefined,
    action: () => void
  ) => void;
  showNotice: (tone: "success" | "error", message: string) => void;
  setRoscaTitle: React.Dispatch<React.SetStateAction<string>>;
  setRoscaContributionAmount: React.Dispatch<React.SetStateAction<string>>;
  setRoscaCurrency: React.Dispatch<React.SetStateAction<string>>;
  setRoscaIntervalDays: React.Dispatch<React.SetStateAction<string>>;
  setSelectedRoscaMemberIds: React.Dispatch<React.SetStateAction<number[]>>;
  onToggleRosca: (event: React.MouseEvent<HTMLButtonElement>) => void;
  createRoscaYearlyInstruction: () => Promise<void> | void;
  startMarketplaceRoscaCycle: () => Promise<void> | void;
  recordMarketplaceRoscaPayout: (
    cycleId: string,
    roundNumber: number
  ) => Promise<void> | void;
  onUploadedRoscaPackagePayment: (
    payment: PaymentProofExpectedPayment
  ) => void | Promise<void>;
};

type MarketplaceGlyphName = "rosca";

const MARKETPLACE_GLYPH_ICON_MAP = {
  rosca: "repaymentSchedule",
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

function positiveNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export default function MarketplaceRoscaSection({
  isCompact,
  isOpen,
  sectionRef,
  roscaCyclesFeatureOff,
  roscaCyclesFeatureOffText,
  roscaYearlyActive,
  roscaTitle,
  roscaContributionAmount,
  roscaCurrency,
  roscaIntervalDays,
  selectedRoscaMemberIds,
  selectedRoscaMemberSet,
  selectedRoscaMembers,
  roscaSelectableMembers,
  creatingRoscaPackage,
  startingRoscaCycle,
  recordingRoscaPayoutKey,
  latestRoscaCycle,
  nextRoscaPayoutRound,
  roscaPackage,
  latestRoscaPackagePayment,
  memberCount,
  pageCard,
  marketplaceOsIconStyle,
  badge,
  marketplaceActionStyle,
  sectionLabel,
  helperText,
  innerCard,
  inputStyle,
  marketplaceFieldTouchProps,
  stableStatusPillStyle,
  marketplaceSurfaceTouchProps,
  marketplaceInlineActionsStyle,
  marketplaceInlineActionStyle,
  marketplaceProfileStatStyle,
  runMarketplaceAction,
  showNotice,
  setRoscaTitle,
  setRoscaContributionAmount,
  setRoscaCurrency,
  setRoscaIntervalDays,
  setSelectedRoscaMemberIds,
  onToggleRosca,
  createRoscaYearlyInstruction,
  startMarketplaceRoscaCycle,
  recordMarketplaceRoscaPayout,
  onUploadedRoscaPackagePayment,
}: MarketplaceRoscaSectionProps) {
  return (      <section
        id="marketplace-rosca"
        ref={sectionRef}
        style={{
          ...pageCard("#FFFFFF"),
          ...marketplaceSectionStyle(),
          order: 9,
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
                "linear-gradient(180deg, #C9952F 0%, #6D470B 100%)",
                true
              )}
            >
              <MarketplaceGlyph name="rosca" size={26} />
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
                ROSCA
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
                Member savings circle for this community only
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(roscaYearlyActive && !roscaCyclesFeatureOff)}>
              {roscaCyclesFeatureOff
                ? "Turned off"
                : roscaYearlyActive
                ? "Yearly active"
                : "GBP 60 yearly"}
            </span>
            <StableButton
              debugId="marketplace.rosca.toggle"
              type="button"
              onClick={onToggleRosca}
              style={marketplaceActionStyle("soft")}
            >
              {isOpen ? "Collapse" : "Open"}
            </StableButton>
          </div>
        </div>

        <ExplainToggle
          label="What this savings circle does"
          what="ROSCA helps a known group contribute on schedule and take turns receiving the pool."
          why="GSN records the plan, contribution expectations, and payout completion. It does not move external money by itself."
          next="Activate the yearly service first, then start the member cycle when the group is ready."
          tone="light"
          style={{ marginTop: 12 }}
        />

        {roscaCyclesFeatureOff ? (
          <div
            style={{
              marginTop: 12,
              borderRadius: 16,
              border: "1px solid rgba(143,51,51,0.18)",
              background:
                "linear-gradient(180deg, rgba(254,242,242,0.98) 0%, rgba(255,247,247,0.96) 100%)",
              color: "#8A1F1F",
              padding: isCompact ? 12 : 14,
              fontSize: isCompact ? 13 : 14,
              fontWeight: 850,
              lineHeight: 1.35,
            }}
          >
            {roscaCyclesFeatureOffText}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {[
            ["1", "Activate yearly service", "Unlock this community's ROSCA desk."],
            ["2", "Choose members", "Select only the people in this cycle."],
            ["3", "Start cycle", "Set name, amount, currency, and days."],
          ].map(([step, title, detail]) => (
            <div
              key={step}
              style={{
                borderRadius: 18,
                border: "1px solid rgba(184,135,30,0.18)",
                background:
                  "linear-gradient(180deg, rgba(255,252,244,0.98) 0%, rgba(248,241,222,0.94) 100%)",
                padding: isCompact ? 12 : 14,
                overflow: "hidden",
                overflowAnchor: "none",
              }}
            >
              <div style={{ ...sectionLabel(), color: "#8A5A08" }}>
                Step {step}
              </div>
              <div
                style={{
                  marginTop: 6,
                  color: "#08233A",
                  fontSize: isCompact ? 15 : 16,
                  fontWeight: 950,
                  lineHeight: 1.2,
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
                }}
              >
                {detail}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.05fr) minmax(300px, 0.95fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div style={innerCard("#FCFEFF")}>
            <div style={sectionLabel()}>Start cycle</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Build one named cycle at a time. Membership is selected for this
              cycle only; it is not the whole community unless you choose
              everyone.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "repeat(2, minmax(0, 1fr))"
                  : "1.2fr 0.8fr 0.6fr 0.6fr",
                gap: 10,
                alignItems: "end",
              }}
            >
              <label
                style={{
                  display: "block",
                  gridColumn: isCompact ? "1 / -1" : undefined,
                }}
              >
                <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                  Cycle name
                </div>
                <input
                  {...marketplaceFieldTouchProps("marketplace.rosca.title")}
                  value={roscaTitle}
                  onChange={(event) => setRoscaTitle(event.target.value)}
                  style={{ ...inputStyle(), marginTop: 6 }}
                  placeholder="Community ROSCA cycle"
                />
              </label>
              <label style={{ display: "block" }}>
                <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                  Contribution
                </div>
                <input
                  {...marketplaceFieldTouchProps("marketplace.rosca.contribution")}
                  value={roscaContributionAmount}
                  onChange={(event) => setRoscaContributionAmount(event.target.value)}
                  style={{ ...inputStyle(), marginTop: 6 }}
                  inputMode="decimal"
                  placeholder="25.00"
                />
              </label>
              <label style={{ display: "block" }}>
                <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                  Currency
                </div>
                <input
                  {...marketplaceFieldTouchProps("marketplace.rosca.currency")}
                  value={roscaCurrency}
                  onChange={(event) => setRoscaCurrency(event.target.value.toUpperCase())}
                  style={{ ...inputStyle(), marginTop: 6 }}
                  maxLength={8}
                  placeholder="GBP"
                />
              </label>
              <label style={{ display: "block" }}>
                <div style={{ ...helperText(), fontSize: 12, fontWeight: 900 }}>
                  Days
                </div>
                <input
                  {...marketplaceFieldTouchProps("marketplace.rosca.interval-days")}
                  value={roscaIntervalDays}
                  onChange={(event) => setRoscaIntervalDays(event.target.value)}
                  style={{ ...inputStyle(), marginTop: 6 }}
                  inputMode="numeric"
                  placeholder="30"
                />
              </label>
            </div>

            <div
              style={{
                marginTop: 12,
                borderRadius: 16,
                border: "1px solid rgba(16,37,59,0.08)",
                background:
                  "linear-gradient(180deg, rgba(248,252,255,0.98) 0%, rgba(239,246,253,0.96) 100%)",
                padding: isCompact ? 10 : 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div style={sectionLabel()}>Membership</div>
                <span style={stableStatusPillStyle(selectedRoscaMemberIds.length >= 2)}>
                  {selectedRoscaMemberIds.length >= 2
                    ? `${selectedRoscaMemberIds.length} selected`
                    : "Choose 2+"}
                </span>
              </div>
              <div
                style={{
                  marginTop: 7,
                  color: "#41556B",
                  fontSize: isCompact ? 12 : 13,
                  fontWeight: 800,
                  lineHeight: 1.3,
                }}
              >
                Alerts, contribution references, and payout order follow these
                selected cycle members.
              </div>
              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "repeat(2, minmax(0, 1fr))"
                    : "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: 8,
                }}
              >
                {roscaSelectableMembers.length ? (
                  roscaSelectableMembers.map((member) => {
                    const selected = selectedRoscaMemberSet.has(member.userId);
                    return (
                      <label
                        key={member.userId}
                        style={{
                          minHeight: isCompact ? 50 : 56,
                          borderRadius: 14,
                          border: selected
                            ? "1px solid rgba(34,102,65,0.28)"
                            : "1px solid rgba(16,37,59,0.08)",
                          background: selected
                            ? "linear-gradient(180deg, #F1FBF5 0%, #DDEFE6 100%)"
                            : "#FFFFFF",
                          padding: "8px 9px",
                          display: "grid",
                          gridTemplateColumns: "22px minmax(0, 1fr)",
                          gap: 7,
                          alignItems: "center",
                          color: "#08233A",
                          fontWeight: 900,
                          overflow: "hidden",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          {...marketplaceFieldTouchProps(
                            `marketplace.rosca.member.${member.userId}`
                          )}
                          type="checkbox"
                          checked={selected}
                          onChange={(event) => {
                            const checked = event.currentTarget.checked;
                            setSelectedRoscaMemberIds((prev) => {
                              if (checked) {
                                return Array.from(new Set([...prev, member.userId]));
                              }
                              return prev.filter((userId) => userId !== member.userId);
                            });
                          }}
                          style={{
                            width: 18,
                            height: 18,
                            accentColor: "#1D6D46",
                          }}
                        />
                        <span style={{ minWidth: 0 }}>
                          <span
                            style={{
                              display: "block",
                              fontSize: isCompact ? 12 : 13,
                              lineHeight: 1.1,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {member.name}
                          </span>
                          <span
                            style={{
                              display: "block",
                              marginTop: 2,
                              color: "#617085",
                              fontSize: 10.5,
                              fontWeight: 850,
                              lineHeight: 1.1,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {firstTruthy(member.gmfnId, member.role, "member")}
                          </span>
                        </span>
                      </label>
                    );
                  })
                ) : (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      ...helperText(),
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    No visible marketplace members are ready for cycle selection.
                  </div>
                )}
              </div>
            </div>

            <div
              {...marketplaceSurfaceTouchProps("marketplace.rosca.actions")}
              style={{
                ...marketplaceInlineActionsStyle(isCompact),
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "repeat(auto-fit, minmax(168px, 1fr))",
                marginTop: 14,
              }}
            >
              <StableButton
                debugId="marketplace.rosca.activate-yearly"
                type="button"
                onClick={(event) => {
                  runMarketplaceAction(event, () => {
                    if (roscaCyclesFeatureOff) {
                      showNotice("error", roscaCyclesFeatureOffText);
                      return;
                    }
                    if (creatingRoscaPackage) return;
                    void createRoscaYearlyInstruction();
                  });
                }}
                stableHeight={58}
                style={marketplaceInlineActionStyle(
                  roscaYearlyActive ? "secondary" : "primary",
                  creatingRoscaPackage || roscaCyclesFeatureOff,
                  isCompact
                )}
              >
                {creatingRoscaPackage ? "Creating..." : "Activate yearly service"}
              </StableButton>
              <StableButton
                debugId="marketplace.rosca.start-cycle"
                type="button"
                onClick={(event) => {
                  runMarketplaceAction(event, () => {
                    if (roscaCyclesFeatureOff) {
                      showNotice("error", roscaCyclesFeatureOffText);
                      return;
                    }
                    if (startingRoscaCycle) return;
                    if (!roscaYearlyActive) {
                      showNotice(
                        "error",
                        "Activate the GBP 60 yearly ROSCA service before starting a cycle."
                      );
                      return;
                    }
                    void startMarketplaceRoscaCycle();
                  });
                }}
                stableHeight={58}
                style={marketplaceInlineActionStyle(
                  "primary",
                  roscaCyclesFeatureOff ||
                    startingRoscaCycle ||
                    !roscaYearlyActive ||
                    selectedRoscaMemberIds.length < 2,
                  isCompact
                )}
              >
                {startingRoscaCycle ? "Starting..." : "Start ROSCA Cycle"}
              </StableButton>
              <StableButton
                debugId="marketplace.rosca.record-payout"
                type="button"
                onClick={(event) => {
                  runMarketplaceAction(event, () => {
                    if (recordingRoscaPayoutKey) return;
                    if (nextRoscaPayoutRound && latestRoscaCycle?.cycle_id) {
                      void recordMarketplaceRoscaPayout(
                        String(latestRoscaCycle.cycle_id),
                        Number(nextRoscaPayoutRound.round_number || 0)
                      );
                      return;
                    }
                    showNotice(
                      "error",
                      "No ROSCA round is ready for payout recording yet."
                    );
                  });
                }}
                stableHeight={58}
                style={marketplaceInlineActionStyle(
                  "soft",
                  !nextRoscaPayoutRound ||
                    !latestRoscaCycle?.cycle_id ||
                    Boolean(recordingRoscaPayoutKey),
                  isCompact
                )}
              >
                {recordingRoscaPayoutKey ? "Recording..." : "Record payout"}
              </StableButton>
            </div>
          </div>

          <div style={innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)")}>
            <div style={sectionLabel()}>Cycle status</div>
            <div
              style={{
                marginTop: 10,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "repeat(2, minmax(0, 1fr))"
                  : "1fr",
                gap: 9,
              }}
            >
              {[
                ["Service", roscaYearlyActive ? "Yearly service active" : "Inactive"],
                [
                  "Selected now",
                  selectedRoscaMembers.length >= 2
                    ? `${selectedRoscaMembers.length} cycle members`
                    : "Choose 2+ members",
                ],
                [
                  "Latest cycle",
                  latestRoscaCycle
                    ? firstTruthy(latestRoscaCycle.title, "ROSCA cycle")
                    : "No cycle started yet",
                ],
                [
                  "Latest members",
                  latestRoscaCycle?.member_user_ids?.length
                    ? `${latestRoscaCycle.member_user_ids.length} members in cycle`
                    : `${memberCount} visible in marketplace`,
                ],
                [
                  "Frequency",
                  latestRoscaCycle?.interval_days
                    ? `Every ${positiveNumber(latestRoscaCycle.interval_days)} days`
                    : `${positiveNumber(roscaIntervalDays || 30)} days planned`,
                ],
                [
                  "Contributions",
                  latestRoscaCycle
                    ? `${positiveNumber(
                        latestRoscaCycle.total_confirmed_contributions
                      )} / ${positiveNumber(
                        latestRoscaCycle.total_expected_contributions
                      )} confirmed`
                    : "Waiting for first cycle",
                ],
                [
                  "Payouts",
                  latestRoscaCycle
                    ? `${positiveNumber(
                        latestRoscaCycle.total_recorded_payouts
                      )} / ${positiveNumber(latestRoscaCycle.total_rounds)} recorded`
                    : "Waiting for first cycle",
                ],
              ].map(([label, value]) => (
                <div key={label} style={marketplaceProfileStatStyle()}>
                  <div style={sectionLabel()}>{label}</div>
                  <div
                    style={{
                      marginTop: 6,
                      color: "#0B1F33",
                      fontWeight: 950,
                      fontSize: 15,
                      lineHeight: 1.25,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12, ...helperText(), fontSize: 12 }}>
              {roscaPackage?.message ||
                "ROSCA is tied to this selected community marketplace. Members must already belong to the community before they can be included in the cycle."}
            </div>
            {latestRoscaPackagePayment ? (
              <Suspense fallback={null}>
                <PaymentProofSubmissionPanel
                  payment={latestRoscaPackagePayment}
                  title="ROSCA yearly service payment proof"
                  debugIdPrefix="marketplace-rosca-service-proof"
                  onUploaded={onUploadedRoscaPackagePayment}
                />
              </Suspense>
            ) : null}
          </div>
        </div>
      </section>
  );
}