import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import GSNBrandMark from "../../components/GSNBrandMark";
import { GsnRealisticIcon, type Gsn3DIconKey } from "../../components/GsnRealisticIcon";
import { PrimaryButton, StableCtaLink } from "../../components/StableButton";
import {
  TrustPaperAuthorityStrip,
  TrustPaperSeal,
  TrustPaperSecurityNote,
  TrustPaperWatermark,
  TrustPaperWatermarkField,
} from "../../components/TrustPaperMarks";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalStatTile,
} from "../../lib/institutionalSurface";
import {
  TrustDocumentBoundaryPanel,
  TrustDocumentConfidenceRibbon,
  TrustDocumentDisclosureSection,
  TrustDocumentFingerprint,
  TrustDocumentSecurityPanel,
  type TrustDocumentPanelItem,
  type TrustDocumentRibbonItem,
} from "../../components/TrustDocumentLanguage";

export type TrustSlipVerifyQuickAnswer = [Gsn3DIconKey, string, string];

type CommunityConfirmationResult = {
  requests_sent?: number | null;
  active_member_count?: number | null;
  responses_received?: number | null;
  confirmed_known_count?: number | null;
  community_confidence?: string | null;
};

type CommunityConfirmationOutcome = {
  visible_summary?: string | null;
  requester_callback?: {
    requested?: boolean | null;
    channel?: string | null;
    contact_masked?: string | null;
    delivery_status?: string | null;
    delivery_note?: string | null;
    result_link_is_source_of_truth?: boolean | null;
  } | null;
};

export type CommunityConfirmationCallbackDraft = {
  requesterExternalLabel?: string;
  callbackChannel?: "none" | "sms" | "whatsapp";
  callbackContact?: string;
  callbackConsent?: boolean;
};

type TrustSlipVerifyPublicPaperProps = {
  compact: boolean;
  validNow: boolean;
  publicValidityLabel: string;
  bannerDetail: string;
  profileImageUrl?: string | null;
  holderName: string;
  gsnId: string;
  communityLabel: string;
  holderRole?: string | null;
  memberWitnessCount?: string | number | null;
  membershipStrengthLabel?: string | null;
  membershipRenewalStatusLabel?: string | null;
  membershipValidUntil?: string | null;
  nextWitnessRenewalAt?: string | null;
  nextWitnessRenewalStatusLabel?: string | null;
  membershipCurrentnessLabel?: string | null;
  membershipCurrentnessScope?: string | null;
  communityEvidenceCurrentnessLabel?: string | null;
  communityEvidenceCurrentnessScope?: string | null;
  memberCredentialPath?: string | null;
  communityActivityCount?: string | number | null;
  communityActivityLatestAt?: string | null;
  communityActivityCategories?: string[] | null;
  communityActivityLabel?: string | null;
  relationshipEvidenceSummary?: Record<string, any> | null;
  visibleBand: string;
  visibleBandLabel: string;
  visibleBandMeaning: string;
  visibleEvidenceLabel: string;
  publicEvidencePosture: string;
  publicEvidencePostureMeaning: string;
  publicEvidencePostureBoundary: string;
  compactTrustLimit: string;
  issuedAtLabel: string;
  expiresAtLabel: string;
  resolvedCode: string;
  verifyPath: string;
  verifyUrl: string;
  quickTrustAnswers: TrustSlipVerifyQuickAnswer[];
  communityRelayAvailable: boolean;
  communityPulseAvailable: boolean;
  communityConfirmationText: string;
  communityConfirmationRows: Array<[string, string]>;
  confirmationOutcome: CommunityConfirmationOutcome | null;
  confirmationResult: CommunityConfirmationResult | null;
  confirmationPublicPath: string;
  confirmationBusy: boolean;
  canRequestCommunityPulse: boolean;
  onRequestCommunityPulse: (draft?: CommunityConfirmationCallbackDraft) => void;
  publicActions: React.ReactNode;
  variant?: "full" | "lite";
};

function safeText(value: unknown): string {
  return String(value ?? "").trim();
}

function firstTruthy(...values: unknown[]): string {
  for (const value of values) {
    const text = safeText(value);
    if (text) return text;
  }
  return "";
}

function referenceFingerprint(...values: unknown[]): string {
  const input = values.map((value) => safeText(value)).join("|") || "gsn-trustslip";
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
  return `GSN-TS-${left}-${right}`.toUpperCase();
}

function rowValue(rows: Array<[string, string]>, label: string): string {
  return rows.find(([name]) => name === label)?.[1] || "";
}

function positiveNumber(value: unknown): number {
  const n = Number(safeText(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function dateLabel(value: unknown): string {
  const text = safeText(value);
  if (!text) return "";
  const parsed = new Date(text);
  if (!Number.isFinite(parsed.getTime())) return text;
  return parsed.toLocaleDateString();
}

function compactListLabel(values: string[], fallback: string): string {
  const cleaned = values
    .map((value) => safeText(value))
    .filter(Boolean)
    .slice(0, 3);
  return cleaned.length ? cleaned.join(", ") : fallback;
}

function lockedActionFrame(compact: boolean): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateRows: "auto auto",
    gap: 10,
    alignSelf: "stretch",
    minHeight: compact ? 194 : 214,
    overflowAnchor: "none",
    transition: "none",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalInnerCard(bg),
    borderRadius: 18,
    padding: 15,
  };
}

function fieldLabel(): React.CSSProperties {
  return {
    color: "#475569",
    fontSize: 11,
    fontWeight: 1000,
    letterSpacing: 0,
    textTransform: "uppercase",
  };
}

function textInput(compact = false): React.CSSProperties {
  return {
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    borderRadius: 14,
    border: "1px solid rgba(8,35,58,0.16)",
    background: "#FFFFFF",
    color: "#07172C",
    padding: compact ? "12px 14px" : "12px 13px",
    fontSize: 16,
    fontWeight: 800,
    outline: "none",
  };
}

function selectInput(compact = false): React.CSSProperties {
  return {
    ...textInput(compact),
    appearance: "auto",
  };
}

function statTile(
  bg = "#FFFFFF",
  border = "1px solid rgba(11,31,51,0.08)"
): React.CSSProperties {
  return {
    ...institutionalStatTile(
      bg,
      border === "1px solid rgba(11,31,51,0.08)"
        ? "1px solid rgba(37,78,119,0.12)"
        : border
    ),
    borderRadius: 16,
    padding: 12,
    minHeight: "auto",
    minWidth: 0,
  };
}

function documentMetaCard(bg = "#F7FAFC"): React.CSSProperties {
  return {
    borderRadius: 16,
    padding: 14,
    background: bg,
    border: "1px solid rgba(37,78,119,0.12)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    letterSpacing: 0,
    fontWeight: 1000,
    textTransform: "uppercase",
    color: "#526579",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#526579",
    fontSize: 14,
    lineHeight: 1.55,
    fontWeight: 760,
  };
}

function paperStatusPill(status: string): React.CSSProperties {
  const text = safeText(status).toLowerCase();
  const positive =
    text.includes("strong") ||
    text.includes("valid") ||
    text.includes("verified") ||
    text.includes("active");
  const caution =
    text.includes("caution") ||
    text.includes("mixed") ||
    text.includes("limited") ||
    text.includes("pending") ||
    text.includes("not");

  return {
    borderRadius: 10,
    padding: "6px 10px",
    minHeight: 28,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: positive ? "#EEF9F1" : caution ? "#FFF7E6" : "#FEF2F2",
    color: positive ? "#166534" : caution ? "#92400E" : "#991B1B",
    border: `1px solid ${
      positive
        ? "rgba(46,155,98,0.2)"
        : caution
          ? "rgba(245,158,11,0.2)"
          : "rgba(220,38,38,0.2)"
    }`,
    fontSize: 12,
    fontWeight: 950,
    textAlign: "center",
  };
}

function publicVerifyPaperShell(compact: boolean): React.CSSProperties {
  return {
    ...institutionalPageCard("#FFFFFF"),
    borderRadius: compact ? 12 : 28,
    padding: 0,
    border: compact ? "0" : "1px solid rgba(37,78,119,0.16)",
    position: "relative",
    overflow: "hidden",
    boxShadow: compact ? "none" : "0 24px 60px rgba(15,23,42,0.12)",
    background: "#FFFFFF",
  };
}

function publicVerifyShell(bg = "#FFFFFF", compact = false): React.CSSProperties {
  return {
    ...publicVerifyPanel(bg, compact),
    position: "relative",
    overflow: "hidden",
    boxShadow: compact ? "none" : "0 16px 34px rgba(15,23,42,0.08)",
  };
}

function publicVerifyHero(compact: boolean): React.CSSProperties {
  return {
    position: "relative",
    overflow: "hidden",
    display: "grid",
    gridTemplateColumns: compact ? "minmax(0, 1fr)" : "190px minmax(0, 1fr)",
    gap: compact ? 13 : 24,
    alignItems: compact ? "start" : "center",
    minHeight: compact ? "auto" : 220,
    padding: compact ? "18px 18px 26px" : "34px 44px 42px",
    background: "linear-gradient(135deg, #061827 0%, #082A48 100%)",
    color: "#FFFFFF",
  };
}

function readableText(): React.CSSProperties {
  return {
    minWidth: 0,
    overflowWrap: "break-word",
    wordBreak: "normal",
    hyphens: "auto",
  };
}

function officialPaperWatermark(compact: boolean): React.ReactNode {
  return (
    <div
      className="print-watermark"
      aria-hidden="true"
      style={{
        position: "absolute",
        top: compact ? -34 : -42,
        right: compact ? -54 : -26,
        opacity: 0.11,
        pointerEvents: "none",
        transform: "rotate(-7deg)",
        zIndex: 0,
      }}
    >
      <GSNBrandMark width={compact ? 132 : 190} height={compact ? 166 : 238} />
    </div>
  );
}

function publicVerifyPanel(bg = "#FFFFFF", compact = false): React.CSSProperties {
  return {
    borderRadius: compact ? 10 : 14,
    padding: compact ? 10 : 14,
    background: bg,
    border: compact ? "0" : "1px solid rgba(37,78,119,0.11)",
    boxShadow: compact ? "none" : "0 10px 26px rgba(7,23,44,0.05)",
  };
}

function mobileFlatSection(compact: boolean, bg = "transparent"): React.CSSProperties {
  return compact
    ? {
        borderRadius: 0,
        padding: "10px 0 0",
        background: bg,
        border: "0",
        boxShadow: "none",
      }
    : innerCard(bg === "transparent" ? "#FFFFFF" : bg);
}

function paperMiniRow(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "34px minmax(0, 1fr)",
    gap: 10,
    alignItems: "start",
    color: "#334155",
    fontSize: 13,
    fontWeight: 850,
    lineHeight: 1.35,
  };
}

function paperIconBadge(
  name: Gsn3DIconKey,
  tone: "trust" | "warning" | "neutral" = "trust",
  size = 32
): React.ReactNode {
  const meta = {
    trust: {
      color: "#7A4A00",
      bg: "rgba(255,255,255,0.97)",
      border: "rgba(226,192,106,0.36)",
    },
    warning: {
      color: "#8A4B08",
      bg: "linear-gradient(180deg, #FFFDF6 0%, #FFF7DB 100%)",
      border: "rgba(217,149,36,0.24)",
    },
    neutral: {
      color: "#0B63D1",
      bg: "rgba(255,255,255,0.97)",
      border: "rgba(13,95,168,0.14)",
    },
  }[tone];

  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: 11,
        display: "inline-grid",
        placeItems: "center",
        color: meta.color,
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        boxShadow:
          "0 8px 16px rgba(7,23,44,0.08), inset 0 1px 0 rgba(255,255,255,0.96)",
      }}
    >
      <GsnRealisticIcon
        name={name}
        size={Math.max(28, Math.round(size * 0.88))}
        decorative
        imageStyle={{ width: "96%", height: "96%" }}
      />
    </span>
  );
}

function PublicReadingTile({
  icon,
  label,
  title,
  text,
  compact = false,
  tone = "neutral",
}: {
  icon: Gsn3DIconKey;
  label: string;
  title: string;
  text: string;
  compact?: boolean;
  tone?: "trust" | "warning" | "neutral";
}) {
  const background =
    tone === "trust" ? "#EEF9F1" : tone === "warning" ? "#FFF7E6" : "#F8FBFF";
  const color =
    tone === "trust" ? "#166534" : tone === "warning" ? "#92400E" : "#0B63D1";

  return (
    <div
      style={{
        ...innerCard(background),
        padding: compact ? 11 : 10,
        minHeight: compact ? "auto" : 132,
        display: "grid",
        alignContent: "start",
        gap: 7,
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color,
          fontSize: 11,
          fontWeight: 1000,
          textTransform: "uppercase",
          minWidth: 0,
        }}
      >
        {paperIconBadge(icon, tone, 30)}
        <span style={readableText()}>{label}</span>
      </div>
      <strong
        style={{
          ...readableText(),
          color: "#07172C",
          fontSize: compact ? 15 : 14,
          fontWeight: 1000,
          lineHeight: 1.2,
        }}
      >
        {title}
      </strong>
      <p
        style={{
          ...readableText(),
          margin: 0,
          color: "#334155",
          fontSize: compact ? 12.5 : 12,
          fontWeight: 820,
          lineHeight: compact ? 1.5 : 1.42,
        }}
      >
        {text}
      </p>
    </div>
  );
}

function paperDataRow(compact = false): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: compact ? "minmax(0, 0.54fr) minmax(0, 0.46fr)" : "minmax(0, 1fr) auto",
    gap: compact ? 8 : 10,
    alignItems: "center",
    padding: compact ? "8px 0" : "8px 0",
    borderBottom: "1px solid rgba(216,227,238,0.72)",
    color: "#334155",
    fontSize: compact ? 12.5 : 13,
    fontWeight: 850,
    minWidth: 0,
  };
}

type EvidenceTone = "good" | "warning" | "neutral" | "danger";

type EvidenceResult = {
  icon: Gsn3DIconKey;
  label: string;
  value: string;
  note?: string;
  tone?: EvidenceTone;
};

function evidenceToneStyle(tone: EvidenceTone = "neutral") {
  return {
    good: {
      bg: "#EEF9F1",
      text: "#166534",
      border: "rgba(46,155,98,0.24)",
      iconTone: "trust" as const,
    },
    warning: {
      bg: "#FFF7E6",
      text: "#92400E",
      border: "rgba(245,158,11,0.26)",
      iconTone: "warning" as const,
    },
    danger: {
      bg: "#FEF2F2",
      text: "#991B1B",
      border: "rgba(220,38,38,0.20)",
      iconTone: "warning" as const,
    },
    neutral: {
      bg: "#F8FBFF",
      text: "#0B63D1",
      border: "rgba(11,99,209,0.16)",
      iconTone: "neutral" as const,
    },
  }[tone];
}

function EvidenceResultRow({
  icon,
  label,
  value,
  note,
  tone = "neutral",
  compact = false,
}: EvidenceResult & { compact?: boolean }) {
  const toneStyle = evidenceToneStyle(tone);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: compact ? "38px minmax(0, 1fr)" : "42px minmax(0, 1fr)",
        gap: 10,
        alignItems: "start",
        minWidth: 0,
        borderRadius: 14,
        padding: compact ? "9px 10px" : "10px 12px",
        background: toneStyle.bg,
        border: `1px solid ${toneStyle.border}`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.82)",
      }}
    >
      {paperIconBadge(icon, toneStyle.iconTone, compact ? 36 : 40)}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            ...readableText(),
            color: "#526579",
            fontSize: 10.5,
            fontWeight: 1000,
            textTransform: "uppercase",
            letterSpacing: 0,
          }}
        >
          {label}
        </div>
        <div
          style={{
            ...readableText(),
            marginTop: 2,
            color: "#07172C",
            fontSize: compact ? 14 : 15,
            fontWeight: 1000,
            lineHeight: 1.18,
          }}
        >
          {value}
        </div>
        {note ? (
          <div
            style={{
              ...readableText(),
              marginTop: 4,
              color: toneStyle.text,
              fontSize: compact ? 11.5 : 12,
              fontWeight: 850,
              lineHeight: 1.35,
            }}
          >
            {note}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EvidenceResultGrid({
  rows,
  compact,
}: {
  rows: EvidenceResult[];
  compact: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: compact ? "1fr" : "repeat(2, minmax(0, 1fr))",
        gap: 8,
        minWidth: 0,
      }}
    >
      {rows.map((row) => (
        <EvidenceResultRow key={`${row.label}-${row.value}`} {...row} compact={compact} />
      ))}
    </div>
  );
}

function OfficialResultTable({
  title,
  rows,
  compact,
}: {
  title: string;
  rows: Array<[string, string]>;
  compact: boolean;
}) {
  return (
    <div
      style={{
        borderRadius: compact ? 0 : 14,
        border: compact ? "0" : "1px solid rgba(37,78,119,0.12)",
        background: compact ? "transparent" : "#FFFFFF",
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      <div
        style={{
          padding: compact ? "11px 0 4px" : "10px 12px",
          background: compact ? "transparent" : "linear-gradient(180deg, #F8FBFF 0%, #EEF5FC 100%)",
          color: "#07172C",
          fontSize: 12,
          fontWeight: 1000,
          textTransform: "uppercase",
          letterSpacing: 0,
        }}
      >
        {title}
      </div>
      <div style={{ padding: compact ? "0 0 4px" : "0 12px 6px" }}>
        {rows.map(([label, value]) => (
          <div key={`${title}-${label}`} style={paperDataRow(compact)}>
            <span style={readableText()}>{label}</span>
            <strong
              style={{
                ...readableText(),
                color: "#07172C",
                textAlign: "right",
                justifySelf: "end",
                maxWidth: "100%",
              }}
            >
              {value}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TrustSlipVerifyPublicPaper({
  compact,
  validNow,
  publicValidityLabel,
  bannerDetail,
  profileImageUrl,
  holderName,
  gsnId,
  communityLabel,
  holderRole,
  memberWitnessCount,
  membershipStrengthLabel,
  membershipRenewalStatusLabel,
  membershipValidUntil,
  nextWitnessRenewalAt,
  nextWitnessRenewalStatusLabel,
  membershipCurrentnessLabel,
  membershipCurrentnessScope,
  communityEvidenceCurrentnessLabel,
  communityEvidenceCurrentnessScope,
  memberCredentialPath,
  communityActivityCount,
  communityActivityLatestAt,
  communityActivityCategories,
  communityActivityLabel,
  relationshipEvidenceSummary,
  visibleBand,
  visibleBandLabel,
  visibleBandMeaning,
  visibleEvidenceLabel,
  publicEvidencePosture,
  publicEvidencePostureMeaning,
  publicEvidencePostureBoundary,
  compactTrustLimit,
  issuedAtLabel,
  expiresAtLabel,
  resolvedCode,
  verifyPath,
  verifyUrl,
  quickTrustAnswers,
  communityRelayAvailable,
  communityPulseAvailable,
  communityConfirmationText,
  communityConfirmationRows,
  confirmationOutcome,
  confirmationResult,
  confirmationPublicPath,
  confirmationBusy,
  canRequestCommunityPulse,
  onRequestCommunityPulse,
  publicActions,
  variant = "full",
}: TrustSlipVerifyPublicPaperProps) {
  const [requesterLabel, setRequesterLabel] = useState("");
  const [callbackChannel, setCallbackChannel] =
    useState<CommunityConfirmationCallbackDraft["callbackChannel"]>("none");
  const [callbackContact, setCallbackContact] = useState("");
  const [callbackConsent, setCallbackConsent] = useState(false);
  const activeMemberCount = positiveNumber(rowValue(communityConfirmationRows, "Active members"));
  const eligibleResponsePool = positiveNumber(rowValue(communityConfirmationRows, "Eligible response pool"));
  const requestLockedReason = !canRequestCommunityPulse
    ? "This paper does not have a usable TrustSlip code yet. Refresh the TrustSlip before asking for live community confirmation."
    : !communityPulseAvailable && eligibleResponsePool <= 0
      ? `GSN can see ${activeMemberCount || "the"} active member${activeMemberCount === 1 ? "" : "s"}, but no eligible responders are set up for this public check yet. A community owner must enable confirmation contacts before this button can open.`
      : !communityPulseAvailable
        ? "Community confirmation is not enabled for this paper yet. Open the community record and check the public community status first."
      : "";
  const memberWitnessLabel = firstTruthy(membershipStrengthLabel, "Not shown");
  const memberWitnessCountLabel = firstTruthy(memberWitnessCount, "0");
  const memberWitnessEvidence = `${memberWitnessLabel} (${memberWitnessCountLabel} witness${
    memberWitnessCountLabel === "1" ? "" : "es"
  })`;
  const memberWitnessRenewal = firstTruthy(membershipRenewalStatusLabel, "Not Started");
  const memberWitnessValidity = dateLabel(membershipValidUntil);
  const nextWitnessRenewal = dateLabel(nextWitnessRenewalAt);
  const nextWitnessRenewalStatus = firstTruthy(
    nextWitnessRenewalStatusLabel,
    "Not Started"
  );
  const memberWitnessCurrentness = firstTruthy(
    membershipCurrentnessLabel,
    "Witness renewal not started"
  );
  const memberWitnessCurrentnessScope = firstTruthy(
    membershipCurrentnessScope,
    "This active membership record has no current witness validity window. Ask for member witnesses, TrustSlip, or live community confirmation before a serious decision."
  );
  const communityRecordCurrentness = firstTruthy(
    communityEvidenceCurrentnessLabel,
    "Active recorded Community ID"
  );
  const communityRecordCurrentnessScope = firstTruthy(
    communityEvidenceCurrentnessScope,
    "This Community ID resolves to an active GSN community record. Parent community acknowledgement and member-level proof still need separate current scoped evidence."
  );
  const communityActivityCountLabel = firstTruthy(communityActivityCount, "0");
  const communityActivityCategoriesLabel = Array.isArray(communityActivityCategories)
    ? communityActivityCategories.map((item) => safeText(item)).filter(Boolean).join(", ")
    : "";
  const knownAsCategoryLabel = Array.isArray(communityActivityCategories)
    ? compactListLabel(communityActivityCategories, "")
    : "";
  const communityActivityEvidence = `${firstTruthy(
    communityActivityLabel,
    "No community activity recorded yet"
  )} (${communityActivityCountLabel} event${
    communityActivityCountLabel === "1" ? "" : "s"
  })`;
  const relationshipEvidenceLabel = firstTruthy(
    relationshipEvidenceSummary?.summary_label,
    Array.isArray(relationshipEvidenceSummary?.rows)
      ? relationshipEvidenceSummary.rows[0]?.relationship_label
      : ""
  );
  const relationshipEvidenceCount = positiveNumber(
    relationshipEvidenceSummary?.evidence_count
  );
  const communityActivityLatest = dateLabel(communityActivityLatestAt);
  const witnessTone: EvidenceTone =
    memberWitnessLabel.toLowerCase().includes("not") ||
    memberWitnessCurrentness.toLowerCase().includes("not")
      ? "warning"
      : "good";
  const holderRoleLabel = firstTruthy(holderRole, "Community member");
  const communityKnownAsRows: Array<{
    icon: Gsn3DIconKey;
    label: string;
    value: string;
    note: string;
    tone: "trust" | "neutral" | "warning";
  }> = [
    {
      icon: "identity-card",
      label: "Community role",
      value: holderRoleLabel,
      note: `Shown inside ${communityLabel || "this community record"}.`,
      tone: holderRoleLabel.toLowerCase().includes("member") ? "neutral" : "trust",
    },
    {
      icon: "community-building",
      label: "Community signals",
      value:
        positiveNumber(communityActivityCountLabel) > 0
          ? `${communityActivityCountLabel} recorded event${
              communityActivityCountLabel === "1" ? "" : "s"
            }`
          : "Activity not yet shown",
      note: knownAsCategoryLabel
        ? `Categories: ${knownAsCategoryLabel}`
        : "Service or activity labels are not shown on this paper yet.",
      tone: positiveNumber(communityActivityCountLabel) > 0 ? "trust" : "warning",
    },
    {
      icon: "records-folder",
      label: "Relationship route",
      value:
        relationshipEvidenceCount > 0 && relationshipEvidenceLabel
          ? relationshipEvidenceLabel
          : "Invite relationship category not shown",
      note:
        relationshipEvidenceCount > 0
          ? "Raw inviter notes, phone numbers, addresses, and private context are not included."
          : "This paper does not yet show how the holder came through a known relationship.",
      tone: relationshipEvidenceCount > 0 ? "trust" : "neutral",
    },
    {
      icon: "certificate-seal",
      label: "Witness route",
      value: memberWitnessEvidence,
      note: memberWitnessCurrentness,
      tone: witnessTone === "good" ? "trust" : "warning",
    },
  ];
  const callbackNeedsConsent = callbackChannel !== "none" && safeText(callbackContact);
  const callbackBlocked = Boolean(callbackNeedsConsent && !callbackConsent);
  const requesterCallback = confirmationOutcome?.requester_callback || null;
  const visibleBandReading = visibleBand.toLowerCase().includes("visible reading")
    ? visibleBand
    : `Grade ${visibleBand}`;
  const isLite = variant === "lite";
  const recordFingerprint = referenceFingerprint(
    resolvedCode,
    verifyPath,
    publicValidityLabel,
    holderName,
    gsnId,
    communityLabel,
    visibleBand,
    publicEvidencePosture,
    issuedAtLabel,
    expiresAtLabel
  );
  const trustSlipConfidenceRibbonItems: TrustDocumentRibbonItem[] = [
    {
      label: "TrustSlip status",
      value: publicValidityLabel,
      tone: validNow ? "good" : "warn",
    },
    {
      label: "Record integrity",
      value: resolvedCode && verifyPath ? "Public code resolved" : "Limited",
      tone: resolvedCode && verifyPath ? "good" : "warn",
    },
    {
      label: "Evidence chain",
      value: "Scoped evidence",
      tone: "info",
      detail: "Private passport stays protected.",
    },
    {
      label: "Verification path",
      value: verifyUrl ? "Available" : "Unavailable",
      tone: verifyUrl ? "good" : "warn",
    },
    {
      label: "Valid until",
      value: expiresAtLabel || "Not shown",
      tone: expiresAtLabel ? "info" : "warn",
    },
  ];
  const trustSlipSecurityItems: TrustDocumentPanelItem[] = [
    {
      title: "Public code check",
      detail: resolvedCode
        ? `This paper is tied to public TrustSlip code ${resolvedCode}.`
        : "This paper does not have a usable public TrustSlip code yet.",
      tone: resolvedCode ? "good" : "warn",
    },
    {
      title: "Record reference",
      detail:
        "This reference is made from the visible TrustSlip fields. Use it to match this paper with its GSN record; it is not legal proof or payment approval.",
      tone: "info",
    },
    {
      title: "QR verification",
      detail: verifyUrl
        ? "The QR opens this public TrustSlip verification path."
        : "No public QR verification path is available for this paper yet.",
      tone: verifyUrl ? "good" : "warn",
    },
    {
      title: "Issued and expiry window",
      detail: `Issued: ${issuedAtLabel || "Not shown"}. Expires: ${
        expiresAtLabel || "Not shown"
      }.`,
      tone: issuedAtLabel || expiresAtLabel ? "info" : "warn",
    },
    {
      title: "Private passport boundary",
      detail:
        "The paper shows public TrustSlip evidence only; the holder's private Trust Passport remains protected.",
      tone: "good",
    },
  ];
  const trustSlipConfirmsList = [
    "Public TrustSlip code status",
    "Visible evidence band and descriptive evidence posture",
    "Displayed holder and GSN ID from this paper",
    "Community label shown on this TrustSlip",
    "Verification path and QR destination when available",
  ];
  const trustSlipDoesNotConfirmList = [
    "Legal identity or government registration",
    "The holder's private Trust Passport contents",
    "Payment, credit, escrow, release, or delivery approval",
    "Every community member, shop, transaction, or dispute",
    "Future behaviour or guaranteed performance",
  ];
  const evidenceResults: EvidenceResult[] = [
    {
      icon: "certificate-seal",
      label: "Member witness",
      value: memberWitnessEvidence,
      note: memberWitnessCurrentness,
      tone: witnessTone,
    },
    {
      icon: "records-folder",
      label: "Witness window",
      value: memberWitnessValidity || "Not shown",
      note: nextWitnessRenewal
        ? `Next renewal: ${nextWitnessRenewal}`
        : `Renewal status: ${nextWitnessRenewalStatus}`,
      tone: witnessTone,
    },
    {
      icon: "community-building",
      label: "Community record",
      value: communityRecordCurrentness,
      note: "Community ID anchor recorded.",
      tone: communityRecordCurrentness.toLowerCase().includes("active")
        ? "good"
        : "warning",
    },
    {
      icon: "public-globe",
      label: "Community activity",
      value: communityActivityEvidence,
      note: communityActivityLatest
        ? `Latest activity: ${communityActivityLatest}`
        : "No latest activity date shown.",
      tone: positiveNumber(communityActivityCountLabel) > 0 ? "good" : "warning",
    },
  ];
  const glanceGroups: Array<{ title: string; rows: Array<[string, string]> }> = [
    {
      title: "Public result",
      rows: [
        ["Visible band", visibleBand],
        ["Evidence posture", publicEvidencePosture],
        ["Trust-limit signal", compactTrustLimit],
        ["Validity", publicValidityLabel],
      ],
    },
    {
      title: "Evidence currentness",
      rows: [
        ["Member witness", memberWitnessEvidence],
        ["Witness renewal", memberWitnessRenewal],
        ["Witness valid until", memberWitnessValidity || "Not shown"],
        ["Next witness status", nextWitnessRenewalStatus],
      ],
    },
    {
      title: "Community evidence",
      rows: [
        ["Community record", communityRecordCurrentness],
        ["Community activity", communityActivityEvidence],
        ["Activity categories", communityActivityCategoriesLabel || "Not shown"],
        ["Latest activity", communityActivityLatest || "Not shown"],
      ],
    },
    {
      title: "Document reference",
      rows: [
        ["Issued", issuedAtLabel],
        ["Expires", expiresAtLabel],
        ["Verification code", resolvedCode || "Not available"],
      ],
    },
  ];
  const confirmationEvidenceResults: EvidenceResult[] = communityConfirmationRows.map(
    ([label, value]) => {
      const normalizedLabel = label.toLowerCase();
      const numeric = Number(value);
      const emptyish =
        !safeText(value) ||
        safeText(value).toLowerCase().includes("not shown") ||
        safeText(value).toLowerCase().includes("not requested") ||
        (Number.isFinite(numeric) && numeric <= 0);

      return {
        icon: normalizedLabel.includes("member")
          ? "community-building"
          : normalizedLabel.includes("pool") || normalizedLabel.includes("signal")
            ? "trust-shield"
            : normalizedLabel.includes("last")
              ? "records-folder"
              : "certificate-seal",
        label,
        value,
        tone: emptyish ? "warning" : "good",
      };
    }
  );

  return (
    <section
      className="print-trust-document"
      style={publicVerifyPaperShell(compact)}
    >
      {officialPaperWatermark(compact)}
      <TrustPaperWatermarkField
        names={["shield", "globe", "qr", "document"]}
        opacity={0.052}
      />
      <header style={publicVerifyHero(compact)}>
        <TrustPaperWatermark
          name="globe"
          color="#EAF3FF"
          size={compact ? 180 : 260}
          opacity={0.09}
          style={{ top: compact ? 12 : 8, right: compact ? -78 : -42, bottom: "auto" }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "grid",
            gridTemplateColumns: compact ? "44px minmax(0, 1fr)" : "54px minmax(0, 1fr)",
            gap: compact ? 9 : 10,
            alignItems: "center",
            borderRight: compact ? "none" : "1px solid rgba(255,255,255,0.16)",
            borderBottom: compact ? "1px solid rgba(255,255,255,0.14)" : "none",
            paddingRight: compact ? 0 : 20,
            paddingBottom: compact ? 12 : 0,
            minWidth: 0,
          }}
        >
          <span
            aria-hidden
            style={{
              width: compact ? 44 : 54,
              height: compact ? 44 : 54,
              borderRadius: compact ? 11 : 12,
              border: "1px solid rgba(246,215,122,0.55)",
              color: "#F6D77A",
              display: "grid",
              placeItems: "center",
            }}
          >
            <GsnRealisticIcon
              name="trust-shield"
              size={compact ? 38 : 46}
              decorative
            />
          </span>
          <div
            style={{
              color: "#FFFFFF",
              fontSize: compact ? 12 : 17,
              lineHeight: 1.08,
              fontWeight: 1000,
              textTransform: "uppercase",
            }}
          >
            Global<br />Support<br />Network
          </div>
        </div>
        <div style={{ position: "relative", zIndex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 26,
              padding: "5px 12px",
              borderRadius: 8,
              background: "rgba(246,215,122,0.14)",
              color: "#F6D77A",
              fontSize: compact ? 10 : 12,
              fontWeight: 1000,
              textTransform: "uppercase",
            }}
          >
            Public verification paper
          </div>
          <h1
            style={{
              margin: "12px 0 0",
              color: "#FFFFFF",
              fontSize: compact ? 34 : 58,
              lineHeight: 1,
              fontWeight: 1000,
              fontFamily: "Georgia, 'Times New Roman', serif",
              overflowWrap: "normal",
              wordBreak: "normal",
            }}
          >
            TrustSlip Verify
          </h1>
          <p
            style={{
              margin: "12px 0 0",
              maxWidth: 520,
              color: "#DCE8F4",
              fontSize: compact ? 14 : 20,
              lineHeight: 1.35,
              fontWeight: 760,
            }}
          >
            A public GSN trust check for identity, support, trade, and careful decision-making.
          </p>
          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: compact ? 9 : 12,
              alignItems: "center",
              flexWrap: "wrap",
              color: "#F6D77A",
              fontWeight: 1000,
              textTransform: "uppercase",
              fontSize: compact ? 11 : 15,
            }}
          >
            <span style={{ color: "#FFFFFF" }}>GSN</span>
            <span>Open</span>
            <span>Trust</span>
            <span>Impact</span>
          </div>
        </div>
      </header>

      <div
        style={{
          padding: compact ? "0 8px 14px" : "0 36px 26px",
          transform: "translateY(-24px)",
          marginBottom: -12,
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 14,
          alignItems: "stretch",
        }}
      >
        <TrustPaperAuthorityStrip
          title="GSN TrustSlip Verification Paper"
          reference={resolvedCode || verifyPath || "TrustSlip verify record"}
          generatedAt={issuedAtLabel || undefined}
          classification={validNow ? "Current public evidence" : "Caution public evidence"}
          compact={compact}
        />

        <TrustDocumentConfidenceRibbon items={trustSlipConfidenceRibbonItems} />

        <TrustDocumentDisclosureSection
          title="TrustSlip security and limits"
          summary="Open for what this paper confirms, limits, security, and record reference."
        >
          <div
            data-gsn-trust-document-certificate="trustslip-verify"
            data-gsn-trustslip-verify-security-limits="true"
            style={{
              display: "grid",
              gridTemplateColumns: compact ? "1fr" : "minmax(280px, 0.9fr) minmax(0, 1fr)",
              gap: 12,
            }}
          >
            <TrustDocumentSecurityPanel
              title="Digital security"
              items={trustSlipSecurityItems}
            />
            <div style={{ display: "grid", gap: 12 }}>
              <TrustDocumentBoundaryPanel
                title="This paper confirms"
                tone="good"
                items={trustSlipConfirmsList}
              />
              <TrustDocumentBoundaryPanel
                title="This paper does not confirm"
                tone="warn"
                items={trustSlipDoesNotConfirmList}
              />
              <TrustDocumentFingerprint
                label="TrustSlip record reference"
                value={recordFingerprint}
                detail="Record reference for this visible public TrustSlip paper. It helps match this page with its GSN record; it is not legal proof or payment approval."
              />
            </div>
          </div>
        </TrustDocumentDisclosureSection>

        <div style={publicVerifyShell("#F8FBFF", compact)}>
          <TrustPaperWatermark
            name={validNow ? "shield" : "lock"}
            color="#FFFFFF"
            size={170}
            opacity={0.12}
            style={{ top: 0, right: -44, bottom: "auto" }}
          />
          <div
            style={{
              borderRadius: 16,
              minHeight: compact ? 90 : 112,
              padding: compact ? "16px 18px" : "20px 28px",
              background: validNow
                ? "linear-gradient(135deg, #166534 0%, #2E9B62 100%)"
                : "linear-gradient(135deg, #7C2D12 0%, #8B2C13 100%)",
              color: "#FFFFFF",
              boxShadow: "0 16px 34px rgba(124,45,18,0.22)",
              display: "grid",
              gridTemplateColumns: compact ? "54px minmax(0, 1fr)" : "84px minmax(0, 1fr) 86px",
              gap: compact ? 14 : 18,
              alignItems: "center",
            }}
          >
            <span
              aria-hidden
              style={{
                width: compact ? 54 : 70,
                height: compact ? 54 : 70,
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              <GsnRealisticIcon
                name="trust-shield"
                size={compact ? 44 : 58}
                decorative
              />
            </span>
            <div
              style={{
                fontSize: compact ? 20 : 30,
                lineHeight: 1.12,
                fontWeight: 1000,
                textTransform: "uppercase",
              }}
            >
              {publicValidityLabel}
            </div>
            {!compact ? (
              <GsnRealisticIcon
                name={validNow ? "trust-shield" : "vault-safe"}
                size={70}
                decorative
              />
            ) : null}
          </div>

          <div
            style={{
              ...publicVerifyPanel("#FFF8E8", compact),
              marginTop: 14,
              borderLeft: "4px solid #D6AA45",
              display: "grid",
              gridTemplateColumns: compact ? "44px minmax(0, 1fr)" : "64px minmax(0, 1fr)",
              gap: 14,
              alignItems: "center",
            }}
          >
            <span
              aria-hidden
              style={{
                width: compact ? 44 : 58,
                height: compact ? 44 : 58,
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                color: "#B7791F",
                border: "2px solid rgba(214,170,69,0.45)",
              }}
            >
              <GsnRealisticIcon
                name="records-folder"
                size={compact ? 38 : 48}
                decorative
              />
            </span>
            <div>
              <div style={{ color: "#07172C", fontSize: compact ? 17 : 21, fontWeight: 1000 }}>
                Use with care.
              </div>
              <p
                style={{
                  margin: "5px 0 0",
                  color: "#334155",
                  fontSize: compact ? 14 : 16,
                  lineHeight: 1.35,
                  fontWeight: 850,
                }}
              >
                Ask the holder to refresh their TrustSlip in GSN and share the new public code or QR before relying on it.
              </p>
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: compact ? "1fr" : "0.92fr 1fr",
              gap: 12,
            }}
          >
            <div style={innerCard("#FFFFFF")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div>
                  <div style={{ ...sectionLabel(), color: "#0B63D1" }}>GSN TrustSlip Verify</div>
                  <div style={{ color: "#64748B", fontSize: 11, fontWeight: 800 }}>
                    Public Verification Summary
                  </div>
                </div>
                <TrustPaperSeal compact />
              </div>

              <div
                style={{
                  marginTop: 12,
                  borderRadius: 14,
                  padding: "12px 14px",
                  background: validNow ? "#EAF7EE" : "#FFF7E6",
                  color: validNow ? "#166534" : "#92400E",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontWeight: 1000,
                }}
              >
                {paperIconBadge("trust-shield", validNow ? "trust" : "warning", 38)}
                <span>
                  {publicValidityLabel}
                  <span style={{ display: "block", fontSize: 12, fontWeight: 850 }}>
                    {validNow ? "This TrustSlip is currently valid." : bannerDetail}
                  </span>
                </span>
              </div>

              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "54px 1fr", gap: 10 }}>
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 14,
                    background: "#EAF3FF",
                    overflow: "hidden",
                    position: "relative",
                    display: "grid",
                    placeItems: "center",
                    color: "#0B63D1",
                    fontWeight: 1000,
                  }}
                >
                  {profileImageUrl ? (
                    <img
                      src={profileImageUrl}
                      alt={`${holderName} profile`}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    holderName.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <div style={{ ...sectionLabel(), color: "#64748B" }}>Holder</div>
                  <div style={{ ...readableText(), color: "#07172C", fontWeight: 1000 }}>
                    {holderName}
                  </div>
                  <div style={{ ...readableText(), color: "#64748B", fontSize: 12, fontWeight: 800 }}>
                    GSN ID: {gsnId}
                  </div>
                  <div style={{ ...readableText(), color: "#64748B", fontSize: 12, fontWeight: 800 }}>
                    Community: {communityLabel}
                  </div>
                </div>
              </div>

              <div
                data-gsn-community-known-as-evidence="true"
                style={{
                  marginTop: 12,
                  borderRadius: 16,
                  border: "1px solid rgba(11,99,209,0.16)",
                  background:
                    "linear-gradient(180deg, rgba(248,251,255,0.98) 0%, rgba(235,244,255,0.96) 100%)",
                  padding: 12,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ ...sectionLabel(), color: "#0B63D1" }}>
                    Community known-as evidence
                  </div>
                  <p
                    style={{
                      ...readableText(),
                      margin: "4px 0 0",
                      color: "#475569",
                      fontSize: 12,
                      fontWeight: 820,
                      lineHeight: 1.35,
                    }}
                  >
                    What this public record can safely show about how the holder is known here.
                  </p>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: compact ? "1fr" : "repeat(3, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  {communityKnownAsRows.map((row) => (
                    <div key={row.label} style={documentMetaCard("#FFFFFF")}>
                      <div style={paperMiniRow()}>
                        {paperIconBadge(row.icon, row.tone)}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: "#64748B", fontSize: 10, fontWeight: 1000, textTransform: "uppercase" }}>
                            {row.label}
                          </div>
                          <div style={{ marginTop: 3, color: "#07172C", fontSize: 13, fontWeight: 1000, lineHeight: 1.18 }}>
                            {row.value}
                          </div>
                          <div style={{ marginTop: 3, color: "#64748B", fontSize: 11, fontWeight: 800, lineHeight: 1.3 }}>
                            {row.note}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    borderRadius: 12,
                    background: "#FFF7E6",
                    border: "1px solid rgba(245,158,11,0.22)",
                    color: "#5F4100",
                    padding: "8px 10px",
                    fontSize: 11,
                    fontWeight: 850,
                    lineHeight: 1.35,
                  }}
                >
                  This is community-scoped evidence. It is not a licence, certificate, or guarantee of future work.
                </div>
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <div style={statTile("#FFFFFF")}>
                  <div style={sectionLabel()}>Trust reading</div>
                  <div
                    style={{
                      ...readableText(),
                      marginTop: 6,
                      color: "#A62626",
                      fontSize: compact ? 20 : 28,
                      lineHeight: 1.05,
                      fontWeight: 1000,
                    }}
                  >
                    {visibleBandReading}
                  </div>
                  <div style={{ ...readableText(), color: "#64748B", fontSize: 11, fontWeight: 800 }}>
                    {visibleBandLabel}
                  </div>
                  <div style={{ ...readableText(), marginTop: 4, color: "#64748B", fontSize: 11, fontWeight: 760 }}>
                    {visibleBandMeaning}
                  </div>
                </div>
                <div style={statTile("#FFFFFF")}>
                  <div style={sectionLabel()}>Evidence posture</div>
                  <div style={{ ...readableText(), marginTop: 6, color: "#07172C", fontSize: compact ? 21 : 24, fontWeight: 1000 }}>
                    {publicEvidencePosture}
                  </div>
                  <div style={{ ...readableText(), color: "#64748B", fontSize: 11, fontWeight: 800 }}>
                    {visibleEvidenceLabel}
                  </div>
                  <div style={{ ...readableText(), marginTop: 4, color: "#64748B", fontSize: 11, fontWeight: 760 }}>
                    {publicEvidencePostureMeaning}
                  </div>
                  <div style={{ ...readableText(), marginTop: 4, color: "#7A5B00", fontSize: 11, fontWeight: 820 }}>
                    {publicEvidencePostureBoundary}
                  </div>
                </div>
                <div style={statTile("#FFFFFF")}>
                  <div style={sectionLabel()}>Trust-limit signal</div>
                  <div style={{ ...readableText(), marginTop: 6, color: "#07172C", fontSize: compact ? 17 : 18, fontWeight: 1000 }}>
                    {compactTrustLimit}
                  </div>
                </div>
                <div style={statTile("#FFFFFF")}>
                  <div style={sectionLabel()}>Validity</div>
                  <div style={{ ...readableText(), marginTop: 6, color: "#07172C", fontSize: 13, fontWeight: 950 }}>
                    {issuedAtLabel} issued
                  </div>
                  <div style={{ ...readableText(), color: "#07172C", fontSize: 13, fontWeight: 950 }}>
                    {expiresAtLabel} expires
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 92px", gap: 10 }}>
                <div style={{ ...readableText(), display: "grid", gap: 5, color: "#334155", fontSize: 12, fontWeight: 850 }}>
                  <span>Code: {resolvedCode || "Not available"}</span>
                  <span>Public link: {verifyPath || "Not available"}</span>
                </div>
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(37,78,119,0.16)",
                    background: "#FFFFFF",
                    padding: 6,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {verifyUrl ? (
                    <QRCodeSVG value={verifyUrl} size={78} bgColor="#FFFFFF" fgColor="#07172C" level="M" marginSize={1} />
                  ) : (
                    <GsnRealisticIcon name="qr-record" size={58} decorative />
                  )}
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <TrustPaperSecurityNote
                  reference={resolvedCode || verifyPath || "TrustSlip verify record"}
                  compact={compact}
                />
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={{ ...sectionLabel(), color: "#0B63D1" }}>Your public view</div>
              <h3 style={{ margin: "8px 0 0", color: "#07172C", fontSize: 18, fontWeight: 1000 }}>
                Quick trust answers
              </h3>
              <p style={{ ...helperText(), margin: "4px 0 0", fontSize: 12 }}>
                Plain-language summary for quick decisions.
              </p>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {quickTrustAnswers.map(([icon, title, answer]) => (
                  <div
                    key={title}
                    style={{
                      ...(compact
                        ? {
                            padding: "8px 0",
                            background: "transparent",
                            border: "0",
                            boxShadow: "none",
                          }
                        : innerCard("#FFFFFF")),
                      padding: compact ? "8px 0" : 10,
                    }}
                  >
                    <div style={paperMiniRow()}>
                      {paperIconBadge(icon, "neutral")}
                      <div>
                        <div style={{ color: "#07172C", fontWeight: 1000, fontSize: 13 }}>{title}</div>
                        <div style={{ marginTop: 3, color: "#64748B", fontWeight: 800, fontSize: 12 }}>
                          {answer}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: 12,
                  ...mobileFlatSection(compact, "#FFFFFF"),
                  padding: compact ? "12px 0 0" : 12,
                  borderTop: compact ? "1px solid rgba(216,227,238,0.72)" : undefined,
                }}
              >
                <div style={{ ...sectionLabel(), color: "#07172C" }}>Public reading</div>
                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gridTemplateColumns: compact ? "1fr" : "repeat(3, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  <PublicReadingTile
                    icon="trust-shield"
                    label="Validity check"
                    title={validNow ? "Current public slip" : "Do not rely on this alone"}
                    text={`${publicValidityLabel}. This checks the public TrustSlip status for this code now. It does not open the holder's private Trust Passport.`}
                    compact={compact}
                    tone={validNow ? "trust" : "warning"}
                  />
                  <PublicReadingTile
                    icon="certificate-seal"
                    label="Supporting evidence"
                    title={memberWitnessCurrentness}
                    text="Read the witness, Community ID, and activity results below before making a serious decision."
                    compact={compact}
                    tone="neutral"
                  />
                  <PublicReadingTile
                    icon="records-folder"
                    label="Next safe step"
                    title="Evidence, not approval"
                    text="Use this as evidence for judgement, not as a guarantee, credit approval, payment instruction, or evidence that every claim is true."
                    compact={compact}
                    tone="warning"
                  />
                </div>
                <div style={{ marginTop: compact ? 8 : 10 }}>
                  <EvidenceResultGrid rows={evidenceResults} compact={compact} />
                </div>
                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gridTemplateColumns: compact ? "1fr" : "repeat(2, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      ...documentMetaCard("#FFF7E6"),
                      border: "1px solid rgba(245,158,11,0.22)",
                    }}
                  >
                    <div style={{ color: "#92400E", fontWeight: 1000, fontSize: 12 }}>
                      Witness currentness note
                    </div>
                    <p
                      style={{
                        ...readableText(),
                        margin: "5px 0 0",
                        color: "#334155",
                        fontWeight: 820,
                        fontSize: 12,
                        lineHeight: 1.42,
                      }}
                    >
                      {`Witness currentness: ${memberWitnessCurrentnessScope}`}
                    </p>
                  </div>
                  <div style={documentMetaCard("#F8FBFF")}>
                    <div style={{ color: "#0B63D1", fontWeight: 1000, fontSize: 12 }}>
                      Community scope note
                    </div>
                    <p
                      style={{
                        ...readableText(),
                        margin: "5px 0 0",
                        color: "#334155",
                        fontWeight: 820,
                        fontSize: 12,
                        lineHeight: 1.42,
                      }}
                    >
                      {`Community record: ${communityRecordCurrentness}. ${communityRecordCurrentnessScope}`}
                    </p>
                  </div>
                </div>
              </div>

              {!isLite ? (
                <div
                  style={{
                    marginTop: 12,
                    ...mobileFlatSection(compact, "#F8FBFF"),
                    padding: compact ? "12px 0 0" : 12,
                    borderTop: compact ? "1px solid rgba(216,227,238,0.72)" : undefined,
                  }}
                >
                  <div style={{ ...sectionLabel(), color: "#07172C" }}>At a glance</div>
                  <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                    {glanceGroups.map((group) => (
                      <OfficialResultTable
                        key={group.title}
                        title={group.title}
                        rows={group.rows}
                        compact={compact}
                      />
                    ))}
                  </div>
                  {memberCredentialPath ? (
                    <StableCtaLink
                      to={memberCredentialPath}
                      kind="soft"
                      stableHeight={48}
                      debugId="trust-slip-verify.public.open-member-credential"
                      style={{
                        marginTop: 10,
                        width: "100%",
                        borderRadius: 12,
                        fontWeight: 1000,
                      }}
                    >
                      Open member credential
                    </StableCtaLink>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {!isLite ? (
            <div
              style={{
                marginTop: 12,
                ...innerCard("#FFFFFF"),
                border: "1px solid rgba(216,227,238,0.9)",
                position: "relative",
                overflow: "hidden",
              }}
            >
            <TrustPaperWatermark
              name="community"
              color="#0B63D1"
              size={170}
              opacity={0.028}
              style={{ top: 24, right: -48, bottom: "auto" }}
            />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ ...sectionLabel(), color: "#0B63D1" }}>Instant community confirmation</div>
                  <h3 style={{ margin: "6px 0 0", color: "#07172C", fontSize: 18, fontWeight: 1000 }}>
                    Ask the community to confirm now.
                  </h3>
                </div>
                <span style={paperStatusPill(communityRelayAvailable ? "active" : "limited")}>
                  Live check {communityRelayAvailable ? "available" : "not available"}
                </span>
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: compact ? "1fr" : "minmax(0, 1fr) minmax(260px, 0.72fr)",
                  gap: 12,
                }}
              >
                <div style={{ ...documentMetaCard("#F8FBFF"), position: "relative", overflow: "hidden" }}>
                  <TrustPaperWatermark
                    name="shield"
                    color="#2E9B62"
                    size={120}
                    opacity={0.035}
                    style={{ top: 18, right: 12, bottom: "auto" }}
                  />
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div style={{ color: "#07172C", fontWeight: 1000 }}>
                      Response-based verification
                    </div>
                    <p style={{ margin: "8px 0 0", color: "#334155", fontWeight: 850, lineHeight: 1.45 }}>
                      {communityConfirmationText}
                    </p>
                    <div style={{ marginTop: 10, color: "#64748B", fontSize: 12, fontWeight: 800, lineHeight: 1.4 }}>
                      GSN returns counts and outcome only. It does not publish member phone numbers.
                    </div>
                  </div>
                </div>

                <div style={{ ...documentMetaCard("#FFFFFF"), display: "grid", gap: 8 }}>
                  <div style={{ ...sectionLabel(), color: "#07172C" }}>
                    Confirmation readiness
                  </div>
                  <EvidenceResultGrid rows={confirmationEvidenceResults} compact={compact} />
                </div>
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: compact ? "1fr" : "minmax(0, 0.76fr) minmax(260px, 0.42fr)",
                  gap: 12,
                  alignItems: "stretch",
                }}
              >
                <div style={{ ...documentMetaCard("#FFFFFF"), border: "1px solid rgba(11,99,209,0.14)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#07172C", fontWeight: 1000 }}>
                    {paperIconBadge("community-building", "trust", 38)}
                    Instant confirmation result
                  </div>
                  {confirmationOutcome ? (
                    <>
                      <p style={{ margin: "8px 0 0", color: "#334155", fontWeight: 850, lineHeight: 1.42 }}>
                        {confirmationOutcome.visible_summary ||
                          "Community responses will appear as an aggregate result when members answer."}
                      </p>
                      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <span style={paperStatusPill(firstTruthy(confirmationResult?.community_confidence, "Not recorded yet"))}>
                          Confidence: {firstTruthy(confirmationResult?.community_confidence, "Not recorded yet")}
                        </span>
                        <span style={paperStatusPill("limited")}>
                          Sent: {confirmationResult?.requests_sent ?? 0}
                        </span>
                        <span style={paperStatusPill("limited")}>
                          Responses: {confirmationResult?.responses_received ?? 0} of{" "}
                          {confirmationResult?.active_member_count ?? 0}
                        </span>
                        <span style={paperStatusPill("active")}>
                          Confirmed: {confirmationResult?.confirmed_known_count ?? 0}
                        </span>
                      </div>
                      {confirmationPublicPath ? (
                        <StableCtaLink
                          to={confirmationPublicPath}
                          kind="soft"
                          stableHeight={52}
                          debugId="trust-slip-verify.community-confirmation.open-outcome"
                          style={{ marginTop: 10, width: "100%" }}
                        >
                          Open public outcome paper
                        </StableCtaLink>
                      ) : null}
                    </>
                  ) : (
                    <div style={{ marginTop: 8 }}>
                      <EvidenceResultRow
                        icon="records-folder"
                        label="Current result"
                        value={
                          requestLockedReason
                            ? "Locked"
                            : "No request sent"
                        }
                        note={
                          requestLockedReason ||
                          "Ask only when the TrustSlip code and community response pool are ready."
                        }
                        tone={requestLockedReason ? "warning" : "neutral"}
                        compact={compact}
                      />
                    </div>
                  )}
                </div>

                <div style={lockedActionFrame(compact)}>
                  <div
                    style={{
                      ...documentMetaCard("#F8FBFF"),
                      border: "1px solid rgba(11,99,209,0.14)",
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={{ color: "#07172C", fontWeight: 1000 }}>
                        Result return channel
                      </div>
                      <p style={{ margin: "6px 0 0", color: "#64748B", fontWeight: 850, lineHeight: 1.4 }}>
                        The result link is the evidence source. SMS or WhatsApp only sends a notice back.
                      </p>
                    </div>

                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={fieldLabel()}>Requester label</span>
                      <input
                        value={requesterLabel}
                        onChange={(event) => setRequesterLabel(event.target.value)}
                        placeholder="Merchant counter check"
                        maxLength={120}
                        style={textInput(compact)}
                      />
                    </label>

                    <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "0.62fr 1fr", gap: 8 }}>
                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={fieldLabel()}>Optional return</span>
                        <select
                          value={callbackChannel}
                          onChange={(event) => {
                            const next = event.target.value as CommunityConfirmationCallbackDraft["callbackChannel"];
                            setCallbackChannel(next);
                            if (next === "none") {
                              setCallbackConsent(false);
                              setCallbackContact("");
                            }
                          }}
                          style={selectInput(compact)}
                        >
                          <option value="none">Result link only</option>
                          <option value="sms">SMS later</option>
                          <option value="whatsapp">WhatsApp later</option>
                        </select>
                      </label>

                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={fieldLabel()}>Business number</span>
                        <input
                          value={callbackContact}
                          onChange={(event) => setCallbackContact(event.target.value)}
                          placeholder="Use +E164 format"
                          disabled={callbackChannel === "none"}
                          maxLength={64}
                          style={{
                            ...textInput(compact),
                            opacity: callbackChannel === "none" ? 0.62 : 1,
                          }}
                        />
                      </label>
                    </div>

                    {callbackChannel !== "none" ? (
                      <label
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "flex-start",
                          color: "#334155",
                          fontSize: 12,
                          fontWeight: 850,
                          lineHeight: 1.4,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={callbackConsent}
                          onChange={(event) => setCallbackConsent(event.target.checked)}
                          style={{ marginTop: 2 }}
                        />
                        <span>
                          I agree that this business number can receive this confirmation result when SMS or WhatsApp delivery is configured.
                        </span>
                      </label>
                    ) : null}

                    {requesterCallback?.requested ? (
                      <div style={paperStatusPill("limited")}>
                        {firstTruthy(requesterCallback.channel, "Callback")} captured, contact {firstTruthy(requesterCallback.contact_masked, "masked")}. {firstTruthy(requesterCallback.delivery_status, "not configured")}
                      </div>
                    ) : null}
                  </div>

                  <PrimaryButton
                    type="button"
                    onClick={() =>
                      onRequestCommunityPulse({
                        requesterExternalLabel: requesterLabel,
                        callbackChannel,
                        callbackContact,
                        callbackConsent,
                      })
                    }
                    busy={confirmationBusy}
                    busyLabel="Requesting..."
                    fullWidth
                    stableHeight={56}
                    debugId="trust-slip-verify.community-confirmation.request"
                    disabled={Boolean(requestLockedReason) || callbackBlocked}
                  >
                    Request instant confirmation
                  </PrimaryButton>
                  {callbackBlocked ? (
                    <div style={{ ...documentMetaCard("#FFF7E6"), border: "1px solid rgba(245,158,11,0.24)" }}>
                      <div style={{ color: "#92400E", fontWeight: 1000, fontSize: 13 }}>
                        Consent needed
                      </div>
                      <p style={{ margin: "7px 0 0", color: "#334155", fontWeight: 850, lineHeight: 1.45 }}>
                        Keep result-link only, or tick consent before adding a return number.
                      </p>
                    </div>
                  ) : null}
                  {requestLockedReason ? (
                    <div
                      style={{
                        ...documentMetaCard("#FFF7E6"),
                        border: "1px solid rgba(245,158,11,0.24)",
                      }}
                    >
                      <div style={{ color: "#92400E", fontWeight: 1000, fontSize: 13 }}>
                        Why this is locked
                      </div>
                      <p style={{ margin: "7px 0 0", color: "#334155", fontWeight: 850, lineHeight: 1.45 }}>
                        {requestLockedReason}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            </div>
          ) : null}

          {publicActions}
        </div>
      </div>

      <footer
        style={{
          position: "relative",
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: compact ? "58px minmax(0, 1fr)" : "86px minmax(0, 1fr) 80px",
          gap: 18,
          alignItems: "center",
          padding: compact ? "18px 22px" : "24px 44px",
          background: "linear-gradient(135deg, #061827 0%, #082A48 100%)",
          color: "#FFFFFF",
        }}
      >
        <span
          aria-hidden
          style={{
            width: 58,
            height: 58,
            borderRadius: 14,
            border: "1px solid rgba(246,215,122,0.5)",
            color: "#F6D77A",
            display: "grid",
            placeItems: "center",
          }}
        >
          <GsnRealisticIcon name="trust-shield" size={50} decorative />
        </span>
        <div>
          <div style={{ color: "#F6D77A", fontSize: compact ? 15 : 18, fontWeight: 1000 }}>
            GSN Trust Evidence
          </div>
          <div style={{ marginTop: 4, color: "#DCE8F4", fontSize: compact ? 13 : 16, lineHeight: 1.35, fontWeight: 780 }}>
            public evidence first, private details protected, you decide with the record in front of you.
          </div>
        </div>
        {!compact ? <GsnRealisticIcon name="public-globe" size={66} decorative /> : null}
      </footer>
    </section>
  );
}
