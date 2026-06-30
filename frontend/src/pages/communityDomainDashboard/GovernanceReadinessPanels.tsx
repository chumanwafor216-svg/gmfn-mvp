import React from "react";

type GovernanceReadinessPanelsProps = {
  isAdmin?: boolean;
  membershipAccessRequests?: any[];
  governanceAttentionCount?: number;
  governanceApprovedCount?: number;
  delegationMap?: any;
  delegationReadyTotal?: number;
  visibleDelegationLanes?: any[];
  blockedDelegationLanes?: any[];
  delegationMapSummary?: Record<string, unknown>;
  governanceCoverage?: any;
  governanceCoverageCounts?: Record<string, unknown>;
  governanceCoverageGaps?: any[];
};

function cleanText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function compactStatus(value: unknown): string {
  return cleanText(value, "not recorded").replace(/_/g, " ");
}

function countValue(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "0";
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

export default function CommunityDomainGovernanceReadinessPanels({
  isAdmin = false,
  membershipAccessRequests = [],
  governanceAttentionCount = 0,
  governanceApprovedCount = 0,
  delegationMap,
  delegationReadyTotal = 0,
  visibleDelegationLanes = [],
  blockedDelegationLanes = [],
  delegationMapSummary = {},
  governanceCoverage,
  governanceCoverageCounts = {},
  governanceCoverageGaps = [],
}: GovernanceReadinessPanelsProps): React.ReactElement {
  return (
    <>
      <div style={softCard()}>
        <div style={sectionLabel()}>Governance review pulse</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {isAdmin
            ? "Open decisions and approved-but-unapplied reviews are shown from the scoped reviewer queue."
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
          {[
            ["Needs review", governanceAttentionCount],
            ["Ready to apply", isAdmin ? governanceApprovedCount : 0],
            ["Access requests", isAdmin ? membershipAccessRequests.length : 0],
          ].map(([label, value]) => (
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
        ) : (
          <div style={{ ...helperText(), marginTop: 10 }}>
            {isAdmin
              ? "No membership access request currently needs action from this account."
              : "You can see review pressure here, but decision queues and private review details stay with authorized reviewers."}
          </div>
        )}
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          This summary does not decide reviews, apply membership, assign roles,
          expose private evidence, or bypass reviewer policy.
        </div>
      </div>

      <div style={softCard()}>
        <div style={sectionLabel()}>Delegation map</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {delegationMap
            ? `${cleanText(
                delegationMap.primary_next_action?.label,
                "Review delegation"
              )}. ${delegationReadyTotal} of ${visibleDelegationLanes.length} authority checks are ready.`
            : "GSN could not load the read-only delegation map for this Community Domain."}
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
            No blocked delegation lane is visible, but legal authority verification
            and role assignment remain separate.
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
          This delegation view is read-only authority projection. It does not
          assign roles, create node memberships, create policies, create action
          reviews, decide reviews, apply reviews, change inheritance, verify
          legal or institutional authority, activate billing, create marketplace
          activity, create a social Community, publish proof, or expose private
          member, review, or evidence records.
        </div>
      </div>

      <div style={softCard()}>
        <div style={sectionLabel()}>Governance coverage</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {governanceCoverage
            ? `${cleanText(
                governanceCoverage.primary_next_action?.label,
                "Review Community Domain governance coverage"
              )}. This shows whether operating units have local admins and policy coverage.`
            : "GSN could not load the read-only governance coverage map for this view."}
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
        {governanceCoverageGaps.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {governanceCoverageGaps.slice(0, 3).map((item) =>
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
            No local-admin or policy coverage gap is visible in the read-only governance map.
          </div>
        ) : null}
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          This coverage view does not create policy, assign roles, create
          reviews, decide reviews, apply reviews, verify legal or institutional
          authority, move money, activate billing, publish a public page, create
          marketplace activity, create a social Community, or expose private review payloads.
        </div>
      </div>
    </>
  );
}
