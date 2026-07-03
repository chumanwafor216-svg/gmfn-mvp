import React, { useState } from "react";
import { StableButton } from "../../components/StableButton";
import { humanStatus } from "./statusLanguage";

type IdentityReadinessPanelsProps = {
  domain?: Record<string, any>;
  template?: Record<string, any>;
  status?: Record<string, unknown>;
  renewalState?: unknown;
  institutionalProfile?: any;
  socialBridge?: any;
  affiliationReadiness?: any;
};

type IdentityDetailKey = "identity" | "profile" | "bridge" | "affiliation";

const IDENTITY_DETAIL_OPTIONS: Array<{
  key: IdentityDetailKey;
  label: string;
  note: string;
}> = [
  {
    key: "identity",
    label: "Domain identity",
    note: "Confirm the public-safe identity anchor for this institution.",
  },
  {
    key: "profile",
    label: "Profile",
    note: "Review institutional profile readiness and market posture.",
  },
  {
    key: "bridge",
    label: "Bridge",
    note: "Check ordinary-community bridge readiness boundaries.",
  },
  {
    key: "affiliation",
    label: "Affiliation",
    note: "Review parent, child, and domain relationship readiness.",
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

export default function CommunityDomainIdentityReadinessPanels({
  domain = {},
  template = {},
  status = {},
  renewalState,
  institutionalProfile,
  socialBridge,
  affiliationReadiness,
}: IdentityReadinessPanelsProps): React.ReactElement {
  const institutionalProfileSummary = institutionalProfile?.summary || {};
  const institutionalProfileDetails = institutionalProfile?.institutional_profile || {};
  const visibleInstitutionalProfileLanes = readinessLanes(institutionalProfile);
  const blockedInstitutionalProfileLanes = blockedLanes(
    visibleInstitutionalProfileLanes
  );
  const institutionalProfileReadyTotal = readyTotal(
    institutionalProfile,
    visibleInstitutionalProfileLanes
  );
  const socialBridgeSummary = socialBridge?.summary || {};
  const linkedSocialCommunity = socialBridge?.linked_community || {};
  const visibleSocialBridgeLanes = readinessLanes(socialBridge);
  const blockedSocialBridgeLanes = blockedLanes(visibleSocialBridgeLanes);
  const socialBridgeReadyTotal = readyTotal(socialBridge, visibleSocialBridgeLanes);
  const affiliationSummary = affiliationReadiness?.summary || {};
  const visibleAffiliationLanes = readinessLanes(affiliationReadiness);
  const blockedAffiliationLanes = blockedLanes(visibleAffiliationLanes);
  const affiliationReadyTotal = readyTotal(
    affiliationReadiness,
    visibleAffiliationLanes
  );
  const [activeIdentityDetail, setActiveIdentityDetail] =
    useState<IdentityDetailKey>("identity");
  const selectedIdentityDetail =
    IDENTITY_DETAIL_OPTIONS.find((option) => option.key === activeIdentityDetail) ||
    IDENTITY_DETAIL_OPTIONS[0];

  return (
    <>
      <div
        style={{
          ...softCard(),
          display: "grid",
          gap: 10,
        }}
      >
        <div style={sectionLabel()}>Identity focus</div>
        <div style={helperText()}>
          Open one identity packet at a time. Current view:{" "}
          <strong>{selectedIdentityDetail.label}</strong>.
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
            gap: 8,
          }}
        >
          {IDENTITY_DETAIL_OPTIONS.map((option) => {
            const selected = option.key === activeIdentityDetail;
            return (
              <StableButton
                key={option.key}
                type="button"
                kind={selected ? "primary" : "secondary"}
                stableHeight={48}
                fullWidth
                aria-pressed={selected}
                title={option.note}
                debugId={`community-domain-identity.detail.${option.key}`}
                onClick={() => setActiveIdentityDetail(option.key)}
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
          {selectedIdentityDetail.note}
        </div>
      </div>

      {activeIdentityDetail === "identity" ? (
      <div style={softCard()}>
        <div style={sectionLabel()}>Domain identity</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          This lane shows the public-safe identity anchor for this Community Domain. It
          helps members confirm they are working inside the right institution before
          structure, billing, services, or trust evidence are used.
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))",
            gap: 8,
            marginTop: 10,
          }}
        >
          {[
            ["Code", cleanText(domain.domain_name, "not recorded")],
            ["Owner", cleanText(domain.owner_user_id, "not recorded")],
            ["Template", cleanText(template.label, "Institution")],
            [
              "Location",
              cleanText(
                [domain.state, domain.country].filter(Boolean).join(", "),
                "not recorded"
              ),
            ],
          ].map(([label, value]) => (
            <div key={String(label)} style={statusBadge(value)}>
              {String(label)}: {String(value)}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          <span style={statusBadge(status.domain_status)}>
            Domain: {compactStatus(status.domain_status)}
          </span>
          <span style={statusBadge(status.verification_status)}>
            Verification: {compactStatus(status.verification_status)}
          </span>
          <span style={statusBadge(renewalState)}>
            Renewal: {compactStatus(renewalState)}
          </span>
        </div>
        {domain.public_profile ? (
          <div style={{ ...helperText(), marginTop: 10 }}>
            Public profile: {cleanText(domain.public_profile)}
          </div>
        ) : (
          <div style={{ ...helperText(), marginTop: 10 }}>
            No public profile text is recorded yet for this domain.
          </div>
        )}
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          This summary shows public-safe identity only. It does not expose owner
          contact details, private member lists, finance records, evidence files,
          or verification proof.
        </div>
      </div>
      ) : null}

      {activeIdentityDetail === "profile" ? (
      <div style={softCard()}>
        <div style={sectionLabel()}>Institutional profile</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {institutionalProfile
            ? `${cleanText(
                institutionalProfile.primary_next_action?.label,
                "Review the institutional profile"
              )}. ${institutionalProfileReadyTotal} of ${visibleInstitutionalProfileLanes.length} institutional checks are ready.`
            : "GSN could not load the institutional profile for this Community Domain."}
        </div>
        {factGrid([
          [
            "Template",
            cleanText(
              institutionalProfileDetails.template_label,
              cleanText(template.label, "Institution")
            ),
          ],
          [
            "Market posture",
            compactStatus(institutionalProfileDetails.marketplace_role),
          ],
          ["Members", countValue(institutionalProfileSummary.active_member_count)],
          [
            "Policies",
            institutionalProfileSummary.active_policy_count == null
              ? "admin only"
              : countValue(institutionalProfileSummary.active_policy_count),
          ],
        ])}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          <span style={statusBadge(institutionalProfileSummary.domain_status)}>
            Domain: {compactStatus(institutionalProfileSummary.domain_status)}
          </span>
          <span style={statusBadge(institutionalProfileSummary.verification_status)}>
            Verification: {compactStatus(institutionalProfileSummary.verification_status)}
          </span>
          <span
            style={statusBadge(
              institutionalProfileSummary.structure_ready ? "ready" : "needs structure"
            )}
          >
            Structure:{" "}
            {institutionalProfileSummary.structure_ready ? "ready" : "needs structure"}
          </span>
          <span
            style={statusBadge(
              institutionalProfileSummary.authority_verified ? "verified" : "unverified"
            )}
          >
            Authority:{" "}
            {institutionalProfileSummary.authority_verified ? "verified" : "unverified"}
          </span>
        </div>
        {blockedInstitutionalProfileLanes.length ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            Institutional checks needing attention:{" "}
            <strong>
              {blockedInstitutionalProfileLanes
                .slice(0, 3)
                .map((lane) =>
                  cleanText(lane.label, lane.lane_key || "institutional check")
                )
                .join(", ")}
            </strong>
            .
          </div>
        ) : institutionalProfile ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            No blocked institutional lane is visible, but verification, publication,
            billing, and advanced profile setup are still separate.
          </div>
        ) : null}
        {visibleInstitutionalProfileLanes.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {visibleInstitutionalProfileLanes.slice(0, 4).map((lane) =>
              statusRow(
                cleanText(
                  lane.lane_key,
                  cleanText(lane.label, "institutional profile")
                ),
                cleanText(lane.label, "Institutional check"),
                cleanText(
                  lane.next_step,
                  "Keep this as institution planning until the matching operating path exists."
                ),
                lane.status
              )
            )}
          </div>
        ) : null}
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          This view only shows institutional profile readiness. It does not create
          structures, members, policies, reviews, evidence, billing packages,
          shops, payments, finance records, community links, verification,
          activation, public pages, or private records.
        </div>
      </div>
      ) : null}

      {activeIdentityDetail === "bridge" ? (
      <div style={softCard()}>
        <div style={sectionLabel()}>Community bridge readiness</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {socialBridge
            ? `${cleanText(
                socialBridge.primary_next_action?.label,
                "Review community bridge boundaries"
              )}. ${socialBridgeReadyTotal} of ${visibleSocialBridgeLanes.length} bridge checks are ready.`
            : "GSN could not load the community bridge view for this Community Domain."}
        </div>
        {factGrid([
          ["Bridge", compactStatus(socialBridgeSummary.bridge_status)],
          ["Linked Community", compactStatus(linkedSocialCommunity.status)],
          ["Upgrade path", compactStatus(socialBridgeSummary.upgrade_path_status)],
          [
            "Members",
            socialBridgeSummary.linked_member_count == null
              ? "admin only"
              : countValue(socialBridgeSummary.linked_member_count),
          ],
        ])}
        {blockedSocialBridgeLanes.length ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            Bridge checks needing attention:{" "}
            <strong>
              {blockedSocialBridgeLanes
                .slice(0, 3)
                .map((lane) => cleanText(lane.label, lane.lane_key || "bridge check"))
                .join(", ")}
            </strong>
            .
          </div>
        ) : socialBridge ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            No blocked community bridge lane is visible, but Community upgrade and
            member movement are still not connected here.
          </div>
        ) : null}
        {visibleSocialBridgeLanes.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {visibleSocialBridgeLanes.slice(0, 4).map((lane) =>
              statusRow(
                cleanText(lane.lane_key, cleanText(lane.label, "community bridge")),
                cleanText(lane.label, "Bridge check"),
                cleanText(
                  lane.next_step,
                  "Keep this as relationship planning until a real bridge path exists."
                ),
                lane.status
              )
            )}
          </div>
        ) : null}
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          This view only shows community bridge readiness. It does not create or
          upgrade an ordinary community, connect private records, decide
          affiliations, copy or invite members, move marketplace activity,
          activate billing, verify authority, merge records, or expose private
          member records.
        </div>
      </div>
      ) : null}

      {activeIdentityDetail === "affiliation" ? (
      <div style={softCard()}>
        <div style={sectionLabel()}>Affiliation readiness</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {affiliationReadiness
            ? `${cleanText(
                affiliationReadiness.primary_next_action?.label,
                "Review affiliation readiness"
              )}. ${affiliationReadyTotal} of ${visibleAffiliationLanes.length} affiliation checks are ready.`
            : "GSN could not load the affiliation readiness view for this Community Domain."}
        </div>
        {factGrid([
          ["Bridge", compactStatus(affiliationSummary.bridge_status)],
          [
            "Affiliation engine",
            compactStatus(affiliationSummary.domain_affiliation_engine_status),
          ],
          [
            "Approved",
            affiliationSummary.approved_affiliations == null
              ? "admin only"
              : countValue(affiliationSummary.approved_affiliations),
          ],
          [
            "Pending",
            affiliationSummary.pending_affiliations == null
              ? "admin only"
              : countValue(affiliationSummary.pending_affiliations),
          ],
        ])}
        {blockedAffiliationLanes.length ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            Affiliation checks needing attention:{" "}
            <strong>
              {blockedAffiliationLanes
                .slice(0, 3)
                .map((lane) =>
                  cleanText(lane.label, lane.lane_key || "affiliation check")
                )
                .join(", ")}
            </strong>
            .
          </div>
        ) : affiliationReadiness ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            No blocked affiliation lane is visible, but domain-to-domain affiliation
            is still not connected here.
          </div>
        ) : null}
        {visibleAffiliationLanes.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {visibleAffiliationLanes.slice(0, 4).map((lane) =>
              statusRow(
                cleanText(lane.lane_key, cleanText(lane.label, "affiliation")),
                cleanText(lane.label, "Affiliation check"),
                cleanText(
                  lane.next_step,
                  "Keep this as affiliation planning until a real domain relationship path exists."
                ),
                lane.status
              )
            )}
          </div>
        ) : null}
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          This view only shows affiliation readiness. It does not create parent
          or child Community Domain links, approve requests, set community links,
          copy or transfer members, inherit policy, activate billing, verify
          authority, publish public links, create marketplace activity, move
          money, create trust records, or expose private records.
        </div>
      </div>
      ) : null}
    </>
  );
}
