import React, { useState } from "react";
import { StableButton, StableCtaLink } from "../../components/StableButton";
import { APP_ROUTES } from "../../lib/appRoutes";
import { humanStatus } from "./statusLanguage";

type TrustEvidenceReadinessPanelsProps = {
  evidenceRecordReadiness?: any;
  evidenceReleaseReadiness?: any;
  trustRelayReadiness?: any;
  notificationScopeReadiness?: any;
  trustMobility?: any;
};

type TrustEvidenceFocusKey =
  | "records"
  | "release"
  | "relay"
  | "notification"
  | "mobility";

const TRUST_EVIDENCE_FOCUS_OPTIONS: Array<{
  key: TrustEvidenceFocusKey;
  label: string;
  note: string;
}> = [
  {
    key: "records",
    label: "Records",
    note: "Organised activity records before public proof or impact claims.",
  },
  {
    key: "release",
    label: "Release",
    note: "Public-safe proof checks before anything leaves the community context.",
  },
  {
    key: "relay",
    label: "Relay",
    note: "Bridge readiness for trust signals that may travel beyond one group.",
  },
  {
    key: "notification",
    label: "Notify",
    note: "Audience scope checks before messages or announcements are sent.",
  },
  {
    key: "mobility",
    label: "Mobility",
    note: "Portability checks for trust context without exposing private records.",
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

function evidenceRecordTypes(map: any): any[] {
  return Array.isArray(map?.record_types) ? map.record_types : [];
}

function blockedEvidenceRecords(records: any[]): any[] {
  return records.filter((record) => !record.ready_for_future_evidence_record);
}

function computeEvidenceRecordReadyTotal(map: any, records: any[]): number {
  return typeof map?.ready_total === "number"
    ? map.ready_total
    : records.filter((record) => record.ready_for_future_evidence_record).length;
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

function actionLinkStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    borderRadius: 14,
    padding: "10px 12px",
    fontWeight: 900,
    textDecoration: "none",
    color: "#07172C",
    background: "#FFFFFF",
    border: "1px solid rgba(9,27,46,0.12)",
    boxShadow: "0 8px 18px rgba(9,27,46,0.08)",
    textAlign: "center",
  };
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

export default function CommunityDomainTrustEvidenceReadinessPanels({
  evidenceRecordReadiness,
  evidenceReleaseReadiness,
  trustRelayReadiness,
  notificationScopeReadiness,
  trustMobility,
}: TrustEvidenceReadinessPanelsProps): React.ReactElement {
  const evidenceRecordSummary = evidenceRecordReadiness?.summary || {};
  const visibleEvidenceRecordTypes = evidenceRecordTypes(evidenceRecordReadiness);
  const blockedEvidenceRecordTypes = blockedEvidenceRecords(visibleEvidenceRecordTypes);
  const evidenceRecordReadyTotal = computeEvidenceRecordReadyTotal(
    evidenceRecordReadiness,
    visibleEvidenceRecordTypes
  );
  const evidenceReleaseSummary = evidenceReleaseReadiness?.summary || {};
  const visibleEvidenceReleaseLanes = readinessLanes(evidenceReleaseReadiness);
  const blockedEvidenceReleaseLanes = blockedLanes(visibleEvidenceReleaseLanes);
  const evidenceReleaseReadyTotal = readyTotal(
    evidenceReleaseReadiness,
    visibleEvidenceReleaseLanes
  );
  const trustRelaySummary = trustRelayReadiness?.summary || {};
  const visibleTrustRelayLanes = readinessLanes(trustRelayReadiness);
  const blockedTrustRelayLanes = blockedLanes(visibleTrustRelayLanes);
  const trustRelayReadyTotal = readyTotal(trustRelayReadiness, visibleTrustRelayLanes);
  const notificationScopeSummary = notificationScopeReadiness?.summary || {};
  const visibleNotificationScopeLanes = readinessLanes(notificationScopeReadiness);
  const blockedNotificationScopeLanes = blockedLanes(visibleNotificationScopeLanes);
  const notificationScopeReadyTotal = readyTotal(
    notificationScopeReadiness,
    visibleNotificationScopeLanes
  );
  const trustMobilitySummary = trustMobility?.summary || {};
  const visibleTrustMobilityLanes = readinessLanes(trustMobility);
  const blockedTrustMobilityLanes = blockedLanes(visibleTrustMobilityLanes);
  const trustMobilityReadyTotal = readyTotal(trustMobility, visibleTrustMobilityLanes);
  const [activeTrustEvidenceFocus, setActiveTrustEvidenceFocus] =
    useState<TrustEvidenceFocusKey>("records");
  const [trustEvidenceFocusChooserOpen, setTrustEvidenceFocusChooserOpen] =
    useState(false);
  const selectedTrustEvidenceFocus =
    TRUST_EVIDENCE_FOCUS_OPTIONS.find(
      (option) => option.key === activeTrustEvidenceFocus
    ) || TRUST_EVIDENCE_FOCUS_OPTIONS[0];

  return (
    <>
      <div
        style={{
          ...softCard(),
          border: "1px solid rgba(214,170,69,0.30)",
          background: "rgba(255,249,225,0.72)",
        }}
      >
        <div style={sectionLabel()}>Evidence and impact rule</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          Attendance, payment, contribution, photograph, video, notice, and
          report records can show that activity happened. They do not, by
          themselves, prove what changed in a participant's life.
        </div>
        <div style={{ ...helperText(), marginTop: 7, fontSize: 13 }}>
          Use this area to preserve organised evidence first. Outcome and impact
          claims still need review, participant/community confirmation, time
          context, and appropriate privacy protection before they are relied on.
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
            gap: 8,
            marginTop: 12,
          }}
        >
          <StableCtaLink
            to={APP_ROUTES.COMMUNITY_CONFIRMATION_POLICY}
            debugId="community-domain.trust-evidence.confirmation-policy"
            style={actionLinkStyle()}
          >
            Configure confirmation policy
          </StableCtaLink>
          <StableCtaLink
            to={APP_ROUTES.COMMUNITY_CONFIRMATION_INBOX}
            debugId="community-domain.trust-evidence.confirmation-inbox"
            style={actionLinkStyle()}
          >
            Open confirmation inbox
          </StableCtaLink>
        </div>
        <div style={{ ...helperText(), marginTop: 8, fontSize: 12.5 }}>
          These links only open the confirmation surfaces. They do not create a
          confirmation request, choose responders, expose private records, or
          publish an outcome claim.
        </div>
      </div>

      <div
        style={{
          ...softCard(),
          display: "grid",
          gap: 10,
        }}
      >
        <div style={sectionLabel()}>Trust and evidence view</div>
        <div style={helperText()}>
          Current view: <strong>{selectedTrustEvidenceFocus.label}</strong>.
        </div>
        <StableButton
          type="button"
          kind="secondary"
          fullWidth
          stableHeight={42}
          debugId="community-domain.trust-evidence.focus-toggle"
          aria-expanded={trustEvidenceFocusChooserOpen}
          aria-controls="community-domain-trust-evidence-focus"
          onClick={() => setTrustEvidenceFocusChooserOpen((current) => !current)}
          style={{
            justifyContent: "center",
            fontSize: 13,
            textTransform: "none",
          }}
        >
          {trustEvidenceFocusChooserOpen ? "Close views" : "Change view"}
        </StableButton>
        {trustEvidenceFocusChooserOpen ? (
          <div
            id="community-domain-trust-evidence-focus"
            data-debug-id="community-domain.trust-evidence.focus-panel"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 132px), 1fr))",
              gap: 8,
            }}
          >
            {TRUST_EVIDENCE_FOCUS_OPTIONS.map((option) => {
              const selected = option.key === activeTrustEvidenceFocus;
              return (
                <StableButton
                  key={option.key}
                  type="button"
                  kind={selected ? "primary" : "secondary"}
                  stableHeight={48}
                  fullWidth
                  aria-pressed={selected}
                  title={option.note}
                  debugId={`community-domain.trust-evidence.focus.${option.key}`}
                  onClick={() => {
                    setActiveTrustEvidenceFocus(option.key);
                    setTrustEvidenceFocusChooserOpen(false);
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
          {selectedTrustEvidenceFocus.note}
        </div>
      </div>

      {activeTrustEvidenceFocus === "records" ? (
      <div style={softCard()}>
        <div style={sectionLabel()}>Evidence record readiness</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {evidenceRecordReadiness
            ? `${cleanText(
                evidenceRecordReadiness.primary_next_action?.label,
                "Review evidence record readiness"
              )}. ${evidenceRecordReadyTotal} of ${visibleEvidenceRecordTypes.length} record types are ready for future evidence records.`
            : "GSN could not load the evidence record readiness view for this Community Domain."}
        </div>
        {factGrid([
          [
            "Record review",
            compactStatus(evidenceRecordSummary.evidence_record_engine_status),
          ],
          ["Record types", countValue(evidenceRecordSummary.record_type_count)],
          [
            "Records created",
            countValue(evidenceRecordSummary.evidence_records_created),
          ],
          [
            "Evidence notes",
            evidenceRecordSummary.review_evidence_metadata_count == null
              ? "admin only"
              : countValue(evidenceRecordSummary.review_evidence_metadata_count),
          ],
        ])}
        {blockedEvidenceRecordTypes.length ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            Evidence record types needing attention:{" "}
            <strong>
              {blockedEvidenceRecordTypes
                .slice(0, 3)
                .map((record) =>
                  cleanText(record.label, record.record_type || "record type")
                )
                .join(", ")}
            </strong>
            .
          </div>
        ) : evidenceRecordReadiness ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            No blocked evidence record type is visible, but durable evidence records
            are still not being created here.
          </div>
        ) : null}
        {visibleEvidenceRecordTypes.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {visibleEvidenceRecordTypes.slice(0, 4).map((record) =>
              statusRow(
                cleanText(record.record_type, cleanText(record.label, "evidence record")),
                cleanText(record.label, "Evidence record type"),
                cleanText(
                  record.next_step,
                  "Keep this as planning readiness until durable evidence records exist."
                ),
                record.readiness_status
              )
            )}
          </div>
        ) : null}
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          Rule: readiness only; no records, uploads, credentials, proof,
          authority verification, trust scoring, money, or private evidence.
        </div>
      </div>
      ) : null}

      {activeTrustEvidenceFocus === "release" ? (
      <div style={softCard()}>
        <div style={sectionLabel()}>Evidence release readiness</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {evidenceReleaseReadiness
            ? `${cleanText(
                evidenceReleaseReadiness.primary_next_action?.label,
                "Review evidence release readiness"
              )}. ${evidenceReleaseReadyTotal} of ${visibleEvidenceReleaseLanes.length} release checks are ready.`
            : "GSN could not load the evidence release readiness view for this Community Domain."}
        </div>
        {factGrid([
          [
            "Release review",
            compactStatus(evidenceReleaseSummary.evidence_release_engine_status),
          ],
          [
            "Releases made",
            countValue(evidenceReleaseSummary.evidence_releases_created),
          ],
          [
            "Public proofs",
            countValue(evidenceReleaseSummary.public_proofs_published),
          ],
          [
            "Release evidence",
            evidenceReleaseSummary.release_evidence_count == null
              ? "admin only"
              : countValue(evidenceReleaseSummary.release_evidence_count),
          ],
        ])}
        {blockedEvidenceReleaseLanes.length ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            Evidence release checks needing attention:{" "}
            <strong>
              {blockedEvidenceReleaseLanes
                .slice(0, 3)
                .map((lane) => cleanText(lane.label, lane.lane_key || "release check"))
                .join(", ")}
            </strong>
            .
          </div>
        ) : evidenceReleaseReadiness ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            No blocked evidence release check is visible, but public proof is still
            not being released here.
          </div>
        ) : null}
        {visibleEvidenceReleaseLanes.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {visibleEvidenceReleaseLanes.slice(0, 4).map((lane) =>
              statusRow(
                cleanText(lane.lane_key, cleanText(lane.label, "evidence release")),
                cleanText(lane.label, "Evidence release check"),
                cleanText(
                  lane.next_step,
                  "Keep this as public-safe planning until a real release path exists."
                ),
                lane.status
              )
            )}
          </div>
        ) : null}
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          Rule: release readiness only; no evidence release, proof, public
          links, QR codes, credentials, sharing, permission changes, trust
          scoring, money, or private evidence.
        </div>
      </div>
      ) : null}

      {activeTrustEvidenceFocus === "relay" ? (
      <div style={softCard()}>
        <div style={sectionLabel()}>Trust relay readiness</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {trustRelayReadiness
            ? `${cleanText(
                trustRelayReadiness.primary_next_action?.label,
                "Review trust relay readiness"
              )}. ${trustRelayReadyTotal} of ${visibleTrustRelayLanes.length} relay checks are ready.`
            : "GSN could not load the trust relay readiness view for this Community Domain."}
        </div>
        {factGrid([
          ["Relay review", compactStatus(trustRelaySummary.trust_relay_engine_status)],
          ["Relay paths", countValue(trustRelaySummary.relay_paths_created)],
          ["Bridge members", countValue(trustRelaySummary.bridge_member_candidates)],
          ["Open reviews", countValue(trustRelaySummary.open_relay_review_count)],
        ])}
        {blockedTrustRelayLanes.length ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            Relay checks needing attention:{" "}
            <strong>
              {blockedTrustRelayLanes
                .slice(0, 3)
                .map((lane) => cleanText(lane.label, lane.lane_key || "relay check"))
                .join(", ")}
            </strong>
            .
          </div>
        ) : trustRelayReadiness ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            No blocked relay readiness check is visible, but relay publishing is still
            not connected here.
          </div>
        ) : null}
        {visibleTrustRelayLanes.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {visibleTrustRelayLanes.slice(0, 4).map((lane) =>
              statusRow(
                cleanText(lane.lane_key, cleanText(lane.label, "trust relay")),
                cleanText(lane.label, "Trust relay check"),
                cleanText(
                  lane.next_step,
                  "Keep this relay check as planning context until a real relay path exists."
                ),
                lane.status
              )
            )}
          </div>
        ) : null}
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          Rule: relay readiness only; no relay paths, proof, reposts,
          discovery, affiliations, private records, credentials, marketplace
          activity, billing, or money.
        </div>
      </div>
      ) : null}

      {activeTrustEvidenceFocus === "notification" ? (
      <div style={softCard()}>
        <div style={sectionLabel()}>Notification scope readiness</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {notificationScopeReadiness
            ? `${cleanText(
                notificationScopeReadiness.primary_next_action?.label,
                "Review notification scope readiness"
              )}. ${notificationScopeReadyTotal} of ${visibleNotificationScopeLanes.length} audience checks are ready.`
            : "GSN could not load the notification scope readiness view for this Community Domain."}
        </div>
        {factGrid([
          [
            "Scope review",
            compactStatus(notificationScopeSummary.notification_scope_engine_status),
          ],
          ["Members", countValue(notificationScopeSummary.active_member_count)],
          [
            "Scope policies",
            notificationScopeSummary.notification_policy_count == null
              ? "admin only"
              : countValue(notificationScopeSummary.notification_policy_count),
          ],
          [
            "Notifications sent",
            countValue(notificationScopeSummary.notifications_sent),
          ],
        ])}
        {blockedNotificationScopeLanes.length ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            Notification scope checks needing attention:{" "}
            <strong>
              {blockedNotificationScopeLanes
                .slice(0, 3)
                .map((lane) =>
                  cleanText(lane.label, lane.lane_key || "notification check")
                )
                .join(", ")}
            </strong>
            .
          </div>
        ) : notificationScopeReadiness ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            No blocked notification scope check is visible, but notification delivery
            is still not connected here.
          </div>
        ) : null}
        {visibleNotificationScopeLanes.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {visibleNotificationScopeLanes.slice(0, 4).map((lane) =>
              statusRow(
                cleanText(lane.lane_key, cleanText(lane.label, "notification scope")),
                cleanText(lane.label, "Notification scope check"),
                cleanText(
                  lane.next_step,
                  "Keep this as audience planning until a real notification path exists."
                ),
                lane.status
              )
            )}
          </div>
        ) : null}
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          Rule: audience readiness only; no messages, delivery jobs,
          audience lists, announcements, member lists, marketplace records,
          money, trust records, or private records.
        </div>
      </div>
      ) : null}

      {activeTrustEvidenceFocus === "mobility" ? (
      <div style={softCard()}>
        <div style={sectionLabel()}>Trust mobility readiness</div>
        <div style={{ ...helperText(), marginTop: 7 }}>
          {trustMobility
            ? `${cleanText(
                trustMobility.primary_next_action?.label,
                "Review trust mobility readiness"
              )}. ${trustMobilityReadyTotal} of ${visibleTrustMobilityLanes.length} portability checks are ready.`
            : "GSN could not load the trust mobility view for this Community Domain."}
        </div>
        {factGrid([
          ["Authority", compactStatus(trustMobilitySummary.verification_status)],
          ["Members", countValue(trustMobilitySummary.active_members)],
          ["Evidence", countValue(trustMobilitySummary.review_evidence_records)],
          ["Relay paths", countValue(trustMobilitySummary.relay_paths)],
        ])}
        {blockedTrustMobilityLanes.length ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            Trust mobility checks needing attention:{" "}
            <strong>
              {blockedTrustMobilityLanes
                .slice(0, 3)
                .map((lane) => cleanText(lane.label, lane.lane_key || "mobility check"))
                .join(", ")}
            </strong>
            .
          </div>
        ) : trustMobility ? (
          <div style={{ ...helperText(), marginTop: 9 }}>
            No blocked trust mobility check is visible, but portability bridges are
            still not connected here.
          </div>
        ) : null}
        {visibleTrustMobilityLanes.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {visibleTrustMobilityLanes.slice(0, 4).map((lane) =>
              statusRow(
                cleanText(lane.lane_key, cleanText(lane.label, "trust mobility")),
                cleanText(lane.label, "Trust mobility check"),
                cleanText(
                  lane.next_step,
                  cleanText(
                    lane.summary,
                    "Keep portability as planning until a real bridge exists."
                  )
                ),
                lane.status
              )
            )}
          </div>
        ) : null}
        <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
          Rule: mobility readiness only; no trust records, credentials,
          relay paths, proof, outward links, marketplace activity, separate
          communities, money, or private records.
        </div>
      </div>
      ) : null}
    </>
  );
}
