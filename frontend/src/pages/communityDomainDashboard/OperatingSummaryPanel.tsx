import React from "react";
import { StableButton } from "../../components/StableButton";

type OperatingSummaryTaskKey = "next_action" | "status" | "allowance" | "permissions";
type OperatingSummaryGroupKey = "action" | "reference";
type StateSetter<T> = React.Dispatch<React.SetStateAction<T>>;
type PanelStyleFactory = (onDark?: boolean) => React.CSSProperties;
type StatusStyleFactory = (status: unknown) => React.CSSProperties;

type UnknownRecord = Record<string, unknown>;

const OPERATING_SUMMARY_TASK_OPTIONS: Array<{
  key: OperatingSummaryTaskKey;
  label: string;
  note: string;
}> = [
  {
    key: "next_action",
    label: "Do next",
    note: "Open the next safe live operating area or edit setup deliberately.",
  },
  {
    key: "status",
    label: "Status",
    note: "Review domain, billing, activation, and verification state.",
  },
  {
    key: "allowance",
    label: "Allowance",
    note: "Check package limits without changing paid features.",
  },
  {
    key: "permissions",
    label: "Permissions",
    note: "Review service rules before changing live behaviour.",
  },
];

const OPERATING_SUMMARY_GROUP_OPTIONS: Array<{
  key: OperatingSummaryGroupKey;
  label: string;
  note: string;
  defaultTask: OperatingSummaryTaskKey;
  taskKeys: OperatingSummaryTaskKey[];
}> = [
  {
    key: "action",
    label: "Action",
    note: "Start with the next live move and current status.",
    defaultTask: "next_action",
    taskKeys: ["next_action", "status"],
  },
  {
    key: "reference",
    label: "Reference",
    note: "Use allowance and permissions only when you need context.",
    defaultTask: "allowance",
    taskKeys: ["allowance", "permissions"],
  },
];

export type OperatingSummaryPanelData = {
  activeDomainPermissionFacts: Array<Array<string | number>>;
  activeOperatingSummaryTask: OperatingSummaryTaskKey;
  compactStatus: (value: unknown) => string;
  featurePolicySourceLabel: string;
  helperText: PanelStyleFactory;
  onEditSetupDetails: () => void;
  onOpenLiveLane: () => void;
  operatingSummaryGroupChooserOpen: boolean;
  operatingSummaryNotesOpen: boolean;
  operatingSummaryTaskChooserOpen: boolean;
  operationalLaneLabel: string;
  packageCapacityFacts: Array<Array<string | number>>;
  packageTariffBoundaryText: string;
  sectionLabel: PanelStyleFactory;
  setActiveOperatingSummaryTask: StateSetter<OperatingSummaryTaskKey>;
  setOperatingSummaryGroupChooserOpen: StateSetter<boolean>;
  setOperatingSummaryNotesOpen: StateSetter<boolean>;
  setOperatingSummaryTaskChooserOpen: StateSetter<boolean>;
  softCard: PanelStyleFactory;
  status: UnknownRecord;
  statusBadge: StatusStyleFactory;
};

type Props = {
  data: OperatingSummaryPanelData;
};

export default function CommunityDomainOperatingSummaryPanel({ data }: Props) {
  const {
    activeDomainPermissionFacts,
    activeOperatingSummaryTask,
    compactStatus,
    featurePolicySourceLabel,
    helperText,
    onEditSetupDetails,
    onOpenLiveLane,
    operatingSummaryGroupChooserOpen,
    operatingSummaryNotesOpen,
    operatingSummaryTaskChooserOpen,
    operationalLaneLabel,
    packageCapacityFacts,
    packageTariffBoundaryText,
    sectionLabel,
    setActiveOperatingSummaryTask,
    setOperatingSummaryGroupChooserOpen,
    setOperatingSummaryNotesOpen,
    setOperatingSummaryTaskChooserOpen,
    softCard,
    status,
    statusBadge,
  } = data;

  const activeOperatingSummaryGroup: OperatingSummaryGroupKey =
    activeOperatingSummaryTask === "allowance" ||
    activeOperatingSummaryTask === "permissions"
      ? "reference"
      : "action";
  const activeOperatingSummaryGroupOption =
    OPERATING_SUMMARY_GROUP_OPTIONS.find(
      (group) => group.key === activeOperatingSummaryGroup
    ) || OPERATING_SUMMARY_GROUP_OPTIONS[0];
  const activeOperatingSummaryGroupTasks = OPERATING_SUMMARY_TASK_OPTIONS.filter((task) =>
    activeOperatingSummaryGroupOption.taskKeys.includes(task.key)
  );
  const activeOperatingSummaryTaskOption =
    OPERATING_SUMMARY_TASK_OPTIONS.find((task) => task.key === activeOperatingSummaryTask) ||
    OPERATING_SUMMARY_TASK_OPTIONS[0];

  return (
    <div style={{ ...softCard(), display: "grid", gap: 12 }}>
      <div style={sectionLabel()}>Operating summary</div>
      <h3 style={{ margin: 0, fontSize: 22, lineHeight: 1.15 }}>
        Open one active-domain question.
      </h3>
      <div style={{ ...helperText(), fontSize: 14 }}>
        Current live stage: <strong>{activeOperatingSummaryGroupOption.label}</strong>.{" "}
        {activeOperatingSummaryGroupOption.note}
      </div>
      <StableButton
        type="button"
        kind="secondary"
        fullWidth
        stableHeight={42}
        debugId="community-domain-dashboard.operating-summary-group-toggle"
        aria-expanded={operatingSummaryGroupChooserOpen}
        aria-controls="community-domain-operating-summary-groups"
        onClick={() => setOperatingSummaryGroupChooserOpen((current) => !current)}
        style={{
          justifyContent: "center",
          fontSize: 13,
          textTransform: "none",
        }}
      >
        {operatingSummaryGroupChooserOpen ? "Close live stages" : "Change live stage"}
      </StableButton>
      {operatingSummaryGroupChooserOpen ? (
        <div
          id="community-domain-operating-summary-groups"
          data-debug-id="community-domain-dashboard.operating-summary-group-panel"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 132px), 1fr))",
            gap: 8,
          }}
        >
          {OPERATING_SUMMARY_GROUP_OPTIONS.map((group) => {
            const selected = group.key === activeOperatingSummaryGroup;
            return (
              <StableButton
                key={group.key}
                type="button"
                kind={selected ? "primary" : "secondary"}
                stableHeight={46}
                fullWidth
                aria-pressed={selected}
                title={group.note}
                debugId={`community-domain-dashboard.operating-summary-group.${group.key}`}
                onClick={() => {
                  setActiveOperatingSummaryTask(group.defaultTask);
                  setOperatingSummaryGroupChooserOpen(false);
                  setOperatingSummaryTaskChooserOpen(false);
                  setOperatingSummaryNotesOpen(false);
                }}
              >
                {group.label}
              </StableButton>
            );
          })}
        </div>
      ) : null}
      <div style={{ ...helperText(), fontSize: 13 }}>
        Current question: <strong>{activeOperatingSummaryTaskOption.label}</strong>.{" "}
        {activeOperatingSummaryTaskOption.note}
      </div>
      <StableButton
        type="button"
        kind="secondary"
        fullWidth
        stableHeight={42}
        debugId="community-domain-dashboard.operating-summary-task-toggle"
        aria-expanded={operatingSummaryTaskChooserOpen}
        aria-controls="community-domain-operating-summary-questions"
        onClick={() => setOperatingSummaryTaskChooserOpen((current) => !current)}
        style={{
          justifyContent: "center",
          fontSize: 13,
          textTransform: "none",
        }}
      >
        {operatingSummaryTaskChooserOpen ? "Close questions" : "Change question"}
      </StableButton>
      {operatingSummaryTaskChooserOpen ? (
        <div
          id="community-domain-operating-summary-questions"
          data-debug-id="community-domain-dashboard.operating-summary-task-panel"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 145px), 1fr))",
            gap: 8,
          }}
        >
          {activeOperatingSummaryGroupTasks.map((task) => {
            const selected = task.key === activeOperatingSummaryTask;
            return (
              <StableButton
                key={task.key}
                type="button"
                kind={selected ? "primary" : "secondary"}
                stableHeight={46}
                fullWidth
                aria-pressed={selected}
                title={task.note}
                debugId={`community-domain-dashboard.operating-summary.${task.key}`}
                onClick={() => {
                  setActiveOperatingSummaryTask(task.key);
                  setOperatingSummaryTaskChooserOpen(false);
                  setOperatingSummaryNotesOpen(false);
                }}
              >
                {task.label}
              </StableButton>
            );
          })}
        </div>
      ) : null}

      {activeOperatingSummaryTask === "next_action" ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
              gap: 8,
            }}
          >
            <StableButton
              type="button"
              kind="primary"
              debugId="community-domain-dashboard.settings-open-live-lane"
              onClick={onOpenLiveLane}
            >
              Open {operationalLaneLabel}
            </StableButton>
            <StableButton
              type="button"
              kind="secondary"
              debugId="community-domain-dashboard.settings-edit-setup-details"
              onClick={onEditSetupDetails}
            >
              Edit setup details
            </StableButton>
          </div>
          <StableButton
            type="button"
            kind="secondary"
            fullWidth
            stableHeight={42}
            debugId="community-domain-dashboard.operating-summary-notes-toggle"
            aria-expanded={operatingSummaryNotesOpen}
            aria-controls="community-domain-operating-summary-notes"
            onClick={() => setOperatingSummaryNotesOpen((current) => !current)}
            style={{ fontSize: 13 }}
          >
            {operatingSummaryNotesOpen ? "Close notes" : "Open notes"}
          </StableButton>
          {operatingSummaryNotesOpen ? (
            <div
              id="community-domain-operating-summary-notes"
              data-debug-id="community-domain-dashboard.operating-summary-notes-panel"
              style={{ display: "grid", gap: 7 }}
            >
              <div style={{ ...helperText(), fontSize: 14 }}>
                Pillar-style Community Domains should use live operating areas first after
                activation. Use setup only when you need to correct saved details, add
                authority evidence, or prepare verification.
              </div>
              <div style={{ ...helperText(), fontSize: 13 }}>
                Rule: active does not mean verified. Verification still needs authority
                evidence and review; tariff upgrades, member bands, and paid feature
                changes still need manual capacity/finance handling.
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {activeOperatingSummaryTask === "status" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
            gap: 8,
          }}
        >
          <div style={statusBadge(status.domain_status)}>
            Domain: {compactStatus(status.domain_status)}
          </div>
          <div style={statusBadge(status.billing_status)}>
            Billing: {compactStatus(status.billing_status)}
          </div>
          <div style={statusBadge(status.activation_status)}>
            Activation: {compactStatus(status.activation_status)}
          </div>
          <div style={statusBadge(status.verification_status)}>
            Verification: {compactStatus(status.verification_status)}
          </div>
        </div>
      ) : null}

      {activeOperatingSummaryTask === "allowance" ? (
        <div
          style={{
            display: "grid",
            gap: 8,
            padding: 12,
            borderRadius: 18,
            border: "1px solid rgba(214,170,69,0.28)",
            background: "rgba(255,249,225,0.68)",
          }}
        >
          <div style={sectionLabel()}>Package allowance</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 118px), 1fr))",
              gap: 8,
            }}
          >
            {packageCapacityFacts.map(([label, value]) => (
              <div key={label} style={statusBadge("included")}>
                {label}: {value}
              </div>
            ))}
          </div>
          <div style={{ ...helperText(), fontSize: 13 }}>
            {packageTariffBoundaryText}
          </div>
          <div style={{ ...helperText(), fontSize: 12.5 }}>
            Summary only. This does not add members, sell extra bands, grant paid
            features, confirm payment, or verify the organisation.
          </div>
        </div>
      ) : null}

      {activeOperatingSummaryTask === "permissions" ? (
        <div
          style={{
            display: "grid",
            gap: 8,
            padding: 12,
            borderRadius: 18,
            border: "1px solid rgba(9,27,46,0.10)",
            background: "rgba(255,255,255,0.72)",
          }}
        >
          <div style={sectionLabel()}>Domain permissions</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 118px), 1fr))",
              gap: 8,
            }}
          >
            {activeDomainPermissionFacts.map(([label, value]) => (
              <div key={label} style={statusBadge("feature policy")}>
                {label}: {value}
              </div>
            ))}
          </div>
          <div style={{ ...helperText(), fontSize: 12.5 }}>
            Source: {featurePolicySourceLabel}. This summary only explains the current
            policy; change live behaviour through Edit setup details.
          </div>
        </div>
      ) : null}
    </div>
  );
}
