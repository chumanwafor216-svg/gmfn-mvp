import React from "react";

type ServiceReadinessPanelsProps = {
  moduleScopeReadiness?: any;
  serviceReadinessRows?: any[];
  serviceSettingsProjection?: any;
  visibleServiceSettingsItems?: any[];
  enabledServiceSettingsItems?: any[];
  optionalServiceSettingsItems?: any[];
  economicParticipation?: any;
  economicParticipationReadyTotal?: number;
  visibleEconomicParticipationLanes?: any[];
  blockedEconomicParticipationLanes?: any[];
  economicParticipationTemplate?: Record<string, unknown>;
  economicParticipationCounts?: Record<string, unknown>;
  networkPresence?: any;
  networkPresenceReadyTotal?: number;
  visibleNetworkPresenceLanes?: any[];
  blockedNetworkPresenceLanes?: any[];
  networkPresenceIdentity?: Record<string, unknown>;
  networkPresenceStatus?: Record<string, unknown>;
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

export default function CommunityDomainServiceReadinessPanels({
  moduleScopeReadiness,
  serviceReadinessRows = [],
  serviceSettingsProjection,
  visibleServiceSettingsItems = [],
  enabledServiceSettingsItems = [],
  optionalServiceSettingsItems = [],
  economicParticipation,
  economicParticipationReadyTotal = 0,
  visibleEconomicParticipationLanes = [],
  blockedEconomicParticipationLanes = [],
  economicParticipationTemplate = {},
  economicParticipationCounts = {},
  networkPresence,
  networkPresenceReadyTotal = 0,
  visibleNetworkPresenceLanes = [],
  blockedNetworkPresenceLanes = [],
  networkPresenceIdentity = {},
  networkPresenceStatus = {},
  children,
}: ServiceReadinessPanelsProps): React.ReactElement {
  return (
    <>
      <div style={softCard()}>
        <div style={sectionLabel()}>Service readiness</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          Shops, Spotlight, Vault, Verification, Trust Centre, Analytics, Billing,
          and Settings are shown as scoped planning rows for this Community Domain.
        </div>
        {moduleScopeReadiness?.primary_next_action?.label ? (
          <div style={{ ...helperText(), marginTop: 7 }}>
            Next owner/admin step:{" "}
            <strong>{moduleScopeReadiness.primary_next_action.label}</strong>.
          </div>
        ) : null}
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {serviceReadinessRows.map((row) =>
            statusRow(row.key, row.label, row.detail, row.status)
          )}
        </div>
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          This readiness view does not enable services, activate billing, grant
          permissions, publish Spotlight, create shops, open vault links, write Trust
          Passport records, or expose private member activity.
        </div>
      </div>

      <div style={softCard()}>
        <div style={sectionLabel()}>Service settings projection</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {serviceSettingsProjection
            ? `${countValue(
                serviceSettingsProjection.enabled_total
              )} template services are included and ${countValue(
                serviceSettingsProjection.optional_total
              )} optional services remain only catalogue options.`
            : "GSN could not load the read-only service settings projection for this Community Domain."}
        </div>
        {factGrid([
          ["Template", cleanText(serviceSettingsProjection?.template_key, "not loaded")],
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
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          This service settings projection is read-only template guidance. It does
          not persist settings, enable or disable modules, activate billing, activate
          the Community Domain, grant permissions, create shops, publish Spotlight,
          open vault links, issue TrustSlips, write Trust Passport records, or expose
          private records.
        </div>
      </div>

      {children}

      <div style={softCard()}>
        <div style={sectionLabel()}>Economic participation</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {economicParticipation
            ? `${cleanText(
                economicParticipation.primary_next_action?.label,
                "Review economic participation"
              )}. ${economicParticipationReadyTotal} of ${visibleEconomicParticipationLanes.length} economic lanes are ready as template guidance.`
            : "GSN could not load the read-only economic participation view for this Community Domain."}
        </div>
        {factGrid([
          ["Market role", compactStatus(economicParticipationTemplate.marketplace_role)],
          ["Nodes", countValue(economicParticipationCounts.nodes)],
          ["Members", countValue(economicParticipationCounts.active_members)],
          ["Shops", countValue(economicParticipationCounts.shops)],
          ["Listings", countValue(economicParticipationCounts.listings)],
          ["Finance", countValue(economicParticipationCounts.finance_records)],
        ])}
        {blockedEconomicParticipationLanes.length ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            Economic lanes still not connected:{" "}
            <strong>
              {blockedEconomicParticipationLanes
                .slice(0, 3)
                .map((lane) => cleanText(lane.label, lane.lane_key || "economic lane"))
                .join(", ")}
            </strong>
            .
          </div>
        ) : economicParticipation ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            No blocked economic lane is visible, but no marketplace or finance
            records are created here.
          </div>
        ) : null}
        {visibleEconomicParticipationLanes.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {visibleEconomicParticipationLanes.slice(0, 4).map((lane) =>
              statusRow(
                cleanText(lane.lane_key, cleanText(lane.label, "economic participation")),
                cleanText(lane.label, "Economic lane"),
                cleanText(
                  lane.next_step,
                  cleanText(
                    lane.summary,
                    "Keep this as economic readiness until the real lane exists."
                  )
                ),
                lane.status
              )
            )}
          </div>
        ) : null}
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          This economic participation view is read-only template and readiness
          guidance. It does not create a marketplace, create a shop, publish
          listings, create demand, place Spotlight, create vault links, move money,
          create payment instructions, create finance records, verify trust
          evidence, activate billing, activate the Community Domain, create a social
          Community, or expose private member activity.
        </div>
      </div>

      <div style={softCard()}>
        <div style={sectionLabel()}>Network presence</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {networkPresence
            ? `${cleanText(
                networkPresence.primary_next_action?.label,
                "Review public presence"
              )}. ${networkPresenceReadyTotal} of ${visibleNetworkPresenceLanes.length} public-presence checks are ready.`
            : "GSN could not load the read-only network presence view for this Community Domain."}
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
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          This network presence view is read-only guidance. It does not publish a
          public page, finalize whether public Community Domain URLs use
          /domains/:name or /community-domains/:name, create outward links, verify
          the domain, create marketplace exposure, create Spotlight placement, create
          vault links, create a social Community bridge, activate billing, activate
          the Community Domain, or expose private member activity.
        </div>
      </div>
    </>
  );
}
