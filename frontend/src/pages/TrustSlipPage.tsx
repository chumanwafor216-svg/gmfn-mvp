import React, { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useLocation, useNavigate } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import NextActionGuide from "../components/NextActionGuide";
import PageTopNav from "../components/PageTopNav";
import {
  CardActionRow,
  PrimaryButton,
  SecondaryButton,
  StableCtaLink,
  SubtleButton,
} from "../components/StableButton";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import {
  TrustPaperSeal,
  TrustPaperSecurityFooter,
  TrustPaperWatermark,
} from "../components/TrustPaperMarks";
import TrustDocumentActionGuide from "../components/TrustDocumentActionGuide";
import TrustDocumentFamilyMap from "../components/TrustDocumentFamilyMap";
import TrustDocumentUseCases from "../components/TrustDocumentUseCases";
import TrustSlipReaderBlock from "../components/TrustSlipReaderBlock";
import * as api from "../lib/api";
import { navigateWithOrigin } from "../lib/nav";
import { resolveSharedProfileImage } from "../lib/profileImage";
import { publicCommunityMemberCredentialPath } from "../lib/publicLinks";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import { buildTrustSlipActionGuide } from "../lib/trustDocumentActionGuide";
import { buildTrustDocumentFamilyItems } from "../lib/trustDocumentFamilyMap";
import { buildTrustDocumentUseCaseItems } from "../lib/trustDocumentUseCases";
import { buildTrustSlipGuideItems } from "../lib/trustDocumentGuide";
import { buildTrustSlipSnapshot } from "../lib/trustDocumentSnapshots";
import {
  getTrustBandShortLabel,
  getTrustEvidenceLanguage,
  normalizeTrustBand,
  TRUST_BAND_SHORT_LABELS,
} from "../lib/trustBandLanguage";

type NoticeTone = "success" | "error";

type CollapseState = {
  nextActions: boolean;
  actionGuide: boolean;
  family: boolean;
  useCases: boolean;
  summary: boolean;
  reader: boolean;
  merchantVerify: boolean;
  merchantView: boolean;
  evidence: boolean;
  notes: boolean;
};

type MerchantSummary = {
  gmfn_id?: string | null;
  code?: string | null;
  trust_limit?: string | null;
  currency?: string | null;
  cci_score?: string | null;
  cci_band?: string | null;
  sponsor_count?: number | null;
  display_name?: string | null;
  community?: string | null;
  band?: string | null;
  expires_at?: string | null;
  expiry_policy?: string | null;
  phone_verified?: boolean | null;
  profile_image_url?: string | null;
  community_global_id?: string | null;
  holder_role?: string | null;
  active_member_count?: string | number | null;
  member_witness_count?: string | number | null;
  membership_strength_label?: string | null;
  membership_renewal_status_label?: string | null;
  membership_valid_until?: string | null;
  next_witness_renewal_at?: string | null;
  next_witness_renewal_status_label?: string | null;
  membership_currentness_label?: string | null;
  membership_currentness_scope?: string | null;
  community_activity_count?: string | number | null;
  community_activity_latest_at?: string | null;
  community_activity_categories?: string[] | null;
  community_activity_label?: string | null;
  cci_explainer?: Record<string, any> | null;
  identity_status_label?: string | null;
  bank_verified?: boolean | null;
  bank_verification_label?: string | null;
  passport_verified?: boolean | null;
  passport_verification_label?: string | null;
  community_identity_confirmed?: boolean | null;
  community_identity_label?: string | null;
};

type MerchantView = {
  visibility_level?: string | null;
  verified?: boolean | null;
  active?: boolean | null;
  status?: string | null;
  code?: string | null;
  gmfn_id?: string | null;
  display_name?: string | null;
  profile_image_url?: string | null;
  community?: string | null;
  identity_context?: Record<string, any> | null;
  community_context?: Record<string, any> | null;
  cci_explainer?: Record<string, any> | null;
  identity_status_label?: string | null;
  community_global_id?: string | null;
  holder_role?: string | null;
  active_member_count?: string | number | null;
  member_witness_count?: string | number | null;
  membership_strength_label?: string | null;
  membership_renewal_status_label?: string | null;
  membership_valid_until?: string | null;
  next_witness_renewal_at?: string | null;
  next_witness_renewal_status_label?: string | null;
  membership_currentness_label?: string | null;
  membership_currentness_scope?: string | null;
  community_activity_count?: string | number | null;
  community_activity_latest_at?: string | null;
  community_activity_categories?: string[] | null;
  community_activity_label?: string | null;
  band?: string | null;
  trust_limit?: string | null;
  currency?: string | null;
  expires_at?: string | null;
  expiry_policy?: string | null;
  phone_verified?: boolean | null;
  bank_verified?: boolean | null;
  bank_verification_label?: string | null;
  passport_verified?: boolean | null;
  passport_verification_label?: string | null;
  community_identity_confirmed?: boolean | null;
  community_identity_label?: string | null;
  merchant_summary?: MerchantSummary | null;
  not_a_bank_guarantee?: boolean | null;
  no_auto_debit?: boolean | null;
  disclaimer?: string | null;
  cci_score?: string | null;
  cci_band?: string | null;
  sponsor_count?: number | null;
  sponsors?: any[];
};

type CapacityContext = {
  available_guarantee_capacity?: string | null;
  current_locked_guarantees?: string | null;
  overexposure_ratio?: string | null;
  risk_level?: string | null;
  reasons?: string[];
};

type EvidenceSummary = {
  capacity_context?: CapacityContext | null;
  readiness_context?: Record<string, any> | null;
  commitment_discipline?: Record<string, any> | null;
  personal_commitment_discipline?: Record<string, any> | null;
  human_terms?: Record<string, string> | null;
};

type CommunityConfirmationSummary = {
  community_status?: string | null;
  community_name?: string | null;
  community_id?: string | number | null;
  community_code?: string | null;
  approval_type?: string | null;
  active_member_count?: string | number | null;
  contactable_reference_count?: string | number | null;
  sponsor_signal_count?: string | number | null;
  last_community_confirmation?: string | null;
  relay_available?: boolean | null;
  instant_pulse_available?: boolean | null;
  request_action?: string | null;
  plain_language?: string | null;
};

type TrustSlipSummary = {
  verified?: boolean | null;
  active?: boolean | null;
  user_id?: number | null;
  clan_id?: number | null;
  gmfn_id?: string | null;
  display_name?: string | null;
  profile_image_url?: string | null;
  identity_context?: Record<string, any> | null;
  community_context?: Record<string, any> | null;
  community_confirmation?: CommunityConfirmationSummary | null;
  cci_explainer?: Record<string, any> | null;
  identity_verified?: boolean | null;
  identity_status_label?: string | null;
  community?: string | null;
  owner?: {
    user_id?: number | null;
    gmfn_id?: string | null;
    email?: string | null;
    phone_e164?: string | null;
    phone_verified?: boolean | null;
  } | null;
  phone_e164?: string | null;
  phone_verified?: boolean | null;
  bank_verified?: boolean | null;
  bank_verification_label?: string | null;
  passport_verified?: boolean | null;
  passport_verification_label?: string | null;
  community_identity_confirmed?: boolean | null;
  community_identity_label?: string | null;
  level?: string | null;
  band?: string | null;
  level_label?: string | null;
  lifetime_trust?: string | null;
  standing_score?: string | null;
  trust_score?: string | null;
  trust_slip_limit?: string | null;
  trust_limit?: string | null;
  currency?: string | null;
  status?: string | null;
  code?: string | null;
  created_at?: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
  expiry_policy?: string | null;
  last_release_at?: string | null;
  last_full_repayment_at?: string | null;
  days_since_last_full_repayment?: number | null;
  cci_score?: string | null;
  cci_band?: string | null;
  graph_score?: string | null;
  active_clan_count?: number | null;
  sponsor_count?: number | null;
  unique_counterparties?: number | null;
  risk_flags?: string[];
  sponsors?: any[];
  internal_contacts?: any[];
  evidence_summary?: EvidenceSummary | null;
  merchant_summary?: MerchantSummary | null;
  merchant_visibility_level?: string | null;
  visibility_options?: string[];
  is_current?: boolean | null;
  issued_reason?: string | null;
  supersedes_trust_slip_id?: number | null;
  superseded_by_trust_slip_id?: number | null;
  not_a_bank_guarantee?: boolean | null;
  no_auto_debit?: boolean | null;
  disclaimer?: string | null;
  generated_at?: string | null;
  merchant_view?: MerchantView | null;
  verification_token?: string | null;
  verification_code?: string | null;
  token?: string | null;
  public_verify_url?: string | null;
  community_id?: string | null;
  community_global_id?: string | null;
  community_code?: string | null;
  clan_code?: string | null;
  holder_role?: string | null;
  community_member_count?: string | number | null;
  active_member_count?: string | number | null;
  member_witness_count?: string | number | null;
  membership_strength_label?: string | null;
  membership_renewal_status_label?: string | null;
  membership_valid_until?: string | null;
  next_witness_renewal_at?: string | null;
  next_witness_renewal_status_label?: string | null;
  membership_currentness_label?: string | null;
  membership_currentness_scope?: string | null;
  community_activity_count?: string | number | null;
  community_activity_latest_at?: string | null;
  community_activity_categories?: string[] | null;
  community_activity_label?: string | null;
  total_member_count?: string | number | null;
};

type CommunityConfirmationOutcome = {
  public_token?: string | null;
  status?: string | null;
  mode?: string | null;
  visible_summary?: string | null;
  privacy_note?: string | null;
  decision_note?: string | null;
  community_response?: {
    requests_sent?: number | null;
    active_member_count?: number | null;
    responses_received?: number | null;
    confirmed_known_count?: number | null;
    caution_count?: number | null;
    objection_count?: number | null;
    community_confidence?: string | null;
    private_contacts_exposed?: boolean | null;
  } | null;
};

const TRUST_SLIP_UI_STORAGE_KEY = "gmfn.trustSlip.sections.v4";
const GMFN_EXEC_SUMMARY_URL = "/gmfn-executive-summary.pdf";
const TRUST_SLIP_MOBILE_SCROLL_CLEARANCE = 116;

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

function firstStringList(...values: any[]): string[] {
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    const items = value.map((item) => safeStr(item)).filter(Boolean);
    if (items.length) return items;
  }
  return [];
}

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function isPastDate(value: any): boolean {
  const raw = safeStr(value);
  if (!raw) return false;
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) && d.getTime() < Date.now();
}

function countText(value: any): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? String(n) : "0";
}

function numericCount(value: any): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function countOrNotProvided(value: any): string {
  if (value === null || value === undefined || value === "") return "Not provided";
  const n = Number(value);
  return Number.isFinite(n) ? `${n} recorded` : safeStr(value);
}

function apiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";
  return String(raw || "").trim().replace(/\/+$/, "");
}

function joinUrl(root: string, path: string): string {
  const cleanRoot = safeStr(root).replace(/\/+$/, "");
  const cleanPath = safeStr(path).startsWith("/")
    ? safeStr(path)
    : `/${safeStr(path)}`;

  return `${cleanRoot}${cleanPath}`;
}

function toFrontendAbsoluteUrl(pathOrUrl: string): string {
  const raw = safeStr(pathOrUrl);
  if (!raw) return "";

  try {
    const base =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "";
    const url = new URL(raw, base || "https://gsn.local");
    const path = `${url.pathname}${url.search}${url.hash}`;
    return base ? `${base}${path}` : path;
  } catch {
    return raw;
  }
}

function trustSlipVerifyFrontendPath(code: string, fallback = ""): string {
  const cleanCode = safeStr(code);
  if (cleanCode) {
    return `/trust-slips/verify/${encodeURIComponent(cleanCode)}/page`;
  }

  const rawFallback = safeStr(fallback);
  if (!rawFallback) return "";

  try {
    const url = new URL(rawFallback, "https://gsn.local");
    if (url.pathname.startsWith("/trust-slips/verify")) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    // Fall through to the raw fallback below.
  }

  return rawFallback.startsWith("/trust-slips/verify") ? rawFallback : "";
}

async function fetchFirstJson(
  paths: string[],
  extraHeaders: Record<string, string> = {}
): Promise<any | null> {
  const bases = [apiBase()];

  if (typeof window !== "undefined") {
    bases.push(`${window.location.origin}/api`);
  }

  const uniqueBases = Array.from(
    new Set(bases.map((item) => safeStr(item)).filter(Boolean))
  );

  const token =
    typeof (api as any).getAccessToken === "function"
      ? (api as any).getAccessToken()
      : "";

  for (const base of uniqueBases) {
    for (const path of paths) {
      try {
        const headers: Record<string, string> = {
          accept: "application/json",
          ...extraHeaders,
        };

        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(joinUrl(base, path), {
          method: "GET",
          headers,
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) continue;

        const contentType = String(
          res.headers.get("content-type") || ""
        ).toLowerCase();

        if (!contentType.includes("application/json")) continue;

        return await res.json();
      } catch {
        // continue
      }
    }
  }

  return null;
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(108,138,184,0.18)",
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, #FFFFFF 0%, #F3F8FF 100%)"
        : bg,
    padding: 20,
    boxShadow:
      "0 24px 52px rgba(15,23,42,0.08), 0 3px 10px rgba(15,23,42,0.03)",
    overflow: "hidden",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(123,153,197,0.18)",
    background:
      bg === "#F8FBFF"
        ? "linear-gradient(180deg, #FCFEFF 0%, #EDF5FF 100%)"
        : bg,
    padding: 16,
    boxShadow: "0 18px 40px rgba(15,23,42,0.06)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(125,154,196,0.18)",
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)"
        : bg,
    padding: 16,
    boxShadow: "0 16px 34px rgba(15,23,42,0.05)",
  };
}

function statTile(
  bg = "#FFFFFF",
  border = "1px solid rgba(11,31,51,0.08)"
): React.CSSProperties {
  return {
    borderRadius: 18,
    border:
      border === "1px solid rgba(11,31,51,0.08)"
        ? "1px solid rgba(125,154,196,0.18)"
        : border,
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)"
        : bg,
    padding: 14,
    boxShadow: "0 14px 28px rgba(15,23,42,0.045)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#39526C",
    fontWeight: 1000,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 32,
    borderRadius: 999,
    padding: "7px 12px",
    background: primary
      ? "linear-gradient(180deg, rgba(29,95,212,0.14) 0%, rgba(29,95,212,0.09) 100%)"
      : "linear-gradient(180deg, rgba(130,146,172,0.16) 0%, rgba(130,146,172,0.10) 100%)",
    border: primary
      ? "1px solid rgba(29,95,212,0.16)"
      : "1px solid rgba(130,146,172,0.14)",
    color: primary ? "#164AAE" : "#445C75",
    fontSize: 12,
    fontWeight: 1000,
    whiteSpace: "normal",
  };
}

function statusPillStyle(status: string): React.CSSProperties {
  const text = safeStr(status).toLowerCase();
  const positive =
    text.includes("strong") ||
    text.includes("verified") ||
    text.includes("valid") ||
    text.includes("acceptable") ||
    text === "yes";
  const pressure =
    text.includes("caution") ||
    text.includes("pressure") ||
    text.includes("refresh") ||
    text.includes("expired") ||
    text.includes("limited") ||
    text.includes("high");
  const pending = text.includes("mixed") || text.includes("pending");

  return {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 27,
    borderRadius: 8,
    padding: "4px 10px",
    color: positive
      ? "#166534"
      : pressure
        ? "#991B1B"
        : pending
          ? "#92400E"
          : "#334155",
    background: positive
      ? "#EAF7EE"
      : pressure
        ? "#FFF1F2"
        : pending
          ? "#FFF7E6"
          : "#F1F5F9",
    border: `1px solid ${
      positive
        ? "rgba(46,155,98,0.18)"
        : pressure
          ? "rgba(200,58,58,0.18)"
          : pending
            ? "rgba(245,158,11,0.18)"
            : "rgba(100,116,139,0.14)"
    }`,
    fontSize: 12,
    fontWeight: 1000,
    textAlign: "center",
  };
}

function collapseToggle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 auto",
    boxSizing: "border-box",
    minHeight: 40,
    minWidth: 96,
    padding: "9px 13px",
    borderRadius: 13,
    border: "1px solid rgba(121,149,190,0.18)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #F2F7FF 100%)",
    color: "#24415C",
    boxShadow: "0 10px 22px rgba(15,23,42,0.06)",
    fontWeight: 900,
    fontSize: 13,
    lineHeight: 1.1,
    textAlign: "center",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

function disclosureShell(): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(16,37,59,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,250,254,0.93) 100%)",
    padding: 14,
    boxShadow: "0 16px 34px rgba(15,23,42,0.045)",
    overflowAnchor: "none",
  };
}

function disclosureBody(): React.CSSProperties {
  return {
    marginTop: 12,
    display: "grid",
    gap: 12,
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#4F657B",
    fontSize: 14.5,
    lineHeight: 1.75,
  };
}

function trustSlipScrollClearance(isCompact: boolean): React.CSSProperties {
  return {
    scrollMarginTop: isCompact ? TRUST_SLIP_MOBILE_SCROLL_CLEARANCE : 24,
  };
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

function qrBoxStyle(size = 110): React.CSSProperties {
  return {
    width: size,
    height: size,
    borderRadius: 12,
    border: "1px solid rgba(11,31,51,0.12)",
    background: "#FFFFFF",
    padding: 6,
    display: "grid",
    placeItems: "center",
    boxShadow: "inset 0 0 0 3px rgba(248,251,255,0.92)",
  };
}

function trustSlipPageShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    margin: "-18px",
    padding: "22px 14px 34px",
    background: "linear-gradient(180deg, #FFFFFF 0%, #F6F8FB 42%, #F2F6FA 100%)",
  };
}

function trustSlipWorkArea(): React.CSSProperties {
  return {
    width: "min(100%, 940px)",
    margin: "0 auto",
    display: "grid",
    gap: 14,
  };
}

function trustSlipHeroCard(): React.CSSProperties {
  return {
    position: "relative",
    overflow: "hidden",
    minHeight: 168,
    borderRadius: 14,
    padding: "28px 34px",
    background: "linear-gradient(135deg, #08233A 0%, #061827 100%)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 18px 42px rgba(7,23,44,0.18)",
    color: "#FFFFFF",
  };
}

function trustSlipSectionCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...innerCard(bg),
    borderRadius: 12,
    border: "1px solid rgba(37,78,119,0.10)",
    background: bg,
    boxShadow: "0 10px 26px rgba(7,23,44,0.06)",
  };
}

function trustSlipPaperTitle(compact = false): React.CSSProperties {
  return {
    margin: 0,
    color: "#07172C",
    fontSize: compact ? 20 : 22,
    lineHeight: 1.1,
    fontWeight: 1000,
  };
}

function trustSlipPrimaryActionStyle(compact = false): React.CSSProperties {
  return {
    width: "100%",
    borderRadius: 11,
    background: "linear-gradient(135deg, #0B63D1 0%, #0648A8 100%)",
    color: "#FFFFFF",
    boxShadow: "0 10px 20px rgba(11,99,209,0.18)",
    fontWeight: 1000,
    fontSize: compact ? 14 : 15,
    letterSpacing: 0,
  };
}

function trustSlipActionButtonStyle(compact = false): React.CSSProperties {
  return {
    borderRadius: 11,
    fontSize: compact ? 13 : 14,
    fontWeight: 950,
    boxShadow: "0 8px 18px rgba(7,23,44,0.05)",
  };
}

function trustSlipTinyIconCircle(ok = true): React.CSSProperties {
  return {
    width: 24,
    height: 24,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    color: ok ? "#166534" : "#B45309",
    background: ok ? "#F0FBF4" : "#FFF7E6",
    border: `1px solid ${ok ? "rgba(46,155,98,0.20)" : "rgba(214,170,69,0.28)"}`,
    flex: "0 0 auto",
  };
}

function trustSlipIconBadge(
  name: GsnIconName,
  size = 28,
  tone: "navy" | "blue" | "green" | "amber" | "red" = "navy"
): React.ReactElement {
  const palette = {
    navy: {
      color: "#EAF3FF",
      background:
        "linear-gradient(180deg, rgba(28,76,122,0.98) 0%, rgba(7,28,47,0.98) 100%)",
      border: "1px solid rgba(196,216,238,0.22)",
    },
    blue: {
      color: "#EAF3FF",
      background: "linear-gradient(180deg, #2367D1 0%, #0B3E78 100%)",
      border: "1px solid rgba(123,161,204,0.28)",
    },
    green: {
      color: "#ECFDF5",
      background: "linear-gradient(180deg, #2E9B62 0%, #12653C 100%)",
      border: "1px solid rgba(167,243,208,0.28)",
    },
    amber: {
      color: "#FFF7E6",
      background: "linear-gradient(180deg, #D6AA45 0%, #9A6817 100%)",
      border: "1px solid rgba(252,211,77,0.30)",
    },
    red: {
      color: "#FEF2F2",
      background: "linear-gradient(180deg, #C83A3A 0%, #7F1D1D 100%)",
      border: "1px solid rgba(254,202,202,0.30)",
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
          "0 9px 18px rgba(2,6,23,0.22), inset 0 1px 0 rgba(255,255,255,0.12)",
        ...palette,
      }}
    >
      <GsnLegacyIcon name={name} size={Math.max(24, Math.round(size * 0.9))} />
    </span>
  );
}

function TrustSlipQrCode({
  value,
  size = 98,
}: {
  value: string;
  size?: number;
}) {
  return (
    <div style={qrBoxStyle(size + 12)}>
      <QRCodeSVG
        value={value}
        size={size}
        bgColor="#FFFFFF"
        fgColor="#07172C"
        level="M"
        marginSize={1}
      />
    </div>
  );
}

function documentMetaCard(bg = "#F7FAFC"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(148,163,184,0.18)",
    background: bg,
    padding: 14,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45)",
  };
}

function documentFrameStyle(): React.CSSProperties {
  return {
    position: "relative",
    overflow: "hidden",
    border: "1px solid rgba(148,163,184,0.2)",
    boxShadow:
      "0 22px 58px rgba(2,6,23,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
  };
}

function documentWatermarkStyle(): React.CSSProperties {
  return {
    position: "absolute",
    top: 18,
    right: -14,
    transform: "rotate(-90deg)",
    transformOrigin: "top right",
    letterSpacing: 3.4,
    fontSize: 11,
    fontWeight: 900,
    color: "rgba(215,227,241,0.2)",
    pointerEvents: "none",
    textTransform: "uppercase",
  };
}

function documentFooterGrid(isCompact: boolean): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 1,
    marginTop: 18,
    paddingTop: 14,
    borderTop: "1px solid rgba(215,227,241,0.16)",
    display: "grid",
    gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
    gap: 12,
  };
}

function documentFooterLabel(): React.CSSProperties {
  return {
    fontSize: 11,
    letterSpacing: 0.28,
    fontWeight: 900,
    textTransform: "uppercase",
    color: "#AFC4D9",
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
    nextActions: true,
    actionGuide: true,
    family: true,
    useCases: true,
    summary: false,
    reader: true,
    merchantVerify: true,
    merchantView: true,
    evidence: true,
    notes: true,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    nextActions: Boolean(raw?.nextActions ?? base.nextActions),
    actionGuide: Boolean(raw?.actionGuide ?? base.actionGuide),
    family: Boolean(raw?.family ?? base.family),
    useCases: Boolean(raw?.useCases ?? base.useCases),
    summary: Boolean(raw?.summary ?? base.summary),
    reader: Boolean(raw?.reader ?? base.reader),
    merchantVerify: Boolean(raw?.merchantVerify ?? base.merchantVerify),
    merchantView: Boolean(raw?.merchantView ?? base.merchantView),
    evidence: Boolean(raw?.evidence ?? base.evidence),
    notes: Boolean(raw?.notes ?? base.notes),
  };
}

function normalizeTrustSlipSummary(raw: any): TrustSlipSummary | null {
  if (!raw) return null;

  const src = raw?.item || raw?.summary || raw?.trust_slip || raw?.data || raw;
  if (!src || typeof src !== "object") return null;

  return {
    verified: src?.verified,
    active: src?.active,
    user_id: src?.user_id,
    clan_id: src?.clan_id,
    gmfn_id: firstTruthy(src?.gmfn_id),
    display_name: firstTruthy(src?.display_name),
    profile_image_url: firstTruthy(src?.profile_image_url),
    identity_context: src?.identity_context || null,
    community_context: src?.community_context || null,
    community_confirmation: src?.community_confirmation || null,
    cci_explainer: src?.cci_explainer || null,
    identity_verified: src?.identity_verified ?? null,
    identity_status_label: firstTruthy(src?.identity_status_label),
    community: firstTruthy(src?.community),
    owner: src?.owner || null,
    phone_e164: firstTruthy(src?.phone_e164),
    phone_verified: src?.phone_verified,
    level: firstTruthy(src?.level),
    band: firstTruthy(src?.band),
    level_label: firstTruthy(src?.level_label),
    lifetime_trust: firstTruthy(src?.lifetime_trust),
    standing_score: firstTruthy(src?.standing_score),
    trust_score: firstTruthy(src?.trust_score),
    trust_slip_limit: firstTruthy(src?.trust_slip_limit),
    trust_limit: firstTruthy(src?.trust_limit),
    currency: firstTruthy(src?.currency),
    status: firstTruthy(src?.status),
    code: firstTruthy(src?.code),
    created_at: firstTruthy(src?.created_at),
    issued_at: firstTruthy(src?.issued_at),
    expires_at: firstTruthy(src?.expires_at),
    expiry_policy: firstTruthy(src?.expiry_policy),
    last_release_at: firstTruthy(src?.last_release_at),
    last_full_repayment_at: firstTruthy(src?.last_full_repayment_at),
    days_since_last_full_repayment:
      src?.days_since_last_full_repayment ?? null,
    cci_score: firstTruthy(src?.cci_score),
    cci_band: firstTruthy(src?.cci_band),
    graph_score: firstTruthy(src?.graph_score),
    active_clan_count: src?.active_clan_count ?? null,
    sponsor_count: src?.sponsor_count ?? null,
    unique_counterparties: src?.unique_counterparties ?? null,
    risk_flags: Array.isArray(src?.risk_flags) ? src.risk_flags : [],
    sponsors: Array.isArray(src?.sponsors) ? src.sponsors : [],
    internal_contacts: Array.isArray(src?.internal_contacts)
      ? src.internal_contacts
      : [],
    evidence_summary: src?.evidence_summary || null,
    merchant_summary: src?.merchant_summary || null,
    merchant_visibility_level: firstTruthy(src?.merchant_visibility_level),
    visibility_options: Array.isArray(src?.visibility_options)
      ? src.visibility_options
      : [],
    is_current: src?.is_current ?? null,
    issued_reason: firstTruthy(src?.issued_reason),
    supersedes_trust_slip_id: src?.supersedes_trust_slip_id ?? null,
    superseded_by_trust_slip_id: src?.superseded_by_trust_slip_id ?? null,
    not_a_bank_guarantee: src?.not_a_bank_guarantee ?? null,
    no_auto_debit: src?.no_auto_debit ?? null,
    disclaimer: firstTruthy(src?.disclaimer),
    generated_at: firstTruthy(src?.generated_at),
    merchant_view: src?.merchant_view || null,
    verification_token: firstTruthy(src?.verification_token),
    verification_code: firstTruthy(src?.verification_code),
    token: firstTruthy(src?.token),
    public_verify_url: firstTruthy(src?.public_verify_url),
    community_id: firstTruthy(src?.community_id),
    community_global_id: firstTruthy(src?.community_global_id),
    community_code: firstTruthy(src?.community_code),
    clan_code: firstTruthy(src?.clan_code),
    holder_role: firstTruthy(src?.holder_role),
    community_member_count: src?.community_member_count ?? null,
    active_member_count: src?.active_member_count ?? null,
    total_member_count: src?.total_member_count ?? null,
  };
}

async function callFirstAvailable<T = any>(
  names: string[],
  argsSets: any[][]
): Promise<T | null> {
  for (const name of names) {
    const fn = (api as any)[name];
    if (typeof fn !== "function") continue;

    for (const args of argsSets) {
      try {
        const result = await fn(...args);
        if (result) return result as T;
      } catch {
        // try next signature
      }
    }
  }

  return null;
}

function routeTarget(intent: CtaIntent, communityId: number, debugId: string): string {
  return resolveCtaTarget(intent, { communityId, debugId }).to as string;
}

function cacheBust(path: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}_ts=${Date.now()}`;
}

async function fetchTrustSlipPageData(
  selectedClanId: number,
  options: { networkFirst?: boolean } = {}
) {
  const clanHeaders: Record<string, string> = {};
  if (selectedClanId) {
    clanHeaders["X-Clan-Id"] = String(selectedClanId);
  }

  const fetchNetworkSummary = () =>
    fetchFirstJson(
      [
        cacheBust("/trust-slips/me/summary"),
        cacheBust("/trust-slips/me"),
        cacheBust("/trust-slips/me-summary"),
        cacheBust("/trust-slips/summary/me"),
      ],
      clanHeaders
    );

  const [meRes, clanRes, summaryRes] = await Promise.all([
    typeof (api as any).getMe === "function"
      ? (api as any).getMe().catch(() => null)
      : Promise.resolve(null),
    typeof (api as any).getCurrentClan === "function"
      ? (api as any).getCurrentClan().catch(() => null)
      : Promise.resolve(null),
    (async () => {
      if (options.networkFirst) {
        const direct = await fetchNetworkSummary();
        if (direct) return direct;
      }

      const viaFn = await callFirstAvailable(
        [
          "getMyTrustSlipSummary",
          "getTrustSlipSummary",
          "getTrustSlipMeSummary",
          "getMyTrustSlip",
        ],
        [
          [],
          [{ clan_id: selectedClanId || undefined }],
          [
            {
              clan_id: selectedClanId || undefined,
              header_clan_id: selectedClanId || undefined,
            },
          ],
        ]
      );

      if (viaFn) return viaFn;

      return fetchNetworkSummary();
    })(),
  ]);

  return {
    me: meRes || null,
    clan: clanRes || null,
    summary: normalizeTrustSlipSummary(summaryRes),
  };
}

function mergeFreshTrustSlipSummary(
  summary: TrustSlipSummary | null,
  reissueResult: any
): TrustSlipSummary | null {
  if (!summary || !reissueResult) return summary;

  const freshCode = firstTruthy(reissueResult.code, reissueResult.trust_slip_code);
  if (!freshCode) return summary;

  const issuedAt = firstTruthy(reissueResult.issued_at, reissueResult.created_at);
  const expiresAt = firstTruthy(reissueResult.expires_at);
  const freshVerifyUrl = `/trust-slips/verify/${encodeURIComponent(freshCode)}/page`;

  return {
    ...summary,
    code: freshCode,
    verification_code: freshCode,
    verification_token: freshCode,
    token: freshCode,
    public_verify_url: freshVerifyUrl,
    created_at: issuedAt || summary.created_at,
    issued_at: issuedAt || summary.issued_at,
    expires_at: expiresAt || summary.expires_at,
    is_current: true,
    merchant_view: {
      ...(summary.merchant_view || {}),
      code: freshCode,
      merchant_summary: {
        ...((summary.merchant_view || {}).merchant_summary || {}),
        code: freshCode,
        expires_at: expiresAt || (summary.merchant_view || {}).merchant_summary?.expires_at,
      },
    },
    merchant_summary: {
      ...(summary.merchant_summary || {}),
      code: freshCode,
      expires_at: expiresAt || summary.merchant_summary?.expires_at,
    },
  };
}

export default function TrustSlipPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedClanId = Number((api as any).getSelectedClanId?.() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "trust-slip.route.dashboard"),
      trust: routeTarget("trust", selectedClanId, "trust-slip.route.trust"),
      guide: routeTarget("profile", selectedClanId, "trust-slip.route.guide"),
    }),
    [selectedClanId]
  );

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(TRUST_SLIP_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<{
    tone: NoticeTone;
    text: string;
  } | null>(null);

  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [summary, setSummary] = useState<TrustSlipSummary | null>(null);
  const [confirmationBusy, setConfirmationBusy] = useState(false);
  const [confirmationOutcome, setConfirmationOutcome] =
    useState<CommunityConfirmationOutcome | null>(null);
  const guideItems = useMemo(() => buildTrustSlipGuideItems(), []);
  const actionGuide = useMemo(() => buildTrustSlipActionGuide(), []);
  const trustDocumentFamilyItems = useMemo(() => buildTrustDocumentFamilyItems(true), []);
  const trustDocumentUseCases = useMemo(
    () => buildTrustDocumentUseCaseItems(trustDocumentFamilyItems, "trust-slip"),
    [trustDocumentFamilyItems]
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (location.hash) return undefined;

    const restoreTop = () => {
      window.scrollTo({ left: 0, top: 0, behavior: "auto" });
    };

    restoreTop();
    const frame = window.requestAnimationFrame(restoreTop);
    const timer = window.setTimeout(restoreTop, 180);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [location.hash, location.pathname, location.search]);

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
    writeLocalJSON(TRUST_SLIP_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const data = await fetchTrustSlipPageData(selectedClanId);

        if (!alive) return;

        setMe(data.me);
        setCurrentClan(data.clan);
        setSummary(data.summary);
        setConfirmationOutcome(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedClanId]);

  async function refreshTrustSlip() {
    setRefreshing(true);

    try {
      const reissueResult = await api.reissueMyTrustSlip({
        reason: "holder_requested_fresh_public_trustslip",
        force: true,
      });
      const data = await fetchTrustSlipPageData(selectedClanId, {
        networkFirst: true,
      });
      setMe(data.me);
      setCurrentClan(data.clan);
      setSummary(mergeFreshTrustSlipSummary(data.summary, reissueResult));
      setConfirmationOutcome(null);
      showNotice("success", "Fresh TrustSlip issued.");
    } catch {
      showNotice("error", "TrustSlip could not refresh. Try again in a moment.");
    } finally {
      setRefreshing(false);
    }
  }

  const holderName = useMemo(() => {
    return (
      firstTruthy(
        summary?.merchant_view?.display_name,
        summary?.merchant_summary?.display_name,
        summary?.display_name,
        me?.display_name,
        me?.nickname,
        me?.name,
        me?.first_name,
        me?.email
      ) || "Member"
    );
  }, [summary, me]);

  const gmfnId = useMemo(() => {
    return firstTruthy(
      summary?.merchant_view?.gmfn_id,
      summary?.merchant_summary?.gmfn_id,
      summary?.gmfn_id,
      me?.gmfn_id,
      "Pending"
    );
  }, [summary, me]);

  const communityName = useMemo(() => {
    return (
      firstTruthy(
        summary?.merchant_view?.community,
        summary?.merchant_summary?.community,
        summary?.community,
        currentClan?.marketplace_name,
        currentClan?.name,
        currentClan?.display_name,
        currentClan?.title
      ) || (selectedClanId ? `Community ${selectedClanId}` : "No current community")
    );
  }, [summary, currentClan, selectedClanId]);

  const communityRef = useMemo(() => {
    return (
      firstTruthy(
        summary?.community_global_id,
        summary?.community_code,
        summary?.clan_code,
        summary?.community_id,
        currentClan?.community_global_id,
        currentClan?.community_code,
        currentClan?.clan_code
      ) || "Pending"
    );
  }, [summary, currentClan]);

  const trustSlipCode = useMemo(() => {
    return firstTruthy(
      summary?.merchant_view?.code,
      summary?.verification_code,
      summary?.code,
      summary?.verification_token,
      summary?.token
    );
  }, [summary]);

  const verifyPath = useMemo(() => {
    return trustSlipVerifyFrontendPath(
      trustSlipCode,
      summary?.public_verify_url || ""
    );
  }, [summary, trustSlipCode]);
  const verifyUrl = useMemo(() => toFrontendAbsoluteUrl(verifyPath), [verifyPath]);

  const qrValue = firstTruthy(verifyUrl, verifyPath, trustSlipCode);

  const merchantBand = firstTruthy(
    summary?.merchant_view?.band,
    summary?.merchant_summary?.band,
    summary?.band,
    summary?.level,
    "Pending"
  );
  const normalizedMerchantBand = normalizeTrustBand(merchantBand);
  const merchantBandLabel = getTrustBandShortLabel(merchantBand);

  const merchantTrustLimit = firstTruthy(
    summary?.merchant_view?.trust_limit,
    summary?.merchant_summary?.trust_limit,
    summary?.trust_limit,
    summary?.trust_slip_limit,
    "Not shown"
  );

  const merchantCurrency = firstTruthy(
    summary?.merchant_view?.currency,
    summary?.merchant_summary?.currency,
    summary?.currency,
    "NGN"
  );

  const merchantVisibility = firstTruthy(
    summary?.merchant_view?.visibility_level,
    summary?.merchant_visibility_level,
    "standard"
  );

  const merchantVerifyActive = Boolean((summary as any)?.merchant_verify_active);
  const merchantVerifyRequired = Boolean(
    (summary as any)?.merchant_verify_subscription_required
  );
  const merchantVerifyDetail = firstTruthy(
    (summary as any)?.merchant_verify_detail,
    merchantVerifyActive
      ? "External merchant verification is active."
      : "External merchant verification requires an active Merchant Verify subscription."
  );
  const merchantViewVerified =
    summary?.merchant_view?.verified ?? summary?.verified ?? false;
  const merchantViewActive =
    summary?.merchant_view?.active ?? summary?.active ?? false;
  const merchantViewPhoneVerified =
    summary?.merchant_view?.phone_verified ?? summary?.phone_verified ?? false;
  const rawTrustSlipStatus = safeStr(
    summary?.status || summary?.merchant_view?.status || ""
  ).toLowerCase();
  const trustSlipExpiredByDate = isPastDate(
    summary?.merchant_view?.expires_at || summary?.expires_at
  );
  const trustSlipPublicStatus =
    rawTrustSlipStatus === "expired" || trustSlipExpiredByDate
      ? "Needs refresh"
      : rawTrustSlipStatus === "revoked"
      ? "Revoked"
      : rawTrustSlipStatus === "frozen"
      ? "Frozen"
      : trustSlipCode
      ? "Ready to verify"
      : "Preparing";
  const trustSlipStatusNote =
    rawTrustSlipStatus === "expired" || trustSlipExpiredByDate
      ? "This TrustSlip exists, but the current public record window has passed. Refresh or generate a current TrustSlip before asking anyone to rely on it."
      : rawTrustSlipStatus === "revoked" || rawTrustSlipStatus === "frozen"
      ? "Do not rely on this TrustSlip until the status is cleared and a fresh verification record is available."
      : trustSlipCode
      ? "This TrustSlip has a code and can be checked through the verify page."
      : "The TrustSlip code is not ready yet.";

  const cciScore = firstTruthy(
    summary?.merchant_view?.cci_score,
    summary?.merchant_summary?.cci_score,
    summary?.cci_score,
    "Not stated"
  );

  const cciBand = firstTruthy(
    summary?.merchant_view?.cci_band,
    summary?.merchant_summary?.cci_band,
    summary?.cci_band,
    "Not stated"
  );

  const disclaimer = firstTruthy(
    summary?.merchant_view?.disclaimer,
    summary?.disclaimer,
    "TrustSlip is a portable summary derived from GSN trust history."
  );

  const capacityContext = summary?.evidence_summary?.capacity_context || null;
  const readinessContext = summary?.evidence_summary?.readiness_context || null;
  const riskFlags = Array.isArray(summary?.risk_flags) ? summary.risk_flags : [];
  const capacityReasons = Array.isArray(capacityContext?.reasons)
    ? capacityContext.reasons
    : [];
  const readinessReasons = Array.isArray(readinessContext?.reasons)
    ? readinessContext.reasons
    : [];
  const commitmentDiscipline = summary?.evidence_summary?.commitment_discipline || {};
  const personalCommitmentDiscipline =
    summary?.evidence_summary?.personal_commitment_discipline || {};
  const contributionDiscipline = commitmentDiscipline?.contribution || {};
  const repaymentDiscipline = commitmentDiscipline?.repayment || {};
  const commitmentPlainLanguage = firstTruthy(commitmentDiscipline?.plain_language);
  const personalCommitmentPlainLanguage = firstTruthy(
    personalCommitmentDiscipline?.plain_language
  );
  const identityContext =
    summary?.identity_context || summary?.merchant_view?.identity_context || {};
  const communityContext =
    summary?.community_context || summary?.merchant_view?.community_context || {};
  const cciExplainer =
    summary?.cci_explainer ||
    summary?.merchant_view?.cci_explainer ||
    summary?.merchant_summary?.cci_explainer ||
    {};
  const profileImageUrl = resolveSharedProfileImage(
    me,
    summary?.profile_image_url,
    summary?.merchant_view?.profile_image_url,
    summary?.merchant_summary?.profile_image_url,
    identityContext?.profile_image_url
  );
  const holderRole = firstTruthy(
    summary?.holder_role,
    summary?.merchant_view?.holder_role,
    summary?.merchant_summary?.holder_role,
    communityContext?.holder_role,
    "member"
  );
  const activeMemberCount = firstTruthy(
    summary?.active_member_count,
    summary?.community_member_count,
    summary?.merchant_view?.active_member_count,
    summary?.merchant_summary?.active_member_count,
    communityContext?.active_member_count
  );
  const activeCommunityCount = firstTruthy(
    summary?.active_clan_count,
    communityContext?.active_community_count
  );
  const memberWitnessCount = firstTruthy(
    summary?.member_witness_count,
    summary?.merchant_view?.member_witness_count,
    summary?.merchant_view?.merchant_summary?.member_witness_count,
    summary?.merchant_summary?.member_witness_count,
    communityContext?.member_witness_count
  );
  const membershipStrengthLabel = firstTruthy(
    summary?.membership_strength_label,
    summary?.merchant_view?.membership_strength_label,
    summary?.merchant_view?.merchant_summary?.membership_strength_label,
    summary?.merchant_summary?.membership_strength_label,
    communityContext?.membership_strength_label
  );
  const membershipRenewalStatusLabel = firstTruthy(
    summary?.membership_renewal_status_label,
    summary?.merchant_view?.membership_renewal_status_label,
    summary?.merchant_view?.merchant_summary?.membership_renewal_status_label,
    summary?.merchant_summary?.membership_renewal_status_label,
    communityContext?.membership_renewal_status_label
  );
  const membershipValidUntil = firstTruthy(
    summary?.membership_valid_until,
    summary?.merchant_view?.membership_valid_until,
    summary?.merchant_view?.merchant_summary?.membership_valid_until,
    summary?.merchant_summary?.membership_valid_until,
    communityContext?.membership_valid_until
  );
  const nextWitnessRenewalAt = firstTruthy(
    summary?.next_witness_renewal_at,
    summary?.merchant_view?.next_witness_renewal_at,
    summary?.merchant_view?.merchant_summary?.next_witness_renewal_at,
    summary?.merchant_summary?.next_witness_renewal_at,
    communityContext?.next_witness_renewal_at
  );
  const nextWitnessRenewalStatusLabel = firstTruthy(
    summary?.next_witness_renewal_status_label,
    summary?.merchant_view?.next_witness_renewal_status_label,
    summary?.merchant_view?.merchant_summary?.next_witness_renewal_status_label,
    summary?.merchant_summary?.next_witness_renewal_status_label,
    communityContext?.next_witness_renewal_status_label,
    "Not Started"
  );
  const membershipCurrentnessLabel = firstTruthy(
    summary?.membership_currentness_label,
    summary?.merchant_view?.membership_currentness_label,
    summary?.merchant_view?.merchant_summary?.membership_currentness_label,
    summary?.merchant_summary?.membership_currentness_label,
    communityContext?.membership_currentness_label,
    "Witness renewal not started"
  );
  const membershipCurrentnessScope = firstTruthy(
    summary?.membership_currentness_scope,
    summary?.merchant_view?.membership_currentness_scope,
    summary?.merchant_view?.merchant_summary?.membership_currentness_scope,
    summary?.merchant_summary?.membership_currentness_scope,
    communityContext?.membership_currentness_scope,
    "This active membership record has no current witness validity window. Ask for member witnesses, TrustSlip, or live community confirmation before a serious decision."
  );
  const communityActivityCount = firstTruthy(
    summary?.community_activity_count,
    summary?.merchant_view?.community_activity_count,
    summary?.merchant_view?.merchant_summary?.community_activity_count,
    summary?.merchant_summary?.community_activity_count,
    communityContext?.community_activity_count
  );
  const communityActivityLatestAt = firstTruthy(
    summary?.community_activity_latest_at,
    summary?.merchant_view?.community_activity_latest_at,
    summary?.merchant_view?.merchant_summary?.community_activity_latest_at,
    summary?.merchant_summary?.community_activity_latest_at,
    communityContext?.community_activity_latest_at
  );
  const communityActivityCategories = firstStringList(
    summary?.community_activity_categories,
    summary?.merchant_view?.community_activity_categories,
    summary?.merchant_view?.merchant_summary?.community_activity_categories,
    summary?.merchant_summary?.community_activity_categories,
    communityContext?.community_activity_categories
  );
  const communityActivityLabel = firstTruthy(
    summary?.community_activity_label,
    summary?.merchant_view?.community_activity_label,
    summary?.merchant_view?.merchant_summary?.community_activity_label,
    summary?.merchant_summary?.community_activity_label,
    communityContext?.community_activity_label
  );
  const memberWitnessSignal =
    memberWitnessCount && membershipStrengthLabel
      ? `${membershipStrengthLabel}; ${memberWitnessCount} member witness${
          memberWitnessCount === "1" ? "" : "es"
        }`
      : "not shown";
  const communityActivitySignal = communityActivityCount
    ? `${communityActivityCount} community activity event${
        communityActivityCount === "1" ? "" : "s"
      }${
        communityActivityCategories.length
          ? ` across ${communityActivityCategories.join(", ")}`
          : ""
      }`
    : "not shown";
  const visibleEvidencePoints =
    numericCount(summary?.sponsor_count ?? summary?.merchant_summary?.sponsor_count) +
    numericCount(summary?.active_clan_count) +
    numericCount(summary?.unique_counterparties);
  const trustSlipEvidenceStatus =
    visibleEvidencePoints <= 0
      ? "limited"
      : normalizedMerchantBand === "A" || normalizedMerchantBand === "B"
        ? "strong"
        : normalizedMerchantBand === "C"
          ? "mixed"
          : "limited";
  const trustSlipEvidenceLanguage = getTrustEvidenceLanguage(trustSlipEvidenceStatus, {
    lowData: visibleEvidencePoints <= 0 && !trustSlipCode,
  });
  const evidenceDepthText = `${trustSlipEvidenceLanguage.label}: ${
    trustSlipEvidenceLanguage.plainMeaning
  } Sponsors: ${countOrNotProvided(
    summary?.sponsor_count ?? summary?.merchant_summary?.sponsor_count
  )}; active communities: ${countOrNotProvided(
    summary?.active_clan_count
  )}; counterparties: ${countOrNotProvided(summary?.unique_counterparties)}.`;
  const riskSignalText =
    riskFlags.length > 0
      ? `Flags present: ${riskFlags.join(", ")}`
      : Array.isArray(summary?.risk_flags)
      ? "No risk flags shown."
      : "Risk data not shown at this visibility level.";
  const identityStatusLabel = firstTruthy(
    summary?.identity_status_label,
    summary?.merchant_view?.identity_status_label,
    summary?.merchant_summary?.identity_status_label,
    identityContext?.identity_status_label
  );
  const bankVerified =
    summary?.bank_verified ??
    summary?.merchant_view?.bank_verified ??
    summary?.merchant_summary?.bank_verified ??
    identityContext?.bank_verified ??
    false;
  const bankVerificationLabel = firstTruthy(
    summary?.bank_verification_label,
    summary?.merchant_view?.bank_verification_label,
    summary?.merchant_summary?.bank_verification_label,
    identityContext?.bank_verification_label,
    bankVerified ? "Bank details recorded" : "Bank check not connected yet"
  );
  const passportVerified =
    summary?.passport_verified ??
    summary?.merchant_view?.passport_verified ??
    summary?.merchant_summary?.passport_verified ??
    identityContext?.passport_verified ??
    false;
  const passportVerificationLabel = firstTruthy(
    summary?.passport_verification_label,
    summary?.merchant_view?.passport_verification_label,
    summary?.merchant_summary?.passport_verification_label,
    identityContext?.passport_verification_label,
    "Passport check not connected yet"
  );
  const communityIdentityConfirmed =
    summary?.community_identity_confirmed ??
    summary?.merchant_view?.community_identity_confirmed ??
    summary?.merchant_summary?.community_identity_confirmed ??
    identityContext?.community_identity_confirmed ??
    false;
  const communityIdentityLabel = firstTruthy(
    summary?.community_identity_label,
    summary?.merchant_view?.community_identity_label,
    summary?.merchant_summary?.community_identity_label,
    identityContext?.community_identity_label,
    communityIdentityConfirmed
      ? "Active community membership recorded"
      : "Community membership record not shown"
  );
  const cciMeaning = firstTruthy(cciExplainer?.meaning, cciExplainer?.plain_language);
  const lastReleaseText = safeDateTime(summary?.last_release_at) || "Not shown";
  const lastFullRepaymentText =
    safeDateTime(summary?.last_full_repayment_at) || "Not shown";
  const hasBlockingTrustSlipState =
    trustSlipExpiredByDate ||
    summary?.is_current === false ||
    summary?.merchant_view?.active === false ||
    ["expired", "revoked", "frozen"].includes(
      safeStr(summary?.status || summary?.merchant_view?.status).toLowerCase()
    );
  const readerVerdict = hasBlockingTrustSlipState
    ? "Do not ask someone to rely on this TrustSlip by itself. The current state needs fresh evidence before support, goods, money, work, or a referral."
    : `This TrustSlip gives a reader a short public trust story for ${holderName}. It should help them decide what to do next, not replace their judgement.`;
  const fourDecisionQuestions = [
    {
      title: "Can this person be trusted for support, contribution, finance, or trade?",
      answer: hasBlockingTrustSlipState
        ? "Not from this TrustSlip alone. Ask for a fresh TrustSlip or the fuller Trust Passport before any risky decision."
        : `The visible reading is ${merchantBand} (${merchantBandLabel}), with TrustSlip limit signal ${merchantTrustLimit} ${merchantCurrency} and cross-community consistency ${cciScore} / ${cciBand}. This supports a careful decision; it is not an automatic approval.`,
    },
    {
      title: "Do they follow through?",
      answer: safeStr(summary?.last_full_repayment_at)
        ? `Follow-through evidence is visible. Last full repayment: ${lastFullRepaymentText}.`
        : safeStr(summary?.last_release_at)
        ? `A release is visible (${lastReleaseText}), but this view does not yet show full repayment after that release.`
        : commitmentPlainLanguage
        ? commitmentPlainLanguage
        : personalCommitmentPlainLanguage
        ? personalCommitmentPlainLanguage
        : "This TrustSlip does not yet show enough follow-through evidence. Ask for contribution, repayment, or personal commitment history.",
    },
    {
      title: "Are they stable inside a real community?",
      answer: `Community shown: ${communityName}. Role: ${holderRole}. Active members shown: ${
        activeMemberCount || "not shown"
      }. Member-witness strength: ${memberWitnessSignal}. Community activity evidence: ${communityActivitySignal}. Sponsor signals: ${
        summary?.sponsor_count ?? summary?.merchant_summary?.sponsor_count ?? "not shown"
      }. Evidence currentness: ${membershipCurrentnessLabel}. Next witness renewal: ${
        safeDateTime(nextWitnessRenewalAt) || nextWitnessRenewalAt || "not shown"
      } (${nextWitnessRenewalStatusLabel}).`,
    },
    {
      title: "Is there checkable history behind what they claim?",
      answer:
        safeStr(summary?.code || summary?.verification_code || summary?.merchant_view?.code)
          ? "A TrustSlip code and verification route exist. For a higher-risk decision, ask for the Trust Passport, Trust Events, or direct community confirmation."
          : "The TrustSlip code is not ready yet, so the reader cannot check the portable claim from this page alone.",
    },
  ];
  const briefDecisionAnswers = [
    {
      label: "Trust decision",
      value: hasBlockingTrustSlipState
        ? "Do not rely yet. Ask for a refreshed TrustSlip before support, goods, money, work, or referral."
        : `Use carefully. Reading ${merchantBand} (${merchantBandLabel}); trust-limit signal ${merchantTrustLimit} ${merchantCurrency}; cross-community consistency ${cciScore} / ${cciBand}.`,
    },
    {
      label: "Follow-through",
      value: safeStr(summary?.last_full_repayment_at)
        ? `Full repayment shown: ${lastFullRepaymentText}.`
        : safeStr(summary?.last_release_at)
        ? `Release shown: ${lastReleaseText}; repayment follow-through is not fully shown here.`
        : commitmentPlainLanguage || personalCommitmentPlainLanguage || "Limited follow-through evidence shown.",
    },
    {
      label: "Community stability",
      value: `${communityName}. Role: ${holderRole}. Active members: ${
        activeMemberCount || "not shown"
      }. Member witnesses: ${memberWitnessSignal}. Sponsors: ${
        summary?.sponsor_count ?? summary?.merchant_summary?.sponsor_count ?? "not shown"
      }. Currentness: ${membershipCurrentnessLabel}. Next witness renewal: ${
        safeDateTime(nextWitnessRenewalAt) || nextWitnessRenewalAt || "not shown"
      } (${nextWitnessRenewalStatusLabel}).`,
    },
    {
      label: "Checkable history",
      value: trustSlipCode
        ? "A verification code exists. For higher risk, also ask for Trust Passport or Trust Events."
        : "No current verification code is shown yet.",
    },
  ];
  const trustSlipBandLetter = safeStr(merchantBand).toUpperCase().slice(0, 1);
  const trustSlipGradeLegend = TRUST_BAND_SHORT_LABELS.map(({ band, label }) => [
    band,
    label,
  ]);
  const trustSlipValidNow =
    trustSlipCode &&
    !hasBlockingTrustSlipState &&
    trustSlipPublicStatus !== "Preparing";
  const trustSlipStatusTitle = trustSlipValidNow
    ? "VALID NOW"
    : trustSlipPublicStatus === "Preparing"
      ? "PREPARING"
      : "NEEDS REFRESH";
  const trustSlipStatusTone = trustSlipValidNow ? "valid" : "refresh";
  const decisionSummaryText = hasBlockingTrustSlipState
    ? "Do not rely on this TrustSlip until it is refreshed and checked again."
    : ["D", "E"].includes(trustSlipBandLetter)
      ? "Use with caution but acceptable for low-risk support and trade decisions."
      : "Usable for low-risk checking, with normal judgement and verification.";
  const trustSlipReadingRows = [
    {
      icon: "shield" as GsnIconName,
      label: "Identity evidence",
      status:
        merchantViewPhoneVerified && (bankVerified || communityIdentityConfirmed)
          ? "Strong"
          : merchantViewPhoneVerified
          ? "Mixed"
          : "Limited",
    },
    {
      icon: "community" as GsnIconName,
      label: "Support trust",
      status: hasBlockingTrustSlipState ? "Needs caution" : "Mixed",
    },
    {
      icon: "chart" as GsnIconName,
      label: "Contribution discipline",
      status:
        commitmentPlainLanguage || personalCommitmentPlainLanguage
          ? "Mixed"
          : "Limited",
    },
    {
      icon: "wallet" as GsnIconName,
      label: "Finance discipline",
      status: safeStr(summary?.last_full_repayment_at) ? "Strong" : "Caution",
    },
    {
      icon: "shop" as GsnIconName,
      label: "Trade trust",
      status:
        Number(summary?.unique_counterparties ?? 0) > 0 ? "Mixed" : "Limited",
    },
    {
      icon: "check" as GsnIconName,
      label: "Follow-through",
      status: safeStr(summary?.last_full_repayment_at) ? "Strong" : "Pending",
    },
    {
      icon: "home" as GsnIconName,
      label: "Community standing",
      status: ["D", "E"].includes(trustSlipBandLetter)
        ? "Under pressure"
        : "Stable",
    },
    {
      icon: "document" as GsnIconName,
      label: "Checkable history",
      status: trustSlipCode ? "Limited" : "Not ready",
    },
  ];
  const trustSlipUseCases: Array<[GsnIconName, string]> = [
    ["community", "Community-backed support conversations"],
    ["briefcase", "Small trade or low-risk trust checks"],
    ["shop", "Merchant review before a trade decision"],
    ["search", "First-look trust screening"],
  ];
  const trustSlipLimits = [
    "Not a bank guarantee",
    "No auto-debit",
    "Not a legal promise of repayment",
    "Not a substitute for your own judgement",
  ];
  const trustSlipTrustReasons = [
    merchantViewPhoneVerified
      ? "Backed by phone identity verification"
      : "Identity verification is limited",
    trustSlipCode
      ? "Can be checked through public verification"
      : "Public verification code is not ready yet",
    "Based on recorded trust signals where available",
    "Linked to community activity where shown",
  ];
  const communityConfirmation = summary?.community_confirmation || null;
  const communityVerifyKey = firstTruthy(
    communityConfirmation?.community_code,
    communityConfirmation?.community_id,
    summary?.community_code,
    summary?.community_global_id,
    summary?.community_id,
    currentClan?.community_code,
    currentClan?.community_global_id,
    currentClan?.id
  );
  const communityVerifyPath = communityVerifyKey
    ? `/verify/community/${encodeURIComponent(communityVerifyKey)}`
    : "";
  const memberCredentialPath = publicCommunityMemberCredentialPath({
    communityKey: communityVerifyKey || communityRef,
    memberKey: gmfnId,
  });
  const memberCredentialUrl = useMemo(
    () => toFrontendAbsoluteUrl(memberCredentialPath),
    [memberCredentialPath]
  );
  const communityRelayAvailable = Boolean(communityConfirmation?.relay_available);
  const communityPulseAvailable = Boolean(
    communityConfirmation?.instant_pulse_available || communityRelayAvailable
  );
  const communityConfirmationText =
    firstTruthy(communityConfirmation?.plain_language) ||
    "Community confirmation is not available for this TrustSlip yet.";
  const communityConfirmationRows = [
    ["Community status", firstTruthy(communityConfirmation?.community_status, "Not shown")],
    [
      "Active members",
      firstTruthy(communityConfirmation?.active_member_count, activeMemberCount, "Not shown"),
    ],
    [
      "Eligible response pool",
      firstTruthy(communityConfirmation?.contactable_reference_count, "0"),
    ],
    [
      "Sponsor signals",
      firstTruthy(communityConfirmation?.sponsor_signal_count, summary?.sponsor_count, "0"),
    ],
    [
      "Last confirmation",
      safeDateTime(communityConfirmation?.last_community_confirmation) || "Not requested yet",
    ],
  ];
  const confirmationResult = confirmationOutcome?.community_response || null;
  const confirmationPublicPath = confirmationOutcome?.public_token
    ? `/community-confirmations/public/${encodeURIComponent(String(confirmationOutcome.public_token))}`
    : "";

  async function requestCommunityPulse() {
    if (!trustSlipCode) {
      showNotice("error", "Refresh TrustSlip first so a public code is available.");
      return;
    }

    if (!communityPulseAvailable) {
      showNotice("error", "Community confirmation relay is not available yet.");
      return;
    }

    setConfirmationBusy(true);

    try {
      const result = await (api as any).requestCommunityConfirmation({
        trust_slip_code: trustSlipCode,
        requester_external_label: "TrustSlip viewer",
        reason_type: "merchant_trust_check",
        risk_level: "low",
        mode: communityConfirmation?.instant_pulse_available ? "instant_pulse" : "relay",
      });
      setConfirmationOutcome(result);
      showNotice("success", "Community confirmation request opened.");
      if (result?.public_token) {
        navigateWithOrigin(
          navigate,
          `/community-confirmations/public/${encodeURIComponent(String(result.public_token))}`,
          location
        );
      }
    } catch {
      showNotice("error", "Community confirmation could not be opened yet.");
    } finally {
      setConfirmationBusy(false);
    }
  }

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  async function handleCopy(text: string, successText: string, emptyText: string) {
    const value = safeStr(text);
    if (!value) {
      showNotice("error", emptyText);
      return;
    }

    const copied = await api.safeCopy(value);
    showNotice(
      copied ? "success" : "error",
      copied ? successText : "Copy did not complete. Select the text and copy it manually."
    );
  }

  function handleGuideSelect(item: { to?: string }) {
    if (!item.to) return;
    navigateWithOrigin(navigate, item.to, location);
  }

  function copyTrustSlipSnapshot() {
    void handleCopy(
      buildTrustSlipSnapshot({
        holderName,
        gmfnId,
        communityName,
        communityRef,
        trustSlipCode,
        merchantBand,
        merchantTrustLimit,
        merchantCurrency,
        cciBand,
        expiresAt: safeDateTime(summary?.expires_at) || "Not stated",
        verifyUrl,
        memberCredentialUrl,
      }),
      "TrustSlip snapshot copied.",
      "TrustSlip snapshot is not ready yet."
    );
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
          sectionLabel="TrustSlip"
          title="TrustSlip"
          subtitle="Loading the TrustSlip summary..."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.dashboard}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading TrustSlip...
          </div>
        </section>
      </div>
    );
  }

  const trustSlipPaperFrameEnabled = true;
  if (trustSlipPaperFrameEnabled) {
    return (
      <div
        style={trustSlipPageShell()}
      >
        <style>{`
          @page { margin: 14mm; }
          @media print {
            body { background: #ffffff !important; }
            button { display: none !important; }
            .print-trust-nav { display: none !important; }
            .print-trust-document {
              box-shadow: none !important;
              border: 1px solid rgba(148,163,184,0.34) !important;
              background: #ffffff !important;
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
        `}</style>

        <section
          className="print-trust-document"
          style={{
            ...trustSlipScrollClearance(isCompact),
            ...trustSlipWorkArea(),
            position: "relative",
            overflow: "visible",
            gridTemplateColumns: isCompact
              ? "minmax(0, 1fr)"
              : "minmax(0, 1fr) minmax(0, 1fr)",
            alignItems: "start",
          }}
        >
          {notice ? (
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={noticeCard(notice.tone)}>{notice.text}</div>
            </div>
          ) : null}

          <header
            style={{
              ...trustSlipHeroCard(),
              gridColumn: "1 / -1",
            }}
          >
            <TrustPaperWatermark
              name="shield"
              color="#EAF3FF"
              size={isCompact ? 190 : 254}
              opacity={0.055}
              style={{ top: 8, right: -36, bottom: "auto" }}
            />
            <TrustPaperWatermark
              name="globe"
              color="#EAF3FF"
              size={isCompact ? 108 : 142}
              opacity={0.07}
              style={{ top: 58, right: 40, bottom: "auto" }}
            />
            <div style={{ position: "relative", zIndex: 1 }}>
              <h1
                style={{
                  margin: 0,
                  color: "#FFFFFF",
                  fontSize: isCompact ? 34 : 42,
                  lineHeight: 1.02,
                  fontWeight: 1000,
                }}
              >
                TrustSlip
              </h1>
              <p
                style={{
                  margin: "16px 0 0",
                  maxWidth: 430,
                  color: "#DCE8F4",
                  fontSize: isCompact ? 17 : 18,
                  lineHeight: 1.38,
                  fontWeight: 760,
                }}
              >
                Portable trust summary for sharing, checking, and quick decision-making.
              </p>
              <div
                style={{
                  width: 146,
                  height: 1,
                  background: "rgba(214,170,69,0.72)",
                  marginTop: 24,
                  marginBottom: 22,
                }}
              />
              <div
                style={{
                  color: "#FFFFFF",
                  fontSize: 36,
                  lineHeight: 1,
                  fontWeight: 1000,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    display: "grid",
                    placeItems: "center",
                    color: "#F6D77A",
                    border: "1px solid rgba(246,215,122,0.52)",
                    background: "rgba(246,215,122,0.08)",
                  }}
                >
                  <GsnLegacyIcon name="evidence" size={40} />
                </span>
                <span>GSN</span>
              </div>
              <div
                style={{
                  color: "#DCE8F4",
                  fontSize: 14,
                  fontWeight: 900,
                  lineHeight: 1,
                  marginTop: 6,
                  marginLeft: 62,
                }}
              >
                Global Support Network
              </div>
            </div>
          </header>

          <section
            style={{
              ...trustSlipSectionCard("#FFFFFF"),
              ...trustSlipScrollClearance(isCompact),
              order: 1,
              gridColumn: isCompact ? "1 / -1" : "1 / 2",
              display: "grid",
              gap: 12,
              alignItems: "start",
            }}
          >
            <div style={trustSlipPaperTitle(isCompact)}>1. Who is this person?</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "minmax(0, 1fr)"
                  : "132px minmax(0, 1fr)",
                gap: isCompact ? 12 : 14,
                alignItems: "start",
              }}
            >
              <div
                style={{
                  width: isCompact ? "min(100%, 340px)" : 132,
                  height: isCompact ? "auto" : 132,
                  aspectRatio: "1 / 1",
                  justifySelf: isCompact ? "center" : "start",
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "center",
                  background: "linear-gradient(180deg, #EEF6FF 0%, #FFFFFF 100%)",
                  border: "1px solid rgba(37,78,119,0.18)",
                  color: "#0B63D1",
                  fontWeight: 1000,
                  fontSize: 28,
                  overflow: "hidden",
                  boxShadow: "inset 0 0 0 6px rgba(255,255,255,0.65)",
                  position: "relative",
                }}
              >
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt={`${holderName} profile`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  holderName
                    .split(/\s+/)
                    .map((part) => part[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "GSN"
                )}
                <TrustPaperSeal compact />
              </div>
              <div style={{ display: "grid", gap: isCompact ? 10 : 0 }}>
                {[
                  ["id", "GSN ID", gmfnId],
                  ["shield", "Identity check", merchantViewPhoneVerified ? "Phone verified" : "Not fully shown"],
                  ["community", "Community", communityName],
                  ["hash", "Community ID", communityRef],
                ].map(([icon, label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact
                      ? "28px minmax(112px, 0.42fr) minmax(0, 1fr)"
                      : "18px minmax(74px, 0.62fr) minmax(0, 1fr)",
                    gap: isCompact ? 10 : 8,
                    alignItems: "center",
                    marginTop: isCompact ? 0 : 7,
                    minHeight: isCompact ? 36 : "auto",
                  }}
                >
                  <GsnLegacyIcon name={icon as GsnIconName} size={isCompact ? 30 : 24} />
                  <span
                    style={{
                      color: "#0B63D1",
                      fontWeight: 1000,
                      fontSize: isCompact ? 14 : 12,
                      lineHeight: 1.1,
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      color: "#334155",
                      fontWeight: 900,
                      fontSize: isCompact ? 14 : 12,
                      lineHeight: 1.18,
                      overflowWrap: "break-word",
                      wordBreak: "normal",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
              </div>
            </div>

            <div style={{ display: "grid", gap: 8, position: "relative" }}>
              {[
                [merchantViewPhoneVerified, merchantViewPhoneVerified ? "Phone verified" : "Phone not verified"],
                [true, communityIdentityLabel],
                [Boolean(identityStatusLabel), identityStatusLabel || "Phone verified; community membership recorded"],
                [Boolean(bankVerified), bankVerificationLabel],
                [Boolean(passportVerified), passportVerificationLabel],
              ].map(([ok, label]) => (
                <span
                  key={String(label)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "24px minmax(0, 1fr)",
                    gap: 8,
                    alignItems: "center",
                    minHeight: 42,
                    borderRadius: 9,
                    padding: "8px 10px",
                    background: ok ? "#F7FCF8" : "#FFFBF2",
                    border: `1px solid ${
                      ok ? "rgba(46,155,98,0.16)" : "rgba(214,170,69,0.20)"
                    }`,
                    color: ok ? "#166534" : "#7A3E08",
                    fontWeight: 1000,
                    fontSize: 12,
                    lineHeight: 1.2,
                  }}
                >
                  <span style={trustSlipTinyIconCircle(Boolean(ok))}>
                    <GsnLegacyIcon name={ok ? "check" : "document"} size={24} />
                  </span>
                  <span>{label}</span>
                </span>
              ))}
            </div>
          </section>

          <section
            style={{
              ...trustSlipSectionCard("#FFFFFF"),
              ...trustSlipScrollClearance(isCompact),
              order: 6,
              gridColumn: isCompact ? "1 / -1" : "2 / 3",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <TrustPaperWatermark name="community" color="#0B63D1" size={170} opacity={0.045} />
            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.15fr) minmax(280px, 0.85fr)",
                gap: 14,
                alignItems: "stretch",
              }}
            >
              <div>
                <div style={{ color: "#07172C", fontWeight: 1000, fontSize: 20 }}>
                  6. Instant community confirmation
                </div>
                <div
                  style={{
                    ...documentMetaCard(communityRelayAvailable ? "#F0FBF4" : "#FFF7E6"),
                    marginTop: 12,
                    color: "#334155",
                    lineHeight: 1.5,
                    fontWeight: 850,
                  }}
                >
                  {communityConfirmationText}
                </div>
                <div style={{ marginTop: 12, display: "grid", gap: 7 }}>
                  {communityConfirmationRows.map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto",
                        gap: 10,
                        padding: "8px 0",
                        borderBottom: "1px solid rgba(216,227,238,0.72)",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ color: "#526579", fontWeight: 900 }}>{label}</span>
                      <span style={statusPillStyle(String(value))}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ ...documentMetaCard("#F8FBFF"), display: "grid", gap: 12 }}>
                <div style={sectionLabel()}>Live response check</div>
                <div style={{ color: "#07172C", fontSize: 18, fontWeight: 1000 }}>
                  Ask eligible members to confirm now without exposing phone numbers.
                </div>
                <div style={{ color: "#526579", fontWeight: 800, lineHeight: 1.45 }}>
                  GSN asks eligible community responders inside the system. The public result shows counts against active community members, not private member details.
                </div>
                <PrimaryButton
                  type="button"
                  onClick={() => {
                    void requestCommunityPulse();
                  }}
                  busy={confirmationBusy}
                  busyLabel="Requesting..."
                  fullWidth
                  stableHeight={isCompact ? 52 : 52}
                  debugId="trust-slip.community-confirmation.request"
                  style={trustSlipPrimaryActionStyle(isCompact)}
                >
                  {trustSlipIconBadge("community", isCompact ? 26 : 28, "blue")}
                  Request instant confirmation
                </PrimaryButton>
                {communityVerifyPath ? (
                  <StableCtaLink
                    to={communityVerifyPath}
                    kind="primary"
                    stableHeight={58}
                    debugId="trust-slip.community-confirmation.open-community-record"
                    style={{ width: "100%" }}
                  >
                    {trustSlipIconBadge("search", 28, "blue")}
                    Open public community record
                  </StableCtaLink>
                ) : (
                  <SecondaryButton
                    type="button"
                    onClick={() => {
                      showNotice(
                        "error",
                        "The public community record is not ready yet. Request confirmation or refresh this TrustSlip, then try again."
                      );
                    }}
                    fullWidth
                    stableHeight={58}
                    debugId="trust-slip.community-confirmation.open-community-record"
                    style={trustSlipActionButtonStyle(isCompact)}
                  >
                    {trustSlipIconBadge("search", 28, "navy")}
                    Open public community record
                  </SecondaryButton>
                )}
                {confirmationOutcome ? (
                  <div style={{ ...documentMetaCard("#FFFFFF"), border: "1px solid rgba(46,155,98,0.18)" }}>
                    <div style={{ color: "#166534", fontWeight: 1000 }}>
                      Request opened
                    </div>
                    <div style={{ marginTop: 8, color: "#334155", fontWeight: 850, lineHeight: 1.45 }}>
                      {confirmationOutcome.visible_summary ||
                        "Community responses will appear as an aggregate result when members answer."}
                    </div>
                    <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                      <span style={statusPillStyle(firstTruthy(confirmationResult?.community_confidence, "Pending"))}>
                        Confidence: {firstTruthy(confirmationResult?.community_confidence, "Pending")}
                      </span>
                      <span style={{ color: "#526579", fontWeight: 800, fontSize: 13 }}>
                        Sent: {confirmationResult?.requests_sent ?? 0}; Responses:{" "}
                        {confirmationResult?.responses_received ?? 0} of{" "}
                        {confirmationResult?.active_member_count ?? 0}; Confirmed:{" "}
                        {confirmationResult?.confirmed_known_count ?? 0}
                      </span>
                      {confirmationPublicPath ? (
                        <StableCtaLink
                          to={confirmationPublicPath}
                          kind="soft"
                          stableHeight={isCompact ? 52 : 48}
                          debugId="trust-slip.community-confirmation.open-outcome"
                          style={{ marginTop: 2, width: "100%" }}
                        >
                          Open public outcome paper
                        </StableCtaLink>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section
            style={{
              ...trustSlipScrollClearance(isCompact),
              display: "contents",
            }}
          >
            <div
              style={{
                order: 2,
                gridColumn: isCompact ? "1 / -1" : "2 / 3",
                display: "grid",
                gap: 14,
              }}
            >
              {communityVerifyPath ? (
                <StableCtaLink
                  to={communityVerifyPath}
                  kind="primary"
                  stableHeight={isCompact ? 52 : 54}
                  debugId="trust-slip.paper.open-community-record"
                  style={trustSlipPrimaryActionStyle(isCompact)}
                >
                  <GsnLegacyIcon name="search" size={isCompact ? 28 : 30} />
                  Open public community record
                </StableCtaLink>
              ) : (
                <SecondaryButton
                  type="button"
                  onClick={() => {
                    showNotice(
                      "error",
                      "Public community record is not ready yet. Refresh TrustSlip or request community confirmation first."
                    );
                  }}
                  fullWidth
                  stableHeight={isCompact ? 52 : 54}
                  debugId="trust-slip.paper.open-community-record"
                  style={trustSlipPrimaryActionStyle(isCompact)}
                >
                  <GsnLegacyIcon name="search" size={isCompact ? 28 : 30} />
                  Open public community record
                </SecondaryButton>
              )}

              <div style={trustSlipSectionCard("#FFFFFF")}>
                <div style={trustSlipPaperTitle(isCompact)}>
                2. Current TrustSlip status
                </div>
              <div
                style={{
                  marginTop: 14,
                  borderRadius: 14,
                  padding: "18px 16px",
                  textAlign: "center",
                  background:
                    trustSlipStatusTone === "valid"
                      ? "linear-gradient(135deg, #2E9B62 0%, #1F8A4E 100%)"
                      : "linear-gradient(135deg, #FFF7E6 0%, #FFE8B5 100%)",
                  color: trustSlipStatusTone === "valid" ? "#FFFFFF" : "#92400E",
                  fontSize: isCompact ? 28 : 36,
                  fontWeight: 1000,
                  letterSpacing: 0.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                }}
              >
                <GsnLegacyIcon name="shield" size={isCompact ? 42 : 52} />
                {trustSlipStatusTitle}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) 118px",
                  gap: 12,
                  alignItems: "center",
                  marginTop: 14,
                }}
              >
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={helperText()}>Slip code: {trustSlipCode || "Awaiting issue"}</div>
                  <div style={helperText()}>
                    Issued: {safeDateTime(summary?.issued_at) || "Not stated"}
                  </div>
                  <div style={helperText()}>
                    Expires: {safeDateTime(summary?.expires_at) || "Not stated"}
                  </div>
                </div>
                {qrValue ? <TrustSlipQrCode value={qrValue} /> : null}
              </div>
              <SecondaryButton
                onClick={() => {
                  if (verifyPath) {
                    navigateWithOrigin(navigate, verifyPath, location);
                    return;
                  }
                  showNotice(
                    "error",
                    "This TrustSlip needs a fresh public code before the verify page can open. Refresh the TrustSlip, then try again."
                  );
                }}
                fullWidth
                stableHeight={isCompact ? 52 : 50}
                debugId="trust-slip.paper.open-verify"
                style={{ ...trustSlipActionButtonStyle(isCompact), marginTop: 14 }}
              >
                Open public verify
              </SecondaryButton>
              </div>
            </div>

            <div
              style={{
                ...trustSlipSectionCard("#FFFFFF"),
                order: 3,
                gridColumn: isCompact ? "1 / -1" : "1 / 2",
              }}
            >
              <div style={trustSlipPaperTitle(isCompact)}>
                3. TrustSlip decision summary
              </div>
              <div
                style={{
                  ...documentMetaCard("#FFF7E6"),
                  marginTop: 12,
                  color: "#07172C",
                  fontWeight: 1000,
                  lineHeight: 1.45,
                  display: "grid",
                  gridTemplateColumns: "34px 1fr",
                  gap: 10,
                  alignItems: "start",
                }}
              >
                <GsnLegacyIcon name="alert" size={34} />
                <span>{decisionSummaryText}</span>
              </div>
              {[
                ["Trust band", `${merchantBand} - ${merchantBandLabel}`],
                ["Trust limit signal", `${merchantTrustLimit} ${merchantCurrency}`],
                ["Evidence depth", trustSlipEvidenceLanguage.label],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    gap: 10,
                    padding: "10px 0",
                    borderBottom: "1px solid rgba(216,227,238,0.72)",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "#526579", fontWeight: 900 }}>{label}</span>
                  <span style={statusPillStyle(String(value))}>{value}</span>
                </div>
              ))}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                  border: "1px solid rgba(216,227,238,0.9)",
                  borderRadius: 14,
                  overflow: "hidden",
                  marginTop: 12,
                }}
              >
                {trustSlipGradeLegend.map(([grade, label]) => {
                  const active = trustSlipBandLetter === grade;
                  return (
                    <div
                      key={grade}
                      style={{
                        padding: "10px 6px",
                        textAlign: "center",
                        background: active ? "#FFF1F2" : grade === "A" || grade === "B" ? "#F0FBF4" : "#FFFDF5",
                        boxShadow: active ? "inset 0 0 0 2px rgba(200,58,58,0.45)" : "none",
                        borderLeft: "1px solid rgba(216,227,238,0.9)",
                      }}
                    >
                      <div style={{ color: active ? "#991B1B" : "#07172C", fontWeight: 1000 }}>
                        {grade}
                      </div>
                      <div style={{ color: "#526579", fontSize: 11, fontWeight: 850 }}>
                        {label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section
            style={{
              ...trustSlipScrollClearance(isCompact),
              display: "contents",
            }}
          >
            <div
              style={{
                ...trustSlipSectionCard("#FFFFFF"),
                order: 4,
                gridColumn: isCompact ? "1 / -1" : "2 / 3",
              }}
            >
              <div style={trustSlipPaperTitle(isCompact)}>
                4. What this TrustSlip says
              </div>
              <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                {trustSlipReadingRows.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      gap: 10,
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: "1px solid rgba(216,227,238,0.72)",
                    }}
                  >
                    <span
                      style={{
                        color: "#334155",
                        fontWeight: 900,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {trustSlipIconBadge(item.icon, 28, item.status === "Ready" ? "green" : "blue")}
                      {item.label}
                    </span>
                    <span style={statusPillStyle(item.status)}>{item.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                ...trustSlipSectionCard("#FFFFFF"),
                order: 5,
                gridColumn: isCompact ? "1 / -1" : "1 / 2",
              }}
            >
              <div style={trustSlipPaperTitle(isCompact)}>
                5. What this can be used for
              </div>
              <div style={{ marginTop: 12, display: "grid", gap: 13 }}>
                {trustSlipUseCases.map(([icon, item]) => (
                  <div key={item} style={{ display: "grid", gridTemplateColumns: "38px 1fr", gap: 12, alignItems: "center" }}>
                    <span
                      aria-hidden
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        background: "#EAF3FF",
                        display: "grid",
                        placeItems: "center",
                        color: "#0B63D1",
                        fontWeight: 1000,
                      }}
                    >
                      <GsnLegacyIcon name={icon} size={32} />
                    </span>
                    <span style={{ color: "#334155", fontWeight: 900 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            style={{
              ...trustSlipScrollClearance(isCompact),
              display: "contents",
            }}
          >
            <div
              style={{
                ...trustSlipSectionCard("#FFFFFF"),
                order: 7,
                gridColumn: isCompact ? "1 / -1" : "2 / 3",
              }}
            >
              <div style={trustSlipPaperTitle(isCompact)}>
                7. What this does NOT mean
              </div>
              <div style={{ ...documentMetaCard("#FFF1F2"), marginTop: 12, position: "relative", overflow: "hidden" }}>
                <TrustPaperWatermark name="alert" color="#991B1B" size={132} opacity={0.065} />
                {trustSlipLimits.map((item) => (
                  <div key={item} style={{ color: "#991B1B", fontWeight: 900, marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                    {trustSlipIconBadge("alert", 26, "red")}
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                ...trustSlipSectionCard("#FFFFFF"),
                order: 8,
                gridColumn: isCompact ? "1 / -1" : "1 / 2",
              }}
            >
              <div style={trustSlipPaperTitle(isCompact)}>
                8. Why a reader may trust this
              </div>
              <div style={{ ...documentMetaCard("#F0FBF4"), marginTop: 12, position: "relative", overflow: "hidden" }}>
                <TrustPaperWatermark name="shield" color="#166534" size={132} opacity={0.075} />
                {trustSlipTrustReasons.map((item) => (
                  <div key={item} style={{ color: "#166534", fontWeight: 900, marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                    <GsnLegacyIcon name="check" size={24} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            style={{
              ...trustSlipSectionCard("#FFFFFF"),
              ...trustSlipScrollClearance(isCompact),
              order: 9,
              gridColumn: "1 / -1",
            }}
          >
            <div style={trustSlipPaperTitle(isCompact)}>
              9. Quick actions
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
                gap: isCompact ? 9 : 10,
                marginTop: 12,
              }}
            >
              <SecondaryButton
                onClick={copyTrustSlipSnapshot}
                fullWidth
                stableHeight={isCompact ? 52 : 50}
                debugId="trust-slip.paper.copy"
                style={trustSlipActionButtonStyle(isCompact)}
              >
                {trustSlipIconBadge("copy", isCompact ? 26 : 28, "navy")}
                Copy TrustSlip
              </SecondaryButton>
              <PrimaryButton
                onClick={() => {
                  void refreshTrustSlip();
                }}
                busy={refreshing}
                busyLabel="Refreshing..."
                fullWidth
                stableHeight={isCompact ? 52 : 50}
                debugId="trust-slip.paper.refresh"
                style={trustSlipPrimaryActionStyle(isCompact)}
              >
                {trustSlipIconBadge("refresh", isCompact ? 26 : 28, "blue")}
                Refresh TrustSlip
              </PrimaryButton>
              <SecondaryButton
                onClick={() => {
                  if (verifyPath) {
                    navigateWithOrigin(navigate, verifyPath, location);
                    return;
                  }
                  showNotice(
                    "error",
                    "This TrustSlip needs a fresh public code before the verify page can open. Refresh the TrustSlip, then try again."
                  );
                }}
                fullWidth
                stableHeight={isCompact ? 52 : 50}
                debugId="trust-slip.paper.verify"
                style={trustSlipActionButtonStyle(isCompact)}
              >
                {trustSlipIconBadge("search", isCompact ? 26 : 28, "navy")}
                Verify public code
              </SecondaryButton>
            </div>
          </section>

          <div style={{ order: 10, gridColumn: "1 / -1" }}>
            <TrustPaperSecurityFooter text="Human-first TrustSlip: clear identity, clear status, clear limits, clear verification." />
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
      <style>{`
        @page { margin: 14mm; }
        @media print {
          body { background: #ffffff !important; }
          a[href]:after { content: "" !important; }
          button { display: none !important; }
          .print-trust-nav { display: none !important; }
          .print-trust-document,
          .print-trust-support {
            box-shadow: none !important;
            border: 1px solid rgba(148,163,184,0.34) !important;
            background: #ffffff !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .print-trust-document {
            color: #0b1f33 !important;
          }
          .print-trust-document * {
            color: inherit;
          }
          .print-trust-document .print-watermark {
            color: rgba(11,31,51,0.08) !important;
          }
        }
      `}</style>
      <div className="print-trust-nav">
        <PageTopNav
          sectionLabel="TrustSlip"
          title="TrustSlip"
          subtitle="Use TrustSlip to review the public trust summary. Open TrustSlip Verify when you need to confirm the current public reading."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.dashboard}
        />
      </div>

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section
        className="print-trust-document"
        style={{
          ...pageCard(
            "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"
          ),
          ...documentFrameStyle(),
        }}
      >
        <div className="print-watermark" aria-hidden style={documentWatermarkStyle()}>
          GSN TrustSlip
        </div>
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.05fr) minmax(320px, 0.95fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badge(true)}>Portable trust summary</span>
              <span style={badge(false)}>Portable verification summary</span>
            </div>

            <div style={sectionLabel()}>Portable trust verification</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.12,
              }}
            >
              {trustSlipCode
                ? "GSN TrustSlip"
                : "TrustSlip is still preparing"}
            </div>

            <div
              style={{
                marginTop: 12,
                ...helperText(),
                color: "#D7E3F1",
                maxWidth: 840,
              }}
            >
              A short public trust paper for a careful reader. It shows who this
              belongs to, what the current evidence says, and how to verify it.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Holder: {holderName}</span>
              <span style={badge(false)}>GSN ID: {gmfnId}</span>
              <span style={badge(false)}>Community: {communityName}</span>
              <span style={badge(false)}>Community ID: {communityRef}</span>
              <span style={badge(merchantViewPhoneVerified)}>Phone {merchantViewPhoneVerified ? "verified" : "not shown"}</span>
              <span style={badge(Boolean(identityStatusLabel))}>
                Identity: {identityStatusLabel || "not fully shown"}
              </span>
            </div>

            <div style={{ marginTop: 10, ...helperText(), color: "#D7E3F1" }}>
              Profile image is not identity evidence. Community membership is shown;
              government ID and affordability are not certified by this TrustSlip.
            </div>

            <CardActionRow style={{ marginTop: 16 }}>
              <PrimaryButton
                onClick={() =>
                  void handleCopy(
                    trustSlipCode,
                    "TrustSlip code copied.",
                    "TrustSlip code is not ready yet."
                  )
                }
                stableHeight={isCompact ? 52 : 50}
                minWidth={isCompact ? undefined : 176}
                debugId="trust-slip.copy-code"
              >
                Copy TrustSlip Code
              </PrimaryButton>

              <SecondaryButton
                onClick={() =>
                  void handleCopy(
                    verifyUrl,
                    "Verify link copied.",
                    "Verify link is not ready yet."
                  )
                }
                stableHeight={isCompact ? 52 : 50}
                minWidth={isCompact ? undefined : 158}
                debugId="trust-slip.copy-verify-link"
              >
                Copy Verify Link
              </SecondaryButton>

              <SecondaryButton
                onClick={() =>
                  void handleCopy(
                    gmfnId,
                    "GSN ID copied.",
                    "GSN ID is not ready yet."
                  )
                }
                stableHeight={isCompact ? 52 : 50}
                minWidth={isCompact ? undefined : 124}
                debugId="trust-slip.copy-gmfn-id"
              >
                Copy GSN ID
              </SecondaryButton>

              <SubtleButton
                onClick={() => {
                  if (typeof window !== "undefined" && typeof window.print === "function") {
                    window.print();
                    return;
                  }
                  showNotice(
                    "error",
                    "Print is not available in this browser. Use Copy snapshot or Copy verify link."
                  );
                }}
                stableHeight={isCompact ? 52 : 50}
                minWidth={isCompact ? undefined : 136}
                debugId="trust-slip.print"
              >
                Print TrustSlip
              </SubtleButton>

              <SubtleButton
                onClick={copyTrustSlipSnapshot}
                stableHeight={isCompact ? 52 : 50}
                minWidth={isCompact ? undefined : 190}
                debugId="trust-slip.copy-snapshot"
              >
                Copy TrustSlip snapshot
              </SubtleButton>
            </CardActionRow>
          </div>

          <div
            style={{
              ...softCard("rgba(255,255,255,0.94)"),
              border: "1px solid rgba(148,163,184,0.16)",
            }}
          >
            <div style={sectionLabel()}>Current portable reading</div>

            <ExplainToggle
              label="What this does"
              what="This portable reading summarizes the trust state that other people can verify from your current TrustSlip."
              why="It keeps the main public trust signals, document codes, and issue window visible in one place before you share or verify anything."
              next="Read the band, visible TrustSlip limit signal, cross-community consistency, and issue window here first, then use the TrustSlip code or verify route when needed."
              tone="light"
              style={{ marginTop: 12 }}
            />

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr 1fr" : "repeat(3, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <div style={statTile()}>
                <div style={sectionLabel()}>Band</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 18,
                    lineHeight: 1.25,
                  }}
                >
                  {merchantBand}
                </div>
                <div style={{ marginTop: 6, ...helperText(), fontSize: 12.5, lineHeight: 1.45 }}>
                  {merchantBandLabel}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Visible TrustSlip limit signal</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 18,
                    lineHeight: 1.25,
                  }}
                >
                  {merchantTrustLimit} {merchantCurrency}
                </div>
                <div style={{ marginTop: 6, ...helperText(), fontSize: 12.5, lineHeight: 1.45 }}>
                  Not an approved loan amount or payment guarantee.
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Cross-community consistency</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 18,
                    lineHeight: 1.25,
                  }}
                >
                  {cciScore} / {cciBand}
                </div>
                <div style={{ marginTop: 6, ...helperText(), fontSize: 12.5, lineHeight: 1.45 }}>
                  CCI is the internal label for this wider consistency reading.
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              <div style={documentMetaCard("#FFFFFF")}>
                <div style={sectionLabel()}>Evidence depth</div>
                <div style={{ marginTop: 6, ...helperText(), color: "#0B1F33" }}>
                  {evidenceDepthText}
                </div>
              </div>
              <div style={documentMetaCard("#FFF8E5")}>
                <div style={sectionLabel()}>Risk signal</div>
                <div style={{ marginTop: 6, ...helperText(), color: "#0B1F33" }}>
                  {riskSignalText}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, ...helperText() }}>
              Status: {trustSlipPublicStatus} - Visibility:{" "}
              {merchantVisibility}
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              {trustSlipStatusNote}
            </div>

            <div
              style={{
                marginTop: 14,
                borderRadius: 18,
                border: "1px solid rgba(11,31,51,0.10)",
                background: "#FFFFFF",
                padding: 14,
              }}
            >
              <div style={sectionLabel()}>Four-question answer</div>
              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {briefDecisionAnswers.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "grid",
                      gap: 4,
                      paddingBottom: 10,
                      borderBottom: "1px solid rgba(148,163,184,0.16)",
                    }}
                  >
                    <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 14 }}>
                      {item.label}
                    </div>
                    <div style={{ ...helperText(), lineHeight: 1.55 }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <div style={documentMetaCard("rgba(255,255,255,0.98)")}>
                <div style={sectionLabel()}>Document reference</div>
                <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                  TrustSlip code: {trustSlipCode || "Awaiting issue"}
                </div>
                <div style={{ marginTop: 6, ...helperText(), color: "#0B1F33" }}>
                  Verification code: {safeStr(summary?.verification_code || "Not stated")}
                </div>
              </div>

              <div style={documentMetaCard("rgba(248,251,255,0.98)")}>
                <div style={sectionLabel()}>Issue window</div>
                <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                  Issued: {safeDateTime(summary?.issued_at) || "Not stated"}
                </div>
                <div style={{ marginTop: 6, ...helperText(), color: "#0B1F33" }}>
                  Expires: {safeDateTime(summary?.expires_at) || "Not stated"}
                </div>
                <div style={{ marginTop: 6, ...helperText(), color: "#0B1F33" }}>
                  Expiry policy: {safeStr(summary?.expiry_policy || "Not stated")}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, ...documentMetaCard("#F8FBFF") }}>
              <div style={sectionLabel()}>What verification checks</div>
              <div style={{ marginTop: 6, ...helperText(), color: "#0B1F33" }}>
                Verification checks this TrustSlip code, holder reference, status,
                visibility, and issue window. It does not confirm government ID,
                affordability, available funds, debt-free status, future repayment,
                or merchant performance.
              </div>
            </div>
          </div>
        </div>

        <div style={documentFooterGrid(isCompact)}>
          <div>
            <div style={documentFooterLabel()}>Issue and expiry</div>
            <div style={{ marginTop: 6, ...helperText(), color: "#D7E3F1" }}>
              Issued: {safeDateTime(summary?.issued_at) || "Not stated"}
            </div>
            <div style={{ marginTop: 4, ...helperText(), color: "#D7E3F1" }}>
              Expires: {safeDateTime(summary?.expires_at) || "Not stated"}
            </div>
          </div>

          <div>
            <div style={documentFooterLabel()}>Verification control</div>
            <div style={{ marginTop: 6, ...helperText(), color: "#D7E3F1" }}>
              TrustSlip code: {trustSlipCode || "Awaiting issue"}
            </div>
            <div style={{ marginTop: 4, ...helperText(), color: "#D7E3F1" }}>
              Verify path: {verifyUrl || "Not available yet"}
            </div>
          </div>

          <div>
            <div style={documentFooterLabel()}>Institutional notice</div>
            <div style={{ marginTop: 6, ...helperText(), color: "#D7E3F1" }}>
              Evidence only. Not a bank guarantee. Not auto-debit. Not approval
              for credit, goods, release, work, or referral by itself.
            </div>
            <div style={{ marginTop: 4, ...helperText(), color: "#AFC4D9" }}>
              {disclaimer}
            </div>
          </div>
        </div>
      </section>

      <section style={disclosureShell()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={sectionLabel()}>Reader explanation</div>
            <div style={{ marginTop: 6, ...helperText() }}>
              This explains the TrustSlip in ordinary language. Keep it closed when you only need the document and verify link.
            </div>
          </div>
          <SubtleButton
            onClick={() => toggleSection("reader")}
            stableHeight={isCompact ? 48 : 42}
            style={collapseToggle()}
            debugId="trust-slip.toggle-reader"
          >
            {collapsed.reader ? "Open" : "Hide"}
          </SubtleButton>
        </div>

        {!collapsed.reader ? (
          <div style={disclosureBody()}>
            <TrustSlipReaderBlock
              compact={isCompact}
              holderName={holderName}
              gmfnId={gmfnId}
              profileImageUrl={profileImageUrl}
              communityName={communityName}
              communityGlobalId={communityRef}
              holderRole={holderRole}
              activeMemberCount={activeMemberCount}
              activeCommunityCount={activeCommunityCount}
              memberWitnessCount={memberWitnessCount}
              membershipStrengthLabel={membershipStrengthLabel}
              membershipRenewalStatusLabel={membershipRenewalStatusLabel}
              membershipValidUntil={membershipValidUntil}
              nextWitnessRenewalAt={nextWitnessRenewalAt}
              nextWitnessRenewalStatusLabel={nextWitnessRenewalStatusLabel}
              membershipCurrentnessLabel={membershipCurrentnessLabel}
              membershipCurrentnessScope={membershipCurrentnessScope}
              memberCredentialPath={memberCredentialPath}
              communityActivityCount={communityActivityCount}
              communityActivityLatestAt={communityActivityLatestAt}
              communityActivityCategories={communityActivityCategories}
              communityActivityLabel={communityActivityLabel}
              sponsorCount={summary?.sponsor_count ?? summary?.merchant_summary?.sponsor_count}
              phoneVerified={merchantViewPhoneVerified}
              identityStatusLabel={identityStatusLabel}
              cciScore={cciScore}
              cciBand={cciBand}
              cciMeaning={cciMeaning}
              trustLimit={merchantTrustLimit}
              currency={merchantCurrency}
              readerVerdict={readerVerdict}
              questions={fourDecisionQuestions}
            />
          </div>
        ) : null}
      </section>

      <section style={disclosureShell()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={sectionLabel()}>Help using this TrustSlip</div>
            <div style={{ marginTop: 6, ...helperText() }}>
              Use this when you need to share, explain, or verify the TrustSlip without opening the fuller Trust Passport.
            </div>
          </div>
          <SubtleButton
            onClick={() => toggleSection("nextActions")}
            stableHeight={isCompact ? 48 : 42}
            style={collapseToggle()}
            debugId="trust-slip.toggle-help"
          >
            {collapsed.nextActions ? "Open" : "Hide"}
          </SubtleButton>
        </div>
        {!collapsed.nextActions ? (
          <div style={disclosureBody()}>
            <ExplainToggle
              label="What this screen does"
              what="TrustSlip is the portable public trust summary for your current trust state."
              why="It keeps the public-facing trust summary, code, expiry window, and verification route together in one shareable place."
              next="Start with the main TrustSlip paper, then use TrustSlip Verify when you need to confirm the current public reading."
              tone="blue"
            />
            <NextActionGuide
              storageKey="gmfn.trustSlip.nextActionGuide.v1"
              compact={isCompact}
              items={guideItems}
              intro="Say what you need next in simple words, like verify this code, explain the trust story, or open the identity side behind the same document."
              onSelect={handleGuideSelect}
            />
            <TrustDocumentActionGuide content={actionGuide} compact={isCompact} />
            <TrustDocumentFamilyMap
              compact={isCompact}
              items={trustDocumentFamilyItems}
              title="How TrustSlip fits into the wider trust-document family"
              intro="TrustSlip is the portable summary layer. Use this map when you need to separate the fuller Trust Passport story from the shorter outward-facing document and the public verification check that shows whether it is still current."
            />
            <TrustDocumentUseCases
              compact={isCompact}
              items={trustDocumentUseCases}
              title="Which trust question should stay in TrustSlip?"
              intro="Stay here when the task is carrying a concise outward-facing record. Move outward to public verification for current validity, or back inward to Trust Passport and Identity & Integrity when the fuller story matters."
            />
          </div>
        ) : null}
      </section>

      <section
        id="merchant-verify-portal"
        className="print-trust-support"
        style={pageCard("#FFFFFF")}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={sectionLabel()}>Merchant verification</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Use this when someone outside GSN needs to check whether this TrustSlip is current enough to review.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("merchantVerify")}
            stableHeight={isCompact ? 48 : 42}
            style={collapseToggle()}
            debugId="trust-slip.toggle-merchant-verify"
          >
            {collapsed.merchantVerify ? "Open" : "Hide"}
          </SubtleButton>
        </div>

        {!collapsed.merchantVerify ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "170px minmax(0, 1fr)",
              gap: 16,
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              {qrValue ? (
                <TrustSlipQrCode value={qrValue} size={128} />
              ) : (
                <div
                  style={{
                    width: 144,
                    height: 144,
                    borderRadius: 14,
                    border: "1px solid rgba(11,31,51,0.10)",
                    background: "#F8FBFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#64748B",
                    fontSize: 13,
                    textAlign: "center",
                    padding: 12,
                  }}
                >
                  QR code appears here when TrustSlip is ready
                </div>
              )}

              <div
                style={{
                  fontSize: 12,
                  color: "#64748B",
                  fontWeight: 700,
                  textAlign: "center",
                }}
              >
                Scan to verify
                <div style={{ marginTop: 6, color: "#94A3B8", fontWeight: 800 }}>
                  Verification record
                </div>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={badge(merchantVerifyActive)}>
                  {merchantVerifyActive ? "Merchant Verify active" : "Merchant Verify inactive"}
                </span>
                <span style={badge(false)}>
                  {merchantVerifyRequired ? "Subscription required" : "Subscription satisfied"}
                </span>
              </div>

              <div
                style={{
                  marginTop: 12,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.3,
                }}
              >
                Open or share the verify page
              </div>

              <div style={{ marginTop: 10, ...helperText() }}>
                {merchantVerifyDetail}
              </div>

              <div style={{ marginTop: 10, ...helperText() }}>
                Unlock result:{" "}
                {merchantVerifyActive
                  ? "Outside merchants can use this verification page as current evidence."
                  : merchantVerifyRequired
                    ? "Outside merchants cannot use this verification page until Merchant Verify is active."
                    : "This verification page is not active for outside merchants yet."}
              </div>

              <div style={{ marginTop: 10, ...helperText() }}>
                {merchantViewVerified ? "Merchant view checked." : "Merchant view not checked yet."}{" "}
                {merchantViewActive ? "Merchant view active." : "Merchant view not active yet."}{" "}
                {merchantViewPhoneVerified ? "Phone verified." : "Phone not verified or not shown."}
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={badge(true)}>
                  Code: {trustSlipCode || "Awaiting issue"}
                </span>
                <span style={badge(false)}>
                  Visibility: {merchantVisibility}
                </span>
                <span style={badge(false)}>
                  Status: {trustSlipPublicStatus}
                </span>
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                <div style={helperText()}>
                  Verify link: {verifyUrl || "Not available yet"}
                </div>
                <div style={helperText()}>
                  Expires: {safeStr(summary?.expires_at) ? safeDateTime(summary?.expires_at) : "No expiry stated"}
                </div>
              </div>

              <CardActionRow style={{ marginTop: 14 }}>
                {verifyPath ? (
                  <StableCtaLink
                    to={verifyPath}
                    kind="primary"
                    stableHeight={isCompact ? 52 : 50}
                    fullWidth={isCompact}
                    minWidth={isCompact ? undefined : 190}
                    debugId="trust-slip.open-verify"
                  >
                    Open TrustSlip Verify
                  </StableCtaLink>
                ) : (
                  <SecondaryButton
                    type="button"
                    onClick={() => {
                      showNotice(
                        "error",
                        "This TrustSlip needs a fresh public code before outside verification can open. Refresh the TrustSlip, then try again."
                      );
                    }}
                    stableHeight={isCompact ? 52 : 50}
                    fullWidth={isCompact}
                    minWidth={isCompact ? undefined : 160}
                    debugId="trust-slip.open-verify"
                  >
                    Prepare verify link
                  </SecondaryButton>
                )}

                <SecondaryButton
                  onClick={() =>
                    void handleCopy(
                      verifyUrl,
                      "Verify link copied.",
                      "Verify link is not ready yet."
                    )
                  }
                  stableHeight={isCompact ? 52 : 50}
                  fullWidth={isCompact}
                  minWidth={isCompact ? undefined : 168}
                  debugId="trust-slip.copy-verify-link-merchant"
                >
                  Copy Verify Link
                </SecondaryButton>

                {verifyPath ? (
                  <StableCtaLink
                    to={verifyPath}
                    target="_blank"
                    rel="noreferrer"
                    kind="soft"
                    stableHeight={isCompact ? 52 : 50}
                    fullWidth={isCompact}
                    minWidth={isCompact ? undefined : 176}
                    debugId="trust-slip.open-merchant-verify"
                  >
                    Open Public Verify
                  </StableCtaLink>
                ) : null}
              </CardActionRow>
            </div>
          </div>
        ) : null}
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={sectionLabel()}>Evidence and exposure context</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Capacity and exposure indicators appear here.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("evidence")}
            stableHeight={isCompact ? 48 : 42}
            style={collapseToggle()}
            debugId="trust-slip.toggle-evidence"
          >
            {collapsed.evidence ? "Open" : "Hide"}
          </SubtleButton>
        </div>

        {!collapsed.evidence ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={innerCard("#F8FBFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Capacity context
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={helperText()}>
                  Available guarantee capacity: {firstTruthy(capacityContext?.available_guarantee_capacity, "Not provided")}
                </div>
                <div style={helperText()}>
                  Current locked guarantees: {firstTruthy(capacityContext?.current_locked_guarantees, "Not provided")}
                </div>
                <div style={helperText()}>
                  Overexposure ratio: {firstTruthy(capacityContext?.overexposure_ratio, "Not provided")}
                </div>
                <div style={helperText()}>
                  Risk level: {safeStr(capacityContext?.risk_level || "unknown")}
                </div>
                <div style={helperText()}>
                  Reasons: {capacityReasons.length ? capacityReasons.join(", ") : "Not provided"}
                </div>
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Network signal
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={helperText()}>
                  Graph score: {safeStr(summary?.graph_score || "Not stated")}
                </div>
                <div style={helperText()}>
                  Active community count: {countOrNotProvided(summary?.active_clan_count)}
                </div>
                <div style={helperText()}>
                  Sponsor count: {countOrNotProvided(summary?.sponsor_count)}
                </div>
                <div style={helperText()}>
                  Counterparties: {countOrNotProvided(summary?.unique_counterparties)}
                </div>
              </div>
            </div>

            <div style={innerCard("#F8FBFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Recent trust context
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={helperText()}>
                  Issued: {safeDateTime(summary?.issued_at) || "Not stated"}
                </div>
                <div style={helperText()}>
                  Expires: {safeDateTime(summary?.expires_at) || "Not stated"}
                </div>
                <div style={helperText()}>
                  Last release: {safeDateTime(summary?.last_release_at) || "Not stated"}
                </div>
                <div style={helperText()}>
                  Last full repayment: {safeDateTime(summary?.last_full_repayment_at) || "Not stated"}
                </div>
                <div style={helperText()}>
                  Days since full repayment: {safeStr(summary?.days_since_last_full_repayment ?? "Not stated")}
                </div>
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Decision cautions
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={helperText()}>
                  Readiness: {safeStr(readinessContext?.recommendation || "Not stated")}
                </div>
                <div style={helperText()}>
                  Readiness score: {safeStr(readinessContext?.readiness_score ?? "Not stated")}
                </div>
                <div style={helperText()}>
                  Risk flags: {riskSignalText}
                </div>
                <div style={helperText()}>
                  Readiness reasons: {readinessReasons.length ? readinessReasons.join(", ") : "Not provided"}
                </div>
              </div>
            </div>

            <div style={innerCard("#F8FBFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Contribution discipline
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={helperText()}>
                  Expected: {countText(contributionDiscipline?.expected_count)}
                </div>
                <div style={helperText()}>
                  Completed: {countText(contributionDiscipline?.confirmed_count)}
                </div>
                <div style={helperText()}>
                  Part paid: {countText(contributionDiscipline?.partial_count)}
                </div>
                <div style={helperText()}>
                  Still open: {countText(contributionDiscipline?.outstanding_count)}
                </div>
                <div style={helperText()}>
                  Expired/defaulted: {countText(contributionDiscipline?.expired_or_defaulted_count)}
                </div>
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Repayment discipline
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={helperText()}>
                  Expected: {countText(repaymentDiscipline?.expected_count)}
                </div>
                <div style={helperText()}>
                  Completed: {countText(repaymentDiscipline?.confirmed_count)}
                </div>
                <div style={helperText()}>
                  Part paid: {countText(repaymentDiscipline?.partial_count)}
                </div>
                <div style={helperText()}>
                  Still open: {countText(repaymentDiscipline?.outstanding_count)}
                </div>
                <div style={helperText()}>
                  Expired/defaulted: {countText(repaymentDiscipline?.expired_or_defaulted_count)}
                </div>
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Personal commitment
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={helperText()}>
                  Commitments recorded: {countText(personalCommitmentDiscipline?.distinct_commitment_count)}
                </div>
                <div style={helperText()}>
                  Check-ins: {countText(personalCommitmentDiscipline?.checkin_count)}
                </div>
                <div style={helperText()}>
                  Milestones: {countText(personalCommitmentDiscipline?.milestone_count)}
                </div>
                <div style={helperText()}>
                  Completed: {countText(personalCommitmentDiscipline?.completed_count)}
                </div>
                <div style={helperText()}>
                  Missed/replanned: {countText(personalCommitmentDiscipline?.missed_reported_count)}
                </div>
              </div>
            </div>

            <div style={innerCard("#F8FBFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Human reading
              </div>

              <div style={{ marginTop: 10, ...helperText() }}>
                {commitmentPlainLanguage ||
                  personalCommitmentPlainLanguage ||
                  "Recorded contribution or repayment expectations are not shown yet. A reader should ask for more evidence before taking a bigger risk."}
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Personal commitments show member-recorded discipline. Expected payments show contribution or repayment evidence.
              </div>
              {personalCommitmentPlainLanguage && commitmentPlainLanguage ? (
                <div style={{ marginTop: 8, ...helperText() }}>
                  Additional personal commitment signal: {personalCommitmentPlainLanguage}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={sectionLabel()}>Institutional notes</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Keep the disclaimers and related trust pages clearly visible.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("notes")}
            stableHeight={isCompact ? 48 : 42}
            style={collapseToggle()}
            debugId="trust-slip.toggle-notes"
          >
            {collapsed.notes ? "Open" : "Hide"}
          </SubtleButton>
        </div>

        {!collapsed.notes ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr 1fr",
              gap: 12,
            }}
          >
            <div style={innerCard("#F8FBFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Institutional note
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                {disclaimer}
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                This is not a bank guarantee.
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                No automatic debit is connected.
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Trust Passport
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Trust Passport explains the full trust story. TrustSlip shows the current portable state.
              </div>

              <div style={{ marginTop: 12 }}>
                <StableCtaLink
                  to={routes.trust}
                  stableHeight={isCompact ? 52 : 48}
                  fullWidth={isCompact}
                  minWidth={isCompact ? undefined : 172}
                  debugId="trust-slip.open-trust"
                >
                  Open Trust Passport
                </StableCtaLink>
              </div>
            </div>

            <div style={innerCard("#F8FBFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Executive summary PDF
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Keep the executive summary visible here so reviewers can open the current institutional summary when needed.
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <StableCtaLink
                  to={GMFN_EXEC_SUMMARY_URL}
                  target="_blank"
                  rel="noreferrer"
                  stableHeight={isCompact ? 52 : 48}
                  fullWidth={isCompact}
                  minWidth={isCompact ? undefined : 214}
                  debugId="trust-slip.open-executive-summary"
                >
                  Open Executive Summary
                </StableCtaLink>

                <StableCtaLink
                  to={routes.guide}
                  kind="soft"
                  stableHeight={isCompact ? 52 : 48}
                  fullWidth={isCompact}
                  minWidth={isCompact ? undefined : 126}
                  debugId="trust-slip.open-guide"
                >
                  Open Guide
                </StableCtaLink>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}




