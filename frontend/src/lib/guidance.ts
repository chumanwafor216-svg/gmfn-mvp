import {
  getCurrentClan,
  getDailyInsight,
  getLoanGuarantorInbox,
  getMe,
  getMyNotifications,
  getMySettings,
  getSelectedClanId,
  getTrustWhyMe,
  listMarketplaceRequests,
  listMyLoans,
  listTrustEvents,
} from "./api";
import { buildIdentityEvidenceCompletionFromTrustEvents } from "./identityEvidenceCompletion";

export type GuidanceSeverity = "normal" | "important" | "urgent";
export type GuidanceInboxBucketKey =
  | "actNow"
  | "dueSoon"
  | "watchAndWait"
  | "generalUpdates";

export type GuidanceAction = {
  kind: string;
  title: string;
  detail: string;
  ctaLabel: string;
  ctaTo: string;
  severity?: GuidanceSeverity;
  todayText?: string;
  tomorrowText?: string;
};

export type GuidanceNotice = {
  id: string;
  kind: string;
  title: string;
  detail: string;
  ctaLabel: string;
  ctaTo: string;
  bucket: GuidanceInboxBucketKey;
  unread?: boolean;
};

export type GuidanceTrustJourneyItem = {
  label: string;
  category: "built" | "protected" | "weakened" | "repair";
};

export type GuidanceTrustJourneySummary = {
  trend: "building" | "steady" | "weakened";
  heading: string;
  detail: string;
  builtCount: number;
  protectedCount: number;
  weakenedCount: number;
  repairCount: number;
  items: GuidanceTrustJourneyItem[];
};

export type GuidanceTrustChangeExplainer = {
  helps: string[];
  weakens: string[];
  next: string[];
};

export type GuidanceMarketWisdomCard = {
  title: string;
  text: string;
};

export type GuidanceWeeklyFocus = {
  title: string;
  detail: string;
  ctaLabel?: string;
  ctaTo?: string;
};

export type GuidanceActionInboxSummary = {
  actNow: GuidanceNotice[];
  dueSoon: GuidanceNotice[];
  watchAndWait: GuidanceNotice[];
  generalUpdates: GuidanceNotice[];
  unreadCount: number;
};

export type GuidanceStats = {
  pendingGuarantorRequests: number;
  unreadNotifications: number;
  activeSupportItems: number;
  openDemandCount: number;
};

export type GuidanceSnapshot = {
  me: any | null;
  currentClan: any | null;
  nextBestStep: GuidanceAction | null;
  todayTomorrow: { today: string; tomorrow: string } | null;
  trustJourneySummary: GuidanceTrustJourneySummary;
  trustChangeExplainer: GuidanceTrustChangeExplainer;
  marketWisdomCard: GuidanceMarketWisdomCard;
  weeklyFocus: GuidanceWeeklyFocus | null;
  recoveryPath: GuidanceAction | null;
  actionInboxSummary: GuidanceActionInboxSummary;
  stats: GuidanceStats;
};

type GuidanceVoice = "balanced" | "warm" | "direct";

const IMAGE_FIELD_NAMES = [
  "community_image_url",
  "marketplace_image_url",
  "cover_image_url",
  "banner_url",
  "profile_picture_url",
  "profile_image_url",
  "avatar_url",
  "photo_url",
  "image_url",
  "community_logo_url",
  "logo_url",
  "picture_url",
  "display_picture_url",
  "icon_url",
  "image",
  "photo",
  "banner",
  "logo",
  "avatar",
  "picture",
  "dp",
];

const FINAL_LOAN_STATUSES = new Set([
  "approved",
  "repaid",
  "closed",
  "completed",
  "cancelled",
  "defaulted",
]);

const PUBLIC_ROUTE_PREFIXES = [
  "cover",
  "welcome",
  "guide",
  "login",
  "create",
  "join",
  "pending-approval",
  "join-request",
  "join-approval",
  "community-confirmations",
  "approved",
  "activate",
  "activate-membership",
  "existing",
  "founder",
  "public-create",
  "register",
];

const GUIDANCE_TARGETS = {
  DASHBOARD: "/app/dashboard",
  COMMUNITY: "/app/community",
  MARKETPLACE: "/app/marketplace",
  FINANCE: "/app/finance",
  MONEY_IN: "/app/payment/pool",
  MONEY_OUT: "/app/withdrawal-instructions",
  PAYOUT_DETAILS: "/app/payout-details",
  TRUST: "/app/trust",
  TRUST_SLIP: "/app/trust-slip",
  TRUST_SLIP_VERIFY: "/app/trust-slip/verify",
  CCI: "/app/identity",
  NOTIFICATIONS: "/app/notifications",
  DEMAND_BOX: "/app/demand-box",
  LOANS: "/app/loans",
  LOAN_READINESS: "/app/loan-readiness",
  LOAN_SUGGESTIONS: "/app/loan-suggestions",
  LOAN_WORKBENCH: "/app/loan-workbench",
  COMMITMENT_BUILDER: "/app/dashboard#focus-commitments",
  GUIDE: "/app/my-gmfn-and-i",
  SETTINGS: "/app/my-gmfn-and-i?tab=settings",
  BUILD_FIRST_CIRCLE: "/app/build-first-circle",
  SHOP_ME: "/app/shop-control",
  COMMAND_CENTER: "/app/command-center",
  GUARANTOR_EARNINGS: "/app/guarantor-earnings",
} as const;

const EXACT_TARGET_ALIASES: Record<string, string> = {
  dashboard: GUIDANCE_TARGETS.DASHBOARD,
  home: GUIDANCE_TARGETS.DASHBOARD,
  "main-dashboard": GUIDANCE_TARGETS.DASHBOARD,
  "member-home": GUIDANCE_TARGETS.DASHBOARD,

  notifications: GUIDANCE_TARGETS.NOTIFICATIONS,
  "action-inbox": GUIDANCE_TARGETS.NOTIFICATIONS,
  inbox: GUIDANCE_TARGETS.NOTIFICATIONS,

  finance: GUIDANCE_TARGETS.FINANCE,
  finances: GUIDANCE_TARGETS.FINANCE,
  financials: GUIDANCE_TARGETS.FINANCE,
  "open-finance": GUIDANCE_TARGETS.FINANCE,
  "finance-overview": GUIDANCE_TARGETS.FINANCE,
  "finance-meter": GUIDANCE_TARGETS.FINANCE,

  "money-in": GUIDANCE_TARGETS.MONEY_IN,
  "payment/pool": GUIDANCE_TARGETS.MONEY_IN,
  "payment-rails": "/app/payment-rails",
  "bank-accounts": "/app/payment-rails",
  "bank-rails": "/app/payment-rails",

  "money-out": GUIDANCE_TARGETS.MONEY_OUT,
  withdrawal: GUIDANCE_TARGETS.MONEY_OUT,
  "withdrawal-instructions": GUIDANCE_TARGETS.MONEY_OUT,
  "payout-details": "/app/payout-details",

  marketplace: GUIDANCE_TARGETS.MARKETPLACE,
  market: GUIDANCE_TARGETS.MARKETPLACE,
  "open-marketplace": GUIDANCE_TARGETS.MARKETPLACE,

  community: GUIDANCE_TARGETS.COMMUNITY,
  "community-home": GUIDANCE_TARGETS.COMMUNITY,
  "community-tools": GUIDANCE_TARGETS.COMMUNITY,
  "community-tool": GUIDANCE_TARGETS.COMMUNITY,
  "control-room": GUIDANCE_TARGETS.COMMUNITY,
  "command-room": GUIDANCE_TARGETS.COMMUNITY,
  "open-community": GUIDANCE_TARGETS.COMMUNITY,
  "open-community-home": GUIDANCE_TARGETS.COMMUNITY,

  trust: GUIDANCE_TARGETS.TRUST,
  "trust-passport": GUIDANCE_TARGETS.TRUST,
  "open-trust": GUIDANCE_TARGETS.TRUST,

  "trust-slip": GUIDANCE_TARGETS.TRUST_SLIP,
  trustslip: GUIDANCE_TARGETS.TRUST_SLIP,
  "open-trust-slip": GUIDANCE_TARGETS.TRUST_SLIP,
  "merchant-verify": GUIDANCE_TARGETS.TRUST_SLIP,
  "verify-merchant": GUIDANCE_TARGETS.TRUST_SLIP,
  "trust-slip/verify": GUIDANCE_TARGETS.TRUST_SLIP_VERIFY,

  identity: GUIDANCE_TARGETS.CCI,
  "identity-integrity": GUIDANCE_TARGETS.CCI,
  cci: GUIDANCE_TARGETS.CCI,

  "demand-box": GUIDANCE_TARGETS.DEMAND_BOX,
  demands: GUIDANCE_TARGETS.DEMAND_BOX,
  "open-demand": GUIDANCE_TARGETS.DEMAND_BOX,

  loans: GUIDANCE_TARGETS.LOANS,
  money: GUIDANCE_TARGETS.LOANS,
  support: GUIDANCE_TARGETS.LOANS,
  "support-path": GUIDANCE_TARGETS.LOANS,
  "loan-support": GUIDANCE_TARGETS.LOANS,
  "loans-support": GUIDANCE_TARGETS.LOANS,

  "loan-readiness": GUIDANCE_TARGETS.LOAN_READINESS,
  readiness: GUIDANCE_TARGETS.LOAN_READINESS,

  "loan-suggestions": GUIDANCE_TARGETS.LOAN_SUGGESTIONS,
  suggestions: GUIDANCE_TARGETS.LOAN_SUGGESTIONS,

  "loan-workbench": GUIDANCE_TARGETS.LOAN_WORKBENCH,
  workbench: GUIDANCE_TARGETS.LOAN_WORKBENCH,

  "commitment-builder": GUIDANCE_TARGETS.COMMITMENT_BUILDER,
  commitment: GUIDANCE_TARGETS.COMMITMENT_BUILDER,
  commitments: GUIDANCE_TARGETS.COMMITMENT_BUILDER,
  "focus-commitments": GUIDANCE_TARGETS.COMMITMENT_BUILDER,

  "my-gmfn-and-i": GUIDANCE_TARGETS.GUIDE,
  guide: GUIDANCE_TARGETS.GUIDE,
  "member-guide": GUIDANCE_TARGETS.GUIDE,
  settings: GUIDANCE_TARGETS.SETTINGS,
  "workspace-settings": GUIDANCE_TARGETS.SETTINGS,
  "my-gmfn-and-i/settings": GUIDANCE_TARGETS.SETTINGS,

  "build-first-circle": GUIDANCE_TARGETS.BUILD_FIRST_CIRCLE,
  "first-circle": GUIDANCE_TARGETS.BUILD_FIRST_CIRCLE,
  "grow-your-circle": GUIDANCE_TARGETS.BUILD_FIRST_CIRCLE,
  circle: GUIDANCE_TARGETS.BUILD_FIRST_CIRCLE,
  "circle-builder": GUIDANCE_TARGETS.BUILD_FIRST_CIRCLE,

  shop: GUIDANCE_TARGETS.SHOP_ME,
  "my-shop": GUIDANCE_TARGETS.SHOP_ME,
  "shop-gallery": GUIDANCE_TARGETS.SHOP_ME,
  "open-shop": GUIDANCE_TARGETS.SHOP_ME,

  "shop-control": "/app/shop-control",
  "shop-manager": "/app/shop-control",
  spotlight: "/app/shop-control#shop-control-spotlight",
  "shop-spotlight": "/app/shop-control#shop-control-spotlight",
  "free-spotlight": "/app/shop-control#shop-control-spotlight",
  "shop-control/spotlight": "/app/shop-control#shop-control-spotlight",
  "shop-control/free-spotlight": "/app/shop-control#shop-control-spotlight",
  "paid-spotlight": "/app/shop-control/subscription-spotlight",
  "subscription-spotlight": "/app/shop-control/subscription-spotlight",
  "shop-control/paid-spotlight": "/app/shop-control/subscription-spotlight",

  "command-center": GUIDANCE_TARGETS.COMMAND_CENTER,
  "trust-command-centre": GUIDANCE_TARGETS.COMMAND_CENTER,
  "trust-analytics": "/app/command-center/trust-analytics",
  "system-operations": "/app/command-center/system-operations",
  "admin/exposure": "/app/command-center/exposure",
  "admin/trust-graph": "/app/command-center/trust-graph",

  earnings: GUIDANCE_TARGETS.GUARANTOR_EARNINGS,
  "guarantor-earnings": GUIDANCE_TARGETS.GUARANTOR_EARNINGS,
  "guarantor-inbox": "/app/guarantor-inbox",
};

const SAFE_STATIC_APP_PATHS = new Set([
  "dashboard",
  "community",
  "marketplace",
  "finance",
  "payment/pool",
  "payment-rails",
  "payout-details",
  "withdrawal-instructions",
  "trust",
  "trust-slip",
  "trust-slip/verify",
  "identity",
  "notifications",
  "demand-box",
  "loans",
  "loan-readiness",
  "loan-suggestions",
  "loan-workbench",
  "guarantor-earnings",
  "guarantor-inbox",
  "my-gmfn-and-i",
  "build-first-circle",
  "shop/me",
  "shop-control",
  "shop-control/subscription-spotlight",
  "shop-gallery-control",
  "vault-control",
  "shop-assets",
  "command-center",
  "command-center/bank-console",
  "command-center/revenue-allocation",
  "command-center/exposure",
  "command-center/trust-analytics",
  "command-center/trust-events",
  "command-center/identity-risk",
  "command-center/incomplete-loans",
  "command-center/system-operations",
  "command-center/trust-graph",
]);

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

function positiveNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function toArrayRows(raw: any): any[] {
  if (Array.isArray(raw)) return raw;

  const buckets = [raw?.items, raw?.data?.items, raw?.results, raw?.rows];
  for (const bucket of buckets) {
    if (Array.isArray(bucket)) return bucket;
  }

  return [];
}

function normalizeDate(value: any): Date | null {
  const raw = safeStr(value);
  if (!raw) return null;

  const dt = new Date(raw);
  if (!Number.isFinite(dt.getTime())) return null;
  return dt;
}

function daysSince(value: any): number {
  const dt = normalizeDate(value);
  if (!dt) return 0;

  const now = Date.now();
  const diff = now - dt.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function daySeed(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

function hashSeed(...parts: Array<string | number | boolean | undefined>): number {
  const text = parts.map((part) => String(part ?? "")).join("|");
  let hash = 0;

  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }

  return hash;
}

function pickVariant(
  choices: string[],
  ...seeds: Array<string | number | boolean | undefined>
): string {
  if (!choices.length) return "";
  const index = hashSeed(daySeed(), ...seeds) % choices.length;
  return choices[index];
}

function getGuidanceVoice(settings: any): GuidanceVoice {
  const preset = safeStr(settings?.tonePreset || settings?.tone_preset);

  if (preset === "cooperative-warm") return "warm";
  if (preset === "enterprise-green") return "direct";
  return "balanced";
}

function normalizeLoanRow(raw: any): any | null {
  if (!raw) return null;

  const src = raw?.item || raw?.loan || raw;

  return {
    id: positiveNumber(src?.id || src?.loan_id) || undefined,
    clan_id: positiveNumber(src?.clan_id || src?.community_id) || undefined,
    status: firstTruthy(src?.status, src?.loan_status, src?.state, "open"),
    title: firstTruthy(
      src?.title,
      src?.purpose,
      src?.name,
      src?.loan_title,
      src?.description,
      "Loan support item"
    ),
    role: firstTruthy(
      src?.role,
      src?.my_role,
      src?.participant_role,
      src?.is_guarantor ? "Guarantor" : "",
      src?.is_borrower ? "Borrower" : ""
    ),
    borrower_name: firstTruthy(
      src?.borrower_name,
      src?.member_name,
      src?.requester_name
    ),
    created_at: firstTruthy(src?.created_at, src?.requested_at),
  };
}

function isActiveLoan(row: any): boolean {
  const status = safeStr(row?.status).toLowerCase();
  return !FINAL_LOAN_STATUSES.has(status);
}

function isBorrowerLoan(row: any): boolean {
  const role = safeStr(row?.role).toLowerCase();
  return role === "borrower" || role.includes("borrow");
}

function looksLikeImageKey(key: string, parentKey = ""): boolean {
  const rawKey = safeStr(key).toLowerCase();
  const rawParent = safeStr(parentKey).toLowerCase();

  if (!rawKey) return false;

  if (rawKey === "url" && rawParent) {
    return looksLikeImageKey(rawParent);
  }

  return IMAGE_FIELD_NAMES.some(
    (token) =>
      rawKey === token ||
      rawKey.endsWith(`_${token}`) ||
      rawKey.endsWith(`${token}_url`) ||
      rawKey.includes(token)
  );
}

function looksLikeImageValue(value: any): boolean {
  const raw = safeStr(value).toLowerCase();
  if (!raw) return false;

  return (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("/") ||
    /\.(png|jpe?g|webp|gif|bmp|svg|avif)(\?|#|$)/.test(raw) ||
    raw.includes("/media/") ||
    raw.includes("/images/") ||
    raw.includes("/uploads/") ||
    raw.includes("/files/") ||
    raw.includes("/image/")
  );
}

function getNestedImageCandidate(input: any): string {
  const seen = new Set<any>();
  const candidates: string[] = [];

  function walk(value: any, depth: number, parentKey = "") {
    if (value == null || depth > 6) return;

    if (typeof value === "string") {
      if (looksLikeImageKey(parentKey) && looksLikeImageValue(value)) {
        candidates.push(value);
      }
      return;
    }

    if (typeof value !== "object") return;
    if (seen.has(value)) return;
    seen.add(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        walk(item, depth + 1, parentKey);
      }
      return;
    }

    for (const [key, child] of Object.entries(value)) {
      if (typeof child === "string") {
        if (
          (looksLikeImageKey(key, parentKey) ||
            (safeStr(key).toLowerCase() === "url" &&
              looksLikeImageKey(parentKey))) &&
          looksLikeImageValue(child)
        ) {
          candidates.push(child);
        }
      } else {
        walk(child, depth + 1, key);
      }
    }
  }

  walk(input, 0);
  return safeStr(candidates[0] || "");
}

function hasCommunityPicture(clan: any): boolean {
  const rows = [
    clan,
    clan?.community,
    clan?.profile,
    clan?.marketplace,
    clan?.clan,
    clan?.meta,
  ];

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;

    for (const field of IMAGE_FIELD_NAMES) {
      if (safeStr((row as any)?.[field])) return true;
    }
  }

  return Boolean(getNestedImageCandidate(clan));
}

function containsAny(text: string, tokens: string[]): boolean {
  return tokens.some((token) => text.includes(token));
}

function splitPathSuffix(raw: string): { path: string; suffix: string } {
  const match = raw.match(/^([^?#]*)(.*)$/);
  return {
    path: safeStr(match?.[1] || ""),
    suffix: String(match?.[2] || ""),
  };
}

function matchesRoutePrefix(path: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) =>
      path === prefix ||
      path.startsWith(`${prefix}/`) ||
      path.startsWith(`${prefix}?`) ||
      path.startsWith(`${prefix}#`)
  );
}

function mergeAliasTarget(target: string, suffix: string): string {
  if (!suffix) return target;

  const parsed = new URL(target, "http://local");
  const hashIndex = suffix.indexOf("#");
  const queryPart = hashIndex >= 0 ? suffix.slice(0, hashIndex) : suffix;
  const hashPart = hashIndex >= 0 ? suffix.slice(hashIndex) : "";

  if (queryPart.startsWith("?")) {
    const extra = new URLSearchParams(queryPart.slice(1));
    extra.forEach((value, key) => {
      if (!parsed.searchParams.has(key)) {
        parsed.searchParams.append(key, value);
      }
    });
  }

  if (hashPart) {
    parsed.hash = hashPart;
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function isSafeRelativeAppPath(path: string): boolean {
  const value = path.toLowerCase();

  return (
    /^payment\/loans\/[^/]+$/.test(value) ||
    /^shop\/[^/]+$/.test(value) ||
    /^open-shop\/[^/]+$/.test(value) ||
    /^shop-gallery\/[^/]+$/.test(value) ||
    /^community\/[^/]+\/join-requests$/.test(value) ||
    value === "trust-slip/verify" ||
    value.startsWith("command-center/") ||
    value.startsWith("admin/")
  );
}

function normalizeAppTargetPath(path: string, suffix: string): string {
  const appPath = safeStr(path).replace(/^app\/?/i, "");
  const lowerAppPath = appPath.toLowerCase();

  if (!lowerAppPath) return GUIDANCE_TARGETS.DASHBOARD;

  const aliased = EXACT_TARGET_ALIASES[lowerAppPath];
  if (aliased) {
    return mergeAliasTarget(aliased, suffix);
  }

  if (SAFE_STATIC_APP_PATHS.has(lowerAppPath) || isSafeRelativeAppPath(lowerAppPath)) {
    return `/app/${appPath}${suffix}`;
  }

  return GUIDANCE_TARGETS.NOTIFICATIONS;
}

function normalizeActionTargetPath(value: any): string {
  const raw = safeStr(value);
  if (!raw) return GUIDANCE_TARGETS.NOTIFICATIONS;

  if (/^(https?:|mailto:|tel:)/i.test(raw)) {
    return raw;
  }

  if (raw.startsWith("#")) {
    return raw;
  }

  if (raw.startsWith("/")) {
    const { path, suffix } = splitPathSuffix(raw.replace(/^\/+/, ""));
    const normalizedPath = safeStr(path).replace(/^\/+/, "");
    const lowerPath = normalizedPath.toLowerCase();

    if (!lowerPath) return GUIDANCE_TARGETS.NOTIFICATIONS;

    if (lowerPath === "app" || lowerPath.startsWith("app/")) {
      return normalizeAppTargetPath(normalizedPath, suffix);
    }

    const aliased = EXACT_TARGET_ALIASES[lowerPath];
    if (aliased) {
      return mergeAliasTarget(aliased, suffix);
    }

    if (matchesRoutePrefix(lowerPath, PUBLIC_ROUTE_PREFIXES)) {
      return `/${normalizedPath}${suffix}`;
    }

    return GUIDANCE_TARGETS.NOTIFICATIONS;
  }

  if (raw.startsWith("?")) {
    return `${GUIDANCE_TARGETS.NOTIFICATIONS}${raw}`;
  }

  const { path, suffix } = splitPathSuffix(raw);
  const normalizedPath = safeStr(path).replace(/^\/+/, "");
  const lowerPath = normalizedPath.toLowerCase();

  if (!lowerPath) return GUIDANCE_TARGETS.NOTIFICATIONS;

  const aliased = EXACT_TARGET_ALIASES[lowerPath];
  if (aliased) {
    return mergeAliasTarget(aliased, suffix);
  }

  if (lowerPath === "app" || lowerPath.startsWith("app/")) {
    return normalizeAppTargetPath(normalizedPath, suffix);
  }

  if (matchesRoutePrefix(lowerPath, PUBLIC_ROUTE_PREFIXES)) {
    return `/${normalizedPath}${suffix}`;
  }

  if (isSafeRelativeAppPath(lowerPath)) {
    return `/app/${normalizedPath}${suffix}`;
  }

  return GUIDANCE_TARGETS.NOTIFICATIONS;
}

function resolveNoticeTarget(raw: any): string {
  const rawExplicit = raw?.action_url || raw?.cta_to || raw?.ctaTo || raw?.to;
  const text = [
    safeStr(raw?.kind),
    safeStr(raw?.title),
    safeStr(raw?.message),
    safeStr(raw?.detail),
    safeStr(raw?.description),
    safeStr(raw?.action_label),
  ]
    .join(" ")
    .toLowerCase();

  if (safeStr(rawExplicit)) {
    const explicit = normalizeActionTargetPath(rawExplicit);
    if (
      explicit === GUIDANCE_TARGETS.LOANS &&
      containsAny(text, [
        "pool deposit",
        "deposit confirmed",
        "deposit was confirmed",
      ])
    ) {
      return GUIDANCE_TARGETS.FINANCE;
    }
    return explicit;
  }

  if (
    containsAny(text, [
      "build first circle",
      "first circle",
      "grow your circle",
      "circle invite",
    ])
  ) {
    return GUIDANCE_TARGETS.BUILD_FIRST_CIRCLE;
  }

  if (
    containsAny(text, [
      "merchant verify",
      "trustslip",
      "trust slip",
      "verify qr",
      "scan qr",
      "qr verify",
    ])
  ) {
    return GUIDANCE_TARGETS.TRUST_SLIP;
  }

  if (
    containsAny(text, [
      "money in",
      "pay in",
      "pool deposit",
      "deposit reference",
      "payment code",
      "payment instruction",
      "payment rail",
      "community account",
      "deposit into pool",
      "fund pool",
    ])
  ) {
    return GUIDANCE_TARGETS.MONEY_IN;
  }

  if (
    containsAny(text, [
      "money out",
      "withdrawal instruction",
      "withdraw from pool",
      "cash out",
      "payout destination",
      "personal payout",
      "withdrawal rail",
      "withdrawal request",
    ])
  ) {
    return GUIDANCE_TARGETS.MONEY_OUT;
  }

  if (
    containsAny(text, [
      "finance",
      "financial",
      "pool balance",
      "effective available",
      "pending deposits",
      "pending withdrawals",
      "locked by guarantees",
      "released guarantees",
      "guarantor exposure",
      "borrower-side total",
      "remaining to repay",
      "recent finance event",
      "pool position",
    ])
  ) {
    return GUIDANCE_TARGETS.FINANCE;
  }

  if (
    containsAny(text, [
      "loan readiness",
      "readiness plan",
      "readiness check",
      "readiness",
    ])
  ) {
    return GUIDANCE_TARGETS.LOAN_READINESS;
  }

  if (
    containsAny(text, [
      "loan suggestions",
      "guarantor suggestions",
      "fit suggestions",
      "suggestions",
    ])
  ) {
    return GUIDANCE_TARGETS.LOAN_SUGGESTIONS;
  }

  if (
    containsAny(text, [
      "loan workbench",
      "support workbench",
      "workbench",
    ])
  ) {
    return GUIDANCE_TARGETS.LOAN_WORKBENCH;
  }

  if (
    containsAny(text, [
      "incoming guarantor request",
      "guarantor request",
      "approve guarantor",
      "decline guarantor",
      "decision required",
      "respond now",
    ])
  ) {
    return GUIDANCE_TARGETS.NOTIFICATIONS;
  }

  if (
    containsAny(text, [
      "loan",
      "support path",
      "support request",
      "repay",
      "repayment",
      "borrower preflight",
      "active support item",
      "support-backed",
    ])
  ) {
    return GUIDANCE_TARGETS.LOANS;
  }

  if (
    containsAny(text, [
      "join request",
      "join approval",
      "approval vote",
      "member approval",
      "community approval",
      "pending approval",
      "activate membership",
      "activation",
    ])
  ) {
    return GUIDANCE_TARGETS.COMMUNITY;
  }

  if (
    containsAny(text, [
      "demand",
      "buyer need",
      "market need",
      "open need",
      "request for goods",
      "request for item",
      "sourcing",
    ])
  ) {
    return GUIDANCE_TARGETS.DEMAND_BOX;
  }

  if (
    containsAny(text, [
      "identity",
      "integrity",
      "cci",
      "cross-community",
    ])
  ) {
    return GUIDANCE_TARGETS.CCI;
  }

  if (containsAny(text, ["trust", "trust passport", "trust score"])) {
    return GUIDANCE_TARGETS.TRUST;
  }

  if (
    containsAny(text, [
      "community picture",
      "community profile",
      "marketplace profile",
    ])
  ) {
    return GUIDANCE_TARGETS.MARKETPLACE;
  }

  if (
    containsAny(text, [
      "community tools",
      "control room",
      "community home",
      "community workspace",
    ])
  ) {
    return GUIDANCE_TARGETS.COMMUNITY;
  }

  if (
    containsAny(text, [
      "marketplace",
      "shop gallery",
      "shop",
      "spotlight",
      "product",
      "seller",
      "repost",
    ])
  ) {
    return GUIDANCE_TARGETS.MARKETPLACE;
  }

  if (
    containsAny(text, [
      "settings",
      "preference",
      "notifications mode",
      "quiet notifications",
    ])
  ) {
    return GUIDANCE_TARGETS.SETTINGS;
  }

  if (containsAny(text, ["my gmfn and i", "guide"])) {
    return GUIDANCE_TARGETS.GUIDE;
  }

  if (
    containsAny(text, [
      "commitment builder",
      "focus commitment",
      "commitment checkpoint",
      "replan",
      "check in",
      "savings target",
      "repayment target",
      "business target",
      "retirement readiness",
      "follow-through",
    ])
  ) {
    return GUIDANCE_TARGETS.COMMITMENT_BUILDER;
  }

  if (containsAny(text, ["community"])) {
    return GUIDANCE_TARGETS.COMMUNITY;
  }

  return GUIDANCE_TARGETS.NOTIFICATIONS;
}

function normalizeNoticeCtaLabel(ctaTo: string, rawLabel: any): string {
  const direct = safeStr(rawLabel);
  const normalizedTarget = normalizeActionTargetPath(ctaTo);
  const targetPath = splitPathSuffix(normalizedTarget).path;
  const genericLabel =
    !direct ||
    /^(open|continue|review|view|open finances|view finances|open support|view support|deposit|deposit to pool|open deposit|make deposit|open payment)$/i.test(
      direct
    );

  if (normalizedTarget === GUIDANCE_TARGETS.COMMITMENT_BUILDER) {
    return "Open Focus Commitments";
  }

  if (targetPath === GUIDANCE_TARGETS.LOANS && (genericLabel || /finance/i.test(direct))) {
    return "Open Loans & Support";
  }

  if (targetPath === GUIDANCE_TARGETS.FINANCE && (genericLabel || /finance/i.test(direct))) {
    return "Open Finance File";
  }

  if (targetPath === GUIDANCE_TARGETS.MONEY_IN && genericLabel) {
    return "Open Money In";
  }

  if (targetPath === GUIDANCE_TARGETS.MONEY_OUT && genericLabel) {
    return "Open Money Out";
  }

  if (targetPath === GUIDANCE_TARGETS.DEMAND_BOX && genericLabel) {
    return "Open Demand Box";
  }

  if (/^\/app\/community\/[^/]+\/join-requests$/.test(targetPath) && genericLabel) {
    return "Review Join Request";
  }

  if (targetPath === "/activate-membership" && genericLabel) {
    return "Activate Membership";
  }

  if (/^\/join-approval\/[^/]+$/.test(targetPath) && genericLabel) {
    return "View Decision";
  }

  if (normalizedTarget === GUIDANCE_TARGETS.GUIDE) {
    if (
      !direct ||
      /^(open|continue|review first)$/i.test(direct) ||
      /my gmfn and i/i.test(direct)
    ) {
      return "Open My GSN and I";
    }
  }

  return direct || "Open";
}

function bucketFromNotification(raw: any): GuidanceInboxBucketKey {
  const text = [
    safeStr(raw?.kind),
    safeStr(raw?.title),
    safeStr(raw?.message),
    safeStr(raw?.detail),
  ]
    .join(" ")
    .toLowerCase();

  if (
    text.includes("community_confirmation.request_to_respond") ||
    text.includes("community_confirmation.outcome_updated") ||
    text.includes("community_confirmation.request_expired") ||
    text.includes("community confirmation request") ||
    text.includes("community confirmation updated") ||
    text.includes("community confirmation expired") ||
    text.includes("guarantor") ||
    text.includes("approve") ||
    text.includes("decline") ||
    text.includes("join request") ||
    text.includes("action required") ||
    text.includes("respond now")
  ) {
    return "actNow";
  }

  if (
    text.includes("due") ||
    text.includes("pending") ||
    text.includes("overdue") ||
    text.includes("late") ||
    text.includes("reminder") ||
    text.includes("complete") ||
    text.includes("follow up") ||
    text.includes("follow-up")
  ) {
    return "dueSoon";
  }

  if (
    text.includes("sent") ||
    text.includes("waiting") ||
    text.includes("processing") ||
    text.includes("received") ||
    text.includes("watch") ||
    text.includes("in review")
  ) {
    return "watchAndWait";
  }

  return "generalUpdates";
}

function normalizeNotificationNotice(raw: any): GuidanceNotice {
  const title = firstTruthy(raw?.title, raw?.kind, "Update");
  const detail = firstTruthy(
    raw?.message,
    raw?.detail,
    "Review this update and continue from the right page."
  );
  const kind = firstTruthy(raw?.kind, title);
  const bucket = bucketFromNotification(raw);
  const ctaTo = resolveNoticeTarget(raw);

  return {
    id: firstTruthy(raw?.id, raw?.notification_id, title, detail),
    kind,
    title,
    detail,
    ctaLabel: normalizeNoticeCtaLabel(ctaTo, raw?.action_label),
    ctaTo,
    bucket,
    unread: !raw?.is_read,
  };
}

function buildGuarantorInboxNotices(raw: any): GuidanceNotice[] {
  const rows = toArrayRows(raw);

  return rows.map((item: any, index: number) => {
    const loanId = positiveNumber(item?.loan_id);
    const pledge = safeStr(item?.pledge_amount);

    return {
      id: `guarantor-${loanId || index}-${index}`,
      kind: "loan-guarantor-request",
      title: loanId
        ? `Guarantor request waiting on loan #${loanId}`
        : "Guarantor request waiting",
      detail: pledge
        ? `A borrower is waiting for your decision on a pledge of ${pledge}.`
        : "A borrower is waiting for your decision.",
      ctaLabel: "Open Action Inbox",
      ctaTo: GUIDANCE_TARGETS.NOTIFICATIONS,
      bucket: "actNow",
      unread: true,
    };
  });
}

function buildIdentityEvidenceNotices(params: {
  rawTrustEvents: any;
  me: any | null;
  voice: GuidanceVoice;
}): GuidanceNotice[] {
  if (!params.me && toArrayRows(params.rawTrustEvents).length === 0) {
    return [];
  }

  const completion = buildIdentityEvidenceCompletionFromTrustEvents(
    params.rawTrustEvents,
    params.me
  );

  if (completion.score >= 80 && completion.primaryMissingKey !== "review") {
    return [];
  }

  const primary = completion.primaryMissingKey;
  const isRepair = primary === "review";
  const ctaTo =
    primary === "bank" ? GUIDANCE_TARGETS.PAYOUT_DETAILS : GUIDANCE_TARGETS.TRUST;
  const ctaLabel =
    primary === "bank"
      ? "Open payout details"
      : primary === "photo"
        ? "Review photo proof"
        : primary === "official_id"
          ? "Review ID proof"
          : "Open Trust Passport";
  const title = isRepair
    ? "Identity proof needs follow-up"
    : completion.score <= 35
      ? "Strengthen your identity evidence"
      : "Add the next identity proof";
  const detailLead =
    params.voice === "direct"
      ? `${completion.label}: ${completion.score}%.`
      : `${completion.label} so far: ${completion.score}%.`;

  return [
    {
      id: `identity-evidence-${primary || completion.status}-${completion.score}`,
      kind: "identity.evidence-completion",
      title,
      detail: `${detailLead} ${completion.next}`,
      ctaLabel,
      ctaTo,
      bucket: isRepair || completion.score < 55 ? "dueSoon" : "watchAndWait",
      unread: false,
    },
  ];
}

function sortNotices(rows: GuidanceNotice[]): GuidanceNotice[] {
  return [...rows].sort((a, b) => {
    const unreadA = a.unread ? 1 : 0;
    const unreadB = b.unread ? 1 : 0;
    return unreadB - unreadA;
  });
}

function classifyTrustEvent(raw: any): GuidanceTrustJourneyItem {
  const type = firstTruthy(raw?.event_type, raw?.kind, raw?.type);
  const label = firstTruthy(
    raw?.title,
    raw?.message,
    raw?.detail,
    raw?.description,
    type,
    "Trust event"
  );

  const text = [type, label].join(" ").toLowerCase();

  if (
    text.includes("paid") ||
    text.includes("repaid") ||
    text.includes("verified") ||
    text.includes("completed") ||
    text.includes("approved") ||
    text.includes("contributed") ||
    text.includes("delivered") ||
    text.includes("fulfilled") ||
    text.includes("successful")
  ) {
    return { label, category: "built" };
  }

  if (
    text.includes("responded") ||
    text.includes("active") ||
    text.includes("consistent") ||
    text.includes("participation") ||
    text.includes("updated") ||
    text.includes("maintained")
  ) {
    return { label, category: "protected" };
  }

  if (
    text.includes("late") ||
    text.includes("overdue") ||
    text.includes("default") ||
    text.includes("missed") ||
    text.includes("declined") ||
    text.includes("cancelled") ||
    text.includes("unpaid") ||
    text.includes("negative")
  ) {
    return { label, category: "weakened" };
  }

  if (
    text.includes("risk") ||
    text.includes("warning") ||
    text.includes("repair") ||
    text.includes("flag") ||
    text.includes("dispute") ||
    text.includes("attention")
  ) {
    return { label, category: "repair" };
  }

  return { label, category: "protected" };
}

function buildTrustJourneySummary(
  raw: any,
  voice: GuidanceVoice
): GuidanceTrustJourneySummary {
  const rows = toArrayRows(raw).map(classifyTrustEvent);

  let builtCount = 0;
  let protectedCount = 0;
  let weakenedCount = 0;
  let repairCount = 0;

  for (const item of rows) {
    if (item.category === "built") builtCount += 1;
    if (item.category === "protected") protectedCount += 1;
    if (item.category === "weakened") weakenedCount += 1;
    if (item.category === "repair") repairCount += 1;
  }

  let trend: GuidanceTrustJourneySummary["trend"] = "steady";
  if (weakenedCount + repairCount > builtCount + protectedCount) {
    trend = "weakened";
  } else if (builtCount + protectedCount > 0) {
    trend = "building";
  }

  let heading = "Your trust path is steady.";
  let detail =
    "Steady participation, prompt response, and disciplined follow-up protect tomorrow’s options.";

  if (trend === "building") {
    heading = pickVariant(
      voice === "warm"
        ? [
            "Your recent activity is strengthening trust.",
            "Your recent movement is helping your trust path grow.",
          ]
        : voice === "direct"
        ? [
            "Recent activity is building trust.",
            "Your visible conduct is improving trust strength.",
          ]
        : [
            "Your recent activity is building trust.",
            "Recent visible conduct is strengthening your trust path.",
          ],
      "journey-heading-building",
      builtCount,
      protectedCount,
      voice
    );

    detail = pickVariant(
      voice === "warm"
        ? [
            "You are giving the system more reasons to rely on your pattern.",
            "Recent visible consistency is helping your standing feel stronger.",
          ]
        : voice === "direct"
        ? [
            "Recent signals support stronger trust confidence.",
            "Visible consistency is improving your path.",
          ]
        : [
            "Recent signals suggest that visible participation and reliability are helping your trust path.",
            "Visible consistency and follow-through are supporting your current standing.",
          ],
      "journey-detail-building",
      builtCount,
      protectedCount,
      voice
    );
  }

  if (trend === "weakened") {
    heading = pickVariant(
      voice === "warm"
        ? [
            "A repair step is now important.",
            "Some recent signals suggest your trust path needs gentle correction.",
          ]
        : voice === "direct"
        ? [
            "A trust repair step is needed.",
            "Recent signals weakened your trust path.",
          ]
        : [
            "Recent signals suggest a trust repair step is needed.",
            "Your trust path is showing weakening signals that need attention.",
          ],
      "journey-heading-weakened",
      weakenedCount,
      repairCount,
      voice
    );

    detail = pickVariant(
      voice === "warm"
        ? [
            "This can still be repaired early with a clean visible step.",
            "A small repair now is better than carrying the slip forward.",
          ]
        : voice === "direct"
        ? [
            "Do the repair step now before the cost grows.",
            "Delay will increase the trust cost of this signal.",
          ]
        : [
            "A missed response, weak follow-up, or other caution signal may be weakening your path. A small repair step now protects tomorrow.",
            "A visible repair step now is the cleanest way to stop this signal from spreading.",
          ],
      "journey-detail-weakened",
      weakenedCount,
      repairCount,
      voice
    );
  }

  return {
    trend,
    heading,
    detail,
    builtCount,
    protectedCount,
    weakenedCount,
    repairCount,
    items: rows.slice(0, 6),
  };
}

function collectStringsFromValue(
  value: any,
  out: string[],
  seen: Set<string>,
  limit: number
) {
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
      collectStringsFromValue(item, out, seen, limit);
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
      collectStringsFromValue(candidate, out, seen, limit);
      if (out.length >= limit) return;
    }
  }
}

function extractTextsByKeyTokens(
  input: any,
  tokens: string[],
  limit = 4
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const seenNodes = new Set<any>();

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
        collectStringsFromValue(value, out, seen, limit);
      }

      if (typeof value === "object") {
        walk(value, depth + 1);
      }
    }
  }

  walk(input, 0);
  return out;
}

function buildTrustChangeExplainer(
  raw: any,
  journey: GuidanceTrustJourneySummary,
  voice: GuidanceVoice
): GuidanceTrustChangeExplainer {
  let helps = extractTextsByKeyTokens(raw, [
    "help",
    "positive",
    "improv",
    "support",
    "good",
    "build",
    "strength",
  ]);

  let weakens = extractTextsByKeyTokens(raw, [
    "weak",
    "negative",
    "risk",
    "reduce",
    "warning",
    "damage",
    "caution",
  ]);

  let next = extractTextsByKeyTokens(raw, [
    "next",
    "action",
    "repair",
    "improve",
    "step",
    "do",
    "what",
  ]);

  if (helps.length === 0 && journey.builtCount + journey.protectedCount > 0) {
    helps = [
      pickVariant(
        voice === "warm"
          ? [
              "Recent visible participation is helping your trust path.",
              "Steady follow-through is giving your trust path more strength.",
            ]
          : voice === "direct"
          ? [
              "Visible consistency is helping trust.",
              "Reliable participation is supporting your standing.",
            ]
          : [
              "Recent visible participation is helping your trust path.",
              "Consistent follow-through is strengthening your current standing.",
            ],
        "explainer-helps",
        journey.builtCount,
        journey.protectedCount,
        voice
      ),
    ];
  }

  if (weakens.length === 0 && journey.weakenedCount + journey.repairCount > 0) {
    weakens = [
      pickVariant(
        voice === "warm"
          ? [
              "A caution signal suggests that a repair step is needed.",
              "Something in the recent pattern is asking for a cleaner follow-up.",
            ]
          : voice === "direct"
          ? [
              "A weakening signal is active.",
              "A repair step is needed now.",
            ]
          : [
              "A caution signal suggests that a repair step is needed.",
              "A visible gap in follow-up may be weakening trust right now.",
            ],
        "explainer-weakens",
        journey.weakenedCount,
        journey.repairCount,
        voice
      ),
    ];
  }

  if (next.length === 0) {
    next = [
      pickVariant(
        weakens.length > 0
          ? voice === "warm"
            ? [
                "Take the next repair step early and keep it visible.",
                "Choose one repair step and complete it cleanly now.",
              ]
            : voice === "direct"
            ? [
                "Do the repair step now.",
                "Clear the trust gap before it spreads.",
              ]
            : [
                "Take the next repair step early and keep your response visible.",
                "Choose one repair step and complete it cleanly before it drifts.",
              ]
          : voice === "warm"
          ? [
              "Keep participation steady and respond promptly when action appears.",
              "Continue with one visible reliable step at a time.",
            ]
          : voice === "direct"
          ? [
              "Keep the next step clean and visible.",
              "Respond early and avoid drift.",
            ]
          : [
              "Keep participation steady and respond promptly when action appears.",
              "Continue with one visible, reliable step at a time.",
            ],
        "explainer-next",
        voice,
        weakens.length,
        helps.length
      ),
    ];
  }

  return {
    helps: helps.slice(0, 4),
    weakens: weakens.slice(0, 4),
    next: next.slice(0, 4),
  };
}

function buildRecoveryPath(params: {
  trustChangeExplainer: GuidanceTrustChangeExplainer;
  staleDemandCount: number;
  activeBorrowerLoan: any | null;
  voice: GuidanceVoice;
}): GuidanceAction | null {
  const { trustChangeExplainer, staleDemandCount, activeBorrowerLoan, voice } =
    params;

  if (trustChangeExplainer.weakens.length > 0) {
    return {
      kind: "trust-repair",
      title: pickVariant(
        voice === "warm"
          ? ["A trust repair step is now waiting.", "Let us repair this trust signal early."]
          : voice === "direct"
          ? ["Trust repair is needed now.", "Repair this trust signal now."]
          : ["A trust repair step is now open.", "A trust repair step is waiting."],
        "recovery-trust-title",
        voice
      ),
      detail:
        trustChangeExplainer.next[0] ||
        "A trust repair step is needed now. Review what weakened your trust path and fix the next visible issue.",
      ctaLabel: "Open Trust Passport",
      ctaTo: GUIDANCE_TARGETS.TRUST,
      severity: "important",
      todayText: pickVariant(
        voice === "warm"
          ? [
              "Review what weakened trust and answer it with one calm repair step.",
              "Choose the repair step now so this does not grow heavier tomorrow.",
            ]
          : voice === "direct"
          ? [
              "Do the repair step now.",
              "Fix the visible trust gap today.",
            ]
          : [
              "Review what weakened trust and act on the next repair step.",
              "Take the visible repair step today before the signal grows.",
            ],
        "recovery-trust-today",
        voice
      ),
      tomorrowText: pickVariant(
        voice === "warm"
          ? [
              "Early repair protects tomorrow’s standing and confidence.",
              "A small repair today makes tomorrow lighter.",
            ]
          : voice === "direct"
          ? [
              "Repair now to protect tomorrow’s standing.",
              "Delay will cost more tomorrow.",
            ]
          : [
              "Early repair protects tomorrow’s support and credit readiness.",
              "A visible repair today keeps tomorrow’s options cleaner.",
            ],
        "recovery-trust-tomorrow",
        voice
      ),
    };
  }

  if (staleDemandCount > 0) {
    return {
      kind: "stale-demand-repair",
      title:
        staleDemandCount === 1
          ? "One demand needs follow-up."
          : `${staleDemandCount} demands need follow-up.`,
      detail:
        staleDemandCount === 1
          ? "One open demand has gone stale and needs a follow-up, update, or close decision."
          : `${staleDemandCount} open demands have gone stale and need follow-up, update, or closure.`,
      ctaLabel: "Open Demand Box",
      ctaTo: GUIDANCE_TARGETS.DEMAND_BOX,
      severity: "important",
      todayText: pickVariant(
        voice === "warm"
          ? [
              "Review the stale demand and choose a clean next move.",
              "Update or close the stale demand so it does not drift.",
            ]
          : voice === "direct"
          ? [
              "Review the stale demand now.",
              "Update or close the stale demand today.",
            ]
          : [
              "Review the stale demand and choose the next clean action.",
              "Update or close the stale demand before it drifts further.",
            ],
        "recovery-demand-today",
        voice,
        staleDemandCount
      ),
      tomorrowText: pickVariant(
        voice === "warm"
          ? [
              "Demand follow-up protects credibility in the market.",
              "A clean demand path today keeps tomorrow lighter.",
            ]
          : voice === "direct"
          ? [
              "Demand follow-up protects credibility.",
              "Do not carry stale demand forward.",
            ]
          : [
              "Demand follow-up protects trade credibility and participation trust.",
              "A clean demand follow-up today protects tomorrow’s market confidence.",
            ],
        "recovery-demand-tomorrow",
        voice,
        staleDemandCount
      ),
    };
  }

  if (activeBorrowerLoan) {
    const status = safeStr(activeBorrowerLoan?.status || "open");

    return {
      kind: "loan-follow-up",
      title: pickVariant(
        voice === "warm"
          ? [
              "Your support path still needs attention.",
              "Let us keep your current support path moving cleanly.",
            ]
          : voice === "direct"
          ? [
              "Finish your current loan path.",
              "Your current support path is still active.",
            ]
          : [
              "Finish your current loan path.",
              "Your current support path is still active.",
            ],
        "recovery-loan-title",
        voice,
        status
      ),
      detail: `Your current borrower-side support path is still active with status '${status}'.`,
      ctaLabel: "Open Loans & Support",
      ctaTo: GUIDANCE_TARGETS.LOANS,
      severity: "important",
      todayText: pickVariant(
        voice === "warm"
          ? [
              "Review the support path and complete the next clean step.",
              "Choose the next valid step so the path keeps moving.",
            ]
          : voice === "direct"
          ? [
              "Review the support path now.",
              "Complete the next valid step today.",
            ]
          : [
              "Review the active support path and complete the next valid step.",
              "Keep the support path moving with one clean step today.",
            ],
        "recovery-loan-today",
        voice,
        status
      ),
      tomorrowText: pickVariant(
        voice === "warm"
          ? [
              "A clean support path protects future confidence.",
              "Steady loan follow-up today helps tomorrow’s readiness.",
            ]
          : voice === "direct"
          ? [
              "A disciplined loan path protects future readiness.",
              "Do not let the support path drift into tomorrow.",
            ]
          : [
              "A clean, visible loan path strengthens future trust and readiness.",
              "Steady support-path follow-up today protects tomorrow’s options.",
            ],
        "recovery-loan-tomorrow",
        voice,
        status
      ),
    };
  }

  return null;
}

function buildActionInboxSummary(params: {
  rawNotifications: any;
  rawGuarantorInbox: any;
  rawTrustEvents?: any;
  me?: any | null;
  voice?: GuidanceVoice;
}): GuidanceActionInboxSummary {
  const notificationRows = toArrayRows(params.rawNotifications).map(
    normalizeNotificationNotice
  );
  const guarantorRows = buildGuarantorInboxNotices(params.rawGuarantorInbox);
  const identityRows = buildIdentityEvidenceNotices({
    rawTrustEvents: params.rawTrustEvents,
    me: params.me || null,
    voice: params.voice || "balanced",
  });

  const all = sortNotices([
    ...guarantorRows,
    ...identityRows,
    ...notificationRows,
  ]);

  const actNow = all.filter((item) => item.bucket === "actNow");
  const dueSoon = all.filter((item) => item.bucket === "dueSoon");
  const watchAndWait = all.filter((item) => item.bucket === "watchAndWait");
  const generalUpdates = all.filter((item) => item.bucket === "generalUpdates");
  const unreadCount = all.filter((item) => item.unread).length;

  return {
    actNow,
    dueSoon,
    watchAndWait,
    generalUpdates,
    unreadCount,
  };
}

function buildNextBestStep(params: {
  actionInboxSummary: GuidanceActionInboxSummary;
  recoveryPath: GuidanceAction | null;
  activeBorrowerLoan: any | null;
  currentClan: any | null;
  openDemandCount: number;
  staleDemandCount: number;
  voice: GuidanceVoice;
}): GuidanceAction | null {
  const {
    actionInboxSummary,
    recoveryPath,
    activeBorrowerLoan,
    currentClan,
    openDemandCount,
    voice,
  } = params;

  if (actionInboxSummary.actNow.length > 0) {
    const first = actionInboxSummary.actNow[0];
    return {
      kind: first.kind,
      title: first.title,
      detail: first.detail,
      ctaLabel: first.ctaLabel,
      ctaTo: first.ctaTo,
      severity: "urgent",
      todayText: pickVariant(
        voice === "warm"
          ? [
              "Someone is waiting on you now. Clear this first.",
              "This is the cleanest place to start today.",
            ]
          : voice === "direct"
          ? [
              "Handle the waiting action now.",
              "This is the first task for today.",
            ]
          : [
              "Handle the waiting action now.",
              "This should be your first clear step today.",
            ],
        "next-act-now-today",
        voice,
        first.kind
      ),
      tomorrowText: pickVariant(
        voice === "warm"
          ? [
              "Prompt response protects trust and keeps tomorrow lighter.",
              "Clearing this now protects tomorrow’s movement.",
            ]
          : voice === "direct"
          ? [
              "Prompt response protects trust.",
              "Do not carry this waiting step into tomorrow.",
            ]
          : [
              "Prompt response protects trust and keeps support movement alive.",
              "A clear response now protects tomorrow’s movement and trust.",
            ],
        "next-act-now-tomorrow",
        voice,
        first.kind
      ),
    };
  }

  if (actionInboxSummary.dueSoon.length > 0) {
    const first = actionInboxSummary.dueSoon[0];
    return {
      kind: first.kind,
      title: first.title,
      detail: first.detail,
      ctaLabel: first.ctaLabel,
      ctaTo: first.ctaTo,
      severity: "important",
      todayText: pickVariant(
        voice === "warm"
          ? [
              "Complete the pending step before it grows heavier.",
              "This still has time, but early action is better.",
            ]
          : voice === "direct"
          ? [
              "Complete the pending step now.",
              "Do not let this due-soon item drift.",
            ]
          : [
              "Complete the pending step before it drifts.",
              "Handle this due-soon step while the repair cost is still small.",
            ],
        "next-due-soon-today",
        voice,
        first.kind
      ),
      tomorrowText: pickVariant(
        voice === "warm"
          ? [
              "A small follow-up today keeps tomorrow calmer.",
              "Finishing this today protects tomorrow’s confidence.",
            ]
          : voice === "direct"
          ? [
              "Small follow-up today prevents tomorrow’s drag.",
              "Handle it now while the cost is still low.",
            ]
          : [
              "Small follow-up today protects tomorrow’s options.",
              "A clean due-soon follow-up today prevents unnecessary pressure tomorrow.",
            ],
        "next-due-soon-tomorrow",
        voice,
        first.kind
      ),
    };
  }

  if (recoveryPath) {
    return recoveryPath;
  }

  if (activeBorrowerLoan) {
    return {
      kind: "loan-follow-up",
      title: pickVariant(
        voice === "warm"
          ? [
              "Let us keep your current support path moving.",
              "Your support path still needs one clear next step.",
            ]
          : voice === "direct"
          ? [
              "Continue your current support path.",
              "Your borrower-side loan path is still active.",
            ]
          : [
              "Continue your current support path.",
              "Your borrower-side loan path is still active.",
            ],
        "next-loan-title",
        voice
      ),
      detail:
        "Your borrower-side loan path is still active. Review the next valid step and keep it moving cleanly.",
      ctaLabel: "Open Loans & Support",
      ctaTo: GUIDANCE_TARGETS.LOANS,
      severity: "important",
      todayText: pickVariant(
        voice === "warm"
          ? [
              "Review the support path and choose the next clean step.",
              "Keep the active support path moving clearly today.",
            ]
          : voice === "direct"
          ? [
              "Review the support path now.",
              "Complete the next valid step today.",
            ]
          : [
              "Review the support path and complete the next clean step.",
              "Keep the active support path moving with one valid action today.",
            ],
        "next-loan-today",
        voice
      ),
      tomorrowText: pickVariant(
        voice === "warm"
          ? [
              "A clean support path today protects tomorrow’s readiness.",
              "Steady support follow-up keeps tomorrow lighter.",
            ]
          : voice === "direct"
          ? [
              "A disciplined support path protects readiness.",
              "Do not let the support path drift into tomorrow.",
            ]
          : [
              "A disciplined support path strengthens future readiness.",
              "A clean support path today protects tomorrow’s options.",
            ],
        "next-loan-tomorrow",
        voice
      ),
    };
  }

  if (currentClan && !hasCommunityPicture(currentClan)) {
    return {
      kind: "community-picture",
      title: pickVariant(
        voice === "warm"
          ? [
              "Your community identity still looks unfinished.",
              "Let us complete the visible community identity.",
            ]
          : voice === "direct"
          ? [
              "Add your community picture.",
              "Your community picture is still missing.",
            ]
          : [
              "Add your community picture.",
              "Your community identity still needs its visible picture.",
            ],
        "next-picture-title",
        voice
      ),
      detail:
        "Your selected community does not yet have a visible community picture in the marketplace identity block.",
      ctaLabel: "Open Marketplace",
      ctaTo: GUIDANCE_TARGETS.MARKETPLACE,
      severity: "normal",
      todayText: pickVariant(
        voice === "warm"
          ? [
              "Add the community picture to complete the visible identity.",
              "Finish the picture so the community surface feels whole.",
            ]
          : voice === "direct"
          ? [
              "Add the community picture today.",
              "Complete the visible identity now.",
            ]
          : [
              "Add the community picture to complete the visible identity.",
              "Finish the community picture so the marketplace identity is complete.",
            ],
        "next-picture-today",
        voice
      ),
      tomorrowText: pickVariant(
        voice === "warm"
          ? [
              "A clearer community identity helps people trust what they see.",
              "A finished identity today improves recognition tomorrow.",
            ]
          : voice === "direct"
          ? [
              "A finished identity improves confidence.",
              "Complete the identity layer early.",
            ]
          : [
              "A clear community identity improves confidence and recognition.",
              "A finished identity today helps tomorrow’s trust and clarity.",
            ],
        "next-picture-tomorrow",
        voice
      ),
    };
  }

  if (openDemandCount > 0) {
    return {
      kind: "demand-follow-up",
      title:
        openDemandCount === 1
          ? "One open demand may need follow-up."
          : `${openDemandCount} open demands may need follow-up.`,
      detail:
        openDemandCount === 1
          ? "You have one open demand that may need follow-up or closure."
          : `You have ${openDemandCount} open demands that may need follow-up or closure.`,
      ctaLabel: "Open Demand Box",
      ctaTo: GUIDANCE_TARGETS.DEMAND_BOX,
      severity: "normal",
      todayText: pickVariant(
        voice === "warm"
          ? [
              "Review the open demand and decide the next clean move.",
              "Update or close what no longer needs to stay open.",
            ]
          : voice === "direct"
          ? [
              "Review the open demand now.",
              "Update or close stale demand cleanly.",
            ]
          : [
              "Review the open demand and decide the next clean move.",
              "Update or close what no longer needs to remain open.",
            ],
        "next-demand-today",
        voice,
        openDemandCount
      ),
      tomorrowText: pickVariant(
        voice === "warm"
          ? [
              "Follow-up keeps trade requests credible.",
              "A clean demand path today makes tomorrow lighter.",
            ]
          : voice === "direct"
          ? [
              "Demand follow-up protects credibility.",
              "Do not let open demand drift without review.",
            ]
          : [
              "Follow-up keeps trade requests credible and useful.",
              "A clean demand path today protects tomorrow’s market confidence.",
            ],
        "next-demand-tomorrow",
        voice,
        openDemandCount
      ),
    };
  }

  return {
    kind: "steady-participation",
    title: pickVariant(
      voice === "warm"
        ? [
            "Your path is calm right now. Keep it steady.",
            "Nothing urgent is blocking you. Stay disciplined and visible.",
          ]
        : voice === "direct"
        ? [
            "Keep your path steady.",
            "No urgent block is active right now.",
          ]
        : [
            "Keep your path steady.",
            "No urgent step is blocking you right now.",
          ],
      "next-steady-title",
      voice
    ),
    detail:
      "No urgent step is blocking you right now. Review your current summaries and keep visible participation consistent.",
    ctaLabel: "Open Community Home",
    ctaTo: GUIDANCE_TARGETS.COMMUNITY,
    severity: "normal",
    todayText: pickVariant(
      voice === "warm"
        ? [
            "Review your current position calmly.",
            "Use today for one small trustworthy step.",
          ]
        : voice === "direct"
        ? [
            "Review the current position.",
            "Keep the next step clean and visible.",
          ]
        : [
            "Review your current position calmly.",
            "Use today for one clean, visible next step.",
          ],
      "next-steady-today",
      voice
    ),
    tomorrowText: pickVariant(
      voice === "warm"
        ? [
            "The point is not to collect goals. The point is to keep moving toward them.",
            "A calm day today makes tomorrow easier to carry.",
          ]
        : voice === "direct"
        ? [
            "Consistency today protects tomorrow.",
            "Stay visible and avoid drift.",
          ]
        : [
            "Small consistency today protects tomorrow’s access.",
            "Steady visible conduct today keeps tomorrow’s options cleaner.",
          ],
      "next-steady-tomorrow",
      voice
    ),
  };
}

function buildMarketWisdomCard(params: {
  dailyInsight: any;
  nextBestStep: GuidanceAction | null;
  recoveryPath: GuidanceAction | null;
  voice: GuidanceVoice;
}): GuidanceMarketWisdomCard {
  const externalText = firstTruthy(
    params.dailyInsight?.text,
    params.dailyInsight?.message,
    params.dailyInsight?.detail
  );

  if (externalText) {
    return {
      title: "Today’s Market Wisdom",
      text: externalText,
    };
  }

  const kind = safeStr(params.nextBestStep?.kind).toLowerCase();

  if (kind.includes("guarantor") || kind.includes("loan")) {
    return {
      title: "Today’s Market Wisdom",
      text: pickVariant(
        params.voice === "warm"
          ? [
              "Money moves more safely when response is prompt and visible.",
              "A clean support path is part of trust, not separate from it.",
            ]
          : params.voice === "direct"
          ? [
              "Prompt response is part of credit discipline.",
              "Clean support movement protects future access.",
            ]
          : [
              "Do not borrow for what will not return value. Prompt response is part of trust, even before money moves.",
              "A visible support path protects trust before money even starts moving.",
            ],
        "wisdom-loan",
        params.voice
      ),
    };
  }

  if (kind.includes("trust") || params.recoveryPath) {
    return {
      title: "Today’s Market Wisdom",
      text: pickVariant(
        params.voice === "warm"
          ? [
              "Early honesty repairs more trust than late explanation.",
              "A small repair step now can save a much larger explanation later.",
            ]
          : params.voice === "direct"
          ? [
              "Repair early. Delay makes the signal heavier.",
              "Visible correction is stronger than late regret.",
            ]
          : [
              "Early honesty repairs more trust than late explanation.",
              "Visible correction restores more confidence than hidden regret.",
            ],
        "wisdom-trust",
        params.voice
      ),
    };
  }

  if (kind.includes("demand")) {
    return {
      title: "Today’s Market Wisdom",
      text: pickVariant(
        params.voice === "warm"
          ? [
              "A need stays useful when it is followed up clearly.",
              "Demand gains value when the requester keeps it alive responsibly.",
            ]
          : params.voice === "direct"
          ? [
              "Unfollowed demand loses value.",
              "Demand needs follow-up to remain credible.",
            ]
          : [
              "A need without follow-up loses value. Visible follow-up keeps trade credible.",
              "Demand remains credible when it is updated, followed up, or closed cleanly.",
            ],
        "wisdom-demand",
        params.voice
      ),
    };
  }

  if (kind.includes("community-picture")) {
    return {
      title: "Today’s Market Wisdom",
      text: pickVariant(
        params.voice === "warm"
          ? [
              "A finished identity helps people trust what they are seeing.",
              "Clarity in the visible layer builds confidence quietly.",
            ]
          : params.voice === "direct"
          ? [
              "A finished identity earns more confidence than an unfinished one.",
              "Visibility without completion weakens confidence.",
            ]
          : [
              "A visible identity earns more confidence than an unfinished presence.",
              "A finished visible identity helps others decide faster and more safely.",
            ],
        "wisdom-picture",
        params.voice
      ),
    };
  }

  return {
    title: "Today’s Market Wisdom",
    text: pickVariant(
      params.voice === "warm"
        ? [
            "The point is not to collect goals. The point is to keep moving toward them.",
            "Calm visible follow-through is stronger than noise.",
          ]
        : params.voice === "direct"
        ? [
            "Commitment turns intention into dependable follow-through.",
            "One clean step repeated is stronger than scattered effort.",
          ]
        : [
            "GSN should not only record what happened. It should help steady what happens next.",
            "A clear next step repeated over time is stronger than many good intentions.",
          ],
      "wisdom-default",
      params.voice
    ),
  };
}

function buildWeeklyFocus(params: {
  nextBestStep: GuidanceAction | null;
  recoveryPath: GuidanceAction | null;
  openDemandCount: number;
  currentClan: any | null;
  voice: GuidanceVoice;
}): GuidanceWeeklyFocus | null {
  const nextKind = safeStr(params.nextBestStep?.kind).toLowerCase();

  if (nextKind.includes("guarantor")) {
    return {
      title: pickVariant(
        params.voice === "warm"
          ? ["Prompt response week", "Response discipline week"]
          : params.voice === "direct"
          ? ["Decision week", "Response discipline week"]
          : ["Prompt response week", "Response discipline week"],
        "weekly-guarantor-title",
        params.voice
      ),
      detail: pickVariant(
        params.voice === "warm"
          ? [
              "Respond early where people are waiting on you. Prompt response keeps the community lighter.",
              "A quick, clear decision this week protects trust for everyone involved.",
            ]
          : params.voice === "direct"
          ? [
              "Respond early where action is waiting.",
              "Do not let waiting decisions drift through the week.",
            ]
          : [
              "Respond early where people are waiting on you. Prompt response protects trust quickly.",
              "Decision discipline this week protects movement, trust, and community rhythm.",
            ],
        "weekly-guarantor-detail",
        params.voice
      ),
      ctaLabel: "Open Action Inbox",
      ctaTo: GUIDANCE_TARGETS.NOTIFICATIONS,
    };
  }

  if (params.recoveryPath) {
    return {
      title: pickVariant(
        params.voice === "warm"
          ? ["Trust repair week", "Repair and reset week"]
          : params.voice === "direct"
          ? ["Repair week", "Trust repair week"]
          : ["Trust repair week", "Repair and reset week"],
        "weekly-recovery-title",
        params.voice
      ),
      detail: pickVariant(
        params.voice === "warm"
          ? [
              "Choose one repair step and complete it cleanly instead of carrying the slip forward.",
              "This week is best used for one clear repair, not many partial promises.",
            ]
          : params.voice === "direct"
          ? [
              "Choose one repair step and finish it.",
              "Do not carry the trust gap into next week.",
            ]
          : [
              "Choose one repair step and complete it cleanly instead of carrying the slip forward.",
              "This week should be used to reduce repair pressure, not to postpone it.",
            ],
        "weekly-recovery-detail",
        params.voice
      ),
      ctaLabel: "Open Trust Passport",
      ctaTo: GUIDANCE_TARGETS.TRUST,
    };
  }

  if (nextKind.includes("loan")) {
    return {
      title: "Loan discipline week",
      detail: pickVariant(
        params.voice === "warm"
          ? [
              "Keep the support path clear, visible, and orderly all week.",
              "One careful next step at a time is enough this week.",
            ]
          : params.voice === "direct"
          ? [
              "Keep the support path clean and moving.",
              "Avoid drift and complete the next valid step.",
            ]
          : [
              "Keep the support path visible, complete the next valid step, and avoid drift.",
              "This week is for a disciplined, visible support path.",
            ],
        "weekly-loan-detail",
        params.voice
      ),
      ctaLabel: "Open Loans & Support",
      ctaTo: GUIDANCE_TARGETS.LOANS,
    };
  }

  if (params.currentClan && !hasCommunityPicture(params.currentClan)) {
    return {
      title: "Community readiness week",
      detail: pickVariant(
        params.voice === "warm"
          ? [
              "Complete the visible community identity so the surface feels whole.",
              "A finished community picture helps the space feel clear and trustworthy.",
            ]
          : params.voice === "direct"
          ? [
              "Complete the visible community identity.",
              "Finish the community picture this week.",
            ]
          : [
              "Complete the visible community identity by setting the community picture cleanly.",
              "A finished community identity this week improves confidence and recognition.",
            ],
        "weekly-picture-detail",
        params.voice
      ),
      ctaLabel: "Open Marketplace",
      ctaTo: GUIDANCE_TARGETS.MARKETPLACE,
    };
  }

  if (params.openDemandCount > 0) {
    return {
      title: "Demand follow-up week",
      detail: pickVariant(
        params.voice === "warm"
          ? [
              "Review open needs, update what changed, and close what no longer needs action.",
              "Use this week to keep demand clean, current, and credible.",
            ]
          : params.voice === "direct"
          ? [
              "Review, update, or close open demand.",
              "Do not leave demand open without review.",
            ]
          : [
              "Review open needs, update what changed, and close what no longer needs action.",
              "Demand follow-up this week protects trade clarity and credibility.",
            ],
        "weekly-demand-detail",
        params.voice,
        params.openDemandCount
      ),
      ctaLabel: "Open Demand Box",
      ctaTo: GUIDANCE_TARGETS.DEMAND_BOX,
    };
  }

  return {
    title: pickVariant(
      params.voice === "warm"
        ? ["Steady participation week", "Quiet strength week"]
        : params.voice === "direct"
        ? ["Steady week", "Consistency week"]
        : ["Steady participation week", "Consistency week"],
      "weekly-steady-title",
      params.voice
    ),
    detail: pickVariant(
      params.voice === "warm"
        ? [
            "Keep trust active through calm follow-up, visible activity, and one clean next step at a time.",
            "You do not need noise this week. You need visible consistency.",
          ]
        : params.voice === "direct"
        ? [
            "Keep participation visible and disciplined.",
            "Consistency this week is enough.",
          ]
        : [
            "Keep your trust path active through calm follow-up, visible activity, and prompt response where needed.",
            "This week is for visible consistency, not scattered effort.",
          ],
      "weekly-steady-detail",
      params.voice
    ),
    ctaLabel: "Open Community Home",
    ctaTo: GUIDANCE_TARGETS.COMMUNITY,
  };
}

export async function buildGuidanceSnapshot(): Promise<GuidanceSnapshot> {
  const selectedClanId = Number(getSelectedClanId() || 0);

  const [
    me,
    currentClan,
    notificationsRaw,
    guarantorInboxRaw,
    loansRaw,
    trustWhyRaw,
    trustEventsRaw,
    dailyInsight,
    myDemandsRaw,
    mySettingsRaw,
  ] = await Promise.all([
    getMe().catch(() => null),
    getCurrentClan().catch(() => null),
    getMyNotifications(60, false).catch(() => ({ items: [] })),
    getLoanGuarantorInbox({
      clan_id: selectedClanId || undefined,
      status: "pending",
      limit: 25,
    }).catch(() => ({ items: [] })),
    listMyLoans().catch(() => []),
    getTrustWhyMe().catch(() => null),
    listTrustEvents({
      clan_id: selectedClanId || undefined,
      limit: 80,
    }).catch(() => ({ items: [] })),
    getDailyInsight().catch(() => null),
    listMarketplaceRequests({
      clan_id: selectedClanId || undefined,
      mine_only: true,
      status: "open",
      limit: 25,
    }).catch(() => []),
    getMySettings().catch(() => null),
  ]);

  const voice = getGuidanceVoice(mySettingsRaw);

  const normalizedLoans = toArrayRows(loansRaw)
    .map(normalizeLoanRow)
    .filter(Boolean) as any[];

  const activeSupportItems = normalizedLoans.filter(isActiveLoan);
  const activeBorrowerLoan =
    activeSupportItems.find(isBorrowerLoan) || null;

  const myDemands = toArrayRows(myDemandsRaw);
  const staleDemandCount = myDemands.filter(
    (item: any) => daysSince(item?.created_at) >= 5
  ).length;

  const actionInboxSummary = buildActionInboxSummary({
    rawNotifications: notificationsRaw,
    rawGuarantorInbox: guarantorInboxRaw,
    rawTrustEvents: trustEventsRaw,
    me,
    voice,
  });

  const trustJourneySummary = buildTrustJourneySummary(trustEventsRaw, voice);
  const trustChangeExplainer = buildTrustChangeExplainer(
    trustWhyRaw,
    trustJourneySummary,
    voice
  );

  const recoveryPath = buildRecoveryPath({
    trustChangeExplainer,
    staleDemandCount,
    activeBorrowerLoan,
    voice,
  });

  const nextBestStep = buildNextBestStep({
    actionInboxSummary,
    recoveryPath,
    activeBorrowerLoan,
    currentClan,
    openDemandCount: myDemands.length,
    staleDemandCount,
    voice,
  });

  const todayTomorrow = nextBestStep
    ? {
        today:
          safeStr(nextBestStep.todayText) || "Complete the next right step now.",
        tomorrow:
          safeStr(nextBestStep.tomorrowText) ||
          "This protects tomorrow’s stability and access.",
      }
    : null;

  const marketWisdomCard = buildMarketWisdomCard({
    dailyInsight,
    nextBestStep,
    recoveryPath,
    voice,
  });

  const weeklyFocus = buildWeeklyFocus({
    nextBestStep,
    recoveryPath,
    openDemandCount: myDemands.length,
    currentClan,
    voice,
  });

  return {
    me,
    currentClan,
    nextBestStep,
    todayTomorrow,
    trustJourneySummary,
    trustChangeExplainer,
    marketWisdomCard,
    weeklyFocus,
    recoveryPath,
    actionInboxSummary,
    stats: {
      pendingGuarantorRequests: buildGuarantorInboxNotices(guarantorInboxRaw).length,
      unreadNotifications: actionInboxSummary.unreadCount,
      activeSupportItems: activeSupportItems.length,
      openDemandCount: myDemands.length,
    },
  };
}



