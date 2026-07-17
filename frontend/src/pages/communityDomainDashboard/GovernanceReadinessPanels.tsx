import React, { useState } from "react";
import { StableButton } from "../../components/StableButton";
import { humanStatus } from "./statusLanguage";

type GovernanceReadinessPanelsProps = {
  isAdmin?: boolean;
  membershipAccessRequests?: any[];
  governanceAttentionCount?: number;
  institutionalOpenReviewCount?: number;
  governanceApprovedCount?: number;
  delegationMap?: any;
  governanceCoverage?: any;
};

type GovernanceDetailKey = "review" | "delegation" | "coverage";

const GOVERNANCE_DETAIL_OPTIONS: Array<{
  key: GovernanceDetailKey;
  label: string;
  note: string;
}> = [
  {
    key: "review",
    label: "Review pulse",
    note: "See the open governance decisions and access-review pressure.",
  },
  {
    key: "delegation",
    label: "Delegation",
    note: "Check delegated authority and local-admin readiness.",
  },
  {
    key: "coverage",
    label: "Coverage",
    note: "Review local admin and policy coverage gaps.",
  },
];

function cleanText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function compactStatus(value: unknown): string {
  return humanStatus(value);
}

function countValue(value: unknown): string {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? String(numberValue) : "0";
}

function readinessLanes(map: any): any[] {
  return Array.isArray(map?.lanes) ? map.lanes : [];
}

function readyTotal(map: any, lanes: any[]): number {
  return typeof map?.ready_total === "number"
    ? map.ready_total
    : lanes.filter((lane) => lane.ready).length;
}

function governanceCoverageGaps(governanceCoverage: any): any[] {
  const nodes = Array.isArray(governanceCoverage?.flat_nodes)
    ? governanceCoverage.flat_nodes
    : [];
  return nodes.filter((item: any) => {
    const statusText = cleanText(item.governance_status).toLowerCase();
    return statusText.includes("needs") || statusText.includes("inactive");
  });
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
    letterSpacing: 0,
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
  const value = compactStatus(status).toLowerCase();
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
    maxWidth: "100%",
    whiteSpace: "normal",
    textAlign: "center",
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
        gridTemplateColumns: "minmax(0, 1fr)",
        gap: 8,
        alignItems: "start",
        borderRadius: 14,
        border: "1px solid rgba(9,27,46,0.10)",
        background: "rgba(255,255,255,0.72)",
        padding: 12,
        minWidth: 0,
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
      <span style={{ ...statusBadge(status), justifySelf: "start" }}>{compactStatus(status)}</span>
    </div>
  );
}

export default function CommunityDomainGovernanceReadinessPanels({
  isAdmin = false,
  membershipAccessRequests = [],
  governanceAttentionCount = 0,
  institutionalOpenReviewCount = 0,
  governanceApprovedCount = 0,
  delegationMap,
  governanceCoverage,
}: GovernanceReadinessPanelsProps): React.ReactElement {
  const delegationMapSummary = delegationMap?.summary || {};
  const visibleDelegationLanes = readinessLanes(delegationMap);
  const blockedDelegationLanes = visibleDelegationLanes.filter((lane) => !lane.ready);
  const delegationReadyTotal = readyTotal(delegationMap, visibleDelegationLanes);
  const governanceCoverageCounts = governanceCoverage?.counts || {};
  const coverageGaps = governanceCoverageGaps(governanceCoverage);
  const reviewPulseRows = [
    ["Needs review", governanceAttentionCount],
    ["Ready to apply", isAdmin ? governanceApprovedCount : 0],
    ...(isAdmin
      ? [
          [
            "Institution open",
            Math.max(Number(institutionalOpenReviewCount || 0), 0),
          ],
        ]
      : []),
    ["Access requests", isAdmin ? membershipAccessRequests.length : 0],
  ];
  const [activeGovernanceDetail, setActiveGovernanceDetail] =
    useState<GovernanceDetailKey>("review");
  const [governanceDetailChooserOpen, setGovernanceDetailChooserOpen] =
    useState(false);
  const selectedGovernanceDetail =
    GOVERNANCE_DETAIL_OPTIONS.find((option) => option.key === activeGovernanceDetail) ||
    GOVERNANCE_DETAIL_OPTIONS[0];

  return (
    <>
      <div
        style={{
          ...softCard(),
          display: "grid",
          gap: 10,
        }}
      >
        <div style={sectionLabel()}>Governance focus</div>
        <div style={helperText()}>
          Open one governance view at a time. Current view:{" "}
          <strong>{selectedGovernanceDetail.label}</strong>.
        </div>
        <StableButton
          type="button"
          kind="secondary"
          fullWidth
          stableHeight={42}
          debugId="community-domain-governance.detail-toggle"
          aria-expanded={governanceDetailChooserOpen}
          aria-controls="community-domain-governance-packets"
          onClick={() => setGovernanceDetailChooserOpen((current) => !current)}
          style={{
            justifyContent: "center",
            fontSize: 13,
            textTransform: "none",
          }}
        >
          {governanceDetailChooserOpen ? "Close views" : "Change view"}
        </StableButton>
        {governanceDetailChooserOpen ? (
          <div
            id="community-domain-governance-packets"
            data-debug-id="community-domain-governance.detail-panel"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
              gap: 8,
            }}
          >
            {GOVERNANCE_DETAIL_OPTIONS.map((option) => {
              const selected = option.key === activeGovernanceDetail;
              return (
                <StableButton
                  key={option.key}
                  type="button"
                  kind={selected ? "primary" : "secondary"}
                  stableHeight={48}
                  fullWidth
                  aria-pressed={selected}
                  title={option.note}
                  debugId={`community-domain-governance.detail.${option.key}`}
                  onClick={() => {
                    setActiveGovernanceDetail(option.key);
                    setGovernanceDetailChooserOpen(false);
                  }}
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
        ) : null}
        <div style={{ ...helperText(), fontSize: 13 }}>
          {selectedGovernanceDetail.note}
        </div>
      </div>

      {activeGovernanceDetail === "review" ? (
      <div style={softCard()}>
        <div style={sectionLabel()}>Governance review pulse</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {isAdmin
            ? "Your open decisions show what you can handle now. Approved items may still need an authorized admin to apply them."
            : "Open decisions are handled by owner/admin reviewers. This lane shows whether the domain has visible review attention."}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
            gap: 8,
            marginTop: 10,
          }}
        >
          {reviewPulseRows.map(([label, value]) => (
            <div
              key={String(label)}
              style={statusBadge(Number(value) > 0 ? "attention" : "quiet")}
            >
              {String(label)}: {countValue(value)}
            </div>
          ))}
        </div>
        {isAdmin && membershipAccessRequests.length ? (
          <div style={{ ...helperText(), marginTop: 10 }}>
            The access-request panel below keeps approve, decline, and apply as
            separate actions so membership changes only after an approved review is applied.
          </div>
        ) : isAdmin &&
          Number(institutionalOpenReviewCount || 0) > governanceAttentionCount ? (
          <div style={{ ...helperText(), marginTop: 10 }}>
            You have no pending decision in your review queue, but the
            Community Domain still has institutional review pressure. Another
            eligible reviewer may need to decide, or an approved review may
            still need apply by an authorized admin.
          </div>
        ) : (
          <div style={{ ...helperText(), marginTop: 10 }}>
            {isAdmin
              ? "No membership access request currently needs your action."
              : "You can see review pressure here, but decision queues and private review details stay with authorized reviewers."}
          </div>
        )}
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          Boundary: review pressure only; no decisions, membership changes,
          role changes, private evidence, or policy bypass.
        </div>
      </div>
      ) : null}

      {activeGovernanceDetail === "delegation" ? (
      <div style={softCard()}>
        <div style={sectionLabel()}>Delegation map</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {delegationMap
            ? `${cleanText(
                delegationMap.primary_next_action?.label,
                "Review delegation"
              )}. ${delegationReadyTotal} of ${visibleDelegationLanes.length} authority checks are ready.`
            : "GSN could not load the delegation map for this Community Domain."}
        </div>
        {factGrid([
          [
            "Central authority",
            delegationMapSummary.central_authority_count == null
              ? "admin only"
              : countValue(delegationMapSummary.central_authority_count),
          ],
          [
            "Local admins",
            delegationMapSummary.operating_units_with_local_admin == null
              ? "admin only"
              : countValue(delegationMapSummary.operating_units_with_local_admin),
          ],
          [
            "Policies",
            delegationMapSummary.active_policy_count == null
              ? "admin only"
              : countValue(delegationMapSummary.active_policy_count),
          ],
          [
            "Open reviews",
            delegationMapSummary.open_review_count == null
              ? "admin only"
              : countValue(delegationMapSummary.open_review_count),
          ],
        ])}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          <span style={statusBadge(delegationMapSummary.verification_status)}>
            Authority: {compactStatus(delegationMapSummary.verification_status)}
          </span>
          <span style={statusBadge("recorded")}>
            Units: {countValue(delegationMapSummary.active_operating_unit_count)}
          </span>
          <span style={statusBadge("recorded")}>
            Inherited policy:{" "}
            {countValue(delegationMapSummary.operating_units_using_inherited_policy)}
          </span>
        </div>
        {blockedDelegationLanes.length ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            Delegation checks needing attention:{" "}
            <strong>
              {blockedDelegationLanes
                .slice(0, 3)
                .map((lane) => cleanText(lane.label, lane.lane_key || "delegation check"))
                .join(", ")}
            </strong>
            .
          </div>
        ) : delegationMap ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            No blocked delegation check is visible. Authority verification and role
            assignment remain separate.
          </div>
        ) : null}
        {visibleDelegationLanes.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {visibleDelegationLanes.slice(0, 4).map((lane) =>
              statusRow(
                cleanText(lane.lane_key, cleanText(lane.label, "delegation")),
                cleanText(lane.label, "Delegation check"),
                cleanText(
                  lane.next_step,
                  "Keep this as authority planning until the matching governance path is used."
                ),
                lane.status
              )
            )}
          </div>
        ) : null}
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          Boundary: authority planning only; no roles, memberships, policies,
          review decisions, billing, proof, marketplace activity, money, or
          private member records.
        </div>
      </div>
      ) : null}

      {activeGovernanceDetail === "coverage" ? (
      <div style={softCard()}>
        <div style={sectionLabel()}>Governance coverage</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {governanceCoverage
            ? `${cleanText(
                governanceCoverage.primary_next_action?.label,
                "Review Community Domain governance coverage"
              )}. This shows whether operating units have local admins and policy coverage.`
            : "GSN could not load the governance coverage map for this view."}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
            gap: 8,
            marginTop: 10,
          }}
        >
          {[
            ["Domain policies", governanceCoverageCounts.domain_policies],
            ["Local policies", governanceCoverageCounts.node_scoped_policies],
            ["Needs admin", governanceCoverageCounts.needs_local_admin],
            ["Needs policy", governanceCoverageCounts.needs_policy],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              style={statusBadge(Number(value) > 0 ? "recorded" : "not recorded")}
            >
              {String(label)}: {countValue(value)}
            </div>
          ))}
        </div>
        {coverageGaps.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {coverageGaps.slice(0, 3).map((item) =>
              statusRow(
                `${cleanText(item.node?.id)}:${cleanText(
                  item.node?.name,
                  "governance-node"
                )}`,
                cleanText(item.node?.name, "Operating unit"),
                cleanText(item.next_step, "Review local admin and policy coverage."),
                item.governance_status
              )
            )}
          </div>
        ) : governanceCoverage ? (
          <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
            No local-admin or policy coverage gap is visible in the governance map.
          </div>
        ) : null}
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          Boundary: coverage only; no policy creation, role changes, review
          decisions, authority verification, money, billing, public pages,
          marketplace activity, or private review records.
        </div>
      </div>
      ) : null}
    </>
  );
}
