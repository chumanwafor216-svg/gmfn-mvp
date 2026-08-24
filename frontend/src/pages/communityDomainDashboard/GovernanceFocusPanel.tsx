import React, { lazy, Suspense, useMemo } from "react";
import { GsnRealisticIcon } from "../../components/GsnRealisticIcon";
import { StableButton } from "../../components/StableButton";
import type { RealLifeRecordPanelData } from "./RealLifeRecordPanel";

const CommunityDomainGovernanceReadinessPanels = lazy(
  () => import("./GovernanceReadinessPanels")
);
const CommunityDomainPeriodSponsorSummaryPanels = lazy(
  () => import("./PeriodSponsorSummaryPanels")
);
const CommunityDomainRealLifeRecordPanel = lazy(() => import("./RealLifeRecordPanel"));
const CommunityDomainAccessRequestsPanel = lazy(() => import("./AccessRequestsPanel"));

export type GovernanceTaskKey =
  | "readiness"
  | "director_summary"
  | "sponsor_summary"
  | "real_life_record"
  | "access_requests";
export type GovernanceTaskGroupKey = "readiness" | "reports" | "records";
export type DirectorSummaryTaskKey = "overview" | "membership" | "evidence" | "delivery";
export type SponsorSummaryTaskKey = "overview" | "evidence" | "delivery" | "export";

type StateSetter<T> = React.Dispatch<React.SetStateAction<T>>;
type SummaryOption<Key extends string> = {
  key: Key;
  label: string;
  note: string;
};
type UnknownRecord = Record<string, unknown>;
type GovernanceReadinessPanelProps = React.ComponentProps<
  typeof CommunityDomainGovernanceReadinessPanels
>;
type AccessRequestsPanelProps = React.ComponentProps<typeof CommunityDomainAccessRequestsPanel>;

export const GOVERNANCE_TASK_OPTIONS: Array<SummaryOption<GovernanceTaskKey>> = [
  {
    key: "readiness",
    label: "Readiness",
    note: "Review governance blockers, approvals, and setup health.",
  },
  {
    key: "director_summary",
    label: "Director summary",
    note: "Review owner/admin governance counts and action status.",
  },
  {
    key: "sponsor_summary",
    label: "Sponsor report",
    note: "Review sponsor-safe evidence, delivery, and export material.",
  },
  {
    key: "real_life_record",
    label: "Record real life",
    note: "Capture activity or beneficiary outcome evidence.",
  },
  {
    key: "access_requests",
    label: "Access requests",
    note: "Review pending membership and access decisions.",
  },
];

const GOVERNANCE_TASK_GROUP_OPTIONS: Array<{
  key: GovernanceTaskGroupKey;
  label: string;
  note: string;
  defaultTask: GovernanceTaskKey;
  taskKeys: GovernanceTaskKey[];
}> = [
  {
    key: "readiness",
    label: "Readiness",
    note: "Governance health and setup blockers.",
    defaultTask: "readiness",
    taskKeys: ["readiness"],
  },
  {
    key: "reports",
    label: "Reports",
    note: "Director and sponsor-safe reporting.",
    defaultTask: "director_summary",
    taskKeys: ["director_summary", "sponsor_summary"],
  },
  {
    key: "records",
    label: "Records",
    note: "Real-life evidence capture and access requests.",
    defaultTask: "real_life_record",
    taskKeys: ["real_life_record", "access_requests"],
  },
];

export const DIRECTOR_SUMMARY_TASK_OPTIONS: Array<
  SummaryOption<DirectorSummaryTaskKey>
> = [
  {
    key: "overview",
    label: "Overview",
    note: "Read the period rule before using the report.",
  },
  {
    key: "membership",
    label: "Membership",
    note: "Review active, added, removed, and governance action counts.",
  },
  {
    key: "evidence",
    label: "Evidence",
    note: "Review evidence and confirmation totals already recorded.",
  },
  {
    key: "delivery",
    label: "Delivery",
    note: "Review beneficiary confirmation delivery and receipt counts.",
  },
];

export const SPONSOR_SUMMARY_TASK_OPTIONS: Array<SummaryOption<SponsorSummaryTaskKey>> = [
  {
    key: "overview",
    label: "Overview",
    note: "Read the sponsor-safe rule first.",
  },
  {
    key: "evidence",
    label: "Evidence",
    note: "Review sponsor-safe evidence and outcome totals.",
  },
  {
    key: "delivery",
    label: "Delivery",
    note: "Review provider delivery readiness and receipts.",
  },
  {
    key: "export",
    label: "Export",
    note: "Prepare sponsor-safe text for copying.",
  },
];

type GovernanceFocusPanelData = {
  isAdmin: boolean;
  activeGovernanceTask: GovernanceTaskKey;
  activeDirectorSummaryTask: DirectorSummaryTaskKey;
  activeSponsorSummaryTask: SponsorSummaryTaskKey;
  governanceGroupChooserOpen: boolean;
  governanceTaskChooserOpen: boolean;
  directorSummaryTaskChooserOpen: boolean;
  sponsorSummaryTaskChooserOpen: boolean;
  governanceReadinessProps: GovernanceReadinessPanelProps;
  periodSummary: UnknownRecord | null;
  sponsorSummary: UnknownRecord | null;
  busySponsorExportCopy: boolean;
  copySponsorExportPack: () => void | Promise<void>;
  setActiveDirectorSummaryTask: StateSetter<DirectorSummaryTaskKey>;
  setActiveSponsorSummaryTask: StateSetter<SponsorSummaryTaskKey>;
  setDirectorSummaryTaskChooserOpen: StateSetter<boolean>;
  setSponsorSummaryTaskChooserOpen: StateSetter<boolean>;
  setGovernanceGroupChooserOpen: StateSetter<boolean>;
  setGovernanceTaskChooserOpen: StateSetter<boolean>;
  selectGovernanceTask: (task: GovernanceTaskKey) => void;
  realLifeRecordData: RealLifeRecordPanelData;
  accessRequestsPanelProps: AccessRequestsPanelProps;
};

type GovernanceFocusPanelProps = {
  data: GovernanceFocusPanelData;
};

function softCard(): React.CSSProperties {
  return {
    borderRadius: 18,
    background:
      "linear-gradient(180deg, rgba(248,251,255,0.995) 0%, rgba(236,243,250,0.985) 100%)",
    border: "1px solid rgba(9,27,46,0.12)",
    boxShadow: "0 14px 30px rgba(7,20,36,0.055)",
    padding: 14,
    color: "#091B2E",
  };
}

function iconFrame(size = 48): React.CSSProperties {
  return {
    width: size,
    height: size,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    background: "#FFFFFF",
    border: "1px solid rgba(9,27,46,0.10)",
    boxShadow: "0 8px 20px rgba(9,27,46,0.08)",
    flex: "0 0 auto",
  };
}

function iconHeaderStyle(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    gap: 12,
    alignItems: "center",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    color: "#07172C",
    fontSize: 11,
    lineHeight: 1.1,
    fontWeight: 900,
    letterSpacing: 0,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "rgba(9,27,46,0.70)",
    fontSize: 14,
    lineHeight: 1.45,
  };
}

export default function GovernanceFocusPanel({ data }: GovernanceFocusPanelProps) {
  const activeGovernanceTaskGroup = useMemo<GovernanceTaskGroupKey>(() => {
    if (
      data.activeGovernanceTask === "director_summary" ||
      data.activeGovernanceTask === "sponsor_summary"
    ) {
      return "reports";
    }
    if (
      data.activeGovernanceTask === "real_life_record" ||
      data.activeGovernanceTask === "access_requests"
    ) {
      return "records";
    }
    return "readiness";
  }, [data.activeGovernanceTask]);
  const activeGovernanceTaskGroupOption =
    GOVERNANCE_TASK_GROUP_OPTIONS.find((group) => group.key === activeGovernanceTaskGroup) ||
    GOVERNANCE_TASK_GROUP_OPTIONS[0];
  const activeGovernanceTaskOption =
    GOVERNANCE_TASK_OPTIONS.find((task) => task.key === data.activeGovernanceTask) ||
    GOVERNANCE_TASK_OPTIONS[0];
  const activeGovernanceGroupTasks = GOVERNANCE_TASK_OPTIONS.filter((task) =>
    activeGovernanceTaskGroupOption.taskKeys.includes(task.key)
  );
  const activeDirectorSummaryTaskOption =
    DIRECTOR_SUMMARY_TASK_OPTIONS.find(
      (task) => task.key === data.activeDirectorSummaryTask
    ) || DIRECTOR_SUMMARY_TASK_OPTIONS[0];
  const activeSponsorSummaryTaskOption =
    SPONSOR_SUMMARY_TASK_OPTIONS.find(
      (task) => task.key === data.activeSponsorSummaryTask
    ) || SPONSOR_SUMMARY_TASK_OPTIONS[0];

  return (
    <>
      {data.isAdmin ? (
        <div
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
              <div style={sectionLabel()}>Governance jobs</div>
              <h3
                style={{
                  margin: "3px 0 0",
                  fontSize: 20,
                  lineHeight: 1.16,
                }}
              >
                Choose the governance stage first.
              </h3>
              <div style={{ ...helperText(), marginTop: 6 }}>
                Readiness, reports, and records stay separate so the surface does
                not dump every control at once.
              </div>
            </div>
          </div>
          <div style={{ ...helperText(), fontSize: 13 }}>
            Current governance stage:{" "}
            <strong>{activeGovernanceTaskGroupOption.label}</strong>.{" "}
            {activeGovernanceTaskGroupOption.note}
          </div>
          <StableButton
            type="button"
            kind="secondary"
            fullWidth
            stableHeight={42}
            debugId="community-domain-dashboard.governance-group-toggle"
            aria-expanded={data.governanceGroupChooserOpen}
            aria-controls="community-domain-governance-stages"
            onClick={() =>
              data.setGovernanceGroupChooserOpen((current) => !current)
            }
            style={{
              justifyContent: "center",
              fontSize: 13,
              textTransform: "none",
            }}
          >
            {data.governanceGroupChooserOpen
              ? "Close governance stages"
              : "Change governance stage"}
          </StableButton>
          {data.governanceGroupChooserOpen ? (
            <div
              id="community-domain-governance-stages"
              data-debug-id="community-domain-dashboard.governance-group-panel"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                gap: 8,
              }}
            >
              {GOVERNANCE_TASK_GROUP_OPTIONS.map((group) => (
                <StableButton
                  key={group.key}
                  type="button"
                  kind={
                    activeGovernanceTaskGroup === group.key ? "primary" : "secondary"
                  }
                  stableHeight={46}
                  debugId={`community-domain-dashboard.governance-group.${group.key}`}
                  onClick={() => data.selectGovernanceTask(group.defaultTask)}
                >
                  {group.label}
                </StableButton>
              ))}
            </div>
          ) : null}
          {activeGovernanceGroupTasks.length > 1 ? (
            <div
              style={{
                borderTop: "1px solid rgba(9,27,46,0.08)",
                paddingTop: 10,
                display: "grid",
                gap: 8,
              }}
            >
              <StableButton
                type="button"
                kind="secondary"
                fullWidth
                stableHeight={42}
                debugId="community-domain-dashboard.governance-task-toggle"
                aria-expanded={data.governanceTaskChooserOpen}
                aria-controls="community-domain-governance-jobs"
                onClick={() =>
                  data.setGovernanceTaskChooserOpen((current) => !current)
                }
                style={{
                  justifyContent: "center",
                  fontSize: 13,
                  textTransform: "none",
                }}
              >
                {data.governanceTaskChooserOpen ? "Close jobs" : "Change job"}
              </StableButton>
              {data.governanceTaskChooserOpen ? (
                <div
                  id="community-domain-governance-jobs"
                  data-debug-id="community-domain-dashboard.governance-task-panel"
                  style={{
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={sectionLabel()}>
                    {activeGovernanceTaskGroupOption.label} jobs
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                      gap: 8,
                    }}
                  >
                    {activeGovernanceGroupTasks.map((task) => (
                      <StableButton
                        key={task.key}
                        type="button"
                        kind={
                          data.activeGovernanceTask === task.key
                            ? "primary"
                            : "secondary"
                        }
                        stableHeight={42}
                        debugId={`community-domain-dashboard.governance-task.${task.key}`}
                        onClick={() => data.selectGovernanceTask(task.key)}
                      >
                        {task.label}
                      </StableButton>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          <div style={{ ...helperText(), fontSize: 13 }}>
            {activeGovernanceTaskOption.note}
          </div>
        </div>
      ) : null}

      {data.activeGovernanceTask === "readiness" || !data.isAdmin ? (
        <Suspense
          fallback={
            <div style={{ ...helperText(), marginTop: 4 }}>
              Loading governance readiness panels...
            </div>
          }
        >
          <CommunityDomainGovernanceReadinessPanels
            {...data.governanceReadinessProps}
          />
        </Suspense>
      ) : null}

      {data.isAdmin &&
      (data.activeGovernanceTask === "director_summary" ||
        data.activeGovernanceTask === "sponsor_summary") ? (
        <Suspense
          fallback={
            <div style={{ ...softCard(), display: "grid", gap: 8 }}>
              <div style={sectionLabel()}>
                {data.activeGovernanceTask === "director_summary"
                  ? "Director period summary"
                  : "Sponsor-safe summary"}
              </div>
              <div style={{ ...helperText(), marginTop: 2 }}>
                Loading governance report controls...
              </div>
            </div>
          }
        >
          <CommunityDomainPeriodSponsorSummaryPanels
            data={{
              activeGovernanceTask: data.activeGovernanceTask,
              activeDirectorSummaryTask: data.activeDirectorSummaryTask,
              activeDirectorSummaryTaskOption,
              activeSponsorSummaryTask: data.activeSponsorSummaryTask,
              activeSponsorSummaryTaskOption,
              busySponsorExportCopy: data.busySponsorExportCopy,
              copySponsorExportPack: data.copySponsorExportPack,
              directorSummaryTaskChooserOpen: data.directorSummaryTaskChooserOpen,
              DIRECTOR_SUMMARY_TASK_OPTIONS,
              periodSummary: data.periodSummary,
              setActiveDirectorSummaryTask: data.setActiveDirectorSummaryTask,
              setActiveSponsorSummaryTask: data.setActiveSponsorSummaryTask,
              setDirectorSummaryTaskChooserOpen:
                data.setDirectorSummaryTaskChooserOpen,
              setSponsorSummaryTaskChooserOpen: data.setSponsorSummaryTaskChooserOpen,
              sponsorSummary: data.sponsorSummary,
              sponsorSummaryTaskChooserOpen: data.sponsorSummaryTaskChooserOpen,
              SPONSOR_SUMMARY_TASK_OPTIONS,
            }}
          />
        </Suspense>
      ) : null}

      {data.isAdmin && data.activeGovernanceTask === "real_life_record" ? (
        <Suspense
          fallback={
            <div style={{ ...softCard(), display: "grid", gap: 8 }}>
              <div style={sectionLabel()}>Record from real life</div>
              <div style={{ ...helperText(), marginTop: 2 }}>
                Loading record controls...
              </div>
            </div>
          }
        >
          <CommunityDomainRealLifeRecordPanel data={data.realLifeRecordData} />
        </Suspense>
      ) : null}

      {data.isAdmin && data.activeGovernanceTask === "access_requests" ? (
        <Suspense
          fallback={
            <div style={{ ...softCard(), display: "grid", gap: 8 }}>
              <div style={sectionLabel()}>Access requests</div>
              <div style={{ ...helperText(), marginTop: 2 }}>
                Loading access request controls...
              </div>
            </div>
          }
        >
          <CommunityDomainAccessRequestsPanel {...data.accessRequestsPanelProps} />
        </Suspense>
      ) : null}
    </>
  );
}
