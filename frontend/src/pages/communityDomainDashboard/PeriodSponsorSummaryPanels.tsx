import React from "react";
import { GsnRealisticIcon } from "../../components/GsnRealisticIcon";
import { StableButton } from "../../components/StableButton";
import { humanStatus } from "./statusLanguage";

type UnknownRecord = Record<string, unknown>;

type DirectorSummaryTaskKey = "overview" | "membership" | "evidence" | "delivery";
type SponsorSummaryTaskKey = "overview" | "evidence" | "delivery" | "export";
type GovernanceTaskKey = "director_summary" | "sponsor_summary";
type CommunityValueReportPeriodKey = "last_7_days" | "this_month" | "last_30_days";
type CommunityValueReportAudienceKey = "sponsor_safe" | "director_admin";

type SummaryOption<Key extends string> = {
  key: Key;
  label: string;
  note: string;
};

type DeliveryEvidenceSurface = UnknownRecord & {
  beneficiary_confirmation_delivery_prepared?: unknown;
  confirmation_delivery_prepared_records?: unknown;
  beneficiary_confirmation_delivery_receipts?: unknown;
  confirmation_delivery_receipt_records?: unknown;
  beneficiary_confirmation_delivery_receipts_current_uncorrected?: unknown;
  confirmation_delivery_receipts_current_uncorrected?: unknown;
  beneficiary_confirmation_delivery_receipt_corrections?: unknown;
  confirmation_delivery_receipt_corrections?: unknown;
  beneficiary_contact_consent_records?: unknown;
  contact_consent_records?: unknown;
  beneficiary_contact_consent_withdrawals?: unknown;
  contact_consent_withdrawals?: unknown;
  beneficiary_confirmation_delivery_receipts_current_by_status?: unknown;
  confirmation_delivery_receipts_current_by_status?: unknown;
  beneficiary_confirmation_delivery_receipts_by_status?: unknown;
  confirmation_delivery_receipts_by_status?: unknown;
  beneficiary_confirmation_delivery_receipts_by_consent_basis?: unknown;
  confirmation_delivery_receipts_by_consent_basis?: unknown;
  beneficiary_confirmation_delivery_receipt_corrections_by_decision?: unknown;
  confirmation_delivery_receipt_corrections_by_decision?: unknown;
  beneficiary_contact_consent_by_reference_status?: unknown;
  contact_consent_by_reference_status?: unknown;
  beneficiary_contact_consent_withdrawals_by_reason?: unknown;
  contact_consent_withdrawals_by_reason?: unknown;
};

type ProviderSetupContractSurface = UnknownRecord & {
  status?: unknown;
  send_lift_conditions?: unknown;
  truth_gate?: unknown;
};

type ContactConsentContractSurface = UnknownRecord & {
  status?: unknown;
  provider_send_blocker?: unknown;
  active_contact_consent_status?: unknown;
  active_contact_consent_boundary?: unknown;
  minimum_send_rule?: unknown;
  privacy_boundary?: unknown;
};

type ExternalDeliverySurface = UnknownRecord & {
  status?: unknown;
  external_channels_sent_by_gsn?: unknown;
  provider_send_engine_status?: unknown;
  missing_components?: unknown;
  provider_setup_contract?: ProviderSetupContractSurface | null;
  contact_consent_contract?: ContactConsentContractSurface | null;
  boundary?: unknown;
};

type TopIndicatorSurface = UnknownRecord & {
  label?: unknown;
  count?: unknown;
};

type OutcomeSummarySurface = UnknownRecord & {
  status?: unknown;
  subject_count?: unknown;
  top_indicators?: unknown;
};

type SponsorExportPackSurface = UnknownRecord & {
  copy_text?: unknown;
};

type PeriodSponsorSummarySurface = UnknownRecord & {
  membership_snapshot?: UnknownRecord;
  member_movement?: UnknownRecord;
  governance_summary?: UnknownRecord;
  evidence_summary?: DeliveryEvidenceSurface;
  confirmation_summary?: UnknownRecord;
  activity_summary?: UnknownRecord;
  beneficiary_outcome_summary?: OutcomeSummarySurface;
  period?: UnknownRecord;
  boundary?: unknown;
  sponsor_export_pack?: SponsorExportPackSurface;
  challenge_summary?: UnknownRecord;
  external_delivery_readiness?: ExternalDeliverySurface;
  sponsor_readiness?: unknown;
  plain_language?: unknown;
};

type SummaryPanelsData = {
  activeGovernanceTask: GovernanceTaskKey;
  activeDirectorSummaryTask: DirectorSummaryTaskKey;
  activeDirectorSummaryTaskOption: SummaryOption<DirectorSummaryTaskKey>;
  activeSponsorSummaryTask: SponsorSummaryTaskKey;
  activeSponsorSummaryTaskOption: SummaryOption<SponsorSummaryTaskKey>;
  busySponsorExportCopy: boolean;
  busyCommunityValueReportPdf: boolean;
  communityValueReportAudience: CommunityValueReportAudienceKey;
  communityValueReportPeriod: CommunityValueReportPeriodKey;
  copySponsorExportPack: () => void | Promise<void>;
  downloadCommunityValueReportPdf: () => void | Promise<void>;
  directorSummaryTaskChooserOpen: boolean;
  DIRECTOR_SUMMARY_TASK_OPTIONS: SummaryOption<DirectorSummaryTaskKey>[];
  periodSummary: PeriodSponsorSummarySurface | null;
  setActiveDirectorSummaryTask: React.Dispatch<React.SetStateAction<DirectorSummaryTaskKey>>;
  setActiveSponsorSummaryTask: React.Dispatch<React.SetStateAction<SponsorSummaryTaskKey>>;
  setCommunityValueReportAudience: React.Dispatch<React.SetStateAction<CommunityValueReportAudienceKey>>;
  setCommunityValueReportPeriod: React.Dispatch<React.SetStateAction<CommunityValueReportPeriodKey>>;
  setDirectorSummaryTaskChooserOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSponsorSummaryTaskChooserOpen: React.Dispatch<React.SetStateAction<boolean>>;
  sponsorSummary: PeriodSponsorSummarySurface | null;
  sponsorSummaryTaskChooserOpen: boolean;
  SPONSOR_SUMMARY_TASK_OPTIONS: SummaryOption<SponsorSummaryTaskKey>[];
};

type PeriodSponsorSummaryPanelsProps = {
  data: SummaryPanelsData;
};

function cleanText(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function compactStatus(value: unknown): string {
  return humanStatus(value);
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

function iconFrame(size = 48): React.CSSProperties {
  return {
    width: size,
    height: size,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    background: "#FFFFFF",
    border: "1px solid rgba(9,27,46,0.10)",
    boxShadow: "0 8px 20px rgba(9,27,46,0.08)",
    flex: "0 0 auto",
  };
}

function iconHeaderStyle(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    gap: 12,
    alignItems: "center",
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
    padding: "6px 10px",
    color: positive ? "#14532D" : attention ? "#7C2D12" : "#0F3A5F",
    background: positive
      ? "rgba(34,197,94,0.12)"
      : attention
        ? "rgba(249,115,22,0.12)"
        : "rgba(59,130,246,0.10)",
    border: positive
      ? "1px solid rgba(34,197,94,0.22)"
      : attention
        ? "1px solid rgba(249,115,22,0.22)"
        : "1px solid rgba(59,130,246,0.18)",
    fontSize: 12,
    fontWeight: 850,
    lineHeight: 1.1,
  };
}

function tileGridStyle(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 128px), 1fr))",
    gap: 8,
  };
}

function summaryTileStyle(): React.CSSProperties {
  return {
    borderRadius: 10,
    border: "1px solid rgba(9,27,46,0.1)",
    background: "#FFFFFF",
    padding: "10px 12px",
  };
}

function SummaryTiles({ rows }: { rows: Array<[string, unknown]> }) {
  return (
    <div style={tileGridStyle()}>
      {rows.map(([label, value]) => (
        <div key={String(label)} style={summaryTileStyle()}>
          <div style={{ ...helperText(), fontSize: 12 }}>{label}</div>
          <div
            style={{
              marginTop: 3,
              color: "#091B2E",
              fontSize: 20,
              fontWeight: 950,
              lineHeight: 1,
            }}
          >
            {String(value ?? 0)}
          </div>
        </div>
      ))}
    </div>
  );
}

function TagGroup({ rows, prefix = "" }: { rows?: unknown; prefix?: string }) {
  const entries = typeof rows === "object" && rows !== null ? Object.entries(rows) : [];
  return (
    <>
      {entries.map(([label, value]) => (
        <span key={`${prefix}-${label}`} style={statusBadge(prefix || label)}>
          {prefix ? `${prefix} ` : ""}{compactStatus(label)}: {cleanText(value, "0")}
        </span>
      ))}
    </>
  );
}

function DeliveryEvidence({
  evidence,
  sponsor = false,
}: {
  evidence: DeliveryEvidenceSurface;
  sponsor?: boolean;
}) {
  const hasDeliveryEvidence = Boolean(
    Number(evidence?.beneficiary_confirmation_delivery_prepared ?? evidence?.confirmation_delivery_prepared_records ?? 0) ||
      Number(evidence?.beneficiary_confirmation_delivery_receipts ?? evidence?.confirmation_delivery_receipt_records ?? 0) ||
      Number(evidence?.beneficiary_confirmation_delivery_receipts_current_uncorrected ?? evidence?.confirmation_delivery_receipts_current_uncorrected ?? 0) ||
      Number(evidence?.beneficiary_confirmation_delivery_receipt_corrections ?? evidence?.confirmation_delivery_receipt_corrections ?? 0) ||
      Number(evidence?.beneficiary_contact_consent_records ?? evidence?.contact_consent_records ?? 0) ||
      Number(evidence?.beneficiary_contact_consent_withdrawals ?? evidence?.contact_consent_withdrawals ?? 0)
  );

  if (!hasDeliveryEvidence) {
    return <div style={helperText()}>No delivery evidence counts are recorded yet.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={sectionLabel()}>Delivery evidence</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <TagGroup
          prefix="Current"
          rows={
            sponsor
              ? evidence?.confirmation_delivery_receipts_current_by_status
              : evidence?.beneficiary_confirmation_delivery_receipts_current_by_status
          }
        />
        <TagGroup
          rows={
            sponsor
              ? evidence?.confirmation_delivery_receipts_by_status
              : evidence?.beneficiary_confirmation_delivery_receipts_by_status
          }
        />
        <TagGroup
          rows={
            sponsor
              ? evidence?.confirmation_delivery_receipts_by_consent_basis
              : evidence?.beneficiary_confirmation_delivery_receipts_by_consent_basis
          }
        />
        <TagGroup
          prefix="Correction"
          rows={
            sponsor
              ? evidence?.confirmation_delivery_receipt_corrections_by_decision
              : evidence?.beneficiary_confirmation_delivery_receipt_corrections_by_decision
          }
        />
        <TagGroup
          rows={
            sponsor
              ? evidence?.contact_consent_by_reference_status
              : evidence?.beneficiary_contact_consent_by_reference_status
          }
        />
        <TagGroup
          prefix="Withdrawn"
          rows={
            sponsor
              ? evidence?.contact_consent_withdrawals_by_reason
              : evidence?.beneficiary_contact_consent_withdrawals_by_reason
          }
        />
      </div>
      <div style={{ ...helperText(), fontSize: 13 }}>
        {sponsor
          ? "GSN did not send external messages. These counts show prepared packs, contact/consent attestations, and admin-recorded manual delivery receipts only. Provider blocked checks are readiness checks, not sends. Current receipts exclude receipts marked corrected, superseded, or under review."
          : "GSN did not send WhatsApp, SMS, or email; these are prepared packs, contact/consent attestations, and admin-recorded manual receipts. Current receipts exclude receipts marked corrected, superseded, or under review."}
      </div>
    </div>
  );
}

function TaskChooser<Key extends string>({
  activeKey,
  controlsId,
  debugPrefix,
  expanded,
  labelClosed,
  labelOpen,
  options,
  setActiveKey,
  setExpanded,
}: {
  activeKey: Key;
  controlsId: string;
  debugPrefix: string;
  expanded: boolean;
  labelClosed: string;
  labelOpen: string;
  options: SummaryOption<Key>[];
  setActiveKey: React.Dispatch<React.SetStateAction<Key>>;
  setExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <>
      <StableButton
        type="button"
        kind="secondary"
        fullWidth
        stableHeight={42}
        debugId={`${debugPrefix}-toggle`}
        aria-expanded={expanded}
        aria-controls={controlsId}
        onClick={() => setExpanded((current) => !current)}
        style={{ justifyContent: "center", fontSize: 13, textTransform: "none" }}
      >
        {expanded ? labelOpen : labelClosed}
      </StableButton>
      {expanded ? (
        <div
          id={controlsId}
          data-debug-id={`${debugPrefix}-panel`}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
            gap: 8,
          }}
        >
          {options.map((task) => (
            <StableButton
              key={task.key}
              type="button"
              kind={activeKey === task.key ? "primary" : "secondary"}
              stableHeight={44}
              debugId={`${debugPrefix}.${task.key}`}
              onClick={() => {
                setActiveKey(task.key);
                setExpanded(false);
              }}
              style={{ justifyContent: "center", fontSize: 13, textTransform: "none" }}
            >
              {task.label}
            </StableButton>
          ))}
        </div>
      ) : null}
    </>
  );
}

function PanelHeader({ icon, label, title, detail }: { icon: "records-folder" | "public-globe"; label: string; title: string; detail: string }) {
  return (
    <div style={iconHeaderStyle()}>
      <div style={iconFrame(44)}>
        <GsnRealisticIcon name={icon} size={34} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={sectionLabel()}>{label}</div>
        <h3 style={{ margin: "3px 0 0", fontSize: 20, lineHeight: 1.16 }}>{title}</h3>
        <div style={{ ...helperText(), marginTop: 6 }}>{detail}</div>
      </div>
    </div>
  );
}
function ReportExportControls({ data }: { data: SummaryPanelsData }) {
  const selectStyle: React.CSSProperties = {
    width: "100%",
    minHeight: 42,
    borderRadius: 10,
    border: "1px solid rgba(9,27,46,0.14)",
    background: "#FFFFFF",
    color: "#091B2E",
    fontSize: 14,
    fontWeight: 800,
    padding: "0 10px",
  };

  return (
    <div
      data-debug-id="community-domain-dashboard.community-value-report-controls"
      style={{
        display: "grid",
        gap: 10,
        borderRadius: 12,
        border: "1px solid rgba(191,147,62,0.24)",
        background: "rgba(255,255,255,0.82)",
        padding: 12,
      }}
    >
      <div style={sectionLabel()}>Community Value PDF</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))", gap: 10 }}>
        <label style={{ display: "grid", gap: 5 }}>
          <span style={{ ...helperText(), fontSize: 12, fontWeight: 800 }}>Period</span>
          <select
            data-gmfn-field="community-value-report-period"
            value={data.communityValueReportPeriod}
            onChange={(event) => {
              data.setCommunityValueReportPeriod(event.target.value as CommunityValueReportPeriodKey);
            }}
            style={selectStyle}
          >
            <option value="last_30_days">Last 30 days</option>
            <option value="this_month">This month</option>
            <option value="last_7_days">Last 7 days</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 5 }}>
          <span style={{ ...helperText(), fontSize: 12, fontWeight: 800 }}>Audience</span>
          <select
            data-gmfn-field="community-value-report-audience"
            value={data.communityValueReportAudience}
            onChange={(event) => {
              data.setCommunityValueReportAudience(event.target.value as CommunityValueReportAudienceKey);
            }}
            style={selectStyle}
          >
            <option value="sponsor_safe">Sponsor-safe</option>
            <option value="director_admin">Director/admin</option>
          </select>
        </label>
      </div>
      <StableButton
        type="button"
        kind="primary"
        stableHeight={42}
        disabled={data.busyCommunityValueReportPdf}
        debugId="community-domain-dashboard.prepare-community-value-pdf"
        onClick={() => {
          void data.downloadCommunityValueReportPdf();
        }}
        style={{ justifyContent: "center", fontSize: 13, textTransform: "none" }}
      >
        {data.busyCommunityValueReportPdf ? "Preparing PDF..." : "Prepare Community Value PDF"}
      </StableButton>
      <div style={{ ...helperText(), fontSize: 13 }}>
        Uses recorded facts only. Sponsor-safe PDFs omit private beneficiary and member-level detail.
      </div>
    </div>
  );
}

function DirectorSummary({ data }: { data: SummaryPanelsData }) {
  const summary = data.periodSummary;
  if (!summary) {
    return <div style={helperText()}>No period summary is loaded for this Governance view yet.</div>;
  }

  const membership = summary?.membership_snapshot || {};
  const movement = summary?.member_movement || {};
  const governance = summary?.governance_summary || {};
  const evidence = summary?.evidence_summary || {};
  const confirmations = summary?.confirmation_summary || {};
  const activityStatus = cleanText(summary?.activity_summary?.status, "not_recorded");
  const outcomeStatus = cleanText(summary?.beneficiary_outcome_summary?.status, "not_recorded");
  const periodStart = cleanText(summary?.period?.start);
  const periodEnd = cleanText(summary?.period?.end);
  const membershipTiles: Array<[string, unknown]> = [
    ["Active members", membership.active_total ?? 0],
    ["Added", movement.added ?? 0],
    ["Removed", movement.removed_or_deactivated ?? 0],
    ["Governance actions", governance.total ?? 0],
  ];
  const evidenceTiles: Array<[string, unknown]> = [
    ["Evidence records", evidence.total ?? 0],
    ["Confirmations", confirmations.requests_total ?? 0],
  ];
  const deliveryTiles: Array<[string, unknown]> = [
    ["Delivery packs", evidence.beneficiary_confirmation_delivery_prepared ?? 0],
    ["Manual receipts", evidence.beneficiary_confirmation_delivery_receipts ?? 0],
    ["Current receipts", evidence.beneficiary_confirmation_delivery_receipts_current_uncorrected ?? 0],
    ["Receipt corrections", evidence.beneficiary_confirmation_delivery_receipt_corrections ?? 0],
    ["Provider blocked", evidence.beneficiary_confirmation_provider_send_blocked_checks ?? 0],
    ["Contact consent", evidence.beneficiary_contact_consent_records ?? 0],
    ["Consent withdrawn", evidence.beneficiary_contact_consent_withdrawals ?? 0],
  ];

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <span style={statusBadge("admin report")}>Admin report</span>
        <span style={statusBadge(activityStatus)}>Activity: {compactStatus(activityStatus)}</span>
        <span style={statusBadge(outcomeStatus)}>Outcomes: {compactStatus(outcomeStatus)}</span>
      </div>
      <div style={{ ...helperText(), fontSize: 13 }}>
        Current report view: <strong>{data.activeDirectorSummaryTaskOption.label}</strong>. {data.activeDirectorSummaryTaskOption.note}
      </div>
      <TaskChooser
        activeKey={data.activeDirectorSummaryTask}
        controlsId="community-domain-director-summary-packets"
        debugPrefix="community-domain-dashboard.director-summary"
        expanded={data.directorSummaryTaskChooserOpen}
        labelClosed="Change report view"
        labelOpen="Close report views"
        options={data.DIRECTOR_SUMMARY_TASK_OPTIONS}
        setActiveKey={data.setActiveDirectorSummaryTask}
        setExpanded={data.setDirectorSummaryTaskChooserOpen}
      />
      {data.activeDirectorSummaryTask === "overview" ? (
        <div style={{ display: "grid", gap: 8, borderRadius: 10, border: "1px solid rgba(9,27,46,0.1)", background: "#FFFFFF", padding: 12 }}>
          <div style={sectionLabel()}>Report boundary</div>
          <div style={{ ...helperText(), fontSize: 13 }}>Period: {periodStart || "default start"} to {periodEnd || "default end"}.</div>
          <div style={{ ...helperText(), fontSize: 13 }}>{cleanText(summary?.boundary, "Every number should trace back to source records.")}</div>
        </div>
      ) : null}
      {data.activeDirectorSummaryTask === "membership" ? <SummaryTiles rows={membershipTiles} /> : null}
      {data.activeDirectorSummaryTask === "evidence" ? <SummaryTiles rows={evidenceTiles} /> : null}
      {data.activeDirectorSummaryTask === "delivery" ? (
        <>
          <SummaryTiles rows={deliveryTiles} />
          <DeliveryEvidence evidence={evidence} />
        </>
      ) : null}
    </>
  );
}

function ProviderDeliveryReadiness({
  externalDelivery,
}: {
  externalDelivery: ExternalDeliverySurface;
}) {
  if (!externalDelivery?.status) {
    return <div style={helperText()}>No provider delivery readiness details are loaded yet.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 8, borderRadius: 10, border: "1px solid rgba(171,86,48,0.28)", background: "rgba(171,86,48,0.08)", padding: 12 }}>
      <div style={sectionLabel()}>Provider delivery readiness</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <span style={statusBadge(externalDelivery.status)}>{compactStatus(externalDelivery.status)}</span>
        <span style={statusBadge("not sent")}>GSN sent: {externalDelivery.external_channels_sent_by_gsn ? "yes" : "no"}</span>
        <span style={statusBadge("provider")}>Send engine: {compactStatus(externalDelivery.provider_send_engine_status)}</span>
      </div>
      {Array.isArray(externalDelivery.missing_components) && externalDelivery.missing_components.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {externalDelivery.missing_components.slice(0, 4).map((item: unknown) => (
            <span key={cleanText(item)} style={statusBadge("needed")}>{cleanText(item)}</span>
          ))}
        </div>
      ) : null}
      {externalDelivery.provider_setup_contract ? (
        <div style={{ display: "grid", gap: 6, borderTop: "1px solid rgba(171,86,48,0.18)", paddingTop: 8 }}>
          <div style={sectionLabel()}>Provider setup contract</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <span style={statusBadge("not configured")}>
              {compactStatus(externalDelivery.provider_setup_contract?.status || "not_configured")}
            </span>
            {(Array.isArray(externalDelivery.provider_setup_contract?.send_lift_conditions)
              ? externalDelivery.provider_setup_contract.send_lift_conditions
              : []
            ).slice(0, 3).map((item: unknown) => (
              <span key={cleanText(item)} style={statusBadge("required")}>{cleanText(item)}</span>
            ))}
          </div>
          <div style={{ ...helperText(), fontSize: 13 }}>
            {cleanText(
              externalDelivery.provider_setup_contract?.truth_gate,
              "Provider sending may only be marked ready after provider send, webhook, consent, retry, and receipt mapping are tested."
            )}
          </div>
        </div>
      ) : null}
      {externalDelivery.contact_consent_contract ? (
        <div style={{ display: "grid", gap: 6, borderTop: "1px solid rgba(171,86,48,0.18)", paddingTop: 8 }}>
          <div style={sectionLabel()}>Contact and consent gate</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <span style={statusBadge("not connected")}>
              {compactStatus(externalDelivery.contact_consent_contract?.status || "not_connected")}
            </span>
            <span style={statusBadge("blocked")}>
              {compactStatus(externalDelivery.contact_consent_contract?.provider_send_blocker || "missing contact preference and consent gate")}
            </span>
            <span style={statusBadge("blocked")}>
              {compactStatus(externalDelivery.contact_consent_contract?.active_contact_consent_status || "not evaluated")}
            </span>
          </div>
          <div style={{ ...helperText(), fontSize: 13 }}>
            {cleanText(
              externalDelivery.contact_consent_contract?.active_contact_consent_boundary,
              "Provider sending must stay blocked unless the latest contact/consent status is active attestation."
            )}
          </div>
          <div style={{ ...helperText(), fontSize: 13 }}>
            {cleanText(
              externalDelivery.contact_consent_contract?.minimum_send_rule,
              "Do not attempt provider delivery until the selected channel has a verified destination and an active consent or legal authority basis."
            )}
          </div>
          <div style={{ ...helperText(), fontSize: 13 }}>
            {cleanText(
              externalDelivery.contact_consent_contract?.privacy_boundary,
              "This readiness view does not store beneficiary phone numbers, email addresses, provider destinations, or consent records."
            )}
          </div>
        </div>
      ) : null}
      <div style={{ ...helperText(), fontSize: 13 }}>
        {cleanText(externalDelivery.boundary, "GSN can prepare manual delivery text, but provider sending is not connected.")}
      </div>
    </div>
  );
}

function SponsorSummary({ data }: { data: SummaryPanelsData }) {
  const summary = data.sponsorSummary;
  if (!summary) {
    return <div style={helperText()}>No sponsor-safe summary is loaded for this Governance view yet.</div>;
  }

  const evidence = summary?.evidence_summary || {};
  const activity = summary?.activity_summary || {};
  const outcomes = summary?.beneficiary_outcome_summary || {};
  const challenges = summary?.challenge_summary || {};
  const exportPack = summary?.sponsor_export_pack || {};
  const exportCopyText = cleanText(exportPack?.copy_text);
  const externalDelivery = summary?.external_delivery_readiness || {};
  const readiness = cleanText(summary?.sponsor_readiness, "not_enough_recorded_evidence");
  const sponsorTiles: Array<[string, unknown]> = [
    ["Activities", evidence.activity_records ?? 0],
    ["Outcomes", evidence.beneficiary_outcome_records ?? 0],
    ["Confirmed", evidence.beneficiary_confirmed_outcomes ?? 0],
    ["Admin recorded", evidence.admin_recorded_or_unconfirmed_outcomes ?? 0],
    ["Challenged", evidence.challenged_or_under_review_outcomes ?? 0],
    ["Reviewed", evidence.reviewed_challenge_outcomes ?? 0],
    ["Unresolved", evidence.unresolved_challenge_outcomes ?? 0],
    ["Delivery packs", evidence.confirmation_delivery_prepared_records ?? 0],
    ["Manual receipts", evidence.confirmation_delivery_receipt_records ?? 0],
    ["Current receipts", evidence.confirmation_delivery_receipts_current_uncorrected ?? 0],
    ["Receipt corrections", evidence.confirmation_delivery_receipt_corrections ?? 0],
    ["Provider blocked", evidence.confirmation_provider_send_blocked_checks ?? 0],
    ["Contact consent", evidence.contact_consent_records ?? 0],
    ["Consent withdrawn", evidence.contact_consent_withdrawals ?? 0],
    ["People reached", outcomes.subject_count ?? 0],
  ];

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <span style={statusBadge(readiness)}>{compactStatus(readiness)}</span>
        <span style={statusBadge(activity.status)}>Activity: {compactStatus(activity.status)}</span>
        <span style={statusBadge(outcomes.status)}>Outcomes: {compactStatus(outcomes.status)}</span>
        <span style={statusBadge(challenges.status)}>Challenges: {compactStatus(challenges.status)}</span>
      </div>
      <div style={{ ...helperText(), fontSize: 13 }}>
        Current sponsor view: <strong>{data.activeSponsorSummaryTaskOption.label}</strong>. {data.activeSponsorSummaryTaskOption.note}
      </div>
      <TaskChooser
        activeKey={data.activeSponsorSummaryTask}
        controlsId="community-domain-sponsor-summary-packets"
        debugPrefix="community-domain-dashboard.sponsor-summary"
        expanded={data.sponsorSummaryTaskChooserOpen}
        labelClosed="Change sponsor view"
        labelOpen="Close sponsor views"
        options={data.SPONSOR_SUMMARY_TASK_OPTIONS}
        setActiveKey={data.setActiveSponsorSummaryTask}
        setExpanded={data.setSponsorSummaryTaskChooserOpen}
      />
      {data.activeSponsorSummaryTask === "overview" ? (
        <div style={{ display: "grid", gap: 8, borderRadius: 10, border: "1px solid rgba(9,27,46,0.1)", background: "#FFFFFF", padding: 12 }}>
          <div style={sectionLabel()}>Sponsor boundary</div>
          <div style={{ ...helperText(), fontSize: 13 }}>{cleanText(summary?.plain_language, "Sponsor-safe summary aggregates recorded facts only.")}</div>
          <div style={{ ...helperText(), fontSize: 13 }}>{cleanText(evidence.privacy, "Private beneficiary details are omitted.")}</div>
        </div>
      ) : null}
      {data.activeSponsorSummaryTask === "evidence" ? (
        <>
          <SummaryTiles rows={sponsorTiles} />
          {Array.isArray(outcomes.top_indicators) && outcomes.top_indicators.length ? (
            <div style={{ display: "grid", gap: 6 }}>
              <div style={sectionLabel()}>Top indicators</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {(outcomes.top_indicators as TopIndicatorSurface[]).slice(0, 4).map((item) => (
                  <span key={cleanText(item?.label)} style={statusBadge("indicator")}>
                    {cleanText(item?.label)}: {cleanText(item?.count, "0")}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
      {data.activeSponsorSummaryTask === "export" ? (
        exportCopyText ? (
          <div style={{ display: "grid", gap: 8, borderRadius: 10, border: "1px solid rgba(191,147,62,0.28)", background: "rgba(191,147,62,0.08)", padding: 12 }}>
            <div style={sectionLabel()}>Sponsor export pack</div>
            <div style={{ ...helperText(), fontSize: 13 }}>
              Copy-ready text prepared from this sponsor-safe summary. It omits private beneficiary detail and is not sent by GSN.
            </div>
            <StableButton
              type="button"
              kind="secondary"
              stableHeight={38}
              disabled={data.busySponsorExportCopy}
              debugId="community-domain-dashboard.copy-sponsor-export-pack"
              onClick={() => {
                void data.copySponsorExportPack();
              }}
              style={{ justifyContent: "center", fontSize: 13, textTransform: "none" }}
            >
              {data.busySponsorExportCopy ? "Copying pack..." : "Copy sponsor pack"}
            </StableButton>
          </div>
        ) : (
          <div style={helperText()}>No copy-ready sponsor export pack is available yet.</div>
        )
      ) : null}
      {data.activeSponsorSummaryTask === "delivery" ? (
        <>
          <DeliveryEvidence evidence={evidence} sponsor />
          <ProviderDeliveryReadiness externalDelivery={externalDelivery} />
        </>
      ) : null}
    </>
  );
}

export default function PeriodSponsorSummaryPanels({ data }: PeriodSponsorSummaryPanelsProps) {
  const isDirector = data.activeGovernanceTask === "director_summary";

  return (
    <div style={{ ...softCard(), display: "grid", gap: 12 }}>
      {isDirector ? (
        <>
          <PanelHeader
            icon="records-folder"
            label="Director period summary"
            title="Recorded facts for this period."
            detail="This report only counts records already in GSN. Missing activity or beneficiary records stay marked as not recorded."
          />
          <ReportExportControls data={data} />
          <DirectorSummary data={data} />
        </>
      ) : (
        <>
          <PanelHeader
            icon="public-globe"
            label="Sponsor-safe summary"
            title="Aggregate evidence only."
            detail="This view separates recorded, confirmed, and challenged evidence without exposing private beneficiary details."
          />
          <ReportExportControls data={data} />
          <SponsorSummary data={data} />
        </>
      )}
    </div>
  );
}
