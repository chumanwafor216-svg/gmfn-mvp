import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import PageTopNav from "../components/PageTopNav";
import { PrimaryButton, SecondaryButton, StableCtaLink, SubtleButton } from "../components/StableButton";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
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
  currency?: string;
  instruction: CommunityMoneyRoute | null;
  paymentConfirmed: boolean;
  paymentConfirmedAt?: string | null;
  updatedAt?: string | null;
};

const MONEY_IN_UI_STORAGE_KEY = "gmfn.moneyin.sections.v2";
const MONEY_IN_TASK_STORAGE_KEY_PREFIX = "gmfn.moneyin.task.v2";
const MONEY_IN_CURRENCY_OPTIONS = [
  { code: "NGN", label: "Naira" },
  { code: "USD", label: "Dollar" },
  { code: "GBP", label: "Pound" },
  { code: "EUR", label: "Euro" },
  { code: "GHS", label: "Cedi" },
  { code: "KES", label: "Shilling" },
  { code: "UGX", label: "Shilling" },
];
const MONEY_IN_CURRENCY_CODES = new Set(
  MONEY_IN_CURRENCY_OPTIONS.map((item) => item.code)
);

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

function normalizeCurrency(value: unknown, fallback = "NGN"): string {
  const code = safeStr(value).toUpperCase();
  if (MONEY_IN_CURRENCY_CODES.has(code)) return code;
  return fallback;
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

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#9CB4CF",
    fontWeight: 1000,
    letterSpacing: 0.45,
    textTransform: "uppercase",
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
      whiteSpace: "nowrap",
      transition: "none",
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
      whiteSpace: "nowrap",
      transition: "none",
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
    whiteSpace: "nowrap",
    transition: "none",
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
    whiteSpace: "nowrap",
    flex: "0 0 auto",
    transition: "none",
  };
}

function moneyInActionText(name: GsnIconName, label: string) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        whiteSpace: "nowrap",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 28,
          height: 28,
          borderRadius: 11,
          display: "grid",
          placeItems: "center",
          flex: "0 0 auto",
          color: "#0B2D4A",
          background: "rgba(255,255,255,0.96)",
          border: "1px solid rgba(226,192,106,0.30)",
          boxShadow:
            "0 8px 16px rgba(2,6,23,0.10), inset 0 1px 0 rgba(255,255,255,0.96)",
        }}
      >
        <GsnLegacyIcon name={name} size={26} />
      </span>
      <span>{label}</span>
    </span>
  );
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
    instruction: true,
    result: true,
    routes: true,
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

function taskStorageKey(clanId: number, gmfnId: string, currency: string): string {
  return `${MONEY_IN_TASK_STORAGE_KEY_PREFIX}.${gmfnId || "me"}.${clanId || 0}.${normalizeCurrency(currency)}`;
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

function moneyInShell(): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: 1180,
    margin: "0 auto",
    padding: "0 0 40px",
    display: "grid",
    gap: 16,
    color: "#F8FBFF",
  };
}

function moneyInTopRail(isCompact: boolean): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: isCompact ? "64px minmax(0, 1fr) 94px" : "96px minmax(0, 1fr) 126px",
    alignItems: "center",
    gap: isCompact ? 10 : 16,
    padding: isCompact ? "14px 12px" : "18px 20px",
    borderRadius: isCompact ? 22 : 26,
    border: "1px solid rgba(214,170,69,0.18)",
    background:
      "linear-gradient(135deg, rgba(6,24,39,0.99) 0%, rgba(8,35,58,0.98) 58%, rgba(11,45,74,0.96) 100%)",
    boxShadow:
      "0 18px 42px rgba(2,6,23,0.24), inset 0 1px 0 rgba(255,255,255,0.08)",
    isolation: "isolate",
  };
}

function moneyInNavButton(): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(214,228,242,0.78)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(242,247,255,0.96) 100%)",
    color: "#07172C",
    boxShadow:
      "0 14px 28px rgba(2,6,23,0.18), inset 0 1px 0 rgba(255,255,255,0.88)",
    fontWeight: 1000,
    fontSize: 14,
  };
}

function moneyInDarkPanel(padding = 16): React.CSSProperties {
  return {
    borderRadius: 20,
    border: "1px solid rgba(214,228,242,0.16)",
    background:
      "linear-gradient(135deg, rgba(8,31,53,0.98) 0%, rgba(9,44,77,0.96) 100%)",
    padding,
    boxShadow:
      "0 18px 38px rgba(2,6,23,0.24), inset 0 1px 0 rgba(255,255,255,0.05)",
    overflow: "hidden",
  };
}

function moneyInWhitePanel(padding = 16): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(214,228,242,0.72)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.996) 0%, rgba(247,250,255,0.99) 100%)",
    padding,
    color: "#07172C",
    boxShadow:
      "0 18px 38px rgba(2,6,23,0.18), inset 0 1px 0 rgba(255,255,255,0.92)",
    overflow: "hidden",
  };
}

function moneyInStep(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    borderRadius: 999,
    background: active
      ? "linear-gradient(180deg, #F2C766 0%, #D6AA45 100%)"
      : "linear-gradient(180deg, rgba(126,157,198,0.58) 0%, rgba(73,98,130,0.72) 100%)",
    color: active ? "#07172C" : "#E6EEF8",
    fontWeight: 1000,
    boxShadow: active
      ? "0 10px 22px rgba(214,170,69,0.26), inset 0 1px 0 rgba(255,255,255,0.32)"
      : "inset 0 1px 0 rgba(255,255,255,0.10)",
    flex: "0 0 auto",
  };
}

function moneyInIconCircle(color = "#0B63D1"): React.CSSProperties {
  return {
    width: 44,
    height: 44,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: `1px solid ${color}2D`,
    background:
      "radial-gradient(circle at 32% 24%, rgba(255,255,255,0.98) 0%, rgba(244,248,255,0.96) 42%, rgba(231,240,252,0.96) 100%)",
    color,
    fontSize: 25,
    lineHeight: 1,
    boxShadow:
      "0 10px 22px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.92)",
    flex: "0 0 auto",
  };
}

function moneyInFactTile(compact = false): React.CSSProperties {
  return {
    minHeight: compact ? 132 : 104,
    borderRadius: 18,
    border: "1px solid rgba(214,228,242,0.74)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,251,255,0.99) 100%)",
    padding: 12,
    display: "grid",
    gridTemplateColumns: compact ? "1fr" : "46px minmax(0, 1fr)",
    gridTemplateRows: compact ? "44px minmax(0, 1fr)" : undefined,
    gap: compact ? 8 : 10,
    alignItems: "center",
    justifyItems: compact ? "center" : "stretch",
    boxShadow: "0 10px 22px rgba(15,23,42,0.05)",
    overflow: "hidden",
  };
}

function moneyInInputShell(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 104px",
    alignItems: "center",
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.14)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #F9FCFF 100%)",
    boxShadow:
      "0 12px 24px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.86)",
    overflow: "hidden",
  };
}

function moneyInNoticeStrip(color = "#D6AA45"): React.CSSProperties {
  return {
    ...moneyInDarkPanel(14),
    display: "grid",
    gridTemplateColumns: "44px minmax(0, 1fr)",
    gap: 12,
    alignItems: "center",
    borderColor: `${color}55`,
  };
}

export default function PaymentInstructionsPage() {
  const location = useLocation();
  const routeClanId = useMemo(
    () => communityIdFromSearch(location.search),
    [location.search]
  );
  const routeCurrency = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return normalizeCurrency(params.get("currency"));
  }, [location.search]);
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
  const [selectedCurrency, setSelectedCurrency] =
    useState<string>(routeCurrency);
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
    setSelectedCurrency(routeCurrency);
  }, [routeCurrency]);

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
          getCommunityMoneySurface(selectedClanId, gmfnId, selectedCurrency).catch(() => null),
          loadCommunityDepositRoute(selectedClanId, gmfnId, selectedCurrency).catch(() => null),
        ]);

        if (!alive) return;

        setMoneySurface(surface);
        setDepositRoute(route || surface?.depositRoute || null);

        const stored = readLocalJSON<PersistedDepositTask | null>(
          taskStorageKey(selectedClanId, gmfnId, selectedCurrency),
          null
        );

        setAmountInput(safeStr(stored?.amountInput));
        setSelectedCurrency(normalizeCurrency(stored?.currency, selectedCurrency));
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
  }, [selectedClanId, selectedCurrency]);

  useEffect(() => {
    if (!selectedClanId || !currentGmfnId) return;

    writeLocalJSON(taskStorageKey(selectedClanId, currentGmfnId, selectedCurrency), {
      amountInput,
      currency: selectedCurrency,
      instruction,
      paymentConfirmed,
      paymentConfirmedAt,
      updatedAt: new Date().toISOString(),
    } as PersistedDepositTask);
  }, [
    selectedClanId,
    currentGmfnId,
    amountInput,
    selectedCurrency,
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

  const poolCurrency = useMemo(() => {
    return firstTruthy(
      instruction?.currency,
      selectedCurrency,
      depositRoute?.currency,
      moneySurface?.poolCurrency,
      "NGN"
    );
  }, [instruction, depositRoute, moneySurface, selectedCurrency]);

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
        getCommunityMoneySurface(selectedClanId, currentGmfnId, selectedCurrency).catch(() => null),
        loadCommunityDepositRoute(selectedClanId, currentGmfnId, selectedCurrency).catch(() => null),
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
        currency: selectedCurrency,
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
      writeLocalJSON(taskStorageKey(selectedClanId, currentGmfnId, selectedCurrency), null);
    }

    setNotice({
      tone: "success",
      text: "Money In task reset.",
    });
  }

  function handleCurrencyChange(value: string) {
    const nextCurrency = normalizeCurrency(value, selectedCurrency);
    if (nextCurrency === selectedCurrency) return;

    setSelectedCurrency(nextCurrency);
    setInstruction(null);
    setPaymentConfirmed(false);
    setPaymentConfirmedAt(null);
    setNotice({
      tone: "success",
      text: `Currency set to ${nextCurrency}. Generate a fresh instruction for this currency.`,
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
      `GSN ID: ${currentGmfnId || "Awaiting issue"}`,
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
    <div style={moneyInShell()}>
      <section style={moneyInTopRail(isCompact)}>
        <StableCtaLink
          to={routes.dashboard}
          debugId="money-in.header.menu"
          stableHeight={isCompact ? 64 : 68}
          fullWidth
          style={moneyInNavButton()}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: isCompact ? 0 : 8,
              minWidth: 0,
              whiteSpace: "nowrap",
            }}
          >
            <GsnLegacyIcon name="home" size={30} />
            {isCompact ? null : <span>Menu</span>}
          </span>
        </StableCtaLink>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: "#F8FBFF",
              fontSize: isCompact ? 28 : 36,
              fontWeight: 1000,
              letterSpacing: 0,
              lineHeight: 1.02,
              textTransform: "uppercase",
            }}
          >
            Money In
          </div>
          <div
            style={{
              marginTop: 4,
              color: "#C8D8EA",
              fontSize: isCompact ? 17 : 20,
              lineHeight: 1.25,
              fontWeight: 750,
            }}
          >
            Payment Instructions
          </div>
        </div>

        <StableCtaLink
          to={routes.finance}
          debugId="money-in.header.tools"
          stableHeight={isCompact ? 64 : 68}
          fullWidth
          style={moneyInNavButton()}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              minWidth: 0,
              whiteSpace: "nowrap",
            }}
          >
            <GsnLegacyIcon name="briefcase" size={30} />
            <span>Tools</span>
          </span>
        </StableCtaLink>
      </section>

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section style={moneyInDarkPanel(0)}>
        <div
          style={{
            display: "flex",
            gap: 14,
            alignItems: "center",
            padding: isCompact ? 14 : 18,
            border: "1px solid rgba(214,170,69,0.30)",
            borderRadius: 20,
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 999,
              border: "1px solid rgba(214,170,69,0.48)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              color: "#F2C766",
              flex: "0 0 auto",
            }}
          >
            <GsnLegacyIcon name="shop" size={38} />
          </div>
          <div
            style={{
              color: "#F8FBFF",
              fontSize: isCompact ? 20 : 24,
              fontWeight: 1000,
              lineHeight: 1.2,
              minWidth: 0,
            }}
          >
            {communityLabel}
          </div>
        </div>
      </section>

      <section style={moneyInDarkPanel(14)}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: isCompact ? 6 : 12,
            alignItems: "center",
          }}
        >
          {[
            ["1", "Amount", !instruction],
            ["2", "Generate", Boolean(instruction) && !paymentConfirmed],
            ["3", "Pay", Boolean(instruction) && !paymentConfirmed],
            ["4", "Confirm", Boolean(paymentConfirmed || matchedEvent)],
          ].map(([num, label, active], index, steps) => (
            <div
              key={`money-in-step-${num}`}
              style={{
                display: "grid",
                gridTemplateColumns: "34px minmax(0, 1fr)",
                gap: 8,
                alignItems: "center",
                minWidth: 0,
              }}
            >
              <span style={moneyInStep(Boolean(active))}>{num}</span>
              <span
                style={{
                  color: active ? "#F2C766" : "#C8D8EA",
                  fontWeight: 1000,
                  fontSize: isCompact ? 13 : 15,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {label}
              </span>
              {index < steps.length - 1 && !isCompact ? (
                <span
                  style={{
                    position: "relative",
                    left: "calc(100% + 4px)",
                    height: 2,
                    width: 36,
                    background: "rgba(200,216,234,0.38)",
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section style={moneyInDarkPanel(isCompact ? 16 : 22)}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "74px minmax(0, 1fr)",
            gap: 14,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: 999,
              border: "1px solid rgba(214,170,69,0.34)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.05) 100%)",
              color: "#F2C766",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
            }}
          >
            <GsnLegacyIcon
              name={generatingInstruction || refreshingRoute ? "refresh" : "check"}
              size={48}
            />
          </div>
          <div>
            <div
              style={{
                color: "#FFFFFF",
                fontSize: isCompact ? 28 : 34,
                fontWeight: 1000,
                lineHeight: 1.1,
              }}
            >
              {generatingInstruction || refreshingRoute
                ? "Working on instruction"
                : inferredResult.title}
            </div>
            <div
              style={{
                marginTop: 6,
                color: "#C8D8EA",
                fontSize: isCompact ? 15 : 17,
                lineHeight: 1.45,
                fontWeight: 700,
              }}
            >
              {generatingInstruction || refreshingRoute
                ? "GSN is handling this step now. Other money-in actions are held until the response returns."
                : instruction
                  ? inferredResult.detail
                  : "Enter amount to create the exact payment reference."}
            </div>
          </div>
        </div>
      </section>

      <section style={moneyInWhitePanel(12)}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact
              ? "repeat(2, minmax(0, 1fr))"
              : "repeat(4, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {[
            {
              iconName: "wallet" as const,
              label: "Amount",
              value: formattedInputAmount
                ? `${formattedInputAmount} ${poolCurrency}`
                : "Awaiting amount",
              color: "#0B63D1",
            },
            {
              iconName: "tag" as const,
              label: "Reference",
              value: firstTruthy(instruction?.reference, "Awaiting reference"),
              color: "#0B63D1",
            },
            {
              iconName: "bank" as const,
              label: "Route",
              value: communityRailReady
                ? "Ready"
                : "Pay-in pending",
              color: "#0B63D1",
            },
            {
              iconName: "shield" as const,
              label: "Status",
              value: matchedEvent
                ? "Matched"
                : paymentConfirmed
                  ? "Matching records"
                  : "Not confirmed",
              color: matchedEvent ? "#2E9B62" : "#92400E",
            },
          ].map((tile) => (
            <div key={tile.label} style={moneyInFactTile(isCompact)}>
              <span style={moneyInIconCircle(tile.color)} aria-hidden="true">
                <GsnLegacyIcon name={tile.iconName} size={30} />
              </span>
              <span
                style={{
                  minWidth: 0,
                  width: "100%",
                  textAlign: isCompact ? "center" : "left",
                }}
              >
                <span
                  style={{
                    display: "block",
                    color: "#617085",
                    fontWeight: 1000,
                    fontSize: 12,
                    lineHeight: 1.1,
                    textTransform: "uppercase",
                    whiteSpace: "normal",
                  }}
                >
                  {tile.label}
                </span>
                <span
                  style={{
                    display: "block",
                    marginTop: 6,
                    color: tile.color,
                    fontSize: isCompact ? 17 : 19,
                    lineHeight: 1.16,
                    fontWeight: 1000,
                    overflowWrap: tile.label === "Reference" && instruction ? "anywhere" : "normal",
                    wordBreak: "normal",
                    hyphens: "none",
                    maxWidth: "100%",
                  }}
                >
                  {tile.value}
                </span>
              </span>
            </div>
          ))}
        </div>

        <SubtleButton
          onClick={() => toggleSection("overview")}
          minWidth={148}
          stableHeight={52}
          debugId="money-in.toggle-overview"
          style={{
            ...moneyInActionButtonStyle("soft"),
            margin: "12px auto 0",
            border: "1px solid rgba(11,99,209,0.12)",
            background: "linear-gradient(180deg, #FFFFFF 0%, #F4F8FF 100%)",
            color: "#0B63D1",
            boxShadow: "0 10px 22px rgba(15,23,42,0.05)",
          }}
        >
          {moneyInActionText(
            collapsed.overview ? "document" : "lock",
            collapsed.overview ? "Open" : "Hide"
          )}
        </SubtleButton>

        {!collapsed.overview ? (
          <div
            style={{
              marginTop: 10,
              color: "#617085",
              fontSize: 14,
              lineHeight: 1.5,
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            Amount, reference, route, and reconciliation stay together until this
            payment is clearly matched.
          </div>
        ) : null}
      </section>

      <section style={moneyInWhitePanel(isCompact ? 16 : 20)}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "46px minmax(0, 1fr)",
            gap: 12,
            alignItems: "center",
          }}
        >
          <span
            style={{
              width: 42,
              height: 42,
              borderRadius: 999,
              background: "#08233A",
              color: "#F8FBFF",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
            }}
          >
            <GsnLegacyIcon name="document" size={34} />
          </span>
          <h2
            style={{
              margin: 0,
              color: "#07172C",
              fontSize: isCompact ? 23 : 28,
              lineHeight: 1.12,
              fontWeight: 1000,
            }}
          >
            Generate payment instruction
          </h2>
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
          <label style={moneyInInputShell()}>
            <input
              value={amountInput}
              onChange={(e) => {
                setAmountInput(e.target.value);
                setInstruction(null);
                setPaymentConfirmed(false);
                setPaymentConfirmedAt(null);
              }}
              disabled={generatingInstruction}
              placeholder="Enter amount"
              inputMode="decimal"
              style={{
                border: 0,
                outline: "none",
                background: "transparent",
                minHeight: 54,
                padding: "0 16px",
                fontSize: 18,
                color: "#07172C",
                fontWeight: 750,
                minWidth: 0,
              }}
            />
            <select
              value={selectedCurrency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              disabled={generatingInstruction}
              aria-label="Payment currency"
              style={{
                marginRight: 10,
                minHeight: 42,
                borderRadius: 12,
                border: "1px solid rgba(11,31,51,0.12)",
                color: "#07172C",
                fontWeight: 1000,
                fontSize: 15,
                background: "#F8FBFF",
                padding: "0 8px",
                outline: "none",
                cursor: generatingInstruction ? "not-allowed" : "pointer",
              }}
            >
              {MONEY_IN_CURRENCY_OPTIONS.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code}
                </option>
              ))}
            </select>
          </label>

          <div
            style={{
              color: "#617085",
              fontSize: 13,
              lineHeight: 1.45,
              fontWeight: 750,
            }}
          >
            Choose the currency for this instruction. The payment rail shown below
            remains the route GSN can currently reconcile for that currency.
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "minmax(0, 1fr) minmax(0, 0.78fr)" : "minmax(0, 1fr) 280px",
              gap: 12,
              alignItems: "stretch",
            }}
          >
            <PrimaryButton
              onClick={() => void handleGenerateInstruction()}
              disabled={generatingInstruction}
              debugId="money-in.generate-instruction"
              stableHeight={56}
              fullWidth
              style={moneyInActionButtonStyle("primary", generatingInstruction)}
            >
              {moneyInActionText("document", generatingInstruction ? "Generating" : "Generate")}
            </PrimaryButton>

            <SecondaryButton
              onClick={() => void handleRefreshRoute()}
              disabled={generatingInstruction || refreshingRoute}
              debugId="money-in.refresh-route"
              stableHeight={56}
              fullWidth
              style={moneyInActionButtonStyle(
                "secondary",
                generatingInstruction || refreshingRoute
              )}
            >
              {moneyInActionText("refresh", refreshingRoute ? "Refreshing" : "Refresh")}
            </SecondaryButton>
          </div>

          <SubtleButton
            onClick={handleResetTask}
            stableHeight={52}
            debugId="money-in.reset-task"
            style={{
              ...moneyInActionButtonStyle("soft"),
              justifySelf: "center",
              minWidth: 120,
              border: "0",
              background: "transparent",
              boxShadow: "none",
              color: "#0B63D1",
              fontSize: 17,
            }}
          >
            {moneyInActionText("refresh", "Reset")}
          </SubtleButton>
        </div>
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        <div style={moneyInNoticeStrip("#D6AA45")}>
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              background: "rgba(242,199,102,0.12)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#F2C766",
            }}
          >
            <GsnLegacyIcon name="shield" size={30} />
          </span>
          <span
            style={{
              color: "#F8FBFF",
              fontSize: isCompact ? 15 : 16,
              lineHeight: 1.45,
              fontWeight: 800,
            }}
          >
            GSN is non-custodial. Pay only with the exact generated reference.
          </span>
        </div>

        <div style={moneyInNoticeStrip("#2D7CFF")}>
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              background: "rgba(107,167,255,0.12)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6BA7FF",
            }}
          >
            <GsnLegacyIcon name="alert" size={30} />
          </span>
          <span
            style={{
              color: "#D8E7FA",
              fontSize: isCompact ? 15 : 16,
              lineHeight: 1.45,
              fontWeight: 800,
            }}
          >
            Stay on this route until payment is confirmed or clearly awaiting reconciliation.
          </span>
        </div>
      </section>

      {instruction ? (
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
            stableHeight={52}
            debugId="money-in.toggle-instruction"
            style={moneyInCollapseButtonStyle()}
          >
            {moneyInActionText(
              collapsed.instruction ? "document" : "lock",
              collapsed.instruction ? "Open" : "Hide"
            )}
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
                    stableHeight={52}
                    fullWidth
                    style={moneyInActionButtonStyle("primary")}
                  >
                    {moneyInActionText("copy", "Copy ref")}
                  </PrimaryButton>

                  <SecondaryButton
                    onClick={handleCopyInstruction}
                    debugId="money-in.copy-instruction"
                    stableHeight={52}
                    fullWidth
                    style={moneyInActionButtonStyle("secondary")}
                  >
                    {moneyInActionText("copy", "Copy text")}
                  </SecondaryButton>

                  <SecondaryButton
                    onClick={handleConfirmPaymentMade}
                    disabled={paymentConfirmed}
                    debugId="money-in.confirm-paid"
                    stableHeight={52}
                    fullWidth
                    style={moneyInActionButtonStyle("secondary", paymentConfirmed)}
                  >
                    {moneyInActionText("check", paymentConfirmed ? "Declared" : "Confirm paid")}
                  </SecondaryButton>
                </div>
              </div>
            </div>
          )
        ) : null}
      </section>
      ) : null}

      {instruction ? (
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
            stableHeight={52}
            debugId="money-in.toggle-result"
            style={moneyInCollapseButtonStyle()}
          >
            {moneyInActionText(
              collapsed.result ? "document" : "lock",
              collapsed.result ? "Open" : "Hide"
            )}
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
                  stableHeight={52}
                  debugId="money-in.reset-task"
                  style={moneyInActionButtonStyle("soft")}
                >
                  {moneyInActionText("refresh", "Reset")}
                </SubtleButton>
              </div>
            </div>
          </div>
        ) : null}
      </section>
      ) : null}

      {moneyInCanWidenRoutes ? (
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
            stableHeight={52}
            debugId="money-in.toggle-routes"
            style={moneyInCollapseButtonStyle()}
          >
            {moneyInActionText(
              collapsed.routes ? "document" : "lock",
              collapsed.routes ? "Open" : "Hide"
            )}
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
                stableHeight={52}
                fullWidth
                style={moneyInActionButtonStyle("primary")}
              >
                {moneyInActionText("wallet", "Finance")}
              </StableCtaLink>

              <StableCtaLink
                to={routes.moneyOut}
                debugId="money-in.route.money-out"
                stableHeight={52}
                fullWidth
                style={moneyInActionButtonStyle("secondary")}
              >
                {moneyInActionText("bank", "Money Out")}
              </StableCtaLink>

              <StableCtaLink
                to={routes.paymentRails}
                debugId="money-in.route.payment-rails"
                stableHeight={52}
                fullWidth
                style={moneyInActionButtonStyle("secondary")}
              >
                {moneyInActionText("briefcase", "Rails")}
              </StableCtaLink>

              <StableCtaLink
                to={routes.payoutDetails}
                debugId="money-in.route.payout-details"
                stableHeight={52}
                fullWidth
                style={moneyInActionButtonStyle("secondary")}
              >
                {moneyInActionText("document", "Payout")}
              </StableCtaLink>

              <StableCtaLink
                to={routes.loans}
                debugId="money-in.route.loans"
                stableHeight={52}
                fullWidth
                style={moneyInActionButtonStyle("secondary")}
              >
                {moneyInActionText("community", "Loans")}
              </StableCtaLink>

              <StableCtaLink
                to={routes.marketplace}
                debugId="money-in.route.marketplace"
                stableHeight={52}
                fullWidth
                style={moneyInActionButtonStyle("secondary")}
              >
                {moneyInActionText("shop", "Market")}
              </StableCtaLink>

              <StableCtaLink
                to={routes.community}
                debugId="money-in.route.community"
                stableHeight={52}
                fullWidth
                style={moneyInActionButtonStyle("secondary")}
              >
                {moneyInActionText("home", "Community")}
              </StableCtaLink>

              <StableCtaLink
                to={routes.notifications}
                debugId="money-in.route.notifications"
                stableHeight={52}
                fullWidth
                style={moneyInActionButtonStyle("secondary")}
              >
                {moneyInActionText("alert", "Inbox")}
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
      ) : null}
    </div>
  );
}
