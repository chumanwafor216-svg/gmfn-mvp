import React from "react";

type BillingReadinessPanelsProps = {
  subscriptionLifecycle?: any;
  subscriptionReadyTotal?: number;
  visibleSubscriptionLanes?: any[];
  blockedSubscriptionLanes?: any[];
  subscriptionPackage?: Record<string, unknown>;
  subscriptionSummary?: Record<string, unknown>;
  capacityPlan?: any;
  visibleCapacityLanes?: any[];
  attentionCapacityLanes?: any[];
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

export default function CommunityDomainBillingReadinessPanels({
  subscriptionLifecycle,
  subscriptionReadyTotal = 0,
  visibleSubscriptionLanes = [],
  blockedSubscriptionLanes = [],
  subscriptionPackage = {},
  subscriptionSummary = {},
  capacityPlan,
  visibleCapacityLanes = [],
  attentionCapacityLanes = [],
}: BillingReadinessPanelsProps): React.ReactElement {
  return (
    <>
      <div style={softCard()}>
        <div style={sectionLabel()}>Subscription lifecycle</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {subscriptionLifecycle
            ? `${cleanText(
                subscriptionLifecycle.primary_next_action?.label,
                "Review subscription setup"
              )}. ${subscriptionReadyTotal} of ${visibleSubscriptionLanes.length} billing checks are ready.`
            : "GSN could not load the read-only subscription lifecycle view for this Community Domain."}
        </div>
        {factGrid([
          ["Package", cleanText(subscriptionPackage.package_name, "not selected")],
          ["Pricing", compactStatus(subscriptionPackage.pricing_status)],
          ["Billing", compactStatus(subscriptionSummary.billing_status)],
          ["Renewal", compactStatus(subscriptionSummary.renewal_status)],
        ])}
        {blockedSubscriptionLanes.length ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            Billing checks needing attention:{" "}
            <strong>
              {blockedSubscriptionLanes
                .slice(0, 3)
                .map((lane) => cleanText(lane.label, lane.lane_key || "billing check"))
                .join(", ")}
            </strong>
            .
          </div>
        ) : subscriptionLifecycle ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            No blocked billing lane is visible, but payment and renewal automation are
            still not connected here.
          </div>
        ) : null}
        {visibleSubscriptionLanes.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {visibleSubscriptionLanes.slice(0, 4).map((lane) =>
              statusRow(
                cleanText(lane.lane_key, cleanText(lane.label, "subscription")),
                cleanText(lane.label, "Subscription check"),
                cleanText(
                  lane.next_step,
                  cleanText(
                    lane.summary,
                    "Keep billing as planning until a real payment path exists."
                  )
                ),
                lane.status
              )
            )}
          </div>
        ) : null}
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          This subscription lifecycle view is read-only billing planning. It does not
          create quote acceptance, create payment instruction, create expected payment,
          record payment, confirm payment, create invoices, create receipts, activate
          billing, activate the Community Domain, create entitlements, renew a domain,
          suspend a domain, reactivate a domain, verify authority, move money, or
          expose private finance, member, evidence, or review records.
        </div>
      </div>

      <div style={softCard()}>
        <div style={sectionLabel()}>Capacity plan</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {capacityPlan
            ? `${cleanText(capacityPlan.package_name, "Community Domain package")} uses ${cleanText(
                capacityPlan.limits_source,
                "recorded package allowance"
              )}. ${cleanText(
                capacityPlan.primary_next_action?.label,
                "Review setup before relying on capacity."
              )}.`
            : "GSN could not load the read-only capacity plan for this view."}
        </div>
        {attentionCapacityLanes.length ? (
          <div style={{ ...helperText(), marginTop: 7, fontSize: 13 }}>
            Capacity attention:{" "}
            <strong>
              {attentionCapacityLanes
                .map((lane) => cleanText(lane.label, lane.lane_key || "capacity"))
                .join(", ")}
            </strong>
            .
          </div>
        ) : capacityPlan ? (
          <div style={{ ...helperText(), marginTop: 7, fontSize: 13 }}>
            No near-limit or over-limit package lane is visible.
          </div>
        ) : null}
        {visibleCapacityLanes.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {visibleCapacityLanes.slice(0, 5).map((lane) => {
              const used = lane.metered ? countValue(lane.used) : "not metered";
              const limit = lane.limit == null ? "not set" : countValue(lane.limit);
              const remaining =
                lane.remaining == null ? "not metered" : countValue(lane.remaining);
              return statusRow(
                cleanText(lane.lane_key, cleanText(lane.label, "capacity")),
                cleanText(lane.label, "Capacity lane"),
                `Used: ${used}. Limit: ${limit}. Remaining: ${remaining}.`,
                lane.status
              );
            })}
          </div>
        ) : null}
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          This capacity view does not increase limits, create nodes, add members,
          assign roles, create shops, meter live shop usage, meter storage usage,
          change pricing, activate billing, verify authority, move money, publish
          a public page, or expose private evidence.
        </div>
      </div>
    </>
  );
}
