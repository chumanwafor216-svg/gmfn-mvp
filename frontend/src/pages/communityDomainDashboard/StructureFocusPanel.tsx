import React, { lazy, Suspense } from "react";
import { StableButton } from "../../components/StableButton";

const CommunityDomainNodeProjectionGroups = lazy(
  () => import("./NodeProjectionGroups")
);
const CommunityDomainStructurePlanningPanels = lazy(
  () => import("./StructurePlanningPanels")
);
const CommunityDomainStructurePreviewPanel = lazy(
  () => import("./StructurePreviewPanel")
);

export type StructureDetailKey =
  | "preview"
  | "foundation"
  | "boundary"
  | "activity"
  | "planning";
type StructureDetailGroupKey = "map" | "readiness" | "rollout";
type StateSetter<T> = React.Dispatch<React.SetStateAction<T>>;
type PanelStyleFactory = (onDark?: boolean) => React.CSSProperties;
type UnknownRecord = Record<string, unknown>;

const STRUCTURE_DETAIL_OPTIONS: Array<{
  key: StructureDetailKey;
  label: string;
  note: string;
}> = [
  {
    key: "preview",
    label: "Structure map",
    note: "Show the operating-unit tree first.",
  },
  {
    key: "foundation",
    label: "Foundation",
    note: "Review local authority, economy, and activity readiness.",
  },
  {
    key: "boundary",
    label: "Domain rules",
    note: "Check child-domain and public rule readiness.",
  },
  {
    key: "activity",
    label: "Activities",
    note: "Inspect scheduled and paid activity readiness.",
  },
  {
    key: "planning",
    label: "Rollout",
    note: "Open rollout, activity map, and group planning.",
  },
];

const STRUCTURE_DETAIL_GROUP_OPTIONS: Array<{
  key: StructureDetailGroupKey;
  label: string;
  note: string;
  defaultDetail: StructureDetailKey;
  detailKeys: StructureDetailKey[];
}> = [
  {
    key: "map",
    label: "Map",
    note: "Start with the operating-unit tree.",
    defaultDetail: "preview",
    detailKeys: ["preview"],
  },
  {
    key: "readiness",
    label: "Readiness",
    note: "Review foundation and rule readiness.",
    defaultDetail: "foundation",
    detailKeys: ["foundation", "boundary"],
  },
  {
    key: "rollout",
    label: "Rollout",
    note: "Review activity readiness and rollout planning.",
    defaultDetail: "activity",
    detailKeys: ["activity", "planning"],
  },
];

function structureDetailGroupFor(detail: StructureDetailKey): StructureDetailGroupKey {
  if (detail === "foundation" || detail === "boundary") return "readiness";
  if (detail === "activity" || detail === "planning") return "rollout";
  return "map";
}

export type StructureFocusPanelData = {
  activeStructureDetail: StructureDetailKey;
  activityGroupReadiness: UnknownRecord | null;
  activityMap: UnknownRecord | null;
  helperText: PanelStyleFactory;
  nodeActivityMap: UnknownRecord | null;
  nodeAutonomyMap: UnknownRecord | null;
  nodeDomainBoundaryMap: UnknownRecord | null;
  nodeEconomicMap: UnknownRecord | null;
  nodePaidActivityMap: UnknownRecord | null;
  nodeScheduledActivityMap: UnknownRecord | null;
  nodeTree: UnknownRecord[];
  rolloutPlan: UnknownRecord | null;
  sectionLabel: PanelStyleFactory;
  setActiveStructureDetail: StateSetter<StructureDetailKey>;
  setGovernanceTaskChooserOpen: StateSetter<boolean>;
  setMemberPacketChooserOpen: StateSetter<boolean>;
  setRealLifeRecordTypeChooserOpen: StateSetter<boolean>;
  setStructurePacketChooserOpen: StateSetter<boolean>;
  setStructureStageChooserOpen: StateSetter<boolean>;
  softCard: PanelStyleFactory;
  structurePacketChooserOpen: boolean;
  structureStageChooserOpen: boolean;
};

type Props = {
  data: StructureFocusPanelData;
};

export default function CommunityDomainStructureFocusPanel({ data }: Props) {
  const {
    activeStructureDetail,
    activityGroupReadiness,
    activityMap,
    helperText,
    nodeActivityMap,
    nodeAutonomyMap,
    nodeDomainBoundaryMap,
    nodeEconomicMap,
    nodePaidActivityMap,
    nodeScheduledActivityMap,
    nodeTree,
    rolloutPlan,
    sectionLabel,
    setActiveStructureDetail,
    setGovernanceTaskChooserOpen,
    setMemberPacketChooserOpen,
    setRealLifeRecordTypeChooserOpen,
    setStructurePacketChooserOpen,
    setStructureStageChooserOpen,
    softCard,
    structurePacketChooserOpen,
    structureStageChooserOpen,
  } = data;

  const activeStructureDetailGroup = structureDetailGroupFor(activeStructureDetail);
  const activeStructureDetailGroupOption =
    STRUCTURE_DETAIL_GROUP_OPTIONS.find(
      (group) => group.key === activeStructureDetailGroup
    ) || STRUCTURE_DETAIL_GROUP_OPTIONS[0];
  const activeStructureGroupDetails = STRUCTURE_DETAIL_OPTIONS.filter((option) =>
    activeStructureDetailGroupOption.detailKeys.includes(option.key)
  );
  const selectedStructureDetail =
    STRUCTURE_DETAIL_OPTIONS.find((option) => option.key === activeStructureDetail) ||
    STRUCTURE_DETAIL_OPTIONS[0];

  const closeStructureChoosers = () => {
    setStructureStageChooserOpen(false);
    setStructurePacketChooserOpen(false);
    setMemberPacketChooserOpen(false);
    setGovernanceTaskChooserOpen(false);
    setRealLifeRecordTypeChooserOpen(false);
  };

  const selectStructureDetail = (detail: StructureDetailKey) => {
    setActiveStructureDetail(detail);
    closeStructureChoosers();
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
        <div style={sectionLabel()}>Structure focus</div>
        <div style={helperText()}>
          Choose the structure stage first. Current view:{" "}
          <strong>{selectedStructureDetail.label}</strong>.
        </div>
        <StableButton
          type="button"
          kind="secondary"
          fullWidth
          stableHeight={42}
          debugId="community-domain-dashboard.structure-stage-toggle"
          aria-expanded={structureStageChooserOpen}
          aria-controls="community-domain-structure-stages"
          onClick={() => setStructureStageChooserOpen((current) => !current)}
          style={{
            justifyContent: "center",
            fontSize: 13,
            textTransform: "none",
          }}
        >
          {structureStageChooserOpen ? "Close stages" : "Change stage"}
        </StableButton>
        {structureStageChooserOpen ? (
          <div
            id="community-domain-structure-stages"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 136px), 1fr))",
              gap: 8,
            }}
          >
            {STRUCTURE_DETAIL_GROUP_OPTIONS.map((group) => {
              const selected = group.key === activeStructureDetailGroup;
              return (
                <StableButton
                  key={group.key}
                  type="button"
                  kind={selected ? "primary" : "secondary"}
                  stableHeight={48}
                  fullWidth
                  aria-pressed={selected}
                  title={group.note}
                  debugId={`community-domain-dashboard.structure-group.${group.key}`}
                  onClick={() => selectStructureDetail(group.defaultDetail)}
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
        {activeStructureGroupDetails.length > 1 ? (
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
              debugId="community-domain-dashboard.structure-packet-toggle"
              aria-expanded={structurePacketChooserOpen}
              aria-controls="community-domain-structure-packets"
              onClick={() => setStructurePacketChooserOpen((current) => !current)}
              style={{
                justifyContent: "center",
                fontSize: 13,
                textTransform: "none",
              }}
            >
              {structurePacketChooserOpen ? "Close views" : "Change view"}
            </StableButton>
            {structurePacketChooserOpen ? (
              <div
                id="community-domain-structure-packets"
                data-debug-id="community-domain-dashboard.structure-packet-panel"
                style={{
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={sectionLabel()}>
                  {activeStructureDetailGroupOption.label} views
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 136px), 1fr))",
                    gap: 8,
                  }}
                >
                  {activeStructureGroupDetails.map((option) => {
                    const selected = option.key === activeStructureDetail;
                    return (
                      <StableButton
                        key={option.key}
                        type="button"
                        kind={selected ? "primary" : "secondary"}
                        stableHeight={42}
                        fullWidth
                        aria-pressed={selected}
                        title={option.note}
                        debugId={`community-domain-dashboard.structure-detail.${option.key}`}
                        onClick={() => selectStructureDetail(option.key)}
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
        <div style={{ ...helperText(), fontSize: 13 }}>
          {selectedStructureDetail.note}
        </div>
      </div>

      {activeStructureDetail === "preview" ? (
        <Suspense
          fallback={
            <div style={{ ...helperText(), marginTop: 4 }}>
              Loading structure map...
            </div>
          }
        >
          <CommunityDomainStructurePreviewPanel nodeTree={nodeTree} />
        </Suspense>
      ) : null}

      {activeStructureDetail === "foundation" ? (
        <Suspense
          fallback={
            <div style={{ ...helperText(), marginTop: 4 }}>
              Loading foundation views...
            </div>
          }
        >
          <CommunityDomainNodeProjectionGroups
            variant="structureFoundation"
            nodeAutonomyMap={nodeAutonomyMap}
            nodeEconomicMap={nodeEconomicMap}
            nodeActivityMap={nodeActivityMap}
          />
        </Suspense>
      ) : null}

      {activeStructureDetail === "boundary" ? (
        <Suspense
          fallback={
            <div style={{ ...helperText(), marginTop: 4 }}>
              Loading structure rules...
            </div>
          }
        >
          <CommunityDomainNodeProjectionGroups
            variant="structureBoundary"
            nodeDomainBoundaryMap={nodeDomainBoundaryMap}
          />
        </Suspense>
      ) : null}

      {activeStructureDetail === "activity" ? (
        <Suspense
          fallback={
            <div style={{ ...helperText(), marginTop: 4 }}>
              Loading activity detail views...
            </div>
          }
        >
          <CommunityDomainNodeProjectionGroups
            variant="structureActivity"
            nodeScheduledActivityMap={nodeScheduledActivityMap}
            nodePaidActivityMap={nodePaidActivityMap}
          />
        </Suspense>
      ) : null}

      {activeStructureDetail === "planning" ? (
        <Suspense
          fallback={
            <div style={{ ...helperText(), marginTop: 4 }}>
              Loading rollout planning...
            </div>
          }
        >
          <CommunityDomainStructurePlanningPanels
            rolloutPlan={rolloutPlan}
            activityMap={activityMap}
            activityGroupReadiness={activityGroupReadiness}
          />
        </Suspense>
      ) : null}
    </>
  );
}
