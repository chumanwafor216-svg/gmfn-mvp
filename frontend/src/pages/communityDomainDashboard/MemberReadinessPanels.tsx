import React from "react";

type MemberReadinessPanelsProps = {
  placementSummary?: any;
  placementCounts?: Record<string, unknown>;
  visibleNodePlacements?: any[];
  placementLanes?: any[];
  counts?: Record<string, unknown>;
  memberVerificationMap?: any;
  memberVerificationReadyTotal?: number;
  visibleMemberVerificationLanes?: any[];
  blockedMemberVerificationLanes?: any[];
  memberVerificationSummary?: Record<string, unknown>;
  children?: React.ReactNode;
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
            {typeof value === "number" ? countValue(value) : String(value ?? "")}
          </div>
        </div>
      ))}
    </div>
  );
}

function laneDisplayLabel(lane: any, fallback = "Lane"): string {
  return cleanText(lane?.label, cleanText(lane?.lane_key, fallback));
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

export default function CommunityDomainMemberReadinessPanels({
  placementSummary,
  placementCounts = {},
  visibleNodePlacements = [],
  placementLanes = [],
  counts = {},
  memberVerificationMap,
  memberVerificationReadyTotal = 0,
  visibleMemberVerificationLanes = [],
  blockedMemberVerificationLanes = [],
  memberVerificationSummary = {},
  children,
}: MemberReadinessPanelsProps): React.ReactElement {
  return (
    <>
      {placementSummary ? (
        <div style={softCard()}>
          <div style={sectionLabel()}>Your placement</div>
          <div style={{ ...helperText(), marginTop: 7 }}>
            Domain role:{" "}
            <strong style={{ textTransform: "capitalize" }}>
              {compactStatus(placementSummary.domain_role)}
            </strong>
            . Active operating-unit placements:{" "}
            <strong>{countValue(placementCounts.active_node_placements)}</strong>.
          </div>
          {visibleNodePlacements.length ? (
            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              {visibleNodePlacements.map((placement: any) =>
                statusRow(
                  `${cleanText(placement.community_node_id)}:${cleanText(placement.id)}`,
                  cleanText(placement.community_node_name, "Operating unit"),
                  compactStatus(placement.role),
                  placement.status
                )
              )}
            </div>
          ) : (
            <div style={{ ...helperText(), marginTop: 10 }}>
              You are recorded at the domain level, but no branch, line,
              department, class, or committee placement is active yet.
            </div>
          )}
          {placementLanes.length ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
                gap: 8,
                marginTop: 10,
              }}
            >
              {placementLanes.slice(0, 4).map((lane: any) => (
                <div
                  key={cleanText(lane.lane_key, lane.label)}
                  style={statusBadge(lane.state)}
                >
                  {laneDisplayLabel(lane, "Placement")}
                </div>
              ))}
            </div>
          ) : null}
          <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
            This is read-only. Admins still control placement, role changes,
            and review decisions through scoped Community Domain tools.
          </div>
        </div>
      ) : (
        <div style={softCard()}>
          <div style={sectionLabel()}>Member and role summary</div>
          <div style={{ ...helperText(), marginTop: 7 }}>
            GSN could not load this viewer's placement projection, so this lane
            is showing only safe domain-level counts from the dashboard summary.
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
              ["Active members", counts.active_members],
              ["Role placements", counts.active_node_memberships],
              ["Open reviews", counts.open_reviews],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                style={statusBadge(Number(value) > 0 ? "recorded" : "not recorded")}
              >
                {String(label)}: {countValue(value)}
              </div>
            ))}
          </div>
          <div style={{ ...helperText(), marginTop: 10 }}>
            If placement details are needed, refresh the dashboard or ask a
            Community Domain admin to review member placement.
          </div>
          <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
            This fallback does not expose private member lists, assign roles,
            place members, decide reviews, or grant permissions.
          </div>
        </div>
      )}

      {children}

      <div style={softCard()}>
        <div style={sectionLabel()}>Member verification readiness</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {memberVerificationMap
            ? `${cleanText(
                memberVerificationMap.primary_next_action?.label,
                "Review member verification readiness"
              )}. ${memberVerificationReadyTotal} of ${visibleMemberVerificationLanes.length} member-readiness checks are ready.`
            : "GSN could not load the read-only member verification map for this Community Domain."}
        </div>
        {factGrid([
          ["Active members", memberVerificationSummary.active_member_count],
          [
            "GSN IDs",
            memberVerificationSummary.members_with_gsn_id == null
              ? "admin only"
              : countValue(memberVerificationSummary.members_with_gsn_id),
          ],
          [
            "Unit gaps",
            memberVerificationSummary.members_without_unit_placement == null
              ? "admin only"
              : countValue(memberVerificationSummary.members_without_unit_placement),
          ],
          [
            "Open reviews",
            memberVerificationSummary.open_member_review_count == null
              ? "admin only"
              : countValue(memberVerificationSummary.open_member_review_count),
          ],
        ])}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          <span style={statusBadge(memberVerificationSummary.verification_status)}>
            Domain: {compactStatus(memberVerificationSummary.verification_status)}
          </span>
          <span style={statusBadge(memberVerificationSummary.credential_issuance_status)}>
            Credentials:{" "}
            {compactStatus(memberVerificationSummary.credential_issuance_status)}
          </span>
          <span style={statusBadge("recorded")}>
            Placements:{" "}
            {countValue(memberVerificationSummary.active_node_membership_count)}
          </span>
        </div>
        {blockedMemberVerificationLanes.length ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            Member-readiness checks needing attention:{" "}
            <strong>
              {blockedMemberVerificationLanes
                .slice(0, 3)
                .map((lane) => cleanText(lane.label, lane.lane_key || "member check"))
                .join(", ")}
            </strong>
            .
          </div>
        ) : memberVerificationMap ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            No blocked member-readiness lane is visible, but KYC, credential
            issuing, TrustSlips, and Trust Passport writes are still not connected here.
          </div>
        ) : null}
        {visibleMemberVerificationLanes.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {visibleMemberVerificationLanes.slice(0, 4).map((lane) =>
              statusRow(
                cleanText(lane.lane_key, cleanText(lane.label, "member verification")),
                cleanText(lane.label, "Member-readiness check"),
                cleanText(
                  lane.next_step,
                  "Keep this as readiness planning until a formal credential flow exists."
                ),
                lane.status
              )
            )}
          </div>
        ) : null}
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          This member verification map is read-only readiness planning. It does
          not perform KYC, issue credentials, verify government identity, create
          or change members, place members in units, assign roles, grant
          permissions, create policy, decide reviews, upload evidence, expose
          storage keys, publish proof, issue TrustSlips, write Trust Passport
          entries, move money, or expose private member, review, or evidence records.
        </div>
      </div>
    </>
  );
}
