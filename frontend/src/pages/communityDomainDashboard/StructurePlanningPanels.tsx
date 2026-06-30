import React from "react";

type StructurePlanningPanelsProps = {
  rolloutPlan?: any;
  activityMap?: any;
  activityGroupReadiness?: any;
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

function readinessLanes(map: any): any[] {
  return Array.isArray(map?.lanes) ? map.lanes : [];
}

function readyTotal(map: any, lanes: any[]): number {
  return typeof map?.ready_total === "number"
    ? map.ready_total
    : lanes.filter((lane) => lane.ready).length;
}

function openRolloutPhases(rolloutPlan: any): any[] {
  const phases = Array.isArray(rolloutPlan?.phases) ? rolloutPlan.phases : [];
  return phases.filter((phase: any) => !phase.completed);
}

function rolloutUnitsNeedingAttention(rolloutPlan: any): any[] {
  const units = Array.isArray(rolloutPlan?.rollout_units) ? rolloutPlan.rollout_units : [];
  return units.filter((unit: any) => !unit.ready_for_pilot);
}

function activityGroupRows(activityGroupReadiness: any): any[] {
  return Array.isArray(activityGroupReadiness?.flat_groups)
    ? activityGroupReadiness.flat_groups
    : [];
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

function factGrid(items: Array<[string, unknown]>) {
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

function statusRow({
  title,
  detail,
  status,
  rowKey,
}: {
  title: string;
  detail: string;
  status: unknown;
  rowKey: string;
}) {
  return (
    <div
      key={rowKey}
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

export default function CommunityDomainStructurePlanningPanels({
  rolloutPlan,
  activityMap,
  activityGroupReadiness,
}: StructurePlanningPanelsProps) {
  const rolloutPlanCounts = rolloutPlan?.counts || {};
  const visibleRolloutPhases = openRolloutPhases(rolloutPlan);
  const rolloutUnitsWithAttention = rolloutUnitsNeedingAttention(rolloutPlan);
  const activityMapSummary = activityMap?.summary || {};
  const activityMapTemplate = activityMap?.template || {};
  const visibleActivityMapLanes = readinessLanes(activityMap);
  const blockedActivityMapLanes = visibleActivityMapLanes.filter((lane) => !lane.ready);
  const activityMapReadyTotal = readyTotal(activityMap, visibleActivityMapLanes);
  const activityGroupSummary = activityGroupReadiness?.summary || {};
  const visibleActivityGroups = activityGroupRows(activityGroupReadiness);
  const blockedActivityGroups = visibleActivityGroups.filter(
    (group) => !group.ready_for_activity_group_planning
  );
  const activityGroupReadyTotal = visibleActivityGroups.filter(
    (group) => group.ready_for_activity_group_planning
  ).length;

  return (
    <>
      <div style={softCard()}>
        <div style={sectionLabel()}>Rollout plan</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {rolloutPlan
            ? `${cleanText(
                rolloutPlan.primary_next_action?.label,
                "Review Community Domain rollout plan"
              )}. Current phase: ${compactStatus(rolloutPlan.rollout_phase)}.`
            : "GSN could not load the read-only rollout plan for this view."}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {[
            ["First units", rolloutPlanCounts.first_level_units],
            ["Ready units", rolloutPlanCounts.ready_units],
            ["Members", rolloutPlanCounts.active_members],
            ["Policies", rolloutPlanCounts.active_policies],
          ].map(([label, value]) => (
            <div key={String(label)} style={statusBadge(Number(value) > 0 ? "recorded" : "not recorded")}>
              {String(label)}: {countValue(value)}
            </div>
          ))}
        </div>
        {visibleRolloutPhases.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {visibleRolloutPhases.slice(0, 3).map((phase) =>
              statusRow({
                rowKey: cleanText(phase.phase_key, cleanText(phase.label, "phase")),
                title: cleanText(phase.label, "Rollout phase"),
                detail: cleanText(
                  phase.next_step,
                  "Review this rollout phase before wider launch."
                ),
                status: phase.status || "open",
              })
            )}
          </div>
        ) : rolloutPlan ? (
          <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
            No open rollout phase is visible in the read-only rollout plan.
          </div>
        ) : null}
        {rolloutUnitsWithAttention.length ? (
          <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
            Units needing attention:{" "}
            <strong>
              {rolloutUnitsWithAttention
                .slice(0, 3)
                .map((unit) => cleanText(unit.node?.name, "Operating unit"))
                .join(", ")}
            </strong>
            .
          </div>
        ) : rolloutPlan ? (
          <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
            No first rollout unit is marked as needing local admin or pilot member attention.
          </div>
        ) : null}
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          This rollout view does not create nodes, invite members, add members,
          assign admins, place members, create policy, open reviews, verify authority,
          activate billing, activate the Community Domain, publish a public page,
          create marketplace activity, create a social Community, move money, or
          expose private evidence.
        </div>
      </div>

      <div style={softCard()}>
        <div style={sectionLabel()}>Activity map</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {activityMap
            ? `${cleanText(
                activityMap.primary_next_action?.label,
                "Review activity boundaries"
              )}. ${activityMapReadyTotal} of ${visibleActivityMapLanes.length} activity checks are ready.`
            : "GSN could not load the read-only activity map for this Community Domain."}
        </div>
        {factGrid([
          ["Template lanes", activityMapSummary.activity_lane_count],
          ["Operating units", activityMapSummary.active_operating_unit_count],
          ["Members", activityMapSummary.active_member_count],
          [
            "Policies",
            activityMapSummary.active_policy_count == null
              ? "admin only"
              : countValue(activityMapSummary.active_policy_count),
          ],
        ])}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          <span style={statusBadge(activityMapTemplate.marketplace_role)}>
            Market: {compactStatus(activityMapTemplate.marketplace_role)}
          </span>
          <span style={statusBadge(activityMapSummary.paid_activity_status)}>
            Paid: {compactStatus(activityMapSummary.paid_activity_status)}
          </span>
          <span style={statusBadge(activityMapSummary.scheduled_activity_status)}>
            Scheduled: {compactStatus(activityMapSummary.scheduled_activity_status)}
          </span>
        </div>
        {blockedActivityMapLanes.length ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            Activity checks needing attention:{" "}
            <strong>
              {blockedActivityMapLanes
                .slice(0, 3)
                .map((lane) => cleanText(lane.label, lane.lane_key || "activity check"))
                .join(", ")}
            </strong>
            .
          </div>
        ) : activityMap ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            No blocked activity lane is visible, but paid activity, scheduled activity, and
            Trust Passport writes are still not connected here.
          </div>
        ) : null}
        {visibleActivityMapLanes.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {visibleActivityMapLanes.slice(0, 4).map((lane) =>
              statusRow({
                rowKey: cleanText(lane.lane_key, cleanText(lane.label, "activity")),
                title: cleanText(lane.label, "Activity check"),
                detail: cleanText(
                  lane.next_step,
                  "Keep this as activity planning until a real activity flow exists."
                ),
                status: lane.status,
              })
            )}
          </div>
        ) : null}
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          This activity map is read-only operating-activity planning. It does not
          create activities, events, meetings, classes, services, programmes,
          attendance, dues, levies, travel fees, contributions, tickets,
          subscriptions, payment instructions, invoices, receipts, bank matches,
          ledger entries, payouts, money movement, marketplace records, shops,
          listings, demand, Spotlight, notifications, TrustSlips, Trust Passport
          entries, public proof, or private member, review, evidence, or finance
          exposure.
        </div>
      </div>

      <div style={softCard()}>
        <div style={sectionLabel()}>Activity-group readiness</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {activityGroupReadiness
            ? `${cleanText(
                activityGroupReadiness.primary_next_action?.label,
                "Review activity-group readiness"
              )}. ${activityGroupReadyTotal} of ${visibleActivityGroups.length} group-like units are ready for future activity-group planning.`
            : "GSN could not load the read-only activity-group readiness map for this Community Domain."}
        </div>
        {factGrid([
          ["Candidates", activityGroupSummary.activity_group_candidate_count],
          ["Nodes", activityGroupSummary.node_count],
          [
            "Node members",
            activityGroupSummary.active_node_memberships == null
              ? "admin only"
              : countValue(activityGroupSummary.active_node_memberships),
          ],
          [
            "Policies",
            activityGroupSummary.active_policies == null
              ? "admin only"
              : countValue(activityGroupSummary.active_policies),
          ],
          [
            "Reviews",
            activityGroupSummary.review_records == null
              ? "admin only"
              : countValue(activityGroupSummary.review_records),
          ],
        ])}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          <span style={statusBadge(activityGroupSummary.activity_group_engine_status)}>
            Group engine: {compactStatus(activityGroupSummary.activity_group_engine_status)}
          </span>
          <span style={statusBadge("not_created_in_this_slice")}>
            Records created: {countValue(activityGroupSummary.activity_group_records_created)}
          </span>
          <span style={statusBadge("not_created_in_this_slice")}>
            ROSCA cycles: {countValue(activityGroupSummary.rosca_cycles_created)}
          </span>
        </div>
        {blockedActivityGroups.length ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            Group-like units needing attention:{" "}
            <strong>
              {blockedActivityGroups
                .slice(0, 3)
                .map((group) => cleanText(group.node?.name, "activity-group candidate"))
                .join(", ")}
            </strong>
            .
          </div>
        ) : activityGroupReadiness ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            No blocked activity-group candidate is visible, but the activity-group
            engine, attendance, payment, and Trust Passport writes are still not
            connected here.
          </div>
        ) : null}
        {visibleActivityGroups.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {visibleActivityGroups.slice(0, 4).map((group) =>
              statusRow({
                rowKey: cleanText(group.node?.id, cleanText(group.node?.name, "activity-group")),
                title: cleanText(group.node?.name, "Activity-group candidate"),
                detail: cleanText(
                  group.next_step,
                  "Keep this as group planning until a real activity-group engine exists."
                ),
                status: group.activity_group_status,
              })
            )}
          </div>
        ) : null}
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          This activity-group readiness map is read-only group planning. It does not
          create activity groups, ROSCA cycles, meetings, attendance records, payment
          instructions, ledger entries, notifications, marketplace records, money
          movement, TrustSlips, Trust Passport entries, or private member activity.
        </div>
      </div>
    </>
  );
}
