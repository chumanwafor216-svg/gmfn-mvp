import React, { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useParams } from "react-router-dom";
import { GsnRealisticIcon, type Gsn3DIconKey } from "../components/GsnRealisticIcon";
import {
  PrimaryButton,
  SecondaryButton,
  StableCtaLink,
  StableDisclosureSummary,
} from "../components/StableButton";
import {
  TrustPaperSecurityFooter,
  TrustPaperWatermark,
} from "../components/TrustPaperMarks";
import {
  getPublicCommunityVerification,
  requestPublicCommunityVerificationConfirmation,
  safeCopy,
} from "../lib/api";
import { publicFrontendUrl } from "../lib/publicLinks";

type CommunityVerifyRecord = {
  community_name?: string | null;
  community_id?: number | string | null;
  community_code?: string | null;
  community_type?: string | null;
  community_type_label?: string | null;
  community_type_source?: string | null;
  community_public_face_status?: string | null;
  community_public_face_label?: string | null;
  community_public_face_scope?: string | null;
  community_next_evidence_label?: string | null;
  community_next_evidence_scope?: string | null;
  community_record_started_at?: string | null;
  community_record_started_label?: string | null;
  community_record_started_scope?: string | null;
  community_mobility_label?: string | null;
  community_mobility_scope?: string | null;
  community_reader_decision_label?: string | null;
  community_reader_decision_scope?: string | null;
  community_evidence_currentness_status?: string | null;
  community_evidence_currentness_label?: string | null;
  community_evidence_currentness_scope?: string | null;
  status?: string | null;
  domain_label?: string | null;
  domain_status?: string | null;
  domain_lifecycle_status?: string | null;
  domain_lifecycle_label?: string | null;
  domain_lifecycle_note?: string | null;
  domain_evidence_scope?: string | null;
  domain_proof_scope?: string | null;
  membership_credential_status?: string | null;
  official_affiliate_status?: string | null;
  official_affiliate_label?: string | null;
  official_affiliate_note?: string | null;
  parent_domain?: {
    community_id?: number | string | null;
    community_code?: string | null;
    community_name?: string | null;
    affiliation_id?: number | string | null;
    decided_at?: string | null;
  } | null;
  group_affiliation_status?: string | null;
  public_limitation?: string | null;
  relay_available?: boolean | null;
  relay_availability?: string | null;
  public_record?: string | null;
  member_confirmation?: string | null;
  request_confirmation_available?: boolean | null;
};

type Notice = {
  tone: "success" | "error";
  text: string;
};

function safeStr(value: any): string {
  return String(value ?? "").trim();
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function publicVerificationErrorMessage(error: any): string {
  const message = safeStr(error?.message || error);
  const lower = message.toLowerCase();
  if (
    lower.includes("sqlite") ||
    lower.includes("operationalerror") ||
    lower.includes("no such table") ||
    lower.includes("[sql:") ||
    lower.includes("select ")
  ) {
    return (
      "This public community check is temporarily unavailable on this server. " +
      "GSN needs to refresh the server database setup before this public record can run."
    );
  }
  return message || "Community verification could not be loaded.";
}

function labelize(value: any): string {
  const text = safeStr(value).replace(/[_-]+/g, " ");
  if (!text) return "Not shown";
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizePublicRecordLabel(value: any): string {
  const text = firstTruthy(value);
  if (text.toLowerCase() === ["verified", "in", "gsn"].join(" ")) {
    return "Recorded in GSN";
  }
  return text || "Recorded in GSN";
}

function communityVerifyIconBadge(
  name: Gsn3DIconKey,
  size = 42,
  tone: "navy" | "blue" | "green" | "amber" = "navy"
): React.ReactElement {
  const palette = {
    navy: {
      color: "#EAF3FF",
      background:
        "radial-gradient(circle at 35% 24%, rgba(244,208,106,0.20) 0%, rgba(244,208,106,0.00) 34%), linear-gradient(180deg, rgba(28,76,122,0.98) 0%, rgba(7,28,47,0.98) 100%)",
      border: "1px solid rgba(196,216,238,0.22)",
    },
    blue: {
      color: "#EAF3FF",
      background:
        "radial-gradient(circle at 35% 24%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.00) 34%), linear-gradient(180deg, #2367D1 0%, #0B3E78 100%)",
      border: "1px solid rgba(123,161,204,0.28)",
    },
    green: {
      color: "#ECFDF5",
      background:
        "radial-gradient(circle at 35% 24%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.00) 34%), linear-gradient(180deg, #2E9B62 0%, #12653C 100%)",
      border: "1px solid rgba(167,243,208,0.28)",
    },
    amber: {
      color: "#FFF7E6",
      background:
        "radial-gradient(circle at 35% 24%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.00) 34%), linear-gradient(180deg, #D6AA45 0%, #9A6817 100%)",
      border: "1px solid rgba(252,211,77,0.30)",
    },
  }[tone];

  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: size >= 34 ? 13 : 11,
        display: "grid",
        placeItems: "center",
        flex: "0 0 auto",
        boxShadow:
          "0 9px 18px rgba(2,6,23,0.20), inset 0 1px 0 rgba(255,255,255,0.12)",
        ...palette,
      }}
    >
      <GsnRealisticIcon
        name={name}
        size={Math.max(30, Math.round(size * 0.9))}
        decorative
        imageStyle={{ width: "96%", height: "96%" }}
      />
    </span>
  );
}

function normalizeRecord(raw: any): CommunityVerifyRecord {
  const src = raw?.community || raw?.data || raw || {};
  return {
    community_name: firstTruthy(src.community_name, src.name),
    community_id: src.community_id ?? src.id ?? null,
    community_code: firstTruthy(src.community_code),
    community_type: firstTruthy(src.community_type),
    community_type_label: firstTruthy(src.community_type_label),
    community_type_source: firstTruthy(src.community_type_source),
    community_public_face_status: firstTruthy(src.community_public_face_status),
    community_public_face_label: firstTruthy(src.community_public_face_label),
    community_public_face_scope: firstTruthy(src.community_public_face_scope),
    community_next_evidence_label: firstTruthy(src.community_next_evidence_label),
    community_next_evidence_scope: firstTruthy(src.community_next_evidence_scope),
    community_record_started_at: firstTruthy(src.community_record_started_at),
    community_record_started_label: firstTruthy(src.community_record_started_label),
    community_record_started_scope: firstTruthy(src.community_record_started_scope),
    community_mobility_label: firstTruthy(src.community_mobility_label),
    community_mobility_scope: firstTruthy(src.community_mobility_scope),
    community_reader_decision_label: firstTruthy(src.community_reader_decision_label),
    community_reader_decision_scope: firstTruthy(src.community_reader_decision_scope),
    community_evidence_currentness_status: firstTruthy(src.community_evidence_currentness_status),
    community_evidence_currentness_label: firstTruthy(src.community_evidence_currentness_label),
    community_evidence_currentness_scope: firstTruthy(src.community_evidence_currentness_scope),
    status: firstTruthy(src.status),
    domain_label: firstTruthy(src.domain_label),
    domain_status: firstTruthy(src.domain_status),
    domain_lifecycle_status: firstTruthy(src.domain_lifecycle_status),
    domain_lifecycle_label: firstTruthy(src.domain_lifecycle_label),
    domain_lifecycle_note: firstTruthy(src.domain_lifecycle_note),
    domain_evidence_scope: firstTruthy(src.domain_evidence_scope, src.domainEvidenceScope),
    domain_proof_scope: firstTruthy(src.domain_proof_scope),
    membership_credential_status: firstTruthy(src.membership_credential_status),
    official_affiliate_status: firstTruthy(src.official_affiliate_status),
    official_affiliate_label: firstTruthy(src.official_affiliate_label),
    official_affiliate_note: firstTruthy(src.official_affiliate_note),
    parent_domain:
      src.parent_domain && typeof src.parent_domain === "object"
        ? src.parent_domain
        : null,
    group_affiliation_status: firstTruthy(src.group_affiliation_status),
    public_limitation: firstTruthy(src.public_limitation),
    relay_available: Boolean(src.relay_available),
    relay_availability: firstTruthy(src.relay_availability),
    public_record: firstTruthy(src.public_record),
    member_confirmation: firstTruthy(src.member_confirmation),
    request_confirmation_available: Boolean(src.request_confirmation_available),
  };
}

function pageShell(): React.CSSProperties {
  return {
    maxWidth: 1080,
    margin: "0 auto",
    padding: "12px 12px 34px",
    display: "grid",
    gap: 12,
  };
}

function paperCard(): React.CSSProperties {
  return {
    position: "relative",
    overflow: "hidden",
    borderRadius: 28,
    background: "#FFFFFF",
    border: "1px solid rgba(8,35,58,0.14)",
    boxShadow: "0 24px 70px rgba(6,24,39,0.14)",
  };
}

function sectionCard(background = "#FFFFFF"): React.CSSProperties {
  return {
    position: "relative",
    overflow: "hidden",
    borderRadius: 22,
    background,
    border: "1px solid rgba(8,35,58,0.12)",
    padding: 16,
    boxShadow: "0 10px 28px rgba(6,24,39,0.06)",
  };
}

function sectionTitle(): React.CSSProperties {
  return {
    margin: 0,
    color: "#07172C",
    fontSize: 20,
    fontWeight: 1000,
    lineHeight: 1.16,
  };
}

function helperText(): React.CSSProperties {
  return {
    margin: 0,
    color: "#526579",
    fontSize: 14,
    fontWeight: 780,
    lineHeight: 1.5,
  };
}

function HeroChip({ color, label }: { color: string; label: string }) {
  return (
    <span
      style={{
        minHeight: 34,
        borderRadius: 999,
        padding: "7px 11px",
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        color: "#F7FAFF",
        background: "rgba(255,255,255,0.08)",
        border: `1px solid ${color}80`,
        fontSize: 13,
        fontWeight: 1000,
        lineHeight: 1.1,
        whiteSpace: "normal",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 14,
          height: 14,
          borderRadius: 999,
          border: `2px solid ${color}`,
          boxShadow: `0 0 0 3px ${color}22`,
        }}
      />
      {label}
    </span>
  );
}

function fitRecordName(value: string): React.CSSProperties {
  const length = safeStr(value).length;
  return {
    fontSize:
      length > 24
        ? "clamp(25px, 6.4vw, 40px)"
        : length > 16
          ? "clamp(28px, 7.2vw, 46px)"
          : "clamp(34px, 9vw, 54px)",
  };
}

export default function CommunityVerifyPage() {
  const { communityKey } = useParams<{ communityKey: string }>();
  const [record, setRecord] = useState<CommunityVerifyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [requestingConfirmation, setRequestingConfirmation] = useState(false);
  const keyText = safeStr(communityKey);
  const publicLink = useMemo(
    () => publicFrontendUrl(`/verify/community/${encodeURIComponent(keyText)}`),
    [keyText]
  );

  const loadRecord = useCallback(async () => {
    if (!keyText) {
      setError("Community code is missing.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await getPublicCommunityVerification(keyText);
      setRecord(normalizeRecord(result));
    } catch (err: any) {
      setRecord(null);
      setError(publicVerificationErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [keyText]);

  useEffect(() => {
    void loadRecord();
  }, [loadRecord]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function copyLink() {
    const copied = await safeCopy(publicLink);
    setNotice({
      tone: copied ? "success" : "error",
      text: copied
        ? "GSN community verification link copied."
        : "Copy failed. Use the browser address bar.",
    });
  }

  const communityName = firstTruthy(record?.community_name, "GSN community");
  const communityAnchor = firstTruthy(record?.community_code, record?.community_id, "Not shown");
  const status = safeStr(record?.status).toLowerCase() || "unknown";
  const active = status === "active";
  const relayAvailable = Boolean(record?.relay_available);
  const relayAvailability = firstTruthy(
    record?.relay_availability,
    relayAvailable ? "Available" : "Not available"
  );
  const requestConfirmationAvailable = Boolean(record?.request_confirmation_available);
  const publicRecord = normalizePublicRecordLabel(record?.public_record);
  const domainStatus = firstTruthy(record?.domain_status, "Recorded community domain");
  const communityTypeLabel = firstTruthy(
    record?.community_type_label,
    record?.community_type ? labelize(record.community_type) : "",
    "Organized community"
  );
  const communityTypeSource = firstTruthy(
    record?.community_type_source,
    "Best current public reading, not formal registration"
  );
  const publicFaceLabel = firstTruthy(
    record?.community_public_face_label,
    "Basic public record"
  );
  const publicFaceScope = firstTruthy(
    record?.community_public_face_scope,
    "Shows Community ID, public status, inferred community type, domain stage, affiliate claim, and controlled relay availability. It is not a full community profile, member list, service guarantee, or community health report."
  );
  const nextEvidenceLabel = firstTruthy(
    record?.community_next_evidence_label,
    requestConfirmationAvailable
      ? "Use controlled confirmation before relying on a claim"
      : "Ask for scoped member or group evidence"
  );
  const nextEvidenceScope = firstTruthy(
    record?.community_next_evidence_scope,
    "If a person, shop, line, or subgroup claims this community identity, ask for a scoped member credential, TrustSlip, acknowledged affiliate record, or controlled community confirmation. Do not rely on the display name alone."
  );
  const recordStartedLabel = firstTruthy(
    record?.community_record_started_label,
    "GSN record date not shown"
  );
  const recordStartedScope = firstTruthy(
    record?.community_record_started_scope,
    "This is the date this community record entered GSN. It is not the date the real-world community was founded or formally registered."
  );
  const mobilityLabel = firstTruthy(
    record?.community_mobility_label,
    "Portable Community ID anchor"
  );
  const mobilityScope = firstTruthy(
    record?.community_mobility_scope,
    "Use this Community ID alongside scoped member credentials, TrustSlips, acknowledged affiliate records, or controlled confirmations when trust needs to travel outside the original room. The Community ID alone does not transfer trust or approve a transaction."
  );
  const readerDecisionLabel = firstTruthy(
    record?.community_reader_decision_label,
    "First check, not final decision"
  );
  const readerDecisionScope = firstTruthy(
    record?.community_reader_decision_scope,
    "Use this record to see whether a Community ID resolves to a recorded GSN community. For serious trade, lending, membership, shop, line, welfare, or affiliate decisions, ask for current scoped evidence before acting."
  );
  const evidenceCurrentnessLabel = firstTruthy(
    record?.community_evidence_currentness_label,
    active ? "Active recorded Community ID" : "Community record is not active"
  );
  const evidenceCurrentnessScope = firstTruthy(
    record?.community_evidence_currentness_scope,
    active
      ? "This Community ID resolves to an active GSN community record. Parent-domain acknowledgement and member-level proof still need separate current scoped evidence."
      : "This Community ID resolves to a GSN record, but the community record is not active. Treat it as historical or unavailable public evidence until current scoped evidence is supplied."
  );
  const evidenceCurrentnessStatus = safeStr(
    record?.community_evidence_currentness_status
  );
  const evidenceCurrentnessTone: "good" | "warn" | "info" =
    evidenceCurrentnessStatus.includes("inactive") ||
    evidenceCurrentnessStatus.includes("historical")
      ? "warn"
      : evidenceCurrentnessStatus.includes("parent")
        ? "good"
        : "info";
  const domainLifecycleLabel = firstTruthy(
    record?.domain_lifecycle_label,
    "Recorded in GSN"
  );
  const domainLifecycleNote = firstTruthy(
    record?.domain_lifecycle_note,
    "GSN has a community ID record for this community. Paid protected domain ownership, parent-domain control, and affiliate approval are not asserted by this public record yet."
  );
  const domainEvidenceScope = firstTruthy(
    record?.domain_evidence_scope,
    record?.domain_proof_scope,
    "Community ID is the record anchor. The name is a display label."
  );
  const membershipCredentialStatus = firstTruthy(
    record?.membership_credential_status,
    "Member, shop, and group credentials are not exposed on this public page"
  );
  const officialAffiliateLabel = firstTruthy(
    record?.official_affiliate_label,
    "No parent-domain affiliate claim on this record"
  );
  const officialAffiliateNote = firstTruthy(
    record?.official_affiliate_note,
    "This public record does not certify that any subgroup, line, shop cluster, or independent group has been accepted under this community domain. Parent-domain acknowledgement needs its own record."
  );
  const parentDomain = record?.parent_domain || null;
  const parentDomainLabel = firstTruthy(
    parentDomain?.community_name,
    parentDomain?.community_code
  );
  const groupAffiliationStatus = firstTruthy(
    record?.group_affiliation_status,
    "Affiliate groups must be acknowledged under the parent domain"
  );
  const publicLimitation = firstTruthy(
    record?.public_limitation,
    "This record shows the community identity recorded in GSN. It does not automatically verify every person, shop, line, or subgroup using the community name."
  );
  const claimBoundaryScope =
    "A person, shop, line, subgroup, or affiliate sharing this community record still needs its own scoped member credential, TrustSlip, acknowledged affiliate record, or controlled confirmation. This page is the community anchor, not their private membership record.";
  const communityReading = [
    {
      title: "Trust anchor",
      body: `${domainStatus}. ${domainEvidenceScope} Names are display labels; the Community ID is what the reader should check.`,
      tone: "good" as const,
    },
    {
      title: "What this means",
      body: `${publicRecord}. ${publicFaceScope}`,
      tone: "info" as const,
    },
    {
      title: "Evidence currentness",
      body: `${evidenceCurrentnessLabel}. ${evidenceCurrentnessScope}`,
      tone: evidenceCurrentnessTone,
    },
    {
      title: "What remains unchecked",
      body: publicLimitation,
      tone: "warn" as const,
    },
    {
      title: "Claim boundary",
      body: claimBoundaryScope,
      tone: "warn" as const,
    },
    {
      title: "Hidden by design",
      body: "Private member lists, phone numbers, verifier names, witness details, disputes, and admin records are not shown on this public page.",
      tone: "info" as const,
    },
    {
      title: "Next safe step",
      body: requestConfirmationAvailable
        ? "Use controlled confirmation when you need a live answer from the community."
        : "Ask for a member credential, TrustSlip, or fresh community confirmation before relying on a person or subgroup claim.",
      tone: "info" as const,
    },
    {
      title: "Reader decision",
      body: `${readerDecisionLabel}. ${readerDecisionScope}`,
      tone: "info" as const,
    },
  ];
  const confirmationActionTitle = requestConfirmationAvailable
    ? "Controlled confirmation available"
    : "Controlled confirmation not available yet";
  const confirmationActionBody = requestConfirmationAvailable
    ? "Use Request confirmation when you need a current answer from the community without exposing private member contacts."
    : "This community cannot receive controlled confirmation from this public page yet. Ask for a scoped member credential, TrustSlip, acknowledged affiliate record, or fresh community evidence before acting.";

  async function requestConfirmation() {
    if (!requestConfirmationAvailable) {
      setNotice({
        tone: "error",
        text: "Controlled confirmation is not available for this community yet.",
      });
      return;
    }

    const requestKey = firstTruthy(record?.community_code, record?.community_id, keyText);
    if (!requestKey) {
      setNotice({
        tone: "error",
        text: "Community ID is missing. Refresh this public record first.",
      });
      return;
    }

    setRequestingConfirmation(true);
    try {
      const result = await requestPublicCommunityVerificationConfirmation(requestKey, {
        requester_external_label: "Public verification viewer",
      });
      setNotice({
        tone: "success",
        text:
          firstTruthy(result?.message) ||
          "Request sent through GSN controlled relay. Private member contacts were not exposed.",
      });
    } catch (err: any) {
      setNotice({
        tone: "error",
        text:
          err?.message ||
          "Request could not be sent through the controlled relay. Try again from this page.",
      });
    } finally {
      setRequestingConfirmation(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #F7FAFF 0%, #EEF5FF 50%, #F8FAFC 100%)",
      }}
    >
      <div style={pageShell()}>
        <nav
          aria-label="Public verification navigation"
          style={{
            minHeight: 54,
            borderRadius: 18,
            background: "rgba(255,255,255,0.96)",
            border: "1px solid rgba(8,35,58,0.10)",
            boxShadow: "0 10px 24px rgba(6,24,39,0.08)",
            padding: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span
            style={{
              color: "#0B63D1",
              fontSize: 12,
              fontWeight: 1000,
              letterSpacing: 0.8,
              textTransform: "uppercase",
            }}
          >
            Public verification
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <StableCtaLink
              to="/"
              debugId="community-verify.home"
              stableHeight={38}
              style={{ minWidth: 76, borderRadius: 12, fontSize: 13 }}
            >
              Home
            </StableCtaLink>
            <SecondaryButton
              debugId="community-verify.back"
              stableHeight={38}
              style={{ minWidth: 76, borderRadius: 12, fontSize: 13 }}
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                  return;
                }
                window.location.assign("/");
              }}
            >
              Back
            </SecondaryButton>
          </div>
        </nav>

        <article style={paperCard()}>
          <TrustPaperWatermark name="home" color="#0B63D1" size={260} opacity={0.045} />
          <div style={{ position: "relative", zIndex: 1, padding: 16, display: "grid", gap: 12 }}>
            <header
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                <span
                  style={{
                    color: "#0B63D1",
                    fontSize: 11,
                    fontWeight: 1000,
                    letterSpacing: 0.9,
                    textTransform: "uppercase",
                  }}
                >
                  Public community domain record
                </span>
                <h1
                  style={{
                    margin: 0,
                    color: "#061827",
                    fontSize: "clamp(26px, 6vw, 34px)",
                    lineHeight: 1.04,
                    fontWeight: 1000,
                    letterSpacing: 0,
                  }}
                >
                  {loading ? "Checking community" : "Community Verification"}
                </h1>
                <p style={{ ...helperText(), maxWidth: 680, fontSize: 13.5, lineHeight: 1.34 }}>
                  Public QR check for community identity only.
                </p>
              </div>
              <div
                aria-label="GSN Global Support Network"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#061827",
                  fontWeight: 1000,
                }}
              >
                <span style={{ fontSize: 28, lineHeight: 1 }}>GSN</span>
                <span style={{ width: 2, height: 30, background: "#D6AA45", transform: "skew(-14deg)" }} />
                <span style={{ fontSize: 11, lineHeight: 1.05 }}>
                  Global
                  <br />
                  Support
                  <br />
                  Network
                </span>
              </div>
            </header>

            {notice ? (
              <div
                role="status"
                style={{
                  ...sectionCard(notice.tone === "success" ? "#ECFDF3" : "#FEF2F2"),
                  color: notice.tone === "success" ? "#166534" : "#991B1B",
                  fontWeight: 1000,
                }}
              >
                {notice.text}
              </div>
            ) : null}

            {loading ? (
              <section style={sectionCard("#F7FAFF")}>
                <h2 style={sectionTitle()}>Loading community record</h2>
                <p style={helperText()}>GSN is checking the public community verification route.</p>
              </section>
            ) : error ? (
              <section style={sectionCard("#FEF2F2")}>
                <h2 style={sectionTitle()}>Community not found</h2>
                <p style={helperText()}>{error}</p>
                <PrimaryButton
                  debugId="community-verify.retry"
                  stableHeight={58}
                  onClick={() => void loadRecord()}
                  style={{ marginTop: 14 }}
                >
                  Try again
                </PrimaryButton>
              </section>
            ) : record ? (
              <>
                <section
                  style={{
                    ...sectionCard("#F8FBFF"),
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <TrustPaperWatermark
                    name="shield"
                    color="#0B63D1"
                    size={190}
                    opacity={0.08}
                  />
                  <div
                    style={{
                      borderRadius: 24,
                      background:
                        "radial-gradient(circle at 74% 72%, rgba(11,99,209,0.26) 0%, rgba(11,99,209,0.00) 34%), linear-gradient(145deg, #061827 0%, #08233A 58%, #0B3E78 100%)",
                      color: "#F7FAFF",
                      border: "1px solid rgba(214,170,69,0.34)",
                      padding: 18,
                      display: "grid",
                      gap: 12,
                      boxShadow: "0 18px 42px rgba(6,24,39,0.22)",
                    }}
                    aria-label="Public community record"
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) 58px",
                        gap: 10,
                        alignItems: "start",
                      }}
                    >
                      <div style={{ minWidth: 0, display: "grid", gap: 8 }}>
                        <span
                          style={{
                            color: "#C8D8EA",
                            fontSize: 11,
                            fontWeight: 1000,
                            letterSpacing: 1.2,
                            textTransform: "uppercase",
                          }}
                        >
                          Public community record
                        </span>
                        <h2
                          style={{
                            margin: 0,
                            color: "#FFFFFF",
                            ...fitRecordName(communityName),
                            lineHeight: 0.98,
                            fontWeight: 1000,
                            letterSpacing: 0,
                            overflowWrap: "break-word",
                            wordBreak: "normal",
                            hyphens: "none",
                            maxWidth: "100%",
                          }}
                        >
                          {communityName}
                        </h2>
                      </div>
                      <div
                        style={{
                          width: 58,
                          height: 58,
                          borderRadius: 18,
                          display: "grid",
                          placeItems: "center",
                          border: "1px solid rgba(242,199,102,0.42)",
                          background: "rgba(255,255,255,0.04)",
                        }}
                      >
                        {communityVerifyIconBadge("trust-shield", 44, "navy")}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr)",
                        gap: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <strong
                          style={{
                            color: "#EAF3FF",
                            fontSize: "clamp(18px, 5vw, 26px)",
                            lineHeight: 1.08,
                            fontWeight: 1000,
                            overflowWrap: "break-word",
                            wordBreak: "normal",
                          }}
                        >
                          {communityAnchor}
                        </strong>
                        <span
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            display: "grid",
                            placeItems: "center",
                            background: "rgba(255,255,255,0.10)",
                            color: "#EAF3FF",
                            fontSize: 20,
                            fontWeight: 900,
                          }}
                          aria-hidden="true"
                        >
                          ID
                        </span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <HeroChip color="#2E9B62" label={active ? "Active" : labelize(record.status)} />
                        <HeroChip color="#0B63D1" label={publicRecord} />
                        <HeroChip color="#64748B" label={`Relay ${relayAvailability.toLowerCase()}`} />
                      </div>
                      <p
                        style={{
                          margin: "4px 0 0",
                          color: "#C8D8EA",
                          fontSize: 14,
                          lineHeight: 1.45,
                          fontWeight: 760,
                        }}
                      >
                        This confirms the community identity in GSN. It does not verify every member, shop, line, or subgroup.
                      </p>
                    </div>
                  </div>
                  <div
                    style={{
                      ...sectionCard("#FFFFFF"),
                      display: "grid",
                      gap: 14,
                      boxShadow: "0 14px 34px rgba(6,24,39,0.07)",
                    }}
                    aria-label="Smart verification guidance"
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "44px minmax(0, 1fr)",
                        gap: 10,
                        alignItems: "start",
                      }}
                    >
                      {communityVerifyIconBadge("certificate-seal", 42, "blue")}
                      <div
                        style={{
                          minWidth: 0,
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "7px 10px",
                          alignItems: "center",
                        }}
                      >
                        <h2 style={{ ...sectionTitle(), fontSize: 22 }}>Smart guidance</h2>
                        <span
                          style={{
                            minHeight: 30,
                            borderRadius: 999,
                            padding: "6px 10px",
                            color: "#0B63D1",
                            background: "#EEF6FF",
                            border: "1px solid rgba(11,99,209,0.16)",
                            fontSize: 10.5,
                            fontWeight: 1000,
                            letterSpacing: 0,
                            textTransform: "uppercase",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Context-aware
                        </span>
                        <p style={{ ...helperText(), flexBasis: "100%" }}>
                          What are you checking?
                        </p>
                      </div>
                    </div>
                    <div
                      aria-label="Verification scope selector"
                      style={{
                        borderRadius: 18,
                        background: "#EEF3FB",
                        padding: 6,
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 6,
                      }}
                    >
                      {["Community", "Person", "Shop", "Group"].map((item) => (
                        <span
                          key={item}
                          style={{
                            minHeight: 44,
                            borderRadius: 14,
                            display: "grid",
                            placeItems: "center",
                            background: item === "Community" ? "#FFFFFF" : "transparent",
                            color: item === "Community" ? "#0B63D1" : "#617085",
                            boxShadow:
                              item === "Community" ? "0 8px 18px rgba(6,24,39,0.08)" : "none",
                            fontSize: 14,
                            fontWeight: 1000,
                          }}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                    <div
                      style={{
                        borderRadius: 18,
                        background: "#EAF3FF",
                        border: "1px solid rgba(11,99,209,0.16)",
                        padding: 12,
                        display: "grid",
                        gridTemplateColumns: "42px minmax(0, 1fr)",
                        gap: 10,
                        alignItems: "start",
                      }}
                    >
                      {communityVerifyIconBadge("community-building", 40, "blue")}
                      <div style={{ minWidth: 0, display: "grid", gap: 7 }}>
                        <strong
                          style={{
                            color: "#07172C",
                            fontSize: 18,
                            fontWeight: 1000,
                            lineHeight: 1.16,
                          }}
                        >
                          This is an active community record
                        </strong>
                        <p style={{ ...helperText(), color: "#526579", lineHeight: 1.42 }}>
                          Use the Community ID as the anchor. For a person, shop, line, or group claim, ask for scoped confirmation.
                        </p>
                        <p style={{ margin: 0, color: "#24415C", fontSize: 13, fontWeight: 900, lineHeight: 1.38 }}>
                          Best next step: request scoped evidence before relying on a narrower claim.
                        </p>
                      </div>
                    </div>
                    <PrimaryButton
                      debugId="community-verify.request-confirmation"
                      stableHeight={56}
                      busy={requestingConfirmation}
                      busyLabel="Sending"
                      disabled={!requestConfirmationAvailable || requestingConfirmation}
                      onClick={() => void requestConfirmation()}
                      style={{ borderRadius: 17, fontSize: 15 }}
                    >
                      Request scoped confirmation
                    </PrimaryButton>
                  </div>
                  <div
                    style={{
                      borderRadius: 20,
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,251,255,0.98) 100%)",
                      border: "1px solid rgba(8,35,58,0.12)",
                      padding: 12,
                      display: "grid",
                      gap: 12,
                      boxShadow: "0 12px 28px rgba(6,24,39,0.07)",
                    }}
                    aria-label="Verification snapshot"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {communityVerifyIconBadge("certificate-seal", 38, "navy")}
                      <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                        <span
                          style={{
                            color: "#0B63D1",
                            fontSize: 11,
                            fontWeight: 1000,
                            letterSpacing: 0.8,
                            textTransform: "uppercase",
                          }}
                        >
                          Verification snapshot
                        </span>
                        <strong
                          style={{
                            color: "#07172C",
                            fontSize: 18,
                            fontWeight: 1000,
                            lineHeight: 1.14,
                          }}
                        >
                          Public QR check for community identity only
                        </strong>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr",
                        gap: 7,
                      }}
                    >
                      <SnapshotFact
                        icon="records-folder"
                        label="Community ID"
                        value={communityAnchor}
                        wide
                      />
                      <SnapshotFact
                        icon="trust-shield"
                        label="Status"
                        value={active ? "Active" : labelize(record.status)}
                      />
                      <SnapshotFact
                        icon="community-building"
                        label="Community type"
                        value={communityTypeLabel}
                      />
                      <SnapshotFact
                        icon="phone-contact"
                        label="Relay"
                        value={relayAvailability}
                      />
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr",
                        gap: 8,
                      }}
                    >
                      <SecondaryButton
                        debugId="community-verify.copy-link"
                        stableHeight={52}
                        onClick={() => void copyLink()}
                        style={{ borderRadius: 15, fontSize: 13.5 }}
                      >
                        {communityVerifyIconBadge("public-globe", 32, "navy")}
                        Copy
                      </SecondaryButton>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                        gap: 8,
                      }}
                    >
                      <SnapshotBoundary
                        tone="good"
                        icon="trust-shield"
                        title="What this shows"
                        body={`${publicRecord}. Check the Community ID first.`}
                      />
                      <SnapshotBoundary
                        tone="warn"
                        icon="certificate-seal"
                        title="What it does not prove"
                        body="It does not verify every member, shop, subgroup, line, or transaction."
                      />
                    </div>
                  </div>
                  <details
                    style={{
                      borderRadius: 20,
                      background: "#FFFFFF",
                      border: "1px solid rgba(8,35,58,0.11)",
                      boxShadow: "0 10px 24px rgba(6,24,39,0.05)",
                      overflow: "hidden",
                    }}
                  >
                    <StableDisclosureSummary
                      debugId="community-verify.verification-details"
                      stableHeight={56}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "10px 12px",
                        color: "#07172C",
                        fontWeight: 1000,
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
                        {communityVerifyIconBadge("records-folder", 34, "navy")}
                        Verification details
                      </span>
                      <span aria-hidden="true" style={{ color: "#617085", fontSize: 20 }}>
                        +
                      </span>
                    </StableDisclosureSummary>
                    <div style={{ padding: "0 12px 12px", display: "grid", gap: 12 }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                          gap: 10,
                        }}
                      >
                        <InfoTile icon="records-folder" label="Community ID" value={communityAnchor} />
                        <InfoTile icon="community-building" label="Community type" value={communityTypeLabel} />
                        <InfoTile icon="trust-shield" label="Status" value={labelize(record.status)} />
                        <InfoTile icon="certificate-seal" label="Domain stage" value={domainLifecycleLabel} />
                        <InfoTile icon="trust-shield" label="Currentness" value={evidenceCurrentnessLabel} />
                        <InfoTile icon="community-building" label="Affiliate claim" value={officialAffiliateLabel} />
                        {parentDomainLabel ? (
                          <InfoTile icon="records-folder" label="Parent domain" value={parentDomainLabel} />
                        ) : null}
                        <InfoTile icon="public-globe" label="Public record" value={publicRecord} />
                        <InfoTile icon="records-folder" label="Public face" value={publicFaceLabel} />
                        <InfoTile icon="certificate-seal" label="GSN record" value={recordStartedLabel} />
                        <InfoTile icon="trust-shield" label="Next evidence" value={nextEvidenceLabel} />
                        <InfoTile icon="phone-contact" label="Relay" value={relayAvailability} />
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                          gap: 10,
                        }}
                      >
                        {communityReading.map((item) => (
                          <EvidenceScopeCard
                            key={item.title}
                            title={item.title}
                            body={item.body}
                            tone={item.tone}
                          />
                        ))}
                        <EvidenceScopeCard title="Domain stage" body={domainLifecycleNote} tone="info" />
                        <EvidenceScopeCard
                          title="What this shows"
                          body={`${domainStatus}. ${domainEvidenceScope}`}
                          tone="good"
                        />
                        <EvidenceScopeCard title="Public face" body={publicFaceScope} tone="info" />
                        <EvidenceScopeCard title="GSN record date" body={recordStartedScope} tone="info" />
                        <EvidenceScopeCard title="Next evidence to request" body={nextEvidenceScope} tone="good" />
                        <EvidenceScopeCard
                          title="Trust mobility"
                          body={`${mobilityLabel}. ${mobilityScope}`}
                          tone="info"
                        />
                        <EvidenceScopeCard
                          title="Community type"
                          body={`${communityTypeLabel}. ${communityTypeSource}. This is a public reading, not ownership, membership, or parent-domain approval.`}
                          tone="info"
                        />
                        <EvidenceScopeCard
                          title="What still needs credential evidence"
                          body={membershipCredentialStatus}
                          tone="warn"
                        />
                        <EvidenceScopeCard
                          title="Group affiliation"
                          body={`${groupAffiliationStatus}. ${officialAffiliateNote}`}
                          tone="info"
                        />
                        <EvidenceScopeCard
                          title={confirmationActionTitle}
                          body={confirmationActionBody}
                          tone={requestConfirmationAvailable ? "good" : "warn"}
                        />
                      </div>
                    </div>
                  </details>
                  <div
                    style={{
                      ...sectionCard("#FFFFFF"),
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr)",
                      gap: 12,
                      alignItems: "start",
                      boxShadow: "0 10px 28px rgba(6,24,39,0.05)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div
                        style={{
                          width: 92,
                          height: 92,
                          borderRadius: 18,
                          border: "1px solid rgba(8,35,58,0.14)",
                          background: "#FFFFFF",
                          display: "grid",
                          placeItems: "center",
                          padding: 8,
                          flex: "0 0 auto",
                        }}
                      >
                        <QRCodeSVG
                          value={publicLink}
                          size={74}
                          bgColor="#FFFFFF"
                          fgColor="#07172C"
                          level="M"
                          marginSize={1}
                        />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h2 style={{ margin: 0, color: "#07172C", fontSize: 17, fontWeight: 1000 }}>
                          Share this public record
                        </h2>
                        <p style={{ margin: "7px 0 0", ...helperText(), lineHeight: 1.38 }}>
                          Scan or copy the link to reopen this same Community ID record. Private member lists and admin evidence stay hidden.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      ...sectionCard("#FFFFFF"),
                      display: "grid",
                      gridTemplateColumns: "44px minmax(0, 1fr) auto",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    {communityVerifyIconBadge("certificate-seal", 40, "blue")}
                    <div style={{ minWidth: 0 }}>
                      <h2 style={{ margin: 0, color: "#07172C", fontSize: 18, fontWeight: 1000 }}>
                        Private by design
                      </h2>
                      <p style={{ margin: "4px 0 0", ...helperText(), lineHeight: 1.34 }}>
                        Member lists, contacts, disputes, and admin notes stay hidden.
                      </p>
                    </div>
                    <span aria-hidden="true" style={{ color: "#8AA0B8", fontSize: 24, fontWeight: 700 }}>
                      {">"}
                    </span>
                  </div>
                  <SecondaryButton
                    debugId="community-verify.refresh"
                    stableHeight={52}
                    onClick={() => void loadRecord()}
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid rgba(8,35,58,0.16)",
                      color: "#07172C",
                      boxShadow: "0 10px 22px rgba(6,24,39,0.08)",
                    }}
                  >
                    {communityVerifyIconBadge("records-folder", 36, "navy")}
                    Refresh
                  </SecondaryButton>
                </section>
              </>
            ) : null}
          </div>
          <TrustPaperSecurityFooter text="Community-first verification. Public status only." />
        </article>
      </div>
    </div>
  );
}

function SnapshotFact({
  icon,
  label,
  value,
  wide = false,
}: {
  icon: Gsn3DIconKey;
  label: string;
  value: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      style={{
        minHeight: wide ? 60 : 56,
        borderRadius: 16,
        background: "#FFFFFF",
        border: "1px solid rgba(8,35,58,0.10)",
        padding: "8px 10px",
        display: "grid",
        gridTemplateColumns: "34px minmax(0, 1fr)",
        gap: 9,
        alignItems: "center",
        gridColumn: wide ? "1 / -1" : undefined,
        boxShadow: "0 8px 18px rgba(6,24,39,0.05)",
      }}
    >
      {communityVerifyIconBadge(icon, 34)}
      <span style={{ minWidth: 0, display: "grid", gap: 3 }}>
        <span
          style={{
            color: "#617085",
            fontSize: 10.5,
            fontWeight: 1000,
            letterSpacing: 0.4,
            lineHeight: 1.12,
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
        <strong
          style={{
            color: "#07172C",
            fontSize: wide ? 15.5 : 15,
            fontWeight: 1000,
            lineHeight: 1.12,
            overflowWrap: "anywhere",
            wordBreak: "normal",
            whiteSpace: "normal",
          }}
        >
          {value}
        </strong>
      </span>
    </div>
  );
}

function SnapshotBoundary({
  tone,
  icon,
  title,
  body,
}: {
  tone: "good" | "warn";
  icon: Gsn3DIconKey;
  title: string;
  body: string;
}) {
  const styles =
    tone === "good"
      ? {
          background: "#ECFDF3",
          border: "rgba(46,155,98,0.18)",
          title: "#166534",
        }
      : {
          background: "#FFF7E6",
          border: "rgba(245,158,11,0.22)",
          title: "#92400E",
        };

  return (
    <div
      style={{
        minHeight: 86,
        borderRadius: 16,
        background: styles.background,
        border: `1px solid ${styles.border}`,
        padding: 11,
        display: "grid",
        gridTemplateColumns: "34px minmax(0, 1fr)",
        gap: 9,
        alignItems: "start",
      }}
    >
      {communityVerifyIconBadge(icon, 32, tone === "good" ? "green" : "amber")}
      <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
        <span
          style={{
            margin: 0,
            color: styles.title,
            fontSize: 14,
            fontWeight: 1000,
            lineHeight: 1.14,
          }}
        >
          {title}
        </span>
        <p style={{ ...helperText(), color: "#1F3145", fontSize: 12.5, lineHeight: 1.35 }}>
          {body}
        </p>
      </div>
    </div>
  );
}

function EvidenceScopeCard({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: "good" | "warn" | "info";
}) {
  const toneStyles = {
    good: {
      background: "#ECFDF3",
      border: "rgba(46,155,98,0.18)",
      title: "#166534",
    },
    warn: {
      background: "#FFF7E6",
      border: "rgba(245,158,11,0.22)",
      title: "#92400E",
    },
    info: {
      background: "#EAF3FF",
      border: "rgba(11,99,209,0.16)",
      title: "#073E83",
    },
  }[tone];

  return (
    <div
      style={{
        borderRadius: 18,
        background: toneStyles.background,
        border: `1px solid ${toneStyles.border}`,
        padding: 12,
        display: "grid",
        gap: 6,
      }}
    >
      <h3 style={{ margin: 0, color: toneStyles.title, fontSize: 15, fontWeight: 1000 }}>
        {title}
      </h3>
      <p style={{ ...helperText(), color: "#1F3145", fontSize: 13 }}>{body}</p>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: Gsn3DIconKey;
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: 92,
        borderRadius: 18,
        background: "#FFFFFF",
        border: "1px solid rgba(8,35,58,0.10)",
        padding: 12,
        display: "grid",
        gap: 8,
        alignContent: "start",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {communityVerifyIconBadge(icon, 34)}
        <span style={{ color: "#617085", fontSize: 13, fontWeight: 900, lineHeight: 1.2 }}>
          {label}
        </span>
      </div>
      <strong
        style={{
          color: "#07172C",
          fontSize: 17,
          fontWeight: 1000,
          lineHeight: 1.2,
          overflowWrap: "anywhere",
          wordBreak: "normal",
        }}
      >
        {value}
      </strong>
    </div>
  );
}
