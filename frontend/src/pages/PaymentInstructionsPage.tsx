import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import PageTopNav from "../components/PageTopNav";
import { PrimaryButton, SecondaryButton, StableCtaLink, SubtleButton } from "../components/StableButton";
import * as api from "../lib/api";
import { communityIdFromSearch } from "../lib/communityRouteContext";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import {
  createPoolDepositInstruction,
  getCommunityMoneySurface,
  loadCommunityDepositRoute,
  type CommunityMoneyRoute,
  type CommunityMoneySettlement,
  type CommunityMoneySurface,
} from "../lib/communityMoney";

type NoticeTone = "success" | "error";

type CollapseState = {
  overview: boolean;
  warning: boolean;
  amount: boolean;
  instruction: boolean;
  result: boolean;
  routes: boolean;
};

type PersistedDepositTask = {
  amountInput: string;
  instruction: CommunityMoneyRoute | null;
  paymentConfirmed: boolean;
  paymentConfirmedAt?: string | null;
  updatedAt?: string | null;
};

const MONEY_IN_UI_STORAGE_KEY = "gmfn.moneyin.sections.v1";
const MONEY_IN_TASK_STORAGE_KEY_PREFIX = "gmfn.moneyin.task.v1";

function safeStr(x: unknown): string {
  return String(x ?? "").trim();
}

function firstTruthy(...values: unknown[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function parseMoneyNumber(value: unknown): number {
  const raw = safeStr(value).replace(/,/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(value: unknown): string {
  return parseMoneyNumber(value).toFixed(2);
}

function safeDateTime(x: unknown): string {
  const raw = safeStr(x);
  if (!raw) return "Not stated";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
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

function moneyInActionButtonStyle(
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
        ? "linear-gradient(180deg, #D5DEE8 0%, #C7D2DE 100%)"
        : "linear-gradient(180deg, #255FCE 0%, #1B4FBF 100%)",
      color: "#FFFFFF",
      boxShadow: disabled
        ? "none"
        : "0 16px 32px rgba(29,95,212,0.28), inset 0 1px 0 rgba(255,255,255,0.22)",
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
      : "0 12px 24px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
    fontWeight: 900,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.86 : 1,
  };
}

function moneyInCollapseButtonStyle(): React.CSSProperties {
  return {
    borderRadius: 12,
    border: "1px solid rgba(124,154,196,0.20)",
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
      "0 12px 24px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.82)",
    outline: "none",
    boxSizing: "border-box" as const,
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

function writeLocalJSON(key: string, value: unknown) {
  try {
    if (typeof window === "undefined") return;

    if (value == null) {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function defaultCollapseState(): CollapseState {
  return {
    overview: false,
    warning: false,
    amount: false,
    instruction: false,
    result: false,
    routes: false,
  };
}

function normalizeCollapseState(raw: unknown): CollapseState {
  const src = (raw ?? {}) as Partial<CollapseState>;
  const base = defaultCollapseState();

  return {
    overview: Boolean(src.overview ?? base.overview),
    warning: Boolean(src.warning ?? base.warning),
    amount: Boolean(src.amount ?? base.amount),
    instruction: Boolean(src.instruction ?? base.instruction),
    result: Boolean(src.result ?? base.result),
    routes: Boolean(src.routes ?? base.routes),
  };
}

function taskStorageKey(clanId: number, gmfnId: string): string {
  return `${MONEY_IN_TASK_STORAGE_KEY_PREFIX}.${gmfnId || "me"}.${clanId || 0}`;
}

function copyText(text: string) {
  const value = safeStr(text);
  if (!value) return;

  api.safeCopy(value);
}

function getCommunityName(currentClan: any, clanId: number): string {
  return (
    firstTruthy(
      currentClan?.marketplace_name,
      currentClan?.name,
      currentClan?.display_name,
      currentClan?.title
    ) || (clanId ? `Community ${clanId}` : "No current community")
  );
}

function getCommunityPublicId(currentClan: any): string {
  return (
    firstTruthy(
      currentClan?.community_code,
      currentClan?.community?.community_code,
      currentClan?.profile?.community_code,
      currentClan?.marketplace?.community_code
    ) || "Awaiting issue"
  );
}

function getCommunityRole(currentClan: any): string {
  return (
    firstTruthy(
      currentClan?.role,
      currentClan?.member_role,
      currentClan?.membership_role,
      currentClan?.participant_role
    ) || ""
  );
}

function getCommunityImageSrc(currentClan: any): string {
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

function findMatchingDepositEvent(reference: string, recentEvents: any[]): any | null {
  const target = safeStr(reference).toUpperCase();
  if (!target || !Array.isArray(recentEvents)) return null;

  for (const event of recentEvents) {
    const ref = firstTruthy(
      event?.reference,
      event?.payment_reference,
      event?.code,
      event?.meta?.reference,
      event?.meta_json?.reference
    ).toUpperCase();

    if (ref && ref === target) {
      return event;
    }
  }

  return null;
}

function routeTarget(intent: CtaIntent, communityId: number, debugId: string): string {
  return resolveCtaTarget(intent, { communityId, debugId }).to as string;
}

export default function PaymentInstructionsPage() {
  const location = useLocation();
  const routeClanId = useMemo(
    () => communityIdFromSearch(location.search),
    [location.search]
  );
  const selectedClanId =
    routeClanId || Number((api as any).getSelectedClanId?.() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "money-in.route.dashboard"),
      marketplace: routeTarget("marketplace", selectedClanId, "money-in.route.marketplace-target"),
      community: routeTarget("communityHome", selectedClanId, "money-in.route.community-target"),
      finance: routeTarget("finance", selectedClanId, "money-in.route.finance-target"),
      moneyOut: routeTarget("moneyOut", selectedClanId, "money-in.route.money-out-target"),
      paymentRails: routeTarget("paymentRails", selectedClanId, "money-in.route.payment-rails-target"),
      payoutDetails: routeTarget("payoutDetails", selectedClanId, "money-in.route.payout-details-target"),
      loans: routeTarget("loans", selectedClanId, "money-in.route.loans-target"),
      notifications: routeTarget("notifications", selectedClanId, "money-in.route.notifications-target"),
    }),
    [selectedClanId]
  );

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON<CollapseState>(
        MONEY_IN_UI_STORAGE_KEY,
        defaultCollapseState()
      )
    )
  );

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshingRoute, setRefreshingRoute] = useState<boolean>(false);
  const [generatingInstruction, setGeneratingInstruction] =
    useState<boolean>(false);

  const [notice, setNotice] = useState<{
    tone: NoticeTone;
    text: string;
  } | null>(null);

  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [moneySurface, setMoneySurface] = useState<CommunityMoneySurface | null>(
    null
  );
  const [depositRoute, setDepositRoute] = useState<CommunityMoneyRoute | null>(
    null
  );
  const [amountInput, setAmountInput] = useState<string>("");
  const [instruction, setInstruction] = useState<CommunityMoneyRoute | null>(
    null
  );
  const [paymentConfirmed, setPaymentConfirmed] = useState<boolean>(false);
  const [paymentConfirmedAt, setPaymentConfirmedAt] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (routeClanId > 0) {
      (api as any).setSelectedClanId?.(routeClanId);
    }
  }, [routeClanId]);

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
    writeLocalJSON(MONEY_IN_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const currentGmfnId = useMemo(() => {
    return firstTruthy(me?.gmfn_id);
  }, [me]);

  useEffect(() => {
    let alive = true;

    async function loadPage() {
      setLoading(true);

      try {
        const [meRes, clanRes] = await Promise.all([
          typeof (api as any).getMe === "function"
            ? (api as any).getMe().catch(() => null)
            : Promise.resolve(null),
          typeof (api as any).getCurrentClan === "function"
            ? (api as any).getCurrentClan().catch(() => null)
            : Promise.resolve(null),
        ]);

        if (!alive) return;

        setMe(meRes || null);
        setCurrentClan(clanRes || null);

        const gmfnId = firstTruthy(meRes?.gmfn_id);

        if (!selectedClanId || !gmfnId) {
          setMoneySurface(null);
          setDepositRoute(null);
          setInstruction(null);
          setAmountInput("");
          setPaymentConfirmed(false);
          setPaymentConfirmedAt(null);
          return;
        }

        const [surface, route] = await Promise.all([
          getCommunityMoneySurface(selectedClanId, gmfnId, "NGN").catch(() => null),
          loadCommunityDepositRoute(selectedClanId, gmfnId, "NGN").catch(() => null),
        ]);

        if (!alive) return;

        setMoneySurface(surface);
        setDepositRoute(route || surface?.depositRoute || null);

        const stored = readLocalJSON<PersistedDepositTask | null>(
          taskStorageKey(selectedClanId, gmfnId),
          null
        );

        setAmountInput(safeStr(stored?.amountInput));
        setInstruction(stored?.instruction || null);
        setPaymentConfirmed(Boolean(stored?.paymentConfirmed));
        setPaymentConfirmedAt(stored?.paymentConfirmedAt || null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    void loadPage();

    return () => {
      alive = false;
    };
  }, [selectedClanId]);

  useEffect(() => {
    if (!selectedClanId || !currentGmfnId) return;

    writeLocalJSON(taskStorageKey(selectedClanId, currentGmfnId), {
      amountInput,
      instruction,
      paymentConfirmed,
      paymentConfirmedAt,
      updatedAt: new Date().toISOString(),
    } as PersistedDepositTask);
  }, [
    selectedClanId,
    currentGmfnId,
    amountInput,
    instruction,
    paymentConfirmed,
    paymentConfirmedAt,
  ]);

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

  const communityLabel = useMemo(() => {
    return getCommunityName(currentClan, selectedClanId);
  }, [currentClan, selectedClanId]);

  const publicCommunityCode = useMemo(() => {
    return getCommunityPublicId(currentClan);
  }, [currentClan]);

  const memberRole = useMemo(() => {
    return getCommunityRole(currentClan);
  }, [currentClan]);

  const pictureSrc = useMemo(() => {
    return getCommunityImageSrc(currentClan);
  }, [currentClan]);

  const poolCurrency = useMemo(() => {
    return firstTruthy(
      instruction?.currency,
      depositRoute?.currency,
      moneySurface?.poolCurrency,
      "NGN"
    );
  }, [instruction, depositRoute, moneySurface]);

  const formattedInputAmount = useMemo(() => {
    return safeStr(amountInput) ? fmtMoney(amountInput) : "";
  }, [amountInput]);

  const communitySettlement = useMemo(() => {
    return (
      instruction?.settlement ||
      depositRoute?.settlement ||
      moneySurface?.communitySettlement ||
      null
    );
  }, [instruction, depositRoute, moneySurface]);

  const communityRailReady = Boolean(
    communitySettlement?.bankName ||
      communitySettlement?.accountName ||
      communitySettlement?.accountNumber
  );

  const routeLines = useMemo(() => {
    return splitRouteLines(instruction || depositRoute || null);
  }, [instruction, depositRoute]);

  const settlementDetailLines = useMemo(() => {
    return settlementLines(communitySettlement);
  }, [communitySettlement]);

  const matchedEvent = useMemo(() => {
    return findMatchingDepositEvent(
      firstTruthy(instruction?.reference),
      Array.isArray(moneySurface?.recentPoolEvents)
        ? moneySurface?.recentPoolEvents
        : []
    );
  }, [instruction, moneySurface]);

  const inferredResult = useMemo(() => {
    if (!instruction) {
      return {
        tone: "blue" as const,
        step: "Code generation",
        title: "Generate the payment instruction.",
        detail:
          "Money In cannot continue until the matching reference and settlement detail are ready.",
      };
    }

    if (!paymentConfirmed) {
      return {
        tone: "blue" as const,
        step: "Payment",
        title: "Pay using the exact generated reference.",
        detail:
          "After payment is made, confirm it here so the route can move into reconciliation.",
      };
    }

    if (matchedEvent) {
      return {
        tone: "green" as const,
        step: "Result",
        title: "A matching payment event is visible.",
        detail:
          "A recent money record appears to show a payment event that matches this generated reference.",
      };
    }

    return {
      tone: "gold" as const,
      step: "Awaiting reconciliation",
      title: "Payment is waiting for reconciliation.",
      detail:
        "Payment has been confirmed, but the recent money record does not show a visible matched event for this reference yet.",
    };
  }, [instruction, paymentConfirmed, matchedEvent]);

  const resultTone = useMemo(() => {
    if (inferredResult.tone === "green") {
      return {
        bg: "#F3FBF5",
        border: "1px solid rgba(34,197,94,0.16)",
        text: "#166534",
      };
    }

    if (inferredResult.tone === "gold") {
      return {
        bg: "#FFFBEF",
        border: "1px solid rgba(245,158,11,0.16)",
        text: "#92400E",
      };
    }

    return {
      bg: "#F8FBFF",
      border: "1px solid rgba(11,99,209,0.12)",
      text: "#0B63D1",
    };
  }, [inferredResult]);

  const moneyInCanWidenRoutes = paymentConfirmed || Boolean(matchedEvent);
  const moneyInTaskStillActive = !moneyInCanWidenRoutes;

  async function handleRefreshRoute() {
    if (!selectedClanId || !currentGmfnId) {
      setNotice({
        tone: "error",
        text: "Community or member identity is not ready.",
      });
      return;
    }

    setRefreshingRoute(true);

    try {
      const [surface, route] = await Promise.all([
        getCommunityMoneySurface(selectedClanId, currentGmfnId, "NGN").catch(() => null),
        loadCommunityDepositRoute(selectedClanId, currentGmfnId, "NGN").catch(() => null),
      ]);

      setMoneySurface(surface);
      setDepositRoute(route || surface?.depositRoute || null);

      setNotice({
        tone: "success",
        text: "Money In route refreshed.",
      });
    } finally {
      setRefreshingRoute(false);
    }
  }

  async function handleGenerateInstruction() {
    if (!selectedClanId || !currentGmfnId) {
      setNotice({
        tone: "error",
        text: "Community or member identity is not ready.",
      });
      return;
    }

    if (!communityRailReady) {
      setNotice({
        tone: "error",
        text: "Community pay-in details are not visible yet.",
      });
      return;
    }

    if (!safeStr(amountInput) || Number(amountInput) <= 0) {
      setNotice({
        tone: "error",
        text: "Enter a valid pay-in amount.",
      });
      return;
    }

    setGeneratingInstruction(true);

    try {
      const generated = await createPoolDepositInstruction({
        clanId: selectedClanId,
        amount: safeStr(amountInput),
        currency: poolCurrency,
      });

      if (!generated) {
        setNotice({
          tone: "error",
          text: "The system did not return a readable payment instruction.",
        });
        return;
      }

      setInstruction(generated);
      setPaymentConfirmed(false);
      setPaymentConfirmedAt(null);

      setNotice({
        tone: "success",
        text: "Money In instruction generated.",
      });
    } catch (e: any) {
      setNotice({
        tone: "error",
        text:
          safeStr(e?.message) ||
          "Money In instruction could not be generated.",
      });
    } finally {
      setGeneratingInstruction(false);
    }
  }

  function handleConfirmPaymentMade() {
    if (!instruction) {
      setNotice({
        tone: "error",
        text: "Generate the instruction first.",
      });
      return;
    }

    const now = new Date().toISOString();
    setPaymentConfirmed(true);
    setPaymentConfirmedAt(now);

    setNotice({
      tone: "success",
      text: "Payment marked as made. Waiting for reconciliation.",
    });
  }

  function handleResetTask() {
    setAmountInput("");
    setInstruction(null);
    setPaymentConfirmed(false);
    setPaymentConfirmedAt(null);

    if (selectedClanId && currentGmfnId) {
      writeLocalJSON(taskStorageKey(selectedClanId, currentGmfnId), null);
    }

    setNotice({
      tone: "success",
      text: "Money In task reset.",
    });
  }

  function handleCopyInstruction() {
    if (!instruction) {
      setNotice({
        tone: "error",
        text: "Generate the instruction first.",
      });
      return;
    }

    const text = [
      `Community: ${communityLabel}`,
      `Community ID: ${publicCommunityCode}`,
      `GMFN ID: ${currentGmfnId || "Awaiting issue"}`,
      `Member: ${memberName}`,
      memberRole ? `Role: ${memberRole}` : "",
      `Current stage: ${inferredResult.step}`,
      formattedInputAmount
        ? `Amount: ${formattedInputAmount} ${instruction.currency}`
        : "",
      instruction.reference ? `Reference: ${instruction.reference}` : "",
      communitySettlement?.railName
        ? `Rail: ${communitySettlement.railName}`
        : "",
      communitySettlement?.bankName
        ? `Bank: ${communitySettlement.bankName}`
        : "",
      communitySettlement?.accountName
        ? `Account name: ${communitySettlement.accountName}`
        : "",
      communitySettlement?.accountNumber
        ? `Account number: ${communitySettlement.accountNumber}`
        : "",
      communitySettlement?.sortCode
        ? `Sort code: ${communitySettlement.sortCode}`
        : "",
      instruction.detail ? `Instruction: ${instruction.detail}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    copyText(text);

    setNotice({
      tone: "success",
      text: "Money In instruction copied.",
    });
  }

  function handleCopyReference() {
    const reference = firstTruthy(instruction?.reference);
    if (!reference) {
      setNotice({
        tone: "error",
        text: "No payment reference is shown yet.",
      });
      return;
    }

    copyText(reference);

    setNotice({
      tone: "success",
      text: "Payment reference copied.",
    });
  }

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev: CollapseState) => ({
      ...prev,
      [key]: !prev[key],
    }));
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
          sectionLabel="Money In"
          title="Payment Instructions"
          subtitle="Loading the pay-in route..."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.marketplace}
          backLabel="Marketplace"
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading Money In...
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
        sectionLabel="Money In"
        title="Payment Instructions"
        subtitle="Money In stays on one route from context to instruction, payment confirmation, and reconciliation."
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.marketplace}
        backLabel="Marketplace"
      />

      <ExplainToggle
        label="What this screen does"
        what="Money In guides one pay-in route from context, amount, and reference generation through payment confirmation and reconciliation."
        why="Pay-in only works cleanly when the exact amount, exact reference, and matching rule stay visible in one guided place."
        next="Confirm the route context first, generate the instruction, pay with the exact amount and reference, then wait for reconciliation to complete."
        tone="light"
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

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
            <div style={sectionLabel()}>Fixed pay-in context</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.1,
              }}
            >
              Pay into {communityLabel}
            </div>

            <div style={{ marginTop: 12, ...helperText(), color: "#D7E3F1", maxWidth: 860 }}>
              GSN is not the custodian of the money. This route generates the exact
              matching reference so payment into the community account can later be
              matched and reflected correctly.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Community ID: {publicCommunityCode}</span>
              <span style={badge(false)}>GMFN ID: {currentGmfnId || "Awaiting issue"}</span>
              <span style={badge(false)}>Member: {memberName}</span>
              {memberRole ? <span style={badge(false)}>Role: {memberRole}</span> : null}
              <span style={badge(false)}>Current stage: {inferredResult.step}</span>
            </div>
          </div>

          <div
            style={{
              ...softCard(resultTone.bg),
              border: resultTone.border,
            }}
          >
            <div style={sectionLabel()}>Current route state</div>

            <div
              style={{
                marginTop: 10,
                color: resultTone.text,
                fontWeight: 900,
                fontSize: 20,
                lineHeight: 1.25,
              }}
            >
              {inferredResult.title}
            </div>

            <div style={{ marginTop: 10, ...helperText(), color: "#F8FBFF" }}>
              {inferredResult.detail}
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
            <div style={sectionLabel()}>Money In overview</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The core pay-in facts stay visible in one place.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("overview")}
            minWidth={128}
            stableHeight={46}
            debugId="money-in.toggle-overview"
            style={moneyInCollapseButtonStyle()}
          >
            {collapsed.overview ? "Open" : "Collapse"}
          </SubtleButton>
        </div>

        <ExplainToggle
          label="What this overview shows"
          what="This overview keeps the core pay-in facts together: amount, route status, reference, and reconciliation state."
          why="It gives you one quick reading before you move deeper into instruction details or reconciliation."
          next="Confirm the route is ready, then generate or check the instruction below before making payment."
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
              <div style={sectionLabel()}>Pay-in amount</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 18,
                  fontWeight: 900,
                }}
              >
                {formattedInputAmount ? `${formattedInputAmount} ${poolCurrency}` : "Awaiting amount"}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Route status</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 16,
                  fontWeight: 900,
                }}
              >
                {communityRailReady ? "Community pay-in details ready" : "Community pay-in details pending"}
              </div>
            </div>

            <div style={statTile("#F8FBFF")}>
              <div style={sectionLabel()}>Reference</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B63D1",
                  fontSize: 16,
                  fontWeight: 900,
                  wordBreak: "break-word",
                }}
              >
                {firstTruthy(instruction?.reference, "Awaiting reference")}
              </div>
            </div>

            <div style={statTile("#FFFBEF")}>
              <div style={sectionLabel()}>Reconciliation state</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#92400E",
                  fontSize: 16,
                  fontWeight: 900,
                }}
              >
                {matchedEvent
                  ? "Matched event visible"
                  : paymentConfirmed
                  ? "Waiting for reconciliation"
                  : "Not yet confirmed"}
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
            <div style={sectionLabel()}>Non-custodial warning</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Keep this warning visible before payment is made.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("warning")}
            minWidth={128}
            stableHeight={46}
            debugId="money-in.toggle-warning"
            style={moneyInCollapseButtonStyle()}
          >
            {collapsed.warning ? "Open" : "Collapse"}
          </SubtleButton>
        </div>

        {!collapsed.warning ? (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <div style={innerCard("#FFFBEF")}>
              <div style={sectionLabel()}>Pay-in rule</div>
              <div style={{ marginTop: 8, ...helperText(), color: "#F8FBFF" }}>
                GSN does not hold your funds. Pay into the community account
                using the exact generated reference.
              </div>
            </div>

            <div style={innerCard("#FFFBEF")}>
              <div style={sectionLabel()}>Matching rule</div>
              <div style={{ marginTop: 8, ...helperText(), color: "#F8FBFF" }}>
                A wrong reference or wrong amount may delay reconciliation and leave the payment unmatched.
              </div>
            </div>

            <div style={innerCard("#FFFBEF")}>
              <div style={sectionLabel()}>Critical rule</div>
              <div style={{ marginTop: 8, ...helperText(), color: "#F8FBFF" }}>
                Money In does not use guarantor logic. It stays a pay-in route,
                not a support route.
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
            <div style={sectionLabel()}>Amount and code generation</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Enter the amount, then generate the exact matching instruction.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("amount")}
            minWidth={128}
            stableHeight={46}
            debugId="money-in.toggle-amount"
            style={moneyInCollapseButtonStyle()}
          >
            {collapsed.amount ? "Open" : "Collapse"}
          </SubtleButton>
        </div>

        {!collapsed.amount ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) 320px",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div style={sectionLabel()}>Pay-in amount</div>

              <div style={{ marginTop: 14, display: "grid", gap: 12, maxWidth: 420 }}>
                <div>
                  <div
                    style={{
                      marginBottom: 8,
                      color: "#475569",
                      fontWeight: 900,
                      fontSize: 14,
                    }}
                  >
                    How much do you want to pay in?
                  </div>

                  <input
                    value={amountInput}
                    onChange={(e) => {
                      setAmountInput(e.target.value);
                      setInstruction(null);
                      setPaymentConfirmed(false);
                      setPaymentConfirmedAt(null);
                    }}
                    placeholder="Enter amount"
                    style={inputStyle()}
                  />
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <PrimaryButton
                    onClick={() => void handleGenerateInstruction()}
                    disabled={generatingInstruction}
                    debugId="money-in.generate-instruction"
                    style={moneyInActionButtonStyle("primary", generatingInstruction)}
                  >
                    {generatingInstruction ? "Generating..." : "Generate Instruction"}
                  </PrimaryButton>

                  <SecondaryButton
                    onClick={() => void handleRefreshRoute()}
                    disabled={refreshingRoute}
                    debugId="money-in.refresh-route"
                    style={moneyInActionButtonStyle("secondary", refreshingRoute)}
                  >
                    {refreshingRoute ? "Refreshing..." : "Refresh Route"}
                  </SecondaryButton>
                </div>
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>What generation does</div>
              <div style={{ marginTop: 8, ...helperText() }}>
                The generated code/reference is the matching identity for the payment event.
                It ties together your community, GSN identity, amount, and currency.
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
            <div style={sectionLabel()}>Payment instruction</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Use the settlement rail and exact reference shown here.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("instruction")}
            minWidth={128}
            stableHeight={46}
            debugId="money-in.toggle-instruction"
            style={moneyInCollapseButtonStyle()}
          >
            {collapsed.instruction ? "Open" : "Collapse"}
          </SubtleButton>
        </div>

        <ExplainToggle
          label="How to use this instruction"
          what="This section gives you the exact amount, reference, and settlement details for the current Money In task."
          why="The payment only matches cleanly when the exact instruction is used, especially the reference."
          next="Copy the reference or full instruction, make the payment through the shown rail, then confirm payment here so reconciliation can continue."
          tone="light"
          style={{ marginTop: 12 }}
        />

        {!collapsed.instruction ? (
          !instruction ? (
            <div style={{ marginTop: 14, color: "#64748B", lineHeight: 1.8 }}>
              Generate the instruction to see the exact community account, amount, and matching reference.
            </div>
          ) : (
            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) 320px",
                gap: 16,
                alignItems: "start",
              }}
            >
              <div style={innerCard("#FCFEFF")}>
                <div style={sectionLabel()}>Instruction details</div>

                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  <div style={innerCard("#FFFFFF")}>
                    <div style={sectionLabel()}>Exact amount</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#F8FBFF",
                        fontWeight: 1000,
                        fontSize: 18,
                      }}
                    >
                      {formattedInputAmount || "Awaiting amount"} {instruction.currency}
                    </div>
                  </div>

                  <div style={innerCard("#FFFFFF")}>
                    <div style={sectionLabel()}>Reference</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#0B63D1",
                        fontWeight: 1000,
                        fontSize: 18,
                        wordBreak: "break-word",
                      }}
                    >
                      {firstTruthy(instruction.reference, "Awaiting reference")}
                    </div>
                  </div>

                  {routeLines.length > 0 ? (
                    <div style={innerCard("#FFFFFF")}>
                      <div style={sectionLabel()}>Route summary</div>
                      <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                        {routeLines.map((line, index) => (
                          <div key={`route-line-${index}`} style={helperText()}>
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {settlementDetailLines.length > 0 ? (
                    <div style={innerCard("#FFFFFF")}>
                      <div style={sectionLabel()}>Settlement details</div>
                      <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                        {settlementDetailLines.map((line, index) => (
                          <div key={`settlement-line-${index}`} style={helperText()}>
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div style={softCard("#FFFFFF")}>
                <div style={sectionLabel()}>Instruction actions</div>

                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                    <PrimaryButton
                      onClick={handleCopyReference}
                      debugId="money-in.copy-reference"
                      style={moneyInActionButtonStyle("primary")}
                    >
                      Copy Reference
                    </PrimaryButton>

                    <SecondaryButton
                      onClick={handleCopyInstruction}
                      debugId="money-in.copy-instruction"
                      style={moneyInActionButtonStyle("secondary")}
                    >
                    Copy Full Instruction
                  </SecondaryButton>

                  <SecondaryButton
                    onClick={handleConfirmPaymentMade}
                    debugId="money-in.confirm-paid"
                    style={moneyInActionButtonStyle("secondary")}
                  >
                    I Have Paid Using This Reference
                  </SecondaryButton>
                </div>
              </div>
            </div>
          )
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
            <div style={sectionLabel()}>Result and reconciliation</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Stay on this route until reconciliation is visible or clearly awaiting confirmation.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("result")}
            minWidth={128}
            stableHeight={46}
            debugId="money-in.toggle-result"
            style={moneyInCollapseButtonStyle()}
          >
            {collapsed.result ? "Open" : "Collapse"}
          </SubtleButton>
        </div>

        <ExplainToggle
          label="What happens here"
          what="This section shows whether the payment has been seen, matched, or is still waiting for reconciliation."
          why="It stops a successful payment from feeling lost by showing the result state in the same route where the instruction was created."
          next="Refresh the status if needed, then move on only when the payment is clearly matched or the page tells you it is still awaiting confirmation."
          tone="light"
          style={{ marginTop: 12 }}
        />

        {!collapsed.result ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) 320px",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div style={sectionLabel()}>Current result state</div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={innerCard("#FFFFFF")}>
                  <div style={sectionLabel()}>Route result</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: resultTone.text,
                      fontWeight: 900,
                      fontSize: 16,
                      lineHeight: 1.35,
                    }}
                  >
                    {inferredResult.title}
                  </div>
                  <div style={{ marginTop: 8, ...helperText(), color: "#F8FBFF" }}>
                    {inferredResult.detail}
                  </div>
                </div>

                {paymentConfirmedAt ? (
                  <div style={innerCard("#FFFFFF")}>
                    <div style={sectionLabel()}>Member confirmation time</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#F8FBFF",
                        fontWeight: 900,
                        fontSize: 14,
                        lineHeight: 1.35,
                      }}
                    >
                      {safeDateTime(paymentConfirmedAt)}
                    </div>
                  </div>
                ) : null}

                {matchedEvent ? (
                  <div style={innerCard("#F3FBF5")}>
                    <div style={sectionLabel()}>Visible matched event</div>
                    <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                      <div style={helperText()}>
                        Status: {firstTruthy(matchedEvent?.status, matchedEvent?.state, "Visible")}
                      </div>
                      <div style={helperText()}>
                        Reference: {firstTruthy(
                          matchedEvent?.reference,
                          matchedEvent?.payment_reference,
                          matchedEvent?.code
                        )}
                      </div>
                      <div style={helperText()}>
                        Time: {safeDateTime(
                          firstTruthy(
                            matchedEvent?.created_at,
                            matchedEvent?.updated_at,
                            matchedEvent?.timestamp
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>
                {moneyInTaskStillActive ? "Current route actions" : "Completion actions"}
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {moneyInTaskStillActive ? (
                  <div style={innerCard("#F8FBFF")}>
                    <div style={sectionLabel()}>Keep the route focused</div>
                    <div style={{ marginTop: 8, ...helperText(), color: "#F8FBFF" }}>
                      This pay-in is still active. Stay on this route until payment is
                      clearly confirmed or reconciliation is visibly awaiting. The route
                      options stay together in the next section below so they do not
                      compete with the result reading here.
                    </div>
                  </div>
                ) : (
                  <div style={innerCard("#F8FBFF")}>
                    <div style={sectionLabel()}>Move on from here</div>
                    <div style={{ marginTop: 8, ...helperText(), color: "#F8FBFF" }}>
                      This pay-in has reached a visible conclusion. Use the next-routes
                      section below to reopen the right follow-on page from one place.
                    </div>
                  </div>
                )}

                <SubtleButton
                  onClick={handleResetTask}
                  stableHeight={42}
                  debugId="money-in.reset-task"
                  style={moneyInActionButtonStyle("soft")}
                >
                  Reset Money In
                </SubtleButton>
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
              {moneyInCanWidenRoutes ? "Next routes" : "Route focus"}
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              {moneyInCanWidenRoutes
                ? "Related routes reopen after this pay-in has reached a visible conclusion."
                : "This pay-in is still active. Stay on this route until payment is confirmed or reconciliation is clearly awaiting."}
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("routes")}
            minWidth={128}
            stableHeight={46}
            debugId="money-in.toggle-routes"
            style={moneyInCollapseButtonStyle()}
          >
            {collapsed.routes ? "Open" : "Collapse"}
          </SubtleButton>
        </div>

        {!collapsed.routes ? (
          moneyInCanWidenRoutes ? (
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
                debugId="money-in.route.finance"
                stableHeight={48}
                fullWidth
                style={moneyInActionButtonStyle("primary")}
              >
                Finance
              </StableCtaLink>

              <StableCtaLink
                to={routes.moneyOut}
                debugId="money-in.route.money-out"
                stableHeight={48}
                fullWidth
                style={moneyInActionButtonStyle("secondary")}
              >
                Money Out
              </StableCtaLink>

              <StableCtaLink
                to={routes.paymentRails}
                debugId="money-in.route.payment-rails"
                stableHeight={48}
                fullWidth
                style={moneyInActionButtonStyle("secondary")}
              >
                Payment Rails
              </StableCtaLink>

              <StableCtaLink
                to={routes.payoutDetails}
                debugId="money-in.route.payout-details"
                stableHeight={48}
                fullWidth
                style={moneyInActionButtonStyle("secondary")}
              >
                Payout Details
              </StableCtaLink>

              <StableCtaLink
                to={routes.loans}
                debugId="money-in.route.loans"
                stableHeight={48}
                fullWidth
                style={moneyInActionButtonStyle("secondary")}
              >
                Loans
              </StableCtaLink>

              <StableCtaLink
                to={routes.marketplace}
                debugId="money-in.route.marketplace"
                stableHeight={48}
                fullWidth
                style={moneyInActionButtonStyle("secondary")}
              >
                Marketplace
              </StableCtaLink>

              <StableCtaLink
                to={routes.community}
                debugId="money-in.route.community"
                stableHeight={48}
                fullWidth
                style={moneyInActionButtonStyle("secondary")}
              >
                Community Home
              </StableCtaLink>

              <StableCtaLink
                to={routes.notifications}
                debugId="money-in.route.notifications"
                stableHeight={48}
                fullWidth
                style={moneyInActionButtonStyle("secondary")}
              >
                Action Inbox
              </StableCtaLink>
            </div>
          ) : (
            <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
              <div style={innerCard("#F8FBFF")}>
                <div style={sectionLabel()}>One-task mode</div>
                <div style={{ marginTop: 8, ...helperText(), color: "#F8FBFF" }}>
                  Generate the instruction, pay using the exact reference, and keep this
                  route open until the payment is confirmed or reconciliation is visibly
                  awaiting.
                </div>
              </div>
            </div>
          )
        ) : null}
      </section>
    </div>
  );
}
