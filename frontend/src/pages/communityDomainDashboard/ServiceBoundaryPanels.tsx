import React from "react";

type ServiceBoundaryPanelsProps = {
  networkExchangeMap?: any;
  recordPrivacyMap?: any;
  configurationMap?: any;
  complianceMap?: any;
  appealReadiness?: any;
};

function cleanText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function compactStatus(value: unknown): string {
  return cleanText(value, "not recorded").replace(/_/g, " ");
}

function countValue(value: unknown): string {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? String(numberValue) : "0";
}

function readinessLanes(map: any): any[] {
  return Array.isArray(map?.lanes) ? map.lanes : [];
}

function blockedLanes(lanes: any[]): any[] {
  return lanes.filter((lane) => !lane.ready);
}

function readyTotal(map: any, lanes: any[]): number {
  return typeof map?.ready_total === "number"
    ? map.ready_total
    : lanes.filter((lane) => lane.ready).length;
}

function signalTotal(lanes: any[]): number {
  return lanes.reduce((total, lane) => total + Number(lane.signal_count || 0), 0);
}

function softCard(): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(9,27,46,0.10)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(247,250,255,0.92))",
    padding: 16,
    boxShadow: "0 12px 26px rgba(9,27,46,0.08)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    color: "#07172C",
    fontSize: 13,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#4F647A",
    fontSize: 14,
    lineHeight: 1.55,
  };
}

function statusBadge(status: unknown): React.CSSProperties {
  const value = String(status || "").toLowerCase();
  const positive =
    value.includes("ready") ||
    value.includes("active") ||
    value.includes("complete") ||
    value.includes("approved") ||
    value.includes("recorded") ||
    value.includes("enabled");
  const attention =
    value.includes("need") ||
    value.includes("pending") ||
    value.includes("attention") ||
    value.includes("missing") ||
    value.includes("blocked") ||
    value.includes("not ");
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    padding: "7px 10px",
    fontSize: 12,
    fontWeight: 850,
    color: positive ? "#15573A" : attention ? "#7A4B00" : "#25415F",
    background: positive ? "#E7F8EF" : attention ? "#FFF3D8" : "#EEF4FB",
    border: `1px solid ${
      positive ? "rgba(21,87,58,0.16)" : attention ? "rgba(122,75,0,0.18)" : "rgba(37,65,95,0.14)"
    }`,
    textTransform: "capitalize",
  };
}

function factGrid(items: Array<[string, unknown]>): React.ReactNode {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
        gap: 8,
        marginTop: 10,
      }}
    >
      {items.map(([label, value]) => (
        <div
          key={String(label)}
          style={{
            borderRadius: 14,
            background: "#F7FAFF",
            border: "1px solid rgba(9,27,46,0.08)",
            padding: 10,
            minWidth: 0,
          }}
        >
          <div style={{ color: "#617085", fontSize: 12, fontWeight: 850 }}>{label}</div>
          <div style={{ color: "#07172C", fontWeight: 950, marginTop: 4 }}>
            {String(value ?? "")}
          </div>
        </div>
      ))}
    </div>
  );
}

function statusChips(items: Array<[string, unknown]>): React.ReactNode {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
      {items.map(([label, value]) => (
        <span key={String(label)} style={statusBadge(value)}>
          {label}: {compactStatus(value)}
        </span>
      ))}
    </div>
  );
}

function statusRow(
  key: string,
  title: string,
  detail: string,
  status: unknown
): React.ReactNode {
  return (
    <div
      key={key}
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        gap: 10,
        alignItems: "center",
        borderRadius: 14,
        border: "1px solid rgba(9,27,46,0.10)",
        background: "rgba(255,255,255,0.72)",
        padding: "10px 10px 10px 12px",
      }}
    >
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontWeight: 950 }}>{title}</span>
        <span
          style={{
            display: "block",
            color: "#4F647A",
            fontSize: 12.5,
            lineHeight: 1.45,
            marginTop: 3,
          }}
        >
          {detail}
        </span>
      </span>
      <span style={statusBadge(status)}>{compactStatus(status)}</span>
    </div>
  );
}

export default function CommunityDomainServiceBoundaryPanels({
  networkExchangeMap,
  recordPrivacyMap,
  configurationMap,
  complianceMap,
  appealReadiness,
}: ServiceBoundaryPanelsProps): React.ReactElement {
  const networkExchangeSummary = networkExchangeMap?.summary || {};
  const linkedNetworkSocialCommunity = networkExchangeMap?.linked_social_community || {};
  const visibleNetworkExchangeLanes = readinessLanes(networkExchangeMap);
  const blockedNetworkExchangeLanes = blockedLanes(visibleNetworkExchangeLanes);
  const networkExchangeReadyTotal = readyTotal(
    networkExchangeMap,
    visibleNetworkExchangeLanes
  );
  const recordPrivacySummary = recordPrivacyMap?.summary || {};
  const visibleRecordPrivacyLanes = readinessLanes(recordPrivacyMap);
  const blockedRecordPrivacyLanes = blockedLanes(visibleRecordPrivacyLanes);
  const recordPrivacyReadyTotal = readyTotal(recordPrivacyMap, visibleRecordPrivacyLanes);
  const configurationMapSummary = configurationMap?.summary || {};
  const configurationMapBlueprint = configurationMap?.blueprint || {};
  const visibleConfigurationMapLanes = readinessLanes(configurationMap);
  const blockedConfigurationMapLanes = blockedLanes(visibleConfigurationMapLanes);
  const configurationMapReadyTotal = readyTotal(
    configurationMap,
    visibleConfigurationMapLanes
  );
  const complianceMapSummary = complianceMap?.summary || {};
  const visibleComplianceMapLanes = readinessLanes(complianceMap);
  const blockedComplianceMapLanes = blockedLanes(visibleComplianceMapLanes);
  const complianceMapReadyTotal = readyTotal(complianceMap, visibleComplianceMapLanes);
  const appealReadinessSummary = appealReadiness?.summary || {};
  const visibleAppealReadinessLanes = readinessLanes(appealReadiness);
  const blockedAppealReadinessLanes = blockedLanes(visibleAppealReadinessLanes);
  const appealReadinessSignalTotal = signalTotal(visibleAppealReadinessLanes);

  return (
    <>
      <div style={softCard()}>
        <div style={sectionLabel()}>Network exchange readiness</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {networkExchangeMap
            ? `${cleanText(
                networkExchangeMap.primary_next_action?.label,
                "Review network exchange readiness"
              )}. ${networkExchangeReadyTotal} of ${visibleNetworkExchangeLanes.length} outside-network checks are ready.`
            : "GSN could not load the read-only network exchange map for this Community Domain."}
        </div>
        {factGrid([
          ["Domain exchange", compactStatus(networkExchangeSummary.domain_exchange_status)],
          [
            "Discovery",
            compactStatus(networkExchangeSummary.cross_domain_discovery_status),
          ],
          [
            "Social bridge",
            networkExchangeSummary.linked_social_community ? "linked" : "not linked",
          ],
          [
            "Affiliations",
            networkExchangeSummary.active_affiliations == null
              ? "admin only"
              : countValue(networkExchangeSummary.active_affiliations),
          ],
          ["Members", countValue(networkExchangeSummary.active_member_count)],
          [
            "Evidence",
            networkExchangeSummary.active_evidence_count == null
              ? "admin only"
              : countValue(networkExchangeSummary.active_evidence_count),
          ],
        ])}
        {statusChips([
          ["Market", networkExchangeSummary.marketplace_role],
          ["Authority", networkExchangeSummary.verification_status],
          ["Social", linkedNetworkSocialCommunity.status],
          ["Finance", networkExchangeSummary.external_finance_status],
        ])}
        {blockedNetworkExchangeLanes.length ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            Network exchange checks needing attention:{" "}
            <strong>
              {blockedNetworkExchangeLanes
                .slice(0, 3)
                .map((lane) => cleanText(lane.label, lane.lane_key || "exchange check"))
                .join(", ")}
            </strong>
            .
          </div>
        ) : networkExchangeMap ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            No blocked exchange check is visible, but outside-network exchange is
            still not connected here.
          </div>
        ) : null}
        {visibleNetworkExchangeLanes.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {visibleNetworkExchangeLanes.slice(0, 4).map((lane) =>
              statusRow(
                cleanText(lane.lane_key, cleanText(lane.label, "network exchange")),
                cleanText(lane.label, "Network exchange check"),
                cleanText(
                  lane.next_step,
                  "Keep this as outside-network planning until a real exchange rail exists."
                ),
                lane.status
              )
            )}
          </div>
        ) : null}
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          This network exchange map is read-only outside-network planning. It does
          not create domain-to-domain exchange, cross-domain discovery, public
          member directories, public search, social Community links, affiliation
          decisions, marketplace records, shops, listings, demand, Spotlight, vault
          links, TrustSlips, Trust Passport entries, public proof, payment
          instructions, finance records, loans, guarantees, money movement, or
          private member, review, evidence, marketplace, or finance exposure.
        </div>
      </div>

      <div style={softCard()}>
        <div style={sectionLabel()}>Record privacy readiness</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {recordPrivacyMap
            ? `${cleanText(
                recordPrivacyMap.primary_next_action?.label,
                "Review record privacy readiness"
              )}. ${recordPrivacyReadyTotal} of ${visibleRecordPrivacyLanes.length} privacy checks are ready.`
            : "GSN could not load the read-only record privacy map for this Community Domain."}
        </div>
        {factGrid([
          [
            "Public profile",
            recordPrivacySummary.public_profile_present ? "ready" : "needed",
          ],
          ["Public URL", compactStatus(recordPrivacySummary.public_url_status)],
          ["Operating units", countValue(recordPrivacySummary.active_node_count)],
          [
            "Members",
            recordPrivacySummary.active_member_count == null
              ? "admin only"
              : countValue(recordPrivacySummary.active_member_count),
          ],
          [
            "Open reviews",
            recordPrivacySummary.open_review_count == null
              ? "admin only"
              : countValue(recordPrivacySummary.open_review_count),
          ],
          [
            "Evidence",
            recordPrivacySummary.active_evidence_count == null
              ? "admin only"
              : countValue(recordPrivacySummary.active_evidence_count),
          ],
        ])}
        {statusChips([
          ["Marketplace", recordPrivacySummary.marketplace_private_record_status],
          ["Finance", recordPrivacySummary.finance_private_record_status],
          ["Sharing", recordPrivacySummary.cross_domain_record_sharing_status],
        ])}
        {blockedRecordPrivacyLanes.length ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            Privacy checks needing attention:{" "}
            <strong>
              {blockedRecordPrivacyLanes
                .slice(0, 3)
                .map((lane) => cleanText(lane.label, lane.lane_key || "privacy check"))
                .join(", ")}
            </strong>
            .
          </div>
        ) : recordPrivacyMap ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            No blocked privacy check is visible, but private records are still not
            being exposed or shared here.
          </div>
        ) : null}
        {visibleRecordPrivacyLanes.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {visibleRecordPrivacyLanes.slice(0, 4).map((lane) =>
              statusRow(
                cleanText(lane.lane_key, cleanText(lane.label, "record privacy")),
                cleanText(lane.label, "Record privacy check"),
                cleanText(
                  lane.next_step,
                  "Keep this as privacy planning until a real record-sharing path exists."
                ),
                lane.status
              )
            )}
          </div>
        ) : null}
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          This record privacy map is read-only privacy planning. It does not change
          permissions, create access-control rules, create members, expose member
          lists, expose node rosters, publish hierarchies, expose review payloads,
          expose evidence files, expose storage keys, publish proof, issue
          TrustSlips, write Trust Passport records, expose marketplace activity,
          expose finance records, create cross-domain discovery, create public
          search, create member directories, share records across institutions, or
          move money.
        </div>
      </div>

      <div style={softCard()}>
        <div style={sectionLabel()}>Setup map</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {configurationMap
            ? `${cleanText(
                configurationMap.primary_next_action?.label,
                "Review setup boundaries"
              )}. ${configurationMapReadyTotal} of ${visibleConfigurationMapLanes.length} setup checks are ready.`
            : "GSN could not load the read-only setup map for this Community Domain."}
        </div>
        {factGrid([
          ["Mode", compactStatus(configurationMapSummary.configuration_mode)],
          ["Custom schema", compactStatus(configurationMapSummary.custom_schema_status)],
          ["Custom billing", compactStatus(configurationMapSummary.custom_billing_status)],
          ["Modules", countValue(configurationMapBlueprint.default_modules?.length)],
          [
            "Operating units",
            countValue(configurationMapSummary.active_operating_unit_count),
          ],
          [
            "Policies",
            configurationMapSummary.active_policy_count == null
              ? "admin only"
              : countValue(configurationMapSummary.active_policy_count),
          ],
        ])}
        {statusChips([
          ["Tenant", configurationMapSummary.custom_tenant_status],
          ["Permissions", configurationMapSummary.custom_permission_status],
          [
            "Public profile",
            configurationMapSummary.public_profile_present ? "ready" : "needed",
          ],
        ])}
        {blockedConfigurationMapLanes.length ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            Setup checks needing attention:{" "}
            <strong>
              {blockedConfigurationMapLanes
                .slice(0, 3)
                .map((lane) =>
                  cleanText(lane.label, lane.lane_key || "setup check")
                )
                .join(", ")}
            </strong>
            .
          </div>
        ) : configurationMap ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            No blocked setup check is visible, but this is still template setup,
            not a custom platform build.
          </div>
        ) : null}
        {visibleConfigurationMapLanes.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {visibleConfigurationMapLanes.slice(0, 4).map((lane) =>
              statusRow(
                cleanText(lane.lane_key, cleanText(lane.label, "setup")),
                cleanText(lane.label, "Setup check"),
                cleanText(
                  lane.next_step,
                  "Keep this as configurable template planning before requesting custom product work."
                ),
                lane.status
              )
            )}
          </div>
        ) : null}
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          This setup map is read-only service planning. It does not
          create a custom schema, custom tenant, custom billing package, custom
          permission model, custom database table, custom field, per-client code
          fork, nodes, members, roles, policies, reviews, evidence, service
          settings, payments, entitlements, marketplace records, social Community
          links, TrustSlips, Trust Passport records, public proof, or private record
          exposure.
        </div>
      </div>

      <div style={softCard()}>
        <div style={sectionLabel()}>Compliance map</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {complianceMap
            ? `${cleanText(
                complianceMap.primary_next_action?.label,
                "Review compliance and risk boundaries"
              )}. ${complianceMapReadyTotal} of ${visibleComplianceMapLanes.length} compliance checks are ready.`
            : "GSN could not load the read-only compliance map for this Community Domain."}
        </div>
        {factGrid([
          ["Domain", compactStatus(complianceMapSummary.domain_status)],
          ["Verification", compactStatus(complianceMapSummary.verification_status)],
          [
            "Compliance engine",
            compactStatus(complianceMapSummary.compliance_engine_status),
          ],
          ["Legal advice", compactStatus(complianceMapSummary.legal_advice_status)],
          [
            "Open reviews",
            complianceMapSummary.open_review_count == null
              ? "admin only"
              : countValue(complianceMapSummary.open_review_count),
          ],
          [
            "Evidence",
            complianceMapSummary.active_evidence_count == null
              ? "admin only"
              : countValue(complianceMapSummary.active_evidence_count),
          ],
        ])}
        {statusChips([
          ["Payment", complianceMapSummary.payment_compliance_status],
          ["Sharing", complianceMapSummary.cross_domain_record_sharing_status],
          [
            "Public claims",
            complianceMapSummary.public_profile_present ? "ready" : "needed",
          ],
        ])}
        {blockedComplianceMapLanes.length ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            Compliance checks needing attention:{" "}
            <strong>
              {blockedComplianceMapLanes
                .slice(0, 3)
                .map((lane) => cleanText(lane.label, lane.lane_key || "compliance check"))
                .join(", ")}
            </strong>
            .
          </div>
        ) : complianceMap ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            No blocked compliance check is visible, but this is not legal advice or
            a compliance certificate.
          </div>
        ) : null}
        {visibleComplianceMapLanes.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {visibleComplianceMapLanes.slice(0, 4).map((lane) =>
              statusRow(
                cleanText(lane.lane_key, cleanText(lane.label, "compliance")),
                cleanText(lane.label, "Compliance check"),
                cleanText(
                  lane.next_step,
                  "Keep this as compliance planning until a formal compliance engine exists."
                ),
                lane.status
              )
            )}
          </div>
        ) : null}
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          This compliance map is read-only compliance planning and risk posture
          mapping, not legal advice. It does not certify compliance, create a
          compliance decision, verify legal authority, upload evidence, expose
          storage keys, expose member lists, create policy, decide reviews, create
          marketplace or finance records, create payment instructions, move money,
          create invoices, activate subscriptions, share records across
          institutions, publish public proof, issue TrustSlips, write Trust
          Passport records, or expose private member, review, evidence, or finance
          records.
        </div>
      </div>

      <div style={softCard()}>
        <div style={sectionLabel()}>Appeal readiness</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {appealReadiness
            ? `${cleanText(
                appealReadiness.primary_next_action?.label,
                "Keep appeal path planning read-only"
              )}. ${appealReadinessSignalTotal} review signal${
                appealReadinessSignalTotal === 1 ? "" : "s"
              } are visible across ${visibleAppealReadinessLanes.length} future appeal paths.`
            : "GSN could not load the read-only appeal readiness view for this Community Domain."}
        </div>
        {factGrid([
          ["Appeal engine", compactStatus(appealReadinessSummary.appeal_engine_status)],
          ["Appeals", countValue(appealReadinessSummary.appeal_records_created)],
          ["Mediator", compactStatus(appealReadinessSummary.mediator_assignment_status)],
          ["Decision", compactStatus(appealReadinessSummary.appeal_decision_status)],
          [
            "Open reviews",
            appealReadinessSummary.open_review_count == null
              ? "admin only"
              : countValue(appealReadinessSummary.open_review_count),
          ],
          [
            "Disputes",
            appealReadinessSummary.disputed_review_signal_count == null
              ? "admin only"
              : countValue(appealReadinessSummary.disputed_review_signal_count),
          ],
        ])}
        {blockedAppealReadinessLanes.length ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            Future appeal paths still read-only:{" "}
            <strong>
              {blockedAppealReadinessLanes
                .slice(0, 3)
                .map((lane) => cleanText(lane.label, lane.lane_key || "appeal path"))
                .join(", ")}
            </strong>
            .
          </div>
        ) : appealReadiness ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            No appeal path is writable from this dashboard card.
          </div>
        ) : null}
        {visibleAppealReadinessLanes.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {visibleAppealReadinessLanes.slice(0, 4).map((lane) =>
              statusRow(
                cleanText(lane.lane_key, cleanText(lane.label, "appeal readiness")),
                cleanText(lane.label, "Appeal path"),
                cleanText(
                  lane.next_step,
                  "Keep this as fairness planning until a real appeal process exists."
                ),
                lane.status
              )
            )}
          </div>
        ) : null}
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          This appeal readiness view is read-only fairness and dispute planning. It
          does not create appeals, reopen rejected membership, assign mediators,
          decide disputes, grant roles, verify or revoke evidence, publish content,
          grant shop or vault access, move nodes, reverse payments, move money,
          create loans, issue TrustSlips, write Trust Passport entries, share records
          across institutions, or expose private member, review, evidence, or
          finance records.
        </div>
      </div>
    </>
  );
}
