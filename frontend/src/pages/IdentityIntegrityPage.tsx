import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NextActionGuide from "../components/NextActionGuide";
import PageTopNav from "../components/PageTopNav";
import {
  CardActionRow,
  PrimaryButton,
  SecondaryButton,
  StableCtaLink,
  SubtleButton,
} from "../components/StableButton";
import TrustDocumentActionGuide from "../components/TrustDocumentActionGuide";
import TrustDocumentFamilyMap from "../components/TrustDocumentFamilyMap";
import TrustDocumentUseCases from "../components/TrustDocumentUseCases";
import {
  getCurrentClan,
  getMe,
  getMyIdentityRecovery,
  getMyIdentityRisk,
  getMyTrustSlip,
  getSelectedClanId,
  getTrustWhyMe,
  listTrustEvents,
  confirmSignedInPhoneVerification,
  recordSignedInIdentityPhoto,
  recordSignedInOfficialId,
  safeCopy,
  setupIdentityRecovery,
  startSignedInPhoneVerification,
  verifyIdentityRecovery,
} from "../lib/api";
import {
  buildGuidanceSnapshot,
  type GuidanceSnapshot,
} from "../lib/guidance";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import { navigateWithOrigin } from "../lib/nav";
import { buildIdentityActionGuide } from "../lib/trustDocumentActionGuide";
import { buildTrustDocumentFamilyItems } from "../lib/trustDocumentFamilyMap";
import { buildTrustDocumentUseCaseItems } from "../lib/trustDocumentUseCases";
import { buildIdentityIntegrityGuideItems } from "../lib/trustDocumentGuide";
import { buildIdentityIntegritySnapshot } from "../lib/trustDocumentSnapshots";
import {
  getTrustBandLanguage,
  getTrustBandShortLabel,
  normalizeTrustBand,
} from "../lib/trustBandLanguage";
import { resolveProfileImageUrl } from "../lib/profileImage";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";

type TrustEventRow = {
  id?: number | string;
  title?: string | null;
  message?: string | null;
  detail?: string | null;
  description?: string | null;
  kind?: string | null;
  type?: string | null;
  event_type?: string | null;
  created_at?: string | null;
};

type TrustSlipRecord = {
  id?: number;
  code?: string | null;
  status?: string | null;
  phone_recorded?: boolean | null;
  phone_verified?: boolean | null;
  bank_details_recorded?: boolean | null;
  bank_verified?: boolean | null;
  official_id_recorded?: boolean | null;
  official_id_verified?: boolean | null;
  photo_recorded?: boolean | null;
  profile_image_url?: string | null;
  identity_context?: Record<string, any> | null;
  trust_band?: string | null;
  trust_class?: string | null;
  trust_score?: string | number | null;
  open_trust_band?: string | null;
  open_trust_class?: string | null;
  open_trust_score?: string | number | null;
  community_trust_band?: string | null;
  community_trust_class?: string | null;
  community_trust_score?: string | number | null;
  issued_at?: string | null;
  expires_at?: string | null;
  holder_name?: string | null;
  gmfn_id?: string | null;
};

type ReadingState = {
  classText: string;
  scoreText: string;
  tone: "green" | "yellow" | "red" | "neutral";
  statusText: string;
  whyText: string;
};

type NoticeTone = "success" | "error";
type PhoneTaskTone = "success" | "error";

type CollapseState = {
  summary: boolean;
  continuity: boolean;
  recovery: boolean;
  reasons: boolean;
  timeline: boolean;
  next: boolean;
};

type IdentityTaskKey = "phone" | "community" | "bank" | "official_id" | "recovery";

const IDENTITY_TASK_KEYS: IdentityTaskKey[] = [
  "phone",
  "community",
  "bank",
  "official_id",
  "recovery",
];

type IdentityExplainers = {
  helps: string[];
  weakens: string[];
  next: string[];
};

type IdentityRiskSummary = {
  device_count?: number;
  signal_count?: number;
  cluster_count?: number;
  continuity?: {
    status?: string;
    score?: number;
    reason?: string;
    action?: string;
  };
};

type IdentityRecoverySummary = {
  configured?: boolean;
  prompts?: string[];
  last_verified_at?: string | null;
  failed_attempts?: number;
  locked_until?: string | null;
  locked?: boolean;
};

const IDENTITY_PAGE_UI_STORAGE_KEY = "gmfn.identityPage.sections.v2";

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function parsePhoneTaskError(err: any): string {
  const raw = safeStr(err?.message || err);
  if (!raw) return "Phone verification could not start.";

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const message = firstTruthy(parsed.message, parsed.detail, parsed.title);
      const why = firstTruthy(parsed.why_it_matters, parsed.why);
      const firstStep = firstTruthy(parsed.first_step, parsed.next_step);
      return [message, why ? `Why it matters: ${why}` : "", firstStep ? `First step: ${firstStep}` : ""]
        .filter(Boolean)
        .join(" ");
    }
  } catch {
    // Plain backend errors are already user-facing enough to show directly.
  }

  return raw;
}

function firstNumberLike(...values: any[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || String(value).trim() === "") {
      continue;
    }
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function positiveNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function rowsOf<T = any>(input: any): T[] {
  if (Array.isArray(input)) return input as T[];
  if (Array.isArray(input?.items)) return input.items as T[];
  if (Array.isArray(input?.data?.items)) return input.data.items as T[];
  if (Array.isArray(input?.results)) return input.results as T[];
  if (Array.isArray(input?.rows)) return input.rows as T[];
  return [];
}

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 20,
    boxShadow:
      "0 14px 34px rgba(15,23,42,0.045), 0 2px 8px rgba(15,23,42,0.02)",
    overflow: "hidden",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 14,
  };
}

function statTile(
  bg = "#FFFFFF",
  border = "1px solid rgba(11,31,51,0.08)"
): React.CSSProperties {
  return {
    borderRadius: 16,
    border,
    background: bg,
    padding: 14,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#5D7389",
    fontWeight: 900,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    background: primary ? "rgba(11,99,209,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#0B63D1" : "#51657A",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
  };
}

function collapseToggle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 auto",
    boxSizing: "border-box",
    minHeight: 38,
    minWidth: 94,
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: "#24415C",
    fontWeight: 800,
    fontSize: 13,
    lineHeight: 1.1,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#5F7287",
    fontSize: 14,
    lineHeight: 1.75,
  };
}

function compactHelperText(): React.CSSProperties {
  return {
    color: "#617085",
    fontSize: 13,
    lineHeight: 1.35,
  };
}

function iconTile(
  color = "#FFFFFF",
  bg = "linear-gradient(180deg, #0B3E78 0%, #061827 100%)"
): React.CSSProperties {
  return {
    width: 46,
    height: 46,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    flex: "0 0 auto",
    color,
    background: bg,
    border: "1px solid rgba(7,23,44,0.18)",
    boxShadow:
      "0 12px 22px rgba(6,24,39,0.16), inset 0 1px 0 rgba(255,255,255,0.16)",
  };
}

function identityIconTone(tone: "ready" | "pending" | "watch" | "neutral"): {
  color: string;
  bg: string;
} {
  if (tone === "ready") {
    return {
      color: "#FFFFFF",
      bg: "linear-gradient(180deg, #168457 0%, #064E3B 100%)",
    };
  }

  if (tone === "pending") {
    return {
      color: "#3B2504",
      bg: "linear-gradient(180deg, #F8D56B 0%, #D6AA45 100%)",
    };
  }

  if (tone === "neutral") {
    return {
      color: "#FFFFFF",
      bg: "linear-gradient(180deg, #334155 0%, #0F172A 100%)",
    };
  }

  return {
    color: "#FFFFFF",
    bg: "linear-gradient(180deg, #0B63D1 0%, #073E83 100%)",
  };
}

function taskIconBadge(active: boolean, tone: "ready" | "pending" | "watch" | "neutral"): React.CSSProperties {
  const iconTone = identityIconTone(tone);
  return {
    width: 34,
    height: 34,
    borderRadius: 13,
    display: "grid",
    placeItems: "center",
    flex: "0 0 auto",
    color: iconTone.color,
    background: iconTone.bg,
    border: active
      ? "1px solid rgba(7,23,44,0.20)"
      : "1px solid rgba(37,78,119,0.12)",
    boxShadow: active
      ? "0 10px 18px rgba(7,23,44,0.16), inset 0 1px 0 rgba(255,255,255,0.18)"
      : "inset 0 1px 0 rgba(255,255,255,0.14)",
    overflow: "hidden",
    transform: "none",
    transition: "none",
  };
}

function compactStatusChip(tone: "ready" | "pending" | "watch" | "neutral"): React.CSSProperties {
  const styles = {
    ready: { color: "#166534", bg: "#F0FDF4", border: "rgba(34,197,94,0.18)" },
    pending: { color: "#92400E", bg: "#FFF7ED", border: "rgba(245,158,11,0.20)" },
    watch: { color: "#0B63D1", bg: "#EEF6FF", border: "rgba(11,99,209,0.18)" },
    neutral: { color: "#334155", bg: "#F8FAFC", border: "rgba(148,163,184,0.18)" },
  }[tone];

  return {
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    color: styles.color,
    background: styles.bg,
    border: `1px solid ${styles.border}`,
    fontSize: 12,
    fontWeight: 1000,
    whiteSpace: "nowrap",
  };
}

function compactFactCard(): React.CSSProperties {
  return {
    minHeight: 78,
    borderRadius: 16,
    border: "1px solid rgba(37,78,119,0.12)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)",
    padding: 10,
    display: "grid",
    gridTemplateColumns: "46px minmax(0, 1fr)",
    gap: 10,
    alignItems: "center",
    boxShadow: "0 10px 24px rgba(7,23,44,0.045)",
  };
}

function identityCopyActionStyle(
  ready: boolean,
  tone: "primary" | "secondary" | "subtle"
): React.CSSProperties {
  const primary = tone === "primary";
  const subtle = tone === "subtle";
  return {
    justifyContent: "flex-start",
    gap: 10,
    borderRadius: 16,
    paddingInline: 10,
    border: ready
      ? primary
        ? "1px solid rgba(11,99,209,0.34)"
        : "1px solid rgba(37,78,119,0.16)"
      : "1px solid rgba(148,163,184,0.28)",
    background: ready
      ? primary
        ? "linear-gradient(180deg, #0B63D1 0%, #073E83 100%)"
        : "linear-gradient(180deg, #FFFFFF 0%, #EEF6FF 100%)"
      : "linear-gradient(180deg, #F8FAFC 0%, #EEF2F7 100%)",
    color: ready ? (primary ? "#FFFFFF" : "#07172C") : "#475569",
    boxShadow: ready
      ? primary
        ? "0 14px 26px rgba(11,99,209,0.18), inset 0 1px 0 rgba(255,255,255,0.18)"
        : "0 10px 22px rgba(7,23,44,0.08), inset 0 1px 0 rgba(255,255,255,0.84)"
      : "inset 0 1px 0 rgba(255,255,255,0.72)",
    opacity: 1,
    cursor: ready || subtle ? "pointer" : "not-allowed",
  };
}

function identityCopyIconBox(ready: boolean, active: boolean): React.CSSProperties {
  return {
    width: 36,
    height: 36,
    borderRadius: 13,
    display: "grid",
    placeItems: "center",
    flex: "0 0 auto",
    color: active ? "#FFFFFF" : ready ? "#0B63D1" : "#64748B",
    background: active
      ? "rgba(255,255,255,0.16)"
      : ready
        ? "linear-gradient(180deg, #EEF6FF 0%, #FFFFFF 100%)"
        : "linear-gradient(180deg, #FFFFFF 0%, #E2E8F0 100%)",
    border: active ? "1px solid rgba(255,255,255,0.22)" : "1px solid rgba(123,161,204,0.22)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.72)",
  };
}

function identityTaskButtonStyle(): React.CSSProperties {
  return {
    boxSizing: "border-box",
    height: 52,
    minHeight: 52,
    maxHeight: 52,
    minWidth: 0,
    width: "100%",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    lineHeight: 1.05,
    flexShrink: 0,
    overflowAnchor: "none",
    transform: "none",
    transition: "none",
  };
}

function identityCompletionFieldStyle(): React.CSSProperties {
  return {
    width: "100%",
    height: 52,
    minHeight: 52,
    maxHeight: 52,
    boxSizing: "border-box",
    borderRadius: 13,
    border: "1px solid rgba(37,78,119,0.16)",
    padding: "0 12px",
    color: "#07172C",
    fontWeight: 900,
    fontSize: 14,
    background: "#FFFFFF",
    overflowAnchor: "none",
    transform: "none",
    transition: "none",
  };
}

function identityPanelLock(): React.CSSProperties {
  return {
    boxSizing: "border-box",
    minWidth: 0,
    overflow: "hidden",
    overflowAnchor: "none",
    transform: "none",
    transition: "none",
  };
}

function identityResponseSlotStyle(
  tone: "success" | "error",
  compact: boolean,
  visible: boolean
): React.CSSProperties {
  return {
    ...identityPanelLock(),
    height: compact ? 106 : 74,
    minHeight: compact ? 106 : 74,
    maxHeight: compact ? 106 : 74,
    borderRadius: 13,
    border:
      tone === "error"
        ? "1px solid rgba(200,58,58,0.20)"
        : "1px solid rgba(46,155,98,0.18)",
    background: tone === "error" ? "#FFF5F5" : "#F3FBF5",
    color: tone === "error" ? "#991B1B" : "#166534",
    fontSize: 12,
    fontWeight: 950,
    lineHeight: 1.35,
    padding: "8px 10px",
    visibility: visible ? "visible" : "hidden",
    overflowY: "auto",
  };
}

function identityRecoveryPanel(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(37,78,119,0.14)",
    background: bg,
    padding: 14,
    boxShadow:
      "0 12px 24px rgba(7,23,44,0.055), inset 0 1px 0 rgba(255,255,255,0.82)",
    overflow: "hidden",
  };
}

function identityRecoveryInput(): React.CSSProperties {
  return {
    width: "100%",
    marginTop: 10,
    padding: "13px 14px",
    borderRadius: 14,
    border: "1px solid rgba(37,78,119,0.18)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)",
    color: "#07172C",
    fontWeight: 800,
    fontSize: 14,
    boxSizing: "border-box",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.82)",
    outlineColor: "#0B63D1",
  };
}

function identityRecoveryActionStyle(): React.CSSProperties {
  return {
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    border: "1px solid rgba(3,30,66,0.24)",
    background: "linear-gradient(180deg, #0B63D1 0%, #073E83 45%, #031E42 100%)",
    color: "#FFFFFF",
    boxShadow:
      "0 16px 30px rgba(11,99,209,0.22), inset 0 1px 0 rgba(255,255,255,0.20)",
    opacity: 1,
  };
}

function sectionIconHeader(
  icon: GsnIconName,
  title: string,
  detail: string,
  right?: React.ReactNode
) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: right
          ? "46px minmax(0, 1fr)"
          : "46px minmax(0, 1fr)",
        gap: 12,
        alignItems: "center",
      }}
    >
      <span style={iconTile()}>
        <GsnLegacyIcon name={icon} size={36} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={sectionLabel()}>{title}</span>
        <span style={{ display: "block", marginTop: 5, ...compactHelperText() }}>
          {detail}
        </span>
      </span>
      {right ? (
        <span
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "flex-start",
            alignItems: "center",
            gap: 10,
            paddingTop: 2,
          }}
        >
          {right}
        </span>
      ) : null}
    </div>
  );
}

function noticeCard(tone: NoticeTone): React.CSSProperties {
  return {
    ...softCard(tone === "success" ? "#F3FBF5" : "#FEF2F2"),
    color: tone === "success" ? "#166534" : "#991B1B",
    border:
      tone === "success"
        ? "1px solid rgba(34,197,94,0.16)"
        : "1px solid rgba(239,68,68,0.16)",
    fontWeight: 800,
  };
}

function readLocalJSON<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalJSON(key: string, value: any) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function defaultCollapseState(): CollapseState {
  return {
    summary: true,
    continuity: true,
    recovery: true,
    reasons: true,
    timeline: true,
    next: true,
  };
}

function routeTarget(intent: CtaIntent, communityId: number, debugId: string): string {
  return resolveCtaTarget(intent, { communityId, debugId }).to as string;
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    summary: Boolean(raw?.summary ?? base.summary),
    continuity: Boolean(raw?.continuity ?? base.continuity),
    recovery: Boolean(raw?.recovery ?? base.recovery),
    reasons: Boolean(raw?.reasons ?? base.reasons),
    timeline: Boolean(raw?.timeline ?? base.timeline),
    next: Boolean(raw?.next ?? base.next),
  };
}

function normalizeTrustSlipRecord(raw: any): TrustSlipRecord | null {
  if (!raw) return null;

  const src = raw?.item || raw?.summary || raw?.trust_slip || raw?.data || raw;

  return {
    id: positiveNumber(firstTruthy(src?.id, src?.trust_slip_id)) || undefined,
    code: firstTruthy(src?.code, src?.trust_slip_code),
    status: firstTruthy(src?.status, src?.state, src?.verification_status),
    phone_recorded: src?.phone_recorded ?? src?.identity_context?.phone_recorded ?? null,
    phone_verified: src?.phone_verified ?? src?.identity_context?.phone_verified ?? null,
    bank_details_recorded:
      src?.bank_details_recorded ?? src?.identity_context?.bank_details_recorded ?? null,
    bank_verified: src?.bank_verified ?? src?.identity_context?.bank_verified ?? null,
    official_id_recorded:
      src?.official_id_recorded ?? src?.identity_context?.official_id_recorded ?? null,
    official_id_verified:
      src?.official_id_verified ?? src?.identity_context?.official_id_verified ?? null,
    photo_recorded: src?.photo_recorded ?? src?.identity_context?.photo_recorded ?? null,
    profile_image_url: firstTruthy(
      src?.profile_image_url,
      src?.identity_context?.profile_image_url
    ),
    identity_context: src?.identity_context || null,
    trust_band: firstTruthy(src?.trust_band, src?.trust_class),
    trust_class: firstTruthy(src?.trust_class, src?.trust_band),
    trust_score: firstNumberLike(src?.trust_score),
    open_trust_band: firstTruthy(
      src?.open_trust_band,
      src?.community_trust_band,
      src?.open_trust_class
    ),
    open_trust_class: firstTruthy(
      src?.open_trust_class,
      src?.community_trust_class,
      src?.open_trust_band
    ),
    open_trust_score: firstNumberLike(
      src?.open_trust_score,
      src?.community_trust_score
    ),
    community_trust_band: firstTruthy(
      src?.community_trust_band,
      src?.open_trust_band
    ),
    community_trust_class: firstTruthy(
      src?.community_trust_class,
      src?.open_trust_class
    ),
    community_trust_score: firstNumberLike(
      src?.community_trust_score,
      src?.open_trust_score
    ),
    issued_at: firstTruthy(src?.issued_at, src?.created_at),
    expires_at: firstTruthy(src?.expires_at, src?.expiry_at),
    holder_name: firstTruthy(src?.holder_name, src?.display_name, src?.name),
    gmfn_id: firstTruthy(src?.gmfn_id),
  };
}

function initialsFromName(name: string): string {
  const parts = safeStr(name).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function getCciState(me: any): ReadingState {
  const rawScore =
    me?.cci_score ??
    me?.cross_client_integrity_score ??
    me?.cross_clan_integrity_score ??
    me?.cross_community_integrity_score ??
    null;

  const rawClass =
    me?.cci_class ??
    me?.cross_client_integrity_class ??
    me?.cross_clan_integrity_class ??
    me?.cross_community_integrity_class ??
    "";

  const rawWhy =
    me?.cci_reason ??
    me?.cross_client_integrity_reason ??
    me?.cross_clan_integrity_reason ??
    me?.cross_community_integrity_reason ??
    "";

  const scoreNum =
    rawScore === null || rawScore === undefined || String(rawScore).trim() === ""
      ? null
      : Number(rawScore);

  const classText = String(rawClass || "").trim().toUpperCase();

  if (classText) {
    if (classText === "A" || classText === "A+") {
      return {
        classText,
        scoreText:
          scoreNum === null || Number.isNaN(scoreNum)
            ? "—"
            : String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Healthy across visible communities",
        whyText: String(rawWhy || "Your trust position is steady right now."),
      };
    }

    if (classText === "B") {
      return {
        classText,
        scoreText:
          scoreNum === null || Number.isNaN(scoreNum)
            ? "—"
            : String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Stable and growing",
        whyText: String(
          rawWhy || "Keep consistent positive actions across communities."
        ),
      };
    }

    if (classText === "C") {
      return {
        classText,
        scoreText:
          scoreNum === null || Number.isNaN(scoreNum)
            ? "—"
            : String(Math.round(scoreNum)),
        tone: "yellow",
        statusText: "Needs attention",
        whyText: String(
          rawWhy || "A few better actions can improve your standing."
        ),
      };
    }

    return {
      classText,
      scoreText:
        scoreNum === null || Number.isNaN(scoreNum)
          ? "—"
          : String(Math.round(scoreNum)),
      tone: "red",
      statusText: "At risk",
      whyText: String(rawWhy || "Your trust position needs action and repair."),
    };
  }

  if (scoreNum !== null && !Number.isNaN(scoreNum)) {
    if (scoreNum >= 75) {
      return {
        classText: "A",
        scoreText: String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Healthy across visible communities",
        whyText: String(rawWhy || "Your trust position is looking strong."),
      };
    }

    if (scoreNum >= 55) {
      return {
        classText: "B",
        scoreText: String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Stable and growing",
        whyText: String(
          rawWhy || "Keep consistent actions to strengthen your standing."
        ),
      };
    }

    if (scoreNum >= 35) {
      return {
        classText: "C",
        scoreText: String(Math.round(scoreNum)),
        tone: "yellow",
        statusText: "Needs attention",
        whyText: String(
          rawWhy || "Some recent actions may have reduced your trust strength."
        ),
      };
    }

    return {
      classText: "D",
      scoreText: String(Math.round(scoreNum)),
      tone: "red",
      statusText: "At risk",
      whyText: String(rawWhy || "Your trust position needs urgent improvement."),
    };
  }

  return {
    classText: "Pending",
    scoreText: "—",
    tone: "neutral",
    statusText: "No cross-community consistency reading yet",
    whyText:
      "Complete identity and community activity first. The fuller consistency reading across communities will appear here when it is available.",
  };
}

function getOpenTrustState(
  me: any,
  trustSlip: TrustSlipRecord | null,
  hasSelectedCommunity: boolean
): ReadingState {
  const rawClass = firstTruthy(
    me?.open_trust_class,
    me?.open_trust_band,
    me?.current_community_trust_class,
    me?.current_community_trust_band,
    me?.community_trust_class,
    me?.community_trust_band,
    me?.selected_clan_trust_class,
    me?.selected_clan_trust_band,
    trustSlip?.open_trust_class,
    trustSlip?.open_trust_band,
    trustSlip?.community_trust_class,
    trustSlip?.community_trust_band,
    me?.trust_class,
    me?.trust_band,
    trustSlip?.trust_class,
    trustSlip?.trust_band
  ).toUpperCase();

  const rawScore = firstNumberLike(
    me?.open_trust_score,
    me?.current_community_trust_score,
    me?.community_trust_score,
    me?.selected_clan_trust_score,
    trustSlip?.open_trust_score,
    trustSlip?.community_trust_score,
    me?.trust_score,
    trustSlip?.trust_score
  );

  const rawWhy = firstTruthy(
    me?.open_trust_reason,
    me?.current_community_trust_reason,
    me?.community_trust_reason,
    me?.selected_clan_trust_reason,
    me?.trust_reason
  );

  if (rawClass) {
    if (rawClass === "A" || rawClass === "A+") {
      return {
        classText: rawClass,
        scoreText:
          rawScore === null || Number.isNaN(rawScore)
            ? "—"
            : String(Math.round(rawScore)),
        tone: "green",
        statusText: "Strong in your current community",
        whyText: rawWhy || "Your present community reading is strong.",
      };
    }

    if (rawClass === "B") {
      return {
        classText: rawClass,
        scoreText:
          rawScore === null || Number.isNaN(rawScore)
            ? "—"
            : String(Math.round(rawScore)),
        tone: "green",
        statusText: "Stable in your current community",
        whyText:
          rawWhy || "Your current community reading looks steady right now.",
      };
    }

    if (rawClass === "C") {
      return {
        classText: rawClass,
        scoreText:
          rawScore === null || Number.isNaN(rawScore)
            ? "—"
            : String(Math.round(rawScore)),
        tone: "yellow",
        statusText: "Needs attention in your current community",
        whyText:
          rawWhy ||
          "Your current community reading suggests some areas need attention.",
      };
    }

    return {
      classText: rawClass,
      scoreText:
        rawScore === null || Number.isNaN(rawScore)
          ? "—"
          : String(Math.round(rawScore)),
      tone: "red",
      statusText: "At risk in your current community",
      whyText:
        rawWhy ||
        "Your current community reading shows pressure that needs attention.",
    };
  }

  if (rawScore !== null && !Number.isNaN(rawScore)) {
    if (rawScore >= 75) {
      return {
        classText: "A",
        scoreText: String(Math.round(rawScore)),
        tone: "green",
        statusText: "Strong in your current community",
        whyText: rawWhy || "Your current community reading is strong.",
      };
    }

    if (rawScore >= 55) {
      return {
        classText: "B",
        scoreText: String(Math.round(rawScore)),
        tone: "green",
        statusText: "Stable in your current community",
        whyText:
          rawWhy || "Your current community reading looks steady right now.",
      };
    }

    if (rawScore >= 35) {
      return {
        classText: "C",
        scoreText: String(Math.round(rawScore)),
        tone: "yellow",
        statusText: "Needs attention in your current community",
        whyText:
          rawWhy ||
          "Your current community reading suggests some areas need attention.",
      };
    }

    return {
      classText: "D",
      scoreText: String(Math.round(rawScore)),
      tone: "red",
      statusText: "At risk in your current community",
      whyText:
        rawWhy ||
        "Your current community reading shows pressure that needs attention.",
    };
  }

  if (!hasSelectedCommunity) {
    return {
      classText: "Pending",
      scoreText: "—",
      tone: "neutral",
      statusText: "Select a community to view local trust",
      whyText:
        "Local community trust belongs to the community you are using right now. It is separate from the wider cross-community consistency reading.",
    };
  }

  return {
    classText: "Pending",
    scoreText: "—",
    tone: "neutral",
    statusText: "No local community reading yet",
    whyText:
      "Local community trust reflects your standing in your current community. Select or use a community first, then this reading will appear here.",
  };
}

function extractTextsByKeyTokens(
  input: any,
  tokens: string[],
  limit = 4
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const seenNodes = new Set<any>();

  function collectStringsFromValue(value: any) {
    if (out.length >= limit || value == null) return;

    if (typeof value === "string") {
      const text = safeStr(value);
      if (!text || seen.has(text)) return;
      seen.add(text);
      out.push(text);
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        collectStringsFromValue(item);
        if (out.length >= limit) return;
      }
      return;
    }

    if (typeof value === "object") {
      const candidates = [
        value?.text,
        value?.detail,
        value?.message,
        value?.title,
        value?.reason,
        value?.note,
        value?.description,
        value?.label,
      ];

      for (const candidate of candidates) {
        collectStringsFromValue(candidate);
        if (out.length >= limit) return;
      }
    }
  }

  function walk(node: any, depth: number) {
    if (node == null || depth > 6 || out.length >= limit) return;
    if (typeof node !== "object") return;
    if (seenNodes.has(node)) return;
    seenNodes.add(node);

    if (Array.isArray(node)) {
      for (const item of node) {
        walk(item, depth + 1);
        if (out.length >= limit) return;
      }
      return;
    }

    for (const [key, value] of Object.entries(node)) {
      const rawKey = safeStr(key).toLowerCase();

      if (tokens.some((token) => rawKey.includes(token))) {
        collectStringsFromValue(value);
      }

      if (typeof value === "object") {
        walk(value, depth + 1);
      }
    }
  }

  walk(input, 0);
  return out;
}

function eventTone(kind: string) {
  const text = safeStr(kind).toLowerCase();

  if (
    text.includes("paid") ||
    text.includes("repaid") ||
    text.includes("verified") ||
    text.includes("approved") ||
    text.includes("completed") ||
    text.includes("fulfilled")
  ) {
    return {
      dot: "#16A34A",
      bg: "#F3FBF5",
      label: "Built",
    };
  }

  if (
    text.includes("late") ||
    text.includes("overdue") ||
    text.includes("default") ||
    text.includes("missed") ||
    text.includes("declined") ||
    text.includes("risk") ||
    text.includes("warning")
  ) {
    return {
      dot: "#DC2626",
      bg: "#FFF5F5",
      label: "Weakened",
    };
  }

  if (
    text.includes("repair") ||
    text.includes("attention") ||
    text.includes("flag") ||
    text.includes("dispute")
  ) {
    return {
      dot: "#D97706",
      bg: "#FFFBEF",
      label: "Repair",
    };
  }

  return {
    dot: "#0B63D1",
    bg: "#F8FBFF",
    label: "Protected",
  };
}

export default function IdentityIntegrityPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedClanId = Number(getSelectedClanId() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "identity-integrity.route.dashboard"),
      identity: routeTarget("cci", selectedClanId, "identity-integrity.route.identity"),
      trust: routeTarget("trust", selectedClanId, "identity-integrity.route.trust"),
      trustSlip: routeTarget("trustSlip", selectedClanId, "identity-integrity.route.trust-slip"),
      payoutDetails: routeTarget(
        "payoutDetails",
        selectedClanId,
        "identity-integrity.route.payout-details"
      ),
      communityConfirmations: routeTarget(
        "communityConfirmationInbox",
        selectedClanId,
        "identity-integrity.route.community-confirmations"
      ),
      notifications: routeTarget(
        "notifications",
        selectedClanId,
        "identity-integrity.route.notifications"
      ),
    }),
    [selectedClanId]
  );

  const requestedIdentityTask = useMemo<IdentityTaskKey | null>(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get("task") || "";
    return IDENTITY_TASK_KEYS.includes(raw as IdentityTaskKey)
      ? (raw as IdentityTaskKey)
      : null;
  }, [location.search]);

  const completionMode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("mode") === "complete";
  }, [location.search]);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(IDENTITY_PAGE_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{
    tone: NoticeTone;
    text: string;
  } | null>(null);
  const [activeIdentityTask, setActiveIdentityTask] =
    useState<IdentityTaskKey>("phone");

  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [trustSlip, setTrustSlip] = useState<TrustSlipRecord | null>(null);
  const [guidance, setGuidance] = useState<GuidanceSnapshot | null>(null);
  const [trustWhyRaw, setTrustWhyRaw] = useState<any>(null);
  const [events, setEvents] = useState<TrustEventRow[]>([]);
  const [identityRisk, setIdentityRisk] = useState<IdentityRiskSummary | null>(
    null
  );
  const [identityRecovery, setIdentityRecovery] =
    useState<IdentityRecoverySummary | null>(null);
  const [recoveryPrompts, setRecoveryPrompts] = useState([
    { prompt: "", answer: "" },
    { prompt: "", answer: "" },
    { prompt: "", answer: "" },
  ]);
  const [recoveryAnswers, setRecoveryAnswers] = useState(["", "", ""]);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [recoverySuccess, setRecoverySuccess] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneVerificationId, setPhoneVerificationId] = useState<number | null>(null);
  const [phoneOtpPreview, setPhoneOtpPreview] = useState("");
  const [phoneTaskMessage, setPhoneTaskMessage] = useState("");
  const [phoneTaskTone, setPhoneTaskTone] = useState<PhoneTaskTone>("success");
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [officialIdType, setOfficialIdType] = useState("Passport");
  const [officialIdReference, setOfficialIdReference] = useState("");
  const [officialIdCountry, setOfficialIdCountry] = useState("");
  const [officialIdTaskMessage, setOfficialIdTaskMessage] = useState("");
  const [officialIdBusy, setOfficialIdBusy] = useState(false);
  const [identityPhotoFile, setIdentityPhotoFile] = useState<File | null>(null);
  const [identityPhotoPreview, setIdentityPhotoPreview] = useState("");
  const [identityPhotoKind, setIdentityPhotoKind] = useState<
    "selfie" | "identity_photo"
  >("selfie");
  const [identityPhotoBusy, setIdentityPhotoBusy] = useState(false);
  const selfiePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const idPhotoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 980);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    writeLocalJSON(IDENTITY_PAGE_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    if (requestedIdentityTask) setActiveIdentityTask(requestedIdentityTask);
  }, [requestedIdentityTask]);

  useEffect(() => {
    setPhoneInput((prev) => prev || safeStr(me?.phone_e164 || me?.phone || ""));
    setOfficialIdCountry((prev) => prev || safeStr(me?.country || me?.country_code || ""));
  }, [me]);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    return () => {
      if (identityPhotoPreview) URL.revokeObjectURL(identityPhotoPreview);
    };
  }, [identityPhotoPreview]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const [meRes, clanRes, trustSlipRes, guidanceRes, whyRes, eventsRes, identityRiskRes, identityRecoveryRes] =
          await Promise.all([
            getMe().catch(() => null),
            getCurrentClan().catch(() => null),
            getMyTrustSlip().catch(() => null),
            buildGuidanceSnapshot().catch(() => null),
            getTrustWhyMe().catch(() => null),
            listTrustEvents({
              clan_id: selectedClanId || undefined,
              limit: 60,
            }).catch(() => ({ items: [] })),
            getMyIdentityRisk().catch(() => null),
            getMyIdentityRecovery().catch(() => null),
          ]);

        if (!alive) return;

        setMe(meRes || null);
        setCurrentClan(clanRes || null);
        setTrustSlip(normalizeTrustSlipRecord(trustSlipRes));
        setGuidance(guidanceRes || null);
        setTrustWhyRaw(whyRes || null);
        setEvents(rowsOf<TrustEventRow>(eventsRes));
        setIdentityRisk(identityRiskRes || null);
        setIdentityRecovery(identityRecoveryRes || null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedClanId]);

  const displayName = useMemo(() => {
    return (
      firstTruthy(
        me?.display_name,
        me?.nickname,
        me?.name,
        me?.first_name,
        trustSlip?.holder_name,
        me?.email
      ) || "Member"
    );
  }, [me, trustSlip]);

  const profileInitials = useMemo(() => {
    return initialsFromName(displayName);
  }, [displayName]);

  const avatarSrc = useMemo(() => {
    return resolveProfileImageUrl(
      firstTruthy(
        me?.profile_image_url,
        me?.avatar_url,
        me?.photo_url,
        trustSlip?.profile_image_url,
        trustSlip?.identity_context?.profile_image_url
      )
    );
  }, [me, trustSlip]);

  const communityLabel = useMemo(() => {
    return (
      firstTruthy(
        currentClan?.marketplace_name,
        currentClan?.name,
        currentClan?.display_name,
        currentClan?.title
      ) || (selectedClanId ? `Community ${selectedClanId}` : "No current community")
    );
  }, [currentClan, selectedClanId]);

  const gmfnId = useMemo(() => {
    return firstTruthy(me?.gmfn_id, trustSlip?.gmfn_id, "Pending");
  }, [me, trustSlip]);

  const trustSlipCode = safeStr(trustSlip?.code || "");
  const guideItems = useMemo(() => buildIdentityIntegrityGuideItems(), []);
  const actionGuide = useMemo(() => buildIdentityActionGuide(), []);
  const trustDocumentFamilyItems = useMemo(() => buildTrustDocumentFamilyItems(true), []);
  const trustDocumentUseCases = useMemo(
    () => buildTrustDocumentUseCaseItems(trustDocumentFamilyItems, "identity"),
    [trustDocumentFamilyItems]
  );

  const cci = useMemo(() => getCciState(me), [me]);
  const openTrust = useMemo(
    () => getOpenTrustState(me, trustSlip, Boolean(selectedClanId)),
    [me, trustSlip, selectedClanId]
  );
  const cciBand = normalizeTrustBand(cci.classText);
  const cciBandLabel = cciBand
    ? `${cciBand} - ${getTrustBandShortLabel(cciBand)}`
    : cci.classText;
  const cciBandMeaning = useMemo(
    () => getTrustBandLanguage(cci.classText),
    [cci.classText]
  );
  const openTrustBand = normalizeTrustBand(openTrust.classText);
  const openTrustBandLabel = openTrustBand
    ? `${openTrustBand} - ${getTrustBandShortLabel(openTrustBand)}`
    : openTrust.classText;
  const openTrustBandMeaning = useMemo(
    () => getTrustBandLanguage(openTrust.classText),
    [openTrust.classText]
  );

  const cciTone = useMemo(() => {
    if (cci.tone === "green") {
      return {
        bg: "#F3FBF5",
        border: "1px solid rgba(34,197,94,0.16)",
        text: "#166534",
      };
    }
    if (cci.tone === "yellow") {
      return {
        bg: "#FFFBEF",
        border: "1px solid rgba(245,158,11,0.16)",
        text: "#92400E",
      };
    }
    if (cci.tone === "red") {
      return {
        bg: "#FFF5F5",
        border: "1px solid rgba(239,68,68,0.16)",
        text: "#991B1B",
      };
    }
    return {
      bg: "#F8FAFC",
      border: "1px solid rgba(148,163,184,0.16)",
      text: "#334155",
    };
  }, [cci.tone]);

  const openTrustTone = useMemo(() => {
    if (openTrust.tone === "green") {
      return {
        bg: "#F3FBF5",
        border: "1px solid rgba(34,197,94,0.16)",
        text: "#166534",
      };
    }
    if (openTrust.tone === "yellow") {
      return {
        bg: "#FFFBEF",
        border: "1px solid rgba(245,158,11,0.16)",
        text: "#92400E",
      };
    }
    if (openTrust.tone === "red") {
      return {
        bg: "#FFF5F5",
        border: "1px solid rgba(239,68,68,0.16)",
        text: "#991B1B",
      };
    }
    return {
      bg: "#F8FAFC",
      border: "1px solid rgba(148,163,184,0.16)",
      text: "#334155",
    };
  }, [openTrust.tone]);

  const continuity = useMemo(() => {
    const summary = identityRisk?.continuity || {};
    const status = safeStr(summary?.status).toLowerCase() || "trusted";
    const tone = continuityTone(status);

    return {
      status,
      label: tone.label,
      scoreText:
        summary?.score === null || summary?.score === undefined
          ? "—"
          : String(summary.score),
      reason:
        safeStr(summary?.reason) ||
        "Identity continuity has not raised a visible concern yet.",
      action:
        safeStr(summary?.action) ||
        "Normal account use can continue.",
      tone,
      deviceCount: Number(identityRisk?.device_count || 0),
      signalCount: Number(identityRisk?.signal_count || 0),
      clusterCount: Number(identityRisk?.cluster_count || 0),
    };
  }, [identityRisk]);

  const recovery = useMemo(() => {
    const prompts = Array.isArray(identityRecovery?.prompts)
      ? identityRecovery?.prompts.filter(Boolean)
      : [];
    const lockedUntil = safeStr(identityRecovery?.locked_until);
    const lastVerifiedAt = safeStr(identityRecovery?.last_verified_at);

    return {
      configured: Boolean(identityRecovery?.configured),
      prompts,
      failedAttempts: Number(identityRecovery?.failed_attempts || 0),
      locked: Boolean(identityRecovery?.locked),
      lockedUntil,
      lastVerifiedAt,
      shouldVerify:
        Boolean(identityRecovery?.configured) &&
        (continuity.status === "reverify_required" ||
          continuity.status === "protected_lock"),
    };
  }, [continuity.status, identityRecovery]);

  const identitySignals = useMemo(() => {
    const identityContext = trustSlip?.identity_context || {};
    const hasEvent = (eventType: string) =>
      events.some(
        (event) =>
          safeStr(event.event_type || event.type || event.kind).toLowerCase() ===
          eventType
      );
    const phoneVerified = Boolean(
      me?.phone_verified ||
        me?.phone_verified_at ||
        me?.phone_e164_verified ||
        me?.verified_phone_at ||
        trustSlip?.phone_verified ||
        identityContext?.phone_verified
    );
    const phoneRecorded = Boolean(
      phoneVerified ||
        me?.phone_recorded ||
        me?.phone_e164 ||
        trustSlip?.phone_recorded ||
        identityContext?.phone_recorded ||
        hasEvent("identity.phone_registered") ||
        hasEvent("identity.phone_verified")
    );
    const bankReady = Boolean(
      me?.bank_verified ||
        me?.bank_verified_at ||
        me?.bank_details_recorded ||
        me?.payout_destination_id ||
        me?.withdrawal_destination_id ||
        trustSlip?.bank_details_recorded ||
        trustSlip?.bank_verified ||
        identityContext?.bank_details_recorded ||
        identityContext?.bank_verified ||
        hasEvent("identity.bank_destination_recorded")
    );
    const photoReady = Boolean(
      me?.photo_recorded ||
        me?.profile_image_url ||
        trustSlip?.photo_recorded ||
        identityContext?.photo_recorded ||
        hasEvent("identity.photo_evidence_recorded")
    );
    const officialIdReady = Boolean(
      me?.passport_verified ||
        me?.passport_verified_at ||
        me?.official_id_recorded ||
        me?.official_id_verified_at ||
        me?.identity_document_recorded ||
        trustSlip?.official_id_recorded ||
        trustSlip?.official_id_verified ||
        identityContext?.official_id_recorded ||
        identityContext?.official_id_verified ||
        hasEvent("identity.official_id_recorded")
    );
    const communityReady = Boolean(selectedClanId && currentClan);
    const recoveryReady = Boolean(recovery.configured);

    return {
      phoneReady: phoneVerified,
      phoneVerified,
      phoneRecorded,
      bankReady,
      photoReady,
      officialIdReady,
      communityReady,
      recoveryReady,
      missingCount: [
        phoneRecorded,
        communityReady,
        bankReady,
        photoReady,
        officialIdReady,
        recoveryReady,
      ].filter((ready) => !ready).length,
    };
  }, [currentClan, events, me, recovery.configured, selectedClanId, trustSlip]);

  const identityHealthLabel =
    identitySignals.missingCount <= 0
      ? "Ready"
      : identitySignals.missingCount <= 2
        ? "Needs attention"
        : "Incomplete";

  function identityTaskTarget(task: IdentityTaskKey): string {
    const separator = routes.identity.includes("?") ? "&" : "?";
    return `${routes.identity}${separator}task=${encodeURIComponent(task)}&mode=complete`;
  }

  const identityTaskRows: Array<{
    key: IdentityTaskKey;
    icon: GsnIconName;
    title: string;
    status: string;
    tone: "ready" | "pending" | "watch" | "neutral";
    detail: string;
    actionLabel: string;
    completionSteps: string[];
    to?: string;
  }> = [
    {
      key: "phone",
      icon: "phone",
      title: "Phone",
      status: identitySignals.phoneVerified
        ? "Verified"
        : identitySignals.phoneRecorded
          ? "Recorded"
          : "Start check",
      tone: identitySignals.phoneVerified
        ? "ready"
        : identitySignals.phoneRecorded
          ? "watch"
          : "pending",
      detail: identitySignals.phoneVerified
        ? "Phone evidence is already verified and visible to the identity layer."
        : identitySignals.phoneRecorded
          ? "Phone number is recorded. Confirm the code to turn it into verified phone evidence."
          : "Enter your phone and confirm the signed-in code so this identity can carry phone evidence.",
      actionLabel: identitySignals.phoneVerified ? "Open TrustSlip" : "Use phone form",
      completionSteps: identitySignals.phoneVerified
        ? ["Phone is already verified.", "Use TrustSlip when someone needs a portable record."]
        : [
            "Enter phone number.",
            "GSN records the number on this identity.",
            "Confirm the system code to mark it verified.",
          ],
      to: identitySignals.phoneVerified ? routes.trustSlip : identityTaskTarget("phone"),
    },
    {
      key: "community",
      icon: "community",
      title: "Community",
      status: identitySignals.communityReady ? "Selected" : "Open inbox",
      tone: identitySignals.communityReady ? "ready" : "watch",
      detail: identitySignals.communityReady
        ? "This identity is currently tied to a selected community."
        : "Use the confirmation inbox to review community identity confirmation work.",
      actionLabel: "Open confirmations",
      completionSteps: [
        "Open the confirmation inbox.",
        "Review or request community confirmation.",
        "Return here after the community record updates.",
      ],
      to: routes.communityConfirmations,
    },
    {
      key: "bank",
      icon: "wallet",
      title: "Bank / wallet",
      status: identitySignals.bankReady ? "Recorded" : "Add details",
      tone: identitySignals.bankReady ? "ready" : "pending",
      detail: identitySignals.bankReady
        ? "Bank or wallet evidence is already connected."
        : "Add payout details so identity can connect to real-world financial records.",
      actionLabel: "Open payout details",
      completionSteps: [
        "Open payout details.",
        "Record the bank or wallet destination.",
        "Return here after GSN sees the destination.",
      ],
      to: routes.payoutDetails,
    },
    {
      key: "official_id",
      icon: "document",
      title: "Passport / ID",
      status: identitySignals.officialIdReady ? "Recorded" : "Record ID",
      tone: identitySignals.officialIdReady ? "ready" : "pending",
      detail: identitySignals.officialIdReady
        ? "Official ID evidence is already visible to the identity layer."
        : identitySignals.photoReady
          ? "Photo evidence is recorded. Add passport, national ID, licence, or local official ID details when ready."
          : "Record passport, national ID, licence, local official ID, selfie, or ID photo evidence for review.",
      actionLabel: identitySignals.officialIdReady
        ? "Open TrustSlip"
        : "Use ID form",
      completionSteps: identitySignals.officialIdReady
        ? ["Official ID evidence is already recorded.", "Use TrustSlip when someone needs a portable record."]
        : [
            "Choose passport, national ID, licence, or local official ID.",
            "Record reference, selfie, or ID photo evidence for review.",
            "GSN attaches the evidence to this identity.",
          ],
      to: identitySignals.officialIdReady ? routes.trustSlip : identityTaskTarget("official_id"),
    },
    {
      key: "recovery",
      icon: "lock",
      title: "Recovery",
      status: recovery.configured ? "Configured" : "Set up",
      tone: recovery.configured ? "ready" : "watch",
      detail: recovery.configured
        ? "Private recovery prompts are ready for serious continuity shifts."
        : "Set private recovery prompts so identity continuity has a clean owner check.",
      actionLabel: recovery.configured ? "Review recovery" : "Set recovery",
      completionSteps: [
        "Answer private recovery prompts.",
        "Save them on this identity.",
        "Use them only for serious continuity checks.",
      ],
    },
  ];

  const activeTask =
    identityTaskRows.find((item) => item.key === activeIdentityTask) ||
    identityTaskRows[0];

  async function handleRecoverySetup(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (recoveryBusy) return;

    const nextPrompts = recoveryPrompts.map((item) => ({
      prompt: safeStr(item.prompt),
      answer: safeStr(item.answer),
    }));

    if (nextPrompts.some((item) => !item.prompt || !item.answer)) {
      setRecoveryError("Fill all three private prompts and answers before saving.");
      setRecoverySuccess("");
      setActiveIdentityTask("recovery");
      setCollapsed((prev) => ({ ...prev, recovery: false }));
      return;
    }

    setRecoveryBusy(true);
    setRecoveryError("");
    setRecoverySuccess("");

    try {
      const payload = {
        questions: nextPrompts,
      };

      const out = await setupIdentityRecovery(payload);
      setIdentityRecovery(out || null);
      setActiveIdentityTask("recovery");
      setCollapsed((prev) => ({ ...prev, recovery: false }));
      setRecoveryPrompts([
        { prompt: "", answer: "" },
        { prompt: "", answer: "" },
        { prompt: "", answer: "" },
      ]);
      setRecoverySuccess(
        "Private recovery challenge saved. The app can now use it if identity continuity becomes doubtful."
      );
    } catch (err: any) {
      setRecoveryError(err?.message || "Recovery challenge could not be saved.");
    } finally {
      setRecoveryBusy(false);
    }
  }

  async function handleRecoveryVerify(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (recoveryBusy) return;

    const answers = recoveryAnswers.map((item) => safeStr(item));

    if (answers.some((item) => !item)) {
      setRecoveryError("Answer all three private recovery prompts before checking.");
      setRecoverySuccess("");
      setActiveIdentityTask("recovery");
      setCollapsed((prev) => ({ ...prev, recovery: false }));
      return;
    }

    setRecoveryBusy(true);
    setRecoveryError("");
    setRecoverySuccess("");

    try {
      const out = await verifyIdentityRecovery({
        answers,
      });
      setIdentityRisk(out?.summary || null);
      setIdentityRecovery(out?.recovery || null);
      setActiveIdentityTask("recovery");
      setCollapsed((prev) => ({ ...prev, recovery: false }));
      if (out?.verified) {
        setRecoveryAnswers(["", "", ""]);
        setRecoverySuccess(
          "Recovery challenge passed. Identity continuity has been updated for this account."
        );
        return;
      }

      setRecoveryError(
        "Recovery answers did not match. The app recorded the failed attempt and kept the account in its protected state."
      );
    } catch (err: any) {
      const detail =
        typeof err?.message === "string"
          ? err.message
          : "Recovery answers did not match.";
      setRecoveryError(detail);
    } finally {
      setRecoveryBusy(false);
    }
  }

  const explainers = useMemo<IdentityExplainers>(() => {
    const helps =
      guidance?.trustChangeExplainer?.helps?.slice(0, 4) ||
      extractTextsByKeyTokens(trustWhyRaw, [
        "help",
        "positive",
        "improv",
        "support",
        "good",
        "build",
        "strength",
      ]);

    const weakens =
      guidance?.trustChangeExplainer?.weakens?.slice(0, 4) ||
      extractTextsByKeyTokens(trustWhyRaw, [
        "weak",
        "negative",
        "risk",
        "reduce",
        "warning",
        "damage",
        "caution",
        "integrity",
      ]);

    const next =
      guidance?.trustChangeExplainer?.next?.slice(0, 4) ||
      extractTextsByKeyTokens(trustWhyRaw, [
        "next",
        "action",
        "repair",
        "improve",
        "step",
        "do",
        "what",
      ]);

    return {
      helps: helps || [],
      weakens: weakens || [],
      next: next || [],
    };
  }, [guidance, trustWhyRaw]);

  const timelineRows = useMemo(() => {
    return events
      .map((row, index) => ({
        id: firstTruthy(row.id, `event-${index}`),
        label: firstTruthy(
          row.title,
          row.message,
          row.detail,
          row.description,
          row.kind,
          row.type,
          row.event_type,
          "Trust event"
        ),
        kind: firstTruthy(row.kind, row.type, row.event_type),
        createdAt: safeStr(row.created_at),
      }))
      .sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      })
      .slice(0, 10);
  }, [events]);

  const nextMoveTitle = safeStr(
    guidance?.recoveryPath?.title ||
      guidance?.weeklyFocus?.title ||
      "Keep your path steady"
  );

  const nextMoveDetail = safeStr(
    guidance?.recoveryPath?.detail ||
      guidance?.weeklyFocus?.detail ||
      "No urgent identity repair is blocking you right now. Keep your visible conduct steady and your next step clean."
  );

  const nextMoveTo = safeStr(
    guidance?.recoveryPath?.ctaTo ||
      guidance?.weeklyFocus?.ctaTo ||
      routes.trust
  );

  const nextMoveLabel = safeStr(
    guidance?.recoveryPath?.ctaLabel ||
      guidance?.weeklyFocus?.ctaLabel ||
      "Open next step"
  );

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function copyGmfnId() {
    if (!gmfnId || gmfnId === "Pending") {
      showNotice("error", "GSN ID is not ready yet.");
      return;
    }

    safeCopy(gmfnId);
    showNotice("success", "GSN ID copied.");
  }

  function copyTrustSlipCode() {
    if (!trustSlipCode) {
      showNotice("error", "TrustSlip code is not ready yet.");
      return;
    }

    safeCopy(trustSlipCode);
    showNotice("success", "TrustSlip code copied.");
  }

  function copyIdentitySnapshot() {
    const snapshot = buildIdentityIntegritySnapshot({
      displayName,
      gmfnId,
      communityLabel,
      trustSlipCode,
      openTrustClass: openTrust.classText,
      openTrustScore: openTrust.scoreText,
      cciClass: cci.classText,
      cciScore: cci.scoreText,
      continuityLabel: continuity.label,
      nextMoveLabel,
    });

    safeCopy(snapshot);
    showNotice("success", "Identity snapshot copied.");
  }

  function handleGuideSelect(item: { to?: string; disabled?: boolean }) {
    if (!item.to || item.disabled) return;
    navigateWithOrigin(navigate, item.to, location);
  }

  function selectIdentityTask(key: IdentityTaskKey) {
    setActiveIdentityTask(key);
    if (identityPhotoPreview) URL.revokeObjectURL(identityPhotoPreview);
    setIdentityPhotoFile(null);
    setIdentityPhotoPreview("");
    setPhoneTaskMessage("");
    setPhoneTaskTone("success");
    setOfficialIdTaskMessage("");
  }

  function openIdentityTask(item: typeof activeTask) {
    if (item.to) {
      navigateWithOrigin(navigate, item.to, location);
      return;
    }

    if (item.key === "recovery") {
      setActiveIdentityTask("recovery");
      showNotice(
        "success",
        recovery.configured
          ? "Recovery is already configured. Review the recovery block below if you need to change it."
          : "Recovery setup is open on this page. Fill the private prompts below."
      );
      return;
    }

    showNotice(
      "error",
      `${item.title} needs a dedicated signed-in identity-completion route before it can be finished here.`
    );
  }

  async function handleStartPhoneVerification(e: React.FormEvent) {
    e.preventDefault();
    if (phoneBusy) return;

    setPhoneBusy(true);
    try {
      const out = await startSignedInPhoneVerification({
        phone_e164: phoneInput,
        country: officialIdCountry || undefined,
      });
      setPhoneVerificationId(Number(out?.verification_id || 0) || null);
      setPhoneOtpPreview(safeStr(out?.otp_preview));
      setPhoneCode(safeStr(out?.otp_preview));
      setMe((prev: any) => ({
        ...(prev || {}),
        phone_e164: out?.phone_e164 || phoneInput,
        phone_recorded: true,
      }));
      setPhoneTaskMessage(
        out?.otp_preview
          ? `System code generated: ${out.otp_preview}. Confirm it below.`
          : "Phone number recorded. Waiting for delivery provider code; confirmation is still pending."
      );
      setPhoneTaskTone("success");
      showNotice(
        "success",
        out?.otp_preview
          ? "System phone code is ready in the phone task."
          : "Phone number recorded. Confirmation is still pending."
      );
    } catch (err: any) {
      const message = parsePhoneTaskError(err);
      setPhoneTaskMessage(message);
      setPhoneTaskTone("error");
      showNotice("error", message);
    } finally {
      setPhoneBusy(false);
    }
  }

  async function handleConfirmPhoneVerification(e: React.FormEvent) {
    e.preventDefault();
    if (phoneBusy || !phoneVerificationId) return;

    setPhoneBusy(true);
    try {
      const out = await confirmSignedInPhoneVerification({
        verification_id: phoneVerificationId,
        code: phoneCode,
      });
      setMe((prev: any) => ({
        ...(prev || {}),
        phone_e164: out?.phone_e164 || phoneInput,
        phone_verified: true,
        phone_verified_at: out?.phone_verified_at || new Date().toISOString(),
      }));
      setPhoneVerificationId(null);
      setPhoneCode("");
      setPhoneOtpPreview("");
      setPhoneTaskMessage(out?.message || "Phone evidence is now verified and connected.");
      setPhoneTaskTone("success");
      showNotice("success", out?.message || "Phone evidence is now connected.");
    } catch (err: any) {
      const message = err?.message || "Phone code could not be confirmed.";
      setPhoneTaskMessage(message);
      setPhoneTaskTone("error");
      showNotice("error", message);
    } finally {
      setPhoneBusy(false);
    }
  }

  async function handleRecordOfficialId(e: React.FormEvent) {
    e.preventDefault();
    if (officialIdBusy) return;

    setOfficialIdBusy(true);
    setOfficialIdTaskMessage("");
    try {
      const out = await recordSignedInOfficialId({
        document_type: officialIdType,
        document_reference: officialIdReference,
        country: officialIdCountry,
        note: "Recorded from signed-in Identity Integrity task.",
      });
      setMe((prev: any) => ({
        ...(prev || {}),
        official_id_recorded: true,
        official_id_verified_at: out?.verified_at || undefined,
      }));
      setOfficialIdReference("");
      setOfficialIdTaskMessage(
        `${officialIdType} evidence recorded for review. Provider verification is still pending.`
      );
      showNotice(
        "success",
        "Official ID evidence is recorded for review. It is not provider-verified yet."
      );
    } catch (err: any) {
      setOfficialIdTaskMessage(
        err?.message || "Official ID evidence could not be recorded."
      );
      showNotice("error", err?.message || "Official ID evidence could not be recorded.");
    } finally {
      setOfficialIdBusy(false);
    }
  }

  function handleIdentityPhotoSelected(
    files: FileList | null,
    kind: "selfie" | "identity_photo"
  ) {
    const file = files?.[0] || null;
    if (!file) {
      showNotice("error", "No photo was selected. Try the camera or choose a file.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      showNotice("error", "Use a jpg, png, or webp image for identity evidence.");
      return;
    }
    if (identityPhotoPreview) URL.revokeObjectURL(identityPhotoPreview);
    setIdentityPhotoFile(file);
    setIdentityPhotoKind(kind);
    setIdentityPhotoPreview(URL.createObjectURL(file));
    showNotice(
      "success",
      kind === "selfie"
        ? "Selfie selected. Record it to attach photo evidence."
        : "ID photo selected. Record it to attach official ID evidence for review."
    );
  }

  async function handleRecordIdentityPhoto() {
    if (identityPhotoBusy || !identityPhotoFile) return;

    setIdentityPhotoBusy(true);
    setOfficialIdTaskMessage("");
    try {
      const documentType =
        identityPhotoKind === "selfie"
          ? "selfie"
          : officialIdType.toLowerCase().includes("passport")
            ? "passport_photo"
            : "identity_photo";
      await recordSignedInIdentityPhoto({
        file: identityPhotoFile,
        document_type: documentType,
        note:
          identityPhotoKind === "selfie"
            ? "Signed-in selfie evidence from Identity Integrity."
            : `Signed-in ${officialIdType} image evidence from Identity Integrity.`,
      });
      setMe((prev: any) => ({
        ...(prev || {}),
        photo_recorded: true,
        profile_image_url: prev?.profile_image_url,
        official_id_recorded:
          identityPhotoKind === "identity_photo"
            ? true
            : prev?.official_id_recorded,
      }));
      setIdentityPhotoFile(null);
      setIdentityPhotoPreview("");
      setOfficialIdTaskMessage(
        identityPhotoKind === "selfie"
          ? "Selfie evidence recorded for review. Provider face-match is still pending."
          : "ID photo evidence recorded for review. Provider document verification is still pending."
      );
      showNotice(
        "success",
        identityPhotoKind === "selfie"
          ? "Selfie evidence is recorded for review."
          : "ID photo evidence is recorded for review. It is not provider-verified yet."
      );
    } catch (err: any) {
      setOfficialIdTaskMessage(
        err?.message || "Photo evidence could not be recorded."
      );
      showNotice("error", err?.message || "Photo evidence could not be recorded.");
    } finally {
      setIdentityPhotoBusy(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          paddingBottom: 40,
          display: "grid",
          gap: 18,
        }}
      >
        <PageTopNav
          sectionLabel="Identity & Integrity"
          title="Identity & Integrity"
          subtitle="Loading your identity and integrity page..."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.dashboard}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading identity and integrity...
          </div>
        </section>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        paddingBottom: 40,
        display: "grid",
        gap: 18,
      }}
    >
      <PageTopNav
        sectionLabel="Identity & Integrity"
        title="Identity & Integrity"
        subtitle="Stable identity, current status, and the next clean evidence step."
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.dashboard}
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section
        data-identity-integrity-front-package="true"
        style={{
          ...pageCard("#FFFFFF"),
          padding: isCompact ? 12 : 18,
          border: "1px solid rgba(37,78,119,0.14)",
          boxShadow: "0 16px 38px rgba(7,23,44,0.08)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "76px minmax(0, 1fr)" : "104px minmax(0, 1fr)",
            gap: isCompact ? 10 : 16,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: isCompact ? 76 : 104,
              height: isCompact ? 76 : 104,
              borderRadius: isCompact ? 22 : 28,
              overflow: "hidden",
              border: "1px solid rgba(212,175,55,0.22)",
              background: "linear-gradient(180deg, #07172C 0%, #102A43 100%)",
              boxShadow: "0 14px 32px rgba(2,12,27,0.16)",
              display: "grid",
              placeItems: "center",
              color: "#FFFFFF",
              fontWeight: 1000,
              fontSize: isCompact ? 24 : 34,
            }}
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt="Identity"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center 16%",
                  display: "block",
                }}
              />
            ) : (
              profileInitials
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={compactStatusChip(identitySignals.missingCount <= 0 ? "ready" : "pending")}>
                <GsnLegacyIcon name="shield" size={22} />
                {identityHealthLabel}
              </span>
              <span style={compactStatusChip("neutral")}>
                <GsnLegacyIcon name="id" size={22} />
                Identity anchor
              </span>
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#07172C",
                fontWeight: 1000,
                fontSize: isCompact ? 27 : 36,
                lineHeight: 1.02,
                letterSpacing: 0,
                overflowWrap: "break-word",
              }}
            >
              {displayName}
            </div>
            <div style={{ marginTop: 6, ...compactHelperText() }}>
              One stable person record. Finish the missing evidence steps one at a time.
            </div>
          </div>
        </div>

        <div
          data-identity-integrity-fact-grid="true"
          style={{
            marginTop: isCompact ? 12 : 16,
            display: "grid",
            gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
            gap: isCompact ? 8 : 10,
          }}
        >
          {[
            {
              icon: "id" as GsnIconName,
              label: "GSN ID",
              value: gmfnId,
              tone: "watch" as const,
            },
            {
              icon: "community" as GsnIconName,
              label: "Community",
              value: communityLabel,
              tone: identitySignals.communityReady ? "ready" as const : "neutral" as const,
            },
            {
              icon: "shield" as GsnIconName,
              label: "Continuity",
              value: continuity.label,
              tone: continuity.status === "trusted" ? "ready" as const : "pending" as const,
            },
            {
              icon: "document" as GsnIconName,
              label: "TrustSlip",
              value: trustSlipCode || "Pending",
              tone: trustSlipCode ? "ready" as const : "neutral" as const,
            },
          ].map((item) => (
            <div key={item.label} style={compactFactCard()}>
              <span style={iconTile(identityIconTone(item.tone).color, identityIconTone(item.tone).bg)}>
                <GsnLegacyIcon name={item.icon} size={36} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    color: "#617085",
                    fontSize: 11,
                    fontWeight: 1000,
                    lineHeight: 1.1,
                    textTransform: "uppercase",
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    display: "block",
                    marginTop: 4,
                    color: "#07172C",
                    fontWeight: 1000,
                    fontSize: isCompact ? 12.5 : 14,
                    lineHeight: 1.14,
                    overflowWrap: "break-word",
                    wordBreak: "normal",
                  }}
                >
                  {item.value}
                </span>
              </span>
            </div>
          ))}
        </div>

        <div
          data-identity-integrity-copy-actions="true"
          style={{
            marginTop: isCompact ? 12 : 14,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "repeat(3, minmax(0, 1fr))",
            gap: isCompact ? 8 : 10,
            alignItems: "stretch",
          }}
        >
          <PrimaryButton
            onClick={copyGmfnId}
            disabled={!gmfnId || gmfnId === "Pending"}
            stableHeight={52}
            fullWidth
            minWidth={isCompact ? undefined : 132}
            debugId="identity-integrity.copy-gmfn-id"
            style={identityCopyActionStyle(Boolean(gmfnId && gmfnId !== "Pending"), "primary")}
          >
            <span style={identityCopyIconBox(Boolean(gmfnId && gmfnId !== "Pending"), true)}>
              <GsnLegacyIcon name="id" size={24} />
            </span>
            <span style={{ minWidth: 0, display: "grid", gap: 2, textAlign: "left" }}>
              <span style={{ fontWeight: 1000, lineHeight: 1.05 }}>Copy GSN ID</span>
              <span style={{ fontSize: 10.5, fontWeight: 900, opacity: 0.82 }}>
                {gmfnId && gmfnId !== "Pending" ? "Ready" : "Pending issue"}
              </span>
            </span>
          </PrimaryButton>

          <SecondaryButton
            onClick={copyTrustSlipCode}
            disabled={!trustSlipCode}
            stableHeight={isCompact ? 52 : 52}
            fullWidth
            debugId="identity-integrity.copy-trust-slip-code"
            style={identityCopyActionStyle(Boolean(trustSlipCode), "secondary")}
          >
            <span style={identityCopyIconBox(Boolean(trustSlipCode), false)}>
              <GsnLegacyIcon name="document" size={24} />
            </span>
            <span style={{ minWidth: 0, display: "grid", gap: 2, textAlign: "left" }}>
              <span style={{ fontWeight: 1000, lineHeight: 1.05 }}>Copy TrustSlip</span>
              <span style={{ fontSize: 10.5, fontWeight: 900, color: trustSlipCode ? "#617085" : "#64748B" }}>
                {trustSlipCode ? "Ready" : "Not issued yet"}
              </span>
            </span>
          </SecondaryButton>

          <SubtleButton
            onClick={copyIdentitySnapshot}
            stableHeight={isCompact ? 52 : 52}
            fullWidth
            debugId="identity-integrity.copy-snapshot"
            style={identityCopyActionStyle(true, "subtle")}
          >
            <span style={identityCopyIconBox(true, false)}>
              <GsnLegacyIcon name="copy" size={24} />
            </span>
            <span style={{ minWidth: 0, display: "grid", gap: 2, textAlign: "left" }}>
              <span style={{ fontWeight: 1000, lineHeight: 1.05 }}>Copy snapshot</span>
              <span style={{ fontSize: 10.5, fontWeight: 900, color: "#617085" }}>
                Always available
              </span>
            </span>
          </SubtleButton>
        </div>

        <div
          data-identity-integrity-task-switcher="true"
          style={{
            marginTop: isCompact ? 14 : 16,
            display: "grid",
            gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "repeat(5, minmax(0, 1fr))",
            gap: 8,
            ...identityPanelLock(),
          }}
        >
          {identityTaskRows.map((item) => {
            const active = item.key === activeIdentityTask;
            return (
              <SecondaryButton
                key={item.key}
                onClick={() => selectIdentityTask(item.key)}
                stableHeight={isCompact ? 54 : 58}
                fullWidth
                debugId={`identity-integrity.task.${item.key}`}
                style={{
                  justifyContent: "flex-start",
                  borderRadius: 14,
                  border: active
                    ? "1px solid rgba(11,99,209,0.34)"
                    : "1px solid rgba(37,78,119,0.12)",
                  background: active ? "#EEF6FF" : "#FFFFFF",
                  boxShadow: "none",
                  color: "#07172C",
                  paddingInline: 10,
                  gap: 8,
                  ...identityPanelLock(),
                }}
              >
                <span style={taskIconBadge(active, item.tone)}>
                  <GsnLegacyIcon name={item.icon} size={28} />
                </span>
                <span style={{ minWidth: 0, textAlign: "left" }}>
                  <span style={{ display: "block", fontWeight: 1000, fontSize: 12.5 }}>
                    {item.title}
                  </span>
                  <span
                    style={{
                      display: "block",
                      marginTop: 2,
                      color: "#617085",
                      fontSize: 11,
                      fontWeight: 900,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.status}
                  </span>
                </span>
              </SecondaryButton>
            );
          })}
        </div>

        <div
          data-identity-integrity-active-task="true"
          style={{
            marginTop: isCompact ? 10 : 12,
            borderRadius: 18,
            border: "1px solid rgba(37,78,119,0.12)",
            background:
              "linear-gradient(180deg, rgba(248,251,255,0.96) 0%, rgba(255,255,255,0.98) 100%)",
            padding: isCompact ? 10 : 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
            gap: 10,
            alignItems: "center",
            minHeight: isCompact ? 178 : undefined,
            ...identityPanelLock(),
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "42px minmax(0, 1fr)",
              gap: 10,
              alignItems: "center",
            }}
          >
            <span
              style={iconTile(
                identityIconTone(activeTask.tone).color,
                identityIconTone(activeTask.tone).bg
              )}
            >
              <GsnLegacyIcon name={activeTask.icon} size={38} />
            </span>
            <span style={{ minWidth: 0 }}>
              <span
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <b style={{ color: "#07172C", fontSize: isCompact ? 17 : 19 }}>
                  {activeTask.title}
                </b>
                <span style={compactStatusChip(activeTask.tone)}>{activeTask.status}</span>
              </span>
              <span style={{ display: "block", marginTop: 4, ...compactHelperText() }}>
                {activeTask.detail}
              </span>
            </span>
          </div>

          <SecondaryButton
            onClick={() => openIdentityTask(activeTask)}
            stableHeight={isCompact ? 52 : 52}
            fullWidth
            minWidth={isCompact ? undefined : 190}
            debugId="identity-integrity.active-task-action"
            style={{
              ...identityTaskButtonStyle(),
              borderRadius: 14,
              background:
                activeTask.to || activeTask.key === "recovery"
                  ? "linear-gradient(180deg, #052B58 0%, #031E42 100%)"
                  : "linear-gradient(180deg, #FFFFFF 0%, #FFF7ED 100%)",
              color: activeTask.to || activeTask.key === "recovery" ? "#FFFFFF" : "#92400E",
              border:
                activeTask.to || activeTask.key === "recovery"
                  ? "1px solid rgba(3,30,66,0.18)"
                  : "1px solid rgba(245,158,11,0.24)",
              boxShadow: "none",
            }}
          >
            {activeTask.actionLabel}
          </SecondaryButton>

          <div
            data-identity-integrity-completion-target="true"
            style={{
              ...identityPanelLock(),
              gridColumn: "1 / -1",
              borderRadius: 16,
              border: completionMode
                ? "1px solid rgba(11,99,209,0.18)"
                : "1px solid rgba(37,78,119,0.10)",
              background: completionMode
                ? "linear-gradient(180deg, #F2F8FF 0%, #FFFFFF 100%)"
                : "#FFFFFF",
              padding: isCompact ? 10 : 12,
              display: "grid",
              gap: 8,
            }}
          >
            <div
              style={{
                color: "#07172C",
                fontWeight: 1000,
                fontSize: 13,
                textTransform: "uppercase",
              }}
            >
              Completion path
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : `repeat(${Math.min(activeTask.completionSteps.length, 3)}, minmax(0, 1fr))`,
                gap: 8,
              }}
            >
              {activeTask.completionSteps.map((step, index) => (
                <div
                  key={`${activeTask.key}-${index}`}
                  style={{
                    minHeight: isCompact ? 48 : 42,
                    borderRadius: 13,
                    border: "1px solid rgba(37,78,119,0.10)",
                    background: "#FFFFFF",
                    padding: "8px 10px",
                    color: "#334155",
                    fontSize: 12.5,
                    lineHeight: 1.25,
                    fontWeight: 850,
                  }}
                >
                  {index + 1}. {step}
                </div>
              ))}
            </div>

            {activeTask.key === "phone" && !identitySignals.phoneReady ? (
              <form
                onSubmit={
                  phoneVerificationId
                    ? handleConfirmPhoneVerification
                    : handleStartPhoneVerification
                }
                data-identity-integrity-phone-completion="true"
                style={{
                  ...identityPanelLock(),
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) 160px",
                  gap: 8,
                  alignItems: "end",
                }}
              >
                <label style={{ display: "grid", gap: 5 }}>
                  <span style={{ color: "#334155", fontSize: 12, fontWeight: 1000 }}>
                    Phone number
                  </span>
                  <input
                    value={phoneInput}
                    onChange={(event) => setPhoneInput(event.target.value)}
                    placeholder="+447700900123"
                    disabled={phoneBusy || Boolean(phoneVerificationId)}
                    style={identityCompletionFieldStyle()}
                  />
                </label>
                {phoneVerificationId ? (
                  <label style={{ display: "grid", gap: 5 }}>
                    <span style={{ color: "#334155", fontSize: 12, fontWeight: 1000 }}>
                      Code
                    </span>
                    <input
                      value={phoneCode}
                      onChange={(event) => setPhoneCode(event.target.value)}
                      placeholder="6 digits"
                      style={identityCompletionFieldStyle()}
                    />
                  </label>
                ) : null}
                {phoneOtpPreview ? (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      borderRadius: 13,
                      border: "1px solid rgba(11,99,209,0.14)",
                      background: "#EEF6FF",
                      color: "#073E83",
                      fontSize: 12,
                      fontWeight: 1000,
                      padding: "8px 10px",
                    }}
                  >
                    Pilot code: {phoneOtpPreview}
                  </div>
                ) : null}
                <div
                  data-identity-integrity-phone-response="true"
                  aria-hidden={!phoneTaskMessage}
                  style={{
                    gridColumn: "1 / -1",
                    ...identityResponseSlotStyle(phoneTaskTone, isCompact, Boolean(phoneTaskMessage)),
                  }}
                >
                  {phoneTaskMessage || "Phone task response"}
                </div>
                <PrimaryButton
                  type="submit"
                  disabled={phoneBusy || !phoneInput || (Boolean(phoneVerificationId) && !phoneCode)}
                  stableHeight={52}
                  fullWidth
                  debugId="identity-integrity.phone-completion-submit"
                  style={identityTaskButtonStyle()}
                >
                  {phoneBusy
                    ? "Working..."
                    : phoneVerificationId
                      ? "Confirm phone"
                      : "Start phone check"}
                </PrimaryButton>
              </form>
            ) : null}

            {activeTask.key === "official_id" && !identitySignals.officialIdReady ? (
              <form
                onSubmit={handleRecordOfficialId}
                data-identity-integrity-official-id-completion="true"
                style={{
                  ...identityPanelLock(),
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
                  gap: 8,
                  alignItems: "end",
                }}
              >
                <label style={{ display: "grid", gap: 5 }}>
                  <span style={{ color: "#334155", fontSize: 12, fontWeight: 1000 }}>
                    Document
                  </span>
                  <select
                    value={officialIdType}
                    onChange={(event) => setOfficialIdType(event.target.value)}
                    style={identityCompletionFieldStyle()}
                  >
                    <option>Passport</option>
                    <option>National ID</option>
                    <option>Driving licence</option>
                    <option>Voter card</option>
                    <option>Local official ID</option>
                  </select>
                </label>
                <label style={{ display: "grid", gap: 5 }}>
                  <span style={{ color: "#334155", fontSize: 12, fontWeight: 1000 }}>
                    Reference
                  </span>
                  <input
                    value={officialIdReference}
                    onChange={(event) => setOfficialIdReference(event.target.value)}
                    placeholder="Last digits or reference"
                    style={identityCompletionFieldStyle()}
                  />
                </label>
                <label style={{ display: "grid", gap: 5 }}>
                  <span style={{ color: "#334155", fontSize: 12, fontWeight: 1000 }}>
                    Country
                  </span>
                  <input
                    value={officialIdCountry}
                    onChange={(event) => setOfficialIdCountry(event.target.value)}
                    placeholder="GB, NG, GH..."
                    style={identityCompletionFieldStyle()}
                  />
                </label>

                <div
                  data-identity-integrity-photo-completion="true"
                  style={{
                    ...identityPanelLock(),
                    gridColumn: "1 / -1",
                    borderRadius: 15,
                    border: "1px solid rgba(37,78,119,0.12)",
                    background: "#FFFFFF",
                    padding: 10,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      ...identityPanelLock(),
                      display: "grid",
                      gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: "#07172C", fontSize: 13, fontWeight: 1000 }}>
                        Photo / ID image
                      </div>
                      <div style={{ marginTop: 2, ...compactHelperText() }}>
                        Attach a selfie or an ID photo for review. GSN records it; a provider has not verified it yet.
                      </div>
                    </div>
                    <div
                      style={{
                        ...identityPanelLock(),
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 8,
                      }}
                    >
                      <SecondaryButton
                        type="button"
                        onClick={() => {
                          if (selfiePhotoInputRef.current) {
                            selfiePhotoInputRef.current.value = "";
                            selfiePhotoInputRef.current.click();
                          }
                        }}
                        stableHeight={52}
                        fullWidth
                        debugId="identity-integrity.identity-photo.selfie"
                        style={{ ...identityTaskButtonStyle(), borderRadius: 13 }}
                      >
                        Selfie
                      </SecondaryButton>
                      <SecondaryButton
                        type="button"
                        onClick={() => {
                          if (idPhotoInputRef.current) {
                            idPhotoInputRef.current.value = "";
                            idPhotoInputRef.current.click();
                          }
                        }}
                        stableHeight={52}
                        fullWidth
                        debugId="identity-integrity.identity-photo.id-photo"
                        style={{ ...identityTaskButtonStyle(), borderRadius: 13 }}
                      >
                        ID photo
                      </SecondaryButton>
                    </div>
                  </div>

                  <input
                    ref={selfiePhotoInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={(event) =>
                      handleIdentityPhotoSelected(event.target.files, "selfie")
                    }
                    style={{ display: "none" }}
                    aria-label="Take selfie evidence"
                  />
                  <input
                    ref={idPhotoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) =>
                      handleIdentityPhotoSelected(event.target.files, "identity_photo")
                    }
                    style={{ display: "none" }}
                    aria-label="Choose ID photo evidence"
                  />

                  <div
                    data-identity-integrity-photo-preview-slot="true"
                    style={{
                      ...identityPanelLock(),
                      display: "grid",
                      gridTemplateColumns: isCompact ? "88px minmax(0, 1fr)" : "104px minmax(0, 1fr) auto",
                      gap: 10,
                      alignItems: "center",
                      minHeight: isCompact ? 88 : 98,
                    }}
                  >
                    <div
                      style={{
                        width: isCompact ? 88 : 104,
                        height: isCompact ? 68 : 78,
                        borderRadius: 14,
                        border: "1px solid rgba(37,78,119,0.16)",
                        background: identityPhotoPreview
                          ? "#FFFFFF"
                          : "linear-gradient(180deg, #F8FBFF 0%, #EEF2F7 100%)",
                        display: "grid",
                        placeItems: "center",
                        overflow: "hidden",
                      }}
                    >
                      {identityPhotoPreview ? (
                        <img
                          src={identityPhotoPreview}
                          alt="Selected identity evidence"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <GsnLegacyIcon name="document" size={34} />
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: "#07172C", fontSize: 13, fontWeight: 1000 }}>
                        {identityPhotoPreview
                          ? identityPhotoKind === "selfie"
                            ? "Selfie ready"
                            : "ID photo ready"
                          : "No photo selected"}
                      </div>
                      <div style={{ marginTop: 2, ...compactHelperText() }}>
                        {identityPhotoPreview
                          ? "Tap Record photo evidence to attach it to this identity."
                          : "Choose Selfie or ID photo first. This slot stays still while you pick evidence."}
                      </div>
                    </div>
                    <PrimaryButton
                      type="button"
                      onClick={handleRecordIdentityPhoto}
                      disabled={identityPhotoBusy || !identityPhotoFile}
                      stableHeight={52}
                      fullWidth
                      debugId="identity-integrity.identity-photo.record"
                      style={{
                        ...identityTaskButtonStyle(),
                        borderRadius: 13,
                        gridColumn: isCompact ? "1 / -1" : undefined,
                        visibility: identityPhotoPreview ? "visible" : "hidden",
                        pointerEvents: identityPhotoPreview ? "auto" : "none",
                      }}
                    >
                      {identityPhotoBusy ? "Recording..." : "Record photo evidence"}
                    </PrimaryButton>
                  </div>
                </div>
                <PrimaryButton
                  type="submit"
                  disabled={
                    officialIdBusy ||
                    !officialIdType ||
                    !officialIdReference ||
                    !officialIdCountry
                  }
                  stableHeight={52}
                  fullWidth
                  debugId="identity-integrity.official-id-completion-submit"
                  style={{ ...identityTaskButtonStyle(), gridColumn: "1 / -1" }}
                >
                  {officialIdBusy ? "Recording..." : "Record ID evidence"}
                </PrimaryButton>
              </form>
            ) : null}
            {activeTask.key === "official_id" ? (
              <div
                data-identity-integrity-official-id-response="true"
                aria-hidden={!officialIdTaskMessage}
                style={identityResponseSlotStyle("success", isCompact, Boolean(officialIdTaskMessage))}
              >
                {officialIdTaskMessage || "Official ID task response"}
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <StableCtaLink
            to={routes.trust}
            stableHeight={isCompact ? 52 : 48}
            debugId="identity-integrity.open-trust"
          >
            Trust Passport
          </StableCtaLink>
          <StableCtaLink
            to={routes.trustSlip}
            stableHeight={isCompact ? 52 : 48}
            debugId="identity-integrity.front-trust-slip"
          >
            TrustSlip
          </StableCtaLink>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        {sectionIconHeader(
          "chart",
          "Identity readings",
          "Local trust, wider consistency, and TrustSlip status.",
          <SubtleButton
            onClick={() => toggleSection("summary")}
            stableHeight={52}
            style={collapseToggle()}
            debugId="identity-integrity.toggle-summary"
          >
            {collapsed.summary ? "Open" : "Hide"}
          </SubtleButton>
        )}

        {!collapsed.summary ? (
          <>
            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div style={statTile(openTrustTone.bg, openTrustTone.border)}>
                <div style={sectionLabel()}>Local community trust</div>
                <div
                  style={{
                    marginTop: 8,
                    color: openTrustTone.text,
                    fontWeight: 900,
                    fontSize: 26,
                  }}
                >
                  {openTrustBandLabel}
                </div>
                <div style={{ marginTop: 8, color: "#64748B", fontSize: 13 }}>
                  Current score: {openTrust.scoreText}
                </div>
                <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                  {openTrust.statusText}
                </div>
                <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                  {openTrustBandMeaning.plainMeaning}
                </div>
              </div>

              <div style={statTile(cciTone.bg, cciTone.border)}>
                <div style={sectionLabel()}>Cross-community consistency</div>
                <div
                  style={{
                    marginTop: 8,
                    color: cciTone.text,
                    fontWeight: 900,
                    fontSize: 26,
                  }}
                >
                  {cciBandLabel}
                </div>
                <div style={{ marginTop: 8, color: "#64748B", fontSize: 13 }}>
                  Current score: {cci.scoreText}
                </div>
                <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                  {cci.statusText}
                </div>
                <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                  {cciBandMeaning.plainMeaning}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>TrustSlip</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 20,
                    lineHeight: 1.25,
                    wordBreak: "break-word",
                  }}
                >
                  {trustSlipCode || "Pending"}
                </div>
                <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                  {trustSlipCode
                    ? "Portable verification record ready."
                    : "Portable verification record still preparing."}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                gap: 12,
              }}
            >
              <div style={innerCard("#F8FBFF")}>
                <div style={sectionLabel()}>Local trust meaning</div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  {openTrust.whyText}
                </div>
              </div>

              <div style={innerCard("#F8FBFF")}>
                <div style={sectionLabel()}>Consistency meaning</div>
                <div style={{ marginTop: 8, ...helperText() }}>{cci.whyText}</div>
              </div>
            </div>
          </>
        ) : null}
      </section>

      <section style={pageCard("#FFFFFF")}>
        {sectionIconHeader(
          "shield",
          "Identity continuity",
          "Device and owner-continuity signals stay behind one compact reading.",
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span
              style={{
                ...badge(true),
                background: continuity.tone.bg,
                color: continuity.tone.text,
              }}
            >
              {continuity.label}
            </span>
            <SubtleButton
              onClick={() => toggleSection("continuity")}
              stableHeight={52}
              style={collapseToggle()}
              debugId="identity-integrity.toggle-continuity"
            >
              {collapsed.continuity ? "Open" : "Hide"}
            </SubtleButton>
          </div>
        )}

        {!collapsed.continuity ? (
          <>
            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div style={statTile(continuity.tone.bg, continuity.tone.border)}>
                <div style={sectionLabel()}>Continuity score</div>
                <div
                  style={{
                    marginTop: 8,
                    color: continuity.tone.text,
                    fontWeight: 900,
                    fontSize: 26,
                  }}
                >
                  {continuity.scoreText}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Devices seen</div>
                <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 900, fontSize: 26 }}>
                  {continuity.deviceCount}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Risk signals</div>
                <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 900, fontSize: 26 }}>
                  {continuity.signalCount}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Linked clusters</div>
                <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 900, fontSize: 26 }}>
                  {continuity.clusterCount}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                gap: 12,
              }}
            >
              <div style={innerCard("#F8FBFF")}>
                <div style={sectionLabel()}>Why this reading</div>
                <div style={{ marginTop: 8, ...helperText() }}>{continuity.reason}</div>
              </div>

              <div style={innerCard("#FCFEFF")}>
                <div style={sectionLabel()}>Next protection</div>
                <div style={{ marginTop: 8, ...helperText() }}>{continuity.action}</div>
              </div>
            </div>
          </>
        ) : null}
      </section>

      <section style={pageCard("#FFFFFF")}>
        {sectionIconHeader(
          "lock",
          "Private recovery challenge",
          "Owner-protection prompts stay closed until setup or verification is needed.",
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span style={badge(Boolean(recovery.configured))}>
              {recovery.configured ? "Configured" : "Not configured"}
            </span>
            <SubtleButton
              type="button"
              onClick={() => toggleSection("recovery")}
              stableHeight={isCompact ? 52 : 48}
              style={collapseToggle()}
              debugId="identity-integrity.toggle-recovery"
            >
              {collapsed.recovery && activeIdentityTask !== "recovery" ? "Open" : "Hide"}
            </SubtleButton>
          </div>
        )}

        {recoveryError ? (
          <div style={{ ...noticeCard("error"), marginTop: 14 }}>{recoveryError}</div>
        ) : null}

        {recoverySuccess ? (
          <div style={{ ...noticeCard("success"), marginTop: 14 }}>
            {recoverySuccess}
          </div>
        ) : null}

        {(!collapsed.recovery || activeIdentityTask === "recovery" || recovery.shouldVerify) ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
              gap: 12,
            }}
          >
            <div style={identityRecoveryPanel("#F8FBFF")}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "42px minmax(0, 1fr)",
                  gap: 10,
                  alignItems: "start",
                }}
              >
                <span style={iconTile("#FFFFFF", recovery.configured ? identityIconTone("ready").bg : identityIconTone("watch").bg)}>
                  <GsnLegacyIcon name="lock" size={34} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <div style={sectionLabel()}>Recovery state</div>
                  <div style={{ marginTop: 8, ...helperText() }}>
                    {recovery.configured
                      ? "Private recovery prompts are ready for serious continuity shifts."
                      : "Set three private prompts so GSN can protect the owner during serious continuity changes."}
                  </div>
                </span>
              </div>
              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                {[
                  ["Failed attempts", String(recovery.failedAttempts)],
                  ["Last verified", recovery.lastVerifiedAt ? safeDateTime(recovery.lastVerifiedAt) : "Not yet"],
                  ["Locked until", recovery.lockedUntil ? safeDateTime(recovery.lockedUntil) : "Not locked"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      borderRadius: 14,
                      border: "1px solid rgba(37,78,119,0.10)",
                      background: "#FFFFFF",
                      padding: "10px 12px",
                      minWidth: 0,
                    }}
                  >
                    <div style={{ ...sectionLabel(), fontSize: 10 }}>{label}</div>
                    <div
                      style={{
                        marginTop: 5,
                        color: "#07172C",
                        fontWeight: 950,
                        fontSize: 13,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={identityRecoveryPanel("#FCFEFF")}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "42px minmax(0, 1fr)",
                  gap: 10,
                  alignItems: "start",
                }}
              >
                <span style={iconTile("#FFFFFF", identityIconTone("neutral").bg)}>
                  <GsnLegacyIcon name="document" size={34} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <div style={sectionLabel()}>When used</div>
                  <div style={{ marginTop: 8, ...helperText() }}>
                    Use it only when device or owner-continuity signals need a stronger check.
                  </div>
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {!recovery.configured &&
        (!collapsed.recovery || activeIdentityTask === "recovery" || recovery.shouldVerify) ? (
          <form
            data-identity-integrity-recovery-setup="true"
            onSubmit={handleRecoverySetup}
            onClick={(event) => event.stopPropagation()}
            style={{ marginTop: 14, display: "grid", gap: 12 }}
          >
            {recoveryPrompts.map((item, index) => (
              <div key={`recovery-setup-${index}`} style={identityRecoveryPanel("#FFFFFF")}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={taskIconBadge(true, index === 0 ? "ready" : index === 1 ? "watch" : "neutral")}>
                    <GsnLegacyIcon name="lock" size={28} />
                  </span>
                  <div style={sectionLabel()}>Private prompt {index + 1}</div>
                </div>
                <input
                  value={item.prompt}
                  onChange={(e) =>
                    setRecoveryPrompts((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, prompt: e.target.value } : row
                      )
                    )
                  }
                  placeholder="Write a private prompt only you can answer"
                  style={identityRecoveryInput()}
                />
                <input
                  value={item.answer}
                  onChange={(e) =>
                    setRecoveryPrompts((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, answer: e.target.value } : row
                      )
                    )
                  }
                  placeholder="Write the answer exactly the way you want to remember it"
                  style={identityRecoveryInput()}
                />
              </div>
            ))}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <PrimaryButton
                type="submit"
                busy={recoveryBusy}
                busyLabel="Saving..."
                stableHeight={isCompact ? 52 : 50}
                fullWidth={isCompact}
                minWidth={isCompact ? undefined : 210}
                debugId="identity-integrity.recovery-save"
                style={identityRecoveryActionStyle()}
              >
                <GsnLegacyIcon name="lock" size={32} />
                Save private recovery
              </PrimaryButton>
            </div>
          </form>
        ) : null}

        {recovery.shouldVerify &&
        (!collapsed.recovery || activeIdentityTask === "recovery" || recovery.shouldVerify) ? (
          <form
            data-identity-integrity-recovery-verify="true"
            onSubmit={handleRecoveryVerify}
            onClick={(event) => event.stopPropagation()}
            style={{ marginTop: 14, display: "grid", gap: 12 }}
          >
            <div style={identityRecoveryPanel("#FFF7ED")}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "42px minmax(0, 1fr)",
                  gap: 10,
                  alignItems: "start",
                }}
              >
                <span style={iconTile("#3B2504", identityIconTone("pending").bg)}>
                  <GsnLegacyIcon name="shield" size={34} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <div style={sectionLabel()}>Recovery check needed now</div>
                  <div style={{ marginTop: 8, ...helperText() }}>
                    Identity continuity is currently asking for a stronger owner check. Answer the
                    private prompts exactly as you configured them.
                  </div>
                </span>
              </div>
            </div>

            {recovery.prompts.map((prompt, index) => (
              <div key={`recovery-verify-${index}`} style={identityRecoveryPanel("#FFFFFF")}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={taskIconBadge(true, "watch")}>
                    <GsnLegacyIcon name="lock" size={28} />
                  </span>
                  <div style={sectionLabel()}>{prompt}</div>
                </div>
                <input
                  value={recoveryAnswers[index] || ""}
                  onChange={(e) =>
                    setRecoveryAnswers((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? e.target.value : item
                      )
                    )
                  }
                  placeholder="Enter your private answer"
                  style={identityRecoveryInput()}
                />
              </div>
            ))}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <PrimaryButton
                type="submit"
                busy={recoveryBusy}
                busyLabel="Checking..."
                disabled={recovery.locked}
                stableHeight={isCompact ? 58 : 54}
                fullWidth={isCompact}
                minWidth={isCompact ? undefined : 280}
                debugId="identity-integrity.recovery-verify"
                style={identityRecoveryActionStyle()}
              >
                <GsnLegacyIcon name="shield" size={32} />
                Verify private recovery
              </PrimaryButton>
            </div>
          </form>
        ) : null}
      </section>

      <section style={pageCard("#FFFFFF")}>
        {sectionIconHeader(
          "search",
          "Why identity and trust changed",
          "What helped, what weakened, and the next repair line.",
          <SubtleButton
            onClick={() => toggleSection("reasons")}
            stableHeight={52}
            style={collapseToggle()}
            debugId="identity-integrity.toggle-reasons"
          >
            {collapsed.reasons ? "Open" : "Hide"}
          </SubtleButton>
        )}

        {!collapsed.reasons ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={innerCard("#F8FBFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                What helped
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {explainers.helps.slice(0, 4).map((item, index) => (
                  <div key={`help-${index}`} style={helperText()}>
                    {item}
                  </div>
                ))}

                {explainers.helps.length === 0 ? (
                  <div style={helperText()}>
                    No positive movement explanation is currently shown.
                  </div>
                ) : null}
              </div>
            </div>

            <div style={innerCard("#FFFBEF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                What weakened identity or trust
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {explainers.weakens.slice(0, 4).map((item, index) => (
                  <div key={`weak-${index}`} style={helperText()}>
                    {item}
                  </div>
                ))}

                {explainers.weakens.length === 0 ? (
                  <div style={helperText()}>
                    No weakening signal is currently shown.
                  </div>
                ) : null}
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                What improves next
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {explainers.next.slice(0, 4).map((item, index) => (
                  <div key={`next-${index}`} style={helperText()}>
                    {item}
                  </div>
                ))}

                {explainers.next.length === 0 ? (
                  <div style={helperText()}>
                    No next-step improvement line is currently shown.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section style={pageCard("#FFFFFF")}>
        {sectionIconHeader(
          "calendar",
          "Identity and trust timeline",
          "Recent visible movement behind this identity position.",
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(false)}>
              {timelineRows.length} recent event{timelineRows.length === 1 ? "" : "s"}
            </span>
            <SubtleButton
              onClick={() => toggleSection("timeline")}
              stableHeight={52}
              style={collapseToggle()}
              debugId="identity-integrity.toggle-timeline"
            >
              {collapsed.timeline ? "Open" : "Hide"}
            </SubtleButton>
          </div>
        )}

        {!collapsed.timeline ? (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {timelineRows.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No recent identity or trust event is currently shown.
              </div>
            ) : (
              timelineRows.map((row) => {
                const tone = eventTone(row.kind);

                return (
                  <div
                    key={row.id}
                    style={{
                      ...innerCard(tone.bg),
                      display: "grid",
                      gridTemplateColumns: "18px minmax(0, 1fr)",
                      gap: 12,
                      alignItems: "start",
                    }}
                  >
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 999,
                        background: tone.dot,
                        marginTop: 6,
                      }}
                    />

                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            color: "#0B1F33",
                            fontWeight: 900,
                            lineHeight: 1.35,
                          }}
                        >
                          {row.label}
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span style={badge(true)}>{tone.label}</span>
                          {row.createdAt ? (
                            <span style={badge(false)}>
                              {safeDateTime(row.createdAt)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : null}
      </section>

      <section style={pageCard("#FFFFFF")}>
        {sectionIconHeader(
          "spark",
          "Next clean step",
          "The next useful move after the identity reading.",
          <SubtleButton
            onClick={() => toggleSection("next")}
            stableHeight={52}
            style={collapseToggle()}
            debugId="identity-integrity.toggle-next"
          >
            {collapsed.next ? "Open" : "Hide"}
          </SubtleButton>
        )}

        {!collapsed.next ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.1fr) 320px",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: isCompact ? 22 : 28,
                  lineHeight: 1.15,
                }}
              >
                {nextMoveTitle}
              </div>

              <div style={{ marginTop: 12, ...helperText() }}>
                {nextMoveDetail}
              </div>

              <CardActionRow style={{ marginTop: 16 }}>
                <StableCtaLink
                  to={nextMoveTo}
                  kind="primary"
                  stableHeight={isCompact ? 52 : 50}
                  fullWidth={isCompact}
                  minWidth={isCompact ? undefined : 210}
                  debugId="identity-integrity.next-move"
                >
                  {nextMoveLabel}
                </StableCtaLink>

                <StableCtaLink
                  to={routes.trustSlip}
                  stableHeight={isCompact ? 52 : 50}
                  fullWidth={isCompact}
                  minWidth={isCompact ? undefined : 132}
                  debugId="identity-integrity.open-trust-slip"
                >
                  TrustSlip
                </StableCtaLink>

                <StableCtaLink
                  to={routes.notifications}
                  stableHeight={isCompact ? 52 : 50}
                  fullWidth={isCompact}
                  minWidth={isCompact ? undefined : 146}
                  debugId="identity-integrity.open-notifications"
                >
                  Action Inbox
                </StableCtaLink>
              </CardActionRow>
            </div>

            <div style={softCard("#F8FBFF")}>
              <div style={sectionLabel()}>Why this page matters</div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <div style={helperText()}>
                  Identity is the stable layer. It should not split from one community to another.
                </div>
                <div style={helperText()}>
                  Cross-community consistency helps you see how steadily your identity and trust signals hold across visible communities.
                </div>
                <div style={helperText()}>
                  Local community trust shows your immediate community standing.
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <NextActionGuide
        storageKey="gmfn.identityIntegrity.nextActionGuide.v1"
        compact={isCompact}
        items={guideItems}
        intro="Say what you need next in plain words like open Trust Passport, check consistency, or open the portable record. GSN will carry you into the closest trust document surface."
        onSelect={handleGuideSelect}
      />

      <TrustDocumentActionGuide content={actionGuide} compact={isCompact} />

      <TrustDocumentFamilyMap
        compact={isCompact}
        items={trustDocumentFamilyItems}
        title="How Identity & Integrity fits into the wider trust-document family"
        intro="Identity & Integrity is the steady anchor under the trust family. Use this map when you need to separate stable identity and continuity from the fuller Trust Passport story, portable TrustSlip evidence, and public validity checks."
      />

      <TrustDocumentUseCases
        compact={isCompact}
        items={trustDocumentUseCases}
        title="Which trust question should stay with identity first?"
        intro="Stay here when the question is who this person is, what holds steady across trust changes, or what narrower verification and consistency context sits behind the trust story."
      />
    </div>
  );
}

function continuityTone(
  status: string
): { bg: string; border: string; text: string; label: string } {
  const value = safeStr(status).toLowerCase();
  if (value === "protected_lock") {
    return {
      bg: "#FEF2F2",
      border: "1px solid rgba(239,68,68,0.16)",
      text: "#991B1B",
      label: "Protected lock",
    };
  }
  if (value === "reverify_required") {
    return {
      bg: "#FFF7ED",
      border: "1px solid rgba(245,158,11,0.16)",
      text: "#9A3412",
      label: "Reverification required",
    };
  }
  if (value === "watch") {
    return {
      bg: "#F8FBFF",
      border: "1px solid rgba(11,99,209,0.12)",
      text: "#0B63D1",
      label: "Watch",
    };
  }
  return {
    bg: "#F0FDF4",
    border: "1px solid rgba(34,197,94,0.16)",
    text: "#166534",
    label: "Trusted",
  };
}
