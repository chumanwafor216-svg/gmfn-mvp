import React, { useState } from "react";
import { StableButton } from "../../components/StableButton";

type NodeProjectionItem = {
  node?: {
    id?: number | string | null;
    name?: string | null;
  } | null;
  autonomy_status?: string | null;
  economy_status?: string | null;
  activity_status?: string | null;
  service_status?: string | null;
  privacy_status?: string | null;
  analytics_status?: string | null;
  domain_boundary_status?: string | null;
  evidence_authority_status?: string | null;
  trust_status?: string | null;
  participation_status?: string | null;
  communication_status?: string | null;
  vault_status?: string | null;
  schedule_status?: string | null;
  paid_activity_status?: string | null;
  next_step?: string | null;
};

type StatusKey =
  | "autonomy_status"
  | "economy_status"
  | "activity_status"
  | "service_status"
  | "privacy_status"
  | "analytics_status"
  | "domain_boundary_status"
  | "evidence_authority_status"
  | "trust_status"
  | "participation_status"
  | "communication_status"
  | "vault_status"
  | "schedule_status"
  | "paid_activity_status";

type ProjectionGroupProps = {
  variant:
    | "services"
    | "trustEvidence"
    | "structureFoundation"
    | "structureBoundary"
    | "structureActivity"
    | "memberParticipation";
  nodeAutonomyMap?: any;
  nodeEconomicMap?: any;
  nodeActivityMap?: any;
  nodeEvidenceAuthorityMap?: any;
  nodeTrustMap?: any;
  nodeDomainBoundaryMap?: any;
  nodeParticipationMap?: any;
  nodeServiceMap?: any;
  nodePrivacyMap?: any;
  nodeAnalyticsMap?: any;
  nodeCommunicationMap?: any;
  nodeVaultMap?: any;
  nodeScheduledActivityMap?: any;
  nodePaidActivityMap?: any;
};

function cleanText(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function compactStatus(value: unknown): string {
  return cleanText(value, "not recorded").replace(/_/g, " ");
}

function countValue(value: unknown): string {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? String(numberValue) : "0";
}

function nodeProjectionCounts(map: any): Record<string, unknown> {
  return map?.counts || {};
}

function nodeProjectionRows(map: any): NodeProjectionItem[] {
  return Array.isArray(map?.flat_nodes) ? map.flat_nodes : [];
}

function nodeProjectionGaps(
  map: any,
  statusKey: StatusKey,
  blockedTokens: string[]
): NodeProjectionItem[] {
  return nodeProjectionRows(map).filter((item) => {
    const statusText = cleanText(item[statusKey]).toLowerCase();
    return blockedTokens.some((token) => statusText.includes(token));
  });
}

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

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#506A82",
    fontWeight: 900,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#4F647A",
    fontSize: 14,
    lineHeight: 1.65,
  };
}

function statusBadge(status: unknown): React.CSSProperties {
  const text = cleanText(status).toLowerCase();
  const warning =
    text.includes("draft") ||
    text.includes("quote") ||
    text.includes("not") ||
    text.includes("needs") ||
    text.includes("pending") ||
    text.includes("optional") ||
    text.includes("read only");
  const danger = text.includes("suspended") || text.includes("expired") || text.includes("closed");
  const palette = danger
    ? { bg: "rgba(153,27,27,0.10)", color: "#991B1B", border: "rgba(153,27,27,0.20)" }
    : warning
    ? { bg: "rgba(146,94,8,0.11)", color: "#925E08", border: "rgba(146,94,8,0.22)" }
    : { bg: "rgba(22,101,52,0.10)", color: "#166534", border: "rgba(22,101,52,0.22)" };

  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    background: palette.bg,
    color: palette.color,
    border: `1px solid ${palette.border}`,
    fontSize: 12,
    fontWeight: 900,
    textTransform: "capitalize",
  };
}

function renderNodeProjectionCard({
  title,
  detail,
  unloaded,
  metrics,
  gapLabel,
  gapRows,
  rows,
  statusKey,
  rowFallback,
  defaultNextStep,
  boundary,
}: {
  title: string;
  detail: string;
  unloaded: string;
  metrics: Array<[string, React.ReactNode]>;
  gapLabel: string;
  gapRows: NodeProjectionItem[];
  rows: NodeProjectionItem[];
  statusKey: StatusKey;
  rowFallback: string;
  defaultNextStep: string;
  boundary: string;
}) {
  const loaded = rows.length > 0 || gapRows.length > 0;
  return (
    <div style={softCard()}>
      <div style={sectionLabel()}>{title}</div>
      <div style={{ ...helperText(), marginTop: 7 }}>{loaded ? detail : unloaded}</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
          gap: 8,
          marginTop: 10,
        }}
      >
        {metrics.map(([label, value]) => (
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
            <div style={{ color: "#07172C", fontWeight: 950, marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </div>
      {gapRows.length ? (
        <div style={{ ...helperText(), marginTop: 9 }}>
          {gapLabel}:{" "}
          <strong>
            {gapRows
              .slice(0, 3)
              .map((item) => cleanText(item.node?.name, "Operating unit"))
              .join(", ")}
          </strong>
          .
        </div>
      ) : loaded ? (
        <div style={{ ...helperText(), marginTop: 9 }}>
          No blocked local node path is visible in this read-only projection.
        </div>
      ) : null}
      {rows.length ? (
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {rows.slice(0, 4).map((item) => (
            <div
              key={cleanText(item.node?.id, cleanText(item.node?.name, rowFallback))}
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
                <span style={{ display: "block", fontWeight: 950 }}>
                  {cleanText(item.node?.name, rowFallback)}
                </span>
                <span
                  style={{
                    display: "block",
                    color: "#4F647A",
                    fontSize: 12.5,
                    lineHeight: 1.45,
                    marginTop: 3,
                  }}
                >
                  {cleanText(item.next_step, defaultNextStep)}
                </span>
              </span>
              <span style={statusBadge(item[statusKey])}>{compactStatus(item[statusKey])}</span>
            </div>
          ))}
        </div>
      ) : null}
      <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>{boundary}</div>
    </div>
  );
}

function ProjectionGroup({
  groupKey,
  title,
  detail,
  closedSummary,
  children,
}: {
  groupKey: string;
  title: string;
  detail: string;
  closedSummary: string;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <section
      data-debug-id={`community-domain-dashboard.projection-group.${groupKey}`}
      style={{ display: "grid", gap: 10, marginTop: 4 }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          gap: 12,
          alignItems: "center",
          borderRadius: 18,
          border: "1px solid rgba(9,27,46,0.12)",
          background: "rgba(247,250,255,0.78)",
          padding: "12px 12px 12px 14px",
        }}
      >
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontWeight: 950, color: "#07172C" }}>
            {title}
          </span>
          <span
            style={{
              display: "block",
              color: "#4F647A",
              fontSize: 13,
              lineHeight: 1.45,
              marginTop: 3,
            }}
          >
            {isOpen ? detail : closedSummary}
          </span>
        </span>
        <StableButton
          kind="secondary"
          stableHeight={42}
          minWidth={104}
          debugId={`community-domain-dashboard.projection-group.${groupKey}.toggle`}
          onClick={() => setIsOpen((current) => !current)}
        >
          {isOpen ? "Hide" : "Show"}
        </StableButton>
      </div>
      {isOpen ? <div style={{ display: "grid", gap: 12 }}>{children}</div> : null}
    </section>
  );
}

export default function CommunityDomainNodeProjectionGroups(props: ProjectionGroupProps) {
  if (props.variant === "trustEvidence") {
    const nodeEvidenceAuthorityCounts = nodeProjectionCounts(
      props.nodeEvidenceAuthorityMap
    );
    const visibleNodeEvidenceAuthorityRows = nodeProjectionRows(
      props.nodeEvidenceAuthorityMap
    );
    const nodeEvidenceAuthorityGaps = nodeProjectionGaps(
      props.nodeEvidenceAuthorityMap,
      "evidence_authority_status",
      ["needs", "review", "inactive"]
    );
    const nodeTrustCounts = nodeProjectionCounts(props.nodeTrustMap);
    const visibleNodeTrustRows = nodeProjectionRows(props.nodeTrustMap);
    const nodeTrustGaps = nodeProjectionGaps(props.nodeTrustMap, "trust_status", [
      "needs",
      "governance",
      "review",
      "evidence",
    ]);

    return (
      <>
        {renderNodeProjectionCard({
          title: "Node evidence authority map",
          detail: props.nodeEvidenceAuthorityMap
            ? `${cleanText(
                props.nodeEvidenceAuthorityMap.primary_next_action?.label,
                "Review local evidence authority"
              )}. ${countValue(
                nodeEvidenceAuthorityCounts.local_evidence_authority_ready
              )} unit${
                Number(nodeEvidenceAuthorityCounts.local_evidence_authority_ready || 0) === 1
                  ? ""
                  : "s"
              } are locally evidence-authority-ready and ${countValue(
                nodeEvidenceAuthorityGaps.length
              )} need issuer, policy, evidence, or public-exposure review.`
            : "",
          unloaded:
            "GSN could not load the read-only node evidence authority map for this Community Domain.",
          metrics: [
            [
              "Ready units",
              countValue(nodeEvidenceAuthorityCounts.local_evidence_authority_ready),
            ],
            [
              "Reviews",
              nodeEvidenceAuthorityCounts.review_records == null
                ? "admin only"
                : countValue(nodeEvidenceAuthorityCounts.review_records),
            ],
            [
              "Evidence",
              nodeEvidenceAuthorityCounts.active_evidence_records == null
                ? "admin only"
                : countValue(nodeEvidenceAuthorityCounts.active_evidence_records),
            ],
            [
              "Needs issuer",
              countValue(nodeEvidenceAuthorityCounts.needs_local_evidence_issuer),
            ],
            [
              "Public review",
              countValue(nodeEvidenceAuthorityCounts.public_evidence_review_needed),
            ],
            ["Credentials", countValue(nodeEvidenceAuthorityCounts.credentials_issued)],
          ],
          gapLabel: "Units needing local evidence authority review",
          gapRows: nodeEvidenceAuthorityGaps,
          rows: visibleNodeEvidenceAuthorityRows,
          statusKey: "evidence_authority_status",
          rowFallback: "Evidence authority unit",
          defaultNextStep:
            "Keep evidence authority tied to local issuers, policy, and reviewed signals.",
          boundary:
            "This node evidence authority map is read-only local evidence authority planning. It does not upload evidence, verify evidence, publish public evidence, expose storage keys, expose review payloads, issue credentials, issue TrustSlips, write Trust Passport entries, create marketplace records, create finance records, verify legal authority, or expose private member activity.",
        })}

        {renderNodeProjectionCard({
          title: "Node trust map",
          detail: props.nodeTrustMap
            ? `${cleanText(
                props.nodeTrustMap.primary_next_action?.label,
                "Review local trust readiness"
              )}. ${countValue(nodeTrustCounts.local_trust_ready)} unit${
                Number(nodeTrustCounts.local_trust_ready || 0) === 1 ? "" : "s"
              } are locally trust-ready and ${countValue(
                nodeTrustGaps.length
              )} need governance, review, or evidence attention.`
            : "",
          unloaded: "GSN could not load the read-only node trust map for this Community Domain.",
          metrics: [
            ["Ready units", countValue(nodeTrustCounts.local_trust_ready)],
            [
              "Reviews",
              nodeTrustCounts.review_records == null
                ? "admin only"
                : countValue(nodeTrustCounts.review_records),
            ],
            [
              "Evidence",
              nodeTrustCounts.active_evidence_records == null
                ? "admin only"
                : countValue(nodeTrustCounts.active_evidence_records),
            ],
            ["TrustSlips", countValue(nodeTrustCounts.trustslips)],
          ],
          gapLabel: "Units needing local trust review",
          gapRows: nodeTrustGaps,
          rows: visibleNodeTrustRows,
          statusKey: "trust_status",
          rowFallback: "Trust unit",
          defaultNextStep: "Keep trust evidence tied to governed local units.",
          boundary:
            "This node trust map is read-only local trust planning. It does not upload evidence, expose storage keys, create credentials, issue TrustSlips, write Trust Passport entries, publish proof, verify legal authority, move money, create finance records, create marketplace records, or expose private member activity.",
        })}
      </>
    );
  }

  if (props.variant === "structureFoundation") {
    const nodeAutonomyCounts = nodeProjectionCounts(props.nodeAutonomyMap);
    const visibleNodeAutonomyRows = nodeProjectionRows(props.nodeAutonomyMap);
    const nodeAutonomyGaps = nodeProjectionGaps(props.nodeAutonomyMap, "autonomy_status", [
      "needs",
      "parent_controlled",
    ]);
    const nodeEconomicCounts = nodeProjectionCounts(props.nodeEconomicMap);
    const visibleNodeEconomicRows = nodeProjectionRows(props.nodeEconomicMap);
    const nodeEconomicGaps = nodeProjectionGaps(props.nodeEconomicMap, "economy_status", [
      "needs",
      "governance",
    ]);
    const nodeActivityCounts = nodeProjectionCounts(props.nodeActivityMap);
    const visibleNodeActivityRows = nodeProjectionRows(props.nodeActivityMap);
    const nodeActivityGaps = nodeProjectionGaps(props.nodeActivityMap, "activity_status", [
      "needs",
      "governance",
    ]);

    return (
      <>
        {renderNodeProjectionCard({
          title: "Node autonomy map",
          detail: props.nodeAutonomyMap
            ? `${cleanText(
                props.nodeAutonomyMap.primary_next_action?.label,
                "Review local unit autonomy"
              )}. ${countValue(nodeAutonomyCounts.locally_governed)} unit${
                Number(nodeAutonomyCounts.locally_governed || 0) === 1 ? "" : "s"
              } have local governance and ${countValue(
                nodeAutonomyGaps.length
              )} need local authority attention.`
            : "",
          unloaded:
            "GSN could not load the read-only node autonomy map for this Community Domain.",
          metrics: [
            ["Nodes", countValue(nodeAutonomyCounts.nodes)],
            ["Local governance", countValue(nodeAutonomyCounts.locally_governed)],
            [
              "Local admins",
              nodeAutonomyCounts.active_node_memberships == null
                ? "admin only"
                : countValue(nodeAutonomyCounts.active_node_memberships),
            ],
            ["Needs attention", countValue(nodeAutonomyCounts.needs_local_governance)],
          ],
          gapLabel: "Units needing autonomy review",
          gapRows: nodeAutonomyGaps,
          rows: visibleNodeAutonomyRows,
          statusKey: "autonomy_status",
          rowFallback: "Autonomy unit",
          defaultNextStep: "Keep local authority tied to existing governance.",
          boundary:
            "This node autonomy map is read-only local authority planning. It does not grant local authority, assign roles, create policy, change inheritance, split nodes, create separate Community Domains, activate billing, create marketplace records, create finance records, move money, publish proof, issue TrustSlips, write Trust Passport records, or expose private member activity.",
        })}

        {renderNodeProjectionCard({
          title: "Node economic map",
          detail: props.nodeEconomicMap
            ? `${cleanText(
                props.nodeEconomicMap.primary_next_action?.label,
                "Review local economic readiness"
              )}. ${countValue(nodeEconomicCounts.local_economy_ready)} unit${
                Number(nodeEconomicCounts.local_economy_ready || 0) === 1 ? "" : "s"
              } are locally economy-ready and ${countValue(
                nodeEconomicGaps.length
              )} need governance, admin, or participant attention.`
            : "",
          unloaded:
            "GSN could not load the read-only node economic map for this Community Domain.",
          metrics: [
            ["Market role", compactStatus(props.nodeEconomicMap?.template?.marketplace_role)],
            ["Ready units", countValue(nodeEconomicCounts.local_economy_ready)],
            [
              "Participants",
              nodeEconomicCounts.active_node_memberships == null
                ? "admin only"
                : countValue(nodeEconomicCounts.active_node_memberships),
            ],
            ["Shops", countValue(nodeEconomicCounts.shops)],
            ["Listings", countValue(nodeEconomicCounts.listings)],
            ["Finance", countValue(nodeEconomicCounts.finance_records)],
          ],
          gapLabel: "Units needing local economy review",
          gapRows: nodeEconomicGaps,
          rows: visibleNodeEconomicRows,
          statusKey: "economy_status",
          rowFallback: "Economic unit",
          defaultNextStep: "Keep commerce and finance tied to governed local units.",
          boundary:
            "This node economic map is read-only local economy planning. It does not create a marketplace, create shops, publish listings, create demand, place Spotlight, open vault links, create payment instructions, create finance records, create loans, move money, verify trust evidence, publish proof, issue TrustSlips, write Trust Passport records, create separate Community Domains, or expose private member activity.",
        })}

        {renderNodeProjectionCard({
          title: "Node activity map",
          detail: props.nodeActivityMap
            ? `${cleanText(
                props.nodeActivityMap.primary_next_action?.label,
                "Review local activity readiness"
              )}. ${countValue(nodeActivityCounts.local_activity_ready)} unit${
                Number(nodeActivityCounts.local_activity_ready || 0) === 1 ? "" : "s"
              } are ready for local activity planning and ${countValue(
                nodeActivityGaps.length
              )} need admin, participants, or governance attention.`
            : "",
          unloaded:
            "GSN could not load the read-only node activity map for this Community Domain.",
          metrics: [
            ["Template", cleanText(props.nodeActivityMap?.template?.template_key, "not loaded")],
            ["Ready units", countValue(nodeActivityCounts.local_activity_ready)],
            [
              "Participants",
              nodeActivityCounts.active_node_memberships == null
                ? "admin only"
                : countValue(nodeActivityCounts.active_node_memberships),
            ],
            ["Scheduled", countValue(nodeActivityCounts.scheduled_activities)],
            ["Paid", countValue(nodeActivityCounts.paid_activities)],
            ["Attendance", countValue(nodeActivityCounts.attendance_records)],
          ],
          gapLabel: "Units needing local activity review",
          gapRows: nodeActivityGaps,
          rows: visibleNodeActivityRows,
          statusKey: "activity_status",
          rowFallback: "Activity unit",
          defaultNextStep: "Keep activity capture tied to governed local units.",
          boundary:
            "This node activity map is read-only local activity planning. It does not create events, meetings, classes, services, travel activities, paid activities, dues, levies, attendance records, reminders, notifications, payment instructions, evidence records, TrustSlips, Trust Passport entries, marketplace records, finance records, money movement, or private member activity.",
        })}
      </>
    );
  }

  if (props.variant === "structureBoundary") {
    const nodeDomainBoundaryCounts = nodeProjectionCounts(
      props.nodeDomainBoundaryMap
    );
    const visibleNodeDomainBoundaryRows = nodeProjectionRows(
      props.nodeDomainBoundaryMap
    );
    const nodeDomainBoundaryGaps = nodeProjectionGaps(
      props.nodeDomainBoundaryMap,
      "domain_boundary_status",
      ["candidate", "review", "inactive"]
    );

    return renderNodeProjectionCard({
      title: "Node domain-boundary map",
      detail: props.nodeDomainBoundaryMap
        ? `${cleanText(
            props.nodeDomainBoundaryMap.primary_next_action?.label,
            "Review node domain boundaries"
          )}. ${countValue(
            nodeDomainBoundaryCounts.child_domain_candidate
          )} possible child-domain candidate${
            Number(nodeDomainBoundaryCounts.child_domain_candidate || 0) === 1 ? "" : "s"
          } and ${countValue(
            nodeDomainBoundaryCounts.affiliate_review_needed
          )} affiliate boundary review${
            Number(nodeDomainBoundaryCounts.affiliate_review_needed || 0) === 1 ? "" : "s"
          } are visible.`
        : "",
      unloaded:
        "GSN could not load the read-only node domain-boundary map for this Community Domain.",
      metrics: [
        ["Child candidates", countValue(nodeDomainBoundaryCounts.child_domain_candidate)],
        ["Affiliate review", countValue(nodeDomainBoundaryCounts.affiliate_review_needed)],
        ["Internal units", countValue(nodeDomainBoundaryCounts.internal_operating_unit)],
        ["Parent units", countValue(nodeDomainBoundaryCounts.parent_domain_unit)],
        [
          "Members",
          nodeDomainBoundaryCounts.active_node_memberships == null
            ? "admin only"
            : countValue(nodeDomainBoundaryCounts.active_node_memberships),
        ],
        ["Public URLs", countValue(nodeDomainBoundaryCounts.public_urls_published)],
      ],
      gapLabel: "Units needing domain-boundary review",
      gapRows: nodeDomainBoundaryGaps,
      rows: visibleNodeDomainBoundaryRows,
      statusKey: "domain_boundary_status",
      rowFallback: "Domain-boundary unit",
      defaultNextStep: "Keep operating units inside the parent domain until review is complete.",
      boundary:
        "This node domain-boundary map is read-only child-domain planning. It does not create child Community Domains, create affiliate links, publish public URLs, activate billing, split hierarchy, transfer members, verify legal identity, create marketplace records, create finance records, issue TrustSlips, write Trust Passport entries, or expose private member activity.",
    });
  }

  if (props.variant === "memberParticipation") {
    const nodeParticipationCounts = nodeProjectionCounts(props.nodeParticipationMap);
    const visibleNodeParticipationRows = nodeProjectionRows(props.nodeParticipationMap);
    const nodeParticipationGaps = nodeProjectionGaps(
      props.nodeParticipationMap,
      "participation_status",
      ["needs", "empty", "admin_only"]
    );

    return renderNodeProjectionCard({
      title: "Node participation map",
      detail: props.nodeParticipationMap
        ? `${cleanText(
            props.nodeParticipationMap.primary_next_action?.label,
            "Review member placement by operating unit"
          )}. ${countValue(nodeParticipationCounts.active_node_memberships)} member${
            Number(nodeParticipationCounts.active_node_memberships || 0) === 1 ? "" : "s"
          } are placed in units and ${countValue(
            nodeParticipationGaps.length
          )} units need local member attention.`
        : "",
      unloaded:
        "GSN could not load the read-only node participation map for this Community Domain.",
      metrics: [
        ["Nodes", countValue(nodeParticipationCounts.nodes)],
        [
          "Placed",
          nodeParticipationCounts.active_node_memberships == null
            ? "admin only"
            : countValue(nodeParticipationCounts.active_node_memberships),
        ],
        [
          "Unplaced",
          nodeParticipationCounts.unplaced_domain_members == null
            ? "admin only"
            : countValue(nodeParticipationCounts.unplaced_domain_members),
        ],
        [
          "Multi-unit",
          nodeParticipationCounts.multi_node_members == null
            ? "admin only"
            : countValue(nodeParticipationCounts.multi_node_members),
        ],
      ],
      gapLabel: "Units needing member placement review",
      gapRows: nodeParticipationGaps,
      rows: visibleNodeParticipationRows,
      statusKey: "participation_status",
      rowFallback: "Participation unit",
      defaultNextStep: "Keep member placement tied to the nearest responsible unit.",
      boundary:
        "This node participation map is read-only member placement planning. It does not create invites, add members, place members, assign roles, create a social Community, expose rosters, create marketplace records, create finance records, issue TrustSlips, write Trust Passport entries, or expose private member activity.",
    });
  }

  if (props.variant === "structureActivity") {
    const nodeScheduledActivityCounts = nodeProjectionCounts(
      props.nodeScheduledActivityMap
    );
    const visibleNodeScheduledActivityRows = nodeProjectionRows(
      props.nodeScheduledActivityMap
    );
    const nodeScheduledActivityGaps = nodeProjectionGaps(
      props.nodeScheduledActivityMap,
      "schedule_status",
      ["needs", "review", "inactive"]
    );
    const nodePaidActivityCounts = nodeProjectionCounts(props.nodePaidActivityMap);
    const visibleNodePaidActivityRows = nodeProjectionRows(props.nodePaidActivityMap);
    const nodePaidActivityGaps = nodeProjectionGaps(
      props.nodePaidActivityMap,
      "paid_activity_status",
      ["needs", "review", "inactive"]
    );

    return (
      <ProjectionGroup
        groupKey="structure-activity-projections"
        title="Activity detail projections"
        detail="Read-only node maps for scheduled activity and paid activity readiness."
        closedSummary="2 read-only activity detail maps are grouped here so Structure stays focused on the operating tree."
      >
        {renderNodeProjectionCard({
          title: "Node scheduled activity map",
          detail: props.nodeScheduledActivityMap
            ? `${cleanText(
                props.nodeScheduledActivityMap.primary_next_action?.label,
                "Review local schedule readiness"
              )}. ${countValue(nodeScheduledActivityCounts.local_schedule_ready)} unit${
                Number(nodeScheduledActivityCounts.local_schedule_ready || 0) === 1 ? "" : "s"
              } are locally schedule-ready and ${countValue(
                nodeScheduledActivityGaps.length
              )} need coordinator, audience, policy, attendance, or public schedule review.`
            : "",
          unloaded:
            "GSN could not load the read-only node scheduled activity map for this Community Domain.",
          metrics: [
            ["Ready units", countValue(nodeScheduledActivityCounts.local_schedule_ready)],
            [
              "Members",
              nodeScheduledActivityCounts.active_node_memberships == null
                ? "admin only"
                : countValue(nodeScheduledActivityCounts.active_node_memberships),
            ],
            [
              "Reviews",
              nodeScheduledActivityCounts.review_records == null
                ? "admin only"
                : countValue(nodeScheduledActivityCounts.review_records),
            ],
            ["Events", countValue(nodeScheduledActivityCounts.events_created)],
            ["Attendance", countValue(nodeScheduledActivityCounts.attendance_records)],
            [
              "Payment instructions",
              countValue(nodeScheduledActivityCounts.payment_instructions_created),
            ],
          ],
          gapLabel: "Units needing local schedule review",
          gapRows: nodeScheduledActivityGaps,
          rows: visibleNodeScheduledActivityRows,
          statusKey: "schedule_status",
          rowFallback: "Scheduled activity unit",
          defaultNextStep: "Keep meetings, events, and attendance tied to governed local units.",
          boundary:
            "This node scheduled activity map is read-only local schedule planning. It does not create events, create meetings, create calendar entries, record attendance, send reminders, send notifications, create dues, create tickets, create payment instructions, upload evidence files, issue TrustSlips, write Trust Passport entries, create marketplace records, create finance records, or expose private member activity.",
        })}

        {renderNodeProjectionCard({
          title: "Node paid activity map",
          detail: props.nodePaidActivityMap
            ? `${cleanText(
                props.nodePaidActivityMap.primary_next_action?.label,
                "Review local paid activity readiness"
              )}. ${countValue(nodePaidActivityCounts.local_paid_activity_ready)} unit${
                Number(nodePaidActivityCounts.local_paid_activity_ready || 0) === 1 ? "" : "s"
              } are locally paid-activity-ready and ${countValue(
                nodePaidActivityGaps.length
              )} need steward, payer audience, policy, finance signal, or public payment review.`
            : "",
          unloaded:
            "GSN could not load the read-only node paid activity map for this Community Domain.",
          metrics: [
            ["Ready units", countValue(nodePaidActivityCounts.local_paid_activity_ready)],
            [
              "Members",
              nodePaidActivityCounts.active_node_memberships == null
                ? "admin only"
                : countValue(nodePaidActivityCounts.active_node_memberships),
            ],
            [
              "Reviews",
              nodePaidActivityCounts.review_records == null
                ? "admin only"
                : countValue(nodePaidActivityCounts.review_records),
            ],
            ["Dues", countValue(nodePaidActivityCounts.dues_created)],
            ["Instructions", countValue(nodePaidActivityCounts.payment_instructions_created)],
            ["Ledger entries", countValue(nodePaidActivityCounts.ledger_entries_written)],
          ],
          gapLabel: "Units needing local paid activity review",
          gapRows: nodePaidActivityGaps,
          rows: visibleNodePaidActivityRows,
          statusKey: "paid_activity_status",
          rowFallback: "Paid activity unit",
          defaultNextStep:
            "Keep dues, fees, and contributions as read-only planning until finance controls exist.",
          boundary:
            "This node paid activity map is read-only local payment readiness planning. It does not create dues, create levies, create tickets, create travel fees, create contributions, create invoices, create payment instructions, record receipts, match bank events, write ledger entries, move money, create loans, issue TrustSlips, write Trust Passport entries, create marketplace records, create finance records, or expose private member activity.",
        })}
      </ProjectionGroup>
    );
  }

  const nodeServiceCounts = nodeProjectionCounts(props.nodeServiceMap);
  const visibleNodeServiceRows = nodeProjectionRows(props.nodeServiceMap);
  const nodeServiceGaps = nodeProjectionGaps(props.nodeServiceMap, "service_status", [
    "needs",
    "governance",
    "no_template",
  ]);
  const nodePrivacyCounts = nodeProjectionCounts(props.nodePrivacyMap);
  const visibleNodePrivacyRows = nodeProjectionRows(props.nodePrivacyMap);
  const nodePrivacyGaps = nodeProjectionGaps(props.nodePrivacyMap, "privacy_status", [
    "review",
    "unknown",
  ]);
  const nodeAnalyticsCounts = nodeProjectionCounts(props.nodeAnalyticsMap);
  const visibleNodeAnalyticsRows = nodeProjectionRows(props.nodeAnalyticsMap);
  const nodeAnalyticsGaps = nodeProjectionGaps(
    props.nodeAnalyticsMap,
    "analytics_status",
    ["needs", "inactive", "review"]
  );
  const nodeCommunicationCounts = nodeProjectionCounts(props.nodeCommunicationMap);
  const visibleNodeCommunicationRows = nodeProjectionRows(props.nodeCommunicationMap);
  const nodeCommunicationGaps = nodeProjectionGaps(
    props.nodeCommunicationMap,
    "communication_status",
    ["needs", "review", "inactive"]
  );
  const nodeVaultCounts = nodeProjectionCounts(props.nodeVaultMap);
  const visibleNodeVaultRows = nodeProjectionRows(props.nodeVaultMap);
  const nodeVaultGaps = nodeProjectionGaps(props.nodeVaultMap, "vault_status", [
    "needs",
    "review",
    "inactive",
  ]);

  return (
    <ProjectionGroup
      groupKey="services-node-projections"
      title="Local service projections"
      detail="Read-only node maps for service readiness, privacy, analytics, communication, and vault planning."
      closedSummary="5 read-only node maps are grouped here so Services stays usable before deeper review."
    >
      {renderNodeProjectionCard({
        title: "Node service map",
        detail: props.nodeServiceMap
          ? `${cleanText(
              props.nodeServiceMap.primary_next_action?.label,
              "Review local service readiness"
            )}. ${countValue(nodeServiceCounts.local_services_ready)} unit${
              Number(nodeServiceCounts.local_services_ready || 0) === 1 ? "" : "s"
            } are locally service-ready and ${countValue(
              nodeServiceGaps.length
            )} need governance, admins, participants, or template review.`
          : "",
        unloaded: "GSN could not load the read-only node service map for this Community Domain.",
        metrics: [
          ["Template modules", countValue(nodeServiceCounts.template_module_count)],
          ["Ready units", countValue(nodeServiceCounts.local_services_ready)],
          [
            "Members",
            nodeServiceCounts.active_node_memberships == null
              ? "admin only"
              : countValue(nodeServiceCounts.active_node_memberships),
          ],
          ["Live services", countValue(nodeServiceCounts.live_service_records)],
          ["Notifications", countValue(nodeServiceCounts.notifications)],
          ["Vault links", countValue(nodeServiceCounts.vault_links)],
        ],
        gapLabel: "Units needing local service review",
        gapRows: nodeServiceGaps,
        rows: visibleNodeServiceRows,
        statusKey: "service_status",
        rowFallback: "Service unit",
        defaultNextStep: "Keep local services tied to governed operating units.",
        boundary:
          "This node service map is read-only local service planning. It does not enable modules, persist settings, activate billing, grant permissions, create events, create notifications, create shops, create vault links, create marketplace records, create finance records, issue TrustSlips, write Trust Passport entries, or expose private member activity.",
      })}

      {renderNodeProjectionCard({
        title: "Node privacy map",
        detail: props.nodePrivacyMap
          ? `${cleanText(
              props.nodePrivacyMap.primary_next_action?.label,
              "Review local privacy boundaries"
            )}. ${countValue(nodePrivacyCounts.member_visible)} unit${
              Number(nodePrivacyCounts.member_visible || 0) === 1 ? "" : "s"
            } use member-visible defaults and ${countValue(
              nodePrivacyGaps.length
            )} need visibility review.`
          : "",
        unloaded: "GSN could not load the read-only node privacy map for this Community Domain.",
        metrics: [
          ["Member visible", countValue(nodePrivacyCounts.member_visible)],
          ["Node private", countValue(nodePrivacyCounts.node_private)],
          ["Admin restricted", countValue(nodePrivacyCounts.admin_restricted)],
          ["Public review", countValue(nodePrivacyCounts.public_review_needed)],
          ["Public pages", countValue(nodePrivacyCounts.public_pages)],
          ["Cross-domain shares", countValue(nodePrivacyCounts.cross_domain_shares)],
        ],
        gapLabel: "Units needing local privacy review",
        gapRows: nodePrivacyGaps,
        rows: visibleNodePrivacyRows,
        statusKey: "privacy_status",
        rowFallback: "Privacy unit",
        defaultNextStep: "Keep local visibility private until the right review path exists.",
        boundary:
          "This node privacy map is read-only local privacy planning. It does not change permissions, publish hierarchy, expose member lists, expose node rosters, expose evidence files, expose storage keys, create public pages, share records across institutions, issue TrustSlips, write Trust Passport entries, or expose private member activity.",
      })}

      {renderNodeProjectionCard({
        title: "Node analytics map",
        detail: props.nodeAnalyticsMap
          ? `${cleanText(
              props.nodeAnalyticsMap.primary_next_action?.label,
              "Review local analytics readiness"
            )}. ${countValue(nodeAnalyticsCounts.local_analytics_ready)} unit${
              Number(nodeAnalyticsCounts.local_analytics_ready || 0) === 1 ? "" : "s"
            } are locally analytics-ready and ${countValue(
              nodeAnalyticsGaps.length
            )} need member, governance, review, or evidence signals.`
          : "",
        unloaded:
          "GSN could not load the read-only node analytics map for this Community Domain.",
        metrics: [
          ["Ready units", countValue(nodeAnalyticsCounts.local_analytics_ready)],
          [
            "Members",
            nodeAnalyticsCounts.active_node_memberships == null
              ? "admin only"
              : countValue(nodeAnalyticsCounts.active_node_memberships),
          ],
          [
            "Reviews",
            nodeAnalyticsCounts.review_records == null
              ? "admin only"
              : countValue(nodeAnalyticsCounts.review_records),
          ],
          [
            "Evidence",
            nodeAnalyticsCounts.active_evidence_records == null
              ? "admin only"
              : countValue(nodeAnalyticsCounts.active_evidence_records),
          ],
          ["Live dashboards", countValue(nodeAnalyticsCounts.live_dashboards)],
          ["Marketplace metrics", countValue(nodeAnalyticsCounts.marketplace_metrics)],
        ],
        gapLabel: "Units needing local analytics review",
        gapRows: nodeAnalyticsGaps,
        rows: visibleNodeAnalyticsRows,
        statusKey: "analytics_status",
        rowFallback: "Analytics unit",
        defaultNextStep: "Keep local analytics tied to governed member and evidence signals.",
        boundary:
          "This node analytics map is read-only local analytics planning. It does not create telemetry, export reports, create live dashboards, create marketplace metrics, create finance metrics, expose storage keys, write Trust Passport entries, issue TrustSlips, or expose private member activity.",
      })}

      {renderNodeProjectionCard({
        title: "Node communication map",
        detail: props.nodeCommunicationMap
          ? `${cleanText(
              props.nodeCommunicationMap.primary_next_action?.label,
              "Review local communication readiness"
            )}. ${countValue(nodeCommunicationCounts.local_communication_ready)} unit${
              Number(nodeCommunicationCounts.local_communication_ready || 0) === 1
                ? ""
                : "s"
            } are locally communication-ready and ${countValue(
              nodeCommunicationGaps.length
            )} need communicator, audience, policy, or notice review.`
          : "",
        unloaded:
          "GSN could not load the read-only node communication map for this Community Domain.",
        metrics: [
          ["Ready units", countValue(nodeCommunicationCounts.local_communication_ready)],
          [
            "Members",
            nodeCommunicationCounts.active_node_memberships == null
              ? "admin only"
              : countValue(nodeCommunicationCounts.active_node_memberships),
          ],
          [
            "Reviews",
            nodeCommunicationCounts.review_records == null
              ? "admin only"
              : countValue(nodeCommunicationCounts.review_records),
          ],
          ["Public review", countValue(nodeCommunicationCounts.public_notice_review_needed)],
          ["Notices", countValue(nodeCommunicationCounts.notices_created)],
          ["Notifications", countValue(nodeCommunicationCounts.notifications_sent)],
        ],
        gapLabel: "Units needing local communication review",
        gapRows: nodeCommunicationGaps,
        rows: visibleNodeCommunicationRows,
        statusKey: "communication_status",
        rowFallback: "Communication unit",
        defaultNextStep:
          "Keep notices tied to governed local communicator and audience signals.",
        boundary:
          "This node communication map is read-only local communication planning. It does not create notices, send notifications, publish announcements, schedule meetings, create events, send reminders, send emergency notices, expose member lists, create marketplace records, create finance records, issue TrustSlips, write Trust Passport entries, or expose private member activity.",
      })}

      {renderNodeProjectionCard({
        title: "Node vault map",
        detail: props.nodeVaultMap
          ? `${cleanText(
              props.nodeVaultMap.primary_next_action?.label,
              "Review local vault readiness"
            )}. ${countValue(nodeVaultCounts.local_vault_ready)} unit${
              Number(nodeVaultCounts.local_vault_ready || 0) === 1 ? "" : "s"
            } are locally vault-ready and ${countValue(
              nodeVaultGaps.length
            )} need steward, audience, policy, document, or public exposure review.`
          : "",
        unloaded: "GSN could not load the read-only node vault map for this Community Domain.",
        metrics: [
          ["Ready units", countValue(nodeVaultCounts.local_vault_ready)],
          [
            "Members",
            nodeVaultCounts.active_node_memberships == null
              ? "admin only"
              : countValue(nodeVaultCounts.active_node_memberships),
          ],
          [
            "Evidence",
            nodeVaultCounts.active_evidence_records == null
              ? "admin only"
              : countValue(nodeVaultCounts.active_evidence_records),
          ],
          ["Needs steward", countValue(nodeVaultCounts.needs_vault_steward)],
          ["Vault links", countValue(nodeVaultCounts.vault_links_created)],
          ["Storage keys", countValue(nodeVaultCounts.storage_keys_exposed)],
        ],
        gapLabel: "Units needing local vault review",
        gapRows: nodeVaultGaps,
        rows: visibleNodeVaultRows,
        statusKey: "vault_status",
        rowFallback: "Vault unit",
        defaultNextStep:
          "Keep controlled documents tied to local steward, audience, policy, and reviewed signals.",
        boundary:
          "This node vault map is read-only local vault planning. It does not upload files, download files, create vault links, grant permissions, expose storage keys, expose member lists, connect external readers, publish proof, issue TrustSlips, write Trust Passport entries, create marketplace records, create finance records, or expose private member activity.",
      })}
    </ProjectionGroup>
  );
}
