import React, { lazy, Suspense } from "react";
import { GsnRealisticIcon, type Gsn3DIconKey } from "../../components/GsnRealisticIcon";
import { StableButton } from "../../components/StableButton";

const CommunityDomainSetupIntelligenceCards = lazy(
  () => import("./SetupIntelligenceCards")
);

export type SetupOverviewTaskKey = "notices" | "engine" | "next_setup" | "counts";
type SetupOverviewGroupKey = "action" | "reference";
export type SetupNoticeTaskKey = "recent" | "post";
export type DomainFeaturePolicyMode =
  | "off"
  | "admin_only"
  | "delegated_admins"
  | "members_submit_admin_approves"
  | "members_direct"
  | "paid_or_quota";

type StateSetter<T> = React.Dispatch<React.SetStateAction<T>>;
type PanelStyleFactory = (onDark?: boolean) => React.CSSProperties;
type SizeStyleFactory = (size?: number) => React.CSSProperties;
type StatusStyleFactory = (status: unknown) => React.CSSProperties;
type UnknownRecord = Record<string, unknown>;

export type CommunityDomainNoticeItem = {
  notice_id?: string | number | null;
  event_id?: string | number | null;
  body?: string | null;
  title?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  expiry_policy?: string | null;
  active_board_status?: string | null;
  is_archived?: boolean | null;
  posted_by_user_id?: string | number | null;
};

export type SetupOverviewPanelData = {
  activeSetupNoticeTask: SetupNoticeTaskKey;
  activeSetupOverviewTask: SetupOverviewTaskKey;
  compactStatus: (value: unknown) => string;
  counts: UnknownRecord;
  domainNoticeFeatureMode: DomainFeaturePolicyMode;
  domainNotices: CommunityDomainNoticeItem[];
  domainNoticesLoading: boolean;
  domainOperational: boolean;
  helperText: PanelStyleFactory;
  iconFrame: SizeStyleFactory;
  iconHeaderStyle: () => React.CSSProperties;
  isAdmin: boolean;
  isBaseReadinessLoading: boolean;
  mainActionCopy: string;
  mainActionLaneLabel: string;
  moduleCount: number;
  officialBoardActionsStyle: () => React.CSSProperties;
  officialBoardHeaderStyle: () => React.CSSProperties;
  onOpenMainAction: () => void;
  onOpenNoticeModal: () => void;
  primaryActionFallbackNote: string;
  sectionLabel: PanelStyleFactory;
  setActiveSetupNoticeTask: StateSetter<SetupNoticeTaskKey>;
  setActiveSetupOverviewTask: StateSetter<SetupOverviewTaskKey>;
  setSetupNoticeTaskChooserOpen: StateSetter<boolean>;
  setSetupOverviewGroupChooserOpen: StateSetter<boolean>;
  setSetupOverviewTaskChooserOpen: StateSetter<boolean>;
  setupNoticeTaskChooserOpen: boolean;
  setupOverviewGroupChooserOpen: boolean;
  setupOverviewTaskChooserOpen: boolean;
  setupPlan: UnknownRecord | null;
  setupReadiness: UnknownRecord | null;
  softCard: PanelStyleFactory;
  status: UnknownRecord;
  statusBadge: StatusStyleFactory;
  template: UnknownRecord;
  whiteCard: () => React.CSSProperties;
};

const SETUP_OVERVIEW_TASK_OPTIONS: Array<{
  key: SetupOverviewTaskKey;
  label: string;
  note: string;
}> = [
  {
    key: "next_setup",
    label: "Next setup",
    note: "Open the next practical setup action first.",
  },
  {
    key: "notices",
    label: "Notices",
    note: "Review or post official member-only notices.",
  },
  {
    key: "engine",
    label: "Facts",
    note: "Review the institutional facts for this domain.",
  },
  {
    key: "counts",
    label: "Counts",
    note: "Check structure, member, policy, and review totals.",
  },
];

const SETUP_OVERVIEW_GROUP_OPTIONS: Array<{
  key: SetupOverviewGroupKey;
  label: string;
  note: string;
  defaultTask: SetupOverviewTaskKey;
  taskKeys: SetupOverviewTaskKey[];
}> = [
  {
    key: "action",
    label: "Action",
    note: "Start with the next setup move or member-only notices.",
    defaultTask: "next_setup",
    taskKeys: ["next_setup", "notices"],
  },
  {
    key: "reference",
    label: "Reference",
    note: "Use facts and counts only when you need context.",
    defaultTask: "engine",
    taskKeys: ["engine", "counts"],
  },
];

const SETUP_NOTICE_TASK_OPTIONS: Array<{
  key: SetupNoticeTaskKey;
  label: string;
  note: string;
}> = [
  {
    key: "recent",
    label: "Recent notices",
    note: "Read the newest official notices for members.",
  },
  {
    key: "post",
    label: "Post notice",
    note: "Owner/admin can post a short official notice.",
  },
];

function cleanText(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function countValue(value: unknown): string {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? String(numberValue) : "0";
}

function featurePolicyModeLabel(mode: DomainFeaturePolicyMode): string {
  switch (mode) {
    case "off":
      return "Off";
    case "admin_only":
      return "Admin only";
    case "delegated_admins":
      return "Delegated admins";
    case "members_submit_admin_approves":
      return "Members submit, admin approves";
    case "members_direct":
      return "Members direct";
    case "paid_or_quota":
      return "Paid or quota";
    default:
      return "Not set";
  }
}

function limitWords(value: unknown, maxWords: number): string {
  const words = cleanText(value).split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return words.join(" ");
  }
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function noticeDateLabel(value: unknown): string {
  const text = cleanText(value);
  if (!text) return "";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function noticeExpiryLabel(item: CommunityDomainNoticeItem): string {
  if (cleanText(item?.expiry_policy).toLowerCase() === "until_replaced") {
    return "Until replaced";
  }
  const expiresAt = noticeDateLabel(item?.expires_at);
  return expiresAt ? `Until ${expiresAt}` : "";
}

type Props = {
  data: SetupOverviewPanelData;
};

export default function CommunityDomainSetupOverviewPanel({ data }: Props) {
  const {
    activeSetupNoticeTask,
    activeSetupOverviewTask,
    compactStatus,
    counts,
    domainNoticeFeatureMode,
    domainNotices,
    domainNoticesLoading,
    domainOperational,
    helperText,
    iconFrame,
    iconHeaderStyle,
    isAdmin,
    isBaseReadinessLoading,
    mainActionCopy,
    mainActionLaneLabel,
    moduleCount,
    officialBoardActionsStyle,
    officialBoardHeaderStyle,
    onOpenMainAction,
    onOpenNoticeModal,
    primaryActionFallbackNote,
    sectionLabel,
    setActiveSetupNoticeTask,
    setActiveSetupOverviewTask,
    setSetupNoticeTaskChooserOpen,
    setSetupOverviewGroupChooserOpen,
    setSetupOverviewTaskChooserOpen,
    setupNoticeTaskChooserOpen,
    setupOverviewGroupChooserOpen,
    setupOverviewTaskChooserOpen,
    setupPlan,
    setupReadiness,
    softCard,
    status,
    statusBadge,
    template,
    whiteCard,
  } = data;

  const activeSetupOverviewGroup: SetupOverviewGroupKey =
    activeSetupOverviewTask === "engine" || activeSetupOverviewTask === "counts"
      ? "reference"
      : "action";
  const activeSetupOverviewGroupOption =
    SETUP_OVERVIEW_GROUP_OPTIONS.find(
      (group) => group.key === activeSetupOverviewGroup
    ) || SETUP_OVERVIEW_GROUP_OPTIONS[0];
  const activeSetupOverviewGroupTasks = SETUP_OVERVIEW_TASK_OPTIONS.filter((task) =>
    activeSetupOverviewGroupOption.taskKeys.includes(task.key)
  );
  const activeSetupOverviewTaskOption =
    SETUP_OVERVIEW_TASK_OPTIONS.find((task) => task.key === activeSetupOverviewTask) ||
    SETUP_OVERVIEW_TASK_OPTIONS[0];
  const activeSetupNoticeTaskOption =
    SETUP_NOTICE_TASK_OPTIONS.find((task) => task.key === activeSetupNoticeTask) ||
    SETUP_NOTICE_TASK_OPTIONS[0];

  return (
    <>
      <section style={whiteCard()}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={iconHeaderStyle()}>
            <span style={iconFrame(54)}>
              <GsnRealisticIcon name="records-folder" size={42} decorative />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={sectionLabel()}>Setup work</div>
              <h2 style={{ margin: "6px 0 0", fontSize: 22, lineHeight: 1.12 }}>
                Choose one setup view.
              </h2>
              <div style={{ ...helperText(), marginTop: 8 }}>
                Choose the setup stage first. Current view:{" "}
                <strong>{activeSetupOverviewGroupOption.label}</strong>.
              </div>
            </div>
          </div>
          <StableButton
            type="button"
            kind="secondary"
            fullWidth
            stableHeight={42}
            debugId="community-domain-dashboard.setup-overview-group-toggle"
            aria-expanded={setupOverviewGroupChooserOpen}
            aria-controls="community-domain-setup-overview-stages"
            onClick={() => setSetupOverviewGroupChooserOpen((current) => !current)}
            style={{
              justifyContent: "center",
              fontSize: 13,
              textTransform: "none",
            }}
          >
            {setupOverviewGroupChooserOpen ? "Close setup stages" : "Change setup stage"}
          </StableButton>
          {setupOverviewGroupChooserOpen ? (
            <div
              id="community-domain-setup-overview-stages"
              data-debug-id="community-domain-dashboard.setup-overview-group-panel"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 132px), 1fr))",
                gap: 8,
              }}
            >
              {SETUP_OVERVIEW_GROUP_OPTIONS.map((group) => {
                const selected = group.key === activeSetupOverviewGroup;
                return (
                  <StableButton
                    key={group.key}
                    type="button"
                    kind={selected ? "primary" : "secondary"}
                    stableHeight={46}
                    fullWidth
                    aria-pressed={selected}
                    title={group.note}
                    debugId={`community-domain-dashboard.setup-overview-group.${group.key}`}
                    onClick={() => {
                      setActiveSetupOverviewTask(group.defaultTask);
                      setSetupOverviewGroupChooserOpen(false);
                      setSetupOverviewTaskChooserOpen(false);
                      if (group.defaultTask === "notices") {
                        setActiveSetupNoticeTask("recent");
                        setSetupNoticeTaskChooserOpen(false);
                      }
                    }}
                  >
                    {group.label}
                  </StableButton>
                );
              })}
            </div>
          ) : null}
          <div style={{ ...helperText(), fontSize: 13 }}>
            {activeSetupOverviewGroupOption.note}
          </div>
          <div style={{ ...helperText(), fontSize: 13 }}>
            Current view: <strong>{activeSetupOverviewTaskOption.label}</strong>.{" "}
            {activeSetupOverviewTaskOption.note}
          </div>
          <StableButton
            type="button"
            kind="secondary"
            fullWidth
            stableHeight={42}
            debugId="community-domain-dashboard.setup-overview-task-toggle"
            aria-expanded={setupOverviewTaskChooserOpen}
            aria-controls="community-domain-setup-overview-packets"
            onClick={() => setSetupOverviewTaskChooserOpen((current) => !current)}
            style={{
              justifyContent: "center",
              fontSize: 13,
              textTransform: "none",
            }}
          >
            {setupOverviewTaskChooserOpen ? "Close setup views" : "Change setup view"}
          </StableButton>
          {setupOverviewTaskChooserOpen ? (
            <div
              id="community-domain-setup-overview-packets"
              data-debug-id="community-domain-dashboard.setup-overview-task-panel"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 145px), 1fr))",
                gap: 8,
              }}
            >
              {activeSetupOverviewGroupTasks.map((task) => {
                const selected = task.key === activeSetupOverviewTask;
                return (
                  <StableButton
                    key={task.key}
                    type="button"
                    kind={selected ? "primary" : "secondary"}
                    stableHeight={46}
                    fullWidth
                    aria-pressed={selected}
                    title={task.note}
                    debugId={`community-domain-dashboard.setup-overview.${task.key}`}
                    onClick={() => {
                      setActiveSetupOverviewTask(task.key);
                      setSetupOverviewTaskChooserOpen(false);
                      if (task.key === "notices") {
                        setActiveSetupNoticeTask("recent");
                        setSetupNoticeTaskChooserOpen(false);
                      }
                    }}
                  >
                    {task.label}
                  </StableButton>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>

      {activeSetupOverviewTask === "notices" ? (
        <section style={whiteCard()}>
          <div style={officialBoardHeaderStyle()}>
            <div style={iconHeaderStyle()}>
              <span style={iconFrame(54)}>
                <GsnRealisticIcon name="spotlight-megaphone" size={42} decorative />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={sectionLabel()}>Official Board</div>
                <h2
                  style={{
                    margin: "6px 0 0",
                    fontSize: 23,
                    lineHeight: 1.12,
                    overflowWrap: "break-word",
                  }}
                >
                  Notices for this Community Domain only.
                </h2>
                <div style={{ ...helperText(), marginTop: 8 }}>
                  Official notices are capped at 50 words, have no comments or
                  reactions, and are limited to active members of this selected
                  Community Domain.
                </div>
              </div>
            </div>
            <div style={officialBoardActionsStyle()}>
              <span style={statusBadge("members only")}>Members only</span>
              <span style={statusBadge("no broadcast")}>No broadcast</span>
              <span
                style={statusBadge(
                  domainNoticeFeatureMode === "off"
                    ? "off"
                    : featurePolicyModeLabel(domainNoticeFeatureMode)
                )}
              >
                {domainNoticeFeatureMode === "off"
                  ? "Off in settings"
                  : featurePolicyModeLabel(domainNoticeFeatureMode)}
              </span>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div style={{ ...helperText(), fontSize: 13 }}>
              Current notice view: <strong>{activeSetupNoticeTaskOption.label}</strong>.{" "}
              {activeSetupNoticeTaskOption.note}
            </div>
            <StableButton
              type="button"
              kind="secondary"
              fullWidth
              stableHeight={42}
              debugId="community-domain-dashboard.setup-notice-toggle"
              aria-expanded={setupNoticeTaskChooserOpen}
              aria-controls="community-domain-setup-notice-packets"
              onClick={() => setSetupNoticeTaskChooserOpen((current) => !current)}
              style={{
                justifyContent: "center",
                fontSize: 13,
                textTransform: "none",
              }}
            >
              {setupNoticeTaskChooserOpen ? "Close notice views" : "Change notice view"}
            </StableButton>
            {setupNoticeTaskChooserOpen ? (
              <div
                id="community-domain-setup-notice-packets"
                data-debug-id="community-domain-dashboard.setup-notice-panel"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 145px), 1fr))",
                  gap: 8,
                }}
              >
                {SETUP_NOTICE_TASK_OPTIONS.map((task) => {
                  const selected = task.key === activeSetupNoticeTask;
                  return (
                    <StableButton
                      key={task.key}
                      type="button"
                      kind={selected ? "primary" : "secondary"}
                      stableHeight={46}
                      debugId={`community-domain-dashboard.setup-notice.${task.key}`}
                      onClick={() => {
                        setActiveSetupNoticeTask(task.key);
                        setSetupNoticeTaskChooserOpen(false);
                      }}
                    >
                      {task.label}
                    </StableButton>
                  );
                })}
              </div>
            ) : null}
          </div>

          {activeSetupNoticeTask === "post" ? (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {domainNoticeFeatureMode === "off" ? (
                <div style={softCard()}>
                  <div style={{ fontWeight: 950 }}>Announcement Board is off.</div>
                  <div style={{ ...helperText(), marginTop: 6, fontSize: 13 }}>
                    This domain has chosen not to use official notices here.
                    Owner/admin can change this in Domain service rules.
                  </div>
                </div>
              ) : null}
              {isAdmin ? (
                <div style={softCard()}>
                  <div style={{ fontWeight: 950 }}>Post an official notice.</div>
                  <div style={{ ...helperText(), marginTop: 6, fontSize: 13 }}>
                    Use this only for a short member-only domain notice. It does
                    not open comments, reactions, or public broadcast.
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <StableButton
                      type="button"
                      kind="secondary"
                      stableHeight={44}
                      debugId="community-domain-dashboard.notice.post"
                      disabled={domainNoticeFeatureMode === "off"}
                      onClick={onOpenNoticeModal}
                    >
                      {domainNoticeFeatureMode === "off" ? "Not used here" : "Post notice"}
                    </StableButton>
                  </div>
                </div>
              ) : (
                <div style={softCard()}>
                  <div style={{ fontWeight: 950 }}>Owner/admin action.</div>
                  <div style={{ ...helperText(), marginTop: 6, fontSize: 13 }}>
                    Only a Community Domain owner or domain admin can post an
                    official notice.
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {activeSetupNoticeTask === "recent" ? (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {domainNoticeFeatureMode === "off" ? (
                <div style={softCard()}>
                  <div style={{ fontWeight: 950 }}>Announcement Board is off.</div>
                  <div style={{ ...helperText(), marginTop: 6, fontSize: 13 }}>
                    This domain has chosen not to use official notices here.
                    Owner/admin can change this in Domain service rules.
                  </div>
                </div>
              ) : domainNoticesLoading ? (
                <div style={{ ...helperText(), fontSize: 13 }}>
                  Loading official Community Domain notices.
                </div>
              ) : domainNotices.length ? (
                domainNotices.map((item, index) => {
                  const body = limitWords(item.body || item.title, 50);
                  const when = noticeDateLabel(item.created_at);
                  const expiry = noticeExpiryLabel(item);
                  const key = cleanText(
                    item.notice_id || item.event_id || item.created_at || index,
                    String(index)
                  );

                  return (
                    <div key={key} style={softCard()}>
                      <div
                        style={{
                          color: "#091B2E",
                          fontSize: 15,
                          fontWeight: 950,
                          lineHeight: 1.35,
                          overflowWrap: "break-word",
                        }}
                      >
                        {body || "Official Community Domain notice"}
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        <span style={statusBadge("newest first")}>Newest first</span>
                        {when ? <span style={statusBadge("active")}>{when}</span> : null}
                        {expiry ? (
                          <span style={statusBadge("active")}>{expiry}</span>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={softCard()}>
                  <div style={{ fontWeight: 950 }}>No official notices yet.</div>
                  <div style={{ ...helperText(), marginTop: 6, fontSize: 13 }}>
                    When a domain owner or domain admin posts here, only members
                    of this Community Domain see the notice.
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {activeSetupOverviewTask === "engine" ? (
        <section style={whiteCard()}>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <div style={sectionLabel()}>Community Domain facts</div>
              <h2 style={{ margin: "6px 0 0", fontSize: 24, lineHeight: 1.12 }}>
                One institutional home for structure, rules, services, and trust.
              </h2>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 10,
              }}
            >
              {[
                [
                  "Structure",
                  `${countValue(counts.nodes)} nodes`,
                  "Branches, departments, classes, zones, or committees belong inside this domain.",
                  "community-building",
                ],
                [
                  "Governance",
                  `${countValue(counts.active_policies)} policies`,
                  "Rules and reviews control who can change members, structure, and evidence.",
                  "trust-shield",
                ],
                [
                  "Services",
                  `${countValue(moduleCount)} services`,
                  "Shops, verification, analytics, vault, and other enabled services stay scoped here.",
                  "market-stall",
                ],
                [
                  "Trust relay",
                  compactStatus(status.verification_status),
                  "Evidence can travel with the domain, but verification still depends on current status.",
                  "certificate-seal",
                ],
              ].map(([label, value, detail, icon]) => (
                <div key={String(label)} style={softCard()}>
                  <div style={iconHeaderStyle()}>
                    <span style={iconFrame(42)}>
                      <GsnRealisticIcon
                        name={icon as Gsn3DIconKey}
                        size={32}
                        decorative
                      />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={sectionLabel()}>{String(label)}</div>
                      <div
                        style={{
                          marginTop: 5,
                          fontSize: 20,
                          lineHeight: 1.1,
                          fontWeight: 950,
                          textTransform:
                            String(label) === "Trust relay" ? "capitalize" : "none",
                        }}
                      >
                        {String(value)}
                      </div>
                    </div>
                  </div>
                  <div style={{ ...helperText(), marginTop: 7, fontSize: 13 }}>
                    {String(detail)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {activeSetupOverviewTask === "next_setup" ? (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
          }}
        >
          <div style={whiteCard()}>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={iconHeaderStyle()}>
                <span style={iconFrame(50)}>
                  <GsnRealisticIcon
                    name={domainOperational ? "market-stall" : "records-folder"}
                    size={39}
                    decorative
                  />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={sectionLabel()}>
                    {domainOperational ? "Live next action" : "Next action"}
                  </div>
                  <h2 style={{ margin: 0, fontSize: 23, lineHeight: 1.12 }}>
                    Open the {mainActionLaneLabel} area
                  </h2>
                </div>
              </div>
              <div style={helperText()}>
                {mainActionCopy} GSN opens the matching area here first; deeper
                changes still use owner/admin tools that check permissions.
              </div>
              {primaryActionFallbackNote ? (
                <div style={{ ...helperText(), fontSize: 13 }}>
                  {primaryActionFallbackNote}
                </div>
              ) : null}
              <StableButton
                type="button"
                kind="primary"
                fullWidth
                debugId="community-domain-dashboard.continue-setup"
                onClick={onOpenMainAction}
              >
                Open {mainActionLaneLabel}
              </StableButton>
            </div>
          </div>

          <div style={whiteCard()}>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={iconHeaderStyle()}>
                <span style={iconFrame(50)}>
                  <GsnRealisticIcon name="community-building" size={39} decorative />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={sectionLabel()}>Template</div>
                  <h2 style={{ margin: 0, fontSize: 23, lineHeight: 1.12 }}>
                    {cleanText(template.label, "Institution")}
                  </h2>
                </div>
              </div>
              <div style={helperText()}>
                Marketplace role:{" "}
                <strong style={{ textTransform: "capitalize" }}>
                  {compactStatus(template.marketplace_role)}
                </strong>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <span style={statusBadge(status.domain_status)}>
                  {compactStatus(status.domain_status)}
                </span>
                <span style={statusBadge(status.verification_status)}>
                  {compactStatus(status.verification_status)}
                </span>
              </div>
            </div>
          </div>

          <Suspense
            fallback={
              <>
                <div style={whiteCard()}>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={sectionLabel()}>Setup readiness</div>
                    <h2 style={{ margin: 0, fontSize: 23, lineHeight: 1.12 }}>
                      Loading readiness checks
                    </h2>
                    <div style={helperText()}>
                      GSN is loading the setup checklist while the main Community
                      Domain dashboard remains usable.
                    </div>
                  </div>
                </div>
                <div style={whiteCard()}>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={sectionLabel()}>Setup plan</div>
                    <h2 style={{ margin: 0, fontSize: 23, lineHeight: 1.12 }}>
                      Loading setup plan
                    </h2>
                    <div style={helperText()}>
                      GSN is loading the setup plan while the main Community Domain
                      dashboard remains usable.
                    </div>
                  </div>
                </div>
              </>
            }
          >
            <CommunityDomainSetupIntelligenceCards
              isBaseReadinessLoading={isBaseReadinessLoading}
              setupReadiness={setupReadiness}
              setupPlan={setupPlan}
            />
          </Suspense>
        </section>
      ) : null}

      {activeSetupOverviewTask === "counts" ? (
        <section style={whiteCard()}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
            }}
          >
            {[
              ["Structure", counts.nodes],
              ["Members", counts.active_members],
              ["Role placements", counts.active_node_memberships],
              ["Policies", counts.active_policies],
              ["Open reviews", counts.open_reviews],
            ].map(([label, value]) => (
              <div key={String(label)} style={softCard()}>
                <div style={sectionLabel()}>{String(label)}</div>
                <div style={{ fontSize: 28, fontWeight: 950, marginTop: 4 }}>
                  {countValue(value)}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
