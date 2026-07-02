import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import GsnSupportContact from "../components/GsnSupportContact";
import PageTopNav from "../components/PageTopNav";
import { PrimaryButton, SecondaryButton, StableCtaLink, SubtleButton } from "../components/StableButton";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import { navigateWithOrigin } from "../lib/nav";
import * as api from "../lib/api";
import { communityIdFromSearch } from "../lib/communityRouteContext";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import { buildGsnPaymentInstructionPackage } from "../lib/gsnSnapshotPaper";
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

const WITHDRAWAL_UI_STORAGE_KEY = "gmfn.withdrawal.sections.v7";
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

function normalizeMemberGmfnId(value: any): string {
  const raw = safeStr(value).toUpperCase().replace(/^GSN-/, "GMFN-");
  if (!/^GMFN-[A-Z]-[A-Z0-9-]+$/.test(raw)) return "";
  return raw.startsWith("GMFN-C-") ? "" : raw;
}

function firstMemberGmfnId(...values: any[]): string {
  for (const value of values) {
    const gmfnId = normalizeMemberGmfnId(value);
    if (gmfnId) return gmfnId;
  }
  return "";
}

function resolveMemberGmfnId(me: any, currentClan: any): string {
  return firstMemberGmfnId(
    me?.gmfn_id,
    me?.gmfnId,
    me?.profile?.gmfn_id,
    currentClan?.current_member_gmfn_id,
    currentClan?.currentUserGmfnId,
    currentClan?.member_gmfn_id,
    currentClan?.memberGmfnId,
    currentClan?.membership?.gmfn_id,
    currentClan?.membership?.member_gmfn_id,
    currentClan?.member?.gmfn_id,
    currentClan?.profile?.member_gmfn_id,
    currentClan?.profile?.gmfn_id,
    currentClan?.user?.gmfn_id,
    currentClan?.gmfn_id,
    (api as any).getStoredGmfnId?.()
  );
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
    sortCode: "",
    phoneNumber: "",
    country: "",
    currency: "",
    note: "",
  };
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
      bg === "#FFFFFF" || bg === "#F8FBFF" || bg === "#FCFEFF"
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
      bg === "#FFFFFF" || bg === "#F8FBFF"
        ? "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)"
        : bg,
    padding: 14,
    boxShadow:
      "0 14px 28px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function railPackageCardStyle(): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(202,168,84,0.30)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,251,255,0.98) 58%, rgba(239,247,255,0.96) 100%)",
    padding: 14,
    boxShadow:
      "0 18px 36px rgba(8,35,58,0.12), inset 0 1px 0 rgba(255,255,255,0.96)",
  };
}

function railFactGridStyle(): React.CSSProperties {
  return {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
    gap: 9,
  };
}

function railFactCardStyle(wide = false): React.CSSProperties {
  return {
    gridColumn: wide ? "1 / -1" : undefined,
    minHeight: wide ? 58 : 72,
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,252,255,0.98) 100%)",
    padding: "11px 12px",
    boxShadow:
      "0 12px 22px rgba(8,35,58,0.07), inset 0 1px 0 rgba(255,255,255,0.92)",
    overflow: "hidden",
  };
}

function railFactLabelStyle(): React.CSSProperties {
  return {
    color: "#6F8194",
    fontSize: 11,
    fontWeight: 950,
    lineHeight: 1.1,
    textTransform: "uppercase",
  };
}

function railFactValueStyle(): React.CSSProperties {
  return {
    marginTop: 6,
    color: "#08233A",
    fontSize: 15,
    fontWeight: 900,
    lineHeight: 1.25,
    overflowWrap: "anywhere",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#C9DAEC",
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

function railLineParts(line: string): { label: string; value: string; wide: boolean } {
  const text = safeStr(line);
  const index = text.indexOf(":");

  if (index > 0) {
    const label = safeStr(text.slice(0, index));
    const value = safeStr(text.slice(index + 1));
    return {
      label: label || "Rail note",
      value: value || "Not stated",
      wide: value.length > 34,
    };
  }

  return {
    label: "Rail note",
    value: text || "Not stated",
    wide: true,
  };
}

function iconLabel(icon: GsnIconName, label: string): React.ReactElement {
  return (
    <div
      style={{
        ...sectionLabel(),
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 28,
          height: 28,
          borderRadius: 10,
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
        <GsnLegacyIcon name={icon} size={26} />
      </span>
      <span>{label}</span>
    </div>
  );
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
      : "0 14px 28px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
    fontWeight: 900,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.86 : 1,
    whiteSpace: "nowrap",
    transition: "none",
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
    whiteSpace: "nowrap",
    flex: "0 0 auto",
    transition: "none",
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
    color: "#DCE8F5",
    fontSize: 14.5,
    lineHeight: 1.45,
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
    overview: true,
    request: false,
    destination: true,
    rail: true,
    result: true,
    routes: true,
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

function isPlaceholderRailValue(value: any): boolean {
  const text = safeStr(value).toLowerCase();
  return (
    !text ||
    text === "to be assigned" ||
    text === "gsn settlement" ||
    text === "gsn settlement rail" ||
    text === "bank transfer" ||
    text === "payment setup is not ready for this region yet."
  );
}

function railValue(value: any): string {
  return isPlaceholderRailValue(value) ? "" : safeStr(value);
}

function settlementReady(settlement: CommunityMoneySettlement | null): boolean {
  if (!settlement) return false;

  const hasBankAccount =
    Boolean(railValue(settlement.bankName)) &&
    Boolean(railValue(settlement.accountName)) &&
    Boolean(railValue(settlement.accountNumber));
  const hasMobileMoney =
    Boolean(railValue(settlement.mobileMoneyProvider)) &&
    Boolean(railValue(settlement.mobileMoneyNumber));
  const hasInternationalRail =
    Boolean(railValue(settlement.iban)) ||
    (Boolean(railValue(settlement.swiftBic)) &&
      (Boolean(railValue(settlement.bankCode)) ||
        Boolean(railValue(settlement.branchCode)) ||
        Boolean(railValue(settlement.routingNumber))));

  return hasBankAccount || hasMobileMoney || hasInternationalRail;
}

function visibleSettlementLines(settlement: CommunityMoneySettlement | null): string[] {
  if (!settlement) return [];
  if (!settlementReady(settlement)) return [];

  return [
    railValue(settlement.railName) ? `Rail: ${railValue(settlement.railName)}` : "",
    railValue(settlement.bankName) ? `Bank: ${railValue(settlement.bankName)}` : "",
    railValue(settlement.accountName)
      ? `Account name: ${railValue(settlement.accountName)}`
      : "",
    railValue(settlement.accountNumber)
      ? `Account number: ${railValue(settlement.accountNumber)}`
      : "",
    railValue(settlement.sortCode) ? `Sort code: ${railValue(settlement.sortCode)}` : "",
    railValue(settlement.routingNumber)
      ? `Routing number: ${railValue(settlement.routingNumber)}`
      : "",
    railValue(settlement.iban) ? `IBAN: ${railValue(settlement.iban)}` : "",
    railValue(settlement.swiftBic) ? `SWIFT/BIC: ${railValue(settlement.swiftBic)}` : "",
    railValue(settlement.mobileMoneyProvider)
      ? `Mobile money: ${railValue(settlement.mobileMoneyProvider)}`
      : "",
    railValue(settlement.mobileMoneyNumber)
      ? `Mobile money number: ${railValue(settlement.mobileMoneyNumber)}`
      : "",
    railValue(settlement.country) ? `Country: ${railValue(settlement.country)}` : "",
    railValue(settlement.supportNote) ? railValue(settlement.supportNote) : "",
  ].filter(Boolean);
}

function splitRouteLines(route: CommunityMoneyRoute | null): string[] {
  if (!route) return [];

  return safeStr(route.detail)
    .split("\n")
    .map((line) => safeStr(line))
    .filter(Boolean);
}

function destinationReady(
  destination: CommunitySettlementDestination,
  needsSortCode = false
): boolean {
  return Boolean(
    safeStr(destination.destinationName) &&
      safeStr(destination.bankName) &&
      safeStr(destination.accountNumber) &&
      (!needsSortCode || safeStr(destination.sortCode))
  );
}

function destinationCountryHint(destination: CommunitySettlementDestination, me: any): string {
  return firstTruthy(
    destination.country,
    me?.country,
    me?.country_of_residence,
    me?.residence_country,
    me?.profile?.country,
    me?.phone_country_hint,
    me?.locale_country_hint
  );
}

function needsUkSortCode(
  destination: CommunitySettlementDestination,
  me: any,
  currency: string
): boolean {
  const hint = destinationCountryHint(destination, me).toLowerCase();
  const normalizedCurrency = safeStr(destination.currency || currency).toUpperCase();
  const phone = safeStr(destination.phoneNumber || me?.phone_e164 || me?.phone);
  return (
    normalizedCurrency === "GBP" ||
    phone.startsWith("+44") ||
    hint === "gb" ||
    hint === "uk" ||
    hint.includes("united kingdom") ||
    hint.includes("england") ||
    hint.includes("scotland") ||
    hint.includes("wales") ||
    hint.includes("northern ireland")
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

function routeTarget(
  intent: CtaIntent,
  communityId: number,
  debugId: string,
  hash?: string
): string {
  return String(resolveCtaTarget(intent, { communityId, debugId, hash }).to);
}

function addRouteQuery(target: string, extras: Record<string, string>): string {
  const raw = String(target || "").trim();
  if (!raw) return raw;

  const [baseWithQuery, hash = ""] = raw.split("#");
  const [pathname, search = ""] = baseWithQuery.split("?");
  const query = new URLSearchParams(search);

  Object.entries(extras).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });

  const nextSearch = query.toString();
  return `${pathname}${nextSearch ? `?${nextSearch}` : ""}${
    hash ? `#${hash}` : ""
  }`;
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
      supportStart: addRouteQuery(
        routeTarget(
          "marketplace",
          selectedClanId,
          "money-out.route.support-start",
          "marketplace-loans-support"
        ),
        {
          support_flow: "money-out",
          focus: "support",
        }
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
  const [destinationNotice, setDestinationNotice] = useState<{
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
  const [decisionChecked, setDecisionChecked] = useState(false);

  useEffect(() => {
    if (routeClanId > 0) {
      (api as any).setSelectedClanId?.(routeClanId);
    }
  }, [routeClanId]);
  const [latestWithdrawalResult, setLatestWithdrawalResult] = useState<any | null>(
    null
  );
  const withdrawalMountedRef = useRef(false);
  const withdrawalLoadSeqRef = useRef(0);
  const withdrawalLoadContextRef = useRef("");
  const withdrawalActionContextRef = useRef("");

  useEffect(() => {
    withdrawalMountedRef.current = true;
    return () => {
      withdrawalMountedRef.current = false;
      withdrawalLoadSeqRef.current += 1;
    };
  }, []);

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

  const currentGmfnId = useMemo(() => {
    return resolveMemberGmfnId(me, currentClan);
  }, [me, currentClan]);

  useEffect(() => {
    withdrawalActionContextRef.current = [
      `community:${selectedClanId || "none"}`,
      `gmfn:${currentGmfnId || "none"}`,
    ].join("|");
  }, [selectedClanId, currentGmfnId]);

  const loadPage = useCallback(async (showLoading = true) => {
    const contextKey = `community:${selectedClanId || "none"}`;
    const loadSeq = withdrawalLoadSeqRef.current + 1;
    withdrawalLoadSeqRef.current = loadSeq;
    withdrawalLoadContextRef.current = contextKey;

    function isCurrentWithdrawalLoad() {
      return (
        withdrawalMountedRef.current &&
        withdrawalLoadSeqRef.current === loadSeq &&
        withdrawalLoadContextRef.current === contextKey
      );
    }

    if (showLoading) setLoading(true);
    if (showLoading) {
      setLoadingRoute(false);
      setSavingDestination(false);
      setSubmittingWithdrawal(false);
      setCurrentClan(null);
      setMoneySurface(null);
      setWithdrawalRoute(null);
      setDestination(defaultDestination());
      setDestinationNotice(null);
    }

    try {
      const meRes =
        typeof (api as any).getMe === "function"
          ? await (api as any).getMe().catch(() => null)
          : null;

      const clanRes =
        typeof (api as any).getCurrentClan === "function"
          ? await (api as any).getCurrentClan().catch(() => null)
          : null;

      if (!isCurrentWithdrawalLoad()) return;

      setMe(meRes || null);
      setCurrentClan(clanRes || null);

      const resolvedGmfnId = resolveMemberGmfnId(meRes, clanRes);

      if (resolvedGmfnId && typeof (api as any).setStoredGmfnId === "function") {
        (api as any).setStoredGmfnId(resolvedGmfnId);
      }

      if (selectedClanId && resolvedGmfnId) {
        const surface = await getCommunityMoneySurface(
          selectedClanId,
          resolvedGmfnId,
          "NGN"
        ).catch(() => null);

        if (!isCurrentWithdrawalLoad()) return;

        setMoneySurface(surface);
        setWithdrawalRoute(surface?.withdrawalRoute || null);
        const nextDestination = surface?.payoutDestination || defaultDestination();
        setDestination({
          ...nextDestination,
          country: firstTruthy(
            nextDestination.country,
            meRes?.country,
            meRes?.country_of_residence,
            meRes?.residence_country,
            meRes?.profile?.country,
            meRes?.phone_country_hint,
            meRes?.locale_country_hint
          ),
          currency: firstTruthy(nextDestination.currency, surface?.poolCurrency),
        });
      } else {
        setMoneySurface(null);
        setWithdrawalRoute(null);
        setDestination(defaultDestination());
      }
    } finally {
      if (showLoading && isCurrentWithdrawalLoad()) setLoading(false);
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

  const poolCurrency = safeStr(moneySurface?.poolCurrency || "NGN");
  const communityPoolDisplay = `${safeStr(moneySurface?.poolAmount || "0.00")} ${poolCurrency}`;
  const effectiveAvailableText = safeStr(moneySurface?.effectiveAvailable || "");
  const withdrawableNowText = safeStr(
    moneySurface?.withdrawableNow || effectiveAvailableText
  );
  const effectiveAvailableKnown = Boolean(withdrawableNowText);
  const reservedPoolDisplay = `${safeStr(moneySurface?.reservedPool || "0.00")} ${poolCurrency}`;
  const requestedAmount = parseMoneyNumber(amountInput);
  const effectiveAvailableNumber = effectiveAvailableKnown
    ? parseMoneyNumber(withdrawableNowText)
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

  const communityRailReady = settlementReady(communitySettlement);

  const destinationCountry = destinationCountryHint(destination, me);
  const payoutNeedsSortCode = needsUkSortCode(destination, me, poolCurrency);
  const payoutReady = destinationReady(destination, payoutNeedsSortCode);

  const settlementRouteLines = useMemo(
    () => splitRouteLines(activeWithdrawalRoute),
    [activeWithdrawalRoute]
  );

  const communitySettlementLines = useMemo(
    () => visibleSettlementLines(communitySettlement),
    [communitySettlement]
  );

  const guidedState = useMemo(() => {
    if (!selectedClanId || !currentGmfnId) {
      return {
        tone: "red" as const,
        step: "Context",
        title: "Community or member identity is not ready.",
        detail:
          "Keep the correct community active and sign in with a visible member GSN ID before continuing.",
      };
    }

    if (requestedAmount <= 0) {
      return {
        tone: "blue" as const,
        step: "Amount",
        title: "Enter how much you want to withdraw.",
        detail:
          "GSN checks this against your available balance before anything else.",
      };
    }

    if (!effectiveAvailableKnown) {
      return {
        tone: "blue" as const,
        step: "Reading",
        title: "Waiting for the effective-available pool reading.",
        detail:
          "GSN needs the available-balance reading before it can create a request reference or open support.",
      };
    }

    if (!requiresSupport) {
      return {
        tone: "green" as const,
        step: "Own money",
        title: "This can be withdrawn from your available balance.",
        detail:
          "No supporter is needed. Press Continue to create the withdrawal request reference when your payout account is ready.",
      };
    }

    return {
      tone: "gold" as const,
      step: "Needs support",
      title: "Your available balance is not enough for this amount.",
      detail:
        "Open support so GSN can guide the support-backed path.",
    };
  }, [
    selectedClanId,
    currentGmfnId,
    requestedAmount,
    effectiveAvailableKnown,
    requiresSupport,
  ]);

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

    const actionContext = withdrawalActionContextRef.current;
    setLoadingRoute(true);

    try {
      const route = await loadCommunityWithdrawalRoute(
        selectedClanId,
        currentGmfnId,
        { currency: poolCurrency }
      ).catch(() => null);

      if (
        !withdrawalMountedRef.current ||
        withdrawalActionContextRef.current !== actionContext
      ) {
        return;
      }

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
      if (
        withdrawalMountedRef.current &&
        withdrawalActionContextRef.current === actionContext
      ) {
        setLoadingRoute(false);
      }
    }
  }

  async function handleSaveDestination() {
    if (!selectedClanId || !currentGmfnId) {
      showNotice("error", "Community or GSN ID is not visible yet.");
      setDestinationNotice({
        tone: "error",
        text: "Community or GSN ID is not visible yet.",
      });
      return;
    }

    const actionContext = withdrawalActionContextRef.current;
    setSavingDestination(true);
    setDestinationNotice(null);

    try {
      const saved = await saveCommunitySettlementDestination(
        selectedClanId,
        currentGmfnId,
        {
          ...destination,
          country: firstTruthy(destination.country, destinationCountry),
          currency: firstTruthy(destination.currency, poolCurrency),
        }
      );

      if (
        !withdrawalMountedRef.current ||
        withdrawalActionContextRef.current !== actionContext
      ) {
        return;
      }

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
      setDestinationNotice({
        tone: "success",
        text: "Payout account saved here. GSN will use these details only after approval.",
      });
    } catch (err: any) {
      if (
        !withdrawalMountedRef.current ||
        withdrawalActionContextRef.current !== actionContext
      ) {
        return;
      }

      const errorText =
        safeStr(err?.message) ||
        "Personal payout account could not be saved right now.";
      showNotice(
        "error",
        errorText
      );
      setDestinationNotice({
        tone: "error",
        text: errorText,
      });
    } finally {
      if (
        withdrawalMountedRef.current &&
        withdrawalActionContextRef.current === actionContext
      ) {
        setSavingDestination(false);
      }
    }
  }

  function handleDestinationDraftChange(
    field: keyof CommunitySettlementDestination,
    value: string
  ) {
    setDestination((prev) => ({
      ...prev,
      [field]: value,
    }));
    setDestinationNotice(null);
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

    if (requiresSupport) {
      showNotice(
        "error",
        "Your available balance is not enough for this amount. Open support instead."
      );
      return;
    }

    if (!payoutReady) {
      setCollapsed((prev) => ({ ...prev, destination: false }));
      showNotice(
        "error",
        "Add your payout account first so GSN knows where this withdrawal should go."
      );
      return;
    }

    const actionContext = withdrawalActionContextRef.current;
    setSubmittingWithdrawal(true);

    try {
      const res = await requestPoolWithdrawal({
        clanId: selectedClanId,
        amount: fmtMoney(requestedAmount),
        currency: poolCurrency,
        note: safeStr(noteInput || "Normal withdrawal request reference"),
      });

      if (
        !withdrawalMountedRef.current ||
        withdrawalActionContextRef.current !== actionContext
      ) {
        return;
      }

      if (!res) {
        showNotice("error", "Withdrawal request reference could not be created.");
        return;
      }

      setLatestWithdrawalResult(res);
      await loadPage(false);

      showNotice(
        "success",
        "Withdrawal request reference created. Keep it visible; GSN finance reviews and reconciles before money moves."
      );
    } catch (err: any) {
      const message = safeStr(err?.message || err?.detail || err);
      if (
        !withdrawalMountedRef.current ||
        withdrawalActionContextRef.current !== actionContext
      ) {
        return;
      }

      if (/insufficient (withdrawable|effective) pool balance/i.test(message)) {
        persistSupportHandoff();
        showNotice(
          "error",
          "Your withdrawable balance is not enough now. Opening Support Requests for this marketplace."
        );
        navigateWithOrigin(navigate, routes.supportStart, location);
        return;
      }

      showNotice(
        "error",
        message || "Withdrawal request reference could not be created."
      );
    } finally {
      if (
        withdrawalMountedRef.current &&
        withdrawalActionContextRef.current === actionContext
      ) {
        setSubmittingWithdrawal(false);
      }
    }
  }

  async function handleCheckWithdrawalPath() {
    if (!selectedClanId) {
      showNotice("error", "Select a community first.");
      return;
    }

    if (requestedAmount <= 0) {
      showNotice("error", "Enter a valid amount.");
      return;
    }

    if (!effectiveAvailableKnown) {
      showNotice("error", "Wait for the available balance first.");
      return;
    }

    setDecisionChecked(true);

    if (requiresSupport) {
      persistSupportHandoff();
      showNotice(
        "success",
        "Your available balance is not enough. Opening Support Requests for this marketplace."
      );
      navigateWithOrigin(navigate, routes.supportStart, location);
      return;
    }

    await handleDirectWithdrawal();
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

    if (!requiresSupport) {
      showNotice("error", "This amount fits your available balance. Press Continue to create the withdrawal request reference here.");
      return;
    }

    persistSupportHandoff();

    navigateWithOrigin(navigate, routes.supportStart, location);
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
    const lines = communitySettlementLines;
    if (lines.length <= 0) {
      showNotice("error", "Community withdrawal rail is not ready.");
      return;
    }

    const text = buildGsnPaymentInstructionPackage({
      title: "GSN Community Withdrawal Rail",
      purpose: "Identify the community rail connected to the Money Out page.",
      memberName,
      gsnId: currentGmfnId,
      communityName: communityLabel,
      communityId: publicCommunityId,
      routeName: "Money Out - Community Rail",
      status: guidedState.step,
      detailLines: lines,
    });

    copyText(text);
    showNotice("success", "Community withdrawal rail copied.");
  }

  function handleCopyPayoutAccount() {
    const lines = [
      destination.destinationName
        ? `Account name: ${destination.destinationName}`
        : "",
      destination.bankName ? `Bank: ${destination.bankName}` : "",
      destination.accountNumber
        ? `Account number: ${destination.accountNumber}`
        : "",
      destination.sortCode ? `UK sort code: ${destination.sortCode}` : "",
      destination.phoneNumber ? `Phone: ${destination.phoneNumber}` : "",
      firstTruthy(destination.country, destinationCountry)
        ? `Country: ${firstTruthy(destination.country, destinationCountry)}`
        : "",
      destination.note ? `Note: ${destination.note}` : "",
    ]
      .filter(Boolean);

    if (lines.length <= 0) {
      showNotice("error", "Personal payout account is still empty.");
      return;
    }

    const text = buildGsnPaymentInstructionPackage({
      title: "GSN Payout Account Summary",
      purpose: "Review the member payout destination saved for approved withdrawals.",
      memberName,
      gsnId: currentGmfnId,
      communityName: communityLabel,
      communityId: publicCommunityId,
      routeName: "Money Out - Payout Destination",
      status: guidedState.step,
      detailLines: lines,
    });

    copyText(text);
    showNotice("success", "Personal payout account copied.");
  }

  function handleCopyWithdrawalSummary() {
    const lines = [
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
        : "Withdrawal request reference can be created",
      destination.destinationName
        ? `Payout account: ${destination.destinationName}`
        : "",
      destination.sortCode ? `UK sort code: ${destination.sortCode}` : "",
      communitySettlement?.bankName
        ? `Community rail: ${communitySettlement.bankName}`
        : "",
    ]
      .filter(Boolean);

    if (lines.length <= 0) {
      showNotice("error", "Nothing is ready to copy yet.");
      return;
    }

    const text = buildGsnPaymentInstructionPackage({
      title: "GSN Withdrawal Summary",
      purpose: "Keep the requested Money Out amount, payout destination, and current step together.",
      memberName,
      gsnId: currentGmfnId,
      communityName: communityLabel,
      communityId: publicCommunityId,
      routeName: "Money Out",
      amount: requestedAmount > 0
        ? `${fmtMoney(requestedAmount)} ${poolCurrency}`
        : "",
      status: guidedState.step,
      detailLines: lines,
    });

    copyText(text);
    showNotice("success", "Withdrawal summary copied.");
  }

  function handleResetTask() {
    setAmountInput("");
    setNoteInput("");
    setDecisionChecked(false);
    setLatestWithdrawalResult(null);
    showNotice("success", "Withdrawal task reset.");
  }

  const requestedAmountDisplay =
    requestedAmount > 0 ? `${fmtMoney(requestedAmount)} ${poolCurrency}` : "Awaiting amount";
  const effectiveAvailableDisplay = effectiveAvailableKnown
    ? `${withdrawableNowText} ${poolCurrency}`
    : "Awaiting pool reading";
  const identityReady = Boolean(selectedClanId && currentGmfnId);
  const supportGapDisplay =
    requestedAmount <= 0
      ? "Awaiting amount"
      : !decisionChecked
      ? "Press Continue"
      : !effectiveAvailableKnown
      ? "Awaiting pool reading"
      : requiresSupport
      ? `${fmtMoney(supportGap)} ${poolCurrency}`
      : `0.00 ${poolCurrency}`;
  const pathDisplay =
    requestedAmount <= 0
      ? "Awaiting amount"
      : !decisionChecked
      ? "Press Continue"
      : !effectiveAvailableKnown
      ? "Awaiting pool reading"
      : requiresSupport
      ? "Support-backed"
      : "Normal withdrawal";
  const latestResultText = latestWithdrawalResult
    ? firstTruthy(
        latestWithdrawalResult?.reference
          ? `Request reference: ${safeStr(latestWithdrawalResult.reference)}`
          : "",
        latestWithdrawalResult?.status,
        latestWithdrawalResult?.state,
        "Withdrawal request reference created"
      )
    : "Awaiting";

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
          title="Normal Withdrawal"
          subtitle="Loading your available-balance check..."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.marketplace}
          backLabel="Marketplace"
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.45 }}>
            Loading withdrawal page...
          </div>
        </section>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 920,
        margin: "0 auto",
        padding: isCompact ? "0 4px 36px" : "0 0 44px",
        display: "grid",
        gap: 16,
      }}
    >
      <PageTopNav
        sectionLabel="Money Out"
        title="Normal Withdrawal"
        subtitle="Withdraw your available money. Support opens only when the amount is above your balance."
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.marketplace}
        backLabel="Marketplace"
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      {(!isCompact || !identityReady || submittingWithdrawal) ? (
      <div
        style={{
          ...softCard(
            identityReady
              ? "linear-gradient(180deg, rgba(11,48,39,0.94) 0%, rgba(13,35,56,0.96) 100%)"
              : "linear-gradient(180deg, rgba(58,38,21,0.94) 0%, rgba(13,35,56,0.96) 100%)"
          ),
          border: identityReady
            ? "1px solid rgba(46,155,98,0.28)"
            : "1px solid rgba(214,170,69,0.44)",
          display: "grid",
          gridTemplateColumns: "52px minmax(0, 1fr) 28px",
          gap: 14,
          alignItems: "center",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            display: "grid",
            placeItems: "center",
            background: identityReady
              ? "rgba(46,155,98,0.14)"
              : "rgba(214,170,69,0.18)",
          }}
        >
          <GsnLegacyIcon
            name={identityReady ? "check" : "alert"}
            size={36}
          />
        </div>
        <div>
          <div
            style={{
              color: identityReady ? "#D8F6E4" : "#F6D878",
              fontSize: 18,
              fontWeight: 1000,
              lineHeight: 1.2,
            }}
          >
            {identityReady ? guidedState.title : "Identity not ready"}
          </div>
          <div style={{ marginTop: 4, ...helperText(), lineHeight: 1.45 }}>
            {submittingWithdrawal
              ? "Submitting now. Other Money Out actions stay held until the response returns."
              : identityReady
              ? guidedState.detail
              : "Choose the right community before withdrawing."}
          </div>
        </div>
        <div aria-hidden="true" />
      </div>
      ) : null}

      {!isCompact ? (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        {!effectiveAvailableKnown ? (
          <PrimaryButton
            disabled
            debugId="money-out.front-awaiting-pool"
            stableHeight={52}
            fullWidth
            style={moneyOutActionButtonStyle("primary", true)}
          >
            Awaiting
          </PrimaryButton>
        ) : !decisionChecked ? (
          <PrimaryButton
            onClick={() => void handleCheckWithdrawalPath()}
            disabled={
              requestedAmount <= 0
            }
            debugId="money-out.front-continue-direct"
            stableHeight={52}
            fullWidth
            style={moneyOutActionButtonStyle(
              "primary",
              requestedAmount <= 0
            )}
          >
            Continue
          </PrimaryButton>
        ) : !requiresSupport ? (
          <PrimaryButton
            onClick={() => void handleDirectWithdrawal()}
            disabled={
              submittingWithdrawal ||
              requestedAmount <= 0 ||
              Boolean(latestWithdrawalResult)
            }
            debugId="money-out.front-continue-direct"
            stableHeight={52}
            fullWidth
            style={moneyOutActionButtonStyle(
              "primary",
              submittingWithdrawal ||
                requestedAmount <= 0 ||
                Boolean(latestWithdrawalResult)
            )}
          >
            {latestWithdrawalResult
              ? "Reference ready"
              : submittingWithdrawal
              ? "Creating..."
              : "Create reference"}
          </PrimaryButton>
        ) : (
          <PrimaryButton
            onClick={handleContinueToSupportPath}
            disabled={requestedAmount <= 0}
            debugId="money-out.front-open-support"
            stableHeight={52}
            fullWidth
            style={moneyOutActionButtonStyle(
              "primary",
              requestedAmount <= 0
            )}
          >
            Open support
          </PrimaryButton>
        )}

        <SecondaryButton
          onClick={handleCopyWithdrawalSummary}
          debugId="money-out.front-copy-summary"
          stableHeight={52}
          fullWidth
          style={moneyOutActionButtonStyle("secondary")}
        >
          Copy summary
        </SecondaryButton>

        <SubtleButton
          onClick={handleResetTask}
          stableHeight={52}
          debugId="money-out.front-reset-task"
          fullWidth
          style={moneyOutActionButtonStyle("soft")}
        >
          Reset
        </SubtleButton>
      </div>
      ) : null}

      {!isCompact ? (
      <section
        style={{
          ...pageCard("linear-gradient(180deg, #10243A 0%, #173654 52%, #26527C 100%)"),
          padding: 20,
          borderRadius: 24,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "112px minmax(0, 1fr)",
            gap: 18,
            alignItems: "center",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              display: "grid",
              placeItems: "center",
              color: "#A9D5FF",
              fontSize: 44,
              background:
                "radial-gradient(circle at 30% 20%, rgba(49,132,255,0.42), rgba(16,54,94,0.9) 64%, rgba(7,20,36,0.98))",
              border: "1px solid rgba(78,143,231,0.34)",
              boxShadow:
                "0 22px 42px rgba(2,6,23,0.32), inset 0 1px 0 rgba(255,255,255,0.10)",
            }}
          >
            <GsnLegacyIcon name="wallet" size={64} />
          </div>

          <div>
            <div style={{ ...sectionLabel(), color: "#87BDFD" }}>Money Out</div>

            <div
              style={{
                marginTop: 5,
                color: "#F8FBFF",
                fontWeight: 1000,
                fontSize: 40,
                lineHeight: 1.06,
              }}
            >
              Guided withdrawal
            </div>

            <div style={{ marginTop: 6, ...helperText(), maxWidth: 720, lineHeight: 1.35 }}>
              Check your money, enter amount, continue.
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <span style={badge(true)}>Community ID: {publicCommunityId}</span>
              <span style={badge(false)}>Amount: {requestedAmountDisplay}</span>
              <span style={badge(false)}>Available: {effectiveAvailableDisplay}</span>
              <span style={badge(false)}>Held: {reservedPoolDisplay}</span>
              <span style={badge(false)}>Path: {pathDisplay}</span>
            </div>
          </div>
        </div>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(56px, 1fr))",
              gap: 10,
              alignItems: "start",
            }}
          >
          {[
            ["globe", "Context", identityReady],
            ["wallet", "Amount", requestedAmount > 0],
            ["bank", "Payout", payoutReady],
            ["document", "Rail", communityRailReady],
            ["check", "Result", Boolean(latestWithdrawalResult) || withdrawalCanWidenRoutes],
          ].map(([icon, label, active]) => (
            <div
              key={String(label)}
              style={{
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                flexDirection: "column",
                gap: 6,
                color: active ? "#F8FBFF" : "#8FA7C2",
                fontWeight: 900,
                fontSize: isCompact ? 10.5 : 12,
              }}
            >
              <span
                style={{
                  width: isCompact ? 34 : 42,
                  height: isCompact ? 34 : 42,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  background: active
                    ? "linear-gradient(180deg, #2468EA 0%, #103D91 100%)"
                    : "rgba(255,255,255,0.08)",
                  border: active
                    ? "1px solid rgba(78,143,231,0.52)"
                    : "1px solid rgba(154,177,207,0.20)",
                  boxShadow: active
                    ? "0 12px 22px rgba(18,77,176,0.28)"
                    : "inset 0 1px 0 rgba(255,255,255,0.06)",
                  fontSize: isCompact ? 16 : 18,
                }}
              >
                <GsnLegacyIcon name={icon as GsnIconName} size={isCompact ? 26 : 30} />
              </span>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                }}
              >
                {label}
              </span>
            </div>
          ))}
          </div>

      </section>
      ) : null}

      <section style={{ ...pageCard("#FFFFFF"), padding: isCompact ? 12 : 20 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: isCompact ? 8 : 12,
            alignItems: "center",
          }}
        >
          <div style={{ minWidth: 0 }}>
            {iconLabel("financeInstitution", "Your money here")}
            <div style={{ marginTop: 6, ...helperText(), fontSize: isCompact ? 13 : 14.5, lineHeight: 1.3 }}>
              {isCompact
                ? "This community money position."
                : "Details opens your full finance record for this community."}
            </div>
            <div
              style={{
                marginTop: 10,
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <span style={badge(false)}>Marketplace: {communityLabel}</span>
              <span style={badge(false)}>ID: {selectedClanId || "Not set"}</span>
              <span style={badge(false)}>Public ID: {publicCommunityId}</span>
            </div>
          </div>

          <StableCtaLink
            to={routes.finance}
            debugId="money-out.summary.open-finance"
            stableHeight={isCompact ? 40 : 52}
            style={moneyOutActionButtonStyle("secondary")}
          >
            Details
          </StableCtaLink>
        </div>

        <div
          style={{
            marginTop: isCompact ? 10 : 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
            gap: isCompact ? 8 : 10,
          }}
        >
          <div style={{ ...statTile(), minHeight: isCompact ? 74 : undefined, padding: isCompact ? "10px 11px" : 14 }}>
            <div style={sectionLabel()}>Total pool</div>
            <div style={{ marginTop: 7, color: "#D8F6E4", fontSize: isCompact ? 15 : 18, fontWeight: 1000 }}>
              {communityPoolDisplay}
            </div>
          </div>

          <div style={{ ...statTile(), minHeight: isCompact ? 74 : undefined, padding: isCompact ? "10px 11px" : 14 }}>
            <div style={sectionLabel()}>Available now</div>
            <div style={{ marginTop: 7, color: "#D8F6E4", fontSize: isCompact ? 15 : 18, fontWeight: 1000 }}>
              {effectiveAvailableDisplay}
            </div>
          </div>

          <div style={{ ...statTile(), minHeight: isCompact ? 74 : undefined, padding: isCompact ? "10px 11px" : 14 }}>
            <div style={sectionLabel()}>Held back</div>
            <div style={{ marginTop: 7, color: "#FCD34D", fontSize: isCompact ? 15 : 18, fontWeight: 1000 }}>
              {reservedPoolDisplay}
            </div>
          </div>

          <div style={{ ...statTile(), minHeight: isCompact ? 74 : undefined, padding: isCompact ? "10px 11px" : 14 }}>
            <div style={sectionLabel()}>Owed/details</div>
            <div style={{ marginTop: 7, color: "#E6EEF8", fontSize: isCompact ? 14 : 16, fontWeight: 1000, lineHeight: 1.25 }}>
              Open details
            </div>
          </div>
        </div>
      </section>

      {!isCompact ? (
      <section style={{ ...pageCard("#FFFFFF"), padding: isCompact ? 14 : 20 }}>
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
            <div style={sectionLabel()}>Overview</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Keep the amount-led decision together.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("overview")}
            minWidth={128}
            stableHeight={52}
            debugId="money-out.toggle-overview"
            style={moneyOutCollapseButtonStyle()}
          >
            {collapsed.overview ? "Open" : "Hide"}
          </SubtleButton>
        </div>

        {!collapsed.overview ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "repeat(auto-fit, minmax(138px, 1fr))"
                : "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={statTile()}>
              {iconLabel("wallet", "Requested")}
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
              {iconLabel("shield", "Available")}
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

            <div style={statTile()}>
              {iconLabel("alert", "Support gap")}
              <div
                style={{
                  marginTop: 8,
                  color: "#FCD34D",
                  fontSize: 18,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {supportGapDisplay}
              </div>
            </div>

            <div style={statTile("#F8FBFF")}>
              {iconLabel("globe", "Path")}
              <div
                style={{
                  marginTop: 8,
                  color: "#0B63D1",
                  fontSize: 16,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {pathDisplay}
              </div>
            </div>

            <div style={statTile()}>
              {iconLabel("document", "Rail")}
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
              {iconLabel("bank", "Payout")}
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

          </div>
        ) : null}
      </section>
      ) : null}

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
            {iconLabel("wallet", "Normal withdrawal")}
            <div style={{ marginTop: 8, ...helperText() }}>
              Enter amount. If it fits your available balance, GSN creates a withdrawal request reference.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: isCompact ? "flex-start" : "flex-end",
            }}
          >
            <SubtleButton
              onClick={() => {
                if (collapsed.destination) {
                  toggleSection("destination");
                }
              }}
              debugId="money-out.request.open-payout-details"
              stableHeight={44}
              minWidth={136}
              style={{
                ...moneyOutActionButtonStyle("secondary"),
                minHeight: 44,
                height: 44,
                maxHeight: 44,
                padding: "0 14px",
              }}
            >
              Payout account
            </SubtleButton>

            {!isCompact ? (
              <SubtleButton
                onClick={() => toggleSection("request")}
                minWidth={128}
                stableHeight={52}
                debugId="money-out.toggle-request"
                style={moneyOutCollapseButtonStyle()}
              >
                {collapsed.request ? "Open" : "Hide"}
              </SubtleButton>
            ) : null}
          </div>
        </div>

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
              <div style={sectionLabel()}>Withdrawal amount</div>

              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 12,
                }}
              >
                <div>
                  <div style={sectionLabel()}>Amount</div>
                  <input
                    value={amountInput}
                    onChange={(e) => {
                      setAmountInput(e.target.value);
                      setDecisionChecked(false);
                      setLatestWithdrawalResult(null);
                    }}
                    placeholder="0.00"
                    inputMode="decimal"
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
                This is your money. No purpose is needed for a normal withdrawal.
              </div>

              {(!isCompact || decisionChecked) ? (
              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}
              >
                <div style={innerCard("#FFFFFF")}>
                  {iconLabel("shield", "Withdrawal status")}
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
                      : !decisionChecked
                      ? "Ready to check"
                      : requiresSupport
                      ? "Support is needed"
                      : latestWithdrawalResult
                      ? "Reference created"
                      : "Reference can be created"}
                  </div>
                  <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                    {!effectiveAvailableKnown
                      ? "Waiting for the pool reading."
                      : !decisionChecked
                      ? "Press Continue so GSN can read this amount against your available pool."
                      : requiresSupport
                      ? `You are asking for ${fmtMoney(requestedAmount)} ${poolCurrency} but your withdrawable balance is ${withdrawableNowText} ${poolCurrency}.`
                      : latestWithdrawalResult
                      ? "Keep the request reference visible. GSN finance reviews and reconciles before money moves."
                      : "This amount fits your available balance."}
                  </div>
                </div>

                {!isCompact ? (
                <div style={innerCard("#FFFFFF")}>
                  <div style={sectionLabel()}>Support step</div>
                  <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                    {requiresSupport
                      ? "This amount is above your available balance. Support continues the support-backed path."
                      : "Support stays closed because this amount fits your available balance."}
                  </div>
                </div>
                ) : null}
              </div>
              ) : null}

            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Actions</div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {!effectiveAvailableKnown ? (
                  <PrimaryButton
                    disabled
                    debugId="money-out.awaiting-pool"
                    minWidth={isCompact ? undefined : 132}
                    stableHeight={52}
                    style={moneyOutActionButtonStyle("primary", true)}
                  >
                    Awaiting
                  </PrimaryButton>
                ) : !decisionChecked ? (
                  <PrimaryButton
                    onClick={() => void handleCheckWithdrawalPath()}
                    disabled={requestedAmount <= 0}
                    debugId="money-out.continue-direct"
                    minWidth={isCompact ? undefined : 144}
                    stableHeight={52}
                    style={moneyOutActionButtonStyle("primary", requestedAmount <= 0)}
                  >
                    Continue
                  </PrimaryButton>
                ) : !requiresSupport ? (
                  <PrimaryButton
                    onClick={() => void handleDirectWithdrawal()}
                    disabled={
                      submittingWithdrawal ||
                      requestedAmount <= 0 ||
                      Boolean(latestWithdrawalResult)
                    }
                    debugId="money-out.continue-direct"
                    minWidth={isCompact ? undefined : 144}
                    stableHeight={52}
                    style={moneyOutActionButtonStyle(
                      "primary",
                      submittingWithdrawal ||
                        requestedAmount <= 0 ||
                        Boolean(latestWithdrawalResult)
                    )}
                  >
                    {latestWithdrawalResult
                      ? "Reference ready"
                      : submittingWithdrawal
                      ? "Creating..."
                      : "Create reference"}
                  </PrimaryButton>
                ) : (
                  <PrimaryButton
                    onClick={handleContinueToSupportPath}
                    disabled={requestedAmount <= 0}
                    debugId="money-out.open-support"
                    minWidth={isCompact ? undefined : 144}
                    stableHeight={52}
                    style={moneyOutActionButtonStyle(
                      "primary",
                      requestedAmount <= 0
                    )}
                  >
                    Open support
                  </PrimaryButton>
                )}

                {!isCompact ? (
                  <SecondaryButton
                    onClick={handleCopyWithdrawalSummary}
                    debugId="money-out.copy-summary"
                    minWidth={isCompact ? undefined : 150}
                    stableHeight={52}
                    style={moneyOutActionButtonStyle("secondary")}
                  >
                    Copy summary
                  </SecondaryButton>
                ) : null}

                {!isCompact ? (
                  <SubtleButton
                    onClick={handleResetTask}
                    stableHeight={52}
                    debugId="money-out.reset-task"
                    style={moneyOutActionButtonStyle("soft")}
                  >
                    Reset
                  </SubtleButton>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {(!payoutReady || destinationNotice || !collapsed.destination) ? (
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
            {iconLabel("bank", "Payout account")}
            <div style={{ marginTop: 8, ...helperText() }}>
              Where this withdrawal should go. Add it before creating a request reference.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("destination")}
            minWidth={128}
            stableHeight={52}
            debugId="money-out.toggle-destination"
            style={moneyOutCollapseButtonStyle()}
          >
            {collapsed.destination ? "Open" : "Hide"}
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
                      handleDestinationDraftChange("destinationName", e.target.value)
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
                      handleDestinationDraftChange("bankName", e.target.value)
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
                      handleDestinationDraftChange("accountNumber", e.target.value)
                    }
                    placeholder="Account number"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>
                    UK sort code{payoutNeedsSortCode ? " required" : " if UK/GBP"}
                  </div>
                  <input
                    value={destination.sortCode}
                    onChange={(e) =>
                      handleDestinationDraftChange("sortCode", e.target.value)
                    }
                    inputMode="numeric"
                    placeholder="12-34-56"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>Country or region</div>
                  <input
                    value={destination.country || destinationCountry}
                    onChange={(e) =>
                      handleDestinationDraftChange("country", e.target.value)
                    }
                    placeholder="United Kingdom"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>Phone number</div>
                  <input
                    value={destination.phoneNumber}
                    onChange={(e) =>
                      handleDestinationDraftChange("phoneNumber", e.target.value)
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
                      handleDestinationDraftChange("note", e.target.value)
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
                    minWidth={isCompact ? undefined : 150}
                    stableHeight={52}
                    style={moneyOutActionButtonStyle("primary", savingDestination)}
                  >
                    {savingDestination ? "Saving..." : "Save payout"}
                  </PrimaryButton>

                  <SecondaryButton
                    onClick={handleCopyPayoutAccount}
                    debugId="money-out.copy-payout-account"
                    minWidth={isCompact ? undefined : 150}
                    stableHeight={52}
                    style={moneyOutActionButtonStyle("secondary")}
                  >
                    Copy payout
                  </SecondaryButton>
                </div>

                {destinationNotice ? (
                  <div
                    style={{
                      ...innerCard(
                        destinationNotice.tone === "success" ? "#F0FBF6" : "#FFF5F5"
                      ),
                      color:
                        destinationNotice.tone === "success" ? "#166534" : "#991B1B",
                      fontWeight: 900,
                      lineHeight: 1.45,
                    }}
                  >
                    {destinationNotice.text}
                  </div>
                ) : null}
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

                <div style={statTile()}>
                  <div style={sectionLabel()}>
                    UK sort code{payoutNeedsSortCode ? " required" : ""}
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      color:
                        payoutNeedsSortCode && !safeStr(destination.sortCode)
                          ? "#FCD34D"
                          : "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 16,
                      wordBreak: "break-word",
                    }}
                  >
                    {safeStr(
                      destination.sortCode ||
                        (payoutNeedsSortCode ? "Awaiting sort code" : "Not required")
                    )}
                  </div>
                </div>

                <div style={statTile()}>
                  <div style={sectionLabel()}>Country profile</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 16,
                      wordBreak: "break-word",
                    }}
                  >
                    {safeStr(destination.country || destinationCountry || "Not stated")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>
      ) : null}

      {(!communityRailReady || !collapsed.rail) ? (
      <section
        id="community-money-out-rail"
        style={{
          ...pageCard(
            "linear-gradient(180deg, rgba(248,252,255,0.98) 0%, rgba(235,245,255,0.98) 100%)"
          ),
          border: "1px solid rgba(202,168,84,0.24)",
        }}
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "44px minmax(0, 1fr)",
              gap: 12,
              alignItems: "center",
              minWidth: 0,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 44,
                height: 44,
                borderRadius: 15,
                display: "grid",
                placeItems: "center",
                background: "rgba(255,255,255,0.96)",
                border: "1px solid rgba(226,192,106,0.34)",
                boxShadow:
                  "0 12px 22px rgba(8,35,58,0.10), inset 0 1px 0 rgba(255,255,255,0.96)",
              }}
            >
              <GsnLegacyIcon name="financeInstitution" size={38} decorative />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...sectionLabel(), color: "#173750" }}>
                Community money-out rail
              </div>
              <div
                style={{
                  marginTop: 5,
                  color: "#4F6275",
                  fontSize: 14,
                  fontWeight: 760,
                  lineHeight: 1.35,
                }}
              >
                Withdrawal destination for this community.
              </div>
            </div>
          </div>

          <SecondaryButton
            onClick={() => void handleLoadWithdrawalRoute()}
            disabled={loadingRoute}
            debugId="money-out.refresh-community-rail"
            minWidth={isCompact ? undefined : 136}
            stableHeight={52}
            style={moneyOutActionButtonStyle("secondary", loadingRoute)}
          >
            {loadingRoute ? "Loading..." : "Refresh rail"}
          </SecondaryButton>
        </div>

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
            <div style={railPackageCardStyle()}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ ...sectionLabel(), color: "#173750" }}>
                  Rail details
                </div>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    minHeight: 30,
                    borderRadius: 999,
                    padding: "6px 10px",
                    border: communityRailReady
                      ? "1px solid rgba(46,155,98,0.22)"
                      : "1px solid rgba(200,58,58,0.18)",
                    background: communityRailReady
                      ? "linear-gradient(180deg, #F0FBF5 0%, #E2F4EA 100%)"
                      : "linear-gradient(180deg, #FFF7ED 0%, #FEEBD2 100%)",
                    color: communityRailReady ? "#166534" : "#9A3412",
                    fontSize: 12,
                    fontWeight: 950,
                    whiteSpace: "nowrap",
                  }}
                >
                  {communityRailReady ? "Ready" : "Not ready"}
                </span>
              </div>

              {!communityRailReady ? (
                <div
                  style={{
                    marginTop: 10,
                    color: "#8A4B0F",
                    fontSize: 14,
                    fontWeight: 800,
                    lineHeight: 1.35,
                  }}
                >
                  The community withdrawal rail is not visible yet. Refresh the
                  rail before sending money out.
                </div>
              ) : (
                <div style={railFactGridStyle()}>
                  {[...settlementRouteLines, ...communitySettlementLines].map(
                    (line, index) => {
                      const fact = railLineParts(line);
                      return (
                        <div
                          key={`withdraw-rail-line-${index}`}
                          style={railFactCardStyle(fact.wide)}
                        >
                          <div style={railFactLabelStyle()}>{fact.label}</div>
                          <div style={railFactValueStyle()}>{fact.value}</div>
                        </div>
                      );
                    }
                  )}
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
                  minWidth={isCompact ? undefined : 132}
                  stableHeight={52}
                  style={moneyOutActionButtonStyle("primary", !communityRailReady)}
                >
                  Copy rail
                </PrimaryButton>

                <StableCtaLink
                  to={routes.finance}
                  debugId="money-out.rail.open-finance"
                  stableHeight={52}
                  style={moneyOutActionButtonStyle("secondary")}
                >
                  Finance
                </StableCtaLink>

                <StableCtaLink
                  to={routes.payoutDetails}
                  debugId="money-out.rail.open-payout-details"
                  stableHeight={52}
                  style={moneyOutActionButtonStyle("secondary")}
                >
                  Payout
                </StableCtaLink>
              </div>
            </div>
          </div>
        ) : null}

        <div style={{ marginTop: 12 }}>
          <SubtleButton
            onClick={() => toggleSection("rail")}
            minWidth={128}
            stableHeight={52}
            debugId="money-out.toggle-rail"
            style={moneyOutCollapseButtonStyle()}
          >
            {collapsed.rail ? "Show rail" : "Hide rail"}
          </SubtleButton>
        </div>
      </section>
      ) : null}

      {(latestWithdrawalResult || (decisionChecked && requiresSupport) || !collapsed.result) ? (
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
            <div style={sectionLabel()}>Withdrawal request reference</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              {latestResultText}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <SubtleButton
              onClick={() => toggleSection("result")}
              minWidth={128}
              stableHeight={52}
              debugId="money-out.toggle-result"
              style={moneyOutCollapseButtonStyle()}
            >
              {collapsed.result ? "Open" : "Hide"}
            </SubtleButton>

            <SecondaryButton
              onClick={() => void handleRefresh()}
              disabled={refreshing}
              debugId="money-out.refresh-status"
              minWidth={isCompact ? undefined : 120}
              stableHeight={52}
              style={moneyOutActionButtonStyle("secondary", refreshing)}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </SecondaryButton>
          </div>
        </div>

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
                  <div style={sectionLabel()}>Current state</div>

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
                      : "Normal withdrawal"}
                  </div>
                </div>

                <div style={innerCard("#FFFFFF")}>
                  <div style={sectionLabel()}>What happens next</div>
                  <div style={{ marginTop: 8, ...helperText(), color: "#F8FBFF" }}>
                    {!effectiveAvailableKnown
                      ? "Wait for the pool reading before this page decides the next step."
                      : !requiresSupport
                      ? "Keep the request reference visible. Finance/admin reconciles it during the pilot."
                      : "Your available balance is not enough. Continue through Support Requests."}
                  </div>
                </div>

                {latestWithdrawalResult ? (
                  <div style={innerCard("#FFFFFF")}>
                    <div style={sectionLabel()}>Latest request reference</div>
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
              <div style={sectionLabel()}>Next actions</div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {!effectiveAvailableKnown ? (
                  <div style={innerCard("#FFFBEF")}>
                    <div style={sectionLabel()}>Awaiting pool reading</div>
                    <div style={{ marginTop: 8, ...helperText(), color: "#F8FBFF" }}>
                      Wait for the pool reading, then continue from the decision lane.
                    </div>
                  </div>
                ) : !requiresSupport && !latestWithdrawalResult ? (
                  <div style={innerCard("#F8FBFF")}>
                    <div style={sectionLabel()}>Use the decision lane above</div>
                    <div style={{ marginTop: 8, ...helperText(), color: "#F8FBFF" }}>
                      Review amount, rail, and payout account before submitting a request.
                    </div>
                  </div>
                ) : requiresSupport && !withdrawalCanWidenRoutes ? (
                  <div style={innerCard("#F8FBFF")}>
                    <div style={sectionLabel()}>Support path chosen</div>
                    <div style={{ marginTop: 8, ...helperText(), color: "#F8FBFF" }}>
                      Open support so GSN can guide the support-backed path.
                    </div>
                  </div>
                ) : null}

                {requiresSupport ? (
                  <>
                      <StableCtaLink
                        to={routes.supportStart}
                        debugId="money-out.result.open-loans"
                        stableHeight={52}
                        style={moneyOutActionButtonStyle("primary")}
                      >
                        Open support
                      </StableCtaLink>
                  </>
                ) : withdrawalCanWidenRoutes ? (
                  <>
                    <StableCtaLink
                      to={routes.finance}
                      debugId="money-out.result.open-finance"
                      stableHeight={52}
                      style={moneyOutActionButtonStyle("secondary")}
                    >
                      Finance
                    </StableCtaLink>

                      <StableCtaLink
                        to={routes.payoutDetails}
                        debugId="money-out.result.open-payout-details"
                        stableHeight={52}
                        style={moneyOutActionButtonStyle("secondary")}
                      >
                        Payout
                      </StableCtaLink>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>
      ) : null}

      {(withdrawalCanWidenRoutes || !collapsed.routes) ? (
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
              Connections monitor
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              {withdrawalCanWidenRoutes
                ? "Related pages reopen after a visible result."
                : requiresSupport
                ? "Support is required. Open support."
                : "Keep this task focused on amount, code, payout account, and result."}
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("routes")}
            minWidth={128}
            stableHeight={52}
            debugId="money-out.toggle-routes"
            style={moneyOutCollapseButtonStyle()}
          >
            {collapsed.routes ? "Open" : "Hide"}
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
                  : "repeat(auto-fit, minmax(156px, 1fr))",
                gap: 12,
              }}
            >
                <StableCtaLink
                  to={routes.finance}
                  debugId="money-out.route.finance"
                  stableHeight={52}
                  fullWidth
                  style={moneyOutActionButtonStyle("primary")}
                >
                  Finance
                </StableCtaLink>

                <StableCtaLink
                  to={routes.payoutDetails}
                  debugId="money-out.route.payout-details"
                  stableHeight={52}
                  fullWidth
                  style={moneyOutActionButtonStyle("secondary")}
                >
                  Payout details
                </StableCtaLink>

              <StableCtaLink
                to={routes.marketplace}
                debugId="money-out.route.marketplace"
                stableHeight={52}
                fullWidth
                style={moneyOutActionButtonStyle("secondary")}
              >
                Marketplace
              </StableCtaLink>

            </div>
          ) : (
            <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
              <div style={innerCard("#F8FBFF")}>
                <div style={sectionLabel()}>One-task mode</div>
                <div style={{ marginTop: 8, ...helperText(), color: "#F8FBFF" }}>
                  Keep this withdrawal on one path until it produces a result or moves into support.
                </div>
              </div>
            </div>
          )
        ) : null}
      </section>
      ) : null}

      <GsnSupportContact
        context="Money Out"
        subject="GSN Money Out help"
        style={{ marginTop: 16 }}
      />
    </div>
  );
}
