import React, { useState } from "react";
import { StableButton } from "../../components/StableButton";
import { humanStatus } from "./statusLanguage";

type ServiceReadinessPanelsProps = {
  moduleScopeReadiness?: any;
  moduleKeys?: unknown[];
  billingStatus?: unknown;
  quote?: any;
  serviceSettingsProjection?: any;
  economicParticipation?: any;
  networkPresence?: any;
  children?: React.ReactNode;
};

type ServiceReadinessItem = {
  module_key?: string | null;
  label?: string | null;
  summary?: string | null;
  enabled_by_template?: boolean;
  module_scope_status?: string | null;
  ready_for_future_module_scope?: boolean;
  next_step?: string | null;
  route_hint?: string | null;
  requires_admin?: boolean;
};

type ServiceReadinessRow = {
  key: string;
  label: string;
  status: string;
  detail: string;
};

type ServiceFocusKey = "services" | "settings" | "economy" | "presence";

const SERVICE_FOCUS_OPTIONS: Array<{
  key: ServiceFocusKey;
  label: string;
  note: string;
}> = [
  {
    key: "services",
    label: "Services",
    note: "Shops, Spotlight, Vault, Verification, Trust Centre, Analytics, Billing, Settings.",
  },
  {
    key: "settings",
    label: "Settings",
    note: "Included and optional service choices from the domain template.",
  },
  {
    key: "economy",
    label: "Economy",
    note: "Marketplace, shop, listing, finance, and member activity readiness.",
  },
  {
    key: "presence",
    label: "Presence",
    note: "Public profile, URL, social bridge, and outward visibility checks.",
  },
];

const SERVICE_SCOPE_NOTE =
  "Readiness only: no service activation, billing, permissions, publishing, money movement, proof, or private records.";

const MODULE_LABELS: Record<string, string> = {
  governance: "Governance",
  members: "Members",
  departments: "Structure",
  shops: "Shops",
  marketplace: "Marketplace",
  spotlight: "Spotlight",
  vault: "Vault",
  verification: "Verification",
  trust_centre: "Trust Centre",
  analytics: "Analytics",
  billing: "Billing",
  settings: "Settings",
};

const SERVICE_READINESS_KEYS = [
  "shops",
  "spotlight",
  "vault",
  "verification",
  "trust_centre",
  "analytics",
] as const;

function cleanText(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function compactStatus(value: unknown): string {
  return humanStatus(value);
}

function countValue(value: unknown): string {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? String(numberValue) : "0";
}

function projectionItems(projection: any): any[] {
  return Array.isArray(projection?.items) ? projection.items : [];
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

function moduleLabel(moduleKey: unknown): string {
  const key = cleanText(moduleKey);
  return MODULE_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (x) => x.toUpperCase());
}

function serviceReadinessStatus(item: ServiceReadinessItem | undefined, fallbackEnabled: boolean): string {
  const status = cleanText(item?.module_scope_status).toLowerCase();
  if (!item) return fallbackEnabled ? "template listed" : "not listed";
  if (status === "ready_for_future_module_scope") return "planning ready";
  if (status === "needs_operating_units") return "needs structure";
  if (status === "needs_node_participants") return "needs placements";
  if (status === "needs_domain_policy") return "needs domain policy";
  if (status === "needs_scope_policy") return "needs service policy";
  if (status === "needs_review_signal") return "needs review signal";
  if (status === "optional_module_not_enabled") return "optional, not included";
  return compactStatus(status || (item.ready_for_future_module_scope ? "planning ready" : "not ready"));
}

function serviceFallbackDetail(fallbackEnabled: boolean): string {
  if (fallbackEnabled) {
    return "Included by this Community Domain template. Readiness details are not available yet.";
  }
  return "Not included by the current template unless an owner later adds it.";
}

function serviceReadinessRows(
  moduleScopeReadiness: any,
  moduleKeys: unknown[],
  billingStatus: unknown,
  quote: any
): ServiceReadinessRow[] {
  const readinessItems: ServiceReadinessItem[] = Array.isArray(moduleScopeReadiness?.modules)
    ? moduleScopeReadiness.modules
    : [];
  const byKey = new Map(
    readinessItems
      .map((item) => [cleanText(item.module_key), item] as const)
      .filter(([key]) => Boolean(key))
  );
  const listedKeys = new Set(moduleKeys.map((key) => cleanText(key)));
  const rows: ServiceReadinessRow[] = SERVICE_READINESS_KEYS.map((serviceKey) => {
    const item = byKey.get(serviceKey);
    const fallbackEnabled = listedKeys.has(serviceKey);
    return {
      key: serviceKey,
      label: cleanText(item?.label, moduleLabel(serviceKey)),
      status: serviceReadinessStatus(item, fallbackEnabled),
      detail: cleanText(
        item?.next_step || item?.summary,
        serviceFallbackDetail(fallbackEnabled)
      ),
    };
  });
  const billingIsActive = cleanText(billingStatus).toLowerCase() === "active";

  rows.push({
    key: "billing",
    label: "Billing",
    status: compactStatus(billingStatus || quote?.pricing_status || quote?.quote_status),
    detail: billingIsActive
      ? "Billing is shown as active here, but payment steps and renewals remain separate owner or admin work."
      : "Package, payment step, activation, and renewal are still separate from service readiness.",
  });
  rows.push({
    key: "settings",
    label: "Settings",
    status: moduleScopeReadiness ? "planning only" : "not available yet",
    detail: moduleScopeReadiness
      ? "Settings are shown as planning status here. This page does not enable services or grant permissions."
      : "Service settings could not be loaded for this view. No setting has been changed.",
  });

  return rows;
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

export default function CommunityDomainServiceReadinessPanels({
  moduleScopeReadiness,
  moduleKeys = [],
  billingStatus,
  quote,
  serviceSettingsProjection,
  economicParticipation,
  networkPresence,
  children,
}: ServiceReadinessPanelsProps): React.ReactElement {
  const visibleServiceReadinessRows = serviceReadinessRows(
    moduleScopeReadiness,
    moduleKeys,
    billingStatus,
    quote
  );
  const visibleServiceSettingsItems = projectionItems(serviceSettingsProjection);
  const enabledServiceSettingsItems = visibleServiceSettingsItems.filter(
    (item) => item.enabled
  );
  const optionalServiceSettingsItems = visibleServiceSettingsItems.filter(
    (item) => !item.enabled
  );
  const economicParticipationCounts = economicParticipation?.counts || {};
  const economicParticipationTemplate = economicParticipation?.template || {};
  const visibleEconomicParticipationLanes = readinessLanes(economicParticipation);
  const blockedEconomicParticipationLanes = blockedLanes(
    visibleEconomicParticipationLanes
  );
  const economicParticipationReadyTotal = readyTotal(
    economicParticipation,
    visibleEconomicParticipationLanes
  );
  const networkPresenceIdentity = networkPresence?.identity || {};
  const networkPresenceStatus = networkPresence?.status || {};
  const visibleNetworkPresenceLanes = readinessLanes(networkPresence);
  const blockedNetworkPresenceLanes = blockedLanes(visibleNetworkPresenceLanes);
  const networkPresenceReadyTotal = readyTotal(
    networkPresence,
    visibleNetworkPresenceLanes
  );
  const [activeServiceFocus, setActiveServiceFocus] =
    useState<ServiceFocusKey>("services");
  const selectedServiceFocus =
    SERVICE_FOCUS_OPTIONS.find((option) => option.key === activeServiceFocus) ||
    SERVICE_FOCUS_OPTIONS[0];

  return (
    <>
      <div
        style={{
          ...softCard(),
          display: "grid",
          gap: 10,
        }}
      >
        <div style={sectionLabel()}>Readiness packet</div>
        <div style={helperText()}>
          Current view: <strong>{selectedServiceFocus.label}</strong>.
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 132px), 1fr))",
            gap: 8,
          }}
        >
          {SERVICE_FOCUS_OPTIONS.map((option) => {
            const selected = option.key === activeServiceFocus;
            return (
              <StableButton
                key={option.key}
                type="button"
                kind={selected ? "primary" : "secondary"}
                stableHeight={48}
                fullWidth
                aria-pressed={selected}
                title={option.note}
                debugId={`community-domain-service-readiness.focus.${option.key}`}
                onClick={() => setActiveServiceFocus(option.key)}
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
          {selectedServiceFocus.note}
        </div>
        <div style={{ ...helperText(), fontSize: 13 }}>
          {SERVICE_SCOPE_NOTE}
        </div>
      </div>

      {activeServiceFocus === "services" ? (
      <div style={softCard()}>
        <div style={sectionLabel()}>Service readiness</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          Service rows for this Community Domain.
        </div>
        {moduleScopeReadiness?.primary_next_action?.label ? (
          <div style={{ ...helperText(), marginTop: 7 }}>
            Next owner/admin step:{" "}
            <strong>{moduleScopeReadiness.primary_next_action.label}</strong>.
          </div>
        ) : null}
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {visibleServiceReadinessRows.map((row) =>
            statusRow(row.key, row.label, row.detail, row.status)
          )}
        </div>
      </div>
      ) : null}

      {activeServiceFocus === "settings" ? (
      <div style={softCard()}>
        <div style={sectionLabel()}>Service settings view</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {serviceSettingsProjection
            ? `${countValue(
                serviceSettingsProjection.enabled_total
              )} template services are included and ${countValue(
                serviceSettingsProjection.optional_total
              )} optional services remain only catalogue options.`
            : "GSN could not load the service settings view for this Community Domain."}
        </div>
        {factGrid([
          ["Template", cleanText(serviceSettingsProjection?.template_key, "not available yet")],
          ["Domain type", compactStatus(serviceSettingsProjection?.domain_type)],
          ["Included", countValue(serviceSettingsProjection?.enabled_total)],
          ["Optional", countValue(serviceSettingsProjection?.optional_total)],
        ])}
        {visibleServiceSettingsItems.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {[...enabledServiceSettingsItems, ...optionalServiceSettingsItems]
              .slice(0, 5)
              .map((item) =>
                statusRow(
                  cleanText(item.module_key, cleanText(item.label, "service setting")),
                  cleanText(item.label, "Service setting"),
                  cleanText(item.summary, "Template-defined Community Domain service."),
                  item.status
                )
              )}
          </div>
        ) : null}
      </div>
      ) : null}

      {activeServiceFocus === "services" ? children : null}

      {activeServiceFocus === "economy" ? (
      <div style={softCard()}>
        <div style={sectionLabel()}>Economic participation</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {economicParticipation
              ? `${cleanText(
                economicParticipation.primary_next_action?.label,
                "Review economic participation"
              )}. ${economicParticipationReadyTotal} of ${visibleEconomicParticipationLanes.length} economic checks are ready as template guidance.`
            : "GSN could not load the economic participation view for this Community Domain."}
        </div>
        {factGrid([
          ["Market role", compactStatus(economicParticipationTemplate.marketplace_role)],
          ["Units", countValue(economicParticipationCounts.nodes)],
          ["Members", countValue(economicParticipationCounts.active_members)],
          ["Shops", countValue(economicParticipationCounts.shops)],
          ["Listings", countValue(economicParticipationCounts.listings)],
          ["Finance", countValue(economicParticipationCounts.finance_records)],
        ])}
        {blockedEconomicParticipationLanes.length ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            Economic checks still not connected:{" "}
            <strong>
              {blockedEconomicParticipationLanes
                .slice(0, 3)
                .map((lane) => cleanText(lane.label, lane.lane_key || "economic check"))
                .join(", ")}
            </strong>
            .
          </div>
        ) : economicParticipation ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            No blocked economic check is visible, but no marketplace or finance
            records are created here.
          </div>
        ) : null}
        {visibleEconomicParticipationLanes.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {visibleEconomicParticipationLanes.slice(0, 4).map((lane) =>
              statusRow(
                cleanText(lane.lane_key, cleanText(lane.label, "economic participation")),
                cleanText(lane.label, "Economic check"),
                cleanText(
                  lane.next_step,
                  cleanText(
                    lane.summary,
                    "Keep this as economic readiness until the real operating area exists."
                  )
                ),
                lane.status
              )
            )}
          </div>
        ) : null}
      </div>
      ) : null}

      {activeServiceFocus === "presence" ? (
      <div style={softCard()}>
        <div style={sectionLabel()}>Network presence</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {networkPresence
            ? `${cleanText(
                networkPresence.primary_next_action?.label,
                "Review public presence"
              )}. ${networkPresenceReadyTotal} of ${visibleNetworkPresenceLanes.length} public-presence checks are ready.`
            : "GSN could not load the network presence view for this Community Domain."}
        </div>
        {factGrid([
          [
            "Public profile",
            networkPresenceIdentity.public_profile_present ? "ready" : "needed",
          ],
          ["Public URL", compactStatus(networkPresenceStatus.public_url_status)],
          ["Verification", compactStatus(networkPresenceStatus.verification_status)],
          ["Market role", compactStatus(networkPresenceStatus.marketplace_role)],
          [
            "Social bridge",
            compactStatus(networkPresenceStatus.social_community_bridge_status),
          ],
        ])}
        {blockedNetworkPresenceLanes.length ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            Public-presence checks needing attention:{" "}
            <strong>
              {blockedNetworkPresenceLanes
                .slice(0, 3)
                .map((lane) => cleanText(lane.label, lane.lane_key || "presence check"))
                .join(", ")}
            </strong>
            .
          </div>
        ) : networkPresence ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            No blocked public-presence check is visible, but this card does not
            publish the domain.
          </div>
        ) : null}
        {visibleNetworkPresenceLanes.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {visibleNetworkPresenceLanes.slice(0, 4).map((lane) =>
              statusRow(
                cleanText(lane.lane_key, cleanText(lane.label, "network presence")),
                cleanText(lane.label, "Network presence check"),
                cleanText(
                  lane.summary,
                  "Keep this as public-presence readiness until the real path exists."
                ),
                lane.status
              )
            )}
          </div>
        ) : null}
      </div>
      ) : null}
    </>
  );
}
