import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import GsnSnapshotPaperCard from "../components/GsnSnapshotPaperCard";
import PageTopNav from "../components/PageTopNav";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import { PrimaryButton, SecondaryButton, StableCtaLink, SubtleButton } from "../components/StableButton";
import { communityIdFromSearch } from "../lib/communityRouteContext";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
  institutionalStatTile,
} from "../lib/institutionalSurface";
import {
  decideLoanGuarantor,
  getCurrentClan,
  getLoanGuarantorInbox,
  getMe,
  getSelectedClanId,
  safeCopy,
  setSelectedClanId,
} from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import { buildGsnSupportEvidencePackage } from "../lib/gsnSnapshotPaper";

type FilterKey = "pending" | "approved" | "declined" | "all";

type InboxRow = {
  id?: number;
  loanId?: number;
  clanId?: number;
  borrowerDisplay?: string | null;
  borrowerEmail?: string | null;
  borrowerUserId?: number | null;
  amount?: string | number | null;
  pledgeAmount?: string | number | null;
  currency?: string | null;
  status?: string | null;
  createdAt?: string | null;
  expiresAt?: string | null;
  purpose?: string | null;
  guarantorUserId?: number | null;
  lockedAmount?: string | number | null;
  releasedAmount?: string | number | null;
  isLocked?: boolean | null;
  note?: string | null;
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
  participant_role?: string | null;
};

type MeLite = {
  gmfn_id?: string | null;
  display_name?: string | null;
  nickname?: string | null;
  name?: string | null;
  first_name?: string | null;
  email?: string | null;
};

type CollapseState = {
  overview: boolean;
  queue: boolean;
  guidance: boolean;
  routes: boolean;
};

type Notice = {
  tone: "success" | "error";
  text: string;
};

type InboxLoadResult = {
  pending: InboxRow[];
  approved: InboxRow[];
  declined: InboxRow[];
  community: CommunityLite | null;
  me: MeLite | null;
};

const GUARANTOR_INBOX_UI_STORAGE_KEY = "gmfn.guarantorInbox.sections.v1";

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

function positiveNumber(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function moneyNumber(x: any): number {
  const raw = safeStr(x).replace(/,/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(x: any): string {
  return moneyNumber(x).toFixed(2);
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
  if (!raw) return "Not available yet";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
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

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalInnerCard(bg),
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)"
        : bg,
    border: "1px solid rgba(123,161,204,0.14)",
    boxShadow: "0 14px 28px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
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

function guarantorInboxRouteTileStyle(primary = false): React.CSSProperties {
  return {
    flexDirection: "column",
    justifyContent: "space-between",
    borderRadius: 18,
    border: primary
      ? "1px solid rgba(29,95,212,0.22)"
      : "1px solid rgba(122,152,195,0.18)",
    background: primary
      ? "linear-gradient(180deg, #184A96 0%, #133A74 100%)"
      : "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
    padding: 16,
    textAlign: "left",
    boxShadow: primary
      ? "0 16px 34px rgba(19,79,191,0.24), inset 0 1px 0 rgba(255,255,255,0.10)"
      : "0 14px 30px rgba(2,6,23,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function guarantorInboxPrimaryButtonStyle(disabled = false): React.CSSProperties {
  return {
    borderRadius: 14,
    border: "none",
    background: disabled
      ? "#CBD5E1"
      : "linear-gradient(180deg, #255FCE 0%, #1B4FBF 100%)",
    color: "#FFFFFF",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    opacity: disabled ? 0.72 : 1,
    boxShadow: disabled ? "none" : "0 14px 30px rgba(29,95,212,0.26)",
  };
}

function guarantorInboxSecondaryButtonStyle(disabled = false): React.CSSProperties {
  return {
    borderRadius: 14,
    border: "1px solid rgba(124,154,196,0.18)",
    background:
      "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
    color: disabled ? "#94A3B8" : "#E6EEF8",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    opacity: disabled ? 0.72 : 1,
    boxShadow: "0 12px 24px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function guarantorInboxFilterButtonStyle(active: boolean): React.CSSProperties {
  return {
    borderRadius: 14,
    border: active ? "1px solid #BFDBFE" : "1px solid rgba(148,163,184,0.16)",
    background: active
      ? "linear-gradient(180deg, #184A96 0%, #133A74 100%)"
      : "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
    color: active ? "#FFFFFF" : "#E6EEF8",
    fontWeight: 1000,
    cursor: "pointer",
    fontSize: 14,
    boxShadow: active
      ? "0 10px 22px rgba(29,78,216,0.14)"
      : "0 8px 18px rgba(15,23,42,0.04)",
  };
}

function guarantorInboxCollapseButtonStyle(): React.CSSProperties {
  return {
    borderRadius: 12,
    border: "1px solid rgba(124,154,196,0.18)",
    background:
      "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
    color: "#E6EEF8",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
    boxShadow: "0 10px 22px rgba(15,23,42,0.06)",
  };
}

function guarantorInboxActionText(
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

function guarantorInboxRouteHeading(name: GsnIconName, label: React.ReactNode) {
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

function noticeCard(tone: Notice["tone"]): React.CSSProperties {
  return {
    ...pageCard(tone === "error" ? "#FEF2F2" : "#F3FBF5"),
    border:
      tone === "error"
        ? "1px solid rgba(239,68,68,0.16)"
        : "1px solid rgba(34,197,94,0.16)",
    color: tone === "error" ? "#991B1B" : "#166534",
    fontWeight: 900,
    lineHeight: 1.65,
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
    queue: false,
    guidance: false,
    routes: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    overview: Boolean(raw?.overview ?? base.overview),
    queue: Boolean(raw?.queue ?? base.queue),
    guidance: Boolean(raw?.guidance ?? base.guidance),
    routes: Boolean(raw?.routes ?? base.routes),
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
    clan?.membership_role,
    clan?.participant_role
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

function normalizeInboxRow(raw: any): InboxRow | null {
  if (!raw) return null;

  const src = raw?.item || raw?.request || raw?.guarantor_request || raw;

  const id = positiveNumber(src?.id);
  const loanId = positiveNumber(src?.loan_id);

  if (!id && !loanId) return null;

  return {
    id: id || undefined,
    loanId: loanId || undefined,
    clanId: positiveNumber(src?.clan_id || src?.community_id) || undefined,
    borrowerDisplay: firstTruthy(
      src?.borrower_display,
      src?.borrower_name,
      src?.member_name,
      src?.requester_name,
      src?.display_name
    ) || null,
    borrowerEmail: firstTruthy(src?.borrower_email, src?.email) || null,
    borrowerUserId: positiveNumber(src?.borrower_user_id) || null,
    amount:
      src?.amount ??
      src?.loan_amount ??
      src?.requested_amount ??
      src?.outstanding_amount ??
      null,
    pledgeAmount: src?.pledge_amount ?? null,
    currency: firstTruthy(src?.currency, src?.currency_code, "NGN") || null,
    status: firstTruthy(src?.status, "pending") || null,
    createdAt: firstTruthy(src?.created_at, src?.requested_at) || null,
    expiresAt: firstTruthy(src?.expires_at, src?.deadline_at) || null,
    purpose: firstTruthy(src?.purpose, src?.note, src?.description) || null,
    guarantorUserId: positiveNumber(src?.guarantor_user_id) || null,
    lockedAmount:
      src?.locked_amount ??
      src?.weight_amount ??
      null,
    releasedAmount: src?.released_amount ?? null,
    isLocked:
      typeof src?.is_locked === "boolean" ? Boolean(src.is_locked) : null,
    note: firstTruthy(src?.note, src?.detail) || null,
  };
}

function statusPill(status: string): React.CSSProperties {
  const s = safeStr(status).toLowerCase();

  if (s.includes("approved")) {
    return {
      padding: "6px 10px",
      borderRadius: 999,
      background: "#ECFDF5",
      border: "1px solid #A7F3D0",
      color: "#065F46",
      fontWeight: 1000,
      fontSize: 12,
      whiteSpace: "normal",
      textAlign: "center",
    };
  }

  if (s.includes("declined")) {
    return {
      padding: "6px 10px",
      borderRadius: 999,
      background: "#FEF2F2",
      border: "1px solid #FECACA",
      color: "#991B1B",
      fontWeight: 1000,
      fontSize: 12,
      whiteSpace: "normal",
      textAlign: "center",
    };
  }

  return {
    padding: "6px 10px",
    borderRadius: 999,
    background: "#FFFBEB",
    border: "1px solid #FDE68A",
    color: "#92400E",
    fontWeight: 1000,
    fontSize: 12,
    whiteSpace: "normal",
    textAlign: "center",
  };
}

function routeTarget(intent: CtaIntent, communityId: number, debugId: string): string {
  return resolveCtaTarget(intent, { communityId, debugId }).to as string;
}

export default function GuarantorInboxPage() {
  const location = useLocation();
  const routeClanId = useMemo(
    () => communityIdFromSearch(location.search),
    [location.search]
  );
  const selectedClanId = routeClanId || Number(getSelectedClanId() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "guarantor-inbox.route.dashboard"),
      community: routeTarget("communityHome", selectedClanId, "guarantor-inbox.route.community"),
      loans: routeTarget("loans", selectedClanId, "guarantor-inbox.route.loans"),
      workbench: routeTarget("loanWorkbench", selectedClanId, "guarantor-inbox.route.workbench"),
      suggestions: routeTarget("loanSuggestions", selectedClanId, "guarantor-inbox.route.suggestions"),
      marketplace: routeTarget("marketplace", selectedClanId, "guarantor-inbox.route.marketplace"),
      notifications: routeTarget("notifications", selectedClanId, "guarantor-inbox.route.notifications"),
    }),
    [selectedClanId]
  );

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(GUARANTOR_INBOX_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  const [filter, setFilter] = useState<FilterKey>("pending");
  const [loading, setLoading] = useState(true);
  const [community, setCommunity] = useState<CommunityLite | null>(null);
  const [me, setMe] = useState<MeLite | null>(null);

  const [pendingRows, setPendingRows] = useState<InboxRow[]>([]);
  const [approvedRows, setApprovedRows] = useState<InboxRow[]>([]);
  const [declinedRows, setDeclinedRows] = useState<InboxRow[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const inboxContextRef = useRef("");
  const inboxLoadSeqRef = useRef(0);

  useEffect(() => {
    if (routeClanId > 0) {
      setSelectedClanId(routeClanId);
    }
  }, [routeClanId]);
  const [busyDecisionKey, setBusyDecisionKey] = useState("");

  const clearInboxState = useCallback(() => {
    setPendingRows([]);
    setApprovedRows([]);
    setDeclinedRows([]);
    setCommunity(null);
    setMe(null);
  }, []);

  const fetchInbox = useCallback(async (): Promise<InboxLoadResult> => {
    const [pendingRes, approvedRes, declinedRes, clanRes, meRes] = await Promise.all([
      getLoanGuarantorInbox({
        clan_id: selectedClanId || undefined,
        status: "pending",
        limit: 50,
      }).catch(() => ({ items: [] })),
      getLoanGuarantorInbox({
        clan_id: selectedClanId || undefined,
        status: "approved",
        limit: 50,
      }).catch(() => ({ items: [] })),
      getLoanGuarantorInbox({
        clan_id: selectedClanId || undefined,
        status: "declined",
        limit: 50,
      }).catch(() => ({ items: [] })),
      getCurrentClan().catch(() => null),
      getMe().catch(() => null),
    ]);

    return {
      pending: rowsOf<any>(pendingRes)
        .map((row) => normalizeInboxRow(row))
        .filter(Boolean) as InboxRow[],
      approved: rowsOf<any>(approvedRes)
        .map((row) => normalizeInboxRow(row))
        .filter(Boolean) as InboxRow[],
      declined: rowsOf<any>(declinedRes)
        .map((row) => normalizeInboxRow(row))
        .filter(Boolean) as InboxRow[],
      community: clanRes || null,
      me: meRes || null,
    };
  }, [selectedClanId]);

  const loadInbox = useCallback(async (options?: { clearNotice?: boolean }) => {
    const contextKey = `${selectedClanId || 0}`;
    const loadSeq = inboxLoadSeqRef.current + 1;
    inboxLoadSeqRef.current = loadSeq;
    inboxContextRef.current = contextKey;
    setLoading(true);
    clearInboxState();

    if (options?.clearNotice) {
      setNotice(null);
      setBusyDecisionKey("");
    }

    try {
      const result = await fetchInbox();

      if (
        inboxContextRef.current !== contextKey ||
        inboxLoadSeqRef.current !== loadSeq
      ) {
        return;
      }

      setPendingRows(result.pending);
      setApprovedRows(result.approved);
      setDeclinedRows(result.declined);
      setCommunity(result.community);
      setMe(result.me);
    } finally {
      if (
        inboxContextRef.current === contextKey &&
        inboxLoadSeqRef.current === loadSeq
      ) {
        setLoading(false);
      }
    }
  }, [clearInboxState, fetchInbox, selectedClanId]);

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
    writeLocalJSON(GUARANTOR_INBOX_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    void loadInbox({ clearNotice: true });
  }, [loadInbox]);

  const allRows = useMemo(() => {
    const rows = [...pendingRows, ...approvedRows, ...declinedRows];
    rows.sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      return tb - ta;
    });
    return rows;
  }, [pendingRows, approvedRows, declinedRows]);

  const visibleRows = useMemo(() => {
    if (filter === "pending") return pendingRows;
    if (filter === "approved") return approvedRows;
    if (filter === "declined") return declinedRows;
    return allRows;
  }, [filter, pendingRows, approvedRows, declinedRows, allRows]);

  const counts = useMemo(
    () => ({
      pending: pendingRows.length,
      approved: approvedRows.length,
      declined: declinedRows.length,
      all: allRows.length,
    }),
    [pendingRows.length, approvedRows.length, declinedRows.length, allRows.length]
  );

  const memberName = useMemo(() => getMemberName(me), [me]);
  const gmfnId = useMemo(() => firstTruthy(me?.gmfn_id, "Not available yet"), [me]);

  const selectedCommunityLabel = useMemo(() => {
    return (
      getCommunityName(community) ||
      (selectedClanId ? `Community ${selectedClanId}` : "No community selected")
    );
  }, [community, selectedClanId]);

  const communityPublicId = useMemo(() => {
    return getCommunityId(community) || "Not available yet";
  }, [community]);

  const memberRole = useMemo(() => {
    return getCommunityRole(community);
  }, [community]);

  const nextStep = useMemo<{
    title: string;
    detail: string;
    ctaLabel: string;
    ctaTo: string;
  }>(() => {
    if (!selectedClanId) {
      return {
        title: "Choose the community first.",
        detail:
          "Incoming support requests make more sense when they stay tied to your current community.",
        ctaLabel: "Open Community Home",
        ctaTo: routes.community,
      };
    }

    if (counts.pending > 0) {
      return {
        title:
          counts.pending === 1
            ? "One support request is waiting on you."
            : `${counts.pending} support requests are waiting on you.`,
        detail:
          "This queue is only the intake page. Once you choose to continue, the deeper workbench should take over instead of leaving you halfway between pages.",
        ctaLabel: "Open Support Workbench",
        ctaTo: routes.workbench,
      };
    }

    if (counts.approved > 0) {
      return {
        title: "Recorded support responses are visible.",
        detail:
          "The next move is usually to continue the broader support flow rather than staying only in the queue.",
        ctaLabel: "Return to Loans & Support",
        ctaTo: routes.loans,
      };
    }

    return {
      title: "No pending support request is currently shown.",
      detail:
        "That means nothing is directly waiting on your support response inside this current queue view.",
      ctaLabel: "Open Loans & Support",
      ctaTo: routes.loans,
    };
  }, [counts.approved, counts.pending, routes.community, routes.loans, routes.workbench, selectedClanId]);

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  const queuePaper = useMemo(
    () =>
      buildGsnSupportEvidencePackage({
        title: "GSN Support Queue Snapshot",
        purpose: "Review the current support decision queue for this member and community.",
        reference: `guarantor-queue-${communityPublicId || selectedClanId || "current"}`,
        memberName,
        gsnId: gmfnId,
        memberRole,
        communityName: selectedCommunityLabel,
        communityId: communityPublicId,
        routeName: "Incoming Requests",
        status: filter,
        detailLines: [
          `Pending: ${counts.pending}`,
          `Recorded support: ${counts.approved}`,
          `Declined: ${counts.declined}`,
          `Visible: ${counts.all}`,
          `Filter: ${filter}`,
          "This snapshot records the visible queue counts only. It does not expose private requester files.",
        ],
      }),
    [
      communityPublicId,
      counts.all,
      counts.approved,
      counts.declined,
      counts.pending,
      filter,
      gmfnId,
      memberName,
      memberRole,
      selectedClanId,
      selectedCommunityLabel,
    ]
  );

  function copyQueueSummary() {
    safeCopy(queuePaper);
  }

  async function handleDecision(row: InboxRow, status: "approved" | "declined") {
    const loanId = positiveNumber(row.loanId);
    const guarantorId = positiveNumber(row.id);

    if (!loanId || !guarantorId) {
      setNotice({
        tone: "error",
        text: "This support request is missing the support or request number, so it cannot be decided here.",
      });
      return;
    }

    const key = `${loanId}-${guarantorId}-${status}`;
    const decisionContextKey = inboxContextRef.current || `${selectedClanId || 0}`;
    setBusyDecisionKey(key);
    setNotice(null);

    try {
      await decideLoanGuarantor(loanId, guarantorId, {
        status,
        clan_id: selectedClanId || undefined,
      });

      if (inboxContextRef.current !== decisionContextKey) return;

      setNotice({
        tone: "success",
        text:
          status === "approved"
            ? "Support response recorded. GSN has recorded your response; this is not support approval or money-release authority."
            : "Support declined. GSN has recorded your response so the requester can continue clearly.",
      });
      await loadInbox();
    } catch (error: any) {
      if (inboxContextRef.current !== decisionContextKey) return;

      setNotice({
        tone: "error",
        text: String(error?.message || error || "Unable to record this support response."),
      });
    } finally {
      if (inboxContextRef.current === decisionContextKey) {
        setBusyDecisionKey("");
      }
    }
  }

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: isCompact ? 40 : 60 }}>
      <PageTopNav
        sectionLabel="Incoming Requests"
        title="Incoming Requests"
        subtitle="Review support requests that need your response in your current community."
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.loans}
        backLabel="Loans & Support"
      />

      <ExplainToggle
        label="What this screen does"
        what="This page is the incoming queue for support requests that need your response."
        why="Finance keeps the money record. Incoming Requests keeps the live response queue so you can act clearly without mixing it with requester work."
        next="Recording support here saves your response only; it does not approve support or authorize release of goods, credit, or money."
        tone="blue"
        style={{ marginTop: 18 }}
      />

      {notice ? (
        <div style={{ marginTop: 18, ...noticeCard(notice.tone) }}>{notice.text}</div>
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
            <div style={sectionLabel()}>Fixed queue context</div>

            <div
              style={{
                marginTop: 10,
                fontSize: 30,
                fontWeight: 1000,
                color: "#F8FBFF",
                lineHeight: 1.12,
              }}
            >
              {nextStep.title}
            </div>

            <div style={{ marginTop: 10, ...helperText(), maxWidth: 860 }}>
              This incoming queue gathers support requests. Once
              a request is chosen, the deeper support workbench should take over
              instead of leaving the person inside a loose queue.
            </div>

            <StableCtaLink
              to={nextStep.ctaTo}
              debugId="guarantor-inbox.front-next"
              stableHeight={isCompact ? 58 : 72}
              fullWidth
              minWidth={isCompact ? undefined : 260}
              style={{
                ...guarantorInboxRouteTileStyle(true),
                display: "flex",
                textDecoration: "none",
                marginTop: 14,
                height: isCompact ? 58 : 72,
                minHeight: isCompact ? 58 : 72,
                maxHeight: isCompact ? 58 : 72,
                justifyContent: "center",
                padding: isCompact ? "10px 12px" : "12px 14px",
                overflow: "hidden",
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
                {guarantorInboxRouteHeading("navigation", nextStep.ctaLabel)}
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
                  Incoming support requests
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
              <span style={badge(false)}>Pending: {counts.pending}</span>
              <span style={badge(false)}>Recorded support: {counts.approved}</span>
              <span style={badge(false)}>Declined: {counts.declined}</span>
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
                onClick={copyQueueSummary}
                debugId="guarantor-inbox.copy-queue"
                style={guarantorInboxSecondaryButtonStyle(false)}
              >
                {guarantorInboxActionText("copy", "Copy queue")}
              </SecondaryButton>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={innerCard("#F8FBFF")}>
                <div style={sectionLabel()}>Use next pages below</div>
                <div style={{ marginTop: 8, ...helperText(), color: "#F8FBFF" }}>
                  Keep this top area focused on the current queue reading. Use
                  the next-pages section below when you are ready to continue
                  into the deeper support page.
                </div>
              </div>
            </div>

            <GsnSnapshotPaperCard
              paperText={queuePaper}
              compact={isCompact}
              icon="shield"
              maxBodyLines={isCompact ? 6 : undefined}
              style={{ marginTop: 14 }}
            />
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Current reading</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: 18,
                lineHeight: 1.35,
              }}
            >
              {nextStep.detail}
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Pending now: {counts.pending}</span>
              <span style={badge(false)}>Visible now: {visibleRows.length}</span>
            </div>
          </div>
        </div>
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
            <div style={sectionLabel()}>Queue overview</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              A quick reading of the visible support queue.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("overview")}
            minWidth={116}
            stableHeight={52}
            debugId="guarantor-inbox.toggle-overview"
            style={guarantorInboxCollapseButtonStyle()}
          >
            {guarantorInboxActionText(
              collapsed.overview ? "chevronDown" : "chevronUp",
              collapsed.overview ? "Open" : "Hide",
              20
            )}
          </SubtleButton>
        </div>

        {!collapsed.overview ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))",
              gap: 14,
            }}
          >
            <div style={statTile()}>
              <div style={sectionLabel()}>Pending</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  fontSize: 28,
                  color: "#F8FBFF",
                }}
              >
                {counts.pending}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Recorded support</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  fontSize: 28,
                  color: "#F8FBFF",
                }}
              >
                {counts.approved}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Declined</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  fontSize: 28,
                  color: "#F8FBFF",
                }}
              >
                {counts.declined}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Visible total</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  fontSize: 28,
                  color: "#F8FBFF",
                }}
              >
                {counts.all}
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
            <div style={sectionLabel()}>Filter and queue</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Filter the queue, then continue into the page you need.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("queue")}
            minWidth={116}
            stableHeight={52}
            debugId="guarantor-inbox.toggle-queue"
            style={guarantorInboxCollapseButtonStyle()}
          >
            {guarantorInboxActionText(
              collapsed.queue ? "chevronDown" : "chevronUp",
              collapsed.queue ? "Open" : "Hide",
              20
            )}
          </SubtleButton>
        </div>

        {!collapsed.queue ? (
          <>
            <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {(["pending", "approved", "declined", "all"] as const).map((x) => (
                <SecondaryButton
                  key={x}
                  onClick={() => setFilter(x)}
                  minWidth={108}
                  stableHeight={52}
                  debugId={`guarantor-inbox.filter.${x}`}
                  style={guarantorInboxFilterButtonStyle(filter === x)}
                >
                  {guarantorInboxActionText(
                    x === "pending" ? "alert" : x === "approved" ? "check" : x === "declined" ? "lock" : "document",
                    x[0].toUpperCase() + x.slice(1),
                    20
                  )}
                </SecondaryButton>
              ))}
            </div>

            <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
              {loading ? (
                <div style={{ color: "rgba(230,238,248,0.76)", lineHeight: 1.8 }}>
                  Loading queue...
                </div>
              ) : visibleRows.length === 0 ? (
                <div style={innerCard("#FFFFFF")}>
                  <div style={{ color: "#6B7A88", lineHeight: 1.8 }}>
                    No requests are visible for this filter.
                  </div>
                </div>
              ) : (
                visibleRows.map((row, i) => {
                  const status = safeStr(row.status || "pending");
                  const amountText = safeStr(row.amount)
                    ? `${fmtMoney(row.amount)} ${safeStr(row.currency || "NGN")}`
                    : "";
                  const pledgeText = safeStr(row.pledgeAmount)
                    ? `${fmtMoney(row.pledgeAmount)} ${safeStr(row.currency || "NGN")}`
                    : "";

                  return (
                    <div key={`${row.id || row.loanId || i}`} style={innerCard("#FFFFFF")}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 1000,
                              color: "#F8FBFF",
                              fontSize: 18,
                            }}
                          >
                            {firstTruthy(
                              row.borrowerDisplay,
                              row.borrowerEmail,
                              row.borrowerUserId ? `Requester ${row.borrowerUserId}` : "",
                              "Member request"
                            )}
                          </div>
                          <div
                            style={{
                              marginTop: 4,
                              color: "#6B7A88",
                              fontSize: 13,
                              lineHeight: 1.7,
                            }}
                          >
                            {[
                              row.loanId ? `Support #${row.loanId}` : "",
                              row.createdAt ? safeDateTime(row.createdAt) : "",
                            ]
                              .filter(Boolean)
                              .join(" | ")}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          <span style={statusPill(status)}>{status}</span>
                          {pledgeText ? (
                            <span style={badge(true)}>Support amount: {pledgeText}</span>
                          ) : null}
                          {amountText ? (
                            <span style={badge(false)}>Amount: {amountText}</span>
                          ) : null}
                        </div>
                      </div>

                      <div style={{ marginTop: 12, ...helperText() }}>
                        Purpose: {safeStr(row.purpose || row.note || "Not available yet")}
                      </div>

                      <div style={{ marginTop: 8, ...helperText() }}>
                        Response window: {safeStr(row.expiresAt || "Not visible yet")}
                      </div>

                      {(Boolean(row.isLocked) || safeStr(row.lockedAmount) || safeStr(row.releasedAmount)) ? (
                        <div style={{ marginTop: 8, ...helperText() }}>
                          {[
                            `Locked: ${String(Boolean(row.isLocked))}`,
                            safeStr(row.lockedAmount) ? `Locked amount: ${safeStr(row.lockedAmount)}` : "",
                            safeStr(row.releasedAmount) ? `Released amount: ${safeStr(row.releasedAmount)}` : "",
                          ]
                            .filter(Boolean)
                            .join(" | ")}
                        </div>
                      ) : null}

                      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {safeStr(row.status).toLowerCase() === "pending" ? (
                          <>
                            <PrimaryButton
                              onClick={() => void handleDecision(row, "approved")}
                              disabled={Boolean(busyDecisionKey)}
                              minWidth={120}
                              stableHeight={48}
                              debugId={`guarantor-inbox.row.${row.id || row.loanId || i}.approve`}
                              style={guarantorInboxPrimaryButtonStyle(Boolean(busyDecisionKey))}
                            >
                              {busyDecisionKey === `${row.loanId}-${row.id}-approved`
                                ? guarantorInboxActionText("refresh", "Recording", 20)
                                : guarantorInboxActionText("check", "Record support", 20)}
                            </PrimaryButton>
                            <SecondaryButton
                              onClick={() => void handleDecision(row, "declined")}
                              disabled={Boolean(busyDecisionKey)}
                              minWidth={120}
                              stableHeight={48}
                              debugId={`guarantor-inbox.row.${row.id || row.loanId || i}.decline`}
                              style={guarantorInboxSecondaryButtonStyle(Boolean(busyDecisionKey))}
                            >
                              {busyDecisionKey === `${row.loanId}-${row.id}-declined`
                                ? guarantorInboxActionText("refresh", "Declining", 20)
                                : guarantorInboxActionText("lock", "Decline", 20)}
                            </SecondaryButton>
                          </>
                        ) : null}
                        <StableCtaLink
                          to={routes.workbench}
                          debugId={`guarantor-inbox.row.${row.id || row.loanId || i}.workbench`}
                          stableHeight={48}
                          style={guarantorInboxSecondaryButtonStyle(false)}
                        >
                          {guarantorInboxActionText("briefcase", "Workbench", 20)}
                        </StableCtaLink>
                        <StableCtaLink
                          to={routes.loans}
                          debugId={`guarantor-inbox.row.${row.id || row.loanId || i}.loans`}
                          stableHeight={48}
                          style={guarantorInboxSecondaryButtonStyle(false)}
                        >
                          {guarantorInboxActionText("community", "Support", 20)}
                        </StableCtaLink>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
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
            <div style={sectionLabel()}>Guidance</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Keep the meaning of this queue clear.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("guidance")}
            minWidth={116}
            stableHeight={52}
            debugId="guarantor-inbox.toggle-guidance"
            style={guarantorInboxCollapseButtonStyle()}
          >
            {guarantorInboxActionText(
              collapsed.guidance ? "chevronDown" : "chevronUp",
              collapsed.guidance ? "Open" : "Hide",
              20
            )}
          </SubtleButton>
        </div>

        {!collapsed.guidance ? (
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
                  color: "#F8FBFF",
                  fontWeight: 1000,
                  fontSize: 18,
                }}
              >
                What this queue is for
              </div>
              <div style={{ marginTop: 10, ...helperText() }}>
                This queue is where incoming support decisions first become visible.
                Recording a request saves your support response only; it is not
                whole-request approval or permission to release goods, credit, or money.
                Once you choose a request, the deeper workbench should take over.
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div
                style={{
                  color: "#F8FBFF",
                  fontWeight: 1000,
                  fontSize: 18,
                }}
              >
                What to avoid
              </div>
              <div style={{ marginTop: 10, ...helperText() }}>
                Do not leave the person stuck only in the queue. The queue
                should lead into the right support flow, then return to the broader
                app only after the current decision is properly handled.
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
            <div style={sectionLabel()}>Next pages</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Move from queue reading into the next page you need.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("routes")}
            minWidth={116}
            stableHeight={52}
            debugId="guarantor-inbox.toggle-routes"
            style={guarantorInboxCollapseButtonStyle()}
          >
            {guarantorInboxActionText(
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
              debugId="guarantor-inbox.route.next"
              stableHeight={104}
              fullWidth
              style={guarantorInboxRouteTileStyle(true)}
            >
              <div
                style={{
                  color: "#F8FBFF",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                {guarantorInboxRouteHeading("navigation", nextStep.ctaLabel)}
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                {nextStep.detail}
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={routes.workbench}
              debugId="guarantor-inbox.route.workbench"
              stableHeight={104}
              fullWidth
              style={guarantorInboxRouteTileStyle(false)}
            >
              <div
                style={{
                  color: "#F8FBFF",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                {guarantorInboxRouteHeading("briefcase", "Support Workbench")}
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Open this when you are continuing the deeper support decision.
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={routes.suggestions}
              debugId="guarantor-inbox.route.suggestions"
              stableHeight={104}
              fullWidth
              style={guarantorInboxRouteTileStyle(false)}
            >
              <div
                style={{
                  color: "#F8FBFF",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                {guarantorInboxRouteHeading("search", "Find Supporters")}
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Open this when the next question is candidate fit rather than queue state.
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={routes.loans}
              debugId="guarantor-inbox.route.loans"
              stableHeight={104}
              fullWidth
              style={guarantorInboxRouteTileStyle(false)}
            >
              <div
                style={{
                  color: "#F8FBFF",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                {guarantorInboxRouteHeading("community", "Loans & Support")}
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Return to the broader support overview.
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={routes.marketplace}
              debugId="guarantor-inbox.route.marketplace"
              stableHeight={104}
              fullWidth
              style={guarantorInboxRouteTileStyle(false)}
            >
              <div
                style={{
                  color: "#F8FBFF",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                {guarantorInboxRouteHeading("shop", "Marketplace")}
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Return to Marketplace only after the current queue reading is complete.
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={routes.notifications}
              debugId="guarantor-inbox.route.notifications"
              stableHeight={104}
              fullWidth
              style={guarantorInboxRouteTileStyle(false)}
            >
              <div
                style={{
                  color: "#F8FBFF",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                {guarantorInboxRouteHeading("alert", "Action Inbox")}
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Open this when the broader notification picture matters around the support decision.
              </div>
            </StableCtaLink>
          </div>
        ) : null}
      </section>

    </div>
  );
}


