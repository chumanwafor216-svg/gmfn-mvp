import React, { lazy, Suspense } from "react";
import { GsnRealisticIcon } from "../../components/GsnRealisticIcon";
import { StableButton } from "../../components/StableButton";

const CommunityDomainNodeProjectionGroups = lazy(
  () => import("./NodeProjectionGroups")
);
const CommunityDomainServiceReadinessPanels = lazy(
  () => import("./ServiceReadinessPanels")
);
const CommunityDomainServiceBoundaryPanels = lazy(
  () => import("./ServiceBoundaryPanels")
);
const CommunityDomainTrustEvidenceReadinessPanels = lazy(
  () => import("./TrustEvidenceReadinessPanels")
);

export type ServiceDetailKey =
  | "readiness"
  | "local"
  | "boundaries"
  | "trust"
  | "evidence";
type ServiceDetailGroupKey = "readiness" | "local" | "trust";
type StateSetter<T> = React.Dispatch<React.SetStateAction<T>>;
type PanelStyleFactory = (onDark?: boolean) => React.CSSProperties;
type SizeStyleFactory = (size?: number) => React.CSSProperties;
type StatusStyleFactory = (status: unknown) => React.CSSProperties;
type UnknownRecord = Record<string, unknown>;

const SERVICE_DETAIL_OPTIONS: Array<{
  key: ServiceDetailKey;
  label: string;
  note: string;
}> = [
  {
    key: "readiness",
    label: "Readiness",
    note: "Review service, billing, settings, economy, and presence readiness.",
  },
  {
    key: "local",
    label: "Local maps",
    note: "Inspect service, privacy, analytics, communication, and vault maps.",
  },
  {
    key: "boundaries",
    label: "Rules",
    note: "Check exchange, privacy, setup, compliance, and appeal rules.",
  },
  {
    key: "trust",
    label: "Trust maps",
    note: "Review local evidence authority and trust readiness maps.",
  },
  {
    key: "evidence",
    label: "Evidence",
    note: "Open evidence records, release, relay, notices, and mobility readiness.",
  },
];

const SERVICE_DETAIL_GROUP_OPTIONS: Array<{
  key: ServiceDetailGroupKey;
  label: string;
  note: string;
  defaultDetail: ServiceDetailKey;
  detailKeys: ServiceDetailKey[];
}> = [
  {
    key: "readiness",
    label: "Readiness",
    note: "Review service, billing, settings, economy, and presence readiness.",
    defaultDetail: "readiness",
    detailKeys: ["readiness"],
  },
  {
    key: "local",
    label: "Local rules",
    note: "Review local service maps and operating rules.",
    defaultDetail: "local",
    detailKeys: ["local", "boundaries"],
  },
  {
    key: "trust",
    label: "Trust",
    note: "Review trust maps and evidence readiness.",
    defaultDetail: "trust",
    detailKeys: ["trust", "evidence"],
  },
];

function serviceDetailGroupFor(detail: ServiceDetailKey): ServiceDetailGroupKey {
  if (detail === "local" || detail === "boundaries") return "local";
  if (detail === "trust" || detail === "evidence") return "trust";
  return "readiness";
}

export type ServiceFocusPanelData = {
  activeServiceDetail: ServiceDetailKey;
  appealReadiness: UnknownRecord | null;
  billingStatus: unknown;
  complianceMap: UnknownRecord | null;
  configurationMap: UnknownRecord | null;
  economicParticipation: UnknownRecord | null;
  evidenceRecordReadiness: UnknownRecord | null;
  evidenceReleaseReadiness: UnknownRecord | null;
  helperText: PanelStyleFactory;
  iconFrame: SizeStyleFactory;
  iconHeaderStyle: () => React.CSSProperties;
  moduleKeys: string[];
  moduleScopeReadiness: UnknownRecord | null;
  networkExchangeMap: UnknownRecord | null;
  networkPresence: UnknownRecord | null;
  nodeAnalyticsMap: UnknownRecord | null;
  nodeCommunicationMap: UnknownRecord | null;
  nodeEvidenceAuthorityMap: UnknownRecord | null;
  nodePrivacyMap: UnknownRecord | null;
  nodeServiceMap: UnknownRecord | null;
  nodeTrustMap: UnknownRecord | null;
  nodeVaultMap: UnknownRecord | null;
  notificationScopeReadiness: UnknownRecord | null;
  packageBillingAdminAction: string;
  packageBillingStatusFacts: Array<Array<string>>;
  packageCapacityFacts: Array<[string, string]>;
  packageTariffBoundaryText: string;
  professionalMarketplaceFacts: Array<Array<string>>;
  quote: UnknownRecord | null;
  recordPrivacyMap: UnknownRecord | null;
  sectionLabel: PanelStyleFactory;
  servicePacketChooserOpen: boolean;
  serviceRuleDetailsOpen: boolean;
  serviceSettingsProjection: UnknownRecord | null;
  serviceStageChooserOpen: boolean;
  setActiveServiceDetail: StateSetter<ServiceDetailKey>;
  setGovernanceTaskChooserOpen: StateSetter<boolean>;
  setMemberPacketChooserOpen: StateSetter<boolean>;
  setRealLifeRecordTypeChooserOpen: StateSetter<boolean>;
  setServicePacketChooserOpen: StateSetter<boolean>;
  setServiceRuleDetailsOpen: StateSetter<boolean>;
  setServiceStageChooserOpen: StateSetter<boolean>;
  setStructurePacketChooserOpen: StateSetter<boolean>;
  softCard: PanelStyleFactory;
  statusBadge: StatusStyleFactory;
  trustMobility: UnknownRecord | null;
  trustRelayReadiness: UnknownRecord | null;
};

type Props = {
  data: ServiceFocusPanelData;
};

export default function CommunityDomainServiceFocusPanel({ data }: Props) {
  const {
    activeServiceDetail,
    appealReadiness,
    billingStatus,
    complianceMap,
    configurationMap,
    economicParticipation,
    evidenceRecordReadiness,
    evidenceReleaseReadiness,
    helperText,
    iconFrame,
    iconHeaderStyle,
    moduleKeys,
    moduleScopeReadiness,
    networkExchangeMap,
    networkPresence,
    nodeAnalyticsMap,
    nodeCommunicationMap,
    nodeEvidenceAuthorityMap,
    nodePrivacyMap,
    nodeServiceMap,
    nodeTrustMap,
    nodeVaultMap,
    notificationScopeReadiness,
    packageBillingAdminAction,
    packageBillingStatusFacts,
    packageCapacityFacts,
    packageTariffBoundaryText,
    professionalMarketplaceFacts,
    quote,
    recordPrivacyMap,
    sectionLabel,
    servicePacketChooserOpen,
    serviceRuleDetailsOpen,
    serviceSettingsProjection,
    serviceStageChooserOpen,
    setActiveServiceDetail,
    setGovernanceTaskChooserOpen,
    setMemberPacketChooserOpen,
    setRealLifeRecordTypeChooserOpen,
    setServicePacketChooserOpen,
    setServiceRuleDetailsOpen,
    setServiceStageChooserOpen,
    setStructurePacketChooserOpen,
    softCard,
    statusBadge,
    trustMobility,
    trustRelayReadiness,
  } = data;

  const activeServiceDetailGroup = serviceDetailGroupFor(activeServiceDetail);
  const activeServiceDetailGroupOption =
    SERVICE_DETAIL_GROUP_OPTIONS.find((group) => group.key === activeServiceDetailGroup) ||
    SERVICE_DETAIL_GROUP_OPTIONS[0];
  const activeServiceGroupDetails = SERVICE_DETAIL_OPTIONS.filter((option) =>
    activeServiceDetailGroupOption.detailKeys.includes(option.key)
  );
  const selectedServiceDetail =
    SERVICE_DETAIL_OPTIONS.find((option) => option.key === activeServiceDetail) ||
    SERVICE_DETAIL_OPTIONS[0];

  const closeServiceChoosers = () => {
    setServiceStageChooserOpen(false);
    setServicePacketChooserOpen(false);
    setServiceRuleDetailsOpen(false);
    setStructurePacketChooserOpen(false);
    setMemberPacketChooserOpen(false);
    setGovernanceTaskChooserOpen(false);
    setRealLifeRecordTypeChooserOpen(false);
  };

  const selectServiceDetail = (detail: ServiceDetailKey) => {
    setActiveServiceDetail(detail);
    closeServiceChoosers();
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
        <div style={sectionLabel()}>Services focus</div>
        <div style={helperText()}>
          Choose the service stage first. Current view:{" "}
          <strong>{selectedServiceDetail.label}</strong>.
        </div>
        <StableButton
          type="button"
          kind="secondary"
          fullWidth
          stableHeight={42}
          debugId="community-domain-dashboard.service-stage-toggle"
          aria-expanded={serviceStageChooserOpen}
          aria-controls="community-domain-service-stages"
          onClick={() => setServiceStageChooserOpen((current) => !current)}
          style={{
            justifyContent: "center",
            fontSize: 13,
            textTransform: "none",
          }}
        >
          {serviceStageChooserOpen ? "Close stages" : "Change stage"}
        </StableButton>
        {serviceStageChooserOpen ? (
          <div
            id="community-domain-service-stages"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 136px), 1fr))",
              gap: 8,
            }}
          >
            {SERVICE_DETAIL_GROUP_OPTIONS.map((group) => {
              const selected = group.key === activeServiceDetailGroup;
              return (
                <StableButton
                  key={group.key}
                  type="button"
                  kind={selected ? "primary" : "secondary"}
                  stableHeight={48}
                  fullWidth
                  aria-pressed={selected}
                  title={group.note}
                  debugId={`community-domain-dashboard.service-group.${group.key}`}
                  onClick={() => selectServiceDetail(group.defaultDetail)}
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
        {activeServiceGroupDetails.length > 1 ? (
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
              debugId="community-domain-dashboard.service-packet-toggle"
              aria-expanded={servicePacketChooserOpen}
              aria-controls="community-domain-service-packets"
              onClick={() => setServicePacketChooserOpen((current) => !current)}
              style={{
                justifyContent: "center",
                fontSize: 13,
                textTransform: "none",
              }}
            >
              {servicePacketChooserOpen ? "Close views" : "Change view"}
            </StableButton>
            {servicePacketChooserOpen ? (
              <div
                id="community-domain-service-packets"
                data-debug-id="community-domain-dashboard.service-packet-panel"
                style={{
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={sectionLabel()}>
                  {activeServiceDetailGroupOption.label} views
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 136px), 1fr))",
                    gap: 8,
                  }}
                >
                  {activeServiceGroupDetails.map((option) => {
                    const selected = option.key === activeServiceDetail;
                    return (
                      <StableButton
                        key={option.key}
                        type="button"
                        kind={selected ? "primary" : "secondary"}
                        stableHeight={42}
                        fullWidth
                        aria-pressed={selected}
                        title={option.note}
                        debugId={`community-domain-dashboard.service-detail.${option.key}`}
                        onClick={() => selectServiceDetail(option.key)}
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
          {selectedServiceDetail.note}
        </div>
      </div>

      {activeServiceDetail === "boundaries" ? (
        <div
          style={{
            ...softCard(),
            display: "grid",
            gap: 10,
            border: "1px solid rgba(214,170,69,0.34)",
            background: "rgba(255,249,225,0.72)",
          }}
        >
          <div style={iconHeaderStyle()}>
            <span style={iconFrame(46)}>
              <GsnRealisticIcon name="finance-bank-building" size={35} decorative />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={sectionLabel()}>Marketplace rule</div>
              <h3 style={{ margin: "4px 0 0", fontSize: 19, lineHeight: 1.15 }}>
                Shared services, governed here.
              </h3>
            </div>
          </div>
          <div style={{ ...helperText(), fontSize: 13 }}>
            Domain owner/admin decides which shared Marketplace tools work inside
            this Community Domain.
          </div>
          <StableButton
            type="button"
            kind="secondary"
            fullWidth
            stableHeight={42}
            debugId="community-domain-dashboard.service-rule-details-toggle"
            aria-expanded={serviceRuleDetailsOpen}
            aria-controls="community-domain-service-rule-details"
            onClick={() => setServiceRuleDetailsOpen((current) => !current)}
            style={{
              justifyContent: "center",
              fontSize: 13,
              textTransform: "none",
            }}
          >
            {serviceRuleDetailsOpen ? "Close rule details" : "View rule details"}
          </StableButton>
          {serviceRuleDetailsOpen ? (
            <div
              id="community-domain-service-rule-details"
              data-debug-id="community-domain-dashboard.service-rule-details-panel"
              style={{
                display: "grid",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  padding: 12,
                  borderRadius: 18,
                  border: "1px solid rgba(9,27,46,0.1)",
                  background: "rgba(255,255,255,0.7)",
                }}
              >
                <div style={sectionLabel()}>Professional marketplace rule</div>
                <div style={{ ...helperText(), fontSize: 13 }}>
                  Ordinary GSN marketplace behaviours stay available, but this
                  domain decides who may use each one here.
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                    gap: 8,
                  }}
                >
                  {professionalMarketplaceFacts.map(([label, value]) => (
                    <div key={label} style={statusBadge("domain rule")}>
                      {label}: {value}
                    </div>
                  ))}
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 120px), 1fr))",
                  gap: 8,
                }}
              >
                {packageCapacityFacts.map(([label, value]) => (
                  <div key={label} style={statusBadge("allowance")}>
                    {label}: {value}
                  </div>
                ))}
              </div>
              <div style={{ ...helperText(), fontSize: 13 }}>
                {packageTariffBoundaryText}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                  gap: 8,
                }}
              >
                {packageBillingStatusFacts.map(([label, value]) => (
                  <div key={label} style={statusBadge("manual review")}>
                    {label}: {value}
                  </div>
                ))}
              </div>
              <div style={{ ...helperText(), fontSize: 13 }}>
                {packageBillingAdminAction} Domain service rules control who can
                use Spotlight, Demand Box, shops, Shop Diary, Vault, ROSCA,
                invites, and contribution tools here.
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeServiceDetail === "readiness" ? (
        <Suspense
          fallback={
            <div style={{ ...helperText(), marginTop: 4 }}>
              Loading service readiness panels...
            </div>
          }
        >
          <CommunityDomainServiceReadinessPanels
            moduleScopeReadiness={moduleScopeReadiness}
            moduleKeys={moduleKeys}
            billingStatus={billingStatus}
            quote={quote}
            serviceSettingsProjection={serviceSettingsProjection}
            economicParticipation={economicParticipation}
            networkPresence={networkPresence}
          />
        </Suspense>
      ) : null}

      {activeServiceDetail === "local" ? (
        <Suspense
          fallback={
            <div style={{ ...helperText(), marginTop: 4 }}>
              Loading local service views...
            </div>
          }
        >
          <CommunityDomainNodeProjectionGroups
            variant="services"
            nodeServiceMap={nodeServiceMap}
            nodePrivacyMap={nodePrivacyMap}
            nodeAnalyticsMap={nodeAnalyticsMap}
            nodeCommunicationMap={nodeCommunicationMap}
            nodeVaultMap={nodeVaultMap}
          />
        </Suspense>
      ) : null}

      {activeServiceDetail === "boundaries" ? (
        <Suspense
          fallback={
            <div style={{ ...helperText(), marginTop: 4 }}>
              Loading service rules...
            </div>
          }
        >
          <CommunityDomainServiceBoundaryPanels
            networkExchangeMap={networkExchangeMap}
            recordPrivacyMap={recordPrivacyMap}
            configurationMap={configurationMap}
            complianceMap={complianceMap}
            appealReadiness={appealReadiness}
          />
        </Suspense>
      ) : null}

      {activeServiceDetail === "trust" ? (
        <Suspense
          fallback={
            <div style={{ ...helperText(), marginTop: 4 }}>
              Loading trust evidence views...
            </div>
          }
        >
          <CommunityDomainNodeProjectionGroups
            variant="trustEvidence"
            nodeEvidenceAuthorityMap={nodeEvidenceAuthorityMap}
            nodeTrustMap={nodeTrustMap}
          />
        </Suspense>
      ) : null}

      {activeServiceDetail === "evidence" ? (
        <Suspense
          fallback={
            <div style={{ ...helperText(), marginTop: 4 }}>
              Loading trust evidence readiness panels...
            </div>
          }
        >
          <CommunityDomainTrustEvidenceReadinessPanels
            evidenceRecordReadiness={evidenceRecordReadiness}
            evidenceReleaseReadiness={evidenceReleaseReadiness}
            trustRelayReadiness={trustRelayReadiness}
            notificationScopeReadiness={notificationScopeReadiness}
            trustMobility={trustMobility}
          />
        </Suspense>
      ) : null}
    </>
  );
}
