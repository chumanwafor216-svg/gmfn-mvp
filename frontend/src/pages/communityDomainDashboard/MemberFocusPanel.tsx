import React, { lazy, Suspense } from "react";
import { StableButton } from "../../components/StableButton";

const CommunityDomainMemberReadinessPanels = lazy(
  () => import("./MemberReadinessPanels")
);
const CommunityDomainMemberRosterPanel = lazy(
  () => import("./MemberRosterPanel")
);
const CommunityDomainNodeProjectionGroups = lazy(
  () => import("./NodeProjectionGroups")
);

export type MemberDetailKey = "readiness" | "placement" | "roster";
type MemberDetailGroupKey = "readiness" | "roster";
type MemberRosterTaskKey = "summary" | "members";
type StateSetter<T> = React.Dispatch<React.SetStateAction<T>>;
type PanelStyleFactory = (onDark?: boolean) => React.CSSProperties;
type SizeStyleFactory = (size?: number) => React.CSSProperties;

type UnknownRecord = Record<string, unknown>;

export type MemberFocusPanelData = {
  activeMemberDetail: MemberDetailKey;
  activeMemberRosterTask: MemberRosterTaskKey;
  busyMemberStatusId: string | null;
  changeDomainMemberStatus: (
    row: UnknownRecord,
    nextStatus: "active" | "inactive"
  ) => void | Promise<void>;
  cleanText: (value: unknown, fallback?: string) => string;
  compactStatus: (value: unknown) => string;
  communityDomainId: string | null;
  counts: UnknownRecord;
  domain: UnknownRecord | null;
  domainMemberRows: UnknownRecord[];
  helperText: PanelStyleFactory;
  iconFrame: SizeStyleFactory;
  iconHeaderStyle: () => React.CSSProperties;
  isAdmin: boolean;
  memberPacketChooserOpen: boolean;
  memberRosterSummaryRows: Array<[string, number]>;
  memberRosterTaskChooserOpen: boolean;
  memberStageChooserOpen: boolean;
  memberVerificationMap: UnknownRecord | null;
  nodeParticipationMap: UnknownRecord | null;
  placementSummary: UnknownRecord | null;
  sectionLabel: PanelStyleFactory;
  setActiveMemberDetail: StateSetter<MemberDetailKey>;
  setActiveMemberRosterTask: StateSetter<MemberRosterTaskKey>;
  setGovernanceTaskChooserOpen: StateSetter<boolean>;
  setMemberPacketChooserOpen: StateSetter<boolean>;
  setMemberRosterTaskChooserOpen: StateSetter<boolean>;
  setMemberStageChooserOpen: StateSetter<boolean>;
  setRealLifeRecordTypeChooserOpen: StateSetter<boolean>;
  softCard: PanelStyleFactory;
};

const MEMBER_DETAIL_OPTIONS: Array<{
  key: MemberDetailKey;
  label: string;
  note: string;
}> = [
  {
    key: "readiness",
    label: "Member readiness",
    note: "Review placement, member counts, and verification readiness.",
  },
  {
    key: "placement",
    label: "Unit placement",
    note: "Inspect member participation readiness by operating unit.",
  },
  {
    key: "roster",
    label: "Roster control",
    note: "Review active and inactive members, then deactivate or restore carefully.",
  },
];

const MEMBER_DETAIL_GROUP_OPTIONS: Array<{
  key: MemberDetailGroupKey;
  label: string;
  note: string;
  defaultDetail: MemberDetailKey;
  detailKeys: MemberDetailKey[];
}> = [
  {
    key: "readiness",
    label: "Readiness",
    note: "Review member readiness and operating-unit placement before roster changes.",
    defaultDetail: "readiness",
    detailKeys: ["readiness", "placement"],
  },
  {
    key: "roster",
    label: "Roster",
    note: "Open roster control only when you need to deactivate or restore members.",
    defaultDetail: "roster",
    detailKeys: ["roster"],
  },
];

type Props = {
  data: MemberFocusPanelData;
};

export default function CommunityDomainMemberFocusPanel({ data }: Props) {
  const {
    activeMemberDetail,
    activeMemberRosterTask,
    busyMemberStatusId,
    changeDomainMemberStatus,
    cleanText,
    compactStatus,
    communityDomainId,
    counts,
    domain,
    domainMemberRows,
    helperText,
    iconFrame,
    iconHeaderStyle,
    isAdmin,
    memberPacketChooserOpen,
    memberRosterSummaryRows,
    memberRosterTaskChooserOpen,
    memberStageChooserOpen,
    memberVerificationMap,
    nodeParticipationMap,
    placementSummary,
    sectionLabel,
    setActiveMemberDetail,
    setActiveMemberRosterTask,
    setGovernanceTaskChooserOpen,
    setMemberPacketChooserOpen,
    setMemberRosterTaskChooserOpen,
    setMemberStageChooserOpen,
    setRealLifeRecordTypeChooserOpen,
    softCard,
  } = data;

  const activeMemberDetailGroup: MemberDetailGroupKey =
    activeMemberDetail === "roster" ? "roster" : "readiness";
  const activeMemberDetailGroupOption =
    MEMBER_DETAIL_GROUP_OPTIONS.find((group) => group.key === activeMemberDetailGroup) ||
    MEMBER_DETAIL_GROUP_OPTIONS[0];
  const activeMemberGroupDetails = MEMBER_DETAIL_OPTIONS.filter((option) =>
    activeMemberDetailGroupOption.detailKeys.includes(option.key)
  );
  const selectedMemberDetail =
    MEMBER_DETAIL_OPTIONS.find((option) => option.key === activeMemberDetail) ||
    MEMBER_DETAIL_OPTIONS[0];

  const closeMemberChoosers = () => {
    setMemberStageChooserOpen(false);
    setMemberPacketChooserOpen(false);
    setGovernanceTaskChooserOpen(false);
    setRealLifeRecordTypeChooserOpen(false);
  };

  const selectMemberDetail = (detail: MemberDetailKey) => {
    setActiveMemberDetail(detail);
    closeMemberChoosers();
    if (detail === "roster") {
      setActiveMemberRosterTask("summary");
      setMemberRosterTaskChooserOpen(false);
    }
  };

  return (
    <>
      <div
        style={{
          ...softCard(),
          display: "grid",
          gap: 10,
        }}
      >
        <div style={sectionLabel()}>Members focus</div>
        <div style={helperText()}>
          Choose the member stage first. Current view:{" "}
          <strong>{activeMemberDetailGroupOption.label}</strong> /{" "}
          <strong>{selectedMemberDetail.label}</strong>.
        </div>
        <StableButton
          type="button"
          kind="secondary"
          fullWidth
          stableHeight={42}
          debugId="community-domain-dashboard.member-stage-toggle"
          aria-expanded={memberStageChooserOpen}
          aria-controls="community-domain-member-stages"
          onClick={() => setMemberStageChooserOpen((current) => !current)}
          style={{
            justifyContent: "center",
            fontSize: 13,
            textTransform: "none",
          }}
        >
          {memberStageChooserOpen ? "Close stages" : "Change stage"}
        </StableButton>
        {memberStageChooserOpen ? (
          <div
            id="community-domain-member-stages"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 132px), 1fr))",
              gap: 8,
            }}
          >
            {MEMBER_DETAIL_GROUP_OPTIONS.map((group) => {
              const selected = group.key === activeMemberDetailGroup;
              return (
                <StableButton
                  key={group.key}
                  type="button"
                  kind={selected ? "primary" : "secondary"}
                  stableHeight={46}
                  fullWidth
                  aria-pressed={selected}
                  title={group.note}
                  debugId={`community-domain-dashboard.member-group.${group.key}`}
                  onClick={() => selectMemberDetail(group.defaultDetail)}
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
        <div style={{ ...helperText(), fontSize: 13 }}>
          {activeMemberDetailGroupOption.note}
        </div>
        {activeMemberGroupDetails.length > 1 ? (
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
              debugId="community-domain-dashboard.member-packet-toggle"
              aria-expanded={memberPacketChooserOpen}
              aria-controls="community-domain-member-packets"
              onClick={() => setMemberPacketChooserOpen((current) => !current)}
              style={{
                justifyContent: "center",
                fontSize: 13,
                textTransform: "none",
              }}
            >
              {memberPacketChooserOpen ? "Close views" : "Change view"}
            </StableButton>
            {memberPacketChooserOpen ? (
              <div
                id="community-domain-member-packets"
                data-debug-id="community-domain-dashboard.member-packet-panel"
                style={{
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={sectionLabel()}>
                  {activeMemberDetailGroupOption.label} views
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 148px), 1fr))",
                    gap: 8,
                  }}
                >
                  {activeMemberGroupDetails.map((option) => {
                    const selected = option.key === activeMemberDetail;
                    return (
                      <StableButton
                        key={option.key}
                        type="button"
                        kind={selected ? "primary" : "secondary"}
                        stableHeight={48}
                        fullWidth
                        aria-pressed={selected}
                        title={option.note}
                        debugId={`community-domain-dashboard.member-detail.${option.key}`}
                        onClick={() => selectMemberDetail(option.key)}
                        style={{
                          justifyContent: "center",
                          fontSize: 13,
                          textTransform: "none",
                        }}
                      >
                        {option.label}
                      </StableButton>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        <div style={{ ...helperText(), fontSize: 13 }}>{selectedMemberDetail.note}</div>
      </div>

      {activeMemberDetail === "readiness" ? (
        <Suspense
          fallback={
            <div style={{ ...helperText(), marginTop: 4 }}>
              Loading member readiness panels...
            </div>
          }
        >
          <CommunityDomainMemberReadinessPanels
            placementSummary={placementSummary}
            counts={counts}
            memberVerificationMap={memberVerificationMap}
          />
        </Suspense>
      ) : null}

      {activeMemberDetail === "placement" ? (
        <Suspense
          fallback={
            <div style={{ ...helperText(), marginTop: 4 }}>
              Loading member placement view...
            </div>
          }
        >
          <CommunityDomainNodeProjectionGroups
            variant="memberParticipation"
            nodeParticipationMap={nodeParticipationMap}
          />
        </Suspense>
      ) : null}

      {activeMemberDetail === "roster" ? (
        <Suspense
          fallback={
            <div style={{ ...softCard(), ...helperText() }}>
              Loading roster control...
            </div>
          }
        >
          <CommunityDomainMemberRosterPanel
            data={{
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
            }}
          />
        </Suspense>
      ) : null}
    </>
  );
}
