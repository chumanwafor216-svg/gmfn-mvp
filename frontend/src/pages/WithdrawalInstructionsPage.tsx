import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import PageTopNav from "../components/PageTopNav";
import { PrimaryButton, SecondaryButton, StableCtaLink, SubtleButton } from "../components/StableButton";
import { navigateWithOrigin } from "../lib/nav";
import * as api from "../lib/api";
import { communityIdFromSearch } from "../lib/communityRouteContext";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import {
  getCommunityMoneySurface,
  loadCommunityWithdrawalRoute,
  requestPoolWithdrawal,
  saveCommunitySettlementDestination,
  type CommunityMoneyRoute,
  type CommunityMoneySettlement,
  type CommunityMoneySurface,
  type CommunitySettlementDestination,
} from "../lib/communityMoney";

type NoticeTone = "success" | "error";

type CollapseState = {
  overview: boolean;
  request: boolean;
  destination: boolean;
  rail: boolean;
  result: boolean;
  routes: boolean;
};

type PersistedWithdrawalTask = {
  amountInput: string;
  noteInput: string;
  latestWithdrawalResult: any | null;
  handoffMode?: string;
  supportGap?: string;
  updatedAt?: string | null;
};

const WITHDRAWAL_UI_STORAGE_KEY = "gmfn.withdrawal.sections.v5";
const WITHDRAWAL_TASK_STORAGE_KEY_PREFIX = "gmfn.withdrawal.task.v5";

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

function parseMoneyNumber(value: any): number {
  const raw = safeStr(value).replace(/,/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(value: any): string {
  return parseMoneyNumber(value).toFixed(2);
}

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "Not stated";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function defaultDestination(): CommunitySettlementDestination {
  return {
    destinationName: "",
    bankName: "",
    accountNumber: "",
    phoneNumber: "",
    note: "",
  };
}

function apiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";

  return String(raw || "").trim().replace(/\/+$/, "");
}

function apiOrigin(): string {
  const base = apiBase();

  if (base.startsWith("http://") || base.startsWith("https://")) {
    try {
      const u = new URL(base);
      return `${u.protocol}//${u.host}`;
    } catch {
      return "";
    }
  }

  if (typeof window !== "undefined") {
    return String(window.location.origin || "").trim().replace(/\/+$/, "");
  }

  return "";
}

function resolveMediaUrl(src: string): string {
  const raw = safeStr(src);
  if (!raw) return "";

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:") ||
    raw.startsWith("blob:")
  ) {
    return raw;
  }

  const origin = apiOrigin();
  if (!origin) return raw;

  if (raw.startsWith("/")) return `${origin}${raw}`;
  return `${origin}/${raw.replace(/^\/+/, "")}`;
}

function buildHeaders(clanId?: number): Record<string, string> {
  const token =
    typeof (api as any).getAccessToken === "function"
      ? safeStr((api as any).getAccessToken())
      : "";

  const headers: Record<string, string> = {
    accept: "application/json",
  };

  if (clanId && Number.isFinite(Number(clanId)) && Number(clanId) > 0) {
    headers["X-Clan-Id"] = String(clanId);
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function fetchJson(path: string, clanId?: number): Promise<any | null> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: "GET",
    headers: buildHeaders(clanId),
    credentials: "include",
  });

  const text = await res.text();
  let payload: any = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!res.ok) {
    throw new Error(
      safeStr(payload?.detail) ||
        safeStr(payload?.message) ||
        `Request failed (${res.status})`
    );
  }

  return payload;
}

function extractRecommendation(raw: any): string {
  return firstTruthy(
    raw?.recommendation,
    raw?.readiness?.recommendation,
    raw?.decision?.recommendation
  );
}

function extractReasons(raw: any): string[] {
  const candidates = [
    raw?.reasons,
    raw?.readiness?.reasons,
    raw?.decision?.reasons,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.map((item) => safeStr(item)).filter(Boolean);
    }
  }

  return [];
}

function extractGuarantorCount(raw: any): number {
  const candidates = [
    raw?.guarantors_required,
    raw?.required_guarantors,
    raw?.coverage?.guarantors_required,
    raw?.decision?.guarantors_required,
    raw?.readiness?.guarantors_required,
  ];

  for (const candidate of candidates) {
    const n = Number(candidate);
    if (Number.isFinite(n) && n > 0) return n;
  }

  return 0;
}

function extractSuggestedSafeAmount(raw: any): string {
  return firstTruthy(
    raw?.suggested_safe_amount,
    raw?.coverage?.suggested_safe_amount,
    raw?.readiness?.coverage?.suggested_safe_amount
  );
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(123,161,204,0.20)",
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, rgba(8,17,31,0.98) 0%, rgba(11,31,51,0.97) 56%, rgba(23,54,84,0.95) 100%)"
        : bg,
    padding: 20,
    boxShadow:
      "0 22px 48px rgba(2,6,23,0.22), 0 6px 14px rgba(15,23,42,0.05)",
    overflow: "hidden",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(123,161,204,0.16)",
    background:
      bg === "#F8FBFF" || bg === "#FFFFFF"
        ? "linear-gradient(180deg, rgba(13,28,45,0.96) 0%, rgba(18,40,64,0.94) 100%)"
        : bg,
    padding: 16,
    boxShadow:
      "0 14px 30px rgba(2,6,23,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(123,161,204,0.14)",
    background:
      bg === "#FFFFFF" || bg === "#F8FBFF"
        ? "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)"
        : bg,
    padding: 14,
    boxShadow:
      "0 14px 28px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function statTile(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(123,161,204,0.14)",
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)"
        : bg,
    padding: 14,
    boxShadow:
      "0 14px 28px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#9CB4CF",
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
    background: primary ? "rgba(32,76,133,0.36)" : "rgba(255,255,255,0.08)",
    border: primary
      ? "1px solid rgba(123,161,204,0.24)"
      : "1px solid rgba(123,161,204,0.14)",
    color: primary ? "#CFE3FF" : "#E6EEF8",
    fontSize: 12,
    fontWeight: 1000,
    whiteSpace: "normal",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function moneyOutActionButtonStyle(
  kind: "primary" | "secondary" | "soft" = "secondary",
  disabled = false
): React.CSSProperties {
  if (kind === "primary") {
    return {
      borderRadius: 15,
      border: disabled
        ? "1px solid rgba(148,163,184,0.24)"
        : "1px solid rgba(18,77,176,0.22)",
      background: disabled
        ? "linear-gradient(180deg, #D5DEE8 0%, #C6D1DD 100%)"
        : "linear-gradient(180deg, #255FCE 0%, #1B4FBF 100%)",
      color: "#FFFFFF",
      boxShadow: disabled
        ? "none"
        : "0 18px 34px rgba(19,79,191,0.24), inset 0 1px 0 rgba(255,255,255,0.18)",
      fontWeight: 1000,
      fontSize: 14,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.86 : 1,
    };
  }

  if (kind === "soft") {
    return {
      borderRadius: 13,
      border: "1px solid rgba(121,149,190,0.20)",
      background:
        "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
      color: disabled ? "#94A3B8" : "#E6EEF8",
      boxShadow: disabled
        ? "none"
        : "0 12px 24px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
      fontWeight: 900,
      fontSize: 13,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.86 : 1,
    };
  }

  return {
    borderRadius: 15,
    border: "1px solid rgba(121,149,190,0.20)",
    background:
      "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
    color: disabled ? "#94A3B8" : "#E6EEF8",
    boxShadow: disabled
      ? "none"
      : "0 14px 28px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
    fontWeight: 900,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.86 : 1,
  };
}

function moneyOutCollapseButtonStyle(): React.CSSProperties {
  return {
    borderRadius: 13,
    border: "1px solid rgba(121,149,190,0.20)",
    background:
      "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
    color: "#E6EEF8",
    boxShadow:
      "0 12px 24px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
    fontWeight: 900,
    fontSize: 13,
    cursor: "pointer",
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 46,
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.12)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #F9FCFF 100%)",
    padding: "11px 12px",
    fontSize: 14,
    color: "#0B1F33",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.52), 0 12px 24px rgba(15,23,42,0.05)",
    outline: "none",
    boxSizing: "border-box",
  };
}

function textAreaStyle(): React.CSSProperties {
  return {
    ...inputStyle(),
    minHeight: 100,
    resize: "vertical",
    lineHeight: 1.6,
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#C8D8EA",
    fontSize: 14.5,
    lineHeight: 1.75,
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
    overview: false,
    request: false,
    destination: false,
    rail: false,
    result: false,
    routes: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    overview: Boolean(raw?.overview ?? base.overview),
    request: Boolean(raw?.request ?? base.request),
    destination: Boolean(raw?.destination ?? base.destination),
    rail: Boolean(raw?.rail ?? base.rail),
    result: Boolean(raw?.result ?? base.result),
    routes: Boolean(raw?.routes ?? base.routes),
  };
}

function copyText(text: string) {
  const value = safeStr(text);
  if (!value) return;

  api.safeCopy(value);
}

function withdrawalTaskStorageKey(clanId: number, gmfnId: string): string {
  return `${WITHDRAWAL_TASK_STORAGE_KEY_PREFIX}.${gmfnId || "me"}.${clanId || 0}`;
}

function settlementLines(settlement: CommunityMoneySettlement | null): string[] {
  if (!settlement) return [];

  return [
    settlement.railName ? `Rail: ${settlement.railName}` : "",
    settlement.bankName ? `Bank: ${settlement.bankName}` : "",
    settlement.accountName ? `Account name: ${settlement.accountName}` : "",
    settlement.accountNumber ? `Account number: ${settlement.accountNumber}` : "",
    settlement.sortCode ? `Sort code: ${settlement.sortCode}` : "",
    settlement.country ? `Country: ${settlement.country}` : "",
    settlement.supportNote ? settlement.supportNote : "",
  ].filter(Boolean);
}

function splitRouteLines(route: CommunityMoneyRoute | null): string[] {
  if (!route) return [];

  return safeStr(route.detail)
    .split("\n")
    .map((line) => safeStr(line))
    .filter(Boolean);
}

function destinationReady(destination: CommunitySettlementDestination): boolean {
  return Boolean(
    safeStr(destination.destinationName) &&
      safeStr(destination.bankName) &&
      safeStr(destination.accountNumber)
  );
}

function communityName(currentClan: any, clanId: number): string {
  return (
    firstTruthy(
      currentClan?.marketplace_name,
      currentClan?.name,
      currentClan?.display_name,
      currentClan?.title
    ) || (clanId ? `Community ${clanId}` : "No current community")
  );
}

function communityPublicId(currentClan: any): string {
  return (
    firstTruthy(
      currentClan?.community_code,
      currentClan?.community?.community_code,
      currentClan?.profile?.community_code,
      currentClan?.marketplace?.community_code
    ) || "Awaiting issue"
  );
}

function communityRole(currentClan: any): string {
  return (
    firstTruthy(
      currentClan?.role,
      currentClan?.member_role,
      currentClan?.membership_role,
      currentClan?.participant_role
    ) || ""
  );
}

function communityImageSrc(currentClan: any): string {
  const raw = firstTruthy(
    currentClan?.community_image_url,
    currentClan?.profile_image_url,
    currentClan?.marketplace_image_url,
    currentClan?.cover_image_url,
    currentClan?.banner_url,
    currentClan?.image_url,
    currentClan?.logo_url,
    currentClan?.community?.community_image_url,
    currentClan?.community?.image_url,
    currentClan?.profile?.profile_image_url
  );

  return resolveMediaUrl(raw);
}

function routeTarget(
  intent: CtaIntent,
  communityId: number,
  debugId: string
): string {
  return String(resolveCtaTarget(intent, { communityId, debugId }).to);
}

export default function WithdrawalInstructionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeClanId = useMemo(
    () => communityIdFromSearch(location.search),
    [location.search]
  );
  const selectedClanId =
    routeClanId || Number((api as any).getSelectedClanId?.() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "money-out.nav.dashboard"),
      marketplace: routeTarget("marketplace", selectedClanId, "money-out.nav.marketplace"),
      finance: routeTarget("finance", selectedClanId, "money-out.route.finance"),
      payoutDetails: routeTarget(
        "payoutDetails",
        selectedClanId,
        "money-out.route.payout-details"
      ),
      paymentRails: routeTarget(
        "paymentRails",
        selectedClanId,
        "money-out.route.payment-rails"
      ),
      loanReadiness: routeTarget(
        "loanReadiness",
        selectedClanId,
        "money-out.route.readiness"
      ),
      loanSuggestions: routeTarget(
        "loanSuggestions",
        selectedClanId,
        "money-out.route.suggestions"
      ),
      loanWorkbench: routeTarget(
        "loanWorkbench",
        selectedClanId,
        "money-out.route.workbench"
      ),
      loans: routeTarget("loans", selectedClanId, "money-out.route.loans"),
      notifications: routeTarget(
        "notifications",
        selectedClanId,
        "money-out.route.notifications"
      ),
    }),
    [selectedClanId]
  );

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(WITHDRAWAL_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [savingDestination, setSavingDestination] = useState(false);
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);

  const [notice, setNotice] = useState<{
    tone: NoticeTone;
    text: string;
  } | null>(null);

  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [moneySurface, setMoneySurface] = useState<CommunityMoneySurface | null>(
    null
  );
  const [withdrawalRoute, setWithdrawalRoute] = useState<CommunityMoneyRoute | null>(
    null
  );
  const [destination, setDestination] = useState<CommunitySettlementDestination>(
    defaultDestination()
  );

  const [amountInput, setAmountInput] = useState("");
  const [noteInput, setNoteInput] = useState("");

  useEffect(() => {
    if (routeClanId > 0) {
      (api as any).setSelectedClanId?.(routeClanId);
    }
  }, [routeClanId]);
  const [latestWithdrawalResult, setLatestWithdrawalResult] = useState<any | null>(
    null
  );

  const [readinessPlan, setReadinessPlan] = useState<any>(null);
  const [borrowerPreflight, setBorrowerPreflight] = useState<any>(null);

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
    writeLocalJSON(WITHDRAWAL_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [notice]);

  const loadPage = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);

    try {
      const meRes =
        typeof (api as any).getMe === "function"
          ? await (api as any).getMe().catch(() => null)
          : null;

      const clanRes =
        typeof (api as any).getCurrentClan === "function"
          ? await (api as any).getCurrentClan().catch(() => null)
          : null;

      setMe(meRes || null);
      setCurrentClan(clanRes || null);

      const resolvedGmfnId = firstTruthy(meRes?.gmfn_id);

      if (selectedClanId && resolvedGmfnId) {
        const [surface, readinessRes, preflightRes] = await Promise.all([
          getCommunityMoneySurface(selectedClanId, resolvedGmfnId, "NGN").catch(
            () => null
          ),
          fetchJson("/loans/readiness/plan", selectedClanId).catch(() => null),
          fetchJson("/loans/borrower/preflight", selectedClanId).catch(() => null),
        ]);

        setMoneySurface(surface);
        setWithdrawalRoute(surface?.withdrawalRoute || null);
        setDestination(surface?.payoutDestination || defaultDestination());
        setReadinessPlan(readinessRes);
        setBorrowerPreflight(preflightRes);
      } else {
        setMoneySurface(null);
        setWithdrawalRoute(null);
        setDestination(defaultDestination());
        setReadinessPlan(null);
        setBorrowerPreflight(null);
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [selectedClanId]);

  useEffect(() => {
    void loadPage();
  }, [loadPage, selectedClanId]);

  const memberName = useMemo(() => {
    return (
      firstTruthy(
        me?.display_name,
        me?.nickname,
        me?.name,
        me?.first_name,
        me?.email
      ) || "Member"
    );
  }, [me]);

  const currentGmfnId = useMemo(() => {
    return firstTruthy(me?.gmfn_id);
  }, [me]);

  useEffect(() => {
    if (!selectedClanId || !currentGmfnId) {
      setAmountInput("");
      setNoteInput("");
      setLatestWithdrawalResult(null);
      return;
    }

    const stored = readLocalJSON<PersistedWithdrawalTask | null>(
      withdrawalTaskStorageKey(selectedClanId, currentGmfnId),
      null
    );

    if (!stored) {
      setAmountInput("");
      setNoteInput("");
      setLatestWithdrawalResult(null);
      return;
    }

    setAmountInput(safeStr(stored.amountInput));
    setNoteInput(safeStr(stored.noteInput));
    setLatestWithdrawalResult(stored.latestWithdrawalResult || null);
  }, [selectedClanId, currentGmfnId]);

  const communityLabel = useMemo(() => {
    return communityName(currentClan, selectedClanId);
  }, [currentClan, selectedClanId]);

  const publicCommunityId = useMemo(() => {
    return communityPublicId(currentClan);
  }, [currentClan]);

  const memberRole = useMemo(() => {
    return communityRole(currentClan);
  }, [currentClan]);

  const pictureSrc = useMemo(() => {
    return communityImageSrc(currentClan);
  }, [currentClan]);

  const poolCurrency = safeStr(moneySurface?.poolCurrency || "NGN");
  const effectiveAvailableText = safeStr(moneySurface?.effectiveAvailable || "");
  const pendingWithdrawalsText = safeStr(moneySurface?.pendingWithdrawals || "");
  const effectiveAvailableKnown = Boolean(effectiveAvailableText);

  const requestedAmount = parseMoneyNumber(amountInput);
  const effectiveAvailableNumber = effectiveAvailableKnown
    ? parseMoneyNumber(effectiveAvailableText)
    : 0;
  const requiresSupport =
    effectiveAvailableKnown && requestedAmount > effectiveAvailableNumber;
  const supportGap = effectiveAvailableKnown
    ? Math.max(requestedAmount - effectiveAvailableNumber, 0)
    : 0;

  const activeWithdrawalRoute =
    withdrawalRoute || moneySurface?.withdrawalRoute || null;

  const communitySettlement =
    activeWithdrawalRoute?.settlement || moneySurface?.communitySettlement || null;

  const communityRailReady = Boolean(
    communitySettlement?.bankName ||
      communitySettlement?.accountName ||
      communitySettlement?.accountNumber
  );

  const payoutReady = destinationReady(destination);

  const readinessRecommendation = extractRecommendation(readinessPlan);
  const readinessReasons = extractReasons(readinessPlan);
  const preflightReasons = extractReasons(borrowerPreflight);
  const suggestedSafeAmount = extractSuggestedSafeAmount(readinessPlan);
  const suggestedGuarantorCount =
    extractGuarantorCount(readinessPlan) || extractGuarantorCount(borrowerPreflight);

  const settlementRouteLines = useMemo(
    () => splitRouteLines(activeWithdrawalRoute),
    [activeWithdrawalRoute]
  );

  const communitySettlementLines = useMemo(
    () => settlementLines(communitySettlement),
    [communitySettlement]
  );

  const guidedState = useMemo(() => {
    if (!selectedClanId || !currentGmfnId) {
      return {
        tone: "red" as const,
        step: "Context",
        title: "Community or member identity is not ready.",
        detail:
          "Keep the correct community active before continuing with withdrawal.",
      };
    }

    if (requestedAmount <= 0) {
      return {
        tone: "blue" as const,
        step: "Amount",
        title: "Enter how much you want to withdraw.",
        detail:
          "The amount leads the decision. It determines whether this remains a direct withdrawal or becomes support-backed.",
      };
    }

    if (!effectiveAvailableKnown) {
      return {
        tone: "blue" as const,
        step: "Reading",
        title: "Waiting for the effective-available pool reading.",
        detail:
          "This withdrawal cannot be classified as direct or support-backed until the effective-available reading is visible.",
      };
    }

    if (!communityRailReady) {
      return {
        tone: "red" as const,
        step: "Rail",
        title: "Community money-out rail is not ready.",
        detail:
          "The community withdrawal rail must be visible and ready before the flow proceeds.",
      };
    }

    if (!payoutReady) {
      return {
        tone: "gold" as const,
        step: "Destination",
        title: "Complete your personal payout account first.",
        detail:
          "Withdrawal needs your personal payout destination. That is different from the fixed community account.",
      };
    }

    if (!requiresSupport) {
      return {
        tone: "green" as const,
        step: "Direct withdrawal",
        title: "This withdrawal fits inside your effective available pool.",
        detail:
          "No guarantor is required. You can proceed with direct withdrawal through your current community rail.",
      };
    }

    return {
      tone: "gold" as const,
      step: "Support-backed continuation",
      title: "This withdrawal becomes support-backed.",
      detail:
        "The requested amount is above your effective available pool. The support flow should now continue until the support decision is resolved.",
    };
  }, [
    selectedClanId,
    currentGmfnId,
    requestedAmount,
    effectiveAvailableKnown,
    communityRailReady,
    payoutReady,
    requiresSupport,
  ]);

  const guideTone =
    guidedState.tone === "green"
      ? {
          bg: "#F3FBF5",
          border: "1px solid rgba(34,197,94,0.16)",
          text: "#166534",
        }
      : guidedState.tone === "gold"
      ? {
          bg: "#FFFBEF",
          border: "1px solid rgba(245,158,11,0.16)",
          text: "#92400E",
        }
      : guidedState.tone === "red"
      ? {
          bg: "#FFF5F5",
          border: "1px solid rgba(239,68,68,0.16)",
          text: "#991B1B",
        }
      : {
          bg: "#F8FBFF",
          border: "1px solid rgba(11,99,209,0.12)",
          text: "#0B63D1",
        };

  const withdrawalCanWidenRoutes =
    effectiveAvailableKnown && (!requiresSupport ? Boolean(latestWithdrawalResult) : false);

  useEffect(() => {
    if (!selectedClanId || !currentGmfnId) return;

    const payload: PersistedWithdrawalTask = {
      amountInput,
      noteInput,
      latestWithdrawalResult,
      handoffMode:
        requestedAmount > 0 && requiresSupport ? "withdrawal-support" : "",
      supportGap:
        requestedAmount > 0 && effectiveAvailableKnown && requiresSupport
          ? fmtMoney(supportGap)
          : "",
      updatedAt: new Date().toISOString(),
    };

    writeLocalJSON(withdrawalTaskStorageKey(selectedClanId, currentGmfnId), payload);
  }, [
    selectedClanId,
    currentGmfnId,
    amountInput,
    noteInput,
    latestWithdrawalResult,
    requestedAmount,
    requiresSupport,
    supportGap,
    effectiveAvailableKnown,
  ]);

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function persistSupportHandoff() {
    if (!selectedClanId || !currentGmfnId) return;

    const payload: PersistedWithdrawalTask = {
      amountInput,
      noteInput,
      latestWithdrawalResult,
      handoffMode: "withdrawal-support",
      supportGap: effectiveAvailableKnown ? fmtMoney(supportGap) : "",
      updatedAt: new Date().toISOString(),
    };

    writeLocalJSON(withdrawalTaskStorageKey(selectedClanId, currentGmfnId), payload);
  }

  async function handleLoadWithdrawalRoute() {
    if (!selectedClanId || !currentGmfnId) {
      showNotice("error", "Community or GSN ID is not visible yet.");
      return;
    }

    setLoadingRoute(true);

    try {
      const route = await loadCommunityWithdrawalRoute(
        selectedClanId,
        currentGmfnId,
        { currency: poolCurrency }
      ).catch(() => null);

      if (route) {
        setWithdrawalRoute(route);
        setMoneySurface((prev) =>
          prev
            ? {
                ...prev,
                withdrawalRoute: route,
                communitySettlement: route.settlement || prev.communitySettlement,
              }
            : prev
        );
        showNotice("success", "Community withdrawal rail loaded.");
      } else {
        showNotice("error", "Community withdrawal rail has not returned yet.");
      }
    } finally {
      setLoadingRoute(false);
    }
  }

  async function handleSaveDestination() {
    if (!selectedClanId || !currentGmfnId) {
      showNotice("error", "Community or GSN ID is not visible yet.");
      return;
    }

    setSavingDestination(true);

    try {
      const saved = await saveCommunitySettlementDestination(
        selectedClanId,
        currentGmfnId,
        destination
      );

      setDestination(saved);
      setMoneySurface((prev) =>
        prev
          ? {
              ...prev,
              payoutDestination: saved,
              settlementDestination: saved,
            }
          : prev
      );

      showNotice("success", "Personal payout account saved.");
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) ||
          "Personal payout account could not be saved right now."
      );
    } finally {
      setSavingDestination(false);
    }
  }

  async function handleDirectWithdrawal() {
    if (!selectedClanId) {
      showNotice("error", "Select a community first.");
      return;
    }

    if (requestedAmount <= 0) {
      showNotice("error", "Enter a valid amount.");
      return;
    }

    if (!effectiveAvailableKnown) {
      showNotice("error", "Wait for the effective-available pool reading first.");
      return;
    }

    if (!communityRailReady) {
      showNotice("error", "Community withdrawal rail is not ready.");
      return;
    }

    if (!payoutReady) {
      showNotice("error", "Complete your personal payout account first.");
      return;
    }

    if (requiresSupport) {
      showNotice(
        "error",
        "This withdrawal requires support continuation instead of direct submission."
      );
      return;
    }

    setSubmittingWithdrawal(true);

    try {
      const res = await requestPoolWithdrawal({
        clanId: selectedClanId,
        amount: fmtMoney(requestedAmount),
        currency: poolCurrency,
        note: safeStr(noteInput || "Direct withdrawal request"),
      });

      if (!res) {
        showNotice("error", "Withdrawal request could not be submitted.");
        return;
      }

      setLatestWithdrawalResult(res);
      await loadPage(false);

      showNotice(
        "success",
        "Direct withdrawal request submitted. It is waiting for community confirmation before money movement is complete."
      );
    } finally {
      setSubmittingWithdrawal(false);
    }
  }

  function handleContinueToSupportPath() {
    if (requestedAmount <= 0) {
      showNotice("error", "Enter a valid amount first.");
      return;
    }

    if (!effectiveAvailableKnown) {
      showNotice("error", "Wait for the effective-available pool reading first.");
      return;
    }

    if (!communityRailReady) {
      showNotice("error", "Community withdrawal rail is not ready.");
      return;
    }

    if (!payoutReady) {
      showNotice("error", "Complete your personal payout account first.");
      return;
    }

    if (!requiresSupport) {
      showNotice("error", "This amount still fits direct withdrawal.");
      return;
    }

    persistSupportHandoff();

    navigateWithOrigin(navigate, routes.loanReadiness, location);
  }

  async function handleRefresh() {
    setRefreshing(true);

    try {
      await loadPage(false);
      showNotice("success", "Withdrawal page refreshed.");
    } catch {
      showNotice("error", "Withdrawal page could not be refreshed.");
    } finally {
      setRefreshing(false);
    }
  }

  function handleCopyCommunityRail() {
    const text = communitySettlementLines.join("\n");
    if (!text) {
      showNotice("error", "Community withdrawal rail is not ready.");
      return;
    }

    copyText(text);
    showNotice("success", "Community withdrawal rail copied.");
  }

  function handleCopyPayoutAccount() {
    const text = [
      destination.destinationName
        ? `Account name: ${destination.destinationName}`
        : "",
      destination.bankName ? `Bank: ${destination.bankName}` : "",
      destination.accountNumber
        ? `Account number: ${destination.accountNumber}`
        : "",
      destination.phoneNumber ? `Phone: ${destination.phoneNumber}` : "",
      destination.note ? `Note: ${destination.note}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    if (!text) {
      showNotice("error", "Personal payout account is still empty.");
      return;
    }

    copyText(text);
    showNotice("success", "Personal payout account copied.");
  }

  function handleCopyWithdrawalSummary() {
    const text = [
      `Community: ${communityLabel}`,
      `Community ID: ${publicCommunityId}`,
      `GSN ID: ${currentGmfnId || "Awaiting issue"}`,
      `Member: ${memberName}`,
      memberRole ? `Role: ${memberRole}` : "",
      `Current stage: ${guidedState.step}`,
      requestedAmount > 0
        ? `Requested amount: ${fmtMoney(requestedAmount)} ${poolCurrency}`
        : "",
      `Effective available: ${
        effectiveAvailableKnown ? `${effectiveAvailableText} ${poolCurrency}` : "Awaiting pool reading"
      }`,
      !effectiveAvailableKnown
        ? "Support gap: Awaiting calculation"
        : requiresSupport
        ? `Support gap: ${fmtMoney(supportGap)} ${poolCurrency}`
        : "Direct withdrawal available",
      destination.destinationName
        ? `Payout account: ${destination.destinationName}`
        : "",
      communitySettlement?.bankName
        ? `Community rail: ${communitySettlement.bankName}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    if (!text) {
      showNotice("error", "Nothing is ready to copy yet.");
      return;
    }

    copyText(text);
    showNotice("success", "Withdrawal summary copied.");
  }

  function handleResetTask() {
    setAmountInput("");
    setNoteInput("");
    setLatestWithdrawalResult(null);
    showNotice("success", "Withdrawal task reset.");
  }

  const requestedAmountDisplay =
    requestedAmount > 0 ? `${fmtMoney(requestedAmount)} ${poolCurrency}` : "Awaiting amount";
  const effectiveAvailableDisplay = effectiveAvailableKnown
    ? `${effectiveAvailableText} ${poolCurrency}`
    : "Awaiting pool reading";
  const pendingWithdrawalsDisplay = pendingWithdrawalsText
    ? `${pendingWithdrawalsText} ${poolCurrency}`
    : "Awaiting pool reading";

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
          sectionLabel="Money Out"
          title="Guided Withdrawal"
          subtitle="Loading the withdrawal flow..."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.marketplace}
          backLabel="Marketplace"
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading withdrawal page...
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
        sectionLabel="Money Out"
        title="Guided Withdrawal"
        subtitle="Money Out stays guided from beginning to outcome. The community rail stays fixed, the personal payout destination stays explicit, and support takes over only when the amount goes above the effective available position."
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.marketplace}
        backLabel="Marketplace"
      />

      <ExplainToggle
        label="What this screen does"
        what="Money Out guides one withdrawal route from request through destination, rail review, decision logic, and final execution."
        why="Withdrawal can switch into support when the amount exceeds the effective available position, so the user needs one route that keeps the logic visible."
        next="Check the current route state first, confirm the amount and payout destination, then follow the route guidance until it ends in direct withdrawal or support."
        tone="light"
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <div style={{ ...softCard(guideTone.bg), border: guideTone.border }}>
        <div style={sectionLabel()}>Active Money Out process</div>
        <div
          style={{
            marginTop: 8,
            color: guideTone.text,
            fontSize: 18,
            fontWeight: 900,
            lineHeight: 1.3,
          }}
        >
          {guidedState.title}
        </div>
        <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
          {submittingWithdrawal
            ? "GSN is submitting this withdrawal request now. Other withdrawal actions are held until the response returns."
            : guidedState.detail}
        </div>
      </div>

      <section
        style={pageCard("linear-gradient(180deg, #10243A 0%, #173654 52%, #26527C 100%)")}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "180px minmax(0, 1fr) 320px",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div
              style={{
                width: "100%",
                height: 148,
                borderRadius: 20,
                border: "1px solid rgba(212,175,55,0.22)",
                overflow: "hidden",
                background: "linear-gradient(180deg, rgba(16,36,58,0.84) 0%, rgba(38,82,124,0.92) 100%)",
                boxShadow: "0 20px 44px rgba(2,12,27,0.32)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {pictureSrc ? (
                <img
                  src={pictureSrc}
                  alt={communityLabel}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <div
                  style={{
                    color: "#F8FBFF",
                    fontWeight: 900,
                    fontSize: 20,
                    textAlign: "center",
                    padding: 12,
                    lineHeight: 1.3,
                  }}
                >
                  {communityLabel}
                </div>
              )}
            </div>
          </div>

          <div>
            <div style={sectionLabel()}>Fixed withdrawal context</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.1,
              }}
            >
              Withdraw from {communityLabel}
            </div>

            <div style={{ marginTop: 12, ...helperText(), maxWidth: 860 }}>
              Money Out should not behave like a loose dashboard card. Once you
              choose withdrawal, the flow should guide you from context and
              amount, through payout and rail confirmation, to direct result or
              support-backed continuation.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Community ID: {publicCommunityId}</span>
              <span style={badge(false)}>GSN ID: {currentGmfnId || "Awaiting issue"}</span>
              <span style={badge(false)}>Member: {memberName}</span>
              {memberRole ? <span style={badge(false)}>Role: {memberRole}</span> : null}
              <span style={badge(false)}>Current page: Money Out</span>
              <span style={badge(false)}>Current step: {guidedState.step}</span>
            </div>
          </div>

          <div
            style={{
              ...softCard(guideTone.bg),
              border: guideTone.border,
            }}
          >
            <div style={sectionLabel()}>Current route state</div>

            <div
              style={{
                marginTop: 10,
                color: guideTone.text,
                fontWeight: 900,
                fontSize: 20,
                lineHeight: 1.25,
              }}
            >
              {guidedState.title}
            </div>

            <div style={{ marginTop: 10, ...helperText(), color: "#F8FBFF" }}>
              {guidedState.detail}
            </div>
          </div>
        </div>
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
            <div style={sectionLabel()}>Withdrawal overview</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Keep the amount-led decision together.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("overview")}
            minWidth={128}
            stableHeight={46}
            debugId="money-out.toggle-overview"
            style={moneyOutCollapseButtonStyle()}
          >
            {collapsed.overview ? "Open" : "Collapse"}
          </SubtleButton>
        </div>

        <ExplainToggle
          label="What this overview shows"
          what="This overview gives the main withdrawal reading first: requested amount, available position, support gap, and current path."
          why="It helps you understand quickly whether the request can stay direct or needs support-backed continuation."
          next="Check the path and support gap first, then use the decision lane below to continue with the right route."
          tone="light"
          style={{ marginTop: 12 }}
        />

        {!collapsed.overview ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr 1fr"
                : "repeat(4, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={statTile()}>
              <div style={sectionLabel()}>Requested amount</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 18,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {requestedAmountDisplay}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Effective available</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 18,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {effectiveAvailableDisplay}
              </div>
            </div>

            <div style={statTile("#FFFBEF")}>
              <div style={sectionLabel()}>Support gap</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#92400E",
                  fontSize: 18,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {requestedAmount <= 0
                  ? "Awaiting amount"
                  : !effectiveAvailableKnown
                  ? "Awaiting pool reading"
                  : requiresSupport
                  ? `${fmtMoney(supportGap)} ${poolCurrency}`
                  : `0.00 ${poolCurrency}`}
              </div>
            </div>

            <div style={statTile("#F8FBFF")}>
              <div style={sectionLabel()}>Path</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B63D1",
                  fontSize: 16,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {requestedAmount <= 0
                  ? "Awaiting amount"
                  : !effectiveAvailableKnown
                  ? "Awaiting pool reading"
                  : requiresSupport
                  ? "Support-backed withdrawal"
                  : "Direct withdrawal"}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Community rail</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 16,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {communityRailReady ? "Ready" : "Not ready"}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Personal payout</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 16,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {payoutReady ? "Ready" : "Incomplete"}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Pending withdrawals</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 16,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {pendingWithdrawalsDisplay}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Suggested safe amount</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 16,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {safeStr(suggestedSafeAmount || "Not returned")}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Suggested guarantors</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 16,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {suggestedGuarantorCount > 0 ? String(suggestedGuarantorCount) : "Not returned"}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Recommendation</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.3,
                }}
              >
                {safeStr(readinessRecommendation || "No explicit recommendation")}
              </div>
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
            <div style={sectionLabel()}>Withdrawal decision lane</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Amount first, then the route determines direct withdrawal or support-backed continuation.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("request")}
            minWidth={128}
            stableHeight={46}
            debugId="money-out.toggle-request"
            style={moneyOutCollapseButtonStyle()}
          >
            {collapsed.request ? "Open" : "Collapse"}
          </SubtleButton>
        </div>

        <ExplainToggle
          label="How this decision works"
          what="This section compares the amount you want against your effective available pool and decides whether the route stays direct or moves into support."
          why="It makes the branch visible before you act, so you know whether you are completing a withdrawal or handing off into the support flow."
          next="Enter the amount, read the decision and intelligence panels, then continue with either direct withdrawal or loan-readiness handoff."
          tone="light"
          style={{ marginTop: 12 }}
        />

        {!collapsed.request ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.05fr) 320px",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div style={sectionLabel()}>Amount and route logic</div>

              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <div style={sectionLabel()}>How much do you want to withdraw?</div>
                  <input
                    value={amountInput}
                    onChange={(e) => {
                      setAmountInput(e.target.value);
                      setLatestWithdrawalResult(null);
                    }}
                    placeholder="Enter amount"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>Optional note</div>
                  <input
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Optional note"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  ...helperText(),
                }}
              >
                The route checks this amount against your effective available pool. If the amount stays inside your effective available position, it remains direct withdrawal. If it goes above that level, the route becomes support-backed and continues into the support flow.
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}
              >
                <div style={innerCard("#FFFFFF")}>
                  <div style={sectionLabel()}>Decision reading</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 15,
                      lineHeight: 1.45,
                    }}
                  >
                    {!effectiveAvailableKnown
                      ? "Waiting for effective-available reading"
                      : requiresSupport
                      ? "Support-backed withdrawal required"
                      : "Direct withdrawal available"}
                  </div>
                  <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                    {!effectiveAvailableKnown
                      ? "The route cannot decide until the effective-available pool reading is visible."
                      : requiresSupport
                      ? `You are asking for ${fmtMoney(requestedAmount)} ${poolCurrency} but your effective available pool is ${effectiveAvailableText} ${poolCurrency}.`
                      : "The requested amount fits inside your effective available pool."}
                  </div>
                </div>

                <div style={innerCard("#FFFFFF")}>
                  <div style={sectionLabel()}>Intelligence reading</div>
                  <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                    {[
                      readinessRecommendation
                        ? `Readiness recommendation: ${readinessRecommendation}`
                        : "",
                      suggestedSafeAmount
                        ? `Suggested safe amount: ${suggestedSafeAmount}`
                        : "",
                      suggestedGuarantorCount > 0
                        ? `Guarantor count currently suggested: ${suggestedGuarantorCount}`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" | ") || "Open the support pages if you need more background before continuing."}
                  </div>
                </div>
              </div>

              {readinessReasons.length > 0 || preflightReasons.length > 0 ? (
                <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                  {readinessReasons.length > 0 ? (
                    <div style={innerCard("#FFFBEF")}>
                      <div style={sectionLabel()}>Readiness reasons</div>
                      <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                        {readinessReasons.map((item, index) => (
                          <div key={`readiness-reason-${index}`} style={helperText()}>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {preflightReasons.length > 0 ? (
                    <div style={innerCard("#F8FBFF")}>
                      <div style={sectionLabel()}>Borrower preflight reasons</div>
                      <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                        {preflightReasons.map((item, index) => (
                          <div key={`preflight-reason-${index}`} style={helperText()}>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Decision actions</div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {!effectiveAvailableKnown ? (
                  <PrimaryButton
                    disabled
                    debugId="money-out.awaiting-pool"
                    style={moneyOutActionButtonStyle("primary", true)}
                  >
                    Awaiting Pool Reading
                  </PrimaryButton>
                ) : !requiresSupport ? (
                  <PrimaryButton
                    onClick={() => void handleDirectWithdrawal()}
                    disabled={
                      submittingWithdrawal ||
                      requestedAmount <= 0 ||
                        !communityRailReady ||
                        !payoutReady
                    }
                    debugId="money-out.continue-direct"
                    style={moneyOutActionButtonStyle(
                      "primary",
                      submittingWithdrawal ||
                        requestedAmount <= 0 ||
                        !communityRailReady ||
                        !payoutReady
                    )}
                  >
                    {submittingWithdrawal
                      ? "Submitting..."
                      : "Continue Direct Withdrawal"}
                  </PrimaryButton>
                ) : (
                  <PrimaryButton
                    onClick={handleContinueToSupportPath}
                    disabled={requestedAmount <= 0 || !communityRailReady || !payoutReady}
                    debugId="money-out.open-support"
                    style={moneyOutActionButtonStyle(
                      "primary",
                      requestedAmount <= 0 || !communityRailReady || !payoutReady
                    )}
                  >
                    Open Loan Readiness Support
                  </PrimaryButton>
                )}

                <SecondaryButton
                  onClick={handleCopyWithdrawalSummary}
                  debugId="money-out.copy-summary"
                  style={moneyOutActionButtonStyle("secondary")}
                >
                  Copy Withdrawal Summary
                </SecondaryButton>

                <SubtleButton
                  onClick={handleResetTask}
                  stableHeight={42}
                  debugId="money-out.reset-task"
                  style={moneyOutActionButtonStyle("soft")}
                >
                  Reset Task
                </SubtleButton>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section id="personal-payout-account" style={pageCard("#FFFFFF")}>
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
            <div style={sectionLabel()}>Personal payout account</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Approved withdrawal should land here. It stays separate from the fixed community rail.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("destination")}
            minWidth={128}
            stableHeight={46}
            debugId="money-out.toggle-destination"
            style={moneyOutCollapseButtonStyle()}
          >
            {collapsed.destination ? "Open" : "Collapse"}
          </SubtleButton>
        </div>

        {!collapsed.destination ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.02fr) 320px",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div style={sectionLabel()}>Destination details</div>

              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                <div>
                  <div style={sectionLabel()}>Account name</div>
                  <input
                    value={destination.destinationName}
                    onChange={(e) =>
                      setDestination((prev) => ({
                        ...prev,
                        destinationName: e.target.value,
                      }))
                    }
                    placeholder="Account name"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>Bank name</div>
                  <input
                    value={destination.bankName}
                    onChange={(e) =>
                      setDestination((prev) => ({
                        ...prev,
                        bankName: e.target.value,
                      }))
                    }
                    placeholder="Bank name"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>Account number</div>
                  <input
                    value={destination.accountNumber}
                    onChange={(e) =>
                      setDestination((prev) => ({
                        ...prev,
                        accountNumber: e.target.value,
                      }))
                    }
                    placeholder="Account number"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>Phone number</div>
                  <input
                    value={destination.phoneNumber}
                    onChange={(e) =>
                      setDestination((prev) => ({
                        ...prev,
                        phoneNumber: e.target.value,
                      }))
                    }
                    placeholder="Phone number"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>Note</div>
                  <textarea
                    value={destination.note}
                    onChange={(e) =>
                      setDestination((prev) => ({
                        ...prev,
                        note: e.target.value,
                      }))
                    }
                    placeholder="Optional payout note"
                    style={{ ...textAreaStyle(), marginTop: 8 }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <PrimaryButton
                    onClick={() => void handleSaveDestination()}
                    disabled={savingDestination}
                    debugId="money-out.save-destination"
                    style={moneyOutActionButtonStyle("primary", savingDestination)}
                  >
                    {savingDestination ? "Saving..." : "Save Payout Account"}
                  </PrimaryButton>

                    <SecondaryButton
                      onClick={handleCopyPayoutAccount}
                      debugId="money-out.copy-payout-account"
                      style={moneyOutActionButtonStyle("secondary")}
                    >
                    Copy Payout Account
                  </SecondaryButton>
                </div>
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Destination preview</div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <div style={statTile()}>
                  <div style={sectionLabel()}>Readiness</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 16,
                    }}
                  >
                    {payoutReady ? "Ready" : "Incomplete"}
                  </div>
                </div>

                <div style={statTile()}>
                  <div style={sectionLabel()}>Account name</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 16,
                    }}
                  >
                    {safeStr(destination.destinationName || "Awaiting entry")}
                  </div>
                </div>

                <div style={statTile()}>
                  <div style={sectionLabel()}>Bank</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 16,
                    }}
                  >
                    {safeStr(destination.bankName || "Awaiting entry")}
                  </div>
                </div>

                <div style={statTile()}>
                  <div style={sectionLabel()}>Account number</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 16,
                      wordBreak: "break-word",
                    }}
                  >
                    {safeStr(destination.accountNumber || "Awaiting entry")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section id="community-money-out-rail" style={pageCard("#FFFFFF")}>
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
            <div style={sectionLabel()}>Community money-out rail</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              This fixed community withdrawal rail is separate from your
              personal payout destination.
            </div>
          </div>

          <SecondaryButton
            onClick={() => void handleLoadWithdrawalRoute()}
            disabled={loadingRoute}
            debugId="money-out.refresh-community-rail"
            style={moneyOutActionButtonStyle("secondary", loadingRoute)}
          >
            {loadingRoute ? "Loading..." : "Refresh Community Rail"}
          </SecondaryButton>
        </div>

        <ExplainToggle
          label="What this rail is for"
          what="This is the community-side withdrawal rail that must be visible before money-out can complete cleanly."
          why="It stays separate from your personal payout account so the community route and your destination do not get mixed together."
          next="Refresh or review the rail details, copy them if needed, and make sure they are ready before you continue with execution."
          tone="light"
          style={{ marginTop: 12 }}
        />

        {!collapsed.rail ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.02fr) 320px",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div style={sectionLabel()}>Rail details</div>

              {!communityRailReady ? (
                <div style={{ marginTop: 10, ...helperText(), color: "#991B1B" }}>
                  Community withdrawal rail is not visible yet. Do not continue
                  until the community rail is ready.
                </div>
              ) : (
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {settlementRouteLines.map((line, index) => (
                    <div key={`withdraw-route-line-${index}`} style={innerCard("#FFFFFF")}>
                      <div style={{ ...helperText(), color: "#F8FBFF" }}>{line}</div>
                    </div>
                  ))}

                  {communitySettlementLines.map((line, index) => (
                    <div
                      key={`withdraw-settlement-line-${index}`}
                      style={innerCard("#FFFFFF")}
                    >
                      <div style={{ ...helperText(), color: "#F8FBFF" }}>{line}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Rail actions</div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  <PrimaryButton
                    onClick={handleCopyCommunityRail}
                    disabled={!communityRailReady}
                    debugId="money-out.copy-community-rail"
                    style={moneyOutActionButtonStyle("primary", !communityRailReady)}
                  >
                  Copy Community Rail
                </PrimaryButton>

                <StableCtaLink
                  to={routes.finance}
                  debugId="money-out.rail.open-finance"
                  stableHeight={48}
                  style={moneyOutActionButtonStyle("secondary")}
                >
                  Open Finance
                </StableCtaLink>

                <StableCtaLink
                  to={routes.payoutDetails}
                  debugId="money-out.rail.open-payout-details"
                  stableHeight={48}
                  style={moneyOutActionButtonStyle("secondary")}
                >
                  Open Payout Details
                </StableCtaLink>
              </div>
            </div>
          </div>
        ) : null}

        <div style={{ marginTop: 12 }}>
          <SubtleButton
            onClick={() => toggleSection("rail")}
            minWidth={128}
            stableHeight={46}
            debugId="money-out.toggle-rail"
            style={moneyOutCollapseButtonStyle()}
          >
            {collapsed.rail ? "Open rail details" : "Collapse rail details"}
          </SubtleButton>
        </div>
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
            <div style={sectionLabel()}>Execution and result</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Direct withdrawal can complete here. Support-backed withdrawal continues immediately into support continuation.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <SubtleButton
              onClick={() => toggleSection("result")}
              minWidth={128}
              stableHeight={46}
              debugId="money-out.toggle-result"
              style={moneyOutCollapseButtonStyle()}
            >
              {collapsed.result ? "Open" : "Collapse"}
            </SubtleButton>

            <SecondaryButton
              onClick={() => void handleRefresh()}
              disabled={refreshing}
              debugId="money-out.refresh-status"
              style={moneyOutActionButtonStyle("secondary", refreshing)}
            >
              {refreshing ? "Refreshing..." : "Refresh Status"}
            </SecondaryButton>
          </div>
        </div>

        <ExplainToggle
          label="What happens next"
          what="This final section shows the outcome of the current withdrawal task and whether it completed here or moved into support continuation."
          why="It keeps the result visible in one place so you can tell the difference between a completed direct withdrawal and a support-backed handoff."
          next="Refresh the status when needed, then either confirm the direct result or follow the support continuation the page presents."
          tone="light"
          style={{ marginTop: 12 }}
        />

        {!collapsed.result ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.02fr) 320px",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div style={sectionLabel()}>Current execution state</div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={innerCard("#FFFFFF")}>
                  <div style={sectionLabel()}>Path</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 16,
                      lineHeight: 1.35,
                    }}
                  >
                    {!effectiveAvailableKnown
                      ? "Awaiting pool reading"
                      : requiresSupport
                      ? "Support-backed withdrawal"
                      : "Direct withdrawal"}
                  </div>
                </div>

                <div style={innerCard("#FFFFFF")}>
                  <div style={sectionLabel()}>App explanation</div>
                  <div style={{ marginTop: 8, ...helperText(), color: "#F8FBFF" }}>
                    {!effectiveAvailableKnown
                      ? "The effective-available pool reading is not visible yet, so wait for that reading before this route decides the path."
                      : !requiresSupport
                      ? "Your requested amount stays inside the effective available pool, so this withdrawal can proceed directly if the community rail and your personal payout destination are both ready."
                      : "Your requested amount is above the effective available pool, so the route now needs support. Continue there for readiness, fit, and deeper workbench handling."}
                  </div>
                </div>

                {latestWithdrawalResult ? (
                  <div style={innerCard("#FFFFFF")}>
                    <div style={sectionLabel()}>Latest direct withdrawal result</div>
                    <div style={{ marginTop: 8, ...helperText(), color: "#F8FBFF" }}>
                      {[
                        firstTruthy(
                          latestWithdrawalResult?.status,
                          latestWithdrawalResult?.state
                        )
                          ? `Status: ${firstTruthy(
                              latestWithdrawalResult?.status,
                              latestWithdrawalResult?.state
                            )}`
                          : "",
                        latestWithdrawalResult?.reference
                          ? `Reference: ${safeStr(latestWithdrawalResult.reference)}`
                          : "",
                        latestWithdrawalResult?.amount
                          ? `Amount: ${safeStr(latestWithdrawalResult.amount)} ${safeStr(
                              latestWithdrawalResult?.currency || poolCurrency
                            )}`
                          : "",
                        latestWithdrawalResult?.created_at
                          ? `Created: ${safeDateTime(latestWithdrawalResult.created_at)}`
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" - ") || "A response was received."}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Execution actions</div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {!effectiveAvailableKnown ? (
                  <div style={innerCard("#FFFBEF")}>
                    <div style={sectionLabel()}>Awaiting pool reading</div>
                    <div style={{ marginTop: 8, ...helperText(), color: "#F8FBFF" }}>
                      The execution path is still waiting for the effective-available
                      pool reading. Once that reading is visible, use the decision lane
                      above to continue with the right route.
                    </div>
                  </div>
                ) : !requiresSupport && !latestWithdrawalResult ? (
                  <div style={innerCard("#F8FBFF")}>
                    <div style={sectionLabel()}>Use the decision lane above</div>
                    <div style={{ marginTop: 8, ...helperText(), color: "#F8FBFF" }}>
                      Submit direct withdrawal from the decision lane after you confirm
                      the amount, community rail, and personal payout account. This
                      result area stays focused on what happened after that step.
                    </div>
                  </div>
                ) : requiresSupport && !withdrawalCanWidenRoutes ? (
                  <div style={innerCard("#F8FBFF")}>
                    <div style={sectionLabel()}>Support path chosen</div>
                    <div style={{ marginTop: 8, ...helperText(), color: "#F8FBFF" }}>
                      This route has already determined that support is needed. Continue
                      below with the support pages instead of repeating the same decision
                      action here.
                    </div>
                  </div>
                ) : null}

                {requiresSupport ? (
                  <>
                      <StableCtaLink
                        to={routes.loanReadiness}
                        debugId="money-out.result.open-readiness"
                        stableHeight={48}
                        style={moneyOutActionButtonStyle("secondary")}
                      >
                        Open Loan Readiness
                      </StableCtaLink>

                      <StableCtaLink
                        to={routes.loanSuggestions}
                        debugId="money-out.result.open-suggestions"
                        stableHeight={48}
                        style={moneyOutActionButtonStyle("secondary")}
                      >
                        Open Loan Suggestions
                      </StableCtaLink>

                      <StableCtaLink
                        to={routes.loanWorkbench}
                        debugId="money-out.result.open-workbench"
                        stableHeight={48}
                        style={moneyOutActionButtonStyle("secondary")}
                      >
                        Open Loan Workbench
                      </StableCtaLink>
                  </>
                ) : withdrawalCanWidenRoutes ? (
                  <>
                    <StableCtaLink
                      to={routes.finance}
                      debugId="money-out.result.open-finance"
                      stableHeight={48}
                      style={moneyOutActionButtonStyle("secondary")}
                    >
                      Open Finance
                    </StableCtaLink>

                      <StableCtaLink
                        to={routes.payoutDetails}
                        debugId="money-out.result.open-payout-details"
                        stableHeight={48}
                        style={moneyOutActionButtonStyle("secondary")}
                      >
                        Open Payout Details
                      </StableCtaLink>
                  </>
                ) : null}
              </div>
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
            <div style={sectionLabel()}>
              {withdrawalCanWidenRoutes ? "Next routes" : "Route focus"}
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              {withdrawalCanWidenRoutes
                ? "Related routes reopen after this withdrawal has reached a visible result."
                : requiresSupport
                ? "This route has already determined that support is required. Continue into the support flow instead of switching to unrelated pages."
                : "This withdrawal is still active. Keep the route focused on amount, rail, destination, and result."}
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("routes")}
            minWidth={128}
            stableHeight={46}
            debugId="money-out.toggle-routes"
            style={moneyOutCollapseButtonStyle()}
          >
            {collapsed.routes ? "Open" : "Collapse"}
          </SubtleButton>
        </div>

        {!collapsed.routes ? (
          withdrawalCanWidenRoutes ? (
            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: 12,
              }}
            >
                <StableCtaLink
                  to={routes.finance}
                  debugId="money-out.route.finance"
                  stableHeight={48}
                  fullWidth
                  style={moneyOutActionButtonStyle("primary")}
                >
                  Open Finance
                </StableCtaLink>

                <StableCtaLink
                  to={routes.payoutDetails}
                  debugId="money-out.route.payout-details"
                  stableHeight={48}
                  fullWidth
                  style={moneyOutActionButtonStyle("secondary")}
                >
                  Open Payout Details
                </StableCtaLink>

                <StableCtaLink
                  to={routes.paymentRails}
                  debugId="money-out.route.payment-rails"
                  stableHeight={48}
                  fullWidth
                  style={moneyOutActionButtonStyle("secondary")}
                >
                  Open Payment Rails
                </StableCtaLink>

                <StableCtaLink
                  to={routes.loanReadiness}
                  debugId="money-out.route.readiness"
                  stableHeight={48}
                  fullWidth
                  style={moneyOutActionButtonStyle("secondary")}
                >
                  Open Loan Readiness
                </StableCtaLink>

                <StableCtaLink
                  to={routes.loanWorkbench}
                  debugId="money-out.route.workbench"
                  stableHeight={48}
                  fullWidth
                  style={moneyOutActionButtonStyle("secondary")}
                >
                  Open Loan Workbench
                </StableCtaLink>

                <StableCtaLink
                  to={routes.loans}
                  debugId="money-out.route.loans"
                  stableHeight={48}
                  fullWidth
                  style={moneyOutActionButtonStyle("secondary")}
                >
                  Open Loans & Support
                </StableCtaLink>

              <StableCtaLink
                to={routes.marketplace}
                debugId="money-out.route.marketplace"
                stableHeight={48}
                fullWidth
                style={moneyOutActionButtonStyle("secondary")}
              >
                Marketplace
              </StableCtaLink>

              <StableCtaLink
                to={routes.notifications}
                debugId="money-out.route.notifications"
                stableHeight={48}
                fullWidth
                style={moneyOutActionButtonStyle("secondary")}
              >
                Action Inbox
              </StableCtaLink>
            </div>
          ) : (
            <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
              <div style={innerCard("#F8FBFF")}>
                <div style={sectionLabel()}>One-task mode</div>
                <div style={{ marginTop: 8, ...helperText(), color: "#F8FBFF" }}>
                  Keep this withdrawal on one path until the route produces a direct
                  result or hands you into the support flow.
                </div>
              </div>
            </div>
          )
        ) : null}
      </section>
    </div>
  );
}
