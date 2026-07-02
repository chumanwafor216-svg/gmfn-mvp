import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useParams } from "react-router-dom";
import { GsnRealisticIcon, type Gsn3DIconKey } from "../components/GsnRealisticIcon";
import PageTopNav from "../components/PageTopNav";
import { PrimaryButton, SecondaryButton } from "../components/StableButton";
import {
  TrustPaperAuthorityStrip,
  TrustPaperSecurityNote,
  TrustPaperSecurityFooter,
  TrustPaperWatermark,
  TrustPaperWatermarkField,
} from "../components/TrustPaperMarks";
import {
  TrustDocumentBoundaryPanel,
  TrustDocumentConfidenceRibbon,
  TrustDocumentDisclosureSection,
  TrustDocumentFingerprint,
  TrustDocumentSecurityPanel,
  type TrustDocumentPanelItem,
  type TrustDocumentRibbonItem,
} from "../components/TrustDocumentLanguage";
import {
  getPublicCommunityMemberVerification,
  safeCopy,
} from "../lib/api";
import { publicFrontendUrl } from "../lib/publicLinks";

type CommunityMemberCredential = {
  community_name?: string | null;
  community_id?: string | number | null;
  community_code?: string | null;
  member_gsn_id?: string | null;
  member_display_name?: string | null;
  membership_status?: string | null;
  membership_role?: string | null;
  public_label?: string | null;
  member_witness_count?: number | string | null;
  membership_strength_label?: string | null;
  membership_renewal_status_label?: string | null;
  membership_valid_until?: string | null;
  next_witness_renewal_at?: string | null;
  next_witness_renewal_status_label?: string | null;
  community_public_face_status?: string | null;
  community_public_face_label?: string | null;
  official_affiliate_status?: string | null;
  official_affiliate_label?: string | null;
  community_evidence_currentness_status?: string | null;
  community_evidence_currentness_label?: string | null;
  community_evidence_currentness_scope?: string | null;
  community_activity_count?: number | string | null;
  community_activity_latest_at?: string | null;
  community_activity_categories?: string[];
  community_activity_label?: string | null;
  community_trust_reading_label?: string | null;
  community_trust_reading_scope?: string | null;
  membership_currentness_label?: string | null;
  membership_currentness_scope?: string | null;
  evidence_scope?: string | null;
  proof_scope?: string | null;
  privacy_note?: string | null;
  decision_note?: string | null;
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
      "This public credential check is temporarily unavailable. " +
      "GSN needs to refresh the public credential setup before this check can run."
    );
  }
  return message || "This membership credential could not be loaded.";
}

function dateLabel(value: any): string {
  const text = safeStr(value);
  if (!text) return "Not shown";
  const parsed = new Date(text);
  if (!Number.isFinite(parsed.getTime())) return text;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function memberCredentialReferenceFingerprint(...values: unknown[]): string {
  const input =
    values.map((value) => safeStr(value)).join("|") || "gsn-member-credential";
  let hashA = 0x811c9dc5;
  let hashB = 0x45d9f3b;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    hashA ^= code;
    hashA = Math.imul(hashA, 0x01000193);
    hashB ^= code + index;
    hashB = Math.imul(hashB, 0x27d4eb2d);
  }
  const left = (hashA >>> 0).toString(16).padStart(8, "0");
  const right = (hashB >>> 0).toString(16).padStart(8, "0");
  return `GSN-MC-${left}-${right}`.toUpperCase();
}

function normalizeCredential(raw: any): CommunityMemberCredential {
  const source = raw?.credential || raw?.data || raw || {};
  return {
    community_name: firstTruthy(source.community_name, source.communityName),
    community_id: firstTruthy(source.community_id, source.communityId),
    community_code: firstTruthy(source.community_code, source.communityCode),
    member_gsn_id: firstTruthy(source.member_gsn_id, source.memberGsnId),
    member_display_name: firstTruthy(source.member_display_name, source.memberDisplayName),
    membership_status: firstTruthy(source.membership_status, source.membershipStatus),
    membership_role: firstTruthy(source.membership_role, source.membershipRole),
    public_label: firstTruthy(source.public_label, source.publicLabel),
    member_witness_count: source.member_witness_count ?? source.memberWitnessCount ?? null,
    membership_strength_label: firstTruthy(
      source.membership_strength_label,
      source.membershipStrengthLabel
    ),
    membership_renewal_status_label: firstTruthy(
      source.membership_renewal_status_label,
      source.membershipRenewalStatusLabel
    ),
    membership_valid_until: firstTruthy(
      source.membership_valid_until,
      source.membershipValidUntil
    ),
    next_witness_renewal_at: firstTruthy(
      source.next_witness_renewal_at,
      source.nextWitnessRenewalAt
    ),
    next_witness_renewal_status_label: firstTruthy(
      source.next_witness_renewal_status_label,
      source.nextWitnessRenewalStatusLabel
    ),
    community_public_face_status: firstTruthy(
      source.community_public_face_status,
      source.communityPublicFaceStatus
    ),
    community_public_face_label: firstTruthy(
      source.community_public_face_label,
      source.communityPublicFaceLabel
    ),
    official_affiliate_status: firstTruthy(
      source.official_affiliate_status,
      source.officialAffiliateStatus
    ),
    official_affiliate_label: firstTruthy(
      source.official_affiliate_label,
      source.officialAffiliateLabel
    ),
    community_evidence_currentness_status: firstTruthy(
      source.community_evidence_currentness_status,
      source.communityEvidenceCurrentnessStatus
    ),
    community_evidence_currentness_label: firstTruthy(
      source.community_evidence_currentness_label,
      source.communityEvidenceCurrentnessLabel
    ),
    community_evidence_currentness_scope: firstTruthy(
      source.community_evidence_currentness_scope,
      source.communityEvidenceCurrentnessScope
    ),
    community_activity_count:
      source.community_activity_count ?? source.communityActivityCount ?? null,
    community_activity_latest_at: firstTruthy(
      source.community_activity_latest_at,
      source.communityActivityLatestAt
    ),
    community_activity_categories: Array.isArray(source.community_activity_categories)
      ? source.community_activity_categories.map((item: any) => safeStr(item)).filter(Boolean)
      : Array.isArray(source.communityActivityCategories)
        ? source.communityActivityCategories.map((item: any) => safeStr(item)).filter(Boolean)
        : [],
    community_activity_label: firstTruthy(
      source.community_activity_label,
      source.communityActivityLabel
    ),
    community_trust_reading_label: firstTruthy(
      source.community_trust_reading_label,
      source.communityTrustReadingLabel
    ),
    community_trust_reading_scope: firstTruthy(
      source.community_trust_reading_scope,
      source.communityTrustReadingScope
    ),
    membership_currentness_label: firstTruthy(
      source.membership_currentness_label,
      source.membershipCurrentnessLabel
    ),
    membership_currentness_scope: firstTruthy(
      source.membership_currentness_scope,
      source.membershipCurrentnessScope
    ),
    evidence_scope: firstTruthy(source.evidence_scope, source.evidenceScope),
    proof_scope: firstTruthy(source.proof_scope, source.proofScope),
    privacy_note: firstTruthy(source.privacy_note, source.privacyNote),
    decision_note: firstTruthy(source.decision_note, source.decisionNote),
  };
}

function pageShell(): React.CSSProperties {
  return {
    maxWidth: 980,
    margin: "0 auto",
    padding: "20px 16px 42px",
    display: "grid",
    gap: 16,
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

function innerCard(background = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 20,
    border: "1px solid rgba(8,35,58,0.12)",
    background,
    padding: 15,
    boxShadow: "0 10px 28px rgba(6,24,39,0.05)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    color: "#526579",
    fontSize: 11,
    fontWeight: 1000,
    letterSpacing: 0.42,
    textTransform: "uppercase",
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

function evidenceIcon(name: Gsn3DIconKey, tone: "navy" | "green" | "gold" = "navy") {
  const colors = {
    navy: ["#EAF3FF", "#061827"],
    green: ["#ECFDF5", "#166534"],
    gold: ["#FFF7E6", "#92400E"],
  }[tone];
  return (
    <span
      aria-hidden
      style={{
        width: 48,
        height: 48,
        borderRadius: 16,
        display: "grid",
        placeItems: "center",
        background: colors[0],
        border: "1px solid rgba(8,35,58,0.12)",
        color: colors[1],
        flex: "0 0 auto",
      }}
    >
      <GsnRealisticIcon name={name} size={42} decorative />
    </span>
  );
}

function fact(label: string, value: string): React.ReactElement {
  return (
    <div style={innerCard("#FFFFFF")}>
      <div style={sectionLabel()}>{label}</div>
      <div
        style={{
          marginTop: 7,
          color: "#07172C",
          fontSize: 17,
          fontWeight: 1000,
          overflowWrap: "anywhere",
        }}
      >
        {value || "Not shown"}
      </div>
    </div>
  );
}

export default function CommunityMemberVerifyPage() {
  const { communityKey, memberKey } = useParams<{
    communityKey: string;
    memberKey: string;
  }>();
  const [credential, setCredential] = useState<CommunityMemberCredential | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const credentialLoadSeqRef = useRef(0);
  const credentialLoadContextRef = useRef("");
  const cleanCommunityKey = safeStr(communityKey);
  const cleanMemberKey = safeStr(memberKey);
  const publicLink = useMemo(
    () =>
      publicFrontendUrl(
        `/verify/community/${encodeURIComponent(cleanCommunityKey)}/member/${encodeURIComponent(
          cleanMemberKey
        )}`
      ),
    [cleanCommunityKey, cleanMemberKey]
  );

  const loadCredential = useCallback(async () => {
    const contextKey = `${cleanCommunityKey}:${cleanMemberKey}`;
    const loadSeq = credentialLoadSeqRef.current + 1;
    credentialLoadSeqRef.current = loadSeq;
    credentialLoadContextRef.current = contextKey;
    if (!cleanCommunityKey || !cleanMemberKey) {
      setCredential(null);
      setCopied("");
      setError("Community ID and member GSN ID are required.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setCredential(null);
    setCopied("");
    try {
      const result = await getPublicCommunityMemberVerification(
        cleanCommunityKey,
        cleanMemberKey
      );
      if (
        credentialLoadSeqRef.current !== loadSeq ||
        credentialLoadContextRef.current !== contextKey
      ) {
        return;
      }
      setCredential(normalizeCredential(result));
    } catch (err: any) {
      if (
        credentialLoadSeqRef.current !== loadSeq ||
        credentialLoadContextRef.current !== contextKey
      ) {
        return;
      }
      setCredential(null);
      setError(publicVerificationErrorMessage(err));
    } finally {
      if (
        credentialLoadSeqRef.current === loadSeq &&
        credentialLoadContextRef.current === contextKey
      ) {
        setLoading(false);
      }
    }
  }, [cleanCommunityKey, cleanMemberKey]);

  useEffect(() => {
    void loadCredential();
  }, [loadCredential]);

  async function copyLink() {
    const ok = await safeCopy(publicLink);
    setCopied(ok ? "Credential link copied." : "Copy failed. You can copy the browser address.");
  }

  const witnessCount = firstTruthy(credential?.member_witness_count, "0");
  const activityCount = firstTruthy(credential?.community_activity_count, "0");
  const title = firstTruthy(credential?.public_label, "Community Member Credential");
  const trustReadingLabel = firstTruthy(
    credential?.community_trust_reading_label,
    "Community-scoped member evidence"
  );
  const trustReadingScope = firstTruthy(
    credential?.community_trust_reading_scope,
    "This credential reads active membership, witness strength, renewal status, and broad community activity together. It is community-scoped evidence for judgement, not a universal trust score, guarantee, credit approval, or transaction permission."
  );
  const currentnessLabel = firstTruthy(
    credential?.membership_currentness_label,
    "Witness renewal not started"
  );
  const currentnessScope = firstTruthy(
    credential?.membership_currentness_scope,
    "This active membership record has no current witness validity window. Ask for member witnesses, TrustSlip, or live community confirmation before a serious decision."
  );
  const communityRecordCurrentnessLabel = firstTruthy(
    credential?.community_evidence_currentness_label,
    "Active recorded Community ID"
  );
  const communityRecordCurrentnessScope = firstTruthy(
    credential?.community_evidence_currentness_scope,
    "This Community ID resolves to an active GSN community record. Parent-domain acknowledgement and member-level proof still need separate current scoped evidence."
  );
  const witnessStrengthBoundary =
    "Low, missing, expired, withdrawn, or disputed witness evidence should be treated as weaker evidence until renewed.";
  const currentnessTone: "warn" | "info" =
    firstTruthy(credential?.membership_renewal_status_label).toLowerCase() === "expired"
      ? "warn"
      : "info";
  const communityRecordTone: "good" | "warn" | "info" =
    firstTruthy(credential?.community_evidence_currentness_status)
      .toLowerCase()
      .includes("parent_acknowledgement")
      ? "good"
      : firstTruthy(credential?.community_evidence_currentness_status)
            .toLowerCase()
            .includes("inactive") ||
          firstTruthy(credential?.community_evidence_currentness_status)
            .toLowerCase()
            .includes("historical")
        ? "warn"
        : "info";
  const memberAnchor = firstTruthy(credential?.member_gsn_id, cleanMemberKey, "Not shown");
  const communityAnchor = firstTruthy(
    credential?.community_code,
    credential?.community_id,
    cleanCommunityKey,
    "Not shown"
  );
  const membershipStatusText = firstTruthy(credential?.membership_status, "active");
  const membershipStatusLower = membershipStatusText.toLowerCase();
  const witnessCountNumber = Number(witnessCount);
  const witnessCountText =
    Number.isFinite(witnessCountNumber) && witnessCountNumber > 0
      ? `${witnessCount} witness record${witnessCount === "1" ? "" : "s"}`
      : "No witness records shown";
  const memberCredentialFingerprint = memberCredentialReferenceFingerprint(
    memberAnchor,
    communityAnchor,
    membershipStatusText,
    credential?.membership_role,
    witnessCount,
    currentnessLabel,
    communityRecordCurrentnessLabel,
    credential?.membership_valid_until
  );
  const memberCredentialConfidenceRibbonItems: TrustDocumentRibbonItem[] = [
    {
      label: "Member status",
      value: membershipStatusText,
      tone: membershipStatusLower.includes("active")
        ? "good"
        : membershipStatusLower.includes("pending") ||
            membershipStatusLower.includes("inactive") ||
            membershipStatusLower.includes("expired")
          ? "warn"
          : "info",
    },
    {
      label: "Community record",
      value: communityRecordCurrentnessLabel,
      tone: communityRecordTone,
    },
    {
      label: "Witness evidence",
      value: witnessCountText,
      tone: Number.isFinite(witnessCountNumber) && witnessCountNumber > 0 ? "good" : "warn",
    },
    {
      label: "Evidence currentness",
      value: currentnessLabel,
      tone: currentnessTone,
    },
    {
      label: "Verification path",
      value:
        memberAnchor !== "Not shown" && communityAnchor !== "Not shown"
          ? "Community + member IDs present"
          : "Public credential link only",
      tone: memberAnchor !== "Not shown" && communityAnchor !== "Not shown" ? "good" : "info",
    },
  ];
  const memberCredentialSecurityItems: TrustDocumentPanelItem[] = [
    {
      title: "Public member credential record",
      detail: `This page reads member ${memberAnchor} against community ${communityAnchor}.`,
      tone: "good",
    },
    {
      title: "Community-scoped evidence",
      detail:
        "The credential is scoped to this one community. It is not a universal trust score or parent-domain membership claim.",
      tone: "info",
    },
    {
      title: "Record reference",
      detail:
        "Record reference made from the visible credential fields. It is not legal identity proof.",
      tone: "info",
    },
    {
      title: "Witness currentness",
      detail: currentnessScope,
      tone: currentnessTone,
    },
    {
      title: "Privacy boundary",
      detail:
        "Private verifier names, contacts, review notes, payment records, and the full Trust Passport stay hidden.",
      tone: "good",
    },
  ];
  const memberCredentialConfirmsList = [
    "Member GSN ID and Community ID shown on this public page",
    "Membership status and role shown by this public credential record",
    "Witness count, renewal status, and currentness labels where available",
    "Community record currentness and broad activity summary where available",
    "QR and public link reopen this scoped community-member credential",
  ];
  const memberCredentialDoesNotConfirmList = [
    "Legal identity or government registration",
    "Full Trust Passport or private member history",
    "Payments, escrow, loans, credit approval, or delivery",
    "Future behaviour, future repayment, or marketplace outcome",
    "Membership in any other community",
  ];
  const memberReading = credential
    ? [
        {
          title: "Trust inside this community",
          body: `${trustReadingLabel}. ${trustReadingScope}`,
          tone: "info" as const,
        },
        {
          title: "Evidence currentness",
          body: `${currentnessLabel}. ${currentnessScope} ${witnessStrengthBoundary}`,
          tone: currentnessTone,
        },
        {
          title: "Community record currentness",
          body: `${communityRecordCurrentnessLabel}. ${communityRecordCurrentnessScope}`,
          tone: communityRecordTone,
        },
        {
          title: "Record shown",
          body: firstTruthy(
            credential.evidence_scope,
            credential.proof_scope,
            "This shows an active membership record under this Community ID and aggregate witness strength."
          ),
          tone: "good" as const,
        },
        {
          title: "Not confirmed here",
          body:
            "This credential does not expose verifier names, private notes, phone numbers, shop details, payment records, loan details, or credit approval.",
          tone: "warn" as const,
        },
        {
          title: "Next safe step",
          body:
            "Use the witness strength, renewal, activity evidence, TrustSlip, and community record together before relying on a transaction or subgroup claim.",
          tone: "info" as const,
        },
        {
          title: "Before goods or money move",
          body:
            "Check the Community ID, witness strength, renewal, activity summary, TrustSlip, and live community confirmation together. If one is missing or stale, ask for fresh evidence first.",
          tone: "warn" as const,
        },
      ]
    : [];

  return (
    <div style={pageShell()}>
      <PageTopNav
        sectionLabel="Public verification"
        title="GSN member credential"
        backTo="/cover"
        backLabel="GSN"
      />

      <section style={paperCard()}>
        <TrustPaperWatermark
          name="id"
          color="#0B63D1"
          opacity={0.045}
          size={260}
        />
        <TrustPaperWatermarkField
          names={["shield", "id", "qr", "document"]}
          opacity={0.026}
        />

        <div
          style={{
            background:
              "linear-gradient(135deg, #061827 0%, #08233A 56%, #0B2D4A 100%)",
            color: "#FFFFFF",
            padding: "22px 18px",
            display: "grid",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {evidenceIcon("certificate-seal", "gold")}
            <div>
              <div style={{ fontSize: 12, fontWeight: 1000, color: "#F2C766" }}>
                Community membership credential
              </div>
              <h1 style={{ margin: "4px 0 0", fontSize: 27, lineHeight: 1.08 }}>
                {loading ? "Checking membership..." : error ? "Credential not found" : title}
              </h1>
            </div>
          </div>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.82)", lineHeight: 1.5 }}>
            This page checks one member claim against one GSN Community ID.
          </p>
        </div>

        <div style={{ padding: 18, display: "grid", gap: 14 }}>
          <TrustPaperAuthorityStrip
            title="GSN Community Member Credential"
            reference={`${memberAnchor} / ${communityAnchor}`}
            classification="Scoped public credential"
            compact
          />

          {loading ? (
            <div style={innerCard()}>Loading the public membership credential...</div>
          ) : error ? (
            <div style={innerCard("#FFF7E6")}>
              <strong style={{ color: "#92400E" }}>{error}</strong>
              <p style={{ margin: "8px 0 0", ...helperText() }}>
                Ask for the correct Community ID and member GSN ID before relying on this claim.
              </p>
            </div>
          ) : credential ? (
            <>
              <div
                style={{
                  borderRadius: 22,
                  background:
                    "linear-gradient(135deg, rgba(6,24,39,0.96), rgba(11,45,74,0.94))",
                  color: "#FFFFFF",
                  border: "1px solid rgba(242,199,102,0.42)",
                  padding: 16,
                  display: "grid",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  {evidenceIcon("trust-shield", "gold")}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: "#F2C766", fontSize: 12, fontWeight: 1000 }}>
                      Community-scoped credential
                    </div>
                    <p
                      style={{
                        margin: "6px 0 0",
                        color: "rgba(255,255,255,0.86)",
                        fontSize: 14,
                        fontWeight: 820,
                        lineHeight: 1.5,
                      }}
                    >
                      Use only for this Community ID. Not universal trust, payment
                      approval, or parent-domain membership.
                    </p>
                  </div>
                </div>
                <div
                  data-gsn-trust-document-certificate="community-member-credential"
                  data-gsn-member-credential-primary-facts="true"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
                    gap: 10,
                  }}
                >
                  {fact("Member GSN ID", memberAnchor)}
                  {fact("Community ID", communityAnchor)}
                  {fact("Status", firstTruthy(credential.membership_status, "active"))}
                  {fact(
                    "Witness strength",
                    firstTruthy(
                      credential.membership_strength_label,
                      "Joined / witness not started"
                    )
                  )}
                </div>
              </div>

              <TrustDocumentConfidenceRibbon items={memberCredentialConfidenceRibbonItems} />

              <TrustDocumentDisclosureSection
                title="Credential security and limits"
                summary="Open for what this confirms, limits, security, and record reference."
              >
                <div
                  data-gsn-member-credential-security-limits="true"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
                    gap: 12,
                    alignItems: "start",
                  }}
                >
                  <div style={{ display: "grid", gap: 12 }}>
                    <TrustDocumentBoundaryPanel
                      title="This credential confirms"
                      tone="good"
                      items={memberCredentialConfirmsList}
                    />
                    <TrustDocumentBoundaryPanel
                      title="This credential does not confirm"
                      tone="warn"
                      items={memberCredentialDoesNotConfirmList}
                    />
                  </div>
                  <div style={{ display: "grid", gap: 12 }}>
                    <TrustDocumentSecurityPanel
                      title="Member credential security"
                      items={memberCredentialSecurityItems}
                    />
                    <TrustDocumentFingerprint
                      label="Community member credential reference"
                      value={memberCredentialFingerprint}
                      detail="Record reference for this visible public member credential. It helps match this page with its GSN record; it is not legal proof or payment approval."
                    />
                  </div>
                </div>
              </TrustDocumentDisclosureSection>

              <div style={innerCard("#FFFFFF")}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  {evidenceIcon("certificate-seal", "navy")}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: "#07172C", fontSize: 18, fontWeight: 1000 }}>
                      Public reading
                    </div>
                    <p style={{ margin: "7px 0 0", ...helperText() }}>
                      Read this as scoped membership evidence inside one Community ID,
                      not as universal trust or automatic approval.
                      It does not certify shop, line, subgroup, payment, loan, or
                      parent-domain approval claims.
                    </p>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <TrustDocumentDisclosureSection
                    title="Full public reading"
                    summary="Open for currentness, evidence, and decision guidance."
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
                        gap: 8,
                      }}
                    >
                      {memberReading.map((item) => (
                        <CredentialReadingCard
                          key={item.title}
                          title={item.title}
                          body={item.body}
                          tone={item.tone}
                        />
                      ))}
                    </div>
                  </TrustDocumentDisclosureSection>
                </div>
              </div>

              <TrustDocumentDisclosureSection
                title="All credential facts"
                summary="Open for role, renewal, activity, and currentness facts."
              >
                <div
                  data-gsn-member-credential-secondary-facts="true"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
                    gap: 10,
                  }}
                >
                  {fact("Member", firstTruthy(credential.member_display_name, "GSN member"))}
                  {fact("Community", firstTruthy(credential.community_name, "Community not shown"))}
                  {fact("Role", firstTruthy(credential.membership_role, "member"))}
                  {fact("Community record", communityRecordCurrentnessLabel)}
                  {fact(
                    "Affiliate status",
                    firstTruthy(credential.official_affiliate_label, "No parent-domain claim")
                  )}
                  {fact("Member witnesses", witnessCount)}
                  {fact("Activity events", activityCount)}
                  {fact("Latest activity", dateLabel(credential.community_activity_latest_at))}
                  {fact("Renewal", firstTruthy(credential.membership_renewal_status_label, "Not Started"))}
                  {fact("Valid until", dateLabel(credential.membership_valid_until))}
                  {fact("Next witness renewal", dateLabel(credential.next_witness_renewal_at))}
                  {fact(
                    "Next witness status",
                    firstTruthy(credential.next_witness_renewal_status_label, "Not Started")
                  )}
                </div>
              </TrustDocumentDisclosureSection>

              <TrustDocumentDisclosureSection
                title="Evidence notes and privacy"
                summary="Open for activity summary, evidence scope, and private-data boundary."
              >
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={innerCard("#F8FBFF")}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      {evidenceIcon("records-folder", "navy")}
                      <div>
                        <div style={{ color: "#07172C", fontSize: 18, fontWeight: 1000 }}>
                          Community activity evidence
                        </div>
                        <p style={{ margin: "7px 0 0", ...helperText() }}>
                          {firstTruthy(
                            credential.community_activity_label,
                            "No community activity recorded yet"
                          )}
                          {credential.community_activity_categories?.length
                            ? `: ${credential.community_activity_categories.join(", ")}.`
                            : "."}
                        </p>
                        <p style={{ margin: "7px 0 0", ...helperText() }}>
                          This is a broad activity summary for this community only. Private event
                          details are not shown.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div style={innerCard("#F8FBFF")}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      {evidenceIcon("trust-shield", "green")}
                      <div>
                        <div style={{ color: "#07172C", fontSize: 18, fontWeight: 1000 }}>
                          What this shows
                        </div>
                        <p style={{ margin: "7px 0 0", ...helperText() }}>
                          {firstTruthy(
                            credential.evidence_scope,
                            credential.proof_scope,
                            "This shows an active membership record and aggregate witness strength only."
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div style={innerCard("#FFFFFF")}>
                    <p style={helperText()}>
                      {firstTruthy(
                        credential.privacy_note,
                        "Private verifier names and private member contact details are not shown."
                      )}
                    </p>
                    <p style={{ margin: "8px 0 0", ...helperText() }}>
                      {firstTruthy(
                        credential.decision_note,
                        "Use this as membership evidence, not as a guarantee or automatic transaction approval."
                      )}
                    </p>
                  </div>
                </div>
              </TrustDocumentDisclosureSection>

              <div
                style={{
                  ...innerCard("#FFFFFF"),
                  display: "grid",
                  gridTemplateColumns: "96px minmax(0, 1fr)",
                  gap: 14,
                  alignItems: "center",
                }}
              >
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
                <div>
                  <div style={{ color: "#07172C", fontSize: 17, fontWeight: 1000 }}>
                    Scan to reopen this credential
                  </div>
                  <p style={{ margin: "7px 0 0", ...helperText() }}>
                    The QR opens this same public credential page. It does not reveal private witnesses or contact details.
                  </p>
                </div>
              </div>
              <TrustPaperSecurityNote reference={memberAnchor} compact />
            </>
          ) : null}
        </div>
      </section>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <PrimaryButton
          type="button"
          onClick={() => void copyLink()}
          stableHeight={52}
          debugId="community-member-verify.copy-link"
        >
          Copy Credential Link
        </PrimaryButton>
        <SecondaryButton
          type="button"
          onClick={() => window.location.assign(`/verify/community/${encodeURIComponent(cleanCommunityKey)}`)}
          stableHeight={52}
          debugId="community-member-verify.open-community-record"
        >
          Open Community Record
        </SecondaryButton>
      </div>

      {copied ? (
        <div style={innerCard(copied.includes("copied") ? "#EAF7EE" : "#FFF7E6")}>{copied}</div>
      ) : null}

      <div style={{ overflow: "hidden", borderRadius: 24 }}>
        <TrustPaperSecurityFooter text="Community member credential. Public aggregate status only." />
      </div>
    </div>
  );
}

function CredentialReadingCard({
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
      <h2 style={{ margin: 0, color: toneStyles.title, fontSize: 15, fontWeight: 1000 }}>
        {title}
      </h2>
      <p style={{ ...helperText(), color: "#1F3145", fontSize: 13 }}>{body}</p>
    </div>
  );
}
