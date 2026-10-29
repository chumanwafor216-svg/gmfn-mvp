import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NextActionGuide from "../components/NextActionGuide";
import { RealLifeMeaningGuide } from "../components/RealLifeMeaningGuide";
import {
  CardActionRow,
  PrimaryButton,
  SecondaryButton,
  StableButton,
  StableCtaLink,
  StableDisclosureSummary,
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
  listMyClans,
  listTrustEvents,
  confirmSignedInPhoneVerification,
  recordSignedInIdentityPhoto,
  recordSignedInOfficialId,
  resendSignedInPhoneVerification,
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
import { structuredErrorDetail, structuredErrorMessage } from "../lib/structuredErrors";
import { buildIdentityActionGuide } from "../lib/trustDocumentActionGuide";
import { buildTrustDocumentFamilyItems } from "../lib/trustDocumentFamilyMap";
import { buildTrustDocumentUseCaseItems } from "../lib/trustDocumentUseCases";
import { buildIdentityIntegrityGuideItems } from "../lib/trustDocumentGuide";
import { buildIdentityIntegritySnapshot } from "../lib/trustDocumentSnapshots";
import {
  canonicalPublicFrontendUrl,
  publicCommunityMemberCredentialPath,
} from "../lib/publicLinks";
import {
  getContextualEvidencePosture,
  getTrustBandLanguage,
  getTrustBandShortLabel,
  normalizeTrustBand,
} from "../lib/trustBandLanguage";
import { resolveProfileImageUrl } from "../lib/profileImage";
import { getRealLifeTrustGuidance } from "../lib/realLifeTrustGuidance";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";

const LazyQRCodeSVG = React.lazy(async () => {
  const module = await import("qrcode.react");
  return { default: module.QRCodeSVG };
});

const GSN_GLOBE_QR_MARK = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
    <defs>
      <radialGradient id="g" cx="35%" cy="25%" r="80%">
        <stop offset="0" stop-color="#FFF4C7"/>
        <stop offset=".45" stop-color="#E7B64B"/>
        <stop offset="1" stop-color="#8C5B10"/>
      </radialGradient>
    </defs>
    <circle cx="48" cy="48" r="44" fill="#061827" stroke="#D6AA45" stroke-width="4"/>
    <circle cx="48" cy="48" r="34" fill="url(#g)"/>
    <path d="M17 42c18 8 43 6 62-5M17 56c18 8 43 6 62-5M28 20c15 17 20 39 13 60M55 15c12 21 13 44 3 66"
      fill="none" stroke="#061827" stroke-width="5" stroke-linecap="round" opacity=".9"/>
  </svg>
`)}`;

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
  active?: boolean | null;
  verified?: boolean | null;
  public_verify_url?: string | null;
  verification_code?: string | null;
  verification_token?: string | null;
  token?: string | null;
  community_global_id?: string | null;
  community_code?: string | null;
  community_id?: string | number | null;
  phone_recorded?: boolean | null;
  phone_verified?: boolean | null;
  bank_details_recorded?: boolean | null;
  bank_verified?: boolean | null;
  official_id_recorded?: boolean | null;
  official_id_verified?: boolean | null;
  photo_recorded?: boolean | null;
  photo_verified?: boolean | null;
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
  ok?: boolean | null;
  reason?: string | null;
  detail?: string | null;
};

type IdentityCommunityRow = {
  id?: number | string | null;
  clan_id?: number | string | null;
  name?: string | null;
  display_name?: string | null;
  marketplace_name?: string | null;
  community_code?: string | null;
  code?: string | null;
  global_id?: string | null;
  status?: string | null;
  membership_status?: string | null;
  member_status?: string | null;
  role?: string | null;
  member_role?: string | null;
  membership_role?: string | null;
  participant_role?: string | null;
};

type ReadingState = {
  classText: string;
  postureSource: string;
  tone: "green" | "yellow" | "red" | "neutral";
  statusText: string;
  whyText: string;
};

type NoticeTone = "success" | "error";
type PhoneTaskTone = "success" | "error";

type PhoneConflictState = {
  recoveryPath: string;
  title: string;
  firstStep: string;
};

type CollapseState = {
  evidenceMeaning: boolean;
  summary: boolean;
  continuity: boolean;
  recovery: boolean;
  reasons: boolean;
  timeline: boolean;
  next: boolean;
  guides: boolean;
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

type IdentityIntegrityDataSnapshot = {
  me: any | null;
  currentClan: any | null;
  communities: IdentityCommunityRow[];
  trustSlip: TrustSlipRecord | null;
  guidance: GuidanceSnapshot | null;
  trustWhyRaw: any | null;
  events: TrustEventRow[];
  identityRisk: IdentityRiskSummary | null;
  identityRecovery: IdentityRecoverySummary | null;
};

type GsnIdentityCardShareImageParams = {
  displayName: string;
  initials: string;
  avatarSrc: string;
  gmfnId: string;
  cardStatus: string;
  memberships: string;
  verifyDisplay: string;
  qrDataUrl: string;
  valid: boolean;
};
const IDENTITY_PAGE_UI_STORAGE_KEY = "gmfn.identityPage.sections.v4";

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
  const detail = structuredErrorDetail(err);

  if (safeStr(detail?.code) === "phone_owned_by_another_identity") {
    const accountState = safeStr(detail?.account_state);
    const firstStep =
      accountState === "pending_join_or_create"
        ? "Open the original join/create activation path for that GSN ID."
        : safeStr(detail?.first_step) ||
          "Sign in to that GSN ID, or ask support/admin to merge after ownership check.";
    return [
      "This phone belongs to another GSN identity.",
      "Why: phone verification unlocks TrustSlip code and QR.",
      `First: ${firstStep}`,
    ].join("\n");
  }

  if (detail) {
    const message = firstTruthy(detail.message, detail.detail, detail.title);
    const why = firstTruthy(detail.why_it_matters, detail.why);
    const firstStep = firstTruthy(detail.first_step, detail.next_step);
    const structuredMessage = [
      message,
      why ? `Why it matters: ${why}` : "",
      firstStep ? `First step: ${firstStep}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    if (structuredMessage) return structuredMessage;
  }

  return structuredErrorMessage(err, "Phone verification could not start.");
}

function parsePhoneTaskConflict(err: any): PhoneConflictState | null {
  const detail = structuredErrorDetail(err);
  if (safeStr(detail?.code) !== "phone_owned_by_another_identity") {
    return null;
  }

  return {
    recoveryPath: safeStr(detail?.recovery_path) || "/login",
    title: safeStr(detail?.title) || "Phone belongs to another GSN identity",
    firstStep:
      safeStr(detail?.first_step) ||
      "Sign in to the GSN ID that already owns this phone, or ask support/admin to merge after ownership check.",
  };
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

function safeCompactDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeDate(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function communityStatusOf(row: IdentityCommunityRow): string {
  return safeStr(row.membership_status || row.member_status || row.status).toLowerCase();
}

function isActiveCommunityRow(row: IdentityCommunityRow): boolean {
  const status = communityStatusOf(row);

  if (!status) return false;
  if (
    [
      "inactive",
      "expired",
      "removed",
      "rejected",
      "declined",
      "suspended",
      "left",
      "pending",
    ].some((blocked) => status.includes(blocked))
  ) {
    return false;
  }

  return ["active", "approved", "member", "joined", "current", "verified", "accepted"].some(
    (ready) => status.includes(ready)
  );
}

function communityRoleOf(row: IdentityCommunityRow): string {
  return safeStr(
    row.membership_role || row.member_role || row.participant_role || row.role
  ).toLowerCase();
}

function countByRole(rows: IdentityCommunityRow[], target: string): number {
  return rows.filter((row) => communityRoleOf(row).includes(target)).length;
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

function decongestedSectionCard(
  collapsed: boolean,
  compact: boolean,
  bg = "#FFFFFF"
): React.CSSProperties {
  return {
    ...pageCard(bg),
    padding: collapsed ? (compact ? 12 : 14) : compact ? 14 : 20,
    boxShadow: collapsed
      ? "0 8px 20px rgba(15,23,42,0.035)"
      : "0 14px 34px rgba(15,23,42,0.045), 0 2px 8px rgba(15,23,42,0.02)",
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

function identityCardCanvasBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), "image/png", 0.96);
    } catch {
      resolve(null);
    }
  });
}

function GsnNetworkGlobeMark({ compact = false }: { compact?: boolean }) {
  const id = React.useId().replace(/:/g, "");
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      style={{
        display: "block",
        width: compact ? 42 : 72,
        height: compact ? 42 : 72,
        flex: "0 0 auto",
        filter: "drop-shadow(0 4px 6px rgba(1,9,22,0.28))",
      }}
    >
      <defs>
        <radialGradient id={`${id}-globe`} cx="34%" cy="24%" r="78%">
          <stop offset="0%" stopColor="#FFF5CF" />
          <stop offset="38%" stopColor="#F2C766" />
          <stop offset="72%" stopColor="#D6A239" />
          <stop offset="100%" stopColor="#87570F" />
        </radialGradient>
        <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF4C5" />
          <stop offset="52%" stopColor="#E6B348" />
          <stop offset="100%" stopColor="#9A6418" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="50" fill={`url(#${id}-globe)`} />
      <g fill="none" stroke="#08233A" strokeLinecap="round">
        <path d="M14 50c24 11 59 9 92-7" strokeWidth="7" />
        <path d="M14 68c24 11 59 9 92-7" strokeWidth="7" />
        <path d="M28 22c21 20 28 51 18 81" strokeWidth="7" />
        <path d="M69 12c17 27 18 63 3 96" strokeWidth="7" />
      </g>
      <ellipse
        cx="60"
        cy="60"
        rx="55"
        ry="22"
        fill="none"
        stroke={`url(#${id}-ring)`}
        strokeWidth="5"
        transform="rotate(-18 60 60)"
      />
    </svg>
  );
}

function GsnDottedWorldMap() {
  const id = React.useId().replace(/:/g, "");
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 760 300"
      preserveAspectRatio="xMidYMid slice"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
        pointerEvents: "none",
      }}
    >
      <defs>
        <pattern id={`${id}-dots`} width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="2.2" cy="2.2" r="1.5" fill="rgba(25,104,160,0.52)" />
        </pattern>
      </defs>
      <g transform="translate(254 44) scale(.72)" fill={`url(#${id}-dots)`} opacity=".62">
        <path d="M37 28l54-17 50 9 35 29-9 32-31 13-7 33-29 21-17-15-27 3-19-26-25-11 10-24-15-20z" />
        <path d="M182 82l47-14 42 14 31-5 38 22-12 23-32 7-13 31-30 4-15-23-34-4-14-19z" />
        <path d="M323 100l31 11 22 34-12 52-21 42-24-18 3-38-15-27z" />
        <path d="M397 107l54-18 67 10 35 22-16 18-41-2-25 26-40-9-21 12-19-29z" />
        <path d="M504 188l37-7 33 18-7 26-42 5-25-21z" />
      </g>
    </svg>
  );
}

function drawIdentityCardRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawIdentityCardCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 2
): number {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !current) {
      current = test;
      return;
    }
    lines.push(current);
    current = word;
  });
  if (current) lines.push(current);

  lines.slice(0, maxLines).forEach((line, index) => {
    let displayLine = line;
    if (index === maxLines - 1 && lines.length > maxLines) {
      while (displayLine && ctx.measureText(`${displayLine}...`).width > maxWidth) {
        displayLine = displayLine.slice(0, -1);
      }
      displayLine = `${displayLine.trim()}...`;
    }
    ctx.fillText(displayLine, x, y + index * lineHeight);
  });

  return y + Math.min(lines.length, maxLines) * lineHeight;
}

async function loadIdentityCardImage(src: string): Promise<HTMLImageElement | null> {
  const url = safeStr(src);
  if (!url || typeof Image === "undefined") return null;

  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

async function buildGsnIdentityCardShareImage(
  params: GsnIdentityCardShareImageParams,
  includeAvatar = true
): Promise<File | null> {
  if (typeof document === "undefined") return null;

  const width = 1600;
  const height = 980;
  const navy = "#041827";
  const navy2 = "#07304C";
  const gold = "#F2C766";
  const goldDeep = "#C9902D";
  const green = "#19C77B";
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, width, height);
  drawIdentityCardRoundRect(ctx, 16, 16, width - 32, height - 32, 48);
  ctx.save();
  ctx.clip();

  const top = ctx.createLinearGradient(0, 0, width, height * 0.78);
  top.addColorStop(0, "#02131F");
  top.addColorStop(0.58, navy2);
  top.addColorStop(1, navy);
  ctx.fillStyle = top;
  ctx.fillRect(16, 16, width - 32, 744);

  ctx.fillStyle = "rgba(24,100,151,0.24)";
  const mapDots = [
    [720, 145], [748, 128], [778, 138], [805, 122], [836, 136], [868, 132],
    [902, 151], [930, 144], [958, 162], [986, 154], [1014, 172], [1042, 160],
    [1070, 180], [1100, 176], [1130, 190], [1160, 184], [1192, 199], [1224, 194],
    [768, 176], [800, 190], [832, 179], [866, 198], [900, 188], [936, 209],
    [974, 201], [1012, 220], [1050, 213], [1090, 230], [1130, 224], [1170, 242],
    [840, 228], [878, 242], [918, 235], [958, 254], [1000, 247], [1043, 265],
    [1088, 258], [1134, 276], [1178, 270], [1222, 288], [1265, 280], [1305, 300],
  ];
  mapDots.forEach(([x, y], index) => {
    ctx.beginPath();
    ctx.arc(x, y + (index % 3) * 5, 4.2, 0, Math.PI * 2);
    ctx.fill();
  });

  const globeX = 138;
  const globeY = 135;
  const globeRadius = 84;
  const globeFill = ctx.createRadialGradient(globeX - 28, globeY - 34, 8, globeX, globeY, globeRadius);
  globeFill.addColorStop(0, "#FFF6D7");
  globeFill.addColorStop(0.42, gold);
  globeFill.addColorStop(0.74, "#D6A13A");
  globeFill.addColorStop(1, "#86560F");
  ctx.fillStyle = globeFill;
  ctx.beginPath();
  ctx.arc(globeX, globeY, globeRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#08233A";
  ctx.lineWidth = 11;
  for (const offset of [-18, 14]) {
    ctx.beginPath();
    ctx.ellipse(globeX, globeY + offset, 76, 27, -0.2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(globeX - 8, globeY, 32, 78, -0.28, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = gold;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.ellipse(globeX, globeY, 93, 35, -0.32, 0, Math.PI * 2);
  ctx.stroke();

  const logoGold = ctx.createLinearGradient(230, 74, 610, 190);
  logoGold.addColorStop(0, "#FFF2B7");
  logoGold.addColorStop(0.52, gold);
  logoGold.addColorStop(1, goldDeep);
  ctx.fillStyle = logoGold;
  ctx.font = "1000 118px Arial, Helvetica, sans-serif";
  ctx.fillText("GSN", 238, 155);
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.font = "900 26px Arial, Helvetica, sans-serif";
  ctx.fillText("GLOBAL SUPPORT NETWORK", 245, 198);
  ctx.fillStyle = "rgba(255,255,255,0.68)";
  ctx.font = "900 18px Arial, Helvetica, sans-serif";
  ctx.fillText("PEOPLE   |   TRUST   |   OPPORTUNITY", 245, 235);

  ctx.strokeStyle = "rgba(214,170,69,0.54)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(1248, 75);
  ctx.lineTo(1248, 225);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = "800 18px Arial, Helvetica, sans-serif";
  const motto = ["STRONGER PEOPLE", "STRONGER COMMUNITIES", "A MORE INCLUSIVE", "GLOBAL ECONOMY"];
  motto.forEach((line, index) => ctx.fillText(line, 1272, 105 + index * 32));

  const avatar = includeAvatar ? await loadIdentityCardImage(params.avatarSrc) : null;
  const avatarX = 76;
  const avatarY = 300;
  const avatarWidth = 385;
  const avatarHeight = 400;
  drawIdentityCardRoundRect(ctx, avatarX, avatarY, avatarWidth, avatarHeight, 42);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = "#12314D";
  ctx.fillRect(avatarX, avatarY, avatarWidth, avatarHeight);
  if (avatar) {
    const scale = Math.max(avatarWidth / avatar.width, avatarHeight / avatar.height);
    const drawWidth = avatar.width * scale;
    const drawHeight = avatar.height * scale;
    ctx.drawImage(
      avatar,
      avatarX + (avatarWidth - drawWidth) / 2,
      avatarY + (avatarHeight - drawHeight) * 0.18,
      drawWidth,
      drawHeight
    );
  } else {
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "1000 104px Arial, Helvetica, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(params.initials || "GSN", avatarX + avatarWidth / 2, avatarY + avatarHeight / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(242,199,102,0.92)";
  ctx.lineWidth = 6;
  drawIdentityCardRoundRect(ctx, avatarX, avatarY, avatarWidth, avatarHeight, 42);
  ctx.stroke();

  ctx.fillStyle = gold;
  ctx.font = "900 25px Arial, Helvetica, sans-serif";
  ctx.fillText("NETWORK MEMBER", 510, 335);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = params.displayName.length > 18
    ? "1000 60px Arial, Helvetica, sans-serif"
    : "1000 76px Arial, Helvetica, sans-serif";
  drawIdentityCardCanvasText(ctx, params.displayName, 510, 420, 620, 78, 1);
  ctx.fillStyle = goldDeep;
  ctx.fillRect(510, 442, 150, 5);
  ctx.fillStyle = "rgba(255,255,255,0.66)";
  ctx.font = "900 24px Arial, Helvetica, sans-serif";
  ctx.fillText("GSN ID", 510, 492);
  ctx.fillStyle = "#F6D276";
  ctx.font = "1000 46px Arial, Helvetica, sans-serif";
  ctx.fillText(params.gmfnId, 510, 548);

  drawIdentityCardRoundRect(ctx, 510, 580, 590, 72, 36);
  ctx.fillStyle = params.valid ? "rgba(10,91,64,0.42)" : "rgba(121,78,17,0.38)";
  ctx.fill();
  ctx.strokeStyle = params.valid ? green : gold;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(548, 616, 23, 0, Math.PI * 2);
  ctx.fillStyle = params.valid ? "#4DE2A2" : gold;
  ctx.fill();
  ctx.fillStyle = navy;
  ctx.font = "1000 28px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(params.valid ? "✓" : "!", 548, 626);
  ctx.textAlign = "left";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "900 28px Arial, Helvetica, sans-serif";
  ctx.fillText(params.valid ? "Active Network Membership" : params.cardStatus, 585, 627);
  ctx.fillStyle = "rgba(255,255,255,0.58)";
  ctx.font = "900 16px Arial, Helvetica, sans-serif";
  ctx.fillText(
    params.valid ? "VERIFIED   •   CONNECTED   •   EMPOWERED" : params.memberships.toUpperCase(),
    510,
    687
  );

  const qr = await loadIdentityCardImage(params.qrDataUrl);
  drawIdentityCardRoundRect(ctx, 1215, 300, 270, 270, 26);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.strokeStyle = gold;
  ctx.lineWidth = 6;
  ctx.stroke();
  if (qr) {
    ctx.drawImage(qr, 1232, 317, 236, 236);
  } else {
    ctx.fillStyle = navy;
    ctx.font = "1000 46px Arial, Helvetica, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("QR", 1350, 456);
    ctx.textAlign = "left";
  }

  drawIdentityCardRoundRect(ctx, 1170, 592, 360, 58, 28);
  ctx.fillStyle = "rgba(4,23,37,0.88)";
  ctx.fill();
  ctx.strokeStyle = "rgba(214,170,69,0.86)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "900 20px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("View Membership Record  ↗", 1350, 630);
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.68)";
  ctx.font = "800 17px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  drawIdentityCardCanvasText(ctx, params.verifyDisplay, 1180, 682, 340, 22, 2);
  ctx.textAlign = "left";

  const footer = ctx.createLinearGradient(0, 760, width, height);
  footer.addColorStop(0, "#FFFFFF");
  footer.addColorStop(0.68, "#F8F6EF");
  footer.addColorStop(1, "#EEF2F6");
  ctx.fillStyle = footer;
  ctx.fillRect(16, 760, width - 32, 204);
  ctx.strokeStyle = "rgba(214,170,69,0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(16, 760);
  ctx.lineTo(width - 16, 760);
  ctx.stroke();

  ctx.fillStyle = "#07172C";
  ctx.font = "1000 68px Arial, Helvetica, sans-serif";
  ctx.fillText("GSN", 105, 870);
  ctx.fillStyle = goldDeep;
  ctx.fillRect(268, 802, 3, 112);
  ctx.fillStyle = "#07172C";
  ctx.font = "900 22px Arial, Helvetica, sans-serif";
  ctx.fillText("GLOBAL SUPPORT NETWORK", 305, 846);
  ctx.fillStyle = "#617085";
  ctx.font = "800 17px Arial, Helvetica, sans-serif";
  ctx.fillText("A MORE INCLUSIVE GLOBAL ECONOMY", 305, 884);

  ctx.strokeStyle = "#526174";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(1080, 854, 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#07172C";
  ctx.font = "1000 38px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("i", 1080, 868);
  ctx.textAlign = "left";
  ctx.fillStyle = "#526174";
  ctx.font = "800 18px Arial, Helvetica, sans-serif";
  drawIdentityCardCanvasText(
    ctx,
    "GSN private network membership. Not government identification, credit approval, payment guarantee, or proof of future behaviour.",
    1130,
    820,
    385,
    25,
    5
  );

  ctx.restore();
  ctx.strokeStyle = gold;
  ctx.lineWidth = 5;
  drawIdentityCardRoundRect(ctx, 16, 16, width - 32, height - 32, 48);
  ctx.stroke();

  const blob = await identityCardCanvasBlob(canvas);
  if (!blob && includeAvatar) return buildGsnIdentityCardShareImage(params, false);
  if (!blob) return null;

  return new File([blob], "gsn-identity-card.png", { type: "image/png" });
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
    padding: 8,
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
    padding: compact ? "6px 8px" : "8px 10px",
    whiteSpace: "pre-line",
    overflowWrap: "anywhere",
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
    evidenceMeaning: true,
    summary: true,
    continuity: true,
    recovery: true,
    reasons: true,
    timeline: true,
    next: true,
    guides: true,
  };
}

function routeTarget(intent: CtaIntent, communityId: number, debugId: string): string {
  return resolveCtaTarget(intent, { communityId, debugId }).to as string;
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    evidenceMeaning: Boolean(raw?.evidenceMeaning ?? base.evidenceMeaning),
    summary: Boolean(raw?.summary ?? base.summary),
    continuity: Boolean(raw?.continuity ?? base.continuity),
    recovery: Boolean(raw?.recovery ?? base.recovery),
    reasons: Boolean(raw?.reasons ?? base.reasons),
    timeline: Boolean(raw?.timeline ?? base.timeline),
    next: Boolean(raw?.next ?? base.next),
    guides: Boolean(raw?.guides ?? base.guides),
  };
}

function normalizeTrustSlipRecord(raw: any): TrustSlipRecord | null {
  if (!raw) return null;

  const src = raw?.item || raw?.summary || raw?.trust_slip || raw?.data || raw;

  return {
    id: positiveNumber(firstTruthy(src?.id, src?.trust_slip_id)) || undefined,
    code: firstTruthy(
      src?.code,
      src?.trust_slip_code,
      src?.verification_code,
      src?.verification_token,
      src?.token
    ),
    status: firstTruthy(src?.status, src?.state, src?.verification_status),
    ok: src?.ok ?? null,
    active: src?.active ?? src?.is_current ?? null,
    verified: src?.verified ?? src?.active ?? src?.is_current ?? null,
    public_verify_url: firstTruthy(src?.public_verify_url, src?.verify_url, src?.verification_url),
    verification_code: firstTruthy(src?.verification_code, src?.code, src?.trust_slip_code),
    verification_token: firstTruthy(src?.verification_token, src?.token, src?.code),
    token: firstTruthy(src?.token, src?.verification_token, src?.code),
    reason: firstTruthy(src?.reason, src?.issue_reason, src?.blocker_reason),
    detail: firstTruthy(src?.detail, src?.message, src?.issue_detail, src?.blocker_detail),
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

function trustSlipPendingRecord(reason: string, detail: string): TrustSlipRecord {
  return {
    ok: false,
    active: false,
    verified: false,
    status: "pending",
    reason,
    detail,
  };
}

function trustSlipIssueBlockerFromError(err: any): TrustSlipRecord | null {
  const status = Number(err?.status || err?.response?.status || 0);
  if (status === 401 || status === 403) return null;

  const detail = structuredErrorDetail(err);
  const message = firstTruthy(
    detail?.detail,
    detail?.message,
    detail?.title,
    detail?.reason,
    structuredErrorMessage(err, "")
  );
  const lower = safeStr(message).toLowerCase();

  if (lower.includes("phone")) {
    return trustSlipPendingRecord(
      "phone_unverified",
      "Verify your phone number to activate TrustSlip portability."
    );
  }

  if (
    lower.includes("no active clan membership") ||
    lower.includes("no active community")
  ) {
    return trustSlipPendingRecord(
      "community_membership_required",
      "Join or create a community before GSN can issue a TrustSlip. TrustSlip needs a community anchor so the evidence has provenance."
    );
  }

  if (
    lower.includes("not an active member") ||
    lower.includes("selected community") ||
    lower.includes("selected clan")
  ) {
    return trustSlipPendingRecord(
      "selected_community_required",
      "Choose a community where your membership is active, then refresh the TrustSlip again."
    );
  }

  return trustSlipPendingRecord(
    "trustslip_issue_blocked",
    "TrustSlip could not be issued yet. Check phone verification and active community membership first."
  );
}

async function getMyTrustSlipForIdentityIntegrity(): Promise<TrustSlipRecord | null> {
  try {
    return normalizeTrustSlipRecord(await getMyTrustSlip({ fresh: true }));
  } catch (err: any) {
    return trustSlipIssueBlockerFromError(err);
  }
}
async function fetchIdentityIntegrityData(
  selectedClanId: number
): Promise<IdentityIntegrityDataSnapshot> {
  const [
    meRes,
    clanRes,
    clansRes,
    trustSlipRes,
    guidanceRes,
    whyRes,
    eventsRes,
    identityRiskRes,
    identityRecoveryRes,
  ] = await Promise.all([
    getMe().catch(() => null),
    getCurrentClan().catch(() => null),
    listMyClans({ timeoutMs: 6500 }).catch(() => null),
    getMyTrustSlipForIdentityIntegrity(),
    buildGuidanceSnapshot().catch(() => null),
    getTrustWhyMe().catch(() => null),
    listTrustEvents({
      clan_id: selectedClanId || undefined,
      limit: 60,
    }).catch(() => ({ items: [] })),
    getMyIdentityRisk().catch(() => null),
    getMyIdentityRecovery().catch(() => null),
  ]);

  return {
    me: meRes || null,
    currentClan: clanRes || null,
    communities: rowsOf<IdentityCommunityRow>(clansRes),
    trustSlip: trustSlipRes,
    guidance: guidanceRes || null,
    trustWhyRaw: whyRes || null,
    events: rowsOf<TrustEventRow>(eventsRes),
    identityRisk: identityRiskRes || null,
    identityRecovery: identityRecoveryRes || null,
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
        postureSource:
          scoreNum === null || Number.isNaN(scoreNum)
            ? "-"
            : String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Healthy across visible communities",
        whyText: String(rawWhy || "Your visible identity and community evidence is steady right now."),
      };
    }

    if (classText === "B") {
      return {
        classText,
        postureSource:
          scoreNum === null || Number.isNaN(scoreNum)
            ? "-"
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
        postureSource:
          scoreNum === null || Number.isNaN(scoreNum)
            ? "-"
            : String(Math.round(scoreNum)),
        tone: "yellow",
        statusText: "Needs attention",
        whyText: String(
          rawWhy || "A few clearer recent actions can strengthen the visible evidence."
        ),
      };
    }

    return {
      classText,
      postureSource:
        scoreNum === null || Number.isNaN(scoreNum)
          ? "-"
          : String(Math.round(scoreNum)),
      tone: "red",
      statusText: "At risk",
      whyText: String(rawWhy || "The visible identity and community evidence needs action and repair."),
    };
  }

  if (scoreNum !== null && !Number.isNaN(scoreNum)) {
    if (scoreNum >= 75) {
      return {
        classText: "A",
        postureSource: String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Healthy across visible communities",
        whyText: String(rawWhy || "Visible identity and community evidence is looking strong."),
      };
    }

    if (scoreNum >= 55) {
      return {
        classText: "B",
        postureSource: String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Stable and growing",
        whyText: String(
          rawWhy || "Keep consistent actions to strengthen the visible evidence."
        ),
      };
    }

    if (scoreNum >= 35) {
      return {
        classText: "C",
        postureSource: String(Math.round(scoreNum)),
        tone: "yellow",
        statusText: "Needs attention",
        whyText: String(
          rawWhy || "Some recent actions may have weakened the visible evidence."
        ),
      };
    }

    return {
      classText: "D",
      postureSource: String(Math.round(scoreNum)),
      tone: "red",
      statusText: "At risk",
      whyText: String(rawWhy || "The visible identity and community evidence needs urgent improvement."),
    };
  }

  return {
    classText: "Not shown yet",
    postureSource: "-",
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
        postureSource:
          rawScore === null || Number.isNaN(rawScore)
            ? "-"
            : String(Math.round(rawScore)),
        tone: "green",
        statusText: "Strong in your current community",
        whyText: rawWhy || "Your present community reading is strong.",
      };
    }

    if (rawClass === "B") {
      return {
        classText: rawClass,
        postureSource:
          rawScore === null || Number.isNaN(rawScore)
            ? "-"
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
        postureSource:
          rawScore === null || Number.isNaN(rawScore)
            ? "-"
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
      postureSource:
        rawScore === null || Number.isNaN(rawScore)
          ? "-"
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
        postureSource: String(Math.round(rawScore)),
        tone: "green",
        statusText: "Strong in your current community",
        whyText: rawWhy || "Your current community reading is strong.",
      };
    }

    if (rawScore >= 55) {
      return {
        classText: "B",
        postureSource: String(Math.round(rawScore)),
        tone: "green",
        statusText: "Stable in your current community",
        whyText:
          rawWhy || "Your current community reading looks steady right now.",
      };
    }

    if (rawScore >= 35) {
      return {
        classText: "C",
        postureSource: String(Math.round(rawScore)),
        tone: "yellow",
        statusText: "Needs attention in your current community",
        whyText:
          rawWhy ||
          "Your current community reading suggests some areas need attention.",
      };
    }

    return {
      classText: "D",
      postureSource: String(Math.round(rawScore)),
      tone: "red",
      statusText: "At risk in your current community",
      whyText:
        rawWhy ||
        "Your current community reading shows pressure that needs attention.",
    };
  }

  if (!hasSelectedCommunity) {
    return {
      classText: "Not shown yet",
      postureSource: "-",
      tone: "neutral",
      statusText: "Select a community to view local evidence",
      whyText:
        "Local community evidence belongs to the community you are using right now. It is separate from the wider cross-community consistency reading.",
    };
  }

  return {
    classText: "Not shown yet",
    postureSource: "-",
    tone: "neutral",
    statusText: "No local community reading yet",
    whyText:
      "Local community evidence reflects the record in your current community. Select or use a community first, then this reading will appear here.",
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
      identityRisk: routeTarget(
        "identityRisk",
        selectedClanId,
        "identity-integrity.route.identity-risk"
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

  const cardOnlyMode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("display") === "card-only";
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
  const [identityCardActionsOpen, setIdentityCardActionsOpen] = useState(false);
  const [identityCardGeneratedAt, setIdentityCardGeneratedAt] = useState(() =>
    new Date().toISOString()
  );
  const [identityCardRefreshing, setIdentityCardRefreshing] = useState(false);
  const identityCardRefreshingRef = useRef(false);
  const lastIdentityCardAutoRefreshAt = useRef(0);

  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [communities, setCommunities] = useState<IdentityCommunityRow[]>([]);
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
  const [phoneDeliveryMode, setPhoneDeliveryMode] = useState("");
  const [phoneTaskMessage, setPhoneTaskMessage] = useState("");
  const [phoneTaskTone, setPhoneTaskTone] = useState<PhoneTaskTone>("success");
  const [phoneConflict, setPhoneConflict] = useState<PhoneConflictState | null>(null);
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
  const applyIdentityIntegrityData = useCallback(
    (snapshot: IdentityIntegrityDataSnapshot, markGenerated = false) => {
      setMe(snapshot.me);
      setCurrentClan(snapshot.currentClan);
      setCommunities(snapshot.communities);
      setTrustSlip(snapshot.trustSlip);
      setGuidance(snapshot.guidance);
      setTrustWhyRaw(snapshot.trustWhyRaw);
      setEvents(snapshot.events);
      setIdentityRisk(snapshot.identityRisk);
      setIdentityRecovery(snapshot.identityRecovery);

      if (markGenerated) {
        setIdentityCardGeneratedAt(new Date().toISOString());
      }
    },
    []
  );

  const refreshGsnIdentityCard = useCallback(
    async (options?: { silent?: boolean }) => {
      if (identityCardRefreshingRef.current) return;

      identityCardRefreshingRef.current = true;
      setIdentityCardRefreshing(true);

      try {
        const snapshot = await fetchIdentityIntegrityData(selectedClanId);
        applyIdentityIntegrityData(snapshot, true);
        lastIdentityCardAutoRefreshAt.current = Date.now();

        if (!options?.silent) {
          showNotice(
            "success",
            "Identity Card refreshed. Community count and TrustSlip status are current."
          );
        }
      } catch {
        if (!options?.silent) {
          showNotice("error", "Refresh failed. Reopen Identity Integrity and try again.");
        }
      } finally {
        identityCardRefreshingRef.current = false;
        setIdentityCardRefreshing(false);
      }
    },
    [applyIdentityIntegrityData, selectedClanId]
  );

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
        const snapshot = await fetchIdentityIntegrityData(selectedClanId);
        if (!alive) return;
        applyIdentityIntegrityData(snapshot, true);
        lastIdentityCardAutoRefreshAt.current = Date.now();
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [applyIdentityIntegrityData, selectedClanId]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    function refreshWhenVisibleAgain() {
      if (document.visibilityState === "hidden") return;

      const now = Date.now();
      if (now - lastIdentityCardAutoRefreshAt.current < 45000) return;
      lastIdentityCardAutoRefreshAt.current = now;
      void refreshGsnIdentityCard({ silent: true });
    }

    window.addEventListener("focus", refreshWhenVisibleAgain);
    document.addEventListener("visibilitychange", refreshWhenVisibleAgain);

    return () => {
      window.removeEventListener("focus", refreshWhenVisibleAgain);
      document.removeEventListener("visibilitychange", refreshWhenVisibleAgain);
    };
  }, [refreshGsnIdentityCard]);

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

  const gmfnIdValue = useMemo(() => {
    return firstTruthy(me?.gmfn_id, trustSlip?.gmfn_id);
  }, [me, trustSlip]);
  const gmfnId = gmfnIdValue || "Not issued yet";

  const trustSlipCode = safeStr(
    trustSlip?.code ||
      trustSlip?.verification_code ||
      trustSlip?.verification_token ||
      trustSlip?.token ||
      ""
  );
  const trustSlipIssueReason = safeStr(trustSlip?.reason);
  const trustSlipIssueDetail = safeStr(trustSlip?.detail);
  const trustSlipPendingLabel = trustSlipIssueReason ? "Setup needed" : "Not issued yet";
  const trustSlipPendingDetail = trustSlipIssueDetail ||
    (Boolean(trustSlip?.phone_verified) ? "Open TrustSlip to finish setup." : "Verify phone to issue.");
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
    ? getTrustBandShortLabel(cciBand)
    : cci.classText;
  const cciBandMeaning = useMemo(
    () => getTrustBandLanguage(cci.classText),
    [cci.classText]
  );
  const cciPosture = useMemo(
    () => getContextualEvidencePosture(cci.postureSource, cci.classText),
    [cci.classText, cci.postureSource]
  );
  const openTrustBand = normalizeTrustBand(openTrust.classText);
  const openTrustBandLabel = openTrustBand
    ? getTrustBandShortLabel(openTrustBand)
    : openTrust.classText;
  const openTrustBandMeaning = useMemo(
    () => getTrustBandLanguage(openTrust.classText),
    [openTrust.classText]
  );
  const openTrustPosture = useMemo(
    () => getContextualEvidencePosture(openTrust.postureSource, openTrust.classText),
    [openTrust.classText, openTrust.postureSource]
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
      postureSource:
        summary?.score === null || summary?.score === undefined
          ? "-"
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

  const activeCommunityRows = useMemo(
    () => communities.filter(isActiveCommunityRow),
    [communities]
  );
  const visibleCommunityCount = communities.length;
  const activeCommunityCount = activeCommunityRows.length;
  const communityRowsForRole = activeCommunityCount ? activeCommunityRows : communities;
  const adminCommunityCount = countByRole(communityRowsForRole, "admin");
  const ownerCommunityCount = countByRole(communityRowsForRole, "owner");
  const memberCommunityCount = Math.max(
    communityRowsForRole.length - adminCommunityCount - ownerCommunityCount,
    0
  );
  const communityFootprintLabel = activeCommunityCount
    ? `${activeCommunityCount} active communit${activeCommunityCount === 1 ? "y" : "ies"}`
    : visibleCommunityCount
      ? `${visibleCommunityCount} visible community context${visibleCommunityCount === 1 ? "" : "s"}`
      : "No community shown";
  const identityCardCommunityFootprintLabel = activeCommunityCount
    ? `${activeCommunityCount} active`
    : visibleCommunityCount
      ? `${visibleCommunityCount} visible`
      : "None shown";
  const roleFootprintLabel = [
    ownerCommunityCount ? `Owner ${ownerCommunityCount}` : "",
    adminCommunityCount ? `Admin ${adminCommunityCount}` : "",
    memberCommunityCount ? `Member ${memberCommunityCount}` : "",
  ].filter(Boolean).join(" / ") || "Roles private";
  const recognisedMembershipLabel = activeCommunityCount
    ? `${activeCommunityCount} active`
    : visibleCommunityCount
      ? `${visibleCommunityCount} linked`
      : "None shown";
  const identityCardMembershipLabel = activeCommunityCount
    ? `${activeCommunityCount} linked`
    : recognisedMembershipLabel;
  const identityContext = trustSlip?.identity_context || {};
  const phoneEvidenceLabel = identitySignals.phoneVerified
    ? "Verified"
    : identitySignals.phoneRecorded
      ? "Recorded"
      : "Missing";
  const bankEvidenceVerified = Boolean(
    me?.bank_verified ||
      me?.bank_verified_at ||
      trustSlip?.bank_verified ||
      identityContext?.bank_verified
  );
  const bankEvidenceRecorded = Boolean(
    bankEvidenceVerified ||
      me?.bank_details_recorded ||
      me?.payout_destination_id ||
      me?.withdrawal_destination_id ||
      trustSlip?.bank_details_recorded ||
      identityContext?.bank_details_recorded ||
      identitySignals.bankReady
  );
  const bankEvidenceLabel = bankEvidenceVerified
    ? "Verified"
    : bankEvidenceRecorded
      ? "Recorded"
      : "Missing";
  const officialIdEvidenceVerified = Boolean(
    me?.passport_verified ||
      me?.passport_verified_at ||
      me?.official_id_verified_at ||
      trustSlip?.official_id_verified ||
      identityContext?.official_id_verified
  );
  const officialIdEvidenceRecorded = Boolean(
    officialIdEvidenceVerified ||
      me?.official_id_recorded ||
      me?.identity_document_recorded ||
      trustSlip?.official_id_recorded ||
      identityContext?.official_id_recorded ||
      identitySignals.officialIdReady
  );
  const officialIdEvidenceLabel = officialIdEvidenceVerified
    ? "Verified"
    : officialIdEvidenceRecorded
      ? "Recorded"
      : "Missing";
  const photoEvidenceVerified = Boolean(
    me?.photo_verified ||
      me?.photo_verified_at ||
      trustSlip?.photo_verified ||
      identityContext?.photo_verified ||
      events.some((event) =>
        safeStr(event.event_type || event.type || event.kind).toLowerCase() ===
        "identity.photo_evidence_verified"
      )
  );
  const photoEvidenceLabel = photoEvidenceVerified
    ? "Verified"
    : identitySignals.photoReady
      ? "Recorded"
      : avatarSrc
        ? "Face shown"
        : "Missing";
  const trustSlipExpiresAt = safeStr(trustSlip?.expires_at);
  const trustSlipExpired = trustSlipExpiresAt
    ? new Date(trustSlipExpiresAt).getTime() < Date.now()
    : false;
  const trustSlipStatusText = trustSlipCode
    ? trustSlipExpired
      ? "Expired"
      : "Active"
    : trustSlipPendingLabel;
  const trustSlipExpiryLabel = trustSlipCode
    ? trustSlipExpiresAt
      ? trustSlipExpired
        ? `Expired ${safeDate(trustSlipExpiresAt)}`
        : `Valid until ${safeDate(trustSlipExpiresAt)}`
      : "Expiry not shown"
    : trustSlipPendingDetail;
  const identityCardValid = Boolean(
    identitySignals.phoneVerified && trustSlipCode && !trustSlipExpired
  );
  const identityCardStatusText = identityCardValid
    ? "Valid"
    : !identitySignals.phoneVerified
      ? "Phone required"
      : trustSlipExpired
        ? "Expired"
        : trustSlipIssueReason
          ? "Setup needed"
          : "TrustSlip pending";
  const identityCardStatusTone: "ready" | "pending" | "watch" = identityCardValid
    ? "ready"
    : identitySignals.phoneVerified
      ? "watch"
      : "pending";
  const identityCardGeneratedLabel = safeCompactDateTime(identityCardGeneratedAt);
  const identityCardLivePath = trustSlipCode
    ? `/t/${encodeURIComponent(trustSlipCode)}/card`
    : "";
  const trustSlipVerifyPath = trustSlipCode
    ? `/t/${encodeURIComponent(trustSlipCode)}/lite`
    : "";
  const identityCardLiveUrl = identityCardLivePath
    ? canonicalPublicFrontendUrl(identityCardLivePath)
    : "";
  const trustSlipVerifyUrl = trustSlipVerifyPath
    ? canonicalPublicFrontendUrl(trustSlipVerifyPath)
    : "";
  const identityCardLiveDisplay = identityCardLiveUrl
    ? identityCardLiveUrl.replace(/^https?:\/\//i, "")
    : "Live card link not ready";
  const trustSlipVerifyDisplay = trustSlipVerifyUrl
    ? trustSlipVerifyUrl.replace(/^https?:\/\//i, "")
    : "Verify link not ready";
  const selectedCommunityKey = firstTruthy(
    currentClan?.community_code,
    currentClan?.code,
    currentClan?.global_id,
    currentClan?.id,
    trustSlip?.community_code,
    trustSlip?.community_global_id,
    trustSlip?.community_id
  );
  const memberCredentialPath = publicCommunityMemberCredentialPath({
    communityKey: selectedCommunityKey,
    memberKey: gmfnIdValue,
  });
  const memberCredentialUrl = memberCredentialPath
    ? canonicalPublicFrontendUrl(memberCredentialPath)
    : "";
  const retainedIdentityCardAuditLabels = [
    communityFootprintLabel,
    roleFootprintLabel,
    trustSlipStatusText,
    trustSlipExpiryLabel,
    identityCardStatusTone,
    trustSlipVerifyDisplay,
    memberCredentialUrl,
  ];
  void retainedIdentityCardAuditLabels;

  const gsnIdentityCardShareText = [
    "GSN Identity Card",
    `${displayName} - ${gmfnId}`,
    `Status: ${identityCardStatusText}`,
    `Phone: ${phoneEvidenceLabel}. ID: ${officialIdEvidenceLabel}. Photo: ${photoEvidenceLabel}.`,
    trustSlipCode ? `TrustSlip: ${trustSlipCode}` : "",
    identityCardLiveUrl ? `Live ID card: ${identityCardLiveUrl}` : "",
    trustSlipVerifyUrl ? `Verify record: ${trustSlipVerifyUrl}` : "",
    "Evidence only. Not government ID, credit approval, payment guarantee, or future behaviour proof.",
  ].filter(Boolean).join("\n");

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
  const recommendedIdentityTaskKey =
    identityTaskRows.find((item) => item.tone !== "ready")?.key || "phone";

  useEffect(() => {
    if (requestedIdentityTask) return;
    setActiveIdentityTask(recommendedIdentityTaskKey);
  }, [recommendedIdentityTaskKey, requestedIdentityTask]);

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
      setRecoveryError(structuredErrorMessage(err, "Recovery challenge could not be saved."));
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
      setRecoveryError(structuredErrorMessage(err, "Recovery answers did not match."));
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
    if (!gmfnIdValue) {
      showNotice("error", "GSN ID is not ready yet.");
      return;
    }

    safeCopy(gmfnIdValue);
    showNotice("success", "GSN ID copied.");
  }

  function copyTrustSlipCode() {
    if (!trustSlipCode) {
      showNotice("error", trustSlipPendingDetail);
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
      openTrustPosture: openTrustPosture.label,
      cciClass: cci.classText,
      cciPosture: cciPosture.label,
      continuityLabel: continuity.label,
      nextMoveLabel,
    });

    safeCopy(snapshot);
    showNotice("success", "Identity snapshot copied.");
  }

  async function copyGsnIdentityCard() {
    const copied = await safeCopy(gsnIdentityCardShareText);
    showNotice(
      copied ? "success" : "error",
      copied
        ? "GSN Identity Card copied for sharing."
        : "Copy failed. Use the visible card details."
    );
  }

  async function copyTrustSlipVerifyLink() {
    if (!trustSlipVerifyUrl) {
      showNotice("error", trustSlipPendingDetail);
      return;
    }

    const copied = await safeCopy(trustSlipVerifyUrl);
    showNotice(
      copied ? "success" : "error",
      copied ? "TrustSlip Verify link copied." : "Copy failed. Use the visible verify link."
    );
  }

  function handleGsnIdentityCardPrimaryAction() {
    if (identityCardValid) {
      void shareGsnIdentityCard();
      return;
    }

    showNotice("error", trustSlipPendingDetail);
    navigateWithOrigin(navigate, routes.trustSlip, location);
  }
  async function shareGsnIdentityCard() {
    if (!identityCardValid) {
      showNotice(
        "error",
        trustSlipPendingDetail
      );
      return;
    }

    const nativeShare = typeof navigator !== "undefined" ? navigator.share : undefined;
    const nativeCanShare =
      typeof navigator !== "undefined" && typeof (navigator as any).canShare === "function"
        ? (navigator as any).canShare.bind(navigator)
        : null;
    const qrSvg = document.querySelector(
      '[data-gsn-identity-card-qr="true"] svg'
    );
    const qrDataUrl =
      qrSvg instanceof SVGElement
        ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
            new XMLSerializer().serializeToString(qrSvg)
          )}`
        : "";
    const cardImage = await buildGsnIdentityCardShareImage({
      displayName,
      initials: profileInitials,
      avatarSrc,
      gmfnId,
      cardStatus: identityCardStatusText,
      memberships: identityCardMembershipLabel,
      verifyDisplay: identityCardLiveDisplay,
      qrDataUrl,
      valid: identityCardValid,
    });

    if (nativeShare && cardImage) {
      const imagePayload = {
        title: "GSN Identity Card",
        text: gsnIdentityCardShareText,
        files: [cardImage],
      };

      if (!nativeCanShare || nativeCanShare({ files: [cardImage] })) {
        try {
          await nativeShare.call(navigator, imagePayload);
          showNotice("success", "Share sheet opened with the GSN Identity Card picture.");
          return;
        } catch (err: any) {
          if (safeStr(err?.name) === "AbortError") return;
        }
      }
    }

    if (nativeShare) {
      try {
        await nativeShare.call(navigator, {
          title: "GSN Identity Card",
          text: gsnIdentityCardShareText,
        });
        showNotice("success", "Share sheet opened with the GSN Identity Card link.");
        return;
      } catch (err: any) {
        if (safeStr(err?.name) === "AbortError") return;
      }
    }

    await copyGsnIdentityCard();
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

  async function refreshTrustSlipAfterIdentityChange() {
    try {
      const nextTrustSlip = await getMyTrustSlip({ fresh: true });
      setTrustSlip(normalizeTrustSlipRecord(nextTrustSlip));
      setIdentityCardGeneratedAt(new Date().toISOString());
      return nextTrustSlip;
    } catch {
      return null;
    }
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
      `${item.title} needs a dedicated signed-in identity-completion page before it can be finished here.`
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
      setPhoneDeliveryMode(safeStr(out?.delivery_mode));
      setPhoneConflict(null);
      setPhoneTaskMessage(
        out?.otp_preview
          ? `System code generated: ${out.otp_preview}. Confirm it below.`
          : "The provider accepted SMS delivery. Enter the code from your phone; ownership is still unconfirmed."
      );
      setPhoneTaskTone("success");
      showNotice(
        "success",
        out?.otp_preview
          ? "System phone code is ready in the phone task."
          : "SMS delivery was accepted. Confirmation is still pending."
      );
    } catch (err: any) {
      const conflict = parsePhoneTaskConflict(err);
      const message = parsePhoneTaskError(err);
      setPhoneConflict(conflict);
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
      setPhoneConflict(null);
      setPhoneCode("");
      setPhoneOtpPreview("");
      setPhoneDeliveryMode("");
      const nextTrustSlip = await refreshTrustSlipAfterIdentityChange();
      const nextTrustSlipCode = safeStr(
        nextTrustSlip?.code ||
          nextTrustSlip?.verification_code ||
          nextTrustSlip?.verification_token ||
          nextTrustSlip?.token
      );
      setPhoneTaskMessage(
        nextTrustSlipCode
          ? "Phone evidence is verified. TrustSlip code and QR are now ready."
          : out?.message || "Phone evidence is now verified and connected."
      );
      setPhoneTaskTone("success");
      showNotice(
        "success",
        nextTrustSlipCode
          ? "Phone verified. TrustSlip code and QR are ready."
          : out?.message || "Phone evidence is now connected."
      );
    } catch (err: any) {
      const message = structuredErrorMessage(err, "Phone code could not be confirmed.");
      setPhoneTaskMessage(message);
      setPhoneTaskTone("error");
      showNotice("error", message);
    } finally {
      setPhoneBusy(false);
    }
  }

  async function handleResendPhoneVerification() {
    if (phoneBusy || !phoneVerificationId || phoneDeliveryMode !== "pending-sms") return;

    setPhoneBusy(true);
    try {
      const out = await resendSignedInPhoneVerification({
        verification_id: phoneVerificationId,
      });
      setPhoneCode("");
      setPhoneOtpPreview("");
      setPhoneTaskMessage(
        out?.message || "A new code was accepted for SMS delivery. Enter it when it arrives."
      );
      setPhoneTaskTone("success");
      showNotice("success", "A new phone code was accepted for delivery.");
    } catch (err: any) {
      const message = structuredErrorMessage(err, "A new phone code could not be sent.");
      setPhoneTaskMessage(message);
      setPhoneTaskTone("error");
      showNotice("error", message);
    } finally {
      setPhoneBusy(false);
    }
  }

  const phoneConflictRecoveryUrl = useMemo(() => {
    if (!phoneConflict) return "";
    const params = new URLSearchParams();
    params.set("force", "1");
    params.set("recovery", "1");
    const phone = safeStr(phoneInput || me?.phone_e164 || me?.phone);
    if (phone) params.set("phone_e164", phone);
    return `${phoneConflict.recoveryPath || "/login"}?${params.toString()}`;
  }, [me?.phone, me?.phone_e164, phoneConflict, phoneInput]);

  const phoneConflictAdminReviewUrl = useMemo(() => {
    if (!phoneConflict) return "";
    const params = new URLSearchParams();
    const phone = safeStr(phoneInput || me?.phone_e164 || me?.phone);
    if (phone) params.set("phone_e164", phone);
    const query = params.toString();
    return `${routes.identityRisk}${query ? `?${query}` : ""}`;
  }, [me?.phone, me?.phone_e164, phoneConflict, phoneInput, routes.identityRisk]);

  const canOpenIdentityRiskReview = Boolean(
    phoneConflict && safeStr(me?.role).toLowerCase() === "admin"
  );

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
      setIdentityCardGeneratedAt(new Date().toISOString());
      setOfficialIdReference("");
      setOfficialIdTaskMessage(
        `${officialIdType} evidence recorded for review. Provider verification is still pending.`
      );
      showNotice(
        "success",
        "Official ID evidence is recorded for review. It is not provider-verified yet."
      );
    } catch (err: any) {
      const message = structuredErrorMessage(err, "Official ID evidence could not be recorded.");
      setOfficialIdTaskMessage(message);
      showNotice("error", message);
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
      setIdentityCardGeneratedAt(new Date().toISOString());
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
      const message = structuredErrorMessage(err, "Photo evidence could not be recorded.");
      setOfficialIdTaskMessage(message);
      showNotice("error", message);
    } finally {
      setIdentityPhotoBusy(false);
    }
  }

  const membershipCardStatus = identityCardValid
    ? "Active Network Membership"
    : identityCardStatusText;
  const membershipCardSignalLine = identityCardValid
    ? "VERIFIED  •  CONNECTED  •  EMPOWERED"
    : `MEMBERSHIP RECORD  •  ${identityCardStatusText.toUpperCase()}`;
  const landscapeIdentityCard = (
    <section
      data-gsn-identity-card="true"
      style={{
        padding: isCompact ? 6 : 12,
        background: "transparent",
      }}
    >
      <div
        data-gsn-identity-card-screenshot="true"
        data-gsn-identity-card-reference="landscape-membership"
        data-gsn-identity-card-generated-at={identityCardGeneratedLabel}
        style={{
          width: "100%",
          aspectRatio: "1.62 / 1",
          minHeight: 0,
          borderRadius: isCompact ? 18 : 28,
          overflow: "hidden",
          border: `${isCompact ? 1.5 : 2}px solid rgba(224,179,83,0.92)`,
          background: "#061827",
          boxShadow:
            "0 18px 42px rgba(1,9,22,0.24), inset 0 1px 0 rgba(255,255,255,0.12)",
          position: "relative",
          isolation: "isolate",
          containerType: "inline-size",
        }}
      >
        <div
          data-gsn-identity-card-watermark-field="true"
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "0 0 22% 0",
            zIndex: 0,
            overflow: "hidden",
            background:
              "radial-gradient(circle at 22% 12%, rgba(21,94,145,0.24), transparent 32%), linear-gradient(135deg, #031521 0%, #06253B 60%, #041A2A 100%)",
          }}
        >
          <GsnDottedWorldMap />
          <div
            style={{
              position: "absolute",
              inset: "32% -10% -35% 42%",
              borderRadius: "50%",
              border: "1px solid rgba(36,104,148,0.18)",
              boxShadow:
                "0 0 0 18px rgba(21,87,132,0.055), 0 0 0 38px rgba(21,87,132,0.035)",
              transform: "rotate(-14deg)",
            }}
          />
        </div>

        <div
          style={{
            position: "absolute",
            zIndex: 2,
            top: isCompact ? "4.8%" : "4.2%",
            left: "4.6%",
            display: "flex",
            alignItems: "center",
            gap: isCompact ? 4 : 8,
          }}
        >
          <GsnNetworkGlobeMark compact={isCompact} />
          <div style={{ minWidth: 0, color: "#F5D480" }}>
            <div
              style={{
                fontSize: isCompact ? 30 : 52,
                lineHeight: 0.76,
                fontWeight: 1000,
                letterSpacing: isCompact ? -1.5 : -2.5,
                textShadow: "0 2px 7px rgba(0,0,0,0.36)",
              }}
            >
              GSN
            </div>
            <div
              style={{
                marginTop: isCompact ? 5 : 9,
                color: "rgba(255,255,255,0.92)",
                fontSize: isCompact ? 6.2 : 10.5,
                fontWeight: 950,
                letterSpacing: isCompact ? 0.2 : 0.7,
                whiteSpace: "nowrap",
              }}
            >
              GLOBAL SUPPORT NETWORK
            </div>
            <div
              style={{
                marginTop: isCompact ? 3 : 5,
                color: "rgba(255,255,255,0.70)",
                fontSize: isCompact ? 4.6 : 7.5,
                fontWeight: 850,
                letterSpacing: isCompact ? 1.05 : 2,
                whiteSpace: "nowrap",
              }}
            >
              PEOPLE&nbsp;&nbsp;|&nbsp;&nbsp;TRUST&nbsp;&nbsp;|&nbsp;&nbsp;OPPORTUNITY
            </div>
          </div>
        </div>

        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            zIndex: 2,
            top: "6%",
            right: "4.4%",
            width: "18%",
            paddingLeft: isCompact ? 7 : 13,
            borderLeft: "1px solid rgba(214,170,69,0.52)",
            color: "rgba(255,255,255,0.72)",
            fontSize: isCompact ? 4.6 : 7.8,
            fontWeight: 850,
            letterSpacing: isCompact ? 1 : 1.8,
            lineHeight: 1.45,
            textTransform: "uppercase",
          }}
        >
          Stronger people
          <br />
          Stronger communities
          <br />
          A more inclusive
          <br />
          global economy
        </div>

        <div
          data-gsn-identity-card-face="true"
          style={{
            position: "absolute",
            zIndex: 2,
            left: "5%",
            top: "34%",
            width: "24%",
            height: "45%",
            borderRadius: isCompact ? 13 : 24,
            overflow: "hidden",
            border: `${isCompact ? 1.5 : 3}px solid rgba(242,199,102,0.88)`,
            background: "linear-gradient(180deg, #12314D 0%, #061827 100%)",
            display: "grid",
            placeItems: "center",
            color: "#FFFFFF",
            fontSize: isCompact ? 24 : 46,
            fontWeight: 1000,
            boxShadow: "0 12px 28px rgba(1,9,22,0.36)",
          }}
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt="GSN identity face"
              style={{
                width: "100%",
                height: "100%",
                display: "block",
                objectFit: "cover",
                objectPosition: "center 16%",
              }}
            />
          ) : (
            profileInitials
          )}
        </div>

        <div
          style={{
            position: "absolute",
            zIndex: 2,
            left: "32%",
            top: "34%",
            width: "40%",
            minWidth: 0,
            color: "#FFFFFF",
          }}
        >
          <div
            style={{
              color: "#D8B15A",
              fontSize: isCompact ? 6.2 : 10.5,
              fontWeight: 950,
              letterSpacing: isCompact ? 1.2 : 2.5,
              textTransform: "uppercase",
            }}
          >
            Network member
          </div>
          <div
            style={{
              marginTop: isCompact ? 5 : 10,
              fontSize: isCompact ? (displayName.length > 10 ? 17 : 23) : displayName.length > 18 ? 34 : 44,
              lineHeight: 0.96,
              fontWeight: 1000,
              letterSpacing: isCompact ? -0.5 : -1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {displayName}
          </div>
          <div
            aria-hidden="true"
            style={{
              marginTop: isCompact ? 5 : 9,
              width: "27%",
              height: isCompact ? 1.5 : 3,
              borderRadius: 999,
              background: "#D6AA45",
            }}
          />
          <div
            style={{
              marginTop: isCompact ? 6 : 11,
              color: "rgba(255,255,255,0.70)",
              fontSize: isCompact ? 5.6 : 9.4,
              fontWeight: 850,
              letterSpacing: isCompact ? 1.6 : 3,
              textTransform: "uppercase",
            }}
          >
            GSN ID
          </div>
          <div
            style={{
              marginTop: isCompact ? 2 : 4,
              color: "#F4D078",
              fontSize: isCompact ? 11.2 : 20,
              lineHeight: 1,
              fontWeight: 1000,
              letterSpacing: isCompact ? -0.15 : 0.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {gmfnId}
          </div>
          <div
            data-gsn-identity-card-security="true"
            style={{
              marginTop: isCompact ? 7 : 13,
              minHeight: isCompact ? 24 : 38,
              width: "92%",
              borderRadius: 999,
              border: `${isCompact ? 1 : 2}px solid ${identityCardValid ? "#2EDB91" : "#E4B758"}`,
              background: identityCardValid
                ? "rgba(12,91,65,0.34)"
                : "rgba(121,78,17,0.30)",
              display: "flex",
              alignItems: "center",
              gap: isCompact ? 5 : 9,
              padding: isCompact ? "3px 7px" : "5px 12px",
              boxSizing: "border-box",
              color: "#FFFFFF",
              fontSize: isCompact ? 6.1 : 13,
              fontWeight: 950,
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: isCompact ? 15 : 25,
                height: isCompact ? 15 : 25,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                color: "#07172C",
                background: identityCardValid ? "#4DE2A2" : "#F2C766",
                fontSize: isCompact ? 9 : 15,
                fontWeight: 1000,
                flex: "0 0 auto",
              }}
            >
              {identityCardValid ? "✓" : "!"}
            </span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {membershipCardStatus}
            </span>
          </div>
          <div
            style={{
              marginTop: isCompact ? 5 : 9,
              color: "rgba(255,255,255,0.56)",
              fontSize: isCompact ? 4.7 : 7.6,
              fontWeight: 850,
              letterSpacing: isCompact ? 1.15 : 2.2,
              whiteSpace: "nowrap",
            }}
          >
            {membershipCardSignalLine}
          </div>
        </div>

        <div
          data-gsn-identity-card-verifier="true"
          style={{
            position: "absolute",
            zIndex: 2,
            left: "75.5%",
            top: "34%",
            width: "19.5%",
            display: "grid",
            justifyItems: "center",
            minWidth: 0,
          }}
        >
          {identityCardLiveUrl ? (
            <div
              data-gsn-identity-card-qr="true"
              style={{
                width: isCompact ? 65 : 126,
                height: isCompact ? 65 : 126,
                borderRadius: isCompact ? 7 : 14,
                background: "#FFFFFF",
                display: "grid",
                placeItems: "center",
                padding: isCompact ? 3 : 6,
                boxSizing: "border-box",
                border: `${isCompact ? 1.5 : 3}px solid rgba(242,199,102,0.92)`,
                boxShadow: "0 8px 18px rgba(1,9,22,0.34)",
              }}
            >
              <React.Suspense fallback={<GsnLegacyIcon name="qr" size={isCompact ? 48 : 96} />}>
                <LazyQRCodeSVG
                  value={identityCardLiveUrl}
                  size={isCompact ? 57 : 112}
                  bgColor="#FFFFFF"
                  fgColor="#07172C"
                  level="H"
                  marginSize={1}
                  imageSettings={{
                    src: GSN_GLOBE_QR_MARK,
                    height: isCompact ? 13 : 25,
                    width: isCompact ? 13 : 25,
                    excavate: true,
                  }}
                />
              </React.Suspense>
            </div>
          ) : (
            <div
              style={{
                width: isCompact ? 65 : 126,
                height: isCompact ? 65 : 126,
                borderRadius: isCompact ? 7 : 14,
                background: "#FFFFFF",
                display: "grid",
                placeItems: "center",
              }}
            >
              <GsnLegacyIcon name="qr" size={isCompact ? 48 : 96} />
            </div>
          )}
          <StableButton
            type="button"
            onClick={() => setIdentityCardActionsOpen((open) => !open)}
            aria-expanded={identityCardActionsOpen}
            aria-label={identityCardActionsOpen ? "Close GSN ID Card actions" : "Use this GSN ID Card"}
            debugId="identity-integrity.gsn-card.actions-toggle"
            stableHeight={isCompact ? 22 : 34}
            style={{
              marginTop: isCompact ? 5 : 9,
              width: "100%",
              minWidth: 0,
              borderRadius: 999,
              border: "1px solid rgba(214,170,69,0.76)",
              background: "rgba(4,23,37,0.82)",
              color: "#FFFFFF",
              fontSize: isCompact ? 5.8 : 9.5,
              fontWeight: 900,
              padding: isCompact ? "2px 5px" : "4px 8px",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}
          >
            View Membership Record
            <span aria-hidden="true">↗</span>
          </StableButton>
          <div
            style={{
              marginTop: isCompact ? 4 : 7,
              width: "100%",
              color: "rgba(255,255,255,0.68)",
              fontSize: isCompact ? 4.5 : 7.2,
              fontWeight: 760,
              lineHeight: 1.28,
              textAlign: "center",
              overflowWrap: "anywhere",
              maxHeight: isCompact ? 18 : 30,
              overflow: "hidden",
            }}
          >
            {identityCardLiveDisplay}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            zIndex: 2,
            left: 0,
            right: 0,
            bottom: 0,
            height: "22%",
            background:
              "linear-gradient(135deg, #FFFFFF 0%, #F8F6EF 64%, #EEF2F6 100%)",
            borderTop: "1px solid rgba(214,170,69,0.38)",
            color: "#07172C",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "48%",
              top: "-55%",
              width: "25%",
              aspectRatio: "1",
              borderRadius: "50%",
              border: "1px solid rgba(37,78,119,0.05)",
              boxShadow:
                "0 0 0 10px rgba(37,78,119,0.025), 0 0 0 21px rgba(37,78,119,0.018)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "6%",
              top: "25%",
              display: "flex",
              alignItems: "center",
              gap: isCompact ? 8 : 15,
            }}
          >
            <div style={{ fontSize: isCompact ? 18 : 34, fontWeight: 1000, letterSpacing: -1 }}>
              GSN
            </div>
            <div style={{ width: 1, height: isCompact ? 28 : 48, background: "rgba(214,170,69,0.72)" }} />
            <div>
              <div
                style={{
                  fontSize: isCompact ? 5.5 : 9.2,
                  fontWeight: 950,
                  letterSpacing: isCompact ? 1.35 : 2.5,
                  whiteSpace: "nowrap",
                }}
              >
                GLOBAL SUPPORT NETWORK
              </div>
              <div
                style={{
                  marginTop: isCompact ? 5 : 8,
                  color: "#617085",
                  fontSize: isCompact ? 4.5 : 7.2,
                  fontWeight: 850,
                  letterSpacing: isCompact ? 1.05 : 2,
                  whiteSpace: "nowrap",
                }}
              >
                A MORE INCLUSIVE GLOBAL ECONOMY
              </div>
            </div>
          </div>
          <div
            data-gsn-identity-card-boundary="true"
            style={{
              position: "absolute",
              right: "5%",
              top: "20%",
              width: "31%",
              display: "grid",
              gridTemplateColumns: isCompact ? "18px minmax(0, 1fr)" : "32px minmax(0, 1fr)",
              gap: isCompact ? 5 : 9,
              alignItems: "start",
              color: "#526174",
              fontSize: isCompact ? 4.5 : 7.4,
              fontWeight: 760,
              lineHeight: 1.32,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: isCompact ? 18 : 32,
                height: isCompact ? 18 : 32,
                borderRadius: "50%",
                border: `${isCompact ? 1 : 2}px solid #526174`,
                display: "grid",
                placeItems: "center",
                color: "#07172C",
                fontSize: isCompact ? 11 : 19,
                fontWeight: 1000,
              }}
            >
              i
            </span>
            <span>
              GSN private network membership. Not government identification,
              credit approval, payment guarantee, or proof of future behaviour.
            </span>
          </div>
        </div>
      </div>

      <div
        data-gsn-identity-card-actions="covered"
        style={{ marginTop: 12, display: "grid", gap: 8 }}
      >
        {identityCardActionsOpen ? (
          <div
            data-gsn-identity-card-actions-menu="true"
            style={{
              ...innerCard("#F8FBFF"),
              display: "grid",
              gridTemplateColumns: isCompact
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(4, minmax(0, 1fr))",
              gap: 8,
              padding: 8,
            }}
          >
            <PrimaryButton
              onClick={handleGsnIdentityCardPrimaryAction}
              stableHeight={50}
              fullWidth
              debugId="identity-integrity.gsn-card.share"
            >
              {identityCardValid ? "Share" : "Finish card"}
            </PrimaryButton>
            <SecondaryButton
              onClick={() => void refreshGsnIdentityCard()}
              stableHeight={50}
              fullWidth
              disabled={identityCardRefreshing}
              debugId="identity-integrity.gsn-card.refresh"
            >
              {identityCardRefreshing ? "Refreshing" : "Refresh"}
            </SecondaryButton>
            <SecondaryButton
              onClick={() => void copyGsnIdentityCard()}
              stableHeight={50}
              fullWidth
              debugId="identity-integrity.gsn-card.copy"
            >
              Copy card
            </SecondaryButton>
            <SecondaryButton
              onClick={() => void copyTrustSlipVerifyLink()}
              stableHeight={50}
              fullWidth
              debugId="identity-integrity.gsn-card.copy-verify-link"
            >
              Copy verify link
            </SecondaryButton>
          </div>
        ) : null}
      </div>
    </section>
  );

  if (loading) {
    return (
      <div
        style={{
          maxWidth: cardOnlyMode ? 920 : 1180,
          margin: "0 auto",
          paddingBottom: 40,
          display: "grid",
          gap: 18,
        }}
      >
        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            {cardOnlyMode ? "Loading your GSN ID Card..." : "Loading identity and integrity..."}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div
      data-identity-integrity-display={cardOnlyMode ? "card-only" : "full"}
      style={{
        maxWidth: cardOnlyMode ? 920 : 1180,
        margin: "0 auto",
        paddingBottom: 40,
        display: "grid",
        gap: cardOnlyMode ? 8 : 18,
      }}
    >
      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      {!cardOnlyMode ? (
      <section
        data-identity-integrity-front-package="true"
        style={{
          ...pageCard("#FFFFFF"),
          padding: isCompact ? 8 : 18,
          display: "flex",
          flexDirection: "column",
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
            <div style={{ marginTop: 6, ...compactHelperText(), overflowWrap: "anywhere" }}>
              GSN ID: {gmfnId}
            </div>
          </div>
        </div>

        <details
          data-identity-integrity-tools="covered"
          style={{
            marginTop: isCompact ? 12 : 16,
            borderRadius: 18,
            border: "1px solid rgba(37,78,119,0.12)",
            background: "#FFFFFF",
            overflow: "hidden",
            order: 2,
          }}
        >
          <StableDisclosureSummary
            debugId="identity-integrity.tools.toggle"
            stableHeight={isCompact ? 58 : 56}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: isCompact ? "10px 12px" : "10px 14px",
              color: "#07172C",
              background: "transparent",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <GsnLegacyIcon name="id" size={26} />
              <span style={{ minWidth: 0, textAlign: "left" }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 1000 }}>
                  More identity tools
                </span>
                <span style={{ display: "block", marginTop: 2, color: "#64748B", fontSize: 11, fontWeight: 780 }}>
                  Facts, copy actions, and other evidence steps
                </span>
              </span>
            </span>
            <span aria-hidden="true" style={{ color: "#8EA0B6", fontSize: 24, lineHeight: 1 }}>
              {"+"}
            </span>
          </StableDisclosureSummary>

          <div
            style={{
              padding: isCompact ? "0 10px 10px" : "0 12px 12px",
              display: "grid",
              gap: 8,
            }}
          >
        <details
          data-identity-integrity-tool-group="facts"
          style={{ borderRadius: 14, border: "1px solid rgba(37,78,119,0.10)", overflow: "hidden" }}
        >
          <StableDisclosureSummary
            debugId="identity-integrity.tools.facts"
            stableHeight={52}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", color: "#07172C" }}
          >
            <span style={{ fontWeight: 1000 }}>Identity facts</span>
            <span aria-hidden="true" style={{ color: "#8EA0B6", fontSize: 22 }}>{"+"}</span>
          </StableDisclosureSummary>
          <div style={{ padding: "0 8px 8px" }}>
        <div
          data-identity-integrity-fact-grid="true"
          style={{
            marginTop: 8,
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
              value: trustSlipCode || trustSlipPendingLabel,
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
                    fontSize: isCompact ? 10 : 11,
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
          </div>
        </details>

        <details
          data-identity-integrity-tool-group="copy"
          style={{ borderRadius: 14, border: "1px solid rgba(37,78,119,0.10)", overflow: "hidden" }}
        >
          <StableDisclosureSummary
            debugId="identity-integrity.tools.copy"
            stableHeight={52}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", color: "#07172C" }}
          >
            <span style={{ fontWeight: 1000 }}>Copy identity information</span>
            <span aria-hidden="true" style={{ color: "#8EA0B6", fontSize: 22 }}>{"+"}</span>
          </StableDisclosureSummary>
          <div style={{ padding: "0 8px 8px" }}>
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
            disabled={!gmfnIdValue}
            stableHeight={52}
            fullWidth
            minWidth={isCompact ? undefined : 132}
            debugId="identity-integrity.copy-gmfn-id"
            style={identityCopyActionStyle(Boolean(gmfnIdValue), "primary")}
          >
            <span style={identityCopyIconBox(Boolean(gmfnIdValue), true)}>
              <GsnLegacyIcon name="id" size={24} />
            </span>
            <span style={{ minWidth: 0, display: "grid", gap: 2, textAlign: "left" }}>
              <span style={{ fontWeight: 1000, lineHeight: 1.05 }}>Copy GSN ID</span>
              <span style={{ fontSize: 10.5, fontWeight: 900, opacity: 0.82 }}>
                {gmfnIdValue ? "Ready" : "Not issued yet"}
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
                {trustSlipCode ? "Ready" : trustSlipPendingLabel}
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
          </div>
        </details>

        <details
          data-identity-integrity-tool-group="tasks"
          style={{ borderRadius: 14, border: "1px solid rgba(37,78,119,0.10)", overflow: "hidden" }}
        >
          <StableDisclosureSummary
            debugId="identity-integrity.tools.tasks"
            stableHeight={52}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", color: "#07172C" }}
          >
            <span style={{ fontWeight: 1000 }}>Choose another evidence step</span>
            <span aria-hidden="true" style={{ color: "#8EA0B6", fontSize: 22 }}>{"+"}</span>
          </StableDisclosureSummary>
          <div style={{ padding: "0 8px 8px" }}>
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
                      fontSize: isCompact ? 10 : 11,
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
          </div>
        </details>
          </div>
        </details>

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
              padding: isCompact ? 8 : 12,
              display: "grid",
              gap: 8,
            }}
          >
            <details
              data-identity-integrity-completion-steps="collapsed"
              style={{
                borderRadius: 14,
                border: "1px solid rgba(37,78,119,0.10)",
                background: "#FFFFFF",
                overflow: "hidden",
              }}
            >
              <StableDisclosureSummary
                debugId="identity-integrity.completion-steps.toggle"
                stableHeight={isCompact ? 52 : 50}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: isCompact ? "10px 12px" : "10px 14px",
                  color: "#07172C",
                  fontSize: 13,
                  fontWeight: 1000,
                  background: "transparent",
                }}
              >
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", textTransform: "uppercase" }}>
                    Completion steps
                  </span>
                  {!isCompact ? (
                    <span
                      style={{
                        display: "block",
                        marginTop: 2,
                        color: "#64748B",
                        fontSize: 12,
                        fontWeight: 760,
                        lineHeight: 1.2,
                        textTransform: "none",
                      }}
                    >
                      Open only if you need the step-by-step path.
                    </span>
                  ) : null}
                </span>
                <span aria-hidden="true" style={{ color: "#8EA0B6", fontSize: 26, lineHeight: 1 }}>
                  {">"}
                </span>
              </StableDisclosureSummary>

              <div
                style={{
                  padding: isCompact ? "0 10px 10px" : "0 12px 12px",
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
                      padding: isCompact ? "6px 8px" : "8px 10px",
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
            </details>

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
                    onChange={(event) => {
                      setPhoneInput(event.target.value);
                      setPhoneConflict(null);
                    }}
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
                      padding: isCompact ? "6px 8px" : "8px 10px",
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
                {phoneConflict ? (
                  <div
                    data-identity-integrity-phone-conflict-recovery="true"
                    style={{
                      gridColumn: "1 / -1",
                      display: "grid",
                      gap: 8,
                      borderRadius: 14,
                      border: "1px solid rgba(180,83,9,0.18)",
                      background: "#FFFBEB",
                      padding: 8,
                    }}
                  >
                    <div style={{ color: "#713F12", fontSize: 12.5, fontWeight: 900, lineHeight: 1.35 }}>
                      <div style={{ fontWeight: 1000 }}>{phoneConflict.title}</div>
                      <div style={{ marginTop: 4 }}>{phoneConflict.firstStep}</div>
                      <div style={{ marginTop: 4 }}>
                        This number is protected on another GSN identity. Recover that identity first; only merge after owner/admin review.
                      </div>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
                        gap: 8,
                      }}
                    >
                      <StableCtaLink
                        to={phoneConflictRecoveryUrl || "/login?force=1&recovery=1"}
                        stableHeight={52}
                        fullWidth
                        debugId="identity-integrity.phone-conflict.recover-original"
                        style={{ ...identityTaskButtonStyle(), borderRadius: 14 }}
                      >
                        Recover original GSN ID
                      </StableCtaLink>
                      {canOpenIdentityRiskReview ? (
                        <StableCtaLink
                          to={phoneConflictAdminReviewUrl || routes.identityRisk}
                          kind="secondary"
                          stableHeight={52}
                          fullWidth
                          debugId="identity-integrity.phone-conflict.admin-review"
                          style={{ ...identityTaskButtonStyle(), borderRadius: 14 }}
                        >
                          Open identity review
                        </StableCtaLink>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {phoneVerificationId && phoneDeliveryMode === "pending-sms" ? (
                  <SecondaryButton
                    type="button"
                    onClick={handleResendPhoneVerification}
                    disabled={phoneBusy}
                    stableHeight={52}
                    fullWidth
                    debugId="identity-integrity.phone-completion-resend"
                    style={identityTaskButtonStyle()}
                  >
                    Send code again
                  </SecondaryButton>
                ) : null}
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
                    padding: 8,
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
        </div>
      </section>
      ) : null}

      {cardOnlyMode ? landscapeIdentityCard : null}
      {!cardOnlyMode ? (
      <details
        data-identity-integrity-details="covered"
        style={{
          ...pageCard("#FFFFFF"),
          padding: 0,
          overflow: "hidden",
          border: "1px solid rgba(37,78,119,0.12)",
          boxShadow: "0 12px 30px rgba(7,23,44,0.06)",
        }}
      >
        <StableDisclosureSummary
          debugId="identity-integrity.details.toggle"
          stableHeight={isCompact ? 64 : 60}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: isCompact ? "10px 14px" : "10px 16px",
            color: "#07172C",
            background: "transparent",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <GsnLegacyIcon name="shield" size={28} />
            <span style={{ minWidth: 0, textAlign: "left" }}>
              <span style={{ display: "block", fontSize: 15, fontWeight: 1000 }}>
                More identity details
              </span>
              <span style={{ display: "block", marginTop: 2, color: "#64748B", fontSize: 11, fontWeight: 780 }}>
                Readings, recovery, history, and guidance
              </span>
            </span>
          </span>
          <span aria-hidden="true" style={{ color: "#8EA0B6", fontSize: 24, lineHeight: 1 }}>
            {"+"}
          </span>
        </StableDisclosureSummary>

        <div
          style={{
            padding: isCompact ? "0 10px 10px" : "0 12px 12px",
            display: "grid",
            gap: 10,
          }}
        >
      <section
        data-identity-integrity-secondary-section="evidence-meaning"
        style={decongestedSectionCard(collapsed.evidenceMeaning, isCompact)}
      >
        {sectionIconHeader(
          "shield",
          "Evidence meaning",
          "What this identity evidence means, why it matters, and what to do first.",
          <SubtleButton
            onClick={() => toggleSection("evidenceMeaning")}
            stableHeight={52}
            style={collapseToggle()}
            debugId="identity-integrity.toggle-evidence-meaning"
          >
            {collapsed.evidenceMeaning ? "Open" : "Hide"}
          </SubtleButton>
        )}

        {!collapsed.evidenceMeaning ? (
          <RealLifeMeaningGuide
            compact={isCompact}
            guidance={getRealLifeTrustGuidance("identity-evidence")}
            style={{ marginTop: 14 }}
          />
        ) : null}
      </section>

      <section data-identity-integrity-secondary-section="readings" style={decongestedSectionCard(collapsed.summary, isCompact)}>
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
                <div style={sectionLabel()}>Local community evidence</div>
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
                  Evidence posture: {openTrustPosture.label}
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
                  Evidence posture: {cciPosture.label}
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
                  {trustSlipCode || trustSlipPendingLabel}
                </div>
                <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                  {trustSlipCode
                    ? "Portable verification record ready."
                    : trustSlipPendingDetail}
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

      <section data-identity-integrity-secondary-section="continuity" style={decongestedSectionCard(collapsed.continuity, isCompact)}>
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
                <div style={sectionLabel()}>Continuity posture</div>
                <div
                  style={{
                    marginTop: 8,
                    color: continuity.tone.text,
                    fontWeight: 900,
                    fontSize: 26,
                  }}
                >
                  {continuity.label}
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

      <section data-identity-integrity-secondary-section="recovery" style={decongestedSectionCard(collapsed.recovery && activeIdentityTask !== "recovery" && !recovery.shouldVerify, isCompact)}>
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

      <section data-identity-integrity-secondary-section="reasons" style={decongestedSectionCard(collapsed.reasons, isCompact)}>
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

      <section data-identity-integrity-secondary-section="timeline" style={decongestedSectionCard(collapsed.timeline, isCompact)}>
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

      <section data-identity-integrity-secondary-section="next" style={decongestedSectionCard(collapsed.next, isCompact)}>
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

            <details
              data-identity-integrity-why-this-page="collapsed"
              style={{
                ...softCard("#F8FBFF"),
                padding: 0,
                overflow: "hidden",
              }}
            >
              <StableDisclosureSummary
                debugId="identity-integrity.why-this-page.toggle"
                stableHeight={isCompact ? 52 : 56}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: isCompact ? "10px 12px" : "12px 14px",
                  color: "#07172C",
                  fontSize: 13,
                  fontWeight: 1000,
                  background: "transparent",
                }}
              >
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", textTransform: "uppercase" }}>
                    Why this page matters
                  </span>
                  {!isCompact ? (
                    <span
                      style={{
                        display: "block",
                        marginTop: 2,
                        color: "#64748B",
                        fontSize: 12,
                        fontWeight: 760,
                        lineHeight: 1.2,
                        textTransform: "none",
                      }}
                    >
                      Open only if you need the background.
                    </span>
                  ) : null}
                </span>
                <span aria-hidden="true" style={{ color: "#8EA0B6", fontSize: 26, lineHeight: 1 }}>
                  {">"}
                </span>
              </StableDisclosureSummary>

              <div style={{ padding: isCompact ? "0 12px 12px" : "0 14px 14px", display: "grid", gap: 10 }}>
                <div style={helperText()}>
                  Identity is the stable layer. It should not split from one community to another.
                </div>
                <div style={helperText()}>
                  Cross-community consistency helps you see how steadily your identity and evidence signals hold across visible communities.
                </div>
                <div style={helperText()}>
                  Local community evidence shows your immediate community context.
                </div>
              </div>
            </details>
          </div>
        ) : null}
      </section>

      <section data-identity-integrity-secondary-section="guides" style={decongestedSectionCard(collapsed.guides, isCompact)}>
        {sectionIconHeader(
          "document",
          "Evidence Guides",
          "Reference maps and deeper identity guidance stay closed until needed.",
          <SubtleButton
            onClick={() => toggleSection("guides")}
            stableHeight={52}
            style={collapseToggle()}
            debugId="identity-integrity.toggle-guides"
          >
            {collapsed.guides ? "Open" : "Hide"}
          </SubtleButton>
        )}

        {!collapsed.guides ? (
          <div data-identity-integrity-guide-stack="true" style={{ marginTop: 14, display: "grid", gap: 14 }}>
            <NextActionGuide
              storageKey="gmfn.identityIntegrity.nextActionGuide.v1"
              compact={isCompact}
              items={guideItems}
              intro="Say what you need next in plain words like open Trust Passport, check consistency, or open the portable record. GSN will carry you into the closest evidence surface."
              onSelect={handleGuideSelect}
            />

            <TrustDocumentActionGuide content={actionGuide} compact={isCompact} />

            <TrustDocumentFamilyMap
              compact={isCompact}
              items={trustDocumentFamilyItems}
              title="How Identity & Integrity fits into the wider trust-document family"
              intro="Identity & Integrity is the steady anchor under the evidence family. Use this map when you need to separate stable identity and continuity from the fuller Trust Passport evidence record, portable TrustSlip evidence, and public validity checks."
            />

            <TrustDocumentUseCases
              compact={isCompact}
              items={trustDocumentUseCases}
              title="Which evidence question should stay with identity first?"
              intro="Stay here when the question is who this person is, what holds steady across evidence changes, or what narrower verification and consistency context sits behind the evidence record."
            />
          </div>
        ) : null}
      </section>
        </div>
      </details>
      ) : null}
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
