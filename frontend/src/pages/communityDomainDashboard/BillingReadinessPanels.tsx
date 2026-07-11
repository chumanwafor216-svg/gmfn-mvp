import React, { useState } from "react";
import { StableButton } from "../../components/StableButton";
import { humanStatus } from "./statusLanguage";

type BillingReadinessPanelsProps = {
  subscriptionLifecycle?: any;
  capacityPlan?: any;
};

type BillingDetailKey = "lifecycle" | "capacity";

const BILLING_DETAIL_OPTIONS: Array<{
  key: BillingDetailKey;
  label: string;
  note: string;
}> = [
  {
    key: "lifecycle",
    label: "Lifecycle",
    note: "Package, price, billing, renewal.",
  },
  {
    key: "capacity",
    label: "Capacity",
    note: "Limits and remaining room.",
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

function blockedLanes(lanes: any[]): any[] {
  return lanes.filter((lane) => !lane.ready);
}

function readyTotal(map: any, lanes: any[]): number {
  return typeof map?.ready_total === "number"
    ? map.ready_total
    : lanes.filter((lane) => lane.ready).length;
}

function attentionCapacityLanes(lanes: any[]): any[] {
  return lanes.filter((lane) => {
    const statusText = cleanText(lane.status).toLowerCase();
    return statusText.includes("near") || statusText.includes("over");
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
    lineHeight: 1.42,
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
    lineHeight: 1.15,
    color: positive ? "#15573A" : attention ? "#7A4B00" : "#25415F",
    background: positive ? "#E7F8EF" : attention ? "#FFF3D8" : "#EEF4FB",
    border: `1px solid ${
      positive ? "rgba(21,87,58,0.16)" : attention ? "rgba(122,75,0,0.18)" : "rgba(37,65,95,0.14)"
    }`,
    textTransform: "capitalize",
    maxWidth: "100%",
    whiteSpace: "normal",
    overflowWrap: "normal",
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
        padding: "12px",
        minWidth: 0,
      }}
    >
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontWeight: 950, fontSize: 15, lineHeight: 1.18 }}>
          {title}
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
          {detail}
        </span>
      </span>
      <span style={{ ...statusBadge(status), justifySelf: "start" }}>{compactStatus(status)}</span>
    </div>
  );
}

export default function CommunityDomainBillingReadinessPanels({
  subscriptionLifecycle,
  capacityPlan,
}: BillingReadinessPanelsProps): React.ReactElement {
  const subscriptionSummary = subscriptionLifecycle?.summary || {};
  const subscriptionPackage = subscriptionLifecycle?.package || {};
  const visibleSubscriptionLanes = readinessLanes(subscriptionLifecycle);
  const blockedSubscriptionLanes = blockedLanes(visibleSubscriptionLanes);
  const subscriptionReadyTotal = readyTotal(
    subscriptionLifecycle,
    visibleSubscriptionLanes
  );
  const visibleCapacityLanes = readinessLanes(capacityPlan);
  const capacityAttentionLanes = attentionCapacityLanes(visibleCapacityLanes);
  const [activeBillingDetail, setActiveBillingDetail] =
    useState<BillingDetailKey>("lifecycle");
  const selectedBillingDetail =
    BILLING_DETAIL_OPTIONS.find((option) => option.key === activeBillingDetail) ||
    BILLING_DETAIL_OPTIONS[0];

  return (
    <>
      <div
        style={{
          ...softCard(),
          display: "grid",
          gap: 10,
        }}
      >
        <div style={sectionLabel()}>Billing focus</div>
        <div style={helperText()}>
          Current view: <strong>{selectedBillingDetail.label}</strong>.
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
            gap: 8,
          }}
        >
          {BILLING_DETAIL_OPTIONS.map((option) => {
            const selected = option.key === activeBillingDetail;
            return (
              <StableButton
                key={option.key}
                type="button"
                kind={selected ? "primary" : "secondary"}
                stableHeight={48}
                fullWidth
                aria-pressed={selected}
                title={option.note}
                debugId={`community-domain-billing.detail.${option.key}`}
                onClick={() => setActiveBillingDetail(option.key)}
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
        <div style={{ ...helperText(), fontSize: 13 }}>
          {selectedBillingDetail.note}
        </div>
      </div>

      {activeBillingDetail === "lifecycle" ? (
      <div style={softCard()}>
        <div style={sectionLabel()}>Subscription lifecycle</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {subscriptionLifecycle
            ? `${cleanText(
                subscriptionLifecycle.primary_next_action?.label,
                "Review subscription setup"
              )}. ${subscriptionReadyTotal}/${visibleSubscriptionLanes.length} ready.`
            : "GSN could not load the billing readiness view for this Community Domain."}
        </div>
        {factGrid([
          ["Package", cleanText(subscriptionPackage.package_name, "not selected")],
          ["Pricing", compactStatus(subscriptionPackage.pricing_status)],
          ["Billing", compactStatus(subscriptionSummary.billing_status)],
          ["Renewal", compactStatus(subscriptionSummary.renewal_status)],
        ])}
        {blockedSubscriptionLanes.length ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            Needs attention:{" "}
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
            No billing blocker visible here.
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
                    "Planning only until payment is confirmed."
                  )
                ),
                lane.status
              )
            )}
          </div>
        ) : null}
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          Status only. Payment, receipts, activation, renewal, money movement,
          and private records stay separate.
        </div>
      </div>
      ) : null}

      {activeBillingDetail === "capacity" ? (
      <div style={softCard()}>
        <div style={sectionLabel()}>Package capacity</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {capacityPlan
            ? `${cleanText(capacityPlan.package_name, "Community Domain package")}: ${cleanText(
                capacityPlan.limits_source,
                "recorded package allowance"
              )}. ${cleanText(
                capacityPlan.primary_next_action?.label,
                "Review setup before relying on capacity"
              )}.`
            : "GSN could not load the capacity plan for this view."}
        </div>
        {capacityAttentionLanes.length ? (
          <div style={{ ...helperText(), marginTop: 7, fontSize: 13 }}>
            Capacity attention:{" "}
            <strong>
              {capacityAttentionLanes
                .map((lane) => cleanText(lane.label, lane.lane_key || "capacity"))
                .join(", ")}
            </strong>
            .
          </div>
        ) : capacityPlan ? (
          <div style={{ ...helperText(), marginTop: 7, fontSize: 13 }}>
            No limit needs attention here.
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
          Limits only. It does not add units, members, shops, pricing, billing,
          pages, money movement, or private evidence.
        </div>
      </div>
      ) : null}
    </>
  );
}
