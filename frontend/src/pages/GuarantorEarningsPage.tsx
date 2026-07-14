import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import GsnSnapshotPaperCard from "../components/GsnSnapshotPaperCard";
import PageTopNav from "../components/PageTopNav";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import { SecondaryButton, StableCtaLink, SubtleButton } from "../components/StableButton";
import { communityIdFromSearch } from "../lib/communityRouteContext";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
  institutionalStatTile,
} from "../lib/institutionalSurface";
import {
  getCurrentClan,
  getMe,
  getMyGuarantorEarnings,
  getSelectedClanId,
  safeCopy,
  setSelectedClanId,
} from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import {
  buildGsnSupportEvidencePackage,
  buildGsnSupportEvidenceShareText,
} from "../lib/gsnSnapshotPaper";

type GuarantorEarningItem = {
  loan_guarantor_id?: number;
  loan_id?: number;
  clan_id?: number;
  share_amount?: string | number | null;
  estimated_amount?: string | number | null;
  payable_amount?: string | number | null;
  weight_amount?: string | number | null;
  currency?: string | null;
  status?: string | null;
  earning_status?: string | null;
  status_note?: string | null;
  loan_status?: string | null;
  guarantor_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type CommunityLite = {
  id?: number;
  clan_id?: number;
  name?: string | null;
  marketplace_name?: string | null;
  community_code?: string | null;
  role?: string | null;
  member_role?: string | null;
  membership_role?: string | null;
};

type MeLite = {
  gmfn_id?: string | null;
  display_name?: string | null;
  nickname?: string | null;
  name?: string | null;
  first_name?: string | null;
  email?: string | null;
};

type NextStepState = {
  title: string;
  detail: string;
  today: string;
  tomorrow: string;
  ctaLabel: string;
  ctaTo: string;
};

type CollapseState = {
  overview: boolean;
  meaning: boolean;
  recent: boolean;
  routes: boolean;
};

type EarningsLoadResult = {
  data: any;
  community: CommunityLite | null;
  me: MeLite | null;
  items: GuarantorEarningItem[];
};

const GUARANTOR_EARNINGS_UI_STORAGE_KEY = "gmfn.guarantorEarnings.sections.v1";
const GUARANTOR_EARNINGS_PAYOUT_TRUTH =
  "Earned supporter value is recorded here for visibility. It is not an automatic payout, and withdrawal still needs the guided Money Out process when that step is approved.";

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function toNum(x: any): number {
  const raw = safeStr(x).replace(/,/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(x: any): string {
  return toNum(x).toFixed(2);
}

function safeDate(x: any): Date | null {
  const raw = safeStr(x);
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "Not available yet";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
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
    meaning: false,
    recent: false,
    routes: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    overview: Boolean(raw?.overview ?? base.overview),
    meaning: Boolean(raw?.meaning ?? base.meaning),
    recent: Boolean(raw?.recent ?? base.recent),
    routes: Boolean(raw?.routes ?? base.routes),
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    padding: 22,
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, rgba(8,17,31,0.98) 0%, rgba(11,31,51,0.97) 56%, rgba(23,54,84,0.95) 100%)"
        : bg,
    border: "1px solid rgba(123,161,204,0.20)",
    boxShadow: "0 22px 48px rgba(2,6,23,0.22), 0 6px 14px rgba(15,23,42,0.05)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalInnerCard(bg),
    borderRadius: 18,
    padding: 16,
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)"
        : bg,
    border: "1px solid rgba(123,161,204,0.14)",
    boxShadow: "0 14px 28px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    ...institutionalSoftCard(bg),
    background:
      bg === "#F8FBFF"
        ? "linear-gradient(180deg, rgba(13,28,45,0.96) 0%, rgba(18,40,64,0.94) 100%)"
        : bg,
    border: "1px solid rgba(123,161,204,0.16)",
    boxShadow: "0 14px 30px rgba(2,6,23,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function statTile(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalStatTile(bg),
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)"
        : bg,
    border: "1px solid rgba(123,161,204,0.14)",
    boxShadow: "0 14px 28px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function routeTileStyle(primary = false): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 104,
    minWidth: 0,
    borderRadius: 18,
    border: primary
      ? "1px solid rgba(29,95,212,0.22)"
      : "1px solid rgba(122,152,195,0.18)",
    background: primary
      ? "linear-gradient(180deg, #184A96 0%, #133A74 100%)"
      : "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
    padding: 16,
    textDecoration: "none",
    textAlign: "left",
    boxSizing: "border-box",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    overflowAnchor: "none",
    transition: "none",
    flexShrink: 0,
    boxShadow: primary
      ? "0 16px 34px rgba(19,79,191,0.24), inset 0 1px 0 rgba(255,255,255,0.10)"
      : "0 14px 30px rgba(2,6,23,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function guarantorEarningsButtonStyle(disabled = false): React.CSSProperties {
  return {
    borderRadius: 14,
    border: "1px solid rgba(124,154,196,0.18)",
    background:
      "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
    color: disabled ? "#94A3B8" : "#E6EEF8",
    fontWeight: 1000,
    boxShadow: "0 12px 24px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function guarantorEarningsCollapseStyle(): React.CSSProperties {
  return {
    borderRadius: 12,
    border: "1px solid rgba(124,154,196,0.18)",
    background:
      "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
    color: "#E6EEF8",
    fontWeight: 800,
    boxShadow: "0 12px 24px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function guarantorEarningsActionText(
  name: GsnIconName,
  label: React.ReactNode,
  size = 22
) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minWidth: 0,
        maxWidth: "100%",
        whiteSpace: "nowrap",
      }}
    >
      <GsnLegacyIcon name={name} size={size} />
      <span style={{ minWidth: 0 }}>{label}</span>
    </span>
  );
}

function guarantorEarningsRouteHeading(
  name: GsnIconName,
  label: React.ReactNode
) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        minWidth: 0,
        maxWidth: "100%",
      }}
    >
      <GsnLegacyIcon name={name} size={24} />
      <span style={{ minWidth: 0 }}>{label}</span>
    </span>
  );
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#9CB4CF",
    fontWeight: 1000,
    letterSpacing: 0,
    textTransform: "uppercase",
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 32,
    padding: "7px 12px",
    borderRadius: 999,
    background: primary ? "rgba(32,76,133,0.36)" : "rgba(255,255,255,0.08)",
    border: primary
      ? "1px solid rgba(123,161,204,0.24)"
      : "1px solid rgba(123,161,204,0.14)",
    color: primary ? "#CFE3FF" : "#E6EEF8",
    fontSize: 12,
    fontWeight: 1000,
    whiteSpace: "normal",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#C8D8EA",
    fontSize: 14.5,
    lineHeight: 1.75,
  };
}

function getCommunityName(clan: CommunityLite | null): string {
  return safeStr(clan?.marketplace_name || clan?.name || "");
}

function getCommunityId(clan: CommunityLite | null): string {
  return safeStr(clan?.community_code || "");
}

function getCommunityRole(clan: CommunityLite | null): string {
  return firstTruthy(
    clan?.role,
    clan?.member_role,
    clan?.membership_role
  );
}

function getMemberName(me: MeLite | null): string {
  return (
    firstTruthy(
      me?.display_name,
      me?.nickname,
      me?.name,
      me?.first_name,
      me?.email
    ) || "Member"
  );
}

function normalizeEarning(raw: any): GuarantorEarningItem | null {
  if (!raw) return null;

  const src = raw?.item || raw?.earning || raw?.record || raw;

  return {
    loan_guarantor_id: Number(src?.loan_guarantor_id || src?.id || 0) || undefined,
    loan_id: Number(src?.loan_id || src?.support_loan_id || 0) || undefined,
    clan_id: Number(src?.clan_id || src?.community_id || 0) || undefined,
    share_amount:
      src?.share_amount ??
      src?.earned_amount ??
      src?.amount ??
      src?.guarantor_share ??
      null,
    estimated_amount:
      src?.estimated_amount ??
      src?.share_amount ??
      src?.earned_amount ??
      src?.amount ??
      src?.guarantor_share ??
      null,
    payable_amount:
      src?.payable_amount ??
      src?.earned_payable ??
      src?.total_payable ??
      null,
    weight_amount:
      src?.weight_amount ??
      src?.pledge_amount ??
      src?.locked_amount ??
      src?.weight ??
      null,
    currency: firstTruthy(src?.currency, src?.currency_code, "NGN") || null,
    status: firstTruthy(src?.earning_status, src?.status, "pending") || null,
    earning_status: firstTruthy(src?.earning_status, src?.status) || null,
    status_note: firstTruthy(src?.status_note, src?.note, src?.message) || null,
    loan_status: firstTruthy(src?.loan_status, src?.support_status) || null,
    guarantor_status: firstTruthy(src?.guarantor_status) || null,
    created_at: firstTruthy(src?.created_at, src?.earned_at, src?.recorded_at) || null,
    updated_at: firstTruthy(src?.updated_at, src?.settled_at) || null,
  };
}

function statusTone(status: string) {
  const s = status.toLowerCase();

  if (s.includes("paid") || s.includes("earned") || s.includes("settled")) {
    return {
      bg: "#ECFDF5",
      border: "1px solid #A7F3D0",
      text: "#065F46",
    };
  }

  if (s.includes("pending") || s.includes("waiting")) {
    return {
      bg: "#EFF6FF",
      border: "1px solid #BFDBFE",
      text: "#1D4ED8",
    };
  }

  if (
    s.includes("blocked") ||
    s.includes("default") ||
    s.includes("cancel") ||
    s.includes("no_reward")
  ) {
    return {
      bg: "#FEF2F2",
      border: "1px solid #FECACA",
      text: "#991B1B",
    };
  }

  return {
    bg: "#F8FAFC",
    border: "1px solid #E2E8F0",
    text: "#475569",
  };
}

function isSettledStatus(status: string): boolean {
  const s = safeStr(status).toLowerCase();
  return s.includes("paid") || s.includes("earned") || s.includes("settled");
}

function isPendingStatus(status: string): boolean {
  const s = safeStr(status).toLowerCase();
  return s.includes("pending") || s.includes("waiting");
}

function estimatedValue(row: GuarantorEarningItem): number {
  return toNum(row?.estimated_amount ?? row?.share_amount);
}

function payableValue(row: GuarantorEarningItem): number {
  if (row?.payable_amount !== null && row?.payable_amount !== undefined) {
    return toNum(row.payable_amount);
  }

  return isSettledStatus(safeStr(row?.status)) ? estimatedValue(row) : 0;
}

function routeTarget(intent: CtaIntent, communityId: number, debugId: string): string {
  return resolveCtaTarget(intent, { communityId, debugId }).to as string;
}

export default function GuarantorEarningsPage() {
  const location = useLocation();
  const routeClanId = useMemo(
    () => communityIdFromSearch(location.search),
    [location.search]
  );
  const selectedClanId = routeClanId || Number(getSelectedClanId() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "guarantor-earnings.route.dashboard"),
      community: routeTarget("communityHome", selectedClanId, "guarantor-earnings.route.community"),
      loans: routeTarget("loans", selectedClanId, "guarantor-earnings.route.loans"),
      workbench: routeTarget("loanWorkbench", selectedClanId, "guarantor-earnings.route.workbench"),
      suggestions: routeTarget("loanSuggestions", selectedClanId, "guarantor-earnings.route.suggestions"),
      marketplace: routeTarget("marketplace", selectedClanId, "guarantor-earnings.route.marketplace"),
      moneyOut: routeTarget("moneyOut", selectedClanId, "guarantor-earnings.route.money-out"),
    }),
    [selectedClanId]
  );

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(GUARANTOR_EARNINGS_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  const [data, setData] = useState<any>(null);
  const [community, setCommunity] = useState<CommunityLite | null>(null);
  const [me, setMe] = useState<MeLite | null>(null);
  const [items, setItems] = useState<GuarantorEarningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const earningsContextRef = useRef("");
  const earningsLoadSeqRef = useRef(0);

  useEffect(() => {
    if (routeClanId > 0) {
      setSelectedClanId(routeClanId);
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
    writeLocalJSON(GUARANTOR_EARNINGS_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  const clearEarningsState = useCallback(() => {
    setData(null);
    setCommunity(null);
    setMe(null);
    setItems([]);
  }, []);

  const fetchEarnings = useCallback(async (): Promise<EarningsLoadResult> => {
    const [res, clanRes, meRes] = await Promise.all([
      getMyGuarantorEarnings(100),
      getCurrentClan().catch(() => null),
      getMe().catch(() => null),
    ]);

    const rows = (Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [])
      .map((row: any) => normalizeEarning(row))
      .filter(Boolean) as GuarantorEarningItem[];

    const sorted = [...rows].sort((a, b) => {
      const da = safeDate(a?.created_at || a?.updated_at || "")?.getTime() || 0;
      const db = safeDate(b?.created_at || b?.updated_at || "")?.getTime() || 0;
      return db - da;
    });

    return {
      data: res || null,
      community: clanRes || null,
      me: meRes || null,
      items: sorted,
    };
  }, []);

  useEffect(() => {
    const contextKey = `${selectedClanId || 0}`;
    const loadSeq = earningsLoadSeqRef.current + 1;
    earningsLoadSeqRef.current = loadSeq;
    earningsContextRef.current = contextKey;
    setLoading(true);
    setErr("");
    clearEarningsState();

    (async () => {
      try {
        const result = await fetchEarnings();

        if (
          earningsContextRef.current !== contextKey ||
          earningsLoadSeqRef.current !== loadSeq
        ) {
          return;
        }

        setData(result.data);
        setCommunity(result.community);
        setMe(result.me);
        setItems(result.items);
      } catch (e: any) {
        if (
          earningsContextRef.current !== contextKey ||
          earningsLoadSeqRef.current !== loadSeq
        ) {
          return;
        }

        setErr(String(e?.message || e || "Unable to load supporter value."));
      } finally {
        if (
          earningsContextRef.current === contextKey &&
          earningsLoadSeqRef.current === loadSeq
        ) {
          setLoading(false);
        }
      }
    })();
  }, [clearEarningsState, fetchEarnings, selectedClanId]);

  const hasExplicitCommunityTags = useMemo(() => {
    return items.some((row) => Number(row?.clan_id || 0) > 0);
  }, [items]);

  const visibleItems = useMemo(() => {
    if (!selectedClanId) return [];

    if (!hasExplicitCommunityTags) {
      return items;
    }

    return items.filter((row) => Number(row?.clan_id || 0) === selectedClanId);
  }, [items, selectedClanId, hasExplicitCommunityTags]);

  const currency = safeStr(
    visibleItems?.[0]?.currency || items?.[0]?.currency || data?.currency || "NGN"
  );

  const selectedCommunityLabel = useMemo(() => {
    return (
      getCommunityName(community) ||
      (selectedClanId ? `Community ${selectedClanId}` : "No community selected")
    );
  }, [community, selectedClanId]);

  const communityPublicIdValue = useMemo(() => {
    return getCommunityId(community);
  }, [community]);

  const communityPublicId = useMemo(() => {
    return firstTruthy(communityPublicIdValue, "No community ID yet");
  }, [communityPublicIdValue]);

  const memberRole = useMemo(() => {
    return getCommunityRole(community);
  }, [community]);

  const memberName = useMemo(() => getMemberName(me), [me]);
  const gmfnIdValue = useMemo(() => firstTruthy(me?.gmfn_id), [me]);
  const gmfnId = useMemo(() => firstTruthy(gmfnIdValue, "Not issued yet"), [gmfnIdValue]);

  const totals = useMemo(() => {
    const total = visibleItems.reduce(
      (sum: number, row: GuarantorEarningItem) => sum + payableValue(row),
      0
    );

    const estimatedTotal = visibleItems.reduce(
      (sum: number, row: GuarantorEarningItem) => sum + estimatedValue(row),
      0
    );

    const totalWeight = visibleItems.reduce(
      (sum: number, row: GuarantorEarningItem) => sum + toNum(row?.weight_amount),
      0
    );

    const now = new Date();

    const thisMonth = visibleItems
      .filter((row: GuarantorEarningItem) => {
        const d = safeDate(row?.created_at || row?.updated_at || "");
        return !!d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce(
        (sum: number, row: GuarantorEarningItem) => sum + payableValue(row),
        0
      );

    const thisYear = visibleItems
      .filter((row: GuarantorEarningItem) => {
        const d = safeDate(row?.created_at || row?.updated_at || "");
        return !!d && d.getFullYear() === now.getFullYear();
      })
      .reduce(
        (sum: number, row: GuarantorEarningItem) => sum + payableValue(row),
        0
      );

    const settledCount = visibleItems.filter((row) =>
      isSettledStatus(safeStr(row?.status))
    ).length;
    const pendingCount = visibleItems.filter((row) =>
      isPendingStatus(safeStr(row?.status))
    ).length;

    const latestDate =
      visibleItems
        .map((row) => safeDate(row?.created_at || row?.updated_at || ""))
        .filter(Boolean)
        .sort((a, b) => (b!.getTime() - a!.getTime()))[0] || null;

    return {
      total,
      estimatedTotal,
      totalWeight,
      thisMonth,
      thisYear,
      settledCount,
      pendingCount,
      latestDate,
    };
  }, [visibleItems]);

  const nextStep = useMemo<NextStepState>(() => {
    if (!selectedClanId) {
      return {
        title: "Choose the community first",
        detail:
          "Supporter value makes more sense when it stays tied to your current community.",
        today: "Open Community Home and confirm the community you are working in.",
        tomorrow:
          "Your current community keeps support history and earnings easier to interpret.",
        ctaLabel: "Open Community Home",
        ctaTo: routes.community,
      };
    }

    if (totals.pendingCount > 0) {
      return {
        title:
          totals.pendingCount === 1
            ? "One supporter value item is still pending"
            : `${totals.pendingCount} supporter value items are still pending`,
        detail:
          "Your next move is to watch the active support flow, not to ignore it. Earnings become meaningful when the support cycle closes properly.",
        today: "Review the active support items and keep the pending work moving.",
        tomorrow:
          "Closed-support records create clearer earnings and stronger visible contribution.",
        ctaLabel: "Return to Loan Support",
        ctaTo: routes.loans,
      };
    }

    if (totals.total > 0) {
      return {
        title: "Your support contribution is now visible value",
        detail:
          "Supporting responsible members should not remain invisible. This keeps that contribution readable and measurable in your current community.",
        today: "Review your recent earnings and keep your support behaviour steady.",
        tomorrow:
          "Consistent support can strengthen both visible value and visible reputation over time.",
        ctaLabel: "Open Community Home",
        ctaTo: routes.community,
      };
    }

    return {
      title: "No supporter value is shown yet",
      detail:
        "That does not mean the path is useless. It means the earnings side of the support cycle has not materialized yet in your visible records.",
      today: "Continue using the guided support flow rather than forcing the earnings question too early.",
      tomorrow:
        "Visible earnings usually come after responsible support behaviour has had time to settle.",
      ctaLabel: "Return to Loan Support",
      ctaTo: routes.loans,
    };
  }, [routes.community, routes.loans, selectedClanId, totals.pendingCount, totals.total]);

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  const earningsPaper = useMemo(
    () =>
      buildGsnSupportEvidencePackage({
        title: "GSN Supporter Value Snapshot",
        purpose: "Review visible supporter value, closed-support records, and pending items for this member.",
        reference: `guarantor-earnings-${communityPublicIdValue || selectedClanId || "current"}`,
        memberName,
        gsnId: gmfnIdValue,
        memberRole,
        communityName: selectedCommunityLabel,
        communityId: communityPublicIdValue,
        routeName: "Supporter Value",
        amount: `${fmtMoney(totals.total)} ${currency}`,
        status: totals.pendingCount > 0 ? "Pending items visible" : "Current visible total",
        detailLines: [
          `Total earned: ${fmtMoney(totals.total)} ${currency}`,
          `Potential share: ${fmtMoney(totals.estimatedTotal)} ${currency}`,
          `This month: ${fmtMoney(totals.thisMonth)} ${currency}`,
          `This year: ${fmtMoney(totals.thisYear)} ${currency}`,
          `Closed-support records: ${totals.settledCount}`,
          `Pending items: ${totals.pendingCount}`,
          GUARANTOR_EARNINGS_PAYOUT_TRUTH,
        ],
      }),
    [
      communityPublicIdValue,
      currency,
      gmfnIdValue,
      memberName,
      memberRole,
      selectedClanId,
      selectedCommunityLabel,
      totals.estimatedTotal,
      totals.pendingCount,
      totals.settledCount,
      totals.thisMonth,
      totals.thisYear,
      totals.total,
    ]
  );

  function copySummary() {
    safeCopy(
      buildGsnSupportEvidenceShareText({
        title: "GSN Supporter Value Snapshot",
        reference: `guarantor-earnings-${communityPublicIdValue || selectedClanId || "current"}`,
        memberName,
        gsnId: gmfnIdValue,
        memberRole,
        communityName: selectedCommunityLabel,
        communityId: communityPublicIdValue,
        routeName: "Supporter Value",
        amount: `${fmtMoney(totals.total)} ${currency}`,
        status: totals.pendingCount > 0 ? "Pending items visible" : "Current visible total",
        detailLines: [
          `Total earned: ${fmtMoney(totals.total)} ${currency}`,
          `Potential share: ${fmtMoney(totals.estimatedTotal)} ${currency}`,
        ],
      })
    );
  }

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", paddingBottom: isCompact ? 40 : 60 }}>
      <PageTopNav
        sectionLabel="Supporter Value"
        title="Supporter Value"
        subtitle="See pending and earned value from supporting successful community requests."
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.loans}
        backLabel="Loan Support"
      />

      <ExplainToggle
        label="What this screen does"
        what="This screen separates potential support reward from value that is actually earned after the support cycle closes."
        why="It keeps supporter contribution honest: support can be visible early, but GSN should only call it earned when the support cycle closes properly. Finance records the money history; this page explains the value meaning."
        next="Read the fixed context first, then open the earnings overview and recent earnings sections to see the current picture."
        tone="light"
        style={{ marginTop: 18 }}
      />

      {err ? (
        <div style={{ ...softCard("#FEF2E2"), marginTop: 18, color: "#991B1B", fontWeight: 900 }}>
          {err}
        </div>
      ) : null}

      <section
        style={{
          ...pageCard("linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"),
          marginTop: 18,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.08fr) minmax(320px, 0.92fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={sectionLabel()}>Fixed earnings context</div>

            <div
              style={{
                marginTop: 10,
                fontWeight: 1000,
                color: "#F8FBFF",
                fontSize: 30,
                lineHeight: 1.15,
              }}
            >
              {nextStep.title}
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#6B7A88",
                lineHeight: 1.8,
              }}
            >
              This value record keeps supporter participation
              readable in your current community
              instead of leaving it buried under the wider support flow.
            </div>

            <StableCtaLink
              to={nextStep.ctaTo}
              debugId="guarantor-earnings.front-next"
              stableHeight={isCompact ? 58 : 72}
              fullWidth
              minWidth={isCompact ? undefined : 260}
              style={{
                ...routeTileStyle(true),
                marginTop: 14,
                height: isCompact ? 58 : 72,
                minHeight: isCompact ? 58 : 72,
                maxHeight: isCompact ? 58 : 72,
                justifyContent: "center",
                padding: isCompact ? "10px 12px" : "12px 14px",
              }}
            >
              <div
                style={{
                  color: "#F8FBFF",
                  fontWeight: 900,
                  fontSize: isCompact ? 15 : 16,
                  lineHeight: 1.2,
                }}
              >
                {guarantorEarningsRouteHeading("navigation", nextStep.ctaLabel)}
              </div>
              {!isCompact ? (
                <div style={{ marginTop: 6, ...helperText(), fontSize: 13 }}>
                  {nextStep.title}
                </div>
              ) : null}
            </StableCtaLink>

            <div
              style={{
                marginTop: 14,
                borderRadius: 18,
                border: "1px solid rgba(242,199,102,0.34)",
                background: "rgba(255,255,255,0.08)",
                padding: "12px 14px",
                color: "#F8FBFF",
                fontSize: 13,
                fontWeight: 850,
                lineHeight: 1.55,
              }}
            >
              {GUARANTOR_EARNINGS_PAYOUT_TRUTH}
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr 1fr"
                  : "repeat(4, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <div style={statTile()}>
                <div style={sectionLabel()}>Community</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#F8FBFF",
                    fontWeight: 900,
                    fontSize: 15,
                    lineHeight: 1.3,
                  }}
                >
                  {selectedCommunityLabel}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Community ID</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#F8FBFF",
                    fontWeight: 900,
                    fontSize: 15,
                    lineHeight: 1.3,
                    wordBreak: "break-word",
                  }}
                >
                  {communityPublicId}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>GSN ID</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#F8FBFF",
                    fontWeight: 900,
                    fontSize: 15,
                    lineHeight: 1.3,
                    wordBreak: "break-word",
                  }}
                >
                  {gmfnId}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Current step</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#F8FBFF",
                    fontWeight: 900,
                    fontSize: 15,
                    lineHeight: 1.3,
                  }}
                >
                  Earnings review
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Member: {memberName}</span>
              {memberRole ? <span style={badge(false)}>Role: {memberRole}</span> : null}
              <span style={badge(false)}>Currency: {currency}</span>
              <span style={badge(false)}>Closed-support records: {totals.settledCount}</span>
              <span style={badge(false)}>Pending: {totals.pendingCount}</span>
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <SecondaryButton
                onClick={copySummary}
                debugId="guarantor-earnings.copy-summary"
                style={guarantorEarningsButtonStyle(false)}
              >
                {guarantorEarningsActionText("copy", "Copy summary")}
              </SecondaryButton>
            </div>

            <GsnSnapshotPaperCard
              paperText={earningsPaper}
              compact={isCompact}
              icon="chart"
              maxBodyLines={isCompact ? 6 : undefined}
              style={{ marginTop: 14 }}
            />
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Today</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.65,
                }}
              >
                {nextStep.today}
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Tomorrow</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.65,
                }}
              >
                {nextStep.tomorrow}
              </div>
            </div>
          </div>
        </div>
      </section>

      {selectedClanId && !hasExplicitCommunityTags && visibleItems.length > 0 ? (
        <section
          style={{
            ...pageCard("#FFFDF5"),
            marginTop: 18,
            border: "1px solid rgba(214,175,71,0.25)",
          }}
        >
          <div style={{ fontWeight: 1000, color: "#92400E" }}>Current feed note</div>

          <div
            style={{
              marginTop: 8,
              color: "#475569",
              lineHeight: 1.8,
            }}
          >
            This earnings feed is not returning community tags yet. It is still
            being shown through your current community, and each earnings row
            should later carry clearer community matching.
          </div>
        </section>
      ) : null}

      {loading ? (
        <div style={{ ...pageCard(), marginTop: 18, color: "rgba(230,238,248,0.76)" }}>
          Loading supporter value...
        </div>
      ) : (
        <>
          <section style={{ ...pageCard(), marginTop: 18 }}>
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
                <div style={sectionLabel()}>Earnings overview</div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  Core earnings totals for your current community.
                </div>
              </div>

              <SubtleButton
                onClick={() => toggleSection("overview")}
                minWidth={116}
                stableHeight={52}
                debugId="guarantor-earnings.toggle-overview"
                style={guarantorEarningsCollapseStyle()}
              >
                {guarantorEarningsActionText(
                  collapsed.overview ? "chevronDown" : "chevronUp",
                  collapsed.overview ? "Open" : "Hide",
                  20
                )}
              </SubtleButton>
            </div>

            <ExplainToggle
              label="What this does"
              what="This overview gathers the headline value totals for your current community so you can see the size and weight of your support contribution."
              why="It gives you one stable summary before you move into the detailed earnings record."
              next="Open this summary first, then use the recent earnings section to trace where the numbers are coming from."
              tone="light"
              style={{ marginTop: 14 }}
            />

            {!collapsed.overview ? (
              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "repeat(4, minmax(0, 1fr))",
                  gap: 14,
                }}
              >
                <div style={statTile()}>
                  <div style={sectionLabel()}>Total earned</div>
                  <div
                    style={{
                      marginTop: 8,
                      fontWeight: 1000,
                      fontSize: 28,
                      color: "#F8FBFF",
                    }}
                  >
                    {fmtMoney(totals.total)} {currency}
                  </div>
                </div>

                <div style={statTile()}>
                  <div style={sectionLabel()}>Potential share</div>
                  <div
                    style={{
                      marginTop: 8,
                      fontWeight: 1000,
                      fontSize: 28,
                      color: "#F8FBFF",
                    }}
                  >
                    {fmtMoney(totals.estimatedTotal)} {currency}
                  </div>
                </div>

                <div style={statTile()}>
                  <div style={sectionLabel()}>This year</div>
                  <div
                    style={{
                      marginTop: 8,
                      fontWeight: 1000,
                      fontSize: 28,
                      color: "#F8FBFF",
                    }}
                  >
                    {fmtMoney(totals.thisYear)} {currency}
                  </div>
                </div>

                <div style={statTile()}>
                  <div style={sectionLabel()}>Contribution weight</div>
                  <div
                    style={{
                      marginTop: 8,
                      fontWeight: 1000,
                      fontSize: 28,
                      color: "#F8FBFF",
                    }}
                  >
                    {fmtMoney(totals.totalWeight)} {currency}
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <section style={{ ...pageCard("#F8FBFF"), marginTop: 18 }}>
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
                <div style={sectionLabel()}>Why this matters</div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  Keep the meaning of support contribution visible.
                </div>
              </div>

              <SubtleButton
                onClick={() => toggleSection("meaning")}
                minWidth={116}
                stableHeight={52}
                debugId="guarantor-earnings.toggle-meaning"
                style={guarantorEarningsCollapseStyle()}
              >
                {guarantorEarningsActionText(
                  collapsed.meaning ? "chevronDown" : "chevronUp",
                  collapsed.meaning ? "Open" : "Hide",
                  20
                )}
              </SubtleButton>
            </div>

            {!collapsed.meaning ? (
              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}
              >
                <div style={innerCard("#FFFFFF")}>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 1000,
                      color: "#F8FBFF",
                    }}
                  >
                    Visible contribution
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      color: "#475569",
                      lineHeight: 1.8,
                    }}
                  >
                    Supporting responsible members can create real value over time.
                    The system should help you see that responsible support
                    is not invisible.
                  </div>
                </div>

                <div style={innerCard("#FFFDF5")}>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 1000,
                      color: "#F8FBFF",
                    }}
                  >
                    Encouragement
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      color: "#475569",
                      lineHeight: 1.8,
                    }}
                  >
                    As your supporter value grows, GSN should remind you that
                    standing behind responsible people can also create visible value
                    and visible reputation for you.
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <section style={{ ...pageCard(), marginTop: 18 }}>
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
                <div style={sectionLabel()}>Recent earnings</div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  Recent supporter value inside the current working context.
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={badge(false)}>{visibleItems.length} visible records</span>
                {totals.latestDate ? (
                  <span style={badge(false)}>
                    Latest: {safeDateTime(totals.latestDate.toISOString())}
                  </span>
                ) : null}
                <SubtleButton
                  onClick={() => toggleSection("recent")}
                  minWidth={116}
                  stableHeight={52}
                  debugId="guarantor-earnings.toggle-recent"
                  style={guarantorEarningsCollapseStyle()}
                >
                  {guarantorEarningsActionText(
                    collapsed.recent ? "chevronDown" : "chevronUp",
                    collapsed.recent ? "Open" : "Hide",
                    20
                  )}
                </SubtleButton>
              </div>
            </div>

            {!collapsed.recent ? (
              <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                {visibleItems.length === 0 ? (
                  <div style={{ color: "#7A8D9F", lineHeight: 1.8 }}>
                    {selectedClanId
                      ? "No supporter value found yet in this working context."
                      : "Select a community first to keep earnings inside the correct support context."}
                  </div>
                ) : (
                  visibleItems.map((earning: GuarantorEarningItem, idx: number) => {
                    const status = safeStr(earning?.status || "Not available yet");
                    const tone = statusTone(status);
                    const settled = isSettledStatus(status);
                    const amountLabel = settled ? "RECORDED EARNED VALUE" : "POTENTIAL SHARE";
                    const amountValue = settled ? payableValue(earning) : estimatedValue(earning);

                    return (
                      <div
                        key={earning?.loan_guarantor_id || idx}
                        style={innerCard("#FFFFFF")}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ minWidth: 240 }}>
                            <div
                              style={{
                                fontWeight: 1000,
                                color: "#F8FBFF",
                                fontSize: 17,
                              }}
                            >
                              Support #{safeStr(earning?.loan_id || "Not available yet")}
                            </div>

                            <div
                              style={{
                                marginTop: 8,
                                display: "grid",
                                gap: 6,
                                color: "rgba(230,238,248,0.76)",
                                lineHeight: 1.7,
                                fontSize: 14,
                              }}
                            >
                              <div>
                                Contribution weight:{" "}
                                <strong style={{ color: "#F8FBFF" }}>
                                  {safeStr(earning?.weight_amount || "0")}{" "}
                                  {safeStr(earning?.currency || currency)}
                                </strong>
                              </div>
                              <div>
                                Recorded: {safeDateTime(earning?.created_at || earning?.updated_at)}
                              </div>
                              {earning?.loan_status ? (
                                <div>
                                  Support status:{" "}
                                  <strong style={{ color: "#F8FBFF" }}>
                                    {safeStr(earning.loan_status)}
                                  </strong>
                                </div>
                              ) : null}
                              {earning?.status_note ? <div>{earning.status_note}</div> : null}
                            </div>
                          </div>

                          <div style={{ textAlign: "right", minWidth: 140 }}>
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "6px 10px",
                                borderRadius: 999,
                                background: tone.bg,
                                border: tone.border,
                                color: tone.text,
                                fontSize: 12,
                                fontWeight: 1000,
                              }}
                            >
                              {status}
                            </div>

                            <div
                              style={{
                                marginTop: 10,
                                fontSize: 12,
                                color: "rgba(230,238,248,0.76)",
                                fontWeight: 1000,
                              }}
                            >
                              {amountLabel}
                            </div>

                            <div
                              style={{
                                marginTop: 6,
                                fontWeight: 1000,
                                fontSize: 18,
                                color: settled ? "#34D399" : "#F8FBFF",
                              }}
                            >
                              {fmtMoney(amountValue)}{" "}
                              {safeStr(earning?.currency || currency)}
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

          <section style={{ ...pageCard(), marginTop: 18 }}>
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
                <div style={sectionLabel()}>Next pages</div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  Move from earnings reading into the next page you need.
                </div>
              </div>

              <SubtleButton
                onClick={() => toggleSection("routes")}
                minWidth={116}
                stableHeight={52}
                debugId="guarantor-earnings.toggle-routes"
                style={guarantorEarningsCollapseStyle()}
              >
                {guarantorEarningsActionText(
                  collapsed.routes ? "chevronDown" : "chevronUp",
                  collapsed.routes ? "Open" : "Hide",
                  20
                )}
              </SubtleButton>
            </div>

            {!collapsed.routes ? (
              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                <StableCtaLink
                  to={nextStep.ctaTo}
                  debugId="guarantor-earnings.route.next"
                  stableHeight={104}
                  fullWidth
                  style={routeTileStyle(true)}
                >
                  <div
                    style={{
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: 1.3,
                  }}
                >
                    {guarantorEarningsRouteHeading("navigation", nextStep.ctaLabel)}
                  </div>
                  <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                    {nextStep.detail}
                  </div>
                </StableCtaLink>

                <StableCtaLink
                  to={routes.workbench}
                  debugId="guarantor-earnings.route.workbench"
                  stableHeight={104}
                  fullWidth
                  style={routeTileStyle(false)}
                >
                  <div
                    style={{
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: 1.3,
                  }}
                >
                    {guarantorEarningsRouteHeading("briefcase", "Support Workbench")}
                  </div>
                  <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                    Open this when you need the deeper support work item behind the earnings result.
                  </div>
                </StableCtaLink>

                <StableCtaLink
                  to={routes.suggestions}
                  debugId="guarantor-earnings.route.suggestions"
                  stableHeight={104}
                  fullWidth
                  style={routeTileStyle(false)}
                >
                  <div
                    style={{
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: 1.3,
                  }}
                >
                    {guarantorEarningsRouteHeading("search", "Find Supporters")}
                  </div>
                  <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                    Open this when the next question is candidate fit rather than earnings history.
                  </div>
                </StableCtaLink>

                <StableCtaLink
                  to={routes.community}
                  debugId="guarantor-earnings.route.community"
                  stableHeight={104}
                  fullWidth
                  style={routeTileStyle(false)}
                >
                  <div
                    style={{
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: 1.3,
                  }}
                >
                    {guarantorEarningsRouteHeading("community", "Community Home")}
                  </div>
                  <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                    Return to the wider community page.
                  </div>
                </StableCtaLink>

                <StableCtaLink
                  to={routes.marketplace}
                  debugId="guarantor-earnings.route.marketplace"
                  stableHeight={104}
                  fullWidth
                  style={routeTileStyle(false)}
                >
                  <div
                    style={{
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: 1.3,
                  }}
                >
                    {guarantorEarningsRouteHeading("shop", "Marketplace")}
                  </div>
                  <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                    Return to Marketplace only after this earnings reading is complete.
                  </div>
                </StableCtaLink>

                <StableCtaLink
                  to={routes.moneyOut}
                  debugId="guarantor-earnings.route.money-out"
                  stableHeight={104}
                  fullWidth
                  style={routeTileStyle(false)}
                >
                  <div
                    style={{
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: 1.3,
                  }}
                >
                    {guarantorEarningsRouteHeading("wallet", "Money Out")}
                  </div>
                  <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                    Use this only when GSN opens a guided withdrawal path. This page records
                    earned value; it does not pay it out by itself.
                  </div>
                </StableCtaLink>
              </div>
            ) : null}
          </section>

        </>
      )}
    </div>
  );
}


