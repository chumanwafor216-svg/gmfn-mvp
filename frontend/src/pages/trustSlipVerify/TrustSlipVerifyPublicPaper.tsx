import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import CommunityProofPanel from "../../components/CommunityProofPanel";
import GSNBrandMark from "../../components/GSNBrandMark";
import { GsnRealisticIcon, type Gsn3DIconKey } from "../../components/GsnRealisticIcon";
import { PrimaryButton, StableCtaLink, SubtleButton } from "../../components/StableButton";
import { revealElementWithoutJump } from "../../lib/mobileRevealStability";
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
  DEFAULT_DECISION_PACK,
  buildDecisionPackDecisionReading,
  findDecisionPack,
} from "../../lib/decisionPacks";
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

export type CommunityConfirmationOption = {
  community_id?: string | number | null;
  clan_id?: string | number | null;
  community_name?: string | null;
  community_code?: string | null;
  holder_role?: string | null;
  role?: string | null;
  is_primary_anchor?: boolean | null;
  community_status?: string | null;
  active_member_count?: string | number | null;
  contactable_reference_count?: string | number | null;
  sponsor_signal_count?: string | number | null;
  last_community_confirmation?: string | null;
  relay_available?: boolean | null;
  instant_pulse_available?: boolean | null;
  plain_language?: string | null;
};

export type CommunityConfirmationCallbackDraft = {
  requesterExternalLabel?: string;
  callbackChannel?: "none" | "sms" | "whatsapp";
  callbackContact?: string;
  callbackConsent?: boolean;
  confirmationCommunityId?: string;
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
  activeCommunityCount?: string | number | null;
  evidenceScopeSummary?: string | null;
  evidenceScopeBoundary?: string | null;
  evidenceScopeReadingScope?: string | null;
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
  communityConfirmationOptions?: CommunityConfirmationOption[];
  selectedConfirmationCommunityId?: string;
  onConfirmationCommunityChange?: (communityId: string) => void;
  confirmationOutcome: CommunityConfirmationOutcome | null;
  confirmationResult: CommunityConfirmationResult | null;
  confirmationPublicPath: string;
  confirmationBusy: boolean;
  canRequestCommunityPulse: boolean;
  onRequestCommunityPulse: (draft?: CommunityConfirmationCallbackDraft) => void;
  publicActions: React.ReactNode;
  decisionPackProfile: {
    accessPurpose: string;
    recipientQuestion: string;
    relevantSignals: Array<{
      key: string;
      label: string;
      status: string;
      value: string;
      decisionUse: string;
    }>;
    gapsToCheck: Array<{
      key: string;
      label: string;
      reason: string;
      nextStep: string;
    }>;
    recommendedChecks: string[];
    evidenceExtract: {
      source: string;
      sourceNote: string;
      evidenceScope: {
        readingScope: string;
        includedActiveCommunityCount: number | null;
        includesHolderLevelRecords: boolean;
        publicSummary: string;
        boundary: string;
      };
      categories: Array<{
        key: string;
        label: string;
        status: string;
        evidenceCount: number | null;
        latestAt: string;
        decisionUse: string;
      }>;
      declaredClaims: Array<{
        key: string;
        label: string;
        status: string;
        value: string;
        source: string;
        evidenceCount: number | null;
        decisionUse: string;
      }>;
      declarationBoundaryNote: string;
      recordPointers: Array<{
        key: string;
        label: string;
        status: string;
        value: string;
        source: string;
        evidenceCount: number | null;
        decisionUse: string;
      }>;
      recordPointerBoundaryNote: string;
      housingReferencePointers: Array<{
        key: string;
        label: string;
        status: string;
        value: string;
        source: string;
        evidenceCount: number | null;
        decisionUse: string;
      }>;
      housingReferenceBoundaryNote: string;
      guaranteeOutcomePointers: Array<{
        key: string;
        label: string;
        status: string;
        value: string;
        source: string;
        evidenceCount: number | null;
        decisionUse: string;
      }>;
      guaranteeOutcomeBoundaryNote: string;
      fulfillmentOutcomePointers: Array<{
        key: string;
        label: string;
        status: string;
        value: string;
        source: string;
        evidenceCount: number | null;
        decisionUse: string;
      }>;
      fulfillmentOutcomeBoundaryNote: string;
      completedWorkPointers: Array<{
        key: string;
        label: string;
        status: string;
        value: string;
        source: string;
        evidenceCount: number | null;
        decisionUse: string;
      }>;
      completedWorkBoundaryNote: string;
      demandRequestOutcomePointers: Array<{
        key: string;
        label: string;
        status: string;
        value: string;
        source: string;
        evidenceCount: number | null;
        decisionUse: string;
      }>;
      demandRequestOutcomeBoundaryNote: string;
      confirmationPointers: Array<{
        key: string;
        label: string;
        status: string;
        value: string;
        source: string;
        evidenceCount: number | null;
        decisionUse: string;
      }>;
      confirmationPointerBoundaryNote: string;
      issueResolutionPointers: Array<{
        key: string;
        label: string;
        status: string;
        value: string;
        source: string;
        evidenceCount: number | null;
        decisionUse: string;
      }>;
      issueResolutionBoundaryNote: string;
      privateReviewRequired: Array<{
        key: string;
        label: string;
        status: string;
        decisionUse: string;
      }>;
      boundaryNote: string;
    };
    basisNote: string;
    boundaryNote: string;
    communityConfirmationPrompt: {
      reasonType: string;
      question: string;
      responders: string;
      countsAs: string;
      escalation: string;
      boundary: string;
    };
  };
  recipientAccessRecord: {
    recipientLabel: string;
    purpose: string;
    scope: string;
    accessedAtLabel: string;
    status: string;
    note: string;
    focus: string;
  };
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

function hasMeaningfulDecisionValue(value: unknown): boolean {
  const text = safeText(value).toLowerCase();
  if (!text) return false;
  return !(
    text.startsWith("no ") ||
    text.includes("not shown") ||
    text.includes("not visible") ||
    text.includes("not available") ||
    text.includes("not stated") ||
    text.includes("not yet")
  );
}

function hasVisibleDecisionEvidence(status: unknown, evidenceCount: unknown, value?: unknown): boolean {
  const statusText = safeText(status).toLowerCase();
  return (
    positiveNumber(evidenceCount) > 0 ||
    statusText.includes("available") ||
    statusText.includes("visible") ||
    statusText.includes("present") ||
    statusText.includes("recorded") ||
    statusText.includes("confirmed") ||
    hasMeaningfulDecisionValue(value)
  );
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
    gap: compact ? 8 : 24,
    alignItems: compact ? "start" : "center",
    minHeight: compact ? "auto" : 220,
    padding: compact ? "12px 14px 18px" : "34px 44px 42px",
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

  if (compact) {
    return (
      <div
        data-gsn-public-reading-tile-density="compact"
        style={{
          ...innerCard(background),
          padding: 8,
          minHeight: 84,
          display: "grid",
          gridTemplateColumns: "32px minmax(0, 1fr)",
          gap: 7,
          alignItems: "start",
          minWidth: 0,
        }}
      >
        {paperIconBadge(icon, tone, 30)}
        <div style={{ minWidth: 0, display: "grid", gap: 3 }}>
          <div
            style={{
              ...readableText(),
              color,
              fontSize: 9,
              fontWeight: 1000,
              lineHeight: 1.05,
              textTransform: "uppercase",
            }}
          >
            {label}
          </div>
          <strong
            style={{
              ...readableText(),
              color: "#07172C",
              fontSize: 12.5,
              fontWeight: 1000,
              lineHeight: 1.12,
            }}
          >
            {title}
          </strong>
          <p
            style={{
              ...readableText(),
              margin: 0,
              color: "#334155",
              fontSize: 10.5,
              fontWeight: 820,
              lineHeight: 1.2,
            }}
          >
            {text}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        ...innerCard(background),
        padding: 10,
        minHeight: 132,
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
          fontSize: 14,
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
          fontSize: 12,
          fontWeight: 820,
          lineHeight: 1.42,
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
    gridTemplateColumns: compact ? "1fr" : "minmax(0, 1fr) auto",
    gap: compact ? 3 : 10,
    alignItems: compact ? "start" : "center",
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
                textAlign: compact ? "left" : "right",
                justifySelf: compact ? "start" : "end",
                maxWidth: "100%",
                fontSize: compact ? 13 : undefined,
                lineHeight: compact ? 1.28 : undefined,
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

function DecisionFactorTable({
  rows,
  compact,
}: {
  rows: Array<[string, string]>;
  compact: boolean;
}) {
  return (
    <div
      data-gsn-public-evidence-translation-table="decision-factor-finding"
      style={{
        borderRadius: compact ? 12 : 14,
        border: "1px solid rgba(37,78,119,0.12)",
        background: "#FFFFFF",
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      {rows.map(([factor, finding]) => (
        <div
          key={factor}
          style={{
            display: "grid",
            gridTemplateColumns: compact
              ? "1fr"
              : "minmax(0, 0.34fr) minmax(0, 0.66fr)",
            gap: compact ? 4 : 12,
            alignItems: "start",
            padding: compact ? "10px 11px" : "10px 12px",
            borderBottom: "1px solid rgba(216,227,238,0.62)",
            minWidth: 0,
          }}
        >
          <span
            style={{
              ...readableText(),
              color: "#526579",
              fontSize: compact ? 10.5 : 11.5,
              fontWeight: 1000,
              lineHeight: 1.18,
            }}
          >
            {factor}
          </span>
          <strong
            style={{
              ...readableText(),
              color: "#07172C",
              fontSize: compact ? 12.2 : 13,
              fontWeight: 930,
              lineHeight: 1.32,
            }}
          >
            {finding}
          </strong>
        </div>
      ))}
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
  activeCommunityCount,
  evidenceScopeSummary,
  evidenceScopeBoundary,
  evidenceScopeReadingScope,
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
  communityConfirmationOptions = [],
  selectedConfirmationCommunityId = "",
  onConfirmationCommunityChange,
  confirmationOutcome,
  confirmationResult,
  confirmationPublicPath,
  confirmationBusy,
  canRequestCommunityPulse,
  onRequestCommunityPulse,
  publicActions,
  decisionPackProfile,
  recipientAccessRecord,
  variant = "full",
}: TrustSlipVerifyPublicPaperProps) {
  const [requesterLabel, setRequesterLabel] = useState("");
  const [callbackChannel, setCallbackChannel] =
    useState<CommunityConfirmationCallbackDraft["callbackChannel"]>("none");
  const [callbackContact, setCallbackContact] = useState("");
  const [callbackConsent, setCallbackConsent] = useState(false);
  const selectableConfirmationCommunities = communityConfirmationOptions.filter((item) =>
    Boolean(firstTruthy(item.community_id, item.clan_id))
  );
  const selectedConfirmationCommunity =
    selectableConfirmationCommunities.find(
      (item) => firstTruthy(item.community_id, item.clan_id) === selectedConfirmationCommunityId
    ) || selectableConfirmationCommunities[0] || null;
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
    "This Community ID resolves to an active GSN community record. Parent community acknowledgement and member-level evidence still need separate current scoped evidence."
  );
  const communityActivityCountLabel = firstTruthy(communityActivityCount, "0");
  const activeCommunityCountLabel = firstTruthy(activeCommunityCount);
  const activeCommunityContexts = positiveNumber(activeCommunityCountLabel);
  const evidenceScopeSummaryText = firstTruthy(
    evidenceScopeSummary,
    activeCommunityContexts > 1
      ? `Primary anchor: ${communityLabel || "this community"}. Wider context: ${activeCommunityCountLabel} active community contexts.`
      : `Primary anchor: ${communityLabel || "this community"}. Wider context is still building.`
  );

  const evidenceScopeIsWider = firstTruthy(evidenceScopeReadingScope).toLowerCase() === "primary_plus_wider" || activeCommunityContexts > 1;
  const requestedVerificationScopeLabel = firstTruthy(
    recipientAccessRecord.scope,
    evidenceScopeIsWider ? "Primary + wider" : "Primary shown"
  );
  const requestedVerificationScopeBoundary = firstTruthy(
    decisionPackProfile.evidenceExtract.evidenceScope.boundary,
    evidenceScopeBoundary,
    "Live confirmation responses must be read as scoped community witness evidence, not as a universal judgement."
  );
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
      label: "Primary community role",
      value: holderRoleLabel,
      note: `Shown inside ${communityLabel || "this community record"}.`,
      tone: holderRoleLabel.toLowerCase().includes("member") ? "neutral" : "trust",
    },
    {
      icon: "community-building",
      label: "Primary community signals",
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
  const visibleBandReading = visibleBandLabel || publicEvidencePosture || "Evidence strength";
  const decisionPackPurpose = firstTruthy(
    recipientAccessRecord.purpose,
    "General Decision Pack"
  );
  const decisionNextStep = validNow
    ? "For important decisions, request instant community confirmation before relying on this paper."
    : "Request a new TrustSlip.";
  const hasCommunityEvidence = positiveNumber(communityActivityCountLabel) > 0;
  const hasWitnessEvidence =
    positiveNumber(memberWitnessCountLabel) > 0 &&
    !memberWitnessCurrentness.toLowerCase().includes("not");
  const supportPurpose = /guarantor|guarantee|support/i.test(decisionPackPurpose);
  const employmentPurpose = /employment|work|job/i.test(decisionPackPurpose);
  const housingPurpose = /housing|tenant|rent/i.test(decisionPackPurpose);
  const tradePurpose = /trade|supplier|skilled|market/i.test(decisionPackPurpose);
  const hasSupportOutcomeEvidence = decisionPackProfile.evidenceExtract.guaranteeOutcomePointers.length > 0;
  const decisionFirstAnswer = !validNow
    ? "Fresh TrustSlip needed before decision"
    : supportPurpose
      ? hasWitnessEvidence && hasSupportOutcomeEvidence
        ? "Use as support evidence; confirm before guarantee"
        : "Community recognition supported; guarantee still needs confirmation"
      : employmentPurpose
        ? hasCommunityEvidence || hasWitnessEvidence
          ? "Suitable for employment screening"
          : "Employment screening still needs confirmation"
        : housingPurpose
          ? hasCommunityEvidence || hasWitnessEvidence
            ? "Community recognition visible; housing still needs confirmation"
            : "Housing decision still needs confirmation"
          : tradePurpose
            ? hasCommunityEvidence || hasWitnessEvidence
              ? "Suitable for a low-risk trade check"
              : "Trade decision still needs confirmation"
            : hasCommunityEvidence || hasWitnessEvidence
              ? "Community recognition supported"
              : "Evidence still needs confirmation";
  const decisionFirstTone: "trust" | "warning" | "neutral" = !validNow
    ? "warning"
    : supportPurpose && (!hasWitnessEvidence || !hasSupportOutcomeEvidence)
      ? "warning"
      : hasCommunityEvidence || hasWitnessEvidence
        ? "trust"
        : "neutral";
  const decisionFirstFacts: Array<{
    icon: Gsn3DIconKey;
    label: string;
    title: string;
    text: string;
    tone: "trust" | "warning" | "neutral";
  }> = [
    {
      icon: "identity-card",
      label: "Who?",
      title: holderName,
      text: gsnId ? `GSN ID: ${gsnId}` : "GSN ID not shown on this paper.",
      tone: "neutral",
    },
    {
      icon: "community-building",
      label: "What we checked",
      title: requestedVerificationScopeLabel,
      text: `${evidenceScopeSummaryText} ${requestedVerificationScopeBoundary}`,
      tone: holderRoleLabel.toLowerCase().includes("member") ? "neutral" : "trust",
    },
    {
      icon: "records-folder",
      label: "Evidence",
      title: visibleBandReading,
      text: visibleEvidenceLabel || publicEvidencePostureMeaning,
      tone: decisionFirstTone,
    },
    {
      icon: "certificate-seal",
      label: "Next step",
      title: validNow ? "Request live confirmation" : "Request new TrustSlip",
      text: validNow
        ? "Ask the community before relying on this paper."
        : "Use a fresh code before deciding.",
      tone: validNow ? "trust" : "warning",
    },
  ];
  const decisionBoundaryRows: Array<[string, string]> = [
    ["What we checked", requestedVerificationScopeLabel],
    ["Guarantee", "No"],
    ["Government ID", "No"],
    ["Credit approval", "No"],
    ["Final decision", "Yours"],
  ];
  const recordTrustReasonTiles = [
    {
      icon: "qr-record" as Gsn3DIconKey,
      label: "Public code",
      title: resolvedCode ? "Code resolved" : "Code limited",
      text: resolvedCode
        ? `This paper is tied to TrustSlip code ${resolvedCode}.`
        : "Ask the holder for a fresh TrustSlip code before relying on this paper.",
      tone: resolvedCode ? "trust" : "warning",
    },
    {
      icon: "certificate-seal" as Gsn3DIconKey,
      label: "Current window",
      title: validNow ? "Valid now" : "Request new TrustSlip",
      text: `Status: ${publicValidityLabel}. Expires: ${expiresAtLabel || "not shown"}.`,
      tone: validNow ? "trust" : "warning",
    },
    {
      icon: "public-globe" as Gsn3DIconKey,
      label: "Check path",
      title: verifyUrl ? "Link and QR available" : "Link unavailable",
      text: verifyUrl
        ? "Use the live link or QR instead of relying on an old screenshot."
        : "No public verification link is available for this paper yet.",
      tone: verifyUrl ? "trust" : "warning",
    },
    {
      icon: "community-building" as Gsn3DIconKey,
      label: "Live confirmation",
      title: validNow ? "Ask before important risk" : "Fresh paper needed",
      text: decisionNextStep,
      tone: validNow ? "neutral" : "warning",
    },
  ];
  const selectedConfirmationCommunityName = firstTruthy(
    selectedConfirmationCommunity?.community_name,
    communityLabel
  );
  const readerConfirmationIntro = !validNow
    ? "Start by asking the holder for a fresh TrustSlip before using this paper."
    : "Use the confirmation path that matches the decision: membership, the selected community, or the witness and activity evidence already shown here.";
  const membershipConfirmationNote = memberCredentialPath
    ? "Open the scoped member credential when the decision depends on active membership."
    : "This TrustSlip does not include a separate member credential link yet.";
  const communityConfirmationNote = requestLockedReason
    ? requestLockedReason
    : `Ask ${selectedConfirmationCommunityName || "the selected community"} for a live response before relying on this paper for important risk.`;
  const witnessEvidenceNote = hasWitnessEvidence
    ? "Read the witness currentness and community activity before deciding."
    : "Check the visible evidence gaps before asking for stronger confirmation.";
  const reviewPublicEvidence = () => {
    const target = document.getElementById("trust-slip-verify-community-known-as");
    if (!target) return;
    revealElementWithoutJump(target, {
      surface: "trust-slip-verify",
      targetId: "trust-slip-verify-community-known-as",
      reason: "reader-confirmation-choice",
    });
  };
  const decisionPackProfileSignals = decisionPackProfile.relevantSignals.slice(0, 4);
  const decisionPackProfileGaps = decisionPackProfile.gapsToCheck.slice(0, 3);
  const decisionPackProfileChecks = decisionPackProfile.recommendedChecks.slice(0, 3);
  const decisionPackEvidenceScope = decisionPackProfile.evidenceExtract.evidenceScope;
  const decisionPackEvidenceScopeRows: Array<[string, string]> = [
    [
      "Footprint",
      firstTruthy(
        decisionPackEvidenceScope.publicSummary,
        "Purpose evidence is currently anchored to the primary community plus holder-level records."
      ),
    ],
    [
      "Boundary",
      firstTruthy(
        decisionPackEvidenceScope.boundary,
        "This Decision Pack does not mean every community gives the same judgement."
      ),
    ],
  ];
  const decisionPackEvidenceCategories = decisionPackProfile.evidenceExtract.categories.slice(0, 4);
  const decisionPackDeclaredClaims = decisionPackProfile.evidenceExtract.declaredClaims.slice(0, 3);
  const decisionPackRecordPointers = decisionPackProfile.evidenceExtract.recordPointers.slice(0, 3);
  const decisionPackHousingReferencePointers = decisionPackProfile.evidenceExtract.housingReferencePointers.slice(0, 3);
  const decisionPackGuaranteeOutcomePointers = decisionPackProfile.evidenceExtract.guaranteeOutcomePointers.slice(0, 3);
  const decisionPackFulfillmentOutcomePointers = decisionPackProfile.evidenceExtract.fulfillmentOutcomePointers.slice(0, 3);
  const decisionPackCompletedWorkPointers = decisionPackProfile.evidenceExtract.completedWorkPointers.slice(0, 3);
  const decisionPackDemandRequestOutcomePointers = decisionPackProfile.evidenceExtract.demandRequestOutcomePointers.slice(0, 3);
  const decisionPackConfirmationPointers = decisionPackProfile.evidenceExtract.confirmationPointers.slice(0, 3);
  const decisionPackIssueResolutionPointers = decisionPackProfile.evidenceExtract.issueResolutionPointers.slice(0, 3);
  const decisionPackPrivateReview = decisionPackProfile.evidenceExtract.privateReviewRequired.slice(0, 3);
  const decisionPackPositiveCategories = decisionPackEvidenceCategories.filter((category) =>
    hasVisibleDecisionEvidence(category.status, category.evidenceCount)
  );
  const decisionPackVisibleDeclaredClaims = decisionPackDeclaredClaims.filter((claim) =>
    hasVisibleDecisionEvidence(claim.status, claim.evidenceCount, claim.value)
  );
  const decisionPackVisibleRecordPointers = decisionPackRecordPointers.filter((pointer) =>
    hasVisibleDecisionEvidence(pointer.status, pointer.evidenceCount, pointer.value)
  );
  const decisionPackVisibleHousingReferencePointers = decisionPackHousingReferencePointers.filter((pointer) =>
    hasVisibleDecisionEvidence(pointer.status, pointer.evidenceCount, pointer.value)
  );
  const decisionPackVisibleGuaranteeOutcomePointers = decisionPackGuaranteeOutcomePointers.filter((pointer) =>
    hasVisibleDecisionEvidence(pointer.status, pointer.evidenceCount, pointer.value)
  );
  const decisionPackVisibleFulfillmentOutcomePointers = decisionPackFulfillmentOutcomePointers.filter((pointer) =>
    hasVisibleDecisionEvidence(pointer.status, pointer.evidenceCount, pointer.value)
  );
  const decisionPackVisibleCompletedWorkPointers = decisionPackCompletedWorkPointers.filter((pointer) =>
    hasVisibleDecisionEvidence(pointer.status, pointer.evidenceCount, pointer.value)
  );
  const decisionPackVisibleDemandRequestOutcomePointers = decisionPackDemandRequestOutcomePointers.filter((pointer) =>
    hasVisibleDecisionEvidence(pointer.status, pointer.evidenceCount, pointer.value)
  );
  const decisionPackVisibleConfirmationPointers = decisionPackConfirmationPointers.filter((pointer) =>
    hasVisibleDecisionEvidence(pointer.status, pointer.evidenceCount, pointer.value)
  );
  const decisionPackVisibleIssueResolutionPointers = decisionPackIssueResolutionPointers.filter((pointer) =>
    hasVisibleDecisionEvidence(pointer.status, pointer.evidenceCount, pointer.value)
  );
  const decisionPackEvidenceRows: Array<[string, string]> = (decisionPackPositiveCategories.length
    ? decisionPackPositiveCategories.map((category): [string, string] => [
        category.label,
        `${category.evidenceCount ?? 0} public-safe record${category.evidenceCount === 1 ? "" : "s"}${
          category.latestAt ? `; latest ${category.latestAt}` : ""
        }`,
      ])
    : [["Detailed public categories", "No detailed category records are shown here. Read the community activity meaning first, then ask for live confirmation or the full Trust Passport if the decision is high-risk."] as [string, string]]
  ).slice(0, 4);
  const decisionPackDeclaredClaimRows: Array<[string, string]> = decisionPackVisibleDeclaredClaims.map((claim): [string, string] => [
    claim.label,
    `${claim.value}${claim.evidenceCount ? ` (${claim.evidenceCount} pointer${claim.evidenceCount === 1 ? "" : "s"})` : ""}`,
  ]);
  const decisionPackRecordPointerRows: Array<[string, string]> = decisionPackVisibleRecordPointers.map((pointer): [string, string] => [
    pointer.label,
    pointer.value + (pointer.evidenceCount ? " (" + pointer.evidenceCount + " pointer" + (pointer.evidenceCount === 1 ? "" : "s") + ")" : ""),
  ]);
  const decisionPackHousingReferenceRows: Array<[string, string]> = decisionPackVisibleHousingReferencePointers.map((pointer): [string, string] => [
    pointer.label,
    pointer.value + (pointer.evidenceCount ? " (" + pointer.evidenceCount + " pointer" + (pointer.evidenceCount === 1 ? "" : "s") + ")" : ""),
  ]);
  const decisionPackGuaranteeOutcomeRows: Array<[string, string]> = decisionPackVisibleGuaranteeOutcomePointers.map((pointer): [string, string] => [
    pointer.label,
    pointer.value + (pointer.evidenceCount ? " (" + pointer.evidenceCount + " pointer" + (pointer.evidenceCount === 1 ? "" : "s") + ")" : ""),
  ]);
  const decisionPackFulfillmentOutcomeRows: Array<[string, string]> = decisionPackVisibleFulfillmentOutcomePointers.map((pointer): [string, string] => [
    pointer.label,
    pointer.value + (pointer.evidenceCount ? " (" + pointer.evidenceCount + " pointer" + (pointer.evidenceCount === 1 ? "" : "s") + ")" : ""),
  ]);
  const decisionPackCompletedWorkRows: Array<[string, string]> = decisionPackVisibleCompletedWorkPointers.map((pointer): [string, string] => [
    pointer.label,
    pointer.value + (pointer.evidenceCount ? " (" + pointer.evidenceCount + " pointer" + (pointer.evidenceCount === 1 ? "" : "s") + ")" : ""),
  ]);
  const decisionPackDemandRequestOutcomeRows: Array<[string, string]> = decisionPackVisibleDemandRequestOutcomePointers.map((pointer): [string, string] => [
    pointer.label,
    pointer.value + (pointer.evidenceCount ? " (" + pointer.evidenceCount + " pointer" + (pointer.evidenceCount === 1 ? "" : "s") + ")" : ""),
  ]);
  const decisionPackConfirmationPointerRows: Array<[string, string]> = decisionPackVisibleConfirmationPointers.map((pointer): [string, string] => [
    pointer.label,
    pointer.value + (pointer.evidenceCount ? " (" + pointer.evidenceCount + " pointer" + (pointer.evidenceCount === 1 ? "" : "s") + ")" : ""),
  ]);
  const decisionPackIssueResolutionRows: Array<[string, string]> = decisionPackVisibleIssueResolutionPointers.map((pointer): [string, string] => [
    pointer.label,
    pointer.value + (pointer.evidenceCount ? " (" + pointer.evidenceCount + " pointer" + (pointer.evidenceCount === 1 ? "" : "s") + ")" : ""),
  ]);
  const decisionPackPrivateReviewRows: Array<[string, string]> = decisionPackPrivateReview.map(
    (category): [string, string] => [category.label, category.decisionUse]
  );
  const decisionPackPrivateReviewDisplayRows: Array<[string, string]> = decisionPackPrivateReviewRows;
  const communityConnectionFinding =
    communityLabel && communityLabel !== "Not stated"
      ? `Supported: active community record in ${communityLabel}.`
      : "Missing: community anchor not shown.";
  const evidenceVolumeFinding = positiveNumber(communityActivityCountLabel)
    ? `Supported: ${communityActivityCountLabel} recorded community activit${
        communityActivityCountLabel === "1" ? "y" : "ies"
      }${knownAsCategoryLabel ? ` across ${knownAsCategoryLabel}` : ""}.`
    : "Missing: recorded community activity is not visible on this paper.";
  const roleFinding = holderRoleLabel && holderRoleLabel !== "Community member"
    ? `Supported: active role shown as ${holderRoleLabel}.`
    : "Shown: community member role only.";
  const activityCountNumber = positiveNumber(communityActivityCountLabel);
  const activityCategoryReading = knownAsCategoryLabel || "general community activity";
  const communityActivityMeaningLead = activityCountNumber > 0
    ? `${holderName} has repeated visible activity inside ${communityLabel || "the community"}${knownAsCategoryLabel ? ` across ${activityCategoryReading}` : ""}. This gives the reader a practical clue that the holder has been present, reachable, and active where people can know them.`
    : "This public TrustSlip does not yet show enough recorded activity for the reader to infer community participation.";
  const purposeSpecificActivityMeaning = !validNow
    ? "Because the paper is not current, the activity reading should not be used until the holder shares a fresh TrustSlip."
    : supportPurpose
      ? "For guarantor or support decisions, this supports community recognition and responsibility context only. It is not enough for financial guarantee without current witnesses and repayment or support outcome evidence."
      : employmentPurpose
        ? "For work or employment, this supports a basic conversation about consistency, participation, and reachability. It does not prove licence, right to work, or future performance."
        : housingPurpose
          ? "For housing, this supports a cautious inference that the holder can participate in a shared community and keep visible relationships. It does not prove rent history, property care, or legal tenancy checks."
          : tradePurpose
            ? "For trade or skilled work, this supports a low-risk check that the holder is visible in a community context. It does not prove licence, insurance, work quality, or home-safety outcomes."
            : "For community standing, this supports recognition, participation, and community presence. It remains evidence for judgement, not a final character ruling.";
  const communityActivityMeaningRows: Array<[string, string]> = [
    ["Observed activity", activityCountNumber > 0 ? `${communityActivityCountLabel} recorded activity event${communityActivityCountLabel === "1" ? "" : "s"}${knownAsCategoryLabel ? ` across ${activityCategoryReading}` : ""}.` : "No recorded activity count is visible on this paper."],
    ["Behavioural clue", activityCountNumber > 0 ? "Repeated community activity can support an inference of participation, communication, reachability, and ability to operate around other people." : "No behavioural inference should be made from activity until fresh evidence is shown."],
    ["For this decision", purposeSpecificActivityMeaning],
    ["Reader limit", "This is an inference from public-safe community activity, not proof of private conduct, legal status, payment ability, or future behaviour."],
  ];
  const visibleEvidenceAreaCount =
    decisionPackPositiveCategories.length +
    decisionPackVisibleDeclaredClaims.length +
    decisionPackVisibleRecordPointers.length +
    decisionPackVisibleHousingReferencePointers.length +
    decisionPackVisibleGuaranteeOutcomePointers.length +
    decisionPackVisibleFulfillmentOutcomePointers.length +
    decisionPackVisibleCompletedWorkPointers.length +
    decisionPackVisibleDemandRequestOutcomePointers.length +
    decisionPackVisibleConfirmationPointers.length +
    decisionPackVisibleIssueResolutionPointers.length;
  const decisionPackEvidenceSummaryRows: Array<[string, string]> = [
    ["Core public signal", activityCountNumber > 0 ? communityActivityMeaningLead : "The core activity signal is not visible yet."],
    ["Detailed public records", visibleEvidenceAreaCount > 0 ? `${visibleEvidenceAreaCount} detailed public-safe evidence area${visibleEvidenceAreaCount === 1 ? "" : "s"} shown in this Decision Pack.` : "No detailed public-safe category records are shown here; do not confuse absence of public detail with a complete negative judgement."],
    ["Fuller evidence", "Raw TrustEvents, private notes, contacts, payment records, addresses, and full evidence pages belong in Trust Passport or live community confirmation, not this public slip."],
  ];
  const decisionPackDetailTables: Array<{ title: string; rows: Array<[string, string]> }> = [
    { title: "Evidence categories", rows: decisionPackEvidenceRows },
    { title: "Declared work/service claim", rows: decisionPackDeclaredClaimRows },
    { title: "Connected record pointers", rows: decisionPackRecordPointerRows },
    { title: "Housing conduct readiness", rows: decisionPackHousingReferenceRows },
    { title: "Guarantee/support outcomes", rows: decisionPackGuaranteeOutcomeRows },
    { title: "Fulfilment/correction outcomes", rows: decisionPackFulfillmentOutcomeRows },
    { title: "Completed work/customer confirmation", rows: decisionPackCompletedWorkRows },
    { title: "Demand Box request outcomes", rows: decisionPackDemandRequestOutcomeRows },
    { title: "Community witness outcomes", rows: decisionPackConfirmationPointerRows },
    { title: "Issue resolution pointers", rows: decisionPackIssueResolutionRows },
    { title: "Private review needed", rows: decisionPackPrivateReviewDisplayRows },
  ].filter((table) => table.rows.length > 0);
  const decisionEvidenceBoundarySummary =
    "This public TrustSlip summarises public-safe evidence only. It does not expose raw TrustEvents, private notes, contacts, payment records, addresses, allegations, or the holder's full Trust Passport.";
  const relevantSupportFinding = supportPurpose
    ? hasSupportOutcomeEvidence
      ? `Visible: ${decisionPackGuaranteeOutcomeRows[0]?.[1] || "support outcome pointer found"}.`
      : "Missing: repayment or support outcome evidence is not yet available here."
    : visibleEvidenceAreaCount > 0
      ? `Visible: ${visibleEvidenceAreaCount} detailed public-safe evidence area${
          visibleEvidenceAreaCount === 1 ? "" : "s"
        }.`
      : activityCountNumber > 0
        ? "Visible: community activity meaning is the main public evidence; detailed category records are not shown here."
        : "Missing: purpose-specific evidence still needs confirmation.";
  const witnessCurrentnessFinding = hasWitnessEvidence
    ? `Visible: ${memberWitnessCurrentness}.`
    : positiveNumber(memberWitnessCountLabel) > 0
      ? "Warning: witnesses exist, but current confirmation still needs checking."
      : "Missing: no current member witness confirmation is visible.";
  const liveConfirmationFinding = communityRelayAvailable || communityPulseAvailable
    ? "Available: request live community confirmation before high-risk decisions."
    : "Missing: live community confirmation is not available from this paper yet.";
  const recommendedActionFinding = !validNow
    ? "Request a fresh TrustSlip before deciding."
    : supportPurpose
      ? "Request live community confirmation before any guarantor or support decision."
      : "Use for low-risk decisions; request live confirmation before important decisions.";
  const purposeSpecificPointerRows: Array<[string, string]> = (
    supportPurpose
      ? [
          ...decisionPackGuaranteeOutcomeRows,
          ...decisionPackEvidenceRows,
        ]
      : housingPurpose
        ? [
            ...decisionPackHousingReferenceRows,
            ...decisionPackEvidenceRows,
            ...decisionPackRecordPointerRows,
            ...decisionPackIssueResolutionRows,
          ]
        : employmentPurpose
          ? [
              ...decisionPackEvidenceRows,
              ...decisionPackCompletedWorkRows,
              ...decisionPackDeclaredClaimRows,
              ...decisionPackDemandRequestOutcomeRows,
              ...decisionPackConfirmationPointerRows,
            ]
          : tradePurpose
            ? [
                ...decisionPackFulfillmentOutcomeRows,
                ...decisionPackEvidenceRows,
                ...decisionPackCompletedWorkRows,
                ...decisionPackDeclaredClaimRows,
                ...decisionPackIssueResolutionRows,
              ]
            : [
                ...decisionPackConfirmationPointerRows,
                ...decisionPackEvidenceRows,
                ...decisionPackRecordPointerRows,
              ]
  )
    .filter(([, value]) => Boolean(safeText(value)))
    .slice(0, 3);
  const visibleSnapshotEvidenceRows: Array<[string, string]> = [];
  if (purposeSpecificPointerRows.length) {
    purposeSpecificPointerRows.forEach(([label, value]) => {
      visibleSnapshotEvidenceRows.push([`Visible: ${label}`, value]);
    });
  } else {
    visibleSnapshotEvidenceRows.push(["Visible public-safe evidence", relevantSupportFinding]);
  }
  const publicDecisionEvidenceSnapshotRows: Array<[string, string]> = [
    ["Question", firstTruthy(decisionPackProfile.recipientQuestion, decisionPackPurpose)],
  ];
  visibleSnapshotEvidenceRows.forEach((row) => {
    if (publicDecisionEvidenceSnapshotRows.length < 4) {
      publicDecisionEvidenceSnapshotRows.push(row);
    }
  });
  publicDecisionEvidenceSnapshotRows.push([
    "Still missing",
    firstTruthy(
      decisionPackProfileGaps[0]?.nextStep,
      witnessCurrentnessFinding,
      "Ask for live confirmation or the fuller Trust Passport before relying."
    ),
  ]);
  publicDecisionEvidenceSnapshotRows.push(["First safe next step", recommendedActionFinding]);
  const publicDecisionEvidenceSnapshotDisplayRows = compact
    ? publicDecisionEvidenceSnapshotRows.filter(([label], index) =>
        index === 0 ||
        index === 1 ||
        label === "First safe next step"
      )
    : publicDecisionEvidenceSnapshotRows;
  const decisionPackDefinition = findDecisionPack(decisionPackPurpose) || DEFAULT_DECISION_PACK;
  const purposeDecisionReading = buildDecisionPackDecisionReading(decisionPackDefinition, {
    holderName,
    communityName: communityLabel,
    verificationScopeLabel: requestedVerificationScopeLabel,
    currentVisibleEvidence: visibleBandReading,
    activityEvidence: communityActivityMeaningLead,
    witnessEvidence: witnessCurrentnessFinding,
    validNow,
  });
  const decisionDisplayAnswer = purposeDecisionReading.headline || decisionFirstAnswer;
  const decisionReasonLine = purposeDecisionReading.conclusion;
  const decisionBecauseRows: Array<[string, string]> = purposeDecisionReading.because
    .slice(0, compact ? 3 : 5)
    .map((reason, index): [string, string] => [`Because ${index + 1}`, reason]);
  const decisionTranslationRows: Array<[string, string]> = [
    ...decisionBecauseRows,
    ["Active Community ID", communityConnectionFinding],
    ["Recorded activity", evidenceVolumeFinding],
    ["Community role", roleFinding],
    [supportPurpose ? "Repayment/support evidence" : "Purpose evidence", relevantSupportFinding],
    ["Current witnesses", witnessCurrentnessFinding],
    ["Live confirmation", liveConfirmationFinding],
    ["Recommended action", recommendedActionFinding],
  ];
  const quickDecisionFacts = [
    ...decisionFirstFacts,
    {
      icon: "community-building" as Gsn3DIconKey,
      label: "Communities",
      title: activeCommunityCountLabel ? `${activeCommunityCountLabel} active` : "Not shown",
      text: evidenceScopeIsWider ? "Wider community context is included." : "Primary community evidence is shown.",
      tone: evidenceScopeIsWider || activeCommunityCountLabel ? "trust" as const : "neutral" as const,
    },
    {
      icon: "trust-shield" as Gsn3DIconKey,
      label: "Recommendation",
      title: validNow ? (supportPurpose ? "Live confirmation required" : "Use with caution") : "Fresh TrustSlip required",
      text: recommendedActionFinding,
      tone: validNow && !supportPurpose ? "trust" as const : "warning" as const,
    },
  ];
  const decisionMeaningGroups = [
    {
      title: "Strong",
      tone: "trust" as const,
      items: [
        communityLabel && communityLabel !== "Not stated" ? "Identity recognised" : "Identity still needs a clearer community anchor",
        communityLabel && communityLabel !== "Not stated" ? "Community recognised" : "Community not clearly shown",
        activityCountNumber > 0 ? "Activity recorded consistently" : "Activity record not visible yet",
      ],
    },
    {
      title: "Missing",
      tone: "warning" as const,
      items: [
        hasWitnessEvidence ? "Current witness evidence visible" : "Current witnesses",
        supportPurpose && !hasSupportOutcomeEvidence ? "Support or repayment follow-through" : "Purpose-specific confirmation",
        "High-risk approval evidence",
      ],
    },
    {
      title: "Therefore",
      tone: decisionFirstTone === "trust" ? "trust" as const : "warning" as const,
      items: [
        supportPurpose ? "Suitable for community recognition" : "Suitable for low-risk decisions",
        "Use live confirmation before high-risk decisions",
        "Final decision remains yours",
      ],
    },
  ];
  const decisionPackGapRows: Array<[string, string]> = (decisionPackProfileGaps.length
    ? decisionPackProfileGaps.map((gap): [string, string] => [gap.label, gap.nextStep])
    : [["No major gap shown", "Still match the evidence to your own decision risk."] as [string, string]]
  ).slice(0, 3);
  const decisionPackCheckRows: Array<[string, string]> = (decisionPackProfileChecks.length
    ? decisionPackProfileChecks.map((check, index): [string, string] => [`Check ${index + 1}`, check])
    : [["Live confirmation", decisionNextStep] as [string, string]]
  ).slice(0, 3);
  const liveConfirmationRouteRows: Array<[string, string]> = [
    [
      "Decision question",
      firstTruthy(
        decisionPackProfile.communityConfirmationPrompt.question,
        "Can current community witnesses confirm what they know about this member?"
      ),
    ],
    [
      "Who answers",
      firstTruthy(
        decisionPackProfile.communityConfirmationPrompt.responders,
        "Community admins, sponsors, nominated contacts, or current member witnesses allowed by the community policy."
      ),
    ],
    [
      "What counts",
      firstTruthy(
        decisionPackProfile.communityConfirmationPrompt.countsAs,
        "Aggregate community witness evidence about what the community genuinely knows."
      ),
    ],
    [
      "If there is concern",
      firstTruthy(
        decisionPackProfile.communityConfirmationPrompt.escalation,
        "Caution, dispute, or unable-to-confirm answers go to review or further evidence, not automatic judgement."
      ),
    ],
    [
      "Boundary",
      firstTruthy(
        decisionPackProfile.communityConfirmationPrompt.boundary,
        "Responses are community witness evidence only; they are not licences, guarantees, approvals, or final decisions."
      ),
    ],
  ];
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
      label: "Paper status",
      value: publicValidityLabel,
      tone: validNow ? "good" : "warn",
    },
    {
      label: "Can this be checked?",
      value: resolvedCode && verifyPath ? "Public code resolved" : "Limited",
      tone: resolvedCode && verifyPath ? "good" : "warn",
    },
    {
      label: "Evidence source",
      value: "Scoped evidence",
      tone: "info",
      detail: "Private passport stays protected.",
    },
    {
      label: "Check path",
      value: verifyUrl ? "Available" : "Unavailable",
      tone: verifyUrl ? "good" : "warn",
    },
    {
      label: "Use before",
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
    "Visible evidence strength and what the paper cannot prove",
    "Displayed holder and GSN ID from this paper",
    "Primary community label shown on this TrustSlip, with wider context only when active community count or consistency evidence is present",
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
        ["Evidence strength", visibleBandLabel || publicEvidencePosture],
        ["What this cannot prove", publicEvidencePosture],
        ["Risk limit", compactTrustLimit],
        ["Current status", publicValidityLabel],
      ],
    },
    {
      title: "Are witnesses up to date?",
      rows: [
        ["Community witnesses", memberWitnessEvidence],
        ["Witness update", memberWitnessRenewal],
        ["Witnesses valid until", memberWitnessValidity || "Not shown"],
        ["Next witness check", nextWitnessRenewalStatus],
      ],
    },
    {
      title: "Community evidence checked",
      rows: [
        ["Community record", communityRecordCurrentness],
        ["Community activity", communityActivityEvidence],
        ["Activity categories", communityActivityCategoriesLabel || "Not shown"],
        ["Latest activity", communityActivityLatest || "Not shown"],
      ],
    },
    {
      title: "Paper reference",
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
            gridTemplateColumns: compact ? "38px minmax(0, 1fr)" : "54px minmax(0, 1fr)",
            gap: compact ? 8 : 10,
            alignItems: "center",
            borderRight: compact ? "none" : "1px solid rgba(255,255,255,0.16)",
            borderBottom: compact ? "1px solid rgba(255,255,255,0.14)" : "none",
            paddingRight: compact ? 0 : 20,
            paddingBottom: compact ? 8 : 0,
            minWidth: 0,
          }}
        >
          <span
            aria-hidden
            style={{
              width: compact ? 38 : 54,
              height: compact ? 38 : 54,
              borderRadius: compact ? 10 : 12,
              border: "1px solid rgba(246,215,122,0.55)",
              color: "#F6D77A",
              display: "grid",
              placeItems: "center",
            }}
          >
            <GsnRealisticIcon
              name="trust-shield"
              size={compact ? 32 : 46}
              decorative
            />
          </span>
          <div
            style={{
              color: "#FFFFFF",
              fontSize: compact ? 10.5 : 17,
              lineHeight: 1.04,
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
              minHeight: compact ? 22 : 26,
              padding: compact ? "4px 9px" : "5px 12px",
              borderRadius: 8,
              background: "rgba(246,215,122,0.14)",
              color: "#F6D77A",
              fontSize: compact ? 10 : 12,
              fontWeight: 1000,
              textTransform: "uppercase",
            }}
          >
            Public Decision Pack
          </div>
          <h1
            style={{
              margin: compact ? "7px 0 0" : "12px 0 0",
              color: "#FFFFFF",
              fontSize: compact ? 28 : 58,
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
              margin: compact ? "6px 0 0" : "12px 0 0",
              maxWidth: 520,
              color: "#DCE8F4",
              fontSize: compact ? 12.5 : 20,
              lineHeight: compact ? 1.25 : 1.35,
              fontWeight: 760,
            }}
          >
            Public Decision Pack for a safer next decision.
          </p>
          <div
            style={{
              marginTop: compact ? 7 : 14,
              display: compact ? "none" : "flex",
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
        <div
          data-gsn-public-decision-first="one-answer-four-facts"
          style={{
            ...publicVerifyPanel(decisionFirstTone === "warning" ? "#FFF8E8" : "#F8FBFF", compact),
            border: decisionFirstTone === "warning"
              ? "1px solid rgba(245,158,11,0.28)"
              : "1px solid rgba(37,78,119,0.14)",
            display: "grid",
            gap: compact ? 9 : 12,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: compact ? "44px minmax(0, 1fr)" : "60px minmax(0, 1fr) auto",
              gap: compact ? 9 : 13,
              alignItems: "center",
            }}
          >
            <span
              aria-hidden
              style={{
                width: compact ? 44 : 56,
                height: compact ? 44 : 56,
                borderRadius: compact ? 12 : 16,
                display: "grid",
                placeItems: "center",
                background: "#FFFFFF",
                border: "1px solid rgba(214,170,69,0.30)",
                boxShadow: "0 8px 18px rgba(7,23,44,0.08)",
              }}
            >
              <GsnRealisticIcon
                name={decisionFirstTone === "warning" ? "vault-safe" : "community-building"}
                size={compact ? 34 : 48}
                decorative
              />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...sectionLabel(), color: decisionFirstTone === "warning" ? "#92400E" : "#0B63D1" }}>
                Decision First
              </div>
              <h2
                style={{
                  ...readableText(),
                  margin: "4px 0 0",
                  color: "#07172C",
                  fontSize: compact ? 24 : 34,
                  lineHeight: 1.02,
                  fontWeight: 1000,
                }}
              >
                {decisionDisplayAnswer}
              </h2>
              <div
                style={{
                  ...readableText(),
                  marginTop: 5,
                  color: "#334155",
                  fontSize: compact ? 12 : 13.5,
                  lineHeight: 1.28,
                  fontWeight: 850,
                }}
              >
                {decisionReasonLine}
              </div>
            </div>
            {!compact ? (
              <div style={paperStatusPill(publicValidityLabel)}>{publicValidityLabel}</div>
            ) : null}
          </div>

          <div
            data-gsn-public-evidence-translation="decision-why"
            style={{
              borderRadius: compact ? 12 : 16,
              border: "1px solid rgba(37,78,119,0.12)",
              background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,251,255,0.96) 100%)",
              padding: compact ? 7 : 12,
              display: "grid",
              gap: compact ? 7 : 9,
            }}
          >
            <div style={{ ...sectionLabel(), color: "#0B63D1" }}>Why this recommendation?</div>
            <DecisionFactorTable rows={compact ? decisionTranslationRows.filter(([label]) => label === "Because 1" || label === "Because 2") : decisionTranslationRows} compact={compact} />
            <div
              data-gsn-public-decision-evidence-snapshot="visible-public-safe-answers"
              style={{ display: "grid", gap: 7 }}
            >
              <div style={{ ...sectionLabel(), color: "#0B63D1" }}>
                Visible evidence for this decision
              </div>
              <DecisionFactorTable rows={publicDecisionEvidenceSnapshotDisplayRows} compact={compact} />
            </div>
          </div>
          <div
            data-gsn-public-decision-first-facts="four-quick-facts"
            style={{
              display: compact ? "none" : "grid",
              gridTemplateColumns: compact ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(126px, 1fr))",
              gap: compact ? 6 : 8,
            }}
          >
            <div style={{ gridColumn: "1 / -1", ...sectionLabel(), color: "#0B63D1" }}>Quick Decision</div>
            {quickDecisionFacts.map((fact) => (
              <PublicReadingTile
                key={fact.label}
                icon={fact.icon}
                label={fact.label}
                title={fact.title}
                text={fact.text}
                compact={compact}
                tone={fact.tone}
              />
            ))}
          </div>

        {compact ? (
          <TrustDocumentDisclosureSection
            title="Full evidence and record details"
            summary="Open for core reading, decision summary, live code checks, and the fuller evidence pack."
          >
            <div
              data-gsn-public-mobile-full-evidence="collapsed-summary"
              style={{ display: "grid", gap: 10 }}
            >
              <OfficialResultTable
                title="Core evidence reading"
                rows={communityActivityMeaningRows}
                compact={compact}
              />
              <OfficialResultTable
                title="Decision evidence summary"
                rows={decisionPackEvidenceSummaryRows}
                compact={compact}
              />
              <OfficialResultTable
                title="Live record checks"
                rows={recordTrustReasonTiles.map((item): [string, string] => [item.label, `${item.title}. ${item.text}`])}
                compact={compact}
              />
            </div>
          </TrustDocumentDisclosureSection>
        ) : null}

          <div
            data-gsn-public-decision-support="meaning-next-action"
            data-gsn-public-reader-confirmation-options="membership-community-witness"
            style={{
              display: "grid",
              gridTemplateColumns: compact ? "1fr" : "minmax(0, 1.05fr) minmax(300px, 0.95fr)",
              gap: 10,
              alignItems: "stretch",
            }}
          >
            <div
              style={{
                borderRadius: compact ? 12 : 16,
                border: "1px solid rgba(37,78,119,0.12)",
                background: "#FFFFFF",
                padding: compact ? 10 : 12,
                display: compact ? "none" : "grid",
                gap: 9,
              }}
            >
              <div style={{ ...sectionLabel(), color: "#0B63D1" }}>What this means</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                {decisionMeaningGroups.map((group) => (
                  <div
                    key={group.title}
                    style={{
                      borderRadius: 14,
                      border: group.tone === "trust" ? "1px solid rgba(46,155,98,0.18)" : "1px solid rgba(245,158,11,0.22)",
                      background: group.tone === "trust" ? "#EEF9F1" : "#FFF8E8",
                      padding: "10px 11px",
                      minWidth: 0,
                    }}
                  >
                    <div style={{ color: group.tone === "trust" ? "#166534" : "#92400E", fontSize: 12, fontWeight: 1000 }}>
                      {group.title}
                    </div>
                    <ul style={{ margin: "7px 0 0", paddingLeft: 16, color: "#334155", fontSize: 11.5, fontWeight: 820, lineHeight: 1.42 }}>
                      {group.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                borderRadius: compact ? 12 : 16,
                border: "1px solid rgba(37,78,119,0.12)",
                background: "#F8FBFF",
                padding: compact ? 10 : 12,
                display: "grid",
                gap: compact ? 8 : 10,
                alignContent: "start",
              }}
            >
              <div style={{ ...sectionLabel(), color: "#0B63D1" }}>Next recommended action</div>
              <div style={{ display: "grid", gridTemplateColumns: compact ? "38px minmax(0, 1fr)" : "44px minmax(0, 1fr)", gap: compact ? 8 : 10, alignItems: "start" }}>
                {paperIconBadge("community-building", validNow ? "neutral" : "warning", compact ? 36 : 42)}
                <div style={{ minWidth: 0 }}>
                  <div style={{ ...readableText(), color: "#07172C", fontSize: compact ? 16 : 18, fontWeight: 1000, lineHeight: 1.12 }}>
                    Choose what to confirm next
                  </div>
                  <p style={{ ...readableText(), margin: "5px 0 0", color: "#526579", fontSize: compact ? 12 : 12.5, fontWeight: 820, lineHeight: 1.36 }}>
                    {readerConfirmationIntro}
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: compact ? "1fr" : "repeat(3, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                <div style={documentMetaCard("#FFFFFF")}>
                  <div style={{ color: "#07172C", fontSize: compact ? 13 : 14, fontWeight: 1000 }}>
                    Confirm membership
                  </div>
                  <p style={{ margin: "5px 0 8px", color: "#64748B", fontSize: 11.5, fontWeight: 820, lineHeight: 1.34 }}>
                    {membershipConfirmationNote}
                  </p>
                  {memberCredentialPath ? (
                    <StableCtaLink
                      to={memberCredentialPath}
                      kind="soft"
                      stableHeight={44}
                      debugId="trust-slip-verify.public.confirm-membership-first-view"
                      style={{ width: "100%", borderRadius: 11, fontWeight: 1000 }}
                    >
                      Open credential
                    </StableCtaLink>
                  ) : (
                    <SubtleButton
                      type="button"
                      debugId="trust-slip-verify.public.confirm-membership-unavailable"
                      disabled
                      fullWidth
                      stableHeight={44}
                      style={{ borderRadius: 11 }}
                    >
                      Not available
                    </SubtleButton>
                  )}
                </div>

                <div style={documentMetaCard("#FFFFFF")}>
                  <div style={{ color: "#07172C", fontSize: compact ? 13 : 14, fontWeight: 1000 }}>
                    Ask community
                  </div>
                  <p style={{ margin: "5px 0 8px", color: "#64748B", fontSize: 11.5, fontWeight: 820, lineHeight: 1.34 }}>
                    {communityConfirmationNote}
                  </p>
                  <PrimaryButton
                    debugId="trust-slip-verify.public.request-confirmation-first-view"
                    stableHeight={44}
                    busy={confirmationBusy}
                    busyLabel="Requesting..."
                    disabled={Boolean(requestLockedReason) || !canRequestCommunityPulse}
                    onClick={() => onRequestCommunityPulse()}
                    fullWidth
                    style={{ justifyContent: "center", borderRadius: 11 }}
                  >
                    Request now
                  </PrimaryButton>
                </div>

                <div style={documentMetaCard("#FFFFFF")}>
                  <div style={{ color: "#07172C", fontSize: compact ? 13 : 14, fontWeight: 1000 }}>
                    Review witnesses
                  </div>
                  <p style={{ margin: "5px 0 8px", color: "#64748B", fontSize: 11.5, fontWeight: 820, lineHeight: 1.34 }}>
                    {witnessEvidenceNote}
                  </p>
                  <SubtleButton
                    type="button"
                    debugId="trust-slip-verify.public.review-witness-evidence-first-view"
                    stableHeight={44}
                    fullWidth
                    onClick={reviewPublicEvidence}
                    style={{ borderRadius: 11 }}
                  >
                    Read evidence
                  </SubtleButton>
                </div>
              </div>
            </div>
          </div>
          <div
            data-gsn-public-decision-boundary="compact"
            style={{
              borderRadius: compact ? 12 : 16,
              border: "1px solid rgba(214,170,69,0.28)",
              background: "#FFFDF7",
              padding: compact ? 9 : 11,
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ ...sectionLabel(), color: "#7A4A00" }}>Decision Boundary</div>
            {compact ? (
              <div
                style={{
                  ...readableText(),
                  color: "#07172C",
                  fontSize: 12.2,
                  fontWeight: 900,
                  lineHeight: 1.32,
                }}
              >
                GSN checked {evidenceScopeIsWider ? "primary and wider community signals" : "the primary community signal"}; it is not a guarantee, government ID, credit approval, or final decision.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                  gap: 6,
                }}
              >
                {decisionBoundaryRows.map(([label, value]) => (
                  <div key={label} style={{ minWidth: 0 }}>
                    <div style={{ color: "#5F4100", fontSize: 10.5, fontWeight: 1000, lineHeight: 1.18 }}>
                      {label}
                    </div>
                    <div style={{ marginTop: 2, color: "#07172C", fontSize: 12, fontWeight: 930, lineHeight: 1.28 }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <TrustDocumentDisclosureSection
          title={decisionPackPurpose}
          summary="Open for evidence sources, gaps, checks, and evidence boundaries."
          defaultOpen={!compact}
        >
        <div
          data-debug-id="trust-slip-verify.public.decision-pack-reading"
          style={{
            ...publicVerifyPanel("#F8FBFF", compact),
            display: "grid",
            gap: compact ? 9 : 12,
          }}
        >
          <div>
            <div style={{ ...sectionLabel(), color: "#0B63D1" }}>
              Decision Pack reading
            </div>
            <h2
              style={{
                ...readableText(),
                margin: "5px 0 0",
                color: "#07172C",
                fontSize: compact ? 18 : 24,
                lineHeight: 1.12,
                fontWeight: 1000,
              }}
            >
              What does the community activity mean?
            </h2>
            <p
              style={{
                ...readableText(),
                margin: "7px 0 0",
                color: "#334155",
                fontSize: compact ? 12.5 : 14,
                lineHeight: 1.45,
                fontWeight: 850,
              }}
            >
              GSN reads the public-safe community activity first. Security checks prove the paper can be checked; this section explains what the holder's visible activity can and cannot support.
            </p>
          </div>
          <OfficialResultTable
            title="Core evidence reading"
            rows={communityActivityMeaningRows}
            compact={compact}
          />
          <OfficialResultTable
            title="Decision evidence summary"
            rows={decisionPackEvidenceSummaryRows}
            compact={compact}
          />
          <TrustDocumentDisclosureSection
            title="Decision evidence details"
            summary="Open for evidence sources, categories, gaps, checks, and evidence boundaries."
          >
            <div
              data-gsn-decision-pack-profile="public-purpose-filter"
            style={{
              borderRadius: compact ? 12 : 16,
              border: "1px solid rgba(37,78,119,0.12)",
              background: "#FFFFFF",
              padding: compact ? 10 : 13,
              display: "grid",
              gap: compact ? 8 : 10,
            }}
          >
            <div>
              <div style={{ ...sectionLabel(), color: "#0B63D1" }}>
                Evidence source map
              </div>
              <div
                style={{
                  ...readableText(),
                  marginTop: 3,
                  color: "#07172C",
                  fontSize: compact ? 14 : 16,
                  fontWeight: 1000,
                  lineHeight: 1.2,
                }}
              >
                Where can GSN point for this decision?
              </div>
              <p
                style={{
                  ...readableText(),
                  margin: "5px 0 0",
                  color: "#526579",
                  fontSize: compact ? 11 : 12,
                  fontWeight: 820,
                  lineHeight: 1.35,
                }}
              >
                {decisionPackProfile.basisNote}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: compact ? "1fr" : "repeat(2, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              {decisionPackProfileSignals.map((signal) => (
                <div
                  key={`${signal.key}-${signal.label}`}
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(37,78,119,0.10)",
                    background: signal.status === "available" ? "#F4FBF7" : "#FFF9EB",
                    padding: compact ? "8px 9px" : "9px 10px",
                    minWidth: 0,
                  }}
                >
                  <div style={{ ...sectionLabel(), fontSize: compact ? 9 : 10 }}>
                    {signal.label}
                  </div>
                  <div
                    style={{
                      ...readableText(),
                      marginTop: 3,
                      color: "#07172C",
                      fontSize: compact ? 11.5 : 12.5,
                      fontWeight: 950,
                      lineHeight: 1.25,
                    }}
                  >
                    {signal.value}
                  </div>
                </div>
              ))}
            </div>

            <OfficialResultTable
              title="Evidence footprint"
              rows={decisionPackEvidenceScopeRows}
              compact={compact}
            />

            <div
              data-gsn-decision-pack-evidence-extract="redacted-trust-events"
              style={{
                display: "grid",
                gridTemplateColumns: compact ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)",
                gap: 8,
              }}
            >
              {decisionPackDetailTables.map((table) => (
                <OfficialResultTable
                  key={table.title}
                  title={table.title}
                  rows={table.rows}
                  compact={compact}
                />
              ))}
            </div>

            {decisionPackProfileGaps.length || decisionPackProfileChecks.length ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: compact ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)",
                  gap: 8,
                }}
              >
                <OfficialResultTable
                  title="Gaps to check"
                  rows={decisionPackGapRows}
                  compact={compact}
                />
                <OfficialResultTable
                  title="Recommended checks"
                  rows={decisionPackCheckRows}
                  compact={compact}
                />
              </div>
            ) : null}

            <div
              style={{
                color: "#5F4100",
                fontSize: compact ? 10.5 : 11.5,
                fontWeight: 850,
                lineHeight: 1.35,
              }}
            >
              {decisionEvidenceBoundarySummary}
            </div>
          </div>
        </TrustDocumentDisclosureSection>
        </div>

        </TrustDocumentDisclosureSection>

        <TrustDocumentDisclosureSection
          title="Audit Details"
          summary="Open for technical record checks, community evidence, security, and limits."
        >
          <div
            data-gsn-public-more-details="authority-evidence-limits"
            style={{ display: "grid", gap: 12 }}
          >
            <TrustPaperAuthorityStrip
              title="GSN TrustSlip Verification Paper"
              reference={resolvedCode || verifyPath || "TrustSlip verify record"}
              generatedAt={issuedAtLabel || undefined}
              classification={validNow ? "Current public evidence" : "Caution public evidence"}
              compact={compact}
            />

            <TrustDocumentConfidenceRibbon items={trustSlipConfidenceRibbonItems} />

            <CommunityProofPanel
              title="Community evidence checked"
              subtitle="This panel shows the TrustSlip primary community anchor. Use aggregate/wider readings separately where they are shown."
              compact={compact}
              communityName={communityLabel}
              holderRole={holderRole}
              identityLabel={validNow ? "TrustSlip currently valid" : publicValidityLabel}
              memberWitnessCount={memberWitnessCount}
              membershipStrengthLabel={membershipStrengthLabel}
              membershipCurrentnessLabel={membershipCurrentnessLabel}
              membershipCurrentnessScope={membershipCurrentnessScope}
              nextWitnessRenewalStatusLabel={nextWitnessRenewalStatusLabel}
              communityActivityCount={communityActivityCount}
              communityActivityLabel={communityActivityLabel}
              communityActivityCategories={communityActivityCategories}
              trustSlipStatusLabel={publicValidityLabel}
            />

            <TrustDocumentDisclosureSection
              title="What this cannot prove"
              summary="Open for what this paper confirms, what it cannot prove, security, and record reference."
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
                  title="Can this be checked?"
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
          </div>
        </TrustDocumentDisclosureSection>

        <TrustDocumentDisclosureSection
          title="Verification paper details"
          summary="Open for holder, public reading, community evidence, QR, and confirmation request."
          defaultOpen={!compact}
        >
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
                id="trust-slip-verify-community-known-as"
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
                    gridTemplateColumns: compact ? "1fr" : "repeat(4, minmax(0, 1fr))",
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
                  gridTemplateColumns: compact ? "1fr" : "1fr 1fr",
                  gap: 8,
                }}
              >
                <div style={statTile("#FFFFFF")}>
                  <div style={sectionLabel()}>Community confidence</div>
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
                  <div style={sectionLabel()}>What this cannot prove</div>
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
                  <div style={sectionLabel()}>Risk limit</div>
                  <div style={{ ...readableText(), marginTop: 6, color: "#07172C", fontSize: compact ? 17 : 18, fontWeight: 1000 }}>
                    {compactTrustLimit}
                  </div>
                </div>
                <div style={statTile("#FFFFFF")}>
                  <div style={sectionLabel()}>Current status</div>
                  <div style={{ ...readableText(), marginTop: 6, color: "#07172C", fontSize: 13, fontWeight: 950 }}>
                    {issuedAtLabel} issued
                  </div>
                  <div style={{ ...readableText(), color: "#07172C", fontSize: 13, fontWeight: 950 }}>
                    {expiresAtLabel} expires
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 92px", gap: 10 }}>
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
                    gridTemplateColumns: compact ? "1fr" : "repeat(4, minmax(0, 1fr))",
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
                      Witness update note
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
                      {`Are witnesses up to date? ${memberWitnessCurrentnessScope}`}
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
                    <OfficialResultTable
                      title="Live confirmation route"
                      rows={liveConfirmationRouteRows}
                      compact={compact}
                    />
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
                        Choose confirmation community
                      </div>
                      <p style={{ margin: "6px 0 0", color: "#64748B", fontWeight: 850, lineHeight: 1.4 }}>
                        Select the community that should answer this verification. The result link is the evidence source; SMS or WhatsApp only sends a notice back.
                      </p>
                    </div>

                    {selectableConfirmationCommunities.length > 1 ? (
                      <label
                        data-gsn-confirmation-community-selector="true"
                        style={{ display: "grid", gap: 6 }}
                      >
                        <span style={fieldLabel()}>Which community should answer?</span>
                        <select
                          value={selectedConfirmationCommunityId}
                          onChange={(event) =>
                            onConfirmationCommunityChange?.(event.target.value)
                          }
                          style={selectInput(compact)}
                        >
                          {selectableConfirmationCommunities.map((item) => {
                            const optionId = firstTruthy(item.community_id, item.clan_id);
                            const optionName = firstTruthy(item.community_name, `Community ${optionId}`);
                            const optionCode = firstTruthy(item.community_code);
                            const optionRole = firstTruthy(item.holder_role, item.role, "member");
                            return (
                              <option key={optionId} value={optionId}>
                                {optionName}{optionCode ? ` - ${optionCode}` : ""} ({optionRole})
                              </option>
                            );
                          })}
                        </select>
                        <p style={{ margin: 0, color: "#64748B", fontSize: 12.5, fontWeight: 850, lineHeight: 1.45 }}>
                          Choose the community that matches this decision. The response will be scoped to that community.
                        </p>
                      </label>
                    ) : selectedConfirmationCommunity ? (
                      <div
                        data-gsn-confirmation-community-selector="single"
                        style={{ ...documentMetaCard("#FFFFFF"), display: "grid", gap: 4 }}
                      >
                        <span style={fieldLabel()}>Which community should answer?</span>
                        <strong style={{ color: "#07172C", fontSize: 15 }}>
                          {firstTruthy(selectedConfirmationCommunity.community_name, communityLabel)}
                        </strong>
                      </div>
                    ) : null}

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
                        confirmationCommunityId: selectedConfirmationCommunityId,
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
        </TrustDocumentDisclosureSection>
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
            decision evidence first, private details protected, the recipient decides with the record in front of them.
          </div>
        </div>
        {!compact ? <GsnRealisticIcon name="public-globe" size={66} decorative /> : null}
      </footer>
    </section>
  );
}
