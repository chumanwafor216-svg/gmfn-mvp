import React from "react";
import { GsnRealisticIcon } from "../../components/GsnRealisticIcon";
import { StableButton } from "../../components/StableButton";

type MemberRosterTaskKey = "summary" | "members";
type StateSetter<T> = React.Dispatch<React.SetStateAction<T>>;
type PanelStyleFactory = (onDark?: boolean) => React.CSSProperties;

type UnknownRecord = Record<string, unknown>;

type MemberRosterTaskOption = {
  key: MemberRosterTaskKey;
  label: string;
  note: string;
};

const MEMBER_ROSTER_TASK_OPTIONS: MemberRosterTaskOption[] = [
  {
    key: "summary",
    label: "Summary",
    note: "See the active and inactive member count first.",
  },
  {
    key: "members",
    label: "Members",
    note: "Open the member list only when you need to change a status.",
  },
];

export type MemberRosterPanelData = {
  activeMemberRosterTask: MemberRosterTaskKey;
  busyMemberStatusId: string | null;
  changeDomainMemberStatus: (
    row: UnknownRecord,
    nextStatus: "active" | "inactive"
  ) => void | Promise<void>;
  cleanText: (value: unknown, fallback?: string) => string;
  compactStatus: (value: unknown) => string;
  communityDomainId: string | null;
  domain: UnknownRecord | null;
  domainMemberRows: UnknownRecord[];
  helperText: () => React.CSSProperties;
  iconFrame: (size?: number) => React.CSSProperties;
  iconHeaderStyle: () => React.CSSProperties;
  isAdmin: boolean;
  memberRosterSummaryRows: Array<[string, number]>;
  memberRosterTaskChooserOpen: boolean;
  sectionLabel: () => React.CSSProperties;
  setActiveMemberRosterTask: StateSetter<MemberRosterTaskKey>;
  setMemberRosterTaskChooserOpen: StateSetter<boolean>;
  softCard: PanelStyleFactory;
};

type Props = {
  data: MemberRosterPanelData;
};

export default function CommunityDomainMemberRosterPanel({ data }: Props) {
  const {
    activeMemberRosterTask,
    busyMemberStatusId,
    changeDomainMemberStatus,
    cleanText,
    compactStatus,
    communityDomainId,
    domain,
    domainMemberRows,
    helperText,
    iconFrame,
    iconHeaderStyle,
    isAdmin,
    memberRosterSummaryRows,
    memberRosterTaskChooserOpen,
    sectionLabel,
    setActiveMemberRosterTask,
    setMemberRosterTaskChooserOpen,
    softCard,
  } = data;

  const activeMemberRosterTaskOption =
    MEMBER_ROSTER_TASK_OPTIONS.find((task) => task.key === activeMemberRosterTask) ||
    MEMBER_ROSTER_TASK_OPTIONS[0];

  return (
    <div
      style={{
        ...softCard(),
        display: "grid",
        gap: 12,
      }}
    >
      <div style={iconHeaderStyle()}>
        <div style={iconFrame(44)}>
          <GsnRealisticIcon name="join-person-plus" size={34} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={sectionLabel()}>Roster control</div>
          <h3 style={{ margin: "3px 0 0", fontSize: 20, lineHeight: 1.16 }}>
            Member status and public proof.
          </h3>
          <div style={{ ...helperText(), marginTop: 6 }}>
            Deactivate members who no longer belong. Their record remains in
            history, but public active-member verification stops passing.
          </div>
        </div>
      </div>

      {!isAdmin ? (
        <div style={{ ...helperText(), marginTop: 2 }}>
          Only a Community Domain owner or domain admin can change roster status.
        </div>
      ) : null}

      <div style={{ ...helperText(), fontSize: 13 }}>
        Current roster view: <strong>{activeMemberRosterTaskOption.label}</strong>.{" "}
        {activeMemberRosterTaskOption.note}
      </div>
      <StableButton
        type="button"
        kind="secondary"
        fullWidth
        stableHeight={42}
        debugId="community-domain-dashboard.member-roster-toggle"
        aria-expanded={memberRosterTaskChooserOpen}
        aria-controls="community-domain-member-roster-packets"
        onClick={() => setMemberRosterTaskChooserOpen((current) => !current)}
        style={{
          justifyContent: "center",
          fontSize: 13,
          textTransform: "none",
        }}
      >
        {memberRosterTaskChooserOpen ? "Close roster views" : "Change roster view"}
      </StableButton>
      {memberRosterTaskChooserOpen ? (
        <div
          id="community-domain-member-roster-packets"
          data-debug-id="community-domain-dashboard.member-roster-panel"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 132px), 1fr))",
            gap: 8,
          }}
        >
          {MEMBER_ROSTER_TASK_OPTIONS.map((task) => {
            const selected = task.key === activeMemberRosterTask;
            return (
              <StableButton
                key={task.key}
                type="button"
                kind={selected ? "primary" : "secondary"}
                stableHeight={44}
                fullWidth
                aria-pressed={selected}
                title={task.note}
                debugId={`community-domain-dashboard.member-roster.${task.key}`}
                onClick={() => {
                  setActiveMemberRosterTask(task.key);
                  setMemberRosterTaskChooserOpen(false);
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

      {activeMemberRosterTask === "summary" ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 132px), 1fr))",
              gap: 8,
            }}
          >
            {memberRosterSummaryRows.map(([label, value]) => (
              <div
                key={label}
                style={{
                  border: "1px solid rgba(9,27,46,0.1)",
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.66)",
                  padding: "10px 12px",
                  minHeight: 68,
                  display: "grid",
                  alignContent: "center",
                  gap: 3,
                }}
              >
                <span style={{ ...helperText(), fontSize: 12 }}>{label}</span>
                <strong style={{ color: "#091B2E", fontSize: 22 }}>{value}</strong>
              </div>
            ))}
          </div>
          <div style={helperText()}>
            Active members can pass public active-member proof for this domain.
            Inactive rows stay in history but should not pass that public check.
          </div>
        </div>
      ) : null}

      {activeMemberRosterTask === "members" ? (
        <div style={{ display: "grid", gap: 8 }}>
          {domainMemberRows.length ? (
            domainMemberRows.map((row) => {
              const userId = cleanText(row?.user_id);
              const rowKey = cleanText(row?.id, userId);
              const statusText = cleanText(row?.status, "inactive").toLowerCase();
              const activeMember = statusText === "active";
              const busy =
                busyMemberStatusId === `${cleanText(domain?.id || communityDomainId)}:${userId}`;
              const roleText = compactStatus(row?.role || "member");
              const label =
                cleanText(row?.user_display_name) ||
                cleanText(row?.user_email) ||
                (userId ? `Member ${userId}` : "Domain member");
              return (
                <div
                  key={rowKey}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) minmax(min(100%, 136px), auto)",
                    gap: 10,
                    alignItems: "center",
                    padding: "10px 0",
                    borderTop: "1px solid rgba(9,27,46,0.1)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <strong
                        style={{
                          color: "#091B2E",
                          fontSize: 15,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {label}
                      </strong>
                      <span
                        style={{
                          borderRadius: 999,
                          padding: "4px 8px",
                          fontSize: 12,
                          fontWeight: 900,
                          background: activeMember ? "#ECFDF3" : "#FFF7E6",
                          color: activeMember ? "#166534" : "#92400E",
                          border: `1px solid ${
                            activeMember
                              ? "rgba(46,155,98,0.22)"
                              : "rgba(245,158,11,0.28)"
                          }`,
                        }}
                      >
                        {compactStatus(statusText)}
                      </span>
                    </div>
                    <div style={{ ...helperText(), fontSize: 13, marginTop: 4 }}>
                      {roleText}
                      {cleanText(row?.title) ? ` - ${cleanText(row.title)}` : ""}
                    </div>
                  </div>
                  {isAdmin ? (
                    <StableButton
                      type="button"
                      kind={activeMember ? "secondary" : "primary"}
                      stableHeight={44}
                      disabled={busy}
                      debugId={`community-domain-dashboard.member-status.${rowKey}`}
                      onClick={() =>
                        void changeDomainMemberStatus(
                          row,
                          activeMember ? "inactive" : "active"
                        )
                      }
                      style={{
                        justifyContent: "center",
                        fontSize: 13,
                        textTransform: "none",
                      }}
                    >
                      {busy ? "Saving" : activeMember ? "Deactivate" : "Reactivate"}
                    </StableButton>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div style={helperText()}>
              No Community Domain members were returned for this roster view.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
